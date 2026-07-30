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

  /**
   * The glazing PLANE line. Reference-matched: the real assemblies are black
   * anodised aluminium (data/reference/unit-photo-living-west.jpeg), so on the
   * light sheet this is near-black, not the sky-blue a "window" usually gets.
   */
  glass: string;
  /**
   * Low-alpha wash across the thickness of a glazed opening. Separate from
   * `glass` because the frame reads DARK while the light coming through reads
   * PALE — using one colour for both makes a full-height slider look like a
   * shadow instead of a window.
   */
  glassTint: string;
  /**
   * Aluminium frame / mullion / slider track ink. Part of the building fabric,
   * so it wants the weight of the wall linework rather than of the annotation.
   */
  mullion: string;
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

/**
 * REFERENCE-MATCHED PALETTE — data/reference/unit-photo-living-west.jpeg.
 *
 * The photo of the real unit fixes four things that the generic "architectural
 * sheet" palette got wrong, and every theme below is tuned to them:
 *
 *   FLOOR    dark wide-plank walnut, satin. The floor is the single most
 *            recognisable surface in the photo, so the footprint fill carries a
 *            warm walnut tint on every theme (a warm WASH on the light sheet, a
 *            genuinely dark espresso on the dark one). It stays a tint rather
 *            than the real espresso brown on the light sheet for one reason:
 *            this is a working construction drawing and a 20%-value floor kills
 *            the line-weight hierarchy on top of it.
 *   GLAZING  black anodised aluminium, slim mullions, floor-to-ceiling. So the
 *            glazing ink is the DARKEST thing on the light sheet after the wall
 *            poché — see `glass` / `mullion` — with a pale daylight wash
 *            (`glassTint`) inside the frame for the light coming through.
 *   WALLS    flat smooth white. Paper and the interior stay near-white; the
 *            zone washes are the only colour on the floor.
 *   CEILING  exposed structural concrete. The wall poché moves off near-black
 *            onto a cool concrete grey, which is what you would actually be
 *            cutting through.
 */

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
  /**
   * Printed construction sheet: white walls on warm paper, concrete-grey poché,
   * a walnut wash on the floor and black-anodised glazing.
   */
  light: {
    name: 'light',
    sheet: '#ffffff',
    paper: '#fbf9f5',
    frame: '#c9c1b2',
    // Walnut wash. Held at ~88% value so 0.5 pt hairlines still read on it.
    floor: '#eee0cf',
    grid: '#e0cfb9',
    gridMajor: '#cdb79b',
    // Exposed concrete, not ink-black: this is the material being cut.
    wallFill: '#3b4144',
    wallStroke: '#12171a',
    // Black anodised aluminium.
    glass: '#161d21',
    glassTint: '#b8d0dc',
    mullion: '#0e1315',
    sill: '#33403f',
    swing: '#9aa3a7',
    // Pale stone counter / white appliance fronts.
    fixtureFill: '#f4f2ec',
    fixtureStroke: '#556169',
    furnitureStroke: '#39424a',
    furnitureFillAlpha: 1,
    text: '#191f22',
    textMuted: '#76817f',
    dimLine: '#7d6a4e',
    zoneTints: LIGHT_ZONES,
    issueError: '#c0392b',
    issueWarn: '#c1830f',
    clearance: '#2f7fbf',
    accent: '#0f7fd4',
  },

  /**
   * Dark UI sheet. Poché inverts to concrete-light so the walls still read as
   * solid, and the floor is allowed to be the real espresso walnut here — on a
   * dark ground a dark floor costs nothing.
   */
  dark: {
    name: 'dark',
    sheet: '#0f1113',
    paper: '#17191b',
    frame: '#343a3c',
    // Real walnut value, warm.
    floor: '#2a1f17',
    grid: '#382a20',
    gridMajor: '#4d3a2b',
    wallFill: '#c8cccd',
    wallStroke: '#f0f3f4',
    // Anodised metal cannot read "black" against a dark floor; it reads as the
    // cool grey sheen you actually see on the mullions in the photo.
    glass: '#a7bcc6',
    glassTint: '#8fb4c6',
    // Pure white so the aluminium still separates from the concrete-light poché
    // it is set into — at 4" a mullion is only two device pixels wide.
    mullion: '#ffffff',
    sill: '#9aaab2',
    swing: '#6c777f',
    fixtureFill: '#242a2d',
    fixtureStroke: '#96a2a8',
    furnitureStroke: '#0c1013',
    furnitureFillAlpha: 1,
    text: '#e9eef1',
    textMuted: '#8b9599',
    dimLine: '#a8a08c',
    zoneTints: DARK_ZONES,
    issueError: '#ff6f60',
    issueWarn: '#ffc24a',
    clearance: '#5cb4e8',
    accent: '#4db2ff',
  },

  /**
   * Classic blueprint: white linework burned into a deep blue ground. The
   * reference cannot change the ground (a blueprint is blue by definition), so
   * the walnut shows up as a warm violet-shifted floor and the black glazing as
   * the only NEUTRAL (un-blued) white on the sheet.
   */
  blueprint: {
    name: 'blueprint',
    sheet: '#0a2149',
    paper: '#0f2d5c',
    frame: '#6d92c9',
    // Warm-shifted off the pure navy floor so the wood still registers.
    floor: '#193760',
    grid: '#26457a',
    gridMajor: '#3a5f96',
    wallFill: '#eaf2ff',
    wallStroke: '#ffffff',
    glass: '#eceff0',
    glassTint: '#2a5590',
    mullion: '#ffffff',
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
  /**
   * FULL-HEIGHT GLAZED ASSEMBLY (sill == 0). A punched window is annotation-
   * weight linework in a hole in the wall; a floor-to-ceiling glazed wall is
   * STRUCTURE, so its frame gets wall weight and its glass plane gets more than
   * a hairline. Without that, a slider reads as a hole and the drawing lies.
   */
  glazeFrame: 1.6,
  glazePlane: 1.4,
  /** mullion between two lights of the same assembly */
  mullion: 1.2,
  /** the operable sliding leaf, drawn on its own track line */
  slider: 1.3,
  /** slide-direction / swing-direction arrows */
  arrow: 0.9,
  /** bifold leaf outline */
  bifold: 1.25,
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
  /** ring around a numbered key tag */
  keyTag: 1.0,
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
  /** smallest a fixture name is allowed to shrink to before it is rotated/keyed */
  fixtureMin: 6.4,
  dim: 9.4,
  legend: 9.8,
  /** numbered-key list in the title block */
  key: 8.8,
  /** the digit inside a key tag on the drawing */
  keyTag: 8,
  tiny: 7.6,
} as const;

/**
 * EXACT advance widths, in 1/1000 em, for ASCII 32..126 in Helvetica.
 *
 * This is not a guess and it is not "calibrated roughly": it is the Adobe Core-14
 * Helvetica AFM table, and it was verified against what actually rasterises here
 * by measuring canvas `measureText` in the same headless chromium that renders
 * the PNGs — every sample string matched to within 2/1000 em (e.g. A-Z summed to
 * 17.613 em predicted vs 17.6128 em measured). Arial, Liberation Sans and
 * Helvetica Neue are all metric-compatible with this table for ASCII, so every
 * member of the FONT stack above measures the same.
 *
 * WHY IT MATTERS: label fitting has no DOM to measure with, and the old ~6%
 * underestimate was enough to push "WASHER / DRYER" past the ends of its own
 * 2'-8" box. A label placer is only as honest as its text metric.
 */
const HELV_W: readonly number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // 32-47
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, // 48-63
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, // 64-79
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, // 80-95
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, // 96-111
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, // 112-126
];

/**
 * Advance width of the mono stack, in em. DejaVu Sans Mono (what the FONT_MONO
 * stack lands on in this environment) is fixed pitch at 1233/2048 em; measured
 * identically for digits and for capitals.
 */
const MONO_W = 0.60205;

/**
 * Width of a text run in px. `font` selects which metric table to use — the
 * dimension strings and the size sub-lines are set in FONT_MONO, and a mono
 * digit is 8% wider than a Helvetica one, which is the difference between a
 * dimension fitting inside its own chain and colliding with the tick.
 */
export function textWidth(str: string, fontSize: number, font: 'sans' | 'mono' = 'sans'): number {
  if (font === 'mono') return [...str].length * MONO_W * fontSize;
  let mille = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 32;
    // Anything outside ASCII (rare in this data: only quotes/degree signs) is
    // charged as a lowercase 'n', the modal width of the table.
    mille += cp >= 32 && cp <= 126 ? HELV_W[cp - 32] : 556;
  }
  return (mille / 1000) * fontSize;
}

/** Cap height used for vertical fitting of a single text line. */
export const LINE_HEIGHT = 1.18;
