/**
 * scripts/check.ts — run the clearance / collision / circulation analyzer over
 * one or more layouts and print a human (and machine) readable report.
 *
 *   pnpm check                      # every layout, full reports + summary
 *   pnpm check -- --layout a,b      # just these two
 *   pnpm check -- --quiet           # summary table only
 *   pnpm check -- --json            # machine-readable, for another script
 *
 * Exit code 1 if ANY requested layout has an error-severity issue, so this
 * doubles as a pre-commit / CI gate: an "error" means the layout is physically
 * broken (things overlap, a door cannot open, a path is impassable), not just
 * inelegant.
 */

import { analyzeLayout, formatReport } from '@/core/analysis';
import { CLEARANCE, formatShort } from '@/core/units';
import type { AnalysisResult, Issue, Layout } from '@/core/types';

import {
  c,
  colorEnabled,
  fmtInt,
  formatHelp,
  heading,
  parseArgs,
  planFor,
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
  json: {
    kind: 'boolean',
    default: false,
    describe: 'emit machine-readable JSON instead of text',
  },
  quiet: {
    kind: 'boolean',
    alias: 'q',
    default: false,
    describe: 'summary table only (skip the per-layout reports)',
  },
};

function countBy(issues: Issue[], severity: Issue['severity']): number {
  return issues.filter((i) => i.severity === severity).length;
}

/** Free-floor percentage, coloured by how tight the plan is getting. */
function freeCell(result: AnalysisResult): string {
  const pct = result.stats.freeFraction * 100;
  const text = `${pct.toFixed(1)}%`;
  // Rules of thumb for a studio: below ~50% free floor it reads as cluttered,
  // below ~40% it is genuinely hard to move around in.
  if (pct < 40) return c.red(text);
  if (pct < 50) return c.yellow(text);
  return c.green(text);
}

/**
 * The narrowest point on the main circulation path, compared against the real
 * code-ish minimums in CLEARANCE: 36" is a comfortable walkway, 30" is the
 * squeeze-by minimum, below that you are turning sideways.
 */
function pathCell(result: AnalysisResult): string {
  const w = result.stats.narrowestPath;
  if (w === undefined) return c.dim('—');
  const text = formatShort(w);
  if (w < CLEARANCE.walkwayTight) return c.red(text);
  if (w < CLEARANCE.walkway) return c.yellow(text);
  return c.green(text);
}

function budgetCell(layout: Layout, result: AnalysisResult): string {
  const budget = result.stats.budget ?? layout.budget;
  if (budget === undefined) return c.dim('—');
  return `$${fmtInt(budget)}`;
}

function countCell(n: number, colorFn: (s: string) => string): string {
  return n === 0 ? c.dim('0') : colorFn(String(n));
}

function main(): number {
  const args = parseArgs(process.argv.slice(2), FLAGS);
  if (args.help) {
    console.log(
      formatHelp({
        usage: 'tsx scripts/check.ts [flags]',
        description:
          'Analyze layouts for collisions, blocked openings, tight clearances and\n' +
          'circulation problems. Exits 1 if any layout has an error-severity issue.',
        specs: FLAGS,
        notes: [
          'severity: error = physically broken, warn = below a real-world minimum,',
          '          info  = worth knowing (sightlines, budget, zone balance).',
        ],
        examples: [
          'pnpm check',
          'pnpm check -- --layout studio-a --quiet',
          'pnpm check -- --json > /tmp/check.json',
        ],
      }),
    );
    return 0;
  }

  const json = args.bool('json');
  const quiet = args.bool('quiet') || json;
  const targets = resolveLayouts(args.str('layout'));

  // Analyze first, print second: if a sibling module throws we want the error
  // before we have dumped half a report to stdout.
  const analyses: { layout: Layout; result: AnalysisResult }[] = targets.map((layout) => ({
    layout,
    result: analyzeLayout(planFor(layout), layout),
  }));

  const totalErrors = analyses.reduce((n, a) => n + countBy(a.result.issues, 'error'), 0);
  const totalWarns = analyses.reduce((n, a) => n + countBy(a.result.issues, 'warn'), 0);
  const totalInfos = analyses.reduce((n, a) => n + countBy(a.result.issues, 'info'), 0);

  if (json) {
    const payload = {
      generatedAt: new Date().toISOString(),
      layoutCount: analyses.length,
      totals: { errors: totalErrors, warns: totalWarns, infos: totalInfos },
      ok: totalErrors === 0,
      layouts: analyses.map(({ layout, result }) => ({
        id: layout.id,
        name: layout.name,
        plan: layout.plan,
        description: layout.description,
        counts: {
          errors: countBy(result.issues, 'error'),
          warns: countBy(result.issues, 'warn'),
          infos: countBy(result.issues, 'info'),
        },
        stats: result.stats,
        issues: result.issues,
        notes: layout.notes ?? [],
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
    return totalErrors > 0 ? 1 : 0;
  }

  if (!quiet) {
    for (const { layout, result } of analyses) {
      console.log('');
      console.log(heading(`${layout.id} — ${layout.name}`));
      if (layout.description) console.log(c.dim(layout.description));
      console.log(formatReport(result, { color: colorEnabled }));
    }
  }

  // ------------------------------------------------------------- summary
  const rows = analyses.map(({ layout, result }) => {
    const errors = countBy(result.issues, 'error');
    const warns = countBy(result.issues, 'warn');
    const free = result.stats.interiorAreaSqft - result.stats.occupiedSqft;
    return [
      errors > 0 ? c.red(layout.id) : layout.id,
      String(result.stats.itemCount),
      freeCell(result),
      `${free.toFixed(0)} ft²`,
      pathCell(result),
      countCell(errors, c.red),
      countCell(warns, c.yellow),
      budgetCell(layout, result),
    ];
  });

  console.log('');
  console.log(heading('summary'));
  console.log(
    renderTable(
      [
        { header: 'LAYOUT' },
        { header: 'ITEMS', align: 'right' },
        { header: 'FREE %', align: 'right' },
        { header: 'FREE AREA', align: 'right' },
        { header: 'NARROWEST', align: 'right' },
        { header: 'ERR', align: 'right' },
        { header: 'WARN', align: 'right' },
        { header: 'BUDGET', align: 'right' },
      ],
      rows,
      { indent: '  ' },
    ),
  );

  const interior = analyses[0]?.result.stats.interiorAreaSqft;
  console.log('');
  console.log(
    c.dim(
      `  ${analyses.length} layout${analyses.length === 1 ? '' : 's'}` +
        (interior !== undefined ? ` · ${interior.toFixed(0)} ft² interior` : '') +
        ` · walkway min ${formatShort(CLEARANCE.walkway)} (tight ${formatShort(
          CLEARANCE.walkwayTight,
        )})`,
    ),
  );

  if (totalErrors > 0) {
    console.log(
      `  ${c.red(`${totalErrors} error${totalErrors === 1 ? '' : 's'}`)}, ` +
        `${totalWarns} warning${totalWarns === 1 ? '' : 's'}, ${totalInfos} info`,
    );
    console.log(c.dim('  fix the errors above, then re-run: pnpm check'));
    return 1;
  }

  console.log(
    `  ${c.green('no errors')}, ${totalWarns} warning${
      totalWarns === 1 ? '' : 's'
    }, ${totalInfos} info`,
  );
  console.log(c.dim('  next: pnpm svg   (2D plans)   ·   pnpm render   (PNG renders)'));
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  process.exitCode = reportError(err);
}
