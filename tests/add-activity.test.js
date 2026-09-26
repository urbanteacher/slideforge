'use strict';
/* The Library's rows say what a lesson holds. (The classic studios' three
   doors to one activity catalogue went with those studios: the lab's Engage
   tab is the one door now.) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const studio = fs.readFileSync(path.join(ROOT, 'js', 'studio.js'), 'utf8');

test('Library rows report checks and activities', () => {
  assert.match(studio, /LessonBank\.deckFacts/);
  assert.match(studio, /LessonBank\.folderChip/);
});
