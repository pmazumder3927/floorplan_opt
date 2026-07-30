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
 *                      sofa plus two poufs, GRIMSBU queen head-to-the-glazing in
 *                      the notch. The best picture this apartment can make; the
 *                      cost is that it is an evening room and there is no dresser.
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
 *
 * WHAT IS COMMON TO ALL FOUR, and is not a matter of taste: blackout on all four
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

/** Declaration order is presentation order in the app and in every script. */
export const layoutList: Layout[] = [aNightWall, bFoldAway, cSecondRow, dPaintAndGo];

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
