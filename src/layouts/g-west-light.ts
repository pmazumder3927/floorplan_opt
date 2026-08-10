/**
 * LAYOUT G — "West light"
 *
 * WHAT THIS IS. Layout A, optimised. The client liked A, said it felt "too dark
 * or something", and asked whether it could be reimagined as japandi. This file
 * is that answer. It keeps A's one idea — the only blank west-facing wall in the
 * unit carries a 100" UST picture, and everything else is subordinate to it —
 * and then does the two things A never did: it measures the darkness, and it
 * measures the sightline against a plan that is allowed to move.
 *
 * THE THREE FINDINGS, AND EVERY ONE OF THEM IS A NUMBER THIS PROJECT COULD HAVE
 * PRODUCED AT ANY POINT AND DID NOT.
 *
 * (1) "TOO DARK" WAS A FACT ABOUT ELEVEN OBJECTS. `pnpm tone` splits the studio
 * at the notch: layout A's furniture measures 13.0% LRV in the LIVING end
 * against 39.6% in the SLEEPING alcove. The half of the flat you stand in is
 * three times darker than the half you sleep in, and the shell is not the
 * culprit — the walls are 88% and the soffit 47%. It is the sofa, the poufs, the
 * plinth, the desk, the chair and two folding chairs.
 *
 * (2) ALMOST NONE OF THAT DARKNESS WAS BUYING ANYTHING. A defends its darks
 * optically and the defence is real but mis-aimed. With the shades down the room
 * returns about 3.3% of the projector's own light to its own screen, and 83% of
 * that comes off the WALLS and the SOFFIT; every placed furnishing together is
 * roughly 10% of it. Sofa 3.7% -> 50% LRV costs 3.5% of the black level, i.e.
 * 131:1 becomes 126:1. The poufs cost ZERO, measured — a 16" pouf standing
 * behind a 28" sofa fills none of the screen's hemisphere. Against that the
 * parked Aeron is worth 22%, the plinth 13% and the MAGNUS top 12.5%, because
 * those three are close, low and inside the picture's own field. THE RULE:
 * dark is worth buying within about six feet of the lens and worth nothing
 * beyond it. A had it exactly the wrong way round.
 *
 * (3) THE DESK WAS IN THE WRONG PLACE BY 1'-1 5/8", AND IT COST 6.7 POINTS OF
 * PICTURE. A pins the desk's east end at x 16'-0" and argues it cannot go west
 * because the parked chair would sever the walk between the bed and the sofa.
 * Swept with `pnpm sightline`, that is not what happens. Sliding the top west
 * until its west end sits flush with the re-entrant corner at x 9'-11 1/8" —
 * the only position on that wall with an architectural reason behind it — takes
 * the worst seat from 80.5% to 87.2% and the sofa from 93.8% to 97.2%, and
 * `pnpm check` returns 3'-0" on every required route, which is BETTER than A.
 * The walk A was protecting was already severed by the same chair 1'-1 5/8"
 * further east; moving it did not sever anything new.
 *
 * WHAT "JAPANDI" MEANT HERE, PRECISELY, BECAUSE THE WORD IS USUALLY A MOOD
 * BOARD. Three things and no more. (1) The neutrals separate by VALUE and the
 * ladder is checkable rather than evocative: white-oak bed frame 56%, oat linen
 * and the sofa's hopsack 50%, rattan 43%, brushed-oak nightstand 40%, the
 * bench's deeper oak 35%, undyed wool rug 31%, terracotta 16%, espresso floor
 * 11%. Eight steps, one family, no two closer than three points. (2) There is
 * one woven natural fibre, one paper object and one piece of exposed pale
 * timber. (3) Emptiness is a material: the 3'-8 1/4" strip between the sofa and
 * the glazing is now a promenade with one thing in it, and the scheme's best
 * move is a piece of furniture it takes OUT. NOTE WHAT THIS FILE DELIBERATELY
 * DOES NOT DO: no visible joinery, no exposed interlocking timber, no shoji, no
 * live edge. The client rejected an Awara bamboo frame on exactly those grounds
 * and that rejection is on the record — japandi as a palette and a discipline is
 * what was asked for, not japandi as ornament.
 *
 * WHAT IT MEASURES, AGAINST LAYOUT A, ALL FROM THIS REPO'S OWN SCRIPTS:
 *
 *                                     layout A     layout G
 *   worst seat on the picture           80.5%        87.2%
 *   the sofa                            93.8%        97.2%
 *   the second row                 87.6 / 91.1%      93.0%
 *   narrowest path                      2'-6"        3'-0"
 *   front door to the west windows      2'-6"        3'-0"
 *   bathroom to the bed                 2'-6"        3'-0"
 *   living-end furniture, LRV            13.0         24.6
 *   living-end furniture, R-B             +8          +19
 *   the gap to the sleeping alcove    26.6 pts     14.7 pts
 *   room, area-weighted, LRV             48.0         50.8
 *   projector light the room returns     34.8%        35.1%
 *   errors / warnings                   0 / 1        0 / 1
 *   budget                            $15,843      $15,009
 *
 * IT IS $834 CHEAPER, and that is not a conjuring trick: this project's own
 * blackout entry has been recommending rollers over cellular since 30 Jul on a
 * $1,248 saving and no layout had spent it. Take the rollers out of the sum and
 * the bench and the lantern cost $414.
 *
 * THE ONE THING THIS SCHEME DOES NOT DO, AND IT WAS DRAWN AND MEASURED FIRST:
 * it does not paint the screen wall. See the WALL note. Short version — 85 sq ft
 * of Urbane Bronze makes a visibly better PICTURE and a measurably darker ROOM
 * (50.8% falls to 46.3%, which is below layout A), which is the wrong direction
 * for a brief that opened with "too dark"; and the client has since said plainly
 * that they do not want to paint a rented apartment. It stays in the catalog and
 * out of the plan.
 *
 * WHAT IT IS WORSE AT THAN A. A pale seat in a studio that is also the kitchen;
 * about 5 points of in-room contrast nobody will see; a second row you perch on
 * rather than sit in; and a desk that now stands 1'-1 5/8" further into the
 * middle of the room, which is the price of the 6.7 points of picture.
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
// The throw geometry is layout A's, unchanged, and deliberately so: it is the
// one part of that scheme nobody has ever complained about. IT WAS STILL TESTED
// — see the REJECTED note: sliding the whole picture south to cut the sofa's
// 14.5 deg off-axis was drawn at four offsets and thrown away.
const IMAGE_W = 7.26312; // 87.157" = 100 * 16 / sqrt(16^2 + 9^2)
const IMAGE_H = 4.08583; // 49.032"

const SCREEN_D = 0.125; // 1 1/2"
const SCREEN_X = BATH_W_FACE - SCREEN_D / 2; // 18.8025
const FABRIC_X = BATH_W_FACE - SCREEN_D; // 18.74 — the plane every throw is measured to
const SCREEN_Y = (N_FACE_WIDE + BATH_S_FACE) / 2; // 8.1475, centred on the blank wall

const IMAGE_BOTTOM = 28.5 / 12; // 2.375
const SCREEN_Z = IMAGE_BOTTOM - (4.18333 - IMAGE_H) / 2; // 2.32625

// ------------------------------------------------------------------- the throw
const PROJ_D = 0.975; // 11.7"
const LENS_OFFSET = 0.8875; // 10.65"
const THROW_D = 0.22 * IMAGE_W; // 1.59789 = 1'-7 3/16"
const REAR_GAP = THROW_D - LENS_OFFSET; // 0.71039
const PROJ_REAR_X = FABRIC_X - REAR_GAP; // 18.02961
const PROJ_X = PROJ_REAR_X - PROJ_D / 2; // 17.54211

// THE PLINTH GROWS FROM 66" TO 78", which is the cheapest storage in the scheme
// because the piece is bespoke and has not been made. 78" leaves 4 5/8" of image
// overhanging each end against A's 10 5/8", so the base finally reads as the
// picture's base rather than as a console parked under it, and the two extra
// push-open bays are about 43 litres of closed storage in a plan that has no
// dresser and no wardrobe. It stays DARK: at 3.8% of the screen's own hemisphere
// and 8" from the fabric it is the third most optically valuable dark surface in
// the apartment.
const PLINTH_W = 6.5; // 78"
const PLINTH_D = 2.0;
const PLINTH_H = 14 / 12; // 1.16667 — the projector's z
const PLINTH_X = BATH_W_FACE - PLINTH_D / 2; // 17.865
/** South end of the plinth. Nothing may stand north of this and south of the aisle. */
const PLINTH_S = SCREEN_Y + PLINTH_W / 2; // 11.3975

// ------------------------------------------------------------------ the wall
// The painted plane, drawn as a surface so that if it is taken it appears in the
// schedule, in the budget and in the render as the purchase it is. IT IS NOT IN
// THE ITEM LIST — see the WALL note and `paint-screen-wall-urbane-bronze` in the
// catalog. These constants exist so that adding it back is one line.
const PAINT_H = 8.99; // to the soffit, less 1/8" so the two planes do not z-fight
const PAINT_X = BATH_W_FACE - 0.0104; // 1/4" proud of the wall face
void PAINT_H;
void PAINT_X;

// ----------------------------------------------------------------- the sleeper
// Unchanged from A, to the inch. The alcove was already the warmest, lightest
// corner in the apartment — white oak, oat linen, brushed oak, one terracotta —
// and the whole diagnosis is that the living end was never brought up to meet
// it. Nothing here needed fixing.
const BED_L = 6.916667; // 83" head-to-foot
const BED_W = 5.25; // 63" across
const BED_HEAD_X = GLASS_BAND_E + 0.05; // 1.64
const BED_FOOT_X = BED_HEAD_X + BED_L; // 8.55667
const BED_CX = BED_HEAD_X + BED_L / 2; // 5.09833
const BED_CY = N_FACE + 0.02 + BED_W / 2; // 3.275
const BED_FOOT_S = BED_CY + BED_W / 2; // 5.90
const MATTRESS_TOP = 20 / 12; // 1.66667 — INFERRED, +/- 2". Measure the deck.

const NIGHT_SQ = 1.3125; // 15 3/4"
const NIGHT_X = BED_HEAD_X + NIGHT_SQ / 2; // 2.29625
const NIGHT_Y = BED_FOOT_S + 0.04 + NIGHT_SQ / 2; // 6.59625

// -------------------------------------------------------------------- the desk
// THE ONE PIECE OF GEOMETRY THIS SCHEME MOVES, AND IT IS WORTH 6.7 POINTS OF
// PICTURE. The top runs east-west on the wide leg's north wall exactly as the
// house rule in faces.ts requires — user facing north, panel facing south, glass
// on the left — but its WEST end now sits flush with the re-entrant corner at
// x 9'-11 1/8" instead of 1'-1 5/8" east of it. Measured, `pnpm sightline`:
//
//     desk east end   sofa    second row   bed     worst seat
//     16'-0"  (A)     93.8%      90.2%     80.5%     80.5%
//     15'-0"          96.8%      92.5%     84.3%     84.3%
//     14'-10 1/4"     97.2%      93.0%     87.2%     87.2%   <- here
//     14'-0"          98.2%      95.9%     90.1%     90.1%   but the top
//                                                            overhangs the
//                                                            corner by 10 1/4"
//     16'-6"          91.5%      89.2%     80.4%     80.4%
//     16'-10 3/8"     90.5%      88.3%     80.1%     80.1%
//
// East is worse, west is better, and the flush position is where the curve meets
// a wall. Going further buys another 2.9 points and costs the desk its back:
// west of the step the north wall is 2'-7" further north, so the top would hang
// past the corner into the notch with nothing behind it.
const DESK_W = 4.925; // 59.1"
const DESK_D = 2.3; // 27.6"
/** Flush with the re-entrant corner: STEP_X + DESK_W. */
const DESK_EAST = STEP_X + DESK_W; // 14.855
const DESK_X = DESK_EAST - DESK_W / 2; // 12.3925
const DESK_Y = N_FACE_WIDE + 0.02 + DESK_D / 2; // 4.39
const DESK_BACK = DESK_Y - DESK_D / 2; // 3.24
const DESK_FRONT = DESK_Y + DESK_D / 2; // 5.54
const CHAIR_Y = DESK_FRONT + 0.03 + 2.25 / 2; // 6.695

// ------------------------------------------------------------------ the lounge
// The sofa is HELD exactly where A puts it, and every distance to the picture is
// A's: 10'-8 7/8" of perpendicular standoff to the seat centre, 11'-1 3/8" to
// the image centre, 36.2 deg subtended, 14.5 deg off axis. Only the textile
// changes. Moving it EAST is not available (36.2 deg is already 1/5 of a degree
// over the THX maximum) and moving it NORTH costs the bed aisle.
const SOFA_W = 4.666667; // 56"
const SOFA_D = 2.833333; // 34"
const SOFA_N = 8.6;
/** The bed's access aisle AND the main east-west walk: 8.6 - 5.90 = 2'-8 3/8". */
const BED_AISLE = SOFA_N - BED_FOOT_S; // 2.70
const SOFA_CX = 8.0;
const SOFA_CY = SOFA_N + SOFA_W / 2; // 10.93333 -> y 8.60 .. 13.26667
/** The back face, and the datum the whole west strip is set out from. */
const SOFA_BACK_X = SOFA_CX - SOFA_D / 2; // 6.58333

// --------------------------------------------------- the back of the sofa
// One bench, 55" x 15 1/2" x 17 1/2", east face a whisker off the sofa's back,
// centred on it. The arithmetic that decides this is one line: 4'-11 15/16" of
// zone, minus a 3'-0" route to the west windows, leaves 2'-0" for furniture, and
// a second row you can put your knees under needs 3'-0". It does not fit and no
// arrangement makes it fit — so the permanent piece is the one that fits in
// 2'-0" and does the two jobs that matter, and the overflow seating is carried.
const BENCH_W = 4.583333; // 55" running north-south
const BENCH_D = 1.291667; // 15 1/2"
const BENCH_H = 1.458333; // 17 1/2" — the seat IS the top
const BENCH_EAST = SOFA_BACK_X - 0.02; // 6.56333
const BENCH_X = BENCH_EAST - BENCH_D / 2; // 5.9175
const BENCH_WEST = BENCH_EAST - BENCH_D; // 5.27167
const BENCH_CY = SOFA_CY; // 10.93333 -> y 8.64 .. 13.225
/** The clear promenade to the west windows: 5.27167 - 1.59 = 3'-8 1/4". */
const PROMENADE = BENCH_WEST - GLASS_BAND_E; // 3.68167
const LANTERN_Y = BENCH_CY - 1.45; // 9.48333

// Overflow: one rattan pouf, on the rug's east edge. Everywhere else fails for a
// specific reason — against the partition south of the plinth is the
// bathroom-to-bed route, north of the plinth is inside the UST's light cone, the
// promenade is 3'-8 1/4" and a pouf leaves 2'-0 5/8", the bed aisle is 2'-8 3/8"
// in total. Buy the second one when there are six people; it stacks.
const POUF_SQ = 1.635417; // 19 5/8"
const POUF_X = 14.0; // x 13.18 .. 14.82 — clear of the plinth's 2'-0" push zone
const POUF_Y = 12.2; // y 11.38 .. 13.02

// THE RUG MOVES 8" WEST, and it is the best free move in the scheme. `pnpm tone`
// puts the rug second only to the concrete soffit in the share of the
// projector's own light the room returns to its own screen; sliding it 8" away
// from the picture takes that share from 16.9% to 10.2% and the whole
// furniture total from 39.8% to 35.1%. Nothing was bought and nothing moved but
// a rug. It also stops the west selvedge dying 7/8" past the bench's west face,
// which read as a mis-order, and turns it into an 8 7/8" reveal.
const RUG_X = 9.533; // x 4.533 .. 14.533
const RUG_Y = KITCHEN_AISLE_N - 0.02 - 8.0 / 2; // 9.55 -> y 5.55 .. 13.55

// ------------------------------------------------------------------ the dining
const TABLE_D = 0.85; // 10 1/4" folded
const TABLE_BACK_X = GLASS_BAND_E + 0.06; // 1.65
const TABLE_X = TABLE_BACK_X + TABLE_D / 2; // 2.075
const TABLE_Y = 9.2;

const layout: Layout = {
  id: 'g-west-light',
  name: 'G — West light',
  description:
    'Layout A, optimised. The optics of its darkness were finally measured and almost none of it was buying anything, so the sofa goes to oat, the second row becomes one oak bench, the poufs go to rattan and the folding chairs go to beech and into the closet. Then the desk — which A pinned by an argument the sightline script does not support — slides 1\'-1 5/8" west to the wall step, and the worst seat goes from 80.5% of the picture to 87.2% while every required route reaches 3\'-0" for the first time in this folder. $884 cheaper than A.',
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
      note: 'Unchanged from layout A: back flat on the bathroom partition, centred on the 9\'-10 1/4" blank wall, 1\'-3 1/2" of wall each side. SLIDING IT SOUTH WAS DRAWN AND REJECTED — see the REJECTED note. The one thing to know before ordering: this wall is traced at +/- 3 5/8", so 100" is the size to order off a drawing and 120" is the size to order only after somebody puts a laser on it.',
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
      size: { w: PLINTH_W },
      color: '#3A2E24',
      label: 'Bespoke UST plinth, 78 x 24 x 14 — warm dark stain',
      note: 'TWELVE INCHES LONGER THAN A\'S AND IT IS THE CHEAPEST STORAGE IN THE SCHEME, because the piece is millwork and has not been made: 78" leaves 4 5/8" of image overhanging each end instead of 10 5/8", so the base reads as the picture\'s base, and the extra length is about 43 litres of closed push-open storage in a plan with no dresser and no wardrobe. IT STAYS DARK AND THAT IS NOT INERTIA: 3.8% of the screen\'s own hemisphere, horizontal, 8" from the fabric, worth 12.9% of the black level — the third most optically valuable dark surface in the apartment after the task chair and the desk top. The stain moves from a near-neutral #302B27 to a warm #3A2E24 at the same value (2.5% to 3.0% LRV, R-B from +9 to +22) so it belongs to the room rather than to the window frames.',
    },
    {
      id: 'projector',
      def: 'projector-ust-hisense-px3-pro',
      at: [PROJ_X, SCREEN_Y],
      rot: 90,
      z: PLINTH_H,
      label: 'Hisense PX3-PRO, 0.22:1, on the plinth',
      note: 'Rear of the cabinet 8 1/2" off the fabric, lens 1\'-7 3/16" off it, which is exactly 0.22 x 87.157". 50 W front-firing Harman Kardon, so no soundbar — there is nowhere to put one that is not in the beam.',
    },

    // ============================================================= BLACKOUT
    // ROLLERS, NOT CELLULAR: $1,248 saved, and this project had already found
    // the saving and never spent it. See the BLACKOUT note.
    ...WINDOW_BAYS.flatMap((bay, i) => {
      const cy = (bay[0] + bay[1]) / 2;
      const w = bay[1] - bay[0];
      return [
        {
          id: `shade-${i + 1}`,
          def: 'shade-blackout-roller-bay',
          // 0.16 not A's 0.13: a roller cassette is 3 1/2" deep against the
          // cellular's 3", and at 0.13 two corners of every bay fell outside the
          // inner wall face and the analyzer said so.
          at: [W_FACE + 0.16, cy] as [number, number],
          rot: 270,
          size: { w },
          label: `Blackout roller, bay ${i + 1}, ${formatFtIn(w)} wide`,
        },
        {
          id: `channels-${i + 1}`,
          def: 'shade-side-channels-bay',
          at: [W_FACE + 0.16, cy] as [number, number],
          rot: 270,
          label: `Blackout side channels, bay ${i + 1} (pair)`,
        },
      ];
    }),

    // =============================================================== LOUNGE
    {
      id: 'sofa',
      def: 'sofa-cleon-56-armless-oat',
      at: [SOFA_CX, SOFA_CY],
      rot: 270,
      label: 'Cleon 56" armless in Maharam Mode / Clavicle, facing east at the screen',
      note: 'THE SAME SOFA AS LAYOUT A, IN THE SAME PLACE, IN A DIFFERENT CLOTH — the single biggest tonal decision available in this apartment. 30.7 sq ft of face at eye level goes from 3.7% LRV to about 50%. The measured price is 3.5% of the screen\'s black level: 131:1 becomes 126:1, which is invisible. Front face still 10\'-8 7/8" back from the fabric at the seat centre, 36.2 deg subtended, 28" tall so it never rises into the glazing behind it. THE HONEST COST IS NOT OPTICAL: this is a pale seat in a studio where the same room is the kitchen. Maharam Mode is 100,000 double rubs with a stain finish, which is the right spec for that, and it is still a pale sofa 12 ft from a range. ORDER THE MEMO SAMPLE: Maharam publishes no LRV, resellers describe Clavicle as "off-white", and finishes.ts is explicit that nothing white and large may stand in front of the glazing. A light warm grey passes that rule; a white does not. THE ALTERNATIVE IS LIVE AND IT IS NOT A CLIMBDOWN. Swept through `pnpm tone` at five values with nothing else changed, the living end reads 19.3% with A\'s charcoal, 20.5% with a warm slate at 14% LRV, 21.5% at 23%, 22.8% at 35% and 24.6% with Clavicle at about 50%. So THE SOFA CARRIES 5.3 OF THIS SCHEME\'S 11.6-POINT LIVING-END GAIN — the bench, the rattan, the beech chairs and the desk move carry the rest, and a slate Cleon still gets most of layout G. THE RUG SETS THE TERMS: it is 31% LRV, so a sofa between about 25% and 38% merges into it and the two good answers are clearly darker or clearly lighter. Blu Dot\'s own grey at the same $1,960 is Maharam Meld in Panda, whose LRV is unverified — order that memo too. And the money is not equal in the real world even though it is in this catalogue: Tait Charcoal lists at $1,740 and has been seen at $869.97.',
    },
    {
      id: 'bench',
      def: 'bench-seno-55-oak',
      at: [BENCH_X, BENCH_CY],
      rot: 270,
      label: 'Article Seno 55" oak bench — the sofa\'s back, and the second row',
      note: 'East face 1/4" off the sofa\'s back, centred on it, so the two read as one 56" x 4\'-3" island rather than as a sofa with clutter behind it. IT IS 17 1/2" AND THE SOFA\'S BACK IS 28", which is the whole design: from the cinema side the bench does not exist, and from the promenade it is the low ledge that terminates an armless sofa floating in the middle of a studio. A 26"-30" console was drawn here first and rejected — it stands proud of the sofa\'s back and puts a second horizontal line at eye level across the middle of the only room with a view. AS A SEAT it is 13\'-0 7/8" to the image centre, subtending 31.0 deg, and it now sees 93.0% of the picture against the 87.6% and 91.1% A\'s two poufs managed. IT IS A PERCH, NOT A LOUNGE SEAT: flush to the sofa there is no knee room in front of it. Turned round, with the sofa\'s back as a backrest and 18\'-6" of city in front of you, it is the best seat in the apartment for the sixteen hours a day nothing is being projected. CHEAPER ALTERNATIVE, AND IT IS A REAL ONE: the IKEA TOLKNING bench is 47 1/4 x 14 1/2 x 18 in handwoven rattan over solid pine, $179.99, and it has about 112 litres of storage under a lift-off lid. It saves $219 and adds the storage this scheme is short of; it is 8 3/4" shorter than the sofa so it stops spanning it, the lid has to be lifted off rather than hinged, and it makes the room\'s natural fibre a matched pair with the pouf rather than a single note.',
    },
    {
      id: 'bench-lantern',
      def: 'lamp-akari-1a-table',
      at: [BENCH_X, LANTERN_Y],
      rot: 0,
      z: BENCH_H,
      label: 'Akari 1A, washi and bamboo, on the bench',
      note: 'THE FIRST LIGHT SOURCE IN THIS APARTMENT THAT IS NOT A CEILING DOWNLIGHT, A DESK CLAMP OR A BEDSIDE. On a 17 1/2" bench its head lands at 34 1/2" AFF, a low warm pool in the one part of the room that has never had one. It is also proof of the rule layout A derived from the wrong evidence: A ends with no floor lamp anywhere because a 5\'-11 1/4" HEKTAR at the foot of the bed was eating 33.8% of the picture — but that was a fact about the POSITION, not about height. Rays run east from every seat; anything west of the westernmost seat is behind all of them and cannot cross one at any height. A 4\'-0" Akari 10A was drawn in the only legal FLOOR position — in front of the west glazing\'s middle pier at y 8\'-6 7/8" to 9\'-11 1/8", where a tall object blocks no view because there is no view behind it — and rejected on circulation: a 21" globe leaves 1\'-9 3/4" of a 3\'-8 1/4" promenade.',
    },
    {
      id: 'pouf',
      def: 'pouf-tolkning-rattan',
      at: [POUF_X, POUF_Y],
      rot: 0,
      label: 'TOLKNING rattan pouf — footstool, side table, fifth seat',
      note: 'DRAWN WHERE IT LIVES, NOT WHERE IT IS USED, which is a correction to layout A rather than a downgrade: A drew two poufs in the second row, 4" behind a 28" sofa back, where an occupant has nowhere to put their knees — four seats on paper and two in the room. At 16 1/8" it is below the 28 1/2" image bottom and cannot cross a ray from anywhere. It is also the ONLY WOVEN NATURAL FIBRE IN THE SCHEME, in a room whose fixed materials are concrete, glass, anodised aluminium, painted drywall and a plank floor: hollow with a lift-off lid, so it stores the throw it is sitting under. The second one is $100 and stacks; buy it when there are six people.',
    },
    {
      id: 'rug-viewing',
      def: 'rug-nordicknots-zero-warmgray-8x10',
      at: [RUG_X, RUG_Y],
      rot: 90,
      label: 'Nordic Knots Zero 8x10, undyed wool, 7 mm flatweave',
      note: 'THE SAME RUG AS LAYOUT A, MOVED 8" WEST, AND IT IS THE BEST FREE MOVE IN THE SCHEME. `pnpm tone` puts this rug second only to the concrete soffit in the share of the projector\'s own light the room returns to its own screen — 81 sq ft of pale horizontal surface between the seats and the picture. Sliding it 8" further from the fabric takes its share from 16.9% to 10.2% and the whole-furniture total from 39.8% to 35.1%, which is more than the pale sofa costs. It also stops the west selvedge dying 7/8" past the bench\'s west face — a gap that reads as a mis-order — and makes it an 8 7/8" reveal. THE VALUE IS HELD ON PURPOSE: taking this rug from 31% to 50% LRV would raise the screen\'s black level 5.9%, more than the sofa and the poufs together, and it is already the warmest thing it could be at that value — undyed wool, no dye lot, the shade IS the fleece.',
    },
    {
      id: 'plant-screen',
      def: 'plant-medium-40in',
      at: [16.9, 12.3],
      rot: 0,
      note: 'South of the beam, where layout A puts it, and it is the one object in this scheme that is knowingly left costing something: 1.4% of the picture from the sofa and 1.8% from the bench. Four alternative positions were tested — south-west onto the rug, north of the plinth, into the desk-to-plinth pocket, deleted — and every one of them either stood in the UST\'s light cone, blocked the bed instead, or dropped a required route from 3\'-0" to 2\'-6". A living thing in the living end is worth 1.5% of a picture.',
    },

    // ================================================================ WORK
    {
      id: 'desk',
      def: 'desk-standing-magnus-pro',
      at: [DESK_X, DESK_Y],
      rot: 0,
      label: 'Secretlab MAGNUS Pro 59.1 x 27.6, west end flush with the wall step',
      note: 'MOVED 1\'-1 5/8" WEST OF WHERE LAYOUT A PUTS IT, AND IT IS THE LARGEST FUNCTIONAL GAIN IN THIS FILE. A pins the east end at x 16\'-0" and argues the top cannot go west because the parked chair would sever the walk between the bed and the sofa. Swept with `pnpm sightline`, that is not what happens: the same chair already severs that walk 1\'-1 5/8" further east, and moving it takes the worst seat from 80.5% to 87.2%, the sofa from 93.8% to 97.2% and the second row from 90.2% to 93.0%, while `pnpm check` returns 3\'-0" on every required route — better than A\'s 2\'-6". The west end now sits flush with the re-entrant corner at x 9\'-11 1/8", which is the only position on this wall with an architectural reason behind it; a foot further west buys another 2.9 points and costs the desk its back, because west of the step the north wall is 2\'-7" further north and the top would hang into the notch with nothing behind it. Orientation is the house rule in faces.ts, unchanged: top east-west, user facing north, panel facing south, glazing on the left. IT STAYS DARK AND THIS SCHEME OWES IT AN APOLOGY: layout A argued that every large pale surface in a projection room is wrong, which is false, and then applied it to the one surface where it happens to be true. An 11.3 sq ft matte dark top is worth 12.5% of the screen\'s black level and it is the only large horizontal plane in the room taking raking west sun from about 3pm.',
    },
    {
      id: 'desk-arm',
      def: 'monitor-arm-single-jarvis',
      at: [DESK_X, DESK_BACK + 0.25],
      rot: 0,
      note: 'Clamped at the back edge. Confirm the clamp fits the MAGNUS\'s rear edge before assuming this line carries over.',
    },
    { id: 'monitor', def: 'monitor-32', at: [DESK_X, DESK_BACK + 0.4], rot: 0, label: '32" 4K panel, facing south' },
    { id: 'desk-cpu', def: 'cpu-mount-underdesk', at: [DESK_X + 1.8, DESK_BACK + 0.6], rot: 0 },
    { id: 'desk-lamp', def: 'lamp-task-clamp', at: [DESK_X - 1.9, DESK_BACK + 0.55], rot: 0 },
    { id: 'desk-mat', def: 'desk-mat-felt', at: [DESK_X, DESK_Y + 0.5], rot: 0 },
    {
      id: 'desk-chair',
      def: 'chair-ergonomic-aeron',
      at: [DESK_X, CHAIR_Y],
      rot: 180,
      note: 'Parked, not tucked — the desks in this model are solid boxes with no legroom void, so a tucked chair reads as a collision. IT IS STILL THE MOST OPTICALLY EXPENSIVE OBJECT IN THE APARTMENT, in both senses: 7.0% of the screen\'s own hemisphere, so taking it pale would cost 22.4% of the black level, and after the desk move it is still the only thing blocking any seat — 12.8% of the picture from the bed, 5.2% from the bench, 1.4% from the sofa. TUCKING IT WAS MEASURED AND IT IS NOT THE ANSWER: drawn under the desk the sofa reads 98.6% and the bench 98.2%, but the BED drops to 82.7%, because tucked the chair sits 2\'-3" further north and straight into the bed\'s own ray fan. The only scheme in this folder that gets every seat to 100% is E, and it pays $2,159 of wall bed for it.',
    },

    // =============================================================== SLEEP
    {
      id: 'bed',
      def: 'bed-queen-basi-white-oak',
      at: [BED_CX, BED_CY],
      rot: 270,
      label: 'Article Basi queen, white oak, 63" x 83", 12" rail, no headboard',
      note: 'Head to the glazing, 1\'-0 1/2" off the glass, north long side against the notch wall. A plain pale slab floating over a 6" shadow gap on inset legs. NO HEADBOARD is the point rather than an omission: the head of this bed is a floor-to-ceiling window. THE DECK HEIGHT IS INFERRED at about 10", +/- 2" — Article publishes 12" overall and 6" of clearance and nothing between — and the TONSTAD\'s suitability as a bedside rides on that number. Measure the deck before buying anything else for this corner.',
    },
    {
      id: 'bed-cover',
      def: 'bedcover-linen-terracotta-queen',
      at: [BED_FOOT_X - 0.16 - 26 / 24, BED_CY],
      rot: 270,
      z: MATTRESS_TOP,
      label: 'Vintage-wash linen bed cover, terracotta — folded across the foot',
      note: 'Still the only saturated colour in the apartment, and in this scheme it finally has a partner rather than a contrast: rattan at 43%, oak at 35-40% and terracotta at 16% are one family at three values, where in layout A the terracotta sat alone against charcoal and near-black.',
    },
    {
      id: 'bed-nightstand',
      def: 'nightstand-tonstad',
      at: [NIGHT_X, NIGHT_Y],
      rot: 0,
      label: 'TONSTAD nightstand, oak veneer, 15 3/4" square',
      note: 'The only bedside position this plan owns, since the head has glass on one side and a wall on the other. Against the Basi\'s inferred 20" sleeping surface its 23 1/4" top stands 3 1/4" proud, which is high enough to read as a side table parked next to a bed. Measure the deck first; if it really is 20", swap this for a 21"-22" stand.',
    },
    {
      id: 'bed-lamp',
      def: 'lamp-bellhop-portable',
      at: [NIGHT_X, NIGHT_Y],
      rot: 0,
      z: 23.25 / 12,
      label: 'Flos Bellhop Unplugged, on the nightstand',
      note: 'CORDLESS, because there is no outlet at a glazed wall and a cord to this corner would cross the tightest walkway in the apartment.',
    },
    ...[0, 1, 2, 3].map((i) => ({
      id: `bed-storage-${i + 1}`,
      def: 'storage-lowprofile-underbed-45l',
      at: [BED_HEAD_X + 1.0 + i * 1.5, BED_CY] as [number, number],
      rot: 270,
      label: 'Low-profile case under the bed, 33 x 17 x 4 1/2',
      note: '45 litres a case in the 6" the Basi leaves. Four of them is about a drawer and a half of folded clothes; with the longer plinth the scheme now carries about 439 litres of non-closet storage against layout A\'s 396.',
    })),
    {
      id: 'bed-plant',
      def: 'plant-sansevieria-24',
      at: [9.28, 1.72],
      rot: 0,
      label: 'SANSEVIERIA, 8" pot — the notch shoulder',
      note: 'The 1\'-4 1/2" of floor between the foot of the bed and the step in the north wall. At 23 1/2" it is below the 28 1/2" image bottom and therefore mathematically incapable of crossing any ray — which is what the 5\'-11 1/4" floor lamp that used to stand here was not.',
    },

    // ============================================================== DINING
    {
      id: 'dining-table',
      def: 'dining-gateleg-norden',
      at: [TABLE_X, TABLE_Y],
      rot: 270,
      label: 'NORDEN gateleg, drawn FOLDED (10 1/4" deep)',
      note: 'Back to the glazing wall, 3/4" clear of the 1\'-0" band, folded to a 10 1/4" console for most of the year and pulled into the promenade for dinner. It is used from its NORTH and SOUTH ends, not from the east: the opened east leaf reaches x 4\'-6 13/16" and leaves 8 1/2" to the bench, which is not a seat. Two people, properly, and that is what this plan can do.',
    },
    // THE TWO FOLDING CHAIRS ARE NOT DRAWN, AND THAT IS THE SECOND-LARGEST GAIN
    // IN THIS FILE. See the PROMENADE note: parked open in the west strip, as
    // layout A draws them, they seal it to 3 7/8" and the walk from the kitchen
    // to the west windows becomes a 26 ft detour. Folded they are 3" thick and
    // they belong in the 8'-0" reach-in closet run, which is where layout A's own
    // note already says they live. They stay in the budget — two FRÖSVI in beech,
    // $25 each, and beech rather than black because for the hours they ARE out
    // they are 36 sq ft of visible surface at 54% LRV instead of 1.5%, for the
    // same money.

    // =============================================================== ENTRY
    {
      id: 'entry-shoe-w',
      def: 'entry-trones-shoe',
      at: [27.05, S_FACE_EAST - 0.02 - 0.594 / 2],
      rot: 180,
      note: 'Wall-hung so the entry keeps its floor. Clear of the 3\'-2" entry door arc.',
    },
    { id: 'entry-shoe-e', def: 'entry-trones-shoe', at: [28.85, S_FACE_EAST - 0.02 - 0.594 / 2], rot: 180 },
    { id: 'entry-mirror', def: 'mirror-full-length-wall', at: [28.0, 12.45], rot: 0, z: 0.9 },
    {
      id: 'dining-chair-w',
      def: 'chair-frosvi-folding-beech',
      at: [25.2, 17.36],
      rot: 0,
      size: { w: 1.4375, d: 0.25, h: 2.895833 },
      // Inside the reach-in closet run, which the model draws as a solid
      // built-in: the analyzer has no concept of a closet's interior, so it would
      // read a chair standing in one as a collision with the casework.
      ignoreAnalysis: true,
      label: 'FRÖSVI folding chair, beech — folded, in the closet',
      note: 'STOWED, AND THAT IS A MEASURED DECISION RATHER THAN TIDINESS. Layout A parks these two OPEN in the west strip and its promenade pinches to 3 7/8" at y 11\'-9 3/8"; the analyzer misses it (it reports 2\'-6") because the route target sits inside the pinch where endpoint protection exempts the cells, but a half-inch sweep does not. Folded and put where layout A\'s own note says they live — the 8\'-0" reach-in run, 3" of thickness each — every required route in the west half reaches 3\'-0" and the plan\'s narrowest path goes from 2\'-6" to 3\'-0", which no scheme in this folder had managed. They come out for dinner and for film night.',
    },
    {
      id: 'dining-chair-e',
      def: 'chair-frosvi-folding-beech',
      at: [25.55, 17.36],
      rot: 0,
      size: { w: 1.4375, d: 0.25, h: 2.895833 },
      ignoreAnalysis: true,
      label: 'FRÖSVI folding chair, beech — folded, in the closet',
    },
  ],
  notes: [
    'WHAT CHANGED FROM LAYOUT A, IN ONE LIST. GEOMETRY: the desk slides 1\'-1 5/8" west so its west end is flush with the re-entrant corner; the plinth grows from 66" to 78"; the rug slides 8" west; the two folding chairs go into the closet; the second row becomes one bench; the pouf moves to the rug\'s east edge. COLOUR: the sofa\'s textile (charcoal to oat), the poufs (near-black to rattan, and one instead of two), the folding chairs (black to beech), the blackout (cellular to roller), the plinth\'s stain (neutral dark to warm dark, same value). ADDED: an Akari 1A on the bench. UNCHANGED, to the inch: the screen, the throw, the projector, the sofa, the bed and everything in the alcove, the gateleg, the entry, and every piece of the desk kit except where the desk itself stands.',
    'THE ARITHMETIC OF "TOO DARK". `pnpm tone` splits the open studio at the notch. Layout A\'s furniture measures 13.0% LRV in the LIVING end against 39.6% in the sleeping alcove — the half of the flat you stand in is three times darker than the half you sleep in — and the shell is not the culprit, because the walls are 88% and the soffit 47%. A defends that gap optically and the defence is real but mis-aimed: with the shades down the room returns about 3.3% of the projector\'s own light to its own screen and 83% of that comes off the WALLS and the SOFFIT, so every placed furnishing together is roughly 10% of it. Sofa 3.7% to 50% costs 3.5% of the black level (131:1 becomes 126:1). The poufs cost ZERO, measured — a 16" pouf behind a 28" sofa fills none of the screen\'s hemisphere. The parked Aeron is worth 22.4%, the plinth 12.9% and the MAGNUS top 12.5%. THE RULE: dark is worth buying within about six feet of the lens and worth nothing beyond it. G ends at 24.6% in the living end and 50.8% for the room against A\'s 48.0%.',
    'THE WALL, AND WHY IT IS NOT IN THIS PLAN. 85-88 sq ft of the bathroom partition\'s west face in Sherwin-Williams Urbane Bronze SW 7048 — 8% LRV, warm brown-charcoal, flat, floor to soffit, corner to corner, about $205 if the client paints it and $300-$450 if a painter does. IT WAS DRAWN INTO THIS SCHEME FIRST AND THEN TAKEN OUT, and the number is why: with the paint the room measures 46.3% area-weighted, without it 50.8%, and layout A is 48.0%. A client who said "too dark" would be handed a room measurably darker than the one they complained about. WHAT IT BUYS IS REAL AND IT IS NOT IN THAT NUMBER. A 100" image is judged against its surround, and 55 sq ft of 88%-LRV white a half-inch from the picture\'s edge raises the eye\'s adaptation level and crushes perceived black in a way no contrast ratio records; a 0.22:1 lens also grazes that wall at a few degrees, so on white every drywall butt joint is lit like a raking-light survey. THE OBJECTION THAT SETTLES IT EITHER WAY: the ALR fabric is 26.6% LRV, so on an 8% wall the switched-OFF screen becomes three times brighter than the wall behind it — the picture stops being a dark rectangle on a light wall and becomes a light rectangle on a dark one. It never disappears; the paint only chooses which way it stands out. AND THE CLIENT HAS SETTLED IT: they do not want to paint a rented apartment. The note stays so that nobody re-derives the idea and so that the reason it is a good idea for the PICTURE is on the record — if this scheme ever moves to a wall somebody owns, paint that wall.',
    'THE DESK, WHICH IS THE LARGEST FUNCTIONAL GAIN AND WAS SITTING THERE THE WHOLE TIME. Layout A pins the top\'s east end at x 16\'-0" and gives two reasons: further east and it stands under the screen, further west and the parked chair severs the walk between the bed and the sofa. The first is true. The second does not survive measurement — the same chair already severs that walk 1\'-1 5/8" further east, and the analyzer\'s required routes never used it. Swept with `pnpm sightline` at five positions: east end at 16\'-10 3/8" gives a worst seat of 80.1%, 16\'-6" gives 80.4%, A\'s 16\'-0" gives 80.5%, 15\'-0" gives 84.3%, and flush with the wall step at 14\'-10 1/4" gives 87.2%. The curve is monotone and the flush position is where it meets a wall: west of the step the north wall is 2\'-7" further north, so a top pushed past the corner would hang into the notch with nothing behind it. 14\'-0" was tested anyway and returns 90.1% with 10 1/4" of overhang, which is the better number and the worse detail. WHAT IT COSTS: the desk now stands 1\'-1 5/8" further into the middle of the room, which is visible in the lounge frame, and the north-south connector east of the sofa narrows from 2\'-11 15/16" to 1\'-10 1/4" — you pass east of the chair instead of west of it, which is why `pnpm check` still returns 3\'-0".',
    'THE PROMENADE, AND THE PINCH NOBODY HAD MEASURED. Between the Cleon\'s back at x 6\'-7" and the analyzer\'s 1\'-0" glazing band at x 1\'-7 1/16" there is 4\'-11 15/16" of floor running the depth of the room. Swept at half-inch steps, LAYOUT A\'S IS SEALED: 3 7/8" at y 11\'-9 3/8", where the two parked folding chairs meet the south pouf, so the only way from the kitchen end of the room to the west windows is a 26 ft detour east round the sofa. `pnpm check` reports 2\'-6" there and does not warn, which is a grid artifact — the route\'s own target sits inside the pinch where endpoint protection exempts the cells. G takes the two chairs out of the strip and into the closet, and the strip runs 2\'-9 1/4" clear at its tightest (against the folded gateleg) and 3\'-8 1/4" for most of its length. The analyzer agrees once the pinch is gone: narrowest path 2\'-6" to 3\'-0", front door to the west windows 2\'-6" to 3\'-0", bathroom to the bed 2\'-6" to 3\'-0". This is the first scheme in this folder to hit the project\'s own 3\'-0" walkway target on every required route.',
    'THE BACK OF THE SOFA — THE PROBLEM, STATED AS A DEPTH BUDGET. The strip has to carry a 3\'-0" route. That leaves 2\'-0" for furniture, and a second row you can actually sit in needs about 1\'-6" of seat plus 1\'-6" of knee room, i.e. 3\'-0". IT DOES NOT FIT, AND NO ARRANGEMENT MAKES IT FIT. Layout A does not solve this so much as ignore it: its two poufs stand 4" off the sofa\'s back, which is a footstool position, not a seat, so A\'s "four seats on the picture" is really two seats and two footstools. G stops pretending. The permanent piece is 15 1/2" deep and does the two jobs that DO fit in 2\'-0" — it gives an armless sofa floating in the middle of a studio a back, and it puts a light and a surface behind it — and the overflow seating is one rattan pouf you carry. The seat count does not fall: 55" of bench is a wider second row than two 18" poufs and at 93.0% it sees more of the picture than either of them did.',
    'THE LIGHT, AND THE RULE LAYOUT A DERIVED FROM THE WRONG EVIDENCE. A ends with NO FLOOR LAMP ANYWHERE, on the strength of a real measurement: a 5\'-11 1/4" HEKTAR parked in the shoulder at the foot of the bed was eating 33.8% of the picture from the bed. The measurement is right and the rule drawn from it is too broad. Rays run EAST from every seat to a picture on the east partition; anything WEST of the westernmost seat is behind all of them and cannot cross a single ray at any height. So height is optically free in the whole west strip, and this scheme spends a little of it on an Akari 1A standing on the bench at 34 1/2" AFF. The bigger version was drawn and rejected: a 4\'-0" Akari 10A in the only legal floor position — in front of the west glazing\'s middle pier, where a tall object blocks no view because there is no view behind it — is 21" in diameter and leaves 1\'-9 3/4" of a 3\'-8 1/4" promenade. Height is free in that strip; DEPTH is not, and depth is what a 21" globe and a wardrobe both need. That is the design rule for the west strip: something slim at any height, or something deep under 30".',
    'DRAWN, MEASURED, REJECTED — the three geometric moves that looked obvious and are not. (1) SLIDING THE PICTURE SOUTH to cut the sofa\'s 14.5 deg off-axis. The blank wall is 9\'-10 1/4" and the image is 7\'-3 1/8", so there is 1\'-3 1/2" of slack each side; spending it southward would bring the audience onto the centreline. Tested at four offsets: at 6" the worst seat falls from 80.5% to 79.8%, at 10 3/4" to 77.9% and the analyzer starts returning errors, and at 1\'-3" to 76.7%. The picture moves toward the sofa and AWAY from the bed, and the bed is already the worst seat; the 40" plant becomes a bigger blocker than the desk chair; and with the wall left white an off-centre screen leaving 2\'-3" one side and 6" the other reads as a mistake. Rejected. (2) MOVING THE DESK EAST, which is the intuitive fix for a chair standing in a sightline and is exactly backwards: at x 16\'-10 3/8" the worst seat is 80.1% against A\'s 80.5%, because a chair nearer the screen subtends a larger angle from every seat. (3) TUCKING THE DESK CHAIR under the top for the film-night state. The sofa reads 98.6% and the bench 98.2%, and the BED drops to 82.7% — tucked, the chair sits 2\'-3" further north and straight into the bed\'s own ray fan. All three are in the file so nobody re-draws them.',
    'THE BLACKOUT — ROLLERS, AND THE $1,248 THIS PROJECT HAD ALREADY FOUND AND NEVER SPENT. The catalog\'s own cellular entry has carried this since 30 Jul: at a 104" drop, SelectBlinds prices a Select Blackout Cellular on a CONTINUOUS CORD LOOP at $494-$545 a bay (cordless and no-drill both top out at 84", so a shade tall enough for these bays cannot be either), against $182 a bay for a blackout roller doing the same optical job. Four bays: $1,976 against $728. WHAT IT DOES NOT NECESSARILY BUY IS THE END OF THE CORD LOOPS — the roller page quotes 12"-144" across all lift types without breaking the lifts out, so assume a continuous cord loop until somebody configures one. What it does buy for certain is the stack: a roll at the head is far less visually present than a cellular stack, which matters 4" below a bare concrete soffit. THE FABRIC STAYS DARK ON THE ROOM SIDE, and an earlier draft of this file got that wrong: a blackout blind is only ever visible with the shades DOWN, i.e. during a film, so a pale face buys nothing in the sixteen daylight hours that are the entire subject of this revision and costs about 2% of the black floor in the two hours that are not.',
    'COLOUR — EIGHT VALUES, ONE FAMILY, ONE ACCENT. The fixed room is unchanged and unchangeable: espresso plank at 11% LRV, flat white walls at 88%, a bare concrete soffit at 47% that measures COOL (finishes.ts puts B-R at +22), and black anodised window sections that are the only true black in the apartment. Against that, G runs one ladder and steps down it: white-oak bed frame 56%, oat linen and the sofa\'s hopsack 50%, rattan 43%, brushed-oak nightstand 40%, the bench\'s deeper oak 35%, undyed wool rug 31%, terracotta 16%, floor 11%. THE DARKS THAT REMAIN ARE THE EQUIPMENT AND THEY ARE ALL IN ONE PLACE: the plinth, the projector, the screen frame, the monitor, the MAGNUS top and the Aeron sit within eight feet of each other at the east end. In layout A those same objects were scattered black across a white field. WHAT IS DELIBERATELY ABSENT: grey-blue anything, a second accent colour, brass, chrome on furniture, and any exposed interlocking joinery.',
    'STORAGE, AND WHAT IS STILL MISSING. There is no dresser and no wardrobe, and there is no wall left to put one on. What the scheme carries: the 8\'-0" run of built-in reach-in closets on the south wall (which now also holds two folded chairs), the bathroom linen closet, four low-profile 4 1/2" cases in the 6" under the bed frame (about 180 litres), the plinth\'s push-open bays (about 259 litres at 78", up from 216 at A\'s 66"), and the pouf. About 439 litres of non-closet storage against layout A\'s 396. IT IS STILL THE WEAKEST THING ABOUT THIS PLAN, and the cheapest fix on the table is the alternative bench: the IKEA TOLKNING at $179.99 has about 112 litres under its seat and saves $219 against the Seno. If the client owns more clothes than the closet run plus four flat cases hold, take layout E, which has a real chest.',
    'BUDGET. $15,009 of catalogue total against layout A\'s $15,843 — $834 LESS, while adding a bench, a lantern and 12" of plinth. WHERE IT COMES FROM: the blackout saves $1,248 (four rollers at $182 against four cellular at $494) and the second pouf saves $160 (one TOLKNING at $100 against two JÄRRESTAD at $130). WHERE IT GOES: the bench $399, the Akari 1A $195. The sofa is $1,960 either way in this catalogue — the textile is a colourway, not an upgrade — and the folding chairs are $25 in beech and $25 in black. TAKE THE ROLLER SAVING OUT OF THE SUM AND G IS $414 DEARER THAN A, which is the honest price of the bench and the lantern; the rollers were a saving this project had already found and they are available to layout A too. NOT IN THE CATALOGUE TOTAL, as in every scheme here: the mattress ($499-$1,999 on top of the $399 Basi frame), the bedding allowance, the wall paint if it is taken ($205-$450), and a lounge textile allowance of about $150-$250 for a throw and two cushion covers in the oat family.',
    'BUDGET CAVEAT. The estimates here are layout A\'s, plus three new ones. THE PLINTH at 78" is still a JOINERY ALLOWANCE and not a quotation; carry about $730 rather than A\'s $650 for the extra 12" and two more bays. THE AKARI: $195 is read off shop.noguchi.org, but the page does not say whether the stand and cord set are included and several Akari models price them separately — budget $60-$150 more if not. THE SOFA: this catalogue prices layout A\'s Cleon at $1,960 because that is the Maharam-fabric price, so the textile change is free in these budgets — but bludot.com lists Tait Charcoal at $1,740 and runs promotions below it, so a real client comparing real carts may be looking at +$220 or more. CARRIED OVER AND STILL UNRESOLVED: the MAGNUS Pro $799 is not a verified figure; the Basi\'s deck height is not published at all, so the 20" sleeping surface is inferred with about +/- 2" on it. AND THE ONE MEASUREMENT THIS WHOLE SCHEME RIDES ON: Maharam publishes no LRV, so the sofa\'s 50% is read off product photography, which is radiance and not albedo. Order the memo sample, put it on the floor next to the plank, and look at it at 4pm.',
    'TRADE-OFF — WHAT G IS WORSE AT THAN A. Four things, said plainly. (1) A PALE SEAT IN A ONE-ROOM FLAT. The Cleon in Clavicle is 100,000 double rubs with a stain finish and it is still a light sofa twelve feet from a range. If that is the wrong bet, the same frame in the same place in Maharam Meld / Panda is a mid-grey compromise and nothing else in this file changes. (2) MEASURED CONTRAST FALLS about 5 points, 131:1 to roughly 126:1, with the shades down. Nobody will see it, and it is a real number moving the wrong way. (3) THE SECOND ROW IS A PERCH: flush to the sofa there is no knee room in front of the bench, so an occupant sits sideways or turns round to face the window. This was equally true of A\'s poufs; a 55" bench is simply an object you notice. (4) THE DESK IS 1\'-1 5/8" FURTHER INTO THE ROOM, which is the price of 6.7 points of picture and is visible in every frame that looks west. AND ONE THING THAT DOES NOT CHANGE AT ALL: this is still an evening room. Blackout on all four bays is still a co-requisite, the picture is still unwatchable with the shades up, and the apartment still has two states and you still choose one. G makes the sixteen daylight hours warmer, lighter and better connected; it does not buy a daytime picture, and nothing in this catalog does.',
  ],
};

export default layout;
