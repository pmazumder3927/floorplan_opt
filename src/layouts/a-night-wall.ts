/**
 * LAYOUT A — "Night wall"
 *
 * STRATEGY: build the best picture this apartment can physically produce, and
 * accept in exchange that it is an EVENING room. Everything else in the scheme
 * is subordinate to one wall.
 *
 * THE ONE IDEA. The bathroom box's west partition at x = 18'-10 3/8" is the only
 * run of blank wall in the unit long enough for a 100" frame — 9'-10 1/4" of it,
 * y 3'-2 5/8" to 13'-0 7/8" — and it is the DARKEST surface in the plan, because
 * it faces due WEST. Every other candidate wall in this floor plate either has
 * glass in it, has a door in it, or is being raked side-on by 18'-6" of
 * floor-to-ceiling west glazing. So: a 100" ultra-short-throw ALR screen goes
 * flat on that partition, a Hisense PX3-PRO stands on a 14"-tall bespoke plinth
 * underneath it, the congregation sits facing EAST with the glass behind them,
 * and all four glazing bays get blackout cellular shades with side channels.
 *
 * WHY UST AND NOT A STANDARD THROW. There is 10'-4" of floor between the wide
 * leg's north wall and the kitchen aisle, and a 1.21-1.59:1 lens needs 8'-10" to
 * 11'-7" to make a 100" image — the projector would land inside the sofa. The
 * PX3-PRO's 0.22:1 lens needs 1'-7 3/16". That is the whole argument, and it is
 * why the plinth exists: every off-the-shelf media console sourced is 21"-36"
 * tall and a 21" top already puts the image centre at 60" AFF.
 *
 * DESK ORIENTATION — the house rule, from a-window-desk.ts. The glazing faces
 * WEST and takes direct sun from about 3pm to sunset, so a screen may face NORTH
 * or SOUTH but never into or away from that sun. The Jarvis top therefore runs
 * east-west against the wide leg's north wall, the user sits south of it facing
 * north, the panel faces SOUTH, and the glass is on the user's LEFT: daylight
 * rakes across the work surface and never down the barrel of the display.
 *
 * WHAT THIS SCHEME CANNOT DO — stated up front, because a brief that only sells
 * is useless. It cannot show a watchable picture in daylight with the shades up
 * (see the PROJECTION note: 1.9:1 in-room contrast, a grey rectangle). It has no
 * dresser and no wardrobe. It has no coffee table. Its queen has one long side
 * against a wall, which the analyzer flags and which this file accepts on
 * purpose. And the sofa sits 13.7 degrees off the screen's centreline.
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
  W_FACE,
  WINDOW_BAYS,
} from './faces';

// ---------------------------------------------------------------- the picture
// A 100" 16:9 image is 87.157" x 49.032". Every distance below is a multiple of
// the IMAGE width, never the frame width — the VIVIDSTORM frame is 88.4" x 50.2"
// overall, i.e. 1 1/4" bigger than the picture in each direction.
const IMAGE_W = 7.26312; // 87.157" = 100 * 16 / sqrt(16^2 + 9^2)
const IMAGE_H = 4.08583; // 49.032"

// Fixed-frame screen, back flat on the partition. 1 1/2" deep (estimated in the
// catalog entry — Vividstorm publishes no depth), so its centre sits half that
// off the wall face and the FABRIC is the wall face minus the full depth.
const SCREEN_D = 0.125; // 1 1/2"
const SCREEN_X = BATH_W_FACE - SCREEN_D / 2; // 18.8025
const FABRIC_X = BATH_W_FACE - SCREEN_D; // 18.74 — the plane every throw is measured to
// Centred on the 9'-10 1/4" wall: the image lands y 4.516 .. 11.779, leaving
// exactly 1'-3 1/2" of blank wall north of it and 1'-3 1/2" south. That symmetry
// is the whole reason not to order the 120" version, which would leave 4 1/8" —
// inside the traced plan's own +/-3 5/8" tolerance.
const SCREEN_Y = (N_FACE_WIDE + BATH_S_FACE) / 2; // 8.1475

// Image bottom at 28 1/2" AFF = 14" plinth + the UST's own ~14 1/2" rise. The
// spec band is 26"-28", never below 24" or above 32"; 28 1/2" is 1/2" over the
// preferred band and is what a 14" plinth gives you. Image centre lands at 53".
const IMAGE_BOTTOM = 28.5 / 12; // 2.375
// The FRAME sits 0.585" lower than the picture (half of 50.2 - 49.03).
const SCREEN_Z = IMAGE_BOTTOM - (4.18333 - IMAGE_H) / 2; // 2.32625

// ------------------------------------------------------------------- the throw
// PX3-PRO: fixed 0.22:1, cabinet 21.7 x 11.7 x 4.8, lens 10.65" in from the REAR
// face (the face nearest the screen). Throw is measured lens -> fabric.
const PROJ_D = 0.975; // 11.7"
const LENS_OFFSET = 0.8875; // 10.65"
const THROW_D = 0.22 * IMAGE_W; // 1.59789 = 1'-7 3/16"
const REAR_GAP = THROW_D - LENS_OFFSET; // 0.71039 = 8 1/2" from fabric to rear of cabinet
const PROJ_REAR_X = FABRIC_X - REAR_GAP; // 18.02961
const PROJ_X = PROJ_REAR_X - PROJ_D / 2; // 17.54211 — cabinet front lands 20 1/4" off the fabric

// Bespoke plinth, 66 x 24 x 14, flush to the partition. The projector's 11.7"
// body sits wholly on the 24" top with 3 3/4" of reveal in front of it.
const PLINTH_D = 2.0;
const PLINTH_H = 14 / 12; // 1.16667 — the projector's z
const PLINTH_X = BATH_W_FACE - PLINTH_D / 2; // 17.865

// ----------------------------------------------------------------- the sleeper
// GRIMSBU queen, 61" x 80 3/8", frame 21 5/8" tall — the only queen in the
// catalog whose headboard clears the 2'-6" glazing rule outright. Turned side-on
// (rot 270) with the head to the glazing and the north long side against the
// notch's north wall.
const BED_L = 6.697917; // 80 3/8" head-to-foot
const BED_W = 5.083333; // 61" across
// Head 1/2" clear of the analyzer's 1'-0" window band, so nothing of the bed —
// not even a 21 5/8" headboard — counts as standing in front of the glass.
const BED_HEAD_X = GLASS_BAND_E + 0.05; // 1.64 -> foot at 8.338
const BED_CX = BED_HEAD_X + BED_L / 2; // 4.98896
const BED_CY = N_FACE + 0.02 + BED_W / 2; // 3.19167 -> y 0.65 .. 5.73333
const BED_FOOT_S = BED_CY + BED_W / 2; // 5.73333, the south long side

// -------------------------------------------------------------------- the desk
// Jarvis 60 x 30 bamboo, back to the wide leg's north wall, pushed east so the
// 2'-6" pull-back does not sever the walk between the bed and the sofa.
const DESK_W = 5.0; // 60" of top, running east-west
const DESK_D = 2.5; // 30" deep
// East end held 10 3/8" clear of the plinth's west face (x 16.865) so the plinth's
// 2'-0" push-open zone stays walkable; that fixes the top at x 11'-0" .. 16'-0".
const DESK_EAST = 16.0;
const DESK_X = DESK_EAST - DESK_W / 2; // 13.5 -> top runs x 11.00 .. 16.00
const DESK_Y = N_FACE_WIDE + 0.02 + DESK_D / 2; // 4.49 -> y 3.24 .. 5.74
const DESK_BACK = DESK_Y - DESK_D / 2; // 3.24
const DESK_FRONT = DESK_Y + DESK_D / 2; // 5.74
// Aeron PARKED inside the pull-back zone, not tucked under a solid-box desk.
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 6.895 -> y 5.77 .. 8.02

// ------------------------------------------------------------------ the lounge
// Cleon 56" armless, 34" deep, 28" back — armless because the 4" saved on each
// end is the difference between this fitting and not, and 28" because it has to
// stay under the 2'-6" sightline with the glass behind it.
// 56" of seat running north-south, 34" deep, so the front face lands 1'-5" east
// of the centre at x 9.41667 and the back face 1'-5" west of it at x 6.58333.
const SOFA_W = 4.666667; // 56"
// North face set 2'-8 5/8" south of the bed's south side: that gap is BOTH the
// bed's access aisle and the main east-west walk, and it is the single tightest
// dimension in the scheme.
const SOFA_N = BED_FOOT_S + 2.716667; // 8.45
const SOFA_CY = SOFA_N + SOFA_W / 2; // 10.78333 -> y 8.45 .. 13.11667
// 10'-8 7/8" of perpendicular standoff from the fabric; 11'-1 3/8" straight-line
// to the image centre, which subtends 36.2 deg — the THX maximum is 36 deg.
const SOFA_CX = 8.0; // x 6.58333 .. 9.41667

// Overflow: two JÄRRESTAD storage poufs in the second row, west of the sofa.
const POUF_X = 5.5; // x 4.74479 .. 6.25521
const POUF_N_Y = 9.4;
const POUF_S_Y = 11.5;

// Rug: 8x10 flatweave turned so its 10'-0" side runs east-west, from just under
// the sofa's front feet to 1'-8" short of the plinth.
const RUG_X = 10.2; // x 5.20 .. 15.20
const RUG_Y = KITCHEN_AISLE_N - 0.02 - 8.0 / 2; // 9.55 -> y 5.55 .. 13.55

// ------------------------------------------------------------------ the dining
// NORDEN gateleg, drawn FOLDED (2'-7 3/8" x 10 1/4"), back to the glazing wall
// but clear of the 1'-0" band, and two FRÖSVI folding chairs PARKED side by side
// at the south end of the promenade. They face SOUTH, down the open floor toward
// the kitchen aisle, because that is the only direction in which a folding chair
// in this room gets its full 2'-6" of pull-back: pointed west it has 1'-11 1/2"
// before the glass, pointed east it has a pouf 1'-4" away.
const TABLE_D = 0.85; // 10 1/4" folded
const TABLE_BACK_X = GLASS_BAND_E + 0.06; // 1.65
const TABLE_X = TABLE_BACK_X + TABLE_D / 2; // 2.075
const TABLE_Y = 9.2; // y 7.89 .. 10.51
const DINE_CHAIR_Y = 12.6; // y 11.76 .. 13.44, clear of the kitchen aisle line
const DINE_CHAIR_A_X = TABLE_BACK_X + 1.448 / 2; // 2.374 -> x 1.65 .. 3.098
const DINE_CHAIR_B_X = 3.9; // x 3.176 .. 4.624

const layout: Layout = {
  id: 'a-night-wall',
  name: 'A — Night wall',
  description:
    'The recommended scheme: a 100" UST ALR screen on the bathroom partition — the only blank, west-facing wall in the unit — a Hisense PX3-PRO on a 14" plinth, blackout on all four glazing bays, and a queen head-to-the-glazing. The best picture this apartment can make, at the cost of being an evening room.',
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
      note: 'Back flat on the bathroom partition, centred on the 9\'-10 1/4" wall: the picture lands y 4\'-6 1/4" to 11\'-9 3/8" with 1\'-3 1/2" of blank wall each side. Lenticular UST ALR, 0.6 gain, 170 deg viewing angle — the wide angle matters more here than the gain does, because a congregation spreads 8-10 ft wide and the outermost viewer sits about 25 deg off axis.',
    },
    {
      id: 'image',
      def: 'projection-image-100',
      at: [FABRIC_X - 0.004167, SCREEN_Y],
      rot: 90,
      z: IMAGE_BOTTOM,
      label: 'The picture, switched on',
      note: 'Coincident with the fabric plane. Placed because this scheme is meant to be rendered as an EVENING frame — a lit screen in a daylight render would assert something this room cannot do.',
    },
    {
      id: 'plinth',
      def: 'plinth-ust-bespoke-66',
      at: [PLINTH_X, SCREEN_Y],
      rot: 90,
      label: 'Bespoke UST plinth, 66 x 24 x 14',
      note: 'Millwork, not a product: 14" of height is what puts the image bottom at 28 1/2" (plinth top + the UST\'s own ~14 1/2" rise) and the image centre at 53". Flush to the partition, which only works because this unit has NO BASEBOARD — a 3/4" base would push the cabinet 3/4" out and cost about 3 1/2" of image width on a 0.22:1 lens.',
    },
    {
      id: 'projector',
      def: 'projector-ust-hisense-px3-pro',
      at: [PROJ_X, SCREEN_Y],
      rot: 90,
      z: PLINTH_H,
      label: 'Hisense PX3-PRO, 0.22:1, on the plinth',
      note: 'Rear of the cabinet 8 1/2" off the fabric, lens 1\'-7 3/16" off it, which is exactly 0.22 x 87.157". 50 W front-firing Harman Kardon means NO soundbar — there is nowhere to put one that is not in the beam.',
    },

    // ============================================================= BLACKOUT
    // Four bays, sized off WINDOW_BAYS. Blackout is a CO-REQUISITE of the
    // screen, not an accessory: see the PROJECTION note for the arithmetic.
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

    // =============================================================== LOUNGE
    {
      id: 'sofa',
      def: 'sofa-cleon-56-armless',
      at: [SOFA_CX, SOFA_CY],
      rot: 270,
      label: 'Cleon 56" armless, facing east at the screen',
      note: 'Front face 10\'-8 7/8" back from the fabric; 11\'-1 3/8" straight-line to the image centre, subtending 36.2 deg, which is 1/5 of a degree over the THX maximum of 36. 28" back, so it never rises into the view out of the glazing behind it.',
    },
    {
      id: 'pouf-n',
      def: 'pouf-jarrestad-18',
      at: [POUF_X, POUF_N_Y],
      rot: 270,
      label: 'JÄRRESTAD pouf (second row)',
      note: '13\'-4 3/8" from the picture, subtending 30.4 deg — SMPTE reference. A 16 1/2" seat puts an eye near 40" AFF, which is ABOVE the 28 1/2" image bottom, so unlike a floor cushion a pouf may sit BEHIND the sofa.',
    },
    {
      id: 'pouf-s',
      def: 'pouf-jarrestad-18',
      at: [POUF_X, POUF_S_Y],
      rot: 270,
      label: 'JÄRRESTAD pouf (second row)',
      note: '13\'-8 5/8" from the picture, 29.7 deg. Hollow, so it stores the throw it is sitting under; both poufs stack against the partition when nobody is over.',
    },
    {
      id: 'rug-viewing',
      def: 'rug-nordicknots-desert-8x10',
      at: [RUG_X, RUG_Y],
      rot: 90,
      label: 'Nordic Knots Desert 8x10, 7 mm flatweave',
      note: 'Defines the viewing floor: from under the sofa\'s front feet east to 1\'-8" short of the plinth. 7 mm total build — the thinnest rug in the catalog — which is the reason it can run under the parked task chair without rucking, and why it is this rug and not a pile.',
    },
    {
      id: 'lamp-notch',
      def: 'lamp-floor-hektar',
      at: [9.2, 2.4],
      rot: 0,
      note: 'The only floor lamp, deliberately parked in the dead 1\'-6" shoulder east of the bed where it is out of every seat-to-screen sightline. Nothing tall stands in the viewing zone.',
    },
    {
      id: 'plant-screen',
      def: 'plant-medium-40in',
      at: [16.9, 12.3],
      rot: 0,
      note: 'South of the beam. The UST\'s light cone spreads from the lens at x 17\'-1 3/4" out to the full image width; anything inside it casts a hard shadow on the picture, which is why this corner is the only planting position in the room.',
    },

    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-60x30',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Fully Jarvis 60 x 30 bamboo, 3-stage 25 3/4"-51 1/4"',
      note: 'Back to the wide leg\'s north wall, panel facing SOUTH, glazing on the user\'s left. Pushed east to x 11\'-0"..16\'-0" so the chair\'s pull-back does not sever the walk between the bed and the sofa.',
    },
    {
      id: 'desk-arm',
      def: 'monitor-arm-single-jarvis',
      at: [DESK_X, DESK_BACK + 0.25],
      rot: 0,
      note: 'Clamped at the back edge; the panel rides the full 25 1/2" of frame travel with the top.',
    },
    {
      id: 'monitor',
      def: 'monitor-32',
      at: [DESK_X, DESK_BACK + 0.4],
      rot: 0,
      label: '32" 4K panel, facing south',
      note: 'One 32" instead of two 27"s: a single panel is what keeps the head straight when the desk is also the dining table.',
    },
    {
      id: 'desk-tray',
      def: 'cable-tray-jarvis',
      at: [DESK_X, DESK_BACK + 0.5],
      rot: 0,
      note: 'Not optional on a sit-stand desk — every cable has to survive 25 1/2" of daily travel.',
    },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.8, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.9, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.5], rot: 0 },
    {
      id: 'desk-chair',
      def: 'chair-ergonomic-aeron',
      at: [DESK_X, CHAIR_Y],
      rot: 180,
      note: 'Parked, not tucked: the desks in this model are solid boxes with no legroom void, so a tucked chair reads as a collision. 2\'-3" of chair inside the reserved 2\'-6".',
    },

    // =============================================================== SLEEP
    {
      id: 'bed',
      def: 'bed-queen-grimsbu',
      at: [BED_CX, BED_CY],
      rot: 270,
      label: 'GRIMSBU queen, 61" x 80 3/8", frame 21 5/8"',
      note: 'Head to the glazing, 1\'-0 1/2" off the glass so no part of it counts as standing in front of the window; north long side against the notch wall, in from the south. The lowest-headboard queen in the catalog, which is the only reason a real queen can point at this window at all.',
    },
    {
      id: 'bed-ledge',
      def: 'nightstand-floating-walnut',
      at: [2.4, N_FACE + 0.02 + 1.033 / 2],
      rot: 0,
      z: 2.0,
      label: 'Floating walnut ledge, 24" AFF',
      note: 'Wall-hung at the head end at 24", just above the 20" mattress top. There is no floor either side of the head for a nightstand, so the bedside surface has to hang.',
    },
    {
      id: 'bed-shelf',
      def: 'shelf-string-wall-3bay',
      at: [6.0, N_FACE + 0.02 + 0.99 / 2],
      rot: 0,
      z: 2.5,
      label: 'String 3-bay wall shelf, 30" AFF',
      note: 'Runs above the bed\'s north side at 30", clear of the 21 5/8" frame. With no dresser and no wardrobe in this scheme, these three bays plus the 8 1/4" of flat-bin space under the GRIMSBU frame are the only bedroom storage outside the built-in closets.',
    },

    // ============================================================== DINING
    {
      id: 'dining-table',
      def: 'dining-gateleg-norden',
      at: [TABLE_X, TABLE_Y],
      rot: 270,
      label: 'NORDEN gateleg, drawn FOLDED (10 1/4" deep)',
      note: 'Back to the glazing wall but 3/4" clear of the 1\'-0" band, folded to a 10 1/4" console for most of the year and opened east into the 4\'-0" promenade for the rest. Drawn folded because that is how it actually stands, and only the east leaf ever comes up — the west leaf is against the glass.',
    },
    {
      id: 'dining-chair-w',
      def: 'chair-frosvi-folding',
      at: [DINE_CHAIR_A_X, DINE_CHAIR_Y],
      rot: 0,
      label: 'FRÖSVI folding chair, parked',
      note: 'Parked facing south, 1\'-3" clear of the console, with its full 2\'-6" of pull-back down the open promenade. It gets turned to the opened leaf at dinner and folded into the reach-in closet the rest of the time.',
    },
    {
      id: 'dining-chair-e',
      def: 'chair-frosvi-folding',
      at: [DINE_CHAIR_B_X, DINE_CHAIR_Y],
      rot: 0,
      label: 'FRÖSVI folding chair, parked',
    },

    // =============================================================== ENTRY
    {
      id: 'entry-shoe-w',
      def: 'entry-trones-shoe',
      at: [27.05, S_FACE_EAST - 0.02 - 0.594 / 2],
      rot: 180,
      note: 'Wall-hung so the entry keeps its floor. Clear of the 3\'-2" entry door arc, which sweeps west across y 13\'-1 1/2" to 16\'-3 5/8".',
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
    'PROJECTION — WHY THIS WALL. The bathroom box\'s west partition is the only blank run in the unit long enough for a 100" frame (9\'-10 1/4", y 3\'-2 5/8" to 13\'-0 7/8") and the only large surface that faces WEST, i.e. away from the glazing rather than side-on to it. The 88.4" x 50.2" frame sits back flat on it, centred, leaving 1\'-3 1/2" of wall each side. The 120" version of the same screen is 105.8" overall and would leave 4.1" — inside the traced plan\'s own +/-3.6" tolerance — so 100" is the size to order off a drawing and 120" is the size to order only after someone puts a laser on that wall.',
    'PROJECTION — THE THROW, MEASURED. Hisense PX3-PRO, fixed 0.22:1, no lens shift. A 100" 16:9 image is 87.157" wide, so the throw is 0.22 x 87.157" = 19 3/16" from the LENS to the fabric. The lens sits 10.65" in from the cabinet\'s rear face, so the rear of the cabinet stands 8 1/2" off the fabric and the cabinet FRONT lands 20 1/4" off it — wholly on the plinth\'s 24" top, with 3 3/4" of reveal in front. The analyzer\'s throw-distance check has a +/-3" tolerance and this lands inside 1/8". CAVEAT FROM THE CATALOG: the 8 1/2" rear gap is INTERPOLATED from ProjectorCentral\'s published 4.7" @ 80" and 18.1" @ 150" endpoints, not from a Hisense install table. Read Hisense\'s own table before anyone cuts millwork.',
    'PROJECTION — IMAGE HEIGHT. Image bottom at 28 1/2" AFF, centre at 53". That comes from the 14" plinth plus the UST\'s own ~14 1/2" rise for a 100" image, and it is 1/2" over the preferred 26"-28" band (the hard limits are 24" and 32"). This is the entire reason the plinth is bespoke: every off-the-shelf console sourced is 21"-36" tall — BDI Corridor 21", BESTÅ 25 1/4", Burrow Carta 26 1/4", Blu Dot Shale 36" — and a 21" top already puts the image centre at 60" AFF, a foot above a seated eye.',
    'BLACKOUT IS A CO-REQUISITE, NOT AN UPGRADE. This is physics, not taste. At 100" on a 0.6-gain screen a 2,700-lumen projector makes 54 fL of peak white, while a screen face taking only 500 lux of ambient — conservative for a wall 18 ft from an uncurtained full-height west glass wall at midday — sits at 28 fL of BLACK. That is 1.9:1 in-room contrast: a grey rectangle. A 5,000-lumen unit only reaches 3.6:1. So all four bays get blackout cellular shades plus side channels, sized off WINDOW_BAYS at 2\'-8 3/4", 2\'-8 1/4", 2\'-9 1/4" and 3\'-6". An ALR screen does NOT substitute for the shades on this wall, because the wall faces due west — straight down the sightline at the glazing, the one direction a lenticular screen cannot reject.',
    'BLACKOUT — THE UGLY PART, SAID OUT LOUD. The glazing head is 104". SelectBlinds\' per-lift maximum heights are 84" cordless, 84" no-drill and 96" motorised; only the CONTINUOUS CORD LOOP reaches 120". So a shade tall enough for these bays cannot be cordless and cannot be no-drill: it is four cord loops hanging down a floor-to-ceiling glass wall, which is a real aesthetic cost in a minimal scheme and has to be shown to the client before they choose cellular over a roller. Expect a ~1/8" factory deduction per side, i.e. eight visible light halos, which is what the side channels are for — and the channels\' "97-99% of side light blocked" is vendor marketing, not a tested figure.',
    'DESK ORIENTATION AND PULL-BACK. The Jarvis 60 x 30 bamboo top runs east-west on the wide leg\'s north wall, x 11\'-0" to 16\'-0", y 3\'-2 7/8" to 5\'-8 7/8". The user faces NORTH, the 32" panel faces SOUTH, and the west glazing is on the user\'s LEFT — side light across the work surface, never down the barrel of the display. A panel facing the glass, or facing away with the glass behind the user, is unreadable from about 3pm every day. The layout reserves the full 2\'-6" of CLEARANCE.deskChair and the Aeron (2\'-3" deep) is drawn PARKED inside it rather than tucked under a solid-box desk. The sourced real-world minimum for a task chair to roll back and stand is nearer 3\'-0" to 3\'-6": THIS LAYOUT ACHIEVES IT, because there is 7\'-10" of continuous clear floor south of the top before the kitchen aisle and only the first 2\'-3" of it is the parked chair.',
    'DESK POSITION IS DICTATED BY THE PLINTH. The top could not sit further east: the plinth occupies x 16\'-10 3/8" to 18\'-10 3/8" and needs 2\'-0" of clear floor in front of its push-open bays. As drawn the desk clips only 3.5% of that zone (its front corner, over 4 1/8" of depth). Further west and the parked chair severs the walk between the bed and the sofa; further east and the desk stands under the screen.',
    'SEATING DISTANCES, ALL THREE OF THEM. Sofa 11\'-1 3/8" from the image centre (36.2 deg — the THX maximum is 36 deg) and 10\'-8 7/8" of perpendicular standoff from the fabric. North pouf 13\'-4 3/8" (30.4 deg, which is the SMPTE reference). South pouf 13\'-8 5/8" (29.7 deg). The analyzer\'s bounds are 8\'-9 1/4" (45 deg) and 18\'-8 1/4" (22 deg); nothing here is within 2\'-4" of either. Four seats on the picture, plus two folding chairs that are not aimed at it.',
    'TRADE-OFF — THE SOFA IS 13.7 DEG OFF AXIS, AND I AM KEEPING THE SEAT. The conflict is arithmetic: the queen is 5\'-1" across, the sofa 4\'-8", the walkway between them 2\'-8 5/8", and the desk\'s pull-back eats the north end. That is 12\'-6" of the 12\'-11 1/4" available between the notch\'s north wall and the kitchen aisle. It fits, but only by pushing the sofa 2\'-7 5/8" south of the screen\'s centreline, which is 13.7 deg off axis at 11\'-1 3/8". The alternative was to give up the second seat and centre a single armchair — I did not, because a CONGREGATION AREA is one of the four hard requirements and 13.7 deg on a screen published at 170 deg of viewing angle is a geometric non-event. What it does cost is keystone-free symmetry of the room, not of the image: the picture is square on the wall, it is the audience that is offset.',
    'BED AND ITS AISLES — AND THE ONE WARNING THIS LAYOUT ACCEPTS. GRIMSBU queen, 61" x 80 3/8", turned side-on with the head 1\'-0 1/2" off the glazing and the north long side flush to the notch\'s north wall. You get in from the SOUTH, where the aisle measures 2\'-8 5/8" at its tightest (against the sofa\'s back) and 3\'-0" or more down the rest of it. The analyzer flags bed-access, because a mattress 53" or wider is supposed to have 24" on BOTH long sides and this one has a wall on the north. THAT WARNING IS DELIBERATE AND IT IS THE PRICE OF THE SCHEME: pulling the bed 2\'-0" off the notch wall pushes the sofa\'s north face to 9\'-8 3/4", which puts the sofa either into the kitchen aisle or 2\'-0" further off the screen axis, and the walk between bed and sofa drops under 2\'-6". One long side against a wall in a 448 sq ft studio is normal; a severed circulation route is not.',
    'GLAZING RULE. Nothing over 2\'-6" tall comes within 1\'-0" of the glass, and nothing in this layout stands in the analyzer\'s 1\'-0" window band at all. The closest pieces are the bed head at 1\'-0 1/2" (frame 21 5/8", under the limit anyway) and the folded gateleg at 1\'-0 3/4" (2\'-5 1/8"). The two FRÖSVI folding chairs are 2\'-6 3/8" — 3/8" over the rule — and they stand 1\'-0 3/4" and 2\'-7" off the wall face, i.e. 3/4" and 1\'-7" outside the 1\'-0" band, which is the same trade layout C makes and for the same reason: they fold flat into the reach-in closet when nobody is eating. The Cleon sofa is 2\'-4" tall and the queen frame 1\'-9 5/8", so from every seat in the room the glazing reads full height over the furniture.',
    'CIRCULATION, AND WHERE IT IS TIGHTEST. Two numbers carry the plan: the east-west walk between the bed\'s south side and the sofa\'s back is 2\'-8 5/8", and the north-south connector east of the sofa, between the sofa\'s front face and the parked desk chair, is 2\'-11 1/2". Measured end to end, the required trips come out at 3\'-6" front door to bathroom, 3\'-0" front door to kitchen sink, 3\'-0" bathroom to bed, 4\'-0" sink to refrigerator, and 2\'-7" front door to the west windows — that last one is the walk down the promenade past the folded console and the poufs, and it is 1" over the 2\'-6" absolute minimum. The desk chair does sever the north wall walk at x 12\'-4 1/2" to 14\'-7 1/2"; you go round it, which is what the 2\'-11 1/2" connector is for.',
    'BUILT-INS HELD CLEAR. The 3\'-6" kitchen work aisle (nothing south of y 13\'-6 7/8" for x < 17\'-11 3/8"), the 3\'-0" fridge and laundry zones and the 2\'-6" strip in front of the four reach-in closet doors are all clear. The bathroom door\'s 2\'-8" leaf and the 3\'-2" entry door arc are clear. The rug is walkable and stops 1/4" short of the kitchen aisle line.',
    'STORAGE, AND WHAT IS MISSING. There is NO DRESSER and NO WARDROBE in this scheme, and there is no wall left to put one on: the notch north wall is the bed, the wide leg north wall is the desk, the east wall is the screen, and the 10 3/8" between the desk\'s east end and the plinth is a gap, not a wall. What you get instead is the 8\'-0" run of built-in reach-in closets on the south wall of the east leg (four doors), the bathroom linen closet, three bays of String shelf over the bed, the floating walnut ledge, 8 1/4" of flat-bin clearance under the GRIMSBU frame, two push-open bays in the plinth, two wall-hung TRONES at the entry, and two hollow storage poufs. If the client owns more clothes than that holds, take a different layout.',
    'TRADE-OFF — NO COFFEE TABLE. The Cleon needs 1\'-4" of clear floor in front of it to be reachable, and anything put in that band either fails the clearance check or stands in the UST\'s beam. The 66" plinth top is the surface, and its west edge is 7\'-5 3/8" from the sofa\'s front face, which means you stand up to put a glass down. That is a real cost of an armless 34"-deep sofa in a 10\'-4" deep room, and it is the correct trade against losing a seat.',
    'TRADE-OFF — DINING IS A FOLDED GATELEG AND TWO PARKED FOLDING CHAIRS. 2\'-7 3/8" x 10 1/4" folded, back to the glazing wall and 3/4" clear of the 1\'-0" band, opening its east leaf into the promenade. The two FRÖSVI chairs stand parked side by side 1\'-3" south of it, facing SOUTH down the open floor — the only orientation in this room that gives a folding chair its full 2\'-6" of pull-back, since west of them is glass 1\'-11 1/2" away and east of them is a pouf. It seats two properly and four badly, and for most of the year it is a console. A four-top does not exist in a plan carrying a queen, a Jarvis, a 56" sofa and a 66" plinth in 213 sq ft of usable floor. You also eat at the desk, which is why the desk got a single 32" panel instead of two 27"s.',
    'TRADE-OFF — THIS IS AN EVENING ROOM. With the shades up the picture is unwatchable, and no amount of ALR fixes it on a west-facing wall (see BLACKOUT). With the shades down the apartment loses its entire west elevation — the one thing it has. So the room has two states and you choose one: daylight and a view, or a 100" picture. Nothing in the catalog splits the difference. The 550-lumen XGIMI MoGo 4 on a painted wall would be honest for camping trips and is not honest for a congregation area.',
    'ACOUSTICS AND HEAT, BRIEFLY. The soffit is exposed structural concrete and the floor is dark LVP, so the room will ring; the 8x10 wool/jute flatweave and the blackout cellular stacks are the only absorption in the scheme and it is not enough for a cinema — budget a fabric panel or two, off catalog. The PX3-PRO measures 39.1 dBA at 3 ft with no published rating, and at 11\'-1 3/8" that is audible in quiet passages. CEILING MOUNTING IS NOT AN OPTION and no layout here draws one: the soffit needs a GPR scan, masonry anchors and a silica vacuum, there is no power in it, and the glazing head leaves 4" of concrete above the glass.',
    'BUDGET. $15,562 of catalogue total, and the shape of it is the argument: $6,648 of that is the cinema (PX3-PRO $2,799, VIVIDSTORM 100" UST ALR $1,439, plinth $650, four blackout shades $1,280, four sets of side channels $480) and $4,658 is the desk kit (Jarvis 60 x 30 $1,325, Aeron $2,150, 32" panel $799, single arm $175, CPU sling $99, felt mat $95, clamp light $15, cable tray included). Those two line items are 73% of the total and the whole bed costs $79. That is deliberate: the projector wall and the desk are the two hard requirements this apartment has to be built around, and the GRIMSBU is what pays for them.',
    'BUDGET CAVEAT. Catalogue prices are furniture and AV only, and three of the biggest lines are estimates rather than quotations. The $650 plinth is a JOINERY ALLOWANCE for a veneered slab carcass, not a cabinetmaker\'s number. The $320 per blackout shade is a configured-size ESTIMATE — the only verified figure is SelectBlinds\' $161.99 starting price, and at 104" of drop the real number will be materially higher — and the $120 per bay of side channels is an estimate with no published price behind it. The GRIMSBU line is a FRAME ONLY at roughly $79 (IKEA US art. 90508513): the slatted base is a separate purchase and so is the mattress, so add $700-1,200. Bedding, cookware, the fabric absorption above and the kitchen itself are all outside the total. The Cleon does not knock down and ships freight — measure the angled front door, the corridor turn and the lift car before ordering it.',
  ],
};

export default layout;
