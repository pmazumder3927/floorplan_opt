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
  const armW = Math.min(IN(7), w * 0.13);
  const backT = Math.min(IN(8), d * 0.22);
  const cushT = IN(5);
  const plinthTop = Math.max(IN(3), seat - cushT);
  const armTop = Math.min(h - IN(2), seat + IN(7));

  // Depth of the main run. A sectional's def box is the whole L, so the
  // straight run only gets part of it; a plain sofa uses the full depth.
  const mainD = sectional ? Math.min(d, IN(38)) : d;
  const zBack = -d / 2;
  const zMainFront = zBack + mainD;

  // plinth: the upholstered base under the cushions
  addBox(g, body, [w, plinthTop, mainD], [0, plinthTop / 2, zBack + mainD / 2], { name: `${n}/plinth` });

  // back: full height at the rear
  addBox(g, body, [w, h, backT], [0, h / 2, zBack + backT / 2], { name: `${n}/back` });

  // arms: left always; right only when there is no L return on that side
  const armLen = mainD;
  addBox(g, body, [armW, armTop, armLen], [-w / 2 + armW / 2, armTop / 2, zBack + armLen / 2], { name: `${n}/arm-l` });
  if (!sectional) {
    addBox(g, body, [armW, armTop, armLen], [w / 2 - armW / 2, armTop / 2, zBack + armLen / 2], { name: `${n}/arm-r` });
  }

  // seat cushions: divide the clear width into ~22-26" seats
  const clearW = w - armW * (sectional ? 1 : 2);
  const seatDepth = mainD - backT - IN(1);
  const seats = Math.max(1, Math.round(clearW / IN(24)));
  const cw = (clearW - IN(0.5) * (seats - 1)) / seats;
  const x0 = -w / 2 + armW; // left edge of the clear span
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
    // L return (chaise) on the RIGHT (+x) side, filling the rest of the def box.
    const retW = Math.min(w * 0.42, IN(36));
    const retZ0 = zMainFront;
    const retD = d / 2 - retZ0;
    if (retD <= IN(6)) {
      // def box was too shallow for a return; fall back to a plain right arm
      addBox(g, body, [armW, armTop, armLen], [w / 2 - armW / 2, armTop / 2, zBack + armLen / 2], { name: `${n}/arm-r` });
    } else {
      const rx = w / 2 - retW / 2;
      addBox(g, body, [retW, plinthTop, retD], [rx, plinthTop / 2, retZ0 + retD / 2], { name: `${n}/return-plinth` });
      addBox(g, accent, [retW - armW, cushT, retD - IN(1)], [rx - armW / 2, plinthTop + cushT / 2, retZ0 + retD / 2], {
        name: `${n}/return-seat`,
      });
      // outer arm runs the full length of the L on the +x side
      addBox(g, body, [armW, armTop, d], [w / 2 - armW / 2, armTop / 2, 0], { name: `${n}/arm-r` });
    }
  }

  // feet: 2" blocks, inset 3", so the piece reads as lifted off the floor
  const legS = IN(2);
  const inset = IN(3);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(g, MAT.woodDark, [legS, IN(2.5), legS], [sx * (w / 2 - inset), IN(1.25), sz * (d / 2 - inset)], {
        name: `${n}/foot`,
        recv: false,
      });
    }
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

  if (style === 'drawers') {
    // ~10" drawer faces; a 30" dresser gets 3, a 24" nightstand gets 2
    const rows = Math.max(1, Math.min(6, Math.round((h - toeH) / IN(10))));
    const cols = w > IN(44) ? 2 : 1; // wide dressers are double-banked
    addPanels(g, { x0: -w / 2, x1: w / 2, y0: carcassY0, y1: h, zFace, rows, cols, face, pull, pullStyle: 'bar-h', name: n });
  } else if (style === 'doors') {
    const cols = Math.max(1, Math.round(w / IN(26))); // ~26" leaves
    addPanels(g, { x0: -w / 2, x1: w / 2, y0: carcassY0, y1: h, zFace, rows: 1, cols, face, pull, pullStyle: 'bar-v', name: n });
  } else {
    // media console: doors on the outer thirds, open shelf in the middle
    const bay = w / 3;
    addPanels(g, { x0: -w / 2, x1: -w / 2 + bay, y0: carcassY0, y1: h - IN(1), zFace, rows: 1, cols: 1, face, pull, pullStyle: 'bar-v', name: `${n}-l` });
    addPanels(g, { x0: w / 2 - bay, x1: w / 2, y0: carcassY0, y1: h - IN(1), zFace, rows: 1, cols: 1, face, pull, pullStyle: 'bar-v', name: `${n}-r` });
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

function buildPlant(ctx: Ctx): void {
  const { g, w, d, h, n } = ctx;
  const dia = Math.min(w, d);
  const potH = Math.min(h * 0.32, IN(14));
  // def.color is the foliage, def.accent the pot
  const leaf = ctx.def.color ? matFor(ctx.color, { roughness: 0.9, flatShading: true }) : MAT.foliage;
  const leaf2 = ctx.def.color ? matFor(ctx.color, { roughness: 0.95, flatShading: true, metalness: 0.02 }) : MAT.foliageLight;
  const pot = ctx.hasAccent ? matFor(ctx.accentColor, { roughness: 0.8 }) : MAT.pot;
  // tapered pot: wide at the rim, narrower at the base
  addCyl(g, pot, { dBottom: dia * 0.68, dTop: dia * 0.95, h: potH, seg: 16 }, [0, potH / 2, 0], { name: `${n}/pot` });
  addCyl(g, matFor('#3b2f26', { roughness: 1 }), { dBottom: dia * 0.9, h: IN(1) }, [0, potH - IN(0.5), 0], { name: `${n}/soil`, cast: false });

  // 2-3 foliage masses of varying scale; a cone on top reads as a leader
  const canopyH = h - potH;
  addSphere(g, leaf, [dia * 1.0, canopyH * 0.55, dia * 0.95], [0, potH + canopyH * 0.3, 0], { name: `${n}/foliage-0` });
  addSphere(g, leaf2, [dia * 0.7, canopyH * 0.42, dia * 0.7], [dia * 0.16, potH + canopyH * 0.62, -dia * 0.1], {
    name: `${n}/foliage-1`,
  });
  if (canopyH > IN(20)) {
    addCyl(g, leaf, { dTop: 0, dBottom: dia * 0.62, h: canopyH * 0.4, seg: 10 }, [-dia * 0.1, potH + canopyH * 0.78, dia * 0.08], {
      name: `${n}/foliage-2`,
    });
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
