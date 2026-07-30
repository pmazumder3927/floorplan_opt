/**
 * Plan2D — a thin React wrapper around renderPlanSVG.
 *
 * DELIBERATELY DUMB. renderPlanSVG is the single source of truth for the
 * drawing; this component only:
 *   1. memoises the SVG string on (plan, layout, options, selected),
 *   2. injects it with dangerouslySetInnerHTML (one string, one DOM write —
 *      far cheaper than asking React to reconcile ~2k SVG nodes),
 *   3. delegates pointer events by walking event.target up to the nearest
 *      [data-item-id] that svg.ts stamped on every furniture group.
 *
 * There is NO drawing logic here. If something looks wrong on screen it is
 * wrong in svg.ts, and the headless PNG render will show the same bug.
 */

import { useCallback, useMemo, type JSX, type MouseEvent } from 'react';
import type { FloorPlan, Layout, Render2DOptions } from '@/core/types';
import { renderPlanSVG } from './svg';

export interface Plan2DProps {
  plan: FloorPlan;
  layout?: Layout;
  options?: Render2DOptions;
  className?: string;
  /** PlacedItem ids to highlight */
  selected?: string[];
  /** fires with the item id under the pointer, or null when clicking empty paper */
  onSelect?: (id: string | null) => void;
  /** fires as the pointer moves over items (null when it leaves them) */
  onHover?: (id: string | null) => void;
}

/** Walk up from the event target to the nearest group carrying an item id. */
function itemIdFrom(target: EventTarget | null): string | null {
  let node = target as Element | null;
  while (node && node.nodeType === 1) {
    // getAttribute rather than dataset: SVGElement.dataset exists in modern
    // browsers but this keeps the lookup identical for both HTML and SVG nodes.
    const id = node.getAttribute?.('data-item-id');
    if (id) return id;
    if (node.tagName?.toLowerCase() === 'svg') return null;
    node = node.parentElement;
  }
  return null;
}

export function Plan2D(props: Plan2DProps): JSX.Element {
  const { plan, layout, options, className, selected, onSelect, onHover } = props;

  // `selected` is folded into the render options so svg.ts can stamp the
  // is-selected class itself — that keeps the highlight identical in the
  // browser and in an exported/headless SVG.
  const selKey = selected ? selected.join(',') : '';
  const optKey = options ? JSON.stringify(options) : '';

  const { svg, width, height } = useMemo(
    () => renderPlanSVG(plan, layout, { ...options, selected }),
    // Structural keys: options/selected are plain data, so a stable string of
    // them is a correct and much cheaper dependency than the objects, which
    // callers usually re-create inline on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, layout, optKey, selKey],
  );

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!onSelect) return;
      onSelect(itemIdFrom(e.target));
    },
    [onSelect],
  );

  const handleMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!onHover) return;
      onHover(itemIdFrom(e.target));
    },
    [onHover],
  );

  return (
    <div
      className={className ? `plan2d ${className}` : 'plan2d'}
      onClick={onSelect ? handleClick : undefined}
      onMouseMove={onHover ? handleMove : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      data-plan-width={width}
      data-plan-height={height}
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Styles the wrapper needs but the SVG cannot carry itself: the responsive
 * sizing of the injected root element, and the selection outline (svg.ts adds
 * the `is-selected` class; the visual weight of the highlight belongs to the UI).
 * Mount this once, anywhere, if you are not already shipping global CSS.
 */
export const PLAN2D_CSS = `
.plan2d { display: block; width: 100%; }
.plan2d > svg { display: block; width: 100%; height: auto; }
.plan2d .p2d-item { transition: opacity 90ms linear; }
.plan2d .p2d-item.is-selected { outline: none; }
.plan2d .p2d-item.is-selected .p2d-body { paint-order: stroke; }
`;

export default Plan2D;
