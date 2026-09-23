#!/usr/bin/env node
/* SlideForge relay.
   Serves the app over http and relays the live quiz over WebSocket on the
   same port, so phones on the same Wi-Fi can join with a PIN.
   No dependencies: `node server/server.js` and you're running.

   Live rooms are in memory; attendance and responses are journaled to private local files. */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ws = require('./ws');
const crypto = require('node:crypto');
const Sessions = require('./sessions');

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');

/* A .env beside the app, so a key can be pasted into a file rather than
   exported into a shell that forgets it at the next window.

   Hosted deployments set real environment variables and those always win:
   this only fills in what is missing, so a stray local .env can never
   override what Render's dashboard says. Still no dependency — the format
   worth supporting is KEY=value, one per line, # for comments.

   The file is gitignored. This repo is public, and a key in a public commit
   is a key that has to be revoked. */
(function loadDotEnv() {
  try {
    var text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    text.split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed.charAt(0) === '#') return;
      var eq = trimmed.indexOf('=');
      if (eq < 1) return;
      var key = trimmed.slice(0, eq).trim();
      var value = trimmed.slice(eq + 1).trim();
      /* Quotes are stripped because a key pasted out of a dashboard often
         arrives wrapped in them, and "AQ.xxx" is not the same string as
         AQ.xxx as far as the provider is concerned. */
      if (value.length > 1 && /^['"].*['"]$/.test(value)) value = value.slice(1, -1);
      if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) return;
      process.env[key] = value;
    });
  } catch (e) { /* no .env is the normal case */ }
})();

/* ------------------------------------------------------------ static files */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  /* Lab material, served so a student can click it out of a slide. A notebook
     is JSON, but its own type makes Jupyter and VS Code offer to open it
     rather than showing 300 kB of cells in a browser tab. */
  '.ipynb': 'application/x-ipynb+json',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  /* Video and audio for the media slides. A clip served as
     application/octet-stream plays in Chrome by sniffing and is refused
     outright by Safari, so the type matters more here than for a picture. */
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac'
};


/* ------------------------------------------------------------ data files

   The browser keeps decks and games in localStorage, which is invisible,
   per-origin and easy to lose. These two endpoints let the app write them out
   as real files inside the project folder so it can be backed up, diffed and
   committed like anything else.

   Deliberately narrow: fixed directories, a validated slug, a size cap, and
   only ever .json. Note the files are then served like any other static asset,
   so anything on the network that can reach the port can read them — the same
   trust assumption the rest of the relay makes.
   ------------------------------------------------------------------------- */

const DATA_DIRS = { deck: path.join(ROOT, 'data', 'decks'), game: path.join(ROOT, 'data', 'games') };

/* The endpoints below write to the project folder with no authentication,
   which is the LAN bargain stated above: whoever can reach the port is
   already someone you let into the room. On a public host that bargain does
   not hold — the port is reachable by everyone — and the folder is a
   container's, thrown away at the next deploy, so the feature would be unsafe
   and useless at the same time. SLIDEFORGE_HOSTED=1 turns it off, and the app
   keeps decks in localStorage and exports to file as it does on a laptop. */
const HOSTED = process.env.SLIDEFORGE_HOSTED === '1';
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_DOC = 8 * 1024 * 1024;          // embedded images make decks large

/* ------------------------------------------------------------ sharing

   A read-only copy of a deck, at an address that can be sent to someone who
   was not in the room. Deliberately a different bargain from /api/data:

   - Opt-in per deck. Nothing is published by pressing Save.
   - The id is sixteen random bytes, so the address is the credential. There
     is no listing endpoint: a share is opened by whoever holds the link and
     found by nobody else.
   - Read-only outward. The viewer is the player with the editor left out,
     and the server serves the document rather than accepting edits to it.
   - Revocable. Creating one hands back a key that deletes it.

   It is still not private. A link that escapes is a deck that escaped, which
   is what "anyone with the link" means wherever it is offered — so the app
   says that rather than implying otherwise.

   Persistence matches sessions: default is under the app tree (ephemeral on
   a free container deploy). Point SLIDEFORGE_DATA_DIR or SLIDEFORGE_SHARE_DIR
   at a mounted disk so shares survive the next release. */
const SHARE_DIR = path.resolve(
  process.env.SLIDEFORGE_SHARE_DIR ||
  (process.env.SLIDEFORGE_DATA_DIR
    ? path.join(process.env.SLIDEFORGE_DATA_DIR, 'shares')
    : path.join(ROOT, '.slideforge', 'shares'))
);
const SHARE_ID = /^[a-f0-9]{32}$/;
const SHARE_MAX = 40;                     // a lecturer's shelf, not a CDN

/* True when the share shelf is outside the app tree — i.e. almost certainly
   a persistent volume rather than the container image that deploys wipe. */
function shareIsDurable() {
  const root = path.resolve(ROOT);
  const dir = path.resolve(SHARE_DIR);
  return dir !== root && !dir.startsWith(root + path.sep);
}

/* The address a phone can actually reach.

   A share made on a laptop opened at http://localhost:8787 used to hand the
   QR code "localhost", and localhost on a phone is the phone: a perfectly
   valid code pointing at nothing. The join flow has used the LAN address
   since it existed, for exactly this reason; this is the same answer for the
   share link.

   How the client reached us is the better guide whenever it is a real name.
   On a hosted deploy the Host header is the public hostname and LAN is a
   container's private IP, so the LAN address is only substituted when the
   request arrived on a loopback name. x-forwarded-* is read first because
   Render terminates TLS in front of this process. */
function publicBase(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const name = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  const loopback = name === 'localhost' || name === '127.0.0.1' || name === '::1' || name === '0.0.0.0';
  if (!host || loopback) return 'http://' + LAN + ':' + PORT;
  return proto + '://' + host;
}

function shareCreate(req, res) {
  let body = '';
  let tooBig = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_DOC) { tooBig = true; req.destroy(); }
  });
  req.on('end', () => {
    if (tooBig) return jsonReply(res, 413, { error: 'That deck is too large to share. Remove some embedded images first.' });
    let msg;
    try { msg = JSON.parse(body); } catch (e) { return jsonReply(res, 400, { error: 'Bad JSON' }); }
    const doc = msg && msg.doc;
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.slides)) {
      return jsonReply(res, 400, { error: 'No deck to share' });
    }
    try {
      fs.mkdirSync(SHARE_DIR, { recursive: true, mode: 0o700 });
      /* Oldest first once the shelf is full. A share nobody has opened in a
         month is a better thing to lose than the one being made right now. */
      const names = fs.readdirSync(SHARE_DIR).filter((n) => n.endsWith('.json'));
      if (names.length >= SHARE_MAX) {
        names
          .map((n) => ({ n, t: fs.statSync(path.join(SHARE_DIR, n)).mtimeMs }))
          .sort((a, b) => a.t - b.t)
          .slice(0, names.length - SHARE_MAX + 1)
          .forEach((x) => { try { fs.unlinkSync(path.join(SHARE_DIR, x.n)); } catch (e) {} });
      }
      const id = crypto.randomBytes(16).toString('hex');
      const key = crypto.randomBytes(16).toString('hex');
      fs.writeFileSync(path.join(SHARE_DIR, id + '.json'),
        JSON.stringify({ key, at: Date.now(), doc }), { mode: 0o600 });
      log('shared "' + String(doc.title || 'untitled').slice(0, 60) + '" as ' + id);
      const base = publicBase(req);
      return jsonReply(res, 200, {
        id, key, durable: shareIsDurable(),
        base, url: base + '/view.html?s=' + id
      });
    } catch (e) {
      return jsonReply(res, 500, { error: 'Could not store the shared copy.' });
    }
  });
}

function shareRead(res, id) {
  if (!SHARE_ID.test(id)) return jsonReply(res, 404, { error: 'No such share.' });
  try {
    const rec = JSON.parse(fs.readFileSync(path.join(SHARE_DIR, id + '.json'), 'utf8'));
    /* The withdrawal key never travels to a viewer. */
    return jsonReply(res, 200, { doc: rec.doc, at: rec.at });
  } catch (e) {
    return jsonReply(res, 404, { error: 'That link has expired or was withdrawn.' });
  }
}

function shareDelete(req, res, id) {
  if (!SHARE_ID.test(id)) return jsonReply(res, 404, { error: 'No such share.' });
  const key = String(req.headers.authorization || '').replace(/^Bearer /, '');
  const file = path.join(SHARE_DIR, id + '.json');
  let rec;
  try { rec = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return jsonReply(res, 404, { error: 'No such share.' }); }
  /* Constant-time, because this key is the only thing between a passer-by
     and withdrawing somebody else's lecture. Length is checked first:
     timingSafeEqual throws on a mismatch rather than returning false. */
  const a = Buffer.from(String(rec.key)), b = Buffer.from(key);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return jsonReply(res, 403, { error: 'That key does not open this share.' });
  }
  try { fs.unlinkSync(file); } catch (e) { return jsonReply(res, 500, { error: 'Could not withdraw it.' }); }
  log('share ' + id + ' withdrawn');
  return jsonReply(res, 200, { deleted: id });
}

function jsonReply(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function listData(res) {
  const out = { decks: [], games: [] };
  for (const kind of ['deck', 'game']) {
    let names = [];
    try { names = fs.readdirSync(DATA_DIRS[kind]); } catch (e) { names = []; }
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      try {
        const raw = fs.readFileSync(path.join(DATA_DIRS[kind], name), 'utf8');
        const doc = JSON.parse(raw);
        out[kind === 'deck' ? 'decks' : 'games'].push({
          file: name,
          id: doc.id || '',
          title: doc.title || name,
          modified: doc.modified || 0
        });
      } catch (e) { /* skip anything unreadable rather than failing the list */ }
    }
  }
  jsonReply(res, 200, out);
}

/* ---------------------------------------------------------------- AI proxy */

/* The Gemini key lives here, in the server's environment, and never reaches a
   browser. Holding it client-side would put a live credential in localStorage,
   where any script on the page can read it, and in a URL query string, where
   it lands in logs, history and referrer headers. The studio asks this
   endpoint instead and never sees the key.

   Absent key is not an error: SF.AI falls back to its offline heuristics, so a
   deployment with no key still generates polls. */
const AI_KEY = process.env.GEMINI_API_KEY || '';
/* Moving aliases, not pinned versions: a key issued in the newer AQ. format
   does not resolve pinned aliases, and the provider answers 404 for the MODEL
   rather than 401 for the key — so a perfectly good key reads as "model
   missing".

   Lite first, on measurement rather than taste. Across a day of testing on a
   free-tier key, gemini-flash-latest answered 0 of 11 requests — nine fast
   503s and two timeouts at the ceiling — while gemini-flash-lite-latest
   answered in 1.1s and 1.3s on a key minutes old. The asks here are 450
   tokens of JSON: a handful of quiz questions or the boxes on one slide. That
   is lite's work, and the heavier alias was buying nothing but refusals.

   The other alias is kept as the fallback rather than dropped, because both
   are unreliable on the free tier and a second opinion is cheap. */
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const AI_MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK ||
  (AI_MODEL === 'gemini-flash-latest' ? 'gemini-flash-lite-latest' : 'gemini-flash-latest');
const AI_MAX_BODY = 6 * 1024;
/* A LAN-facing proxy onto someone's paid quota needs a ceiling, or one tab in
   a loop spends the teacher's month. Deliberately coarse: this is a guard
   against accidents and impatience, not an auth system. Render shares one
   key across every classroom — keep the window tight. */
const AI_WINDOW_MS = 60 * 1000;
const AI_MAX_PER_WINDOW = 10;
const aiHits = new Map();

/* What the provider said last time we actually asked it. A key being present
   is not the same as a key that works: a wrong model name, a project without
   the API enabled, or a revoked key all fail at the first real call and not
   before. Reporting "available" from the mere presence of a key is how a
   lecturer finds out mid-class. Remembering the last upstream refusal costs
   nothing and no quota, and lets the status say so. Cleared by the next call
   that succeeds, so a transient outage un-sticks itself. */
let aiLastFailure = null;    // { status, at } | null

/* Who to count against. On a LAN the socket's own address is the client. Behind
   a platform's proxy it is the proxy, so every teacher in the building shares
   one bucket and the first impatient tab locks out the rest — hence the
   forwarded header, whose first entry is the original client. It is forgeable,
   and deliberately trusted anyway: this ceiling guards a quota against loops
   and impatience, not against someone who means it, and the honest failure is
   the one that does not punish everybody for one person's retry loop. */
function clientIp(req) {
  const fwd = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function aiRateLimited(ip) {
  const now = Date.now();
  const hits = (aiHits.get(ip) || []).filter((t) => now - t < AI_WINDOW_MS);
  hits.push(now);
  aiHits.set(ip, hits);
  if (aiHits.size > 500) aiHits.clear();
  return hits.length > AI_MAX_PER_WINDOW;
}

function aiGenerate(req, res) {
  if (!AI_KEY) return jsonReply(res, 503, { error: 'No AI key configured on this server.' });
  const ip = clientIp(req);
  if (aiRateLimited(ip)) return jsonReply(res, 429, { error: 'Too many AI requests. Try again shortly.' });

  let body = '';
  let tooBig = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > AI_MAX_BODY) { tooBig = true; req.destroy(); }
  });
  req.on('end', async () => {
    if (tooBig) return jsonReply(res, 413, { error: 'Prompt too large' });
    let msg;
    try { msg = JSON.parse(body); } catch (e) { return jsonReply(res, 400, { error: 'Bad JSON' }); }
    /* Caps stay well under Gemini's comfort zone — activity boxes and a
       handful of quiz questions, not an essay. */
    const system = String((msg && msg.system) || '').slice(0, 2200);
    const user = String((msg && msg.user) || '').slice(0, 1800);
    if (!user.trim()) return jsonReply(res, 400, { error: 'Nothing to generate from' });

    /* How much room the answer gets, asked for by the caller and clamped here.

       450 is right for a poll — a prompt and four options — and far too tight
       for a set of quiz questions with options and an explanation each. The
       model filled the budget and stopped mid-string, the client could not
       parse the half-written JSON, and the teacher was told the AI server
       could not be reached by a server that had answered in full. */
    const asked = Number(msg && msg.maxTokens);
    const maxOutputTokens = Number.isFinite(asked)
      ? Math.max(200, Math.min(2400, Math.round(asked)))
      : 450;

    /* One budget for the whole request, shared by both models.

       Thirty seconds, because ten was too short to be the thing that decides:
       a flash model under load routinely takes longer than that, the abort
       fired before the answer arrived, and a working key with a valid model
       still produced "could not reach the provider" seven times in eight. The
       timeout exists so a hung request cannot hold a connection open forever,
       not to impose a latency budget.

       It is a DEADLINE rather than a per-attempt timer so that asking a second
       model cannot push the total past what the browser will wait for (33s).
       A fallback only happens when the first refusal came back quickly, which
       is how they arrive — 1.5s, 2.4s, 5.5s — so there is budget left. */
    const deadline = Date.now() + 30000;

    async function ask(model) {
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(model) + ':generateContent';
      const controller = new AbortController();
      const left = Math.max(1000, deadline - Date.now());
      const timer = setTimeout(() => controller.abort(), left);
      try {
        const upstream = await fetch(endpoint, {
          method: 'POST',
          /* Header rather than ?key=, so the credential stays out of request
             lines, proxy logs and anything that records URLs. */
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': AI_KEY },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: system + '\n\n' + user }] }],
            generationConfig: {
              temperature: 0.55,
              maxOutputTokens: maxOutputTokens,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        });
        if (!upstream.ok) {
          /* The upstream body can quote the key back in an error. Only the
             status travels onward. */
          return { status: upstream.status };
        }
        const data = await upstream.json();
        const part = data && data.candidates && data.candidates[0] &&
          data.candidates[0].content && data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0];
        if (!part || !part.text) return { status: 0, empty: true };
        return { text: String(part.text).slice(0, 12000) };
      } catch (err) {
        const aborted = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
        return { aborted: aborted, failed: true };
      } finally {
        clearTimeout(timer);
      }
    }

    /* A second model is worth asking when the first one is simply unavailable:
       503 is the provider having a moment and 500/502 are its own faults, none
       of which the same request to a different alias has to inherit. A 429 is
       not retried anywhere — retrying a rate limit is how you earn one — and a
       404 or 401 means the key cannot call that model, which a fallback WILL
       usefully answer, so it is included. */
    function worthSecondOpinion(r) {
      return r.status === 503 || r.status === 500 || r.status === 502 ||
        r.status === 404 || r.empty === true;
    }

    try {
      let served = AI_MODEL;
      let out = await ask(AI_MODEL);
      const room = deadline - Date.now() > 6000;
      if (!out.text && AI_MODEL_FALLBACK && AI_MODEL_FALLBACK !== AI_MODEL &&
          worthSecondOpinion(out) && room) {
        log('ai: ' + AI_MODEL + ' returned ' + (out.status || 'nothing') +
          ' — asking ' + AI_MODEL_FALLBACK);
        const second = await ask(AI_MODEL_FALLBACK);
        if (second.text) { out = second; served = AI_MODEL_FALLBACK; }
        else if (!out.status && second.status) out = second;
      }

      if (out.text) {
        aiLastFailure = null;
        /* Which model answered, so a status panel can say so rather than
           showing the configured one and being wrong. */
        return jsonReply(res, 200, { text: out.text, model: served });
      }
      if (out.status) {
        aiLastFailure = { status: out.status, at: Date.now() };
        return jsonReply(res, 502, { error: 'AI provider returned ' + out.status });
      }
      if (out.empty) return jsonReply(res, 502, { error: 'AI provider returned no content' });
      /* Distinguished because the remedies differ: a timeout means try again
         or write it yourself, and anything else means the provider is not
         reachable from here at all. Both used to read as the latter. */
      return jsonReply(res, 504, out.aborted
        ? { error: 'The AI provider took too long. Try again, or write the question yourself.' }
        : { error: 'Could not reach the AI provider.' });
    } catch (err) {
      /* ask() already catches its own network faults, so anything arriving
         here is a bug in this handler rather than the provider. Still answered
         rather than left hanging: a request with no reply is a Write button
         that spins until the browser gives up. */
      log('ai: handler fault \u2014 ' + String((err && err.message) || err));
      return jsonReply(res, 500, { error: 'The AI proxy failed. Try again, or write it yourself.' });
    }
  });
}

function saveData(req, res) {
  let body = '';
  let tooBig = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_DOC) { tooBig = true; req.destroy(); }
  });
  req.on('end', () => {
    if (tooBig) return jsonReply(res, 413, { error: 'Document too large' });
    let msg;
    try { msg = JSON.parse(body); } catch (e) {
      return jsonReply(res, 400, { error: 'Bad JSON' });
    }
    const kind = msg && msg.kind;
    const slug = msg && msg.slug;
    if (!DATA_DIRS[kind]) return jsonReply(res, 400, { error: 'Unknown kind' });
    if (!SLUG.test(String(slug || ''))) return jsonReply(res, 400, { error: 'Bad name' });
    if (!msg.doc || typeof msg.doc !== 'object') {
      return jsonReply(res, 400, { error: 'No document' });
    }
    try {
      fs.mkdirSync(DATA_DIRS[kind], { recursive: true });
      const file = path.join(DATA_DIRS[kind], slug + '.json');
      fs.writeFileSync(file, JSON.stringify(msg.doc, null, 2), 'utf8');
      log('saved ' + kind + ' "' + (msg.doc.title || slug) + '" to data/' +
          (kind === 'deck' ? 'decks' : 'games') + '/' + slug + '.json');
      jsonReply(res, 200, { ok: true, file: slug + '.json' });
    } catch (e) {
      jsonReply(res, 500, { error: e.message });
    }
  });
}

function serve(req, res) {
  let rel;
  try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (_) { return jsonReply(res, 400, {error:'Invalid URL'}); }
  if (req.method === 'GET' && rel.startsWith('/api/sessions/')) {
    const id = rel.slice('/api/sessions/'.length);
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    try {
      const active = [...rooms.values()].find(r => r.audit && r.audit.meta.id === id);
      const session = active ? (Sessions.authorized(active.audit.meta, token) ? active.audit : null) : Sessions.load(id, token);
      if (!session) return jsonReply(res, 404, {error:'Session unavailable. Open it from the host browser that created it.'});
      return jsonReply(res, 200, Sessions.project(session, !!active));
    } catch (_) { return jsonReply(res, 500, {error:'Could not read the session journal.'}); }
  }

  if (req.method === 'DELETE' && rel.startsWith('/api/sessions/')) {
    const id = rel.slice('/api/sessions/'.length);
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    /* Never while it is being written to. Deleting the journal of a room that
       is still recording would leave the host appending to a file that no
       longer exists, and the lesson would look fine until the report came
       back empty. */
    const live = [...rooms.values()].find(r => r.audit && r.audit.meta.id === id);
    if (live) return jsonReply(res, 409, {error:'That lesson is still running. End it first, then delete it.'});
    try {
      const outcome = Sessions.remove(id, token);
      if (outcome === 'denied') return jsonReply(res, 403, {error:'That access key does not open this session.'});
      if (outcome === 'missing') return jsonReply(res, 404, {error:'No session with that id. It may already be deleted.'});
      log('session ' + id + ' deleted');
      return jsonReply(res, 200, {deleted:id});
    } catch (_) { return jsonReply(res, 500, {error:'Could not delete the session journal.'}); }
  }

  /* Says only whether live generation is available, never the key itself. */
  if (rel === '/api/ai/status' && req.method === 'GET') {
    if (!AI_KEY) return jsonReply(res, 200, { available: false, model: null });
    /* Only a refusal about the request itself is held against the key: 401,
       403 and 404 mean this key cannot call this model and will not start
       working on its own. A 429 or a 5xx is the provider having a moment, and
       saying "unavailable" for that would be its own kind of lie. */
    const hard = aiLastFailure &&
      [400, 401, 403, 404].includes(aiLastFailure.status);
    return jsonReply(res, 200, {
      available: !hard,
      model: AI_MODEL,
      lastError: hard ? aiLastFailure.status : null
    });
  }
  if (rel === '/api/ai/generate' && req.method === 'POST') return aiGenerate(req, res);

  /* Sharing is deliberately NOT gated the way /api/data is when hosted.
     They look similar and are opposites: /api/data writes whatever is posted
     into the project folder and lists what is there, which is why a public
     address turns it off. A share publishes only the one deck an author
     asked to publish, to an address nobody can guess, and can be withdrawn
     with the key it hands back. Being reachable is the entire feature. */
  if (rel === '/api/share' && req.method === 'POST') return shareCreate(req, res);
  if (rel.startsWith('/api/share/')) {
    const sid = rel.slice('/api/share/'.length);
    if (req.method === 'GET') return shareRead(res, sid);
    if (req.method === 'DELETE') return shareDelete(req, res, sid);
  }

  if (rel === '/api/data' && (req.method === 'GET' || req.method === 'POST')) {
    if (HOSTED) return jsonReply(res, 403, { error: 'Saving into the project folder is off on the hosted app. Use File \u2192 Export to keep a copy.' });
    return req.method === 'GET' ? listData(res) : saveData(req, res);
  }

  if (rel === '/') rel = '/index.html';

  const full = path.resolve(ROOT, '.' + rel);
  // never serve outside the app folder
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (full === Sessions.DIR || full.startsWith(Sessions.DIR + path.sep) || path.relative(ROOT, full).split(path.sep).some(part => part.startsWith('.'))) {
    res.writeHead(403).end('Forbidden'); return;
  }

  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found: ' + rel);
      return;
    }
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';

    /* Byte ranges, which video needs and nothing else here does.
       Without a 206 the browser reports an empty seekable range: the scrubber
       does nothing, and a slide asking to start 90 seconds in starts at zero
       instead. Measured before this existed — video.seekable was [[0,0]] on a
       file whose duration read correctly, which is the shape this bug takes.
       Advertised on every reply so the browser knows not to give up. */
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || '').trim());
    if (range && st.size > 0) {
      let start = range[1] === '' ? null : Number(range[1]);
      let end = range[2] === '' ? null : Number(range[2]);
      if (start === null) {
        /* "bytes=-500" means the last 500 bytes, not from zero to 500. */
        start = end === null ? 0 : Math.max(0, st.size - end);
        end = st.size - 1;
      } else if (end === null || end >= st.size) {
        end = st.size - 1;
      }
      if (start > end || start >= st.size) {
        /* 416 has to carry the real length or the player cannot recover. */
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }).end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(full, { start: start, end: end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer(serve);

/* ------------------------------------------------------------ rooms */

/** pin -> room */
const rooms = new Map();

/* How long a room waits for a host who has gone quiet. Long enough to cover a
   page reload, a browser crash and reopen, or a laptop asleep for a minute;
   short enough that a room nobody returns to is not left open. */
const HOST_GRACE_MS = 90 * 1000;

function newPin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms.has(pin));
  return pin;
}

function lanAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return 'localhost';
}

const LAN = lanAddress();
const LAN_JOIN_URL = 'http://' + LAN + ':' + PORT + '/join.html';

/* Where to tell a phone to go. On a laptop that is this machine's LAN address,
   which is why the address is found by walking the interfaces at all. Hosted,
   the interfaces are a container's and say nothing useful, so the name has to
   come from the request: the Host header the client actually asked for, and
   the scheme from x-forwarded-proto, because behind a platform's proxy the
   connection reaching us is plain http on an internal port even when the
   browser is on https — and a QR pointing at http on such a host is refused
   rather than merely downgraded.

   Localhost is deliberately excluded. A teacher who opens the deck on
   localhost still needs the code to carry the LAN address, or it points every
   phone in the room back at its own handset. */
function joinUrlFor(req) {
  const headers = (req && req.headers) || {};
  const host = String(headers.host || '').trim();
  if (!host || /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host)) return LAN_JOIN_URL;
  const proto = String(headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  return proto + '://' + host + '/join.html';
}

function roomOf(sock) {
  for (const room of rooms.values()) {
    if (room.host === sock) return room;
  }
  return null;
}

function playerList(room) {
  return [...room.players.values()]
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: !!(p.sock && p.sock.open),
      /* The phone says it is showing something else (another app, another
         tab, the screen off). For the host's own screen only — the wall's
         lobby does not show it. */
      away: !!(p.away && p.sock && p.sock.open),
      manual: p.manual === true,
      team: p.team,
      correct: p.correctCount || 0     // an individual race's position
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Competition places: equal scores share a place, next place skips
 * (1, 1, 3). Distinct ordinals for ties made "2nd" look like a loss when
 * both were first.
 */
function competitionPlaces(sortedDesc) {
  const places = [];
  for (let i = 0; i < sortedDesc.length; i++) {
    if (i === 0) places.push(1);
    else if (sortedDesc[i].score === sortedDesc[i - 1].score) places.push(places[i - 1]);
    else places.push(i + 1);
  }
  return places;
}

function placeMeta(sortedDesc, index) {
  const places = competitionPlaces(sortedDesc);
  const place = places[index] || (index + 1);
  const tied = sortedDesc.filter((row) => row.score === sortedDesc[index].score).length > 1;
  return { rank: place, of: sortedDesc.length, tied: tied, won: place === 1 };
}

function ordinal(n) {
  const v = Number(n) || 0;
  const mod = v % 100;
  if (mod >= 11 && mod <= 13) return v + 'th';
  switch (v % 10) {
    case 1: return v + 'st';
    case 2: return v + 'nd';
    case 3: return v + 'rd';
    default: return v + 'th';
  }
}

function placePhrase(meta) {
  if (!meta || meta.of <= 1) return '';
  if (meta.rank === 1 && meta.tied) return 'Joint 1st of ' + meta.of;
  if (meta.rank === 1) return '1st of ' + meta.of;
  if (meta.tied) return 'Joint ' + ordinal(meta.rank) + ' of ' + meta.of;
  return 'Place ' + meta.rank + ' of ' + meta.of;
}

/**
 * Rows for the on-screen scoreboard.
 *
 * In team mode the score is an accumulated per-question average (see the
 * reveal handler), so a team of six never out-scores a team of three on
 * headcount, and the roster changing between rounds does not rewrite history.
 */
/** How much of what they were asked this learner got right, or null when
    they have not been asked anything yet. */
function accuracyOf(p) {
  if (!p.askedCount) return null;
  return Math.round(((p.correctCount || 0) / p.askedCount) * 100);
}

function scoreRows(room) {
  if (room.mode !== 'teams') {
    return playerList(room).map((p) => {
      const rec = room.players.get(p.id) || {};
      return {
        key: 'p' + p.id,
        name: p.name,
        score: p.score,
        /* Learning and winning, side by side and never the same number. */
        accuracy: accuracyOf(rec),
        answered: rec.answeredCount || 0,
        asked: rec.askedCount || 0,
        gained: rec.lastGain > 0
      };
    });
  }

  return room.teams
    .map((name, i) => {
      const members = [...room.players.values()].filter((p) => p.team === i);
      const asked = members.reduce((n, p) => n + (p.askedCount || 0), 0);
      const right = members.reduce((n, p) => n + (p.correctCount || 0), 0);
      return {
        key: 't' + i,
        name,
        ci: i,
        members: members.length,
        score: Math.round(room.teamScores[i]),
        accuracy: asked ? Math.round((right / asked) * 100) : null,
        answered: members.reduce((n, p) => n + (p.answeredCount || 0), 0),
        asked,
        gained: !!room.teamGain[i]
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function pushPlayers(room) {
  if (!room.host) return;
  pushBookmarks(room);
  // the digest reports "n of m responded", so m changes when someone joins
  if (room.prompt) setTimeout(() => pushFeedback(room), 0);
  room.host.json({
    t: 'players',
    pin: room.pin,
    joinUrl: room.joinUrl || LAN_JOIN_URL,
    joinOpen: room.joinOpen,
    waiting: room.waiting.size,
    round: room.roundNo,
    list: playerList(room),
    mode: room.mode,
    rows: scoreRows(room),
    counts: room.mode === 'teams'
      ? room.teams.map((_, i) => [...room.players.values()].filter((p) => p.team === i).length)
      : null
  });
}

function answersFor(room) {
  const eligible = room.question.eligible;
  const out = [];
  for (const p of room.players.values()) {
    if (eligible && !eligible.has(p.id)) continue;
    if (p.answer == null) continue;
    out.push({ id: p.id, name: p.name, team: p.team, response: p.answer, sure: p.sure,
      elapsedMs: p.answeredAt ? Math.max(0, p.answeredAt - room.askedAt) : null });
  }
  return out;
}

function pushTally(room) {
  if (!room.host || !room.question) return;
  /* A tap question is a choice among its words: counted the same way, and
     the count per word is the heat map its reveal draws. */
  const choosing = room.question.input === 'choice' || room.question.input === 'tap';
  const eligible = room.question.eligible;
  const counts = new Array(room.question.options.length).fill(0);
  let answered = 0;
  let sured = 0;
  let total = 0;
  for (const p of room.players.values()) {
    // latecomers are spectators for the question already on screen
    if (eligible && !eligible.has(p.id)) continue;
    if (!p.manual && (!p.sock || !p.sock.open) && p.answer == null) continue;
    total++;
    if (p.answer == null) continue;
    answered++;
    if (typeof p.sure === 'boolean') sured++;
    if (choosing && p.answer >= 0 && p.answer < counts.length) counts[p.answer]++;
  }
  room.host.json({
    t: 'tally',
    id: room.question.id,
    counts,
    answered,
    /* How many have also said how sure they were. The host holds the reveal a
       beat for the rest — revealing the moment the last answer lands would
       collect the answer and throw away whether they meant it. */
    sured,
    total,
    /* Showdown: the split as it stood when it was shown, and how many
       phones have since changed their mind. */
    split: room.question.split || null,
    switched: room.question.switched || 0,
    waiting: room.players.size - total,
    allIn: total > 0 && answered === total,
    manual: [...room.players.values()].some(p => p.manual),
    /* The host marks, so it needs the answers themselves, not just the shape
       of them. It holds them in memory — a typed answer must not reach the
       projected screen before the reveal, or the room reads it off the wall. */
    rev: room.answerRev,
    answers: answersFor(room)
  });
}

/** Fold the replies into whatever shape this prompt's rail needs. */
function pushBookmarks(room) {
  const count=[...room.players.values()].filter(p=>p.bookmarkedSlides&&p.bookmarkedSlides.has(room.at.slideId)).length;
  if(room.host&&room.host.open)room.host.json({t:'bookmarks',slideId:room.at.slideId,count});
}

function feedbackDigest(room) {
  const p = room.prompt;
  if (!p) return null;
  const all = [...room.replies.entries()];

  /* A scale is a poll over ordered points, so the counting is identical and
     shared. Only the label on the way out differs, because the host draws a
     distribution and an average from it rather than independent bars. */
  if (p.kind === 'poll' || p.kind === 'scale') {
    const counts = new Array(p.options.length).fill(0);
    let voted = 0;
    for (const [, list] of all) {
      const pick = list[0];
      if (Number.isInteger(pick) && pick >= 0 && pick < counts.length) {
        counts[pick]++;
        voted++;
      }
    }
    return { kind: p.kind, counts, total: voted };
  }

  if (p.kind === 'wordcloud') {
    /* Case and punctuation folded together so "Nile", "nile" and "Nile!" are
       one word — otherwise a cloud is mostly near-duplicates. */
    const tally = new Map();
    let total = 0;
    for (const [, list] of all) {
      for (const raw of list) {
        const key = String(raw).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, '').trim();
        if (!key) continue;
        total++;
        const seen = tally.get(key);
        if (seen) { seen.n++; } else { tally.set(key, { text: String(raw).trim(), n: 1 }); }
      }
    }
    const words = [...tally.values()].sort((a, b) => b.n - a.n || a.text.localeCompare(b.text));
    return { kind: 'wordcloud', words: words.slice(0, 40), total, unique: words.length };
  }

  // brainstorm: newest first, attributed
  const items = [];
  for (const [id, list] of all) {
    const who = room.players.get(id);
    list.forEach((text, i) => {
      items.push({ name: who ? who.name : '', text: String(text), seq: (id * 10) + i });
    });
  }
  items.sort((a, b) => b.seq - a.seq);
  return { kind: 'brainstorm', items: items.slice(0, 40), total: items.length };
}

/**
 * The stage of a staged activity, as the phones are allowed to see it — or
 * null. The host's own object is never forwarded: only these fields, each
 * bounded, and the job only from the four the phones know how to draw.
 */
/* See the spoken verdict in the reveal handler. */
const SPOKEN_POINTS = 1000;

function cleanStage(st) {
  if (!st || typeof st !== 'object') return null;
  const clamp = (v, hi) => Math.max(0, Math.min(hi, Math.round(Number(v) || 0)));
  return {
    i: clamp(st.i, 7),
    of: clamp(st.of, 8),
    name: String(st.name || '').slice(0, 60),
    job: ['note', 'talk', 'send', 'down'].includes(st.job) ? st.job : 'down',
    text: String(st.text || '').slice(0, 400),
    seconds: clamp(st.seconds, 3600),
    left: clamp(st.left, 3600),
    next: String(st.next || '').slice(0, 60)
  };
}

function pushFeedback(room) {
  if (!room.host || !room.prompt) return;
  room.host.json(Object.assign({
    t: 'responses',
    id: room.prompt.id,
    answered: room.replies.size,
    players: room.players.size
  }, feedbackDigest(room)));
}

/**
 * Q&A as each side is allowed to see it.
 *
 * The host's copy includes pending items; the players' copy never does. That
 * split is the whole point of moderation — and it matters here specifically
 * because the host's screen is usually the projected one, so anything the
 * host is sent could end up on the wall. Pending items are therefore only
 * ever rendered in presenter view.
 */
function qaForHost(room) {
  const items = [...room.qa.values()].map((q) => ({
    id: q.id, text: q.text, name: q.name, at: q.at, state: q.state, votes: q.votes.size
  }));
  /* Approved first and most-voted first inside that, so the host's queue is
     ordered by what the room actually wants answered. */
  const rank = { approved: 0, pending: 1, answered: 2, dismissed: 3 };
  items.sort((a, b) => (rank[a.state] - rank[b.state]) || (b.votes - a.votes) || (a.at - b.at));
  return {
    t: 'qa',
    items,
    pinned: room.qaPinned,
    pending: items.filter((q) => q.state === 'pending').length,
    open: items.filter((q) => q.state === 'approved').length
  };
}

function qaForPlayer(room, playerId) {
  const items = [...room.qa.values()]
    .filter((q) => q.state === 'approved' || q.state === 'answered')
    .map((q) => ({
      id: q.id, text: q.text, name: q.name, state: q.state,
      votes: q.votes.size, mine: q.votes.has(playerId), asked: q.playerId === playerId
    }));
  items.sort((a, b) => (b.votes - a.votes) || a.id - b.id);
  return { t: 'qaList', items, pinned: room.qaPinned };
}

/* The four reactions a phone can send. Fixed, small, and none of them
   negative — dissent already has two better homes in this app, the pace
   signal and a feedback prompt, and an anonymous channel for piling
   disapproval onto a projected screen in front of a class is a different
   product and a worse one. */
const REACTIONS = ['clap', 'yes', 'wow', 'idea'];

/* One reaction each per this long. Not a punishment — it is what keeps a
   gesture a gesture rather than something that can be held down. */
const REACT_EVERY_MS = 2500;

/* And a ceiling for the room, so thirty phones at once is a moment rather
   than a screen nobody can read a slide through. */
const REACT_BURST = 12;
const REACT_BURST_MS = 2000;

/* A signal is live for this long and then it is gone. Long enough to survive
   a slow explanation, short enough that it always means "right now". */
const SIGNAL_TTL_MS = 90 * 1000;
const SIGNAL_KINDS = ['lost', 'fast', 'slow'];

function signalDigest(room) {
  const now = Date.now();
  const counts = { lost: 0, fast: 0, slow: 0 };
  let live = 0;
  for (const [id, sig] of room.signals) {
    if (now - sig.at > SIGNAL_TTL_MS) { room.signals.delete(id); continue; }
    counts[sig.kind]++;
    live++;
  }
  const connected = [...room.players.values()].filter((p) => p.sock && p.sock.open).length;
  /* A quarter of the room, and never fewer than two people: one person who is
     lost is a conversation, not a signal about the lesson. */
  const threshold = Math.max(2, Math.ceil(connected * 0.25));
  const loudest = SIGNAL_KINDS.reduce((a, k) => (counts[k] > counts[a] ? k : a), 'lost');
  return {
    t: 'signals',
    counts,
    live,
    of: connected,
    kind: counts[loudest] ? loudest : null,
    spike: live >= threshold && connected > 0
  };
}

function pushSignals(room) {
  if (room.host && room.host.open) room.host.json(signalDigest(room));
  /* Sweep only while something is live: an expiring signal has to lower the
     count on its own, with nobody having pressed anything. */
  if (room.signals.size && !room.sweeper) {
    room.sweeper = setInterval(() => {
      const before = room.signals.size;
      const digest = signalDigest(room);
      if (room.signals.size !== before && room.host && room.host.open) room.host.json(digest);
      if (!room.signals.size) { clearInterval(room.sweeper); room.sweeper = null; }
    }, 5000);
  }
}

function pushQA(room) {
  if (room.host && room.host.open) room.host.json(qaForHost(room));
  for (const p of room.players.values()) {
    if (p.sock && p.sock.open) p.sock.json(qaForPlayer(room, p.id));
  }
}

function rank(room, playerId) {
  const list = playerList(room);
  const i = list.findIndex((p) => p.id === playerId);
  if (i < 0) return { rank: 0, of: list.length, tied: false, won: false, label: '' };
  const meta = placeMeta(list, i);
  meta.label = placePhrase(meta);
  return meta;
}

/** Where a player's team sits on the board, for their phone to show. */
function teamStanding(room, player) {
  if (room.mode !== 'teams' || player.team == null) return null;
  const rows = scoreRows(room);
  const i = rows.findIndex((r) => r.key === 't' + player.team);
  if (i === -1) return null;
  const meta = placeMeta(rows, i);
  return {
    team: rows[i].name,
    score: rows[i].score,
    rank: meta.rank,
    of: meta.of,
    tied: meta.tied,
    won: meta.won,
    label: placePhrase(meta)
  };
}

/** Per-learner finish summary for Results / session end. */
function finishPayload(room, player) {
  /* Race distance and shared boss health are not points competitions. */
  if (room.finishKind === 'race' || room.finishKind === 'boss') {
    return { score: player.score, kind: room.finishKind, won: false, tied: false,
      rank: null, of: 0, team: null, label: '', note: room.finishNote || '' };
  }
  const r = rank(room, player.id);
  const team = teamStanding(room, player);
  const won = team ? team.won : r.won;
  const tied = team ? team.tied : r.tied;
  return {
    score: player.score,
    rank: team ? team.rank : r.rank,
    of: team ? team.of : r.of,
    tied: !!tied,
    won: !!won,
    label: team ? team.label : r.label,
    team: team
  };
}

/** The currently open prompt, as a player needs to receive it. */
function learnerContext(room) {
  return { t:'context', sessionId:room.audit.meta.id, lesson:room.title, ...room.at };
}

/** Fan-out shape for an open question, including companion skin fields. */
function questionMessage(room, timeLimit) {
  const q = room.question;
  if (q.spoken) return {
    t: 'spoken', style: q.style, role: 'discuss',
    headPrompt: q.headPrompt || q.question,
    participation: q.participation || 'Listen and watch. Be ready to explain aloud.'
  };
  const msg = {
    t: 'question',
    n: q.index,
    question: q.question,
    options: q.options,
    input: q.input,
    range: q.range,
    confidence: q.confidence,
    count: q.options.length,
    total: q.total || 0,
    timeLimit: timeLimit != null ? timeLimit : q.timeLimit
  };
  if (q.style) msg.style = q.style;
  if (q.headPrompt) msg.headPrompt = q.headPrompt;
  if (q.clueMode) msg.clueMode = q.clueMode;
  if (q.clues) msg.clues = q.clues;
  return msg;
}

function sendContext(room, sock) {
  if (room.at.slideId) {
    const player = [...room.players.values()].find(p => p.sock === sock);
    sock.json({...learnerContext(room), reacted:!!(player && player.reactedSlides && player.reactedSlides.has(room.at.slideId))});
  }
}

function promptMessage(room) {
  if (!room.prompt) return null;
  return {
    t: 'prompt',
    kind: room.prompt.kind,
    prompt: room.prompt.prompt,
    options: room.prompt.options,
    ends: room.prompt.ends,
    max: room.prompt.max
  };
}

/** Move everyone held in the waiting room into play. */
/* Open at a junction, shut while explaining, unless the host has said
   otherwise. Blanked phones close it regardless: there is nothing to put a
   hand up about on a dark screen.
   This governs questions and the Got it acknowledgement. Pace signals are
   outside it on purpose — see the signal handler. */
function floorIsOpen(room) {
  if (!room || room.phonesBlank) return false;
  if (room.floor === 'open') return true;
  if (room.floor === 'shut') return false;
  return room.at && room.at.activity !== 'content';
}

function admitWaiting(room) {
  if (!room.waiting.size) return;
  for (const p of room.waiting.values()) {
    if (!p.sock || !p.sock.open) continue;
    room.players.set(p.id, p);
    room.waiting.delete(p.id);
    record(room, 'admit', {id:p.id});
    p.sock.json({
      t: 'joined',
      name: p.name,
      title: room.title,
      phase: room.phase,
      mode: room.mode,
      team: p.team,
      teamName: p.team != null ? room.teams[p.team] : null,
      admitted: true,
      round: room.roundNo,
      reactions: room.reactions,
      phonesBlank: room.phonesBlank,
      floor: floorIsOpen(room)
    });
    sendContext(room, p.sock);
    const open = promptMessage(room);
    if (open) p.sock.json(open);
    log('room ' + room.pin + ' admitted ' + p.name +
        (p.team != null ? ' [' + room.teams[p.team] + ']' : '') +
        ' (' + room.players.size + ')');
  }
  // Disconnected waiting participants keep their identity for a later resume.
}

function record(room, type, data) {
  if (!room.audit) return;
  const ok = Sessions.append(room.audit, type, data);
  if (room.host && room.host.open) room.host.json({t:'recording', id:room.audit.meta.id, persisted:ok, updatedAt:Date.now()});
}

function closeRoom(room, reason) {
  if (!rooms.has(room.pin)) return;
  if (room.sweeper) { clearInterval(room.sweeper); room.sweeper = null; }
  if (room.hostGrace) { clearTimeout(room.hostGrace); room.hostGrace = null; }
  record(room, 'end', {reason:reason || 'The host ended the session.'});
  if (room.host && room.host.open) room.host.json({t:'sessionClosed', report:Sessions.project(room.audit)});
  const why = reason || 'The host ended the quiz.';
  /* Tell the big screens the lesson is over rather than leaving them frozen on
     whatever slide was up when it ended. */
  if (room.watchers) {
    for (const w of room.watchers) { if (w.open) w.json({ t: 'watchEnd', message: why }); }
    room.watchers.clear();
  }
  for (const p of room.players.values()) {
    if (p.sock && p.sock.open) {
      p.sock.json(Object.assign({ t: 'over', reason: why }, finishPayload(room, p)));
    }
  }
  for (const p of room.waiting.values()) {
    if (p.sock && p.sock.open) p.sock.json({ t: 'over', reason: why });
  }
  rooms.delete(room.pin);
  log('room ' + room.pin + ' closed (' + (reason || 'host left') + ')');
}

function log(msg) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log('[' + t + '] ' + msg);
}

/* ------------------------------------------------------------ relay */

ws.attach(server, (sock, req) => {
  let role = null;      // 'host' | 'player'
  let room = null;
  let me = null;        // player record
  /* Fixed at connect: the host's own view of where the app lives, which is
     what the room must hand out. */
  const joinUrl = joinUrlFor(req);

  sock.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    /* ---- host side ---- */

    /* Coming back to a room that is being held. Deliberately narrow: the pin
       must exist, the token must match, and the room must actually be without
       a host — this cannot be used to take a room off somebody still in it. */
    if (m.t === 'rehost') {
      if (role) return;
      const target = rooms.get(String(m.pin || ''));
      if (!target || typeof m.hostToken !== 'string' || m.hostToken.length !== 64) {
        sock.json({ t: 'rehostFailed', reason: 'That lesson is no longer open.' });
        return;
      }
      if (target.hostToken !== m.hostToken || (target.host && target.host.open)) {
        sock.json({ t: 'rehostFailed', reason: 'That lesson is no longer open.' });
        return;
      }
      role = 'host';
      room = target;
      room.host = sock;
      room.joinUrl = joinUrl;
      room.hostAwaySince = null;
      if (room.hostGrace) { clearTimeout(room.hostGrace); room.hostGrace = null; }
      broadcast(room, { t: 'hostAway', away: false });
      sock.json({
        t: 'rehosted',
        phase: room.phase,
        pin: room.pin,
        hostToken: room.hostToken,
        joinUrl: room.joinUrl,
        mode: room.mode,
        teams: room.teams,
        title: room.title,
        session: { id: room.audit.meta.id, title: room.title, createdAt: room.audit.meta.createdAt }
      });
      pushPlayers(room);
      log('room ' + room.pin + ' host back');
      return;
    }

    if (m.t === 'host') {
      if (role) return;
      role = 'host';
      const pin = newPin();
      const teams = (Array.isArray(m.teams) ? m.teams : [])
        .map((t) => String((t && t.name) || t || '').trim().slice(0, 20))
        .filter(Boolean)
        .slice(0, 6);
      room = {
        pin,
        title: String(m.title || 'Quiz').slice(0, 80),
        host: sock,
        joinUrl,
        /* The same courtesy a player already gets. A learner who drops keeps
           their seat; before this the host who dropped destroyed the room, so
           one reload mid-lecture ended the lesson for everybody. */
        hostToken: crypto.randomBytes(32).toString('hex'),
        hostAwaySince: null,
        hostGrace: null,
        // teams mode needs at least two teams to be meaningful
        mode: m.mode === 'teams' && teams.length >= 2 ? 'teams' : 'individual',
        teams,
        players: new Map(),
        /* Players who arrived after the window shut. They keep their name and
           team and are pulled in when the next round opens. */
        waiting: new Map(),
        joinOpen: true,
        roundNo: 0,
        roundGame: null,
        oralCounts: new Map(),
        /* Team scores accumulate per question rather than being recomputed
           from the current roster, so a player joining later can never dilute
           questions they were not present for. */
        teamScores: teams.map(function () { return 0; }),
        teamGain: teams.map(function () { return false; }),
        question: null,
        askedAt: 0,
        /* Bumped by every answer accepted. The host marks from the answers it
           has been pushed, so it quotes this back when it reveals; if it has
           moved on the host marked a stale set. See the reveal handler. */
        answerRev: 0,
        /* Set the moment the host tries to reveal. A re-mark after a stale
           snapshot then works on a set that cannot grow again, so the retry
           always succeeds and nobody's answer is dropped by a race. */
        answersClosed: false,
        /* An open feedback prompt, independent of the quiz flow: a deck can
           collect from the room without any game in it. */
        prompt: null,
        replies: new Map(),      // playerId -> [strings] or [choiceIndex]
        /* Moderated Q&A. Ambient: open for the whole session rather than tied
           to a slide, because a question occurs to someone when it occurs to
           them. Nothing reaches the room until the host approves it. */
        qa: new Map(),           // id -> { id, text, name, playerId, at, state, votes:Set }
        qaNextId: 1,
        qaPinned: null,
        /* How the room says the lesson is going: lost, too fast, too slow.
           Ambient like Q&A, but unlike Q&A it decays — "I am lost" is about
           now, and a hand raised on slide 3 must not still be up on slide 20.
           playerId is the key so one person counts once and can change their
           mind; it is deliberately never sent anywhere or journalled, because
           a signal nobody will admit to sending is a signal nobody sends. */
        signals: new Map(),      // playerId -> { kind, at }
        sweeper: null,
        /* Reactions are a live control rather than an authored setting: what
           "host-togglable" has to mean for something social is that it can be
           switched off in the moment it is being abused, not before the
           lesson in a settings panel. Session-scoped, on by default. */
        reactions: true,
        /* Phones dark, on the host's say-so: a digression, a slide the room
           should not have in their hand, or simply "eyes up". Room state
           rather than a broadcast, because a phone that rejoins mid-blank has
           to arrive blank — otherwise the one student who reconnects is the
           one student still looking down. Session-scoped, off by default. */
        phonesBlank: false,
        /* Whether the room may put a hand up or ask something. 'auto' follows
           the deck, which already knows where its junctions are: room.at
           .activity is 'content' while the host is explaining and something
           else at a check, a question or a moment. The two explicit settings
           are for when the teacher disagrees with the deck. */
        floor: 'auto',
        reactAt: new Map(),      // playerId -> when they last reacted
        reactBurst: [],          // recent reaction times, for the room ceiling
        /* Where the host is. Sent with each slide so a signal can be filed
           against the thing the room was actually looking at. */
        at: { slideId: '', title: '', n: 0 },
        phase: 'lobby',
        nextId: 1,
        asked: 0
      };
      let created;
      try { created = Sessions.create(room.title, room.mode, room.teams); }
      catch (_) { role = null; room = null; sock.json({t:'error',message:'Could not create a session record. Check free disk space and folder permissions before hosting.'}); return; }
      room.audit = created.session;
      rooms.set(pin, room);
      sock.json({
        t: 'hosted',
        session: {id:room.audit.meta.id, token:created.token, title:room.title, createdAt:room.audit.meta.createdAt},
        hostToken: room.hostToken,
        pin,
        joinUrl: room.joinUrl,
        mode: room.mode,
        teams: room.teams
      });
      log('room ' + pin + ' opened — "' + room.title + '" (' + room.mode +
          (room.mode === 'teams' ? ': ' + room.teams.join(', ') : '') + ')');
      return;
    }

    if (role === 'host') {
      if (!room) return;

      if (m.t === 'manualAdd') {
        if (room.phase === 'question') { sock.json({t:'manualError',message:'Add participants between questions.'}); return; }
        const names = (Array.isArray(m.names) ? m.names : []).slice(0,200).map(n => String(n).trim().slice(0,24)).filter(Boolean);
        const team = room.mode === 'teams' ? Number(m.team) : null;
        /* Said, not swallowed. A bare return here meant pressing "Add names"
           in a teams room did nothing whatsoever — no names, no message, no
           reason — which is indistinguishable from the feature being broken. */
        if (room.mode === 'teams' && (!Number.isInteger(team) || team < 0 || team >= room.teams.length)) {
          sock.json({t:'manualError',message:'Choose which team these learners are on first.'});
          return;
        }
        const taken = new Set([...room.players.values(),...room.waiting.values()].map(p => p.name.toLowerCase()));
        if (!names.length || names.some(n => { const key=n.toLowerCase(); if(taken.has(key)) return true; taken.add(key); return false; }) || room.players.size+room.waiting.size+names.length > 200) {
          sock.json({t:'manualError',message:'Use unique names, up to 200 participants in total.'}); return;
        }
        for (const name of names) {
          const p={id:room.nextId++,name,team,manual:true,score:0,correctCount:0,askedCount:0,answeredCount:0,answer:null,sure:null,answeredAt:0,lastGain:0,sock:null};
          room.players.set(p.id,p);
          record(room,'join',{id:p.id,name,team,admitted:true,source:'teacher'});
        }
        pushPlayers(room); return;
      }
      if (m.t === 'manualRename') {
        const p = room.players.get(Number(m.playerId)) || room.waiting.get(Number(m.playerId));
        const name = String(m.name || '').trim().slice(0, 24);
        if (!p) { sock.json({t:'manualError',message:'That name is not in the room.'}); return; }
        if (!name) { sock.json({t:'manualError',message:'Type a name first.'}); return; }
        const taken = [...room.players.values(), ...room.waiting.values()]
          .some(x => x.id !== p.id && x.name.toLowerCase() === name.toLowerCase());
        if (taken) { sock.json({t:'manualError',message:'Use unique names.'}); return; }
        if (p.name !== name) {
          p.name = name;
          record(room, 'rename', {id: p.id, name});
          pushPlayers(room);
          pushTally(room);
        }
        return;
      }
      if (m.t === 'manualTeam') {
        const p = room.players.get(Number(m.playerId)) || room.waiting.get(Number(m.playerId));
        const team = Number(m.team);
        if (!p) { sock.json({t:'manualError',message:'That name is not in the room.'}); return; }
        if (room.mode !== 'teams' || !Number.isInteger(team) || team < 0 || team >= room.teams.length) {
          sock.json({t:'manualError',message:'Pick a team that exists in this room.'}); return;
        }
        if (p.team !== team) {
          p.team = team;
          record(room, 'team', {id: p.id, team});
          pushPlayers(room);
        }
        return;
      }
      if (m.t === 'manualRemove') {
        const id = Number(m.playerId);
        const fromPlayers = room.players.get(id);
        const fromWaiting = room.waiting.get(id);
        const p = fromPlayers || fromWaiting;
        if (!p) { sock.json({t:'manualError',message:'That name is not in the room.'}); return; }
        const kind = m.mode === 'kick' ? 'kick' : 'remove';
        if (fromPlayers) room.players.delete(id);
        else room.waiting.delete(id);
        if (room.question && room.question.eligible) room.question.eligible.delete(id);
        if (room.signals) room.signals.delete(id);
        record(room, kind, {id: p.id, name: p.name, source: p.manual ? 'teacher' : 'device'});
        const phone = p.sock;
        p.sock = null;
        if (phone && phone.open) {
          phone.json({t:'kicked', reason: kind === 'kick'
            ? 'The teacher removed you from this room.'
            : 'The teacher deleted this name from the room.'});
          phone.close();
        }
        pushPlayers(room);
        pushTally(room);
        if (room.signals) pushSignals(room);
        return;
      }
      if (m.t === 'manualAnswer') {
        const p=room.players.get(Number(m.playerId)), q=room.question;
        const refuse = message => sock.json({t:'manualError',message,
          playerId:Number(m.playerId),id:String(m.id || '')});
        if (!p || !p.manual) {
          refuse('That name is not a teacher-entered row. Phone answers stay on the phone.');
          return;
        }
        if (!q || room.phase !== 'question' || m.id !== q.id) {
          refuse('No open question to record against. Wait until the quiz slide is up.');
          return;
        }
        if (room.answersClosed) {
          refuse('This question is already revealed. Move on, then record the next one.');
          return;
        }
        if (q.spoken) { refuse('Use the teacher verdict and recipient control for this spoken answer.'); return; }
        if (!q.eligible.has(p.id)) {
          refuse('That learner was not in the room when this question opened.');
          return;
        }
        let response=null;
        if (!m.clear) {
          if(q.input==='text') {
            response=String(m.text || '').trim().slice(0,120);
            if(!response) { refuse('Type an answer before recording it.'); return; }
          } else if(q.input==='number') {
            if(typeof m.value!=='number' || !Number.isFinite(m.value) || Math.abs(m.value)>1e12) {
              refuse('Enter a valid number before recording it.'); return;
            }
            response=m.value;
          } else if(q.input==='order') {
            const n=q.options.length;
            if(!Array.isArray(m.order) || m.order.length!==n ||
              new Set(m.order).size!==n || m.order.some(v=>!Number.isInteger(v)||v<0||v>=n)) {
              refuse('Choose every item once to record an order.'); return;
            }
            response=m.order.slice();
          } else if(q.input==='choice'||q.input==='tap') {
            if(!Number.isInteger(m.choice) || m.choice<0 || m.choice>=q.options.length) {
              refuse('Choose an available option before recording it.'); return;
            }
            response=m.choice;
          } else { refuse('This answer type cannot be recorded here.'); return; }
        }
        p.answer=response; p.sure=null; p.answeredAt=Date.now(); room.answerRev++;
        record(room,'manualAnswer',{attempt:q.attempt,playerId:p.id,input:q.input,choice:(q.input==='choice'||q.input==='tap')?response:null,text:q.input==='text'?response:null,value:q.input==='number'?response:null,order:q.input==='order'?response:null,clear:!!m.clear,sure:null,source:'teacher',elapsedMs:null});
        pushTally(room); return;
      }

      if (m.t === 'report') {
        sock.json({t:'sessionReport',report:Sessions.project(room.audit,true)});
      } else if (m.t === 'round') {
        /* A new game in the deck is a new round: the window reopens and
           anyone held back is pulled in before the first question goes out. */
        room.roundGame = String(m.gameId || '');
        room.roundNo++;
        room.oralCounts.set(room.roundGame, 0);
        room.joinOpen = true;
        admitWaiting(room);
        broadcast(room, { t: 'roundOpen', n: room.roundNo });
        pushPlayers(room);
        log('room ' + room.pin + ' round ' + room.roundNo + ' open' +
            (room.waiting.size ? '' : '') + ' (' + room.players.size + ' playing)');

      } else if (m.t === 'begin') {
        if (room.phase !== 'lobby') return;
        record(room, 'begin', {});
        room.phase = 'running';
        broadcast(room, { t: 'begun' });
        log('room ' + room.pin + ' started with ' + room.players.size + ' player(s)');

      } else if (m.t === 'question') {
        /* Three ways to answer: pick one of the options, type it, or place a
           value on a line. Only the first has options at all — that is what
           makes the others recall rather than recognition — so the option
           count is checked for that kind alone. */
        const input = ['text', 'number', 'order', 'tap'].includes(m.input) ? m.input : 'choice';
        const spoken = m.spoken === true && ['headsup','spinexplain','connection','conceptchain','randomchallenge'].includes(m.style);
        if (input === 'choice' && (!Array.isArray(m.options) || m.options.length < 2 || m.options.length > 6)) return;
        /* Spot the Error: the options are the words of the passage. */
        if (input === 'tap' && (!Array.isArray(m.options) || m.options.length < 2 || m.options.length > 80)) return;
        if (input === 'order' && (!Array.isArray(m.options) || m.options.length < 3 || m.options.length > 8)) return;
        if (room.question && room.question.id === String(m.id || '') && room.phase === 'question') return;
        room.asked++;
        room.answerRev = 0;
        room.answersClosed = false;
        room.question = {
          id: String(m.id || '').slice(0,160),
          attempt: crypto.randomUUID(),
          input,
          spoken,
          gameId: String(m.gameId || room.roundGame || '').slice(0,160),
          scoreSpoken: m.scoreSpoken === true,
          participation: spoken ? String(m.participation || '').slice(0,240) : '',
          question: String(m.question || '').slice(0,2000),
          bloom: ['Remember','Understand','Apply','Analyze','Evaluate','Create'].includes(m.bloom) ? m.bloom : '',
          sourceSlideId: String(m.sourceSlideId || '').slice(0,160),
          options: (input === 'choice' || input === 'order' || input === 'tap') && Array.isArray(m.options) ? m.options.map(o => String(o).slice(0,2000)) : [],
          /* What a wrong option means, by the same index as `options`.
             Carried into the journal so the report can name a misconception
             the room actually walked into, and never sent to a phone — see
             questionMessage, which lists what players get. Naming the
             misconception behind option C would give away that C is wrong. */
          misconceptions: input === 'choice' && Array.isArray(m.misconceptions)
            ? m.misconceptions.slice(0, 6).map(x => String(x == null ? '' : x).slice(0, 120))
            : [],
          /* Forwarded to the phones so the slider has a line to slide along,
             and nothing else. The relay does not judge a value against it —
             it is the shape of the control, the way `options` is the shape of
             the answer pads. */
          range: input === 'number' ? {
            min: Number(m.range && m.range.min) || 0,
            max: Number(m.range && m.range.max) || 100,
            step: Math.abs(Number(m.range && m.range.step)) || 1,
            unit: String((m.range && m.range.unit) || '').slice(0, 12)
          } : null,
          timeLimit: Math.max(0, Number(m.timeLimit) || 0),
          points: Math.max(0, Number(m.points) || 1000),
          /* Whether the phones ask how sure they were. Passed through, not
             decided here — it is an authoring choice. */
          confidence: m.confidence === true,
          /* Peer instruction: collected, never resolved. Carried only so the
             journal can say the reveal was withheld on purpose. */
          voteOnly: m.voteOnly === true,
          /* A pick, not an answer: not marked, not counted in accuracy. */
          unmarked: m.unmarked === true,
          /* True/False Showdown: the split is shown mid-question and each
             phone may switch once (see 'showdown' below). */
          showdown: m.showdown === true && input === 'choice',
          split: null,
          switched: 0,
          // the host knows where this question sits in the deck; fall back to
          // a running count if an older client doesn't send it
          index: Number(m.n) > 0 ? Number(m.n) : room.asked,
          total: Math.max(0, Number(m.total) || 0),
          /* Companion skin — identity for the phone UI, never the answer. */
          style: String(m.style || '').slice(0, 40),
          headPrompt: String(m.headPrompt || '').slice(0, 200),
          clueMode: m.clueMode === 'emoji' ? 'emoji' : '',
          clues: String(m.clues || '').slice(0, 80)
        };
        room.askedAt = Date.now();
        room.phase = 'question';
        if (room.joinOpen) {
          room.joinOpen = false;
          broadcast(room, { t: 'joinClosed' });
          // the host's rail shows the window state, so it needs telling too
          pushPlayers(room);
          log('room ' + room.pin + ' joining closed (' + room.players.size + ' playing)');
        }
        /* Snapshot who is eligible. Someone joining mid-question never sees it
           and so can never answer it — counting them would mean "everyone has
           answered" is never true and the auto-reveal stalls forever. */
        room.question.eligible = new Set([...room.players.values()].filter(p => p.manual || (p.sock && p.sock.open)).map(p => p.id));
        record(room, 'question', {...room.question, eligible:[...room.question.eligible]});
        for (const p of room.players.values()) {
          p.answer = null;
          p.sure = null;
          p.answeredAt = 0;
          p.lastGain = 0;
          p.switched = false;
        }
        broadcast(room, questionMessage(room));
        pushTally(room);

      } else if (m.t === 'showdown') {
        /* Show the room its own split, mid-question, and open one switch per
           phone. Counted here from the answers themselves, so the number on
           every phone is the relay's and nobody's guess. */
        const q = room.question;
        if (!q || room.phase !== 'question' || !q.showdown || q.split || room.answersClosed ||
            (m.id && m.id !== q.id)) return;
        const counts = new Array(q.options.length).fill(0);
        for (const p of room.players.values()) {
          if (q.eligible && !q.eligible.has(p.id)) continue;
          if (Number.isInteger(p.answer) && p.answer >= 0 && p.answer < counts.length) counts[p.answer]++;
        }
        q.split = counts;
        record(room, 'showdown', { attempt: q.attempt, counts });
        for (const p of room.players.values()) {
          if (p.sock && p.sock.open && (!q.eligible || q.eligible.has(p.id))) {
            p.sock.json({ t: 'showdown', id: q.id, counts, options: q.options, mine: p.answer });
          }
        }
        pushTally(room);

      } else if (m.t === 'reveal') {
        if (!room.question || room.phase !== 'question' || (m.id && m.id !== room.question.id)) return;
        /* Whether an answer is right is decided by the host and arrives here
           as a verdict per player. The relay does not know what any answer
           means — see markResponse in js/model.js. `correct` is still carried
           for a choice question, but only to label the tally and the race
           breakdown; it no longer decides anything. */
        room.answersClosed = true;
        /* Keyed by the id as a string on both sides: player ids are numbers
           here, and a host that echoes one back as a string would otherwise
           mark nobody and look like a stale snapshot. */
        const marks = new Map();
        if (Array.isArray(m.marks)) {
          for (const row of m.marks) {
            if (Array.isArray(row) && row[0] != null) marks.set(String(row[0]), !!row[1]);
          }
        }
        /* The host marked from a snapshot of the answers. If one landed after
           that snapshot the host has not seen it, and scoring it wrong would
           punish a student for a coincidence of timing. Hand the answers back
           and let the host re-mark: reveal has not happened yet. */
        if (Number(m.rev) !== room.answerRev) {
          if (room.host) {
            room.host.json({ t: 'markStale', id: room.question.id,
              rev: room.answerRev, answers: answersFor(room) });
          }
          return;
        }
        const unmarked = [...room.players.values()].filter(
          (p) => p.answer != null && !marks.has(String(p.id)) &&
                 (!room.question.eligible || room.question.eligible.has(p.id)));
        /* A vote that is not marked (Odd One Out) has no verdicts to wait for. */
        if (unmarked.length && !room.question.unmarked) {
          if (room.host) {
            room.host.json({ t: 'markStale', id: room.question.id,
              rev: room.answerRev, answers: answersFor(room) });
          }
          return;
        }
        const choosing = room.question.input === 'choice';
        const correct = Number(m.correct);
        const correctIndex = choosing && Number.isInteger(correct) &&
          correct >= 0 && correct < room.question.options.length ? correct : -1;
        if (choosing && correctIndex < 0) return;
        const why = String(m.explanation || '').slice(0, 1200);
        const answerText = String(m.answer || '').slice(0, 200);
        const gainMap = new Map();
        if (Array.isArray(m.gains)) {
          for (const row of m.gains) {
            if (Array.isArray(row) && row[0] != null && typeof row[1] === 'number' && Number.isFinite(row[1])) {
              gainMap.set(String(row[0]), Math.round(row[1]));
            }
          }
        }
        const spoken = room.question.spoken;
        const accepted = spoken && (room.question.style === 'spinexplain'
          ? correctIndex === 0 || correctIndex === 1 : correctIndex === 0);
        /* An accepted explanation is worth what a whole team answering one
           question right is worth: the quiz scale, not 1 or 2. Team scores
           are one ledger across the lesson, and a spoken credit of 1 beside
           quiz averages of up to 1,000 never registered. "With a hint" in
           Spin & Explain is half. Heads Up and Random Challenge count only. */
        const oralPoints = !accepted || ['headsup','randomchallenge'].includes(room.question.style)
          ? 0 : room.question.style === 'spinexplain' && correctIndex === 1
            ? SPOKEN_POINTS / 2 : SPOKEN_POINTS;
        const recipient = spoken && m.spoken && typeof m.spoken === 'object' ? m.spoken.recipient : null;
        const recipientPlayer = recipient && recipient.type === 'player'
          ? room.players.get(Number(recipient.id)) : null;
        const eligibleSpeaker = recipientPlayer && room.question.eligible.has(recipientPlayer.id)
          ? recipientPlayer : null;
        const recipientTeam = recipient && recipient.type === 'team' &&
          Number.isInteger(recipient.id) && recipient.id >= 0 && recipient.id < room.teams.length
          ? recipient.id : eligibleSpeaker && Number.isInteger(eligibleSpeaker.team)
            ? eligibleSpeaker.team : null;
        room.phase = 'revealed';
        for (const p of room.players.values()) {
          /* How much of the lesson this learner was actually asked, and how
             much of it they answered. Without these the only per-person number
             the room ever had was game points, which is a measure of winning
             rather than of understanding — and which says nothing at all about
             the learner who answered three of nine. */
          const wasAsked = !room.question.eligible || room.question.eligible.has(p.id);
          if (wasAsked && !spoken && !room.question.unmarked) {
            p.askedCount = (p.askedCount || 0) + 1;
            if (p.answer != null) p.answeredCount = (p.answeredCount || 0) + 1;
          }
          let gained = 0;
          if (spoken) {
            gained = room.mode === 'individual' && room.question.scoreSpoken &&
              room.question.style !== 'headsup' && eligibleSpeaker === p ? oralPoints : 0;
          } else if (gainMap.has(String(p.id))) {
            gained = gainMap.get(String(p.id));
            if (marks.get(String(p.id)) === true) p.correctCount++;
          } else if (marks.get(String(p.id)) === true) {
            if (room.question.timeLimit > 0 && ![...room.players.values()].some(p => p.manual)) {
              const elapsed = (p.answeredAt - room.askedAt) / 1000;
              const speed = Math.max(0, 1 - elapsed / room.question.timeLimit);
              gained = Math.round(room.question.points * (0.5 + 0.5 * speed));
            } else {
              gained = room.question.points;
            }
            p.correctCount++;
          }
          p.score = Math.max(0, p.score + gained);
          p.lastGain = gained;
          p.lastRight = spoken || room.question.unmarked ? null : marks.get(String(p.id)) === true;
        }

        /* Each question contributes its own per-team average. Summing those
           averages is what makes team size irrelevant and makes the score
           immune to who joins later. */
        if (room.mode === 'teams' && spoken) {
          room.teamGain = room.teams.map(() => false);
          if (oralPoints && recipientTeam != null) {
            room.teamScores[recipientTeam] += oralPoints;
            room.teamGain[recipientTeam] = true;
          }
        } else if (room.mode === 'teams') {
          const elig = room.question.eligible;
          room.teams.forEach((_, ti) => {
            const members = [...room.players.values()].filter(
              (p) => p.team === ti && (!elig || elig.has(p.id))
            );
            if (!members.length) { room.teamGain[ti] = false; return; }
            const avg = members.reduce((sum, p) => sum + p.lastGain, 0) / members.length;
            room.teamScores[ti] += avg;
            room.teamGain[ti] = avg > 0;
          });
        }
        let oralCount = null;
        if (spoken) {
          const gameId = room.question.gameId;
          oralCount = (room.oralCounts.get(gameId) || 0) + (accepted ? 1 : 0);
          room.oralCounts.set(gameId, oralCount);
          if (room.host && room.host.open) room.host.json({t:'oralCount',gameId,
            slideId:room.question.id,kind:room.question.style,count:oralCount,accepted});
        }
        for (const p of room.players.values()) {
          if (!p.sock || !p.sock.open) continue;
          const r = rank(room, p.id);
          p.sock.json({
            t: 'result',
            spoken,
            unmarked: room.question.unmarked === true,
            /* Showdown: whether this phone changed its mind after the split. */
            switched: !!p.switched,
            split: room.question.split || null,
            /* What this phone picked, for a vote that has no right answer. */
            picked: room.question.unmarked && Number.isInteger(p.answer)
              ? String(room.question.options[p.answer] || '').slice(0, 200) : '',
            oralCount,
            oralAccepted: !!accepted,
            /* Who the credit went to, as this phone may hear it: "yours",
               or the team's name. Never another student's name. */
            oralYou: !!(spoken && accepted && eligibleSpeaker === p),
            oralTeam: spoken && accepted && recipientTeam != null && room.teams[recipientTeam] != null
              ? String(room.teams[recipientTeam].name || room.teams[recipientTeam]).slice(0, 40) : '',
            oralPoints: spoken && accepted && recipientTeam != null ? oralPoints : 0,
            right: p.lastRight,
            answered: p.answer != null,
            gained: p.lastGain,
            score: p.score,
            /* Their own running tally. Both halves are already kept for the
               report; a learner wants them more than the raw points, which
               only mean anything next to somebody else's. */
            correct: p.correctCount || 0,
            asked: p.askedCount || 0,
            rank: r.rank,
            of: r.of,
            tied: r.tied,
            won: r.won,
            label: r.label,
            team: teamStanding(room, p),
            answer: answerText,
            why: why
          });
        }
        /* A race advances a team on the answer most of its members picked, so
           the host needs the per-team breakdown, not just the room total.
           Sent as its own message because it belongs to this question. */
        if (room.host && choosing) {
          const elig = room.question.eligible;
          const width = room.question.options.length;
          room.host.json({
            t: 'teamAnswers',
            correct: correctIndex,
            counts: room.teams.map(function (_, ti) {
              const row = new Array(width).fill(0);
              for (const p of room.players.values()) {
                if (p.team !== ti) continue;
                if (elig && !elig.has(p.id)) continue;
                if (p.answer != null && p.answer >= 0 && p.answer < width) row[p.answer]++;
              }
              return row;
            })
          });
        }

        record(room, 'reveal', {attempt:room.question.attempt, correct: correctIndex,
          answer: answerText, explanation: why,
          spoken: spoken ? {accepted:!!accepted,count:oralCount,
            recipient: eligibleSpeaker ? eligibleSpeaker.name :
              recipientTeam != null ? room.teams[recipientTeam] : null,
            points:room.mode === 'teams' && recipientTeam != null ? oralPoints :
              room.mode === 'individual' && room.question.scoreSpoken && eligibleSpeaker ? oralPoints : 0} : null,
          /* The verdicts, not the correct index: for a typed question the
             index means nothing, and the report has to say who was right. */
          marks: [...room.players.values()].filter(p => marks.has(String(p.id))).map(p => [p.id, marks.get(String(p.id)) === true]),
          scores:[...room.players.values()].map(p => ({id:p.id,score:p.score}))});
        pushPlayers(room);
        pushTally(room);

      } else if (m.t === 'prompt') {
        /* Opening a prompt clears the previous one's replies: they belong to
           the slide that asked, not to the session. */
        if (!['poll','wordcloud','brainstorm','scale'].includes(m.kind)) return;
        room.prompt = {
          attempt: crypto.randomUUID(),
          bloom: ['Remember','Understand','Apply','Analyze','Evaluate','Create'].includes(m.bloom) ? m.bloom : '',
          id: String(m.id || ''),
          kind: String(m.kind || 'poll'),
          prompt: String(m.prompt || '').slice(0, 240),
          options: (Array.isArray(m.options) ? m.options : []).map(o => String(o).slice(0,500)).slice(0, 6),
          /* Carried into the journal and never sent to a phone: it is the
             host's own note about what to do with the responses. */
          nextStep: String(m.nextStep || '').slice(0, 600),
          /* A scale is answered like a poll — an index among the points — so
             the two ends are forwarded for the phone to label its buttons and
             nothing more. The relay counts indices either way. */
          ends: m.kind === 'scale' ? {
            low: String((m.ends && m.ends.low) || '').slice(0, 40),
            high: String((m.ends && m.ends.high) || '').slice(0, 40)
          } : null,
          max: Math.max(1, Math.min(5, Number(m.max) || 1))
        };
        room.replies = new Map();
        record(room, 'prompt', {...room.prompt});
        broadcast(room, promptMessage(room));
        pushFeedback(room);
        log('room ' + room.pin + ' prompt open (' + room.prompt.kind + ')');

      } else if (m.t === 'promptEnd') {
        room.prompt = null;
        room.replies = new Map();
        broadcast(room, { t: 'promptEnd' });

      } else if (m.t === 'qaModerate') {
        const item = room.qa.get(Number(m.id));
        /* Actions and states are named separately on purpose — mapping them
           explicitly rather than reusing the verb as the noun. Deriving one
           from the other turned "dismiss" into a state called 'dismiss',
           which silently broke every filter looking for 'dismissed'. */
        const STATE = { approve: 'approved', dismiss: 'dismissed', answered: 'answered', pending: 'pending' };
        const next = STATE[String(m.action || '')];
        if (!item || !next) return;
        item.state = next;
        /* A dismissed or answered question cannot stay on the wall. */
        if (room.qaPinned && room.qaPinned.id === item.id && item.state !== 'approved') {
          room.qaPinned = null;
        }
        record(room, 'qaModerate', { id: item.id, state: item.state });
        pushQA(room);

      } else if (m.t === 'qaPin') {
        const item = m.id == null ? null : room.qa.get(Number(m.id));
        /* Only an approved question can be shown — pinning is a display
           action, not a second route past moderation. */
        room.qaPinned = item && item.state === 'approved'
          ? { id: item.id, text: item.text, name: item.name, votes: item.votes.size }
          : null;
        record(room, 'qaPin', { id: room.qaPinned ? room.qaPinned.id : null });
        pushQA(room);

      } else if (m.t === 'floor') {
        room.floor = ['auto', 'open', 'shut'].includes(m.mode) ? m.mode : 'auto';
        broadcast(room, { t: 'floor', open: floorIsOpen(room), mode: room.floor });
        log('room ' + room.pin + ' floor ' + room.floor);

      } else if (m.t === 'blankSoon') {
        /* A warning before the phones go dark: "phones down in 10". The host
           runs the clock and sends blankPhones when it ends; this only tells
           the phones, so a student can finish the sentence they are typing.
           seconds 0 takes the warning back. */
        const secs = Math.max(0, Math.min(60, Math.round(Number(m.seconds) || 0)));
        broadcast(room, { t: 'blankSoon', seconds: secs });
        log('room ' + room.pin + (secs ? ' phones blank in ' + secs + 's' : ' blank countdown cancelled'));

      } else if (m.t === 'blankPhones') {
        room.phonesBlank = m.on === true;
        broadcast(room, { t: 'blankPhones', on: room.phonesBlank });
        broadcast(room, { t: 'floor', open: floorIsOpen(room), mode: room.floor });
        log('room ' + room.pin + ' phones ' + (room.phonesBlank ? 'blanked' : 'restored'));

      } else if (m.t === 'reactions') {
        room.reactions = m.on !== false;
        /* The phones are told, so the control disappears from them rather
           than sending into a void. */
        broadcast(room, { t: 'reactions', on: room.reactions });
        log('room ' + room.pin + ' reactions ' + (room.reactions ? 'on' : 'off'));

      } else if (m.t === 'at') {
        /* Just where the host is. A pace signal is filed against the slide the
           room was looking at when they sent it, which is the only form of it
           that is any use afterwards.

           A spectator connecting mid-lesson needs the current position, so it
           is kept below as room.lastAt — taken from room.at after it has been
           sanitised, never from the raw message. */
        const moved = room.at.slideId !== String(m.slideId || '').slice(0,160);
        room.at = {
          slideId: String(m.slideId || '').slice(0, 160),
          title: String(m.title || '').slice(0, 200),
          n: Math.max(0, Number(m.n) || 0),
          total: Math.max(0, Number(m.total) || 0),
          /* Bounded like everything else here. A build step is a small
             integer; anything else is a client sending nonsense. */
          step: Math.max(0, Math.min(99, Number(m.step) || 0)),
          activity: ['content','question','feedback','moment'].includes(m.activity) ? m.activity : 'content',
          text: String(m.text || '').slice(0,2400),
          bloom: String(m.bloom || '').slice(0,24),
          style: String(m.style || '').slice(0, 40),
          role: ['watch','discuss','paper','wait'].includes(m.role) ? m.role : '',
          participation: String(m.participation || '').slice(0, 240),
          headPrompt: String(m.headPrompt || '').slice(0, 200),
          stage: cleanStage(m.stage)
        };
        if (moved && room.prompt) {
          room.prompt = null;
          room.replies = new Map();
          broadcast(room, {t:'promptEnd'});
        }
        if (room.at.activity !== 'question' && room.phase !== 'lobby') {
          room.phase = 'idle';
          room.question = null;
          room.joinOpen = true;
          admitWaiting(room);
          pushPlayers(room);
        }
        room.lastAt = learnerContext(room);
        broadcast(room, room.lastAt);
        /* Moving between a content slide and a check changes who may speak, so
           it travels with the slide rather than waiting for the next toggle. */
        broadcast(room, { t: 'floor', open: floorIsOpen(room), mode: room.floor });
        pushBookmarks(room);
        if (moved && room.signals.size) {
          room.signals.clear();
          broadcast(room, {t:'signalled',kind:null});
          pushSignals(room);
        }

      } else if (m.t === 'oral') {
        /* A teacher's verdict on something a learner said out loud, on a board
           the phones never touch. The board's own state stays disposable, but
           the verdict is evidence, so it is journalled like any other check.
           Credited to a team or to the class by name — there is no playerId to
           attribute it to, and inventing one would put a fiction in the grid. */
        const term = String(m.term || '').slice(0, 200);
        if (!term) return;
        record(room, 'oral', {
          slideId: String(m.slideId || '').slice(0, 160),
          title: String(m.title || '').slice(0, 200),
          kind: String(m.kind || '').slice(0, 40),
          set: Math.max(1, Number(m.set) || 1),
          card: Math.max(0, Number(m.card) || 0),
          term,
          participant: m.participant == null ? null : String(m.participant).slice(0, 80),
          right: m.right === true,
          /* A quiz bowl cell is worth what it says, so the verdict carries it.
             The boards that have no points send nothing and get nothing. */
          value: Math.max(0, Math.min(10000, Number(m.value) || 0))
        });

      } else if (m.t === 'idle') {
        room.phase = 'idle';
        room.question = null;
        const idle = {
          t: 'idle',
          style: String(m.style || (room.at && room.at.style) || '').slice(0, 40),
          role: ['watch','discuss','paper','wait'].includes(m.role) ? m.role
            : ((room.at && room.at.role) || 'wait'),
          participation: String(m.participation || (room.at && room.at.participation) || '').slice(0, 240),
          headPrompt: String(m.headPrompt || (room.at && room.at.headPrompt) || '').slice(0, 200)
        };
        if (room.at) {
          if (idle.style) room.at.style = idle.style;
          if (idle.role) room.at.role = idle.role;
          if (idle.participation) room.at.participation = idle.participation;
          if (idle.headPrompt) room.at.headPrompt = idle.headPrompt;
        }
        broadcast(room, idle);

      } else if (m.t === 'finish') {
        /* Results slide or an explicit host “show how everyone finished”.
           Each phone gets its own place — including shared firsts. */
        const title = String(m.title || 'Final scores').slice(0, 80);
        const note = String(m.note || '').slice(0, 240);
        room.finishKind = ['race', 'boss'].includes(m.kind) ? m.kind : 'points';
        room.finishNote = note;
        room.phase = 'idle';
        room.question = null;
        for (const p of room.players.values()) {
          if (!p.sock || !p.sock.open) continue;
          p.sock.json(Object.assign({ t: 'finish', title: title, note: note }, finishPayload(room, p)));
        }

      } else if (m.t === 'watchOn') {
        /* Turning the big-screen seat on or off. The id is the share the host
           has just made, so the relay never holds a deck for this — the copy
           a watcher renders is the one /api/share already serves, and the id
           is the only thing that has to be kept.

           This has to live inside the host chain: the block returns, so a
           branch for it further down was unreachable and the first version of
           it silently did nothing. */
        const wid = String(m.s || '');
        room.watchId = /^[a-f0-9]{32}$/.test(wid) ? wid : null;
        if (!room.watchId && room.watchers) {
          for (const w of room.watchers) { if (w.open) w.json({ t: 'watchEnd' }); }
          room.watchers.clear();
        }
        sock.json({ t: 'watchState', on: !!room.watchId });
        log('room ' + room.pin + ' big screen ' + (room.watchId ? 'on' : 'off'));

      } else if (m.t === 'end') {
        closeRoom(room, 'The host ended the quiz.');
        room = null;
      }
      return;
    }

    /* ---- player side ---- */

    /* A desktop following the room on the big screen, with no PIN.
       The share id in the URL is the whole credential, so it has to be the
       thing that is checked — 128 random bits, compared in constant time
       against the id the host registered when it turned watching on. A PIN is
       five digits and guessable at leisure; this is not, and revoking the
       share revokes the view.

       A watcher is deliberately not a player: it is never in room.players, so
       it does not appear in the room list, the attendance record, the
       scoreboard or any report, and it cannot answer anything. */
    if (m.t === 'watch') {
      if (role) return;
      const want = String(m.s || '');
      if (!/^[a-f0-9]{32}$/.test(want)) { sock.json({ t: 'error', message: 'That watch link is not complete.' }); return; }
      let target = null;
      for (const r of rooms.values()) {
        if (r.watchId && r.watchId.length === want.length &&
            crypto.timingSafeEqual(Buffer.from(r.watchId), Buffer.from(want))) { target = r; break; }
      }
      if (!target) {
        sock.json({ t: 'error', message: 'Nobody is presenting this lesson right now. The slides will start moving when they do.' });
        return;
      }
      role = 'watcher';
      room = target;
      if (!room.watchers) room.watchers = new Set();
      room.watchers.add(sock);
      sock.json({ t: 'watching', title: room.title, at: room.lastAt || null });
      log('room ' + room.pin + ' watcher joined (' + room.watchers.size + ')');
      return;
    }

    if (m.t === 'join') {
      if (role) return;
      const pin = String(m.pin || '').trim();
      const target = rooms.get(pin);
      if (!target) {
        sock.json({ t: 'error', message: 'No quiz found with that PIN.' });
        return;
      }
      // a phone asks "what kind of room is this?" before showing the form
      if (m.probe) {
        sock.json({ t: 'room', mode: target.mode, teams: target.teams, title: target.title });
        return;
      }
      if (typeof m.resumeToken === 'string' && m.resumeToken.length === 64) {
        const returning = [...target.players.values(), ...target.waiting.values()].find(p => p.resumeToken === m.resumeToken);
        if (returning) {
          if (returning.sock && returning.sock.open) { sock.json({t:'error',message:'You are already connected in another tab.'}); return; }
          role = 'player'; room = target; me = returning; me.sock = sock;
          record(room, 'resume', {id:me.id});
          if (room.waiting.has(me.id) && room.joinOpen) admitWaiting(room);
          const held = room.waiting.has(me.id);
          sock.json({t:held?'waiting':'joined',name:me.name,title:room.title,phase:room.phase,mode:room.mode,team:me.team,teamName:me.team != null ? room.teams[me.team] : null,score:me.score,resumeToken:me.resumeToken,reactions:room.reactions,phonesBlank:room.phonesBlank,floor:floorIsOpen(room)});
          if (!held) {
            sendContext(room, sock);
            if (room.phase === 'question' && room.question && room.question.eligible.has(me.id)) {
              const remaining = room.question.timeLimit ? Math.max(0, room.question.timeLimit - (Date.now() - room.askedAt) / 1000) : 0;
              if (!room.question.timeLimit || remaining > 0) {
                sock.json(questionMessage(room, remaining));
                if (me.answer != null) {
                  sock.json(room.question.input === 'text' ? {t:'locked',text:me.answer}
                    : room.question.input === 'number' ? {t:'locked',value:me.answer}
                    : {t:'locked',choice:me.answer});
                }
              }
            } else if (room.prompt) {
              sock.json(promptMessage(room));
              const values = room.replies.get(me.id) || [];
              if (values.length) sock.json(room.prompt.kind === 'poll' || room.prompt.kind === 'scale' ? {t:'replied',choice:values[0]} : {t:'replied',used:values.length,max:room.prompt.max});
            }
          }
          pushPlayers(room); pushTally(room); return;
        }
      }
      let name = String(m.name || '').trim().slice(0, 18);
      if (!name) {
        sock.json({ t: 'error', message: 'Pick a name first.' });
        return;
      }

      let team = null;
      if (target.mode === 'teams') {
        team = Number(m.team);
        if (!Number.isInteger(team) || team < 0 || team >= target.teams.length) {
          sock.json({
            t: 'error',
            message: 'Pick a team.',
            mode: 'teams',
            teams: target.teams
          });
          return;
        }
      }
      const taken = [...target.players.values(), ...target.waiting.values()].some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (taken) {
        sock.json({ t: 'error', message: 'Someone already took that name.' });
        return;
      }
      if (target.players.size + target.waiting.size >= 200) {
        sock.json({ t: 'error', message: 'This quiz is full.' });
        return;
      }

      role = 'player';
      room = target;
      me = {
        id: room.nextId++,
        resumeToken: crypto.randomBytes(32).toString('hex'),
        name,
        team,
        score: 0,
        correctCount: 0,
        answer: null,
        sure: null,
        answeredAt: 0,
        lastGain: 0,
        sock
      };
      record(room, 'join', {id:me.id,name:me.name,team:me.team,admitted:room.joinOpen});
      if (!room.joinOpen) {
        /* The window has shut for this round. Hold them rather than refusing:
           they keep their name and team and come in when the next round opens,
           so nobody has to watch the screen for a re-opening. */
        room.waiting.set(me.id, me);
        sock.json({
          t: 'waiting',
          resumeToken: me.resumeToken,
          name,
          title: room.title,
          mode: room.mode,
          team: team,
          teamName: team != null ? room.teams[team] : null
        });
        pushPlayers(room);
        log('room ' + room.pin + ' ~ ' + name + ' waiting for next round (' +
            room.waiting.size + ' held)');
        return;
      }

      room.players.set(me.id, me);
      sock.json({
        t: 'joined',
        resumeToken: me.resumeToken,
        name,
        title: room.title,
        phase: room.phase,
        mode: room.mode,
        team: team,
        teamName: team != null ? room.teams[team] : null,
        /* Whether the control appears at all. Sent on every one of the three
           ways a phone can become a player — joining, being admitted from the
           waiting room, and resuming — because a phone that missed the toggle
           shows a button that does nothing. */
        reactions: room.reactions,
        phonesBlank: room.phonesBlank,
        floor: floorIsOpen(room)
      });
      /* A prompt is broadcast when the host opens it, so somebody arriving
         afterwards would never see it. Hand it over on join instead — unlike a
         quiz question, there is no fairness reason to hold them out. */
      sendContext(room, sock);
      const open = promptMessage(room);
      if (open) sock.json(open);
      sock.json(qaForPlayer(room, me.id));

      pushPlayers(room);
      log('room ' + room.pin + ' + ' + name +
          (team != null ? ' [' + room.teams[team] + ']' : '') +
          ' (' + room.players.size + ')');
      return;
    }

    if (role === 'player' && m.t === 'ask') {
      if (!room) return;
      /* Hiding the button is the courtesy; this is the rule. A phone that
         missed the message, or never had the button, still cannot talk over
         an explanation. */
      if (!floorIsOpen(room)) {
        sock.json({ t: 'askRejected', reason: 'Questions open at the next check-in.' });
        return;
      }
      const text = String(m.text || '').trim().slice(0, 240);
      if (!text) return;
      /* A cap per person, so one enthusiast cannot flood the queue. Dismissed
         ones are not counted against them — the host judged those, not them. */
      const mine = [...room.qa.values()].filter(
        (q) => q.playerId === me.id && q.state !== 'dismissed'
      ).length;
      if (mine >= 5) {
        sock.json({ t: 'askRejected', reason: 'You have five questions in already. Wait for one to be answered.' });
        return;
      }
      const id = room.qaNextId++;
      room.qa.set(id, {
        id, text, name: me.name, playerId: me.id,
        at: Date.now(), state: 'pending', votes: new Set()
      });
      record(room, 'qaAsk', { id, playerId: me.id, text });
      sock.json({ t: 'asked', id });
      pushQA(room);
      log('room ' + room.pin + ' ? ' + me.name + ': ' + text.slice(0, 60));
      return;
    }

    /* Confidence arrives after the answer, not with it. Answering has to lock
       the instant they tap — the speed bonus is real points — so asking "how
       sure?" first would cost them for being asked. */
    if (role === 'player' && m.t === 'sure') {
      if (!room || !rooms.has(room.pin) || room.phase !== 'question' || !room.question) return;
      if (room.answersClosed || me.answer == null) return;
      if (typeof m.sure !== 'boolean') return;
      me.sure = m.sure;
      record(room, 'sure', {attempt: room.question.attempt, playerId: me.id, sure: m.sure});
      /* Not a new answer, so the revision does not move: the host's marking
         is about what was answered, and this changes none of it. */
      pushTally(room);
      return;
    }

    if(role==='player' && m.t==='bookmark'){
      if(!room||!rooms.has(room.pin)||!room.players.has(me.id)||m.slideId!==room.at.slideId||typeof m.saved!=='boolean')return;
      if(!me.bookmarkedSlides)me.bookmarkedSlides=new Set();
      const had=me.bookmarkedSlides.has(m.slideId);
      if(m.saved&&me.bookmarkedSlides.size<500)me.bookmarkedSlides.add(m.slideId);else if(!m.saved)me.bookmarkedSlides.delete(m.slideId);
      if(had!==me.bookmarkedSlides.has(m.slideId))pushBookmarks(room);
      return;
    }

    if (role === 'player' && m.t === 'react') {
      if (!room || !rooms.has(room.pin) || !room.players.has(me.id)) return;
      if (!room.reactions || (m.slideId && m.slideId !== room.at.slideId)) return;
      /* Not while a question is up. Reactions belong to the explaining, not
         the answering — and the foot of a question slide is already carrying
         the answer tally. */
      if (room.phase === 'question' || room.prompt || (room.at.slideId && room.at.activity !== 'content')) return;
      if (room.at.slideId && me.reactedSlides && me.reactedSlides.has(room.at.slideId)) return;
      if (!REACTIONS.includes(m.kind)) return;

      const now = Date.now();
      if (now - (room.reactAt.get(me.id) || 0) < REACT_EVERY_MS) return;
      room.reactBurst = room.reactBurst.filter((t) => now - t < REACT_BURST_MS);
      if (room.reactBurst.length >= REACT_BURST) return;

      if (room.at.slideId) {
        if (!me.reactedSlides) me.reactedSlides = new Set();
        me.reactedSlides.add(room.at.slideId);
      }
      room.reactAt.set(me.id, now);
      room.reactBurst.push(now);
      /* To the host only: the wall shows it, and there is nothing for another
         phone to do with it. Deliberately not journalled — see the note in
         the README. It is the one channel here with no purpose beyond the
         room feeling present, and metering it would change what it is. */
      if (room.host && room.host.open) room.host.json({ t: 'reaction', kind: m.kind });
      sock.json({ t: 'reacted', kind: m.kind, slideId:room.at.slideId });
      return;
    }

    /* The phone went to the background or came back. Recorded, not
       broadcast: it reaches the host in the roster and nobody else. */
    if (role === 'player' && m.t === 'away') {
      if (!room || !rooms.has(room.pin) || !room.players.has(me.id)) return;
      const away = m.away === true;
      if (!!me.away === away) return;
      me.away = away;
      pushPlayers(room);
      return;
    }

    if (role === 'player' && m.t === 'signal') {
      if (!room || !rooms.has(room.pin) || !room.players.has(me.id)) return;
      /* Deliberately not gated by the floor. "I am lost" is only any use while
         somebody is explaining, which is exactly when the floor is shut, and a
         pace signal is anonymous, aggregated and expires on its own — it is
         not the channel anyone can flood. Questions are. */
      if (m.slideId && m.slideId !== room.at.slideId) return;
      const kind = SIGNAL_KINDS.includes(m.kind) ? m.kind : null;
      const mine = room.signals.get(me.id);
      /* Pressing the same thing again takes it back. Nobody should have to
         hunt for a way to say "actually, I follow now". */
      if (!kind || (mine && mine.kind === kind)) {
        room.signals.delete(me.id);
        sock.json({ t: 'signalled', kind: null });
      } else {
        room.signals.set(me.id, { kind, at: Date.now() });
        sock.json({ t: 'signalled', kind });
        /* Journalled without the player: the report should be able to say the
           room lost the thread on slide 7 without naming who said so. */
        if (!me.signalLogged) me.signalLogged = new Set();
        const signalKey = room.at.slideId + ':' + kind;
        if (!me.signalLogged.has(signalKey)) {
          me.signalLogged.add(signalKey);
          record(room, 'signal', {kind, slideId:room.at.slideId,title:room.at.title,n:room.at.n});
        }
      }
      pushSignals(room);
      return;
    }

    if (role === 'player' && m.t === 'qaVote') {
      if (!room) return;
      const item = room.qa.get(Number(m.id));
      if (!item || item.state !== 'approved') return;
      /* The phone hides the button on your own question, but the rule has to
         hold here too — a hidden button is not a constraint. */
      if (item.playerId === me.id) return;
      if (item.votes.has(me.id)) item.votes.delete(me.id);
      else item.votes.add(me.id);
      record(room, 'qaVote', { id: item.id, votes: item.votes.size });
      pushQA(room);
      return;
    }

    if (role === 'player' && m.t === 'reply') {
      if (!room || !rooms.has(room.pin) || !room.players.has(me.id) || !room.prompt) return;
      const p = room.prompt;
      const mine = room.replies.get(me.id) || [];

      /* Answered the same way as a poll: an index among the points. Changing
         your mind is allowed on both — where you stand is not a submission. */
      if (p.kind === 'poll' || p.kind === 'scale') {
        const pick = Number(m.choice);
        if (!Number.isInteger(pick) || !(pick >= 0 && pick < p.options.length)) return;
        room.replies.set(me.id, [pick]);      // last vote wins, one each
        sock.json({ t: 'replied', choice: pick });
      } else {
        if (mine.length >= p.max) return;     // quota spent
        const text = String(m.text || '').trim()
          .slice(0, p.kind === 'wordcloud' ? 40 : 160);
        if (!text) return;
        mine.push(text);
        room.replies.set(me.id, mine);
        sock.json({ t: 'replied', text: text, used: mine.length, max: p.max });
      }
      record(room, 'reply', {attempt:p.attempt,playerId:me.id,values:room.replies.get(me.id).slice()});
      pushFeedback(room);
      return;
    }

    if (role === 'player' && m.t === 'answer') {
      if (!room || !rooms.has(room.pin) || room.phase !== 'question' || !room.question || !room.question.eligible.has(me.id)) return;
      if (room.question.spoken) return;
      if (room.question.timeLimit && Date.now() - room.askedAt > room.question.timeLimit * 1000) return;
      if (room.answersClosed) return;                      // the host is revealing
      /* The one exception to one answer per question: once a showdown's
         split is on the wall, each phone may change its mind, once. */
      if (me.answer != null && room.question.split && m.switch === true && !me.switched &&
          Number.isInteger(m.choice) && m.choice >= 0 && m.choice < room.question.options.length &&
          m.choice !== me.answer) {
        me.answer = m.choice;
        me.switched = true;
        room.question.switched = (room.question.switched || 0) + 1;
        room.answerRev++;
        record(room, 'switch', { attempt: room.question.attempt, playerId: me.id, choice: m.choice });
        sock.json({ t: 'switched', choice: m.choice });
        pushTally(room);
        return;
      }
      if (me.answer != null) return;                       // one answer per question
      /* Held as the raw response: an option index, or the text they typed.
         The relay stores it without interpreting it — every read of it is
         gated on room.question.input, never on the value's own shape. */
      let response;
      if (room.question.input === 'text') {
        response = String(m.text == null ? '' : m.text).trim().slice(0, 120);
        if (!response) return;
      } else if (room.question.input === 'number') {
        /* Kept as a number and nothing more. Whether it is near enough is the
           host's judgement; all that matters here is that it is a real value.

           Typed rather than coerced: JSON has no Infinity, so an overflowing
           value arrives as null — and Number(null) is 0, which on a line
           starting at zero is an answer at the low end rather than no answer
           at all. Nothing missing may become a placement. */
        if (typeof m.value !== 'number' || !Number.isFinite(m.value) ||
            Math.abs(m.value) > 1e12) return;
        response = m.value;
      } else if (room.question.input === 'order') {
        /* A permutation of the options and nothing else. Checked here rather
           than trusted, because every later reader — marking, the tally, the
           report, the CSV — indexes into options with these numbers, and a
           repeat or a stray index would corrupt all of them at once. It is
           the first response in this protocol that is not a scalar, so it is
           also the first that can be malformed in interesting ways. */
        const n = room.question.options.length;
        if (!Array.isArray(m.order) || m.order.length !== n) return;
        const seen = new Set();
        for (const v of m.order) {
          if (!Number.isInteger(v) || v < 0 || v >= n || seen.has(v)) return;
          seen.add(v);
        }
        response = m.order.slice();
      } else {
        const choice = Number(m.choice);
        if (!Number.isInteger(choice) || !(choice >= 0 && choice < room.question.options.length)) return;
        response = choice;
      }
      me.answer = response;
      me.answeredAt = Date.now();
      /* How sure they were, if their phone asked. Never scored — it changes
         what the teacher sees, not what the answer is worth. Confidently
         wrong is the interesting case, and scoring it would just teach the
         room to claim they were guessing. */
      me.sure = typeof m.sure === 'boolean' ? m.sure : null;
      room.answerRev++;
      record(room, 'answer', {attempt:room.question.attempt, playerId:me.id,
        input: room.question.input,
        choice: room.question.input === 'choice' || room.question.input === 'tap' ? response : null,
        text: room.question.input === 'text' ? response : null,
        value: room.question.input === 'number' ? response : null,
        /* Its own field, not squeezed into `choice`. The report reads these
           by input kind, and an array in a field every other reader treats
           as an index would be a silent corruption rather than an error. */
        order: room.question.input === 'order' ? response : null,
        sure: me.sure,
        elapsedMs:me.answeredAt-room.askedAt});
      sock.json(room.question.input === 'text' ? { t: 'locked', text: response }
        : room.question.input === 'number' ? { t: 'locked', value: response }
        : room.question.input === 'order' ? { t: 'locked', order: response }
        : { t: 'locked', choice: response });
      pushTally(room);
      return;
    }
  });

  sock.on('close', () => {
    /* A spectator leaving is not an event: nobody was counting them, nothing
       is owed to them, and the room does not change. Drop the socket and go. */
    if (role === 'watcher') {
      if (room && room.watchers) room.watchers.delete(sock);
      return;
    }
    if (role === 'host' && room) {
      /* Hold the room rather than ending the lesson. A refresh, a crash, a lid
         closed for a minute — none of those are a decision to stop teaching,
         and the room going down takes every phone in it with a victory screen.
         The window is long enough for a reload and a reconnect, short enough
         that a genuinely abandoned room does not linger. */
      if (room.host !== sock) return;
      if (!rooms.has(room.pin)) return;
      room.host = null;
      room.hostAwaySince = Date.now();
      broadcast(room, { t: 'hostAway', away: true });
      log('room ' + room.pin + ' host away — holding for ' + (HOST_GRACE_MS / 1000) + 's');
      room.hostGrace = setTimeout(() => {
        room.hostGrace = null;
        if (rooms.has(room.pin) && !room.host) closeRoom(room, 'The host disconnected.');
      }, HOST_GRACE_MS);
    } else if (role === 'player' && room && me) {
      if (me.sock !== sock) return;
      me.sock = null;
      if (!rooms.has(room.pin) || (!room.players.has(me.id) && !room.waiting.has(me.id))) return;
      if (rooms.has(room.pin)) record(room, 'leave', {id:me.id});
      if (rooms.has(room.pin)) {
        /* Someone who has left the room is not still lost in it, and leaving
           shrinks the room the spike threshold is measured against. */
        if (room.signals.delete(me.id) || room.signals.size) pushSignals(room);
        pushPlayers(room);
        pushTally(room);
        log('room ' + room.pin + ' - ' + me.name + ' (' + room.players.size + ')');
      }
    }
  });
});

function broadcast(room, msg) {
  for (const p of room.players.values()) {
    if (p.sock && p.sock.open) p.sock.json(msg);
  }
  /* Spectators get the slide-position message and nothing else. That message
     is 'context' — the same one the phones get, already bounded to a title and
     an excerpt with no speaker notes and no correct answers — so a big screen
     inherits that guarantee rather than needing its own.

     They are not players: no id, no name, no answers, nothing in the audit
     record, and nothing they send is acted on. */
  if (room.watchers && room.watchers.size && msg && msg.t === 'context') {
    for (const w of room.watchers) {
      if (w.open) w.json(msg); else room.watchers.delete(w);
    }
  }
}

/* ------------------------------------------------------------ go */

server.listen(PORT, HOST, () => {
  /* Two different rooms to talk to.

     On a laptop these are the addresses you use: localhost for the projector,
     the LAN address for the phones. In a container they are both wrong and
     confidently so — the deploy log offered "http://localhost:10000/" and a
     private 10.x address, and the first person to read that log looking for
     the join link followed it nowhere. Render publishes the real one as
     RENDER_EXTERNAL_URL, so a hosted instance prints that instead and says
     which addresses it does not know. */
  const external = String(process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
  console.log('');
  console.log('  SlideForge is running.');
  console.log('');
  if (external) {
    console.log('    Present from   ' + external + '/');
    console.log('    Phones join at ' + external + '/join.html');
    console.log('');
    console.log('  Hosted instance. The join address is taken from the request, so the');
    console.log('  code a room scans is this public URL, not the container\'s own.');
  } else {
    console.log('    Present from   http://localhost:' + PORT + '/');
    console.log('    Phones join at ' + LAN_JOIN_URL);
    console.log('');
    console.log('  Open the present-from link on the machine driving the projector,');
    console.log('  press "Host live", and read the PIN out to the room.');
  }
  console.log('  Ctrl-C to stop.');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use. Try:  PORT=8080 node server/server.js');
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

function shutdown() {
  console.log('\nShutting down.');
  for (const room of [...rooms.values()]) closeRoom(room, 'The server stopped.');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
