/**
 * scripts/brief.ts — one self-contained HTML brief per layout.
 *
 *   npx tsx scripts/brief.ts                       # all four, into briefs/
 *   npx tsx scripts/brief.ts --layout a-window-desk
 *   npx tsx scripts/brief.ts --out /tmp/x --no-hero
 *
 * A brief is the whole scheme in one page: the ray-traced hero frame, the
 * to-scale plan, the reasoning, the furniture schedule and the analyzer's
 * verdict. It is GENERATED, never hand-written — every number in it comes from
 * the same plan, catalog and analyzer the drawings come from, so a brief cannot
 * quietly disagree with the layout it describes.
 *
 * Self-contained on purpose: the plan is inlined as SVG and the hero frame as a
 * data URI, so a single .html file can be mailed, opened offline or published
 * without dragging a folder of assets behind it.
 *
 * The hero frame is NOT rendered here — path tracing is minutes of GPU time and
 * belongs behind its own explicit command. Run
 *
 *   npx tsx scripts/raytrace.ts --layout <id> --camera <cam> --samples 768
 *
 * first; this script picks up renders/rt-<id>-<cam>.png if it is there and says
 * so plainly (with the exact command to fix it) if it is not. Which camera
 * headlines which layout is an editorial decision recorded in HERO below.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { analyzeLayout, formatReport } from '@/core/analysis';
import { getDef } from '@/core/catalog';
import { studio } from '@/core/plan';
import { renderPlanSVG } from '@/render2d/svg';
import { formatShort } from '@/core/units';
import type { CameraPreset, Layout } from '@/core/types';

import {
  c,
  ensureDir,
  fmtBytes,
  formatHelp,
  heading,
  parseArgs,
  renderTable,
  reportError,
  resolveLayouts,
  type FlagSpecs,
} from './lib';

const FLAGS: FlagSpecs = {
  layout: {
    kind: 'string',
    alias: 'l',
    default: 'all',
    value: '<id|all>',
    describe: 'layout id, comma list, or "all"',
  },
  out: {
    kind: 'string',
    alias: 'o',
    default: 'briefs',
    value: '<dir>',
    describe: 'output directory',
  },
  renders: {
    kind: 'string',
    default: 'renders',
    value: '<dir>',
    describe: 'where to look for rt-<layout>-<hero camera>.png',
  },
  hero: {
    kind: 'boolean',
    default: true,
    describe: 'embed the ray-traced hero frame if one exists',
  },
  index: {
    kind: 'boolean',
    default: true,
    describe: 'also write index.html linking every brief',
  },
};

// ------------------------------------------------------------------ helpers

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Typographic tidy-up for prose that was written as ASCII in a source comment.
 * Straight quotes around a number are feet and inches marks and must stay
 * straight — 5'-6" is not 5’-6” — so only the apostrophe in a word is curled.
 */
const nice = (s: string): string =>
  s
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/ -- /g, ' — ')
    .replace(/(\d)\s*x\s*(\d)/g, '$1×$2');

/**
 * Notes are authored as "LABEL: body" or "TRADE-OFF — body". Splitting on that
 * lead-in is what turns a wall of sentences into a scannable page, and it keeps
 * the authoring format plain text rather than a nested data structure nobody
 * wants to write by hand.
 */
function splitNote(note: string): { label: string | null; body: string } {
  const m = /^([A-Z][A-Z0-9 /,'"-]{2,40}?)(?:\s*[:—-]\s+|\s*:\s*)(.*)$/s.exec(note);
  if (!m) return { label: null, body: note };
  // A lead-in has to look like a heading, not the first four words of a sentence.
  const label = m[1]!.trim();
  if (!/[A-Z]/.test(label) || label !== label.toUpperCase()) return { label: null, body: note };
  return { label, body: m[2]!.trim() };
}

/** Data URI for the hero frame, transcoded to JPEG so a brief stays mailable. */
function heroDataUri(png: string): { uri: string; bytes: number } | null {
  if (!fs.existsSync(png)) return null;
  const jpg = path.join(
    fs.mkdtempSync(path.join(tmpdir(), 'brief-')),
    'hero.jpg',
  );
  try {
    // ImageMagick is already a hard dependency of the render pipeline's QA crops.
    execFileSync('convert', [png, '-resize', '1600x', '-quality', '86', jpg], {
      stdio: 'pipe',
    });
    const buf = fs.readFileSync(jpg);
    return { uri: `data:image/jpeg;base64,${buf.toString('base64')}`, bytes: buf.length };
  } catch {
    // No ImageMagick: embed the PNG as-is rather than shipping a brief with a
    // hole in it. Bigger file, identical information.
    const buf = fs.readFileSync(png);
    return { uri: `data:image/png;base64,${buf.toString('base64')}`, bytes: buf.length };
  } finally {
    fs.rmSync(path.dirname(jpg), { recursive: true, force: true });
  }
}

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * WHICH CAMERA HEADLINES WHICH SCHEME — an editorial choice, per layout.
 *
 * cameraFor() only ever sees the plan, never the furniture, so no single preset
 * can be the right hero for four different arrangements of the same room. Each
 * of these was picked by looking at the render, and the ones that are NOT the
 * default are the interesting cases:
 *
 *   a-window-desk  eye-hero    the WNW diagonal gets the desk, the loveseat,
 *                              the dresser and both glazed bays in one frame.
 *   b-fold-away    eye-living  eye-hero puts the 6'-0" fig 5'-10" from the lens,
 *                              dead centre, where it blanks out the dining room
 *                              that is the entire point of the scheme.
 *   c-lounge-wall  eye-hero    the low platform bed lying along the glass is
 *                              exactly what this diagonal is good at showing.
 *   d-two-rooms    eye-living  eye-hero stands in the study looking at the back
 *                              of the partition from 4 ft away — a grey slab
 *                              filling the frame. Correct, and useless: the
 *                              headline of this scheme is the bedroom at the
 *                              glass, so shoot that instead.
 *
 * The two overrides are the SAME finding from opposite directions: a hero frame
 * has to be chosen against the furniture, and this map is where that judgement
 * is recorded rather than left in someone's head.
 */
const HERO: Record<string, CameraPreset> = {
  'a-window-desk': 'eye-hero',
  'b-fold-away': 'eye-living',
  'c-lounge-wall': 'eye-hero',
  'd-two-rooms': 'eye-living',
};

const heroCamera = (id: string): CameraPreset => HERO[id] ?? 'eye-hero';

// -------------------------------------------------------------------- page

const CSS = `
:root {
  --paper: #fbf9f5; --ink: #1b1e21; --muted: #6b7176; --rule: #ded6c8;
  --accent: #7a5c3e; --panel: #f4f0e8; --warn: #8a5a1a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14171a; --ink: #e8e6e1; --muted: #9aa1a7; --rule: #2c3237;
    --accent: #c7a468; --panel: #1c2126; --warn: #d8a45a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font: 16px/1.62 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 60rem; margin: 0 auto; padding: 3.5rem 1.5rem 6rem; }
h1 { font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.1; margin: 0 0 .4rem; letter-spacing: -.02em; }
h2 {
  font-size: .78rem; text-transform: uppercase; letter-spacing: .13em; color: var(--muted);
  margin: 3.2rem 0 1rem; padding-bottom: .5rem; border-bottom: 1px solid var(--rule); font-weight: 600;
}
h3 { font-size: .95rem; margin: 1.6rem 0 .3rem; letter-spacing: .01em; }
.strap { font-size: 1.12rem; color: var(--muted); margin: 0 0 2rem; max-width: 46rem; }
.eyebrow { font: 600 .72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); margin: 0 0 .9rem; }
figure { margin: 0 0 .5rem; }
figure img, figure svg { width: 100%; height: auto; display: block; border-radius: 3px; }
figure svg { background: #fff; }
figcaption { font-size: .82rem; color: var(--muted); margin-top: .6rem; }
.frame { border: 1px solid var(--rule); border-radius: 4px; overflow: hidden; background: var(--panel); }
.scroller { overflow-x: auto; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: 4px; }
.stat { background: var(--paper); padding: .9rem 1rem; }
.stat dt { font-size: .68rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin: 0 0 .3rem; }
.stat dd { margin: 0; font: 600 1.22rem/1.15 ui-monospace, SFMono-Regular, Menlo, monospace; }
.note { margin: 0 0 1.35rem; }
.note .lbl { font: 600 .7rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .11em; text-transform: uppercase; color: var(--accent); display: block; margin-bottom: .3rem; }
.note.tradeoff .lbl { color: var(--warn); }
.note.tradeoff { border-left: 2px solid var(--warn); padding-left: 1rem; }
table { width: 100%; border-collapse: collapse; font-size: .88rem; }
th, td { text-align: left; padding: .5rem .7rem; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font-size: .68rem; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); font-weight: 600; white-space: nowrap; }
td.num, th.num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
tfoot td { font-weight: 600; border-bottom: none; }
pre { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 1rem 1.1rem; overflow-x: auto; font-size: .76rem; line-height: 1.5; margin: 0; }
.caveat { font-size: .86rem; color: var(--muted); border-left: 2px solid var(--rule); padding: .1rem 0 .1rem 1rem; margin: 1.4rem 0; }
footer { margin-top: 4rem; padding-top: 1.2rem; border-top: 1px solid var(--rule); font-size: .78rem; color: var(--muted); }
a { color: var(--accent); }
nav.briefs { display: grid; gap: .6rem; margin: 2rem 0; }
nav.briefs a { display: block; padding: 1rem 1.2rem; border: 1px solid var(--rule); border-radius: 4px; text-decoration: none; color: var(--ink); }
nav.briefs a:hover { border-color: var(--accent); }
nav.briefs .n { font: 600 .72rem/1 ui-monospace, monospace; letter-spacing: .12em; color: var(--accent); text-transform: uppercase; }
nav.briefs .d { color: var(--muted); font-size: .88rem; margin-top: .25rem; }
`;

interface Built {
  id: string;
  file: string;
  bytes: number;
  hero: boolean;
  name: string;
  description: string;
}

function buildBrief(layout: Layout, opts: { renders: string; hero: boolean }): {
  html: string;
  hero: boolean;
} {
  const result = analyzeLayout(studio, layout);
  const st = result.stats;

  const plan = renderPlanSVG(studio, layout, {
    showIssues: true,
    issues: result.issues,
    theme: 'light',
  });

  const cam = heroCamera(layout.id);
  const heroPng = path.join(opts.renders, `rt-${layout.id}-${cam}.png`);
  const hero = opts.hero ? heroDataUri(heroPng) : null;

  // ---- furniture schedule, priciest first so the money is visible ----------
  const rows = layout.items
    .map((it) => {
      const def = getDef(it.def);
      return {
        name: it.label ?? def.name,
        size: `${formatShort(it.size?.w ?? def.w)} × ${formatShort(it.size?.d ?? def.d)}`,
        h: formatShort(it.size?.h ?? def.h),
        price: def.price ?? 0,
        note: it.note ?? '',
      };
    })
    .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
  const total = rows.reduce((s, r) => s + r.price, 0);

  const notes = layout.notes ?? [];
  const noteHtml = notes
    .map((n) => {
      const { label, body } = splitNote(n);
      const tradeoff = /^(TRADE-OFF|BUDGET CAVEAT|DENSITY)/.test(label ?? '');
      return [
        `<p class="note${tradeoff ? ' tradeoff' : ''}">`,
        label ? `<span class="lbl">${esc(label)}</span>` : '',
        esc(nice(body)),
        `</p>`,
      ].join('');
    })
    .join('\n');

  const stat = (k: string, v: string): string =>
    `<div class="stat"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;

  const errs = result.issues.filter((i) => i.severity === 'error').length;
  const warns = result.issues.filter((i) => i.severity === 'warn').length;

  const html = `<title>${esc(layout.name)} — 508 sq ft studio</title>
<style>${CSS}</style>
<div class="wrap">
<p class="eyebrow">Layout brief · 508 sq ft L-shaped studio</p>
<h1>${esc(layout.name)}</h1>
<p class="strap">${esc(nice(layout.description ?? ''))}</p>

${
  hero
    ? `<figure class="frame"><img src="${hero.uri}" alt="Ray-traced view of ${esc(layout.name)}"></figure>
<figcaption>Path-traced in Cycles from the same model the plan is drawn from — <code>${esc(
        cam,
      )}</code> camera at 5'-6" eye height, overcast daylight matched to a photograph of the real unit. Furniture is dimensionally exact but geometrically simplified: read it for scale, light and sight lines, not for upholstery.</figcaption>`
    : `<p class="caveat">No ray-traced frame found at <code>${esc(
        heroPng,
      )}</code>. Generate one with <code>npx tsx scripts/raytrace.ts --layout ${esc(
        layout.id,
      )} --camera ${esc(cam)} --samples 768</code>.</p>`
}

<h2>At a glance</h2>
<dl class="stats">
${stat('Interior', `${st.interiorAreaSqft.toFixed(0)} sq ft`)}
${stat('Free floor', `${Math.round(st.freeFraction * 100)}%`)}
${stat('Narrowest route', st.narrowestPath ? formatShort(st.narrowestPath) : '—')}
${stat('Pieces', String(st.itemCount))}
${stat('Furniture', money(st.budget ?? total))}
${stat('Analyzer', errs ? `${errs} error${errs > 1 ? 's' : ''}` : warns ? `${warns} warn` : 'clean')}
</dl>

<h2>The plan</h2>
<figure class="frame scroller">${plan.svg}</figure>
<figcaption>To scale at ${plan.scale} px per foot. Overall 30'-4" × 19'-10", 448 sq ft interior. Every dimension is traced from the real unit; assumptions are recorded in <code>PLAN_NOTES</code>.</figcaption>

<h2>The scheme</h2>
${noteHtml}

<h2>Schedule</h2>
<div class="scroller">
<table>
<thead><tr><th>Piece</th><th class="num">Plan size</th><th class="num">Height</th><th class="num">Price</th></tr></thead>
<tbody>
${rows
  .map(
    (r) =>
      `<tr><td>${esc(r.name)}${
        r.note ? `<br><span style="color:var(--muted);font-size:.82rem">${esc(nice(r.note))}</span>` : ''
      }</td><td class="num">${esc(r.size)}</td><td class="num">${esc(r.h)}</td><td class="num">${
        r.price ? esc(money(r.price)) : '—'
      }</td></tr>`,
  )
  .join('\n')}
</tbody>
<tfoot><tr><td>${rows.length} pieces</td><td class="num"></td><td class="num"></td><td class="num">${esc(
    money(total),
  )}</td></tr></tfoot>
</table>
</div>
<p class="caveat">Catalogue prices are furniture only, and bed frames are frames — add a mattress, window shades and bedding on top. Sizes are the manufacturer's real published dimensions; see <code>source</code> on each catalog entry for where each number came from.</p>

<h2>Analyzer report</h2>
<pre>${esc(formatReport(result, { color: false }))}</pre>

<footer>
Generated by <code>scripts/brief.ts</code> from <code>src/layouts/${esc(layout.id)}.ts</code>,
<code>src/core/plan.ts</code> and <code>src/core/catalog.ts</code>. Every number on this page is
computed, not transcribed.
</footer>
</div>`;

  return { html, hero: !!hero };
}

// -------------------------------------------------------------------- main

function main(): void {
  const args = parseArgs(process.argv.slice(2), FLAGS);
  if (args.help) {
    console.log(
      formatHelp({
        usage: 'tsx scripts/brief.ts [flags]',
        description: 'Write one self-contained HTML brief per layout.',
        specs: FLAGS,
        notes: [
          'The ray-traced hero frame is picked up from renders/, never rendered here:',
          '  npx tsx scripts/raytrace.ts --layout <id> --camera eye-hero --samples 768',
        ],
      }),
    );
    return;
  }

  const layouts = resolveLayouts(args.str('layout'));
  const outName = args.str('out') ?? 'briefs';
  const outDir = path.resolve(outName);
  const renders = path.resolve(args.str('renders') ?? 'renders');
  const wantHero = args.bool('hero');
  ensureDir(outDir);

  console.log(
    `brief  ${layouts.length} layout${layouts.length > 1 ? 's' : ''} -> ${outName}${
      wantHero ? '' : '  (no hero frames)'
    }`,
  );
  console.log('');

  const built: Built[] = [];
  for (const layout of layouts) {
    const { html, hero } = buildBrief(layout, {
      renders,
      hero: wantHero,
    });
    const file = path.join(outDir, `${layout.id}.html`);
    fs.writeFileSync(file, html);
    const bytes = Buffer.byteLength(html);
    built.push({
      id: layout.id,
      file,
      bytes,
      hero,
      name: layout.name,
      description: layout.description ?? '',
    });
    console.log(
      `  ${c.green('✓')} ${layout.id.padEnd(15)} ${fmtBytes(bytes).padStart(9)}  ${
        hero ? 'with hero frame' : c.yellow('no hero frame')
      }`,
    );
  }

  let wroteIndex = false;
  if (args.bool('index') && built.length > 1) {
    wroteIndex = true;
    const index = `<title>508 sq ft studio — four layouts</title>
<style>${CSS}</style>
<div class="wrap">
<p class="eyebrow">508 sq ft L-shaped studio · 448 sq ft interior</p>
<h1>Four layouts</h1>
<p class="strap">One apartment, four schemes. Every one carries the same hard requirement — a real
Fully Jarvis sit-stand desk with an ergonomic chair, monitors on an arm and cable management — and
each spends the remaining floor differently.</p>
<nav class="briefs">
${built
  .map(
    (b) =>
      `<a href="./${encodeURIComponent(path.basename(b.file))}"><span class="n">${esc(
        b.id,
      )}</span><div>${esc(b.name)}</div><div class="d">${esc(nice(b.description))}</div></a>`,
  )
  .join('\n')}
</nav>
<footer>Generated by <code>scripts/brief.ts</code>.</footer>
</div>`;
    const file = path.join(outDir, 'index.html');
    fs.writeFileSync(file, index);
    console.log(`  ${c.green('✓')} ${'index'.padEnd(15)} ${fmtBytes(Buffer.byteLength(index)).padStart(9)}`);
  }

  console.log('');
  console.log(
    renderTable(
      [{ header: 'BRIEF' }, { header: 'HERO' }, { header: 'BYTES', align: 'right' }],
      built.map((b) => [path.relative(process.cwd(), b.file), b.hero ? 'yes' : 'no', fmtBytes(b.bytes)]),
      { indent: '  ' },
    ),
  );
  console.log('');
  console.log(heading('open'));
  const landing = wroteIndex ? path.join(outDir, 'index.html') : built[0]!.file;
  console.log(`  ${path.relative(process.cwd(), landing)}`);
}

try {
  main();
} catch (err) {
  reportError(err);
  process.exitCode = 1;
}
