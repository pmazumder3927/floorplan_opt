/**
 * tone.ts — how DARK a layout actually is, as a number.
 *
 * WHY THIS EXISTS. The client's note on layout A was "I like it, but I feel like
 * it's too dark or something". Nothing in this repo could answer that: `pnpm
 * check` measures clearances, `pnpm sightline` measures what you can see of the
 * picture, and neither of them has any idea what colour anything is. So the
 * argument about the palette was being had in adjectives, in prose, at the
 * bottom of a layout file — which is exactly the failure mode this project
 * exists to prevent everywhere else.
 *
 * This script casts no rays and renders nothing. It walks the SURFACES: the
 * shell out of src/core/finishes.ts (floor, walls, soffit, glazing) and every
 * placed item out of src/core/catalog.ts, converts each one's hex to an LRV, and
 * reports the area-weighted mean. That number is what "dark" means when you say
 * it about a room.
 *
 *   npx tsx scripts/tone.ts [layoutId ...]     # pnpm tone
 *
 * ---------------------------------------------------------------------------
 * THE THREE NUMBERS IT PRINTS, AND WHAT EACH ONE IS FOR
 * ---------------------------------------------------------------------------
 *
 * 1. AREA-WEIGHTED LRV, split shell / furnishings. The shell is the same in
 *    every scheme — it is the apartment — so the only figure a layout can move
 *    is the furnishings one, and the gap between the two is the thing the eye
 *    actually reads as "dark furniture in a light room".
 *
 * 2. WARMTH, as mean R-B in sRGB 0-255, weighted the same way. A room can be
 *    perfectly bright and still read cold, and this unit is predisposed to it:
 *    finishes.ts measures the concrete soffit at B-R = +22, i.e. the single
 *    biggest surface over your head is BLUE, and it is 26% of everything you
 *    see. If a scheme puts no warm mass at eye level the room reads like a
 *    parking structure no matter what the LRV says.
 *
 * 3. THE FILM-STATE RETURN WEIGHT, which is the honest half of the argument.
 *    Layout A's defence of its darks is optical: a projected image in a room
 *    with pale surfaces loses in-room contrast, because the projector's own
 *    light comes back off the room onto the screen. That is true. What was
 *    never measured is HOW MUCH each surface contributes, and the answer decides
 *    which darks are load-bearing and which are only taste.
 *
 *    The model, stated so it can be argued with. Treat the screen as a
 *    Lambertian emitter and every surface as a Lambertian reflector. Light
 *    leaving the screen lands on patch i with an illuminance falling as
 *    cos(theta_i) / d^2; the patch re-radiates rho_i of it as a Lambertian
 *    source; and the fraction of THAT which lands back on the screen goes as
 *    the solid angle the screen subtends from the patch, i.e. another
 *    cos(theta_i) / d^2. So the round-trip weight of a patch is
 *
 *        w_i  =  rho_i * A_i * cos^2(theta_i) * cos(theta_s) / d^4
 *
 *    where theta_i is measured off the patch's normal, theta_s off the screen's
 *    normal, and d is the distance to the image centre. The d^-4 is not a typo
 *    and it is the whole point: this is a ROUND TRIP, so a surface twice as far
 *    away matters sixteen times less. The script normalises the weights to
 *    percentages, because only the ranking is trustworthy — the absolute
 *    coefficient would need the screen's real gain, the projector's real output
 *    and a full radiosity solve.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not model the blackout state (with
 * the shades down the glazing contributes nothing and the picture is the only
 * source, which is what the return weight already assumes); it does not model
 * specularity, so the satin floor's mirror term is missing and the floor's true
 * contribution is a little higher than printed; it uses one albedo per item
 * (`color`) and ignores `accent`; and it treats every item as a box, which
 * over-counts a chair and under-counts a plant. It is a ruler, not a renderer.
 */

import { getDef } from '@/core/catalog';
import { FINISH_SCHEDULE } from '@/core/finishes';
import {
  distToSegment,
  itemObb,
  obbContainsPoint,
  polygonArea,
  pointInPolygon,
  type OBB,
} from '@/core/geometry';
import { getPlan } from '@/core/plan';
import { layoutList, getLayout } from '@/layouts/index';
import type { FloorPlan, FurnitureDef, Layout, PlacedItem, Vec2, Zone } from '@/core/types';

// ------------------------------------------------------------------- colour

/** sRGB hex -> [r, g, b] in 0..255. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

/** The sRGB -> linear transfer function, the real one, not a 2.2 gamma. */
function linear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Light Reflectance Value, 0-100. This is CIE relative luminance Y expressed as
 * a percentage, which is what a paint fan deck means by LRV and what a lighting
 * calculation wants. It is NOT the same as "how bright the swatch looks", which
 * is a lightness (L*) and would put a mid grey at 50 rather than at 18.
 */
function lrv(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 100 * (0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b));
}

/** Warm-cool bias in sRGB counts. Positive = warm. finishes.ts quotes R-B too. */
function warmth(hex: string): number {
  const [r, , b] = rgb(hex);
  return r - b;
}

// -------------------------------------------------------------- the surfaces

type Klass = 'ceiling' | 'wall' | 'glazing' | 'floor' | 'furnishing';

interface Patch {
  id: string;
  klass: Klass;
  /** area in sq ft of the face as seen from the room */
  area: number;
  hex: string;
  /** centroid, plan coords + height above floor */
  p: [number, number, number];
  /** outward normal, pointing into the room */
  n: [number, number, number];
}

function finishHex(id: string): string {
  const f = FINISH_SCHEDULE.find((x) => x.id === id);
  if (!f?.hex) throw new Error(`finish ${id} has no hex`);
  return f.hex;
}

/** Sample a zone polygon on a grid, returning cell centres inside it. */
function gridCells(poly: Vec2[], step: number): Vec2[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const out: Vec2[] = [];
  for (let x = x0 + step / 2; x < x1; x += step)
    for (let y = y0 + step / 2; y < y1; y += step)
      if (pointInPolygon([x, y], poly)) out.push([x, y]);
  return out;
}

interface Entry {
  item: PlacedItem;
  def: FurnitureDef;
  obb: OBB;
  z0: number;
}

/**
 * Is this point on the zone boundary a real WALL, or an open edge?
 *
 * It matters more than it sounds. The living zone's south edge at y = 15'-0" is
 * where the studio becomes the kitchen — there is no wall there at all — and
 * counting it would invent 156 sq ft of flat white paint, which is 24% of the
 * scheme's wall area and would drag every number in this report toward the
 * light. So each sample is tested against the real wall segments in plan.ts:
 * exterior walls are traced on their OUTER face and carry the interior on their
 * right, so their inner face is the segment offset by its own thickness;
 * partitions are traced on the centreline.
 */
function onAWall(p: Vec2, plan: FloorPlan): boolean {
  for (const w of plan.walls) {
    const dx = w.end[0] - w.start[0];
    const dy = w.end[1] - w.start[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    if (w.kind === 'partition') {
      if (distToSegment(p, w.start, w.end) < w.thickness / 2 + 0.2) return true;
      continue;
    }
    // interiorSide 'right' with +y down is the (-dy, dx) normal.
    const s = w.interiorSide === 'left' ? -1 : 1;
    const nx = (s * -dy) / len;
    const ny = (s * dx) / len;
    const a: Vec2 = [w.start[0] + nx * w.thickness, w.start[1] + ny * w.thickness];
    const b: Vec2 = [w.end[0] + nx * w.thickness, w.end[1] + ny * w.thickness];
    if (distToSegment(p, a, b) < 0.2) return true;
  }
  return false;
}

function entriesIn(layout: Layout, zone: Zone): Entry[] {
  return layout.items
    .map((item) => {
      const base = getDef(item.def);
      const def: FurnitureDef = {
        ...base,
        w: item.size?.w ?? base.w,
        d: item.size?.d ?? base.d,
        h: item.size?.h ?? base.h,
      };
      return { item, def, obb: itemObb(item, def), z0: item.z ?? def.defaultZ ?? 0 };
    })
    // The lit picture is not a surface, it is a light source; counting it as a
    // 30 sq ft panel at LRV 84 would make every projector scheme read pale.
    .filter((e) => !(e.def.tags ?? []).includes('render-only'))
    .filter((e) => pointInPolygon(e.obb.center, zone.polygon));
}

/**
 * Every visible face in the zone, as patches.
 *
 * The shell is sampled on a 1 ft grid so the return weight has real geometry to
 * work with (a single centroid for a 280 sq ft ceiling would be meaningless at
 * d^-4). Furniture is one patch per face, because at 8-14 ft from the screen a
 * 4 ft sofa is small enough for the point approximation to hold.
 */
function patchesFor(layout: Layout, zone: Zone, plan: FloorPlan): Patch[] {
  const ceilingH = plan.ceilingHeight;
  const out: Patch[] = [];
  const cells = gridCells(zone.polygon, 1);
  const all = entriesIn(layout, zone);
  /*
   * PAINT IS NOT FURNITURE. Layout G catalogues 85 sq ft of screen-wall paint as
   * an object, because in that scheme it is a purchase and a decision and has to
   * appear in the schedule and in the render. It is still a WALL: counted as a
   * furnishing it dragged the scheme's furnishing LRV down by six points and its
   * room mean by two, which is precisely backwards — the paint does not ADD a
   * dark surface, it RECOLOURS a bright one that was already being counted.
   * So a 'render-surface' item is pulled out of the furniture and used to
   * repaint the wall patches it covers.
   */
  const finishes = all.filter((e) => (e.def.tags ?? []).includes('render-surface'));
  const entries = all.filter((e) => !finishes.includes(e));

  // --- floor and ceiling, one square foot at a time.
  const floorHex = finishHex('floor');
  const soffitHex = finishHex('soffit');
  for (const [x, y] of cells) {
    // A floor cell under a piece of furniture is not visible floor; the piece's
    // own faces are counted instead. A rug is the exception the eye cares about,
    // so a walkable item REPLACES the floor colour rather than hiding it.
    const over = entries.filter((e) => obbContainsPoint(e.obb, [x, y]));
    const rug = over.find((e) => e.def.walkable && e.def.kind === 'rug');
    const solid = over.find((e) => !e.def.walkable && !e.def.wallMounted);
    if (!solid) {
      out.push({
        id: rug ? rug.item.id : 'floor',
        klass: 'floor',
        area: 1,
        hex: rug ? (rug.item.color ?? rug.def.color ?? floorHex) : floorHex,
        p: [x, y, 0],
        n: [0, 0, 1],
      });
    }
    out.push({ id: 'soffit', klass: 'ceiling', area: 1, hex: soffitHex, p: [x, y, ceilingH], n: [0, 0, -1] });
  }

  // --- the walls, sampled along each edge of the zone and up to the soffit.
  const wallHex = finishHex('walls');
  const glassHex = finishHex('glazing-glass');
  const n = zone.polygon.length;
  for (let i = 0; i < n; i++) {
    const a = zone.polygon[i];
    const b = zone.polygon[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    // Inward normal: the zone polygon is wound clockwise in +y-down plan space,
    // so the inward side is the left normal of a->b.
    const nx = dy / len, ny = -dx / len;
    // The west glazing wall: the whole west face of this unit is glass.
    const glass = Math.abs(a[0] - 0.59) < 0.02 && Math.abs(b[0] - 0.59) < 0.02;
    const steps = Math.max(1, Math.round(len));
    const rows = Math.max(1, Math.round(ceilingH));
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const px = a[0] + dx * t, py = a[1] + dy * t;
      if (!onAWall([px, py], plan)) continue;
      // Does a catalogued finish repaint this stretch of wall?
      const paint = glass
        ? undefined
        : finishes.find((f) => obbContainsPoint({ ...f.obb, w: f.obb.w, d: f.obb.d + 0.4 }, [px, py]));
      for (let r = 0; r < rows; r++) {
        const pz = ((r + 0.5) / rows) * ceilingH;
        const painted = paint !== undefined && pz <= paint.z0 + paint.def.h;
        out.push({
          id: painted ? paint!.item.id : glass ? 'glazing' : 'walls',
          klass: glass ? 'glazing' : 'wall',
          area: (len / steps) * (ceilingH / rows),
          hex: painted
            ? (paint!.item.color ?? paint!.def.color ?? wallHex)
            : glass
              ? glassHex
              : wallHex,
          p: [px, py, pz],
          n: [nx, ny, 0],
        });
      }
    }
  }

  // --- the furniture. Four sides and a top; the bottom is never seen.
  for (const e of entries) {
    const hex = e.item.color ?? e.def.color ?? '#808080';
    const { w, d, h } = { w: e.obb.w, d: e.obb.d, h: e.def.h };
    if (h <= 0.01) continue;
    const [cx, cy] = e.obb.center;
    const zc = e.z0 + h / 2;
    const rad = (e.item.rot ?? 0) * (Math.PI / 180);
    // rot is clockwise on the page with +y south, so the piece's local +x runs
    // (cos, sin) and its local +y (the front) runs (-sin, cos).
    const ux: Vec2 = [Math.cos(rad), Math.sin(rad)];
    const uy: Vec2 = [-Math.sin(rad), Math.cos(rad)];
    const faces: [number, [number, number, number], [number, number, number]][] = [
      [d * h, [cx + ux[0] * (w / 2), cy + ux[1] * (w / 2), zc], [ux[0], ux[1], 0]],
      [d * h, [cx - ux[0] * (w / 2), cy - ux[1] * (w / 2), zc], [-ux[0], -ux[1], 0]],
      [w * h, [cx + uy[0] * (d / 2), cy + uy[1] * (d / 2), zc], [uy[0], uy[1], 0]],
      [w * d, [cx, cy, e.z0 + h], [0, 0, 1]],
    ];
    // The BACK face is only visible on a piece standing out in the room. A screen
    // flat on a partition or a shade in a reveal has its back against something,
    // and counting it would double a 30 sq ft screen into 60.
    if (!e.def.wallMounted)
      faces.push([w * h, [cx - uy[0] * (d / 2), cy - uy[1] * (d / 2), zc], [-uy[0], -uy[1], 0]]);
    for (const [area, p, nrm] of faces)
      out.push({ id: e.item.id, klass: 'furnishing', area, hex, p, n: nrm });
  }

  return out;
}

// ------------------------------------------------------------- the reporting

interface Roll {
  area: number;
  lit: number;
  warm: number;
}

function roll(patches: Patch[]): Roll {
  let area = 0, lit = 0, warm = 0;
  for (const p of patches) {
    area += p.area;
    lit += p.area * lrv(p.hex);
    warm += p.area * warmth(p.hex);
  }
  return { area, lit, warm };
}

const mean = (r: Roll): number => (r.area ? r.lit / r.area : 0);
const meanWarm = (r: Roll): number => (r.area ? r.warm / r.area : 0);

/** The round-trip weight derived in the header: rho A cos^2(i) cos(s) / d^4. */
function returnWeight(p: Patch, screen: { p: [number, number, number]; n: [number, number, number] }): number {
  const v: [number, number, number] = [screen.p[0] - p.p[0], screen.p[1] - p.p[1], screen.p[2] - p.p[2]];
  const d = Math.hypot(v[0], v[1], v[2]);
  if (d < 0.4) return 0; // a patch on the screen's own plane is not "the room"
  const u: [number, number, number] = [v[0] / d, v[1] / d, v[2] / d];
  const ci = u[0] * p.n[0] + u[1] * p.n[1] + u[2] * p.n[2];
  const cs = -(u[0] * screen.n[0] + u[1] * screen.n[1] + u[2] * screen.n[2]);
  if (ci <= 0 || cs <= 0) return 0; // facing away from the picture, or behind it
  return (lrv(p.hex) / 100) * p.area * ci * ci * cs / d ** 4;
}

function bar(pct: number, width = 22): string {
  const n = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '█'.repeat(n) + '·'.repeat(width - n);
}

function report(layout: Layout): void {
  const plan = getPlan(layout.plan);
  const zone = plan.zones.find((z) => z.id === 'living');
  if (!zone) throw new Error(`plan ${plan.id} has no living zone`);
  const patches = patchesFor(layout, zone, plan);

  const all = roll(patches);
  const shell = roll(patches.filter((p) => p.klass !== 'furnishing'));
  const furn = roll(patches.filter((p) => p.klass === 'furnishing'));

  const head = `── ${layout.id} — ${layout.name} `;
  console.log(`\n${head}${'─'.repeat(Math.max(0, 78 - head.length))}`);
  console.log(
    `   ${polygonArea(zone.polygon).toFixed(0)} sq ft of open studio · ` +
      `${all.area.toFixed(0)} sq ft of visible surface · ${furn.area.toFixed(0)} of it furniture`,
  );

  console.log('\n   BY SURFACE CLASS');
  const classes: Klass[] = ['ceiling', 'wall', 'glazing', 'floor', 'furnishing'];
  for (const k of classes) {
    const r = roll(patches.filter((p) => p.klass === k));
    if (!r.area) continue;
    console.log(
      `     ${k.padEnd(11)} ${r.area.toFixed(0).padStart(5)} sq ft  ` +
        `LRV ${mean(r).toFixed(1).padStart(5)}  ${bar(mean(r))}  ` +
        `${((100 * r.area) / all.area).toFixed(0).padStart(3)}% of what you see`,
    );
  }

  /*
   * THE SPLIT THAT ACTUALLY ANSWERS "TOO DARK".
   *
   * The whole-envelope mean is dominated by three surfaces no scheme can touch —
   * 277 sq ft of soffit, 410 sq ft of wall and the glazing — so it moves slowly
   * and hides the thing a person in the room is reacting to. What they are
   * reacting to is the FURNITURE IN THE HALF OF THE FLAT THEY ARE STANDING IN,
   * and in this plan those halves are wildly different: every scheme here puts
   * pale wood, oat linen and one warm accent in the sleeping notch and then
   * furnishes the living end in charcoal. Splitting at the notch is what makes
   * that visible as a number instead of as a feeling.
   *
   * The alcove is the west notch: x 0.59..9.93 (W_FACE to the step in the north
   * wall) and y 0.63..7.25 (the north wall down to the midline of the bed-to-sofa
   * aisle). Everything else in the open studio is the living end.
   */
  // The east bound is STRICT, and by an inch, on purpose: layout G stands its
  // desk with the west end flush at x = 9.93, so an inclusive test put that
  // desk's 1.5%-LRV west face in the SLEEPING bucket and knocked two points off
  // the alcove for a piece of furniture that is not in it.
  const inAlcove = (p: Patch): boolean =>
    p.p[0] >= 0.59 && p.p[0] < 9.92 && p.p[1] >= 0.63 && p.p[1] <= 7.25;
  const furnPatches = patches.filter((p) => p.klass === 'furnishing');
  const alcove = roll(furnPatches.filter(inAlcove));
  const livingEnd = roll(furnPatches.filter((p) => !inAlcove(p)));

  console.log('\n   THE HEADLINE');
  console.log(`     shell (the apartment)      LRV ${mean(shell).toFixed(1).padStart(5)}   R-B ${meanWarm(shell) >= 0 ? '+' : ''}${meanWarm(shell).toFixed(0)}`);
  console.log(`     furnishings (the scheme)   LRV ${mean(furn).toFixed(1).padStart(5)}   R-B ${meanWarm(furn) >= 0 ? '+' : ''}${meanWarm(furn).toFixed(0)}`);
  console.log(`     room, area-weighted        LRV ${mean(all).toFixed(1).padStart(5)}   R-B ${meanWarm(all) >= 0 ? '+' : ''}${meanWarm(all).toFixed(0)}`);
  console.log('\n   THE HALF THE CLIENT IS STANDING IN — furniture only, split at the notch');
  console.log(
    `     living end   ${livingEnd.area.toFixed(0).padStart(4)} sq ft  LRV ${mean(livingEnd).toFixed(1).padStart(5)}  ` +
      `${bar(mean(livingEnd))}  R-B ${meanWarm(livingEnd) >= 0 ? '+' : ''}${meanWarm(livingEnd).toFixed(0)}`,
  );
  console.log(
    `     sleeping     ${alcove.area.toFixed(0).padStart(4)} sq ft  LRV ${mean(alcove).toFixed(1).padStart(5)}  ` +
      `${bar(mean(alcove))}  R-B ${meanWarm(alcove) >= 0 ? '+' : ''}${meanWarm(alcove).toFixed(0)}`,
  );
  if (mean(alcove) > 0)
    console.log(
      `     the gap between them: ${(mean(alcove) - mean(livingEnd)).toFixed(1)} points of LRV` +
        `${mean(livingEnd) > 0 ? ` (the alcove is ${(mean(alcove) / mean(livingEnd)).toFixed(1)}x lighter)` : ''}`,
    );

  // --- the dark mass: what is actually eating the light.
  const byItem = new Map<string, { area: number; hex: string }>();
  for (const p of patches.filter((x) => x.klass === 'furnishing')) {
    const cur = byItem.get(p.id) ?? { area: 0, hex: p.hex };
    cur.area += p.area;
    byItem.set(p.id, cur);
  }
  const dark = [...byItem.entries()]
    .map(([id, v]) => ({ id, ...v, deficit: v.area * (mean(shell) - lrv(v.hex)) }))
    .filter((x) => x.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 8);
  if (dark.length) {
    console.log('\n   THE DARK MASS — furniture, ranked by area x how far below the shell it sits');
    for (const d of dark)
      console.log(
        `     ${d.id.padEnd(18)} ${d.area.toFixed(0).padStart(4)} sq ft  LRV ${lrv(d.hex).toFixed(1).padStart(5)}  ${d.hex}`,
      );
  }

  // --- the film state: which surfaces are actually load-bearing for the picture.
  const scr = layout.items
    .map((item) => ({ item, def: getDef(item.def) }))
    .find(({ def }) => def.kind === 'projection_screen' && !(def.tags ?? []).includes('render-only'));
  if (scr) {
    const obb = itemObb(scr.item, scr.def);
    const zc = (scr.item.z ?? scr.def.defaultZ ?? 0) + scr.def.h / 2;
    const rad = ((scr.item.rot ?? 0) * Math.PI) / 180;
    // The fabric faces the piece's front, which at rot 0 is +y (plan south).
    const nrm: [number, number, number] = [-Math.sin(rad), Math.cos(rad), 0];
    const screen = { p: [obb.center[0], obb.center[1], zc] as [number, number, number], n: nrm };

    const weights = new Map<string, number>();
    let total = 0;
    for (const p of patches) {
      const w = returnWeight(p, screen);
      if (w <= 0) continue;
      const key = p.klass === 'furnishing' ? p.id : p.id;
      weights.set(key, (weights.get(key) ?? 0) + w);
      total += w;
    }
    const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log('\n   FILM STATE — share of the projector light the room returns to its own screen');
    console.log('   (round trip, so it falls as 1/d^4: near surfaces dominate. Relative, not absolute.)');
    for (const [id, w] of ranked)
      console.log(`     ${id.padEnd(18)} ${((100 * w) / total).toFixed(1).padStart(5)}%  ${bar((100 * w) / total)}`);
    const furn = [...weights.entries()].filter(([id]) => byItem.has(id));
    const furnShare = furn.reduce((s, [, w]) => s + w, 0);
    console.log(`     ${'—'.repeat(18)}`);
    console.log(
      `     all furniture       ${((100 * furnShare) / total).toFixed(1).padStart(5)}%  ` +
        `— everything else is the shell, which no scheme can change`,
    );
    // The seating separately, because it is the palette decision people argue
    // about and it is almost never the surface that matters.
    const seats = furn
      .filter(([id]) => /sofa|pouf|chair|bed|ottoman|bench|cushion|stool/.test(id))
      .sort((a, b) => b[1] - a[1]);
    const seatShare = seats.reduce((s, [, w]) => s + w, 0);
    console.log(
      `     the seating         ${((100 * seatShare) / total).toFixed(1).padStart(5)}%  ` +
        `— ${seats.slice(0, 4).map(([id, w]) => `${id} ${((100 * w) / total).toFixed(1)}%`).join(', ')}`,
    );
  }
}

const ids = process.argv.slice(2);
const targets = ids.length ? ids.map(getLayout) : layoutList;
for (const l of targets) report(l);
console.log('');
