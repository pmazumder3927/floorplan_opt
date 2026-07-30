/**
 * The subject building: a 508 sq ft L-shaped studio apartment.
 *
 * Traced geometry comes from the supplied listing graphic (scale 28.587 px/ft,
 * accuracy ~±0.3 ft). Where the trace disagreed with real manufactured sizes,
 * the real size wins and the substitution is recorded in PLAN_NOTES so the
 * environment stays honest about what is measured vs. assumed.
 */

import { FTIN, IN } from './units';
import type { FloorPlan, Fixture, Opening, Vec2, Wall, Zone } from './types';

/** Exterior wall thickness, from the traced offset between outer and inner faces. */
const EXT_T = 0.63; // 7 1/2"
const WEST_T = 0.59; // 7"
/** Interior partition thickness (2x4 + board). */
const PART_T = FTIN(0, 4.5);
/** Assumed, not on the plan. */
const CEILING = 9.0;

/**
 * Inner wall faces, named because half the built-ins are dimensioned off them.
 * Note the two south faces differ: the kitchen leg is 10" deeper than the east leg.
 */
const S_FACE_KITCHEN = 19.17;
const S_FACE_EAST = 18.36;
const E_FACE_BATH = 26.27;
const N_FACE_BATH = 3.22;

/** Stacked washer/dryer, and the closet it lives in. */
const WD_X = 13.57;
const WD_W = 2.45; // 2'-5", a standard stacked pair
const WD_D = 2.62; // 2'-8" deep
/** Closet front (door plane): W/D depth + 3" of hookup space behind. */
const WD_FRONT = S_FACE_KITCHEN - (WD_D + FTIN(0, 3));

const footprint: Vec2[] = [
  [0.0, 0.0],
  [10.53, 0.0],
  [10.53, 2.59],
  [26.9, 2.59],
  [26.9, 11.65],
  [30.36, 11.65],
  [30.36, 18.99],
  [17.35, 18.99],
  [17.35, 19.8],
  [0.0, 19.8],
];

const interior: Vec2[] = [
  [0.59, 0.63],
  [9.93, 0.63],
  [9.93, 3.22],
  [26.27, 3.22],
  [26.27, 12.28],
  [29.73, 12.28],
  [29.73, 18.36],
  [17.95, 18.36],
  [17.95, 19.17],
  [0.59, 19.17],
];

/**
 * Exterior walls, traced on the OUTER face, listed clockwise on the page.
 * Every one has the interior on its `right` (with +y down, walking start->end,
 * the right-hand normal is (-dy, dx)).
 */
const exteriorWalls: Wall[] = ([
  { id: 'W1', name: 'N wall (living)', start: [0.0, 0.0], end: [10.53, 0.0], thickness: EXT_T },
  { id: 'W2', name: 'N step at bath', start: [10.53, 0.0], end: [10.53, 2.59], thickness: EXT_T },
  { id: 'W3', name: 'N wall (bath)', start: [10.53, 2.59], end: [26.9, 2.59], thickness: EXT_T },
  { id: 'W4', name: 'E wall (bath)', start: [26.9, 2.59], end: [26.9, 11.65], thickness: EXT_T },
  { id: 'W5', name: 'E step at entry', start: [26.9, 11.65], end: [30.36, 11.65], thickness: EXT_T },
  { id: 'W6', name: 'E wall (entry)', start: [30.36, 11.65], end: [30.36, 18.99], thickness: EXT_T },
  { id: 'W7', name: 'S wall (east)', start: [30.36, 18.99], end: [17.35, 18.99], thickness: EXT_T },
  { id: 'W8', name: 'S step at kitchen', start: [17.35, 18.99], end: [17.35, 19.8], thickness: EXT_T },
  { id: 'W9', name: 'S wall (kitchen)', start: [17.35, 19.8], end: [0.0, 19.8], thickness: EXT_T },
  { id: 'W10', name: 'W wall (windows)', start: [0.0, 19.8], end: [0.0, 0.0], thickness: WEST_T },
] satisfies Array<{ id: string; name: string; start: Vec2; end: Vec2; thickness: number }>).map(
  (w) => ({ ...w, kind: 'exterior' as const, height: CEILING, interiorSide: 'right' as const }),
);

/**
 * Interior partitions enclosing the bathroom. Not dimensioned on the source
 * plan; centerlines are derived from the traced bathroom polygon
 * (x 19.24..26.27, y 3.22..12.70) offset outward by half a partition.
 */
const partitions: Wall[] = [
  {
    id: 'P1',
    name: 'Bath W wall',
    start: [19.24 - PART_T / 2, 2.59],
    end: [19.24 - PART_T / 2, 12.7 + PART_T / 2],
    thickness: PART_T,
    kind: 'partition',
    height: CEILING,
  },
  {
    id: 'P2',
    name: 'Bath S wall',
    start: [19.24 - PART_T / 2, 12.7 + PART_T / 2],
    end: [26.27 + PART_T / 2, 12.7 + PART_T / 2],
    thickness: PART_T,
    kind: 'partition',
    height: CEILING,
  },
  {
    id: 'P3',
    name: 'Bath/entry wall',
    start: [26.27 + PART_T / 2, 11.65],
    end: [26.27 + PART_T / 2, 12.7 + PART_T / 2],
    thickness: PART_T,
    kind: 'partition',
    height: CEILING,
  },
  // Laundry closet enclosing the stacked washer/dryer. The traced plan shows the
  // W/D as a bare box in the counter run, but it is really inside its own closet
  // with bifold doors and a shelf over the units. Jamb returns at the sides, a
  // header wall across the front; interior sized to the 2'-5" x 2'-8" W/D plus
  // 3" of hookup space behind (34 1/2" total closet depth off the S wall).
  {
    id: 'P4',
    name: 'Laundry closet W jamb',
    start: [WD_X - PART_T / 2, WD_FRONT - PART_T / 2],
    end: [WD_X - PART_T / 2, S_FACE_KITCHEN],
    thickness: PART_T,
    kind: 'partition',
    height: CEILING,
  },
  {
    id: 'P5',
    name: 'Laundry closet E jamb',
    start: [WD_X + WD_W + PART_T / 2, WD_FRONT - PART_T / 2],
    end: [WD_X + WD_W + PART_T / 2, S_FACE_KITCHEN],
    thickness: PART_T,
    kind: 'partition',
    height: CEILING,
  },
  {
    id: 'P6',
    name: 'Laundry closet front / header',
    start: [WD_X - PART_T / 2, WD_FRONT - PART_T / 2],
    end: [WD_X + WD_W + PART_T / 2, WD_FRONT - PART_T / 2],
    thickness: PART_T,
    kind: 'partition',
    height: CEILING,
  },
];

export const walls: Wall[] = [...exteriorWalls, ...partitions];

/**
 * Openings. `offset` is measured along the wall from Wall.start, so west-wall
 * windows (W10 runs south->north) are offset from the SW corner.
 * Sill/head heights are assumed (not on the source plan).
 */
/**
 * FLOOR-TO-CEILING GLAZING.
 *
 * Corrected from a photograph of the actual unit (data/reference/): the west
 * openings are not punched windows with a 2'-6" sill, they are full-height glazed
 * assemblies in black anodised aluminium running from the floor slab to just
 * under the concrete soffit. That is a big deal for layout, not just looks —
 * nothing can hide "below the sill" any more, so any piece taller than about 2'-6"
 * in front of the glass now genuinely blocks daylight and the view.
 */
const WIN_SILL = 0.0;
const WIN_HEAD = CEILING - FTIN(0, 4); // slim head detail under the slab
const DOOR_HEAD = FTIN(6, 10);

export const openings: Opening[] = [
  // West wall windows, traced by their y-extent; offset = 19.8 - y_end.
  { id: 'WIN1', name: 'Window 1 (N)', kind: 'window', wall: 'W10', offset: 14.27, width: 2.73, sill: WIN_SILL, head: WIN_HEAD },
  { id: 'WIN2', name: 'Window 2', kind: 'window', wall: 'W10', offset: 11.23, width: 2.69, sill: WIN_SILL, head: WIN_HEAD },
  { id: 'WIN3', name: 'Window 3', kind: 'window', wall: 'W10', offset: 7.1, width: 2.77, sill: WIN_SILL, head: WIN_HEAD },
  { id: 'WIN4', name: 'Window 4 (S)', kind: 'window', wall: 'W10', offset: 3.25, width: 3.5, sill: WIN_SILL, head: WIN_HEAD },
  {
    id: 'D2',
    name: 'Unit entry door',
    kind: 'door',
    wall: 'W6',
    offset: 1.47,
    width: 3.18,
    sill: 0,
    head: DOOR_HEAD,
    swing: { hinge: 'near', into: 'right', angle: 90 },
  },
  {
    id: 'D1',
    name: 'Bathroom door',
    kind: 'door',
    wall: 'P2',
    offset: 0.66,
    width: 2.67,
    sill: 0,
    head: DOOR_HEAD,
    swing: { hinge: 'near', into: 'right', angle: 90 },
    approximate: true,
  },
  {
    // Bifold pair on the laundry closet. Modelled as a 'passage' rather than a
    // 'door' on purpose: bifolds fold flat into the jambs, so they do not sweep
    // a quarter-disc of floor and must not be analysed as if they did. The
    // working space in front is enforced by WD's 36" clearance instead.
    id: 'D3',
    name: 'Laundry closet bifold doors',
    kind: 'passage',
    wall: 'P6',
    offset: PART_T / 2,
    width: WD_W,
    sill: 0,
    head: FTIN(6, 8),
    approximate: true,
  },
];

export const zones: Zone[] = [
  {
    id: 'living',
    name: 'Living / Sleeping',
    type: 'living',
    note: 'Open studio. Everything except the bath, the kitchen strip and the entry nook.',
    polygon: [
      [0.59, 0.63],
      [9.93, 0.63],
      [9.93, 3.22],
      [19.24 - PART_T, 3.22],
      [19.24 - PART_T, 12.7 + PART_T],
      [26.27, 12.7 + PART_T],
      [26.27, 18.36],
      [17.95, 18.36],
      [17.95, 15.0],
      [0.59, 15.0],
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen / Laundry',
    type: 'kitchen',
    note: 'Single-run galley along the south wall, west end.',
    polygon: [
      [0.59, 15.0],
      [17.95, 15.0],
      [17.95, 19.17],
      [0.59, 19.17],
    ],
  },
  {
    id: 'bath',
    name: 'Bathroom',
    type: 'bath',
    note: "7'-0\" x 9'-6\" full bath",
    polygon: [
      [19.24, 3.22],
      [26.27, 3.22],
      [26.27, 12.7],
      [19.24, 12.7],
    ],
  },
  {
    id: 'entry',
    name: 'Entry',
    type: 'circulation',
    note: 'Entry nook, SE corner.',
    // L-shaped: the nook runs all the way up to the inner face of the W5 step
    // (y=12.28), so it includes the slot east of the bath/entry wall P3. Only the
    // part west of P3 is cut off by the bathroom's south wall at y=13.075.
    polygon: [
      [26.27 + PART_T, 12.28],
      [29.73, 12.28],
      [29.73, 18.36],
      [26.27, 18.36],
      [26.27, 12.7 + PART_T],
      [26.27 + PART_T, 12.7 + PART_T],
    ],
  },
];

export const fixtures: Fixture[] = [
  // ---- kitchen: single 25 1/2" deep counter run along the south wall
  {
    id: 'COUNTER',
    name: 'Kitchen counter',
    category: 'kitchen',
    footprint: { x: 0.59, y: S_FACE_KITCHEN - 2.1, w: 10.08, h: 2.1 },
    height: 3.0,
    facing: 180,
    clearance: IN(42),
  },
  {
    id: 'UPPERS',
    name: 'Upper cabinets',
    category: 'kitchen',
    footprint: { x: 0.59, y: S_FACE_KITCHEN - 1.08, w: 10.08, h: 1.08 },
    height: 7.0,
    z: 4.5,
    approximate: true,
  },
  {
    id: 'DW',
    name: 'Dishwasher (24")',
    category: 'kitchen',
    footprint: { x: 0.8, y: S_FACE_KITCHEN - 2.1, w: 2.0, h: 2.1 },
    height: 2.9,
    facing: 180,
    clearance: IN(36),
  },
  {
    id: 'SINK',
    name: 'Kitchen sink (30")',
    category: 'kitchen',
    footprint: { x: 3.15, y: S_FACE_KITCHEN - 2.1, w: 2.5, h: 2.1 },
    height: 3.05,
    facing: 180,
    clearance: IN(36),
  },
  {
    id: 'RANGE',
    name: 'Range (30")',
    category: 'kitchen',
    footprint: { x: 6.15, y: S_FACE_KITCHEN - 2.1, w: 2.5, h: 2.1 },
    height: 3.0,
    facing: 180,
    clearance: IN(36),
  },
  {
    id: 'REF',
    name: 'Refrigerator (30")',
    category: 'kitchen',
    footprint: { x: 10.67, y: S_FACE_KITCHEN - 2.5, w: 2.5, h: 2.5 },
    height: FTIN(5, 8),
    facing: 180,
    clearance: IN(36),
    approximate: true,
  },
  {
    id: 'WD',
    name: 'Washer / dryer (stacked)',
    category: 'laundry',
    // Pushed to the back of its closet, leaving the 3" hookup gap at the rear.
    footprint: { x: WD_X, y: S_FACE_KITCHEN - WD_D, w: WD_W, h: WD_D },
    height: FTIN(6, 0),
    facing: 180,
    clearance: IN(36),
    approximate: true,
  },
  {
    id: 'WD_SHELF',
    name: 'Laundry shelf',
    category: 'laundry',
    // Wire shelf in the dead space over a 6'-0" stacked pair, 3" of clearance
    // above the dryer so the door can open. 1 1/2" shelf, full closet interior.
    footprint: { x: WD_X, y: WD_FRONT, w: WD_W, h: S_FACE_KITCHEN - WD_FRONT },
    z: FTIN(6, 3),
    height: FTIN(6, 4.5),
    approximate: true,
  },

  // ---- storage: run of reach-in closets on the south wall of the east leg
  {
    id: 'CLO',
    name: 'Reach-in closets (4 doors)',
    category: 'storage',
    footprint: { x: 17.95, y: S_FACE_EAST - 2.0, w: 8.0, h: 2.0 },
    height: 8.0,
    facing: 0,
    clearance: IN(30),
    approximate: true,
  },

  // ---- bath
  {
    id: 'LINEN',
    name: 'Linen closet',
    category: 'storage',
    footprint: { x: 19.24, y: N_FACE_BATH, w: 2.03, h: 2.0 },
    height: 7.0,
    facing: 0,
    approximate: true,
  },
  {
    id: 'TUB',
    name: 'Alcove tub / shower (60")',
    category: 'bath',
    footprint: { x: E_FACE_BATH - 5.0, y: N_FACE_BATH, w: 5.0, h: FTIN(2, 8) },
    height: 1.6,
    facing: 0,
    clearance: IN(24),
  },
  {
    id: 'WC',
    name: 'Toilet',
    category: 'bath',
    footprint: { x: E_FACE_BATH - FTIN(2, 4), y: 7.1, w: FTIN(2, 4), h: FTIN(1, 8) },
    height: FTIN(2, 6),
    facing: 90,
    clearance: IN(24),
  },
  {
    id: 'VAN',
    name: 'Vanity + sink',
    category: 'bath',
    footprint: { x: E_FACE_BATH - 1.79, y: 9.3, w: 1.79, h: 2.59 },
    height: FTIN(2, 8),
    facing: 90,
    clearance: IN(30),
  },
];

/** Everything that is an assumption rather than a measurement. */
export const PLAN_NOTES: string[] = [
  'Source: traced listing graphic at 28.587 px/ft. Treat all coordinates as ±0.3 ft.',
  `Ceiling height ${CEILING}' is ASSUMED (not shown on the source plan).`,
  `Window sills at ${WIN_SILL}' and heads at ${WIN_HEAD}' are ASSUMED.`,
  'Interior partitions (P1-P3) are not dimensioned on the source; centerlines derived from the traced bathroom polygon at 4 1/2" thick.',
  'Bathroom door widened from the traced 3\'-1" swing arc to a real 2\'-8" leaf.',
  'Range set to a real 30" unit centered on the traced 3\'-0" opening; dishwasher to a real 24".',
  'Kitchen upper cabinets are inferred, not on the source plan.',
  'The traced closet run overhung the south wall; re-seated as a real 24"-deep, 8\'-0" reach-in run on the inner face.',
  "The traced bath fixture block spanned the full 7'-0\" width; modelled as a real 60\" alcove tub plus a 24\" linen closet.",
  'Washer/dryer modelled as a stacked pair (traced footprint is a single 2\'-5" x 2\'-8" box).',
  'The W/D is enclosed in its own laundry closet (partitions P4-P6, bifold doors D3, wire shelf over the units at 6\'-3"). The source plan drew it as a bare box in the counter run; the closet is inferred.',
];

export const studio: FloorPlan = {
  id: 'studio-508',
  name: '508 sq ft L-shaped studio',
  units: 'ft',
  ceilingHeight: CEILING,
  footprint,
  interior,
  walls,
  openings,
  zones,
  fixtures,
  meta: {
    statedAreaSqft: 508,
    footprintAreaSqft: 507.9,
    interiorAreaSqft: 448.1,
    overallWidth: 30.36,
    overallDepth: 19.8,
    accuracy: '±0.3 ft — scaled from a listing graphic',
    source: 'traced listing floor plan',
  },
};

export const plans: Record<string, FloorPlan> = {
  [studio.id]: studio,
};

export function getPlan(id: string = studio.id): FloorPlan {
  const p = plans[id];
  if (!p) throw new Error(`Unknown plan: ${id}. Known: ${Object.keys(plans).join(', ')}`);
  return p;
}
