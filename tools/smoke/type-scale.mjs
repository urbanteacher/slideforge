/* A rank has to be a size.
 *
 * A block had no rank once: a heading block was an h3 at whatever the browser
 * gives it, which is 18px on a 1280px slide where a real title is nearer 96.
 * Nothing failed when that was true — the slide rendered, the words were
 * there, and a deck built only from items came out looking like a form,
 * because every rank on it was the same size as every other. That is the
 * failure this smoke exists to make loud: not that a size is wrong, but that
 * two ranks that are meant to differ have collapsed onto one number.
 *
 * So every assertion here is about difference rather than about a particular
 * px. The numbers are allowed to move — a theme may want a bigger title — and
 * the test still holds. It only breaks when a distinction disappears.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-type-scale-'));
const port = await harness.freePort();
const relay = await harness.start(port, dir);
let browser;
let checks = 0;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const report = await page.evaluate(async () => {
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:720px';
    document.body.append(stage);
    const style = document.createElement('style');
    style.textContent = '* { animation:none!important;transition:none!important }';
    stage.append(style);
    const deck = SF.buildLesson('layout-bank');
    const px = (n) => Math.round(parseFloat(getComputedStyle(n).fontSize) * 100) / 100;

    /* One throwaway slide carrying the blocks asked for, measured where they
       actually land — in the lattice, inside .slide, under the theme. A block
       measured on its own in the page inherits none of that. */
    async function drawn(blocks) {
      const slide = SF.normalizeSlide({ type: 'content', title: 'Scale', blocks });
      slide.design = { regions: Object.fromEntries(blocks.map((b, i) =>
        [SF.freeBlockKey(b.id), { col: 1, row: 1 + i * 2, cols: 11, rows: 2 }])) };
      const root = SF.renderSlide(deck, slide, { index: 0, total: 1 });
      stage.append(root);
      await document.fonts.ready;
      const out = {};
      for (const b of blocks) {
        const n = root.querySelector('[data-free-block="' + b.id + '"]');
        out[b.id] = n ? { px: px(n), weight: getComputedStyle(n).fontWeight, tag: n.tagName } : null;
      }
      root.remove();
      return out;
    }

    const ranks = await drawn(SF.FREE_SIZES.map((r) =>
      ({ id: r, kind: 'text', size: r, text: 'Rank ' + r })));
    const kinds = await drawn(['heading', 'text', 'note'].map((k) =>
      ({ id: k, kind: k, text: 'Kind ' + k })));
    const slots = await drawn(['title', 'subtitle', 'body'].map((a) =>
      ({ id: a, kind: 'text', as: a, text: 'Slot ' + a })));
    /* A block carries a rank of its own AND may sit in a named slot. The slot
       is the layout speaking and has to win, or dropping an item into a title
       slot would leave it at whatever rank it happened to arrive with.
       Tested with the biggest rank there is against the smaller slot, so the
       slot winning cannot be confused with the larger number winning — and so
       this fails on its own rather than only when the scale above has already
       collapsed. */
    const override = await drawn([
      { id: 'plain', kind: 'text', size: 'display', text: 'display rank' },
      { id: 'slotted', kind: 'text', size: 'display', as: 'title', text: 'display rank, title slot' }
    ]);

    /* An item that takes one of the layout's named slots must be drawn the
       way that theme draws the slot — not approximately, exactly. The sizes
       used to be written down in lattice.css as a corpus average: 52px for a
       title, which is right for 15 of the 23 themes and wrong for the rest,
       and 26px for a subtitle, which was right for none of them. Comparing
       against each theme's own rendering is the only check that can tell the
       difference, because an average looks correct until you ask a theme. */
    const slotsMatchTheme = [];
    for (const theme of Object.keys(SF.THEMES || {})) {
      const d = SF.makeDeck('probe');
      d.theme = theme;
      const look = (node) => {
        if (!node) return null;
        const c = getComputedStyle(node);
        return c.fontSize + '/' + c.fontWeight + '/' + c.color + '/' + c.fontFamily.split(',')[0];
      };
      const pair = (real, withItem, key, id) => {
        const a = SF.renderSlide(d, SF.normalizeSlide(real), { index: 0, total: 1 });
        stage.append(a);
        const want = look(a.querySelector('[data-content-key="' + key + '"]'));
        a.remove();
        const b = SF.renderSlide(d, SF.normalizeSlide(withItem), { index: 0, total: 1 });
        stage.append(b);
        const got = look(b.querySelector('[data-free-block="' + id + '"]'));
        b.remove();
        return { theme, slot: key, want, got, match: !!want && want === got };
      };
      slotsMatchTheme.push(pair(
        { type: 'content', title: 'A title', bullets: ['One point.'] },
        { type: 'content', title: '', bullets: [],
          blocks: [{ id: 'x', kind: 'heading', as: 'title', text: 'A title' }],
          design: { regions: { 'blocks.x': { col: 1, row: 1, cols: 12, rows: 2 } } } },
        'title', 'x'));
      slotsMatchTheme.push(pair(
        { type: 'title', title: 'T', subtitle: 'A short bridge.' },
        { type: 'title', title: 'T', subtitle: '',
          blocks: [{ id: 'y', kind: 'text', as: 'subtitle', text: 'A short bridge.' }],
          design: { regions: { 'blocks.y': { col: 1, row: 4, cols: 12, rows: 1 } } } },
        'subtitle', 'y'));
    }

    /* And on the corpus: whatever a theme does to the numbers, a title may
       never come out the same size as the subtitle or the body beside it. */
    const themes = Object.keys(SF.THEMES || {});
    const clashes = [];
    let pairs = 0;
    for (const theme of themes) {
      const d = SF.buildLesson('layout-bank');
      d.theme = theme;
      for (const [index, slide] of d.slides.entries()) {
        const root = SF.renderSlide(d, slide, { index, total: d.slides.length });
        stage.append(root);
        const host = SF.latticeHost(root);
        const seen = {};
        Array.from(host?.children || []).forEach((n, i) => { seen[SF.blockKeyOf(n, i)] = px(n); });
        for (const other of ['subtitle', 'body']) {
          if (seen.title == null || seen[other] == null) continue;
          pairs++;
          if (seen.title === seen[other]) {
            clashes.push({ theme, slide: index + 1, type: slide.type, other, px: seen.title });
          }
        }
        root.remove();
      }
    }
    stage.remove();
    return { order: SF.FREE_SIZES.slice(), ranks, kinds, slots, override, slotsMatchTheme, themes: themes.length, pairs, clashes };
  });

  const seq = report.order;
  const sizes = seq.map((r) => report.ranks[r]?.px);
  assert.ok(sizes.every((n) => typeof n === 'number'), 'every rank must render: ' + JSON.stringify(report.ranks));
  assert.equal(new Set(sizes).size, seq.length,
    'the ' + seq.length + ' ranks must be ' + seq.length + ' sizes, not ' + new Set(sizes).size + ': ' + JSON.stringify(sizes));
  for (let i = 1; i < sizes.length; i++) {
    assert.ok(sizes[i] < sizes[i - 1],
      seq[i] + ' (' + sizes[i] + 'px) must be smaller than ' + seq[i - 1] + ' (' + sizes[i - 1] + 'px)');
  }
  checks++;

  const k = report.kinds;
  assert.equal(new Set([k.heading.px, k.text.px, k.note.px]).size, 3,
    'a heading, a paragraph and a note must be three sizes: ' + JSON.stringify(k));
  assert.ok(k.heading.px > k.text.px,
    'a heading item must be bigger than a text item, not the browser default h3 (' + k.heading.px + 'px vs ' + k.text.px + 'px)');
  assert.ok(k.note.px < k.text.px, 'a note must be smaller than body copy');
  assert.ok(Number(k.heading.weight) > Number(k.text.weight),
    'and heavier, because size alone is not the only thing read from the back of a room');
  checks++;

  const s = report.slots;
  assert.equal(new Set([s.title.px, s.subtitle.px, s.body.px]).size, 3,
    'the three named slots must be three sizes: ' + JSON.stringify(s));
  assert.ok(s.title.px > s.subtitle.px && s.subtitle.px > s.body.px,
    'title > subtitle > body: ' + JSON.stringify(s));
  checks++;

  assert.equal(report.override.slotted.px, s.title.px,
    'a slot the layout named must beat the block own rank: a display-rank item in a title slot drew at ' +
    report.override.slotted.px + 'px, not the title slot\u2019s ' + s.title.px + 'px');
  assert.ok(report.override.slotted.px < report.override.plain.px,
    'and beat it even when the block own rank is the bigger of the two (' +
    report.override.plain.px + 'px unslotted)');
  checks++;

  const slotMisses = report.slotsMatchTheme.filter((r) => !r.match);
  assert.deepEqual(slotMisses, [],
    'an item in a named slot must be drawn exactly as that theme draws the slot:\n  ' +
    slotMisses.map((r) => r.theme + ' ' + r.slot + ': theme ' + r.want + ', item ' + r.got).join('\n  '));
  assert.ok(report.slotsMatchTheme.length >= 40,
    'both slots must be checked against every theme, got ' + report.slotsMatchTheme.length);
  checks++;

  assert.ok(report.themes >= 20, 'every theme must be swept, got ' + report.themes);
  assert.ok(report.pairs > 300,
    'the corpus sweep must actually find titles beside other copy, got ' + report.pairs + ' pairs');
  assert.deepEqual(report.clashes, [],
    'no title may render at the size of the copy beside it');
  checks++;

  console.log('ok · type scale: ' + checks + ' checks · ' + seq.length + ' ranks are ' +
    seq.length + ' falling sizes (' + sizes.join('/') + 'px), a heading item outranks a text item ' +
    k.heading.px + '/' + k.text.px + 'px, the named slots fall ' +
    [s.title.px, s.subtitle.px, s.body.px].join('/') + 'px and beat a block own rank, an item in a named ' +
    'slot is drawn exactly as its theme draws that slot across ' + report.slotsMatchTheme.length +
    ' comparisons, and across ' + report.themes + ' themes no title matched the copy beside it in ' +
    report.pairs + ' pairs');
} finally {
  await browser?.close();
  relay.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
