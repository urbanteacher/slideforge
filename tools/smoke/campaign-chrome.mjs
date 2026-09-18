/* The furniture around a campaign slide: header, closing rule, and the marks
 * in both corners.
 *
 * Every assertion here started as something that was wrong on screen and was
 * only found by looking. They are cheap to check and were expensive to spot:
 * a mark painted in the strand colour onto a ground of the same colour, a
 * header holding 330px open for a logo that was not coming, a page number
 * counting the editor's rows instead of the running order, a lockup squeezed
 * to 0.58 of the size its own file claimed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import harness from '../../tests/harness.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-chrome-'));
const port = await harness.freePort(), relay = await harness.start(port, dir);
const browser = await chromium.launch();
const STRANDS = ['safe', 'smart', 'creative', 'responsible', 'future'];
let checked = 0;

/* Relative luminance, so "can this be seen" is a number rather than a view. */
const lum = (c) => {
  const m = String(c).match(/[\d.]+/g);
  if (!m) return null;
  const [r, g, b] = m.slice(0, 3).map(Number);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.SF?.buildLesson && window.SF?.renderSlide);
  await page.addStyleTag({ content: '#s *,#s *::before,#s *::after{animation:none!important}' });

  const read = (key) => page.evaluate(async (key) => {
    let st = document.getElementById('s');
    if (!st) {
      st = document.createElement('div'); st.id = 's';
      Object.assign(st.style, { position: 'fixed', top: '0', left: '0', width: '1280px', height: '720px', zIndex: '9999' });
      document.body.append(st);
    }
    const d = SF.buildLesson(key);
    const out = [];
    for (let i = 0; i < d.slides.length; i++) {
      const s = d.slides[i];
      const n = SF.renderSlide(d, s, { interactive: false, revealed: 99, index: i, total: d.slides.length });
      n.style.transform = 'none';
      st.replaceChildren(n);
      await document.fonts.ready;
      /* naturalWidth is 0 until the image has decoded, and this checks the
         artboard it was drawn on — so wait for it rather than race it. */
      await Promise.all([...n.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
      const box = n.getBoundingClientRect();
      const header = n.querySelector('.cp-header');
      const logo = n.querySelector('.slide-logo');
      const img = logo && logo.querySelector('img');
      const mark = header && getComputedStyle(header, '::before');
      const foot = n.querySelector('.cp-footer');
      const rect = (el) => { const r = el.getBoundingClientRect(); return { top: r.top - box.top, w: r.width, h: r.height }; };
      const beatEl = header && header.querySelector('.cp-beat');
      out.push({
        type: s.type, hidden: !!s.hidden, ground: n.dataset.ground,
        /* The campaign frame is a property of the COMPOSITION, not the theme.
           A slide type missing from CAMPAIGN_COMPOSITIONS gets no composition,
           so no .cp-header and no .cp-footer — it leaves the campaign without
           saying so. Recorded per slide so check 11 can name the offender. */
        composition: SF.slideComposition(d, s) || null,
        hasChrome: !!header && !!foot,
        slideBg: getComputedStyle(n).backgroundColor,
        headerPadRight: header ? getComputedStyle(header).paddingRight : null,
        markFilter: mark ? mark.filter : null,
        hasLogo: !!logo,
        logoFilter: img ? getComputedStyle(img).filter : null,
        logoRect: logo ? rect(logo) : null,
        logoNatural: img ? img.naturalWidth + 'x' + img.naturalHeight : null,
        headerRect: header ? rect(header) : null,
        footerNote: foot ? (foot.querySelector('.cp-footer-note') || {}).textContent || null : null,
        pageNumber: foot ? (foot.querySelector('.pagenum') || {}).textContent || null : null,
        pageNumbersOnSlide: n.querySelectorAll('.pagenum').length,
        eyebrow: (n.querySelector('.cp-eyebrow') || {}).textContent || null,
        eyebrowColor: n.querySelector('.cp-eyebrow') ? getComputedStyle(n.querySelector('.cp-eyebrow')).color : null,
        closingLine: (n.querySelector('.cp-closing-line') || {}).textContent || null,
        beatInHeader: !!beatEl,
        /* Offset of the context line's centre from the slide's, in px. The
           header's own box is 330px narrower than the slide when a mark is
           reserved, so comparing against the header would pass while the line
           sat 165px left of where the eye expects it. */
        beatCentreOffset: beatEl
          ? ((r) => (r.left + r.right) / 2 - (box.left + box.right) / 2)(beatEl.getBoundingClientRect())
          : null,
        beatRight: beatEl ? beatEl.getBoundingClientRect().right - box.left : null,
        logoLeft: logo ? logo.getBoundingClientRect().left - box.left : null,
        noteType: foot && foot.querySelector('.cp-footer-note')
          ? (cs => cs.fontSize + '/' + cs.fontWeight)(getComputedStyle(foot.querySelector('.cp-footer-note'))) : null,
        strandType: mark ? mark.fontSize + '/' + mark.fontWeight : null
      });
    }
    st.remove();
    return { shown: d.slides.filter(x => !x.hidden).length, slides: out };
  }, key);

  for (const strand of STRANDS) {
    const { shown, slides } = await read('aiad27-' + strand);
    const visible = slides.filter(s => !s.hidden);
    const where = (t) => strand + '/' + t;

    /* 1. The corner mark is on every slide the room sees, and on none it does not. */
    for (const s of visible) assert.ok(s.hasLogo, where(s.type) + ': no corner mark');
    for (const s of slides.filter(x => x.hidden)) assert.equal(s.hasLogo, false, where(s.type) + ': mark on a hidden page');
    checked++;

    /* 2. Drawn at its own size. The file is 300x56; anything less means it is
          being scaled down and its 20px heading is arriving smaller. */
    for (const s of visible) {
      assert.equal(s.logoNatural, '300x56', where(s.type) + ': lockup is not the expected artboard');
      assert.equal(Math.round(s.logoRect.w), 300, where(s.type) + ': lockup squeezed to ' + Math.round(s.logoRect.w));
      assert.equal(Math.round(s.logoRect.h), 56, where(s.type) + ': lockup squashed to ' + Math.round(s.logoRect.h));
    }
    checked++;

    /* 3. Hung flush with the header, so its first line shares the strand
          name's baseline instead of floating above it. */
    for (const s of visible) {
      assert.equal(Math.round(s.logoRect.top), Math.round(s.headerRect.top),
        where(s.type) + ': lockup is not flush with the header');
    }
    checked++;

    /* 4. Reversed by the ground, not by a deck-wide refusal. */
    for (const s of visible) {
      const inverted = /invert/.test(s.logoFilter || '');
      assert.equal(inverted, s.ground === 'dark',
        where(s.type) + ': mark inversion does not match a ' + s.ground + ' ground');
    }
    checked++;

    /* 5. The strand mark must not be its own ground. The icon is the strand
          colour; three layouts paint that colour behind it, and there the
          renderer drives it to ink. */
    for (const s of visible) {
      const onOwnColour = ['title', 'statement', 'keyfact'].includes(s.type);
      assert.equal(/brightness\(0\)/.test(s.markFilter || ''), onOwnColour,
        where(s.type) + ': strand mark would be ' + (onOwnColour ? 'invisible on its own colour' : 'needlessly flattened'));
    }
    checked++;

    /* 6. The header only holds the corner open when something is coming. */
    for (const s of visible) {
      assert.equal(s.headerPadRight, '330px', where(s.type) + ': header did not reserve the mark');
    }
    checked++;

    /* 7. One page number, counted over the running order. The editor used to
          say 3/9 where the show said 3/7. */
    for (const s of visible) {
      assert.ok(s.pageNumbersOnSlide <= 1, where(s.type) + ': ' + s.pageNumbersOnSlide + ' page numbers');
      if (s.pageNumber) {
        assert.match(s.pageNumber, new RegExp('/ ' + shown + '$'),
          where(s.type) + ': "' + s.pageNumber + '" does not count the ' + shown + ' shown slides');
      }
    }
    checked++;

    /* 8. The closing rule carries the campaign's own words, from the deck,
          set to match the strand name at the other end of the slide. */
    for (const s of visible) {
      assert.equal(s.footerNote, 'Keep humans in the loop', where(s.type) + ': closing line lost');
      assert.equal(s.noteType, s.strandType,
        where(s.type) + ': closing note is ' + s.noteType + ' where the strand name is ' + s.strandType);
    }
    checked++;

    /* 9. The beat belongs to the words it introduces on the three single-block
          layouts, and to the header elsewhere. Never to both. */
    for (const s of visible) {
      const asEyebrow = ['title', 'quote', 'statement', 'keyfact'].includes(s.type);
      const asClosing = s.type === 'journey';
      if (asEyebrow) {
        assert.ok(s.eyebrow, where(s.type) + ': no eyebrow above the words');
        assert.equal(s.beatInHeader, false, where(s.type) + ': beat is in two places at once');
      } else if (asClosing) {
        assert.ok(s.closingLine, where(s.type) + ': no line closing the list');
        assert.equal(s.beatInHeader, false, where(s.type) + ': beat is in two places at once');
      }
    }
    checked++;

    /* 9b. And when it is in the header it sits on the SLIDE's centre, not on
           the middle of whatever room the identity and the corner reserve
           left it. space-between put it about two thirds across — close
           enough to centre to read as a mistake rather than a choice. It must
           also stay clear of the mark; if a context line ever grows past the
           560px cap this is what will say so. */
    for (const s of visible.filter(x => x.beatInHeader)) {
      assert.ok(Math.abs(s.beatCentreOffset) <= 1,
        where(s.type) + ': context line is ' + Math.round(s.beatCentreOffset) +
        'px off the slide centre');
      if (s.logoLeft != null) {
        assert.ok(s.beatRight < s.logoLeft,
          where(s.type) + ': context line runs under the corner mark');
      }
    }
    checked++;

    /* 10. Nothing is set in a colour its own ground would swallow. Text on a
           dark ground must be light, and vice versa — the failure this whole
           pass kept re-discovering. */
    for (const s of visible) {
      if (!s.eyebrowColor) continue;
      const ink = lum(s.eyebrowColor), ground = lum(s.slideBg);
      if (ink == null || ground == null) continue;
      assert.ok(Math.abs(ink - ground) > 0.02,
        where(s.type) + ': eyebrow is the same tone as its ground');
    }
    checked++;
  }

  /* 11. And the other side of check 6: with no mark coming, the header must
         not hold the corner open. Every campaign slide carries a mark, so
         this case cannot be observed on one — it needs a deck without one,
         which is also the case every other theme hits. */
  const bare = await page.evaluate(async () => {
    const st = document.createElement('div'); st.id = 's2';
    Object.assign(st.style, { position: 'fixed', top: '0', left: '0', width: '1280px', height: '720px', zIndex: '9999' });
    document.body.append(st);
    const out = {};
    for (const theme of ['aiad27-future', 'northeastern', 'studio']) {
      const d = { theme, aspect: '16:9', slides: [] };   // deliberately no logo
      const slide = SF.normalizeSlide({ type: 'cards', title: 'T', subtitle: 's',
        bullets: ['A\tone', 'B\ttwo'], design: { composition: 'ballot' } });
      const n = SF.renderSlide(d, slide, { interactive: false, revealed: 99, index: 0, total: 1 });
      st.replaceChildren(n);
      out[theme] = { pad: getComputedStyle(n.querySelector('.cp-header')).paddingRight,
                     mark: !!n.querySelector('.slide-logo') };
    }
    st.remove();
    return out;
  });
  for (const [theme, r] of Object.entries(bare)) {
    assert.equal(r.mark, false, theme + ': a deck with no logo rendered one');
    assert.notEqual(r.pad, '330px',
      theme + ': header reserved 330px for a mark that is not coming');
    checked++;
  }

  /* 11. Every slide the campaign actually ships keeps the campaign frame.
         The chrome hangs off the composition table, which names ten types;
         split, content and chart are not among them, and those are exactly
         the three that would carry an image or a graph. Add a picture to a
         2027 deck today and the slide does not bend the system, it silently
         leaves it — no identity, no closing line, no page number, and nothing
         anywhere says so. This fails at the point somebody falls in, rather
         than on a projector. See docs/design-system-and-the-canvas.md §8. */
  for (const strand of STRANDS) {
    const { slides } = await read('aiad27-' + strand);
    for (const s of slides.filter(x => !x.hidden)) {
      assert.ok(s.composition,
        strand + '/' + s.type + ': no composition — this type is missing from ' +
        'CAMPAIGN_COMPOSITIONS in src/themes.js, so the slide renders on the ' +
        'legacy layout path with none of the campaign chrome');
      assert.ok(s.hasChrome,
        strand + '/' + s.type + ': lost the campaign header or closing rule');
    }
    checked++;
  }

  assert.deepEqual(errors, [], 'page errors');
  console.log(`${checked} campaign-chrome checks across ${STRANDS.length} strands; header, rule and both marks hold.`);
} finally {
  await browser.close();
  await harness.stop(relay);
  fs.rmSync(dir, { recursive: true, force: true });
}
