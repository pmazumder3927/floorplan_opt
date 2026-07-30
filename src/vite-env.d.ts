/// <reference types="vite/client" />

/** Side-effect CSS imports (verbatimModuleSyntax needs the module declared). */
declare module '*.css';

/**
 * THE HEADLESS CAPTURE HANDSHAKE, declared once.
 *
 * The pages in shot/ run inside a browser that a node driver is puppeteering.
 * The driver injects `__PAYLOAD__` before the page's script runs, waits on
 * `__READY__`, then reads the result back out. Both halves of that contract have
 * to agree on the shape, so it is declared here — in the one ambient file both
 * halves see — rather than in a `declare global` block inside each entry point.
 * Two entries declaring the same property with two different types is a TS2717
 * error, which is exactly what surfaced when shot/ joined `include`.
 *
 * `import('...')` type syntax is deliberate: a top-level `import` statement would
 * turn this file into a module and take the declarations out of global scope.
 */
interface Window {
  /** set by the page once the scene is built and the canvas is safe to screenshot */
  __READY__?: boolean;
  /** injected by the driver: which layout to render (absent = the demo fixture) */
  __PAYLOAD__?: { layout?: import('@/core/types').Layout | null };
  /** the .glb, base64-encoded, read back by scripts/export-gltf.ts */
  __GLB__?: string;
  /** set instead of __GLB__ when the export threw, so the driver can say why */
  __GLB_ERROR__?: string;
}
