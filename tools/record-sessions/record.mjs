#!/usr/bin/env node
/* Record real host-side message logs from the classic live host (M0.2).
 *
 *   node tools/record-sessions/record.mjs             every scenario
 *   node tools/record-sessions/record.mjs choice speed-sprint
 *   node tools/record-sessions/record.mjs --list
 *
 * Test-only. It starts its own relay on a free port through tests/harness.js
 * (never 8787) with a throwaway session directory, opens the classic host
 * (index.html) in Playwright, and wraps WebSocket and BroadcastChannel in the
 * page with tap.js. Nothing on the server is touched (hard rule 5): the relay
 * is the unmodified server/server.js, and the session journal is read at the
 * end through its existing GET /api/sessions/<id> endpoint, with the token
 * the host was handed in `hosted`.
 *
 * The host is driven through the app's own API, as the smokes do:
 * SF.Live.host / begin / stop, SF.Player.next, and the teacher-entry window
 * protocol (manual.html's BroadcastChannel commands). Phones are raw sockets
 * speaking join.html's side (phone.mjs).
 *
 * Each scenario writes tests/fixtures/sessions/<name>.json and the README's
 * table is regenerated from what was actually captured. Nothing in a log is
 * normalised; `ms` is milliseconds since the scenario started. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';
import { Phone } from './phone.mjs';
import { SCENARIOS } from './scenarios.mjs';
import { writeReadme } from './readme.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'tests/fixtures/sessions');
const TAP = path.join(HERE, 'tap.js');
const GRACE_MS = 1700; // js/live.js GRACE_MS is 1500

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Recording {
  constructor(spec) {
    this.spec = spec;
    this.t0 = Date.now();
    this.host = [];
    this.window = [];
    this.otherPages = [];
    this.phones = {};
    this.steps = [];
    this.notes = [];
    this.errors = [];
    this.lastHostAt = Date.now();
    this.lastPost = {};
  }
  ms(at) { return (at || Date.now()) - this.t0; }
  fromPage(e) {
    const { at, ...rest } = e;
    const row = Object.assign({ ms: this.ms(at) }, rest);
    if (e.kind === 'ws' && e.page === 'index.html' && e.where === 'top') {
      delete row.page; delete row.where; delete row.kind;
      this.host.push(row);
      this.lastHostAt = Date.now();
    } else if (e.kind === 'channel') {
      /* Each message once: as posted by its sender, and as heard by the host
         (proof the command arrived). The teacher window hearing the host's
         state is the same message again. */
      if (e.dir === 'post' || e.page === 'index.html') {
        /* The host re-posts its whole teacher-window state after every relay
           frame, mostly unchanged. A post identical to the previous one on
           the same page and channel is kept, at its time, as
           {"$repeat": true} so the count and timing survive at a fraction of
           the size; replace it with the previous post's data to restore it. */
        const k = e.page + '|' + e.dir + '|' + e.channel;
        const body = JSON.stringify(e.data);
        if (this.lastPost[k] === body) row.data = { $repeat: true };
        else this.lastPost[k] = body;
        this.window.push(row);
      }
    } else {
      this.otherPages.push(row);
    }
  }
  phone(name, e) {
    (this.phones[name] = this.phones[name] || []).push(Object.assign({ ms: this.ms() }, e));
  }
  step(what, extra) { this.steps.push(Object.assign({ ms: this.ms(), what }, extra || {})); }
  hosted() {
    const m = this.host.find((r) => r.dir === 'recv' && r.data && r.data.t === 'hosted');
    return m && m.data;
  }
}

async function quiet(rec, quietMs = 700, maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (Date.now() - rec.lastHostAt >= quietMs) return true;
    await sleep(100);
  }
  return false;
}

function hostState(page) {
  return page.evaluate(() => {
    const P = SF.Player, L = SF.Live;
    if (!P.open || !P.deck) return { open: false };
    const s = P.wallSlide ? P.wallSlide() : P.deck.slides[P.idx];
    const spoken = !!s && ['headsup', 'spinexplain', 'connection', 'conceptchain', 'randomchallenge'].indexOf(s.style) >= 0;
    return {
      open: true, idx: P.idx, n: P.deck.slides.length,
      id: s && s.id, type: s && s.type, style: s && s.style, input: s && (s.input || 'choice'),
      gaps: s && s.input === 'fill' ? (s.gapAnswers || []).length : 0,
      options: s && Array.isArray(s.options) ? s.options.length : 0,
      range: s && s.input === 'number' ? { min: s.min, max: s.max, step: s.step } : null,
      spoken, revealed: !!(s && L.revealed[s.id]), sprint: !!L.sprint,
      board: !!(s && SF.Boards && SF.Boards.forSlide(s)),
      action: L.nextAction(), askedAgo: Date.now() - (L._askedAt || 0),
      players: L.players.map((p) => ({ id: p.id, name: p.name, manual: !!p.manual })),
      step: P.step != null ? P.step : null
    };
  });
}

/* manual.html's wire, exactly: {type:'sf-manual-command', action, id, ...}
   posted on BroadcastChannel('sf-manual-<key>'). Sent from the open teacher
   window page, as its own send() would. */
async function manualCommand(rec, manual, action, extra) {
  if (!manual) return;
  rec.step('manual:' + action, extra);
  await manual.page.evaluate(([key, action, extra, n]) => {
    const ch = new BroadcastChannel('sf-manual-' + key);
    ch.postMessage(Object.assign({ type: 'sf-manual-command', action, id: 'rec' + n + '-' + Date.now() }, extra || {}));
    ch.close();
  }, [manual.key, action, extra || {}, ++manual.seq]);
}

function manualPayload(st) {
  switch (st.input) {
    case 'text': return { text: 'Paris' };
    case 'number': {
      const r = st.range || {};
      const min = Number(r.min ?? 0), max = Number(r.max ?? 100);
      return { value: Math.round((min + max) / 2) };
    }
    case 'order': return { order: Array.from({ length: st.options }, (_, k) => st.options - 1 - k) };
    case 'fill': return { fill: Array.from({ length: Math.max(1, st.gaps) }, () => 0) };
    case 'sort': return { sort: Array.from({ length: st.options }, () => 1) };
    default: return { choice: st.options > 1 ? 1 : 0 };
  }
}

async function drive(rec, page, manual, spec) {
  const seen = new Set();
  let lastIdx = -1, same = 0, refusedSent = false, manualSent = false, lastFrames = -1, lastPressFrames = -1;
  for (let step = 0; step < (spec.maxSteps || 90); step++) {
    await quiet(rec, spec.quietMs || 700, spec.settleMax || 8000);
    const st = await hostState(page);
    if (!st.open) { rec.step('player closed'); break; }

    if (st.type === 'quiz' && !st.revealed && !seen.has(st.id)) {
      seen.add(st.id);
      rec.step('question up', { idx: st.idx, id: st.id, style: st.style, input: st.input, spoken: st.spoken, sprint: st.sprint });
      if (spec.onQuestion) await spec.onQuestion(Object.assign({ rec, page, manual, st, n: seen.size }, rec.ctx));
      const learner = st.players.find((p) => p.manual);
      if (manual && learner && !st.spoken && !st.sprint && (!manualSent || spec.manualEvery)) {
        await sleep(300);
        await manualCommand(rec, manual, 'answer', { answer: Object.assign({ id: st.id, playerId: learner.id }, manualPayload(st)) });
        manualSent = true;
        if (!refusedSent) {
          /* And one the relay refuses: a phone's row is not the teacher's to enter. */
          const phoneRow = st.players.find((p) => !p.manual);
          if (phoneRow) {
            await sleep(150);
            await manualCommand(rec, manual, 'answer', { answer: Object.assign({ id: st.id, playerId: phoneRow.id }, manualPayload(st)) });
            refusedSent = true;
          }
        }
      }
      if (st.spoken && manual) {
        const speaker = st.players.find((p) => !p.manual);
        await sleep(400);
        if (speaker) await manualCommand(rec, manual, 'recipient', { recipient: { type: 'player', id: speaker.id } });
        await sleep(300);
        await manualCommand(rec, manual, 'revealWith', { choice: 0 });
      }
      continue;
    }

    if (st.board && !seen.has('board:' + st.id)) {
      seen.add('board:' + st.id);
      await playBoard(rec, page, spec.boardClicks || 24);
      continue;
    }
    /* The last slide may still have stages or builds to walk: keep pressing
       while a press still makes the host say something. */
    if (st.idx === st.n - 1 && st.action === 'advance') {
      if (rec.host.length === lastFrames) { rec.step('end of deck', { idx: st.idx }); break; }
      lastFrames = rec.host.length;
      rec.step('next', { idx: st.idx, action: 'advance (last slide)' });
      await page.evaluate(() => SF.Player.next());
      continue;
    }
    /* Stuck means a press moved nothing: same slide and the host said nothing. */
    if (st.idx === lastIdx && rec.host.length === lastPressFrames) same++; else { same = 0; lastIdx = st.idx; }
    lastPressFrames = rec.host.length;
    if (same >= 6) {
      rec.notes.push('Stuck on slide ' + st.idx + ' (' + (st.style || st.type) + ', next action ' + st.action + '); stopped driving.');
      break;
    }
    if (st.type === 'quiz' && st.spoken && !st.revealed && manual && same === 2) {
      /* Concept Chain refuses Accept without a typed link: say No instead. */
      await manualCommand(rec, manual, 'revealWith', { choice: 1 });
      continue;
    }
    if (st.action !== 'advance' && st.askedAgo < GRACE_MS) await sleep(GRACE_MS - st.askedAgo);
    rec.step('next', { idx: st.idx, action: st.action });
    await page.evaluate(() => SF.Player.next());
  }
}

/* Oral boards (memory, knowledge flip, bingo, quiz bowl, low-stakes) are
   judged on the wall and never reach a phone; the relay hears only the
   host's `oral` verdicts. Play the board the way a teacher clicks it: the
   primary action when there is one (start, reveal, claim), otherwise the
   first open card. */
async function playBoard(rec, page, clicks) {
  rec.step('board: play', { clicks });
  for (let i = 0; i < clicks; i++) {
    const what = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('#player button')].filter((b) => !b.disabled && b.offsetParent);
      const pick = shown.find((b) => /\bprimary\b/.test(b.className)) ||
        shown.find((b) => /card|cell|tile|square/.test(b.className) && !/pass|end|close|reset/i.test(b.textContent));
      if (!pick) return null;
      const label = pick.className + ' | ' + pick.textContent.trim().slice(0, 40);
      pick.click();
      return label;
    });
    if (!what) break;
    rec.step('board: click', { button: what });
    await sleep(350);
  }
}

async function openManual(rec, context, page, base) {
  const url = await page.evaluate(() => SF.Live.teacherWorkspaceUrl());
  const key = url.split('#')[1];
  const mp = await context.newPage();
  mp.on('pageerror', (e) => rec.errors.push('manual: ' + e.message));
  await mp.goto(base + '/' + url);
  await sleep(500);
  rec.step('teacher window open', { url });
  return { page: mp, key, seq: 0 };
}

async function runScenario(browser, base, port, spec) {
  const rec = new Recording(spec);
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.exposeBinding('__sfRecord', (_src, e) => rec.fromPage(e));
  await context.addInitScript({ path: TAP });
  const page = await context.newPage();
  page.on('pageerror', (e) => rec.errors.push('host: ' + e.message));
  const phones = [];
  let manual = null;
  try {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SF && SF.Live && SF.Player && SF.GameStore && SF.getShowcaseGame && SF.Activities, null, { timeout: 30000 });
    rec.step('app ready');
    const built = await page.evaluate(spec.build, spec.args || null);
    rec.deck = built;
    rec.step('hosting', built);
    await page.waitForFunction(() => SF.Live.pin, null, { timeout: 10000 });
    const pin = await page.evaluate(() => SF.Live.pin);

    const names = spec.phones || ['Ada', 'Bo', 'Cy'];
    for (let i = 0; i < names.length; i++) {
      const ph = new Phone(rec, names[i], port, Object.assign({ index: i }, (spec.phoneOpts || {})[names[i]] || {}));
      phones.push(ph);
      await ph.join(pin);
    }
    await page.waitForFunction((n) => SF.Live.players.length >= n, names.length, { timeout: 8000 });
    rec.step('phones joined', { n: names.length });
    rec.ctx = { phones, pin, port, Phone };

    if (spec.manual !== false) {
      manual = await openManual(rec, context, page, base);
      await manualCommand(rec, manual, 'add', { names: ['Dee'], team: 0 });
      await page.waitForFunction(() => SF.Live.players.some((p) => p.manual), null, { timeout: 5000 })
        .catch(() => rec.notes.push('The teacher-entered learner never appeared in the roster.'));
    }

    await quiet(rec);
    rec.step('begin');
    await page.evaluate(() => SF.Live.begin());
    await sleep(500);
    if (spec.afterBegin) await spec.afterBegin(Object.assign({ rec, page, manual }, rec.ctx));
    await drive(rec, page, manual, spec);
    if (spec.beforeEnd) await spec.beforeEnd(Object.assign({ rec, page, manual }, rec.ctx));

    if (manual) await manualCommand(rec, manual, 'report');
    await quiet(rec, 500, 3000);
    rec.step('stop');
    await page.evaluate(() => SF.Live.stop());
    await sleep(1900);

    const hosted = rec.hosted();
    if (hosted && hosted.session) {
      const res = await fetch(base + '/api/sessions/' + encodeURIComponent(hosted.session.id), {
        headers: { authorization: 'Bearer ' + hosted.session.token }
      });
      rec.journal = { status: res.status, body: await res.json().catch(() => null) };
      rec.step('journal fetched', { status: res.status });
    } else {
      rec.notes.push('No hosted message: no session journal to fetch.');
    }
  } catch (err) {
    rec.notes.push('Recorder error: ' + (err && err.stack || err));
  } finally {
    phones.forEach((p) => p.close());
    await sleep(200);
    await context.close();
  }
  return rec;
}

function coverage(rec) {
  const hostSent = (t) => rec.host.filter((r) => r.dir === 'send' && r.data && r.data.t === t).length;
  const hostGot = (t) => rec.host.filter((r) => r.dir === 'recv' && r.data && r.data.t === t).length;
  const phoneRows = Object.values(rec.phones).flat();
  const phoneSent = (t) => phoneRows.filter((r) => r.dir === 'send' && r.data && r.data.t === t).length;
  const phoneGot = (t) => phoneRows.filter((r) => r.dir === 'recv' && r.data && r.data.t === t).length;
  const body = (rec.journal && rec.journal.body) || {};
  const hosted = rec.hosted() || {};
  return {
    phonesJoined: phoneGot('joined'),
    questions: hostSent('question'),
    answers: phoneSent('answer'),
    locked: phoneGot('locked'),
    reveals: hostSent('reveal'),
    reconnect: phoneRows.some((r) => r.dir === 'send' && r.data && r.data.t === 'join' && r.data.resumeToken),
    manualAnswer: hostSent('manualAnswer'),
    manualError: hostGot('manualError'),
    prompts: hostSent('prompt'),
    replies: phoneSent('reply'),
    sprint: hostSent('sprint'),
    sprintMarks: phoneGot('sprintMark'),
    teams: hosted.mode === 'teams',
    rounds: hostSent('round'),
    oral: hostSent('oral'),
    waiting: phoneGot('waiting'),
    journalStatus: rec.journal ? rec.journal.status : null,
    journalAttendance: Array.isArray(body.attendance) ? body.attendance.length : null,
    journalChecks: Array.isArray(body.checks) ? body.checks.length : null,
    journalFeedback: Array.isArray(body.feedback) ? body.feedback.length : null,
    journalOral: Array.isArray(body.oral) ? body.oral.length : null,
    hostFrames: rec.host.length
  };
}

/* Readable and diffable: one frame per line, everything else indented. */
function serialise(out) {
  const lines = ['{'];
  const keys = Object.keys(out);
  keys.forEach((k, i) => {
    const v = out[k];
    const comma = i < keys.length - 1 ? ',' : '';
    if (Array.isArray(v) && v.length) {
      lines.push('  ' + JSON.stringify(k) + ': [');
      v.forEach((row, j) => lines.push('    ' + JSON.stringify(row) + (j < v.length - 1 ? ',' : '')));
      lines.push('  ]' + comma);
    } else if (k === 'phones' && v && typeof v === 'object') {
      const names = Object.keys(v);
      lines.push('  "phones": {');
      names.forEach((n, ni) => {
        lines.push('    ' + JSON.stringify(n) + ': [');
        v[n].forEach((row, j) => lines.push('      ' + JSON.stringify(row) + (j < v[n].length - 1 ? ',' : '')));
        lines.push('    ]' + (ni < names.length - 1 ? ',' : ''));
      });
      lines.push('  }' + comma);
    } else {
      lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(v, null, 2).replace(/\n/g, '\n  ') + comma);
    }
  });
  lines.push('}');
  return lines.join('\n') + '\n';
}

function save(rec) {
  const spec = rec.spec;
  const out = {
    scenario: spec.name,
    kind: spec.kind,
    covers: spec.covers || null,
    description: spec.description,
    recordedAt: new Date(rec.t0).toISOString(),
    recorder: 'tools/record-sessions/record.mjs',
    timeUnit: 'ms since scenario start',
    deck: rec.deck || null,
    coverage: coverage(rec),
    notes: rec.notes,
    pageErrors: rec.errors,
    steps: rec.steps,
    host: rec.host,
    window: rec.window,
    otherPages: rec.otherPages,
    phones: rec.phones,
    journal: rec.journal || null
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, spec.name + '.json'), serialise(out));
  return out;
}

const argv = process.argv.slice(2);
if (argv.includes('--list')) {
  for (const s of SCENARIOS) console.log(s.name.padEnd(40) + ' ' + s.kind.padEnd(9) + ' ' + s.description);
  process.exit(0);
}
const wanted = argv.filter((a) => !a.startsWith('--'));
const unknown = wanted.filter((w) => !SCENARIOS.some((s) => s.name === w));
if (unknown.length) { console.error('Unknown scenario(s): ' + unknown.join(', ') + ' (see --list)'); process.exit(2); }
const run = wanted.length ? SCENARIOS.filter((s) => wanted.includes(s.name)) : SCENARIOS;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-record-'));
const port = await harness.freePort();
if (port === 8787) throw new Error('Refusing port 8787');
const relay = await harness.start(port, dir);
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({ headless: true });
let failed = 0;
try {
  for (const spec of run) {
    const started = Date.now();
    const rec = await runScenario(browser, base, port, spec);
    const out = save(rec);
    const c = out.coverage;
    const bad = rec.notes.some((n) => /^Recorder error/.test(n)) || !c.journalStatus || c.journalStatus !== 200;
    if (bad) failed++;
    console.log((bad ? 'x ' : 'ok ') + spec.name.padEnd(30) +
      ` ${((Date.now() - started) / 1000).toFixed(1)}s frames=${c.hostFrames} q=${c.questions} ans=${c.answers} manual=${c.manualAnswer} ` +
      `reconnect=${c.reconnect} prompts=${c.prompts} sprint=${c.sprint} rounds=${c.rounds} oral=${c.oral} journal=${c.journalAttendance}p/${c.journalChecks}q/${c.journalFeedback}f` +
      (rec.notes.length ? '\n     ' + rec.notes.join('\n     ') : ''));
  }
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
writeReadme(OUT, SCENARIOS);
process.exit(failed ? 1 : 0);
