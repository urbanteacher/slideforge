// The lab marks answers with SlideForge's own logic, imported where it lives (@sf → ../src), and marks them as
// classic does: every answer recorded from the classic code (tools/scoring-fixtures.mjs) gets the same verdict
// and the same label here. lab-engine-plan M1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { answerLabel, GAME_STYLES, markResponse } from '@sf/games/registry.js';
import { claimPoints } from '@sf/games/scoring.js';
import { createActivityFields } from '@sf/activities/fields.js';

interface Mark { response: unknown; mark: boolean | 'throws'; label: string }
interface Case { format: string; style: string; question: number; slide: SFQuizSlide; marks: Mark[] }
const fixtures = JSON.parse(readFileSync(resolve(process.cwd(), '..', 'tests/fixtures/scoring/marks.json'), 'utf8')) as {
  cases: Case[]; claims: { accepted: boolean; points: number }[];
};

const attempt = <T>(f: () => T): T | 'throws' => { try { return f(); } catch { return 'throws'; } };

test('the lab reaches every game engine SlideForge has', () => {
  for (const style of new Set(fixtures.cases.map((c) => c.style))) assert.ok(GAME_STYLES[style], `no engine for ${style}`);
});

for (const c of fixtures.cases) {
  test(`${c.format} (${c.style}), question ${c.question + 1}: marked as classic marks it`, () => {
    for (const m of c.marks) {
      const slide = structuredClone(c.slide);
      assert.equal(attempt(() => markResponse(slide, m.response)), m.mark, `mark of ${JSON.stringify(m.response)}`);
      assert.equal(attempt(() => answerLabel(slide, m.response)), m.label, `label of ${JSON.stringify(m.response)}`);
    }
  });
}

test('a claim is a point when accepted, none when not', () => {
  for (const c of fixtures.claims) assert.equal(claimPoints(c.accepted), c.points);
});

test('an activity is written onto a slide and read back, with the keyword halves', () => {
  const fields = createActivityFields({
    parseKeywordLine: (line) => { const [term = '', def = ''] = String(line).split('\t'); return { term, def }; },
    formatKeywordLine: (term, def) => `${term}\t${def}`,
  });
  const slide = { title: '', bullets: ['Term\tWhat it means'] };
  fields.write(slide, 'title', 'Think, pair, share');
  assert.equal(fields.read(slide, 'title'), 'Think, pair, share');
  assert.equal(fields.read(slide, 'bullets.0.def'), 'What it means');
  fields.write(slide, 'bullets.0.term', 'Pair');
  assert.equal(slide.bullets[0], 'Pair\tWhat it means');
});
