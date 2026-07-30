/**
 * Shared materials for the 3D renderer.
 *
 * WHY a module-level registry: the headless renderer runs on WebGL2 through
 * swiftshader (software rasteriser). Every unique material is a unique shader
 * program compile, and program compiles are by far the most expensive thing
 * swiftshader does on scene build. So:
 *   - every surface that reads the same in the render shares ONE material
 *   - `matFor()` memoises per (color + options) so 40 sofas in 3 colors cost
 *     3 materials, not 40
 *   - everything here is MeshStandardMaterial (one shader family, no
 *     transmission / physical extras, no post-processing)
 *
 * Materials created here are flagged `userData.shared = true` so
 * `disposeScene()` can walk a scene graph and free the per-build geometry
 * without destroying materials the next build is going to reuse. Real teardown
 * (end of a headless run, component unmount for good) calls
 * `disposeMaterials()`.
 */

import * as THREE from 'three';

export interface MatOpts {
  /** 0 = mirror smooth, 1 = fully diffuse. Default 0.75 (a typical matte paint/fabric). */
  roughness?: number;
  /** 0 for dielectrics (wood, fabric, paint), ~0.9 for bare metal. Default 0.04. */
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
  /** low-poly faceted look (plants, sculptural bits) */
  flatShading?: boolean;
  /** transparent surfaces that should not fight the depth sort (glass) */
  depthWrite?: boolean;
  name?: string;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

function keyOf(color: string, o: MatOpts): string {
  // `name` is cosmetic and deliberately not part of the identity, so two call
  // sites asking for the same physical surface still share one shader.
  return [
    color.toLowerCase(),
    o.roughness ?? '',
    o.metalness ?? '',
    o.opacity ?? '',
    o.transparent ?? '',
    o.emissive ?? '',
    o.emissiveIntensity ?? '',
    o.side ?? '',
    o.flatShading ?? '',
    o.depthWrite ?? '',
  ].join('|');
}

/**
 * Memoised MeshStandardMaterial factory. Returns the SAME instance for the
 * same color+options, so callers must never mutate the result.
 */
export function matFor(colorHex: string, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = keyOf(colorHex, opts);
  const hit = cache.get(key);
  if (hit) return hit;

  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.04,
    side: opts.side ?? THREE.FrontSide,
    flatShading: opts.flatShading ?? false,
  });
  if (opts.opacity !== undefined && opts.opacity < 1) {
    m.transparent = true;
    m.opacity = opts.opacity;
  }
  if (opts.transparent !== undefined) m.transparent = opts.transparent;
  if (opts.depthWrite !== undefined) m.depthWrite = opts.depthWrite;
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  m.name = opts.name ?? `mat:${colorHex}`;
  m.userData.shared = true;
  cache.set(key, m);
  return m;
}

/**
 * The building's fixed surfaces. Colors are picked to read correctly under
 * ACESFilmic tone mapping at exposure 1 (which desaturates + darkens midtones,
 * so the source albedos are a little brighter than the intended final look).
 */
export const MAT = {
  /** Warm white-oak strip floor. Real oak albedo is ~#c8a878; roughness high (matte poly). */
  floor: matFor('#c9a677', { roughness: 0.62, metalness: 0.0, name: 'floor-oak' }),
  /** Ground plane outside the footprint so renders do not float in the void. */
  ground: matFor('#d9d4c9', { roughness: 0.95, name: 'ground' }),
  /** Off-white flat wall paint (Benjamin Moore "White Dove"-ish). */
  wall: matFor('#f0ece3', { roughness: 0.92, name: 'wall-paint' }),
  /** Top face of a cut-down wall (opts.wallCutHeight) — reads as a section cut. */
  wallTop: matFor('#b9b2a4', { roughness: 0.95, name: 'wall-cut' }),
  /** Exterior face of the exterior walls, a shade cooler/darker than inside. */
  wallOuter: matFor('#ddd7cb', { roughness: 0.95, name: 'wall-outer' }),
  ceiling: matFor('#f6f4ef', { roughness: 0.95, name: 'ceiling' }),
  /** Semi-gloss painted trim: casings, baseboard, door leaves. */
  trim: matFor('#fbfaf6', { roughness: 0.42, metalness: 0.0, name: 'trim' }),
  baseboard: matFor('#f7f5f0', { roughness: 0.45, name: 'baseboard' }),
  /** Window glazing. depthWrite off so a single pane never sorts badly against trim. */
  glass: matFor('#cfe3ea', {
    roughness: 0.05,
    metalness: 0.0,
    opacity: 0.22,
    depthWrite: false,
    name: 'glass',
  }),
  /** Pale quartz/stone counters (kitchen + vanity tops). */
  counter: matFor('#e6e3d8', { roughness: 0.35, metalness: 0.02, name: 'counter-stone' }),
  /** Painted shaker cabinet fronts + closet doors. */
  cabinet: matFor('#eeeae1', { roughness: 0.5, name: 'cabinet' }),
  cabinetDark: matFor('#cfc8ba', { roughness: 0.55, name: 'cabinet-shadow' }),
  /**
   * Brushed stainless: fridge, range, dishwasher, washer/dryer.
   *
   * METALNESS IS DELIBERATELY LOW (0.55, not the physically correct ~0.9).
   * A metal surface is lit almost entirely by its reflection of the
   * environment; Viewer3D supplies only a tiny procedural env map, and if that
   * fails (older WebGL2 / no half-float render target under swiftshader) a
   * fully metallic material renders BLACK. 0.55 keeps steel reading as steel
   * either way, and it still picks up the env map when there is one.
   */
  appliance: matFor('#c5c9cc', { roughness: 0.34, metalness: 0.55, name: 'steel-brushed' }),
  applianceDark: matFor('#8b9196', { roughness: 0.3, metalness: 0.5, name: 'steel-dark' }),
  /** Polished chrome: pulls, faucets, shower head, lamp poles. */
  chrome: matFor('#e3e7ea', { roughness: 0.14, metalness: 0.75, name: 'chrome' }),
  /** Bath / kitchen-splash tile — cool light grey, low roughness (glazed). */
  tile: matFor('#dde4e6', { roughness: 0.18, metalness: 0.02, name: 'tile' }),
  /** Sanitary porcelain: tub, toilet, basins. */
  porcelain: matFor('#fafafa', { roughness: 0.12, metalness: 0.0, name: 'porcelain' }),
  /** Structural wood: table tops, bed frames, shelf carcasses. */
  wood: matFor('#a9793f', { roughness: 0.6, name: 'wood-oak' }),
  woodDark: matFor('#6a4a2c', { roughness: 0.62, name: 'wood-walnut' }),
  /** Default upholstery. */
  fabric: matFor('#8e897b', { roughness: 0.95, name: 'fabric' }),
  /** Mattress / duvet / pillows. */
  linen: matFor('#efece5', { roughness: 0.97, name: 'linen' }),
  /** Matte black metal legs, TV bezels, rails. */
  metalBlack: matFor('#2a2b2e', { roughness: 0.45, metalness: 0.6, name: 'metal-black' }),
  /** TV / monitor panel: near-black, slightly glossy so it catches the window. */
  screen: matFor('#14161a', { roughness: 0.16, metalness: 0.1, name: 'screen' }),
  /** Mirror glass — a cheap fake: bright, smooth, mostly-metal (see `appliance`). */
  mirror: matFor('#dfe6ea', { roughness: 0.06, metalness: 0.8, name: 'mirror' }),
  /**
   * Lamp shades. Emissive so lamps read as ON in a still render even though the
   * point light inside them contributes almost nothing at this exposure.
   */
  lampShade: matFor('#fff4de', {
    roughness: 0.9,
    emissive: '#ffd79a',
    emissiveIntensity: 1.35,
    name: 'lamp-shade',
  }),
  /** Terracotta pot. */
  pot: matFor('#b5714f', { roughness: 0.8, name: 'pot-terracotta' }),
  /** Foliage, faceted on purpose so low-poly spheres read as leaf masses. */
  foliage: matFor('#4e7a4a', { roughness: 0.9, flatShading: true, name: 'foliage' }),
  foliageLight: matFor('#628f56', { roughness: 0.9, flatShading: true, name: 'foliage-light' }),
  /** Rug pile. */
  rug: matFor('#a3a08f', { roughness: 1.0, name: 'rug' }),
  /** Sheer curtain panel — thin, bright, slightly translucent. */
  curtain: matFor('#f2eee4', { roughness: 0.95, opacity: 0.9, name: 'curtain' }),
} satisfies Record<string, THREE.MeshStandardMaterial>;

export type MatKey = keyof typeof MAT;

/**
 * Free every material this module has handed out and clear the memo table.
 * Only for real teardown — any live scene using MAT/matFor results becomes
 * unrenderable. Subsequent matFor() calls rebuild lazily, but the MAT record
 * holds disposed instances, so treat this as end-of-process.
 */
export function disposeMaterials(): void {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}

/** How many distinct materials are alive (used by tests / perf logging). */
export function materialCount(): number {
  return cache.size;
}
