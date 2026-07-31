/**
 * budget.ts — the money, computed rather than transcribed.
 *
 * WHY THIS IS NOT JUST `sum(price)`. A furniture schedule's total is the number
 * that gets quoted and it is always wrong, in a predictable direction: it is the
 * cost of the things that have a catalog page, and a real move-in also has to buy
 * the things that do not. A bed frame is not a bed. A screen-paint kit is not a
 * screen. A projector with no Netflix app is not a streaming device. Blackout
 * side channels are eight runs of adhesive, not four.
 *
 * So this module produces THREE numbers instead of one:
 *
 *   FURNITURE      the catalog total, grouped so the money is visible by purpose
 *   ALLOWANCES     a low-high band for everything real that has no catalog entry,
 *                  each with the reason it applies to THIS layout
 *   ALL-IN         furniture + allowances, as a band
 *
 * and it breaks the furniture total down by PURPOSE (screening, work, sleep,
 * seating, light control, ...) because in a 448 sq ft studio the interesting
 * question is never "how much" but "how much of it went where".
 *
 * HONESTY. Catalog prices carry their own provenance in each entry's `source`
 * string, and several are explicitly unverified. The allowance bands below are
 * CLASS ESTIMATES for US mid-2026 with the reasoning stated inline; not one of
 * them is a quotation. Anything that says "get a quote" means get a quote.
 */

import { catalog } from './catalog';
import type { FurnitureDef, Layout } from './types';

// ---------------------------------------------------------------- grouping

export type BudgetGroup =
  | 'screening'
  | 'light-control'
  | 'work'
  | 'sleep'
  | 'seating'
  | 'tables'
  | 'storage'
  | 'soft'
  | 'dining'
  | 'decor';

export const GROUP_LABEL: Record<BudgetGroup, string> = {
  screening: 'Screening — projector, picture, plinth, sound',
  'light-control': 'Light control — the co-requisite, not an accessory',
  work: 'Work — the Jarvis and everything on it',
  sleep: 'Sleep',
  seating: 'Seating — the congregation area',
  tables: 'Tables',
  storage: 'Storage',
  soft: 'Soft goods',
  dining: 'Dining',
  decor: 'Light and greenery',
};

/** Presentation order: the money the client is asking about goes first. */
export const GROUP_ORDER: BudgetGroup[] = [
  'screening',
  'light-control',
  'work',
  'sleep',
  'seating',
  'tables',
  'dining',
  'storage',
  'soft',
  'decor',
];

const hasTag = (def: FurnitureDef, t: string): boolean => (def.tags ?? []).includes(t);

/**
 * Which pot a piece comes out of. Deliberately driven by the catalog's own
 * `kind` and `tags` rather than by a hand-maintained list of ids, so a new
 * product lands in the right group without touching this file.
 */
export function groupOf(def: FurnitureDef): BudgetGroup {
  switch (def.kind) {
    case 'projector':
    case 'projection_screen':
    case 'speaker':
      return 'screening';
    case 'shade':
      return 'light-control';
    case 'tv_stand':
      // A UST plinth is part of the picture, not part of the furniture.
      return hasTag(def, 'ust-plinth') ? 'screening' : 'storage';
    case 'bed':
    case 'sofa_bed':
    case 'murphy_bed':
    case 'nightstand':
      return 'sleep';
    case 'desk':
      return 'work';
    case 'chair':
      return hasTag(def, 'task') || hasTag(def, 'wfh') ? 'work' : 'dining';
    case 'tv':
      // The catalog files monitors as 'tv'; a real television would be screening.
      return hasTag(def, 'monitor') ? 'work' : 'screening';
    case 'box':
      return hasTag(def, 'desk-accessory') ? 'work' : 'storage';
    case 'sofa':
    case 'sectional':
    case 'loveseat':
    case 'armchair':
    case 'ottoman':
    case 'bench':
      return 'seating';
    case 'bar_stool':
      return 'dining';
    case 'dining_table':
      return 'dining';
    case 'coffee_table':
    case 'side_table':
    case 'console':
      return 'tables';
    case 'wardrobe':
    case 'cabinet':
    case 'shelf':
    case 'bookcase':
    case 'dresser':
      return 'storage';
    case 'rug':
      return hasTag(def, 'desk-accessory') ? 'work' : 'soft';
    case 'curtain':
      return 'light-control';
    case 'screen':
      return 'storage'; // a folding room divider
    case 'plant':
    case 'art':
    case 'mirror':
    case 'floor_lamp':
    case 'table_lamp':
      return 'decor';
    default:
      return 'storage';
  }
}

/** value / recommended / premium, read off the catalog tags. */
export type Tier = 'value' | 'recommended' | 'premium' | 'unspecified';

export function tierOf(def: FurnitureDef): Tier {
  if (hasTag(def, 'value')) return 'value';
  if (hasTag(def, 'premium')) return 'premium';
  if (hasTag(def, 'recommended')) return 'recommended';
  return 'unspecified';
}

// -------------------------------------------------------------- allowances

export interface AllowanceSpec {
  id: string;
  label: string;
  group: BudgetGroup;
  low: number;
  high: number;
  /** Why this line exists, and where the numbers came from. */
  why: string;
  /** Does this layout need it? */
  applies: (ctx: LayoutCtx) => boolean;
  /** How many of it. Default 1. */
  qty?: (ctx: LayoutCtx) => number;
}

/** What the predicates get to look at. */
export interface LayoutCtx {
  layout: Layout;
  defs: FurnitureDef[];
  /** def ids present, for exact tests */
  ids: Set<string>;
  kinds: Set<string>;
  tags: Set<string>;
  furnitureTotal: number;
  /** how many glazing bays the layout actually shades */
  shadeCount: number;
}

/**
 * THE ALLOWANCES. Each one is something a real move-in has to pay for that has
 * no catalog page, and each one is here because a specific product in the
 * catalog creates the need.
 */
export const ALLOWANCES: AllowanceSpec[] = [
  {
    id: 'mattress',
    label: 'Queen mattress (10-11")',
    group: 'sleep',
    low: 499,
    high: 1999,
    why:
      'Every bed frame in the catalog is a FRAME — its height includes a 10" mattress so the drawings ' +
      'show a made bed, but its price is the frame alone. Verified end points: Zinus Original ' +
      'Green Tea 10" at $499 (sale, from $718, read off the Zinus PDP) and Avocado Green Hybrid 11" ' +
      'at $1,999. Stay at 10-11": every extra inch of mattress raises the sleeping height and ' +
      "pushes the bed's silhouette up toward the glazing, and Avocado's 13\" Pillow Top would put a " +
      'Thuma\'s sleeping surface at 26".',
    applies: (c) => [...c.ids].some((id) => id.startsWith('bed-queen-') || id.startsWith('bed-murphy-')),
  },
  {
    id: 'slat-base',
    label: 'Slatted bed base (GRIMSBU frame only)',
    group: 'sleep',
    low: 40,
    high: 90,
    why:
      'The $79 GRIMSBU price is IKEA US for the FRAME ONLY (art. 90508513) — the slatted base is a ' +
      'separate purchase, so that line is not a complete bed. Band is the usual IKEA Luröy/Lönset ' +
      'queen range and is UNVERIFIED; re-price at the till.',
    applies: (c) => c.ids.has('bed-queen-grimsbu'),
  },
  {
    id: 'bedding',
    label: 'Bedding — linen sheet set, duvet cover set, insert, two pillows',
    group: 'sleep',
    low: 370,
    high: 810,
    why:
      'Not in any furniture catalog and not optional, and in a studio it is a VISIBLE design element ' +
      'rather than a utility: the bed is in every sightline in the apartment. PRICED AGAINST A ' +
      'SPECIFIED SET rather than a class average, read off quince.com on 31 Jul 2026 — European ' +
      'Linen sheet set, queen, in Oat at $144 promotional / $259 list, plus the European Linen duvet ' +
      'cover set (cover + 2 standard shams) in Sand at $154 / $344. That is $298-$603 for the two, ' +
      'and the band adds a duvet insert and two pillows at $70-$210 on top. The LOW end depends on a ' +
      'promotion that was live the day it was read; budget the high end. A folded bed cover, where a ' +
      'layout specifies one, is a catalogue line and is NOT in this allowance.',
    applies: (c) => c.kinds.has('bed') || c.kinds.has('murphy_bed') || c.kinds.has('sofa_bed'),
  },
  {
    id: 'level5-skim',
    label: 'Level-5 skim, prime and flat-black border for a painted screen',
    group: 'screening',
    low: 450,
    high: 1200,
    why:
      'Screen paint is only as flat as the wall under it, and on a 103"-wide 4K image one pixel is ' +
      'about 0.024" — so roller stipple, drywall imperfections and telegraphed joints all show. The ' +
      'honest requirement is a level-5 skim over the screen area, sanded to 220, high-build primer, ' +
      'then 2-4 rolled coats and a flat-black border: three to five days of a finisher\'s time over ' +
      'about 45 sq ft. THE PLASTERING COSTS MORE THAN THE PAINT, which is the real argument against ' +
      'the paint option — a $628 edge-free ALR frame is cheaper than the low end of this band. ' +
      'This unit\'s flat white walls are almost certainly level 4.',
    applies: (c) => c.tags.has('paint') || c.ids.has('screen-painted-wall-118'),
  },
  {
    id: 'streamer',
    label: 'Streaming box (Apple TV 4K class)',
    group: 'screening',
    low: 129,
    high: 199,
    why:
      'Not every projector can stream what people actually watch. The Epson LS650 runs Android TV ' +
      'with Prime Video, YouTube and Disney+ but has NO NETFLIX APP; the Optoma UHZ36 and the Epson ' +
      'QB1000 have no smart OS at all. A separate box also fixes the mediocre built-in interfaces ' +
      'and gives one HDMI source to route. Priced as an Apple TV 4K.',
    applies: (c) =>
      c.ids.has('projector-ust-epson-ls650') ||
      c.ids.has('projector-st-optoma-uhz36') ||
      c.ids.has('projector-lt-epson-qb1000'),
  },
  {
    id: 'av-power',
    label: 'Power + HDMI at the projector position, and cable concealment',
    group: 'screening',
    low: 150,
    high: 500,
    why:
      'A projector needs mains where it stands, and in this unit that is a real question rather than ' +
      'a detail: there is no power in the concrete soffit, so anything overhead is out, and a screen ' +
      'or plinth against the bathroom partition needs an outlet behind it or a cord run somewhere ' +
      'visible. The low end is a floor outlet already in the right place plus a cable channel; the ' +
      'high end is an electrician adding a receptacle. Motorised screens and floor-risers all plug in.',
    applies: (c) => c.kinds.has('projector'),
  },
  {
    id: 'laser-measure',
    label: 'Laser measure — before ordering any screen',
    group: 'screening',
    low: 30,
    high: 60,
    why:
      'This is a small line with a large consequence. The plan is traced from a listing graphic at ' +
      '±0.3 ft, i.e. ±3.6" — which is LARGER than the reveal a 120" frame would leave on the 9\'-6" ' +
      'bathroom partition and comparable to the reveal a 110" leaves. Do not order a screen over ' +
      '110" on the strength of a traced plan. Measure the wall, and while the meter is out, confirm ' +
      'the ceiling height and the glazing head — the 9\'-0" ceiling in this model is ASSUMED, and ' +
      'every screen-size and cassette limit falls out of it.',
    applies: (c) => c.kinds.has('projection_screen'),
  },
  {
    id: 'shade-install',
    label: 'Blackout shade installation and the eight side-channel runs',
    group: 'light-control',
    low: 200,
    high: 600,
    why:
      'Four inside-mount shades means four headrails and EIGHT vertical light gaps, and the ' +
      'manufacturer\'s own copy admits a ~1/8" factory deduction per side. On a west wall between ' +
      '3pm and sunset that puts visible bars of daylight across a projected image. The side channels ' +
      'are catalogued per bay, but fitting them is eight adhesive runs plus four bracket sets into ' +
      'the jambs — and note that at this unit\'s 8\'-8" (104") head, a cellular shade tall enough to ' +
      'reach can only be ordered on a CONTINUOUS CORD LOOP: not cordless, not no-drill.',
    applies: (c) => c.shadeCount > 0,
  },
  {
    id: 'delivery',
    label: 'Delivery, lift booking and assembly',
    group: 'storage',
    low: 0,
    high: 0, // computed as a percentage below
    why:
      '8-12% of the furniture total. It is a real number here rather than a rounding error because ' +
      'the entry nook has an ANGLED front door: the pieces that do not knock down — a 56" one-piece ' +
      'sofa frame, a 70" one-piece modular unit — ship freight and have to make that turn. Measure ' +
      'the door swing, the corridor turn and the lift car before committing to anything that does ' +
      'not flat-pack.',
    applies: () => true,
  },
];

// ------------------------------------------------------------------ output

export interface BudgetLine {
  id: string;
  name: string;
  qty: number;
  unit: number;
  total: number;
  tier: Tier;
  /** true when the catalog entry's own source string flags the price as unverified */
  priceUnverified: boolean;
}

export interface BudgetSection {
  group: BudgetGroup;
  label: string;
  lines: BudgetLine[];
  subtotal: number;
}

export interface AllowanceLine {
  id: string;
  label: string;
  group: BudgetGroup;
  qty: number;
  low: number;
  high: number;
  why: string;
}

export interface BudgetResult {
  layout: string;
  sections: BudgetSection[];
  furnitureTotal: number;
  /** furniture only, by tier */
  byTier: Record<Tier, number>;
  allowances: AllowanceLine[];
  allowanceLow: number;
  allowanceHigh: number;
  allInLow: number;
  allInHigh: number;
  /** how much of the furniture total went to making the picture happen */
  screeningTotal: number;
  /** count of catalog lines whose price the catalog itself calls unverified */
  unverifiedCount: number;
}

/**
 * Does this entry's own source string admit the price is not solid? Cheap
 * textual test on purpose: the catalog is the single place that provenance
 * lives, so the budget reads it rather than keeping a second list that can rot.
 */
function priceIsUnverified(def: FurnitureDef): boolean {
  const s = (def.source ?? '').toUpperCase();
  return (
    /PRICE (IS )?(NOT|UNVERIFIED)/.test(s) ||
    /PRICE NOT (DIRECTLY )?VERIFIED/.test(s) ||
    /NOT VERIFIED/.test(s) ||
    /IS AN ESTIMATE/.test(s) ||
    /CLASS ESTIMATE/.test(s) ||
    /JOINERY ALLOWANCE/.test(s) ||
    /UNVERIFIED/.test(s)
  );
}

const round = (n: number): number => Math.round(n);

export function buildBudget(layout: Layout): BudgetResult {
  // Collapse repeats: two identical poufs are one line with qty 2.
  const counts = new Map<string, number>();
  for (const it of layout.items) counts.set(it.def, (counts.get(it.def) ?? 0) + 1);

  const defs: FurnitureDef[] = [];
  const bucket = new Map<BudgetGroup, BudgetLine[]>();
  const byTier: Record<Tier, number> = { value: 0, recommended: 0, premium: 0, unspecified: 0 };
  let furnitureTotal = 0;
  let unverifiedCount = 0;

  for (const [defId, qty] of counts) {
    const def = catalog[defId];
    if (!def) continue; // analysis.ts is the thing that errors on an unknown id
    defs.push(def);
    const unit = def.price ?? 0;
    const total = unit * qty;
    const g = groupOf(def);
    const tier = tierOf(def);
    const unverified = priceIsUnverified(def);
    if (unverified && unit > 0) unverifiedCount++;
    furnitureTotal += total;
    byTier[tier] += total;
    const arr = bucket.get(g) ?? [];
    arr.push({ id: defId, name: def.name, qty, unit, total, tier, priceUnverified: unverified });
    bucket.set(g, arr);
  }

  const sections: BudgetSection[] = GROUP_ORDER.filter((g) => bucket.has(g)).map((g) => {
    const lines = (bucket.get(g) ?? []).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return {
      group: g,
      label: GROUP_LABEL[g],
      lines,
      subtotal: lines.reduce((s, l) => s + l.total, 0),
    };
  });

  const ctx: LayoutCtx = {
    layout,
    defs,
    ids: new Set(defs.map((d) => d.id)),
    kinds: new Set(defs.map((d) => d.kind)),
    tags: new Set(defs.flatMap((d) => d.tags ?? [])),
    furnitureTotal,
    shadeCount: layout.items.filter((it) => catalog[it.def]?.kind === 'shade').length,
  };

  const allowances: AllowanceLine[] = [];
  for (const a of ALLOWANCES) {
    if (!a.applies(ctx)) continue;
    const qty = a.qty ? a.qty(ctx) : 1;
    if (a.id === 'delivery') {
      allowances.push({
        id: a.id,
        label: a.label,
        group: a.group,
        qty: 1,
        low: round(furnitureTotal * 0.08),
        high: round(furnitureTotal * 0.12),
        why: a.why,
      });
      continue;
    }
    allowances.push({ id: a.id, label: a.label, group: a.group, qty, low: a.low * qty, high: a.high * qty, why: a.why });
  }

  const allowanceLow = allowances.reduce((s, a) => s + a.low, 0);
  const allowanceHigh = allowances.reduce((s, a) => s + a.high, 0);

  return {
    layout: layout.id,
    sections,
    furnitureTotal: round(furnitureTotal),
    byTier,
    allowances,
    allowanceLow: round(allowanceLow),
    allowanceHigh: round(allowanceHigh),
    allInLow: round(furnitureTotal + allowanceLow),
    allInHigh: round(furnitureTotal + allowanceHigh),
    screeningTotal: round(
      (sections.find((s) => s.group === 'screening')?.subtotal ?? 0) +
        (sections.find((s) => s.group === 'light-control')?.subtotal ?? 0),
    ),
    unverifiedCount,
  };
}

/** `$1,234` */
export const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
