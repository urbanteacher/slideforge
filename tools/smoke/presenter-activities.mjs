/* Isolated browser check of the real presenter bridge and private authoring UI.
 * AI replies are deterministic fixtures; no paid generation or user data is used.
 * The lesson goes straight to SF.Player; the classic editor that used to hold it went with the classic studios. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import harness from '../../tests/harness.js';
const sessionDir = await mkdtemp(path.join(tmpdir(), 'sf-presenter-activities-'));
const port = await harness.freePort();
const server = await harness.start(port, sessionDir);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.waitForFunction(() => window.SF?.LiveActivities && SF.Player && SF.buildRunDeck);
  await page.evaluate(() => {
    const deck = SF.makeDeck('Cells and respiration');
    const first = SF.makeSlide('content'); first.title = 'How do cells release energy?'; first.bullets = ['Respiration releases energy from glucose.'];
    const last = SF.makeSlide('content'); last.title = 'Continue the lesson';
    deck.slides = [first, last];
    SF.Player.start(SF.buildRunDeck(deck, id => SF.GameStore.get(id)), 0, { fullscreen: false });
  });
  const popup = page.waitForEvent('popup');
  await page.evaluate(() => SF.Player.openPresenter());
  const presenter = await popup; presenter.on('pageerror', e => errors.push(e.message));
  await presenter.setViewportSize({ width: 1280, height: 1000 });
  await presenter.locator('[data-panel="activities"]').click();
  await presenter.waitForFunction(() => document.getElementById('activityChoice').options.length === 54);
  await presenter.locator('#activityChoice').selectOption('think-pair-share');
  await presenter.locator('#activityManual').click();
  await presenter.locator('#activityDraft').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => SF.Player.deck.slides.length), 2);
  const content = presenter.locator('#activityFields textarea').nth(1);
  await content.fill('Explain respiration in one sentence.');
  await presenter.locator('#activityPreview').click();
  await presenter.waitForFunction(() => !document.getElementById('activityLaunch').disabled);
  await content.fill('Explain how respiration releases energy.');
  assert.equal(await presenter.locator('#activityLaunch').isDisabled(), true, 'editing invalidates preview approval');
  await presenter.locator('#activityPreview').click();
  await presenter.waitForFunction(() => !document.getElementById('activityLaunch').disabled);
  /* Queue used to splice into the lesson; show is now a spontaneous overlay. */
  await presenter.locator('#activityLaunch').click();
  await page.waitForFunction(() => !!SF.Player.spontaneous);
  assert.equal(await page.evaluate(() => SF.Player.deck.slides.length), 2);
  assert.equal(await page.evaluate(() => SF.Player.idx), 0);
  await presenter.locator('#activityEnd').click();
  await page.waitForFunction(() => !SF.Player.spontaneous);
  await presenter.locator('#activitySave').click();
  await presenter.waitForFunction(() => document.getElementById('activityStatus').textContent.includes('Saved'));
  assert.equal(await page.evaluate(() => SF.Store.list().some(d => d.title === 'Think-Pair-Share')), true);

  await presenter.locator('#activityKind').selectOption('game');
  await presenter.locator('#activityChoice').selectOption('memorymatch');
  await presenter.locator('#activityManual').click();
  await presenter.waitForFunction(() => document.getElementById('activityGuidance').textContent.includes('Study'));
  await presenter.locator('#activityTitle').fill('Cell organelle match');
  await presenter.locator('#activityPreview').click();
  await presenter.waitForFunction(() => !document.getElementById('activityLaunch').disabled);
  await presenter.locator('#activityLaunch').click();
  await page.waitForFunction(() => !!(SF.Player.spontaneous && SF.Player.spontaneous.slides.some(s => s.memoryBoard)));
  assert.equal(await page.evaluate(() => SF.Player.deck.slides.some(s => s.memoryBoard)), false);
  assert.equal(await page.evaluate(() => SF.Player.spontaneous.slides.some(s => s.memoryBoard)), true);
  await presenter.locator('#activityEnd').click();
  await page.waitForFunction(() => !SF.Player.spontaneous && SF.Player.idx === 0);

  // Existing quiz shortcut also drafts privately instead of projecting immediately.
  await page.evaluate(() => {
    SF.AI.generateQuestionsForGame = async game => ({ questions: [Object.assign(SF.makeQuestion(game.style), { question: 'Which organelle releases energy?', options: ['Mitochondrion', 'Nucleus'], correct: 0, explanation: 'Respiration takes place in mitochondria.' })], rejected: 0 });
  });
  const before = await page.evaluate(() => SF.Player.deck.slides.length);
  await presenter.locator('[data-panel="quick"]').click();
  await presenter.locator('#quizTheme').fill('Cell respiration');
  await presenter.locator('#quizWords').fill('glucose, mitochondria');
  await presenter.locator('#quizGenerate').click();
  await presenter.waitForFunction(() => document.getElementById('activityStatus').textContent.includes('AI draft ready'));
  assert.equal(await page.evaluate(() => SF.Player.deck.slides.length), before);
  assert.equal(await presenter.locator('#activitiesPane').isVisible(), true);
  assert.equal(await presenter.locator('#activityKeywords').inputValue(), 'glucose, mitochondria');
  assert.equal(await presenter.locator('#activityChoice').inputValue(), 'choice');
  assert.equal(await presenter.getByLabel('Show how to play before the game').isChecked(), false);
  assert.match(await presenter.locator('#activityStatus').innerText(), /1 question ready, 0 rejected/);
  await presenter.locator('#activityPreview').click();
  await presenter.waitForFunction(() => !document.getElementById('activityLaunch').disabled);
  await presenter.locator('#activityPreviewArea').scrollIntoViewIfNeeded();
  await presenter.screenshot({ path: '/tmp/slideforge-presenter-activities.png' });
  await presenter.locator('#activitySave').click();
  await presenter.waitForFunction(() => document.getElementById('activityStatus').textContent.includes('Saved'));
  assert.equal(await page.evaluate(() => SF.GameStore.list().some(g => g.title === 'Cell respiration')), true);

  // A failed generation leaves the editable draft and running show intact.
  await page.evaluate(() => { SF.AI.generateQuestionsForGame = async () => ({ error: 'AI is unavailable for this test' }); });
  await presenter.locator('#activityTopic').fill('Cells');
  await presenter.locator('#activityAI').click();
  await presenter.waitForFunction(() => document.getElementById('activityStatus').textContent.includes('AI is unavailable'));
  assert.equal(await presenter.locator('#activityTitle').inputValue(), 'Cell respiration');
  assert.equal(await page.evaluate(() => SF.Player.deck.slides.length), before);
  // Real relay connection: launching an impromptu quiz retains the PIN and learner.
  await page.evaluate(() => SF.Live.host(SF.Player.deck));
  await page.waitForFunction(() => !!SF.Live.pin);
  const pin = await page.evaluate(() => SF.Live.pin);
  const learner = await harness.connect(port);
  try {
    learner.send({ t: 'join', pin, name: 'Activity smoke learner' });
    await page.waitForFunction(() => SF.Live.players.length === 1);
    await page.evaluate(() => SF.Live.begin());
    await presenter.locator('#activityKind').selectOption('game');
    await presenter.locator('#activityChoice').selectOption('race');
    await presenter.locator('#activityManual').click();
    await presenter.waitForFunction(() => document.getElementById('activityStatus').textContent.includes('Editable draft ready'));
    // Skip the optional rules slide so the learner receives a scored question immediately.
    await presenter.getByLabel('Show how to play before the game').uncheck();
    await presenter.locator('#activityPreview').click();
    await presenter.waitForFunction(() => !document.getElementById('activityLaunch').disabled);
    await presenter.locator('#activityLaunch').click();
    await page.waitForFunction(() => {
      const s = SF.Player.wallSlide ? SF.Player.wallSlide() : SF.Player.deck.slides[SF.Player.idx];
      return s && s.type === 'quiz';
    });
    await learner.next('question');
    assert.equal(await page.evaluate(() => SF.Live.mechanic), 'race');
    learner.send({ t: 'answer', choice: await page.evaluate(() => SF.Player.wallSlide().correct) });
    await learner.next('locked');
    await page.waitForFunction(() => SF.Live.snapshot.answers.length === 1);
    await page.waitForFunction(() => Date.now() - SF.Live._askedAt > 1600);
    await page.evaluate(() => SF.Player.next());
    await learner.next('result');
    await page.waitForFunction(() => Object.values(SF.Live.pos).some(n => n === 1));

    // A second mini race starts at zero without resetting the learner's lesson score.
    await presenter.locator('#activityManual').click();
    await presenter.waitForFunction(() => document.getElementById('activityStatus').textContent.includes('Editable draft ready'));
    await presenter.getByLabel('Show how to play before the game').uncheck();
    await presenter.locator('#activityPreview').click();
    await presenter.waitForFunction(() => !document.getElementById('activityLaunch').disabled);
    await presenter.locator('#activityLaunch').click();
    await learner.next('question');
    assert.equal(await page.evaluate(() => Object.values(SF.Live.pos).reduce((sum, n) => sum + n, 0)), 0);
    learner.send({ t: 'answer', choice: await page.evaluate(() => SF.Player.wallSlide().correct) });
    await learner.next('locked');
    await page.waitForFunction(() => SF.Live.snapshot.answers.length === 1 && Date.now() - SF.Live._askedAt > 1600);
    await page.evaluate(() => SF.Player.next());
    await learner.next('result');
    await page.waitForFunction(() => SF.Live.players[0].correct === 2 && Object.values(SF.Live.pos).some(n => n === 1));
    assert.equal(await page.evaluate(() => SF.Live.pin), pin);
    assert.equal(await page.evaluate(() => SF.Live.players.length), 1);
    assert.equal(await page.evaluate(() => SF.Live.active), true);
  } finally { await learner.close(); await page.evaluate(() => SF.Live.stop()); }
  await presenter.setViewportSize({ width: 700, height: 900 });
  assert.equal(await presenter.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'narrow presenter does not overflow horizontally');
  assert.deepEqual(errors, []);
  console.log('Presenter activities: catalogue, manual editing, validation, preview, spontaneous show, end, save, AI shortcut, AI failure and live race scoring without reconnecting passed.');
} finally { await browser.close(); await harness.stop(server); await rm(sessionDir, { recursive: true, force: true }); }
