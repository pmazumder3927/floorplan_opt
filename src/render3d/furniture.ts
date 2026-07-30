/**
 * Parametric low-poly furniture.
 *
 * CONTRACT (see project conventions):
 *   - a piece is built to the def's EXACT w (x) / d (z) / h (y). Nothing sticks
 *     out of that box, because analysis.ts collides against the same numbers.
 *   - origin = CENTER of the footprint, ON THE FLOOR (y = 0). So a piece spans
 *     x in [-w/2, +w/2], z in [-d/2, +d/2], y in [0, h].
 *   - the FRONT of the piece faces +z. In plan space +y is south, and the 3D
 *     mapping is plan (x, y) -> world (x, height, y); therefore local +z is
 *     plan SOUTH, which matches "furniture at rot=0 faces plan south".
 *   - every mesh gets a name derived from the def and
 *     userData = { defId, itemId } so a picker can hit-test later.
 *
 * PERFORMANCE (headless swiftshader): every mesh reuses one of a handful of
 * cached unit geometries (a 1x1x1 box, a unit cylinder per taper ratio, a unit
 * sphere) and is shaped with mesh.scale. Non-uniform scale slightly skews
 * normals, which is invisible on flat-shaded primitives at these sizes and
 * saves hundreds of geometry uploads. Cached geometries are flagged
 * `userData.shared` so disposeScene() leaves them alone.
 */

import * as THREE from 'three';
import { IN } from '@/core/units';
import type { FurnitureDef, PlacedItem } from '@/core/types';
import { MAT, matFor } from './materials';

// ---------------------------------------------------------------- geometry cache

const geoCache = new Map<string, THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  const hit = geoCache.get(key);
  if (hit) return hit as T;
  const g = make();
  g.userData.shared = true;
  geoCache.set(key, g);
  return g;
}

/** Unit cube, centered on the origin. Scale it to whatever box you need. */
export function boxGeom(): THREE.BoxGeometry {
  return cached('box', () => new THREE.BoxGeometry(1, 1, 1));
}

/**
 * Unit cylinder / cone / truncated cone, centered on the origin, height 1,
 * with the LARGER diameter normalised to 1. The caller scales by that larger
 * diameter, so all tapers with the same ratio share one geometry.
 */
export function cylGeom(dTop: number, dBottom: number, seg = 16): THREE.CylinderGeometry {
  const dMax = Math.max(dTop, dBottom, 1e-6);
  const rt = 0.5 * (dTop / dMax);
  const rb = 0.5 * (dBottom / dMax);
  const key = `cyl:${rt.toFixed(3)}:${rb.toFixed(3)}:${seg}`;
  return cached(key, () => new THREE.CylinderGeometry(rt, rb, 1, seg, 1, false));
}

/** Unit sphere (diameter 1). 12x8 segments — plenty for foliage blobs. */
export function sphereGeom(wSeg = 12, hSeg = 8): THREE.SphereGeometry {
  return cached(`sph:${wSeg}:${hSeg}`, () => new THREE.SphereGeometry(0.5, wSeg, hSeg));
}

/** Free the shared unit geometries. End-of-process only (see disposeMaterials). */
export function disposeGeometryCache(): void {
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
}

// ---------------------------------------------------------------- part helpers

export interface PartOpts {
  name?: string;
  /** default true */
  cast?: boolean;
  /** default true */
  recv?: boolean;
  /** yaw in radians */
  rotY?: number;
  rotX?: number;
  rotZ?: number;
}

const MIN = 1e-4; // never hand three.js a zero-scaled mesh (breaks normals)

function clamp3(a: number, b: number, c: number): [number, number, number] {
  return [Math.max(MIN, a), Math.max(MIN, b), Math.max(MIN, c)];
}

/** Axis-aligned box. `size` = [w,h,d], `center` = the box CENTER. */
export function addBox(
  parent: THREE.Object3D,
  mat: THREE.Material,
  size: [number, number, number],
  center: [number, number, number],
  o: PartOpts = {},
): THREE.Mesh {
  const m = new THREE.Mesh(boxGeom(), mat);
  const [w, h, d] = clamp3(size[0], size[1], size[2]);
  m.scale.set(w, h, d);
  m.position.set(center[0], center[1], center[2]);
  if (o.rotX) m.rotation.x = o.rotX;
  if (o.rotY) m.rotation.y = o.rotY;
  if (o.rotZ) m.rotation.z = o.rotZ;
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.recv !== false;
  if (o.name) m.name = o.name;
  parent.add(m);
  return m;
}

export interface CylSpec {
  /** diameter at the top; 0 makes a cone */
  dTop?: number;
  /** diameter at the bottom */
  dBottom: number;
  h: number;
  seg?: number;
  /** squash the z axis to make an oval section (toilet bowls, basins) */
  zScale?: number;
}

/** Vertical cylinder/cone. `center` = the CENTER of the piece. */
export function addCyl(
  parent: THREE.Object3D,
  mat: THREE.Material,
  spec: CylSpec,
  center: [number, number, number],
  o: PartOpts = {},
): THREE.Mesh {
  const dTop = spec.dTop ?? spec.dBottom;
  const dMax = Math.max(dTop, spec.dBottom, MIN);
  const m = new THREE.Mesh(cylGeom(dTop, spec.dBottom, spec.seg ?? 16), mat);
  m.scale.set(dMax, Math.max(MIN, spec.h), dMax * (spec.zScale ?? 1));
  m.position.set(center[0], center[1], center[2]);
  if (o.rotX) m.rotation.x = o.rotX;
  if (o.rotY) m.rotation.y = o.rotY;
  if (o.rotZ) m.rotation.z = o.rotZ;
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.recv !== false;
  if (o.name) m.name = o.name;
  parent.add(m);
  return m;
}

/** Horizontal bar (a cylinder laid along x, or along z when `alongZ`). */
export function addBar(
  parent: THREE.Object3D,
  mat: THREE.Material,
  d: number,
  len: number,
  center: [number, number, number],
  alongZ = false,
  o: PartOpts = {},
): THREE.Mesh {
  return addCyl(parent, mat, { dBottom: d, h: len, seg: 8 }, center, {
    ...o,
    // a cylinder's axis is +y; rotate it onto x (rotZ 90) or z (rotX 90)
    rotZ: alongZ ? 0 : Math.PI / 2,
    rotX: alongZ ? Math.PI / 2 : 0,
  });
}

/** Ellipsoid / squashed sphere. `size` = full [dx, dy, dz]. */
export function addSphere(
  parent: THREE.Object3D,
  mat: THREE.Material,
  size: [number, number, number],
  center: [number, number, number],
  o: PartOpts = {},
): THREE.Mesh {
  const m = new THREE.Mesh(sphereGeom(), mat);
  const [x, y, z] = clamp3(size[0], size[1], size[2]);
  m.scale.set(x, y, z);
  m.position.set(center[0], center[1], center[2]);
  if (o.rotY) m.rotation.y = o.rotY;
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.recv !== false;
  if (o.name) m.name = o.name;
  parent.add(m);
  return m;
}

/**
 * A box laid out in PLAN space: `len` along the plan direction `dir`,
 * `thick` across it, centered at plan point `c` with its vertical center at
 * `yCenter`. Used by build.ts for walls, door leaves, casings and sills.
 *
 * Yaw derivation: a box's local +x maps to world (cos y, 0, -sin y) under
 * rotation.y = y. We want it to map to world (dx, 0, dz) (world x/z = plan x/y),
 * hence y = atan2(-dz, dx).
 */
export function addPlanBox(
  parent: THREE.Object3D,
  mat: THREE.Material,
  len: number,
  height: number,
  thick: number,
  c: [number, number],
  dir: [number, number],
  yCenter: number,
  o: PartOpts = {},
): THREE.Mesh {
  const yaw = Math.atan2(-dir[1], dir[0]);
  return addBox(parent, mat, [len, height, thick], [c[0], yCenter, c[1]], { ...o, rotY: yaw });
}

// ---------------------------------------------------------------- panel helper

export interface PanelSpec {
  /** carcass half-width span the panels fill (local x) */
  x0: number;
  x1: number;
  /** vertical span the panels fill */
  y0: number;
  y1: number;
  /** z of the carcass FRONT face; panels are recessed 1/4" behind it */
  zFace: number;
  rows?: number;
  cols?: number;
  /** reveal between panels, ft. 1/8" is a real cabinet gap. */
  gap?: number;
  face: THREE.Material;
  pull: THREE.Material;
  pullStyle?: 'bar-h' | 'bar-v' | 'none';
  name: string;
}

/**
 * Recessed drawer / door fronts with thin pull bars. This is what makes a
 * dresser read as a dresser instead of a box: the 1/4" step and the pull
 * catch the light and give the eye a scale reference.
 */
export function addPanels(parent: THREE.Object3D, s: PanelSpec): void {
  const rows = Math.max(1, s.rows ?? 1);
  const cols = Math.max(1, s.cols ?? 1);
  const gap = s.gap ?? IN(0.125);
  const totalW = s.x1 - s.x0;
  const totalH = s.y1 - s.y0;
  if (totalW <= gap * 2 || totalH <= gap * 2) return;
  const pw = (totalW - gap * (cols + 1)) / cols;
  const ph = (totalH - gap * (rows + 1)) / rows;
  const T = IN(0.75); // 3/4" front panel
  const recess = IN(0.25); // set back 1/4" from the carcass face
  const zc = s.zFace - recess - T / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = s.x0 + gap + pw / 2 + c * (pw + gap);
      const cy = s.y0 + gap + ph / 2 + r * (ph + gap);
      addBox(parent, s.face, [pw, ph, T], [cx, cy, zc], { name: `${s.name}/front-${r}-${c}` });
      const style = s.pullStyle ?? 'bar-h';
      if (style === 'bar-h') {
        // drawer pull: 4" bar centered, just below the top edge of the front
        addBar(parent, s.pull, IN(0.5), Math.min(pw * 0.45, IN(5)), [cx, cy + ph / 2 - IN(1.6), zc + T / 2 + IN(0.5)], false, {
          name: `${s.name}/pull-${r}-${c}`,
        });
      } else if (style === 'bar-v') {
        // door pull: VERTICAL bar (cylinder axis stays on +y) on the leading stile
        const side = cols === 1 ? 1 : c < cols / 2 ? 1 : -1;
        addCyl(
          parent,
          s.pull,
          { dBottom: IN(0.5), h: Math.min(ph * 0.4, IN(8)), seg: 8 },
          [cx + side * (pw / 2 - IN(2)), cy, zc + T / 2 + IN(0.5)],
          { name: `${s.name}/pull-${r}-${c}` },
        );
      }
    }
  }
}

// ---------------------------------------------------------------- build context

/**
 * `def.accent` means "the OTHER material on this product", and what that is
 * depends on the kind. Reading the catalog:
 *   sofa/chair : color = frame/upholstery, accent = cushions   (OATMEAL/CREAM)
 *   bed        : color = frame,            accent = bedding    (OAK/OFF_WHITE)
 *   table/desk : color = top,              accent = legs       (OAK/NEAR_BLACK)
 *   casework   : color = carcass + fronts, accent = HARDWARE   (OFF_WHITE/BRASS)
 *   rug        : color = field,            accent = border
 *   art        : color = frame,            accent = the print
 * Each builder below picks accordingly — using accent as "the top" everywhere
 * would give an oak desk a near-black top, which is not the product.
 */
interface Ctx {
  g: THREE.Group;
  def: FurnitureDef;
  w: number;
  d: number;
  h: number;
  /** seat / work-surface height, resolved with a per-kind fallback */
  seat: number;
  /** main body material */
  body: THREE.MeshStandardMaterial;
  /** the secondary material (see above) */
  accent: THREE.MeshStandardMaterial;
  /** legs, frames, structure */
  frame: THREE.MeshStandardMaterial;
  /** raw hex, for builders that need their own finish on the same color */
  color: string;
  accentColor: string;
  /** true when the def actually declared an accent */
  hasAccent: boolean;
  n: string;
}

/** Sensible per-kind default albedo when the catalog entry has no color. */
const KIND_COLOR: Partial<Record<FurnitureDef['kind'], string>> = {
  sofa: '#8b8676',
  sectional: '#8b8676',
  loveseat: '#8b8676',
  armchair: '#93897c',
  ottoman: '#93897c',
  bench: '#a9793f',
  bed: '#a9793f',
  sofa_bed: '#7f8a86',
  murphy_bed: '#e7e2d8',
  nightstand: '#a9793f',
  dresser: '#a9793f',
  wardrobe: '#e7e2d8',
  shelf: '#c9a677',
  bookcase: '#c9a677',
  desk: '#c9a677',
  chair: '#6d6a63',
  bar_stool: '#6d6a63',
  dining_table: '#a9793f',
  coffee_table: '#a9793f',
  side_table: '#a9793f',
  console: '#a9793f',
  cabinet: '#e7e2d8',
  rug: '#a3a08f',
  tv: '#1b1d20',
  tv_stand: '#6a4a2c',
  // A laser TV / UST is usually a pale cabinet with a fabric wrap; a long-throw
  // projector is usually near-black. The catalog says which per product; this is
  // the fallback for the more common one.
  projector: '#d7d4cd',
  // On a screen, color = the BEZEL and accent = the FABRIC.
  projection_screen: '#0e0e0e',
  speaker: '#26262a',
  shade: '#3a3833',
  plant: '#4e7a4a',
  floor_lamp: '#2f3134',
  table_lamp: '#2f3134',
  mirror: '#c9a677',
  art: '#c9a677',
  curtain: '#f2eee4',
  screen: '#c9a677',
  box: '#b9b2a4',
};

/** Per-kind default seat/surface height (ft) when the def omits seatHeight. */
function defaultSeat(kind: string, h: number): number {
  switch (kind) {
    case 'sofa':
    case 'sectional':
    case 'loveseat':
    case 'armchair':
      return IN(17); // 17" is the industry standard seat height
    case 'chair':
      return IN(18);
    case 'bar_stool':
      return IN(26); // counter stool; a 30" bar stool should say so in the def
    case 'bed':
      return IN(24); // top of mattress on a platform + 10" mattress
    case 'daybed':
    case 'sofa_bed':
      return IN(18);
    case 'dining_table':
    case 'desk':
      return IN(29.5); // standard table/desk height
    case 'coffee_table':
      return IN(17);
    case 'side_table':
      return IN(24);
    case 'console':
      return IN(30);
    case 'bench':
    case 'ottoman':
      return IN(17.5);
    default:
      return h;
  }
}

function isRound(def: FurnitureDef): boolean {
  // The catalog has no `shape` field, so a round table declares itself with a
  // tag or in its name ("Docksta round dining table").
  const hay = `${def.id} ${def.name} ${(def.tags ?? []).join(' ')}`.toLowerCase();
  return /\bround\b|\bcircular\b|\bpedestal\b/.test(hay);
}

function isTaskChair(def: FurnitureDef): boolean {
  const hay = `${def.id} ${def.name} ${(def.tags ?? []).join(' ')}`.toLowerCase();
  return /\btask\b|\bdesk\b|\boffice\b|\bswivel\b/.test(hay);
}

// ---------------------------------------------------------------- entry point

/**
 * Build one piece of furniture. `item` supplies size overrides, a color
 * override and the instance id stamped into userData.
 */
export function buildFurniture(def: FurnitureDef, item?: PlacedItem): THREE.Object3D {
  const w = item?.size?.w ?? def.w;
  const d = item?.size?.d ?? def.d;
  const h = item?.size?.h ?? def.h;

  const baseColor = item?.color ?? def.color ?? KIND_COLOR[def.kind] ?? '#b0aaa0';
  const accentColor = def.accent ?? baseColor;

  const g = new THREE.Group();
  g.name = item?.label ?? item?.id ?? def.id;

  const ctx: Ctx = {
    g,
    def,
    w,
    d,
    h,
    seat: def.seatHeight ?? defaultSeat(def.kind, h),
    body: matFor(baseColor, { roughness: 0.9 }),
    accent: matFor(accentColor, { roughness: 0.95 }),
    frame: matFor(baseColor, { roughness: 0.6, metalness: 0.05 }),
    color: baseColor,
    accentColor,
    hasAccent: !!def.accent,
    n: def.id,
  };

  switch (def.kind) {
    case 'sofa':
    case 'loveseat':
    case 'sectional':
    case 'armchair':
      buildSeating(ctx, def.kind === 'sectional');
      break;
    case 'ottoman':
      buildOttoman(ctx);
      break;
    case 'bench':
      buildBench(ctx);
      break;
    case 'bed':
    case 'sofa_bed':
      // 'daybed' is not a FurnitureKind — a daybed is catalogued as a bed or
      // sofa_bed and says so in its name/tags. Both get arms.
      buildBed(ctx, def.kind === 'sofa_bed' || /daybed/i.test(`${def.id} ${def.name}`));
      break;
    case 'murphy_bed':
      buildCase(ctx, 'doors');
      break;
    case 'dining_table':
    case 'coffee_table':
    case 'side_table':
    case 'console':
    case 'desk':
      buildTable(ctx, def.kind);
      break;
    case 'chair':
      if (isTaskChair(def)) buildTaskChair(ctx);
      else buildChair(ctx);
      break;
    case 'bar_stool':
      buildStool(ctx);
      break;
    case 'dresser':
    case 'nightstand':
      buildCase(ctx, 'drawers');
      break;
    case 'cabinet':
    case 'wardrobe':
      buildCase(ctx, 'doors');
      break;
    case 'bookcase':
    case 'shelf':
      buildShelving(ctx);
      break;
    case 'rug':
      buildRug(ctx);
      break;
    case 'tv':
      buildTV(ctx);
      break;
    case 'tv_stand':
      buildCase(ctx, 'media');
      break;
    case 'projector':
      buildProjector(ctx);
      break;
    case 'projection_screen':
      buildProjectionScreen(ctx);
      break;
    case 'speaker':
      buildSpeaker(ctx);
      break;
    case 'shade':
      buildShade(ctx);
      break;
    case 'plant':
      buildPlant(ctx);
      break;
    case 'floor_lamp':
      buildLamp(ctx, true);
      break;
    case 'table_lamp':
      buildLamp(ctx, false);
      break;
    case 'mirror':
    case 'art':
      buildWallPanel(ctx, def.kind === 'mirror');
      break;
    case 'curtain':
      buildCurtain(ctx);
      break;
    case 'screen':
      buildScreen(ctx);
      break;
    case 'box':
    default:
      // 'box' is genuinely a box (moving cartons, storage cubes, placeholders).
      addBox(g, ctx.body, [w, h, d], [0, h / 2, 0], { name: `${ctx.n}/body` });
      break;
  }

  stamp(g, def.id, item?.id);
  return g;
}

/** name + userData every descendant so a raycast on any face resolves the item. */
function stamp(root: THREE.Object3D, defId: string, itemId?: string): void {
  const data = { defId, itemId };
  root.userData = { ...root.userData, ...data };
  let i = 0;
  root.traverse((o) => {
    if (!o.name) o.name = `${defId}/part-${i++}`;
    o.userData = { ...o.userData, ...data };
  });
}

// ---------------------------------------------------------------- seating

/**
 * Sofa family. Real proportions (measured off an IKEA/West Elm 3-seater):
 *   arm width 5-7", back thickness 7-8", seat cushion 5" thick,
 *   arm top ~24" from the floor, plinth (the upholstered base) from the floor
 *   to the underside of the seat cushions.
 */
function buildSeating(ctx: Ctx, sectional: boolean): void {
  const { g, w, d, h, seat, body, accent, n } = ctx;
  const def = ctx.def;

  /*
   * LIFT AND SHADOW GAP — the single change that stops a sofa reading as a slab.
   *
   * The previous version ran the upholstered plinth from the floor to the
   * underside of the cushions and then put four 2 1/2" feet INSIDE that volume,
   * where they are invisible. So the sofa met the floor along a hard line with no
   * shadow under it, and in a path-traced frame that is exactly what a
   * featureless block looks like: the eye has nothing to separate the object from
   * the plane it stands on.
   *
   * Real modern seating is lifted 4-7" on legs, and the dark band of shadow under
   * it is most of what tells you it is furniture. So the body now starts at
   * `lift` and the legs are real, visible, and outside the body.
   *
   * `lift` is read off the catalog: a 'floating' or 'legs' tag gets the full 6",
   * a plinth-based design ('plinth' tag) gets a 1" recessed toe shadow, and
   * anything else gets 4 1/2" — the industry-standard leg on an 17" seat.
   */
  const tagged = (re: RegExp): boolean => hasTag(def, re);
  const onPlinth = tagged(/\bplinth\b|platform-base/);
  const lift = onPlinth ? IN(1) : tagged(/floating|tall-leg/) ? IN(6) : IN(4.5);

  const armless = tagged(/armless/);
  const slimArm = tagged(/slim[- ]?arm|track[- ]?arm|thin[- ]?arm/);
  const armW = armless ? 0 : Math.min(slimArm ? IN(3.5) : IN(7), w * 0.13);
  const backT = Math.min(IN(8), d * 0.22);
  const cushT = IN(5);
  const plinthTop = Math.max(lift + IN(2), seat - cushT);
  const armTop = Math.min(h - IN(2), seat + IN(7));

  // Depth of the main run. A sectional's def box is the whole L, so the
  // straight run only gets part of it; a plain sofa uses the full depth.
  const mainD = sectional ? Math.min(d, IN(38)) : d;
  const zBack = -d / 2;
  const zMainFront = zBack + mainD;
  // Chaise side: catalog says so, else the +x (right) side as before.
  const chaiseLeft = tagged(/chaise[- ]?left|left[- ]?chaise|laf\b/);

  // plinth: the upholstered base under the cushions, lifted clear of the floor
  addBox(g, body, [w, plinthTop - lift, mainD], [0, lift + (plinthTop - lift) / 2, zBack + mainD / 2], {
    name: `${n}/plinth`,
  });

  // back: from the lift to the full height at the rear
  addBox(g, body, [w, h - lift, backT], [0, lift + (h - lift) / 2, zBack + backT / 2], { name: `${n}/back` });

  // arms: on both ends of a plain sofa; a sectional keeps its outer arm only
  const armLen = mainD;
  const armH = armTop - lift;
  if (armW > 0) {
    const outerLeft = !sectional || !chaiseLeft;
    const outerRight = !sectional || chaiseLeft;
    if (outerLeft)
      addBox(g, body, [armW, armH, armLen], [-w / 2 + armW / 2, lift + armH / 2, zBack + armLen / 2], {
        name: `${n}/arm-l`,
      });
    if (outerRight)
      addBox(g, body, [armW, armH, armLen], [w / 2 - armW / 2, lift + armH / 2, zBack + armLen / 2], {
        name: `${n}/arm-r`,
      });
  }

  // seat cushions: divide the clear width into ~22-26" seats
  const clearW = w - armW * (sectional || armless ? 1 : 2);
  const seatDepth = mainD - backT - IN(1);
  const seats = Math.max(1, Math.round(clearW / IN(24)));
  const cw = (clearW - IN(0.5) * (seats - 1)) / seats;
  // Left edge of the clear span: past the left arm unless the chaise is there.
  const x0 = -w / 2 + (sectional && chaiseLeft ? 0 : armW);
  for (let i = 0; i < seats; i++) {
    const cx = x0 + cw / 2 + i * (cw + IN(0.5));
    addBox(g, accent, [cw, cushT, seatDepth], [cx, plinthTop + cushT / 2, zBack + backT + seatDepth / 2], {
      name: `${n}/seat-${i}`,
    });
    // back cushion: from the seat plane to just under the top of the back
    const bh = h - (plinthTop + cushT) - IN(1);
    if (bh > IN(4)) {
      addBox(g, accent, [cw, bh, IN(5.5)], [cx, plinthTop + cushT + bh / 2, zBack + backT + IN(2.75)], {
        name: `${n}/back-cushion-${i}`,
      });
    }
  }

  if (sectional) {
    // L return (chaise) filling the rest of the def box on the chaise side.
    const retW = Math.min(w * 0.42, IN(36));
    const retZ0 = zMainFront;
    const retD = d / 2 - retZ0;
    const side = chaiseLeft ? -1 : 1;
    if (retD <= IN(6)) {
      // def box was too shallow for a return; fall back to a plain arm there
      if (armW > 0)
        addBox(g, body, [armW, armH, armLen], [side * (w / 2 - armW / 2), lift + armH / 2, zBack + armLen / 2], {
          name: chaiseLeft ? `${n}/arm-l` : `${n}/arm-r`,
        });
    } else {
      const rx = side * (w / 2 - retW / 2);
      addBox(g, body, [retW, plinthTop - lift, retD], [rx, lift + (plinthTop - lift) / 2, retZ0 + retD / 2], {
        name: `${n}/return-plinth`,
      });
      addBox(
        g,
        accent,
        [retW - armW, cushT, retD - IN(1)],
        [rx - side * (armW / 2), plinthTop + cushT / 2, retZ0 + retD / 2],
        { name: `${n}/return-seat` },
      );
      // outer arm runs the full length of the L on the chaise side
      if (armW > 0)
        addBox(g, body, [armW, armH, d], [side * (w / 2 - armW / 2), lift + armH / 2, 0], {
          name: chaiseLeft ? `${n}/arm-l` : `${n}/arm-r`,
        });
    }
  }

  if (onPlinth) {
    // Recessed plinth: a dark toe band set back 1 1/2", so the piece still reads
    // as lifted without inventing legs the product does not have.
    addBox(g, MAT.cabinetDark, [w - IN(3), lift, mainD - IN(3)], [0, lift / 2, zBack + mainD / 2], {
      name: `${n}/toe-plinth`,
      recv: false,
    });
    return;
  }

  /*
   * LEGS. Slim tapered timber or black steel, 1 1/2" square, set in 3 1/2" from
   * each corner — that is what an Article/Floyd/Gus leg actually measures. On a
   * sectional the L needs a fifth and sixth leg under the return or the chaise
   * visibly floats.
   */
  const legS = IN(1.5);
  const inset = IN(3.5);
  const legMat = ctx.hasAccent && tagged(/black[- ]?leg|steel[- ]?leg/) ? MAT.metalBlack : MAT.woodDark;
  const legXs = [-1, 1].map((s) => s * (w / 2 - inset));
  const legZs = [-1, 1].map((s) => s * (d / 2 - inset));
  const spots: [number, number][] = [];
  for (const lx of legXs) for (const lz of legZs) spots.push([lx, lz]);
  if (w > IN(84)) {
    // A long run sags visually without a centre pair.
    for (const lz of legZs) spots.push([0, lz]);
  }
  for (const [lx, lz] of spots) {
    addBox(g, legMat, [legS, lift, legS], [lx, lift / 2, lz], { name: `${n}/leg`, recv: false });
  }
}

function buildOttoman(ctx: Ctx): void {
  const { g, w, d, h, body, accent, n } = ctx;
  const legH = IN(3);
  addBox(g, body, [w, h - legH - IN(2.5), d], [0, legH + (h - legH - IN(2.5)) / 2, 0], { name: `${n}/body` });
  addBox(g, accent, [w - IN(1), IN(2.5), d - IN(1)], [0, h - IN(1.25), 0], { name: `${n}/cushion` });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      addBox(g, MAT.woodDark, [IN(1.6), legH, IN(1.6)], [sx * (w / 2 - IN(2.5)), legH / 2, sz * (d / 2 - IN(2.5))], {
        name: `${n}/leg`,
        recv: false,
      });
}

function buildBench(ctx: Ctx): void {
  const { g, w, d, h, body, n } = ctx;
  const topT = IN(1.5);
  addBox(g, body, [w, topT, d], [0, h - topT / 2, 0], { name: `${n}/top` });
  const legT = IN(1.75);
  for (const sx of [-1, 1])
    addBox(g, MAT.woodDark, [legT, h - topT, d - IN(2)], [sx * (w / 2 - IN(2) - legT / 2), (h - topT) / 2, 0], {
      name: `${n}/leg`,
    });
}

// ---------------------------------------------------------------- beds

/**
 * Bed family. Real numbers: a queen mattress is 60x80 and 10-12" thick; a
 * platform frame puts the top of the mattress at 22-25". The FOOT of the bed
 * faces +z (front), so the headboard is at -z.
 */
function buildBed(ctx: Ctx, withArms: boolean): void {
  const { g, w, d, h, body, n } = ctx;
  // def.accent is the BEDDING color on a bed (OAK frame / OFF_WHITE linen)
  const linen = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.97 }) : MAT.linen;
  const duvet = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.99 }) : matFor('#e2ded3', { roughness: 0.98 });

  // A def whose whole height is mattress-thick IS a mattress (the catalog has
  // bare twin/queen/king mattresses for floor + murphy + sofa-bed use). It gets
  // no frame, no headboard and no bedding, because any of those would break the
  // "nothing sticks out of the def box" rule that analysis.ts relies on.
  if (h <= IN(16)) {
    addBox(g, linen, [w, h, d], [0, h / 2, 0], { name: `${n}/mattress` });
    addBox(g, duvet, [w - IN(3), IN(1.5), d * 0.6], [0, h - IN(0.4), d * 0.2], {
      name: `${n}/duvet`,
      cast: false,
    });
    return;
  }

  const mattT = IN(10);
  const mattTop = Math.min(Math.max(ctx.seat, mattT + IN(2)), h - IN(2));
  const frameTop = Math.max(IN(3), mattTop - mattT);
  const hbT = IN(2.5); // headboard / back panel thickness

  // frame: a platform box, inset 1/2" so the mattress reads as sitting in it
  addBox(g, body, [w, frameTop, d], [0, frameTop / 2, 0], { name: `${n}/frame` });

  // headboard (bed) or upholstered back (daybed / sofa bed)
  addBox(g, body, [w, h, hbT], [0, h / 2, -d / 2 + hbT / 2], { name: `${n}/headboard` });
  if (withArms) {
    // daybeds and sofa beds have arms; they are used as seating by day
    const armW = IN(4);
    const armH = Math.min(h * 0.8, mattTop + IN(8));
    for (const sx of [-1, 1])
      addBox(g, body, [armW, armH, d], [sx * (w / 2 - armW / 2), armH / 2, 0], { name: `${n}/arm` });
  }

  const mattW = w - IN(1);
  const mattD = d - hbT - IN(1);
  const mattZ = -d / 2 + hbT + mattD / 2;
  addBox(g, linen, [mattW, mattT, mattD], [0, frameTop + mattT / 2, mattZ], { name: `${n}/mattress` });

  // Bedding only where the def box has room for it above the mattress — a
  // headboard-less platform bed is only as tall as its mattress.
  const headroom = h - (frameTop + mattT);

  // 2 pillows, 26x20x5, at the head end, tilted up against the headboard
  if (headroom >= IN(7)) {
    const pw = Math.min(mattW / 2 - IN(2), IN(26));
    for (const sx of [-1, 1]) {
      addBox(g, linen, [pw, IN(5), IN(20)], [sx * (mattW / 4), frameTop + mattT + IN(2.5), mattZ - mattD / 2 + IN(11)], {
        name: `${n}/pillow`,
        rotX: -0.12,
      });
    }
  }

  // duvet: narrower and shorter than the mattress, folded down from the foot
  if (headroom >= IN(3.5)) {
    const duvW = mattW - IN(3);
    const duvD = mattD * 0.66;
    addBox(g, duvet, [duvW, IN(3), duvD], [0, frameTop + mattT + IN(1.4), mattZ + mattD / 2 - duvD / 2], {
      name: `${n}/duvet`,
    });
  }
}

// ---------------------------------------------------------------- tables

function buildTable(ctx: Ctx, kind: string): void {
  const { g, w, d, h, n } = ctx;
  const topT = IN(1.375); // 1 3/8" — a realistic solid-wood / thick-veneer slab
  // top = def.color, legs = def.accent (an oak top on black legs, etc.)
  const top = matFor(ctx.color, { roughness: 0.55 });
  const legMat = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.45, metalness: 0.15 }) : ctx.frame;

  if (isRound(ctx.def)) {
    // round top on a pedestal: column + weighted disc base
    const dia = Math.min(w, d);
    addCyl(g, top, { dBottom: dia, h: topT, seg: 32 }, [0, h - topT / 2, 0], { name: `${n}/top` });
    addCyl(g, legMat, { dBottom: dia * 0.16, dTop: dia * 0.13, h: h - topT }, [0, (h - topT) / 2, 0], { name: `${n}/pedestal` });
    addCyl(g, legMat, { dBottom: dia * 0.45, dTop: dia * 0.42, h: IN(1.25), seg: 24 }, [0, IN(0.625), 0], { name: `${n}/base` });
    return;
  }

  addBox(g, top, [w, topT, d], [0, h - topT / 2, 0], { name: `${n}/top` });

  // legs: 2 1/2" square, inset 2 1/2" from each corner
  const legS = kind === 'side_table' || kind === 'coffee_table' ? IN(1.75) : IN(2.5);
  const inset = IN(2.5);
  const legH = h - topT;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, legMat, [legS, legH, legS], [sx * (w / 2 - inset - legS / 2), legH / 2, sz * (d / 2 - inset - legS / 2)], {
        name: `${n}/leg`,
      });
    }
  }

  if (kind === 'desk') {
    // modesty panel across the back, set up off the floor
    addBox(g, ctx.body, [w - inset * 2, legH * 0.45, IN(0.75)], [0, legH * 0.72, -d / 2 + IN(2.5)], { name: `${n}/modesty` });
  } else if (kind === 'coffee_table' || kind === 'console' || kind === 'side_table') {
    // lower shelf at 1/3 height — reads as storage, adds a horizontal line
    addBox(g, ctx.body, [w - inset * 2 - legS, IN(0.75), d - inset * 2 - legS], [0, legH * 0.3, 0], { name: `${n}/shelf` });
  }
}

// ---------------------------------------------------------------- chairs

function buildChair(ctx: Ctx): void {
  const { g, w, d, h, seat, body, frame, n } = ctx;
  const seatT = IN(1.5);
  addBox(g, ctx.def.accent ? ctx.accent : body, [w, seatT, d], [0, seat - seatT / 2, 0], { name: `${n}/seat` });
  // back: leans back 6 degrees, thickness 1 1/4"
  const backH = h - seat;
  if (backH > IN(4)) {
    addBox(g, body, [w - IN(1), backH, IN(1.25)], [0, seat + backH / 2, -d / 2 + IN(1.4)], { name: `${n}/back`, rotX: 0.1 });
  }
  const legS = IN(1.4);
  const legH = seat - seatT;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      addBox(g, frame, [legS, legH, legS], [sx * (w / 2 - IN(1.2) - legS / 2), legH / 2, sz * (d / 2 - IN(1.2) - legS / 2)], {
        name: `${n}/leg`,
      });
}

/** Task chair: gas column on a 5-star caster base. */
function buildTaskChair(ctx: Ctx): void {
  const { g, w, d, h, seat, body, n } = ctx;
  const seatT = IN(3);
  const baseDia = Math.min(w, d);
  addBox(g, body, [w * 0.82, seatT, d * 0.82], [0, seat - seatT / 2, 0], { name: `${n}/seat` });
  const backH = h - seat - IN(2);
  addBox(g, body, [w * 0.7, backH, IN(2)], [0, seat + IN(2) + backH / 2, -d / 2 + IN(3)], { name: `${n}/back`, rotX: 0.12 });
  addCyl(g, MAT.metalBlack, { dBottom: IN(2.5), h: seat - seatT }, [0, (seat - seatT) / 2, 0], { name: `${n}/column` });
  // 5-star base: 5 spokes at 72 degrees, each with a caster at the tip
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const r = baseDia * 0.36;
    addBox(g, MAT.metalBlack, [r, IN(1.2), IN(2)], [(Math.cos(a) * r) / 2, IN(2.4), (Math.sin(a) * r) / 2], {
      name: `${n}/spoke-${i}`,
      rotY: -a,
    });
    addCyl(g, MAT.metalBlack, { dBottom: IN(2), h: IN(1.6), seg: 8 }, [Math.cos(a) * r, IN(0.8), Math.sin(a) * r], {
      name: `${n}/caster-${i}`,
    });
  }
}

function buildStool(ctx: Ctx): void {
  const { g, w, d, h, seat, body, frame, n } = ctx;
  const dia = Math.min(w, d);
  const seatT = IN(1.5);
  const seatY = Math.min(seat, h) - seatT / 2;
  addCyl(g, ctx.def.accent ? ctx.accent : body, { dBottom: dia, h: seatT, seg: 20 }, [0, seatY, 0], { name: `${n}/seat` });
  const backH = h - (seatY + seatT / 2);
  if (backH > IN(4)) {
    addBox(g, body, [dia * 0.8, backH, IN(1.1)], [0, seatY + seatT / 2 + backH / 2, -d / 2 + IN(1.2)], { name: `${n}/back` });
  }
  // 4 slightly splayed legs + a footrest ring at 1/3 height
  const legH = seatY - seatT / 2;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      addBox(g, frame, [IN(1.3), legH, IN(1.3)], [sx * (dia / 2 - IN(1.4)), legH / 2, sz * (dia / 2 - IN(1.4))], {
        name: `${n}/leg`,
      });
  for (const sz of [-1, 1])
    addBar(g, frame, IN(1), dia - IN(2.8), [0, legH * 0.35, sz * (dia / 2 - IN(1.4))], false, { name: `${n}/stretcher` });
}

// ---------------------------------------------------------------- casework

/**
 * Carcass + fronts. `style`:
 *   'drawers' — dressers / nightstands: N stacked drawer fronts, ~10" each
 *   'doors'   — wardrobes / cabinets / murphy beds (closed): full-height doors
 *   'media'   — tv stand: an open middle shelf between two door bays
 *
 * A murphy bed is built with this on purpose: layouts place it CLOSED by
 * default, so its 3D presence is a cabinet of exactly def.d deep.
 */
function buildCase(ctx: Ctx, style: 'drawers' | 'doors' | 'media'): void {
  const { g, w, d, h, body, n } = ctx;
  const toeH = IN(3); // recessed toe kick
  const toeD = IN(2.5);
  const carcassY0 = toeH;
  const zFace = d / 2;

  addBox(g, body, [w, h - toeH, d], [0, toeH + (h - toeH) / 2, 0], { name: `${n}/carcass` });
  addBox(g, MAT.cabinetDark, [w - IN(1), toeH, d - toeD], [0, toeH / 2, -toeD / 2], { name: `${n}/toe-kick` });

  // Fronts match the carcass (real casework does); the 1/4" recess and the pull
  // are what make them read. def.accent is the HARDWARE finish here.
  const face = matFor(ctx.color, { roughness: 0.5 });
  const pull = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.3, metalness: 0.7 }) : MAT.chrome;

  /*
   * HANDLELESS, and it is not a style preference — it is in the finish schedule.
   * The reference photograph shows slab fronts with faint vertical seams and NOT
   * ONE pull, knob, bar or edge profile on any door or drawer in the kitchen; the
   * only visible hardware in the room is the range's own tubular oven handle and
   * the faucet. So a bar pull on a new case piece standing next to that run is
   * the single easiest way to make it read as a different, cheaper kitchen.
   *
   * Any catalog entry tagged 'slab-front', 'handleless', 'sliding', 'millwork' or
   * 'ust-plinth' therefore gets NO pull, and the 1/4" recess plus the 1/8" reveal
   * between panels does the whole job of making the front read. See
   * src/core/finishes.ts, the KITCHEN HARDWARE / PULLS entry.
   */
  const handleless = hasTag(ctx.def, /slab-front|handleless|sliding|millwork|ust-plinth|push-open/);
  const pullStyleH: 'bar-h' | 'none' = handleless ? 'none' : 'bar-h';
  const pullStyleV: 'bar-v' | 'none' = handleless ? 'none' : 'bar-v';

  if (style === 'drawers') {
    // ~10" drawer faces; a 30" dresser gets 3, a 24" nightstand gets 2
    const rows = Math.max(1, Math.min(6, Math.round((h - toeH) / IN(10))));
    const cols = w > IN(44) ? 2 : 1; // wide dressers are double-banked
    addPanels(g, { x0: -w / 2, x1: w / 2, y0: carcassY0, y1: h, zFace, rows, cols, face, pull, pullStyle: pullStyleH, name: n });
  } else if (style === 'doors') {
    const cols = Math.max(1, Math.round(w / IN(26))); // ~26" leaves
    addPanels(g, { x0: -w / 2, x1: w / 2, y0: carcassY0, y1: h, zFace, rows: 1, cols, face, pull, pullStyle: pullStyleV, name: n });
  } else if (hasTag(ctx.def, /ust-plinth|millwork/) && h <= IN(20)) {
    /*
     * A UST PLINTH is not a media console and must not be built like one. It is a
     * low slab base whose whole job is to be a flat, square, parallel platform:
     * a UST amplifies any yaw straight into visible trapezoid, and digital
     * keystone on one is a resolution crop rather than a fix. So no open middle
     * bay (a UST's exhaust and cable want the back of the top, not a shelf), no
     * pulls, and a deliberately generous run of push-open fronts.
     */
    const bays = Math.max(2, Math.round(w / IN(30)));
    addPanels(g, {
      x0: -w / 2,
      x1: w / 2,
      y0: carcassY0,
      y1: h,
      zFace,
      rows: 1,
      cols: bays,
      face,
      pull,
      pullStyle: 'none',
      name: n,
    });
  } else {
    // media console: doors on the outer thirds, open shelf in the middle
    const bay = w / 3;
    addPanels(g, { x0: -w / 2, x1: -w / 2 + bay, y0: carcassY0, y1: h - IN(1), zFace, rows: 1, cols: 1, face, pull, pullStyle: pullStyleV, name: `${n}-l` });
    addPanels(g, { x0: w / 2 - bay, x1: w / 2, y0: carcassY0, y1: h - IN(1), zFace, rows: 1, cols: 1, face, pull, pullStyle: pullStyleV, name: `${n}-r` });
    addBox(g, MAT.cabinetDark, [bay, IN(0.75), d - IN(1)], [0, carcassY0 + (h - carcassY0) / 2, 0], { name: `${n}/shelf` });
  }
}

/** Bookcase / wall shelf: sides, back panel, evenly spaced shelves. */
function buildShelving(ctx: Ctx): void {
  const { g, w, d, h, body, n } = ctx;
  const T = IN(0.75); // 3/4" panel stock
  const backT = IN(0.25);

  for (const sx of [-1, 1]) addBox(g, body, [T, h, d], [sx * (w / 2 - T / 2), h / 2, 0], { name: `${n}/side` });
  addBox(g, MAT.cabinetDark, [w - T * 2, h, backT], [0, h / 2, -d / 2 + backT / 2], { name: `${n}/back` });

  // shelf spacing: aim for 12-14" bays, which is what real bookcases use;
  // always include a top and a bottom shelf.
  const bays = Math.max(1, Math.round(h / IN(13)));
  const innerW = w - T * 2;
  for (let i = 0; i <= bays; i++) {
    const y = i === 0 ? T / 2 : i === bays ? h - T / 2 : (h / bays) * i;
    addBox(g, body, [innerW, T, d - backT], [0, y, backT / 2], { name: `${n}/shelf-${i}` });
  }
}

// ---------------------------------------------------------------- soft goods

function buildRug(ctx: Ctx): void {
  const { g, w, d, n } = ctx;
  const t = 0.02; // ~1/4" pile: thin enough to walk over, thick enough to see
  const base = ctx.def.color ? ctx.body : MAT.rug;
  // a rug never casts (it is flat on the floor) but must receive the sun
  addBox(g, base, [w, t, d], [0, t / 2, 0], { name: `${n}/pile`, cast: false });
  // inset field in the accent color = a border, which is what makes it read
  const border = Math.min(IN(8), Math.min(w, d) * 0.12);
  addBox(g, ctx.def.accent ? ctx.accent : MAT.linen, [w - border * 2, 0.004, d - border * 2], [0, t + 0.002, 0], {
    name: `${n}/field`,
    cast: false,
  });
}

function buildCurtain(ctx: Ctx): void {
  const { g, w, h, n } = ctx;
  // The rod lives INSIDE the def box (a curtain panel's stated height is the
  // fabric drop, and nothing may stick out of the box), so the fabric hangs
  // from just under the rod.
  const rodY = h - IN(1.25);
  const fabricH = rodY - IN(1);
  // fake fabric folds with N thin slats alternating in z: cheap and convincing
  const folds = Math.max(4, Math.round(w / IN(8)));
  const fw = w / folds;
  for (let i = 0; i < folds; i++) {
    const x = -w / 2 + fw / 2 + i * fw;
    const z = (i % 2 === 0 ? 1 : -1) * IN(1.2);
    addBox(g, MAT.curtain, [fw * 0.95, fabricH, IN(1)], [x, fabricH / 2, z], { name: `${n}/fold-${i}`, cast: false });
  }
  addBar(g, MAT.metalBlack, IN(1.25), w, [0, rodY, 0], false, { name: `${n}/rod` });
}

function buildScreen(ctx: Ctx): void {
  const { g, w, d, h, body, n } = ctx;
  // 3-panel folding screen, zig-zagged inside the def footprint
  const panels = 3;
  const pw = w / panels;
  for (let i = 0; i < panels; i++) {
    const x = -w / 2 + pw / 2 + i * pw;
    // pulled in far enough that the yawed panel's corners stay inside def.d
    const z = (i % 2 === 0 ? -1 : 1) * Math.max(0, d / 2 - IN(3));
    addBox(g, body, [pw * 0.98, h, IN(1.25)], [x, h / 2, z], { name: `${n}/panel-${i}`, rotY: (i % 2 === 0 ? 1 : -1) * 0.12 });
  }
}

// ---------------------------------------------------------------- av + decor

function buildTV(ctx: Ctx): void {
  const { g, w, h, n } = ctx;
  const bezel = IN(0.5);
  addBox(g, MAT.metalBlack, [w, h, IN(1.5)], [0, h / 2, 0], { name: `${n}/bezel` });
  addBox(g, MAT.screen, [w - bezel * 2, h - bezel * 2, IN(0.25)], [0, h / 2, IN(0.9)], { name: `${n}/panel`, cast: false });
}

/**
 * A tag test, used by the projection builders to pick a variant. Reads the id,
 * the name and the tags so a catalog entry can declare itself either way.
 */
function hasTag(def: FurnitureDef, re: RegExp): boolean {
  return re.test(`${def.id} ${def.name} ${(def.tags ?? []).join(' ')}`.toLowerCase());
}

/**
 * PROJECTOR — two genuinely different machines behind one kind.
 *
 * ULTRA-SHORT-THROW (a "laser TV"): a wide, shallow cabinet that stands a few
 * inches OFF the screen wall, facing the room, and throws the image UP AND
 * BACKWARD over its own body onto the wall behind it. So the lens window is on
 * the TOP surface at the BACK (local -z), the speaker grille is on the front
 * (+z) where the room can hear it, and the whole thing is furniture — it lives
 * on a credenza top and reads as a piece of hi-fi.
 *
 * LONG / SHORT THROW: a smaller box that sits BEHIND the audience facing the
 * screen, so its lens is on the FRONT face (+z) and its intake vents are on the
 * side. Nothing protrudes past the def box in either case — the analyzer treats
 * the box as the truth, so a lens barrel poking out of it would be a lie.
 */
function buildProjector(ctx: Ctx): void {
  const { g, w, d, h, n } = ctx;
  const ust = hasTag(ctx.def, /\bust\b|ultra[- ]?short|laser[- ]?tv/);
  const shell = matFor(ctx.color, { roughness: 0.42, metalness: 0.06 });
  const grille = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.92 }) : MAT.speakerGrille;

  const footH = IN(0.6);
  const bodyH = Math.max(IN(1), h - footH);
  addBox(g, shell, [w, bodyH, d], [0, footH + bodyH / 2, 0], { name: `${n}/shell` });

  // Four rubber feet, inset — a projector is levelled on its feet and the shadow
  // under it is what stops it looking painted onto the credenza.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      addBox(g, MAT.metalBlack, [IN(1.2), footH, IN(1.2)], [sx * (w / 2 - IN(1.5)), footH / 2, sz * (d / 2 - IN(1.5))], {
        name: `${n}/foot`,
        recv: false,
      });

  if (ust) {
    // Lens exit window: a glass panel let into the top, back third, offset to one
    // side the way every real laser TV does it.
    const winW = Math.min(w * 0.3, IN(9));
    const winD = Math.min(d * 0.34, IN(5));
    const zWin = -d / 2 + winD / 2 + IN(1.2);
    addBox(g, shell, [winW + IN(1.6), IN(0.5), winD + IN(1.6)], [0, footH + bodyH, zWin], {
      name: `${n}/lens-hood`,
    });
    addBox(g, MAT.lensGlass, [winW, IN(0.25), winD], [0, footH + bodyH + IN(0.3), zWin], {
      name: `${n}/lens-window`,
      cast: false,
    });
    // Fabric-wrapped speaker band across the front face — a laser TV is also the
    // sound system, and the band is the detail that says so.
    addBox(g, grille, [w - IN(2), bodyH * 0.55, IN(0.6)], [0, footH + bodyH * 0.42, d / 2 - IN(0.3)], {
      name: `${n}/grille`,
      cast: false,
    });
    return;
  }

  // Long / short throw: lens barrel recessed into the front face, vent slot on
  // the left cheek, and a slim top plate so the box is not one flat slab.
  const lensDia = Math.min(bodyH * 0.62, IN(4.5));
  addBar(g, MAT.metalBlack, lensDia + IN(0.8), IN(1.1), [w * 0.18, footH + bodyH * 0.55, d / 2 - IN(0.6)], true, {
    name: `${n}/lens-ring`,
  });
  addBar(g, MAT.lensGlass, lensDia, IN(0.5), [w * 0.18, footH + bodyH * 0.55, d / 2 - IN(0.35)], true, {
    name: `${n}/lens`,
    cast: false,
  });
  addBox(g, grille, [IN(0.5), bodyH * 0.5, d * 0.5], [-w / 2 + IN(0.25), footH + bodyH * 0.5, 0], {
    name: `${n}/vent`,
    cast: false,
  });
  addBox(g, MAT.metalBlack, [w * 0.5, IN(0.3), d * 0.5], [0, footH + bodyH, -d * 0.1], {
    name: `${n}/top-plate`,
    cast: false,
  });
}

/**
 * PROJECTION SCREEN — always modelled DEPLOYED, because the deployed rectangle
 * is what the sightline and seating-distance checks have to see.
 *
 * Three variants, chosen off the catalog entry's tags:
 *   fixed frame  a velvet-wrapped bezel around a tensioned fabric panel
 *   roller       a slim cassette across the top with the fabric hanging from it,
 *                plus a weighted bottom bar (which is what a tab-tensioned
 *                screen actually looks like from the side)
 *   painted      no frame and no cassette at all: the wall IS the screen, so all
 *                that exists is a 1/8" skim of screen paint
 *
 * `lit` swaps the fabric for the emissive picture material. That is how a layout
 * shows the room in use without pretending a daylight frame is a dark room.
 */
function buildProjectionScreen(ctx: Ctx): void {
  const { g, w, d, h, n } = ctx;
  const def = ctx.def;
  const roller = hasTag(def, /roller|motoris|motoriz|retract|drop[- ]?down|tab[- ]?tension/);
  const painted = hasTag(def, /paint|wall[- ]?as[- ]?screen/);
  const lit = hasTag(def, /\blit\b|image[- ]?on|switched[- ]?on|projected[- ]?image/);
  const alr = hasTag(def, /\balr\b|lenticular|ambient[- ]?light/);

  const fabric = lit
    ? MAT.screenImage
    : ctx.hasAccent
      ? matFor(ctx.accentColor, { roughness: alr ? 0.5 : 0.94 })
      : alr
        ? MAT.screenFabricAlr
        : MAT.screenFabric;
  const bezel = ctx.def.color ? matFor(ctx.color, { roughness: 0.98 }) : MAT.bezelVelvet;

  if (painted) {
    // A painted wall panel: a skim of paint, nothing else. It has no thickness
    // worth drawing, so it is one thin sheet at the front of the def box.
    addBox(g, fabric, [w, h, IN(0.125)], [0, h / 2, d / 2 - IN(0.0625)], {
      name: `${n}/paint`,
      cast: false,
    });
    return;
  }

  if (roller) {
    // Cassette across the head, fabric below it, weighted bar at the bottom.
    const caseH = Math.min(IN(3.5), h * 0.06);
    const caseD = Math.min(d, IN(3.5));
    addBox(g, bezel, [w, caseH, caseD], [0, h - caseH / 2, d / 2 - caseD / 2], { name: `${n}/cassette` });
    for (const sx of [-1, 1])
      addBox(g, MAT.metalBlack, [IN(0.75), caseH * 0.9, caseD * 0.9], [sx * (w / 2 - IN(0.4)), h - caseH / 2, d / 2 - caseD / 2], {
        name: `${n}/end-cap`,
        cast: false,
      });
    const dropH = h - caseH - IN(1.5);
    addBox(g, fabric, [w - IN(1.5), dropH, IN(0.1)], [0, IN(1.5) + dropH / 2, d / 2 - IN(0.4)], {
      name: `${n}/fabric`,
      cast: false,
    });
    addBox(g, MAT.metalBlack, [w - IN(1.5), IN(1.5), IN(0.9)], [0, IN(0.75), d / 2 - IN(0.4)], {
      name: `${n}/weight-bar`,
    });
    return;
  }

  // Fixed frame: a velvet bezel with a tensioned panel inside it. The bezel face
  // width comes from the def when it can (frame minus image), else 2 3/8" which
  // is the industry standard thin bezel.
  const bez = IN(2.375);
  addBox(g, bezel, [w, h, Math.max(IN(1.4), d)], [0, h / 2, 0], { name: `${n}/frame` });
  addBox(g, fabric, [Math.max(IN(6), w - bez * 2), Math.max(IN(6), h - bez * 2), IN(0.2)], [0, h / 2, d / 2 - IN(0.1)], {
    name: `${n}/fabric`,
    cast: false,
  });
}

/**
 * SPEAKER — soundbar, bookshelf pair or floor-stander, told apart by proportion
 * rather than by a tag: anything more than three times as wide as it is tall is
 * a bar, anything over 2'-6" tall is a floor-stander with a plinth.
 */
function buildSpeaker(ctx: Ctx): void {
  const { g, w, d, h, n } = ctx;
  const cabinet = matFor(ctx.color, { roughness: 0.55, metalness: 0.04 });
  const grille = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.92 }) : MAT.speakerGrille;
  const bar = w > h * 3;
  const plinth = !bar && h > IN(30) ? IN(1) : 0;

  if (plinth) addBox(g, MAT.metalBlack, [w + IN(1), plinth, d + IN(1)], [0, plinth / 2, 0], { name: `${n}/plinth` });
  const bodyH = h - plinth;
  addBox(g, cabinet, [w, bodyH, d], [0, plinth + bodyH / 2, 0], { name: `${n}/cabinet` });
  // Grille cloth over the whole front face, inset 3/8" so the cabinet edge reads.
  addBox(g, grille, [w - IN(0.75), bodyH - IN(0.75), IN(0.5)], [0, plinth + bodyH / 2, d / 2 - IN(0.2)], {
    name: `${n}/grille`,
    cast: false,
  });
  if (!bar) {
    // Two driver rings so a bookshelf box does not read as a plain block.
    const dia = Math.min(w * 0.62, bodyH * 0.34);
    addBar(g, MAT.metalBlack, dia, IN(0.4), [0, plinth + bodyH * 0.3, d / 2 - IN(0.1)], true, { name: `${n}/woofer`, cast: false });
    addBar(g, MAT.metalBlack, dia * 0.42, IN(0.4), [0, plinth + bodyH * 0.72, d / 2 - IN(0.1)], true, { name: `${n}/tweeter`, cast: false });
  }
}

/**
 * SHADE — a blind in a glazing reveal. The def box is the whole reveal: `h` is
 * the head height above the floor and the fabric hangs from it. `item.size.h`
 * is therefore how far DOWN the blind is drawn, which is how a layout shows the
 * room blacked out for a film without needing a second catalog entry.
 *
 * Modelled as a cassette plus a face — cellular shades have a visible cell
 * structure, so the fabric gets horizontal ribs at 1 1/2" (the real cell pitch
 * of a single-cell honeycomb) whenever the drop is long enough to see them.
 */
function buildShade(ctx: Ctx): void {
  const { g, w, d, h, n } = ctx;
  const cassetteH = IN(2.5);
  const fabric = ctx.def.color ? matFor(ctx.color, { roughness: 0.96 }) : MAT.shadeFabric;
  const cell = hasTag(ctx.def, /cellular|honeycomb/);

  addBox(g, MAT.metalBlack, [w, cassetteH, d], [0, h - cassetteH / 2, 0], { name: `${n}/cassette` });
  const dropH = h - cassetteH;
  if (dropH <= IN(1)) return;
  addBox(g, fabric, [w - IN(0.5), dropH, Math.min(d * 0.6, IN(1.25))], [0, dropH / 2, 0], {
    name: `${n}/blind`,
    cast: false,
  });
  if (cell && dropH > IN(12)) {
    const ribs = Math.min(48, Math.floor(dropH / IN(1.5)));
    for (let i = 1; i < ribs; i++) {
      addBox(g, fabric, [w - IN(0.5), IN(0.12), IN(1.5)], [0, (dropH / ribs) * i, Math.min(d * 0.6, IN(1.25)) / 2], {
        name: `${n}/blind-cell-${i}`,
        cast: false,
        recv: false,
      });
    }
  }
  // Side channels: what makes a blackout blind actually black out, and a real
  // line of hardware in the reveal.
  for (const sx of [-1, 1])
    addBox(g, MAT.metalBlack, [IN(0.75), dropH, IN(1.75)], [sx * (w / 2 - IN(0.375)), dropH / 2, 0], {
      name: `${n}/channel`,
      cast: false,
    });
}

/**
 * PLANT — a trunk and real leaves, not a green ball.
 *
 * WHY this was rewritten. The previous version stacked two ellipsoids and a cone
 * and called it foliage. In a path-traced frame that is unmistakably a sphere:
 * it has no silhouette, no gaps for light to come through and no scale, and it
 * was the single most obviously fake object in the hero renders — a 6'-0" fig
 * standing 5 ft from the lens read as a green boulder.
 *
 * A plant's whole visual identity is its SILHOUETTE and the light coming
 * THROUGH it. So this builds a tapered trunk, a few stems, and individual leaf
 * blades as thin boxes on a spiral phyllotaxis. The blades are two-sided-thin
 * and the foliage material carries subsurface in Cycles, so backlit leaves glow
 * the way real ones do against the west glazing.
 *
 * Costs about 30-60 extra meshes per plant. At two or three plants in a layout
 * that is nothing next to what it buys.
 */
function buildPlant(ctx: Ctx): void {
  const { g, w, d, h, n } = ctx;
  const dia = Math.min(w, d);
  const potH = Math.min(h * 0.32, IN(14));
  // def.color is the foliage, def.accent the pot
  const leaf = ctx.def.color ? matFor(ctx.color, { roughness: 0.9, flatShading: true }) : MAT.foliage;
  const leaf2 = ctx.def.color
    ? matFor(ctx.color, { roughness: 0.95, flatShading: true, metalness: 0.02 })
    : MAT.foliageLight;
  const pot = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.8 }) : MAT.pot;
  const stemMat = matFor('#4a5c3a', { roughness: 0.7 });

  // tapered pot: wide at the rim, narrower at the base
  addCyl(g, pot, { dBottom: dia * 0.68, dTop: dia * 0.95, h: potH, seg: 16 }, [0, potH / 2, 0], { name: `${n}/pot` });
  addCyl(g, matFor('#3b2f26', { roughness: 1 }), { dBottom: dia * 0.9, h: IN(1) }, [0, potH - IN(0.5), 0], {
    name: `${n}/soil`,
    cast: false,
  });

  const canopyH = h - potH;
  if (canopyH <= IN(4)) return;

  // A tabletop plant is a rosette: no trunk, leaves straight out of the pot.
  const rosette = canopyH < IN(14);

  // Blade size scales with the plant: a fiddle-leaf fig's leaves are 10-13"
  // long, a small pothos 3-4". Clamped so a 6 ft tree does not grow 3 ft leaves.
  const blade = Math.max(IN(2.2), Math.min(IN(12), canopyH * 0.2));
  const bladeW = blade * 0.6;

  let trunkTop = potH;
  if (!rosette) {
    // Trunk: slightly tapered, leaning a couple of degrees off vertical, because
    // nothing that grew is plumb.
    const trunkH = canopyH * 0.62;
    trunkTop = potH + trunkH;
    addCyl(g, stemMat, { dBottom: dia * 0.11, dTop: dia * 0.07, h: trunkH, seg: 8 }, [0, potH + trunkH / 2, 0], {
      name: `${n}/trunk`,
      rotZ: 0.035,
    });
  }

  // Leaves on a spiral: the golden angle (137.5 deg) is what real phyllotaxis
  // uses and it is also the arrangement that avoids the leaves lining up into
  // obvious rows, which is what would give the trick away.
  const GOLDEN = 2.39996; // radians
  // Leaf COUNT is what separates a plant from a spider. A 40" houseplant carries
  // 20-30 visible leaves and a 6 ft fig 40-60; the first attempt at this used 12
  // and the render showed a dozen green crosses on sticks.
  const count = rosette ? 14 : Math.max(18, Math.min(58, Math.round(canopyH / IN(1.35))));
  const zone0 = rosette ? potH : trunkTop - canopyH * 0.34;
  const zone1 = potH + canopyH - blade * 0.3;

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = i * GOLDEN;
    // Reach: widest in the middle of the canopy, tucked in at the crown, and
    // jittered so blades overlap into a mass instead of sitting on one shell.
    const jitter = 0.82 + 0.3 * Math.abs(Math.sin(i * 3.7));
    const reach =
      (dia / 2) * jitter * (rosette ? 0.34 + 0.46 * t : 0.3 + 0.5 * Math.sin(Math.PI * (0.22 + 0.72 * t)));
    const y = zone0 + (zone1 - zone0) * t;
    const px = Math.cos(a) * reach;
    const pz = Math.sin(a) * reach;
    // Droop: leaves near the crown stand up, lower ones hang. 0 = straight out
    // sideways, positive = drooping toward the floor.
    const droop = 0.55 - 0.8 * t + 0.18 * Math.sin(i * 2.3);
    // Petiole: the leaf stalk, from the trunk out to the blade.
    addBar(g, stemMat, IN(0.3), Math.max(IN(1), reach * 1.05), [px * 0.5, y - blade * 0.06, pz * 0.5], false, {
      name: `${n}/petiole-${i}`,
      rotY: -a,
      cast: false,
    });

    // Each blade gets its OWN local frame — a group yawed to point outward and
    // pitched to droop — so the leaf can be built in sane coordinates: +z runs
    // along the leaf, +x across it, +y is up out of the leaf's face.
    //
    // This matters more than it looks. Doing it with per-mesh Euler angles on a
    // squashed cylinder put the THIN axis horizontal, so every leaf rendered as
    // a vertical plate: 22 green slabs standing on end, which was worse than the
    // sphere it replaced. A nested frame makes the orientation unambiguous.
    const lf = new THREE.Group();
    lf.name = `${n}/leaf-${i}`;
    lf.position.set(px, y, pz);
    lf.rotation.set(-droop, -a, 0, 'YXZ');
    g.add(lf);

    const blMat = i % 3 === 0 ? leaf2 : leaf;
    const T = IN(0.1); // leaf thickness — real, and it catches an edge highlight
    // Three widths along the length give a real leaf OUTLINE (narrow at the
    // stalk, broadest past the middle, rounded at the tip) instead of a kite.
    const segs: [number, number, number][] = [
      [bladeW * 0.42, blade * 0.30, blade * 0.16],
      [bladeW * 1.0, blade * 0.42, blade * 0.5],
      [bladeW * 0.66, blade * 0.3, blade * 0.85],
    ];
    segs.forEach(([sw, sd, sz], j) => {
      addBox(lf, blMat, [sw, T, sd], [0, 0, sz], { name: `${n}/leaf-${i}-${j}`, recv: false });
    });
    // Midrib: a thin spine down the centre — the line that catches the window on
    // a big glossy leaf. Only on blades big enough to show one: on a 3" leaf it
    // is wider than the blade's taper and the leaf renders as a plus sign.
    if (blade > IN(6)) {
      addBox(lf, stemMat, [T * 1.2, T * 1.4, blade * 0.9], [0, T * 0.6, blade * 0.5], {
        name: `${n}/midrib-${i}`,
        cast: false,
        recv: false,
      });
    }
  }
}

/**
 * Lamps. The shade uses the EMISSIVE material so the lamp reads as switched on
 * in a still render; build.ts also drops a cheap point light inside it.
 */
function buildLamp(ctx: Ctx, floor: boolean): void {
  const { g, w, d, h, n } = ctx;
  const dia = Math.min(w, d);
  const shadeH = floor ? Math.min(h * 0.2, IN(11)) : Math.max(h * 0.36, IN(7));
  const baseH = floor ? IN(1) : IN(1.5);
  const baseDia = floor ? dia * 0.75 : dia * 0.55;
  addCyl(g, MAT.metalBlack, { dBottom: baseDia, dTop: baseDia * 0.9, h: baseH, seg: 16 }, [0, baseH / 2, 0], { name: `${n}/base` });
  const poleH = h - shadeH - baseH;
  addCyl(g, MAT.chrome, { dBottom: IN(0.75), h: Math.max(IN(1), poleH) }, [0, baseH + poleH / 2, 0], { name: `${n}/pole` });
  // Truncated cone shade. Always emissive (that is what makes a lamp read as
  // ON); def.accent just tints it.
  // The EMISSIVE stays warm white whatever the shade color is: a black drum
  // shade still has to glow at its mouth, or the lamp reads as switched off.
  const shade = ctx.hasAccent
    ? matFor(ctx.accentColor, { roughness: 0.9, emissive: '#ffd79a', emissiveIntensity: 0.85 })
    : MAT.lampShade;
  addCyl(g, shade, { dBottom: dia, dTop: dia * 0.7, h: shadeH, seg: 20 }, [0, h - shadeH / 2, 0], {
    name: `${n}/shade`,
    cast: false,
  });
}

/** Mirror or framed art: a thin panel meant to hang on a wall (build.ts lifts it to item.z). */
function buildWallPanel(ctx: Ctx, mirror: boolean): void {
  const { g, w, h, n } = ctx;
  const frameT = IN(1.25); // total thickness front-to-back
  const frameW = IN(2); // face width of the frame
  addBox(g, ctx.frame, [w, h, frameT], [0, h / 2, 0], { name: `${n}/frame` });
  addBox(g, mirror ? MAT.mirror : ctx.accent, [w - frameW * 2, h - frameW * 2, IN(0.25)], [0, h / 2, frameT / 2 - IN(0.1)], {
    name: mirror ? `${n}/glass` : `${n}/print`,
    cast: false,
  });
}
