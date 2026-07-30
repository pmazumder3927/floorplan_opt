/**
 * Viewer3D — the only place in the project that owns a WebGLRenderer.
 *
 * Design decisions and why:
 *  - RENDER ON DEMAND. A constant requestAnimationFrame loop would peg the CPU
 *    in headless chromium (swiftshader renders in software) and the capture
 *    script only ever needs one good frame. Anything that changes the image
 *    calls `invalidate()`, which schedules exactly one frame.
 *  - ALWAYS render at least one frame after a rebuild, before `onReady` fires,
 *    so ?capture=1 can flip window.__READY__ knowing the canvas has real pixels.
 *  - ORBIT/PAN/ZOOM implemented here with pointer events. three/examples
 *    OrbitControls is deliberately NOT imported: the project keeps its three
 *    import surface to the 'three' package only (examples/jsm ships as untyped
 *    ESM and pulls extra chunks into the vite bundle).
 *  - The old scene graph goes through disposeScene() on every rebuild, so a
 *    session that cycles through 20 layouts does not leak 20 scenes of VRAM.
 */

import type { JSX } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { FloorPlan, Layout, Render3DOptions } from '@/core/types';
import { buildScene, cameraFor, disposeScene } from './build';

export interface Viewer3DProps {
  plan: FloorPlan;
  layout?: Layout;
  options?: Render3DOptions;
  className?: string;
  /** allow pointer orbit/pan/zoom (off for capture so a stray event cannot move the camera) */
  orbit?: boolean;
  onReady?: () => void;
}

/** Camera state in spherical coords around a target — the whole controller. */
interface Orbit {
  target: THREE.Vector3;
  /** distance from target, ft */
  radius: number;
  /** azimuth, radians, measured in the world XZ plane */
  theta: number;
  /** polar angle from +Y, radians. Small = looking straight down. */
  phi: number;
}

interface ViewerState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** prefiltered environment, or null if the GPU could not make one */
  env: THREE.WebGLRenderTarget | null;
  root: THREE.Object3D | null;
  orbit: Orbit;
  /** a frame is already scheduled */
  pending: number | null;
  /** at least one frame has been presented */
  ready: boolean;
  /**
   * The user has dragged/zoomed. A resize then keeps their view instead of
   * re-framing from the preset; changing the preset clears it.
   */
  userMoved: boolean;
  disposed: boolean;
}

const PHI_MIN = 0.0008; // essentially straight down (the 'top' preset)
const PHI_MAX = Math.PI * 0.62; // a little below eye level, never under the floor

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * A 3-stop sky/horizon/ground gradient, prefiltered into an environment map.
 *
 * WHY: MeshStandardMaterial gets its specular from scene.environment. Without
 * one, every metal (appliances, chrome pulls, the mirror) renders black and
 * every shadowed wall goes flat grey — there is no indirect bounce in a
 * 2-light scene. This is 16x64 pixels prefiltered once at startup, which is
 * orders of magnitude cheaper than any post-processing and works on software
 * WebGL2. Deliberately NOT three/examples RoomEnvironment: the project keeps
 * its imports to the 'three' package.
 *
 * Returns null (and the scene simply goes without) if the GPU refuses.
 */
function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget | null {
  const W = 16;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  const sky = [0.72, 0.79, 0.88];
  const horizon = [0.95, 0.93, 0.88];
  const ground = [0.42, 0.38, 0.33];
  for (let y = 0; y < H; y++) {
    // v = 0 at the top of the sphere, 1 at the bottom
    const v = y / (H - 1);
    const t = v < 0.5 ? v / 0.5 : (v - 0.5) / 0.5;
    const from = v < 0.5 ? sky : horizon;
    const to = v < 0.5 ? horizon : ground;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(255 * (from[c] + (to[c] - from[c]) * t));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromEquirectangular(tex);
    pmrem.dispose();
    return rt;
  } catch {
    return null;
  } finally {
    tex.dispose();
  }
}

/**
 * Top-down views must use up = (0,0,-1) so the render matches the 2D drawing
 * with no mirroring (project convention); any other angle uses world up.
 * Near-vertical is also exactly where up = (0,1,0) degenerates.
 */
function applyUp(cam: THREE.Camera, phi: number): void {
  if (phi < 0.05) cam.up.set(0, 0, -1);
  else cam.up.set(0, 1, 0);
}

function placeCamera(cam: THREE.PerspectiveCamera, o: Orbit): void {
  const sinPhi = Math.sin(o.phi);
  cam.position.set(
    o.target.x + o.radius * sinPhi * Math.sin(o.theta),
    o.target.y + o.radius * Math.cos(o.phi),
    o.target.z + o.radius * sinPhi * Math.cos(o.theta),
  );
  applyUp(cam, o.phi);
  cam.lookAt(o.target);
  cam.updateMatrixWorld();
}

/** Convert an absolute eye/target pair into the spherical state above. */
function orbitFrom(eye: THREE.Vector3, target: THREE.Vector3): Orbit {
  const v = eye.clone().sub(target);
  const radius = Math.max(0.5, v.length());
  const phi = clamp(Math.acos(clamp(v.y / radius, -1, 1)), PHI_MIN, PHI_MAX);
  // theta measured so that (sin, cos) matches placeCamera above
  const theta = Math.atan2(v.x, v.z);
  return { target: target.clone(), radius, theta, phi };
}

export function Viewer3D(props: Viewer3DProps): JSX.Element {
  const { plan, layout, options, className, orbit = true, onReady } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stRef = useRef<ViewerState | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Options arrive as a fresh object literal on most parent renders, so the
  // rebuild effect keys off a stable serialisation instead of identity.
  const optKey = JSON.stringify(options ?? {});
  const optRef = useRef<Render3DOptions | undefined>(options);
  optRef.current = options;
  const planRef = useRef(plan);
  planRef.current = plan;

  /** Schedule exactly one frame. */
  const invalidate = useCallback(() => {
    const st = stRef.current;
    if (!st || st.disposed || st.pending !== null) return;
    st.pending = requestAnimationFrame(() => {
      st.pending = null;
      if (st.disposed || !st.root) return;
      st.renderer.render(st.scene, st.camera);
      if (!st.ready) {
        st.ready = true;
        // Fire on the frame AFTER the draw call so the pixels are actually
        // presented before a capture script screenshots the canvas.
        requestAnimationFrame(() => {
          if (!st.disposed) onReadyRef.current?.();
        });
      }
    });
  }, []);

  /**
   * (Re)frame the camera from the preset for the CURRENT aspect ratio. The iso
   * and top presets solve for a distance that fits the footprint at a given
   * aspect, so a resize genuinely changes the right answer.
   */
  const reframe = useCallback((st: ViewerState) => {
    const opts = optRef.current ?? {};
    const spec = cameraFor(opts.camera ?? 'iso-sw', planRef.current, st.camera.aspect || 1);
    const eye = new THREE.Vector3(...(opts.eye ?? spec.position));
    const target = new THREE.Vector3(...(opts.target ?? spec.target));
    st.camera.fov = opts.fov ?? spec.fov;
    st.camera.near = 0.08;
    // far plane: comfortably past the far corner of the ground plane
    st.camera.far = Math.max(200, eye.distanceTo(target) * 6);
    st.camera.updateProjectionMatrix();
    st.orbit = orbitFrom(eye, target);
    placeCamera(st.camera, st.orbit);
  }, []);

  // ---------------------------------------------------------------- one-time init
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      // needed so a headless screenshot can read the buffer without a
      // guaranteed-fresh draw in the same task
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    // Cap at 2: swiftshader fill rate is the bottleneck and the render script
    // already asks playwright for deviceScaleFactor 2.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    // PCF (not PCFSoft): 4 taps instead of 16, which matters when the
    // rasteriser is software.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Tone mapping per the scene's intent (see buildScene -> userData.render).
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    const env = makeEnvironment(renderer);
    if (env) {
      scene.environment = env.texture;
      // Ambient bounce only — the directional sun still does the modelling.
      scene.environmentIntensity = 0.55;
    }

    const st: ViewerState = {
      renderer,
      scene,
      camera,
      env,
      root: null,
      orbit: { target: new THREE.Vector3(), radius: 30, theta: 0.8, phi: 0.9 },
      pending: null,
      ready: false,
      userMoved: false,
      disposed: false,
    };
    stRef.current = st;

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!st.userMoved) reframe(st);
      invalidate();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    return () => {
      st.disposed = true;
      if (st.pending !== null) cancelAnimationFrame(st.pending);
      ro.disconnect();
      if (st.root) disposeScene(st.root);
      st.scene.environment = null;
      st.env?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      stRef.current = null;
    };
  }, [invalidate, reframe]);

  // ---------------------------------------------------------------- rebuild scene
  useEffect(() => {
    const st = stRef.current;
    if (!st) return;
    const opts = optRef.current ?? {};

    if (st.root) {
      st.scene.remove(st.root);
      disposeScene(st.root);
      st.root = null;
    }
    const root = buildScene(plan, layout, opts);
    st.root = root;
    st.scene.add(root);

    const meta = (root.userData.render ?? {}) as { background?: string; exposure?: number };
    st.scene.background = new THREE.Color(meta.background ?? opts.background ?? '#cdd3d8');
    if (meta.exposure) st.renderer.toneMappingExposure = meta.exposure;

    // A rebuild must always produce a frame, even if nothing else is dirty,
    // so capture mode has something to screenshot.
    invalidate();
  }, [plan, layout, optKey, invalidate]);

  // ---------------------------------------------------------------- camera preset
  useEffect(() => {
    const st = stRef.current;
    if (!st) return;
    // an explicit preset/eye change overrides whatever the user was looking at
    st.userMoved = false;
    reframe(st);
    invalidate();
  }, [plan, optKey, invalidate, reframe]);

  // ---------------------------------------------------------------- interaction
  useEffect(() => {
    const st = stRef.current;
    const host = hostRef.current;
    if (!st || !host || !orbit) return;
    const el = st.renderer.domElement;

    let mode: 'none' | 'rotate' | 'pan' = 'none';
    let lastX = 0;
    let lastY = 0;
    let pointerId = -1;

    const down = (e: PointerEvent) => {
      if (mode !== 'none') return;
      // left = orbit; middle / right / shift+left = pan (matching every CAD app)
      mode = e.button === 0 && !e.shiftKey ? 'rotate' : 'pan';
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const move = (e: PointerEvent) => {
      if (mode === 'none' || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const o = st.orbit;

      if (mode === 'rotate') {
        // a full window width sweeps 180 degrees
        o.theta -= (dx / Math.max(1, el.clientWidth)) * Math.PI;
        o.phi = clamp(o.phi + (dy / Math.max(1, el.clientHeight)) * Math.PI, PHI_MIN, PHI_MAX);
      } else {
        // screen-space pan: move the target along the camera's right/up axes,
        // scaled so one pixel moves the same distance the cursor did
        const vFov = (st.camera.fov * Math.PI) / 180;
        const perPixel = (2 * Math.tan(vFov / 2) * o.radius) / Math.max(1, el.clientHeight);
        const right = new THREE.Vector3().setFromMatrixColumn(st.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(st.camera.matrixWorld, 1);
        o.target.addScaledVector(right, -dx * perPixel);
        o.target.addScaledVector(up, dy * perPixel);
      }
      st.userMoved = true;
      placeCamera(st.camera, o);
      invalidate();
      e.preventDefault();
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      mode = 'none';
      pointerId = -1;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    const wheel = (e: WheelEvent) => {
      const o = st.orbit;
      // 1.0012 per wheel unit ~= 12% per notch, and clamped to the size of a
      // 30 ft apartment so you can neither end up inside a wall nor in orbit
      o.radius = clamp(o.radius * Math.pow(1.0012, e.deltaY), 1.2, 400);
      st.userMoved = true;
      placeCamera(st.camera, o);
      invalidate();
      e.preventDefault();
    };

    const context = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', context);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', context);
    };
  }, [orbit, invalidate]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      data-viewer="3d"
    />
  );
}

export default Viewer3D;
