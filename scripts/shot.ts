/**
 * Headless 3D capture driver.
 *
 * Boots vite programmatically, drives Chromium (swiftshader WebGL) to
 * /shot/index.html, waits for the one-frame handshake and writes a PNG.
 *
 *   npx tsx scripts/shot.ts --camera iso-sw,eye-entry --pass beauty,depth
 *   npx tsx scripts/shot.ts --layout open-loft --camera all
 *
 * --layout takes an id from src/layouts if that module exists, else the demo
 * fixture in shot/demo-layout.ts is used. Layouts cross the process boundary as
 * plain JSON, so the browser never imports the layouts module.
 */

import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser } from 'playwright';
import type { Layout } from '../src/core/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const ALL_CAMERAS = [
  'top',
  'iso-sw',
  'iso-se',
  'iso-nw',
  'iso-ne',
  'eye-entry',
  'eye-hero',
  'eye-living',
  'eye-window',
  'eye-kitchen',
] as const;

/** Chromium needs these to get a WebGL2 context with no GPU. */
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
const list = (v: unknown, all: readonly string[]): string[] => {
  if (v === undefined) return [];
  if (v === 'all') return [...all];
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const cameras = list(args.camera ?? 'iso-sw', ALL_CAMERAS);
const passes = list(args.pass ?? 'beauty', ['beauty', 'depth', 'line']);
const outDir = resolve(ROOT, String(args.out ?? 'renders'));
const W = Number(args.w ?? 1600);
const H = Number(args.h ?? 1000);
const scaleFactor = Number(args.dpr ?? 2);
const tod = args.tod === undefined ? undefined : Number(args.tod);
const wantLayout = args.layout === undefined ? null : String(args.layout);

/**
 * Resolve the layout to send to the browser. src/layouts may not exist yet
 * (it is authored separately), so fall back to the demo fixture rather than
 * failing — a render is more useful than an import error.
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
  const written: string[] = [];

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
    const ctx = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: scaleFactor,
    });
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

    for (const pass of passes) {
      for (const camera of cameras) {
        const p = new URLSearchParams({ camera, pass, w: String(W), h: String(H) });
        if (tod !== undefined) p.set('tod', String(tod));
        if (args.cut !== undefined) p.set('cut', String(args.cut));
        if (args.exposure !== undefined) p.set('exposure', String(args.exposure));
        if (args.ceiling !== undefined) p.set('ceiling', String(args.ceiling === true ? 1 : args.ceiling));
        if (args.samples !== undefined) p.set('samples', String(args.samples));
        if (args.env !== undefined) p.set('env', String(args.env));
        if (args.suncone !== undefined) p.set('suncone', String(args.suncone));

        const target = `${url}/shot/index.html?${p}`;
        await page.goto(target, { waitUntil: 'load' });
        try {
          await page.waitForFunction(() => window.__READY__ === true, { timeout: 60_000 });
        } catch {
          console.error(`  ! ${camera}/${pass} never signalled ready; capturing anyway`);
        }
        const file = resolve(
          outDir,
          `${slug}-${camera}${pass === 'beauty' ? '' : `-${pass}`}.png`,
        );
        await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
        written.push(file);
        console.log(`  ✓ ${camera.padEnd(11)} ${pass.padEnd(7)} → ${file.replace(ROOT + '/', '')}`);
      }
    }
  } finally {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  }

  console.log(`\n${written.length} image(s) at ${W * scaleFactor}x${H * scaleFactor}`);
  process.exit(0);
}

void main();
