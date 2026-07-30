/**
 * Units. The single source of truth for this project is DECIMAL FEET.
 * Every dimension stored in a plan, catalog entry or layout is feet.
 * These helpers exist so real-world dimensions can be written the way
 * they appear on a tape measure / spec sheet.
 */

/** Inches -> feet. `IN(36)` = 3 */
export const IN = (inches: number): number => inches / 12;

/** Feet + inches -> feet. `FTIN(6, 3)` = 6.25 */
export const FTIN = (feet: number, inches = 0): number => feet + inches / 12;

/** Centimeters -> feet (furniture spec sheets are often metric). */
export const CM = (cm: number): number => cm / 30.48;

/** Millimeters -> feet. */
export const MM = (mm: number): number => mm / 304.8;

const DIM_RE =
  /^\s*(?:(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*)?(?:[-\s]*(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)\s*)?$/;

/**
 * Parse a human dimension string into feet.
 * Accepts: 10.5 | "10.5" | `10'` | `10'-6"` | `10' 6"` | `36"` | "36in" | "9ft"
 */
export function parseDim(value: string | number): number {
  if (typeof value === 'number') return value;
  const raw = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);

  const cm = raw.match(/^\s*(\d+(?:\.\d+)?)\s*cm\s*$/i);
  if (cm) return CM(parseFloat(cm[1]));
  const mm = raw.match(/^\s*(\d+(?:\.\d+)?)\s*mm\s*$/i);
  if (mm) return MM(parseFloat(mm[1]));

  const m = raw.match(DIM_RE);
  if (!m || (m[1] === undefined && m[2] === undefined)) {
    throw new Error(`Cannot parse dimension: ${JSON.stringify(value)}`);
  }
  return (m[1] ? parseFloat(m[1]) : 0) + (m[2] ? parseFloat(m[2]) / 12 : 0);
}

/**
 * Format feet as a feet-inches string, e.g. 10.53 -> `10'-6"`.
 * @param denom round inches to 1/denom (1 = whole inches, 2 = half, 4 = quarter)
 */
export function formatFtIn(feet: number, denom = 1): string {
  const sign = feet < 0 ? '-' : '';
  const total = Math.abs(feet) * 12;
  let whole = Math.floor(total);
  let frac = Math.round((total - whole) * denom);
  if (frac === denom) {
    whole += 1;
    frac = 0;
  }
  let ft = Math.floor(whole / 12);
  const inch = whole % 12;
  const fracStr = frac ? `-${frac}/${denom}` : '';
  return `${sign}${ft}'-${inch}${fracStr}"`;
}

/** Short form for labels: 10.53 -> `10'6"`, 3.0 -> `3'` */
export function formatShort(feet: number): string {
  const total = Math.round(Math.abs(feet) * 12);
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  const sign = feet < 0 ? '-' : '';
  if (inch === 0) return `${sign}${ft}'`;
  if (ft === 0) return `${sign}${inch}"`;
  return `${sign}${ft}'${inch}"`;
}

/** Square feet, formatted. */
export function formatArea(sqft: number): string {
  return `${sqft.toFixed(1)} sq ft`;
}

/** Common real-world clearance minimums (feet). Referenced by the analyzer. */
export const CLEARANCE = {
  /** primary circulation path through a room */
  walkway: IN(36),
  /** secondary / squeeze-by path */
  walkwayTight: IN(30),
  /** in front of a sofa to a coffee table */
  sofaToTable: IN(16),
  /** pull out a dining chair and sit */
  diningChair: IN(36),
  /** side of a bed you need to walk down */
  bedSide: IN(24),
  /** in front of a closet / wardrobe door */
  closetFront: IN(30),
  /** kitchen work aisle, single cook */
  kitchenAisle: IN(42),
  /** in front of a fridge / dishwasher / oven to load it */
  applianceFront: IN(36),
  /** clear floor in front of an entry door before it hits something */
  entryDoor: IN(36),
  /** desk chair pushback */
  deskChair: IN(30),
  /** TV viewing distance per inch of diagonal (min / max multipliers, feet per inch) */
  tvViewingMin: 1.2 / 12,
  tvViewingMax: 2.5 / 12,
} as const;
