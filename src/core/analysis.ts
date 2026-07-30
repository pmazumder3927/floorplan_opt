/**
 * analysis.ts — "would this layout actually work in real life?"
 *
 * Everything here is measured in DECIMAL FEET and every threshold traces back
 * either to `CLEARANCE` in units.ts (real-world minimums) or to a constant
 * defined below with a comment saying where the number came from.
 *
 * The analyzer is deliberately conservative about the source data: the plan was
 * traced from a listing graphic at ±0.3 ft, so tiny overlaps are treated as
 * trace noise rather than errors (see `AREA_EPS`).
 *
 * Geometry primitives all come from ./geometry so there is exactly one
 * implementation of SAT / clipping / grid raster in the project.
 */

import type {
  AnalysisResult,
  Fixture,
  FloorPlan,
  FurnitureDef,
  Issue,
  Layout,
  LayoutStats,
  Opening,
  PlacedItem,
  Severity,
  Vec2,
  Wall,
} from './types';
import type { Grid, OBB } from './geometry';
import {
  add,
  clearanceField,
  clearanceObb,
  clipPolygon,
  dist,
  doorSwingPolygon,
  dot,
  findPath,
  fixtureObb,
  gridAt,
  gridCellCenter,
  gridSet,
  buildGrid,
  itemObb,
  norm,
  obbArea,
  obbContainsPoint,
  obbCorners,
  obbOverlapArea,
  openingSegment,
  pathClearance,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  scale,
  sub,
  wallSolid,
} from './geometry';
import { catalog } from './catalog';
import { CLEARANCE, formatArea, formatFtIn, formatShort } from './units';

// ---------------------------------------------------------------- constants

/**
 * Overlaps smaller than this are ignored. The plan is traced at ±0.3 ft, and a
 * piece pushed flush against a wall will routinely clip it by a hair. 0.05 sq ft
 * is a 1" x 7" sliver — well below anything a human would notice.
 */
const AREA_EPS = 0.05;

/**
 * A fixture whose base sits higher than this is over your head, not on the
 * floor: it cannot be a circulation blocker. Kitchen UPPERS start at 4'-6".
 * 2'-0" is chosen because everything at or below it (a bench, a tub deck, a
 * counter base) is still something you trip over.
 */
const FIXTURE_OVERHEAD_Z = 2.0;

/** How far in front of a window a piece counts as "in front of it" (spec: 1 ft). */
const WINDOW_BAND = 1.0;

/** A wall-hugging piece further than this off the wall reads as a mistake (6"). */
const FLOATING_GAP = 0.5;

/** Free-floor fractions that feel wrong in a studio. */
const DENSITY_CRAMPED = 0.45;
const DENSITY_SPARSE = 0.8;

/** Warn once more than this fraction of a piece's front clearance is blocked. */
const CLEARANCE_BLOCKED_WARN = 0.15;

/**
 * A fixture's clear-floor box has to lose at least this much before it is worth
 * an error — a 6" x 12" corner clip of a 3'-deep appliance zone is not a real
 * problem, half a square foot is.
 */
const FIXTURE_CLEAR_EPS = 0.5;

/** Sampling pitch for rasterised area / blocked-fraction tests. 0.15 ft ≈ 1 3/4". */
const RASTER_CELL = 0.15;

/** Ray-march pitch when measuring a real clear depth next to a piece. */
const PROBE_STEP = 0.1;

/** Never measure clear floor further than this — beyond it the number is noise. */
const PROBE_MAX = 3.0;

/** Kinds that are supposed to live against a wall (used by the 'floating' check). */
const WALL_HUGGING = new Set(['bookcase', 'wardrobe', 'dresser', 'console', 'tv_stand']);

/** Kinds that people sit on and therefore face a TV from. */
const SEATING = new Set([
  'sofa',
  'sectional',
  'loveseat',
  'armchair',
  'bench',
  'chair',
  'sofa_bed',
  'bed',
  'ottoman',
]);

/** Kinds you sleep on — they need a side to get in from. */
const SLEEPING = new Set(['bed', 'sofa_bed', 'murphy_bed']);

/** Kinds that read as the anchor of a seating group for the rug check. */
const RUG_ANCHOR = new Set(['sofa', 'sectional', 'loveseat']);

/**
 * A SEAT and the SURFACE it is pulled up to are one group, and neither one is an
 * obstruction in the other's clear floor.
 *
 * Why this exists: `frontClearance` on a desk is the 30" you need to roll the
 * chair back and stand up — so the chair being there is the whole point, not a
 * blockage. Symmetrically, a dining chair's 36" is the room to push back into,
 * which the catalog measures from the seat, so the table it faces registered as
 * "100% of the clear floor is blocked". Before this pairing rule every correct
 * desk + task chair scored 43-52% blocked and every dining chair scored 99-100%,
 * which buried the real clearance findings (a bookcase into a walkway, a bench
 * jammed against a divider) under noise.
 *
 * The check still catches everything else: walls, appliances, a wardrobe parked
 * in front of a desk, a plant in the chair's pull-back. Only the seat/surface
 * pair is exempt from each other.
 */
const SEAT_KINDS = new Set([
  'chair',
  'bar_stool',
  'bench',
  'sofa',
  'sectional',
  'loveseat',
  'armchair',
  'sofa_bed',
  'ottoman',
]);
const SEAT_SURFACE_KINDS = new Set(['desk', 'dining_table', 'coffee_table', 'side_table']);

/**
 * A mattress this wide or wider sleeps two, so BOTH long sides have to be
 * reachable. A full is 54" wide, a twin is 38" — 53" splits them.
 */
const TWO_SLEEPER_WIDTH = 53 / 12;

/** How far from a rug a sofa can be and still count as part of that rug's group. */
const RUG_GROUP_RADIUS = 12.0;

// ------------------------------------------------------------ local helpers

type Side = 'front' | 'back' | 'left' | 'right';

/** One layout item resolved against the catalog, with its geometry precomputed. */
interface Entry {
  item: PlacedItem;
  def: FurnitureDef;
  obb: OBB;
  /** base above the floor */
  z0: number;
  /** top above the floor */
  z1: number;
  /** does it stand on the floor and stop you walking there? */
  onFloor: boolean;
}

/**
 * Everything solid, kept as OBBs so a "is this point blocked?" test is exact
 * instead of quantised to the pathfinding grid. Measuring a 2" gap behind a
 * bookcase needs better than the 0.25 ft grid.
 */
interface Solids {
  walls: OBB[];
  fixtures: { id: string; obb: OBB }[];
  items: { id: string; obb: OBB }[];
}

/**
 * The analyzer knows the layout's name/description but AnalysisResult (fixed by
 * types.ts) only carries the id, and formatReport is only ever handed the
 * result. We attach the display strings as extra structural properties: any
 * consumer typed as AnalysisResult is unaffected, and formatReport falls back
 * to the id when they are missing.
 */
interface RichResult extends AnalysisResult {
  name?: string;
  description?: string;
  zoneNames?: Record<string, string>;
  routes?: { label: string; width: number | null }[];
}

const neg = (v: Vec2): Vec2 => [-v[0], -v[1]];

/** Local +x axis of an OBB in world space. At rot 0 this is plan east. */
function axisX(o: OBB): Vec2 {
  return rotDir([1, 0], o.rot);
}

/** Local +y axis of an OBB in world space. At rot 0 this is plan south = FRONT. */
function axisY(o: OBB): Vec2 {
  return rotDir([0, 1], o.rot);
}

/**
 * Rotate a direction (no translation) by `deg` clockwise on the page.
 * Implemented locally rather than via geometry.rotate() so it is unambiguous
 * that no pivot point is involved.  R(90): +x -> +y (south), +y -> -x (west).
 */
function rotDir(v: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

/** Axis-aligned bounds of a point cloud. */
function bboxOf(pts: Vec2[]): { min: Vec2; max: Vec2 } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  return { min: [x0, y0], max: [x1, y1] };
}

/** Area of `poly` clipped by an OBB (the OBB is convex, so it is the clipper). */
function clipAreaWithObb(poly: Vec2[], o: OBB): number {
  const clipped = clipPolygon(poly, obbCorners(o));
  if (clipped.length < 3) return 0;
  return Math.abs(polygonArea(clipped));
}

/**
 * Overlap area between an arbitrary polygon (e.g. a door swing fan) and an OBB,
 * by rasterising. Deliberately not a polygon clip: a swing fan is a many-vertex
 * shape and rasterising only depends on pointInPolygon / obbContainsPoint,
 * which have no winding-order subtleties.
 */
function rasterOverlapArea(poly: Vec2[], o: OBB, cell = RASTER_CELL): number {
  const a = bboxOf(poly);
  const b = bboxOf(obbCorners(o));
  const min: Vec2 = [Math.max(a.min[0], b.min[0]), Math.max(a.min[1], b.min[1])];
  const max: Vec2 = [Math.min(a.max[0], b.max[0]), Math.min(a.max[1], b.max[1])];
  if (max[0] <= min[0] || max[1] <= min[1]) return 0;
  const nx = Math.max(1, Math.ceil((max[0] - min[0]) / cell));
  const ny = Math.max(1, Math.ceil((max[1] - min[1]) / cell));
  const dx = (max[0] - min[0]) / nx;
  const dy = (max[1] - min[1]) / ny;
  let hits = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const p: Vec2 = [min[0] + (i + 0.5) * dx, min[1] + (j + 0.5) * dy];
      if (obbContainsPoint(o, p) && pointInPolygon(p, poly)) hits++;
    }
  }
  return hits * dx * dy;
}

/** Distance from a point to a segment. */
function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return dist(p, a);
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + t * abx, a[1] + t * aby]);
}

/** Distance from a point to the boundary of a polygon. */
function distToPolygon(p: Vec2, poly: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = distToSegment(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < best) best = d;
  }
  return best;
}

/** Distance from a point to an OBB (0 if inside). */
function distToObb(o: OBB, p: Vec2): number {
  const d = sub(p, o.center);
  const lx = dot(d, axisX(o));
  const ly = dot(d, axisY(o));
  const ox = Math.max(0, Math.abs(lx) - o.w / 2);
  const oy = Math.max(0, Math.abs(ly) - o.d / 2);
  return Math.hypot(ox, oy);
}

/** Geometry of one face of an OBB: outward normal, in-face axis, half depth, face length. */
function faceGeom(o: OBB, side: Side): { out: Vec2; along: Vec2; half: number; span: number } {
  const ax = axisX(o);
  const ay = axisY(o);
  switch (side) {
    case 'front':
      return { out: ay, along: ax, half: o.d / 2, span: o.w };
    case 'back':
      return { out: neg(ay), along: ax, half: o.d / 2, span: o.w };
    case 'right':
      return { out: ax, along: ay, half: o.w / 2, span: o.d };
    case 'left':
      return { out: neg(ax), along: ay, half: o.w / 2, span: o.d };
  }
}

/** Compass word for a plan direction. +y is page DOWN, which is plan south. */
function compass(d: Vec2): string {
  if (Math.abs(d[0]) >= Math.abs(d[1])) return d[0] >= 0 ? 'east' : 'west';
  return d[1] >= 0 ? 'south' : 'north';
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// -------------------------------------------------------------- the blockers

/**
 * Every OBB that occupies floor.
 *
 * Wall solids are NOT included: buildGrid() already marks anything outside the
 * interior polygon (which is the inside face of the exterior walls) and the
 * partitions as unwalkable, so adding them here would double-count.
 */
export function blockersFor(plan: FloorPlan, layout?: Layout): OBB[] {
  const out: OBB[] = [];

  for (const f of plan.fixtures) {
    // Overhead millwork (kitchen UPPERS at z = 4'-6") does not block the floor.
    if ((f.z ?? 0) > FIXTURE_OVERHEAD_Z) continue;
    out.push(fixtureObb(f));
  }

  if (layout) {
    for (const item of layout.items) {
      // ignoreAnalysis is an explicit opt-out of collision + clearance work.
      if (item.ignoreAnalysis) continue;
      const def: FurnitureDef | undefined = catalog[item.def];
      if (!def) continue;
      // Rugs are walked on; art / a wall TV hangs above the floor.
      if (def.walkable || def.wallMounted) continue;
      out.push(itemObb(item, def));
    }
  }

  return out;
}

// ---------------------------------------------------------- solids + probing

function buildSolids(plan: FloorPlan, entries: Entry[]): Solids {
  return {
    walls: plan.walls.map((w) => wallSolid(w)),
    fixtures: plan.fixtures
      .filter((f) => (f.z ?? 0) <= FIXTURE_OVERHEAD_Z)
      .map((f) => ({ id: f.id, obb: fixtureObb(f) })),
    items: entries.filter((e) => e.onFloor).map((e) => ({ id: e.item.id, obb: e.obb })),
  };
}

/**
 * Is this point unusable floor? `exclude` skips one item id (usually "myself"),
 * or a set of ids when a whole group is exempt (see SEAT_KINDS).
 */
type Exclusion = string | ReadonlySet<string> | undefined;

function excluded(exclude: Exclusion, id: string): boolean {
  return typeof exclude === 'string' ? exclude === id : (exclude?.has(id) ?? false);
}

function isBlocked(plan: FloorPlan, s: Solids, p: Vec2, exclude?: Exclusion): boolean {
  if (!pointInPolygon(p, plan.interior)) return true;
  for (const w of s.walls) if (obbContainsPoint(w, p)) return true;
  for (const f of s.fixtures) if (obbContainsPoint(f.obb, p)) return true;
  for (const it of s.items) {
    if (excluded(exclude, it.id)) continue;
    if (obbContainsPoint(it.obb, p)) return true;
  }
  return false;
}

/** Fraction of an OBB region that is not usable floor, by rasterising it. */
function blockedFraction(plan: FloorPlan, s: Solids, box: OBB, exclude?: Exclusion): number {
  const nx = Math.max(1, Math.round(box.w / RASTER_CELL));
  const ny = Math.max(1, Math.round(box.d / RASTER_CELL));
  const ax = axisX(box);
  const ay = axisY(box);
  let blocked = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const lx = (-box.w / 2) + ((i + 0.5) * box.w) / nx;
      const ly = (-box.d / 2) + ((j + 0.5) * box.d) / ny;
      const p = add(box.center, add(scale(ax, lx), scale(ay, ly)));
      if (isBlocked(plan, s, p, exclude)) blocked++;
    }
  }
  return blocked / (nx * ny);
}

/**
 * Real clear depth off one face of a piece: march outward from several points
 * spread across the face. Samples span 10%..90% of the face rather than corner
 * to corner, because a neighbour that only just touches at a corner would
 * poison the reading.
 *
 * `reduce` picks what "the" depth means:
 *   'min'    — the worst spot. Right for "is anything behind this bookcase?".
 *   'median' — the depth along most of the face. Right for bed access, where a
 *              nightstand at the head is normal and does not stop you walking
 *              down the side.
 */
function clearDepth(
  plan: FloorPlan,
  s: Solids,
  o: OBB,
  side: Side,
  exclude: string,
  max = PROBE_MAX,
  samples = 3,
  reduce: 'min' | 'median' = 'min',
): number {
  const f = faceGeom(o, side);
  const got: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = samples === 1 ? 0 : -0.4 + (0.8 * i) / (samples - 1);
    const base = add(add(o.center, scale(f.out, f.half)), scale(f.along, t * f.span));
    let d = PROBE_STEP;
    for (; d <= max; d += PROBE_STEP) {
      if (isBlocked(plan, s, add(base, scale(f.out, d)), exclude)) break;
    }
    got.push(Math.min(d - PROBE_STEP, max));
  }
  if (reduce === 'min') return Math.min(...got);
  got.sort((a, b) => a - b);
  return got[Math.floor(got.length / 2)];
}

// ------------------------------------------------------------------ anchors

function wallOf(plan: FloorPlan, o: Opening): Wall | undefined {
  return plan.walls.find((w) => w.id === o.wall);
}

/**
 * Nearest cell of free floor to `p`, searched outwards ring by ring. Route
 * endpoints must be free cells for A* to run, and the natural anchor for a door
 * or an appliance is often a hair inside something.
 *
 * Uses gridCellCenter + gridAt rather than indexing Grid.data so it makes no
 * assumption about the row/column memory order.
 */
function nearestFree(g: Grid, p: Vec2, maxFt = 4): Vec2 | null {
  if (gridAt(g, p) === 1) return p;
  const col0 = Math.floor((p[0] - g.min[0]) / g.cell);
  const row0 = Math.floor((p[1] - g.min[1]) / g.cell);
  const rings = Math.max(1, Math.ceil(maxFt / g.cell));
  for (let r = 1; r <= rings; r++) {
    let best: Vec2 | null = null;
    let bestD = Infinity;
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        // only the shell of the ring
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
        const c = col0 + dc;
        const rw = row0 + dr;
        if (c < 0 || rw < 0 || c >= g.cols || rw >= g.rows) continue;
        const q = gridCellCenter(g, c, rw);
        if (gridAt(g, q) !== 1) continue;
        const d = dist(p, q);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * A standing spot on the usable side of an opening.
 *
 * The interior side is found by walking off the opening centre along the wall
 * normal until the point is inside plan.interior — that works whether the
 * wall's traced line is its outer face (exterior walls) or its centreline
 * (partitions). The +normal (right-hand) side is tried first because every
 * exterior wall in plan.ts declares interiorSide 'right', and for the bathroom
 * partition P2 it is the living-room side, which is the side you open the door
 * from.
 */
function openingAnchor(plan: FloorPlan, g: Grid, o: Opening, standoff: number): Vec2 | null {
  const seg = openingSegment(plan, o);
  for (const sign of [1, -1]) {
    const n = scale(seg.normal, sign);
    let entered = -1;
    for (let d = PROBE_STEP; d <= 2.5; d += PROBE_STEP) {
      if (pointInPolygon(add(seg.center, scale(n, d)), plan.interior)) {
        entered = d;
        break;
      }
    }
    if (entered < 0) continue;
    const target = add(seg.center, scale(n, entered + standoff));
    const free = nearestFree(g, target);
    if (free) return free;
  }
  return null;
}

/** The spot you stand on to use a fixture, on its `facing` side. */
function fixtureAnchor(plan: FloorPlan, g: Grid, f: Fixture): Vec2 | null {
  const o = fixtureObb(f);
  for (const flip of [0, 180]) {
    const dir = rotDir([0, 1], (f.facing ?? 0) + flip);
    // half-extent of the footprint measured along the facing direction
    const half = Math.abs(dir[0]) * (o.w / 2) + Math.abs(dir[1]) * (o.d / 2);
    // stand half a clearance zone out — far enough to be clear of the door / drawer
    const standoff = Math.max(1.25, (f.clearance ?? CLEARANCE.walkwayTight) / 2);
    const target = add(o.center, scale(dir, half + standoff));
    if (!pointInPolygon(target, plan.interior)) continue;
    const free = nearestFree(g, target);
    if (free) return free;
  }
  return null;
}

/**
 * A fixture's clear-floor box, with a sanity flip.
 *
 * plan.ts tags CLO (the reach-in closet run) with facing 0 even though its back
 * is on the south wall, so its clear floor is really on the north side. If the
 * box lands outside the interior the tagged face must be the wrong one, so use
 * the opposite face.
 */
function fixtureClearBox(plan: FloorPlan, f: Fixture): OBB | null {
  if (!f.clearance) return null;
  const o = fixtureObb(f);
  const a = clearanceObb(o, f.clearance, f.facing ?? 0);
  if (pointInPolygon(a.center, plan.interior)) return a;
  const b = clearanceObb(o, f.clearance, (f.facing ?? 0) + 180);
  if (pointInPolygon(b.center, plan.interior)) return b;
  return null;
}

// ------------------------------------------------------------------- routes

interface Route {
  label: string;
  from: Vec2;
  to: Vec2;
  refs: string[];
}

/** Clearance ceiling for the width search: 5 ft of clearance is a 10 ft corridor. */
const WIDTH_SEARCH_MAX = 5.0;

/** Cells this close to a route endpoint are never masked out (see bestRoute). */
const ENDPOINT_PROTECT = 1.25;

/**
 * A copy of the grid with every free cell whose clearance is under `tau`
 * blocked, i.e. "the floor you can walk down without turning sideways".
 *
 * clearanceField() returns an array parallel to Grid.data, so it is indexed the
 * same way; the cell is looked up through gridCellCenter/gridSet so nothing else
 * assumes a layout. Cells near the endpoints are kept because an endpoint is a
 * standing spot next to a door or an appliance and is legitimately tight —
 * masking it would strand the search (and findPath would snap the endpoint to
 * somewhere arbitrary, possibly through a wall).
 */
function maskBelowClearance(g: Grid, field: Float32Array, tau: number, protect: Vec2[]): Grid {
  const data = new Uint8Array(g.data);
  const out: Grid = { cell: g.cell, min: g.min, cols: g.cols, rows: g.rows, data };
  for (let row = 0; row < g.rows; row++) {
    for (let col = 0; col < g.cols; col++) {
      const i = row * g.cols + col;
      if (data[i] !== 1) continue;
      if (field[i] >= tau) continue;
      const c = gridCellCenter(g, col, row);
      let keep = false;
      for (const q of protect) {
        if (dist(c, q) <= ENDPOINT_PROTECT) {
          keep = true;
          break;
        }
      }
      if (!keep) gridSet(out, col, row, 2);
    }
  }
  return out;
}

/**
 * The WIDEST route between two points, and how wide it is.
 *
 * findPath() returns the SHORTEST route, which always shaves the inside of every
 * corner, so measuring that path reports one cell of clearance (6" of usable
 * width) even in an empty room — useless as a "can you walk here" number. What
 * matters is the best route available, i.e. max over routes of the narrowest
 * point, so binary-search the clearance threshold: mask out everything tighter
 * than `tau` and ask whether a route still exists. The final width still comes
 * from pathClearance() so the reported number is measured, not inferred.
 */
function bestRoute(
  g: Grid,
  field: Float32Array,
  from: Vec2,
  to: Vec2,
): { path: Vec2[]; width: number } | null {
  const base = findPath(g, from, to);
  if (!base) return null;
  /**
   * Measure the corridor, not the parking spot. Both endpoints are standing
   * spots hard by a door or an appliance, so their own clearance is small by
   * definition; including them would report every route as one cell wide.
   */
  const measure = (p: Vec2[]): number => {
    const inner = p.filter(
      (c) => dist(c, from) > ENDPOINT_PROTECT && dist(c, to) > ENDPOINT_PROTECT,
    );
    return pathClearance(g, field, inner.length ? inner : p);
  };

  let best = { path: base, width: measure(base) };
  let lo = 0;
  let hi = WIDTH_SEARCH_MAX;
  // 7 halvings of a 5 ft range settle to about half an inch.
  for (let i = 0; i < 7; i++) {
    const tau = (lo + hi) / 2;
    const p = findPath(maskBelowClearance(g, field, tau, [from, to]), from, to);
    if (p) {
      lo = tau;
      const w = measure(p);
      if (w > best.width) best = { path: p, width: w };
    } else {
      hi = tau;
    }
  }
  return best;
}

/**
 * The trips you have to be able to make in this apartment. Every anchor is
 * derived from the plan (doors by wall kind, fixtures by category + name,
 * windows by the centroid of the window group) so the routes survive any edit
 * to plan.ts.
 */
function requiredRoutes(plan: FloorPlan, g: Grid, entries: Entry[]): Route[] {
  const doors = plan.openings.filter((o) => o.kind === 'door');
  // The unit entry door is the one cut into an exterior wall (it leads outside);
  // any door in a partition is an interior door, i.e. the bathroom.
  const entryDoor = doors.find((o) => wallOf(plan, o)?.kind === 'exterior');
  const bathDoor = doors.find((o) => wallOf(plan, o)?.kind === 'partition');
  const sink = plan.fixtures.find((f) => f.category === 'kitchen' && /sink/i.test(f.name));
  const fridge = plan.fixtures.find(
    (f) => f.category === 'kitchen' && /refrig|fridge/i.test(f.name),
  );
  const windows = plan.openings.filter((o) => o.kind === 'window');
  const bed = entries.find((e) => SLEEPING.has(e.def.kind));

  // Stand a full entry-door clearance (3'-0") inside the front door; a half
  // walkway (1'-6") is enough in front of an interior door.
  const pEntry = entryDoor ? openingAnchor(plan, g, entryDoor, CLEARANCE.entryDoor) : null;
  const pBath = bathDoor ? openingAnchor(plan, g, bathDoor, CLEARANCE.walkway / 2) : null;
  const pSink = sink ? fixtureAnchor(plan, g, sink) : null;
  const pFridge = fridge ? fixtureAnchor(plan, g, fridge) : null;
  const pBed = bed ? nearestFree(g, bed.obb.center, 6) : null;

  // "The west windows" = the centroid of the window group, stepped in off the
  // glass by one walkway width so the target is somewhere you could stand.
  let pWindows: Vec2 | null = null;
  if (windows.length) {
    let sum: Vec2 = [0, 0];
    for (const w of windows) sum = add(sum, openingSegment(plan, w).center);
    const mid = scale(sum, 1 / windows.length);
    const seg = openingSegment(plan, windows[0]);
    for (const sign of [1, -1]) {
      const n = scale(seg.normal, sign);
      let entered = -1;
      for (let d = PROBE_STEP; d <= 2.5; d += PROBE_STEP) {
        if (pointInPolygon(add(mid, scale(n, d)), plan.interior)) {
          entered = d;
          break;
        }
      }
      if (entered < 0) continue;
      const free = nearestFree(g, add(mid, scale(n, entered + CLEARANCE.walkway)));
      if (free) {
        pWindows = free;
        break;
      }
    }
  }

  const routes: Route[] = [];
  const push = (label: string, from: Vec2 | null, to: Vec2 | null, refs: string[]) => {
    if (from && to) routes.push({ label, from, to, refs });
  };

  push('front door to bathroom', pEntry, pBath, [
    entryDoor?.id ?? 'entry',
    bathDoor?.id ?? 'bath',
  ]);
  push('front door to kitchen sink', pEntry, pSink, [entryDoor?.id ?? 'entry', sink?.id ?? 'sink']);
  push('front door to the west windows', pEntry, pWindows, [entryDoor?.id ?? 'entry', 'windows']);
  if (bed) {
    push('bathroom to the bed', pBath, pBed, [bathDoor?.id ?? 'bath', bed.item.id]);
  }
  push('kitchen sink to the refrigerator', pSink, pFridge, [
    sink?.id ?? 'sink',
    fridge?.id ?? 'fridge',
  ]);

  return routes;
}

// ------------------------------------------------------------------ analysis

/** 55" TV, in inches. Real diagonals are printed on the box; guess if not. */
function tvDiagonalInches(def: FurnitureDef): number {
  const hay = [def.name, def.id, def.source ?? '', ...(def.tags ?? [])].join(' ');
  const m = hay.match(/\b(2[4-9]|[3-9]\d|1[0-1]\d)\s*(?:"|in\b|inch)/i);
  if (m) return parseFloat(m[1]);
  // Fallback: a panel is measured corner to corner, and for a bare screen the
  // catalog w/h are close enough to the panel size.
  return Math.hypot(def.w, def.h) * 12;
}

function nameOf(e: Entry): string {
  return `${e.item.label ?? e.def.name} (${e.item.id})`;
}

export function analyzeLayout(plan: FloorPlan, layout: Layout): AnalysisResult {
  const issues: Issue[] = [];
  const add_ = (
    severity: Severity,
    code: string,
    message: string,
    refs: string[],
    at?: Vec2,
  ): void => {
    issues.push({ severity, code, message, refs, at });
  };

  // ---- resolve items against the catalog -------------------------------
  const entries: Entry[] = [];
  for (const item of layout.items) {
    const def: FurnitureDef | undefined = catalog[item.def];
    if (!def) {
      add_(
        'error',
        'unknown-def',
        `'${item.id}' references furniture "${item.def}", which is not in the catalog — nothing can be placed or measured for it.`,
        [item.id],
        item.at,
      );
      continue;
    }
    if (item.ignoreAnalysis) continue; // opted out of every geometric check
    const obb = itemObb(item, def);
    const z0 = item.z ?? def.defaultZ ?? 0;
    const z1 = z0 + (item.size?.h ?? def.h);
    entries.push({
      item,
      def,
      obb,
      z0,
      z1,
      onFloor: !def.walkable && !def.wallMounted,
    });
  }

  const solids = buildSolids(plan, entries);
  const grid = buildGrid(plan, blockersFor(plan, layout));
  const field = clearanceField(grid);
  const interiorArea = Math.abs(polygonArea(plan.interior));

  // ---- error: outside the apartment ------------------------------------
  for (const e of entries) {
    const corners = obbCorners(e.obb);
    let out = 0;
    let worst = 0;
    let worstAt: Vec2 = e.obb.center;
    for (const c of corners) {
      // Nudge 0.02 ft toward the centre: a piece pushed flush against a wall
      // face sits exactly ON the interior polygon, and the plan is only good to
      // ±0.3 ft, so an exact test would flag perfectly good placements.
      const probe = add(c, scale(norm(sub(e.obb.center, c)), 0.02));
      if (!pointInPolygon(probe, plan.interior)) {
        out++;
        const d = distToPolygon(c, plan.interior);
        if (d > worst) {
          worst = d;
          worstAt = c;
        }
      }
    }
    if (out > 0) {
      add_(
        'error',
        'outside',
        `${nameOf(e)} is not inside the apartment: ${out} of 4 corners fall outside the room, the worst by ${formatShort(worst)}. Its footprint is ${formatShort(e.obb.w)} x ${formatShort(e.obb.d)}.`,
        [e.item.id],
        worstAt,
      );
    }
  }

  // ---- error: inside a wall --------------------------------------------
  for (const e of entries) {
    // A wall-mounted piece is supposed to be touching the wall, so it is exempt.
    if (e.def.wallMounted) continue;
    for (const w of plan.walls) {
      const area = obbOverlapArea(e.obb, wallSolid(w));
      if (area > AREA_EPS) {
        add_(
          'error',
          'in-wall',
          `${nameOf(e)} runs ${formatArea(area)} into ${w.name} (${w.id}), a ${formatShort(w.thickness)} thick wall. Move it clear of the wall face.`,
          [e.item.id, w.id],
          e.obb.center,
        );
      }
    }
  }

  // ---- error: two pieces in the same place -----------------------------
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      // A rug may sit under anything.
      if (a.def.walkable || b.def.walkable) continue;
      // Only a real collision if the two also share height: a floating shelf at
      // 4'-6" above a 2'-6" dresser is fine, and that is the whole point of a
      // wall-mounted piece.
      const zShare = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
      if (zShare <= 0.02) continue;
      const area = obbOverlapArea(a.obb, b.obb);
      if (area <= AREA_EPS) continue;
      const clipped = clipPolygon(obbCorners(a.obb), obbCorners(b.obb));
      const at = clipped.length >= 3 ? polygonCentroid(clipped) : scale(add(a.obb.center, b.obb.center), 0.5);
      add_(
        'error',
        'overlap',
        `${nameOf(a)} and ${nameOf(b)} occupy the same floor: they overlap by ${formatArea(area)} and share ${formatShort(zShare)} of height.`,
        [a.item.id, b.item.id],
        at,
      );
    }
  }

  // ---- error: blocking a built-in --------------------------------------
  for (const e of entries) {
    // You can lay a rug in front of the fridge; art hangs above it.
    if (e.def.walkable || e.def.wallMounted) continue;
    for (const f of plan.fixtures) {
      if ((f.z ?? 0) > FIXTURE_OVERHEAD_Z) continue; // overhead cabinets
      const fo = fixtureObb(f);
      const hit = obbOverlapArea(e.obb, fo);
      if (hit > AREA_EPS && !f.soft) {
        add_(
          'error',
          'blocks-fixture',
          `${nameOf(e)} is on top of ${f.name} (${f.id}) — ${formatArea(hit)} of overlap with a built-in that cannot move.`,
          [e.item.id, f.id],
          e.obb.center,
        );
        continue; // the overlap already says everything; skip the clearance note
      }
      const box = fixtureClearBox(plan, f);
      if (!box) continue;
      const lost = obbOverlapArea(e.obb, box);
      if (lost > FIXTURE_CLEAR_EPS) {
        const share = lost / obbArea(box);
        add_(
          'error',
          'blocks-fixture',
          `${nameOf(e)} stands in the clear floor ${f.name} (${f.id}) needs — it takes ${formatArea(lost)} (${pct(share)}) of the ${formatShort(f.clearance ?? 0)} deep zone you have to stand in to use it.`,
          [e.item.id, f.id],
          box.center,
        );
      }
    }
  }

  // ---- error: blocking a door ------------------------------------------
  for (const o of plan.openings) {
    if (o.kind !== 'door' || !o.swing) continue;
    const swing = doorSwingPolygon(plan, o);
    if (swing.length < 3) continue;
    for (const e of entries) {
      if (e.def.walkable) continue; // the leaf sweeps over a rug
      // Anything whose whole body is above the door head cannot be hit by it.
      if (e.z0 >= o.head) continue;
      const area = rasterOverlapArea(swing, e.obb);
      if (area <= AREA_EPS) continue;
      add_(
        'error',
        'blocks-door',
        `${nameOf(e)} is in the swing of ${o.name} (${o.id}): ${formatArea(area)} of a ${formatShort(o.width)} door's arc. The door will not open.`,
        [e.item.id, o.id],
        e.obb.center,
      );
    }
  }

  // ---- error: nowhere to walk ------------------------------------------
  const routes = requiredRoutes(plan, grid, entries);
  const routeWidths: { label: string; width: number | null }[] = [];
  for (const r of routes) {
    const found = bestRoute(grid, field, r.from, r.to);
    if (!found) {
      routeWidths.push({ label: r.label, width: null });
      add_(
        'error',
        'no-path',
        `There is no way to walk from the ${r.label}: every route is blocked by furniture.`,
        r.refs,
        scale(add(r.from, r.to), 0.5),
      );
      continue;
    }
    const { path, width } = found;
    routeWidths.push({ label: r.label, width });
    if (width < CLEARANCE.walkwayTight) {
      // width is pathClearance's usable width (min clearance x 2) of the best
      // available route, so this really is the widest way through.
      add_(
        'warn',
        'tight-path',
        `The route from the ${r.label} squeezes down to ${formatFtIn(width)} wide; a walkway wants ${formatFtIn(CLEARANCE.walkway)} and ${formatFtIn(CLEARANCE.walkwayTight)} is the absolute minimum.`,
        r.refs,
        path[Math.floor(path.length / 2)],
      );
    }
  }

  // ---- warn: standing in front of a window -----------------------------
  for (const o of plan.openings) {
    if (o.kind !== 'window') continue;
    const seg = openingSegment(plan, o);
    // Band of floor one foot deep off the inside face of the window wall.
    let band: OBB | null = null;
    for (const sign of [1, -1]) {
      const n = scale(seg.normal, sign);
      let entered = -1;
      for (let d = 0; d <= 2.5; d += PROBE_STEP) {
        if (pointInPolygon(add(seg.center, scale(n, d)), plan.interior)) {
          entered = d;
          break;
        }
      }
      if (entered < 0) continue;
      const dir = norm(sub(seg.b, seg.a));
      band = {
        center: add(seg.center, scale(n, entered + WINDOW_BAND / 2)),
        w: dist(seg.a, seg.b),
        d: WINDOW_BAND,
        // OBB local +x is the wall direction; its local +y is the right-hand
        // normal, so flip 180 when the interior is on the other side.
        rot: (Math.atan2(dir[1], dir[0]) * 180) / Math.PI + (sign > 0 ? 0 : 180),
      };
      break;
    }
    if (!band) continue;

    for (const e of entries) {
      if (e.def.walkable || e.def.lowProfile) continue;
      // Curtains and anything hung on the wall belong in front of a window.
      if (e.def.wallMounted || e.def.kind === 'curtain') continue;
      if (e.z1 <= o.sill + 0.05) continue; // shorter than the sill: no harm
      const area = obbOverlapArea(e.obb, band);
      if (area <= AREA_EPS) continue;
      add_(
        'warn',
        'blocks-window',
        `${nameOf(e)} stands in front of ${o.name} (${o.id}): it is ${formatShort(e.z1)} tall and the sill is only ${formatShort(o.sill)} up, so it covers the glass (${formatArea(area)} of the ${formatShort(WINDOW_BAND)} strip under the window).`,
        [e.item.id, o.id],
        e.obb.center,
      );
    }
  }

  // ---- warn: front clearance -------------------------------------------
  for (const e of entries) {
    if (!e.def.frontClearance || !e.onFloor) continue;
    const box = clearanceObb(e.obb, e.def.frontClearance, e.item.rot ?? 0);
    // A seat and the surface it is pulled up to do not block each other — see
    // SEAT_KINDS. Everything else in the room still counts.
    const exempt = new Set<string>([e.item.id]);
    const partner = SEAT_KINDS.has(e.def.kind)
      ? SEAT_SURFACE_KINDS
      : SEAT_SURFACE_KINDS.has(e.def.kind)
        ? SEAT_KINDS
        : null;
    if (partner) {
      for (const other of entries) if (partner.has(other.def.kind)) exempt.add(other.item.id);
    }
    const frac = blockedFraction(plan, solids, box, exempt);
    if (frac <= CLEARANCE_BLOCKED_WARN) continue;
    add_(
      'warn',
      'clearance',
      `${pct(frac)} of the ${formatFtIn(e.def.frontClearance)} of clear floor ${nameOf(e)} needs in front of it is blocked (${formatArea(frac * obbArea(box))} of ${formatArea(obbArea(box))}).`,
      [e.item.id],
      box.center,
    );
  }

  // ---- warn: can you get into the bed ----------------------------------
  for (const e of entries) {
    if (!SLEEPING.has(e.def.kind)) continue;
    const long: Side[] = e.obb.d >= e.obb.w ? ['left', 'right'] : ['front', 'back'];
    const width = Math.min(e.obb.w, e.obb.d);
    const twoSleepers = width >= TWO_SLEEPER_WIDTH;
    const measured = long.map((side) => ({
      side,
      dir: faceGeom(e.obb, side).out,
      // Median of 5: the depth you have down most of that side of the bed.
      clear: clearDepth(plan, solids, e.obb, side, e.item.id, PROBE_MAX, 5, 'median'),
    }));
    const short = measured.filter((m) => m.clear < CLEARANCE.bedSide);
    const need = formatFtIn(CLEARANCE.bedSide);
    if (twoSleepers && short.length) {
      const parts = short
        .map((m) => `${formatShort(m.clear)} on the ${compass(m.dir)} side`)
        .join(' and ');
      add_(
        'warn',
        'bed-access',
        `${nameOf(e)} is ${formatShort(width)} wide, so it sleeps two and both long sides have to be usable — there is only ${parts} (needs ${need}).`,
        [e.item.id],
        add(e.obb.center, scale(short[0].dir, e.obb.w / 2)),
      );
    } else if (!twoSleepers && short.length === measured.length) {
      const parts = measured
        .map((m) => `${formatShort(m.clear)} ${compass(m.dir)}`)
        .join(', ');
      add_(
        'warn',
        'bed-access',
        `${nameOf(e)} has no usable side: ${parts} (needs ${need} on at least one long side, or you climb in over the foot).`,
        [e.item.id],
        e.obb.center,
      );
    }
  }

  // ---- warn: TV viewing distance ---------------------------------------
  for (const e of entries) {
    if (e.def.kind !== 'tv') continue;
    const diag = tvDiagonalInches(e.def);
    const min = CLEARANCE.tvViewingMin * diag;
    const max = CLEARANCE.tvViewingMax * diag;
    // The screen faces the room, so seating in front of it faces back at it.
    let best: { e: Entry; d: number } | null = null;
    for (const s of entries) {
      if (!SEATING.has(s.def.kind)) continue;
      const toTv = sub(e.obb.center, s.obb.center);
      const d = Math.hypot(toTv[0], toTv[1]);
      if (d < 0.5) continue;
      // Is the seat pointed at the TV? 0.3 ≈ within 72° of dead on.
      if (dot(norm(toTv), axisY(s.obb)) < 0.3) continue;
      if (!best || d < best.d) best = { e: s, d };
    }
    if (!best) continue;
    if (best.d >= min && best.d <= max) continue;
    const how = best.d < min ? 'too close to' : 'too far from';
    add_(
      'warn',
      'tv-distance',
      `${nameOf(best.e)} is ${how} ${nameOf(e)}: ${formatShort(best.d)} away, and a ${Math.round(diag)}" screen wants ${formatShort(min)} to ${formatShort(max)}.`,
      [e.item.id, best.e.item.id],
      scale(add(e.obb.center, best.e.obb.center), 0.5),
    );
  }

  // ---- warn: pieces adrift in the room ---------------------------------
  for (const e of entries) {
    if (!WALL_HUGGING.has(e.def.kind) || !e.onFloor) continue;
    const gap = clearDepth(plan, solids, e.obb, 'back', e.item.id);
    if (gap <= FLOATING_GAP) continue;
    const dirWord = compass(faceGeom(e.obb, 'back').out);
    const gapText = gap >= PROBE_MAX ? `more than ${formatShort(PROBE_MAX)}` : formatShort(gap);
    add_(
      'warn',
      'floating',
      `${nameOf(e)} has its back ${gapText} off anything (looking ${dirWord}). A ${e.def.kind.replace('_', ' ')} floating in the room reads as unfinished — push it against a wall or another piece.`,
      [e.item.id],
      e.obb.center,
    );
  }

  // ---- stats -----------------------------------------------------------
  const floorEntries = entries.filter((e) => e.onFloor);
  let occupied = 0;
  for (const e of floorEntries) occupied += clipAreaWithObb(plan.interior, e.obb);
  // Union-safe: a chair tucked under a table must not be counted twice. Pairwise
  // subtraction is exact for two overlapping pieces; a genuine triple overlap
  // would be over-subtracted, which the clamp below keeps sane.
  for (let i = 0; i < floorEntries.length; i++) {
    for (let j = i + 1; j < floorEntries.length; j++) {
      occupied -= obbOverlapArea(floorEntries[i].obb, floorEntries[j].obb);
    }
  }
  occupied = Math.max(0, Math.min(occupied, interiorArea));

  const freeFraction = interiorArea > 0 ? Math.max(0, 1 - occupied / interiorArea) : 0;

  const walkable = routeWidths.map((r) => r.width).filter((w): w is number => w !== null);
  const narrowestPath = walkable.length ? Math.min(...walkable) : undefined;

  let budget = 0;
  for (const item of layout.items) {
    const def: FurnitureDef | undefined = catalog[item.def];
    if (def?.price) budget += def.price;
  }

  const byZone: Record<string, { areaSqft: number; occupiedSqft: number; items: number }> = {};
  const zoneNames: Record<string, string> = {};
  for (const z of plan.zones) {
    const areaSqft = Math.abs(polygonArea(z.polygon));
    let occ = 0;
    let count = 0;
    for (const e of floorEntries) {
      occ += clipAreaWithObb(z.polygon, e.obb);
      if (pointInPolygon(e.obb.center, z.polygon)) count++;
    }
    byZone[z.id] = {
      areaSqft,
      occupiedSqft: Math.min(occ, areaSqft),
      items: count,
    };
    zoneNames[z.id] = z.name;
  }

  const stats: LayoutStats = {
    interiorAreaSqft: interiorArea,
    occupiedSqft: occupied,
    freeFraction,
    itemCount: layout.items.length,
    narrowestPath,
    budget,
    byZone,
  };

  // ---- info: density ---------------------------------------------------
  const freeSqft = interiorArea - occupied;
  if (freeFraction < DENSITY_CRAMPED) {
    add_(
      'info',
      'density',
      `Only ${pct(freeFraction)} of the floor is free (${formatArea(freeSqft)} of ${formatArea(interiorArea)}). Under ${pct(DENSITY_CRAMPED)} a studio starts to feel cramped.`,
      layout.items.map((i) => i.id).slice(0, 4),
      polygonCentroid(plan.interior),
    );
  } else if (freeFraction > DENSITY_SPARSE) {
    add_(
      'info',
      'density',
      `${pct(freeFraction)} of the floor is free (${formatArea(freeSqft)} of ${formatArea(interiorArea)}). Over ${pct(DENSITY_SPARSE)} the room is under-furnished for a place someone lives in.`,
      [],
      polygonCentroid(plan.interior),
    );
  }

  // ---- info: rug too small for the seating group -----------------------
  for (const e of entries) {
    if (e.def.kind !== 'rug') continue;
    // A desk mat is catalogued as a rug because that is what it is — but it lies
    // 29 1/2" up on the desktop (wallMounted = "not on the floor"), so it can
    // never run under a sofa's front legs and pairing it with one is nonsense.
    if (e.def.wallMounted) continue;
    let anchor: Entry | null = null;
    let anchorD = Infinity;
    for (const s of entries) {
      if (!RUG_ANCHOR.has(s.def.kind)) continue;
      const d = dist(s.obb.center, e.obb.center);
      if (d < anchorD && d <= RUG_GROUP_RADIUS) {
        anchorD = d;
        anchor = s;
      }
    }
    if (!anchor) continue;
    // The two front feet of the sofa: front face, 15% in from each end.
    const f = faceGeom(anchor.obb, 'front');
    const front = add(anchor.obb.center, scale(f.out, f.half));
    const feet: Vec2[] = [
      add(front, scale(f.along, -0.35 * f.span)),
      add(front, scale(f.along, 0.35 * f.span)),
    ];
    const off = feet.filter((p) => !obbContainsPoint(e.obb, p));
    if (!off.length) continue;
    // Another rug may already be doing the job. With two seating groups (or two
    // rooms) the nearest-anchor search will happily pair the bedroom rug with
    // the living-room sofa and then complain that it does not reach — which is
    // true and completely irrelevant. Only report when NO rug carries the feet.
    const carried = entries.some(
      (r) =>
        r.def.kind === 'rug' &&
        !r.def.wallMounted &&
        feet.every((p) => obbContainsPoint(r.obb, p)),
    );
    if (carried) continue;
    const gap = Math.max(...off.map((p) => distToObb(e.obb, p)));
    add_(
      'info',
      'rug-size',
      `${nameOf(e)} (${formatShort(e.obb.w)} x ${formatShort(e.obb.d)}) does not reach the front legs of ${nameOf(anchor)} — ${off.length === 2 ? 'both feet are' : 'one foot is'} off the rug by up to ${formatShort(gap)}. The rug should run under the front legs to tie the group together.`,
      [e.item.id, anchor.item.id],
      off[0],
    );
  }

  // Errors first, then warnings, then notes; insertion order kept inside each
  // band so related findings stay together.
  const rank: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  const ordered = issues
    .map((issue, i) => ({ issue, i }))
    .sort((a, b) => rank[a.issue.severity] - rank[b.issue.severity] || a.i - b.i)
    .map((x) => x.issue);

  const result: RichResult = {
    layout: layout.id,
    name: layout.name,
    description: layout.description,
    zoneNames,
    routes: routeWidths,
    issues: ordered,
    stats,
  };
  return result;
}

// ------------------------------------------------------------------- report

/** The eight escapes the report uses; the no-colour palette has the same shape. */
type Palette = Record<
  'reset' | 'bold' | 'dim' | 'red' | 'yellow' | 'green' | 'cyan' | 'grey',
  string
>;

const ANSI: Palette = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  cyan: '\u001b[36m',
  grey: '\u001b[90m',
};

const PLAIN: Palette = {
  reset: '',
  bold: '',
  dim: '',
  red: '',
  yellow: '',
  green: '',
  cyan: '',
  grey: '',
};

const GLYPH: Record<Severity, string> = { error: '✗', warn: '!', info: '·' };
const HEADING: Record<Severity, string> = { error: 'ERRORS', warn: 'WARNINGS', info: 'NOTES' };

const REPORT_WIDTH = 78;

/** Greedy word wrap. */
function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line.length) line = w;
    else if (line.length + 1 + w.length <= width) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line.length) lines.push(line);
  return lines.length ? lines : [''];
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * A compact, aligned terminal report. All padding is computed on plain text and
 * colour is added last, so alignment holds whether or not ANSI is on.
 */
export function formatReport(result: AnalysisResult, opts: { color?: boolean } = {}): string {
  const C = opts.color ? ANSI : PLAIN;
  const rich = result as RichResult;
  const s = result.stats;
  const out: string[] = [];
  const rule = (ch: string) => ch.repeat(REPORT_WIDTH);

  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const i of result.issues) counts[i.severity]++;
  const sevColor: Record<Severity, string> = { error: C.red, warn: C.yellow, info: C.grey };

  // ---- header
  const title = rich.name ?? result.layout;
  const idTag = title === result.layout ? '' : `  ${C.grey}[${result.layout}]${C.reset}`;
  out.push(`${C.cyan}${rule('═')}${C.reset}`);
  out.push(`  ${C.bold}${title}${C.reset}${idTag}`);
  if (rich.description) {
    for (const line of wrapText(rich.description, REPORT_WIDTH - 4)) {
      out.push(`  ${C.dim}${line}${C.reset}`);
    }
  }
  out.push(`${C.cyan}${rule('═')}${C.reset}`);

  // ---- stats, two columns of label/value
  const freeSqft = s.interiorAreaSqft - s.occupiedSqft;
  const cells: [string, string][] = [
    ['interior', formatArea(s.interiorAreaSqft)],
    ['free floor', `${pct(s.freeFraction)}  (${formatArea(freeSqft)})`],
    ['occupied', formatArea(s.occupiedSqft)],
    ['items', String(s.itemCount)],
    ['narrowest path', s.narrowestPath === undefined ? '—' : formatFtIn(s.narrowestPath)],
    ['budget', s.budget ? money(s.budget) : '—'],
  ];
  const labelW = Math.max(...cells.map((c) => c[0].length));
  // Only the left-hand column needs padding; the right-hand one ends the line.
  const valueW = Math.max(...cells.filter((_, i) => i % 2 === 0).map((c) => c[1].length));
  out.push('');
  for (let i = 0; i < cells.length; i += 2) {
    const left = cells[i];
    const right = cells[i + 1];
    let line = `  ${C.grey}${left[0].padEnd(labelW)}${C.reset}  ${left[1].padEnd(valueW)}`;
    if (right) {
      line += `    ${C.grey}${right[0].padEnd(labelW)}${C.reset}  ${right[1]}`;
    }
    out.push(line.trimEnd());
  }

  // ---- per-zone table
  if (s.byZone && Object.keys(s.byZone).length) {
    const rows = Object.entries(s.byZone).map(([id, z]) => {
      const free = z.areaSqft > 0 ? 1 - z.occupiedSqft / z.areaSqft : 0;
      return [
        rich.zoneNames?.[id] ?? id,
        z.areaSqft.toFixed(1),
        z.occupiedSqft.toFixed(1),
        pct(free),
        String(z.items),
      ];
    });
    const head = ['zone', 'area', 'used', 'free', 'items'];
    const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
    out.push('');
    out.push(
      `  ${C.grey}${head[0].padEnd(w[0])}  ${head[1].padStart(w[1])}  ${head[2].padStart(w[2])}  ${head[3].padStart(w[3])}  ${head[4].padStart(w[4])}${C.reset}`,
    );
    for (const r of rows) {
      out.push(
        `  ${r[0].padEnd(w[0])}  ${r[1].padStart(w[1])}  ${r[2].padStart(w[2])}  ${r[3].padStart(w[3])}  ${r[4].padStart(w[4])}`,
      );
    }
  }

  // ---- required routes
  if (rich.routes?.length) {
    const w = Math.max(...rich.routes.map((r) => r.label.length));
    out.push('');
    out.push(`  ${C.grey}required routes${C.reset}`);
    for (const r of rich.routes) {
      const ok = r.width !== null && r.width >= CLEARANCE.walkwayTight;
      const mark = r.width === null ? C.red + GLYPH.error : ok ? C.green + '✓' : C.yellow + '!';
      const text = r.width === null ? 'blocked' : `${formatFtIn(r.width)} usable`;
      out.push(`  ${mark}${C.reset} ${r.label.padEnd(w)}  ${text}`);
    }
  }

  // ---- issues
  out.push('');
  if (!result.issues.length) {
    out.push(`  ${C.green}✓ no issues found${C.reset}`);
  } else {
    const summary = (['error', 'warn', 'info'] as Severity[])
      .filter((sv) => counts[sv] > 0)
      .map((sv) => {
        const word = HEADING[sv].toLowerCase();
        return `${sevColor[sv]}${counts[sv]} ${counts[sv] === 1 ? word.slice(0, -1) : word}${C.reset}`;
      })
      .join(`${C.grey} · ${C.reset}`);
    out.push(`  ${summary}`);

    const codeW = Math.min(
      16,
      Math.max(...result.issues.map((i) => i.code.length)),
    );
    const gutter = 2 + 1 + 1 + codeW + 2; // indent + glyph + space + code + gap
    const bodyW = REPORT_WIDTH - gutter;

    for (const sv of ['error', 'warn', 'info'] as Severity[]) {
      const group = result.issues.filter((i) => i.severity === sv);
      if (!group.length) continue;
      out.push('');
      out.push(`  ${sevColor[sv]}${C.bold}${HEADING[sv]} (${group.length})${C.reset}`);
      for (const issue of group) {
        const refs = issue.refs?.length ? `  [${issue.refs.join(', ')}]` : '';
        const lines = wrapText(issue.message + refs, bodyW);
        out.push(
          `  ${sevColor[sv]}${GLYPH[sv]}${C.reset} ${C.bold}${issue.code.padEnd(codeW)}${C.reset}  ${lines[0]}`,
        );
        for (const extra of lines.slice(1)) out.push(`${' '.repeat(gutter)}${extra}`);
      }
    }
  }

  out.push(`${C.cyan}${rule('─')}${C.reset}`);
  return out.join('\n');
}
