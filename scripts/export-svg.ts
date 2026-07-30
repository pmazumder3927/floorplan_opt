/**
 * scripts/export-svg.ts — write a to-scale 2D architectural plan (SVG) for
 * each requested layout.
 *
 *   pnpm svg                                   # renders/<layout>-plan.svg for all
 *   pnpm svg -- --layout studio-a --scale 32   # bigger drawing, one layout
 *   pnpm svg -- --theme blueprint --clearances
 *
 * SVG (not PNG) because it is vector, diffable, tiny, and opens in any browser
 * — this is the drawing you print or hand to a human. render.ts is the one that
 * produces pixels for an agent to *look* at.
 *
 * The analyzer runs first so the drawing can mark its own problems: every
 * Issue is passed into renderPlanSVG, which draws a marker at Issue.at.
 */

import fs from 'node:fs';
import path from 'node:path';

import { analyzeLayout } from '@/core/analysis';
import { renderPlanSVG } from '@/render2d/svg';
import { formatShort } from '@/core/units';
import type { Issue, Render2DOptions } from '@/core/types';

import {
  c,
  ensureDir,
  fmtBytes,
  fmtInt,
  formatHelp,
  parseArgs,
  parseChoice,
  planFor,
  relPath,
  renderTable,
  reportError,
  resolveLayouts,
  type FlagSpecs,
} from './lib';

const THEMES = ['light', 'dark', 'blueprint'] as const;

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
    default: 'renders',
    value: '<dir>',
    describe: 'output directory',
  },
  scale: {
    kind: 'number',
    alias: 's',
    value: '<px per ft>',
    describe: 'drawing scale in pixels per foot (default: svg.ts default)',
  },
  theme: {
    kind: 'string',
    alias: 't',
    value: `<${THEMES.join('|')}>`,
    describe: 'colour theme',
  },
  issues: {
    kind: 'boolean',
    default: true,
    describe: 'mark analyzer issues on the drawing',
  },
  clearances: {
    kind: 'boolean',
    default: false,
    describe: 'draw the required clear-floor zones in front of things',
  },
};

interface Written {
  file: string;
  layout: string;
  width: number;
  height: number;
  scale: number;
  bytes: number;
  issues: Issue[];
}

function main(): number {
  const args = parseArgs(process.argv.slice(2), FLAGS);
  if (args.help) {
    console.log(
      formatHelp({
        usage: 'tsx scripts/export-svg.ts [flags]',
        description: 'Write renders/<layout>-plan.svg for each requested layout.',
        specs: FLAGS,
        notes: [
          'the SVG is pure text: grep it, diff it, or open it in a browser',
          'analyzer issues are drawn as markers unless you pass --no-issues',
        ],
        examples: [
          'pnpm svg',
          'pnpm svg -- --layout studio-a --scale 36 --clearances',
          'pnpm svg -- --theme blueprint --out /tmp/plans',
        ],
      }),
    );
    return 0;
  }

  const targets = resolveLayouts(args.str('layout'));
  const outDir = ensureDir(args.str('out') ?? 'renders');
  const showIssues = args.bool('issues');
  const showClearances = args.bool('clearances');
  const theme = args.given('theme')
    ? parseChoice('theme', args.str('theme'), THEMES)
    : undefined;

  const scale = args.num('scale');
  if (scale !== undefined && !(scale > 0)) {
    throw new Error(`--scale must be greater than 0 (got ${scale})`);
  }

  const written: Written[] = [];

  for (const layout of targets) {
    const plan = planFor(layout);
    // Analysis is cheap next to the drawing, and we always want the numbers in
    // the title block even when the markers are switched off.
    const analysis = analyzeLayout(plan, layout);
    const issues = showIssues ? analysis.issues : [];

    const options: Render2DOptions = {
      showIssues,
      issues,
      showClearances,
      title: `${plan.name} — ${layout.name}`,
      subtitle:
        `${analysis.stats.interiorAreaSqft.toFixed(0)} ft² interior · ` +
        `${(analysis.stats.freeFraction * 100).toFixed(0)}% free floor · ` +
        `${analysis.stats.itemCount} pieces` +
        (analysis.stats.narrowestPath !== undefined
          ? ` · narrowest path ${formatShort(analysis.stats.narrowestPath)}`
          : ''),
    };
    // Only override svg.ts's own defaults when the flag was actually given.
    if (scale !== undefined) options.scale = scale;
    if (theme !== undefined) options.theme = theme;

    const svg = renderPlanSVG(plan, layout, options);
    const file = path.join(outDir, `${layout.id}-plan.svg`);
    fs.writeFileSync(file, svg.svg, 'utf8');

    written.push({
      file,
      layout: layout.id,
      width: svg.width,
      height: svg.height,
      scale: svg.scale,
      bytes: Buffer.byteLength(svg.svg, 'utf8'),
      issues,
    });
  }

  const rows = written.map((w) => {
    const errors = w.issues.filter((i) => i.severity === 'error').length;
    const warns = w.issues.filter((i) => i.severity === 'warn').length;
    const marks = !showIssues
      ? c.dim('off')
      : errors > 0
        ? `${c.red(`${errors}e`)} ${c.yellow(`${warns}w`)}`
        : warns > 0
          ? c.yellow(`${warns}w`)
          : c.green('clean');
    return [
      relPath(w.file),
      `${fmtInt(w.width)}×${fmtInt(w.height)} px`,
      `${w.scale.toFixed(1)} px/ft`,
      fmtBytes(w.bytes),
      marks,
    ];
  });

  console.log(
    renderTable(
      [
        { header: 'FILE' },
        { header: 'SIZE (px)', align: 'right' },
        { header: 'SCALE', align: 'right' },
        { header: 'BYTES', align: 'right' },
        { header: 'ISSUES', align: 'right' },
      ],
      rows,
      { indent: '  ' },
    ),
  );

  const first = written[0];
  if (first) {
    const plan = planFor(targets[0]!);
    console.log('');
    console.log(
      c.dim(
        `  ${written.length} file${written.length === 1 ? '' : 's'} in ${relPath(outDir)} · ` +
          `plan is ${formatShort(plan.meta.overallWidth)} × ${formatShort(
            plan.meta.overallDepth,
          )} overall` +
          (theme ? ` · theme ${theme}` : ''),
      ),
    );
    console.log(c.dim(`  view: open ${relPath(first.file)} in a browser (it is vector, zoom in)`));
  } else {
    console.log(c.dim('  nothing written (no layouts matched)'));
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  process.exitCode = reportError(err);
}
