/**
 * Shared CLI plumbing for the three agent-facing scripts
 * (check.ts / export-svg.ts / render.ts).
 *
 * These scripts are the *only* interface an AI designer has to this project:
 * it edits a layout, runs a script, and reads the text/PNG that comes back.
 * So everything in here is optimised for one thing: when something goes wrong,
 * the message on stdout must be enough to fix it without reading the source.
 *
 * Deliberately dependency-free (node builtins only) so it can be imported by
 * any script without pulling vite/playwright into the process.
 */

import fs from 'node:fs';
import path from 'node:path';

import { getPlan } from '@/core/plan';
import { layoutList, layouts } from '@/layouts/index';
import type { FloorPlan, Layout } from '@/core/types';

// ---------------------------------------------------------------- errors

/**
 * An error that is the *user's* fault (bad flag, unknown layout id) rather
 * than a bug. Printed as a clean one-liner with no stack trace.
 */
export class CliError extends Error {
  readonly exitCode: number;
  /** extra lines printed under the message (valid values, hints, ...) */
  readonly details: string[];

  constructor(message: string, opts: { details?: string[]; exitCode?: number } = {}) {
    super(message);
    this.name = 'CliError';
    this.details = opts.details ?? [];
    this.exitCode = opts.exitCode ?? 1;
  }
}

/** Throw a CliError. Return type is `never` so it can be used in expressions. */
export function die(message: string, details?: string[]): never {
  throw new CliError(message, { details });
}

/**
 * Print any thrown value in the most useful form available and return the
 * exit code the process should use. Every script funnels its catch here.
 */
export function reportError(err: unknown): number {
  if (err instanceof CliError) {
    process.stderr.write(`${c.red('error')} ${err.message}\n`);
    for (const line of err.details) process.stderr.write(`  ${c.dim(line)}\n`);
    return err.exitCode;
  }
  const e = err instanceof Error ? err : new Error(String(err));
  process.stderr.write(`${c.red('error')} ${e.message}\n`);
  if (e.stack) {
    // Keep the stack: an unexpected throw here is a bug in a sibling module
    // and the agent reading this output needs the frame that failed.
    process.stderr.write(`${c.dim(e.stack.split('\n').slice(1).join('\n'))}\n`);
  }
  const cause = (e as { cause?: unknown }).cause;
  if (cause) process.stderr.write(`${c.dim(`caused by: ${String(cause)}`)}\n`);
  return 1;
}

// ---------------------------------------------------------------- colors

/**
 * Colour is enabled only for a real terminal. Redirecting to a file, piping
 * into another tool, or an agent capturing stdout all end up with clean text.
 * Honours the NO_COLOR convention (any non-empty value disables) and
 * FORCE_COLOR for the opposite case.
 */
export const colorEnabled: boolean = (() => {
  const no = process.env.NO_COLOR;
  if (no !== undefined && no !== '') return false;
  const force = process.env.FORCE_COLOR;
  if (force !== undefined && force !== '' && force !== '0') return true;
  return Boolean(process.stdout.isTTY);
})();

const sgr = (open: number, close: number) => (s: string): string =>
  colorEnabled ? `\u001b[${open}m${s}\u001b[${close}m` : s;

/** ANSI helpers that no-op when colour is disabled. */
export const c = {
  bold: sgr(1, 22),
  dim: sgr(2, 22),
  italic: sgr(3, 23),
  underline: sgr(4, 24),
  inverse: sgr(7, 27),
  red: sgr(31, 39),
  green: sgr(32, 39),
  yellow: sgr(33, 39),
  blue: sgr(34, 39),
  magenta: sgr(35, 39),
  cyan: sgr(36, 39),
  gray: sgr(90, 39),
  /** identity, so call sites can pick a "no colour" formatter uniformly */
  plain: (s: string): string => s,
} as const;

const ANSI_RE = /\u001b\[[0-9;]*m/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

/** Printable width, ignoring escape codes (used for table padding). */
export function visibleWidth(s: string): number {
  return stripAnsi(s).length;
}

function padVisible(s: string, width: number, align: 'left' | 'right'): string {
  const pad = ' '.repeat(Math.max(0, width - visibleWidth(s)));
  return align === 'right' ? pad + s : s + pad;
}

// ----------------------------------------------------------------- output

/** A section heading, e.g. `── layout: sofa-north ──────────` */
export function heading(text: string, width = 72): string {
  const label = ` ${text} `;
  const dashes = Math.max(3, width - label.length - 2);
  return c.bold(`──${label}${'─'.repeat(dashes)}`);
}

export interface TableColumn {
  header: string;
  align?: 'left' | 'right';
}

/**
 * Fixed-width text table. Cells may already contain ANSI colour; widths are
 * computed on visible width so colour never breaks the alignment.
 */
export function renderTable(
  cols: TableColumn[],
  rows: string[][],
  opts: { indent?: string; rule?: boolean } = {},
): string {
  const indent = opts.indent ?? '';
  const widths = cols.map((col, i) =>
    Math.max(visibleWidth(col.header), ...rows.map((r) => visibleWidth(r[i] ?? ''))),
  );
  const line = (cells: string[]): string =>
    indent +
    cells
      .map((cell, i) => padVisible(cell, widths[i] ?? 0, cols[i]?.align ?? 'left'))
      .join('  ')
      .replace(/\s+$/, '');

  const out: string[] = [line(cols.map((col) => c.bold(col.header)))];
  if (opts.rule !== false) {
    out.push(indent + widths.map((w) => c.dim('─'.repeat(w))).join('  '));
  }
  for (const row of rows) out.push(line(row));
  return out.join('\n');
}

/** 12345 -> "12.1 KB". Used when reporting written files. */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 1234 -> "1,234" (used for prices and pixel counts). */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Milliseconds -> "0.8s" / "12.3s". */
export function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Path relative to cwd when that is shorter/clearer, otherwise absolute. */
export function relPath(p: string): string {
  const rel = path.relative(process.cwd(), p);
  return rel && !rel.startsWith('..') ? rel : p;
}

// -------------------------------------------------------------------- fs

/** mkdir -p, returns the (absolute) directory for chaining. */
export function ensureDir(dir: string): string {
  const abs = path.resolve(dir);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

// ------------------------------------------------------------ argv parser

export type FlagKind = 'string' | 'number' | 'boolean';

export interface FlagSpec {
  kind: FlagKind;
  /** single-character short form, without the dash */
  alias?: string;
  /** applied when the flag is absent from argv */
  default?: string | number | boolean;
  /** placeholder shown in --help, e.g. "<id|all>" */
  value?: string;
  describe: string;
}

export type FlagSpecs = Record<string, FlagSpec>;

export interface Args {
  /** resolved values, defaults already applied */
  readonly flags: Readonly<Record<string, string | number | boolean | undefined>>;
  readonly positionals: readonly string[];
  readonly help: boolean;
  /** the exact tokens we were given, for echoing back in output */
  readonly argv: readonly string[];
  str(name: string): string | undefined;
  num(name: string): number | undefined;
  bool(name: string): boolean;
  /** true when the flag was actually present on the command line */
  given(name: string): boolean;
}

function parseBoolWord(name: string, raw: string): boolean {
  const v = raw.toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  throw new CliError(`--${name} expects a boolean, got ${JSON.stringify(raw)}`, {
    details: ['use --' + name + ' / --no-' + name + ', or =true / =false'],
  });
}

/** Cheap Levenshtein, only used to say "did you mean". */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return prev[n] ?? Math.max(m, n);
}

/** The closest candidate within a sane distance, or undefined. */
export function closest(input: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  for (const cand of candidates) {
    const score = editDistance(input.toLowerCase(), cand.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  // Allow roughly a third of the word to be wrong before we stop guessing.
  // Very short inputs ("c", "2d") are excluded: every candidate is "close" to
  // them and a wrong guess is worse than no guess.
  if (best === undefined || input.length < 3) return undefined;
  return bestScore <= Math.max(2, Math.ceil(best.length / 3)) ? best : undefined;
}

/**
 * Parse `argv` (already sliced past node/script) against `specs`.
 *
 * Supported forms:
 *   --flag value    --flag=value    -f value    -f=value
 *   --flag          (boolean -> true)
 *   --no-flag       (boolean -> false)
 *   --flag=false    (boolean -> false)
 *   --help / -h     (sets .help; caller prints usage and exits 0)
 *   --              everything after is a positional
 *
 * Unknown flags are a hard error: silently ignoring a typo'd flag is how you
 * spend ten minutes wondering why --theme dark did nothing.
 */
export function parseArgs(argv: readonly string[], specs: FlagSpecs): Args {
  const flags: Record<string, string | number | boolean | undefined> = {};
  const given = new Set<string>();
  const positionals: string[] = [];
  let help = false;

  for (const [name, spec] of Object.entries(specs)) {
    flags[name] = spec.default;
  }

  const names = Object.keys(specs);
  const byAlias = new Map<string, string>();
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.alias) byAlias.set(spec.alias, name);
  }

  const tokens = [...argv];
  let onlyPositionals = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as string;

    if (onlyPositionals) {
      positionals.push(token);
      continue;
    }
    if (token === '--') {
      onlyPositionals = true;
      continue;
    }
    if (token === '--help' || token === '-h' || token === '-?') {
      help = true;
      continue;
    }

    const isLong = token.startsWith('--');
    const isShort = !isLong && token.startsWith('-') && token.length > 1;

    if (!isLong && !isShort) {
      positionals.push(token);
      continue;
    }

    const body = isLong ? token.slice(2) : token.slice(1);
    const eq = body.indexOf('=');
    const rawName = eq === -1 ? body : body.slice(0, eq);
    const inline = eq === -1 ? undefined : body.slice(eq + 1);

    const name = isShort ? byAlias.get(rawName) : rawName;
    // `--no-thing` turns a boolean off. Checked before the unknown-flag error so
    // that --no-issues works without needing its own spec entry.
    if (isLong && specs[rawName] === undefined && rawName.startsWith('no-')) {
      const negated = rawName.slice(3);
      if (specs[negated]?.kind === 'boolean') {
        flags[negated] = false;
        given.add(negated);
        continue;
      }
    }

    const spec = name === undefined ? undefined : specs[name];
    if (name === undefined || spec === undefined) {
      // Silently ignoring a typo'd flag is how you spend ten minutes wondering
      // why --theme dark did nothing. Fail loudly, with the valid names.
      const guess = closest(rawName, names);
      throw new CliError(`unknown flag ${token}`, {
        details: [
          ...(guess ? [`did you mean --${guess}?`] : []),
          `known flags: ${names.map((n) => `--${n}`).join(' ')}`,
          'run with --help for the full list',
        ],
      });
    }

    if (spec.kind === 'boolean') {
      flags[name] = inline === undefined ? true : parseBoolWord(name, inline);
      given.add(name);
      continue;
    }

    let raw = inline;
    if (raw === undefined) {
      const next = tokens[i + 1];
      // A value is missing if there is no next token, or the next token looks
      // like another flag (a negative number is still a value).
      const looksLikeFlag =
        next !== undefined && next.startsWith('-') && !/^-?\d/.test(next.slice(1));
      if (next === undefined || looksLikeFlag) {
        throw new CliError(`--${name} needs a value${spec.value ? ` ${spec.value}` : ''}`, {
          details: [spec.describe],
        });
      }
      raw = next;
      i++;
    }

    if (spec.kind === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        throw new CliError(`--${name} expects a number, got ${JSON.stringify(raw)}`, {
          details: [spec.describe],
        });
      }
      flags[name] = n;
    } else {
      flags[name] = raw;
    }
    given.add(name);
  }

  return {
    flags,
    positionals,
    help,
    argv: [...argv],
    str(nameToRead) {
      const v = flags[nameToRead];
      return v === undefined ? undefined : String(v);
    },
    num(nameToRead) {
      const v = flags[nameToRead];
      if (v === undefined || v === '' || typeof v === 'boolean') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    },
    bool(nameToRead) {
      return flags[nameToRead] === true;
    },
    given(nameToRead) {
      return given.has(nameToRead);
    },
  };
}

export interface HelpOpts {
  usage: string;
  description?: string;
  specs: FlagSpecs;
  examples?: string[];
  notes?: string[];
}

/** Render a --help screen from the same specs the parser uses. */
export function formatHelp(opts: HelpOpts): string {
  const out: string[] = [];
  out.push(`${c.bold('usage:')} ${opts.usage}`);
  if (opts.description) out.push('', opts.description);

  const entries = Object.entries(opts.specs);
  if (entries.length) {
    out.push('', c.bold('flags:'));
    const left = entries.map(([name, spec]) => {
      const alias = spec.alias ? `-${spec.alias}, ` : '    ';
      const value =
        spec.kind === 'boolean' ? '' : ` ${spec.value ?? `<${spec.kind}>`}`;
      return `${alias}--${name}${value}`;
    });
    const width = Math.max(...left.map((s) => s.length));
    entries.forEach(([name, spec], i) => {
      const def =
        spec.default === undefined || spec.default === false
          ? ''
          : c.dim(` (default: ${String(spec.default)})`);
      const neg = spec.kind === 'boolean' && spec.default === true ? c.dim(` [--no-${name}]`) : '';
      out.push(`  ${(left[i] as string).padEnd(width)}  ${spec.describe}${def}${neg}`);
    });
    out.push(`  ${'-h, --help'.padEnd(width)}  show this help`);
  }

  if (opts.notes?.length) out.push('', c.bold('notes:'), ...opts.notes.map((n) => `  ${n}`));
  if (opts.examples?.length) {
    out.push('', c.bold('examples:'), ...opts.examples.map((e) => `  ${c.cyan(e)}`));
  }
  return out.join('\n');
}

/**
 * Validate a flag value against a closed set of choices, with a real error
 * message instead of silently falling back to a default.
 */
export function parseChoice<T extends string>(
  flag: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback?: T,
): T {
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new CliError(`--${flag} is required`, { details: [`one of: ${allowed.join(', ')}`] });
  }
  const v = value.trim().toLowerCase();
  const hit = allowed.find((a) => a.toLowerCase() === v);
  if (hit) return hit;
  const guess = closest(v, allowed);
  throw new CliError(`--${flag} ${JSON.stringify(value)} is not valid`, {
    details: [...(guess ? [`did you mean ${guess}?`] : []), `one of: ${allowed.join(', ')}`],
  });
}

/** Split a comma / whitespace separated flag value into trimmed, non-empty parts. */
export function splitList(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// --------------------------------------------------------------- layouts

/** Every layout id the catalog of layouts knows about, in declaration order. */
export function layoutIds(): string[] {
  return layoutList.map((l) => l.id);
}

/**
 * Map a --layout flag onto real Layout objects.
 *
 * Accepts `all` (or an empty/omitted value), a single id, or a comma list.
 * Order and duplicates follow the user's input (deduped) so
 * `--layout b,a` renders b first, which is handy when iterating on one idea.
 */
export function resolveLayouts(arg: string | undefined): Layout[] {
  const ids = layoutIds();
  if (ids.length === 0) {
    die('no layouts are defined', [
      'src/layouts/index.ts exports an empty `layouts` record',
      'add a Layout there before running this script',
    ]);
  }

  const raw = (arg ?? 'all').trim();
  if (raw === '' || raw.toLowerCase() === 'all' || raw === '*') return [...layoutList];

  const wanted = splitList(raw);
  const seen = new Set<string>();
  const out: Layout[] = [];

  for (const token of wanted) {
    if (token.toLowerCase() === 'all' || token === '*') {
      for (const layout of layoutList) {
        if (!seen.has(layout.id)) {
          seen.add(layout.id);
          out.push(layout);
        }
      }
      continue;
    }
    const layout = layouts[token];
    if (!layout) {
      const guess = closest(token, ids);
      die(`unknown layout ${JSON.stringify(token)}`, [
        ...(guess ? [`did you mean ${guess}?`] : []),
        `valid ids (${ids.length}): ${ids.join(', ')}`,
        'or pass --layout all',
      ]);
    }
    if (!seen.has(layout.id)) {
      seen.add(layout.id);
      out.push(layout);
    }
  }
  return out;
}

/**
 * The FloorPlan a Layout is authored against. Layout.plan is a FloorPlan.id;
 * a mismatch here means the layout references a plan that does not exist,
 * which is worth a clear message rather than an undefined deref later.
 */
export function planFor(layout: Layout): FloorPlan {
  try {
    return getPlan(layout.plan);
  } catch (err) {
    throw new CliError(
      `layout ${JSON.stringify(layout.id)} references unknown plan ${JSON.stringify(layout.plan)}`,
      { details: [err instanceof Error ? err.message : String(err)] },
    );
  }
}
