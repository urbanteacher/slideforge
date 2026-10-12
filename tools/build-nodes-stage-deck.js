#!/usr/bin/env node
'use strict';

/* A Nodes stage as a presentation, exactly as the app shows it: every tab in order, each section a
 * slide, captured from Nodes by tools/capture-nodes-stage.mjs. The section's words are the speaker notes.
 *
 *   node tools/capture-nodes-stage.mjs critical-text 3
 *   node tools/build-nodes-stage-deck.js critical-text 3
 *
 * Writes lessons/nodes/<framework>-<stage>.sfbundle.json, pictures inside, in the Nodes theme.
 * Import it from the Library's Import button. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const memory = new Map();
global.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
global.window = { localStorage: global.localStorage };
require(path.join(root, 'js/model.js'));
const SF = global.window.SF;

const [fw = 'critical-text', slug = '3'] = process.argv.slice(2);
const DIR = `assets/lesson/nodes/${fw}-${slug}`;
const M = JSON.parse(fs.readFileSync(path.join(root, DIR, 'manifest.json'), 'utf8'));
const THEME = 'nodes';
/* A note Nodes repeats at the top of each tab: said once, on the tab's divider, not pictured each time. */
const isCaveat = s => /^The examiner-report research is computer science only/.test(s.text || '');

const slides = [{ type: 'title', title: M.head.title, subtitle: `${M.head.eyebrow} · ${M.head.ask}`,
  notes: `This stage in Nodes: ${M.live}\nEvery slide is the app's own section, captured as it is drawn.` }];
let pending = null;
for (const s of M.shots) {
  if (s.section) {
    pending = { type: 'section', title: s.tab, subtitle: s.establish, notes: s.establish };
    slides.push(pending);
    continue;
  }
  if (isCaveat(s)) { if (pending) pending.notes = `${pending.notes}\n${s.text}`; continue; }
  slides.push({ type: 'image', title: s.title || s.tab, image: `${DIR}/${s.file}`, imageFit: 'contain',
    design: { capStyle: 'none' }, notes: s.text });
}

const deck = SF.makeDeck(`${M.head.title}`);
const version = crypto.createHash('sha1').update(JSON.stringify({ THEME, slides, sizes: slides.map(s => s.image && fs.statSync(path.join(root, s.image)).size) })).digest('hex').slice(0, 8);
Object.assign(deck, { id: `nodes-${fw}-${slug}-${version}`, theme: THEME, sourceKey: `nodes-${fw}-${slug}`, aspect: '16:9' });
deck.slides = slides.map((s, i) => Object.assign(SF.makeSlide(s.type), { id: `nodes-${fw}-${slug}-${version}-${String(i + 1).padStart(3, '0')}`, progressive: false }, s));
const out = SF.normalizeDeck(deck);
if (out.slides.length !== slides.length) throw new Error('SlideForge did not keep every slide');

const dataUri = file => `data:image/png;base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
const embed = v => Array.isArray(v) ? v.map(embed) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, embed(x)]))
  : typeof v === 'string' && /^assets\/.*\.png$/.test(v) ? dataUri(v) : v;
const file = path.join(root, `lessons/nodes/${fw}-${slug}.sfbundle.json`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date().toISOString(), decks: [embed(out)], games: [] }, null, 2) + '\n');
console.log(`${out.slides.length} slides (${out.slides.filter(s => s.type === 'image').length} sections) · ${Math.round(fs.statSync(file).size / 1024)} KB · ${path.relative(root, file)}`);
