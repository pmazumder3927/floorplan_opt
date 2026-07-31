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
 * DESK ORIENTATION — the house rule, written out in full in faces.ts. The glazing faces
 * WEST and takes direct sun from about 3pm to sunset, so a screen may face NORTH
 * or SOUTH but never into or away from that sun. The desk top therefore runs
 * east-west against the wide leg's north wall, the user sits south of it facing
 * north, the panel faces SOUTH, and the glass is on the user's LEFT: daylight
 * rakes across the work surface and never down the barrel of the display.
 *
 * THE DESK ITSELF, REVISED 31 Jul 2026. It is a Secretlab MAGNUS Pro, 59.1 x
 * 27.6, matte dark metal, and it replaces a bamboo Jarvis 60 x 30. The client
 * owns a dark desk and asked whether that was a problem; it is not, and the
 * reasoning is in the item note. Short version: this room has raking west sun
 * across the work surface AND a projected image whose in-room contrast is
 * already only 1.9:1, and a large pale desktop is the wrong answer to both. The
 * geometry is a straight gain — 0.9" narrower and 2.4" shallower than the
 * Jarvis, and $526 cheaper. THE CATCH IS ELSEWHERE IN THE PROJECT, NOT HERE:
 * MAGNUS Pro is made in 59.1" and 70" only, and layouts B and D specify 48"
 * tops on purpose. See the catalog entry.
 *
 * THE SLEEPING END, REVISED TWICE. It was originally where this scheme saved
 * money — a $79 white steel GRIMSBU under a wall-hung String shelf — and it
 * rendered exactly like that. The first revision made it an Awara bamboo queen.
 * THE SECOND REVISION, 31 Jul 2026, IS THE ONE THIS FILE NOW DRAWS: the client
 * did not like the japandi joinery, so the frame is an Article Basi in WHITE OAK
 * — a plain slab floating over a 6" shadow gap on inset legs, which is a
 * different object at a similar tone rather than a different tone. It is 0.9"
 * narrower and 0.9" shorter than the Awara and BOTH of those go back into the
 * tightest aisle in the apartment, and it is $369 cheaper. It costs one real
 * thing: 6" of under-frame clearance instead of 8.3", which halves the size of
 * the boxes that are this scheme's entire substitute for a dresser. The rest of
 * the alcove is unchanged — oat linen with a terracotta bed cover, a TONSTAD
 * nightstand standing in the aisle, a cordless Flos Bellhop on it. See the
 * SLEEPING ALCOVE / COLOUR / STORAGE notes at the bottom of this file.
 *
 * THE ONE MEASUREMENT THIS FILE IS WAITING ON. Article publishes the Basi at 12"
 * overall with 6" of clearance and nothing in between, and its assembly manual
 * draws the slats recessed inside the rail without dimensioning them. The ~10"
 * deck — and therefore the 20" sleeping surface, and therefore whether the
 * TONSTAD is still the right nightstand — is INFERRED, with about +/-2" on it.
 * Measure the deck before buying anything else for this corner.
 *
 * WHAT THIS SCHEME CANNOT DO — stated up front, because a brief that only sells
 * is useless. It cannot show a watchable picture in daylight with the shades up
 * (see the PROJECTION note: 1.9:1 in-room contrast, a grey rectangle). It has no
 * dresser and no wardrobe. It has no coffee table. Its queen has one long side
 * against a wall, which the analyzer flags and which this file accepts on
 * purpose. And the sofa sits 14.5 degrees off the screen's centreline.
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
// Article Basi queen, 63" x 83", 12" rail, NO HEADBOARD and no footboard — the
// parts list calls two of the rails "headboard" and "footboard" but all four
// stand 12", so the tallest thing on it is a pillow at about 24". Turned
// side-on (rot 270) with the head to the glazing and the north long side
// against the notch's north wall. See the SLEEPING ALCOVE note for why this
// frame and not the Awara bamboo it replaces.
const BED_L = 6.916667; // 83" head-to-foot
const BED_W = 5.25; // 63" across
// Head 1/2" clear of the analyzer's 1'-0" window band, so no part of the bed —
// mattress, pillow or frame — counts as standing in front of the glass.
const BED_HEAD_X = GLASS_BAND_E + 0.05; // 1.64 -> foot at 8.55667
const BED_FOOT_X = BED_HEAD_X + BED_L; // 8.55667
const BED_CX = BED_HEAD_X + BED_L / 2; // 5.09833
const BED_CY = N_FACE + 0.02 + BED_W / 2; // 3.275 -> y 0.65 .. 5.90
const BED_FOOT_S = BED_CY + BED_W / 2; // 5.90, the south long side
// Sleeping surface: an INFERRED ~10" deck + a 10" hybrid mattress. Article
// publishes 12" overall and 6" of clearance and NOTHING in between, and the
// assembly manual draws the slats recessed inside the rail without dimensioning
// them — so this number carries about +/-2" and is the single measurement to
// take before buying anything else for this alcove. Everything that sits ON the
// bed (the folded bed cover) is placed at this z.
const MATTRESS_TOP = 20 / 12; // 1.66667

// The bedside, and the reason it is where it is. There is no floor at the head
// of this bed on the north (wall) or the west (glass), so the ONLY bedside
// position in the plan is the south-west corner of the mattress, standing in
// the aisle. A 15 3/4" square is the largest object that can do that without
// closing the walk — see the BEDSIDE note.
const NIGHT_SQ = 1.3125; // 15 3/4"
const NIGHT_X = BED_HEAD_X + NIGHT_SQ / 2; // 2.29625 -> x 1.64 .. 2.9525
const NIGHT_Y = BED_FOOT_S + 0.04 + NIGHT_SQ / 2; // 6.59625 -> y 5.94 .. 7.2525

// -------------------------------------------------------------------- the desk
// Secretlab MAGNUS Pro 59.1 x 27.6, back to the wide leg's north wall, pushed
// east so the 2'-6" pull-back does not sever the walk between the bed and the
// sofa. It replaces a Jarvis 60 x 30: 0.9" narrower and 2.4" shallower, and
// BOTH of those go somewhere useful — see the CIRCULATION note.
const DESK_W = 4.925; // 59.1" of top, running east-west
const DESK_D = 2.3; // 27.6" deep
// East end held 10 3/8" clear of the plinth's west face (x 16.865) so the plinth's
// 2'-0" push-open zone stays walkable; that fixes the top at x 11'-0" .. 16'-0".
const DESK_EAST = 16.0;
const DESK_X = DESK_EAST - DESK_W / 2; // 13.5375 -> top runs x 11.075 .. 16.00
const DESK_Y = N_FACE_WIDE + 0.02 + DESK_D / 2; // 4.39 -> y 3.24 .. 5.54
const DESK_BACK = DESK_Y - DESK_D / 2; // 3.24
const DESK_FRONT = DESK_Y + DESK_D / 2; // 5.54
// Aeron PARKED inside the pull-back zone, not tucked under a solid-box desk.
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 6.695 -> y 5.57 .. 7.82

// ------------------------------------------------------------------ the lounge
// Cleon 56" armless, 34" deep, 28" back — armless because the 4" saved on each
// end is the difference between this fitting and not, and 28" because it has to
// stay under the 2'-6" sightline with the glass behind it.
// 56" of seat running north-south, 34" deep, so the front face lands 1'-5" east
// of the centre at x 9.41667 and the back face 1'-5" west of it at x 6.58333.
const SOFA_W = 4.666667; // 56"
// THE SOFA IS HELD, AND THE AISLE TAKES THE GAIN. Every distance from here to
// the screen — the 10'-8 7/8" standoff, the 36.2 deg subtended angle, the 14.5
// deg off-axis — is measured off this line, so moving the sofa to chase the
// narrower bed would cost a page of re-derived geometry to buy nothing. Instead
// the Basi's 0.9" of saved width goes straight into the aisle behind it, which
// is the single tightest dimension in the scheme: 2'-7 1/2" becomes 2'-8 3/8".
// It was 2'-8 5/8" before the Awara widened it and this very nearly restores it.
const SOFA_N = 8.6;
/** The bed's access aisle AND the main east-west walk: 8.6 - 5.90 = 2'-8 3/8". */
const BED_AISLE = SOFA_N - BED_FOOT_S; // 2.70
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
      def: 'rug-nordicknots-zero-warmgray-8x10',
      at: [RUG_X, RUG_Y],
      rot: 90,
      label: 'Nordic Knots Zero 8x10, undyed wool, 7 mm flatweave',
      note: 'Defines the viewing floor: from under the sofa\'s front feet east to 1\'-8" short of the plinth. 7 mm total build — the thinnest rug in the catalog — which is the reason it can run under the parked task chair without rucking, and why it is this rug and not a pile. IT REPLACED THE DESERT IN EARTH AND THE ARGUMENT WAS AESTHETIC: the Desert is the floor\'s own hue one value up, so the viewing floor was brown on brown and the rug was the least interesting decision in the room. Undyed wool at 31% LRV is the only soft surface in the scheme between the sofa\'s 4% and the bed\'s 56%, and it is the first thing at eye level that the cool concrete soffit has anything in common with. Same maker, same 7 mm, same $395 — nothing in the plan moved.',
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
      def: 'desk-standing-magnus-pro',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Secretlab MAGNUS Pro 59.1 x 27.6, sit-stand 25 5/8"-49 1/4"',
      note: 'Back to the wide leg\'s north wall, panel facing SOUTH, glazing on the user\'s left. Pushed east to x 11\'-0 7/8"..16\'-0" so the chair\'s pull-back does not sever the walk between the bed and the sofa. IT IS DARK ON PURPOSE AND THAT IS AN ARGUMENT ABOUT THIS ROOM, NOT A PREFERENCE. Two reasons, both independent of taste. (1) The user sits with 18\'-6" of west glazing on their left taking direct sun from about 3pm; a matte dark top does not bounce that sun up under the monitor, and a white top — a 11.3 sq ft high-reflectance plane — does. (2) This room contains a projected image whose in-room contrast is already conceded at 1.9:1 with the shades up, and every large pale surface in it bounces projector light back at the screen. Dark helps that number; white makes the scheme\'s worst number worse. The bamboo top this replaces was the middle of the three. Its integrated cable tray and power column also delete the separate Jarvis tray line.',
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
    // NO SEPARATE CABLE TRAY LINE. A sit-stand desk has to carry every cable
    // through 23 5/8" of daily travel and that is not optional — but the MAGNUS
    // Pro has the tray, the magnetic routing and a mains socket built into the
    // frame, so budgeting a tray on top of it would be paying twice for one
    // object. The Jarvis layouts still draw theirs.
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
    //
    // NOTHING IN THIS GROUP IS FIXED TO A WALL. The previous version of this
    // scheme hung a floating ledge and a 5'-9 3/8" String shelf over the bed;
    // both are gone. Everything below stands on the floor, sits on the bed, or
    // lives in the 6" of clearance under the frame — and that 6", down from the
    // Awara's 8.3", is the real price of this frame. See the STORAGE note.
    {
      id: 'bed',
      def: 'bed-queen-basi-white-oak',
      at: [BED_CX, BED_CY],
      rot: 270,
      label: 'Article Basi queen, white oak, 63" x 83", 12" rail, no headboard',
      note: 'Head to the glazing, 1\'-0 1/2" off the glass, north long side against the notch wall, in from the south. NO HEADBOARD is the point rather than an omission: the head of this bed is a floor-to-ceiling window, and every headboard sourced breaks the 2\'-6" glazing rule. The parts list calls two of the four rails "headboard" and "footboard", but all four stand 12", so there is nothing here to break it. Made up, the tallest thing is a pillow at about 2\'-0" — 6" under the rule where the Awara had 4". WHY THIS FRAME: it is a plain slab floating over a 6" shadow gap on inset legs, which is a different object from the Awara\'s visible interlocking joinery, and on an ESPRESSO floor a pale slab over a dark gap is the strongest reading of "floating" available — which is why white oak and not the walnut this frame also comes in. Walnut sits at nearly the same value as the floor planks and the slab, the gap and the floor would merge into one dark mass.',
    },
    {
      id: 'bed-cover',
      def: 'bedcover-linen-terracotta-queen',
      at: [BED_FOOT_X - 0.16 - 26 / 24, BED_CY],
      rot: 270,
      z: MATTRESS_TOP,
      label: 'Vintage-wash linen bed cover, terracotta — folded across the foot',
      note: 'Drawn where it actually lies: turned back and folded over the last 2\'-2" of the mattress, 1 1/2" in from the foot rail. It is the ONLY colour in the alcove and it is the piece that makes oat linen on pale white oak read as a made bed rather than as a showroom.',
    },
    {
      id: 'bed-nightstand',
      def: 'nightstand-tonstad',
      at: [NIGHT_X, NIGHT_Y],
      rot: 0,
      label: 'TONSTAD nightstand, oak veneer, 15 3/4" square',
      note: 'Stands on the floor at the south-west corner of the mattress — the only bedside position this plan has, since the head has glass on one side and a wall on the other. THIS PIECE IS NOW THE WEAKEST THING IN THE ALCOVE AND THE FILE SHOULD SAY SO. Against the Awara it stood 1 1/4" over the mattress, which is exactly where a bedside surface wants to be; against the Basi\'s inferred 20" sleeping surface its 23 1/4" top stands 3 1/4" PROUD, which is high enough to read as a side table parked next to a bed rather than as a nightstand. It is usable and it is not right. Two ways out, and both wait on the same measurement: if the Basi\'s deck measures nearer 11 1/2" than the inferred 10", the surface comes back to 21 1/2" and the gap drops to 1 3/4", which is fine — so MEASURE THE DECK FIRST. If it really is 20", swap this for a 21"-22" stand. It also used to be the only oak in the scheme, which was the point of it; the bed is now white oak, so that argument is gone and what keeps the two apart is value rather than species — TONSTAD is a warmer, browner brushed oak and the Basi is paler and cooler. If they read as a matching set in the render, change this piece, not the bed.',
    },
    {
      id: 'bed-lamp',
      def: 'lamp-bellhop-portable',
      at: [NIGHT_X, NIGHT_Y],
      rot: 0,
      z: 23.25 / 12,
      label: 'Flos Bellhop Unplugged, on the nightstand',
      note: 'CORDLESS, and that is why it is here rather than a ceramic lamp: there is no outlet at a glazed wall in the traced plan, and a cord to this corner would cross the tightest walkway in the apartment. It is also the only light left in the scheme that is not a ceiling downlight or a desk clamp: 8 1/4" of lamp on a 23 1/4" nightstand tops out at 31 1/2", which is west of every seat and out of every ray — where a floor lamp tall enough to be useful is not, and that is exactly what the old scheme got wrong.',
    },
    // UNDER-BED STORAGE, AND THE ONE PLACE THIS FRAME COSTS MORE THAN IT SAVES.
    // Under-bed volume is this scheme's entire answer to having no dresser. The
    // Awara's 8.3" of clearance swallowed a 7 1/2" SKUBB at 90 litres a case;
    // the Basi's 6" does not, so the boxes drop to 4 1/2" and 45 litres — HALF
    // the box. Four are drawn instead of three, which recovers some of it but
    // not all: 180 litres against 362. Six would fit the bare footprint, but the
    // Basi has a centre rail on three centre legs running the length of the bed,
    // so the middle run is interrupted and four is the honest number.
    ...[0, 1, 2, 3].map((i) => ({
      id: `bed-storage-${i + 1}`,
      def: 'storage-lowprofile-underbed-45l',
      at: [BED_HEAD_X + 1.0 + i * 1.5, BED_CY] as [number, number],
      rot: 270,
      label: 'Low-profile case under the bed, 33 x 17 x 4 1/2',
    })),
    {
      id: 'bed-plant',
      def: 'plant-sansevieria-24',
      at: [9.28, 1.72],
      rot: 0,
      label: 'SANSEVIERIA, 8" pot — the notch shoulder',
      note: 'The 1\'-4 1/2" of floor between the foot of the bed and the step in the north wall — 7/8" more than the Awara left, because this frame is 0.9" shorter. THIS IS THE SPOT THE FLOOR LAMP USED TO STAND IN, and swapping a 5\'-11 1/4" lamp for a 23 1/2" plant is worth 33.8% of the picture from the bed (measured — pnpm sightline). A sansevieria is also the one plant here that survives a west window behind blackout shades.',
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
    'DESK ORIENTATION AND PULL-BACK. The MAGNUS Pro 59.1 x 27.6 top runs east-west on the wide leg\'s north wall, x 11\'-0 7/8" to 16\'-0", y 3\'-2 7/8" to 5\'-6 1/2". IT IS A DARK MATTE METAL TOP AND THAT IS AN ARGUMENT ABOUT THIS ROOM RATHER THAN A PREFERENCE: the user sits with raking west sun across the surface from about 3pm, and the same room holds a projected image already conceded at 1.9:1 in-room contrast. A large pale desktop is the wrong answer to both — it bounces sun up under the monitor and it bounces projector light back at the screen. The bamboo Jarvis this replaces was the middle of the three; white would have been the worst. The user faces NORTH, the 32" panel faces SOUTH, and the west glazing is on the user\'s LEFT — side light across the work surface, never down the barrel of the display. A panel facing the glass, or facing away with the glass behind the user, is unreadable from about 3pm every day. The layout reserves the full 2\'-6" of CLEARANCE.deskChair and the Aeron (2\'-3" deep) is drawn PARKED inside it rather than tucked under a solid-box desk. The sourced real-world minimum for a task chair to roll back and stand is nearer 3\'-0" to 3\'-6": THIS LAYOUT ACHIEVES IT, because there is 7\'-10" of continuous clear floor south of the top before the kitchen aisle and only the first 2\'-3" of it is the parked chair.',
    'DESK POSITION IS DICTATED BY THE PLINTH. The top could not sit further east: the plinth occupies x 16\'-10 3/8" to 18\'-10 3/8" and needs 2\'-0" of clear floor in front of its push-open bays. As drawn the desk clips only 1.5% of that zone (its front corner, over 1 11/16" of depth) — down from 3.5% and 4 1/8" on the 30"-deep Jarvis, because the MAGNUS is 2.4" shallower. Further west and the parked chair severs the walk between the bed and the sofa; further east and the desk stands under the screen.',
    'SEATING DISTANCES, ALL THREE OF THEM. Sofa 11\'-1 1/8" from the image centre (36.2 deg — the THX maximum is 36 deg) and 10\'-8 7/8" of perpendicular standoff from the fabric at the seat centre. North pouf 13\'-4 3/8" (30.4 deg, which is the SMPTE reference). South pouf 13\'-8 5/8" (29.7 deg). The analyzer\'s bounds are 8\'-9 1/4" (45 deg) and 18\'-8 1/4" (22 deg); nothing here is within 2\'-4" of either. Four seats on the picture, plus two folding chairs that are not aimed at it.',
    'TRADE-OFF — THE SOFA IS 14.5 DEG OFF AXIS, AND I AM KEEPING THE SEAT. The conflict is arithmetic: the queen is 5\'-3" across, the sofa 4\'-8", the walkway between them 2\'-8 3/8". That is 12\'-7 3/8" of the 12\'-11 1/4" available between the notch\'s north wall and the kitchen aisle, and the 3 5/8" left over is the whole margin. It fits, but only by pushing the sofa 2\'-9 3/8" south of the screen\'s centreline, which is 14.5 deg off axis at 11\'-1 1/8". BED WIDTH IS WHAT PAID FOR THAT: the frame is 2" wider than the GRIMSBU the scheme started with, and in this plate bed width converts directly into off-axis angle. The Basi gave 0.9" of it back — and the sofa did NOT move to collect it, because every distance to the screen is measured off the sofa line and re-deriving them to buy 0.9" would be a bad trade. The aisle took it instead. The alternative was to give up the second seat and centre a single armchair — I did not, because a CONGREGATION AREA is one of the four hard requirements and 14.5 deg on a screen published at 170 deg of viewing angle is a geometric non-event. What it does cost is keystone-free symmetry of the room, not of the image: the picture is square on the wall, it is the audience that is offset.',
    'BED AND ITS AISLES — AND THE ONE WARNING THIS LAYOUT ACCEPTS. Article Basi queen in white oak, 63" x 83", turned side-on with the head 1\'-0 1/2" off the glazing and the north long side flush to the notch\'s north wall. You get in from the SOUTH, where the aisle measures 2\'-8 3/8" at its tightest (against the sofa\'s back) and 3\'-0" or more down the rest of it — 7/8" better than the Awara allowed, and very nearly back to the 2\'-8 5/8" this scheme had before it ever specified a designed bed. The analyzer flags bed-access, because a mattress 53" or wider is supposed to have 24" on BOTH long sides and this one has a wall on the north. THAT WARNING IS DELIBERATE AND IT IS THE PRICE OF THE SCHEME: pulling the bed 2\'-0" off the notch wall pushes the sofa\'s north face to 9\'-11 3/4", which puts the sofa either into the kitchen aisle or 2\'-0" further off the screen axis, and the walk between bed and sofa drops under 2\'-6". One long side against a wall in a 448 sq ft studio is normal; a severed circulation route is not.',
    'THE SLEEPING ALCOVE, AND WHY IT IS BUILT THE WAY IT IS. The first version of this scheme spent $79 on the bed — a white powder-coated GRIMSBU — and hung the rest of the bedroom on the wall: a floating walnut ledge at 24" and a 5\'-9 3/8" String shelf at 30". Path-traced, that reads exactly as what it is, a white slab under two brackets, and it also required drilling a rented wall in three places. THE REVISED ALCOVE FIXES BOTH, AND EVERY PIECE IN IT STANDS ON THE FLOOR, SITS ON THE BED, OR LIVES UNDER IT. (1) The frame is an Article Basi queen in WHITE OAK, $399, 12" tall, no headboard — a plain slab floating over a 6" shadow gap on inset legs. IT REPLACED AN AWARA BAMBOO QUEEN AT $768 AND THE REASON WAS AESTHETIC, SAID PLAINLY: the client did not want visible japandi joinery. What matters is that the answer was a different FORM at a similar TONE rather than a different tone — the floor here is espresso, and a pale slab over a dark gap is the strongest reading of "floating" this room can produce. The same frame in walnut would sit at almost the same value as the floor planks and the slab, the gap and the floor would merge into one dark mass. It is also 0.9" narrower and 0.9" shorter than the Awara, and in this plan both of those come straight back into the tightest aisle in the apartment. (2) The head of the bed is a WINDOW, so there is no headboard at all and there cannot be: every headboard sourced for every frame here breaks the rule. The Basi\'s parts list calls two of its four rails "headboard" and "footboard" but all four stand 12", so there is nothing to break it. Made up, the tallest thing on the bed is a pillow at about 2\'-0", i.e. 6" under the glazing rule where the Awara had 4", so from the sofa the west glass reads full height straight over the bed. (3) The bedside is a TONSTAD oak nightstand standing in the aisle at the south-west corner of the mattress, because the head has glass on one side and a wall on the other and that corner is the only bedside position this plan owns. It is 15 3/4" square, and the analyzer confirms it costs the walk NOTHING — the route widths are identical with it in and with it out. (4) On it stands a Flos Bellhop, which is CORDLESS: there is no outlet at a glazed wall and a cord to that corner would cross the tightest walkway in the apartment. (5) Storage moved under the bed, AND THIS IS THE ONE PLACE THE NEW FRAME IS WORSE. The Awara gave 8.3" of clearance and swallowed 7 1/2" SKUBB cases at 90 litres each; the Basi gives 6", which a SKUBB does not fit, so the boxes drop to 4 1/2" and 45 litres — half the box. Four are drawn instead of three and that recovers some of it: 180 litres against 362. It is still a real loss, and in a scheme with NO DRESSER AND NO WARDROBE it is the loss that matters most. Read honestly: the under-bed store went from about a three-drawer chest of folded clothes to about a drawer and a half. That is what $369 and 0.9" of aisle actually cost.',
    'WHY THE BED IS NOT TURNED 90 DEG — ASKED, BUILT, MEASURED, REJECTED. The obvious move is to put the head against the notch\'s NORTH wall with the foot pointing south, which would buy three real things: both long sides accessible (the bed-access warning above disappears), a solid wall behind the pillows so a proper headboard becomes legal — the Basi takes Article\'s Rolph at $699 — and a matching nightstand on each side. IT WAS DRAWN AS A LAYOUT AND RUN THROUGH pnpm check, TWICE (bed centred with 2\'-0" each side, and bed shoved west with 1\'-0"), AND BOTH FAILED THE SAME WAY: the required routes collapse to 1\'-3" and 1\'-6" against a 2\'-6" absolute minimum, i.e. two tight-path warnings instead of one bed-access warning. ONE HALF OF THAT ARGUMENT EXPIRED ON 31 Jul 2026 AND THE FILE HAS TO SAY SO. It used to add that the bed-access warning would not even go away, because the notch is 9\'-4 1/8" wide and the 5\'-3 7/8" Awara left 4\'-0 1/8" to split — 1\'-11" a side against a 2\'-0" requirement, one inch short on both sides at once. THE BASI IS 5\'-3", which leaves 4\'-1 1/8" to split, i.e. 2\'-0 9/16" a side. That CLEARS. So a rotated bed would now pass bed-access, and the only thing still rejecting it is circulation. THE ARITHMETIC THAT DOES STILL REJECT IT is one line. Between the notch\'s north wall and the kitchen aisle there is 12\'-11 1/4" of depth. Side-on the bed spends 5\'-3" of it, which leaves 2\'-6" of walk and a 4\'-8" sofa with 6 1/4" to spare. Turned 90 deg it spends 6\'-11" — 1\'-8" more — and the same walk and the same sofa now need 14\'-1" of a 12\'-11 1/4" room. IT IS SHORT BY 1\'-1 3/4", so the sofa\'s back and the bed\'s foot end up about 1\'-4" apart and that gap becomes the only east-west route in the apartment. Turning the bed does not cost circulation, it costs THE CONGREGATION AREA, which is one of the four hard requirements. Two schemes in this repo do take that trade deliberately and neither of them does it by rotating a bed into a walkway: layout C makes the bed the back ROW of the seating (no aisle needed between them because the bed IS a seat), and layout E puts the queen on the wall so the floor is empty. If the client wants a headboard and two nightstands, the answer is C or E, not a rotation of A.',
    'THE ALCOVE ALSO BOUGHT BACK 30% OF THE PICTURE, WHICH WAS NOT THE POINT BUT IS THE BEST PART. The old scheme parked a 5\'-11 1/4" HEKTAR floor lamp in the dead shoulder east of the bed and the note claimed it was "out of every seat-to-screen sightline". IT WAS NOT: pnpm sightline casts 5 eye points per seat at 169 points on the image, and from the bed that lamp ate 33.8% of the picture — the bed could see 52.2% of what it was pointed at. A 23 1/2" sansevieria now stands in the same shoulder and blocks nothing, because 23 1/2" is below the 28 1/2" image bottom and therefore mathematically incapable of crossing any ray. The bed now sees 80.5% and the sofa 93.8%, and those two moved in OPPOSITE directions in the 31 Jul 2026 revision — 81.9% to 80.5% for the bed, 92.0% to 93.8% for the sofa. Both have the same cause and it is worth writing down, because it is the kind of thing that is invisible until it is measured. The MAGNUS is 2.4" shallower than the Jarvis, so the parked Aeron sits 2.4" further north and drops out of the sofa\'s rays: the sofa gains 1.8 points. But the Basi\'s sleeping surface is about 2" LOWER than the Awara\'s, so the eye on the bed is 2" lower, and a lower eye sees more of the chair against the picture: the bed loses 1.4 points. A cheaper, lower bed is very slightly worse at being a seat, and the layout accepts that because the bed is the fourth-best seat in the room and the sofa is the first. WHAT STILL BLOCKS: the parked Aeron, 19.5% from the bed and 4.7% from the sofa, and that one is structural to this layout rather than fixable in it — see layout E, which was drawn around exactly this problem. The sansevieria costs the sofa 1.4% and the poufs 1.1-1.8%, which is the price of the only planting position in the room. This scheme now has NO FLOOR LAMP anywhere, on purpose: any lamp tall enough to be useful in the viewing zone is tall enough to stand in the picture.',
    'COLOUR — ONE SCHEME, STATED ONCE. The room is fixed by things nobody chose: an espresso wide-plank floor, flat white walls, a bare concrete soffit and BLACK anodised window frames, which are the only true black in the apartment. Against that, this layout runs two warm neutrals and exactly one accent. BAMBOO HAS LEFT THIS SCHEME ENTIRELY, and that happened by two separate decisions arriving at once: the bed went from an Awara bamboo frame to a white-oak Basi, and the desk went from a bamboo Jarvis top to a dark metal MAGNUS. The result is simpler than what it replaced rather than a compromise — the wood family is now two pale oaks and nothing else, and the desk moves out of the wood family into the equipment family where its colour is doing a job (see DESK ORIENTATION). THE NEUTRALS: pale white oak (bed frame) and brushed oak (nightstand) for wood — kept apart by VALUE, since they are now the same species, the Basi being paler and cooler and the TONSTAD warmer and browner; oat linen for the bed — Quince European Linen sheets in Oat with the duvet cover set in Sand, so the bed has two values in it instead of one flat white, which is what stops a white-bedded room from reading as a hotel. THE ONE GREY, AND IT IS THE MOST DELIBERATE THING IN THE ROOM: the rug is a Nordic Knots Zero in undyed Warm Gray, 31% LRV. It replaced a Desert in Earth at 22%, and the reason is worth writing down because the Desert was not wrong so much as inert — it is the floor\'s own hue one value up, so the viewing floor was brown on brown, and the rug was the least interesting decision in the apartment. The grey does three things nothing else was doing. It puts a MID-TONE into the soft goods, which ran 56% (bed, linen) or under 4% (sofa, poufs) and had nothing in between but a 15 3/4" nightstand — that hole is why the room would otherwise photograph graphic rather than calm. It gives the exposed concrete soffit a partner at eye level, so the slab reads as a material somebody chose instead of leftover construction; everything else in the scheme is warm, and the ceiling measures cool (finishes.ts puts B-R at +22). And it is MATERIAL rather than COLOUR — undyed wool, the shade is the fleece — which is the register the floor, the slab and the anodised frames are already in. WARM grey, not blue-grey: R-B is +18. THE ACCENT: terracotta, and it now appears TWICE, both of them in the sleeping alcove — the vintage-wash linen bed cover folded across the foot, and the pot the sansevieria stands in. It used to appear three times, counting the Desert rug as "the same family a half-tone darker", which was always a stretch: at 16% LRV terracotta sits inside the floor\'s own 10-14% band and its own hue family, so it separates by almost nothing and a third appearance only spread it thinner. The 40" floor plant by the screen took a concrete pot instead, which keeps the viewing zone strictly neutral and concentrates the accent where the bed is. THE DARKS ARE THE EQUIPMENT: charcoal Cleon, near-black poufs, the dark metal MAGNUS top, the UST plinth in dark stained ash rather than the walnut it used to be — a projector cabinet is equipment, and as walnut it was a fourth wood value in a 448 sq ft apartment — the black screen frame and the black window frames all belong to the same family and read as one thing. The desk is the newest member of it and the most useful — a dark top is the only large horizontal surface in this room that is not working against the projected image. WHAT IS DELIBERATELY ABSENT: grey-blue anything (it fights the warm floor), a second accent colour, and a white bed. Sheets are a design decision in a studio, not a utility purchase — the bed is in every sightline in the apartment, which is the whole reason the brief for this room is different from the brief for a bedroom.',
    'GLAZING RULE. Nothing over 2\'-6" tall comes within 1\'-0" of the glass, and nothing in this layout stands in the analyzer\'s 1\'-0" window band at all. The closest pieces are the bed head at 1\'-0 1/2" (2\'-0" made up, pillows included — 6" under the limit), the nightstand at 1\'-0 1/2" (1\'-11 1/4") and the folded gateleg at 1\'-0 3/4" (2\'-5 1/8"). The two FRÖSVI folding chairs are 2\'-6 3/8" — 3/8" over the rule — and they stand 1\'-0 3/4" and 2\'-7" off the wall face, i.e. 3/4" and 1\'-7" outside the 1\'-0" band, which is the same trade layout D makes with its two stored FROSVI and for the same reason: they fold flat into the reach-in closet when nobody is eating. The Cleon sofa is 2\'-4" tall and the made-up queen 2\'-0", so from every seat in the room the glazing reads full height over the furniture.',
    'CIRCULATION, AND WHERE IT IS TIGHTEST. Two numbers carry the plan: the east-west walk between the bed\'s south side and the sofa\'s back is 2\'-8 3/8", and the north-south connector east of the sofa, between the sofa\'s front face and the parked desk chair, is 2\'-11 15/16". BOTH IMPROVED IN THE 31 Jul 2026 REVISION and it is worth being exact about how much, because it is less than it sounds. The Basi is 0.9" narrower than the Awara and the sofa was held rather than moved, so the whole 0.9" went into the east-west walk: 2\'-7 1/2" to 2\'-8 3/8". The MAGNUS is 0.9" narrower than the Jarvis and its east end is pinned by the plinth, so the desk\'s west end moved 0.9" EAST and the chair went with it: the connector gains the same 0.9" and no more. The MAGNUS is also 2.4" shallower, but that moves the chair NORTH, not west — it does nothing for the connector and instead opens the gap between the parked chair and the sofa\'s north-west corner from 5 1/8" to 7 9/16". Between them the two swaps also widen the north-wall passage between the foot of the bed and the desk\'s west end from 2\'-4 7/16" to 2\'-6 1/4". WHAT DID NOT CHANGE: the analyzer still reports 2\'-6" for the bathroom-to-bed trip, for the walk down the promenade to the west windows, and for the narrowest path in the plan — so the gain, real as it is, is not where those routes bind. The other required trips are unchanged at 3\'-6" front door to bathroom, 3\'-0" front door to kitchen sink and 4\'-0" sink to refrigerator. The desk chair does still sever the north wall walk, now at x 12\'-4 15/16" to 14\'-7 15/16"; you go round it, which is what the connector is for.',
    'BUILT-INS HELD CLEAR. The 3\'-6" kitchen work aisle (nothing south of y 13\'-6 7/8" for x < 17\'-11 3/8"), the 3\'-0" fridge and laundry zones and the 2\'-6" strip in front of the four reach-in closet doors are all clear. The bathroom door\'s 2\'-8" leaf and the 3\'-2" entry door arc are clear. The rug is walkable and stops 1/4" short of the kitchen aisle line.',
    'STORAGE, AND WHAT IS MISSING. There is NO DRESSER and NO WARDROBE in this scheme, and there is no wall left to put one on: the notch north wall is the bed, the wide leg north wall is the desk, the east wall is the screen, and the 10 3/8" between the desk\'s east end and the plinth is a gap, not a wall. What you get instead is the 8\'-0" run of built-in reach-in closets on the south wall of the east leg (four doors), the bathroom linen closet, FOUR low-profile 4 1/2" cases in the 6" under the bed frame (all four drawn — about a drawer and a half of folded clothes, and the reason the wall shelf could go). THAT LINE GOT WORSE ON 31 Jul 2026 AND THE FILE SHOULD NOT HIDE IT: the Awara gave 8.3" of clearance and took 7 1/2" SKUBB cases at 90 litres each, which was roughly a three-drawer chest; the Basi gives 6", which no SKUBB fits, so the boxes halve to 45 litres and four of them come to 180 litres against the old 362. In a scheme whose answer to "where do the clothes go" is a closet run and the space under the bed, halving the second half is the single biggest cost of the new frame — bigger than the money, which went the other way, the TONSTAD\'s drawer, two push-open bays in the plinth, two wall-hung TRONES at the entry, and two hollow storage poufs. The bedroom storage this scheme USED to have — three bays of String shelf and a floating ledge, $735 of wall-hung joinery between them — is deliberately gone, because both need holes in a wall and the brief asked for none. If the client owns more clothes than the closets plus four flat cases hold, take a different layout.',
    'TRADE-OFF — NO COFFEE TABLE. The Cleon needs 1\'-4" of clear floor in front of it to be reachable, and anything put in that band either fails the clearance check or stands in the UST\'s beam. The 66" plinth top is the surface, and its west edge is 7\'-5 3/8" from the sofa\'s front face, which means you stand up to put a glass down. That is a real cost of an armless 34"-deep sofa in a 10\'-4" deep room, and it is the correct trade against losing a seat.',
    'TRADE-OFF — DINING IS A FOLDED GATELEG AND TWO PARKED FOLDING CHAIRS. 2\'-7 3/8" x 10 1/4" folded, back to the glazing wall and 3/4" clear of the 1\'-0" band, opening its east leaf into the promenade. The two FRÖSVI chairs stand parked side by side 1\'-3" south of it, facing SOUTH down the open floor — the only orientation in this room that gives a folding chair its full 2\'-6" of pull-back, since west of them is glass 1\'-11 1/2" away and east of them is a pouf. It seats two properly and four badly, and for most of the year it is a console. A four-top does not exist in a plan carrying a queen, a Jarvis, a 56" sofa and a 66" plinth in 213 sq ft of usable floor. You also eat at the desk, which is why the desk got a single 32" panel instead of two 27"s.',
    'TRADE-OFF — THIS IS AN EVENING ROOM. With the shades up the picture is unwatchable, and no amount of ALR fixes it on a west-facing wall (see BLACKOUT). With the shades down the apartment loses its entire west elevation — the one thing it has. So the room has two states and you choose one: daylight and a view, or a 100" picture. Nothing in the catalog splits the difference. The 550-lumen XGIMI MoGo 4 on a painted wall would be honest for camping trips and is not honest for a congregation area.',
    'ACOUSTICS AND HEAT, BRIEFLY. The soffit is exposed structural concrete and the floor is dark LVP, so the room will ring; the 8x10 wool/jute flatweave and the blackout cellular stacks are the only absorption in the scheme and it is not enough for a cinema — budget a fabric panel or two, off catalog. The PX3-PRO measures 39.1 dBA at 3 ft with no published rating, and at 11\'-1 3/8" that is audible in quiet passages. CEILING MOUNTING IS NOT AN OPTION and no layout here draws one: the soffit needs a GPR scan, masonry anchors and a silica vacuum, there is no power in it, and the glazing head leaves 4" of concrete above the glass.',
    'BUDGET. $15,843 of catalogue total — DOWN $874 in the 31 Jul 2026 revision, which is the first time changing this scheme has made it cheaper rather than dearer. The shape of it is still the argument: $7,204 is the cinema (PX3-PRO $2,799, VIVIDSTORM 100" UST ALR $1,439, plinth $650, four blackout shades $1,976, four sets of side channels $340) and $4,117 is the desk kit (Aeron $2,150, MAGNUS Pro $799, 32" panel $799, single arm $175, CPU sling $99, felt mat $95, cable tray built into the desk). Those two are still 71% of the total. WHERE THE $874 CAME FROM: the desk saved $526 (MAGNUS Pro $799 against Jarvis 60 x 30 $1,325) and the bed saved $369 (Basi $399 against Awara $768), less $21 of extra under-bed boxes. THE SLEEPING ALCOVE IS NOW $1,134 — Basi frame $399, Flos Bellhop $370, TONSTAD nightstand $150, linen bed cover $130, four low-profile cases $60, sansevieria $25 — against $883 for the wall-hung version it replaces (GRIMSBU $79, String shelf $645, floating ledge $90, HEKTAR $69). SO THE REAL NUMBER IS +$251, down from +$599. It is worth saying what that $251 buys and what it does not: it buys a bed that is an object rather than a hospital frame, a room with no holes drilled in its walls, and 29.7 points of picture visibility from the bed. IT NOW ALSO COSTS SOMETHING IT DID NOT BEFORE — half the under-bed storage volume, 180 litres against 362 — and that is the honest ledger for this revision: cheaper, slightly better circulated, better for the picture, and worse at holding clothes.',
    'BUDGET CAVEAT. Catalogue prices are furniture and AV only, and the biggest lines are estimates rather than quotations. The $650 plinth is a JOINERY ALLOWANCE for a veneered slab carcass, not a cabinetmaker\'s number. The $494 per blackout shade and the $85 per bay of side channel are configured-size ESTIMATES, and at 104" of drop the real number can move a long way. ON THE ALCOVE SPECIFICALLY: the Basi $399 is the FRAME ONLY, read off article.com on 31 Jul 2026 — a 10" queen mattress is $499-$1,999 on top of it (its own allowance line). ITS DECK HEIGHT IS NOT PUBLISHED AT ALL: Article gives 12" overall and 6" of clearance and nothing between them, so the 20" sleeping surface this file draws is INFERRED with about +/-2" on it, and the TONSTAD\'s suitability as a nightstand rides on that number. Measure the deck before buying anything else for this corner. ON THE DESK: the MAGNUS Pro $799 is NOT a verified figure — secretlab.co rate-limited every attempt to read the PDP on the day, so it comes off review and index sources and must be confirmed in a cart; the standard size\'s shipping weight is unknown too, and the XL it is not is documented at 150 lb in two cartons, so assume a two-person carry through the angled front door. Confirm as well that the Jarvis monitor arm\'s clamp fits the MAGNUS\'s rear edge before assuming that $175 line carries over. The four low-profile under-bed cases at $15 each are an ESTIMATE — the only price the search surfaced was a UK figure. The Flos Bellhop is recorded at its $370 LIST price although it was $240.50 on the same day; the linen bed cover was flagged LOW STOCK when priced and its "from $129.90" is the throw size, so the full/queen may be dearer. SHEETS AND DUVET ARE NOT IN THE CATALOGUE TOTAL — they are the bedding allowance, and this scheme spends it on a specified thing rather than a class average: Quince European Linen sheet set in Oat and the linen duvet cover set (cover + 2 shams) in Sand, $298 the pair on the day\'s promotion and $603 at list. The Cleon does not knock down and ships freight — measure the angled front door, the corridor turn and the lift car before ordering it.',
  ],
};

export default layout;
