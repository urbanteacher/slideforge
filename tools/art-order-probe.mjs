#!/usr/bin/env node
/* What would artwork ordering buy, and what would it cost?
 *
 * 936c3a9 shipped a layer stack with "Behind content" / "In front of content"
 * plus Bring forward / Send backward; 21e44ca reverted it for complexity
 * against value. The narrower art face that replaced it has a fixed stack:
 * .theme-art and .slide-art at z-index 2, content above them, always.
 *
 * Before arguing to put ordering back, measure both halves of the claim. This
 * probe renders real slides and reports:
 *
 *   1. the stack as it actually paints, so "in front" and "behind" mean
 *      something checkable rather than something remembered
 *   2. four authoring intents, each attempted with today's model, reported as
 *      reached or not — the benefit is only whatever is in the "not" column
 *   3. how much of a slide's text the artwork already sits under, across the
 *      library, because that is the area that would be covered the moment the
 *      same artwork were allowed in front
 *   4. whether any existing check would notice. That is the cost: a guardrail
 *      that does not exist yet.
 *
 * Reports; asserts nothing. Run with the server up (npm start), or set SF_URL.
 */
import { chromium } from 'playwright';

const BASE = (process.env.SF_BASE_URL || process.env.SF_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const res = await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  if (!res?.ok()) throw new Error(`Could not load ${BASE}/index.html — start the server with npm start.`);
  await page.waitForFunction(() => window.SF?.renderSlide && window.SF?.buildLesson && window.SF?.Review?.check);

  /* A one-pixel opaque PNG, scaled by the pose: enough to establish which side
     of the content it lands on without carrying an image into the repo. */
  const DOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

  const report = await page.evaluate(async ({ DOT }) => {
    const out = { stack: [], intents: [], overlap: [], guards: {} };

    /* On-screen and on top, because elementFromPoint only answers for points
       inside the viewport — staged off to the left, every overlap read as "no
       overlap", which is the wrong answer arrived at silently. */
    async function stage(deck, slide) {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;'
        + 'z-index:99999;background:#fff';
      host.appendChild(SF.renderSlide(deck, slide, { interactive: false, revealed: 9999, index: 0, total: 1 }));
      document.body.appendChild(host);
      /* A placed picture is an <img> with a width and an auto height, so until
         it decodes its height is 0 and every overlap measures as none. The
         first version of this probe reported "no overlap" for all four intents
         on that alone. */
      await Promise.all([...host.querySelectorAll('img')].map(
        (img) => img.decode().catch(() => {})));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return host;
    }

    /* Paint order for absolutely positioned siblings in one stacking context
       is z-index first, then document order. Both reported, because "content
       is above artwork" is currently true by z-index on some layers and by
       document order on others, and only one of those survives a reorder. */
    function layers(root) {
      return [...root.children].map((n, i) => {
        const cs = getComputedStyle(n);
        return {
          what: n.className || n.tagName.toLowerCase(),
          z: cs.zIndex === 'auto' ? null : Number(cs.zIndex),
          position: cs.position,
          docOrder: i,
        };
      });
    }

    // ---------------------------------------------------------- 1. the stack
    {
      const d = SF.makeDeck('stack'); d.theme = 'studio'; d.logo = DOT;
      const s = SF.normalizeSlide({ type: 'title', title: 'Stack', subtitle: 'sub' });
      s.art = { poses: {}, pictures: [{ id: 'p1', src: DOT, x: 100, y: 100, w: 400, alt: '' }] };
      d.slides = [s];
      const host = await stage(d, s);
      out.stack = layers(host.firstElementChild);
      host.remove();
    }

    // -------------------------------------------------------- 2. the intents
    /* Each intent is a thing an author might reasonably ask for. Attempted with
       today's model only — no new fields — and measured on the render. */
    /* Hit-testing answers "which is painted on top" without reimplementing the
       CSS painting order, which is the only way to get this right across mixed
       stacking contexts. But elementFromPoint skips pointer-events:none, and
       both artwork layers declare exactly that outside the art face — so an
       unprepared hit test reports the text on top of a picture that is
       demonstrably covering it. The stylesheet below makes the layers
       hit-testable for measurement only. It does not add .art-editing, which
       would also ghost the pad and take the content out of the comparison. */
    const probeCSS = document.createElement('style');
    probeCSS.textContent =
      '.slide-art,.slide-art-img,.theme-art,.theme-art>*{pointer-events:auto!important}';
    document.head.appendChild(probeCSS);

    function paintsOver(root, aSel, bSel) {
      const a = root.querySelector(aSel), b = root.querySelector(bSel);
      if (!a) return 'missing ' + aSel;
      if (!b) return 'missing ' + bSel;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const left = Math.max(ra.left, rb.left), right = Math.min(ra.right, rb.right);
      const top = Math.max(ra.top, rb.top), bottom = Math.min(ra.bottom, rb.bottom);
      if (right - left < 2 || bottom - top < 2) return 'no overlap';
      const x = Math.round((left + right) / 2), y = Math.round((top + bottom) / 2);
      const hit = document.elementFromPoint(x, y);
      if (!hit) return 'nothing at ' + x + ',' + y;
      if (a === hit || a.contains(hit)) return aSel;
      if (b === hit || b.contains(hit)) return bSel;
      return 'a third thing: ' + (hit.className || hit.tagName);
    }

    async function intent(name, want, build, probe) {
      const d = SF.makeDeck('i'); d.theme = 'studio';
      const s = build(d);
      d.slides = [s];
      const host = await stage(d, s);
      const got = probe(host.firstElementChild, d, s);
      host.remove();
      out.intents.push({ name, want, got, reached: got === want });
    }

    await intent('a placed picture as a backdrop, behind the words',
      'picture under text',
      (d) => {
        const s = SF.normalizeSlide({ type: 'content', title: 'Behind', bullets: ['one', 'two'] });
        s.art = { poses: {}, pictures: [{ id: 'bg', src: DOT, x: 0, y: 0, w: 1280, order: 'back', alt: '' }] };
        return s;
      },
      (root) => {
        const on = paintsOver(root, '.slide-art-img', '[data-content-key]');
        return on === '.slide-art-img' ? 'picture over text'
          : on === '[data-content-key]' ? 'picture under text' : on;
      });

    await intent('a placed picture in front of the words, on purpose',
      'picture over text',
      (d) => {
        const s = SF.normalizeSlide({ type: 'content', title: 'In front', bullets: ['one', 'two'] });
        s.art = { poses: {}, pictures: [{ id: 'fg', src: DOT, x: 0, y: 0, w: 1280, alt: '' }] };
        return s;
      },
      (root) => {
        const on = paintsOver(root, '.slide-art-img', '[data-content-key]');
        return on === '.slide-art-img' ? 'picture over text'
          : on === '[data-content-key]' ? 'picture under text' : on;
      });

    await intent('two placed pictures, the second chosen to sit on top',
      'second on top',
      (d) => {
        const s = SF.normalizeSlide({ type: 'content', title: 'Two', bullets: ['one'] });
        s.art = { poses: {}, pictures: [
          { id: 'a', src: DOT, x: 200, y: 200, w: 400, alt: '' },
          { id: 'b', src: DOT, x: 300, y: 250, w: 400, alt: '' }] };
        return s;
      },
      (root) => {
        const on = paintsOver(root, '[data-art-pic="b"]', '[data-art-pic="a"]');
        return on === '[data-art-pic="b"]' ? 'second on top'
          : on === '[data-art-pic="a"]' ? 'first on top' : on;
      });

    await intent("the theme's own decoration in front of a placed picture",
      'theme shape over picture',
      (d) => {
        const s = SF.normalizeSlide({ type: 'title', title: 'Over', subtitle: 'sub' });
        s.art = { poses: {}, pictures: [{ id: 'p', src: DOT, x: 0, y: 0, w: 1280, alt: '' }] };
        /* The keys come from the theme manifest in manifest order, which is
           the order applyArtPoses stamps them in. */
        const spec = SF.THEMES[SF.resolveTheme(d.theme)].art;
        const probeHost = document.createElement('div');
        probeHost.innerHTML = spec.html;
        const first = probeHost.firstElementChild;
        if (first) s.art.poses[SF.artKeyOf(first, 0)] = { order: 'front' };
        return s;
      },
      (root) => {
        const shape = root.querySelector('.theme-art > [data-art-order="front"]')
          || root.querySelector('.theme-art > *');
        if (!shape) return 'no theme shape';
        shape.setAttribute('data-probe', '');
        const on = paintsOver(root, '[data-probe]', '.slide-art-img');
        return on === '[data-probe]' ? 'theme shape over picture'
          : on === '.slide-art-img' ? 'picture over theme shape' : on;
      });

    // --------------------------------- 3. what the artwork already sits under
    /* For every library slide that draws artwork, how much of the slide's text
       area the artwork rectangles already cover. Today that costs nothing,
       because the text is on top. It is exactly the area that would go under a
       picture the moment "in front of content" existed. */
    const lessons = (SF.LESSONS || []).map((l) => l.key).filter(Boolean);
    out.lessonsSeen = lessons.length;
    out.distinctDecks = new Set(lessons.map((k) => {
      try { return SF.buildLesson(k).title; } catch (e) { return 'error'; }
    })).size;
    out.slidesSeen = 0;
    out.slidesWithArt = 0;
    for (const key of lessons) {
      let deck;
      /* A string, not an object: buildLesson(key) filters LESSONS by === key
         and falls back to LESSONS[0], so buildLesson({key}) silently returns
         the same six-slide deck every time. The first run of this census
         measured one deck thirty-two times and reported the result as a
         library-wide finding. */
      try { deck = SF.normalizeDeck(SF.buildLesson(key)); } catch (e) { continue; }
      if (!deck || !Array.isArray(deck.slides)) continue;
      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i];
        const host = await stage(deck, slide);
        const root = host.firstElementChild;
        out.slidesSeen++;
        const art = [...root.querySelectorAll('[data-art-key], .slide-art-img')]
          .map((n) => n.getBoundingClientRect())
          .filter((r) => r.width > 2 && r.height > 2);
        if (art.length) {
          out.slidesWithArt++;
          const runs = [];
          const walk = document.createTreeWalker(root.querySelector('.pad') || root, NodeFilter.SHOW_TEXT);
          let t;
          while ((t = walk.nextNode())) {
            if (!(t.textContent || '').trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(t);
            for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) runs.push(r);
          }
          let textArea = 0, covered = 0;
          for (const r of runs) {
            textArea += r.width * r.height;
            /* Union is overkill here: art rects on one slide rarely overlap,
               and an overcount would only make the warning louder, which is
               the wrong direction for a number being used to argue caution.
               So take the single worst overlap per run instead. */
            let worst = 0;
            for (const a of art) {
              const w = Math.min(a.right, r.right) - Math.max(a.left, r.left);
              const h = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
              if (w > 0 && h > 0) worst = Math.max(worst, w * h);
            }
            covered += worst;
          }
          if (textArea > 0 && covered / textArea > 0.02) {
            out.overlap.push({
              deck: key, slide: i + 1, type: slide.type,
              shapes: art.length,
              pct: Math.round((covered / textArea) * 1000) / 10,
            });
          }
        }
        host.remove();
      }
    }

    // ------------------- 3b. what the new measure says about the library today
    /* The same sweep, but through SF.artOcclusion, which asks paint order and
       opacity rather than geometry alone. The gap between this number and the
       one above is the difference between "artwork sits over these words" and
       "these words are actually hidden". */
    out.occluded = [];
    for (const key of lessons) {
      let deck;
      try { deck = SF.normalizeDeck(SF.buildLesson(key)); } catch (e) { continue; }
      if (!deck || !Array.isArray(deck.slides)) continue;
      for (let i = 0; i < deck.slides.length; i++) {
        const host = await stage(deck, deck.slides[i]);
        const hits = SF.artOcclusion(host.firstElementChild);
        host.remove();
        for (const h of hits) out.occluded.push({ deck: key, slide: i + 1, ...h });
      }
    }

    // ------------------------------------------------ 4. would anything care?
    /* A slide whose text is completely covered by an opaque picture. Put it
       through each check the app already has and see what each one says. */
    {
      const d = SF.makeDeck('occluded'); d.theme = 'studio';
      const s = SF.normalizeSlide({ type: 'content', title: 'Can you read this', bullets: ['no', 'not at all'] });
      s.art = { poses: {}, pictures: [{ id: 'cover', src: DOT, x: 0, y: 0, w: 1280, alt: '' }] };
      d.slides = [s];
      /* No forcing needed. .slide-art is z-index 2 and a content slide's .pad is
         static, so a placed picture already paints over the words — which is
         what makes the missing guardrail a present problem rather than a
         hypothetical one. The class is left on for the record. */
      const style = document.createElement('style');
      style.textContent = '.probe-front{}';
      document.head.appendChild(style);
      const host = await stage(d, s);
      host.firstElementChild.classList.add('probe-front');
      const fit = await SF.Review.check(d, s, 0);
      out.guards.review = { fits: fit.fits, over: fit.over.length, regions: (fit.regions || []).length };
      out.guards.lattice = SF.latticeFit(host.firstElementChild).filter((v) => v.over).length;
      out.guards.occlusion = SF.artOcclusion(host.firstElementChild)
        .map((h) => h.key + ' ' + h.pct + '%').join(', ') || 'says nothing';
      out.guards.textStillMeasurable = [...host.firstElementChild.querySelectorAll('[data-content-key]')]
        .every((n) => n.getBoundingClientRect().height > 0);
      out.guards.hitTestFindsArt = (() => {
        const n = host.firstElementChild.querySelector('[data-content-key]');
        const r = n.getBoundingClientRect();
        const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
        return !!hit && hit.classList.contains('slide-art-img');
      })();
      out.guards.coversWithoutHelp = true;
      host.remove();
      style.remove();
    }

    probeCSS.remove();
    return out;
  }, { DOT });

  // --------------------------------------------------------------- reporting
  const line = (s) => console.log(s);
  line('');
  line('THE STACK, AS IT PAINTS');
  line('  ' + 'layer'.padEnd(34) + 'z-index'.padEnd(9) + 'position');
  for (const l of report.stack) {
    line('  ' + String(l.what).slice(0, 33).padEnd(34)
      + String(l.z == null ? 'auto' : l.z).padEnd(9) + l.position);
  }

  line('');
  line('WHAT AN AUTHOR CAN ASK FOR TODAY');
  for (const i of report.intents) {
    line('  ' + (i.reached ? '✓ ' : '✗ ') + i.name);
    if (!i.reached) line('      wanted: ' + i.want + '   ·   got: ' + i.got);
  }
  const blocked = report.intents.filter((i) => !i.reached);
  line('  → ' + blocked.length + ' of ' + report.intents.length + ' blocked.');
  line('    The two that used to be blocked were the same thing: a crossing between');
  line('    the two artwork layers. Each artwork item now carries order: back | front,');
  line('    defaulting to what it always did — a picture in front of the words, a theme');
  line('    shape behind them — so no existing deck moves. Ordering within a layer was');
  line('    never the problem: two pictures still stack in array order.');

  line('');
  line('TEXT ALREADY UNDER ARTWORK, ACROSS THE LIBRARY  ('
    + report.lessonsSeen + ' lessons, ' + report.distinctDecks + ' distinct, '
    + report.slidesSeen + ' slides, ' + report.slidesWithArt + ' drawing artwork)');
  if (report.distinctDecks < report.lessonsSeen)
    line('  !! ' + report.lessonsSeen + ' keys produced only ' + report.distinctDecks
      + ' distinct decks \u2014 the census below is measuring the same deck repeatedly.');
  if (!report.overlap.length) {
    line('  No library slide has artwork overlapping more than 2% of its text.');
  } else {
    report.overlap.sort((a, b) => b.pct - a.pct);
    for (const o of report.overlap.slice(0, 14)) {
      line('  ' + String(o.pct + '%').padStart(6) + '  ' + o.deck + ' slide ' + o.slide
        + ' (' + o.type + ', ' + o.shapes + ' shape' + (o.shapes === 1 ? '' : 's') + ')');
    }
    if (report.overlap.length > 14) line('  … and ' + (report.overlap.length - 14) + ' more');
    const bad = report.overlap.filter((o) => o.pct >= 25).length;
    const sections = report.overlap.filter((o) => o.type === 'section').length;
    line('  → ' + report.overlap.length + ' slides have artwork sitting over their own text, '
      + bad + ' of them');
    line('    over a quarter of it, and ' + sections + ' of them section slides — the theme'
      + ' draws its');
    line('    section marks behind the heading. Harmless today, because theme artwork is');
    line('    below content. Each is a slide that a "bring to front" applied to theme');
    line('    artwork would blank on the first click.');
  }

  line('');
  line('AND WHAT THE NEW MEASURE SAYS — SF.artOcclusion, paint order and opacity');
  if (!report.occluded.length) {
    line('  0 library slides have text actually hidden by artwork.');
    line('  → The 45 above are geometric overlap only. Theme marks draw at 13–50%');
    line('    opacity and, on a section slide, under a .pad that carries z-index 1.');
    line('    So the measure can fail the review without failing the library.');
  } else {
    for (const o of report.occluded.slice(0, 12)) {
      line('  ' + String(o.pct + '%').padStart(6) + '  ' + o.deck + ' slide ' + o.slide
        + '  ' + o.key + ' under ' + o.by + '  — "' + o.text.slice(0, 40) + '"');
    }
    line('  → ' + report.occluded.length + ' library blocks are actually hidden. These have');
    line('    to be looked at before occlusion can fail the review.');
  }

  line('');
  line('WOULD ANY EXISTING CHECK NOTICE A SLIDE COVERED BY ITS OWN ARTWORK?');
  line('  Review.check (deck audit)      ' + (report.guards.review.fits ? 'says it FITS' : 'flags it')
    + '  — ' + report.guards.review.over + ' boundary escapes, '
    + report.guards.review.regions + ' region overflows');
  line('  latticeFit (Layout face)       ' + (report.guards.lattice ? 'flags it' : 'says nothing')
    + '  — ' + report.guards.lattice + ' blocks over their line tariff');
  line('  the text itself                ' + (report.guards.textStillMeasurable
    ? 'still measures as laid out, full height' : 'collapses'));
  line('  a pointer at the words         ' + (report.guards.hitTestFindsArt
    ? 'lands on the picture, not the text' : 'still reaches the text'));
  line('  artOcclusion (new)             ' + report.guards.occlusion);
  line('');
  line('  → Nothing measures occlusion. Every check the app has asks whether');
  line('    content fits its space; none asks whether anything is on top of it.');
  line('    This is not hypothetical: a full-bleed placed picture blanks a slide');
  line('    today, and the deck review calls it sound.');
  line('');
  line('THE CASE, THEN');
  line('  For:  the backdrop is the common intent and it is the one that cannot be');
  line('        expressed — a picture behind the words. Two placed pictures already');
  line('        order themselves, so the model is half there.');
  line('  Against: the reverted stack answered this with eleven controls — rename,');
  line('        lock, hide, rotate, opacity, forward, backward, behind, in front,');
  line('        shapes, a named list. Two crossings do not need eleven controls.');
  line('  Missing either way: an occlusion measure. Ordering without one hands the');
  line('        author a way to blank a slide that no check will mention.');
  line('');
} finally {
  await browser.close();
}
