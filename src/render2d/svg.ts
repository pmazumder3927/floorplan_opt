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

function drawSheet(c: Ctx, w: number, h: number): void {
  c.out.push(tag('rect', { x: 0, y: 0, width: w, height: h, fill: c.t.sheet }));
  const inset = 14;
  c.out.push(
    tag('rect', {
      x: inset,
      y: inset,
      width: w - inset * 2,
      height: h - inset * 2,
      fill: c.t.paper,
      stroke: c.t.frame,
      'stroke-width': STROKE.frame,
    }),
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
 * clear of every fixture footprint and placed item.
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
  const free = (p: Vec2): boolean => {
    if (!pointInPolygon(p, zone.polygon)) return false;
    for (const f of plan.fixtures) {
      const r = f.footprint;
      if (p[0] > r.x - 0.3 && p[0] < r.x + r.w + 0.3 && p[1] > r.y - 0.3 && p[1] < r.y + r.h + 0.3) {
        return false;
      }
    }
    for (const it of items) if (obbContainsPoint(obbInflate(it.obb, 0.3), p)) return false;
    return true;
  };
  // Test the centre AND both ends of the text run: a point can be clear while
  // the name still runs into the toilet next to it.
  const clear = (p: Vec2): boolean =>
    free(p) && free([p[0] - labelW / 2, p[1]]) && free([p[0] + labelW / 2, p[1]]);
  const candidates: Vec2[] = [
    cen,
    [cen[0], cen[1] - zb.h * 0.24],
    [cen[0], cen[1] + zb.h * 0.24],
    [cen[0] - zb.w * 0.24, cen[1]],
    [cen[0] + zb.w * 0.24, cen[1]],
    [cen[0] - zb.w * 0.3, cen[1] - zb.h * 0.3],
    [cen[0] + zb.w * 0.3, cen[1] - zb.h * 0.3],
  ];
  for (const p of candidates) if (clear(p)) return p;
  return cen;
}

function drawZones(c: Ctx, plan: FloorPlan, items: PlacedResolved[]): void {
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
  for (const z of plan.zones) {
    const nameUp = z.name.toUpperCase();
    // px -> ft; the 1.4 per character is the letter-spacing used below.
    const labelW = (textWidth(nameUp, FONT_SIZE.zone) + nameUp.length * 1.4) / c.s;
    const cen = zoneLabelPoint(z, plan, items, labelW);
    const cx = c.px(cen[0]);
    const cy = c.py(cen[1]);
    text(c, cx, cy - 7, nameUp, {
      size: FONT_SIZE.zone,
      weight: 600,
      spacing: 1.4,
      fill: c.t.text,
      opacity: 0.62,
      halo: 3,
    });
    text(c, cx, cy + 7, formatArea(polygonArea(z.polygon)), {
      size: FONT_SIZE.zoneSub,
      fill: c.t.textMuted,
      font: FONT_MONO,
      halo: 3,
    });
  }
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

/**
 * Window symbol, the standard plan convention:
 *   - the two wall FACES carried across the opening (the frame),
 *   - a thin DOUBLE LINE mid-thickness for the glazing,
 *   - a SILL projecting past the outer face, wider than the opening.
 */
function drawWindow(c: Ctx, o: Opening, fr: WallFrame): void {
  const a = o.offset;
  const b = o.offset + o.width;
  const parts: string[] = [];

  // Glazing tint across the full thickness so the hole reads as filled with glass.
  parts.push(
    tag('path', {
      d: polyD(c, [fr.at(a, fr.n0), fr.at(b, fr.n0), fr.at(b, fr.n1), fr.at(a, fr.n1)]),
      fill: c.t.glass,
      'fill-opacity': 0.16,
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

function drawClearances(c: Ctx, plan: FloorPlan, items: PlacedResolved[]): void {
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
      text(c, c.px(cen[0]), c.py(cen[1]), formatShort(b.depth), {
        size: FONT_SIZE.tiny,
        fill: c.t.clearance,
        font: FONT_MONO,
        rotate: normRot(b.o.rot),
      });
    }
  }
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

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/**
 * Item labels. Two lines (name + size), placed at the OBB centre and rotated
 * with the item's long axis. If the block will not fit inside the shape it is
 * shrunk, then reduced to one line, and only then moved outside on a leader —
 * a label crossing the edge of its own shape is the fastest way to make a plan
 * look amateur, so that case is never emitted.
 */
function drawLabels(
  c: Ctx,
  items: PlacedResolved[],
  plan: FloorPlan,
  showFixtures: boolean,
): void {
  const taken: Box[] = [];

  const put = (
    cx: number,
    cy: number,
    lines: string[],
    size: number,
    rot: number,
    fills: string[],
    fonts: string[],
    halo: string,
  ): void => {
    const step = size * LINE_HEIGHT;
    // Stack the lines PERPENDICULAR to the baseline. Offsetting in screen y and
    // then rotating each line about its own anchor would run a rotated two-line
    // label straight through itself.
    const a = (rot * Math.PI) / 180;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    for (let i = 0; i < lines.length; i++) {
      const off = i * step - ((lines.length - 1) * step) / 2;
      text(c, cx + nx * off, cy + ny * off, lines[i], {
        size: i === 0 ? size : size * 0.86,
        fill: fills[i] ?? c.t.text,
        weight: i === 0 ? 600 : 400,
        font: fonts[i],
        rotate: rot,
        halo: true,
        haloColor: halo,
      });
    }
  };

  // Big pieces claim their own interior first; rugs go last because a label in
  // the middle of a rug is the least useful one on the drawing (and the rug is
  // under everything anyway), so it is the one that should end up on a leader.
  const order = [...items].sort((a, b) => {
    const ra = a.def.walkable ? 1 : 0;
    const rb = b.def.walkable ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return b.obb.w * b.obb.d - a.obb.w * a.obb.d;
  });

  for (const { item, def, obb } of order) {
    const name = item.label ?? def.name;
    const dims = `${formatShort(obb.w)} x ${formatShort(obb.d)}`;
    // Inside labels are read against the item's own fill, not the sheet.
    const { ink, halo } = labelInk(item.color ?? def.color ?? c.t.fixtureFill, c.t);
    // Long axis of the OBB, and the on-page angle of that axis.
    const alongW = obb.w >= obb.d;
    const longFt = alongW ? obb.w : obb.d;
    const shortFt = alongW ? obb.d : obb.w;
    // Turn the label along the long axis ONLY for long, thin pieces (a sofa, a
    // counter, a bookcase). Turning a near-square item's label — an 8x10 rug —
    // just looks like a mistake, so those keep the item's own orientation.
    const thin = shortFt > 0 && longFt / shortFt >= 1.8;
    const rot = thin ? normRot(alongW ? obb.rot : obb.rot + 90) : normRot(obb.rot);
    const availW = (thin ? longFt : obb.w) * c.s - 8;
    const availH = (thin ? shortFt : obb.d) * c.s - 6;
    const cx = c.px(obb.center[0]);
    const cy = c.py(obb.center[1]);

    // The label's own footprint, as a box around the centre. Rotation is folded
    // in by taking the larger of the two extents — cheap and never optimistic.
    const claim = (w: number, h: number): Box => {
      const half = Math.max(w, h) / 2;
      return { x0: cx - half, y0: cy - half, x1: cx + half, y1: cy + half };
    };
    let placed = false;
    for (const size of [FONT_SIZE.item, 9.6, 8.8, 8, 7.2, FONT_SIZE.itemMin]) {
      const w2 = Math.max(textWidth(name, size), textWidth(dims, size * 0.86));
      const h2 = size * LINE_HEIGHT * 2;
      if (w2 <= availW && h2 <= availH) {
        const box = claim(w2, h2);
        if (taken.some((t) => overlaps(t, box))) continue; // try smaller, then outside
        taken.push(box);
        put(cx, cy, [name, dims], size, rot, [ink, ink], [FONT, FONT_MONO], halo);
        placed = true;
        break;
      }
      // One line only — the name matters more than the size.
      const w1 = textWidth(name, size);
      if (w1 <= availW && size * LINE_HEIGHT <= availH) {
        const box = claim(w1, size);
        if (taken.some((t) => overlaps(t, box))) continue;
        taken.push(box);
        put(cx, cy, [name], size, rot, [ink], [FONT], halo);
        placed = true;
        break;
      }
    }
    if (placed) continue;

    // ---- outside, on a leader line.
    const size = 8.6;
    const w1 = textWidth(name, size);
    // First choice: away from the middle of the plan, so labels fan outward and
    // do not pile up in the centre. Second choice: back INWARD — for a piece
    // pushed against an outside wall (a floor lamp in a window bay) the outward
    // side is off the building, where the dimension chains live.
    let away = norm(sub(obb.center, c.mid));
    if (away[0] === 0 && away[1] === 0) away = [1, 0];
    const u = rotate([1, 0], obb.rot);
    const v = rotate([0, 1], obb.rot);

    let best: { dir: Vec2; tx: number; ty: number; ax: number; ay: number; box: Box } | null = null;
    let bestCost = Infinity;
    for (const dir of [away, vmul(away, -1)] as Vec2[]) {
      // Support distance of the OBB along `dir` (exact for a box).
      const reach =
        (Math.abs(dot(u, dir)) * obb.w) / 2 + (Math.abs(dot(v, dir)) * obb.d) / 2;
      const anchorFt = add(obb.center, vmul(dir, reach));
      const ax = c.px(anchorFt[0]);
      const ay = c.py(anchorFt[1]);
      const right = dir[0] >= 0;
      for (const [gi, gap] of [12, 22, 32, 44, 58].entries()) {
        const tx = ax + dir[0] * gap + (right ? 4 : -4);
        const ty = ay + dir[1] * gap;
        const box: Box = {
          x0: right ? tx : tx - w1,
          y0: ty - size,
          x1: right ? tx + w1 : tx,
          y1: ty + size,
        };
        // Cost: leaving the footprint is the worst outcome (that is where the
        // dimension chains are), then collisions, then distance from the item.
        const outside =
          box.x0 < c.px(c.b.min[0]) ||
          box.x1 > c.px(c.b.max[0]) ||
          box.y0 < c.py(c.b.min[1]) ||
          box.y1 > c.py(c.b.max[1]);
        const hits = taken.filter((t) => overlaps(t, box)).length;
        const cost = (outside ? 400 : 0) + hits * 60 + gi;
        if (cost < bestCost) {
          bestCost = cost;
          best = { dir, tx, ty, ax, ay, box };
        }
        if (cost === 0) break;
      }
      if (bestCost === 0) break;
    }
    const { tx, ty, ax, ay, box, dir } = best!;
    const right = dir[0] >= 0;
    taken.push(box);
    c.out.push(
      tag('path', {
        d: dOf(
          [
            [ax, ay],
            [tx + (right ? -3 : 3), ty],
          ],
          false,
        ),
        stroke: c.t.textMuted,
        'stroke-width': STROKE.leader,
        fill: 'none',
      }),
    );
    c.out.push(tag('circle', { cx: ax, cy: ay, r: 1.5, fill: c.t.textMuted }));
    text(c, tx, ty, name, {
      size,
      fill: c.t.text,
      weight: 600,
      anchor: right ? 'start' : 'end',
      halo: true,
    });
  }

  if (!showFixtures) return;
  // Fixture names, inside-only: a plan that does not say which box is the range
  // is not a plan. Parentheticals are dropped ("Range (30\")" -> "Range").
  for (const f of plan.fixtures) {
    if ((f.z ?? 0) >= 4) continue; // uppers: dashed and unlabelled, as drawn
    // Measure exactly what gets drawn: capitals plus the tracking are ~20% wider
    // than the mixed-case name, which is enough to run a label off its own box.
    const SPACING = 0.5;
    const shown = f.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().toUpperCase();
    const rect = f.footprint;
    const alongW = rect.w >= rect.h;
    const availW = (alongW ? rect.w : rect.h) * c.s - 8;
    const availH = (alongW ? rect.h : rect.w) * c.s - 6;
    const cx = c.px(rect.x + rect.w / 2);
    const cy = c.py(rect.y + rect.h / 2);
    for (const size of [FONT_SIZE.fixture, 7.6, 7]) {
      const w1 = textWidth(shown, size) + shown.length * SPACING;
      if (w1 <= availW && size * LINE_HEIGHT <= availH) {
        const box: Box = {
          x0: cx - w1 / 2,
          y0: cy - size / 2,
          x1: cx + w1 / 2,
          y1: cy + size / 2,
        };
        if (taken.some((t) => overlaps(t, box))) break;
        taken.push(box);
        text(c, cx, cy, shown, {
          size,
          fill: c.t.textMuted,
          spacing: SPACING,
          rotate: alongW ? 0 : -90,
          halo: true,
        });
        break;
      }
    }
  }
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
  const shown = issues.slice(0, 10);
  shown.forEach((iss, i) => {
    const ly = y + 32 + i * 15;
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
    text(c, x + 29, ly, `${iss.code}  ${iss.message}`, {
      size: FONT_SIZE.legend,
      anchor: 'start',
      fill: c.t.text,
    });
  });
  if (issues.length > shown.length) {
    text(c, x + 29, y + 32 + shown.length * 15, `+${issues.length - shown.length} more`, {
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
  const labels: string[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    labels.push(formatFtIn(Math.abs(rows[i + 1].a - rows[i].a)));
  }
  chainV(c, stations, labels, left - DIM_OUT, left);
}

// =============================================================== title block

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
): void {
  const NORTH_W = 82;
  const STAT_W = Math.min(190, Math.max(140, w * 0.24));
  c.out.push(
    tag('rect', {
      x,
      y,
      width: w,
      height: h,
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

  text(c, x + 14, y + 22, title, {
    size: FONT_SIZE.title,
    anchor: 'start',
    weight: 700,
    fill: c.t.text,
  });
  text(c, x + 14, y + 41, subtitle, {
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
  const legendH = issues.length ? 30 + Math.min(issues.length, 10) * 15 + 8 : 0;

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
  const height = round2(titleY + TITLE_H + Math.round(margin * 0.5));

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
        `.p2d-fixture{cursor:default}`,
    ),
  );

  // Resolved up front (it is pure) because the zone labels need to know what is
  // sitting on the floor before they choose a spot.
  const items = show.furniture ? resolveItems(layout) : [];

  // ---- 1. paper + floor + grid
  drawSheet(c, width, height);
  drawFloor(c, plan);
  if (show.grid) drawGrid(c, plan);

  // ---- 2. zone tints
  if (show.zones) drawZones(c, plan, items);

  // ---- 3-5. the building fabric
  const frames = new Map<string, WallFrame>();
  for (const w of plan.walls) frames.set(w.id, wallFrame(w));
  drawWalls(c, plan, frames);
  for (const o of plan.openings) {
    const fr = frames.get(o.wall);
    if (!fr) continue;
    if (o.kind === 'window') drawWindow(c, o, fr);
    else if (o.kind === 'door') drawDoor(c, plan, o, fr, show.swings);
    // 'passage': the poché break IS the drawing. Nothing else to add.
  }

  // ---- 6-8. contents
  if (show.fixtures) drawFixtures(c, plan);
  if (show.clearances) drawClearances(c, plan, items);
  if (show.furniture) drawFurniture(c, items, selected);

  // ---- 9. annotation
  if (show.labels) drawLabels(c, items, plan, show.fixtures);

  // ---- 10. issues
  if (issues.length) {
    drawIssues(c, issues);
    drawIssueLegend(c, issues, padLeft, legendY, Math.max(320, drawW), legendH - 8);
  }

  // ---- 11. dimensions
  if (show.dims) drawDimensions(c, plan, frames);

  // ---- 12. title block
  const frameInset = 14;
  drawTitleBlock(
    c,
    plan,
    layout,
    frameInset + 12,
    titleY,
    width - (frameInset + 12) * 2,
    TITLE_H,
    opts.title ?? layout?.name ?? plan.name,
    opts.subtitle ??
      layout?.description ??
      `${plan.name}${plan.meta.accuracy ? ` — ${plan.meta.accuracy}` : ''}`,
    items.length,
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
    `viewBox="0 0 ${r2(width)} ${r2(height)}" width="${r2(width)}" height="${r2(height)}" ` +
    `data-plan-id="${esc(plan.id)}"${layout ? ` data-layout-id="${esc(layout.id)}"` : ''} ` +
    `shape-rendering="geometricPrecision" text-rendering="optimizeLegibility">` +
    c.out.join('') +
    `</svg>`;

  return { svg, width, height, scale: s };
}
