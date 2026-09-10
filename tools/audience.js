#!/usr/bin/env node
'use strict';
/* A simulated class, for when you have a relay and a projector but not
   twenty phones.
 *
 * Joins N students to a live PIN and has them behave like a room: they answer
 * questions (most of them correctly), say how sure they were, reply to polls
 * and word clouds, ask questions, upvote each other, and tell you when they
 * are lost or you are going too fast. Everything goes through the same
 * WebSocket protocol a real phone uses, so what you see on the wall is what
 * you would see on the day.
 *
 *   node tools/audience.js 123456              # six students
 *   node tools/audience.js 123456 --n 20       # twenty
 *   node tools/audience.js 123456 --port 8788  # a relay on another port
 *   node tools/audience.js 123456 --quiet      # no per-event log
 *   node tools/audience.js 123456 --typed Paris
 *   node tools/audience.js 123456 --near 206
 *
 * --typed is for type-answer questions. The relay never tells a phone what
 * the answer is, so a simulated student cannot know it either — give it here
 * and most of the room will type it, with the case, punctuation and spelling
 * variation a real room produces. Leave it out and they all type something
 * wrong, which still exercises the path but makes a dull screen.
 *
 * --near does the same job for a slider question: it is where the class's
 * estimates gather. Without it they gather on the middle of the line.
 */

const NAMES = [
  'Ada', 'Bo', 'Cy', 'Dara', 'Eli', 'Fen', 'Gio', 'Hana', 'Ivo', 'Jae',
  'Kit', 'Lena', 'Moe', 'Nia', 'Omar', 'Pia', 'Quinn', 'Rae', 'Sol', 'Tam'
];

const QUESTIONS = [
  'Could we go over that last example again?',
  'Will this be on the exam?',
  'Is there a reading that covers this in more depth?',
  'How does this connect to what we did last week?',
  'What happens if the assumption does not hold?',
  'Can we see a worked answer for the tricky one?'
];

const WORDS = ['useful', 'tricky', 'clear', 'fast', 'dense', 'daunting', 'fair', 'interesting'];

/* Plausible-looking wrong answers, for the students who do not know it. */
const GUESSES = ['not sure', 'the other one', 'osmosis', 'Lyon', 'about half', '1945', 'gravity'];

const IDEAS = [
  'More worked examples in the seminars',
  'A past paper walkthrough before the deadline',
  'Share the slides the night before',
  'Shorter reading list, more depth on each',
  'Recap the previous week at the start'
];

const args = process.argv.slice(2);
const pin = (args.find((a) => /^\d{4,6}$/.test(a)) || '').trim();
const flag = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const count = Math.max(1, Math.min(NAMES.length, Number(flag('n', 6))));
const typedAnswer = flag('typed', '');
const nearValue = args.indexOf('--near') >= 0 ? Number(flag('near', '')) : null;
const port = Number(flag('port', 8787));
const quiet = args.includes('--quiet');

if (!pin) {
  console.error('Usage: node tools/audience.js <pin> [--n 6] [--port 8787] [--typed ANSWER] [--near VALUE] [--quiet]');
  console.error('The PIN is on the host screen after you press "Host live".');
  process.exit(1);
}

const say = (...a) => { if (!quiet) console.log(...a); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* Humans do not all tap at once. */
const jitter = (base) => base + Math.random() * base;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

class Student {
  constructor(name, i) {
    this.name = name;
    this.i = i;
    this.asked = 0;
    this.askedSure = false;
    this.seen = new Set();
    /* Most of the room knows the answer; a few reliably do not. */
    this.ability = i % 5 === 0 ? 0.35 : 0.85;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://127.0.0.1:' + port);
      this.ws.addEventListener('open', () => {
        this.send({ t: 'join', pin, name: this.name });
        resolve();
      });
      this.ws.addEventListener('error', reject);
      this.ws.addEventListener('message', (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        this.handle(m);
      });
      this.ws.addEventListener('close', () => { this.closed = true; });
    });
  }

  send(m) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
  }

  handle(m) {
    if (m.t === 'error') {
      /* In team mode the relay refuses a join with no team and hands the team
         list back with the refusal — that is the cue to pick one, not a
         failure. Students are spread round-robin so the teams end up even. */
      if (m.mode === 'teams' && Array.isArray(m.teams) && m.teams.length) {
        const team = this.i % m.teams.length;
        this.send({ t: 'join', pin, name: this.name, team });
        return;
      }
      say('  ✗ ' + this.name + ': ' + m.message);
      return;
    }
    if (m.t === 'joined') {
      this.team = m.teamName || null;
      say('  → ' + this.name + ' joined' + (this.team ? ' [' + this.team + ']' : ''));
      return;
    }
    if (m.t === 'waiting') { say('  … ' + this.name + ' waiting for the next round'); return; }
    if (m.t === 'room' && m.mode === 'teams') return;
    if (m.t === 'question') this.answer(m);
    if (m.t === 'locked' && this.askedSure) this.saySure();
    if (m.t === 'prompt') this.reply(m);
    if (m.t === 'qaList') this.vote(m);
    if (m.t === 'asked') say('  ? ' + this.name + ' asked a question');
  }

  /* Says how sure it was, a beat after answering — the same order a phone
     does it in, and honestly: the ones who know it say they are sure. */
  async saySure() {
    this.askedSure = false;
    await wait(jitter(500));
    /* Some of the room is confidently wrong, which is the whole reason the
       number is worth collecting. */
    const sure = Math.random() < (this.ability > 0.5 ? 0.8 : 0.45);
    this.send({ t: 'sure', sure });
    say('  ' + (sure ? '!' : '?') + ' ' + this.name + (sure ? ' was sure' : ' was guessing'));
  }

  /* A slow trickle of pace signals from the students who are struggling. A
     real room does not all raise a hand at once, and the ones who are lost
     are the ones who say so. */
  async maybeSignal() {
    if (Math.random() > (this.ability > 0.5 ? 0.12 : 0.5)) return;
    const kind = pick(this.ability > 0.5 ? ['fast', 'slow'] : ['lost', 'lost', 'fast']);
    this.send({ t: 'signal', kind });
    say('  ✋ ' + this.name + ' signalled "' + kind + '"');
  }

  async answer(m) {
    this.askedSure = m.confidence === true;
    await wait(jitter(700));
    if (m.input === 'text') { this.answerTyped(); return; }
    if (m.input === 'number') { this.answerPlaced(m); return; }
    const n = m.count || 4;
    /* The relay tells the phone how many options there are, not which is
       right — so a simulated student has to guess like a real one. It knows
       the answer with probability `ability`, otherwise picks at random. */
    const choice = Math.random() < this.ability ? 0 : Math.floor(Math.random() * n);
    this.send({ t: 'answer', choice });
    say('  ✎ ' + this.name + ' answered ' + 'ABCDEF'[choice]);
  }

  /* Typed answers with the variation a real room produces: a lowercase one, a
     leading "the", one wrong letter. All of them should be marked right — if
     any of them is not, the marking rules are too strict for a classroom. */
  answerTyped() {
    let text;
    if (typedAnswer && Math.random() < this.ability) {
      const forms = [
        typedAnswer,
        typedAnswer.toLowerCase(),
        'the ' + typedAnswer.toLowerCase(),
        typedAnswer.toUpperCase(),
        typedAnswer + '.',
        typedAnswer.length > 5
          ? typedAnswer.slice(0, -2) + typedAnswer.slice(-1)   // a dropped letter
          : typedAnswer
      ];
      text = pick(forms);
    } else {
      text = pick(GUESSES);
    }
    this.send({ t: 'answer', text });
    say('  ✎ ' + this.name + ' typed "' + text + '"');
  }

  /* Estimates cluster around a guess and spread out from it. The relay does
     not send the target, so like a real student this only knows the line —
     --near, if given, is where the class's guesses gather. */
  answerPlaced(m) {
    const r = m.range || {};
    const min = Number(r.min) || 0;
    const max = Number(r.max) || 100;
    const step = Math.abs(Number(r.step)) || 1;
    const centre = nearValue == null ? (min + max) / 2 : nearValue;
    /* The ones who know it land close; the rest are somewhere on the line. */
    const spread = (max - min) * (Math.random() < this.ability ? 0.04 : 0.3);
    const raw = centre + (Math.random() * 2 - 1) * spread;
    const value = Math.min(max, Math.max(min, Math.round(raw / step) * step));
    this.send({ t: 'answer', value });
    say('  ✎ ' + this.name + ' placed ' + value);
  }

  async reply(m) {
    await wait(jitter(900));
    if (m.kind === 'poll' || m.kind === 'scale') {
      const n = (m.options || []).length;
      /* A scale leans towards the confident end with a couple of holdouts,
         which is the shape a real class produces — a uniform pick over the
         points would make every distribution look flat. */
      const choice = m.kind === 'scale'
        ? Math.min(n - 1, Math.max(0, Math.round(n * 0.65 + (Math.random() * 2 - 1) * n * 0.35)))
        : Math.floor(Math.random() * n);
      this.send({ t: 'reply', choice });
      say('  ▤ ' + this.name + (m.kind === 'scale'
        ? ' sits at ' + (choice + 1) + ' of ' + n
        : ' voted "' + m.options[choice] + '"'));
    } else if (m.kind === 'wordcloud') {
      const word = pick(WORDS);
      this.send({ t: 'reply', text: word });
      say('  ❋ ' + this.name + ' said "' + word + '"');
    } else {
      const idea = pick(IDEAS);
      this.send({ t: 'reply', text: idea });
      say('  ✎ ' + this.name + ' suggested "' + idea + '"');
    }
  }

  async vote(m) {
    for (const q of m.items || []) {
      if (q.state !== 'approved' || q.asked || q.mine || this.seen.has(q.id)) continue;
      this.seen.add(q.id);
      /* Not everybody upvotes everything. */
      if (Math.random() > 0.55) continue;
      await wait(jitter(600));
      this.send({ t: 'qaVote', id: q.id });
      say('  ▲ ' + this.name + ' upvoted a question');
    }
  }

  async maybeAsk() {
    if (this.asked >= 2) return;
    this.asked++;
    this.send({ t: 'ask', text: pick(QUESTIONS) });
  }
}

(async () => {
  console.log('Joining ' + count + ' students to PIN ' + pin + ' on port ' + port + '…');
  const students = [];
  for (let i = 0; i < count; i++) {
    const s = new Student(NAMES[i], i);
    try { await s.connect(); } catch (e) {
      console.error('Could not reach the relay on port ' + port + '. Is it running?');
      process.exit(1);
    }
    students.push(s);
    await wait(180 + Math.random() * 320);   // a room does not arrive in unison
  }

  console.log('\nAll in. They will now answer whatever you put up.');
  console.log('A few will ask questions — approve them in presenter view.');
  console.log('Ctrl-C to send them home.\n');

  /* A trickle of questions rather than a burst, so the queue fills the way a
     real one does while you are mid-explanation. */
  const asker = setInterval(() => {
    const who = pick(students.filter((s) => !s.closed && s.asked < 2));
    if (who) who.maybeAsk();
  }, 9000);
  setTimeout(() => pick(students).maybeAsk(), 2500);

  /* Pace signals on their own rhythm, mostly from the students who are
     struggling. They expire on the relay's clock, so a long session sees
     them come and go rather than pile up. */
  const signaller = setInterval(() => {
    const who = pick(students.filter((s) => !s.closed));
    if (who) who.maybeSignal();
  }, 11000);
  setTimeout(() => pick(students).maybeSignal(), 6000);

  const bye = () => {
    clearInterval(asker);
    clearInterval(signaller);
    console.log('\nSending them home.');
    students.forEach((s) => { try { s.ws.close(); } catch (e) {} });
    setTimeout(() => process.exit(0), 200);
  };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
})();
