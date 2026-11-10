#!/usr/bin/env node
/* The icons a slide can carry (BACKLOG CS-17): a curated set copied from Lucide (lucide-react, ISC licence) into
   lab/src/assets/icons.json, as each icon's drawing (its elements on a 24-unit grid). The studio draws them on the
   canvas itself, so a slide needs no font or picture for an icon, and the studio does not bundle all of Lucide.

     node tools/lab-icons.mjs        rebuild the file from the list below

   Add a name to the list (Lucide's own, as on lucide.dev) and run it again. The test lab/tests/icons.test.ts checks
   every icon the lesson file or a layout names is in the file. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'lab/node_modules/lucide-react/dist/esm/icons');
const OUT = path.join(ROOT, 'lab/src/assets/icons.json');

/** By what a lesson needs to say: ideas, people, learning, data, science, the world, time, feelings, actions. */
const GROUPS = {
  Ideas: ['lightbulb', 'brain', 'sparkles', 'puzzle', 'target', 'compass', 'key', 'lock', 'shield', 'flag', 'rocket', 'zap', 'star'],
  People: ['user', 'users', 'user-check', 'graduation-cap', 'handshake', 'hand', 'message-circle', 'messages-square', 'megaphone', 'heart', 'face-slightly-smiling', 'face-slightly-frowning', 'face-neutral'],
  Learning: ['book-open', 'notebook-pen', 'pencil', 'clipboard-check', 'list-checks', 'check', 'x', 'circle-question-mark', 'info', 'triangle-alert', 'search', 'eye', 'ear'],
  Data: ['chart-column', 'chart-line', 'chart-pie', 'chart-scatter', 'table', 'database', 'trending-up', 'trending-down', 'percent', 'calculator', 'sigma', 'binary', 'funnel'],
  Tech: ['laptop', 'smartphone', 'monitor', 'cpu', 'bot', 'code', 'wifi', 'cloud', 'server', 'globe', 'link', 'mouse-pointer-click', 'camera'],
  Science: ['flask-conical', 'atom', 'microscope', 'dna', 'leaf', 'sprout', 'tree-pine', 'sun', 'moon', 'droplet', 'flame', 'wind', 'earth'],
  'Time and place': ['clock', 'timer', 'calendar', 'hourglass', 'map', 'map-pin', 'house', 'building', 'school', 'factory', 'car', 'bus', 'plane'],
  Money: ['coins', 'banknote', 'wallet', 'shopping-cart', 'piggy-bank', 'scale', 'briefcase', 'gift', 'trophy', 'medal', 'award', 'crown', 'gem'],
  Arrows: ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'move-right', 'refresh-cw', 'repeat', 'shuffle', 'git-branch', 'split', 'merge', 'circle-arrow-right', 'undo-2'],
};

const out = { source: 'Lucide (lucide.dev), ISC licence', size: 24, groups: {}, icons: {} };
const missing = [];
for (const [group, names] of Object.entries(GROUPS)) {
  out.groups[group] = [];
  for (const name of names) {
    const file = path.join(SRC, `${name}.mjs`);
    if (!fs.existsSync(file)) { missing.push(name); continue; }
    const mod = await import(pathToFileURL(file).href);
    const node = mod.__iconData?.node;
    if (!Array.isArray(node)) { missing.push(name); continue; }
    // Keep only what draws: the element and its geometry, not React's keys.
    out.icons[name] = node.map(([tag, attrs]) => [tag, Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'key'))]);
    out.groups[group].push(name);
  }
}
if (missing.length) { console.error(`Not in Lucide: ${missing.join(', ')}`); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`${Object.keys(out.icons).length} icons → ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
