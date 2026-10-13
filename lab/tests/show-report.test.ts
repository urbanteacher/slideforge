// The class report (lab-engine-plan M11b): the relay's session record as the screen's model, the CSVs, and the read of
// /api/sessions/<id> with the host's token. Fast, no browser, no relay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answersCsv, attendanceCsv, csvCell, fetchReport, FREE_PLAN_NOTE, reportView, sessionUrl, type SessionReport } from '../src/show/classReport';

const report: SessionReport = {
  id: 'abc-123', title: 'Air', status: 'ended', mode: 'teams', teams: ['Owls', 'Foxes'], persisted: true,
  attendance: [
    { id: 1, name: 'Ada', team: 0, connectedSeconds: 600, questionsEligible: 2, questionsAnswered: 2, questionsCorrect: 2 },
    { id: 2, name: '=Alan', team: 1, connectedSeconds: 120, questionsEligible: 2, questionsAnswered: 1, questionsCorrect: 0 },
    { id: 3, name: 'Gone', team: 1, removedAt: 5, questionsEligible: 2, questionsAnswered: 0 },
    { id: 4, name: 'Quiet', team: 0, source: 'teacher', questionsEligible: 2, questionsAnswered: 0, questionsCorrect: 0 },
  ],
  checks: [
    { question: 'Most of the air?', options: ['Nitrogen', 'Oxygen'], input: 'choice', correct: 0, eligible: [1, 2, 3, 4], responses: [{ playerId: 1, choice: 0, right: true, sure: true, elapsedMs: 3100 }, { playerId: 2, choice: 1, right: false, sure: false, elapsedMs: 5000 }, { playerId: 3, choice: 0, right: true }] },
    { question: 'Name a noble gas', input: 'text', eligible: [1, 2, 4], responses: [{ playerId: 1, text: 'Argon', right: true }] },
  ],
};

test('the report view: accuracy per question, who answered what, attendance; removed people are left out', () => {
  const v = reportView(report, { 1: 1800, 2: 400 });
  assert.equal(v.players, 3);
  assert.deepEqual(v.questions.map((q) => [q.eligible, q.answered, q.right, q.accuracy]), [[3, 2, 1, 50], [3, 1, 1, 100]]);
  assert.equal(v.questions[0].correct, 'Nitrogen');
  assert.deepEqual(v.questions[0].answers.map((a) => [a.name, a.team, a.answer, a.outcome, a.sure]), [['Ada', 'Owls', 'Nitrogen', 'correct', 'sure'], ['=Alan', 'Foxes', 'Oxygen', 'incorrect', 'guess'], ['Quiet', 'Owls', '', 'unanswered', '']]);
  assert.equal(v.questions[1].answers[0].answer, 'Argon');
  assert.equal(v.accuracy, 67);
  assert.deepEqual(v.attendance, { joined: 3, answeredAny: 2, neverAnswered: 1 });
  assert.deepEqual(v.people.map((p) => [p.name, p.points]), [['Ada', 1800], ['=Alan', 400], ['Quiet', null]]);
});

test('an unmarked question has no accuracy', () => {
  const v = reportView({ ...report, checks: [{ question: 'Vote', options: ['a'], input: 'choice', eligible: [1], responses: [{ playerId: 1, choice: 0, right: null }] }] });
  assert.equal(v.questions[0].accuracy, null);
  assert.equal(v.accuracy, null);
  assert.equal(v.questions[0].answers[0].outcome, 'unscored');
});

test('the CSVs: one row per answer and per person; a name that looks like a formula is made harmless; a UTF-8 mark leads', () => {
  const a = answersCsv(report).split('\r\n');
  assert.ok(a[0].startsWith('﻿"Session ID","Question number"'));
  assert.equal(a.length, 1 + 3 + 3);
  assert.ok(a.some((l) => l.includes(`"'=Alan"`)));
  assert.ok(a.includes('"abc-123","1","Most of the air?","Ada","Owls","Nitrogen","sure","correct","3100"'));
  const p = attendanceCsv(report).split('\r\n');
  assert.equal(p.length, 1 + 3);
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(-3), '"-3"');
});

test('the session is read from the relay with the host\'s token; a missing or gone session is said in words', async () => {
  assert.equal(sessionUrl('wss://relay.test/', 'a b'), 'https://relay.test/api/sessions/a%20b');
  assert.equal(sessionUrl('ws://localhost:8787', 'x'), 'http://localhost:8787/api/sessions/x');
  let seen: { url: string; auth: string } | null = null;
  const ok = (async (url: string, init: RequestInit) => { seen = { url, auth: String((init.headers as Record<string, string>).Authorization) }; return new Response(JSON.stringify({ ...report, attendance: undefined })); }) as unknown as typeof fetch;
  const r = await fetchReport('wss://relay.test', { id: 'abc', token: 'tok' }, ok);
  assert.deepEqual(seen, { url: 'https://relay.test/api/sessions/abc', auth: 'Bearer tok' });
  assert.deepEqual(r.attendance, []);
  const gone = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
  await assert.rejects(fetchReport('wss://r', { id: 'a', token: 't' }, gone), /no longer has this session/);
  await assert.rejects(fetchReport('wss://r', { id: 'a' }, ok), /no access key/);
  const down = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
  await assert.rejects(fetchReport('wss://r', { id: 'a', token: 't' }, down), /did not answer/);
  assert.match(FREE_PLAN_NOTE, /until the next deploy or restart/);
});
