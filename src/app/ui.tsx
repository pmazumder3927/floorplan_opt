/**
 * Presentational primitives for the lab UI.
 *
 * These are deliberately dumb: no data fetching, no analysis, no knowledge of
 * the floor plan. App.tsx owns all state and composes these. Everything is
 * styled by styles.css via stable class names (no inline styles except where a
 * value is genuinely dynamic, e.g. a computed pixel size).
 */

import type { ChangeEvent, ReactNode } from 'react';
import type { Issue, Severity } from '@/core/types';

// ------------------------------------------------------------------ shells

export function Section(props: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={props.className ? `section ${props.className}` : 'section'}>
      <div className="section-head">
        <h2 className="section-title">{props.title}</h2>
        {props.actions ? <div className="section-actions">{props.actions}</div> : null}
      </div>
      {props.hint ? <p className="section-hint">{props.hint}</p> : null}
      {props.children}
    </section>
  );
}

/** A monospaced, tabular-figure number. Every dimension in the UI goes through this. */
export function Num(props: { children: ReactNode; title?: string }) {
  return (
    <span className="num" title={props.title}>
      {props.children}
    </span>
  );
}

export function KeyCap(props: { children: ReactNode }) {
  return <kbd className="keycap">{props.children}</kbd>;
}

export function EmptyState(props: { children: ReactNode }) {
  return <p className="empty">{props.children}</p>;
}

// ------------------------------------------------------------------ inputs

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  disabled?: boolean;
}

export function Segmented<T extends string>(props: {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  /** wrap onto multiple rows instead of one strip (used by the camera grid) */
  wrap?: boolean;
}) {
  return (
    <div
      className={props.wrap ? 'segmented segmented-wrap' : 'segmented'}
      role="group"
      aria-label={props.label}
    >
      {props.options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="seg"
          title={opt.title ?? opt.label}
          disabled={opt.disabled}
          aria-pressed={props.value === opt.value}
          onClick={() => props.onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  keyHint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={props.disabled ? 'toggle toggle-disabled' : 'toggle'}>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.currentTarget.checked)}
      />
      <span className="toggle-box" aria-hidden="true" />
      <span className="toggle-label">{props.label}</span>
      {props.keyHint ? <KeyCap>{props.keyHint}</KeyCap> : null}
    </label>
  );
}

export function SearchField(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  count?: string;
}) {
  return (
    <div className="search">
      <input
        type="search"
        className="search-input"
        value={props.value}
        placeholder={props.placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.currentTarget.value)}
      />
      {props.count ? <span className="search-count num">{props.count}</span> : null}
    </div>
  );
}

/** Drawing zoom, in pixels per foot. */
export function ScaleSlider(props: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={props.disabled ? 'scale scale-disabled' : 'scale'}>
      <span className="scale-label">Scale</span>
      <input
        type="range"
        className="scale-range"
        min={props.min}
        max={props.max}
        step={1}
        value={props.value}
        disabled={props.disabled}
        aria-label="Drawing scale, pixels per foot"
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          props.onChange(Number.parseInt(e.currentTarget.value, 10))
        }
      />
      <span className="scale-readout num">{props.value} px/ft</span>
      {/* An architect's cross-check: how much drawing fits in one screen inch. */}
      <span className="scale-ratio num">1&Prime; = {(12 / props.value).toFixed(1)}&prime;</span>
    </div>
  );
}

// ------------------------------------------------------------------- tabs

export function Tabs<T extends string>(props: {
  value: T;
  tabs: readonly { value: T; label: string; badge?: string | number }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {props.tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          className="tab"
          aria-selected={props.value === t.value}
          onClick={() => props.onChange(t.value)}
        >
          {t.label}
          {t.badge !== undefined && t.badge !== '' ? (
            <span className="tab-badge num">{t.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ report

export function StatTile(props: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'accent' | 'warn' | 'error';
}) {
  return (
    <div className={`tile tile-${props.tone ?? 'default'}`}>
      <div className="tile-label">{props.label}</div>
      <div className="tile-value num">{props.value}</div>
      <div className="tile-sub num">{props.sub ?? ' '}</div>
    </div>
  );
}

const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Errors',
  warn: 'Warnings',
  info: 'Notes',
};

/**
 * One severity bucket of the analysis. Clicking a row asks App to select the
 * items the issue refers to, so the plan highlights the actual offenders.
 */
export function IssueGroup(props: {
  severity: Severity;
  issues: readonly Issue[];
  selected: readonly string[];
  onPick: (issue: Issue) => void;
}) {
  if (props.issues.length === 0) return null;
  return (
    <div className={`issue-group issue-${props.severity}`}>
      <div className="issue-group-head">
        <span className="issue-dot" aria-hidden="true" />
        <span className="issue-group-title">{SEVERITY_LABEL[props.severity]}</span>
        <span className="issue-group-count num">{props.issues.length}</span>
      </div>
      <ul className="issue-list">
        {props.issues.map((issue, i) => {
          const refs = issue.refs ?? [];
          const active = refs.length > 0 && refs.some((r: string) => props.selected.includes(r));
          return (
            <li key={`${issue.code}-${i}`}>
              <button
                type="button"
                className="issue"
                aria-pressed={active}
                title={refs.length ? `Highlight ${refs.join(', ')}` : issue.code}
                onClick={() => props.onPick(issue)}
              >
                <span className="issue-code num">{issue.code}</span>
                <span className="issue-msg">{issue.message}</span>
                {refs.length ? <span className="issue-refs num">{refs.join(' · ')}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ layouts

export function LayoutCard(props: {
  index: number;
  name: string;
  description?: string;
  /** one-line stat summary, e.g. "14 items · 61% free · 2'-8" path" */
  summary: ReactNode;
  errors: number;
  warnings: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="layout-card"
      aria-pressed={props.active}
      onClick={props.onClick}
    >
      <span className="layout-index num">{props.index}</span>
      <span className="layout-body">
        <span className="layout-name">{props.name}</span>
        {props.description ? <span className="layout-desc">{props.description}</span> : null}
        <span className="layout-summary num">{props.summary}</span>
      </span>
      <span className="layout-flags">
        {props.errors > 0 ? (
          <span className="flag flag-error num" title={`${props.errors} errors`}>
            {props.errors}
          </span>
        ) : null}
        {props.warnings > 0 ? (
          <span className="flag flag-warn num" title={`${props.warnings} warnings`}>
            {props.warnings}
          </span>
        ) : null}
      </span>
    </button>
  );
}

// ------------------------------------------------------------------- rows

/** A generic 4-column data row used by the Items and Catalog tabs. */
export function DataRow(props: {
  primary: ReactNode;
  secondary?: ReactNode;
  cols: readonly ReactNode[];
  active?: boolean;
  onClick?: () => void;
  onHover?: (on: boolean) => void;
  title?: string;
}) {
  return (
    <div
      className={props.active ? 'row row-active' : 'row'}
      title={props.title}
      role={props.onClick ? 'button' : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      onClick={props.onClick}
      onKeyDown={(e) => {
        if (props.onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          props.onClick();
        }
      }}
      onMouseEnter={() => props.onHover?.(true)}
      onMouseLeave={() => props.onHover?.(false)}
    >
      <div className="row-main">
        <span className="row-primary">{props.primary}</span>
        {props.secondary ? <span className="row-secondary">{props.secondary}</span> : null}
      </div>
      <div className="row-cols">
        {props.cols.map((c, i) => (
          <span className="row-col num" key={i}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NoteList(props: { title: string; notes: readonly string[]; source?: string }) {
  return (
    <div className="notes">
      <div className="notes-head">
        <span className="notes-title">{props.title}</span>
        {props.source ? <span className="notes-source num">{props.source}</span> : null}
      </div>
      {props.notes.length === 0 ? (
        <EmptyState>No notes recorded.</EmptyState>
      ) : (
        <ul className="note-list">
          {props.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
