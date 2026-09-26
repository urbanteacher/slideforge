/* Browser verification of the impromptu quick poll. No user data is used:
 * Playwright gets a fresh, isolated browser context.
 *
 * The behaviour worth guarding is the bit that makes it impromptu: the poll
 * belongs to the moment rather than to a slide, so the teacher can keep moving
 * through the deck behind it while the room answers, and only ending it takes
 * it down. Two separate code paths used to close it on a slide change, and a
 * third left the node in place but invisible.
 *
 * The deck goes straight to SF.Player: the classic editor's Present that used
 * to start it went with the classic studios, and the lab's Present draws every
 * slide as a still first. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.SF_URL || 'http://127.0.0.1:8787/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE);
  await page.waitForFunction(() => window.SF?.Player && window.SF?.Live?.startCustomPrompt);

  await page.evaluate(() => {
    const deck = SF.makeDeck('Quick poll smoke');
    deck.slides = ['One', 'Two', 'Three'].map((t) => {
      const s = SF.makeSlide('content');
      s.title = t;
      s.transition = 'none';
      return s;
    });
    SF.Store.save(deck);
    SF.Player.start(deck, 0, { fullscreen: false });
  });
  await page.waitForFunction(() => SF.Player.open);

  /* V opens the sheet for a teacher with one screen. */
  await page.keyboard.press('v');
  await page.waitForSelector('#quickPollModal.on');
  const presets = await page.locator('#quickPollBody .quick-actions button').allTextContents();
  assert.deepEqual(presets, ['Yes / No', 'True / False', 'A / B / C / D', '1 to 5', 'Word cloud']);

  /* A question with no answers is refused rather than launched empty. */
  await page.locator('#quickPollBody textarea').first().fill('');
  await page.locator('#quickPollBody button', { hasText: 'Ask the room' }).click();
  assert.match(await page.locator('#quickPollGuard').textContent(), /Write the question/);
  assert.equal(await page.evaluate(() => SF.Live.customPromptOpen()), false);

  const boxes = page.locator('#quickPollBody textarea');
  await boxes.nth(0).fill('Another example, or move on?');
  await boxes.nth(1).fill('Another example\nMove on');
  await page.locator('#quickPollBody button', { hasText: 'Ask the room' }).click();
  await page.waitForFunction(() => SF.Live.customPromptOpen());
  assert.equal(await page.locator('#quickPollModal.on').count(), 0, 'the sheet closes once the poll is up');

  const wire = await page.evaluate(() => SF.Live.prompt);
  assert.ok(/^quick:/.test(wire.id), 'namespaced so it cannot collide with a slide prompt');
  assert.deepEqual(wire.options, ['Another example', 'Move on']);
  assert.equal(wire.custom, true);

  /* The overlay fades in, so this waits for it to land rather than reading it
     mid-animation — but it still fails if it never becomes readable, which is
     the bug it is here for. */
  const waitVisible = (why) => page.waitForFunction(() => {
    const o = document.querySelector('[data-overlay]');
    if (!o) return false;
    const cs = getComputedStyle(o);
    return cs.opacity === '1' && cs.display !== 'none';
  }, null, { timeout: 5000 }).catch(() => { throw new Error('poll overlay never became visible: ' + why); });
  await waitVisible('after launch');

  /* The whole point: the deck keeps moving, the poll stays up and stays
     readable. It was previously closed by goTo and by syncAuthoredFeedback,
     and then survived as a node stranded at opacity 0. */
  for (const expected of [1, 2]) {
    await page.evaluate(() => SF.Player.next());
    await page.waitForFunction((i) => SF.Player.idx === i, expected);
    assert.equal(await page.evaluate(() => SF.Live.customPromptOpen()), true,
      'a slide change must not end a poll the slide never owned');
    await waitVisible('after moving to slide ' + expected);
    /* Redrawn over the new slide, not re-entered. Closing it first and
       rebuilding would fade the poll back in on every slide change, which
       reads as a flicker to the room mid-vote. */
    assert.equal(await page.evaluate(
      () => document.querySelector('[data-overlay]').classList.contains('entering')), false,
      'the poll is redrawn in place, not re-animated on each slide change');
  }

  /* V again ends it — the same key, rather than stacking a second poll. */
  await page.keyboard.press('v');
  await page.waitForFunction(() => SF.Live.customPromptOpen() === false);
  assert.equal(await page.locator('[data-overlay]').count(), 0, 'the overlay goes with it');
  assert.equal(await page.evaluate(() => SF.Player.idx), 2, 'and the deck is where the teacher left it');
  assert.equal(await page.evaluate(() => SF.Player.open), true, 'ending the poll does not end the show');

  /* A quiz written on a theme, mid-lesson, goes into the lesson already
     running rather than starting a show of its own — which would end the
     lesson the teacher is in the middle of and make a live room rejoin. */
  await page.evaluate(() => {
    const realFetch = window.fetch;
    window.fetch = async (url, opts) => {
      if (/\/api\/ai\/status/.test(url)) return { ok: true, json: async () => ({ available: true }) };
      if (/\/api\/ai\/generate/.test(url)) {
        return { ok: true, json: async () => ({ text: '```json\n' + JSON.stringify({ questions: [
          { question: 'Which process moves water into a cell?', options: ['Osmosis', 'Active transport'], correct: 0, explanation: 'Osmosis.' },
          { question: 'BROKEN', options: ['one'], correct: 0 }
        ] }) + '\n```' }) };
      }
      return realFetch(url, opts);
    };
  });
  /* Back into the middle of the lesson: inserting after the last slide would
     make the new question the tail and prove nothing about keeping the rest. */
  await page.evaluate(() => SF.Player.goTo(0));
  await page.waitForFunction(() => SF.Player.idx === 0);
  const beforeGen = await page.evaluate(() => ({ n: SF.Player.deck.slides.length, at: SF.Player.idx }));
  const gen = await page.evaluate(() => SF.Player.quizGen({ topic: 'Osmosis', style: 'choice', count: 2 }));
  assert.ok(!gen.error, gen.error);
  assert.equal(gen.added, 1, 'only the question the engine accepted is inserted');
  assert.equal(gen.rejected, 1, 'and the broken draft is reported, not silently dropped');

  /* A desk quiz goes over the lesson, it does not join it. The deck is left
     exactly as it was and the questions live on Player.spontaneous, so Esc
     hands the wall back with the lesson still on its own slide. */
  assert.ok(gen.overlay, 'the quiz came up as an overlay');
  const afterGen = await page.evaluate(() => ({
    n: SF.Player.deck.slides.length,
    at: SF.Player.idx,
    overlay: SF.Player.spontaneous ? SF.Player.spontaneous.slides.length : 0,
    title: SF.Player.spontaneous && SF.Player.spontaneous.title,
    lands: SF.Player.wallSlide().question,
    tail: SF.Player.deck.slides[SF.Player.deck.slides.length - 1].title
  }));
  assert.equal(afterGen.n, beforeGen.n, 'the lesson is untouched, not spliced into');
  assert.equal(afterGen.at, beforeGen.at, 'and it kept its place underneath');
  assert.equal(afterGen.overlay, 1, 'the accepted question is the overlay');
  assert.equal(afterGen.title, 'Osmosis', 'the overlay is named after the theme asked for');
  assert.match(afterGen.lands, /Which process moves water/, 'straight to the question, no How to play card');
  assert.equal(afterGen.tail, 'Three', 'the lesson still ends where it did');

  /* And handing the wall back leaves the lesson exactly where it was. */
  await page.evaluate(() => SF.Player.endSpontaneous());
  await page.waitForFunction(() => !SF.Player.spontaneous);
  const back = await page.evaluate(() => ({ n: SF.Player.deck.slides.length, at: SF.Player.idx }));
  assert.equal(back.n, beforeGen.n, 'the lesson is the same length afterwards');
  assert.equal(back.at, beforeGen.at, 'and on the slide it was on before the quiz');

  assert.deepEqual(errors, [], 'no page errors while polling');
  console.log('Quick poll smoke passed: sheet, validation, survives slide changes, desk quiz overlays the lesson and hands it back, ends clean.');
} finally {
  await browser.close();
}
