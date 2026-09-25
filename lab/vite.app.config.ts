import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

// The lab as SlideForge's lesson engine: built into /lab-app at the repo root, where the relay's
// static server serves it beside index.html (js/lab-engine.js frames lab-app/index.html?embed=1).
// Committed, as js/model.js is, because Render's build installs no dev dependencies and never
// builds the lab. Rebuild with `npm run build:app` after changing lab/src.
export default mergeConfig(base, defineConfig({
  base: '/lab-app/',
  build: { outDir: '../lab-app', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
}));
