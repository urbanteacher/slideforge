import { defineConfig } from 'vite';

// Builds the standalone presentation player that gets inlined into exported HTML decks.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'src/generated',
    emptyOutDir: false,
    lib: {
      entry: 'src/engine/player-entry.ts',
      name: 'SlideForgePlayer',
      formats: ['iife'],
      fileName: () => 'player.iife.js',
    },
    minify: true,
  },
});
