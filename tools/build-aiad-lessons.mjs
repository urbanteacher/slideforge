/* Put the AI Awareness Day starters in the Library as factory lessons.
 *
 * The five-minute starters were import-only: built into .sfbundle.json files
 * by AiAd26/build.js and AiAd27/build.js, which a teacher had to find on disk
 * and import before the decks existed. The Library already had a folder for
 * each campaign and neither ever appeared in it, because a Library card comes
 * from LESSONS + LIBRARY_SEED_KEYS in js/lessons.js and nothing put them there.
 *
 * So this writes them in. The starters stay the single source — the bundle and
 * the Library card are built from the same file, rather than the content being
 * pasted into lessons.js where the next edit to a starter would leave the two
 * disagreeing.
 *
 *   node tools/build-aiad-lessons.mjs            rewrite the generated blocks
 *   node tools/build-aiad-lessons.mjs --check    fail if they are out of date
 *
 * --check is what CI wants: it proves the committed lessons.js still matches
 * the starters, the same way `npm run build:check` guards js/model.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { DECK_SETTINGS: A27 } = require('../AiAd27/deck-settings.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'js', 'lessons.js');

/* One glyph per principle, shared by both campaigns so the same strand reads
   the same in the picker whichever year it came from. */
const ICONS = {
  safe: '◉',
  smart: '◆',
  creative: '✦',
  responsible: '⬖',
  future: '❯'
};

/* What differs between the two years. Everything else — the title shape, the
   five-minute length, numbers off — is the campaign, not the year.

   The logo rules follow each campaign's own artwork. 2026 has a per-principle
   badge on every slide, drawn for its own ground, so it is never reversed.
   2027 has one ink lockup, and now carries it on every slide — two of which
   are dark — so it leaves reversal to the ground rather than refusing it. */
const CAMPAIGNS = [
  {
    group: 'aiad26',
    org: 'AI Awareness Day 2026',
    module: 'AiAd26/starters.js',
    exportName: 'STARTERS',
    theme: (s) => s.theme,
    logo: (s) => `assets/brand/aiad26/aiad26-${s.key}.svg`,
    logoOn: 'all',
    logoReverse: 'never'
  },
  {
    group: 'aiad27',
    org: 'AI Awareness Day 2027',
    module: 'AiAd27/starters27.js',
    exportName: 'STARTERS_27',
    theme: (s) => `aiad27-${s.key}`,
    /* Deck-level settings live in AiAd27/deck-settings.js, shared with the
       bundle builder so the Library card and the importable file cannot
       describe the same deck differently. */
    logo: () => A27.logo,
    closingNote: A27.closingNote,
    logoOn: A27.logoOn,
    logoReverse: A27.logoReverse,
    showSlideNumbers: A27.showSlideNumbers
  }
];

function lessonSpec(campaign, starter) {
  if (!starter.key || !starter.principle || !starter.title) {
    throw new Error(`${campaign.module}: a starter is missing key, principle or title`);
  }
  if (!(starter.slides || []).length) {
    throw new Error(`${campaign.module}: ${starter.key} has no slides`);
  }
  return {
    key: `${campaign.group}-${starter.key}`,
    title: `${starter.principle} · ${starter.title}`,
    icon: ICONS[starter.key] || '✳',
    /* The card has to say what the deck opens on, because the question IS the
       starter — the five minutes are spent on it before anything is taught. */
    blurb: `Five minutes on ${starter.principle}. Opens on “${starter.title}” — `
      + 'the room answers before anything is explained, then the numbers, then '
      + 'the answers one at a time.',
    minutes: 5,
    theme: campaign.theme(starter),
    org: campaign.org,
    logo: campaign.logo(starter),
    logoOn: campaign.logoOn,
    logoSize: 'large',
    ...(campaign.logoReverse ? { logoReverse: campaign.logoReverse } : {}),
    ...(campaign.closingNote ? { closingNote: campaign.closingNote } : {}),
    showSlideNumbers: campaign.showSlideNumbers !== undefined ? campaign.showSlideNumbers : false,
    slides: starter.slides
  };
}

function collect() {
  const specs = [];
  for (const campaign of CAMPAIGNS) {
    const file = path.join(ROOT, campaign.module);
    if (!fs.existsSync(file)) throw new Error(`missing ${campaign.module}`);
    const mod = require(file);
    const starters = mod[campaign.exportName];
    if (!Array.isArray(starters) || !starters.length) {
      throw new Error(`${campaign.module} does not export ${campaign.exportName}`);
    }
    for (const starter of starters) specs.push(lessonSpec(campaign, starter));
  }
  const keys = specs.map((s) => s.key);
  if (new Set(keys).size !== keys.length) throw new Error('two starters claim one key');
  return specs;
}

/** Indent a JSON literal to sit inside the LESSONS array. */
function literal(spec, indent) {
  const pad = ' '.repeat(indent);
  return JSON.stringify(spec, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? pad + line : pad + line))
    .join('\n');
}

function replaceRegion(text, name, body) {
  const start = `/* ${name}:start */`;
  const end = `/* ${name}:end */`;
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < 0) throw new Error(`js/lessons.js has no ${name} markers`);
  return text.slice(0, i + start.length) + '\n' + body + '\n    ' + text.slice(j);
}

function render(text, specs) {
  const packs = specs.map((s) => literal(s, 4)).join(',\n');
  const seeds = specs
    .map((s) => `    '${s.key}': '${s.key.slice(0, s.key.indexOf('-'))}'`)
    .join(',\n');
  let out = replaceRegion(text, 'aiad-packs', packs);
  out = replaceRegion(out, 'aiad-seed', seeds + ',');
  return out;
}

const specs = collect();
const before = fs.readFileSync(TARGET, 'utf8');
const after = render(before, specs);
const check = process.argv.includes('--check');

if (before === after) {
  console.log(`js/lessons.js is up to date — ${specs.length} AI Awareness Day packs`);
  process.exit(0);
}
if (check) {
  console.error('js/lessons.js is out of date. Run: node tools/build-aiad-lessons.mjs');
  process.exit(1);
}
fs.writeFileSync(TARGET, after, 'utf8');
console.log(`Wrote ${specs.length} AI Awareness Day packs into js/lessons.js`);
for (const s of specs) console.log(`  ${s.key.padEnd(20)} ${s.title}`);
