/* A scripted phone for tools/record-sessions/record.mjs.
 *
 * Speaks join.html's side of the protocol over a raw socket, the way
 * tests/harness.js and tools/smoke/live-quiz.mjs do, and logs every frame it
 * sends and receives. It answers whatever it is asked, in the shape the relay
 * validates for that input kind (server/server.js, the answer handler), so one
 * phone serves every game style and feedback kind.
 *
 * Behaviours a scenario can switch on:
 *   dropOn: N     close the socket when question N arrives, unanswered, and
 *                 rejoin with the resume token (join.html's reconnect path);
 *                 the re-sent question is then answered.
 *   dropOnPrompt: N, dropOnSprint: N
 *                 the same, on the Nth feedback prompt or sprint question n.
 *   dropOnStage: i  the same, when a staged activity reaches stage i.
 *   silent: true  join and listen, never answer. */

export class Phone {
  constructor(rec, name, port, opts = {}) {
    this.rec = rec;
    this.name = name;
    this.port = port;
    this.index = opts.index || 0;
    this.opts = opts;
    this.ws = null;
    this.conn = 0;
    this.token = null;
    this.pin = null;
    this.team = opts.team;
    this.questions = 0;
    this.dropped = false;
    this.lastQuestion = null;
    this.waiters = [];
    this.got = [];
  }

  log(dir, extra) {
    this.rec.phone(this.name, Object.assign({ conn: this.conn, dir }, extra));
  }

  open() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://127.0.0.1:' + this.port);
      this.ws = ws;
      this.conn++;
      const conn = this.conn;
      ws.addEventListener('open', () => { this.log('open'); resolve(); }, { once: true });
      ws.addEventListener('error', (e) => { this.log('error'); reject(e); }, { once: true });
      ws.addEventListener('close', (ev) => {
        this.rec.phone(this.name, { conn, dir: 'close', code: ev.code, reason: ev.reason });
      });
      ws.addEventListener('message', (ev) => {
        let data;
        try { data = JSON.parse(ev.data); } catch (_) { this.log('recv', { raw: String(ev.data) }); return; }
        this.rec.phone(this.name, { conn, dir: 'recv', data });
        if (this.ws === ws) this.onMessage(data);
      });
    });
  }

  send(m) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    this.log('send', { data: m });
    this.ws.send(JSON.stringify(m));
    return true;
  }

  async join(pin) {
    this.pin = pin;
    await this.open();
    const m = { t: 'join', pin, name: this.name };
    if (this.team != null) m.team = this.team;
    this.send(m);
    return this.waitFor((d) => d.t === 'joined' || d.t === 'waiting', 'joined');
  }

  /* join.html's path when the page comes back: same PIN, same token. */
  async reconnect(pauseMs = 400) {
    const old = this.ws;
    this.ws = null;
    try { old.close(); } catch (_) {}
    await new Promise((r) => setTimeout(r, pauseMs));
    await this.open();
    this.send({ t: 'join', pin: this.pin, resumeToken: this.token });
  }

  waitFor(pred, label, ms = 8000) {
    const hit = this.got.find(pred);
    if (hit) { this.got.splice(this.got.indexOf(hit), 1); return Promise.resolve(hit); }
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      w.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        reject(new Error(this.name + ' timed out waiting for ' + label));
      }, ms);
      this.waiters.push(w);
    });
  }

  later(ms, fn) { setTimeout(() => { try { fn(); } catch (_) {} }, ms); }

  onMessage(m) {
    const i = this.waiters.findIndex((w) => w.pred(m));
    if (i >= 0) { const w = this.waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
    else { this.got.push(m); if (this.got.length > 200) this.got.shift(); }

    if (m.resumeToken) this.token = m.resumeToken;
    /* A teams room answers an untagged join with the team list. */
    if (m.t === 'error' && m.mode === 'teams' && Array.isArray(m.teams) && m.teams.length) {
      this.team = this.index % m.teams.length;
      this.send({ t: 'join', pin: this.pin, name: this.name, team: this.team });
      return;
    }
    if (this.opts.silent) return;
    const delay = 250 + 200 * this.index;

    if (m.t === 'question') {
      const key = JSON.stringify([m.n, m.question]);
      const fresh = key !== this.lastQuestion;
      this.lastQuestion = key;
      if (fresh) this.questions++;
      if (fresh && this.opts.dropOn === this.questions && !this.dropped) {
        this.dropped = true;
        this.later(150, () => this.reconnect());
        return;
      }
      this.later(delay, () => this.send(this.answerFor(m)));
    } else if (m.t === 'spoken') {
      /* Answered aloud: nothing to send, but still a question to drop on. */
      this.questions++;
      if (this.opts.dropOn === this.questions && !this.dropped) {
        this.dropped = true;
        this.later(150, () => this.reconnect());
      }
    } else if (m.t === 'locked') {
      if (this.lastAsked && this.lastAsked.confidence !== false) {
        this.later(120, () => this.send({ t: 'sure', sure: this.index % 2 === 0 }));
      }
    } else if (m.t === 'showdown') {
      /* Showdown: the split is on the wall; the second phone changes its mind. */
      if (this.index === 1 && this.lastAsked && Number.isInteger(this.lastChoice)) {
        const n = (this.lastAsked.options || []).length || 2;
        this.later(delay, () => this.send({ t: 'answer', switch: true, choice: (this.lastChoice + 1) % n }));
      }
    } else if (m.t === 'sprintQ' || (m.t === 'sprintMark' && m.next)) {
      /* The relay marks a tap and hands the next question back in the mark. */
      const q = m.t === 'sprintQ' ? m : m.next;
      if (this.opts.dropOnSprint === q.n && !this.dropped) {
        this.dropped = true;
        this.later(150, () => this.reconnect());
        return;
      }
      const n = (q.options || []).length || 1;
      this.later(300 + 120 * this.index, () => this.send({ t: 'sprintA', choice: (this.index + (q.n || 0)) % n }));
    } else if (m.t === 'prompt') {
      this.prompts = (this.prompts || 0) + 1;
      if (this.opts.dropOnPrompt === this.prompts && !this.dropped) {
        this.dropped = true;
        this.later(150, () => this.reconnect());
        return;
      }
      this.later(delay, () => this.replyTo(m));
    } else if (m.t === 'context' && m.stage && this.opts.dropOnStage === m.stage.i && !this.dropped) {
      this.dropped = true;
      this.later(150, () => this.reconnect());
    } else if (m.t === 'context' && m.stage && m.stage.job === 'note') {
      /* Said once per stage, as join.html's sayWrote does. */
      const key = m.slideId + ':' + m.stage.i;
      if (this.wrote === key) return;
      this.wrote = key;
      this.later(delay, () => this.send({ t: 'wrote', slideId: m.slideId, stage: m.stage.i, yes: true }));
    }
  }

  answerFor(q) {
    this.lastAsked = q;
    const i = this.index;
    const n = (q.options || []).length;
    switch (q.input) {
      case 'text':
        return { t: 'answer', text: ['Paris', 'paris', 'not sure', 'London'][i % 4] };
      case 'number': {
        const r = q.range || {};
        const min = Number(r.min ?? 0), max = Number(r.max ?? 100);
        const step = Number(r.step) > 0 ? Number(r.step) : 1;
        const raw = min + (max - min) * [0.5, 0.25, 0.75, 0.1][i % 4];
        return { t: 'answer', value: Math.round(raw / step) * step };
      }
      case 'order': {
        const order = Array.from({ length: n }, (_, k) => k);
        if (i % 2) order.reverse();
        return { t: 'answer', order };
      }
      case 'fill': {
        const gaps = Number(q.gaps) || 1;
        return { t: 'answer', fill: Array.from({ length: gaps }, (_, k) => (k + i) % Math.max(1, n)) };
      }
      case 'sort':
        return { t: 'answer', sort: Array.from({ length: n }, (_, k) => (k + i) % 3) };
      default: {
        const choice = n ? i % n : 0;
        this.lastChoice = choice;
        return { t: 'answer', choice };
      }
    }
  }

  replyTo(p) {
    if (p.kind === 'poll' || p.kind === 'scale') {
      const n = (p.options || []).length || 1;
      this.send({ t: 'reply', choice: this.index % n });
    } else {
      const words = p.kind === 'wordcloud'
        ? ['energy', 'cells', 'energy', 'growth']
        : ['I would test it with a smaller example first', 'Not sure why the second step works', 'It links to last week', 'Ask about the edge case'];
      this.send({ t: 'reply', text: words[this.index % words.length] });
    }
  }

  close() {
    const ws = this.ws;
    this.ws = null;
    try { if (ws) ws.close(); } catch (_) {}
  }
}
