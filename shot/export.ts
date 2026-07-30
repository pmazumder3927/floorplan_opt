/**
 * glTF export entry — the bridge from three.js to Blender/Cycles.
 *
 * WHY this exists: Chromium here is SwiftShader (software) with no vulkan loader,
 * so browser-side path tracing is dead. Cycles *can* see the RTX card through
 * OptiX. But the geometry lives in src/render3d/build.ts as three.js meshes, and
 * hand-rebuilding the apartment in Blender python would immediately fork into two
 * models that drift apart. So instead we run the REAL buildScene() in a real
 * browser, hand the scene to three's own GLTFExporter, and ship the bytes out.
 * One source of truth: build.ts. Blender is a renderer, not a modeller.
 *
 * Mirrors shot/main.ts exactly: layout arrives as plain JSON on
 * window.__PAYLOAD__ (the node side owns layout resolution, the browser stays
 * dumb) and everything else comes off URL params. Result lands on window.__GLB__
 * as base64 with window.__READY__ = true as the handshake.
 *
 * No WebGLRenderer is created. GLTFExporter only needs a GL context to bake
 * render-target/compressed textures, and every material in materials.ts is an
 * untextured MeshStandardMaterial, so the export is pure CPU work. That also
 * means this entry cannot fail for GL reasons, which is the whole point.
 */

import * as THREE from 'three';
// Ships inside the three package (three/examples/jsm) — no new dependency.
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { studio } from '@/core/plan';
import { buildScene, cameraFor } from '@/render3d/build';
import type { CameraPreset, Layout, Render3DOptions } from '@/core/types';
import demoLayout from './demo-layout';

// The __READY__ / __PAYLOAD__ / __GLB__ handshake with scripts/export-gltf.ts is
// declared once, globally, in src/vite-env.d.ts — see the note there.

const q = new URLSearchParams(location.search);
const num = (k: string, d: number): number => {
  const v = parseFloat(q.get(k) ?? '');
  return Number.isFinite(v) ? v : d;
};
const flag = (k: string, d: boolean): boolean => {
  const v = q.get(k);
  return v === null ? d : v === '1' || v === 'true';
};

/** Every camera preset build.ts knows how to place. Exported as glTF cameras. */
const ALL_CAMERAS: readonly CameraPreset[] = [
  'top',
  'iso-ne',
  'iso-nw',
  'iso-se',
  'iso-sw',
  'eye-entry',
  'eye-kitchen',
  'eye-window',
  'eye-hero',
  'eye-living',
];

/**
 * Same default as shot/main.ts: late afternoon (t=0.82 -> bearing ~238 deg WSW,
 * ~31 deg elevation). The unit's only glazing is the west wall, so a midday sun
 * never crosses the head and the interior gets zero direct light.
 */
const tod = num('tod', 0.82);

const W = Math.round(num('w', 1600));
const H = Math.round(num('h', 1000));
const aspect = W / H;

/**
 * Ceiling is opt-in via ?ceiling=1 (driver: --ceiling), same param name as
 * main.ts. A closed box is what a path tracer wants — bounce light off the
 * exposed-concrete soffit is most of the interior illumination in the reference
 * photo — but the caller may also want an open-top model to light from above in
 * Blender, so it stays a switch rather than a hard-coded truth.
 */
const showCeiling = flag('ceiling', false);

const layout: Layout | undefined = window.__PAYLOAD__?.layout ?? demoLayout;

/**
 * FULL-HEIGHT WALLS, ALWAYS.
 *
 * buildScene() derives its wall cut from opts.camera: 'top'/'iso-*' get a 4'-6"
 * cut so an overhead raster camera can see in. A ray-traced interior needs the
 * real enclosure — cut walls leak sun and sky into the room and the whole point
 * of Cycles (bounce light, correct indirect) evaporates. Passing an eye-level
 * preset makes the cut default `undefined`, which is exactly full height; we
 * deliberately do NOT pass wallCutHeight, since any number there also clamps
 * cabinet and fixture heights.
 */
const opts: Render3DOptions = {
  camera: 'eye-living',
  timeOfDay: tod,
  shadows: true,
  showCeiling,
  wallCutHeight: undefined,
};

const scene = new THREE.Scene();
scene.name = 'floor-lab';
const root = buildScene(studio, layout, opts);
scene.add(root);

// ------------------------------------------------------------------ lights

/**
 * glTF carries lights through KHR_lights_punctual, which three's exporter writes
 * for directional / point / spot only. Two fixups are needed for the lights
 * addLighting() builds:
 *
 *  1. HemisphereLight has no glTF equivalent (it is a two-colour sky/ground
 *     gradient, i.e. an environment, not a punctual light). Exporting it only
 *     produces a console warning, so drop it and record it in extras — the
 *     Blender side should build a real sky world instead, which Cycles does far
 *     better than a hemi fake anyway.
 *
 *  2. A glTF directional light points down its own node's -Z. three aims a
 *     DirectionalLight at `light.target`, which addLighting() parents to the
 *     scene root as a SIBLING — so the direction would be silently lost. Rotate
 *     each light so -Z points at where its target actually is, then re-parent the
 *     target to (0,0,-1) under the light (the shape the exporter checks for) and
 *     mark it invisible so it does not litter Blender with empties.
 */
const droppedLights: string[] = [];
const exportedLights: string[] = [];

root.updateMatrixWorld(true);
for (const obj of [...root.children]) {
  const light = obj as THREE.Light;
  if (!light.isLight) continue;

  const dir = light as THREE.DirectionalLight;
  if (dir.isDirectionalLight) {
    const aim = dir.target.getWorldPosition(new THREE.Vector3());
    dir.lookAt(aim); // Object3D.lookAt aims -Z at the point for lights
    dir.target.position.set(0, 0, -1);
    dir.target.visible = false; // exported with onlyVisible: true -> skipped
    dir.add(dir.target);
    exportedLights.push(dir.name || 'light:directional');
    continue;
  }

  if ((light as THREE.PointLight).isPointLight || (light as THREE.SpotLight).isSpotLight) {
    exportedLights.push(light.name || light.type);
    continue;
  }

  droppedLights.push(light.name || light.type);
  root.remove(light);
}

// ----------------------------------------------------------------- cameras

/**
 * Bake every preset from cameraFor() into the file as a real glTF camera, named
 * `cam:<preset>`, so a Blender render can reuse the framing the WebGL preview
 * uses instead of re-deriving it. Same conventions as main.ts: vertical fov from
 * the preset, near/far 0.1/400, and up = (0,0,-1) for the top view so north is
 * up on the page.
 *
 * The Blender glTF importer keeps node names, so the render script can do
 * bpy.data.objects['cam:eye-living'].
 */
for (const preset of ALL_CAMERAS) {
  const view = cameraFor(preset, studio, aspect);
  const cam = new THREE.PerspectiveCamera(view.fov, aspect, 0.1, 400);
  cam.name = `cam:${preset}`;
  cam.position.set(view.position[0], view.position[1], view.position[2]);
  if (preset === 'top') cam.up.set(0, 0, -1);
  cam.lookAt(view.target[0], view.target[1], view.target[2]);
  cam.userData.preset = preset;
  cam.userData.target = view.target;
  cam.userData.fov = view.fov;
  root.add(cam);
}

// -------------------------------------------------------------------- extras

/**
 * Stamped onto the root node's glTF `extras`, which the Blender importer surfaces
 * as object custom properties. UNITS matter: everything in this repo is decimal
 * FEET and the exporter writes raw numbers, so a Blender importer reading glTF's
 * metres will see a 9 ft ceiling as 9 m. Scaling by 0.3048 makes it physically
 * real; not scaling is harmless for a directional-lit interior but wrong for
 * point-light falloff and any physical camera setting. Say so out loud rather
 * than let the next stage guess.
 */
root.userData.floorLab = {
  plan: studio.id,
  layout: layout?.id ?? null,
  units: 'feet',
  feetToMeters: 0.3048,
  ceilingHeight: studio.ceilingHeight,
  showCeiling,
  wallCutHeight: null,
  timeOfDay: tod,
  cameras: ALL_CAMERAS.map((c) => `cam:${c}`),
  cameraAspect: aspect,
  lightsExported: exportedLights,
  lightsDropped: droppedLights,
  note:
    'Built by shot/export.ts from src/render3d/build.ts buildScene(). Units are FEET; ' +
    'scale by 0.3048 for metres. Dropped lights have no KHR_lights_punctual equivalent ' +
    '(HemisphereLight = sky/ground gradient) — rebuild them as a Blender world. ' +
    'Light INTENSITIES are three.js raster numbers, not photometric: glTF says a ' +
    'directional light is lux, so Blender divides by 683 and the sun arrives at ' +
    '~0.004 W/m2 (i.e. black). Directions and positions are correct — re-set every ' +
    'strength on the Blender side, or light with a sky world and ignore these.',
};

// --------------------------------------------------------------------- write

/**
 * ArrayBuffer -> base64 in 32 KB chunks. `String.fromCharCode(...bytes)` on a
 * multi-megabyte buffer blows the argument limit and throws RangeError.
 */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let s = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

async function run(): Promise<void> {
  const exporter = new GLTFExporter();
  const out = (await exporter.parseAsync(scene, {
    binary: true, // .glb: one file, no sidecar .bin, no base64 bloat in JSON
    onlyVisible: true,
    includeCustomExtensions: false,
  })) as ArrayBuffer;

  window.__GLB__ = toBase64(out);
  // eslint-disable-next-line no-console
  console.log(`glb ${out.byteLength} bytes`);
}

run()
  .catch((err: unknown) => {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    window.__GLB_ERROR__ = msg;
    console.error(`[export] ${msg}`);
  })
  .finally(() => {
    // Always raise the handshake: the driver reports __GLB_ERROR__ as a real
    // message, which beats a 60 s timeout that says nothing.
    window.__READY__ = true;
  });
