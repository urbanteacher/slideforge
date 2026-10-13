// The class report of a finished room, in the studio (lab-engine-plan M11b). The relay journals every room and projects it
// (server/sessions.js `project`); this reads `GET /api/sessions/<id>` with the token the host was handed and turns it into
// what the report screen draws: who answered what on each question, attendance, accuracy, and two CSVs. Pure apart from
// `fetchReport`, which takes the fetch to use. The projection is the relay's; nothing here recomputes scores.

import type { SessionRef } from './hooks';

/** On the free plan the relay keeps its journals on a disk that is wiped at each deploy and restart. */
export const FREE_PLAN_NOTE = 'On the free plan, reports last only until the next deploy or restart of the room server. Download the CSV now to keep a copy.';

/** The parts of the relay's projected report the screen reads (docs/games/protocol.md §12). */
export interface ReportPerson {
  id: number; name: string; team?: number | null; source?: string; removedAt?: number | null;
  firstJoinedAt?: number; connectedSeconds?: number; admittedAt?: number | null; lastSeenAt?: number;
  questionsEligible?: number; questionsAnswered?: number; questionsCorrect?: number; questionsUnanswered?: number; feedbackContributions?: number;
}
export interface ReportResponse { playerId: number; choice?: number; text?: string; value?: number; order?: number[]; right?: boolean | null; sure?: boolean | null; elapsedMs?: number }
export interface ReportCheck { attempt?: string; id?: string; question: string; options?: string[]; input?: string; eligible: number[]; responses: ReportResponse[]; correct?: number | null; style?: string }
export interface SessionReport {
  id: string; title: string; status: string; mode?: string; teams?: string[]; persisted?: boolean;
  createdAt?: number; startedAt?: number; endedAt?: number; reason?: string | null;
  attendance: ReportPerson[]; checks: ReportCheck[];
}

/** Where the relay's sessions are, from the room's socket address (`wss://host` becomes `https://host`). */
export function sessionUrl(relay: string, id: string): string {
  return relay.replace(/^ws(s?):/, 'http$1:').replace(/\/+$/, '') + '/api/sessions/' + encodeURIComponent(id);
}

/** Read the report. Rejects with words a teacher can use. */
export async function fetchReport(relay: string, session: Pick<SessionRef, 'id' | 'token'>, doFetch: typeof fetch = fetch): Promise<SessionReport> {
  if (!session.token) throw new Error('The room server gave no access key for this session, so its report cannot be read.');
  let res: Response;
  try { res = await doFetch(sessionUrl(relay, session.id), { headers: { Authorization: 'Bearer ' + session.token }, cache: 'no-store' }); }
  catch { throw new Error('The room server did not answer.'); }
  if (!res.ok) throw new Error(res.status === 404 ? 'The room server no longer has this session (it has restarted or been redeployed since).' : 'The room server could not load the session.');
  const r = await res.json() as SessionReport;
  return { ...r, attendance: Array.isArray(r.attendance) ? r.attendance : [], checks: Array.isArray(r.checks) ? r.checks : [] };
}

export interface ReportAnswer { name: string; team: string; answer: string; outcome: 'correct' | 'incorrect' | 'unscored' | 'unanswered'; sure: string; ms: number | null }
export interface ReportQuestion {
  n: number; question: string;
  /** The right answer, in words, when the question has one. */
  correct: string;
  eligible: number; answered: number; right: number;
  /** Right answers as a share of those who answered, 0 to 100; null when nobody answered or the question was not marked. */
  accuracy: number | null;
  answers: ReportAnswer[];
}
export interface ReportPersonRow { id: number; name: string; team: string; answered: number; eligible: number; correct: number; points: number | null; connectedSeconds: number; source: string }
export interface ReportView {
  id: string; title: string; status: string; teams: string[]; persisted: boolean;
  players: number; questions: ReportQuestion[]; people: ReportPersonRow[];
  /** Right answers over answers given, across every question; null when none were marked. */
  accuracy: number | null;
  attendance: { joined: number; answeredAny: number; neverAnswered: number };
}

/** An answer as the report writes it (js/reports.js responseText). */
export function responseText(q: Pick<ReportCheck, 'input' | 'options'>, a: ReportResponse | undefined): string {
  if (!a) return '';
  if (q.input === 'text') return String(a.text ?? '');
  if (q.input === 'number') return a.value == null ? '' : String(a.value);
  if (q.input === 'order') return (Array.isArray(a.order) ? a.order : []).map((i) => (q.options ?? [])[i]).filter(Boolean).join(' > ');
  return (q.options ?? [])[a.choice ?? -1] ?? '';
}

const sureText = (a: ReportResponse | undefined) => (!a || a.sure == null ? '' : a.sure ? 'sure' : 'guess');
const outcomeOf = (a: ReportResponse | undefined): ReportAnswer['outcome'] => (!a ? 'unanswered' : a.right == null ? 'unscored' : a.right ? 'correct' : 'incorrect');
const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : null);

/** The screen's model. `points` are the room's scores by player id, when the show still has them (the report holds none). */
export function reportView(r: SessionReport, points: Record<number, number> = {}): ReportView {
  const keep = r.attendance.filter((p) => !p.removedAt);
  const ids = new Set(keep.map((p) => p.id));
  const byId = new Map(keep.map((p) => [p.id, p]));
  const teamOf = (p: ReportPerson | undefined) => (p && p.team != null && r.teams ? r.teams[p.team] ?? '' : '');
  const questions = r.checks.map((q, i): ReportQuestion => {
    const eligible = q.eligible.filter((id) => ids.has(id));
    const answers: ReportAnswer[] = eligible.map((id) => {
      const a = q.responses.find((x) => x.playerId === id);
      const p = byId.get(id);
      return { name: p?.name ?? '', team: teamOf(p), answer: responseText(q, a), outcome: outcomeOf(a), sure: sureText(a), ms: a?.elapsedMs ?? null };
    });
    const given = answers.filter((a) => a.outcome !== 'unanswered');
    const marked = given.filter((a) => a.outcome !== 'unscored');
    const right = given.filter((a) => a.outcome === 'correct').length;
    return {
      n: i + 1, question: q.question, correct: q.correct != null && q.correct >= 0 ? (q.options ?? [])[q.correct] ?? '' : '',
      eligible: eligible.length, answered: given.length, right, accuracy: pct(right, marked.length), answers,
    };
  });
  const people = keep.map((p): ReportPersonRow => ({
    id: p.id, name: p.name, team: teamOf(p), answered: p.questionsAnswered ?? 0, eligible: p.questionsEligible ?? 0, correct: p.questionsCorrect ?? 0,
    points: points[p.id] ?? null, connectedSeconds: p.connectedSeconds ?? 0, source: p.source === 'teacher' ? 'teacher' : 'device',
  })).sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || b.correct - a.correct || a.name.localeCompare(b.name));
  const given = questions.reduce((n, q) => n + q.answers.filter((a) => a.outcome === 'correct' || a.outcome === 'incorrect').length, 0);
  const right = questions.reduce((n, q) => n + q.right, 0);
  const answeredAny = people.filter((p) => p.answered > 0).length;
  return {
    id: r.id, title: r.title, status: r.status, teams: r.teams ?? [], persisted: r.persisted !== false,
    players: people.length, questions, people, accuracy: pct(right, given),
    attendance: { joined: people.length, answeredAny, neverAnswered: people.length - answeredAny },
  };
}

/** A CSV cell: quoted, and a leading = + - @ made harmless, as classic's export does (a name typed by a phone must not run as a formula). */
export function csvCell(v: unknown): string {
  const s = String(v ?? '');
  const safe = typeof v !== 'number' && /^[\s]*[=+@-]|^[\t\r\n]/.test(s) ? "'" + s : s;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export const csv = (rows: unknown[][]): string => '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

/** One row per question per learner: what they answered, and whether it was right. */
export function answersCsv(r: SessionReport, v: ReportView = reportView(r)): string {
  const rows: unknown[][] = [['Session ID', 'Question number', 'Question', 'Name', 'Team', 'Answer', 'How sure', 'Outcome', 'Elapsed ms']];
  for (const q of v.questions) for (const a of q.answers) rows.push([r.id, q.n, q.question, a.name, a.team, a.answer, a.sure, a.outcome, a.ms ?? '']);
  return csv(rows);
}

/** One row per learner: who was there, and how they did. */
export function attendanceCsv(r: SessionReport, v: ReportView = reportView(r)): string {
  const rows: unknown[][] = [['Session ID', 'Name', 'Team', 'Connected seconds', 'Questions', 'Answered', 'Correct', 'Points', 'Entry source']];
  for (const p of v.people) rows.push([r.id, p.name, p.team, p.connectedSeconds, p.eligible, p.answered, p.correct, p.points ?? '', p.source]);
  return csv(rows);
}
