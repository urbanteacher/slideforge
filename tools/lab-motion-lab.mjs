#!/usr/bin/env node
/* The Motion lab lesson's content, for the lab (SlideForge Studio).
 *
 * The lab builds these slides itself (lab/src/model/motionLab.ts and fromSlideForge.ts); what it
 * needs from SlideForge is what each slide says and the pictures and clips it shows. This reads the
 * lesson from js/lessons.js — its authored slides, then the section, the ten motion specimens and
 * the five visual studies the file appends to it — and embeds the media it names. It reads source
 * files only; nothing runs in a browser and nothing is measured off a screen.
 *
 *   node tools/lab-motion-lab.mjs   → lab/src/assets/motion-lab.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = readFileSync(root + 'js/lessons.js', 'utf8');
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm' };

// The authored slides: the lesson's JSON "slides" array.
const at = src.indexOf('"key": "motion-lab"');
const open = src.indexOf('"slides": [', at) + '"slides": '.length;
let depth = 0, end = open;
for (; end < src.length; end++) {
  if (src[end] === '[') depth++;
  if (src[end] === ']' && --depth === 0) break;
}
const slides = JSON.parse(src.slice(open, end + 1));

// What the file appends: the specs and the push that turns each into a slide, as written there.
const specsText = src.match(/var motionImage = '([^']+)';\s*var motionSpecs = (\[[\s\S]*?\n    \]);/);
const image = specsText[1];
const specs = Function(`return ${specsText[2]}`)();
const looks = Function(`return ${readFileSync(root + 'src/render/motion-lab.js', 'utf8').match(/MOTION_LOOKS = (\{[\s\S]*?\});/)[1]}`)();
const note = (s) => `${s}\n\nUse Present for controls; thumbnails show a settled overview. Reset / replay returns to the starting state.`;
slides.push({ type: 'section', title: 'Control the movement', subtitle: 'Ten interactive experiments / Present to try them', notes: 'These specimens are reusable content slides. The experiment state is transient; the authored content remains unchanged.' });
for (const [scene, title, subtitle, look, bullets] of specs) {
  slides.push({ type: 'motion', title, subtitle, bullets, body: scene === 'cause' ? '2' : '', image, motionScene: scene, design: { motionLook: look, composition: 'none' }, notes: note(subtitle) });
}
for (const [look, name] of Object.entries(looks)) {
  slides.push({ type: 'motion', title: `${name} / visual study`, subtitle: 'The same content, composed with a different visual treatment.',
    bullets: ['Notice\tWhat leads your eye into the slide?', 'Compare\tWhich detail becomes easier to read?', 'Choose\tUse this style where it serves the subject.'],
    motionScene: 'panels', design: { motionLook: look, composition: 'none' }, notes: 'Select a panel to expand it. Compare this style with the other four studies.' });
}

// Every picture and clip the slides name, embedded.
const media = {};
const walk = (v) => {
  if (typeof v === 'string') {
    const m = v.match(/^(assets\/[^?#]+\.(jpe?g|png|svg|mp4|webm))/i);
    if (m && !media[m[1]] && existsSync(root + m[1])) media[m[1]] = `data:${MIME[m[2].toLowerCase()]};base64,${readFileSync(root + m[1]).toString('base64')}`;
  } else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
slides.forEach(walk);

const out = root + 'lab/src/assets/motion-lab.json';
const data = { key: 'motion-lab', title: 'Motion lab — everything that moves, once each', theme: 'cinematic', slides, images: media };
writeFileSync(out, JSON.stringify(data));
console.log(`${slides.length} slides, ${Object.keys(media).length} media → ${out} (${(JSON.stringify(data).length / 1e6).toFixed(2)} MB)`);
