'use strict';
/* The handout of a lesson that lives in the lab.
 *
 * SlideForge's handout prints a slide that moves as the pages it moves
 * through: Week 2's 70 slides are 102 pages. A lab lesson's handout is built
 * from pictures of the lab's slides, one state each, so js/lab-engine.js
 * prints the slides that SlideForge gives more pages from their originals.
 * This checks that rule, as lab-engine.js has it, against SlideForge's own
 * page builder (js/print.js). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const dir = path.resolve(__dirname, '..');
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  /* navigator.webdriver keeps lab-engine.js from mounting the lab's frame: there is no page here. */
  const context = { window: {}, console, localStorage, Date, JSON, Set, Promise, location: { search: '' }, navigator: { webdriver: true } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  context.window.SF.installExperiments(context.window.SF);
  for (const f of ['js/lessons.js', 'js/print.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  context.SF = context.window.SF;
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/lab-engine.js'), 'utf8'), context);
  return context.window.SF;
}

test('Week 2 printed from the lab has the pages SlideForge’s handout has', () => {
  const SF = load();
  const deck = SF.buildLesson('ipdv-vc-hybrid');
  const { printsAsPages, pictureSlide } = SF.LabEngine;
  // What the show deck holds: each slide the lab builds as its picture (with the slide's feedback,
  // as a converted slide keeps it), and the lesson's games as themselves.
  const shown = deck.slides.map((s) => s.type === 'game' ? s
    : pictureSlide({ id: s.id, image: 'still.jpg', notes: '', hidden: false, name: s.title, feedback: s.feedback }));
  const printed = deck.slides.map((s, i) => (s.type !== 'game' && printsAsPages(s, shown[i])) ? s : shown[i]);
  const pages = (slides) => SF.Print.pagesFor(Object.assign({}, deck, { slides })).length;
  assert.equal(pages(deck.slides), 102, 'SlideForge’s own handout of the lesson');
  assert.equal(pages(printed), pages(deck.slides), 'the lab lesson prints the same pages');
  assert.ok(pages(shown) < pages(printed), 'pictures alone would have lost the experiments’ states');
  // The experiments are among the slides printed from the original.
  deck.slides.forEach((s, i) => { if (s.type === 'experiment') assert.equal(printed[i], s); });
});
