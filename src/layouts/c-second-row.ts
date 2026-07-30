/**
 * LAYOUT C — "Second row"
 *
 * STRATEGY: SIX SEATS, AND THE BED IS ONE OF THEM.
 *
 * The one idea this scheme bets everything on: in a studio the bed is the best
 * seat in the house, and a LOW queen platform is under the 46" seated-eye line,
 * so it can sit in the MIDDLE of the floor without blocking anybody's view. So
 * the Floyd queen (67" x 86", 17 1/2" made up, no headboard — the lowest real
 * queen there is) lies head-to-the-west-glazing across the middle of the room,
 * aimed due EAST at a 100" ALR screen on the bathroom partition. Two JÄRRESTAD
 * poufs and two ALSEDA floor cushions land on the rug between the foot of the
 * bed and the plinth. That is 2 + 4 = six people watching one 100" picture, and
 * the room never buys a sofa. Nobody sits behind anybody: the bed's deck is
 * 17 1/2" and the tallest thing in the audience is a 16 1/2" pouf.
 *
 * The seating ladder that falls out of it is unusually good for 213 sq ft of
 * usable floor. Measured centre-to-centre against the 88.4" frame:
 *   ALSEDA floor cushions   10'-0 1/8" and 10'-2"    — 40 deg, immersive
 *   JÄRRESTAD poufs         10'-6" and 10'-10 7/8"   — 38 and 37 deg
 *   the bed, from the pillows 14'-7 1/4"             — 28 deg, near SMPTE's 30
 * Every one of the six is inside the analyzer's 8'-9 3/16" .. 18'-8 3/16" band
 * for a 100" image, with 1'-3" of margin at the near end and 4'-1" at the far.
 *
 * THE THING THAT ACTUALLY SHAPED THIS PLAN, and it is not the sightlines. A
 * queen laid head-west across the notch is 7'-2" long in a 9'-4" wide notch, so
 * it very nearly seals off everything north of it — and north of it is where the
 * dresser, the bedside table and the second sleeper's side of the bed live. Two
 * dimensions had to be bought back to stop that happening, and both are why this
 * layout looks the way it does:
 *   1. the bed's head goes HARD to the glass (1/4" off it) rather than sitting
 *      1'-0" back, which moves the whole front row 1'-0" west and opens a
 *      2'-6 7/16" gate between the poufs and the west end of the desk;
 *   2. the front row is pushed 9" SOUTH of the screen axis, which leaves a
 *      2'-6 3/8" lane along the wide leg's north wall.
 * Those two moves are what take every required route in the unit to 3'-6".
 *
 * DESK ORIENTATION — the shared rule, and this layout obeys it. The glazing
 * faces WEST and takes direct sun from about 3pm to sunset, so a screen may face
 * NORTH or SOUTH but never into or away from that sun. The Jarvis top therefore
 * runs east-west against the north wall of the WIDE LEG (the notch's north wall
 * is behind the bed and could never take a chair), the user sits south of it
 * facing north, the monitor faces SOUTH, and the glass is on the user's LEFT.
 * Daylight rakes across the work surface and never down the barrel of the panel.
 *
 * WHAT THIS SCHEME CANNOT DO, stated at the top rather than buried: there is no
 * sofa and there never will be — nothing upholstered fits once a queen lies
 * across the middle of the room. There is no dining table. And the bed is
 * PUBLIC: it is the first thing you see from the front door and it is the back
 * row of the cinema, so a made bed is part of the room's presentation every
 * single day.
 */

import type { Layout } from '@/core/types';
import {
  BATH_W_FACE,
  GLASS_BAND_E,
  KITCHEN_AISLE_N,
  N_FACE,
  N_FACE_WIDE,
  STEP_X,
  W_FACE,
  WINDOW_BAYS,
} from './faces';

// ---------------------------------------------------------------------------
// THE SCREENING AXIS
//
// One east-west line carries the screen, the projector's lens, the plinth and
// the bed. y = 8'-9 5/8" is not a composition choice, it is the only value that
// satisfies four separate constraints at once:
//   * the 88.4" frame has to land inside the 9'-10" of blank partition between
//     N_FACE_WIDE (3.22) and BATH_S_FACE (13.075) -> AXIS_Y in 6.90 .. 9.39;
//   * the bed, centred on it, must keep 2'-0" of real clear floor on both long
//     sides AND stay north of the kitchen aisle line -> AXIS_Y <= 8.90;
//   * the front row's own mid-point is pinned at y 9'-6 1/4" by the 2'-6" lane
//     it has to leave along the wide leg's north wall, so every foot the axis
//     moves north makes the rank read more lopsided against the picture;
//   * 8.80 is the southernmost value the bed will take, which is therefore the
//     least lopsided one available: the rank ends up 9" south of the axis.
// ---------------------------------------------------------------------------
const AXIS_Y = 8.8;

// ---- the picture ----------------------------------------------------------
// 100" 16:9 = 87.16" x 49.03" = 7.263 ft x 4.086 ft. Every distance below is a
// multiple of the IMAGE width, never the frame width.
const IMAGE_W = 7.2631; // (100/12) * (16/9) / hypot(16/9, 1)

// VIVIDSTORM CineVision Pro UST ALR, 100": 88.4" x 50.2" frame, 1 1/2" deep.
// Back flush to the west face of the bathroom partition, which is the only
// 9'-10" run of blank wall in the unit.
const SCREEN_D = 1.5 / 12; // 0.125
const SCREEN_W = 88.4 / 12; // 7.3667
const SCREEN_CX = BATH_W_FACE - SCREEN_D / 2; // 18.8025 — frame back on 18.865
const FABRIC_X = SCREEN_CX - SCREEN_D / 2; // 18.74 — the plane the throw is measured to
const SCREEN_N = AXIS_Y - SCREEN_W / 2; // 5.1167 — 1'-10 3/4" of blank wall above
const SCREEN_S = AXIS_Y + SCREEN_W / 2; // 12.4833 — 7 1/8" below (BATH_S_FACE 13.075)
// Image bottom 28 1/2" AFF = plinth top 14" + 14 1/2". The 88.4" x 50.2" frame
// is 1.17" taller than the 49.03" picture, so the picture sits 0.585" up inside
// it and the FRAME bottom has to land at 27.915" — NOT at the catalog's 28"
// defaultZ, which would put the image bottom at 28 19/32". A 1/16" correction,
// carried because the whole scheme hangs off this number and because a note that
// says 28 1/2" should mean 28 1/2".
const FRAME_H = 50.2 / 12; // 4.18333
const IMAGE_H = 49.032 / 12; // 4.086
const IMAGE_Z = 28.5 / 12; // 2.375 — the picture itself
const SCREEN_Z = IMAGE_Z - (FRAME_H - IMAGE_H) / 2; // 2.32625 = 27.915"

// The lit picture, for an evening render. Coincident with the fabric.
const IMAGE_D = 0.1 / 12; // 0.00833
const IMAGE_CX = FABRIC_X - IMAGE_D / 2; // 18.7358

// ---- the throw ------------------------------------------------------------
// Hisense PX3-PRO, 0.22:1 fixed, lens 10.65" in from the REAR face of a 11.7"
// deep cabinet. Nothing else in the catalog can work on this wall: the open
// floor in front of it is 18'-4" long but a 1.21-1.59:1 standard lens needs
// 8'-10" to 11'-7" for a 100" image, which lands the projector inside the front
// row. A UST is the only answer here, and this is the best-verified one.
const THROW = 0.22 * IMAGE_W; // 1.5979 = 1'-7 3/16"
const PROJ_D = 11.7 / 12; // 0.975
const PROJ_LENS_OFFSET = 10.65 / 12; // 0.8875
const PROJ_REAR_GAP = THROW - PROJ_LENS_OFFSET; // 0.7104 = 8 1/2", the published figure
const PROJ_CX = FABRIC_X - PROJ_REAR_GAP - PROJ_D / 2; // 17.5421

// ---- the plinth the projector stands on -----------------------------------
// 66" x 24" x 14" bespoke millwork, back 1/4" off the partition face. 14" of
// height is not a style choice: image bottom = plinth top + ~14 1/2", and a
// 45-55" image centre is what suits a 16-18" seat. Every off-the-shelf media
// console is 21-36" tall and puts the picture up where a badly hung TV goes.
const PLINTH_D = 2.0;
const PLINTH_CX = BATH_W_FACE - 0.02 - PLINTH_D / 2; // 17.845 -> back face 18.845
const PLINTH_W_FACE = PLINTH_CX - PLINTH_D / 2; // 16.845 — the front of the media wall
const PLINTH_TOP = 14 / 12; // 1.1667 — the projector's z

// ---- the bed, which is the back row ---------------------------------------
// Floyd queen (Original), 67" x 86" x 17 1/2" made up, NO headboard (the
// headboard option takes it to 31 1/2" and fails the 30" glazing rule). rot 270
// so the head is WEST and you lie facing EAST, straight down the axis at the
// picture.
//
// The head goes HARD to the glass — 1/4" off the inner face — and that is a
// circulation decision, not a romantic one. Every inch the head comes east
// pushes the foot east, and the foot is what pinches the only route into the
// bed's north side: the front row cannot move east past the 8'-9 3/16" minimum
// viewing distance, so a bed head held 1'-0" back closes that gate to 1'-6" and
// the analyzer reports it. Flush, the gate is 2'-6 7/16" and every route in the
// apartment measures 3'-6". The price is two blocks-window warnings, which the
// notes below deal with head-on.
const BED_W = 67 / 12; // 5.5833 across
const BED_L = 86 / 12; // 7.1667 head to foot
const BED_HEAD_X = W_FACE + 0.02; // 0.61 — headboard-less deck, flush to the glass
const BED_CX = BED_HEAD_X + BED_L / 2; // 4.1933
const BED_FOOT_X = BED_HEAD_X + BED_L; // 7.7767 = 7'-9 5/16"
const BED_N = AXIS_Y - BED_W / 2; // 6.0083 — 3'-9 7/16" to the dresser face
const BED_S = AXIS_Y + BED_W / 2; // 11.5917 — 1'-11 3/4" to KITCHEN_AISLE_N (13.57)

// ---- the front row --------------------------------------------------------
// SEATING RULE, and it is the opposite of how overflow seating is normally
// planned: an ALSEDA at 6 3/4" puts an eye at about 30" AFF, i.e. AT OR BELOW
// the bottom of a projected image sitting at 28 1/2", so floor seating goes in
// FRONT. A JÄRRESTAD at 16 1/2" puts an eye near 40", above the image bottom, so
// a pouf may sit behind one.
//
// Here "behind" is LATERAL rather than deep, and that is forced, not chosen. The
// band of floor between the foot of the bed (x 7'-9 5/16") and the 8'-9 3/16"
// minimum viewing distance (x 9'-11 5/8") is 2'-2" deep — one rank, not two. So
// all four pieces stand in one shallow rank at x 7'-9 5/8" to 9'-9 3/8", poufs
// outboard, cushions inboard.
//
// The whole rank is then pushed SOUTH until its north edge is 2'-6" clear of the
// wide leg's north wall, because that lane is the only way to walk from the
// screen end of the room to the notch. It leaves the rank's mid-point 9" south
// of the screen axis, which is visible in plan and is the deliberate cost of
// keeping the room circulating with all six seats deployed.
const CUSHION_X = BED_FOOT_X + 1.9583 / 2 + 0.045; // 8.80
const ROW_N = N_FACE_WIDE + 2.5 + 0.03; // 5.75 — the north edge of the front row
const POUF_X = BED_FOOT_X + 1.5104 / 2 + 0.02; // 8.5519
const GAP = 0.2; // 2 3/8" between adjacent floor seats
const POUF_N_Y = ROW_N + 1.5104 / 2; // 6.5052
const CUSHION_N_Y = ROW_N + 1.5104 + GAP + 1.9583 / 2; // 8.4396
const CUSHION_S_Y = CUSHION_N_Y + 1.9583 + GAP; // 10.5979
const POUF_S_Y = CUSHION_S_Y + 1.9583 / 2 + GAP + 1.5104 / 2; // 12.5322
const ROW_S = POUF_S_Y + 1.5104 / 2; // 13.2874 — the southernmost object in the plan
const ROW_MARGIN = KITCHEN_AISLE_N - ROW_S; // 0.2826 = 3 3/8" clear of the kitchen aisle
const ROW_MID = (ROW_N + ROW_S) / 2; // 9.5187

// Nordic Knots Desert 8x10 at 0.28" total build — the thinnest rug here, so it
// runs under the foot of the bed AND under the front lip of the plinth without
// shimming anything. rot 90: 8'-0" north-south, 10'-0" east-west.
const RUG_CX = PLINTH_W_FACE - 10.0 / 2; // 11.845 -> x 6.845 .. 16.845
const RUG_CY = ROW_MID; // 9.5187 -> y 5.5187 .. 13.5187

// ---- the work wall --------------------------------------------------------
// Jarvis 60" x 27" in WALNUT LAMINATE, not bamboo: this desk is visible from
// every seat in the room, and walnut laminate reads as furniture rather than as
// office equipment. The cost is 3" of top depth, which is why the monitor is a
// 27" and not a 32".
const DESK_W = 60 / 12; // 5.0
const DESK_D = 27 / 12; // 2.25
const DESK_Y = N_FACE_WIDE + 0.02 + DESK_D / 2; // 4.365
const DESK_BACK = DESK_Y - DESK_D / 2; // 3.24
const DESK_FRONT = DESK_Y + DESK_D / 2; // 5.49
// East end butted to the plinth's front face, so the 5'-0" top and the 5'-6"
// plinth read as ONE L-shaped millwork run wrapping the north-east corner. It
// cannot go further east than this: the plinth would then eat the desk's own
// 2'-6" pull-back. And it must not come further west than this, because the
// clear floor between the front row and the desk's west end is the ONLY way
// into the bed's north aisle.
const DESK_CX = PLINTH_W_FACE - DESK_W / 2; // 14.345 -> top x 11.845 .. 16.845
const DESK_GATE = DESK_CX - DESK_W / 2 - STEP_X; // 1.915 = 1'-11" of wall left at the corner
const WORK_X = DESK_CX; // the work position is centred on the top

// Branch Ergonomic Pro, 25" x 24", PARKED in the pull-back zone rather than
// tucked under the top (the desks in this model are solid boxes with no legroom
// void, so a tucked chair reads as a collision).
const CHAIR_D = 24 / 12; // 2.0
const CHAIR_Y = DESK_FRONT + 0.03 + CHAIR_D / 2; // 6.52 -> chair y 5.52 .. 7.52

// ---- the notch, behind the bed --------------------------------------------
const DRESSER_D = 18.875 / 12; // 1.5729
const DRESSER_Y = N_FACE + 0.02 + DRESSER_D / 2; // 1.4365 -> y 0.65 .. 2.2229
// Slid 1 1/4" east of the bed's own centre line so its 63" carcass clears the
// glazing band: x 1'-8 1/8" .. 6'-11 1/8".
const DRESSER_X = 4.3;
const BEDSIDE_D = 18.5 / 12; // 1.5417 (STOCKHOLM nesting pair, larger table)
const BEDSIDE_Y = BED_N - 0.1675 - BEDSIDE_D / 2; // 5.0695 -> y 4.2986 .. 5.8405
// Its west edge has to clear the 1'-0" glazing band, so the centre cannot come
// west of GLASS_BAND_E plus half its width. 15/16" of slack on top of that puts
// the west edge at x 1'-8", i.e. 1'-1 1/8" off the glass.
const BEDSIDE_X = GLASS_BAND_E + 2.3646 / 2 + 0.078; // 2.8503

// ---- blackout ------------------------------------------------------------
// One roller per bay, drawn to the floor. Bay mid-points and widths come
// straight from WINDOW_BAYS so a correction to the traced plan moves them.
const BAY_MID = WINDOW_BAYS.map(([a, b]) => (a + b) / 2); // 4.165, 7.225, 11.315, 14.80
const BAY_W = WINDOW_BAYS.map(([a, b]) => b - a); // 2.73, 2.69, 2.77, 3.50
const SHADE_D = 3.5 / 12; // 0.2917
const SHADE_X = W_FACE + SHADE_D / 2; // 0.7358 — in the reveal, zero floor
const CHANNEL_D = 1.75 / 12; // 0.1458
const CHANNEL_X = W_FACE + CHANNEL_D / 2; // 0.6629

const layout: Layout = {
  id: 'c-second-row',
  name: 'C — Second row',
  description:
    'The most seats: a 17 1/2"-tall Floyd queen lies head-to-the-glass across the middle of the floor aimed east at a 100" UST picture, so the bed IS the back row — six people watch one screen at 28, 38 and 40 degrees and the room never buys a sofa.',
  plan: 'studio-508',
  items: [
    // ============================================================ THE PICTURE
    {
      id: 'screen',
      def: 'screen-ust-alr-vividstorm-100',
      at: [SCREEN_CX, AXIS_Y],
      rot: 90,
      z: SCREEN_Z,
      label: 'VIVIDSTORM UST ALR 100", image bottom 28 1/2"',
      note: 'Frame back flush to the bathroom partition, fabric at x 18\'-8 7/8", frame y 5\'-1 3/8" to 12\'-5 3/4". That leaves 1\'-10 3/4" of blank plaster above the frame and 7 1/8" below it — the 120" version (105.8" overall) would leave 4", which is INSIDE the traced plan\'s own +/-3.6" tolerance, so 100" is the size you order off a drawing. 170 deg of viewing cone matters more here than gain does, because the outermost pouf sits 20 deg off axis.',
    },
    {
      id: 'image',
      def: 'projection-image-100',
      at: [IMAGE_CX, AXIS_Y],
      rot: 90,
      z: IMAGE_Z,
      label: 'The picture, switched on',
      note: 'Coincident with the fabric, for an EVENING frame only. Putting a lit screen in a daylight render of this unit would assert something the room cannot do — see the blackout note.',
    },
    {
      id: 'plinth',
      def: 'plinth-ust-bespoke-66',
      at: [PLINTH_CX, AXIS_Y],
      rot: 90,
      label: 'UST plinth, bespoke 66 x 24 x 14',
      note: 'The reason this is millwork and not a purchase: image bottom = plinth top + 14 1/2", so a 45-55" image centre needs a top at 12-16" and every console on the market is 21-36". 14" puts the image centre at 53". It also has to be flat, square and parallel to the wall within a couple of millimetres — a UST turns yaw straight into visible trapezoid, and digital keystone on a UST is a resolution crop, not a fix.',
    },
    {
      id: 'projector',
      def: 'projector-ust-hisense-px3-pro',
      at: [PROJ_CX, AXIS_Y],
      rot: 90,
      z: PLINTH_TOP,
      label: 'Hisense PX3-PRO, 0.22:1 — lens 1\'-7 3/16" off the fabric',
      note: 'Standing ON the plinth at 14", cabinet REAR face 8 1/2" off the fabric plane, which is Hisense\'s own published gap at 100". 50 W Harman Kardon means this room needs no soundbar, no subwoofer and none of their cables — in a scheme where the AV wall is visible from the bed, that is a design argument, not a convenience.',
    },

    // ============================================================== THE ROWS
    {
      id: 'bed',
      def: 'bed-queen-floyd-walnut',
      at: [BED_CX, AXIS_Y],
      rot: 270,
      label: 'Floyd queen, 67 x 86, 17 1/2" made up — NO headboard',
      note: 'Head west and hard to the glass, so you lie facing EAST at the picture from 14\'-7 1/4" — a 28 deg image, a hair wider than SMPTE\'s 30 deg reference and exactly what a very good television looks like from the pillows. At 17 1/2" made up, the whole bed sits 28 1/2" BELOW the 46" seated-eye line, which is the only reason a queen can stand in the middle of this room at all.',
    },
    {
      id: 'cushion-n',
      def: 'floor-cushion-alseda-24',
      at: [CUSHION_X, CUSHION_N_Y],
      rot: 270,
      label: 'ALSEDA — front row, north',
      note: 'FRONT row, and it has to be: a 6 3/4" seat puts an eye at about 30" AFF, at or below the 28 1/2" bottom edge of the image, so it can never sit behind anything. 10\'-0 1/8" from the frame, 40 deg — the closest seat in the room and still 1\'-3" outside the analyzer\'s near bound.',
    },
    {
      id: 'cushion-s',
      def: 'floor-cushion-alseda-24',
      at: [CUSHION_X, CUSHION_S_Y],
      rot: 270,
      label: 'ALSEDA — front row, south',
      note: '10\'-2" from the frame, 39 deg. The 2 3/8" gaps between adjacent floor seats are drawn rather than left to chance: four round objects in a 7\'-6 1/2" rank is exactly what the band of floor between the foot of the bed and the near viewing bound will take.',
    },
    {
      id: 'pouf-n',
      def: 'pouf-jarrestad-18',
      at: [POUF_X, POUF_N_Y],
      rot: 270,
      label: 'JÄRRESTAD pouf — north',
      note: 'Hollow, so it stores the throws and the spare cushions inside itself. 10\'-6" from the frame, 38 deg, and 12 deg off the screen axis — well inside the ALR\'s 170 deg cone. Its north edge is the piece that sets the 2\'-6 3/8" circulation lane along the wide leg\'s north wall: move this pouf 3" north and the plan stops working.',
    },
    {
      id: 'pouf-s',
      def: 'pouf-jarrestad-18',
      at: [POUF_X, POUF_S_Y],
      rot: 270,
      label: 'JÄRRESTAD pouf — south',
      note: '10\'-10 7/8" from the frame, 37 deg, and the southernmost object in the whole scheme at y 13\'-3 7/16" — 3 3/8" clear of the kitchen aisle line.',
    },
    {
      id: 'rug',
      def: 'rug-nordicknots-desert-8x10',
      at: [RUG_CX, RUG_CY],
      rot: 90,
      label: 'Nordic Knots Desert 8x10 — the viewing zone',
      note: 'x 6\'-10 1/8" to 16\'-10 1/8" and y 5\'-6 1/4" to 13\'-6 1/4": it runs 11 1/8" under the foot of the bed at one end, stops dead on the face of the plinth at the other, and is centred on the front row rather than on the screen axis so all four floor seats land on it. At 0.28" total build it is the only rug in the catalog that can pass under a 24"-deep plinth without shimming it.',
    },

    // ================================================================= WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-laminate-60x27-walnut',
      at: [DESK_CX, DESK_Y],
      rot: 0,
      label: 'Jarvis laminate 60 x 27, walnut — 3-Stage, 25 3/4"-51 1/4"',
      note: 'Back to the wide leg\'s north wall, monitor facing SOUTH, glazing on the user\'s left. x 11\'-10 1/8" to 16\'-10 1/8": the east end butts the face of the plinth, so the 5\'-0" top and the 5\'-6" plinth read as one L-shaped walnut run wrapping the north-east corner, and 1\'-11" of clear wall is left between the top and the re-entrant corner. It cannot go east of here (the plinth would eat its own pull-back) and it must not come west of here (that 1\'-11" is part of the route into the notch).',
    },
    {
      id: 'desk-arm',
      def: 'monitor-arm-single-jarvis',
      at: [WORK_X, DESK_BACK + 0.21],
      rot: 0,
      note: 'Clamped at the back edge so the panel cantilevers over it and the 27" top still gives a real viewing distance.',
    },
    {
      id: 'monitor',
      def: 'monitor-dell-u2725qe-27',
      at: [WORK_X, DESK_BACK + 0.31],
      rot: 0,
      label: 'Dell U2725QE 27" 4K — top at 50 9/16" AFF',
      note: 'ONE screen, one Thunderbolt cable to the laptop. Its top sits 4 9/16" ABOVE the 46" seated-eye line, so its position is a sightline question rather than a clearance one: it is parked hard on the back edge at y 3\'-6 1/2" and every seat-to-screen line in this layout runs at y 5\'-9" or further south, so nothing looks through it. Eye to panel is about 2\'-4", which is Dell\'s own recommendation for a 27" 4K. This item CARRIED AN ignoreAnalysis UNTIL THE UNDERLYING BUG WAS FIXED, and the history is worth keeping: the tv-distance check used to parse a diagonal out of the def\'s own prose and land on 44 — from the string 7.44" D in Dell\'s published depth — and then apply a 1.2-2.5x LIVING-ROOM multiplier to a desk monitor. Two layouts here worked around it, one by opting the item out and one by substituting a different panel, which is the signal that the check was wrong rather than the layouts. src/core/analysis.ts now rejects a number that is the fractional part of another and skips anything the catalog tags "monitor", so nothing in this file has to be hidden from the analyzer.',
    },
    {
      id: 'desk-surge',
      def: 'desk-acc-surge-clamp-fully',
      at: [WORK_X + 1.6, DESK_BACK + 0.5],
      rot: 0,
      note: 'The only cable accessory MillerKnoll still sells for the Jarvis. It matters because every cable has to survive 25 1/2" of vertical travel a day; a strip on the floor eventually pulls something off the top.',
    },
    {
      id: 'desk-chair',
      def: 'chair-branch-ergonomic-pro',
      at: [WORK_X, CHAIR_Y],
      rot: 180,
      label: 'Branch Ergonomic Pro — 41 1/4" overall, NO headrest',
      note: 'Parked inside the 2\'-6" pull-back at y 5\'-6 1/4" to 7\'-6 1/4", not tucked. Skip the headrest: at 41 1/4" overall the chair passes 4 3/4" UNDER the 46" seated-eye line, so the north half of the front row watches the picture straight across it. A headrest takes it over the line and costs two seats their view. Its west edge also holds the 3\'-6 5/16" gap between the front row and the work zone.',
    },
    {
      id: 'desk-mat',
      def: 'mat-standing-topo',
      at: [WORK_X, DESK_FRONT + 0.03 + 2.1875 / 2 + 0.02],
      rot: 0,
      note: 'Drawn because it is a real 29" x 26" footprint that lives INSIDE the pull-back zone: the chair has to be rolled clear before you stand on it. Treated as walkable, not as an obstruction.',
    },

    // ================================================== THE NOTCH, BEHIND THE BED
    {
      id: 'dresser',
      def: 'dresser-malm-6drawer-63',
      at: [DRESSER_X, DRESSER_Y],
      rot: 0,
      label: 'MALM 6-drawer, 63" — the only closed storage in the room',
      note: 'On the notch\'s north wall, x 1\'-8 1/8" to 6\'-11 1/8", almost on the bed\'s own centre line so the two read as one object from the front door. Its 2\'-6" drawer-pull zone lands in the bed\'s north aisle, which is dead floor otherwise. Its top at 30 3/4" is the tallest thing on the floor west of the desk, and it stands 1\'-1" clear of the glazing band.',
    },
    {
      id: 'bedside',
      def: 'side-stockholm-nesting-walnut',
      at: [BEDSIDE_X, BEDSIDE_Y],
      rot: 0,
      label: 'STOCKHOLM nesting pair — bedside, and a drinks table on film night',
      note: 'A NESTING PAIR, which is the point: the big one lives at the head of the bed at 14 1/8" tall (under the 30" glazing limit, under the 46" eye line), the small one pulls out into the front row when six people need somewhere to put a glass. Its west edge is at x 1\'-8", clear of the 1\'-0" glazing band, and its south edge is 2" off the bed.',
    },
    {
      id: 'lamp',
      def: 'lamp-floor-hektar',
      at: [8.9, 2.6],
      rot: 0,
      note: 'In the dead pocket at the re-entrant corner (x 8\'-3 3/4" to 9\'-5 3/4", y 2\'-0 1/4" to 3\'-2 1/4"), which nothing else in the plan can use. It is the only object in the room taller than a seated eye at floor level, and it is parked NORTH of the circulation lane and WEST of every seat, so it is never between anyone and the screen.',
    },

    // ================================================================ ENTRY
    {
      id: 'entry-shoe',
      def: 'entry-trones-shoe',
      at: [28.5, 12.595],
      rot: 0,
      z: 4 / 12,
      note: 'Wall-hung on the entry nook\'s north wall, 4" off the floor: zero footprint, and clear of the front door\'s 3\'-2" swing.',
    },

    // ============================================================= BLACKOUT
    // NOT an accessory. See the blackout note: without these there is no
    // picture in this room at any hour with daylight in the sky.
    {
      id: 'shade-1',
      def: 'shade-blackout-roller-bay',
      at: [SHADE_X, BAY_MID[0]],
      rot: 90,
      size: { w: BAY_W[0] },
      label: 'Blackout roller, bay 1 — drawn',
    },
    {
      id: 'shade-2',
      def: 'shade-blackout-roller-bay',
      at: [SHADE_X, BAY_MID[1]],
      rot: 90,
      size: { w: BAY_W[1] },
      label: 'Blackout roller, bay 2 — drawn',
    },
    {
      id: 'shade-3',
      def: 'shade-blackout-roller-bay',
      at: [SHADE_X, BAY_MID[2]],
      rot: 90,
      size: { w: BAY_W[2] },
      label: 'Blackout roller, bay 3 — drawn',
    },
    {
      id: 'shade-4',
      def: 'shade-blackout-roller-bay',
      at: [SHADE_X, BAY_MID[3]],
      rot: 90,
      size: { w: BAY_W[3] },
      label: 'Blackout roller, bay 4 — drawn',
    },
    {
      id: 'channel-1',
      def: 'shade-side-channels-bay',
      at: [CHANNEL_X, BAY_MID[0]],
      rot: 90,
      label: 'Side channels, bay 1 (pair, one per jamb)',
      note: 'Drawn once per bay at the bay centre; the real pair sits on the two jambs. This is the piece that turns a 98-99% roller into a room a projector can work in.',
    },
    {
      id: 'channel-2',
      def: 'shade-side-channels-bay',
      at: [CHANNEL_X, BAY_MID[1]],
      rot: 90,
      label: 'Side channels, bay 2 (pair)',
    },
    {
      id: 'channel-3',
      def: 'shade-side-channels-bay',
      at: [CHANNEL_X, BAY_MID[2]],
      rot: 90,
      label: 'Side channels, bay 3 (pair)',
    },
    {
      id: 'channel-4',
      def: 'shade-side-channels-bay',
      at: [CHANNEL_X, BAY_MID[3]],
      rot: 90,
      label: 'Side channels, bay 4 (pair)',
    },
  ],
  notes: [
    'THROW GEOMETRY — the number that decides whether this scheme is real. Hisense PX3-PRO, fixed 0.22:1, throwing a 100" 16:9 image 87.16" (7\'-3 1/8") wide on the west face of the bathroom partition. Required lens-to-fabric distance = 0.22 x 7.263 ft = 1\'-7 3/16" (19.17"). The lens sits 10 5/8" inside the cabinet\'s REAR face, so the cabinet rear lands 8 1/2" off the fabric — which is Hisense\'s own published gap at 100" and the cross-check that says the modelled number is right rather than plausible. Projector centre x = 17\'-6 1/2", standing on the plinth at 14". The analyzer measures the throw at 1\'-7 3/16" against a 1\'-7 3/16" requirement. A STANDARD-THROW PROJECTOR CANNOT WORK ON THIS WALL IN A SCHEME WITH A FRONT ROW: a 1.21-1.59:1 lens wants 8\'-10" to 11\'-7" for a 100" image, which puts the box on top of the ALSEDA cushions.',
    'SEATING DISTANCE — six seats, one shallow rank plus the bed, all inside the band. For a 100" picture the analyzer\'s bounds are 8\'-9 3/16" (45 deg, the widest front row anyone recommends) and 18\'-8 3/16" (22 deg, a television). Measured centre-to-centre to the frame: ALSEDA north 10\'-0 1/8" (40 deg), ALSEDA south 10\'-2" (39 deg), JÄRRESTAD north 10\'-6" (38 deg), JÄRRESTAD south 10\'-10 7/8" (37 deg), the bed 14\'-7 1/4" (28 deg). Nearest seat clears the near bound by 1\'-3", furthest clears the far bound by 7\'-10" — which is the unusual luxury of this scheme: nobody is at either limit. Front rank to pillows is 4\'-7" of difference in viewing distance and no difference at all in floor level, which is precisely why the front rank has to be 6 3/4" tall.',
    'SIGHTLINES — nothing that matters is taller than a seated eye. Seated eye is 46". The bed deck is 17 1/2" made up, the poufs 16 1/2", the cushions 6 3/4", the plinth 14", the bedside table 14 1/8", the rug 0.28". The three objects over the line are the desk chair (41 1/4" overall, a clear 4 3/4" UNDER it — which is exactly why the Branch is specified WITHOUT its headrest), the Dell panel (top 50 9/16") and the floor lamp (5\'-11 1/4"). The panel stands at y 3\'-6 1/2" and the lamp at y 2\'-0 1/4" to 3\'-2 1/4", while every seat-to-screen line in the layout runs at y 5\'-9" or further south — so neither is ever between a viewer and the picture. The tightest case in the plan is not a seat at all, it is the desk: the ray from the north JÄRRESTAD to the image\'s bottom-north corner passes about 1 1/8" above the east end of the Jarvis top at sitting height. Checked, not assumed — and it is one more reason the desk cannot creep east.',
    'BLACKOUT IS A CO-REQUISITE, NOT AN ACCESSORY, and it is physics rather than taste. At 100" on a 0.6-gain screen a 2,700-lumen projector makes 54 fL of peak white; a screen face taking only 500 lux of ambient — conservative for a wall 18 ft from an uncurtained full-height WEST glass wall at midday — sits at 28 fL of BLACK. That is 1.9:1 in-room contrast, a grey rectangle, and even a 5,000-lumen unit only reaches 3.6:1. There is no projector purchasable in 2026 that fixes it. So all four bays carry a blackout roller drawn to the floor, plus a pair of blackout side channels each. The ALR screen does NOT substitute: this wall faces due WEST, straight down the sightline at the glazing, which is the one direction a lenticular screen cannot reject. DAYLIGHT VIEWING IN THIS UNIT IS NOT POSSIBLE WITHOUT THEM — say so to the client before the projector is ordered, not after.',
    'WHY ROLLERS AND NOT CELLULAR, which is a specification consequence rather than a preference. This unit\'s glazing head is 104". SelectBlinds\' per-lift maximum drops on the blackout cellular are 84" cordless, 84" no-drill and 96" motorised — only the CONTINUOUS CORD LOOP reaches 120". A cellular shade tall enough for these bays can therefore only be ordered on a cord loop, i.e. four cords hanging down a floor-to-ceiling glass wall in a scheme whose brief is "quiet, few materials, no visible hardware". The Blinds.com Classic Roller runs 12"-144" on every lift type, so it is cordless at this height and its stack is far less present 4" below an exposed concrete soffit. Shade widths are set per bay from WINDOW_BAYS (2\'-8 3/4", 2\'-8 1/4", 2\'-9 1/4", 3\'-6"), not left at the catalog\'s nominal 36".',
    'DESK ORIENTATION AND PULL-BACK. The Jarvis top runs east-west on the WIDE LEG\'s north wall, x 11\'-10 1/8" to 16\'-10 1/8", back 1/4" off the wall face at y 3\'-2 7/8". The user sits south of it facing north, the monitor faces SOUTH, and the west glazing is on the user\'s LEFT. That is the only correct answer in this unit — a panel facing the glass is unreadable from about 3pm, and a panel facing away from it puts a bright hole behind the user\'s screen all afternoon. It is on the wide leg and not in the notch because the bed lies across the notch: a desk on the notch\'s north wall would put its chair in the bed\'s north aisle and cut the aisle to 9". The layout reserves the full 2\'-6" (CLEARANCE.deskChair) in front of the top and the Branch is drawn PARKED inside it at y 5\'-6 1/4" to 7\'-6 1/4", not tucked under a top that this model treats as a solid box. THE SOURCED REAL-WORLD MINIMUM FOR A TASK CHAIR TO ROLL BACK AND STAND IS NEARER 36", AND THIS LAYOUT ACHIEVES IT: the clear floor south of the top runs 8\'-1" to the kitchen aisle line, and the nearest object in front of the desk is the front row 3\'-6 5/16" to the west, not to the south.',
    'THE BED AND ITS AISLES. Floyd Bed (Original) queen, 67" x 86", 17 1/2" made up, specified WITHOUT the headboard — the headboard add-on takes it to 31 1/2" and fails the 30" glazing rule, and Floyd\'s own page is what that number comes from. It lies x 7 5/16" to 7\'-9 5/16", y 6\'-0 1/8" to 11\'-7 1/8". North side: 3\'-9 7/16" of clear floor to the face of the dresser, with the bedside table taking 1\'-6 1/2" of it at the head. South side: 1\'-11 3/4" to the kitchen aisle line and 5\'-5 3/4" of genuinely empty floor to the counter face. The analyzer measures its 3\'-0" probe cap on both long sides against a 2\'-0" requirement, so a two-sleeper bed is properly served. A GRIMSBU at 61" wide would have bought another 6" of aisle; it is not specified because it is 4 1/8" taller and this whole scheme is built on having the lowest queen there is.',
    'THE TWO REMAINING WARNINGS ARE BOTH THE SAME ONE, AND THEY ARE A MODELLING ARTIFACT — stated plainly rather than buried. blocks-window fires on the bed at glazing bays 2 and 3 (2.5 and 1.6 sq ft of the 1\'-0" strip). The rule this project actually holds itself to is the brief\'s: nothing over 2\'-6" tall within 1\'-0" of the glass. The bed is 1\'-5 1/2" tall with no headboard, i.e. 1\'-0 1/2" UNDER that limit, and from any seat in the room you look straight over it at the full height of the glazing. The check fires anyway because plan.ts models this glazing as floor-to-ceiling with its sill at 0\'-0", so the test degenerates to "anything taller than 5/8" in the band" — a rug would trip it if rugs were not exempt. THE TRADE IS DELIBERATE AND IT IS THE CORE OF THE SCHEME: the head has to be hard to the glass, because every inch it comes east moves the foot east, and the foot is what pinches the only route into the bed\'s north side. Held 1\'-0" back to satisfy the check, the gate closes to 1\'-6" and the analyzer reports a tight path to the bed instead. One 17 1/2" bed deck inside a 1\'-0" band is a better outcome than a 1\'-6" route.',
    'CIRCULATION, WHICH IS WHAT THIS PLAN IS REALLY ABOUT. Every required route measures 3\'-6" usable with all six seats deployed: front door to bathroom, to the kitchen sink, to the west windows, and bathroom to the bed; sink to refrigerator is 4\'-0". Two dimensions carry all of it. First, the 2\'-6 7/16" gate between the JÄRRESTAD poufs\' east edge (x 9\'-3 11/16") and the desk\'s west end (x 11\'-10 1/8"), which is the only way from the screen end of the room to the notch. Second, the 2\'-6 3/8" lane between the wide leg\'s north wall (y 3\'-2 5/8") and the north edge of the front row (y 5\'-9"), which is why the whole rank sits 9" south of the screen axis instead of centred on it. Both are at CLEARANCE.walkwayTight, not at the 3\'-0" comfortable figure, and both are genuinely tight with four floor seats out.',
    'TRADE-OFF — THERE IS NO SOFA, AND THAT IS THE WHOLE BET. Six seats for $1,390 of seating (bed frame $1,070, two poufs $260, two cushions $60) against $1,960 for one Cleon 56 armless that seats two and a half. Nothing upholstered fits once a queen lies across the middle of the floor, so if the client wants to sit on a sofa at 11am on a Tuesday and not on the bed or on the floor, this is the wrong layout — take A, which spends the $1,960 on a Cleon and puts the bed on the notch wall, or D, which does the same thing for a sixth of the AV money. The honest counter-argument is that a 17 1/2" queen with no headboard reads as a daybed rather than as an unmade bedroom, so lounging on it is not a compromise. But only if it is made.',
    'TRADE-OFF — THE BED IS PUBLIC. It is the first object you see from the front door, it is the centre of the plan, and it is the back row of the cinema. There is no partition, no Murphy cabinet and nowhere to hide it, so a made bed becomes part of the room\'s daily presentation and six people watching a film are sitting in the bedroom. Take layout B if the bed needs to disappear — a queen Murphy on the wide leg is the only answer in this set that hides it. NO SCHEME IN THIS SET BUILDS A PARTITION, and that is a considered position rather than an omission: under a 9\'-0\" exposed structural soffit, in a rental, a stud wall across 448 sq ft costs more floor and more daylight than it buys privacy.',
    'TRADE-OFF — NO DINING TABLE, ONE BEDSIDE, AND A LOPSIDED FRONT ROW. A queen across the middle, a 5\'-0" desk and a 100" cinema consume the floor: you eat at the desk, on the plinth, or on the poufs. The bed gets one bedside surface (the larger STOCKHOLM nesting table, 14 1/8" tall) on its north side only, because the south side is the walking route between the front door and the west glass; there is no second nightstand because a floating one needs a wall and the head of this bed faces glass. And the front row\'s mid-point sits 9" south of the screen axis rather than on it, which you can see in the plan — that is the price of the 2\'-6" lane along the north wall, and it is paid in composition rather than in function.',
    'STORAGE. The unit\'s own 8\'-0" reach-in closet run on the south wall of the east leg does the hanging; the MALM 63" 6-drawer on the notch\'s north wall does the folding. That is all the closed storage in the scheme and it is less than a wardrobe would give. A 59" PAX at 79" tall was considered and rejected for one reason: it is the only object that would stand well above the 46" seated-eye line in a room whose entire logic is sightlines.',
    'BUILT-INS HELD CLEAR. Nothing stands south of the kitchen aisle line (y 13\'-6 7/8") for x < 17\'-11 3/8" — the southernmost object in the scheme is the south pouf at y 13\'-3 7/16", 3 3/8" clear of it. The 3\'-0" fridge and laundry zones, the 2\'-6" strip in front of the reach-in closets, the bathroom door\'s 2\'-8" swing and the front door\'s 3\'-2" swing are all empty floor. The plinth\'s own 2\'-0" service zone (you have to kneel in front of it to reach the push-open bays and the projector\'s ports) is clear as well.',
    'BUDGET CAVEAT. The catalogue total is furniture and AV only, and four of its largest lines are not quotations. bed-queen-floyd-walnut is a FRAME at $1,070 — add roughly $700-1,000 for the 10" mattress the drawings assume, and note Floyd was running a "Summer Final Sale" when this was priced ($856 member). plinth-ust-bespoke-66 at $650 is a JOINERY ALLOWANCE for a veneered slab carcass with two push-open bays, not a cabinetmaker\'s number — and it is the one piece in the scheme that has to be built flat, square and parallel to the wall within a couple of millimetres, because a UST turns yaw straight into visible trapezoid and digital keystone on a UST is a resolution crop, not a fix. The shade prices ($210 a bay) and the side channels ($120 a bay) are ESTIMATES: the channel vendor publishes neither lengths nor prices, and the widely-quoted "97-99% of side light blocked" is marketing, not a tested spec. rug-nordicknots-desert-8x10 shows only "From $395", so treat that as a floor. Nothing here covers the mattress, bedding, a laptop, paint, or the electrician who has to get a socket to the plinth — there is no power in that partition today.',
    'DIMENSIONAL HEALTH WARNING. The plan is traced from a listing graphic at 28.587 px/ft, accuracy about +/-0.3 ft, and the 9\'-0" ceiling is ASSUMED, not measured. Several of this layout\'s clearances are inside that tolerance: the 88.4" frame leaves only 7 1/8" of wall below it, the two circulation dimensions are both 2\'-6 3/8" or 2\'-6 7/16", and the front row clears the near viewing bound by 1\'-3". Before anyone orders a frame, builds a 66" plinth or commits to a 100" image, someone puts a laser on the bathroom partition, on the west reveal and on the soffit.',
  ],
};

export default layout;
