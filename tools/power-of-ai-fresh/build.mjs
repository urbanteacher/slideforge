#!/usr/bin/env node
/* Build The Power of AI, new edition: bundle deck.ts with the Lesson studio's own Vite (so it uses the
 * studio's createLayer, defaults and theme code), run it to write the deck's JSON, then ship it in
 * js/lab-decks.js (tools/build-lab-decks.mjs).
 *
 *   node tools/power-of-ai-fresh/build.mjs */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const LAB = path.join(ROOT, 'lab');
const vite = await import(pathToFileURL(path.join(LAB, 'node_modules/vite/dist/node/index.js')).href);
const outDir = path.join(HERE, '.build');
await vite.build({
  configFile: false, root: LAB, logLevel: 'warn', publicDir: false,
  resolve: { alias: { '@sf': path.join(ROOT, 'src') } },
  ssr: { noExternal: true },
  build: { ssr: true, outDir, emptyOutDir: true, rollupOptions: { input: { deck: path.join(HERE, 'deck.ts') }, output: { entryFileNames: '[name].mjs' } } },
});
execFileSync(process.execPath, [path.join(outDir, 'deck.mjs')], { stdio: 'inherit', cwd: ROOT });
execFileSync(process.execPath, [path.join(ROOT, 'tools/build-lab-decks.mjs')], { stdio: 'inherit', cwd: ROOT });
