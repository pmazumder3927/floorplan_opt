/**
 * Capture-mode plumbing.
 *
 * The headless PNG renderer (scripts/render.ts) drives this app with a plain
 * URL and then waits for `window.__READY__`. That contract has to be boring and
 * unbreakable, so everything about it lives here:
 *
 *   - parseCaptureConfig(): URL query  ->  a fully-defaulted, typed config.
 *     Parsing is deliberately tolerant (missing, empty, misspelled and
 *     differently-cased values all fall back to a sane default) because a
 *     screenshot job must never die on a query string.
 *   - signalReady(): the one and only "the pixels are on screen" signal.
 *
 * There is NO React and NO DOM rendering in this file so it can also be
 * imported by tooling that just wants to build a capture URL.
 */

import type { CameraPreset, ViewMode } from '@/core/types';

/** The 2D/3D palette selector. Mirrors Render2DOptions['theme']. */
export type PlanTheme = 'light' | 'dark' | 'blueprint';

/** Every camera the 3D view understands, in the order the UI should list them. */
export const CAMERA_PRESETS: readonly CameraPreset[] = [
  'top',
  'iso-nw',
  'iso-ne',
  'iso-sw',
  'iso-se',
  'eye-entry',
  'eye-kitchen',
  'eye-window',
  'eye-hero',
  'eye-living',
];

/** Short human labels for the camera buttons (the preset ids are terse). */
export const CAMERA_LABELS: Record<CameraPreset, string> = {
  top: 'Top',
  'iso-nw': 'Iso NW',
  'iso-ne': 'Iso NE',
  'iso-sw': 'Iso SW',
  'iso-se': 'Iso SE',
  'eye-entry': 'Eye: entry',
  'eye-kitchen': 'Eye: kitchen',
  'eye-window': 'Eye: windows',
  'eye-hero': 'Eye: hero',
  'eye-living': 'Eye: living',
};

export const PLAN_THEMES: readonly PlanTheme[] = ['light', 'dark', 'blueprint'];

/** Scale limits for the interactive zoom slider, in pixels per foot. */
export const SCALE_MIN = 12;
export const SCALE_MAX = 60;
/**
 * The capture path allows a wider range than the slider: a poster-size PNG of
 * the whole plan wants far more than 60 px/ft, and a thumbnail far less.
 */
const CAPTURE_SCALE_MIN = 2;
const CAPTURE_SCALE_MAX = 400;

/** Default drawing scale. 24 px/ft ~= 1/2" = 1'-0" on a 96 dpi screen. */
export const DEFAULT_SCALE = 24;

export interface CaptureConfig {
  /** true when ?capture=1 — render one view, full bleed, no chrome. */
  capture: boolean;
  /**
   * Requested layout id. Empty string means "whatever the first layout is",
   * which keeps this module free of a dependency on src/layouts.
   */
  layout: string;
  view: ViewMode;
  camera: CameraPreset;
  /** pixels per foot for the 2D view */
  scale: number;
  theme: PlanTheme;
  showIssues: boolean;
  showDimensions: boolean;
  showLabels: boolean;
  showClearances: boolean;
  showZones: boolean;
  showGrid: boolean;
  /** explicit pixel size for the capture surface; undefined = fill the viewport */
  w?: number;
  h?: number;
}

// ------------------------------------------------------------------ parsing

const TRUE_WORDS = new Set(['1', 'true', 'yes', 'y', 'on', '']);
const FALSE_WORDS = new Set(['0', 'false', 'no', 'n', 'off', 'none']);

/** `?flag`, `?flag=1`, `?flag=true` are all on; `?flag=0` is off. */
function readBool(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback;
  const v = raw.trim().toLowerCase();
  if (TRUE_WORDS.has(v)) return true;
  if (FALSE_WORDS.has(v)) return false;
  return fallback;
}

function readNumber(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const n = Number.parseFloat(raw.trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Positive integer pixel count, or undefined when absent/nonsense. */
function readPixels(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  // 8000 px is well past anything chromium will screenshot at dsf 2.
  return Math.min(8000, n);
}

function readView(raw: string | null, fallback: ViewMode): ViewMode {
  if (raw === null) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === '2d' || v === '2' || v === 'plan' || v === 'svg') return '2d';
  if (v === '3d' || v === '3' || v === 'three' || v === 'iso') return '3d';
  return fallback;
}

function readCamera(raw: string | null, fallback: CameraPreset): CameraPreset {
  if (raw === null) return fallback;
  const v = raw.trim().toLowerCase().replace(/[_\s]+/g, '-');
  const exact = CAMERA_PRESETS.find((c) => c === v);
  if (exact) return exact;
  // Tolerate the shorthands a human would type: `ne`, `entry`, `kitchen`.
  const prefixed = CAMERA_PRESETS.find((c) => c === `iso-${v}` || c === `eye-${v}`);
  if (prefixed) return prefixed;
  return fallback;
}

function readTheme(raw: string | null, fallback: PlanTheme): PlanTheme {
  if (raw === null) return fallback;
  const v = raw.trim().toLowerCase();
  const hit = PLAN_THEMES.find((t) => t === v);
  if (hit) return hit;
  if (v === 'bp' || v === 'blue') return 'blueprint';
  return fallback;
}

/**
 * Parse a query string into a config.
 *
 * Overlay defaults differ between the two modes on purpose:
 *   - interactive lab: annotations on, because a human is reading the drawing;
 *   - capture: annotations OFF unless the CLI explicitly asked for them
 *     (scripts/render.ts has --issues / --dims / --labels flags, and a flag
 *     that cannot turn anything on is a useless flag).
 * The construction grid is on in both modes — it is part of the drawing
 * surface, not an annotation — and can still be switched off with `grid=0`.
 */
export function parseCaptureConfig(search?: string): CaptureConfig {
  const raw =
    search ?? (typeof window !== 'undefined' && window.location ? window.location.search : '');
  const q = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);

  const capture = readBool(q.get('capture'), false);
  const annotationDefault = !capture;

  return {
    capture,
    layout: (q.get('layout') ?? '').trim(),
    view: readView(q.get('view'), '2d'),
    camera: readCamera(q.get('camera'), 'iso-ne'),
    scale: readNumber(
      q.get('scale'),
      DEFAULT_SCALE,
      capture ? CAPTURE_SCALE_MIN : SCALE_MIN,
      capture ? CAPTURE_SCALE_MAX : SCALE_MAX,
    ),
    theme: readTheme(q.get('theme'), 'light'),
    showIssues: readBool(q.get('issues'), annotationDefault),
    showDimensions: readBool(q.get('dims'), annotationDefault),
    showLabels: readBool(q.get('labels'), annotationDefault),
    showClearances: readBool(q.get('clearances'), false),
    showZones: readBool(q.get('zones'), annotationDefault),
    showGrid: readBool(q.get('grid'), true),
    w: readPixels(q.get('w')),
    h: readPixels(q.get('h')),
  };
}

/**
 * Build the query string for a capture URL from the current lab state, so the
 * UI can hand a human (or an agent) the exact URL the renderer would use.
 * Booleans are always written explicitly — never rely on defaults in a URL you
 * are going to paste somewhere.
 */
export function buildCaptureQuery(config: Partial<CaptureConfig>): string {
  const q = new URLSearchParams();
  q.set('capture', '1');
  if (config.layout) q.set('layout', config.layout);
  q.set('view', config.view ?? '2d');
  if ((config.view ?? '2d') === '3d') q.set('camera', config.camera ?? 'iso-ne');
  else q.set('scale', String(Math.round(config.scale ?? DEFAULT_SCALE)));
  q.set('theme', config.theme ?? 'light');
  q.set('grid', config.showGrid ? '1' : '0');
  q.set('dims', config.showDimensions ? '1' : '0');
  q.set('labels', config.showLabels ? '1' : '0');
  q.set('zones', config.showZones ? '1' : '0');
  q.set('clearances', config.showClearances ? '1' : '0');
  q.set('issues', config.showIssues ? '1' : '0');
  if (config.w) q.set('w', String(Math.round(config.w)));
  if (config.h) q.set('h', String(Math.round(config.h)));
  return `?${q.toString()}`;
}

// ------------------------------------------------------------ ready signal

declare global {
  interface Window {
    /** Set to true exactly once, after the requested view has actually painted. */
    __READY__?: boolean;
  }
}

/**
 * Tell the outside world the view is painted and safe to screenshot.
 *
 * Idempotent: calling it twice is a no-op, which also means a stray double
 * invocation (React StrictMode, a remount) cannot produce two 'capture-ready'
 * events. main.tsx additionally skips StrictMode in capture mode.
 */
export function signalReady(): void {
  if (typeof window === 'undefined') return;
  if (window.__READY__ === true) return;
  window.__READY__ = true;
  // A DOM attribute as well as the flag: playwright can wait on either, and it
  // makes "did it get there?" visible when debugging by hand.
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.ready = '1';
  }
  window.dispatchEvent(new Event('capture-ready'));
}
