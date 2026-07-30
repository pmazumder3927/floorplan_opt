/**
 * The furniture catalog: real products / archetypes with real dimensions.
 *
 * WHY this file is written the way it is
 * --------------------------------------
 * The whole point of this project is that a render made from these numbers is
 * TO SCALE. So every entry carries a `source` string naming the actual product
 * or dimensional standard the numbers came from, and every dimension is written
 * with the units helpers (`IN`, `FTIN`, `CM`) so the real measurement stays
 * visible in the code instead of being flattened into a decimal.
 *
 * Honesty rule: where a number comes from a remembered spec sheet rather than a
 * standard I can state exactly, the source string says "remembered spec". Those
 * are good to roughly +/- 1" - fine for planning a layout, not for cutting wood.
 *
 * Orientation contract (see types.ts): at rot = 0, `w` runs along +x, `d` runs
 * along +y, and the FRONT of the piece (the side you sit on / face / open)
 * points toward +y = plan SOUTH.
 *
 * Palette: deliberately restrained so that any subset of the catalog dropped
 * into a room reads as one coherent interior - warm off-whites, oatmeal linen,
 * greige, oak and walnut, muted sage and slate blue, charcoal, with brass and
 * terracotta as the only real accents.
 */

import type { FurnitureDef } from './types';
import { CM, FTIN, IN } from './units';

// ---------------------------------------------------------------- palette
// Named once so the catalog stays visually coherent instead of becoming a bag
// of random hexes. These are the only colors used below.

const OFF_WHITE = '#EFEAE1'; // warm off-white paint / ceramic
const CREAM = '#DED5C6'; // undyed cotton, boucle
const OATMEAL = '#CBC0AD'; // natural linen upholstery
const GREIGE = '#A79C8C'; // heavier woven upholstery
const SAGE = '#6E7B68'; // muted green velvet / painted case goods
const SLATE = '#55677A'; // muted blue-grey upholstery
const CHARCOAL = '#3B3F44'; // dark upholstery, dark painted wood
const NEAR_BLACK = '#242628'; // steel, TV bezels, powder-coated legs
const OAK = '#C79B68'; // light oak / ash veneer
const WALNUT = '#6D4A33'; // walnut / stained birch
const BRASS = '#B08D57'; // brushed brass hardware and lamp stems
const TERRACOTTA = '#B5654A'; // the one warm accent - pots, a pillow, a pouf
const LEAF = '#4E7A4B'; // foliage
const RUG_BASE = '#C4B9A6'; // flatweave wool ground
const RUG_ALT = '#8E8C86'; // the darker rug option

// -------------------------------------------------------------- entries
//
// Grouped by category. Ids are stable and readable: '<category>-<variant>'.

const DEFS: FurnitureDef[] = [
  // =====================================================================
  // SEATING - sofas, sectionals, loveseats, chairs, ottomans, benches
  // frontClearance ~16-18" is the real sofa-to-coffee-table gap (CLEARANCE
  // .sofaToTable); you need that much to get your knees past the table.
  // =====================================================================
  {
    id: 'sofa-3seat-soderhamn',
    name: 'SODERHAMN 3-seat sofa',
    kind: 'sofa',
    // 198 x 99 x 83 cm = 6'-6" x 3'-3" x 2'-9". Low back, deep seat.
    w: CM(198),
    d: CM(99),
    h: CM(83),
    seatHeight: CM(40), // 15 3/4" - unusually low, reads lounge-y
    color: OATMEAL,
    accent: CREAM,
    source: `IKEA SODERHAMN 3-seat, 198 x 99 x 83 cm (6'-6" x 3'-3" x 2'-9"), seat 40 cm`,
    frontClearance: IN(18),
    tags: ['seating', 'sofa', 'living', 'ikea', 'anchor', 'low-back'],
    price: 899,
  },
  {
    id: 'sofa-3seat-sven',
    name: 'Sven 88" sofa',
    kind: 'sofa',
    // Mid-century tight-back sofa. 88" is the classic "full size" sofa width.
    w: IN(88),
    d: IN(36),
    h: IN(33),
    seatHeight: IN(18), // standard American sofa seat height
    color: WALNUT,
    accent: TERRACOTTA,
    source: `Article Sven 88" sofa, 88" x 36" x 33", seat 18" (remembered spec)`,
    frontClearance: IN(18),
    tags: ['seating', 'sofa', 'living', 'leather', 'anchor', 'splurge'],
    price: 1799,
  },
  {
    id: 'sofa-2seat-klippan',
    name: 'KLIPPAN 2-seat sofa',
    kind: 'sofa',
    // 180 x 88 x 66 cm = 5'-11" x 2'-11" x 2'-2". Under 6' and only 26" tall,
    // so it never blocks a sightline in a studio.
    w: CM(180),
    d: CM(88),
    h: CM(66),
    seatHeight: CM(43), // 17"
    color: SLATE,
    accent: CREAM,
    source: `IKEA KLIPPAN 2-seat, 180 x 88 x 66 cm (5'-11" x 2'-11" x 2'-2"), seat 43 cm`,
    frontClearance: IN(18),
    lowProfile: true, // 26" back - you can see over it
    tags: ['seating', 'sofa', 'small-space', 'ikea', 'budget', 'low-profile'],
    price: 279,
  },
  {
    id: 'sofa-2seat-sven72',
    name: 'Sven 72" sofa',
    kind: 'sofa',
    // 72" = exactly 6'. The largest sofa that still leaves a walkway on a
    // 9'-6" studio wall.
    w: IN(72),
    d: IN(37),
    h: IN(33),
    seatHeight: IN(18),
    color: SAGE,
    accent: CREAM,
    source: `Article Sven 72" sofa, 72" x 37" x 33", seat 18" (remembered spec)`,
    frontClearance: IN(18),
    tags: ['seating', 'sofa', 'small-space', 'living', 'splurge'],
    price: 1299,
  },
  {
    id: 'loveseat-60',
    name: 'Loveseat, 60"',
    kind: 'loveseat',
    // 60" x 37" is the standard two-cushion loveseat envelope.
    w: IN(60),
    d: IN(37),
    h: IN(33),
    seatHeight: IN(18),
    color: OATMEAL,
    accent: SAGE,
    source: `Loveseat archetype, 60" x 37" x 33", seat 18" (US retail standard two-cushion)`,
    frontClearance: IN(18),
    tags: ['seating', 'loveseat', 'small-space', 'living'],
    price: 799,
  },
  {
    id: 'loveseat-settee-48',
    name: 'Settee, 48"',
    kind: 'loveseat',
    // 48" x 30" low-arm settee - only 30" deep, so it fits at the foot of a
    // bed or across a 5' nook where a 37"-deep loveseat would not.
    w: IN(48),
    d: IN(30),
    h: IN(31),
    seatHeight: IN(17),
    color: CREAM,
    accent: BRASS,
    source: `Low-arm settee archetype, 48" x 30" x 31", seat 17" (remembered spec)`,
    frontClearance: IN(16),
    tags: ['seating', 'loveseat', 'small-space', 'accent'],
    price: 549,
  },
  {
    id: 'sofa-bed-holmsund',
    name: 'HOLMSUND sofa-bed',
    kind: 'sofa_bed',
    // 230 x 99 x 91 cm = 7'-6" x 3'-3" x 3'-0" as a sofa. Opens FORWARD to a
    // 140 x 200 cm (4'-7" x 6'-7") full-size bed, so allow ~6'-7" of depth
    // total when deployed - model that with a separate placement if it matters.
    w: CM(230),
    d: CM(99),
    h: CM(91),
    seatHeight: CM(44), // 17 1/4"
    color: GREIGE,
    accent: CHARCOAL,
    source: `IKEA HOLMSUND 3-seat sofa-bed, 230 x 99 x 91 cm; bed 140 x 200 cm; open depth ~200 cm`,
    frontClearance: IN(40), // needs the bed's extra depth kept clear-ish
    tags: ['seating', 'sofa', 'sleeps-2', 'convertible', 'ikea', 'studio'],
    price: 749,
  },
  {
    id: 'sofa-bed-queen-sleeper',
    name: 'Queen sleeper sofa',
    kind: 'sofa_bed',
    // 87" x 40" closed. The mechanism unfolds to a 60" x 74" queen sleeper
    // mattress, giving ~88" of total depth from the wall when open.
    w: IN(87),
    d: IN(40),
    h: IN(36),
    seatHeight: IN(19),
    color: SLATE,
    accent: CREAM,
    source: `Queen sleeper sofa archetype, 87" x 40" x 36" closed; queen sleeper mattress 60" x 74"; ~88" deep open (remembered spec)`,
    frontClearance: IN(48), // 88" open - 40" closed
    tags: ['seating', 'sofa', 'sleeps-2', 'convertible', 'guest'],
    price: 1899,
  },
  {
    id: 'sectional-l-vimle',
    name: 'VIMLE 3-seat sectional with chaise',
    kind: 'sectional',
    // 252 x 164 x 83 cm = 8'-3" x 5'-5" x 2'-9". At rot=0 the chaise leg runs
    // along +y (south); rotate to put the chaise on the other hand.
    w: CM(252),
    d: CM(164),
    h: CM(83),
    seatHeight: CM(43), // 17"
    color: OATMEAL,
    accent: SAGE,
    source: `IKEA VIMLE 3-seat with chaise longue, 252 x 164 x 83 cm (8'-3" x 5'-5" x 2'-9"), seat 43 cm`,
    frontClearance: IN(18),
    tags: ['seating', 'sectional', 'living', 'ikea', 'anchor', 'lounge'],
    price: 1349,
  },
  {
    id: 'sectional-l-compact',
    name: 'Compact L-shaped sectional',
    kind: 'sectional',
    // 84" x 60" - the smallest L that still seats three. Good for a studio
    // corner where a full 8'-3" sectional would eat the circulation.
    w: IN(84),
    d: IN(60),
    h: IN(32),
    seatHeight: IN(17),
    color: CHARCOAL,
    accent: OATMEAL,
    source: `Compact L-sectional archetype, 84" x 60" x 32", seat 17" (remembered spec)`,
    frontClearance: IN(18),
    tags: ['seating', 'sectional', 'small-space', 'living', 'corner'],
    price: 1199,
  },
  {
    id: 'armchair-poang',
    name: 'POANG armchair',
    kind: 'armchair',
    // 68 x 82 x 100 cm = 2'-3" x 2'-8" x 3'-3". Cantilever frame, so nothing
    // behind the rear leg - but the footprint is the full 82 cm.
    w: CM(68),
    d: CM(82),
    h: CM(100),
    seatHeight: CM(42), // 16 1/2"
    color: OAK,
    accent: CREAM,
    source: `IKEA POANG armchair, 68 x 82 x 100 cm (2'-3" x 2'-8" x 3'-3"), seat 42 cm`,
    frontClearance: IN(18),
    tags: ['seating', 'armchair', 'small-space', 'ikea', 'reading', 'budget'],
    price: 149,
  },
  {
    id: 'armchair-strandmon',
    name: 'STRANDMON wing chair',
    kind: 'armchair',
    // 82 x 96 x 101 cm = 2'-8" x 3'-2" x 3'-4". Tall back: not see-over.
    w: CM(82),
    d: CM(96),
    h: CM(101),
    seatHeight: CM(45), // 17 3/4"
    color: SAGE,
    accent: WALNUT,
    source: `IKEA STRANDMON wing chair, 82 x 96 x 101 cm (2'-8" x 3'-2" x 3'-4"), seat 45 cm`,
    frontClearance: IN(18),
    tags: ['seating', 'armchair', 'ikea', 'reading', 'wing'],
    price: 399,
  },
  {
    id: 'accent-chair-slipper',
    name: 'Slipper accent chair',
    kind: 'armchair',
    // 28" x 31" x 31" armless slipper chair - the smallest real lounge chair.
    w: IN(28),
    d: IN(31),
    h: IN(31),
    seatHeight: IN(18),
    color: TERRACOTTA,
    accent: BRASS,
    source: `Armless slipper accent chair archetype, 28" x 31" x 31", seat 18" (remembered spec)`,
    frontClearance: IN(16),
    tags: ['seating', 'armchair', 'accent', 'small-space'],
    price: 429,
  },
  {
    id: 'ottoman-square-24',
    name: 'Ottoman, 24" square',
    kind: 'ottoman',
    // 24" x 24" x 17" - matched to an 18" seat so it works as a footrest.
    w: IN(24),
    d: IN(24),
    h: IN(17),
    seatHeight: IN(17),
    color: OATMEAL,
    accent: WALNUT,
    source: `Upholstered ottoman archetype, 24" x 24" x 17" (matches 18" sofa seat)`,
    frontClearance: 0, // you step over it
    lowProfile: true,
    tags: ['seating', 'ottoman', 'low-profile', 'small-space', 'flexible'],
    price: 199,
  },
  {
    id: 'pouf-round-22',
    name: 'Round pouf',
    kind: 'ottoman',
    // 22" diameter x 16" - knitted/leather pouf. Footprint is the circle bbox.
    w: IN(22),
    d: IN(22),
    h: IN(16),
    seatHeight: IN(16),
    color: TERRACOTTA,
    source: `Round floor pouf archetype, 22" dia x 16" h (IKEA SANDARED / West Elm pouf class)`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['seating', 'ottoman', 'low-profile', 'small-space', 'accent'],
    price: 99,
  },
  {
    id: 'bench-entry-42',
    name: 'Entry bench, 42"',
    kind: 'bench',
    // 42" x 14" x 18". 14" deep is the shallowest a bench can be and still be
    // sittable; 18" is chair-seat height.
    w: IN(42),
    d: IN(14),
    h: IN(18),
    seatHeight: IN(18),
    color: OAK,
    accent: NEAR_BLACK,
    source: `Entry bench archetype, 42" x 14" x 18" (18" = standard chair seat height)`,
    frontClearance: IN(18), // enough to stand up and put shoes on
    lowProfile: true,
    tags: ['seating', 'bench', 'entry', 'small-space', 'low-profile'],
    price: 179,
  },
  {
    id: 'bench-dining-47',
    name: 'Dining bench, 47"',
    kind: 'bench',
    // 47" x 14" x 18" - tucks fully under a 60" table, which is why benches
    // beat chairs in a studio.
    w: IN(47),
    d: IN(14),
    h: IN(18),
    seatHeight: IN(18),
    color: OAK,
    accent: OAK,
    source: `IKEA NORDVIKEN / NORRAKER bench class, 47" x 14" x 18", seat 18"`,
    frontClearance: IN(24), // less than a chair: you swing out sideways
    lowProfile: true,
    tags: ['seating', 'bench', 'dining', 'small-space', 'low-profile'],
    price: 129,
  },

  // =====================================================================
  // SLEEPING - mattresses, platform frames, daybed, murphy bed
  //
  // US mattress standards (these are exact, not remembered):
  //   twin    38 x 75    twin XL 38 x 80
  //   full    54 x 75    queen   60 x 80    king 76 x 80
  // Mattress-only entries are 10" thick (a common mid-height foam/hybrid).
  // Platform FRAME entries are ~5" wider and ~5-6" longer than the mattress
  // because of the rails, and their `h` is the top of the mattress once it is
  // in the frame (deck ~13" + 10" mattress = 23"), which is what the renderer
  // should draw. `frontClearance` is at the FOOT of the bed.
  // =====================================================================
  {
    id: 'bed-twin-mattress',
    name: 'Twin mattress',
    kind: 'bed',
    w: IN(38),
    d: IN(75),
    h: IN(10),
    seatHeight: IN(10),
    color: OFF_WHITE,
    accent: CREAM,
    source: `US standard twin mattress 38" x 75", 10" thick`,
    frontClearance: IN(24), // CLEARANCE.bedSide
    lowProfile: true,
    tags: ['sleeping', 'mattress', 'sleeps-1', 'small-space', 'low-profile'],
    price: 349,
  },
  {
    id: 'bed-twinxl-mattress',
    name: 'Twin XL mattress',
    kind: 'bed',
    w: IN(38),
    d: IN(80),
    h: IN(10),
    seatHeight: IN(10),
    color: OFF_WHITE,
    accent: CREAM,
    source: `US standard twin XL mattress 38" x 80", 10" thick`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'mattress', 'sleeps-1', 'small-space', 'low-profile'],
    price: 399,
  },
  {
    id: 'bed-full-mattress',
    name: 'Full / double mattress',
    kind: 'bed',
    w: IN(54),
    d: IN(75),
    h: IN(10),
    seatHeight: IN(10),
    color: OFF_WHITE,
    accent: CREAM,
    source: `US standard full (double) mattress 54" x 75", 10" thick`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'mattress', 'sleeps-2', 'small-space', 'low-profile'],
    price: 499,
  },
  {
    id: 'bed-queen-mattress',
    name: 'Queen mattress',
    kind: 'bed',
    w: IN(60),
    d: IN(80),
    h: IN(10),
    seatHeight: IN(10),
    color: OFF_WHITE,
    accent: CREAM,
    source: `US standard queen mattress 60" x 80", 10" thick`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'mattress', 'sleeps-2', 'low-profile'],
    price: 699,
  },
  {
    id: 'bed-king-mattress',
    name: 'King mattress',
    kind: 'bed',
    w: IN(76),
    d: IN(80),
    h: IN(10),
    seatHeight: IN(10),
    color: OFF_WHITE,
    accent: CREAM,
    source: `US standard king mattress 76" x 80", 10" thick`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'mattress', 'sleeps-2', 'large', 'low-profile'],
    price: 999,
  },
  {
    id: 'bed-twin-platform',
    name: 'Twin platform bed',
    kind: 'bed',
    // Frame 43" x 81" around a 38" x 75" mattress: +5" wide, +6" long.
    w: IN(43),
    d: IN(81),
    h: IN(23), // deck 13" + 10" mattress
    seatHeight: IN(23),
    color: OAK,
    accent: OFF_WHITE,
    source: `Platform frame for US twin (38" x 75"): 43" x 81" outside, deck 13", mattress top 23"`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'bed', 'sleeps-1', 'small-space', 'low-profile'],
    price: 299,
  },
  {
    id: 'bed-queen-platform',
    name: 'Queen platform bed',
    kind: 'bed',
    // Frame 65" x 86" around a 60" x 80" mattress: +5" wide, +6" long.
    w: IN(65),
    d: IN(86),
    h: IN(23),
    seatHeight: IN(23),
    color: OAK,
    accent: OFF_WHITE,
    source: `Platform frame for US queen (60" x 80"): 65" x 86" outside, deck 13", mattress top 23"`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'bed', 'sleeps-2', 'low-profile', 'anchor'],
    price: 649,
  },
  {
    id: 'bed-king-platform',
    name: 'King platform bed',
    kind: 'bed',
    // Frame 81" x 86" around a 76" x 80" mattress.
    w: IN(81),
    d: IN(86),
    h: IN(23),
    seatHeight: IN(23),
    color: OAK,
    accent: OFF_WHITE,
    source: `Platform frame for US king (76" x 80"): 81" x 86" outside, deck 13", mattress top 23"`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'bed', 'sleeps-2', 'large', 'low-profile'],
    price: 899,
  },
  {
    id: 'bed-queen-storage-malm',
    name: 'MALM queen bed with 4 storage drawers',
    kind: 'bed',
    // 209 x 176 x 100 cm = 6'-10" x 5'-9" x 3'-3" (headboard). The headboard is
    // 39" tall, so this is NOT see-over even though the mattress deck is low.
    // Drawers pull out of the SIDE, so it wants ~30" of side clearance.
    w: CM(176),
    d: CM(209),
    h: CM(100),
    seatHeight: IN(23),
    color: WALNUT,
    accent: OFF_WHITE,
    source: `IKEA MALM queen bed frame with 4 storage boxes, 209 x 176 x 100 cm (6'-10" x 5'-9" x 3'-3"), fits 60" x 80" mattress`,
    frontClearance: IN(30), // side drawers need a real aisle
    tags: ['sleeping', 'bed', 'storage', 'sleeps-2', 'ikea'],
    price: 749,
  },
  {
    id: 'bed-daybed-hemnes',
    name: 'HEMNES daybed',
    kind: 'bed',
    // 189 x 86 x 86 cm = 6'-2" x 2'-10" x 2'-10". Sofa by day; the underframe
    // pulls out to a 160 x 200 cm (5'-3" x 6'-7") double, so the deployed
    // footprint is roughly 6'-7" x 5'-3".
    w: CM(189),
    d: CM(86),
    h: CM(86),
    seatHeight: CM(46), // 18" - it really is chair height, that is the point
    color: OFF_WHITE,
    accent: OATMEAL,
    source: `IKEA HEMNES daybed, 189 x 86 x 86 cm (6'-2" x 2'-10" x 2'-10"); pulls out to 160 x 200 cm`,
    frontClearance: IN(36), // room to pull the second mattress out
    tags: ['sleeping', 'seating', 'sleeps-2', 'convertible', 'small-space', 'ikea'],
    price: 399,
  },
  {
    id: 'bed-murphy-queen-closed',
    name: 'Murphy bed cabinet (queen), closed',
    kind: 'murphy_bed',
    // Closed cabinet: 66" wide x 16" deep x 84" tall. 15-16" is the real
    // closed depth of a vertical wall-bed cabinet - it is shallower than a
    // wardrobe, which is why it works in a studio.
    w: IN(66),
    d: IN(16),
    h: IN(84),
    color: OFF_WHITE,
    accent: OAK,
    source: `Vertical queen wall-bed cabinet archetype, 66" x 16" x 84" closed (remembered spec; 15-16" is typical closed depth)`,
    frontClearance: IN(30), // stand clear to swing it down; see the -open def
    tags: ['sleeping', 'murphy', 'storage', 'small-space', 'convertible', 'sleeps-2'],
    price: 2400,
  },
  {
    id: 'bed-murphy-queen-open',
    name: 'Murphy bed (queen), open',
    kind: 'murphy_bed',
    // Deployed: depth = queen mattress length 80" + ~6" of cabinet/mechanism
    // left behind = 86". Place this def at the same wall to test whether the
    // room still works with the bed DOWN.
    w: IN(66),
    d: IN(86),
    h: IN(26), // mattress top ~16" plus the raised cabinet lip
    seatHeight: IN(24),
    color: OFF_WHITE,
    accent: CREAM,
    source: `Same cabinet deployed: 66" wide, depth = 80" queen mattress + ~6" cabinet = 86"`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['sleeping', 'murphy', 'small-space', 'convertible', 'sleeps-2', 'deployed'],
    price: 0, // same purchase as bed-murphy-queen-closed
  },

  // =====================================================================
  // TABLES - dining, coffee, side, console
  // Dining tables and chairs get 36" of clearance (CLEARANCE.diningChair):
  // that is what it actually takes to pull a chair out and stand up.
  // Dining height is 29-30"; 30" is the usual finished top height.
  // =====================================================================
  {
    id: 'dining-round-30',
    name: 'Round dining table, 30"',
    kind: 'dining_table',
    // 30" round seats 2 comfortably, 3 in a pinch (24" of edge per person).
    w: IN(30),
    d: IN(30),
    h: IN(29.5),
    seatHeight: IN(29.5), // work-surface height
    color: OAK,
    accent: NEAR_BLACK,
    source: `30" round pedestal dining table, 30" dia x 29 1/2" h (IKEA DOCKSTA / bistro class)`,
    frontClearance: IN(36),
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'small-space', 'round', 'seats-2'],
    price: 199,
  },
  {
    id: 'dining-round-36',
    name: 'Round dining table, 36"',
    kind: 'dining_table',
    // 36" round: 3-4 seats. The sweet spot for a studio.
    w: IN(36),
    d: IN(36),
    h: IN(30),
    seatHeight: IN(30),
    color: OAK,
    accent: NEAR_BLACK,
    source: `36" round dining table, 36" dia x 30" h (US retail standard round)`,
    frontClearance: IN(36),
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'small-space', 'round', 'seats-4'],
    price: 349,
  },
  {
    id: 'dining-round-42',
    name: 'Round dining table, 42"',
    kind: 'dining_table',
    // 42" round: a real 4-seater (33" of edge each).
    w: IN(42),
    d: IN(42),
    h: IN(30),
    seatHeight: IN(30),
    color: WALNUT,
    accent: NEAR_BLACK,
    source: `42" round dining table, 42" dia x 30" h (US retail standard round)`,
    frontClearance: IN(36),
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'round', 'seats-4'],
    price: 549,
  },
  {
    id: 'dining-bistro-2seat',
    name: 'Bistro table, 2-seat',
    kind: 'dining_table',
    // 28" square. Two people, elbows in. Reads as a cafe table.
    w: IN(28),
    d: IN(28),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: NEAR_BLACK,
    accent: OAK,
    source: `Cafe bistro table archetype, 28" square x 29 1/2" h (IKEA MELLTORP 75 x 75 x 74 cm class)`,
    frontClearance: IN(30), // tight cafe pull-out, not a full 36"
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'small-space', 'seats-2', 'budget'],
    price: 129,
  },
  {
    id: 'dining-rect-60x30',
    name: 'Rectangular dining table, 60" x 30"',
    kind: 'dining_table',
    // 60 x 30 seats 4 (two per long side) or 6 squeezed with end seats.
    w: IN(60),
    d: IN(30),
    h: IN(30),
    seatHeight: IN(30),
    color: OAK,
    accent: NEAR_BLACK,
    source: `US standard rectangular dining table 60" x 30" x 30" h`,
    frontClearance: IN(36),
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'seats-4', 'rectangular'],
    price: 449,
  },
  {
    id: 'dining-rect-72x36',
    name: 'Rectangular dining table, 72" x 36"',
    kind: 'dining_table',
    // 72 x 36 is the classic 6-seater. Needs 12' of room with 36" all round.
    w: IN(72),
    d: IN(36),
    h: IN(30),
    seatHeight: IN(30),
    color: WALNUT,
    accent: NEAR_BLACK,
    source: `US standard rectangular dining table 72" x 36" x 30" h`,
    frontClearance: IN(36),
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'seats-6', 'rectangular', 'large'],
    price: 799,
  },
  {
    id: 'dining-gateleg-norden',
    name: 'NORDEN gateleg table (folded)',
    kind: 'dining_table',
    // FOLDED: 80 x 26 cm (2'-7" x 10 1/4") - it lives against a wall like a
    // console. OPEN: both leaves up gives 152 cm (5'-0") of depth, i.e. an
    // 80 x 152 cm table seating 4. One leaf up = 89 cm (2'-11").
    w: CM(80),
    d: CM(26),
    h: CM(74),
    seatHeight: CM(74), // 29 1/8"
    color: OFF_WHITE,
    accent: OAK,
    source: `IKEA NORDEN gateleg table, folded 80 x 26 x 74 cm (2'-7" x 10 1/4"); one leaf 89 cm; both leaves 152 cm (5'-0") deep`,
    frontClearance: IN(60), // must be able to open a leaf AND seat someone
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'small-space', 'convertible', 'folding', 'ikea'],
    price: 279,
  },
  {
    id: 'coffee-table-rect-48',
    name: 'Coffee table, 48" x 24"',
    kind: 'coffee_table',
    // 48 x 24 x 16. Rule of thumb: coffee table ~2/3 the sofa width and its
    // top level with or just below the 18" seat.
    w: IN(48),
    d: IN(24),
    h: IN(16),
    color: WALNUT,
    accent: BRASS,
    source: `Rectangular coffee table archetype, 48" x 24" x 16" (2/3 of an 88" sofa, top just below an 18" seat)`,
    frontClearance: IN(16), // CLEARANCE.sofaToTable
    lowProfile: true,
    tags: ['living', 'coffee-table', 'low-profile'],
    price: 349,
  },
  {
    id: 'coffee-table-round-32',
    name: 'Round coffee table, 32"',
    kind: 'coffee_table',
    // 32" dia x 17". Round is the right call in tight circulation - no corners
    // to bark your shin on.
    w: IN(32),
    d: IN(32),
    h: IN(17),
    color: OAK,
    accent: BRASS,
    source: `32" round coffee table archetype, 32" dia x 17" h (US retail standard)`,
    frontClearance: IN(16),
    lowProfile: true,
    tags: ['living', 'coffee-table', 'round', 'small-space', 'low-profile'],
    price: 299,
  },
  {
    id: 'side-table-round-18',
    name: 'Side table, 18" round',
    kind: 'side_table',
    // 18" dia x 22" - top just above an 18" sofa seat so a glass is reachable.
    w: IN(18),
    d: IN(18),
    h: IN(22),
    color: BRASS,
    accent: WALNUT,
    source: `18" round side table archetype, 18" dia x 22" h (top ~4" above an 18" seat)`,
    frontClearance: IN(12),
    lowProfile: true,
    tags: ['living', 'side-table', 'small-space', 'low-profile', 'accent'],
    price: 149,
  },
  {
    id: 'side-table-nesting-pair',
    name: 'Nesting side tables (pair)',
    kind: 'side_table',
    // Footprint is the LARGER table: 22" x 22" x 22". The small one is
    // 18" x 18" x 18" and stows underneath, so one footprint is correct.
    w: IN(22),
    d: IN(22),
    h: IN(22),
    color: OAK,
    accent: NEAR_BLACK,
    source: `Nesting table pair archetype: large 22" x 22" x 22", small 18" x 18" x 18" nested under (remembered spec)`,
    frontClearance: IN(12),
    lowProfile: true,
    tags: ['living', 'side-table', 'small-space', 'flexible', 'low-profile'],
    price: 199,
  },
  {
    id: 'console-narrow-48',
    name: 'Narrow console, 48"',
    kind: 'console',
    // 48" x 12" x 30". 10-14" is the whole point of a console: it passes a
    // walkway without narrowing it below 36".
    w: IN(48),
    d: IN(12),
    h: IN(30),
    color: OAK,
    accent: BRASS,
    source: `Narrow console table archetype, 48" x 12" x 30" (10-14" deep is the console standard)`,
    frontClearance: IN(24),
    tags: ['storage', 'console', 'entry', 'small-space'],
    price: 249,
  },
  {
    id: 'console-sofa-60',
    name: 'Sofa console, 60"',
    kind: 'console',
    // 60" x 14" x 30". Sits behind a floating sofa; 30" top matches a sofa
    // back at 32-33" so a lamp reads correctly.
    w: IN(60),
    d: IN(14),
    h: IN(30),
    color: WALNUT,
    accent: BRASS,
    source: `Sofa-back console archetype, 60" x 14" x 30" (remembered spec)`,
    frontClearance: IN(24),
    tags: ['storage', 'console', 'living', 'zoning'],
    price: 349,
  },

  // =====================================================================
  // STORAGE - dressers, nightstands, shelving, wardrobes, carts
  // frontClearance for anything with a DRAWER is 30-36": that is the drawer
  // extension (~20-24" for a full-extension slide) plus a body to stand in.
  // 30" for shelving/reach-in (CLEARANCE.closetFront), 36" for deep drawers.
  // =====================================================================
  {
    id: 'dresser-3drawer-malm',
    name: 'MALM 3-drawer chest',
    kind: 'dresser',
    // 80 x 48 x 78 cm = 2'-7" x 1'-7" x 2'-7".
    w: CM(80),
    d: CM(48),
    h: CM(78),
    color: OAK,
    accent: OAK,
    source: `IKEA MALM 3-drawer chest, 80 x 48 x 78 cm (2'-7" x 1'-7" x 2'-7")`,
    frontClearance: IN(36),
    tags: ['storage', 'dresser', 'bedroom', 'small-space', 'ikea'],
    price: 179,
  },
  {
    id: 'dresser-6drawer-malm',
    name: 'MALM 6-drawer chest',
    kind: 'dresser',
    // 160 x 48 x 78 cm = 5'-3" x 1'-7" x 2'-7". Wide and low: doubles as a
    // media console at 31" tall.
    w: CM(160),
    d: CM(48),
    h: CM(78),
    color: WALNUT,
    accent: WALNUT,
    source: `IKEA MALM 6-drawer chest, 160 x 48 x 78 cm (5'-3" x 1'-7" x 2'-7")`,
    frontClearance: IN(36),
    tags: ['storage', 'dresser', 'bedroom', 'media', 'ikea'],
    price: 379,
  },
  {
    id: 'dresser-8drawer-hemnes',
    name: 'HEMNES 8-drawer chest',
    kind: 'dresser',
    // 160 x 50 x 96 cm = 5'-3" x 1'-8" x 3'-2". Tall enough to block a
    // sightline, so no lowProfile.
    w: CM(160),
    d: CM(50),
    h: CM(96),
    color: OFF_WHITE,
    accent: BRASS,
    source: `IKEA HEMNES 8-drawer chest, 160 x 50 x 96 cm (5'-3" x 1'-8" x 3'-2")`,
    frontClearance: IN(36),
    tags: ['storage', 'dresser', 'bedroom', 'ikea', 'large'],
    price: 499,
  },
  {
    id: 'nightstand-hemnes',
    name: 'HEMNES 2-drawer nightstand',
    kind: 'nightstand',
    // 46 x 35 x 70 cm = 1'-6" x 1'-2" x 2'-4". Top at 27 1/2" sits just above
    // a 23" mattress top, which is what you want beside a bed.
    w: CM(46),
    d: CM(35),
    h: CM(70),
    color: OFF_WHITE,
    accent: BRASS,
    source: `IKEA HEMNES 2-drawer nightstand, 46 x 35 x 70 cm (1'-6" x 1'-2" x 2'-4")`,
    frontClearance: IN(24),
    lowProfile: true, // 27 1/2" - under the ~30" see-over line
    tags: ['storage', 'nightstand', 'bedroom', 'ikea', 'low-profile'],
    price: 99,
  },
  {
    id: 'nightstand-narrow-14',
    name: 'Narrow nightstand, 14"',
    kind: 'nightstand',
    // 14" x 14" x 24" - the minimum viable bedside surface when the bed is
    // jammed against a wall.
    w: IN(14),
    d: IN(14),
    h: IN(24),
    color: WALNUT,
    accent: BRASS,
    source: `Narrow bedside table archetype, 14" x 14" x 24" (remembered spec)`,
    frontClearance: IN(18),
    lowProfile: true,
    tags: ['storage', 'nightstand', 'bedroom', 'small-space', 'low-profile'],
    price: 79,
  },
  {
    id: 'shelf-kallax-2x4',
    name: 'KALLAX shelf, 2 x 4 cube',
    kind: 'shelf',
    // 77 x 39 x 147 cm = 2'-6 1/4" x 1'-3 3/8" x 4'-9 7/8". Tall-narrow.
    w: CM(77),
    d: CM(39),
    h: CM(147),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA KALLAX 2 x 4, 77 x 39 x 147 cm (2'-6" x 1'-3" x 4'-10")`,
    frontClearance: IN(30),
    tags: ['storage', 'shelf', 'cube', 'ikea', 'small-space', 'zoning'],
    price: 89,
  },
  {
    id: 'shelf-kallax-4x4',
    name: 'KALLAX shelf, 4 x 4 cube',
    kind: 'shelf',
    // 147 x 39 x 147 cm = 4'-10" square, 1'-3" deep. Open on both faces, so
    // this is the classic studio room divider.
    w: CM(147),
    d: CM(39),
    h: CM(147),
    color: OFF_WHITE,
    accent: OAK,
    source: `IKEA KALLAX 4 x 4, 147 x 39 x 147 cm (4'-10" x 1'-3" x 4'-10")`,
    frontClearance: IN(30),
    tags: ['storage', 'shelf', 'cube', 'ikea', 'divider', 'zoning'],
    price: 189,
  },
  {
    id: 'bookcase-billy-narrow',
    name: 'BILLY bookcase, narrow',
    kind: 'bookcase',
    // 40 x 28 x 202 cm = 1'-3 3/4" x 11" x 6'-7 1/2". 11" deep is why BILLY
    // fits anywhere.
    w: CM(40),
    d: CM(28),
    h: CM(202),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA BILLY bookcase 40 x 28 x 202 cm (1'-3 3/4" x 11" x 6'-7 1/2")`,
    frontClearance: IN(30),
    tags: ['storage', 'bookcase', 'small-space', 'ikea', 'narrow', 'budget'],
    price: 59,
  },
  {
    id: 'bookcase-billy-tall',
    name: 'BILLY bookcase, 31"',
    kind: 'bookcase',
    // 80 x 28 x 202 cm = 2'-7 1/2" x 11" x 6'-7 1/2".
    w: CM(80),
    d: CM(28),
    h: CM(202),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA BILLY bookcase 80 x 28 x 202 cm (2'-7 1/2" x 11" x 6'-7 1/2")`,
    frontClearance: IN(30),
    tags: ['storage', 'bookcase', 'ikea', 'budget'],
    price: 79,
  },
  {
    id: 'shelf-open-etagere',
    name: 'Open shelving unit, 36"',
    kind: 'shelf',
    // 36" x 14" x 72". Open back and sides - visually light, so it can stand
    // in a walkway without making the room feel closed.
    w: IN(36),
    d: IN(14),
    h: IN(72),
    color: NEAR_BLACK,
    accent: OAK,
    source: `Steel-and-wood etagere archetype, 36" x 14" x 72" (remembered spec)`,
    frontClearance: IN(30),
    tags: ['storage', 'shelf', 'open', 'display', 'zoning'],
    price: 229,
  },
  {
    id: 'wardrobe-pax-2door',
    name: 'PAX wardrobe, 2-door',
    kind: 'wardrobe',
    // 100 x 58 x 201 cm = 3'-3 3/8" x 1'-10 7/8" x 6'-7 1/8". 23" deep is set
    // by a hanger: you cannot go shallower and still hang clothes front-on.
    w: CM(100),
    d: CM(58),
    h: CM(201),
    color: OFF_WHITE,
    accent: BRASS,
    source: `IKEA PAX wardrobe frame 100 x 58 x 201 cm (3'-3" x 1'-11" x 6'-7"); 58 cm depth is hanger-driven`,
    frontClearance: IN(36), // hinged doors + standing room
    tags: ['storage', 'wardrobe', 'bedroom', 'ikea', 'closet'],
    price: 375,
  },
  {
    id: 'wardrobe-armoire-brimnes',
    name: 'BRIMNES 2-door wardrobe',
    kind: 'wardrobe',
    // 78 x 50 x 190 cm = 2'-6 3/4" x 1'-7 3/4" x 6'-2 3/4". Mirror on one
    // door, which is why it can replace a separate full-length mirror.
    w: CM(78),
    d: CM(50),
    h: CM(190),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA BRIMNES 2-door wardrobe, 78 x 50 x 190 cm (2'-7" x 1'-8" x 6'-3")`,
    frontClearance: IN(36),
    tags: ['storage', 'wardrobe', 'bedroom', 'small-space', 'ikea', 'mirror'],
    price: 199,
  },
  {
    id: 'cabinet-shoe-bissa',
    name: 'BISSA shoe cabinet',
    kind: 'cabinet',
    // 49 x 28 x 93 cm = 1'-7 1/4" x 11" x 3'-0 5/8". Tilt-out doors, so it
    // only needs 11" of depth - the reason it works in an entry.
    w: CM(49),
    d: CM(28),
    h: CM(93),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA BISSA shoe cabinet, 49 x 28 x 93 cm (1'-7" x 11" x 3'-1")`,
    frontClearance: IN(24), // tilt-out doors swing ~16"
    tags: ['storage', 'cabinet', 'entry', 'small-space', 'ikea', 'shoes'],
    price: 79,
  },
  {
    id: 'cabinet-sideboard-63',
    name: 'Sideboard, 63"',
    kind: 'cabinet',
    // 63" x 18" x 35". Buffet height (35") so it also works as a standing
    // drop-zone / bar.
    w: IN(63),
    d: IN(18),
    h: IN(35),
    color: SAGE,
    accent: BRASS,
    source: `Sideboard / buffet archetype, 63" x 18" x 35" (IKEA BESTA 180 x 42 x 74 cm class, taller legs)`,
    frontClearance: IN(36),
    tags: ['storage', 'cabinet', 'dining', 'media', 'bar'],
    price: 649,
  },
  {
    id: 'bench-storage-36',
    name: 'Storage bench, 36"',
    kind: 'bench',
    // 36" x 16" x 20". Lid lifts, so it wants clear space above but only 18"
    // of floor in front to sit.
    w: IN(36),
    d: IN(16),
    h: IN(20),
    seatHeight: IN(20),
    color: OATMEAL,
    accent: OAK,
    source: `Lift-lid storage bench archetype, 36" x 16" x 20", seat 20" (remembered spec)`,
    frontClearance: IN(18),
    lowProfile: true,
    tags: ['storage', 'bench', 'entry', 'seating', 'small-space', 'low-profile'],
    price: 199,
  },
  {
    id: 'cart-bar-raskog',
    name: 'RASKOG utility cart',
    kind: 'cabinet',
    // 35 x 45 x 78 cm = 1'-1 3/4" x 1'-5 3/4" x 2'-6 3/4". On casters, so the
    // analyzer should treat it as movable - it is the one piece you can shove.
    w: CM(35),
    d: CM(45),
    h: CM(78),
    color: SAGE,
    accent: BRASS,
    source: `IKEA RASKOG utility cart, 35 x 45 x 78 cm (1'-2" x 1'-6" x 2'-7")`,
    frontClearance: IN(18),
    tags: ['storage', 'cart', 'bar', 'kitchen', 'small-space', 'ikea', 'movable'],
    price: 49,
  },

  // =====================================================================
  // WORK - desks and chairs
  // Desk/work-surface height is 29-30" (ADA-ish standard is 28-34"; 29.5" is
  // the IKEA default). frontClearance 30" = CLEARANCE.deskChair: you need that
  // to roll the chair back and stand.
  // =====================================================================
  {
    id: 'desk-47',
    name: 'Desk, 47"',
    kind: 'desk',
    // 120 x 60 x 74 cm = 3'-11" x 1'-11 5/8" x 2'-5 1/8". The standard IKEA
    // tabletop; 47" is the smallest width that takes a monitor plus notes.
    w: CM(120),
    d: CM(60),
    h: CM(74),
    seatHeight: CM(74), // work height
    color: OAK,
    accent: NEAR_BLACK,
    source: `IKEA LINNMON/LAGKAPTEN 120 x 60 cm top on 74 cm legs (3'-11" x 2'-0" x 2'-5")`,
    frontClearance: IN(30),
    // 29 1/2" work surface - see-over, so it does not block sightlines.
    lowProfile: true,
    tags: ['wfh', 'desk', 'work', 'ikea', 'small-space'],
    price: 129,
  },
  {
    id: 'desk-55',
    name: 'Desk, 55"',
    kind: 'desk',
    // 140 x 60 x 74 cm = 4'-7" x 1'-11 5/8" x 2'-5 1/8". Two monitors fit.
    w: CM(140),
    d: CM(60),
    h: CM(74),
    seatHeight: CM(74),
    color: OAK,
    accent: NEAR_BLACK,
    source: `IKEA LAGKAPTEN 140 x 60 cm top on 74 cm legs (4'-7" x 2'-0" x 2'-5")`,
    frontClearance: IN(30),
    // 29 1/2" work surface - see-over, so it does not block sightlines.
    lowProfile: true,
    tags: ['wfh', 'desk', 'work', 'ikea', 'dual-monitor'],
    price: 169,
  },
  {
    id: 'desk-writing-micke',
    name: 'MICKE writing desk',
    kind: 'desk',
    // 73 x 50 x 75 cm = 2'-4 3/4" x 1'-7 3/4" x 2'-5 1/2". A laptop desk; the
    // 20" depth is too shallow for a big monitor and that is the trade.
    w: CM(73),
    d: CM(50),
    h: CM(75),
    seatHeight: CM(75),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA MICKE desk, 73 x 50 x 75 cm (2'-5" x 1'-8" x 2'-5 1/2")`,
    frontClearance: IN(30),
    // 29 1/2" work surface - see-over, so it does not block sightlines.
    lowProfile: true,
    tags: ['wfh', 'desk', 'work', 'small-space', 'ikea', 'budget'],
    price: 99,
  },
  {
    id: 'desk-corner-l',
    name: 'Corner desk, 59" x 59"',
    kind: 'desk',
    // L-shaped: 59" x 59" overall with ~24" deep wings. Modeled as the full
    // bounding box because the inner corner is where YOU sit - the analyzer
    // should not treat it as free floor for circulation.
    w: IN(59),
    d: IN(59),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: OAK,
    accent: NEAR_BLACK,
    source: `L-shaped corner desk archetype, 59" x 59" overall, 24" deep wings, 29 1/2" h (remembered spec)`,
    frontClearance: IN(30),
    // 29 1/2" work surface - see-over, so it does not block sightlines.
    lowProfile: true,
    tags: ['wfh', 'desk', 'work', 'corner', 'large'],
    price: 299,
  },
  {
    id: 'chair-desk-markus',
    name: 'MARKUS office chair',
    kind: 'chair',
    // 62 x 60 x 129-140 cm = 2'-0 3/8" x 1'-11 5/8" x 4'-3" to 4'-7".
    // Seat adjusts 43-54 cm (17"-21 1/4"); 18" quoted as the nominal.
    w: CM(62),
    d: CM(60),
    h: CM(140),
    seatHeight: IN(18),
    color: CHARCOAL,
    accent: NEAR_BLACK,
    source: `IKEA MARKUS office chair, 62 x 60 x 129-140 cm, seat 43-54 cm (17"-21 1/4")`,
    frontClearance: 0, // it IS the clearance the desk asks for
    tags: ['wfh', 'chair', 'work', 'ikea', 'ergonomic'],
    price: 259,
  },
  {
    id: 'chair-task-simple',
    name: 'Task chair, armless',
    kind: 'chair',
    // 24" x 24" x 36". Armless so it tucks fully under a 29.5" desk.
    w: IN(24),
    d: IN(24),
    h: IN(36),
    seatHeight: IN(19),
    color: SLATE,
    accent: NEAR_BLACK,
    source: `Armless rolling task chair archetype, 24" x 24" x 36", seat 19" (remembered spec)`,
    frontClearance: 0,
    tags: ['wfh', 'chair', 'work', 'small-space'],
    price: 129,
  },
  {
    id: 'chair-dining',
    name: 'Dining chair',
    kind: 'chair',
    // 18" x 21" x 33", seat 18". These four numbers are the dining-chair
    // standard everything else is designed around.
    w: IN(18),
    d: IN(21),
    h: IN(33),
    seatHeight: IN(18),
    color: OAK,
    accent: OATMEAL,
    source: `US standard dining chair, 18" x 21" x 33", seat 18"`,
    frontClearance: IN(36), // CLEARANCE.diningChair - pull out and stand
    tags: ['dining', 'chair', 'seating'],
    price: 99,
  },
  {
    id: 'chair-folding',
    name: 'Folding chair',
    kind: 'chair',
    // 17" x 18" x 31" open; folds to ~2" and hangs in a closet. The reason it
    // is in the catalog: guest seating that costs no floor when not in use.
    w: IN(17),
    d: IN(18),
    h: IN(31),
    seatHeight: IN(18),
    color: NEAR_BLACK,
    accent: OAK,
    source: `Folding chair archetype, 17" x 18" x 31" open, ~2" folded (IKEA TERJE class)`,
    frontClearance: IN(30),
    tags: ['dining', 'chair', 'seating', 'small-space', 'guest', 'folding'],
    price: 39,
  },

  // =====================================================================
  // SCREENS - TVs and media consoles
  //
  // A 16:9 panel of diagonal D inches is D * 0.8716 wide and D * 0.4903 tall.
  // Add ~0.5-0.7" of bezel/chassis. So a "55 inch" TV cabinet is ~48.4" wide,
  // ~28" tall and ~2" deep - the marketing number is never the width.
  // For the on-stand entries `d` is the STAND footprint depth (the feet span),
  // not the 2" panel depth, because that is what sits on your console.
  // TVs get frontClearance 0 - nobody walks up to a TV. They are deliberately
  // NOT lowProfile even though a 43" is only 24" tall: a TV always sits on top
  // of a 15-24" console, so its real height above the floor is 40-60".
  // =====================================================================
  {
    id: 'tv-43',
    name: 'TV, 43" on stand',
    kind: 'tv',
    // Panel 37.5" x 21.1"; cabinet ~38.2" x 22.4"; stand feet span ~8.7" deep;
    // overall height with stand ~24.4".
    w: IN(38.2),
    d: IN(8.7),
    h: IN(24.4),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `43" 16:9 TV: panel 37.5" x 21.1" (geometry), cabinet ~38.2" x 22.4", panel depth ~2", stand depth ~8.7" (remembered spec)`,
    frontClearance: 0,
    tags: ['media', 'tv', 'small-space'],
    price: 299,
  },
  {
    id: 'tv-50',
    name: 'TV, 50" on stand',
    kind: 'tv',
    // Panel 43.6" x 24.5"; cabinet ~44.2" x 25.6"; stand depth ~9.1".
    w: IN(44.2),
    d: IN(9.1),
    h: IN(27.8),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `50" 16:9 TV: panel 43.6" x 24.5" (geometry), cabinet ~44.2" x 25.6", panel depth ~2", stand depth ~9.1" (remembered spec)`,
    frontClearance: 0,
    tags: ['media', 'tv'],
    price: 399,
  },
  {
    id: 'tv-55',
    name: 'TV, 55" on stand',
    kind: 'tv',
    // Panel 47.9" x 27.0"; cabinet ~48.4" x 28.1"; panel only ~2" deep; stand
    // feet span ~9.3" deep; overall with stand ~30.3" tall.
    w: IN(48.4),
    d: IN(9.3),
    h: IN(30.3),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `55" 16:9 TV: panel 47.9" x 27.0" (geometry), cabinet ~48.4" x 28.1", panel depth ~2", stand depth ~9.3" (remembered spec)`,
    frontClearance: 0,
    tags: ['media', 'tv'],
    price: 549,
  },
  {
    id: 'tv-65',
    name: 'TV, 65" on stand',
    kind: 'tv',
    // Panel 56.7" x 31.9"; cabinet ~57.3" x 33.1"; stand depth ~11.0".
    w: IN(57.3),
    d: IN(11),
    h: IN(35.4),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `65" 16:9 TV: panel 56.7" x 31.9" (geometry), cabinet ~57.3" x 33.1", panel depth ~2", stand depth ~11" (remembered spec)`,
    frontClearance: 0,
    tags: ['media', 'tv', 'large'],
    price: 899,
  },
  {
    id: 'tv-55-wall',
    name: 'TV, 55" wall-mounted',
    kind: 'tv',
    // Same cabinet, no stand: 48.4" x 28.1", ~2" of panel plus ~1.5" of
    // low-profile bracket = 3.5" off the wall. Bottom of screen at 36" AFF
    // puts the center near seated eye height for a 17-18" sofa seat.
    w: IN(48.4),
    d: IN(3.5),
    h: IN(28.1),
    color: NEAR_BLACK,
    source: `55" 16:9 TV on a low-profile wall bracket: cabinet 48.4" x 28.1", ~3 1/2" total off the wall`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(36), // bottom of screen 36" AFF -> center ~50" AFF
    tags: ['media', 'tv', 'wall-hung', 'small-space'],
    price: 599,
  },
  {
    id: 'tv-stand-besta-71',
    name: 'BESTA TV bench, 71"',
    kind: 'tv_stand',
    // 180 x 42 x 38 cm = 5'-10 7/8" x 1'-4 1/2" x 1'-3". Low: a 55" TV on top
    // lands the screen center near seated eye height.
    w: CM(180),
    d: CM(42),
    h: CM(38),
    color: OFF_WHITE,
    accent: OAK,
    source: `IKEA BESTA TV bench, 180 x 42 x 38 cm (5'-11" x 1'-4 1/2" x 1'-3")`,
    frontClearance: IN(24), // open a door / reach the console
    lowProfile: true,
    tags: ['media', 'tv-stand', 'storage', 'ikea', 'low-profile'],
    price: 249,
  },
  {
    id: 'tv-stand-media-console-58',
    name: 'Media console, 58"',
    kind: 'tv_stand',
    // 58" x 15" x 24". Rule: the console should be wider than the TV cabinet,
    // so 58" is the right partner for the 48.4"-wide 55" TV.
    w: IN(58),
    d: IN(15),
    h: IN(24),
    color: WALNUT,
    accent: BRASS,
    source: `Media console archetype, 58" x 15" x 24" (sized wider than a 48.4" 55" TV cabinet)`,
    frontClearance: IN(24),
    lowProfile: true,
    tags: ['media', 'tv-stand', 'storage', 'low-profile'],
    price: 449,
  },

  // =====================================================================
  // RUGS - every standard US size
  // All rugs: h = 1/2" (a typical flatweave/low-pile total thickness),
  // walkable (never a collision) and lowProfile (never a sightline blocker).
  // They exist in the model to define ZONES, which is why they matter here.
  // =====================================================================
  {
    id: 'rug-2x3',
    name: 'Rug, 2’ x 3’',
    kind: 'rug',
    w: FTIN(2),
    d: FTIN(3),
    h: IN(0.5),
    color: RUG_BASE,
    accent: TERRACOTTA,
    source: `US standard rug size 2' x 3' (accent / door mat)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'accent', 'entry', 'walkable'],
    price: 49,
  },
  {
    id: 'rug-3x5',
    name: 'Rug, 3’ x 5’',
    kind: 'rug',
    w: FTIN(3),
    d: FTIN(5),
    h: IN(0.5),
    color: RUG_BASE,
    accent: TERRACOTTA,
    source: `US standard rug size 3' x 5' (entry / bedside)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'entry', 'small-space', 'walkable'],
    price: 89,
  },
  {
    id: 'rug-4x6',
    name: 'Rug, 4’ x 6’',
    kind: 'rug',
    w: FTIN(4),
    d: FTIN(6),
    h: IN(0.5),
    color: RUG_BASE,
    accent: SAGE,
    source: `US standard rug size 4' x 6' (small seating group)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'small-space', 'walkable'],
    price: 149,
  },
  {
    id: 'rug-5x8',
    name: 'Rug, 5’ x 8’',
    kind: 'rug',
    w: FTIN(5),
    d: FTIN(8),
    h: IN(0.5),
    color: RUG_BASE,
    accent: SAGE,
    source: `US standard rug size 5' x 8' (fits under a coffee table + front sofa legs)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'living', 'small-space', 'zoning', 'walkable'],
    price: 249,
  },
  {
    id: 'rug-6x9',
    name: 'Rug, 6’ x 9’',
    kind: 'rug',
    w: FTIN(6),
    d: FTIN(9),
    h: IN(0.5),
    color: RUG_ALT,
    accent: OATMEAL,
    source: `US standard rug size 6' x 9' (living zone in a studio)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'living', 'zoning', 'walkable'],
    price: 349,
  },
  {
    id: 'rug-8x10',
    name: 'Rug, 8’ x 10’',
    kind: 'rug',
    w: FTIN(8),
    d: FTIN(10),
    h: IN(0.5),
    color: RUG_BASE,
    accent: SLATE,
    source: `US standard rug size 8' x 10' (all sofa legs on; queen bed with 24" showing at the sides)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'living', 'bedroom', 'zoning', 'walkable'],
    price: 549,
  },
  {
    id: 'rug-9x12',
    name: 'Rug, 9’ x 12’',
    kind: 'rug',
    w: FTIN(9),
    d: FTIN(12),
    h: IN(0.5),
    color: RUG_ALT,
    accent: OATMEAL,
    source: `US standard rug size 9' x 12' (largest common size; a dining table with chairs pulled out stays on it)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'living', 'dining', 'zoning', 'large', 'walkable'],
    price: 799,
  },
  {
    id: 'rug-runner-2x8',
    name: 'Runner, 2’-6" x 8’',
    kind: 'rug',
    // 2'-6" x 8' is the standard runner. Written with FTIN so the half-foot
    // is visible rather than hidden in a 2.5.
    w: FTIN(2, 6),
    d: FTIN(8),
    h: IN(0.5),
    color: RUG_BASE,
    accent: TERRACOTTA,
    source: `US standard runner 2'-6" x 8' (hall / galley kitchen / bedside)`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'runner', 'circulation', 'kitchen', 'walkable'],
    price: 179,
  },

  // =====================================================================
  // LIGHTING, GREENERY, WALL & SOFT GOODS
  // Lamps and plants get frontClearance 0 - you never need to stand in front
  // of them - but they DO occupy floor, so their footprints are honest.
  // =====================================================================
  {
    id: 'lamp-floor-hektar',
    name: 'HEKTAR floor lamp',
    kind: 'floor_lamp',
    // Shade 22 cm dia, height 181 cm = 5'-11 1/4". Footprint taken as 14"
    // square: the base disc plus the shade overhang.
    w: IN(14),
    d: IN(14),
    h: CM(181),
    color: NEAR_BLACK,
    accent: BRASS,
    source: `IKEA HEKTAR floor lamp, 22 cm shade, 181 cm h (5'-11 1/4")`,
    frontClearance: 0,
    tags: ['lighting', 'floor-lamp', 'small-space', 'ikea'],
    price: 69,
  },
  {
    id: 'lamp-arc-overarching',
    name: 'Overarching arc floor lamp',
    kind: 'floor_lamp',
    // Base is only 12" dia but the arm reaches ~61" horizontally, so the
    // BOUNDING footprint is 62" x 14" - it hangs over a sofa or bed. That
    // overhang is the whole reason to buy one, and the analyzer needs to know.
    w: IN(62),
    d: IN(14),
    h: IN(84),
    color: BRASS,
    accent: NEAR_BLACK,
    source: `West Elm Overarching floor lamp class: 12" dia base, ~61" arc reach, 84" h (remembered spec)`,
    frontClearance: 0,
    tags: ['lighting', 'floor-lamp', 'arc', 'living', 'splurge'],
    price: 349,
  },
  {
    id: 'lamp-table-ceramic',
    name: 'Ceramic table lamp',
    kind: 'table_lamp',
    // 13" shade dia x 24" tall. 24" is right on a 24-27" nightstand: the
    // shade bottom lands near seated eye level so you do not see the bulb.
    w: IN(13),
    d: IN(13),
    h: IN(24),
    color: OFF_WHITE,
    accent: CREAM,
    source: `Ceramic table lamp archetype, 13" shade dia x 24" h (sized for a 24-27" nightstand)`,
    frontClearance: 0,
    // Not lowProfile: it always sits ON something, so its real top is ~4'-3".
    tags: ['lighting', 'table-lamp', 'bedroom', 'accent'],
    price: 89,
  },
  {
    id: 'plant-fiddle-leaf-6ft',
    name: 'Fiddle leaf fig, 6’',
    kind: 'plant',
    // 6' overall in a 12" pot; canopy spreads ~28", which is the footprint
    // that actually collides with a passing shoulder.
    w: IN(28),
    d: IN(28),
    h: FTIN(6),
    color: LEAF,
    accent: TERRACOTTA,
    source: `Fiddle leaf fig at retail size: 6'-0" overall in a 12" pot, ~28" canopy spread`,
    frontClearance: 0,
    tags: ['greenery', 'plant', 'tall', 'living', 'corner'],
    price: 159,
  },
  {
    id: 'plant-medium-40in',
    name: 'Medium floor plant, 40"',
    kind: 'plant',
    // 40" tall (snake plant / ZZ / rubber tree in a 10" pot), 18" spread.
    w: IN(18),
    d: IN(18),
    h: IN(40),
    color: LEAF,
    accent: TERRACOTTA,
    source: `Medium floor plant archetype: 40" overall in a 10" pot, 18" spread`,
    frontClearance: 0,
    tags: ['greenery', 'plant', 'small-space'],
    price: 79,
  },
  {
    id: 'plant-small-tabletop',
    name: 'Small tabletop plant',
    kind: 'plant',
    // 10" spread x 16" tall in a 6" pot. Sits on a shelf or console.
    w: IN(10),
    d: IN(10),
    h: IN(16),
    color: LEAF,
    accent: OFF_WHITE,
    source: `Tabletop plant archetype: 16" overall in a 6" pot, 10" spread`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['greenery', 'plant', 'accent', 'tabletop', 'low-profile'],
    price: 29,
  },
  {
    id: 'mirror-full-length-wall',
    name: 'Full-length mirror, wall-hung',
    kind: 'mirror',
    // 30" x 70" glass, ~2" total off the wall with the frame and cleat.
    // Bottom at 6" AFF so a standing adult sees their shoes.
    w: IN(30),
    d: IN(2),
    h: IN(70),
    color: OFF_WHITE,
    accent: BRASS,
    source: `Full-length wall mirror archetype, 30" x 70" glass, ~2" deep (bottom set 6" above finished floor)`,
    frontClearance: IN(30), // you need ~30" to see your whole body
    wallMounted: true,
    defaultZ: IN(6),
    tags: ['decor', 'mirror', 'wall-hung', 'bedroom', 'small-space'],
    price: 179,
  },
  {
    id: 'art-framed-large',
    name: 'Framed art, large (40" x 30")',
    kind: 'art',
    // 40" x 30" frame, 2" deep. Hung with the CENTER at 57" AFF (gallery
    // standard), so the bottom is at 57 - 15 = 42".
    w: IN(40),
    d: IN(2),
    h: IN(30),
    color: OFF_WHITE,
    accent: OAK,
    source: `Framed art, 40" x 30" x 2"; hung to gallery standard 57" center AFF -> bottom at 42"`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(42),
    tags: ['decor', 'art', 'wall-hung', 'living'],
    price: 219,
  },
  {
    id: 'art-framed-small',
    name: 'Framed art, small (24" x 18")',
    kind: 'art',
    // 24" x 18" frame. Center at 57" AFF -> bottom at 48".
    w: IN(24),
    d: IN(1.5),
    h: IN(18),
    color: OFF_WHITE,
    accent: WALNUT,
    source: `Framed art, 24" x 18" x 1 1/2"; hung to gallery standard 57" center AFF -> bottom at 48"`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(48),
    tags: ['decor', 'art', 'wall-hung', 'small-space'],
    price: 99,
  },
  {
    id: 'screen-room-divider-3panel',
    name: 'Room divider, 3-panel',
    kind: 'screen',
    // Three 18" panels, 71" tall. Set up zig-zag (which is the only way it
    // stands up) it spans ~48" and needs ~16" of depth. Folded flat it is
    // 54" x 2", but you cannot use it that way.
    w: IN(48),
    d: IN(16),
    h: IN(71),
    color: OAK,
    accent: CREAM,
    source: `3-panel folding screen archetype: 3 x 18" panels, 71" tall; ~48" span x 16" depth when zig-zagged (remembered spec)`,
    frontClearance: 0,
    tags: ['decor', 'screen', 'divider', 'zoning', 'small-space', 'privacy'],
    price: 249,
  },
  {
    id: 'curtain-panel-50x96',
    name: 'Curtain panel, 50" x 96"',
    kind: 'curtain',
    // 50" wide finished panel (the retail standard), 96" long for a 9'
    // ceiling with the rod near the ceiling. Rod projects ~4" from the wall.
    // wallMounted so it does not count as a floor obstacle, defaultZ 0
    // because the fabric reaches the floor.
    w: IN(50),
    d: IN(4),
    h: IN(96),
    color: CREAM,
    accent: CREAM,
    source: `US standard curtain panel 50" x 96" finished; rod projection ~4" (96" length suits the 9'-0" ceiling in plan.ts)`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: 0,
    tags: ['decor', 'curtain', 'wall-hung', 'window', 'soft'],
    price: 79,
  },
  {
    id: 'stool-counter-25',
    name: 'Counter stool, 25" seat',
    kind: 'bar_stool',
    // Counter height is 36", so the stool seat is 24-26" (leave 10-12" of
    // knee room). 25" is the safe middle. 17" x 19" footprint with a low back.
    w: IN(17),
    d: IN(19),
    h: IN(37),
    seatHeight: IN(25),
    color: OAK,
    accent: NEAR_BLACK,
    source: `Counter stool standard: 24-26" seat for a 36" counter; 17" x 19" x 37" overall`,
    frontClearance: IN(18), // slide back and stand
    tags: ['seating', 'bar-stool', 'kitchen', 'counter', 'small-space'],
    price: 129,
  },
  {
    id: 'stool-bar-30',
    name: 'Bar stool, 30" seat',
    kind: 'bar_stool',
    // Bar height is 41-43", so the seat is 29-30". Same footprint, taller.
    w: IN(17),
    d: IN(19),
    h: IN(43),
    seatHeight: IN(30),
    color: OAK,
    accent: NEAR_BLACK,
    source: `Bar stool standard: 29-30" seat for a 41-43" bar; 17" x 19" x 43" overall`,
    frontClearance: IN(18),
    tags: ['seating', 'bar-stool', 'kitchen', 'bar'],
    price: 149,
  },
];

// ---------------------------------------------------------------- exports

/** Every def, keyed by id. Built from DEFS so the ids can never drift. */
export const catalog: Record<string, FurnitureDef> = (() => {
  const out: Record<string, FurnitureDef> = {};
  for (const d of DEFS) {
    // A duplicate id would silently shadow an entry and make layouts lie.
    if (out[d.id]) throw new Error(`catalog: duplicate id ${d.id}`);
    out[d.id] = d;
  }
  return out;
})();

/** Declaration order, which is the grouped-by-category order above. */
export const catalogList: FurnitureDef[] = DEFS;

/** Defs bucketed by FurnitureKind, order preserved within each bucket. */
export const catalogByKind: Record<string, FurnitureDef[]> = (() => {
  const out: Record<string, FurnitureDef[]> = {};
  for (const d of DEFS) {
    const bucket = out[d.kind] ?? (out[d.kind] = []);
    bucket.push(d);
  }
  return out;
})();

// ------------------------------------------------------------- similarity

/** Character bigrams of a lowercased string, '-' and '_' normalised to spaces. */
function bigrams(s: string): string[] {
  const t = s.toLowerCase().replace(/[-_]+/g, ' ').trim();
  const out: string[] = [];
  for (let i = 0; i + 1 < t.length; i++) out.push(t.slice(i, i + 2));
  return out;
}

/**
 * Sorensen-Dice coefficient on character bigrams, 0..1, plus a small bonus for
 * a shared prefix. Deliberately simple and dependency-free - it only has to be
 * good enough to say "did you mean rug-8x10?".
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of A) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of B) {
    const n = counts.get(g) ?? 0;
    if (n > 0) {
      counts.set(g, n - 1);
      hits++;
    }
  }
  const dice = (2 * hits) / (A.length + B.length);
  // Prefix bonus: 'sofa-3' should rank the sofa-3seat-* entries first even
  // though the tails differ a lot.
  let prefix = 0;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  while (prefix < la.length && prefix < lb.length && la[prefix] === lb[prefix]) prefix++;
  return dice + Math.min(prefix, 8) * 0.01;
}

// ------------------------------------------------------------- lookup API

/**
 * Fetch a def by id. Throws listing the 5 closest ids, because a typo in a
 * layout should tell you the fix instead of dumping 90 ids or crashing later
 * with `undefined.w`.
 */
export function getDef(id: string): FurnitureDef {
  const hit = catalog[id];
  if (hit) return hit;

  const near = DEFS.map((d) => ({ id: d.id, score: similarity(id, d.id) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((n) => n.id);

  throw new Error(
    `Unknown furniture def ${JSON.stringify(id)}. Closest ids: ${near.join(', ')}`,
  );
}

/** Score one def against one already-lowercased query token. 0 = no match. */
function scoreToken(def: FurnitureDef, raw: string, useSource: boolean): number {
  // Let 'small-space' and 'small space' both work against either form.
  const t = raw.replace(/[-_]+/g, ' ');
  const id = def.id.toLowerCase();
  const idFlat = id.replace(/[-_]+/g, ' ');
  const tagsFlat = (def.tags ?? []).map((x) => x.toLowerCase().replace(/[-_]+/g, ' '));

  if (id === raw) return 100;
  if (idFlat.startsWith(t)) return 60;
  if (tagsFlat.includes(t) || def.kind.toLowerCase() === t) return 40;
  if (def.name.toLowerCase().includes(t)) return 30;
  if (idFlat.includes(t)) return 25;
  if (tagsFlat.some((x) => x.includes(t))) return 15;
  // Source text is a LAST RESORT only: lots of sources mention other pieces
  // ("slides under a sofa", "front sofa legs on"), so searching it in the main
  // pass would make `findDefs('small-space sofa')` return side tables and rugs.
  if (useSource && (def.source ?? '').toLowerCase().includes(t)) return 8;
  return 0;
}

/**
 * Free-text search over id, name, kind and tags - and, only if that finds
 * nothing at all, over `source` too as a rescue pass.
 *
 * Every whitespace-separated token must match (AND), so
 * `findDefs('small-space sofa')` narrows instead of widening. Results are
 * ranked: exact id, then id prefix, then tag/kind, then name, then substring.
 */
export function findDefs(query: string): FurnitureDef[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...DEFS];

  const pass = (useSource: boolean): FurnitureDef[] => {
    const scored: { def: FurnitureDef; score: number }[] = [];
    for (const def of DEFS) {
      let total = 0;
      let matchedAll = true;
      for (const t of tokens) {
        const best = scoreToken(def, t, useSource);
        if (best === 0) {
          matchedAll = false;
          break;
        }
        total += best;
      }
      if (matchedAll) scored.push({ def, score: total });
    }
    return scored
      .sort((a, b) => b.score - a.score || a.def.id.localeCompare(b.def.id))
      .map((s) => s.def);
  };

  const primary = pass(false);
  return primary.length > 0 ? primary : pass(true);
}
