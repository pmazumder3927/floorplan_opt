/**
 * SHOTS — the cameras that are about the LAYOUT rather than about the room.
 *
 * cameraFor() in build.ts owns the ten presets, and every one of them is derived
 * from the plan alone: it has never seen a sofa. That is the right contract for a
 * preset (the same view of the same room, whatever is in it) and the wrong one
 * for a brief, where the whole job of a picture is to show that THIS scheme's
 * screen is watchable from THIS scheme's seat.
 *
 * So a shot is aimed at furniture. Each one below finds the item it is about —
 * the picture, the desk, the bed — and builds a camera from that item's own
 * position, rotation and size. Move the sofa 18" in the layout and the shot
 * follows it, which is the entire point: nothing here is a hand-typed eye
 * position that silently goes stale.
 *
 * COORDINATES. Plan feet, origin top-left, +x east, +y SOUTH, rotation clockwise,
 * rot 0 = front faces +y. Camera vectors come out in THREE.JS world coords
 * (x, up, southward) because that is what cameraFor() returns and what
 * scripts/blender/render.py expects on --camera-pos.
 *
 * There are two kinds:
 *
 *   mode 'interior'  — a photograph. Lit by the real daylight rig through the
 *                      west glazing, with the ceiling on and the city outside.
 *   mode 'dollhouse' — a DIAGRAM. The soffit comes off, the sky and the city go
 *                      away, and a studio dome replaces them (render.py
 *                      --dollhouse). It is not pretending to be a photograph and
 *                      should never be captioned as one.
 */

import * as THREE from 'three';

import { getDef } from '@/core/catalog';
import {
  dist as dist2,
  distToSegment,
  itemObb,
  norm,
  pointInPolygon,
  wallSolid,
  type OBB,
} from '@/core/geometry';
import { blockersFor } from '@/core/analysis';
import type { FloorPlan, FurnitureDef, Layout, PlacedItem, Vec2, Vec3 } from '@/core/types';
import { frameMassing } from './build';

export type ShotMode = 'interior' | 'dollhouse';

export interface Shot {
  /** file-safe; the frame lands at renders/rt-<layout>-<id>.png */
  id: string;
  /** gallery headline */
  title: string;
  /** one sentence: what the frame is EVIDENCE of, not what is in it */
  caption: string;
  position: Vec3;
  target: Vec3;
  /** vertical, degrees */
  fov: number;
  /** stops, added to raytrace.ts's --exposure. See exposureFor(). */
  exposure: number;
  mode: ShotMode;
}

// ---------------------------------------------------------------- geometry

const D2R = Math.PI / 180;

/** Rotate a direction `deg` clockwise on the page. R(90): +x -> +y (south). */
function rotDir(v: Vec2, deg: number): Vec2 {
  const r = deg * D2R;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

const addv = (p: Vec2, d: Vec2, k: number): Vec2 => [p[0] + d[0] * k, p[1] + d[1] * k];

const neg = (v: Vec2): Vec2 => [-v[0], -v[1]];

/** Plan (x, y) + height -> three.js world. Same mapping as cameraFor(). */
const world = (p: Vec2, z: number): Vec3 => [p[0], z, p[1]];

/** Distance from p to the nearest edge of a polygon. */
function edgeDistance(p: Vec2, poly: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    best = Math.min(best, distToSegment(p, poly[i]!, poly[(i + 1) % poly.length]!));
  }
  return best;
}

/** Is a point inside an OBB, inflated by `pad` on every side? */
function insideObb(o: OBB, p: Vec2, pad: number): boolean {
  const dx = p[0] - o.center[0];
  const dy = p[1] - o.center[1];
  const u = rotDir([1, 0], o.rot);
  const v = rotDir([0, 1], o.rot);
  return (
    Math.abs(dx * u[0] + dy * u[1]) <= o.w / 2 + pad &&
    Math.abs(dx * v[0] + dy * v[1]) <= o.d / 2 + pad
  );
}

/**
 * The camera has to stand somewhere a person could stand.
 *
 * WALL_STANDOFF is the near clip in disguise: at 0.6 ft the 62 deg frame still
 * clears the wall behind the lens, and anything less puts the plane of the wall
 * inside the field of view as a grey smear across one edge.
 */
const WALL_STANDOFF = 0.6;
const ITEM_PAD = 0.15;

/**
 * INTERIOR WALLS ARE NOT IN plan.interior, which is the trap this function is
 * mostly here for. The interior polygon is the OUTLINE of the unit; the bathroom
 * box stands in the middle of it, so a point 3" inside the bathroom's west
 * partition is "inside the interior", is nowhere near a boundary edge, and is
 * clear of every piece of furniture. Layout B's screening camera landed exactly
 * there and rendered 1600x1000 pixels of pure black — a frame that costs 11
 * seconds and says nothing, which is the most expensive kind.
 *
 * So the wall solids are checked directly, at the same standoff.
 */
function isClear(p: Vec2, plan: FloorPlan, blockers: OBB[], solids: OBB[]): boolean {
  if (!pointInPolygon(p, plan.interior)) return false;
  if (edgeDistance(p, plan.interior) < WALL_STANDOFF) return false;
  if (solids.some((s) => insideObb(s, p, WALL_STANDOFF))) return false;
  return !blockers.some((b) => insideObb(b, p, ITEM_PAD));
}

/**
 * Is the straight line from a to b clear of WALLS?
 *
 * Sampled rather than solved: the wall solids are 4"-8" thick, a 0.15 ft step
 * cannot tunnel through one, and this runs a few hundred times per layout. The
 * reason it exists at all is the bathroom box — it stands in the middle of this
 * floor plate, so a camera position that is perfectly legal (inside the unit,
 * clear of furniture, well framed) can still be photographing the back of it.
 */
function seesThroughWalls(a: Vec2, b: Vec2, solids: OBB[]): boolean {
  const span = dist2(a, b);
  if (span < 1e-6) return true;
  const dir = norm([b[0] - a[0], b[1] - a[1]]);
  // Starts at 0.05, not at some polite offset from the lens: the wall this test
  // exists for can be 3" in front of the camera, and a 0.3 ft skip stepped right
  // over it.
  for (let t = 0.05; t < span - 0.3; t += 0.15) {
    const p = addv(a, dir, t);
    if (solids.some((s) => insideObb(s, p, 0))) return false;
  }
  return true;
}

/** A thing the frame is supposed to contain, as a circle in plan. */
interface Subject {
  center: Vec2;
  /** plan radius: half the diagonal of its footprint */
  radius: number;
}

function subjectOf(p: Placed): Subject {
  return { center: p.center, radius: Math.hypot(p.obb.w, p.obb.d) / 2 };
}

/**
 * COMPOSE A SHOT INSTEAD OF ASSUMING ONE.
 *
 * The first version of every shot below was a fixed offset — "stand 5 ft behind
 * the sofa, 1'-3" to the side" — and every one of them was wrong on at least one
 * of the four layouts, in the specific way that offsets are wrong: the geometry
 * is fine and the picture is empty. On layout A that put the camera 4 ft behind a
 * 26"-tall armless loveseat, which is BELOW the bottom of a 52 deg frame at that
 * distance, so the frame contained the screen, the desk, and no seating at all —
 * in the one shot whose entire job is to show the seating.
 *
 * So: state what has to be IN the frame, state the direction you would prefer to
 * shoot from, and let this search. It walks candidate bearings out from the
 * preferred one (0, then +/-18, +/-36 ... up to +/-90 deg) and candidate distances
 * from far to near, and scores each spot on
 *
 *   - how many subjects fall inside the frustum, with their angular size
 *     accounted for, which is the thing a fixed offset cannot know;
 *   - whether a wall stands between the lens and the focus;
 *   - standing room: a camera 8" off a wall is legal and looks like a mistake;
 *   - how far it drifted from the bearing the shot asked for.
 *
 * Coverage dominates the score by a factor of 10, so a shot will happily swing
 * 90 deg round the room rather than come back with an empty frame — which is the
 * right trade for a brief, where a missing sofa is a wrong claim and an unusual
 * angle is just an unusual angle.
 */
interface ComposeOpts {
  /** what the camera looks at, in plan */
  focus: Vec2;
  /** everything that must be inside the frame */
  subjects: Subject[];
  /** preferred bearing FROM the focus TOWARD the camera */
  prefer: Vec2;
  near: number;
  far: number;
  fov: number;
  aspect: number;
}

interface Composed {
  eye: Vec2;
  /** how many of the subjects the winning spot actually frames */
  covered: number;
}

function compose(o: ComposeOpts, plan: FloorPlan, blockers: OBB[], solids: OBB[]): Composed {
  // Horizontal half-angle, trimmed by 8% so nothing is judged "in frame" while
  // sitting on the edge of it.
  const halfH = Math.atan(Math.tan((o.fov * D2R) / 2) * Math.max(0.2, o.aspect)) * 0.92;
  let best: Vec2 | null = null;
  let bestCovered = 0;
  let bestScore = -Infinity;

  for (const deg of [0, 18, -18, 36, -36, 54, -54, 72, -72, 90, -90]) {
    const dir = rotDir(o.prefer, deg);
    for (let d = o.far; d >= o.near - 1e-9; d -= 0.4) {
      const eye = addv(o.focus, dir, d);
      if (!isClear(eye, plan, blockers, solids)) continue;
      if (!seesThroughWalls(eye, o.focus, solids)) continue;
      const look = norm([o.focus[0] - eye[0], o.focus[1] - eye[1]]);

      let covered = 0;
      for (const s of o.subjects) {
        const v: Vec2 = [s.center[0] - eye[0], s.center[1] - eye[1]];
        const dist = Math.hypot(v[0], v[1]);
        if (dist < 1.6) continue; // standing on top of it does not count as framing it
        const cos = Math.max(-1, Math.min(1, (v[0] * look[0] + v[1] * look[1]) / dist));
        const ang = Math.acos(cos);
        const half = Math.asin(Math.min(0.99, s.radius / dist));
        if (ang + half * 0.6 <= halfH) covered++;
      }

      const room = Math.min(3, edgeDistance(eye, plan.interior));
      const score = covered * 10 + room - Math.abs(deg) / 45 - Math.abs(d - o.far) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        bestCovered = covered;
        best = eye;
      }
    }
  }
  // Nothing legal anywhere: fall back to the requested bearing at the far end and
  // let the frame be visibly wrong rather than silently absent.
  return { eye: best ?? addv(o.focus, o.prefer, o.far), covered: bestCovered };
}

/**
 * WIDEN THE LENS BEFORE GIVING UP ON A SUBJECT.
 *
 * Layout C is the case: its second row IS the bed, the bed is already against the
 * west glazing, and the screen is 14'-6" away on the east partition. No standing
 * position in a 448 sq ft flat holds both inside a 52 deg frame — you would have
 * to be 20 ft behind a bed that has 3 ft behind it. A real interior photographer
 * does not shoot that room on a 50; they put on a wide and accept the distortion,
 * so this tries 52, then 62, then 72 and stops at the first that frames
 * everything. If none does, it keeps the widest attempt's best spot, and the
 * caller can say so.
 */
function composeWide(
  o: Omit<ComposeOpts, 'fov'>,
  fovs: number[],
  plan: FloorPlan,
  blockers: OBB[],
  solids: OBB[],
): Composed & { fov: number } {
  let best: (Composed & { fov: number }) | null = null;
  for (const fov of fovs) {
    const r = compose({ ...o, fov }, plan, blockers, solids);
    if (!best || r.covered > best.covered) best = { ...r, fov };
    if (r.covered >= o.subjects.length) break;
  }
  return best!;
}

// ------------------------------------------------------------------ items

interface Placed {
  item: PlacedItem;
  def: FurnitureDef;
  obb: OBB;
  /** floor to the item's base */
  z0: number;
  /** floor to the item's top */
  z1: number;
  /** the direction the item's FRONT faces, in plan */
  front: Vec2;
  center: Vec2;
}

function placed(item: PlacedItem, plan: FloorPlan): Placed | null {
  let def: FurnitureDef;
  try {
    def = getDef(item.def);
  } catch {
    return null;
  }
  const obb = itemObb(item, def);
  const h = item.size?.h ?? def.h;
  const z0 = item.z ?? def.defaultZ ?? 0;
  void plan;
  return {
    item,
    def,
    obb,
    z0,
    z1: z0 + h,
    front: rotDir([0, 1], item.rot ?? 0),
    center: obb.center,
  };
}

const hasTag = (p: Placed, tag: string): boolean => (p.def.tags ?? []).includes(tag);

function all(layout: Layout, plan: FloorPlan): Placed[] {
  return layout.items.map((i) => placed(i, plan)).filter((p): p is Placed => p !== null);
}

const byKind = (ps: Placed[], ...kinds: string[]): Placed[] =>
  ps.filter((p) => kinds.includes(p.def.kind));

/** The nearest of `ps` to a point, or null. */
function nearest(ps: Placed[], to: Vec2): Placed | null {
  let best: Placed | null = null;
  let bestD = Infinity;
  for (const p of ps) {
    const d = dist2(p.center, to);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

// --------------------------------------------------------------- exposure

/**
 * Per-shot exposure bias, in stops, on the SAME scale as raytrace.ts's
 * EXPOSURE_BIAS table — and derived from the same physical fact, rather than
 * copied from it.
 *
 * The unit is lit through ONE west-facing glazed wall. A frame looking WEST is
 * front-lit: everything it can see faces the light, and it needs no help (that is
 * eye-living, the frame the base exposure is calibrated on, at 0). A frame
 * looking EAST sees only surfaces lit from behind the camera, falling off with
 * distance, with no bright window anywhere in it — the measured presets sit at
 * +0.8 (eye-window, eye-entry) and +1.0 (eye-kitchen, whose every visible face is
 * turned away and whose floor is dark walnut).
 *
 * So: 0 due west, +0.9 due east, cosine between. On the four presets that were
 * measured by render this reproduces 0 / +0.9 / +0.9 / +0.9 against 0 / +0.8 /
 * +0.8 / +1.0 — inside a tenth of a stop of three of them and a fifth of the
 * fourth, which for a starting exposure is well inside what the shot itself
 * changes.
 */
function exposureFor(eye: Vec2, target: Vec2): number {
  const d = norm([target[0] - eye[0], target[1] - eye[1]]);
  return Math.round(0.45 * (1 + d[0]) * 100) / 100;
}

// ------------------------------------------------------------------ shots

/**
 * The lid-off plate: the whole unit from above, framed like the marketing
 * dollhouse it is.
 *
 * DUE SOUTH, AND THAT IS THE WHOLE TRICK. The camera has no roll control here —
 * its up vector is world up — so the compass bearing it stands on IS the rotation
 * of the plan in the frame. Stand anywhere off-axis and the drawing arrives
 * skewed across the page, which reads as a mistake next to a plan drawing that is
 * square. Standing due south of the unit and looking north puts plan north at the
 * top of the frame, exactly like the 2D plan on the same page.
 *
 * ELEVATION 74 DEG, not 90. Straight down is a floor plan, and we already draw
 * one of those properly (src/render2d). The value of this frame is that it is
 * three-dimensional: it shows the INNER faces of the north wall and the west
 * glazing, which is where the headboard, the shades and (in three of the four
 * schemes) the picture all live. The cost is what the near wall hides — a 9'
 * wall at 74 deg conceals 2'-7" of floor behind it, and every degree lower costs
 * about another 2". Below about 65 the sofa starts disappearing behind the south
 * wall; above about 80 the room flattens and the frame stops earning its place.
 */
function dollhouseShot(plan: FloorPlan, aspect: number): Shot {
  const fov = 30;
  const el = 74 * D2R;
  // plan direction from the target toward the camera: due SOUTH (+y).
  const u: Vec2 = [0, 1];
  const w = new THREE.Vector3(u[0] * Math.cos(el), Math.sin(el), u[1] * Math.cos(el)).normalize();
  const { position, target } = frameMassing(plan, w, fov, aspect, plan.ceilingHeight * 0.22, 1.02);
  return {
    id: 'dollhouse',
    title: 'The whole plan, lid off',
    caption:
      'Studio-lit cutaway, not a photograph: the concrete soffit and its downlights are hidden and the daylight rig is replaced by a neutral dome, so this frame says where everything is and nothing about how the room is lit.',
    position,
    target,
    fov,
    exposure: 0,
    mode: 'dollhouse',
  };
}

/**
 * THE SCREENING SHOT — the one frame that has to exist, because the projector is
 * the requirement this floor plate fights hardest.
 *
 * Built backwards from the picture: find the image plane, stand on its
 * centreline behind the main seat, and look at it. That means the frame contains
 * the seat, the throw and the image together, at the real distance, and a scheme
 * whose sofa is too close or too far off-axis shows it here rather than in a
 * table of angles.
 */
function screeningShot(
  ps: Placed[],
  plan: FloorPlan,
  blockers: OBB[],
  solids: OBB[],
  aspect: number,
): Shot | null {
  const screens = byKind(ps, 'projection_screen');
  if (!screens.length) return null;
  // Prefer the lit picture over the frame it sits on: same plane, and its top and
  // bottom are the IMAGE, which is what the frame should be composed on.
  const img = screens.find((s) => hasTag(s, 'lit')) ?? screens[0]!;
  const face = img.front; // points into the room
  const imgCenter: Vec3 = [img.center[0], (img.z0 + img.z1) / 2, img.center[1]];

  /*
   * A CLOSED WALL BED IS A CABINET, NOT A SEAT, and getting that wrong wrecks the
   * frame. `murphy_bed` covers both states — the closed cabinet and the deployed
   * platform — and only the second one has anybody sitting on it. Layout E puts a
   * 6'-11" closed cabinet on the north wall between the sofa and the picture's
   * wall; because it is nearer the image than the sofa is, nearest() chose it as
   * the seat and composed an over-the-shoulder frame from behind it, i.e. half a
   * photograph of a cabinet door. The `deployed` tag is what tells the two states
   * apart in the catalog, so it is what filters them here.
   */
  const seats = byKind(ps, 'sofa', 'sectional', 'loveseat', 'daybed', 'armchair', 'bed', 'murphy_bed')
    .filter((s) => s.def.kind !== 'murphy_bed' || hasTag(s, 'deployed'));
  const seat = nearest(
    seats.filter((s) => {
      // only seats actually in front of the screen
      const v: Vec2 = [s.center[0] - img.center[0], s.center[1] - img.center[1]];
      return v[0] * face[0] + v[1] * face[1] > 0.5;
    }),
    img.center,
  );

  /**
   * BOTH THINGS, ONE FRAME. The seat and the picture are the whole subject, so
   * they are both handed to compose() as subjects and the shot is aimed at a
   * point between them, biased 40% toward the picture — the image is the larger
   * object and the one that has to be legible.
   *
   * The preferred bearing is the seat-to-screen axis continued past the seat (the
   * over-the-shoulder view), which is the frame a person imagines. compose() is
   * free to swing off it, and on the short schemes it does: 5 ft behind a sofa
   * that is already 11 ft from the screen puts the lens through the west glazing.
   */
  const seatDist = seat ? dist2(seat.center, img.center) : 9;
  const axis = seat
    ? norm([img.center[0] - seat.center[0], img.center[1] - seat.center[1]])
    : face;
  const focus: Vec2 = [
    img.center[0] - axis[0] * seatDist * 0.4,
    img.center[1] - axis[1] * seatDist * 0.4,
  ];
  const subjects = [subjectOf(img), ...(seat ? [subjectOf(seat)] : [])];
  const { eye, fov, covered } = composeWide(
    { focus, subjects, prefer: neg(axis), near: 5.5, far: seatDist + 5.5, aspect },
    [52, 62, 72],
    plan,
    blockers,
    solids,
  );
  // 4'-6": above the seated head in front of it, below standing eye height —
  // where a room photograph of a seating group gets taken from.
  const eyeZ = 4.5;
  const imgW = Math.round((img.z1 - img.z0) * 12 * (16 / 9) * 10) / 10;

  /**
   * A SCREEN STANDING IN THE WINDOW IS A CURTAIN.
   *
   * exposureFor() reads the direction the camera looks and gives a frame looking
   * WEST no help, because west is where the light is. Layout B breaks that
   * assumption on purpose: its picture is a floor-riser that comes up in the
   * glazing itself, so the camera looks west at a 100" panel that is blocking the
   * only window in the shot, and everything in front of it is lit from behind.
   * Measured: that frame came back at mean L 85 where the other three screening
   * frames sit at 123-130.
   *
   * The test is geometric rather than per-layout — a screen within 2 ft of the
   * envelope is standing in the glazing, whatever scheme put it there.
   */
  const inTheWindow = edgeDistance(img.center, plan.interior) < 2.0;
  const exposure = Math.round((exposureFor(eye, img.center) + (inTheWindow ? 0.4 : 0)) * 100) / 100;
  return {
    id: 'screening',
    title: 'The congregation, and what it looks at',
    caption: seat
      ? `The seat-to-screen geometry as built: ${
          Math.round(seatDist * 10) / 10
        } ft from a ${imgW}"-wide 16:9 image. Rendered in DAYLIGHT with the shades stowed, which is not a watchable condition in this unit — that is what the blackout line in the budget buys, and the foot-lambert arithmetic is in the projection note.${
          covered < subjects.length
            ? ` The seating is behind the camera: at ${
                Math.round(seatDist * 10) / 10
              } ft apart there is no standing position in this flat that holds both it and the picture in one frame, which is itself the measurement — the room is exactly as long as the throw needs it to be.`
            : ''
        }`
      : 'The screen wall, with the picture plane in place.',
    position: world(eye, eyeZ),
    target: imgCenter,
    fov,
    exposure,
    mode: 'interior',
  };
}

/**
 * THE DESK SHOT — the second hard requirement, and the one a plan drawing is
 * worst at: whether a 60" top with a monitor on it feels like a workstation or
 * like a shelf depends entirely on what is around and behind it.
 *
 * Every scheme puts the Jarvis against the north wall with the user facing north
 * and the glazing on their left (the house rule in faces.ts), so the camera goes
 * where the user's back would be, stepped WEST toward the glass so the frame
 * carries some daylight and the monitor is seen at an angle rather than edge-on.
 */
function deskShot(
  ps: Placed[],
  plan: FloorPlan,
  blockers: OBB[],
  solids: OBB[],
  aspect: number,
): Shot | null {
  const desk = byKind(ps, 'desk')[0];
  if (!desk) return null;
  // Preferred bearing: from in front of the desk, stepped 30 deg toward the
  // glazing side, so the monitor is seen at an angle and the frame carries some
  // daylight instead of being a wall elevation.
  // R(+30) on a south-facing front swings the bearing to the south-WEST, i.e.
  // toward the glazing; mirrored for a desk that faces the other way.
  const prefer = rotDir(desk.front, desk.front[1] > 0 ? 30 : -30);
  const { eye, fov } = composeWide(
    { focus: desk.center, subjects: [subjectOf(desk)], prefer, near: 6, far: 10, aspect },
    [55, 65],
    plan,
    blockers,
    solids,
  );
  const target: Vec3 = [desk.center[0], desk.z1 + 0.5, desk.center[1]];
  return {
    id: 'desk',
    title: 'The Jarvis, in its corner',
    caption:
      'The work setup at standing eye height. The glazing is on the user’s left in every scheme — a screen may face north or south in this unit but never into or away from a west sun.',
    position: world(eye, 5.0),
    target,
    fov,
    exposure: exposureFor(eye, desk.center),
    mode: 'interior',
  };
}

/**
 * THE SLEEPING SHOT — a queen is 60x80 and this is a 508 sq ft studio, so the
 * only honest way to show what it costs is to photograph it in the room rather
 * than to state its footprint.
 *
 * Taken from the foot corner, high enough to read the circulation around it,
 * because the interesting number is not the bed, it is the aisle beside it.
 */
function bedShot(
  ps: Placed[],
  plan: FloorPlan,
  blockers: OBB[],
  solids: OBB[],
  aspect: number,
): Shot | null {
  const bed = byKind(ps, 'bed', 'murphy_bed', 'sofa_bed')[0];
  if (!bed) return null;
  // From the foot, swung 35 deg off the centreline: square-on to a bed is a
  // mattress swatch, and the aisle down its side is the thing worth seeing.
  const prefer = rotDir(bed.front, 35);
  /**
   * DISTANCE FROM THE SUBJECT'S OWN SIZE, not a constant. A flat queen is 6'-8"
   * long and wants to be seen from 10-12 ft; a CLOSED MURPHY CABINET is a 5 ft
   * wardrobe and at 13 ft it is a white rectangle in the middle of a lot of wall
   * (which is precisely what layout B's first sleeping frame was).
   */
  const r = subjectOf(bed).radius;
  const far = Math.max(8, Math.min(12.5, 5.5 + r * 1.6));
  const folded = bed.def.kind === 'murphy_bed';
  /**
   * A CLOSED MURPHY IS NOT A SUBJECT — it is a white cabinet on a white wall, and
   * photographed alone it is a picture of nothing (measured the honest way: the
   * first version of this frame was 60% blank plasterboard). What the scheme is
   * actually claiming is that the bed's floor is the SEATING's floor for 22 hours
   * a day, so the nearest seat is put in the frame with it and the claim becomes
   * visible. A bed that stays down needs no such help.
   */
  const companion = folded
    ? nearest(byKind(ps, 'sofa', 'sectional', 'loveseat', 'armchair'), bed.center)
    : null;
  const { eye, fov } = composeWide(
    {
      focus: companion
        ? [(bed.center[0] + companion.center[0]) / 2, (bed.center[1] + companion.center[1]) / 2]
        : bed.center,
      subjects: [subjectOf(bed), ...(companion ? [subjectOf(companion)] : [])],
      prefer,
      near: far - 4,
      far: companion ? far + 3 : far,
      aspect,
    },
    [52, 62, 70],
    plan,
    blockers,
    solids,
  );
  /**
   * AIM AT THE MIDDLE OF THE THING, capped at 3'-2". `z1 - 0.6` is the right
   * height for a mattress and badly wrong for a 6'-5" cabinet: it tips the
   * camera up and fills the frame with soffit.
   */
  const target: Vec3 = [
    bed.center[0],
    Math.min(3.2, Math.max(1.6, (bed.z0 + bed.z1) / 2)),
    bed.center[1],
  ];
  return {
    id: 'sleeping',
    title: folded ? 'The queen, folded away' : 'The queen, and what it costs',
    caption: folded
      ? 'The Murphy cabinet shut, which is how this scheme spends 22 hours a day: the queen is inside it, and the floor it would occupy is the floor the seating is standing on.'
      : 'A 60×80 queen in a 508 sq ft studio, photographed from the foot so the aisle beside it — not the mattress — is what you are looking at.',
    position: world(eye, 4.8),
    target,
    fov,
    exposure: exposureFor(eye, bed.center),
    mode: 'interior',
  };
}

/**
 * THERE IS NO "WHOLE ROOM" SHOT HERE, and that is deliberate.
 *
 * One was written, and it is worth recording why it was deleted rather than
 * quietly leaving a fourth camera in the list. The obvious place to stand for a
 * frame that holds the entire arrangement is the far south-east end of the open
 * studio, looking west into the glazing. In this plan that spot is INSIDE the
 * closet corridor: the bathroom box and a 90-deg-open closet leaf fill the frame
 * and the living end is not visible at all (rendered, checked, binned).
 *
 * The plan-derived preset eye-hero/eye-living already solves this properly —
 * cameraFor() cants eye-entry by exactly 0.15 in dy/dx to clear that same
 * bathroom corner, which is a fact about the ROOM, not about a layout — so the
 * brief uses the preset for its wide frame and the shots below for everything
 * that is about the furniture.
 */

/**
 * Every shot for a layout, in the order a brief should show them: the diagram
 * first, then the two hard requirements, then the room, then the bed.
 *
 * Shots that have nothing to point at return null and simply do not appear —
 * a layout with no projector gets no screening frame rather than a frame of a
 * blank wall.
 */
export function shotsFor(plan: FloorPlan, layout: Layout, aspect: number): Shot[] {
  const ps = all(layout, plan);
  // blockersFor() is the analyzer's own view of what occupies floor — walkables
  // (rugs, the lit image plane) are already out of it, which is exactly the set a
  // camera may not stand inside.
  const blockers = blockersFor(plan, layout);
  // The walls themselves, for the line-of-sight test. Exterior walls are in here
  // too and cost nothing: a sightline that leaves the unit has already failed the
  // interior-polygon test.
  const solids = plan.walls.map(wallSolid);
  const shots: (Shot | null)[] = [
    dollhouseShot(plan, aspect),
    screeningShot(ps, plan, blockers, solids, aspect),
    deskShot(ps, plan, blockers, solids, aspect),
    bedShot(ps, plan, blockers, solids, aspect),
  ];
  return shots.filter((s): s is Shot => s !== null);
}

/** One shot by id, or undefined. */
export function shotById(plan: FloorPlan, layout: Layout, aspect: number, id: string): Shot | undefined {
  return shotsFor(plan, layout, aspect).find((s) => s.id === id);
}
