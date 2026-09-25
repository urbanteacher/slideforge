#!/usr/bin/env node
/* SlideForge's game formats, for the lab (SlideForge Studio).
 *
 * The same process as the Layout bank and the activities: the lab builds each game itself
 * (lab/src/model/games.ts); SlideForge says what each game is. For every catalogue format this
 * takes SlideForge's own sample game (SF.getShowcaseGame, what Quiz studio's demo plays), runs it
 * through SlideForge's own compiler (SF.compileGame — the intro, How to play, each question or the
 * board, in the order the room sees them), keeps the content fields and writes one file. The rules
 * and the flow stay defined once, in src/games; nothing is measured off the screen.
 *
 *   SF_URL=http://localhost:8787 node tools/lab-games.mjs
 *     → lab/src/assets/games.json
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const SF_URL = process.env.SF_URL || 'http://localhost:8787';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(SF_URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.SF && window.SF.compileGame && window.SF.getShowcaseGame && window.SF.FORMAT_STYLE);
const data = await page.evaluate(() => {
  const SF = window.SF;
  // Player and editor state stay behind; what a slide says, and how the room answers it, stay.
  const drop = new Set(['id', 'transition', 'layers', 'gameId', 'videoStart', 'videoEnd', 'videoLoop', 'videoMuted', 'videoAutoplay']);
  const empty = (v) => v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const clean = (v) => {
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k, x]) => !drop.has(k) && !empty(x) && typeof x !== 'function').map(([k, x]) => [k, clean(x)]));
    return v;
  };
  return Object.keys(SF.FORMAT_STYLE).map((format) => {
    const style = SF.FORMAT_STYLE[format];
    const engine = SF.gameStyle(style);
    const game = SF.getShowcaseGame({ style, format, questions: [], settings: SF.makeGame('x', style).settings }, { forceSample: true });
    // The room's view: the intro and How to play on, the scoreboard off (the lab has no room to score).
    game.settings = Object.assign({}, game.settings, { intro: true, howTo: true, scoreboard: false, scoreSlide: false });
    const book = SF.Playbook && SF.Playbook.forGame ? SF.Playbook.forGame(game) : null;
    const f = SF.gameFormat ? SF.gameFormat(format) : null;
    return {
      format, style,
      label: (f && f.label) || (book && book.title) || (engine && engine.label) || format,
      styleLabel: (engine && engine.label) || style,
      mechanic: (engine && engine.mechanic) || '',
      board: !!(engine && engine.boardEngine),
      aim: (book && book.aim) || '',
      blurb: (book && (book.blurb || book.summary || book.aim)) || '',
      howToPlay: (book && book.howToPlay) || [],
      title: game.title,
      slides: SF.compileGame(game).map(clean),
    };
  });
});
await browser.close();

const out = root + 'lab/src/assets/games.json';
writeFileSync(out, JSON.stringify({ games: data }));
const kinds = {};
data.forEach((g) => g.slides.forEach((s) => { const k = s.type + (s.input ? ':' + s.input : ''); kinds[k] = (kinds[k] || 0) + 1; }));
console.log(`${data.length} formats, ${data.reduce((n, g) => n + g.slides.length, 0)} slides → ${out} (${(JSON.stringify({ games: data }).length / 1e3).toFixed(0)} kB)`);
console.log(Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(' · '));
