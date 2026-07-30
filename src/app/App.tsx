/**
 * The lab.
 *
 * Two completely separate render paths live in this file:
 *
 *   1. CAPTURE  (?capture=1) — one view, full bleed, zero chrome, and a single
 *      `signalReady()` once the pixels exist. scripts/render.ts screenshots
 *      this, so it is kept as close to "a div with a drawing in it" as
 *      possible: no toolbars, no analysis unless it was asked for, no state
 *      that can change after the first paint.
 *
 *   2. LAB — the interactive instrument: layout picker, view/camera/theme
 *      controls, overlay toggles, and a right-hand panel with the analysis
 *      report, the item schedule, the catalog and the assumption notes.
 *      Selection state is shared: clicking an issue, hovering an item row and
 *      clicking the drawing all point at the same set of item ids.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlan, PLAN_NOTES, studio } from '@/core/plan';
import { catalogList, getDef } from '@/core/catalog';
import { getLayout, layoutList } from '@/layouts';
import { analyzeLayout, formatReport } from '@/core/analysis';
import { Plan2D } from '@/render2d/Plan2D';
import { Viewer3D } from '@/render3d/Viewer3D';
import { CLEARANCE, formatArea, formatFtIn, formatShort } from '@/core/units';
import type {
  AnalysisResult,
  CameraPreset,
  FloorPlan,
  FurnitureDef,
  Issue,
  Layout,
  PlacedItem,
  Render2DOptions,
  Render3DOptions,
  Severity,
  ViewMode,
} from '@/core/types';
import {
  buildCaptureQuery,
  CAMERA_LABELS,
  CAMERA_PRESETS,
  parseCaptureConfig,
  PLAN_THEMES,
  SCALE_MAX,
  SCALE_MIN,
  signalReady,
  type CaptureConfig,
  type PlanTheme,
} from './capture';
import {
  DataRow,
  EmptyState,
  IssueGroup,
  KeyCap,
  LayoutCard,
  NoteList,
  Num,
  ScaleSlider,
  SearchField,
  Section,
  Segmented,
  StatTile,
  Tabs,
  ToggleRow,
} from './ui';

// ------------------------------------------------------------------ helpers

/** All layouts, once. Module-level so the keyboard handler can stay stable. */
const ALL_LAYOUTS: Layout[] = layoutList;

/** Resolve a requested layout id, tolerating unknown ids (capture URLs lie). */
function resolveLayout(id: string): Layout | undefined {
  if (id) {
    try {
      return getLayout(id);
    } catch {
      // Unknown id: fall through to the first layout rather than blowing up a
      // screenshot job over a typo.
    }
  }
  return ALL_LAYOUTS.length > 0 ? ALL_LAYOUTS[0] : undefined;
}

/** The plan a layout belongs to. There is only one building, but honour the id. */
function planFor(layout: Layout | undefined): FloorPlan {
  if (!layout) return studio;
  try {
    return getPlan(layout.plan);
  } catch {
    return studio;
  }
}

function defFor(item: PlacedItem): FurnitureDef | undefined {
  try {
    return getDef(item.def);
  } catch {
    // A layout referencing a missing catalog id is a real problem, but the UI
    // should show the item and let the report say so.
    return undefined;
  }
}

/** Real placed size in feet: catalog dimensions unless the item overrides them. */
function itemSize(item: PlacedItem, def: FurnitureDef | undefined): { w: number; d: number; h: number } {
  return {
    w: item.size?.w ?? def?.w ?? 0,
    d: item.size?.d ?? def?.d ?? 0,
    h: item.size?.h ?? def?.h ?? 0,
  };
}

function itemName(item: PlacedItem, def: FurnitureDef | undefined): string {
  return item.label ?? def?.name ?? item.def;
}

/**
 * analyzeLayout is pure, but it is also the most complex code in the project.
 * If it throws, surface that as an issue instead of a white screen.
 */
function safeAnalyze(plan: FloorPlan, layout: Layout): AnalysisResult {
  try {
    return analyzeLayout(plan, layout);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      layout: layout.id,
      issues: [{ severity: 'error', code: 'analysis-failed', message: `analyzeLayout threw: ${message}` }],
      stats: {
        interiorAreaSqft: plan.meta.interiorAreaSqft,
        occupiedSqft: 0,
        freeFraction: 0,
        itemCount: layout.items.length,
      },
    };
  }
}

function countSeverity(issues: readonly Issue[], severity: Severity): number {
  let n = 0;
  for (const i of issues) if (i.severity === severity) n += 1;
  return n;
}

/** Page background behind the drawing, matched to the drawing's own palette. */
const THEME_BG: Record<PlanTheme, string> = {
  light: '#f2f1ec',
  dark: '#15171a',
  blueprint: '#0d2b52',
};

/**
 * Top and isometric cameras need the walls cut down or you photograph a roof.
 * Eye-level cameras keep full-height walls because you are standing inside.
 * Cut heights: 3'-6" for plan-like top views (above counters, below uppers),
 * 4'-6" for isos (reads as a doll's-house section).
 */
function wallCutFor(camera: CameraPreset): number | undefined {
  if (camera === 'top') return 3.5;
  if (camera.startsWith('iso-')) return 4.5;
  return undefined;
}

function render3DOptions(camera: CameraPreset, theme: PlanTheme): Render3DOptions {
  return {
    camera,
    background: THEME_BG[theme],
    shadows: true,
    showCeiling: false,
    wallCutHeight: wallCutFor(camera),
  };
}

// --------------------------------------------------------------- capture mode

/**
 * Capture path. Renders exactly one view at exactly one size and then says so.
 *
 * Readiness:
 *   2D — a double requestAnimationFrame after mount. The first frame is when
 *        React's commit is painted; waiting one more guarantees the browser has
 *        actually rasterised the SVG.
 *   3D — Viewer3D's onReady, which fires after its first render() call.
 * There is intentionally no timeout fallback: a blank PNG that looks fine is
 * far worse than a screenshot job that fails loudly.
 */
function CaptureStage({ config }: { config: CaptureConfig }) {
  const layout = resolveLayout(config.layout);
  const plan = planFor(layout);

  // Only run the analyzer when the capture actually asked for issue markers.
  const issues = useMemo(() => {
    if (!config.showIssues || !layout) return undefined;
    return safeAnalyze(plan, layout).issues;
  }, [config.showIssues, layout, plan]);

  useEffect(() => {
    if (config.view !== '2d') return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => signalReady());
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [config.view]);

  const options2d: Render2DOptions = {
    scale: config.scale,
    theme: config.theme,
    showGrid: config.showGrid,
    showDimensions: config.showDimensions,
    showLabels: config.showLabels,
    showZones: config.showZones,
    showClearances: config.showClearances,
    showIssues: config.showIssues,
    showFixtures: true,
    showFurniture: true,
    showDoorSwings: true,
    issues,
  };

  // Explicit pixel size when the CLI gave one; otherwise fill the viewport.
  const style =
    config.w && config.h ? { width: `${config.w}px`, height: `${config.h}px` } : undefined;

  return (
    <div className="capture-root" style={style} data-view={config.view}>
      {config.view === '3d' ? (
        <Viewer3D
          plan={plan}
          layout={layout}
          options={render3DOptions(config.camera, config.theme)}
          className="capture-view"
          orbit={false}
          onReady={signalReady}
        />
      ) : (
        <Plan2D plan={plan} layout={layout} options={options2d} className="capture-view" />
      )}
    </div>
  );
}

// ------------------------------------------------------------------- the lab

type PanelTab = 'report' | 'items' | 'catalog' | 'notes';

const SEVERITY_ORDER: readonly Severity[] = ['error', 'warn', 'info'];

function Lab({ config }: { config: CaptureConfig }) {
  const [layoutId, setLayoutId] = useState<string>(() => resolveLayout(config.layout)?.id ?? '');
  const [view, setView] = useState<ViewMode>(config.view);
  const [camera, setCamera] = useState<CameraPreset>(config.camera);
  const [theme, setTheme] = useState<PlanTheme>(config.theme);
  const [scale, setScale] = useState<number>(
    Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(config.scale))),
  );

  const [showGrid, setShowGrid] = useState(config.showGrid);
  const [showDimensions, setShowDimensions] = useState(config.showDimensions);
  const [showLabels, setShowLabels] = useState(config.showLabels);
  const [showZones, setShowZones] = useState(config.showZones);
  const [showClearances, setShowClearances] = useState(config.showClearances);
  const [showIssues, setShowIssues] = useState(config.showIssues);

  const [selected, setSelected] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('report');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const layout = useMemo(() => resolveLayout(layoutId), [layoutId]);
  const plan = useMemo(() => planFor(layout), [layout]);

  const analysis = useMemo(() => (layout ? safeAnalyze(plan, layout) : undefined), [plan, layout]);

  /** Per-layout stat summaries for the sidebar. Cheap enough to do once. */
  const summaries = useMemo(() => {
    const out = new Map<string, AnalysisResult>();
    for (const l of ALL_LAYOUTS) out.set(l.id, safeAnalyze(planFor(l), l));
    return out;
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<Severity, Issue[]>([
      ['error', []],
      ['warn', []],
      ['info', []],
    ]);
    for (const issue of analysis?.issues ?? []) map.get(issue.severity)?.push(issue);
    return map;
  }, [analysis]);

  /** Item rows, resolved against the catalog once per layout. */
  const rows = useMemo(() => {
    const items: PlacedItem[] = layout?.items ?? [];
    return items.map((item: PlacedItem) => {
      const def = defFor(item);
      return { item, def, size: itemSize(item, def), name: itemName(item, def) };
    });
  }, [layout]);

  const catalogRows = useMemo(() => {
    const defs: FurnitureDef[] = catalogList;
    const q = query.trim().toLowerCase();
    if (!q) return defs;
    const terms = q.split(/\s+/);
    return defs.filter((d) => {
      const haystack = [d.id, d.name, d.kind, d.source ?? '', (d.tags ?? []).join(' ')]
        .join(' ')
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [query]);

  // Keep the page background in step with the drawing theme so the stage does
  // not glow around a dark plan.
  useEffect(() => {
    document.documentElement.dataset.planTheme = theme;
  }, [theme]);

  // -------------------------------------------------------------- selection

  const highlight = useMemo(() => {
    if (hovered && !selected.includes(hovered)) return [...selected, hovered];
    return selected;
  }, [selected, hovered]);

  const handleSelect = useCallback((id: string | null) => {
    setSelected((prev) => {
      if (!id) return [];
      if (prev.length === 1 && prev[0] === id) return [];
      return [id];
    });
  }, []);

  const handleIssuePick = useCallback((issue: Issue) => {
    // Issues point at real ids (items, fixtures, openings). Selecting them and
    // dropping to the plan is the fastest way to see what the analyzer means.
    setSelected(issue.refs ? [...issue.refs] : []);
    setView('2d');
    setShowIssues(true);
  }, []);

  // -------------------------------------------------------------- shortcuts

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // NOTE: 1..9 pick layouts, which collides with "2/3 switch view".
      // Digits win unmodified (there are more layouts than views and you reach
      // for them constantly); SHIFT+2 / SHIFT+3 switch the view, and `v`
      // toggles it. e.code is used so the binding survives any layout/locale.
      if (e.shiftKey) {
        if (e.code === 'Digit2') {
          setView('2d');
          e.preventDefault();
        } else if (e.code === 'Digit3') {
          setView('3d');
          e.preventDefault();
        }
        return;
      }

      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit) {
        const next = ALL_LAYOUTS[Number(digit[1]) - 1];
        if (next) {
          setLayoutId(next.id);
          setSelected([]);
          e.preventDefault();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setView((v: ViewMode) => (v === '2d' ? '3d' : '2d'));
          break;
        case 'g':
          setShowGrid((v) => !v);
          break;
        case 'd':
          setShowDimensions((v) => !v);
          break;
        case 'l':
          setShowLabels((v) => !v);
          break;
        case 'z':
          setShowZones((v) => !v);
          break;
        case 'c':
          setShowClearances((v) => !v);
          break;
        case 'i':
          setShowIssues((v) => !v);
          break;
        case 'escape':
          setSelected([]);
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ------------------------------------------------------------------ report

  const copyReport = useCallback(async () => {
    if (!analysis) return;
    const text = formatReport(analysis, { color: false });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard is permission-gated; the console is a fine fallback for a dev tool.
      // eslint-disable-next-line no-console
      console.log(text);
    }
  }, [analysis]);

  // ------------------------------------------------------------------ render

  const options2d: Render2DOptions = useMemo(
    () => ({
      scale,
      theme,
      showGrid,
      showDimensions,
      showLabels,
      showZones,
      showClearances,
      showIssues,
      showFixtures: true,
      showFurniture: true,
      showDoorSwings: true,
      issues: analysis?.issues,
      selected: highlight,
    }),
    [
      scale,
      theme,
      showGrid,
      showDimensions,
      showLabels,
      showZones,
      showClearances,
      showIssues,
      analysis,
      highlight,
    ],
  );

  const stats = analysis?.stats;
  const freeSqft = stats ? Math.max(0, stats.interiorAreaSqft - stats.occupiedSqft) : 0;
  const freePct = stats ? Math.round((stats.freeFraction || 0) * 100) : 0;
  const path = stats?.narrowestPath;
  const pathTone: 'default' | 'warn' | 'error' =
    path === undefined ? 'default' : path < CLEARANCE.walkwayTight ? 'error' : path < CLEARANCE.walkway ? 'warn' : 'default';
  const missingDefs = rows.filter((r) => !r.def).length;

  const captureHref = buildCaptureQuery({
    layout: layoutId,
    view,
    camera,
    scale,
    theme,
    showGrid,
    showDimensions,
    showLabels,
    showZones,
    showClearances,
    showIssues,
  });

  return (
    <div className="lab">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">{plan.name}</span>
        </div>
        <div className="topbar-meta num">
          <span>
            {formatShort(plan.meta.overallWidth)} &times; {formatShort(plan.meta.overallDepth)}
          </span>
          <span>{formatArea(plan.meta.interiorAreaSqft)} interior</span>
          <span>ceiling {formatFtIn(plan.ceilingHeight)}</span>
          <span title={plan.meta.accuracy}>{plan.meta.accuracy ?? 'traced'}</span>
        </div>
        <a className="capture-link num" href={captureHref} target="_blank" rel="noreferrer">
          capture url
        </a>
      </header>

      <aside className="sidebar">
        <Section title="Layouts" hint={`${ALL_LAYOUTS.length} authored`}>
          {ALL_LAYOUTS.length === 0 ? (
            <EmptyState>No layouts exported from src/layouts yet.</EmptyState>
          ) : (
            <div className="layout-list">
              {ALL_LAYOUTS.map((l, i) => {
                const r = summaries.get(l.id);
                const s = r?.stats;
                const summary = s
                  ? `${s.itemCount} items · ${Math.round((s.freeFraction || 0) * 100)}% free${
                      s.narrowestPath !== undefined ? ` · ${formatShort(s.narrowestPath)} path` : ''
                    }`
                  : 'not analyzed';
                return (
                  <LayoutCard
                    key={l.id}
                    index={i + 1}
                    name={l.name}
                    description={l.description}
                    summary={summary}
                    errors={countSeverity(r?.issues ?? [], 'error')}
                    warnings={countSeverity(r?.issues ?? [], 'warn')}
                    active={l.id === layoutId}
                    onClick={() => {
                      setLayoutId(l.id);
                      setSelected([]);
                    }}
                  />
                );
              })}
            </div>
          )}
        </Section>

        <Section title="View">
          <Segmented<ViewMode>
            label="View mode"
            value={view}
            onChange={setView}
            options={[
              { value: '2d', label: '2D plan', title: 'Architectural plan (SVG)' },
              { value: '3d', label: '3D', title: 'three.js view' },
            ]}
          />
        </Section>

        <Section
          title="Camera"
          hint={view === '3d' ? undefined : 'available in the 3D view'}
          className={view === '3d' ? undefined : 'section-muted'}
        >
          <Segmented<CameraPreset>
            label="Camera preset"
            wrap
            value={camera}
            onChange={setCamera}
            options={CAMERA_PRESETS.map((c) => ({
              value: c,
              label: CAMERA_LABELS[c],
              title: c,
              disabled: view !== '3d',
            }))}
          />
        </Section>

        <Section title="Theme">
          <Segmented<PlanTheme>
            label="Drawing theme"
            value={theme}
            onChange={setTheme}
            options={PLAN_THEMES.map((t) => ({ value: t, label: t }))}
          />
        </Section>

        <Section title="Overlays">
          <div className="toggle-list">
            <ToggleRow label="Grid" keyHint="g" checked={showGrid} onChange={setShowGrid} />
            <ToggleRow
              label="Dimensions"
              keyHint="d"
              checked={showDimensions}
              onChange={setShowDimensions}
            />
            <ToggleRow label="Labels" keyHint="l" checked={showLabels} onChange={setShowLabels} />
            <ToggleRow label="Zones" keyHint="z" checked={showZones} onChange={setShowZones} />
            <ToggleRow
              label="Clearances"
              keyHint="c"
              checked={showClearances}
              onChange={setShowClearances}
            />
            <ToggleRow label="Issues" keyHint="i" checked={showIssues} onChange={setShowIssues} />
          </div>
        </Section>
      </aside>

      <main className="stage">
        <div className="stage-bar">
          <div className="stage-title">
            <span className="stage-layout">{layout ? layout.name : 'no layout'}</span>
            <span className="stage-view num">{view === '2d' ? 'PLAN' : CAMERA_LABELS[camera]}</span>
          </div>
          <ScaleSlider
            value={scale}
            min={SCALE_MIN}
            max={SCALE_MAX}
            onChange={setScale}
            disabled={view !== '2d'}
          />
          <div className="stage-selection">
            {selected.length > 0 ? (
              <button type="button" className="chip" onClick={() => setSelected([])}>
                <Num>{selected.join(' · ')}</Num>
                <span className="chip-x" aria-hidden="true">
                  &times;
                </span>
              </button>
            ) : (
              <span className="stage-hint">click the drawing to select</span>
            )}
          </div>
        </div>

        <div className="stage-surface" data-view={view}>
          {view === '2d' ? (
            <div className="stage-scroll">
              <Plan2D
                plan={plan}
                layout={layout}
                options={options2d}
                className="plan"
                selected={highlight}
                onSelect={handleSelect}
              />
            </div>
          ) : (
            <Viewer3D
              /* Remount on any change the viewer might only read at mount time. */
              key={`${layout?.id ?? 'none'}|${camera}|${theme}`}
              plan={plan}
              layout={layout}
              options={render3DOptions(camera, theme)}
              className="viewer"
              orbit
            />
          )}
        </div>
      </main>

      <aside className="panel">
        <Tabs<PanelTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'report', label: 'Report', badge: analysis?.issues.length ?? 0 },
            { value: 'items', label: 'Items', badge: rows.length },
            { value: 'catalog', label: 'Catalog', badge: catalogList.length },
            { value: 'notes', label: 'Notes' },
          ]}
        />

        <div className="panel-body">
          {tab === 'report' ? (
            !analysis || !stats ? (
              <EmptyState>Nothing to analyze.</EmptyState>
            ) : (
              <>
                <div className="tiles">
                  <StatTile
                    label="Interior area"
                    value={formatArea(stats.interiorAreaSqft)}
                    sub={`${formatShort(plan.meta.overallWidth)} × ${formatShort(plan.meta.overallDepth)} overall`}
                  />
                  <StatTile
                    label="Free floor"
                    value={formatArea(freeSqft)}
                    sub={`${freePct}% of interior`}
                    tone="accent"
                  />
                  <StatTile
                    label="Narrowest path"
                    value={path === undefined ? '—' : formatShort(path)}
                    sub={`${formatShort(CLEARANCE.walkway)} recommended`}
                    tone={pathTone}
                  />
                  <StatTile
                    label="Items"
                    value={String(stats.itemCount)}
                    sub={missingDefs > 0 ? `${missingDefs} unknown def` : `${plan.zones.length} zones`}
                    tone={missingDefs > 0 ? 'error' : 'default'}
                  />
                  <StatTile
                    label="Budget"
                    value={
                      stats.budget === undefined
                        ? '—'
                        : `$${Math.round(stats.budget).toLocaleString('en-US')}`
                    }
                    sub={stats.budget === undefined ? 'no prices' : 'catalog prices'}
                  />
                  <StatTile
                    label="Occupied"
                    value={formatArea(stats.occupiedSqft)}
                    sub="furniture footprints"
                  />
                </div>

                <div className="panel-actions">
                  <button type="button" className="btn" onClick={copyReport}>
                    {copied ? 'copied' : 'copy text report'}
                  </button>
                  <span className="panel-note">click an issue to highlight it in the plan</span>
                </div>

                {analysis.issues.length === 0 ? (
                  <EmptyState>No issues. Every clearance check passed.</EmptyState>
                ) : (
                  SEVERITY_ORDER.map((sev) => (
                    <IssueGroup
                      key={sev}
                      severity={sev}
                      issues={grouped.get(sev) ?? []}
                      selected={selected}
                      onPick={handleIssuePick}
                    />
                  ))
                )}
              </>
            )
          ) : null}

          {tab === 'items' ? (
            rows.length === 0 ? (
              <EmptyState>This layout places no items.</EmptyState>
            ) : (
              <div className="rows">
                <div className="row row-head">
                  <div className="row-main">
                    <span className="row-primary">Item</span>
                  </div>
                  <div className="row-cols">
                    <span className="row-col">w × d</span>
                    <span className="row-col">x, y</span>
                    <span className="row-col">rot</span>
                  </div>
                </div>
                {rows.map(({ item, def, size, name }) => (
                  <DataRow
                    key={item.id}
                    active={highlight.includes(item.id)}
                    title={item.note ?? def?.source ?? item.def}
                    primary={name}
                    secondary={`${item.id} · ${def ? def.kind : 'MISSING DEF ' + item.def}`}
                    cols={[
                      `${formatShort(size.w)} × ${formatShort(size.d)}`,
                      `${formatFtIn(item.at[0])}, ${formatFtIn(item.at[1])}`,
                      `${item.rot ?? 0}°`,
                    ]}
                    onClick={() => handleSelect(item.id)}
                    onHover={(on) => setHovered(on ? item.id : null)}
                  />
                ))}
              </div>
            )
          ) : null}

          {tab === 'catalog' ? (
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="search name, kind, tag, source…"
                count={`${catalogRows.length}/${catalogList.length}`}
              />
              {catalogRows.length === 0 ? (
                <EmptyState>Nothing in the catalog matches “{query}”.</EmptyState>
              ) : (
                <div className="rows">
                  <div className="row row-head">
                    <div className="row-main">
                      <span className="row-primary">Catalog</span>
                    </div>
                    <div className="row-cols">
                      <span className="row-col">kind</span>
                      <span className="row-col">w × d × h</span>
                    </div>
                  </div>
                  {catalogRows.map((d) => (
                    <DataRow
                      key={d.id}
                      title={d.source ?? d.id}
                      primary={d.name}
                      secondary={d.source ? `${d.id} · ${d.source}` : d.id}
                      cols={[
                        d.kind,
                        `${formatShort(d.w)} × ${formatShort(d.d)} × ${formatShort(d.h)}`,
                      ]}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {tab === 'notes' ? (
            <>
              <NoteList
                title="Layout notes"
                source={layout?.id}
                notes={layout?.notes ?? []}
              />
              <NoteList
                title="Plan assumptions"
                source={plan.meta.source}
                notes={PLAN_NOTES}
              />
            </>
          ) : null}
        </div>
      </aside>

      <footer className="hints">
        <span className="hint-group">
          <KeyCap>1</KeyCap>–<KeyCap>9</KeyCap> layout
        </span>
        <span className="hint-group">
          <KeyCap>⇧2</KeyCap>
          <KeyCap>⇧3</KeyCap>
          <KeyCap>v</KeyCap> view
        </span>
        <span className="hint-group">
          <KeyCap>g</KeyCap>grid <KeyCap>d</KeyCap>dims <KeyCap>l</KeyCap>labels <KeyCap>z</KeyCap>
          zones <KeyCap>c</KeyCap>clearances <KeyCap>i</KeyCap>issues
        </span>
        <span className="hint-group">
          <KeyCap>esc</KeyCap> deselect
        </span>
        <span className="hints-spacer" />
        <span className="hint-group num">all dimensions ± 0.3 ft · storage unit: decimal feet</span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------- root

export function App({ config }: { config?: CaptureConfig }) {
  // Parsed once: capture mode is a property of the URL and never changes for
  // the life of the page.
  const resolved = useMemo(() => config ?? parseCaptureConfig(), [config]);
  return resolved.capture ? <CaptureStage config={resolved} /> : <Lab config={resolved} />;
}

export default App;
