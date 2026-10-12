#!/usr/bin/env node
/* Record how SlideForge's classic code marks answers, for the lab's scoring tests (lab/tests/scoring.test.ts).
 *
 *   node tools/scoring-fixtures.mjs
 *
 * Every game format's showcase game (SF.getShowcaseGame) is compiled as the room compiles it
 * (SF.compileGame), and each question slide is offered a fixed set of responses: option indices, the
 * slide's own words, a wrong word, orders. What classic's markResponse and answerLabel say about each is
 * written to tests/fixtures/scoring/marks.json. The lab, importing the same logic where it lives, must say
 * the same (lab-engine-plan M1). Rerun after a deliberate change to marking, and say so in the commit. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = {};
const context = { window: {}, console, Date, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/model.js'), 'utf8'), context);
const SF = context.window.SF;

/** The responses a slide is offered: whatever kind of answer its style might take. */
function responses(slide) {
  const out = [-1, 0, 1, 2, 3, 4, 5, '', 'a clearly wrong answer'];
  const words = [];
  for (const k of ['answer', 'accept', 'accepts', 'options', 'items', 'answers', 'term', 'word', 'fix', 'error']) {
    const v = slide[k];
    if (typeof v === 'string') words.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') words.push(x);
  }
  for (const w of words.slice(0, 8)) { out.push(w, w.toUpperCase(), ' the ' + w + ' '); }
  const n = Array.isArray(slide.items) ? slide.items.length : Array.isArray(slide.options) ? slide.options.length : 0;
  if (n > 1) { const id = [...Array(n).keys()]; out.push(id, [...id].reverse()); }
  // Answers that are lists: a sort's bins, a passage's gaps. Right, then each shifted by one.
  for (const k of ['sortAnswers', 'gapAnswers']) {
    const v = slide[k];
    if (Array.isArray(v) && v.length) out.push(v.slice(), v.map((x) => (Number(x) || 0) + 1), v.slice().reverse());
  }
  // A number to estimate: on it, at the edge of its tolerance, just past it.
  if (typeof slide.target === 'number') {
    const t = slide.target, tol = Number(slide.tolerance) || 0;
    out.push(t, t + tol, t - tol, t + tol + 1, String(t));
  }
  return out;
}

const cases = [];
for (const format of Object.keys(SF.GAME_FORMAT_PRESETS)) {
  let game;
  try { game = SF.getShowcaseGame(format); } catch { continue; }
  if (!game || !Array.isArray(game.questions) || !game.questions.length) continue;
  const slides = SF.compileGame(JSON.parse(JSON.stringify(game)), { intro: false }).filter((s) => s.type === 'quiz' || (s.style && SF.GAME_STYLES[s.style]));
  slides.slice(0, 3).forEach((slide, i) => {
    const plain = JSON.parse(JSON.stringify(slide));
    const marks = responses(plain).map((response) => {
      let mark, label;
      try { mark = SF.markResponse(plain, response); } catch (e) { mark = 'throws'; }
      try { label = SF.answerLabel(plain, response); } catch (e) { label = 'throws'; }
      return { response, mark, label };
    });
    cases.push({ format, style: plain.style, question: i, slide: plain, marks });
  });
}
const claims = [true, false].map((accepted) => ({ accepted, points: SF.claimPoints ? SF.claimPoints(accepted) : null }));
fs.mkdirSync(path.join(ROOT, 'tests/fixtures/scoring'), { recursive: true });
// The board games (memory, bingo, low stakes, quiz bowl) compile to content slides and are marked cell by
// cell on their board in the room, not here; they come with the board port (lab-engine-plan M4, M8).
const note = 'Board games are marked on their board, not as question slides: not recorded here.';
fs.writeFileSync(path.join(ROOT, 'tests/fixtures/scoring/marks.json'), JSON.stringify({ made: 'tools/scoring-fixtures.mjs', note, cases, claims }, null, 1) + '\n');
const styles = new Set(cases.map((c) => c.style));
console.log(`tests/fixtures/scoring/marks.json: ${cases.length} questions, ${styles.size} styles, ${cases.reduce((n, c) => n + c.marks.length, 0)} marks`);
