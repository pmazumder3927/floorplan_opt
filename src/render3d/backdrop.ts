/**
 * THE OUTLOOK — everything you see THROUGH the west glazing.
 *
 * WHY THIS FILE EXISTS
 * The reference photograph (data/reference/unit-photo-living-west.jpeg) is a
 * high-floor unit with FLOOR-TO-CEILING glass on its west wall. Measured off that
 * frame, the glass and what is behind it occupy roughly a third of the image, and
 * the exterior is the single brightest region in it. A flat gradient sky behind
 * that glass is the fastest possible way to make an arch-viz frame read as a video
 * game, so the view has to be real geometry: a ground plane far below, a carpet of
 * mid-rise rooftops in the middle distance fading into haze, and the glass
 * curtain-wall tower that stands immediately to the right of the frame in the
 * photo (i.e. NORTH-west of the window wall, since we are looking west and plan
 * north is -y).
 *
 * COORDINATE MAPPING — the same one build.ts uses, and the only one here:
 *   plan (x, y) -> world (x, height, y)     world +Y up, world +Z = plan SOUTH
 * So plan WEST is world -X, plan NORTH is world -Z, and "outside the west
 * glazing" means x < plan.footprint's minimum x. Everything is in FEET.
 *
 * ROTATION SIGN (proved in build.ts, reused): a plan rotation of `rot` degrees
 * clockwise on the page is three.js `rotation.y = -rot * PI/180`.
 *
 * EVERYTHING HERE IS UNLIT — and that is a deliberate, load-bearing decision.
 * The city uses MeshBasicMaterial with baked vertex colours, never
 * MeshStandardMaterial, because:
 *   1. AERIAL PERSPECTIVE IS NOT A LIGHTING EFFECT. Distance haze is scattering
 *      *between* the block and the eye. It has to be applied AFTER shading, which
 *      means baking the final colour. Lit materials would let the renderer shade
 *      the hazed albedo a second time and the far skyline would go dark instead of
 *      dissolving into the sky.
 *   2. The faces we actually see from inside (east / south-east faces) point AWAY
 *      from the late-afternoon sun, so a lit city would be a wall of silhouettes.
 *      Real hazy daylight fills them from the sky; baking gets that for free.
 *   3. Cost. The whole outlook is ~4 draw calls, 2 shader programs, zero shadow
 *      map work, and it is immune to whatever the interior lighting rig does. That
 *      matters: this scene renders on swiftshader (software WebGL), where every
 *      extra shader program compile is measurable.
 * Face shading IS baked, from the same sun formula the scene lights use, so the
 * blocks agree with the interior's shadow direction.
 *
 * DETERMINISM: one mulberry32 stream seeded from opts.seed. No Math.random
 * anywhere in this file, so the same seed is the same city forever.
 */

import * as THREE from 'three';
import { FTIN, IN } from '@/core/units';
import { polygonBounds } from '@/core/geometry';
import type { FloorPlan, Opening, Wall } from '@/core/types';

const D2R = Math.PI / 180;

/**
 * The project's default city. Any integer works; this one is just the date the
 * outlook was built. It must match DEFAULT_SEED in scripts/blender/world.py, or
 * the WebGL preview and the Cycles hero frame look out at two different cities.
 */
export const DEFAULT_SEED = 20250729;

// ---------------------------------------------------------------- determinism

/**
 * mulberry32 — 32-bit PRNG, ~2^32 period, 4 ops per draw. Chosen over xorshift32
 * because it passes gjrand/small-crush and needs no warm-up, so seed 1 is as good
 * a city as seed 12345.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** uniform in [lo, hi) */
function between(rnd: () => number, lo: number, hi: number): number {
  return lo + (hi - lo) * rnd();
}

/** Deterministic pick from a list. */
function pick<T>(rnd: () => number, xs: readonly T[]): T {
  return xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))];
}

/**
 * ONE STREAM PER SUBJECT, not one stream for the whole backdrop.
 *
 * Two reasons, both learned the hard way:
 *   1. STABILITY. If the tower and the city share a stream, adding one glass panel
 *      to the tower reshuffles every building in the city. Salting the seed per
 *      subject means each part is independently reproducible.
 *   2. CROSS-RENDERER AGREEMENT. scripts/blender/world.py rebuilds the SAME city
 *      for the Cycles hero frame, and it can only do that if it can reproduce this
 *      exact draw sequence. It reimplements mulberry32 (bit-for-bit: the same
 *      arithmetic modulo 2^32) and the same salts, so preview and hero frame show
 *      the same buildings in the same places. Reproducing the tower's per-panel
 *      tint jitter as well would be absurd, so the tower has its own stream and
 *      Blender simply does not consume it.
 *
 * The salts are the golden-ratio and xxhash constants — arbitrary, but fixed
 * forever, and they must match world.py's MASSING_SALT / TOWER_SALT.
 */
const MASSING_SALT = 0x9e3779b9;
const TOWER_SALT = 0x85ebca6b;

// ---------------------------------------------------------------- sun + haze

/**
 * The sun direction, from the SAME formula the interior lighting uses
 * (addLighting in ./build.ts) so the baked city shading, the sky's sun disc and
 * the interior's cast shadows all agree:
 *   compass bearing (deg) = 90 + 180 t     -> 09:00 east, 12:00 south, 18:00 west
 *   elevation       (deg) = max(8, 70 sin(pi t))
 * A compass bearing A points plan (sin A, -cos A) = world (sin A, ·, -cos A).
 * Returns a unit vector pointing FROM the scene TOWARD the sun.
 */
export function sunDirection(tod: number): THREE.Vector3 {
  const t = Math.min(1, Math.max(0, tod));
  const az = (90 + 180 * t) * D2R;
  const el = Math.max(8, 70 * Math.sin(Math.PI * t)) * D2R;
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    -Math.cos(az) * Math.cos(el),
  ).normalize();
}

/**
 * Colour of the sky at the horizon — the colour distant things fade INTO, and the
 * colour the ground plane melts into at its far edge. Bright hazy daylight is
 * almost white at the horizon (Rayleigh + aerosol scattering saturates over a long
 * path), with a warm bias once the sun drops past mid-afternoon.
 * Sampled from the reference photo's sky just above the far rooftops: ~#e4e6e3.
 */
export function horizonColor(tod: number): THREE.Color {
  const t = Math.min(1, Math.max(0, tod));
  const base = new THREE.Color('#e4e6e3');
  // warm the haze after solar noon; at t=1 (sunset) it is well into amber
  const warm = new THREE.Color('#f6e3c8');
  return base.lerp(warm, Math.max(0, (t - 0.5) * 0.8));
}

/** Colour at the zenith. Hazy days are pale and desaturated, not postcard blue. */
export function zenithColor(tod: number): THREE.Color {
  const t = Math.min(1, Math.max(0, tod));
  const base = new THREE.Color('#7d9fc4');
  const dusk = new THREE.Color('#6f88ad');
  return base.lerp(dusk, Math.max(0, (t - 0.6) * 1.6));
}

// ---------------------------------------------------------------- baked shading

/**
 * Bake per-face brightness into a geometry's `color` attribute.
 *
 * Physically this is a three-term integrator evaluated per face normal:
 *   direct : max(0, n · sun)          — the sun
 *   sky    : 0.5 + 0.5 * n.y          — a uniform hemisphere, cosine-weighted over
 *                                       the face (1 looking up, 0.5 vertical, 0 down)
 *   bounce : 0.5 - 0.5 * n.y          — the same integral over the LOWER hemisphere,
 *                                       i.e. light coming back up off the city
 * The bounce term is not decoration: without it the east and south faces (the ones
 * we actually see from inside) come out at a third of the roof brightness and the
 * city reads as a row of silhouettes. Real vertical surfaces in a dense city get a
 * large share of their light off the pavement and the building opposite.
 *
 * With no shadowing (correct enough for boxes seen at 100-1000 ft) that is the
 * whole light transport. It is applied to the SHARED unit-box geometry, which is
 * only legal because every instance using it has the same orientation — hence the
 * `yawDeg` parameter: the tower is rotated, so its sun vector is counter-rotated
 * into the geometry's local frame before baking.
 *
 * Normals are read from the geometry rather than assuming BoxGeometry's face
 * order, so this keeps working if the geometry ever changes.
 */
function bakeFaceShading(
  geo: THREE.BufferGeometry,
  sun: THREE.Vector3,
  yawDeg: number,
  direct: number,
  sky: number,
  bounce: number,
): THREE.BufferGeometry {
  const local = sun.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yawDeg * D2R);
  const nAttr = geo.getAttribute('normal');
  const colors = new Float32Array(nAttr.count * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < nAttr.count; i++) {
    n.fromBufferAttribute(nAttr, i).normalize();
    const k =
      direct * Math.max(0, n.dot(local)) + sky * (0.5 + 0.5 * n.y) + bounce * (0.5 - 0.5 * n.y);
    colors[i * 3] = k;
    colors[i * 3 + 1] = k;
    colors[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * A unit cube (1 x 1 x 1, centred) with baked shading. Instances scale it, so all
 * of the city's masses share ONE geometry and ONE 8-vertex-per-face buffer.
 */
function shadedUnitBox(
  sun: THREE.Vector3,
  yawDeg: number,
  direct = 0.42,
  sky = 0.58,
  bounce = 0.2,
): THREE.BufferGeometry {
  return bakeFaceShading(new THREE.BoxGeometry(1, 1, 1), sun, yawDeg, direct, sky, bounce);
}

// ---------------------------------------------------------------- options

export interface BackdropOptions {
  /**
   * PRNG seed, an integer in 0..2^32-1. Same seed -> byte-identical city, in this
   * renderer AND in Cycles (scripts/blender/world.py reproduces it). Default
   * DEFAULT_SEED.
   */
  seed?: number;
  /**
   * 0..1 time of day, same parameter as Render3DOptions.timeOfDay. Drives the
   * baked sun direction and the haze colour. Default 0.72 (late afternoon, the
   * hour that rakes light in through a west wall).
   */
  timeOfDay?: number;
  /**
   * Which floor the unit is on, 1-based. The reference photo looks DOWN onto
   * 4-6 storey roofs across a wide spread of the city, which puts the camera
   * somewhere around the 12th-16th floor; 14 is the middle of that range and is
   * the one assumption in this file that cannot be derived from the plan.
   * Must match `level` in scripts/blender/world.py's build_city.
   */
  level?: number;
  /**
   * Structural floor-to-floor. Defaults to the plan's ceiling height plus a 12"
   * slab-and-plenum sandwich, which is a normal concrete residential stack.
   */
  floorToFloor?: number;
  /**
   * How many mid-rise masses to scatter. Default 260 — enough that the middle
   * distance reads as continuous built fabric rather than scattered boxes on a
   * visible ground plane. They all live in ONE InstancedMesh, so the count costs
   * instances, not draw calls.
   */
  blocks?: number;
  /** Build the adjacent curtain-wall tower. Default true — it is in the photo. */
  tower?: boolean;
  /** Build our own building's facade dropping away below the glass. Default true. */
  facade?: boolean;
  /** Override the colour distant geometry fades into. Default horizonColor(tod). */
  hazeColor?: string;
}

// ---------------------------------------------------------------- city frame

/**
 * Everything below is dimensioned in one of two ways and never any other:
 *   - REAL SIZES (storey heights, glazing modules, parapets) through IN()/FTIN(),
 *     with the real-world source named.
 *   - DISTANCES AND FOOTPRINTS as multiples of `span`, the unit's own footprint
 *     span, so the outlook rescales with the plan instead of being pinned to this
 *     one building's numbers.
 */
interface CityFrame {
  /** world x of the outer face of the west wall — the city lives west of this */
  glassX: number;
  /** world z (plan y) of the middle of the west wall — the view's centre line */
  viewZ: number;
  /** north edge of the footprint in world z; the tower sits north of it */
  northZ: number;
  /** the unit's own footprint span, the scale unit for every distance below */
  span: number;
  /** world y of the street, i.e. how far below the unit's floor grade is */
  groundY: number;
  /** e-folding distance of the haze, in feet */
  hazeDist: number;
  haze: THREE.Color;
  sun: THREE.Vector3;
  /** the city-massing stream: mid-rise scatter first, then the far skyline */
  rnd: () => number;
  /** the tower's own stream (see MASSING_SALT / TOWER_SALT) */
  towerRnd: () => number;
}

function cityFrame(plan: FloorPlan, opts: BackdropOptions): CityFrame {
  const b = polygonBounds(plan.footprint);
  const span = Math.max(b.w, b.h);
  const tod = opts.timeOfDay ?? 0.72;
  const f2f = opts.floorToFloor ?? plan.ceilingHeight + IN(12);
  const level = Math.max(1, Math.round(opts.level ?? 14));
  return {
    glassX: b.min[0],
    viewZ: (b.min[1] + b.max[1]) / 2,
    northZ: b.min[1],
    span,
    // floor 1 is at grade, so an N-th floor slab is (N-1) storeys up
    groundY: -(level - 1) * f2f,
    /**
     * Haze e-folding distance. 30 spans is ~910 ft here: a block at 900 ft is
     * 63% dissolved and the far skyline at 3000 ft is 96% gone. Tuned against the
     * photo, where the middle-distance roofs are still clearly DARKER than the sky
     * and hold their brown and grey — only the last band washes out. A shorter
     * haze distance greys the middle distance out and loses the depth cue it is
     * supposed to create.
     */
    hazeDist: span * 30,
    haze: opts.hazeColor ? new THREE.Color(opts.hazeColor) : horizonColor(tod),
    sun: sunDirection(tod),
    rnd: mulberry32((opts.seed ?? DEFAULT_SEED) ^ MASSING_SALT),
    towerRnd: mulberry32((opts.seed ?? DEFAULT_SEED) ^ TOWER_SALT),
  };
}

/** Aerial perspective: fraction of a surface's colour replaced by haze at `dist`. */
function hazeAt(f: CityFrame, dist: number): number {
  return 1 - Math.exp(-Math.max(0, dist) / f.hazeDist);
}

/** Apply aerial perspective to a colour. Lerp is in linear space (THREE.Color). */
function hazed(f: CityFrame, c: THREE.Color, dist: number): THREE.Color {
  return c.clone().lerp(f.haze, hazeAt(f, dist));
}

/** Horizontal distance from the viewer (the west glass) to a world point. */
function viewDist(f: CityFrame, x: number, z: number): number {
  return Math.hypot(x - f.glassX, z - f.viewZ);
}

// ---------------------------------------------------------------- ground

/**
 * The street/grade plane, far below.
 *
 * It is SUBDIVIDED and vertex-coloured rather than flat, because a single flat
 * colour reaching to the horizon is the other classic tell of a fake exterior:
 * the plane's far edge shows up as a hard line against the sky. Baking the same
 * aerial-perspective curve into its vertices makes the far edge arrive at the
 * haze colour, so it disappears into the sky exactly where the sky texture's
 * horizon is.
 *
 * Size: 130 spans (~2 miles) each way. At 130 ft up, the far edge sits 1.1 deg
 * below the true horizon — close enough that the haze hides the difference, and
 * far enough that no camera in this project can see past it.
 */
function buildGround(f: CityFrame): THREE.Mesh {
  const half = f.span * 130;
  const SEG = 40; // 40x40 quads = 1681 verts; the haze gradient needs the density
  const geo = new THREE.PlaneGeometry(half * 2, half * 2, SEG, SEG);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);

  /**
   * Grade in a dense city is asphalt and roof-shadow, not lawn: a dark warm grey.
   * It is only ever glimpsed between buildings, so it mainly reads as the dark
   * "floor" of the city that makes the roofs pop.
   */
  const street = new THREE.Color('#6b6862');
  const c = new THREE.Color();
  // PlaneGeometry is authored in its own XY plane and rotated -90 about X below,
  // so local (px, py) maps to world (px, ·, -py) before the mesh is translated.
  for (let i = 0; i < pos.count; i++) {
    const wx = f.glassX - f.span * 40 + pos.getX(i);
    const wz = f.viewZ - pos.getY(i);
    c.copy(street).lerp(f.haze, hazeAt(f, viewDist(f, wx, wz)));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, name: 'backdrop-ground' }),
  );
  mesh.rotation.x = -Math.PI / 2;
  // pulled 40 spans west of the glass so the visible half of the plane is the
  // half we are actually looking at
  mesh.position.set(f.glassX - f.span * 40, f.groundY, f.viewZ);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = 'backdrop:ground';
  return mesh;
}

// ---------------------------------------------------------------- rooftops

/** One instance to write into the shared InstancedMesh. */
interface Mass {
  cx: number;
  cz: number;
  /** footprint, world x and z extents */
  w: number;
  d: number;
  /** absolute world y of the top and of the bottom */
  top: number;
  bottom: number;
  color: THREE.Color;
}

/**
 * WALLS AND ROOFS ARE DIFFERENT COLOURS, and getting that wrong was the single
 * biggest error in the first pass of this file: one colour per mass made every
 * near building a dark brown silhouette, because a roof albedo (tar, ~0.08) on a
 * vertical face that only sees half the sky comes out near black.
 *
 * Real mid-rise walls are masonry, stucco and concrete — mid-tone, 0.25-0.45
 * albedo, and that is what you see across the street in the reference photo.
 * Roofs are dark. So the mass box carries a WALL colour and the deck slab on top
 * carries a ROOF colour.
 */
const WALL_COLORS = [
  '#8f857a', // warm grey stucco — the commonest wall in the photo
  '#9c9489',
  '#a89e91', // pale render
  '#7f7468', // shaded/dirty stucco
  '#8a6f5e', // red brick
  '#a2a099', // concrete
  '#b0a898', // light painted brick
  '#77706a', // dark grey render
  '#8d9195', // cool grey precast
  '#6e7276', // dark cool grey / glazed office block
] as const;

/**
 * ROOF COLOURS: built-up tar and gravel, a few pale TPO membranes, weathered
 * concrete decks. Deliberately DARKER than what you would eyedrop off the photo:
 * the baked shading puts the sun plus the whole sky hemisphere on every roof (top
 * faces land near 1.0) and ACESFilmic then lifts the midtones, so an eyedropped
 * albedo renders about 1.5 stops too light and the city looks like a foam model.
 * Calibrated by rendering, not by guessing.
 *
 * DELIBERATELY NOT THE SAME VALUES AS scripts/blender/world.py, and that is not
 * drift. world.py feeds a path tracer where an albedo is just an albedo; this
 * feeds the raster preview, whose baked lighting plus ACESFilmic lifts midtones
 * about 1.5 stops. Both tables were calibrated against the reference photo
 * THROUGH THEIR OWN PIPELINE, so forcing them equal would make one of them wrong.
 *
 * What MUST stay in lockstep is the LENGTH and the ORDER: both scatterers index
 * this table with the same seeded PRNG, so entry i has to mean the same kind of
 * roof in both or the two renderers put different buildings in the same place.
 * Change one, change the other, and re-run world.py's parity self-check.
 */
const ROOF_COLORS = [
  '#5c5952', // built-up tar and gravel — the most common roof in the photo
  '#67635b',
  '#736f66', // weathered concrete deck
  '#807b71',
  '#948f84', // pale membrane / ballast
  '#a5a096',
  '#6b5a4e', // gravel ballast over a brick building
  '#4e4c48', // dark bitumen, freshly done
] as const;

/**
 * Scatter the mid-rise carpet.
 *
 * DEPTH DISTRIBUTION. The photo's roofs are densest in the middle distance and
 * thin out into haze, so depth is drawn from a triangular variate (the average of
 * two uniforms) raised to 1.6. The triangular part peaks the mass in the middle
 * of the range instead of the near edge; the exponent pulls that peak in to about
 * a third of the way out, which is where "middle distance" actually lands for a
 * 14th-floor eye.
 *
 * LATERAL SPREAD grows with depth (a cone, +/-62 deg off due west) so the carpet
 * fills the frame at every depth instead of tapering to a wedge.
 */
function scatterMidRise(f: CityFrame, count: number, keepOut: KeepOut | null): Mass[] {
  const out: Mass[] = [];
  const { rnd } = f;

  // Nothing closer than 3 spans (~91 ft): that is the street plus the far
  // sidewalk. Anything nearer would be a wall, not a view.
  const near = f.span * 3;
  const far = f.span * 34; // ~1030 ft, the last row that still resolves as a roof
  const STOREY = FTIN(11, 0); // commercial/mixed-use storey; residential is ~10'

  for (let i = 0; i < count; i++) {
    const u = ((rnd() + rnd()) / 2) ** 1.6;
    const depth = near + (far - near) * u;
    const halfFan = depth * Math.tan(62 * D2R);
    const cx = f.glassX - depth;
    const cz = f.viewZ + between(rnd, -halfFan, halfFan);

    /**
     * NEAR BLOCKS ARE SMALLER AND LOWER, and this is the constraint that decides
     * whether the view works at all.
     *
     * We are 130 ft up. A 12-storey block (132 ft) at 91 ft away reaches our floor
     * level and subtends 60 deg — it does not "add depth", it WALLS THE VIEW OFF,
     * which is exactly what happened before this cap existed. The reference photo
     * agrees: the near neighbours across the street are 4-6 storeys and we look
     * clean over all of them; the taller slabs are all further out.
     *
     * So the tall tail is only allowed past a third of the way out, and near plates
     * are capped at 110 ft rather than 170 ft so a single one cannot fill a bay.
     */
    const nearField = depth < far * 0.35;
    const maxPlate = nearField ? FTIN(110) : FTIN(170);
    const w = between(rnd, FTIN(55), maxPlate);
    const d = between(rnd, FTIN(55), maxPlate);

    /**
     * Heights: mostly 2-7 storeys at 11 ft each, with a 16% tail up to 12 storeys
     * further out. In the photo the near-middle roofs all sit clearly below the
     * camera and a couple of taller slabs interrupt the skyline behind them —
     * that tail is what stops the carpet reading as a single extruded height field.
     */
    const cap = nearField ? 6 : 12;
    const storeys =
      rnd() < 0.16
        ? Math.round(between(rnd, Math.min(7, cap), cap))
        : Math.round(between(rnd, 2, Math.min(7, cap)));
    const h = storeys * STOREY;

    if (keepOut && keepOut.hits(cx, cz, w, d)) continue;

    const dist = viewDist(f, cx, cz);
    out.push({
      cx,
      cz,
      w,
      d,
      top: f.groundY + h,
      bottom: f.groundY,
      color: hazed(f, new THREE.Color(pick(rnd, WALL_COLORS)), dist),
    });

    /**
     * ROOF CLUTTER. A bare box is instantly readable as a box, and from the 14th
     * floor the thing you are mostly looking at IS the roof, so it has to be a
     * roof: a raised parapet rim (4 thin boxes, so the deck inside stays visible),
     * a darker deck slab, and often a mechanical penthouse or stair bulkhead.
     *
     * All of it goes into the SAME InstancedMesh, so ~6 extra instances per
     * building costs zero extra draw calls. Only done on the near 45% of the
     * range; past that the haze has eaten the detail and it would be pure waste.
     */
    if (depth < far * 0.45) {
      const PARAPET = FTIN(2, 6); // guard upstand — the code minimum for roof access
      const RIM = IN(10); // parapet wall thickness: 8" CMU + finish
      const roofC = hazed(f, new THREE.Color(pick(rnd, ROOF_COLORS)), dist);
      // the parapet is the wall carried up past the deck, so it is a wall colour,
      // just a shade darker where the coping shades it
      const rimC = hazed(f, new THREE.Color(pick(rnd, WALL_COLORS)).multiplyScalar(0.92), dist);

      // deck: a thin slab just inside the rim, so the rim reads as raised
      out.push({
        cx,
        cz,
        w: w - RIM * 2,
        d: d - RIM * 2,
        top: f.groundY + h + IN(4),
        bottom: f.groundY + h,
        color: roofC,
      });
      // rim: two boxes across the full width, two more between them
      out.push({ cx, cz: cz - (d - RIM) / 2, w, d: RIM, top: f.groundY + h + PARAPET, bottom: f.groundY + h, color: rimC });
      out.push({ cx, cz: cz + (d - RIM) / 2, w, d: RIM, top: f.groundY + h + PARAPET, bottom: f.groundY + h, color: rimC });
      out.push({ cx: cx - (w - RIM) / 2, cz, w: RIM, d: d - RIM * 2, top: f.groundY + h + PARAPET, bottom: f.groundY + h, color: rimC });
      out.push({ cx: cx + (w - RIM) / 2, cz, w: RIM, d: d - RIM * 2, top: f.groundY + h + PARAPET, bottom: f.groundY + h, color: rimC });

      if (rnd() < 0.6) {
        const mw = w * between(rnd, 0.18, 0.4);
        const md = d * between(rnd, 0.18, 0.4);
        const mh = between(rnd, FTIN(6), FTIN(12)); // AHU / lift overrun / stair bulkhead
        out.push({
          cx: cx + between(rnd, -(w - mw) / 2 + RIM, (w - mw) / 2 - RIM),
          cz: cz + between(rnd, -(d - md) / 2 + RIM, (d - md) / 2 - RIM),
          w: mw,
          d: md,
          top: f.groundY + h + mh,
          bottom: f.groundY + h,
          color: hazed(f, new THREE.Color('#8e8a80'), dist),
        });
      }
    }
  }
  return out;
}

/**
 * The downtown skyline on the horizon: a handful of tall slabs at 70-110 spans
 * (~2100-3350 ft), 99% dissolved by haze. In the photo these are the faintest
 * shapes in the frame and they are what tells you this is a city rather than a
 * suburb — take them out and the middle distance has nothing to be in front of.
 */
function scatterSkyline(f: CityFrame): Mass[] {
  const out: Mass[] = [];
  const { rnd } = f;
  const STOREY = FTIN(12, 6); // office storey
  const n = 18;
  for (let i = 0; i < n; i++) {
    const depth = between(rnd, f.span * 70, f.span * 110);
    const halfFan = depth * Math.tan(52 * D2R);
    const cx = f.glassX - depth;
    const cz = f.viewZ + between(rnd, -halfFan, halfFan);
    const w = between(rnd, FTIN(90), FTIN(220));
    const d = between(rnd, FTIN(90), FTIN(220));
    // 12-26 office storeys = 150-325 ft. Taller than that and their tops sit
    // >5 deg above our horizon, which reads as a fantasy skyline rather than the
    // low cluster the photo shows just over the near rooftops.
    const h = Math.round(between(rnd, 12, 26)) * STOREY;
    /**
     * At this range the haze is 96-99% and they would converge to the exact sky
     * colour, i.e. vanish. Real distant towers do NOT vanish: against a bright
     * hazy sky they stay a touch darker and noticeably BLUER than the sky, because
     * the light reaching you is scattered sky-light and its short wavelengths
     * survive best. So cap the haze at 0.93 and fade toward a blue-shifted haze
     * instead of the haze itself.
     */
    const blueHaze = f.haze.clone().lerp(new THREE.Color('#a8bccb'), 0.5);
    const k = Math.min(0.93, hazeAt(f, viewDist(f, cx, cz)));
    out.push({
      cx,
      cz,
      w,
      d,
      top: f.groundY + h,
      bottom: f.groundY,
      color: new THREE.Color('#5c6068').lerp(blueHaze, k),
    });
  }
  return out;
}

/**
 * Pack a list of masses into ONE InstancedMesh: one draw call, one shader, one
 * geometry, per-instance colour carrying the baked albedo x aerial perspective.
 */
function packMasses(f: CityFrame, masses: Mass[], name: string): THREE.InstancedMesh {
  const geo = shadedUnitBox(f.sun, 0);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, name: 'backdrop-massing' });
  const mesh = new THREE.InstancedMesh(geo, mat, masses.length);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  masses.forEach((b, i) => {
    const h = Math.max(IN(1), b.top - b.bottom);
    pos.set(b.cx, (b.top + b.bottom) / 2, b.cz);
    scale.set(b.w, h, b.d);
    mesh.setMatrixAt(i, m.compose(pos, quat, scale));
    mesh.setColorAt(i, b.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.computeBoundingSphere(); // explicit: frustum culling needs it before render
  mesh.name = name;
  return mesh;
}

// ---------------------------------------------------------------- keep-out

/** Axis-aligned keep-out region, so the scatter never grows inside the tower. */
class KeepOut {
  constructor(
    private readonly cx: number,
    private readonly cz: number,
    private readonly w: number,
    private readonly d: number,
  ) {}
  hits(cx: number, cz: number, w: number, d: number): boolean {
    return Math.abs(cx - this.cx) < (w + this.w) / 2 && Math.abs(cz - this.cz) < (d + this.d) / 2;
  }
}

// ---------------------------------------------------------------- the tower

/**
 * THE ADJACENT CURTAIN-WALL TOWER — the most important single object out there.
 *
 * In the photo it stands immediately to the right of the window wall, close enough
 * that its facade fills the right-hand glazed bay from floor to soffit, and it is
 * unmistakably a glass curtain wall: a fine vertical mullion rhythm, darker
 * horizontal spandrel bands at every floor line, and panel-to-panel variation in
 * what the glass is reflecting (bright sky high up, the darker city lower down,
 * the odd panel gone black behind a blind).
 *
 * Right of frame while looking WEST is NORTH, so it goes north-west of the unit.
 *
 * WHY THE MULLION GRID MATTERS: without it this is a blue box, and a blue box at
 * 80 ft is the single most game-like object you can put in an arch-viz frame. The
 * grid gives it a scale reference (a 5'-0" glazing module is the industry standard
 * and the eye knows it), and the per-panel tint variation gives it a material.
 *
 * Built in a local frame (local +x along the facade, local +z = facade outward
 * normal) and then yawed, so only two faces get glazed — the two we can see.
 */
function buildTower(f: CityFrame): THREE.Group {
  const g = new THREE.Group();
  g.name = 'backdrop:tower';
  const rnd = f.towerRnd;

  // -- massing, all in spans so it rescales with the plan
  const W = f.span * 4.0; // ~121 ft facade — a normal downtown plate
  const D = f.span * 2.8; // ~85 ft deep
  const H = f.span * 10.5; // ~319 ft, about 26 storeys: it fills the glass and
  //                          keeps going up out of frame, exactly as in the photo
  const dist = f.span * 4.6; // ~140 ft away: across the street. Closer than this
  //   and it swallows the whole right half of the frame instead of the right third
  //   that the photo shows (checked by rendering it, not by guessing).

  /**
   * YAW. Looking due west, a facade square-on would be a flat rectangle; in the
   * photo it rakes away to the north, so turn it 24 deg off square.
   *
   * The tower is authored with local +x along the facade and local +z as the
   * facade's outward normal, so the normal has to end up pointing EAST (back at
   * the unit) plus a bit south. three.js rotation.y = p maps local (0,0,1) to
   * world (sin p, 0, cos p), so p = 90deg points it due east (+x) and p = 66deg
   * points it east-south-east — the rake. In the plan's CLOCKWISE convention that
   * is rot = -66 (rotation.y = -rot*PI/180, proof in build.ts).
   */
  const rotDeg = -66;
  const ryDeg = -rotDeg; // = +66; three.js rotation.y in degrees
  // Sun for baking: local = Ry(-ry) * world, and bakeFaceShading applies Ry(yaw).
  const yaw = -ryDeg;
  g.rotation.y = ryDeg * D2R;

  /**
   * Centre: `dist` west of the glass and pushed well north, so what the west
   * glazing actually sees is the tower's southern half — i.e. it enters the frame
   * from the right-hand edge and runs off it, which is the composition in the
   * photo.
   */
  const cx = f.glassX - dist;
  const cz = f.northZ - W * 0.62;
  g.position.set(cx, 0, cz);

  const towerDist = viewDist(f, cx, cz);
  const hz = hazeAt(f, towerDist);

  // -- solid body. Sits BEHIND the glazing so any gap reads as depth, not sky.
  const bodyGeo = shadedUnitBox(f.sun, yaw, 0.3, 0.6);
  const bodyMat = new THREE.MeshBasicMaterial({ vertexColors: true, name: 'backdrop-tower-body' });
  const body = new THREE.InstancedMesh(bodyGeo, bodyMat, 2);
  const m4 = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();

  const yBase = f.groundY;
  const yTop = f.groundY + H;
  // shell, inset a hair so the glazing sits proud of it
  p.set(0, (yBase + yTop) / 2, 0);
  s.set(W - IN(6), H, D - IN(6));
  body.setMatrixAt(0, m4.compose(p, q, s));
  body.setColorAt(0, hazed(f, new THREE.Color('#3b4147'), towerDist));
  /**
   * Rooftop mechanical penthouse. Every real tower has one and it is the thing
   * that stops the top edge reading as a clean CAD box.
   */
  const phH = FTIN(16, 0); // lift overrun + cooling tower enclosure
  p.set(-W * 0.1, yTop + phH / 2, 0);
  s.set(W * 0.42, phH, D * 0.55);
  body.setMatrixAt(1, m4.compose(p, q, s));
  body.setColorAt(1, hazed(f, new THREE.Color('#6f747a'), towerDist));
  body.instanceMatrix.needsUpdate = true;
  if (body.instanceColor) body.instanceColor.needsUpdate = true;
  body.castShadow = false;
  body.receiveShadow = false;
  body.computeBoundingSphere();
  body.name = 'backdrop:tower/body';
  g.add(body);

  /**
   * -- the curtain wall
   * MODULE: 5'-0" vertical mullion centres. This is not invented — 1500 mm /
   * 5'-0" is the near-universal unitised curtain-wall module, which is why glass
   * towers all have the same rhythm.
   * FLOOR-TO-FLOOR: 12'-6", a commercial storey. Each floor line gets a deeper,
   * darker spandrel band (the slab edge and its insulated back-pan).
   */
  const MOD = FTIN(5, 0);
  const F2F = FTIN(12, 6);
  const MULL_W = IN(2.5); // 2 1/2" sightline — a real unitised mullion face
  const MULL_P = IN(3.5); // how far it projects out of the glass line
  const SPAN_H = FTIN(2, 6); // 30" spandrel: slab edge + raised floor zone

  const cols = Math.max(4, Math.floor(W / MOD));
  const rows = Math.max(6, Math.floor(H / F2F));
  const panelW = W / cols;
  const endCols = Math.max(3, Math.floor(D / MOD));
  const endPanelW = D / endCols;

  /**
   * Which faces to glaze: the local +z face (turned back toward the unit) and the
   * local -x end (the near end, the one we see foreshortened). The two faces
   * pointing away are never on camera and are left as body, saving ~half the
   * instances.
   */
  interface Face {
    /** panel centre in local space, from (column, row) */
    at: (col: number, row: number, yMid: number) => THREE.Vector3;
    cols: number;
    panelW: number;
    /** which local axis the panel's width runs along */
    wide: 'x' | 'z';
  }
  const faces: Face[] = [
    {
      at: (col, _row, yMid) => new THREE.Vector3(-W / 2 + (col + 0.5) * panelW, yMid, D / 2),
      cols,
      panelW,
      wide: 'x',
    },
    {
      at: (col, _row, yMid) => new THREE.Vector3(-W / 2, yMid, -D / 2 + (col + 0.5) * endPanelW),
      cols: endCols,
      panelW: endPanelW,
      wide: 'z',
    },
  ];

  /**
   * PANEL TINT. A curtain-wall panel's colour is almost entirely what it
   * reflects, so bake exactly that:
   *   - high panels mirror bright hazy sky      -> pale blue-white
   *   - panels below our eye mirror the city    -> darker green-grey
   * plus a per-ROW offset (real facades band horizontally, because each floor's
   * blinds and interior lighting are set together) and a small per-panel jitter.
   * ~7% of panels go dark: blinds down, or an unlit floor. That sparse randomness
   * is what your eye actually uses to decide a facade is real.
   */
  const skyGlass = new THREE.Color('#c2d2de'); // reflecting sky
  const cityGlass = new THREE.Color('#5e6b64'); // reflecting the city below
  const darkGlass = new THREE.Color('#2c343a'); // blinds down / unlit

  const rowBias: number[] = [];
  for (let r = 0; r < rows; r++) rowBias.push(between(rnd, -0.14, 0.14));

  const panels: { at: THREE.Vector3; w: number; h: number; wide: 'x' | 'z'; color: THREE.Color }[] = [];
  const mullions: { at: THREE.Vector3; sx: number; sy: number; sz: number; color: THREE.Color }[] = [];
  const mullColor = hazed(f, new THREE.Color('#3a3f44'), towerDist); // dark anodised,
  //  matching the BLACK anodised aluminium of our own glazing in the photo

  for (const face of faces) {
    for (let r = 0; r < rows; r++) {
      const yFloor = yBase + r * F2F;
      const glassH = F2F - SPAN_H;
      const yMid = yFloor + SPAN_H + glassH / 2;
      for (let c = 0; c < face.cols; c++) {
        // vertical position of the panel relative to the viewer's eye (y = 0 is
        // our own floor slab): above -> sky, below -> city
        const k = 1 / (1 + Math.exp(-(yMid - 0) / (f.span * 1.6)));
        let col = cityGlass.clone().lerp(skyGlass, k);
        const jitter = 1 + rowBias[r] + between(rnd, -0.08, 0.08);
        col.multiplyScalar(Math.max(0.4, jitter));
        if (rnd() < 0.09) col = darkGlass.clone();
        panels.push({
          at: face.at(c, r, yMid),
          w: face.panelW - MULL_W,
          h: glassH,
          wide: face.wide,
          color: col.lerp(f.haze, hz),
        });
      }
      // spandrel band across the whole face at this floor line
      const bandY = yFloor + SPAN_H / 2;
      const bandC = hazed(f, new THREE.Color('#2f3439'), towerDist);
      if (face.wide === 'x') {
        mullions.push({ at: new THREE.Vector3(0, bandY, D / 2 + MULL_P * 0.5), sx: W, sy: SPAN_H, sz: MULL_P, color: bandC });
      } else {
        mullions.push({ at: new THREE.Vector3(-W / 2 - MULL_P * 0.5, bandY, 0), sx: MULL_P, sy: SPAN_H, sz: D, color: bandC });
      }
    }
    // vertical mullions, one per module boundary, full height of the glazing
    for (let c = 0; c <= face.cols; c++) {
      const mid = new THREE.Vector3(0, yBase + (rows * F2F) / 2, 0);
      if (face.wide === 'x') {
        mid.x = -W / 2 + c * face.panelW;
        mid.z = D / 2 + MULL_P * 0.5;
        mullions.push({ at: mid, sx: MULL_W, sy: rows * F2F, sz: MULL_P, color: mullColor });
      } else {
        mid.x = -W / 2 - MULL_P * 0.5;
        mid.z = -D / 2 + c * face.panelW;
        mullions.push({ at: mid, sx: MULL_P, sy: rows * F2F, sz: MULL_W, color: mullColor });
      }
    }
  }

  // -- glass, one instanced mesh. Flat-shaded on purpose (no baked face term):
  //    the panel colour IS a reflection, and reflections do not obey Lambert.
  const glassMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ name: 'backdrop-tower-glass' }),
    panels.length,
  );
  panels.forEach((pn, i) => {
    p.copy(pn.at);
    s.set(pn.wide === 'x' ? pn.w : IN(1), pn.h, pn.wide === 'x' ? IN(1) : pn.w);
    glassMesh.setMatrixAt(i, m4.compose(p, q, s));
    glassMesh.setColorAt(i, pn.color);
  });
  glassMesh.instanceMatrix.needsUpdate = true;
  if (glassMesh.instanceColor) glassMesh.instanceColor.needsUpdate = true;
  glassMesh.castShadow = false;
  glassMesh.receiveShadow = false;
  glassMesh.computeBoundingSphere();
  glassMesh.name = 'backdrop:tower/glass';
  g.add(glassMesh);

  // -- mullions + spandrels, one instanced mesh, shaded (they are real solids
  //    catching real light, unlike the glass)
  const mullMesh = new THREE.InstancedMesh(
    shadedUnitBox(f.sun, yaw, 0.4, 0.62),
    new THREE.MeshBasicMaterial({ vertexColors: true, name: 'backdrop-tower-mullion' }),
    mullions.length,
  );
  mullions.forEach((mu, i) => {
    p.copy(mu.at);
    s.set(mu.sx, mu.sy, mu.sz);
    mullMesh.setMatrixAt(i, m4.compose(p, q, s));
    mullMesh.setColorAt(i, mu.color);
  });
  mullMesh.instanceMatrix.needsUpdate = true;
  if (mullMesh.instanceColor) mullMesh.instanceColor.needsUpdate = true;
  mullMesh.castShadow = false;
  mullMesh.receiveShadow = false;
  mullMesh.computeBoundingSphere();
  mullMesh.name = 'backdrop:tower/mullions';
  g.add(mullMesh);

  g.userData.keepOut = new KeepOut(cx, cz, Math.max(W, D) * 1.1, Math.max(W, D) * 1.1);
  return g;
}

// ---------------------------------------------------------------- own facade

/**
 * Glazing module of OUR OWN west wall, read out of the plan instead of invented.
 *
 * The west wall is the exterior wall with both ends on the footprint's minimum x.
 * Averaging the widths of the window openings cut into it gives the real bay
 * spacing of this building's curtain wall (here the four west openings are
 * 2'-9", 2'-8", 2'-9" and 3'-6", so ~2'-11"), which is the module the floors below
 * us must repeat. Falls back to 3'-0" if a plan has no west glazing at all.
 */
function westGlazingModule(plan: FloorPlan): number {
  const b = polygonBounds(plan.footprint);
  const eps = 0.01;
  // Parameter types are written out rather than inferred so this file still type
  // checks cleanly when it is compiled alone, without the '@/*' path alias.
  const westWalls = new Set(
    plan.walls
      .filter(
        (w: Wall) =>
          w.kind === 'exterior' &&
          Math.abs(w.start[0] - b.min[0]) < eps &&
          Math.abs(w.end[0] - b.min[0]) < eps,
      )
      .map((w: Wall) => w.id),
  );
  const widths = plan.openings
    .filter((o: Opening) => o.kind === 'window' && westWalls.has(o.wall))
    .map((o: Opening) => o.width);
  if (widths.length === 0) return FTIN(3, 0);
  return widths.reduce((a: number, x: number) => a + x, 0) / widths.length;
}

/**
 * OUR OWN BUILDING, dropping away below the glass.
 *
 * With floor-to-ceiling glazing you are standing at the edge: look down through it
 * and you see your own facade fall away storey after storey. Leave it out and the
 * city floats in space and the unit reads as a box on a plinth.
 *
 * And crucially it is NOT a blank wall: the reference photo shows this building is
 * glazed floor-to-ceiling in black anodised aluminium, so the floors below are the
 * same curtain wall we are standing in — dark glass between slab-edge bands, on the
 * module the plan's own west windows are set out on. A flat concrete parapet here
 * was the second-worst thing in the first pass of this file (checked by rendering
 * it), because a big dead grey band across the bottom of the view is exactly the
 * "box on a plinth" tell it is supposed to remove.
 *
 * All of it sits at x <= the west wall's outer face, so it can never intrude into
 * the room.
 */
function buildOwnFacade(plan: FloorPlan, f: CityFrame): THREE.Group {
  const g = new THREE.Group();
  g.name = 'backdrop:own-facade';

  const b = polygonBounds(plan.footprint);
  const f2f = plan.ceilingHeight + IN(12);
  // Wide enough in plan-y that no camera inside can see either end of it.
  const wallW = b.h * 2.2;
  const zc = f.viewZ;
  const drop = -f.groundY; // our floor level down to grade
  const floors = Math.max(1, Math.round(drop / f2f));

  /**
   * Depths off the west wall's outer face. The slab edge oversails the glass —
   * that is what throws water clear — and the mullions stand proud of the glass,
   * so all three planes are distinct and nothing is ever coplanar (coplanar faces
   * z-fight, and z-fighting on a facade this size is unmissable).
   */
  const EDGE_H = IN(14); // 8" slab + 6" fascia: the band at every floor line
  const EDGE_D = IN(11); // how far the slab edge oversails
  const GLASS_D = IN(2); // the glass line, set back inside the slab edge
  const MULL_D = IN(4); // mullion face, standing proud of the glass
  /**
   * Every one of these boxes also gets a DIFFERENT east (back) face — the glass
   * stops 1" behind the wall face, the mullions 1/2", the slab edge 3". Give two of
   * them the same back plane and the shared face z-fights into a dotted mess the
   * full height of the building. (It did, in the pass before this one.)
   */
  const MULL_W = IN(2.5); // 2 1/2" sightline, matching the photo's slim mullions
  const MOD = westGlazingModule(plan);

  interface Part {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    z0: number;
    z1: number;
    color: THREE.Color;
  }
  const parts: Part[] = [];

  /**
   * Glass tint. This is dark, and it has to be: we are looking DOWN at it, so it
   * mirrors the city below and the near-black underside of the sky, not the bright
   * horizon. Same physics as the tower's panels, opposite result — which is why the
   * two are not the same colour.
   */
  const glassLo = new THREE.Color('#3f4347');
  const glassHi = new THREE.Color('#5b6167');
  const slabC = hazed(f, new THREE.Color('#7e7a73'), f.span);
  const mullC = new THREE.Color('#202427'); // black anodised aluminium

  // The slab edge at OUR floor level, plus one at every floor line below.
  for (let i = 0; i <= floors; i++) {
    const y = -i * f2f;
    parts.push({
      x0: f.glassX - EDGE_D,
      x1: f.glassX - IN(3), // stops short of the wall face: hidden, not coplanar
      y0: y - EDGE_H,
      y1: y,
      z0: zc - wallW / 2,
      z1: zc + wallW / 2,
      color: slabC,
    });
    if (i === floors) break;
    // Glass between this floor's slab edge and the next one down. Lower floors are
    // fractionally darker: less sky reaches them down between the buildings.
    const k = 1 - i / floors;
    parts.push({
      x0: f.glassX - GLASS_D,
      x1: f.glassX - IN(1),
      y0: y - f2f + IN(1),
      y1: y - EDGE_H,
      z0: zc - wallW / 2,
      z1: zc + wallW / 2,
      color: glassLo.clone().lerp(glassHi, k * k).lerp(f.haze, hazeAt(f, f.span * 0.5)),
    });
  }
  // Vertical mullions on the plan's own module, running the full drop.
  const nMull = Math.max(2, Math.round(wallW / MOD));
  for (let i = 0; i <= nMull; i++) {
    const z = zc - wallW / 2 + (i * wallW) / nMull;
    /**
     * Stops 1/4" below the underside of OUR slab edge. Running it up to floor level
     * pokes the mullion through the slab band and leaves a row of little bright
     * rectangles along the top of the glass (it did). Every slab edge below
     * oversails the mullion face by 7", so the mullions passing behind them is
     * invisible and does not need cutting.
     */
    parts.push({
      x0: f.glassX - MULL_D,
      x1: f.glassX - IN(0.5),
      y0: f.groundY,
      y1: -EDGE_H - IN(0.25),
      z0: z - MULL_W / 2,
      z1: z + MULL_W / 2,
      color: mullC,
    });
  }

  const mesh = new THREE.InstancedMesh(
    shadedUnitBox(f.sun, 0, 0.42, 0.5, 0.2),
    new THREE.MeshBasicMaterial({ vertexColors: true, name: 'backdrop-own-facade' }),
    parts.length,
  );
  const m4 = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  parts.forEach((pt, i) => {
    p.set((pt.x0 + pt.x1) / 2, (pt.y0 + pt.y1) / 2, (pt.z0 + pt.z1) / 2);
    s.set(pt.x1 - pt.x0, pt.y1 - pt.y0, pt.z1 - pt.z0);
    mesh.setMatrixAt(i, m4.compose(p, q, s));
    mesh.setColorAt(i, pt.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.computeBoundingSphere();
  mesh.name = 'backdrop:own-facade/curtain-wall';
  g.add(mesh);
  return g;
}

// ---------------------------------------------------------------- buildBackdrop

/**
 * Build the whole outlook as one Group, ready to `scene.add()`.
 *
 * Nothing in it casts or receives shadows and nothing is lit, so adding it to a
 * scene cannot change how the interior renders. It also never occupies x > the
 * west wall's outer face, so it cannot intrude into the room.
 *
 * Cost at defaults: 6 draw calls, 3 shader programs, ~1500 rooftop instances and
 * ~1600 tower instances. On swiftshader that is a rounding error next to the
 * interior's per-fragment lighting.
 */
export function buildBackdrop(plan: FloorPlan, opts: BackdropOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'backdrop';
  const f = cityFrame(plan, opts);

  root.add(buildGround(f));

  let keepOut: KeepOut | null = null;
  if (opts.tower !== false) {
    const tower = buildTower(f);
    keepOut = (tower.userData.keepOut as KeepOut) ?? null;
    root.add(tower);
  }

  const masses = [...scatterMidRise(f, opts.blocks ?? 260, keepOut), ...scatterSkyline(f)];
  root.add(packMasses(f, masses, 'backdrop:massing'));

  if (opts.facade !== false) root.add(buildOwnFacade(plan, f));

  root.userData.backdrop = {
    seed: opts.seed ?? DEFAULT_SEED,
    groundY: f.groundY,
    span: f.span,
    hazeDist: f.hazeDist,
    haze: `#${f.haze.getHexString()}`,
  };
  return root;
}

// ---------------------------------------------------------------- sky

/**
 * EQUIRECTANGULAR SKY, 2048 x 1024, for scene.background and (via PMREMGenerator)
 * for scene.environment.
 *
 * THE MAPPING, stated once. Treating the image as a longitude/latitude chart:
 *      u = azimuth / 360                       (0 at the left edge, wrapping)
 *      v = (90 - elevation) / 180              (0 = zenith, 1 = nadir)
 * so image row 0 is the zenith and row h-1 is straight down.
 *
 * TWO CORRECTIONS THAT THE INLINE SKY IN shot/main.ts GETS WRONG, and the reason
 * this function exists:
 *
 * 1. WHERE AZIMUTH 0 IS. three.js samples an equirect env map with
 *        u = atan2(dir.z, dir.x) / 2pi + 0.5
 *    (verified in three/src/renderers/shaders/ShaderChunk/common.glsl.js, and
 *    PMREMGenerator's equirect shader uses the identical expression). So the
 *    direction under column u has atan2 angle theta = (u - 0.5) * 360, measured
 *    from world +X toward world +Z — and u = 0 is theta = -180, i.e. world -X,
 *    which in this project's mapping is plan WEST. Hence "azimuth" above is
 *    measured CLOCKWISE FROM DUE WEST, and a compass bearing A converts as
 *        theta = A - 90   ->   u = (A + 90) / 360.
 *    (Check A = 270, west: u = 1 = 0, the seam. A = 90, east: u = 0.5, dead
 *    centre — which is why the seam never lands on the view out of a west wall.)
 *    shot/main.ts uses (A + 180)/360, which puts the sun's reflection 90deg away
 *    from where the scene's sun actually is.
 *
 * 2. THE SUN IS A CIRCLE ON THE SPHERE, NOT ON THE IMAGE. A radial gradient
 *    painted in image space is stretched horizontally by 1/cos(elevation) — at 54deg
 *    elevation that is a 70% error, so the sun renders as an ellipse and its
 *    aureole leaks around the sky. Here the disc and aureole are functions of the
 *    true angle between the pixel's direction and the sun's, computed on the
 *    sphere, so the sun is round at any elevation.
 *
 * WHY A DataTexture AND NOT A CANVAS: no DOM dependency, so this is usable from
 * node (scripts/) as well as the browser, and every pixel is under our control
 * instead of the 2D canvas's gradient interpolation. 8-bit sRGB, matching the rest
 * of the pipeline — a float texture would give a genuinely HDR sun, but PMREM
 * needs half-float render targets and this project's WebGL is software-only, so
 * the safe format wins. The scene's directional sun carries the real energy; this
 * texture's job is the LOOK of the sky and something for glass and steel to
 * reflect.
 */
export function skyTexture(tod: number): THREE.Texture {
  const w = 2048;
  const h = 1024;
  const t = Math.min(1, Math.max(0, tod));

  // Sun direction, from the scene's own formula (see sunDirection above).
  const sun = sunDirection(t);
  const zenith = zenithColor(t);
  const horizon = horizonColor(t);
  /**
   * Below the horizon the env map is standing in for ground bounce. In a dense
   * city that is asphalt and shaded brick — dark, and slightly warm. It must not
   * be a mirror of the sky or PMREM lights the underside of everything.
   */
  const ground = new THREE.Color('#7d786f');
  const nadir = new THREE.Color('#514d47');

  const data = new Uint8Array(w * h * 4);
  const c = new THREE.Color();
  const dir = new THREE.Vector3();

  /**
   * Banded cloud. Real fair-weather stratocumulus lies in near-horizontal sheets,
   * which project into perspective rows that STRETCH toward the zenith and
   * COMPRESS toward the horizon. cot(elevation) is exactly that projection (it is
   * the ground distance to the point where the line of sight meets a flat cloud
   * deck), so using it as the band coordinate gets the perspective for free —
   * far cheaper and far more convincing than banding in raw elevation.
   */
  const dElPerPixel = 180 / h; // degrees of elevation per texel row
  const cloudBands = (elDeg: number, azDeg: number): number => {
    if (elDeg < 2) return 0;
    const el = Math.max(2, elDeg) * D2R;
    const cot = 1 / Math.tan(el);
    const a = azDeg * D2R;

    /**
     * ANALYTIC BAND LIMITING. cot(el) blows up toward the horizon: at 5deg
     * elevation it changes by 0.40 per texel row, so a band of frequency 9 shifts
     * 3.7 radians between adjacent rows and aliases into hard 1-pixel stripes
     * (this was visible as thin bright lines just above the horizon before the
     * fix). d(cot)/d(el) = -csc^2(el), so the phase step of a frequency-f term is
     * f * csc^2(el) * dEl, and attenuating each term by exp(-(step)^2) is a proper
     * prefilter: bands dissolve smoothly into flat haze exactly where they would
     * otherwise start to alias, instead of being clamped off at an arbitrary
     * elevation.
     */
    const dCot = (dElPerPixel * D2R) / (Math.sin(el) * Math.sin(el));
    const lp = (fr: number): number => Math.exp(-((fr * dCot) ** 2));

    // three incommensurate frequencies + an azimuth wobble, so the rows are not
    // straight and the pattern never visibly repeats around the horizon
    const band =
      0.5 * lp(1.9) * Math.sin(cot * 1.9 + Math.sin(a * 2.0) * 0.7) +
      0.3 * lp(4.3) * Math.sin(cot * 4.3 + Math.sin(a * 3.0) * 1.1 + 1.7) +
      0.2 * lp(9.1) * Math.sin(cot * 9.1 + Math.cos(a * 5.0) * 0.9 + 4.1);
    /**
     * HAZE EXTINCTION. Band limiting alone is not enough: between 3deg and 8deg
     * elevation the bands are genuinely, correctly compressed into hard thin
     * stripes, and they look like a rendering artefact even though the geometry is
     * right. What removes them in a real sky is extinction — you are looking
     * through so much aerosol that the cloud contrast is gone long before the
     * deck reaches the horizon. Fade the cloud out over 6deg..22deg, which is also
     * exactly the band the reference photo shows as featureless bright haze.
     */
    const fade = Math.min(1, Math.max(0, (elDeg - 6) / 16)) ** 2;
    // only the crests become cloud; troughs stay clear sky
    const k = Math.max(0, band - 0.16) / 0.84;
    return k * k * fade;
  };

  for (let iy = 0; iy < h; iy++) {
    // v = (90 - elevation)/180  =>  elevation = 90 - 180 v
    const v = (iy + 0.5) / h;
    const elDeg = 90 - 180 * v;
    const el = elDeg * D2R;

    for (let ix = 0; ix < w; ix++) {
      const u = (ix + 0.5) / w;
      /**
       * u = azimuth/360, and the atan2 angle three.js will reconstruct from that
       * column is theta = (u - 0.5)*360, measured from world +X toward world +Z.
       * Getting the -0.5 wrong flips the whole sky through 180deg and puts the sun
       * in the east; the probe in the header comment is what catches that.
       */
      const theta = (u - 0.5) * 360;
      // compass bearing, used for the cloud wobble and nothing else: A = theta + 90
      const azDeg = theta + 90;

      if (elDeg >= 0) {
        /**
         * SKY GRADIENT. Brightness rises steeply toward the horizon on a hazy day
         * because the line of sight passes through far more aerosol. The exponent
         * sets how far up the bright band reaches: 0.8 keeps the sky still ~68%
         * haze-white at 20deg elevation, which is what the reference photo shows
         * above the far rooftops.
         */
        const k = (elDeg / 90) ** 0.8;
        c.copy(horizon).lerp(zenith, k);

        // cloud: whiten toward a slightly blue-grey cumulus white
        const cl = cloudBands(elDeg, azDeg);
        if (cl > 0) c.lerp(new THREE.Color('#f4f5f3'), Math.min(0.85, cl * 0.9));

        /**
         * SUN. Angle between this pixel's direction and the sun, on the sphere.
         * dir inverts equirectUv exactly:
         *   x = cos(el) cos(theta), z = cos(el) sin(theta), y = sin(el)
         * so atan2(dir.z, dir.x) = theta and asin(dir.y) = el, by construction.
         */
        dir.set(
          Math.cos(el) * Math.cos(theta * D2R),
          Math.sin(el),
          Math.cos(el) * Math.sin(theta * D2R),
        );
        const cosA = Math.min(1, Math.max(-1, dir.dot(sun)));
        const angDeg = Math.acos(cosA) / D2R;

        /**
         * SUN + AUREOLE. The solar disc is 0.53deg across, which at 2048x1024
         * (0.176deg per texel) is 3 px — physically right and visually nothing.
         * What a camera actually records on a hazy day is a blown-out core of a
         * couple of degrees plus a broad aureole: forward Mie scattering off the
         * same aerosol that whitens the horizon. So the core is drawn at 1.6deg and
         * the aureole is a Lorentzian in ANGLE (not in pixels) with a 4.5deg half
         * width, biased out to 60deg and offset so it reaches exactly zero there
         * instead of leaving a visible ring.
         *
         * 8-bit clamps the core at white, so this cannot carry real solar energy
         * into an IBL — the scene's own directional light does that. This is the
         * glare a viewer reads as "bright hazy daylight", and the highlight glass
         * and steel need something to mirror.
         */
        const REACH = 60;
        const core = angDeg < 1.6;
        const lor = (x: number): number => 1 / (1 + (x / 4.5) ** 2);
        const glow = Math.max(0, lor(angDeg) - lor(REACH)) / (1 - lor(REACH));
        if (core) {
          c.set('#fffdf5');
        } else if (glow > 0.002) {
          c.lerp(new THREE.Color('#fff6e4'), Math.min(0.97, glow * 1.15));
        }
      } else {
        /**
         * Below the horizon this texture is standing in for ground bounce, so it
         * matters for how the concrete soffit inside gets lit. A 6deg transition
         * into the ground colour (a real hazy horizon has no hard edge), then a
         * slow darkening toward the nadir — the shape a ground plane's own aerial
         * perspective has.
         */
        const d = -elDeg;
        c.copy(horizon).lerp(ground, Math.min(1, d / 6));
        if (d > 6) c.lerp(nadir, Math.min(1, (d - 6) / 60));
      }

      /**
       * ROW ORDER. DataTexture ignores `flipY` (WebGL's UNPACK_FLIP_Y does not
       * apply to ArrayBufferView uploads), so data row 0 lands at v = 0 in GL
       * terms, which three's equirectUv() reads as the NADIR. Our loop generates
       * rows top-down from the zenith, so write them bottom-up.
       */
      const o = ((h - 1 - iy) * w + ix) * 4;
      // THREE.Color holds linear-sRGB values once ColorManagement is on; the
      // texture is tagged SRGBColorSpace, so encode on the way out.
      data[o] = Math.round(255 * linearToSrgb(c.r));
      data[o + 1] = Math.round(255 * linearToSrgb(c.g));
      data[o + 2] = Math.round(255 * linearToSrgb(c.b));
      data[o + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // DataTexture defaults to NearestFilter, which would show every one of the
  // 2048 columns as a hard edge in a reflection. Azimuth wraps; elevation clamps.
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.name = 'sky:hazy-daylight';
  tex.needsUpdate = true;
  return tex;
}

/**
 * linear -> sRGB transfer function (IEC 61966-2-1). THREE.ColorManagement has an
 * equivalent, but it is not part of the public API surface we should lean on, and
 * this is four lines.
 */
function linearToSrgb(x: number): number {
  const v = Math.min(1, Math.max(0, x));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}
