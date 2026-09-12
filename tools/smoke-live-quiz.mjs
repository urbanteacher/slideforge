#!/usr/bin/env node
/* Smoke: Live scored quiz with real browser host and simulated WebSocket audience.
 *
 * Verifies end-to-end integration across:
 *   - server/server.js (HTTP static + WebSocket relay)
 *   - js/live.js (host lobby, PIN generation, slide events, tally, marking/reveal)
 *   - js/player.js (live presentation runner, gate interceptor, tally DOM, leaderboard)
 *   - simulated player WebSockets (join, team assignment, question reception, answer, result)
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let spawnedServer = null;
let tempSessionDir = null;

function logStep(msg) {
  console.log('  ✓ ' + msg);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host, timeout: 600 }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
  });
}

async function startServerIfNeeded() {
  if (process.env.SF_URL) {
    const u = new URL(process.env.SF_URL);
    return { url: process.env.SF_URL, port: Number(u.port) || 80, spawned: false };
  }

  if (!process.env.FORCE_SPAWN) {
    const defaultPort = 8787;
    const isDefaultRunning = await isPortOpen(defaultPort);
    if (isDefaultRunning) {
      return { url: `http://127.0.0.1:${defaultPort}/`, port: defaultPort, spawned: false };
    }
  }

  const port = await freePort();
  tempSessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-smoke-live-'));
  
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      SLIDEFORGE_SESSION_DIR: tempSessionDir
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  spawnedServer = child;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Relay startup timed out')), 8000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('SlideForge is running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on('data', () => {});
    child.on('exit', (c) => {
      clearTimeout(timer);
      reject(new Error('Relay server exited unexpectedly with code ' + c));
    });
  });

  return { url: `http://127.0.0.1:${port}/`, port, spawned: true };
}

function cleanup() {
  if (spawnedServer) {
    try {
      spawnedServer.kill('SIGTERM');
    } catch (e) {}
    spawnedServer = null;
  }
  if (tempSessionDir) {
    try {
      fs.rmSync(tempSessionDir, { recursive: true, force: true });
    } catch (e) {}
    tempSessionDir = null;
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

class SimulatedPlayer {
  constructor(name, port, index) {
    this.name = name;
    this.port = port;
    this.index = index;
    this.ws = null;
    this.messageQueue = [];
    this.waiters = [];
  }

  connect(pin) {
    return new Promise((resolve, reject) => {
      const url = `ws://127.0.0.1:${this.port}`;
      this.ws = new WebSocket(url);

      this.ws.addEventListener('open', () => {
        this.send({ t: 'join', pin, name: this.name });
      });

      this.ws.addEventListener('error', (err) => {
        reject(err);
      });

      this.ws.addEventListener('message', (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }

        if (m.t === 'error' && m.mode === 'teams' && Array.isArray(m.teams) && m.teams.length) {
          const team = this.index % m.teams.length;
          this.send({ t: 'join', pin, name: this.name, team });
          return;
        }

        if (m.t === 'joined') {
          resolve(m);
        }

        const waiterIdx = this.waiters.findIndex((w) => w.type === m.t);
        if (waiterIdx >= 0) {
          const w = this.waiters.splice(waiterIdx, 1)[0];
          clearTimeout(w.timer);
          w.resolve(m);
        } else {
          this.messageQueue.push(m);
        }
      });
    });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  waitFor(type, timeoutMs = 8000) {
    const queueIdx = this.messageQueue.findIndex((m) => m.t === type);
    if (queueIdx >= 0) {
      return Promise.resolve(this.messageQueue.splice(queueIdx, 1)[0]);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error(`Player ${this.name} timed out waiting for message "${type}"`));
      }, timeoutMs);

      this.waiters.push({ type, resolve, timer });
    });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
  }
}

async function run() {
  console.log('\n--- SlideForge Live Scored Quiz Smoke Test ---');
  const serverInfo = await startServerIfNeeded();
  logStep(`Relay server ready at ${serverInfo.url} (spawned: ${serverInfo.spawned})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const players = [
    new SimulatedPlayer('Ada', serverInfo.port, 0),
    new SimulatedPlayer('Bo', serverInfo.port, 1),
    new SimulatedPlayer('Cy', serverInfo.port, 2)
  ];

  try {
    // 1. Navigate to SlideForge and switch to Quiz Studio
    await page.goto(serverInfo.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#wsSwitch', { timeout: 10000 });

    await page.click('button[data-go="game"]');
    await page.waitForSelector('body.ws-game', { timeout: 5000 });

    // Ensure a scored quiz game with scoreSlide: true is active
    await page.evaluate(() => {
      const g = window.SF.starterGame();
      g.settings.scoreSlide = true;
      g.settings.scoreboard = true;
      window.SF.GameStore.save(g);
      if (window.SF.Shell?.current()?.setDoc) {
        window.SF.Shell.current().setDoc(g);
        window.SF.Shell.current().draw();
      }
    });
    logStep('Switched to Quiz Studio with scored sample quiz');

    // 2. Click "Host live" to open the lobby
    const btnLive = page.locator('#btnLive');
    await btnLive.waitFor({ state: 'visible', timeout: 5000 });
    await btnLive.click();

    // 3. Wait for lobby modal and extracted PIN
    await page.waitForSelector('#lobby.on', { timeout: 8000 });
    const pinLocator = page.locator('#lobbyPin');
    await page.waitForFunction(() => {
      const pin = document.getElementById('lobbyPin')?.textContent?.trim();
      return pin && /^\d{4,6}$/.test(pin);
    }, { timeout: 8000 });

    const pin = (await pinLocator.innerText()).trim();
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error(`Invalid or missing lobby PIN: "${pin}"`);
    }
    logStep(`Lobby opened with PIN: ${pin}`);

    // 4. Connect simulated live players via WebSocket
    await Promise.all(players.map((p) => p.connect(pin)));
    logStep(`All 3 players connected and joined room ${pin}`);

    // 5. Verify host lobby UI shows joined players
    await page.waitForFunction(() => {
      const countEl = document.getElementById('lobbyCount');
      const text = countEl?.textContent || '';
      return text.includes('3');
    }, { timeout: 8000 });

    const countText = await page.locator('#lobbyCount').innerText();
    logStep(`Host lobby verified count: "${countText.trim()}"`);

    /* Label a distractor before the session starts, so the leak check below
       has something real to look for. A misconception names why a wrong
       answer is tempting; telling the room that about option B would tell
       them B is wrong. */
    const SECRET_LABEL = 'ZZ_MISCONCEPTION_CANARY_ZZ';
    await page.evaluate((label) => {
      const deck = SF.Player && SF.Player.deck ? SF.Player.deck : null;
      const target = (SF.Live && SF.Live.deck) || deck;
      (target ? target.slides : []).forEach((sl) => {
        if (sl.type === 'quiz' && Array.isArray(sl.options) && sl.options.length > 1) {
          sl.misconceptions = sl.options.map((_, i) => (i === (sl.correct === 0 ? 1 : 0) ? label : ''));
        }
      });
    }, SECRET_LABEL);

    // 6. Start the live session
    const btnStart = page.locator('#lobbyStart');
    await btnStart.click();
    await page.waitForSelector('#player.on', { timeout: 8000 });
    await page.waitForSelector('body.live-on', { timeout: 5000 });
    logStep('Live presentation started (#player.on, body.live-on)');

    // 7. Advance past intro/howto to Question 1
    for (let i = 0; i < 4; i++) {
      const isQuiz = await page.locator('#player .layout-quiz, #player .opt').count();
      if (isQuiz > 0) break;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(400);
    }

    await page.waitForSelector('#player .layout-quiz', { timeout: 8000 });
    logStep('Advanced to Question 1 on host wall');

    // 8. Verify all players received question payload via WebSocket
    const questionsQ1 = await Promise.all(players.map((p) => p.waitFor('question', 6000)));
    const q1 = questionsQ1[0];
    if (!q1.question || !Array.isArray(q1.options) || q1.options.length < 2) {
      throw new Error('Received malformed question on player socket: ' + JSON.stringify(q1));
    }
    logStep(`Players received Q1: "${q1.question}" (${q1.options.length} options)`);

    /* The label must not be on a phone, in any field, under any name. */
    for (const received of questionsQ1) {
      if (JSON.stringify(received).includes(SECRET_LABEL)) {
        throw new Error('Misconception label leaked to a player socket: ' + JSON.stringify(received));
      }
      if ('misconceptions' in received) {
        throw new Error('Player payload carries a misconceptions field: ' + JSON.stringify(received));
      }
    }
    logStep('Misconception labels stayed host-side (not in any player payload)');

    /* An impromptu poll, asked mid-lesson, over a live room. The room the poll
       is for is the room still arriving, so the full-screen overlay has to
       carry the PIN — the rail has for a while, full screen said nothing. */
    for (const p of players) p.messageQueue.length = 0;
    await page.evaluate(() => SF.Player.quickPoll({
      action: 'start', kind: 'poll', prompt: 'Shall we do another example?',
      options: ['Another example', 'Move on'], presentAs: 'focus'
    }));
    const quickPrompts = await Promise.all(players.map((p) => p.waitFor('prompt', 6000)));
    for (const got of quickPrompts) {
      if (got.prompt !== 'Shall we do another example?') {
        throw new Error('Player did not receive the impromptu poll: ' + JSON.stringify(got));
      }
      if (!Array.isArray(got.options) || got.options[0] !== 'Another example') {
        throw new Error('Impromptu poll reached the phones without its answers: ' + JSON.stringify(got));
      }
    }
    logStep(`All ${players.length} phones received the impromptu poll`);

    const joinBar = await page.evaluate(() => {
      const el = document.querySelector('#player [data-overlay] .fk-join');
      return el ? el.textContent : null;
    });
    /* Present and telling the truth, which past the first question of a live
       lesson means CLOSED rather than a PIN: joining shuts once a question has
       been asked, because eligibility is snapshotted per question. A bar that
       advertised a PIN nobody could use would be worse than no bar. */
    if (!joinBar || !joinBar.trim()) {
      throw new Error('Full-screen poll showed no join line at all');
    }
    if (!/\d/.test(joinBar) && !/CLOSED/.test(joinBar)) {
      throw new Error('Join line said neither a PIN nor that joining is closed: ' + joinBar);
    }
    logStep(`Full-screen poll carried the join line: "${joinBar.replace(/\s+/g, ' ').trim()}"`);

    await page.evaluate(() => SF.Player.quickPoll({ action: 'end' }));
    await Promise.all(players.map((p) => p.waitFor('promptEnd', 6000)));
    logStep('Ending the poll told every phone to put its pads away');

    // 9. Simulated players submit answers for Q1 (Option 1 is correct: "16:9")
    players[0].send({ t: 'answer', choice: 1 }); // Ada (correct)
    players[1].send({ t: 'answer', choice: 1 }); // Bo (correct)
    players[2].send({ t: 'answer', choice: 0 }); // Cy (wrong: "4:3")

    await Promise.all(players.map((p) => p.waitFor('locked', 5000)));
    logStep('All 3 player answers locked for Q1');

    // 10. Verify host screen live tally updates
    await page.waitForFunction(() => {
      const answeredEl = document.querySelector('#player .answered-count, #player .typedcount');
      const text = answeredEl?.textContent || '';
      return text.includes('3 of 3') || text.includes('3 answered');
    }, { timeout: 8000 });

    await page.waitForSelector('#player .tally.on', { timeout: 5000 });
    logStep('Host screen rendered live tally bar and answered count (3 of 3)');

    // 11. Test Grace Period: immediate next should be swallowed by SF.Player.gate
    await page.keyboard.press('ArrowRight');
    const stillOnQuizQ1 = await page.locator('#player .layout-quiz').count();
    if (stillOnQuizQ1 === 0) {
      throw new Error('Question advanced prematurely during grace period');
    }
    logStep('Grace period successfully swallowed immediate advance press');

    // Wait past the 1500ms grace period
    await page.waitForTimeout(1600);

    // 12. Advance again: SF.Player.gate triggers revealNow()
    await page.keyboard.press('ArrowRight');
    await page.waitForSelector('#player .opt.correct', { timeout: 8000 });
    logStep('Host wall revealed Q1 correct answer (.opt.correct)');

    // Players receive their verdict/results
    const resultsQ1 = await Promise.all(players.map((p) => p.waitFor('result', 6000)));
    logStep(`Players received Q1 results: Ada right=${resultsQ1[0].right}, Bo right=${resultsQ1[1].right}, Cy right=${resultsQ1[2].right}`);
    if (resultsQ1[0].right !== true || resultsQ1[1].right !== true || resultsQ1[2].right !== false) {
      throw new Error(`Unexpected player verdicts for Q1: ${JSON.stringify(resultsQ1.map(r => r.right))}`);
    }

    // 13. Advance to Question 2 ("Which key blanks the screen mid-presentation?")
    await page.keyboard.press('ArrowRight');
    const questionsQ2 = await Promise.all(players.map((p) => p.waitFor('question', 6000)));
    logStep(`Advanced to Q2: "${questionsQ2[0].question}"`);

    // Answer Q2: Correct is 0 ("B")
    players[0].send({ t: 'answer', choice: 0 }); // Ada (correct)
    players[1].send({ t: 'answer', choice: 1 }); // Bo (wrong)
    players[2].send({ t: 'answer', choice: 0 }); // Cy (correct)
    await Promise.all(players.map((p) => p.waitFor('locked', 5000)));

    await page.waitForTimeout(1600);
    await page.keyboard.press('ArrowRight'); // triggers gate reveal
    await page.waitForSelector('#player .opt.correct', { timeout: 8000 });
    await Promise.all(players.map((p) => p.waitFor('result', 6000)));
    logStep('Revealed Q2 correct answer and distributed verdicts');

    // 14. Advance to Question 3 ("How many teams can a SlideForge game have?")
    await page.keyboard.press('ArrowRight');
    const questionsQ3 = await Promise.all(players.map((p) => p.waitFor('question', 6000)));
    logStep(`Advanced to Q3: "${questionsQ3[0].question}"`);

    // Answer Q3: Correct is 2 ("Six")
    players[0].send({ t: 'answer', choice: 2 });
    players[1].send({ t: 'answer', choice: 2 });
    players[2].send({ t: 'answer', choice: 2 });
    await Promise.all(players.map((p) => p.waitFor('locked', 5000)));

    await page.waitForTimeout(1600);
    await page.keyboard.press('ArrowRight'); // triggers gate reveal
    await page.waitForSelector('#player .opt.correct', { timeout: 8000 });
    await Promise.all(players.map((p) => p.waitFor('result', 6000)));
    logStep('Revealed Q3 correct answer and distributed verdicts');

    // 15. Advance to Results / Leaderboard slide
    await page.keyboard.press('ArrowRight');
    await page.waitForSelector('#player .leaderboard, #player .lb-row', { timeout: 8000 });
    const lbRows = await page.locator('#player .lb-row').count();
    if (lbRows < 1) throw new Error('Expected at least one ranked row on the leaderboard');
    logStep(`Leaderboard rendered on host with ${lbRows} ranked rows`);

    // 16. Press Escape to cleanly exit presentation
    await page.keyboard.press('Escape');
    await page.waitForSelector('#player.on', { state: 'hidden', timeout: 5000 });
    logStep('Esc cleanly closed live player view');

    console.log('\n✓ ALL LIVE SCORED QUIZ VERIFICATION CHECKS PASSED!\n');
    await browser.close();
    players.forEach((p) => p.close());
    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FAILED:', err.message);
    await page.screenshot({ path: 'tools/smoke-live-quiz-fail.png', fullPage: true }).catch(() => {});
    await browser.close();
    players.forEach((p) => p.close());
    cleanup();
    process.exit(1);
  }
}

run();
