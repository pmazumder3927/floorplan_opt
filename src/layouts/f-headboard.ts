/**
 * LAYOUT F — "Headboard"
 *
 * THE QUESTION THIS SCHEME ANSWERS. Every other layout in this repo points the
 * bed at something — the glazing (A, C), a Murphy cabinet (B, E) — and none of
 * them gives it a headboard, because the head of the bed is always facing glass
 * and a headboard tall enough to lean on breaks the 2'-6" glazing rule. The
 * client asked the obvious question: why not just turn the bed 90 degrees so
 * its head is against a wall? This file is that layout, drawn properly rather
 * than argued about, and then measured.
 *
 * WHAT TURNING THE BED BUYS, and it is not nothing:
 *   1. A REAL HEADBOARD. The Awara's own bamboo headboard, $269, 39" tall — it
 *      may exist here because the wall behind it is solid plaster, not glass.
 *   2. BOTH LONG SIDES USABLE. 2'-0 1/8" of clear floor each side, so the
 *      bed-access warning that layout A accepts on purpose is GONE. Nobody
 *      climbs over anybody.
 *   3. TWO NIGHTSTANDS, one each side, both standing on the floor. Nothing in
 *      this scheme is screwed to a wall either.
 *   4. The bed is out of the promenade: you no longer walk down its foot to get
 *      to the west windows, you walk down its side.
 *
 * WHAT IT COSTS, MEASURED, AND THE COSTS ARE REAL:
 *   1. THE SOFA IS GONE. A turned queen spends 7'-1 7/8" of the 12'-11 1/4"
 *      between the notch wall and the kitchen aisle, against 5'-3 7/8" side-on.
 *      After the 3'-1" east-west route the bed's own geometry demands, the
 *      seating is left 2'-1" of depth — and a Cleon is 4'-8" wide. So the
 *      congregation stops being a sofa and becomes A ROW: two armchairs and a
 *      pouf strung along the room's length, 39.6 / 29.6 / 25.8 deg on the
 *      picture. Three seats where A has four.
 *   2. THE BED STOPS BEING A SEAT. A's queen faces east down the room and sees
 *      81.9% of the picture from the pillows. This one faces SOUTH and sees
 *      none of it: nobody watches anything in this bed.
 *   3. NO CITY FROM THE PILLOW, and the front seat sits 22 deg off the screen
 *      axis where A's sofa is 13.7 — a row along the room's length is a row of
 *      seats looking diagonally at the wall.
 *   4. THE DINING CHAIRS GO INTO STORAGE. A parks two FRÖSVI standing; here
 *      they are folded flat against the wide leg's north wall, because the row
 *      and its legroom take the floor they used to stand on.
 *   5. $1,109 of bedroom: the headboard ($269), a second nightstand ($150) and
 *      a second cordless lamp ($370). The scheme total is $628 CHEAPER than A only
 *      because a $1,960 Cleon became $698 of armchairs and a $130 pouf.
 *
 * WHAT IS UNCHANGED FROM A, deliberately, so the comparison is about the bed and
 * nothing else: the same 100" UST ALR frame on the same bathroom partition, the
 * same PX3-PRO on the same 14" plinth, the same blackout on all four bays, the
 * same desk on the wide leg's north wall, the same folded gateleg dining and
 * the same entry.
 *
 * AND WHAT IT WINS, WHICH IS NOT ONLY THE HEADBOARD. Measured against A: no
 * warnings at all (A carries one), a 2'-9" narrowest route where A has 2'-6",
 * and a worst seat that sees 89.2% of the picture where A's worst sees 81.9%
 * (pnpm sightline also scores the two STORED folding chairs, which nobody is
 * sitting on; they read 88.3% and 87.0% and drag the printed worst-seat line
 * down to 87.0%).
 * The reason is the same in all three cases — the bed is out of the middle of
 * the floor, so the routes, the seats and the aisles stop fighting each other.
 */

import type { Layout } from '@/core/types';
import { formatFtIn } from '@/core/units';
import {
  BATH_S_FACE,
  BATH_W_FACE,
  GLASS_BAND_E,
  KITCHEN_AISLE_N,
  N_FACE,
  N_FACE_WIDE,
  S_FACE_EAST,
  STEP_X,
  W_FACE,
  WINDOW_BAYS,
} from './faces';

// ---------------------------------------------------------------- the picture
// Identical to layout A — same frame, same wall, same throw. See a-night-wall.ts
// for the arithmetic; it is not repeated here because nothing about it changed.
const IMAGE_W = 7.26312; // 87.157"
const IMAGE_H = 4.08583; // 49.032"
const SCREEN_D = 0.125;
const SCREEN_X = BATH_W_FACE - SCREEN_D / 2; // 18.8025
const FABRIC_X = BATH_W_FACE - SCREEN_D; // 18.74
const SCREEN_Y = (N_FACE_WIDE + BATH_S_FACE) / 2; // 8.1475
const IMAGE_BOTTOM = 28.5 / 12; // 2.375
const SCREEN_Z = IMAGE_BOTTOM - (4.18333 - IMAGE_H) / 2; // 2.32625

const PROJ_D = 0.975;
const LENS_OFFSET = 0.8875;
const THROW_D = 0.22 * IMAGE_W; // 1.59789
const REAR_GAP = THROW_D - LENS_OFFSET; // 0.71039
const PROJ_REAR_X = FABRIC_X - REAR_GAP; // 18.02961
const PROJ_X = PROJ_REAR_X - PROJ_D / 2; // 17.54211

const PLINTH_D = 2.0;
const PLINTH_H = 14 / 12;
const PLINTH_X = BATH_W_FACE - PLINTH_D / 2; // 17.865

// ----------------------------------------------------------------- the sleeper
//
// THE WHOLE SCHEME IS THIS BLOCK. The bed is turned 90 degrees out of layout A's
// orientation: head against the notch's north wall, foot pointing south down the
// room, with the Awara's own 39" bamboo headboard — which is legal here and
// nowhere else in this repo, because the surface behind it is plaster.
//
// THE NOTCH IS 9'-4 1/8" WIDE (west glass face x 0'-7 1/8" to the step at
// 9'-11 1/8") and the bed is 5'-3 7/8", which leaves 4'-0 1/8" to split. Split it
// exactly in half and each side gets 2'-0 1/8" — one eighth of an inch over the
// 2'-0" the analyzer wants beside a bed that sleeps two. There is no slack in
// this number at all: a 2 1/2"-wider frame (a Thuma, a Floyd) fails it.
const BED_W = 5.325; // 63.9" across, now running EAST-WEST
const BED_D = 7.158333; // 85.9" head-to-foot: 83.9" of frame + an inferred 2" of headboard
const BED_SIDE = (STEP_X - W_FACE - BED_W) / 2; // 2.0075 each side
const BED_W_EDGE = W_FACE + BED_SIDE; // 2.5975
const BED_E_EDGE = BED_W_EDGE + BED_W; // 7.9225
const BED_HEAD_Y = N_FACE + 0.02; // 0.65
const BED_FOOT_Y = BED_HEAD_Y + BED_D; // 7.80833
const BED_CX = BED_W_EDGE + BED_W / 2; // 5.26
const BED_CY = BED_HEAD_Y + BED_D / 2; // 4.22917
const MATTRESS_TOP = 22 / 12; // 12" frame + a 10" mattress

// The pair of nightstands, one in each 2'-0 1/8" aisle, level with the pillows.
// The west one overhangs the analyzer's 1'-0" window band by 3 5/8" and is
// allowed to: at 1'-11 1/4" it is 6 3/4" under the 2'-6" the glazing rule cares
// about, and a 15 3/4" box below sill height does not stand in a view.
const NIGHT_SQ = 1.3125; // 15 3/4"
const NIGHT_Y = BED_HEAD_Y + 0.04 + NIGHT_SQ / 2; // 1.34625
const NIGHT_W_X = BED_W_EDGE - NIGHT_SQ / 2; // 1.94125 -> x 1.28 .. 2.5975
const NIGHT_E_X = BED_E_EDGE + NIGHT_SQ / 2; // 8.57875 -> x 7.9225 .. 9.235
const NIGHT_TOP = 23.25 / 12; // TONSTAD top, where the lamps stand

// -------------------------------------------------------------------- the desk
// Unchanged from layout A, which as of 31 Jul 2026 means a Secretlab MAGNUS Pro
// 59.1 x 27.6 in matte dark metal on the wide leg's north wall, user facing
// north, panel facing south, glazing on the user's left. It replaced a bamboo
// Jarvis 60 x 30 there and it replaces one here for the same two reasons: no
// raking west sun bounced off the work surface, and no large pale plane bouncing
// projector light back at the screen.
const DESK_W = 59.1 / 12; // 4.925
const DESK_D = 27.6 / 12; // 2.3
const DESK_EAST = 16.0;
const DESK_X = DESK_EAST - DESK_W / 2; // 13.5375 -> top x 11.075 .. 16.00
const DESK_Y = N_FACE_WIDE + 0.02 + DESK_D / 2; // 4.39
const DESK_BACK = DESK_Y - DESK_D / 2; // 3.24
const DESK_FRONT = DESK_Y + DESK_D / 2; // 5.54
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 6.695 -> y 5.57 .. 7.82

// ------------------------------------------------------------------ the lounge
//
// THERE IS NO SOFA IN THIS SCHEME, AND THAT IS WHAT THE HEADBOARD COSTS.
//
// The arithmetic, in one place. Only the notch column is a legal viewing floor:
// the analyzer's closest seat is 8'-9 1/4" from the picture, i.e. x <= 9'-11 3/8",
// and that column is 12'-11 1/4" deep from the notch wall to the kitchen aisle.
// A turned queen spends 7'-1 7/8" of that depth. What is left is 5'-9 1/4", and
// out of that the plan still has to find an east-west route, because the bed
// splits the notch into two north-south aisles that meet ONLY south of its foot.
// Take the 2'-6" route out and the seating gets 3'-3 1/4" of depth.
//
// A Cleon is 4'-8" wide. A SALTMYRAN is 4'-9 7/8". Neither fits in 3'-3 1/4", and
// no amount of shuffling changes that — so the congregation stops being a sofa
// and becomes A ROW: two EKENÄSET armchairs and a pouf, all facing east at the
// picture, strung out along the room's LENGTH instead of across its depth.
//
// WHY A ROW STILL WORKS OPTICALLY, which is not obvious: a chair back 2'-6" in
// front of your eyes does not block a picture 10 ft away. The governing ray
// falls from a 46" eye to the 28 1/2" image bottom over the whole run, so 2'-6"
// along it the ray is still 43" up and an armchair's 2'-6" back is nowhere near
// it. The seat in front has to be TALL, not merely in front, and none of these
// are. (Verified with pnpm sightline, not asserted.)
const CHAIR_D = 2.5625; // 30 3/4" deep, running east-west
const CHAIR_W = 2.104167; // 25 1/4" wide, running north-south
const ROW_CY = 11.95; // the row's centreline
const CHAIR_A_CX = 9.4; // front seat: x 8.12 .. 10.68
const CHAIR_B_CX = 5.51; // second seat: x 4.23 .. 6.79 — its full 1'-4" of legroom lands exactly on the front chair's back
const POUF_CX = 3.35; // third seat: x 2.60 .. 4.11, 1 1/8" clear of the folded console
// The spine: the east-west route that has to survive between the bed's foot and
// the row. y 7'-9 3/4" to 10'-10 3/4", i.e. 3'-1".
const ROW_N = ROW_CY - CHAIR_W / 2; // 10.898

// Rug: 8x10 turned so its 10'-0" side runs east-west, under the row and the
// spine, stopping short of the plinth.
const RUG_X = 10.1; // x 5.10 .. 15.10
const RUG_Y = 9.4; // y 5.40 .. 13.40

// ------------------------------------------------------------------ the dining
// The same folded NORDEN console as layout A, on the same glazing wall, but
// pushed SOUTH into the open quarter the turned bed opens up: the promenade in
// front of it is now 5'-6" of clear floor rather than a 2'-7" slot.
const TABLE_D = 0.85; // 10 1/4" folded
const TABLE_BACK_X = GLASS_BAND_E + 0.06; // 1.65
const TABLE_X = TABLE_BACK_X + TABLE_D / 2; // 2.075
const TABLE_Y = 11.9; // y 10.59 .. 13.21 — the south end of the west aisle
// The two FRÖSVI are drawn STORED — folded flat and leaned against the foot of
// the bed, the same device layout D uses. It is not a preference: the row plus
// its legroom takes the floor layout A parks its chairs on, and the foot of the
// bed is the one flat surface left with 2'-6" of open floor in front of it.
const FOLD_D = 0.26; // folded flat, ~3"
// Leaned against the wide leg's north wall in the 1'-0 3/4" of wall between the
// step and the desk's west end — the one stretch of wall in the plan that is
// not the bed, the desk, the screen or glass, with open floor in front of it.
const DINE_CHAIR_X = 10.2;
const DINE_CHAIR_A_Y = N_FACE_WIDE + 0.02 + FOLD_D / 2; // 3.37
const DINE_CHAIR_B_Y = DINE_CHAIR_A_Y + FOLD_D + 0.02; // 3.65

const layout: Layout = {
  id: 'f-headboard',
  name: 'F — Headboard',
  description:
    'Layout A with the queen turned 90 degrees: head against the notch\'s north wall with a real 39" headboard, 2\'-0" of clear floor on BOTH long sides and a nightstand on each of them. The same picture on the same wall, but the seating leaves the bed\'s column — so the sofa lands square on the screen centreline and 1\'-9" closer to it, and the bed stops being a seat.',
  plan: 'studio-508',
  items: [
    // ========================================================== PROJECTION
    {
      id: 'screen',
      def: 'screen-ust-alr-vividstorm-100',
      at: [SCREEN_X, SCREEN_Y],
      rot: 90,
      z: SCREEN_Z,
      label: '100" UST ALR fixed frame, image bottom 28 1/2" AFF',
      note: 'Identical to layout A: back flat on the bathroom partition, centred on the 9\'-10 1/4" wall, picture y 4\'-6 1/4" to 11\'-9 3/8". Nothing about the picture changes in this scheme — only what is in front of it.',
    },
    {
      id: 'image',
      def: 'projection-image-100',
      at: [FABRIC_X - 0.004167, SCREEN_Y],
      rot: 90,
      z: IMAGE_BOTTOM,
      label: 'The picture, switched on',
    },
    {
      id: 'plinth',
      def: 'plinth-ust-bespoke-66',
      at: [PLINTH_X, SCREEN_Y],
      rot: 90,
      label: 'Bespoke UST plinth, 66 x 24 x 14',
    },
    {
      id: 'projector',
      def: 'projector-ust-hisense-px3-pro',
      at: [PROJ_X, SCREEN_Y],
      rot: 90,
      z: PLINTH_H,
      label: 'Hisense PX3-PRO, 0.22:1, on the plinth',
    },

    // ============================================================= BLACKOUT
    ...WINDOW_BAYS.flatMap((bay, i) => {
      const cy = (bay[0] + bay[1]) / 2;
      const w = bay[1] - bay[0];
      return [
        {
          id: `shade-${i + 1}`,
          def: 'shade-blackout-cellular-bay',
          at: [W_FACE + 0.13, cy] as [number, number],
          rot: 270,
          size: { w },
          label: `Blackout cellular shade, bay ${i + 1}, ${formatFtIn(w)} wide`,
        },
        {
          id: `channels-${i + 1}`,
          def: 'shade-side-channels-bay',
          at: [W_FACE + 0.13, cy] as [number, number],
          rot: 270,
          label: `Blackout side channels, bay ${i + 1} (pair)`,
        },
      ];
    }),

    // =============================================================== SLEEP
    //
    // Nothing in this group is fixed to a wall. The headboard is part of the
    // bed, both nightstands stand on the floor, both lamps are rechargeable and
    // the storage is under the frame.
    {
      id: 'bed',
      def: 'bed-queen-awara-bamboo-headboard',
      at: [BED_CX, BED_CY],
      rot: 0,
      label: 'Awara bamboo queen WITH headboard, head to the notch north wall',
      note: 'Turned 90 degrees out of layout A\'s orientation. The 39" headboard is the entire reason this layout exists and the reason it can only stand here: it is 9" over the glazing rule, so it needs a solid wall behind it, and the notch\'s north wall is the only one in the unit long enough that is not already the screen or the desk. Head 1/4" off the plaster, foot at 7\'-9 3/4", 2\'-0 1/8" of clear floor down each long side.',
    },
    {
      id: 'bed-cover',
      def: 'bedcover-linen-terracotta-queen',
      at: [BED_CX, BED_FOOT_Y - 0.16 - 26 / 24],
      rot: 0,
      z: MATTRESS_TOP,
      label: 'Vintage-wash linen bed cover, terracotta — folded across the foot',
      note: 'Same bedding scheme as the revised layout A: oat linen sheets, a sand duvet cover, and one folded terracotta bed cover as the only colour. Here it is doing more work, because a bed with a headboard is furniture you look AT from the sofa rather than a low plane you look over.',
    },
    {
      id: 'bed-night-w',
      def: 'nightstand-tonstad',
      at: [NIGHT_W_X, NIGHT_Y],
      rot: 0,
      label: 'TONSTAD nightstand, west side',
      note: 'THE PAIR OF THEM IS THE POINT. In layout A there is exactly one bedside position in the whole plan and it is in a walkway; here there are two, they match, and they stand in floor that exists because the bed is turned. This one overhangs the 1\'-0" window band by 3 5/8", which is allowed at 1\'-11 1/4" tall.',
    },
    {
      id: 'bed-night-e',
      def: 'nightstand-tonstad',
      at: [NIGHT_E_X, NIGHT_Y],
      rot: 0,
      label: 'TONSTAD nightstand, east side',
    },
    {
      id: 'bed-lamp-w',
      def: 'lamp-bellhop-portable',
      at: [NIGHT_W_X, NIGHT_Y],
      rot: 0,
      z: NIGHT_TOP,
      label: 'Flos Bellhop Unplugged, west side',
      note: 'Cordless, and here that is worth $370 twice over: there is no outlet at the glazed wall for the west lamp and no outlet in the middle of the notch wall for the east one, and a symmetrical pair of bedside lights with one cord snaking across the floor is worse than no pair at all.',
    },
    {
      id: 'bed-lamp-e',
      def: 'lamp-bellhop-portable',
      at: [NIGHT_E_X, NIGHT_Y],
      rot: 0,
      z: NIGHT_TOP,
      label: 'Flos Bellhop Unplugged, east side',
    },
    ...[0, 1, 2].map((i) => ({
      id: `bed-storage-${i + 1}`,
      def: 'storage-skubb-underbed',
      at: [BED_CX, BED_HEAD_Y + 1.6 + i * 1.9] as [number, number],
      rot: 0,
      label: 'SKUBB case under the bed, 35 1/2 x 20 3/4 x 7 1/2',
    })),

    // =============================================================== LOUNGE
    {
      id: 'seat-front',
      def: 'armchair-ekenaset',
      at: [CHAIR_A_CX, ROW_CY],
      rot: 270,
      label: 'EKENÄSET armchair, front of the row',
      note: 'THE SOFA IS GONE AND THIS IS WHAT REPLACES IT. A 25 1/4"-wide chair fits the 3\'-3 1/4" of depth a turned bed leaves; a 4\'-8" sofa does not, and that is the whole story of this layout in one line. 10\'-1" from the image centre, which subtends 39.6 deg — the closest seat in the scheme, inside the analyzer\'s 45 deg bound and outside THX\'s 36.',
    },
    {
      id: 'seat-second',
      def: 'armchair-ekenaset',
      at: [CHAIR_B_CX, ROW_CY],
      rot: 270,
      label: 'EKENÄSET armchair, second in the row',
      note: '1\'-4" of legroom behind the front chair — its full CLEARANCE.sofaToTable, landing exactly on the front chair\'s back — and 13\'-9 1/4" from the image centre, i.e. 29.6 deg, which is the SMPTE reference angle. It sees over the front chair because a 2\'-6" back 2\'-10" in front of your eyes sits 15" below the ray at that point.',
    },
    {
      id: 'seat-pouf',
      def: 'pouf-jarrestad-18',
      at: [POUF_CX, ROW_CY],
      rot: 270,
      label: 'JÄRRESTAD pouf, back of the row',
      note: 'Third seat, 15\'-10 1/4" out — 25.8 deg, near the far end of the analyzer\'s band (22 deg). Hollow, so it stores the throw, and it stacks against the bed when nobody is over.',
    },
    {
      id: 'rug-viewing',
      def: 'rug-nordicknots-desert-8x10',
      at: [RUG_X, RUG_Y],
      rot: 90,
      label: 'Nordic Knots Desert 8x10, 7 mm flatweave',
      note: 'Defines the viewing floor, and here it also draws the line between the sleeping quarter and the room: its west edge stops 1\'-6" short of the bed.',
    },
    {
      id: 'plant-screen',
      def: 'plant-medium-40in',
      at: [16.9, 12.3],
      rot: 0,
      note: 'South of the beam, exactly as in layout A: anything inside the UST\'s light cone casts a hard shadow on the picture.',
    },

    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-magnus-pro',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Secretlab MAGNUS Pro 59.1 x 27.6, sit-stand 25 5/8"-49 1/4"',
      note: 'Unchanged from layout A, and for the same reason: it is the only north wall left once the notch wall is the bed\'s headboard wall. Being 2.4" shallower than the Jarvis it replaces, it also parks the chair 2.4" further north, which is worth more in this layout than in A because there is no sofa here to walk round.',
    },
    {
      id: 'desk-arm',
      def: 'monitor-arm-single-jarvis',
      at: [DESK_X, DESK_BACK + 0.25],
      rot: 0,
    },
    {
      id: 'monitor',
      def: 'monitor-32',
      at: [DESK_X, DESK_BACK + 0.4],
      rot: 0,
      label: '32" 4K panel, facing south',
    },
    // No separate tray line: the MAGNUS has its own tray and power column.
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.8, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.9, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.5], rot: 0 },
    {
      id: 'desk-chair',
      def: 'chair-ergonomic-aeron',
      at: [DESK_X, CHAIR_Y],
      rot: 180,
      note: 'Parked in the reserved 2\'-6", not tucked. It is still the piece that eats the most picture in this room — see the SIGHTLINE note.',
    },

    // ============================================================== DINING
    {
      id: 'dining-table',
      def: 'dining-gateleg-norden',
      at: [TABLE_X, TABLE_Y],
      rot: 270,
      label: 'NORDEN gateleg, drawn FOLDED (10 1/4" deep)',
      note: 'Same console as layout A, at the south end of the west aisle where the turned bed leaves it a corner of its own. It opens its east leaf into the row\'s floor.',
    },
    {
      id: 'dining-chair-w',
      def: 'chair-frosvi-folding',
      at: [DINE_CHAIR_X, DINE_CHAIR_A_Y],
      rot: 0,
      size: { d: FOLD_D },
      label: 'FRÖSVI folding chair, stored flat',
      note: 'Leaned FOLDED against the wide leg\'s north wall between the step and the desk — the same device layout D uses for the same reason. THIS IS A REAL COST OF THE ROW: layout A parks its two chairs standing and ready to sit on; here the row and its legroom have taken the floor A parks them on, so they are stored and carried to the opened console leaf at dinner.',
    },
    {
      id: 'dining-chair-e',
      def: 'chair-frosvi-folding',
      at: [DINE_CHAIR_X, DINE_CHAIR_B_Y],
      rot: 0,
      size: { d: FOLD_D },
      label: 'FRÖSVI folding chair, stored flat',
    },

    // =============================================================== ENTRY
    {
      id: 'entry-shoe-w',
      def: 'entry-trones-shoe',
      at: [27.05, S_FACE_EAST - 0.02 - 0.594 / 2],
      rot: 180,
    },
    {
      id: 'entry-shoe-e',
      def: 'entry-trones-shoe',
      at: [28.85, S_FACE_EAST - 0.02 - 0.594 / 2],
      rot: 180,
    },
    { id: 'entry-mirror', def: 'mirror-full-length-wall', at: [28.0, 12.45], rot: 0, z: 0.9 },
  ],
  notes: [
    'WHY THIS LAYOUT EXISTS. It is the answer to one question — "why not turn the bed 90 degrees?" — built rather than argued. Everything about the picture, the desk, the blackout and the entry is copied from layout A unchanged, so every difference below is caused by the bed and by nothing else.',
    'THE NOTCH IS EXACTLY WIDE ENOUGH, AND ONLY JUST. Glass face to the step in the north wall is 9\'-4 1/8". The Awara queen is 5\'-3 7/8" across. That leaves 4\'-0 1/8" to split between the two long sides, i.e. 2\'-0 1/8" each — one eighth of an inch over the 2\'-0" the analyzer requires beside a bed that sleeps two, and the reason this scheme uses the Awara and not the wider frames in the catalog: a Thuma (65") leaves 1\'-11 5/8" a side and a Floyd (67") leaves 1\'-10 5/8". Both would reintroduce the bed-access warning this layout exists to remove.',
    'WHAT THE HEADBOARD COSTS THE ROOM, IN ONE LINE OF ARITHMETIC. Between the notch\'s north wall and the kitchen aisle there is 12\'-11 1/4" of depth. Turned, the bed spends 7\'-1 7/8" of it (83.9" of frame plus an inferred 2" of headboard) and leaves 5\'-9 1/4". A 2\'-6" walk plus a 4\'-8" sofa needs 7\'-2". IT DOES NOT FIT, and that is why the seating had to leave the bed\'s column entirely and move east. Every other difference in this file follows from that one shortfall of 1\'-4 3/4".',
    'THE ROW, AND WHY IT IS A ROW. The seating in this scheme runs along the room\'s LENGTH instead of across its depth, because that is the only axis a turned bed leaves: front armchair 10\'-1" from the image centre (39.6 deg), second armchair 13\'-9 1/4" (29.6 deg — SMPTE reference), pouf 15\'-10 1/4" (25.8 deg). All three are inside the analyzer\'s 8\'-9 1/4" to 18\'-8 1/4" band; the front one is closer than THX would like and the back one further than ideal, which is what a row costs. A ROW ALSO WORKS OPTICALLY, and that is not obvious: the governing ray falls from a 46" eye to the 28 1/2" image bottom over the whole run, so 2\'-10" along it — where the next chair back stands — the ray is still 43" up and a 2\'-6" chair back is 16" below it. Measured rather than asserted: pnpm sightline gives 97.2%, 91.6% and 89.2% for the three seats, against layout A\'s 92.0% sofa and 81.9% bed. (It also scores the two folding chairs stored flat by the desk at 88.3% and 87.0%, which is why the printed worst-seat line reads 87.0% — nobody sits on a folded chair, and the number is left in rather than filtered out because filtering your own metric is how a layout starts lying to you.) THE OFF-AXIS COST IS REAL THOUGH: the front chair sits 22 deg off the screen axis where A\'s sofa is 13.7, because a row along the length is a row looking diagonally at the wall. On a screen published at 170 deg of viewing angle that is a geometric non-event, but it is why nobody would draw this room this way if a sofa fitted.',
    'THE BED STOPS BEING A SEAT, AND THAT IS THE BIGGEST LOSS. Layout A\'s queen faces east down the room and sees 81.9% of the picture from the pillows; it is a genuine fourth seat and the place a lot of watching actually happens in a studio. Turned, this bed faces SOUTH across the room and sees none of it. Three seats on the picture against A\'s four, and no watching in bed. If the client watches in bed, this layout is the wrong one and no amount of headboard fixes it.',
    'CIRCULATION IS BETTER THAN A\'S, WHICH IS NOT WHAT I EXPECTED AND IS THE ONE GENUINE SURPRISE IN THIS FILE. Every required route comes back at 2\'-9" or better and three of the five at 3\'-0" or more (layout A has two of them at 2\'-6"), and the scheme returns NO WARNINGS AT ALL — E is the only other one that does. Turning the bed opens a quarter of clear floor in the south-west that layout A does not have (the bed\'s foot used to point into it), so the promenade to the west windows and the walk past the dining console both widen. What replaces A\'s tight bed aisle is a pair of 2\'-0 1/8" bedside aisles, which are not walkways and are not measured as such — they are bed access, and 2\'-0" is the standard for exactly that.',
    'SIGHTLINE — AND THE ONE THING TURNING THE BED CANNOT FIX. The parked Aeron is still the piece that eats picture — 3\'-7" tall against a 2\'-4 1/2" image bottom — but it eats LESS of it here: 0.7% from the front chair, 6.6% from the second and 9.0% from the pouf, against 6.6% from A\'s sofa and 18.1% from A\'s bed. The row sits south of the chair\'s line rather than behind it. The structural answer to the desk chair is layout E, which moves the desk into the notch; that option is not available here, because in this scheme the notch is the bedroom.',
    'STORAGE. The same as the revised layout A and no better: four SKUBB cases in the 8.3" under the frame (three drawn), two nightstand drawers instead of one, the run of built-in reach-in closets, the plinth bays, two TRONES and two hollow poufs. There is still NO DRESSER and no wardrobe, and the turned bed does not create a wall for one — it consumes the only wall that was free.',
    'GLAZING RULE. The 39" headboard would fail it outright if it stood anywhere near the glass; it stands 7\'-1" back from it, facing away, against plaster. The west nightstand is the only piece in the 1\'-0" window band, at 1\'-11 1/4" tall — 6 3/4" under the 2\'-6" limit, and low enough to be under a sill rather than in a view. The bed itself now presents its 5\'-3 7/8" side to the glazing rather than its head, so from the sofa you see more glass, not less.',
    'BUDGET. $15,563 of catalogue total, which is $280 LESS than layout A — and the shape of that is worth reading, because it is not a saving. The sleeping end goes UP by $1,158 (the $269 headboard, a second $150 TONSTAD, a second $370 Bellhop) and the seating comes DOWN by $1,392 ($1,960 of Blu Dot Cleon and $260 of poufs replaced by two $349 EKENÄSET armchairs and a $130 pouf that was already in A). THE GAP TO A NARROWED FROM $628 TO $280 ON 31 Jul 2026 AND NEITHER SCHEME GOT DEARER: both took the same $526 off the desk by swapping a Jarvis for a MAGNUS Pro, and then A separately took $369 off its bed by swapping the Awara for an Article Basi — which this layout could NOT follow, because its whole premise is the Awara\'s own 39" headboard against a solid wall. So A got cheaper and F did not, and the sleeping-end delta above is partly A falling rather than F rising. So the honest sentence is: this scheme spends a sofa on a bedroom. Whether a headboard, a matching pair of nightstands and a queen you can get into from both sides is worth a sofa, three seats instead of four and no watching in bed is a decision for the client — but it is now a real choice with both sides drawn to scale, rather than an argument.',
  ],
};

export default layout;
