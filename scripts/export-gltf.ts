/**
 * glTF export driver — hands the three.js scene to Blender.
 *
 * Same shape as scripts/shot.ts (boot vite in-process, drive Chromium, wait for
 * the window.__READY__ handshake) but instead of screenshotting a canvas it reads
 * back a base64 .glb built by shot/export.ts and writes it to disk. That file is
 * the ONLY thing Blender ever sees, so src/render3d/build.ts stays the single
 * source of truth for the model.
 *
 *   npx tsx scripts/export-gltf.ts
 *   npx tsx scripts/export-gltf.ts --layout open-loft --ceiling
 *   npx tsx scripts/export-gltf.ts --layout demo --out renders --tod 0.82
 *
 * --layout takes an id from src/layouts if that module exists, else the demo
 * fixture in shot/demo-layout.ts. Layouts cross the process boundary as plain
 * JSON, so the browser never imports the layouts module.
 *
 * Walls are always exported full height (shot/export.ts forces it): a cut-down
 * box leaks sun and sky and destroys the indirect light that is the entire reason
 * to path-trace this.
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser } from 'playwright';
import type { Layout } from '../src/core/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/**
 * Chromium needs these to get a WebGL2 context with no GPU. The export itself is
 * pure CPU (no WebGLRenderer, no textures), but vite serves the same module graph
 * as the render entry and any stray GL init in an imported module would otherwise
 * fail the page load. Cheap insurance, identical to scripts/shot.ts.
 */
const GL_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const outDir = resolve(ROOT, String(args.out ?? 'renders'));
const wantLayout = args.layout === undefined ? null : String(args.layout);
/** Baked camera aspect. Match whatever aspect Blender will actually render at. */
const W = Number(args.w ?? 1600);
const H = Number(args.h ?? 1000);
const tod = args.tod === undefined ? undefined : Number(args.tod);
const ceiling = args.ceiling !== undefined && args.ceiling !== 'false' && args.ceiling !== '0';

/**
 * Resolve the layout to send to the browser. src/layouts may not exist yet (it is
 * authored separately), so fall back to the demo fixture rather than failing — an
 * export of the shell plus fixtures is more useful than an import error.
 */
async function resolveLayout(): Promise<{ layout: Layout; slug: string }> {
  if (wantLayout && wantLayout !== 'demo') {
    try {
      const mod = await import('../src/layouts/index.ts');
      const l = (mod as { getLayout?: (id: string) => Layout }).getLayout?.(wantLayout);
      if (l) return { layout: l, slug: l.id };
      console.error(`! layout "${wantLayout}" not found in src/layouts; using the demo fixture`);
    } catch {
      console.error(`! src/layouts is not importable yet; using the demo fixture`);
    }
  }
  const demo = (await import('../shot/demo-layout.ts')).default;
  return { layout: demo, slug: demo.id };
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const { layout, slug } = await resolveLayout();

  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  let written: string | null = null;

  try {
    server = await createServer({
      configFile: resolve(ROOT, 'vite.config.ts'),
      root: ROOT,
      logLevel: 'warn',
      server: { port: 0 },
    });
    await server.listen();
    const url = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
    if (!url) throw new Error('vite did not report a local URL');
    console.log(`vite ${url}`);

    browser = await chromium.launch({ headless: true, args: GL_ARGS });
    const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const page = await ctx.newPage();
    // Surface app failures instead of letting them show up as a bare timeout.
    page.on('console', (m) => {
      if (m.type() === 'error') console.error(`  [browser] ${m.text()}`);
    });
    page.on('pageerror', (e) => console.error(`  [pageerror] ${e.message}`));
    await page.addInitScript(
      (l) => {
        (window as unknown as { __PAYLOAD__: unknown }).__PAYLOAD__ = { layout: l };
      },
      layout as unknown,
    );

    const p = new URLSearchParams({ w: String(W), h: String(H) });
    if (tod !== undefined) p.set('tod', String(tod));
    if (ceiling) p.set('ceiling', '1');

    const target = `${url}/shot/export.html?${p}`;
    await page.goto(target, { waitUntil: 'load' });
    // GLTFExporter walks every mesh in the unit; generous but bounded.
    await page.waitForFunction(() => window.__READY__ === true, { timeout: 120_000 });

    const err = await page.evaluate(() => window.__GLB_ERROR__ ?? null);
    if (err) throw new Error(`browser export failed:\n${err}`);

    const b64 = await page.evaluate(() => window.__GLB__ ?? null);
    if (!b64) throw new Error('window.__GLB__ was empty');

    const buf = Buffer.from(b64, 'base64');
    if (buf.byteLength < 1024) throw new Error(`glb is only ${buf.byteLength} bytes — not plausible`);

    const file = resolve(outDir, `${slug}.glb`);
    writeFileSync(file, buf);
    written = file;
  } finally {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  }

  if (!written) throw new Error('nothing was written');
  const mb = statSync(written).size / (1024 * 1024);
  console.log(`  ✓ ${written}`);
  console.log(`    ${mb.toFixed(2)} MB — units are FEET (scale 0.3048 for metres)`);
  process.exit(0);
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
