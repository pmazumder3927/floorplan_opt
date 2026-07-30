/**
 * LAYOUT A — "Window desk"
 *
 * STRATEGY: this is a work-first apartment. The client works from home every
 * day, so the single best piece of real estate — the north wall of the west
 * notch, one pace from 18'-6" of floor-to-ceiling glass — goes to the Fully
 * Jarvis, not to a sofa. Sleeping is pushed to the far (east) end of the open
 * floor with its head against the bathroom wall, which is the only 9'-6" run of
 * blank wall in the unit and the only place a queen gets a real aisle on BOTH
 * sides. The lounge is a single loveseat aimed straight out of the window.
 *
 * DESK ORIENTATION — the whole reason the desk sits where it does. The glazing
 * faces WEST, so it takes direct sun from roughly 3pm to sunset. There are only
 * three ways to point a screen in this room:
 *   - screen facing west  -> the low sun lands on the panel; unreadable daily.
 *   - screen facing east  -> you sit facing east with the sun over your shoulder
 *                            and get the same reflection, plus the window is a
 *                            bright hole behind the screen that your eyes have
 *                            to fight all afternoon.
 *   - screen facing NORTH or SOUTH -> the glazing is off to one side. Daylight
 *                            rakes ACROSS the desktop (which is what you want on
 *                            paper and hands) and never down the barrel of the
 *                            screen.
 * So the desk runs east-west along the north wall, the user sits south of it
 * facing north, the screens face south, and the glass is on the user's LEFT.
 * That is the only correct answer here and all four layouts use it.
 */

import type { Layout } from '@/core/types';
import {
  BATH_W_FACE,
  CLOSET_FACE,
  E_FACE_MAIN,
  N_FACE,
  N_FACE_WIDE,
  S_FACE_EAST,
  W_FACE,
} from './faces';

// ---- the work wall ---------------------------------------------------------
// 60" x 30" bamboo top, flush to the north wall, starting 1'-3" east of the
// glass so the top itself never sits in the 1'-0" band in front of the window.
const DESK_W = 5.0;
const DESK_D = 2.5;
const DESK_X = 4.3; // centre: top runs x 1.80 .. 6.80
const DESK_Y = N_FACE + 0.02 + DESK_D / 2; // 1.90 -> top runs y 0.65 .. 3.15
const DESK_BACK = DESK_Y - DESK_D / 2; // 0.65
const DESK_FRONT = DESK_Y + DESK_D / 2; // 3.15

// Aeron parked in front of the top, not tucked under it (the desks in this model
// are solid boxes with no legroom void, so a tucked chair reads as a collision).
// 2'-3" of chair in a 2'-6" pull-back zone.
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 4.305

// ---- the bed ---------------------------------------------------------------
// Queen platform turned 90 deg: head against the bathroom's west partition,
// long sides north and south. 5'-5" of mattress with 2'-1" clear on the north
// side and open floor on the south — the only orientation in this unit that
// gives a queen a usable aisle on both sides.
const BED_HEAD_X = BATH_W_FACE - 0.025; // 18.84, a hair off the partition face
const BED_CX = BED_HEAD_X - 7.17 / 2; // 15.255
const BED_CY = 8.05; // mattress y 5.34 .. 10.76

// ---- the lounge ------------------------------------------------------------
// Loveseat aimed west at the view, its front face 5'-1" back from the glass so a
// 2'-8" round coffee table and a 1'-4" walking gap both fit in front of it.
const SOFA_FRONT_X = 5.66;
const SOFA_CX = SOFA_FRONT_X + 3.08 / 2; // 7.20
const SOFA_CY = 7.6; // group pulled north so the walk to the window stays open

const layout: Layout = {
  id: 'a-window-desk',
  name: 'A — Window desk',
  description:
    'Work-first: the Jarvis owns the north wall beside the glass, the queen goes head-to-the-bathroom-wall at the far end with 2\'-1" and 2\'-9" aisles, and the only lounge piece is a loveseat pointed at the view.',
  plan: 'studio-508',
  items: [
    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-60x30',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Jarvis 60 x 30, sit-stand 24 1/2"-50"',
      note: 'Back to the north wall, screens facing south, glazing on the user\'s left: side light on the work surface, never on the panel.',
    },
    {
      id: 'desk-arm',
      def: 'monitor-arm-dual-jarvis',
      at: [DESK_X, DESK_BACK + 0.25],
      rot: 0,
      note: 'Clamped at the back edge of the top; both screens ride up and down with it.',
    },
    { id: 'monitor-l', def: 'monitor-27', at: [DESK_X - 1.15, DESK_BACK + 0.4], rot: 0 },
    { id: 'monitor-r', def: 'monitor-27', at: [DESK_X + 1.15, DESK_BACK + 0.4], rot: 0 },
    {
      id: 'desk-tray',
      def: 'cable-tray-jarvis',
      at: [DESK_X, DESK_BACK + 0.5],
      rot: 0,
      note: 'Not optional on a sit-stand desk: every cable has to survive 25 1/2" of daily travel.',
    },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.8, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.65, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.5], rot: 0 },
    {
      id: 'desk-chair',
      def: 'chair-ergonomic-aeron',
      at: [DESK_X, CHAIR_Y],
      rot: 180,
      note: 'Parked, not tucked: 2\'-6" of pull-back between the top and the walkway.',
    },

    // =============================================================== SLEEP
    {
      id: 'bed',
      def: 'bed-queen-platform',
      at: [BED_CX, BED_CY],
      rot: 90,
      label: 'Queen platform, 23" tall',
      note: 'Head to the bathroom partition. North aisle 2\'-1", south aisle open floor.',
    },
    { id: 'nightstand-n', def: 'nightstand-hemnes', at: [BED_HEAD_X - 0.6, BED_CY - 3.5], rot: 90 },
    {
      id: 'dresser',
      def: 'dresser-3drawer-malm',
      at: [8.2, N_FACE + 0.03 + 1.58 / 2],
      rot: 0,
      note: 'Fills the last 2\'-7" of the north wall east of the desk.',
    },

    // ============================================================== LOUNGE
    {
      id: 'loveseat',
      def: 'loveseat-60',
      at: [SOFA_CX, SOFA_CY],
      rot: 90,
      note: 'Faces the glazing. Back is 1\'-2" off the step corner, which reads as a wall from the seat.',
    },
    { id: 'coffee', def: 'coffee-table-round-32', at: [2.93, SOFA_CY], rot: 0 },
    { id: 'rug-lounge', def: 'rug-5x8', at: [5.0, SOFA_CY], rot: 90 },
    { id: 'lamp-lounge', def: 'lamp-floor-hektar', at: [9.4, 11.2], rot: 0 },
    { id: 'plant-lounge', def: 'plant-medium-40in', at: [9.4, 12.7], rot: 0 },

    // =============================================================== ENTRY
    { id: 'entry-bench', def: 'bench-storage-36', at: [28.0, S_FACE_EAST - 0.05 - 1.33 / 2], rot: 180 },
    { id: 'entry-mirror', def: 'mirror-full-length-wall', at: [28.0, 12.45], rot: 0, z: 0.9 },

  ],
  notes: [
    'STANDING DESK: Fully Jarvis 60" x 30" bamboo top (frame travel 24 1/2"-50"), Jarvis dual monitor arm carrying two 27" screens, Jarvis 25" cable tray, under-desk CPU sling, TERTIAL clamp task light, wool-felt mat, Herman Miller Aeron size B. $3,809 of the $6,609 total — the desk is over half this budget and that is the point of the scheme.',
    'DESK ORIENTATION: the top runs east-west on the north wall (x 1\'-10" to 6\'-10"), the user faces north, the screens face SOUTH, and the west glazing is on the user\'s left. Daylight rakes across the work surface and never down the barrel of the panel. A screen facing the glass — or facing away from it with the glass behind the user — is unreadable from about 3pm every day, which is why no layout here does either.',
    'DESK PULL-BACK: the layout reserves the full 2\'-6" (CLEARANCE.deskChair) of clear floor in front of the top. The Aeron is 2\'-3" deep and is drawn PARKED inside that zone, not tucked under the top, so the chair is counted as real floor and the 3" left over is the gap to the walkway. Nothing else stands in the zone.',
    'BED: a queen platform turned side-on with its head to the bathroom partition is the only arrangement in this floor plate that gives a two-sleeper bed a usable aisle on BOTH long sides: 2\'-1" on the north, 2\'-9" on the south before the kitchen work aisle. Head-to-a-north-wall instead leaves 1\'-9" each side, which the checker flags and which is genuinely unpleasant.',
    'GLAZING: nothing over 2\'-6" tall stands within 1\'-0" of the glass. The closest object of any height is the desk top itself, 2\'-6" tall and 1\'-3" off the wall face. The loveseat (2\'-9") faces the window from 5\'-1" back with only a 1\'-5" round coffee table between it and the glass.',
    'SUN CONTROL: top-down/bottom-up cellular shades in each glazing reveal, NOT curtains. A 50" curtain panel needs about 1\'-3" of stack per side and the mullions between these bays are 4" wide, so a curtain either covers glass all day or fouls the furniture. Shades are not in the furniture catalog, so they do not appear in the drawings or in the budget.',
    'TRADE-OFF — no dining table. A plan that carries a 5\'-0" desk, a queen and a loveseat in 448 sq ft has nowhere left for a four-top: you eat at the desk or at the coffee table. Take layout B if sitting down to dinner matters.',
    'TRADE-OFF — no television. The loveseat points at the window because the view is the west wall, and a screen would have to hang exactly where the glare is. Layout C is the one with a TV.',
    'BUILT-INS: the 3\'-6" kitchen work aisle, the 3\'-0" fridge and laundry zones and the 2\'-6" strip in front of the reach-in closets are all held clear, so the oven, the dishwasher, the fridge, the laundry bifold and all four closet doors open on to empty floor.',
    'CIRCULATION: every required route measures 3\'-6" usable — front door to bathroom, to the kitchen sink, to the windows, and bathroom to bed. Two people pass anywhere on the main route without turning sideways.',
    'BUDGET CAVEAT: catalogue prices are furniture only. bed-queen-platform is a FRAME (the catalog source says \'platform frame for US queen\'), so add roughly $800-1,200 for a mattress. Window shades, bedding, cookware and the kitchen itself are outside the $6,609.',
  ],
};

export default layout;
