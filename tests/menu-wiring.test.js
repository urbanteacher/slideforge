'use strict';
/* Every button in the chrome must have something that answers it.

   Export, Import and Help were dead for most of a day because a range of
   shell.js was replaced between two anchors without reading what sat in
   between, and three handlers went with it. The suite stayed green: nothing
   here looked at whether a button in the markup had any code behind it, and
   the ones that broke are pressed once a week — Export being the copy this
   app tells you to keep.

   Deliberately static. Standing the whole shell up in a DOM to click things
   would be a better test and a much slower one, and it is not what failed:
   the handler was not broken, it was absent. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sources = fs.readdirSync(path.join(ROOT, 'js'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'))
  .join('\n');

function buttonIds(markup) {
  const out = [];
  const re = /<button\b[^>]*\bid="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(markup))) out.push(m[1]);
  return out;
}

/* Four wiring shapes are in use, and the fourth is why this reads source
   rather than elements: a delegated listener never touches the button at
   all, so a check looking for a handler property on it would call a working
   control dead. The teaching-tools buttons are wired that way. */
function isWired(id, js) {
  const q = "['\"]" + id + "['\"]";

  // 1. A wiring token close after the id string.
  const quoted = new RegExp(q, 'g');
  let m;
  while ((m = quoted.exec(js))) {
    const near = js.slice(m.index, m.index + 400);
    if (/\.onclick\s*=|addEventListener\s*\(\s*['"]click/.test(near)) return true;
  }
  // 2. A variable named after the id: var btnExport = $('btnExport') … btnExport.onclick =
  if (new RegExp('\\b' + id + '\\s*\\.\\s*onclick\\s*=').test(js)) return true;
  // 3. Delegation: an ancestor listener testing the target's id, or selecting it back out.
  if (new RegExp('\\.id\\s*===?\\s*' + q).test(js)) return true;
  if (new RegExp("['\"]#" + id + "['\"]").test(js)) return true;
  if (new RegExp('closest\\(\\s*[\'"]#' + id).test(js)) return true;
  return false;
}

/* Buttons the shell does not drive by id. Each needs a reason, so adding one
   is a decision rather than a way to quiet the test. */
const NOT_BY_ID = {
  fileInput: 'a hidden <input>, opened by the Import handler rather than clicked'
};

test('every button in the chrome has a handler behind it', () => {
  const ids = buttonIds(html).filter((id) => !(id in NOT_BY_ID));
  assert.ok(ids.length > 8, 'expected to find the chrome buttons, found ' + ids.length);
  const dead = ids.filter((id) => !isWired(id, sources));
  assert.deepEqual(dead, [],
    'these buttons exist in index.html with nothing wiring them: ' + dead.join(', '));
});

test('the File menu still offers everything it is meant to', () => {
  const menu = html.slice(html.indexOf('<details class="file-menu"'), html.indexOf('</details>'));
  /* Named individually rather than counted, so deleting one fails here
     instead of quietly shrinking the menu. */
  ['btnNew', 'btnReadyMade', 'btnSave', 'btnExport', 'btnImport']
    .forEach((id) => assert.ok(menu.includes('id="' + id + '"'), 'File menu lost ' + id));
  assert.match(menu, /id="btnReadyMade"[^>]*>Library/);
  assert.ok(html.includes('id="docFolder"'), 'the title lost its Library folder chip');
  assert.ok(!menu.includes('Open saved document'), 'Open saved is not a second shelf');
  assert.ok(!menu.includes('id="btnDemoLesson"'), 'demo lesson is not a File item');
  assert.ok(menu.includes('id="btnOpen"') && menu.includes('data-ws="game"'),
    'saved quizzes still open from Quiz studio');
});

test('Export still offers the student handout and the durable copies', () => {
  const shell = fs.readFileSync(path.join(ROOT, 'js', 'shell.js'), 'utf8');
  /* The handout is the copy read a week later, and it was dropped once
     already while restoring this handler. */
  assert.match(shell, /id: 'pdf'[\s\S]{0,200}Student PDF handout/, 'Export lost the student PDF handout');
  assert.match(shell, /it\.id === 'pdf'[\s\S]{0,200}SF\.Print\.open/, 'the handout option has no branch behind it');
  ['one', 'md', 'bundle'].forEach((id) => {
    assert.ok(shell.includes("id: '" + id + "'"), 'Export lost the "' + id + '" option');
  });
});

test('there is exactly one demo, and one thing that opens it', () => {
  const studio = fs.readFileSync(path.join(ROOT, 'js', 'studio.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server', 'server.js'), 'utf8');

  /* The button says demo, so it must open the demo. It spent a while being a
     second copy of File → Library under the label "Example lesson", which is
     two names for one list and no route at all to the demo deck. */
  assert.match(html, /id="btnTemplate"[^>]*>[^<]*demo/i, 'the canvas button no longer offers the demo');
  assert.match(studio, /var DEMO_KEY = 'layout-bank'/, 'the demo is not named in studio.js');
  assert.match(studio, /btnTemplate\.onclick = openDemo/, 'the demo button is wired to something else');
  assert.match(studio, /SF\.Editor\.useLesson\(DEMO_KEY\)/, 'openDemo does not open the named demo');

  /* One demo. The server used to build a second one on demand, which meant
     the deck most often shown to somebody else was the one deck a file://
     copy could not open. */
  assert.ok(!server.includes('demo-lesson'), 'the server is building a second demo again');
  assert.ok(!fs.existsSync(path.join(ROOT, 'tools', 'demo-lesson.js')),
    'tools/demo-lesson.js is back — the demo lives in js/lessons.js');
  assert.ok(!sources.includes('/api/demo-lesson'), 'something still fetches the old demo bundle');
});

test('a blank first visit, with the Library one click from the canvas', () => {
  const editor = fs.readFileSync(path.join(ROOT, 'js', 'editor.js'), 'utf8');
  const studio = fs.readFileSync(path.join(ROOT, 'js', 'studio.js'), 'utf8');

  /* The question has to be asked before the Library is seeded, or eleven
     brand packs make every visit look like a returning one. */
  assert.match(editor, /var firstEverVisit = !last && !SF\.Store\.list\(\)\.length/);
  assert.match(editor, /if \(SF\.seedLibrary\) SF\.seedLibrary\(\);/);
  assert.ok(editor.indexOf('var firstEverVisit') < editor.indexOf('if (SF.seedLibrary)'),
    'firstEverVisit must be decided before seeding, not after');

  /* A first visit opens an empty deck rather than the 74-slide lecture. */
  assert.match(editor, /if \(!loaded && firstEverVisit\)[\s\S]{0,120}SF\.makeDeck\('Untitled lesson'\)/);
  assert.ok(!/loaded = SF\.Studio\.makeLesson\('ipdv-intro'\)/.test(editor),
    'the cold start must not land in somebody else’s lecture');

  /* And the templates are reachable without knowing they live under File. */
  assert.match(html, /id="btnLibraryOpen"[^>]*>[^<]*Library/);
  assert.match(studio, /btnLibraryOpen\)? ?.*onclick = openLessons/);
});
