/**
 * LAYOUT D — "Paint and go"
 *
 * READ THIS FIRST, BECAUSE IT IS THE ONE THING THAT DISQUALIFIES THE SCHEME FOR
 * SOME CLIENTS: the projector is an XGIMI MoGo 4 Laser at 550 ISO lumens. On a
 * 118" painted wall that is roughly 8-9 foot-lamberts of peak white — about half
 * the 16 fL cinema reference — so this is an AFTER-DARK MACHINE and nothing else.
 * With the blackout down and the lights off it is a real 118" picture. At 4pm in
 * July, with the west glass uncovered, it is not a picture at all. If the client
 * wants to watch a match on a Saturday afternoon, take one of the UST schemes and
 * pay the $2,799.
 *
 * STRATEGY: the client rents. So nothing in this layout is screwed to the
 * concrete, nothing is framed on a wall, and nothing is millwork. The bathroom
 * partition gets a 118" rectangle of screen PAINT with a flat-black border ($189)
 * instead of a fixed frame; the projector is a 2.9 lb cylinder that lives in the
 * closet and stands on an 18" side table when it is wanted ($669). The whole AV
 * kit is $858 against $4,888 for a UST-plus-ALR-frame-plus-plinth scheme, and on
 * move-out day the AV goes in a tote bag and the screen goes back to white with a
 * quart of Behr.
 *
 * THE BET: that the money saved on hardware is better spent on the one thing this
 * apartment genuinely cannot do without — blackout on all four glazing bays,
 * $1,320 of rollers and side channels, which is more than the projector, the
 * paint and the table put together. A cheap projector in a blacked-out room
 * beats an expensive one in a bright one, every time, and that is physics
 * rather than taste (see the BLACKOUT note below).
 *
 * THE PRICE OF PORTABILITY, stated up front: paint is standard-throw only, and
 * the MoGo is a 1.20:1 lens, so the projector has to stand 10'-3 3/8" out from
 * the wall — IN FRONT of the audience, on the centre line, in the middle of the
 * floor. The plan is drawn DEPLOYED, and even deployed every required route still
 * measures 2'-6"; but the beam crosses the walk to the windows at knee height,
 * and anyone who gets up during a film puts their head in the picture. That is
 * the honest cost of not mounting anything. Every other scheme here hides its
 * projector in $650 of millwork or on a $1,439 frame's centre line; this one asks
 * you to carry a 2.9 lb cylinder out of a closet.
 *
 * DESK ORIENTATION — the shared reasoning is set out at length in
 * faces.ts and this layout obeys it. The glazing faces WEST and takes
 * direct sun from about 3pm to sunset, so a screen may face NORTH or SOUTH but
 * never into or away from that sun. The Jarvis top therefore runs east-west
 * against the north wall of the wide leg, the user sits south of it facing north,
 * the panel faces SOUTH, and the glass is on the user's LEFT.
 */

import type { Layout } from '@/core/types';
import {
  BATH_S_FACE,
  BATH_W_FACE,
  E_FACE_ENTRY,
  GLASS_BAND_E,
  N_FACE,
  N_FACE_WIDE,
  W_FACE,
} from './faces';

// ---------------------------------------------------------------- the picture
//
// screen-painted-wall-118 is a 118" 16:9 IMAGE, not a frame: the def's 0.25"
// depth is two rolled coats of Paint On Screen Digital Theater White, so the
// paint plane IS the partition face. The centre therefore sits half a paint
// thickness WEST of BATH_W_FACE — the coats sit ON the wall, in the room — and
// the item is drawn wallMounted, which is literally true. The sign matters and
// is not cosmetic: at +PAINT_T/2 the def box is buried IN the partition with its
// front face exactly coplanar with the wall face, and Cycles then shadow-rays
// the paint plane against the wall it is embedded in and returns a hard-edged
// BLACK region across the picture. -PAINT_T/2 puts the box entirely in the room
// with its back flush on the partition, which is both what paint is and what
// a-night-wall already does (SCREEN_X = BATH_W_FACE - SCREEN_D / 2).
const PAINT_T = 0.25 / 12; // 0.0208 — two coats, treated as the def's depth
const SCREEN_CX = BATH_W_FACE - PAINT_T / 2; // 18.8546
/** Centred on the 9'-10 1/4" of blank partition, y 3.22..13.075. */
const SCREEN_CY = (N_FACE_WIDE + BATH_S_FACE) / 2; // 8.1475
// Reveal each side of the image: (13.075 - 3.22 - 8.5705) / 2 = 0.642 = 7 3/4"
// of flat-black border, which is what makes a painted rectangle read as deliberate.
/** Image bottom above the floor. The brief's band is 26"-28"; this is the top of it. */
const IMAGE_BOTTOM = 28 / 12; // 2.3333
/**
 * And here is the vertical price of choosing 118" over 100", which is a real
 * cost and is easy to miss because no check in the tool looks at it. A 118" 16:9
 * image is 57.85" TALL, so with the bottom edge at the 28" top of the band the
 * image CENTRE is at 56 15/16" and the TOP is at 85 7/8" AFF. The house guidance
 * is that an image top should not run much past 80". It cannot be met at this
 * size: dropping the top to 80" would put the bottom at 22 1/8", under the hard
 * 24" floor. So the choice is 118" with a tall picture or 100" with a correct
 * one, and this scheme takes the 118" for the reason given in the screen note —
 * 8'-6 7/8" of image on 9'-10 1/4" of wall is the only size that makes a painted
 * rectangle read as deliberate. Consequences are argued in the IMAGE HEIGHT note.
 */
const IMAGE_H_118 = 57.85 / 12; // 4.8208
const IMAGE_TOP = IMAGE_BOTTOM + IMAGE_H_118; // 7.1542 = 85 7/8" AFF
// Image centre = 4.7438 ft = 56 15/16" AFF, quoted in the notes.

// The IMAGE width, computed exactly the way the analyzer computes it, because
// every distance below is a multiple of it: w = diag * aspect / hypot(aspect, 1).
const IMAGE_ASPECT = 16 / 9;
const IMAGE_W = ((118 / 12) * IMAGE_ASPECT) / Math.hypot(IMAGE_ASPECT, 1); // 8.5705 = 8'-6 7/8"

// -------------------------------------------------------------- the projector
//
// MoGo 4 Laser: fixed 1.20:1, lens 1" inside the front face of a 3.8" cube.
// Throw distance is measured from the LENS to the PAINT PLANE, so the cabinet's
// own half-depth comes off and the lens offset goes back on.
const THROW_RATIO = 1.2;
const THROW = THROW_RATIO * IMAGE_W; // 10.2846 = 10'-3 3/8"
const PROJ_BODY = 3.8 / 12; // 0.3167 — the MoGo is a 3.8" square in plan
const LENS_OFFSET = 1 / 12; // 0.0833 — lens is 1" inside the front face
const PROJ_CX = SCREEN_CX - (THROW + PROJ_BODY / 2 - LENS_OFFSET + PAINT_T / 2); // 8.4848
/** The projector stands ON the side table, so its base is the table top. */
const TABLE_H = 22 / 12; // 1.8333 — side-table-round-18 is 22" high
// Lens height = table top + about 5" up the 8.2" body = 27" AFF, against an
// image bottom of 28": a 0.5 deg nose-up tilt the gimbal absorbs without crop.

// ------------------------------------------------------------------- the bed
//
// GRIMSBU, head to the glazing, rot 270 so the 6'-8 3/8" length runs east-west
// and the 5'-1" width runs north-south. Its 21 5/8" headboard is the only queen
// headboard in the catalog that clears the 2'-6" glazing rule, which is the only
// reason a bed can point at this window at all.
const BED_L = 80.375 / 12; // 6.6979 — head to foot, runs along x at rot 270
const BED_W = 61 / 12; // 5.0833 — mattress width, runs along y at rot 270
/** Headboard 1'-0 3/8" off the glass: clear of the 1'-0" band, so the roller and
 *  its side channels drop free behind the head rather than onto it. */
const BED_HEAD_X = GLASS_BAND_E + 0.03; // 1.62
const BED_CX = BED_HEAD_X + BED_L / 2; // 4.9690 — bed x 1.62..8.3179
/** North long side hard against the notch's north wall. This is the trade. */
const BED_CY = N_FACE + 0.02 + BED_W / 2; // 3.1917 — bed y 0.65..5.7333
const BED_S_FACE = BED_CY + BED_W / 2; // 5.7333 — the only side you get out on
// Foot of the bed lands at x = 8.3179, leaving a 1'-7 1/2" pocket to the notch's
// east return at 9.93 — the dead floor the folding chairs are stored in.

// ------------------------------------------------------------------ the work
//
// Jarvis 48 x 27 on the north wall of the WIDE LEG — the only north wall left
// once the bed owns the notch. 48" rather than 60" because the 30" chair
// pull-back in front of it has to live in the same floor the beam crosses.
//
// THIS IS THE ONE LAYOUT IN THE PROJECT THAT DID NOT TAKE THE SECRETLAB MAGNUS
// PRO ON 31 Jul 2026, AND THE REASON IS ARITHMETIC RATHER THAN TASTE. Every
// other scheme here swapped its Jarvis for a MAGNUS: dark matte metal, no west
// sun bounced off the work surface, no pale plane bouncing projector light back
// at the picture, and $526 cheaper. MAGNUS Pro IS MADE IN 59.1" AND 70" ONLY —
// there is no 48" — so the swap here is an 11.1" widening, and this wall has no
// 11.1" to give. Worked through: the desk cannot move west past the re-entrant
// corner at STEP_X = 9.93, so the furthest a 59.1" top can retreat puts its east
// end at x 14.855, giving up the 6 13/16" of corner gap this layout currently
// keeps. At that x the projector cone's north edge has fallen to y 5.5157 and
// the 27.6"-deep top's front edge is at y 5.54 — SO THE DESK'S SOUTH-EAST
// CORNER IS 9/32" INSIDE THE BEAM IN PLAN. It is not a near miss that rounding
// saves: the cone's lower edge is 26.5" AFF there and the top is 29 1/2" seated,
// so the corner stands 3" up into the light and throws a wedge on the picture.
// The 48" Jarvis clears the same cone by 4 15/16" and keeps its corner gap.
// If this layout must have a MAGNUS, the projector geometry has to move first —
// and since the lens is fixed at 1.20:1, moving it moves the image size too, so
// that is a redesign of the 118" picture rather than a desk swap.
const DESK_D = 2.25; // 27" deep top; the 48" width runs east-west along x
const DESK_BACK = N_FACE_WIDE + 0.02; // 3.24
const DESK_CY = DESK_BACK + DESK_D / 2; // 4.365 — top runs y 3.24..5.49
const DESK_FRONT = DESK_BACK + DESK_D; // 5.49
const DESK_CX = 12.5; // top runs x 10.50..14.50
/** Chair PARKED in the pull-back zone, not tucked under a solid-box desk. */
const CHAIR_D = 2.0;
const CHAIR_CY = DESK_FRONT + 0.03 + CHAIR_D / 2; // 6.52 — chair y 5.52..7.52
// CLEARANCE.deskChair is 2.5, so the reserved pull-back is y 5.49..7.99 and the
// 2'-0" deep chair parks inside it with 5 3/4" to spare. See the notes: the
// sourced real-world minimum is nearer 36" and this layout does not reach it.

// ---------------------------------------------------------------- the lounge
//
// Cleon 56 armless, back to the glazing, aimed EAST straight down the room at
// the painted wall. Its 28" back is under the 2'-6" glazing rule and, like the
// bed, it sits 1'-0 3/8" off the glass so the blackout drops behind it.
const SOFA_W = 56 / 12; // 4.6667 — runs along y at rot 270
const SOFA_D = 34 / 12; // 2.8333 — runs along x at rot 270
const SOFA_BACK_X = GLASS_BAND_E + 0.03; // 1.62
const SOFA_CX = SOFA_BACK_X + SOFA_D / 2; // 3.0367 — sofa x 1.62..4.4533
/** Pushed south until the walk between the foot of the bed and the sofa is 2'-11 1/4". */
const SOFA_CY = 11.0; // sofa y 8.6667..13.3333
// Walk between the foot of the bed and the sofa back:
// 8.6667 - BED_S_FACE = 2.9333 = 2'-11 1/4" with the projector stowed.

/** Front row: ALSEDA cushions, 6 3/4" high, so an eye lands AT the image bottom. */
const CUSHION_W_CX = 6.9;
const CUSHION_E_CX = 9.1;
const CUSHION_CY = 12.6;

// ---------------------------------------------------------------- the dining
//
// NORDEN gateleg folded flat against the north wall east of the desk: 8 1/4"
// deep closed, and the last stretch of that wall the throw cone does not reach.
const GATE_D = 0.853;
const GATE_CY = N_FACE_WIDE + 0.02 + GATE_D / 2; // 3.6665 — table y 3.24..4.09
const GATE_CX = 15.95; // folded top runs x 14.64..17.26 — 1 5/8" east of the desk
/** Two FROSVI chairs FOLDED (1 1/2" thick each, drawn 3 1/2") in the dead
 *  pocket between the foot of the bed and the notch's east return. */
const FOLD_D = 0.3;
const FOLD_CX = 9.1; // x 8.38..9.82, clear of the bed foot at 8.32
const FOLD_1_CY = N_FACE + 0.02 + FOLD_D / 2; // 0.80
const FOLD_2_CY = FOLD_1_CY + FOLD_D + 0.05; // 1.15

/** 6'-7" x 9'-10" flatweave turned east-west: runs from the glass to the table. */
const RUG_CX = 5.7;
const RUG_CY = 10.28;

// ---------------------------------------------------------------- the shades
//
// Four bays, four rollers, four pairs of side channels. Drawn at full drop
// because that is the state the projector requires, and set 1/4" off the glass
// face so nothing in the reveal reads as floating.
const SHADE_D = 3.5 / 12; // 0.2917
const SHADE_CX = W_FACE + 0.02 + SHADE_D / 2; // 0.7558
const CHANNEL_D = 1.75 / 12; // 0.1458
const CHANNEL_CX = W_FACE + 0.02 + CHANNEL_D / 2; // 0.6829
/** Bay centre lines, from WINDOW_BAYS in faces.ts. */
const BAY_CY = [(2.8 + 5.53) / 2, (5.88 + 8.57) / 2, (9.93 + 12.7) / 2, (13.05 + 16.55) / 2];
// 4.165, 7.225, 11.315, 14.8

const layout: Layout = {
  id: 'd-paint-and-go',
  name: 'D — Paint and go',
  description:
    'The renter\'s cinema: 118" of screen PAINT on the bathroom partition, a 2.9 lb XGIMI MoGo 4 Laser on a side table 10\'-3 3/8" out, and an $858 AV kit. Nothing anchored, nothing framed, everything flat-pack — and honestly evening-only at 550 lumens.',
  plan: 'studio-508',
  items: [
    // ============================================================== BLACKOUT
    // Four bays of blackout is a CO-REQUISITE, not an upgrade. Rollers rather
    // than cellular: at 104" of drop a cellular shade can only be ordered on a
    // continuous cord loop, and four cord loops down a black-anodised glass wall
    // is a real aesthetic cost in a minimal scheme.
    {
      id: 'shade-1',
      def: 'shade-blackout-roller-bay',
      at: [SHADE_CX, BAY_CY[0]],
      rot: 270,
      label: 'Blackout roller, bay 1 (N)',
      note: 'Drawn at full drop — the state the projector needs. Blinds.com Classic Roller reaches 144" of height cordless, which is the only reason a roller works on a 104" head.',
    },
    { id: 'shade-2', def: 'shade-blackout-roller-bay', at: [SHADE_CX, BAY_CY[1]], rot: 270 },
    { id: 'shade-3', def: 'shade-blackout-roller-bay', at: [SHADE_CX, BAY_CY[2]], rot: 270 },
    { id: 'shade-4', def: 'shade-blackout-roller-bay', at: [SHADE_CX, BAY_CY[3]], rot: 270 },
    {
      id: 'channels-1',
      def: 'shade-side-channels-bay',
      at: [CHANNEL_CX, BAY_CY[0]],
      rot: 270,
      label: 'Blackout side channels, bay 1 (pair)',
      note: 'One item = the PAIR, one channel at each jamb; drawn on the bay centre because a 1 1/2" L-track is smaller than the plan\'s own tolerance. This is the part that turns a 98% shade into a room a 550-lumen projector can work in.',
    },
    { id: 'channels-2', def: 'shade-side-channels-bay', at: [CHANNEL_CX, BAY_CY[1]], rot: 270 },
    { id: 'channels-3', def: 'shade-side-channels-bay', at: [CHANNEL_CX, BAY_CY[2]], rot: 270 },
    { id: 'channels-4', def: 'shade-side-channels-bay', at: [CHANNEL_CX, BAY_CY[3]], rot: 270 },

    // ==================================================================== AV
    {
      id: 'screen',
      def: 'screen-painted-wall-118',
      at: [SCREEN_CX, SCREEN_CY],
      rot: 90,
      z: IMAGE_BOTTOM,
      label: '118" screen paint + 3" flat-black border',
      note: 'Image faces WEST down the room. 8\'-6 7/8" of picture on 9\'-10 1/4" of blank partition leaves 7 3/4" of reveal each side, which is why paint beats a frame here: a 123" frame would leave 3 1/4" and a 100" frame would leave 12 3/4" of dead wall.',
    },
    {
      id: 'proj-table',
      def: 'side-table-round-18',
      at: [PROJ_CX, SCREEN_CY],
      rot: 270,
      label: 'Side table, 18" round x 22" — the projector stand',
      note: 'DEPLOYED position, on the screen centre line 10\'-3 3/8" out. This table and the projector on it are the only things in this layout standing in open floor, and they are also the only two you can pick up with one hand.',
    },
    {
      id: 'projector',
      def: 'projector-portable-xgimi-mogo4-laser',
      at: [PROJ_CX, SCREEN_CY],
      rot: 270,
      z: TABLE_H,
      label: 'XGIMI MoGo 4 Laser (1.20:1, 550 lm)',
      note: 'Lens 10\'-3 3/8" from the paint, which is exactly 1.20 x 8\'-6 7/8" of image. Lens height 27" against an image bottom of 28": a 0.5 deg nose-up tilt the gimbal takes without keystone crop.',
    },

    // ================================================================== WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-laminate-48x27-black',
      at: [DESK_CX, DESK_CY],
      rot: 0,
      label: 'Fully Jarvis 48 x 27 BLACK laminate, 3-stage 25 3/4"-51 1/4"',
      note: 'Back to the wide leg\'s north wall, panel facing SOUTH, glazing on the user\'s left. 48" rather than 60" so the 2\'-6" pull-back and the projector beam can share the same 10\'-4" of depth — and that 48" is why this is a Jarvis and not the MAGNUS Pro every other layout here took on 31 Jul 2026. SAME DESK, DARK TOP: the frame, the width, the depth and the $1,325 are identical to the bamboo top this replaces, and only the colour changed. That colour is the whole point — a matte dark surface does not bounce west sun up under the monitor and does not bounce projector light back at a 118" image painted 10 ft away, which is exactly what the MAGNUS was chosen for elsewhere. This layout gets the benefit without the 11.1" of extra width it cannot afford.',
    },
    { id: 'desk-arm', def: 'monitor-arm-single-jarvis', at: [DESK_CX, DESK_BACK + 0.21], rot: 0 },
    {
      id: 'monitor',
      def: 'monitor-27',
      at: [DESK_CX, DESK_BACK + 0.35],
      rot: 0,
      note: 'One 27" panel on a single arm, not the $700 Dell on a dual: a 48" top will not carry two screens without the outer one hanging past the edge, and $251 saved here is most of a bay of blackout.',
    },
    { id: 'desk-tray', def: 'cable-tray-jarvis', at: [DESK_CX, DESK_BACK + 0.45], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_CX - 1.4, DESK_BACK + 0.35], rot: 0 },
    {
      id: 'desk-chair',
      def: 'chair-branch-ergonomic-pro',
      at: [DESK_CX, CHAIR_CY],
      rot: 180,
      label: 'Branch Ergonomic Pro, parked',
      note: 'Drawn PARKED in the 2\'-6" pull-back, not tucked: this desk is a solid box with no legroom void, so a tucked chair would read as a collision. It is also 41" tall and standing in the beam — on film nights it rolls three feet west.',
    },

    // ================================================================= SLEEP
    {
      id: 'bed',
      def: 'bed-queen-grimsbu',
      at: [BED_CX, BED_CY],
      rot: 270,
      label: 'GRIMSBU queen, head to the glazing (21 5/8" headboard)',
      note: 'North long side against the notch wall, so ONE usable side, and the analyzer says so. Deliberate: it hands the whole southern half of the west bay to the congregation, which is the only floor in this plan far enough back from a 118" picture to sit on. 14\'-9 1/8" from the picture, so the bed is also a seat.',
    },

    // ========================================================= CONGREGATION
    {
      id: 'sofa',
      def: 'sofa-cleon-56-armless',
      at: [SOFA_CX, SOFA_CY],
      rot: 270,
      label: 'Cleon 56" armless, aimed east at the picture',
      note: 'Back to the glazing at 28" tall — under the 2\'-6" rule, so it does not read as a wall in front of the glass — and 1\'-0 3/8" off it so the roller drops behind. 16\'-1" from the picture, which is a 30 deg image: SMPTE reference, dead on.',
    },
    {
      id: 'cushion-w',
      def: 'floor-cushion-alseda-24',
      at: [CUSHION_W_CX, CUSHION_CY],
      rot: 270,
      label: 'ALSEDA floor cushion (front row)',
      note: 'FRONT row, and it has to be: at 6 3/4" high an eye sits near 30", i.e. at the bottom edge of the image, so a cushion behind a 28" sofa back would be looking at the sofa. 12\'-9 3/8" out; its twin to the east is 10\'-8 7/8".',
    },
    { id: 'cushion-e', def: 'floor-cushion-alseda-24', at: [CUSHION_E_CX, CUSHION_CY], rot: 270 },
    {
      id: 'rug',
      def: 'rug-stoense-6x10',
      at: [RUG_CX, RUG_CY],
      rot: 90,
      label: 'STOENSE 6\'-7" x 9\'-10", turned east-west',
      note: 'Runs from the glass to the projector table and carries both front legs of the sofa plus both cushions — it is what makes floor seating a decision rather than a shortage of chairs.',
    },

    // ================================================================ DINING
    {
      id: 'dining',
      def: 'dining-gateleg-norden',
      at: [GATE_CX, GATE_CY],
      rot: 0,
      label: 'NORDEN gateleg, folded (8 1/4" deep closed)',
      note: 'Drawn CLOSED against the wall, which is where it lives. Opened it stands in the throw cone, so dinner and a film are sequential — in 448 sq ft that is arithmetic, not a compromise.',
    },
    {
      id: 'fold-chair-1',
      def: 'chair-frosvi-folding',
      at: [FOLD_CX, FOLD_1_CY],
      rot: 0,
      size: { d: FOLD_D },
      label: 'FROSVI folding chair, stored flat',
      note: 'Two of them, leaned against the notch wall in the 1\'-7 1/2" pocket at the foot of the bed — the only dead floor in the plan. They are the dining chairs and the fifth and sixth seats for a film.',
    },
    {
      id: 'fold-chair-2',
      def: 'chair-frosvi-folding',
      at: [FOLD_CX, FOLD_2_CY],
      rot: 0,
      size: { d: FOLD_D },
    },

    // ================================================================= ENTRY
    {
      id: 'entry-shoe',
      def: 'entry-trones-shoe',
      at: [E_FACE_ENTRY - 0.297, 17.3],
      rot: 90,
      note: 'Wall-hung, 7" deep, zero floor, $40. Set south of the entry door\'s 3\'-2" swing arc.',
    },
  ],
  notes: [
    'PROJECTOR AND SCREEN GEOMETRY: 118" 16:9 painted image = 8\'-6 7/8" x 4\'-9 7/8", bottom edge at 28" AFF, centre at 56 15/16" and top at 85 7/8" (corrected: an earlier draft of this file said the centre was at 52 7/8", which is the number for a 100" image, not a 118" one), painted on the 9\'-10 1/4" of blank bathroom partition with 7 3/4" of flat-black reveal each side. XGIMI MoGo 4 Laser, fixed 1.20:1 lens sitting 1" inside the front face of a 3.8" cube. Throw = 1.20 x 8\'-6 7/8" = 10\'-3 3/8", which puts the lens at x = 8\'-6 1/16" and the 18" round table under it at 22" high. Lens height 27" against an image bottom of 28" is a 0.5 deg nose-up tilt — inside the gimbal, and small enough that auto-keystone crops nothing. The analyzer\'s throw check agrees to within 1/16".',
    `IMAGE HEIGHT — THE COST OF 118" THAT NOTHING IN THE TOOL CHECKS. There is no vertical test in the analyzer at all: throw-distance is measured in plan and screen-distance is measured in plan, so an image can be hung anywhere between the floor and the soffit and the report stays clean. So here is the vertical, by hand. A 118" 16:9 image is 57 7/8" TALL. With the bottom edge at 28" AFF — the top of the brief's 26"-28" band, and 4" above the hard 24" floor — the centre lands at 56 15/16" and the TOP at ${(IMAGE_TOP * 12).toFixed(1)}" AFF, i.e. 7'-1 7/8" up a 9'-0" ceiling with 1'-10 1/8" of plaster left above it. That is 5 7/8" past the 80" the house guidance asks for, and it CANNOT be fixed at this size: pulling the top down to 80" puts the bottom at 22 1/8", under the 24" minimum. TWO CONSEQUENCES, both real. From the sofa at 16'-1 1/8" the top of the picture is 11.7 deg above a 46" seated eye, which is comfortable. From the east ALSEDA at 10'-8 7/8" — a 6 3/4" cushion, so an eye near 30" — it is 23.4 deg, which is well past the 15 deg to the top of the image that THX asks for and is a neck angle you will feel in a long film. The cushions are the front row because floor seating has to be (see THE CONGREGATION IS FOUR), so the honest statement is that the two cheapest seats in this scheme are also the two that look up hardest. If that matters more than the reveal, order 100": bottom 28", top 77", every angle inside guidance, and 12 3/4" of dead wall each side instead of 7 3/4". This layout takes the 118" and says what it costs.`,
    'PROJECTOR IN FRONT OF THE AUDIENCE, AND WHY THERE IS NO CHOICE: lenticular optics cannot be rolled on, so screen paint is STANDARD-THROW ONLY, and a 1.20:1 lens needs 10\'-3 3/8" for this image. The open room is 18\'-3 1/2" deep from the inner glazing face to the partition and the nearest seat has to be 10\'-4 1/8" back, so the lens lands within an inch of the front row every single time. There is no version of this scheme where the projector hides behind the sofa. Consequence, stated plainly: the beam crosses the middle of the floor and the walk to the windows, so anyone who stands up during a film puts their head in the picture. That is the honest cost of not mounting anything, and it is the reason the other three schemes buy millwork.',
    'SEATING DISTANCES, measured seat centre to picture, against a 118" image whose band is 10\'-4 1/8" (45 deg) to 22\'-0 1/2" (22 deg): east cushion 10\'-8 7/8" (43 deg), west cushion 12\'-9 3/8" (37 deg — THX maximum), sofa 16\'-1 1/8" (30 deg — SMPTE reference, dead on), bed 14\'-9 1/8" (32 deg), and the two FROSVI chairs where they are stored 12\'-2 3/4" (39 deg). Every seat in the layout is inside the band, and the analyzer raises no screen-distance warning. This is the one place a 118" image beats a 100" one: it pushes the far bound out to 22\'-0" and there is only 18\'-3" of room to fill, so for once the far seats are not the problem — the near ones are.',
    'THE CONGREGATION IS FOUR, AND SIX IF YOU COUNT THE BED. Two on the Cleon, two on the ALSEDA cushions in the front row, two more on FROSVI chairs unfolded out of the notch pocket, and the bed faces the picture square on from 14\'-9". Floor seating is in the FRONT row deliberately: a 6 3/4" cushion puts an eye near 30", which is at the bottom edge of the image, so behind a 28" sofa back it would be looking at upholstery. Nothing over 46" stands between any seat and the picture — the Jarvis top is 29 1/2", the sofa back 28", the chairs 30 1/2", the projector table 22" — so there is no sightline warning either.',
    'BLACKOUT IS A CO-REQUISITE, NOT AN UPGRADE, and at 550 lumens it matters more here than in any other scheme. The arithmetic that settles it: a 2,700-lumen projector on a 100" 0.6-gain screen makes 54 fL of peak white, while a screen face taking only 500 lux of ambient — conservative for a wall 18 ft from an uncurtained full-height WEST glass wall at midday — sits at 28 fL of BLACK. That is 1.9:1 in-room contrast, a grey rectangle; even a 5,000-lumen unit only reaches 3.6:1. The MoGo makes about a sixth of the light of the 2,700. So every one of the four bays gets a blackout roller plus side channels: 4 x $210 + 4 x $120 = $1,320 — more than the whole AV kit, and exactly where the paint-and-portable saving goes. An ALR screen would not substitute even if paint could be ALR, because this wall faces due WEST, straight down the sightline at the glazing — the one direction a lenticular screen cannot reject.',
    'WHY ROLLERS AND NOT CELLULAR: the glazing head is 8\'-8" and SelectBlinds\' per-lift maximums are 84" cordless, 96" motorised and 120" only on a CONTINUOUS CORD LOOP — so a cellular shade tall enough for these bays cannot be cordless, and four cord loops hanging down a black-anodised glass wall is a real cost in a minimal scheme. Blinds.com\'s Classic Roller runs to 144" of height cordless at 8"-118" wide, which covers all four bays. A roller stack also reads as far less mass under a 9\'-0" exposed concrete soffit that has only 4" of clear above the glass.',
    'DESK ORIENTATION: the Jarvis top runs east-west (x 10\'-6" to 14\'-6") against the north wall of the WIDE LEG, the user sits south of it facing north, the 27" panel faces SOUTH, and the west glazing is on the user\'s LEFT. Daylight rakes across the work surface and never down the barrel of the screen. A panel facing the glass is unreadable from about 3pm daily; a panel facing away from it puts a 9-ft-tall bright hole behind the work all afternoon. Layout A\'s desk wall — the notch\'s north wall — is not available here, because the bed is on it.',
    'DESK PULL-BACK, AND WHERE IT FALLS SHORT: the full 2\'-6" (CLEARANCE.deskChair) is reserved clear in front of the top, y 5\'-5 7/8" to 7\'-11 7/8", and the Branch Ergonomic Pro is drawn PARKED inside that zone at y 5\'-6 1/4" to 7\'-6 1/4" rather than tucked under it — the desks in this model are solid boxes with no legroom void, so a tucked chair would read as a collision. It does NOT reach the sourced real-world minimum: rolling a task chair back far enough to stand up cleanly wants nearer 36", and this layout gives 30". The reason is the projector. The same 10\'-4" of depth between the wide leg\'s north wall and the kitchen aisle has to carry the desk, its chair and the film beam, and the pull-back is the thing that gives. Also why the top is 48" x 27" and not 60" x 30".',
    'WHY THIS LAYOUT KEEPS A JARVIS WHEN EVERY OTHER ONE TOOK A MAGNUS. On 31 Jul 2026 the project moved its desks to a Secretlab MAGNUS Pro — matte dark metal, which stops the work surface bouncing west sun at the user and stops a pale plane bouncing projector light back at the screen, and $526 cheaper than the Jarvis. Layouts A, B, C, E and F all took it. D cannot, and the reason is that MAGNUS Pro is made in 59.1" and 70" only: THERE IS NO 48". This desk is 48" on purpose — its own comment says so — because the chair pull-back and the projector beam share the same 10\'-4" of depth. Pushed as far west as the re-entrant corner allows, a 59.1" top puts its east end at x 14\'-10 1/4" and its front edge 9/32" INSIDE the beam in plan, with the cone\'s lower edge at 26 1/2" AFF and the top at 29 1/2" seated — a 3" intrusion throwing a wedge on the picture — and it would also spend the 6 13/16" of corner gap this layout keeps. The 48" Jarvis clears the same cone by 4 15/16". The trade is therefore real and it is stated rather than split: this layout keeps a pale bamboo top, and with it the small contrast penalty a pale surface costs a projected image, because the alternative is a desk standing in the beam. SO THE FIX WAS A 48" TOP IN A DARK FINISH RATHER THAN A WIDER DESK: the Jarvis laminate range includes BLACK at 27x48 for the same $1,325 as the bamboo, so this layout now runs desk-standing-jarvis-laminate-48x27-black and gets the dark surface with no change to width, depth, price or geometry. It is the one place in the project where the right answer to "go dark" was a colourway rather than a different desk.',
    'THE DESK CHAIR STANDS IN THE BEAM, and no arrangement fixes it. The beam\'s lower edge climbs only from 24" at the lens to 28" at the wall, so anything taller than about 26" inside the throw cone clips the picture — and the cone\'s north edge has reached y 5\'-8" by the desk\'s east end. The 41"-tall chair back is in it. The answer is that the chair is on castors and rolls three feet west in two seconds, which is the kind of answer a scheme built on nothing-being-fixed is allowed to give. The Jarvis top itself (29 1/2" seated) clears the cone\'s north edge by 1 7/8" at its east end and does not clip; the folded gateleg (29 1/8" high, 8 1/4" deep) clears it by 4 7/8".',
    'BED AND AISLES — THE ONE WARNING THIS LAYOUT ACCEPTS: GRIMSBU queen (61" x 80 3/8", 21 5/8" headboard), head to the glazing, north long side hard against the notch\'s north wall. The analyzer raises bed-access, and it is right: the mattress is 5\'-1" wide, so it sleeps two, and the north side has 0" of aisle. You get in and out on the SOUTH, where the aisle is the full 3\'-0" probe and the walk to the sofa back is 2\'-11 1/4". THE TRADE, argued rather than hidden: keeping both long sides usable needs a 2\'-0" strip on the north, which puts the mattress at y 5\'-3" and pushes the sofa across the kitchen-aisle line — and then there is nowhere in this plan that is both 10\'-4" back from a 118" picture and big enough for four people. One person gets out of this bed on one side. Four people watch films in front of it. The floor went to the films, and that is the whole scheme.',
    'BED HEAD OFF THE GLASS: the headboard stands 1\'-0 3/8" back from the inner glazing face — deliberately outside the 1\'-0" band — so the blackout roller and its side channels drop past the head of the bed instead of landing on it. Pushing the last four inches to the glass gains nothing but a fouled shade and a blocks-window warning. The Cleon\'s back is set on the same line for the same reason.',
    'GLAZING RULE: nothing over 2\'-6" tall stands within 1\'-0" of the glass, and nothing over 2\'-6" stands anywhere it would come between a seat and the view. The two pieces nearest the glass are the GRIMSBU headboard (21 5/8") and the Cleon\'s back (28"), both on the 1\'-0 3/8" line — which is precisely why this bed and this sofa were chosen, and why a 39 3/8" MALM headboard or a Thuma with its 35" pillowboard is not in this drawing. The shades and their channels live in the reveal and cost no floor at all.',
    'CIRCULATION: every required route measures 2\'-6" usable with the projector DEPLOYED — front door to bathroom 3\'-6", to the kitchen sink 3\'-6", sink to fridge 3\'-6", front door to the west windows 2\'-6", bathroom to bed 2\'-6". The two 2\'-6" routes are squeezed by the projector table on the centre line and the front row of cushions; with the table and the projector back in the closet, which is where they live six evenings a week, the same routes open to 2\'-11" and better. 2\'-6" is the absolute minimum for a squeeze-by and this layout sits exactly on it in its deployed state — stated as a fact, not sold as a feature.',
    'DINING: a NORDEN gateleg ($350) folded flat against the north wall east of the desk — 8 1/4" deep closed, which is the only reason it fits — plus two FROSVI folding chairs ($35 each) stored flat in the 1\'-7 1/2" pocket between the foot of the bed and the notch\'s east return, the only genuinely dead floor in the plan. Opened, the table stands in the throw cone, so dinner and a film are sequential rather than simultaneous. In 448 sq ft that is arithmetic, not a compromise. The chairs are also the fifth and sixth seats for a screening.',
    'BUILT-INS HELD CLEAR: the 3\'-6" kitchen work aisle (nothing south of y 13\'-6 7/8" for x < 17\'-11 3/8"), the 3\'-0" fridge and laundry zones, the 2\'-6" strip in front of the four reach-in closet doors, and the entry door\'s 3\'-2" swing. Those closets are also why there is no wardrobe here: 8\'-0" of reach-in on the south wall of the east leg is more hanging space than a PAX run and it is already paid for. The projector and its table stow in the same closets, which is what makes the deployed/stowed argument real rather than rhetorical.',
    'TRADE-OFF — NO BEDSIDE TABLE AND NO FLOOR LAMP. The bed\'s north side is a wall and its south side is the only aisle in the west bay; a 19"-deep nightstand there cuts the walk to the glazing to 1\'-4". A 71" HEKTAR has nowhere to stand that is not in the beam, in that same walk, or in the kitchen aisle. Both wants are answered by things that hang — a plug-in wall sconce over the pillow, and a floating walnut shelf ($90) if the landlord will allow four screws. In a scheme whose entire argument is that nothing gets screwed to anything, those are the first two items to go, and the client should be told that before they sign off on the drawing.',
    'TRADE-OFF — THE SOFA IS THE ONE EXPENSIVE THING, and it sits awkwardly against a scheme that boasts about being cheap and reversible. Cleon 56" armless is $1,960 and is not flat-pack. It is here because MODERN / MINIMAL is a hard requirement and because 28" of back height in front of full-height glass is not negotiable — almost every cheaper sofa is 32"-35" tall and would read as a wall across the bottom of the window. The substitution that keeps the argument completely intact is sofa-2seat-klippan at $399 and 26" tall: $1,561 cheaper, flat-pack, and it fits the same slot turned the same way, at the cost of a boxier line. Show the client both.',
    'DENSITY — WHY THE ANALYZER CALLS THIS ROOM UNDER-FURNISHED: it reports 84% free floor and flags anything over 80%. Two things about that number. First, the 448 sq ft it divides by includes 66.6 sq ft of bathroom, 72.4 of kitchen and 20.7 of entry where no furniture can stand; the Living / Sleeping zone that actually carries this layout is 74% free, which is the comfortable end of normal. Second, the emptiness is the product: 26 items, no wardrobe, no dresser, no media console, no coffee table, no nightstand, no floor lamp. This scheme is trying to be a room you can empty into a van in an afternoon, and a low occupied-area figure is what that looks like on a plan.',
    'WHAT THIS SCHEME CANNOT DO. It cannot show a picture in daylight — not dimly, not adequately, not at all. 550 ISO lumens over 41.3 sq ft of 1.4-gain paint is an after-dark image, and the client has to accept that before the paint is bought. It cannot show a flawless one even at night: a 103"-wide image fed 4K puts one pixel at about 0.024", so roller stipple, drywall imperfections and any telegraphed joint will read, and there is no tension, no black backing and no velvet bezel, so letterbox bars glow grey the moment a downlight comes on. It has no ALR, so ambient light from the kitchen kills it. It has one usable side to the bed, no dining seat that is not folded, no nightstand and no floor lamp. And it asks somebody to carry a projector out of a closet and put it back, every time.',
    'BUDGET CAVEAT: the $7,609 catalogue total is furniture, AV and shades only, and four omissions are large enough to change the decision. (1) bed-queen-grimsbu at $79 is the FRAME ONLY — the Luroy or Lonset slatted base is a separate purchase and a queen mattress is $500-$1,000 on top, so the "$79 bed" is really $600-$1,150. (2) The $189 screen paint is an UNVERIFIED container price and one quart covers exactly ONE coat of a 118" image, so buy the gallon; and the honest prep is a level-5 skim over about 45 sq ft, sanded to 220, high-build primed, then 2-4 rolled coats and a flat-black border — three to five days of a finisher\'s time that is NOT in this number and will very likely cost more than the paint, the projector and the table combined. On that basis a $628 edge-free ALR frame can end up cheaper than the plastering, and the client should be shown that comparison. (3) Every shade price is an ESTIMATE: $210 a bay is a configured guess against a $29.82 starting price, and $120 a bay of side channel is a guess against a vendor who publishes neither lengths nor prices. Get four real quotes before this is presented as the cheap scheme. (4) XGIMI does not publish the MoGo\'s light-source life, and its 2-hour battery means a film runs on the mains — so budget an extension lead to the middle of the floor, which is one more thing crossing the walk to the windows.',
  ],
};

export default layout;
