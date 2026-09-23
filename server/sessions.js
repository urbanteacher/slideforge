'use strict';
// Append-only local journal. Report tokens are kept out of static files and exports.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const DIR = path.resolve(
  process.env.SLIDEFORGE_SESSION_DIR ||
  (process.env.SLIDEFORGE_DATA_DIR
    ? path.join(process.env.SLIDEFORGE_DATA_DIR, 'sessions')
    : path.join(__dirname, '..', '.slideforge', 'sessions'))
);
const ID = /^[a-f0-9-]{36}$/;
const digest = token => crypto.createHash('sha256').update(String(token)).digest();
function write(file, value, flags) {
  const fd = fs.openSync(file, flags, 0o600);
  try { fs.writeFileSync(fd, value); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function create(title, mode, teams) {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const id = crypto.randomUUID(), token = crypto.randomBytes(32).toString('hex');
  const meta = { id, title, mode, teams, createdAt: Date.now(), tokenHash: digest(token).toString('hex') };
  write(path.join(DIR, id + '.json'), JSON.stringify(meta), 'wx');
  const session = { meta, events: [], persisted: true, pending: [] };
  if (!append(session, 'created', {})) throw new Error('Cannot write session journal');
  return { session, token };
}
function append(session, type, data) {
  const event = { seq: session.events.length + 1, at: Date.now(), type, data };
  session.events.push(event);
  session.pending.push(event);
  try {
    write(path.join(DIR, session.meta.id + '.jsonl'), '\n' + session.pending.map(e => JSON.stringify(e)).join('\n') + '\n', 'a');
    session.pending = [];
    session.persisted = true;
  } catch (err) { session.persisted = false; }
  return session.persisted;
}
function authorized(meta, token) {
  if (!token || typeof token !== 'string' || token.length > 128) return false;
  return crypto.timingSafeEqual(Buffer.from(meta.tokenHash, 'hex'), digest(token));
}
/**
 * Delete a session's journal and its metadata.
 *
 * Behind the same token as reading it. These are attendance records — who
 * was in a room and what they answered — so the ability to destroy one has
 * to be at least as hard to come by as the ability to read it.
 *
 * @returns {'gone'|'missing'|'denied'}
 */
function remove(id, token) {
  if (!ID.test(id)) return 'missing';
  let meta;
  try { meta = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')); }
  catch (_) { return 'missing'; }
  if (!authorized(meta, token)) return 'denied';
  /* The journal first: a meta file without one is unreadable anyway, whereas
     a journal without its meta is an orphan nothing can authorise, read or
     clean up. */
  try { fs.unlinkSync(path.join(DIR, id + '.jsonl')); } catch (_) {}
  try { fs.unlinkSync(path.join(DIR, id + '.json')); } catch (_) {}
  return 'gone';
}

function load(id, token) {
  if (!ID.test(id)) return null;
  let meta;
  try { meta = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')); } catch (_) { return null; }
  if (!authorized(meta, token)) return null;
  const raw = fs.readFileSync(path.join(DIR, id + '.jsonl'), 'utf8');
  const events = [], seen = new Set();
  let truncated = false;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { const event = JSON.parse(line); if (!seen.has(event.seq)) {events.push(event);seen.add(event.seq);} }
    catch (_) { truncated = true; }
  }
  return { meta, events, persisted: !truncated };
}
function project(session, active = false) {
  const { meta, events } = session;
  const people = new Map(), checks = [], feedback = [], questions = [], signals = [];
  const oral = new Map();
  let end = null, startedAt = null;
  const person = id => people.get(id);
  for (const e of events) {
    const d = e.data;
    if (e.type === 'join') {
      people.set(d.id, { id: d.id, name: d.name, team: d.team, source:d.source || 'device', firstJoinedAt: e.at, admittedAt: d.admitted ? e.at : null, lastSeenAt: e.at, connected: true, connections: [{ joinedAt: e.at, leftAt: null }], score: 0 });
    } else if (e.type === 'admit' && person(d.id)) person(d.id).admittedAt = e.at;
    else if (e.type === 'leave' && person(d.id)) {
      const p = person(d.id); p.connected = false; p.lastSeenAt = e.at;
      p.connections[p.connections.length - 1].leftAt = e.at;
    } else if (e.type === 'resume' && person(d.id)) {
      const p = person(d.id); p.connected = true; p.lastSeenAt = e.at;
      p.connections.push({ joinedAt: e.at, leftAt: null });
    } else if (e.type === 'rename' && person(d.id)) person(d.id).name = d.name;
    else if (e.type === 'team' && person(d.id) && d.team != null) person(d.id).team = d.team;
    else if ((e.type === 'kick' || e.type === 'remove') && person(d.id)) {
      const p = person(d.id);
      p.connected = false;
      p.removedAt = e.at;
      p.leftReason = e.type === 'kick' ? 'kicked' : 'removed';
      if (p.connections && p.connections.length) p.connections[p.connections.length - 1].leftAt = e.at;
    }
    else if (e.type === 'begin') startedAt = startedAt || e.at;
    else if (e.type === 'question') checks.push({ ...d, openedAt: e.at, revealedAt: null, correct: null, responses: [] });
    /* voteOnly rides along in ...d, so the report can tell a withheld answer
       from a forgotten one. */
    else if (e.type === 'answer') {
      const q = checks.find(q => q.attempt === d.attempt);
      if (q && !q.responses.some(r => r.playerId === d.playerId)) q.responses.push({ ...d, at: e.at, right: null });
      if (person(d.playerId)) person(d.playerId).lastSeenAt = e.at;
    } else if (e.type === 'manualAnswer') {
      const q=checks.find(q => q.attempt === d.attempt);
      if(q && !q.revealedAt) {
        q.responses=q.responses.filter(r => r.playerId !== d.playerId);
        if(!d.clear) q.responses.push({...d,at:e.at,right:null});
      }
      if(person(d.playerId)) person(d.playerId).lastSeenAt=e.at;
    } else if (e.type === 'signal') {
      /* No playerId, by design — see the note on room.signals in the relay.
         What the report is for is which slide lost the room, not who said so. */
      signals.push({ kind: d.kind, slideId: d.slideId, title: d.title, n: d.n, at: e.at });
    } else if (e.type === 'sure') {
      const q = checks.find(q => q.attempt === d.attempt);
      const r = q && q.responses.find(r => r.playerId === d.playerId);
      if (r) r.sure = d.sure;
      if (person(d.playerId)) person(d.playerId).lastSeenAt = e.at;
    } else if (e.type === 'reveal') {
      const q = checks.find(q => q.attempt === d.attempt);
      if (q && !q.revealedAt) {
        q.revealedAt = e.at; q.correct = d.correct; q.explanation = d.explanation;
        if (d.spoken) q.spoken = d.spoken;
        if (d.answer != null) q.answer = d.answer;
        /* Right and wrong come from the host's verdicts. A typed answer has no
           correct index to compare against, so re-deriving it here would both
           duplicate the marking rules and get typed questions wrong. Older
           journals carry no marks, so those fall back to the index. */
        const marks = new Map(Array.isArray(d.marks) ? d.marks : []);
        q.responses.forEach(r => {
          r.right = marks.size || d.marks ? marks.get(r.playerId) === true : r.choice === d.correct;
        });
        (d.scores || []).forEach(s => { if (person(s.id)) person(s.id).score = s.score; });
      }
    } else if (e.type === 'prompt') feedback.push({ ...d, openedAt: e.at, responses: [] });
    else if (e.type === 'reply') {
      const f = feedback.find(f => f.attempt === d.attempt);
      if (f) {
        f.responses = f.responses.filter(r => r.playerId !== d.playerId);
        f.responses.push({ playerId: d.playerId, values: d.values, at: e.at });
      }
      if (person(d.playerId)) person(d.playerId).lastSeenAt = e.at;
    } else if (e.type === 'qaAsk') {
      questions.push({ id: d.id, playerId: d.playerId, text: d.text, askedAt: e.at,
        state: 'pending', votes: 0, shown: false, shownAt: null });
      if (person(d.playerId)) person(d.playerId).lastSeenAt = e.at;
    } else if (e.type === 'qaModerate') {
      const q = questions.find(q => q.id === d.id);
      if (q) q.state = d.state;
    } else if (e.type === 'qaVote') {
      const q = questions.find(q => q.id === d.id);
      if (q) q.votes = d.votes;
    } else if (e.type === 'qaPin') {
      /* Only records that it was shown, not that it stopped being shown: what
         a teacher wants afterwards is whether the room's question was taken
         to the front, not how long it stayed there. */
      if (d.id != null) {
        const q = questions.find(q => q.id === d.id);
        if (q && !q.shown) { q.shown = true; q.shownAt = e.at; }
      }
    } else if (e.type === 'oral') {
      /* A board round, keyed by the slide and the set it was played on, so
         replaying the same board twice reads as two rounds. The verdicts are
         the record; the tally is derived from them, never sent. */
      const key = (d.slideId || 'unknown') + '#' + (d.set || 1);
      const round = oral.get(key) || (oral.set(key, {
        slideId: d.slideId, title: d.title, kind: d.kind, set: d.set || 1,
        verdicts: [], firstAt: e.at, lastAt: e.at
      }).get(key));
      round.verdicts.push({ card: d.card, term: d.term, participant: d.participant,
        right: d.right === true, value: Number(d.value) || 0, at: e.at });
      round.lastAt = e.at;
    } else if (e.type === 'end') end = { at: e.at, reason: d.reason };
  }
  const updatedAt = events.length ? events[events.length - 1].at : meta.createdAt;
  const status = end ? 'ended' : active ? 'live' : 'interrupted';
  const roster = [...people.values()].map(p => {
    const eligible = checks.filter(q => q.eligible.includes(p.id));
    const answers = eligible.flatMap(q => q.responses.filter(r => r.playerId === p.id));
    const cutoff = end ? end.at : active ? Date.now() : updatedAt;
    return { ...p, connected: p.source !== 'teacher' && active && p.connected,
      lastSeenAt: p.connected ? cutoff : p.lastSeenAt,
      connections: p.source === 'teacher' ? [] : p.connections.map(c => ({...c, leftAt:c.leftAt || (active ? null : cutoff)})),
      connectedSeconds: p.source === 'teacher' ? 0 : Math.round(p.connections.reduce((n, c) => n + Math.max(0, (c.leftAt || cutoff) - c.joinedAt), 0) / 1000),
      questionsEligible: eligible.length, questionsAnswered: answers.length,
      questionsCorrect: answers.filter(r => r.right === true).length,
      questionsUnanswered: eligible.length - answers.length,
      /* Sure and wrong. The one worth a teacher's attention: a wrong answer
         given confidently is a misconception, and a wrong answer given as a
         guess is a gap. They need different lessons. */
      confidentlyWrong: answers.filter(r => r.sure === true && r.right === false).length,
      unsureButRight: answers.filter(r => r.sure === false && r.right === true).length,
      feedbackContributions: feedback.reduce((n, f) => n + f.responses.filter(r => r.playerId === p.id).reduce((sum, r) => sum + r.values.length, 0), 0),
      questionsAsked: questions.filter(q => q.playerId === p.id && q.state !== 'dismissed').length
    };
  });
  return { schemaVersion: 1, id: meta.id, title: meta.title, mode: meta.mode, teams: meta.teams,
    createdAt: meta.createdAt, startedAt, endedAt: end && end.at, updatedAt,
    status, reason: end ? end.reason : status === 'interrupted' ? 'Relay stopped before the session ended.' : null,
    persisted: session.persisted, attendance: roster, checks, feedback,
    /* Oral rounds sit beside the checks rather than inside them: they are
       credited to a team or to the class, so they have no place in a grid
       whose rows are people. */
    oral: [...oral.values()].map(r => {
      const tally = new Map();
      /* A verdict with no name on it is either a board the whole class played
         together, or a quiz bowl cell nobody could answer. Only the first is a
         participant: crediting the second to "The class" put a phantom team on
         a four-team board, sitting at zero. */
      const anonymous = r.verdicts.every(v => !v.participant);
      r.verdicts.forEach(v => {
        if (!v.participant && !anonymous) return;
        const name = v.participant || 'The class';
        const row = tally.get(name) || (tally.set(name, { name, score: 0, attempts: 0, points: 0 }).get(name));
        row.attempts++;
        if (v.right) { row.score++; row.points += Number(v.value) || 0; }
      });
      /* Keyed by who as well as which square. On a shared memory board only
         one participant can ever claim a given card, so this is the same
         count as before — but a bingo card belongs to one team, and counting
         square numbers alone folded Red's first square into Blue's. */
      const cards = new Set(r.verdicts.filter(v => v.right)
        .map(v => (v.participant || '') + '#' + v.card));
      /* Points only where a board has them: a bingo line is not worth a
         number and printing a zero beside it would imply it should be. */
      const points = r.verdicts.reduce((n, v) => n + (Number(v.value) || 0), 0);
      return { ...r, attempts: r.verdicts.length, collected: cards.size,
        points, tally: [...tally.values()] };
    }).sort((a, b) => a.firstAt - b.firstAt),
    /* Grouped by the slide they were sent from, so the report answers "where
       did I lose them" rather than handing over a list of timestamps. */
    signals: Object.values(signals.reduce((acc, s) => {
      const key = s.slideId || 'unknown';
      const row = acc[key] || (acc[key] = {
        slideId: s.slideId, title: s.title, n: s.n,
        lost: 0, fast: 0, slow: 0, total: 0, firstAt: s.at, lastAt: s.at
      });
      if (row[s.kind] != null) row[s.kind]++;
      row.total++;
      row.lastAt = s.at;
      return acc;
    }, {})).sort((a, b) => b.total - a.total || a.firstAt - b.firstAt),
    questions: questions.map(q => {
      const who = people.get(q.playerId);
      return { ...q, name: who ? who.name : null };
    }),
    summary: { joined: roster.length, admitted: roster.filter(p => p.admittedAt != null).length,
      checks: checks.length, revealed: checks.filter(q => q.revealedAt).length,
      answers: checks.reduce((n, q) => n + q.responses.length, 0), feedbackActivities: feedback.length,
      questionsAsked: questions.filter(q => q.state !== 'dismissed').length,
      questionsShown: questions.filter(q => q.shown).length,
      questionsUnanswered: questions.filter(q => q.state === 'approved' || q.state === 'pending').length,
      signalsRaised: signals.length,
      oralRounds: oral.size,
      oralVerdicts: [...oral.values()].reduce((n, r) => n + r.verdicts.length, 0),
      confidentlyWrong: roster.reduce((n, p) => n + p.confidentlyWrong, 0) }
  };
}
module.exports = { DIR, create, append, authorized, load, remove, project };
