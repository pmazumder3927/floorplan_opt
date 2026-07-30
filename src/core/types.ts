/**
 * Core data model. ALL lengths are decimal FEET.
 *
 * COORDINATE SYSTEM (2D plan space)
 *   origin  : top-left outer corner of the footprint
 *   +x      : east  / right
 *   +y      : south / DOWN the page (image convention, NOT math y-up)
 *   angles  : degrees, positive = CLOCKWISE on the page
 *
 * 3D mapping used by the renderer: plan (x, y) -> world (x, height, y),
 * i.e. three.js +Y is up and world +Z is plan south. Top-down cameras use
 * up = (0, 0, -1) so the 3D view matches the 2D drawing without mirroring.
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------- walls

export type WallKind = 'exterior' | 'partition';

export interface Wall {
  id: string;
  name: string;
  /**
   * For `exterior` walls these are the OUTER face (traced from the plan);
   * for `partition` walls they are the CENTERLINE.
   */
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  kind: WallKind;
  /**
   * Exterior only: which side of the start->end direction the interior is on.
   * Used to offset the outer face inward to get the inner face.
   */
  interiorSide?: 'left' | 'right';
}

// ------------------------------------------------------------- openings

export type OpeningKind = 'window' | 'door' | 'passage';

export interface DoorSwing {
  /**
   * Which end of the opening the hinge is on, measured along the wall:
   * 'near' = the `offset` end, 'far' = the `offset + width` end.
   */
  hinge: 'near' | 'far';
  /**
   * Which side of the wall the leaf sweeps into, relative to the wall's
   * start->end direction. With +y down, 'right' is the (-dy, dx) normal.
   */
  into: 'left' | 'right';
  /** swept angle, degrees. 90 = normal */
  angle: number;
}

export interface Opening {
  id: string;
  kind: OpeningKind;
  name: string;
  /** Wall.id this opening is cut into */
  wall: string;
  /** distance along the wall from Wall.start to the near edge of the opening */
  offset: number;
  width: number;
  /** bottom of the opening above the floor */
  sill: number;
  /** top of the opening above the floor */
  head: number;
  swing?: DoorSwing;
  approximate?: boolean;
}

// ---------------------------------------------------------------- zones

export type ZoneType =
  | 'living'
  | 'kitchen'
  | 'bath'
  | 'bedroom'
  | 'dining'
  | 'work'
  | 'circulation'
  | 'storage';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  /** closed polygon in plan coords (do not repeat the first vertex) */
  polygon: Vec2[];
  note?: string;
}

// ------------------------------------------------------------- fixtures

/** Built-in, non-movable equipment: appliances, plumbing, closets. */
export interface Fixture {
  id: string;
  name: string;
  category: 'kitchen' | 'bath' | 'laundry' | 'storage' | 'mechanical';
  /** axis-aligned footprint in plan coords */
  footprint: Rect;
  /** top of the object above the floor */
  height: number;
  /** base of the object above the floor (0 for floor-standing) */
  z?: number;
  /** direction the usable face points, degrees (0 = faces plan south / +y) */
  facing?: number;
  /** clear floor depth this fixture needs in front of its facing side */
  clearance?: number;
  approximate?: boolean;
  /** treat as an obstacle for circulation but not a hard collision (e.g. a rug-height sill) */
  soft?: boolean;
}

// ------------------------------------------------------------ floor plan

export interface FloorPlan {
  id: string;
  name: string;
  units: 'ft';
  ceilingHeight: number;
  /** outer wall face, closed polygon */
  footprint: Vec2[];
  /** inside face of exterior walls, closed polygon */
  interior: Vec2[];
  walls: Wall[];
  openings: Opening[];
  zones: Zone[];
  fixtures: Fixture[];
  meta: {
    statedAreaSqft?: number;
    footprintAreaSqft: number;
    interiorAreaSqft: number;
    overallWidth: number;
    overallDepth: number;
    accuracy?: string;
    source?: string;
  };
}

// -------------------------------------------------------------- catalog

export type FurnitureKind =
  | 'sofa'
  | 'sectional'
  | 'loveseat'
  | 'armchair'
  | 'ottoman'
  | 'bench'
  | 'bed'
  | 'sofa_bed'
  | 'murphy_bed'
  | 'nightstand'
  | 'dresser'
  | 'wardrobe'
  | 'shelf'
  | 'bookcase'
  | 'desk'
  | 'chair'
  | 'bar_stool'
  | 'dining_table'
  | 'coffee_table'
  | 'side_table'
  | 'console'
  | 'cabinet'
  | 'rug'
  | 'tv'
  | 'tv_stand'
  | 'plant'
  | 'floor_lamp'
  | 'table_lamp'
  | 'mirror'
  | 'art'
  | 'curtain'
  | 'screen'
  | 'box';

/**
 * A real product / archetype with real dimensions.
 * At rot=0: `w` runs along +x, `d` runs along +y, and the FRONT of the piece
 * (the side you sit on / face / open) points toward +y (plan south).
 */
export interface FurnitureDef {
  id: string;
  name: string;
  kind: FurnitureKind;
  w: number;
  d: number;
  h: number;
  /** seat / work-surface height where meaningful */
  seatHeight?: number;
  color?: string;
  /** secondary color for cushions / tops */
  accent?: string;
  /** where the dimensions came from, e.g. "IKEA SODERHAMN 3-seat" */
  source?: string;
  /** clear floor depth wanted in front (analysis only, not a collision) */
  frontClearance?: number;
  /** hangs on a wall: renderer lifts it to `z` and it does not block the floor */
  wallMounted?: boolean;
  /** default height off floor for wall-mounted pieces */
  defaultZ?: number;
  /** you can walk on / over it — never a collision */
  walkable?: boolean;
  /** low enough to see over; excluded from sightline blocking */
  lowProfile?: boolean;
  tags?: string[];
  price?: number;
}

/** An instance of a FurnitureDef placed in a layout. */
export interface PlacedItem {
  id: string;
  /** FurnitureDef.id */
  def: string;
  /** CENTER of the footprint, plan coords */
  at: Vec2;
  /** degrees clockwise on the page. 0 = front faces plan south (+y) */
  rot?: number;
  /** base above floor; defaults to def.defaultZ ?? 0 */
  z?: number;
  label?: string;
  color?: string;
  /** override the catalog dimensions (custom / built-in millwork) */
  size?: { w?: number; d?: number; h?: number };
  note?: string;
  /** exclude from collision + clearance analysis */
  ignoreAnalysis?: boolean;
}

export interface Layout {
  id: string;
  name: string;
  description?: string;
  /** FloorPlan.id */
  plan: string;
  items: PlacedItem[];
  notes?: string[];
  /** rough total of item prices, filled in by the analyzer */
  budget?: number;
}

// ------------------------------------------------------------- analysis

export type Severity = 'error' | 'warn' | 'info';

export interface Issue {
  severity: Severity;
  /** stable machine code, e.g. 'overlap', 'blocks-window', 'clearance' */
  code: string;
  message: string;
  /** PlacedItem / Fixture / Opening ids involved */
  refs?: string[];
  /** where to draw the marker in plan coords */
  at?: Vec2;
}

export interface LayoutStats {
  interiorAreaSqft: number;
  /** floor area covered by furniture footprints (walkable + wall-mounted excluded) */
  occupiedSqft: number;
  /** free floor as a fraction of interior area */
  freeFraction: number;
  itemCount: number;
  /** largest inscribed circle diameter along the main circulation path */
  narrowestPath?: number;
  budget?: number;
  byZone?: Record<string, { areaSqft: number; occupiedSqft: number; items: number }>;
}

export interface AnalysisResult {
  layout: string;
  issues: Issue[];
  stats: LayoutStats;
}

// ------------------------------------------------------------ rendering

export type ViewMode = '2d' | '3d';

export type CameraPreset =
  | 'top'
  | 'iso-ne'
  | 'iso-nw'
  | 'iso-se'
  | 'iso-sw'
  | 'eye-entry'
  | 'eye-kitchen'
  | 'eye-window'
  | 'eye-living';

export interface Render2DOptions {
  /** pixels per foot */
  scale?: number;
  /** page margin in pixels */
  margin?: number;
  showGrid?: boolean;
  showDimensions?: boolean;
  showFixtures?: boolean;
  showFurniture?: boolean;
  showLabels?: boolean;
  showZones?: boolean;
  showIssues?: boolean;
  showClearances?: boolean;
  showDoorSwings?: boolean;
  title?: string;
  subtitle?: string;
  theme?: 'light' | 'dark' | 'blueprint';
  issues?: Issue[];
  /** item ids to highlight */
  selected?: string[];
}

export interface Render3DOptions {
  camera?: CameraPreset;
  /** override camera position / target, world units (feet) */
  eye?: Vec3;
  target?: Vec3;
  fov?: number;
  showCeiling?: boolean;
  /** cut walls down to this height so a top/iso view can see in */
  wallCutHeight?: number;
  shadows?: boolean;
  /** 0..1 time of day used for the sun angle through the west windows */
  timeOfDay?: number;
  background?: string;
}
