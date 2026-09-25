import { defineConfig } from 'vite';

// The lab's player as one script for SlideForge's page (lab-app/stage.js, window.SFLabStage).
// Runs after vite.app.config.ts, which empties lab-app/, so it must not empty it again.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: '../lab-app',
    emptyOutDir: false,
    lib: {
      entry: 'src/engine/stage-entry.ts',
      name: 'SlideForgeLabStage',
      formats: ['iife'],
      fileName: () => 'stage.js',
    },
    minify: true,
  },
});
