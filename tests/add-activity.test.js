'use strict';
/* Canvas ＋ Add activity, Engagement, and the rail must open one catalogue —
   not three different doors for games vs polls. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const editor = fs.readFileSync(path.join(ROOT, 'js', 'editor.js'), 'utf8');
const studio = fs.readFileSync(path.join(ROOT, 'js', 'studio.js'), 'utf8');
/* The rail's own door moved with the rail — src/editor/rail.js. The shared
   opener it calls, openActivityLibrary, is still the editor's. */
const rail = fs.readFileSync(path.join(ROOT, 'src', 'editor', 'rail.js'), 'utf8');

test('canvas Add activity, Engagement and the rail share the activity library', () => {
  assert.match(html, /id="btnActivities"[^>]*>＋ Add activity/,
    'the canvas button is no longer the add-activity door');
  assert.match(studio, /btnActivities\.onclick = function \(\) \{ openLibrary\('all'\); \}/,
    'the canvas button is not opening the full catalogue');
  assert.match(editor, /function openActivityLibrary\(\)/,
    'the editor has no shared opener for Engagement and the rail');
  assert.match(editor, /SF\.Studio\.openLibrary\('all'\)/,
    'Engagement / the rail are not calling the same library as the canvas');
  assert.match(editor, /id = 'inspAddActivity'/,
    'Engagement does not offer ＋ Add activity');
  /* The rail's door is the first card of its + Slide starters (UX-23). */
  assert.doesNotMatch(rail, /'\+ Activity'/, 'the rail carries a second button for the same catalogue');
  assert.match(studio, /act\.id = 'starterActivity'/, 'the starters do not offer games and activities');
  assert.match(studio, /act\.onclick = function \(\) \{\s*if \(modal\) modal\.close\(\);\s*openLibrary\('all'\);/,
    'the starters card is not opening the full catalogue');
});

test('the activity library has filters beyond check vs feedback', () => {
  assert.match(studio, /\['quiz', 'Quick quizzes'\]/);
  assert.match(studio, /\['game', 'Games'\]/);
  assert.match(studio, /\['memory', 'Memory'\]/);
  assert.match(studio, /\['word', 'Word'\]/);
  assert.match(studio, /\['talk', 'Discuss'\]/);
  const ids = [...studio.matchAll(
    /\['([a-z0-9-]+)','[^']+','[^']+','[^']+','(?:check|feedback)'/g
  )].map((m) => m[1]);
  assert.ok(ids.length >= 30, 'catalogue ids were not found');
  ids.forEach((id) => {
    assert.match(studio, new RegExp("'" + id + "': \\["), id + ' has no filter group');
  });
});

test('Activities studio can filter by type as well as phase', () => {
  const plan = fs.readFileSync(path.join(ROOT, 'js', 'activities.js'), 'utf8');
  assert.match(plan, /kindFilter/);
  assert.match(plan, /All types/);
  assert.match(plan, /In the room/);
  assert.match(plan, /Slide runs/);
});

test('Activities studio edits slides in place, not via Lesson studio', () => {
  const plan = fs.readFileSync(path.join(ROOT, 'js', 'activities.js'), 'utf8');
  assert.doesNotMatch(plan, /Edit this slide/);
  assert.match(plan, /Edit questions and answers/);
  assert.match(plan, /SF\.Shell\.activate\('game'\)/);
  assert.match(plan, /paintSlidePreview|is-slide-preview/);
  assert.match(plan, /design-panes/);
  const deckJumps = [...plan.matchAll(/SF\.Shell\.activate\('deck'\)/g)];
  assert.equal(deckJumps.length, 1, 'Lesson studio jump must be only Open in Lesson studio');
  assert.match(plan, /btnPlanToDeck[\s\S]{0,200}selectSlide[\s\S]{0,120}activate\('deck'\)/);
});

test('Library rows report checks and activities', () => {
  assert.match(studio, /LessonBank\.deckFacts/);
  assert.match(studio, /LessonBank\.folderChip/);
});
