import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

// The lab as SlideForge's lesson engine: built into /lab-app at the repo root, where the relay's
// static server serves it beside index.html (js/lab-engine.js frames lab-app/index.html?embed=1).
// Committed, as js/model.js is, because Render's build installs no dev dependencies and never
// builds the lab. Rebuild with `npm run build:app` after changing lab/src.
// Two pages: the studio (index.html) and the viewer for a shared lesson (view.html, lab-engine-plan M12).
// SF_LAB_APP_OUT builds elsewhere (a check build that leaves the committed bundle alone).
export default mergeConfig(base, defineConfig({
  base: '/lab-app/',
  build: {
    outDir: process.env.SF_LAB_APP_OUT || '../lab-app', emptyOutDir: true, chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { index: resolve(import.meta.dirname, 'index.html'), view: resolve(import.meta.dirname, 'view.html') } },
  },
}));
