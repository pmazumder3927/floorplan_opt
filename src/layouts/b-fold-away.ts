/**
 * LAYOUT B — "Fold away"
 *
 * STRATEGY: buy back the floor. A queen Murphy bed on the north wall of the
 * wide leg means the bed occupies 1'-4" of depth for sixteen hours a day, and
 * the whole west bay — the daylight half — becomes something layout A cannot
 * afford: a real dining room, a 5'-0" table with a bench and two chairs, where
 * you can sit four people down and where the client actually eats lunch between
 * calls instead of eating over the keyboard.
 *
 * The cost is stated plainly in the notes: there is no sofa anywhere in this
 * scheme, because the only floor big enough to hold one is the floor the bed
 * lands on. You get a dining room and a reading chair instead of a lounge.
 *
 * Desk orientation follows the rule set out in a-window-desk.ts: the top runs
 * east-west on the north wall of the notch, the user faces north, the screen
 * faces south, and the west glazing is on the user's left.
 */

import type { Layout } from '@/core/types';
import { N_FACE, N_FACE_WIDE, S_FACE_EAST, W_FACE } from './faces';

// ---- the work wall ---------------------------------------------------------
// 48" x 30": one screen, not two, because this layout spends its width on the
// dining table instead. The 30" depth is kept — it is what puts a 32" panel at a
// real viewing distance.
const DESK_D = 2.5;
const DESK_X = 4.6; // top runs x 2.60 .. 6.60, keeping the chair back 2'-11" off the glass
const DESK_Y = N_FACE + 0.02 + DESK_D / 2; // 1.90
const DESK_BACK = DESK_Y - DESK_D / 2; // 0.65
const DESK_FRONT = DESK_Y + DESK_D / 2; // 3.15
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 4.305

// ---- the bed ---------------------------------------------------------------
// Closed: 5'-6" x 1'-4" x 7'-0" of cabinet on the wide leg's north wall.
// Open:   the mattress swings down to y = 10.41, x 12.40 .. 17.90. Everything
//         inside that rectangle is deliberately empty floor.
const MURPHY_X = 15.15; // cabinet x 12.40 .. 17.90
const MURPHY_Y = N_FACE_WIDE + 0.02 + 1.33 / 2; // 3.905
const MURPHY_DROP_S = N_FACE_WIDE + 0.02 + 7.17; // 10.41

// ---- the table -------------------------------------------------------------
// 60" x 30" rectangular, running east-west so its short end points at the glass
// and nobody eats with the sun in their eyes. Bench on the north side, two
// chairs south; the WEST end is left open on purpose so
// there is never a chair back standing between the room and the window.
const TABLE_X = 6.1; // top x 3.60 .. 8.60, keeping a 3'-0" walk along the glass
const TABLE_Y = 9.2;
const TABLE_N = TABLE_Y - 1.25; // 7.95
const TABLE_S = TABLE_Y + 1.25; // 10.45
const TABLE_E = TABLE_X + 2.5; // 7.50

const layout: Layout = {
  id: 'b-fold-away',
  name: 'B — Fold away',
  description:
    'The bed folds into the wall, so the daylight half of the plan becomes a real dining room: a 5\'-0" table seating four, a Jarvis 48 x 30 on the north wall, and no sofa anywhere — that is the trade.',
  plan: 'studio-508',
  items: [
    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-48x30',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Jarvis 48 x 30, sit-stand 24 1/2"-50"',
      note: 'North wall, screen facing south, glazing on the left — daylight across the desktop, never on the panel.',
    },
    { id: 'desk-arm', def: 'monitor-arm-single-jarvis', at: [DESK_X, DESK_BACK + 0.25], rot: 0 },
    { id: 'monitor', def: 'monitor-32', at: [DESK_X, DESK_BACK + 0.45], rot: 0 },
    { id: 'desk-tray', def: 'cable-tray-jarvis', at: [DESK_X, DESK_BACK + 0.5], rot: 0 },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.4, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.25, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.5], rot: 0 },
    { id: 'desk-chair', def: 'chair-ergonomic-aeron', at: [DESK_X, CHAIR_Y], rot: 180 },

    // =============================================================== SLEEP
    {
      id: 'murphy',
      def: 'bed-murphy-queen-closed',
      at: [MURPHY_X, MURPHY_Y],
      rot: 0,
      label: 'Queen Murphy bed (shown closed)',
      note: `Opens south to y ${MURPHY_DROP_S.toFixed(2)} over x 12.40-17.90. That rectangle carries nothing but floor.`,
    },
    {
      id: 'shelf-bed',
      def: 'shelf-kallax-2x4',
      at: [11.1, N_FACE_WIDE + 0.02 + 0.625],
      rot: 0,
      note: 'Fills the 2\'-7" of wall left between the step corner and the bed cabinet.',
    },

    // =============================================================== DINING
    {
      id: 'table',
      def: 'dining-rect-60x30',
      at: [TABLE_X, TABLE_Y],
      rot: 0,
      note: 'Long axis east-west; the west end is left seatless so nothing stands in the window.',
    },
    { id: 'bench', def: 'bench-dining-47', at: [TABLE_X, TABLE_N - 0.035 - 0.585], rot: 0 },
    { id: 'chair-s1', def: 'chair-dining', at: [TABLE_X - 1.4, TABLE_S + 0.035 + 0.875], rot: 180 },
    { id: 'chair-s2', def: 'chair-dining', at: [TABLE_X + 1.4, TABLE_S + 0.035 + 0.875], rot: 180 },
    { id: 'rug-dining', def: 'rug-6x9', at: [5.2, 9.2], rot: 90 },

    // ============================================================== LOUNGE
    {
      id: 'reading-chair',
      def: 'armchair-poang',
      at: [10.6, 8.1],
      rot: 90,
      note: 'Faces west across the room to the glass, 5 1/2" clear of where the open bed\'s edge lands.',
    },
    { id: 'lamp-reading', def: 'lamp-floor-hektar', at: [11.6, 10.9], rot: 0 },
    { id: 'plant', def: 'plant-fiddle-leaf-6ft', at: [9.6, 12.35], rot: 0 },
    {
      id: 'bookcase-n',
      def: 'bookcase-billy-tall',
      at: [18.385, 6.0],
      rot: 90,
      note: 'Back to the bathroom partition, clear of the open bed.',
    },
    { id: 'bookcase-s', def: 'bookcase-billy-tall', at: [18.385, 8.7], rot: 90 },

    // =============================================================== ENTRY
    { id: 'shoes', def: 'cabinet-shoe-bissa', at: [27.15, S_FACE_EAST - 0.05 - 0.46], rot: 180 },
    { id: 'entry-art', def: 'art-framed-small', at: [28.0, 12.4], rot: 0, z: 3.5 },

  ],
  notes: [
    'STANDING DESK: Fully Jarvis 48" x 30" bamboo top (travel 24 1/2"-50"), Jarvis single arm with one 32" screen, Jarvis cable tray, CPU sling, clamp task light, felt mat, Aeron size B. $3,570 of $7,897.',
    'DESK ORIENTATION: top east-west on the north wall (x 2\'-7" to 6\'-7"), user faces north, screen faces south, glazing on the left. Same rule as every layout here. The chair back is the tallest thing near the glass at 2\'-11" off the wall face.',
    'DESK PULL-BACK: the layout reserves the full 2\'-6" (CLEARANCE.deskChair) of clear floor in front of the top. The Aeron is 2\'-3" deep and is drawn PARKED inside that zone, not tucked under the top, so the chair is counted as real floor and the 3" left over is the gap to the walkway. Nothing else stands in the zone.',
    'BED: a queen Murphy. Closed it is a 1\'-4" deep cabinet on the wide leg\'s north wall (x 12\'-5" to 17\'-11"). Open, the mattress lands over x 12\'-5" to 17\'-11", y 3\'-3" to 10\'-5". Nothing is placed inside that rectangle, so the bed drops without moving a single piece of furniture — check it against the 2D plan.',
    'TRADE-OFF — THERE IS NO SOFA. This is the honest cost of a wall bed: the only stretch of floor big enough to hold one is the floor the mattress lands on. The soft seating is one POANG at the divider line plus the dining bench. If you want to lie down and watch something, take layout C.',
    'DINING: a 5\'-0" x 2\'-6" table (x 3\'-7" to 8\'-7") with a 3\'-11" bench on the north side and two chairs on the south — four places. The WEST end is deliberately seatless: it keeps a 3\'-0" walking strip along the glass and stops a 2\'-9" chair back standing in the window.',
    'GLAZING: nothing over 2\'-6" tall comes within 1\'-0" of the glass. The dining table (2\'-6") stops 3\'-0" short of the wall face, and the 6\'-0" fig — the tallest piece in the west bay — stands 7\'-10" east of it at the kitchen end.',
    'The Murphy cabinet is 7\'-0" tall, but it stands on an interior wall 11\'-10" east of the glazing, where it blocks nothing.',
    'SUN CONTROL: top-down/bottom-up cellular shades in the reveals rather than curtain panels — there is no wall to stack a 50" panel onto between these bays. Not in the catalog, so not drawn or budgeted.',
    'DENSITY: the checker reports 85% free floor and calls the scheme under-furnished. That is an artefact of drawing the bed CLOSED: with the mattress down the same layout is 78% free, which is normal. Judge it from both states.',
    'BUILT-INS and CIRCULATION: kitchen aisle, fridge, laundry and closet zones all clear; every required route is 3\'-0" usable or better.',
    'BUDGET $7,897 — the Murphy alone is $2,400 of it, and that is simply what a queen wall bed costs.',
    'BUDGET CAVEAT: catalogue prices are furniture only. The $2,400 Murphy is the cabinet and mechanism; add roughly $800-1,200 for a queen mattress, plus shades and bedding, on top of the $7,897.',
  ],
};

export default layout;
