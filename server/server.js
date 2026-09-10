#!/usr/bin/env node
/* SlideForge relay.
   Serves the app over http and relays the live quiz over WebSocket on the
   same port, so phones on the same Wi-Fi can join with a PIN.
   No dependencies: `node server/server.js` and you're running.

   Rooms live in memory only and vanish when the process stops. */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ws = require('./ws');

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------ static files */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
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
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_DOC = 8 * 1024 * 1024;          // embedded images make decks large

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
  let rel = decodeURIComponent(req.url.split('?')[0]);

  if (rel === '/api/data' && req.method === 'GET') return listData(res);
  if (rel === '/api/data' && req.method === 'POST') return saveData(req, res);

  if (rel === '/') rel = '/index.html';

  const full = path.resolve(ROOT, '.' + rel);
  // never serve outside the app folder
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer(serve);

/* ------------------------------------------------------------ rooms */

/** pin -> room */
const rooms = new Map();

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
const JOIN_URL = 'http://' + LAN + ':' + PORT + '/join.html';

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
      team: p.team,
      correct: p.correctCount || 0     // an individual race's position
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Rows for the on-screen scoreboard.
 *
 * In team mode the score is an accumulated per-question average (see the
 * reveal handler), so a team of six never out-scores a team of three on
 * headcount, and the roster changing between rounds does not rewrite history.
 */
function scoreRows(room) {
  if (room.mode !== 'teams') {
    return playerList(room).map((p) => ({
      key: 'p' + p.id,
      name: p.name,
      score: p.score,
      gained: (room.players.get(p.id) || {}).lastGain > 0
    }));
  }

  return room.teams
    .map((name, i) => ({
      key: 't' + i,
      name,
      ci: i,
      members: [...room.players.values()].filter((p) => p.team === i).length,
      score: Math.round(room.teamScores[i]),
      gained: !!room.teamGain[i]
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function pushPlayers(room) {
  if (!room.host) return;
  // the digest reports "n of m responded", so m changes when someone joins
  if (room.prompt) setTimeout(() => pushFeedback(room), 0);
  room.host.json({
    t: 'players',
    pin: room.pin,
    joinUrl: JOIN_URL,
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

function pushTally(room) {
  if (!room.host || !room.question) return;
  const eligible = room.question.eligible;
  const counts = new Array(room.question.options.length).fill(0);
  let answered = 0;
  let total = 0;
  for (const p of room.players.values()) {
    // latecomers are spectators for the question already on screen
    if (eligible && !eligible.has(p.id)) continue;
    total++;
    if (p.answer != null && p.answer >= 0 && p.answer < counts.length) {
      counts[p.answer]++;
      answered++;
    }
  }
  room.host.json({
    t: 'tally',
    counts,
    answered,
    total,
    waiting: room.players.size - total,
    allIn: total > 0 && answered === total
  });
}

/** Fold the replies into whatever shape this prompt's rail needs. */
function feedbackDigest(room) {
  const p = room.prompt;
  if (!p) return null;
  const all = [...room.replies.entries()];

  if (p.kind === 'poll') {
    const counts = new Array(p.options.length).fill(0);
    let voted = 0;
    for (const [, list] of all) {
      const pick = list[0];
      if (Number.isInteger(pick) && pick >= 0 && pick < counts.length) {
        counts[pick]++;
        voted++;
      }
    }
    return { kind: 'poll', counts, total: voted };
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

function pushFeedback(room) {
  if (!room.host || !room.prompt) return;
  room.host.json(Object.assign({
    t: 'responses',
    id: room.prompt.id,
    answered: room.replies.size,
    players: room.players.size
  }, feedbackDigest(room)));
}

function rank(room, playerId) {
  const list = playerList(room);
  const i = list.findIndex((p) => p.id === playerId);
  return { rank: i + 1, of: list.length };
}

/** Where a player's team sits on the board, for their phone to show. */
function teamStanding(room, player) {
  if (room.mode !== 'teams' || player.team == null) return null;
  const rows = scoreRows(room);
  const i = rows.findIndex((r) => r.key === 't' + player.team);
  if (i === -1) return null;
  return { team: rows[i].name, score: rows[i].score, rank: i + 1, of: rows.length };
}

/** The currently open prompt, as a player needs to receive it. */
function promptMessage(room) {
  if (!room.prompt) return null;
  return {
    t: 'prompt',
    kind: room.prompt.kind,
    prompt: room.prompt.prompt,
    options: room.prompt.options,
    max: room.prompt.max
  };
}

/** Move everyone held in the waiting room into play. */
function admitWaiting(room) {
  if (!room.waiting.size) return;
  for (const p of room.waiting.values()) {
    if (!p.sock || !p.sock.open) continue;
    room.players.set(p.id, p);
    p.sock.json({
      t: 'joined',
      name: p.name,
      title: room.title,
      phase: room.phase,
      mode: room.mode,
      team: p.team,
      teamName: p.team != null ? room.teams[p.team] : null,
      admitted: true,
      round: room.roundNo
    });
    const open = promptMessage(room);
    if (open) p.sock.json(open);
    log('room ' + room.pin + ' admitted ' + p.name +
        (p.team != null ? ' [' + room.teams[p.team] + ']' : '') +
        ' (' + room.players.size + ')');
  }
  room.waiting.clear();
}

function closeRoom(room, reason) {
  const bye = { t: 'over', reason: reason || 'The host ended the quiz.' };
  for (const p of room.players.values()) {
    if (p.sock && p.sock.open) p.sock.json(bye);
  }
  for (const p of room.waiting.values()) {
    if (p.sock && p.sock.open) p.sock.json(bye);
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

  sock.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    /* ---- host side ---- */

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
        /* Team scores accumulate per question rather than being recomputed
           from the current roster, so a player joining later can never dilute
           questions they were not present for. */
        teamScores: teams.map(function () { return 0; }),
        teamGain: teams.map(function () { return false; }),
        question: null,
        askedAt: 0,
        /* An open feedback prompt, independent of the quiz flow: a deck can
           collect from the room without any game in it. */
        prompt: null,
        replies: new Map(),      // playerId -> [strings] or [choiceIndex]
        phase: 'lobby',
        nextId: 1,
        asked: 0
      };
      rooms.set(pin, room);
      sock.json({
        t: 'hosted',
        pin,
        joinUrl: JOIN_URL,
        mode: room.mode,
        teams: room.teams
      });
      log('room ' + pin + ' opened — "' + room.title + '" (' + room.mode +
          (room.mode === 'teams' ? ': ' + room.teams.join(', ') : '') + ')');
      return;
    }

    if (role === 'host') {
      if (!room) return;

      if (m.t === 'round') {
        /* A new game in the deck is a new round: the window reopens and
           anyone held back is pulled in before the first question goes out. */
        room.roundGame = String(m.gameId || '');
        room.roundNo++;
        room.joinOpen = true;
        admitWaiting(room);
        broadcast(room, { t: 'roundOpen', n: room.roundNo });
        pushPlayers(room);
        log('room ' + room.pin + ' round ' + room.roundNo + ' open' +
            (room.waiting.size ? '' : '') + ' (' + room.players.size + ' playing)');

      } else if (m.t === 'begin') {
        room.phase = 'running';
        broadcast(room, { t: 'begun' });
        log('room ' + room.pin + ' started with ' + room.players.size + ' player(s)');

      } else if (m.t === 'question') {
        room.asked++;
        room.question = {
          id: String(m.id || ''),
          options: Array.isArray(m.options) ? m.options.map(String) : [],
          timeLimit: Math.max(0, Number(m.timeLimit) || 0),
          points: Math.max(0, Number(m.points) || 1000),
          // the host knows where this question sits in the deck; fall back to
          // a running count if an older client doesn't send it
          index: Number(m.n) > 0 ? Number(m.n) : room.asked
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
        room.question.eligible = new Set(room.players.keys());
        for (const p of room.players.values()) {
          p.answer = null;
          p.answeredAt = 0;
          p.lastGain = 0;
        }
        broadcast(room, {
          t: 'question',
          n: room.question.index,
          count: room.question.options.length,
          timeLimit: room.question.timeLimit
        });
        pushTally(room);

      } else if (m.t === 'reveal') {
        if (!room.question) return;
        const correct = Number(m.correct);
        const why = String(m.explanation || '').slice(0, 1200);
        const answerText = String(m.answer || '').slice(0, 200);
        room.phase = 'revealed';
        for (const p of room.players.values()) {
          let gained = 0;
          if (p.answer === correct) {
            if (room.question.timeLimit > 0) {
              const elapsed = (p.answeredAt - room.askedAt) / 1000;
              const speed = Math.max(0, 1 - elapsed / room.question.timeLimit);
              gained = Math.round(room.question.points * (0.5 + 0.5 * speed));
            } else {
              gained = room.question.points;
            }
            p.correctCount++;
          }
          p.score += gained;
          p.lastGain = gained;
        }

        /* Each question contributes its own per-team average. Summing those
           averages is what makes team size irrelevant and makes the score
           immune to who joins later. */
        if (room.mode === 'teams') {
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
        for (const p of room.players.values()) {
          if (!p.sock || !p.sock.open) continue;
          const r = rank(room, p.id);
          p.sock.json({
            t: 'result',
            right: p.answer === correct,
            answered: p.answer != null,
            gained: p.lastGain,
            score: p.score,
            rank: r.rank,
            of: r.of,
            team: teamStanding(room, p),
            answer: answerText,
            why: why
          });
        }
        /* A race advances a team on the answer most of its members picked, so
           the host needs the per-team breakdown, not just the room total.
           Sent as its own message because it belongs to this question. */
        if (room.host) {
          const elig = room.question.eligible;
          const width = room.question.options.length;
          room.host.json({
            t: 'teamAnswers',
            correct: correct,
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

        pushPlayers(room);
        pushTally(room);

      } else if (m.t === 'prompt') {
        /* Opening a prompt clears the previous one's replies: they belong to
           the slide that asked, not to the session. */
        room.prompt = {
          id: String(m.id || ''),
          kind: String(m.kind || 'poll'),
          prompt: String(m.prompt || '').slice(0, 240),
          options: (Array.isArray(m.options) ? m.options : []).map(String).slice(0, 6),
          max: Math.max(1, Math.min(5, Number(m.max) || 1))
        };
        room.replies = new Map();
        broadcast(room, promptMessage(room));
        pushFeedback(room);
        log('room ' + room.pin + ' prompt open (' + room.prompt.kind + ')');

      } else if (m.t === 'promptEnd') {
        room.prompt = null;
        room.replies = new Map();
        broadcast(room, { t: 'promptEnd' });

      } else if (m.t === 'idle') {
        room.phase = 'idle';
        room.question = null;
        broadcast(room, { t: 'idle' });

      } else if (m.t === 'end') {
        closeRoom(room, 'The host ended the quiz.');
        room = null;
      }
      return;
    }

    /* ---- player side ---- */

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
        name,
        team,
        score: 0,
        correctCount: 0,
        answer: null,
        answeredAt: 0,
        lastGain: 0,
        sock
      };
      if (!room.joinOpen) {
        /* The window has shut for this round. Hold them rather than refusing:
           they keep their name and team and come in when the next round opens,
           so nobody has to watch the screen for a re-opening. */
        room.waiting.set(me.id, me);
        sock.json({
          t: 'waiting',
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
        name,
        title: room.title,
        phase: room.phase,
        mode: room.mode,
        team: team,
        teamName: team != null ? room.teams[team] : null
      });
      /* A prompt is broadcast when the host opens it, so somebody arriving
         afterwards would never see it. Hand it over on join instead — unlike a
         quiz question, there is no fairness reason to hold them out. */
      const open = promptMessage(room);
      if (open) sock.json(open);

      pushPlayers(room);
      log('room ' + room.pin + ' + ' + name +
          (team != null ? ' [' + room.teams[team] + ']' : '') +
          ' (' + room.players.size + ')');
      return;
    }

    if (role === 'player' && m.t === 'reply') {
      if (!room || !room.prompt) return;
      const p = room.prompt;
      const mine = room.replies.get(me.id) || [];

      if (p.kind === 'poll') {
        const pick = Number(m.choice);
        if (!(pick >= 0 && pick < p.options.length)) return;
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
      pushFeedback(room);
      return;
    }

    if (role === 'player' && m.t === 'answer') {
      if (!room || room.phase !== 'question' || !room.question) return;
      if (me.answer != null) return;                       // one answer per question
      const choice = Number(m.choice);
      if (!(choice >= 0 && choice < room.question.options.length)) return;
      me.answer = choice;
      me.answeredAt = Date.now();
      sock.json({ t: 'locked', choice });
      pushTally(room);
      return;
    }
  });

  sock.on('close', () => {
    if (role === 'host' && room) {
      closeRoom(room, 'The host disconnected.');
    } else if (role === 'player' && room && me) {
      room.players.delete(me.id);
      room.waiting.delete(me.id);
      if (room.replies) room.replies.delete(me.id);
      if (rooms.has(room.pin)) {
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
}

/* ------------------------------------------------------------ go */

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  SlideForge is running.');
  console.log('');
  console.log('    Present from   http://localhost:' + PORT + '/');
  console.log('    Phones join at ' + JOIN_URL);
  console.log('');
  console.log('  Open the present-from link on the machine driving the projector,');
  console.log('  press "Host live", and read the PIN out to the room.');
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

process.on('SIGINT', () => {
  console.log('\nShutting down.');
  for (const room of [...rooms.values()]) closeRoom(room, 'The server stopped.');
  process.exit(0);
});
