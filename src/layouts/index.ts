/**
 * The four designed layouts for the 508 sq ft studio.
 *
 * All four carry the same four hard requirements — a REAL QUEEN BED, modern /
 * minimal decor, a real Fully Jarvis sit-stand desk, and a CONGREGATION AREA for
 * watching things on a PROJECTOR with the throw geometry and the seating
 * distances both actually correct. What differs is where the picture goes, and
 * every other decision in each scheme falls out of that one:
 *
 *   A  a-night-wall    the picture goes on the BATHROOM PARTITION — the only
 *                      blank, west-facing wall in the unit. 100" UST ALR frame,
 *                      Hisense PX3-PRO on a 14" plinth, audience facing EAST on a
 *                      sofa plus two poufs, and an Awara bamboo queen head-to-the-
 *                      glazing in the notch — no headboard, because the head of that
 *                      bed is a window — with nothing in the sleeping end fixed to a
 *                      wall. The best picture this apartment can make; the cost is
 *                      that it is an evening room and there is no dresser.
 *   B  b-fold-away     the picture goes IN THE WEST GLAZING on a floor-RISING
 *                      screen that stows to an 8 1/4" cabinet, so the view comes
 *                      back when the film ends. Paid for by a queen MURPHY on the
 *                      wide leg: the floor exists sixteen hours a day. The cost is
 *                      a one-ended bed and an audience facing the glass.
 *   C  c-second-row    the picture goes on the bathroom partition again, but the
 *                      BED IS THE BACK ROW: a 17 1/2" Floyd queen lies head-to-
 *                      the-glass across the middle of the floor, under the 46"
 *                      seated-eye line, with four floor seats in front of it. Six
 *                      seats, no sofa. The cost is that the bed is public.
 *   D  d-paint-and-go  the picture is 118" of screen PAINT and a 2.9 lb portable
 *                      that lives in a closet — an $858 AV kit, nothing anchored,
 *                      nothing framed, nothing millwork. The cost is a
 *                      standard-throw lens standing in front of the audience and
 *                      550 lumens, i.e. after dark only.
 *   E  e-clear-shot    the same picture as A, on the same wall, but organised
 *                      around the SIGHTLINE instead of around the screen. The desk
 *                      goes in the north-west NOTCH — the only floor in this plate
 *                      no seat-to-screen ray crosses — and the queen goes ONTO THE
 *                      WALL, so sixteen hours a day there is no bed in the
 *                      apartment. 100% of the picture from every seat, a sofa dead
 *                      on the centreline, no errors and no warnings. The cost is
 *                      $2,159 of wall bed, a floor that must stay empty for it to
 *                      land on, and dining that is a drop-leaf for two.
 *
 * WHY E EXISTS, AND WHAT IT SAYS ABOUT THE OTHER FOUR. The client noticed that A's
 * desk was in the way of the picture, and they were right — but nothing in this
 * repo could see it, because analysis.ts tests a sightline by casting ONE ray from
 * seat centre to screen centre. scripts/sightline.ts casts a grid instead (five eye
 * positions per seat against 169 points on the image) and the result is that EVERY
 * other scheme here obstructs: A's sofa sees 92.0% of the picture and its bed 81.9%, B's
 * worst seat 79.5%, C's 89.0%, D's 91.8%, and in all four the main culprit is the
 * parked desk chair. E is the only one that returns 100.0% from every seat, and it
 * is also the only one that returns no errors and no warnings from pnpm check.
 *
 * WHAT IS COMMON TO ALL FIVE, and is not a matter of taste: blackout on all four
 * glazing bays is a CO-REQUISITE of every scheme, because a screen face taking
 * 500 lux of ambient sits at 28 fL of black against 54 fL of peak white — 1.9:1
 * in-room contrast, a grey rectangle. And CEILING MOUNTING IS OFF THE TABLE in
 * every one of them: the soffit is exposed structural concrete with no power and
 * 4" of clear above the glazing head.
 *
 * The shared desk-orientation rule — top east-west on a north wall, user facing
 * north, panel facing south, glass on the user's left — is written out once in
 * faces.ts, because all four cite it and none of them owns it.
 */

import type { Layout } from '@/core/types';

import aNightWall from './a-night-wall';
import bFoldAway from './b-fold-away';
import cSecondRow from './c-second-row';
import dPaintAndGo from './d-paint-and-go';
import eClearShot from './e-clear-shot';

/** Declaration order is presentation order in the app and in every script. */
export const layoutList: Layout[] = [aNightWall, bFoldAway, cSecondRow, dPaintAndGo, eClearShot];

export const layouts: Record<string, Layout> = Object.fromEntries(
  layoutList.map((l) => [l.id, l]),
);

/** Look a layout up by id, with a message that lists the real ids on a miss. */
export function getLayout(id: string): Layout {
  const found = layouts[id];
  if (!found) {
    throw new Error(`Unknown layout: ${id}. Known: ${layoutList.map((l) => l.id).join(', ')}`);
  }
  return found;
}
