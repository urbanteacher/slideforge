'use strict';
/* A YouTube link in the video field used to look like nothing happened.
 *
 * It was accepted, and the show framed the real player — but the editor drew
 * a grey rectangle with "Embedded video · plays in the show" in dim type over
 * it, which is indistinguishable from a field that ignored what you pasted.
 * YouTube publishes a still per video id, so the author sees the clip.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* render.js is a browser file; it needs only enough of one to be defined. */
function loadRender() {
  const sandbox = {
    addEventListener: () => {},
    removeEventListener: () => {},
    document: {
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
        setAttribute() {}, appendChild() {} }),
      body: { classList: { add() {}, remove() {}, contains() { return false; } } },
      getElementById: () => null,
      querySelector: () => null
    },
    location: { protocol: 'http:', origin: 'http://localhost:8787' },
    /* The link parser uses the platform URL, which a bare vm context has not
       got — without this every link reads as unrecognised and the test would
       be measuring the sandbox. */
    URL: URL,
    URLSearchParams: URLSearchParams,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/model.js'), 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/render.js'), 'utf8'), sandbox);
  return sandbox.SF;
}

const SF = loadRender();

test('the id is read from every shape of YouTube link', () => {
  const id = 'dWGujFI4AYQ';
  [
    'https://www.youtube.com/watch?v=' + id,
    'https://www.youtube.com/watch?v=' + id + '&t=90s',
    'https://youtu.be/' + id,
    'https://youtu.be/' + id + '?t=42',
    'https://www.youtube.com/embed/' + id,
    'https://www.youtube.com/shorts/' + id,
    'https://www.youtube.com/live/' + id,
    'https://www.youtube-nocookie.com/embed/' + id,
    '  https://www.youtube.com/watch?v=' + id + '  '
  ].forEach((link) => assert.equal(SF.youtubeId(link), id, link));
});

test('anything that is not a YouTube link has no id', () => {
  ['', null, undefined, 'clips/mitosis.mp4', 'https://vimeo.com/76979871',
    'https://example.com/watch?v=abc', 'javascript:alert(1)',
    /* A watch page with no v= is a link to nothing in particular. */
    'https://www.youtube.com/watch'
  ].forEach((link) => assert.equal(SF.youtubeId(link), '', String(link)));
});

test('an embedded clip shows the service still, and a poster always wins', () => {
  const id = 'dWGujFI4AYQ';
  /* hqdefault: present for every video, unlike maxresdefault, which would be
     a broken image on anything uploaded below 720p. */
  assert.equal(SF.videoStill({ video: 'https://youtu.be/' + id }),
    'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
  assert.equal(SF.videoStill({ video: 'https://youtu.be/' + id, videoPoster: 'stills/frame.jpg' }),
    'stills/frame.jpg');
  /* A file served beside the deck needs no still — the <video> element draws
     its own first frame — and Vimeo has no static thumbnail URL. */
  assert.equal(SF.videoStill({ video: 'clips/mitosis.mp4' }), '');
  assert.equal(SF.videoStill({ video: 'https://vimeo.com/76979871' }), '');
});
