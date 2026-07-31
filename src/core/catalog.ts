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
 * into a room reads as one coherent interior. It is now RETARGETED TO THE
 * REFERENCE PHOTOGRAPH of the actual unit (see the palette section below):
 * warm and cool neutrals, black and charcoal, walnut and oak, off-white, with
 * olive-green, brass and terracotta as the only deliberate accents.
 */

import type { FurnitureDef } from './types';
import { CM, FTIN, IN } from './units';

// ---------------------------------------------------------------- palette
//
// THIS PALETTE IS DERIVED FROM THE REFERENCE PHOTOGRAPH:
//   data/reference/unit-photo-living-west.jpeg
//
// Named once so the catalog stays visually coherent instead of becoming a bag
// of random hexes. These are the only colors used below.
//
// WHY the hexes changed. The first version of this palette was invented before
// we had a photo of the unit, and it leaned cool: a #55677A blue "slate", a
// #3B3F44 blue-cast charcoal, a #242628 cool steel, a #8E8C86 grey rug. The real
// room is warm-dark and high contrast:
//
//   floor    dark wide-plank walnut/espresso, satin sheen - the single most
//            dominant surface in every frame, and it is warm brown
//   walls    flat smooth white, barely off-white, minimal baseboard
//   ceiling  exposed structural concrete - a neutral mid grey, faintly warm
//   glazing  floor-to-ceiling, BLACK anodised aluminium frames. This is the only
//            true black in the room and it is a *cool* black
//   kitchen  dark charcoal-brown slab uppers, pale warm stone counter with a
//            thin edge, pale base cabinets, stainless appliances
//   outlook  bright hazy daylight off mid-rise rooftops and an adjacent glass
//            tower, so everything is lit slightly cool but bounces warm off the
//            floor
//
// Consequences, applied below: every neutral is pulled toward warm; the greys
// lost their blue and became concrete/taupe greys; black and charcoal got darker
// and warmer so a dark piece still reads as an object against the black window
// frames and the dark floor; the wood tones split cleanly into a pale greyed oak
// (like the base cabinets) and a genuinely dark walnut (like the floor). Olive,
// brass and terracotta are the only three accents and they only ever land on
// small pieces.

const OFF_WHITE = '#F2EFE9'; // flat wall white / painted case goods / ceramic
const CREAM = '#E3DCD0'; // undyed cotton, boucle
const OATMEAL = '#CFC4B2'; // natural linen upholstery
const GREIGE = '#A2988A'; // heavier woven upholstery
const SAGE = '#6E7157'; // muted OLIVE-green velvet; the old sage read too cool
const SLATE = '#6E6A64'; // warm concrete grey - NOT the old blue-grey
const CHARCOAL = '#3A3532'; // warm charcoal-brown, i.e. the kitchen uppers
const NEAR_BLACK = '#22211F'; // warm near-black: powder coat, steel, dark legs
const ANOD_BLACK = '#141516'; // the cool black of the window frames + screens
const CONCRETE = '#8E8C88'; // exposed soffit grey; also wool-felt grey
const PALE_STONE = '#D8D2C6'; // the kitchen counter stone, warm pale
const STEEL = '#A8A6A2'; // brushed aluminium / stainless, warm-neutral
const OAK = '#C0A681'; // pale greyed oak / ash, like the base cabinets
const WHITE_OAK = '#D3C3A6'; // white oak veneer: paler and COOLER than OAK on
// purpose - layout A stands a white-oak bed 1 1/2" from an oak-veneer
// nightstand, and if the two render at the same value they read as a matching
// bedroom set, which is the one thing that alcove is not meant to be.
const BAMBOO = '#C7A468'; // natural strand bamboo (the Jarvis desktop)
const WALNUT = '#5E4234'; // dark walnut, matched to the floor planks
const BRASS = '#A88C5C'; // brushed brass hardware and lamp stems
const TERRACOTTA = '#A85B42'; // the one warm accent - pots, a pillow, a pouf
const LEAF = '#5A7A4E'; // foliage under bright hazy daylight
const RUG_BASE = '#CFC5B3'; // flatweave wool ground - lifted to read on a dark floor
const RUG_ALT = '#807A72'; // the darker rug option, now a warm grey
const ALR_GREY = '#8B8D90'; // lenticular / ALR screen fabric: dark by design, see below
const SCREEN_WHITE = '#E6E5E1'; // matte-white projection vinyl, gain ~1.0
const JUTE = '#C2A87E'; // natural banana fibre / jute - the one high-tooth texture
const BLACKOUT = '#3A3833'; // blackout cellular / roller shade fabric
// ---- added for layout G, and each one is a MEASURED target, not a mood ----
const CLAVICLE = '#C4BBAE'; // Maharam Mode 009 hopsack, light warm grey. LRV 50,
// R-B +22. It exists because the sofa is the single biggest tonal decision in
// the living end and layout A spends it on 3.7% LRV; see the layout G header.
const INK_WALL = '#54504A'; // Sherwin-Williams Urbane Bronze SW 7048, LRV 8,
// R-B +10. The ONE dark surface layout G adds, and the only wall in the unit it
// is allowed on. A warm brown-charcoal, not a blue-black: the anodised sections
// own the cool black in this apartment and a second, larger cool black would
// read as a second system.

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
    // Cognac leather. Recoloured against the photo: a terracotta accent fought
    // the warm-brown floor, so the throw pillows go to natural linen instead.
    color: WALNUT,
    accent: OATMEAL,
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
    source: `IKEA KLIPPAN 2-seat, 180 x 88 x 66 cm (5'-11" x 2'-11" x 2'-2"), seat 43 cm RE-VERIFIED 30 Jul 2026 off the IKEA US measurements table: 70 7/8" W x 34 5/8" D x 26" H, seat depth 21 1/4", seat height 16 7/8", $349 sale / $399 regular. THIS IS THE LOWEST-BACKED SOFA IN THE CATALOG AT 26", which is why it keeps earning its place in a plan where sightlines decide everything: it is the only two-seater that can stand within a foot of floor-to-ceiling glass with room to spare, and you look straight over it from the bed or the desk. Its 34 5/8" depth is also 4" shallower than the deep modulars, which is 4" back in the walkway. The current US cover range has no true dark warm neutral - a Bemz or Comfort Works cover in charcoal or espresso is the honest route to this palette.`,
    frontClearance: IN(18),
    lowProfile: true, // 26" back - you can see over it
    tags: ['seating', 'sofa', 'small-space', 'ikea', 'budget', 'low-profile'],
    price: 399,
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
    source: `IKEA NORDEN gateleg table, folded 80 x 26 x 74 cm (2'-7" x 10 1/4"); one leaf 89 cm; both leaves 152 cm (5'-0") deep RE-VERIFIED 30 Jul 2026 off the IKEA US measurements table (birch, 90423887): min length 10 1/4", MID length 35" (seats two), max length 59 7/8" (seats four), width 31 1/2", height 29 1/8", six integral drawers, $349.99, two cartons. THREE lengths out of one object is what makes it the honest 448 sq ft answer: closed it is a 10 1/4"-deep console against a wall, and it folds back out of a projected sightline. The birch is mostly solid (the white version is melamine particleboard) and neither finish matches walnut - stain it or accept it as a deliberate pale note.`,
    frontClearance: IN(60), // must be able to open a leaf AND seat someone
    // A 29-30" top is see-over from a 17-18" seat: a table does not
    // wall off a studio, so keep it out of sightline blocking.
    lowProfile: true,
    tags: ['dining', 'table', 'small-space', 'convertible', 'folding', 'ikea'],
    price: 350,
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
    // Recoloured from the photo: pale stone top on a black base, echoing the
    // kitchen counter and the black window frames rather than adding more wood
    // to a room whose floor is already the loudest wood in the frame.
    color: ANOD_BLACK,
    accent: PALE_STONE,
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
    // Recoloured: an all-brass table was too much metal for this room. Black
    // frame + brass top keeps the accent but ties it to the window mullions.
    color: NEAR_BLACK,
    accent: BRASS,
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
    // Recoloured to the kitchen's dark charcoal-brown slab fronts, so the one
    // big case piece in the room belongs to the same family as the millwork.
    color: CHARCOAL,
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
    // Recoloured: RASKOG in black, not green. It parks next to stainless
    // appliances in the photo, so black powder coat + steel is the honest read.
    color: NEAR_BLACK,
    accent: STEEL,
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
  //
  // STANDING DESK IS A HARD REQUIREMENT for this client - they work from home
  // full time, so every layout has to carry a real sit-stand desk, and the one
  // specified is the Fully Jarvis bamboo. The Jarvis entries come first because
  // they are the requirement; the fixed-height desks below them stay in the
  // catalog for comparison and for secondary surfaces.
  //
  // HOW THE SIT-STAND RANGE IS MODELLED. `FurnitureDef` has one `h`, but a
  // Jarvis has a travel range. So:
  //   - `h` and `seatHeight` are both set to a SEATED work height of 29 1/2".
  //     That is a *default pose*, not a limit: it means a layout rendered
  //     straight out of the catalog shows the desk at normal desk height instead
  //     of floating at 50" like a bar, which is what you want for a plan view
  //     and for the 3D preview.
  //   - the FULL TRAVEL RANGE lives in `source` on every Jarvis entry, and it is
  //     the range - not the surface - that makes this a standing desk. A fixed
  //     29 1/2" top and a Jarvis parked at 29 1/2" are the same object in a
  //     drawing; the difference is that the Jarvis also goes to 50", which is
  //     standing height for a 6'-tall user, and that is the entire point of
  //     buying one. Anything a layout hangs off this desk (monitor arm, tray,
  //     CPU sling) has to survive 25 1/2" of vertical travel, which is why the
  //     cable tray below is not optional.
  //   - `h` is deliberately NOT set to the standing height, because the analyzer
  //     uses `h` for sightlines and a 50" top would wall off a 508 sq ft studio
  //     that in reality only has a 50" top for part of the day.
  //
  // Jarvis frame facts used by every desk entry below (Fully / Herman Miller
  // published specs): 3-stage frame, travel 24.5" to 50" with the 3/4" bamboo
  // top (25.5" to 51" with the thicker laminate top), frame width adjusts
  // roughly 24" to 51" so it carries any of the bamboo tops, 350 lb capacity.
  // Real bamboo top sizes are 30x27, 48x27, 48x30, 60x27, 60x30 and 72x30 in
  // inches - all six are catalogued so a layout can pick the one that fits
  // rather than inventing a size.
  // =====================================================================
  {
    id: 'desk-standing-jarvis-30x27',
    name: 'Fully Jarvis bamboo standing desk, 30" x 27"',
    kind: 'desk',
    // The smallest real bamboo top. 27" deep is shallower than the 30" tops and
    // is the minimum that still puts a 27" monitor at arm's length; 30" wide is
    // a laptop-plus-notebook surface, no more. It exists in this catalog because
    // in a 508 sq ft studio it is sometimes the only Jarvis that fits.
    w: IN(30),
    d: IN(27),
    h: IN(29.5), // seated work height - see the section note on travel
    seatHeight: IN(29.5), // work-surface height
    color: BAMBOO,
    accent: NEAR_BLACK, // black powder-coated frame
    source: `Fully Jarvis Bamboo Standing Desk, 30" x 27" top (smallest bamboo top; sizes are 30x27, 48x27, 48x30, 60x27, 60x30, 72x30). 3-stage frame travel 24.5"-50" with the bamboo top (25.5"-51" laminate), frame width adjusts ~24"-51", 350 lb capacity. The 24.5"-50" RANGE is what makes it a standing desk; h is the seated pose. List price c. 2023 (remembered spec) AVAILABILITY AND PRICE RE-VERIFIED 30 Jul 2026: Fully.com was shut down after MillerKnoll absorbed Fully, but the Jarvis was NOT discontinued - it is made by MillerKnoll and sold through store.hermanmiller.com and dwr.com, both marked Ready to Ship. Bamboo Rectangle tops offered: 48x27, 48x30, 60x27, 60x30, 72x30. Frames: 3-Stage 25.5"-51", 3-Stage Low 23"-43.25", 2-Stage 30"-49.375"; SPECIFY 3-STAGE (the 25.5" bottom end is what makes it sittable by a 5'2" user). 350 lb capacity, 7yr frame/motor and 5yr top warranty. PRICE: the configured Bamboo Rectangle PDP shows $1,195 and the brand index page shows a $1,145-$1,625 range across sizes, stages, handset and powered-grommet options - so $1,195 is a size-INDEPENDENT planning figure and the exact desk must be configured in a cart before ordering. What the client lost with Fully.com: the configurator is down to nine top SKUs and the whole accessory catalogue to nine items. NOTE THE 30x27 TOP IS NO LONGER OFFERED: the MillerKnoll Bamboo Rectangle range as of 30 Jul 2026 is 48x27, 48x30, 60x27, 60x30 and 72x30 only. This entry is kept because the smallest footprint is still the right ANSWER for some plans, but it now has to be sourced second-hand or substituted with the 48x27. PRICE AND TRAVEL CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: the Herman Miller Jarvis Bamboo PDP shows $1,325.00 - IDENTICAL to the laminate SKU, not the $1,195 first recorded here - and the 3-Stage travel is 25.75"-51.25" (3-Stage Low 23"-43.5", 2-Stage 30"-49.5"), which is the laminate figure the earlier note wrongly split between the two. Offered sizes 27x48, 27x60, 30x48, 30x60, 30x72. A 15/20/25% volume-discount ladder is live on both desks, and the "$1,145-$1,625 brand index range" quoted earlier is NOT on the PDP - treat $1,325 as the number and the discount as a windfall.`,
    frontClearance: IN(30), // CLEARANCE.deskChair - roll back AND stand up
    // 29 1/2" work surface in its default pose - see-over, so it does not block
    // sightlines. (Raised to 50" it would, but see the section note.)
    lowProfile: true,
    tags: [
      'wfh', 'jarvis', 'fully', 'desk', 'work', 'standing-desk', 'sit-stand', 'small-space',
      'requirement',
    ],
    price: 1325,
  },
  {
    id: 'desk-standing-jarvis-48x27',
    name: 'Fully Jarvis bamboo standing desk, 48" x 27"',
    kind: 'desk',
    // 48" wide but only 27" deep: the shallow option for a wall where 30" of
    // depth would push the chair into the walkway.
    w: IN(48),
    d: IN(27),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: BAMBOO,
    accent: NEAR_BLACK,
    source: `Fully Jarvis Bamboo Standing Desk, 48" x 27" top. 3-stage frame travel 24.5"-50" with the bamboo top (25.5"-51" laminate), frame width adjusts ~24"-51", 350 lb capacity. The 24.5"-50" RANGE is what makes it a standing desk; h is the seated pose. List price c. 2023 (remembered spec) AVAILABILITY AND PRICE RE-VERIFIED 30 Jul 2026: Fully.com was shut down after MillerKnoll absorbed Fully, but the Jarvis was NOT discontinued - it is made by MillerKnoll and sold through store.hermanmiller.com and dwr.com, both marked Ready to Ship. Bamboo Rectangle tops offered: 48x27, 48x30, 60x27, 60x30, 72x30. Frames: 3-Stage 25.5"-51", 3-Stage Low 23"-43.25", 2-Stage 30"-49.375"; SPECIFY 3-STAGE (the 25.5" bottom end is what makes it sittable by a 5'2" user). 350 lb capacity, 7yr frame/motor and 5yr top warranty. PRICE: the configured Bamboo Rectangle PDP shows $1,195 and the brand index page shows a $1,145-$1,625 range across sizes, stages, handset and powered-grommet options - so $1,195 is a size-INDEPENDENT planning figure and the exact desk must be configured in a cart before ordering. What the client lost with Fully.com: the configurator is down to nine top SKUs and the whole accessory catalogue to nine items. PRICE AND TRAVEL CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: the Herman Miller Jarvis Bamboo PDP shows $1,325.00 - IDENTICAL to the laminate SKU, not the $1,195 first recorded here - and the 3-Stage travel is 25.75"-51.25" (3-Stage Low 23"-43.5", 2-Stage 30"-49.5"), which is the laminate figure the earlier note wrongly split between the two. Offered sizes 27x48, 27x60, 30x48, 30x60, 30x72. A 15/20/25% volume-discount ladder is live on both desks, and the "$1,145-$1,625 brand index range" quoted earlier is NOT on the PDP - treat $1,325 as the number and the discount as a windfall.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: [
      'wfh', 'jarvis', 'fully', 'desk', 'work', 'standing-desk', 'sit-stand', 'small-space',
      'requirement',
    ],
    price: 1325,
  },
  {
    id: 'desk-standing-jarvis-48x30',
    name: 'Fully Jarvis bamboo standing desk, 48" x 30"',
    kind: 'desk',
    // The default recommendation for this unit: 48" x 30" is the smallest top
    // that takes a 32" monitor on an arm plus a keyboard and mouse on a 36" mat,
    // and 30" of depth is what puts a 27-32" screen at a real viewing distance.
    w: IN(48),
    d: IN(30),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: BAMBOO,
    accent: NEAR_BLACK,
    source: `Fully Jarvis Bamboo Standing Desk, 48" x 30" top. 3-stage frame travel 24.5"-50" with the bamboo top (25.5"-51" laminate), frame width adjusts ~24"-51", 350 lb capacity. The 24.5"-50" RANGE is what makes it a standing desk; h is the seated pose. List price c. 2023 (remembered spec) AVAILABILITY AND PRICE RE-VERIFIED 30 Jul 2026: Fully.com was shut down after MillerKnoll absorbed Fully, but the Jarvis was NOT discontinued - it is made by MillerKnoll and sold through store.hermanmiller.com and dwr.com, both marked Ready to Ship. Bamboo Rectangle tops offered: 48x27, 48x30, 60x27, 60x30, 72x30. Frames: 3-Stage 25.5"-51", 3-Stage Low 23"-43.25", 2-Stage 30"-49.375"; SPECIFY 3-STAGE (the 25.5" bottom end is what makes it sittable by a 5'2" user). 350 lb capacity, 7yr frame/motor and 5yr top warranty. PRICE: the configured Bamboo Rectangle PDP shows $1,195 and the brand index page shows a $1,145-$1,625 range across sizes, stages, handset and powered-grommet options - so $1,195 is a size-INDEPENDENT planning figure and the exact desk must be configured in a cart before ordering. What the client lost with Fully.com: the configurator is down to nine top SKUs and the whole accessory catalogue to nine items. PRICE AND TRAVEL CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: the Herman Miller Jarvis Bamboo PDP shows $1,325.00 - IDENTICAL to the laminate SKU, not the $1,195 first recorded here - and the 3-Stage travel is 25.75"-51.25" (3-Stage Low 23"-43.5", 2-Stage 30"-49.5"), which is the laminate figure the earlier note wrongly split between the two. Offered sizes 27x48, 27x60, 30x48, 30x60, 30x72. A 15/20/25% volume-discount ladder is live on both desks, and the "$1,145-$1,625 brand index range" quoted earlier is NOT on the PDP - treat $1,325 as the number and the discount as a windfall.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: [
      'wfh', 'jarvis', 'fully', 'desk', 'work', 'standing-desk', 'sit-stand', 'small-space',
      'requirement',
    ],
    price: 1325,
  },
  {
    id: 'desk-standing-jarvis-60x27',
    name: 'Fully Jarvis bamboo standing desk, 60" x 27"',
    kind: 'desk',
    // 60" wide, shallow. Two monitors side by side on a wall that cannot give up
    // 30" of depth.
    w: IN(60),
    d: IN(27),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: BAMBOO,
    accent: NEAR_BLACK,
    source: `Fully Jarvis Bamboo Standing Desk, 60" x 27" top. 3-stage frame travel 24.5"-50" with the bamboo top (25.5"-51" laminate), frame width adjusts ~24"-51", 350 lb capacity. The 24.5"-50" RANGE is what makes it a standing desk; h is the seated pose. List price c. 2023 (remembered spec) AVAILABILITY AND PRICE RE-VERIFIED 30 Jul 2026: Fully.com was shut down after MillerKnoll absorbed Fully, but the Jarvis was NOT discontinued - it is made by MillerKnoll and sold through store.hermanmiller.com and dwr.com, both marked Ready to Ship. Bamboo Rectangle tops offered: 48x27, 48x30, 60x27, 60x30, 72x30. Frames: 3-Stage 25.5"-51", 3-Stage Low 23"-43.25", 2-Stage 30"-49.375"; SPECIFY 3-STAGE (the 25.5" bottom end is what makes it sittable by a 5'2" user). 350 lb capacity, 7yr frame/motor and 5yr top warranty. PRICE: the configured Bamboo Rectangle PDP shows $1,195 and the brand index page shows a $1,145-$1,625 range across sizes, stages, handset and powered-grommet options - so $1,195 is a size-INDEPENDENT planning figure and the exact desk must be configured in a cart before ordering. What the client lost with Fully.com: the configurator is down to nine top SKUs and the whole accessory catalogue to nine items. PRICE AND TRAVEL CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: the Herman Miller Jarvis Bamboo PDP shows $1,325.00 - IDENTICAL to the laminate SKU, not the $1,195 first recorded here - and the 3-Stage travel is 25.75"-51.25" (3-Stage Low 23"-43.5", 2-Stage 30"-49.5"), which is the laminate figure the earlier note wrongly split between the two. Offered sizes 27x48, 27x60, 30x48, 30x60, 30x72. A 15/20/25% volume-discount ladder is live on both desks, and the "$1,145-$1,625 brand index range" quoted earlier is NOT on the PDP - treat $1,325 as the number and the discount as a windfall.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: [
      'wfh', 'jarvis', 'fully', 'desk', 'work', 'standing-desk', 'sit-stand', 'dual-monitor',
      'requirement',
    ],
    price: 1325,
  },
  {
    id: 'desk-standing-jarvis-60x30',
    name: 'Fully Jarvis bamboo standing desk, 60" x 30"',
    kind: 'desk',
    // The comfortable two-monitor size: 60" of width holds a 34" ultrawide plus
    // a 27" portrait, or two 27" landscape monitors on a dual arm, and still has
    // 30" of depth for the viewing distance those need.
    w: IN(60),
    d: IN(30),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: BAMBOO,
    accent: NEAR_BLACK,
    source: `Fully Jarvis Bamboo Standing Desk, 60" x 30" top. 3-stage frame travel 24.5"-50" with the bamboo top (25.5"-51" laminate), frame width adjusts ~24"-51", 350 lb capacity. The 24.5"-50" RANGE is what makes it a standing desk; h is the seated pose. List price c. 2023 (remembered spec) AVAILABILITY AND PRICE RE-VERIFIED 30 Jul 2026: Fully.com was shut down after MillerKnoll absorbed Fully, but the Jarvis was NOT discontinued - it is made by MillerKnoll and sold through store.hermanmiller.com and dwr.com, both marked Ready to Ship. Bamboo Rectangle tops offered: 48x27, 48x30, 60x27, 60x30, 72x30. Frames: 3-Stage 25.5"-51", 3-Stage Low 23"-43.25", 2-Stage 30"-49.375"; SPECIFY 3-STAGE (the 25.5" bottom end is what makes it sittable by a 5'2" user). 350 lb capacity, 7yr frame/motor and 5yr top warranty. PRICE: the configured Bamboo Rectangle PDP shows $1,195 and the brand index page shows a $1,145-$1,625 range across sizes, stages, handset and powered-grommet options - so $1,195 is a size-INDEPENDENT planning figure and the exact desk must be configured in a cart before ordering. What the client lost with Fully.com: the configurator is down to nine top SKUs and the whole accessory catalogue to nine items. PRICE AND TRAVEL CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: the Herman Miller Jarvis Bamboo PDP shows $1,325.00 - IDENTICAL to the laminate SKU, not the $1,195 first recorded here - and the 3-Stage travel is 25.75"-51.25" (3-Stage Low 23"-43.5", 2-Stage 30"-49.5"), which is the laminate figure the earlier note wrongly split between the two. Offered sizes 27x48, 27x60, 30x48, 30x60, 30x72. A 15/20/25% volume-discount ladder is live on both desks, and the "$1,145-$1,625 brand index range" quoted earlier is NOT on the PDP - treat $1,325 as the number and the discount as a windfall.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: [
      'wfh', 'jarvis', 'fully', 'desk', 'work', 'standing-desk', 'sit-stand', 'dual-monitor',
      'requirement',
    ],
    price: 1325,
  },
  {
    id: 'desk-standing-jarvis-72x30',
    name: 'Fully Jarvis bamboo standing desk, 72" x 30"',
    kind: 'desk',
    // The largest bamboo top: 6'-0" x 2'-6". In this unit that is a whole wall,
    // so it is the "the desk IS the room" option - it only works if the layout
    // gives up a dining table.
    w: IN(72),
    d: IN(30),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: BAMBOO,
    accent: NEAR_BLACK,
    source: `Fully Jarvis Bamboo Standing Desk, 72" x 30" top (largest bamboo top). 3-stage frame travel 24.5"-50" with the bamboo top (25.5"-51" laminate), frame width adjusts ~24"-51", 350 lb capacity. The 24.5"-50" RANGE is what makes it a standing desk; h is the seated pose. List price c. 2023 (remembered spec) AVAILABILITY AND PRICE RE-VERIFIED 30 Jul 2026: Fully.com was shut down after MillerKnoll absorbed Fully, but the Jarvis was NOT discontinued - it is made by MillerKnoll and sold through store.hermanmiller.com and dwr.com, both marked Ready to Ship. Bamboo Rectangle tops offered: 48x27, 48x30, 60x27, 60x30, 72x30. Frames: 3-Stage 25.5"-51", 3-Stage Low 23"-43.25", 2-Stage 30"-49.375"; SPECIFY 3-STAGE (the 25.5" bottom end is what makes it sittable by a 5'2" user). 350 lb capacity, 7yr frame/motor and 5yr top warranty. PRICE: the configured Bamboo Rectangle PDP shows $1,195 and the brand index page shows a $1,145-$1,625 range across sizes, stages, handset and powered-grommet options - so $1,195 is a size-INDEPENDENT planning figure and the exact desk must be configured in a cart before ordering. What the client lost with Fully.com: the configurator is down to nine top SKUs and the whole accessory catalogue to nine items. PRICE AND TRAVEL CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: the Herman Miller Jarvis Bamboo PDP shows $1,325.00 - IDENTICAL to the laminate SKU, not the $1,195 first recorded here - and the 3-Stage travel is 25.75"-51.25" (3-Stage Low 23"-43.5", 2-Stage 30"-49.5"), which is the laminate figure the earlier note wrongly split between the two. Offered sizes 27x48, 27x60, 30x48, 30x60, 30x72. A 15/20/25% volume-discount ladder is live on both desks, and the "$1,145-$1,625 brand index range" quoted earlier is NOT on the PDP - treat $1,325 as the number and the discount as a windfall.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: [
      'wfh', 'jarvis', 'fully', 'desk', 'work', 'standing-desk', 'sit-stand', 'dual-monitor',
      'large', 'requirement',
    ],
    price: 1325,
  },
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
    source: `IKEA MARKUS office chair, 62 x 60 x 129-140 cm, seat 43-54 cm (17"-21 1/4") PRICE RE-VERIFIED 30 Jul 2026: $299.99 regular / $249.99 IKEA Family on a promotion dated 7 Jul - 2 Aug 2026 (Medium, Vissle dark grey; the Large is $329.99). Seat height 17 3/4"-22 7/8" covers the Jarvis 3-Stage's 25.5" bottom deck. The footprint DEPTH here is an estimate: the IKEA listing's 38.05" figure is a packaged or overall-with-recline number, not a seated footprint.`,
    frontClearance: 0, // it IS the clearance the desk asks for
    tags: ['wfh', 'chair', 'work', 'ikea', 'ergonomic'],
    price: 300,
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
    // Recoloured: office chairs in this room read black/charcoal, not blue-grey.
    color: CHARCOAL,
    accent: NEAR_BLACK,
    source: `Armless rolling task chair archetype, 24" x 24" x 36", seat 19" (remembered spec)`,
    frontClearance: 0,
    tags: ['wfh', 'chair', 'work', 'small-space'],
    price: 129,
  },
  {
    id: 'chair-ergonomic-aeron',
    name: 'Herman Miller Aeron task chair, size B',
    kind: 'chair',
    // A person who works from home every day sits in this for ~2000 hours a
    // year, so the catalog needs one properly ergonomic chair and not just the
    // MARKUS and the armless roller above.
    //
    // FOOTPRINT: Herman Miller publish 27" overall width for size B, and the
    // 5-star base circle is about the same across, so 27" x 27" is the honest
    // floor footprint - NOT the 16 1/2"-18 1/2" number on the spec sheet, which
    // is the SEAT depth. The arms are inside that circle.
    w: IN(27),
    d: IN(27),
    h: IN(43), // top of the back at its highest; 38 1/2" at the lowest
    seatHeight: IN(18), // pneumatic 16"-20 1/2"; 18" suits a 29 1/2" work surface
    color: CHARCOAL, // graphite frame
    accent: NEAR_BLACK, // black 8Z Pellicle mesh
    source: `Herman Miller Aeron size B: 27" overall width (5-star base ~27" dia = the footprint), back top 38 1/2"-43", pneumatic seat height 16"-20 1/2", seat depth 16 1/2"-18 1/2"; 18" seat quoted as the nominal for a 29 1/2" work surface (published spec, sizes from the Aeron A/B/C chart) PRICE RE-VERIFIED 30 Jul 2026: $2,150.00 for Size B Graphite as configured on store.hermanmiller.com (volume discounts from $1,000; the June 2026 Aeron price book also shows a $1,520.99 starting configuration). Size B fits 5'5"-6'2" / 150-230 lb, seat height 16"-20 1/2". IMPORTANT: Herman Miller's published 16 3/4" "depth" is the seat/back depth, NOT the caster-to-caster footprint, which is closer to 27" square - plan aisles off 27". Specify Onyx Ultra Matte or Graphite here; polished aluminium would fight the black anodised glazing. RE-VERIFIED 30 Jul 2026: $2,150 configured, 27" x 16 3/4" x 41", seat 16"-20 1/2" - exact, and the caveat about the 16 3/4" figure being seat depth rather than the caster footprint is confirmed: plan aisles off 27". A 25% promotion was live at the time of checking (the Aeron line showing $1,215-$2,013.75 against $1,620-$2,685), so $2,150 is the pre-promotion price.`,
    frontClearance: 0, // it IS the clearance the desk asks for
    // Known, pre-existing model behaviour that is not specific to this chair:
    // desks are solid boxes from the floor to the work surface, so a chair drawn
    // TUCKED UNDER a desk registers as an `overlap` error (MARKUS does the same).
    // Park it clear of the top, or set `ignoreAnalysis` on the placed item.
    tags: ['wfh', 'chair', 'work', 'ergonomic', 'splurge', 'requirement'],
    price: 2150,
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
  // WFH KIT - what actually sits on and under the standing desk
  //
  // A standing desk on its own is not a work-from-home setup. These are the
  // pieces that make the Jarvis usable, all with real dimensions.
  //
  // HOW "CARRIED BY THE DESK" IS MODELLED, and why it looks like a fudge but is
  // not. Everything in this block is carried BY the desk, not by the floor, so
  // every entry sets TWO flags:
  //
  //   wallMounted: true  - in this data model that is the flag for "does not
  //     stand on the floor". analysis.ts excludes wall-mounted items from floor
  //     occupancy, from the in-wall check and from walkway blocking, and
  //     render3d/build.ts lifts the item to `item.z ?? def.defaultZ ?? 0`. That
  //     is exactly what a monitor or a cable tray needs. Nothing here is actually
  //     screwed to a wall; the flag means "off the floor", which it is.
  //
  //   walkable: true  - which analysis.ts reads as "never a collision" (the
  //     comment there is "a rug may sit under anything"). Needed because the
  //     desks above are modelled as SOLID boxes from the floor to the work
  //     surface - there are no legs in this model - so a cable tray hung at 24"
  //     or a CPU sling at 16" is geometrically inside the desk, and a monitor
  //     held out over the top by the arm is geometrically inside the arm. Those
  //     are real physical arrangements, not layout mistakes, and without this
  //     flag every WFH layout would open with five bogus `overlap` errors.
  //     The cost is honest and worth stating: the analyzer will NOT catch a
  //     monitor placed somewhere silly, because it no longer treats any of this
  //     kit as an obstacle. Floor planning is what the analyzer is for, and none
  //     of these objects touch the floor.
  //
  // `defaultZ` values: IN(29.5) = the seated work surface (things ON the top),
  // IN(24) / IN(16) = under the top (things hung BELOW it). All of them ride up
  // and down with the desk in real life; the numbers are the seated pose, to
  // match the desks above.
  //
  // MONITOR GEOMETRY, same rule as the TV section: a 16:9 panel of diagonal D is
  // D * 0.8716 wide and D * 0.4903 tall, so a "27 inch" monitor is 23.5" of
  // active panel - about 23.9" including a modern thin bezel - and NEVER 27"
  // wide. `w` is the cabinet width, `h` is the overall height as it stands on its
  // own stand, and `d` is the STAND BASE depth, which is the number that decides
  // whether it fits a 27"-deep top. The panel itself is only ~2.4" deep, which is
  // what matters if it goes on the monitor arm instead of the stand.
  // =====================================================================
  {
    id: 'monitor-arm-single-jarvis',
    name: 'Fully Jarvis single monitor arm',
    kind: 'box',
    // FOOTPRINT IS THE CLAMP, not the arm. The clamp block is what occupies the
    // back edge of the desktop; the arm and the monitor swing ABOVE the top, so
    // putting the reach in the footprint would be double-counting a volume that
    // never collides with anything. The reach is in `source` because it is what
    // decides whether a 27"-deep top can push the screen far enough away.
    w: IN(3.5),
    d: IN(5),
    h: IN(15.5), // post height above the clamp
    color: STEEL, // silver anodised; also sold in black and white
    accent: NEAR_BLACK,
    source: `Fully Jarvis Monitor Arm (single): supports monitors up to 32" / 19.8 lb, VESA 75 x 100 mm, clamp fits desktops ~0.4"-2.4" thick (grommet mount also included), post ~15 1/2" above the clamp, arm reaches ~24" from the clamp; clamp block ~3 1/2" x 5" (remembered spec) PRICE AND AVAILABILITY RE-VERIFIED 30 Jul 2026 at $175 on the MillerKnoll Fully brand index page (single-with-laptop-tray $225, dual $245, dual-with-tray $295, clamp-mounted surge protector $85). Published capability: 13"-32" monitors up to 19 lb, 13.2" of height travel, max 19.8" above the tabletop, VESA 75/100, clamp or grommet. Those figures come from a search summary of the Herman Miller PDP rather than a spec table read line by line, and the w/d here is the arm's swept envelope, which is an estimate, not a published dimension. RE-VERIFIED 30 Jul 2026: $175, 13"-32", 19 lb, 13.2" of travel, 19.8" maximum height above the top - exact.`,
    frontClearance: 0,
    wallMounted: true, // carried by the desk - see the section note
    walkable: true, // "never a collision" (see section note): the monitor it carries shares this footprint
    defaultZ: IN(29.5), // clamps at the work surface
    tags: ['wfh', 'jarvis', 'fully', 'monitor-arm', 'desk-accessory', 'work', 'ergonomic'],
    price: 175,
  },
  {
    id: 'monitor-arm-dual-jarvis',
    name: 'Fully Jarvis dual monitor arm',
    kind: 'box',
    // Two arms on one post and one clamp, so the footprint is barely bigger than
    // the single - but the SPAN is the constraint: two 27" monitors side by side
    // are ~48" of cabinet, which is why this arm wants a 60" top, not a 48" one.
    w: IN(3.5),
    d: IN(5.5),
    h: IN(17), // taller post so two arms can pass each other
    color: STEEL,
    accent: NEAR_BLACK,
    source: `Fully Jarvis Monitor Arm (dual): two arms on one post/clamp, each supports up to 27" / 19.8 lb, VESA 75 x 100 mm, clamp fits desktops ~0.4"-2.4" thick, post ~17", each arm reaches ~20" from the post; side-by-side span with two 27" monitors is ~48" of cabinet so it needs a 60"+ top; clamp block ~3 1/2" x 5 1/2" (remembered spec) PRICE RE-VERIFIED 30 Jul 2026 at $245 on the MillerKnoll Fully brand index page. The per-head load rating was NOT separately verified - it is assumed to match the single arm's 19 lb, which matters: a 27" panel is 11.5 lb bare and a 32" is 14.4 lb, both comfortable, but a 40" ultrawide is 18.4 lb bare and also fails the 32" size rating outright. RE-VERIFIED 30 Jul 2026: $245 confirmed, and the 19 lb PER HEAD rating is now verified rather than assumed. The 40" width recorded here remains a PLANNING ENVELOPE for two 27" panels side by side, not a product dimension - Herman Miller publishes per-arm figures only.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): the monitors it carries share this footprint
    defaultZ: IN(29.5),
    tags: [
      'wfh', 'jarvis', 'fully', 'monitor-arm', 'desk-accessory', 'work', 'dual-monitor',
      'ergonomic',
    ],
    price: 245,
  },
  {
    id: 'monitor-27',
    name: 'Monitor, 27" 16:9',
    kind: 'tv',
    // Active panel 23.5" x 13.2"; ~23.9" x 14.0" with the bezel. On its stand the
    // whole thing is ~20 1/2" tall at the low setting, so the top of the screen
    // lands at 29.5 + 20.5 = 50" AFF - which is correct: the top of a monitor
    // should be at or just below seated eye height, ~46-50" for most adults.
    w: IN(23.9),
    d: IN(7.9), // STAND BASE depth; the panel itself is only ~2.4"
    h: IN(20.5),
    color: ANOD_BLACK, // matches the window frames, deliberately
    accent: STEEL,
    source: `27" 16:9 monitor: active panel 23.5" x 13.2" (geometry: 27 x 0.8716 by 27 x 0.4903), cabinet ~23.9" x 14.0" with a thin bezel, panel depth ~2.4"; stand base ~7.9" deep, overall ~20 1/2" tall on the stand with ~5" of height adjustment (Dell U2723QE / LG 27UP850 class, remembered spec)`,
    frontClearance: 0,
    wallMounted: true, // sits on the desk, or on the arm above
    walkable: true, // "never a collision" (see section note): held over the top, above both the desk and the arm
    defaultZ: IN(29.5),
    tags: ['wfh', 'monitor', 'screen', 'work', 'desk-accessory'],
    price: 449,
  },
  {
    id: 'monitor-32',
    name: 'Monitor, 32" 16:9',
    kind: 'tv',
    // Active panel 27.9" x 15.7"; ~28.3" x 16.4" with the bezel. A 32" needs
    // ~30" of viewing distance, which is exactly why the 30"-deep Jarvis tops
    // exist and why a 27"-deep top with a 32" monitor is too close.
    w: IN(28.3),
    d: IN(9.4),
    h: IN(22.8),
    color: ANOD_BLACK,
    accent: STEEL,
    source: `32" 16:9 monitor: active panel 27.9" x 15.7" (geometry: 32 x 0.8716 by 32 x 0.4903), cabinet ~28.3" x 16.4", panel depth ~2.4"; stand base ~9.4" deep, overall ~22.8" tall on the stand (Dell U3223QE / LG 32UN880 class, remembered spec)`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): held over the top, above both the desk and the arm
    defaultZ: IN(29.5),
    tags: ['wfh', 'monitor', 'screen', 'work', 'desk-accessory', 'large'],
    price: 799,
  },
  {
    id: 'monitor-ultrawide-34',
    name: 'Ultrawide monitor, 34" 21:9',
    kind: 'tv',
    // 34" measured on the diagonal of a 3440 x 1440 panel = 43:18 = 2.389:1, so
    // the active area is 31.4" x 13.1" - NOT 34" wide. Usually curved (1900R),
    // which is why the stand base is deep for the panel height.
    w: IN(32),
    d: IN(9.1),
    h: IN(19.5),
    color: ANOD_BLACK,
    accent: STEEL,
    source: `34" 21:9 ultrawide (3440 x 1440 = 43:18 = 2.389:1): active panel 31.4" x 13.1" (geometry from the diagonal), cabinet ~32.0" x 14.3", 1900R curve, panel depth ~3"; stand base ~9.1" deep, overall ~19 1/2" tall on the stand (LG 34WN80C / Dell U3423WE class, remembered spec)`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): held over the top, above both the desk and the arm
    defaultZ: IN(29.5),
    tags: ['wfh', 'monitor', 'screen', 'work', 'desk-accessory', 'ultrawide'],
    price: 699,
  },
  {
    id: 'laptop-riser',
    name: 'Laptop riser',
    kind: 'box',
    // 6" of lift is what puts a 14-16" laptop screen's top edge level with the
    // bottom of a 27" monitor, so the two read as one display instead of forcing
    // a neck-down glance. That is the whole justification for the object.
    w: IN(10),
    d: IN(9.5),
    h: IN(6),
    color: STEEL, // brushed aluminium
    accent: NEAR_BLACK,
    source: `Rain Design mStand class aluminium laptop riser, 10" x 9 1/2" x 6" h; lifts a 13-16" laptop ~6" (remembered spec)`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): it sits on the top, inside the desk footprint
    defaultZ: IN(29.5),
    tags: ['wfh', 'laptop', 'desk-accessory', 'work', 'ergonomic'],
    price: 60,
  },
  {
    id: 'cpu-mount-underdesk',
    name: 'Under-desk CPU / mini-PC mount',
    kind: 'box',
    // Hung at the BACK of the underside, where it does not eat knee room. On a
    // sit-stand desk this is not a nice-to-have: a tower left on the floor turns
    // its cables into the thing that stops the desk rising.
    w: IN(10), // sling opens 3 1/2"-10" for the case
    d: IN(12),
    h: IN(12),
    color: NEAR_BLACK,
    accent: STEEL,
    source: `Under-desk CPU holder archetype (Humanscale CPU200 / Fully under-desk mount class): sling adjusts ~3 1/2"-10" for the case width, ~12" deep x ~12" tall, up to 30 lb; hung with its top just under a 29 1/2" work surface so its base sits at 16" AFF (remembered spec) PRICE RE-VERIFIED 30 Jul 2026 against the UPLIFT Desk CPU Holder PDP: $99, supports up to 50 lb, includes a 16" fore-aft track, fits towers 3.75"-8.25" wide, 360-degree swivel for port access, plus a $49 Track Spacer if the desk frame has a crossbar. Note it hangs into the chair pull-back zone, so mount it to one side. Re-verified 30 Jul 2026: $99, 50 lb, 16" track, fits 3.75"-8.25" towers - exact.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): it hangs inside the desk footprint
    defaultZ: IN(16), // top of the sling ~28", i.e. just under the top
    tags: ['wfh', 'desk-accessory', 'under-desk', 'work', 'cable-management'],
    price: 99,
  },
  {
    id: 'cable-tray-jarvis',
    name: 'Fully Jarvis cable management tray',
    kind: 'box',
    // MANDATORY on a sit-stand desk, not decorative. Every cable has to survive
    // 25 1/2" of vertical travel (24.5" -> 50") every day; without a tray the
    // slack either drags on the floor or yanks something off the top. Mounts
    // under the rear of the top, between the legs.
    w: IN(25),
    d: IN(5),
    h: IN(3.5),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `Fully Jarvis wire management tray, ~25" long x ~5" wide x ~3 1/2" deep, screws to the underside at the rear of the top (remembered spec; Fully quote it as a ~25" tray) PRICE CORRECTED TO 0 ON 30 Jul 2026, and the reason matters for the budget: the standalone Fully wire-management tray SKU no longer exists in the MillerKnoll catalogue - the Jarvis ships with its own cable tray, and the only cable accessory still sold is a Fully Clamp-Mounted Surge Protector at $85. So this line is INCLUDED with the desk rather than an extra. It stays in the catalog as its own entry because it is still a real object that occupies real space under the top, and because a sit-stand desk without one is a mistake, not a saving.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): it hangs inside the desk footprint
    defaultZ: IN(24), // hangs below the 29 1/2" top, clear of knees
    tags: ['wfh', 'jarvis', 'fully', 'desk-accessory', 'under-desk', 'cable-management'],
    price: 0,
  },
  {
    id: 'desk-mat-felt',
    name: 'Desk mat, 36" x 17"',
    kind: 'rug',
    // 36 x 17 is the size that covers a full keyboard plus mouse travel; on a
    // 30"-deep top it leaves ~13" behind it for the monitor stand or the arm
    // clamp. Wool felt, ~1/8" thick.
    w: IN(36),
    d: IN(17),
    h: IN(0.125),
    color: CONCRETE, // grey wool felt - reads like the exposed soffit
    accent: CONCRETE, // one piece of felt, one colour: no border panel
    source: `Wool-felt desk pad, 36" x 17" x ~1/8" (Grovemade large / Orbitkey desk mat class, remembered spec)`,
    frontClearance: 0,
    // Carried by the desk, so both flags - see the section note. It is a rug in
    // every sense the model cares about, just one that lies 29 1/2" up.
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): it lies on the top, inside the desk footprint
    defaultZ: IN(29.5),
    lowProfile: true,
    tags: ['wfh', 'desk-accessory', 'work', 'soft'],
    price: 95,
  },
  {
    id: 'lamp-task-clamp',
    name: 'Clamp-on task lamp',
    kind: 'table_lamp',
    // Clamped rather than free-standing for one reason: a sit-stand desk has no
    // spare surface, and a clamp lamp rises with the top so the light stays in
    // the same place relative to the work. Footprint is the bbox the arm sweeps
    // over the desk, which is what can foul a monitor arm.
    w: IN(18),
    d: IN(8),
    h: CM(55), // 1'-9 5/8" above the clamp
    color: NEAR_BLACK,
    accent: STEEL,
    source: `IKEA TERTIAL clamp work lamp: 17 cm shade, 55 cm (1'-9 5/8") above the clamp, arm reach ~45 cm so the swept bbox over the desk is ~18" x 8"; clamp takes the 3/4" bamboo top easily`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // "never a collision" (see section note): it clamps to the top, inside the desk footprint
    defaultZ: IN(29.5),
    tags: ['wfh', 'lighting', 'task-light', 'desk-accessory', 'work', 'ikea', 'budget'],
    price: 15,
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
  //
  // COLOR, from the photo: screens use ANOD_BLACK, the same slightly cool black
  // as the window frames, rather than the warm NEAR_BLACK used for powder-coated
  // legs and steel. In this unit the black frames are the darkest thing in the
  // room and a screen is the only other object allowed to go that dark.
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
    color: ANOD_BLACK,
    accent: ANOD_BLACK,
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
    color: ANOD_BLACK,
    accent: ANOD_BLACK,
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
    color: ANOD_BLACK,
    accent: ANOD_BLACK,
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
    color: ANOD_BLACK,
    accent: ANOD_BLACK,
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
    color: ANOD_BLACK,
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
    // Recoloured: the border goes charcoal, not blue-grey. A big pale rug is
    // what stops the dark floor swallowing the living zone, and a warm-dark
    // border is what keeps it from looking like a dropped bedsheet.
    accent: CHARCOAL,
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
    // Recoloured: black stem, brass shade. A full-brass arc lamp read as jewelry
    // in this room; a black arm reads as a line, like the window mullions it
    // will inevitably be seen against.
    color: NEAR_BLACK,
    accent: BRASS,
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
    // Recoloured: the ceramic body picks up the pale warm stone of the kitchen
    // counter instead of being another wall-white object.
    color: PALE_STONE,
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
    // AN UNGLAZED CONCRETE POT, NOT A TERRACOTTA ONE. This is the plant that
    // stands beside the screen in every layout that uses it, i.e. the most
    // visible pot in the scheme, and terracotta there scattered the one accent
    // across two zones. Grey keeps the viewing zone strictly neutral, leaves
    // the accent concentrated in the sleeping alcove (bed cover + the
    // SANSEVIERIA's pot, which stays terracotta), and echoes the exposed
    // soffit - it is the same grey.
    accent: CONCRETE,
    source: `Medium floor plant archetype: 40" overall in a 10" unglazed concrete pot, 18" spread`,
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
    // Recoloured: black frame. A leaning/hung mirror in this unit reads as a
    // second window, so its frame should match the real ones.
    color: OFF_WHITE,
    accent: ANOD_BLACK,
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

  // =====================================================================
  // PROJECTION - projectors, screens, the credenzas that carry them
  //
  // WHY THIS SECTION IS DIMENSIONED THE WAY IT IS. A projector scheme is the
  // one thing in this project that can be drawn perfectly and still not work,
  // because two invisible numbers decide it:
  //
  //   throw distance = throw ratio x IMAGE WIDTH        (does the picture fit?)
  //   seating distance = f(image width, viewing angle)  (is it watchable?)
  //
  // So every projector carries a real `throwRatio` and a real `lensOffset`, and
  // every screen carries a real `imageDiagonal` - and src/core/analysis.ts does
  // the arithmetic and errors when a placement cannot produce the picture.
  //
  // lensOffset is measured from the face of the cabinet NEAREST THE SCREEN to
  // the lens's optical axis, which for an ultra-short-throw is a much bigger
  // number than you expect. A UST sits facing the room with its BACK a few
  // inches off the wall and throws UP AND BACKWARD over its own body: the lens
  // is near the FRONT of the cabinet, so on a Hisense PX3-PRO the lens is
  // 10 5/8" from the rear face and only ~1" from the front. That is why the
  // published "8 1/2 inches from the wall" and the computed 19" of throw are
  // both true at the same time.
  //
  // THE FINDING THAT GOVERNS THIS WHOLE SECTION, and it is physics rather than
  // taste: at 100" on a 0.6-gain screen a 2,700-lumen projector makes 54 fL of
  // peak white, and a screen face taking only 500 lux of ambient (a
  // conservative figure for a wall 18 ft from an uncurtained full-height west
  // glass wall at midday) sits at 28 fL of BLACK. That is 1.9:1 in-room
  // contrast - a grey rectangle. Even a 5,000-lumen unit only reaches 3.6:1.
  // There is no lumen count purchasable in 2026 that fixes it. Blackout on all
  // four glazing bays is a co-requisite of every projector below, not an
  // accessory, and an ALR screen does NOT substitute for it on the bathroom
  // partition because that wall faces due west, straight down the sightline at
  // the glazing - the one direction a lenticular screen cannot reject.
  // =====================================================================
  {
    id: 'projector-ust-hisense-px3-pro',
    name: 'Hisense PX3-PRO TriChroma laser cinema (UST)',
    kind: 'projector',
    w: IN(21.7),
    d: IN(11.7),
    h: IN(4.8),
    color: NEAR_BLACK,
    accent: CHARCOAL,
    throwRatio: [0.22, 0.22],
    // 0.22 x 87.16" (a 100" 16:9 image) = 19.18" of throw, and the published
    // rear-of-cabinet-to-wall gap at 100" is 8 1/2" - so the lens sits
    // 10 5/8" in from the rear face. The same offset reproduces the published
    // 4.7" @ 80" and 18.1" @ 150" endpoints to within 1/50", which is the
    // check that says the number is right rather than plausible.
    lensOffset: IN(10.65),
    source: `Hisense PX3-PRO: 21.70 x 11.70 x 4.80 in (551 x 297 x 122 mm), 19.8 lb, throw ratio 0.22:1, no lens shift, 80-150" image, RGB triple laser 25,000 h, 4K UHD 0.47" DMD, 3,000 ANSI rated / 2,669 ANSI measured max / ~2,000 lm in the accurate Theater modes, native contrast measured just over 4,000:1 (the best of any UST in this class), 110% BT.2020, 50 W front-firing Harman Kardon with Dolby Atmos, Google TV with licensed Netflix. Street $2,799 / MSRP $3,499. Dimensions, throw and audio from the ProjectorCentral spec page; the 8 1/2" rear-of-cabinet gap at 100" is INTERPOLATED from ProjectorCentral's published 4.7" @ 80" / 18.1" @ 150" endpoints, not from a manufacturer install table - read Hisense's own table before building millwork. Measured fan noise 39.1 dBA at 3 ft (no published rating). INDEPENDENTLY RE-VERIFIED 30 Jul 2026 against ProjectorCentral: 21.7 W x 11.7 D x 4.8 H, 19.8 lb, 0.22:1, 25,000 h, 50 W Harman Kardon, 2-year warranty, street $2,799 / MSRP $3,499 - every field matches, and the 100"/120" rear-gap interpolations are internally coherent with the review's 80" and 150" endpoints (both imply the same lens position 10.6" in from the rear panel). This is the best-verified projector in the catalog.`,
    frontClearance: 0,
    // Lives on a credenza top: the layout MUST set `z` to that top height,
    // because the whole throw geometry hangs off it. Deliberately no defaultZ -
    // a default here would be a guess masquerading as a dimension.
    wallMounted: true,
    walkable: true, // never a collision: it stands on the credenza inside its footprint
    tags: ['projector', 'ust', 'laser-tv', 'av', 'screening', 'recommended'],
    price: 2799,
  },
  {
    id: 'projector-ust-formovie-theater-premium',
    name: 'Formovie Theater Premium 4K UST triple laser',
    kind: 'projector',
    w: IN(21.65),
    d: IN(13.75),
    h: IN(4.23),
    color: CHARCOAL,
    accent: NEAR_BLACK,
    throwRatio: [0.21, 0.21],
    // Published rear-of-cabinet-to-wall 6.25" at 100"; 0.21 x 87.16 = 18.30" of
    // throw, so the lens is 12.05" in from the rear face.
    lensOffset: IN(12.05),
    source: `Formovie (Appotronics) Theater Premium: 21.65 x 13.75 x 4.23 in (550 x 349 x 107 mm), 21.6 lb, throw 0.21:1, 80-150", ALPD RGB+ 4.0 laser 30,000 h, 4K UHD, 2,200 ISO lumens (the DIMMEST unit in this section), 3,000:1 spec / 3,200:1 measured full-on-off, 107% BT.2020 factory calibrated, Dolby Vision + Atmos + DTS-X, 2 x 15 W Bowers & Wilkins, Google TV. PUBLISHED rear-of-cabinet-to-wall: 6.25" at 100", 10.0" at 120". Rated 28 dB but MEASURED 36.9-37.9 dBA at 3 ft. Street $2,799 (ProjectorCentral's spec page says $2,399 street / $3,499 MSRP while its own review says $2,999 street / $2,399 MSRP - self-contradictory, and Formovie's store shows $2,799 sale from $3,499; re-check before quoting). At 120" on a 0.6-gain screen it measured 19.62 fL, only just above the 16 fL dark-cinema floor. PRICE CORRECTED ON AN ADVERSARIAL CHECK, 30 Jul 2026: $2,399 street / $3,499 MSRP is what the ProjectorCentral spec page, its price-comparison page AND Amazon all show. The $2,799 first recorded here matched none of them. The published clearances DO reconcile: 0.21 x 69.7" (an 80" image) = 14.6" of lens-to-screen against a published 2.83" rear gap, and 0.21 x 87.16" (100") = 18.3" against a published 6.25" gap - both imply a lens 11.7-12.05" in from the REAR face, so the lensOffset here is sound. Released Oct 2024, in production.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on the credenza inside its footprint
    tags: ['projector', 'ust', 'laser-tv', 'av', 'screening'],
    price: 2399,
  },
  {
    id: 'projector-ust-hisense-l9q',
    name: 'Hisense L9Q TriChroma laser TV (projector only)',
    kind: 'projector',
    w: IN(24.6),
    d: IN(12.5),
    h: IN(6.5),
    color: OFF_WHITE,
    accent: GREIGE,
    throwRatio: [0.18, 0.18],
    lensOffset: IN(7.3),
    source: `Hisense L9Q: 24.60 x 12.50 x 6.50 in, 28.4 lb, throw 0.18:1, 80-200", RGB triple laser 25,000 h, 4K UHD, 5,000 ANSI lumens (the brightest UST here by 25%), 5,000:1 full-on-off, 110% BT.2020, Dolby Vision + Atmos, 116 W Devialet-tuned audio that is genuinely enough on its own, Google TV. Street $4,999 / MSRP $5,999. THE LENS OFFSET IS APPROXIMATE: the only rear-of-cabinet figures I could find ("21 inches for a 200-inch image, exactly 11.5 inches for a 120-inch setup") come from a third-party aggregator and imply a 0.136 throw ratio rather than the published 0.18:1, so at least one of them is wrong. 7 5/16" is derived from the 120" figure against the published ratio. Confirm against Hisense's install table before committing a plinth dimension. No published fan-noise figure. RE-VERIFIED 30 Jul 2026: dimensions, weight, 0.18:1, 1.0-2.6 ft, 5,000 ANSI, 5,000:1, 25,000 h, 116 W audio and street $4,999 / MSRP $5,999 all match ProjectorCentral, and the screen is NOT included. One correction to the earlier caveat: ProjectorCentral's throw data is NOT self-contradictory (0.18 x 174.7" = 31.4" = 2.6 ft at its 200" maximum). The single unsupported number is the third-party "11.5 in at 120 in" rear gap that lensOffset is derived from - at 120" the lens is 18.8" from the wall, so an 11.5" rear gap needs the lens 7.3" in from the rear panel. Not impossible, but aggregator-derived. Treat lensOffset as provisional and read Hisense's own install table before committing millwork.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on the credenza inside its footprint
    tags: ['projector', 'ust', 'laser-tv', 'av', 'screening', 'bright', 'premium'],
    price: 4999,
  },
  {
    id: 'projector-ust-epson-ls650',
    name: 'Epson EpiqVision Ultra LS650 (UST)',
    kind: 'projector',
    w: IN(18.4),
    d: IN(15.7),
    h: IN(6.2),
    color: NEAR_BLACK,
    accent: CHARCOAL,
    throwRatio: [0.26, 0.26],
    // Published rear-to-wall 10.5" at 100"; 0.26 x 87.16 = 22.66", so 12.16" in.
    lensOffset: IN(12.16),
    source: `Epson EpiqVision Ultra LS650 (V11HB07120): 18.4 x 15.7 x 6.2 in, 16.3 lb, throw 0.26:1, 60-120" ONLY, 4K PRO-UHD (1080p 3LCD with 4-phase pixel shift), 3,600 lm ISO white AND colour (3LCD means colour brightness equals white brightness), 3,485 ANSI measured Dynamic / 2,474 Cinema, laser phosphor. Yamaha 2.1 audio (2 x 5 W + 10 W sub). Android TV 11 with Prime Video, YouTube and Disney+ but NO NETFLIX APP - budget an Apple TV. PUBLISHED rear-of-cabinet-to-wall 10.5" at 100". Price $1,799.99 read off Epson.com 30 Jul 2026, but this is END OF LIFE: one reseller already lists it discontinued and Epson has launched the Lifestudio Grand at $2,699.99 into the same slot. Measured 34.9-44.8 dBA at 2.5 ft with the right-side exhaust as the loud face. Verify stock before pricing.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on the credenza inside its footprint
    tags: ['projector', 'ust', 'laser-tv', 'av', 'screening', 'value'],
    price: 1799,
  },
  {
    id: 'projector-lifestyle-hisense-c2-ultra',
    name: 'Hisense C2 Ultra triple-laser gimbal projector',
    kind: 'projector',
    w: IN(9.7),
    d: IN(9.7),
    h: IN(11.3),
    color: OFF_WHITE,
    accent: STEEL,
    // A real 1.67x optical zoom, which is rare at this price and is what lets one
    // console position serve both a 90" and a 120" image.
    throwRatio: [0.9, 1.5],
    lensOffset: IN(2),
    source: `Hisense C2 Ultra: 4K UHD, RGB triple laser 25,000 h, 3,000 ANSI rated / 2,779 measured max / 2,145 Standard / 1,528 Filmmaker, native contrast only ~1,600:1 measured, throw 0.90-1.50:1 with a 1.67x OPTICAL zoom plus autofocus, auto keystone, obstacle avoidance and wall-colour compensation, NO lens shift, 2 x 10 W JBL plus a 20 W subwoofer in the gimbal base (reviewers call it usable standalone), VIDAA OS (weakest platform of the group but it does carry Netflix, Prime, YouTube, Disney+ and Max), 13.9 lb, measured 34.6-36.0 dB. Street $2,299 / MSRP $2,999. DIMENSIONS CONFLICT between two ProjectorCentral pages - the spec page says 9.70 x 8.50 x 7.10 in and the review says 9.7 W x 11.3 H x 9.7 D; the difference is almost certainly with and without the gimbal base. The larger figure is used here because the base is not removable in normal use. lensOffset is an ESTIMATE of a gimbal-mounted lens's position, not published. DIMENSION CONFLICT RESOLVED EXPLICITLY, 30 Jul 2026. ProjectorCentral prints its dimensions as H x W x D, and its two pages disagree: the spec page gives 7.10 H x 9.70 W x 8.50 D (the BODY) while the review gives 9.7 W x 11.3 H x 9.7 D (WITH the gimbal base). The figures recorded here are the with-base envelope, which is the correct thing for a floor plan because the base is not removable in normal use - but the body alone is 9.7 x 8.5 x 7.1, and a shelf detail should be drawn off whichever of the two actually bears. Price $2,299 street / $2,999 MSRP, 0.90-1.50:1, 1.67x zoom, 25,000 h, 13.9 lb all confirmed. Released Oct 2024.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on a console inside its footprint
    tags: ['projector', 'lifestyle', 'gimbal', 'zoom', 'av', 'screening'],
    price: 2299,
  },
  {
    id: 'projector-lt-epson-qb1000',
    name: 'Epson Home Cinema QB1000 (long throw)',
    kind: 'projector',
    w: IN(20.5),
    d: IN(17.6),
    h: IN(7.6),
    color: NEAR_BLACK,
    accent: ANOD_BLACK,
    throwRatio: [1.35, 2.84],
    lensOffset: IN(3),
    source: `Epson Home Cinema QB1000 (QB1000B black): 20.50 x 17.60 x 7.60 in, 4K PRO-UHD (1080p 3LCD + pixel shift), 3,300 lm ISO white AND colour, 5,000,000:1 dynamic, laser phosphor 20,000 h, VRX 15-element glass lens, 2.1x POWERED zoom, powered focus, POWERED LENS SHIFT V +/-96% / H +/-47% with lens memory, throw 1.35-2.84:1, 32 dB / 22 dB eco. NO SPEAKERS AT ALL and no smart OS - an external streamer and real audio are mandatory, not optional. $7,999. THIS IS THE ONLY PROJECTOR IN THIS SECTION WITH REAL LENS SHIFT, which is what makes it the only one that can legitimately go on a high shelf or a drop and still throw a true rectangle; every other candidate has to sit at or just below the bottom edge of the image. lensOffset is an ESTIMATE for a front-mounted zoom barrel, not published. FULLY RE-VERIFIED 30 Jul 2026 with nothing to refute: 20.5 W x 17.6 D x 7.6 H, 28.2 lb, 3,300 ISO, 5,000,000:1, 1.35-2.84:1 over 10.3-29.5 ft, 2.1x powered zoom, lens shift H +/-47% and V +/-96%, 32/22 dB, $7,999 MSRP = street, 20,000 h, 3-year warranty, Epson.com V11HB23120 live, retail spread $7,550-$7,999, and no QB1100 successor exists.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on a shelf or console inside its footprint
    tags: ['projector', 'long-throw', 'lens-shift', 'av', 'screening', 'premium'],
    price: 7999,
  },
  {
    id: 'projector-portable-xgimi-mogo4-laser',
    name: 'XGIMI MoGo 4 Laser portable projector',
    kind: 'projector',
    w: IN(3.8),
    d: IN(3.8),
    h: IN(8.2),
    color: CHARCOAL,
    accent: BRASS,
    throwRatio: [1.2, 1.2],
    lensOffset: IN(1),
    source: `XGIMI MoGo 4 Laser: 3.80 x 3.80 x 8.20 in, 2.9 lb, 1080p, RGB LASER 550 ISO lumens with a published 1,000:1 full-on-off (versus the LED portables' 400:1) and a much wider gamut, throw 1.20:1 over 3.5-17.4 ft (100" at 8 ft 9 in), 360-degree integrated gimbal stand, autofocus, auto keystone, 2 x 6 W, 2 h battery, Google TV with licensed Netflix, 28 dB. Street $669 / MSRP $799. Light-source life is NOT published. At 550 lumens this is an EVENING-AND-BLACKOUT-ONLY machine: on a 100" gain-1.0 screen it makes about 11 fL, below the 16 fL cinema reference. It is in the catalog as the honest low-commitment option, not as a rival to the USTs.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on a table inside its footprint
    tags: ['projector', 'portable', 'gimbal', 'av', 'screening', 'value'],
    price: 669,
  },

  // ---- the picture -----------------------------------------------------
  //
  // Screens are dimensioned as the OVERALL FRAME (that is the object you hang
  // on the wall and the thing that has to fit between two returns), while
  // `imageDiagonal` records the PICTURE inside it. The two differ by about 5"
  // on a thin-bezel 100", which is exactly enough to make a wall that "just
  // fits" not fit.
  {
    id: 'screen-ust-alr-vividstorm-100',
    name: 'VIVIDSTORM CineVision Pro UST ALR fixed frame, 100" 16:9',
    kind: 'projection_screen',
    w: IN(88.4),
    d: IN(1.5),
    h: IN(50.2),
    imageDiagonal: 100,
    imageAspect: 16 / 9,
    color: '#0D0D0D',
    accent: ALR_GREY,
    source: `VIVIDSTORM CineVision Pro Fixed Frame UST ALR, 100" 16:9 (VCVFFUST100H): lenticular UST ALR, gain 0.6, 170-degree viewing angle, 15 mm / 0.59" ultra-narrow aluminium bezel. Viewing area 87.17" x 49.02" is Vividstorm's published figure; price $1,439.00 and the SKU were read from the live product JSON on vividstormscreen.com. OVERALL 88.4 x 50.2 IS ARITHMETIC (viewing area plus twice the published 0.59" bezel) - Vividstorm publishes no overall frame table - and the 1.5" DEPTH IS AN ESTIMATE. Weight is not published for the lenticular version. WHY VIVIDSTORM AND NOT ELITE: Elite's UST ALR ladder does not offer 100" or 120" AT ALL - Aeon CLR/CLR2/CLR3 come in 103" and 123" (the 115" is discontinued as of 7/9/2026) and CLR5 in 140"/152". Vividstorm (100/120/130), Screen Innovations and Stewart are the only routes to a true 100" UST ALR frame, and this is the most common sizing mistake in UST layouts. On this unit's 9'-6" (114") bathroom partition an 88.4" frame leaves 12.8" of wall each side, which reads as deliberate; a 120" version (105.8" overall) would leave 4.1", which is INSIDE the traced plan's own +/-3.6" tolerance - so 100" is the size to order off a drawing and 120" is the size to order only after someone puts a laser on that wall. 170 degrees of viewing angle also matters more here than gain does, because a congregation area spreads people 8-10 ft wide in front of the picture and the outermost viewer sits about 25 degrees off axis.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(28),
    tags: ['projection', 'screen', 'alr', 'lenticular', 'ust', 'fixed-frame', 'av', 'recommended'],
    price: 1439,
  },
  {
    id: 'screen-mattewhite-silverticket-100',
    name: 'Silver Ticket STR-169100 matte-white fixed frame, 100" 16:9',
    kind: 'projection_screen',
    w: IN(91.875),
    d: IN(1.25),
    h: IN(53.75),
    imageDiagonal: 100,
    imageAspect: 16 / 9,
    color: '#0D0D0D',
    accent: SCREEN_WHITE,
    source: `Silver Ticket STR-169100, 100" 16:9 fixed frame: matte white vinyl gain 1.1, viewing area 87.125" x 49.0", OVERALL 91.875" x 53.75", 2.375" black velvet bezel, 1.25" frame depth, 6-piece knock-down aluminium frame, 27 lb, $229.98 - EVERY NUMBER HERE was read off Silver Ticket's own product page, which makes this the best-sourced screen in the catalog. It also publishes a real HALF-GAIN angle of 80 degrees (a 160-degree half-gain cone), which almost nobody else does: Elite and Vividstorm publish "viewing angle" or "viewing cone", which is a different measurement and must not be compared directly in a spec table. STANDARD THROW ONLY. THE CASE FOR SPENDING $230 RATHER THAN $680: with a standard-throw projector, the west wall genuinely blacked out and the lights off, this will look BETTER than an angular-reflective ALR screen whose viewing cone is 45 degrees left and right - brighter, more uniform, no sparkle, three times cheaper - and the difference should go into the projector. THE CASE AGAINST, and it is about the ceiling rather than the window: an exposed concrete soffit is a large mid-grey diffuse reflector sitting directly above the screen, so it bounces the projector's own light back down onto the screen face even with the room dark, which is exactly the failure mode a ceiling-light-rejecting material is built for. Also note that with the downlights on, letterbox bars on a matte-white 1.1 screen glow grey and the picture loses its edge, whereas a 2.375" black velvet bezel visually absorbs them - so "edge-free minimal" and "good letterbox bars" pull in opposite directions.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(28),
    tags: ['projection', 'screen', 'matte-white', 'fixed-frame', 'long-throw', 'wide-cone', 'av', 'value'],
    price: 230,
  },
  {
    id: 'screen-alr-elite-cinegrey3d-110',
    name: 'Elite Aeon CineGrey 3D edge-free ALR frame, 110" 16:9',
    kind: 'projection_screen',
    w: IN(96.7),
    d: IN(1.3),
    h: IN(54.7),
    imageDiagonal: 110,
    imageAspect: 16 / 9,
    color: '#1A1A1A',
    accent: '#9A9C9E',
    source: `Elite Screens Aeon CineGrey 3D, 110" 16:9 (AR110DHD3): OVERALL 96.7" x 54.7", viewable 95.9" x 53.9", 0.4" EDGE-FREE bezel, 1.3" frame thickness, net weight 24.2 lb - all read off Elite's own "Aeon CineGrey 3D Dimensions Table - M Type" PDF (rev 7/18/2025). Gain 1.2, viewing cone 90 degrees (45 degrees left and right - a CONE half-angle, not a published half-gain figure), 65% ceiling-light rejection, ISF certified, polarised for passive 3D. Price $628.00 from Elite's own store JSON (variant AR110DHD3); focusedtechnology.com lists the 120" at $695.52. STANDARD THROW ONLY - Elite states explicitly that it is not compatible with UST, short-throw or triple-laser projectors. TWO THINGS TO WEIGH: the 0.4" edge-free bezel is what lets a 110" image fit a 9'-6" wall with a clean 8.6" reveal each side (a 2.2"-bezel Sable Frame at the same diagonal is 100.5" overall), but an edge-free frame has no velvet to absorb letterbox bars; and the 45-degree cone will visibly dim for anyone sitting at the outside of a spread congregation area, where 25 degrees off axis is normal.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(28),
    tags: ['projection', 'screen', 'alr', 'edge-free', 'fixed-frame', 'long-throw', 'av'],
    price: 628,
  },
  {
    id: 'screen-floorrise-vividstorm-100',
    name: 'VIVIDSTORM S PRO floor-rising UST ALR screen, 100" 16:9',
    kind: 'projection_screen',
    // The def box is the DEPLOYED envelope: the stowed cabinet footprint (98.43"
    // long x 9.45" deep) with the fabric standing 49.1" above an 8.27" cabinet.
    w: IN(98.43),
    d: IN(9.45),
    h: IN(57.4),
    imageDiagonal: 100,
    imageAspect: 16 / 9,
    color: ANOD_BLACK,
    accent: ALR_GREY,
    source: `VIVIDSTORM S PRO Motorized Tension Floor-Rising UST ALR, 100" (VSDSTUST100H): stowed cabinet 98.43" L x 9.45" W x 8.27" H, net weight 59.52 lb, viewable 87.2" x 49.1", lenticular UST ALR gain 0.6, 170-degree viewing angle, DC tubular motor on a wide-voltage 110-220 V supply, RF remote plus app, voice assistant and a projector trigger dongle. NO MOUNTING REQUIRED - it stands on the floor. Sizes 72"-130". Cabinet dimensions, weight and viewable area from the ProjectorScreen.com product page for VSDSTUST100H; price $1,962.00 from the live Shopify JSON on vividstormscreen.com, and note ProjectorScreen.com sells the SAME SKU at $1,649 - Vividstorm pricing differs by channel by up to 19%, so any budget line built on it is soft.
THIS IS THE CORRECT ANSWER FOR A SCREEN IN FRONT OF THE WEST GLAZING, and the reasons are all structural rather than aesthetic. (1) A ceiling-recessed screen is IMPOSSIBLE here: Elite's own below-ceiling table for a 120" Evanesce needs a 119" x 4.3" opening with 4.7" of clear depth behind the ceiling plane, and you cannot cut that into a structural slab; a furred-down bulkhead would drop that strip to 8'-6 1/2" and throw away the exposed concrete that is the room's best feature. (2) A surface cassette above the glazing head has only 4.0" of concrete to live in (head 8'-8", soffit 9'-0"), and of every cassette surveyed only the Screen Innovations Solo Pro 2 MEDIUM at 3.687" plus a 0.31" bracket actually fits. (3) Overhead anchors into concrete in tension is a code-sensitive application needing a GPR or x-ray scan before drilling, seismic-rated screw anchors and a silica vacuum - usually a landlord "no" in a lease. (4) There is no power in a concrete soffit and every motorised screen plugs in. A floor-riser answers all four: zero anchors, a floor-level outlet, and when it is stowed the view is completely unobstructed, which is the entire point of putting a screen in a window rather than on a wall. It also passes this unit's own 2'-6"-within-1'-0"-of-the-glass rule at 8.27" stowed.
TWO HONEST CAVEATS. The material is UST ALR, so this screen REQUIRES an ultra-short-throw projector sitting a foot or two in front of it - it will not work with a long throw. And Elite describes its comparable CLR3 backing as "black-backing (NON-OPAQUE)"; Vividstorm does not state opacity either way, and a non-opaque fabric in front of full-height west glazing will be back-lit from mid-afternoon and its black level will collapse. Get opacity confirmed in writing, or plan a blackout shade that closes BEHIND the screen. MODELLING NOTE: the def box treats the fabric plane as the cabinet's front face, which is a 2-4" approximation of where the fabric actually rises - smaller than the plan's own +/-3.6" tolerance, but do not dimension millwork off it.`,
    frontClearance: 0,
    // NOT wall-mounted: this one genuinely stands on the floor, and its 9 1/2" of
    // depth in front of the glazing is real floor that has to be drawn.
    tags: ['projection', 'screen', 'alr', 'lenticular', 'ust', 'floor-rising', 'retractable', 'glazing', 'av', 'recommended'],
    price: 1962,
  },
  {
    id: 'screen-painted-wall-118',
    name: 'Screen paint on a level-5 wall, 118" 16:9',
    kind: 'projection_screen',
    // No frame: the panel IS the image. 118" 16:9 = 102.85" x 57.85".
    w: IN(102.85),
    d: IN(0.25),
    h: IN(57.85),
    imageDiagonal: 118,
    imageAspect: 16 / 9,
    color: SCREEN_WHITE,
    accent: SCREEN_WHITE,
    source: `Paint On Screen "Digital Theater White": gain 1.4, coverage 170 sq ft per US gallon, minimum 2 coats, roll or spray, no primer explicitly required - all from Paint On Screen's own product page. Their S1 Ultimate Contrast is a 2.0-gain silver at $249/gallon but hot-spots and shifts colour off axis, which is wrong for spread seating. PRICE $189 IS UNVERIFIED BY CONTAINER SIZE: the page uses an "Amount" selector that would not resolve quart versus gallon. QUANTITY MATHS: a 118" 16:9 image is 41.3 sq ft, so one quart (about 42.5 sq ft) is exactly ONE coat - buy the gallon.
PAINT'S REAL ADVANTAGES HERE ARE SPECIFIC AND WORTH STATING: zero thickness, nothing to look at when it is off, and ANY image size you like - which genuinely matters on the 9'-6" partition, where a 123" frame leaves 3.3" of reveal but a painted 118" image with a 3" flat-black border reads as deliberate.
IT LOSES ON FIVE THINGS, AND THE FIRST IS THE REAL ONE. (1) FLATNESS: on a 103"-wide 4K image one pixel is about 0.024", so roller stipple, drywall imperfections and telegraphed joints all show; screen fabric is optically flat. (2) PREP: the honest requirement is a level-5 skim over the whole screen area, sanded to 220, high-build primer, then 2-4 rolled coats and a flat-black border - three to five days, and the plastering usually costs more than the paint. This unit's flat white walls with no baseboard are almost certainly level 4. (3) NO ALR EXISTS IN PAINT - lenticular optics cannot be rolled on, so paint is STANDARD-THROW-ONLY; under a UST's grazing light every drywall ripple becomes a visible ridge. (4) No tension, no black backing, no velvet bezel to absorb letterbox bars. (5) High-gain silver paints hot-spot off axis. BOTTOM LINE: paint is right here only with a standard-throw projector, a client who will pay a finisher for level-5 over about 45 sq ft, and a wish for a bigger image than any frame that fits the 9'-6" wall. Otherwise a $628 edge-free ALR frame costs less than the plastering.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(28),
    tags: ['projection', 'screen', 'paint', 'painted', 'renter', 'long-throw', 'av', 'value'],
    price: 189,
  },
  {
    id: 'projection-image-100',
    name: 'Projected image, 100" (switched on)',
    kind: 'projection_screen',
    w: IN(87.16),
    d: IN(0.1),
    h: IN(49.03),
    imageDiagonal: 100,
    imageAspect: 16 / 9,
    color: '#DFE8F5',
    accent: '#DFE8F5',
    source: `NOT A PRODUCT - this is the PICTURE, and it exists so a render can show the room in use. Placed coincident with whichever screen the layout specifies, it renders as an emissive rectangle at roughly 300-350 cd/m2 (the estimate for a 2,500 lm projector on a gain-1.0 100" screen) and spills 6500 K light onto the soffit and onto the faces of everyone watching, which is the strongest single cue that a room is occupied. Price 0 - it is the same purchase as the screen. Follows the same convention as bed-murphy-queen-open: one physical object, two catalog entries for its two states. Only place it in a layout intended to be rendered as an EVENING frame; putting a lit screen in a daylight render would assert something this room cannot do - see the projection section header for the foot-lambert arithmetic.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: it is coincident with the screen it lights up
    defaultZ: IN(28),
    tags: ['projection', 'screen', 'lit', 'projected-image', 'render-only', 'av'],
    price: 0,
  },
  {
    id: 'soundbar-compact-38',
    name: 'Compact soundbar, 38"',
    kind: 'speaker',
    w: IN(38),
    d: IN(4.5),
    h: IN(2.6),
    color: NEAR_BLACK,
    accent: CHARCOAL,
    source: `Compact 2.1 soundbar archetype, 38" x 4 1/2" x 2 5/8" (Sonos Beam / Bose Smart Soundbar 550 class, remembered spec). ONLY specify this where the projector has no usable audio of its own: the Epson QB1000 has NO speakers at all and the Optoma UHZ36 has 15 W mono, whereas the Hisense PX3-PRO (50 W Harman Kardon), the Hisense L9Q (116 W Devialet) and the Hisense C2 Ultra (2 x 10 W JBL + 20 W sub) are all genuinely sufficient alone. In a room whose brief forbids visual clutter, a projector with real built-in audio removes a bar, a subwoofer and their cables - that is a design argument, not just a convenience.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: sits on the credenza inside its footprint
    tags: ['speaker', 'soundbar', 'av'],
    price: 449,
  },

  // ---- the plinth the UST stands on ------------------------------------
  //
  // TOP HEIGHT and TOP DEPTH are the two numbers that matter and both are
  // verified for every entry here. A UST body is 11-16" deep and wants an inch
  // behind it for exhaust and cable, so 15 3/4" is the FLOOR for top depth and
  // 16 1/2-18" is the safe band. A 25-26" top puts a UST lens near 31-32" AFF
  // and lands a 100" image roughly 31-80" AFF, clearing both the 8'-8" glazing
  // head and the 9'-0" soffit; a 28 1/4" top pushes the image top to about 84"
  // and starts crowding the soffit; a 36" credenza is unusable.
  {
    id: 'credenza-besta-tv-71',
    name: 'BESTA TV unit, 70 7/8" (UST plinth)',
    kind: 'tv_stand',
    w: IN(70.875),
    d: IN(15.75),
    h: IN(25.25),
    color: CHARCOAL,
    accent: NEAR_BLACK,
    source: `IKEA BESTA TV unit, 70 7/8" x 15 3/4" x 25 1/4", max 55 lb on top, several rear cord outlets, adjustable feet. Read off the IKEA US page (80566037), $110.00 on 30 Jul 2026. CAVEAT: that SKU is an OPEN FRAME - doors, drawers and interiors are separate, so budget frame plus fronts. A closed handleless slab-front combination exists at 70 7/8" x 16 1/2" x 25 5/8" with TIMMERVIKEN black or LAPPVIKEN walnut-effect doors, but every attempt to load a price for it redirected to a category page; note that combination is 25 5/8" tall, not 25 1/4". The published 55 lb top rating is TIGHT for a 20-28 lb UST plus a soundbar.`,
    frontClearance: IN(24),
    tags: ['credenza', 'media', 'ust-plinth', 'projection', 'slab-front', 'value'],
    price: 110,
  },
  {
    id: 'credenza-burrow-carta-48',
    name: 'Burrow Carta credenza, 48" (UST plinth)',
    kind: 'tv_stand',
    w: IN(48),
    d: IN(16.5),
    h: IN(26.25),
    color: WALNUT,
    accent: NEAR_BLACK,
    source: `Burrow Carta Credenza: 48" W x 16 1/2" D x 26 1/4" H, reversible SLIDING slab doors with no exterior hardware at all, solid ash and MDF frame, powder-coated steel legs (Hairpin or Straight), tool-free thumbscrew assembly, flat-pack. Read off the Burrow product page: $939.00 regular, $657 sale, 30 Jul 2026. Burrow rates it for 40-55" televisions. TOP WEIGHT CAPACITY IS NOT PUBLISHED - confirm with Burrow before standing a 20-35 lb UST plus a soundbar on it. The 26 1/4" top is the top of the useful UST band: it lifts the image about an inch above a BESTA, so check the image top edge against the 8'-8" glazing head if the diagonal goes past 100".`,
    frontClearance: IN(24),
    tags: ['credenza', 'media', 'ust-plinth', 'projection', 'slab-front', 'sliding', 'walnut', 'recommended'],
    price: 939,
  },
  {
    id: 'credenza-bdi-corridor-8173',
    name: 'BDI Corridor 8173 low media console',
    kind: 'tv_stand',
    w: IN(79.25),
    d: IN(20.25),
    h: IN(21),
    color: WALNUT,
    accent: BRASS,
    source: `BDI Corridor 8173: 79 1/4" W x 20 1/4" D x 21" H, interior 13.2 x 38.1 x 15.9", MICRO-PERFORATED "speaker-friendly" slab doors so a soundbar and IR pass through with the doors shut, adjustable shelves, integrated cable management, rated to 85" televisions, ships assembled, Chocolate Stained Walnut or Charcoal Stained Ash. NOT MANUFACTURER-VERIFIED: bdiusa.com returns HTTP 403 to automated fetch, so every figure here comes from retailer listings (World Wide Stereo, Abt). Price is messy - $3,499 at one retailer, $3,271 sale against a cited $4,065 MSRP at another. Its 21" top is BELOW the useful UST band in practice: it drops the image bottom to about 27" AFF, which front-row floor sitters start to occlude. And 79 1/4" is 6'-7" of wall - most of the 9'-6" bathroom partition.`,
    frontClearance: IN(24),
    tags: ['credenza', 'media', 'ust-plinth', 'projection', 'acoustic-doors', 'premium'],
    price: 3499,
  },

  // ---- blackout ---------------------------------------------------------
  //
  // THE CO-REQUISITE. See the projection section header for the arithmetic; the
  // short version is that without these the projector is a grey rectangle and
  // the client should buy a television instead.
  //
  // The governing number is the 8'-8" (104") glazing head, and it disqualifies
  // every renter-friendly product on the market: SelectBlinds' Click2Fit Total
  // Blackout - the ONLY product found with integrated side AND bottom tracks,
  // i.e. the only genuine no-drill total blackout - maxes out at 78" x 78";
  // Sleepout's largest suction-cup panel is 86" x 54"; IKEA MAJGULL is 98"
  // long. Only two families reach 104" at all, and both need brackets screwed
  // into the head or jamb.
  //
  // These are dimensioned per BAY: the layout sets `size.w` to the real bay
  // width from plan.ts and `size.h` to how far the blind is drawn down, so one
  // catalog entry serves a bay open, half-drawn or fully closed.
  {
    id: 'shade-blackout-cellular-bay',
    name: 'Blackout cellular shade, per glazing bay',
    kind: 'shade',
    w: IN(36),
    d: IN(3),
    h: IN(4.5),
    color: BLACKOUT,
    accent: NEAR_BLACK,
    source: `SelectBlinds Select Blackout Cellular, 3/4" single cell, orderable 13"-120" wide and 12"-120" high - one of only two product families found that actually reaches this unit's 104" glazing head. Blocks 99% of light THROUGH the fabric. Read off the SelectBlinds page: single cell from $161.99, 1/2" double cell from $180.99; lifts include cordless, continuous loop, top-down/bottom-up and motorised; Click2Fit no-drill is INSIDE MOUNT ONLY and is a different, shorter product. PRICE $320 IS AN ESTIMATE for a configured 36" x 106" shade - the site's calculator would not render, and the only verified figure is the $161.99 starting price. At 104" of drop the real number will be materially higher. SelectBlinds' own copy admits a ~1/8" factory deduction per side on an inside mount, so expect a visible halo down every vertical edge; four bays means EIGHT of them. HARD CONSTRAINT FOUND ON AN ADVERSARIAL CHECK, 30 Jul 2026, and it changes the specification: SelectBlinds' PER-LIFT maximum heights are Cordless Lift & Lock 84", no-drill headrail 84", motorised 96", and CONTINUOUS CORD LOOP 120". This unit's glazing head is 104". So a shade tall enough for these bays can ONLY be ordered on a continuous cord loop - it cannot be cordless and it cannot be no-drill. The blanket "12-120 inches high" quoted earlier hid that. Practical consequence: four cord loops hanging down a floor-to-ceiling glass wall, which is a real aesthetic cost in a minimal scheme and should be shown to the client before they choose cellular over a roller. The $161.99 and $180.99 starting prices are confirmed.
PRICE RESOLVED, 30 Jul 2026 — AND THE ESTIMATE WAS LOW. The configurator was reached on a re-check: Select Blackout Cellular, inside mount, CONTINUOUS CORD LOOP, at a 104" drop prices at $493.89 for a 32 3/4"-wide bay and $544.89 for a 42"-wide bay. This unit's four bays are 32 3/4", 32 1/4", 33 1/4" and 42", so the real four-bay total is about $2,026 — $746 MORE than the $1,280 the earlier layouts carried at $320 a bay. The $320 in the 'price' field has therefore been replaced with $494, the verified narrow-bay figure; a layout with the 3'-6" bay should expect roughly $51 more on that one. THE PRACTICAL CONCLUSION IS THE ROLLER: at $181.99 a bay for the same 104" drop, blackout rollers do the same optical job for about $1,300 less across four bays and without four continuous cord loops hanging down a glass wall, which is the aesthetic cost this entry has been warning about all along.
STATE, AND WHY THE DEFAULT IS UP. A blind has two states and the drawing has to pick one. This def is dimensioned STOWED: h is the cassette plus rolled fabric at the head, and defaultZ puts it at the 8'-8" glazing head, so a layout that simply places one gets the state the window is in for twenty hours a day. That is not a cosmetic choice - drawn at full drop, four bays of blackout turn the 3D scene into a genuinely dark room and every daylight frame renders lit only by two downlights, which is true of a film night and a lie about the apartment. To draw the DEPLOYED state for an evening frame, override it: size: { h: 8.667 } with z: 0, which is the full 8'-8" drop from head to floor.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: FTIN(8, 8) - IN(4.5),
    walkable: true, // never a collision: it lives in the glazing reveal
    tags: ['shade', 'blackout', 'cellular', 'honeycomb', 'window', 'projection'],
    price: 494,
  },
  {
    id: 'shade-blackout-roller-bay',
    name: 'Blackout roller shade, per glazing bay',
    kind: 'shade',
    w: IN(36),
    d: IN(3.5),
    h: IN(3.5),
    color: BLACKOUT,
    accent: ANOD_BLACK,
    source: `Blinds.com Classic Roller with a blackout fabric: height 12"-144" across all lift types (the most headroom of anything found), width 8"-118" on a cord loop, 18"-96" cordless, 16"-96" motorised - so the 33"-42" bays here are fine cordless and it still reaches 144" tall. Starting price read off the page at $29.82 after 30% off (reg. $42.60). "Light Guard" side light blockers are listed as an add-on but ARE NOT PRICED on the page, and the page states plainly that an inside mount "creates a light gap on each side". PRICE RESOLVED, 30 Jul 2026: SelectBlinds Select Blackout Roller, inside mount, exposed roll, 32 3/4" wide x 104" drop configures at $181.99 — so the earlier $210 estimate was HIGH, and a roller is $312 a bay cheaper than the equivalent cellular. 'price' now carries the verified $182. A roller stack at the head is far less visually present than a cellular stack, which matters when the shade sits 4" below a 9'-0" exposed concrete soffit.
STATE, AND WHY THE DEFAULT IS UP. A blind has two states and the drawing has to pick one. This def is dimensioned STOWED: h is the cassette plus rolled fabric at the head, and defaultZ puts it at the 8'-8" glazing head, so a layout that simply places one gets the state the window is in for twenty hours a day. That is not a cosmetic choice - drawn at full drop, four bays of blackout turn the 3D scene into a genuinely dark room and every daylight frame renders lit only by two downlights, which is true of a film night and a lie about the apartment. To draw the DEPLOYED state for an evening frame, override it: size: { h: 8.667 } with z: 0, which is the full 8'-8" drop from head to floor.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: FTIN(8, 8) - IN(3.5),
    walkable: true, // never a collision: it lives in the glazing reveal
    tags: ['shade', 'blackout', 'roller', 'window', 'projection', 'value', 'recommended'],
    price: 182,
  },
  {
    id: 'shade-side-channels-bay',
    name: 'Blackout side channels, per glazing bay (pair)',
    kind: 'shade',
    w: IN(1.5),
    d: IN(1.75),
    h: IN(104),
    color: ANOD_BLACK,
    accent: ANOD_BLACK,
    source: `Sleepy Time Tracks blackout side channels / L-tracks, in a removable-magnetic or permanent-adhesive version; ship in two pieces and are "easily trimmed to fit" with scissors or tin snips, so 104" is reachable by joining sections. Their page publishes NEITHER lengths NOR prices NOR a light-blocking percentage - the $120 per bay is an ESTIMATE and the widely-quoted "97-99% of side light blocked" is vendor and blog marketing, not a tested spec. Renter-relevant caveat straight off their page: on the removable version "the adhesive-backed magnetic strip attached to the wall is intended to remain in place long term", so it is the CHANNEL that comes off, not the strip. Only the jamb face is touched, never the mullion. This is the piece that converts a 98-99% shade into a room a projector can actually work in - and on four bays with only 4" of mullion between them it means EIGHT channel runs.
A PRICED ALTERNATIVE, 30 Jul 2026: SmartWings sells Side Rail Tracks for blackout shades at about $85 per window, which is the first real number found for this part and is $35 under the estimate that has been carried since. 'price' now reads $85; it remains THIRD-PARTY rather than read off a spec table, and it is per window, so four bays is $340.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: it lives in the glazing reveal
    tags: ['shade', 'blackout', 'side-channel', 'window', 'projection', 'light-leak'],
    price: 85,
  },
  // =====================================================================
  // MODERN / MINIMAL, 2026 — real products, re-sourced 30 Jul 2026
  //
  // Everything in this section was picked against one brief: low, quiet, few
  // materials, slab fronts, no visible hardware, warm-dark neutrals that sit
  // with a dark walnut floor, an exposed concrete soffit and black anodised
  // glazing. Nothing ornate, no rolled arms, no nailheads, no chrome.
  //
  // TWO FILTERS DID MOST OF THE WORK, and they eliminated more good-looking
  // furniture than taste did:
  //
  //   THE 30" GLAZING RULE. Nothing over 2'-6" tall may stand within 1'-0" of
  //   the west glass (faces.ts GLASS_MAX_H / GLASS_BAND_E). Published overall
  //   heights that PASS: KLIPPAN 26", JATTEBO 28", Cleon 28", Gus Mix 28.5",
  //   Otio 29", Reid armless on the 1" BLOCK leg 29", Muuto Fiber 29 3/8",
  //   EKENASET 29 7/8". FAIL: SODERHAMN 32 5/8", Floyd The Sofa 2.0 32",
  //   LANGARYD 32 1/4", Burrard 33", Luva Modular 40 3/4". Note the Reid trap:
  //   the SAME module is 29" on the 1" block leg and 32" on the 4" tubular leg.
  //
  //   THE DEPTH BUDGET. Seat depth + a 16" gap + a 24" coffee table + a 30"
  //   walkway. At 38-41" deep that is 9'-0" to 9'-3" consumed out of the
  //   19'-10" north-south dimension before the bed, the desk or a table get an
  //   inch. Verified deep offenders: DWR Como 41 1/4", Luva 39 1/2", Reid 39",
  //   SODERHAMN 39", Gus Mix 38", JATTEBO 37 3/8". Verified shallow winners
  //   that buy the depth back: Cleon 34", KLIPPAN 34 5/8", Otio 34 1/2",
  //   Burrard 35", Muuto Fiber 27 1/4".
  //
  // PRICE HONESTY: mid-2026 pricing on this list is visibly promotional. Where
  // both a sale and a list price were visible the LIST price is recorded, and
  // every entry's source says which figure was actually read off a page and
  // which was not. Several IKEA prices could not be read directly at all and
  // say so in as many words.
  // =====================================================================

  // ---- beds: a real queen, low enough to live under a glass wall --------
  {
    id: 'bed-queen-floyd-walnut',
    name: 'Floyd Bed (Original), queen — walnut, no headboard',
    kind: 'bed',
    w: IN(67),
    d: IN(86),
    // Deck 7 1/2" + a 10" mattress = a 17 1/2" sleeping height, the lowest real
    // queen available. `h` is the made-up bed, which is what the drawings need;
    // 'price' is the FRAME, which is what you actually buy.
    h: IN(17.5),
    seatHeight: IN(17.5),
    color: WALNUT,
    accent: OFF_WHITE,
    source: `Floyd The Floyd Bed (Original), Queen: 67" W x 86" L x 7 1/2" H frame, 6" underbed clearance, 750 lb capacity, tool-free assembly (nylon ratchet straps, no screws), walnut / white oak / birch veneer on black or white powder-coated steel, 100 lb without a headboard. Read directly off the Floyd product page dimensions block; $1,070 regular / $856 member, 30 Jul 2026 (a "Summer Final Sale up to 60% off" was live). The headboard add-on takes overall height to 31 1/2", which FAILS the 30" glazing rule - specify it without. h here is the frame deck plus a 10" mattress; the price is the frame only. Re-verified 30 Jul 2026: $1,070 / $856 member, 67 x 86 x 7.5, 6" clearance, 750 lb - exact.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'platform', 'low', 'walnut', 'flat-pack', 'modern', 'recommended'],
    price: 1070,
  },
  {
    id: 'bed-queen-thuma-classic',
    name: 'Thuma The Classic Bed, queen — no headboard',
    kind: 'bed',
    w: IN(65),
    d: IN(85),
    h: IN(23), // 13" frame + 10" mattress
    seatHeight: IN(23),
    color: WALNUT,
    accent: OFF_WHITE,
    source: `Thuma The Classic Bed, Queen: 65" W x 85" D x 13" H frame with 9" of underbed clearance, exposed Japanese joinery, no tools and no screws - the genuine five-minute flat-pack, which is the difference between a bed you can get into a lift and one you cannot. Finishes Walnut / Natural / Grey / Espresso; Espresso is the closest to this floor. MIXED SOURCING, stated plainly: only the 9" underbed figure, the finish list and "sets up in minutes, no tools required" were read off thuma.co - the PDP is JS-rendered and the dimensions accordion never resolved. The 65 x 85 x 13, the 35" overall-with-headboard figure and the $1,195 queen price all come from 2026 third-party reviews. Do not confuse this with Thuma's separate Essential Bed, whose PDP showed $2,395. With the PillowBoard or Classic Headboard it reaches 35" and FAILS the 30" glazing rule. Its 9" clearance is also the only low queen here that takes real drawers (Classic Underbed Storage Drawers, 35" x 19", $590 a pair, up to four under a queen). h is the frame plus a 10" mattress; the price is the frame. UPGRADED FROM THIRD-PARTY TO SOURCED, 30 Jul 2026: the Queen at $1,195 is now confirmed off thuma.co's own queen collection page, and the 9" underbed figure off the PDP. The 65 x 85 x 13 remains corroborated rather than read off a spec table. The Underbed Storage Drawers are sold singly at $295 each (so $590 for two), not as a set SKU, and the 8" drawer height is still not published anywhere.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'platform', 'low', 'walnut', 'flat-pack', 'modern', 'premium'],
    price: 1195,
  },
  {
    id: 'bed-queen-grimsbu',
    name: 'GRIMSBU queen bed frame (with Luröy base)',
    kind: 'bed',
    w: IN(61),
    d: IN(80.375),
    // 21 5/8" is the HEADBOARD, and it is the tallest part of the piece. That is
    // the whole point of this entry.
    h: IN(21.625),
    seatHeight: IN(20),
    color: OFF_WHITE,
    accent: CREAM,
    source: `IKEA GRIMSBU bed frame, Queen, with the Luroy slatted base: length 80 3/8", width 61", HEIGHT 21 5/8", footboard 10 5/8", headboard 21 5/8", 8 1/4" of clearance under the frame for flat bins. Powder-coated steel in white or grey. Dimensions are IKEA's own measurement list quoted verbatim and I trust them. PRICE NOT VERIFIED: one IKEA listing snippet said $79.00 and an aggregator said $59.00 - treat $79 as approximate. THIS IS THE ONLY QUEEN IN THE CATALOG WHOSE HEADBOARD CLEARS THE 30" GLAZING RULE OUTRIGHT, so it is the only one that can be pushed hard against the west glass with its head toward the window rather than turned to face a solid wall. IKEA's own copy says as much: "the low height is perfect under windows". At roughly $79 it also frees the entire bed budget for the desk and the blackout. IMPORTANT CORRECTION, 30 Jul 2026: the $79 is IKEA US for the white Queen FRAME ONLY (art. 90508513) - THE SLATTED BASE IS A SEPARATE PURCHASE, so this line is not a complete bed and the earlier "with Luroy base" description was wrong. Budget a Luroy or Lonset base on top, and re-price both at the till. The DIMENSIONS are IKEA's own and stand, including the 21 5/8" headboard that is the entire reason this frame is in the catalog.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'low', 'glazing-safe', 'flat-pack', 'value'],
    price: 79,
  },
  {
    id: 'bed-queen-malm-storage-2box',
    name: 'MALM queen bed with 2 storage boxes, dark brown',
    kind: 'bed',
    w: IN(66.125),
    d: IN(83.125),
    h: IN(39.375), // the headboard governs
    seatHeight: IN(25),
    color: WALNUT,
    accent: OFF_WHITE,
    source: `IKEA MALM high bed frame with 2 storage boxes, Queen, dark brown veneer: length 83 1/8", width 66 1/8", footboard 15", HEADBOARD 39 3/8", mattress area 59 7/8" x 79 1/2"; drawer interior 38 5/8" W x 23 1/4" D x 5 7/8" H. Read directly off the IKEA PDP with the measurements quoted verbatim; $399.00 for the Queen on the same page, 30 Jul 2026. This is the under-bed-storage answer at a real price - two full-width drawers on castors built into the frame, which in 448 sq ft replaces a whole dresser. The costs are honest and large: it is the biggest footprint of any queen here, the 15" deck puts the sleeping surface at about 25", and the 39 3/8" headboard FAILS the 30" glazing rule, so it has to go against a solid wall and it eats an aisle. Re-verified 30 Jul 2026: Queen dark brown veneer $399 corroborated; dimensions hold.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'storage', 'drawers', 'value'],
    price: 399,
  },
  {
    id: 'mattress-queen-10in',
    name: 'Queen mattress, 10"',
    kind: 'bed',
    w: IN(60),
    d: IN(80),
    h: IN(10),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `US queen mattress, 60" x 80" x 10". Three verified price points at the same 10" profile, which is the only dimension this layout cares about because every extra inch raises the sleeping height and pushes the bed's silhouette up toward the glazing: Zinus Original Green Tea memory foam $499 (sale, from $718 - read off the Zinus PDP, only 10" offered); Tuft & Needle Original ~$926 (Home Depot's listed price, not T&N's own, so indicative; the 10" thickness is confirmed across four retailers); Avocado Green Hybrid $1,999 at 11" (search summaries of their PDP - and AVOID their 13" Pillow Top variant, which would put a Thuma's sleeping surface at 26" and start to read as a tall bed in a room where the bed is visible from the whole plan). $699 recorded here as the planning figure. NOTE: the bed frames in this catalog already include a 10" mattress in their `+'`h`'+`, so do NOT place this as a second item in a layout unless the mattress is on the floor or in a Murphy cabinet - it is here to be a BUDGET line.`,
    frontClearance: 0,
    tags: ['bed', 'mattress', 'queen', 'budget-line'],
    price: 699,
  },
  {
    id: 'nightstand-floating-walnut',
    name: 'Floating nightstand, walnut (wall-mounted)',
    kind: 'nightstand',
    w: IN(15.7),
    d: IN(12.4),
    h: IN(9),
    color: WALNUT,
    accent: WALNUT,
    source: `Nathan James Jackson wood floating nightstand: 15.7" W x 12.4" D x 9" H, concealed drawer over an open shelf, cord pass-through, 33 lb top load, 11 lb drawer, walnut laminate on engineered wood, bolts for drywall installation, about 70 minutes to assemble. Read directly off the Nathan James PDP; $89.99 sale / $109.99 regular. WALL-MOUNTED, so it costs ZERO FLOOR - which is the answer to the actual constraint in this apartment. Two of them give both bedsides for under $200. Mount the top at 22-26" to sit just above a low mattress. AVAILABILITY FLAG, 30 Jul 2026: price ($89.99 sale / $109.99 regular) and dimensions are confirmed, but the product page is currently OUT OF STOCK with a "Notify Me When Available" button - so it is specifiable but not buyable today. Any floating nightstand of roughly these dimensions substitutes.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(22),
    tags: ['nightstand', 'floating', 'wall-mounted', 'walnut', 'zero-footprint', 'value'],
    price: 90,
  },
  {
    id: 'nightstand-malm-2drawer',
    name: 'MALM 2-drawer nightstand, black-brown',
    kind: 'nightstand',
    w: IN(15.75),
    d: IN(18.875),
    h: IN(21.625),
    color: CHARCOAL,
    accent: CHARCOAL,
    source: `IKEA MALM 2-drawer chest / nightstand, black-brown: 15 3/4" W x 18 7/8" D x 21 5/8" H, slab drawer fronts with no visible hardware. Dimensions are IKEA's measurement text as quoted in search results and corroborated by resale listings of the same SKU. PRICE NOT DIRECTLY VERIFIED - the $199.99 came from a search summary of the IKEA US PDP, which would not load, and it reads high for a MALM 2-drawer; re-check before quoting. At 21 5/8" it clears the 30" glazing rule and matches a 17-19" mattress top on a low frame. PRICE CORRECTED, 30 Jul 2026: the $199.99 recorded earlier is NOT a MALM price - it appears on IKEA's nightstand CATEGORY page, not the MALM product page. MALM 2-drawer is an entry-price chest (IKEA AU $69.99; US historically $99-$129). $129 is used here as the top of that band and it is still UNVERIFIED - check at the till. Dimensions are corroborated.`,
    frontClearance: IN(24),
    tags: ['nightstand', 'slab-front', 'glazing-safe', 'value'],
    price: 129,
  },

  // ---- the congregation: modular and low-backed seating ----------------
  {
    id: 'modular-jattebo-1seat-storage',
    name: 'JÄTTEBO 1-seat module with storage',
    kind: 'sectional',
    w: IN(27.5),
    d: IN(37.375),
    h: IN(28),
    seatHeight: IN(18.125),
    color: SLATE,
    accent: GREIGE,
    source: `IKEA JATTEBO 1-seat module with storage, Tonerud grey: 27 1/2" W x 37 3/8" D x 28" H, seat depth 27 1/8", seat height 18 1/8". Read directly off the IKEA US measurements table (s09471492); $580.00, 30 Jul 2026. Gas-strut lift-up storage under every seat. Three modules make 82 1/2" x 37 3/8" ($1,740) and four make 110" ($2,320). This is the only value-tier modular that is BOTH under 30" tall - so it can stand inside the 1'-0" glazing zone - and hides bedding and throws in a studio with no closet to spare. Narrow 27 1/2" modules let a run be tuned to a wall in 27 1/2" steps. The cost is depth: 27 1/8" of seat is lounge-deep and it eats floor.`,
    frontClearance: IN(16),
    tags: ['seating', 'modular', 'armless', 'storage', 'low-back', 'glazing-safe', 'flat-pack', 'value'],
    price: 580,
  },
  {
    id: 'modular-gus-mix-armless',
    name: 'Gus* Modern Mix Modular armless chair',
    kind: 'sectional',
    w: IN(38),
    d: IN(38),
    h: IN(28.5),
    seatHeight: IN(16.5),
    color: NEAR_BLACK,
    accent: CHARCOAL,
    source: `Gus* Modern Mix Modular Armless Chair: 38" W x 38" D x 28 1/2" H, seat height 16 1/2". A seven-component system (Left Arm, Right Arm, Armless, Corner, Ottoman, Block Table, Prism Table) with integrated underside connectors, so it breaks into three separate 38" cubes for a viewing arrangement and pushes back into a sofa afterwards. Made to order, 10-12 week lead, ships assembled in 38" cubes - the easiest assembled form to get round an angled entry door. Price $1,425 list / $1,140 sale read off gusmodern.com, 30 Jul 2026; three armless modules make a 114" run at $4,275. DIMENSIONS NOT MANUFACTURER-VERIFIED: Gus does not publish its dimension table in page HTML, so the 38 x 38 x 28.5 / 16.5" seat comes from an authorised dealer page plus a corroborating dealer summary. Verify against Gus's spec PDF before drawing. Most fabrics showed as backordered on 30 Jul 2026.`,
    frontClearance: IN(16),
    tags: ['seating', 'modular', 'armless', 'low-back', 'glazing-safe', 'modern', 'recommended'],
    price: 1425,
  },
  {
    id: 'modular-gus-mix-ottoman',
    name: 'Gus* Modern Mix Modular ottoman',
    kind: 'ottoman',
    w: IN(38),
    d: IN(38),
    h: IN(16.5),
    seatHeight: IN(16.5),
    color: NEAR_BLACK,
    accent: CHARCOAL,
    source: `Gus* Modern Mix Modular Ottoman: 38" x 38" x 16 1/2", connects to any Mix Modular unit, ships assembled. Price $955 list / $764 sale read off gusmodern.com, 30 Jul 2026; the DIMENSIONS come from a dealer/search summary of the component set, not from Gus's spec PDF - flagged as unverified. In a 448 sq ft studio the ottoman is the single most useful piece in the room: coffee table for four, extra seat for the fifth guest, footrest the rest of the time. Its 16 1/2" top matches the module seat height exactly, so the pair reads as one plane, and at 16 1/2" it never crosses a projected sightline.`,
    frontClearance: 0,
    walkable: false,
    lowProfile: true,
    tags: ['seating', 'ottoman', 'modular', 'coffee-table', 'low', 'recommended'],
    price: 955,
  },
  {
    id: 'sofa-cleon-56-armless',
    name: 'Blu Dot Cleon 56" armless sofa',
    kind: 'loveseat',
    w: IN(56),
    d: IN(34),
    h: IN(28),
    seatHeight: IN(17),
    color: CHARCOAL,
    // The Cleon is upholstered in ONE fabric, so the cushions are the frame's
    // colour and not a second material. accent = the same charcoal half a tone
    // up, which is what a cushion face actually does under light; it used to be
    // SLATE, a mid warm grey, and that rendered a two-tone sofa nobody sells.
    accent: '#453F3B',
    source: `Blu Dot Cleon 56" Armless Sofa: 56" W x 34" D x 28" H, seat depth 26", seat height 17", 2" base, kiln-dried hardwood frame, sinuous springs, made in USA, 5-year warranty. Price $1,960 in Maharam fabric / $3,390 in leather, read off bludot.com 30 Jul 2026. THE DEPTH IS CONTESTED: Blu Dot suppresses its dimension table in plain page HTML; a listing quoting their spec gives 56 x 34 x 28 while Hive Modern's page for the same product says 56 x 36 x 28. Resolve it before drawing - 2" matters here. Best answer to "compact two-seat under 72 inches": armless, 28" tall so it clears the glazing rule, and simultaneously a sectional module, so one purchase serves the layouts that fit a sectional and the ones that do not. Its 34" depth buys back 4-5" over every 38-39" modular. DELIVERY CONSTRAINT: the 56" frame does NOT knock down and ships freight - measure the angled front door, the corridor turn and the lift car first.`,
    frontClearance: IN(16),
    tags: ['seating', 'loveseat', 'armless', 'modular', 'low-back', 'glazing-safe', 'shallow', 'premium'],
    price: 1960,
  },
  {
    id: 'armchair-ekenaset',
    name: 'EKENÄSET armchair, black',
    kind: 'armchair',
    w: IN(25.25),
    d: IN(30.75),
    h: IN(29.875),
    seatHeight: IN(17.75),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `IKEA EKENASET armchair, Jonsbyn black: 25 1/4" W x 30 3/4" D x 29 7/8" H, seat 22" W x 19 5/8" D x 17 3/4" H, arm height 24 3/4", backrest 18 1/8", 8 5/8" of clearance underneath. Read directly off the IKEA US measurements table (80539015); $349. The narrowest occasional chair in the catalog, and 29 7/8" is JUST inside the 30" glazing rule - by an eighth of an inch, so do not let anyone specify a thicker cushion. Cheap enough to buy two and still fund the projector: two of them add only 4'-2" to a viewing arrangement and they drag out of the way for the desk. Fixed, non-removable cover.`,
    frontClearance: IN(16),
    tags: ['seating', 'armchair', 'narrow', 'glazing-safe', 'flat-pack', 'value'],
    price: 349,
  },
  {
    id: 'armchair-otio-26',
    name: 'Article Otio 26" lounge chair, walnut frame',
    kind: 'armchair',
    w: IN(26.5),
    d: IN(34.5),
    h: IN(29),
    seatHeight: IN(18.5),
    color: GREIGE,
    accent: WALNUT,
    source: `Article Otio 26" Lounge Chair: 26.5" W x 34.5" D x 29" H, seat height 18.5", seat depth 20.5", arm height 22", 44 lb, exposed walnut frame, one carton, about 10 minutes to assemble. Read directly off the Article product page; $699 in fabric, $899 in leather. THE BEST "DRAG IT INTO THE VIEWING ARRANGEMENT" CHAIR IN THE CATALOG: 44 lb is genuinely movable by one person, 29" clears the glazing rule, and the exposed walnut frame repeats the floor instead of fighting it. Its 34 1/2" depth matches the Cleon, so the two line up in plan. The 22" arm sits below the 29" back, so the chair reads low from the side.`,
    frontClearance: IN(16),
    tags: ['seating', 'armchair', 'walnut', 'movable', 'glazing-safe', 'modern', 'recommended'],
    price: 699,
  },
  {
    id: 'armchair-muuto-fiber-lounge',
    name: 'Muuto Fiber lounge chair, wood base',
    kind: 'armchair',
    w: IN(22),
    d: IN(27.25),
    h: IN(29.375),
    seatHeight: IN(15),
    color: SLATE,
    accent: WALNUT,
    source: `Muuto Fiber Lounge Chair (Iskos-Berlin): 22" W x 27 1/4" D x 29 3/8" H, seat height 15". Read directly off the DWR product page; $1,465. Composite shell with wood-fibre content, base in solid wood or tubular steel (Black, Black Oak, Oak, Dark Brown Ash), Remix fabric or Refine Leather shells. Light enough to move one-handed. THE SMALLEST LOUNGE CHAIR IN THE CATALOG AND THE LOWEST SEAT: 22" x 27 1/4" disappears in plan and a 15" seat never blocks a sightline. In a 448 sq ft studio the premium spend should buy a SMALLER object, not a bigger one, and this is the piece that does that.`,
    frontClearance: IN(16),
    tags: ['seating', 'armchair', 'small', 'low', 'glazing-safe', 'modern', 'premium'],
    price: 1465,
  },
  {
    id: 'pouf-jarrestad-18',
    name: 'JÄRRESTAD pouf with storage, 18"',
    kind: 'ottoman',
    w: IN(18.125),
    d: IN(18.125),
    h: IN(16.5),
    seatHeight: IN(16.5),
    color: NEAR_BLACK,
    accent: CHARCOAL,
    source: `IKEA JARRESTAD pouf with storage, Djuparp dark blue (reads almost black in low light) or Tonerud dark beige: 18 1/8" diameter x 16 1/2" high, 13 lb 10 oz, hollow so it stores a throw or spare cushions inside itself. Read directly off the IKEA US page; $99.99 sale / $129.99 regular, 30 Jul 2026. Overflow seating that is also its own storage. Buy three: they stack against a partition when not in use, and at a 16 1/2" seat an occupant's eye lands around 40" AFF, which is ABOVE the bottom of a projected image sitting at 27-32" - so unlike a floor cushion, a pouf can go in the second row.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['seating', 'pouf', 'storage', 'overflow', 'round', 'value'],
    price: 130,
  },
  {
    id: 'floor-cushion-alseda-24',
    name: 'ALSEDA banana-fibre stool, 23 1/2"',
    kind: 'ottoman',
    w: IN(23.5),
    d: IN(23.5),
    h: IN(6.75),
    seatHeight: IN(6.75),
    color: JUTE,
    accent: JUTE,
    source: `IKEA ALSEDA stool, hand-woven banana leaf over a steel frame with rattan binding: 23 1/2" x 23 1/2" x 6 3/4", 8 lb 13 oz, and they stack. Dimensions and the $29.99 price come from a SEARCH-ENGINE READING of the IKEA US page, not a direct page load - confirm on ikea.com. Effectively a firm floor cushion, and the one warm-natural texture in a palette that is otherwise walnut, concrete and black metal. $30 and 9 lb: four live under the credenza and come out only on film night. IMPORTANT SEATING RULE - at 6 3/4" an occupant's eye is around 30" AFF, i.e. AT OR BELOW the bottom edge of a projected image, so floor seating goes in the FRONT row on the rug, never behind the sofa. That is the opposite of how overflow seating is usually planned.`,
    frontClearance: 0,
    walkable: false,
    lowProfile: true,
    tags: ['seating', 'floor-cushion', 'overflow', 'stackable', 'jute', 'front-row', 'value'],
    price: 30,
  },
  {
    id: 'ottoman-bumper-26-round',
    name: 'Blu Dot Bumper large ottoman, 26" round',
    kind: 'ottoman',
    w: IN(26),
    d: IN(26),
    h: IN(15.125),
    seatHeight: IN(15.125),
    color: CHARCOAL,
    accent: OATMEAL,
    source: `Blu Dot Bumper Large Ottoman: 26" diameter x 15 1/8" high, cylindrical, fully upholstered, no visible legs. The $595 regular price IS from bludot.com ($387-$995 depending on textile); the DIMENSIONS came from dimensions.com's entry for the Bumper OUTDOOR Ottoman (Large), which shares the form - Blu Dot's own table for the indoor version was not readable. Verify. Blu Dot sells a matching Bumper Large Ottoman Tray at $250, which converts it into a hard-topped 26" round coffee table - so it is a coffee table on film night and a fifth seat when the tray comes off. At 15 1/8" it never crosses a sightline, and a round object is the right thing to have in the middle of a tight walkway.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['seating', 'ottoman', 'round', 'coffee-table', 'low', 'premium'],
    price: 595,
  },

  // ---- low tables that do not block a projected sightline ---------------
  {
    id: 'coffee-listerby-55',
    name: 'LISTERBY coffee table, 55 1/8" x 23 5/8"',
    kind: 'coffee_table',
    w: IN(55.125),
    d: IN(23.625),
    h: IN(14.625),
    color: WALNUT,
    accent: WALNUT,
    source: `IKEA LISTERBY coffee table, dark-brown beech veneer: 55 1/8" L x 23 5/8" W x 14 5/8" H, max 44 lb on the top and 22 lb on the lower ribbed shelf, solid beech legs. Read directly off the IKEA US measurements table (90562246); $399.99. At 14 5/8" it is BELOW every seat height in this catalog, so it never crosses a sightline, and at 23 5/8" deep the sofa front plus a 16" gap plus the table only consumes about 74" of depth. The lower shelf absorbs remotes and spare cable, which is how a minimal room stays minimal.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['table', 'coffee-table', 'low', 'walnut', 'sightline-safe', 'recommended'],
    price: 400,
  },
  {
    id: 'side-vittsjo-nesting-glass',
    name: 'VITTSJÖ nesting tables, glass, set of 2',
    kind: 'side_table',
    w: IN(35.375),
    d: IN(19.625),
    h: IN(19.625),
    color: ANOD_BLACK,
    accent: ANOD_BLACK,
    source: `IKEA VITTSJO nesting tables, set of 2, black-brown steel with TEMPERED GLASS tops: 35 3/8" x 19 5/8" x 19 5/8" for the pair, max 22 lb per top, one 37 x 21.5 x 3.5" carton, 41.5 lb. Read directly off the IKEA US page (80215332); $149.99. Two tables in one footprint, nesting to 19 5/8". The black steel matches the anodised window frames exactly, and the glass top means this is the ONLY table in the catalog that literally does not interrupt a projected sightline or the view to the west glazing - you see the floor through it. Pull the small one out as a drink table for the fifth guest and push it back afterwards.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['table', 'side-table', 'nesting', 'glass', 'sightline-safe', 'value'],
    price: 150,
  },
  {
    id: 'side-stockholm-nesting-walnut',
    name: 'STOCKHOLM nesting tables, walnut, set of 2',
    kind: 'side_table',
    w: IN(28.375),
    d: IN(18.5),
    h: IN(14.125),
    color: WALNUT,
    accent: WALNUT,
    source: `IKEA STOCKHOLM nesting tables, set of 2, walnut veneer: 28 3/8" L x 18 1/2" W, max height 14 1/8", leaf-shaped tops, legs screw on. Read directly off the IKEA US page (10239713); $399.99. Honest caveat straight from IKEA's own copy and the reviews: the two leaf-shaped tops only PARTIALLY nest. A real walnut face in a room whose floor is walnut, at 14 1/8" so it disappears - use the pair as a split coffee table you can pull apart into two drink tables when the viewing arrangement changes, instead of one big block to drag.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['table', 'side-table', 'nesting', 'walnut', 'low', 'sightline-safe'],
    price: 400,
  },

  // ---- rugs: define the viewing zone on a dark floor -------------------
  {
    id: 'rug-stoense-6x10',
    name: 'STOENSE low-pile rug, 6\'7" x 9\'10"',
    kind: 'rug',
    w: FTIN(6, 7),
    d: FTIN(9, 10),
    h: IN(0.75),
    // IKEA's own colourway is "medium gray" and the swatch is a NEUTRAL mid
    // grey, not the warm taupe RUG_ALT carries for the invented rugs - it is a
    // dyed polypropylene pile, so it has none of the wool/jute warmth. Given its
    // own hex rather than bent toward the palette: this is a real product with a
    // stated colour.
    color: '#8C8A86',
    accent: '#8C8A86',
    source: `IKEA STOENSE rug, low pile, medium grey: 6'7" x 9'10", pile thickness 1/2", TOTAL thickness 3/4", surface density 7.98 oz/sq ft, 100% polypropylene with a synthetic rubber backing so no separate pad is needed on satin LVP. Read directly off the IKEA US page (30426836); $159.99, with 4'4"x6'5" $99.99, 5'7"x7'10" $129.99 and 7'10"x10' $229.99 on the same page. A 3/4" total build is safe under every low sofa here and will not bind flat-pack leg bolts. On an espresso floor a MID-TONE rug defines the viewing zone; an off-white rug reads as a high-contrast island and fights the minimal brief. 7.98 oz/sq ft is also dense enough to damp footfall, which matters under a bare concrete soffit that will otherwise ring.`,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'low-pile', 'acoustic', 'viewing-zone', 'value'],
    price: 160,
  },
  {
    id: 'rug-jute-lohals-6x10',
    name: 'LOHALS flatwoven jute rug, 6\'7" x 9\'10"',
    kind: 'rug',
    w: FTIN(6, 7),
    d: FTIN(9, 10),
    h: IN(0.5),
    color: JUTE,
    accent: JUTE,
    source: `IKEA LOHALS rug, flatwoven, natural jute: 6'7" x 9'10", thickness 1/2", 100% jute. Read directly off the IKEA US page (00277395); $179.99, with 4'4"x6'5" $99.99 and 5'3"x7'7" $129.99 on the same page. IKEA's own copy says it suits a dining area, so it takes chair legs. No backing is supplied - add a pad on satin LVP. Flat-woven, so it slides under a 2" sofa base without lifting the frame, and jute is the honest warm-natural material in a room whose only other warm note is the floor.`,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'jute', 'flatweave', 'natural', 'value'],
    price: 180,
  },
  {
    id: 'rug-nordicknots-desert-8x10',
    name: 'Nordic Knots Desert flatweave rug, 8x10 — Earth',
    kind: 'rug',
    w: FTIN(8, 0),
    d: FTIN(10, 0),
    h: IN(0.28),
    // "A softly faded brown with gentle warm undertones", re-read off the
    // product page 31 Jul 2026. NO BORDER: the rug is a plain field finished
    // with a jute fringe on the short ends, so accent = color and the renderer
    // draws no inset panel. It carried RUG_BASE (a pale wool cream) as its
    // accent before, which - with the field/border inversion that used to live
    // in buildRug - is what made it render as a CREAM rug in every layout while
    // every scheme note called it warm brown.
    color: '#9C7B5C',
    accent: '#9C7B5C',
    source: `Nordic Knots "Desert" in Earth, 8x10: 50% wool / 50% jute flatweave, 7 mm (0.276") TOTAL thickness - the thinnest rug in the catalog - hand-woven in Bhadohi, GoodWeave-certified, jute fringe, free US delivery quoted at 3-6 business days. Composition, thickness and the colour description ("a softly faded brown with gentle warm undertones") were read off the Nordic Knots product page. PRICE CAVEAT: both the product page and the 8x10 filter page show only "From $395.00" and no size-specific 8x10 price could be extracted - treat $395 as a FLOOR. At 0.28" it can run under the seating AND continue under a 15 3/4"-deep credenza without shimming anything, and warm brown is the right value against espresso LVP: a half-tone lighter than the floor, which is exactly how you read a rug edge on a dark floor.`,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'flatweave', 'wool', 'jute', 'thin', 'viewing-zone', 'recommended'],
    price: 395,
  },
  {
    id: 'rug-nordicknots-zero-warmgray-8x10',
    name: 'Nordic Knots Zero flatweave rug, 8x10 — Warm Gray',
    kind: 'rug',
    w: FTIN(8, 0),
    d: FTIN(10, 0),
    h: IN(0.276),
    // UNDYED wool, so the colour is the sheep's and it varies across the piece.
    // 31% LRV, which is the number that earns it a place: the floor measures
    // 10-14% (finishes.ts), the soffit 26%, the nightstand 40%. It is the only
    // soft surface in the scheme between 4% and 56% - see the layout A COLOUR
    // note, which used to have a hole exactly there. Warm grey, NOT blue-grey:
    // R-B is +18, which is the whole difference between bridging a warm floor
    // and fighting it, and the reason the palette banned #55677A in the first
    // place. Solid field, no border, so accent = color.
    color: '#9E978C',
    accent: '#9E978C',
    source: `Nordic Knots "Zero" in Warm Gray, 8x10: 100% UNDYED wool flatweave, 7 mm total thickness, hand-woven, a plain solid field with no border and no pattern - the collection exists to show "the natural quality and characteristics of wool in its purest form", and the shade is the natural colour of the fleece rather than a dye lot, so it varies within the piece and between production runs. From $395.00 with free standard US delivery quoted at 3-6 business days. Composition, the 7 mm build, the undyed/solid-field description and the delivery window were read off nordicknots.com 31 Jul 2026; the same "From" price caveat as the Desert applies - no size-specific 8x10 figure could be extracted, so treat $395 as a FLOOR. SPECIFIED OVER THE DESERT IN LAYOUT A ON AESTHETIC GROUNDS, and the geometry is identical so nothing in that plan moves: 7 mm is the same build, which is what lets it run under a parked task chair without rucking and under the plinth without shimming. What changes is that the viewing floor stops being brown-on-brown - the Desert is the floor's own hue one value up - and becomes a neutral the espresso planks read against. It also gives the exposed concrete soffit a partner at eye level, which nothing else in the scheme did, and it is MATERIAL rather than COLOUR, which is the register the rest of this apartment is already in. HONEST COST: at 31% against the Desert's 22% it returns roughly 1.6x as much projector light to the screen - see the layout A PROJECTION note, where the walls are a bigger term than every furnishing combined.`,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'flatweave', 'wool', 'undyed', 'thin', 'viewing-zone', 'neutral', 'recommended'],
    price: 395,
  },

  // ---- dining and guest seating that stows ------------------------------
  {
    id: 'dining-docksta-40-round',
    name: 'DOCKSTA table, 40 1/2" round, black',
    kind: 'dining_table',
    w: IN(40.5),
    d: IN(40.5),
    h: IN(29.5),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `IKEA DOCKSTA table, black/black, 40 1/2" round pedestal: diameter 40 1/2", height 29 1/2", "seats 4", laminate top on a powder-coated steel underframe, two cartons. Read directly off the IKEA US page (s99418848); $279.99. The 23 5/8" base diameter comes from a corroborating dimension source, not the IKEA page. A round pedestal is the right dining geometry for 448 sq ft: chairs tuck from any angle, there is no corner leg to bark a shin on in a walkway, and a round table needs less clear surround than a rectangle. THE REAL COST, stated: 40 1/2" plus a 36" pull-out on two sides is a 9'-4" clear diameter, which makes it the largest space consumer in the unit after the bed. A matte black tulip base is also the most restrained dining move available and it echoes the glazing frames.`,
    frontClearance: IN(36),
    tags: ['dining', 'round', 'pedestal', 'black', 'value'],
    price: 280,
  },
  {
    id: 'chair-frosvi-folding',
    name: 'FRÖSVI folding chair, black',
    kind: 'chair',
    w: IN(17.375),
    d: IN(20.125),
    h: IN(30.375),
    seatHeight: IN(18.125),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `IKEA FROSVI folding chair, black solid beech: 17 3/8" W x 20 1/8" D x 30 3/8" H, seat 15" W x 13" D x 18 1/8" H; FOLDED 17 1/4" x 34 3/4" x 3", with a hanging hole in the back for wall storage. Max load 243 lb. ARRIVES PRE-ASSEMBLED, so it goes through an angled entry door edge-on with nothing to build. Read directly off the IKEA US page (10534318); $35. The real answer for guest seating in a studio: four stack to 12" against the laundry closet wall, come out for dinner or a screening, and cost $140 all in. At 30 3/8" it is just OVER the 30" glazing rule, so store them away from the glass.`,
    frontClearance: IN(30),
    tags: ['chair', 'folding', 'guest', 'stows', 'value'],
    price: 35,
  },
  {
    id: 'stool-stig-counter',
    name: 'STIG counter stool with backrest, black',
    kind: 'bar_stool',
    w: IN(15.75),
    d: IN(16.5),
    h: IN(35.375),
    seatHeight: IN(24.75),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `IKEA STIG bar stool with backrest, black/black: 15 3/4" W x 16 1/2" D x 35 3/8" H, seat height 24 3/4" (COUNTER height, needing a 35-36" counter), seat 14 1/8" x 13 3/8", max load 220 lb, powder-coated steel frame with a recycled-content polypropylene shell, STACKABLE - which is the whole point. Read directly off the IKEA US page (30498418); $34.99. Two stools at the galley counter is the zero-floor-area dining option, but HARD CHECK FIRST: a galley run with a slab base and no counter overhang will not take stools at all - you need 10-12" of knee overhang past the cabinet base, and the reference photograph of this unit does not show one. Verify before specifying.`,
    frontClearance: IN(18),
    tags: ['seating', 'bar-stool', 'counter', 'stackable', 'value'],
    price: 35,
  },

  // ---- storage: the only free storage here is wall-hung -----------------
  //
  // A 63" dresser costs 8.2 sq ft of a 448 sq ft plan - about 1.8% of the whole
  // apartment for one piece. Against that, everything wall-hung is free.
  {
    id: 'wardrobe-pax-mehamn-sliding-59',
    name: 'PAX / MEHAMN sliding wardrobe, 59" — walnut effect',
    kind: 'wardrobe',
    w: IN(59),
    d: IN(26),
    h: IN(79.125),
    color: WALNUT,
    accent: CHARCOAL,
    source: `IKEA PAX / MEHAMN wardrobe with SLIDING doors, dark grey-black frame with double-sided walnut-effect fronts: 59" W x 26" D x 79 1/8" H, $1,125.00, read directly off the IKEA US PDP. Included in that combination: wall-mounted frame, sliding door frames with rail, clothes rail, drawers (one glass-front), pull-out trays, glass shelf, pull-out pants hanger. A 93 1/8"-tall version of the same combination exists and still clears a 9'-0" ceiling with 15" to spare, as does a 78 3/4" width. SLIDING IS NOT A PREFERENCE HERE, IT IS THE DECISION: sliding at 26" deep versus a hinged PAX frame at 22 7/8" costs 3 1/8" of permanent depth and saves about 24" of swing, and in a leg where the bed aisle and the desk chair zone already compete, 24" of intermittent swing is worse than 3" of permanent depth every time. A 24"-wide hinged door needs roughly 47" of clear floor in front of it. Slab MEHAMN fronts, no visible hardware. PARTIALLY CONFIRMED, 30 Jul 2026: $1,125 remains unconfirmed directly, but the taller sibling combination is listed at $1,155, which makes it plausible. One correction: that taller version is 92 7/8" high, not the 93 1/8" quoted earlier.`,
    frontClearance: IN(24),
    tags: ['storage', 'wardrobe', 'sliding', 'slab-front', 'walnut', 'recommended'],
    price: 1125,
  },
  {
    id: 'shelf-string-wall-3bay',
    name: 'String wall shelving, 3 bays x 24" — white/walnut',
    kind: 'shelf',
    w: IN(69.375),
    d: IN(11.875),
    h: IN(29.625),
    color: WALNUT,
    accent: OFF_WHITE,
    source: `String Furniture String Wall Shelving via Design Within Reach, 30" high / 3 bays / 24" shelves: 29 5/8" H x 69 3/8" W x 11 7/8" D, 55 lb per 24" shelf (33 lb per 32" shelf), powder-coated steel side panels with lacquered or veneered MDF shelves, White/Walnut or Black/Walnut. Read directly off the DWR configuration table; $645.00. The same table lists a 1-bay at 23 3/8" wide, a 2-bay at 46 3/8" and 32"-shelf variants up to 93". WALL-HUNG, so it costs ZERO FLOOR - and it is modular, so extension bays, cabinets and drawer units clip into the same side panels, which is how you keep a studio from looking like five different catalogues. Re-verified 30 Jul 2026: $645, 29 5/8 x 69 3/8 x 11 7/8, 55 lb per shelf - exact.`,
    frontClearance: IN(24),
    wallMounted: true,
    defaultZ: IN(30),
    tags: ['storage', 'shelf', 'wall-mounted', 'zero-footprint', 'walnut', 'modular', 'premium'],
    price: 645,
  },
  {
    id: 'entry-trones-shoe',
    name: 'TRONES shoe cabinet, wall-mounted',
    kind: 'cabinet',
    w: IN(20.5),
    d: IN(7.125),
    h: IN(15.375),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `IKEA TRONES shoe / storage cabinet, black: 20 1/2" x 7 1/8" x 15 3/8" (52 x 18 x 39 cm), wall-mounted, tilt-out, holds about four pairs, stackable so two or three give 8-12 pairs in 20 1/2" of wall, slab front with no visible hardware. Dimensions are IKEA's own, quoted verbatim across listing snippets. PRICE NOT VERIFIED - no snippet showed a US price; $45 is a recollection of the two-pack and must be confirmed. At 7 1/8" deep it does not project into a door swing, which is what makes it the right answer for an entry nook with an ANGLED front door where nothing with real depth works. PRICE CORRECTED, 30 Jul 2026: IKEA US official is $39.99 for a TWO-PACK (art. 803.973.13), not the $45 recollection. Dimensions confirmed.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(4),
    tags: ['storage', 'entry', 'shoes', 'wall-mounted', 'shallow', 'value'],
    price: 40,
  },
  {
    id: 'dresser-malm-6drawer-63',
    name: 'MALM 6-drawer chest, 63" — black-brown',
    kind: 'dresser',
    w: IN(63),
    d: IN(18.875),
    h: IN(30.75),
    color: CHARCOAL,
    accent: CHARCOAL,
    source: `IKEA MALM 6-drawer chest, black-brown: 63" W x 18 7/8" D x 30 3/4" H, slab fronts with no visible hardware. Dimensions corroborated across IKEA's measurement text and an independently measured drawing. PRICE NOT VERIFIED - search results gave only a MALM series range of "$79-$279 (US)" and $279 is the top of that range, i.e. a guess; confirm. 63" of drawer is the most storage per square foot of anything in the catalog, and the slab fronts are exactly the brief. ONE HARD CONSTRAINT: at 30 3/4" it is 3/4" OVER the 30" glazing limit, so it cannot stand within a foot of the west glass. PRICE CORRECTED, 30 Jul 2026: live US listings for the 63" black-brown SKU (60403579) return $299.99, with one conflicting $179. $300 is used here. Dimensions 63 x 18 7/8 x 30 3/4 confirmed.`,
    frontClearance: IN(30),
    tags: ['storage', 'dresser', 'slab-front', 'value'],
    price: 300,
  },

  // ---- desk kit additions ----------------------------------------------
  {
    id: 'desk-standing-jarvis-laminate-60x27-walnut',
    name: 'Fully Jarvis laminate standing desk, 60" x 27" — walnut',
    kind: 'desk',
    w: IN(60),
    d: IN(27),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: WALNUT,
    accent: NEAR_BLACK,
    source: `Fully (by MillerKnoll) Jarvis LAMINATE Standing Desk, 27" x 60", walnut laminate on a black 3-Stage frame: travel 25.75"-51.25", 350 lb capacity, waterproof scratch-resistant laminate over a core of 84%+ pre-consumer recycled wood fibre. Read directly off the Herman Miller PDP: sizes 27x48, 27x60, 30x72; laminate colours Black, White, Maple, Oak, Stone, WALNUT; "Ready to Ship"; PDP price $1,325.00, with the brand index page showing $1,095-$1,575 across the laminate range. WHY THIS RATHER THAN THE BAMBOO: if the desk is going to stand in the open in a studio rather than in a corner, walnut laminate reads as furniture instead of as office equipment - and it is the only Jarvis top that matches this floor outright. The cost is 3" of depth, which is the difference between a 27" monitor being comfortable and a 32" being too close: 27" of top leaves a 32" panel on its own stand only about 18" of viewing distance.`,
    frontClearance: IN(30),
    tags: ['wfh', 'jarvis', 'fully', 'sit-stand', 'desk', 'work', 'walnut', 'laminate'],
    price: 1325,
  },
  {
    id: 'desk-standing-jarvis-laminate-48x27-black',
    name: 'Fully Jarvis laminate standing desk, 48" x 27" — black',
    kind: 'desk',
    w: IN(48),
    d: IN(27),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `Fully (by MillerKnoll) Jarvis LAMINATE Standing Desk, 27" x 48", BLACK laminate on a black 3-Stage frame: travel 25.75"-51.25", 350 lb capacity, waterproof scratch-resistant laminate over a core of 84%+ pre-consumer recycled wood fibre. Same specs and the same $1,325 as the walnut entry above — the laminate colourway list read off the Herman Miller PDP is Black, White, Maple, Oak, Stone and Walnut, and the offered sizes are 27x48, 27x60 and 30x72. WHY THIS ENTRY EXISTS: it is the ONLY way to give layout D a dark work surface. That layout wants what the MAGNUS Pro gives every other scheme here — a matte dark top that neither bounces west sun at the user nor bounces projector light back at a 118" image — but it needs a 48" top to keep the chair pull-back and the projector beam out of each other, and MAGNUS Pro starts at 59.1". A 48" black laminate Jarvis is the same width as the bamboo top it replaces, the same $1,325, and dark. IT IS COST-NEUTRAL AND GEOMETRY-NEUTRAL: the only thing that changes is the colour, which is the only thing that needed to. Same caveat as every Jarvis line here — MillerKnoll's Fully pages are a JS shell, so the colourway and price are third-party reads and should be confirmed in a cart.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: ['wfh', 'jarvis', 'fully', 'sit-stand', 'desk', 'work', 'black', 'dark', 'laminate'],
    price: 1325,
  },
  {
    id: 'desk-standing-magnus-pro',
    name: 'Secretlab MAGNUS Pro metal standing desk, 59.1" x 27.6"',
    kind: 'desk',
    w: IN(59.1),
    d: IN(27.6),
    h: IN(29.5),
    seatHeight: IN(29.5),
    // THE TOP IS THE DARKEST LARGE HORIZONTAL SURFACE IN ANY OF THESE PLANS and
    // that is the reason it is specified, not a side effect. See the source.
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `Secretlab MAGNUS Pro, standard size: 59.1" x 27.6" top (1500 x 700 mm), electric sit-stand travel 25.6"-49.2" (650-1250 mm), 260 lb capacity, three programmable height presets, powder-coated steel top with magnetic cable management, a built-in under-top cable tray and an integrated power-supply column that terminates in a mains socket inside that tray. Finishes: Black or Magnetite frame, Black Laminate or Stealth desktop. $799 for the standard size, $949 for the Pro XL. SIZES AND PRICES READ OFF REVIEW AND INDEX SOURCES (TechSpot, Tom's Guide, Standing Desk Reference), 31 Jul 2026, NOT off the Secretlab PDP — secretlab.co rate-limited every fetch on the day, so treat $799 as a planning figure and confirm in a cart. The standard-size DESK WEIGHT and carton split are also unverified; the XL is documented at 150 lb in two cartons of about 60 kg and 23 kg, so the standard size is lighter but still a two-person carry through the angled front door.

WHY IT IS IN THIS CATALOG, AND WHY IT IS DARK ON PURPOSE. The client owns a black desk and asked whether that is a problem. It is not — it is better than the bamboo these layouts used to draw, and much better than white, for two reasons that are specific to this unit and independent of taste. (1) WEST SUN. Every layout here sits the user with 18'-6" of floor-to-ceiling west glazing on one side, taking direct sun from about 3pm to sunset. A matte dark top is low-reflectance and does not bounce that sun up under the monitor; a white top is a ~12 sq ft high-reflectance plane doing exactly that. (2) IN-ROOM CONTRAST. Layouts A, C, D and E all put a projected image in the same room as the desk, and layout A's own PROJECTION note concedes 1.9:1 with the shades up. Every large pale surface in a projection room bounces light back at the screen and lowers contrast; the desktop is one of the biggest. Dark helps the number, white makes the scheme's worst number worse. It also joins the palette family these layouts already have — "the darks are the equipment", i.e. the charcoal Cleon, the near-black poufs, the black screen frame and the black anodised window frames.

THE CONSTRAINT THAT DECIDES WHERE IT CAN GO: MAGNUS PRO IS MADE IN TWO SIZES ONLY, 59.1" x 27.6" and 70" x 31.5". THERE IS NO 48" MAGNUS. That is not a detail — layouts B and D deliberately specify 48" tops, and layout D says in its own comment that it chose 48" over 60" because the chair's pull-back has to share floor with the projector beam. Swapping those two to a Magnus is an 11.1" widening with no smaller option to retreat to. The XL is worse again: at 70" x 31.5" it is wider than the desk in EVERY layout in this project, and in layout A it has nowhere to go — east is the UST plinth's 2'-0" push-open zone, 10 3/8" away, and west is the north-wall passage past the foot of the bed.

HONEST COSTS. (1) It reads as EQUIPMENT, not as furniture, and in a studio the desk is in the sightline from the bed and the lounge. Where the desk is at the far end and next to the screen that is defensible; where it stands in the open it is a real objection, and the walnut-laminate Jarvis entry above exists for exactly that case. (2) The integrated power column is a genuine win in THIS unit — the AV allowance line complains that there is no power where it is needed and that cable concealment is a real cost — but it still has to reach a wall socket, which at a glazed wall is the same problem the Flos Bellhop was chosen to dodge. (3) It makes cable-tray-jarvis redundant: the tray and the routing are built in, so do not budget both. (4) A steel top and a clamp-on monitor arm are compatible in principle, but CONFIRM the rear-edge profile and thickness against the arm's clamp range before assuming the Jarvis arm carries over.`,
    frontClearance: IN(30),
    lowProfile: true,
    tags: [
      'wfh', 'magnus', 'secretlab', 'desk', 'work', 'standing-desk', 'sit-stand',
      'metal', 'dark', 'cable-management', 'integrated-power',
    ],
    price: 799,
  },
  {
    id: 'monitor-dell-u2725qe-27',
    name: 'Dell UltraSharp 27 4K Thunderbolt hub — U2725QE',
    kind: 'tv',
    w: IN(24.11),
    d: IN(7.44),
    h: IN(21.09),
    color: ANOD_BLACK,
    accent: STEEL,
    source: `Dell UltraSharp U2725QE: with stand 24.11" W x 7.44" D x 15.18"-21.09" H, 15.56 lb; WITHOUT stand 24.11" x 2.19" x 13.92", 11.51 lb; 5.91" of stand height travel; VESA 100x100. 27" 4K UHD 3840x2160, IPS Black, 120 Hz, DisplayHDR 600, 99% DCI-P3, Thunderbolt 4 hub with up to 140 W power delivery. Read directly off Dell's own product page spec block; $699.99 (from $849.99). Fits a 27"-deep top WITHOUT a monitor arm, and a single Thunderbolt cable to the laptop means one wire crossing the desk - which is the whole game when the desk is visible from the lounge area. At 11.51 lb bare it is comfortably inside the Jarvis arm's 19 lb rating. Price and every dimension re-verified against dell.com, 30 Jul 2026 - exact.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: it stands on the desk inside its footprint
    defaultZ: IN(29.5),
    tags: ['wfh', 'monitor', 'screen', 'work', 'desk-accessory', '4k', 'recommended'],
    price: 700,
  },
  {
    id: 'monitor-dell-u3225qe-32',
    name: 'Dell UltraSharp 32 4K Thunderbolt hub — U3225QE',
    kind: 'tv',
    w: IN(28.08),
    d: IN(8.46),
    h: IN(24.37),
    color: ANOD_BLACK,
    accent: STEEL,
    source: `Dell UltraSharp U3225QE: with stand 28.08" W x 8.46" D x 18.46"-24.37" H, 20.59 lb; WITHOUT stand 28.08" x 2.26" x 16.16", 14.37 lb; VESA 100x100. 31.5" 4K UHD, IPS Black, 120 Hz, DisplayHDR 600, 99% DCI-P3 / 100% sRGB, two Thunderbolt 4 ports, 2.5GbE, built-in KVM. Read directly off Dell's own product page spec block; $1,029.99. THE RIGHT SINGLE-MONITOR ANSWER ONLY IF THE DESK IS 30" DEEP: at 30" plus an arm pushing the panel back over the rear edge you get roughly 28-30" of viewing distance, which a 31.5" 4K needs. On a 27"-deep top it is too close. 14.37 lb bare is inside the Jarvis arm's 19 lb. Price and every dimension re-verified against dell.com, 30 Jul 2026 - exact.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: it stands on the desk inside its footprint
    defaultZ: IN(29.5),
    tags: ['wfh', 'monitor', 'screen', 'work', 'desk-accessory', '4k'],
    price: 1030,
  },
  {
    id: 'chair-branch-ergonomic-pro',
    name: 'Branch Ergonomic Chair Pro',
    kind: 'chair',
    w: IN(25),
    d: IN(24),
    h: IN(41.2),
    seatHeight: IN(17),
    color: NEAR_BLACK,
    accent: ANOD_BLACK,
    source: `Branch Ergonomic Chair Pro: 25" W x 24" D x 38"-41.2" H (41.5"-45" with the tall cylinder), seat height 17"-19.9" (19.3"-22.9" tall cylinder), seat depth 16.7"-19.7", armrest 24"-29.8", 14 points of adjustment, 5D armrests, forward tilt, adjustable lumbar. $599 base, +$79 headrest. SPECS AND PRICE ARE FROM SUMMARIES of Branch's own PDP plus press reviews, not read off a spec table line by line. Real adjustability at half an Aeron, in a 25" x 24" footprint that will roll back into a 36" aisle. SKIP THE HEADREST - it adds visual bulk in a room where you see the chair from the sofa.`,
    frontClearance: IN(30),
    tags: ['chair', 'task', 'office', 'ergonomic', 'wfh', 'recommended'],
    price: 599,
  },
  {
    id: 'desk-acc-surge-clamp-fully',
    name: 'Fully clamp-mounted surge protector',
    kind: 'box',
    w: IN(12),
    d: IN(2.5),
    h: IN(2),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `Fully Clamp-Mounted Surge Protector, $85 - price read off the MillerKnoll Fully brand index page, 30 Jul 2026. This is now the ONLY cable-management accessory MillerKnoll still sells for the Jarvis (the standalone wire tray SKU is gone; the desk ships with its own tray). Dimensions are an ESTIMATE of a clamp-mounted strip, not published. It matters on a sit-stand desk for a reason that is not obvious: every cable has to survive 25 1/2" of vertical travel every day, so the power strip has to travel WITH the top or the slack drags on the floor and eventually pulls something off the desk.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: clamped under the top, inside its footprint
    defaultZ: IN(26),
    tags: ['wfh', 'jarvis', 'fully', 'desk-accessory', 'cable-management'],
    price: 85,
  },
  {
    id: 'mat-standing-topo',
    name: 'Standing-desk mat, contoured 29" x 26"',
    kind: 'rug',
    w: IN(29),
    d: IN(26.25),
    h: IN(2.7),
    color: NEAR_BLACK,
    accent: NEAR_BLACK,
    source: `Ergodriven Topo Not-Flat standing desk mat, Obsidian Black: 29" L x 26.25" W x 2.7" thick, 8 lb, non-toxic polyurethane foam with a contoured "terrain" surface, no PFAS or PVC. Dimensions corroborated across Ergodriven and retailer listings; PRICE NOT VERIFIED - $99 appeared on one listing and $39.99 for the smaller Topo Mini, and Ergodriven's own price was not read. Obsidian Black is the only colourway that does not read as a gym mat on a walnut floor. 29" x 26" is a real footprint that has to be drawn: it sits INSIDE the chair pull-back zone, so the chair must be rolled clear before the mat is used - treat it as walkable in the plan, not as an obstruction. PRICE CORRECTED, 30 Jul 2026: ergodriven.com shows $119.00 sale / $139.00 REGULAR, not the $99 first recorded. List price is used here. Dimensions 29 x 26.25 x 2.7 and 8 lb are confirmed; stock was flagged "Low".`,
    frontClearance: 0,
    wallMounted: false,
    walkable: true,
    lowProfile: true,
    tags: ['wfh', 'desk-accessory', 'standing', 'mat'],
    price: 139,
  },

  // ---- the plinth that does not exist off the shelf ---------------------
  //
  // THIS IS A GENUINE SOURCING FAILURE AND IT IS WORTH STATING PLAINLY. An
  // ultra-short-throw projector's image bottom lands at roughly
  //
  //     image bottom AFF = plinth top height + 14 1/2"        (100" 16:9)
  //
  // and the picture wants its VERTICAL CENTRE at 45-55" AFF for people on a
  // 16-18" seat, i.e. an image bottom of 21-30". That needs a plinth top at
  // 12-16". Every "media console" on the market is 21-36" tall: the lowest one
  // sourced was a BDI Corridor 8173 at 21", which puts the image centre at 60"
  // and reads as a television hung too high. A UST also needs 20-26" of top
  // depth (rear gap plus body) and 60-72" of width to read as a base under the
  // picture rather than a box beside it. Nothing sold in 2026 is all three.
  //
  // So this is millwork: a plain slab plinth, 66" x 24" x 14", in a finish that
  // matches the floor. The price is a joinery ALLOWANCE, not a product price.
  // It is also the one piece in these schemes that has to be dead flat, square
  // and parallel to the wall within a couple of millimetres, because a UST
  // amplifies any yaw straight into visible trapezoid - and digital keystone on
  // a UST is a resolution crop, not a fix.
  {
    id: 'plinth-ust-bespoke-66',
    name: 'UST plinth, bespoke 66" x 24" x 14"',
    kind: 'tv_stand',
    w: IN(66),
    d: IN(24),
    h: IN(14),
    // THE DARK STAINED ASH, NOT THE WALNUT - which the source below always
    // offered as the alternative, and which is the better of the two. A UST
    // plinth is a projector cabinet: it belongs to the EQUIPMENT family with the
    // screen frame, the MAGNUS top, the poufs and the anodised glazing, not to
    // the wood family. As walnut it was a fourth wood value in a 448 sq ft
    // apartment that already carries an espresso floor, a white-oak bed and a
    // brushed-oak nightstand. At 2.5% LRV it sits under the floor's 10-14% and
    // beside the sofa's 3.7%, so the dark end reads as one mass, on purpose.
    color: '#302B27',
    accent: NEAR_BLACK,
    source: `BESPOKE MILLWORK, not a product. 66" W x 24" D x 14" H slab plinth with two push-open bays, DARK STAINED ASH (the walnut veneer this entry used to specify is the alternative, not the default - see the colour note above), sitting flush to the wall. Dimensions are DERIVED, and each one from a real constraint: 14" of height because image bottom = plinth top + ~14 1/2" for a 100" 16:9 UST image (Formovie's published install table for the 0.23:1 Theater, the only manufacturer table found that gives the vertical relationship) and a 45-55" image centre is what suits a 16-18" seat; 24" of depth because a UST's cabinet front lands 20-26" from the wall for a 100" image (PX3-PRO 20.2", Formovie Theater Premium 20.0", Hisense L9Q ~20.9", Epson LS650 26.2") and the whole body must be supported; 66" of width so it reads as a base under the picture. PRICE $650 IS A JOINERY ALLOWANCE for a simple veneered slab carcass with two push-open doors, not a quotation - get a real number from a cabinetmaker. WHY IT IS NOT A PRODUCT: every off-the-shelf media console sourced is 21-36" tall (BDI Corridor 8173 21", BESTA 25 1/4", Burrow Carta 26 1/4", BDI 8179 28 1/4", Blu Dot Shale 36"), and a 21" top already puts the image centre at 60" AFF. This unit's ABSENCE OF BASEBOARD is what makes a flush plinth possible at all: a standard 3/4" base would push the cabinet 3/4" further out, which on a 0.21:1 lens costs about 3 1/2" of image width.`,
    frontClearance: IN(24),
    tags: ['credenza', 'media', 'ust-plinth', 'projection', 'millwork', 'bespoke', 'low', 'recommended'],
    price: 650,
  },
  {
    id: 'projector-st-optoma-uhz36',
    name: 'Optoma UHZ36 4K laser (short/standard throw)',
    kind: 'projector',
    w: IN(10.8),
    d: IN(8.5),
    h: IN(4.5),
    color: OFF_WHITE,
    accent: STEEL,
    throwRatio: [1.21, 1.59],
    lensOffset: IN(2),
    source: `Optoma UHZ36: 10.80 x 8.50 x 4.50 in, 7.8 lb, 4K UHD (0.47" DMD, 4-phase shift), 3,500 ISO lumens, 1,500,000:1 dynamic, DuraCore laser phosphor 20,000 h (30,000 h eco), Filmmaker Mode, throw 1.21-1.59:1 with a 1.3x MANUAL zoom and NO LENS SHIFT, throw distance range 3.5-26.4 ft, 33 dB / 28 dB eco, 15 W MONO audio. Read off the ProjectorCentral spec page; $1,146, shipping as of Feb 2026. TWO HARD CONSEQUENCES OF "NO LENS SHIFT": the lens has to sit at or just below the bottom edge of the image, so this goes on a credenza and not on a high shelf; and its only geometry correction is digital keystone, which is a CROP - it throws away pixels and light and visibly softens a 4K DLP image. Also 15 W mono is not usable audio for a group, so budget a soundbar. lensOffset is an ESTIMATE for a front-mounted zoom barrel, not published. RE-VERIFIED 30 Jul 2026: 10.8 W x 8.5 D x 4.5 H, 7.8 lb, 3,500 ISO, 1,500,000:1, 1.21-1.59:1, 3.5-26.4 ft (self-consistent with a 29.9-300.4" image range), 1.3x manual zoom, no lens shift, 33/28 dB, street $1,146, laser 20,000/30,000 h - all match ProjectorCentral, which lists no MSRP. Two nits on the earlier note: ProjectorCentral's "February 2026" is a listing-date field, not evidence of shipping, and the vertical offset is genuinely not published anywhere - so do not fix a shelf height for this unit until someone reads the manual's install table.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // never a collision: stands on a credenza inside its footprint
    tags: ['projector', 'short-throw', 'zoom', 'av', 'screening', 'value'],
    price: 1146,
  },

  // =====================================================================
  // JAPANDI LIGHT — the value pass, sourced 30 Jul 2026
  //
  // WHY THIS BLOCK EXISTS. The first four layouts were priced around two
  // premium anchors — a $2,150 Aeron and a $1,960 Blu Dot Cleon — which
  // between them are 26% of layout A's whole catalogue total. This block is
  // the answer to "same room, half the money, pale oak instead of charcoal",
  // and it is dimensioned to a harder rule than the earlier entries: in a
  // room with a projected picture, the governing sightline ray falls from a
  // 46" seated eye to the 28 1/2" image bottom, so h(t) = 46 - 17.5t inches.
  // ANY object 28 1/2" tall or shorter is mathematically incapable of
  // crossing the image rectangle from any seat, and every low piece below is
  // chosen against that number rather than against a style board.
  //
  // SOURCING HONESTY, unchanged from the rest of the file: `source` says what
  // was read off a manufacturer spec table and what was not. IKEA repriced
  // several of these as 2026 introductions; expect movement.
  // =====================================================================

  // ---- seating: the shallow two-seat that replaces the Cleon ------------
  {
    id: 'sofa-saltmyran-58-loveseat',
    name: 'SALTMYRAN loveseat, Öreryd grey-beige',
    kind: 'loveseat',
    w: IN(57.875),
    d: IN(31.125),
    h: IN(30.375),
    seatHeight: IN(16.875),
    // "Öreryd grey-beige" is greyer than OATMEAL's natural-linen beige - it is
    // a recycled polyester weave, and the grey in the name is doing real work -
    // so it gets its own hex, with the cushions half a tone up in the SAME
    // fabric. They were CREAM, which rendered white cushions on a beige frame.
    color: '#C6BDAF',
    accent: '#D0C8BB',
    source: `IKEA SALTMYRAN 2-seat sofa, Öreryd grey-beige: 57 7/8" W x 31 1/8" D x 30 3/8" H, seat height 16 7/8", ARM HEIGHT 18 1/2" — i.e. 1 5/8" above the seat, which is as close to armless as anything in this price band gets. Read off the IKEA US measurements table, 30 Jul 2026; $299. THE REASON IT BEATS THE CLEON HERE IS DEPTH AND FREIGHT, not price: 31 1/8" is 2 7/8" shallower than the Blu Dot Cleon's contested 34", and in a plate where the whole west-to-partition run is 16'-3 1/4" those inches are the coffee table. It also packs the backrest INSIDE the armrests and ships in small cartons, which retires the freight risk the one-piece 56" Cleon frame carried through an angled front door. HONEST COSTS, three of them. (1) 30 3/8" overall is 3/8" OVER the project's 30" glazing rule — the structural back is only 26" and the extra is compressible cushion loft, so it may not stand within 12" of the glass without an argument. (2) "Öreryd" is 100% polyester (min. 90% recycled), not linen; a Bemz or Comfort Works cover is the route to real linen on this frame. (3) It is a 2026 introduction, so the price is young.`,
    frontClearance: IN(16),
    tags: ['seating', 'loveseat', 'low-arm', 'shallow', 'flat-pack', 'japandi', 'value', 'recommended'],
    price: 299,
  },
  {
    id: 'pouf-tolkning-rattan-20',
    name: 'TOLKNING pouf with storage, handmade rattan',
    kind: 'ottoman',
    w: IN(19.625),
    d: IN(19.625),
    h: IN(16.125),
    seatHeight: IN(16.125),
    color: JUTE,
    accent: OAK,
    source: `IKEA TOLKNING pouf with storage, handmade rattan: 19 5/8" x 19 5/8" x 16 1/8", hollow with a lift-off lid. Read off the IKEA US measurements table, 30 Jul 2026; $99.99. The only genuinely natural fibre in this scheme's soft goods — the sofa, the poufs and the rug in the earlier layouts are all polyester or wool blends — and at 16 1/8" it is 12 3/8" below the lowest point of any seat-to-image ray, so it can stand anywhere in the room including directly in front of the picture. Being hollow it stores the throw it is sitting under. HONEST COST: handmade rattan means visible variation and it will shed if it is dragged; and a 16" seat is a perch, not a chair — nobody watches a two-hour film on it.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['seating', 'ottoman', 'pouf', 'storage', 'rattan', 'natural', 'low', 'japandi', 'value'],
    price: 100,
  },
  {
    id: 'coffee-guttane-46',
    name: 'GUTTANE coffee table, oak',
    kind: 'coffee_table',
    w: IN(45.625),
    d: IN(15.375),
    h: IN(12.625),
    color: OAK,
    accent: OAK,
    source: `IKEA GUTTANE coffee table, oak: 45 5/8" W x 15 3/8" D x 12 5/8" H. Read off the IKEA US measurements table, 30 Jul 2026; $249.99. THE DEPTH IS THE POINT. Layout A concluded it had no room for a coffee table, and it was right about a normal one — a 24"-deep table in front of a sofa in this plate closes the walk. At 15 3/8" GUTTANE fits the slot between a 16" sofa-to-table gap and a bed, and at 12 5/8" tall it sits a foot below the lowest sightline ray. Real oak on the surface rather than the "oak effect" paper foil of the cheaper HOLMERUD. HONEST COST: 15 3/8" deep is a bench, not a table — it takes two mugs and a remote across its length and it will not hold a board game.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['table', 'coffee-table', 'oak', 'low', 'shallow', 'japandi', 'recommended'],
    price: 250,
  },

  // ---- sleep: the lowest real queen, because the bed is in the sightline -
  {
    id: 'bed-queen-vevelstad',
    name: 'VEVELSTAD queen bed frame, white — no headboard',
    kind: 'bed',
    w: IN(62.25),
    d: IN(81.875),
    // The made-up bed: an inferred ~9" deck plus a 9 1/2" VALEVAG mattress.
    // There is no headboard at all, so this height IS the mattress top.
    h: IN(18.5),
    seatHeight: IN(18.5),
    color: OFF_WHITE,
    accent: CREAM,
    source: `IKEA VEVELSTAD bed frame, Queen, white: length 81 7/8", width 62 1/4", FOOTBOARD 10 5/8", height under furniture 7 7/8", mattress area 79 1/2" x 59 7/8"; slatted base AND midbeam included in the one flat pack. Read off the IKEA US measurements table, 30 Jul 2026; $149. THIS IS THE BED FOR A ROOM WHERE THE BED IS IN THE PICTURE'S WAY: there is NO HEADBOARD, and the tallest part of the whole frame is a 10 5/8" footboard that sits below the mattress top — so the bed's silhouette is literally just the mattress, about 18 1/2" made up. Against the governing ray (46 - 17.5t, minimum 28 1/2") that leaves 10" of headroom for pillows and a duvet before anything crosses the image. DECK HEIGHT IS INFERRED at ~9" from the 7 7/8" under-frame clearance; IKEA does not publish it, and if the deck is really 10 5/8" the made-up height is 20" — still fine, but measure it. HONEST COST: it is white powder-coated steel, not pale oak, so in a Japandi scheme the warmth has to come from the linen, the jute and the oak elsewhere. The Awara Japanese Joinery bamboo queen ($768, tool-free interlocking joinery, 8.3" clearance, ~21" made up) is the same idea in the right material for $619 more. Note also that GRIMSBU, the previous cheapest passing queen, was flagged "last chance to buy" on IKEA US the same day — do not design around it.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'platform', 'low', 'no-headboard', 'glazing-safe', 'flat-pack', 'value', 'recommended'],
    price: 149,
  },
  {
    id: 'mattress-queen-valevag-95',
    name: 'VALEVÅG pocket sprung mattress, queen — 9 1/2"',
    kind: 'bed',
    w: IN(59.875),
    d: IN(79.5),
    h: IN(9.5),
    color: OFF_WHITE,
    accent: CREAM,
    source: `IKEA VALEVAG pocket sprung mattress, Queen, medium firm: 79 1/2" L x 59 7/8" W x 9 1/2" thick, individually pocketed springs, five comfort zones, 10-year limited warranty. Read off the IKEA US measurements table, 30 Jul 2026; $399. CATALOGUED SEPARATELY BECAUSE EVERY OTHER BED IN THIS FILE PRICES THE FRAME ALONE and then carries a mattress allowance — in a layout where the bed stands inside a projected sightline the mattress thickness is a DESIGN dimension, not a comfort one, so it gets a real line. At 9 1/2" it is the thinnest non-foam-slab queen sourced and it buys back half an inch of pillow headroom against every 10" foam mattress. HONEST COST: $399 is $169 more than a 10" Zinus Green Tea at $229.99, and it is a firm-ish European spring feel that not everyone likes. Placed layouts should NOT draw this as a separate item — the bed defs already include a made-up mattress in their height.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['bed', 'mattress', 'queen', 'low', 'value'],
    price: 399,
  },
  {
    id: 'storage-skubb-underbed',
    name: 'SKUBB storage case, 35 1/2 x 20 3/4 x 7 1/2',
    kind: 'box',
    w: IN(35.5),
    d: IN(20.75),
    h: IN(7.5),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA SKUBB storage case, white: 35 1/2" W x 20 3/4" D x 7 1/2" H, zippered fabric with a ventilation net. Read off the IKEA US page, 30 Jul 2026; $12.99. IN THIS PROJECT IT IS NOT AN ACCESSORY, IT IS THE WARDROBE: a queen with 7 7/8" of under-frame clearance swallows four of these, which is roughly a three-drawer chest of folded clothes hidden entirely below the sightline and below the eye. HONEST COST: 7 1/2" under a 7 7/8" rail is a 3/8" tolerance and a rug or a bowed rail eats it — buy two, test, then buy the rest. And soft zip cases are not a dresser: hanging and daily-use clothes still need somewhere else.`,
    frontClearance: 0,
    walkable: true, // lives under the bed frame, inside its footprint
    lowProfile: true,
    tags: ['storage', 'under-bed', 'bedroom', 'value'],
    price: 13,
  },
  {
    id: 'nightstand-tonstad',
    name: 'TONSTAD nightstand, oak veneer',
    kind: 'nightstand',
    w: IN(15.75),
    d: IN(15.75),
    h: IN(23.25),
    color: OAK,
    accent: OAK,
    source: `IKEA TONSTAD nightstand, brushed oak veneer (art. 804.893.22): 15 3/4" square x 23 1/4" H, drawer interior 11" x 11 3/4", 4 3/8" of clear floor underneath, soft-close drawer on round solid-wood legs. Read off the IKEA US measurements table, 30 Jul 2026; $149.99. It is the same veneer as the TONSTAD chest, which matters more than usual here: a bed with no headboard and no wall behind its head is seen from every angle in a studio, so its one bedside object has to look deliberate rather than left over. At 23 1/4" it is below the 30" glazing limit and below the 28 1/2" sightline floor, so it may stand anywhere. HONEST COST: $149.99 is a great deal of money for one small drawer, and legs-plus-floating-drawer gives it no visual mass.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['nightstand', 'oak', 'low', 'japandi', 'bedroom'],
    price: 150,
  },

  // ---- storage: the dresser layout A had no wall for --------------------
  {
    id: 'dresser-tonstad-4drawer',
    name: 'TONSTAD 4-drawer chest, oak veneer',
    kind: 'dresser',
    w: IN(32.25),
    d: IN(18.5),
    h: IN(35.375),
    color: OAK,
    accent: OAK,
    source: `IKEA TONSTAD chest of 4 drawers, brushed oak veneer (art. 906.146.17): 32 1/4" W x 18 1/2" D x 35 3/8" H, drawer interior 28 3/8" x 15 3/4", 9 5/8" pull-out, 4.0 cu ft, soft-close runners, solid-oak knobs. Read off the IKEA US measurements table, 30 Jul 2026; $299.99 regular ($249.99 on a 16% promotion the same day — the REGULAR price is recorded so a budget does not depend on a sale). HONEST COSTS. (1) At 35 3/8" it is the tallest object in a Japandi scheme apart from the desk, so it is a genuine sightline object: on the 46 - 17.5t ray it blocks anywhere past t = 0.61, i.e. over the last 40% of every run to the picture. It has to live somewhere no seat looks past it — in this project, the north-west notch. If the plan cannot give it that, swap to NORDLI 6-drawer white (47 1/4 x 18 1/2 x 29 7/8, $349.99), which is under the 28 1/2" floor everywhere except the last 8%. (2) It is particleboard under veneer: a piece that looks like oak, not an oak piece.`,
    frontClearance: IN(30),
    tags: ['storage', 'dresser', 'oak', 'bedroom', 'japandi', 'flat-pack', 'recommended'],
    price: 300,
  },
  {
    id: 'shelf-string-pocket',
    name: 'String Pocket shelf — ash / white',
    kind: 'shelf',
    w: IN(23.625),
    d: IN(6),
    h: IN(19.75),
    color: OAK,
    accent: OFF_WHITE,
    source: `String Furniture String Pocket, ash shelves on white side panels: 23 5/8" W x 6" D x 19 3/4" H, three shelves, rated 55 lb. The small sibling of the String wall system the earlier layouts used at $645 for three 24" bays; $230 buys the same designed object at a quarter of the wall. HONEST COST: 6" deep and three shelves is a considered ledge for books and objects, not storage — if the requirement is volume, an IKEA BERGSHULT/GRANHULT combination gives 26 linear feet for $204, but on nickel brackets rated 22 lb a shelf and with a hardware-store look.`,
    frontClearance: 0,
    wallMounted: true,
    defaultZ: IN(42),
    tags: ['storage', 'shelf', 'wall', 'ash', 'japandi', 'recommended'],
    price: 230,
  },

  // ---- dining: a two-top that folds to 5 7/8" ---------------------------
  {
    id: 'dining-norberg-wallmount',
    name: 'NORBERG wall-mounted drop-leaf table (drawn FOLDED)',
    kind: 'dining_table',
    w: IN(25.25),
    d: IN(5.875), // folded. Open it is 23 5/8" deep.
    h: IN(29.5),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA NORBERG wall-mounted drop-leaf table with storage, white (art. 204.979.28): 25 1/4" W x 23 5/8" D open x 29 1/2" H, folding to 5 7/8" deep against the wall, with a shallow storage compartment behind the leaf. Read off the IKEA US measurements table, 30 Jul 2026; $109.99. CATALOGUED AT ITS FOLDED DEPTH, following the NORDEN gateleg convention in this file, because folded is how it stands for most of the year and a layout has to be honest about the floor it does NOT occupy. In 213 sq ft of usable floor it returns about 6 1/2 sq ft and a clear projector cone every time it goes up, which is worth more than the two extra seats a 40" pedestal would add. HONEST COSTS: it seats two and only two; it needs a fixing into real structure, and the wall it hangs on in this unit has not been probed; and a table that has to be cleared and folded is a table you will stop opening.`,
    frontClearance: IN(30),
    wallMounted: true,
    tags: ['dining', 'table', 'fold-away', 'wall-mounted', 'small-space', 'value', 'recommended'],
    price: 110,
  },
  {
    id: 'chair-teodores',
    name: 'TEODORES chair, white — stackable',
    kind: 'chair',
    w: IN(18.125),
    d: IN(21.25),
    h: IN(31.5),
    seatHeight: IN(17.75),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA TEODORES chair, white: 18 1/8" W x 21 1/4" D x 31 1/2" H, seat height 17 3/4", one-piece moulded plastic, STACKS SIX HIGH. Read off the IKEA US measurements table, 30 Jul 2026; $55. Stacking is the specification that matters in this project and it is why this is here instead of the prettier LISABO ash chair at $80 — IKEA does not market LISABO as stackable, so a scheme that depends on clearing the chairs for a film cannot use it. HONEST COSTS: at 31 1/2" a TEODORES back is 3" above the 28 1/2" sightline floor, so a chair parked in the last third of a seat-to-picture run WILL clip the image — park them in the front two-thirds or stack them out of the cone. And stacked two high they are about 38", which blocks from much further back.`,
    frontClearance: IN(30),
    tags: ['chair', 'dining', 'stackable', 'light', 'value'],
    price: 55,
  },

  // ---- work: the desk kit at half of layout A's ------------------------
  {
    id: 'desk-standing-jarvis-laminate-60x27-oak',
    name: 'Fully Jarvis laminate standing desk, 60" x 27" — oak',
    kind: 'desk',
    w: IN(60),
    d: IN(27),
    h: IN(29.5),
    seatHeight: IN(29.5),
    color: OAK,
    accent: NEAR_BLACK,
    source: `Fully (MillerKnoll) Jarvis Laminate Standing Desk, 60" x 27", oak laminate on the black 3-stage frame: 3-stage legs travel 25 3/4"-51 1/4" (24 3/4"-50 1/4" with a 1" top), 350 lb capacity, cable tray included, 15-year frame warranty. $1,325, the same price as the bamboo rectangle. THE 27" DEPTH IS WHY IT IS SPECIFIED HERE RATHER THAN THE 30": the north-west notch in this unit is 2'-7 1/8" deep, so a 30" top leaves 1" of slack at the front and a 27" leaves 4 1/8" — the difference between a desk wedged into an alcove and a desk that fits it. The oak laminate is also the right value against a warm walnut floor in a pale scheme, where the bamboo reads distinctly yellow. PRICE AND FINISH ARE THIRD-PARTY: MillerKnoll's Fully pages are a JS shell and the laminate colourway list was not read off a spec table. Confirm the oak option still ships before ordering, and note that Fully was running a 15%-off-$1,000 tier that makes desk-plus-arm cheaper bought together.`,
    frontClearance: IN(30),
    tags: ['desk', 'standing', 'sit-stand', 'jarvis', 'fully', 'oak', 'wfh', 'japandi', 'recommended'],
    price: 1325,
  },
  {
    id: 'chair-steelcase-series1',
    name: 'Steelcase Series 1 task chair — Oatmeal',
    kind: 'chair',
    w: IN(27),
    d: IN(23.75),
    h: IN(41.25),
    seatHeight: IN(18),
    color: OATMEAL,
    accent: NEAR_BLACK,
    source: `Steelcase Series 1 work chair: overall 23 1/2"-27" W (arms in / out) x 21"-23 3/4" D x 36 1/2"-41 1/4" H, seat height 16 1/2"-21 1/2", functional seat depth 15 1/2"-17 3/4", back width 17 1/4", lumbar adjusts 6 1/2"-8 3/4" above the seat, with height-, width-, pivot- and depth-adjustable arms standard on every arm model — Steelcase Seating Specification Guide, Feb 2024, p.186, i.e. the manufacturer's own table. About $499 in Oatmeal on a black frame, 12-year commercial warranty. IT IS HERE INSTEAD OF THE AERON FOR A GEOMETRIC REASON AS WELL AS A FINANCIAL ONE: in a studio the task chair is seen from the sofa and stands inside the projected sightline, and Series 1 is the lowest-backed genuinely ergonomic chair sourced — on the 46 - 17.5t ray it only starts to block past t = 0.27 at its 41 1/4" maximum, and past t = 0.54 dropped to 36 1/2". It also saves $1,651 against an Aeron size B. HONEST COSTS: the $499 is a dealer/review figure, not store.steelcase.com (a JS shell); some Series 1 builds price adjustable lumbar as an option, so confirm the SKU includes it; and it is not an Aeron — the mesh and the recline are a tier down, which is what a tier down costs.`,
    frontClearance: IN(30),
    tags: ['chair', 'task', 'office', 'ergonomic', 'wfh', 'japandi', 'value', 'recommended'],
    price: 499,
  },
  {
    id: 'monitor-lg-27up850n',
    name: 'LG UltraFine 27UP850N-W, 27" 4K USB-C',
    kind: 'tv',
    w: IN(24.2),
    d: IN(9.4),
    h: IN(22.4),
    color: OFF_WHITE,
    accent: ANOD_BLACK,
    source: `LG UltraFine 27UP850N-W: 27" 3840x2160 IPS, 400 nits, DisplayHDR 400, 96% DCI-P3, USB-C with 96 W power delivery, VESA 100. About $399. Specified over the $799 32" of the earlier layouts because in this scheme the desk is 27" deep in a 2'-7" alcove and a 32" panel at that depth sits closer to the face than it should; a 27" 4K also matches the desk's own width proportion and, on a single-cable USB-C connection, removes a dock from a room with nowhere to hide one. The white bezel is the reason for this SKU rather than a black-bezel equivalent — in a pale alcove the monitor is the only large dark object. DIMENSIONS ARE THIRD-PARTY (retailer listings and reviews), not read off LG's own spec sheet, and the depth quoted is the panel without the stand, since it is going on an arm.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // rides a monitor arm, inside the desk footprint
    defaultZ: IN(29.5),
    tags: ['wfh', 'monitor', 'screen', 'work', 'desk-accessory', '4k', 'value'],
    price: 399,
  },
  {
    id: 'lamp-tertial-work',
    name: 'TERTIAL work lamp, clamp — dark grey',
    kind: 'table_lamp',
    w: IN(18),
    d: IN(8),
    h: IN(21.7),
    color: CHARCOAL,
    accent: NEAR_BLACK,
    source: `IKEA TERTIAL work lamp with clamp, dark grey: base/clamp 8", shade 7", max height about 21 3/4", steel, GU10 or E12 depending on market. Read off the IKEA US page, 30 Jul 2026; $19.99. Clamps to the back edge of the desk so it travels with a sit-stand top instead of standing on it. HONEST COST: it is a $20 lamp and looks like one from three feet away; the arm creeps down over a year.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true, // clamped to the desk, inside its footprint
    defaultZ: IN(29.5),
    tags: ['lighting', 'task', 'desk-accessory', 'wfh', 'value'],
    price: 20,
  },

  // ---- light and greenery, all plug-in: the soffit has no power ---------
  {
    id: 'lamp-strandad-floor-lantern',
    name: 'STRANDAD floor lamp, paper shade',
    kind: 'floor_lamp',
    w: IN(8),
    d: IN(8),
    h: IN(44),
    color: OFF_WHITE,
    accent: NEAR_BLACK,
    source: `IKEA STRANDAD floor lamp, white/black: shade about 8" across, overall 44" tall, paper shade on a slim metal stem. Read off the IKEA US page, 30 Jul 2026; $19.99. THE HONEST AKARI. A real Isamu Noguchi AKARI 10A from the Noguchi Museum shop is $700 and 48" tall — and 48" is ABOVE a 46" seated eye, so the genuine article blocks at every point of every seat-to-screen ray and has to be hidden in exactly the same corner this one does. You would be paying $680 more for a lamp you must keep out of the room's one good sightline. HONEST COST: at 44" this is still well above the 28 1/2" sightline floor, so it is not free to place — it has to live west of every seat, and the paper will yellow.`,
    frontClearance: 0,
    tags: ['lighting', 'floor-lamp', 'paper', 'lantern', 'japandi', 'value'],
    price: 20,
  },
  {
    id: 'lamp-nymane-wall-reading',
    name: 'NYMÅNE wall reading lamp, plug-in',
    kind: 'table_lamp',
    w: IN(4),
    d: IN(7),
    h: IN(4),
    color: OFF_WHITE,
    accent: OFF_WHITE,
    source: `IKEA NYMANE wall/reading lamp, white: small articulated head on a wall plate, integrated LED, supplied with a cord and plug so it needs no junction box. Read off the IKEA US page, 30 Jul 2026; $44.99. It exists in this scheme because a bed with no headboard and no wall beside its head has nowhere to stand a table lamp — the reading light has to come off the wall above the pillow. Dimensions are the wall plate and head only and are APPROXIMATE. HONEST COST: plug-in means a visible cord down a white wall unless it is chased or covered.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true,
    defaultZ: IN(46),
    tags: ['lighting', 'wall', 'reading', 'bedroom', 'value'],
    price: 45,
  },
  {
    id: 'plant-sansevieria-24',
    name: 'SANSEVIERIA potted plant, 8" pot',
    kind: 'plant',
    w: IN(15),
    d: IN(15),
    h: IN(23.5),
    color: LEAF,
    accent: TERRACOTTA,
    source: `IKEA SANSEVIERIA (mother-in-law's tongue) in an 8" pot: about 23 1/2" tall overall. Read off the IKEA US page, 30 Jul 2026; $24.99. THE ONLY PLANT IN THIS CATALOG THAT MAY STAND ANYWHERE IN A PROJECTION ROOM: at 23 1/2" it is 5" below the 28 1/2" floor of every sightline ray, where the 40" floor plant used by the earlier layouts blocks over the last third of every run — and the 6' fiddle leaf blocks everything. It also survives a west-facing apartment with blackout shades down half the daylight hours, which a fiddle leaf does not. HONEST COST: it grows slowly and it is a spiky vertical, not a soft one.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['plant', 'greenery', 'low', 'low-light', 'japandi', 'recommended'],
    price: 25,
  },
  {
    id: 'plant-zz-18',
    name: 'ZAMIOCULCAS (ZZ plant), 6" pot',
    kind: 'plant',
    w: IN(11),
    d: IN(11),
    h: IN(17.75),
    color: LEAF,
    accent: TERRACOTTA,
    source: `IKEA ZAMIOCULCAS (aroid palm / ZZ plant) in a 6" pot: about 17 3/4" tall overall. Read off the IKEA US page, 30 Jul 2026; $12.99. The glossy low mound that goes with the SANSEVIERIA's vertical, and the single most shade-tolerant plant sold at scale — it is the right species for a room whose blackout is down whenever the picture is on. At 17 3/4" it clears every sightline ray by more than 10". HONEST COST: it is slow, it is common, and it will rot if it is watered like a fern.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['plant', 'greenery', 'low', 'low-light', 'japandi', 'value'],
    price: 13,
  },
  // ---- the wall bed: how a queen leaves the floor -----------------------
  {
    id: 'bed-murphy-queen-lori-closed',
    name: 'Lori Bed Queen Vertical wall bed, closed',
    kind: 'murphy_bed',
    w: IN(64),
    d: IN(23),
    h: IN(83),
    color: OFF_WHITE,
    accent: OAK,
    source: `Lori Beds "The Lori Bed" Queen VERTICAL: CLOSED 64" W x 23" D x 83" H; OPEN 64" W x 105" D x 10" H (the 105" is measured from the wall and INCLUDES the 23" cabinet, which stays put — the platform pivots out of it). 100% cabinet-grade plywood with a textured woodgrain laminate, no particle board or MDF; double-chamber gas-piston lift; mounts with SIX SCREWS INTO WOOD OR METAL STUDS; lockable. Takes any mattress up to 10" thick, 70-130 lb, with a recommended maximum of 80 lb for the queen. Dimensions and the construction/mount/mattress notes are from loribeds.com search summaries and the Amazon listing, 31 Jul 2026 — the product page and the dimensions table both returned HTTP 429 on repeated attempts, so NOTHING here was read off a spec table directly and it should be confirmed before anyone drills.
PRICE IS UNRESOLVED AND THE SPREAD IS LARGE. Two figures were returned on the same day: "entry pricing starting at $1,387" and "vertical and horizontal styles start from $2,159". $2,159 is recorded because a budget should not lean on the lower of two unconfirmed numbers, but the real figure may be $770 less — get a quote before committing, and note Lori also sells queen configurations up to $2,962 with storage towers.
WHY THIS RATHER THAN A BUILT-IN. A vertical queen is the only wall bed that fits the wide leg of this plate at all: a HORIZONTAL queen is about 85" wide, and the run between the notch step and the UST plinth is 83", so it does not go in. And the 80 lb mattress ceiling is a real specification, not fine print — it rules out the pocket-sprung VALEVAG this catalog carries for standing beds and points at a 10" foam queen instead.`,
    frontClearance: IN(30), // you stand here to swing it down; the deployed def is the real test
    tags: ['sleeping', 'murphy', 'wall-bed', 'queen', 'small-space', 'convertible', 'sleeps-2', 'recommended'],
    price: 2159,
  },
  {
    id: 'bed-murphy-queen-lori-open',
    name: 'Lori Bed Queen Vertical wall bed, deployed',
    kind: 'murphy_bed',
    w: IN(64),
    d: IN(105), // from the wall, cabinet included
    // 10" platform + a 10" mattress. That 20" is the whole point: even with the
    // bed DOWN it stands 8 1/2" below the 28 1/2" floor of any projected
    // sightline, so a wall bed in this room never crosses the picture.
    h: IN(20),
    seatHeight: IN(20),
    color: OFF_WHITE,
    accent: CREAM,
    source: `The same purchase as bed-murphy-queen-lori-closed, drawn DEPLOYED so a layout can test whether the room still works at night: 64" wide x 105" from the wall x 20" made up. Price is 0 because it is not a second thing to buy. Following the convention this file uses for the NORDEN gateleg and the floor-rising screen, a layout should place ONE of the two states and state in a note where the other one lands.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['sleeping', 'murphy', 'wall-bed', 'queen', 'deployed', 'sleeps-2'],
    price: 0,
  },
  {
    id: 'rug-tiokrona-8x10',
    name: 'TIOKRONA rug, flatwoven natural — 7\'10" x 9\'10"',
    kind: 'rug',
    w: FTIN(7, 10),
    d: FTIN(9, 10),
    h: IN(0.25),
    // Undyed jute/paper yarn, not wool: the field is a NATURAL straw, and the
    // honest cost recorded below is that it is striped rather than plain - which
    // is exactly what color = field + accent = a second natural tone draws.
    color: JUTE,
    accent: RUG_BASE,
    source: `IKEA TIOKRONA rug, flatwoven, natural: 7'10" x 9'10", 1/4" thick. Read off the IKEA US page, 30 Jul 2026; $129.99. The cheap equivalent of the Nordic Knots Desert 8x10 at $395, and at 1/4" it is even thinner than the Desert's 7 mm, so a task chair rolls over it without rucking. HONEST COST: it is jute rather than a 50/50 wool-jute, so it is scratchier underfoot and it will not take a bare foot the way the Desert does; and it is a striped field, not a plain one. Take it if $265 has to go somewhere else in the budget. Do NOT take LOHALS instead — it is dearer than this and twice as thick.`,
    frontClearance: 0,
    walkable: true,
    lowProfile: true,
    tags: ['rug', 'flatweave', 'jute', 'natural', 'thin', 'caster-friendly', 'value'],
    price: 130,
  },

  // =====================================================================
  // THE SLEEPING ALCOVE — sourced 31 Jul 2026
  //
  // WHY THIS BLOCK EXISTS. Layout A's bed was designed as a budget sink: a
  // $79 white powder-coated GRIMSBU with a wall-hung ledge and a wall-hung
  // String shelf over it, so that the whole bedroom cost less than the
  // monitor arm and the money went to the picture and the desk. Rendered,
  // that is exactly what it looks like — a white slab under two floating
  // brackets. This block is the answer to "make the bed area a designed
  // room, and do it WITHOUT drilling the walls".
  //
  // THREE CONSTRAINTS SHAPE EVERY ENTRY BELOW, and they are the same three
  // that shaped the layout:
  //   1. NO WALL FIXING. Anything that would hang has to stand instead, or
  //      go under the bed, or not exist. The blackout shades are the one
  //      exception in the scheme and they are a co-requisite of the screen,
  //      not decor.
  //   2. THE HEAD OF THE BED IS A WINDOW. Nothing at the head may break the
  //      2'-6" glazing rule, which rules out every headboard sold — so the
  //      bed has to be beautiful from the FRAME and the LINEN alone.
  //   3. THE BED IS ALSO A SEAT. It looks down the room at a 100" picture
  //      whose bottom edge is 28 1/2" AFF, so h(t) = 46 - 17.5t inches is
  //      the governing ray here too: a 5'-11" floor lamp beside it costs a
  //      third of the picture (measured — see scripts/sightline.ts).
  // =====================================================================

  {
    id: 'bed-queen-awara-bamboo',
    name: 'Awara Japanese Joinery bamboo platform bed, queen — natural, no headboard',
    kind: 'bed',
    w: IN(63.9),
    d: IN(83.9),
    // h IS THE MADE-UP BED INCLUDING THE PILLOWS, and on a headboard-less
    // frame that is the honest reading of "tallest part of the piece": a 12"
    // frame + a 10" mattress puts the sleeping surface at about 22", and two
    // pillows and a turned-back duvet take the silhouette to about 26" —
    // still 4" under the 2'-6" glazing rule with the head at the glass.
    h: IN(26),
    seatHeight: IN(22),
    color: BAMBOO,
    // accent = the DUVET (Quince European Linen in Sand); the renderer takes
    // the sheets and pillowcases a quarter of the way to white off the same
    // value, which is the Oat sheet set specified in the layout's COLOUR note.
    accent: OATMEAL,
    source: `Awara Japanese Joinery Bamboo Platform Bed, Queen, Natural: 63.9" W x 83.9" L x 12" H, 8.3" of under-bed clearance, 66 lb, solid bamboo with traditional interlocking joinery — no tools, no screws, no nails, ~20 minutes to build. Read directly off the awarasleep.com product page, 31 Jul 2026; $768 frame only (the attachable bamboo headboard is a separate $269 and takes the overall height to 39", which FAILS the 2'-6" glazing rule — specify it WITHOUT). Also sold as the Nectar Japanese Joinery bamboo bed. WHY IT IS IN THIS CATALOG. It is the only frame sourced that answers all four of this project's bed constraints at once: no headboard (so it can point at a window), a genuinely warm pale material rather than powder-coated steel (so the bed is an object and not a hospital bed), tool-free assembly (so it gets through a lift and an angled front door in cartons), and 8.3" of clearance, which is 3/4" more than a SKUBB case needs — so the under-bed volume is real storage rather than a claim. It is also the same MATERIAL as the Jarvis bamboo desktop at the other end of the room, which is the cheapest kind of coherence there is. HONEST COSTS: (1) $768 is $689 more than the GRIMSBU it replaces and there is no version of this argument in which that is a performance upgrade — it is an appearance upgrade, said plainly. (2) At 63.9" it is 2.9" wider than the GRIMSBU, and in this plan every inch of bed width comes straight out of the aisle behind it. (3) The 12" frame height is published; the DECK height is not, so the 22" sleeping surface is inferred as ~11 1/2" of deck plus a 10" mattress — measure before ordering a mattress thicker than 10". (4) Bamboo is a grass: it moves with humidity and it dents.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'platform', 'low', 'bamboo', 'no-headboard', 'glazing-safe', 'flat-pack', 'japandi', 'recommended'],
    price: 768,
  },
  {
    id: 'bed-queen-awara-bamboo-headboard',
    name: 'Awara Japanese Joinery bamboo platform bed, queen — natural, WITH the bamboo headboard',
    kind: 'bed',
    w: IN(63.9),
    // 83.9" of frame plus the headboard panel. The 2" is INFERRED — Awara
    // publishes the height with a headboard (39") and not the added length —
    // so treat the foot line as +/- an inch and do not dimension millwork off it.
    d: IN(85.9),
    h: IN(39),
    seatHeight: IN(22),
    color: BAMBOO,
    accent: OATMEAL,
    source: `The same Awara Japanese Joinery bamboo platform bed as bed-queen-awara-bamboo (63.9" W x 83.9" L x 12" H frame, 8.3" clearance, tool-free joinery, $768, read off awarasleep.com 31 Jul 2026) with the ATTACHABLE BAMBOO HEADBOARD, $269, which takes the overall height to 39". $1,037 the pair. WHY THIS IS A SEPARATE ENTRY AND NOT A FLAG: 39" is the number that decides where this bed may stand. It FAILS this project's 2'-6" glazing rule outright, so it can never point at the west wall — a bed with this headboard has to have a solid wall behind it, and in this floor plate that means it is turned 90 degrees out of the orientation every other scheme uses, which changes the whole layout rather than just the bill. Use bed-queen-awara-bamboo where the head faces glass and this one where it faces a wall. The upholstered headboard option is $199 and reaches the same 39".`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'platform', 'bamboo', 'headboard', 'japandi', 'flat-pack'],
    price: 1037,
  },
  {
    id: 'bed-queen-basi-white-oak',
    name: 'Article Basi platform bed, queen — white oak, no headboard',
    kind: 'bed',
    w: IN(63),
    d: IN(83),
    // h IS THE MADE-UP BED INCLUDING THE PILLOWS, read the same way as the
    // Awara entry above. THE DECK HEIGHT IS INFERRED, NOT PUBLISHED — see the
    // source note — so this is an inferred ~10" deck + a 10" mattress giving a
    // ~20" sleeping surface, and two pillows plus a turned-back duvet taking
    // the silhouette to about 24". That is 6" under the 2'-6" glazing rule,
    // where the Awara had 4".
    h: IN(24),
    seatHeight: IN(20),
    color: WHITE_OAK,
    accent: OATMEAL,
    source: `Article Basi Bed Frame, Queen, White Oak: 12" H x 63" W x 83" D overall, interior (mattress) opening 60.5" W x 81" D, 6" of clearance, 111 lb, 600 lb capacity including mattress. Rubber wood, pine, MDF, white oak VENEER and metal, with solid wood legs and solid-plywood slats. Ships in two cartons, 11 x 13 x 87 and 7 x 22 x 65. Read off article.com 31 Jul 2026; $399, and the SAME $399 in Oak, White Oak, Smoked Oak and Walnut, so the finish is a free choice. WHY IT IS IN THIS CATALOG. It answers the same four bed constraints as the Awara — no headboard, warm pale wood, flat-pack, glazing-safe — and it answers two of them BETTER: at 63" x 83" it is 0.9" narrower and 0.9" shorter than the Awara, and in layout A both of those come straight back into the tightest aisle in the apartment. It is also a completely different FORM: the Awara is visible interlocking joinery (japandi), the Basi is a plain slab floating over a 6" shadow gap on inset legs, with the four corner legs and three centre legs held well in from the edges. On an espresso floor a pale slab over a dark gap is the strongest reading of "floating" available, which is why the white oak and not the walnut — walnut sits at nearly the same value as the floor planks and the gap, the slab and the floor merge into one dark mass. HONEST COSTS, and there are four. (1) THE DECK HEIGHT IS NOT PUBLISHED. Article gives 12" overall and 6" clearance and nothing in between; the assembly manual (AI1560 v1.5) draws the slats recessed inside the rail but dimensions nothing. ~10" is an INFERENCE with about +/-2" on it, and it could plausibly be as low as 7". MEASURE IT BEFORE BUYING A NIGHTSTAND, because the whole bedside relationship falls out of it. (2) IT IS VENEER OVER MDF AND RUBBER WOOD, not solid anything. Against solid bamboo at $768 that is an honesty downgrade, said plainly, and it is most of why it is $369 cheaper. (3) 6" OF CLEARANCE IS THE REAL PRICE. A 7 1/2" SKUBB does not go under it; under-bed storage drops to 4 1/2" boxes and roughly HALVES in volume. In a scheme with no dresser that is not a detail. (4) IT IS NOT TOOL-FREE. Two people, an Allen key (supplied), ~1 hour, and Article rates it 5/7 for difficulty — where the Awara is 20 minutes and no tools. It does flat-pack into two cartons, so the angled front door is still fine.`,
    frontClearance: 0,
    tags: ['bed', 'queen', 'platform', 'low', 'white-oak', 'floating', 'no-headboard', 'glazing-safe', 'flat-pack', 'value'],
    price: 399,
  },
  {
    id: 'storage-lowprofile-underbed-45l',
    name: 'Low-profile under-bed case, 33 x 17 x 4 1/2',
    kind: 'box',
    w: IN(33),
    d: IN(17),
    h: IN(4.5),
    color: CONCRETE,
    accent: CONCRETE,
    source: `storageLAB Low-Profile Under Bed Storage Container: 33" L x 17" W x 4 1/2" H, 45 litres, zippered fabric with rigid sidewalls and base, handles and a clear window, sold in twos. Rated by the maker for beds as low as 5" off the floor. Specs read off thestoragelab.com and the Amazon listing, 31 Jul 2026; PRICE NOT VERIFIED for the US 2-pack — the only figure the search surfaced was a UK GBP number — so $30 the pair is an ESTIMATE and should be confirmed before it goes in a budget. WHY IT EXISTS IN THIS CATALOG: it is the fallback for frames with 6" of clearance or less, where the 7 1/2" SKUBB simply does not fit. HONEST COST, STATED AS A NUMBER: a SKUBB is 90 litres and this is 45, so it is HALF the box. Four of these under a queen is about 180 litres against the SKUBB's 362 — which is the difference between "a three-drawer chest of folded clothes" and about a drawer and a half. Six would fit the bare footprint, but a frame with a centre rail and centre legs interrupts the middle run, so FOUR is the honest planning number.`,
    frontClearance: 0,
    walkable: true, // lives under the bed frame, inside its footprint
    lowProfile: true,
    tags: ['storage', 'under-bed', 'bedroom', 'low-clearance', 'value'],
    price: 15,
  },
  {
    id: 'bedcover-linen-terracotta-queen',
    name: 'Vintage-wash European linen bed cover, full/queen — terracotta',
    kind: 'box',
    // Drawn as it is USED, not as it folds out: a bed cover turned back and
    // folded across the foot of the mattress, 60" across the bed x 26" of
    // its length x about 3 1/2" of loft.
    w: IN(60),
    d: IN(26),
    h: IN(3.5),
    color: TERRACOTTA,
    accent: TERRACOTTA,
    source: `Quince Vintage Wash European Linen Bed Cover, full/queen, Terracotta: from $129.90, read off quince.com's linen blankets page 31 Jul 2026 (listed as a best seller and LOW STOCK the same day — treat availability as a risk, and note the "from" price is the throw size; the full/queen is at or above it). Sized in the catalog as a FOLDED object because that is the only state a drawing cares about. IT IS THE ONE PIECE OF COLOUR IN THE SLEEPING ALCOVE and it is doing a specific job: the bed is otherwise oat linen on pale bamboo, which against an espresso floor is two warm neutrals and no incident, and a washed terracotta at the foot picks up both the Nordic Knots Desert rug (a faded warm brown) and the terracotta pot the sansevieria stands in. HONEST COST: it is one accent and it has to be the ONLY one — a second colour in a 448 sq ft studio that is already carrying charcoal seating, black window frames and a dark floor reads as clutter, not as layering.`,
    frontClearance: 0,
    walkable: true, // it lies ON the mattress, inside the bed's own footprint
    lowProfile: true,
    tags: ['bedding', 'linen', 'terracotta', 'accent', 'textile'],
    price: 130,
  },
  {
    id: 'lamp-bellhop-portable',
    name: 'Flos Bellhop Unplugged rechargeable table lamp',
    kind: 'table_lamp',
    w: IN(4.92),
    d: IN(4.92),
    h: IN(8.27),
    color: CONCRETE,
    accent: OFF_WHITE,
    source: `Flos Bellhop Unplugged (Ed. 2018), Barber & Osgerby: 8.27" H x 4.92" dia, 1.65 lb, 3 W LED at 2700 K, four-step dimming with a battery indicator, USB-C, 0-100% in 3 hours and up to 24 hours of run time, injection-moulded polycarbonate base and dome. Read off flos.com 31 Jul 2026: $370.00 list, $240.50 on sale the same day — the LIST price is recorded so a budget does not depend on a promotion. Colours: grey, white, grey-blue, matt black, yellow; grey is specified here. IT IS CORDLESS, AND IN THIS PLAN THAT IS THE WHOLE ARGUMENT. The bed's head stands at a floor-to-ceiling glazed wall; the traced plan records no outlet there and a cord run to a bedside surface would either cross the room's tightest walkway or be taped to the glass. A lamp that charges in a drawer and lives on the bedside for a day at a time removes the problem instead of routing it. At 8 1/4" tall it is also 20" below the lowest sightline ray, so unlike a floor lamp it can stand anywhere in this room. HONEST COSTS: $370 is a great deal of money for 3 W; it is polycarbonate, not glass or metal; and 2700 K at four steps is a bedside light, not a reading light — pair it with the ceiling downlights for anything else.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['lighting', 'table-lamp', 'portable', 'rechargeable', 'cordless', 'design', 'premium'],
    price: 370,
  },

  // =====================================================================
  // LAYOUT G — the pieces that make layout A light, 31 Jul 2026
  //
  // Everything in this section exists because of one measurement. Layout A's
  // living end runs 18.9% LRV in its furnishings against a 64% shell — a fifty
  // point gap, and the client read it correctly from a render without being
  // able to say why. The scheme defends its darks on optical grounds, so the
  // optics were done properly (Monte-Carlo photon transport off the image plane
  // over the to-scale model, plus `pnpm tone`): with the shades down the room
  // returns 3.3% of the projector's own light to its own screen, and 83% of
  // that comes off the WALLS AND THE SOFFIT. Every placed furnishing in the
  // apartment together is about 10% of it.
  //
  // Which makes the ledger blunt. Taking the sofa from 3.7% to 30% LRV raises
  // the screen's black level by 3.5%, i.e. 131:1 in-room contrast becomes
  // 126:1. Taking the poufs with it costs ZERO, measured, because a 16 1/2"
  // pouf behind a 28" sofa occupies none of the screen's hemisphere. Against
  // that: the parked Aeron is worth 22%, the plinth 13% and the MAGNUS top
  // 12.5%, because those three are close, low and in the picture's own field.
  //
  // SO THE RULE THIS SECTION IS BUILT ON: dark is worth buying within about six
  // feet of the picture and worth nothing beyond it. Layout A had it the wrong
  // way round — it darkened the furniture you sit on and left 650 sq ft of
  // 88%-LRV wall alone.
  // =====================================================================

  // ---- seating: the same sofa, in the fabric that changes the room ------
  {
    id: 'sofa-cleon-56-armless-oat',
    name: 'Blu Dot Cleon 56" armless sofa — Maharam Mode in Clavicle',
    kind: 'loveseat',
    w: IN(56),
    d: IN(34),
    h: IN(28),
    seatHeight: IN(17),
    color: CLAVICLE,
    // One fabric, so the cushion face is the frame's colour half a tone up —
    // the same convention as the charcoal entry, and for the same reason.
    accent: '#CFC7BB',
    source: `Blu Dot Cleon 56" Armless Sofa in MAHARAM MODE 009, colourway CLAVICLE. IDENTICAL FRAME, IDENTICAL GEOMETRY, IDENTICAL PRICE to sofa-cleon-56-armless — 56" W x 34" D x 28" H, seat depth 26", seat height 17", 2" base, kiln-dried hardwood frame, sinuous springs, made in USA, 5-year warranty, $1,960 in Maharam fabric. It is a separate catalog entry ONLY because the colour is the design decision. Blu Dot lists Maharam Mode in Clavicle as a stock option on the Cleon range (their own product URLs use the slug 'maharam-clavicle'); the textile is 80% post-consumer recycled polyester / 20% polyester, rated 100,000 double rubs on the Wyzenbeek scale, GreenGuard Gold certified, with a stain-resistant finish. Read off bludot.com 31 Jul 2026. THE LRV IS AN ESTIMATE AND MUST BE CONFIRMED WITH A MEMO SAMPLE: Maharam publishes no LRV, and #C4BBAE / 50% is read off product photography, which is radiance and not albedo. Order the memo, put it on the floor next to the plank, and look at it at 4pm — that is the only test that matters here, and there is a second reason to do it: resellers describe Mode 009 Clavicle as "Off-White" and "White Beige", and finishes.ts's glazing rule says in as many words that "nothing white and large goes in front of [the glass] or it silhouettes to grey". This sofa stands 5 ft in front of 18'-6" of west glazing with its back to it. A light warm GREY passes that rule; a white does not, and the two words are being used interchangeably by people selling the cloth. THE PRICE IS ALSO NOT QUITE THE $0 SWAP IT LOOKS: this catalog prices layout A's Cleon at $1,960 because that is the Maharam-fabric price, so within these budgets the change is free — but bludot.com lists Tait Charcoal (a plain 90/10 polyester-linen) at $1,740 and runs promotions well below that, so a real client comparing real carts may be looking at +$220 or more, not +$0. WHY THIS AND NOT A NEW SOFA: every seating distance in layout A is measured off this frame's front face (10'-8 7/8" of standoff, 36.2 deg subtended, 14.5 deg off axis), so changing the textile is the one move that rewrites the room's tone and re-derives no geometry at all. WHAT IT COSTS, MEASURED: 3.5% of the screen's black level, 131:1 -> 126:1. WHAT IT COSTS THAT IS NOT MEASURED: a light seat in a studio where the same room is the kitchen. 100,000 double rubs and a stain finish is the right spec for that, and it is still a pale sofa 12 ft from a range.`,
    frontClearance: IN(16),
    tags: ['seating', 'loveseat', 'armless', 'modular', 'low-back', 'glazing-safe', 'shallow', 'premium', 'light'],
    price: 1960,
  },

  // ---- the back of the sofa, which is the other half of this scheme -----
  //
  // The zone between the Cleon's back and the west glazing is 4'-11 15/16" of
  // floor running the depth of the room, and in layout A it holds two 18"
  // near-black poufs jammed 4" behind the sofa. Photographed, it reads as
  // leftover; measured, it is worse than that — a second-row seat 4" off a 28"
  // sofa back has nowhere to put its knees, so layout A's four-seat congregation
  // is really two seats and two footstools.
  //
  // THE DEPTH BUDGET IS THE WHOLE PROBLEM AND IT IS WORTH STATING AS ONE LINE:
  // 4'-11 15/16" of zone, minus a 3'-0" route to the west windows, leaves 2'-0"
  // for furniture. A usable second row needs about 1'-6" of seat and 1'-6" of
  // knee room, i.e. 3'-0". It does not fit, and no arrangement makes it fit.
  // So layout G stops trying: the permanent piece behind the sofa is 15 1/2"
  // deep, it gives the sofa the back an armless sofa in the middle of a room
  // needs, and the overflow seating becomes two things you carry.
  {
    id: 'bench-seno-55-oak',
    name: 'Article Seno 55" bench, oak',
    kind: 'bench',
    w: IN(55),
    d: IN(15.5),
    h: IN(17.5),
    seatHeight: IN(17.5),
    // NOT the palette's OAK (#C0A681, 40 LRV) even though it is oak veneer: the
    // TONSTAD nightstand is already drawn at exactly that value and the TOLKNING
    // rattan at 43, so three different natural browns would have landed inside
    // three LRV points and the scheme's whole claim is that its neutrals
    // separate by VALUE. Article's Oak stain is a warmer, slightly deeper
    // mid-oak than IKEA's brushed veneer, which is what this hex draws: 35 LRV,
    // R-B +67.
    color: '#B79C74',
    accent: '#B79C74',
    source: `Article Seno 55" Bench in Oak: 55" W x 15 1/2" D x 17 1/2" H, solid rubberwood with oak veneer, 31 lb, weight-tested to 600 lb, ships in one carton, about 15 minutes to assemble. $399. Dimensions, materials, weight and price read directly off article.com/product/27607 on 31 Jul 2026. The same bench is made in walnut (product 27606) and THAT IS THE ONE NOT TO ORDER HERE — see the wood rule in finishes.ts: a walnut top would land inside the espresso floor's own value band and the bench would disappear into the floor instead of drawing a line across it. WHY A BENCH AND NOT A CONSOLE. A 26"-30" console behind the sofa would give a better drink surface and more storage, and it was drawn and rejected: it stands 2" ABOVE the Cleon's 28" back from the west side, so from the promenade and from the desk the seating group reads as a fence rather than as one object, and in a plan whose only amenity is 18'-6" of glazing, a second horizontal line at eye level across the middle of the floor is the wrong thing to add. At 17 1/2" the bench is 10 1/2" BELOW the sofa's back: from the cinema side it does not exist, and from the west side it is the low ledge that terminates the sofa. ITS SEAT HEIGHT IS THE POINT: 17 1/2" against the Cleon's 17" reads as one plane, and an eye on it lands near 41" AFF, comfortably above the 28 1/2" image bottom, so it is a legitimate second row for anyone willing to perch. HONEST LIMIT: pushed flush to the sofa's back it is a PERCH and a LEDGE, not a lounge seat — there is no knee room in front of it. Sat on facing WEST, with the sofa's back as a backrest and the city in front of you, it is the best seat in the apartment for sixteen hours a day. That is the reading this scheme intends.`,
    frontClearance: 0,
    tags: ['seating', 'bench', 'oak', 'low', 'glazing-safe', 'second-row', 'sightline-safe', 'japandi'],
    price: 399,
  },
  {
    id: 'pouf-tolkning-rattan',
    name: 'TOLKNING pouf with storage, handmade rattan',
    kind: 'ottoman',
    w: IN(19.625),
    d: IN(19.625),
    h: IN(16.125),
    seatHeight: IN(16.125),
    color: JUTE,
    accent: JUTE,
    // JUTE is 43 LRV, which sits between the sofa's 50 and the nightstand's 40.
    // New rattan is paler than this and darkens with age; 43 is the middle of
    // that life and the value the scheme's ladder is drawn against.
    source: `IKEA TOLKNING pouf with storage, handmade rattan: 19 5/8" diameter x 16 1/8" high, hollow with a lift-off lid, rattan over a powder-coated steel frame with a stained plywood bottom panel and clear acrylic lacquer, hand-woven so no two are identical. $99.99. Diameter, height, materials and price read directly off ikea.com/us 31 Jul 2026. IT REPLACES THE JARRESTAD ONE FOR ONE and the argument is entirely tonal: the JARRESTAD is a 1.5% LRV textile cube, the TOLKNING is about 43% natural rattan, and the measured cost to the projected image of that swap is ZERO — a 16" pouf standing behind a 28" sofa occupies none of the screen's hemisphere, so it returns none of its light. It is also 1 1/2" wider and 3/8" lower. THE OTHER REASON IS THAT IT IS THE ONLY WOVEN NATURAL FIBRE IN THE SCHEME: this apartment's fixed materials are concrete, glass, anodised aluminium, painted drywall and a dark plank floor, i.e. five hard ones, and a room that answers them entirely in wool and linen still has no TEXTURE in it. Rattan is the cheapest possible correction. HONEST COST: hand-woven rattan over a steel frame is not a piece of furniture you drag daily, and IKEA's own care line for the TOLKNING series is that natural fibre wants to stay out of direct sun — which, in an apartment whose whole west wall is glass, means these live in the second row and not at the window.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['seating', 'pouf', 'storage', 'overflow', 'round', 'rattan', 'natural', 'japandi', 'value'],
    price: 100,
  },

  {
    id: 'chair-frosvi-folding-beech',
    name: 'FRÖSVI folding chair, beech',
    kind: 'chair',
    w: IN(17.375),
    d: IN(20.125),
    h: IN(30.375),
    seatHeight: IN(17.75),
    color: '#D8C0A0',
    accent: '#D8C0A0',
    source: `IKEA FRÖSVI folding chair in BEECH (art. 705.343.15): solid beech with a clear acrylic lacquer, folds flat, comes assembled, $25.00 — the same chair, the same price and the same dimensions as the black version this scheme replaces, which IKEA also sells in white and white/Knisa light grey. Colourways, material and price read off ikea.com/us 31 Jul 2026. Dimensions carried over from the black entry: 17 3/8" W x 20 1/8" D x 30 3/8" H, seat 17 3/4". IT IS A FREE SWAP AND THAT IS THE POINT. Two folding chairs are 36 sq ft of visible surface standing in the middle of the west promenade — in frame in every daylight photograph of this apartment — at 1.5% LRV in black and about 54% in beech, and they are 14 ft from the picture and BEHIND the audience, so the change costs the projected image nothing measurable at all. It is the cheapest tonal move in the whole catalog: $0. THE ONE OBJECTION, and it is real: beech is a third pale wood in a room that already has white oak (the bed) and brushed oak (the nightstand, the bench). Beech is pinker and paler than either. In a folding chair that lives in a closet eleven months of the year that is acceptable; on a piece that stands still it would not be.`,
    frontClearance: IN(18),
    tags: ['seating', 'dining-chair', 'folding', 'stowable', 'beech', 'light', 'value'],
    price: 25,
  },

  // ---- the light this apartment has never had --------------------------
  //
  // Layout A ends with NO FLOOR LAMP ANYWHERE, and the note explaining why is
  // right about the evidence and wrong about the rule it draws from it: a
  // 5'-11" HEKTAR standing at the foot of the bed was eating 33.8% of the
  // picture, so the scheme removed every floor lamp in the apartment. But the
  // measurement was about that POSITION, not about height. Rays run EAST from
  // every seat to the picture; a lamp WEST of the westernmost seat is behind
  // every one of them and cannot cross a single ray, at any height. There is
  // exactly one such place, and this is the piece that goes in it.
  {
    id: 'lamp-akari-10a-floor',
    name: 'Isamu Noguchi Akari 10A floor lantern',
    kind: 'floor_lamp',
    w: IN(21),
    d: IN(21),
    h: IN(48),
    color: CREAM,
    accent: OFF_WHITE,
    source: `Akari Light Sculpture model 10A, Isamu Noguchi, 1951 onward — handmade washi paper on bamboo ribbing over a metal frame, still made by Ozeki in Gifu, Japan. 48" H x 21" W x 21" D, $700 ($630 for museum members). Dimensions and price read off shop.noguchi.org 31 Jul 2026; the shop's own note that day was "orders currently shipping in one to two weeks". WHETHER THE 10A SHIPS WITH ITS STAND IS NOT STATED ON THE PAGE AND MUST BE CONFIRMED BEFORE ORDERING — several Akari models price the shade and the stand separately, and a stand is $60-$150. THE ONE PLACE IT CAN STAND, and the reason this entry exists: the west glazing is four bays with SOLID PIERS between them (WINDOW_BAYS in faces.ts gives the gaps at y 5'-6 3/8"..5'-10 1/2", y 8'-6 7/8"..9'-11 1/8" and y 12'-8 3/8"..13'-0 5/8"). The middle pier is 1'-4 1/4" of real wall inside 18'-6" of glass, and finishes.ts calls it "the ONLY place in the west wall you can hang or lean anything". A 4'-0" lantern standing in front of it blocks no view because there is no view behind it, and it is west of every seat so it crosses no ray. Both of the room's rules are satisfied by geometry rather than by exception. HONEST COSTS, THREE. (1) $700 for one light is the most expensive thing per pound in the apartment, and an Akari 1A on the bench top is $195 and does two thirds of the job. (2) A 21" sphere in front of a 16 1/4" pier overlaps the flanking bays by about 2 1/4" a side; that is a real number and it is the price of the position. (3) Washi is paper: it yellows, it tears, and it is the one object here a cat or a moving box will destroy. Ozeki sells replacement shades, which is the answer, and it is also the reason this is a light sculpture rather than a lamp.`,
    frontClearance: 0,
    tags: ['lighting', 'floor-lamp', 'paper', 'washi', 'japandi', 'design', 'premium', 'behind-the-audience'],
    price: 700,
  },

  {
    id: 'lamp-akari-1a-table',
    name: 'Isamu Noguchi Akari 1A table lantern',
    kind: 'table_lamp',
    w: IN(10),
    d: IN(10),
    h: IN(17),
    color: CREAM,
    accent: OFF_WHITE,
    source: `Akari Light Sculpture model 1A, Isamu Noguchi — handmade washi paper on bamboo ribbing over a metal frame, made by Ozeki in Gifu. 17" H x 10" W x 10" D, $195.00 ($175.50 for museum members). Dimensions, materials and price read off shop.noguchi.org 31 Jul 2026. THE PAGE DOES NOT STATE WHETHER THE STAND AND THE CORD SET ARE INCLUDED and several Akari models price them separately — confirm before ordering, and budget $60-$150 if not. IT IS SPECIFIED HERE INSTEAD OF THE 48" 10A FLOOR MODEL, and the reason is circulation rather than money. The 10A is 21" in diameter, and the only position in this plan where a tall lantern is legal — in front of the west glazing's middle pier, which is the one place a 4 ft object blocks no view and crosses no seat-to-screen ray — sits in the middle of a 3'-8 1/4" promenade. A 21" globe there leaves 1'-9 3/4" and severs the walk to the west windows. Measured, drawn, rejected: see the layout G BACK OF THE SOFA note. On a 17 1/2" bench top this lantern's head lands at 34 1/2" AFF, which is a low warm pool exactly where a room with nothing but ceiling downlights needs one, and it costs nothing at all in floor.`,
    frontClearance: 0,
    lowProfile: true,
    tags: ['lighting', 'table-lamp', 'paper', 'washi', 'japandi', 'design'],
    price: 195,
  },

  // ---- the wall, which is the only dark thing this scheme ADDS ----------
  {
    id: 'paint-screen-wall-urbane-bronze',
    name: 'Screen-wall paint, SW 7048 Urbane Bronze — drawn as a surface',
    kind: 'box',
    // The full west face of the bathroom partition: 9'-10 1/4" of wall, floor to
    // soffit. Drawn 1/4" proud so it renders as the wall's face rather than
    // z-fighting with it.
    w: FTIN(9, 10.25),
    d: IN(0.25),
    h: 8.95,
    color: INK_WALL,
    accent: INK_WALL,
    source: `NOT FURNITURE — this is PAINT, catalogued as an object so that it appears in the schedule, in the budget and in the render, because in this scheme it is a purchase and a decision and not a finish note. Sherwin-Williams Urbane Bronze SW 7048: hex #54504A, LRV 8, a warm brown-charcoal with a faint green under it. Two coats of flat acrylic latex over the existing flat white, corner to corner and floor to soffit, on the WEST FACE OF THE BATHROOM PARTITION ONLY (P1, x = 18'-10 3/8"), which is 85-88 sq ft gross and about 55 sq ft net of the screen frame. $205 IS AN ESTIMATE, not a quotation: two gallons at about $75 plus a roller, a brush, tape and a drop, assuming the client paints it. A painter would charge $300-$450 for one wall including cutting in to a bare concrete soffit, which is the fussy part. FLAT, per the walls rule in finishes.ts — and there is a second reason here: a UST lens throws at 0.22:1, i.e. it rakes this wall at a few degrees, which is the single most merciless light a drywall butt joint will ever get. Any sheen above flat and the joints will read. WHAT IT BUYS, HONESTLY. Very little in the arithmetic and a great deal in the eye. The measured ambient return to the screen is dominated by the north wall and the soffit; this wall is COPLANAR with the picture, so it returns almost nothing to it and darkening it does NOT move the in-room contrast number. What it does is remove the bright surround: a 100" image is judged against whatever is beside it, and 55 sq ft of 88%-LRV white 1/2" from the picture's edge raises the eye's adaptation level and crushes perceived black in a way no contrast ratio records. It also does the thing this whole scheme needs: it puts the dark somewhere deliberate, so the plinth, the projector, the screen frame and the desk stop reading as black objects stranded on white and start reading as one dark end of a warm room. IT IS DRAWN AS AN OPTION AND NOT AS A DECISION, and layout G says why in full: with this wall painted the room measures 46.3% area-weighted against 50.8% without it and 48.0% for layout A, so a client who said "too dark" would be handed a room measurably darker than the one they complained about. There is also an objection that cuts both ways and settles nothing: the ALR fabric is 26.6% LRV, so on an 8% wall the switched-OFF screen becomes three times brighter than the wall behind it. The picture never disappears; the paint only chooses which way it stands out. Tape a 2 ft sample board to that wall, look at it once in daylight and once at 8pm with the downlights on, then decide. RENTAL NOTE: it is one wall of flat latex and it repaints in an afternoon. Ask first; it is still someone else's wall.`,
    frontClearance: 0,
    wallMounted: true,
    walkable: true,
    defaultZ: 0,
    tags: ['finish', 'paint', 'screen-wall', 'projection', 'render-surface'],
    price: 205,
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
