/**
 * GPU path-traced hero frames — the driver.
 *
 *   npx tsx scripts/raytrace.ts                                  # eye-living, 1280x800, 256 spp
 *   npx tsx scripts/raytrace.ts --camera all --samples 512
 *   npx tsx scripts/raytrace.ts --layout open-loft --camera eye-kitchen --res 1920x1200
 *   npx tsx scripts/raytrace.ts --camera eye-living --tod 0.35 --exposure 1.6
 *
 * What it does, in order:
 *   1. resolves the layout (src/layouts if it exists, else the shot/ fixture)
 *   2. exports renders/<layout>.glb via scripts/export-gltf.ts if it is missing
 *      or older than the code that generates it
 *   3. computes the camera with cameraFor(preset, studio, aspect) — the SAME
 *      function the WebGL preview uses, so the ray-traced frame and the preview
 *      frame the unit identically
 *   4. spawns headless Blender (Cycles + OptiX where the driver allows it) with
 *      LD_LIBRARY_PATH=/usr/lib/wsl/lib, streaming its log through a prefix
 *   5. prints the wall-clock time per frame
 *
 * The heavy lifting is in scripts/blender/render.py (which owns the axis mapping
 * and the Cycles settings) and scripts/blender/materials.py (which owns the
 * physically-based material table). This file only decides WHAT to render.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cameraFor } from '../src/render3d/build';
import { studio } from '../src/core/plan';
import type { CameraPreset, Layout } from '../src/core/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** Every preset cameraFor() knows. `--camera all` walks these in this order. */
const ALL_CAMERAS = [
  'eye-living',
  'eye-window',
  'eye-kitchen',
  'eye-entry',
  'iso-sw',
  'iso-se',
  'iso-nw',
  'iso-ne',
  'top',
] as const satisfies readonly CameraPreset[];

/**
 * Per-preset exposure bias, in stops, added to --exposure.
 *
 * WHY this is not one number for every camera. The unit is lit through ONE
 * glazed wall, so the dynamic range between a surface facing the glass and a
 * surface facing away from it is 4-6 stops — real, physical, and exactly what
 * you see in the reference photo (a well-exposed interior with a blown-out
 * view). A single exposure either blows the window or crushes the back of the
 * flat. So each view gets the bias a photographer would dial in for it:
 *
 *   eye-living   0     front-lit: looking WEST at the glazing, everything the
 *                      camera sees faces the light. This is the reference frame,
 *                      and the frame the base --exposure is calibrated on.
 *   eye-window  +0.8   standing AT the glass looking back east: every surface in
 *                      shot is lit from behind the camera and falls off with
 *                      distance, and the frame has no bright window in it at all.
 *   eye-entry   +0.8   from the entry looking west down the L; same problem, plus
 *                      the closet corridor is 20 ft from the nearest daylight.
 *   eye-kitchen +1.0   looking EAST along the counter run — every visible face is
 *                      turned away from the only windows in the unit, and the
 *                      dark walnut floor returns very little bounce.
 *   iso-*       -1.2   exterior views: sunlit roof and walls, no interior at all.
 *   top         -1.5   straight down onto a sunlit concrete roof, the brightest
 *                      thing this scene can show.
 *
 * Each of these was checked against a render, not reasoned about: the numbers are
 * where the histogram of that view lands the interior mid-tones.
 */
const EXPOSURE_BIAS: Record<CameraPreset, number> = {
  'eye-living': 0,
  'eye-window': 0.8,
  'eye-entry': 0.8,
  'eye-kitchen': 1.0,
  'iso-sw': -1.2,
  'iso-se': -1.2,
  'iso-nw': -1.2,
  'iso-ne': -1.2,
  top: -1.5,
};

/**
 * Blender needs /usr/lib/wsl/lib on LD_LIBRARY_PATH or it cannot see the GPU at
 * all: that directory holds the WSL shim libcuda.so.1 that talks to the Windows
 * driver. (render.py separately fixes up the OptiX library, which the same
 * directory ships broken — see preload_optix() there.)
 */
const WSL_GPU_LIBS = '/usr/lib/wsl/lib';
const BLENDER = process.env.BLENDER ?? join(homedir(), '.local/opt/blender/blender');

// ------------------------------------------------------------------ args

interface Args {
  layout: string | null;
  cameras: CameraPreset[];
  samples: number;
  res: [number, number];
  tod: number;
  /** direct-sun / sky irradiance overrides; undefined = render.py's photo-calibrated defaults */
  sunStrength: number | undefined;
  skyStrength: number | undefined;
  out: string;
  exposure: number;
  force: boolean;
  context: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > 0) {
      flags.set(a.slice(2, eq), a.slice(eq + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(a.slice(2), next);
      i++;
    } else flags.set(a.slice(2), true);
  }

  const str = (k: string): string | undefined => {
    const v = flags.get(k);
    return typeof v === 'string' ? v : undefined;
  };
  const num = (k: string, dflt: number): number => {
    const v = str(k);
    if (v === undefined) return dflt;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`--${k} expects a number, got ${JSON.stringify(v)}`);
    return n;
  };

  const camArg = str('camera') ?? 'eye-living';
  const cameras: CameraPreset[] =
    camArg === 'all'
      ? [...ALL_CAMERAS]
      : camArg.split(',').map((s) => {
          const c = s.trim() as CameraPreset;
          if (!(c in EXPOSURE_BIAS)) {
            throw new Error(`unknown camera ${JSON.stringify(c)}; known: ${ALL_CAMERAS.join(', ')}`);
          }
          return c;
        });

  const resArg = str('res') ?? '1280x800';
  const [w, h] = resArg.toLowerCase().split('x').map(Number);
  if (!w || !h) throw new Error(`--res expects WxH, got ${resArg}`);

  return {
    layout: str('layout') ?? null,
    cameras,
    samples: Math.max(1, Math.round(num('samples', 256))),
    res: [Math.round(w), Math.round(h)],
    // 0.72 is the same default as buildScene(): mid-afternoon, sun west-south-west,
    // raking in through the west glazing.
    // 0.82 = late afternoon, bearing ~238 deg WSW at ~31 deg elevation. MUST match
    // the default in shot/main.ts and shot/export.ts: the glb stamps its own
    // timeOfDay, so a different default here put the sun in two places between the
    // preview and the hero frame of the same layout.
    tod: num('tod', 0.82),
    sunStrength: str('sun-intensity') === undefined ? undefined : num('sun-intensity', 0),
    skyStrength: str('sky-strength') === undefined ? undefined : num('sky-strength', 0),
    out: str('out') ?? 'renders',
    // +0.6 stops over a physical exposure. The daylight is physically scaled (a
    // Nishita sky with a real sun disc — scripts/blender/world.py), so at
    // exposure 0 the frame is exposed for the OUTDOORS and the room goes dark.
    // +0.6 is where the eye-living frame's off-white walls land just under clipping
    // and the view outside starts to blow, which is exactly what the reference
    // photograph does. Measured on a render, not guessed.
    exposure: num('exposure', 0.6),
    force: flags.get('force') === true,
    context: flags.get('no-context') !== true,
    dryRun: flags.get('dry-run') === true,
  };
}

// ------------------------------------------------------------------ layout

/**
 * Resolve which layout to render, mirroring scripts/shot.ts: src/layouts is
 * authored separately and may not exist yet, and a render is more useful than an
 * import error. Only the SLUG matters here — the glb export owns the geometry,
 * and the cameras come from the plan, which is the same for every layout.
 */
async function resolveSlug(want: string | null): Promise<string> {
  if (want && want !== 'demo') {
    try {
      // Built at runtime on purpose: src/layouts does not exist yet, and a
      // literal specifier would make this file fail typecheck until it does.
      const layoutsModule = ['..', 'src', 'layouts', 'index.ts'].join('/');
      const mod = await import(layoutsModule);
      const l = (mod as { getLayout?: (id: string) => Layout | undefined }).getLayout?.(want);
      if (l) return l.id;
      console.error(`! layout "${want}" not found in src/layouts; using the demo fixture`);
    } catch {
      console.error('! src/layouts is not importable yet; using the demo fixture');
    }
  }
  try {
    const demo = (await import('../shot/demo-layout.ts')).default as Layout;
    return demo.id;
  } catch {
    return want ?? 'demo';
  }
}

// ------------------------------------------------------------------ glb

/** Newest mtime under a file or directory tree, or 0 if it does not exist. */
function newestMtime(path: string): number {
  if (!existsSync(path)) return 0;
  const st = statSync(path);
  if (st.isFile()) return st.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    newest = Math.max(newest, newestMtime(join(path, entry.name)));
  }
  return newest;
}

/**
 * Everything whose change invalidates the glb. Deliberately coarse: re-exporting
 * costs a second or two, and rendering a stale scene at 256 samples wastes far
 * more than that — plus it is the kind of mistake you only notice after you have
 * shipped the picture.
 */
const GLB_SOURCES = [
  'src/render3d',
  'src/core',
  'src/layouts',
  'shot/demo-layout.ts',
  'scripts/export-gltf.ts',
];

/**
 * Read the `floorLab` block shot/export.ts stamps into the glb's root node extras.
 *
 * Worth the 30 lines: it is the only way to know HOW an existing glb was
 * exported. In particular `showCeiling` — that flag is opt-in on the exporter,
 * and a path-traced interior without a ceiling is a room open to a 100,000-lux
 * sky. Mtime cannot tell you that, so a glb that is "current" can still be
 * unusable, and the failure looks like a lighting bug rather than a stale asset.
 *
 * GLB layout: 12-byte header ('glTF', version, length) then chunks of
 * (u32 length, u32 type, data); the first chunk is always the JSON one.
 */
interface GlbMeta {
  units?: string;
  showCeiling?: boolean;
  layout?: string | null;
  timeOfDay?: number;
}

function glbMeta(path: string): GlbMeta | null {
  try {
    const buf = readFileSync(path);
    if (buf.length < 20 || buf.toString('utf8', 0, 4) !== 'glTF') return null;
    const jsonLen = buf.readUInt32LE(12);
    if (buf.toString('utf8', 16, 20) !== 'JSON') return null;
    const doc = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen)) as {
      nodes?: { extras?: { floorLab?: GlbMeta } }[];
    };
    for (const node of doc.nodes ?? []) {
      const meta = node.extras?.floorLab;
      if (meta) return meta;
    }
    return null;
  } catch {
    return null; // an unreadable glb is the exporter's problem, not ours
  }
}

function run(cmd: string, args: string[], env?: Record<string, string>): Promise<number> {
  return new Promise((res) => {
    const p = spawn(cmd, args, {
      cwd: ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, ...env },
    });
    p.on('error', () => res(127));
    p.on('close', (code) => res(code ?? 1));
  });
}

/**
 * Make sure renders/<slug>.glb exists and is newer than the code that generates
 * it, by calling the exporter another agent owns (scripts/export-gltf.ts).
 *
 * Its contract, read off that file: `--layout <id> --out <DIRECTORY>` and it
 * writes <dir>/<slug>.glb; `--ceiling` is OPT-IN and `--w/--h` set the aspect
 * for the preview cameras it stamps into the glb. We always pass --ceiling: a
 * path-traced interior with no ceiling is a box open to a 100,000-lux sky, so
 * every surface blows out and the indirect light — the entire reason to
 * path-trace this — is wrong.
 *
 * If the flags ever move, fall back to invoking it bare (which still writes its
 * default output) rather than hard-failing on an argument mismatch.
 */
async function ensureGlb(slug: string, force: boolean, res: [number, number]): Promise<string> {
  const glb = resolve(ROOT, 'renders', `${slug}.glb`);
  const exporter = resolve(ROOT, 'scripts/export-gltf.ts');
  const glbAge = newestMtime(glb);
  const srcAge = Math.max(...GLB_SOURCES.map((p) => newestMtime(resolve(ROOT, p))));
  const meta = glbAge > 0 ? glbMeta(glb) : null;
  // A ceiling-less glb is unusable for an interior frame however fresh it is.
  const noCeiling = meta !== null && meta.showCeiling === false;
  const stale = glbAge === 0 || srcAge > glbAge || noCeiling;

  if (!force && !stale) {
    console.log(
      `glb   ${glb.replace(`${ROOT}/`, '')} is current` +
        (meta ? ` (units=${meta.units}, ceiling=${meta.showCeiling})` : ''),
    );
    return glb;
  }
  if (noCeiling) {
    console.log('glb   exported WITHOUT a ceiling — re-exporting, an interior frame needs one');
  }
  if (!existsSync(exporter)) {
    if (glbAge > 0) {
      console.error(
        `! scripts/export-gltf.ts does not exist yet and the glb is ${
          stale ? 'STALE' : 'current'
        }; rendering the existing ${glb.replace(`${ROOT}/`, '')} anyway`,
      );
      return glb;
    }
    throw new Error(
      `no glb at ${glb} and no scripts/export-gltf.ts to make one.\n` +
        '  Export the three.js scene to that path first (any glTF-binary export of ' +
        'buildScene(studio, layout) works — see the axis notes in scripts/blender/render.py).',
    );
  }

  console.log(
    `glb   ${glbAge === 0 ? 'missing' : force ? 'forced' : 'stale'} -> npx tsx scripts/export-gltf.ts`,
  );
  mkdirSync(dirname(glb), { recursive: true });
  const attempts: string[][] = [
    // --out is a DIRECTORY for that script; it names the file <slug>.glb itself.
    ['tsx', 'scripts/export-gltf.ts', '--layout', slug, '--out', 'renders',
     '--ceiling', '--w', String(res[0]), '--h', String(res[1])],
    ['tsx', 'scripts/export-gltf.ts', '--ceiling'],
    ['tsx', 'scripts/export-gltf.ts'],
  ];
  for (const [i, args] of attempts.entries()) {
    console.log(`      npx ${args.join(' ')}`);
    const code = await run('npx', args);
    if (code === 0 && existsSync(glb)) return glb;
    if (i < attempts.length - 1) {
      console.error(`      ! exporter exited ${code}; retrying with fewer flags`);
    }
  }
  if (existsSync(glb)) {
    console.error('      ! exporter failed but a glb is present; using it');
    return glb;
  }
  throw new Error(`scripts/export-gltf.ts did not produce ${glb}`);
}

// ------------------------------------------------------------------ blender

/**
 * Stream one Blender run, prefixing every line so its output is distinguishable
 * from ours. render.py already prefixes its own diagnostics with "[blender]";
 * Cycles' per-object progress lines (Fra:1 Mem:...) are collapsed to at most one
 * line every 400 ms so the useful log is not buried under a few hundred
 * "Synchronizing object" lines.
 */
function runBlender(args: string[]): Promise<number> {
  return new Promise((res) => {
    const p = spawn(BLENDER, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH
          ? `${WSL_GPU_LIBS}:${process.env.LD_LIBRARY_PATH}`
          : WSL_GPU_LIBS,
      },
    });

    let pending = '';
    let lastProgress = 0;
    const emit = (line: string, stream: 'out' | 'err'): void => {
      if (!line.trim()) return;
      const isProgress = line.startsWith('Fra:');
      if (isProgress) {
        const now = Date.now();
        if (now - lastProgress < 400) return;
        lastProgress = now;
        // keep the tail of the line: "... | Scene | Path Tracing Sample 96/256"
        const tail = line.split('|').slice(-2).join('|').trim();
        console.log(`  · ${tail}`);
        return;
      }
      const tag = stream === 'err' ? '  ! ' : '  | ';
      console.log(tag + line.replace(/^\[blender\]\s?/, ''));
    };
    const pump = (chunk: Buffer, stream: 'out' | 'err'): void => {
      pending += chunk.toString();
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const l of lines) emit(l.replace(/\r/g, ''), stream);
    };

    p.stdout.on('data', (c: Buffer) => pump(c, 'out'));
    p.stderr.on('data', (c: Buffer) => pump(c, 'err'));
    p.on('error', (e) => {
      console.error(`  ! cannot run ${BLENDER}: ${e.message}`);
      res(127);
    });
    p.on('close', (code) => {
      if (pending.trim()) emit(pending, 'out');
      res(code ?? 1);
    });
  });
}

// ------------------------------------------------------------------ main

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const slug = await resolveSlug(args.layout);
  const [W, H] = args.res;
  const aspect = W / H;

  const outIsFile = args.out.toLowerCase().endsWith('.png');
  if (outIsFile && args.cameras.length > 1) {
    throw new Error('--out names a single .png but more than one camera was requested');
  }
  const outDir = outIsFile ? dirname(args.out) : args.out;
  mkdirSync(isAbsolute(outDir) ? outDir : resolve(ROOT, outDir), { recursive: true });

  console.log(
    `raytrace  layout=${slug}  ${W}x${H} @ ${args.samples} spp  tod=${args.tod}  ` +
      `exposure=${args.exposure >= 0 ? '+' : ''}${args.exposure}  cameras=${args.cameras.join(',')}`,
  );
  if (!existsSync(BLENDER)) {
    throw new Error(`no blender at ${BLENDER} (set BLENDER=/path/to/blender)`);
  }
  const glb = await ensureGlb(slug, args.force, args.res);

  const script = resolve(ROOT, 'scripts/blender/render.py');
  let failed = 0;
  const t0 = Date.now();

  for (const camera of args.cameras) {
    const cam = cameraFor(camera, studio, aspect);
    const png = outIsFile
      ? resolve(ROOT, args.out)
      : resolve(ROOT, outDir, `rt-${slug}-${camera}.png`);
    // rounded so the flag reads as a number a human wrote, not 1.2000000000000002
    const exposure = Math.round((args.exposure + EXPOSURE_BIAS[camera]) * 1000) / 1000;

    // Camera vectors go over as THREE.JS WORLD coordinates, exactly as
    // cameraFor() returns them; render.py applies the one axis conversion (see
    // its docstring). The `--flag=value` form is required because the values can
    // be negative and argparse would read a leading '-' as another flag.
    const flags = [
      `--glb=${glb}`,
      `--out=${png}`,
      `--camera-pos=${cam.position.join(',')}`,
      `--camera-target=${cam.target.join(',')}`,
      `--fov=${cam.fov}`,
      `--res=${W}x${H}`,
      `--samples=${args.samples}`,
      `--tod=${args.tod}`,
      ...(args.sunStrength !== undefined ? [`--sun-intensity=${args.sunStrength}`] : []),
      ...(args.skyStrength !== undefined ? [`--sky-strength=${args.skyStrength}`] : []),
      `--exposure=${exposure}`,
      // Only for the cross-check against the cam:<preset> the exporter stamps
      // into the glb; render.py still uses the vectors above.
      `--camera-name=${camera}`,
    ];
    // The top view must roll to plan-north-up to match the 2D drawing and the
    // preview's up=(0,0,-1); every other preset uses world up.
    if (camera === 'top') flags.push('--up-z');
    if (!args.context) flags.push('--no-context');

    const argv = ['-b', '--factory-startup', '--python', script, '--', ...flags];
    console.log(`\n▶ ${camera}  fov ${cam.fov}  exposure ${exposure >= 0 ? '+' : ''}${exposure.toFixed(2)}`);
    if (args.dryRun) {
      console.log(`  (dry run) LD_LIBRARY_PATH=${WSL_GPU_LIBS} ${BLENDER} ${argv.join(' ')}`);
      continue;
    }

    const t = Date.now();
    const code = await runBlender(argv);
    const secs = (Date.now() - t) / 1000;
    if (code === 0) {
      console.log(`✓ ${camera.padEnd(11)} ${secs.toFixed(2)}s wall  -> ${png.replace(`${ROOT}/`, '')}`);
    } else {
      failed++;
      console.error(`✗ ${camera.padEnd(11)} ${secs.toFixed(2)}s wall  blender exited ${code}`);
    }
  }

  const total = (Date.now() - t0) / 1000;
  const n = args.cameras.length;
  console.log(
    `\n${n - failed}/${n} frame(s) in ${total.toFixed(2)}s` +
      (n > 1 ? ` (${(total / n).toFixed(2)}s each)` : ''),
  );
  if (failed) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(`raytrace: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
