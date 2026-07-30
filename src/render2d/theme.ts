/**
 * Drawing palette + line weights for the 2D architectural plan.
 *
 * WHY a theme object instead of hard-coded colors: the same renderer has to
 * produce (a) a light "printed sheet" drawing, (b) a dark UI drawing, and
 * (c) a blueprint (white lines on a deep blue ground). Every colour and every
 * line weight the renderer needs lives here so svg.ts contains geometry only.
 *
 * Line weights are in POINTS (== px at the SVG's 1:1 user unit, which is what
 * the renderer emits). They follow real drafting practice: the wall poché
 * outline is the heaviest line, fixture/furniture outlines are medium, and
 * annotation (grid, dimensions, swings, hatch) is hairline.
 */

import type { ZoneType } from '@/core/types';

export interface PlanTheme {
  /** id of this theme */
  name: 'light' | 'dark' | 'blueprint';
  /** the sheet outside the drawing area */
  sheet: string;
  /** the drawing "paper" — also used to plug openings so they read as holes */
  paper: string;
  /** sheet border / title-block rules */
  frame: string;
  /** floor inside the building footprint */
  floor: string;

  /** 1 ft grid */
  grid: string;
  /** every 5th grid line */
  gridMajor: string;

  /** solid wall poché fill (dark on light themes, light on dark/blueprint) */
  wallFill: string;
  /** wall outline — the heaviest line on the drawing */
  wallStroke: string;

  /** glazing tint + the double glass line */
  glass: string;
  /** sill / jamb / threshold lines */
  sill: string;
  /** door leaf + swing arc */
  swing: string;

  /** built-in fixture body */
  fixtureFill: string;
  /** built-in fixture outline + symbol linework */
  fixtureStroke: string;

  /** outline drawn around every placed furniture item (its fill comes from the catalog) */
  furnitureStroke: string;
  /**
   * How opaque catalog colours are allowed to be. 1 for the light/dark sheets;
   * low for blueprint, where solid colour would destroy the monochrome look.
   */
  furnitureFillAlpha: number;

  text: string;
  textMuted: string;

  /** dimension lines, witness lines, ticks and their text */
  dimLine: string;

  /** very low-alpha zone washes, one per ZoneType */
  zoneTints: Record<ZoneType, string>;

  issueError: string;
  issueWarn: string;
  /** clearance hatch */
  clearance: string;
  /** selection highlight (used by Plan2D's CSS) */
  accent: string;
}

/** Zone washes for the light sheet. Muted, printerly hues — see zoneAlpha. */
const LIGHT_ZONES: Record<ZoneType, string> = {
  living: '#d8a06a',
  kitchen: '#6fae86',
  bath: '#5fa6c4',
  bedroom: '#a88fc4',
  dining: '#d18b78',
  work: '#7f97cf',
  circulation: '#b9b2a2',
  storage: '#a6987e',
};

const DARK_ZONES: Record<ZoneType, string> = {
  living: '#f0b877',
  kitchen: '#7fd3a2',
  bath: '#74c9ec',
  bedroom: '#c3a3e0',
  dining: '#f0a48c',
  work: '#9ab4f2',
  circulation: '#cfc8b8',
  storage: '#cdb894',
};

const BLUE_ZONES: Record<ZoneType, string> = {
  living: '#bfe0ff',
  kitchen: '#a8e8c8',
  bath: '#9fd8f5',
  bedroom: '#d3c4ff',
  dining: '#ffd0bd',
  work: '#b9c9ff',
  circulation: '#e2ecfb',
  storage: '#ffe6b8',
};

export const THEMES: Record<'light' | 'dark' | 'blueprint', PlanTheme> = {
  /** Warm white paper, near-black poché — a printed construction sheet. */
  light: {
    name: 'light',
    sheet: '#ffffff',
    paper: '#fbfaf6',
    frame: '#cdc7ba',
    floor: '#ffffff',
    grid: '#eae5d9',
    gridMajor: '#d7d0be',
    wallFill: '#2c3134',
    wallStroke: '#101416',
    glass: '#5f9fbe',
    sill: '#54626a',
    swing: '#98a2a8',
    fixtureFill: '#f0f2f2',
    fixtureStroke: '#5a666c',
    furnitureStroke: '#39424a',
    furnitureFillAlpha: 1,
    text: '#1a2023',
    textMuted: '#79848a',
    dimLine: '#7a6a52',
    zoneTints: LIGHT_ZONES,
    issueError: '#c0392b',
    issueWarn: '#c1830f',
    clearance: '#2f7fbf',
    accent: '#0f7fd4',
  },

  /** Dark UI sheet. Poché inverts to light so the walls still read as solid. */
  dark: {
    name: 'dark',
    sheet: '#101316',
    paper: '#181c20',
    frame: '#2f363c',
    floor: '#1e2429',
    grid: '#242b31',
    gridMajor: '#333c43',
    wallFill: '#c6ccd1',
    wallStroke: '#eef2f5',
    glass: '#6ec3e8',
    sill: '#9dafb9',
    swing: '#6c777f',
    fixtureFill: '#232a2f',
    fixtureStroke: '#8e9aa1',
    furnitureStroke: '#0c1013',
    furnitureFillAlpha: 1,
    text: '#e9eef1',
    textMuted: '#8b959b',
    dimLine: '#9aa7ae',
    zoneTints: DARK_ZONES,
    issueError: '#ff6f60',
    issueWarn: '#ffc24a',
    clearance: '#5cb4e8',
    accent: '#4db2ff',
  },

  /** Classic blueprint: white linework burned into a deep blue ground. */
  blueprint: {
    name: 'blueprint',
    sheet: '#0a2149',
    paper: '#0f2d5c',
    frame: '#6d92c9',
    floor: '#123566',
    grid: '#1b4079',
    gridMajor: '#2b5892',
    wallFill: '#eaf2ff',
    wallStroke: '#ffffff',
    glass: '#a8dcf7',
    sill: '#d3e4fa',
    swing: '#8fb2df',
    fixtureFill: '#164079',
    fixtureStroke: '#dbe8fb',
    furnitureStroke: '#ffffff',
    // Catalog colours are washed almost out: blueprints are monochrome.
    furnitureFillAlpha: 0.16,
    text: '#ffffff',
    textMuted: '#accbf0',
    dimLine: '#cfe1f7',
    zoneTints: BLUE_ZONES,
    issueError: '#ff9184',
    issueWarn: '#ffd479',
    clearance: '#a8dcf7',
    accent: '#8fd8ff',
  },
};

/**
 * Line weights in points (1 pt == 1 SVG user unit here).
 * Drafting hierarchy: wall > fixture/furniture > annotation > hairline.
 */
export const STROKE = {
  hairline: 0.5,
  grid: 0.5,
  gridMajor: 0.85,
  zone: 0.9,
  /** wall poché outline (the fattest line on the sheet) */
  wall: 1.5,
  /** jamb / face lines carried across an opening */
  jamb: 0.9,
  glass: 0.9,
  sill: 1.2,
  swing: 0.75,
  leaf: 1.6,
  fixture: 1.05,
  fixtureDetail: 0.7,
  furniture: 1.15,
  furnitureDetail: 0.65,
  dim: 0.7,
  dimTick: 1.1,
  witness: 0.55,
  leader: 0.6,
  frame: 1.1,
  clearance: 0.8,
  issue: 1.3,
  selected: 2.6,
} as const;

/** Alpha for the zone washes — deliberately barely-there. */
export const ZONE_ALPHA = 0.13;

/** UI/label stack: no webfonts, so headless chromium renders it identically. */
export const FONT =
  "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', ui-sans-serif, sans-serif";

/** Dimensions and numbers read better tabular. */
export const FONT_MONO =
  "'SFMono-Regular', 'DejaVu Sans Mono', Menlo, Consolas, ui-monospace, monospace";

/** Type sizes in px at 1:1. */
export const FONT_SIZE = {
  title: 18,
  subtitle: 10.5,
  block: 9,
  zone: 11,
  zoneSub: 8.5,
  item: 10.5,
  itemSub: 8.8,
  itemMin: 6.6,
  fixture: 8.4,
  dim: 9.4,
  legend: 9.8,
  tiny: 7.6,
} as const;

/**
 * Per-character advance widths as a fraction of the font size, used to decide
 * whether a label fits inside a shape without a DOM to measure with.
 * Calibrated roughly against Helvetica.
 */
const NARROW = new Set("iljtIfr1.,:;'\"|!()[]-/ ".split(''));
const WIDE = new Set('mwMWQ@#%&'.split(''));

export function textWidth(str: string, fontSize: number): number {
  let units = 0;
  for (const ch of str) {
    if (NARROW.has(ch)) units += 0.31;
    else if (WIDE.has(ch)) units += 0.84;
    else if (ch >= 'A' && ch <= 'Z') units += 0.66;
    else if (ch >= '0' && ch <= '9') units += 0.56;
    else units += 0.52;
  }
  return units * fontSize;
}

/** Cap height used for vertical fitting of a single text line. */
export const LINE_HEIGHT = 1.18;
