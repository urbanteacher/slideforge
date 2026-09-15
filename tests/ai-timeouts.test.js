'use strict';
/* The browser must wait longer for a generation than the server does.

   These two numbers live in different files and were set six hours and one
   branch apart: the server's abort went from 10s to 30s on the deploy branch
   because a working key and a valid model still failed most of the time —
   gemini-flash-latest routinely takes longer than ten seconds — while the
   page kept aborting at 14s. So the browser killed the request less than
   halfway through the server's patience, and every answer that arrived
   between 14 and 30 seconds was thrown away after the server had waited for
   it. Write reported a failure for calls that were about to succeed, which is
   exactly what "Write feels broken" looked like. Measured against the live
   deploy, one real call was still running at 30.4s.

   Nothing tested the relationship, because each number looks reasonable on
   its own. This is the test that reads them together. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function only(re, text, what) {
  const hits = [...text.matchAll(re)];
  assert.equal(hits.length, 1, 'expected exactly one ' + what + ', found ' + hits.length);
  return Number(hits[0][1]);
}

test('the page outlasts the server on an AI generation', () => {
  const client = fs.readFileSync(path.join(ROOT, 'js', 'ai.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server', 'server.js'), 'utf8');

  const clientMs = only(/AI_CLIENT_TIMEOUT_MS = (\d+)/g, client, 'client timeout');
  const serverMs = only(/setTimeout\(\(\) => controller\.abort\(\), (\d+)\)/g, server,
    'server abort in the AI proxy');

  assert.ok(clientMs > serverMs,
    'the page gives up first (client ' + clientMs + 'ms vs server ' + serverMs + 'ms), so the ' +
    'server 504 never reaches the room and slow answers are discarded after being waited for');

  /* Enough headroom for the reply to travel and parse, but not so much that a
     dead request sits spinning in front of a class. */
  const headroom = clientMs - serverMs;
  assert.ok(headroom >= 2000 && headroom <= 10000,
    'headroom should be a few seconds, got ' + headroom + 'ms');

  /* The abort is the transport's, not a status probe's: a probe timeout would
     satisfy the arithmetic above and leave the real bug in place. */
  assert.match(client, /callServerRaw[\s\S]{0,900}AI_CLIENT_TIMEOUT_MS/,
    'the timeout must be the one on the generate request itself');
});
