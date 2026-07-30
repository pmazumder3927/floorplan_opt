/**
 * finishes.ts — the FINISH AND TRIM SCHEDULE for the real unit.
 *
 * WHY THIS FILE EXISTS. The client asked for "trim details to match the room",
 * and pointed at the reference photograph. Everything the renderer needs to
 * match that photograph already lives in src/render3d/materials.ts and
 * scripts/blender/materials.py — but those files exist to make PIXELS. Neither
 * of them can tell a person which black to buy, or that this apartment has no
 * baseboard and therefore nothing may have a scribed back.
 *
 * So this is the schedule as a designer would hand it to a contractor: one entry
 * per surface, each with the colour, the sheen, and — crucially — the PHOTOGRAPHIC
 * EVIDENCE it was read from, followed by the rule a NEW piece of furniture has to
 * obey to look native in this room.
 *
 * PROVENANCE, stated once and honestly. Every hex below is an ILLUMINANT-CORRECTED
 * READ off data/reference/unit-photo-living-west.jpeg, obtained by sampling patch
 * means and luminance percentiles, not by holding a meter to a wall. That
 * photograph is a low-light phone frame: soft, heavily JPEG-compressed at 824x925,
 * white-balanced toward daylight, with a blown-out window and a mixed
 * cool-daylight / warm-downlight field. Sampled pixels are RADIANCE, not albedo.
 * Where a surface is lit by two different illuminants — the kitchen uppers by cool
 * window bounce, the bases by warm downlight in the counter's shadow — the albedo
 * had to be recovered by RATIO against an adjacent same-illuminant surface, and
 * those entries carry the widest error. A grey card and a second exposure would
 * materially improve the floor, cabinet and counter values.
 *
 * SIX ENTRIES ARE NOT IN THE PHOTOGRAPH AT ALL — interior door leaves, door
 * casings, closet doors and laundry doors. They are marked `verified: false` and
 * are specified by INFERENCE from the language the photo does establish
 * (handleless slab casework, no baseboard, drywall-return reveals). A brief must
 * never present them as photographic fact, and `briefNote()` below makes sure it
 * does not.
 */

export type Sheen =
  | 'flat'
  | 'matte'
  | 'satin'
  | 'low-sheen'
  | 'semi-gloss'
  | 'gloss'
  | 'near-mirror'
  | 'none';

export interface FinishEntry {
  id: string;
  /** The surface, named the way a schedule names it. */
  surface: string;
  /** What it physically is: the material and its build-up. */
  material: string;
  /** Illuminant-corrected albedo, '#rrggbb'. null where the entry IS an absence. */
  hex: string | null;
  sheen: Sheen;
  /** Gloss units where a real range is meaningful. */
  gloss?: string;
  /** Where in the photograph this was read, and what it sampled. */
  evidence: string;
  /** What a NEW piece has to do to look native. This is the useful half. */
  rule: string;
  /** false = not visible in the reference frame; specified by inference. */
  verified: boolean;
  /** Trade responsible, for a schedule that has to be issued to someone. */
  trade?: string;
  /**
   * Installed unit rate, US mid-2026, with the unit stated in `rateUnit`.
   * BALLPARK ONLY — not one of these came from a quotation.
   */
  rate?: number;
  rateUnit?: string;
}

/**
 * THE SCHEDULE. Ordered the way you would walk a room: the big three surfaces,
 * then the glazing, then the trim that is not there, then the kitchen, then
 * services, then the pieces the photo could not see.
 */
export const FINISH_SCHEDULE: FinishEntry[] = [
  {
    id: 'floor',
    surface: 'FLOOR',
    material:
      'Engineered hardwood, ~7 1/2" x random-length plank, micro-bevel on all four edges, UV-cured factory satin',
    hex: '#6d5847',
    sheen: 'satin',
    gloss: '25-35 GU',
    evidence:
      "Floor luminance percentiles over y560-920, x120-820: p05 #6b5446, p15 #7a6554, p85 #c2c9d1, p95 #cbd5df. The p05-p15 pixels are the plank's own diffuse under window bounce — a mid warm brown at low chroma, R-B about 37. The p85-p95 pixels are SKY carried in the sheen, not wood, which is the whole reason a matte floor cannot reproduce this frame. Shadowed foreground (y780-920, x150-800) means #907d71. Plank layout read off a y600-900 crop: staggered end joints, wide boards, a fine micro-bevel.",
    rule:
      'This is the ONLY wood in the room, and new timber must not try to match it. Furniture wood goes either clearly lighter (natural/white oak, about #a9793f) or clearly darker (walnut, about #5d4029). A near-miss brown reads as a colour-match failure rather than a choice. Never a red or orange wood next to it.',
    verified: true,
    trade: 'Flooring',
    rate: 13,
    rateUnit: '$/sq ft installed',
  },
  {
    id: 'walls',
    surface: 'WALLS',
    material: 'Flat acrylic latex over a level-4 skim, no texture',
    hex: '#f3f1ed',
    sheen: 'flat',
    gloss: '2-5 GU',
    evidence:
      'The return wall right of the glazing (y260-470, x782-822) means #84867b in SHADE with a per-channel std of only 5.0/6.2/7.9 — warm-neutral, R-B = +9, so there is no cream and no blue in it. The structural pier between the bays reads #748491 where it catches sky. There is ZERO specular response on any wall plane at any angle anywhere in the frame, so the sheen is genuinely flat.',
    rule:
      'The walls are the neutral field, so NOTHING hung on them may be white — art, shelving and screens must be at least two values darker or they dissolve. Keep the paint flat: any sheen above eggshell starts showing the drywall butt joints this photograph does not show.',
    verified: true,
    trade: 'Painting',
    rate: 2.4,
    rateUnit: '$/sq ft',
  },
  {
    id: 'soffit',
    surface: 'CEILING / SOFFIT',
    material: 'Exposed cast-in-place structural concrete, clear penetrating sealer only — unpainted',
    hex: '#aeb8bd',
    sheen: 'matte',
    gloss: '<3 GU',
    evidence:
      'Ceiling patch y20-110, x250-800 means #88999d with a per-channel std of 16.0/19.5/25.3 — patchy at metre scale, and distinctly COOL: R < G < B, B-R = +22. Spot samples run #abb8c0 bright by the glass down to #7c8787 deep over the kitchen, a swing of roughly 40% in value. Form-tie marks and curing blotches are visible in the upper crop. Portland-cement paste really is a blue-grey, and it is lit almost entirely by skylight, so both the albedo and the illuminant push it cool.',
    rule:
      'The ceiling is the room\'s texture, so keep it clear: no surface-mounted fixtures, no track, no fan, nothing with a visible canopy screwed to the slab. Anything tall — a wardrobe, a bookcase, a screen cassette — must stop at least 4" shy of it, because a full-height case butting bare concrete reads as a mistake rather than a detail. And note what this means for AV: there is no power in a concrete soffit and overhead anchors in tension need a GPR scan before anyone drills.',
    verified: true,
    trade: 'Concrete finisher — grind, patch and seal. NOT the painter.',
    rate: 1.8,
    rateUnit: '$/sq ft',
  },
  {
    id: 'window-reveal',
    surface: 'WINDOW HEAD + JAMB REVEALS',
    material: 'Painted drywall return on metal corner bead — NO casing. Reads 3-6" deep',
    hex: '#f3f1ed',
    sheen: 'flat',
    evidence:
      'The right jamb return is a distinct light plane at x752-772, y200-460, sampling #95a09a — separated from the wall face by a clean arris and reading one value step darker because it turns away from the room. The head reveal is the light band at y126-140, x220-430, sampling #94bedc, stepping down off the concrete soffit before it reaches the frame head.',
    rule:
      'The reveal is the only "trim" this room has, and it is NEGATIVE rather than applied. Never add casing, never add a stool or an apron. Anything parked at the glazing — a desk, a shade cassette, a plant — must sit clear of the return so the arris stays one unbroken line. That line is the detail.',
    verified: true,
    trade: 'Drywall + painting',
    rate: 34,
    rateUnit: '$/linear ft',
  },
  {
    id: 'glazing-frame',
    surface: 'WINDOW FRAMES + SLIDER SECTIONS',
    material:
      'Thermally broken aluminium window wall / sliding doors, Class 1 dark bronze-black anodised, slim sightlines',
    hex: '#2b2f33',
    sheen: 'satin',
    gloss: '8-12% reflectance',
    evidence:
      'Measured against a 311 px glass height for a ~100" lite (0.32 in/px): right-bay mullion 7 px = about 2 1/4"; right-bay jamb 6 px = about 1 7/8". Left bay (0.30 in/px): meeting stile 12 px = about 3 5/8"; outer jamb only 5 px = about 1 1/2". Colour: the SHADED mullion at x626-631 samples #253d46 while the SAME section catching sky at x342-348 goes to #6693b1 — so it is a charcoal that visibly CARRIES the sky, not a black hole.',
    rule:
      'THIS is the room\'s black, and it is the only structural one: a charcoal with a blue lean at #2b2f33 in a SATIN metal finish. Every added black must match it — table legs, monitor arms, screen bezels, desk frames, shelf uprights, shade cassettes — and it must show a bright arris where it catches the window, because that highlight is what makes it belong. Never a warm or brown-black, never a matte powder coat that eats light, and never a true #000000: both read as a hole next to the real sections.',
    verified: true,
    trade: 'Glazing (building standard) — not replaceable; match for any added metal',
    rate: 95,
    rateUnit: '$/sq ft of assembly',
  },
  {
    id: 'glazing-glass',
    surface: 'GLAZING',
    material: '1" IGU, clear float with a soft-coat low-e on surface 2, floor to ceiling',
    hex: '#eef4f4',
    sheen: 'near-mirror',
    gloss: 'optically smooth',
    evidence:
      'Sky through the left bay at (280,250) samples #f6f6f8 — essentially unattenuated white, so the glass is CLEAR and not tinted. The adjacent curtain-wall tower through the right bay at (600,350) samples #a4d5ee, a faint green-cyan, which is the low-e coating showing at an angle rather than a body tint.',
    rule:
      'The glass is the brightest thing in the room by orders of magnitude, so it sets the contrast budget for everything else. Nothing white and large goes in front of it or it silhouettes to grey. This is also the one place in the unit where light control is a hard requirement rather than a preference — a projected image and an uncurtained west wall cannot coexist.',
    verified: true,
    trade: 'Glazing',
    rate: 42,
    rateUnit: '$/sq ft',
  },
  {
    id: 'glazing-track',
    surface: 'GLAZING SILL / SLIDER TRACK',
    material: 'Same anodised aluminium system as the frames, landing directly on the slab',
    hex: '#2b2f33',
    sheen: 'satin',
    evidence:
      'Row scans at x=260 and x=400 find a dark run at y476-502, about 22 px against a 0.30 in/px scale = roughly 2 1/2 to 3" tall including its shadow line. Sampled at y492-505, x240-430 it means #606c72 with a std of 49.6 — a dark section with a BRIGHT top edge catching sky. The plank floor butts straight to it: no stool, no apron, no threshold ramp.',
    rule:
      "The track is the datum at the glazing: nothing gets a plinth or a base here. A rug must stop 4-6\" short of it so the track's bright top edge stays readable, and any piece pushed to the glass must clear the 3\" track depth.",
    verified: true,
    trade: 'Glazing',
    rate: 26,
    rateUnit: '$/linear ft',
  },
  {
    id: 'baseboard',
    surface: 'BASEBOARD',
    material: 'NONE. A plain butt with a hairline shadow gap',
    hex: null,
    sheen: 'none',
    evidence:
      'Crop x700-824, y440-560 at 8x: the right-hand wall meets the plank floor as a PLAIN BUTT with a thin dark shadow line and nothing else — no base, no shoe, no reveal band, no quarter-round. The same read holds at the kitchen wall/floor junction and at the glazing, where the aluminium track lands straight on the slab. The junction reads as a roughly 1/16" dark hairline, about #3a3733, matte.',
    rule:
      'Because there is no base, NOTHING can hide against one. Every case piece must be dead flat on the back or intentionally standing off the wall on legs; a piece with a scribed back or a base-relief cut will show a gap. And do not add base trim to make a piece fit — the absence of base is this room\'s strongest minimal cue. One useful side effect: it is also what lets an ultra-short-throw projector\'s plinth sit truly flush, and a 3/4" base would cost about 3 1/2" of image width on a 0.21:1 lens.',
    verified: true,
    trade: 'n/a — a deliberate omission, priced as a credit',
    rate: 0,
    rateUnit: '$',
  },
  {
    id: 'pier',
    surface: 'STRUCTURAL PIER BETWEEN WINDOW BAYS',
    material: 'Drywall-wrapped pier, flat latex, square arrises on metal bead — about 2 ft wide',
    hex: '#f3f1ed',
    sheen: 'flat',
    evidence:
      'The pier occupies x460-515 from y150 to y500, sampling #768fa5 at (490,250) where it catches sky and #6c6b69 at (490,420) lower down — the same paint as the walls, reading cooler above and warmer as the light falls off. A 5x crop resolves TWO planes: a brighter face and a narrower, roughly 6" darker return going back to the left bay.',
    rule:
      'The pier is the only solid wall inside the glazing run, so it is the ONLY place in the west wall you can hang or lean anything. At about 2 ft wide it sets a hard limit: nothing wider than 24" can land on it. Keep its arrises clear.',
    verified: true,
    trade: 'Drywall + painting',
    rate: 2.4,
    rateUnit: '$/sq ft',
  },
  {
    id: 'kitchen-uppers',
    surface: 'KITCHEN UPPER CABINETS',
    material: 'Frameless handleless slab fronts, satin catalysed lacquer or matte laminate, integrated finger pull',
    hex: '#7f7871',
    sheen: 'satin',
    gloss: '20-30 GU',
    evidence:
      'The upper slab face (y170-270, x40-100) means #6b6e6f, lit ONLY by cool window bounce, while the adjacent wall strip (y180-270, x120-140) means #8999a4. Same-illuminant ratio puts the fronts at roughly 0.6-0.7 of the wall\'s reflectance — a MID-DARK warm grey around #7f7871, clearly darker than both the wall and the base cabinets but NOWHERE NEAR black. WIDEST ERROR BAR IN THE SCHEDULE: about +/-15% of value, because the uppers and bases are lit by two different illuminants and cannot be compared directly. What is certain is the ORDERING and the SEPARATION — counter lightest, bases a step down, uppers two steps down.',
    rule:
      'The uppers are the room\'s mid-dark mass and they are HANDLELESS. Any new storage in the same sightline must also be handleless — push-latch or an integrated finger pull; a knob or a bar pull on a case piece next to this run instantly reads as a different, cheaper kitchen. Mid-dark warm grey is also the safe body colour for a credenza or a wardrobe, because it is the only mid tone the room already contains.',
    verified: true,
    trade: 'Casework (building standard) — match, do not replace',
    rate: 220,
    rateUnit: '$/linear ft',
  },
  {
    id: 'kitchen-bases',
    surface: 'KITCHEN BASE CABINETS',
    material: 'Frameless handleless slab fronts, satin catalysed lacquer, integrated finger pull',
    hex: '#c6c0b6',
    sheen: 'satin',
    gloss: '20-30 GU',
    evidence:
      "The base door face (y430-540, x92-112) means #635d53 sitting in the counter's own shadow, while the splash wall directly above it (y300-370, x95-150) means #be936e under the SAME warm downlight. Correcting for the roughly 45% illuminance the door receives under the overhang puts the fronts at about 0.7 of the wall's reflectance — a LIGHT warm greige around #c6c0b6. Same +/-15% caveat as the uppers.",
    rule:
      'Light warm greige is the room\'s second wood substitute: use it for anything you want to disappear — a low credenza, a bench, a closet front. Also handleless. Do NOT go to white: the counter is the lightest surface in the room and a white case piece beside it flattens the whole run.',
    verified: true,
    trade: 'Casework (building standard)',
    rate: 260,
    rateUnit: '$/linear ft',
  },
  {
    id: 'counter',
    surface: 'COUNTERTOP',
    material: 'Engineered quartz, honed-to-satin, 1" square eased drop edge, very fine low-contrast speckle',
    hex: '#d8d4cc',
    sheen: 'low-sheen',
    gloss: '20-30 GU',
    evidence:
      "The counter surface (y382-398, x60-140) means #b78459 and the splash wall directly behind it (y300-370, x95-150) means #be936e — both under the SAME warm downlight, so they are directly comparable: the counter is about 0.90 of the wall's sRGB luminance and slightly WARMER (R/G 1.394 against 1.30), i.e. a light warm greige stone at roughly #d8d4cc albedo. The front edge reads as a single thin dark line, a 3/4 to 1\" square eased drop.",
    rule:
      'The counter is the lightest plane in the unit and its edge is THIN and SQUARE. Any added work surface — a desk top, a console, a dining top — must repeat that: 1 to 1 1/2", square, eased. No bullnose, no ogee, no mitred waterfall, no 3" laminated fascia. Low sheen, so no glass tops and no lacquered gloss anywhere in the same frame.',
    verified: true,
    trade: 'Stone fabricator',
    rate: 78,
    rateUnit: '$/sq ft',
  },
  {
    id: 'splash',
    surface: 'SPLASH',
    material: 'NONE. The wall paint runs to the counter',
    hex: '#f3f1ed',
    sheen: 'flat',
    evidence:
      'Crop x20-120, y320-420 at 8x: the wall paint runs straight down through a plain inside corner to the counter\'s back edge. No tile field, no cove, no trim profile, no stone upstand, no grout line anywhere. The only interruption is a white outlet plate. The warm pool of light on that wall comes from a concealed under-cabinet LED, not from any reflective splash material.',
    rule:
      'The room has NO tile in it. Do not introduce a tile field, a mosaic, a mirrored splash or a stone upstand anywhere in the main volume; the kitchen\'s only vertical materials are painted drywall and the two cabinet colours.',
    verified: true,
    trade: 'n/a — a deliberate omission',
    rate: 0,
    rateUnit: '$',
  },
  {
    id: 'kitchen-hardware',
    surface: 'KITCHEN HARDWARE / PULLS',
    material: 'NONE VISIBLE. Integrated finger pull / push-latch',
    hex: null,
    sheen: 'none',
    evidence:
      'Both crops — the uppers at x0-180, y150-300 at 6x and the base run at x0-200, y100-700 at 4x — show slab fronts with faint vertical door seams and NOT ONE pull, knob, bar, rail or edge profile on any door or drawer. The only visible hardware in the whole kitchen is the range\'s own tubular oven handle and the faucet. The "hardware" is a roughly 1/8" shadow-gap reveal reading as a dark hairline, about #3a3733.',
    rule:
      'This is the single easiest way to make a new case piece look foreign. NO pulls on anything in the main volume: no bar pulls, no knobs, no leather tabs, no brass. If a piece needs to open, it opens on a push-latch or a routed finger recess. The only tubular metal allowed is on the appliances, where the photograph already has it.',
    verified: true,
    trade: 'n/a — a deliberate omission',
    rate: 0,
    rateUnit: '$',
  },
  {
    id: 'appliances',
    surface: 'APPLIANCE FINISH',
    material:
      'Freestanding electric range + front-control dishwasher: brushed stainless bodies, black ceramic glass cooktop and oven door',
    hex: '#cdd1d3',
    sheen: 'satin',
    evidence:
      'Crop x0-140, y400-700 at 5x resolves a freestanding electric range: brushed stainless fascia (y440-470, x20-70 means #596568 with a std of 51.2 — the high std is because steel shows its surroundings, not its albedo), FIVE front-mounted knobs, a full-width tubular stainless oven handle, and a large BLACK GLASS oven door with a window (y500-600, x10-70 means #1e2123). Black ceramic glass reads #0b0c0e and GLOSSY, which is a different black from the anodised frames.',
    rule:
      'The stainless is the room\'s only bright metal mass and it is BRUSHED, horizontally, satin — never mirror-polished. Black ceramic glass is the room\'s second black and it is GLOSSY, unlike the anodised frames, so a screen or a monitor beside it is consistent while a matte-black appliance panel is not. Do not introduce a third appliance finish: no white, no panel-ready, no slate.',
    verified: true,
    trade: 'Appliance package (building standard)',
    rate: 1050,
    rateUnit: '$ (the range)',
  },
  {
    id: 'faucet',
    surface: 'FAUCET',
    material: 'Single-hole high-arc pull-down kitchen faucet, polished/satin chrome',
    hex: '#e9ecee',
    sheen: 'near-mirror',
    evidence:
      'Crops x0-180, y290-500 at 5x and x20-120, y320-420 at 8x: a single-hole faucet with a tall smooth gooseneck arc and a cylindrical pull-down spray head, deck-mounted behind the sink. It reads as a bright continuous specular LINE down the arc rather than as a colour — a sample at (25,340) returns #6d5643, which is the warm-lit wall behind it, not its own albedo. That is what a near-mirror does.',
    rule:
      'Chrome is confined to plumbing and to the appliance handles. Do NOT extend it to furniture: no chrome legs, no chrome lamp stems, no chrome shelf brackets. Furniture metal is the anodised charcoal #2b2f33, full stop. Mixing chrome into the furniture is what makes a room read as a showroom rather than as this unit.',
    verified: true,
    trade: 'Plumbing (building standard)',
    rate: 290,
    rateUnit: '$ each',
  },
  {
    id: 'sink',
    surface: 'SINK',
    material: 'Undermount single bowl, dark graphite granite/quartz composite',
    hex: '#2e2b28',
    sheen: 'matte',
    evidence:
      'The basin (y392-412, x10-60) means #724e34 with a std of 43.2 — dark, and warm ONLY because it is picking up the warm downlight off the wall. Against the counter beside it (#b78459 under the same light) it is roughly a third of the luminance, so the basin material is genuinely DARK rather than stainless. A clean undermount reveal is visible in both crops.',
    rule:
      'The sink is the room\'s third dark accent and it is MATTE. It is the precedent for a dark matte surface at counter height — so a dark matte desk pad or tray is consistent — but it is NOT a precedent for stainless: do not put a stainless bowl in this counter.',
    verified: true,
    trade: 'Plumbing / stone fabricator',
    rate: 420,
    rateUnit: '$ each',
  },
  {
    id: 'downlights',
    surface: 'RECESSED DOWNLIGHTS',
    material: '4" aperture LED downlight, flush white trim, 2700-3000 K',
    hex: '#eceae6',
    sheen: 'satin',
    evidence:
      'Crop x215-300, y70-130 at 8x: the fitting core at (252,98) samples #f7e9db — blown out AND clearly WARM, R-B = +28, which puts it at 2700-3000 K against a distinctly cool daylit room. The surrounding halo at (252,105) samples #d2d4dc, a soft warm-to-neutral bleed onto the concrete over roughly three times the aperture. The trim is essentially INVISIBLE against the soffit; there is no visible ring and no proud housing.',
    rule:
      'The ceiling light is WARM (2700-3000 K) and completely FLUSH; the daylight is cool. Every added lamp must be 2700-3000 K to agree with the ceiling, and no added fixture may be surface-mounted on the soffit. Task light lives on the floor, on the desk, or under a cabinet — never screwed to the concrete.',
    verified: true,
    trade: 'Electrical (building standard)',
    rate: 78,
    rateUnit: '$ each',
  },
  {
    id: 'device-plates',
    surface: 'SWITCH + OUTLET PLATES',
    material: 'Screwless snap-on decorator plate, white',
    hex: '#f4f3f0',
    sheen: 'satin',
    evidence:
      'Crop x20-120, y320-420 at 8x: a pale portrait-orientation plate on the kitchen splash wall at roughly (70,363), about 44" AFF above the counter, sampling #af7b55 under the warm downlight — essentially the same value as the white wall beside it (#be936e), so the plate is WHITE, not ivory and not metal. No screw heads or shadows resolve at 8x.',
    rule:
      'Device plates are white and screwless, and they are the only white "object" the walls carry. Do not specify brushed metal or black plates as a design gesture. And when placing furniture, keep case backs clear of them — a plate half-hidden behind a credenza is the detail that reads as unplanned.',
    verified: true,
    trade: 'Electrical (building standard)',
    rate: 9,
    rateUnit: '$ each',
  },

  // ---- NOT VISIBLE IN THE REFERENCE FRAME -------------------------------
  {
    id: 'door-leaves',
    surface: 'INTERIOR DOOR LEAVES',
    material: 'Flush hollow-core paint-grade slab, semi-gloss acrylic enamel',
    hex: '#f6f5f2',
    sheen: 'semi-gloss',
    gloss: '40-50 GU',
    evidence:
      'NOT VISIBLE. The reference frame looks west across the living area to the glazing with the kitchen on the left; no door leaf, casing or hinge appears anywhere in it. Specified by CONVENTION for a building whose visible language is handleless slab casework, no baseboard and drywall-return reveals — a flush paint-grade slab with no panel moulding is the only leaf consistent with that. This would be the one place in the unit with sheen above satin.',
    rule:
      'If doors are drawn, they must be FLUSH: no panel mouldings, no shaker rails, no glazed lites. Hardware is a lever in the anodised charcoal #2b2f33 satin, matching the window sections — not chrome (that is plumbing) and not brass.',
    verified: false,
    trade: 'Millwork + painting',
    rate: 310,
    rateUnit: '$ each',
  },
  {
    id: 'door-casings',
    surface: 'INTERIOR DOOR CASINGS',
    material: 'Drywall return on bead, or a flat square-edge band under 2"',
    hex: '#f6f5f2',
    sheen: 'flat',
    evidence:
      'NOT VISIBLE — no door opening appears in the frame. What the photograph DOES establish is that this unit has no applied trim anywhere it can be seen: no baseboard, and no window casing (the reveal at x752-772 is a bare painted drywall return with a metal-bead arris). The inference extends that logic.',
    rule:
      'There is no moulding profile anywhere in this unit. If a casing is drawn it must be a flat square-edge band under 2", or better, a drywall return. Never a colonial, ranch or ogee profile — a single moulded profile would be the most out-of-place object in the whole model.',
    verified: false,
    trade: 'Millwork / drywall',
    rate: 7,
    rateUnit: '$/linear ft',
  },
  {
    id: 'closet-doors',
    surface: 'CLOSET DOORS',
    material: 'Flush painted slab, or a full-height handleless sliding / bypass panel',
    hex: '#c6c0b6',
    sheen: 'satin',
    evidence:
      'NOT VISIBLE — no closet appears in the frame. The only defensible inference is from the kitchen casework, which is frameless handleless slab in two colours, so a closet front here is most likely either the same pale greige slab (#c6c0b6) or a flush panel matching the walls (#f3f1ed).',
    rule:
      'Whatever the closet front is, it is HANDLELESS and it is either wall colour or the pale greige casework colour. Do not give it a bar pull, a mirrored face, or a louvred bifold — all three contradict the kitchen\'s language.',
    verified: false,
    trade: 'Millwork',
    rate: 430,
    rateUnit: '$ each',
  },
  {
    id: 'laundry-doors',
    surface: 'LAUNDRY DOORS',
    material: 'Flush handleless panel over a stacked washer/dryer',
    hex: '#c6c0b6',
    sheen: 'satin',
    evidence:
      "NOT VISIBLE — no laundry closet, appliance or door appears in the frame. src/render3d/materials.ts lists 'range, dishwasher, fridge, laundry' as sharing one stainless spec, which is a REPO assumption rather than something this photograph supports.",
    rule:
      'If the laundry is enclosed, the enclosure follows the closet rule: flush, handleless, wall or pale-casework colour. If the appliances are exposed they follow the appliance rule: brushed satin stainless, never white and never a third finish.',
    verified: false,
    trade: 'Millwork',
    rate: 390,
    rateUnit: '$ each',
  },
];

/**
 * THE TRIM RULES, separated out because they are the half of the schedule a
 * furniture decision actually consults. Each one is a short list of what to use
 * and a blunt list of what not to.
 */
export interface TrimRule {
  id: string;
  title: string;
  use: string;
  avoid: string;
  why: string;
}

export const TRIM_RULES: TrimRule[] = [
  {
    id: 'blacks',
    title: 'THE BLACKS — there are exactly two, and they behave differently',
    use:
      'ANODISED CHARCOAL #2b2f33, satin, for every structural and furniture black: table and desk legs, monitor arms, shelf uprights, screen bezels, lamp stems, shade cassettes. It must show a bright arris where it catches the window — that highlight is what makes it belong. GLOSSY BLACK GLASS #0b0c0e only for screens and appliance glass, where the photograph already has it.',
    avoid:
      'True #000000 (reads as a hole next to the real sections), matte powder coat (eats the highlight), and any warm or brown-black.',
    why:
      'Measured: the window sections sample #253d46 shaded and #6693b1 sky-lit — a satin charcoal that carries a highlight. The range\'s oven door samples #1e2123 and the ceramic cooktop reads near-black and mirrors. Two different blacks, and the difference is legible in the photograph.',
  },
  {
    id: 'woods',
    title: 'THE WOODS — the floor owns brown; furniture must not compete',
    use:
      'Go clearly LIGHTER (#a9793f natural or white oak, matte oiled) or clearly DARKER (#5d4029 walnut, matte oiled).',
    avoid:
      'The band from roughly #62503f to #7c6552 — the floor\'s own value. Also red-toned woods (cherry, mahogany), orange-toned mid-century teak stains, high-gloss or lacquered timber, and wire-brushed or distressed surfaces.',
    why:
      'The floor\'s diffuse plank colour is p05 #6b5446 / p15 #7a6554 — a mid-dark warm brown at low chroma — and it is the ONLY wood in the frame. A near-miss brown within about 15% of that value reads as a colour-match failure rather than a choice.',
  },
  {
    id: 'metals',
    title: 'THE METALS — three, each locked to a job',
    use:
      'ANODISED CHARCOAL #2b2f33 satin for all furniture and fixture metal. BRUSHED STAINLESS #cdd1d3 satin, brushed HORIZONTALLY, for appliances only. CHROME #e9ecee near-mirror for plumbing and appliance handles only.',
    avoid:
      'Brass or gold in any tone, antique or oil-rubbed bronze, satin nickel, copper, blackened or raw steel — and the most common error of all, CHROME OR POLISHED STEEL ON FURNITURE.',
    why:
      'The photograph contains exactly three metals: anodised charcoal on all the glazing sections, brushed satin stainless on the range and dishwasher, and chrome present ONLY as the faucet\'s specular arc and the oven handle. There is no brass, no bronze and no nickel anywhere in the frame.',
  },
  {
    id: 'omissions',
    title: 'WHAT NOT TO USE — the disqualifying list',
    use: 'Nothing. Every item below is an ABSENCE that the photograph establishes.',
    avoid:
      '(1) Baseboard, shoe or quarter-round — the wall butts the floor. (2) Applied casing or architrave, and never a moulded profile — reveals are drywall returns. (3) Tile, mosaic, or a stone or mirror splash — there is no tile in this unit. (4) Cabinet pulls and knobs — all casework is handleless. (5) Brass, bronze, nickel, copper, gold. (6) Chrome on furniture. (7) Anything surface-mounted on the concrete soffit. (8) Gloss above satin, apart from the appliance glass and the (unverified) door enamel.',
    why:
      'Each absence was checked in a dedicated crop: no base trim at x700-824 y440-560; no window casing at x752-772; no tile or splash at x20-120 y320-420; no cabinet pulls at x0-180 y150-300 and x0-200 y100-700. A room is defined as much by what is missing as by what is there, and in this unit the missing things are the design.',
  },
];

/** The provenance sentence a brief must print alongside the schedule. */
export function briefNote(): string {
  const unverified = FINISH_SCHEDULE.filter((f) => !f.verified);
  return (
    'Every colour below is an illuminant-corrected READ off a single reference photograph of ' +
    'the real unit — patch means and luminance percentiles, not a meter. That frame is a ' +
    'low-light phone photograph with a strong daylight white balance and a blown window, so ' +
    'sampled pixels are radiance rather than albedo, and the kitchen cabinet values in ' +
    'particular had to be recovered by ratio against an adjacent same-illuminant surface ' +
    '(about ±15% on value; the ordering and separation are certain, the absolute numbers are ' +
    'not). ' +
    (unverified.length
      ? `${unverified.length} entries (${unverified
          .map((f) => f.surface.toLowerCase())
          .join(', ')}) do NOT appear in the photograph at all and are specified by inference ` +
        'from the language it does establish; they are flagged as such and must not be read as ' +
        'photographic fact. '
      : '') +
    'Unit rates are ballpark US mid-2026 figures for budgeting, not quotations.'
  );
}

/** Lookup by id, with a message that lists the real ids on a miss. */
export function getFinish(id: string): FinishEntry {
  const f = FINISH_SCHEDULE.find((x) => x.id === id);
  if (!f) {
    throw new Error(`Unknown finish: ${id}. Known: ${FINISH_SCHEDULE.map((x) => x.id).join(', ')}`);
  }
  return f;
}
