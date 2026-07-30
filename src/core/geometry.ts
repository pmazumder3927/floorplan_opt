/**
 * geometry.ts — the numerical foundation for the whole lab.
 *
 * Everything downstream (analysis, 2D SVG, 3D build) inherits the conventions
 * proven here, so this file is deliberately verbose about WHY each sign is what
 * it is. Dependency-free on purpose: no three.js, no React, no DOM.
 *
 * COORDINATE SYSTEM (repeated here because every sign below depends on it)
 *   origin : top-left outer corner of the footprint
 *   +x     : east  / right on the page
 *   +y     : south / DOWN the page (image convention, NOT math y-up)
 *   angles : degrees, positive = CLOCKWISE as seen on the page
 *   right-hand normal of a direction (dx, dy) is (-dy, dx)
 *
 * All lengths are decimal FEET. Areas are square feet.
 */

import type {
  FloorPlan,
  Fixture,
  FurnitureDef,
  Opening,
  PlacedItem,
  Rect,
  Vec2,
  Wall,
} from './types';

export type { Vec2 } from './types';

/**
 * Tolerance for "is this really an overlap?" tests.
 * 1e-9 ft is 3e-8 inches — far below any real dimension in this project, so two
 * items placed flush against each other (a 24"-deep counter whose face is
 * exactly at the edge of a fridge) read as legal rather than colliding.
 */
export const EPS = 1e-9;

const DEG = Math.PI / 180;

// ============================================================ vector helpers

export function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function scale(v: Vec2, k: number): Vec2 {
  return [v[0] * k, v[1] * k];
}

export function len(v: Vec2): number {
  return Math.hypot(v[0], v[1]);
}

/** Unit vector. A zero-length input returns [0, 0] rather than NaN. */
export function norm(v: Vec2): Vec2 {
  const l = Math.hypot(v[0], v[1]);
  return l > EPS ? [v[0] / l, v[1] / l] : [0, 0];
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

/** 2D cross product (z of the 3D cross). Sign tells you which side b is on. */
export function cross(a: Vec2, b: Vec2): number {
  return a[0] * b[1] - a[1] * b[0];
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Rotate `v` by `deg` degrees CLOCKWISE ON THE PAGE, optionally about a point.
 *
 * SIGN CONVENTION PROOF — every other module inherits this, so derive it once:
 *
 * The matrix used is the ordinary "math" rotation matrix
 *     [ cos  -sin ]
 *     [ sin   cos ]
 * which is counter-clockwise in a y-UP frame. Our page frame is y-DOWN, i.e.
 * mirrored, and mirroring reverses apparent rotation sense — so the same matrix
 * reads CLOCKWISE on the page. Check it against the two facts the data model
 * states as law:
 *
 *   rotate([0, 1], 90):  +y is SOUTH (down).
 *     x' = 0*cos90 - 1*sin90 = -1
 *     y' = 0*sin90 + 1*cos90 =  0      -> [-1, 0] = WEST.
 *     South -> West is clockwise on the page (N -> E -> S -> W -> N).  ✔
 *     This is exactly the `rotate([0,1], 90) ≈ [-1, 0]` requirement.
 *
 *   rotate([1, 0], 90):  +x is EAST.
 *     x' = cos90 = 0, y' = sin90 = 1   -> [0, 1] = SOUTH.
 *     East -> South is clockwise.      ✔
 *
 * Corollary used everywhere below: rotate(v, +90) == (-v.y, v.x) == the
 * RIGHT-HAND NORMAL of v. Walking east on the page (facing right), your right
 * hand points down the page (south) — which is (0, 1). So "right-hand normal"
 * and "rotate 90 degrees clockwise" are the same operation. Nice and cheap.
 *
 * Corollary 2: an OBB with rot = r has local axes
 *   u (its +x / width axis)  = rotate([1,0], r) = ( cos r, sin r)
 *   n (its +y / depth axis)  = rotate([0,1], r) = (-sin r, cos r) = right normal of u
 * so "front faces +y at rot 0" means the front normal is always rotate([0,1], r).
 */
export function rotate(v: Vec2, deg: number, about?: Vec2): Vec2 {
  const a = deg * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  if (!about) return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  const x = v[0] - about[0];
  const y = v[1] - about[1];
  return [about[0] + x * c - y * s, about[1] + x * s + y * c];
}

/** The right-hand normal of a direction: rotate(d, +90). Not normalised. */
export function rightNormal(d: Vec2): Vec2 {
  return [-d[1], d[0]];
}

/** Angle of a direction in degrees, such that rotate([1,0], angleOf(d)) ∥ d. */
export function angleOf(d: Vec2): number {
  return Math.atan2(d[1], d[0]) / DEG;
}

// =================================================================== polygons

/**
 * Signed shoelace area. Positive means the vertices wind CLOCKWISE on the page
 * (because +y is down — the same sum would mean counter-clockwise in a y-up
 * frame). Exposed because winding matters for clipping and normal directions;
 * `polygonArea` is the absolute value everyone else wants.
 */
export function polygonSignedArea(poly: Vec2[]): number {
  const n = poly.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

/**
 * Area of a closed polygon, ALWAYS POSITIVE regardless of winding — the plan's
 * footprint and interior are traced clockwise on the page while zone polygons
 * are authored either way, and no caller ever wants a negative room.
 */
export function polygonArea(poly: Vec2[]): number {
  return Math.abs(polygonSignedArea(poly));
}

/** Area-weighted centroid. Degenerate (zero-area) polygons fall back to the vertex mean. */
export function polygonCentroid(poly: Vec2[]): Vec2 {
  const n = poly.length;
  if (n === 0) return [0, 0];
  if (n === 1) return [poly[0]![0], poly[0]![1]];
  let cx = 0;
  let cy = 0;
  let a2 = 0;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    const f = p[0] * q[1] - q[0] * p[1];
    a2 += f;
    cx += (p[0] + q[0]) * f;
    cy += (p[1] + q[1]) * f;
  }
  if (Math.abs(a2) < EPS) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p[0];
      sy += p[1];
    }
    return [sx / n, sy / n];
  }
  return [cx / (3 * a2), cy / (3 * a2)];
}

export interface Bounds {
  min: Vec2;
  max: Vec2;
  w: number;
  h: number;
}

export function polygonBounds(poly: Vec2[]): Bounds {
  if (poly.length === 0) return { min: [0, 0], max: [0, 0], w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
  }
  return { min: [minX, minY], max: [maxX, maxY], w: maxX - minX, h: maxY - minY };
}

/** Perimeter of the closed polygon (the closing edge is included). */
export function polygonPerimeter(poly: Vec2[]): number {
  const n = poly.length;
  if (n < 2) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += dist(poly[i]!, poly[(i + 1) % n]!);
  return sum;
}

/** Shortest distance from p to the segment a-b. */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const l2 = abx * abx + aby * aby;
  if (l2 < EPS) return dist(p, a);
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + aby * t));
}

/**
 * Robust ray casting. Points exactly ON the boundary count as INSIDE, which is
 * what the grid rasteriser and the zone lookups want: a cell centre sitting on
 * a wall face should belong to the room rather than vanishing.
 *
 * The crossing test uses the half-open rule `(yi > py) !== (yj > py)` so a ray
 * passing exactly through a vertex is counted once, never twice.
 */
export function pointInPolygon(p: Vec2, poly: Vec2[], boundaryEps = 1e-9): boolean {
  const n = poly.length;
  if (n < 3) return false;

  // Boundary first — cheap, and makes the result independent of ray parity bugs.
  for (let i = 0; i < n; i++) {
    if (distToSegment(p, poly[i]!, poly[(i + 1) % n]!) <= boundaryEps) return true;
  }

  let inside = false;
  const px = p[0];
  const py = p[1];
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]![0];
    const yi = poly[i]![1];
    const xj = poly[j]![0];
    const yj = poly[j]![1];
    if (yi > py !== yj > py) {
      const xIntersect = xi + ((py - yi) * (xj - xi)) / (yj - yi);
      if (px < xIntersect) inside = !inside;
    }
  }
  return inside;
}

/**
 * Sutherland-Hodgman polygon clipping. `convexClip` MUST be convex (every OBB
 * is, which is the only way this is used — see `obbOverlapArea`).
 *
 * Winding-agnostic: the inside half-plane of each clip edge is chosen from the
 * clip polygon's own signed area, so callers do not have to normalise winding.
 */
export function clipPolygon(subject: Vec2[], convexClip: Vec2[]): Vec2[] {
  if (subject.length < 3 || convexClip.length < 3) return [];
  // s = +1 when the clip winds the same way as our shoelace-positive direction.
  const s = polygonSignedArea(convexClip) >= 0 ? 1 : -1;
  let out: Vec2[] = subject.slice();

  for (let e = 0; e < convexClip.length && out.length > 0; e++) {
    const c1 = convexClip[e]!;
    const c2 = convexClip[(e + 1) % convexClip.length]!;
    const ex = c2[0] - c1[0];
    const ey = c2[1] - c1[1];
    // > 0 means "left of the edge in clip winding order" == interior side.
    const side = (p: Vec2): number => s * (ex * (p[1] - c1[1]) - ey * (p[0] - c1[0]));

    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      const dCur = side(cur);
      const dPrev = side(prev);
      const curIn = dCur >= 0;
      const prevIn = dPrev >= 0;
      if (curIn !== prevIn) {
        // Crossing: emit the intersection with the clip line.
        const t = dPrev / (dPrev - dCur);
        out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]);
      }
      if (curIn) out.push(cur);
    }
  }
  return out;
}

// ====================================================== axis-aligned rectangles

/** Corners in shoelace-positive order: TL, TR, BR, BL on the page. */
export function rectCorners(r: Rect): Vec2[] {
  return [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x + r.w, r.y + r.h],
    [r.x, r.y + r.h],
  ];
}

export function rectCenter(r: Rect): Vec2 {
  return [r.x + r.w / 2, r.y + r.h / 2];
}

export function rectArea(r: Rect): number {
  return Math.abs(r.w * r.h);
}

/** Touching edges do NOT overlap (same epsilon rule as `obbOverlap`). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x + a.w - b.x > EPS &&
    b.x + b.w - a.x > EPS &&
    a.y + a.h - b.y > EPS &&
    b.y + b.h - a.y > EPS
  );
}

export function rectOverlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Grow (or shrink, with a negative `by`) a rect on all four sides. */
export function rectInflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by };
}

// ================================================ oriented bounding boxes (OBB)

/**
 * An oriented box. At rot = 0, `w` runs along +x and `d` along +y, and the
 * FRONT of the thing it describes faces +y (plan south) — identical to the
 * FurnitureDef convention so `itemObb` is a straight copy.
 */
export interface OBB {
  center: Vec2;
  w: number;
  d: number;
  rot: number;
}

export function rectToObb(r: Rect): OBB {
  return { center: rectCenter(r), w: r.w, d: r.h, rot: 0 };
}

/** The box's local +x (width) axis in world space. */
export function obbAxisU(o: OBB): Vec2 {
  const a = o.rot * DEG;
  return [Math.cos(a), Math.sin(a)];
}

/** The box's local +y (depth / FRONT) axis in world space. */
export function obbAxisV(o: OBB): Vec2 {
  const a = o.rot * DEG;
  return [-Math.sin(a), Math.cos(a)];
}

/**
 * Corners in local order (-w,-d), (+w,-d), (+w,+d), (-w,+d). Rotation has
 * determinant +1 so this stays shoelace-positive for every `rot`, which
 * `clipPolygon` relies on being consistent.
 */
export function obbCorners(o: OBB): Vec2[] {
  const u = obbAxisU(o);
  const v = obbAxisV(o);
  const hw = o.w / 2;
  const hd = o.d / 2;
  const [cx, cy] = o.center;
  return [
    [cx - u[0] * hw - v[0] * hd, cy - u[1] * hw - v[1] * hd],
    [cx + u[0] * hw - v[0] * hd, cy + u[1] * hw - v[1] * hd],
    [cx + u[0] * hw + v[0] * hd, cy + u[1] * hw + v[1] * hd],
    [cx - u[0] * hw + v[0] * hd, cy - u[1] * hw + v[1] * hd],
  ];
}

export function obbBounds(o: OBB): Bounds {
  return polygonBounds(obbCorners(o));
}

export function obbArea(o: OBB): number {
  return Math.abs(o.w * o.d);
}

export function obbCenter(o: OBB): Vec2 {
  return [o.center[0], o.center[1]];
}

/** Project the box onto a unit axis; returns the [min, max] interval. */
function projectObb(o: OBB, axis: Vec2): [number, number] {
  const c = dot(o.center, axis);
  // For a box, the half-extent along any axis is the sum of |axis . localAxis|
  // times each half-size — no need to test all four corners.
  const r =
    (Math.abs(dot(obbAxisU(o), axis)) * o.w) / 2 + (Math.abs(dot(obbAxisV(o), axis)) * o.d) / 2;
  return [c - r, c + r];
}

/**
 * Separating Axis Theorem on the 4 candidate axes (each box contributes its own
 * two edge normals; in 2D that is sufficient and necessary for two convex boxes).
 *
 * TOUCHING IS NOT OVERLAPPING: an axis whose overlap is <= EPS separates them.
 * Furniture pushed flush against a wall or against the next piece is legal, and
 * the whole layout language depends on that being true.
 */
export function obbOverlap(a: OBB, b: OBB): boolean {
  const axes: Vec2[] = [obbAxisU(a), obbAxisV(a), obbAxisU(b), obbAxisV(b)];
  for (const axis of axes) {
    const [aMin, aMax] = projectObb(a, axis);
    const [bMin, bMax] = projectObb(b, axis);
    const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
    if (overlap <= EPS) return false; // found a separating axis
  }
  return true;
}

/**
 * Exact intersection area of two boxes: clip A's rectangle against B (convex)
 * and take the shoelace area of what survives.
 */
export function obbOverlapArea(a: OBB, b: OBB): number {
  if (!obbOverlap(a, b)) return 0;
  const poly = clipPolygon(obbCorners(a), obbCorners(b));
  return poly.length < 3 ? 0 : polygonArea(poly);
}

/** Boundary counts as inside, matching `pointInPolygon`. */
export function obbContainsPoint(o: OBB, p: Vec2): boolean {
  const rel = sub(p, o.center);
  const lx = dot(rel, obbAxisU(o));
  const ly = dot(rel, obbAxisV(o));
  return Math.abs(lx) <= o.w / 2 + EPS && Math.abs(ly) <= o.d / 2 + EPS;
}

/** Grow an OBB by `by` on every side (clearance halos, collision slop). */
export function obbInflate(o: OBB, by: number): OBB {
  return { center: [o.center[0], o.center[1]], w: o.w + 2 * by, d: o.d + 2 * by, rot: o.rot };
}

// ====================================================================== walls

export interface WallAxis {
  /** unit vector start -> end */
  dir: Vec2;
  /** right-hand normal of dir, i.e. rotate(dir, +90) = (-dy, dx) */
  normal: Vec2;
  length: number;
}

export function wallAxis(w: Wall): WallAxis {
  const d = sub(w.end, w.start);
  const length = len(d);
  const dir = norm(d);
  return { dir, normal: rightNormal(dir), length };
}

/**
 * Which way is "into the building" from this wall's reference line?
 * Exterior walls declare `interiorSide` relative to the start->end direction;
 * 'right' means the right-hand normal (-dy, dx). Partitions have no interior
 * side (they are double-sided), so we return the right normal for consistency
 * and callers that care use `wallFaces`.
 */
function wallInward(w: Wall): Vec2 {
  const { normal } = wallAxis(w);
  return w.interiorSide === 'left' ? scale(normal, -1) : normal;
}

/**
 * The solid volume the wall occupies, as an OBB with `w` = wall length,
 * `d` = thickness and `rot` = the wall's direction angle (so the OBB's local +y
 * axis IS the wall's right-hand normal — see the rotate() proof above).
 *
 *   exterior : start/end are the OUTER face, so the solid extends the FULL
 *              thickness INWARD (toward `interiorSide`). Centre is therefore
 *              the midpoint pushed inward by thickness/2.
 *              e.g. W1 (north wall, [0,0]->[10.53,0], t = 0.63, interior on the
 *              right = +y): solid spans y 0..0.63, matching interior y = 0.63. ✔
 *   partition: start/end are the CENTERLINE, so the solid extends thickness/2
 *              to each side and the centre is just the midpoint.
 */
export function wallSolid(w: Wall): OBB {
  const { dir, length } = wallAxis(w);
  const mid = lerp(w.start, w.end, 0.5);
  const rot = angleOf(dir);
  if (w.kind === 'exterior') {
    return {
      center: add(mid, scale(wallInward(w), w.thickness / 2)),
      w: length,
      d: w.thickness,
      rot,
    };
  }
  return { center: mid, w: length, d: w.thickness, rot };
}

/**
 * The two faces of the wall as line segments.
 *   exterior : `outer` is the traced line itself; `inner` is that line offset
 *              inward by the full thickness (the face you can put a sofa against).
 *   partition: the reference line is the centerline, so both faces are half a
 *              thickness away. By contract `inner` is the LEFT face (-normal)
 *              and `outer` the right face.
 */
export function wallFaces(w: Wall): { inner: [Vec2, Vec2]; outer: [Vec2, Vec2] } {
  if (w.kind === 'exterior') {
    const off = scale(wallInward(w), w.thickness);
    return {
      outer: [[w.start[0], w.start[1]], [w.end[0], w.end[1]]],
      inner: [add(w.start, off), add(w.end, off)],
    };
  }
  const { normal } = wallAxis(w);
  const left = scale(normal, -w.thickness / 2);
  const right = scale(normal, w.thickness / 2);
  return {
    inner: [add(w.start, left), add(w.end, left)],
    outer: [add(w.start, right), add(w.end, right)],
  };
}

export function getWall(plan: FloorPlan, id: string): Wall {
  const w = plan.walls.find((x) => x.id === id);
  if (!w) {
    throw new Error(
      `Unknown wall id ${JSON.stringify(id)} in plan ${plan.id}. Known: ${plan.walls
        .map((x) => x.id)
        .join(', ')}`,
    );
  }
  return w;
}

// =================================================================== openings

export interface OpeningSegment {
  /** near jamb — `offset` along the wall from Wall.start */
  a: Vec2;
  /** far jamb — `offset + width` along the wall */
  b: Vec2;
  center: Vec2;
  /** unit wall direction, start -> end */
  dir: Vec2;
  /** wall's right-hand normal */
  normal: Vec2;
  wall: Wall;
}

/**
 * The opening's footprint ON THE WALL LINE. Opening.offset is measured along the
 * wall from Wall.start, so for the west wall (W10 runs south -> north) the
 * window offsets are distances up from the SW corner.
 *
 * Note the jambs sit on the wall's REFERENCE line: the outer face for exterior
 * walls, the centerline for partitions. That is the documented data model, and
 * the renderers offset from here when they need a specific face.
 */
export function openingSegment(plan: FloorPlan, o: Opening): OpeningSegment {
  const wall = getWall(plan, o.wall);
  const { dir, normal } = wallAxis(wall);
  const a = add(wall.start, scale(dir, o.offset));
  const b = add(wall.start, scale(dir, o.offset + o.width));
  return { a, b, center: lerp(a, b, 0.5), dir, normal, wall };
}

/**
 * The quarter-disc (or whatever `swing.angle` says) that a door leaf sweeps.
 *
 *   radius : the opening width — a leaf spans the opening, so it sweeps a circle
 *            of that radius about its hinge.
 *   hinge  : the NEAR jamb (a) for hinge = 'near', the FAR jamb (b) for 'far'.
 *   side   : swing.into 'right' = the wall's +normal side, 'left' = -normal.
 *
 * Returns a closed fan: [hinge, closed-leaf tip, ...arc..., open-leaf tip].
 * Openings with no `swing` (windows, passages) return [] — there is nothing to
 * draw and callers can test `.length`.
 */
export function doorSwingPolygon(plan: FloorPlan, o: Opening, segments = 12): Vec2[] {
  if (!o.swing) return [];
  const seg = openingSegment(plan, o);
  const hinge = o.swing.hinge === 'far' ? seg.b : seg.a;
  const other = o.swing.hinge === 'far' ? seg.a : seg.b;
  const radius = o.width;

  // Closed position: the leaf lies in the opening, pointing from the hinge at
  // the opposite jamb.
  const closed = norm(sub(other, hinge));
  // Open position: perpendicular to the wall, on the side named by `into`.
  const openDir = o.swing.into === 'left' ? scale(seg.normal, -1) : seg.normal;

  // Which rotation sense takes `closed` to `openDir`? rotate(v, +90) is v's
  // right-hand normal, and cross(v, rightNormal(v)) = |v|^2 > 0, so a positive
  // cross means the positive (page-clockwise) sense is the short way round.
  const sense = cross(closed, openDir) >= 0 ? 1 : -1;
  const sweep = sense * o.swing.angle;

  const n = Math.max(1, Math.floor(segments));
  const out: Vec2[] = [hinge];
  for (let i = 0; i <= n; i++) {
    out.push(add(hinge, scale(rotate(closed, (sweep * i) / n), radius)));
  }
  return out;
}

// ============================================================ items & fixtures

/**
 * A placed catalog item's footprint. `item.size` overrides the catalog
 * dimensions for custom / built-in millwork; rot defaults to 0 (front to +y).
 */
export function itemObb(item: PlacedItem, def: FurnitureDef): OBB {
  return {
    center: [item.at[0], item.at[1]],
    w: item.size?.w ?? def.w,
    d: item.size?.d ?? def.d,
    rot: item.rot ?? 0,
  };
}

/**
 * A fixture's footprint. Fixture.footprint is an axis-aligned Rect by
 * definition, so rot is always 0 — `facing` describes which side is usable and
 * is consumed by `clearanceObb`, not by the footprint itself.
 */
export function fixtureObb(f: Fixture): OBB {
  return rectToObb(f.footprint);
}

/**
 * The clear-floor box a thing needs in FRONT of it.
 *
 * "Front" is the +y direction of the local frame (rot = 0 faces plan south), so
 * the clearance box sits `o.d/2 + depth/2` along rotate([0,1], facing) from the
 * item centre — flush against the front face, extending `depth` outward. It
 * inherits the item's width so it is exactly the strip you must keep empty.
 *
 * `facing` defaults to o.rot; pass a Fixture.facing when the usable side is not
 * the box's own front (e.g. the toilet at facing 90 in a rot-0 footprint).
 */
export function clearanceObb(o: OBB, depth: number, facing: number = o.rot): OBB {
  const front = rotate([0, 1], facing);
  const offset = o.d / 2 + depth / 2;
  return {
    center: [o.center[0] + front[0] * offset, o.center[1] + front[1] * offset],
    w: o.w,
    d: depth,
    rot: facing,
  };
}

// ======================================================================= grid

/**
 * Occupancy raster of the plan.
 *   data[row * cols + col]: 0 = outside the interior (or inside a wall solid)
 *                           1 = free floor
 *                           2 = blocked by furniture / a fixture
 */
export interface Grid {
  cell: number;
  min: Vec2;
  cols: number;
  rows: number;
  data: Uint8Array;
}

export const OUTSIDE = 0;
export const FREE = 1;
export const BLOCKED = 2;

/**
 * Rasterise the plan. A cell is decided entirely by its CENTRE:
 *   outside  unless the centre is inside plan.interior AND outside every wallSolid
 *   free     once it is inside
 *   blocked  if the centre also falls inside any blocker OBB
 *
 * Default cell 0.25 ft (3") gives ~122 x 80 = ~9.8k cells for this 30.36 x 19.8 ft
 * footprint — cheap enough to rebuild on every analysis pass, fine enough that a
 * 3 ft walkway is 12 cells wide.
 */
export function buildGrid(plan: FloorPlan, blockers: OBB[], cell = 0.25): Grid {
  const b = polygonBounds(plan.footprint);
  const cols = Math.max(1, Math.ceil(b.w / cell));
  const rows = Math.max(1, Math.ceil(b.h / cell));
  const data = new Uint8Array(cols * rows); // 0 = OUTSIDE everywhere to start

  const wallSolids = plan.walls.map(wallSolid);
  // Pre-bound every blocker so the inner loop mostly does 4 comparisons.
  const blockerBounds = blockers.map(obbBounds);

  for (let row = 0; row < rows; row++) {
    const cy = b.min[1] + (row + 0.5) * cell;
    for (let col = 0; col < cols; col++) {
      const cx = b.min[0] + (col + 0.5) * cell;
      const p: Vec2 = [cx, cy];

      if (!pointInPolygon(p, plan.interior)) continue;
      let inWall = false;
      for (const ws of wallSolids) {
        if (obbContainsPoint(ws, p)) {
          inWall = true;
          break;
        }
      }
      if (inWall) continue;

      let v: number = FREE;
      for (let i = 0; i < blockers.length; i++) {
        const bb = blockerBounds[i]!;
        if (cx < bb.min[0] || cx > bb.max[0] || cy < bb.min[1] || cy > bb.max[1]) continue;
        if (obbContainsPoint(blockers[i]!, p)) {
          v = BLOCKED;
          break;
        }
      }
      data[row * cols + col] = v;
    }
  }

  return { cell, min: [b.min[0], b.min[1]], cols, rows, data };
}

export function gridCellCenter(g: Grid, col: number, row: number): Vec2 {
  return [g.min[0] + (col + 0.5) * g.cell, g.min[1] + (row + 0.5) * g.cell];
}

/** Column / row containing a world point (may be out of range — check it). */
export function gridIndexAt(g: Grid, p: Vec2): [number, number] {
  return [Math.floor((p[0] - g.min[0]) / g.cell), Math.floor((p[1] - g.min[1]) / g.cell)];
}

/** Cell value at a world point. Anything off-grid reads as OUTSIDE. */
export function gridAt(g: Grid, p: Vec2): number {
  const [col, row] = gridIndexAt(g, p);
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return OUTSIDE;
  return g.data[row * g.cols + col]!;
}

export function gridSet(g: Grid, col: number, row: number, v: number): void {
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return;
  g.data[row * g.cols + col] = v;
}

/**
 * Distance (FEET) from every free cell to the nearest NON-free cell (blocked or
 * outside). Two-pass chamfer transform: O(cols * rows), not O(n^2).
 *
 * Chamfer weights are 1 orthogonal / sqrt(2) diagonal, scaled by cell size —
 * accurate to ~4% of true Euclidean distance, which is well inside the ±0.3 ft
 * accuracy of the traced plan.
 *
 * Non-free cells are 0. Free cells on the grid border are seeded at one cell,
 * because the phantom cell just outside the raster is by definition not floor.
 */
export function clearanceField(g: Grid): Float32Array {
  const { cols, rows, cell, data } = g;
  const f = new Float32Array(cols * rows);
  const D = cell;
  const D2 = cell * Math.SQRT2;
  const BIG = (cols + rows) * cell * 2; // larger than any achievable distance

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (data[i] !== FREE) {
        f[i] = 0;
      } else if (col === 0 || row === 0 || col === cols - 1 || row === rows - 1) {
        f[i] = D;
      } else {
        f[i] = BIG;
      }
    }
  }

  // Forward pass: top-left -> bottom-right, looking at already-final neighbours.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (f[i] === 0) continue;
      let v = f[i]!;
      if (row > 0) {
        if (col > 0) v = Math.min(v, f[i - cols - 1]! + D2);
        v = Math.min(v, f[i - cols]! + D);
        if (col < cols - 1) v = Math.min(v, f[i - cols + 1]! + D2);
      }
      if (col > 0) v = Math.min(v, f[i - 1]! + D);
      f[i] = v;
    }
  }

  // Backward pass: bottom-right -> top-left.
  for (let row = rows - 1; row >= 0; row--) {
    for (let col = cols - 1; col >= 0; col--) {
      const i = row * cols + col;
      if (f[i] === 0) continue;
      let v = f[i]!;
      if (col < cols - 1) v = Math.min(v, f[i + 1]! + D);
      if (row < rows - 1) {
        if (col > 0) v = Math.min(v, f[i + cols - 1]! + D2);
        v = Math.min(v, f[i + cols]! + D);
        if (col < cols - 1) v = Math.min(v, f[i + cols + 1]! + D2);
      }
      f[i] = v;
    }
  }

  return f;
}

/** Binary min-heap keyed by f-score, storing flat cell indices. */
class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];

  get size(): number {
    return this.vals.length;
  }

  push(val: number, key: number): void {
    this.vals.push(val);
    this.keys.push(key);
    let i = this.vals.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent]! <= this.keys[i]!) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.vals[0]!;
    const lastVal = this.vals.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.vals.length > 0) {
      this.vals[0] = lastVal;
      this.keys[0] = lastKey;
      let i = 0;
      const n = this.vals.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && this.keys[l]! < this.keys[m]!) m = l;
        if (r < n && this.keys[r]! < this.keys[m]!) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const tv = this.vals[a]!;
    this.vals[a] = this.vals[b]!;
    this.vals[b] = tv;
    const tk = this.keys[a]!;
    this.keys[a] = this.keys[b]!;
    this.keys[b] = tk;
  }
}

/**
 * Nearest FREE cell to a world point, searched outward in rings up to
 * `maxRadius` feet. Returns the flat index or -1.
 */
function snapToFree(g: Grid, p: Vec2, maxRadius: number): number {
  const [c0, r0] = gridIndexAt(g, p);
  const inRange = c0 >= 0 && r0 >= 0 && c0 < g.cols && r0 < g.rows;
  if (inRange && g.data[r0 * g.cols + c0] === FREE) return r0 * g.cols + c0;

  const span = Math.ceil(maxRadius / g.cell);
  let best = -1;
  let bestD = Infinity;
  for (let dr = -span; dr <= span; dr++) {
    const row = r0 + dr;
    if (row < 0 || row >= g.rows) continue;
    for (let dc = -span; dc <= span; dc++) {
      const col = c0 + dc;
      if (col < 0 || col >= g.cols) continue;
      if (g.data[row * g.cols + col] !== FREE) continue;
      const d = dist(p, gridCellCenter(g, col, row));
      if (d <= maxRadius && d < bestD) {
        bestD = d;
        best = row * g.cols + col;
      }
    }
  }
  return best;
}

/**
 * A* over FREE cells, 8-connected. Orthogonal step costs `cell`, diagonal
 * sqrt(2) * cell, and a diagonal is FORBIDDEN unless both of the orthogonal
 * cells it passes between are free — otherwise the path would squeeze through
 * the zero-width gap at a blocked corner, which a person cannot do.
 *
 * `from` / `to` are snapped to the nearest free cell within 3 ft (a chair or a
 * counter overhang often covers the exact point you want to route to/from).
 * Returns cell-centre waypoints in world space, or null if unreachable.
 *
 * ROUTING MODEL: a pure shortest path is the wrong route to measure. It hugs the
 * inside of every corner, so `pathClearance` on it reports ~one cell no matter how
 * open the room is — it measures the tightest line a person *could* trace, not the
 * line a person *would* walk. So by default the step cost is penalised for walking
 * close to an obstacle, which pushes the route into the middle of a corridor the
 * way someone actually moves through a room. `comfort` is the clearance (per side)
 * below which the penalty starts, so the default 1.5 ft asks for a 3 ft walkway.
 *
 * The penalty is non-negative and proportional to step length, so the octile
 * heuristic stays admissible and A* is still optimal for the penalised cost.
 *
 * Pass `shortest: true` for the old behaviour, i.e. the strict "is there any way
 * through at all" question rather than "how good is the route".
 */
export interface PathOptions {
  /** clearance per side, in ft, below which the obstacle penalty starts */
  comfort?: number;
  /** how strongly to avoid tight spots; 0 reproduces the shortest path */
  weight?: number;
  /** ignore clearance entirely and return the strict shortest path */
  shortest?: boolean;
}

/**
 * clearanceField is O(n) but not free, and findPath is called several times per
 * analysis against the same grid, so memoise per Grid instance.
 */
const FIELD_CACHE = new WeakMap<Grid, Float32Array>();

/** The clearance field for a grid, computed once per grid instance. */
export function cachedClearanceField(g: Grid): Float32Array {
  let f = FIELD_CACHE.get(g);
  if (!f) {
    f = clearanceField(g);
    FIELD_CACHE.set(g, f);
  }
  return f;
}

export function findPath(g: Grid, from: Vec2, to: Vec2, opts: PathOptions = {}): Vec2[] | null {
  const SNAP = 3.0;
  const comfort = opts.comfort ?? 1.5;
  const weight = opts.shortest ? 0 : (opts.weight ?? 3);
  const field = weight > 0 ? cachedClearanceField(g) : null;
  const start = snapToFree(g, from, SNAP);
  const goal = snapToFree(g, to, SNAP);
  if (start < 0 || goal < 0) return null;
  if (start === goal) {
    return [gridCellCenter(g, start % g.cols, Math.floor(start / g.cols))];
  }

  const { cols, rows, cell, data } = g;
  const n = cols * rows;
  const gScore = new Float64Array(n).fill(Infinity);
  const cameFrom = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const diag = cell * Math.SQRT2;

  const gc = goal % cols;
  const gr = (goal - gc) / cols;
  // Octile heuristic — admissible for 8-connected grids with these costs.
  const h = (idx: number): number => {
    const c = idx % cols;
    const r = (idx - c) / cols;
    const dx = Math.abs(c - gc);
    const dy = Math.abs(r - gr);
    return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)) * cell;
  };

  const open = new MinHeap();
  gScore[start] = 0;
  open.push(start, h(start));

  const NEIGH: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  while (open.size > 0) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) break;

    const cc = cur % cols;
    const cr = (cur - cc) / cols;
    const gCur = gScore[cur]!;

    for (const [dc, dr] of NEIGH) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (data[ni] !== FREE || closed[ni]) continue;
      if (dc !== 0 && dr !== 0) {
        // No corner cutting: both orthogonal companions must be walkable.
        if (data[cr * cols + nc] !== FREE || data[nr * cols + cc] !== FREE) continue;
      }
      const step = dc !== 0 && dr !== 0 ? diag : cell;
      // Walking within `comfort` of an obstacle costs extra, scaled by how far
      // inside that margin you are. Always >= 0, so the heuristic stays admissible.
      const squeeze = field ? Math.max(0, comfort - field[ni]!) : 0;
      const tentative = gCur + step * (1 + weight * squeeze);
      if (tentative < gScore[ni]! - 1e-12) {
        gScore[ni] = tentative;
        cameFrom[ni] = cur;
        open.push(ni, tentative + h(ni));
      }
    }
  }

  if (cameFrom[goal] === -1 && goal !== start) return null;

  const path: Vec2[] = [];
  for (let i = goal; i !== -1; i = cameFrom[i]!) {
    const c = i % cols;
    path.push(gridCellCenter(g, c, (i - c) / cols));
    if (i === start) break;
  }
  path.reverse();
  return path;
}

/**
 * Usable corridor WIDTH along a path, in feet.
 *
 * `clearanceField` gives the distance from a cell to the nearest non-floor cell
 * — a half-width. The tightest point on the path therefore admits twice that,
 * which is the number you compare against CLEARANCE.walkway (36") etc.
 * Rounded to 0.01 ft so reports do not print raster noise.
 */
export function pathClearance(g: Grid, field: Float32Array, path: Vec2[]): number {
  if (path.length === 0) return 0;
  let min = Infinity;
  for (const p of path) {
    const [col, row] = gridIndexAt(g, p);
    if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return 0;
    const v = field[row * g.cols + col]!;
    if (v < min) min = v;
  }
  if (!Number.isFinite(min)) return 0;
  return Math.round(min * 2 * 100) / 100;
}

// ================================================================= self-test
//
// Run: GEOM_SELFTEST=1 npx tsx src/core/geometry.ts
//
// Guarded so bundlers tree-shake it out of the browser build, and imported
// dynamically so geometry.ts keeps zero static dependencies beyond types.

if (typeof process !== 'undefined' && process.env && process.env.GEOM_SELFTEST) {
  void (async () => {
    let failures = 0;
    let count = 0;
    const ok = (name: string, cond: boolean, detail = ''): void => {
      count++;
      if (cond) {
        console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`);
      } else {
        failures++;
        console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`);
      }
    };
    const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;

    console.log('geometry.ts self-test');

    // ---- 1. rotate sign convention (clockwise on the page, +y = south)
    const r1 = rotate([0, 1], 90);
    ok('rotate([0,1], 90) === [-1, 0]  (south -> west is CW)', near(r1[0], -1, 1e-12) && near(r1[1], 0, 1e-12), `[${r1[0].toFixed(6)}, ${r1[1].toFixed(6)}]`);
    const r2 = rotate([1, 0], 90);
    ok('rotate([1,0], 90) === [0, 1]  (east -> south is CW)', near(r2[0], 0, 1e-12) && near(r2[1], 1, 1e-12), `[${r2[0].toFixed(6)}, ${r2[1].toFixed(6)}]`);
    const r3 = rotate([1, 0], 90);
    const rn = rightNormal([1, 0]);
    ok('rotate(v, +90) === rightNormal(v)', near(r3[0], rn[0], 1e-12) && near(r3[1], rn[1], 1e-12));
    const r4 = rotate([1, 1], 90, [1, 0]);
    ok('rotate about a pivot', near(r4[0], 0, 1e-12) && near(r4[1], 0, 1e-12), `[${r4[0].toFixed(6)}, ${r4[1].toFixed(6)}]`);

    // ---- 2. the real plan's areas
    const { studio } = await import('./plan');
    const fpArea = polygonArea(studio.footprint);
    ok('polygonArea(plan.footprint) ~= 507.9', near(fpArea, 507.9, 1.0), fpArea.toFixed(2));
    const inArea = polygonArea(studio.interior);
    ok('polygonArea(plan.interior) ~= 448.1', near(inArea, 448.1, 1.0), inArea.toFixed(2));
    // Winding-independence: reversing the vertex order must not flip the sign.
    ok('polygonArea is winding-independent', near(polygonArea([...studio.footprint].reverse()), fpArea, 1e-9));

    // ---- 3. flush OBBs must NOT overlap; genuinely intersecting ones must
    const A: OBB = { center: [0, 0], w: 2, d: 2, rot: 0 };
    const flush: OBB = { center: [2, 0], w: 2, d: 2, rot: 0 };
    ok('two flush OBBs do NOT overlap', obbOverlap(A, flush) === false);
    ok('flush OBB overlap area is 0', obbOverlapArea(A, flush) === 0);
    const hit: OBB = { center: [1.9, 0], w: 2, d: 2, rot: 0 };
    ok('two overlapping OBBs DO overlap', obbOverlap(A, hit) === true);
    const rotHit: OBB = { center: [1.35, 0], w: 2, d: 2, rot: 45 };
    ok('rotated OBB overlap detected by SAT', obbOverlap(A, rotHit) === true);
    const rotMiss: OBB = { center: [1.0 + Math.SQRT2 + 0.01, 0], w: 2, d: 2, rot: 45 };
    ok('rotated OBB just clear of A does NOT overlap', obbOverlap(A, rotMiss) === false);

    // ---- 4. obbOverlapArea against closed-form answers
    const quarter = obbOverlapArea(A, { center: [1, 1], w: 2, d: 2, rot: 0 });
    ok('obbOverlapArea(2x2 @0,0 , 2x2 @1,1) === 1', near(quarter, 1, 1e-9), quarter.toFixed(6));
    // Two coincident side-2 squares 45 deg apart intersect in a regular octagon
    // of inradius 1, area 8 * tan(22.5) = 8 * (sqrt(2) - 1) = 3.313708...
    const octagon = obbOverlapArea(A, { center: [0, 0], w: 2, d: 2, rot: 45 });
    const expectOct = 8 * (Math.SQRT2 - 1);
    ok(`obbOverlapArea(square, square@45) === 8(sqrt2-1) = ${expectOct.toFixed(6)}`, near(octagon, expectOct, 1e-9), octagon.toFixed(6));

    // ---- 5. sanity on the derived plan geometry (not required, but cheap)
    const w1 = studio.walls.find((w) => w.id === 'W1')!;
    const s1 = wallSolid(w1);
    ok('wallSolid(W1) extends inward to the interior face y=0.63', near(s1.center[1], 0.315, 1e-9) && near(s1.d, 0.63, 1e-9), `centre y ${s1.center[1].toFixed(3)}`);
    const p1 = studio.walls.find((w) => w.id === 'P1')!;
    const sp1 = wallSolid(p1);
    ok('wallSolid(P1) is centred on its centerline', near(sp1.center[0], p1.start[0], 1e-9));
    const d2 = studio.openings.find((o) => o.id === 'D2')!;
    const segD2 = openingSegment(studio, d2);
    ok('openingSegment(D2) jambs walk the wall from start', near(segD2.a[1], 13.12, 1e-9) && near(segD2.b[1], 16.3, 1e-9), `y ${segD2.a[1].toFixed(2)}..${segD2.b[1].toFixed(2)}`);
    const swing = doorSwingPolygon(studio, d2);
    const tip = swing[swing.length - 1]!;
    ok('door D2 swings WEST into the entry nook', swing.length === 14 && near(tip[0], 30.36 - d2.width, 1e-9) && near(tip[1], segD2.a[1], 1e-9), `tip [${tip[0].toFixed(2)}, ${tip[1].toFixed(2)}]`);
    ok('pointInPolygon: interior centre is inside', pointInPolygon([5, 10], studio.interior));
    ok('pointInPolygon: boundary vertex counts as inside', pointInPolygon(studio.interior[0]!, studio.interior));
    ok('pointInPolygon: outside the footprint is outside', pointInPolygon([-1, -1], studio.interior) === false);

    // ---- 6. clearanceObb sits in front (+y at rot 0)
    const cl = clearanceObb({ center: [5, 5], w: 6, d: 3, rot: 0 }, 2);
    ok('clearanceObb at rot 0 sits to the +y (south) side', near(cl.center[0], 5, 1e-12) && near(cl.center[1], 5 + 1.5 + 1, 1e-12), `centre [${cl.center[0]}, ${cl.center[1]}]`);

    // ---- 7. grid / field / path round trip on the real plan
    const grid = buildGrid(studio, studio.fixtures.map(fixtureObb));
    let free = 0;
    let blocked = 0;
    for (let i = 0; i < grid.data.length; i++) {
      if (grid.data[i] === FREE) free++;
      else if (grid.data[i] === BLOCKED) blocked++;
    }
    const cellSq = grid.cell * grid.cell;
    ok('buildGrid is ~122 x 80 at the 0.25 ft default', grid.cols === 122 && grid.rows === 80, `${grid.cols} x ${grid.rows}`);
    // The rasterised floor should be the interior polygon MINUS the partition
    // solids that stand inside it (P1-P3 around the bath); exterior wall solids
    // lie outside `interior` by construction and must not eat any floor.
    const partSolidArea = studio.walls
      .filter((w) => w.kind === 'partition')
      .reduce((s, w) => s + obbArea(wallSolid(w)), 0);
    const rasterArea = (free + blocked) * cellSq;
    ok('grid floor area === interior area - partition solids', near(rasterArea, inArea - partSolidArea, 1.5), `${rasterArea.toFixed(1)} vs ${(inArea - partSolidArea).toFixed(1)} sq ft`);
    const field = clearanceField(grid);
    const path = findPath(grid, [2, 10], [28, 16]);
    ok('findPath crosses the studio from the west wall to the entry', path !== null && path.length > 60, path ? `${path.length} waypoints` : 'null');
    if (path) {
      const width = pathClearance(grid, field, path);
      ok('pathClearance returns a plausible corridor width', width > 0.5 && width < 20, `${width.toFixed(2)} ft`);
    }
    ok('findPath returns null for an unreachable target', findPath(grid, [2, 10], [-20, -20]) === null);
    ok('clearanceField is 0 inside a fixture', field[gridIndexAt(grid, [4, 18])[1] * grid.cols + gridIndexAt(grid, [4, 18])[0]!] === 0);

    // ---- 8. clipPolygon is winding-agnostic
    const sq: Vec2[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const clipA = clipPolygon(sq, [[1, 1], [3, 1], [3, 3], [1, 3]]);
    const clipB = clipPolygon(sq, [[1, 1], [1, 3], [3, 3], [3, 1]]);
    ok('clipPolygon handles CW and CCW clips identically', near(polygonArea(clipA), 1, 1e-12) && near(polygonArea(clipB), 1, 1e-12), `${polygonArea(clipA)} / ${polygonArea(clipB)}`);

    console.log(`\n${count - failures}/${count} assertions passed`);
    if (failures > 0) {
      console.error(`${failures} assertion(s) FAILED`);
      process.exitCode = 1;
    }
  })();
}
