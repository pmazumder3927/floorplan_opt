/**
 * sightline.ts — the strict version of the analyzer's projection check.
 *
 * WHY THIS EXISTS. analysis.ts casts ONE ray per seat: seat centre to screen
 * centre. That is enough to catch a wardrobe parked in front of the picture and
 * it is not enough to catch the thing that actually goes wrong in a small room,
 * which is a desk chair clipping the TOP CORNER of the image from the END of a
 * sofa. Layout A passes the built-in check with zero sightline warnings and is
 * nonetheless obstructed — the client noticed before the software did.
 *
 * So this script casts a GRID of rays: several eye points across each seat's
 * width, to a grid of sample points over the whole image rectangle, in 3D. A ray
 * is blocked when it passes through an item's footprint at a height at or below
 * that item's top. The output is, per seat, the percentage of the picture that is
 * actually visible and the name of whatever is eating the rest.
 *
 *   npx tsx scripts/sightline.ts [layoutId ...]
 *
 * Eye height is analysis.ts's own SEATED_EYE (46"), measured from the seat's
 * front-centre rather than its centroid, because that is where a head is.
 */

import { getDef } from '@/core/catalog';
import { itemObb, obbContainsPoint, obbAxisV, type OBB } from '@/core/geometry';
import { getPlan } from '@/core/plan';
import { formatFtIn } from '@/core/units';
import { layoutList, getLayout } from '@/layouts/index';
import type { FurnitureDef, Layout, PlacedItem, Vec2 } from '@/core/types';

const EYE_H = 46 / 12;
/** Kinds whose occupants look at things. Mirrors SEATING in analysis.ts. */
const SEATING = new Set(['sofa', 'sectional', 'loveseat', 'armchair', 'chair', 'bench', 'ottoman', 'bed']);
/** Sample resolution over the image: EYES across a seat, GRID x GRID on the picture. */
const EYES: number = 5;
const GRID = 13;

interface Entry {
  item: PlacedItem;
  def: FurnitureDef;
  obb: OBB;
  /** top of the piece above the floor */
  z1: number;
}

function entriesOf(layout: Layout): Entry[] {
  return layout.items.map((item) => {
    const base = getDef(item.def);
    const def: FurnitureDef = {
      ...base,
      w: item.size?.w ?? base.w,
      d: item.size?.d ?? base.d,
      h: item.size?.h ?? base.h,
    };
    const z0 = item.z ?? def.defaultZ ?? 0;
    return { item, def, obb: itemObb(item, def), z1: z0 + def.h };
  });
}

/** Front-centre of a seat, pushed back 6" so the eye is over the cushion. */
function eyePoints(e: Entry): Vec2[] {
  const fwd = obbAxisV(e.obb);
  const right: Vec2 = [-fwd[1], fwd[0]];
  const back = e.obb.d / 2 - 0.5;
  const out: Vec2[] = [];
  // Sample across the seat's width, inset 20% at each end so we sample where
  // people sit rather than where the arm is.
  for (let i = 0; i < EYES; i++) {
    const t = EYES > 1 ? 0.2 + (0.6 * i) / (EYES - 1) : 0.5;
    const off = (t - 0.5) * e.obb.w;
    out.push([
      e.obb.center[0] + fwd[0] * back + right[0] * off,
      e.obb.center[1] + fwd[1] * back + right[1] * off,
    ]);
  }
  return out;
}

/**
 * Does the segment eye -> target, at eye height EYE_H falling to `targetZ`, pass
 * through `o`? Sampled at 1 1/4" like the analyzer's own probe.
 */
function blocks(o: Entry, eye: Vec2, target: Vec2, targetZ: number, z0: number): boolean {
  const span = Math.hypot(target[0] - eye[0], target[1] - eye[1]);
  const steps = Math.max(2, Math.ceil(span / 0.1));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const p: Vec2 = [eye[0] + (target[0] - eye[0]) * t, eye[1] + (target[1] - eye[1]) * t];
    if (!obbContainsPoint(o.obb, p)) continue;
    const rayZ = EYE_H + (targetZ - EYE_H) * t;
    if (rayZ <= o.z1 && rayZ >= z0) return true;
  }
  return false;
}

function report(layout: Layout): number {
  const plan = getPlan(layout.plan);
  const entries = entriesOf(layout);
  const screens = entries.filter(
    (e) => e.def.kind === 'projection_screen' && !(e.def.tags ?? []).includes('render-only'),
  );
  if (screens.length === 0) return 0;

  let worst = 100;
  const lines: string[] = [];

  for (const scr of screens) {
    // The image rectangle, in plan and in height. The fabric runs along the
    // screen's own long axis; its bottom is the item's z.
    const imgW = ((scr.def.imageDiagonal ?? 100) * (scr.def.imageAspect ?? 16 / 9)) /
      Math.hypot(scr.def.imageAspect ?? 16 / 9, 1) / 12;
    const imgH = imgW / (scr.def.imageAspect ?? 16 / 9);
    const zBottom = scr.item.z ?? scr.def.defaultZ ?? 0;
    const along: Vec2 = [obbAxisV(scr.obb)[1], -obbAxisV(scr.obb)[0]];
    const c = scr.obb.center;

    for (const seat of entries) {
      if (!SEATING.has(seat.def.kind)) continue;
      if (seat === scr) continue;
      // Only seats actually pointed at it, same 72-degree cone the analyzer uses.
      const to: Vec2 = [c[0] - seat.obb.center[0], c[1] - seat.obb.center[1]];
      const d = Math.hypot(to[0], to[1]);
      if (d < 0.5) continue;
      const fwd = obbAxisV(seat.obb);
      if ((to[0] / d) * fwd[0] + (to[1] / d) * fwd[1] < 0.3) continue;

      const blockers = new Map<string, number>();
      let hit = 0;
      let total = 0;
      for (const eye of eyePoints(seat)) {
        for (let i = 0; i < GRID; i++) {
          for (let j = 0; j < GRID; j++) {
            const u = (i / (GRID - 1) - 0.5) * imgW;
            const z = zBottom + (j / (GRID - 1)) * imgH;
            const target: Vec2 = [c[0] + along[0] * u, c[1] + along[1] * u];
            total++;
            let blocked = false;
            for (const o of entries) {
              if (o === seat || o === scr) continue;
              if (o.def.walkable) continue;
              const oz0 = o.item.z ?? o.def.defaultZ ?? 0;
              if (blocks(o, eye, target, z, oz0)) {
                blockers.set(o.item.id, (blockers.get(o.item.id) ?? 0) + 1);
                blocked = true;
                break;
              }
            }
            if (blocked) hit++;
          }
        }
      }
      const visible = total === 0 ? 100 : (100 * (total - hit)) / total;
      worst = Math.min(worst, visible);
      const who = [...blockers.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} (${((100 * n) / total).toFixed(1)}%)`);
      const flag = visible >= 99.95 ? '  ' : visible >= 95 ? ' !' : ' X';
      lines.push(
        `${flag} ${(seat.item.id + ' ').padEnd(16, '.')} ${visible.toFixed(1).padStart(5)}% of the picture visible` +
          (who.length ? `   blocked by ${who.join(', ')}` : ''),
      );
    }
  }

  console.log(`\n── ${layout.id} — ${layout.name} ${'─'.repeat(Math.max(0, 50 - layout.id.length - layout.name.length))}`);
  console.log(`   ${EYES} eye points per seat x ${GRID * GRID} points on the picture, eye at ${formatFtIn(EYE_H)}`);
  for (const l of lines) console.log(l);
  console.log(`   worst seat: ${worst.toFixed(1)}% of the picture visible`);
  return worst;
}

const ids = process.argv.slice(2);
const targets = ids.length ? ids.map(getLayout) : layoutList;
for (const l of targets) report(l);
console.log('');
