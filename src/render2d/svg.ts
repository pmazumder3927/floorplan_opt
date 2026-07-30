/**
 * svg.ts — the 2D architectural plan renderer.
 *
 * PURE STRING BUILDING. No DOM, no React, no measurement APIs, so
 * `scripts/export-svg.ts` can run it under plain node and the React wrapper can
 * inject the exact same markup. Everything is emitted in one pass, in drawing
 * order, so the resulting SVG is readable and editable by hand:
 *
 *   sheet -> floor -> grid -> zones -> WALL POCHE -> windows -> doors ->
 *   fixtures -> clearances -> furniture -> labels -> issues -> dimensions ->
 *   title block
 *
 * CONVENTIONS INHERITED FROM THE DATA MODEL (see core/types.ts)
 *   +x east, +y SOUTH (down the page), angles degrees positive CLOCKWISE.
 *   Because SVG is also a y-down space, plan angles map 1:1 onto SVG
 *   `rotate(deg)` — no sign flips anywhere in this file. That is the whole
 *   reason the data model chose a y-down frame.
 *
 * UNITS: the data model is decimal FEET; this file converts to px exactly once,
 * in `px()/py()/f()`. Nothing downstream of those helpers knows about feet, and
 * no <g> ever carries a `scale()` transform — if it did, every stroke width
 * would scale with it and the line-weight hierarchy would collapse.
 */

import type {
  Fixture,
  FloorPlan,
  FurnitureDef,
  FurnitureKind,
  Issue,
  Layout,
  Opening,
  PlacedItem,
  Rect,
  Render2DOptions,
  Vec2,
  Wall,
} from '@/core/types';
import { formatArea, formatFtIn, formatShort } from '@/core/units';
import {
  add,
  clearanceObb,
  dot,
  doorSwingPolygon,
  norm,
  obbContainsPoint,
  obbCorners,
  obbInflate,
  pointInPolygon,
  polygonArea,
  polygonBounds,
  polygonCentroid,
  rotate,
  scale as vmul,
  sub,
  wallAxis,
  wallSolid,
  itemObb,
  type OBB,
} from '@/core/geometry';
import { getDef } from '@/core/catalog';
import {
  FONT,
  FONT_MONO,
  FONT_SIZE,
  LINE_HEIGHT,
  STROKE,
  THEMES,
  ZONE_ALPHA,
  textWidth,
  type PlanTheme,
} from './theme';

export interface PlanSVG {
  svg: string;
  width: number;
  height: number;
  scale: number;
}

// ============================================================ sheet constants

/** Default drawing scale. 26 px/ft puts this 30.4 ft plan at ~790 px wide. */
const DEF_SCALE = 26;
const DEF_MARGIN = 64;
/** px from the footprint edge out to the first dimension line. */
const DIM_OUT = 26;
/** px between stacked dimension chains. */
const DIM_STEP = 34;
/** px, length of the 45-degree architectural tick at each dimension station. */
const TICK = 5.5;
const TITLE_H = 98;
const TITLE_GAP = 20;
/** Never emit a sheet narrower than this or the title block cannot lay out. */
const MIN_SHEET_W = 660;

/** Real door leaf thickness: 1 3/4" solid core. Drawn to scale, not as a hairline. */
const LEAF_T = 1.75 / 12;

// ============================================================ string plumbing

/** XML-escape text and attribute values. Fixture names contain literal `"`. */
function esc(v: unknown): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Round to 2 decimals. Every emitted coordinate goes through this. */
function round2(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const n = Math.round(v * 100) / 100;
  return Object.is(n, -0) ? 0 : n;
}

/** Round to 2 dp and drop the noise — keeps the emitted SVG small. */
function r2(v: number): string {
  return String(round2(v));
}

type Attrs = Record<string, string | number | boolean | undefined | null>;

function tag(name: string, attrs: Attrs, inner?: string): string {
  let s = `<${name}`;
  for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    s += ` ${k}="${typeof v === 'number' ? r2(v) : esc(v)}"`;
  }
  return inner === undefined || inner === '' ? `${s}/>` : `${s}>${inner}</${name}>`;
}

/** Path data from px points. */
function dOf(pts: Array<[number, number]>, close = true): string {
  if (pts.length === 0) return '';
  let d = `M ${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${r2(pts[i][0])} ${r2(pts[i][1])}`;
  return close ? `${d} Z` : d;
}

/** Stable, collision-free id prefix so two SVGs can coexist in one document. */
function uidFor(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return `p2${(h >>> 0).toString(36)}`;
}

// ==================================================================== context

interface Ctx {
  t: PlanTheme;
  /** px per ft */
  s: number;
  uid: string;
  /** plan feet -> sheet px */
  px: (x: number) => number;
  py: (y: number) => number;
  /** a length in feet -> px */
  f: (ft: number) => number;
  /** footprint bounds in feet */
  b: { min: Vec2; max: Vec2; w: number; h: number };
  /** centre of the footprint, feet — used to push labels outward */
  mid: Vec2;
  out: string[];
}

function P(c: Ctx, p: Vec2): [number, number] {
  return [c.px(p[0]), c.py(p[1])];
}

function polyD(c: Ctx, pts: Vec2[], close = true): string {
  return dOf(
    pts.map((p) => P(c, p)),
    close,
  );
}

function line(c: Ctx, a: Vec2, b: Vec2, stroke: string, w: number, extra: Attrs = {}): void {
  c.out.push(
    tag('line', {
      x1: c.px(a[0]),
      y1: c.py(a[1]),
      x2: c.px(b[0]),
      y2: c.py(b[1]),
      stroke,
      'stroke-width': w,
      ...extra,
    }),
  );
}

/** A text run. `s` must be raw (it is escaped here). */
function text(
  c: Ctx,
  x: number,
  y: number,
  s: string,
  o: {
    size?: number;
    fill?: string;
    anchor?: 'start' | 'middle' | 'end';
    weight?: number | string;
    font?: string;
    rotate?: number;
    spacing?: number;
    opacity?: number;
    baseline?: string;
    /**
     * Paint a paper-coloured outline behind the glyphs. This is the drafting
     * equivalent of masking the linework under a note: without it, any label
     * that lands on a hatch, a grid line or a fixture symbol becomes unreadable.
     */
    halo?: boolean | number;
    /** override the halo colour when the label sits on a filled shape */
    haloColor?: string;
  } = {},
): void {
  const attrs: Attrs = {
    x,
    y,
    'font-family': o.font ?? FONT,
    'font-size': o.size ?? FONT_SIZE.block,
    'font-weight': o.weight ?? 400,
    fill: o.fill ?? c.t.text,
    'text-anchor': o.anchor ?? 'middle',
    'dominant-baseline': o.baseline ?? 'central',
    'letter-spacing': o.spacing,
    opacity: o.opacity,
  };
  if (o.halo) {
    attrs.stroke = o.haloColor ?? c.t.paper;
    attrs['stroke-width'] = typeof o.halo === 'number' ? o.halo : 2.6;
    attrs['stroke-linejoin'] = 'round';
    attrs['stroke-opacity'] = 0.85;
    attrs['paint-order'] = 'stroke';
  }
  if (o.rotate) attrs.transform = `rotate(${r2(o.rotate)} ${r2(x)} ${r2(y)})`;
  c.out.push(tag('text', attrs, esc(s)));
}

// ============================================================== wall geometry

/**
 * A wall's drawing frame: an (along, across) coordinate system whose origin is
 * `wall.start`, derived from the SOLID rather than assumed, so this code stays
 * correct if wallSolid's convention ever changes.
 *
 *   along : distance from wall.start toward wall.end — the same axis
 *           `Opening.offset` is measured on, which is what makes the poché
 *           subtraction below trivial.
 *   across: signed distance along the wall's right-hand normal.
 */
interface WallFrame {
  wall: Wall;
  dir: Vec2;
  normal: Vec2;
  length: number;
  a0: number;
  a1: number;
  n0: number;
  n1: number;
  /** wall thickness measured across the solid */
  t: number;
  /** `across` coordinate of the outward face (exterior walls: the traced line, 0) */
  outerN: number;
  innerN: number;
  at: (along: number, across: number) => Vec2;
}

function wallFrame(w: Wall): WallFrame {
  const ax = wallAxis(w);
  const corners = obbCorners(wallSolid(w));
  let a0 = Infinity;
  let a1 = -Infinity;
  let n0 = Infinity;
  let n1 = -Infinity;
  for (const cn of corners) {
    const rel = sub(cn, w.start);
    const a = dot(rel, ax.dir);
    const n = dot(rel, ax.normal);
    if (a < a0) a0 = a;
    if (a > a1) a1 = a;
    if (n < n0) n0 = n;
    if (n > n1) n1 = n;
  }
  // Exterior walls are traced on the OUTER face, so the face sitting at
  // across == 0 is the outside one; the interior side is whichever end of the
  // band the wall's `interiorSide` points to.
  const inwardIsPlus = w.interiorSide !== 'left';
  const isExt = w.kind === 'exterior';
  return {
    wall: w,
    dir: ax.dir,
    normal: ax.normal,
    length: ax.length,
    a0,
    a1,
    n0,
    n1,
    t: n1 - n0,
    outerN: isExt ? (inwardIsPlus ? n0 : n1) : n0,
    innerN: isExt ? (inwardIsPlus ? n1 : n0) : n1,
    at: (along: number, across: number): Vec2 =>
      add(w.start, add(vmul(ax.dir, along), vmul(ax.normal, across))),
  };
}

/** [a0,a1] minus the union of `cuts`. Used to break the poché at openings. */
function subtractIntervals(
  a0: number,
  a1: number,
  cuts: Array<[number, number]>,
): Array<[number, number]> {
  const eps = 1e-4;
  const merged: Array<[number, number]> = [];
  for (const raw of [...cuts].sort((p, q) => Math.min(p[0], p[1]) - Math.min(q[0], q[1]))) {
    const lo = Math.max(a0, Math.min(raw[0], raw[1]));
    const hi = Math.min(a1, Math.max(raw[0], raw[1]));
    if (hi - lo <= eps) continue;
    const last = merged[merged.length - 1];
    if (last && lo <= last[1] + eps) last[1] = Math.max(last[1], hi);
    else merged.push([lo, hi]);
  }
  const out: Array<[number, number]> = [];
  let cur = a0;
  for (const m of merged) {
    if (m[0] - cur > eps) out.push([cur, m[0]]);
    cur = Math.max(cur, m[1]);
  }
  if (a1 - cur > eps) out.push([cur, a1]);
  return out;
}

// =================================================================== sections

/**
 * The paper. Returned as markup rather than pushed, because the sheet HEIGHT is
 * not known until the numbered key has been laid out (a suppressed label adds a
 * row to the title block), and the sheet still has to be the first thing in the
 * document. renderPlanSVG unshifts it once everything else is measured.
 */
function sheetMarkup(c: Ctx, w: number, h: number): string {
  const inset = 14;
  return (
    tag('rect', { x: 0, y: 0, width: w, height: h, fill: c.t.sheet }) +
    tag('rect', {
      x: inset,
      y: inset,
      width: w - inset * 2,
      height: h - inset * 2,
      fill: c.t.paper,
      stroke: c.t.frame,
      'stroke-width': STROKE.frame,
    })
  );
}

/**
 * Building floor: fills the whole footprint (the wall band is drawn over it).
 *
 * The footprint is the ONLY authority for what is inside the building. This plan
 * is traced, and at the south step `plan.interior` pokes ~2" outside
 * `plan.footprint` (the interior corner was offset the wrong way round a
 * re-entrant corner); painting the interior polygon here as well would hang a
 * bright tag of floor outside the wall. Everything that could leak into that
 * sliver is clipped instead — see the nested clips in drawWalls and drawZones.
 */
function drawFloor(c: Ctx, plan: FloorPlan): void {
  c.out.push(tag('path', { d: polyD(c, plan.footprint), fill: c.t.floor }));
}

/**
 * 1 ft grid, heavier every 5 ft, clipped to the footprint so it reads as a
 * survey grid on the building rather than graph paper on the sheet.
 * Grid lines land on whole feet in PLAN space (the footprint origin is 0,0).
 */
function drawGrid(c: Ctx, plan: FloorPlan): void {
  const g: string[] = [];
  const x0 = Math.ceil(c.b.min[0]);
  const x1 = Math.floor(c.b.max[0]);
  const y0 = Math.ceil(c.b.min[1]);
  const y1 = Math.floor(c.b.max[1]);
  const top = c.py(c.b.min[1]);
  const bot = c.py(c.b.max[1]);
  const left = c.px(c.b.min[0]);
  const right = c.px(c.b.max[0]);
  for (let x = x0; x <= x1; x++) {
    const major = x % 5 === 0;
    g.push(
      tag('line', {
        x1: c.px(x),
        y1: top,
        x2: c.px(x),
        y2: bot,
        stroke: major ? c.t.gridMajor : c.t.grid,
        'stroke-width': major ? STROKE.gridMajor : STROKE.grid,
      }),
    );
  }
  for (let y = y0; y <= y1; y++) {
    const major = y % 5 === 0;
    g.push(
      tag('line', {
        x1: left,
        y1: c.py(y),
        x2: right,
        y2: c.py(y),
        stroke: major ? c.t.gridMajor : c.t.grid,
        'stroke-width': major ? STROKE.gridMajor : STROKE.grid,
      }),
    );
  }
  c.out.push(tag('g', { 'clip-path': `url(#${c.uid}-fp)` }, g.join('')));
}

/**
 * Where to write a zone's name.
 *
 * The area centroid is the right answer for an empty room, but this plan's
 * kitchen zone centroid lands squarely on the 10 ft counter run and the label
 * would be drawn over (zones are painted BEFORE the fixtures, as they must be —
 * the wash cannot cover the poché). So: try the centroid, then a handful of
 * offsets across the zone, and take the first one that is inside the zone and
 * clear of every fixture footprint, placed item and WALL SOLID.
 *
 * The wall test matters for the same reason: the kitchen zone runs the full width
 * of the leg, so at small scales its name reaches the laundry closet's partitions
 * and the last letter disappears under the poché, which is painted over it.
 */
function zoneLabelPoint(
  zone: FloorPlan['zones'][number],
  plan: FloorPlan,
  items: PlacedResolved[],
  /** width of the widest label line, in FEET, so both ends get tested too */
  labelW: number,
): Vec2 {
  const cen = polygonCentroid(zone.polygon);
  const zb = polygonBounds(zone.polygon);
  const solids = plan.walls.map((w) => obbInflate(wallSolid(w), 0.15));
  const free = (p: Vec2): boolean => {
    if (!pointInPolygon(p, zone.polygon)) return false;
    for (const f of plan.fixtures) {
      const r = f.footprint;
      if (p[0] > r.x - 0.3 && p[0] < r.x + r.w + 0.3 && p[1] > r.y - 0.3 && p[1] < r.y + r.h + 0.3) {
        return false;
      }
    }
    for (const it of items) if (obbContainsPoint(obbInflate(it.obb, 0.3), p)) return false;
    for (const s of solids) if (obbContainsPoint(s, p)) return false;
    return true;
  };
  // Score the centre AND both ends of the text run: a point can be clear while
  // the name still runs into the toilet next to it.
  const score = (p: Vec2): number =>
    (free(p) ? 1 : 0) +
    (free([p[0] - labelW / 2, p[1]]) ? 1 : 0) +
    (free([p[0] + labelW / 2, p[1]]) ? 1 : 0);

  // Candidates IN ORDER OF PREFERENCE: the area centroid, then the handful of
  // offsets that suit a normal room, then a 7x5 grid across the zone. The grid is
  // the part that matters at small scales — this plan's kitchen zone runs the
  // full 17 ft width of the leg, so at 15 px/ft its name is 9 ft long and the
  // only line clear of both the counter run and the laundry closet is a narrow
  // band the fixed offsets happen to miss.
  const candidates: Vec2[] = [
    cen,
    [cen[0], cen[1] - zb.h * 0.24],
    [cen[0], cen[1] + zb.h * 0.24],
    [cen[0] - zb.w * 0.24, cen[1]],
    [cen[0] + zb.w * 0.24, cen[1]],
    [cen[0] - zb.w * 0.3, cen[1] - zb.h * 0.3],
    [cen[0] + zb.w * 0.3, cen[1] - zb.h * 0.3],
  ];
  for (let iy = 0; iy < 5; iy++) {
    for (let ix = 0; ix < 7; ix++) {
      candidates.push([
        zb.min[0] + zb.w * (0.12 + (0.76 * ix) / 6),
        zb.min[1] + zb.h * (0.14 + (0.72 * iy) / 4),
      ]);
    }
  }
  // First fully clear candidate wins. Otherwise take the best-scoring one —
  // falling back to the LEAST BAD spot rather than to the centroid is the point
  // of scoring: in a zone with no clear line at all, one end of the name buried
  // under a partition beats the whole name lying along the counter run.
  let best = cen;
  let bestScore = -1;
  for (const p of candidates) {
    if (!pointInPolygon(p, zone.polygon)) continue;
    const sc = score(p);
    if (sc > bestScore) {
      best = p;
      bestScore = sc;
      if (sc === 3) break;
    }
  }
  return best;
}

/**
 * Draw the zone washes and their names, and RETURN the boxes the names occupy.
 *
 * The return value is the point: zone names are painted before the fixtures and
 * the furniture, so without handing their footprints to the label placer a
 * fixture label on a leader would happily land on top of "KITCHEN / LAUNDRY".
 */
function drawZones(c: Ctx, plan: FloorPlan, items: PlacedResolved[]): PxRect[] {
  // Washes are clipped to the footprint. Zone polygons are authored off the
  // INTERIOR trace, which disagrees with the footprint trace by up to a couple
  // of inches at the south step (both are +-0.3 ft from a listing graphic), and
  // an unclipped wash paints a stray tag of colour outside the building.
  const washes: string[] = [];
  for (const z of plan.zones) {
    const tint = c.t.zoneTints[z.type] ?? c.t.textMuted;
    washes.push(
      tag('path', {
        d: polyD(c, z.polygon),
        fill: tint,
        'fill-opacity': ZONE_ALPHA,
        stroke: tint,
        'stroke-opacity': 0.45,
        'stroke-width': STROKE.zone,
        'stroke-dasharray': '5 4',
        'data-zone-id': z.id,
      }),
    );
  }
  c.out.push(
    tag('g', { class: 'p2d-zones', 'clip-path': `url(#${c.uid}-fp)` }, washes.join('')),
  );
  // Names go in a second pass so no wash ever lands on top of a label.
  const boxes: PxRect[] = [];
  const ZONE_TRACK = 1.4;
  for (const z of plan.zones) {
    const nameUp = z.name.toUpperCase();
    const nameW = textWidth(nameUp, FONT_SIZE.zone) + [...nameUp].length * ZONE_TRACK;
    const cen = zoneLabelPoint(z, plan, items, nameW / c.s);
    const cx = c.px(cen[0]);
    const cy = c.py(cen[1]);
    const areaStr = formatArea(polygonArea(z.polygon));
    text(c, cx, cy - 7, nameUp, {
      size: FONT_SIZE.zone,
      weight: 600,
      spacing: ZONE_TRACK,
      fill: c.t.text,
      opacity: 0.62,
      halo: 3,
    });
    text(c, cx, cy + 7, areaStr, {
      size: FONT_SIZE.zoneSub,
      fill: c.t.textMuted,
      font: FONT_MONO,
      halo: 3,
    });
    boxes.push({
      cx,
      cy: cy - 7,
      w: nameW,
      h: FONT_SIZE.zone * LINE_HEIGHT,
      rot: 0,
    });
    boxes.push({
      cx,
      cy: cy + 7,
      w: textWidth(areaStr, FONT_SIZE.zoneSub, 'mono'),
      h: FONT_SIZE.zoneSub * LINE_HEIGHT,
      rot: 0,
    });
  }
  return boxes;
}

/**
 * The wall poché: every wall solid filled dark, MINUS its openings.
 *
 * Done as per-wall segments between openings (not an SVG mask) so the output
 * stays a flat list of readable, editable closed paths — you can open the file
 * and see one path per piece of wall, which is also what a CAD export looks like.
 */
function drawWalls(c: Ctx, plan: FloorPlan, frames: Map<string, WallFrame>): void {
  const exterior: string[] = [];
  const partition: string[] = [];

  for (const w of plan.walls) {
    const fr = frames.get(w.id);
    if (!fr) continue;
    const cuts: Array<[number, number]> = plan.openings
      .filter((o) => o.wall === w.id)
      .map((o) => [o.offset, o.offset + o.width] as [number, number]);
    /**
     * CORNER CLEAN-UP. Each wall solid stops dead at its own endpoint, which
     * leaves an open notch at every corner — most visibly at this plan's north
     * step, where W2 ends at y = 2.59 and W3 starts at x = 10.53, leaving a
     * 7 1/2" square hole in the poché. So run each wall long and let a clip
     * region trim it:
     *   exterior : run past both ends by the full thickness (corners are made at
     *              the OUTER face) and clip the layer to footprint-minus-interior,
     *              which is exactly the exterior wall ring — so the overrun can
     *              never spill outside the building or into the floor.
     *   partition: joints are made on the CENTERLINE, so half a thickness fills
     *              the corner square exactly, with nothing to trim.
     */
    const over = w.kind === 'exterior' ? w.thickness : w.thickness / 2;
    const segs = subtractIntervals(fr.a0 - over, fr.a1 + over, cuts);
    const parts: string[] = [];
    for (const [s0, s1] of segs) {
      const quad: Vec2[] = [
        fr.at(s0, fr.n0),
        fr.at(s1, fr.n0),
        fr.at(s1, fr.n1),
        fr.at(s0, fr.n1),
      ];
      parts.push(
        tag('path', {
          d: polyD(c, quad),
          fill: c.t.wallFill,
          stroke: c.t.wallStroke,
          'stroke-width': STROKE.wall,
          'stroke-linejoin': 'miter',
        }),
      );
    }
    const g = tag(
      'g',
      { 'data-wall-id': w.id, 'data-wall-kind': w.kind, class: 'p2d-wall' },
      parts.join(''),
    );
    (w.kind === 'exterior' ? exterior : partition).push(g);
  }

  // Two nested clips: the wall ring AND the footprint. The ring alone would let
  // the corner overruns leak into the sliver where the traced interior polygon
  // pokes outside the traced footprint (see drawFloor).
  c.out.push(
    tag(
      'g',
      { 'clip-path': `url(#${c.uid}-fp)` },
      tag('g', { class: 'p2d-walls-ext', 'clip-path': `url(#${c.uid}-band)` }, exterior.join('')),
    ),
  );
  c.out.push(tag('g', { class: 'p2d-walls-part' }, partition.join('')));
}

// ============================================== openings: glazing conventions

/**
 * A punched window and a floor-to-ceiling glazed assembly are DIFFERENT SYMBOLS,
 * and the thing that tells them apart is the sill height — not the wall, not the
 * width, not a hardcoded assumption about which wall the windows are in.
 *
 * A punched window has a sill you can sit a plant on, so the plan shows a stool
 * projecting past the outer face. A full-height glazed assembly has no sill at
 * all: the glass runs to the slab, and what you cut through at the 4 ft plan
 * plane is a structural frame with mullions and, at the operable leaf, a sliding
 * panel on its own track. Drawing the second one with a projecting sill is not a
 * stylistic slip — it tells the reader there is a 2'-6" solid wall under the
 * glass, which is the single most consequential thing about this unit's west
 * wall (nothing can hide "below the sill" — see the note in core/plan.ts).
 *
 * 1" of tolerance because sills are authored in feet from tape measurements.
 */
const FULL_HEIGHT_SILL = 1 / 12;

function isFullHeight(o: Opening): boolean {
  return o.kind === 'window' && o.sill <= FULL_HEIGHT_SILL;
}

/**
 * Slim aluminium frame profile, drawn to scale. 2 1/4" is a typical thermally
 * broken storefront/slider frame member and is ASSUMED — the source plan does not
 * dimension the frames. Mullions shared between two lights are NOT assumed: those
 * are drawn at the traced width of the pier between the openings.
 */
const FRAME_W = 2.25 / 12;
/** Sliding leaf panel: 2" including the glass and both rails. */
const SLIDE_T = 2 / 12;
/**
 * Two full-height lights closer together than this share a MULLION, not a pier —
 * they are one glazed assembly. Read the west wall off plan.ts from the south end:
 * 3'-6", 4 1/4", 2'-9 1/4", then 1'-4 1/4", then 2'-8 1/4", 4 1/4", 2'-8 3/4".
 * That is two PAIRS of lights, each pair split by a 4 1/4" mullion, with a 16"
 * structural pier between the pairs — exactly what the reference photograph shows
 * (two assemblies with a column between them). It only falls out of the data if
 * the cut-off sits between 4 1/4" and 16", so 6" it is.
 */
const MULLION_MAX = 0.5;
/**
 * A full-height light at least this wide is an operable SLIDING leaf; anything
 * narrower is fixed glazing. 3'-0" is the narrowest panel anyone builds as a
 * door — below it you cannot get furniture through, so nobody makes it operable.
 */
const SLIDER_MIN = 3.0;
/** Widest single fixed light before it gets an intermediate mullion. */
const PANEL_MAX = 4.0;

/** A mullion between two lights, in the wall's `along` coordinate. */
interface Mullion {
  at: number;
  width: number;
}

interface GlazingInfo {
  /** true for the first light of its assembly — it draws the shared mullions */
  first: boolean;
  /** mullions shared with the neighbouring lights of the same assembly */
  mullions: Mullion[];
  /** this light is the operable sliding leaf */
  operable: boolean;
  /** +1 / -1 in the wall's `along` direction: which way the leaf slides */
  slide: number;
}

/**
 * Group the full-height lights of each wall into assemblies and decide which
 * leaf slides, and which way. All of it is derived from the opening data — the
 * gaps between lights and their widths — so a change to plan.ts moves the
 * drawing with it.
 */
function glazingLayout(plan: FloorPlan, frames: Map<string, WallFrame>): Map<string, GlazingInfo> {
  const out = new Map<string, GlazingInfo>();
  const byWall = new Map<string, Opening[]>();
  for (const o of plan.openings) {
    if (!isFullHeight(o)) continue;
    const list = byWall.get(o.wall);
    if (list) list.push(o);
    else byWall.set(o.wall, [o]);
  }
  for (const [wallId, raw] of byWall) {
    const lights = [...raw].sort((p, q) => p.offset - q.offset);
    const wallLen = frames.get(wallId)?.length ?? 0;
    // Split into assemblies at every gap wider than a mullion.
    const groups: Opening[][] = [];
    for (const o of lights) {
      const g = groups[groups.length - 1];
      const prev = g?.[g.length - 1];
      if (prev && o.offset - (prev.offset + prev.width) <= MULLION_MAX) g.push(o);
      else groups.push([o]);
    }
    for (const g of groups) {
      const mullions: Mullion[] = [];
      for (let i = 1; i < g.length; i++) {
        const lo = g[i - 1].offset + g[i - 1].width;
        const hi = g[i].offset;
        mullions.push({ at: (lo + hi) / 2, width: Math.max(hi - lo, FRAME_W) });
      }
      g.forEach((o, i) => {
        // Slide direction: the leaf parks in front of the adjacent fixed light of
        // its own assembly. Alone in its assembly there is nothing to park over,
        // so it slides toward the nearer end of the wall (against the pier).
        let slide: number;
        if (g.length > 1) {
          if (i === 0) slide = 1;
          else if (i === g.length - 1) slide = -1;
          else {
            const gapBefore = o.offset - (g[i - 1].offset + g[i - 1].width);
            const gapAfter = g[i + 1].offset - (o.offset + o.width);
            slide = gapAfter <= gapBefore ? 1 : -1;
          }
        } else {
          const mid = o.offset + o.width / 2;
          slide = mid <= wallLen / 2 ? -1 : 1;
        }
        out.set(o.id, {
          first: i === 0,
          mullions: i === 0 ? mullions : [],
          operable: o.width >= SLIDER_MIN,
          slide,
        });
      });
    }
  }
  return out;
}

/**
 * Window symbol, the standard PUNCHED-window plan convention:
 *   - the two wall FACES carried across the opening (the frame),
 *   - a thin DOUBLE LINE mid-thickness for the glazing,
 *   - a SILL projecting past the outer face, wider than the opening.
 */
function drawPunchedWindow(c: Ctx, o: Opening, fr: WallFrame): void {
  const a = o.offset;
  const b = o.offset + o.width;
  const parts: string[] = [];

  // Glazing tint across the full thickness so the hole reads as filled with glass.
  parts.push(
    tag('path', {
      d: polyD(c, [fr.at(a, fr.n0), fr.at(b, fr.n0), fr.at(b, fr.n1), fr.at(a, fr.n1)]),
      fill: c.t.glassTint,
      'fill-opacity': 0.3,
    }),
  );

  const seg = (n: number, stroke: string, width: number, from = a, to = b): string =>
    tag('line', {
      x1: c.px(fr.at(from, n)[0]),
      y1: c.py(fr.at(from, n)[1]),
      x2: c.px(fr.at(to, n)[0]),
      y2: c.py(fr.at(to, n)[1]),
      stroke,
      'stroke-width': width,
    });

  // Frame: both faces continue across the opening.
  parts.push(seg(fr.n0, c.t.sill, STROKE.jamb));
  parts.push(seg(fr.n1, c.t.sill, STROKE.jamb));
  // Glazing: the conventional double line, inset from the faces.
  const lo = fr.n0 + fr.t * 0.37;
  const hi = fr.n0 + fr.t * 0.63;
  parts.push(seg(lo, c.t.glass, STROKE.glass));
  parts.push(seg(hi, c.t.glass, STROKE.glass));

  // Sill: only exterior walls have one, and it projects OUTWARD 1 1/2" and
  // 2" past each jamb — the standard way a plan shows a stool/sill.
  if (fr.wall.kind === 'exterior') {
    const outward = Math.sign(fr.outerN - fr.innerN) || -1;
    const sillN = fr.outerN + outward * (1.5 / 12);
    const ext = 2 / 12;
    parts.push(seg(sillN, c.t.sill, STROKE.sill, a - ext, b + ext));
    // Return ticks tying the sill back to the wall face.
    for (const along of [a - ext, b + ext]) {
      parts.push(
        tag('line', {
          x1: c.px(fr.at(along, sillN)[0]),
          y1: c.py(fr.at(along, sillN)[1]),
          x2: c.px(fr.at(along, fr.outerN)[0]),
          y2: c.py(fr.at(along, fr.outerN)[1]),
          stroke: c.t.sill,
          'stroke-width': STROKE.hairline,
        }),
      );
    }
  }

  c.out.push(
    tag(
      'g',
      { 'data-opening-id': o.id, 'data-opening-kind': o.kind, class: 'p2d-window' },
      parts.join(''),
    ),
  );
}

/**
 * FULL-HEIGHT GLAZED ASSEMBLY / SLIDING DOOR — the convention for glass that
 * runs floor to soffit (see FULL_HEIGHT_SILL above for why it is chosen by sill).
 *
 * What gets drawn, and why each piece is there:
 *   1. a pale daylight wash across the wall thickness — this is a hole you can
 *      see through, and on this unit it is most of the west elevation;
 *   2. HEAVY FRAME LINES ACROSS THE WALL THICKNESS at both jambs, drawn as the
 *      real 2 1/4" aluminium profile filled solid. This is the structural read:
 *      the frame is part of the fabric, not a line drawn in a void;
 *   3. PANEL DIVISIONS — a mullion at every division: the ones this assembly
 *      shares with the neighbouring light (drawn over the poché, which ties two
 *      lights 4" apart into one assembly the way the photo shows them), plus an
 *      intermediate mullion in any light too wide to be one pane;
 *   4. the glazing plane itself as ONE heavy dark line at mid-thickness (black
 *      anodised: see theme.glass) rather than the punched window's thin double
 *      line, because at this scale the assembly is a wall of glass, not a pane;
 *   5. at the operable leaf, a SLIDING PANEL drawn to scale on its own track,
 *      offset inboard of the fixed plane exactly as a real bypass slider sits,
 *      with a DIRECTION ARROW showing which way it goes.
 *   6. NO SILL. There is nothing to project — the glass meets the slab.
 */
function drawGlazedAssembly(c: Ctx, o: Opening, fr: WallFrame, g: GlazingInfo): void {
  const a = o.offset;
  const b = o.offset + o.width;
  const parts: string[] = [];
  // Mid-thickness is where the fixed glazing plane sits; `inward` is the sign of
  // the normal that points into the room, so the slider can be put on the inside
  // track (which is where a bypass slider's operable leaf actually runs).
  const mid = (fr.n0 + fr.n1) / 2;
  const inward = Math.sign(fr.innerN - fr.outerN) || 1;

  const seg = (n: number, stroke: string, width: number, from: number, to: number, extra: Attrs = {}): string =>
    tag('line', {
      x1: c.px(fr.at(from, n)[0]),
      y1: c.py(fr.at(from, n)[1]),
      x2: c.px(fr.at(to, n)[0]),
      y2: c.py(fr.at(to, n)[1]),
      stroke,
      'stroke-width': width,
      ...extra,
    });

  /** A frame/mullion profile: a solid block across the FULL wall thickness. */
  const profile = (at: number, w: number): string =>
    tag('path', {
      d: polyD(c, [
        fr.at(at - w / 2, fr.n0),
        fr.at(at + w / 2, fr.n0),
        fr.at(at + w / 2, fr.n1),
        fr.at(at - w / 2, fr.n1),
      ]),
      fill: c.t.mullion,
      stroke: c.t.mullion,
      'stroke-width': STROKE.glazeFrame,
      'stroke-linejoin': 'miter',
    });

  // 1. daylight.
  parts.push(
    tag('path', {
      d: polyD(c, [fr.at(a, fr.n0), fr.at(b, fr.n0), fr.at(b, fr.n1), fr.at(a, fr.n1)]),
      fill: c.t.glassTint,
      'fill-opacity': 0.42,
    }),
  );

  // 2. both wall faces carried across at FRAME weight (a glazed wall is
  // continuous fabric), then the jamb frames across the thickness.
  parts.push(seg(fr.n0, c.t.mullion, STROKE.glazeFrame, a, b));
  parts.push(seg(fr.n1, c.t.mullion, STROKE.glazeFrame, a, b));
  parts.push(profile(a + FRAME_W / 2, FRAME_W));
  parts.push(profile(b - FRAME_W / 2, FRAME_W));

  // 3. panel divisions.
  for (const m of g.mullions) parts.push(profile(m.at, m.width));
  const panes = Math.max(1, Math.ceil(o.width / PANEL_MAX - 1e-6));
  for (let i = 1; i < panes; i++) {
    parts.push(profile(a + (o.width * i) / panes, FRAME_W));
  }

  // 4. the glazing plane, between the jamb frames.
  const g0 = a + FRAME_W;
  const g1 = b - FRAME_W;
  parts.push(seg(mid, c.t.glass, STROKE.glazePlane, g0, g1));

  // 5. the operable leaf.
  if (g.operable) {
    // The sliding panel runs on the inside track, one frame depth in from the
    // fixed plane, and overlaps the jamb it closes against.
    const trackN = mid + inward * (FRAME_W * 0.9);
    const lead = g.slide > 0 ? g1 : g0;
    const heel = g.slide > 0 ? g0 : g1;
    parts.push(
      tag('path', {
        d: polyD(c, [
          fr.at(heel, trackN - SLIDE_T / 2),
          fr.at(lead, trackN - SLIDE_T / 2),
          fr.at(lead, trackN + SLIDE_T / 2),
          fr.at(heel, trackN + SLIDE_T / 2),
        ]),
        fill: c.t.mullion,
        'fill-opacity': 0.55,
        stroke: c.t.mullion,
        'stroke-width': STROKE.slider,
      }),
    );
    // Direction arrow: just clear of the INNER wall face, in the room, so it
    // never sits on the glazing or the track lines it is annotating.
    const arrowN = fr.innerN + inward * (4.5 / c.s);
    const half = Math.min(o.width * 0.3, 1.4) / 2;
    const centre = (a + b) / 2;
    const tip = centre + g.slide * half;
    const tail = centre - g.slide * half;
    parts.push(seg(arrowN, c.t.mullion, STROKE.arrow, tail, tip));
    // Arrowhead: 5 px barbs swept back along the wall from the tip.
    const barb = 5 / c.s;
    for (const side of [-1, 1]) {
      parts.push(
        tag('line', {
          x1: c.px(fr.at(tip, arrowN)[0]),
          y1: c.py(fr.at(tip, arrowN)[1]),
          x2: c.px(fr.at(tip - g.slide * barb, arrowN + side * barb * 0.6)[0]),
          y2: c.py(fr.at(tip - g.slide * barb, arrowN + side * barb * 0.6)[1]),
          stroke: c.t.mullion,
          'stroke-width': STROKE.arrow,
        }),
      );
    }
  }

  // 6. no sill: deliberately nothing. See the header comment.
  c.out.push(
    tag(
      'g',
      {
        'data-opening-id': o.id,
        'data-opening-kind': o.kind,
        'data-glazing': g.operable ? 'sliding' : 'fixed',
        class: 'p2d-glazing',
      },
      parts.join(''),
    ),
  );
}

/**
 * BIFOLD detection for a `passage`.
 *
 * plan.ts models the laundry closet doors (D3) as kind 'passage' on purpose — a
 * bifold folds flat into its own jambs and must not be analysed as if it swept a
 * quarter-disc of floor — but "passage" makes the renderer draw a bare gap, and a
 * bare gap in a closet wall is wrong: those leaves DO project into the room and
 * you have to be able to see them on the drawing.
 *
 * The heuristic, in full, and each clause's reason:
 *   - the wall must be a PARTITION. Bifolds are interior closet doors; a passage
 *     in an exterior wall is something else entirely.
 *   - the opening must be at least 2'-0" wide. Narrower than that it is a cased
 *     opening, and a 2-leaf bifold in it would be 12" panels, which nobody makes.
 *   - one side of the wall must BE A CLOSET: probe 1'-0" past each face from the
 *     middle of the opening and look for a storage/laundry fixture footprint. A
 *     storage fixture parked immediately behind an opening is what a closet IS.
 * The leaves then fold into the OTHER side — the room — which is the only way a
 * bifold can work, and is returned as the sign of the wall normal to fold toward.
 */
function passageBifoldFold(plan: FloorPlan, o: Opening, fr: WallFrame): number | null {
  if (fr.wall.kind !== 'partition') return null;
  if (o.width < 2.0) return null;
  const midAlong = o.offset + o.width / 2;
  const PROBE = 1.0;
  const isCloset = (p: Vec2): boolean =>
    plan.fixtures.some((f) => {
      if (f.category !== 'storage' && f.category !== 'laundry') return false;
      const r = f.footprint;
      return p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;
    });
  const plusIsCloset = isCloset(fr.at(midAlong, fr.n1 + PROBE));
  const minusIsCloset = isCloset(fr.at(midAlong, fr.n0 - PROBE));
  if (plusIsCloset === minusIsCloset) return null; // both or neither: not a closet door
  // Fold into the side that is NOT the closet.
  return plusIsCloset ? -1 : 1;
}

/**
 * Bifold pair symbol. Each leaf is drawn to scale (1 1/8" panel) at 60 degrees
 * off the wall plane — the standard "partly open" bifold convention, where the
 * two leaves of a pair make a V into the room and the free edge lands halfway
 * across its own pair, on the track.
 *
 * Leaf count comes from the width the way it does in a door schedule: up to
 * 3'-0" is one pair of two leaves hinged at one jamb; wider than that is two
 * pairs meeting in the middle, hinged at both jambs.
 */
function drawBifold(c: Ctx, o: Opening, fr: WallFrame, fold: number): void {
  const parts: string[] = [];
  const a = o.offset;
  const b = o.offset + o.width;
  const PANEL_T = 1.125 / 12;

  // Threshold: carry both faces across as hairlines so the gap still reads as an
  // opening rather than a hole (same as a swing door).
  for (const n of [fr.n0, fr.n1]) {
    parts.push(
      tag('line', {
        x1: c.px(fr.at(a, n)[0]),
        y1: c.py(fr.at(a, n)[1]),
        x2: c.px(fr.at(b, n)[0]),
        y2: c.py(fr.at(b, n)[1]),
        stroke: c.t.sill,
        'stroke-width': STROKE.hairline,
        'stroke-dasharray': '3 3',
      }),
    );
  }

  // The leaves hang off the room-side face of the partition.
  const faceN = fold > 0 ? fr.n1 : fr.n0;
  const pairs: Array<{ jamb: number; dir: number }> =
    o.width <= 3.0 ? [{ jamb: a, dir: 1 }] : [
      { jamb: a, dir: 1 },
      { jamb: b, dir: -1 },
    ];
  const pairW = o.width / pairs.length;
  const leaf = pairW / 2;
  const COS = 0.5; // cos 60 degrees
  const SIN = 0.8660254; // sin 60 degrees

  for (const { jamb, dir } of pairs) {
    const hinge: Vec2 = [jamb, faceN];
    const apex: Vec2 = [jamb + dir * leaf * COS, faceN + fold * leaf * SIN];
    const free: Vec2 = [jamb + dir * leaf, faceN];
    // Each leaf as a to-scale slab, exactly like the swing-door leaf.
    for (const [p0, p1] of [
      [hinge, apex],
      [apex, free],
    ] as Array<[Vec2, Vec2]>) {
      const A = fr.at(p0[0], p0[1]);
      const B = fr.at(p1[0], p1[1]);
      const d = norm(sub(B, A));
      const perp = vmul(rotate(d, 90), PANEL_T / 2);
      parts.push(
        tag('path', {
          d: polyD(c, [add(A, perp), add(B, perp), sub(B, perp), sub(A, perp)]),
          fill: c.t.wallFill,
          stroke: c.t.wallStroke,
          'stroke-width': STROKE.bifold,
          'stroke-linejoin': 'miter',
        }),
      );
    }
    // Pivot at the hinge jamb, track guide at the free edge: the two pieces of
    // hardware that make a bifold a bifold.
    const hp = fr.at(hinge[0], hinge[1]);
    const fp = fr.at(free[0], free[1]);
    parts.push(
      tag('circle', { cx: c.px(hp[0]), cy: c.py(hp[1]), r: 1.9, fill: c.t.wallStroke }),
    );
    parts.push(
      tag('circle', {
        cx: c.px(fp[0]),
        cy: c.py(fp[1]),
        r: 2.1,
        fill: 'none',
        stroke: c.t.wallStroke,
        'stroke-width': STROKE.hairline,
      }),
    );
  }

  c.out.push(
    tag(
      'g',
      {
        'data-opening-id': o.id,
        'data-opening-kind': o.kind,
        'data-passage': 'bifold',
        class: 'p2d-bifold',
      },
      parts.join(''),
    ),
  );
}

/**
 * Door symbol: the leaf drawn to scale (1 3/4") at its open angle plus the
 * quarter-circle swing arc, from geometry's doorSwingPolygon so the 2D drawing
 * and the analyzer agree on exactly what floor the door sweeps.
 */
function drawDoor(c: Ctx, plan: FloorPlan, o: Opening, fr: WallFrame, showSwing: boolean): void {
  const parts: string[] = [];
  const a = o.offset;
  const b = o.offset + o.width;

  // Threshold: carry both wall faces across as hairlines so the gap still reads
  // as a doorway rather than a hole in the drawing.
  for (const n of [fr.n0, fr.n1]) {
    parts.push(
      tag('line', {
        x1: c.px(fr.at(a, n)[0]),
        y1: c.py(fr.at(a, n)[1]),
        x2: c.px(fr.at(b, n)[0]),
        y2: c.py(fr.at(b, n)[1]),
        stroke: c.t.sill,
        'stroke-width': STROKE.hairline,
        'stroke-dasharray': '3 3',
      }),
    );
  }

  // doorSwingPolygon returns [hinge, closed tip, ...arc..., open tip].
  const fan = o.swing ? doorSwingPolygon(plan, o, 24) : [];
  if (fan.length >= 3) {
    const hinge = fan[0];
    const openTip = fan[fan.length - 1];
    if (showSwing) {
      parts.push(
        tag('path', {
          d: polyD(c, fan),
          fill: c.t.swing,
          'fill-opacity': 0.09,
          stroke: 'none',
        }),
      );
      // The arc itself: every point after the hinge lies on the swept circle.
      parts.push(
        tag('path', {
          d: polyD(c, fan.slice(1), false),
          fill: 'none',
          stroke: c.t.swing,
          'stroke-width': STROKE.swing,
        }),
      );
    }
    // Leaf, to scale: a 1 3/4" slab from the hinge to the open tip.
    const dir = norm(sub(openTip, hinge));
    const perp = vmul(rotate(dir, 90), LEAF_T / 2);
    parts.push(
      tag('path', {
        d: polyD(c, [
          add(hinge, perp),
          add(openTip, perp),
          sub(openTip, perp),
          sub(hinge, perp),
        ]),
        fill: c.t.wallFill,
        stroke: c.t.wallStroke,
        'stroke-width': STROKE.hairline,
      }),
    );
  }

  c.out.push(
    tag(
      'g',
      { 'data-opening-id': o.id, 'data-opening-kind': o.kind, class: 'p2d-door' },
      parts.join(''),
    ),
  );
}

// =================================================================== fixtures

type FixSym =
  | 'counter'
  | 'uppers'
  | 'sink'
  | 'range'
  | 'dishwasher'
  | 'fridge'
  | 'washer'
  | 'tub'
  | 'wc'
  | 'vanity'
  | 'closet'
  | 'generic';

/**
 * Pick the plan symbol from the fixture's id + name. Order matters: "Vanity +
 * sink" must be a vanity, not a kitchen sink.
 */
function fixtureSymbol(f: Fixture): FixSym {
  const s = `${f.id} ${f.name}`.toLowerCase();
  if (/upper|wall cab/.test(s)) return 'uppers';
  if (/dishwash|\bdw\b/.test(s)) return 'dishwasher';
  if (/vanity/.test(s)) return 'vanity';
  if (/sink|lav\b/.test(s)) return 'sink';
  if (/range|cooktop|stove|oven/.test(s)) return 'range';
  if (/fridge|refriger/.test(s)) return 'fridge';
  if (/wash|dryer|laundry/.test(s)) return 'washer';
  if (/tub|shower/.test(s)) return 'tub';
  if (/toilet|\bwc\b|water closet/.test(s)) return 'wc';
  if (/closet|wardrobe|linen|pantry/.test(s)) return 'closet';
  if (/counter|worktop|cabinet/.test(s)) return 'counter';
  return 'generic';
}

/** Number of door leaves, from the name ("(4 doors)") or one per 2'-6" of run. */
function leafCount(f: Fixture, runFt: number): number {
  const m = f.name.match(/(\d+)\s*(?:door|leaf|leaves|panel)/i);
  if (m) return Math.max(1, Math.min(8, parseInt(m[1], 10)));
  return Math.max(1, Math.min(8, Math.round(runFt / 2.5)));
}

/**
 * Fixtures are axis-aligned Rects, but their SYMBOLS are oriented by `facing`
 * (0 = the usable face points plan south). Drawing them inside a
 * `rotate(facing)` group lets every symbol be authored once, in a local frame
 * where +y is always "the front". Because the footprint is axis aligned, the
 * local width/depth swap when facing is an odd multiple of 90.
 */
/**
 * The direction a fixture's symbol should open toward.
 *
 * `Fixture.facing` is the authored intent, but a symbol whose doors swing INTO a
 * wall is a drawing bug, and the plan data is traced (+-0.3 ft) rather than
 * modelled. So: probe 6" in front of the front face and 6" behind the back face.
 * If the front probe is outside the building and the back one is inside, the
 * usable side is demonstrably the other one and we flip 180 degrees. This fires
 * only when the authored facing points out of the building, so a correctly
 * authored fixture is never touched.
 */
function resolveFacing(plan: FloorPlan, f: Fixture): number {
  const facing = f.facing ?? 0;
  const centre: Vec2 = [f.footprint.x + f.footprint.w / 2, f.footprint.y + f.footprint.h / 2];
  const front = rotate([0, 1], facing);
  const half = localSize(f.footprint, facing).d / 2;
  const probe = 0.5;
  const ahead = add(centre, vmul(front, half + probe));
  const behind = sub(centre, vmul(front, half + probe));
  if (!pointInPolygon(ahead, plan.interior) && pointInPolygon(behind, plan.interior)) {
    return (facing + 180) % 360;
  }
  return facing;
}

function localSize(rect: Rect, facing: number): { w: number; d: number } {
  const q = Math.round((((facing % 360) + 360) % 360) / 90) % 4;
  const swap = q === 1 || q === 3;
  return swap ? { w: rect.h, d: rect.w } : { w: rect.w, d: rect.h };
}

interface LocalCtx {
  c: Ctx;
  /** feet -> px */
  f: (ft: number) => number;
  /** half width / half depth in px */
  hw: number;
  hd: number;
  w: number;
  d: number;
  stroke: string;
  detail: string;
}

function lLine(k: LocalCtx, x1: number, y1: number, x2: number, y2: number, extra: Attrs = {}): string {
  return tag('line', {
    x1,
    y1,
    x2,
    y2,
    stroke: k.detail,
    'stroke-width': STROKE.fixtureDetail,
    ...extra,
  });
}

function lRect(k: LocalCtx, x: number, y: number, w: number, h: number, extra: Attrs = {}): string {
  return tag('rect', {
    x,
    y,
    width: w,
    height: h,
    fill: 'none',
    stroke: k.detail,
    'stroke-width': STROKE.fixtureDetail,
    ...extra,
  });
}

function lCircle(k: LocalCtx, cx: number, cy: number, r: number, extra: Attrs = {}): string {
  return tag('circle', {
    cx,
    cy,
    r,
    fill: 'none',
    stroke: k.detail,
    'stroke-width': STROKE.fixtureDetail,
    ...extra,
  });
}

/**
 * The symbol linework, in the fixture's local frame (origin = centre of the
 * footprint, +y = the direction `facing` points).
 * `plumbSide` is +1/-1: which end of the long axis the plumbing wall is on.
 */
function fixtureSymbolMarks(sym: FixSym, k: LocalCtx, f: Fixture, plumbSide: number): string {
  const p: string[] = [];
  const { hw, hd } = k;
  const ft = k.f;

  switch (sym) {
    case 'counter': {
      // Continuous counter nosing 3/4" inside the front edge, plus base-cabinet
      // division ticks every 2'-0" (a real base cabinet run) and a backsplash.
      p.push(lLine(k, -hw, hd - ft(0.06), hw, hd - ft(0.06), { 'stroke-width': STROKE.fixture }));
      p.push(lLine(k, -hw, -hd + ft(0.1), hw, -hd + ft(0.1), { 'stroke-dasharray': '4 3' }));
      const bay = ft(2.0);
      for (let x = -hw + bay; x < hw - 1; x += bay) {
        p.push(lLine(k, x, -hd + ft(0.1), x, hd, { opacity: 0.7 }));
      }
      break;
    }
    case 'uppers': {
      // Above the cut plane: shelf divisions dashed, like every real plan.
      const bay = ft(2.0);
      for (let x = -hw + bay; x < hw - 1; x += bay) {
        p.push(lLine(k, x, -hd, x, hd, { 'stroke-dasharray': '4 3' }));
      }
      break;
    }
    case 'sink': {
      // 30" sink: one basin inset from the counter edges, faucet at the back.
      const inX = ft(0.22);
      const basin = {
        x: -hw + inX,
        y: -hd + ft(0.5),
        w: k.w - inX * 2,
        h: k.d - ft(0.5) - ft(0.22),
      };
      p.push(lRect(k, basin.x, basin.y, basin.w, basin.h, { rx: ft(0.1) }));
      p.push(lCircle(k, 0, -hd + ft(0.28), ft(0.12))); // faucet
      p.push(lCircle(k, 0, basin.y + basin.h / 2, ft(0.07), { fill: k.detail })); // drain
      break;
    }
    case 'range': {
      // 30" range: 4 burners on a 2x2 grid, control strip at the back wall,
      // oven door line at the front.
      const gx = k.w * 0.24;
      const gy = k.d * 0.2;
      const rBig = Math.min(ft(0.36), k.w * 0.2);
      const rSml = rBig * 0.78;
      let i = 0;
      for (const sy of [-1, 1]) {
        for (const sx of [-1, 1]) {
          p.push(lCircle(k, sx * gx, sy * gy + ft(0.1), i % 3 === 0 ? rSml : rBig));
          i++;
        }
      }
      p.push(lLine(k, -hw, -hd + ft(0.25), hw, -hd + ft(0.25))); // control strip
      p.push(lLine(k, -hw, hd - ft(0.12), hw, hd - ft(0.12), { 'stroke-width': STROKE.fixture }));
      break;
    }
    case 'dishwasher': {
      p.push(lRect(k, -hw + ft(0.12), -hd + ft(0.12), k.w - ft(0.24), k.d - ft(0.24)));
      p.push(lLine(k, -hw + ft(0.3), hd - ft(0.3), hw - ft(0.3), hd - ft(0.3), {
        'stroke-width': STROKE.fixture,
      })); // handle
      break;
    }
    case 'fridge': {
      // Door panel across the front, hinge line on one side, handle opposite.
      p.push(lLine(k, -hw, hd - ft(0.22), hw, hd - ft(0.22), { 'stroke-width': STROKE.fixture }));
      p.push(lLine(k, -hw + ft(0.16), -hd, -hw + ft(0.16), hd, { 'stroke-dasharray': '3 2.5' }));
      p.push(lLine(k, hw - ft(0.35), hd - ft(0.5), hw - ft(0.35), hd - ft(0.05), {
        'stroke-width': STROKE.fixture,
      }));
      break;
    }
    case 'washer': {
      // Front-loader: door circle + hinge line. Stacked pairs read the same.
      p.push(lCircle(k, 0, ft(0.12), Math.min(k.w, k.d) * 0.3));
      p.push(lLine(k, -hw + ft(0.14), -hd, -hw + ft(0.14), hd, { 'stroke-dasharray': '3 2.5' }));
      p.push(lLine(k, -hw, hd - ft(0.18), hw, hd - ft(0.18)));
      break;
    }
    case 'tub': {
      // Alcove tub: rounded interior 4" inside the rim, drain + faucet at the
      // plumbing end (the end nearest an exterior wall — see plumbSide).
      const rim = ft(0.33);
      p.push(
        lRect(k, -hw + rim, -hd + rim, k.w - rim * 2, k.d - rim * 2, {
          rx: ft(0.62),
          'stroke-width': STROKE.fixture,
        }),
      );
      const dx = plumbSide * (hw - rim - ft(0.55));
      p.push(lCircle(k, dx, 0, ft(0.12), { fill: k.detail, 'fill-opacity': 0.5 })); // drain
      p.push(lCircle(k, plumbSide * (hw - ft(0.16)), 0, ft(0.09))); // supply
      break;
    }
    case 'wc': {
      // Toilet: tank against the wall (local -y), elongated bowl in front.
      const tank = Math.min(ft(0.72), k.d * 0.42);
      p.push(lRect(k, -k.w * 0.42, -hd + ft(0.04), k.w * 0.84, tank, { rx: ft(0.06) }));
      const bowlTop = -hd + tank;
      const cy = (bowlTop + hd) / 2;
      p.push(
        tag('ellipse', {
          cx: 0,
          cy,
          rx: k.w * 0.36,
          ry: (hd - bowlTop) * 0.48,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.fixture,
        }),
      );
      p.push(lCircle(k, 0, cy, ft(0.06), { fill: k.detail, 'fill-opacity': 0.5 }));
      break;
    }
    case 'vanity': {
      // Counter edge at the front, oval basin, faucet at the back.
      p.push(lLine(k, -hw, hd - ft(0.06), hw, hd - ft(0.06), { 'stroke-width': STROKE.fixture }));
      p.push(
        tag('ellipse', {
          cx: 0,
          cy: ft(0.05),
          rx: Math.min(k.w * 0.34, ft(0.72)),
          ry: Math.min(k.d * 0.3, ft(0.58)),
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.fixtureDetail,
        }),
      );
      p.push(lCircle(k, 0, -hd + ft(0.28), ft(0.1)));
      break;
    }
    case 'closet': {
      // Hanging rod 12" off the back wall (a real rod sits ~12" out so a hanger
      // clears), plus one swing tick per leaf so the floor the doors need is
      // visible on the drawing.
      const runPx = k.w;
      const n = leafCount(f, runPx / ft(1));
      p.push(
        lLine(k, -hw + ft(0.1), -hd + ft(1.0), hw - ft(0.1), -hd + ft(1.0), {
          'stroke-dasharray': '7 4',
        }),
      );
      const leafPx = runPx / n;
      for (let i = 0; i < n; i++) {
        const lx = -hw + i * leafPx;
        const rx = lx + leafPx;
        if (i > 0) p.push(lLine(k, lx, -hd, lx, hd, { opacity: 0.75 })); // leaf division
        // Swing tick: the leaf cracked open 30 degrees off the near jamb.
        const hingeX = i % 2 === 0 ? lx : rx;
        const dirX = i % 2 === 0 ? 1 : -1;
        const L = Math.min(leafPx * 0.8, ft(1.4));
        p.push(
          lLine(k, hingeX, hd, hingeX + dirX * L * 0.866, hd + L * 0.5, { opacity: 0.85 }),
        );
      }
      break;
    }
    case 'generic':
    default:
      break;
  }
  return p.join('');
}

function drawFixtures(c: Ctx, plan: FloorPlan): void {
  // Big things first so a 10 ft counter never covers the sink drawn in it, and
  // anything above the 4 ft cut plane (upper cabinets) last.
  const sorted = [...plan.fixtures].sort((a, b) => {
    const za = a.z ?? 0;
    const zb = b.z ?? 0;
    if (za !== zb) return za - zb;
    return b.footprint.w * b.footprint.h - a.footprint.w * a.footprint.h;
  });

  for (const f of sorted) {
    const sym = fixtureSymbol(f);
    const facing = resolveFacing(plan, f);
    const rect = f.footprint;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const loc = localSize(rect, facing);
    // Above the cut plane -> dashed, unfilled: standard plan convention for
    // anything you would only see by looking up (upper cabinets).
    const above = (f.z ?? 0) >= 4;
    const k: LocalCtx = {
      c,
      f: (ft: number) => ft * c.s,
      hw: (loc.w * c.s) / 2,
      hd: (loc.d * c.s) / 2,
      w: loc.w * c.s,
      d: loc.d * c.s,
      stroke: c.t.fixtureStroke,
      detail: c.t.fixtureStroke,
    };

    // Plumbing end heuristic: fixtures like tubs put the valves on the end that
    // is closest to an outside wall. Compare each end of the long axis to the
    // footprint bounds and pick the nearer.
    const distMinX = rect.x - c.b.min[0];
    const distMaxX = c.b.max[0] - (rect.x + rect.w);
    const plumbSide = distMaxX <= distMinX ? 1 : -1;

    const body = tag('rect', {
      x: -k.hw,
      y: -k.hd,
      width: k.w,
      height: k.d,
      fill: above ? 'none' : c.t.fixtureFill,
      stroke: c.t.fixtureStroke,
      'stroke-width': STROKE.fixture,
      'stroke-dasharray': above ? '6 4' : undefined,
      class: 'p2d-body',
    });

    c.out.push(
      tag(
        'g',
        {
          'data-fixture-id': f.id,
          'data-fixture-cat': f.category,
          class: `p2d-fixture p2d-sym-${sym}`,
          transform: `translate(${r2(c.px(cx))} ${r2(c.py(cy))})${
            facing ? ` rotate(${r2(facing)})` : ''
          }`,
          opacity: f.approximate ? 0.94 : undefined,
        },
        body + fixtureSymbolMarks(sym, k, f, plumbSide),
      ),
    );
  }
}

// ================================================================ clearances

/**
 * Translucent hatched box in front of anything that declares a clearance.
 *
 * The box is built by re-expressing the footprint in the FACING frame first
 * (width across the face, depth along it) and then calling clearanceObb, so a
 * fixture whose usable side is not its own front — the toilet at facing 90 in
 * an axis-aligned rect — still gets a box that sits flush on the right face.
 */
function facingAlignedObb(rect: Rect, facing: number): OBB {
  const loc = localSize(rect, facing);
  return {
    center: [rect.x + rect.w / 2, rect.y + rect.h / 2],
    w: loc.w,
    d: loc.d,
    rot: facing,
  };
}

/** Draws the clearance boxes and returns the boxes its depth notes occupy. */
function drawClearances(c: Ctx, plan: FloorPlan, items: PlacedResolved[]): PxRect[] {
  const claimed: PxRect[] = [];
  const boxes: Array<{ o: OBB; id: string; depth: number }> = [];
  for (const f of plan.fixtures) {
    if (!f.clearance || f.clearance <= 0) continue;
    const facing = resolveFacing(plan, f);
    boxes.push({
      o: clearanceObb(facingAlignedObb(f.footprint, facing), f.clearance),
      id: f.id,
      depth: f.clearance,
    });
  }
  for (const it of items) {
    const dep = it.def.frontClearance;
    if (!dep || dep <= 0 || it.item.ignoreAnalysis) continue;
    boxes.push({ o: clearanceObb(it.obb, dep), id: it.item.id, depth: dep });
  }

  for (const b of boxes) {
    const pts = obbCorners(b.o);
    c.out.push(
      tag('path', {
        d: polyD(c, pts),
        fill: `url(#${c.uid}-hatch)`,
        stroke: c.t.clearance,
        'stroke-width': STROKE.clearance,
        'stroke-dasharray': '5 3',
        'stroke-opacity': 0.75,
        class: 'p2d-clearance',
        'data-clearance-for': b.id,
      }),
    );
    // Label the required depth: a clearance you cannot read is decoration.
    const cen = b.o.center;
    if (b.o.w * c.s > 34 && b.o.d * c.s > 13) {
      const note = formatShort(b.depth);
      const rot = normRot(b.o.rot);
      text(c, c.px(cen[0]), c.py(cen[1]), note, {
        size: FONT_SIZE.tiny,
        fill: c.t.clearance,
        font: FONT_MONO,
        rotate: rot,
      });
      claimed.push({
        cx: c.px(cen[0]),
        cy: c.py(cen[1]),
        w: textWidth(note, FONT_SIZE.tiny, 'mono'),
        h: FONT_SIZE.tiny * LINE_HEIGHT,
        rot,
      });
    }
  }
  return claimed;
}

// ================================================================== furniture

interface PlacedResolved {
  item: PlacedItem;
  def: FurnitureDef;
  obb: OBB;
}

/**
 * Resolve a layout to (item, def, obb) triples. A layout referencing an unknown
 * catalog id must NOT kill the drawing — the renderer is also the debugging
 * tool for authoring layouts — so it falls back to a plain box carrying whatever
 * size override the item gave.
 */
function resolveItems(layout: Layout | undefined): PlacedResolved[] {
  if (!layout) return [];
  const out: PlacedResolved[] = [];
  for (const item of layout.items) {
    let def: FurnitureDef;
    try {
      def = getDef(item.def);
    } catch {
      def = {
        id: item.def,
        name: item.label ?? `? ${item.def}`,
        kind: 'box',
        w: item.size?.w ?? 2,
        d: item.size?.d ?? 2,
        h: item.size?.h ?? 2,
      };
    }
    out.push({ item, def, obb: itemObb(item, def) });
  }
  // Rugs and anything else you walk on go UNDER everything; wall-mounted pieces
  // (art, mirrors, TVs) go on top because they are above the cut plane.
  const rank = (r: PlacedResolved): number =>
    r.def.walkable ? 0 : r.def.wallMounted ? 2 : 1;
  return out
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i)
    .map((x) => x.r);
}

/**
 * Pick a glyph ink that is actually visible on top of a given fill.
 *
 * Catalog colours run from cream to near-black (a MARKUS office chair is
 * #1c1c1c). Drawing the seat/back linework in the theme's dark furniture stroke
 * makes those items solid blobs, so the ink flips to light over a dark fill.
 * Threshold 0.42 on relative luminance, which is where 1px linework stops
 * reading against the theme's stroke colour.
 */
function inkFor(fill: string, t: PlanTheme): string {
  const lum = lumOf(fill);
  if (lum === null || lum >= LUM_MID) return t.furnitureStroke;
  return t.name === 'light' ? '#f4f7f9' : t.text;
}

/** Relative luminance of a #rgb / #rrggbb colour, or null if it is not one. */
function lumOf(color: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1];
  const n = parseInt(hex, 16);
  const lin = (v: number): number => {
    const c0 = v / 255;
    return c0 <= 0.04045 ? c0 / 12.92 : Math.pow((c0 + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

const LUM_MID = 0.42;

/**
 * Text + halo colours for a label sitting ON a filled shape. The sheet theme is
 * the wrong reference here: a cream sofa on the dark sheet needs dark text, and
 * a near-black office chair on the light sheet needs light text.
 */
function labelInk(fill: string, t: PlanTheme): { ink: string; halo: string } {
  // Blueprint washes catalog colour out to almost nothing, so the paper wins.
  if (t.furnitureFillAlpha < 0.5) return { ink: t.text, halo: t.paper };
  const lum = lumOf(fill);
  if (lum === null) return { ink: t.text, halo: t.paper };
  return lum < LUM_MID
    ? { ink: '#f7f9fa', halo: '#0e1216' }
    : { ink: '#181d21', halo: '#fbfcfd' };
}

/** Bring a rotation into (-90, 90] so text is never upside down. */
function normRot(deg: number): number {
  let a = ((deg % 180) + 180) % 180;
  if (a > 90) a -= 180;
  return Math.round(a * 100) / 100;
}

/** Local-frame glyph for a furniture kind. Origin = centre, +y = front. */
function itemGlyph(kind: FurnitureKind, k: LocalCtx, wallMounted: boolean): string {
  const p: string[] = [];
  const { hw, hd, w, d } = k;
  const ft = k.f;
  const band = (x: number, y: number, bw: number, bh: number, extra: Attrs = {}): string =>
    tag('rect', {
      x,
      y,
      width: bw,
      height: bh,
      fill: k.stroke,
      'fill-opacity': 0.12,
      stroke: k.detail,
      'stroke-width': STROKE.furnitureDetail,
      ...extra,
    });
  const ln = (x1: number, y1: number, x2: number, y2: number, extra: Attrs = {}): string =>
    tag('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: k.detail,
      'stroke-width': STROKE.furnitureDetail,
      ...extra,
    });

  switch (kind) {
    case 'sofa':
    case 'loveseat':
    case 'sectional':
    case 'sofa_bed': {
      // Back at the local -y edge (the front faces +y by definition), arms on
      // both sides, and the seat divided into real 2 ft cushions.
      const back = Math.min(ft(0.62), d * 0.3);
      const arm = Math.min(ft(0.62), w * 0.2);
      p.push(band(-hw, -hd, w, back));
      p.push(band(-hw, -hd, arm, d));
      p.push(band(hw - arm, -hd, arm, d));
      const seatX0 = -hw + arm;
      const seatX1 = hw - arm;
      const n = Math.max(1, Math.min(5, Math.round((seatX1 - seatX0) / ft(2.05))));
      for (let i = 1; i < n; i++) {
        const x = seatX0 + ((seatX1 - seatX0) * i) / n;
        p.push(ln(x, -hd + back, x, hd - ft(0.08)));
      }
      // Seat front edge, so the cushion block reads as a solid mass.
      p.push(ln(seatX0, hd - ft(0.1), seatX1, hd - ft(0.1), { opacity: 0.7 }));
      if (kind === 'sofa_bed') {
        p.push(ln(seatX0, -hd + back + ft(0.2), seatX1, -hd + back + ft(0.2), {
          'stroke-dasharray': '5 4',
        }));
      }
      break;
    }
    case 'armchair':
    case 'chair': {
      const back = Math.min(ft(0.42), d * 0.26);
      const arm = kind === 'armchair' ? Math.min(ft(0.5), w * 0.2) : 0;
      p.push(band(-hw, -hd, w, back));
      if (arm > 0) {
        p.push(band(-hw, -hd, arm, d));
        p.push(band(hw - arm, -hd, arm, d));
      }
      // Seat square, inset from the arms/back.
      p.push(
        tag('rect', {
          x: -hw + arm + ft(0.1),
          y: -hd + back + ft(0.08),
          width: w - 2 * (arm + ft(0.1)),
          height: d - back - ft(0.22),
          rx: ft(0.1),
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      break;
    }
    case 'bar_stool': {
      p.push(
        tag('circle', {
          cx: 0,
          cy: 0,
          r: Math.min(hw, hd) * 0.82,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      p.push(tag('circle', { cx: 0, cy: 0, r: Math.min(hw, hd) * 0.14, fill: k.detail }));
      break;
    }
    case 'bed':
    case 'murphy_bed': {
      // Mattress inside the frame, pillows at the HEAD (local -y, because the
      // front of a bed is the side you get out of), and a turned-down sheet.
      const inset = ft(0.12);
      p.push(
        tag('rect', {
          x: -hw + inset,
          y: -hd + inset,
          width: w - inset * 2,
          height: d - inset * 2,
          rx: ft(0.18),
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furniture * 0.8,
        }),
      );
      const nPil = w > ft(4.6) ? 2 : 1;
      const pw = Math.min(ft(2.1), (w - inset * 3) / nPil - ft(0.1));
      const ph = ft(1.3);
      for (let i = 0; i < nPil; i++) {
        const cxp = nPil === 1 ? 0 : (i === 0 ? -1 : 1) * (pw / 2 + ft(0.12));
        p.push(
          tag('rect', {
            x: cxp - pw / 2,
            y: -hd + inset + ft(0.16),
            width: pw,
            height: ph,
            rx: ft(0.22),
            fill: k.stroke,
            'fill-opacity': 0.1,
            stroke: k.detail,
            'stroke-width': STROKE.furnitureDetail,
          }),
        );
      }
      const foldY = -hd + inset + ft(2.05);
      if (foldY < hd - ft(0.4)) {
        p.push(ln(-hw + inset, foldY, hw - inset, foldY, { 'stroke-width': STROKE.furniture * 0.7 }));
        p.push(ln(-hw + inset, foldY + ft(0.22), hw - inset, foldY + ft(0.22), { opacity: 0.6 }));
      }
      if (kind === 'murphy_bed') {
        // The cabinet case it folds into, at the head.
        p.push(band(-hw, -hd, w, ft(0.55)));
      }
      break;
    }
    case 'dining_table':
    case 'coffee_table':
    case 'side_table':
    case 'console':
    case 'desk':
    case 'tv_stand':
    case 'cabinet': {
      const inset = Math.min(ft(0.22), Math.min(w, d) * 0.16);
      p.push(
        tag('rect', {
          x: -hw + inset,
          y: -hd + inset,
          width: w - inset * 2,
          height: d - inset * 2,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
          rx: kind === 'coffee_table' || kind === 'side_table' ? ft(0.12) : undefined,
        }),
      );
      if (kind === 'desk' || kind === 'console' || kind === 'tv_stand' || kind === 'cabinet') {
        // Worktop nosing along the front edge.
        p.push(ln(-hw, hd - ft(0.08), hw, hd - ft(0.08), { 'stroke-width': STROKE.furniture * 0.8 }));
      }
      if (kind === 'tv_stand' || kind === 'cabinet') {
        const bay = ft(1.6);
        for (let x = -hw + bay; x < hw - ft(0.4); x += bay) p.push(ln(x, -hd, x, hd, { opacity: 0.6 }));
      }
      break;
    }
    case 'dresser':
    case 'nightstand': {
      p.push(ln(-hw, hd - ft(0.1), hw, hd - ft(0.1), { 'stroke-width': STROKE.furniture * 0.8 }));
      // Drawer pulls: one dash per drawer bank.
      const n = Math.max(1, Math.round(w / ft(1.6)));
      for (let i = 0; i < n; i++) {
        const cxp = -hw + (w * (i + 0.5)) / n;
        p.push(ln(cxp - ft(0.28), hd - ft(0.34), cxp + ft(0.28), hd - ft(0.34), {
          'stroke-width': STROKE.furniture * 0.9,
        }));
        if (i > 0) p.push(ln(-hw + (w * i) / n, -hd, -hw + (w * i) / n, hd, { opacity: 0.5 }));
      }
      break;
    }
    case 'bookcase':
    case 'shelf':
    case 'wardrobe': {
      // Back panel plus one bay division per ~2'-6" of run: what you actually
      // see looking down into open shelving.
      p.push(ln(-hw, -hd + ft(0.1), hw, -hd + ft(0.1), { 'stroke-dasharray': '5 4' }));
      const bay = ft(2.5);
      const n = Math.max(1, Math.round(w / bay));
      for (let i = 1; i < n; i++) p.push(ln(-hw + (w * i) / n, -hd, -hw + (w * i) / n, hd));
      if (kind === 'wardrobe') {
        // Door swing tick per leaf, alternating hinge sides.
        for (let i = 0; i < n; i++) {
          const x0 = -hw + (w * i) / n;
          const x1 = -hw + (w * (i + 1)) / n;
          const hinge = i % 2 === 0 ? x0 : x1;
          const dir = i % 2 === 0 ? 1 : -1;
          const L = Math.min((x1 - x0) * 0.85, ft(1.4));
          p.push(ln(hinge, hd, hinge + dir * L * 0.87, hd + L * 0.5, { opacity: 0.8 }));
        }
      } else {
        p.push(ln(-hw, hd - ft(0.08), hw, hd - ft(0.08), { opacity: 0.6 }));
      }
      break;
    }
    case 'rug': {
      // Border inset one hand-span, plus a fringe on the two short ends.
      const inset = Math.min(ft(0.42), Math.min(w, d) * 0.12);
      p.push(
        tag('rect', {
          x: -hw + inset,
          y: -hd + inset,
          width: w - inset * 2,
          height: d - inset * 2,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
          'stroke-opacity': 0.8,
        }),
      );
      const short = w <= d;
      const step = ft(0.42);
      if (short) {
        for (let x = -hw + step / 2; x < hw; x += step) {
          p.push(ln(x, -hd, x, -hd + ft(0.22), { 'stroke-opacity': 0.55 }));
          p.push(ln(x, hd, x, hd - ft(0.22), { 'stroke-opacity': 0.55 }));
        }
      } else {
        for (let y = -hd + step / 2; y < hd; y += step) {
          p.push(ln(-hw, y, -hw + ft(0.22), y, { 'stroke-opacity': 0.55 }));
          p.push(ln(hw, y, hw - ft(0.22), y, { 'stroke-opacity': 0.55 }));
        }
      }
      break;
    }
    case 'plant': {
      // Soft blob: a ring of leaf lobes around a pot.
      const R = Math.min(hw, hd);
      const lobes = 7;
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        p.push(
          tag('circle', {
            cx: Math.cos(a) * R * 0.46,
            cy: Math.sin(a) * R * 0.46,
            r: R * 0.52,
            fill: k.stroke,
            'fill-opacity': 0.1,
            stroke: k.detail,
            'stroke-width': STROKE.furnitureDetail,
            'stroke-opacity': 0.55,
          }),
        );
      }
      p.push(
        tag('circle', {
          cx: 0,
          cy: 0,
          r: R * 0.3,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      break;
    }
    case 'floor_lamp':
    case 'table_lamp': {
      const R = Math.min(hw, hd);
      p.push(
        tag('circle', {
          cx: 0,
          cy: 0,
          r: R * 0.92,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      p.push(tag('circle', { cx: 0, cy: 0, r: Math.max(1, R * 0.16), fill: k.detail }));
      break;
    }
    case 'tv': {
      // A screen is a thin dark bar in plan; the OBB depth is the stand.
      const bar = Math.min(ft(0.2), d * 0.55);
      p.push(
        tag('rect', {
          x: -hw,
          y: -hd,
          width: w,
          height: bar,
          fill: k.detail,
          stroke: 'none',
        }),
      );
      p.push(ln(0, -hd + bar, 0, hd, { opacity: 0.7 }));
      break;
    }
    case 'projection_screen': {
      // The picture, in plan: a heavy bar on the wall face (the local -y edge,
      // since a screen's front looks into the room) with a light wash behind it
      // for the frame depth. Drawn heavier than 'art' because this is the thing
      // the whole seating group is aimed at.
      const bar = Math.min(ft(0.18), d * 0.8);
      p.push(band(-hw, -hd, w, d, { 'fill-opacity': 0.08 }));
      p.push(
        tag('rect', {
          x: -hw,
          y: -hd,
          width: w,
          height: bar,
          fill: k.detail,
          stroke: 'none',
        }),
      );
      // Tick the image edges so the viewable width reads separately from the frame.
      const bez = Math.min(ft(0.2), w * 0.06);
      for (const sx of [-1, 1]) {
        p.push(ln(sx * (hw - bez), -hd + bar, sx * (hw - bez), hd, { 'stroke-opacity': 0.85 }));
      }
      break;
    }
    case 'projector': {
      // Body + lens + throw direction. The wedge points at the FRONT (+y), which
      // is the orientation contract: a long-throw faces its screen. An
      // ultra-short-throw is placed with its front to the room and throws back
      // over itself, which the layout note has to say — a plan symbol cannot.
      p.push(
        tag('rect', {
          x: -hw + ft(0.05),
          y: -hd + ft(0.05),
          width: Math.max(ft(0.1), w - ft(0.1)),
          height: Math.max(ft(0.1), d - ft(0.1)),
          rx: ft(0.06),
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      const r = Math.min(ft(0.22), Math.min(w, d) * 0.22);
      p.push(tag('circle', { cx: 0, cy: hd - r - ft(0.06), r, fill: 'none', stroke: k.detail, 'stroke-width': STROKE.furnitureDetail }));
      p.push(ln(-hw * 0.5, hd, -hw * 0.9, hd + ft(0.45), { 'stroke-dasharray': '3 2', 'stroke-opacity': 0.7 }));
      p.push(ln(hw * 0.5, hd, hw * 0.9, hd + ft(0.45), { 'stroke-dasharray': '3 2', 'stroke-opacity': 0.7 }));
      break;
    }
    case 'speaker': {
      // Cabinet outline with one driver circle. A soundbar is wide and shallow,
      // so the circle is clamped to the depth and lands as a slot, which is
      // exactly what a soundbar looks like in plan.
      p.push(
        tag('rect', {
          x: -hw + ft(0.04),
          y: -hd + ft(0.04),
          width: Math.max(ft(0.08), w - ft(0.08)),
          height: Math.max(ft(0.08), d - ft(0.08)),
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      const r = Math.max(ft(0.06), Math.min(ft(0.28), Math.min(w, d) * 0.3));
      p.push(tag('circle', { cx: 0, cy: hd - r - ft(0.07), r, fill: k.detail, 'fill-opacity': 0.35, stroke: k.detail, 'stroke-width': STROKE.furnitureDetail }));
      break;
    }
    case 'shade': {
      // A blind in a reveal: the head cassette as a solid bar on the wall face,
      // then a run of short strokes for the fabric. Deliberately light — a shade
      // is above the cut plane and must not compete with the glazing it sits in.
      const bar = Math.min(ft(0.12), d * 0.8);
      p.push(tag('rect', { x: -hw, y: -hd, width: w, height: bar, fill: k.detail, 'fill-opacity': 0.8, stroke: 'none' }));
      const n = Math.max(2, Math.round(w / ft(0.5)));
      for (let i = 0; i <= n; i++) {
        const x = -hw + (w / n) * i;
        p.push(ln(x, -hd + bar, x, hd, { 'stroke-opacity': 0.45 }));
      }
      break;
    }
    case 'mirror':
    case 'art': {
      const bar = Math.min(ft(0.16), d * 0.7);
      p.push(
        tag('rect', {
          x: -hw,
          y: -hd,
          width: w,
          height: bar,
          fill: k.stroke,
          'fill-opacity': 0.35,
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      break;
    }
    case 'curtain': {
      // A gathered curtain: a run of scallops along the wall.
      const n = Math.max(3, Math.round(w / ft(0.8)));
      const step = w / n;
      let dstr = `M ${r2(-hw)} ${r2(0)}`;
      for (let i = 0; i < n; i++) {
        const x0 = -hw + step * i;
        dstr += ` Q ${r2(x0 + step * 0.5)} ${r2(hd * 1.1)} ${r2(x0 + step)} ${r2(0)}`;
      }
      p.push(
        tag('path', {
          d: dstr,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
        }),
      );
      break;
    }
    case 'screen': {
      // Folding screen: a zigzag of panels.
      const n = Math.max(2, Math.round(w / ft(1.5)));
      const step = w / n;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= n; i++) pts.push([-hw + step * i, i % 2 === 0 ? -hd : hd]);
      p.push(
        tag('path', {
          d: dOf(pts, false),
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furniture,
        }),
      );
      break;
    }
    case 'ottoman':
    case 'bench':
    case 'box':
    default: {
      const inset = Math.min(ft(0.16), Math.min(w, d) * 0.16);
      p.push(
        tag('rect', {
          x: -hw + inset,
          y: -hd + inset,
          width: w - inset * 2,
          height: d - inset * 2,
          rx: kind === 'ottoman' ? ft(0.14) : undefined,
          fill: 'none',
          stroke: k.detail,
          'stroke-width': STROKE.furnitureDetail,
          'stroke-opacity': 0.8,
        }),
      );
      break;
    }
  }
  if (wallMounted) {
    // Above the cut plane: hint with a dashed leader back to the wall face.
    p.push(ln(-hw, hd, hw, hd, { 'stroke-dasharray': '4 3', 'stroke-opacity': 0.6 }));
  }
  return p.join('');
}

function drawFurniture(c: Ctx, items: PlacedResolved[], selected: Set<string>): void {
  for (const { item, def, obb } of items) {
    const fill = item.color ?? def.color ?? c.t.fixtureFill;
    // On the blueprint sheet the fill is washed out to nothing, so the ink must
    // be judged against the paper, not against the catalog colour.
    const ink = c.t.furnitureFillAlpha < 0.5 ? c.t.furnitureStroke : inkFor(fill, c.t);
    const wPx = obb.w * c.s;
    const dPx = obb.d * c.s;
    const k: LocalCtx = {
      c,
      f: (ft: number) => ft * c.s,
      hw: wPx / 2,
      hd: dPx / 2,
      w: wPx,
      d: dPx,
      stroke: ink,
      detail: ink,
    };
    const parts: string[] = [];

    if (selected.has(item.id)) {
      // Halo drawn behind the body; CSS in the <style> block lights it up.
      parts.push(
        tag('rect', {
          x: -k.hw - 3.5,
          y: -k.hd - 3.5,
          width: wPx + 7,
          height: dPx + 7,
          fill: 'none',
          stroke: c.t.accent,
          'stroke-width': 2,
          'stroke-opacity': 0.45,
          rx: 3,
          class: 'p2d-halo',
        }),
      );
    }

    parts.push(
      tag('rect', {
        x: -k.hw,
        y: -k.hd,
        width: wPx,
        height: dPx,
        fill,
        'fill-opacity': def.walkable ? c.t.furnitureFillAlpha * 0.55 : c.t.furnitureFillAlpha,
        stroke: c.t.furnitureStroke,
        'stroke-width': STROKE.furniture,
        'stroke-dasharray': def.wallMounted ? '6 3' : undefined,
        class: 'p2d-body',
      }),
    );
    parts.push(itemGlyph(def.kind, k, def.wallMounted === true));

    c.out.push(
      tag(
        'g',
        {
          'data-item-id': item.id,
          'data-def-id': def.id,
          'data-kind': def.kind,
          class: `p2d-item p2d-kind-${def.kind}${selected.has(item.id) ? ' is-selected' : ''}`,
          transform: `translate(${r2(c.px(obb.center[0]))} ${r2(c.py(obb.center[1]))})${
            obb.rot ? ` rotate(${r2(obb.rot)})` : ''
          }`,
        },
        parts.join(''),
      ),
    );
  }
}

// ===================================================================== labels

/**
 * LABEL PLACEMENT.
 *
 * The rule this whole section exists to enforce, because breaking it is the
 * fastest way to make a plan unreadable:
 *
 *   A LABEL NEVER OVERLAPS ANOTHER LABEL, AND NEVER SPILLS OUTSIDE THE SHAPE IT
 *   NAMES.
 *
 * Every label that has been placed is kept as an oriented box in sheet px, and
 * every new candidate is tested against that list with a real separating-axis
 * test (labels are rotated 0/90 degrees and furniture OBBs are at arbitrary
 * angles, so an axis-aligned bounding test is not good enough — it was the
 * previous bug: three kitchen fixture labels each "fitted", each was tested as an
 * unrotated box around its own centre, and they all landed on one baseline
 * inside the same counter run and printed as "KITCHEN COUNTERRANGE").
 *
 * The escalation, in order, is the drafting-room one:
 *   1. SHRINK   — step the type down through the size list.
 *   2. ROTATE   — turn the label onto the shape's other axis.
 *   3. SLIDE    — scan the label along the shape's own axes (a 10 ft counter run
 *                 has room for "KITCHEN COUNTER" over the base cabinets even
 *                 when the sink and the range have taken the middle).
 *   4. LEADER   — move it outside the shape on a leader line with a dot at the
 *                 shape edge, but only to a spot that is on the drawing and
 *                 collides with nothing.
 *   5. KEY      — give up on lettering it in place: tag the shape with a number
 *                 and print the name in the numbered key in the title block.
 * Steps 1-3 are interleaved (all positions at the largest size before shrinking)
 * because keeping the type big matters more than keeping it centred.
 */

/** An oriented rectangle in SHEET PX space. `rot` is degrees clockwise. */
interface PxRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

/** Unit axes of a px rect: `u` along its width, `v` along its height. */
function pxAxes(rot: number): [Vec2, Vec2] {
  const a = (rot * Math.PI) / 180;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return [
    [cs, sn],
    [-sn, cs],
  ];
}

function pxCorners(r: PxRect): Vec2[] {
  const [u, v] = pxAxes(r.rot);
  const hw = r.w / 2;
  const hh = r.h / 2;
  const out: Vec2[] = [];
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ] as Array<[number, number]>) {
    out.push([r.cx + u[0] * hw * sx + v[0] * hh * sy, r.cy + u[1] * hw * sx + v[1] * hh * sy]);
  }
  return out;
}

/** Separating-axis test for two oriented rectangles. Touching is not overlap. */
function pxOverlap(a: PxRect, b: PxRect): boolean {
  const ca = pxCorners(a);
  const cb = pxCorners(b);
  const axes = [...pxAxes(a.rot), ...pxAxes(b.rot)];
  for (const ax of axes) {
    let a0 = Infinity;
    let a1 = -Infinity;
    let b0 = Infinity;
    let b1 = -Infinity;
    for (const p of ca) {
      const d = p[0] * ax[0] + p[1] * ax[1];
      if (d < a0) a0 = d;
      if (d > a1) a1 = d;
    }
    for (const p of cb) {
      const d = p[0] * ax[0] + p[1] * ax[1];
      if (d < b0) b0 = d;
      if (d > b1) b1 = d;
    }
    if (a1 <= b0 + 0.01 || b1 <= a0 + 0.01) return false;
  }
  return true;
}

/** Is `inner` completely inside `outer`, with `pad` px to spare on every side? */
function pxContains(outer: PxRect, inner: PxRect, pad = 0): boolean {
  const [u, v] = pxAxes(outer.rot);
  for (const p of pxCorners(inner)) {
    const dx = p[0] - outer.cx;
    const dy = p[1] - outer.cy;
    if (Math.abs(dx * u[0] + dy * u[1]) > outer.w / 2 - pad) return false;
    if (Math.abs(dx * v[0] + dy * v[1]) > outer.h / 2 - pad) return false;
  }
  return true;
}

/** px kept clear between a label block and the edge of the shape it names. */
const LABEL_PAD = 3;
/**
 * px of white space demanded BETWEEN two labels. Not overlapping is not enough:
 * "RANGE" and "KITCHEN COUNTER" set 1 px apart on the same baseline read as one
 * word, which is the same failure as an overlap with extra steps.
 */
const LABEL_GAP = 6.5;

function pxInflate(r: PxRect, d: number): PxRect {
  return { ...r, w: r.w + d * 2, h: r.h + d * 2 };
}

/**
 * Offsets across a slack range, ordered CENTRE OUT, so a label only moves off
 * centre by as much as it has to.
 */
function scanOffsets(slack: number, steps: number): number[] {
  if (slack <= 0.5) return [0];
  const n = Math.max(2, steps);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(-slack / 2 + (slack * i) / (n - 1));
  return out.sort((p, q) => Math.abs(p) - Math.abs(q));
}

/** One line of a label block. */
interface LabelLine {
  text: string;
  font: 'sans' | 'mono';
  /** relative to the block's base size */
  rel: number;
  weight: number;
}

interface LabelJob {
  id: string;
  /** the shape being named, in sheet px */
  shape: PxRect;
  /**
   * Text variants in order of preference at any one size: normally the full
   * two-line block first, then the name on its own.
   */
  variants: LabelLine[][];
  /** candidate base sizes, largest first */
  sizes: number[];
  ink: string;
  halo: string;
  /** extra tracking in px per character (uppercase fixture names are tracked) */
  tracking: number;
  /** name printed in the numbered key if the label has to be suppressed */
  keyText: string;
  /**
   * Skip straight to a numbered key tag: do not try an inside label or a
   * leader. Used for assembly callouts, where the whole point is one disc and
   * one key entry instead of eight names fighting over the same 5 ft box.
   */
  keyOnly?: boolean;
}

function blockMetrics(lines: LabelLine[], size: number, tracking: number): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const l of lines) {
    const s = size * l.rel;
    w = Math.max(w, textWidth(l.text, s, l.font) + [...l.text].length * tracking);
    h += s * LINE_HEIGHT;
  }
  return { w, h };
}

/**
 * Emit a stacked text block centred at (cx, cy) and rotated `rot`.
 * Lines are stacked PERPENDICULAR to the baseline: offsetting in screen y and
 * then rotating each line about its own anchor would run a rotated two-line
 * label straight through itself.
 */
function putBlock(
  c: Ctx,
  cx: number,
  cy: number,
  lines: LabelLine[],
  size: number,
  rot: number,
  ink: string,
  halo: string,
  tracking: number,
  owner: string,
  mode: 'inside' | 'leader' | 'key',
): void {
  const [, v] = pxAxes(rot);
  const total = lines.reduce((s, l) => s + size * l.rel * LINE_HEIGHT, 0);
  let cursor = -total / 2;
  // Emitted into a group stamped with WHO the label names and HOW it was placed.
  // Not decoration: it is what lets a test assert that every `inside` label is
  // actually inside the shape it names, without re-deriving the placement.
  const buf: string[] = [];
  const sub: Ctx = { ...c, out: buf };
  for (const l of lines) {
    const s = size * l.rel;
    const off = cursor + (s * LINE_HEIGHT) / 2;
    cursor += s * LINE_HEIGHT;
    text(sub, cx + v[0] * off, cy + v[1] * off, l.text, {
      size: s,
      fill: ink,
      weight: l.weight,
      font: l.font === 'mono' ? FONT_MONO : FONT,
      rotate: rot,
      spacing: tracking ? tracking : undefined,
      halo: true,
      haloColor: halo,
    });
  }
  c.out.push(
    tag(
      'g',
      { class: 'p2d-label', 'data-label-for': owner, 'data-label-mode': mode },
      buf.join(''),
    ),
  );
}

interface Placement {
  /** the claimed box, oriented with the SHAPE (so containment is exact) */
  box: PxRect;
  /** baseline rotation for the glyphs */
  textRot: number;
  size: number;
  lines: LabelLine[];
}

/**
 * Steps 1-3: shrink / rotate / slide, all inside the shape.
 *
 * The shape's LONG axis is the natural orientation and is exhausted at every size
 * before the label is turned — shrink before rotate, as a draughtsman does. It is
 * also why "DISHWASHER" reads up the 2'-1"-deep dishwasher instead of spilling
 * out of both ends of it, and why "KITCHEN COUNTER" stays horizontal and slides
 * east over the base cabinets instead of turning.
 */
function placeInside(job: LabelJob, taken: PxRect[]): Placement | null {
  const [u, v] = pxAxes(job.shape.rot);
  const spins = job.shape.w >= job.shape.h ? [0, 90] : [90, 0];
  for (const spin of spins) {
    for (const size of job.sizes) {
      for (const lines of job.variants) {
        const m = blockMetrics(lines, size, job.tracking);
        // Block extents re-expressed in the SHAPE's own frame.
        const ex = spin === 0 ? m.w : m.h;
        const ey = spin === 0 ? m.h : m.w;
        const slackX = job.shape.w - 2 * LABEL_PAD - ex;
        const slackY = job.shape.h - 2 * LABEL_PAD - ey;
        if (slackX < 0 || slackY < 0) continue;
        for (const dy of scanOffsets(slackY, 5)) {
          for (const dx of scanOffsets(slackX, 13)) {
            const box: PxRect = {
              cx: job.shape.cx + u[0] * dx + v[0] * dy,
              cy: job.shape.cy + u[1] * dx + v[1] * dy,
              w: ex,
              h: ey,
              rot: job.shape.rot,
            };
            if (!pxContains(job.shape, box, LABEL_PAD - 0.5)) continue;
            // The GAP is demanded of the candidate only; the stored box stays
            // tight so the next label is not pushed away twice over.
            const probe = pxInflate(box, LABEL_GAP);
            if (taken.some((t) => pxOverlap(t, probe))) continue;
            return {
              box,
              textRot: normRot(job.shape.rot + spin),
              size,
              lines,
            };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Step 4: outside on a leader line.
 *
 * First choice is away from the middle of the plan so labels fan outward instead
 * of piling up in the centre; second choice is back INWARD, because a piece
 * pushed against an outside wall has nothing but dimension chains on its outward
 * side. A candidate that lands off the footprint or on another label is rejected
 * outright rather than merely penalised — a leader pointing into a dimension
 * chain is worse than no label at all, and that is what the numbered key is for.
 */
function placeLeader(
  c: Ctx,
  plan: FloorPlan,
  job: LabelJob,
  taken: PxRect[],
): { box: PxRect; tx: number; ty: number; ax: number; ay: number; right: boolean } | null {
  const size = Math.min(8.6, job.sizes[0]);
  const name = job.variants[job.variants.length - 1][0];
  const w1 = textWidth(name.text, size, name.font) + [...name.text].length * job.tracking;
  const h1 = size * LINE_HEIGHT;
  // px -> ft is a uniform positive scale, so a direction in px IS the direction
  // in feet; no need to convert the shape centre back into plan coordinates.
  let away = norm([job.shape.cx - c.px(c.mid[0]), job.shape.cy - c.py(c.mid[1])] as Vec2);
  if (away[0] === 0 && away[1] === 0) away = [1, 0];
  const [u, v] = pxAxes(job.shape.rot);

  // Four directions, not two. A bed with two nightstands, a lamp, a plant and a
  // piece of art all sit in the same corner and all point "away from centre", so
  // with only the outward and inward directions their leaders pile into one
  // crowded stack. The two perpendiculars let the cluster fan out.
  const dirs: Vec2[] = [away, rotate(away, 90), rotate(away, -90), vmul(away, -1)];
  /** px -> plan feet, for the "is this note on the floor?" test. */
  const toFt = (x: number, y: number): Vec2 => [
    (x - c.px(c.b.min[0])) / c.s + c.b.min[0],
    (y - c.py(c.b.min[1])) / c.s + c.b.min[1],
  ];
  // Two passes. A note lettered ON the wall poché is legible but reads as
  // sloppy, so every candidate that lands wholly on the FLOOR is preferred; only
  // if none exists does the placer settle for anywhere inside the footprint.
  for (const onFloorOnly of [true, false]) {
    for (const dir of dirs) {
      // Support distance of the shape along `dir` (exact for a rectangle).
      const reach =
        (Math.abs(u[0] * dir[0] + u[1] * dir[1]) * job.shape.w) / 2 +
        (Math.abs(v[0] * dir[0] + v[1] * dir[1]) * job.shape.h) / 2;
      const ax = job.shape.cx + dir[0] * reach;
      const ay = job.shape.cy + dir[1] * reach;
      const right = dir[0] >= 0;
      for (const gap of [12, 20, 30, 42, 56]) {
        const tx = ax + dir[0] * gap + (right ? 4 : -4);
        const ty = ay + dir[1] * gap;
        const box: PxRect = {
          cx: right ? tx + w1 / 2 : tx - w1 / 2,
          cy: ty,
          w: w1,
          h: h1,
          rot: 0,
        };
        const offSheet =
          box.cx - w1 / 2 < c.px(c.b.min[0]) ||
          box.cx + w1 / 2 > c.px(c.b.max[0]) ||
          box.cy - h1 / 2 < c.py(c.b.min[1]) ||
          box.cy + h1 / 2 > c.py(c.b.max[1]);
        if (offSheet) continue;
        if (
          onFloorOnly &&
          !pxCorners(box).every((p) => pointInPolygon(toFt(p[0], p[1]), plan.interior))
        ) {
          continue;
        }
        if (taken.some((t) => pxOverlap(t, pxInflate(box, LABEL_GAP)))) continue;
        return { box, tx, ty, ax, ay, right };
      }
    }
  }
  return null;
}

/** An entry in the numbered key printed in the title block. */
interface KeyEntry {
  n: number;
  text: string;
}

/** Radius of a numbered key tag on the drawing. */
const KEY_TAG_R = 7.5;

/**
 * Step 5: suppress the lettering and tag the shape with a number instead.
 * The tag is small enough to fit almost anywhere, but it is still placed by the
 * same collision test — a key tag that lands on a label is the same bug.
 */
function placeKeyTag(job: LabelJob, taken: PxRect[]): PxRect {
  const [u, v] = pxAxes(job.shape.rot);
  const d = KEY_TAG_R * 2;
  const free = (box: PxRect): boolean => !taken.some((t) => pxOverlap(t, pxInflate(box, 2)));
  const at = (dx: number, dy: number): PxRect => ({
    cx: job.shape.cx + u[0] * dx + v[0] * dy,
    cy: job.shape.cy + u[1] * dx + v[1] * dy,
    w: d,
    h: d,
    rot: 0,
  });

  // 1. On the shape, if the shape is big enough to hold the disc at all.
  const slackX = job.shape.w - 2 - d;
  const slackY = job.shape.h - 2 - d;
  if (slackX >= 0 && slackY >= 0) {
    for (const dy of scanOffsets(slackY, 5)) {
      for (const dx of scanOffsets(slackX, 9)) {
        const box = at(dx, dy);
        if (free(box)) return box;
      }
    }
  }

  // 2. Off the shape, on a ring, with a connector drawn back to it.
  //
  // This is not a nicety. A 55" TV is 4" deep in plan — 5 px — so there is no
  // "inside" for a 15 px disc, and a wall-mounted piece is always shoulder to
  // shoulder with the labels of whatever stands under it. Searching outward in
  // eight directions is what stops the tag being dumped on a neighbour's name.
  const r0 = Math.max(job.shape.w, job.shape.h) / 2 + KEY_TAG_R + 3;
  for (const r of [r0, r0 + 12, r0 + 26, r0 + 44]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const box = at(Math.cos(a) * r, Math.sin(a) * r);
      if (free(box)) return box;
    }
  }

  // 3. Nowhere clear anywhere: the centre still tells the reader which shape it
  // is, and a 15 px disc over a label is less damaging than an unreadable name.
  return at(0, 0);
}

function drawKeyTag(c: Ctx, shape: PxRect, box: PxRect, n: number, owner: string): void {
  // Connector: only when the tag could not sit on the shape it names, so a reader
  // is never left guessing which box a bare number belongs to.
  if (!pxContains(shape, box, 0)) {
    const dx = shape.cx - box.cx;
    const dy = shape.cy - box.cy;
    const len = Math.hypot(dx, dy);
    if (len > KEY_TAG_R + 1) {
      c.out.push(
        tag('line', {
          x1: box.cx + (dx / len) * KEY_TAG_R,
          y1: box.cy + (dy / len) * KEY_TAG_R,
          x2: shape.cx,
          y2: shape.cy,
          stroke: c.t.textMuted,
          'stroke-width': STROKE.leader,
        }),
      );
    }
  }
  const buf: string[] = [];
  buf.push(
    tag('circle', {
      cx: box.cx,
      cy: box.cy,
      r: KEY_TAG_R,
      fill: c.t.paper,
      'fill-opacity': 0.92,
      stroke: c.t.text,
      'stroke-width': STROKE.keyTag,
    }),
  );
  text({ ...c, out: buf }, box.cx, box.cy, String(n), {
    size: FONT_SIZE.keyTag,
    weight: 700,
    fill: c.t.text,
    font: FONT_MONO,
  });
  c.out.push(
    tag('g', { class: 'p2d-label', 'data-label-for': owner, 'data-label-mode': 'key' }, buf.join('')),
  );
}

/** Run one job through the full escalation and emit whatever it settles on. */
function runLabelJob(
  c: Ctx,
  plan: FloorPlan,
  job: LabelJob,
  taken: PxRect[],
  keys: KeyEntry[],
): void {
  const inside = job.keyOnly ? null : placeInside(job, taken);
  if (inside) {
    taken.push(inside.box);
    putBlock(
      c,
      inside.box.cx,
      inside.box.cy,
      inside.lines,
      inside.size,
      inside.textRot,
      job.ink,
      job.halo,
      job.tracking,
      job.id,
      'inside',
    );
    return;
  }

  const lead = job.keyOnly ? null : placeLeader(c, plan, job, taken);
  if (lead) {
    taken.push(lead.box);
    const name = job.variants[job.variants.length - 1][0];
    c.out.push(
      tag('path', {
        d: dOf(
          [
            [lead.ax, lead.ay],
            [lead.tx + (lead.right ? -3 : 3), lead.ty],
          ],
          false,
        ),
        stroke: c.t.textMuted,
        'stroke-width': STROKE.leader,
        fill: 'none',
      }),
    );
    c.out.push(tag('circle', { cx: lead.ax, cy: lead.ay, r: 1.5, fill: c.t.textMuted }));
    const leadBuf: string[] = [];
    text({ ...c, out: leadBuf }, lead.tx, lead.ty, name.text, {
      size: Math.min(8.6, job.sizes[0]),
      fill: c.t.text,
      weight: 600,
      font: name.font === 'mono' ? FONT_MONO : FONT,
      anchor: lead.right ? 'start' : 'end',
      spacing: job.tracking ? job.tracking : undefined,
      halo: true,
    });
    c.out.push(
      tag(
        'g',
        { class: 'p2d-label', 'data-label-for': job.id, 'data-label-mode': 'leader' },
        leadBuf.join(''),
      ),
    );
    return;
  }

  const box = placeKeyTag(job, taken);
  taken.push(box);
  const n = keys.length + 1;
  keys.push({ n, text: job.keyText });
  drawKeyTag(c, job.shape, box, n, job.id);
}

/** Fixture / item labels. `reserved` holds boxes claimed by earlier passes. */
function drawLabels(
  c: Ctx,
  items: PlacedResolved[],
  plan: FloorPlan,
  showFixtures: boolean,
  reserved: PxRect[],
): KeyEntry[] {
  const taken: PxRect[] = [...reserved];
  const keys: KeyEntry[] = [];
  const jobs: LabelJob[] = [];

  if (showFixtures) {
    // Fixture names, uppercase and tracked. Parentheticals are dropped
    // ("Range (30\")" -> "RANGE") — the size is already on the drawing to scale.
    const SPACING = 0.5;
    const labelled = plan.fixtures.filter((f) => (f.z ?? 0) < 4);
    /**
     * How many other fixtures swallow this one. An appliance set INTO a counter
     * run (dishwasher, sink, range) must win the argument over the run itself:
     * it is the specific information, it has nowhere else to go, and the run has
     * 10 ft of base cabinet to letter over. Sorting by containment first and
     * then smallest-area first means every tightly constrained box is placed
     * while the sheet is still empty.
     */
    const depth = (f: Fixture): number =>
      labelled.filter((o) => {
        if (o.id === f.id) return false;
        const r = o.footprint;
        const q = f.footprint;
        const ox = Math.min(q.x + q.w, r.x + r.w) - Math.max(q.x, r.x);
        const oy = Math.min(q.y + q.h, r.y + r.h) - Math.max(q.y, r.y);
        if (ox <= 0 || oy <= 0) return false;
        return (ox * oy) / (q.w * q.h) >= 0.8;
      }).length;
    const area = (f: Fixture): number => f.footprint.w * f.footprint.h;
    const ordered = [...labelled].sort((p, q) => depth(q) - depth(p) || area(p) - area(q));

    for (const f of ordered) {
      const shown = f.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().toUpperCase();
      const rect = f.footprint;
      jobs.push({
        id: f.id,
        shape: {
          cx: c.px(rect.x + rect.w / 2),
          cy: c.py(rect.y + rect.h / 2),
          w: rect.w * c.s,
          h: rect.h * c.s,
          rot: 0,
        },
        variants: [[{ text: shown, font: 'sans', rel: 1, weight: 600 }]],
        sizes: [FONT_SIZE.fixture, 7.8, 7.2, 6.8, FONT_SIZE.fixtureMin],
        ink: c.t.textMuted,
        halo: c.t.paper,
        tracking: SPACING,
        keyText: shown,
      });
    }
  }

  // Big pieces claim their own interior first; rugs go last because a label in
  // the middle of a rug is the least useful one on the drawing (and the rug is
  // under everything anyway), so it is the one that should end up on a leader.
  const order = [...items].sort((a, b) => {
    const ra = a.def.walkable ? 1 : 0;
    const rb = b.def.walkable ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return b.obb.w * b.obb.d - a.obb.w * a.obb.d;
  });
  const itemJobs = order.map(({ item, def, obb }) => {
    const name = item.label ?? def.name;
    const dims = `${formatShort(obb.w)} x ${formatShort(obb.d)}`;
    // Inside labels are read against the item's own fill, not the sheet.
    const { ink, halo } = labelInk(item.color ?? def.color ?? c.t.fixtureFill, c.t);
    const job: LabelJob = {
      id: item.id,
      shape: {
        cx: c.px(obb.center[0]),
        cy: c.py(obb.center[1]),
        w: obb.w * c.s,
        h: obb.d * c.s,
        rot: normRot(obb.rot),
      },
      variants: [
        [
          { text: name, font: 'sans', rel: 1, weight: 600 },
          { text: dims, font: 'mono', rel: 0.86, weight: 400 },
        ],
        [{ text: name, font: 'sans', rel: 1, weight: 600 }],
      ],
      sizes: [FONT_SIZE.item, 9.6, 8.8, 8, 7.2, FONT_SIZE.itemMin],
      ink,
      halo,
      tracking: 0,
      keyText: `${name}  ${dims}`,
    };
    return { job, name, dims, offFloor: !!def.wallMounted, walkable: !!def.walkable };
  });

  /**
   * ASSEMBLIES GET ONE CALLOUT, NOT EIGHT NAMES.
   *
   * An OFF-FLOOR piece whose whole footprint sits inside another piece's
   * footprint is being CARRIED by it — a monitor arm, a cable tray, a CPU sling
   * and a desk mat are all inside the desk and none of them touches the ground.
   * Naming each one individually is what turned the most important 5 ft of the
   * drawing into an unreadable pile: nine labels competed for one box, the
   * placer scattered leaders across the room, and two identical monitors ended
   * up labelled two different ways.
   *
   * So the carried pieces get no marker of their own. The carrier keeps its
   * inline label and gains ONE numbered disc whose key entry schedules the
   * components. That is how the drawing would be drafted by hand, and it is the
   * only version of this corner that can actually be read.
   *
   * THE OFF-FLOOR TEST IS WHAT MAKES THIS SAFE, and it is not decoration.
   * Containment alone says a coffee table is "inside" the rug it stands on, and
   * a rug is not an assembly — the table is a real piece of furniture standing
   * on the floor and it has earned its own name. `wallMounted` is the catalog's
   * own flag for "not carried by the floor", which is exactly the question here.
   * Walkable carriers are excluded for the same reason from the other side.
   *
   * Containment is exact (rotation included) and total: a chair merely pulled up
   * to a desk is not inside it, so it keeps its own name.
   */
  const carriedBy = new Map<string, string[]>();
  const carried = new Set<string>();
  for (const a of itemJobs) {
    if (!a.offFloor) continue;
    let host: (typeof itemJobs)[number] | null = null;
    for (const b of itemJobs) {
      if (b.job.id === a.job.id || b.walkable) continue;
      if (!pxContains(b.job.shape, a.job.shape)) continue;
      // Smallest enclosing piece wins, so a tray inside a desk inside nothing
      // is scheduled under the desk and not under the room.
      const area = b.job.shape.w * b.job.shape.h;
      if (!host || area < host.job.shape.w * host.job.shape.h) host = b;
    }
    if (!host) continue;
    carried.add(a.job.id);
    const list = carriedBy.get(host.job.id) ?? [];
    list.push(a.name);
    carriedBy.set(host.job.id, list);
  }

  for (const { job } of itemJobs) if (!carried.has(job.id)) jobs.push(job);

  for (const job of jobs) runLabelJob(c, plan, job, taken, keys);

  // Assembly discs last, so they place around finished text rather than under it.
  for (const { job, name } of itemJobs) {
    const parts = carriedBy.get(job.id);
    if (!parts?.length) continue;
    runLabelJob(
      c,
      plan,
      { ...job, id: `${job.id}-assembly`, keyOnly: true, keyText: `${name} — with ${listOf(parts)}` },
      taken,
      keys,
    );
  }
  return keys;
}

/** "a, b and c", collapsing repeats into "2x a" so two monitors read as two. */
function listOf(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  const parts = [...counts].map(([n, k]) => (k > 1 ? `${k}x ${n}` : n));
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// ===================================================================== issues

function drawIssues(c: Ctx, issues: Issue[]): void {
  issues.forEach((iss, i) => {
    if (!iss.at) return;
    const col = iss.severity === 'error' ? c.t.issueError : c.t.issueWarn;
    const x = c.px(iss.at[0]);
    const y = c.py(iss.at[1]);
    c.out.push(
      tag(
        'g',
        { class: `p2d-issue p2d-issue-${iss.severity}`, 'data-issue-code': iss.code },
        tag('circle', {
          cx: x,
          cy: y,
          r: 9,
          fill: col,
          stroke: c.t.paper,
          'stroke-width': STROKE.issue,
        }) +
          tag(
            'text',
            {
              x,
              y,
              'font-family': FONT,
              'font-size': 10.5,
              'font-weight': 700,
              fill: c.t.paper,
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
            },
            esc(String(i + 1)),
          ),
      ),
    );
  });
}

function drawIssueLegend(c: Ctx, issues: Issue[], x: number, y: number, w: number, h: number): void {
  c.out.push(
    tag('rect', {
      x,
      y,
      width: w,
      height: h,
      fill: c.t.sheet,
      'fill-opacity': 0.65,
      stroke: c.t.frame,
      'stroke-width': STROKE.frame,
    }),
  );
  text(c, x + 12, y + 15, 'ANALYSIS', {
    size: FONT_SIZE.block,
    anchor: 'start',
    weight: 700,
    spacing: 1.2,
    fill: c.t.textMuted,
  });
  /*
   * WRAP, DO NOT OVERRUN. An analyzer message is a full sentence — the
   * bed-access one runs to about 190 characters — and written as a single line
   * it ran straight off the right edge of its own box and off the sheet, which
   * on a drawing that is otherwise dimensioned to 1/16" looked like a bug and
   * was one. Two lines per issue is the budget: enough for every message the
   * analyzer currently produces, and beyond that the reader is better served by
   * the full report in the brief than by a wall of 9.8 pt text on a plan.
   *
   * The character estimate is deliberate rather than measured: SVG gives no text
   * metrics without a layout engine, and 0.5 em per character is the standard
   * approximation for a humanist sans at this size. It errs SHORT, which is the
   * safe direction — a slightly early break costs nothing and an overrun costs
   * the sheet.
   */
  const inset = 29;
  const avail = Math.max(80, w - inset - 12);
  const perLine = Math.max(24, Math.floor(avail / (FONT_SIZE.legend * 0.5)));
  const MAX_LINES = 2;

  const wrap = (s: string): string[] => {
    const words = s.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (next.length <= perLine) {
        cur = next;
        continue;
      }
      if (cur) lines.push(cur);
      cur = word;
      if (lines.length === MAX_LINES) break;
    }
    if (cur && lines.length < MAX_LINES) lines.push(cur);
    // Ellipsis only when something was genuinely dropped.
    const kept = lines.join(' ').length;
    if (kept < s.replace(/\s+/g, ' ').length && lines.length) {
      const last = lines[lines.length - 1]!;
      lines[lines.length - 1] = `${last.slice(0, Math.max(0, perLine - 2))}…`;
    }
    return lines;
  };

  // Row pitch has to follow the tallest entry, or two-line issues collide.
  const LINE_H = 12;
  const wrapped = issues.map((iss) => wrap(`${iss.code}  ${iss.message}`));
  let ly = y + 32;
  let shownCount = 0;
  for (let i = 0; i < issues.length; i++) {
    const lines = wrapped[i]!;
    // Stop before running out of box rather than drawing over its border.
    if (ly + (lines.length - 1) * LINE_H > y + h - 16) break;
    const iss = issues[i]!;
    const col = iss.severity === 'error' ? c.t.issueError : c.t.issueWarn;
    c.out.push(tag('circle', { cx: x + 17, cy: ly, r: 6.5, fill: col }));
    c.out.push(
      tag(
        'text',
        {
          x: x + 17,
          y: ly,
          'font-family': FONT,
          'font-size': 8,
          'font-weight': 700,
          fill: c.t.paper,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        },
        esc(String(i + 1)),
      ),
    );
    lines.forEach((line, j) => {
      text(c, x + inset, ly + j * LINE_H, line, {
        size: FONT_SIZE.legend,
        anchor: 'start',
        fill: j === 0 ? c.t.text : c.t.textMuted,
      });
    });
    ly += lines.length * LINE_H + 4;
    shownCount++;
  }
  if (issues.length > shownCount) {
    // Clamp inside the border: the pointer is the one line that must never be
    // the thing that overruns the box it is apologising for.
    text(c, x + inset, Math.min(ly, y + h - 6), `+${issues.length - shownCount} more — see the analyzer report`, {
      size: FONT_SIZE.legend,
      anchor: 'start',
      fill: c.t.textMuted,
    });
  }
}

// ================================================================ dimensions

/**
 * A horizontal dimension chain. `stations` are px x-positions in order;
 * `labels[i]` annotates the run between station i and i+1.
 * `fromY` is the edge of the thing being dimensioned (witness lines start there).
 */
function chainH(c: Ctx, stations: number[], labels: string[], yLine: number, fromY: number): void {
  if (stations.length < 2) return;
  const dirUp = yLine < fromY ? -1 : 1;
  const g: string[] = [];
  g.push(
    tag('line', {
      x1: stations[0],
      y1: yLine,
      x2: stations[stations.length - 1],
      y2: yLine,
      stroke: c.t.dimLine,
      'stroke-width': STROKE.dim,
    }),
  );
  for (const x of stations) {
    // Witness line: starts 3 px clear of the object, ends 6 px past the chain.
    g.push(
      tag('line', {
        x1: x,
        y1: fromY + dirUp * 3,
        x2: x,
        y2: yLine + dirUp * 6,
        stroke: c.t.dimLine,
        'stroke-width': STROKE.witness,
        'stroke-opacity': 0.7,
      }),
    );
    // Architectural tick: a 45-degree slash through the chain.
    g.push(
      tag('line', {
        x1: x - TICK,
        y1: yLine + TICK,
        x2: x + TICK,
        y2: yLine - TICK,
        stroke: c.t.dimLine,
        'stroke-width': STROKE.dimTick,
      }),
    );
  }
  c.out.push(tag('g', { class: 'p2d-dim' }, g.join('')));
  let stagger = 0;
  for (let i = 0; i < labels.length && i < stations.length - 1; i++) {
    const mid = (stations[i] + stations[i + 1]) / 2;
    const room = Math.abs(stations[i + 1] - stations[i]);
    const size = textWidth(labels[i], FONT_SIZE.dim) <= room - 4 ? FONT_SIZE.dim : 7.4;
    // A run too narrow for its own text gets pushed off the chain and staggered,
    // exactly like a hand-drafted chain of tight window piers.
    const tight = textWidth(labels[i], size) > room - 4;
    const off = tight ? (stagger++ % 2 === 0 ? 16 : 26) : 7;
    text(c, mid, yLine - off, labels[i], {
      size,
      fill: c.t.dimLine,
      font: FONT_MONO,
      anchor: 'middle',
      halo: tight ? 2.6 : false,
    });
  }
}

/** Vertical twin of chainH. Text is rotated -90 so it reads bottom-up. */
function chainV(c: Ctx, stations: number[], labels: string[], xLine: number, fromX: number): void {
  if (stations.length < 2) return;
  const dirLeft = xLine < fromX ? -1 : 1;
  const g: string[] = [];
  g.push(
    tag('line', {
      x1: xLine,
      y1: stations[0],
      x2: xLine,
      y2: stations[stations.length - 1],
      stroke: c.t.dimLine,
      'stroke-width': STROKE.dim,
    }),
  );
  for (const y of stations) {
    g.push(
      tag('line', {
        x1: fromX + dirLeft * 3,
        y1: y,
        x2: xLine + dirLeft * 6,
        y2: y,
        stroke: c.t.dimLine,
        'stroke-width': STROKE.witness,
        'stroke-opacity': 0.7,
      }),
    );
    g.push(
      tag('line', {
        x1: xLine - TICK,
        y1: y + TICK,
        x2: xLine + TICK,
        y2: y - TICK,
        stroke: c.t.dimLine,
        'stroke-width': STROKE.dimTick,
      }),
    );
  }
  c.out.push(tag('g', { class: 'p2d-dim' }, g.join('')));
  let stagger = 0;
  for (let i = 0; i < labels.length && i < stations.length - 1; i++) {
    const mid = (stations[i] + stations[i + 1]) / 2;
    const room = Math.abs(stations[i + 1] - stations[i]);
    const size = textWidth(labels[i], FONT_SIZE.dim) <= room - 4 ? FONT_SIZE.dim : 7.4;
    const tight = textWidth(labels[i], size) > room - 4;
    const off = tight ? (stagger++ % 2 === 0 ? 16 : 26) : 7;
    text(c, xLine - off, mid, labels[i], {
      size,
      fill: c.t.dimLine,
      font: FONT_MONO,
      anchor: 'middle',
      rotate: -90,
      halo: tight ? 2.6 : false,
    });
  }
}

/**
 * A DIMENSION CHAIN MUST CLOSE.
 *
 * Round nine runs of the west wall to the nearest inch independently and they
 * add up to 19'-9": 3'-3" + 3'-6" + 4" + 2'-9" + 1'-4" + 2'-8" + 4" + 2'-9" +
 * 2'-10". The overall printed beside them is 19'-10". Both numbers are honestly
 * rounded from the same 19.80 ft, and the drawing still contradicts itself —
 * which on a real sheet is the defect a builder phones you about, because he
 * cannot set out nine dimensions that do not equal the tenth.
 *
 * So: round every run, then hand the leftover inches back, one at a time, to the
 * runs that lost the most in rounding (largest remainder — the same method used
 * to apportion seats). Every label stays within 1/2" of its true length, and the
 * chain sums EXACTLY to the overall dimension printed next to it.
 *
 * `total` is the number the chain must add up to, measured the same way the
 * overall is (so the two agree by construction, not by luck).
 */
function closedChainLabels(runs: number[], total: number): string[] {
  const INCH = 1 / 12;
  const target = Math.round(total * 12);
  const exact = runs.map((r) => r * 12);
  const whole = exact.map((v) => Math.floor(v));
  let short = target - whole.reduce((a, b) => a + b, 0);
  // Hand the remaining inches out largest-remainder first; ties go to the longer
  // run, where an inch is proportionally least visible.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v), len: v }))
    .sort((p, q) => q.frac - p.frac || q.len - p.len);
  for (let k = 0; short > 0 && k < order.length; k++, short--) whole[order[k].i] += 1;
  // Pathological case (a chain whose runs cannot reach the total): give up on
  // closing rather than printing a negative dimension.
  for (let k = order.length - 1; short < 0 && k >= 0; k--, short++) {
    if (whole[order[k].i] > 0) whole[order[k].i] -= 1;
  }
  return whole.map((inches) => formatFtIn(inches * INCH));
}

/**
 * Overall width + depth chains outside the footprint, plus a chain along the
 * west wall dimensioning every window and every pier between them — the chain a
 * builder actually needs to set out the openings.
 */
function drawDimensions(c: Ctx, plan: FloorPlan, frames: Map<string, WallFrame>): void {
  const left = c.px(c.b.min[0]);
  const right = c.px(c.b.max[0]);
  const top = c.py(c.b.min[1]);
  const bottom = c.py(c.b.max[1]);

  // Overall width, above the plan.
  chainH(c, [left, right], [formatFtIn(c.b.w)], top - DIM_OUT - DIM_STEP, top);
  // Overall depth, to the left of the plan, outside the opening chain.
  chainV(c, [top, bottom], [formatFtIn(c.b.h)], left - DIM_OUT - DIM_STEP, left);

  // The west wall: the one running vertically at the minimum x with windows in it.
  const westId = plan.walls
    .filter((w) => w.kind === 'exterior')
    .filter((w) => Math.abs(w.start[0] - w.end[0]) < 0.05)
    .filter((w) => Math.min(w.start[0], w.end[0]) <= c.b.min[0] + 0.05)
    .map((w) => w.id)
    .find((id) => plan.openings.some((o) => o.wall === id && o.kind === 'window'));
  if (!westId) return;
  const fr = frames.get(westId);
  if (!fr) return;

  const wins = plan.openings
    .filter((o) => o.wall === westId && o.kind === 'window')
    .sort((a, b) => a.offset - b.offset);

  // Stations along the wall: both ends plus both jambs of every window.
  const alongs = [0];
  for (const o of wins) {
    alongs.push(o.offset, o.offset + o.width);
  }
  alongs.push(fr.length);
  // Convert to px y, then sort top-to-bottom (this wall runs south -> north, so
  // increasing `along` means decreasing y).
  const rows = alongs
    .map((a) => ({ a, y: c.py(fr.at(a, fr.outerN)[1]) }))
    .sort((p, q) => p.y - q.y);
  const stations = rows.map((r) => r.y);
  const runs: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    runs.push(Math.abs(rows[i + 1].a - rows[i].a));
  }
  // Closed against c.b.h — the SAME quantity the overall depth chain prints, so
  // the two chains cannot disagree on the sheet. (This wall runs the full depth
  // of the footprint; if it ever did not, it closes on its own length instead.)
  const chainTotal = Math.abs(fr.length - c.b.h) < 0.02 ? c.b.h : fr.length;
  chainV(c, stations, closedChainLabels(runs, chainTotal), left - DIM_OUT, left);
}

// =============================================================== title block

/**
 * The numbered key — the drawing's last resort for a label that cannot be
 * lettered in place, and the only reason a plan is allowed to carry a bare number
 * on a shape. It grows the title block downward rather than floating anywhere on
 * the sheet, because a key belongs with the drawing's other metadata.
 */
const KEY_ROW_H = 13;
const KEY_HEAD_H = 20;
const KEY_COL_MIN = 150;

interface KeyLayout {
  height: number;
  cols: number;
  colW: number;
  rows: number;
}

function keyLayout(keys: KeyEntry[], w: number): KeyLayout {
  if (keys.length === 0) return { height: 0, cols: 0, colW: 0, rows: 0 };
  const avail = w - 28;
  let widest = 0;
  for (const k of keys) widest = Math.max(widest, textWidth(k.text, FONT_SIZE.key));
  const colW = Math.max(KEY_COL_MIN, Math.min(avail, widest + 30));
  const cols = Math.max(1, Math.floor(avail / colW));
  const rows = Math.ceil(keys.length / cols);
  return { height: KEY_HEAD_H + rows * KEY_ROW_H + 8, cols, colW, rows };
}

function drawKeyBlock(
  c: Ctx,
  keys: KeyEntry[],
  x: number,
  y: number,
  w: number,
  lay: KeyLayout,
): void {
  c.out.push(
    tag('line', {
      x1: x,
      y1: y,
      x2: x + w,
      y2: y,
      stroke: c.t.frame,
      'stroke-width': STROKE.frame,
      'stroke-opacity': 0.7,
    }),
  );
  text(c, x + 14, y + 12, 'KEY — NOT LETTERED IN PLACE', {
    size: FONT_SIZE.tiny,
    anchor: 'start',
    weight: 700,
    spacing: 1.3,
    fill: c.t.textMuted,
  });
  keys.forEach((k, i) => {
    const col = Math.floor(i / lay.rows);
    const row = i % lay.rows;
    const kx = x + 14 + col * lay.colW;
    const ky = y + KEY_HEAD_H + 6 + row * KEY_ROW_H;
    c.out.push(
      tag('circle', {
        cx: kx + 6,
        cy: ky,
        r: 6,
        fill: 'none',
        stroke: c.t.text,
        'stroke-width': STROKE.keyTag,
      }),
    );
    text(c, kx + 6, ky, String(k.n), {
      size: 7,
      weight: 700,
      fill: c.t.text,
      font: FONT_MONO,
    });
    text(c, kx + 17, ky, k.text, {
      size: FONT_SIZE.key,
      anchor: 'start',
      fill: c.t.text,
    });
  });
}

function northArrow(c: Ctx, cx: number, cy: number): void {
  // North is UP on the page: the data model's +y is plan SOUTH.
  const g: string[] = [];
  const tip = cy - 17;
  const base = cy + 11;
  const mid = cy + 4;
  g.push(
    tag('path', {
      d: dOf([
        [cx, tip],
        [cx - 8, base],
        [cx, mid],
      ]),
      fill: c.t.text,
      stroke: c.t.text,
      'stroke-width': STROKE.hairline,
    }),
  );
  g.push(
    tag('path', {
      d: dOf([
        [cx, tip],
        [cx + 8, base],
        [cx, mid],
      ]),
      fill: 'none',
      stroke: c.t.text,
      'stroke-width': STROKE.frame,
    }),
  );
  c.out.push(tag('g', { class: 'p2d-north' }, g.join('')));
  text(c, cx, cy + 24, 'N', { size: 11, weight: 700, spacing: 1, fill: c.t.text });
}

/** Graphic scale bar in feet, alternating 1 ft cells then one solid 5 ft block. */
function scaleBar(c: Ctx, x: number, y: number, maxW: number): void {
  const barFt = 10 * c.s <= maxW ? 10 : 5 * c.s <= maxW ? 5 : 2;
  const half = barFt / 2;
  const h = 8;
  const g: string[] = [];
  // First half: alternating cells, one per foot (or per half-foot if tiny).
  const cells = Math.max(1, Math.round(half));
  for (let i = 0; i < cells; i++) {
    g.push(
      tag('rect', {
        x: x + (i * half * c.s) / cells,
        y,
        width: (half * c.s) / cells,
        height: h,
        fill: i % 2 === 0 ? c.t.text : c.t.paper,
        stroke: c.t.text,
        'stroke-width': STROKE.hairline,
      }),
    );
  }
  // Second half: one solid block, so the eye reads 5 ft units instantly.
  g.push(
    tag('rect', {
      x: x + half * c.s,
      y,
      width: half * c.s,
      height: h,
      fill: c.t.text,
      stroke: c.t.text,
      'stroke-width': STROKE.hairline,
    }),
  );
  c.out.push(tag('g', { class: 'p2d-scalebar' }, g.join('')));
  for (const v of [0, half, barFt]) {
    const lx = x + v * c.s;
    c.out.push(
      tag('line', {
        x1: lx,
        y1: y + h,
        x2: lx,
        y2: y + h + 4,
        stroke: c.t.textMuted,
        'stroke-width': STROKE.hairline,
      }),
    );
    text(c, lx, y + h + 11, String(v), {
      size: FONT_SIZE.tiny,
      fill: c.t.textMuted,
      font: FONT_MONO,
    });
  }
  text(c, x + barFt * c.s + 26, y + h / 2, 'FEET', {
    size: FONT_SIZE.tiny,
    fill: c.t.textMuted,
    spacing: 1.2,
  });
}

function drawTitleBlock(
  c: Ctx,
  plan: FloorPlan,
  layout: Layout | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  subtitle: string,
  itemCount: number,
  keys: KeyEntry[],
  keyLay: KeyLayout,
): void {
  const NORTH_W = 82;
  const STAT_W = Math.min(190, Math.max(140, w * 0.24));
  c.out.push(
    tag('rect', {
      x,
      y,
      width: w,
      height: h + keyLay.height,
      fill: 'none',
      stroke: c.t.frame,
      'stroke-width': STROKE.frame,
    }),
  );
  const rowY = y + 58;
  const northX = x + w - NORTH_W;
  const statX = northX - STAT_W;
  for (const lx of [northX, statX]) {
    c.out.push(
      tag('line', {
        x1: lx,
        y1: y,
        x2: lx,
        y2: y + h,
        stroke: c.t.frame,
        'stroke-width': STROKE.frame,
      }),
    );
  }
  c.out.push(
    tag('line', {
      x1: x,
      y1: rowY,
      x2: statX,
      y2: rowY,
      stroke: c.t.frame,
      'stroke-width': STROKE.frame,
      'stroke-opacity': 0.7,
    }),
  );

  // The title cell is only as wide as the sheet allows, and at small scales that
  // is narrower than a layout description. Truncate to the cell rather than let
  // the text run through the vertical rule and under the AREA figure.
  const cellW = statX - x - 26;
  const ellipsize = (s: string, size: number): string => {
    if (textWidth(s, size) <= cellW) return s;
    let cut = s;
    while (cut.length > 1 && textWidth(`${cut}…`, size) > cellW) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  };
  text(c, x + 14, y + 22, ellipsize(title, FONT_SIZE.title), {
    size: FONT_SIZE.title,
    anchor: 'start',
    weight: 700,
    fill: c.t.text,
  });
  text(c, x + 14, y + 41, ellipsize(subtitle, FONT_SIZE.subtitle), {
    size: FONT_SIZE.subtitle,
    anchor: 'start',
    fill: c.t.textMuted,
  });

  // Lower-left row: the graphic scale.
  text(c, x + 14, rowY + 12, 'GRAPHIC SCALE', {
    size: FONT_SIZE.tiny,
    anchor: 'start',
    fill: c.t.textMuted,
    spacing: 1.3,
  });
  scaleBar(c, x + 14, rowY + 20, statX - x - 120);
  text(c, statX - 12, rowY + 26, `${r2(c.s)} px = 1'-0"`, {
    size: FONT_SIZE.tiny,
    anchor: 'end',
    fill: c.t.textMuted,
    font: FONT_MONO,
  });

  // Stats cell: the area is the whole point of a 508 sq ft studio.
  const stated = plan.meta.statedAreaSqft;
  text(c, statX + 12, y + 17, 'AREA', {
    size: FONT_SIZE.tiny,
    anchor: 'start',
    fill: c.t.textMuted,
    spacing: 1.3,
  });
  text(c, statX + 12, y + 34, stated ? `${stated} sq ft` : formatArea(plan.meta.footprintAreaSqft), {
    size: 15,
    anchor: 'start',
    weight: 700,
    fill: c.t.text,
    font: FONT_MONO,
  });
  text(c, statX + 12, y + 50, `${formatArea(plan.meta.interiorAreaSqft)} interior`, {
    size: FONT_SIZE.tiny,
    anchor: 'start',
    fill: c.t.textMuted,
  });
  text(
    c,
    statX + 12,
    y + 70,
    `${plan.walls.length} walls · ${plan.openings.length} openings · ${plan.fixtures.length} fixtures`,
    { size: FONT_SIZE.tiny, anchor: 'start', fill: c.t.textMuted },
  );
  text(c, statX + 12, y + 84, layout ? `${itemCount} placed items` : 'shell only — no layout', {
    size: FONT_SIZE.tiny,
    anchor: 'start',
    fill: c.t.textMuted,
  });

  northArrow(c, northX + NORTH_W / 2, y + h / 2 - 6);

  if (keys.length) drawKeyBlock(c, keys, x, y + h, w, keyLay);
}

// ================================================================ entry point

export const RENDER2D_DEFAULTS: Required<
  Pick<
    Render2DOptions,
    | 'scale'
    | 'margin'
    | 'showGrid'
    | 'showDimensions'
    | 'showFixtures'
    | 'showFurniture'
    | 'showLabels'
    | 'showZones'
    | 'showIssues'
    | 'showClearances'
    | 'showDoorSwings'
    | 'theme'
  >
> = {
  scale: DEF_SCALE,
  margin: DEF_MARGIN,
  showGrid: true,
  showDimensions: true,
  showFixtures: true,
  showFurniture: true,
  showLabels: true,
  showZones: true,
  // Off by default: both are analysis overlays, not part of the drawing.
  showIssues: false,
  showClearances: false,
  showDoorSwings: true,
  theme: 'light',
};

export function renderPlanSVG(
  plan: FloorPlan,
  layout?: Layout,
  opts: Render2DOptions = {},
): PlanSVG {
  const t = THEMES[opts.theme ?? 'light'] ?? THEMES.light;
  const s = opts.scale ?? DEF_SCALE;
  const margin = opts.margin ?? DEF_MARGIN;
  const on = (v: boolean | undefined, dflt: boolean): boolean => (v === undefined ? dflt : v);
  const show = {
    grid: on(opts.showGrid, true),
    dims: on(opts.showDimensions, true),
    fixtures: on(opts.showFixtures, true),
    furniture: on(opts.showFurniture, true),
    labels: on(opts.showLabels, true),
    zones: on(opts.showZones, true),
    swings: on(opts.showDoorSwings, true),
    issues: on(opts.showIssues, false),
    clearances: on(opts.showClearances, false),
  };
  const issues = show.issues ? (opts.issues ?? []) : [];
  const selected = new Set(opts.selected ?? []);

  const b = polygonBounds(plan.footprint);

  // ---- sheet layout. Dimension chains live OUTSIDE the footprint, so they are
  // what sets the left/top padding; the title block sets the bottom.
  const dimPadTop = show.dims ? DIM_OUT + DIM_STEP : 0;
  const dimPadLeft = show.dims ? DIM_OUT + DIM_STEP * 2 : 0;
  const padTop = margin + dimPadTop;
  const padLeft = margin + dimPadLeft;
  let padRight = margin;
  /*
   * Analyzer messages are full sentences and drawIssueLegend now wraps each one
   * onto up to TWO lines at a 12 px pitch, plus a 4 px gap between issues, plus
   * one line for the "+N more" pointer. Sizing this box off a single 15 px row
   * per issue is what made the legend overrun its own border.
   */
  const legendRows = Math.min(issues.length, 8);
  const legendH = issues.length ? 30 + legendRows * (2 * 12 + 4) + 12 + 8 : 0;

  const drawW = b.w * s;
  const drawH = b.h * s;
  // Rounded to 2 dp so the returned size is EXACTLY the size in the viewBox —
  // scripts/render.ts sizes its screenshot viewport from these numbers and a
  // half-pixel disagreement shows up as a resampled, blurry PNG.
  let width = round2(padLeft + drawW + padRight);
  if (width < MIN_SHEET_W) {
    padRight += MIN_SHEET_W - width;
    width = MIN_SHEET_W;
  }
  const legendY = padTop + drawH + TITLE_GAP;
  const titleY = legendY + (legendH ? legendH + 14 : 0);
  // NOTE: the sheet HEIGHT cannot be settled yet. If a label has to be suppressed
  // it goes into the numbered key, and the key grows the title block — so the
  // height is computed after the annotation pass and the paper is unshifted in
  // front of everything at the end. See sheetMarkup.

  const c: Ctx = {
    t,
    s,
    uid: uidFor(`${plan.id}|${layout?.id ?? '-'}|${t.name}|${s}`),
    px: (x: number) => padLeft + (x - b.min[0]) * s,
    py: (y: number) => padTop + (y - b.min[1]) * s,
    f: (ft: number) => ft * s,
    b,
    mid: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2],
    out: [],
  };

  // ---- defs: the clearance hatch and the footprint clip for the grid.
  c.out.push(
    tag(
      'defs',
      {},
      tag(
        'pattern',
        {
          id: `${c.uid}-hatch`,
          width: 6,
          height: 6,
          patternUnits: 'userSpaceOnUse',
          patternTransform: 'rotate(45)',
        },
        tag('rect', { x: 0, y: 0, width: 6, height: 6, fill: t.clearance, 'fill-opacity': 0.06 }) +
          tag('line', {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 6,
            stroke: t.clearance,
            'stroke-width': 1,
            'stroke-opacity': 0.4,
          }),
      ) +
        tag('clipPath', { id: `${c.uid}-fp` }, tag('path', { d: polyD(c, plan.footprint) })) +
        // The exterior wall ring: footprint MINUS interior, as one even-odd path.
        // Used to trim the corner overruns in drawWalls.
        tag(
          'clipPath',
          { id: `${c.uid}-band` },
          tag('path', {
            d: `${polyD(c, plan.footprint)} ${polyD(c, plan.interior)}`,
            'clip-rule': 'evenodd',
          }),
        ),
    ),
  );
  c.out.push(
    tag(
      'style',
      {},
      `.p2d-item{cursor:pointer}` +
        `.p2d-item.is-selected .p2d-body{stroke:${t.accent};stroke-width:${STROKE.selected}}` +
        `.p2d-item.is-selected .p2d-halo{stroke-opacity:.75}` +
        `.p2d-fixture{cursor:default}` +
        // Labels are emitted OUTSIDE the group of the thing they name (they have
        // to be, so they paint over every symbol), so a pointer landing on a
        // label would otherwise find no [data-item-id] to walk up to and would
        // read as a click on empty paper.
        `.p2d-label{pointer-events:none}`,
    ),
  );

  // Resolved up front (it is pure) because the zone labels need to know what is
  // sitting on the floor before they choose a spot.
  const items = show.furniture ? resolveItems(layout) : [];

  // ---- 1. floor + grid (the paper goes on last, see above)
  drawFloor(c, plan);
  if (show.grid) drawGrid(c, plan);

  // Boxes that later annotation must not land on. Zone names and clearance notes
  // are painted BEFORE the labels, so the label placer has to be told about them
  // or it will letter straight over the top of them.
  const reserved: PxRect[] = [];

  // ---- 2. zone tints
  if (show.zones) reserved.push(...drawZones(c, plan, items));

  // ---- 3-5. the building fabric
  const frames = new Map<string, WallFrame>();
  for (const w of plan.walls) frames.set(w.id, wallFrame(w));
  const glazing = glazingLayout(plan, frames);
  drawWalls(c, plan, frames);
  for (const o of plan.openings) {
    const fr = frames.get(o.wall);
    if (!fr) continue;
    if (o.kind === 'window') {
      // The SILL picks the convention — punched opening vs. full-height glazed
      // assembly. See FULL_HEIGHT_SILL.
      const g = glazing.get(o.id);
      if (g) drawGlazedAssembly(c, o, fr, g);
      else drawPunchedWindow(c, o, fr);
    } else if (o.kind === 'door') {
      drawDoor(c, plan, o, fr, show.swings);
    } else {
      // 'passage': normally the poché break IS the drawing — but a closet passage
      // is a bifold pair whose leaves project into the room, and those have to be
      // on the drawing. See passageBifoldFold.
      const fold = passageBifoldFold(plan, o, fr);
      if (fold !== null) drawBifold(c, o, fr, fold);
    }
  }

  // ---- 6-8. contents
  if (show.fixtures) drawFixtures(c, plan);
  if (show.clearances) reserved.push(...drawClearances(c, plan, items));
  if (show.furniture) drawFurniture(c, items, selected);

  // ---- 9. annotation
  const keys = show.labels ? drawLabels(c, items, plan, show.fixtures, reserved) : [];

  // ---- 10. issues
  if (issues.length) {
    drawIssues(c, issues);
    drawIssueLegend(c, issues, padLeft, legendY, Math.max(320, drawW), legendH - 8);
  }

  // ---- 11. dimensions
  if (show.dims) drawDimensions(c, plan, frames);

  // ---- 12. title block, now that the numbered key is known.
  const frameInset = 14;
  const titleW = width - (frameInset + 12) * 2;
  const keyLay = keyLayout(keys, titleW);
  const height = round2(titleY + TITLE_H + keyLay.height + Math.round(margin * 0.5));
  drawTitleBlock(
    c,
    plan,
    layout,
    frameInset + 12,
    titleY,
    titleW,
    TITLE_H,
    opts.title ?? layout?.name ?? plan.name,
    opts.subtitle ??
      layout?.description ??
      `${plan.name}${plan.meta.accuracy ? ` — ${plan.meta.accuracy}` : ''}`,
    items.length,
    keys,
    keyLay,
  );

  // The paper, in front of everything in document order so it paints first.
  c.out.unshift(sheetMarkup(c, width, height));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
    `viewBox="0 0 ${r2(width)} ${r2(height)}" width="${r2(width)}" height="${r2(height)}" ` +
    `data-plan-id="${esc(plan.id)}"${layout ? ` data-layout-id="${esc(layout.id)}"` : ''} ` +
    `shape-rendering="geometricPrecision" text-rendering="optimizeLegibility">` +
    c.out.join('') +
    `</svg>`;

  return { svg, width, height, scale: s };
}
