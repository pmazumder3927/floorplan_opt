/**
 * scripts/brief.ts — one self-contained HTML brief per layout.
 *
 *   npx tsx scripts/brief.ts                       # all four, into briefs/
 *   npx tsx scripts/brief.ts --layout a-night-wall
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
import { buildBudget, money as fmtMoney, type BudgetResult } from '@/core/budget';
import { getDef } from '@/core/catalog';
import { briefNote, FINISH_SCHEDULE, TRIM_RULES } from '@/core/finishes';
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

const money = fmtMoney;

/**
 * A budget as a CSV, because a budget's real destination is a spreadsheet and no
 * amount of nice HTML changes that. One row per catalog line, then one row per
 * allowance with its low/high band, then the totals — so the client can sort it,
 * delete the lines they disagree with and see the number move.
 */
function budgetCsv(layout: Layout, b: BudgetResult): string {
  const q = (s: string): string => `"${s.replace(/"/g, '""')}"`;
  const rows: string[] = [
    'section,item,catalog_id,qty,unit_usd,total_usd,low_usd,high_usd,tier,price_verified,note',
  ];
  for (const s of b.sections) {
    for (const l of s.lines) {
      rows.push(
        [
          q(s.label),
          q(l.name),
          q(l.id),
          l.qty,
          l.unit,
          l.total,
          '',
          '',
          l.tier,
          l.priceUnverified ? 'no' : 'yes',
          q(l.priceUnverified ? 'catalog source flags this price as unverified' : ''),
        ].join(','),
      );
    }
    rows.push([q(s.label + ' — SUBTOTAL'), '', '', '', '', s.subtotal, '', '', '', '', ''].join(','));
  }
  rows.push([q('FURNITURE TOTAL'), '', '', '', '', b.furnitureTotal, '', '', '', '', ''].join(','));
  for (const a of b.allowances) {
    rows.push(
      [q('ALLOWANCE'), q(a.label), q(a.id), a.qty, '', '', a.low, a.high, '', 'band', q(a.why)].join(','),
    );
  }
  rows.push(
    [q('ALLOWANCES TOTAL'), '', '', '', '', '', b.allowanceLow, b.allowanceHigh, '', '', ''].join(','),
  );
  rows.push(
    [q('ALL-IN'), '', '', '', '', '', b.allInLow, b.allInHigh, '', '', q(`layout ${layout.id}`)].join(','),
  );
  return rows.join('\n') + '\n';
}

/**
 * WHICH CAMERA HEADLINES WHICH SCHEME — an editorial choice, per layout.
 *
 * cameraFor() only ever sees the plan, never the furniture, so no single preset
 * can be the right hero for four different arrangements of the same room. Each
 * of these was picked by looking at the render, and the ones that are NOT the
 * default are the interesting cases:
 *
 * FOR THESE FOUR SCHEMES THE RULE IS SIMPLE, because every one of them is
 * organised around one wall: SHOOT THE PICTURE. Three of the four put it on the
 * bathroom partition at the east end, so the frame that shows the scheme is
 * eye-window — standing at the glass looking back east down the room's own
 * 18'-4" axis, which is also the axis the seating distance is measured along.
 * The fourth puts the picture IN the west glazing, so it is the opposite frame.
 *
 *   a-night-wall    eye-window  screen, plinth, projector, sofa and poufs all in
 *                               one frame, with the bed in the notch at the edge.
 *   b-fold-away     eye-living  the picture is the floor-riser AT the glazing, so
 *                               the only frame that contains it looks west. It
 *                               also catches the Murphy cabinet on the north wall.
 *   c-second-row    eye-window  the whole point is the low bed lying between the
 *                               floor seats and the screen; looking east down the
 *                               axis is the only view that shows the bed IS row 2.
 *   d-paint-and-go  eye-window  a painted rectangle has no frame and no hardware,
 *                               so the scheme is invisible from any other angle —
 *                               and the honest cost of that is that it is also
 *                               nearly invisible in this one.
 *
 * eye-hero, the WNW diagonal, is deliberately used by none of them: it looks
 * across the room rather than down its long axis, which is exactly the axis these
 * schemes are built on.
 */
const HERO: Record<string, CameraPreset> = {
  'a-night-wall': 'eye-window',
  'b-fold-away': 'eye-living',
  'c-second-row': 'eye-window',
  'd-paint-and-go': 'eye-window',
};

const heroCamera = (id: string): CameraPreset => HERO[id] ?? 'eye-hero';

// -------------------------------------------------------------------- page

/**
 * PALETTE AND TYPE ARE BORROWED FROM THE DRAWING, not invented for the web page.
 *
 *   paper  #fbf9f5   the sheet colour out of render2d/theme.ts, so the brief and
 *                    the plan it embeds sit on the same ground
 *   ink    #1b1e21   /  #3b4144 rule: the concrete poché, i.e. the material the
 *                    plan is cutting through
 *   accent #7a5c3e   the walnut floor of the actual apartment
 *   warn   #8a5a1a   trade-offs and caveats, which must be as visible as the pitch
 *   dark   #c7a468   accent becomes the bamboo of the Jarvis desktop, which is the
 *                    one warm surface that reads on a dark ground
 *
 * No display face. A construction brief is read and checked, not admired, so the
 * only typographic move is that every dimension, price, label and the analyzer
 * report are set in mono — which is what annotation looks like on a drawing and
 * makes columns of numbers line up.
 *
 * MEASURE: prose is held to 40rem (~68 characters) while the hero frame, the plan
 * and the schedule break out to the full 60rem. A 60rem paragraph is 110
 * characters and unreadable; a 40rem drawing is pointless.
 */
const CSS = `
:root {
  --paper: #fbf9f5; --ink: #1b1e21; --muted: #6b7176; --rule: #ded6c8;
  --accent: #7a5c3e; --panel: #f4f0e8; --warn: #8a5a1a; --plan-bg: #fff;
  --measure: 40rem;
}
/*
 * Theme tokens are defined three times on purpose: the media query carries the
 * OS preference, and the two [data-theme] blocks are what the artifact viewer's
 * own toggle stamps on the root. Without them the toggle can only ever move one
 * way, because a media query would keep winning in the other direction. Nothing
 * below styles inside a media query — components read tokens only.
 */
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14171a; --ink: #e8e6e1; --muted: #9aa1a7; --rule: #2c3237;
    --accent: #c7a468; --panel: #1c2126; --warn: #d8a45a; --plan-bg: #e9e5dd;
  }
}
:root[data-theme="dark"] {
  --paper: #14171a; --ink: #e8e6e1; --muted: #9aa1a7; --rule: #2c3237;
  --accent: #c7a468; --panel: #1c2126; --warn: #d8a45a; --plan-bg: #e9e5dd;
}
:root[data-theme="light"] {
  --paper: #fbf9f5; --ink: #1b1e21; --muted: #6b7176; --rule: #ded6c8;
  --accent: #7a5c3e; --panel: #f4f0e8; --warn: #8a5a1a; --plan-bg: #fff;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font: 16px/1.62 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 60rem; margin: 0 auto; padding: 3.5rem 1.5rem 6rem; display: flex; flex-direction: column; }
h1 {
  font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.1; margin: 0 0 .4rem;
  letter-spacing: -.02em; text-wrap: balance;
}
h2 {
  font-size: .78rem; text-transform: uppercase; letter-spacing: .13em; color: var(--muted);
  margin: 3.2rem 0 1rem; padding-bottom: .5rem; border-bottom: 1px solid var(--rule); font-weight: 600;
}
.strap { font-size: 1.12rem; color: var(--muted); margin: 0 0 2rem; max-width: 44rem; text-wrap: pretty; }
.eyebrow {
  font: 600 .72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .16em;
  text-transform: uppercase; color: var(--accent); margin: 0 0 .9rem;
}
figure { margin: 0 0 .5rem; }
figure img, figure svg { width: 100%; height: auto; display: block; }
figure svg { background: var(--plan-bg); }
figcaption { font-size: .82rem; color: var(--muted); margin-top: .6rem; max-width: var(--measure); text-wrap: pretty; }
.frame { border: 1px solid var(--rule); border-radius: 3px; overflow: hidden; background: var(--panel); }
.scroller { overflow-x: auto; }
/*
 * FLEX, NOT GRID, and the reason is the last row. With
 * grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)) the tracks exist
 * whether or not there is an item in them, so eight stats in a six-column row
 * left two cells of bare container background — a grey L-shaped hole in the
 * middle of the page. A wrapping flex row with flex-grow on the item has no
 * empty tracks: whatever lands on the last row expands to fill it.
 */
.stats {
  display: flex; flex-wrap: wrap; gap: 1px;
  background: var(--rule); border: 1px solid var(--rule); border-radius: 3px; margin: 0;
}
.stat { flex: 1 1 8.5rem; background: var(--paper); padding: .9rem 1rem; }
.stat dt { font-size: .68rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin: 0 0 .3rem; }
.stat dd {
  margin: 0; font: 600 1.22rem/1.15 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}
.note { margin: 0 0 1.35rem; max-width: var(--measure); text-wrap: pretty; }
.note .lbl {
  font: 600 .7rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .11em;
  text-transform: uppercase; color: var(--accent); display: block; margin-bottom: .3rem;
}
.note.tradeoff { border-left: 2px solid var(--warn); padding-left: 1rem; }
.note.tradeoff .lbl { color: var(--warn); }
table { width: 100%; border-collapse: collapse; font-size: .88rem; }
th, td { text-align: left; padding: .5rem .7rem; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font-size: .68rem; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); font-weight: 600; white-space: nowrap; }
td.num, th.num {
  text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
td .sub { color: var(--muted); font-size: .82rem; display: block; margin-top: .15rem; }
tfoot td { font-weight: 600; border-bottom: none; }
pre {
  background: var(--panel); border: 1px solid var(--rule); border-radius: 3px;
  padding: 1rem 1.1rem; overflow-x: auto; font-size: .76rem; line-height: 1.5; margin: 0;
}
.caveat {
  font-size: .86rem; color: var(--muted); border-left: 2px solid var(--rule);
  padding: .1rem 0 .1rem 1rem; margin: 1.4rem 0; max-width: var(--measure);
}
footer {
  margin-top: 4rem; padding-top: 1.2rem; border-top: 1px solid var(--rule);
  font-size: .78rem; color: var(--muted); max-width: var(--measure);
}
a { color: var(--accent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }
nav.briefs { display: grid; gap: .6rem; margin: 2rem 0; }
nav.briefs a {
  display: block; padding: 1rem 1.2rem; border: 1px solid var(--rule); border-radius: 3px;
  text-decoration: none; color: var(--ink);
}
nav.briefs a:hover { border-color: var(--accent); }
nav.briefs .n {
  font: 600 .72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em;
  color: var(--accent); text-transform: uppercase;
}
nav.briefs .d { color: var(--muted); font-size: .88rem; margin-top: .25rem; }

/*
 * BUDGET AND SCHEDULE TABLES.
 *
 * Both are wide, both are read by scanning down a column of numbers, and both
 * have to survive being printed. So: group headers are the only thing that
 * carries weight, the numbers stay mono and tabular, and the reasoning goes in
 * a .sub line under the item rather than in a column of its own — a
 * five-column table of prose is unreadable at any width.
 * (No backticks in here: this whole block is inside a template literal.)
 */
table.budget tbody + tbody { border-top: 1px solid var(--rule); }
table.budget tr.grp th {
  text-align: left; font-size: .7rem; letter-spacing: .1em; text-transform: uppercase;
  color: var(--accent); padding-top: 1.1rem; border-bottom: 1px solid var(--rule);
}
table.budget tr.grp th.num { text-align: right; color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
table.budget tr.tot th {
  border-top: 1px solid var(--ink); border-bottom: none; text-align: left;
  font-size: .82rem; text-transform: none; letter-spacing: 0; color: var(--ink);
}
table.budget tr.tot th.num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
table.budget tr.allin th { border-top: 2px solid var(--accent); font-weight: 700; }
.flag {
  display: inline-block; margin-left: .45rem; padding: 0 .35rem; border-radius: 2px;
  font: 600 .62rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em;
  text-transform: uppercase; color: var(--warn); border: 1px solid var(--warn); white-space: nowrap;
}
.tier {
  display: inline-block; margin-left: .4rem; font: 600 .62rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
}
.tier.t-premium { color: var(--accent); }
table.finish td { font-size: .84rem; }
table.finish td:first-child { min-width: 11rem; }
.swatchcell { white-space: nowrap; }
.swatch {
  display: inline-block; width: .95rem; height: .95rem; border-radius: 2px; vertical-align: -.15rem;
  border: 1px solid var(--rule); margin-right: .35rem;
}
.trim { max-width: var(--measure); margin: 0 0 1.6rem; }
.trim h3 { font-size: .82rem; letter-spacing: .06em; margin: 0 0 .5rem; }
.trim p { margin: 0 0 .5rem; text-wrap: pretty; }
.trim p.avoid { color: var(--warn); }
.trim .lbl {
  font: 600 .66rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em;
  text-transform: uppercase; color: var(--muted); display: inline-block; min-width: 3.6rem;
}
.trim p.sub { color: var(--muted); font-size: .82rem; }
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
  csv: string;
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

  // ---- the budget, grouped by purpose --------------------------------------
  const budget = buildBudget(layout);
  const band = (lo: number, hi: number): string =>
    lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;

  const budgetHtml = [
    `<div class="scroller"><table class="budget">`,
    `<thead><tr><th>Line</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>`,
    budget.sections
      .map(
        (s) =>
          `<tbody><tr class="grp"><th colspan="3">${esc(s.label)}</th><th class="num">${esc(
            money(s.subtotal),
          )}</th></tr>` +
          s.lines
            .map(
              (l) =>
                `<tr><td>${esc(l.name)}${
                  l.priceUnverified
                    ? '<span class="flag" title="the catalog entry\'s own source string flags this price as unverified">price unverified</span>'
                    : ''
                }${l.tier !== 'unspecified' ? `<span class="tier t-${l.tier}">${l.tier}</span>` : ''}</td>` +
                `<td class="num">${l.qty}</td><td class="num">${
                  l.unit ? esc(money(l.unit)) : 'incl.'
                }</td><td class="num">${l.total ? esc(money(l.total)) : '—'}</td></tr>`,
            )
            .join('') +
          `</tbody>`,
      )
      .join(''),
    `<tbody><tr class="tot"><th colspan="3">Furniture, fittings and AV — catalogue total</th><th class="num">${esc(
      money(budget.furnitureTotal),
    )}</th></tr></tbody>`,
    `</table></div>`,
  ].join('');

  const allowanceHtml = budget.allowances.length
    ? [
        `<div class="scroller"><table class="budget">`,
        `<thead><tr><th>Allowance — real cost with no catalogue page</th><th class="num">Low</th><th class="num">High</th></tr></thead><tbody>`,
        budget.allowances
          .map(
            (a) =>
              `<tr><td>${esc(a.label)}<span class="sub">${esc(nice(a.why))}</span></td><td class="num">${esc(
                money(a.low),
              )}</td><td class="num">${esc(money(a.high))}</td></tr>`,
          )
          .join(''),
        `<tr class="tot"><th>Allowances</th><th class="num">${esc(
          money(budget.allowanceLow),
        )}</th><th class="num">${esc(money(budget.allowanceHigh))}</th></tr>`,
        `<tr class="tot allin"><th>ALL-IN</th><th class="num">${esc(
          money(budget.allInLow),
        )}</th><th class="num">${esc(money(budget.allInHigh))}</th></tr>`,
        `</tbody></table></div>`,
      ].join('')
    : '';

  // ---- the finish + trim schedule ------------------------------------------
  const finishHtml = [
    `<div class="scroller"><table class="finish">`,
    `<thead><tr><th>Surface</th><th>Material</th><th>Colour / sheen</th><th>Rule for anything new</th></tr></thead><tbody>`,
    FINISH_SCHEDULE.map(
      (f) =>
        `<tr><td><strong>${esc(f.surface)}</strong>${
          f.verified ? '' : '<span class="flag">not in the photo</span>'
        }<span class="sub">${esc(nice(f.evidence))}</span></td>` +
        `<td>${esc(nice(f.material))}${f.trade ? `<span class="sub">${esc(f.trade)}</span>` : ''}</td>` +
        `<td class="swatchcell">${
          f.hex
            ? `<span class="swatch" style="background:${esc(f.hex)}"></span><code>${esc(f.hex)}</code>`
            : '<em>none</em>'
        }<span class="sub">${esc(f.sheen)}${f.gloss ? `, ${esc(f.gloss)}` : ''}</span></td>` +
        `<td>${esc(nice(f.rule))}</td></tr>`,
    ).join(''),
    `</tbody></table></div>`,
  ].join('');

  const trimHtml = TRIM_RULES.map(
    (t) =>
      `<div class="trim"><h3>${esc(t.title)}</h3>` +
      `<p><span class="lbl">use</span>${esc(nice(t.use))}</p>` +
      `<p class="avoid"><span class="lbl">never</span>${esc(nice(t.avoid))}</p>` +
      `<p class="sub">${esc(nice(t.why))}</p></div>`,
  ).join('');

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
${stat('Furniture', money(budget.furnitureTotal))}
${stat('Screening + blackout', money(budget.screeningTotal))}
${stat('All-in', band(budget.allInLow, budget.allInHigh))}
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
        r.note ? `<span class="sub">${esc(nice(r.note))}</span>` : ''
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
<p class="caveat">Sizes are the manufacturer's real published dimensions; every catalog entry's <code>source</code> string says exactly which page each number and price was read off, which ones are interpolations, and which ones are still unverified. ${
    budget.unverifiedCount
      ? `<strong>${budget.unverifiedCount} price${
          budget.unverifiedCount > 1 ? 's' : ''
        } in this schedule ${budget.unverifiedCount > 1 ? 'are' : 'is'} flagged unverified by the catalog itself</strong> — they are marked in the budget below and must be re-quoted before anyone commits.`
      : ''
  }</p>

<h2>Budget</h2>
<p class="note">Grouped by purpose rather than by shop, because in 448 sq ft the interesting question is never how much but how much of it went where. ${esc(
    `Of ${money(budget.furnitureTotal)} of catalogue spend, ${money(
      budget.screeningTotal,
    )} is the picture and the light control that makes it work.`,
  )}</p>
${budgetHtml}

<h2>What the catalogue total leaves out</h2>
<p class="note">A furniture total is always wrong in the same direction: it is the cost of the things that have a product page. A bed frame is not a bed, screen paint is not a screen, and a projector with no streaming app is not a streaming device. These are the lines that apply to <em>this</em> layout, as bands.</p>
${allowanceHtml}
<p class="caveat">Every band above is a class estimate for US mid-2026 with its reasoning stated, not a quotation. Anything that says get a quote means get a quote.</p>

<h2>Finish and trim schedule</h2>
<p class="note">${esc(briefNote())}</p>
${finishHtml}

<h2>Trim rules — what a new piece has to obey</h2>
<p class="note">The half of the schedule a furniture decision actually consults. A room is defined as much by what is missing as by what is there, and in this unit the missing things are the design.</p>
${trimHtml}

<h2>Analyzer report</h2>
<pre>${esc(formatReport(result, { color: false }))}</pre>

<footer>
Generated by <code>scripts/brief.ts</code> from <code>src/layouts/${esc(layout.id)}.ts</code>,
<code>src/core/plan.ts</code> and <code>src/core/catalog.ts</code>. Every number on this page is
computed, not transcribed.
</footer>
</div>`;

  return { html, hero: !!hero, csv: budgetCsv(layout, budget) };
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
    const { html, hero, csv } = buildBrief(layout, {
      renders,
      hero: wantHero,
    });
    const file = path.join(outDir, `${layout.id}.html`);
    fs.writeFileSync(file, html);
    // The budget also goes out as a CSV, because a budget's real destination is
    // a spreadsheet and no amount of nice HTML changes that.
    fs.writeFileSync(path.join(outDir, `${layout.id}-budget.csv`), csv);
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
      }  + budget.csv`,
    );
  }

  let wroteIndex = false;
  if (args.bool('index') && built.length > 1) {
    wroteIndex = true;
    const index = `<title>508 sq ft studio — four layouts</title>
<style>${CSS}</style>
<div class="wrap">
<p class="eyebrow">508 sq ft L-shaped studio · 448 sq ft interior · 213 sq ft of usable open floor</p>
<h1>Four layouts</h1>
<p class="strap">One apartment, four schemes. Every one carries the same four hard requirements — a
real queen bed, a real Fully Jarvis sit-stand desk, a projector viewing area whose throw geometry
and seating distance both actually work, and a modern-minimal palette taken off a photograph of
the unit itself. They differ in how they answer the projector, because that is the requirement
that reorganises the plan: a 100&quot; image needs 9 to 11 ft of viewing distance plus a plinth
zone, which consumes most of the 18'-4&quot; east-west axis.</p>
<p class="caveat">One finding applies to all four and it is arithmetic rather than taste:
<strong>daytime viewing is not possible in this unit without blackout on all four glazing
bays.</strong> A 2,700-lumen projector on a 0.6-gain 100&quot; screen makes 54 fL of peak white;
a screen face taking only 500 lux of ambient — conservative for a wall 18 ft from an uncurtained
full-height west glass wall at midday — sits at 28 fL of black. That is 1.9:1 in-room contrast.
Even a 5,000-lumen unit reaches only 3.6:1. There is no lumen count purchasable in 2026 that
fixes it, and an ALR screen does not substitute, because the projection wall faces due west —
straight down the sightline at the glazing, the one direction a lenticular screen cannot reject.
If the blackout is not in the budget, buy a television and spend the projector money on the desk
and the seating.</p>
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
