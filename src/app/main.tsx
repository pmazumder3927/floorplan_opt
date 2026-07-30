/**
 * Entry point.
 *
 * One subtlety that matters: in CAPTURE mode we do NOT wrap the tree in
 * StrictMode. StrictMode double-invokes effects on mount, which for the 3D
 * viewer means two mount/unmount cycles and potentially two onReady callbacks —
 * the headless renderer would then screenshot a canvas that is mid-rebuild.
 * signalReady() is idempotent as a second line of defence, but the simplest fix
 * is not to double-mount in the first place.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { parseCaptureConfig } from './capture';

const config = parseCaptureConfig();

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root not found — index.html must provide <div id="root"></div>');
}

// Expose the requested palette to CSS: the capture page paints its background
// to match the drawing so a screenshot has no stray chrome-coloured border.
document.documentElement.dataset.planTheme = config.theme;
if (config.capture) document.documentElement.dataset.capture = '1';

const root = createRoot(container);

root.render(
  config.capture ? (
    <App config={config} />
  ) : (
    <StrictMode>
      <App config={config} />
    </StrictMode>
  ),
);
