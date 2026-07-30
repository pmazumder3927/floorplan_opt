/**
 * LAYOUT B — "Fold away"
 *
 * STRATEGY: this is the only scheme in the set where the screen DISAPPEARS and
 * you get the window back. The picture does not go on a wall — it goes IN the
 * west glazing, on a floor-RISING screen whose whole body is an 8 1/4"-tall,
 * 9 1/2"-deep cabinet, and that cabinet stands on a 17 3/4" bespoke sill plinth
 * so the fabric registers on the projector's beam (see IMAGE HEIGHT — it is the
 * number that nearly killed this scheme). Stowed, the glazing therefore carries
 * a 2'-2"-tall, 9 1/2"-deep, 8'-2 1/2"-long sill bench and NOT an 8 1/4" curb:
 * 4" under this project's own "nothing over 2'-6" within 1'-0" of the glass"
 * rule, with 6'-6" of the 8'-8" glazing head clear above it. Raised, it is a
 * 100" 16:9 image with a UST projector on an 11 1/2" plinth throwing back west
 * at it from 19 1/8". The bet the scheme makes is that a wall bed pays for all
 * of it: a queen Murphy on the wide leg's north wall gives the floor back for
 * sixteen hours a day, and without that there is no room for both a cinema and
 * a bed.
 *
 * WHY A FLOOR-RISER AND NOT SOMETHING OVERHEAD. Every reason is structural, not
 * aesthetic, and all four of them are fatal on their own. A recessed screen
 * cannot be cut into a structural — possibly post-tensioned — slab. A surface
 * cassette has 4" of concrete between the glazing head (8'-8") and the soffit
 * (9'-0"), and of every cassette surveyed only one fits inside it. Overhead
 * anchors into concrete in tension want a GPR scan, seismic-rated screw anchors
 * and a silica vacuum, which is a landlord "no" on a lease. And there is no
 * power in the soffit, while every motorised screen plugs in. A floor-riser
 * needs none of that: no anchors, a floor outlet, and even standing on the sill
 * plinth the whole assembly stows to 2'-2", which passes this project's own
 * "nothing over 2'-6" within 1'-0" of the glass" rule with 4" to spare.
 *
 * THE AUDIENCE THEREFORE FACES WEST — straight down the barrel of an
 * uncurtained full-height west glass wall. That is the one direction a
 * lenticular ALR screen cannot reject, so the blackout is not a nicety here, it
 * is load-bearing. See the BLACKOUT note.
 *
 * Desk orientation follows the rule set out in faces.ts: the Jarvis runs
 * east-west on the north wall of the notch, the user faces north, the panel
 * faces south, and the glazing is on the user's LEFT.
 */

import type { Layout } from '@/core/types';
import {
  BATH_W_FACE,
  GLASS_BAND_E,
  N_FACE,
  N_FACE_WIDE,
  S_FACE_EAST,
  STEP_X,
  W_FACE,
  WINDOW_BAYS,
} from './faces';

// ---------------------------------------------------------------------------
// THE PICTURE WALL — west glazing, y 4.40 .. 12.60
// ---------------------------------------------------------------------------

/** Blackout roller cassette depth (3 1/2"). The screen has to clear it. */
const SHADE_D = 3.5 / 12; // 0.2917
/** Side-channel depth (1 3/4"), taken on the jamb face only. */
const CHANNEL_D = 1.75 / 12; // 0.1458

/**
 * The screen cabinet stands OFF the glass by 4 1/4" rather than flush, and this
 * is the single most important dimension on the west wall: the blackout roller
 * has to drop past the sill plinth and the cabinet to the floor, not land on the
 * lid. Flush to the glass the shade would stop 2'-2" up and the fabric — which
 * Vividstorm will not confirm as opaque — would be back-lit from mid-afternoon,
 * over a strip of glass 2'-2" tall rather than 8 1/4".
 */
const SCREEN_STANDOFF = 0.35; // 4 1/4" = shade cassette 3 1/2" + 3/4" of air
const SCREEN_D = 0.7875; // 9 1/2" stowed cabinet depth
const SCREEN_W = 8.2025; // 98 7/16" stowed cabinet length
const SCREEN_BACK = W_FACE + SCREEN_STANDOFF; // 0.94
const SCREEN_CX = SCREEN_BACK + SCREEN_D / 2; // 1.33375
/** The FABRIC plane — the surface every throw and seating number is measured to. */
const FABRIC_X = SCREEN_BACK + SCREEN_D; // 1.7275
const SCREEN_CY = 8.5; // centred on the open room's depth, y 3.22..13.55
const SCREEN_N = SCREEN_CY - SCREEN_W / 2; // 4.39875
const SCREEN_S = SCREEN_CY + SCREEN_W / 2; // 12.60125

/** 100" 16:9 image: 87.16" x 49.03" = 7.2634 ft x 4.0858 ft. */
const IMAGE_W = 7.263429;

// ---------------------------------------------------------------------------
// IMAGE HEIGHT — the one number that decides whether a floor-riser can be used
// with a UST at all, and the reason there are TWO plinths in this layout.
//
// Two fixed vertical facts collide here, and neither is negotiable:
//   * the floor-riser's fabric does NOT start at the floor. The screen stands on
//     its own 8.27" stowage cabinet and the 49.1" of fabric rises out of the LID,
//     so the picture's bottom edge is 8 1/4" above whatever the cabinet is
//     standing on. (Catalog: "the stowed cabinet footprint with the fabric
//     standing 49.1" above an 8.27" cabinet".)
//   * a UST's image bottom is ~14 1/2" above the surface the PROJECTOR stands on
//     for a 100" 16:9 image (the figure the 14" catalog plinth is derived from).
//
// So: sill height + 8 1/4" = projector plinth top + 14 1/2". Put the cabinet on
// the floor and the projector on the catalog's 14" plinth — which is what a
// wall-mounted frame wants — and the beam lands 20 1/4" ABOVE the top of the
// fabric: two thirds of the picture on the glass and the mullions, the bottom
// 20 1/4" of a $1,962 ALR screen showing nothing. The analyzer cannot see it,
// because it checks throw distance in plan and has no vertical test at all.
//
// The fix is to solve the pair, and the free variable is the image bottom. The
// band is 26"-28" (hard limits 24" and 32"), and LOW is what this scheme wants,
// because every inch of image height is an inch of sill plinth standing in front
// of the glazing. 26" is the bottom of the band:
const IMAGE_BOTTOM = 26 / 12; // 2.16667 — bottom of the 26"-28" band
/** The screen's own stowage cabinet: fabric rises from its LID, not the floor. */
const SCREEN_CABINET_H = 8.27 / 12; // 0.68917
/** UST rise for a 100" 16:9 image: image bottom above the projector's surface. */
const UST_RISE = 14.5 / 12; // 1.20833
/** Sill plinth under the screen cabinet: 26" - 8 1/4" = 17 3/4". */
const SILL_H = IMAGE_BOTTOM - SCREEN_CABINET_H; // 1.4775 = 17 3/4"
/** The screen's base rides on the sill plinth. */
const SCREEN_Z = SILL_H; // 1.4775
/** Stowed height of the whole assembly, sill + cabinet lid. */
const STOWED_H = SILL_H + SCREEN_CABINET_H; // 2.16667 = 2'-2", under GLASS_MAX_H

/** Bespoke plinth for the projector: 26" - 14 1/2" = 11 1/2" of top height. */
const PLINTH_D = 2.0;
const PLINTH_CX = FABRIC_X + PLINTH_D / 2; // 2.7275
const PLINTH_TOP = IMAGE_BOTTOM - UST_RISE; // 0.95833 = 11 1/2" — the projector's z
/**
 * PX3-PRO cabinet: 21.7" x 11.7" x 4.8", lens 10.65" in from the REAR face.
 * Hisense's interpolated rear-of-cabinet gap for a 100" image is 8 1/2", so the
 * rear panel goes 8 1/2" east of the fabric and the arithmetic closes itself.
 */
const PROJ_D = 0.975; // 11.7"
const PROJ_LENS_OFFSET = 10.65 / 12; // 0.8875 from the rear face
const PROJ_REAR_GAP = 8.5 / 12; // 0.70833
const PROJ_CX = FABRIC_X + PROJ_REAR_GAP + PROJ_D / 2; // 2.92333
/** Lens axis, and the throw it actually makes. */
const LENS_X = PROJ_CX - PROJ_D / 2 + PROJ_LENS_OFFSET; // 3.32333
const THROW_ACTUAL = LENS_X - FABRIC_X; // 1.59583 = 19 1/8"
const THROW_REQUIRED = 0.22 * IMAGE_W; // 1.59795 = 19 3/16"

/** The lit picture, drawn 1/8" proud of the fabric so a render does not z-fight. */
const IMAGE_CX = FABRIC_X + 0.01; // 1.7375

const SHADE_CX = W_FACE + SHADE_D / 2; // 0.73583
const CHANNEL_CX = W_FACE + CHANNEL_D / 2; // 0.66292

// ---------------------------------------------------------------------------
// THE WORK WALL — north wall of the west notch, x 0.59 .. 9.93 at y 0.63
// ---------------------------------------------------------------------------

const DESK_W = 4.0; // Jarvis Bamboo Rectangle 48 x 30
const DESK_D = 2.5;
const DESK_X = 4.3; // top runs x 2.30 .. 6.30
const DESK_Y = N_FACE + 0.02 + DESK_D / 2; // 1.90
const DESK_BACK = DESK_Y - DESK_D / 2; // 0.65
const DESK_FRONT = DESK_Y + DESK_D / 2; // 3.15
/** Top's west edge to the glazing band: 2.30 - 1.59 = 8 1/2" of daylight strip. */
const DESK_OFF_BAND = DESK_X - DESK_W / 2 - GLASS_BAND_E; // 0.71

/** Panel pushed back over the rear edge on the arm. */
const MON_Y = DESK_BACK + 0.4; // 1.05
const CHAIR_D = 2.0; // Branch Pro, 25" x 24"
/** Parked INSIDE the 30" pull-back zone, 4 1/4" clear of the top. */
const CHAIR_Y = DESK_FRONT + 0.35 + CHAIR_D / 2; // 4.50
/** Eye-to-panel distance the layout actually delivers. */
const MON_DISTANCE = CHAIR_Y - MON_Y; // 3.45 = 3'-5 3/8"

// ---------------------------------------------------------------------------
// THE DINING CONSOLE — same north wall, hard against the step corner
// ---------------------------------------------------------------------------

const GATE_W = 2.6246719; // 31 1/2" along the wall, fixed
const GATE_D = 0.8530184; // 10 1/4" closed; 35" mid; 59 7/8" open
const GATE_E = STEP_X - 0.055; // 9.875, 5/8" off the re-entrant corner
const GATE_X = GATE_E - GATE_W / 2; // 8.56266
const GATE_Y = N_FACE + 0.02 + GATE_D / 2; // 1.07651
/** Fully open the leaves reach 59 7/8" south of the wall face. */
const GATE_OPEN_S = N_FACE + 0.02 + 59.875 / 12; // 5.6396

const FROSVI_W = 1.4479167;
const FROSVI_D = 1.6770833;
/** Chairs parked south of the step line so their footprint stays in the wide leg. */
const FROSVI_Y = N_FACE_WIDE + 0.03 + FROSVI_D / 2; // 4.08854
const FROSVI_X1 = 6.7;
const FROSVI_X2 = 8.2;

// ---------------------------------------------------------------------------
// THE BED — queen Murphy, wide leg's north wall, flush to the bathroom box
// ---------------------------------------------------------------------------

const MURPHY_W = 5.5; // 66" cabinet
const MURPHY_D = 16 / 12; // 1.33333 closed
const MURPHY_E = BATH_W_FACE - 0.025; // 18.84
const MURPHY_X = MURPHY_E - MURPHY_W / 2; // 16.09
const MURPHY_W_EDGE = MURPHY_E - MURPHY_W; // 13.34
const MURPHY_Y = N_FACE_WIDE + 0.02 + MURPHY_D / 2; // 3.90667
/** Deployed depth = 80" mattress + 6" of cabinet left behind = 86". */
const BED_DROP_S = N_FACE_WIDE + 0.02 + 86 / 12; // 10.40667

// ---------------------------------------------------------------------------
// THE ROW — one row, and only one row fits. See the SEATING notes.
// ---------------------------------------------------------------------------

const SOFA_D = 2.8333333; // 34" deep, turned so the depth runs east-west
const SOFA_W = 4.6666667; // 56" armless
/** East face 3 7/8" clear of where the open mattress edge lands. */
const SOFA_E = MURPHY_W_EDGE - 0.32; // 13.02
const SOFA_CX = SOFA_E - SOFA_D / 2; // 11.60333
const SOFA_CY = SCREEN_CY; // 8.50 — square on to the middle of the picture
const SOFA_FRONT = SOFA_CX - SOFA_D / 2; // 10.18667

const EK_W = 2.1041667; // EKENASET, 25 1/4" wide
const EK_D = 2.5625; // 30 3/4" deep
/** North chair: front face lined up with the sofa's, back to the north wall. */
const EK_N_CX = SOFA_FRONT + EK_D / 2; // 11.46792
const EK_N_CY = N_FACE_WIDE + 0.03 + EK_W / 2; // 4.30208
/**
 * East chair: in the 3'-1" band SOUTH of where the mattress lands, its west face
 * on the mattress edge line. Put anywhere in the sofa strip it would seal the
 * only walk past the row; here it leaves 2'-11 3/8" of that band clear, which is
 * the route from the open bed to the bathroom door.
 */
const EK_E_CX = MURPHY_W_EDGE + EK_D / 2; // 14.62125
const EK_E_CY = 12.25; // y 11.198 .. 13.302, i.e. 9 1/2" south of the mattress foot

const SIDE_W = 2.9479167; // VITTSJO pair, 35 3/8" x 19 5/8"
const SIDE_D = 1.6354167;
const SIDE_H = 1.6354167;
/** 16 3/8" of shin room between the glass tops and the sofa front. */
const SIDE_E = SOFA_FRONT - 1.36667; // 8.82
const SIDE_CX = SIDE_E - SIDE_D / 2; // 8.00229

const RUG_CX = 8.4; // 8 x 10 laid x 4.40..12.40, y 3.40..13.40
const RUG_CY = 8.4;

// ---------------------------------------------------------------------------
// Seating distances the analyzer will measure — seat CENTRE to screen CENTRE
// (1.334, 8.50), which is how analysis.ts does it. Re-measured by hand:
//   sofa        10'-3 1/4"   38.9 deg
//   EKENASET N  10'-11 5/8"  36.6 deg   (THX maximum is 36 deg — just outside)
//   EKENASET E  13'-9 3/4"   29.5 deg   (SMPTE reference is 30 deg)
// Near bound 8'-9 1/4" (45 deg), far bound 18'-8" (22 deg). The near-bound line
// lands at x = 10.1015, one inch west of the sofa's own front face.
// ---------------------------------------------------------------------------

const layout: Layout = {
  id: 'b-fold-away',
  name: 'B — Fold away',
  description:
    'The keep-the-view scheme: a 100" floor-rising screen stows into a 2\'-2"-tall sill bench at the west glazing, a UST throws back at it from an 11 1/2" plinth, and a queen Murphy on the wide leg frees the floor the audience sits on.',
  plan: 'studio-508',
  items: [
    // ======================================================= THE PICTURE
    {
      id: 'sill-plinth',
      def: 'plinth-ust-bespoke-66',
      at: [SCREEN_CX, SCREEN_CY],
      rot: 180,
      size: { w: SCREEN_D, d: SCREEN_W, h: SILL_H },
      ignoreAnalysis: true,
      label: 'Bespoke sill plinth, 98 1/2 x 9 1/2 x 17 3/4',
      note: `The piece that makes the vertical geometry close, and it is not decoration. The floor-riser's fabric starts 8 1/4" up its own cabinet, so with the cabinet on the floor the picture bottom would be at 8 1/4" AFF while the UST throws its bottom edge at 14 1/2" above whatever the projector stands on — the two cannot be reconciled without lifting the screen. 17 3/4" of sill + the 8 1/4" cabinet lid = a ${(STOWED_H * 12).toFixed(1)}" stowed height and a 26" image bottom, which is exactly what an 11 1/2" projector plinth delivers. Bespoke millwork, same veneer and same detail as the projector plinth, and its $650 line is a JOINERY ALLOWANCE. Drawn rot 180 and excluded from analysis for one stated reason: its footprint is IDENTICAL to the screen's, so every finding it could raise is a finding the screen already raises — including the three blocks-window warnings. Its height is argued in the GLAZING RULE note instead, where it belongs.`,
    },
    {
      id: 'screen',
      def: 'screen-floorrise-vividstorm-100',
      at: [SCREEN_CX, SCREEN_CY],
      rot: 270,
      z: SCREEN_Z,
      label: 'VIVIDSTORM floor-rising UST ALR 100" (shown RAISED)',
      note: `Cabinet 8'-2 1/2" x 9 1/2" x 8 1/4", standing on the 17 3/4" sill plinth and 4 1/4" off the glass so the blackout roller drops to the floor BEHIND it. Fabric plane at x ${FABRIC_X.toFixed(3)}, cabinet running y ${SCREEN_N.toFixed(2)} to ${SCREEN_S.toFixed(2)} — bay 1's north 1'-7" and the whole of bay 4 stay clear of it even raised. Picture bottom 26" AFF, top 6'-3", nothing above 6'-3 1/8" at any time. Raised it is the only tall thing in the glazing band, and that is deliberate.`,
    },
    {
      id: 'projector',
      def: 'projector-ust-hisense-px3-pro',
      at: [PROJ_CX, SCREEN_CY],
      rot: 270,
      z: PLINTH_TOP,
      label: 'Hisense PX3-PRO, 0.22:1, standing on the plinth',
      note: `Rear panel 8 1/2" east of the fabric, lens 10.65" inside it: throw ${THROW_ACTUAL.toFixed(4)} ft against a required ${THROW_REQUIRED.toFixed(4)} ft — 1/32" of error. Standing at 11 1/2", not the catalog plinth's 14", because in this scheme the image bottom is pinned from BELOW by the screen's own cabinet and every inch of it is an inch of sill plinth in front of the glass. 50 W Harman Kardon, so there is no soundbar in this scheme and none is needed.`,
    },
    {
      id: 'plinth',
      def: 'plinth-ust-bespoke-66',
      at: [PLINTH_CX, SCREEN_CY],
      rot: 270,
      size: { h: PLINTH_TOP },
      label: 'Bespoke projector plinth, 66 x 24 x 11 1/2',
      note: 'The catalog def is 14" tall because that is what lands a 28 1/2" image bottom on a WALL-mounted frame, where the bottom edge is free. Here it is not free: the screen sets it from below, so this plinth is cut down to 11 1/2" and the image bottom lands at 26" — the bottom of the 26"-28" band, and 2 1/2" less sill standing in the window. Every off-the-shelf console is 21"-36" tall and gets both cases wrong.',
    },
    {
      id: 'picture',
      def: 'projection-image-100',
      at: [IMAGE_CX, SCREEN_CY],
      rot: 270,
      z: IMAGE_BOTTOM,
      label: '100" picture, switched on (evening frame)',
      note: 'The PICTURE, drawn coincident with the fabric at a 26" bottom edge so the hero frame can be an evening one. The catalog tags it render-only, so the analyzer skips it as a second screen of its own accord and the throw is measured against the real fabric.',
    },

    // BLACKOUT. Every bay, sized off the traced bay width plus 3" of overlap for
    // an outside mount, plus side channels — the piece that turns a 98-99% shade
    // into a room a projector can work in.
    ...WINDOW_BAYS.flatMap(([a, b], i) => [
      {
        id: `shade-bay-${i + 1}`,
        def: 'shade-blackout-roller-bay',
        at: [SHADE_CX, (a + b) / 2] as [number, number],
        rot: 270,
        size: { w: b - a + 0.25 },
        label: `Blackout roller, bay ${i + 1}`,
        note: i === 0
          ? 'Roller, not cellular: a cellular tall enough for a 104" head can only be ordered on a continuous cord loop, and four cord loops down a glass wall is a real cost in a minimal room. A roller reaches 144" cordless.'
          : undefined,
      },
      {
        id: `shade-channels-bay-${i + 1}`,
        def: 'shade-side-channels-bay',
        at: [CHANNEL_CX, a + CHANNEL_D / 2] as [number, number],
        rot: 270,
        label: `Blackout side channels, bay ${i + 1} (pair)`,
        note: 'One line item per bay standing for the PAIR of channels, north and south jamb. Only the jamb face is touched, never the mullion.',
      },
    ]),

    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-48x30',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Jarvis Bamboo 48 x 30, 3-Stage 25 3/4"-51 1/4"',
      note: `Top runs x 2.30 to 6.30 on the notch's north wall, ${(DESK_OFF_BAND * 12).toFixed(0)}" clear of the glazing band. User faces north, panel faces south, glass on the left: daylight rakes across the work surface and never down the barrel of the screen.`,
    },
    { id: 'desk-arm', def: 'monitor-arm-single-jarvis', at: [DESK_X, DESK_BACK + 0.25], rot: 0 },
    {
      id: 'monitor',
      def: 'monitor-32',
      at: [DESK_X, MON_Y],
      rot: 0,
      label: '32" 16:9, single panel on the arm',
      note: `One screen, not two — this scheme spends its width on the picture wall instead. A 32" only works because the top is 30" deep: pushed back over the rear edge on the arm it sits ${MON_DISTANCE.toFixed(2)} ft from the parked chair, and on a 27"-deep top it would be too close.`,
    },
    { id: 'desk-tray', def: 'cable-tray-jarvis', at: [DESK_X, DESK_BACK + 0.5], rot: 0 },
    {
      id: 'desk-surge',
      def: 'desk-acc-surge-clamp-fully',
      at: [DESK_X - 1.5, DESK_BACK + 0.35],
      rot: 0,
      note: 'Clamped to the top so the strip travels WITH it. Every cable on this desk survives 25 1/2" of vertical travel a day or it drags on the floor.',
    },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.4, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.55, DESK_BACK + 0.55], rot: 0 },
    {
      id: 'desk-mat',
      def: 'mat-standing-topo',
      at: [DESK_X, 4.2],
      rot: 0,
      note: 'Sits INSIDE the pull-back zone, so the chair rolls clear before the mat is used. Drawn walkable, which is what it is.',
    },
    {
      id: 'desk-chair',
      def: 'chair-branch-ergonomic-pro',
      at: [DESK_X, CHAIR_Y],
      rot: 180,
      label: 'Branch Ergonomic Pro (Aeron adjustability at half the money)',
      note: 'PARKED inside the 2\'-6" pull-back, 4 1/4" clear of the top — not tucked under it, because these desks are solid boxes with no legroom void.',
    },

    // ============================================================== DINING
    {
      id: 'table',
      def: 'dining-gateleg-norden',
      at: [GATE_X, GATE_Y],
      rot: 0,
      label: 'NORDEN gateleg (shown CLOSED as a 10 1/4" console)',
      note: `Three lengths out of one object: 10 1/4" console, 35" for two, 59 7/8" for four. Opened fully it reaches y ${GATE_OPEN_S.toFixed(2)} — into the viewing floor, which is why you cannot have dinner for four and a film at the same time.`,
    },
    {
      id: 'chair-dine-w',
      def: 'chair-frosvi-folding',
      at: [FROSVI_X1, FROSVI_Y],
      rot: 180,
      note: 'Pre-assembled, folds to 3", 30 3/8" tall — just over the glazing rule, so it lives 5\'-5" back from the glass, never against it.',
    },
    { id: 'chair-dine-e', def: 'chair-frosvi-folding', at: [FROSVI_X2, FROSVI_Y], rot: 180 },

    // =============================================================== SLEEP
    {
      id: 'murphy',
      def: 'bed-murphy-queen-closed',
      at: [MURPHY_X, MURPHY_Y],
      rot: 0,
      label: 'Queen Murphy cabinet (shown CLOSED)',
      note: `Closed: 5'-6" x 1'-4" x 7'-0", flush to the bathroom box. Open: the mattress lands over x 13.34-18.84, y 3.24-${BED_DROP_S.toFixed(2)}. Nothing is drawn inside that rectangle.`,
    },

    // ========================================================== THE ROW
    {
      id: 'sofa',
      def: 'sofa-cleon-56-armless',
      at: [SOFA_CX, SOFA_CY],
      rot: 90,
      label: 'Blu Dot Cleon 56" armless — the front row',
      note: `Faces WEST, square on to the middle of the picture at 10'-3 1/4" (38.9 deg), measured seat centre to screen centre the way the analyzer measures it. Its 28" back is 18" under a seated eye, so nothing behind it loses the image. East face 3 7/8" clear of the open mattress.`,
    },
    {
      id: 'chair-view-n',
      def: 'armchair-ekenaset',
      at: [EK_N_CX, EK_N_CY],
      rot: 90,
      label: 'EKENASET, north end of the row',
      note: `Back to the north wall, front lined up with the sofa's. 10'-11 5/8" from the picture = 36.6 deg — half a degree WIDE of the THX maximum of 36, stated as it is rather than rounded down. It is inside the 45 deg near bound by 2'-2 3/8" and nobody has ever complained about 36.6.`,
    },
    {
      id: 'chair-view-e',
      def: 'armchair-ekenaset',
      at: [EK_E_CX, EK_E_CY],
      rot: 90,
      label: 'EKENASET, back row',
      note: `13'-9 3/4" from the picture = 29.5 deg, within half a degree of the SMPTE reference. It sits in the band south of where the mattress lands — 9 1/2" clear of the foot — because that is the only 5'-6" of floor in the room that is neither the sofa strip nor the bed.`,
    },
    {
      id: 'side-tables',
      def: 'side-vittsjo-nesting-glass',
      at: [SIDE_CX, SOFA_CY],
      rot: 90,
      label: 'VITTSJO nesting pair, tempered glass',
      note: 'The only table in the catalog you can see the floor through, which is the right thing to put between a sofa and a 100" picture. 16 3/8" of shin room to the sofa front. Black steel matches the anodised glazing exactly.',
    },
    { id: 'side-lamp', def: 'lamp-table-ceramic', at: [SIDE_CX, 9.3], rot: 0, z: SIDE_H },
    {
      id: 'rug',
      def: 'rug-nordicknots-desert-8x10',
      at: [RUG_CX, RUG_CY],
      rot: 0,
      label: 'Nordic Knots Desert 8 x 10, wool/jute, 7 mm',
      note: 'Runs x 4.40-12.40, y 3.40-13.40: under the sofa\'s front legs, under both chairs, and stopping 8" short of the plinth so the millwork reads as built-in. At 0.28" it is the thinnest rug here and needs no shimming.',
    },
    {
      id: 'plant',
      def: 'plant-medium-40in',
      at: [4.0, 12.6],
      rot: 0,
      note: 'South-west corner, 2\'-8" back from the glass so a 40" plant never sits in the glazing band, and 3\'-10" clear of the plinth\'s working strip.',
    },

    // =============================================================== ENTRY
    {
      id: 'entry-shoes',
      def: 'entry-trones-shoe',
      at: [28.6, S_FACE_EAST - 0.02 - 0.59375 / 2],
      rot: 180,
      note: 'Wall-hung and 7 1/8" deep, so it costs zero floor and stays out of a 3\'-2" front door that swings into a 3\'-5" nook.',
    },
  ],
  notes: [
    'THE PICTURE — GEOMETRY. 100" 16:9 = 87.16" x 49.03" = 7\'-3 1/8" x 4\'-1". The screen is a VIVIDSTORM S PRO motorised floor-rising UST ALR (VSDSTUST100H), cabinet 8\'-2 1/2" x 9 1/2" x 8 1/4", standing at the west glazing on a 17 3/4" bespoke sill plinth with its back 4 1/4" off the glass and its fabric plane at x = 1\'-8 3/4". The projector is a Hisense PX3-PRO at 0.22:1 standing on an 11 1/2"-tall bespoke plinth: rear panel 8 1/2" east of the fabric (Hisense\'s own interpolated rear-of-cabinet gap at 100"), lens 10.65" inside the rear panel, so the lens sits 19 1/8" from the fabric where 0.22 x 87.16" = 19 3/16" is wanted. That is 1/32" of error on a check that tolerates 3".',
    'IMAGE HEIGHT — THE NUMBER THAT NEARLY KILLED THIS SCHEME, and the reason there are two plinths in it. A floor-riser\'s fabric does NOT start at the floor: the screen stands on its own 8.27" stowage cabinet and the 49.1" of fabric rises out of the LID, so the picture\'s bottom edge is 8 1/4" above whatever the cabinet stands on. A UST\'s bottom edge, meanwhile, is ~14 1/2" above the surface the PROJECTOR stands on for a 100" image — the figure the catalog\'s 14" plinth is derived from. Put the cabinet on the floor and the projector on that 14" plinth, which is what a wall-mounted frame wants, and the beam lands 20 1/4" ABOVE the top of the fabric: two thirds of the picture on the glass and the mullions, and the bottom 20 1/4" of a $1,962 ALR screen showing nothing. NO ANALYZER CATCHES THIS — throw-distance is a plan check and there is no vertical test in the tool at all. The fix is to solve the pair as simultaneous equations with the image bottom as the free variable: sill + 8 1/4" = projector plinth + 14 1/2". At a 26" image bottom — the bottom of the 26"-28" band, chosen LOW because every inch of image height is an inch of sill standing in front of the glazing — that is a 17 3/4" sill plinth and an 11 1/2" projector plinth. Image bottom 26", centre 50 1/2", top 6\'-3". THE COST, stated as a cost: the window now carries a 2\'-2"-tall bench and not an 8 1/4" curb.',
    'BLACKOUT IS A CO-REQUISITE, NOT A FINISH. At 100" on a 0.6-gain screen a 2,700-lumen projector makes 54 fL of peak white, and a screen face taking 500 lux of ambient — conservative for a wall 18 ft from an uncurtained west glass wall at midday — sits at 28 fL of BLACK. That is 1.9:1 in-room contrast: a grey rectangle. A 5,000-lumen unit only gets to 3.6:1. And an ALR screen does not save it, because in this scheme the audience faces due WEST, straight down the sightline at the glazing — the one direction a lenticular screen cannot reject. So all four bays carry a blackout roller sized to the traced bay width plus 3" of overlap, plus side channels on both jambs. DAYLIGHT VIEWING IN THIS UNIT IS NOT POSSIBLE, in any scheme, and this one is honest about it: it is an evening room.',
    'WHY THE SCREEN STANDS 4 1/4" OFF THE GLASS. The roller has to drop PAST the sill plinth and the cabinet to the floor. Flush to the glass it would land on the cabinet lid 2\'-2" up and leave a 2\'-2" slot of bare glass behind an ALR fabric that Vividstorm will not confirm as opaque — which would be back-lit from mid-afternoon and would collapse the black level. Get opacity in writing anyway; the shade closing behind the screen is the belt to that braces.',
    'SEATING — RE-MEASURED BY HAND, because the first pass over-stated two of the three. Distances are seat CENTRE to screen CENTRE, which is what analysis.ts measures: the 56" armless Cleon square on at 10\'-3 1/4" (38.9 deg), an EKENASET at the north end of the row at 10\'-11 5/8" (36.6 deg), and a second EKENASET in the back row at 13\'-9 3/4" (29.5 deg, within half a degree of the SMPTE reference). One row, three pieces, four places, all facing west. Every one is inside the 8\'-9 1/4" near bound and the 18\'-8" far bound for a 100" picture, with 1\'-6" of margin at the near end. TWO HONEST CORRECTIONS to what an earlier draft of this file claimed: the sofa is 38.9 deg and not 37.9, and the north EKENASET is 36.6 deg — half a degree WIDE of the THX maximum of 36, not inside it. The spread is 29.5-38.9 deg, which is a good ladder and is still nowhere near the 45 deg limit; the point of writing it down correctly is that the room is 4" tighter than it was sold as. The sofa back is 28", both chair backs are 29 7/8", the VITTSJO tops are 19 5/8" of glass and the projector plinth is 11 1/2" — a seated eye is 46", so NOTHING in this room crosses a sightline and the checker reports no sightline findings at all.',
    'TRADE-OFF — THERE IS NO FRONT ROW ON THE FLOOR. An ALSEDA at 6 3/4" puts an eye at 30", at or below the bottom of the image, so floor cushions belong in FRONT of the sofa, not behind it. They cannot go there. The 45 deg near-bound line falls at x = 10\'-1 1/4" and the sofa\'s own front face is at x = 10\'-2 1/4" — one inch east of it. Everything west of the sofa is inside the near bound and inside the throw path, so the floor between the plinth and the sofa stays empty except for the glass tables. Put a beanbag there and you are six feet from a 100" image.',
    'TRADE-OFF — THE SOFA STRIP IS 3\'-3" DEEP AND THAT IS ALL THERE IS. The open mattress lands over x 13\'-4" to 18\'-10" and the near bound sits at x 10\'-1 1/4"; what is left between them is 3\'-3". A 34"-deep sofa fills it, which is why the Cleon is the 34" armless one and not a 38"-deep modular, and why the third seat had to go into the band south of the bed instead of behind the sofa. There is no sectional and nothing here is long enough to lie on — and to be straight about it, no scheme in this set has one: A carries the same 56" armless Cleon, C has no upholstery at all and D\'s Cleon is turned the other way. In 448 sq ft with a queen and a Jarvis in it, the thing you lie on is the bed.',
    'BED. A queen Murphy, cabinet 5\'-6" x 1\'-4" x 7\'-0", on the wide leg\'s north wall flush to the bathroom box (x 13\'-4" to 18\'-10"). Open, the mattress swings south to y 10\'-4 7/8" over the same 5\'-6" of width. NOTHING IS DRAWN INSIDE THAT RECTANGLE and nothing has to move to drop the bed: the sofa\'s east face stops 3 7/8" short of the mattress edge, the north EKENASET stops 7 1/8" short, the back-row EKENASET stops 9 1/2" short of the foot, and the rug stops 11 1/4" short. The bed comes down without anybody lifting anything, every night, and that is the single claim this whole scheme is built to make.',
    'BED ACCESS — THE HONEST VERSION, AND IT IS THE WORST THING IN THIS LAYOUT. Open, the mattress is a ONE-ENDED bed: its east long side is the bathroom partition, its west long side has the sofa 3 7/8" away, and you get in and out over the FOOT, where there is 3\'-1" of clear band. For one sleeper that is unremarkable. For two it means the far person crawls, every night. And the geometry says it cannot be fixed by rearranging: the near bound puts the sofa\'s front face at x 10\'-2 1/4" and the mattress edge is at 13\'-4", so the widest west aisle physically available between them is 4 7/8". If two people share this bed nightly, the trade on offer is to slide the sofa 1\'-8" west — that buys a 1\'-8" aisle and costs you 44 deg of subtended angle instead of 38, which is legal but is the widest front row anyone recommends. Take the aisle or take the picture; there is no arrangement that gives both.',
    'BED — NO NIGHTSTAND, AND NO WARDROBE. The only wall beside the open mattress is the cabinet itself and the bathroom partition, and a floating shelf on the partition would hang out over the mattress at 22". Use the Murphy\'s own fold-out shelf, or drag the small VITTSJO over. Clothes live entirely in the 8\'-0" run of reach-in closets on the south wall, because the Murphy has taken the last spare wall and there is no floor for a PAX. Both are real costs of a wall bed and neither is solvable by buying more furniture.',
    'DESK ORIENTATION. Jarvis Bamboo 48 x 30 on the notch\'s north wall, top running east-west from x 2\'-3 5/8" to 6\'-3 5/8", user facing north, the 31.5" panel facing SOUTH, the glazing on the user\'s LEFT. The west glass takes direct sun from about 3pm to sunset; a panel facing into it or away from it is unreadable every afternoon, and only north or south puts the light across the work surface instead of down the barrel. The top\'s west edge is 8 1/2" clear of the 1\'-0" glazing band and 1\'-8 1/2" off the glass face.',
    'DESK PULL-BACK. The full 2\'-6" of CLEARANCE.deskChair is reserved in front of the top (y 3.15 to 5.65) and the Branch Pro — 24" deep — is drawn PARKED inside it, 4 1/4" clear of the top edge, not tucked under it. The sourced real-world minimum for a task chair to roll back and stand is nearer 3\'-0", and THIS LAYOUT ACHIEVES IT AND MORE: the first solid object south of the top at the user\'s centreline is the 40" plant, 8\'-8" away, so the chair can roll back as far as anyone wants. Nothing else stands in the zone; the TOPO mat is inside it and is drawn walkable, which is what it is.',
    'WHAT THE RAISED SCREEN DOES TO THE DESK. Honestly: it takes most of the desk\'s daylight. The cabinet runs y 4\'-4 3/4" to 12\'-7 1/4", so with the screen UP it covers the south 1\'-1" of bay 1, all of bay 2 and all of bay 3, leaving bay 1\'s north 1\'-7" and the whole of bay 4 clear. And with the blackout closed for a film, the desk has no daylight at all. That is not a flaw to be argued away — it is the scheme: you do not work while the picture is on. Stowed, the assembly is 2\'-2" tall, so the desk gets everything above 2\'-2" of the glass wall back — 6\'-6" of the 8\'-8" head, over the same three bays. That is less than the 8 1/4" curb an earlier draft of this file promised and it is still more than any wall-mounted screen in this unit can offer, because a wall-mounted screen returns none of the window at any time.',
    'GLAZING RULE, AND THE THREE WARNINGS IT PRODUCES. The project rule is nothing over 2\'-6" within 1\'-0" of the glass. Stowed, the sill plinth plus the cabinet lid measure 2\'-2" — 4" under the rule, which is the whole margin this scheme has and is inside the traced plan\'s own +/-3 5/8" tolerance, so somebody puts a laser on the west reveal before that plinth is cut. DRAWN RAISED — which is the state the throw and seating geometry have to be checked in — the screen is 6\'-3 1/8" tall in the band, so the checker reports blocks-window against bays 1, 2 and 3. Those three warnings are the scheme, stated by the analyzer: a raised screen covers the window it is raised in front of. Judge the layout in both states. The sill plinth would raise the same three findings on the same three bays at 2\'-2", which is why it is drawn with ignoreAnalysis and argued here instead — its footprint is identical to the screen\'s and it can tell you nothing the screen has not. Everything else in the room clears the band: the desk top is 8 1/2" outside it, the projector plinth 1 3/8" outside it, the plant 2\'-8" back and the folding chairs 5\'-5" back.',
    'DINING. A NORDEN gateleg on the north wall hard against the step corner, drawn CLOSED as a 10 1/4"-deep console with two FROSVI folding chairs parked in front of it. One leaf gives 35" and seats two; both leaves give 59 7/8" and seat four, reaching y 5\'-7 5/8" — into the viewing floor. So it is a console most of the time, a two-top at lunch, and a four-top for dinner with the chairs and the small VITTSJO moved. Three lengths out of one object is the only way a 448 sq ft plan carries a dining table at all. FROSVI arrives pre-assembled and folds to 3", so two more live flat against the laundry wall and come out for a screening; anywhere east of x = 10\'-1" they clear the 8\'-9 1/4" near bound.',
    'CIRCULATION. With the bed CLOSED the walk past the row is the 2\'-8 7/8" band between the sofa and the kitchen aisle line, plus the kitchen aisle itself, which is walkable floor even though no furniture may stand in it. Every required route measures a full 3\'-0" usable or better — front door to bathroom 3\'-6", to the sink 3\'-0", to the west windows 3\'-0", bathroom to bed 3\'-0", sink to fridge 4\'-4" — and 3\'-0" is CLEARANCE.walkway itself, not a squeeze. The band NORTH of the sofa is not a route: the north EKENASET closes it to 9 3/4", deliberately, because a chair in a 3\'-3" strip either faces the picture or acts as a corridor and this one faces the picture. With the bed DOWN, the 3\'-1" band south of the mattress is the route from the bed to the bathroom door, 2\'-11 1/4" of it clear east of the back-row chair; getting from the bed to the DESK, though, means going east, south into the kitchen aisle, west along it and back north into the west bay — about eight extra paces. Say that to the client before they sign off on a wall bed.',
    'BUILT-INS. The 3\'-6" kitchen work aisle, the 3\'-0" fridge and laundry zones, the 2\'-6" strip in front of the reach-in closets, the bathroom door swing and the 3\'-2" front door arc are all held clear, so every appliance door, both bifolds and all four closet doors open on to empty floor. The only thing in the entry nook is a wall-hung TRONES stack at 7 1/8" deep, because an angled front door in a 3\'-5" nook has room for nothing with real depth.',
    'DENSITY. The checker reports 83% free floor (371 of 448 sq ft) and calls the room under-furnished. That is an artefact of drawing the bed CLOSED: the Murphy contributes 7.3 sq ft as a cabinet and 39.4 sq ft as a bed, so with the mattress down the same layout is nearer 76%, which is ordinary for a studio. It is also the measurable form of the scheme\'s whole argument — 32 sq ft of floor bought back for sixteen hours a day. Judge it from both states, as with the glazing warnings.',
    'BUDGET — $16,848 of catalogue lines, and the shape of it is the point. The cinema is $6,061 (screen $1,962 + PX3-PRO $2,799 + projector plinth $650 + sill plinth $650), the blackout is $1,320 (four rollers plus four sets of side channels), the bed is $2,400, and the desk kit is $3,236 (Jarvis Bamboo 48 x 30 $1,325, single Jarvis arm $175, 32" panel $799, clamp surge $85, CPU sling $99, TERTIAL $15, TOPO mat $139, Branch Pro $599, cable tray included with the desk). Soft furniture, rug, tables, plant and dining together are only $3,831 — a quarter of the total. Two thirds of this layout is a bed that folds and a picture that hides, which is exactly what the client is buying. If the number has to come down, the honest cuts are the 32" panel for a 27" (saves $350), the Branch Pro for a MARKUS (saves $299) and the Nordic Knots for a STOENSE (saves $235) — not the blackout, which the projector does not work without.',
    'BUDGET CAVEAT. These are catalogue prices for furniture only and three of the big ones are soft. The $2,400 Murphy is the cabinet and mechanism: ADD $700-1,200 for a queen mattress, which is not drawn because it lives inside the cabinet. Vividstorm sells this exact SKU at $1,962 direct and $1,649 through ProjectorScreen.com — a 19% channel spread, so the screen line could be $300 lighter. BOTH plinths are joinery ALLOWANCES of $650 and neither is a quotation — and the sill plinth is the softer of the two, because it is 8\'-2 1/2" long rather than 5\'-6" and it has to hold an 8\'-2" cabinet dead level and dead parallel to the glass; a UST turns a millimetre of yaw into visible trapezoid. Price it as a run of casework, not as a box. The $210 shade is an estimate for a configured 36" x 106" blackout and bay 4 is 3\'-6" wide, so that line is higher; the $120 channel price is an estimate too, from a vendor who publishes neither lengths nor prices. Bedding, cookware, the TRONES stack, electrical work for a floor outlet at the screen and the kitchen itself are all outside the number.',
    'WHAT THIS SCHEME CANNOT DO — AND THE ONE THAT WAS FOUND IN REVIEW. It does not give the window back completely: the sill plinth the vertical geometry demands is a 2\'-2" x 9 1/2" x 8\'-2 1/2" bench standing permanently in front of bays 1 to 3, and the earlier claim that this screen stows "lower than a shoe rack" was simply wrong — it stows lower than a kitchen counter. It cannot show a picture in daylight — no scheme in this unit can, but this one puts the audience facing the glass, so it is the least forgiving of a half-closed shade. It cannot seat more than three people properly: the fourth and fifth guests get folding chairs. It has no sofa long enough to lie on and no second row. It has no nightstand and no wardrobe. It cannot run the dining table open and the picture at the same time. And it asks the client to trust a motorised screen mechanism as the thing that stands between them and the view: if it fails stowed you have no cinema, and if it fails raised you have no window until someone comes to fix it.',
  ],
};

export default layout;
