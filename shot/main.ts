/**
 * Standalone 3D capture entry.
 *
 * Deliberately independent of the React lab UI: a headless render should not be
 * able to break because a sidebar component threw. It imports buildScene /
 * cameraFor directly, paints exactly one frame, and raises window.__READY__.
 *
 * The layout comes from window.__PAYLOAD__ (injected by scripts/shot.ts as plain
 * JSON) so the node side decides where layouts come from — the designed ones in
 * src/layouts, or the demo fixture — and the browser side stays dumb.
 *
 * Passes:
 *   beauty — the lit render
 *   depth  — linear depth, near = WHITE (the convention depth-conditioned image
 *            models expect), for structure-preserving photoreal generation
 *   line   — flat white surfaces with dark edges: reads as a massing/CAD view and
 *            gives an image model clean geometry to follow
 */

import * as THREE from 'three';
import { studio } from '@/core/plan';
import { buildScene, cameraFor } from '@/render3d/build';
import type { CameraPreset, Layout, Render3DOptions } from '@/core/types';
import demoLayout from './demo-layout';

// The __READY__ / __PAYLOAD__ handshake with scripts/shot.ts is declared once,
// globally, in src/vite-env.d.ts — see the note there.

type Pass = 'beauty' | 'depth' | 'line';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => {
  const v = parseFloat(q.get(k) ?? '');
  return Number.isFinite(v) ? v : d;
};

const pass = (q.get('pass') as Pass) ?? 'beauty';
const camera = (q.get('camera') as CameraPreset) ?? 'iso-sw';
const W = Math.round(num('w', 1600));
const H = Math.round(num('h', 1000));
/**
 * Time of day. Default late-afternoon (0.82 -> bearing ~238 deg WSW, ~31 deg
 * elevation) because the unit's ONLY glazing is the west wall: at midday the sun
 * is 66 deg up and barely crosses the sill, so the interior gets no direct light
 * and the render dies flat. A low western sun rakes the floor and is the hour
 * this apartment actually looks its best.
 */
const tod = num('tod', 0.82);
// Iso and top views need the walls cut down or you photograph a closed box.
const isEye = camera.startsWith('eye');
const cutDefault = isEye ? undefined : num('cut', 4.0);
const cut = q.get('cut') === 'none' ? undefined : cutDefault;

const layout: Layout | undefined = window.__PAYLOAD__?.layout ?? demoLayout;

const opts: Render3DOptions = {
  camera,
  timeOfDay: tod,
  shadows: q.get('shadows') !== '0',
  // Eye-level views need the ceiling: without it you see sky above the walls,
  // which instantly reads as a model rather than a room. Iso/top views must NOT
  // have it or the ceiling is all you photograph.
  showCeiling: q.get('ceiling') ? q.get('ceiling') === '1' : isEye,
  wallCutHeight: cut,
};

const samples = Math.max(1, Math.round(num('samples', 1)));

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  // Accumulation reads the drawing buffer back after every render() call.
  preserveDrawingBuffer: samples > 1,
});
renderer.setPixelRatio(1); // the driver uses deviceScaleFactor for resolution
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = opts.shadows !== false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = num('exposure', 0.92);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const root = buildScene(studio, layout, opts);
scene.add(root);

// ------------------------------------------------------- environment light

/**
 * Procedural sky as an equirectangular image, run through PMREM to become a real
 * image-based light.
 *
 * This is what raster arch-viz is missing by default: with only directional
 * lights, every MeshStandardMaterial has nothing to reflect, so glass, the steel
 * appliances and the stone counter all read as flat paint. An environment map
 * gives them something to mirror and supplies soft sky ambient that falls off
 * correctly toward the floor.
 *
 * The sun blob is placed at the same azimuth/elevation the scene's sun uses
 * (see addLighting in build.ts) so reflections agree with the cast shadows.
 */
function skyEnvironment(t: number): THREE.Texture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Vertical gradient: zenith -> horizon -> ground bounce.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#5b86b8');
  g.addColorStop(0.42, '#b8cfe4');
  g.addColorStop(0.5, '#e6e2d8');
  g.addColorStop(0.52, '#9c9184');
  g.addColorStop(1.0, '#5d564d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun disc + halo. Equirect: u = azimuth/360, v = (90 - elevation)/180.
  const azDeg = 90 + 180 * t;
  const elDeg = Math.max(8, 70 * Math.sin(Math.PI * t));
  const sx = ((((azDeg + 180) % 360) + 360) % 360) / 360 * w;
  const sy = ((90 - elDeg) / 180) * h;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.14);
  halo.addColorStop(0.0, '#ffffff');
  halo.addColorStop(0.06, '#fff6e2');
  halo.addColorStop(0.35, 'rgba(255,236,200,0.35)');
  halo.addColorStop(1.0, 'rgba(255,236,200,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let envRT: THREE.WebGLRenderTarget | null = null;
if (pass === 'beauty' && q.get('env') !== '0') {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const sky = skyEnvironment(tod);
  envRT = pmrem.fromEquirectangular(sky);
  scene.environment = envRT.texture;
  scene.environmentIntensity = num('envint', 0.62);
  sky.dispose();
  pmrem.dispose();

  /**
   * The scene already ships a hemisphere light plus two non-shadowing fills to
   * stand in for ambient. With a real environment map those double-count and the
   * image goes flat and milky, so trim them back and let the sun carry contrast.
   */
  root.traverse((o) => {
    const l = o as THREE.Light;
    if (!l.isLight) return;
    if (l.name === 'light:hemi') l.intensity *= 0.22;
    else if (l.name === 'light:window-fill') l.intensity *= 0.42;
    else if (l.name === 'light:bounce') l.intensity *= 0.38;
    // Let the sun carry the image. Once ambient stops filling every shadow, the
    // direct term has to be stronger or the whole frame just goes dark.
    else if (l.name === 'light:sun') l.intensity *= 1.5;
  });
}

const view = cameraFor(camera, studio, W / H);
const cam = new THREE.PerspectiveCamera(view.fov, W / H, 0.1, 400);
cam.position.set(view.position[0], view.position[1], view.position[2]);
// Top-down must use -Z as up so the render matches the 2D drawing (north up).
if (camera === 'top') cam.up.set(0, 0, -1);
cam.lookAt(view.target[0], view.target[1], view.target[2]);

// ---------------------------------------------------------------- passes

if (pass === 'beauty') {
  scene.background = new THREE.Color(q.get('bg') ?? '#dfe3e6');
} else if (pass === 'line') {
  // Flat matte white everything: no lighting cues, only form. Read as massing.
  scene.background = new THREE.Color('#ffffff');
  scene.overrideMaterial = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  const amb = new THREE.HemisphereLight(0xffffff, 0xbbbbbb, 2.2);
  scene.add(amb);
} else {
  // Depth: fit near/far to the scene so the 8-bit range is all signal.
  const box = new THREE.Box3().setFromObject(root);
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  let near = Infinity;
  let far = 0;
  for (const c of corners) {
    const d = cam.position.distanceTo(c);
    near = Math.min(near, d);
    far = Math.max(far, d);
  }
  cam.near = Math.max(0.05, near * 0.6);
  cam.far = far * 1.1;
  cam.updateProjectionMatrix();
  scene.background = new THREE.Color('#000000');
  scene.overrideMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.BasicDepthPacking,
  });
}

// ------------------------------------------------------------ accumulation

/**
 * Progressive stochastic accumulation.
 *
 * A single raster frame gives hard, aliased shadows because a DirectionalLight is
 * an infinitely small source. Re-rendering with the sun jittered inside a small
 * cone and the camera jittered by a sub-pixel offset, then averaging, integrates
 * both an area light and the pixel filter — so shadows gain a real penumbra and
 * edges resolve properly. It is a crude Monte Carlo estimator, but it converges
 * on the same answer for these two effects and costs nothing but repeat frames,
 * which matters because this machine renders in software.
 *
 * Drawing sample i at globalAlpha = 1/(i+1) over the running result is exactly an
 * incremental mean.
 *
 * The real sun subtends about half a degree, but a clear-sky penumbra is driven
 * by the bright circumsolar region, so ~2.5 degrees of spread reads far more
 * naturally than the geometric truth.
 */
const SUN_CONE_DEG = num('suncone', 2.5);

function render(): HTMLCanvasElement {
  const sun = root.getObjectByName('light:sun') as THREE.DirectionalLight | undefined;
  const sun0 = sun ? sun.position.clone() : null;
  const sunDist = sun0 ? sun0.length() : 1;

  if (samples === 1) {
    renderer.render(scene, cam);
    return renderer.domElement;
  }

  const acc = document.createElement('canvas');
  acc.width = W;
  acc.height = H;
  const ctx = acc.getContext('2d')!;

  // Deterministic low-discrepancy jitter so a re-render reproduces byte-for-byte.
  const radical = (n: number, base: number): number => {
    let f = 1;
    let r = 0;
    while (n > 0) {
      f /= base;
      r += f * (n % base);
      n = Math.floor(n / base);
    }
    return r;
  };

  for (let i = 0; i < samples; i++) {
    const jx = radical(i + 1, 2) - 0.5;
    const jy = radical(i + 1, 3) - 0.5;
    cam.setViewOffset(W, H, jx, jy, W, H);

    if (sun && sun0) {
      // Uniform point in a disc, mapped onto a cone around the sun direction.
      const a = 2 * Math.PI * radical(i + 1, 5);
      const rr = Math.sqrt(radical(i + 1, 7)) * Math.tan((SUN_CONE_DEG * Math.PI) / 180);
      const dir = sun0.clone().normalize();
      const t1 = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
      if (!Number.isFinite(t1.x) || t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
      const t2 = new THREE.Vector3().crossVectors(dir, t1).normalize();
      sun.position
        .copy(dir)
        .addScaledVector(t1, rr * Math.cos(a))
        .addScaledVector(t2, rr * Math.sin(a))
        .normalize()
        .multiplyScalar(sunDist);
    }

    renderer.render(scene, cam);
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(renderer.domElement, 0, 0, W, H);
  }

  ctx.globalAlpha = 1;
  cam.clearViewOffset();
  if (sun && sun0) sun.position.copy(sun0);
  renderer.domElement.replaceWith(acc);
  return acc;
}

const outCanvas = render();

/**
 * MeshDepthMaterial writes near = 0 (black). Depth-conditioned image models want
 * near = white, so flip it through a 2D canvas and swap the canvas in.
 */
if (pass === 'depth') {
  const src = outCanvas;
  const flat = document.createElement('canvas');
  flat.width = src.width;
  flat.height = src.height;
  const ctx = flat.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, flat.width, flat.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i]!;
    d[i + 1] = 255 - d[i + 1]!;
    d[i + 2] = 255 - d[i + 2]!;
  }
  ctx.putImageData(img, 0, 0);
  src.replaceWith(flat);
}

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.__READY__ = true;
  });
});
