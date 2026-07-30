/**
 * The four designed layouts for the 508 sq ft studio.
 *
 * Every one of them carries the same hard requirement — a real Fully Jarvis
 * sit-stand desk with a proper ergonomic chair, monitors on an arm, a task
 * light and a cable tray — and each one answers a genuinely different question
 * about how to live around it:
 *
 *   A  a-window-desk   work first: the desk takes the best daylight, the bed is
 *                      pushed to the far wall, and there is no dining table.
 *   B  b-fold-away     the bed disappears into the wall, so the west bay is a
 *                      dining / hosting room every day of the week.
 *   C  c-lounge-wall   a real living room: sectional, 55" screen, low platform
 *                      bed lying under the glass line in the north-west corner.
 *   D  d-two-rooms     build a partition: a screened study in the middle of the
 *                      plan, a bedroom-with-a-view at the glass.
 *
 * The shared reasoning behind the desk in all four is in a-window-desk.ts: the
 * glazing faces west, so the screens must face north or south, never into or
 * away from the afternoon sun.
 */

import type { Layout } from '@/core/types';

import aWindowDesk from './a-window-desk';
import bFoldAway from './b-fold-away';
import cLoungeWall from './c-lounge-wall';
import dTwoRooms from './d-two-rooms';

/** Declaration order is presentation order in the app and in every script. */
export const layoutList: Layout[] = [aWindowDesk, bFoldAway, cLoungeWall, dTwoRooms];

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
