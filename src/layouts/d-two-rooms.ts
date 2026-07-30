/**
 * LAYOUT D — "Two rooms"
 *
 * STRATEGY: stop treating it as a studio. A 5'-11" screen and a 4'-10" open
 * shelf unit, set in line on the step corner at x = 10'-0", cut the open floor
 * into two rooms you can name:
 *
 *   WEST ROOM  a bedroom with a view. The queen runs head-to-the-glass, so both
 *              long sides are open floor (2'-8" north, wide open south) — the
 *              only place in this plan where a two-sleeper bed gets a proper
 *              aisle on both sides AND the person in it wakes up in the window.
 *   EAST ROOM  a study: the 60" Jarvis on the wide leg's north wall, bookcases
 *              on the bathroom partition, and a low two-seat sofa behind the
 *              desk chair so there is somewhere to sit that is not the bed.
 *
 * The doorway between them is the 4'-9" gap south of the shelf unit, which is
 * also the main route from the front door to the kitchen, so the partition costs
 * no circulation.
 *
 * Desk orientation is the house rule (see a-window-desk.ts): top east-west on a
 * north wall, user facing north, screen facing south. In this scheme the desk is
 * 14'-0" back from the glazing with a 5'-11" screen between it and the window,
 * so it is the one layout where the afternoon sun cannot reach the panel at all
 * — and the price is that the work surface only gets borrowed light.
 */

import type { Layout } from '@/core/types';
import { BATH_W_FACE, N_FACE, N_FACE_WIDE, S_FACE_EAST, W_FACE } from './faces';

// ---- the bedroom -----------------------------------------------------------
// Queen platform turned so the HEAD is against the glazing wall. The platform is
// 1'-11" tall, well under the 2'-6" limit, so the bed does not block the window
// it is pushed against.
const BED_HEAD_X = W_FACE + 0.02; // 0.61
const BED_CX = BED_HEAD_X + 7.17 / 2; // 4.195 -> x 0.61 .. 7.78
const BED_CY = 5.85; // y 3.14 .. 8.56; north aisle 2'-6", south 5'-0"

// ---- the partition line ----------------------------------------------------
const DIV_X = 10.9; // leaves a 2'-6" opening between the foot of the bed and the partition

// ---- the study -------------------------------------------------------------
const DESK_D = 2.25; // 60" x 27"
const DESK_X = 14.3; // x 11.80 .. 16.80
const DESK_Y = N_FACE_WIDE + 0.02 + DESK_D / 2; // 4.365
const DESK_BACK = DESK_Y - DESK_D / 2; // 3.24
const DESK_FRONT = DESK_Y + DESK_D / 2; // 5.49
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 6.645

const layout: Layout = {
  id: 'd-two-rooms',
  name: 'D — Two rooms',
  description:
    'A screen and a shelf unit on the step line make two named rooms: a bedroom at the glass with a queen that has an aisle on both sides, and a study holding the 60" Jarvis, bookcases and a low sofa.',
  plan: 'studio-508',
  items: [
    // ============================================================= BEDROOM
    {
      id: 'bed',
      def: 'bed-queen-platform',
      at: [BED_CX, BED_CY],
      rot: 270,
      label: 'Queen platform, head to the glazing',
      note: 'Turned so both long sides are open: 2\'-8" north, 5\'-3" south. 1\'-11" tall, so it never stands in the window it is pushed against.',
    },
    { id: 'nightstand', def: 'nightstand-narrow-14', at: [2.3, 9.2], rot: 0 },
    { id: 'bed-lamp', def: 'lamp-table-ceramic', at: [2.3, 9.2], rot: 0, z: 2.0 },
    { id: 'rug-bed', def: 'rug-5x8', at: [4.7, 11.0], rot: 90 },
    { id: 'plant-bed', def: 'plant-medium-40in', at: [8.8, 13.0], rot: 0 },

    // =========================================================== PARTITION
    {
      id: 'divider-screen',
      def: 'screen-room-divider-3panel',
      at: [DIV_X, 5.6],
      rot: 90,
      note: 'Runs south from the step corner. 5\'-11" tall, 9\'-8" east of the glass, so it divides the plan without standing in the light.',
    },
    {
      id: 'divider-shelf',
      def: 'shelf-kallax-4x4',
      at: [DIV_X, 10.3],
      rot: 90,
      note: 'Open on both faces: storage for the study, headboard-height screening for the bedroom.',
    },

    // ============================================================== STUDY
    {
      id: 'desk',
      def: 'desk-standing-jarvis-60x27',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Jarvis 60 x 27, sit-stand 24 1/2"-50"',
      note: 'North wall of the study, user faces north, both screens face south. The partition stands between this desk and the west sun.',
    },
    { id: 'desk-arm', def: 'monitor-arm-dual-jarvis', at: [DESK_X, DESK_BACK + 0.25], rot: 0 },
    { id: 'monitor-l', def: 'monitor-27', at: [DESK_X - 1.15, DESK_BACK + 0.5], rot: 0 },
    { id: 'monitor-r', def: 'monitor-27', at: [DESK_X + 1.15, DESK_BACK + 0.5], rot: 0 },
    { id: 'desk-tray', def: 'cable-tray-jarvis', at: [DESK_X, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.8, DESK_BACK + 0.7], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.7, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.35], rot: 0 },
    { id: 'desk-chair', def: 'chair-ergonomic-aeron', at: [DESK_X, CHAIR_Y], rot: 180 },
    {
      id: 'bookcase',
      def: 'bookcase-billy-tall',
      at: [BATH_W_FACE - 0.02 - 0.46, 7.6],
      rot: 90,
      note: 'Back to the bathroom partition — the only blank 9\'-6" wall in the unit.',
    },

    // ============================================================== LOUNGE
    {
      id: 'sofa',
      def: 'sofa-2seat-klippan',
      at: [14.6, 11.6],
      rot: 180,
      note: 'Low-backed (2\'-2") so it never reads as a wall across the study. Faces the desk wall; you swing the chair round to it.',
    },
    { id: 'rug-study', def: 'rug-5x8', at: [14.4, 11.3], rot: 90 },
    { id: 'lamp-study', def: 'lamp-floor-hektar', at: [18.2, 9.7], rot: 0 },

    // =============================================================== ENTRY
    { id: 'shoes', def: 'cabinet-shoe-bissa', at: [27.15, S_FACE_EAST - 0.05 - 0.46], rot: 180 },
    { id: 'entry-art', def: 'art-framed-large', at: [28.0, 12.4], rot: 0, z: 3.4 },

  ],
  notes: [
    'STANDING DESK: Fully Jarvis 60" x 27" bamboo top (travel 24 1/2"-50"), Jarvis dual arm with two 27" screens, cable tray, CPU sling, clamp task light, felt mat, Aeron size B. $3,789 of $6,346 — the same kit as layout A in a room of its own.',
    'DESK ORIENTATION: the top runs east-west on the study\'s north wall (x 11\'-10" to 16\'-10"), the user faces north, both screens face south. This is the only one of the four schemes where the desk is not beside the glass: the partition and 11\'-3" of plan sit between the panel and the west sun, so there is no glare at any hour. The price is that the work surface gets borrowed daylight rather than direct, and the task lamp earns its keep here.',
    'DESK PULL-BACK: the layout reserves the full 2\'-6" (CLEARANCE.deskChair) of clear floor in front of the top. The Aeron is 2\'-3" deep and is drawn PARKED inside that zone, not tucked under the top, so the chair is counted as real floor and the 3" left over is the gap to the walkway. Nothing else stands in the zone.',
    'BED: a queen platform, head to the glazing, long sides north and south — 2\'-6" of aisle on the north and 5\'-0" on the south. It is the only orientation in this plan that gives a two-sleeper bed a real aisle on both sides without turning it side-on the way layout A does, and the foot of the bed clears the partition by 2\'-6" so the north aisle is genuinely reachable.',
    'GLAZING: the bed head touches the glass wall on purpose. The platform is 1\'-11", well under the 2\'-6" limit, so you look straight over it; the tallest thing within 3\'-0" of the wall face anywhere in this scheme is the 2\'-0" nightstand.',
    'SUN CONTROL: top-down/bottom-up cellular shades in the reveals. Curtain panels are the wrong product against a bed head pushed to the glass, and there is nowhere to stack them. Not in the catalog, so not drawn or budgeted.',
    'THE PARTITION: a 5\'-11" three-panel screen (y 3\'-7" to 7\'-7") and a 4\'-10" open KALLAX (y 7\'-11" to 12\'-9") in line at x 10\'-9". Together they run 9\'-2" of the 13\'-0" between the step corner and the kitchen aisle; the 4\'-9" left at the south end is the doorway between the two rooms AND the main route to the kitchen, so the partition costs nothing in circulation.',
    'TRADE-OFF — the study is windowless. Splitting a 448 sq ft floor plate gives you two rooms you can name, but only one of them touches the glazing. If daylight on the desk matters more than a bedroom you can close off, take A.',
    'TRADE-OFF — the lounge is a 5\'-11" two-seat sofa in the study, not a sectional facing a view, and there is no television in this scheme.',
    'BUILT-INS and CIRCULATION: kitchen aisle, fridge, laundry and closet zones all clear. Front door to bathroom 3\'-6", to the kitchen 3\'-0", to the windows 3\'-0"; the tightest measured route is 2\'-6" on the approach to the bed.',
    'BUDGET $6,346 — the cheapest of the four, because the partition is two pieces of furniture rather than construction.',
    'BUDGET CAVEAT: catalogue prices are furniture only. bed-queen-platform is a FRAME, so add roughly $800-1,200 for a mattress, plus shades and bedding, on top of the $6,346.',
  ],
};

export default layout;
