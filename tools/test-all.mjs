#!/usr/bin/env node
/* Everything, in one command.
 *
 * `npm test` is deliberately fast and hermetic: build check, typecheck, node
 * tests, no server and no browser. The smoke tools are the opposite — they
 * drive a real browser against a real server, which is what makes them worth
 * having and also what keeps them out of the default command.
 *
 * This runs both. The server is the only awkward part: five of the six smoke
 * tools need one already listening and give an ERR_CONNECTION_REFUSED stack
 * if it is not, which reads like a broken test rather than a missing
 * precondition. So this starts one when the port is free, and stops it again
 * afterwards. A server you were already running is left alone — it is yours,
 * and it may be the one you are looking at.
 *
 * Usage:
 *   node tools/test-all.mjs            # unit + probe + smoke
 *   node tools/test-all.mjs --visual   # and the visual baselines
 */
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = Number(process.env.PORT) || 8787;
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}/`;
const withVisual = process.argv.includes('--visual');

function isPortOpen(port, host = HOST) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host, timeout: 600 }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      /* The tools each default to 127.0.0.1:8787. Say it out loud instead of
         relying on that agreeing with PORT, or `PORT=9000 npm run test:all`
         starts a server on 9000 and then tests whatever is on 8787 — which
         on a dev machine is usually something, so it passes and means
         nothing. */
      env: { ...process.env, SF_URL: BASE }
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function startServer() {
  const child = spawn(process.execPath, ['server/server.js'], {
    env: { ...process.env, PORT: String(PORT), HOST },
    stdio: 'ignore',
    detached: false
  });
  /* Wait for it to actually accept a connection rather than guessing at a
     sleep — a fixed delay is the thing that makes a suite flaky on a slow
     machine and slow on a fast one. */
  for (let i = 0; i < 100; i++) {
    if (await isPortOpen(PORT)) return child;
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`server did not start on ${HOST}:${PORT} within 10s`);
}

const steps = [
  ['unit tests, build check and typecheck', 'npm', ['test']],
  ['type probe', 'npm', ['run', 'typecheck:probe']],
  ['smoke tools', 'npm', ['run', 'smoke']]
];
if (withVisual) steps.push(['visual baselines', 'npm', ['run', 'visual:check']]);

let server = null;
const failures = [];

try {
  if (await isPortOpen(PORT)) {
    console.log(`\n• Using the server already listening on ${HOST}:${PORT}\n`);
  } else {
    console.log(`\n• No server on ${HOST}:${PORT} — starting one for this run\n`);
    server = await startServer();
  }

  for (const [label, command, args] of steps) {
    console.log(`\n===== ${label} =====\n`);
    /* Every step runs even when an earlier one failed. A suite that stops at
       the first break tells you one thing per run, and these take minutes. */
    if (!(await run(command, args))) failures.push(label);
  }
} finally {
  if (server) {
    server.kill();
    console.log(`\n• Stopped the server this run started`);
  }
}

console.log('\n------------------------------------------------------');
if (failures.length) {
  console.log(`FAILED: ${failures.join(', ')}`);
  console.log('------------------------------------------------------\n');
  process.exit(1);
}
console.log(`Everything passed${withVisual ? '' : ' (visual baselines skipped — add --visual)'}`);
console.log('------------------------------------------------------\n');
