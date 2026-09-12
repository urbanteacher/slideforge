/* Browser verification of Lesson studio's whole-lesson rehearsal. No user
 * data is used: Playwright gets a fresh, isolated browser context.
 *
 * The point of the rehearsal is that one run crosses formats. The thing worth
 * guarding is that the sample room follows the lesson rather than behaving one
 * fixed way throughout: a scored question gets answers, and a format the room
 * answers out loud gets a speaker and no invented phone votes. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.SF_URL || 'http://127.0.0.1:8787/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE);
  await page.waitForFunction(() => window.SF?.Editor?.workspace);

  /* A lesson that mixes a scored check, a spoken explain, and an exit poll. */
  await page.evaluate(() => {
    const mk = (style, title) => {
      const g = SF.createPresetGame(style, { title }, 'midnight');
      SF.GameStore.save(g);
      return g;
    };
    const quiz = mk('choice', 'Scored check');
    const spoken = mk('spinexplain', 'Explain it');
    const deck = SF.makeDeck('Rehearsal lesson');
    const intro = SF.makeSlide('content'); intro.title = 'Today we cover cells';
    const g1 = SF.makeSlide('game'); g1.gameId = quiz.id; g1.title = g1.gameTitle = quiz.title;
    const g2 = SF.makeSlide('game'); g2.gameId = spoken.id; g2.title = g2.gameTitle = spoken.title;
    const exit = SF.makeSlide('content'); exit.title = 'Exit ticket';
    exit.feedback = Object.assign(SF.makeFeedback('poll'),
      { prompt: 'How did that land?', options: ['Clear', 'Mostly', 'Lost'] });
    deck.slides = [intro, g1, g2, exit];
    SF.Store.save(deck);
    SF.Editor.workspace.setDoc(deck);
    SF.Shell.activate('deck');
    SF.Editor.workspace.draw();
  });

  await page.locator('#btnRehearse').click();
  await page.waitForFunction(() => SF.Player.open && SF.Demo.active);
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), false,
    'a dry run stays windowed, so Esc means stop rehearsing rather than leave fullscreen');
  assert.ok(await page.evaluate(() => SF.Demo.players().length) >= 6, 'a sample class joined');
  assert.equal(await page.evaluate(() => !!document.getElementById('playerDemoPill')), true,
    'the run is labelled on the slide as a demo');

  const idx = await page.evaluate(() => {
    const s = SF.Player.deck.slides;
    return {
      scored: s.findIndex((x) => x.style === 'choice'),
      spoken: s.findIndex((x) => x.style === 'spinexplain'),
      poll: s.findIndex((x) => SF.slideFeedback && SF.slideFeedback(x))
    };
  });
  assert.ok(idx.scored > -1 && idx.spoken > -1 && idx.poll > -1, 'both games expanded into the run');

  /* Scored question: the room answers. */
  await page.evaluate((i) => SF.Player.goTo(i), idx.scored);
  await page.waitForFunction((i) => {
    const s = SF.Player.deck.slides[i];
    return SF.Demo.players().filter((p) => p.slideId === s.id && p.choice != null).length >= 6;
  }, idx.scored, { timeout: 20000 });

  /* Spoken format: a speaker, and no phone votes invented for them. Without
     the per-slide mode this reported six answers to a question nobody was
     asked to tap. */
  await page.evaluate(() => { window.__notes = []; const rn = SF.Player.railNote;
    SF.Player.railNote = function (t) { window.__notes.push(t); return rn.apply(this, arguments); }; });
  await page.evaluate((i) => SF.Player.goTo(i), idx.spoken);
  await page.waitForFunction(() => (window.__notes || []).some((n) => / speaks: /.test(n)), null, { timeout: 20000 });
  assert.equal(await page.evaluate((i) => {
    const s = SF.Player.deck.slides[i];
    return SF.Demo.players().filter((p) => p.slideId === s.id && p.choice != null).length;
  }, idx.spoken), 0, 'a format answered aloud must not collect invented phone votes');

  /* Exit poll: sample responses, marked as sample. */
  await page.evaluate((i) => SF.Player.goTo(i), idx.poll);
  await page.waitForFunction(() => SF.Player._sampleFb && SF.Player._sampleFb.digest, null, { timeout: 10000 });
  assert.equal(await page.evaluate(() => SF.Player._sampleFb.digest.sample), true,
    'sample poll responses are labelled sample, never mistaken for a real room');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => SF.Player.open === false && SF.Demo.active === false);
  assert.equal(await page.evaluate(() => !document.getElementById('playerDemoPill')), true,
    'the demo label goes when the rehearsal does');

  assert.deepEqual(errors, [], 'no page errors during the rehearsal');
  console.log('Rehearsal smoke passed: mixed lesson, per-slide room behaviour, sample poll, clean exit.');
} finally {
  await browser.close();
}
