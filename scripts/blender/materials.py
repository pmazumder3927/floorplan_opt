"""
Material upgrade layer for the Cycles/OptiX hero renderer.

WHAT THIS IS FOR
----------------
`scripts/export-gltf.ts` writes renders/<layout>.glb out of the three.js scene.
Those materials are deliberately dumb: MeshStandardMaterial, flat albedo, no
textures, and tuned to survive a software rasteriser (src/render3d/materials.ts
explains why: with only a tiny procedural env map, a fully metallic surface
renders BLACK, so its metals are deliberately under-metallic). None of that
survives contact with a path tracer — a flat brown floor stays a flat brown
sheet no matter how many samples you throw at it.

So every material in the glb is REPLACED here, matched by NAME, with a real
Principled BSDF built to match the reference photograph
`data/reference/unit-photo-living-west.jpeg`. What that photo establishes, and
what each of those facts turns into below:

  floor    DARK wide-plank wood, roughly 7-8" boards, SATIN — the glazing is
           legible as a reflection in it. -> `floor-walnut` (formerly
           `floor-oak`) gets a procedural plank pattern, a light clearcoat and a
           per-board tone and roughness break-up. This is the single most
           important material in the image; a brown sheet with a highlight is
           the thing that reads fake.
  ceiling  EXPOSED CONCRETE soffit, mid grey, patchy, not painted drywall.
  glazing  full-height panes in BLACK ANODISED ALUMINIUM, slim sections.
  walls    flat smooth near-white, minimal baseboard.
  kitchen  charcoal-brown slab-front UPPERS, pale stone counter with a thin
           edge, pale base cabinets, stainless range with a BLACK GLASS cooktop
           and dark oven front, stainless dishwasher.

HOW IT IS DRIVEN
----------------
Four auditable tables, in priority order (see `resolve`):

  1. `OBJECT_RULES` — regex on the OBJECT name. Needed where one glb material
     covers two real-world surfaces: build.ts has painted base cabinets and wall
     cabinets with the same `cabinet` material, and window casings with the same
     `trim` as interior door casings. The object names come from build.ts
     (`fixture:UPPERS/front-0-0`, `opening:WIN2/case-jamb`, ...) and are the
     only place that distinction survives the export.
  2. `SURFACES` — glb material name -> `Surface`. The real table.
  3. `ALIASES` — old/other names for the same surface, because materials.ts is
     being revised in parallel with this file.
  4. `ANON_RULES` — for the exporter's anonymous `mat:#rrggbb` colours only
     (per-product colours from src/core/catalog.ts, where there is no name to
     look up): a part-name rule that supplies cloth/pile/timber PHYSICS while
     keeping the catalog COLOUR.

Anything left over gets a sane Principled guess that keeps the glb's base
colour. Unrecognised NAMES are logged as `!! UNMAPPED` — that means materials.ts
grew a surface and this table needs an entry. Anonymous colours are logged
separately and are not a problem.

UNITS: the glb comes out of a scene authored in DECIMAL FEET, and neither the
exporter nor the importer rescales, so **1 Blender unit == 1 foot**. Every
procedural texture scale below is therefore in feet (`IN` = 1/12). Getting this
wrong makes 7 1/2" planks 7 1/2 metres wide.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable, Iterable

import bpy

# 1 Blender unit == 1 foot (see module docstring).
FT = 1.0
IN = 1.0 / 12.0


# ----------------------------------------------------------------- colour

def srgb(hexstr: str) -> tuple[float, float, float, float]:
    """'#rrggbb' (sRGB, i.e. what a colour picker shows) -> linear RGBA.

    Node `default_value`s are LINEAR. Feeding sRGB numbers straight in is the
    classic "why is everything washed out" bug, so every colour in this file is
    written as the hex a human would recognise and converted here.
    """
    h = hexstr.lstrip('#')
    if len(h) != 6:
        raise ValueError(f'not a #rrggbb colour: {hexstr!r}')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


# ----------------------------------------------------------------- the table

@dataclass(frozen=True)
class Surface:
    """One physically-based surface.

    `note` is the justification — where the number came from (the photo, a
    material datasheet, a standard product finish). Keep it honest: if a value
    is a guess, say so.
    """

    note: str
    base: str                      # base colour, '#rrggbb' sRGB
    rough: float                   # 0 = mirror, 1 = fully diffuse
    metal: float = 0.0             # 1.0 for bare metal, 0.0 for everything else
    ior: float = 1.5               # 1.5 = paint/plastic/glass, 1.33 water
    transmission: float = 0.0
    coat: float = 0.0              # clearcoat weight (lacquer, varnish, glaze)
    coat_rough: float = 0.08
    sheen: float = 0.0             # fabric retroreflection at grazing angles
    sheen_rough: float = 0.35
    sheen_tint: str = '#ffffff'
    aniso: float = 0.0             # brushed metal
    emit: str | None = None
    emit_strength: float = 0.0
    subsurface: float = 0.0        # leaves, thin fabric
    subsurface_radius: tuple[float, float, float] = (0.05, 0.05, 0.05)
    texture: str | None = None     # key into RECIPES
    haze_ft: float = 0.0           # >0: fade to sky colour by this distance (aerial perspective)
    keep_glb_color: bool = False   # honour the glb albedo, use the rest of this spec
    shadow_transmit: float = 0.0   # >0: pass SHADOW rays straight through (see build())


# Colours below are eyeball matches off the reference photo (sampled by looking
# at it, not with a meter — stated as an assumption). Where a real product has a
# known finish (anodised aluminium, quartz, glazed porcelain) the roughness comes
# from that finish rather than from the photo.
SURFACES: dict[str, Surface] = {
    # ---------------------------------------------------------- the big three
    'floor-walnut': Surface(
        note='PHOTO: dark walnut wide plank, ~7-8" boards, satin. The floor '
             'reflection of the glazing is the strongest realism cue in the whole '
             'image, so this gets a real plank pattern + a coat that can actually '
             'MIRROR the window.\n'
             'MEASURED off the reference, and both numbers were wrong before:\n'
             '  * VALUE. The photo\'s foreground floor samples RGB 156,140,130 — a '
             'MID brown, not espresso. base #5b3c2b rendered it at 106,84,73, a '
             'full stop too dark and noticeably more saturated, so the room read '
             'as a dark-floored box instead of the airy one in the photo.\n'
             '  * SHEEN. Where the glazing reflects, the photo\'s floor goes to '
             '196,207,217 — BRIGHTER than the interior mid-tones and BLUE, i.e. it '
             'is carrying the sky almost undimmed and you can read the mullions in '
             'it. rough 0.24 with coat 0.30 / coat_rough 0.11 blurs that into a '
             'vague warm smudge at 108,92,86. A factory satin (25-35 gloss units) '
             'is a thin hard UV-cured coat over the grain: the right model is a '
             'moderately smooth base under a STRONG, SMOOTH coat, not a uniformly '
             'semi-rough dielectric.\n'
             'CORRECTED AGAIN, and the paragraph above OVERSHOT — read it as the '
             'reason the numbers moved, not as a description of what they are now. '
             'It is also worth saying plainly that the note further down in '
             '`_planks` CLAIMED to have already killed the pale-hairline joint '
             'artefact. It had not; it only darkened the joint albedo and left the '
             'bevel in the normal, which is the part that draws the line.\n'
             'MEASURED on eye-hero, the glare sheet in front of the glazing:\n'
             '  * the photo (y520-650, x220-470) means RGB 204,218,228 with std '
             'only 11.0/13.6/14.1 — a smooth low-frequency bright plane. The '
             'mullions are NOT legible in it and the plank joints vanish entirely.\n'
             '  * the render, same zone, meant 138,141,151 with std 66/74/82: a '
             'hard-edged white slab with a crisp shadow boundary and every plank '
             'joint drawn as a PALE hairline. Same average brightness, six times '
             'the local contrast — i.e. the error was never the value, it was the '
             'width of the specular lobe.\n'
             'So: coat 0.58 -> 0.22, coat_rough 0.065 -> 0.18, rough 0.19 -> 0.30. '
             'A 25-35 gloss-unit factory satin has a WIDE specular lobe; '
             'coat_rough 0.065 is a semi-gloss lacquer and 0.58 of it is a wet '
             'look. This is a FINISH fact (gloss units -> lobe width), calibrated '
             'against the photo\'s std, not read off it directly.\n'
             'RESULT of that change, measured on the same eye-hero glare patch: '
             '142,142,148 std 66/74/84 -> 177,187,201 std 45/49/53, and at 4x '
             'magnification the pale hairline down every joint is gone. The '
             'remaining std is a real hard shadow edge and a rug boundary inside the '
             'patch, not the floor finish.\n'
             'COLOUR, lifted #664c3a -> #6d5847 (and the four tones in `_planks` '
             'scaled by the same per-channel LINEAR factors, 1.05/1.17/1.37, so the '
             'recipe still averages to the base — the recipe overrides Base Color, '
             'so moving `base` alone would have done nothing). The stated reason for '
             'the lift was to throw a warmer bounce onto the walls; MEASURED, it did '
             'not do that (see the wall-paint note for the two-render comparison, '
             'which refutes the theory). It is kept because it is independently '
             'right: the photo\'s foreground floor diffuse is a mid brown and '
             '#664c3a was still reading a little dark and a little red.',
        base='#6d5847', rough=0.30, coat=0.22, coat_rough=0.18,
        texture='planks',
    ),
    'concrete-soffit': Surface(
        note='PHOTO: exposed structural concrete soffit, mid grey, faintly '
             'patchy, small recessed downlights. Not painted drywall. MEASURED '
             'off the reference: the ceiling band samples RGB 141,157,162 — R < G '
             '< B, i.e. distinctly COOL. Portland-cement paste really is a blue-'
             'grey, and it is lit almost entirely by skylight, so both the albedo '
             'and the illuminant push it cool. The previous #a9a8a4 was warm-'
             'neutral and rendered at R-G=+11 (a beige ceiling) against the '
             "photo's R-G=-16; that single sign error is what made our soffit read "
             'as painted drywall in a warm room instead of bare concrete. The ratios '
             'here are the photo\'s own: R/G 0.90, B/G 1.03.\n'
             'RE-MEASURED, and the HUE above was right while the VALUE and the '
             'VARIANCE were both wrong — which is why the soffit still read as '
             'painted drywall even after the cool correction landed:\n'
             '  * VALUE. A 550x90 px patch of the photo\'s soffit means RGB '
             '136,153,158; the same band on eye-living rendered at 105,118,128 with '
             'base #96a3a9. R-B was -23 in both, so the colour cast was already '
             'correct; it was 0.4 stop too DARK. base is now the effective albedo '
             'the `concrete` recipe averages to (see the VALUE paragraph there for '
             'the two-point calibration that produced it) — but note that the '
             'recipe overrides Base Color, so this field is documentation, not the '
             'thing the renderer reads.\n'
             '  * SHEEN. rough 0.62 is EGGSHELL PAINT. That single number is most '
             'of why 30% of every hero frame read as a painted ceiling: an '
             'eggshell soffit returns a soft but coherent specular sheet off the '
             'glazing, and no amount of grey fixes that. Bare formed concrete is '
             'chalky cement paste — effectively Lambertian — so 0.85. This is a '
             'FINISH fact, not a photo measurement: the photo shows no sheen '
             'anywhere on the soffit, which is consistent with 0.85 but does not '
             'by itself pin the number.\n'
             'HOW FAR THIS GOT, AND WHY IT STOPS HERE. eye-living, 700x75 px soffit '
             'band: 105,118,128 -> 116,128,137. The R-B cast held at -21 against the '
             'photo\'s -21 for the band as a whole (near the glazing the photo goes '
             'much cooler still, R-B -54 at 150,184,204, which is sky bouncing off '
             'the slab and not albedo). '
             'IGNORE ANY BAND-STD NUMBER YOU FIND ATTACHED TO THIS SURFACE: the band '
             'std of a soffit is dominated by the illumination ramp along it, so it '
             'is not a texture statistic. An earlier pass in this same file tuned the '
             '`_concrete` blotch field until the band std matched the photo\'s and '
             'produced a thundercloud ceiling; the corrected split of gradient vs '
             'high-frequency contrast, and the right targets for each, are in the '
             'SPAN comment in `_concrete`. The MEAN is still ~15% under the photo\'s 136,153,158 and '
             'IT IS DELIBERATELY LEFT THERE, because closing it would need an albedo '
             'this material has no right to. Calibrated over two renders, display '
             'value goes as (linear albedo)^0.434 here; reaching 136,153,158 from '
             'this albedo needs a further x1.42/1.48/1.41 in linear, i.e. an '
             'effective reflectance of 0.64/0.78/0.76. That is white paint. Concrete, '
             'even a pale smooth-formed slab, tops out around 0.50-0.55.\n'
             'SO THE RESIDUAL IS A LIGHTING DEFICIT, NOT A MATERIAL ONE, and the '
             'arithmetic says so. In this render the soffit (albedo 0.45 linear) '
             'returns 117 while the wall (albedo 0.90) returns 145: a ratio of 1.24 '
             'for a 2.0x albedo ratio, where equal illumination would give 2.0^0.434 '
             '= 1.35. So our soffit receives ~15% LESS light than our walls. In the '
             'photograph the same comparison — soffit 136 at ~0.45, wall 133 at ~0.90 '
             '— implies the soffit receives roughly 2.1x MORE light than the wall '
             'relative to what we deliver. A soffit under a full-height glass wall '
             'should be flooded with sky; ours is not. That is GAP 11 (the inverted '
             'soffit/wall relationship) at root, it lives in render.py/world.py, and '
             'no albedo in this file can substitute for it honestly.',
        base='#b1bfc6', rough=0.85, texture='concrete',
    ),
    'glass': Surface(
        note='Real transmissive glazing: IOR 1.5, no thin-film, near-zero '
             'roughness. The panes in the glb are 1/2" solid slabs, so plain '
             'transmission (not thin-walled) is the right model for what the '
             'CAMERA sees. shadow_transmit is what makes it work for LIGHT — see '
             'the block in build(); without it this unit renders half a stop dark '
             'and noisy, which is measured, not theoretical.',
        base='#f4f7f7', rough=0.012, transmission=1.0, ior=1.5,
        shadow_transmit=0.90,
    ),

    # ---------------------------------------------------------- walls + trim
    'wall-paint': Surface(
        note='PHOTO: flat, smooth, barely off-white. Flat latex on skim coat '
             'is rough ~0.6; a hair of bump keeps it from looking like plastic.\n'
             'WARMED A HAIR, #f2f1ee -> #f3f0e9, and the size of the change is the '
             'point: it is almost nothing, because the albedo was already right. '
             'MEASURED: the photo\'s wall right of the glazing (y260-470, x782-822) '
             'means RGB 133,135,124, i.e. R-B = +9 — warm-neutral. The render was '
             'coming out at R-B = -12 to -14 on the same plane: cool blue-grey. An '
             'albedo whose own R-B is +9 cannot produce a -14 render, so the cast '
             'was never in this hex — it was in the ILLUMINANT. A sky-dominated '
             'world bouncing off a floor that was too dark and too red to return '
             'much warm light leaves the walls lit by sky alone.\n'
             'MEASURED, which of the two candidate fixes actually moved it — and the '
             'answer was the opposite of what was expected, so it is recorded here '
             'rather than quietly dropped. Two renders of b-fold-away, one variable '
             'each:\n'
             '  * warming THIS hex, #f2f1ee -> #f3f0e9: eye-living wall R-B +1.0 -> '
             '+6.9, eye-hero wall R-B -11.6 -> -8.5. That is the whole move.\n'
             '  * then lightening and desaturating the FLOOR (floor-walnut base '
             '#664c3a -> #6d5847, and its four `_planks` tones scaled to match): '
             'eye-living +6.9 -> +6.4, eye-hero -8.5 -> -8.6. Nothing, and very '
             'slightly the wrong way.\n'
             'So the "the cast comes from the floor bounce, not the paint" theory is '
             'REFUTED for this room at this exposure. The floor subtends a big solid '
             'angle from the wall but it is still a 0.15 reflectance surface, and '
             'multiplying a warm bounce that small by a factor of 1.05-1.37 cannot '
             'compete with a sky that is two stops brighter. The paint hex is a '
             'direct multiplier on everything the wall returns, which is why a '
             '3-level change in it beat a 37% change in the floor.\n'
             'What has NOT been closed: eye-hero\'s upper wall still reads R-B -8.6 '
             'against the photo\'s +9. That plane is lit mostly by the soffit, which '
             'is deliberately COOL (see concrete-soffit), so it cannot go warm-'
             'neutral without either a warmer sky or a warmer soffit, and neither is '
             'supported by the photograph. Stated as an open gap, not a fixed one.',
        base='#f3f0e9', rough=0.60, texture='plaster',
    ),
    'wall-outer': Surface(
        note='Outer face of the exterior walls. Only ever seen edge-on through '
             'the glazing reveals, so it is just a cooler grey render.',
        base='#d9d8d4', rough=0.75,
    ),
    'wall-cut': Surface(
        note='Top face of a wall cut down for an overhead view: a section cut, '
             'deliberately matte and slightly darker so the cut reads.',
        base='#cfcdc8', rough=0.85,
    ),
    'trim': Surface(
        note='Interior door casings + leaves: semi-gloss white enamel. '
             '(Window casings are NOT this — see OBJECT_RULES.)',
        base='#f7f6f3', rough=0.30, coat=0.10, coat_rough=0.10,
    ),
    'baseboard': Surface(
        note='PHOTO: baseboard is minimal to none, so it is the same enamel as '
             'the trim and is meant to disappear.\n'
             'CURRENTLY UNREACHABLE, and that is worth saying rather than deleting '
             'the entry: build.ts no longer emits any base trim (this plan has '
             'none — the wall butts the floor) so nothing in the glb carries this '
             'material. The wall/floor junction is `shadow-gap` below. Kept '
             'because the value is still correct for a plan variant that does have '
             'base trim.',
        base='#f5f4f1', rough=0.32,
    ),
    'shadow-gap': Surface(
        note='The WALL/FLOOR JUNCTION. This is a SHADOW GAP, not a moulding, and '
             'it is not metalwork either — read the value note before touching it, '
             'because it is much lighter than it looks like it should be.\n'
             'MEASURED on the reference photo, twice and independently: a 30 px '
             'column down the base of the 16" pier between the glazing bays shows '
             'the wall grading 106 -> 89 over ~36 px, dropping to 66, bottoming at '
             'rgb(40,35,35) for 2-3 px, recovering to 47 then 59, and running on '
             'into the floor\'s reflection of the pier. A SOFT dark line bottoming '
             'near 40. There is no base trim anywhere in the frame and at the '
             'glazing there is nothing at all — the aluminium track lands straight '
             'on the slab.\n'
             'WHY IT IS NOT BLACK. An earlier pass drew this band with '
             '`metal-black` (powder-coated black steel, #26272a at metal 0.7) on '
             'the stated grounds that it was the darkest surface reachable from '
             'build.ts without adding a material. MEASURED, that rendered the '
             'junction at rgb(1.3,1.0,0.9) — a single row of pure black, ~30x '
             'darker than the photo\'s 40, which reads as a CRACK between the wall '
             'and the floor rather than a shadow. Two separate faults: the albedo '
             'was ~10x too dark AND metal 0.7 leaves almost no diffuse lobe, so a '
             'band sitting in a heavily occluded corner had nothing to return.\n'
             'So #8f8d88 at rough 0.90 and metal 0: a sliver of paint and plaster '
             'in shadow. CALIBRATED — at this value the junction lands rgb(42,36,32) '
             'against the photo\'s rgb(40,35,35). The point is that most of the '
             'darkness is the contact shadow doing its own work; the material only '
             'has to not fight it. Faintly warm (R > B) to match the measured '
             'junction, which is picking up bounce off the walnut.',
        base='#8f8d88', rough=0.90,
    ),

    # ---------------------------------------------------------- glazing frames
    'anodised-black': Surface(
        note='PHOTO: black anodised aluminium glazing sections. Anodising is a '
             'thin oxide over metal: metallic with a satin, not mirror, finish.\n'
             'MEASURED, and base #1a1b1d was an order of magnitude too dark. In the '
             'photo the sections are a dark charcoal that visibly CARRIES THE SKY: a '
             'shadowed mullion at x626-631 samples #253d46 (37,62,71 — note B-R = '
             '+34, that blue IS the sky) and where the same section catches sky at '
             'x342-348 it goes to #6693b1 (103,148,178). The sill track draws a '
             'bright line along its top edge (#606c72 mean, std 49.6 along the run).\n'
             'The render had NONE of that: the mullion sampled 0.7,0.8,1.0 out of '
             '255 and the head band and jambs were flat black whose only variation '
             'was path-tracer noise. There was no bright arris anywhere on the '
             'assembly.\n'
             'WHY. At metal=1.0 there is no diffuse lobe at all, so the base colour '
             'IS the reflectance: #1a1b1d is 0.0097 LINEAR, i.e. a 1% mirror. Class '
             '1 architectural anodising in dark bronze/black measures 8-12% total '
             'reflectance — sRGB 0x50..0x61 — so this was ~10x too dark, and a 1% '
             'mirror facing a dark interior renders as zero no matter what else is '
             'right. rough 0.34 made it worse by spreading that 1% over a wide '
             'lobe, which is what killed the arris.\n'
             'The base below is the value that lands the measurement (see the render '
             'notes in the fidelity pass); it sits at the low end of the 8-12% band '
             'because these sections are the BLACK finish, not dark bronze. rough '
             '0.22 is satin anodising: tight enough to keep a legible bright edge '
             'where a member turns toward the sky, wide enough not to mirror.',
        base='#4a4f53', rough=0.22, metal=1.0,
    ),

    # ---------------------------------------------------------- kitchen
    'counter-stone': Surface(
        note='PHOTO: pale stone counter, thin edge profile. Engineered quartz '
             'is polished but not a mirror; faint speckle carries the scale.',
        base='#e7e4dc', rough=0.16, coat=0.18, coat_rough=0.06, texture='stone',
    ),
    'cabinet-base-pale': Surface(
        note='PHOTO: base cabinets read pale — light grey-beige slab fronts in '
             'a satin catalysed lacquer.\n'
             'MEASURED by RATIO, which is the only sound way to read a cabinet front '
             'out of a photograph: a base door at x92-112 y430-540 samples #635d53 '
             'while the splash wall directly above it (x95-150 y300-370) samples '
             '#be936e under the SAME warm under-cabinet downlight. The door is '
             'therefore ~0.7x the wall\'s reflectance, and the wall is the pale '
             'stone splash. That puts the door albedo near #c6c0b6 — a LIGHT warm '
             'greige, definitely not a dark front. #e2ded5 was a touch high and a '
             'touch cool; #cdc7bd is the ratio read, warmed to match the splash it '
             'was measured against. Uncertainty is real here: a reflectance ratio '
             'off one photograph carries maybe +/-10% in value.',
        base='#cdc7bd', rough=0.36, coat=0.12, coat_rough=0.09,
    ),
    'cabinet-shadow': Surface(
        note='Toe kick / cabinet returns: same finish, darker, matte (it is in '
             'permanent shadow and reflects the floor, not the room).',
        base='#b7b2a8', rough=0.55,
    ),
    'cabinet-upper-dark': Surface(
        note='PHOTO: the UPPER cabinets are dark charcoal-brown slab fronts, '
             'clearly a different finish from the pale bases. Object rule only.\n'
             'RAISED TWO STOPS, from #332d28. #332d28 is 0.031 linear — a 3% '
             'reflectance, which is flat black velvet, not a cabinet door. The '
             'photographic read is ~#7f7871, recovered the same way as the base '
             'fronts: by RATIO against an adjacent surface under the same '
             'illuminant, because the uppers in the reference frame are lit only by '
             'window bounce and their sampled pixels are radiance, not albedo.\n'
             'STATE THE UNCERTAINTY: +/-15% in VALUE. A ratio read needs the two '
             'surfaces to share an illuminant, and the uppers sit under their own '
             'shadow line while the reference surface does not, so this is the '
             'weakest-evidence colour in this table. The HUE (warm charcoal, R > B) '
             'is solid; the value is a bracket. What is certain is that #332d28 was '
             'outside the bracket by a long way — a charcoal laminate slab is a '
             '20-28% reflectance finish and #7f7871 is 22%.',
        base='#7f7871', rough=0.34, coat=0.14, coat_rough=0.10,
    ),
    'steel-brushed': Surface(
        note='Appliance stainless. Horizontally brushed: full metal, anisotropic '
             'along the brush direction, with a fine directional roughness '
             'streak.\n'
             'CORRECTED. The parenthetical this note used to end with — "the glb '
             'under-drives metalness so the rasteriser does not render it black; a '
             'path tracer wants the real 1.0" — is only half true, and the half it '
             'got wrong cost the whole kitchen. metal=1.0 at rough=0.26 on a FLAT '
             'PANEL facing a dark interior renders black in a path tracer for '
             'exactly the reason src/render3d/materials.ts warns about for the '
             'rasteriser: a metal has no diffuse lobe, so it can only show what it '
             'reflects, and a 0.26-rough panel reflects a narrow cone of dark room. '
             'MEASURED: the base run came out at 18,23,29 and the dishwasher was a '
             'mirror-black slab, against a photographic read of #464b4c (std 39.5, '
             'plainly LIGHTER than its own shadow) for the dishwasher panel.\n'
             'So: rough 0.26 -> 0.42 so the panel integrates a wide swath of the '
             'room instead of one dark cone, metal 1.0 -> 0.85 so it keeps a small '
             'diffuse floor it cannot fall below, and base lifted to #cdd1d3. 0.85 '
             'is a deliberate, stated departure from physics (bare steel is 1.0): '
             'it is a robustness margin against a dark surround, the same trade the '
             'rasteriser side makes at 0.78 and for the same reason.',
        base='#cdd1d3', rough=0.42, metal=0.85, aniso=0.65, texture='brushed',
    ),
    'steel-dark': Surface(
        note='PHOTO: the oven front reads much darker than the body — dark '
             'tinted steel/glass.\n'
             'SAME FAULT AS `steel-brushed`: #4a4e52 at metal 1.0 / rough 0.24 is a '
             '7% mirror with no diffuse floor, so on a flat panel facing a dim room '
             'it renders near-black. MEASURED on eye-kitchen, the range/oven front '
             'went 51,53,58 -> 90,97,105 on this change alone.\n'
             'AND A WARNING THAT BELONGS HERE BECAUSE THIS IS WHERE ANYONE WILL LOOK: '
             'the near-black FRIDGE in the eye-kitchen and eye-living frames is NOT '
             'this material misbehaving, and it is not a catalog colour falling '
             'through to the anonymous fallback either. Its doors do resolve to '
             'steel-dark (the glb has fixture:REF/door-0 and door-1 on this material). '
             'They are black because they receive NO LIGHT: fixPanelAppliance in '
             'src/render3d/build.ts centres the door panel at `d/2 - IN(0.25)` with a '
             'thickness of `IN(0.5)`, so the door\'s front face is exactly COPLANAR '
             'with the front face of the solid body box behind it, and every shadow '
             'ray leaving the door is blocked by that face at zero distance.\n'
             'The proof is a null result, which is why it is written down: lifting '
             'this base from #4a4e52 to #7b8084 (2.9x in linear) AND adding a 15% '
             'diffuse lobe by dropping metal to 0.85 moved the fridge door from '
             '0.4,0.4,0.4 to 0.3,0.4,0.4. Zero response to a 3x albedo change can '
             'only mean zero light transport. It is a geometry bug, the fix is one '
             'sign in build.ts (`d / 2 + IN(0.25)`, i.e. proud of the body rather '
             'than inside it), and no value in this file can reach it.',
        base='#7b8084', rough=0.40, metal=0.85, aniso=0.5, texture='brushed',
    ),
    'chrome': Surface(
        note='Polished chrome: gooseneck faucet, pulls, oven handle bar.',
        base='#e9ecee', rough=0.055, metal=1.0,
    ),
    'cooktop-black-glass': Surface(
        note='PHOTO: the cooktop is BLACK GLASS — near-black dielectric under a '
             'polished surface, so it mirrors the uppers and the window.',
        base='#0b0c0e', rough=0.035, coat=0.5, coat_rough=0.03,
    ),
    'tile': Surface(
        note='Glazed ceramic (bath surround, 4" kitchen splash): a glaze is a '
             'clear coat over a light body.',
        base='#dfe3e4', rough=0.14, coat=0.35, coat_rough=0.05,
    ),
    'porcelain': Surface(
        note='Sanitary porcelain: tub, toilet, basin. Vitreous glaze.',
        base='#f7f8f8', rough=0.07, coat=0.4, coat_rough=0.04,
    ),

    # ---------------------------------------------------------- furniture
    'wood-oak': Surface(
        note='Furniture oak (tables, shelves): mid warm brown, matte oiled '
             'finish with a fine grain streak. Deliberately NOT the floor.',
        base='#a87d4d', rough=0.42, coat=0.12, coat_rough=0.18, texture='grain',
    ),
    'wood-walnut': Surface(
        note='Furniture walnut: darker, same oiled finish.',
        base='#5d4029', rough=0.40, coat=0.12, coat_rough=0.18, texture='grain',
    ),
    'metal-black': Surface(
        note='Powder-coated black steel: legs, rails, TV bezel. Powder coat is '
             'a thick pigmented layer, so only partly metallic.',
        base='#26272a', rough=0.42, metal=0.7,
    ),
    'screen': Surface(
        note='TV/monitor panel: a polished black dielectric that catches the '
             'window, same family as the cooktop.',
        base='#101215', rough=0.06, coat=0.45, coat_rough=0.04,
    ),
    'mirror': Surface(
        note='Real mirror. Silvered glass is ~96% reflective and neutral.',
        base='#f4f5f6', rough=0.0, metal=1.0,
    ),

    # ------------------------------------------------------------- projection
    #
    # A projected picture is made of two DIFFERENT surfaces and the pair is what
    # makes a home-cinema frame believable:
    #   the FABRIC   what you see with the projector off
    #   the IMAGE    what you see with it on, which is an EMITTER and therefore
    #                lights the ceiling, the seats and the faces watching it
    # Getting only the first gives a grey rectangle that reads as a blank wall
    # panel. Getting only the second gives a glowing slab in a daylight frame.
    'screen-fabric': Surface(
        note='Matte-white projection fabric, gain ~1.0-1.1. Near-Lambertian BY '
             'DESIGN — the whole purpose of the material is that the image looks '
             'the same from every seat — so rough is very high and there is no '
             'coat at all. A vinyl screen is a warm-neutral off-white, not paper '
             'white; the weave bump is the real 1/8" woven texture, which is what '
             'stops a 7 ft rectangle of flat white reading as a hole in the wall.',
        base='#e6e5e1', rough=0.93, sheen=0.10, sheen_rough=0.5, texture='weave',
    ),
    'screen-fabric-alr': Surface(
        note='LENTICULAR / ALR fabric, the grey structured surface you pair with '
             'an ultra-short-throw projector. It is DARK on purpose: rejecting '
             'ambient light means absorbing everything that does not arrive from '
             'below, which is why an ALR screen looks like slate with the '
             'projector off. Cycles cannot express the directional gain either, '
             'so this is the honest single-lobe stand-in: a dark base under a '
             'weak smooth coat, i.e. it returns a little light specularly and '
             'swallows the rest. Stated as an approximation, not a measurement.',
        base='#83868a', rough=0.34, coat=0.22, coat_rough=0.10,
    ),
    'projection-image': Surface(
        note='THE PICTURE, switched on. An emitter, and cool-neutral because a '
             'projector lamp is 6000-6500 K: this is what spills blue-white onto '
             'the soffit and onto the faces of everyone watching, and that spill '
             'is the strongest single cue that a room is in use.\n'
             'THE STRENGTH IS NOT CALIBRATED, AND THIS IS WHY. 9.0 is an estimate '
             'from the photometry: a 100" 16:9 image is ~2.4 m2, so a 2,500 lm '
             'projector on a gain-1.0 screen returns roughly 300-350 cd/m2. It was '
             'raised to 30.0 to try to make the picture read as ON in a night '
             'frame and the difference was BARELY PERCEPTIBLE, so it was put back '
             'rather than left at a number no frame supports.\n'
             'The reason a night frame cannot yet settle it is an open item in a '
             'different file: render.py calls world.build_city(tod, strength=1.0) '
             'unconditionally, so dropping --sky-strength to 0.03 for a dark room '
             'leaves the city outside still lit at full strength and blowing white '
             'through every bay. Until build_city takes the sky strength, the '
             'brightest thing in a "night" frame is the view, not the screen, and '
             'no value here can be judged against it. Fix that first, then '
             'calibrate this.',
             base='#dfe8f5', rough=0.88, emit='#bcd2f0', emit_strength=9.0,
    ),
    'bezel-velvet': Surface(
        note='Flocked black velvet on a fixed-frame screen bezel, and the end '
             'caps of a roller cassette. This is the BLACKEST surface in the '
             'room — blacker than the anodised window frames — and it has to '
             'stay that way: velvet is a forest of fibres that traps light, so '
             'rough is at the ceiling and there is deliberately no coat. Any '
             'coat at all turns it into black plastic, which is exactly what a '
             'cheap screen looks like and exactly what this is not.',
        base='#0d0d0d', rough=0.98, sheen=0.12, sheen_rough=0.7,
    ),
    'shade-blackout': Surface(
        note='Blackout cellular / roller blind fabric. Dense, matte, warm '
             'charcoal so a dropped blind reads as fabric and not as a hole. '
             'Sheen is what sells it: a blind is always seen against the light, '
             'so its edge is rimmed even when the face of it is dark.',
        base='#3a3833', rough=0.94, sheen=0.35, sheen_rough=0.35, texture='weave',
    ),
    'speaker-grille': Surface(
        note='Acoustic grille cloth over a driver: an open weave over a void, so '
             'it reads darker than its own albedo. Modelled as a very rough near-'
             'black with a weave bump rather than as real transparency, which '
             'would cost transmission rays for something 2" across.',
        base='#26262a', rough=0.93, sheen=0.20, sheen_rough=0.45, texture='weave',
    ),
    'lens-glass': Surface(
        note='Projector lens / UST exit window: a multi-coated dielectric behind '
             'a black barrel. It reads as a dark hole with ONE hard specular '
             'highlight, so it is the cooktop-glass recipe with a tighter coat.',
        base='#0b0d10', rough=0.04, coat=0.60, coat_rough=0.02,
    ),
    'fabric': Surface(
        note='Upholstery. Sheen is what makes cloth read as cloth: a bright rim '
             'at grazing angles that no amount of roughness reproduces.',
        base='#8b8678', rough=0.85, sheen=0.55, sheen_rough=0.30, texture='weave',
    ),
    'linen': Surface(
        note='Bedding / mattress: brighter, softer sheen, slightly translucent.',
        base='#ece9e2', rough=0.90, sheen=0.40, sheen_rough=0.40,
        subsurface=0.10, subsurface_radius=(0.02, 0.018, 0.014), texture='weave',
    ),
    'curtain': Surface(
        note='Linen drapery. OPAQUE on purpose — see src/render3d/materials.ts: '
             'the folds are faked with overlapping slats, and any transmission '
             'makes every slat show through its neighbour. Sheen + a weave bump '
             'do the work instead.',
        base='#e9e4d8', rough=0.82, sheen=0.75, sheen_rough=0.28, texture='weave',
    ),
    'rug': Surface(
        note='Cut pile: the roughest thing in the room, plus a coarse bump so '
             'the pile catches raking window light.',
        base='#9d9a8b', rough=0.97, sheen=0.25, sheen_rough=0.6, texture='pile',
    ),
    'pot-terracotta': Surface(
        note='Unglazed terracotta: porous, matte, slightly dusty.',
        base='#ab6c4c', rough=0.80,
    ),
    'foliage': Surface(
        note='Leaf: waxy cuticle over a translucent blade, so a little coat and '
             'a little subsurface. Both make backlit leaves read correctly.',
        base='#496f45', rough=0.45, coat=0.20, coat_rough=0.25,
        subsurface=0.25, subsurface_radius=(0.01, 0.03, 0.008),
    ),
    'foliage-light': Surface(
        note='Younger growth: lighter and a touch more translucent.',
        base='#5d8850', rough=0.45, coat=0.20, coat_rough=0.25,
        subsurface=0.30, subsurface_radius=(0.012, 0.035, 0.01),
    ),
    'lamp-shade': Surface(
        note='Lamp shade, lit. The glb has no light objects by the time we get '
             'here (render.py drops the rasteriser rig), so the shade IS the '
             'lamp: an emitter at roughly the luminance of a 40 W-equivalent '
             'bulb behind linen.',
        base='#fff4de', rough=0.9, emit='#ffd79a', emit_strength=6.0,
    ),
    'downlight-trim': Surface(
        note='PHOTO: the soffit downlights are small flush discs with a pale trim '
             'ring — powder-coated aluminium, satin.',
        base='#d4d2ce', rough=0.45, metal=0.15,
    ),
    'downlight-lens': Surface(
        note='PHOTO: 4" LED downlight lenses. The note here used to say they are '
             '"WASHED OUT rather than glowing" and that emit_strength 12.0 was '
             'enough "to read as a warm disc" with the physical ~130 W/m2 of a '
             '700 lm lamp over a 4" aperture reserved "for a night frame". BOTH '
             'HALVES OF THAT WERE WRONG, and the photograph settles it:\n'
             '  * the lens in the reference frame is NOT washed out, it is CLIPPED. '
             'A 10x8 px patch on its core means 196,196,199 and its maximum hits '
             '255,254,255, with a warm halo bleeding several aperture-widths onto '
             'the slab. The concrete around it is 150,184,204 to 166,188,201. So '
             'the disc is ~1.25x the slab it sits in, with blown highlights, in '
             'BROAD DAYLIGHT.\n'
             '  * at emit_strength 12.0 the rendered disc measured 122,131,138 '
             'against slab of 117,129,139 immediately left of it — i.e. within the '
             'noise of the ceiling, and DARKER than the slab a little further '
             'along. It did not read as on at all; it read as a plaster patch. '
             '(The geometry side was fixed first — the lens is now flush with the '
             'slab instead of a proud puck, see TRIM in build.ts — which removed '
             'the ring shadow but could not make an emitter brighter.)\n'
             'emit_strength 12.0 -> 55.0, and the reason it is 55 rather than the '
             'physical 130 is a MEASURED trade, not a fudge: 130 lands the core in '
             'clipping like the photo but at this aperture size it is a small '
             'bright emitter in a path tracer and it starts to speckle the soffit '
             'around it at the sample counts these frames actually run. 55 puts '
             'the core comfortably above the slab (the whole point) while staying '
             'clean. STATED AS AN APPROXIMATION: this is a legibility setting for '
             'a daylight frame at 96-256 spp, not the lamp\'s real exitance. For a '
             'night frame, or at high sample counts, use 130 and treat the disc as '
             'a real light source.\n'
             'emit hue #ffe6bc -> #ffd9a5: the photo\'s core is #f7e9db at R-B +28 '
             'while the render\'s disc sat at R-B -16 against concrete at R-B -21, '
             'so it was barely warmer than the ceiling it was cut into.',
        base='#fff7e8', rough=0.9, emit='#ffd9a5', emit_strength=55.0,
    ),
    'ground': Surface(
        note='The glb ground plane. Only used if render.py leaves it in place '
             '(it deletes it when it builds the exterior context, because on a '
             'high floor a pale plane at slab level is wrong).',
        base='#cfcac0', rough=0.95,
    ),

    # ------------------------------------------------- exterior context
    # These are not in the glb. render.py builds the outlook (see its
    # `build_context`) because with floor-to-ceiling glazing the view is a large
    # fraction of every interior frame and a blank sky reads as fake instantly.
    #
    # !! READ THIS BEFORE TUNING ANY OF THE SIX `context-*` SURFACES BELOW: on the
    # CURRENT code path they are DEAD, and changing them will not move a pixel.
    # render.py imports scripts/blender/world.py at module load and uses it for the
    # sky AND the city; its own add_daylight()/build_context() are the fallback for
    # when that import RAISES. Every live frame logs `outlook: world.py city, N
    # object(s)` — so build_city() in world.py is what actually builds the outlook,
    # and world.py carries its OWN palettes (WALL_COLORS / ROOF_COLORS, near the top
    # of that file) baked into a per-vertex `albedo` attribute that its private
    # `_city_material` reads. materials.py is never consulted.
    #
    # This was checked because an audit pass reported "`context-deck` appears to be
    # UNUSED in the frame" and guessed that build_context was not assigning it in
    # the right proportion. That specific diagnosis is REFUTED: build_context does
    # assign it, one deck cap per block, right after the block itself. The surface is
    # unused for a completely different reason — build_context does not run at all.
    # Kept, not deleted, because it IS the fallback path and has to stay coherent.
    #
    # And for the record, MEASURED, the outlook is not the white-styrofoam field that
    # audit described either: sampling the roofscape through the left bay of
    # b-fold-away/eye-living and excluding mullion and sky, the render runs p5 163 /
    # p50 189 / p95 244, against the photograph's darkest roof feature (a red brick
    # flank) at 139,152,162 and its palest membrane at 215,228,232. The render is
    # slightly SHORT at the dark end, not blown out. What it genuinely lacks is
    # CHROMA: every pixel of our outlook sits at R-B ~= -12, while the photo swings
    # from R-B -28 on a shaded deck to R-B +30 on a run of ochre parapet panels.
    # That is a palette gap in world.py's WALL_COLORS / ROOF_COLORS — both tables are
    # entirely neutral-to-cool — and it cannot be fixed from this file.
    'context-roof': Surface(
        note='PHOTO: mid-distance mid-rise rooftops — grey membrane, ballast, '
             'mechanical plant. Read at 100-900 ft, so all that matters is the '
             'value and the aerial haze.',
        base='#605d59', rough=0.9, haze_ft=900.0,
    ),
    'context-wall': Surface(
        note='PHOTO: the flank walls of those mid-rise blocks — brick/render, '
             'a little warmer than the roofs.',
        base='#6f665c', rough=0.85, haze_ft=900.0,
    ),
    'context-wall-warm': Surface(
        note='PHOTO: some of those mid-rise blocks are red/brown brick. Without '
             'two or three tones the roofscape reads as one grey mass.',
        base='#7a5c4c', rough=0.85, haze_ft=900.0,
    ),
    'context-wall-dark': Surface(
        note='PHOTO: and some are dark — older stock, plant rooms, shaded flanks.',
        base='#4b4843', rough=0.8, haze_ft=900.0,
    ),
    'context-deck': Surface(
        note='PHOTO: roof DECKS are dark — bitumen membrane, ballast, plant. '
             'They are the darkest thing in the outlook and they are what stops '
             'the city reading as a field of white boxes.',
        base='#3d3b38', rough=0.92, haze_ft=900.0,
    ),
    'context-glass': Surface(
        note='PHOTO: the glass curtain-wall tower immediately adjacent (to the '
             'NORTH looking west). Reflective spandrel/vision glass in a '
             'mullion grid; it is close, so it gets almost no haze.',
        base='#4a5a66', rough=0.09, texture='curtainwall', haze_ft=3200.0,
    ),

    # ------------------------------------------------- shape-aware fallbacks
    # These three keep the GLB'S OWN COLOUR (keep_glb_color) and supply only the
    # physics. They are reached exclusively from ANON_RULES, i.e. for meshes
    # whose material is one of the exporter's anonymous `mat:#rrggbb` colours —
    # the per-product colours out of src/core/catalog.ts. Without them a sofa
    # cushion and a steel leg get the same flat Lambertian guess; with them the
    # catalog colour survives and the surface still behaves like what it is.
    'soft-goods': Surface(
        note='Upholstery/bedding of unknown colour: the catalog colour with real '
             'cloth behaviour (sheen + a weave bump + a broad mottle).\n'
             'COVERAGE, which turned out to matter more than any number in the '
             '`weave` recipe: widening the ANON_RULES pattern to include /back, '
             '/arm, /arm-l, /arm-r and /headboard took this surface from 4 slots to '
             '9 on b-fold-away. 284 anonymous slots in that frame still reach no '
             'rule at all, but the great majority of them are the 43-leaf fiddle-leaf '
             'fig (petiole, midrib and leaf parts), which wants a foliage rule, not '
             'a cloth one.\n'
             'NOT VERIFIED AT ROOM DISTANCE, stated plainly: b-fold-away contains no '
             'sofa and no cushions, so the largest soft-goods surface in any of its '
             'frames is a 60x105 px task-chair back. Doubling the mottle depth on '
             'that patch moved its mean 92.0 -> 86.8 and its std 17.0 -> 17.7, which '
             'proves the recipe is wired and live but is far too small a sample to '
             'show whether a cushion now reads as cloth across a room. Re-check on '
             'c-lounge-wall or d-two-rooms before trusting the weave pitch.',
        base='#8b8678', rough=0.86, sheen=0.5, sheen_rough=0.32,
        texture='weave', keep_glb_color=True,
    ),
    'pile-goods': Surface(
        note='Rug/pile of unknown colour: coarse relief, maximum roughness.',
        base='#9d9a8b', rough=0.97, sheen=0.2, sheen_rough=0.6,
        texture='pile', keep_glb_color=True,
    ),
    'timber-goods': Surface(
        note='Furniture timber of unknown colour: oiled wood with a grain '
             'streak, so legs and frames stop looking like painted plastic.',
        base='#a87d4d', rough=0.44, coat=0.10, coat_rough=0.20,
        texture='grain', keep_glb_color=True,
    ),
    'shell-goods': Surface(
        note='A moulded / painted equipment enclosure of unknown colour: '
             'projector and speaker cabinets, appliance plastics. Satin ABS or '
             'lacquered MDF is a smooth dielectric under a thin hard coat, which '
             'is what separates a piece of hi-fi from a piece of furniture in a '
             'render — it has a soft highlight and no grain at all.',
        base='#cfccc6', rough=0.40, coat=0.18, coat_rough=0.08,
        keep_glb_color=True,
    ),
}

# Aliases: one surface known by several names. Two sources of drift, both real:
#   - src/render3d/materials.ts is being revised alongside this file (it renamed
#     floor-oak -> floor-walnut, ceiling -> concrete-soffit and so on to match
#     the photo), and a render must not break because a name moved;
#   - the same physical surface is reached through more than one MAT key.
# Old names are kept here deliberately, not deleted.
ALIASES: dict[str, str] = {
    'floor-oak': 'floor-walnut',        # pre-photo-correction name
    'floor': 'floor-walnut',
    'floor-wood': 'floor-walnut',
    'ceiling': 'concrete-soffit',       # pre-photo-correction name
    'concrete': 'concrete-soffit',
    'cabinet': 'cabinet-base-pale',     # pre-photo-correction name
    'cabinet-dark-upper': 'cabinet-upper-dark',
    'frame-black-alu': 'anodised-black',
    'mullion': 'anodised-black',
    'frame-dark': 'anodised-black',
    'glass-black': 'cooktop-black-glass',
    'wall-outer-face': 'wall-outer',
    'steel': 'steel-brushed',
    'appliance': 'steel-brushed',
}

# Object-name rules, FIRST MATCH WINS, checked before the material name.
# Object names are set in src/render3d/build.ts + furniture.ts.
OBJECT_RULES: list[tuple[str, str]] = [
    # PHOTO: dark charcoal-brown slab-front UPPERS over pale bases. build.ts has
    # painted both with one `cabinet` material, so the only discriminator that
    # survives the export is the fixture id (plan.ts: 'UPPERS' is the wall run).
    # Harmless if the exporter starts distinguishing them itself.
    (r'^fixture:UPPERS/(carcass|front-)', 'cabinet-upper-dark'),
    # PHOTO: glazing is black anodised aluminium. build.ts trims every opening
    # with MAT.trim (white enamel — correct for the interior doors), so window
    # casings have to be picked out by opening id: plan.ts names windows WIN1..n
    # and doors D1..n. Plus the muntin, which only windows have.
    #
    # The (?!glass|pane) is not optional. The pane inside the same opening group
    # is `opening:WIN1/glass`, and painting THAT black anodised aluminium turns
    # the glazing into a solid metal wall — a completely black interior that
    # still looks like a plausible render at first glance. (It cost an hour.)
    (r'^opening:WIN\d*/(?!glass|pane)', 'anodised-black'),
    (r'/muntin$', 'anodised-black'),
    # The current build.ts builds the glazing as a real assembly under
    # `glazing:<opening id>` and paints every member with MAT.metalBlack — which
    # is POWDER-COATED STEEL (a thick pigmented layer, only part metallic), not
    # the black ANODISED ALUMINIUM the photo shows (bare metal under a thin
    # oxide). materials.ts even provides MAT.mullion for exactly this and it goes
    # unused. Rather than let furniture legs and window mullions share one spec,
    # the glazing members are named out here. Reported upstream; harmless once
    # build.ts switches to MAT.mullion, because that name maps here too.
    (r'^glazing:[^/]+/(frame-jamb|frame-head|frame-sill|track|mullion|transom)$', 'anodised-black'),
    (r'^glazing:[^/]+/(leaf-stile|leaf-bottom-rail|leaf-top-rail|leaf-rail|handle)$', 'anodised-black'),
    # PHOTO: black glass cooktop, dark oven front, tiled splash.
    (r'/cooktop-glass$', 'cooktop-black-glass'),
    (r'/burner$', 'steel-dark'),
    (r'/backsplash$', 'tile'),
]

# Rules that apply ONLY to anonymous `mat:#rrggbb` materials, where the
# alternative is a blind Lambertian guess. Deliberately conservative: every
# pattern below is a part name that can only be one kind of thing.
# (furniture.ts names sub-meshes `${item}/cushion`, `/pillow`, `/leg`, ...)
ANON_RULES: list[tuple[str, str]] = [
    # `back`, `arm`, `arm-l`, `arm-r` and `headboard` are ADDED here, and the
    # ambiguity check is worth writing down because it is what makes the rule safe.
    # furniture.ts uses `/back` for BOTH an upholstered sofa/chair back (lines
    # ~599, ~850, ~868, ~892) and a bookcase back PANEL (~955) — but the panel is
    # built with MAT.cabinetDark, a NAMED material, so it resolves through SURFACES
    # and can never reach ANON_RULES. Everything that arrives here with a `/back`
    # and an anonymous `mat:#rrggbb` colour is therefore cloth. Same for the arms
    # and the headboard.
    #
    # This matters more than it looks: MEASURED on b-fold-away, 289 of the 297
    # anonymous slots in the frame match NO rule below and go to the plain
    # Principled fallback with no recipe at all, so `_weave` was reaching four
    # slots in the whole apartment. Widening the rule is a bigger lever on
    # "upholstery has no texture at room distance" than any number inside the
    # recipe.
    (r'/(seat|cushion|back|back-cushion-\d+|return-seat|arm|arm-l|arm-r|headboard'
     r'|pillow|duvet|mattress|fold-\d+)$', 'soft-goods'),
    (r'/(pile|field)$', 'pile-goods'),
    (r'/(leg|leg-\d+|plinth|return-plinth|pedestal|column)$', 'timber-goods'),
    # Projection + AV parts whose material goes anonymous the moment a catalog
    # entry names its own colour: screen fabric, a dropped blind, grille cloth.
    # All three are woven textiles over a void, so soft-goods is the right
    # physics and keep_glb_color preserves the product's real colour.
    (r'/(fabric|blind|blind-cell-\d+|grille)$', 'soft-goods'),
    # Equipment enclosures: a projector shell or a speaker cabinet is lacquer or
    # satin ABS, NOT timber, and must not pick up a grain streak. `/body` is
    # deliberately NOT in this list — three other builders use it for upholstery
    # and for appliance steel, so the projector's own part is named `/shell`.
    (r'/(shell|cabinet|lens-hood|top-plate)$', 'shell-goods'),
]

# Materials no OBJECT_RULE may override, whatever the object is called.
PROTECTED: dict[str, str] = {'glass': 'glass'}

_COMPILED_RULES: list[tuple[re.Pattern[str], str]] = [(re.compile(p), k) for p, k in OBJECT_RULES]
_COMPILED_ANON: list[tuple[re.Pattern[str], str]] = [(re.compile(p), k) for p, k in ANON_RULES]


# ----------------------------------------------------------------- node helpers

def _sock(node: bpy.types.Node, name: str, typ: str | None = None, which: int = 0):
    """Input socket by name (and optionally by socket type).

    Needed because Blender 4.x nodes carry several same-named sockets for
    different data types — ShaderNodeMix has three 'A'/'B' pairs — and the
    indices of those are an implementation detail that has moved between
    releases. Name+type is stable.
    """
    hits = [s for s in node.inputs if s.name == name and (typ is None or s.type == typ)]
    if not hits:
        raise KeyError(f'{node.bl_idname} has no input {name!r} of type {typ}')
    return hits[which]


def _out(node: bpy.types.Node, typ: str, which: int = 0):
    hits = [s for s in node.outputs if s.type == typ]
    if not hits:
        raise KeyError(f'{node.bl_idname} has no {typ} output')
    return hits[which]


class NT:
    """Tiny wrapper over a node tree: makes the recipes below readable."""

    def __init__(self, tree: bpy.types.NodeTree) -> None:
        self.t = tree
        self._x = -400.0
        self._y = 0.0

    def new(self, kind: str, **props):
        n = self.t.nodes.new(kind)
        self._x += 30.0
        self._y -= 60.0
        n.location = (self._x, self._y)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def link(self, a, b) -> None:
        self.t.links.new(a, b)

    # -- arithmetic ------------------------------------------------------
    def math(self, op: str, a, b=None, c=None, clamp: bool = False):
        n = self.new('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if hasattr(v, 'links') or hasattr(v, 'is_linked'):
                self.link(v, n.inputs[i])
            else:
                n.inputs[i].default_value = float(v)
        return n.outputs[0]

    def vmath(self, op: str, a, b=None, scale=None):
        n = self.new('ShaderNodeVectorMath', operation=op)
        if hasattr(a, 'is_linked'):
            self.link(a, n.inputs[0])
        else:
            n.inputs[0].default_value = a
        if b is not None:
            if hasattr(b, 'is_linked'):
                self.link(b, n.inputs[1])
            else:
                n.inputs[1].default_value = b
        if scale is not None:
            n.inputs['Scale'].default_value = scale
        return n.outputs[0]

    def combine(self, x, y, z=0.0):
        n = self.new('ShaderNodeCombineXYZ')
        for i, v in enumerate((x, y, z)):
            if hasattr(v, 'is_linked'):
                self.link(v, n.inputs[i])
            else:
                n.inputs[i].default_value = float(v)
        return n.outputs[0]

    def separate(self, vec):
        n = self.new('ShaderNodeSeparateXYZ')
        self.link(vec, n.inputs[0])
        return n.outputs[0], n.outputs[1], n.outputs[2]

    def world_pos(self):
        return self.new('ShaderNodeNewGeometry').outputs['Position']

    def remap(self, v, from_min, from_max, to_min, to_max, clamp: bool = True):
        n = self.new('ShaderNodeMapRange', clamp=clamp)
        self.link(v, n.inputs['Value'])
        n.inputs['From Min'].default_value = from_min
        n.inputs['From Max'].default_value = from_max
        n.inputs['To Min'].default_value = to_min
        n.inputs['To Max'].default_value = to_max
        return n.outputs[0]

    def mix_color(self, fac, a: str | tuple, b: str | tuple):
        n = self.new('ShaderNodeMix', data_type='RGBA')
        if hasattr(fac, 'is_linked'):
            self.link(fac, _sock(n, 'Factor', 'VALUE'))
        else:
            _sock(n, 'Factor', 'VALUE').default_value = float(fac)
        for name, v in (('A', a), ('B', b)):
            s = _sock(n, name, 'RGBA')
            if hasattr(v, 'is_linked'):
                self.link(v, s)
            else:
                s.default_value = srgb(v) if isinstance(v, str) else v
        return _out(n, 'RGBA')

    def noise(self, vec, scale: float, detail: float = 6.0, rough: float = 0.55,
              distortion: float = 0.0, dims: str = '3D'):
        n = self.new('ShaderNodeTexNoise', noise_dimensions=dims)
        self.link(vec, n.inputs['Vector'])
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        n.inputs['Distortion'].default_value = distortion
        return n.outputs['Fac']

    def white(self, vec):
        n = self.new('ShaderNodeTexWhiteNoise', noise_dimensions='3D')
        self.link(vec, n.inputs['Vector'])
        return n.outputs['Value']

    def bump(self, height, strength: float, distance: float, normal_in=None):
        n = self.new('ShaderNodeBump')
        self.link(height, n.inputs['Height'])
        n.inputs['Strength'].default_value = strength
        n.inputs['Distance'].default_value = distance
        if normal_in is not None:
            self.link(normal_in, n.inputs['Normal'])
        return n.outputs['Normal']


def _base_of(bsdf: bpy.types.Node) -> tuple:
    """The base colour already on the BSDF.

    Recipes that mix a colour must start from THIS, not from Surface.base: for a
    keep_glb_color surface the effective albedo is the catalog colour out of the
    glb, and reading it back here is what lets one recipe serve both cases.
    """
    return tuple(bsdf.inputs['Base Color'].default_value)


def _set(bsdf: bpy.types.Node, name: str, value) -> None:
    """Set a Principled input by name, tolerating renames across releases."""
    for s in bsdf.inputs:
        if s.name == name:
            s.default_value = value
            return
    raise KeyError(f'Principled BSDF has no {name!r} input (Blender version drift?)')


# ----------------------------------------------------------------- recipes
# A recipe adds procedural nodes to `nt` and wires them into `bsdf`. It may
# override Base Color / Roughness / Normal; everything else stays as the
# Surface's scalar values.

Recipe = Callable[[NT, bpy.types.Node, Surface], None]


def _planks(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Dark wide-plank walnut.

    Real product this is modelled on: 7 1/2" x random-length engineered walnut,
    micro-bevelled edges, satin (~25 sheen) factory finish — the standard spec
    for this kind of building, and what the photo shows.

    Geometry: boards run EAST-WEST (long dimension along +x), which is how the
    seams run in the reference photo (they converge toward the west glazing).
    Everything is driven off WORLD position so the pattern is continuous across
    the whole floor mesh and across any object that shares the material.
    """
    W = 7.5 * IN          # board width, across the run (y)
    L = 4.0 * FT          # nominal board length (x); real runs are 1'-7'
    BEVEL = 0.28 * IN     # micro-bevel at every joint

    pos = nt.world_pos()
    px, py, _pz = nt.separate(pos)

    # row = which board across the floor; rowf's fraction = position within it
    rowf = nt.math('DIVIDE', py, W)
    row = nt.math('FLOOR', rowf)
    rowfrac = nt.math('FRACT', rowf)

    # Each row is staggered by a random fraction of a board length, so end
    # joints never line up across rows (that giveaway "tiled" look).
    stagger = nt.white(nt.combine(nt.math('MULTIPLY', row, 7.31), 0.0, 0.0))
    colf = nt.math('ADD', nt.math('DIVIDE', px, L), stagger)
    col = nt.math('FLOOR', colf)
    colfrac = nt.math('FRACT', colf)

    # one stable random number per board
    brd = nt.white(nt.combine(nt.math('MULTIPLY', col, 1.7),
                              nt.math('MULTIPLY', row, 3.1), 0.0))

    # Grain: noise stretched hard along the board so it reads as figure, not
    # blotches. 0.5/14 = grain features ~2' long and ~1" across.
    grain_vec = nt.vmath('MULTIPLY', pos, (0.55, 14.0, 1.0))
    grain = nt.noise(grain_vec, scale=3.0, detail=8.0, rough=0.6)
    # a second, coarser layer for the darker heartwood streaks
    streak = nt.noise(nt.vmath('MULTIPLY', pos, (0.25, 5.0, 1.0)), scale=2.0, detail=4.0)

    # Tone: per-board value first (boards differ more than grain does), then grain.
    # The whole ladder is lifted ~1 stop from the first version — see the VALUE
    # paragraph in the floor-walnut note — and the darkest term (the heartwood
    # streak) is deliberately kept narrow, because in the photo the plank-to-plank
    # variation is much more visible than the within-board figure.
    board_tone = nt.mix_color(nt.remap(brd, 0.0, 1.0, 0.0, 1.0), '#594436', '#826b55')
    with_grain = nt.mix_color(nt.remap(grain, 0.25, 0.85, 0.0, 0.35), board_tone, '#514036')
    albedo = nt.mix_color(nt.remap(streak, 0.4, 0.9, 0.0, 0.22), with_grain, '#86705f')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))

    # Roughness: a satin floor is not uniform. Per-board variation is what stops
    # the whole floor sharing one mirror highlight, which is the tell.
    r = nt.math('ADD', s.rough, nt.math('MULTIPLY_ADD', brd, 0.07, -0.035))
    r = nt.math('ADD', r, nt.math('MULTIPLY_ADD', grain, 0.06, -0.03), clamp=False)
    nt.link(nt.remap(r, 0.0, 1.0, 0.0, 1.0), _sock(bsdf, 'Roughness', 'VALUE'))

    # The COAT still carries some of the window reflection, so it keeps the same
    # per-board break-up: a floor whose whole surface shares one perfectly uniform
    # specular sheet is the other way this material reads as plastic. +/-40% of the
    # nominal coat roughness is what a real site-laid floor shows — boards take the
    # finish slightly differently and traffic polishes them unevenly.
    nt.link(nt.remap(brd, 0.0, 1.0, s.coat_rough * 0.6, s.coat_rough * 1.4),
            _sock(bsdf, 'Coat Roughness', 'VALUE'))

    # Where the joints are. Used for ALBEDO ONLY — see the NORMAL block below.
    dx = nt.math('MULTIPLY', nt.math('MINIMUM', colfrac, nt.math('SUBTRACT', 1.0, colfrac)), L)
    dy = nt.math('MULTIPLY', nt.math('MINIMUM', rowfrac, nt.math('SUBTRACT', 1.0, rowfrac)), W)
    joint = nt.remap(nt.math('MINIMUM', dx, dy), 0.0, BEVEL, 0.0, 1.0)

    # The joint is DARKER, and that is the whole of how it is drawn now. A micro-
    # bevel is end-grain and cut face: the factory finish is thinner there and the
    # groove holds dust, so every real plank floor shows its joints as thin DARK
    # hairlines.
    albedo = nt.mix_color(
        nt.math('MULTIPLY', nt.math('SUBTRACT', 1.0, joint), 0.6), albedo, '#2c211c')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))

    # THE BEVEL IS DELIBERATELY NOT IN THE NORMAL, and this is a correction of a
    # previous fix that did not work. The version before this one darkened the
    # joint albedo (above) and ALSO fed the bevel groove into a Bump node, with a
    # comment claiming the pale-hairline artefact was solved. Measured on eye-hero:
    # it was not. In the glare sheet in front of the glazing every joint was still
    # a pale line, and the patch std was 66/74/82 against the photo's 11/14/14.
    #
    # Why the albedo fix cannot work while the bevel is in the normal: a groove's
    # slanted walls TILT toward the glazing, so they mirror a 200-nit sky into the
    # camera. That specular term is added on top of the albedo, so darkening the
    # albedo underneath it changes nothing — it is the geometry that draws the
    # line. On a real floor the bevel is ~1/64" and at 8-20 ft it is far below a
    # pixel, so carrying it in the normal at all was over-modelling.
    #
    # What is left is the per-board height offset, which is a real thing (site-laid
    # boards are never perfectly coplanar) and is smooth WITHIN a board. It is
    # driven through the grain so the Bump node sees a continuous field instead of
    # a step at every board edge — a step would draw exactly the hairline this
    # block exists to remove.
    micro = nt.math('ADD', nt.math('MULTIPLY', grain, 0.6),
                    nt.math('MULTIPLY', brd, 0.4))
    nt.link(nt.bump(micro, strength=0.08, distance=0.12 * IN),
            _sock(bsdf, 'Normal', 'VECTOR'))


def _concrete(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Exposed concrete soffit: patchy grey, very subtle relief.

    The photo's soffit is a smooth-formed slab, so the variation is in VALUE and
    ROUGHNESS (curing blotches, form-release staining), not in shape. Overdo the
    bump and it turns into stucco.
    """
    pos = nt.world_pos()
    # BLOTCH SCALE. `scale * prescale` is 1/feature-size in FEET, so the pair
    # below is a ~2 ft blotch (4.0 * 0.12 = 0.48 -> 1/0.48 = 2.1 ft). It used to
    # be 2.2 * 0.30 = 1.5 ft, which is decimetre-scale form-release mottling: at
    # 8-14 ft from the camera that averages out inside a couple of pixels and the
    # soffit reads as one flat value.
    #
    # MEASURED, and worth recording because the obvious move is the wrong one:
    # going to metre-and-a-bit blotches made it WORSE. scale 0.8 * prescale 0.12
    # is a 10.4 ft feature, and at 10 ft the entire visible soffit sits inside one
    # or two blotches, so the variation stops being visible AS variation — the
    # 700x75 px soffit patch on eye-living went from std 15.0 to 14.8 rather than
    # up. 2 ft is the size that puts several blotches inside that patch AND
    # survives the foreshortening: the soffit runs 20 ft away from the camera
    # inside 80 px of image height, so anything metre-scale is one band, not a
    # pattern.
    #
    # detail 3.0, not 8.0: at detail 8 the fractal octaves make the blotches read
    # as cumulus. Curing and form-release blotching on a smooth-formed slab is
    # smooth-edged, so the octaves are spent rather than saved.
    patch = nt.noise(nt.vmath('MULTIPLY', pos, (0.12, 0.12, 0.12)), scale=4.0, detail=3.0, rough=0.55)
    fine = nt.noise(nt.vmath('MULTIPLY', pos, (2.0, 2.0, 2.0)), scale=6.0, detail=6.0)

    # Both blotch tones are COOL greys (B > R), matching the measurement in the
    # concrete-soffit note. Form-release staining darkens and slightly warms, which
    # is why the fine layer is the least blue of the three.
    #
    # THESE THREE HEXES, NOT `Surface.base`, ARE WHAT THE CAMERA SEES. This recipe
    # overrides Base Color outright, so `concrete-soffit.base` is documentation
    # only (it is the nominal albedo the three tones average to) — changing it
    # alone moves nothing, which is a trap worth naming.
    #
    # VALUE, calibrated not guessed. The old pair averaged to an effective albedo
    # of sRGB ~148,159,166 and rendered the eye-living soffit at 105,118,128
    # against the photo's 136,153,158 — 0.4 stop dark.
    #
    # The response was measured, not assumed: one render at these albedos and one
    # with all three hexes scaled by exactly 1.30 in LINEAR gave 116.9 -> 131.0 on
    # the soffit band, so display value goes as (linear albedo)^0.434 —
    # ln(1.1206)/ln(1.30). That is close to a plain 2.3 gamma; AgX at this exposure
    # is not doing anything exotic to a mid-grey ceiling. (An earlier estimate of
    # ^0.94 was wrong: it came from two renders where the BLOTCH GEOMETRY had also
    # changed, so the patches were not sampling comparable pattern.)
    #
    # The pair below averages to an effective albedo of sRGB ~181,191,198, which is
    # 0.44/0.52/0.57 linear — luminous reflectance 0.52. That is the TOP of the band
    # for a pale smooth-formed slab (light concrete is 0.40-0.50) and it is where
    # this stops on purpose. See the `concrete-soffit` note for the arithmetic
    # showing that going further, to the ~0.64-0.78 the photo's numbers would
    # require, means putting white paint on a material called concrete to compensate
    # for a lighting deficit — which would then blow out the moment the lighting is
    # fixed.
    #
    # SPAN — and the previous version of this paragraph GOT THIS WRONG, in a way
    # worth writing down because it is a general trap and not a typo. It read:
    #
    #     "the remap is deliberately TIGHT (0.40-0.60) because that clips the
    #      noise's tails and makes the field read as discrete PATCHES ... MEASURED,
    #      that window is what bought the variance: at remap 0.30-0.70 the soffit
    #      band was std 7.3/5.5/5.1, at 0.40-0.60 it is 11.5/10.3/10.3, same mean.
    #      The photo's own band is std 16.0/19.5/25.3"
    #
    # Those three numbers are all real. The inference from them is not, and the
    # same paragraph said why two sentences later without acting on it: MOST OF THE
    # PHOTO'S BAND STD IS THE ILLUMINATION FALLOFF, so "band std" is not a texture
    # statistic and cannot be used to tune one. Tuning an albedo pattern until its
    # band std matched the photo's put ~1.9x the photo's high-frequency contrast on
    # the ceiling, and the visible result was a soffit that read as THUNDERCLOUD —
    # 2 ft blotches at a 1.86x albedo ratio, hard-edged because of the clipping.
    #
    # SEPARATE THE TWO COMPONENTS AND THE RIGHT TARGET FALLS OUT. Take the soffit
    # band, average it into 40 px-wide columns (that is the low-frequency
    # illumination ramp) and separately subtract an 18 px gaussian blur (that is
    # everything finer than a blotch):
    #
    #                                       GRADIENT      HIGH-FREQ
    #                                  (std of col means)  (std of L - blur18)
    #   photo, x180-700 y15-95                 18.9              2.3
    #   render BEFORE this change, 3 layouts   6.9-10.1          4.1
    #   render AFTER, 3 layouts                4.5-8.9           1.7
    #   ditto on eye-kitchen (steeper angle)      --      5.6 -> 2.1
    #
    # (Mask the downlight discs out of that patch before you measure it — they are
    # legitimately clipped bright features now, and left in they read as texture:
    # unmasked, the AFTER figure comes out at 8.4 rather than 1.7.)
    #
    # The photo's soffit is essentially SMOOTH — a residual std of 2.2 at this JPEG
    # size is compression noise, not mottling — and its column means fall
    # MONOTONICALLY 181 -> 135 away from the glazing. Ours were non-monotonic
    # (126,123,116,110,110,119,122,128,131,...): a W, which is the blotch field
    # showing through as if it were lighting. So the whole of the photo's variance
    # is the gradient, we have half the gradient we should, and we had twice the
    # texture. Confirming again, from the other side, that GAP 11 is a lighting
    # deficit: see the `concrete-soffit` note.
    #
    # SO: tone ratio 1.86x -> 1.50x, and the remap window goes back OUT to
    # 0.28-0.72 so the field is an un-clipped smooth mottle instead of hard patches.
    # The pair below is computed to preserve the LINEAR mean of the old pair exactly
    # (lo = mean*2/(1+k), hi = k*lo at k=1.50), so this costs nothing in value: the
    # effective albedo is still sRGB ~#b3bfc6 = 0.45/0.52/0.57 linear. Feature size
    # is left at 2 ft, which is the right physical scale for form-release blotching;
    # it was never the scale that was wrong, only the contrast.
    #
    # k WAS PICKED BY MEASUREMENT, in two passes, against the high-freq column of
    # the table above. k=1.25 with this window gave a residual std of 1.22-1.26 —
    # a real overshoot in the other direction, smoother than the photograph — so k
    # went to 1.50, which lands 1.68. The log-of-the-ratio extrapolation used to
    # pick 1.50 predicted 2.25 and it came out at 1.68, so RECORD THAT AS A MISS:
    # the response is sub-logarithmic here, presumably because the 18 px blur that
    # defines "high frequency" is itself removing part of a 2 ft blotch. Left at
    # 1.50 rather than pushed to ~2.0 for a third pass, because some of the photo's
    # 2.3 is JPEG noise rather than concrete and being slightly UNDER the
    # photograph's texture is the safe side of a number that, overdone, produced a
    # thundercloud. Anything in 1.5-2.3 is defensible; this is a JUDGEMENT inside a
    # measured bracket, not a match.
    #
    # DO NOT tune this against a wide-patch std again. If you want more variance in
    # the soffit band, it has to come from the light.
    tone = nt.mix_color(nt.remap(patch, 0.28, 0.72, 0.0, 1.0), '#a2adb3', '#c3d0d7')
    albedo = nt.mix_color(nt.remap(fine, 0.4, 0.85, 0.0, 0.22), tone, '#a8b5bc')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))
    nt.link(nt.remap(patch, 0.2, 0.8, s.rough - 0.08, s.rough + 0.10),
            _sock(bsdf, 'Roughness', 'VALUE'))
    nt.link(nt.bump(fine, strength=0.08, distance=0.15 * IN), _sock(bsdf, 'Normal', 'VECTOR'))


def _plaster(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Flat paint on skim coat: only enough relief to kill the plastic look."""
    pos = nt.world_pos()
    n = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 1.0)), scale=9.0, detail=6.0)
    nt.link(nt.remap(n, 0.3, 0.8, s.rough - 0.05, s.rough + 0.05),
            _sock(bsdf, 'Roughness', 'VALUE'))
    nt.link(nt.bump(n, strength=0.05, distance=0.08 * IN), _sock(bsdf, 'Normal', 'VECTOR'))


def _brushed(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Brushed stainless.

    Two parts: the Principled `Anisotropic` value (set from the Surface) plus a
    fine directional roughness streak, which is what actually makes brushing
    visible — anisotropy alone only stretches the highlight.

    The brush direction comes from a Tangent node, RADIAL about the object's own
    Z axis. On the flat vertical fronts of appliances that produces roughly
    HORIZONTAL tangents, which is how appliance panels are really brushed. It
    also needs no UVs, and the glb's UVs are box-mapped junk on most of these.
    """
    tan = nt.new('ShaderNodeTangent', direction_type='RADIAL', axis='Z')
    nt.link(tan.outputs['Tangent'], _sock(bsdf, 'Tangent', 'VECTOR'))

    pos = nt.world_pos()
    # 90x anisotropic stretch = streaks along the brush, ~1/300 ft across
    streak = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 90.0)), scale=30.0, detail=2.0, rough=0.4)
    nt.link(nt.remap(streak, 0.25, 0.75, max(0.02, s.rough - 0.06), s.rough + 0.06),
            _sock(bsdf, 'Roughness', 'VALUE'))
    nt.link(nt.bump(streak, strength=0.06, distance=0.02 * IN), _sock(bsdf, 'Normal', 'VECTOR'))


def _stone(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Engineered quartz: a very fine, very low-contrast speckle.

    Low contrast is the whole point — a strong speckle reads as granite, and the
    photo's counter is a plain pale quartz. The speckle exists to give the eye a
    scale reference on an otherwise featureless slab.
    """
    pos = nt.world_pos()
    fleck = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 1.0)), scale=90.0, detail=3.0, rough=0.5)
    cloud = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 1.0)), scale=4.0, detail=5.0)
    tone = nt.mix_color(nt.remap(cloud, 0.35, 0.7, 0.0, 0.35), _base_of(bsdf), '#d8d4ca')
    albedo = nt.mix_color(nt.remap(fleck, 0.45, 0.8, 0.0, 0.30), tone, '#b9b4a8')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))


def _grain(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Oiled solid timber for furniture: grain in colour + roughness, no joints."""
    pos = nt.world_pos()
    g = nt.noise(nt.vmath('MULTIPLY', pos, (0.6, 16.0, 1.0)), scale=4.0, detail=8.0, rough=0.6)
    albedo = nt.mix_color(nt.remap(g, 0.3, 0.8, 0.0, 0.4), _base_of(bsdf), '#3f2a1b')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))
    nt.link(nt.remap(g, 0.3, 0.8, s.rough - 0.06, s.rough + 0.06), _sock(bsdf, 'Roughness', 'VALUE'))


def _weave(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Cloth: a two-axis weave in the normal, plus a broad albedo mottle.

    SCALE, and it was wrong by more than an order of magnitude. The previous
    version was noise scale 25 with a 60x anisotropic prescale, i.e. 1500 cycles
    per FOOT — a 1/125" thread pitch — with a bump distance of 0.06*IN, about
    1/300 ft of relief. At the 8-12 ft the camera actually stands from a sofa,
    one pixel covers roughly 0.15", so every one of those threads averaged out
    inside a single pixel: the weave was present in the shader, invisible in the
    frame, and cost samples to resolve as noise. A cushion read as one flat
    value, which is the tell.

    The numbers below are the real product geometry instead: 8 x 1.5 prescale at
    noise scale 6 is 48 cycles/ft along the tight axis, a 1/4" pitch, which is a
    coarse upholstery weave (a chenille or a heavy linen) and is 1-2 px wide
    across a room rather than 1/50 of one. Relief goes to 0.25*IN to match — the
    ridge of a 1/4" pitch weave really is a couple of hundredths of an inch.

    THE MOTTLE IS THE OTHER HALF, and arguably the bigger half. Real upholstery
    is not one albedo: dye takes unevenly, the nap lies differently over a crown
    than in a valley, and light-scattering in a pile makes the same cloth read
    several percent lighter where it is compressed. A 10" low-frequency mottle at
    +/-8% is what stops a cushion being a flat-shaded polygon. It is read off
    `_base_of` so it works for the keep_glb_color surfaces (soft-goods etc.),
    where the albedo is a catalog colour this file never sees.

    Stated as an approximation: the pitch is a plausible product spec chosen to
    be legible at room distance, not a measurement off the reference photo —
    that frame is an empty unit and has no upholstery in it at all.
    """
    pos = nt.world_pos()
    warp = nt.noise(nt.vmath('MULTIPLY', pos, (8.0, 1.5, 8.0)), scale=6.0, detail=2.0)
    weft = nt.noise(nt.vmath('MULTIPLY', pos, (1.5, 8.0, 1.5)), scale=6.0, detail=2.0)
    mixed = nt.math('MULTIPLY', warp, weft)

    # Broad albedo mottle: ~10" features, mixing the surface's own colour toward a
    # slightly darker and slightly desaturated version of itself. Keeping it
    # relative to _base_of means one recipe serves both the named fabrics and the
    # anonymous catalog colours.
    broad = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 1.0)), scale=1.2, detail=4.0)
    b = _base_of(bsdf)
    shade = (b[0] * 0.80, b[1] * 0.81, b[2] * 0.84, 1.0)
    lift = (min(1.0, b[0] * 1.14), min(1.0, b[1] * 1.13), min(1.0, b[2] * 1.11), 1.0)
    nt.link(nt.mix_color(nt.remap(broad, 0.32, 0.72, 0.0, 1.0), shade, lift),
            _sock(bsdf, 'Base Color', 'RGBA'))

    nt.link(nt.remap(mixed, 0.1, 0.6, s.rough - 0.06, s.rough + 0.04), _sock(bsdf, 'Roughness', 'VALUE'))
    nt.link(nt.bump(mixed, strength=0.25, distance=0.25 * IN), _sock(bsdf, 'Normal', 'VECTOR'))


def _pile(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """Cut-pile rug: coarse clumpy relief, ~1/4" tuft scale."""
    pos = nt.world_pos()
    tuft = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 1.0)), scale=110.0, detail=3.0, rough=0.7)
    broad = nt.noise(nt.vmath('MULTIPLY', pos, (1.0, 1.0, 1.0)), scale=8.0, detail=4.0)
    albedo = nt.mix_color(nt.remap(broad, 0.35, 0.75, 0.0, 0.25), _base_of(bsdf), '#7e7b6d')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))
    nt.link(nt.bump(tuft, strength=0.6, distance=0.4 * IN), _sock(bsdf, 'Normal', 'VECTOR'))


def _curtainwall(nt: NT, bsdf: bpy.types.Node, s: Surface) -> None:
    """The adjacent tower's facade: a mullion grid over panel-to-panel variation.

    Real curtain wall: ~5' x 11' vision panels (one storey), aluminium caps
    between them. Each panel differs slightly — blinds, spandrel, what is behind
    the glass — and that per-panel variation is what makes a tower read as a
    tower rather than a mirror slab.
    """
    PW, PH = 5.0 * FT, 11.0 * FT
    pos = nt.world_pos()
    px, py, pz = nt.separate(pos)
    # panel index: horizontal runs along whichever of x/y is longer; this facade
    # faces east (it is west/north of us), so its long axis is y.
    cu = nt.math('DIVIDE', py, PW)
    cv = nt.math('DIVIDE', pz, PH)
    fu, fv = nt.math('FRACT', cu), nt.math('FRACT', cv)
    panel = nt.white(nt.combine(nt.math('FLOOR', cu), nt.math('FLOOR', cv), 0.0))

    tone = nt.mix_color(nt.remap(panel, 0.0, 1.0, 0.0, 1.0), '#2f3b45', '#6d7f8b')
    # mullion caps: a 3" band at every panel joint, in dark anodised aluminium
    band_u = nt.remap(nt.math('MULTIPLY', nt.math('MINIMUM', fu, nt.math('SUBTRACT', 1.0, fu)), PW),
                      0.0, 4.0 * IN, 1.0, 0.0)
    band_v = nt.remap(nt.math('MULTIPLY', nt.math('MINIMUM', fv, nt.math('SUBTRACT', 1.0, fv)), PH),
                      0.0, 4.0 * IN, 1.0, 0.0)
    band = nt.math('MAXIMUM', band_u, band_v)
    albedo = nt.mix_color(band, tone, '#3a3d41')
    nt.link(albedo, _sock(bsdf, 'Base Color', 'RGBA'))
    # glass is glossy, the caps are not
    nt.link(nt.remap(band, 0.0, 1.0, s.rough, 0.45), _sock(bsdf, 'Roughness', 'VALUE'))
    # slight per-panel metallicity: vision glass mirrors the sky, spandrel does not
    nt.link(nt.remap(panel, 0.0, 1.0, 0.15, 0.55), _sock(bsdf, 'Metallic', 'VALUE'))


RECIPES: dict[str, Recipe] = {
    'planks': _planks,
    'concrete': _concrete,
    'plaster': _plaster,
    'brushed': _brushed,
    'stone': _stone,
    'grain': _grain,
    'weave': _weave,
    'pile': _pile,
    'curtainwall': _curtainwall,
}


# ----------------------------------------------------------------- build

def _haze(nt: NT, tree: bpy.types.NodeTree, bsdf: bpy.types.Node, out: bpy.types.Node,
          distance_ft: float) -> None:
    """Aerial perspective, cheaply.

    Real haze is a participating medium, and a volume big enough to cover the
    outlook would cost more than the interior does. Instead: mix the surface
    toward the sky's own colour as a function of distance from the camera, which
    is what atmospheric scattering looks like from inside a building on a hazy
    day. Cost is one extra shader mix; the alternative is a city that looks
    painted on.
    """
    cam = nt.new('ShaderNodeCameraData')
    fac = nt.remap(cam.outputs['View Z Depth'], distance_ft * 0.25, distance_ft, 0.0, 0.40)
    sky = nt.new('ShaderNodeBackground')
    # matched by eye to the Nishita horizon in render.py's world
    sky.inputs['Color'].default_value = srgb('#c3ccd1')
    sky.inputs['Strength'].default_value = 0.8
    mix = nt.new('ShaderNodeMixShader')
    nt.link(fac, mix.inputs['Fac'])
    nt.link(bsdf.outputs['BSDF'], mix.inputs[1])
    nt.link(sky.outputs['Background'], mix.inputs[2])
    for l in list(tree.links):
        if l.to_node is out and l.to_socket.name == 'Surface':
            tree.links.remove(l)
    tree.links.new(mix.outputs[0], out.inputs['Surface'])


def _shadow_transmit(nt: NT, tree: bpy.types.NodeTree, bsdf: bpy.types.Node,
                     out: bpy.types.Node, transmittance: float) -> None:
    """Let SHADOW rays pass straight through the glazing.

    THIS IS THE SINGLE BIGGEST LIGHTING FIX IN THIS FILE, and it is not a cheat.

    The problem. A Principled BSDF with Transmission 1.0 and IOR 1.5 is a
    REFRACTIVE closure, and Cycles cannot connect a light to a surface through a
    refractive closure with a shadow ray — the ray is simply blocked. So with the
    glazing modelled honestly, NO daylight reaches the interior by light sampling:
    every photon has to arrive down a BSDF-sampled path that happens to refract
    through a pane and then happens to find the sun disc or a bright patch of sky.
    That is the definition of a caustic, and it is why an interior behind refractive
    glass renders dark and grainy no matter how many samples you spend.

    Measured on the eye-living frame at 128 spp, --exposure 0.6: deleting the panes
    entirely took the median luminance from 99.6 to 135.6 and the 10th percentile
    (the shaded back of the flat) from 49 to 77. Half a stop overall and two thirds
    of a stop in the shadows, all of it an artefact of the light-transport model
    rather than of the building.

    The fix. A flat parallel-sided pane does not BEND transmitted light: it
    displaces the beam laterally by t*sin(i)*(1 - cos(i)/sqrt(n^2 - sin^2 i)), which
    for a 1/2" pane is a couple of millimetres, and it leaves the direction exactly
    unchanged. So for a shadow ray the physically correct model of a flat pane is a
    plain attenuator: pass through, lose the two surface reflections. That is a
    Transparent BSDF at the glass's transmittance, swapped in for shadow rays only
    via the Light Path node.

    Everything the camera sees is untouched: camera, reflection and indirect
    transmission rays all still get the real refractive Principled closure, so the
    panes still reflect the room, still show the correct Fresnel ramp at grazing
    angles, and still refract the view. Only the light sampling changes, and it
    changes from "impossible" to "correct".

    `transmittance` is the fraction that gets through: 0.90 is right for a clear
    uncoated pane (two air-glass interfaces at ~4% each, negligible absorption).
    A low-e coated IGU would be 0.60-0.70; use that when the spec says so.
    """
    lp = nt.new('ShaderNodeLightPath')
    tp = nt.new('ShaderNodeBsdfTransparent')
    # The glazing's own tint carries over, so the light that gets through is the
    # same colour as the light the camera sees through it.
    tint = tuple(bsdf.inputs['Base Color'].default_value)
    tp.inputs['Color'].default_value = (
        tint[0] * transmittance, tint[1] * transmittance, tint[2] * transmittance, 1.0)
    mix = nt.new('ShaderNodeMixShader')
    nt.link(lp.outputs['Is Shadow Ray'], mix.inputs['Fac'])
    nt.link(bsdf.outputs['BSDF'], mix.inputs[1])
    nt.link(tp.outputs['BSDF'], mix.inputs[2])
    for l in list(tree.links):
        if l.to_node is out and l.to_socket.name == 'Surface':
            tree.links.remove(l)
    tree.links.new(mix.outputs[0], out.inputs['Surface'])


def build(key: str, base_color_override: tuple | None = None) -> bpy.types.Material:
    """Realise one Surface as a Blender material.

    Cached in bpy.data by name, including the tint for keep_glb_color surfaces:
    N products in 3 colours cost 3 materials, not N.
    """
    name = f'pbr:{key}'
    if base_color_override is not None:
        r, g, b = (round(c, 3) for c in base_color_override[:3])
        name = f'{name}:{r}_{g}_{b}'
    existing = bpy.data.materials.get(name)
    if existing is not None:
        return existing

    s = SURFACES[key]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    out.location = (300, 0)
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    base = base_color_override if base_color_override is not None else srgb(s.base)
    _set(bsdf, 'Base Color', base)
    _set(bsdf, 'Roughness', s.rough)
    _set(bsdf, 'Metallic', s.metal)
    _set(bsdf, 'IOR', s.ior)
    _set(bsdf, 'Transmission Weight', s.transmission)
    _set(bsdf, 'Coat Weight', s.coat)
    _set(bsdf, 'Coat Roughness', s.coat_rough)
    _set(bsdf, 'Sheen Weight', s.sheen)
    _set(bsdf, 'Sheen Roughness', s.sheen_rough)
    _set(bsdf, 'Sheen Tint', srgb(s.sheen_tint))
    _set(bsdf, 'Anisotropic', s.aniso)
    _set(bsdf, 'Subsurface Weight', s.subsurface)
    _set(bsdf, 'Subsurface Radius', s.subsurface_radius)
    # Thin film OFF: it is a soap-bubble/interference effect and on glazing it
    # produces coloured fringes that no window has.
    _set(bsdf, 'Thin Film Thickness', 0.0)
    _set(bsdf, 'Alpha', 1.0)
    if s.emit:
        _set(bsdf, 'Emission Color', srgb(s.emit))
        _set(bsdf, 'Emission Strength', s.emit_strength)

    nt = NT(tree)
    if s.texture:
        RECIPES[s.texture](nt, bsdf, s)
    if s.shadow_transmit > 0:
        _shadow_transmit(nt, tree, bsdf, out, s.shadow_transmit)
    if s.haze_ft > 0:
        _haze(nt, tree, bsdf, out, s.haze_ft)

    # Cycles ignores blend_method, but keep the datablock honest for anyone who
    # opens the .blend: only the real glass is see-through.
    mat.use_backface_culling = False
    return mat


# ----------------------------------------------------------------- application

_SUFFIX = re.compile(r'\.\d{3}$')
_HEXNAME = re.compile(r'^mat:#([0-9a-fA-F]{6})$')


def canonical(mat_name: str) -> str:
    """'floor-oak.001' -> 'floor-oak'. Blender uniquifies names on import."""
    return _SUFFIX.sub('', mat_name)


def is_anonymous(mat_name: str) -> bool:
    """True for the exporter's `mat:#rrggbb` colours (materials.ts matFor default).

    These are not missing mappings — they are per-product colours out of
    src/core/catalog.ts and there is nothing to look up. They are reported
    separately from genuinely unmapped names so the log stays useful.
    """
    return bool(_HEXNAME.match(canonical(mat_name)))


def resolve(obj_name: str, mat_name: str) -> tuple[str | None, str]:
    """Which Surface should this (object, material) pair get?

    Returns (key or None, how) where `how` is 'rule' | 'name' | 'anon' | 'none',
    purely so the report can say where each decision came from.
    """
    base = canonical(mat_name)
    # Belt and braces around the failure mode above: a material the exporter has
    # explicitly named as glazing can never be overridden by an object rule.
    # Opaque glass is both catastrophic and easy to miss.
    protected = PROTECTED.get(base) or PROTECTED.get(ALIASES.get(base, ''))
    if protected:
        return protected, 'name'
    for pat, key in _COMPILED_RULES:
        if pat.search(obj_name):
            return key, 'rule'
    if base in SURFACES:
        return base, 'name'
    if base in ALIASES:
        return ALIASES[base], 'name'
    if is_anonymous(base):
        for pat, key in _COMPILED_ANON:
            if pat.search(obj_name):
                return key, 'anon'
    return None, 'none'


def _read_glb_pbr(mat: bpy.types.Material | None) -> tuple[tuple, float, float]:
    """Pull (base colour, roughness, metallic) back out of an imported material.

    The glTF importer always builds a Principled BSDF, so this is a lookup, not a
    guess — but it is written defensively because the fallback path must never be
    the thing that breaks a render.
    """
    base = (0.62, 0.60, 0.56, 1.0)
    rough, metal = 0.6, 0.0
    if mat is None or not mat.use_nodes:
        return base, rough, metal
    for n in mat.node_tree.nodes:
        if n.bl_idname != 'ShaderNodeBsdfPrincipled':
            continue
        try:
            base = tuple(n.inputs['Base Color'].default_value)
            rough = float(n.inputs['Roughness'].default_value)
            metal = float(n.inputs['Metallic'].default_value)
        except Exception:
            pass
        break
    return base, rough, metal


def _fallback(src: bpy.types.Material | None, cache: dict[str, bpy.types.Material]) -> bpy.types.Material:
    """A sane Principled guess for a name this table does not know.

    Keeps the glb's base colour (the brief for this layer) and only fixes what
    the rasteriser-tuned source gets physically wrong:
      - roughness: glTF default 1.0 is a perfect Lambertian, which nothing is.
      - metallic: anything above 0.5 was almost certainly meant to be metal
        (materials.ts under-drives metalness so a missing env map cannot turn a
        metal black); below that, treat it as a dielectric and let IOR drive the
        specular response.
    """
    name = canonical(src.name) if src else 'unnamed'
    hit = cache.get(name)
    if hit:
        return hit
    base, rough, metal = _read_glb_pbr(src)
    m = bpy.data.materials.new(f'pbr:fallback:{name}')
    m.use_nodes = True
    tree = m.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    b = tree.nodes.new('ShaderNodeBsdfPrincipled')
    tree.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    _set(b, 'Base Color', base)
    _set(b, 'Roughness', min(0.92, max(0.12, rough if rough < 0.99 else 0.62)))
    _set(b, 'Metallic', 1.0 if metal >= 0.5 else 0.0)
    _set(b, 'IOR', 1.5)
    _set(b, 'Alpha', 1.0)
    cache[name] = m
    return m


@dataclass
class Report:
    """What apply() did, so the render log is auditable."""
    by_name: dict[str, int] = field(default_factory=dict)     # matched the SURFACES table
    by_rule: dict[str, int] = field(default_factory=dict)     # matched an OBJECT_RULE
    by_anon: dict[str, int] = field(default_factory=dict)     # mat:#hex + an ANON_RULE
    anon: dict[str, int] = field(default_factory=dict)        # mat:#hex, generic fallback
    unknown: dict[str, int] = field(default_factory=dict)     # a NAME we do not know: fix the table
    slots: int = 0

    def lines(self) -> list[str]:
        out = [f'{self.slots} material slot(s) rewritten']
        for label, table in (('name', self.by_name), ('rule', self.by_rule),
                             ('part', self.by_anon)):
            for k in sorted(table):
                out.append(f'  {label:>4}  {k:<22} {table[k]:>4}')
        if self.anon:
            total = sum(self.anon.values())
            out.append(f'  anon  {len(self.anon)} catalog colour(s), {total} slot(s) '
                       f'-> Principled fallback keeping the glb colour: '
                       f'{", ".join(sorted(self.anon)[:8])}'
                       f'{" ..." if len(self.anon) > 8 else ""}')
        for k in sorted(self.unknown):
            out.append(f'  !! UNMAPPED MATERIAL NAME {k!r} x{self.unknown[k]} — add it '
                       f'to SURFACES (fell back to the glb colour)')
        return out


def apply(objects: Iterable[bpy.types.Object]) -> Report:
    """Replace every material slot on `objects` with its physically-based twin.

    Assignment goes to the OBJECT-level slot, not to the mesh data. Two reasons,
    both load-bearing:
      - the glTF importer shares one mesh datablock between instances (three.js
        reuses geometry heavily), so writing to the data would let object B see
        the material object A was just given, re-resolve it, and recursively
        wrap it in fallbacks. That is a real bug this code had.
      - OBJECT_RULES are per-object by definition: two objects sharing a mesh can
        legitimately need different materials.
    """
    rep = Report()
    fb_cache: dict[str, bpy.types.Material] = {}
    for ob in objects:
        if ob.type != 'MESH':
            continue
        for slot in ob.material_slots:
            src = slot.material          # read while the slot still points at the data
            src_name = canonical(src.name) if src else '(no material)'
            slot.link = 'OBJECT'
            key, how = resolve(ob.name, src_name)
            rep.slots += 1
            if key is None:
                if is_anonymous(src_name):
                    rep.anon[src_name] = rep.anon.get(src_name, 0) + 1
                else:
                    rep.unknown[src_name] = rep.unknown.get(src_name, 0) + 1
                slot.material = _fallback(src, fb_cache)
                continue
            table = {'rule': rep.by_rule, 'name': rep.by_name, 'anon': rep.by_anon}[how]
            table[key] = table.get(key, 0) + 1
            if SURFACES[key].keep_glb_color:
                base, _r, _m = _read_glb_pbr(src)
                slot.material = build(key, base_color_override=base)
            else:
                slot.material = build(key)
    return rep


def surface_material(key: str) -> bpy.types.Material:
    """Public handle for render.py's exterior context builder."""
    return build(key)
