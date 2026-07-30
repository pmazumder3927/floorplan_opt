"""
Headless GPU path-traced hero frame: Cycles + OptiX on an RTX 4080 SUPER.

    LD_LIBRARY_PATH=/usr/lib/wsl/lib ~/.local/opt/blender/blender -b \
      --factory-startup --python scripts/blender/render.py -- \
      --glb renders/demo-openloft.glb --out renders/rt-eye-living.png \
      --camera-pos=11.2225,5.5,9.4936 --camera-target=0.59,4.9167,9.3763 \
      --fov 64 --res 1280x800 --samples 256 --tod 0.72 --exposure 1.2

Use the `--flag=value` form for the vectors: they can start with a minus sign
(every camera west or north of the origin does) and argparse would read that as
another flag.

Normally you do not type any of this: `npx tsx scripts/raytrace.ts` computes the
camera from the SAME cameraFor() the WebGL preview uses and spawns this.

This is the "ultrarealism" path. The WebGL/swiftshader route in scripts/shot.ts
stays as the fast preview; it cannot reach the GPU here (no Vulkan loader in
WSL), which is exactly why the hero frame goes through Blender instead.

GPU STATUS ON THIS MACHINE — read before believing the file name
The OptiX path is written properly and is tried first (preload_optix,
configure_devices, then a real 16x16 render in optix_preflight). It does not
currently work here, and the reason is not in this repo: WSL's own
/usr/lib/wsl/lib/libnvoptix.so.1 is a mislabelled dxcore stub with no
`optixQueryFunctionTable`, and the only complete OptiX library on the box is the
one from the apt nvidia-driver-575 package, which cannot create a device context
against the WSL/Windows 591.x driver stack (OPTIX_ERROR_UNKNOWN). So every frame
falls back to CUDA + GPU OpenImageDenoise, which is still the RTX 4080 SUPER
doing the path tracing — measured 9.5 s for 1280x800 at 256 samples versus ~127 s
for the same frame on 24 CPU cores. When a WSL driver ships a working loader, the
preflight passes and the OptiX branch (RT cores + the OptiX AI denoiser) lights
up with no code change.

--------------------------------------------------------------------------------
THE AXIS MAPPING — work it out once, here, and never again
--------------------------------------------------------------------------------
Four frames of reference are involved. Getting this wrong does not crash; it
MIRRORS THE APARTMENT, which is why it is verified at runtime (see
`verify_axes`) and why the render aborts if the check fails.

  1. plan space (src/core/*):  +x EAST, +y SOUTH (down the page). Feet.
  2. three.js world (src/render3d/build.ts): plan (x, y) at height h maps to
     (x, h, y). So three +Y is up and three +Z is plan SOUTH. Feet.
  3. glTF: same as three.js. GLTFExporter writes the scene verbatim — Y-up,
     right-handed, no unit conversion.
  4. Blender: +Z up. The glTF importer converts Y-up to Z-up by rotating the
     imported roots -90 deg about X, which maps a glTF point (X, Y, Z) to
     Blender (X, -Z, Y).

Composing 1 -> 4:  plan (px, py) at height h  ->  BLENDER (px, -py, h)

    Blender +X = plan +x = EAST
    Blender +Y = plan -y = NORTH        <- the sign that mirrors the flat
    Blender +Z = height  = UP
    1 Blender unit = 1 FOOT (nothing rescales anywhere in the chain)

So Blender's frame is the ordinary surveyor's frame: X east, Y north, Z up. The
unit occupies X 0..30.36, Y -19.8..0, Z 0..9.
Consequences used below:
  - the glazed WEST wall is at X = 0; the kitchen run is along Y = -19.17 (south)
    at the WEST end (small X) -> that is what verify_axes() checks.
  - a compass bearing A (clockwise from north) points (sin A, cos A) in Blender,
    which is also exactly Blender's Nishita `sun_rotation` convention (measured
    from +Y toward +X — verified empirically, not assumed).

--camera-pos / --camera-target are given in THREE.JS WORLD coordinates, i.e.
straight out of cameraFor() with no massaging, and converted here with the same
one-liner as the geometry. That is deliberate: one conversion, one place, so the
ray-traced frame cannot drift from the preview.
"""

from __future__ import annotations

import argparse
import ctypes
import glob
import math
import os
import random
import sys
import time
from dataclasses import dataclass

import bpy
import mathutils

# No __pycache__ in the repo: these modules are imported once per render, and the
# byte-code cache saves single-digit milliseconds while littering scripts/blender
# with files nothing ignores.
sys.dont_write_bytecode = True

# materials.py and world.py live next to this file; Blender does not put that
# directory on sys.path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import materials  # noqa: E402

# scripts/blender/world.py is the OUTLOOK: the Nishita sky plus the city seen
# through the west glass, generated from the same seeded PRNG as the WebGL
# preview's src/render3d/backdrop.ts so both renderers look out at the SAME city.
# It is authored separately and owns none of the render settings, so it is
# imported opportunistically: when it is there we use it (it is the one that
# matches the preview), and when it is not, add_daylight()/build_context() below
# are a self-contained fallback that keeps this file able to produce a frame on
# its own. Whichever runs is logged.
try:
    import world  # noqa: E402
except Exception as _world_err:            # ImportError, or anything it raises
    world = None
    _WORLD_IMPORT_ERROR = repr(_world_err)
else:
    _WORLD_IMPORT_ERROR = None

FT = 1.0
IN = 1.0 / 12.0


def log(msg: str = '') -> None:
    """One prefix so raytrace.ts can stream and label this."""
    print(f'[blender] {msg}', flush=True)


# --------------------------------------------------------------------- OptiX

def preload_optix() -> str | None:
    """Make the REAL libnvoptix loadable before Cycles looks for it.

    Why this exists. Cycles finds the OptiX backend by dlopen'ing
    "libnvoptix.so.1". Under WSL, /usr/lib/wsl/lib — which we MUST have on
    LD_LIBRARY_PATH for libcuda.so.1 — ships a 10 KB dxcore stub of that name
    with no `optixQueryFunctionTable` symbol, so the loader finds the stub first
    and OptiX init fails with error 7805 (ENTRY_SYMBOL_NOT_FOUND). Blender then
    reports the GPU as a plain CUDA device: rendering still works, but there are
    no RT cores and no OptiX denoiser, and a frame that should take seconds
    takes minutes.

    The real driver library is the full one in the distro lib dir (installed
    with the NVIDIA driver package). dlopen matches an already-loaded object by
    SONAME, so ctypes-loading it here with RTLD_GLOBAL means Cycles' later
    dlopen("libnvoptix.so.1") resolves to this one. That is the whole fix, and
    it keeps the workaround inside this file instead of in every caller's
    environment.

    Returns the path that was preloaded, or None if the stub is all there is.
    """
    override = os.environ.get('FLOORTEST_OPTIX_LIB')
    cands = [override] if override else []
    for d in ('/lib/x86_64-linux-gnu', '/usr/lib/x86_64-linux-gnu', '/usr/local/lib'):
        cands += sorted(glob.glob(os.path.join(d, 'libnvoptix.so.*')), reverse=True)
    for path in cands:
        if not path or not os.path.exists(path):
            continue
        try:
            handle = ctypes.CDLL(path, mode=ctypes.RTLD_GLOBAL)
        except OSError as e:
            log(f'  optix: cannot load {path}: {e}')
            continue
        if not hasattr(handle, 'optixQueryFunctionTable'):
            # the WSL dxcore stub lands here
            log(f'  optix: {path} has no optixQueryFunctionTable (stub) — skipping')
            continue
        return path
    return None


def configure_devices(force_cpu: bool = False, avoid: tuple[str, ...] = ()) -> tuple[str, list[str]]:
    """Turn on OptiX (or fail loudly), disable the CPU, and report what is live.

    A silent fall back to CPU is the failure mode that matters: same picture,
    100x the time. So this prints every device it touched and the caller prints
    the render time next to it.

    `avoid` lets the caller retry without a backend that passed device
    enumeration but then blew up for real (see optix_preflight).
    """
    prefs = bpy.context.preferences.addons['cycles'].preferences

    preloaded = preload_optix()
    log(f'  optix: preloaded {preloaded}' if preloaded
        else '  optix: no full libnvoptix found — expecting CUDA only')

    backend = 'NONE'
    if not force_cpu:
        for want in ('OPTIX', 'CUDA'):
            if want in avoid:
                continue
            try:
                prefs.compute_device_type = want
            except TypeError:
                continue
            # refresh_devices(), NOT the removed get_devices(), on 4.2+
            prefs.refresh_devices()
            usable = [d for d in prefs.get_devices_for_type(want) if d.type == want]
            if usable:
                backend = want
                break

    enabled: list[str] = []
    for d in prefs.devices:
        # Enable every device of the chosen backend; DISABLE the CPU. Mixing the
        # CPU in makes Cycles balance tiles against the slowest device and, with
        # OptiX, forces the slower "CPU + GPU" kernel path.
        d.use = (d.type == backend)
        state = 'ON ' if d.use else 'off'
        log(f'  device {state} {d.type:<6} {d.name}')
        if d.use:
            enabled.append(f'{d.type}:{d.name}')

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU' if (backend == 'NONE' or force_cpu) else 'GPU'
    log(f'  compute_device_type={prefs.compute_device_type} '
        f'scene.cycles.device={scene.cycles.device} backend={backend}')
    if backend == 'CUDA':
        log('  !  OptiX unavailable, using CUDA: still the GPU path tracing, but no '
            'RT-core traversal and no OptiX denoiser (see this file\'s docstring)')
    elif backend != 'OPTIX' and not force_cpu:
        log('  !! NO GPU BACKEND — Cycles found neither OptiX nor CUDA. This frame '
            'will take MINUTES on the CPU instead of seconds. Check that Blender '
            'was launched with LD_LIBRARY_PATH=/usr/lib/wsl/lib.')
    if not enabled:
        log('  !! NO GPU DEVICE ENABLED — rendering on the CPU.')
    return backend, enabled


def optix_preflight() -> bool:
    """Prove OptiX can actually RENDER, not merely enumerate a device.

    On this machine it cannot, and the two failures look nothing alike:
    `refresh_devices()` happily reports an OPTIX device, and then the first
    render dies with OPTIX_ERROR_UNKNOWN in optixDeviceContextCreate. (Cause:
    WSL's own libnvoptix.so.1 is a mislabelled dxcore stub, so the only complete
    OptiX library present is the one from the apt nvidia-driver-575 package,
    which cannot create a context against the WSL/Windows 591.x driver stack —
    OptiX for WSL has to come from the Windows driver, and this driver revision
    does not ship a working Linux loader for it.)

    So: render 16x16 at 1 sample first. It takes a fraction of a second, and it
    turns an OptiX-shaped landmine into a logged fallback to CUDA + GPU
    OpenImageDenoise. Delete this the day the WSL driver ships a real loader —
    everything else on the OptiX path is already correct and will light up.
    """
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 16
    scene.render.resolution_y = 16
    scene.render.filepath = os.path.join(
        os.environ.get('TMPDIR', '/tmp'), 'floortest-optix-preflight.png')
    cam_data = bpy.data.cameras.new('preflight-cam')
    cam = bpy.data.objects.new('preflight-cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    try:
        bpy.ops.render.render(write_still=False)
        ok = True
    except RuntimeError as e:
        log(f'  optix preflight FAILED: {str(e).splitlines()[0]}')
        ok = False
    finally:
        bpy.data.objects.remove(cam, do_unlink=True)
        bpy.data.cameras.remove(cam_data)
    if ok:
        log('  optix preflight ok — RT cores + OptiX denoiser are live')
    return ok


# --------------------------------------------------------------------- scene

def wipe_scene() -> None:
    """--factory-startup still hands us a cube, a camera and a light."""
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)


def to_blender(v: tuple[float, float, float]) -> mathutils.Vector:
    """three.js world (x, up, southward) -> Blender (east, north, up).

    The single place the axis mapping from the module docstring is applied to
    anything other than the imported geometry.
    """
    return mathutils.Vector((v[0], -v[2], v[1]))


def import_glb(path: str) -> list[bpy.types.Object]:
    if not os.path.exists(path):
        raise SystemExit(f'[blender] no such glb: {path}')
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    added = [ob for ob in bpy.data.objects if ob not in before]
    meshes = [ob for ob in added if ob.type == 'MESH']
    log(f'  imported {len(added)} object(s), {len(meshes)} mesh(es) from {path}')

    # The three.js light rig is tuned for a rasteriser (a no-shadow "window
    # fill" cheat, a north bounce light, clamped point lights). In a path tracer
    # those double-count with real sky+sun and flatten everything, so they go.
    # BEFORE deleting anything: removing an object invalidates every other
    # reference in `added` (bpy structs are not weak refs — touching one raises
    # "StructRNA of type Object has been removed").
    read_export_metadata(added)

    lights = [ob for ob in added if ob.type == 'LIGHT']
    for ob in lights:
        bpy.data.objects.remove(ob, do_unlink=True)
    if lights:
        log(f'  dropped {len(lights)} imported light(s) (rasteriser rig)')
    return [ob for ob in bpy.data.objects if ob.type == 'MESH']


def read_export_metadata(added: list[bpy.types.Object]) -> None:
    """Check the exporter's own declaration instead of assuming.

    shot/export.ts stamps a `floorLab` block into the root node's glTF extras
    (units, feetToMeters, showCeiling, timeOfDay, ...) precisely so this stage
    does not have to guess. Blender surfaces extras as object custom properties.
    The one that matters is UNITS: everything downstream — every procedural
    texture scale in materials.py, every distance in build_context — assumes
    1 Blender unit == 1 foot.
    """
    for ob in added:
        meta = ob.get('floorLab')
        if meta is None:
            continue
        try:
            units = str(meta.get('units', '?'))
            f2m = float(meta.get('feetToMeters', 0.0))
            ceil = bool(meta.get('showCeiling', False))
            tod = meta.get('timeOfDay', '?')
        except Exception:
            log(f'  glb metadata present on {ob.name} but unreadable')
            return
        log(f'  glb metadata: units={units} feetToMeters={f2m} '
            f'showCeiling={ceil} timeOfDay={tod}')
        if units != 'feet':
            log(f'  !! the exporter says units are {units!r}, not feet. Every '
                'texture scale and context distance in this renderer assumes '
                'FEET (1 unit = 1 ft) — the picture will be wrong.')
        return


def world_bbox(objs: list[bpy.types.Object]):
    lo = [math.inf] * 3
    hi = [-math.inf] * 3
    for ob in objs:
        for corner in ob.bound_box:
            p = ob.matrix_world @ mathutils.Vector(corner)
            for i in range(3):
                lo[i] = min(lo[i], p[i])
                hi[i] = max(hi[i], p[i])
    return lo, hi


def fmt_box(lo, hi) -> str:
    return ('x[{:.2f},{:.2f}] y[{:.2f},{:.2f}] z[{:.2f},{:.2f}]'
            .format(lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]))


def verify_axes(meshes: list[bpy.types.Object], strict: bool) -> bool:
    """Prove the axis mapping on a known object instead of trusting the comment.

    The kitchen counter run (plan.ts fixture COUNTER) is a 10'-1" x 2'-1" strip
    against the SOUTH wall at the WEST end of the unit. Under the mapping in the
    module docstring that must land at small X (west) and NEGATIVE Y (south).
    If the importer's up-axis conversion ever changes, or someone flips a sign in
    the exporter, this is the check that catches it — a mirrored apartment is
    otherwise completely plausible-looking.
    """
    scene_lo, scene_hi = world_bbox(meshes)
    log(f'  scene bbox    {fmt_box(scene_lo, scene_hi)}  (feet)')

    counter = [ob for ob in meshes if ob.name.startswith('fixture:COUNTER')]
    if not counter:
        counter = [ob for ob in meshes if 'counter' in ob.name.lower()]
    if not counter:
        log('  ?? axis check SKIPPED: no kitchen counter object in the glb '
            '(expected names like "fixture:COUNTER/top"). Axis mapping UNVERIFIED.')
        return True

    lo, hi = world_bbox(counter)
    log(f'  counter bbox  {fmt_box(lo, hi)}  ({len(counter)} object(s))')
    cx = (lo[0] + hi[0]) / 2
    cy = (lo[1] + hi[1]) / 2
    mid_x = (scene_lo[0] + scene_hi[0]) / 2
    mid_y = (scene_lo[1] + scene_hi[1]) / 2

    west_ok = cx < mid_x                    # west half of the unit
    south_ok = cy < mid_y                   # south half; Blender +Y is NORTH
    # and it is a run along the wall, not across the room: long in X, shallow in Y
    run_ok = (hi[0] - lo[0]) > 2.0 * (hi[1] - lo[1])
    low_ok = lo[2] < 0.5 and hi[2] < 8.0    # it stands on the floor

    ok = west_ok and south_ok and run_ok and low_ok
    detail = (f'west={west_ok} south={south_ok} runs-east-west={run_ok} '
              f'on-the-floor={low_ok}')
    if ok:
        log(f'  axis check PASSED: counter is west + south, runs E-W ({detail})')
        return True
    log('  !! AXIS CHECK FAILED — the kitchen counter is not where the mapping')
    log(f'  !! says it should be ({detail}). The plan is probably MIRRORED.')
    log('  !! Fix the mapping (see this file\'s docstring) or pass '
        '--allow-axis-mismatch to render anyway.')
    return not strict


# --------------------------------------------------------------------- camera

def add_camera(pos3: tuple[float, float, float], target3: tuple[float, float, float],
               fov_deg: float, res: tuple[int, int], top_view: bool) -> bpy.types.Object:
    """Place a camera that frames IDENTICALLY to the WebGL preview.

    `fov_deg` is three.js PerspectiveCamera.fov, which is the VERTICAL field of
    view; Blender defaults to fitting the sensor to the larger image dimension,
    so sensor_fit is forced to VERTICAL and angle_y is set directly. Then both
    renderers derive the horizontal fov from the same aspect ratio and the two
    images line up pixel for pixel.
    """
    pos = to_blender(pos3)
    tgt = to_blender(target3)

    data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    data.sensor_fit = 'VERTICAL'
    data.lens_unit = 'FOV'
    data.angle_y = math.radians(fov_deg)
    # Feet, and a 508 sq ft flat: 0.05 ft near clip keeps the camera usable when
    # it is 2'-6" off the glass, and 4000 ft far clip covers the city context.
    data.clip_start = 0.05
    data.clip_end = 4000.0

    # A Blender camera looks down its local -Z with local +Y up.
    forward = (tgt - pos)
    if forward.length < 1e-6:
        raise SystemExit('[blender] camera position and target are the same point')
    forward.normalize()
    back = -forward
    # Up hint. Normally world up. For the straight-down top view that is
    # degenerate, and the preview uses three up=(0,0,-1) — plan -y, i.e. plan
    # NORTH — so the printed plan and the render agree; that is Blender +Y.
    up_hint = mathutils.Vector((0.0, 1.0, 0.0)) if top_view else mathutils.Vector((0.0, 0.0, 1.0))
    right = up_hint.cross(back)
    if right.length < 1e-6:
        # looking straight along the hint: pick any perpendicular
        right = mathutils.Vector((1.0, 0.0, 0.0)).cross(back)
    right.normalize()
    up = back.cross(right)
    up.normalize()
    cam.matrix_world = mathutils.Matrix((
        (right.x, up.x, back.x, pos.x),
        (right.y, up.y, back.y, pos.y),
        (right.z, up.z, back.z, pos.z),
        (0.0, 0.0, 0.0, 1.0),
    ))

    aspect = res[0] / res[1]
    hfov = 2 * math.atan(math.tan(math.radians(fov_deg) / 2) * aspect)
    log(f'  camera at ({pos.x:.2f},{pos.y:.2f},{pos.z:.2f}) -> '
        f'({tgt.x:.2f},{tgt.y:.2f},{tgt.z:.2f})  fov v={fov_deg:.1f} '
        f'h={math.degrees(hfov):.1f} deg  up={"north" if top_view else "+Z"}')
    return cam


def check_against_exported_camera(cam: bpy.types.Object, preset: str | None) -> None:
    """Cross-check our camera against the one the exporter shipped in the glb.

    shot/export.ts also writes the preview's cameras into the glb as glTF cameras
    named `cam:<preset>`. We deliberately do NOT use them — raytrace.ts calls
    cameraFor() itself, which keeps this renderer honest and independent — but
    they are a free, independent check on the axis conversion and the roll: they
    went through three.js -> glTF -> the importer's up-axis conversion, and ours
    went through to_blender(). If the two disagree, one of those is wrong.

    Any imported camera is removed afterwards so nothing can later pick it as the
    render camera by accident.
    """
    exported = [ob for ob in bpy.data.objects if ob.type == 'CAMERA' and ob.name.startswith('cam:')]
    if exported and preset:
        want = f'cam:{preset}'
        match = next((ob for ob in exported if ob.name.split('.')[0] == want), None)
        if match is None:
            log(f'  camera check: the glb has no {want} (has '
                f'{", ".join(sorted(o.name for o in exported)[:4])}...)')
        else:
            dpos = (match.matrix_world.translation - cam.matrix_world.translation).length
            # angle between the two view directions (camera looks down local -Z)
            v1 = (cam.matrix_world.to_3x3() @ mathutils.Vector((0, 0, -1))).normalized()
            v2 = (match.matrix_world.to_3x3() @ mathutils.Vector((0, 0, -1))).normalized()
            dang = math.degrees(v1.angle(v2))
            ok = dpos < 0.02 and dang < 0.25
            log(f'  camera check {"PASSED" if ok else "MISMATCH"}: vs {want} '
                f'dpos={dpos:.4f} ft dangle={dang:.3f} deg')
            if not ok:
                log('  !! our camera and the preview camera disagree — the frame will '
                    'NOT match the WebGL preview. Suspect to_blender() or the fov fit.')
    for ob in exported:
        bpy.data.objects.remove(ob, do_unlink=True)


# --------------------------------------------------------------------- daylight

def sun_vector(az_deg: float, el_deg: float) -> mathutils.Vector:
    """Compass bearing (clockwise from north) + elevation -> Blender direction.

    Blender +Y is plan north and +X is plan east (see the module docstring), so a
    bearing A points (sin A, cos A) horizontally. This is the same expression
    build.ts uses for the preview's sun, so the shadows fall the same way.
    """
    az, el = math.radians(az_deg), math.radians(el_deg)
    return mathutils.Vector((math.cos(el) * math.sin(az),
                             math.cos(el) * math.cos(az),
                             math.sin(el)))


def add_daylight(az_deg: float, el_deg: float, sky_strength: float, sun_strength: float) -> None:
    """A hazy-bright daylight rig: Nishita sky dome + one real sun.

    The photo is a bright HAZY day on a high floor: the sky is nearly white near
    the horizon, the adjacent tower is washed out, and the interior still gets a
    hard sun patch. So:
      - the sky dome does the ambient work, with the dust/ozone dialled up for
        haze. Its own sun disc is OFF because
      - a separate Sun light gives the direct beam. It samples far better than a
        sky-texture disc seen through four window openings (importance sampling
        an environment through a small hole is the classic interior noise
        source), and its angular size can be widened for haze.
    """
    world = bpy.data.worlds.new('daylight')
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    sky = nt.nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'NISHITA'
    sky.sun_disc = False
    sky.sun_elevation = math.radians(el_deg)
    # Verified empirically (not assumed): sun_rotation 0 puts the sun toward +Y
    # and +90 deg moves it to +X, i.e. it IS a compass bearing in this frame.
    sky.sun_rotation = math.radians(az_deg)
    sky.air_density = 1.4      # >1 = more Rayleigh: a slightly milkier blue
    sky.dust_density = 3.2     # the haze in the photo; 0 would give a hard deep blue
    sky.ozone_density = 1.2
    sky.altitude = 120.0       # metres; a high floor of a mid-rise, an assumption
    bg.inputs['Strength'].default_value = sky_strength

    # BELOW THE HORIZON IS NOT SKY. Nishita's lower hemisphere is a bright
    # neutral "ground", and through floor-to-ceiling glazing on a high floor that
    # fills the bottom half of every window with white — the single most fake
    # thing in the first pass of this renderer. Replace it with the hazy grey of
    # a distant city, which is what the photo shows past the rooftops, and which
    # also stops a huge amount of fake uplight bouncing into the room.
    #
    # In a WORLD shader, Texture Coordinate > Generated is the ray direction, so
    # z < 0 is looking down. The 6 deg blend keeps the horizon from being a hard
    # line, which is what haze does.
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Generated'], sep.inputs[0])
    mask = nt.nodes.new('ShaderNodeMapRange')
    mask.clamp = True
    nt.links.new(sep.outputs['Z'], mask.inputs['Value'])
    mask.inputs['From Min'].default_value = -0.10   # ~6 deg below horizontal
    mask.inputs['From Max'].default_value = 0.0
    mask.inputs['To Min'].default_value = 1.0       # fully "city"
    mask.inputs['To Max'].default_value = 0.0       # fully "sky"
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    nt.links.new(mask.outputs[0], materials._sock(mix, 'Factor', 'VALUE'))
    nt.links.new(sky.outputs[0], materials._sock(mix, 'A', 'RGBA'))
    materials._sock(mix, 'B', 'RGBA').default_value = materials.srgb('#9aa3a6')
    nt.links.new([o for o in mix.outputs if o.type == 'RGBA'][0], bg.inputs['Color'])
    nt.links.new(bg.outputs[0], out.inputs['Surface'])

    data = bpy.data.lights.new('sun', type='SUN')
    data.energy = sun_strength          # W/m^2 of direct normal irradiance
    data.angle = math.radians(1.6)      # real sun is 0.53 deg; haze softens it
    data.color = (1.0, 0.955, 0.895)    # ~5600 K through haze
    sun = bpy.data.objects.new('sun', data)
    bpy.context.scene.collection.objects.link(sun)
    d = sun_vector(az_deg, el_deg)
    # a sun emits along its local -Z, so local +Z must point AT the sun
    sun.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    log(f'  daylight: az={az_deg:.1f} el={el_deg:.1f} deg  '
        f'sky={sky_strength:.2f} sun={sun_strength:.2f} W/m2  dir=({d.x:.2f},{d.y:.2f},{d.z:.2f})')


# --------------------------------------------------------------------- outlook

def drop_glb_ground(meshes: list[bpy.types.Object]) -> None:
    """Delete build.ts's ground plane.

    It exists so the WebGL render does not float in the void: a pale plane at slab
    level, extending 40 ft past the footprint. On a high floor it is simply wrong —
    it hides the city, and being a huge bright lambertian sheet right outside
    floor-to-ceiling glass it bounces an enormous amount of light that does not
    exist back into the room. Whichever outlook builds the real ground replaces it.
    """
    for ob in [o for o in meshes if o.name.split('.')[0] == 'ground']:
        log(f'  removed the glb ground plane ({ob.name}) — we are on a high floor')
        bpy.data.objects.remove(ob, do_unlink=True)
        meshes.remove(ob)


def build_context(meshes: list[bpy.types.Object]) -> None:
    """The view out of the glass: rooftops below, one tower alongside.

    Not decoration. The glazing is floor-to-ceiling, so in every eye-level frame
    the outlook is a large fraction of the image, and an empty sky behind a
    full-height window reads as fake instantly. The reference photo says exactly
    what is out there:
      - a HIGH FLOOR: we are looking DOWN on mid-rise rooftops.
      - mid-rise roofscape in the middle distance, hazy.
      - a glass curtain-wall tower IMMEDIATELY adjacent on the right. Looking
        west, right hand = NORTH, so the tower goes north-west.

    Numbers here are the honest assumptions they are: the photo does not tell us
    the floor number, so ~11 storeys (110 ft) up with 4-6 storey neighbours is
    read off how far below the horizon the roofs sit.
    """
    drop_glb_ground(meshes)
    lo, hi = world_bbox(meshes)

    rng = random.Random(20250729)   # fixed: the outlook must not change per frame
    roof_mat = materials.surface_material('context-roof')
    deck_mat = materials.surface_material('context-deck')
    glass_mat = materials.surface_material('context-glass')
    # three wall tones, weighted: mostly grey render, some brick, a few dark
    wall_mats = ([materials.surface_material('context-wall')] * 4
                 + [materials.surface_material('context-wall-warm')] * 3
                 + [materials.surface_material('context-wall-dark')] * 2)

    # ONE unit cube, shared by every block as linked mesh data, instanced by
    # object transform. bpy.ops.mesh.primitive_cube_add() costs ~30 ms per call
    # (it runs a full operator with context and depsgraph updates), which for the
    # ~600 boxes below is 18 seconds — longer than the render itself. Building the
    # mesh once and linking it is ~1 ms per object, and the memory for the whole
    # city is one 8-vertex mesh.
    unit = bpy.data.meshes.new('context:unit-cube')
    h = 0.5
    unit.from_pydata(
        [(-h, -h, -h), (h, -h, -h), (h, h, -h), (-h, h, -h),
         (-h, -h, h), (h, -h, h), (h, h, h), (-h, h, h)],
        [],
        [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)],
    )
    unit.update()
    # One placeholder slot on the shared mesh, so each instance can override the
    # material at OBJECT level (per-object material on shared data).
    unit.materials.append(roof_mat)

    def box(name, cx, cy, z0, z1, w, d, mat) -> bpy.types.Object:
        ob = bpy.data.objects.new(name, unit)
        ob.location = (cx, cy, (z0 + z1) / 2)
        ob.scale = (w, d, max(0.1, z1 - z0))
        ob.material_slots[0].link = 'OBJECT'
        ob.material_slots[0].material = mat
        bpy.context.scene.collection.objects.link(ob)
        return ob

    # ---- the roofscape plane: everything below this is city, not sky.
    # 110 ft below our slab = the street, so distant roofs sit above it.
    STREET_Z = -110.0
    box('context:street', (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2,
        STREET_Z - 2.0, STREET_Z, 6000.0, 6000.0, roof_mat)

    # ---- mid-rise blocks, on a JITTERED GRID of city blocks rather than a random
    # scatter. Scatter leaves gaps, and a gap in a roofscape shows the ground
    # plane through it, which is what makes a fake city look like a fake city: a
    # flat pale field with a few boxes on it. A 130 ft grid of 85-115 ft blocks
    # leaves 15-45 ft of street, and from 110 ft up you barely see the streets —
    # exactly like the photo, where rooftops tile the whole middle distance.
    CELL = 130.0
    REACH = 8                       # cells each way: ~1000 ft of dense city
    blocks = 0
    for gx in range(-REACH, REACH + 1):
        for gy in range(-REACH, REACH + 1):
            cx = gx * CELL + rng.uniform(-14.0, 14.0)
            cy = gy * CELL + rng.uniform(-14.0, 14.0)
            # our own block, plus a margin so nothing pokes through the glass line
            if -70.0 < cx < hi[0] + 70.0 and lo[1] - 70.0 < cy < 70.0:
                continue
            if math.hypot(cx, cy) < 80.0:
                continue
            w = rng.uniform(85.0, 115.0)
            d = rng.uniform(85.0, 115.0)
            # 4-6 storeys at ~10 ft floor-to-floor, measured DOWN from our slab:
            # every roof between 52 and 7 ft below us, nothing at eye level, so we
            # look down on them as in the photo.
            top = rng.uniform(-52.0, -7.0)
            box(f'context:block{blocks}', cx, cy, STREET_Z, top, w, d, rng.choice(wall_mats))
            # a DARK roof deck cap: membrane and ballast, not another bright wall
            box(f'context:roof{blocks}', cx, cy, top, top + 1.4, w * 1.02, d * 1.02, deck_mat)
            blocks += 1

    # ---- distant skyline: taller slabs beyond the dense grid that break the
    # horizon line, so the far distance is not a ruler-straight edge.
    for i in range(14):
        cx = rng.uniform(-2400.0, 2400.0)
        cy = rng.uniform(-2400.0, 2400.0)
        if math.hypot(cx, cy) < REACH * CELL:
            continue
        box(f'context:far{i}', cx, cy, STREET_Z, rng.uniform(-10.0, 130.0),
            rng.uniform(90.0, 200.0), rng.uniform(90.0, 200.0), rng.choice(wall_mats))

    # ---- the adjacent curtain-wall tower. PHOTO: it is very close, fills the
    # right-hand panels, and runs from below the frame to above it. Our glazing
    # is the west wall (X = 0) and north is +Y, so it sits north-west, 24 ft off
    # the glass — close enough to be a real neighbour, far enough not to be a
    # light block for the whole unit.
    box('context:tower', -38.0, 62.0, STREET_Z - 40.0, 210.0, 26.0, 118.0, glass_mat)
    # its return flank, so it does not read as a billboard
    box('context:tower-flank', -64.0, 118.0, STREET_Z - 40.0, 210.0, 26.0, 26.0,
        materials.surface_material('context-wall-dark'))

    log(f'  context: {blocks} mid-rise blocks, 1 adjacent glass tower, '
        f'street plane at {STREET_Z:.0f} ft')


def build_outlook(args: Args, meshes: list[bpy.types.Object]) -> None:
    """Sky + sun + the city out of the window, preferring scripts/blender/world.py.

    world.py is the module that keeps this frame and the WebGL preview looking at
    the SAME city: it re-implements backdrop.ts's seeded PRNG bit for bit, and its
    coordinate contract (plan (x, y, h) -> Blender (x, -y, h), 1 unit = 1 foot) is
    identical to the one in this file's docstring, so the two agree by
    construction rather than by luck.

    It is used whenever it imports, EXCEPT when the caller has overridden the sun
    with --sun-az/--sun-el: world.py derives its sun from time-of-day only (which
    is the right contract for matching the preview), so an arbitrary sun angle has
    to go through the local rig instead. Both paths are logged so the frame is
    never ambiguous about which one produced it.

    Sky strength stays at 1.0 in both: Nishita output is physically scaled and
    already correct for AgX. Grading is --exposure's job, not the sky's.
    """
    scene = bpy.context.scene
    if world is not None and not args.sun_explicit:
        try:
            world.build_world(args.tod, strength=args.sky_strength, scene=scene,
                              sun_intensity=args.sun_intensity)
            log(f'  outlook: world.py sky, tod={args.tod:.3f} '
                f'(sun {"/".join(f"{v:.1f}" for v in world.sun_angles(args.tod))} deg az/el, '
                f'sky x{args.sky_strength:.2f} sun x{args.sun_intensity:.2f})')
            if args.context:
                coll, objs = world.build_city(tod=args.tod, strength=1.0)
                if coll.name not in scene.collection.children:
                    scene.collection.children.link(coll)
                log(f'  outlook: world.py city, {len(objs)} object(s), seed '
                    f'{coll.get("seed")}, ground at {coll.get("ground_z"):.0f} ft')
                drop_glb_ground(meshes)
            else:
                log('  outlook: city skipped (--no-context)')
            return
        except Exception as e:
            # A broken outlook must not cost the frame; fall through to the local
            # rig and say exactly what happened.
            log(f'  !! world.py failed ({e!r}) — falling back to the built-in rig')
    elif world is None:
        log(f'  outlook: world.py not importable ({_WORLD_IMPORT_ERROR}) — built-in rig')
    else:
        log('  outlook: --sun-az/--sun-el given, which world.py cannot express — '
            'built-in rig')

    # Calibrated against world.py's physically-scaled Nishita sky so ONE exposure
    # default in raytrace.ts is right whichever outlook runs: on the eye-living
    # frame at --exposure 0.6 this rig means 0.34 against world.py's 0.40, i.e.
    # inside a quarter of a stop. (It cannot be exact — the two build different
    # cities, and the city is a big bright part of the frame.) The numbers are
    # high because this rig's sun disc is off and its Sun lamp carries the beam,
    # where world.py uses Nishita's own physical sun.
    # SUN:SKY RATIO IS THE WEATHER KNOB, and it was calibrated against the
    # reference photo rather than guessed. At 12.0/1.9 (ratio 6.3) the sunlit floor
    # measured L 218 with 5.9% of it clipped while the shade sat at L 82 — a far
    # wider range than the photo, whose floor holds a narrow 156-204 with nothing
    # clipped, because that is a bright HAZY day where diffuse skylight dominates
    # and the shadows are soft. Lowering the sun and lifting the sky compresses the
    # range without touching a single albedo.
    add_daylight(args.sun_az, args.sun_el,
                 sky_strength=1.9 * args.sky_strength,
                 sun_strength=12.0 * args.sun_intensity)
    if args.context:
        build_context(meshes)


# --------------------------------------------------------------------- cycles

def configure_cycles(samples: int, exposure: float, res: tuple[int, int],
                     backend: str, wb_kelvin: float = 5100.0) -> None:
    """Interior GI settings. Every one of these is here for a reason."""
    scene = bpy.context.scene
    c = scene.cycles

    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    scene.render.image_settings.compression = 15
    scene.render.film_transparent = False
    scene.render.use_persistent_data = False

    # ---- sampling
    c.samples = samples
    c.use_adaptive_sampling = True
    # 0.005 instead of the 0.01 default: an interior lit through glass converges
    # unevenly, and the loose default leaves visible blotching in the corners
    # that the denoiser then smears.
    c.adaptive_threshold = 0.005
    c.adaptive_min_samples = 0          # 0 = let Cycles pick from the threshold
    c.seed = 0
    c.use_animated_seed = False

    # ---- light transport
    # A studio lit through one glazed wall is a bounce-limited scene: the whole
    # image away from the sun patch is 2nd-4th bounce light, so diffuse depth is
    # where the money goes.
    c.max_bounces = 24
    c.diffuse_bounces = 8
    c.glossy_bounces = 8
    c.transmission_bounces = 16         # glass panes are solid slabs: enter+exit each
    c.volume_bounces = 0                # no volumetrics in this scene
    c.transparent_max_bounces = 16
    # Light tree ON: many-light importance sampling. It is what makes the
    # emissive lamp shades and the sun affordable in the same frame.
    c.use_light_tree = True
    # Caustics ON for the glazing (brief): without them the glass panes cast
    # flat grey shadows and the sun patch on the floor loses its edge.
    c.caustics_reflective = True
    c.caustics_refractive = True
    c.blur_glossy = 0.3                 # small: enough to tame fireflies, not to erase caustics
    # Clamp INDIRECT only, and modestly. Clamping direct light would cut the
    # sun; clamping indirect at 8 kills the fireflies chrome and the cooktop
    # throw without visibly darkening the bounce light.
    c.sample_clamp_indirect = 8.0
    c.sample_clamp_direct = 0.0

    # ---- denoise
    c.use_denoising = True
    # The 'OPTIX' enum entry appears as soon as prefs ENUMERATE an OptiX device,
    # which on this machine happens even when OptiX cannot render (see
    # optix_preflight). So gate on the backend we actually settled on, not on
    # whether the assignment is accepted.
    if backend == 'OPTIX':
        c.denoiser = 'OPTIX'
    else:
        c.denoiser = 'OPENIMAGEDENOISE'
        c.denoising_quality = 'HIGH'
        log('  OptiX denoiser unavailable — using OpenImageDenoise '
            f'(on GPU: {backend != "NONE"})')
    # Albedo+normal guide passes: without them the denoiser eats the plank
    # pattern and the brushed-steel streaks, which are the whole point.
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE'
    c.denoising_use_gpu = (backend != 'NONE')

    # ---- film. AgX is Blender 4.x's filmic-family view transform: it rolls the
    # blown-out sky off gracefully instead of clipping it to flat white, which is
    # exactly the failure mode of a full-height glazed frame under Standard.
    for vt in ('AgX', 'Filmic', 'Standard'):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    # 'Punchy' adds the contrast and saturation the reference photo has and
    # base AgX does not; the fallbacks cover older/newer OCIO configs.
    for look in ('AgX - Punchy', 'Punchy', 'AgX - Base Contrast', 'None'):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = exposure
    scene.view_settings.gamma = 1.0
    scene.display_settings.display_device = 'sRGB'

    # ---- WHITE BALANCE. A camera has one; a physical render does not, and that
    # difference is measurable against the reference photograph.
    #
    # The illuminant here is a Nishita sun at 54 deg through dust_density 2.2 plus
    # a hazy sky, and it is AMBER: rendered raw, the exposed-concrete soffit comes
    # out at R-G = +10 (a beige ceiling) where the photo's soffit measures R-G =
    # -16 (a cool blue-grey one). The albedos are not the problem — materials.py's
    # concrete is already a cool grey — the light is. The phone that took the
    # reference photo balanced that light away, as every camera does, which is why
    # its neutral surfaces read neutral-to-cool and its walnut floor still reads
    # warm at R-G = +17.
    #
    # So do what the camera did: balance for the illuminant instead of for D65.
    # 5100 K is the value that lands our soffit on the photo's, measured by sweep,
    # and it leaves the floor warm because the floor really is.
    #
    # Blender 4.4+ only. Guarded rather than assumed, because this file has to keep
    # producing a frame on an older build.
    vs = scene.view_settings
    wb = 'off (Blender < 4.4)'
    if wb_kelvin > 0 and hasattr(vs, 'use_white_balance'):
        vs.use_white_balance = True
        vs.white_balance_temperature = wb_kelvin
        vs.white_balance_tint = 10.0        # 10 = the neutral default on this slider
        wb = f'{wb_kelvin:.0f} K'
    elif wb_kelvin <= 0:
        wb = 'off (--wb 0)'

    log(f'  cycles: {samples} samples (adaptive {c.adaptive_threshold}), '
        f'bounces {c.diffuse_bounces}d/{c.glossy_bounces}g/{c.transmission_bounces}t, '
        f'light-tree={c.use_light_tree}, caustics={c.caustics_reflective}/{c.caustics_refractive}, '
        f'clamp_indirect={c.sample_clamp_indirect}')
    log(f'  film: view_transform={scene.view_settings.view_transform} '
        f'look={scene.view_settings.look} exposure={exposure:+.2f} wb={wb} '
        f'denoiser={c.denoiser} ({c.denoising_input_passes})')


# --------------------------------------------------------------------- main

@dataclass
class Args:
    glb: str
    out: str
    camera_pos: tuple[float, float, float]
    camera_target: tuple[float, float, float]
    fov: float
    res: tuple[int, int]
    samples: int
    tod: float
    exposure: float
    sun_az: float
    sun_el: float
    up_z: bool
    camera_name: str | None
    wb: float
    #: weather knobs, multipliers on world.py's physical Nishita sky
    sun_intensity: float
    sky_strength: float
    sun_explicit: bool
    context: bool
    allow_axis_mismatch: bool
    cpu: bool


def parse_args(argv: list[str]) -> Args:
    def vec3(s: str) -> tuple[float, float, float]:
        parts = [float(x) for x in s.split(',')]
        if len(parts) != 3:
            raise argparse.ArgumentTypeError('expected x,y,z')
        return (parts[0], parts[1], parts[2])

    def res(s: str) -> tuple[int, int]:
        w, _, h = s.lower().partition('x')
        return (int(w), int(h))

    p = argparse.ArgumentParser(prog='render.py', description=__doc__)
    p.add_argument('--glb', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--camera-pos', type=vec3, required=True,
                   help='three.js WORLD coords (x, up, southward), i.e. cameraFor() output')
    p.add_argument('--camera-target', type=vec3, required=True)
    p.add_argument('--fov', type=float, default=64.0, help='VERTICAL fov in degrees')
    p.add_argument('--res', type=res, default=(1280, 800))
    p.add_argument('--samples', type=int, default=256)
    p.add_argument('--tod', type=float, default=0.72,
                   help='0..1 across the day; only used when --sun-az/--sun-el are absent')
    p.add_argument('--exposure', type=float, default=0.0)
    p.add_argument('--sun-az', type=float, default=None, help='compass degrees, clockwise from north')
    p.add_argument('--sun-el', type=float, default=None)
    p.add_argument('--up-z', action='store_true',
                   help='top view: frame up follows plan north, matching the preview\'s up=(0,0,-1)')
    p.add_argument('--camera-name', default=None,
                   help='cameraFor() preset name. Only used to cross-check our camera '
                        'against the cam:<preset> the exporter stamps into the glb; the '
                        'camera itself always comes from --camera-pos/--camera-target')
    p.add_argument('--no-context', dest='context', action='store_false',
                   help='skip the exterior city/sky context')
    p.add_argument('--allow-axis-mismatch', action='store_true',
                   help='render even if the kitchen-counter axis check fails')
    # WEATHER. These multiply world.py's physically-scaled Nishita sky; they are
    # NOT the W/m2 values used by the add_daylight() fallback further down.
    # DEFAULT WEATHER = THE REFERENCE PHOTO'S WEATHER, and it is measured, not
    # taste. The photo is a bright OVERCAST/hazy day: no sun patch on the floor at
    # all, and the floor holds L 156 / p95 201 with nothing clipped. A physical
    # clear-sky sun (x1.0) rakes in at 37 deg and put 9.9% of the floor over 235 —
    # blown white where the photo is mid-brown. At x0.04 with the sky lifted to
    # compensate the same crop measures L ~163 / p95 ~208 / 0% clipped.
    # Pass --sun-intensity 1.0 for a sunny hero frame; it is a creative choice, and
    # the photo does not support it as the default.
    #
    # RE-TESTED as a candidate fix for the dark soffit, and it is NOT one. The theory
    # was that a 4% sun plus a 2.2x dome has no source of small angular size, so the
    # floor smears where the photo's mirrors, and that starves the ceiling. Swept on
    # eye-living at 128 spp (sun/sky, then soffit L / east-wall L / floor R-B /
    # % of the floor clipped):
    #     0.04 / 2.2 ... 115 / 135 / -10 / 0.00%     <- the default
    #     0.25 / 2.0 ... 151 / 168 /  -2 / 0.00%
    #     0.60 / 1.5 ... 165 / 179 /  +1 / 0.31%
    #     1.00 / 1.0 ... 166 / 179 /  +4 / 1.62%
    #     1.00 / 2.2 ... 192 / 194 /  +2 / 4.61%
    # The soffit/wall RATIO does improve (0.85 -> 0.99), but only because everything
    # rises into AgX's shoulder, and it costs the two things the photograph is
    # unambiguous about: the floor clips (the photo clips nothing anywhere) and every
    # near-glass surface goes WARM (R-B -10 -> +4) where the photo goes strongly cool.
    # The sun is not what is missing. See the block in world.py's _ground_bounce for
    # where the soffit deficit actually lives.
    p.add_argument('--sun-intensity', type=float, default=0.04,
                   help='multiplier on the sun DISC. 1.0 = clear sky; default matches the photo.')
    p.add_argument('--sky-strength', type=float, default=2.2,
                   help='multiplier on the whole sky. Raised to carry the light when the sun is down.')
    p.add_argument('--wb', type=float, default=5100.0,
                   help='white balance in Kelvin: the CCT of the scene illuminant, '
                        'which is what gets neutralised. 0 disables (raw physical '
                        'colour, warmer than any camera would render it)')
    p.add_argument('--cpu', action='store_true', help='force CPU (for comparison timing only)')
    a = p.parse_args(argv)

    tod = min(1.0, max(0.0, a.tod))
    # Same expressions as addLighting() in src/render3d/build.ts, so the hero
    # frame and the preview agree on where the sun is.
    az = a.sun_az if a.sun_az is not None else 90.0 + 180.0 * tod
    el = a.sun_el if a.sun_el is not None else max(8.0, 70.0 * math.sin(math.pi * tod))
    return Args(glb=a.glb, out=a.out, camera_pos=a.camera_pos, camera_target=a.camera_target,
                fov=a.fov, res=a.res, samples=a.samples, tod=tod, exposure=a.exposure,
                sun_az=az, sun_el=el, sun_explicit=(a.sun_az is not None or a.sun_el is not None),
                up_z=a.up_z, camera_name=a.camera_name, wb=a.wb,
                sun_intensity=a.sun_intensity, sky_strength=a.sky_strength,
                context=a.context,
                allow_axis_mismatch=a.allow_axis_mismatch, cpu=a.cpu)


def main() -> int:
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = parse_args(argv)
    t_all = time.time()

    log(f'render.py  {args.res[0]}x{args.res[1]} @ {args.samples} samples '
        f'-> {args.out}')
    backend, enabled = configure_devices(force_cpu=args.cpu)
    if backend == 'OPTIX' and not optix_preflight():
        log('  falling back to CUDA (GPU path tracing, GPU OpenImageDenoise, '
            'no RT-core traversal)')
        backend, enabled = configure_devices(force_cpu=args.cpu, avoid=('OPTIX',))

    wipe_scene()
    t = time.time()
    meshes = import_glb(args.glb)
    log(f'  import took {time.time() - t:.1f}s')

    if not verify_axes(meshes, strict=not args.allow_axis_mismatch):
        return 2

    # A missing ceiling is not a cosmetic problem in a path tracer: the room
    # becomes a box open to a 100000-lumen sky and every surface blows out.
    # Checked through materials.resolve so it survives the ceiling material being
    # renamed upstream (it already went 'ceiling' -> 'concrete-soffit' once).
    has_ceiling = any(
        materials.resolve(ob.name, s.material.name)[0] == 'concrete-soffit'
        for ob in meshes for s in ob.material_slots if s.material)
    if not has_ceiling:
        log('  !! no ceiling/soffit material in the glb — the interior is OPEN TO '
            'THE SKY, so every surface will blow out. Export with showCeiling.')

    t = time.time()
    report = materials.apply(meshes)
    for line in report.lines():
        log(f'  {line}')
    log(f'  materials took {time.time() - t:.1f}s')

    cam = add_camera(args.camera_pos, args.camera_target, args.fov, args.res, args.up_z)
    check_against_exported_camera(cam, args.camera_name)
    build_outlook(args, meshes)
    configure_cycles(args.samples, args.exposure, args.res, backend, args.wb)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.context.scene.render.filepath = out

    log(f'  rendering on {", ".join(enabled) if enabled else "CPU"} ...')
    t = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t
    px = args.res[0] * args.res[1]
    log(f'  RENDER {dt:.2f}s  ({args.samples} samples, {args.res[0]}x{args.res[1]}, '
        f'{px / dt / 1e3:.0f} kpx/s)  {out}')
    log(f'  total {time.time() - t_all:.2f}s')
    return 0


if __name__ == '__main__':
    sys.exit(main())
