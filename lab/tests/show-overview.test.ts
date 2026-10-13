// The show's overview marks where the games are: a badge on each game, question, activity and feedback slide, named from the room's
// style registry, the game's own label (a board), SlideForge's activity catalogue and the feedback kind. A plain slide has none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Slide } from '../src/core';
import { slideBadge } from '../src/show/badge';

const game = (format: string, label: string, role = 'question') => ({ game: { id: 'g', format, label, role, settings: {} } }) as unknown as Pick<Slide, 'game' | 'feedback' | 'activity'>;

test('quiz questions read "Quiz · <style>", games their style, boards their label', () => {
  assert.deepEqual(slideBadge(game('choice', 'Quiz')), { label: 'Quiz · Multiple choice', kind: 'quiz' });
  assert.equal(slideBadge(game('truefalse', 'Quiz'))?.label, 'Quiz · True or false');
  assert.equal(slideBadge(game('slider', 'Quiz'))?.label, 'Quiz · Slider');
  assert.deepEqual(slideBadge(game('horse-race', 'Horse race', 'cover')), { label: 'Horse race', kind: 'game' });
  assert.equal(slideBadge(game('true-false', 'x'))?.label, 'True / false showdown');
  assert.equal(slideBadge(game('low-stakes-quiz', 'Low-stakes quiz', 'board'))?.label, 'Low-stakes quiz');
  assert.equal(slideBadge(game('mind-reveal', ''))?.label, 'mind-reveal');
});

test('feedback slides read their kind; a plain slide has no badge', () => {
  assert.deepEqual(slideBadge({ feedback: { kind: 'poll' } }), { label: 'Poll', kind: 'feedback' });
  assert.equal(slideBadge({ feedback: { kind: 'wordcloud' } })?.label, 'Word cloud');
  assert.equal(slideBadge({ feedback: { kind: 'scale' } })?.label, 'Scale');
  assert.equal(slideBadge({}), null);
});

test('activity slides read "Activity · <its catalogue title>"', () => {
  assert.deepEqual(slideBadge({ activity: { key: 'think-pair-share', page: 0 } }), { label: 'Activity · Think-Pair-Share', kind: 'activity' });
  assert.equal(slideBadge({ activity: { key: 'no-such-activity', page: 1 } })?.label, 'Activity · no-such-activity');
});
