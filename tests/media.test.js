'use strict';
/* Video, quiz music, and the two pure functions the media slides lean on.
 *
 * The parts that need a browser — whether a clip actually plays, whether the
 * bed stops on reveal — were checked by driving the real player and reading
 * video.paused / audio.volume back out. What is here is what node can prove,
 * and it is the half that fails silently: a URL guard that lets the wrong
 * scheme through, a table that drops a column, and a static server that
 * cannot serve a byte range.
 *
 * That last one is the reason this file exists. Video looked finished and was
 * not: the server answered Range with 200 and the whole body, so Chrome
 * reported video.seekable as [[0,0]] on a file whose duration read correctly.
 * The scrubber did nothing and a slide asking to start at 3s started at 0.
 * Nothing in the app layer could see it.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT, freePort, start, stop } = require('./harness');

function loadModel() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

test('a media reference is either loadable or nothing', () => {
  const SF = loadModel();

  /* A path is the normal case and the reason safeHref could not be reused:
     it upgrades a bare domain to https, which would turn clips/a.mp4 into a
     request to a host called "clips". */
  assert.equal(SF.safeMedia('clips/mitosis.mp4'), 'clips/mitosis.mp4');
  assert.equal(SF.safeMedia('  media/tone.wav  '), 'media/tone.wav');
  assert.equal(SF.safeMedia('https://example.org/a.mp4'), 'https://example.org/a.mp4');
  assert.equal(SF.safeMedia('http://192.168.1.9:8787/a.mp4'), 'http://192.168.1.9:8787/a.mp4');
  assert.equal(SF.safeMedia('file:///Users/x/a.mp4'), 'file:///Users/x/a.mp4');
  assert.equal(SF.safeMedia('data:video/mp4;base64,AAAA'), 'data:video/mp4;base64,AAAA');

  /* Everything a src attribute could be turned into. */
  assert.equal(SF.safeMedia('javascript:alert(1)'), '');
  assert.equal(SF.safeMedia('JavaScript:alert(1)'), '', 'and the scheme is not case-sensitive');
  assert.equal(SF.safeMedia('vbscript:x'), '');
  assert.equal(SF.safeMedia('data:text/html,<script>x</script>'), '',
    'a data URI is allowed only for media, not for markup');
  assert.equal(SF.safeMedia('ftp://example.org/a.mp4'), '',
    'a scheme the browser will not fetch is worse than none: it looks set');
  assert.equal(SF.safeMedia(''), '');
  assert.equal(SF.safeMedia(null), '');
  assert.equal(SF.safeMedia(undefined), '');

  /* The browser strips tabs, newlines, carriage returns and NULs from a URL
     before it parses the scheme, so the guard has to see the same string the
     DOM will. Each of these got through as a "relative path" until it did:
     the scheme test never matched, so nothing looked like a scheme at all. */
  const TAB = String.fromCharCode(9), NL = String.fromCharCode(10),
        CR = String.fromCharCode(13), NUL = String.fromCharCode(0);
  for (const gap of [TAB, NL, CR, NUL]) {
    assert.equal(SF.safeMedia('java' + gap + 'script:alert(1)'), '',
      'a scheme split by control character 0x' + gap.charCodeAt(0).toString(16));
    assert.equal(SF.safeMedia('javascript' + gap + ':alert(1)'), '');
  }
  /* A space is not one of them: the browser percent-encodes it rather than
     dropping it, so it cannot rebuild a scheme, and a filename with a space
     in it is entirely ordinary. */
  assert.equal(SF.safeMedia('my clips/lesson one.mp4'), 'my clips/lesson one.mp4');

  /* And it runs on the way in, so a hand-edited file cannot smuggle one. */
  const s = SF.normalizeSlide({ type: 'video', video: 'javascript:evil()',
    videoPoster: 'data:text/html,x', videoStart: '7.5', videoLoop: 'yes' });
  assert.equal(s.video, '');
  assert.equal(s.videoPoster, '');
  assert.equal(s.videoStart, 7.5);
  assert.equal(s.videoLoop, false, 'a truthy string is not a checked box');
});

test('a table comes from whatever the clipboard had in it', () => {
  const SF = loadModel();

  /* Tabs first, because a range copied out of Excel or Sheets arrives
     tab-separated and should need no editing at all. */
  assert.deepEqual(SF.parseTable('A\tB\tC\n1\t2\t3'), [['A','B','C'], ['1','2','3']]);
  /* Pipes for typing one by hand, where a tab would leave the textarea. */
  assert.deepEqual(SF.parseTable('A | B\n1 | 2'), [['A','B'], ['1','2']]);
  /* One row using tabs is enough to make that row tab-separated, so a cell
     containing a pipe survives. */
  assert.deepEqual(SF.parseTable('A\tb|c'), [['A', 'b|c']]);

  /* Ragged input is padded, not rejected: half a table on the wall is more
     use to somebody mid-edit than an error. */
  assert.deepEqual(SF.parseTable('A|B|C\n1'), [['A','B','C'], ['1','','']]);

  /* Blank lines are structure in a textarea, not empty rows. */
  assert.deepEqual(SF.parseTable('A|B\n\n\n1|2'), [['A','B'], ['1','2']]);
  assert.deepEqual(SF.parseTable(''), []);
  assert.deepEqual(SF.parseTable(null), []);

  /* Capped, because the slide is a fixed 1280x720 and the type size steps
     down off these numbers. Rows past the cap are dropped rather than
     shrinking the whole table to illegibility. */
  const many = SF.parseTable(Array.from({ length: 30 }, (_, i) => 'r' + i).join('\n'));
  assert.equal(many.length, 12);
  const wide = SF.parseTable(Array.from({ length: 20 }, (_, i) => 'c' + i).join('|'));
  assert.equal(wide[0].length, 6);
});

test('the music belongs to the room, so it survives the compile', () => {
  const SF = loadModel();
  const game = SF.makeGame('Round one', 'choice');
  game.settings.music = 'media/think.mp3';
  game.settings.musicVolume = 40;

  /* Played on its own. */
  const solo = SF.gameToRunDeck(SF.normalizeGame(game));
  assert.equal(solo.music, 'media/think.mp3');
  assert.equal(solo.musicVolume, 40);

  /* And embedded in a presentation, where the player reads it off the run
     deck rather than off the slide — a bed that restarted per question would
     open every question on the same four bars. */
  const deck = SF.makeDeck('A lesson');
  const embed = SF.makeSlide('game');
  embed.gameId = game.id;
  deck.slides = [SF.makeSlide('title'), embed];
  const saved = SF.normalizeGame(game);
  const run = SF.buildRunDeck(SF.normalizeDeck(deck), (id) => (id === saved.id ? saved : null));
  assert.equal(run.music, 'media/think.mp3');
  assert.equal(run.musicVolume, 40);

  /* A deck with no game asks for no music, rather than for undefined. */
  const quiet = SF.buildRunDeck(SF.normalizeDeck(SF.makeDeck('Just slides')), () => null);
  assert.equal(quiet.music, '');
  assert.equal(quiet.musicVolume, 55);

  /* Volume is clamped on the way in: an author typing 400 should get loud,
     not an exception when it reaches audio.volume. */
  const shouty = SF.normalizeGame(Object.assign({}, game,
    { settings: Object.assign({}, game.settings, { musicVolume: 400 }) }));
  assert.equal(shouty.settings.musicVolume, 100);
});

test('the server serves byte ranges, which is what makes a video seekable', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideforge-media-'));
  const port = await freePort();
  const relay = await start(port, dir);
  /* A real file in the served tree, removed afterwards. */
  const name = '_range-probe-' + process.pid + '.mp4';
  const file = path.join(ROOT, name);
  const body = Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 251));
  fs.writeFileSync(file, body);
  t.after(async () => {
    await stop(relay);
    fs.rmSync(file, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const url = 'http://127.0.0.1:' + port + '/' + name;

  /* The type matters more for media than for a picture: served as
     application/octet-stream a clip plays in Chrome by sniffing and is
     refused outright by Safari. */
  const whole = await fetch(url);
  assert.equal(whole.status, 200);
  assert.equal(whole.headers.get('content-type'), 'video/mp4');
  assert.equal(whole.headers.get('accept-ranges'), 'bytes',
    'advertised even on a full reply, or the browser never asks');

  const mid = await fetch(url, { headers: { Range: 'bytes=100-199' } });
  assert.equal(mid.status, 206, 'a 200 here is the bug that made seeking impossible');
  assert.equal(mid.headers.get('content-range'), 'bytes 100-199/4096');
  const midBytes = Buffer.from(await mid.arrayBuffer());
  assert.equal(midBytes.length, 100);
  assert.ok(midBytes.equals(body.subarray(100, 200)), 'and the right 100 bytes');

  const open = await fetch(url, { headers: { Range: 'bytes=4000-' } });
  assert.equal(open.headers.get('content-range'), 'bytes 4000-4095/4096');
  assert.equal(Buffer.from(await open.arrayBuffer()).length, 96);

  /* "bytes=-50" is the last 50 bytes, not the first 50. Reading it the other
     way returns real data for a request nobody made, which is worse than an
     error because the player believes it. */
  const suffix = await fetch(url, { headers: { Range: 'bytes=-50' } });
  assert.equal(suffix.headers.get('content-range'), 'bytes 4046-4095/4096');
  assert.ok(Buffer.from(await suffix.arrayBuffer()).equals(body.subarray(4046)));

  /* Past the end. The 416 has to carry the real length or the player has
     nothing to recover with. */
  const past = await fetch(url, { headers: { Range: 'bytes=99999-' } });
  assert.equal(past.status, 416);
  assert.equal(past.headers.get('content-range'), 'bytes */4096');

  /* An end past the file is clamped rather than refused — browsers ask for
     more than is there when they do not know the length yet. */
  const over = await fetch(url, { headers: { Range: 'bytes=4000-99999' } });
  assert.equal(over.status, 206);
  assert.equal(over.headers.get('content-range'), 'bytes 4000-4095/4096');

  /* A range header the server does not understand falls back to the whole
     file, which is always a valid answer. */
  const junk = await fetch(url, { headers: { Range: 'items=1-2' } });
  assert.equal(junk.status, 200);
  assert.equal(junk.headers.get('content-length'), '4096');
});
