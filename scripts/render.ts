/**
 * scripts/render.ts — the headless renderer. This is how an AI designer looks
 * at its own work: it writes real PNGs of the 2D plan and the three.js 3D view
 * to renders/, which can then be read back as images.
 *
 *   pnpm render                                        # every layout, 2d + iso-ne
 *   pnpm render -- --layout studio-a --view 3d --camera all
 *   pnpm render -- --view 2d --scale 32 --clearances
 *   pnpm render -- --keep-open                         # leave vite up to poke at
 *
 * How it works, and why:
 *   1. Start vite *programmatically* on port 0 (an OS-assigned free port). No
 *      assumed port, no "please start the dev server first", no collision with
 *      a dev server the human already has running on 4317.
 *   2. Drive playwright chromium to the app's capture mode
 *      (?capture=1&...), which renders one view full-bleed with no UI chrome
 *      and sets window.__READY__ = true once it has actually painted.
 *   3. Screenshot at deviceScaleFactor 2, so a 1600×1200 viewport yields a
 *      3200×2400 PNG that is legible when text is small.
 *
 * WebGL in headless chromium needs software rasterisation: the swiftshader
 * flags below are not optional, without them the 3D view silently produces a
 * blank canvas (or fails to get a context at all).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';

import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser, type ConsoleMessage, type Page } from 'playwright';

import type { CameraPreset, Layout } from '@/core/types';

import {
  c,
  CliError,
  ensureDir,
  fmtBytes,
  fmtInt,
  fmtMs,
  formatHelp,
  parseArgs,
  parseChoice,
  relPath,
  renderTable,
  reportError,
  resolveLayouts,
  splitList,
  type FlagSpecs,
} from './lib';

/**
 * Software GL. --use-gl=angle + --use-angle=swiftshader is the combination that
 * actually works in current chromium headless; --enable-unsafe-swiftshader
 * silences the "software WebGL is deprecated" block. --no-sandbox and
 * --disable-dev-shm-usage keep it working inside containers / WSL where the
 * sandbox and /dev/shm are restricted.
 */
const CHROMIUM_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

const VIEWS = ['2d', '3d', 'both'] as const;
const THEMES = ['light', 'dark', 'blueprint'] as const;

/** Every CameraPreset in src/core/types.ts, in a sensible tour order. */
const CAMERAS: readonly CameraPreset[] = [
  'top',
  'iso-ne',
  'iso-nw',
  'iso-se',
  'iso-sw',
  'eye-entry',
  'eye-kitchen',
  'eye-window',
  'eye-living',
];

/** If the app throws, give it this long to still reach __READY__ before failing. */
const ERROR_GRACE_MS = 1500;

const FLAGS: FlagSpecs = {
  layout: {
    kind: 'string',
    alias: 'l',
    default: 'all',
    value: '<id|all>',
    describe: 'layout id, comma list, or "all"',
  },
  view: {
    kind: 'string',
    alias: 'v',
    default: 'both',
    value: '<2d|3d|both>',
    describe: 'which view(s) to render',
  },
  camera: {
    kind: 'string',
    default: 'iso-ne',
    value: '<preset|all|list>',
    describe: `3D camera preset(s): ${CAMERAS.join(', ')}`,
  },
  scale: {
    kind: 'number',
    alias: 's',
    value: '<px per ft>',
    describe: '2D drawing scale in pixels per foot',
  },
  theme: {
    kind: 'string',
    alias: 't',
    value: `<${THEMES.join('|')}>`,
    describe: 'colour theme',
  },
  w: { kind: 'number', default: 1600, value: '<px>', describe: 'viewport width (CSS px)' },
  h: { kind: 'number', default: 1200, value: '<px>', describe: 'viewport height (CSS px)' },
  dpr: {
    kind: 'number',
    default: 2,
    value: '<n>',
    describe: 'deviceScaleFactor — output pixels = viewport × dpr',
  },
  out: { kind: 'string', alias: 'o', default: 'renders', value: '<dir>', describe: 'output directory' },
  issues: { kind: 'boolean', default: true, describe: 'mark analyzer issues in the render' },
  dims: { kind: 'boolean', default: true, describe: 'draw dimension strings' },
  labels: { kind: 'boolean', default: true, describe: 'draw item labels' },
  clearances: { kind: 'boolean', default: false, describe: 'draw required clear-floor zones' },
  zones: { kind: 'boolean', default: false, describe: 'tint the functional zones' },
  grid: { kind: 'boolean', default: false, describe: 'draw the 1 ft reference grid' },
  timeout: {
    kind: 'number',
    default: 45000,
    value: '<ms>',
    describe: 'per-capture wait for window.__READY__',
  },
  verbose: { kind: 'boolean', default: false, describe: 'forward every browser console message' },
  'keep-open': {
    kind: 'boolean',
    default: false,
    describe: 'after rendering, leave vite running and print the URL',
  },
};

interface Overlays {
  issues: boolean;
  dims: boolean;
  labels: boolean;
  clearances: boolean;
  zones: boolean;
  grid: boolean;
}

interface Target {
  layout: Layout;
  view: '2d' | '3d';
  camera?: CameraPreset;
  /** short name used in output, e.g. "studio-a-iso-ne" */
  name: string;
  file: string;
  url: string;
}

interface CaptureResult {
  target: Target;
  ok: boolean;
  ms: number;
  bytes: number;
  pixels?: { w: number; h: number };
  error?: string;
}

// --------------------------------------------------------------- vite

function repoRoot(): string {
  // scripts/ lives directly under the repo root.
  return path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
}

async function startVite(root: string, verbose: boolean): Promise<ViteDevServer> {
  const configFile = path.join(root, 'vite.config.ts');
  if (!fs.existsSync(configFile)) {
    throw new CliError(`cannot find vite.config.ts at ${configFile}`, {
      details: ['render.ts expects to live in <repo>/scripts/'],
    });
  }
  const server = await createServer({
    configFile,
    // `root` defaults to process.cwd(), which would break if the script is run
    // from a subdirectory. Pin it to the repo root.
    root,
    logLevel: verbose ? 'info' : 'warn',
    clearScreen: false,
    server: {
      // port 0 = let the OS pick a free port; we read the real one back below.
      port: 0,
      strictPort: false,
      host: '127.0.0.1',
      open: false,
    },
  });
  await server.listen();
  return server;
}

/** The actual origin vite is serving on, including any configured base path. */
function baseUrlOf(server: ViteDevServer): string {
  const local = server.resolvedUrls?.local?.[0];
  if (local) return local.endsWith('/') ? local : `${local}/`;

  const addr = server.httpServer?.address() as AddressInfo | string | null | undefined;
  if (addr && typeof addr === 'object') {
    const bare = addr.address === '::' || addr.address === '0.0.0.0' ? '127.0.0.1' : addr.address;
    const host = bare.includes(':') ? `[${bare}]` : bare;
    return `http://${host}:${addr.port}/`;
  }
  throw new CliError('vite started but did not report a URL or a bound port');
}

// -------------------------------------------------------------- targets

function resolveCameras(raw: string | undefined): CameraPreset[] {
  const value = (raw ?? 'iso-ne').trim();
  if (value === '' || value.toLowerCase() === 'all' || value === '*') return [...CAMERAS];
  const seen = new Set<CameraPreset>();
  for (const token of splitList(value)) {
    if (token.toLowerCase() === 'all' || token === '*') {
      for (const cam of CAMERAS) seen.add(cam);
      continue;
    }
    seen.add(parseChoice('camera', token, CAMERAS));
  }
  return [...seen];
}

/**
 * Build the capture URL. These parameter names are the contract with
 * src/app/capture.ts — booleans are only *present* when on (the app tests for
 * presence / '1'), so a false flag never has to be understood by the app.
 */
function captureUrl(
  base: string,
  layout: Layout,
  view: '2d' | '3d',
  camera: CameraPreset | undefined,
  o: Overlays,
  opts: { w: number; h: number; scale?: number; theme?: string },
): string {
  const url = new URL(base);
  const q = url.searchParams;
  q.set('capture', '1');
  q.set('layout', layout.id);
  q.set('view', view);
  if (view === '3d' && camera) q.set('camera', camera);
  q.set('w', String(opts.w));
  q.set('h', String(opts.h));
  if (opts.scale !== undefined) q.set('scale', String(opts.scale));
  if (opts.theme !== undefined) q.set('theme', opts.theme);
  if (o.issues) q.set('issues', '1');
  if (o.dims) q.set('dims', '1');
  if (o.labels) q.set('labels', '1');
  if (o.clearances) q.set('clearances', '1');
  if (o.zones) q.set('zones', '1');
  if (o.grid) q.set('grid', '1');
  return url.toString();
}

// ---------------------------------------------------------- diagnostics

interface Diagnostics {
  /** which capture the messages belong to */
  label: string;
  errors: string[];
  onFirstError: ((message: string) => void) | null;
}

/**
 * Forward everything the page says to stdout. Without this, an exception inside
 * the app looks identical to a hang: __READY__ never flips and the capture just
 * times out 45 seconds later with no explanation.
 */
function attachDiagnostics(page: Page, diag: Diagnostics, verbose: boolean): void {
  const tag = (label: string, colorFn: (s: string) => string): string =>
    `${colorFn(`[${label}]`)}${diag.label ? ` ${c.dim(diag.label)}` : ''}`;

  page.on('pageerror', (err: Error) => {
    const message = err.stack ?? `${err.name}: ${err.message}`;
    diag.errors.push(message);
    console.log(`${tag('page-error', c.red)} ${message}`);
    diag.onFirstError?.(message);
  });

  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    const isError = type === 'error';
    if (!verbose && !isError && type !== 'warning') return;
    const loc = msg.location();
    const where = loc.url ? c.dim(` (${loc.url.split('/').pop()}:${loc.lineNumber})`) : '';
    const colorFn = isError ? c.red : type === 'warning' ? c.yellow : c.gray;
    const text = msg.text();
    if (isError) diag.errors.push(text);
    console.log(`${tag(`browser:${type}`, colorFn)} ${text}${where}`);
  });

  page.on('requestfailed', (req) => {
    // A failed module request is the most common cause of a blank capture.
    const why = req.failure()?.errorText ?? 'unknown';
    const message = `${req.method()} ${req.url()} — ${why}`;
    diag.errors.push(message);
    console.log(`${tag('request-failed', c.magenta)} ${message}`);
  });

  page.on('crash', () => {
    diag.errors.push('the page crashed (renderer process died)');
    console.log(`${tag('crash', c.red)} renderer process died — likely GPU/WebGL, check the flags`);
  });
}

/**
 * Wait for the app to signal that it has painted, failing fast (after a short
 * grace period) if it threw on the way there.
 */
async function waitForReady(page: Page, timeoutMs: number, diag: Diagnostics): Promise<void> {
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  const fatal = new Promise<never>((_resolve, reject) => {
    diag.onFirstError = (message) => {
      if (graceTimer) return;
      graceTimer = setTimeout(() => {
        reject(new Error(`app threw before it became ready: ${message.split('\n')[0]}`));
      }, ERROR_GRACE_MS);
    };
  });

  try {
    await Promise.race([
      // NOTE: playwright's second positional argument is the value passed *into*
      // the page function, not options — options must go third or the timeout
      // is silently ignored and you get playwright's 30s default.
      page.waitForFunction(() => (window as unknown as { __READY__?: boolean }).__READY__ === true, undefined, {
        timeout: timeoutMs,
      }),
      fatal,
    ]);
  } finally {
    diag.onFirstError = null;
    if (graceTimer) clearTimeout(graceTimer);
  }
}

/** Read width/height straight out of the PNG IHDR so we report real pixels. */
function pngSize(file: string): { w: number; h: number } | undefined {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const head = Buffer.alloc(24);
      const read = fs.readSync(fd, head, 0, 24, 0);
      if (read < 24 || head.readUInt32BE(0) !== 0x89504e47) return undefined;
      return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return undefined;
  }
}

async function capture(
  page: Page,
  target: Target,
  diag: Diagnostics,
  timeoutMs: number,
): Promise<CaptureResult> {
  const started = Date.now();
  diag.label = target.name;
  diag.errors = [];

  const finish = (ok: boolean, error?: string): CaptureResult => {
    let bytes = 0;
    try {
      bytes = fs.statSync(target.file).size;
    } catch {
      bytes = 0;
    }
    return {
      target,
      ok,
      ms: Date.now() - started,
      bytes,
      pixels: pngSize(target.file),
      ...(error ? { error } : {}),
    };
  };

  try {
    const response = await page.goto(target.url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    const status = response?.status();
    if (status !== undefined && status >= 400) {
      throw new Error(`vite returned HTTP ${status} for ${target.url}`);
    }

    await waitForReady(page, timeoutMs, diag);

    // One extra frame pair: __READY__ is set from inside a rAF callback, and on
    // a software GL stack the compositor can be a frame behind the JS.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );

    await page.screenshot({ path: target.file, type: 'png', fullPage: false });
    return finish(true);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Completes the caller's in-progress "[1/6] name … " line.
    console.log(`${c.red('✗ failed')} ${message}`);

    // A failed capture must still be *inspectable*: dump whatever the page has
    // and screenshot it anyway. A white PNG plus the body text below is usually
    // enough to see that e.g. the app rendered an error boundary.
    await dumpPageState(page);
    try {
      await page.screenshot({ path: target.file, type: 'png', fullPage: false });
      console.log(c.dim(`    wrote failure screenshot anyway: ${relPath(target.file)}`));
    } catch (shotErr) {
      console.log(
        c.dim(`    could not screenshot the failure: ${
          shotErr instanceof Error ? shotErr.message : String(shotErr)
        }`),
      );
    }
    return finish(false, message);
  }
}

/** Best-effort dump of the DOM state at the moment of failure. */
async function dumpPageState(page: Page): Promise<void> {
  try {
    const state = await page.evaluate(() => {
      const w = window as unknown as { __READY__?: unknown };
      const body = document.body;
      return {
        ready: String(w.__READY__),
        title: document.title,
        rootChildren: document.getElementById('root')?.childElementCount ?? -1,
        canvases: document.querySelectorAll('canvas').length,
        text: body ? body.innerText.slice(0, 1200) : '<no body>',
        html: body ? body.innerHTML.slice(0, 600) : '',
      };
    });
    console.log(
      c.dim(
        `    window.__READY__=${state.ready} · #root children=${state.rootChildren} · ` +
          `<canvas>=${state.canvases} · title=${JSON.stringify(state.title)}`,
      ),
    );
    const text = state.text.trim();
    if (text) {
      console.log(c.dim('    --- page text ---'));
      for (const line of text.split('\n')) console.log(c.dim(`    ${line}`));
      console.log(c.dim('    -----------------'));
    } else if (state.html.trim()) {
      console.log(c.dim(`    body html: ${state.html.replace(/\s+/g, ' ').slice(0, 400)}`));
    } else {
      console.log(c.dim('    the page body is empty — the app never mounted'));
    }
  } catch (err) {
    console.log(
      c.dim(`    could not read the page: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}

/** Block until Ctrl-C, for --keep-open. */
function holdOpen(base: string, targets: Target[]): Promise<void> {
  console.log('');
  console.log(`${c.bold('keep-open')} vite is still running at ${c.cyan(base)}`);
  console.log(c.dim('  interactive lab (no capture params):'));
  console.log(`    ${c.cyan(base)}`);
  console.log(c.dim('  the exact URLs that were captured:'));
  for (const t of targets) console.log(`    ${c.dim(`${t.name}:`)} ${t.url}`);
  console.log(c.dim('  press Ctrl-C to stop the server'));
  return new Promise<void>((resolve) => {
    // Registering a SIGINT handler suppresses node's default kill, so we get to
    // close the browser and the server cleanly.
    process.once('SIGINT', () => {
      console.log('');
      console.log(c.dim('shutting down…'));
      resolve();
    });
  });
}

/** console.log to a pipe can be async; make sure it lands before process.exit. */
function flushStdout(): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write('', () => resolve());
  });
}

// ----------------------------------------------------------------- main

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2), FLAGS);
  if (args.help) {
    console.log(
      formatHelp({
        usage: 'tsx scripts/render.ts [flags]',
        description:
          'Render layouts to PNG with a real browser: starts vite on a free port,\n' +
          'drives headless chromium through the app capture mode, screenshots at 2x.',
        specs: FLAGS,
        notes: [
          'output: renders/<layout>-2d.png and renders/<layout>-<camera>.png',
          'the 3D view needs software WebGL; the swiftshader chromium flags are built in',
          'nothing needs to be running first — this script owns the dev server',
        ],
        examples: [
          'pnpm render',
          'pnpm render -- --layout studio-a --view 3d --camera all',
          'pnpm render -- --view 2d --scale 32 --clearances --zones',
          'pnpm render -- --keep-open',
        ],
      }),
    );
    return 0;
  }

  const layoutsToRender = resolveLayouts(args.str('layout'));
  const view = parseChoice('view', args.str('view'), VIEWS, 'both');
  const cameras = resolveCameras(args.str('camera'));
  const theme = args.given('theme') ? parseChoice('theme', args.str('theme'), THEMES) : undefined;
  const width = Math.round(args.num('w') ?? 1600);
  const height = Math.round(args.num('h') ?? 1200);
  const dpr = args.num('dpr') ?? 2;
  const scale = args.num('scale');
  const timeoutMs = Math.round(args.num('timeout') ?? 45000);
  const verbose = args.bool('verbose');
  const keepOpen = args.bool('keep-open');
  const outDir = ensureDir(args.str('out') ?? 'renders');

  if (width < 64 || height < 64) {
    throw new CliError(`viewport ${width}×${height} is too small`, {
      details: ['--w and --h are CSS pixels; try 1600 × 1200'],
    });
  }
  if (!(dpr > 0) || dpr > 4) {
    throw new CliError(`--dpr ${dpr} is out of range (0 < dpr <= 4)`);
  }
  if (scale !== undefined && !(scale > 0)) {
    throw new CliError(`--scale must be greater than 0 (got ${scale})`);
  }

  const overlays: Overlays = {
    issues: args.bool('issues'),
    dims: args.bool('dims'),
    labels: args.bool('labels'),
    clearances: args.bool('clearances'),
    zones: args.bool('zones'),
    grid: args.bool('grid'),
  };

  const root = repoRoot();
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;

  try {
    const viteStarted = Date.now();
    server = await startVite(root, verbose);
    const base = baseUrlOf(server);

    // Build the full target list up front so we can report the plan of work.
    const targets: Target[] = [];
    for (const layout of layoutsToRender) {
      if (view === '2d' || view === 'both') {
        const name = `${layout.id}-2d`;
        targets.push({
          layout,
          view: '2d',
          name,
          file: path.join(outDir, `${name}.png`),
          url: captureUrl(base, layout, '2d', undefined, overlays, {
            w: width,
            h: height,
            ...(scale !== undefined ? { scale } : {}),
            ...(theme !== undefined ? { theme } : {}),
          }),
        });
      }
      if (view === '3d' || view === 'both') {
        for (const camera of cameras) {
          const name = `${layout.id}-${camera}`;
          targets.push({
            layout,
            view: '3d',
            camera,
            name,
            file: path.join(outDir, `${name}.png`),
            url: captureUrl(base, layout, '3d', camera, overlays, {
              w: width,
              h: height,
              ...(scale !== undefined ? { scale } : {}),
              ...(theme !== undefined ? { theme } : {}),
            }),
          });
        }
      }
    }

    const on = Object.entries(overlays)
      .filter(([, v]) => v)
      .map(([k]) => k);
    console.log(
      `${c.bold('vite')}    ${c.cyan(base)} ${c.dim(`(root ${relPath(root)}, ${fmtMs(
        Date.now() - viteStarted,
      )})`)}`,
    );
    console.log(
      `${c.bold('chrome')}  ${c.dim(
        `headless + swiftshader · ${width}×${height} css @${dpr}x -> ${fmtInt(
          width * dpr,
        )}×${fmtInt(height * dpr)} px`,
      )}`,
    );
    console.log(
      `${c.bold('render')}  ${c.dim(
        `${targets.length} capture${targets.length === 1 ? '' : 's'} · ${
          layoutsToRender.length
        } layout${layoutsToRender.length === 1 ? '' : 's'} · view ${view}` +
          (view !== '2d' ? ` · cameras ${cameras.join(',')}` : '') +
          (theme ? ` · theme ${theme}` : '') +
          (scale !== undefined ? ` · ${scale} px/ft` : '') +
          ` · overlays ${on.length ? on.join(',') : 'none'}`,
      )}`,
    );
    console.log('');

    try {
      browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
    } catch (err) {
      throw new CliError(
        `could not launch chromium: ${err instanceof Error ? err.message : String(err)}`,
        { details: ['playwright needs its browser binary: npx playwright install chromium'] },
      );
    }

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: dpr,
      // Deterministic renders: no OS locale/timezone bleeding into the drawing.
      locale: 'en-US',
      timezoneId: 'UTC',
      colorScheme: theme === 'dark' ? 'dark' : 'light',
    });
    context.setDefaultTimeout(timeoutMs);
    const page = await context.newPage();

    const diag: Diagnostics = { label: '', errors: [], onFirstError: null };
    attachDiagnostics(page, diag, verbose);

    const results: CaptureResult[] = [];
    for (const [i, target] of targets.entries()) {
      const progress = c.dim(`[${i + 1}/${targets.length}]`);
      process.stdout.write(`${progress} ${target.name} … `);
      const result = await capture(page, target, diag, timeoutMs);
      if (result.ok) {
        const px = result.pixels ? `${fmtInt(result.pixels.w)}×${fmtInt(result.pixels.h)}` : '?';
        console.log(
          `${c.green('ok')} ${c.dim(`${px} px · ${fmtBytes(result.bytes)} · ${fmtMs(result.ms)}`)}`,
        );
      }
      // On failure capture() has already closed the line and printed the detail.
      results.push(result);
    }

    // -------------------------------------------------------- summary
    const failed = results.filter((r) => !r.ok);
    console.log('');
    console.log(
      renderTable(
        [
          { header: 'FILE' },
          { header: 'LAYOUT' },
          { header: 'VIEW' },
          { header: 'PIXELS', align: 'right' },
          { header: 'BYTES', align: 'right' },
          { header: 'TIME', align: 'right' },
          { header: 'STATUS' },
        ],
        results.map((r) => [
          relPath(r.target.file),
          r.target.layout.id,
          r.target.view === '2d' ? '2d plan' : `3d ${r.target.camera}`,
          r.pixels ? `${fmtInt(r.pixels.w)}×${fmtInt(r.pixels.h)}` : c.dim('—'),
          r.bytes ? fmtBytes(r.bytes) : c.dim('—'),
          fmtMs(r.ms),
          r.ok ? c.green('ok') : c.red('FAILED'),
        ]),
        { indent: '  ' },
      ),
    );

    const okCount = results.length - failed.length;
    console.log('');
    console.log(
      `  ${okCount}/${results.length} written to ${relPath(outDir)}` +
        (failed.length ? ` · ${c.red(`${failed.length} failed`)}` : ''),
    );
    if (failed.length) {
      for (const f of failed) console.log(`    ${c.red('✗')} ${f.target.name}: ${f.error}`);
      console.log(
        c.dim('  the failure screenshots were still written — look at them, then re-run with --verbose'),
      );
    }
    if (okCount > 0) {
      const first = results.find((r) => r.ok);
      console.log(
        c.dim(
          `  view: open the PNGs in ${relPath(outDir)}/ — e.g. ${
            first ? relPath(first.target.file) : ''
          } (they are ${dpr}× device pixels, so zoom out to read them as a page)`,
        ),
      );
    }

    if (keepOpen) {
      // Drop chromium first: nobody needs a headless browser sitting around
      // while a human pokes at the URL, and it frees a few hundred MB.
      await browser.close();
      browser = undefined;
      await holdOpen(base, targets);
    }

    return failed.length > 0 ? 1 : 0;
  } finally {
    // Always tear both down, even on a throw: a leaked chromium or a listening
    // vite server would keep the process (and the port) alive forever.
    if (browser) {
      await browser.close().catch((err: unknown) => {
        console.log(c.dim(`  (browser close failed: ${String(err)})`));
      });
    }
    if (server) {
      await server.close().catch((err: unknown) => {
        console.log(c.dim(`  (vite close failed: ${String(err)})`));
      });
    }
  }
}

const exitCode = await main().catch((err: unknown) => reportError(err));
await flushStdout();
// vite/playwright can leave handles that keep the event loop alive, so exit
// explicitly rather than waiting for node to decide it is done.
process.exit(exitCode);
