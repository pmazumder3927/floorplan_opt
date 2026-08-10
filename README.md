# floor_test

A to-scale design and render environment for **one real apartment**: a 508 sq ft
L-shaped studio (448 ft² inside the walls) with a single west-facing glazed wall
and an exposed concrete soffit.

The apartment is modelled once, in code. Everything else — the architectural
plan, the clearance analysis, the WebGL preview, the path-traced hero frames, the
furniture schedule and the client brief — is **generated from that one model**, so
no drawing can quietly disagree with the layout it describes.

Seven schemes are designed against the same brief. All seven carry the same four
hard requirements — a real queen bed, modern/minimal decor, a real sit-stand desk
setup (a Secretlab MAGNUS Pro since 31 Jul 2026; it was a Fully Jarvis before
that, and some prose here still says so), and a congregation area for watching
things on a projector with the throw geometry and the seating distances both
actually correct. In five of them what differs is **where the picture goes**, and
every other decision falls out of that; F holds the picture still and turns the
**bed** instead; G holds everything still and moves the **darkness**.

---

## Sample renders

All frames below are GPU path-traced in Blender Cycles from the same glTF export
the WebGL preview uses, with a physically-scaled Nishita sky.

> **What these frames actually are, corrected 31 Jul 2026.** This section used to
> say the frames were "dark on purpose… the shades are down in the model and the
> room is lit by its own downlights", and at the same 1600×1000. All three claims
> were false and the audit that found them is worth repeating, because the
> project's whole premise is that a drawing cannot quietly disagree with the model
> it describes.
> **(1) The shades have never been drawn down, in any layout.** `catalog.ts`
> dimensions `shade-blackout-*-bay` STOWED — a 4½" cassette at the 8'-8" head —
> and its own note says a layout wanting the deployed state must override
> `size: { h: 8.667 }, z: 0`. `grep -rn "8.667" src/layouts/` returns nothing.
> Every frame here has the glazing wide open.
> **(2) The room is not lit by its downlights.** It is lit by the sky through that
> open glazing at 2.2×; the recessed fittings are geometry with a faint emissive
> lens. Kill the sky and the frame drops from 47% mean luminance to 15%.
> **(3) The resolutions differ** — several frames are 1280×800.
> What *does* make them read cool and low-key is the pipeline's default weather:
> `--sun-intensity 0.04` (a hazy overcast with no sun disc), `--sky-strength 2.2`
> and `--wb 5100`, which together render the espresso floor at R−B **−17**, i.e. a
> warm walnut as blue-grey. Frames made to judge a *palette* should use
> `--sun-intensity 0.25 --sky-strength 2.0`, the one row of `render.py`'s own
> measured sweep that lifts the soffit without clipping the floor.

### A — Night wall

The recommended scheme. A 100" UST ALR frame on the bathroom partition — the only
blank, west-facing wall in the unit — a Hisense PX3-PRO on a 14" plinth, and a
queen head-to-the-glazing in the notch. The best picture this apartment can make;
the cost is that it is an evening room.

![Layout A, looking east from the glazing: 100" screen on the bathroom partition, Jarvis desk on the left](docs/renders/a-night-wall.jpg)

The sleeping end was rebuilt on 31 Jul 2026 under two rules: **nothing gets fixed
to a wall**, and the bed has to look like something. Out went a $79 white steel
frame, a wall-hung ledge and a wall-hung shelf; in came an Awara bamboo queen with
no headboard — the head of this bed is a window, so there cannot be one — oat
linen with a terracotta bed cover, an oak nightstand standing in the aisle, a
cordless Flos Bellhop on it, and four flat cases in the 8.3" under the frame doing
the job the shelf used to do. It cost $599, 1 1/8" of the walk behind the bed and
0.8° of sofa axis. It also **bought back 29.7 points of the picture**: the 5'-11"
floor lamp that used to stand at the foot of the bed was eating a third of the
screen from it, which no drawing showed and `pnpm sightline` did.

![Layout A, the sleeping alcove: bamboo queen with the west glazing as its headboard, oak nightstand and a terracotta linen bed cover](docs/renders/a-night-wall-sleeping.jpg)

### B — Fold away

The picture goes **in the west glazing** on a floor-rising screen that stows to an
8¼" cabinet, so the view comes back when the film ends. Paid for by a queen
Murphy on the wide leg: the floor exists sixteen hours a day. The cost is a
one-ended bed and an audience facing the glass.

![Layout B, looking west: the floor-rising screen deployed in front of the west glazing](docs/renders/b-fold-away.jpg)

### C — Second row

The picture is on the bathroom partition again, but **the bed is the back row**: a
17½" Floyd queen lies head-to-the-glass across the middle of the floor, under the
46" seated-eye line, with four floor seats in front of it. Six seats, no sofa. The
cost is that the bed is public.

![Layout C, the bed lying low across the middle of the floor with poufs in front of it](docs/renders/c-second-row.jpg)

### D — Paint and go

118" of screen **paint** and a 2.9 lb portable that lives in a closet — an $858 AV
kit, nothing anchored, nothing framed, nothing millwork. With the projector off,
this is what you own: a faint white rectangle on a white wall. That is the point
of it, and the honest cost is a standard-throw lens standing in front of the
audience at 550 lumens, i.e. after dark only.

![Layout D, looking east: the painted screen area reads as a faint rectangle on the partition](docs/renders/d-paint-and-go.jpg)

### E — Clear shot

Same picture as A, on the same wall, but planned around **what you can see of it**
rather than around where it goes. The desk moves into the north-west notch — the
only floor in the plate that no seat-to-screen ray crosses — and the queen goes
**onto the wall**, so for sixteen hours a day there is no bed in the apartment at
all. That frees the sofa to sit dead on the screen centreline, which none of the
first four manage. Every seat sees **100% of the picture**; the other four see 52%
to 92%. It is the only layout with no errors *and* no warnings. The costs are
$2,159 of wall bed, a floor that has to stay empty for it to land on, and dining
that is a drop-leaf for two.

![Layout E, looking west down the promenade: the sofa on the screen centreline, the city behind the glazing](docs/renders/e-clear-shot.jpg)

![Layout E, the low queen head-to-the-north-wall with the desk nook at the left and the screen at the right](docs/renders/e-clear-shot-sleeping.jpg)

### F — Headboard

The five schemes above all move the **picture** and let everything else fall out
of that. F holds the picture still and moves the **bed**: the queen is turned 90°
so its head is against the notch's north wall, which is the only way this
apartment can have a real headboard — 39" of bamboo, nine inches over the glazing
rule, legal only because the surface behind it is plaster. It buys 2'-0" of clear
floor on **both** long sides, a nightstand and a lamp on each of them, and the
disappearance of the bed-access warning layout A accepts on purpose.

It costs the sofa. A turned queen spends 7'-1⅞" of the 12'-11¼" between the notch
wall and the kitchen aisle, and after the 3'-1" east-west route the bed's own
geometry demands there is 2'-1" of depth left for seating — a Cleon is 4'-8" wide.
So the congregation stops being a sofa and becomes a **row**: two armchairs and a
pouf strung along the room's length at 39.6° / 29.6° / 25.8°. Three seats where A
has four, and the bed is no longer one of them — it faces south now and sees none
of the picture. In exchange F returns **no errors and no warnings**, a 2'-9"
narrowest route against A's 2'-6", and a worst seat at 89.2% against A's 81.9%.

![Layout F, the sleeping alcove: bamboo queen with a real headboard, a matching nightstand and lamp on each side](docs/renders/f-headboard-sleeping.jpg)

![Layout F, lid off: the turned bed in the notch, the row of two armchairs facing the screen, the desk on the north wall](docs/renders/f-headboard-dollhouse.jpg)

### G — West light

Not a seventh answer to where the picture goes. **G is layout A, optimised** —
the client liked A and said it felt "too dark or something", so two things
finally got measured instead of asserted.

**The darkness.** `pnpm tone` is the new script that made the argument possible:
it walks every surface in the open studio, converts each hex to an LRV and
reports the area-weighted mean, split at the notch. Layout A's furniture measures
**13.0% LRV in the living end against 39.6% in the sleeping alcove** — the half
of the flat you stand in is three times darker than the half you sleep in, and
the shell is innocent (walls 88%, soffit 47%).

A defends its darks optically, and the defence is real but mis-aimed. With the
shades down the room returns about 3.3% of the projector's own light to its own
screen and **83% of that comes off the walls and the soffit**; every placed
furnishing together is about 10%. Taking the sofa from 3.7% to 50% LRV costs 3.5%
of the black level (131:1 → 126:1). Taking the near-black poufs with it costs
**zero, measured**. Meanwhile the parked Aeron is worth 22%, the plinth 13% and
the desk top 12.5%, because those three are close, low and in the picture's
field. So: **dark is worth buying within about six feet of the lens and worth
nothing beyond it**, and A had it the wrong way round.

The same camera, the same light, the same exposure — A above, G below:

![Layout A, the congregation seen from the front quarter: a charcoal sofa alone on a grey rug with the promenade behind it blocked by two parked folding chairs](docs/renders/a-night-wall-lounge.jpg)

![Layout G, the same frame: the sofa in oat Maharam hopsack, an oak bench giving it a back, a washi lantern on the bench, and a clear promenade to the glazing](docs/renders/g-west-light-lounge.jpg)

**The sightline.** A pins the desk's east end at x 16'-0" and argues it cannot go
west because the parked chair would sever the walk between the bed and the sofa.
Swept with `pnpm sightline`, that does not survive: the same chair already severs
that walk 1'-1⅝" further east. Sliding the top west until its west end sits flush
with the re-entrant corner — the only position on that wall with an
architectural reason behind it — takes the **worst seat from 80.5% to 87.2%** and
the sofa from 93.8% to 97.2%. East, which is the intuitive fix, is worse: a chair
nearer the screen subtends a bigger angle from every seat.

**The floor behind the sofa** was the other half of the brief, and it reads as
leftover in A because it *is*: a 4'-11 15/16" strip that has to carry a 3'-0"
route, leaving 2'-0" for furniture where a second row you can put your knees
under needs 3'-0". A's two poufs stand 4" off a 28" sofa back — a footstool
position, not a seat. G stops pretending: **one 55" Article Seno oak bench at
17½"**, ten inches below the sofa's back line so it never reads as a fence, with
an Akari 1A on it — the first light in this apartment that is not a downlight, a
desk clamp or a bedside lamp.

And then the thing nobody was looking for. Sweeping the strip at half-inch steps
instead of reading a route number, **layout A's promenade is sealed**: it pinches
to **3⅞"** at y 11'-9⅜", where the two parked folding chairs meet the south pouf,
so the walk from the kitchen end to the west windows is a 26 ft detour. `pnpm
check` reports 2'-6" there and does not warn — a grid artifact, because the
route's own target sits inside the pinch where endpoint protection exempts the
cells. Fold the chairs into the closet where A's own note says they live and
every required route reaches **3'-0"**, which no scheme in this folder had
managed.

| | A | G |
|---|---|---|
| worst seat on the picture | 80.5% | **87.2%** |
| the sofa | 93.8% | **97.2%** |
| narrowest path | 2'-6" | **3'-0"** |
| front door → west windows | 2'-6" | **3'-0"** |
| living-end furniture, LRV | 13.0 | **24.6** |
| room, area-weighted, LRV | 48.0 | **50.8** |
| budget | $15,843 | **$15,009** |

G is **$834 cheaper** than A, because the catalog's own blackout entry has been
recommending rollers over cellular since 30 Jul on a $1,248 saving and no layout
had spent it. Take the rollers out and the bench and the lantern cost $414.

**The screen wall is not painted.** Darkening the partition behind the picture
is the classic way to make a projector look better — a 100" image is judged
against its surround, and in A that surround is 55 sq ft of 88%-LRV white half an
inch from the picture's edge. It was drawn, measured and dropped: it takes the
room from 50.8% to 46.3%, i.e. *below* layout A, which is the wrong direction for
a brief that started with "too dark", and the client does not want to paint a
rented apartment. Recorded in the catalog so nobody re-derives it.

**The one decision left open is the sofa**, and it is a real one. Same frame,
same place, same 56" — only the cloth. The rug is 31% LRV, and that turns out to
set the terms: a sofa between about 25% and 38% merges into it, so the two good
answers are clearly darker or clearly lighter, not in between.

| Cleon in… | LRV | perceived lightness L* | living-end LRV | black level | price |
|---|---|---|---|---|---|
| Tait Charcoal *(layout A)* | 3.7 | 23 | 19.3 | — | $1,740 (seen at $870) |
| a warm slate | ~14 | 45 | 20.5 | +1.4% | — |
| **Maharam Mode / Clavicle** | ~50 | 76 | **24.6** | +6.2% | $1,960 |

Optically it is noise either way: +6.2% of a black floor that already sits 30×
above what the projector itself can do, i.e. 131:1 becomes about 123:1. The trade
is practical — one room, a range twelve feet away, no second room to eat in —
against the fact that the sofa is 30.7 sq ft of face at eye level and the single
biggest tonal object in the flat. Note also that the sofa carries only 5.3 of the
scheme's 11.6-point living-end gain: **a slate Cleon still gets most of G.**

There is also a **product** answer rather than a colour one, and it is priced very
differently: the **Article Ceni 61" loveseat in Chalk Gray at $899**. Built into
the plan and run through the same scripts, it comes back with the same worst seat
(87.2%), the same 3'-0" narrowest path, a living end of 24.0 against Clavicle's
24.6 — and **$1,061 off the total**. What it spends instead is geometry: 31" tall
against the 30" house rule, and 61" of overall width for about 51" of usable seat,
which takes the bed aisle from 2'-8⅜" to 2'-7" and the sink-to-fridge route from
4'-0" to 3'-6". Both still legal, both real.

![Layout G with the sofa in a warm slate: the same room, the sofa reading as the anchor of the west half](docs/renders/g-west-light-slate-option.jpg)

![Layout G with the Article Ceni 61" in Chalk Gray: light, but 3" taller and with arms, so it reads as a bigger object](docs/renders/g-west-light-ceni-option.jpg)

![Layout G with the Cleon in Maharam Mode / Clavicle, which is the drawn scheme](docs/renders/g-west-light-lounge.jpg)

### The 2D side of the same model

Same layout, same numbers, drawn to scale with dimensions, door swings, a
furniture key, a graphic scale and the analyzer's own findings marked in place:

![To-scale architectural plan of layout A with dimensions, furniture key and analysis callouts](docs/renders/a-night-wall-plan.png)

> `renders/` is gitignored — every PNG, SVG and GLB in it is regenerable from the
> layouts and the plan, which *are* committed. The images above are a small,
> deliberate copy kept in `docs/renders/` so this page works on GitHub.

---

## The unit

| | |
|---|---|
| Plan | `studio-508`, 30'-4" × 19'-10" overall, L-shaped |
| Area | 508 ft² gross · **448 ft² interior** |
| Glazing | one west wall, four bays (2'-8¾", 2'-8¼", 2'-9¼", 3'-6") |
| Soffit | exposed structural concrete — no ceiling mounting anywhere, in any scheme |
| Ceiling | 9'-0", **assumed** (not on the source plan) |
| Source | traced from the listing graphic at 28.587 px/ft — treat all coordinates as **±0.3 ft** |

Where the trace disagreed with a real manufactured size, the real size wins and
the substitution is recorded in `PLAN_NOTES` (`src/core/plan.ts`) — twelve entries
saying exactly what is measured and what is inferred. `data/reference/` holds the
photograph of the real living/west corner that the material table is calibrated
against, so the renders' finishes are matched to the unit rather than invented.

---

## The seven schemes

| | Layout | Where the picture goes | The cost |
|---|---|---|---|
| **A** | `a-night-wall` | 100" UST ALR frame on the bathroom partition | an evening room, and no dresser |
| **B** | `b-fold-away` | floor-rising screen in the west glazing | one-ended Murphy bed, audience faces the glass |
| **C** | `c-second-row` | bathroom partition, with the bed as the back row | the bed is public |
| **D** | `d-paint-and-go` | 118" of screen paint, portable projector | 550 lumens and a lens in front of the audience |
| **E** | `e-clear-shot` | bathroom partition again, but planned around the SIGHTLINE | a wall bed and a floor that must stay empty for it |
| **F** | `f-headboard` | same as A — F moves the BED, not the picture | the sofa, and the bed stops being a seat |
| **G** | `g-west-light` | same as A — G moves the DARKNESS and the DESK, not the picture | a pale seat in a one-room flat, 5 points of in-room contrast, and a desk 1'-1⅝" further into the room |

**E is the one to read first if you only read one.** The first four were drawn
around where the picture goes; E was drawn around what you can actually see of
it. `scripts/sightline.ts` casts a grid of rays — five eye positions per seat
against 169 points on the image — instead of the single seat-centre-to-screen-centre
ray `analysis.ts` uses, and it turns out every earlier scheme is obstructed:

```
  a-night-wall   sofa 92.0%   poufs 86.6% / 89.7%   bed 81.9%
  b-fold-away    worst seat 79.5%
  c-second-row   worst seat 89.0%
  d-paint-and-go worst seat 91.8%
  e-clear-shot   every seat 100.0%
  f-headboard    row 97.2% / 91.6% / 89.2%
  g-west-light   sofa 97.2%   bench 93.0%   bed 87.2%
```

In A, B, C and D the main culprit is the parked desk chair. A's bed used to read
52.2% here, and the difference is one object: a floor lamp parked in the shoulder
at the foot of the bed, which the layout file asserted was "out of every
seat-to-screen sightline" and which was in fact eating 33.8% of the picture. It is
now a 23 1/2" plant, and 23 1/2" cannot cross a ray whose lowest point is 28 1/2". E moves the desk into
the north-west notch — the only floor in the plate that no seat-to-screen ray
crosses — and puts a headboard-less queen out in the room under the 28 1/2" image
bottom, which frees the sofa to sit dead on the screen centreline for the first
time. It is also the only layout that returns no errors *and* no warnings.

Live figures — item counts, free floor, narrowest circulation path, warnings and
budget — come out of `pnpm check`, which is also the CI gate: it exits 1 if any
layout has an error-severity issue (things overlap, a door cannot open, a route is
impassable). Sample output:

```
  LAYOUT          ITEMS  FREE %  FREE AREA  NARROWEST  ERR  WARN   BUDGET
  ──────────────  ─────  ──────  ─────────  ─────────  ───  ────  ───────
  a-night-wall       39   79.0%    354 ft²       2'6"    0     1  $15,843
  b-fold-away        33   82.5%    370 ft²         3'    0     3  $16,070
  c-second-row       28   79.5%    356 ft²       3'6"    0     2  $11,047
  d-paint-and-go     26   83.6%    375 ft²       2'6"    0     1   $7,357
  e-clear-shot       36   85.0%    381 ft²      2'10"    0     0  $12,207
  f-headboard        39   80.5%    361 ft²       2'9"    0     0  $15,563
  g-west-light       40   78.7%    353 ft²         3'    0     1  $15,009

  7 layouts · 448 ft² interior · walkway min 3' (tight 2'6")
  no errors, 8 warnings, 4 info
```

`BUDGET` is the catalogue total only. `src/core/budget.ts` additionally produces
an **all-in band** — furniture plus low/high allowances for every real cost with
no catalog page (mattresses, slatted bases, level-5 plastering, freight) — and it
flags which prices in the schedule are unverified rather than quoted.

---

## Getting started

```bash
pnpm install
pnpm check          # analyze all six layouts; exits 1 on an error-severity issue
pnpm sightline      # how much of the projected image each seat can actually see
pnpm dev            # the interactive lab at http://localhost:4317
```

## The pipeline

`data/source-plan.json` is the raw trace and is not imported by anything —
`src/core/plan.ts` is the authoritative model derived from it by hand, which is
where the twelve `PLAN_NOTES` substitutions get made.

```
  src/core/plan.ts          src/core/catalog.ts
  (the apartment)           (169 furniture defs)
          └───────────────┬───────────────┘
                          ▼
                  src/layouts/*.ts                  the six schemes
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
 analysis.ts          render2d/            render3d/build.ts
 clearances,          to-scale SVG         one three.js scene
 door swings,         plan + PNG           ├─► WebGL preview + PNG
 circulation,         capture              └─► .glb ─► Blender Cycles
 sightlines,              │                        │
 throw geometry           │                        ▼
    │                     │                 path-traced frames
    ▼                     │                        │
 pnpm check               │                        │
    └─────────────────────┴────────────────────────┘
                          ▼
                   scripts/brief.ts
            one self-contained HTML per layout
```

| Command | What it does |
|---|---|
| `pnpm dev` | the interactive lab — layout picker, 2D/3D views, camera and theme presets, live analysis, item schedule, catalog browser |
| `pnpm check` | clearance / collision / circulation report. `--json` for machine-readable, `--quiet` for the summary table only |
| `pnpm sightline` | how much of the projected image each seat can actually see — a grid of rays, not one |
| `pnpm tone` | how dark a scheme is, as a number: area-weighted LRV of every visible surface, split shell / furnishings and living end / sleeping alcove, plus each surface's share of the projector light the room returns to its own screen |
| `pnpm svg` | to-scale architectural plan as SVG (vector, diffable, prints) |
| `pnpm render` | headless PNGs of the 2D plan and the WebGL 3D view — how an agent looks at its own work |
| `pnpm glb` | export the three.js scene as `.glb`; the only thing Blender ever sees |
| `pnpm raytrace` | GPU path-traced hero frames in Blender Cycles (Nishita sky, real sun disc, per-camera exposure bias) |
| `pnpm brief` | one self-contained HTML brief per layout: hero frame, plan, reasoning, schedule, analyzer verdict |
| `pnpm typecheck` | `tsc --noEmit` |

Reproducing the frames on this page:

```bash
# The A hero was made with the SCREENING SHOT at the pipeline defaults, not with
# --camera eye-window --exposure 2.2 as this block used to claim. Verified by
# re-rendering and matching mean luminance: 47.23% against the committed 47.08%.
npx tsx scripts/raytrace.ts --layout a-night-wall   --shots  screening  --res 1600x1000 --samples 200
npx tsx scripts/raytrace.ts --layout a-night-wall   --shots  sleeping   --res 1280x800  --samples 220
npx tsx scripts/raytrace.ts --layout f-headboard    --shots  all        --res 1280x800  --samples 200
npx tsx scripts/raytrace.ts --layout b-fold-away    --camera eye-living --res 1600x1000 --samples 200 --exposure 2.2
npx tsx scripts/raytrace.ts --layout c-second-row   --camera eye-hero   --res 1600x1000 --samples 256 --exposure 2.9
npx tsx scripts/raytrace.ts --layout d-paint-and-go --camera eye-window --res 1600x1000 --samples 200 --exposure 2.2
# The A/G comparison pair: same camera, same weather, same exposure, so the only
# variable is the scheme. --sun-intensity 0.25 --sky-strength 2.0 is the one row
# of render.py's own measured sweep that lifts the soffit without clipping the
# floor, and it is what any frame judging a PALETTE should use.
npx tsx scripts/raytrace.ts --layout a-night-wall   --shots lounge    --res 1600x1000 --samples 320 --sun-intensity 0.25 --sky-strength 2.0 --tod 0.62 --exposure 0.35
npx tsx scripts/raytrace.ts --layout g-west-light   --shots lounge    --res 1600x1000 --samples 400 --sun-intensity 0.25 --sky-strength 2.0 --tod 0.62 --exposure 0.35
npx tsx scripts/raytrace.ts --layout g-west-light   --shots screening --res 1600x1000 --samples 400 --sun-intensity 0.25 --sky-strength 2.0 --tod 0.62 --exposure 0.9
npx tsx scripts/render.ts   --view 2d
```

`raytrace` expects Blender at `~/.local/opt/blender/blender` (override with
`BLENDER=/path/to/blender`) and prefers OptiX, falling back to CUDA. The headless
2D/3D renderer needs no GPU: it boots vite in-process on an OS-assigned port and
drives Chromium with software WebGL, so `pnpm render` works in a container.

## Repo layout

```
src/core/        the apartment, the catalog, the units, the analyzer, the money
src/layouts/     the seven schemes — one file each, plus faces.ts for shared datums
src/render2d/    to-scale plan: SVG writer + React view
src/render3d/    three.js scene builder, materials, camera presets, city backdrop
src/app/         the interactive lab, and the chrome-less capture mode scripts drive
scripts/         CLI drivers (check, svg, render, glb, raytrace, brief)
scripts/blender/ Cycles render script, physically-based material table, sky/world
data/            traced source plan + the reference photograph
docs/renders/    the committed sample images used by this README
```

## Conventions worth knowing before you edit

- **Decimal feet everywhere** internally; `src/core/units.ts` owns every
  real-world clearance minimum and all feet-and-inches formatting.
- **Every number carries its provenance.** Catalog entries have a `source` string
  that says where the price and the dimensions came from, and says so plainly when
  a price is an estimate rather than a quotation. Layout files argue their
  trade-offs in prose next to the geometry that implements them.
- **Shared datums live in `src/layouts/faces.ts`.** If two layouts cite the same
  wall face or the same desk-orientation rule, neither of them owns it.
- **`src/render3d/build.ts` is the single source of truth for the 3D model.** The
  WebGL preview, the `.glb` and every path-traced frame come from that one scene
  graph, and the ray tracer computes its camera with the same `cameraFor()` the
  preview uses — so a hero frame and a preview frame of the same layout frame the
  unit identically.
- **Generated output is not committed** (`renders/`, `briefs/`, `tmp/`). If you
  need a picture in the repo, put a deliberate copy in `docs/`.
