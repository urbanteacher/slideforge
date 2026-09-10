'use strict';
/* Relay harness for qa.test.js and marking.test.js.

   sessions.test.js has its own inline copy of the same helpers. That is
   duplication, and worth collapsing — but its style is extremely dense and I
   mangled it twice trying, so it is left alone rather than risk breaking a
   working suite for the sake of twenty shared lines. If you do collapse it,
   run both suites: they cover the harness thoroughly enough to catch a slip. */
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

async function freePort() {
  const s = net.createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const p = s.address().port;
  await new Promise(r => s.close(r));
  return p;
}

async function start(port, dir) {
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', SLIDEFORGE_SESSION_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Relay startup timed out')), 5000);
    child.stdout.on('data', d => {
      if (String(d).includes('SlideForge is running')) { clearTimeout(timer); resolve(); }
    });
    child.on('exit', c => { clearTimeout(timer); reject(new Error('Relay exited ' + c)); });
  });
  return child;
}

/* A socket that queues messages by type, so a test can await the one it cares
   about without racing whatever else the relay is pushing. */
async function connect(port) {
  const socket = new WebSocket('ws://127.0.0.1:' + port);
  const queue = [], waiters = [];
  socket.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    const i = waiters.findIndex(w => w.type === m.t);
    if (i >= 0) { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
    else queue.push(m);
  });
  await new Promise((r, j) => {
    socket.addEventListener('open', r, { once: true });
    socket.addEventListener('error', j, { once: true });
  });
  return {
    socket,
    send: m => socket.send(JSON.stringify(m)),
    next(type) {
      const i = queue.findIndex(m => m.t === type);
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { type, resolve };
        w.timer = setTimeout(() => reject(new Error('No ' + type)), 3000);
        waiters.push(w);
      });
    },
    /* Drain to the most recent message of a type: the relay pushes the whole
       Q&A list on every change, so a test wants the latest, not the oldest. */
    async latest(type) {
      let m = await this.next(type);
      for (;;) {
        const i = queue.findIndex(x => x.t === type);
        if (i < 0) return m;
        m = queue.splice(i, 1)[0];
      }
    },
    /* Wait for a message of this type that actually satisfies `pred`.
       A barrier rather than a sleep: the relay pushes the whole list on every
       change, so "the newest push right now" may still predate the change the
       test is waiting on. */
    async until(type, pred, label) {
      const deadline = Date.now() + 3000;
      for (;;) {
        const m = await this.next(type);
        if (pred(m)) return m;
        if (Date.now() > deadline) {
          throw new Error('Timed out waiting for ' + (label || type));
        }
      }
    },
    async close() {
      if (socket.readyState === 3) return;
      await new Promise(r => { socket.addEventListener('close', r, { once: true }); socket.close(); });
    }
  };
}

async function stop(child, signal = 'SIGTERM') {
  if (child.exitCode !== null || child.signalCode) return;
  await new Promise(r => { child.once('exit', r); child.kill(signal); });
}

async function report(host) {
  host.send({ t: 'report' });
  return (await host.next('sessionReport')).report;
}

/**
 * Stand in for the marking half of a real host.
 *
 * The relay does not decide who was right — it is sent a verdict per player,
 * quoting the answer revision those verdicts were taken from. See the reveal
 * handler in server/server.js and markResponse in js/model.js.
 *
 * @param host        harness socket acting as the host
 * @param msg         the rest of the reveal ({ id, correct, answer, ... })
 * @param mark        (answer) => boolean, defaults to matching msg.correct
 * @param wantAnswers wait until the tally holds this many answers, so the
 *                    test marks a settled set rather than racing the relay
 */
async function reveal(host, msg, mark, wantAnswers) {
  let t = null;
  for (;;) {
    t = await host.latest('tally');
    if (wantAnswers == null || (t.answers || []).length >= wantAnswers) break;
  }
  const marks = (t.answers || []).map(a => [a.id, mark ? !!mark(a) : a.response === msg.correct]);
  host.send(Object.assign({ t: 'reveal', rev: t.rev, marks }, msg));
  return t;
}

module.exports = { ROOT, freePort, start, connect, stop, report, reveal };
