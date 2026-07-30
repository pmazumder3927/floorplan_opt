/**
 * Scene assembly for the 3D renderer.
 *
 * COORDINATE MAPPING (the only mapping in the whole file)
 *   plan (x, y)  ->  world (x, height, y)      i.e. world +Z is plan SOUTH
 *   world +Y is up, everything is in FEET.
 *
 * ROTATION SIGN — proven once, used everywhere below:
 *   The plan convention is degrees CLOCKWISE ON THE PAGE with +y pointing
 *   DOWN, so rotating a plan vector by t maps
 *        (x, y) -> (x cos t - y sin t,  x sin t + y cos t)
 *   (check: (0,1) at t=90 -> (-1, 0), i.e. plan south rotates to plan west —
 *   which is what "clockwise on the page" means with y down.)
 *   three.js rotation.y = p maps
 *        (X, Z) -> (X cos p + Z sin p,  -X sin p + Z cos p)
 *   Substituting X=x, Z=y and matching terms gives cos p = cos t and
 *   sin p = -sin t, therefore
 *        rotation.y = -toRad(item.rot)
 *   Sanity check with the spec case: buildFurniture() puts the FRONT of a piece
 *   on local +z. At rot = 0 -> rotation.y = 0 -> front stays on world +z =
 *   plan south, so a sofa at rot 0 has its back to the NORTH wall and faces the
 *   SOUTH wall. Correct.
 *
 * CHEAPNESS RULES (headless swiftshader): no post-processing, ONE shadow-casting
 * directional light with a 2048 map, no shadow casting on point lights,
 * primitives only, and geometry/material reuse via ./furniture + ./materials.
 *
 * WHAT THE REFERENCE PHOTO CHANGES (data/reference/unit-photo-living-west.jpeg)
 *   - The west openings are FLOOR-TO-CEILING glazed assemblies in black anodised
 *     aluminium, not punched windows: plan.ts now gives them sill = 0 and
 *     head = ceiling - 4". So a window with sill ~= 0 goes down the
 *     addGlazedAssembly() path (frame + mullions + one operable leaf + inset
 *     glass, set back into the outer third of the wall so the jamb reveal
 *     reads). Anything with a real sill keeps the old punched-window path.
 *   - The ceiling is an EXPOSED CONCRETE soffit with small recessed circular
 *     downlights, so opts.showCeiling uses the concrete material and scatters
 *     4" downlights over the living area plus one over the kitchen run.
 *   - There is effectively NO baseboard: what is left here is a minimal reveal.
 */

import * as THREE from 'three';
import { FTIN, IN } from '@/core/units';
import type {
  CameraPreset,
  Fixture,
  FloorPlan,
  FurnitureDef,
  Layout,
  Opening,
  Render3DOptions,
  Vec2,
  Vec3,
  Wall,
} from '@/core/types';
import {
  doorSwingPolygon,
  openingSegment,
  pointInPolygon,
  polygonBounds,
  polygonCentroid,
  wallAxis,
} from '@/core/geometry';
import { getDef } from '@/core/catalog';
import { MAT, matFor } from './materials';
import { addBar, addBox, addCyl, addPanels, addPlanBox, addSphere, buildFurniture } from './furniture';
import type { PartOpts } from './furniture';

/**
 * Fallback aim height for a camera pointed at the glazing, used only when a plan
 * declares no windows at all. It is the mid-height of a conventional punched
 * window (sill 2'-6", head 7'-0"); the real number for THIS unit comes from the
 * openings themselves via glazingMidHeight().
 */
const WIN_MID_H = FTIN(4, 9);

const D2R = Math.PI / 180;

/**
 * The exposed structural soffit.
 *
 * materials.ts is gaining a MAT.concrete for the board-formed slab that the
 * reference photo shows overhead. That module is being rewritten in parallel with
 * this one, so the material is resolved BY NAME at runtime — `MAT.concrete` when
 * it exists, else `MAT.ceiling`, else a local grey — which keeps this file
 * compiling and rendering against either version of materials.ts.
 */
const MAT_BY_NAME = MAT as unknown as Record<string, THREE.MeshStandardMaterial | undefined>;
function soffitMaterial(): THREE.MeshStandardMaterial {
  return (
    MAT_BY_NAME.concrete ??
    MAT_BY_NAME.ceiling ??
    // Fair-faced grey concrete: albedo ~#b8b6b2, high roughness, not metal.
    matFor('#b8b6b2', { roughness: 0.88, metalness: 0.02, name: 'soffit-concrete' })
  );
}

// ---------------------------------------------------------------- small helpers

function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}
function addv(a: Vec2, b: Vec2, s = 1): Vec2 {
  return [a[0] + b[0] * s, a[1] + b[1] * s];
}
function normv(v: Vec2): Vec2 {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}
/** Signed area of a 2D loop; positive = counter-clockwise in a y-up frame. */
function signedArea(pts: THREE.Vector2[]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  }
  return a / 2;
}

/**
 * A flat polygon slab at height `y`. Built as a THREE.Shape so an L-shaped
 * interior is a real L and not a bounding rectangle.
 *
 * Winding note: the shape is authored with points (x, -planY) and rotated
 * -90 deg about X, which maps local (x, s, 0) -> world (x, 0, -s) = (x, 0, planY)
 * and takes the local +Z normal to world +Y (up). For a downward-facing slab
 * (a ceiling) author (x, +planY) and rotate +90 instead.
 */
function polygonSlab(poly: Vec2[], y: number, mat: THREE.Material, faceUp: boolean, name: string): THREE.Mesh {
  const pts = poly.map((p) => new THREE.Vector2(p[0], faceUp ? -p[1] : p[1]));
  // Triangulation preserves the input winding, and the winding decides which
  // way the +Z face points. Force CCW so the slab's visible side is the one we
  // rotate toward the camera. (plan.interior is authored clockwise on the page,
  // which becomes clockwise again after the y flip, hence the reversal.)
  if (signedArea(pts) < 0) pts.reverse();
  const shape = new THREE.Shape(pts);
  const geo = new THREE.ShapeGeometry(shape);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = faceUp ? -Math.PI / 2 : Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  m.castShadow = false;
  m.name = name;
  return m;
}

/** Shrink a convex polygon toward its centroid by `by` feet (used for the tile inset). */
function insetPolygon(poly: Vec2[], by: number): Vec2[] {
  const c = polygonCentroid(poly);
  return poly.map((p) => {
    const v: Vec2 = sub(p, c);
    const l = Math.hypot(v[0], v[1]) || 1;
    const k = Math.max(0, (l - by) / l);
    return [c[0] + v[0] * k, c[1] + v[1] * k] as Vec2;
  });
}

// ---------------------------------------------------------------- wall frames

/**
 * 1-D frame for a wall: `s` runs 0..length from Wall.start along `dir`, and `v`
 * runs across the wall along the right-hand normal `normal` = (-dy, dx).
 *
 * Where the solid sits in v:
 *   exterior + interiorSide 'right' : start/end are the OUTER face and the
 *       interior is on +normal, so the solid is v in [0, t] and the room face
 *       is at v = t.
 *   exterior + interiorSide 'left'  : mirrored, v in [-t, 0], room face v = -t.
 *   partition                       : start/end are the CENTERLINE, so the
 *       solid is v in [-t/2, +t/2] and BOTH faces are room faces.
 */
interface WallFrame {
  wall: Wall;
  dir: Vec2;
  normal: Vec2;
  length: number;
  vLo: number;
  vHi: number;
  /** each room-facing face: its v coordinate and the outward direction (+1/-1 in v) */
  faces: { v: number; out: 1 | -1 }[];
}

function wallFrame(w: Wall): WallFrame {
  const ax = wallAxis(w);
  const t = w.thickness;
  if (w.kind === 'partition') {
    return {
      wall: w,
      dir: ax.dir,
      normal: ax.normal,
      length: ax.length,
      vLo: -t / 2,
      vHi: t / 2,
      faces: [
        { v: t / 2, out: 1 },
        { v: -t / 2, out: -1 },
      ],
    };
  }
  const right = (w.interiorSide ?? 'right') === 'right';
  return {
    wall: w,
    dir: ax.dir,
    normal: ax.normal,
    length: ax.length,
    vLo: right ? 0 : -t,
    vHi: right ? t : 0,
    faces: [{ v: right ? t : -t, out: right ? 1 : -1 }],
  };
}

/** plan point at (s, v) in a wall's local frame */
function wallPoint(f: WallFrame, s: number, v: number): Vec2 {
  return [
    f.wall.start[0] + f.dir[0] * s + f.normal[0] * v,
    f.wall.start[1] + f.dir[1] * s + f.normal[1] * v,
  ];
}

/**
 * Add a box spanning s0..s1, y0..y1, v0..v1 in a wall's local frame.
 *
 * Degenerate spans are DROPPED, not clamped: that is what lets the caller write
 * the wall's interval arithmetic without special-casing every collapse (a header
 * over a head-at-ceiling opening, an apron under a sill-at-floor opening, a
 * reveal in a wall too thin to have one).
 */
function wallBox(
  parent: THREE.Object3D,
  mat: THREE.Material,
  f: WallFrame,
  s0: number,
  s1: number,
  y0: number,
  y1: number,
  v0: number,
  v1: number,
  name: string,
  opt: PartOpts = {},
): void {
  const len = s1 - s0;
  const h = y1 - y0;
  const thick = Math.abs(v1 - v0);
  if (len <= 1e-4 || h <= 1e-4 || thick <= 1e-4) return;
  const c = wallPoint(f, (s0 + s1) / 2, (v0 + v1) / 2);
  addPlanBox(parent, mat, len, h, thick, c, f.dir, (y0 + y1) / 2, { ...opt, name });
}

// ---------------------------------------------------------------- walls

interface WallOpening {
  o: Opening;
  s0: number;
  s1: number;
}

/**
 * One wall, minus its openings, WITHOUT CSG.
 *
 * The wall is a 1-D interval [0, L] along the wall with a set of openings
 * [s0, s1] cut out of it. Sorting the openings by s0 turns the boolean
 * subtraction into three families of plain boxes:
 *
 *   PIERS   full-height boxes on the gaps  [cursor, o.s0]  and finally
 *           [cursor, L]. `cursor` starts at 0 and jumps to each o.s1.
 *   HEADERS a box over each opening, from o.head up to the top of the wall —
 *           EMITTED ONLY when there is real wall left above the head. The west
 *           glazing heads at ceiling - 4", so that strip is 4" of real wall; an
 *           opening whose head reaches (or is cut above) `top` gets nothing.
 *   APRONS  a box under each opening, from 0 up to o.sill — EMITTED ONLY when
 *           the opening really has a sill. Doors, passages and the corrected
 *           full-height glazing all sit on the slab (sill = 0), so there is no
 *           apron below the glass at all.
 *
 * Everything is clamped to `top` (= wall.height, or opts.wallCutHeight when the
 * caller wants to see inside), so a cut wall just loses its headers.
 */
function addWall(root: THREE.Object3D, plan: FloorPlan, w: Wall, top: number, cut: boolean): void {
  const f = wallFrame(w);
  const L = f.length;
  const g = new THREE.Group();
  g.name = `wall:${w.id}`;
  root.add(g);

  /**
   * The intervals to subtract. Full-height glazing is subtracted PER BAY, not per
   * opening: the 4" gaps between lites of one assembly are mullions, so emitting
   * a full-height plaster pier there would split one glazed bay into two framed
   * slots. Everything else (doors, passages, punched windows) is subtracted as
   * itself.
   */
  interface Cut {
    id: string;
    s0: number;
    s1: number;
    head: number;
    sill: number;
  }

  const bays = glazingBays(plan, w, L);
  const glazed = new Set(bays.flatMap((b) => b.members.map((m) => m.id)));
  const ops: Cut[] = [
    ...bays.map((b) => ({
      id: b.members[0]!.id,
      s0: b.s0,
      s1: b.s1,
      head: b.head,
      sill: b.sill,
    })),
    ...plan.openings
      .filter((o) => o.wall === w.id && !glazed.has(o.id))
      .map((o) => ({
        id: o.id,
        s0: Math.max(0, o.offset),
        s1: Math.min(L, o.offset + o.width),
        head: o.head,
        sill: o.sill,
      })),
  ]
    .filter((x) => x.s1 > x.s0)
    .sort((a, b) => a.s0 - b.s0);

  let cursor = 0;
  for (const o of ops) {
    const { s0, s1 } = o;
    // PIER between the previous opening (or the wall start) and this one
    if (s0 > cursor) wallBox(g, MAT.wall, f, cursor, s0, 0, top, f.vLo, f.vHi, `wall:${w.id}/pier`);
    /**
     * HEADER above the opening. `head` is clamped to `top` first, so an opening
     * whose head is AT the top of the wall (head-at-ceiling glazing) or ABOVE it
     * (sliced by opts.wallCutHeight) yields headerH <= 0 and the box collapses to
     * nothing instead of being emitted zero- or negative-height.
     */
    const headerH = top - Math.min(o.head, top);
    if (headerH > 0.01) {
      wallBox(g, MAT.wall, f, s0, s1, Math.min(o.head, top), top, f.vLo, f.vHi, `wall:${w.id}/header:${o.id}`);
    }
    /**
     * APRON below a window sill — CONDITIONAL, because with sill = 0 there is no
     * apron below the glass at all. The 0.01' (1/8") epsilon also stops a
     * rounding-noise sill from emitting a sliver box that would z-fight the
     * glazing track sitting on the slab.
     */
    if (o.sill > 0.01) {
      wallBox(g, MAT.wall, f, s0, s1, 0, Math.min(o.sill, top), f.vLo, f.vHi, `wall:${w.id}/apron:${o.id}`);
    }
    cursor = Math.max(cursor, s1);
  }
  // final PIER out to the end of the wall
  if (cursor < L) wallBox(g, MAT.wall, f, cursor, L, 0, top, f.vLo, f.vHi, `wall:${w.id}/pier`);

  // Section-cut cap so a cut-down wall reads as a drawing section, not a
  // hollow tube. Raised 1/16" above the wall and narrowed 1/16" on each side so
  // none of its faces is coplanar with the piers (coplanar faces z-fight).
  if (cut) {
    const capT = 0.05;
    wallBox(g, MAT.wallTop, f, 0, L, top - capT, top + 0.005, f.vLo + 0.005, f.vHi - 0.005, `wall:${w.id}/cut-cap`);
  }

  /**
   * BASEBOARD — a MINIMAL REVEAL, not a moulding.
   *
   * The reference photo shows essentially no base: where the wall meets the dark
   * plank floor there is at most a thin flush reveal, and at the glazing there is
   * nothing at all (the aluminium track lands straight on the slab). So this is
   * 2 1/2" tall and only 1/4" proud — enough to catch a shadow line and hide the
   * floor/wall joint, far too slim to read as trim.
   *
   * It breaks across every FLOOR-level opening (sill <= 0.05'), which now
   * includes the full-height glazing, so the glass runs to the floor uninterrupted.
   */
  const BASE_H = IN(2.5);
  const BASE_T = IN(0.25);
  const floorOps = ops.filter((x) => x.sill <= 0.05);
  for (const face of f.faces) {
    let c = 0;
    const runs: [number, number][] = [];
    for (const { s0, s1 } of floorOps) {
      if (s0 > c) runs.push([c, s0]);
      c = Math.max(c, s1);
    }
    if (c < L) runs.push([c, L]);
    for (const [a, b] of runs) {
      // sits proud of the face by BASE_T, i.e. from v=face.v outward
      wallBox(g, MAT.baseboard, f, a, b, 0, Math.min(BASE_H, top), face.v, face.v + face.out * BASE_T, `wall:${w.id}/base`);
    }
  }
}

// ------------------------------------------------ re-entrant corner fills

/**
 * RE-ENTRANT CORNER FILLS — the 3D twin of the poché corner clean-up in
 * render2d/svg.ts.
 *
 * Every wall solid stops dead at its own endpoint. At a CONVEX corner the two
 * solids overlap and the corner is made for free; at a RE-ENTRANT (inside)
 * corner they only touch at a point and leave an empty square the size of the
 * two thicknesses. In the 2D drawing that is a notch in the poché. In 3D it is
 * a FULL-HEIGHT HOLE STRAIGHT THROUGH THE BUILDING ENVELOPE:
 *
 *   north step  W2 ends at (10.53, 2.59), W3 starts there   -> 7 1/2" x 7 1/2"
 *   east step   W4 ends at (26.90, 11.65), W5 starts there  -> 7 1/2" x 7 1/2"
 *                                            (P3 fills part of it)
 *   south step  W7 ends at (17.35, 18.99), W8 starts there  -> 7 1/2" x 7 1/2"
 *
 * A flood fill at 5'-0" AFF walks from the street into the flat through the
 * first two, and the path-traced top view shows daylight down them. So they get
 * filled with a plain box each.
 *
 * The test for "is this corner already made" is not a turn-direction rule but
 * the thing itself: build the candidate square and ask whether either wall's
 * solid already contains its centre. That is assumption-free — it stays correct
 * for a wall list in any order, any winding, and either `interiorSide`.
 *
 * The square is then trimmed against every OTHER wall solid (the east step is
 * half-filled by partition P3) so a fill never lands inside existing geometry:
 * overlapping coplanar faces are exactly what z-fights.
 */
interface PlanRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const RECT_EPS = 1e-4;

/** Plan-space AABB of a wall's solid, or null if the wall is not axis-aligned. */
function wallRect(w: Wall): PlanRect | null {
  const dx = w.end[0] - w.start[0];
  const dy = w.end[1] - w.start[1];
  if (Math.abs(dx) > RECT_EPS && Math.abs(dy) > RECT_EPS) return null;
  const f = wallFrame(w);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of [0, f.length]) {
    for (const v of [f.vLo, f.vHi]) {
      const p = wallPoint(f, s, v);
      xs.push(p[0]);
      ys.push(p[1]);
    }
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function rectHas(r: PlanRect, p: Vec2): boolean {
  return p[0] > r.x0 + RECT_EPS && p[0] < r.x1 - RECT_EPS && p[1] > r.y0 + RECT_EPS && p[1] < r.y1 - RECT_EPS;
}

/** `a` minus `b`, as up to four axis-aligned pieces. */
function rectSubtract(a: PlanRect, b: PlanRect): PlanRect[] {
  const ix0 = Math.max(a.x0, b.x0);
  const iy0 = Math.max(a.y0, b.y0);
  const ix1 = Math.min(a.x1, b.x1);
  const iy1 = Math.min(a.y1, b.y1);
  if (ix1 - ix0 <= RECT_EPS || iy1 - iy0 <= RECT_EPS) return [a]; // no real overlap
  const out: PlanRect[] = [];
  if (ix0 - a.x0 > RECT_EPS) out.push({ x0: a.x0, y0: a.y0, x1: ix0, y1: a.y1 });
  if (a.x1 - ix1 > RECT_EPS) out.push({ x0: ix1, y0: a.y0, x1: a.x1, y1: a.y1 });
  if (iy0 - a.y0 > RECT_EPS) out.push({ x0: ix0, y0: a.y0, x1: ix1, y1: iy0 });
  if (a.y1 - iy1 > RECT_EPS) out.push({ x0: ix0, y0: iy1, x1: ix1, y1: a.y1 });
  return out;
}

/** Inward unit normal of a wall (the side the interior is on). */
function inwardNormal(w: Wall): Vec2 {
  const ax = wallAxis(w);
  const s = (w.interiorSide ?? 'right') === 'right' ? 1 : -1;
  return [ax.normal[0] * s, ax.normal[1] * s];
}

function addCornerFills(root: THREE.Object3D, plan: FloorPlan, top: number, cut: boolean): void {
  const ext = plan.walls.filter((w) => w.kind === 'exterior');
  const rects = new Map<string, PlanRect>();
  for (const w of plan.walls) {
    const r = wallRect(w);
    if (r) rects.set(w.id, r);
  }
  const g = new THREE.Group();
  g.name = 'wall:corner-fills';

  for (const a of ext) {
    for (const b of ext) {
      if (a === b) continue;
      if (Math.hypot(a.end[0] - b.start[0], a.end[1] - b.start[1]) > 1e-3) continue;
      const ra = rects.get(a.id);
      const rb = rects.get(b.id);
      if (!ra || !rb) continue; // a non-axis-aligned wall: leave the corner alone
      const ia = inwardNormal(a);
      const ib = inwardNormal(b);
      const p = a.end;
      const q: Vec2 = [
        p[0] + ia[0] * a.thickness + ib[0] * b.thickness,
        p[1] + ia[1] * a.thickness + ib[1] * b.thickness,
      ];
      const fill: PlanRect = {
        x0: Math.min(p[0], q[0]),
        y0: Math.min(p[1], q[1]),
        x1: Math.max(p[0], q[0]),
        y1: Math.max(p[1], q[1]),
      };
      if (fill.x1 - fill.x0 <= RECT_EPS || fill.y1 - fill.y0 <= RECT_EPS) continue;
      const mid: Vec2 = [(fill.x0 + fill.x1) / 2, (fill.y0 + fill.y1) / 2];
      // Already made? A convex corner's two solids overlap right here.
      if (rectHas(ra, mid) || rectHas(rb, mid)) continue;

      // Trim against everything else so no fill overlaps existing geometry.
      let pieces: PlanRect[] = [fill];
      for (const [id, r] of rects) {
        if (id === a.id || id === b.id) continue;
        pieces = pieces.flatMap((piece) => rectSubtract(piece, r));
      }
      for (const r of pieces) {
        const w = r.x1 - r.x0;
        const d = r.y1 - r.y0;
        if (w <= RECT_EPS || d <= RECT_EPS) continue;
        const c: Vec2 = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
        addPlanBox(g, MAT.wall, w, top, d, c, [1, 0], top / 2, {
          name: `wall:corner-fill:${a.id}-${b.id}`,
        });
        if (cut) {
          const capT = 0.05;
          addPlanBox(g, MAT.wallTop, w - 0.01, capT + 0.005, d - 0.01, c, [1, 0], top - capT / 2 + 0.0025, {
            name: `wall:corner-fill:${a.id}-${b.id}/cut-cap`,
          });
        }
      }
    }
  }
  if (g.children.length) root.add(g);
}

/** A window that starts on the slab is a full-height glazed assembly, not a punched hole. */
function isFullHeightGlazing(o: Opening): boolean {
  return o.kind === 'window' && o.sill <= 0.01;
}

/**
 * Casing (trim) + glazing + sill for one opening.
 *
 * TWO PATHS:
 *   sill  > 0  PUNCHED WINDOW (and every door/passage): 3" flat casing 1/2" proud
 *              of each room face, a single pane on the wall centre plane, a stool
 *              at the sill. Kept working for any future plan.
 *   sill == 0  FULL-HEIGHT GLAZING: a real assembly, see addGlazedAssembly().
 */
function addOpeningDetails(root: THREE.Object3D, plan: FloorPlan, o: Opening, top: number): void {
  const w = plan.walls.find((x) => x.id === o.wall);
  if (!w) return;
  const f = wallFrame(w);
  const L = f.length;
  const s0 = Math.max(0, o.offset);
  const s1 = Math.min(L, o.offset + o.width);
  if (s1 <= s0) return;
  const head = Math.min(o.head, top);
  if (head <= o.sill + 0.05) return; // fully swallowed by a wall cut

  if (isFullHeightGlazing(o)) {
    /**
     * One assembly per BAY, not per opening. The bay's first member builds it
     * across the whole merged span and every other member returns silently,
     * otherwise each lite would get its own perimeter frame and plaster return
     * where the building has only a slim mullion.
     */
    const bay = glazingBays(plan, w, L).find((b) => b.members.some((m) => m.id === o.id));
    if (!bay || bay.members[0]!.id !== o.id) return;
    addGlazedAssembly(root, plan, w, f, o, bay.s0, bay.s1, top, bay.joints);
    return;
  }

  const g = new THREE.Group();
  g.name = `opening:${o.id}`;
  root.add(g);

  const CASE_W = IN(3);
  const CASE_T = IN(0.5);
  // If a wall cut has sliced the head off the opening there is no header left to
  // trim, and the casing must stop at the cut instead of poking out of it.
  const headCased = o.head + CASE_W <= top;
  const caseTop = Math.min(head + CASE_W, top);
  for (const face of f.faces) {
    const v0 = face.v;
    const v1 = face.v + face.out * CASE_T;
    // jambs, extended up to cover the head casing corners
    wallBox(g, MAT.trim, f, s0 - CASE_W, s0, o.sill, caseTop, v0, v1, `opening:${o.id}/case-jamb`);
    wallBox(g, MAT.trim, f, s1, s1 + CASE_W, o.sill, caseTop, v0, v1, `opening:${o.id}/case-jamb`);
    // head
    if (headCased) {
      wallBox(g, MAT.trim, f, s0 - CASE_W, s1 + CASE_W, head, head + CASE_W, v0, v1, `opening:${o.id}/case-head`);
    }
    // window stool (sill board) on the room side
    if (o.kind === 'window' && o.sill > 0) {
      const STOOL = IN(1.5);
      wallBox(
        g,
        MAT.trim,
        f,
        s0 - CASE_W,
        s1 + CASE_W,
        o.sill - IN(1.25),
        o.sill,
        v0 - face.out * (w.thickness * 0.5),
        v1 + face.out * STOOL,
        `opening:${o.id}/stool`,
      );
    }
  }

  if (o.kind === 'window') {
    // glazing on the wall centre plane; never casts (it would blot out the sun)
    const vc = (f.vLo + f.vHi) / 2;
    const c = wallPoint(f, (s0 + s1) / 2, vc);
    addPlanBox(g, MAT.glass, s1 - s0, head - o.sill, IN(0.5), c, f.dir, (o.sill + head) / 2, {
      name: `opening:${o.id}/glass`,
      cast: false,
      recv: false,
    });
    // a 1x2 muntin at mid-height so the pane reads as a window, not a hole
    addPlanBox(g, MAT.trim, s1 - s0, IN(1.5), IN(1.5), c, f.dir, (o.sill + head) / 2, {
      name: `opening:${o.id}/muntin`,
      cast: false,
    });
  }
}

// ------------------------------------------------- full-height glazed assembly

/**
 * Dimensions of the glazed assembly, from the reference photo cross-checked
 * against real slim-profile aluminium slider stock (Milgard AX550 / Fleetwood
 * 3070-class: 2" faces, ~3" deep frames, 1" IGUs, 4"-6" leaf bottom rails).
 */
const GLZ = {
  /** Perimeter frame FACE width — "slim" is the whole point of this system. */
  FACE: IN(2),
  /** Frame depth front-to-back (a thermally broken 2 x 3 tube). */
  DEPTH: IN(3),
  /**
   * How far the frame is set back from the EXTERIOR face of the wall.
   *
   * 3 1/2" in a 7" wall lands the frame's ROOM face about 1/2" behind the room
   * face of the wall — i.e. very nearly flush, which is what the photo shows.
   * At the old 1" the frame sat in the outer third and left a 3" white plaster
   * return around every opening; that bright outline was the most CAD-looking
   * thing left in the render. Clamped below against the real wall thickness, so
   * a thinner future wall still cannot push the frame out of its own faces.
   */
  SETBACK: IN(3.5),
  /** Plaster return lining the hole from the room face back to the frame. */
  LINER: IN(0.75),
  /** Intermediate vertical mullion — a shade beefier than the perimeter face. */
  MULLION: IN(2.5),
  /** Target daylight panel width; panel count = round(glass width / this). */
  PANEL: FTIN(3, 3),
  /** 1" double-glazed IGU. */
  GLASS: IN(1),
  /** Operable leaf: stile width, bottom rail, top rail. */
  STILE: IN(1.75),
  RAIL: IN(6),
  TOP_RAIL: IN(2.25),
} as const;

/**
 * A gap between two full-height openings up to this wide is a MULLION inside one
 * glazed assembly, not a structural pier.
 *
 * This is the difference between the drawing and the building. The traced plan
 * lists four separate openings on the west wall, but the gaps between them are
 * 4", 16" and 4" — and a 4" gap is not a piece of wall you could build, it is the
 * mullion between two lites of one assembly. Only the 16" gap is real structure.
 * So the west wall is really TWO glazed bays (5'-9" and 6'-8") split by a single
 * 1'-4" pier, which is exactly what the photograph shows. Modelling the 4" gaps
 * as wall gave four narrow framed slots instead.
 */
const MULLION_GAP_MAX = IN(6);

interface GlazingBay {
  members: Opening[];
  /** span along the wall, in wallFrame S coordinates */
  s0: number;
  s1: number;
  /** centres of the internal mullion gaps, in S coordinates */
  joints: number[];
  head: number;
  sill: number;
}

/**
 * Group the full-height glazing on one wall into buildable bays by merging any
 * openings separated by less than a real pier. `L` is the wall's frame length.
 */
function glazingBays(plan: FloorPlan, w: Wall, L: number): GlazingBay[] {
  const ops = plan.openings
    .filter((o) => o.wall === w.id && isFullHeightGlazing(o))
    .map((o) => ({ o, s0: Math.max(0, o.offset), s1: Math.min(L, o.offset + o.width) }))
    .filter((x) => x.s1 > x.s0)
    .sort((a, b) => a.s0 - b.s0);

  const bays: GlazingBay[] = [];
  for (const cur of ops) {
    const last = bays[bays.length - 1];
    if (last && cur.s0 - last.s1 <= MULLION_GAP_MAX + 1e-9) {
      last.joints.push((last.s1 + cur.s0) / 2);
      last.s1 = Math.max(last.s1, cur.s1);
      last.members.push(cur.o);
      last.head = Math.max(last.head, cur.o.head);
      last.sill = Math.min(last.sill, cur.o.sill);
    } else {
      bays.push({
        members: [cur.o],
        s0: cur.s0,
        s1: cur.s1,
        joints: [],
        head: cur.o.head,
        sill: cur.o.sill,
      });
    }
  }
  return bays;
}

/**
 * Which opening on a wall carries the OPERABLE (sliding) leaf.
 *
 * In the photo exactly one panel of the run has a rail across it, and it is the
 * inner panel of the southern pair — the one next to the wide structural pier,
 * i.e. the panel closest to the middle of the glazed run. That is also how these
 * assemblies are really laid out: the slider lands beside the pier so the fixed
 * lites take the ends of the run. So: nearest-to-mid-run wins, one per wall.
 */
function isOperableOpening(plan: FloorPlan, w: Wall, o: Opening, L: number): boolean {
  const sibs = plan.openings.filter((x) => x.wall === o.wall && isFullHeightGlazing(x));
  if (!sibs.length) return false;
  const lo = Math.min(...sibs.map((x) => x.offset));
  const hi = Math.max(...sibs.map((x) => x.offset + x.width));
  const mid = (lo + hi) / 2;
  let best = sibs[0];
  let bestD = Infinity;
  for (const x of sibs) {
    const d = Math.abs(x.offset + x.width / 2 - mid);
    if (d < bestD - 1e-9) {
      bestD = d;
      best = x;
    }
  }
  /**
   * Answer for the BAY, not the lite. Assemblies are built once per bay by the
   * bay's first member, and the lite nearest the middle of the run is usually NOT
   * that first member — asking about the lite directly returns false for every
   * bay lead and the run silently loses its sliding leaf altogether. So: the bay
   * that contains the middle-most lite is the operable one, and its lead builds
   * the leaf (in the panel nearest the run's middle, i.e. beside the pier).
   */
  const bay = glazingBays(plan, w, L).find((b) => b.members.some((m) => m.id === best!.id));
  return bay ? bay.members[0]!.id === o.id : best!.id === o.id;
}

/**
 * A REAL full-height glazed assembly: black anodised aluminium perimeter frame,
 * vertical mullions at ~3'-3" centres, one operable leaf with a bottom rail, glass
 * inset into the frame, and a plaster reveal returning into the wall thickness.
 *
 * DEPTH IS THE WHOLE POINT. The old code put a single pane on the wall's CENTRE
 * plane and then covered the jambs with applied casing, so the opening read as a
 * sticker. Here the frame is pushed into the OUTER third of the wall
 * (SETBACK 1" in from the exterior face, 3" deep), which leaves ~3" of wall depth
 * between the room face and the frame. That depth is lined with a plaster return
 * (LINER) on both jambs and across the head, exactly as the photo shows, so from
 * inside you see: white reveal returning away from you, then the slim black frame,
 * then glass sitting a further ~1 1/2" back. No casing anywhere.
 *
 * `v` bookkeeping: wallFrame() puts the solid in [vLo, vHi] with the room-facing
 * face at faces[0].v, so depths are measured INWARD FROM THE EXTERIOR FACE via
 * depthAt(); that works for interiorSide 'left' and 'right' and for a partition
 * without any per-case branching.
 *
 * SHADOWS: every member here is cast:false. A 2" section is well under one texel
 * of the single 2048 shadow map spread over a 30' unit, so its "shadow" would be
 * pure acne, and the sun must pour through the opening unobstructed.
 */
function addGlazedAssembly(
  root: THREE.Object3D,
  plan: FloorPlan,
  w: Wall,
  f: WallFrame,
  o: Opening,
  s0: number,
  s1: number,
  top: number,
  joints: number[] = [],
): void {
  const n = `glazing:${o.id}`;
  const g = new THREE.Group();
  g.name = n;
  root.add(g);
  const NO_SHADOW: PartOpts = { cast: false };

  // ---- depth frame: d = 0 at the exterior face, d = tw at the room face
  const inward = f.faces[0].out;
  const tw = Math.abs(f.vHi - f.vLo);
  const vRoom = f.faces[0].v;
  const vOut = vRoom - inward * tw;
  const depthAt = (d: number): number => vOut + inward * d;

  // Fit the frame into whatever thickness the wall actually has: this wall is 7",
  // but a future plan could glaze a 4 1/2" partition, and the frame must never
  // poke out of either face.
  const fd = Math.min(GLZ.DEPTH, Math.max(IN(1), tw * 0.5));
  const sb = Math.min(GLZ.SETBACK, Math.max(0, tw - fd - IN(0.25)));
  const vf0 = depthAt(sb); // outboard face of the frame
  const vf1 = depthAt(sb + fd); // room-side face of the frame
  // Glass sits just outboard of the frame's mid-depth — inset into the frame, so
  // the frame face casts a shadow line onto the glass instead of being coplanar.
  const vg0 = depthAt(sb + fd * 0.55 - GLZ.GLASS / 2);
  const vg1 = depthAt(sb + fd * 0.55 + GLZ.GLASS / 2);
  // The operable leaf runs on the INBOARD track: its frame occupies the room-side
  // 55% of the frame depth and its glass is centred in that.
  const vl0 = depthAt(sb + fd * 0.45);
  const vl1 = vf1;
  const vlg0 = depthAt(sb + fd * 0.72 - GLZ.GLASS / 2);
  const vlg1 = depthAt(sb + fd * 0.72 + GLZ.GLASS / 2);

  // ---- vertical extent. `capped` = opts.wallCutHeight sliced the head off, in
  // which case there is no head member or head reveal to draw and everything
  // simply stops at the cut, matching the sectioned wall beside it.
  const sill = Math.max(0, o.sill);
  const hi = Math.min(o.head, top);
  const capped = o.head > top + 1e-6;

  // ---- plaster reveal returning into the wall thickness
  const lin = Math.min(GLZ.LINER, (s1 - s0) * 0.1);
  wallBox(g, MAT.wall, f, s0, s0 + lin, sill, hi, vf1, vRoom, `${n}/reveal-jamb`);
  wallBox(g, MAT.wall, f, s1 - lin, s1, sill, hi, vf1, vRoom, `${n}/reveal-jamb`);
  if (!capped) wallBox(g, MAT.wall, f, s0, s1, hi - lin, hi, vf1, vRoom, `${n}/reveal-head`);

  // ---- perimeter frame, inside the plaster line
  const a0 = s0 + lin;
  const a1 = s1 - lin;
  if (a1 - a0 <= GLZ.FACE * 2.5) return; // nonsense opening; the reveal alone will do
  wallBox(g, MAT.metalBlack, f, a0, a0 + GLZ.FACE, sill, hi, vf0, vf1, `${n}/frame-jamb`, NO_SHADOW);
  wallBox(g, MAT.metalBlack, f, a1 - GLZ.FACE, a1, sill, hi, vf0, vf1, `${n}/frame-jamb`, NO_SHADOW);
  // The track sits ON the slab — there is no sill and no apron below it.
  wallBox(g, MAT.metalBlack, f, a0 + GLZ.FACE, a1 - GLZ.FACE, sill, sill + GLZ.FACE, vf0, vf1, `${n}/track`, NO_SHADOW);
  if (!capped) {
    wallBox(g, MAT.metalBlack, f, a0 + GLZ.FACE, a1 - GLZ.FACE, hi - GLZ.FACE, hi, vf0, vf1, `${n}/frame-head`, NO_SHADOW);
  }

  // ---- glazed field, split into panels by vertical mullions
  const gs0 = a0 + GLZ.FACE;
  const gs1 = a1 - GLZ.FACE;
  const gy0 = sill + GLZ.FACE;
  const gy1 = capped ? hi : hi - GLZ.FACE;
  if (gy1 - gy0 <= 0.05) return;

  /**
   * Panel edges. The REAL joints come first — those are the actual mullions
   * between the merged lites, at their surveyed positions — and only then is each
   * remaining segment subdivided, and only if it is wider than a comfortable
   * daylight panel. Splitting purely on a target width would put mullions at
   * invented positions and miss the ones the building has.
   */
  const edges: number[] = [gs0];
  const stops = [gs0, ...joints.filter((j) => j > gs0 + 0.05 && j < gs1 - 0.05), gs1].sort(
    (a, b) => a - b,
  );
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    const sub = Math.max(1, Math.round((b - a) / GLZ.PANEL));
    for (let k = 1; k <= sub; k++) edges.push(a + ((b - a) * k) / sub);
  }
  const panels = edges.length - 1;
  for (let i = 1; i < panels; i++) {
    const c = edges[i]!;
    wallBox(g, MAT.metalBlack, f, c - GLZ.MULLION / 2, c + GLZ.MULLION / 2, gy0, gy1, vf0, vf1, `${n}/mullion`, NO_SHADOW);
  }

  // Which panel slides: the one nearest the middle of the whole glazed run
  // (see isOperableOpening). Openings this narrow are one panel each, so in this
  // plan that resolves to a single sliding leaf in the whole run, as photographed.
  let opIdx = -1;
  if (isOperableOpening(plan, w, o, f.length)) {
    const oCentre = (s0 + s1) / 2;
    let bestD = Infinity;
    for (let i = 0; i < panels; i++) {
      const d = Math.abs((edges[i]! + edges[i + 1]!) / 2 - oCentre);
      if (d < bestD) {
        bestD = d;
        opIdx = i;
      }
    }
  }

  for (let i = 0; i < panels; i++) {
    const p0 = edges[i]! + (i === 0 ? 0 : GLZ.MULLION / 2);
    const p1 = edges[i + 1]! - (i === panels - 1 ? 0 : GLZ.MULLION / 2);
    if (i === opIdx) {
      /**
       * OPERABLE LEAF. Stiles + a top rail + the deep BOTTOM RAIL that gives a
       * slider away in any photograph, all stepped forward onto the inboard track
       * so the leaf reads as a separate moving panel rather than more frame.
       *
       * Stated assumption: the bottom rail is modelled at the BASE of the leaf
       * where a real slider carries it (4"-6" of extrusion over the track). The
       * other horizontal line visible part-way up the photographed glass is the
       * roof parapet BEYOND the glazing, not part of the assembly, so it is not
       * modelled here.
       */
      wallBox(g, MAT.metalBlack, f, p0, p0 + GLZ.STILE, gy0, gy1, vl0, vl1, `${n}/leaf-stile`, NO_SHADOW);
      wallBox(g, MAT.metalBlack, f, p1 - GLZ.STILE, p1, gy0, gy1, vl0, vl1, `${n}/leaf-stile`, NO_SHADOW);
      wallBox(g, MAT.metalBlack, f, p0 + GLZ.STILE, p1 - GLZ.STILE, gy0, gy0 + GLZ.RAIL, vl0, vl1, `${n}/leaf-bottom-rail`, NO_SHADOW);
      wallBox(g, MAT.metalBlack, f, p0 + GLZ.STILE, p1 - GLZ.STILE, gy1 - GLZ.TOP_RAIL, gy1, vl0, vl1, `${n}/leaf-top-rail`, NO_SHADOW);
      wallBox(g, MAT.glass, f, p0 + GLZ.STILE, p1 - GLZ.STILE, gy0 + GLZ.RAIL, gy1 - GLZ.TOP_RAIL, vlg0, vlg1, `${n}/leaf-glass`, {
        cast: false,
        recv: false,
      });
    } else {
      wallBox(g, MAT.glass, f, p0, p1, gy0, gy1, vg0, vg1, `${n}/glass`, { cast: false, recv: false });
    }
  }

  g.traverse((node) => {
    node.userData = { ...node.userData, openingId: o.id, wallId: w.id, glazing: 'full-height' };
  });
}

/**
 * A door LEAF, drawn open.
 *
 * The hinge anchor comes from geometry.doorSwingPolygon() (its first vertex is
 * the hinge of the swing fan); we validate it against the opening's own
 * endpoints and fall back to deriving it from Opening.swing.hinge if the
 * geometry module ever changes its vertex order.
 *
 * Leaf direction: from the hinge, the CLOSED leaf points along the wall toward
 * the other jamb (u); opening it rotates u toward the side named by
 * swing.into ('right' = the right-hand normal (-dy, dx), 'left' = -that).
 * So leafDir = u*cos(a) + n*sin(a).
 */
function addDoorLeaf(root: THREE.Object3D, plan: FloorPlan, o: Opening, openDeg: number, top: number): void {
  const seg = openingSegment(plan, o);
  const swing = o.swing ?? { hinge: 'near' as const, into: 'right' as const, angle: 90 };
  const derived: Vec2 = swing.hinge === 'near' ? seg.a : seg.b;

  let hinge = derived;
  const poly = doorSwingPolygon(plan, o, 8);
  if (poly.length > 2) {
    const p0 = poly[0];
    const near = Math.hypot(p0[0] - seg.a[0], p0[1] - seg.a[1]);
    const far = Math.hypot(p0[0] - seg.b[0], p0[1] - seg.b[1]);
    // only trust it if it really is one of the two jambs
    if (Math.min(near, far) < 0.05) hinge = [p0[0], p0[1]];
  }
  // openingSegment puts the jambs on the wall's REFERENCE line (the outer face
  // for an exterior wall), but a door frame sits in the middle of the wall, so
  // move the pivot to the wall's centre plane before swinging the leaf.
  const wf = wallFrame(seg.wall);
  hinge = addv(hinge, wf.normal, (wf.vLo + wf.vHi) / 2);

  const u: Vec2 = swing.hinge === 'near' ? seg.dir : [-seg.dir[0], -seg.dir[1]];
  const n: Vec2 = swing.into === 'right' ? seg.normal : [-seg.normal[0], -seg.normal[1]];
  const a = openDeg * D2R;
  const leafDir = normv([u[0] * Math.cos(a) + n[0] * Math.sin(a), u[1] * Math.cos(a) + n[1] * Math.sin(a)]);

  const T = IN(1.75); // 1 3/4" solid-core leaf
  // A 6'-10" leaf standing inside a wall cut down to 4'-6" would be the only
  // thing sticking up out of the section, so the leaf is cut with the wall.
  const h = Math.min(o.head, top) - o.sill;
  if (h <= 0.05) return;
  const c = addv(hinge, leafDir, o.width / 2);
  const g = new THREE.Group();
  g.name = `door:${o.id}`;
  root.add(g);
  addPlanBox(g, MAT.trim, o.width, h, T, c, leafDir, o.sill + h / 2, { name: `door:${o.id}/leaf` });
  // knob at 36" (the standard height), 2 1/2" in from the leading edge, one on
  // each face. Offset along the leaf's normal (leafDir rotated -90 in plan).
  const knobAt = addv(hinge, leafDir, o.width - IN(2.5));
  const knobY = Math.min(o.sill + IN(36), o.sill + h - IN(3));
  for (const s of [1, -1]) {
    addSphere(g, MAT.chrome, [IN(2.2), IN(2.2), IN(2.2)], [
      knobAt[0] + leafDir[1] * s * T * 0.7,
      knobY,
      knobAt[1] - leafDir[0] * s * T * 0.7,
    ], { name: `door:${o.id}/knob` });
  }
}

// ---------------------------------------------------------------- fixtures

type FixKind =
  | 'counter'
  | 'upper'
  | 'sink'
  | 'range'
  | 'dishwasher'
  | 'fridge'
  | 'laundry'
  | 'closet'
  | 'tub'
  | 'toilet'
  | 'vanity'
  | 'generic';

/** Classify a Fixture from its id/name (the data model has no sub-type field). */
function fixKind(f: Fixture): FixKind {
  const s = `${f.id} ${f.name}`.toLowerCase();
  if (/vanity/.test(s)) return 'vanity'; // before 'sink': "Vanity + sink"
  if (/upper/.test(s)) return 'upper';
  if (/counter/.test(s)) return 'counter';
  if (/dishwash|(^|\s)dw(\s|$)/.test(s)) return 'dishwasher';
  if (/sink/.test(s)) return 'sink';
  if (/range|oven|cooktop|stove/.test(s)) return 'range';
  if (/fridge|refrig|freezer/.test(s)) return 'fridge';
  if (/washer|dryer|laundry/.test(s)) return 'laundry';
  if (/closet|wardrobe|linen|pantry/.test(s)) return 'closet';
  if (/tub|shower/.test(s)) return 'tub';
  if (/toilet|^wc$|\bwc\b/.test(s)) return 'toilet';
  return 'generic';
}

/**
 * Which way the usable face of a fixture points, as a unit plan vector.
 * Fixture.facing is degrees clockwise with 0 = plan south (+y), so
 *   front = rotate((0,1), facing) = (-sin f, cos f).
 *
 * The plan data is hand-authored and one or two `facing` values point INTO the
 * wall the fixture is against (e.g. the closet run on the south wall). Probing
 * 1 ft in front of the declared face and flipping when that lands outside the
 * interior polygon keeps the render honest without editing plan.ts.
 */
function fixtureFront(plan: FloorPlan, f: Fixture): Vec2 {
  const a = (f.facing ?? 0) * D2R;
  let front: Vec2 = [-Math.sin(a), Math.cos(a)];
  const cx = f.footprint.x + f.footprint.w / 2;
  const cy = f.footprint.y + f.footprint.h / 2;
  const reach = Math.max(f.footprint.w, f.footprint.h) / 2 + 1.0;
  const probe: Vec2 = [cx + front[0] * reach, cy + front[1] * reach];
  const back: Vec2 = [cx - front[0] * reach, cy - front[1] * reach];
  if (!pointInPolygon(probe, plan.interior) && pointInPolygon(back, plan.interior)) {
    front = [-front[0], -front[1]];
  }
  return front;
}

interface FixCtx {
  g: THREE.Group;
  /** local width (along the front's right), depth (along the front) and height */
  w: number;
  d: number;
  h: number;
  /** base above the floor */
  z: number;
  f: Fixture;
  n: string;
  /**
   * Highest LOCAL y anything on this fixture may reach. Several fixtures have
   * parts well above their declared Fixture.height (a vanity mirror, a shower
   * riser, a kitchen faucet), and under opts.wallCutHeight those would be the
   * only things sticking up out of the section. Infinity when no cut is active.
   */
  maxY: number;
  /** sink/basin cutouts in LOCAL coords, for counters */
  cuts: { x0: number; x1: number; z0: number; z1: number }[];
}

/**
 * Build one fixture. Same parametric approach as furniture.ts, but driven off
 * Fixture data: footprints are axis-aligned rects, so the local frame is just
 * the footprint turned so the usable face is on local +z.
 *
 * Local frame: local +z = front, local +x = (front.y, -front.x). With
 * facing values that are multiples of 90 (all of them, in this plan) that means
 * the local width is rect.w when the front runs along +/-y, and rect.h when it
 * runs along +/-x.
 */
function buildFixture(plan: FloorPlan, f: Fixture, others: Fixture[], cutTop: number | undefined): THREE.Object3D | null {
  const front = fixtureFront(plan, f);
  const alongY = Math.abs(front[1]) >= Math.abs(front[0]);
  const w = alongY ? f.footprint.w : f.footprint.h;
  const d = alongY ? f.footprint.h : f.footprint.w;
  const z0 = f.z ?? 0;
  let top = f.height;
  if (cutTop !== undefined) {
    if (z0 >= cutTop - 0.05) return null; // entirely above the cut plane
    top = Math.min(top, cutTop);
  }
  const h = top - z0;
  if (h <= 0.02 || w <= 0.02 || d <= 0.02) return null;

  const g = new THREE.Group();
  g.name = `fixture:${f.id}`;
  // local +z -> plan front: rotation.y = atan2(front.x, front.y)
  // (local +z maps to world (sin p, 0, cos p); world x/z = plan x/y)
  g.rotation.y = Math.atan2(front[0], front[1]);
  const cx = f.footprint.x + f.footprint.w / 2;
  const cy = f.footprint.y + f.footprint.h / 2;
  g.position.set(cx, z0, cy);

  const right: Vec2 = [front[1], -front[0]];
  const center: Vec2 = [cx, cy];
  const toLocal = (p: Vec2): [number, number] => {
    const v = sub(p, center);
    return [v[0] * right[0] + v[1] * right[1], v[0] * front[0] + v[1] * front[1]];
  };

  const kind = fixKind(f);
  const ctx: FixCtx = {
    g,
    w,
    d,
    h,
    z: z0,
    f,
    n: `fixture:${f.id}`,
    maxY: cutTop === undefined ? Infinity : cutTop - z0,
    cuts: [],
  };

  // A counter needs to know where the sink is so it can leave a hole for it.
  if (kind === 'counter') {
    for (const o of others) {
      if (o.id === f.id || fixKind(o) !== 'sink') continue;
      const r = o.footprint;
      const c0 = toLocal([r.x, r.y]);
      const c1 = toLocal([r.x + r.w, r.y + r.h]);
      ctx.cuts.push({
        x0: Math.min(c0[0], c1[0]),
        x1: Math.max(c0[0], c1[0]),
        z0: Math.min(c0[1], c1[1]),
        z1: Math.max(c0[1], c1[1]),
      });
    }
  }

  switch (kind) {
    case 'counter':
      fixCounter(ctx);
      break;
    case 'upper':
      fixUpper(ctx);
      break;
    case 'sink':
      fixSink(ctx);
      break;
    case 'range':
      fixRange(ctx);
      break;
    case 'dishwasher':
      fixPanelAppliance(ctx, 1, false);
      break;
    case 'fridge':
      fixPanelAppliance(ctx, 2, false);
      break;
    case 'laundry':
      fixPanelAppliance(ctx, 2, true);
      break;
    case 'closet':
      fixCloset(ctx);
      break;
    case 'tub':
      fixTub(ctx);
      break;
    case 'toilet':
      fixToilet(ctx);
      break;
    case 'vanity':
      fixVanity(ctx);
      break;
    default:
      addBox(g, MAT.cabinet, [w, h, d], [0, h / 2, 0], { name: `${ctx.n}/body` });
      break;
  }

  g.traverse((o) => {
    o.userData = { ...o.userData, fixtureId: f.id, fixtureKind: kind };
  });
  return g;
}

/**
 * Base cabinet run: toe kick, doors/drawers, and a stone top with a nosing that
 * overhangs the fronts by 1". Real numbers: 34 1/2" boxes + 1 1/2" top = 36",
 * 3 1/2" x 3" toe kick, 24" deep boxes under a 25 1/2" top.
 */
function fixCounter(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  const TOP_T = IN(1.5);
  const NOSE = IN(1);
  const TOE_H = IN(3.5);
  const TOE_D = IN(3);
  const boxD = d - NOSE;
  const boxTop = h - TOP_T;
  const zBoxFront = d / 2 - NOSE;

  addBox(g, MAT.cabinet, [w, boxTop - TOE_H, boxD], [0, TOE_H + (boxTop - TOE_H) / 2, -NOSE / 2], { name: `${n}/carcass` });
  addBox(g, MAT.cabinetDark, [w, TOE_H, boxD - TOE_D], [0, TOE_H / 2, -NOSE / 2 - TOE_D / 2], { name: `${n}/toe-kick` });

  // door fronts, ~21" bays (a real cabinet run: 15/18/21/24" boxes)
  const cols = Math.max(1, Math.round(w / IN(21)));
  addPanels(g, {
    x0: -w / 2,
    x1: w / 2,
    y0: TOE_H,
    y1: boxTop,
    zFace: zBoxFront,
    rows: 1,
    cols,
    face: MAT.cabinet,
    pull: MAT.chrome,
    pullStyle: 'bar-h',
    name: n,
  });

  // top slab, split around any sink cutout along the local x axis
  const spans: [number, number][] = [];
  let cursor = -w / 2;
  for (const cut of [...c.cuts].sort((a, b) => a.x0 - b.x0)) {
    const x0 = Math.max(-w / 2, cut.x0);
    const x1 = Math.min(w / 2, cut.x1);
    if (x1 <= x0) continue;
    if (x0 > cursor) spans.push([cursor, x0]);
    // strips fore and aft of the basin (a 30" sink in a 25 1/2" top leaves
    // ~1 1/2" of stone at the front and back)
    for (const [z0, z1] of [
      [-d / 2, Math.max(-d / 2, cut.z0)],
      [Math.min(d / 2, cut.z1), d / 2],
    ] as [number, number][]) {
      if (z1 - z0 > 0.01) {
        addBox(g, MAT.counter, [x1 - x0, TOP_T, z1 - z0], [(x0 + x1) / 2, h - TOP_T / 2, (z0 + z1) / 2], {
          name: `${n}/top-strip`,
        });
      }
    }
    cursor = Math.max(cursor, x1);
  }
  if (cursor < w / 2) spans.push([cursor, w / 2]);
  for (const [x0, x1] of spans) {
    addBox(g, MAT.counter, [x1 - x0, TOP_T, d], [(x0 + x1) / 2, h - TOP_T / 2, 0], { name: `${n}/top` });
  }

  // 4" tile backsplash up the wall behind the run
  if (h + IN(4) <= c.maxY) {
    addBox(g, MAT.tile, [w, IN(4), IN(0.5)], [0, h + IN(2), -d / 2 + IN(0.25)], { name: `${n}/backsplash` });
  }
}

/** Wall cabinets: carcass from f.z to f.height with doors and pulls underneath. */
function fixUpper(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  addBox(g, MAT.cabinet, [w, h, d], [0, h / 2, 0], { name: `${n}/carcass` });
  const cols = Math.max(1, Math.round(w / IN(18)));
  addPanels(g, {
    x0: -w / 2,
    x1: w / 2,
    y0: IN(0.5),
    y1: h - IN(0.5),
    zFace: d / 2,
    rows: 1,
    cols,
    face: MAT.cabinet,
    pull: MAT.chrome,
    pullStyle: 'bar-v',
    name: n,
  });
}

/**
 * Undermount sink: a stainless shell hanging in the hole the counter left, plus
 * a gooseneck faucet. Real basin: 30" x 18" x 9" deep, 1/2" walls.
 */
function fixSink(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  const rim = h - IN(1.5); // underside of the stone
  const depth = IN(9);
  const bw = w - IN(2);
  const bd = Math.min(d - IN(6), IN(19));
  const T = IN(0.5);
  const y0 = rim - depth;
  // bottom + 4 walls = a visible recess without any CSG
  addBox(g, MAT.applianceDark, [bw, T, bd], [0, y0 + T / 2, 0], { name: `${n}/basin-floor` });
  for (const sx of [-1, 1])
    addBox(g, MAT.appliance, [T, depth, bd], [sx * (bw / 2 - T / 2), y0 + depth / 2, 0], { name: `${n}/basin-side` });
  for (const sz of [-1, 1])
    addBox(g, MAT.appliance, [bw, depth, T], [0, y0 + depth / 2, sz * (bd / 2 - T / 2)], { name: `${n}/basin-end` });
  // faucet: 12" riser at the back with a 6" spout reaching over the basin
  const fy = h;
  if (fy + IN(12) <= c.maxY) {
    addCyl(g, MAT.chrome, { dBottom: IN(1.5), h: IN(12) }, [0, fy + IN(6), -bd / 2 - IN(1.5)], { name: `${n}/faucet` });
    addBar(g, MAT.chrome, IN(1.2), IN(7), [0, fy + IN(11.5), -bd / 2 + IN(2)], true, { name: `${n}/spout` });
  }
}

/** Freestanding range: steel body, glass cooktop, 4 burners, oven door, knobs. */
function fixRange(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  const glassT = IN(0.75);
  addBox(g, MAT.appliance, [w, h - glassT, d], [0, (h - glassT) / 2, 0], { name: `${n}/body` });
  addBox(g, matFor('#1b1d20', { roughness: 0.15, metalness: 0.2 }), [w - IN(0.5), glassT, d - IN(0.5)], [0, h - glassT / 2, 0], {
    name: `${n}/cooktop-glass`,
  });
  // 4 burner rings: 2 x 2 grid on the glass
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      addCyl(g, MAT.applianceDark, { dBottom: Math.min(w, d) * 0.3, h: IN(0.25), seg: 20 }, [sx * w * 0.22, h + IN(0.1), sz * d * 0.2], {
        name: `${n}/burner`,
        cast: false,
      });
  // oven door: recessed panel with a full-width handle bar
  const doorH = (h - glassT) * 0.62;
  addBox(g, MAT.applianceDark, [w - IN(1.5), doorH, IN(0.75)], [0, doorH / 2 + IN(1), d / 2 - IN(0.5)], { name: `${n}/oven-door` });
  addBar(g, MAT.chrome, IN(1.25), w - IN(3), [0, doorH + IN(2.5), d / 2 + IN(1)], false, { name: `${n}/oven-handle` });
  // control knobs across the front rail, just under the cooktop
  for (let i = 0; i < 4; i++) {
    addCyl(g, MAT.chrome, { dBottom: IN(1.6), h: IN(1), seg: 10 }, [(-1.5 + i) * (w / 5), h - glassT - IN(1.6), d / 2 + IN(0.5)], {
      name: `${n}/knob-${i}`,
      rotX: Math.PI / 2,
    });
  }
}

/**
 * Fridge / dishwasher / stacked laundry: a steel box with `doors` recessed
 * panels and handles. `round` adds the porthole doors of a washer/dryer.
 */
function fixPanelAppliance(c: FixCtx, doors: number, round: boolean): void {
  const { g, w, d, h, n } = c;
  addBox(g, MAT.appliance, [w, h, d], [0, h / 2, 0], { name: `${n}/body` });
  const gap = IN(0.25);
  // a top-freezer fridge splits ~1/3 : 2/3; a stacked laundry pair splits evenly
  const splits = doors === 2 && !round ? [0.34, 0.66] : doors === 2 ? [0.5, 0.5] : [1];
  let y = gap;
  splits.forEach((frac, i) => {
    const ph = (h - gap * (splits.length + 1)) * frac;
    addBox(g, MAT.applianceDark, [w - gap * 2, ph, IN(0.5)], [0, y + ph / 2, d / 2 - IN(0.25)], { name: `${n}/door-${i}` });
    if (round) {
      // porthole: dark glass disc, 2/3 of the door width
      addCyl(g, matFor('#23262a', { roughness: 0.12, metalness: 0.3 }), { dBottom: Math.min(w, ph) * 0.66, h: IN(0.6), seg: 20 }, [0, y + ph / 2, d / 2 + IN(0.2)], {
        name: `${n}/porthole-${i}`,
        rotX: Math.PI / 2,
      });
    } else {
      // full-height vertical bar pull on the leading edge
      addCyl(g, MAT.chrome, { dBottom: IN(1.25), h: ph * 0.7 }, [w / 2 - IN(2.5), y + ph / 2, d / 2 + IN(0.75)], {
        name: `${n}/handle-${i}`,
      });
    }
    y += ph + gap;
  });
}

/** Reach-in closet run: carcass + bypass/bifold door fronts with vertical pulls. */
function fixCloset(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  addBox(g, MAT.cabinet, [w, h, d], [0, h / 2, 0], { name: `${n}/carcass` });
  // ~24" leaves: an 8'-0" run reads as the 4 doors the plan calls for
  const cols = Math.max(1, Math.round(w / IN(24)));
  addPanels(g, {
    x0: -w / 2,
    x1: w / 2,
    y0: IN(0.5),
    y1: h - IN(0.5),
    zFace: d / 2,
    rows: 1,
    cols,
    face: MAT.cabinet,
    pull: MAT.chrome,
    pullStyle: 'bar-v',
    name: n,
  });
}

/**
 * Alcove tub: a shell (4 walls + a floor, so the inside is a real recess) with
 * a shower riser and head on one end and a curtain rod at 6'-6".
 */
function fixTub(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  const WALL_T = IN(4); // apron / deck width
  const FLOOR_T = IN(2.5);
  for (const sx of [-1, 1]) addBox(g, MAT.porcelain, [WALL_T, h, d], [sx * (w / 2 - WALL_T / 2), h / 2, 0], { name: `${n}/end` });
  for (const sz of [-1, 1])
    addBox(g, MAT.porcelain, [w - WALL_T * 2, h, WALL_T], [0, h / 2, sz * (d / 2 - WALL_T / 2)], { name: `${n}/side` });
  addBox(g, MAT.porcelain, [w - WALL_T * 2, FLOOR_T, d - WALL_T * 2], [0, FLOOR_T / 2, 0], { name: `${n}/floor` });
  // riser on the LEFT end wall (an alcove tub takes its plumbing on a short end)
  const riserX = -w / 2 + IN(3);
  const headY = FTIN(6, 8);
  // tub filler + valve, just above the rim
  if (h + IN(5) <= c.maxY) {
    addBar(g, MAT.chrome, IN(1), IN(5), [riserX + IN(1.5), h + IN(4), -d / 2 + IN(6)], true, { name: `${n}/spout` });
  }
  // riser, head and curtain rod are 6'-6"+ — dropped under a wall cut
  if (headY <= c.maxY) {
    addCyl(g, MAT.chrome, { dBottom: IN(0.9), h: headY - h }, [riserX, h + (headY - h) / 2, -d / 2 + IN(4)], { name: `${n}/riser` });
    addCyl(g, MAT.chrome, { dTop: IN(4), dBottom: IN(1.2), h: IN(4), seg: 12 }, [riserX + IN(3), headY, -d / 2 + IN(5)], {
      name: `${n}/shower-head`,
      rotZ: -0.5,
    });
    addBar(g, MAT.chrome, IN(1), w, [0, FTIN(6, 6), d / 2 - IN(1)], false, { name: `${n}/rod` });
  }
}

/** Two-piece toilet: pedestal + oval bowl + seat + tank with a lid. */
function fixToilet(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  const SEAT_H = IN(15.5); // ADA-ish comfort height incl. seat
  const tankW = w * 0.82;
  const tankD = Math.min(d * 0.35, IN(8));
  const tankH = h - IN(11);
  // tank sits at the BACK (-z is the wall side; front faces +z)
  addBox(g, MAT.porcelain, [tankW, tankH, tankD], [0, h - tankH / 2, -d / 2 + tankD / 2], { name: `${n}/tank` });
  addBox(g, MAT.porcelain, [tankW + IN(0.5), IN(1), tankD + IN(0.5)], [0, h + IN(0.5), -d / 2 + tankD / 2], { name: `${n}/tank-lid` });
  addCyl(g, MAT.chrome, { dBottom: IN(1.6), h: IN(0.8), seg: 10 }, [tankW * 0.28, h + IN(1), -d / 2 + tankD / 2], { name: `${n}/flush` });
  // pedestal
  addBox(g, MAT.porcelain, [w * 0.42, SEAT_H - IN(3), tankD + IN(3)], [0, (SEAT_H - IN(3)) / 2, -d / 2 + tankD], { name: `${n}/pedestal` });
  // bowl: an oval, wider than deep, projecting forward of the tank
  const bowlZ = -d / 2 + tankD + (d - tankD) / 2;
  addCyl(g, MAT.porcelain, { dBottom: w * 0.72, dTop: w * 0.88, h: IN(6), zScale: (d - tankD) / (w * 0.88), seg: 20 }, [0, SEAT_H - IN(3), bowlZ], {
    name: `${n}/bowl`,
  });
  addCyl(g, matFor('#f2f2f2', { roughness: 0.3 }), { dBottom: w * 0.9, h: IN(1.25), zScale: (d - tankD) / (w * 0.9), seg: 20 }, [0, SEAT_H - IN(0.6), bowlZ], {
    name: `${n}/seat`,
  });
}

/** Bath vanity: cabinet, stone top, vessel-ish basin, faucet, mirror above. */
function fixVanity(c: FixCtx): void {
  const { g, w, d, h, n } = c;
  const TOP_T = IN(1.25);
  const TOE_H = IN(3);
  addBox(g, MAT.cabinet, [w, h - TOP_T - TOE_H, d], [0, TOE_H + (h - TOP_T - TOE_H) / 2, 0], { name: `${n}/carcass` });
  addBox(g, MAT.cabinetDark, [w - IN(1), TOE_H, d - IN(3)], [0, TOE_H / 2, -IN(1.5)], { name: `${n}/toe-kick` });
  addPanels(g, {
    x0: -w / 2,
    x1: w / 2,
    y0: TOE_H,
    y1: h - TOP_T,
    zFace: d / 2,
    rows: 1,
    cols: w > IN(30) ? 2 : 1,
    face: MAT.cabinet,
    pull: MAT.chrome,
    pullStyle: 'bar-v',
    name: n,
  });
  addBox(g, MAT.counter, [w, TOP_T, d], [0, h - TOP_T / 2, 0], { name: `${n}/top` });
  // basin: a shallow oval bowl, 16" x 13" x 5"
  const bw = Math.min(w * 0.62, IN(16));
  addCyl(g, MAT.porcelain, { dBottom: bw * 0.7, dTop: bw, h: IN(5), zScale: 0.82, seg: 20 }, [0, h + IN(2.5), IN(0.5)], {
    name: `${n}/basin`,
  });
  if (h + IN(8) <= c.maxY) {
    addCyl(g, MAT.chrome, { dBottom: IN(1.6), h: IN(8) }, [0, h + IN(4), -d / 2 + IN(3)], { name: `${n}/faucet` });
    addBar(g, MAT.chrome, IN(1.1), IN(5), [0, h + IN(7.5), -d / 2 + IN(5)], true, { name: `${n}/spout` });
  }
  // mirror above: 30" tall, starting 8" over the top, framed — shortened (or
  // dropped) if a wall cut would slice it
  const mh = Math.min(IN(30), c.maxY - (h + IN(8)));
  if (mh > IN(8)) {
    const my = h + IN(8) + mh / 2;
    addBox(g, MAT.trim, [w - IN(2), mh, IN(1)], [0, my, -d / 2 + IN(0.5)], { name: `${n}/mirror-frame` });
    addBox(g, MAT.mirror, [w - IN(5), mh - IN(3), IN(0.25)], [0, my, -d / 2 + IN(1.1)], { name: `${n}/mirror`, cast: false });
  }
}

// ------------------------------------------------------------ soffit downlights

/**
 * Recessed circular downlights on the exposed concrete soffit.
 *
 * The photo shows small flush discs in the slab — a 4" aperture LED downlight
 * with a ~5 1/4" trim, which is the standard fitting in this kind of shell. Two
 * families of position:
 *
 *   LIVING  a grid at 6'-6" centres over the living/sleeping zone. 6'-6" is the
 *           usual spacing for a 4" downlight at a 9' ceiling (roughly 0.7 x the
 *           mounting height above the work plane). Candidates are dropped unless
 *           they sit at least 2'-0" clear of the zone boundary inside the zone
 *           polygon, which keeps lights off the walls and out of the bathroom /
 *           kitchen / entry without hard-coding any coordinates.
 *   KITCHEN one over the counter run, 8" forward of its front edge — clear of the
 *           wall cabinets, throwing onto the working face of the counter.
 *
 * NO LIGHT SOURCES ARE ADDED. The whole lighting budget is one shadow-casting sun
 * plus fills (see addLighting), and this is a daylight render; the fittings are
 * geometry plus a faint emissive lens so they read as "on" without costing a
 * single extra per-fragment light.
 */
function addDownlights(root: THREE.Object3D, plan: FloorPlan): void {
  const y = plan.ceilingHeight;
  const pts: Vec2[] = [];

  const living = plan.zones.find((z) => z.id === 'living') ?? plan.zones.find((z) => z.type === 'living');
  if (living) {
    const b = polygonBounds(living.polygon);
    const SPACING = FTIN(6, 6);
    const CLEAR = 2.0;
    const nx = Math.max(1, Math.round(b.w / SPACING));
    const nz = Math.max(1, Math.round(b.h / SPACING));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const p: Vec2 = [b.min[0] + (b.w * (i + 0.5)) / nx, b.min[1] + (b.h * (j + 0.5)) / nz];
        if (!pointInPolygon(p, living.polygon)) continue;
        const probes: Vec2[] = [
          [p[0] + CLEAR, p[1]],
          [p[0] - CLEAR, p[1]],
          [p[0], p[1] + CLEAR],
          [p[0], p[1] - CLEAR],
        ];
        if (probes.every((q) => pointInPolygon(q, living.polygon))) pts.push(p);
      }
    }
  }

  // one over the kitchen counter run
  const counters = plan.fixtures.filter((fx) => fixKind(fx) === 'counter' && fx.category === 'kitchen');
  if (counters.length) {
    const x0 = Math.min(...counters.map((fx) => fx.footprint.x));
    const x1 = Math.max(...counters.map((fx) => fx.footprint.x + fx.footprint.w));
    const y0 = Math.min(...counters.map((fx) => fx.footprint.y));
    const y1 = Math.max(...counters.map((fx) => fx.footprint.y + fx.footprint.h));
    const front = fixtureFront(plan, counters[0]);
    // half the run's DEPTH (the extent along `front`), minus 8"
    const halfDepth = Math.abs(front[0]) >= Math.abs(front[1]) ? (x1 - x0) / 2 : (y1 - y0) / 2;
    const step = Math.max(0, halfDepth - IN(8));
    const p: Vec2 = [(x0 + x1) / 2 + front[0] * step, (y0 + y1) / 2 + front[1] * step];
    if (pointInPolygon(p, plan.interior)) pts.push(p);
  }

  if (!pts.length) return;

  const APERTURE = IN(4); // 4" aperture LED downlight
  const TRIM = IN(5.25); // trim ring outside diameter
  const trimMat = matFor('#d2d0cc', { roughness: 0.5, metalness: 0.05, name: 'downlight-trim' });
  // Faint on purpose: at ACESFilmic/exposure 1 in daylight these should read as
  // warm discs, not blown-out white holes in the slab.
  const lensMat = matFor('#fff7e8', {
    roughness: 0.9,
    emissive: '#ffe6bc',
    emissiveIntensity: 1.15,
    name: 'downlight-lens',
  });

  const g = new THREE.Group();
  g.name = 'downlights';
  root.add(g);
  pts.forEach((p, i) => {
    // Trim: a shallow can whose bottom face hangs 0.6" below the soffit. There is
    // no CSG here, so a truly recessed can would be invisible behind the slab;
    // a 0.6" proud trim ring is what a flush fitting actually looks like anyway.
    addCyl(g, trimMat, { dBottom: TRIM, h: IN(0.6), seg: 16 }, [p[0], y - IN(0.3), p[1]], {
      name: `downlight:${i}/trim`,
      cast: false,
      recv: false,
    });
    // Lens, seated up inside the trim so only the disc shows from the room.
    addCyl(g, lensMat, { dBottom: APERTURE, h: IN(0.45), seg: 16 }, [p[0], y - IN(0.775), p[1]], {
      name: `downlight:${i}/lens`,
      cast: false,
      recv: false,
    });
  });
}

// ---------------------------------------------------------------- lighting

interface LampSpot {
  at: THREE.Vector3;
  /** floor lamps light a bigger volume than a table lamp */
  radius: number;
}

/**
 * Hemisphere fill + one shadow-casting "sun" + up to 4 cheap lamp point lights.
 *
 * The sun's azimuth/elevation come from opts.timeOfDay (0..1 across the day):
 *   azimuth (compass deg) = 90 + 180 * t   -> 09:00 east, 12:00 south, 18:00 west
 *   elevation             = max(8, 70 sin(pi t))
 * The unit's only glazing is the WEST wall, so the default (0.72) puts the sun
 * west-south-west and low enough to rake in through those four windows.
 */
function addLighting(root: THREE.Object3D, plan: FloorPlan, opts: Render3DOptions, lamps: LampSpot[]): void {
  const b = polygonBounds(plan.footprint);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[1] + b.max[1]) / 2;
  const span = Math.max(b.w, b.h);

  const hemi = new THREE.HemisphereLight(0xdfe9f2, 0xb9ac97, 0.8);
  hemi.position.set(cx, plan.ceilingHeight * 2, cz);
  hemi.name = 'light:hemi';
  root.add(hemi);

  /**
   * WINDOW FILL. The sun casts shadows, so it only reaches the floor where a
   * window lets it in — correct, but it leaves the interior lit by ambient
   * alone and everything reads flat grey. This second directional light comes
   * from the same side as the glazing (the WEST wall), casts NO shadow, and so
   * behaves like diffuse sky light pouring through the windows. It is the
   * standard architectural-render cheat and costs one extra light with no
   * shadow map.
   */
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.85);
  fill.name = 'light:window-fill';
  fill.position.set(cx - span, plan.ceilingHeight * 1.6, cz - span * 0.25);
  fill.target.position.set(cx, plan.ceilingHeight * 0.4, cz);
  fill.castShadow = false;
  root.add(fill.target);
  root.add(fill);

  // A weak counter-fill from the NORTH. Both the sun (west-south-west) and the
  // window fill (west) leave north-facing surfaces black, and in this unit the
  // whole kitchen run, the closet doors and every sofa back face north. Aimed
  // south and slightly down, no shadow.
  const bounce = new THREE.DirectionalLight(0xfff0e0, 0.45);
  bounce.name = 'light:bounce';
  bounce.position.set(cx + span * 0.3, plan.ceilingHeight * 1.3, cz - span);
  bounce.target.position.set(cx, plan.ceilingHeight * 0.4, cz);
  bounce.castShadow = false;
  root.add(bounce.target);
  root.add(bounce);

  const t = Math.min(1, Math.max(0, opts.timeOfDay ?? 0.72));
  const azDeg = 90 + 180 * t;
  const elDeg = Math.max(8, 70 * Math.sin(Math.PI * t));
  const az = azDeg * D2R;
  const el = elDeg * D2R;
  // compass -> plan: north is -y, east is +x, so a bearing A points (sin A, -cos A)
  const dist = span * 2.2;
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.6);
  sun.name = 'light:sun';
  sun.position.set(cx + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, cz - Math.cos(az) * Math.cos(el) * dist);
  sun.target.position.set(cx, plan.ceilingHeight * 0.25, cz);
  root.add(sun.target);
  root.add(sun);

  if (opts.shadows !== false) {
    sun.castShadow = true;
    // one 2048 map is the whole shadow budget for the scene
    sun.shadow.mapSize.set(2048, 2048);
    const half = span * 0.62;
    const cam = sun.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 0.5;
    cam.far = dist * 2.5;
    cam.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
  }

  // Lamp point lights: capped at 4 because every extra light multiplies the
  // per-fragment cost, and swiftshader pays that in software.
  for (const l of lamps.slice(0, 4)) {
    const p = new THREE.PointLight(0xffe1b0, 6, l.radius, 2);
    p.position.copy(l.at);
    p.castShadow = false;
    p.name = 'light:lamp';
    root.add(p);
  }
}

// ---------------------------------------------------------------- buildScene

export function buildScene(plan: FloorPlan, layout: Layout | undefined, opts: Render3DOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = `scene:${plan.id}${layout ? `:${layout.id}` : ''}`;
  // Renderer settings that belong to the scene's intent, read by Viewer3D
  // (buildScene has no renderer): ACESFilmic tone mapping at exposure 1.
  root.userData.render = {
    toneMapping: 'ACESFilmic',
    exposure: 1.0,
    background: opts.background ?? '#cdd3d8',
  };

  const b = polygonBounds(plan.footprint);

  /**
   * WALL CUT. opts.wallCutHeight clamps wall + cabinet heights so an overhead
   * camera can see the floor plan instead of four roofs' worth of wall.
   *
   * Default: the overhead presets ('top' and the four 'iso-*') get a 4'-6" cut,
   * because at 9' ceilings the near walls hide the entire interior and the
   * render is useless. Eye-level presets default to full height. Pass an
   * explicit wallCutHeight to override, including a value >= ceilingHeight to
   * force full-height walls in an iso view.
   */
  const OVERHEAD_CUT = FTIN(4, 6);
  const preset = opts.camera ?? 'iso-sw';
  const overhead = preset === 'top' || preset.startsWith('iso-');
  const cut = opts.wallCutHeight ?? (overhead ? OVERHEAD_CUT : undefined);

  // ---- ground: a big plane so renders do not float in the void
  const pad = 40;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(b.w + pad * 2, b.h + pad * 2), MAT.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((b.min[0] + b.max[0]) / 2, -0.03, (b.min[1] + b.max[1]) / 2);
  ground.receiveShadow = true;
  ground.name = 'ground';
  root.add(ground);

  /**
   * ---- floor: the real L.
   *
   * Authored from plan.FOOTPRINT, not plan.interior, for two reasons — one
   * architectural, one a defect in the traced data:
   *
   *   1. a slab runs wall to wall. The walls stand ON it; stopping the deck at
   *      the room face and butting the wall boxes against its edge puts a seam
   *      exactly where the baseboard reveal is trying to hide one.
   *   2. plan.interior is a hand-traced offset of the footprint and at the SOUTH
   *      STEP it was offset the wrong way round the re-entrant corner: its
   *      corner sits at (17.95, 19.17), which is 0.108 sq ft OUTSIDE the
   *      footprint. A slab authored from it hangs a 7" x 2" tab of oak plank
   *      through the south wall, in mid-air, over the street.
   *
   * The visible floor is identical either way — everything outside the room face
   * is under a wall.
   */
  root.add(polygonSlab(plan.footprint, 0, MAT.floor, true, 'floor'));

  // ---- bath floor: tile, inset 1/2" inside the bath zone so the edge reads
  const bath = plan.zones.find((z) => z.type === 'bath');
  if (bath) {
    root.add(polygonSlab(insetPolygon(bath.polygon, IN(0.5)), 0.012, MAT.tile, true, 'floor:bath-tile'));
  }

  /**
   * ---- ceiling: an EXPOSED CONCRETE SOFFIT (opt-in: it blocks every camera
   * except the eye-level ones).
   *
   * The photo shows the structural slab left bare — smooth grey concrete, not
   * painted drywall — with small recessed downlights in it. The material is
   * resolved by name (MAT.concrete, falling back to MAT.ceiling) because
   * materials.ts is being written in parallel; see soffitMaterial().
   */
  if (opts.showCeiling) {
    /**
     * Footprint, for the same reasons as the floor slab above: the soffit is one
     * pour running out to the facade, and plan.interior would hang a tab of it
     * outside the building at the south step.
     *
     * Dropped 1/32" so it is never COPLANAR with the tops of the 9'-0" walls it
     * now covers. Coplanar faces are the one thing a path tracer cannot resolve,
     * and this pair would be visible together in every overhead frame. Below the
     * wall top rather than above it, so the wall still seals the joint — a slab
     * lifted clear would leak sky light round the whole perimeter.
     */
    const SOFFIT_SET = IN(1 / 32);
    root.add(
      polygonSlab(plan.footprint, plan.ceilingHeight - SOFFIT_SET, soffitMaterial(), false, 'ceiling'),
    );
    addDownlights(root, plan);
  }

  // ---- walls, openings, doors
  for (const w of plan.walls) {
    const top = cut !== undefined ? Math.min(w.height, cut) : w.height;
    addWall(root, plan, w, top, cut !== undefined && cut < w.height);
  }
  // Close the re-entrant corners the per-wall solids leave open. Without this
  // the north and east steps are full-height holes through the envelope — you
  // can see the street through them in the path-traced top view.
  {
    const wallTop = cut !== undefined ? Math.min(plan.ceilingHeight, cut) : plan.ceilingHeight;
    addCornerFills(root, plan, wallTop, cut !== undefined && cut < plan.ceilingHeight);
  }
  for (const o of plan.openings) {
    const w = plan.walls.find((x) => x.id === o.wall);
    const top = w ? (cut !== undefined ? Math.min(w.height, cut) : w.height) : plan.ceilingHeight;
    addOpeningDetails(root, plan, o, top);
    if (o.kind === 'door') {
      // The unit entry (an exterior door) is drawn ajar at 30 deg; interior
      // doors (the bath, on a partition) are drawn fully open at 90 so the
      // fixtures behind them are visible.
      const deg = w && w.kind === 'exterior' ? 30 : 90;
      addDoorLeaf(root, plan, o, Math.min(deg, o.swing?.angle ?? deg), top);
    }
  }

  // ---- fixtures
  for (const f of plan.fixtures) {
    const node = buildFixture(plan, f, plan.fixtures, cut);
    if (node) root.add(node);
  }

  // ---- furniture
  const lamps: LampSpot[] = [];
  if (layout) {
    for (const item of layout.items) {
      let def: FurnitureDef;
      try {
        def = getDef(item.def);
      } catch (err) {
        // A layout referencing a missing catalog id should not kill the render.
        console.warn(`[build] skipping ${item.id}: ${(err as Error).message}`);
        continue;
      }
      const node = buildFurniture(def, item);
      const y = item.z ?? def.defaultZ ?? 0;
      node.position.set(item.at[0], y, item.at[1]);
      // see the ROTATION SIGN proof at the top of this file
      node.rotation.y = -(item.rot ?? 0) * D2R;
      root.add(node);

      if (def.kind === 'floor_lamp' || def.kind === 'table_lamp') {
        const hh = item.size?.h ?? def.h;
        lamps.push({
          at: new THREE.Vector3(item.at[0], y + hh * 0.88, item.at[1]),
          radius: def.kind === 'floor_lamp' ? 14 : 9,
        });
      }
    }
  }

  addLighting(root, plan, opts, lamps);
  return root;
}

// ---------------------------------------------------------------- cameras

const EYE_H = FTIN(5, 6); // 5'-6" — standing eye height

interface CamSpec {
  position: Vec3;
  target: Vec3;
  fov: number;
}

/** Distance at which a sphere of radius r fits in the frame at this fov/aspect. */
function fitDistance(r: number, fovDeg: number, aspect: number): number {
  const tanV = Math.tan((fovDeg * D2R) / 2);
  const tanH = tanV * Math.max(0.2, aspect);
  return r / Math.min(tanV, tanH);
}

/**
 * Exact fit distance for a box, looking from direction `w` (unit vector pointing
 * from the target TOWARD the camera).
 *
 * A sphere fit is badly wasteful here: this building is 30' x 20' x 9', so the
 * bounding sphere is nearly twice the size of what you actually see and the unit
 * ends up a small object in a large empty frame. Instead solve the real
 * constraint per corner.
 *
 * With the camera at C = T + d*w, a point P (v = P - T) sits at
 *   depth  = d - v·w        (distance along the view axis)
 *   lateral = v·r , v·u     (right / up in camera space)
 * and must satisfy |v·r| <= tanH * depth and |v·u| <= tanV * depth, i.e.
 *   d >= v·w + |v·r| / tanH   and   d >= v·w + |v·u| / tanV.
 * The fit is the max of those bounds over all 8 corners.
 */
function fitBoxDistance(
  corners: THREE.Vector3[],
  target: THREE.Vector3,
  w: THREE.Vector3,
  fovDeg: number,
  aspect: number,
): number {
  const tanV = Math.tan((fovDeg * D2R) / 2);
  const tanH = tanV * Math.max(0.2, aspect);
  // Camera basis. w is the view axis; r/u span the image plane.
  const worldUp = new THREE.Vector3(0, 1, 0);
  const r = new THREE.Vector3().crossVectors(worldUp, w);
  if (r.lengthSq() < 1e-9) r.set(1, 0, 0); // straight-down view: pick any right
  r.normalize();
  const u = new THREE.Vector3().crossVectors(w, r).normalize();

  let d = 0;
  const v = new THREE.Vector3();
  for (const p of corners) {
    v.subVectors(p, target);
    const along = v.dot(w);
    d = Math.max(d, along + Math.abs(v.dot(r)) / tanH, along + Math.abs(v.dot(u)) / tanV);
  }
  return d;
}

/**
 * Frame the whole unit from view direction `w`, filling the frame.
 *
 * Fitting the distance alone is not enough: the massing box does not project
 * symmetrically about the geometric centre of the plan (an L-shape seen at an
 * angle never does), so the binding corner hits one edge while the opposite edge
 * keeps a wide margin. So alternate two cheap steps — fit the distance, then
 * slide the target sideways in the image plane to centre what is actually
 * projected — and it settles in a couple of rounds.
 */
function frameMassing(
  plan: FloorPlan,
  w: THREE.Vector3,
  fov: number,
  aspect: number,
  targetY: number,
  margin = 1.03,
): { position: Vec3; target: Vec3 } {
  const corners = massingCorners(plan);
  const b = polygonBounds(plan.footprint);
  const target = new THREE.Vector3(
    (b.min[0] + b.max[0]) / 2,
    targetY,
    (b.min[1] + b.max[1]) / 2,
  );

  const worldUp = new THREE.Vector3(0, 1, 0);
  const r = new THREE.Vector3().crossVectors(worldUp, w);
  if (r.lengthSq() < 1e-9) r.set(1, 0, 0); // straight down: any right vector
  r.normalize();
  const u = new THREE.Vector3().crossVectors(w, r).normalize();
  const tanV = Math.tan((fov * D2R) / 2);
  const tanH = tanV * Math.max(0.2, aspect);

  let dist = fitBoxDistance(corners, target, w, fov, aspect) * margin;
  const v = new THREE.Vector3();
  for (let iter = 0; iter < 4; iter++) {
    const eye = target.clone().addScaledVector(w, dist);
    let minx = Infinity;
    let maxx = -Infinity;
    let miny = Infinity;
    let maxy = -Infinity;
    for (const p of corners) {
      v.subVectors(p, eye);
      const depth = -v.dot(w);
      if (depth <= 1e-6) continue;
      const x = v.dot(r) / (depth * tanH);
      const y = v.dot(u) / (depth * tanV);
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      miny = Math.min(miny, y);
      maxy = Math.max(maxy, y);
    }
    const dx = (minx + maxx) / 2;
    const dy = (miny + maxy) / 2;
    if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) break;
    // Sliding the target by +d along r moves the image by -d, so add to cancel.
    target.addScaledVector(r, dx * tanH * dist);
    target.addScaledVector(u, dy * tanV * dist);
    dist = fitBoxDistance(corners, target, w, fov, aspect) * margin;
  }

  const eye = target.clone().addScaledVector(w, dist);
  return {
    position: [eye.x, eye.y, eye.z],
    target: [target.x, target.y, target.z],
  };
}

/** The 8 corners of the unit's massing box (footprint extent x ceiling height). */
function massingCorners(plan: FloorPlan): THREE.Vector3[] {
  const b = polygonBounds(plan.footprint);
  const out: THREE.Vector3[] = [];
  for (const x of [b.min[0], b.max[0]]) {
    for (const y of [0, plan.ceilingHeight]) {
      for (const z of [b.min[1], b.max[1]]) out.push(new THREE.Vector3(x, y, z));
    }
  }
  return out;
}

/** Centers of the WEST-wall windows (the unit's only glazing). */
function westWindows(plan: FloorPlan): Vec2[] {
  const ib = polygonBounds(plan.interior);
  const out: Vec2[] = [];
  for (const o of plan.openings) {
    if (o.kind !== 'window') continue;
    try {
      const c = openingSegment(plan, o).center;
      if (c[0] < ib.min[0] + 1.0) out.push(c);
    } catch {
      /* an opening on a wall id that does not exist: ignore */
    }
  }
  return out;
}

/**
 * Mid-height of the actual glazing, for cameras that aim at it.
 *
 * With the plan corrected to full height (sill 0, head = ceiling - 4") this is
 * ~4'-4" instead of the 4'-9" a 2'-6"/7'-0" punched window gave, so the eye-level
 * shot now looks at the middle of the glass rather than above it. Derived from the
 * openings so it stays right if the plan changes; WIN_MID_H is only the no-windows
 * fallback. This does NOT touch frameMassing/fitBoxDistance.
 */
function glazingMidHeight(plan: FloorPlan): number {
  const wins = plan.openings.filter((o) => o.kind === 'window');
  if (!wins.length) return WIN_MID_H;
  const sum = wins.reduce((s, o) => s + (Math.max(0, o.sill) + Math.min(o.head, plan.ceilingHeight)) / 2, 0);
  return sum / wins.length;
}

function meanPoint(pts: Vec2[], fallback: Vec2): Vec2 {
  if (!pts.length) return fallback;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

function zoneBounds(plan: FloorPlan, id: string, type: string) {
  const z = plan.zones.find((x) => x.id === id) ?? plan.zones.find((x) => x.type === type);
  return z ? polygonBounds(z.polygon) : polygonBounds(plan.interior);
}

/**
 * Real camera positions derived from the plan, never magic numbers.
 *   top       high, narrow-fov perspective straight down (the caller must set
 *             up = (0,0,-1) so the image matches the 2D drawing)
 *   iso-*     35 deg elevation outside the named corner, framed to fit
 *   eye-*     5'-6" eye height at a real standing position
 */
export function cameraFor(preset: CameraPreset, plan: FloorPlan, aspect: number): CamSpec {
  const fb = polygonBounds(plan.footprint);
  const ib = polygonBounds(plan.interior);
  const cx = (fb.min[0] + fb.max[0]) / 2;
  const cy = (fb.min[1] + fb.max[1]) / 2;
  const ceil = plan.ceilingHeight;
  const a = Math.max(0.2, aspect);

  switch (preset) {
    case 'top': {
      // A 22 deg fov is near-orthographic at this distance: the walls barely
      // splay. Screen vertical = plan y, screen horizontal = plan x, because
      // the caller uses up = (0,0,-1).
      // Frame the massing box, not the floor outline: at this distance the tops
      // of the 9' walls are meaningfully nearer the camera than the floor, so a
      // floor-only fit projects them past the frame edge and clips the unit.
      const fov = 22;
      const { position, target } = frameMassing(
        plan,
        new THREE.Vector3(0, 1, 0),
        fov,
        a,
        0,
      );
      return { position, target, fov };
    }

    case 'iso-ne':
    case 'iso-nw':
    case 'iso-se':
    case 'iso-sw': {
      const fov = 40;
      // plan directions of each corner: north = -y, south = +y, east = +x
      const dir: Vec2 =
        preset === 'iso-ne' ? [1, -1] : preset === 'iso-nw' ? [-1, -1] : preset === 'iso-se' ? [1, 1] : [-1, 1];
      const u = normv(dir);
      const el = 35 * D2R;
      // w points from the target toward the camera.
      const w = new THREE.Vector3(
        u[0] * Math.cos(el),
        Math.sin(el),
        u[1] * Math.cos(el),
      ).normalize();
      const { position, target } = frameMassing(plan, w, fov, a, ceil * 0.35);
      return { position, target, fov };
    }

    case 'eye-entry': {
      // 3 ft inside the unit entry (the only door on an exterior wall),
      // looking west-northwest down the long axis of the L.
      const door =
        plan.openings.find((o) => o.kind === 'door' && plan.walls.find((w) => w.id === o.wall)?.kind === 'exterior') ??
        plan.openings.find((o) => o.kind === 'door');
      let pos: Vec2 = [ib.max[0] - 3, (ib.min[1] + ib.max[1]) / 2];
      if (door) {
        const seg = openingSegment(plan, door);
        // step toward whichever side of the wall is actually inside
        const inward: Vec2 = pointInPolygon(addv(seg.center, seg.normal, 1.0), plan.interior)
          ? seg.normal
          : [-seg.normal[0], -seg.normal[1]];
        pos = addv(seg.center, inward, 3.0);
      }
      /**
       * Look WEST, canted only slightly north.
       *
       * The cant matters: the bathroom's south wall runs to x 26.4 at y 12.9, so
       * from a standing spot around (27.4, 14.7) anything steeper than about
       * dy/dx = 0.20 puts that wall dead centre and you photograph plasterboard.
       * At 0.15 the ray clears the wall corner and the shot runs down the closet
       * corridor and opens into the living end — which is what you actually see
       * walking in.
       */
      const look = normv([-1, -0.15]);
      const tgt = addv(pos, look, 20);
      return { position: [pos[0], EYE_H, pos[1]], target: [tgt[0], EYE_H * 0.86, tgt[1]], fov: 62 };
    }

    case 'eye-kitchen': {
      // The cook's view: standing in the work aisle at the WEST end of the
      // counter run, looking east along it.
      //
      // The stand-off is measured from the front face of the kitchen fixtures,
      // not from the zone polygon: the zone line runs down the middle of the
      // open studio, and standing on it puts the camera 7" off the cooktop.
      // 2'-8" back is roughly where you stand to work at a counter, and it
      // keeps the whole run inside the frame.
      const kf = plan.fixtures.filter((f) => f.category === 'kitchen' || f.category === 'laundry');
      const kb = zoneBounds(plan, 'kitchen', 'kitchen');
      const xs = kf.length ? Math.min(...kf.map((f) => f.footprint.x)) : kb.min[0];
      const xe = kf.length ? Math.max(...kf.map((f) => f.footprint.x + f.footprint.w)) : kb.max[0];
      const front = kf.length ? Math.min(...kf.map((f) => f.footprint.y)) : kb.min[1] + 2;
      const pos: Vec2 = [xs + 2.5, front - FTIN(2, 8)];
      const tgt: Vec2 = [xe + 1.5, front + 0.4];
      return { position: [pos[0], EYE_H, pos[1]], target: [tgt[0], EYE_H * 0.78, tgt[1]], fov: 66 };
    }

    case 'eye-window': {
      // At the west windows (2.5 ft off the glass), looking back east into the
      // unit — the "morning coffee" view.
      const wins = westWindows(plan);
      const wc = meanPoint(wins, [ib.min[0], (ib.min[1] + ib.max[1]) / 2]);
      const pos: Vec2 = [ib.min[0] + 2.5, wc[1]];
      const tgt: Vec2 = [ib.max[0], pos[1] + 1.2];
      return { position: [pos[0], EYE_H, pos[1]], target: [tgt[0], EYE_H * 0.85, tgt[1]], fov: 68 };
    }

    case 'eye-living':
    default: {
      // Middle of the living zone, looking at the west windows.
      const lz = plan.zones.find((z) => z.id === 'living') ?? plan.zones.find((z) => z.type === 'living');
      const pos = lz ? polygonCentroid(lz.polygon) : ([cx, cy] as Vec2);
      const wc = meanPoint(westWindows(plan), [ib.min[0], pos[1]]);
      return {
        position: [pos[0], EYE_H, pos[1]],
        target: [ib.min[0], (glazingMidHeight(plan) + EYE_H) / 2, wc[1]],
        fov: 64,
      };
    }
  }
}

// ---------------------------------------------------------------- disposal

/**
 * Free the per-build GPU resources under `root`.
 *
 * Geometries and materials flagged `userData.shared` are the cached unit
 * primitives from furniture.ts and the registry in materials.ts — they outlive
 * any single scene and MUST NOT be disposed here (see disposeMaterials /
 * disposeGeometryCache for real teardown).
 */
export function disposeScene(root: THREE.Object3D): void {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();

  root.traverse((o) => {
    const any = o as THREE.Mesh & { isMesh?: boolean };
    if (any.isMesh || any.geometry) {
      if (any.geometry && !any.geometry.userData?.shared) geos.add(any.geometry);
      const m = any.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) {
        for (const one of m) if (!one.userData?.shared) mats.add(one);
      } else if (m && !m.userData?.shared) {
        mats.add(m);
      }
    }
    const light = o as THREE.Light & { shadow?: THREE.LightShadow };
    if (light.shadow?.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
  });

  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  root.parent?.remove(root);
  root.clear();
}
