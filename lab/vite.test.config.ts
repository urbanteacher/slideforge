import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { SF_ALIAS } from './vite.config';

// The lab's unit tests (tests/*.test.ts), built for Node with the lab's own Vite and aliases, then run with
// `node --test` like the root's: `npm test` here, and from the root through tests/lab-unit.test.js.
// SF_LAB_TEST_OUT moves the build (the root runner uses a temporary folder).
const dir = resolve(import.meta.dirname, 'tests');
const input = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.test.ts')).map((f) => [f.replace(/\.ts$/, ''), resolve(dir, f)]));

export default defineConfig({
  resolve: { alias: SF_ALIAS },
  // Tests need none of the app's public files (its fonts).
  publicDir: false,
  build: {
    ssr: true,
    outDir: process.env.SF_LAB_TEST_OUT || resolve(import.meta.dirname, '.test-build'),
    emptyOutDir: true,
    rollupOptions: { input, output: { entryFileNames: '[name].mjs' } },
  },
});
