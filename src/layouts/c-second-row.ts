/**
 * LAYOUT C — "Second row"
 *
 * STRATEGY: SIX SEATS, AND THE BED IS ONE OF THEM.
 *
 * The one idea this scheme bets everything on: in a studio the bed is the best
 * seat in the house, and a LOW queen platform is under the 46" seated-eye line,
 * so it can sit in the MIDDLE of the floor without blocking anybody's view. So
 * the Floyd queen (67" x 86", 17 1/2" made up — the lowest real queen there is)
 * lies head-to-the-west-glazing across the middle of the room, aimed due EAST at
 * a 100" ALR screen on the bathroom partition. Two JÄRRESTAD poufs and two
 * ALSEDA floor cushions land on the rug between the foot of the bed and the
 * plinth. That is 2 + 4 = six people watching one 100" picture, and the room
 * never buys a sofa. Nobody sits behind anybody: the bed's deck is 17 1/2" and
 * the tallest thing in the audience is a 16 1/2" pouf.
 *
 * The seating ladder that falls out of it is unusually good for 213 sq ft:
 *   ALSEDA floor cushions   9'-0 3/4" from the picture  — 44 deg, front row
 *   JÄRRESTAD poufs         9'-9 1/8"                   — 41 deg, immersive
 *   the bed, from the pillows 13'-7 3/8"                — 30 deg, SMPTE reference
 * All three are inside the analyzer's 8'-9 1/4" .. 18'-8 3/16" band for a 100"
 * image, and the sightline from the pillows runs down the 7 5/8" gap BETWEEN the
 * two floor cushions to the middle of the screen.
 *
 * DESK ORIENTATION — the shared rule, and this layout obeys it. The glazing
 * faces WEST and takes direct sun from about 3pm to sunset, so a screen may face
 * NORTH or SOUTH but never into or away from that sun. The Jarvis top therefore
 * runs east-west against the north wall of the WIDE LEG (the notch's north wall
 * is behind the bed's aisle and cannot take a chair), the user sits south of it
 * facing north, the monitor faces SOUTH, and the glass is on the user's LEFT.
 * Daylight rakes across the work surface and never down the barrel of the panel.
 *
 * WHAT THIS SCHEME CANNOT DO, stated at the top rather than buried: there is no
 * sofa and there never will be — nothing else fits once a queen lies across the
 * middle of the room. There is no dining table. And the bed is PUBLIC: it is the
 * first thing you see from the front door and the back row of the cinema, so a
 * made bed is part of the room's presentation every single day.
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
// One east-west line carries the whole scheme: the screen's centre, the
// projector's lens, the plinth, the rug and the bed all sit on it, and the front
// row straddles it. Chosen at y = 8'-5 3/8" for a reason that is not aesthetic —
// it is the northernmost line that keeps the bed's 5'-7" body clear of the
// 1'-0" band in front of glazing bay 1 (which ends at y = 5'-6 3/8") while
// leaving 2'-3 7/8" between the foot of the bed's south side and the kitchen
// aisle line. Move it 6" either way and something loses.
// ---------------------------------------------------------------------------
const AXIS_Y = 8.45;

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
const SCREEN_N = AXIS_Y - SCREEN_W / 2; // 4.7667 — 1'-6 1/2" of wall left above
const SCREEN_S = AXIS_Y + SCREEN_W / 2; // 12.1333 — 11 5/16" left below (BATH_S_FACE 13.075)
// Image bottom 28 1/2" AFF = plinth top 14" + 14 1/2"; the frame's own bezel is
// 0.59", so the FRAME bottom lands at 27.9" and the catalog's 28" defaultZ is
// right. Stated explicitly because the whole scheme hangs off it.
const SCREEN_Z = 28 / 12; // 2.3333
const IMAGE_Z = 28.5 / 12; // 2.375 — the picture itself, 1/2" up inside the frame

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
// The head sits 1'-0 1/8" off the inner face of the glass rather than flush to
// it, and that is a deliberate correction: the blackout roller in each bay has
// to drop to the FLOOR inside the reveal, and a mattress pushed into the reveal
// fouls the bottom rail. In a scheme whose entire premise is a dark room that is
// a functional failure, not a decorating preference. It also keeps the whole bed
// out of the analyzer's 1'-0" window band.
const BED_W = 67 / 12; // 5.5833 across
const BED_L = 86 / 12; // 7.1667 head to foot
const BED_HEAD_X = GLASS_BAND_E + 0.01; // 1.60 — just clear of the glazing band
const BED_CX = BED_HEAD_X + BED_L / 2; // 5.1833
const BED_FOOT_X = BED_HEAD_X + BED_L; // 8.7667
const BED_N = AXIS_Y - BED_W / 2; // 5.6583
const BED_S = AXIS_Y + BED_W / 2; // 11.2417 — 2'-3 7/8" to KITCHEN_AISLE_N 13.57

// ---- the front row --------------------------------------------------------
// SEATING RULE, and it is the opposite of how overflow seating is normally
// planned: an ALSEDA at 6 3/4" puts an eye at about 30" AFF, i.e. AT OR BELOW
// the bottom of the image, so floor seating goes in FRONT. A JÄRRESTAD at
// 16 1/2" puts an eye near 40", above the image bottom, so a pouf may sit
// behind one. Here "behind" is lateral rather than deep, because the band of
// floor between the bed's foot (x 8'-9 1/4") and the analyzer's 8'-9 1/4"
// minimum viewing distance (x 9'-11 5/8") is only 1'-2 1/2" deep — there is
// physically no room for two ranks. So the four pieces fan across the axis with
// the cushions inboard and closest to the screen and the poufs outboard.
const CUSHION_X = 9.83; // centres 9'-0 3/4" from the frame, 43.7 deg
const CUSHION_DY = 1.3; // 7 5/8" of gap on the axis — the bed's sightline runs through it
const POUF_X = BED_FOOT_X + 0.755 + 0.01; // 9.5317 — as far west as the bed's foot allows
const POUF_DY = 3.25; // 2 5/8" of gap to the cushion beside it

// Nordic Knots Desert 8x10 at 0.28" total build — the thinnest rug here, so it
// runs under the foot of the bed AND under the front lip of the plinth without
// shimming anything. rot 90: 8'-0" north-south, 10'-0" east-west.
const RUG_CX = PLINTH_W_FACE - 10.0 / 2; // 11.845 -> x 6.845 .. 16.845

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
// Centred in the clear run of north wall between the re-entrant corner and the
// face of the media wall: (9.93 + 16.845) / 2. Leaves exactly 11 1/2" each side.
// East end 9" short of the screen's fabric plane, so the 5'-0" top and the
// 5'-6" plinth read as ONE L-shaped millwork run wrapping the north-east corner
// with a 2 1/2" shadow gap between them. Pushed this far east for a circulation
// reason, not a visual one: it opens a 2'-8 3/8" gate between the front row and
// the desk's west end, which is the only way into the bed's north aisle.
const DESK_CX = FABRIC_X - 0.75 - DESK_W / 2; // 15.49 -> top x 12.99 .. 17.99
const DESK_W_END = DESK_CX - DESK_W / 2; // 12.99
// The work position sits at the WEST end of the top: it keeps the chair out of
// the plinth's 2'-0" service zone and out of the gate. The east 3'-0" of top is
// landing space.
const WORK_X = DESK_CX - 1.29; // 14.20

// Branch Ergonomic Pro, 25" x 24", PARKED in the pull-back zone rather than
// tucked under the top (the desks in this model are solid boxes with no legroom
// void, so a tucked chair reads as a collision).
const CHAIR_D = 24 / 12; // 2.0
const CHAIR_Y = DESK_FRONT + 0.03 + CHAIR_D / 2; // 6.52 -> chair y 5.52 .. 7.52

// ---- the notch, behind the bed --------------------------------------------
const DRESSER_D = 18.875 / 12; // 1.5729
const DRESSER_Y = N_FACE + 0.02 + DRESSER_D / 2; // 1.4365 -> y 0.65 .. 2.2229
const BEDSIDE_D = 18.5 / 12; // 1.5417 (STOCKHOLM nesting pair, larger table)
const BEDSIDE_Y = BED_N - 0.1675 - BEDSIDE_D / 2; // 5.49 -> y 4.7192 .. 5.4908

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
    'The most seats: a 17 1/2"-tall Floyd queen lies across the middle of the floor aimed east at a 100" UST picture, so the bed IS the back row — six people watch one screen at 30, 41 and 44 degrees and the room never buys a sofa.',
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
      note: 'Frame back flush to the bathroom partition, fabric at x 18\'-8 7/8". 88.4" of frame on 9\'-10" of wall leaves 1\'-0 3/4" of blank plaster each side, which reads as deliberate; the 120" version would leave 4", inside the traced plan\'s own tolerance. 170 deg of viewing cone matters more here than gain, because the outermost pouf sits 19 deg off axis.',
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
      note: 'Head west, so you lie facing EAST at the picture from 13\'-7 3/8" — a 30 deg image, which is SMPTE reference and reads like a very good television from the pillows. At 17 1/2" the whole bed is 28 1/2" under the seated-eye line, which is the only reason a queen can stand in the middle of this room at all.',
    },
    {
      id: 'cushion-n',
      def: 'floor-cushion-alseda-24',
      at: [CUSHION_X, AXIS_Y - CUSHION_DY],
      rot: 270,
      label: 'ALSEDA — front row, north',
      note: 'FRONT row, and it has to be: a 6 3/4" seat puts an eye at about 30" AFF, at or below the bottom of the image, so it can never sit behind anything.',
    },
    {
      id: 'cushion-s',
      def: 'floor-cushion-alseda-24',
      at: [CUSHION_X, AXIS_Y + CUSHION_DY],
      rot: 270,
      label: 'ALSEDA — front row, south',
      note: 'The 7 5/8" gap between the two cushions is where the sightline from the pillows passes. It is drawn, not accidental.',
    },
    {
      id: 'pouf-n',
      def: 'pouf-jarrestad-18',
      at: [POUF_X, AXIS_Y - POUF_DY],
      rot: 270,
      label: 'JÄRRESTAD pouf — north',
      note: 'Hollow, so it stores the throws and the spare cushions inside itself. 19 deg off the screen axis, which the ALR\'s 170 deg cone carries.',
    },
    {
      id: 'pouf-s',
      def: 'pouf-jarrestad-18',
      at: [POUF_X, AXIS_Y + POUF_DY],
      rot: 270,
      label: 'JÄRRESTAD pouf — south',
    },
    {
      id: 'rug',
      def: 'rug-nordicknots-desert-8x10',
      at: [RUG_CX, AXIS_Y],
      rot: 90,
      label: 'Nordic Knots Desert 8x10 — the viewing zone',
      note: 'Runs from 1\'-11" under the foot of the bed to the face of the plinth, and 8\'-0" north-south so both poufs land on it. At 0.28" total build it is the only rug here that can pass under a 24"-deep plinth without shimming it.',
    },

    // ================================================================= WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-laminate-60x27-walnut',
      at: [DESK_CX, DESK_Y],
      rot: 0,
      label: 'Jarvis laminate 60 x 27, walnut — 3-Stage, 25 3/4"-51 1/4"',
      note: 'Back to the wide leg\'s north wall, monitor facing SOUTH, glazing on the user\'s left. Centred in the 6\'-11" of clear wall between the re-entrant corner and the media wall, so it has 11 1/2" of shadow gap each side and reads as a piece of furniture rather than as a run.',
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
      note: 'ONE screen, one Thunderbolt cable to the laptop. Its top sits 4 9/16" ABOVE the 46" seated-eye line, so its position is a sightline question: it is parked at y 3\'-6 5/8", and every seat-to-screen line in this layout runs at y 5\'-2 3/8" or further south, so nothing looks through it.',
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
      note: 'Parked inside the 2\'-6" pull-back, not tucked. Skip the headrest: at 41 1/4" the chair passes 4 3/4" UNDER the seated-eye line, so the north half of the front row looks at the picture straight across it. A headrest would put it over the line and cost two seats their view.',
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
      at: [BED_CX, DRESSER_Y],
      rot: 0,
      label: 'MALM 6-drawer, 63" — the only closed storage in the room',
      note: 'On the notch\'s north wall, centred on the bed so the two read as one object from the front door. Its 2\'-6" drawer-pull zone lands in the bed\'s north aisle, which is dead floor otherwise, and its top at 30 3/4" is 4\'-9" from the glass so it is nowhere near the glazing rule.',
    },
    {
      id: 'bedside',
      def: 'side-stockholm-nesting-walnut',
      at: [2.85, BEDSIDE_Y],
      rot: 0,
      label: 'STOCKHOLM nesting pair — bedside, and a drinks table on film night',
      note: 'A NESTING PAIR, which is the point: the big one lives at the head of the bed at 14 1/8" tall (glazing-safe, sightline-safe), the small one pulls out into the front row when six people need somewhere to put a glass. Its west edge is at x 1\'-8", clear of the 1\'-0" glazing band.',
    },
    {
      id: 'lamp',
      def: 'lamp-floor-hektar',
      at: [8.9, 2.6],
      rot: 0,
      note: 'In the dead pocket at the re-entrant corner, which nothing else can use. Deliberately WEST of every seat, so its 5\'-11 1/4" of height is never between a seat and the screen.',
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
    'THROW GEOMETRY — the number that decides whether this scheme is real. Hisense PX3-PRO, fixed 0.22:1, throwing a 100" 16:9 image 87.16" (7\'-3 1/8") wide on the bathroom partition. Required lens-to-fabric distance = 0.22 x 7.263 ft = 1\'-7 3/16" (19.17"). The lens sits 10 5/8" inside the cabinet\'s REAR face, so the cabinet rear lands 8 1/2" off the fabric — which is Hisense\'s own published gap at 100" and the check that says the modelled number is right rather than plausible. Projector centre x = 17\'-6 1/2", on the plinth at 14". Analyzer-measured throw: 1\'-7 3/16" against a 1\'-7 3/16" requirement. A STANDARD-THROW PROJECTOR CANNOT WORK ON THIS WALL FROM THIS FLOOR PLAN in a scheme with a front row: a 1.21-1.59:1 lens wants 8\'-10" to 11\'-7" for a 100" image, which puts the box on top of the ALSEDA cushions.',
    'SEATING DISTANCE — six seats, three ranks, all inside the band. For a 100" picture the analyzer\'s bounds are 8\'-9 1/4" (45 deg, the widest front row anyone recommends) and 18\'-8 3/16" (22 deg, a television). Measured to the frame centre: ALSEDA floor cushions 9\'-0 3/4" (43.7 deg), JÄRRESTAD poufs 9\'-9 1/8" (40.8 deg), the bed 13\'-7 3/8" (29.9 deg — SMPTE reference is 30 deg). The nearest seat clears the near bound by 3 1/2" and the furthest clears the far bound by 5\'-0 3/4". Front row to back row is 4\'-6 5/8" of rake in plan, which on a flat floor is why the front row has to be 6 3/4" tall.',
    'SIGHTLINES — nothing in this room is taller than a seated eye where it matters. Seated eye is 46". The bed deck is 17 1/2" made up, the poufs 16 1/2", the cushions 6 3/4", the plinth 14", the rug 0.28". The two tall objects are the desk chair (41 1/4" overall, 4 3/4" under the line — which is exactly why the Branch is specified WITHOUT its headrest) and the Dell panel, whose top is at 50 9/16": it stands at y 3\'-6 5/8" and the southernmost seat-to-screen line runs at y 5\'-2 3/8", so no sightline touches it. The floor lamp at 5\'-11 1/4" is parked WEST of every seat, where it cannot be between anyone and the picture.',
    'BLACKOUT IS A CO-REQUISITE, NOT AN ACCESSORY, and this is physics rather than taste. At 100" on a 0.6-gain screen a 2,700-lumen projector makes 54 fL of peak white; a screen face taking only 500 lux of ambient — conservative for a wall 18 ft from an uncurtained full-height WEST glass wall at midday — sits at 28 fL of BLACK. That is 1.9:1 in-room contrast, a grey rectangle, and a 5,000-lumen unit only reaches 3.6:1. There is no projector purchasable in 2026 that fixes it. So all four bays carry a blackout roller drawn to the floor, plus a pair of blackout side channels each. The ALR screen does NOT substitute: this wall faces due WEST, straight down the sightline at the glazing, which is the one direction a lenticular screen cannot reject.',
    'WHY ROLLERS AND NOT CELLULAR, which is a real specification consequence and not a preference. This unit\'s glazing head is 104". SelectBlinds\' per-lift maximum drops on the blackout cellular are 84" cordless, 84" no-drill and 96" motorised — only the CONTINUOUS CORD LOOP reaches 120". A cellular shade tall enough for these bays can therefore only be ordered on a cord loop, i.e. four cords hanging down a floor-to-ceiling glass wall in a scheme whose brief is "quiet, few materials, no visible hardware". The Blinds.com Classic Roller runs 12"-144" on every lift type, so it is cordless at this height and its stack is far less present 4" under an exposed concrete soffit. Both shade prices in the catalog are ESTIMATES for a configured 36" x 106" blind; get a quote before believing the budget line.',
    'DESK ORIENTATION AND PULL-BACK. The Jarvis top runs east-west on the WIDE LEG\'s north wall, x 10\'-10 5/8" to 15\'-10 5/8", back 1/4" off the wall face at y 3\'-2 7/8". The user sits south of it facing north; the monitor faces SOUTH; the west glazing is on the user\'s LEFT. That is the only correct answer in this unit — a panel facing the glass is unreadable from about 3pm, and a panel facing away from it puts a bright hole behind the user\'s screen all afternoon. It is on the wide leg and not in the notch because the bed owns the notch\'s frontage and a chair pull-back there would sit in the bed\'s aisle. The layout reserves the full 2\'-6" (CLEARANCE.deskChair) in front of the top and the Branch is drawn PARKED inside it at y 5\'-6 1/4" to 7\'-6 1/4", not tucked under a top that is modelled as a solid box. THE SOURCED REAL-WORLD MINIMUM FOR A TASK CHAIR TO ROLL BACK AND STAND IS NEARER 36", AND THIS LAYOUT ACHIEVES IT: the clear floor south of the top runs 8\'-0" to the kitchen aisle line at y 13\'-6 7/8". The only qualification is on film night, when the north ALSEDA sits 5 1/2" into the west end of that zone — you move a cushion, not the desk.',
    'THE BED AND ITS AISLES. Floyd queen, 67" x 86", 17 1/2" made up, specified WITHOUT the headboard (the headboard takes it to 31 1/2" and fails the 30" glazing rule). It lies x 1\'-7 1/4" to 8\'-9 1/4", y 5\'-7 7/8" to 11\'-2 7/8". North side: 3\'-5 1/4" of walkable aisle to the face of the dresser. South side: 2\'-3 7/8" to the kitchen aisle line and 5\'-10" of actually empty floor before the counter, so the analyzer measures its 3\'-0" probe cap on both long sides against a 2\'-0" requirement. A 61"-wide GRIMSBU would have given another 6" of aisle; it is not specified because it is 3 3/4" taller and, more to the point, the whole scheme depends on the LOWEST queen there is.',
    'GLAZING RULE. Nothing over 2\'-6" tall stands within 1\'-0" of the glass, and in this layout nothing at all stands there: the head of the bed is at x 1\'-7 1/4", 1/8" clear of the 1\'-0" band, and the bedside table\'s west edge is at 1\'-8". That is a DEPARTURE from the obvious move of pushing the head flush to the glazing, and the reason is functional rather than visual — the blackout roller in bays 2 and 3 has to reach the floor inside the reveal, and a mattress in the reveal fouls the bottom rail. In a scheme that lives or dies on being able to make the room dark, that outranks the romance of waking up in the window. The only tall object anywhere near the glass is the dresser (30 3/4"), 4\'-9" back from it.',
    'TRADE-OFF — THERE IS NO SOFA, AND THAT IS THE WHOLE BET. Six seats for $1,390 of seating (bed frame $1,070, two poufs $260, two cushions $60) against $1,960 for a single Cleon 56 that seats two and a half. Nothing upholstered fits once a queen lies across the middle of the floor, so if the client wants to sit on a sofa at 11am on a Tuesday and not on the bed or on the floor, this is the wrong layout. The honest counter-argument is that the bed is 17 1/2" high with no headboard, so lounging on it reads as a daybed rather than as an unmade bedroom — but only if it is made.',
    'TRADE-OFF — THE BED IS PUBLIC. It is the first object you see from the front door, the centre of the plan and the back row of the cinema. There is no partition, no Murphy cabinet and nowhere to hide it. A made bed becomes part of the room\'s daily presentation, and six people watching a film are sitting in the bedroom. Take layout B if the bed needs to disappear, or D if it needs a wall.',
    'TRADE-OFF — NO DINING TABLE, AND ONE BEDSIDE. A queen across the middle, a 5\'-0" desk and a 100" cinema consume the floor: you eat at the desk, on the plinth or on the poufs. The bed gets one bedside surface (the larger STOCKHOLM nesting table, 14 1/8" tall) on its north side only; the south side is left open because that is the walking route between the front door and the west glass. There is no second nightstand because a floating one needs a wall and the head of this bed faces glass.',
    'STORAGE. The unit\'s own 8\'-0" reach-in closet run on the south wall of the east leg does the hanging, and the MALM 63" 6-drawer on the notch\'s north wall does the folding. That is all the closed storage in the scheme, and it is less than a PAX would give — a 59" PAX at 79" tall was considered and rejected because it is the one object that would stand above the seated-eye line in the middle of a room designed around sightlines.',
    'BUILT-INS HELD CLEAR. Nothing stands south of the kitchen aisle line (y 13\'-6 7/8") for x < 17\'-11 3/8": the southernmost object in the scheme is the south pouf at y 12\'-5 1/2". The 3\'-0" fridge and laundry zones, the 2\'-6" strip in front of the reach-in closets, the bathroom door\'s 2\'-8" swing and the front door\'s 3\'-2" swing are all empty floor.',
    'BUDGET CAVEAT. The catalogue total is furniture and AV only, and three of its biggest lines are not quotations. bed-queen-floyd-walnut is a FRAME at $1,070 — add roughly $700-1,000 for the 10" mattress the drawings assume, and note Floyd was running a "Summer Final Sale" when this was priced ($856 member). plinth-ust-bespoke-66 at $650 is a JOINERY ALLOWANCE for a veneered slab carcass, not a cabinetmaker\'s number, and it is the one piece in the scheme that has to be built to a couple of millimetres. Both shade prices ($210 a bay) and the side channels ($120 a bay) are ESTIMATES — the channel vendor publishes neither lengths nor prices, and its "97-99% of side light blocked" is marketing rather than a tested spec. rug-nordicknots-desert-8x10 is listed only as "From $395", so treat that as a floor. Nothing here covers bedding, the mattress, a laptop, the paint, or the electrician who has to get a socket to the plinth.',
    'DIMENSIONAL HEALTH WARNING. The plan is traced from a listing graphic at 28.587 px/ft, accuracy about +/-0.3 ft, and the 9\'-0" ceiling is ASSUMED. Several of this layout\'s clearances are inside that tolerance: the head of the bed clears the glazing band by 1/8", the front row clears the near viewing bound by 3 1/2", and the screen leaves 11 5/16" of wall below the frame. Before anyone orders an 88.4" frame or builds a 66" plinth, someone puts a laser on the bathroom partition and on the west reveal.',
  ],
};

export default layout;
