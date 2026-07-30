/**
 * Shared materials for the 3D renderer.
 *
 * THE PALETTE IS TARGETED AT ONE REAL ROOM. Every fixed-surface colour and
 * sheen here is set against data/reference/unit-photo-living-west.jpeg — dark
 * walnut satin floor, exposed concrete soffit, flat white walls, full-height
 * black-anodised glazing, charcoal uppers over pale bases. See `PALETTE` below
 * for the per-surface evidence. Do not "clean up" a value without re-checking
 * it against that frame.
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
 * ---------------------------------------------------------------------------
 * PALETTE — every fixed-surface albedo, with the photographic evidence for it.
 * ---------------------------------------------------------------------------
 *
 * SOURCE OF TRUTH: data/reference/unit-photo-living-west.jpeg — the real unit,
 * looking west across the living area to the glazing, kitchen run on the left.
 * Every hex below was chosen against a pixel sample from that frame (median of
 * a patch, quoted in the note), then adjusted for two things:
 *
 *   1. The photo is a bright hazy-daylight exposure. Sampled pixels are
 *      RADIANCE (albedo x incoming light), not albedo, so lit surfaces sample
 *      much brighter than their material colour. Where a surface is only lit
 *      by bounce (cabinet fronts, the concrete soffit) the sample is close to
 *      albedo; where it is blasted by the window (the floor) it is not.
 *   2. The renderer uses ACESFilmic tone mapping at exposure 1, which
 *      desaturates and darkens midtones. Source albedos are therefore set a
 *      little brighter/warmer than the number we want out the far end.
 *
 * Keep this table and the MAT entries below in sync — MAT reads from here so
 * there is exactly one place to audit a colour.
 */
export const PALETTE = {
  /**
   * #6d5847 — dark walnut plank. Photo floor diffuse (unreflected 15th pct,
   * y>480) samples #6b5a4c under full window bounce; the plank's own colour is a
   * warm dark brown, NOT the pale oak we had.
   *
   * MIRRORED from #6a4632 to match `floor-walnut` in scripts/blender/materials.py,
   * which was lifted and desaturated in the same fidelity pass that lifted
   * `concrete`, `frameDark` and `cabinetUpper` here — this one was simply missed.
   * The Cycles reason (quoted from that file): "#664c3a was still reading a little
   * dark and a little red". Note that the stated MOTIVE for the lift over there —
   * throwing a warmer bounce onto the walls — was measured and REFUTED; see the
   * `wall-paint` note. It is kept on both sides because the colour is
   * independently right, not because it did what it was supposed to.
   *
   * This value only drives the WebGL preview: `floor-walnut` is not a
   * keep_glb_color surface, so the path tracer overrides the glb's base colour
   * with its own recipe.
   */
  floor: '#6d5847',
  /** #a8a5a0 — hazy mid-rise rooftops in the middle distance, seen over the sill line. Not grass: this is a high floor. */
  ground: '#a8a5a0',
  /** #f3f1ed — flat smooth white, barely warm. Photo wall planes read neutral-to-cool where lit and #85887f in shade; there is no cream/beige cast. */
  wall: '#f3f1ed',
  /** #b4b6b5 — cut-cap on a sectioned wall. Reads as the concrete/blockwork core, so it follows the soffit grey rather than the paint. */
  wallCut: '#b4b6b5',
  /** #b9bcbc — exterior face of the envelope: same cool concrete family as the soffit, a step darker so the outside of the box separates from the inside. */
  wallOuter: '#b9bcbc',
  /**
   * #b1bfc6 — EXPOSED CONCRETE soffit. Photo ceiling samples #7c8787 (deep, near
   * the kitchen) to #abb8c0 (bright, near the glass), a 550x90 px band meaning
   * rgb(136,153,158): mid-grey, distinctly cool (b > r by ~22, not the ~8 this
   * note used to claim).
   *
   * RAISED from #9ba1a3, and the reason is measured on the Cycles side, where the
   * same surface is `concrete-soffit` in scripts/blender/materials.py: at #96a3a9
   * (the equivalent value there) the soffit band rendered at rgb(105,118,128) —
   * 0.4 stop under the photo — so 30% of every hero frame read as a grey lid.
   * Both files were lifted together to keep the preview and the path-traced frame
   * describing the same slab.
   *
   * #b1bfc6 is a 0.44/0.52/0.57 LINEAR reflectance, which is at the top of the
   * band for a pale smooth-formed slab (light concrete is 0.40-0.50) and is
   * deliberately not pushed further: see the long note on `concrete-soffit` in the
   * Cycles table for the calibration showing that the residual shortfall against
   * the photo is a LIGHTING deficit, not an albedo one.
   */
  concrete: '#b1bfc6',
  /** #f6f5f2 — door leaves and the few casings there are. Photo shows almost no applied trim, so trim is basically wall colour, only flatter-sheened than paint. */
  trim: '#f6f5f2',
  /**
   * #f1efeb — baseboard. Photo shows minimal-to-none: deliberately within a hair
   * of `wall` so it disappears the way it does in the frame.
   *
   * NOT CURRENTLY DRAWN. build.ts stopped emitting base trim (the reference unit
   * has none — see the SHADOW GAP block in build.ts) and the wall/floor junction
   * is now `shadowGap` below. Kept because the value is still right for a plan
   * variant that does have base trim, but nothing reaches it today.
   */
  baseboard: '#f1efeb',
  /**
   * #8f8d88 — the WALL/FLOOR JUNCTION, and it is a SHADOW GAP, not a moulding.
   *
   * The photo has no base trim anywhere: the wall butts the plank floor and all
   * that marks the line is one dark row. MEASURED twice, independently, on a
   * 30 px column down the base of the 16" pier between the glazing bays:
   * the wall grades 106 -> 89 over ~36 px, drops to 66, bottoms at
   * rgb(40,35,35) for 2-3 px, comes back to 47 then 59, and runs on into the
   * floor's reflection of the pier. So the target is a SOFT dark line bottoming
   * near 40, not a black one.
   *
   * WHY THIS MATERIAL EXISTS AT ALL. The previous pass drew this band in
   * `metalBlack` on the argument that it was "the darkest surface this file can
   * reach without adding a material to materials.ts (which this file does not
   * own)". That constraint was real for that pass but the result overshot badly:
   * the junction rendered at rgb(1.3,1.0,0.9) — one row of pure black, ~30x
   * darker than the photo's 40 — which reads as a crack, not a shadow. So the
   * material got added here instead.
   *
   * The value is CALIBRATED, not guessed: at #8f8d88 the junction lands at
   * rgb(42,36,32) against the photo's rgb(40,35,35). It is deliberately much
   * LIGHTER than it looks like it should be, because the band sits in a corner
   * that is already heavily occluded — most of the darkness is the contact
   * shadow doing its job, and the material only has to not fight it. Slightly
   * warm-neutral (r > b) to match the measured junction, which is picking up
   * bounce off the walnut.
   */
  shadowGap: '#8f8d88',
  /** #dcebe8 — glazing. Faint green-blue: the adjacent curtain-wall tower on the right reads cyan-green through the panes and at grazing angles the sliders tint the view. */
  glass: '#dcebe8',
  /**
   * #4a4f53 — BLACK ANODISED ALUMINIUM mullions, slider frames, bottom rail.
   *
   * RAISED from #1e2124, which was an order of magnitude too dark once you read
   * the photo properly. The sections are not near-black: a shadowed mullion
   * samples #253d46 (rgb 37,62,71 — note b-r = +34, that blue is the SKY the
   * section is carrying) and where the same section catches sky it goes to
   * #6693b1. The sill track draws a bright line along its top edge (#606c72 mean,
   * std 49.6 along the run). "Near-black with a soft sheen" describes none of
   * that.
   *
   * The number itself is a FINISH fact: Class 1 architectural anodising in dark
   * bronze / black measures 8-12% total reflectance. #1e2124 is 1.3% linear —
   * a 1% mirror, which in the Cycles frame rendered the entire glazing assembly
   * at rgb(9,11,13) with no bright arris anywhere on it. #4a4f53 is 6.8%, the low
   * end of the band, because these sections are the BLACK finish rather than dark
   * bronze.
   */
  frameDark: '#4a4f53',
  /** #ebedec — pale stone counter with a thin edge profile. Photo counter samples warm (#b78761) ONLY because of warm under-cabinet LED wash; the stone itself is a light, faintly cool grey. */
  counter: '#ebedec',
  /**
   * #7f7871 — dark charcoal-brown slab-front UPPER cabinets. Photo uppers sample
   * #666f72..#675e58 lit purely by window bounce, i.e. a dark warm grey.
   *
   * RAISED TWO STOPS from #4b443e. Recovered by RATIO against an adjacent surface
   * under the same illuminant, which is the only sound way to get an albedo out of
   * a surface that is lit entirely by bounce: sampled pixels there are radiance,
   * not reflectance. #4b443e is 6% linear; a charcoal laminate slab is a 20-28%
   * finish and #7f7871 is 22%.
   *
   * UNCERTAINTY, stated: +/-15% in VALUE. The ratio read needs both surfaces to
   * share an illuminant and the uppers sit under their own shadow line while the
   * reference surface does not, so this is the weakest-evidence colour in this
   * table. The HUE (warm charcoal, r > b) is solid; the value is a bracket. What
   * is certain is that #4b443e sat well outside that bracket.
   */
  cabinetUpper: '#7f7871',
  /** #cfc9be — pale base cabinets. Photo base fronts sample #635e56 in the counter's shadow yet read clearly LIGHTER than the uppers; pale greige albedo. A ratio read against the splash wall directly above them (door #635d53 vs splash #be936e under the same warm under-cabinet LED, i.e. ~0.7x its reflectance) puts the albedo near #c6c0b6, which is this value within its ~+/-10% uncertainty — so it is left alone. */
  cabinetBase: '#cfc9be',
  /** #9c968d — shadow tone for cabinet interiors, shelves and toe-kicks. Not a real surface in the photo: it is `cabinetBase` darkened, standing in for occlusion we do not compute. */
  cabinetShadow: '#9c968d',
  /** #c7cbce — brushed stainless: range, dishwasher, fridge, laundry. Photo steel samples #4b4e51..#697b80 because steel shows its surroundings, not its albedo; #c7cbce is the standard stainless F0 tint. */
  steel: '#c7cbce',
  /** #949a9e — darker stainless for recessed/vertical steel (basin walls, appliance door panels) that sees less of the room. */
  steelDark: '#949a9e',
  /** #101214 — BLACK GLASS: the range's ceramic cooktop and the oven front. Photo oven door samples #14181a and the cooktop #2d201a; near-black, glossy. */
  cooktopGlass: '#101214',
  /** #e3e7ea — polished chrome: gooseneck faucet, bar pulls, shower head. Photo faucet is a bright specular line, so this is a reflectance tint not a sampled colour. */
  chrome: '#e3e7ea',
  /** #e7e6e2 — splash/wall tile. Retuned off the photo's kitchen splash, which is the same pale stone as the counter (continuous, no contrasting tile), only glossier. */
  tile: '#e7e6e2',
} as const;

/**
 * Exposed structural concrete. ONE instance intentionally shared by `ceiling`
 * and `concrete`: the soffit in the photo IS the structure, so a separate
 * material would only cost swiftshader another shader compile for an identical
 * surface. (matFor would hand back the same instance anyway — its cache key
 * ignores `name` — so this makes the sharing explicit rather than accidental.)
 */
const CONCRETE = matFor(PALETTE.concrete, {
  roughness: 0.92,
  metalness: 0.0,
  name: 'concrete-soffit',
});

/**
 * Black anodised aluminium for the glazing assemblies. ONE instance shared by
 * `mullion` and `frameDark` — same reason as CONCRETE.
 *
 * metalness 0.5 is a deliberate middle: anodising is a converted oxide layer,
 * not bare polished metal, so it is genuinely half-diffuse — and see the note
 * on `appliance` for why nothing here goes fully metallic.
 */
const FRAME_DARK = matFor(PALETTE.frameDark, {
  roughness: 0.32,
  metalness: 0.5,
  name: 'anodised-black',
});

/** Pale base-cabinet fronts. Shared by `cabinetBase` and the legacy `cabinet` key. */
const CABINET_BASE = matFor(PALETTE.cabinetBase, { roughness: 0.5, metalness: 0.0, name: 'cabinet-base-pale' });

/**
 * The building's fixed surfaces, keyed to PALETTE above.
 *
 * Existing key names are all still here — four other modules index this record
 * by name, so keys are ADDED, never renamed or removed.
 */
export const MAT = {
  /**
   * DARK WIDE-PLANK WALNUT/ESPRESSO — the single most recognisable surface in
   * the reference photo.
   *
   * roughness 0.38 (SATIN, not matte): the photo shows the full-height glazing
   * mirrored in the floor as a coherent bright sheet — the brightest floor
   * percentiles sample #bec9d5..#cddde7, which is sky, not wood. A matte floor
   * (the old 0.62) cannot produce that and instantly reads as laminate.
   * metalness 0 — it is a dielectric; the sheen comes from roughness alone.
   */
  floor: matFor(PALETTE.floor, { roughness: 0.38, metalness: 0.0, name: 'floor-walnut' }),
  /** Ground plane outside the footprint so renders do not float in the void. */
  ground: matFor(PALETTE.ground, { roughness: 0.95, name: 'ground' }),
  /** Flat smooth white paint. roughness 0.95 — dead flat, no sheen anywhere in the photo. */
  wall: matFor(PALETTE.wall, { roughness: 0.95, metalness: 0.0, name: 'wall-paint' }),
  /** Top face of a cut-down wall (opts.wallCutHeight) — reads as a section cut. */
  wallTop: matFor(PALETTE.wallCut, { roughness: 0.95, metalness: 0.0, name: 'wall-cut' }),
  /** Exterior face of the exterior walls, a shade cooler/darker than inside. */
  wallOuter: matFor(PALETTE.wallOuter, { roughness: 0.95, metalness: 0.0, name: 'wall-outer' }),
  /** EXPOSED CONCRETE soffit (see CONCRETE). Was painted-drywall white; the photo is structure. */
  ceiling: CONCRETE,
  /** Same concrete, exposed under its own name for columns / structural walls / any other soffit-adjacent surface. */
  concrete: CONCRETE,
  /** Door leaves + the little casing that exists. Near wall colour, flat-ish. */
  trim: matFor(PALETTE.trim, { roughness: 0.6, metalness: 0.0, name: 'trim' }),
  /**
   * MINIMAL baseboard: the photo shows essentially none, so this sits within a
   * hair of `wall` at wall roughness.
   *
   * NOTHING REFERENCES IT ANY MORE. This note used to end "It stays a distinct
   * material only so build.ts can keep emitting the geometry" — build.ts stopped:
   * the reference unit has no base trim at all, so the wall/floor junction is now
   * `shadowGap` below. Kept, and kept accurate, because the value is still right
   * for a plan variant that does have base trim; but do not expect to see it in a
   * frame today.
   */
  baseboard: matFor(PALETTE.baseboard, { roughness: 0.9, metalness: 0.0, name: 'baseboard' }),
  /**
   * WALL/FLOOR SHADOW GAP (see PALETTE.shadowGap for the measurement). A flat
   * dielectric at wall roughness: it is a sliver of paint and plaster in shadow,
   * not metalwork, and it must have a full diffuse lobe or the contact shadow it
   * sits in drives it to zero — which is exactly what happened when this band was
   * drawn in `metalBlack` (metalness 0.6, so almost no diffuse response).
   */
  shadowGap: matFor(PALETTE.shadowGap, { roughness: 0.9, metalness: 0.0, name: 'shadow-gap' }),
  /**
   * FULL-HEIGHT GLAZING. Retuned for the real assembly: floor slab to soffit,
   * so glass is now a huge fraction of every interior frame rather than a
   * punched window, and any error in it is an error in the whole image.
   *
   * roughness 0.03 — architectural float glass is optically smooth.
   *
   * OPACITY 0.14, and it is that low on purpose:
   *   - The exterior view (rooftops + the adjacent curtain-wall tower) is the
   *     brightest thing in frame and must come through essentially unattenuated.
   *     At the old 0.22 a floor-to-ceiling wall of glass laid a visible grey
   *     film over the whole outlook, which reads as dirty acrylic.
   *   - Sliding assemblies OVERLAP at the meeting stile, so two panes stack
   *     there. Alpha compounds (1-a)^2, so a low per-pane value keeps the
   *     overlap from turning into an obvious dark band.
   *   - Cost of going this low, stated honestly: MeshStandardMaterial scales
   *     the specular lobe by alpha too, so the pane's own reflection is faint.
   *     The reflected-glazing cue we care about lives in the FLOOR (satin, see
   *     above), not in the glass, so this is the right trade here.
   * depthWrite stays off so a pane never sorts badly against frames behind it.
   */
  glass: matFor(PALETTE.glass, {
    roughness: 0.03,
    metalness: 0.0,
    opacity: 0.14,
    depthWrite: false,
    name: 'glass',
  }),
  /** Black anodised aluminium glazing frame: mullions, slider stiles, bottom rail, head. */
  mullion: FRAME_DARK,
  /** Alias of `mullion` for non-glazing uses of the same anodised black (door frames, rails). */
  frameDark: FRAME_DARK,
  /** Pale stone counter, thin edge profile. Cooler + lighter than the old warm quartz. */
  counter: matFor(PALETTE.counter, { roughness: 0.3, metalness: 0.02, name: 'counter-stone' }),
  /**
   * Generic cabinet face — ALIAS of `cabinetBase`, kept because build.ts and
   * furniture.ts already index `MAT.cabinet` for base runs, closet doors and
   * casework carcasses, all of which read pale in the photo. New code should
   * pick `cabinetUpper` or `cabinetBase` explicitly.
   */
  cabinet: CABINET_BASE,
  /** Dark charcoal-brown slab-front UPPER cabinets. roughness 0.45 — laminate slab, satin not gloss. */
  cabinetUpper: matFor(PALETTE.cabinetUpper, { roughness: 0.45, metalness: 0.0, name: 'cabinet-upper-dark' }),
  /** Pale base cabinets (see CABINET_BASE). */
  cabinetBase: CABINET_BASE,
  /**
   * Shadow tone for toe-kicks, shelf boards and cabinet interiors. Kept a
   * darkened version of `cabinetBase` (not charcoal) because existing callers
   * use it for BOTH toe-kicks and the insides of pale bookcases.
   */
  cabinetDark: matFor(PALETTE.cabinetShadow, { roughness: 0.55, metalness: 0.0, name: 'cabinet-shadow' }),
  /**
   * Brushed stainless: fridge, range, dishwasher, washer/dryer.
   *
   * metalness 0.78 — RAISED from 0.55. The old 0.55 was justified by there
   * being no real environment map, and that is no longer true: the render
   * entry supplies one, and a metal is lit almost entirely by what it
   * reflects, so at 0.55 the steel was reading as grey plastic.
   *
   * It stops at 0.78 rather than the physically correct ~0.95 on purpose: a
   * fully metallic material with no env map renders BLACK, and the fast WebGL
   * preview can still come up env-less (swiftshader failing a half-float
   * render target). 0.78 leaves enough diffuse response that an env-less
   * preview degrades to dull steel instead of a black hole.
   */
  appliance: matFor(PALETTE.steel, { roughness: 0.3, metalness: 0.78, name: 'steel-brushed' }),
  /** Recessed / vertical steel that sees less of the room: basin walls, appliance door panels. */
  applianceDark: matFor(PALETTE.steelDark, { roughness: 0.28, metalness: 0.7, name: 'steel-dark' }),
  /** Black glass: the range's ceramic cooktop and the oven front. Glossy, near-black, barely metallic. */
  cooktopGlass: matFor(PALETTE.cooktopGlass, {
    roughness: 0.08,
    metalness: 0.15,
    name: 'cooktop-black-glass',
  }),
  /** Polished chrome: gooseneck faucet, bar pulls, shower head, lamp poles. metalness raised with `appliance`, same env-map reasoning and the same floor. */
  chrome: matFor(PALETTE.chrome, { roughness: 0.12, metalness: 0.85, name: 'chrome' }),
  /** Splash / bath tile. Retuned to the photo's pale stone splash — continuous with the counter, not a contrasting cool tile. */
  tile: matFor(PALETTE.tile, { roughness: 0.22, metalness: 0.02, name: 'tile' }),
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
  /** Mirror glass — a cheap fake: bright, smooth, mostly-metal. Raised to 0.92 now that there is a real env map to reflect (same env-less floor logic as `appliance`). */
  mirror: matFor('#dfe6ea', { roughness: 0.05, metalness: 0.92, name: 'mirror' }),
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
  /**
   * Linen drapery. OPAQUE on purpose: buildCurtain fakes folds with overlapping
   * slats, and at opacity 0.9 every slat shows through its neighbour so the panel
   * reads as plastic sheeting rather than fabric. Real sheers do transmit light,
   * but the fold artefact costs far more realism than the transmission buys.
   */
  curtain: matFor('#efe9dc', { roughness: 0.97, name: 'curtain' }),

  // ---------------------------------------------------------------- projection
  //
  // A projector's picture is made of two surfaces and they are NOT the same
  // material, which is the single most common mistake in a rendered home
  // cinema: the FABRIC is what you see with the projector off, and the IMAGE is
  // what you see with it on. Modelling only the first gives you a grey rectangle
  // that reads as a blank wall panel; modelling only the second gives you a
  // glowing slab in a daylight frame, which is a lie about this room (see the
  // daylight finding in the layout notes).

  /**
   * MATTE WHITE screen fabric, gain ~1.0-1.1. roughness 0.94: a real screen is
   * near-Lambertian by design — that is the whole point of the material, so the
   * image looks the same from every seat. Slightly off pure white because
   * projector fabric is a warm-neutral vinyl, not paper.
   */
  screenFabric: matFor('#e6e5e1', { roughness: 0.94, metalness: 0.0, name: 'screen-fabric' }),
  /**
   * ALR / lenticular screen fabric — the grey, structured surface you pair with
   * an ultra-short-throw projector. It is DARK on purpose (that is what rejects
   * ambient light) and it is directional, which a MeshStandardMaterial cannot
   * do: roughness 0.5 is the closest single-lobe stand-in for a surface that
   * returns light up-and-out and swallows everything else.
   */
  screenFabricAlr: matFor('#8b8d90', { roughness: 0.5, metalness: 0.02, name: 'screen-fabric-alr' }),
  /**
   * THE PICTURE, switched on. Emissive, and deliberately cool-neutral: a
   * projected image is a 6000-6500K light source and it spills that colour onto
   * the ceiling and the faces of everyone watching. Intensity is set so the
   * screen reads as ON without clipping in an evening frame.
   */
  screenImage: matFor('#dfe8f5', {
    roughness: 0.9,
    emissive: '#bcd2f0',
    emissiveIntensity: 2.2,
    name: 'projection-image',
  }),
  /**
   * Black velvet bezel on a fixed-frame screen, and the cassette end caps on a
   * roller. roughness 0.99 with no coat: flocked velvet is the blackest thing in
   * the room, blacker than the anodised window frames, and it has to stay that
   * way or the frame reads as a plastic surround.
   */
  bezelVelvet: matFor('#0e0e0e', { roughness: 0.99, metalness: 0.0, name: 'bezel-velvet' }),
  /** Blackout roller / cellular shade fabric: dense, matte, warm charcoal. */
  shadeFabric: matFor('#3a3833', { roughness: 0.96, metalness: 0.0, name: 'shade-blackout' }),
  /** Speaker grille cloth, and the acoustically transparent front of a soundbar. */
  speakerGrille: matFor('#26262a', { roughness: 0.92, metalness: 0.0, name: 'speaker-grille' }),
  /**
   * Projector lens glass and the exit window on a UST. Near-black and glossy —
   * a lens reads as a dark hole with one bright specular highlight, which is
   * exactly what cooktopGlass already does, but named separately so the Cycles
   * table can give it a real IOR later without changing every cooktop.
   */
  lensGlass: matFor('#0c0e11', { roughness: 0.06, metalness: 0.1, name: 'lens-glass' }),
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
