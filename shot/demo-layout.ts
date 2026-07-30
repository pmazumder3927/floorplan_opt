/**
 * A hand-placed reference layout used to exercise the renderers.
 *
 * Strategy: the four west windows are the best thing about the unit, so the
 * sleeping zone takes the north-west notch (you wake up next to daylight, and a
 * 1'-11" platform bed sits well below the 2'-6" sills so it never blocks light).
 * The living group sits in the east half against the only usable blank wall — the
 * north wall of the wide leg — leaving the closet corridor clear as the route
 * from the front door to everything else.
 *
 * Every coordinate below is derived from a real inner wall face or a real
 * clearance, and is noted as such. This file is deliberately separate from
 * src/layouts/ so it can never be confused with the designed layouts.
 */

import type { Layout } from '@/core/types';

// Inner faces this layout is dimensioned off (see src/core/plan.ts).
const W_FACE = 0.59; // west wall
const N_FACE = 0.63; // north wall, west notch
const N_FACE_WIDE = 3.22; // north wall, east of the notch
const STEP_X = 9.93; // the step between the two north walls
const BATH_W = 18.865; // outer face of the bathroom's west partition

const demoLayout: Layout = {
  id: 'demo-openloft',
  name: 'Demo — open loft',
  description:
    'Reference layout for render testing: sleeping in the north-west notch by the windows, living group on the north wall of the wide leg, two-seat dining between them.',
  plan: 'studio-508',
  items: [
    // ---------------------------------------------------------- sleeping
    {
      id: 'bed',
      def: 'bed-queen-platform',
      // Head flush to the north wall, centred in the 9'-4" notch. A 5'-5" frame
      // leaves 23 1/2" each side — 1/2" under the 24" ideal, which is simply what
      // a queen costs in a notch this wide.
      at: [(W_FACE + STEP_X) / 2, N_FACE + 7.17 / 2],
      rot: 0,
      note: "Centred in the notch; 23 1/2\" aisles both sides.",
    },
    {
      id: 'nightstand-w',
      def: 'nightstand-hemnes',
      at: [1.8, N_FACE + 1.17 / 2],
      rot: 0,
    },
    {
      id: 'nightstand-e',
      def: 'nightstand-hemnes',
      at: [8.72, N_FACE + 1.17 / 2],
      rot: 0,
    },
    {
      id: 'art-bed',
      def: 'art-framed-large',
      // Hung over the bed head, gallery height.
      at: [(W_FACE + STEP_X) / 2, N_FACE + 0.10],
      rot: 0,
      z: 4.5,
    },

    // ------------------------------------------------------------ dining
    {
      id: 'dining',
      def: 'dining-round-36',
      // Between the foot of the bed (y 7.80) and the 42" kitchen work aisle
      // (which starts at y 13.57), pushed east so a chair never sits in front of
      // a window (the chair back is 2'-9", the sills are only 2'-6" up).
      at: [6.0, 11.6],
      rot: 0,
    },
    { id: 'chair-w', def: 'chair-dining', at: [3.6, 11.6], rot: 270 },
    { id: 'chair-e', def: 'chair-dining', at: [8.4, 11.6], rot: 90 },

    // ------------------------------------------------------------ living
    {
      id: 'media',
      def: 'tv-stand-besta-71',
      // Flush to the north wall of the wide leg, clear of the bath partition.
      at: [14.96, N_FACE_WIDE + 1.42 / 2],
      rot: 0,
    },
    {
      id: 'tv',
      def: 'tv-55-wall',
      at: [14.96, N_FACE_WIDE + 0.17],
      rot: 0,
      z: 3.5,
    },
    {
      id: 'sofa',
      def: 'sofa-3seat-soderhamn',
      // Facing north at the TV. Front edge at y 9.50 puts the seat 6'-1" from
      // the screen — inside the 5'-6" to 11'-6" comfortable range for 55".
      at: [14.96, 9.5 + 3.25 / 2],
      rot: 180,
      note: 'Floats to define the living zone; its back is the divider to the bedroom.',
    },
    {
      id: 'coffee',
      def: 'coffee-table-rect-48',
      // 17" off the sofa front — just over the 16" minimum.
      at: [14.96, 9.5 - 1.42 - 1.0],
      rot: 0,
    },
    {
      id: 'armchair',
      def: 'armchair-strandmon',
      at: [11.0, 7.0],
      rot: 180,
    },
    {
      id: 'rug-living',
      def: 'rug-8x10',
      // 8' runs east-west, stopping 1/2" short of the bath partition. The whole
      // seating group lands on it, not just the front legs.
      at: [BATH_W - 4.02, 9.8],
      rot: 0,
    },
    // Reading lamp beside the wing chair, and clear of the corridor south of the sofa.
    { id: 'lamp-living', def: 'lamp-floor-hektar', at: [9.0, 6.5], rot: 0 },
    // Kept west of x 17.95 so it stays out of the 30" you need to open the closets.
    { id: 'plant-living', def: 'plant-fiddle-leaf-6ft', at: [16.7, 14.16], rot: 0 },
    { id: 'plant-mid', def: 'plant-medium-40in', at: [10.5, 4.3], rot: 0 },

    // ------------------------------------------------------------- entry
    {
      id: 'shoes',
      def: 'cabinet-shoe-bissa',
      // South wall of the entry nook, out of the front door's swing.
      at: [28.69, 18.36 - 0.92 / 2],
      rot: 180,
    },

    // ----------------------------------------------------------- windows
    {
      id: 'curtain-n',
      def: 'curtain-panel-50x96',
      at: [W_FACE + 0.17, 4.2],
      rot: 270,
      z: 0,
    },
    {
      id: 'curtain-s',
      def: 'curtain-panel-50x96',
      at: [W_FACE + 0.17, 14.8],
      rot: 270,
      z: 0,
    },
  ],
  notes: [
    'Reference/QA layout, not one of the four designed schemes.',
    'Sleeping in the notch trades bedside aisle width (23 1/2") for keeping the whole east half free for living.',
    'The sofa deliberately floats: its back is the only "wall" available between the sleeping and living zones.',
  ],
};

export default demoLayout;
