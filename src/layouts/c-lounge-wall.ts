/**
 * LAYOUT C — "Lounge wall"
 *
 * STRATEGY: the opposite bet from B. This client wants somewhere to collapse at
 * the end of the day, so the wide leg becomes a proper living room — a 7'-0"
 * L-sectional, a 55" screen on the only long blank wall in the unit, a 4'-0"
 * coffee table and a 6x9 rug — and the sleeping arrangement pays for it: a
 * single 3'-7" platform bed lying along the glass in the north-west corner.
 *
 * THE BED IS THE IDEA, not an afterthought. The platform is 1'-11" tall. The
 * glazing now runs floor to ceiling, so a bed that is under 2'-6" high is the
 * one large object you can put against the glass without losing the window: you
 * look straight over it from anywhere in the room, and the sleeper wakes up with
 * the whole west wall of sky in front of them.
 *
 * Desk orientation is the house rule from a-window-desk.ts — top east-west on
 * the north wall, user facing north, screen facing south, glass on the left.
 * Here the top is the 27"-deep Jarvis rather than the 30", specifically so the
 * chair pull-back does not push out into the walk between bed and sofa.
 */

import type { Layout } from '@/core/types';
import { N_FACE, N_FACE_WIDE, S_FACE_EAST, W_FACE } from './faces';

// ---- the bed ---------------------------------------------------------------
// Twin platform, head to the north wall, west side flush to the glazing wall.
const BED_X = 2.4; // x 0.61 .. 4.19
const BED_Y = N_FACE + 0.02 + 6.75 / 2; // 4.025 -> y 0.65 .. 7.40

// ---- the work wall ---------------------------------------------------------
const DESK_D = 2.25; // 27" deep top
const DESK_X = 7.9; // x 5.90 .. 9.90 — pushed east to widen the walk past the bed
const DESK_Y = N_FACE + 0.02 + DESK_D / 2; // 1.775
const DESK_BACK = DESK_Y - DESK_D / 2; // 0.65
const DESK_FRONT = DESK_Y + DESK_D / 2; // 2.90
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 4.055

// ---- the lounge ------------------------------------------------------------
// Sectional facing north at the screen. 7'-2" from the panel: a 55" set wants
// 5'-6" to 11'-6", so this sits comfortably in the middle of that band.
const TV_Y = N_FACE_WIDE + 0.2; // 3.42
const SOFA_X = 14.4;
const SOFA_Y = 10.5; // sectional y 8.00 .. 13.00

const layout: Layout = {
  id: 'c-lounge-wall',
  name: 'C — Lounge wall',
  description:
    'A real living room: L-sectional, 55" wall screen and a 6x9 rug fill the wide leg, paid for by sleeping single on a 1\'-11" platform bed laid along the glass where it cannot block the view.',
  plan: 'studio-508',
  items: [
    // =============================================================== SLEEP
    {
      id: 'bed',
      def: 'bed-twin-platform',
      at: [BED_X, BED_Y],
      rot: 0,
      label: 'Twin platform, 23" tall, against the glazing',
      note: 'Head to the north wall, long side flush to the glass. At 1\'-11" it sits below the 2\'-6" sightline, so the window reads full height over it.',
    },
    { id: 'nightstand', def: 'nightstand-narrow-14', at: [4.85, 1.3], rot: 0 },

    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-48x27',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Jarvis 48 x 27, sit-stand 24 1/2"-50"',
      note: '27" deep on purpose: it keeps the chair pull-back out of the walk between the bed and the sofa.',
    },
    { id: 'desk-arm', def: 'monitor-arm-single-jarvis', at: [DESK_X, DESK_BACK + 0.25], rot: 0 },
    { id: 'monitor', def: 'monitor-27', at: [DESK_X, DESK_BACK + 0.4], rot: 0 },
    { id: 'desk-tray', def: 'cable-tray-jarvis', at: [DESK_X, DESK_BACK + 0.5], rot: 0 },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.3, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.25, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.375], rot: 0 },
    { id: 'desk-chair', def: 'chair-ergonomic-aeron', at: [DESK_X, CHAIR_Y], rot: 180 },

    // ============================================================== LOUNGE
    { id: 'tv', def: 'tv-55-wall', at: [SOFA_X, TV_Y], rot: 0, z: 3.3 },
    {
      id: 'sofa',
      def: 'sectional-l-compact',
      at: [SOFA_X, SOFA_Y],
      rot: 180,
      note: 'Faces north at the screen, 7\'-2" away. Its back is the divider between the lounge and the route to the kitchen.',
    },
    { id: 'coffee', def: 'coffee-table-rect-48', at: [SOFA_X, 5.6], rot: 0 },
    { id: 'rug-lounge', def: 'rug-6x9', at: [14.2, 9.6], rot: 90 },
    { id: 'lamp-lounge', def: 'lamp-floor-hektar', at: [10.3, 7.4], rot: 0 },
    { id: 'plant', def: 'plant-medium-40in', at: [9.2, 12.5], rot: 0 },

    // =============================================================== DINING
    // A 28" bistro table and two folding chairs at the window. It is the only
    // dining this scheme can afford and it is honest about being for two.
    { id: 'bistro', def: 'dining-bistro-2seat', at: [2.9, 12.2], rot: 0 },
    { id: 'bistro-chair-n', def: 'chair-folding', at: [2.9, 10.2], rot: 0 },
    { id: 'bistro-chair-e', def: 'chair-folding', at: [4.85, 12.2], rot: 90 },

    // =============================================================== ENTRY
    { id: 'entry-bench', def: 'bench-storage-36', at: [28.0, S_FACE_EAST - 0.05 - 1.33 / 2], rot: 180 },
    { id: 'entry-mirror', def: 'mirror-full-length-wall', at: [28.0, 12.45], rot: 0, z: 0.9 },

  ],
  notes: [
    'STANDING DESK: Fully Jarvis 48" x 27" bamboo top (travel 24 1/2"-50"), Jarvis single arm with a 27" screen, cable tray, CPU sling, clamp task light, felt mat, Aeron size B. $3,200 of $6,807.',
    'DESK ORIENTATION: top east-west on the north wall (x 5\'-11" to 9\'-11"), user faces north, screen faces south, glazing on the left. The 27"-deep top is chosen over the 30" specifically so the parked chair does not stand in the walk between the bed and the sofa.',
    'DESK PULL-BACK: the layout reserves the full 2\'-6" (CLEARANCE.deskChair) of clear floor in front of the top. The Aeron is 2\'-3" deep and is drawn PARKED inside that zone, not tucked under the top, so the chair is counted as real floor and the 3" left over is the gap to the walkway. Nothing else stands in the zone.',
    'TRADE-OFF — YOU SLEEP SINGLE. A 3\'-7" twin is what pays for a 7\'-0" sectional, a 55" screen and a 6x9 rug in 448 sq ft. Its west side is flush to the glazing wall and you get in from the east, where there is 2\'-7" to the desk chair. There is no second sleeper and no pretending otherwise: take A or D if you need a queen.',
    'THE BED IS ALSO THE WINDOW STRATEGY. At 1\'-11" the platform is under the 2\'-6" limit for anything in front of floor-to-ceiling glass, so the one large object that does touch the glazing is the one you see straight over from every seat in the room.',
    'TV: a 55" panel wall-hung at 3\'-4" AFF on the north wall of the wide leg, 7\'-2" from the sectional (a 55" set wants 5\'-6" to 11\'-6"). It faces SOUTH, so the low western sun rakes across the screen instead of into it; with the shades dropped on bay 3 there is no glare on it at all.',
    'SUN CONTROL: top-down/bottom-up cellular shades in the reveals, not curtain panels — a 50" panel needs stacking space this glazing does not have, and one would land on the bed. Not in the catalog, so not drawn or budgeted.',
    'DINING is a 2\'-4" bistro table and two folding chairs. The chairs are 2\'-7" — one inch over the 2\'-6" glazing rule — and they stand 1\'-7" back from the wall face; they fold flat into the reach-in closet when nobody is eating. That is the whole dining provision and it is deliberately minimal.',
    'TIGHTEST POINT: 2\'-7" between the east side of the bed and the parked desk chair, which the checker reads as 2\'-6" usable. It is a bedside approach, not the main route — front door to bathroom is 3\'-6" and every other route is 3\'-0" or better, so two people still pass on the main run.',
    'BUILT-INS: kitchen, fridge, laundry and closet clear zones are all held. The sectional stops at y 13\'-0", 7" north of the kitchen work aisle, and its east end stops 1" short of the closet strip.',
    'BUDGET $6,807, of which the sectional, screen, rug and coffee table are $2,346 — this is the scheme that spends its money on the living room.',
    'BUDGET CAVEAT: catalogue prices are furniture only. bed-twin-platform is a FRAME, so add roughly $300-600 for a twin mattress, plus shades and bedding, on top of the $6,807.',
  ],
};

export default layout;
