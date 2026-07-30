/**
 * The inner wall faces and built-in clear zones every layout in this folder is
 * dimensioned off. All values are DECIMAL FEET and every one of them is copied
 * from, or derived from, src/core/plan.ts — nothing here is invented.
 *
 * Layouts import from this file instead of hard-coding numbers so that a
 * placement reads as "flush to the north wall" rather than "y = 0.63", and so a
 * future correction to the traced plan shows up as one edit here.
 *
 * ORIENTATION REMINDER (types.ts): +x = east, +y = SOUTH (down the page),
 * rotation is clockwise on the page, and at rot 0 a piece's FRONT faces +y
 * (south). So:
 *     rot   0  front faces SOUTH   (back against a north wall)
 *     rot  90  front faces WEST    (back against an east wall)
 *     rot 180  front faces NORTH   (back against a south wall)
 *     rot 270  front faces EAST    (back against a west wall)
 *
 * ---------------------------------------------------------------------------
 * THE DESK ORIENTATION RULE — every layout in this folder obeys it
 * ---------------------------------------------------------------------------
 *
 * The rule lives here rather than in one layout's header because all of them
 * cite it and none of them owns it.
 *
 * The glazing faces WEST, so it takes direct sun from roughly 3pm to sunset.
 * There are only three ways to point a screen in this room:
 *
 *   screen facing WEST  -> the low sun lands on the panel; unreadable daily.
 *   screen facing EAST  -> you sit facing east with the sun over your shoulder
 *                          and get the same reflection, plus the window is a
 *                          bright hole behind the screen that your eyes have to
 *                          fight all afternoon.
 *   screen facing NORTH or SOUTH -> the glazing is off to one side. Daylight
 *                          rakes ACROSS the desktop, which is what you want on
 *                          paper and hands, and never down the barrel of the
 *                          panel.
 *
 * So the Jarvis top runs east-west against a north wall, the user sits SOUTH of
 * it facing NORTH, the screens face SOUTH, and the glass is on the user's LEFT.
 * There are only two north walls available: the notch (x W_FACE..STEP_X at
 * N_FACE) and the wide leg (x STEP_X..BATH_W_FACE at N_FACE_WIDE).
 *
 * PULL-BACK. Reserve the full CLEARANCE.deskChair (30") of clear floor in front
 * of the top and draw the chair PARKED inside that zone rather than tucked under
 * it — the desks in this model are solid boxes with no legroom void, so a tucked
 * chair reads as a collision to the analyzer and as a lie to a reader. Stated
 * honestly: the sourced real-world minimum for a task chair to roll back and let
 * the user stand is nearer 36", and 42"-48" is comfortable. Where a layout only
 * achieves 30" it says so.
 */

// ---------------------------------------------------------------- wall faces

/** Inner face of the west glazing wall (W10). The whole thing is glass now. */
export const W_FACE = 0.59;
/** Inner face of the north wall in the west notch (W1), x 0.59..9.93. */
export const N_FACE = 0.63;
/** Inner face of the north wall east of the notch (W3), x 9.93..26.27. */
export const N_FACE_WIDE = 3.22;
/** The re-entrant corner at x = 9.93: north wall steps south here. */
export const STEP_X = 9.93;
/** West face of the bathroom's west partition P1 — 9'-6" of usable blank wall. */
export const BATH_W_FACE = 18.865;
/** South face of the bathroom's south partition P2. */
export const BATH_S_FACE = 13.075;
/** Inner face of the east wall of the entry nook (W6). */
export const E_FACE_ENTRY = 29.73;
/** Inner face of the west wall of the entry nook / east wall of the main room. */
export const E_FACE_MAIN = 26.27;
/** Inner face of the south wall, kitchen leg (x < 17.95). */
export const S_FACE_KITCHEN = 19.17;
/** Inner face of the south wall, east leg (x > 17.95). */
export const S_FACE_EAST = 18.36;
/** Where the south wall steps: closets start here. */
export const S_STEP_X = 17.95;

// ------------------------------------------------- built-ins and their zones
//
// These are the boxes of floor the analyzer will not let you park in, because
// you have to stand there to open a door or a drawer. Quoted so a layout can
// say "clear of the 42" kitchen aisle" and mean a number.

/** Front (north) edge of the kitchen counter run; the 42" aisle starts here. */
export const COUNTER_FACE = S_FACE_KITCHEN - 2.1; // y = 17.07
/** North edge of the 3'-6" kitchen work aisle. Nothing may stand south of this. */
export const KITCHEN_AISLE_N = COUNTER_FACE - 3.5; // y = 13.57
/** Fridge door swing zone: x 10.67..13.17, north to here. */
export const FRIDGE_ZONE_N = 16.67 - 3.0; // y = 13.67
/** Laundry bifold working zone: x 13.57..16.02, north to here. */
export const LAUNDRY_ZONE_N = 16.55 - 3.0; // y = 13.55
/** Reach-in closet run: doors on the north face at y = 16.36, 30" to stand in. */
export const CLOSET_FACE = 16.36;
export const CLOSET_ZONE_N = CLOSET_FACE - 2.5; // y = 13.86

/**
 * The band of floor in front of the west glazing that has to stay clear of
 * anything tall. The analyzer polices a 1'-0" band off the glass; this project
 * holds itself to the stricter rule in the brief — nothing over 2'-6" tall
 * within 1'-0" of the glass, and nothing over 2'-6" tall anywhere it would sit
 * between a seat and the view.
 */
export const GLASS_BAND_E = W_FACE + 1.0; // x = 1.59
/** Height above which a piece starts to block the glazing (2'-6"). */
export const GLASS_MAX_H = 2.5;

/** y-extents of the four west glazing bays, north to south (from plan.ts). */
export const WINDOW_BAYS: [number, number][] = [
  [2.8, 5.53], // WIN1
  [5.88, 8.57], // WIN2
  [9.93, 12.7], // WIN3
  [13.05, 16.55], // WIN4 — the one behind the kitchen end of the room
];
