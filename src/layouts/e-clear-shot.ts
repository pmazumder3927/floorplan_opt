/**
 * LAYOUT E — "Clear shot"
 *
 * STRATEGY: make the picture unobstructed from every seat, and let every other
 * decision fall out of that. This is the only scheme in the folder where you can
 * sit down anywhere and see 100% of the image — and, since the queen went onto
 * the wall, the only one where the room is a living room rather than a bedroom
 * with a screen in it.
 *
 * THE COMPLAINT THIS SCHEME EXISTS TO ANSWER. Layout A is the right idea — a
 * 100" UST ALR frame on the bathroom partition, which is the only blank
 * west-facing wall in the unit — but it puts the desk on the wide leg's north
 * wall, and that wall is INSIDE the cone between the sofa and the picture. The
 * numbers, measured rather than asserted: from the north end of A's sofa the ray
 * to the image's top-north corner passes straight through the parked task chair
 * between y 7'-5" and y 6'-5", and the desk's south-east corner at (16'-0",
 * 5'-8 7/8") grazes the image's top corner exactly. Sampling five eye positions
 * across each seat against a 13 x 13 grid of points on the picture, A's sofa sees
 * 91.5% of the image, its poufs 86.6% and 89.7%, and the bed 52.2%. THE REPO'S
 * OWN ANALYZER REPORTS ZERO SIGHTLINE WARNINGS FOR ALL OF THAT, because it casts
 * one ray from seat centre to screen centre and nothing is standing on that one
 * line. scripts/sightline.ts was written for this layout and casts the grid; run
 * it and the defect is visible in every scheme in the folder, not just A.
 *
 * THE FIRST MOVE. THE DESK GOES IN THE NORTH-WEST NOTCH. That alcove — 9'-4 1/8"
 * wide and 2'-7 1/8" deep — is the only floor in this plate that no seat-to-screen
 * ray crosses, because it is north-WEST of every seat while the picture is due
 * EAST of them. A Jarvis at 27" deep fits it with 4 1/8" to spare, so the alcove
 * is very nearly a desk-shaped hole, and the chair's pull-back lands in open floor
 * with 2'-10" behind it rather than the 2'-6" layout A had to reserve. Every
 * other position was tested and every one of them fails: put the desk anywhere on
 * the wide leg's north wall and the chair sits in the fan of rays; put it on the
 * south edge and the chair sits in the fan of rays from the other side.
 *
 * THE SECOND MOVE, AND IT IS THE ONE THAT MAKES THE ROOM. Taking the notch takes
 * the queen's bedroom, so the queen goes ONTO THE WALL: a Lori queen vertical
 * wall bed on the wide leg's north wall, 6'-11" of plywood cabinet by day and a
 * bed only when there is someone in it. An earlier version of this scheme stood a
 * headboard-less platform queen out in the middle of the floor instead — it was
 * cheaper by $2,010, it passed every check, and it was not elegant: from the sofa
 * you looked past a made bed at the picture. The wall bed is the answer to that,
 * and it turns out the geometry LIKES it. The cabinet stands on the one wall no
 * ray reaches, so at 6'-11" tall it obstructs nothing. Deployed, the platform is
 * 20" made up — 8 1/2" below the 28 1/2" floor of every sightline — so you can
 * watch the film from the bed as well as from the sofa. And there is exactly one
 * x it fits at: 6" of slack in the whole run. See "the sleeper" below.
 *
 * WHAT IT BUYS. With the desk off the north wall the sofa sits ON the screen's
 * centreline for the first time in the folder: 0.0 degrees off axis at 12'-10" of
 * standoff, subtending 31.5 degrees, which is between the SMPTE reference of 30
 * and the THX maximum of 36. Layout A's sofa is 13.7 degrees off axis because a
 * queen, a sofa and a walkway would not fit across the notch any other way. The
 * scheme returns NO errors and NO warnings from `pnpm check`, which no other
 * layout in the folder does, and 100.0% of the picture from every seat, which no
 * other layout manages from ANY seat.
 *
 * WHAT IT COSTS. $12,733 of catalogue against layout A's $16,118 — but the wall
 * bed is $2,159 of that, which puts the furniture-only figure at $6,777 against a
 * $6,000 brief. That overrun is real and it is entirely the bed; the BUDGET notes
 * name the two levers that close it, and the SECONDHAND note names a third that
 * closes it twice over.
 *
 * DESK ORIENTATION — the house rule from faces.ts, obeyed: the top runs
 * east-west on a north wall, the user faces NORTH, the panel faces SOUTH, and the
 * west glazing is on the user's LEFT. In the notch the user also has their back
 * to the room and to the screen, which is the correct way round for both jobs.
 *
 * WHAT THIS SCHEME CANNOT DO, stated up front. It is still an evening room — the
 * blackout arithmetic in layout A is physics and it has not changed. The floor in
 * front of the sofa is the bedroom at night, so it has to stay empty by day: no
 * coffee table, and the analyzer calls the room under-furnished at 85% free floor.
 * Dining is a wall-mounted drop-leaf for two whose chairs live twelve feet away in
 * the second row. And the wall bed hangs on SIX SCREWS INTO STUDS in a wall
 * nobody has probed, and takes a mattress no thicker than 10" and no heavier than
 * 80 lb — both are hard specifications, not fine print.
 */

import type { Layout } from '@/core/types';
import { formatFtIn } from '@/core/units';
import {
  BATH_S_FACE,
  BATH_W_FACE,
  N_FACE,
  N_FACE_WIDE,
  S_FACE_EAST,
  W_FACE,
  WINDOW_BAYS,
} from './faces';

// ---------------------------------------------------------------- the picture
// Unchanged from layout A, deliberately: the client signed off the AV and the
// throw geometry, and re-deriving it here would only invite drift. A 100" 16:9
// image is 87.157" x 49.032"; every distance below is measured to the IMAGE, not
// to the frame, which is 1 1/4" bigger in each direction.
const IMAGE_W = 7.26312; // 87.157"
const IMAGE_H = 4.08583; // 49.032"

const SCREEN_D = 0.125; // 1 1/2", estimated in the catalog entry
const SCREEN_X = BATH_W_FACE - SCREEN_D / 2; // 18.8025
const FABRIC_X = BATH_W_FACE - SCREEN_D; // 18.74 — the plane every throw is measured to
// Centred on the 9'-10 1/4" partition: image y 4'-6 3/16" to 11'-9 3/8".
const SCREEN_Y = (N_FACE_WIDE + BATH_S_FACE) / 2; // 8.1475
const IMAGE_BOTTOM = 28.5 / 12; // 2.375 — the number the whole layout is built on
const SCREEN_Z = IMAGE_BOTTOM - (4.18333 - IMAGE_H) / 2; // 2.32625

// PX3-PRO: fixed 0.22:1, lens 10.65" in from the rear face.
const PROJ_D = 0.975; // 11.7"
const LENS_OFFSET = 0.8875; // 10.65"
const THROW_D = 0.22 * IMAGE_W; // 1.59789 = 1'-7 3/16"
const REAR_GAP = THROW_D - LENS_OFFSET; // 0.71039
const PROJ_X = FABRIC_X - REAR_GAP - PROJ_D / 2; // 17.54211
const PLINTH_D = 2.0;
const PLINTH_H = 14 / 12; // the projector's z
const PLINTH_X = BATH_W_FACE - PLINTH_D / 2; // 17.865 — west face at 16.865

// ------------------------------------------------------------------ the study
// THE NOTCH IS THE WHOLE SCHEME. x 0.59..9.93, y 0.63..3.22 — 9'-4 1/8" by
// 2'-7 1/8". Nothing here is inside any seat-to-screen ray, so this is where the
// two tallest objects in the apartment go: the desk and the chest of drawers.
const DESK_W = 5.0; // 60" of top, east-west
const DESK_D = 2.25; // 27" — see the catalog note; a 30" top leaves 1" at the front
const DESK_X = 4.5; // top runs x 2'-0" .. 7'-0"
const DESK_Y = N_FACE + 0.02 + DESK_D / 2; // 1.775 -> y 0.65 .. 2.90
const DESK_BACK = DESK_Y - DESK_D / 2; // 0.65
const DESK_FRONT = DESK_Y + DESK_D / 2; // 2.90
// Series 1 parked, not tucked: the desks in this model are solid boxes.
const CHAIR_D = 1.979167; // 23 3/4"
const CHAIR_Y = DESK_FRONT + 0.03 + CHAIR_D / 2; // 3.9196 -> y 2.93 .. 4.91

// TONSTAD 4-drawer chest fills the rest of the notch. 35 3/8" tall, which is why
// it can only live here — see its catalog note.
const CHEST_D = 1.541667; // 18 1/2"
const CHEST_W = 2.6875; // 32 1/4"
const CHEST_X = 7.15 + CHEST_W / 2; // 8.49375 -> x 7.15 .. 9.8375, 1 1/8" off the step
const CHEST_Y = N_FACE + 0.02 + CHEST_D / 2; // 1.4208 -> y 0.65 .. 2.19

// ------------------------------------------------------------------ the lounge
// The x budget across the room, west glass face to plinth west face, is 16'-3 1/4".
// BY DAY only 5'-9 1/8" of it is spent — 3'-2" of promenade and 2'-7 1/8" of sofa
// — and the remaining 10'-5 3/4" is open floor. BY NIGHT that 10'-5 3/4" is spent
// exactly: 2'-9 7/8" of aisle, 5'-4" of deployed bed, 2'-3 7/8" of aisle. Which is
// why the day-room cannot have a coffee table in it — see the TRADE-OFF note.
const PROMENADE = 3.2;
const SOFA_D = 2.59375; // 31 1/8" — 2 7/8" shallower than the Cleon, which is the point
const SOFA_W = 4.822917; // 57 7/8"
const SOFA_BACK = W_FACE + PROMENADE; // 3.49
const SOFA_FRONT = SOFA_BACK + SOFA_D; // 6.08375
const SOFA_CX = SOFA_BACK + SOFA_D / 2; // 4.786875
const SOFA_CY = SCREEN_Y; // 8.1475 — DEAD ON THE CENTRELINE. This is the win.
// 12'-10" of standoff, subtending 31.5 deg at 0.0 deg off axis.

// ----------------------------------------------------------------- the sleeper
// A LORI QUEEN VERTICAL WALL BED. Sixteen hours a day there is no bed in this
// apartment at all; the rest of the time it lands on the floor the sofa is
// already looking across.
//
// THE POSITION IS NOT A CHOICE — there is exactly one x that works. Between the
// sofa's front face and the plinth's west face there is 10'-5 3/4". The cabinet
// is 5'-4" wide, which leaves 5'-0" to split, and CLEARANCE.bedSide wants 2'-0"
// down BOTH long sides of anything a queen wide. That is the whole freedom: 6"
// of slack, total. It also pushes the cabinet 8 11/16" west of the notch step at
// x 9'-11 1/8", so that much of its back stands proud of the wall and needs a
// finished return panel — which is millwork this scheme is already buying, and
// which incidentally gives the study alcove an east jamb it did not have.
const CAB_W = 5.333333; // 64"
const CAB_D = 1.916667; // 23" closed
const OPEN_D = 8.75; // 105" from the wall, cabinet included
const SPAN = 16.865 - SOFA_FRONT; // 10.481 — sofa front to plinth west face
// Centred it would sit at x 8'-11 1/2" with 2'-6 7/8" a side; it is nudged 3"
// EAST of centre so the chest of drawers in the notch keeps the clear floor it
// needs to open, which costs the east aisle 3" and still leaves both sides over
// the 2'-0" rule.
const BED_X0 = SOFA_FRONT + (SPAN - CAB_W) / 2 + 0.25; // 9.2077
const BED_X = BED_X0 + CAB_W / 2; // 11.874 -> x 9.208 .. 14.541
const CAB_Y = N_FACE_WIDE + 0.02 + CAB_D / 2; // 4.198 -> y 3.24 .. 5.157
const BED_DROP_S = N_FACE_WIDE + 0.02 + OPEN_D; // 11.99 — the deployed foot

// ------------------------------------------------------ the second row and dining
// Two rattan poufs south of the sofa, 29.0 and 32.7 deg — a real second row that
// is 16 1/8" tall and therefore cannot obstruct anything, ever.
const POUF_Y = 11.6;
const POUF_W_X = 4.3;
const POUF_E_X = 6.05;

// The north-east pocket, x 14'-4 7/16" to 18'-10 3/8" by y 3'-2 5/8" to 5'-4 3/4",
// is dead floor in every other scheme. It takes the drop-leaf and the greenery.
const NORBERG_D = 0.489583; // 5 7/8" FOLDED — it opens 23 5/8" south over the bed aisle

const layout: Layout = {
  id: 'e-clear-shot',
  name: 'E — Clear shot',
  description:
    'The sightline scheme: the desk moves into the north-west notch — the only floor in this plate no seat-to-screen ray crosses — and the queen goes onto the wall, so sixteen hours a day there is no bed in the apartment at all. 100% of the picture from every seat, a sofa dead on the screen centreline, no errors and no warnings, and $3,385 off layout A.',
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
      note: 'Unchanged from layout A, and the client signed it off: back flat on the bathroom partition, centred, 1\'-3 1/2" of blank wall each side. The 28 1/2" image bottom is not a styling number in this scheme — it is the floor of every sightline calculation in the file, because a ray from a 46" seated eye to a 28 1/2" image bottom never falls below 28 1/2".',
    },
    {
      id: 'image',
      def: 'projection-image-100',
      at: [FABRIC_X - 0.004167, SCREEN_Y],
      rot: 90,
      z: IMAGE_BOTTOM,
      label: 'The picture, switched on',
      note: 'Coincident with the fabric plane. Every seat in this layout sees 100.0% of this rectangle — sampled at five eye positions per seat against 169 points on the image. No other layout in the folder manages it from any seat.',
    },
    {
      id: 'plinth',
      def: 'plinth-ust-bespoke-66',
      at: [PLINTH_X, SCREEN_Y],
      rot: 90,
      label: 'Bespoke UST plinth, 66 x 24 x 14',
      note: 'Millwork, unchanged from A: 14" is what puts the image bottom at 28 1/2" and the centre at 53". Its 2\'-0" of push-open floor is the same floor as the bed\'s east access aisle, which is the one place in this plan where two clearances share ground on purpose rather than by accident.',
    },
    {
      id: 'projector',
      def: 'projector-ust-hisense-px3-pro',
      at: [PROJ_X, SCREEN_Y],
      rot: 90,
      z: PLINTH_H,
      label: 'Hisense PX3-PRO, 0.22:1, on the plinth',
      note: 'Rear of the cabinet 8 1/2" off the fabric, lens 1\'-7 3/16" off it. Nothing in this layout stands in the light cone, which spreads from the lens at x 17\'-6 1/2" out to the full image width — the north-east pocket looks like it should be a problem and is not, because the cone at x 18\'-0" spans only y 6\'-9" to 9\'-6 1/2".',
    },

    // ============================================================= BLACKOUT
    // ROLLERS, not cellular, and the reason is now a verified price rather than
    // a preference — see the BLACKOUT note.
    ...WINDOW_BAYS.flatMap((bay, i) => {
      const cy = (bay[0] + bay[1]) / 2;
      const w = bay[1] - bay[0];
      return [
        {
          id: `shade-${i + 1}`,
          def: 'shade-blackout-roller-bay',
          at: [W_FACE + 0.15, cy] as [number, number],
          rot: 270,
          size: { w },
          label: `Blackout roller shade, bay ${i + 1}, ${formatFtIn(w)} wide`,
        },
        {
          id: `channels-${i + 1}`,
          def: 'shade-side-channels-bay',
          at: [W_FACE + 0.15, cy] as [number, number],
          rot: 270,
          label: `Blackout side channels, bay ${i + 1} (pair)`,
        },
      ];
    }),

    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-jarvis-laminate-60x27-oak',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Fully Jarvis 60 x 27 oak laminate, 3-stage 25 3/4"-51 1/4"',
      note: 'IN THE NOTCH, which is the whole scheme. Back to the alcove\'s north wall, user facing north, panel facing south, west glazing on the user\'s left — the faces.ts rule, obeyed, and here it also puts the user\'s back to the room. 27" deep rather than 30" because the alcove is 2\'-7 1/8" deep: a 30" top leaves 1" at the front, a 27" leaves 4 1/8".',
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
      def: 'monitor-lg-27up850n',
      at: [DESK_X, DESK_BACK + 0.4],
      rot: 0,
      label: '27" 4K USB-C panel, facing south',
      note: '27" rather than layout A\'s 32", and it saves $400. On a 27"-deep top in a 2\'-7" alcove a 32" panel sits closer to the face than it should, and this scheme has a real dining table so the desk no longer has to be the dinner table too. White bezel: in a pale alcove the monitor is the only large dark object in the room.',
    },
    { id: 'desk-tray', def: 'cable-tray-jarvis', at: [DESK_X, DESK_BACK + 0.5], rot: 0 },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.8, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-tertial-work', at: [DESK_X - 1.9, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.4], rot: 0 },
    {
      id: 'desk-chair',
      def: 'chair-steelcase-series1',
      at: [DESK_X, CHAIR_Y],
      rot: 180,
      label: 'Steelcase Series 1, Oatmeal',
      note: 'THE PIECE THAT CAUSED ALL THIS. In layout A the parked task chair is what eats 7-14% of the picture from the seats. Here it stands in the notch, outside every ray, and it is also a lower-backed chair than the Aeron it replaces — 41 1/4" at maximum against the Aeron\'s 43". Parked, not tucked, with 2\'-10" of clear floor south of the top against the 2\'-6" the analyzer asks for.',
    },
    {
      id: 'shelf-desk',
      def: 'shelf-string-pocket',
      at: [CHEST_X, N_FACE + 0.25],
      rot: 0,
      z: 4.0,
      label: 'String Pocket, 48" AFF over the chest',
      note: 'OVER THE CHEST, NOT OVER THE DESK, and that is a sit-stand consequence rather than a preference: the Jarvis top rises to 51 1/4" and the panel on its arm rides with it to about 73", so ANY shelf over that desk is either unreachable or in the way of the top. Over the 35 3/8" chest nothing moves, so 48" is simply the right height — the shelf occupies 48" to 67 3/4" with 12 5/8" of clear air above the chest. $230 against the $645 String 3-bay the earlier layouts carried.',
    },
    {
      id: 'chest',
      def: 'dresser-tonstad-4drawer',
      at: [CHEST_X, CHEST_Y],
      rot: 0,
      label: 'TONSTAD 4-drawer chest, oak veneer',
      note: 'THE DRESSER LAYOUT A COULD NOT HAVE. At 35 3/8" it is the second-tallest object in the apartment and on the 46 - 17.5t ray it would block over the last 40% of any run to the picture — so it can only exist because the notch is outside every ray. 4.0 cu ft of soft-close drawers, 1 1/8" off the step, sharing the alcove with the desk.',
    },

    // =============================================================== LOUNGE
    {
      id: 'sofa',
      def: 'sofa-saltmyran-58-loveseat',
      at: [SOFA_CX, SOFA_CY],
      rot: 270,
      label: 'SALTMYRAN 2-seat, facing east at the screen',
      note: 'ON THE SCREEN CENTRELINE — 0.0 deg off axis, which no other layout in this folder achieves. 12\'-10" of standoff subtending 31.5 deg, between the SMPTE reference of 30 and the THX maximum of 36. Layout A\'s Cleon sits 13.7 deg off axis at 36.2 deg because a queen, a sofa and a walkway will not fit across the notch any other way; move the desk and the geometry unlocks. 31 1/8" deep, which is 2 7/8" shallower than the Cleon — those inches are the 2\'-10" walk behind it.',
    },
    {
      id: 'pouf-w',
      def: 'pouf-tolkning-rattan-20',
      at: [POUF_W_X, POUF_Y],
      rot: 270,
      label: 'TOLKNING rattan storage pouf (second row)',
      note: '14\'-1" from the picture, subtending 29.0 deg — a whisker outside SMPTE\'s 30 and well inside the analyzer\'s 22-45 band. At 16 1/8" tall it is 12 3/8" below the lowest point of any ray, so unlike every other object in this room it could stand anywhere at all. Hollow: it stores the throw it is sitting under.',
    },
    {
      id: 'pouf-e',
      def: 'pouf-tolkning-rattan-20',
      at: [POUF_E_X, POUF_Y],
      rot: 270,
      label: 'TOLKNING rattan storage pouf (second row)',
      note: '12\'-4", subtending 32.7 deg — the best seat in the room after the sofa. The only natural fibre in the scheme\'s soft goods.',
    },
    {
      id: 'rug-viewing',
      def: 'rug-nordicknots-desert-8x10',
      at: [8.4, 9.5],
      rot: 90,
      label: 'Nordic Knots Desert 8x10, 7 mm flatweave',
      note: 'Runs from under the sofa\'s front feet east to the middle of the bed, tying the lounge and the sleeping platform into one floor rather than two rooms. Kept at $395 rather than swapped for the $130 IKEA TIOKRONA because it is 50/50 wool-jute and this is the one surface in the apartment that gets bare feet; TIOKRONA is in the catalog if that $265 is needed elsewhere.',
    },
    {
      id: 'lamp-lantern',
      def: 'lamp-strandad-floor-lantern',
      at: [1.985, 6.95],
      rot: 0,
      label: 'Paper floor lantern, 44"',
      note: 'The only tall soft-light source, parked in the promenade between the two chairs, where it is WEST of every seat and therefore behind every ray. That position is not decorative: at 44" it is 15 1/2" above the sightline floor, so anywhere east of a seat it would obstruct. A real AKARI 10A is 48" and $700 and has exactly the same problem — you would be paying $680 more for a lamp you still have to hide.',
    },

    // =============================================================== SLEEP
    {
      id: 'wallbed',
      def: 'bed-murphy-queen-lori-closed',
      at: [BED_X, CAB_Y],
      rot: 0,
      label: 'Lori queen vertical wall bed (shown CLOSED)',
      note: 'CLOSED: 5\'-4" x 1\'-11" x 6\'-11", back to the wide leg\'s north wall, its west 8 11/16" standing proud of the notch step on a finished return panel. OPEN: the platform swings out to x 9\'-2 1/2"..14\'-6 1/2", y 3\'-2 7/8"..11\'-11 7/8", and NOTHING IS DRAWN INSIDE THAT RECTANGLE. Deployed it leaves 2\'-9 7/8" of aisle on the west long side and 2\'-3 7/8" on the east against the 2\'-0" rule, and 1\'-7" between its foot and the kitchen aisle line. Mounts on SIX SCREWS INTO STUDS — see the note on the wall nobody has probed.',
    },
    {
      id: 'bed-lamp',
      def: 'lamp-nymane-wall-reading',
      at: [14.85, N_FACE_WIDE + 0.32],
      rot: 0,
      z: 3.833,
      label: 'NYMÅNE plug-in reading light, 46" AFF',
      note: 'On the north wall just east of the cabinet, so it lights the pillow end when the bed is down and reads as a wall light when it is up. It sits in the bed\'s east aisle but it is wall-hung, so it costs no floor. Plug-in: there is no circuit up there.',
    },

    // ============================================================== DINING
    {
      id: 'dining-table',
      def: 'dining-norberg-wallmount',
      at: [16.35, N_FACE_WIDE + 0.02 + NORBERG_D / 2],
      rot: 0,
      label: 'NORBERG wall-mounted drop-leaf, drawn FOLDED (5 7/8")',
      note: 'ON THE NORTH WALL IN THE NORTH-EAST POCKET, which is dead floor in every other scheme in this folder. Drawn folded, at 5 7/8" deep, because that is how it stands most of the year; opened it drops 23 5/8" south over the bed\'s east aisle, so the aisle IS the dining room for the length of a meal. It occupies no floor at all in the plan and returns about 6 1/2 sq ft every time it goes back up. THIS IS THE SCHEME\'S WEAKEST JOINT, said plainly: the two chairs that go with it live twelve feet away in the second row, and it needs a fixing into structure that nobody has probed yet.',
    },

    {
      id: 'dining-chair-n',
      def: 'chair-teodores',
      at: [2.5, 4.0],
      rot: 0,
      label: 'TEODORES chair, parked at the glass',
      note: 'THE TWO CHAIRS LIVE HERE, NOT AT THE TABLE, and the plan says so rather than hiding it. Parked against the west glazing in the promenade, facing the view, they are a window perch for most of the year and they are carried to the drop-leaf for a meal. They face SOUTH on purpose, one behind the other: it is the only orientation in the promenade that gives a chair its full 2\'-6" of pull-back, since west of them is glass 1\'-1" away and east of them is the back of the sofa. Turned east they would be aiming at the picture from behind the sofa, which is both a bad seat and a false claim of a third row. TEODORES stacks six high, so for a film night they stack into the reach-in closet run.',
    },
    { id: 'dining-chair-s', def: 'chair-teodores', at: [2.5, 8.2], rot: 0 },

    // ============================================================ GREENERY
    {
      id: 'plant-pocket',
      def: 'plant-sansevieria-24',
      at: [18.2, 4.0],
      rot: 0,
      label: 'SANSEVIERIA, 23 1/2"',
      note: 'The only plant in the catalog that may stand this close to the picture: at 23 1/2" it is 5" below the sightline floor, where layout A\'s 40" floor plant blocks over the last third of every run — that plant costs A\'s bed 1.4% of the image and its poufs more. It also survives a west apartment with the blackout down half the daylight hours, which a fiddle leaf does not.',
    },
    {
      id: 'plant-corner',
      def: 'plant-zz-18',
      at: [16.2, 12.6],
      rot: 0,
      label: 'ZZ plant, 17 3/4"',
      note: 'The low mound to the SANSEVIERIA\'s vertical, in the south-east corner of the lounge. 17 3/4" — clear of everything by more than 10".',
    },

    // =============================================================== ENTRY
    {
      id: 'entry-shoe-w',
      def: 'entry-trones-shoe',
      at: [27.05, S_FACE_EAST - 0.02 - 0.594 / 2],
      rot: 180,
      note: 'Wall-hung so the entry keeps its floor. Clear of the 3\'-2" entry door arc.',
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
    'THE SIGHTLINE, MEASURED — THIS IS THE POINT OF THE SCHEME. Run `pnpm sightline`. It casts five eye positions across each seat against a 13 x 13 grid of points on the image and reports the percentage of the picture that survives. This layout: sofa 100.0%, both poufs 100.0%. Layout A: sofa 91.5%, poufs 86.6% and 89.7%, bed 52.2%. Layout B worst seat 79.5%, C 89.0%, D 91.8% — in every one of them the culprit is the parked desk chair, and in A and B a floor lamp as well. THE BUILT-IN ANALYZER REPORTS NO SIGHTLINE WARNING FOR ANY OF THEM, because analysis.ts casts a single ray from seat centre to screen centre and nothing stands on that one line. That is not a bug in the analyzer so much as a limit of it, and scripts/sightline.ts exists to cover the gap. The client found this defect before the software did.',
    'WHY THE NOTCH IS THE ONLY PLACE THE DESK CAN GO. The picture is due EAST of the audience and spans y 4\'-6 3/16" to 11\'-9 3/8". Any seat west of the screen therefore throws a cone that sweeps the whole middle band of the floor, and a desk plus a parked chair is about 4\'-11" of north-south depth — more than the gap between the north wall and the top of that cone anywhere in the wide leg. The notch is north-WEST of every seat rather than between any seat and the screen, so it is outside the cone by position rather than by luck. Ancillary benefit: it is also the only wall in the apartment where a 35 3/8" chest of drawers can stand without eating the image.',
    'THE 28 1/2" RULE, WHICH IS WHAT LETS THE BED INTO THE ROOM. A seated eye is at 46" (analysis.ts SEATED_EYE) and the image bottom is at 28 1/2", so a ray from any seat to any point on the picture has height h(t) = 46 - 17.5t inches at fraction t of the way there, and its minimum anywhere is 28 1/2" at the fabric. ANY OBJECT 28 1/2" TALL OR SHORTER CANNOT OBSTRUCT THE PICTURE FROM ANY SEAT. That single inequality is what lets the wall bed be DEPLOYED without spoiling the picture: the Lori platform is 20" made up, so a film is watchable from the bed as well as from the sofa. It is also why the poufs (16 1/8"), the SANSEVIERIA (23 1/2") and the ZZ (17 3/4") were chosen at the heights they were, and why the 40" floor plant and the 44" lantern are pushed west of every seat. The inequality does NOT save the wall-bed cabinet, which is 6\'-11" tall and would block everything — the cabinet is clear for the other reason, because it stands on the one wall no ray reaches. Both arguments had to hold.',
    'SEATING DISTANCES. Sofa 12\'-10" of standoff and 12\'-10" straight-line, because it is dead on the centreline: 31.5 deg, between SMPTE\'s 30 and THX\'s 36, at 0.0 deg off axis. West pouf 14\'-1" (29.0 deg, 14.2 deg off axis), east pouf 12\'-4" (32.7 deg, 16.2 deg off axis). The analyzer\'s bounds are 8\'-9 1/4" (45 deg) and 18\'-8 1/4" (22 deg) and nothing is within 4 ft of either. Four seats on the picture, same count as layout A, but A\'s sofa is 13.7 deg off axis and this one is not.',
    'THE WALL BED, AND WHY ITS POSITION IS NOT A CHOICE. Lori Bed queen vertical: closed 5\'-4" x 1\'-11" x 6\'-11", deployed 5\'-4" x 8\'-9" from the wall and 20" made up. Between the sofa\'s front face and the plinth\'s west face there is 10\'-5 3/4"; the cabinet takes 5\'-4" of it and CLEARANCE.bedSide wants 2\'-0" down BOTH long sides of anything a queen wide, which leaves SIX INCHES of freedom in the entire run. As drawn it sits 3" east of dead centre — that 3" is spent buying the chest of drawers in the notch the clear floor it needs to open — and the deployed bed gets 2\'-9 7/8" on the west and 2\'-3 7/8" on the east. Two consequences follow and both are millwork. The cabinet oversails the notch step at x 9\'-11 1/8" by 8 11/16", so that much of its back stands proud and needs a finished return panel; and the east aisle is the same strip of floor as the plinth\'s 2\'-0" push-open zone and the drop-leaf\'s landing, which is three uses of one strip and is what 213 sq ft of usable floor requires. NOTHING IS DRAWN INSIDE THE DEPLOYMENT RECTANGLE (x 9\'-2 1/2" to 14\'-6 1/2", y 3\'-2 7/8" to 11\'-11 7/8") — that is the convention layout B uses for its Murphy and it is the only honest way to draw a bed that is not there most of the time.',
    'THE WALL BED\'S THREE HARD SPECIFICATIONS, none of which is negotiable. (1) It hangs on SIX SCREWS INTO WOOD OR METAL STUDS. The wide leg\'s north wall is an exterior wall in a concrete building and nobody has established what is behind the plasterboard — if it is concrete, this is a masonry-anchor job and a different conversation, and if it is a stud infill the studs have to be found and the cabinet set out to them, which can move it an inch or two and eat some of the six inches of slack above. PROBE THAT WALL BEFORE ORDERING. (2) The mattress may be no more than 10" thick and Lori recommends no more than 80 lb for a queen, which rules out the pocket-sprung VALEVAG this catalog carries for standing beds and points at a 10" foam queen — a Zinus Green Tea at about $230 is the obvious pairing and it is also $169 cheaper. (3) Closed it is 6\'-11" tall and 1\'-11" deep: a genuine piece of joinery in the room, not a hidden trick. It is white laminate plywood as specified; the walnut colourway would fight the pale scheme, and if the budget can stand it a cabinetmaker\'s door in the same oak as the desk is the version that makes this room.',
    'CIRCULATION, IN BOTH STATES. BY DAY the north-south spine is the 3\'-2" promenade behind the sofa along the glass, and the whole east half of the room — 10\'-5 3/4" from the sofa front to the plinth — is empty floor. BY NIGHT the deployed bed takes 5\'-4" out of the middle of that and the route runs down its west side at 2\'-9 7/8", round the foot at 1\'-7" to the kitchen aisle line, or down the east side at 2\'-3 7/8". Measured end to end the required trips come out at 3\'-6" front door to bathroom, 3\'-0" front door to kitchen sink, 2\'-10" front door to the west windows, 3\'-0" bathroom to bed and 4\'-6" sink to refrigerator — every one at or above the 2\'-6" absolute minimum, and `pnpm check` returns no errors and no warnings. Those figures are for the bed UP, which is the state the analyzer sees; the bed-down numbers above were measured by hand and are the ones to argue with.',
    'BLACKOUT — ROLLERS, AND THE PRICE THAT CHANGED. Layout A specified blackout CELLULAR shades at an estimated $320 a bay, and its own catalog entry admitted the number was a guess because the SelectBlinds configurator would not render. It has now rendered: at this unit\'s 104" drop, on the CONTINUOUS CORD LOOP that is the only lift long enough, a Select Blackout Cellular prices at $493.89 for a 32 3/4" bay and $544.89 for the 3\'-6" bay — about $2,026 for the four, which is $746 MORE than layout A carries. The same product family in a blackout ROLLER is $181.99 a bay at the same drop: $728 for the four, a saving of about $1,300 against the cellular\'s real cost. This layout takes the rollers, and not only for the money — layout A\'s own note called four continuous cord loops hanging down a floor-to-ceiling glass wall "a real aesthetic cost in a minimal scheme". A roller stack is also far less present under a 9\'-0" soffit. What you give up is the cellular\'s insulating air cell on a west-facing glass wall in summer, which is real and is not nothing.',
    'BLACKOUT IS STILL A CO-REQUISITE, NOT AN UPGRADE. Unchanged physics from layout A: at 100" on a 0.6-gain screen a 2,700-lumen projector makes 54 fL of peak white, while a screen face taking 500 lux of ambient sits at 28 fL of black — 1.9:1 in-room contrast, a grey rectangle. An ALR screen does not substitute, because this wall faces due west, straight down the sightline at the glazing, which is the one direction a lenticular screen cannot reject. Side channels on all four bays, now priced at a sourced $85 a window (SmartWings) rather than the $120 estimate.',
    'BUDGET — $12,733 AGAINST LAYOUT A\'S $16,118, AND THE WALL BED IS THE WHOLE ARGUMENT. Strip out the AV ($4,888) and the blackout ($1,068), which are fixed, and the furniture is $6,777 against a $6,000 brief — a 13% overrun, and $2,159 of it is the bed. Everything else went DOWN. Three swaps against layout A: Steelcase Series 1 Oatmeal $499 for the Herman Miller Aeron $2,150 (-$1,651, a real downgrade in mesh and recline stated as one, but also the lowest-backed genuinely ergonomic chair sourced, which matters in a room where the chair is seen from the sofa); IKEA SALTMYRAN $299 for the Blu Dot Cleon $1,960 (-$1,661, and 2 7/8" shallower, and it flat-packs through the angled front door the one-piece Cleon frame was a stated freight risk against); blackout rollers for cellular (-$1,248 against the cellular\'s now-verified price). Plus the 27" panel for the 32" (-$400) and the String Pocket for the String 3-bay (-$415). Note that layout A\'s own total moved from $15,562 to $16,118 when the blackout prices were corrected in the catalog; the comparison uses the corrected figure for both.',
    'BUDGET — THE TWO LEVERS THAT CLOSE THE $777, if the $6,000 is hard. FIRST, the wall bed\'s own price is unresolved: two figures were returned from loribeds.com on the same day, "starting at $1,387" and "start from $2,159", and $2,159 is recorded here only because a budget should not lean on the lower of two unconfirmed numbers. If the $1,387 configuration is the real one the overrun disappears entirely and the scheme lands at $6,005. GET A QUOTE FIRST — it is the single most valuable phone call in this schedule. SECOND, the rug: Nordic Knots Desert at $395 is kept because it is 50/50 wool-jute and this is the floor that gets bare feet twice a night, but IKEA TIOKRONA at $129.99 is 1/4" thick, flatwoven and honest, and it saves $265. Taking both puts the furniture at about $5,700. What I would NOT cut is the chest of drawers or the String Pocket: this scheme has no under-bed storage at all — a wall bed has no underneath — so the 4.0 cu ft in the notch is now the entire dresser.',
    'SECONDHAND IS THE THIRD LEVER AND IT IS BIGGER THAN THE OTHER TWO. Three lines in this schedule are commodity office and lifestyle goods with deep used markets, and buying them used does not just cut the total — it lets the same money buy a better object. THE DESK IS THE BIG ONE: a used Fully Jarvis runs about $200-$750 on Craigslist in a major metro and office resellers list refurbished Jarvis bamboo at 50-80% off MSRP, so the $1,325 line is realistically $300-$600 and the saving alone covers the wall bed\'s overrun. THE CHAIR IS THE SAFEST ONE: a Steelcase Series 1 is a fleet chair that turns over constantly in office liquidations, and at $150-$300 used it is the same chair with the same 12-year frame. THE SOFA IS THE INTERESTING ONE: at $299 new the SALTMYRAN barely has a used discount worth chasing, but $400-$600 of secondhand buys a Blu Dot, an Article or a Burrard — i.e. the piece layout A specified at $1,960 — so on the sofa the right move is not to spend less but to spend the same and buy better. WHAT NOT TO BUY USED: the wall bed (it is wall-specific, safety-critical and its gas pistons age), the mattress, and the blackout, which is made to the opening. Anything upholstered should be inspected in person and anything that does not knock down has to make the angled front door and the lift.',
    'BUDGET CAVEATS, AND THERE ARE SEVERAL. The plinth is still a $650 JOINERY ALLOWANCE, not a cabinetmaker\'s quotation. The Steelcase $499 is a dealer/review figure, not store.steelcase.com, and some Series 1 builds price adjustable lumbar as an option — confirm the SKU. The Jarvis oak laminate colourway and its $1,325 are third-party; MillerKnoll\'s Fully pages are a JS shell. VEVELSTAD\'s DECK HEIGHT IS INFERRED at ~9" from the published 7 7/8" under-frame clearance, and the whole 18 1/2" made-up figure rests on it — measure it before trusting the 10" of pillow headroom. Every IKEA price was read on 30 Jul 2026 and several of these are 2026 introductions, so expect movement. A queen mattress (VALEVÅG 9 1/2" at $399, or a 10" Zinus at $230), bedding, delivery, the projector\'s power and the shade installation are all allowances and are itemised separately.',
    'STORAGE, WHICH WAS LAYOUT A\'S WORST FAILURE AND IS NOW ADEQUATE. A had no dresser and no wardrobe and said so. This has the TONSTAD 4-drawer chest (4.0 cu ft) in the notch, four SKUBB cases under the bed (roughly another three drawers\' worth), the String Pocket over the desk, the 8\'-0" run of built-in reach-in closets on the south wall, the bathroom linen closet, two hollow storage poufs, two push-open bays in the plinth and two wall-hung TRONES at the entry. It is still not a wardrobe, and it is WORSE than the standing-bed version of this scheme was: a wall bed has no underneath, so the four SKUBB cases that held roughly a three-drawer chest of folded clothes are gone with it. Hanging clothes live in the built-in run or nowhere, and if that is not enough the answer is a Lori configuration with storage towers, which is where the $2,962 queen sets go.',
    'TRADE-OFF — YOU MAKE THE BED TWICE. A wall bed is not free of ritual: it has to be cleared and lifted every morning and lowered every night, the duvet has to be strapped or it falls out, and the floor it lands on has to stay empty, which is why this plan has no coffee table and reads as under-furnished at 85% free floor. Against that, sixteen hours a day this is a one-room apartment with no bed in it, the sofa looks across an empty floor at the picture, and the west elevation reads all the way to the glass. That was the trade the standing-queen version of this scheme could not make, and it is the reason this one exists.',
    'TRADE-OFF — THERE IS STILL NO COFFEE TABLE, AND NOW FOR A DIFFERENT REASON. In the standing-queen version there was no room: 1\'-4" of legroom plus the shallowest real table sourced plus a 2\'-0" bed aisle came to 4\'-7 3/8" in a 2\'-10" walk. Here there is plenty of room BY DAY — the floor from the sofa front to the plinth is 10\'-5 3/4" of nothing — and none of it is available, because all of it is either the deployment rectangle or one of the two aisles the deployed bed needs. A table in front of the sofa would have to be carried out of the way every night. The surfaces you get instead are the two poufs, which have lift-off lids, and the drop-leaf. If you want a coffee table, buy a light one and accept that it moves — an IKEA GUTTANE at 45 5/8" x 15 3/8" x 12 5/8" and about 30 lb is in the catalog for exactly that, and at 12 5/8" it never crosses a sightline wherever it ends up.',
    'TRADE-OFF — DINING IS TWO SEATS AND THE CHAIRS LIVE ELSEWHERE. The NORBERG drop-leaf seats two, folds to 5 7/8" and occupies no floor at all, which in 213 sq ft is worth more than a 40" pedestal\'s two extra covers. But it hangs in the north-east pocket and the two TEODORES chairs that serve it are twelve feet away doing duty as the second row — you carry them. It also needs a fixing into real structure and nobody has probed that wall. If dining four is a genuine requirement rather than an aspiration, this scheme does not do it and layout A does not either; that needs a different plan.',
    'TRADE-OFF — THIS IS STILL AN EVENING ROOM. Unchanged from A, and no arrangement of furniture fixes it: with the shades up the picture is unwatchable on a west-facing wall, and with them down the apartment loses its entire west elevation. The room has two states and you choose one. What this layout adds is that in the daylight state the floor is better — the promenade along the glass is 2\'-10 3/4" of clear walking, and the sofa sits with its back to the view at 30 3/8" so the glazing reads full-height over it from everywhere in the room.',
    'THE GLAZING RULE, AND THE ONE PIECE THAT BENDS IT. Nothing over 2\'-6" tall stands within 1\'-0" of the glass. The closest pieces are the paper lantern at 1\'-1 1/2" off the band edge and the desk\'s west end at 1\'-4 7/8" off it. The SALTMYRAN is 30 3/8" — 3/8" over the 30" limit — but it stands 2\'-10 3/4" back from the glass, and its structural backrest is only 26"; the extra is compressible cushion loft. Worth knowing before someone measures it and calls it a fail.',
    'ACOUSTICS, HEAT AND THE SOFFIT. Unchanged and still not solved: exposed structural concrete over dark LVP will ring, and an 8x10 flatweave plus four roller stacks is less absorption than layout A had, because rollers stack tighter than cellular. Budget a fabric panel or two, off catalog. CEILING MOUNTING REMAINS OFF THE TABLE — the soffit needs a GPR scan, masonry anchors and a silica vacuum, there is no power in it, and the glazing head leaves 4" of concrete above the glass.',
  ],
};

export default layout;
