"""
The Cycles side of the outlook: the sky, and the city seen through the west glass.

This is the ray-traced twin of src/render3d/backdrop.ts. The two files must agree,
because the WebGL preview and the Cycles hero frame are supposed to be the same
apartment looking at the same city on the same afternoon. What "agree" means here,
precisely:

  1. THE SUN. Both derive azimuth and elevation from time-of-day on ONE formula,
     the one in addLighting() in src/render3d/build.ts:
         compass bearing (deg) = 90 + 180 t     09:00 east, 12:00 south, 18:00 west
         elevation       (deg) = max(8, 70 sin(pi t))
     See sun_angles(). Everything else (the Nishita sun, a Sun lamp, the direction
     the city's facades are lit from) is derived from that one function.

  2. THE CITY. build_city() reimplements the SAME mulberry32 generator with the
     SAME salted streams and the SAME draw order as backdrop.ts, bit for bit
     (32-bit arithmetic, done modulo 2**32 in Python). Given equal seeds the two
     renderers place the same buildings, at the same footprints, at the same
     heights. Verified numerically, not assumed — see the __main__ self-check at the
     bottom of this file, which prints the same checksum the TS probe does.

WHAT THIS MODULE DOES NOT OWN
Nothing here touches render settings, the camera, the interior, units, the view
layer, or the render engine: scripts/blender/render.py owns all of that and imports
this module. Every function creates data and RETURNS it. The only exception is the
explicit, opt-in `scene=` argument on build_world(), which assigns the world when
you ask it to and otherwise leaves bpy.context alone.

COORDINATE CONTRACT — read this before you place anything
The 2D plan is +x east, +y SOUTH, and the 3D convention in this project maps
plan (x, y) -> three.js (x, height, y). Blender is Z-up and its sky/sun model
treats +Y as north, so this module maps

    plan (x, y, height)  ->  Blender (x, -y, height)          [PLAN_NORTH = '+Y']

i.e. Blender +X = plan east, Blender +Y = plan NORTH, Blender +Z = up. If
render.py builds the interior with plan +y on Blender +Y instead, set
PLAN_NORTH = '-Y' once, here; the sun azimuth and the city are both derived from
it, so they stay consistent with each other either way.

UNITS ARE FEET, one Blender unit per foot, matching the rest of the project. Pass
`scale=0.3048` to build_city() if render.py works in metres.

CHEAPNESS
This geometry is only ever seen through glass, at 100-3000 ft, and it must never
be the reason a frame is slow:
  - the whole mid-rise city is ONE mesh datablock, one object, built from raw
    vertex/face lists (no bpy.ops, no per-building objects)
  - it is invisible to diffuse and shadow rays (cycles object visibility), so it
    costs nothing in the interior's light transport and cannot leak light into the
    room, while still appearing through the glass and in reflections
  - no subdivision, no modifiers, no textures, three materials total
  - aerial perspective is done in the shader from the camera's own view distance,
    with the haze colour SAMPLED FROM THE SKY NODE ITSELF, so it self-calibrates
    to whatever world strength render.py ends up using
"""

from __future__ import annotations

import math

import bpy
from mathutils import Euler, Vector

# --------------------------------------------------------------------------- contract

#: Which Blender axis plan NORTH points along. See the coordinate contract above.
PLAN_NORTH = "+Y"

#: Must match DEFAULT_SEED in src/render3d/backdrop.ts, or the preview and the hero
#: frame look out at two different cities.
DEFAULT_SEED = 20250729

#: Salts for the per-subject PRNG streams. Must match backdrop.ts.
MASSING_SALT = 0x9E3779B9
TOWER_SALT = 0x85EBCA6B

#: Footprint bounds of the subject building, in plan feet: (min_x, min_y, max_x,
#: max_y). From plan.ts meta.overallWidth / overallDepth (30.36 x 19.80 ft) with the
#: footprint's origin at the top-left outer corner. render.py should pass the real
#: bounds if the plan ever changes; these defaults exist so this module can be used
#: and self-checked on its own.
PLAN_BOUNDS = (0.0, 0.0, 30.36, 19.80)

#: Ceiling height from plan.ts (ASSUMED there, not measured).
PLAN_CEILING = 9.0

#: Nishita aerosol load. Shared by the world and by the haze colour the city
#: dissolves into, so those two can never drift apart. See build_world().
DUST_DENSITY = 2.2

#: How much dimmer the airlight is along a DOWNWARD line of sight than along the
#: horizon. See the note in _haze_wrap(); 1.0 restores the old behaviour.
AIRLIGHT_DEPRESSION = 0.55

D2R = math.pi / 180.0
_U32 = 0xFFFFFFFF


def _ft(feet: float, inches: float = 0.0) -> float:
    """Feet-and-inches to decimal feet — the FTIN() helper from src/core/units.ts."""
    return feet + inches / 12.0


def _inch(inches: float) -> float:
    """Inches to decimal feet — the IN() helper from src/core/units.ts."""
    return inches / 12.0


# --------------------------------------------------------------------------- the sun


def sun_angles(tod: float) -> tuple[float, float]:
    """
    (compass bearing, elevation) in DEGREES for a time of day in 0..1.

    THE one formula, copied from addLighting() in src/render3d/build.ts:
        bearing   = 90 + 180 t      -> 09:00 east, 12:00 south, 18:00 west
        elevation = max(8, 70 sin(pi t))

    The floor of 8 deg is deliberate in the original and kept here: it stops the sun
    dropping to the horizon at the ends of the range, where a directional light rakes
    the floor at a grazing angle and every shadow becomes a mile long.

    The unit's only glazing faces WEST, so the useful part of the range is the
    afternoon; t = 0.72 (bearing 219.6 deg, elevation 53.9 deg) is the project default.
    """
    t = min(1.0, max(0.0, float(tod)))
    bearing = 90.0 + 180.0 * t
    elevation = max(8.0, 70.0 * math.sin(math.pi * t))
    return bearing, elevation


def _bearing_to_longitude(bearing_deg: float) -> float:
    """
    Compass bearing (deg from plan north, clockwise) -> Nishita `sun_rotation` (rad).

    Cycles' Nishita sky builds its sun direction as
        (cos(el) cos(lon), cos(el) sin(lon), sin(el))
    in Blender world axes, so `sun_rotation` is a longitude measured from +X toward
    +Y. With PLAN_NORTH = '+Y' (+X east, +Y north) a compass bearing A points
    (sin A, cos A), so cos(lon) = sin A and sin(lon) = cos A, giving

        lon = 90deg - A

    Check A = 270 (west): lon = -180, direction (-1, 0) = -X = west. Correct.
    With PLAN_NORTH = '-Y' the frame is mirrored in Y and lon = A - 90 instead.
    """
    if PLAN_NORTH == "+Y":
        return (90.0 - bearing_deg) * D2R
    if PLAN_NORTH == "-Y":
        return (bearing_deg - 90.0) * D2R
    raise ValueError(f"PLAN_NORTH must be '+Y' or '-Y', got {PLAN_NORTH!r}")


def sun_direction(tod: float) -> Vector:
    """Unit vector in Blender world space pointing FROM the scene TOWARD the sun."""
    bearing, elevation = sun_angles(tod)
    lon = _bearing_to_longitude(bearing)
    el = elevation * D2R
    return Vector(
        (math.cos(el) * math.cos(lon), math.cos(el) * math.sin(lon), math.sin(el))
    ).normalized()


def sun_lamp_euler(tod: float) -> Euler:
    """
    XYZ Euler for a Blender SUN lamp so that it shines from the same direction the
    Nishita sun sits in — for render.py, if it wants a clean, low-noise sun instead
    of relying on the sky's own sun disc.

    A sun lamp emits along its local -Z. Writing R = Rz(c) Ry(0) Rx(a) and requiring
    R * (0,0,-1) = -(cos el cos lon, cos el sin lon, sin el) gives
        cos a = sin el          -> a = 90deg - elevation
        sin c = cos lon, cos c = -sin lon -> c = lon + 90deg
    which is what this returns.
    """
    bearing, elevation = sun_angles(tod)
    lon = _bearing_to_longitude(bearing)
    return Euler(((90.0 - elevation) * D2R, 0.0, lon + math.pi / 2.0), "XYZ")


# --------------------------------------------------------------------------- world


#: Albedo of the city below the horizon. Nishita has NO ground term at all — every
#: direction below the horizon comes back essentially black — and on a high floor
#: with floor-to-ceiling west glazing the lower hemisphere is HALF of what the room
#: can see out of the window. Concrete, asphalt, gravel roofs and glass average out
#: at 0.15-0.25 reflectance (asphalt 0.10, concrete 0.30, so a city block lands in
#: the middle); 0.22 is the value used here.
GROUND_ALBEDO = 0.22


def _ground_bounce(nt, sky, bearing_deg: float):
    """
    Give the world a lower hemisphere: the city, lit, bouncing daylight back UP.

    WHY THIS IS NOT COSMETIC. Cycles' Nishita sky models the atmosphere only, so
    below the horizon it returns near-black. This unit is lit through ONE west wall
    of glass on a high floor, which means roughly half of the solid angle that wall
    subtends is *below* the horizon — sunlit rooftops, streets and the flank of the
    tower. Leaving that half black throws away a large part of the room's real
    illuminance, and it throws away the part that is DIFFUSE and comes in LOW, i.e.
    exactly the light that reaches the back of the flat, grazes the floor and makes
    the satin sheen read. Measured on the eye-living frame: without this the frame's
    median luminance sat ~1 stop under the reference photograph and the interior had
    to be rescued with exposure, which then blew the sky out past what the photo
    does.

    The city geometry cannot supply this itself: build_city() marks every object
    `visible_diffuse = False` on purpose (see its docstring) so a 5-mile ground
    plane does not have to be sampled by every diffuse bounce in the room. So the
    bounce belongs in the world, as a hemisphere of the right radiance — which is
    cheap, noise-free, and importance-sampled by Cycles for free.

    Radiance used: the sky's own horizon colour times GROUND_ALBEDO. Sampling the
    sky node rather than hard-coding a grey means this self-calibrates to the
    weather (`dust_density`) and the time of day, exactly like the haze colour in
    _haze_wrap(). The horizon is sampled 90 deg off the sun so we get the average
    hazy sky rather than the aureole.

    The transition is smoothed over the 8 deg below horizontal: real ground haze
    makes the horizon a soft band, and a hard step there shows up as a visible line
    in glossy reflections (the tower's glass, and our own floor).

    ----------------------------------------------------------------------------
    DO NOT COME HERE TO FIX THE SOFFIT. It has been tried and it is measured.
    ----------------------------------------------------------------------------
    The standing complaint about this frame is that the exposed concrete soffit is
    darker than the walls where the photograph's is brighter. This hemisphere is the
    ONLY term in world.py that moves that relationship at all, because the ceiling's
    only direct view of the outdoors is DOWNWARD: a ray reaching a ceiling point
    from outside must pass through glazing that stops 4" below the slab, so it enters
    the room rising, which means it left the world below the horizon. Every other
    lever (dome strength, dust, ozone, the sun) lights the walls and the ceiling in
    the same proportion — swept and measured, see build_world() and render.py.

    But the term is far too small to be the answer. Measured on eye-living at 128
    spp with view_transform=Standard (so the numbers are scene-linear, not AgX):
    sweeping GROUND_ALBEDO 0.0 / 0.22 / 1.0 / 5.0 gives soffit luminance 0.0266 /
    0.0265 / 0.0279 / 0.0456 and east-wall luminance 0.0364 / 0.0359 / 0.0355 /
    0.0430. So at the physical 0.22 this whole hemisphere is worth ~3% of the
    soffit's light and ~1% of the wall's — killing it outright (0.0) is invisible.
    It is 4x more effective on the soffit than on the wall, which confirms the
    mechanism, and useless anyway at any honest radiance:

      soffit/wall ILLUMINANCE ratio (dividing by albedo Y 0.5065 and 0.858):
        render, GROUND_ALBEDO 0.22 ... 1.25       <- we are here
        render, GROUND_ALBEDO 5.0  ... 1.80
        photograph                 ... 2.25
    Closing the gap from here needs GROUND_ALBEDO ~5.8, i.e. a city that is nearly
    six times BRIGHTER than the sky above it. That is not a lower hemisphere, it is
    a light box.

    RE-VERIFIED INDEPENDENTLY, and re-stated in units anyone can reproduce, because
    the sweep above was run through temporary XP_* environment hooks and a layout
    (a-window-desk) that have both since been deleted. c-second-row / eye-living /
    160 spp / default weather / AgX as shipped, editing GROUND_ALBEDO in place:
        GROUND_ALBEDO   soffit_mid L   east-wall L   soffit/wall   soffit R-B
          0.0              133.0         134.6         0.988         -23.8
          0.22 (ours)      132.5         133.8         0.990         -23.4
          5.0              153.1         142.5         1.074         -15.0
        photograph         155.3         136.5         1.138         -25.3
      patches: soffit_mid 250,45..700,95   east wall 800,140..940,330
      photo:   soffit_mid 250,40..700,95   east wall 765,200..820,450
    Killing the hemisphere really is invisible (0.5 L unit, i.e. noise), and even a
    23x overdose reaches only 1.07 of the 1.14 the photograph wants while dragging
    the ceiling WARM (R-B -23 -> -15) where the photograph is cool. Confirmed.

    ONE CORRECTION TO THE DIAGNOSIS ABOVE: the render's ceiling is not "flat", it
    runs BACKWARDS, and that is a bigger error than the deficit in the mean. Column
    profile, x averaged 290-310, c-second-row against the photograph:
        render   soffit L 133.8 far  ->  132.5 mid  ->  107.7 at the glass
        photo    soffit L 126.5 far  ->  155.3 mid  ->  179.5 at the glass
    Ours falls 26 L units toward the glazing; the photograph's rises 53. The mean is
    close (132.5 against 136.5 for the wall) — it is the GRADIENT that is inverted,
    and the last 30 px of it are a hard AO trough at the head junction (L 50 at y114
    against a soffit of 133), which is geometry in src/render3d/build.ts, not
    illumination. Nothing in world.py can produce a gradient across a ceiling that
    only sees the world through a slot 4" tall.

    Two refinements were built, measured and thrown away, so nobody rebuilds them:
      * AERIAL PERSPECTIVE on this hemisphere (a per-direction 1-exp(-H/(-Z * D))
        ramp from albedo*sky straight down to AIRLIGHT_DEPRESSION*sky at the
        horizon, which is what _haze_wrap() does to the city we DRAW and is
        genuinely more correct). Effect on every interior patch: below 0.5%, i.e.
        inside the sampling noise. The reason is geometric — the cosine weight for a
        ceiling is sin(depression), so the near-horizon band where the airlight
        lives is 2% of the hemisphere's contribution.
      * making the tint cool instead of warm (1.06/1.00/0.92 -> 0.86/0.98/1.18).
        Also below noise. The warm bias is worth questioning on its own terms — the
        DEFAULT weather has --sun-intensity 0.04, so there is no "low afternoon sun
        landing" on this ground at all — but it changes nothing measurable, so it is
        left alone rather than churned.

    WHERE THE SOFFIT'S LIGHT ACTUALLY COMES FROM, measured by replacing one material
    at a time with a black diffuse and re-rendering (eye-living, demo-openloft,
    linear): the floor is worth 8% of the soffit, all the wall-paint surfaces
    together 21%, this hemisphere 3%. The remaining ~68% is the rest of the interior
    and multi-bounce. In particular the FLOOR IS NOT THE SOFFIT'S LIGHT SOURCE — the
    bright blue glare sheet in front of the glazing is a near-grazing SPECULAR
    reflection, and a specular lobe does not redirect light to the surface directly
    above it; only the walnut's diffuse albedo (linear Y 0.11) goes up. Measured
    corroboration: our glare sheet is already BLUER than the photograph's (linear
    B/R 1.52 against 1.27) while our soffit is far less blue (1.49 against 2.31), so
    the sheet cannot be what makes the photograph's ceiling blue.

    Returns the RGB socket to feed the Background node.
    """
    coord = nt.nodes.new("ShaderNodeTexCoord")
    coord.location = (-900, 300)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-720, 300)
    # In a WORLD shader, Generated IS the outgoing ray direction, so Z < 0 is a ray
    # heading down into the city.
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])

    below = nt.nodes.new("ShaderNodeMapRange")
    below.location = (-560, 300)
    below.clamp = True
    nt.links.new(sep.outputs["Z"], below.inputs["Value"])
    below.inputs["From Min"].default_value = -math.sin(8.0 * D2R)
    below.inputs["From Max"].default_value = 0.0
    below.inputs["To Min"].default_value = 1.0  # fully city
    below.inputs["To Max"].default_value = 0.0  # fully sky

    # the haze colour at the horizon, from a sky with the same weather in it
    lon = _bearing_to_longitude(bearing_deg) + math.pi / 2.0
    horizon = nt.nodes.new("ShaderNodeCombineXYZ")
    horizon.location = (-900, 520)
    horizon.inputs["X"].default_value = math.cos(lon) * math.cos(2.0 * D2R)
    horizon.inputs["Y"].default_value = math.sin(lon) * math.cos(2.0 * D2R)
    horizon.inputs["Z"].default_value = math.sin(2.0 * D2R)

    hsky = nt.nodes.new("ShaderNodeTexSky")
    hsky.location = (-720, 520)
    hsky.sky_type = "NISHITA"
    hsky.sun_elevation = sky.sun_elevation
    hsky.sun_rotation = sky.sun_rotation
    hsky.altitude = sky.altitude
    hsky.air_density = sky.air_density
    hsky.dust_density = sky.dust_density
    hsky.ozone_density = sky.ozone_density
    hsky.sun_disc = False
    nt.links.new(horizon.outputs["Vector"], hsky.inputs["Vector"])

    ground = nt.nodes.new("ShaderNodeMix")
    ground.data_type = "RGBA"
    ground.location = (-520, 520)
    ground.blend_type = "MULTIPLY"
    _socket(ground, "Factor", "VALUE").default_value = 1.0
    nt.links.new(hsky.outputs["Color"], _socket(ground, "A", "RGBA"))
    # A shade warmer than neutral: the ground is brick, asphalt and gravel, and it
    # is where the low afternoon sun is landing.
    _socket(ground, "B", "RGBA").default_value = (
        GROUND_ALBEDO * 1.06, GROUND_ALBEDO, GROUND_ALBEDO * 0.92, 1.0)

    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.location = (-320, 380)
    nt.links.new(below.outputs[0], _socket(mix, "Factor", "VALUE"))
    nt.links.new(sky.outputs["Color"], _socket(mix, "A", "RGBA"))
    nt.links.new(_socket_out(ground, "RGBA"), _socket(mix, "B", "RGBA"))
    return _socket_out(mix, "RGBA")


def _socket(node, name: str, typ: str):
    """Input socket by (name, type). Blender 4.x ShaderNodeMix carries three
    same-named A/B pairs for different data types and their indices are not stable
    across releases, so they are matched by type rather than by index."""
    for s in node.inputs:
        if s.name == name and s.type == typ:
            return s
    raise KeyError(f"{node.bl_idname} has no {name!r} input of type {typ}")


def _socket_out(node, typ: str):
    for s in node.outputs:
        if s.type == typ:
            return s
    raise KeyError(f"{node.bl_idname} has no {typ} output")


def build_world(
    tod: float = 0.72,
    strength: float = 1.0,
    *,
    scene=None,
    dust_density: float = DUST_DENSITY,
    sun_intensity: float = 1.0,
    name: str = "Outlook Sky",
):
    """
    Build (or rebuild) a Nishita sky world and return the bpy World datablock.

    Nishita rather than the old Preetham/Hosek model because it is the only one in
    Blender that takes real atmospheric parameters — and this frame is specifically
    about HAZE. The reference photograph is bright hazy daylight: the horizon is
    nearly white, the sun is a blown-out core inside a wide aureole, and the far
    skyline is dissolved. All three of those come straight out of raising the
    aerosol load, which is what `dust_density` is.

    Parameters
    ----------
    tod : 0..1 time of day. Feeds sun_angles(), so this world's sun and the WebGL
        preview's sun are the same sun.
    strength : Background node strength. 1.0 = physical Nishita radiance, which is
        already correctly exposed for a Filmic/AgX view transform.
    scene : if given, assign the world to it. Omitted by default because render.py
        owns the scene; passing it is an explicit, opt-in convenience.
    dust_density : aerosol load, 1 = clear, DUST_DENSITY = the photo's haze. The one
        knob that changes the weather.
    sun_intensity : multiplier on the sun disc only, leaving the sky alone. Turn it
        down if the frame wants the flat, diffuse light of a hazier day without
        losing the sky's colour; the geometry and the shadow direction do not move.
    name : World datablock name. Reused and rebuilt in place if it already exists,
        so calling this twice does not leak datablocks.
    """
    bearing, elevation = sun_angles(tod)

    world = bpy.data.worlds.get(name) or bpy.data.worlds.new(name)
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.name = "outlook_sky"
    sky.location = (-380, 0)
    sky.sky_type = "NISHITA"
    sky.sun_elevation = elevation * D2R
    sky.sun_rotation = _bearing_to_longitude(bearing)
    # Sea-level-ish. `altitude` is metres in Blender regardless of scene units; a
    # 14th floor is ~40 m up, which changes nothing in the sky but is honest.
    sky.altitude = 40.0
    # HAZE. air_density 1.0 is the standard Rayleigh amount; dust_density is the
    # aerosol (Mie) load and is what whitens the horizon and blows the sun's aureole
    # out. 2.2 is a hazy-but-sunny city day, which is the photo. 1.0 would be a
    # crisp dark-blue mountain sky and would read as a different climate; much past
    # 3 and the direct sun goes amber enough to look like late evening at 4 pm.
    # Ozone mainly tints the zenith; 1.0 is the default and is right.
    sky.air_density = 1.0
    sky.dust_density = dust_density
    # OZONE STAYS AT 1.0, and it was swept rather than assumed. Ozone's Chappuis band
    # is the one Nishita knob that blues the sky without whitening the horizon, and
    # the near-glass illuminant IS short of blue against the photograph (see the
    # measurements in _ground_bounce). But it is a GLOBAL change: measured on
    # eye-living at ozone 1 -> 6, the linear B/R of the pier beside the glazing went
    # 0.885 -> 1.017 (photo: 1.570) while the far east wall went 0.861 -> 0.986 — and
    # the far wall already matched the photograph at 1.0 (render 0.892 vs photo 0.919
    # on the a-window-desk frame). Ozone buys 1/5 of the blue we are missing at the
    # glass and overshoots the one surface materials.py calibrated its wall-paint hex
    # against. So: not here. See the report in _ground_bounce.
    sky.ozone_density = 1.0
    # The real sun subtends 0.545 deg. Keep it: with the OptiX denoiser there is no
    # reason to fake a soft sun, and a true-size disc gives the correct shadow
    # penumbra through the full-height glazing.
    sky.sun_size = 0.545 * D2R
    sky.sun_intensity = sun_intensity
    sky.sun_disc = True

    bg = nt.nodes.new("ShaderNodeBackground")
    bg.location = (-160, 0)
    bg.inputs["Strength"].default_value = strength

    out = nt.nodes.new("ShaderNodeOutputWorld")
    out.location = (40, 0)

    nt.links.new(_ground_bounce(nt, sky, bearing), bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    world["tod"] = float(tod)
    world["sun_bearing_deg"] = bearing
    world["sun_elevation_deg"] = elevation
    if scene is not None:
        scene.world = world
    return world


# --------------------------------------------------------------------------- prng


class Mulberry32:
    """
    mulberry32, bit-for-bit identical to the one in src/render3d/backdrop.ts.

    The JS version relies on ToUint32/ToInt32 wrapping and Math.imul. Every one of
    those operations is exact modulo 2**32, so keeping the state as an unsigned
    32-bit int and masking after every add and multiply reproduces the JS sequence
    exactly — including `t ^= t + imul(...)`, where JS's ToInt32 of the sum is the
    same as masking it here.

    This is the whole reason the Cycles frame and the WebGL preview can show the
    same city: same generator, same salts, same draw order.
    """

    __slots__ = ("a",)

    def __init__(self, seed: int) -> None:
        self.a = seed & _U32

    def __call__(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & _U32
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & _U32
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)))) & _U32
        return ((t ^ (t >> 14)) & _U32) / 4294967296.0

    def between(self, lo: float, hi: float) -> float:
        return lo + (hi - lo) * self()

    def pick(self, xs):
        return xs[min(len(xs) - 1, int(self() * len(xs)))]


# --------------------------------------------------------------------------- palettes

# THESE ARE THE ALBEDOS OF EVERY FRAME raytrace.ts PRODUCES. build_city() bakes the
# two tables below into a per-vertex 'albedo' attribute read by the private
# _city_material(), and every frame the driver has shipped logs "outlook: world.py
# city". So tune here first.
#
# BUT materials.py's six `context-*` Surfaces are NOT dead code, and an earlier
# revision of this note said they were, with the wrong reason. Read render.py's
# build_outlook(): it takes the built-in build_context() rig on THREE conditions,
# only one of which is an import failure —
#   1. `import world` raised (logged "world.py not importable");
#   2. --sun-az or --sun-el was passed. world.py derives its sun from time-of-day
#      alone, so an arbitrary sun angle CANNOT go through it. This is a documented
#      render.py flag pair with its own log line, and it is reachable today:
#      invoking render.py directly with --sun-az=237.6 --sun-el=37.5 logs
#      "outlook: --sun-az/--sun-el given ... built-in rig" and then
#      "context: 288 mid-rise blocks" (verified, not reasoned);
#   3. build_world() or build_city() raised at runtime, which is caught.
# raytrace.ts happens never to pass --sun-az/--sun-el today (see its flag list), so
# condition 2 needs a direct blender invocation to hit — that is the whole of the
# "dead code" claim, and it is a property of the DRIVER, not of the code.
#
# It matters because the chroma work below did not touch materials.py, so the two
# cities have now diverged. MEASURED, c-second-row / eye-living / 160 spp, the same
# 8x6-block roofscape patch (250,292..326,500) through both paths:
#     world.py city    R-B sd 17.1   p95 +32.0   warm 11.4%
#     build_context    R-B sd  8.3   p95   0.0   warm  0.0%     <- still monochrome
# Anyone who ships a --sun-az frame gets the styrofoam city this pass removed.
#
# Wall and roof albedos, the same two palettes and the same order as backdrop.ts.
# Walls are masonry/stucco/concrete and mid-tone; roofs are dark. Keeping them
# separate is not cosmetic: one colour per building makes every near facade a black
# silhouette, because a tar albedo on a vertical surface that sees half the sky
# renders near zero.
#
# A CITY WITH NO WARM SURFACES READS AS STYROFOAM, and that is what these two tables
# were producing. Measured in 8x6 blocks over the roofscape, mullion excluded:
#
#                                          R-B sd   R-B p5/p95   warm(>+5)   L p50
#   reference photo, left bay               20.5    -38 / +40      14.8%      227
#     212,292..336,478
#   BEFORE, c-second-row left bay pane1      5.2    -24 /  -3       0.0%      174
#   AFTER,  c-second-row left bay pane1     17.1    -27 / +32      11.4%      174
#     250,292..326,500
#   BEFORE, demo-openloft pane               6.3    -24 /  -3       0.0%      184
#   AFTER,  demo-openloft pane              19.9    -24 / +37      19.4%      184
#     354,338..450,410
#
# (The first pass measured its BEFORE on `a-window-desk`, which a concurrent pass
# then deleted; the c-second-row rows above are the same experiment on a layout that
# exists, and they agree. All rows eye-living, 160 spp, default weather.)
#
# The photo swings from a shaded bitumen deck to a run of ochre parapet panels, with
# a terracotta cap flashing and red-brown brick flanks among the grey membrane. Ours
# had EVERY block between -25 and -1 — monochrome. The fix put the spread back
# without moving the value at all (L p50 183.6 -> 183.6 on the demo pane, 173.8 ->
# 174.1 on c-second-row), and it is a REDISTRIBUTION, not a saturation boost:
# per-pixel sat mean over that pane went 15.3 -> 19.9 against the photo's 19.9, and
# sat p95 24 -> 37 against the photo's 46, so the outlook is still slightly UNDER the
# photograph's chroma, not over it. Whole-frame clipped fraction and firefly count
# did not move (0.070% -> 0.070%, 61 -> 57 outliers).
#
# STILL WRONG, AND NOT FIXED HERE: THE OUTLOOK'S VALUE. An earlier revision of this
# note said "it was never a value problem". That is only true in the direction of
# blowing out. With the INTERIOR matched (east wall: render 133.8 against the photo's
# 136.5, 2% low) the outlook is about 0.9 stop dark, and the error is not uniform —
# it is worst on the nearest, largest roof in the frame, and its gradient runs
# BACKWARDS. Measured, c-second-row eye-living against the photo's left bay:
#     sky above the horizon    render 244.0    photo 246.1     <- matches
#     mid-field roofs          render 182.6    photo 201.9     <- 10% low
#     nearest roof deck        render 145.3    photo 228.5     <- 36% low, and
#                              R-B -22.9       R-B +18.6          cool where the
#                                                                 photo is warm
# In the photograph the near roofs are the BRIGHTEST and WARMEST thing outside;
# here they are the darkest and coolest. Two causes, both real: (a) there is no
# direct sun on this city at the default weather (--sun-intensity 0.04), so no roof
# gets a bright warm face for free — which is exactly why the hue below had to be
# faked into the albedo; and (b) the ladder below tops out at linear Y 0.265 and has
# no WHITE-MEMBRANE entry at all, while the photo plainly contains near-white TPO
# (blocks at L 244). Fixing (b) means breaking the "same COUNT and ORDER" contract
# with backdrop.ts or re-purposing a slot, and it must be re-measured against the
# floor-glare sheet, so it is left as a stated deficit rather than a silent one.
#
# WHY the chroma that was already in these tables did not survive to the frame, in
# order of size (all three are real, and the third is the biggest):
#   1. the airlight in _haze_wrap() mixes every surface toward the horizon sky, which
#      is neutral-to-cool. At the mid-field distances that fill this view (200-1000
#      ft against haze_dist 4858 ft) that is only a 4-19% mix, so it desaturates but
#      does not explain the result;
#   2. R/B ratios of 1.3-1.4 on a DARK albedo produce almost no absolute R-B once
#      rendered: chroma in display units is roughly (R/B - 1) x brightness, so a dark
#      roof needs a much bolder hue than a wall to read at all;
#   3. we are on floor 14 looking DOWN, so the visible area is roofs, parapet rims
#      and mechanical penthouses. The warm entries were all in WALL_COLORS, on
#      vertical faces that are barely in frame. Warmth has to be in ROOF_COLORS or it
#      is not in the picture.
# There is also no direct sun on this city at the default weather (--sun-intensity
# 0.04), so unlike the photograph — where the warm surfaces are the SUNLIT ones and
# the cool ones are in shade — nothing here gets a bright warm face for free. All of
# the hue has to come out of the albedo.
WALL_COLORS = (
    "#8f857a",  # warm grey stucco — the commonest wall in the reference photo
    "#9c9489",
    "#a89e91",  # pale render
    "#7f7468",  # shaded / dirty stucco
    "#94733e",  # red brick / raw sienna. Was #8a6f5e, R/B 2.27 in linear — a
                # brick-COLOURED grey. Real common brick is R/B 5-7; this is 6.2 at
                # Y 0.19. It is pulled toward OCHRE rather than pure red on purpose:
                # measured, the photograph's warm roofscape blocks are yellow-
                # dominant (R-G +10..+27, G-B +25..+45), not red-dominant, and a
                # high-R/low-G brick renders as candy pink through AgX at this
                # brightness.
    "#a2a099",  # concrete
    "#c2a878",  # light painted brick, warmed to the ochre of the photo's parapet
                # panel run (measured there at R-B +50..+59 where it is sunlit).
                # Was #b0a898 at R/B 1.38 and linear Y 0.395; this is R/B 2.87 at
                # Y 0.408, i.e. +3% brighter, not "the same Y" as first written.
    "#77706a",  # dark grey render
    "#8d9195",  # cool grey precast
    "#6e7276",  # dark cool grey / glazed office block
)

# ROOFS ARE DARK, and this palette was not dark enough. In the reference photo the
# mid-distance roofscape is unmistakably DARKER than the sky behind it — that value
# break is the whole reason the city reads as a city rather than as a pale backdrop
# card behind the glass. The old palette averaged 0.20 linear and rendered, under
# full sun plus 10-28% aerial haze, at very nearly the sky's own value: a field of
# white boxes in fog. These are the real materials instead — EPDM and modified
# bitumen are 0.05-0.10 reflectance, tar-and-gravel 0.10-0.15, and only a fresh TPO
# membrane or light ballast gets past 0.25. Same COUNT and same ORDER as before, so
# rnd.pick() still consumes one draw and still indexes the same slot: the city's
# geometry is bit-identical to backdrop.ts, only its albedos moved.
#
# PAIRED WITH src/render3d/backdrop.ts ROOF_COLORS. The VALUES there are lighter
# on purpose -- that file feeds the raster preview, whose baked lighting and
# ACESFilmic curve lift midtones ~1.5 stops, so each table was calibrated against
# the reference photo through its own pipeline. The LENGTH and ORDER, however,
# must stay identical: both scatterers index their table with the same seeded
# PRNG, so entry i must mean the same kind of roof in both.
#
# HUE, ADDED AT NEARLY CONSTANT VALUE — and "nearly" is the honest word. The darkness
# above is not being undone, but an earlier revision of this note claimed "every entry
# keeps its old linear Y to within 0.01" and that is FALSE for two of the eight.
# Recomputed from the hexes below (sRGB -> linear, Y = 0.2126R + 0.7152G + 0.0722B):
#
#   slot        0      1      2      3      4      5      6      7    mean
#   old     0.0456 0.0621 0.0849 0.1107 0.1856 0.2515 0.0549 0.0292  0.1031
#   new     0.0466 0.0608 0.0843 0.1095 0.1973 0.2652 0.0622 0.0287  0.1068
#   dY      +.001  -.001  -.001  -.001  +.012  +.014  +.007  -.000    +3.6%
#
# So the two brightest slots each moved ~+0.012-0.014 linear Y (+6% and +5% of their
# own value). The palette mean is +3.6%, and the frame-level consequence was measured
# rather than argued: interior patches are unchanged (soffit_mid 127.5 -> 127.5, east
# wall 150.4 -> 150.6, whole frame 134.0 -> 134.0 on c-second-row eye-living), which
# they must be, because build_city() sets visible_diffuse = False.
#
# What is meant to change is R/B, on the slots whose own comment already names a warm
# material: pea gravel on a built-up roof is buff-brown, ballast is tan, and slot 6 is
# gravel over a BRICK building. Slots 2 and 7 are pushed the other way — weathered
# concrete and fresh bitumen really are neutral-to-cool — because the photograph's
# roofscape is a SPREAD (R-B -47 to +59), and a spread needs both ends, not a warm
# bias. Two slots have no comment of their own and moved anyway, so they are recorded
# here rather than left for the next reader to discover: slot 1 R/B 1.34 -> 1.56
# (warmer) and slot 5 R/B 1.30 -> 1.13 (cooler), both to keep the value ladder
# monotonic once their neighbours moved. Slot 5 carries the largest dY in the table,
# which is the opposite of a nudge; it is deliberate and it is the reason the mean
# rose at all.
ROOF_COLORS = (
    "#4a3a2c",  # built-up tar and BUFF PEA GRAVEL. R/B 1.30 -> 2.72.
    "#4b453c",
    "#4f5350",  # weathered concrete deck — the cool end of the spread
    "#665c48",
    "#847a63",  # pale membrane / ballast — tan gravel ballast, not grey
    "#8e8d86",
    "#5f4023",  # gravel ballast over a brick building. R/B 1.83 -> 6.8: this is the
                # one entry that is unambiguously a warm ROOF, and at this viewing
                # angle roofs are what the frame is made of.
    "#302f2f",  # dark bitumen, freshly done — neutral-cool
)


def _srgb_to_linear(c: float) -> float:
    """IEC 61966-2-1. Blender colours are linear; hex swatches are sRGB."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _hex_to_linear(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    return tuple(_srgb_to_linear(int(h[i : i + 2], 16) / 255.0) for i in (0, 2, 4))


# --------------------------------------------------------------------------- frame


class CityFrame:
    """
    The one place the outlook's scale lives, mirroring cityFrame() in backdrop.ts.

    Distances are multiples of `span`, the subject building's own footprint span, so
    the outlook rescales with the plan instead of being pinned to this one building.
    Real sizes (storey heights, glazing modules, parapets) are written as feet and
    inches with their source named.

    ALL COORDINATES IN THIS CLASS AND IN THE SCATTER FUNCTIONS ARE PLAN
    COORDINATES (+x east, +y SOUTH), identical to backdrop.ts. The conversion to
    Blender axes happens in exactly one place, BoxSoup.add(), and nowhere else.
    Doing it any earlier is how the first version of this file ended up with a city
    mirrored north-for-south against the WebGL one — the lateral scatter offsets
    were being added in Blender +Y while the TS added them in plan +y.
    """

    def __init__(self, bounds=PLAN_BOUNDS, ceiling: float = PLAN_CEILING, level: int = 14, tod: float = 0.72):
        min_x, min_y, max_x, max_y = bounds
        self.glass_x = min_x  # outer face of the west wall; the city is west of it
        self.view_y = (min_y + max_y) / 2.0  # PLAN y of the middle of that wall
        self.north_y = min_y  # PLAN y of the footprint's north edge
        self.span = max(max_x - min_x, max_y - min_y)
        # Floor-to-floor: the plan's ceiling height plus a 12" slab-and-plenum
        # sandwich, a normal concrete residential stack.
        self.f2f = ceiling + _inch(12)
        # Floor 1 is at grade, so the N-th floor slab is (N-1) storeys up. Level 14
        # is the one assumption here that cannot come from the plan: the photo looks
        # down onto 4-6 storey roofs over a wide spread of city, which is somewhere
        # around the 12th-16th floor.
        self.level = int(level)
        self.ground_z = -(self.level - 1) * self.f2f
        """
        HAZE E-FOLDING DISTANCE, and note that this number is NOT the same as the one
        in backdrop.ts. It cannot be, and the difference is worth stating:

        The WebGL version bakes haze into unlit vertex colours, mixing a surface at
        ~0.1-0.3 linear toward a haze colour at ~0.8 linear. Here the haze term is a
        real emission carrying the sky's real RADIANCE, which is several times
        brighter than any surface in the frame — so the same 30%-haze mix that reads
        as gentle depth in the preview washes a facade to flat mid-grey in Cycles.
        (It did. The first Cycles test render turned the whole city into fog.)

        So this side uses the PHYSICAL number instead of a tuned one. Koschmieder's
        relation ties meteorological visibility V to the extinction coefficient:
        V = 3.912 / beta, and this e-folding distance is 1 / beta, so

            visibility = 3.912 * haze_dist

        160 spans is ~4860 ft, i.e. about 3.6 miles of visibility: textbook bright
        hazy daylight, and it puts the tower at 3% haze, the middle distance at
        6-19% and the far skyline at 36-50%.

        It was 100 spans, and 100 was too aggressive against the photograph. The
        airlight term carries the SKY's radiance, which is several times any
        surface's, so a 25% mix does not read as 25% — it drowns the surface. At 100
        spans the mid-distance roofs came out at very nearly the sky's own value and
        the outlook read as fog with boxes in it. The photo has legible, clearly
        darker rooftops out to the far skyline and only dissolves the last mile.
        """
        self.haze_dist = self.span * 160.0
        self.tod = tod

    def view_dist(self, x: float, y: float) -> float:
        """Horizontal distance from the viewer (the west glass) to a plan point."""
        return math.hypot(x - self.glass_x, y - self.view_y)


# --------------------------------------------------------------------------- mesh building


class BoxSoup:
    """
    An accumulator for axis-aligned boxes that becomes ONE mesh datablock.

    Why not one object per building, or an instanced collection: 1000 objects means
    1000 depsgraph entries and 1000 BVH leaves to build every frame, for geometry
    that is 12 triangles each. A single mesh with a per-vertex colour attribute is
    the cheapest thing Cycles can be handed, builds in milliseconds, and carries the
    per-building albedo variation for free.
    """

    def __init__(self) -> None:
        self.verts: list[tuple[float, float, float]] = []
        self.faces: list[tuple[int, int, int, int]] = []
        self.colors: list[tuple[float, float, float]] = []

    def add(self, px, py, z, sx, sy, sz, color) -> None:
        """
        An AXIS-ALIGNED box centred at PLAN (px, py) at height z, with full extents
        (sx, sy, sz). Used for everything in the city except the raked tower.
        """
        self.add_oriented(px, py, z, sx, sy, sz, (1.0, 0.0), color)

    def add_oriented(self, px, py, z, su, sv, sz, u_axis, color) -> None:
        """
        A box turned in plan: `su` runs along the unit plan vector `u_axis` and `sv`
        along its left-hand normal, `sz` is vertical.

        The tower's facade is raked 24 deg, and every mullion, spandrel and glass
        panel on it has to follow that rake. Approximating them with axis-aligned
        boxes (which the first version of this file did, on the theory that nobody
        can see the difference at 140 ft) turns the facade into a row of fins
        sticking out sideways — very visible, and the first render showed it.

        THE SINGLE PLAN -> BLENDER MAPPING IN THIS FILE is the y flip below. Plan +y
        is SOUTH and Blender +Y is north (see PLAN_NORTH), so it happens here and
        nowhere else.
        """
        if su <= 0.0 or sv <= 0.0 or sz <= 0.0:
            return
        ux, uy = u_axis
        # left-hand normal of (ux, uy) in plan axes
        vx, vy = -uy, ux
        sign = -1.0 if PLAN_NORTH == "+Y" else 1.0
        cx = px
        cy = sign * py
        cz = z
        i = len(self.verts)
        hu, hv, hz = su / 2.0, sv / 2.0, sz / 2.0
        for du, dv, dz in (
            (-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
            (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1),
        ):
            ox = du * hu * ux + dv * hv * vx
            oy = du * hu * uy + dv * hv * vy
            self.verts.append((cx + ox, cy + sign * oy, cz + dz * hz))
            self.colors.append(color)
        # outward winding; Cycles does not care but a sane normal keeps the viewport
        # and any future backface culling honest
        self.faces.extend(
            (
                (i + 0, i + 3, i + 2, i + 1),  # bottom  -Z
                (i + 4, i + 5, i + 6, i + 7),  # top     +Z
                (i + 0, i + 1, i + 5, i + 4),  # -Y
                (i + 1, i + 2, i + 6, i + 5),  # +X
                (i + 2, i + 3, i + 7, i + 6),  # +Y
                (i + 3, i + 0, i + 4, i + 7),  # -X
            )
        )

    def to_object(self, name: str, material, scale: float = 1.0):
        """Bake into a mesh + object. Never linked to a collection here."""
        me = bpy.data.meshes.new(name)
        verts = self.verts if scale == 1.0 else [(x * scale, y * scale, z * scale) for x, y, z in self.verts]
        me.from_pydata(verts, [], self.faces)
        me.validate(verbose=False)
        # Per-vertex albedo. FLOAT_COLOR on POINT is the cheapest attribute domain,
        # and every box owns its own 8 vertices so per-box colours work exactly.
        attr = me.color_attributes.new(name="albedo", type="FLOAT_COLOR", domain="POINT")
        for i, c in enumerate(self.colors):
            attr.data[i].color = (c[0], c[1], c[2], 1.0)
        me.materials.append(material)
        me.shade_flat()
        return bpy.data.objects.new(name, me)


# --------------------------------------------------------------------------- materials


def _haze_wrap(nt, shader_out, frame: CityFrame, strength: float):
    """
    Aerial perspective, in the shader, physically.

    Distance haze is scattering BETWEEN the surface and the eye, so it has to be
    applied after shading — which in a path tracer means mixing the surface shader
    toward the sky's own radiance as a function of camera distance:

        haze = 1 - exp(-view_distance / haze_dist)

    Two things make this better than the baked version the WebGL preview has to use:
      * the distance comes from the Camera Data node's View Distance, so it is
        exact per pixel and stays correct if render.py moves the camera;
      * the haze COLOUR is sampled from a Nishita Sky Texture node with the same
        settings as the world, pointed at the horizon. So the city dissolves into
        exactly the colour the sky actually is at the horizon, at whatever world
        strength render.py chose. Nothing to keep in sync by hand.

    Returns the output socket to connect to the material output.
    """
    cam = nt.nodes.new("ShaderNodeCameraData")
    cam.location = (-900, -260)

    # 1 - exp(-d / hazeDist)
    div = nt.nodes.new("ShaderNodeMath")
    div.operation = "DIVIDE"
    div.location = (-720, -260)
    div.inputs[1].default_value = frame.haze_dist
    nt.links.new(cam.outputs["View Distance"], div.inputs[0])

    neg = nt.nodes.new("ShaderNodeMath")
    neg.operation = "MULTIPLY"
    neg.location = (-560, -260)
    neg.inputs[1].default_value = -1.0
    nt.links.new(div.outputs["Value"], neg.inputs[0])

    exp = nt.nodes.new("ShaderNodeMath")
    exp.operation = "EXPONENT"
    exp.location = (-400, -260)
    nt.links.new(neg.outputs["Value"], exp.inputs[0])

    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.location = (-240, -260)
    inv.inputs[0].default_value = 1.0
    nt.links.new(exp.outputs["Value"], inv.inputs[1])

    # the haze colour: this sky, at the horizon
    bearing, elevation = sun_angles(frame.tod)
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.location = (-560, -520)
    sky.sky_type = "NISHITA"
    sky.sun_elevation = elevation * D2R
    sky.sun_rotation = _bearing_to_longitude(bearing)
    sky.altitude = 40.0
    sky.air_density = 1.0
    sky.dust_density = DUST_DENSITY
    sky.ozone_density = 1.0
    sky.sun_disc = False  # sampling the haze, not the sun
    # Point it just above the horizon, 90 deg off the sun so we get the average haze
    # rather than the aureole. A constant vector makes the node fold to a constant.
    lon = _bearing_to_longitude(bearing) + math.pi / 2.0
    horizon = nt.nodes.new("ShaderNodeCombineXYZ")
    horizon.location = (-720, -520)
    horizon.inputs["X"].default_value = math.cos(lon) * math.cos(2.0 * D2R)
    horizon.inputs["Y"].default_value = math.sin(lon) * math.cos(2.0 * D2R)
    horizon.inputs["Z"].default_value = math.sin(2.0 * D2R)
    nt.links.new(horizon.outputs["Vector"], sky.inputs["Vector"])

    emit = nt.nodes.new("ShaderNodeEmission")
    emit.location = (-240, -520)
    # AIRLIGHT IS NOT HORIZON SKY. The colour above is sampled 2 deg above the
    # horizon, which is the brightest, most scattered part of the whole dome. But
    # every line of sight to this city is DEPRESSED — we are 130 ft up looking DOWN
    # onto roofs — and the air along a downward path is lit by far less sky than the
    # air along a horizontal one, because half its own hemisphere is ground. Using
    # the horizon glow neat therefore overestimates the airlight badly: measured
    # against the photograph, our roofscape came out at half the photo's contrast
    # (sd 24 against 44, 5th percentile 163 against 117) — the darks were being
    # filled in by haze that should not be there. 0.55 is the ratio of downward to
    # horizontal airlight for a hazy day, and it is the difference between a city
    # you can read the roofs of and a pale card behind the glass.
    #
    # AND IT IS NOT WHAT DESATURATES THE OUTLOOK. That was the leading suspect for
    # the monochrome city (see the palette note) and it is measured innocent: on
    # eye-living, roofscape through the uncurtained pane (demo-openloft, x354-450,
    # y338-410, 8x6 blocks), dropping this from 0.55 to 0.40 to 0.25 moved the R-B
    # spread only sd 6.3 -> 6.8 -> 7.3 and the median luminance 184 -> 182 -> 180.
    # At the 200-1000 ft depths that fill this view the haze mix is 4-19%, so the
    # airlight tints the far skyline and does essentially nothing to the near roofs.
    # The chroma had to come out of the albedos, and it did.
    emit.inputs["Strength"].default_value = strength * AIRLIGHT_DEPRESSION
    nt.links.new(sky.outputs["Color"], emit.inputs["Color"])

    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (60, -200)
    nt.links.new(inv.outputs["Value"], mix.inputs["Fac"])
    nt.links.new(shader_out, mix.inputs[1])
    nt.links.new(emit.outputs["Emission"], mix.inputs[2])
    return mix.outputs["Shader"]


def _material(name: str):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    return mat, mat.node_tree


def _city_material(frame: CityFrame, strength: float):
    """Massing: diffuse, albedo from the per-vertex colour attribute, plus haze."""
    mat, nt = _material("outlook_city")
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "albedo"
    attr.location = (-560, 120)
    # Diffuse only. A concrete/brick/stucco city has no specular worth tracing at
    # 100-3000 ft, and Diffuse BSDF is the cheapest closure Cycles has.
    bsdf = nt.nodes.new("ShaderNodeBsdfDiffuse")
    bsdf.location = (-240, 120)
    bsdf.inputs["Roughness"].default_value = 0.0
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (320, 0)
    nt.links.new(_haze_wrap(nt, bsdf.outputs["BSDF"], frame, strength), out.inputs["Surface"])
    return mat


def _glass_material(frame: CityFrame, strength: float, name: str, tint: str, roughness: float, coating: float = 0.24):
    """
    Curtain-wall glass, for the adjacent tower and for our own facade below.

    Deliberately NOT a Glass BSDF: real vision glass on a tower reads almost
    entirely as a REFLECTION of the sky and the city, the interior behind it is
    black, and a refractive closure here would just spend rays finding that out. A
    glossy reflection over a dark base gives the same image for a fraction of the
    cost — and unlike the WebGL version, which has to bake the reflection into a
    per-panel colour, this one actually reflects the real sky and the real city.

    Reflectance is a SOLAR-CONTROL COATING, not clear float glass, and that matters:
    clear glass is ~8% reflective at normal incidence, so a Fresnel-only facade
    renders as a near-black slab (it did — see the first Cycles test). Every real
    curtain wall since about 1990 is low-e / solar-control coated at 20-40% exterior
    reflectance, which is exactly why the tower in the reference photo is a bright
    mirror of the sky rather than a dark hole. So the mix is

        reflect = coating + (1 - coating) * fresnel

    i.e. a constant floor plus the Layer Weight node's Fresnel on top, so panels
    facing us hold the coating's reflectance and panels raking away go to a full
    mirror. That angular ramp across one facade is the thing that reads as glass.
    """
    mat, nt = _material(name)
    base = nt.nodes.new("ShaderNodeBsdfDiffuse")
    base.location = (-560, 240)
    base.inputs["Color"].default_value = (*_hex_to_linear(tint), 1.0)

    gloss = nt.nodes.new("ShaderNodeBsdfGlossy")
    gloss.location = (-560, 60)
    gloss.inputs["Color"].default_value = (0.92, 0.94, 0.96, 1.0)
    gloss.inputs["Roughness"].default_value = roughness

    fres = nt.nodes.new("ShaderNodeLayerWeight")
    fres.location = (-900, 120)
    fres.inputs["Blend"].default_value = 0.12  # ~ IOR 1.5 at normal incidence

    # reflect = coating + (1 - coating) * fresnel
    ramp = nt.nodes.new("ShaderNodeMath")
    ramp.operation = "MULTIPLY_ADD"
    ramp.location = (-720, 120)
    ramp.inputs[1].default_value = 1.0 - coating
    ramp.inputs[2].default_value = coating
    nt.links.new(fres.outputs["Fresnel"], ramp.inputs[0])

    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (-320, 140)
    nt.links.new(ramp.outputs["Value"], mix.inputs["Fac"])
    nt.links.new(base.outputs["BSDF"], mix.inputs[1])
    nt.links.new(gloss.outputs["BSDF"], mix.inputs[2])

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (320, 0)
    nt.links.new(_haze_wrap(nt, mix.outputs["Shader"], frame, strength), out.inputs["Surface"])
    return mat


# --------------------------------------------------------------------------- massing


def _scatter_mid_rise(frame: CityFrame, rnd: Mulberry32, count: int, keep_out):
    """
    The mid-rise carpet. A line-by-line mirror of scatterMidRise() in backdrop.ts —
    same constants, same order of rnd() draws, same reject test — so that the same
    seed builds the same city here as it does in the WebGL preview.

    Yields (cx, cy, cz, sx, sy, sz, albedo_hex) boxes in Blender feet.
    """
    out = []
    near = frame.span * 3.0  # street + far sidewalk; nothing nearer is a "view"
    far = frame.span * 34.0  # ~1030 ft, the last row that resolves as a roof
    storey = _ft(11, 0)  # commercial / mixed-use storey; residential is ~10'

    for _ in range(count):
        # Triangular variate to the 1.6: peaks the density about a third of the way
        # out, i.e. the middle distance, which is where the photo's roofs are densest.
        u = ((rnd() + rnd()) / 2.0) ** 1.6
        depth = near + (far - near) * u
        half_fan = depth * math.tan(62 * D2R)  # a +/-62 deg cone off due west
        cx = frame.glass_x - depth
        cy = frame.view_y + rnd.between(-half_fan, half_fan)

        # We are 130 ft up: a 12-storey block at 91 ft reaches our floor level and
        # walls the view off, so the near field is capped short and low. The photo
        # agrees — the neighbours across the street are 4-6 storeys.
        near_field = depth < far * 0.35
        max_plate = _ft(110) if near_field else _ft(170)
        w = rnd.between(_ft(55), max_plate)
        d = rnd.between(_ft(55), max_plate)

        cap = 6 if near_field else 12
        if rnd() < 0.16:
            storeys = round(rnd.between(min(7, cap), cap))
        else:
            storeys = round(rnd.between(2, min(7, cap)))
        h = storeys * storey

        if keep_out is not None and keep_out(cx, cy, w, d):
            continue

        out.append((cx, cy, frame.ground_z + h / 2.0, w, d, h, rnd.pick(WALL_COLORS)))

        # ROOF CLUTTER on the near 45%: a parapet rim (4 thin boxes so the deck
        # inside stays visible), a dark deck slab, and usually a mechanical
        # penthouse. From up here the thing you are mostly looking AT is the roof,
        # so it has to be a roof and not a lid.
        if depth < far * 0.45:
            parapet = _ft(2, 6)  # guard upstand, the code minimum for roof access
            rim = _inch(10)  # parapet wall: 8" CMU plus finish
            roof_c = rnd.pick(ROOF_COLORS)
            rim_c = rnd.pick(WALL_COLORS)  # the wall carried up past the deck
            top = frame.ground_z + h
            out.append((cx, cy, top + _inch(2), w - rim * 2, d - rim * 2, _inch(4), roof_c))
            for sy_, off in ((rim, (d - rim) / 2.0), (rim, -(d - rim) / 2.0)):
                out.append((cx, cy + off, top + parapet / 2.0, w, sy_, parapet, rim_c))
            for sx_, off in ((rim, (w - rim) / 2.0), (rim, -(w - rim) / 2.0)):
                out.append((cx + off, cy, top + parapet / 2.0, sx_, d - rim * 2, parapet, rim_c))
            if rnd() < 0.6:
                mw = w * rnd.between(0.18, 0.4)
                md = d * rnd.between(0.18, 0.4)
                mh = rnd.between(_ft(6), _ft(12))  # AHU / lift overrun / stair bulkhead
                mx = cx + rnd.between(-(w - mw) / 2.0 + rim, (w - mw) / 2.0 - rim)
                my = cy + rnd.between(-(d - md) / 2.0 + rim, (d - md) / 2.0 - rim)
                out.append((mx, my, top + mh / 2.0, mw, md, mh, "#8e8a80"))
    return out


def _scatter_skyline(frame: CityFrame, rnd: Mulberry32):
    """
    The downtown cluster on the horizon, 70-110 spans out (~2100-3350 ft). Mirrors
    scatterSkyline() in backdrop.ts. In the photo these are the faintest shapes in
    the frame and they are what says "city" rather than "suburb"; without something
    for the middle distance to be in front of, the depth cue collapses.

    Note there is no baked haze here: unlike the WebGL version, the shader applies
    aerial perspective from the real camera distance, and it applies it to these
    automatically.
    """
    out = []
    storey = _ft(12, 6)  # office storey
    for _ in range(18):
        depth = rnd.between(frame.span * 70.0, frame.span * 110.0)
        half_fan = depth * math.tan(52 * D2R)
        cx = frame.glass_x - depth
        cy = frame.view_y + rnd.between(-half_fan, half_fan)
        w = rnd.between(_ft(90), _ft(220))
        d = rnd.between(_ft(90), _ft(220))
        # 12-26 office storeys = 150-325 ft. Taller and their tops sit >5 deg above
        # our horizon, which reads as a fantasy skyline instead of the low cluster
        # just over the near rooftops that the photo shows.
        h = round(rnd.between(12, 26)) * storey
        out.append((cx, cy, frame.ground_z + h / 2.0, w, d, h, "#5c6068"))
    return out


# --------------------------------------------------------------------------- tower


def _build_tower(frame: CityFrame, strength: float, scale: float):
    """
    THE ADJACENT CURTAIN-WALL TOWER — the most important object out there.

    In the reference photo it stands immediately to the right of the window wall,
    close enough that its facade fills the right-hand glazed bay floor to soffit,
    and it is unmistakably a curtain wall: a fine vertical mullion rhythm, darker
    spandrel bands at every floor line, panel-to-panel variation in what the glass
    reflects. Right of frame while looking WEST is NORTH, so it goes north-west.

    Without the mullion grid this is a blue box, and a blue box at 140 ft is the
    single most game-like object you can put in an arch-viz frame. The grid also
    gives it scale: the 5'-0" glazing module is the industry standard and the eye
    knows it.

    Geometry, positions and module all match buildTower() in backdrop.ts. What
    differs on purpose is the panel appearance: the WebGL version has to bake a
    reflection into each panel's colour, whereas here the glass shader reflects the
    actual sky and the actual city, so no per-panel tint is needed and the tower's
    PRNG stream is never consumed.

    Returns a list of objects (body+mullions in one mesh, glass in another).
    """
    W = frame.span * 4.0  # ~121 ft facade — a normal downtown plate
    D = frame.span * 2.8  # ~85 ft deep
    H = frame.span * 10.5  # ~319 ft, ~26 storeys: fills the glass and keeps going
    dist = frame.span * 4.6  # ~140 ft: across the street. Nearer and it swallows
    #   the whole right half of the frame instead of the right third.

    # Facade rake, 24 deg off square, turned so the glazed face looks back EAST at
    # the unit. In PLAN axes (+x east, +y south) the outward normal is
    #   nz = (cos rake, sin rake)   = east, and 24 deg toward the south
    # and the along-facade axis is
    #   ax = (sin rake, -cos rake)  = east, and mostly toward the north
    # which is the same pair backdrop.ts gets from rotation.y = +66 deg.
    rake = 24.0 * D2R
    ax = (math.sin(rake), -math.cos(rake))
    nz = (math.cos(rake), math.sin(rake))

    cx = frame.glass_x - dist
    # pushed well north (plan -y) so the west glazing sees its SOUTHERN half: the
    # tower enters the frame from the right-hand edge and runs off it, which is the
    # composition in the photo
    cy = frame.north_y - W * 0.62

    def at(u: float, v: float) -> tuple[float, float]:
        """local (along-facade u, outward v) -> PLAN (x, y)"""
        return (cx + ax[0] * u + nz[0] * v, cy + ax[1] * u + nz[1] * v)

    base_z = frame.ground_z
    top_z = base_z + H

    # -- the curtain wall grid.
    # MODULE: 5'-0" vertical mullion centres. Not invented: 1500 mm / 5'-0" is the
    # near-universal unitised curtain-wall module, which is why glass towers all
    # share the same rhythm. FLOOR-TO-FLOOR 12'-6", a commercial storey, with a 30"
    # spandrel (slab edge plus its insulated back-pan) at every floor line.
    MOD = _ft(5, 0)
    F2F = _ft(12, 6)
    SPAN_H = _ft(2, 6)
    MULL_W = _inch(2.5)  # 2 1/2" sightline, a real unitised mullion face
    MULL_P = _inch(3.5)  # how far it stands proud of the glass

    cols = max(4, int(W / MOD))
    rows = max(6, int(H / F2F))
    panel_w = W / cols

    solids = BoxSoup()
    glass = BoxSoup()
    body_c = _hex_to_linear("#3b4147")
    mull_c = _hex_to_linear("#31363a")
    glass_c = (1.0, 1.0, 1.0)

    # solid shell, inset so the glazing sits proud of it, plus a rooftop mechanical
    # penthouse — every real tower has one, and it is what stops the top edge
    # reading as a clean CAD box.
    solids.add_oriented(cx, cy, (base_z + top_z) / 2.0, W - _inch(6), D - _inch(6), H, ax, body_c)
    ph = _ft(16, 0)  # lift overrun + cooling tower enclosure
    px, py = at(-W * 0.1, 0.0)
    solids.add_oriented(px, py, top_z + ph / 2.0, W * 0.42, D * 0.55, ph, ax, _hex_to_linear("#6f747a"))

    # Only the two faces the unit can see are glazed: the local +z facade (turned
    # back toward us) and the local -x end. The two facing away are left as shell,
    # which halves the geometry for free.
    # `ax` is the along-facade axis and `nz` its outward normal, so an oriented box
    # with (su along ax, sv along the normal) sits square on the facade. For the END
    # face the roles swap: its panels run along `nz`, so they are authored with
    # u_axis = nz instead.
    end_cols = max(3, int(D / MOD))
    spandrel_c = _hex_to_linear("#2f3439")
    for wide, n, pw, v_out in ((True, cols, panel_w, D / 2.0), (False, end_cols, D / end_cols, -W / 2.0)):
        u_axis = ax if wide else nz
        for r in range(rows):
            z_floor = base_z + r * F2F
            glass_h = F2F - SPAN_H
            z_mid = z_floor + SPAN_H + glass_h / 2.0
            for c in range(n):
                if wide:
                    gx, gy = at(-W / 2.0 + (c + 0.5) * pw, v_out)
                else:
                    gx, gy = at(v_out, -D / 2.0 + (c + 0.5) * pw)
                # a thin plate: the module width along the facade, 1" of thickness
                glass.add_oriented(gx, gy, z_mid, pw - MULL_W, _inch(1), glass_h, u_axis, glass_c)
            # spandrel band across the whole face at this floor line
            bz = z_floor + SPAN_H / 2.0
            if wide:
                bx, by = at(0.0, v_out + MULL_P * 0.5)
                solids.add_oriented(bx, by, bz, W, MULL_P, SPAN_H, u_axis, spandrel_c)
            else:
                bx, by = at(v_out - MULL_P * 0.5, 0.0)
                solids.add_oriented(bx, by, bz, D, MULL_P, SPAN_H, u_axis, spandrel_c)
        # vertical mullions on every module boundary, full height of the glazing
        for c in range(n + 1):
            if wide:
                mx, my = at(-W / 2.0 + c * pw, v_out + MULL_P * 0.5)
            else:
                mx, my = at(v_out - MULL_P * 0.5, -D / 2.0 + c * pw)
            solids.add_oriented(
                mx, my, base_z + rows * F2F / 2.0, MULL_W, MULL_P, rows * F2F, u_axis, mull_c
            )

    objs = [
        solids.to_object("outlook_tower_solids", _city_material(frame, strength), scale),
        glass.to_object(
            "outlook_tower_glass",
            # 24% solar-control coating: a normal high-performance curtain wall, and
            # what makes it a bright mirror of the eastern sky rather than a dark slab
            _glass_material(frame, strength, "outlook_tower_glass", "#2c343a", 0.05, 0.24),
            scale,
        ),
    ]
    # keep-out so the mid-rise scatter never grows inside the tower — same test,
    # same numbers as backdrop.ts, so the rejected buildings are the same ones
    reach = max(W, D) * 1.1

    def keep_out(bx, by, bw, bd):
        return abs(bx - cx) < (bw + reach) / 2.0 and abs(by - cy) < (bd + reach) / 2.0

    return objs, keep_out


# --------------------------------------------------------------------------- own facade


def _build_own_facade(frame: CityFrame, strength: float, scale: float, module: float):
    """
    OUR OWN BUILDING, dropping away below the glass.

    With floor-to-ceiling glazing you are standing at the edge: look down and your
    own facade falls away storey after storey. Leave it out and the city floats in
    space and the unit reads as a box on a plinth.

    And it is NOT a blank parapet: the reference photo shows this building glazed
    floor-to-ceiling in BLACK ANODISED aluminium, so the floors below are the same
    curtain wall we are standing in — dark glass between slab-edge bands, on the
    module the plan's own west windows are set out on (`module`, ~2'-11" here).

    Every plane is at a different depth off the wall face so no two faces are ever
    coplanar: the slab edge oversails 11" (that is what throws water clear), the
    glass sits 2" back, the mullions stand 4" proud. Coplanar faces on a facade this
    size z-fight into a dotted mess.
    """
    min_x, min_y, max_x, max_y = PLAN_BOUNDS
    depth_y = max_y - min_y
    wall_w = depth_y * 2.2  # wide enough that no interior camera sees either end
    yc = frame.view_y  # PLAN y of the centre of the west wall
    drop = -frame.ground_z
    floors = max(1, round(drop / frame.f2f))

    EDGE_H = _inch(14)  # 8" slab + 6" fascia: the band at every floor line
    EDGE_D = _inch(11)
    GLASS_D = _inch(2)
    MULL_D = _inch(4)
    MULL_W = _inch(2.5)  # slim, matching the photo

    solids = BoxSoup()
    glass = BoxSoup()
    slab_c = _hex_to_linear("#7e7a73")
    mull_c = _hex_to_linear("#202427")  # black anodised aluminium

    def band(x0, x1, z0, z1, soup, color):
        soup.add((x0 + x1) / 2.0, yc, (z0 + z1) / 2.0, x1 - x0, wall_w, z1 - z0, color)

    for i in range(floors + 1):
        z = -i * frame.f2f
        # stops 3" short of the wall face: hidden by the wall, and not coplanar
        band(frame.glass_x - EDGE_D, frame.glass_x - _inch(3), z - EDGE_H, z, solids, slab_c)
        if i == floors:
            break
        band(frame.glass_x - GLASS_D, frame.glass_x - _inch(1), z - frame.f2f + _inch(1), z - EDGE_H, glass, (1.0, 1.0, 1.0))

    n_mull = max(2, round(wall_w / module))
    for i in range(n_mull + 1):
        y = yc - wall_w / 2.0 + i * wall_w / n_mull
        # stops 1/4" under our slab edge; every band below oversails the mullion
        # face by 7", so the crossings need no cutting
        solids.add(
            (frame.glass_x - MULL_D + frame.glass_x - _inch(0.5)) / 2.0,
            y,
            (frame.ground_z + (-EDGE_H - _inch(0.25))) / 2.0,
            MULL_D - _inch(0.5),
            MULL_W,
            (-EDGE_H - _inch(0.25)) - frame.ground_z,
            mull_c,
        )

    return [
        solids.to_object("outlook_own_facade", _city_material(frame, strength), scale),
        glass.to_object(
            "outlook_own_glass",
            # looking DOWN at it, so it mirrors the city and the dark underside of
            # the sky, not the bright horizon — hence a much darker base than the
            # tower's glass
            # our own glazing, seen from above at a raking angle. Same coating; the
            # difference in how it reads is entirely that it mirrors the dark city
            # below rather than the bright sky.
            _glass_material(frame, strength, "outlook_own_glass", "#23282c", 0.04, 0.20),
            scale,
        ),
    ]


# --------------------------------------------------------------------------- ground


def _build_ground(frame: CityFrame, strength: float, scale: float):
    """
    The street plane, far below. Flat, dark, and only ever glimpsed between
    buildings, where it reads as the floor of the city that makes the roofs pop.

    900 spans (~27,000 ft, 5 miles) each way, which is much larger than the WebGL
    version needs to be. The reason is the Nishita sky: it has no ground, so
    everything below its horizon is nearly black, and any visible EDGE of this plane
    shows up as a hard line with black sky under it. At 900 spans the edge sits
    0.25 deg below the true horizon and the shader's haze has taken it to exactly the
    sky's horizon colour (99.99%), so there is nothing to see. The WebGL version
    cannot do this — its haze is baked per vertex, so a plane this big would make the
    near gradient coarse — which is why the two differ here.

    Twelve triangles either way. No subdivision: unlike the WebGL version the Cycles
    haze is evaluated per pixel.
    """
    half = frame.span * 900.0
    soup = BoxSoup()
    # A 6"-thick slab rather than a plane: a plane's back face is a light leak in a
    # path tracer and this costs 10 more triangles.
    soup.add(
        frame.glass_x - frame.span * 40.0,
        frame.view_y,
        frame.ground_z - _inch(3),
        half * 2.0,
        half * 2.0,
        _inch(6),
        _hex_to_linear("#6b6862"),
    )
    return soup.to_object("outlook_ground", _city_material(frame, strength), scale)


# --------------------------------------------------------------------------- build_city


def build_city(
    seed: int = DEFAULT_SEED,
    *,
    tod: float = 0.72,
    strength: float = 1.0,
    blocks: int = 260,
    level: int = 14,
    bounds=PLAN_BOUNDS,
    ceiling: float = PLAN_CEILING,
    west_glazing_module: float = _ft(2, 11),
    tower: bool = True,
    facade: bool = True,
    scale: float = 1.0,
    collection=None,
):
    """
    Build the exterior massing and return (collection, objects).

    Same city as buildBackdrop() in src/render3d/backdrop.ts for the same seed: the
    mid-rise scatter, the far skyline, the tower's position and the tower's keep-out
    rejections all come out of the identical PRNG sequence.

    Parameters
    ----------
    seed : integer 0..2**32-1. Must match the seed the preview uses.
    tod : 0..1 time of day; only used to pick the haze colour, which is sampled from
        a sky node with this sun in it.
    strength : the world's Background strength. The haze emission is multiplied by
        the same number so the city dissolves into the sky at the right brightness
        whatever exposure render.py picks.
    blocks : mid-rise count. They are all one mesh, so this costs vertices, not
        objects or draw calls.
    level : which floor the unit is on. Must match BackdropOptions.level.
    bounds, ceiling : plan footprint bounds and ceiling height. Defaults come from
        plan.ts; pass the real values if the plan changes.
    west_glazing_module : bay spacing of our own curtain wall. Default 2'-11", the
        average of the four west window widths in plan.ts (2'-9", 2'-8", 2'-9",
        3'-6") — the same number backdrop.ts derives from the plan at runtime.
    scale : multiplier on every coordinate. 1.0 = one Blender unit per FOOT, which
        is what the rest of this project uses. Pass 0.3048 for a metric scene.
    collection : link the objects into this collection. If None a new collection
        named "Outlook" is created but NOT linked to any scene — render.py decides
        where it goes, because render.py owns the scene graph.

    Cheapness, applied to every object here: invisible to diffuse rays (so it can
    neither light the interior nor be sampled by it), casts no shadows, and is not
    seen by volume scatter. It stays visible to camera, glossy and transmission
    rays, which is exactly the set that matters for "seen through a window".
    """
    frame = CityFrame(bounds=bounds, ceiling=ceiling, level=level, tod=tod)

    objs = []
    keep_out = None
    if tower:
        tower_objs, keep_out = _build_tower(frame, strength, scale)
        objs.extend(tower_objs)

    # ONE stream for the massing, salted exactly as backdrop.ts salts it, and drawn
    # in the same order: all of the mid-rise first, then the skyline.
    rnd = Mulberry32(seed ^ MASSING_SALT)
    boxes = _scatter_mid_rise(frame, rnd, blocks, keep_out)
    boxes += _scatter_skyline(frame, rnd)

    soup = BoxSoup()
    for cx, cy, cz, sx, sy, sz, col in boxes:
        soup.add(cx, cy, cz, sx, sy, sz, _hex_to_linear(col) if isinstance(col, str) else col)
    objs.append(soup.to_object("outlook_massing", _city_material(frame, strength), scale))

    objs.append(_build_ground(frame, strength, scale))
    if facade:
        objs.extend(_build_own_facade(frame, strength, scale, west_glazing_module))

    coll = collection or bpy.data.collections.new("Outlook")
    for ob in objs:
        # See the docstring: this is the whole cheapness story, and it is also what
        # stops a city-sized emissive haze term from lighting the apartment.
        ob.visible_diffuse = False
        ob.visible_shadow = False
        ob.visible_volume_scatter = False
        ob.visible_glossy = True
        ob.visible_transmission = True
        if ob.name not in coll.objects:
            coll.objects.link(ob)
    coll["seed"] = int(seed)
    coll["ground_z"] = frame.ground_z
    coll["haze_dist"] = frame.haze_dist
    return coll, objs


def build_outlook(tod: float = 0.72, strength: float = 1.0, seed: int = DEFAULT_SEED, *, scene=None, **city_kwargs):
    """
    Convenience: the sky and the city in one call, on one time of day.

    Returns (world, collection, objects). If `scene` is given the world is assigned
    and the collection is linked to scene.collection; otherwise nothing in bpy's
    scene graph is touched and the caller places both.
    """
    world = build_world(tod, strength, scene=scene)
    coll, objs = build_city(seed, tod=tod, strength=strength, **city_kwargs)
    if scene is not None and coll.name not in scene.collection.children:
        scene.collection.children.link(coll)
    return world, coll, objs


# --------------------------------------------------------------------------- self-check

if __name__ == "__main__":
    # Run with:
    #   blender -b --factory-startup --python scripts/blender/world.py
    # Prints the same count/checksum/first-rows that the TS-side probe prints, which
    # is what proves the two renderers really are building the same city.
    _frame = CityFrame()
    _rnd = Mulberry32(DEFAULT_SEED ^ MASSING_SALT)
    _tower_objs, _keep = _build_tower(_frame, 1.0, 1.0)
    _boxes = _scatter_mid_rise(_frame, _rnd, 260, _keep) + _scatter_skyline(_frame, _rnd)
    # The scatter works in PLAN coordinates, which are exactly the three.js world
    # coordinates the TS probe prints once you read them as (x, height, planY).
    _sum = 0.0
    for _cx, _cy, _cz, _sx, _sy, _sz, _c in _boxes:
        _sum += _cx + _cz + _cy + _sx + _sz + _sy
    print(f"count {len(_boxes)} checksum {_sum:.3f}")
    for _i in (0, 1, 2, 3, 4, 5, len(_boxes) - 2, len(_boxes) - 1):
        _cx, _cy, _cz, _sx, _sy, _sz, _c = _boxes[_i]
        print(f"{_i} pos {_cx:.4f},{_cz:.4f},{_cy:.4f} size {_sx:.4f},{_sz:.4f},{_sy:.4f}")
    print("ok")
