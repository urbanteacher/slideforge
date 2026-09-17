/* SlideForge — slide renderer.
   One function builds the DOM for a slide at true 1280x720; callers scale it.
   The same output is used for rail thumbnails, the editor preview and the
   live slideshow, so what you edit is exactly what you present. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /** A shared themed root: the manifest owns both the fallback and ground.
   * Explicit saved themes are preserved; missing/retired themes use Studio.
   *
   * @param {string} cls classes before the theme, e.g. 'slide' or 'scorerail'
   * @param {{theme?: string}} deck
   * @param {string} [after] classes appended after the theme, e.g. 'layout-title'
   * @param {string} [layout] layout whose intrinsic ground to resolve
   */
  function themedRoot(cls, deck, after, layout) {
    var theme = SF.resolveTheme(deck && deck.theme);
    var node = el('div', cls + ' theme-' + theme + (after ? ' ' + after : ''));
    node.dataset.ground = SF.themeGround ? SF.themeGround(theme, layout) : 'light';
    return node;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* "slide:12" — a jump inside the lesson. Returns the 1-based number the
     author wrote, or 0 for anything else, so callers can use it as a test. */
  SF.slideJumpTarget = function (value) {
    var m = /^\s*slide:\s*(\d{1,4})\s*$/i.exec(String(value || ''));
    var n = m ? Number(m[1]) : 0;
    return n >= 1 ? n : 0;
  };

  /* Going there means two different things depending on who is looking.

     The author is holding the deck, so the number they wrote is the number
     they meant. The room is watching a show built from that deck — games
     have expanded into their questions and hidden slides are gone — so the
     same number points somewhere else entirely. The slide's id is the only
     thing both lists agree on, so the number is resolved against the deck
     and the id is looked up in the show. A link to a slide that is hidden
     therefore goes nowhere, which is the honest outcome: it is not in the
     lesson the room is being shown. */
  SF.jumpToSlide = function (n) {
    var P = SF.Player;
    if (P && P.open && P.deck && P.deck.slides) {
      var authored = (SF.Editor && SF.Editor.deck && SF.Editor.deck().slides) || P.deck.slides;
      var want = authored[n - 1];
      if (!want) { if (SF.toast) SF.toast('There is no rail slide ' + n + ' (authoring order).'); return; }
      var at = -1;
      P.deck.slides.forEach(function (s, i) {
        if (at < 0 && (s.id === want.id || s.sourceSlideId === want.id)) at = i;
      });
      if (at < 0) { if (SF.toast) SF.toast('Rail slide ' + n + ' is not in this show — it may be hidden.'); return; }
      P.goTo(at, at > P.idx ? 1 : -1);
      return;
    }
    if (SF.Editor && SF.Editor.selectSlide) {
      var d = SF.Editor.deck();
      var target = d && d.slides[n - 1];
      if (!target) { if (SF.toast) SF.toast('There is no rail slide ' + n + ' (authoring order).'); return; }
      SF.Editor.selectSlide(target.id);
    }
  };

  /* Which deck's shape an element is being drawn at. The player's deck when
     a show is running, the editor's otherwise — and 16:9 when neither is up,
     which is the rail thumbnail during load. Read rather than threaded
     through every layout, because the shape is a property of the document
     and not of the slide being drawn. */
  /* Stamped on the element rather than set globally: the rail, the preview
     and the wall are on screen together, and a variable on :root would make
     a thumbnail change shape because the show did. */
  function stampAspect(slideEl, deck) {
    var h = SF.slideHeight(deck);
    slideEl.style.setProperty('--slide-h', h + 'px');
    if (h !== SF.SLIDE_H) slideEl.dataset.aspect = (deck && deck.aspect) || '16:9';
  }

  function deckOf(node) {
    if (SF.Player && SF.Player.open && SF.Player.deck) return SF.Player.deck;
    if (SF.Editor && SF.Editor.deck) { try { return SF.Editor.deck(); } catch (e) {} }
    return null;
  }

  function rich(tag, cls, slide, key, text) {
    var n = el(tag, cls, text);
    n.dataset.contentKey=key;
    if (SF.Custom) SF.Custom.paint(n, slide, key, text);
    return n;
  }

  /* A bullet line starting with "- " or a tab/two spaces is a sub-bullet. */
  function bulletTier(line) {
    return /^(\s{2,}|\t|- )/.test(line) ? 2 : 1;
  }
  function bulletText(line) {
    return line.replace(/^(\s{2,}|\t|- )+/, '').trim();
  }

  /* Progressive builds: mark each revealable unit so Teaching.next can step them. */
  function asStep(node, slide) {
    if (slide && slide.progressive) node.classList.add('step');
    return node;
  }

  /** Seconds as a clock reads them. The quiz counts bare seconds because its
      questions are twenty seconds long; an activity is ten minutes, where "600"
      tells nobody anything. */
  function clockFace(secs) {
    var whole = Math.max(0, Math.ceil(secs));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }

  function ring(size, stroke, frac, extraClass) {
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    ['ring-bg', 'ring'].forEach(function (name) {
      var ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ci.setAttribute('class', name + (extraClass ? ' ' + extraClass : ''));
      ci.setAttribute('cx', String(size / 2));
      ci.setAttribute('cy', String(size / 2));
      ci.setAttribute('r', String(r));
      ci.setAttribute('fill', 'none');
      ci.setAttribute('stroke-width', String(stroke));
      ci.setAttribute('stroke-linecap', 'round');
      if (name === 'ring') {
        ci.setAttribute('stroke-dasharray', String(c));
        ci.setAttribute('stroke-dashoffset', String(c * (1 - Math.max(0, Math.min(1, frac)))));
      }
      svg.appendChild(ci);
    });
    return svg;
  }

  /* ------------------------------------------------------------ layouts */

  function layoutTitle(slide, pad) {
    pad.appendChild(el('div', 'accent-bar'));
    pad.appendChild(rich('h1', null, slide, 'title', slide.title || ' '));
    if (slide.subtitle) pad.appendChild(rich('div', 'sub', slide, 'subtitle', slide.subtitle));
    appendSlideDate(slide, pad);
  }

  function appendSlideDate(slide, pad) {
    if (slide.date && /^\d{4}-\d{2}-\d{2}$/.test(slide.date)) {
      var date = new Date(slide.date + 'T12:00:00');
      if (Number.isFinite(date.getTime())) {
        var stamp = el('time', 'slide-date', date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
        stamp.setAttribute('datetime', slide.date); pad.appendChild(stamp);
      }
    }
  }

  /**
   * One line, as big as it fits, in the middle of the slide.
   *
   * Sized by how much there is to say rather than by measuring: the band goes
   * on the element and the stylesheet picks the size, so it is the same in the
   * editor, on the wall, in a 180px rail thumbnail and in a printed handout —
   * all places where measuring either cannot happen or gives a different
   * answer. Same idea as the explanation panel's data-len bands and the code
   * panel's line-count bands.
   *
   * Six words get 140px; a sentence steps down rather than overflowing.
   */
  function statementBand(text) {
    var n = String(text || '').trim().length;
    return n <= 24 ? 'xs' : n <= 48 ? 'sm' : n <= 90 ? 'md' : n <= 170 ? 'lg' : 'xl';
  }

  /**
   * The size for a statement that is one word.
   *
   * A word has nothing to wrap, so its size is arithmetic rather than a band:
   * the pad is 1088px wide inside its padding and a bold glyph averages about
   * 0.58em, so the width is 0.58 × characters × size. Bands are right for a
   * sentence, where the wrap decides the height; they are wrong for a word,
   * which at the 140px band covered a quarter of the slide and read as a
   * small word floating in space rather than as a statement.
   *
   * Capped at 320px: with 1.04 line-height that is 333px of a 720px slide,
   * which leaves the air a one-word slide needs.
   *
   * @param {string} word
   * @returns {number} px
   */
  function statementWordSize(word) {
    /* Floor, not round: rounding up put a nineteen-letter word at 1091px
       inside 1088px of pad — one pixel over is still over. */
    return Math.min(320, Math.floor(1088 / (0.58 * Math.max(1, word.length))));
  }

  /**
   * Wrap each word of a built node in a span, so they can arrive separately.
   *
   * Walks text nodes rather than rewriting innerHTML, because the line may
   * already contain the author's own inline formatting — a bold word, a
   * coloured one — and rebuilding the markup would throw it away.
   *
   * Each span carries its index and an EASED delay. A linear stagger reads
   * mechanically; this is the CSS of what After Effects does with ease on a
   * range selector — the wave starts quickly and slows as it finishes, so the
   * last word lands rather than stopping.
   *
   * @param {HTMLElement} node
   * @returns {number} how many words were wrapped
   */
  var WORD_EFFECTS = ['rise', 'fade', 'reveal'];
  var WORD_SPAN_MS = 900;
  /* The SHAPE of a planned arrival, as opposed to where it starts from.
 
     A start offset eased to rest can only ever be a settle, however the
     numbers are set — which is why "bounce it in" was not reachable with
     coordinates alone. Each arc is a keyframe set reading the same per-word
     variables, so the plan stays six numbers and the arc picks what those
     numbers mean on the way in:
 
       settle  eases to rest and stops
       bounce  goes PAST rest and comes back, twice, smaller each time
       mist    arrives in place while still soft, then condenses
 
     Loops are deliberately not bouncy: a word overshooting every eight
     seconds behind a title is a distraction with no end. */
  var WORD_ARCS = {
    settle: { on: 'sf-word-plan', loop: 'sf-cycle-plan' },
    bounce: { on: 'sf-word-plan-bounce', loop: 'sf-cycle-plan' },
    mist: { on: 'sf-word-plan-mist', loop: 'sf-cycle-mist' }
  };
  /* Letters cost one animated box each, so the ceiling is lower than the
     forty-word one: past about thirty the wave is longer than the sentence is
     worth and the paint cost starts showing on a projector. */
  var LETTER_CAP = 30;

  /* How fast the whole thing happens, and how far apart the words are.
 
     Two controls rather than six. The numbers in here were chosen by eye and
     were the only thing on offer; what an author actually asks is "slower" or
     "all together", not "620ms with a 2.2 ease on the stagger". Everything
     scales from one pair of choices so it cannot be set into an incoherent
     state — a quick entrance with a four-second wave is not a thing anyone
     wants, and it was reachable the moment these became six numbers. */
  /* Spread far enough apart to be told apart.
 
     The first set of numbers — 900/620/380ms with 1.5/1/0.6 on the wave —
     were all recognisably the same effect at three temperatures. Side by side
     a teacher could not say which was which, which makes three controls that
     do nothing. Gentle is now nearly twice Medium and Quick is under half of
     it, and the wave multiplier moves with it, so the three are different
     things rather than three settings of one.
 
     Lift travels with speed too: a word that takes 1.3 seconds to arrive
     should come further than one that takes a third of a second, or the long
     duration just reads as lag. */
  var WORD_SPEEDS = {
    gentle: { dur: 1300, cycle: 13000, span: 1.8, lift: '0.85em' },
    medium: { dur: 700,  cycle: 7000,  span: 1,   lift: '0.55em' },
    quick:  { dur: 320,  cycle: 3600,  span: 0.45, lift: '0.34em' }
  };
  /* Together is nothing at all; one-at-a-time is two and a half times the
     wave, so "the line arrives as one" and "the words arrive one by one" are
     obviously different sentences on the wall and not two similar ones. */
  var WORD_STAGGERS = { together: 0, wave: 1, one: 2.5 };

  /* Where the wave starts. Amount and origin are separate choices — the same
     split Motion's stagger(amount, { from }) makes — because "how far apart"
     and "in what order" are different questions, and folding them into one
     list of five options makes a control nobody can reason about.
 
     Centre-out is the one worth having beyond first-to-last: on a short line
     it reads as the phrase opening from its middle rather than being typed,
     which suits a statement that is one idea rather than a sentence with a
     subject and an end. */
  var WORD_FROMS = {
    first: function (i, last) { return last ? i / last : 0; },
    last: function (i, last) { return last ? 1 - i / last : 0; },
    /* Distance from the middle, normalised so the centre word is 0 and both
       ends are 1. An even number of words has no middle word, so the two
       nearest it share the first beat — which is what "from the centre"
       means when there is no centre. */
    center: function (i, last) {
      if (!last) return 0;
      var middle = last / 2;
      return Math.abs(i - middle) / middle;
    }
  };

  /** Which end the wave starts from. First unless the slide says otherwise. */
  function wordFrom(slide) {
    var want = String((slide.design || {}).wordFrom || '').trim();
    return Object.prototype.hasOwnProperty.call(WORD_FROMS, want) ? want : 'first';
  }

  /** The speed record a slide asks for. Medium unless it says otherwise. */
  function wordSpeed(slide) {
    var want = String((slide.design || {}).wordSpeed || '').trim();
    return WORD_SPEEDS[want] ? want : 'medium';
  }

  /** How far apart the words are: together, an eased wave, or one at a time. */
  function wordStagger(slide) {
    var want = String((slide.design || {}).wordStagger || '').trim();
    return Object.prototype.hasOwnProperty.call(WORD_STAGGERS, want) ? want : 'wave';
  }

  function wrapWords(node, opts) {
    var texts = [];
    (function walk(n) {
      for (var i = 0; i < n.childNodes.length; i++) {
        var kid = n.childNodes[i];
        if (kid.nodeType === 3) { if (String(kid.nodeValue).trim()) texts.push(kid); }
        else if (kid.nodeType === 1) walk(kid);
      }
    })(node);
    /* Count first: the delay of a unit depends on how many there are. */
    var letters = !!(opts && opts.unit === 'letter');
    /* Kept before the split, to hand back to a screen reader afterwards. */
    var said = texts.map(function (t) { return String(t.nodeValue); }).join('').trim();
    var total = 0;
    texts.forEach(function (text) {
      String(text.nodeValue).split(/(\s+)/).forEach(function (part) {
        if (part.trim()) total += letters ? part.length : 1;
      });
    });
    if (!total || total > (letters ? LETTER_CAP : 40)) return 0;
    /* The wave is as long as the line needs, scaled by the two controls. At
       "together" it is zero, and every word carries the same delay of nothing —
       which is the whole line arriving as one movement. */
    var stretch = (opts && Number.isFinite(opts.stretch)) ? opts.stretch : 1;
    var order = WORD_FROMS[(opts && opts.from) || 'first'] || WORD_FROMS.first;
    /* The base wave is as long as the line needs; the cap rises with the
       spread so "one at a time" on a six-word line is not quietly clamped
       back to the same wave as everything else. */
    /* Per unit, letters get a shorter step than words: twenty letters at a
       word's spacing is a line that takes three seconds to say itself. */
    var span = Math.min(WORD_SPAN_MS * 3, Math.max(240, total * (letters ? 48 : 130))) * stretch;
    var seen = 0;
    texts.forEach(function (text) {
      var frag = document.createDocumentFragment();
      String(text.nodeValue).split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        /* One box per word even when animating letters, so the line still
           breaks between words and never down the middle of one. */
        var host = letters ? el('span', 'wword') : frag;
        /* A screen reader reading nineteen one-character elements says
           "E v e r y c h a r t" — it spells the line out. Word spans are
           invisible to the accessibility tree because a word is still a word;
           a letter is not, so the split has to be hidden and the sentence
           given back whole on the line itself. */
        if (letters) host.setAttribute('aria-hidden', 'true');
        (letters ? part.split('') : [part]).forEach(function (piece) {
          /* Where this unit sits in the wave, 0 first to 1 last — which end
             that is depends on the origin. */
          var at = order(seen, total - 1);
          /* Ease out: 1 - (1 - t)^2.2. Early units are close together, the
             tail spreads, which is what makes it read as one movement. */
          var delay = Math.round((1 - Math.pow(1 - at, 2.2)) * span);
          var w = el('span', 'w');
          w.style.setProperty('--i', String(seen));
          w.style.setProperty('--d', delay + 'ms');
          w.textContent = piece;
          host.appendChild(w);
          seen++;
        });
        if (letters) frag.appendChild(host);
      });
      if (text.parentNode) text.parentNode.replaceChild(frag, text);
    });
    if (letters && seen) {
      /* The sentence, once, for anything that is not looking at it.
 
         aria-label was the obvious fix and does not work here: the roles that
         fit a line of prose take no name from the author, so the label is
         dropped and the line reads as empty. A visually hidden copy is the
         thing every screen reader agrees on — measured in
         tools/smoke-cover-motion.mjs against an unsplit line.
 
         It does mean the line appears twice in textContent while letters are
         animating. Nothing reads a rendered statement's text: the handout and
         the PDF re-render from slide.body, and the copy is clipped to a pixel
         so it costs nothing on screen or on paper. */
      node.insertBefore(el('span', 'sr-only', said), node.firstChild);
    }
    return seen;
  }

  /**
   * A per-word choreography: where each word starts, and when.
   *
   * The three presets move every word the same way and differ only in timing.
   * A plan gives each word its own offset, rotation, scale, blur and delay —
   * the thing a motion designer would keyframe by hand, and the thing an
   * author cannot express by picking from a list of three. Written by the AI
   * button in the Motion pane, or by hand by anyone who enjoys that.
   *
   * Two gates, both necessary.
   *
   * The plan carries the line it was written for: edit the words and it is
   * stale, and a choreography for "Every chart is a choice" applied to
   * "Charts lie" would place four words that are not there. Same trick the
   * inline formatting store uses to know when its offsets have expired.
   *
   * And every number is clamped here rather than trusted, because this
   * arrives from a language model: a dy of 4000 flings a word off a
   * projector, a scale of 0 is an invisible word, and a delay of a minute is
   * a line that never finishes arriving.
   *
   * @param {object} slide
   * @param {string} said the line as it is now
   * @param {number} count how many words were wrapped
   * @returns {Array<{dx:string,dy:string,rot:string,scale:number,blur:string,delay:number}>|null}
   */
  /**
   * Whether a stored plan choreographs words or letters.
   *
   * Read BEFORE the line is split, because it decides how to split it: a
   * letter plan matched against a word count is a plan that never applies.
   */
  function wordPlanUnit(slide) {
    var plan = (slide && slide.design || {}).wordPlan;
    return plan && plan.unit === 'letter' ? 'letter' : 'word';
  }

  function wordPlan(slide, said, count) {
    var plan = (slide.design || {}).wordPlan;
    if (!plan || !Array.isArray(plan.words) || !plan.words.length) return null;
    if (String(plan.text || '').trim() !== String(said || '').trim()) return null;
    if (plan.words.length !== count) return null;
    /* A number the model left out must come back as the RESTING value, not as
       a clamp of Number(null) — which is 0, and would silently turn "no scale
       given" into a word shrunk to the 0.4 floor. */
    var num = function (v, lo, hi, fallback) {
      if (v === null || v === undefined || v === '') return fallback;
      var n = Number(v);
      return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
    };
    return plan.words.map(function (w) {
      var step = w && typeof w === 'object' ? w : {};
      /* An arc the stylesheet does not have is a word that never animates, so
         anything unrecognised settles. */
      var arc = WORD_ARCS[step.arc] ? step.arc : 'settle';
      return {
        arc: arc,
        keys: WORD_ARCS[arc],
        /* em rather than px: a word set at 320px and one at 44px should not
           travel the same distance. */
        dx: num(step.dx, -3, 3, 0).toFixed(2) + 'em',
        dy: num(step.dy, -3, 3, 0).toFixed(2) + 'em',
        rot: num(step.rot, -30, 30, 0).toFixed(1) + 'deg',
        scale: num(step.scale, 0.4, 1.8, 1),
        blur: num(step.blur, 0, 14, 0).toFixed(1) + 'px',
        delay: Math.round(num(step.delay, 0, 3000, 0))
      };
    });
  }

  /** Which per-word entrance a slide asks for, or '' for none. */
  function wordEffect(slide) {
    var want = String((slide.design || {}).words || '').trim();
    return WORD_EFFECTS.indexOf(want) >= 0 ? want : '';
  }

  /**
   * Whether the words leave again and come back — in, hold, out, round.
   *
   * The one-shot entrance is for a statement a teacher talks over: it arrives
   * once and stays put. A loop is for the cover on screen while the room fills,
   * where the line has to be readable the fifth time as well as the first —
   * so the hold is most of the cycle and the wave out is the same eased wave
   * that brought them in, not a cut.
   *
   * Only with an entrance chosen: there is nothing to cycle otherwise.
   */
  function wordsLoop(slide) {
    return !!(slide.design && slide.design.wordsLoop) && !!wordEffect(slide);
  }

  function layoutStatement(slide, pad) {
    var said = String(slide.body || '').trim();
    var line = rich('div', 'statement', slide, 'body', said || 'Say the one thing');
    line.dataset.len = statementBand(said);
    /* One word, sized to the slide rather than to a band. */
    if (said && !/\s/.test(said)) {
      line.classList.add('statement-word');
      line.style.fontSize = statementWordSize(said) + 'px';
    }
    if (!said) line.classList.add('dim');
    /* Words arrive one at a time when the slide does. Only worth the markup
       when there is something to animate. */
    var effect = said ? wordEffect(slide) : '';
    if (effect) {
      var speed = WORD_SPEEDS[wordSpeed(slide)];
      var stretch = WORD_STAGGERS[wordStagger(slide)] * (speed.span || 1);
      /* The unit is decided by the stored plan, before the split: a plan
         written letter by letter has to be matched against letters. */
      var unit = wordPlanUnit(slide);
      var wrapped = wrapWords(line, { stretch: stretch, from: wordFrom(slide), unit: unit });
      /* A line too long to animate letter by letter falls back to whole words
         rather than to no motion at all. */
      if (!wrapped && unit === 'letter') {
        unit = 'word';
        wrapped = wrapWords(line, { stretch: stretch, from: wordFrom(slide) });
      }
      if (wrapped) {
        line.classList.add('words', 'words-' + effect);
        /* The stylesheet reads these: one duration for an entrance, one for a
           cycle, so a change of speed cannot leave the two disagreeing. */
        line.style.setProperty('--w-dur', speed.dur + 'ms');
        line.style.setProperty('--w-cycle', speed.cycle + 'ms');
        line.style.setProperty('--w-lift', speed.lift);
        if (wordsLoop(slide)) line.classList.add('words-loop');
        /* A choreography replaces the effect's own movement word by word, and
           its timing too: the plan says where each word starts and when. */
        var plan = unit === wordPlanUnit(slide) ? wordPlan(slide, said, wrapped) : null;
        if (plan) {
          line.classList.add('words-plan');
          if (unit === 'letter') line.classList.add('words-letters');
          var looping = wordsLoop(slide);
          var steps = plan;
          Array.prototype.forEach.call(line.querySelectorAll('.w'), function (w, i) {
            var step = steps[i];
            if (!step) return;
            w.style.setProperty('--wx', step.dx);
            w.style.setProperty('--wy', step.dy);
            w.style.setProperty('--wr', step.rot);
            w.style.setProperty('--ws', String(step.scale));
            w.style.setProperty('--wb', step.blur);
            w.style.setProperty('--d', step.delay + 'ms');
            /* The arc is the keyframe set, chosen per word — which is how one
               word can bounce in while the rest of the line settles. */
            w.style.setProperty('--wk', looping ? step.keys.loop : step.keys.on);
          });
        }
      }
    }
    pad.appendChild(line);
    /* Whose thought it was, or where the rule comes from. Small, under the
       line, and absent unless written — a statement with an empty credit
       under it is a statement with a gap under it. */
    if (slide.subtitle) pad.appendChild(rich('div', 'statement-credit', slide, 'subtitle', slide.subtitle));
  }

  function layoutIntroduction(slide, pad) {
    var portrait = el('div', 'lecturer-portrait');
    var src = SF.safeMedia(slide.image);
    if (src) {
      var img = el('img'); img.src = src; img.alt = slide.title ? 'Portrait of ' + slide.title : 'Lecturer portrait';
      img.style.objectFit = slide.imageFit || 'cover'; portrait.appendChild(img);
    } else {
      portrait.classList.add('empty');
      portrait.appendChild(el('span', null, 'Headshot'));
    }
    var copy = el('div', 'lecturer-copy');
    copy.appendChild(el('div', 'lecturer-kicker', 'Meet your lecturer'));
    copy.appendChild(rich('h1', null, slide, 'title', slide.title));
    if (slide.subtitle) copy.appendChild(rich('div', 'lecturer-role', slide, 'subtitle', slide.subtitle));
    if (slide.body) copy.appendChild(rich('p', 'lecturer-bio', slide, 'body', slide.body));
    pad.appendChild(portrait); pad.appendChild(copy);
  }

  function layoutJourney(slide, pad) {
    pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    if (slide.subtitle) pad.appendChild(rich('div', 'journey-context', slide, 'subtitle', slide.subtitle));
    var stops = (slide.bullets || []).map(SF.parseKeywordLine).filter(function (p) { return p.term || p.def; });
    /* Stepper: numbered discs on one horizontal rail with the copy beneath —
       a process read left to right in one glance, the infographic idiom for
       "first, then, then". Handover keeps its columns; path keeps its route. */
    var route = el('ol', 'journey-route' +
      (slide.journeyMode === 'handover' ? ' journey-handover' : slide.journeyMode === 'stepper' ? ' journey-stepper' : ''));
    stops.forEach(function (p, i) {
      var stop = asStep(el('li', 'journey-stop'), slide);
      /* The number is decoration over an ordered list: the list already says
         these are steps, so a screen reader counting them twice is noise. */
      var marker = el('span', 'journey-marker', String(i + 1).padStart(2, '0'));
      marker.setAttribute('aria-hidden', 'true');
      stop.appendChild(marker);
      var copy = el('div', 'journey-copy');
      copy.appendChild(el('h3', null, p.term));
      if (p.def) copy.appendChild(el('p', null, p.def));
      stop.appendChild(copy);
      route.appendChild(stop);
    });
    pad.appendChild(route);
    if (slide.body) pad.appendChild(rich('div', 'journey-takeaway', slide, 'body', slide.body));
  }

  function layoutMindmap(slide, pad) {
    var map = el('div', 'mindmap');
    map.setAttribute('role', 'group'); map.setAttribute('aria-label', 'Mind map: ' + slide.title);
    var branches = (slide.bullets || []).map(SF.parseKeywordLine).filter(function (p) { return p.term || p.def; });
    var rows = Math.ceil(branches.length / 2);
    branches.forEach(function (p, i) {
      var left = i % 2 === 0, y = (Math.floor(i / 2) + 0.5) * 100 / rows;
      var branch = asStep(el('div', 'mindmap-branch'), slide);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 50 50 C ' + (left ? '32 50, 38 ' : '68 50, 62 ') + y + ', ' + (left ? 18 : 82) + ' ' + y);
      path.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(path); branch.appendChild(svg);
      var node = el('div', 'mindmap-node'); node.style.left = (left ? 17 : 83) + '%'; node.style.top = y + '%';
      node.appendChild(el('strong', null, p.term));
      if (p.def) node.appendChild(el('span', null, p.def));
      branch.appendChild(node); map.appendChild(branch);
    });
    var centre = el('div', 'mindmap-centre'); centre.appendChild(rich('h2', null, slide, 'title', slide.title || 'Central idea'));
    map.appendChild(centre); pad.appendChild(map);
  }

  /* People, and who reports to whom.

     One layout covers both shapes an author actually wants: a hierarchy when
     the lines say who reports to whom, and a single row of equals when they
     do not. A team slide of four directors is not a degenerate org chart, it
     is the ordinary case, and forcing a head onto it would invent a
     hierarchy nobody wrote.

     CSS grid rather than absolute positions or SVG: the boxes have to hold
     real names at real sizes, and a name that is one word longer should push
     its own row rather than overlap the next. Connectors are drawn with
     borders on the grid cells for the same reason — they follow the boxes
     instead of being measured against them. */
  function personCard(p, slide) {
    var card = el('div', 'org-card');
    card.setAttribute('aria-label', p.name + (p.role ? ', ' + p.role : ''));
    if (p.photo) {
      var ph = el('div', 'org-photo');
      ph.style.backgroundImage = 'url("' + String(p.photo).replace(/"/g, '&quot;') + '")';
      ph.setAttribute('role', 'img');
      ph.setAttribute('aria-label', p.name);
      card.appendChild(ph);
    } else if (p.name) {
      /* Initials rather than a grey silhouette: a placeholder that says who
         is missing is more use than one that says somebody is. */
      var mono = el('div', 'org-photo org-initials');
      mono.textContent = p.name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
      mono.setAttribute('aria-hidden', 'true');
      card.appendChild(mono);
    }
    var who = el('div', 'org-who');
    who.appendChild(el('strong', null, p.name));
    if (p.role) who.appendChild(el('span', null, p.role));
    card.appendChild(who);
    return card;
  }

  function orgBranch(p, slide) {
    var node = el('div', 'org-node');
    node.appendChild(asStep(personCard(p, slide), slide));
    /* Draw every report — capping depth used to drop people with no warning.
       Density CSS (lvl-N / org-dense) keeps a deep tree readable on the wall. */
    if (p.reports && p.reports.length) {
      var kids = el('div', 'org-kids' + (p.reports.length === 1 ? ' one' : ''));
      p.reports.forEach(function (c) { kids.appendChild(orgBranch(c, slide)); });
      node.appendChild(kids);
    }
    return node;
  }

  function layoutOrg(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    if (slide.subtitle) pad.appendChild(rich('div', 'sub', slide, 'subtitle', slide.subtitle));
    var tree = SF.orgTree(slide.bullets || []);
    if (!tree.people.length) {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '\u26ec'));
      e.appendChild(el('div', null, 'One person per line: Name | Role | Reports to | photo'));
      pad.appendChild(e);
      return;
    }
    var wrap = el('div', 'org-chart lvl-' + Math.min(6, Math.max(1, tree.levels)) +
      (tree.levels === 1 ? ' org-flat' : '') +
      (tree.people.length > 8 || tree.levels > 4 ? ' org-dense' : ''));
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'People: ' + tree.people.map(function (p) {
      return p.name + (p.role ? ', ' + p.role : '');
    }).join('; '));
    tree.roots.forEach(function (r) { wrap.appendChild(orgBranch(r, slide)); });
    pad.appendChild(wrap);
  }

  function layoutSection(slide, pad) {
    pad.appendChild(rich('h1', null, slide, 'title', slide.title || ' '));
    if (slide.subtitle) pad.appendChild(rich('div', 'sub', slide, 'subtitle', slide.subtitle));
    pad.appendChild(el('div', 'accent-bar'));
  }

  function layoutContent(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var ul = el('ul');
    /* Keywords, links and split all show a dim prompt when their pits are
       empty; this one rendered three invisible list items instead, so a fresh
       bullets or cards slide looked like a rendering failure. */
    var anyText = (slide.bullets || []).some(function (b) { return String(b || '').trim(); });
    if (!anyText) {
      var hint = el('li', 'dim', 'Add points in the inspector');
      ul.appendChild(hint);
      pad.appendChild(ul);
      return;
    }
    /* Stacked cards: every card in the same spot, the one being talked about
       in front, the ones already made peeking out behind it. Five things get
       five moments instead of competing for the same glance, and the pile
       behind shows how far through the set the room is. DOM order does the
       layering for free — a later card paints over an earlier one — so
       nothing here needs a z-index. */
    if (slide.type === 'cards' && (slide.design || {}).cardsMode === 'stack') {
      ul.classList.add('cards-stack');
    }
    /* Rows rather than columns. Three cards side by side give each one about a
       third of the slide to wrap in, which is fine for three words and cruel to
       a definition — the column gets so narrow that the label breaks up ("Rule
       / of / thumb") and the whole thing reads as one card with three columns
       rather than three cards. Down the slide instead, each card gets the full
       width and only as much height as it needs. */
    if (slide.type === 'cards' && (slide.design || {}).cardsMode === 'rows') {
      ul.classList.add('cards-rows');
    }
    /* Picture cards: every card carries an image slot above its copy. A slot
       with nothing in it draws the same dashed "Add an image" prompt as an
       empty split, so a template can promise a photograph without shipping
       one — the author sees where it goes. */
    var pictureCards = slide.type === 'cards' && (slide.design || {}).cardsMode === 'pictures';
    var pics = slide.type === 'cards' ? (slide.images || []) : [];
    if (pics.some(Boolean) || pictureCards) {
      ul.classList.add('has-card-pics');
      /* Maps and scientific plates need landscape + contain; book covers keep 3:4 cover. */
      if ((slide.design || {}).cardPics === 'plates') ul.classList.add('has-card-plates');
    }
    var lines = (slide.bullets || []).map(function(text,index){return {text:text,index:index};}).filter(function (b) { return String(b.text).trim(); });
    lines.forEach(function (item) {
      var line=item.text;
      var li;
      if (slide.type === 'cards' && line.indexOf('\t') >= 0) {
        var pair = SF.parseKeywordLine(line);
        li = asStep(el('li', bulletTier(line) === 2 ? 'tier-2' : null), slide);
        li.appendChild(el('strong', slide.activity ? 'activity-card-label' : 'card-label', pair.term));
        li.appendChild(el('span', slide.activity ? 'activity-card-copy' : 'card-body', pair.def));
      } else if (slide.type === 'content' && bulletTier(line) === 1 && line.indexOf('\t') >= 0) {
        /* The lead-in the layout bank has always documented — the part before
           the tab set bold, the rest running on from it, so a point can carry
           its own sub-clause. It had no branch here, so the tab collapsed to a
           space in HTML and sixteen bullets across the shipped lessons said
           their lead-in out loud and then didn't show it.

           A leading tab is a sub-bullet, not a lead-in, so tier 2 is excluded:
           splitting on the first tab there would take the indent as the term. */
        var lead = SF.parseKeywordLine(line);
        li = asStep(el('li', null), slide);
        li.appendChild(el('strong', 'lead-in', lead.term));
        if (lead.def) li.appendChild(el('span', 'lead-rest', lead.def));
      } else {
        li = asStep(rich('li', bulletTier(line) === 2 ? 'tier-2' : null, slide, 'bullets.' + item.index, bulletText(line)), slide);
      }
      var src = pics[item.index];
      if (src || pictureCards) {
        var pic = el('div', 'card-pic' + (src ? '' : ' card-pic-empty'));
        if (src) pic.style.backgroundImage = 'url("' + String(src).replace(/"/g, '&quot;') + '")';
        else pic.appendChild(el('span', null, 'Add an image'));
        pic.setAttribute('aria-hidden', 'true');
        var copy = el('div', 'card-copy');
        while (li.firstChild) copy.appendChild(li.firstChild);
        li.appendChild(pic);
        li.appendChild(copy);
      }
      ul.appendChild(li);
    });
    pad.appendChild(ul);
  }

  /* Bold keyword + lowercase definition — glossary / dual-coding of terms. */
  function layoutKeywords(slide, pad) {
    var title = slide.title ? rich('h2', null, slide, 'title', slide.title) : null;
    var list = el('div', 'kw-list');
    var rows = (slide.bullets || []).map(SF.parseKeywordLine)
      .filter(function (p) { return p.term || p.def; });
    if (!rows.length) {
      var empty = el('div', 'kw-row dim');
      empty.appendChild(el('strong', 'kw-term', 'Keyword'));
      empty.appendChild(el('span', 'kw-def', 'add a plain-language definition'));
      list.appendChild(empty);
    } else {
      rows.forEach(function (p, i) {
        var row = asStep(el('div', 'kw-row'), slide);
        /* Same canvas-edit path as title and bullet lists — double-click the
           panel to rewrite the label and the line under it. */
        row.dataset.contentKey = 'bullets.' + i;
        row.appendChild(rich('strong', 'kw-term', slide, 'bullets.' + i, p.term || ' '));
        row.appendChild(rich('span', 'kw-def', slide, 'bullets.' + i, p.def || ' '));
        list.appendChild(row);
      });
    }
    var answer = modelAnswerBox(slide);
    if (!answer) {
      if (title) pad.appendChild(title);
      pad.appendChild(list);
      return;
    }
    /* A draft answer makes no card. It sits under the task where the author
       will meet it while editing, and the stylesheet keeps it off the wall —
       so there is nothing for the clock to turn over and nothing for a room to
       read until somebody has rewritten it. */
    if (slide.modelAnswerDraft) {
      if (title) pad.appendChild(title);
      pad.appendChild(list);
      pad.appendChild(answer);
      return;
    }
    /* Task on the front, worked answer on the back. The heading belongs on the
       front with the task — otherwise it stays on the pad when the card turns
       and the answer draws through it. */
    var flip = el('div', 'flip');
    var front = el('div', 'flip-face flip-front');
    var back = el('div', 'flip-face flip-back');
    if (title) front.appendChild(title);
    front.appendChild(list);
    back.appendChild(answer);
    flip.appendChild(front);
    flip.appendChild(back);
    pad.appendChild(flip);
  }

  /* What a good answer looks like, on the screen rather than only in the
     speaker notes. An activity that asks the room to attempt something owes
     them a worked answer afterwards; leaving it in the notes means the lecturer
     has it and the room does not. Added last and as a build step, so it is
     always the final press: the attempt has to happen before the answer can. */
  function modelAnswerBox(slide) {
    var text = String(slide.modelAnswer || '').trim();
    if (!text) return null;
    var draft = !!slide.modelAnswerDraft;
    var box = el('div', 'model-answer' + (draft ? ' model-answer-draft' : ''));
    box.appendChild(el('div', 'model-answer-label', draft
      ? 'Draft from the activity library — rewrite this for your lesson'
      : 'What a good answer looks like'));
    box.appendChild(rich('div', 'model-answer-body', slide, 'modelAnswer', text));
    return box;
  }

  /* Italic phrase + plain gloss — emphasis without a formatting ribbon. */
  function layoutItalics(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var list = el('div', 'it-list');
    var rows = (slide.bullets || []).map(SF.parseKeywordLine)
      .filter(function (p) { return p.term || p.def; });
    if (!rows.length) {
      var empty = el('div', 'it-row dim');
      empty.appendChild(el('em', 'it-phrase', 'key phrase'));
      empty.appendChild(el('span', 'it-note', 'why this wording matters'));
      list.appendChild(empty);
    } else {
      rows.forEach(function (p) {
        var row = asStep(el('div', 'it-row'), slide);
        row.appendChild(el('em', 'it-phrase', p.term || ' '));
        row.appendChild(el('span', 'it-note', p.def || ' '));
        list.appendChild(row);
      });
    }
    pad.appendChild(list);
  }

  /* Label on top, clickable URL below — further reading. */
  function layoutLinks(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var list = el('div', 'ln-list');
    var rows = (slide.bullets || []).map(SF.parseKeywordLine)
      .filter(function (p) { return p.term || p.def; });
    /* Density follows how much is on the wall: one URL should read from the
       back of the room; a long reading list must stay compact. Author can
       still override with Customise → Text size. */
    var n = rows.length;
    if (n <= 1) list.classList.add('ln-hero');
    else if (n === 2) list.classList.add('ln-sparse');
    else if (n >= 5) list.classList.add('ln-dense');
    if (!rows.length) {
      var empty = el('div', 'ln-row dim');
      empty.appendChild(el('div', 'ln-label', 'Resource title'));
      empty.appendChild(el('div', 'ln-url', 'https://…'));
      list.appendChild(empty);
      list.classList.add('ln-hero');
    } else {
      rows.forEach(function (p) {
        var row = el('div', 'ln-row');
        var href = SF.safeHref(p.def);
        var label = p.term || (href ? href.replace(/^https?:\/\//i, '') : 'Link');
        row.appendChild(el('div', 'ln-label', label));
        if (href) {
          var a = el('a', 'ln-link');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = href;
          a.addEventListener('click', function (e) { e.stopPropagation(); });
          row.appendChild(a);
        } else if (p.def) {
          row.appendChild(el('div', 'ln-url bad', p.def + ' — needs http(s)'));
        } else {
          row.appendChild(el('div', 'ln-url', 'Add a URL'));
        }
        list.appendChild(row);
      });
    }
    pad.appendChild(list);
  }

  function layoutQuote(slide, pad) {
    var text = slide.body || ' ';
    if (slide.progressive) {
      var lines = String(text).split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length > 1) {
        var wrap = el('div', 'q q-build');
        lines.forEach(function (line) {
          wrap.appendChild(asStep(rich('div', 'q-line', slide, 'body', line), slide));
        });
        pad.appendChild(wrap);
      } else {
        pad.appendChild(asStep(rich('div', 'q', slide, 'body', text), slide));
      }
    } else {
      pad.appendChild(rich('div', 'q', slide, 'body', text));
    }
    if (slide.subtitle) pad.appendChild(rich('div', 'attrib', slide, 'subtitle', slide.subtitle));
  }

  /**
   * Which generated backdrop a cover asks for, or '' for none.
   *
   * Named rather than free-form so the stylesheet owns what each one looks
   * like: an author picks "drift" and gets whatever reads well in their
   * theme, rather than a set of numbers they have to tune per palette.
   *
   * @param {object} slide
   * @returns {string} 'drift' | 'grid' | 'glow' | ''
   */
  var BACKDROPS = ['drift', 'grid', 'glow'];

  function backdropMotion(slide) {
    var want = String((slide.design || {}).backdrop || '').trim();
    return BACKDROPS.indexOf(want) >= 0 ? want : '';
  }

  /**
   * A Ken Burns move with a destination: where the frame starts, where it
   * ends, and how long it takes.
   *
   * The existing zoom anchors its transform-origin to the focus point, which
   * drifts *towards* a place but cannot travel *between* two. Teaching wants
   * the second thing — "start on the whole chart, end on the axis label" — so
   * this computes both frames and lets CSS interpolate between them.
   *
   * The image is scaled up by SCALE so there is somewhere to travel: with
   * transform-origin at 0 0, bringing the point at fx% to the middle is
   * translate(50 - fx*s). Clamped to the slack the scale bought, because past
   * that the picture's own edge comes into frame — and clamping is exactly the
   * behaviour a focus point on the edge should have: it pans as far as the
   * edge and stops.
   *
   * @param {object} slide
   * @returns {{from: string, to: string, secs: number}|null}
   */
  var TRAVEL_SCALE = 1.2;
  var TRAVEL_SECS = { 12: 12, 20: 20, 30: 30 };

  function travelFrame(fx, fy) {
    var s = TRAVEL_SCALE, slack = -(s - 1) * 100;
    var tx = Math.max(slack, Math.min(0, 50 - fx * s));
    var ty = Math.max(slack, Math.min(0, 50 - fy * s));
    return 'translate(' + tx.toFixed(2) + '%, ' + ty.toFixed(2) + '%) scale(' + s + ')';
  }

  function imageTravel(slide) {
    var d = slide.design || {};
    if (d.imageMotion !== 'travel') return null;
    var num = function (v, fallback) {
      var n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
    };
    var fromX = num(d.focalX, 50), fromY = num(d.focalY, 50);
    var toX = num(d.focalX2, 50), toY = num(d.focalY2, 50);
    /* Nowhere to go is not a move: without a destination this would animate
       from a frame to the same frame for twenty seconds. */
    if (Math.abs(fromX - toX) < 1 && Math.abs(fromY - toY) < 1) return null;
    return {
      from: travelFrame(fromX, fromY),
      to: travelFrame(toX, toY),
      secs: TRAVEL_SECS[Number(d.imageTravelSecs)] || 20
    };
  }

  /* How a caption sits on the picture. Scrim is the default and the safest —
     a gradient reads over any image. Bar and plain assume the author has
     looked at theirs. */
  function capClass(slide) {
    var d = slide.design || {};
    var style = ['scrim', 'bar', 'plain', 'none'].indexOf(d.capStyle) >= 0 ? d.capStyle : 'scrim';
    return 'cap-' + style + (d.capPos === 'top' ? ' cap-top' : '');
  }

  /* Seconds a caption stays on the picture before clearing itself off it, or 0
     for never. A full-bleed photograph is partly hidden by its own caption —
     fine while it is being introduced, a nuisance once the room is looking at
     the thing itself. Off unless asked for: a caption that vanishes on its own
     is a choice the author should make deliberately, not discover in front of
     a room. Capped, because a caption that leaves after five minutes has not
     left. */
  function capFade(slide) {
    var secs = Number((slide.design || {}).capFade);
    return secs > 0 ? Math.min(120, secs) : 0;
  }

  /* A picture either fills the slide and lets the caption sit on top of it, or
     it takes a shape of its own and the caption sits clear below. Full bleed
     is right for a photograph; a chart wants a frame, because a caption bar
     across the bottom of a chart covers the axis labels. */
  var IMAGE_FRAMES = { '16:9': '16 / 9', '4:3': '4 / 3', '3:2': '3 / 2', '1:1': '1 / 1', '4:5': '4 / 5' };

  function imageFrame(slide) {
    var want = (slide.design || {}).imageFrame;
    return Object.prototype.hasOwnProperty.call(IMAGE_FRAMES, want) ? want : '';
  }

  function layoutImage(slide, pad, opts) {
    var facts = String(slide.body || '').trim();
    var frame = imageFrame(slide);
    if (frame) {
      pad.classList.add('img-framed');
      pad.style.setProperty('--img-ar', IMAGE_FRAMES[frame]);
    }
    if (slide.image) {
      var travel = imageTravel(slide);
      var motion = travel ? ' img-motion-travel'
        : (slide.design || {}).imageMotion === 'zoom' ? ' img-motion-zoom' : '';
      var img = el('div', 'img ' + (slide.imageFit === 'contain' ? 'contain' : 'cover') + motion);
      if (travel) {
        /* Read by the keyframes: CSS interpolates between two transforms it
           was handed rather than between two numbers it computed. */
        img.style.setProperty('--kb-from', travel.from);
        img.style.setProperty('--kb-to', travel.to);
        img.style.setProperty('--kb-dur', travel.secs + 's');
      }
      img.style.backgroundImage = 'url("' + String(slide.image).replace(/"/g, '&quot;') + '")';
      /* An image slide has nothing to build but the image, so Build on Next
         here means one thing: the room gets asked before it gets shown. */
      asStep(img, slide);
      pad.appendChild(img);
      if (facts && (!opts || opts.chrome !== false)) {
        var back = el('div', 'image-facts-back');
        back.hidden = true;
        back.appendChild(el('h2', null, slide.title || 'Behind the image'));
        facts.split(/\n/).filter(function (line) { return line.trim(); }).forEach(function (line) {
          back.appendChild(el('p', null, line));
        });
        var flip = el('button', 'image-facts-toggle', '\u21c4');
        flip.type = 'button';
        flip.title = 'Flip to facts';
        flip.setAttribute('aria-label', 'Flip to facts');
        flip.setAttribute('aria-expanded', 'false');
        flip.onclick = function (event) {
          event.stopPropagation();
          back.hidden = !back.hidden;
          var showingFacts = !back.hidden;
          flip.title = showingFacts ? 'Back to image' : 'Flip to facts';
          flip.setAttribute('aria-label', flip.title);
          flip.setAttribute('aria-expanded', String(showingFacts));
        };
        pad.appendChild(back);
        pad.appendChild(flip);
      }
      /* Caption and credit travel together as one step: the credit answers
         "says who?" about the caption, so revealing them apart would leave a
         claim on screen with its source still hidden. */
      if (slide.title || slide.subtitle) {
        var fade = capFade(slide);
        var box = asStep(el('div', 'cap ' + capClass(slide) + (fade ? ' cap-fade' : '')), slide);
        /* The clock is the delay on a CSS animation rather than a timer here,
           so it needs no cleanup and restarts by itself every time the slide
           is drawn — including when a build reveals the caption late. */
        if (fade) box.style.setProperty('--sf-cap-fade', fade + 's');
        if (slide.title) box.appendChild(rich('div', 'cap-line', slide, 'title', slide.title));
        if (slide.subtitle) box.appendChild(rich('div', 'cap-credit', slide, 'subtitle', slide.subtitle));
        pad.appendChild(box);
      }
    } else {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '▣'));
      e.appendChild(el('div', null, 'Paste an image URL or drop a file in the inspector'));
      pad.appendChild(e);
    }
  }

  /* An image stack: several pictures in one place, each in front of the last.
     Five charts get five moments instead of five thumbnails competing for the
     same glance, and the pile behind shows how far through the set the room
     is. Same --depth mechanic as the stacked cards. Empty imageFrame = full
     bleed (caption over the picture), matching the Design panel and image
     slides; a set ratio frames the figure with the caption below. */
  function layoutGallery(slide, pad) {
    var frame = imageFrame(slide);
    var bleed = !frame;
    if (bleed) pad.classList.add('img-bleed');
    if (slide.title && !bleed) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var layers = (slide.layers || []).filter(function (l) { return l && l.image; });
    if (!layers.length) {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '\u25a4'));
      e.appendChild(el('div', null, 'Add pictures in the inspector — each one gets its own moment'));
      pad.appendChild(e);
      return;
    }
    var stack = el('div', 'fig-stack');
    if (frame) stack.style.setProperty('--img-ar', IMAGE_FRAMES[frame]);
    layers.forEach(function (layer) {
      var fig = asStep(el('figure', 'fig'), slide);
      var img = el('div', 'img ' + (slide.imageFit === 'contain' ? 'contain' : 'cover'));
      img.style.backgroundImage = 'url("' + String(layer.image).replace(/"/g, '&quot;') + '")';
      fig.appendChild(img);
      if (layer.caption || layer.source) {
        var cap = el('figcaption', 'fig-cap ' + capClass(slide));
        if (layer.caption) cap.appendChild(el('div', 'cap-line', layer.caption));
        if (layer.source) cap.appendChild(el('div', 'cap-credit', layer.source));
        fig.appendChild(cap);
      }
      stack.appendChild(fig);
    });
    pad.appendChild(stack);
  }

  /* ------------------------------------------------------------- charts */

  /* Bar, line and pie, drawn as SVG from the same tabular text a table slide
     uses. No chart library: the app is opened from disk as often as served,
     and a dependency would have to be vendored anyway.
   *
   * Colour comes from --chart-1..6, a six-slot categorical palette derived
   * from the university's hues and validated for colour-vision deficiency —
   * see css/app.css. Slots are assigned in fixed order and never cycled; a
   * seventh series is a data problem, not a palette problem.
   */
  var CHART = { w: 1180, h: 430, padL: 92, padR: 40, padT: 22, padB: 62 };

  function chartColor(i) { return 'var(--chart-' + ((i % 6) + 1) + ')'; }

  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    return n;
  }

  /* Round an axis maximum up to something a reader can do arithmetic with. */
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var step = [1, 2, 2.5, 5, 10].filter(function (s) { return s * mag >= v; })[0] || 10;
    return step * mag;
  }

  /* A range that hugs the data instead of climbing to the next round
     number. niceMax alone turns a spread of 22–61 into an axis of 0–100 and
     squashes every box into the lower half — which is the axis working
     against the one thing a box plot is for. Pads by a tenth of the spread,
     then rounds each end to a readable step. Zero is kept when the data is
     already near it, because a distribution that reaches the floor should
     be seen to. */
  function niceStep(rough) {
    if (!(rough > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    return ([1, 2, 2.5, 5, 10].filter(function (m) { return m * mag >= rough; })[0] || 10) * mag;
  }

  function niceRange(lo, hi) {
    if (!(hi > lo)) return { lo: Math.min(0, lo), hi: (hi || 0) + 1 };
    var span = hi - lo, pad = span * 0.1;
    /* Sized from the gap between ticks rather than from the magnitude of
       the span: rounding 0–100 to the next whole hundred-and-fifty is how a
       chart ends up with half its height empty. */
    var step = niceStep(span / 4);
    var top = Math.ceil((hi + pad) / step) * step;
    /* No forced zero. That rule belongs to bars, where length encodes the
       quantity and a cropped baseline exaggerates every difference. A box
       plot and a scatter encode value as position, where insisting on zero
       just pushes the data into a corner — ages of 22 to 61 do not become
       more honest for having forty empty units under them. Zero is still
       used when the data nearly reaches it, because a distribution that
       touches the floor should be seen to. */
    var bottom = lo >= 0 && lo <= span * 0.15 ? 0 : Math.floor(lo / step) * step;
    return { lo: bottom, hi: top };
  }

  function axisTicks(max) {
    var out = [], n = 4;
    for (var i = 0; i <= n; i++) out.push(max * i / n);
    return out;
  }

  function fmt(v) {
    if (v == null) return '';
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
    return String(Math.round(v * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* Legend + a table of the same numbers. The legend is the dependable
     identity channel for two or more series; the table is what makes the
     values available to a screen reader, and to anyone who cannot separate
     two hues at all.

     Whether the legend belongs is decided by chartUsesSeriesLegend — not by
     an exclusion list that every new idiom had to remember to join. */
  function chartKey(data, slide) {
    var wrap = el('div', 'chart-key');
    if (!SF.chartUsesSeriesLegend || !SF.chartUsesSeriesLegend(slide && slide.chartKind, data.series.length)) {
      return wrap;
    }
    data.series.forEach(function (s, i) {
      var item = el('span', 'ck-item');
      var dot = el('i', 'ck-dot');
      dot.style.background = chartColor(i);
      item.appendChild(dot);
      item.appendChild(el('span', null, s.name));
      wrap.appendChild(item);
    });
    return wrap;
  }

  function chartTable(data, slide) {
    /* A Sankey's paste is from/to/amount — dumping chartData series would
       read the column headers as if they were comparable series. */
    if (slide && slide.chartKind === 'sankey' && SF.chartFlows) {
      var flows = SF.chartFlows(slide);
      var ft = el('table', 'chart-data-table');
      var fh = el('tr');
      ['From', 'To', 'Amount'].forEach(function (h) { fh.appendChild(el('th', null, h)); });
      ft.appendChild(fh);
      flows.links.forEach(function (l) {
        var tr = el('tr');
        tr.appendChild(el('td', null, l.from));
        tr.appendChild(el('td', null, l.to));
        tr.appendChild(el('td', null, fmt(l.value)));
        ft.appendChild(tr);
      });
      return ft;
    }
    var t = el('table', 'chart-data-table');
    var head = el('tr');
    head.appendChild(el('th', null, ''));
    data.series.forEach(function (s) { head.appendChild(el('th', null, s.name)); });
    t.appendChild(head);
    data.categories.forEach(function (c, r) {
      var tr = el('tr');
      tr.appendChild(el('th', null, c));
      data.series.forEach(function (s) { tr.appendChild(el('td', null, fmt(s.values[r]))); });
      t.appendChild(tr);
    });
    return t;
  }

  function barChart(data, slide, stepOf) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var all = [];
    data.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotW / Math.max(1, data.categories.length);
    var n = data.series.length;
    /* One <g class="step"> per beat, with the bars inside it. The reveal
       driver steps whole elements, so marking each bar individually would
       release them one at a time — a press has to land a whole series (or,
       with a single series, a whole category) for the comparison to hold. */
    var groups = [];
    var beats = n > 1 ? n : data.categories.length;
    for (var b = 0; b < beats; b++) {
      var gg = svgEl('g', { class: 'ch-beat', 'data-step': b });
      groups.push(gg);
      svg.appendChild(gg);
    }
    var beatFor = function (si, ci) { return groups[n > 1 ? si : ci]; };
    /* Never fill the band — the leftover is the air that separates one
       category from the next. Wider than a dashboard's 24px cap because this
       is a 1280px slide thrown at a lecture-theatre wall, not a card. */
    var groupW = Math.min(band * 0.62, 78 * n);
    var barW = Math.max(6, (groupW - (n - 1) * 2) / n);

    data.categories.forEach(function (cat, ci) {
      var x0 = P.padL + band * ci + (band - groupW) / 2;
      data.series.forEach(function (s, si) {
        var v = s.values[ci];
        if (v == null) return;
        var hgt = Math.max(0, (v / max) * plotH);
        var x = x0 + si * (barW + 2);
        var y = P.padT + plotH - hgt;
        var g = svgEl('g', { class: 'ch-bar' });
        /* 4px rounded at the data end, square at the baseline. */
        var r = Math.min(4, barW / 2);
        var d = 'M' + x + ' ' + (y + hgt) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
                ' H' + (x + barW - r) + ' Q' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + r) +
                ' V' + (y + hgt) + ' Z';
        var path = svgEl('path', { d: d, fill: chartColor(si) });
        g.appendChild(path);
        g.setAttribute('data-series', String(si));
        if (n === 1) {
          var val = svgEl('text', { x: x + barW / 2, y: y - 12, class: 'ch-value', 'text-anchor': 'middle' });
          val.textContent = fmt(v);
          g.appendChild(val);
        }
        beatFor(si, ci).appendChild(g);
      });
      var cl = svgEl('text', { x: P.padL + band * ci + band / 2, y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Stacked bars. The axis is the total rather than the tallest single
     value, which is the whole point of the idiom: it answers "how big
     altogether, and of what" where grouped bars answer "which is bigger".
     One beat per series, so a build lays the composition down a layer at a
     time — the order the argument is usually made in. */
  function stackedBar(data, slide, stepOf) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var totals = data.categories.map(function (_, ci) {
      return data.series.reduce(function (sum, s) {
        var v = s.values[ci];
        return sum + (v == null ? 0 : Math.max(0, v));
      }, 0);
    });
    var max = niceMax(Math.max.apply(null, totals.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotW / Math.max(1, data.categories.length);
    var barW = Math.min(band * 0.62, 120);
    var groups = data.series.map(function (_, si) {
      var gg = svgEl('g', { class: 'ch-beat', 'data-step': si });
      svg.appendChild(gg);
      return gg;
    });

    data.categories.forEach(function (cat, ci) {
      var x = P.padL + band * ci + (band - barW) / 2;
      var run = 0;
      data.series.forEach(function (sr, si) {
        var v = sr.values[ci];
        if (v == null || v <= 0) return;
        var hgt = (v / max) * plotH;
        var y = P.padT + plotH - (run + hgt) / 1 * 1 - 0;
        y = P.padT + plotH - ((run + v) / max) * plotH;
        var g = svgEl('g', { class: 'ch-bar' });
        g.setAttribute('data-series', String(si));
        g.appendChild(svgEl('rect', { x: x, y: y, width: barW, height: Math.max(0, hgt), fill: chartColor(si) }));
        /* Only where the band is deep enough to hold it; a number printed
           over a 6px sliver is unreadable and looks like a mistake. */
        if (hgt > 26) {
          var val = svgEl('text', { x: x + barW / 2, y: y + hgt / 2 + 6, class: 'ch-value ch-on-fill', 'text-anchor': 'middle' });
          val.textContent = fmt(v);
          g.appendChild(val);
        }
        groups[si].appendChild(g);
        run += v;
      });
      var cl = svgEl('text', { x: P.padL + band * ci + band / 2, y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Bars along the x axis. The reason to reach for it is category names:
     "Development", "Graphics", "Training" laid sideways under vertical bars
     either overlap or get turned on their side, and a reader should not have
     to tilt their head in a lecture theatre. */
  function horizontalBar(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    /* Room on the left is taken from the longest label rather than fixed,
       for the same reason the line chart sizes its right margin that way. */
    var longest = data.categories.reduce(function (n2, c) { return Math.max(n2, String(c).length); }, 0);
    var padL = Math.min(320, 40 + longest * 10);
    var plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var all = [];
    data.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var x = padL + (t / max) * plotW;
      svg.appendChild(svgEl('line', { x1: x, y1: P.padT, x2: x, y2: P.padT + plotH, class: 'ch-grid' }));
      var lab = svgEl('text', { x: x, y: P.padT + plotH + 28, class: 'ch-tick', 'text-anchor': 'middle' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotH / Math.max(1, data.categories.length);
    var n = data.series.length;
    var groupH = Math.min(band * 0.64, 70 * n);
    var barH = Math.max(6, (groupH - (n - 1) * 2) / n);
    var groups = [];
    var beats = n > 1 ? n : data.categories.length;
    for (var b = 0; b < beats; b++) {
      var gg = svgEl('g', { class: 'ch-beat', 'data-step': b });
      groups.push(gg);
      svg.appendChild(gg);
    }

    data.categories.forEach(function (cat, ci) {
      var y0 = P.padT + band * ci + (band - groupH) / 2;
      data.series.forEach(function (sr, si) {
        var v = sr.values[ci];
        if (v == null) return;
        var wdt = Math.max(0, (v / max) * plotW);
        var y = y0 + si * (barH + 2);
        var g = svgEl('g', { class: 'ch-bar' });
        g.setAttribute('data-series', String(si));
        g.appendChild(svgEl('rect', { x: padL, y: y, width: wdt, height: barH, rx: Math.min(4, barH / 2), fill: chartColor(si) }));
        if (n === 1) {
          var val = svgEl('text', { x: padL + wdt + 10, y: y + barH / 2 + 6, class: 'ch-value' });
          val.textContent = fmt(v);
          g.appendChild(val);
        }
        groups[n > 1 ? si : ci].appendChild(g);
      });
      var cl = svgEl('text', { x: padL - 14, y: P.padT + band * ci + band / 2 + 6, class: 'ch-cat', 'text-anchor': 'end' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    svg.appendChild(svgEl('line', { x1: padL, y1: P.padT, x2: padL, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Position against two common scales — the encoding at the top of the
     effectiveness ranking, and the only one here that answers "do these two
     things move together". Everything above this point in the file compares
     magnitudes; this is the first that shows a relationship. */
  function scatterChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var d = SF.chartPoints(slide);
    var padL = P.padL, plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var xs = [], ys = [];
    d.series.forEach(function (sr) { sr.points.forEach(function (pt) { xs.push(pt.x); ys.push(pt.y); }); });
    if (!xs.length) return svg;
    /* Both axes start at zero unless the data does not go near it. A
       scatter is read for its shape, and a truncated axis makes a weak
       relationship look like a strong one — the exact failure the lecture
       spends a slide on. */
    var xr = niceRange(Math.min.apply(null, xs), Math.max.apply(null, xs));
    var yr = niceRange(Math.min.apply(null, ys), Math.max.apply(null, ys));
    var x0 = xr.lo, xMax = xr.hi, y0 = yr.lo, yMax = yr.hi;
    var xAt = function (v) { return padL + ((v - x0) / (xMax - x0 || 1)) * plotW; };
    var yAt = function (v) { return P.padT + plotH - ((v - y0) / (yMax - y0 || 1)) * plotH; };

    axisTicks(yMax - y0).forEach(function (t) {
      var y = yAt(y0 + t);
      svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(y0 + t);
      svg.appendChild(lab);
    });
    axisTicks(xMax - x0).forEach(function (t) {
      var x = xAt(x0 + t);
      var lab = svgEl('text', { x: x, y: H - P.padB + 30, class: 'ch-tick', 'text-anchor': 'middle' });
      lab.textContent = fmt(x0 + t);
      svg.appendChild(lab);
    });

    /* Labels are nudged up until they clear the ones already placed, and a
       leader line keeps each one attached to its dot. Taken from the
       tube-line scatter in the pollution explorer, where the whole point is
       naming which line is the outlier rather than noting that one exists.

       Greedy and in drawing order rather than an optimiser: a lecturer wants
       the same arrangement every time they open the slide, and a solver that
       finds a prettier answer on the second run is worse than a plain rule
       that never moves. */
    var placed = [];
    d.series.forEach(function (sr, si) {
      var g = svgEl('g', { class: 'ch-line ch-points', 'data-step': si, 'data-series': String(si) });
      sr.points.forEach(function (pt) {
        var cx = xAt(pt.x), cy = yAt(pt.y), r = 9;
        var dot = svgEl('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r, fill: chartColor(si), class: 'ch-point' });
        if (pt.label) {
          var tip = svgEl('title', {});
          tip.textContent = pt.label + ' · ' + d.xLabel + ' ' + fmt(pt.x) + ' · ' + fmt(pt.y);
          dot.appendChild(tip);
        }
        g.appendChild(dot);
        if (!pt.label) return;
        var wide = pt.label.length * 7.4;
        var ly = cy - r - 9;
        var guard = 0;
        while (guard++ < 24 && placed.some(function (q) {
          return Math.abs(q.y - ly) < 16 && Math.abs(q.x - cx) < (q.w + wide) / 2 + 6;
        })) ly -= 17;
        placed.push({ x: cx, y: ly, w: wide });
        /* Only drawn once the label has actually moved: a leader from a dot
           to the text directly above it is a line nobody needs. */
        if (cy - r - ly > 13) {
          g.appendChild(svgEl('line', { x1: cx, y1: cy - r, x2: cx, y2: ly + 4, class: 'ch-leader' }));
        }
        var lab = svgEl('text', { x: cx.toFixed(1), y: ly.toFixed(1), class: 'ch-point-label', 'text-anchor': 'middle' });
        lab.textContent = pt.label;
        g.appendChild(lab);
      });
      svg.appendChild(g);
    });

    if (d.xLabel) {
      var xl = svgEl('text', { x: padL + plotW / 2, y: H - 6, class: 'ch-axis-label', 'text-anchor': 'middle' });
      xl.textContent = d.xLabel;
      svg.appendChild(xl);
    }
    svg.appendChild(svgEl('line', { x1: padL, y1: P.padT + plotH, x2: padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    svg.appendChild(svgEl('line', { x1: padL, y1: P.padT, x2: padL, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* One variable's shape. Bars touching, because the x axis is continuous
     and a gap between them would say these are separate categories. */
  function histogramChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var vals = SF.chartValues(slide);
    var bins = SF.histogramBins(vals);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!bins.length) return svg;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var max = niceMax(Math.max.apply(null, bins.map(function (b) { return b.count; })));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var bw = plotW / bins.length;
    var g = svgEl('g', { class: 'ch-beat', 'data-step': 0, 'data-series': '0' });
    bins.forEach(function (b, i) {
      var hgt = (b.count / max) * plotH;
      g.appendChild(svgEl('rect', { x: P.padL + i * bw, y: P.padT + plotH - hgt,
        width: Math.max(1, bw - 1), height: Math.max(0, hgt), fill: chartColor(0), class: 'ch-bin' }));
      if (i === 0 || i === bins.length - 1 || i % 2 === 0) {
        var lab = svgEl('text', { x: P.padL + i * bw, y: H - P.padB + 30, class: 'ch-tick', 'text-anchor': 'middle' });
        lab.textContent = fmt(Math.round(b.from * 10) / 10);
        svg.appendChild(lab);
      }
    });
    svg.appendChild(g);
    var n = svgEl('text', { x: P.padL + plotW, y: P.padT - 12, class: 'ch-tick', 'text-anchor': 'end' });
    n.textContent = vals.length + ' values · ' + bins.length + ' bins';
    svg.appendChild(n);
    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* The five-number summary, drawn. What a bar chart of means hides and
     what the lecture spends a slide asking for: spread, skew and the points
     that sit outside the fence. */
  function boxChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var groups = SF.chartGroups(slide);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!groups.length) return svg;
    var summaries = groups.map(function (g) { return SF.fiveNumber(g.values); });
    var all = [];
    groups.forEach(function (g) { g.values.forEach(function (v) { all.push(v); }); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var rng = niceRange(lo, hi);
    var base = rng.lo, top = rng.hi;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var yAt = function (v) { return P.padT + plotH - ((v - base) / (top - base || 1)) * plotH; };

    axisTicks(top - base).forEach(function (t) {
      var y = yAt(base + t);
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(base + t);
      svg.appendChild(lab);
    });

    var band = plotW / groups.length;
    var bw = Math.min(band * 0.5, 130);
    groups.forEach(function (grp, i) {
      var f = summaries[i];
      var cx = P.padL + band * i + band / 2, x = cx - bw / 2;
      var g = svgEl('g', { class: 'ch-beat ch-box', 'data-step': i, 'data-series': String(i) });
      var col = chartColor(i);
      /* Whisker, then box, then median: the median line has to sit above
         the fill or it disappears into it. */
      g.appendChild(svgEl('line', { x1: cx, y1: yAt(f.min), x2: cx, y2: yAt(f.max), class: 'ch-whisker', stroke: col }));
      g.appendChild(svgEl('line', { x1: cx - bw / 4, y1: yAt(f.min), x2: cx + bw / 4, y2: yAt(f.min), class: 'ch-whisker', stroke: col }));
      g.appendChild(svgEl('line', { x1: cx - bw / 4, y1: yAt(f.max), x2: cx + bw / 4, y2: yAt(f.max), class: 'ch-whisker', stroke: col }));
      g.appendChild(svgEl('rect', { x: x, y: yAt(f.q3), width: bw, height: Math.max(1, yAt(f.q1) - yAt(f.q3)),
        fill: col, opacity: 0.32, stroke: col, 'stroke-width': 2, rx: 3 }));
      g.appendChild(svgEl('line', { x1: x, y1: yAt(f.median), x2: x + bw, y2: yAt(f.median), class: 'ch-median', stroke: col }));
      f.outliers.forEach(function (v) {
        g.appendChild(svgEl('circle', { cx: cx, cy: yAt(v), r: 5, class: 'ch-outlier', stroke: col }));
      });
      svg.appendChild(g);
      var cl = svgEl('text', { x: cx, y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = grp.name + ' · n=' + f.n;
      svg.appendChild(cl);
    });
    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* An ISOTYPE chart: a row of repeated icons, where the count of icons is
     the quantity. Not decoration — the point of the form is that the reader
     counts rather than measures against an axis, which is why Neurath built
     it for audiences who could not be assumed to read charts at all.

     It survives the projector badly if the icon is fussy, and it lies if
     the icon is scaled instead of repeated, so this repeats and never
     scales. A half unit is drawn as a clipped icon rather than a small one,
     for the same reason.

     One icon is worth chartUnit, shown in the key. Without that a row of
     forty icons is unreadable and a row of two says nothing. */
  function pictogramChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg ch-picto', role: 'img' });
    var icon = String(slide.chartIcon || '').trim() || '●';
    var vals = (data.series[0] ? data.series[0].values : []).map(function (v) { return v == null ? 0 : Math.max(0, v); });
    if (!vals.length) return svg;
    var max = Math.max.apply(null, vals);
    /* Pick a unit that keeps the longest row inside about twenty icons
       unless the author has set one: past that nobody counts, they
       estimate, and an estimate off a row of dots is worse than a bar. */
    var unit = Number(slide.chartUnit) > 1 ? Number(slide.chartUnit)
      : Math.max(1, Math.pow(10, Math.max(0, Math.ceil(Math.log10(Math.max(1, max / 20))))));
    var labelRoom = Math.min(300, 40 + data.categories.reduce(function (n, c) {
      return Math.max(n, String(c).length); }, 0) * 10);
    var rowH = Math.min(78, (H - P.padT - P.padB) / Math.max(1, data.categories.length));
    var size = Math.min(rowH * 0.74, 46);

    data.categories.forEach(function (cat, ci) {
      var y = P.padT + rowH * ci + rowH / 2;
      var lab = svgEl('text', { x: labelRoom - 16, y: y + 7, class: 'ch-cat', 'text-anchor': 'end' });
      lab.textContent = cat;
      svg.appendChild(lab);
      var g = svgEl('g', { class: 'ch-beat', 'data-step': ci, 'data-series': '0' });
      var whole = Math.floor(vals[ci] / unit);
      var part = (vals[ci] % unit) / unit;
      for (var i = 0; i < whole && i < 40; i++) {
        var t = svgEl('text', { x: labelRoom + i * (size * 0.92), y: y + size * 0.34,
          class: 'ch-icon', 'font-size': size });
        t.textContent = icon;
        g.appendChild(t);
      }
      if (part > 0.08 && whole < 40) {
        /* The remainder as a clipped icon: a smaller one would encode the
           value in area, which is the thing this form exists to avoid. */
        var cid = 'picto-clip-' + ci;
        var clip = svgEl('clipPath', { id: cid });
        clip.appendChild(svgEl('rect', { x: labelRoom + whole * (size * 0.92), y: y - size * 0.7,
          width: Math.max(1, size * part), height: size * 1.3 }));
        svg.appendChild(clip);
        var ht = svgEl('text', { x: labelRoom + whole * (size * 0.92), y: y + size * 0.34,
          class: 'ch-icon', 'font-size': size, 'clip-path': 'url(#' + cid + ')' });
        ht.textContent = icon;
        g.appendChild(ht);
      }
      var vlab = svgEl('text', { x: labelRoom + Math.min(whole + 1, 41) * (size * 0.92) + 12,
        y: y + 7, class: 'ch-value' });
      vlab.textContent = fmt(vals[ci]);
      g.appendChild(vlab);
      svg.appendChild(g);
    });

    var key = svgEl('text', { x: labelRoom, y: H - 10, class: 'ch-tick' });
    key.textContent = icon + ' = ' + fmt(unit) + (data.series[0] && data.series[0].name ? ' ' + data.series[0].name.toLowerCase() : '');
    svg.appendChild(key);
    return svg;
  }

  /* A radar, star or spider plot: one spoke per variable, one polygon per
     row. It is here because the lecture teaches it, and it is worth being
     able to draw an idiom in order to argue with it.

     Its weaknesses are the point of the slide that uses it. Area grows as
     the square of the values, so a row twice as good encloses four times
     the shape. The order of the spokes is arbitrary and changes that area —
     which a reader cannot see and an author can now demonstrate by
     reordering the columns. And it compares position on unaligned scales,
     several steps down the ranking from the same numbers as bars.

     Scales are shared across spokes by default so the polygon means
     something; per-spoke normalisation makes every row look similar and is
     the more common way this chart misleads. */
  function radarChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var cx = W / 2, cy = H / 2 + 6, R = Math.min(H / 2 - 34, 168);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var axes = data.categories.length;
    if (axes < 3) return svg;
    var all = [];
    data.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));
    var ang = function (i) { return -Math.PI / 2 + (i / axes) * Math.PI * 2; };
    var at = function (i, v) {
      var r = (Math.max(0, v) / max) * R;
      return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    };

    /* Rings first, as a web rather than circles: a polygon read against a
       circular grid looks bowed where it is straight. */
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = [];
      for (var i = 0; i < axes; i++) {
        pts.push((cx + R * f * Math.cos(ang(i))).toFixed(1) + ',' + (cy + R * f * Math.sin(ang(i))).toFixed(1));
      }
      svg.appendChild(svgEl('polygon', { points: pts.join(' '), class: 'ch-grid ch-web', fill: 'none' }));
    });
    for (var i = 0; i < axes; i++) {
      var e = at(i, max);
      svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: e[0].toFixed(1), y2: e[1].toFixed(1), class: 'ch-grid' }));
      var lr = R + 26, lx = cx + lr * Math.cos(ang(i)), ly = cy + lr * Math.sin(ang(i));
      var cosv = Math.cos(ang(i));
      var lab = svgEl('text', { x: lx.toFixed(1), y: (ly + 5).toFixed(1), class: 'ch-cat',
        'text-anchor': cosv < -0.25 ? 'end' : (cosv > 0.25 ? 'start' : 'middle') });
      lab.textContent = data.categories[i];
      svg.appendChild(lab);
    }
    var tick = svgEl('text', { x: cx + 6, y: cy - R + 4, class: 'ch-tick' });
    tick.textContent = fmt(max);
    svg.appendChild(tick);

    data.series.forEach(function (sr, si) {
      var pts = [];
      for (var i = 0; i < axes; i++) {
        var v = sr.values[i];
        var p = at(i, v == null ? 0 : v);
        pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      }
      var g = svgEl('g', { class: 'ch-line ch-radar', 'data-step': si, 'data-series': String(si) });
      g.appendChild(svgEl('polygon', { points: pts.join(' '), fill: chartColor(si),
        opacity: 0.18, stroke: chartColor(si), 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      for (var j = 0; j < axes; j++) {
        var vv = sr.values[j], pp = at(j, vv == null ? 0 : vv);
        g.appendChild(svgEl('circle', { cx: pp[0].toFixed(1), cy: pp[1].toFixed(1), r: 5,
          fill: chartColor(si), class: 'ch-dot' }));
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* A Sankey. Band width is the quantity, which is the one thing the
     lecture's own slide says about it, so width is the only channel used —
     no colour scale, no varying opacity carrying a second meaning.

     Ribbons are cubic beziers with horizontal control points, so a band
     leaves and arrives level and its width is readable at both ends. They
     are drawn before the nodes and in descending size, so a thick flow
     cannot hide a thin one behind it. */
  function sankeyChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var f = SF.chartFlows(slide);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!f.links.length) return svg;

    var padT = 18, padB = 26, left = 6, right = 6;
    var plotH = H - padT - padB;
    var nodeW = 16;
    var gap = 16;

    /* Scale: the fullest layer decides, so no column overflows and every
       band keeps the same units per pixel across the whole diagram. */
    var byLayer = [];
    for (var d = 0; d < f.layers; d++) byLayer.push(f.nodes.filter(function (n) { return n.depth === d; }));
    var heaviest = byLayer.reduce(function (m, col) {
      return Math.max(m, col.reduce(function (t, n) { return t + n.total; }, 0));
    }, 0);
    var tallest = byLayer.reduce(function (m, col) { return Math.max(m, col.length); }, 0);
    var perUnit = (plotH - (tallest - 1) * gap) / (heaviest || 1);

    var colX = function (d) {
      return left + (f.layers === 1 ? 0 : d * ((W - left - right - nodeW) / (f.layers - 1)));
    };
    byLayer.forEach(function (col, d) {
      col.sort(function (a, b) { return b.total - a.total; });
      var used = col.reduce(function (t, n) { return t + n.total * perUnit; }, 0) + (col.length - 1) * gap;
      var y = padT + (plotH - used) / 2;
      col.forEach(function (n) {
        n.x = colX(d);
        n.y = y;
        n.h = Math.max(2, n.total * perUnit);
        n.inAt = n.y;
        n.outAt = n.y;
        y += n.h + gap;
      });
    });

    var idx = f.index;
    var ribbons = f.links.slice().sort(function (a, b) { return b.value - a.value; });
    var g = svgEl('g', { class: 'ch-beat', 'data-step': 0, 'data-series': '0' });
    ribbons.forEach(function (l) {
      var a = f.nodes[idx[l.from]], b = f.nodes[idx[l.to]];
      var t = l.value * perUnit;
      var x1 = a.x + nodeW, x2 = b.x;
      var y1 = a.outAt, y2 = b.inAt;
      a.outAt += t; b.inAt += t;
      var mx = (x1 + x2) / 2;
      var d2 = 'M' + x1 + ' ' + y1 +
        ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 +
        ' L' + x2 + ' ' + (y2 + t) +
        ' C' + mx + ' ' + (y2 + t) + ' ' + mx + ' ' + (y1 + t) + ' ' + x1 + ' ' + (y1 + t) + ' Z';
      var band = svgEl('path', { d: d2, class: 'ch-flow', fill: chartColor(a.depth % 6) });
      var tip = svgEl('title', {});
      tip.textContent = l.from + ' → ' + l.to + ': ' + fmt(l.value);
      band.appendChild(tip);
      g.appendChild(band);
    });
    svg.appendChild(g);

    f.nodes.forEach(function (n) {
      svg.appendChild(svgEl('rect', { x: n.x, y: n.y, width: nodeW, height: n.h,
        class: 'ch-node', fill: chartColor(n.depth % 6) }));
      /* Labels sit outside the column they belong to, except the last,
         which has nothing to its right to collide with. */
      var last = n.depth === f.layers - 1;
      var lab = svgEl('text', {
        x: last ? n.x - 10 : n.x + nodeW + 10,
        y: n.y + n.h / 2 + 5,
        class: 'ch-cat ch-node-label',
        'text-anchor': last ? 'end' : 'start'
      });
      lab.textContent = n.name + ' · ' + fmt(n.total);
      svg.appendChild(lab);
    });
    return svg;
  }

  /* A dumbbell: one row per category, two marks joined by a bar. Ported
     from the tube-noise chart in the pollution explorer on this machine.

     It answers a question a paired bar answers badly — how far apart are
     these two states — because the gap is drawn as a gap rather than left
     for the eye to compute between two column heights. The bar is the
     subject; the dots only say which end is which.

     Exactly two series. A third would make the connecting bar a lie about
     which pair it joins, so the inspector says so rather than drawing it. */
  function dumbbellChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (data.series.length < 2) return svg;
    var a = data.series[0], b = data.series[1];
    var vals = [];
    [a, b].forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) vals.push(v); }); });
    if (!vals.length) return svg;
    var rng = niceRange(Math.min.apply(null, vals), Math.max.apply(null, vals));

    var longest = data.categories.reduce(function (n, c) { return Math.max(n, String(c).length); }, 0);
    var padL = Math.min(330, 40 + longest * 9.5);
    var plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
    var sx = function (v) { return padL + ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotW; };
    var rowH = plotH / Math.max(1, data.categories.length);

    axisTicks(rng.hi - rng.lo).forEach(function (t) {
      var x = sx(rng.lo + t);
      svg.appendChild(svgEl('line', { x1: x, y1: P.padT - 6, x2: x, y2: P.padT + plotH - rowH / 2 + 6, class: 'ch-grid' }));
      var lab = svgEl('text', { x: x, y: P.padT + plotH + 18, class: 'ch-tick', 'text-anchor': 'middle' });
      lab.textContent = fmt(rng.lo + t);
      svg.appendChild(lab);
    });

    data.categories.forEach(function (cat, i) {
      var va = a.values[i], vb = b.values[i];
      if (va == null || vb == null) return;
      var y = P.padT + rowH * i + rowH / 2 - rowH / 2 + 10;
      var g = svgEl('g', { class: 'ch-beat ch-dumbbell', 'data-step': i, 'data-series': '0' });
      var lo = Math.min(sx(va), sx(vb)), hi = Math.max(sx(va), sx(vb));
      /* Drawn before the dots so the ends sit on top of it. */
      g.appendChild(svgEl('line', { x1: lo, y1: y, x2: hi, y2: y, class: 'ch-bell-bar' }));
      [[va, 0], [vb, 1]].forEach(function (pair) {
        var dot = svgEl('circle', { cx: sx(pair[0]), cy: y, r: 8, fill: chartColor(pair[1]), class: 'ch-bell-dot' });
        var tip = svgEl('title', {});
        tip.textContent = cat + ' · ' + (pair[1] ? b.name : a.name) + ': ' + fmt(pair[0]);
        dot.appendChild(tip);
        g.appendChild(dot);
      });
      /* The gap named, not just shown: the number is what gets quoted. */
      var diff = Math.abs(va - vb);
      if (hi - lo > 54) {
        var dl = svgEl('text', { x: (lo + hi) / 2, y: y - 12, class: 'ch-tick', 'text-anchor': 'middle' });
        dl.textContent = fmt(diff);
        g.appendChild(dl);
      }
      var cl = svgEl('text', { x: padL - 14, y: y + 6, class: 'ch-cat', 'text-anchor': 'end' });
      cl.textContent = cat;
      g.appendChild(cl);
      svg.appendChild(g);
    });
    return svg;
  }

  /* A categorical evidence matrix: items down, conditions across, and a
     graded label in every cell. Ported from the line-ratings chart in the
     pollution explorer.

     Colour carries an order, not a quantity. Low / Medium / High and
     Weak / Moderate / Strong are both ordinal — the distance between the
     steps is not a number — so the scale is three steps of one hue rather
     than a continuous ramp, which would invite reading a gap that the data
     does not contain. Any vocabulary works; recognised words are ordered,
     and anything else falls back to the order the author wrote them in. */
  var ORDINAL_WORDS = ['none', 'very low', 'weak', 'low', 'l', 'medium', 'med', 'moderate', 'm',
                       'high', 'h', 'strong', 'very high', 'severe'];
  function matrixChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var rows = SF.parseTable(slide.body);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (rows.length < 2) return svg;
    var head = rows[0], body = rows.slice(1);
    var cols = head.slice(1).filter(function (h) { return String(h).trim(); });
    if (!cols.length) return svg;

    /* Rank every value once so the whole matrix shares one scale — colouring
       each column on its own would make a cell's shade mean something
       different depending on where it sits. */
    var seen = [];
    body.forEach(function (r) {
      cols.forEach(function (_, j) {
        var v = String(r[j + 1] || '').trim();
        if (v && seen.indexOf(v) < 0) seen.push(v);
      });
    });
    var ordered = seen.slice().sort(function (x, y) {
      var ix = ORDINAL_WORDS.indexOf(x.toLowerCase()), iy = ORDINAL_WORDS.indexOf(y.toLowerCase());
      if (ix >= 0 && iy >= 0) return ix - iy;
      if (ix >= 0) return -1;
      if (iy >= 0) return 1;
      return seen.indexOf(x) - seen.indexOf(y);
    });
    var rank = {};
    ordered.forEach(function (v, i) { rank[v] = ordered.length > 1 ? i / (ordered.length - 1) : 1; });

    var longest = body.reduce(function (n, r) { return Math.max(n, String(r[0] || '').length); }, 0);
    var padL = Math.min(300, 30 + longest * 9.5);
    var plotW = W - padL - P.padR, plotH = H - P.padT - 42;
    var cw = plotW / cols.length, rh = Math.min(34, plotH / Math.max(1, body.length + 1));

    cols.forEach(function (c, j) {
      var lab = svgEl('text', { x: padL + cw * j + cw / 2, y: P.padT + 16, class: 'ch-cat', 'text-anchor': 'middle' });
      lab.textContent = c;
      svg.appendChild(lab);
    });

    body.forEach(function (r, i) {
      var y = P.padT + 30 + rh * i;
      var g = svgEl('g', { class: 'ch-beat', 'data-step': i, 'data-series': '0' });
      var rl = svgEl('text', { x: padL - 12, y: y + rh * 0.62, class: 'ch-cat', 'text-anchor': 'end' });
      rl.textContent = String(r[0] || '');
      g.appendChild(rl);
      cols.forEach(function (_, j) {
        var v = String(r[j + 1] || '').trim();
        if (!v) return;
        var t = rank[v] == null ? 0 : rank[v];
        var cell = svgEl('rect', { x: padL + cw * j + 4, y: y, width: Math.max(8, cw - 8),
          height: rh - 6, rx: 5, class: 'ch-cell', fill: chartColor(0),
          'fill-opacity': (0.16 + t * 0.78).toFixed(2) });
        g.appendChild(cell);
        /* The label goes in the cell, so the chart is readable without the
           key and by anyone the hues fail. */
        var tx = svgEl('text', { x: padL + cw * j + cw / 2, y: y + rh * 0.62,
          class: 'ch-cell-label' + (t > 0.55 ? ' on-dark' : ''), 'text-anchor': 'middle' });
        tx.textContent = v;
        g.appendChild(tx);
      });
      svg.appendChild(g);
    });
    return svg;
  }

  /* Small multiples: a panel per item, every panel on the same scale.

     Ported from the platform-peaks chart in the pollution explorer. The
     discipline that makes the idiom work is the shared scale — it is what
     lets a reader compare panels by eye instead of re-reading four axes —
     so the scale is computed across every value and then stated on the
     slide, not left for the reader to check.

     The table is read transposed: each row becomes a panel and the columns
     become the axis inside it. "Station | 2023 | 2024 | 2025" is one panel
     per station with years across the bottom, which is how the data arrives
     and saves an author pivoting it first.

     Colour carries direction, not identity. Every panel is the same series,
     so colouring them apart would say they are different things; what
     differs is whether each one rose or fell, and that is worth a hue. */
  function multiplesChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var panels = data.categories.map(function (name, i) {
      return { name: name, values: data.series.map(function (sr) { return sr.values[i]; }) };
    }).filter(function (p) { return p.values.some(function (v) { return v != null; }); });
    if (!panels.length || data.series.length < 2) return svg;

    var all = [];
    panels.forEach(function (p) { p.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var rng = niceRange(Math.min.apply(null, all), Math.max.apply(null, all));

    /* Wide before tall: a row of panels is read left to right like a
       sentence, and a tall grid of narrow ones is read as a table. */
    var cols = Math.min(panels.length, panels.length <= 4 ? panels.length : Math.ceil(Math.sqrt(panels.length * 1.9)));
    var rows = Math.ceil(panels.length / cols);
    var padTop = 26, padBottom = 34;
    var cellW = (W - 36) / cols, cellH = (H - padTop - padBottom) / rows;
    var plotW = cellW - 30, plotH = Math.max(22, cellH - 48);

    panels.forEach(function (p, i) {
      var cx = 18 + (i % cols) * cellW, cy = padTop + Math.floor(i / cols) * cellH;
      var g = svgEl('g', { class: 'ch-beat ch-multiple', 'data-step': i, 'data-series': '0' });
      var n = p.values.length;
      var sx = function (j) { return cx + 14 + (n < 2 ? plotW / 2 : (plotW * j) / (n - 1)); };
      var sy = function (v) { return cy + 26 + plotH - ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotH; };

      var lab = svgEl('text', { x: cx + 14, y: cy + 12, class: 'ch-cat ch-multiple-title' });
      lab.textContent = p.name;
      g.appendChild(lab);

      /* Floor and ceiling only. Four gridlines in a panel this size is a
         texture, not a scale. */
      [rng.lo, rng.hi].forEach(function (v) {
        g.appendChild(svgEl('line', { x1: sx(0), x2: sx(n - 1), y1: sy(v), y2: sy(v), class: 'ch-grid' }));
      });

      /** @type {number|null} */ var first = null;
      /** @type {number|null} */ var last = null;
      p.values.forEach(function (v) { if (v != null) { if (first === null) first = v; last = v; } });
      /* Both null together or neither, but the checker cannot see that from
         the loop, and a panel of blanks should read flat rather than throw.

         Flat is a band, not an exact tie. A station going 1,010 to 1,008 is
         not falling — it is holding — and colouring two units of drift on a
         thousand-unit scale as a decline is the chart making a claim the
         data does not support. Two per cent of the shared range, so the
         threshold means the same thing in every panel. */
      var slack = (rng.hi - rng.lo) * 0.02;
      var dir = (first === null || last === null || Math.abs(last - first) <= slack) ? 'flat'
              : (last > first ? 'up' : 'down');

      var pts = [];
      p.values.forEach(function (v, j) { if (v != null) pts.push([sx(j), sy(v)]); });
      if (pts.length > 1) {
        g.appendChild(svgEl('polyline', {
          points: pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '),
          fill: 'none', class: 'ch-mult-line dir-' + dir, 'stroke-width': 2.5, 'stroke-linejoin': 'round'
        }));
      }
      p.values.forEach(function (v, j) {
        if (v == null) return;
        g.appendChild(svgEl('circle', { cx: sx(j), cy: sy(v), r: 3.5, class: 'ch-mult-dot dir-' + dir }));
        /* Only the ends carry a number. Labelling every point in a panel
           two inches wide turns the shape back into a table. */
        if (j === 0 || j === n - 1) {
          var vl = svgEl('text', { x: sx(j), y: sy(v) - 8, class: 'ch-mult-value',
            'text-anchor': j === 0 ? 'start' : 'end' });
          vl.textContent = fmt(v);
          g.appendChild(vl);
        }
      });
      /* The axis is named once per panel, at the ends, rather than under
         every point. */
      [0, n - 1].forEach(function (j) {
        var t = svgEl('text', { x: sx(j), y: cy + 26 + plotH + 15, class: 'ch-mult-axis',
          'text-anchor': j === 0 ? 'start' : 'end' });
        t.textContent = (data.series[j] && data.series[j].name) || '';
        g.appendChild(t);
      });
      svg.appendChild(g);
    });

    /* The shared scale, said out loud. Without it a reader has no way to
       know the panels are comparable, which is the entire claim the layout
       is making. */
    var note = svgEl('text', { x: 18, y: H - 10, class: 'ch-tick' });
    note.textContent = 'Every panel on the same ' + fmt(rng.lo) + '–' + fmt(rng.hi) + ' scale' +
      ' · rose, fell or held is shown by colour';
    svg.appendChild(note);
    return svg;
  }

  function lineChart(data, slide, area) {
    var W = CHART.w, H = CHART.h, P = CHART;
    /* Reserve the right margin for the end-labels before drawing anything.
       Sized from the longest series name, because a label that runs past the
       viewBox is clipped mid-word — which is what happened to "Cambridge"
       the first time this was rendered. */
    var longest = data.series.reduce(function (n, x) { return Math.max(n, x.name.length); }, 0);
    var labelRoom = Math.min(230, 18 + longest * 10.5);
    var padR = P.padR + labelRoom;
    var plotW = W - P.padL - padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var all = [];
    data.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var cols = Math.max(1, data.categories.length - 1);
    var xAt = function (i) { return P.padL + (cols ? (plotW * i / cols) : plotW / 2); };
    var yAt = function (v) { return P.padT + plotH - (v / max) * plotH; };

    data.categories.forEach(function (cat, i) {
      var cl = svgEl('text', { x: xAt(i), y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    var ends = [];
    data.series.forEach(function (s, si) {
      var g = svgEl('g', { class: 'ch-line', 'data-step': si, 'data-series': String(si) });
      var pts = [];
      s.values.forEach(function (v, i) { if (v != null) pts.push([xAt(i), yAt(v)]); });
      if (!pts.length) return;
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      /* An area is the same line with the ground under it shaded, drawn
         first so the stroke and its markers stay on top. Translucent
         because overlapping areas are the idiom's known weakness and
         hiding one behind another would be the chart lying. */
      if (area) {
        var base = P.padT + plotH;
        var fillD = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + base +
                    ' L' + pts[0][0].toFixed(1) + ' ' + base + ' Z';
        g.appendChild(svgEl('path', { d: fillD, fill: chartColor(si), opacity: 0.22, stroke: 'none' }));
      }
      g.appendChild(svgEl('path', { d: d, fill: 'none', stroke: chartColor(si), 'stroke-width': 3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      pts.forEach(function (p) {
        /* A 2px ring in the surface colour, so a marker stays legible where
           two series cross. */
        g.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 6, fill: chartColor(si), class: 'ch-dot' }));
      });
      ends.push({ y: pts[pts.length - 1][1], x: pts[pts.length - 1][0], name: s.name, g: g });
      svg.appendChild(g);
    });

    /* Direct end-labels only while the lines actually separate at the right
       edge. Converging series get nudged labels that detach from their lines
       and read as noise, so below a comfortable gap the legend carries
       identity on its own — which it is already doing. */
    var sorted = ends.slice().sort(function (a, b) { return a.y - b.y; });
    var crowded = sorted.some(function (e, i) { return i && (e.y - sorted[i - 1].y) < 26; });
    if (!crowded) {
      ends.forEach(function (e) {
        var lab = svgEl('text', { x: e.x + 14, y: e.y + 6, class: 'ch-end' });
        lab.textContent = e.name;
        e.g.appendChild(lab);
      });
    }

    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Part-to-whole. A pie is a weaker read than a stacked bar — angle is
     harder to compare than length — but this app teaches the history of the
     form, and you cannot critique Playfair's 1801 pie without showing one. */
  function pieChart(data, slide, donut) {
    var W = CHART.w, H = CHART.h;
    var cx = W / 2, cy = H / 2 + 4, R = Math.min(H / 2 - 14, 200);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    /* One series: the slices are the categories. Several: the first is used
       and the rest ignored, which the inspector warns about. */
    var vals = (data.series[0] ? data.series[0].values : []).map(function (v) { return v == null ? 0 : Math.max(0, v); });
    var total = vals.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return svg;

    var angle = -Math.PI / 2;
    vals.forEach(function (v, i) {
      var sweep = (v / total) * Math.PI * 2;
      var a0 = angle, a1 = angle + sweep;
      angle = a1;
      if (!v) return;
      var large = sweep > Math.PI ? 1 : 0;
      var d = 'M' + cx + ' ' + cy +
              ' L' + (cx + R * Math.cos(a0)).toFixed(1) + ' ' + (cy + R * Math.sin(a0)).toFixed(1) +
              ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' +
              (cx + R * Math.cos(a1)).toFixed(1) + ' ' + (cy + R * Math.sin(a1)).toFixed(1) + ' Z';
      var g = svgEl('g', { class: 'ch-slice', 'data-step': i });
      g.appendChild(svgEl('path', { d: d, fill: chartColor(i), class: 'ch-wedge' }));
      var mid = (a0 + a1) / 2, lr = R + 34;
      var lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
      var pct = Math.round((v / total) * 100);
      /* Label outside the wedge, never inside it: a slice narrow enough to
         crop its own label is exactly the slice you most need named. */
      var lab = svgEl('text', { x: lx, y: ly, class: 'ch-slice-label',
        'text-anchor': Math.cos(mid) < -0.2 ? 'end' : (Math.cos(mid) > 0.2 ? 'start' : 'middle') });
      lab.textContent = (data.categories[i] || '') + ' · ' + pct + '%';
      g.appendChild(lab);
      svg.appendChild(g);
    });
    /* A donut is a pie with the middle taken out, and the reason to prefer
       one is that the hole holds the total — the number a pie makes you add
       up yourself. Drawn in the surface colour over the wedges rather than
       as an arc per slice, which keeps the wedge geometry above identical
       between the two. */
    if (donut) {
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: R * 0.58, class: 'ch-donut-hole' }));
      var tot = svgEl('text', { x: cx, y: cy + 2, class: 'ch-donut-total', 'text-anchor': 'middle' });
      tot.textContent = fmt(total);
      svg.appendChild(tot);
      var cap = svgEl('text', { x: cx, y: cy + 30, class: 'ch-donut-cap', 'text-anchor': 'middle' });
      cap.textContent = 'total';
      svg.appendChild(cap);
    }
    return svg;
  }

  /* Binary-partition treemap. Good enough for a use-of-funds slide: biggest
     spend physically dominates. Not a full squarify — those need a library;
     this stays readable on a 1280 wall without one. */
  function layoutTreemap(nodes, x, y, w, h) {
    if (!nodes.length) return [];
    if (nodes.length === 1) {
      return [{ name: nodes[0].name, value: nodes[0].value, i: nodes[0].i, x: x, y: y, w: w, h: h }];
    }
    var total = 0;
    nodes.forEach(function (n) { total += n.value; });
    var acc = 0, mid = 0;
    for (var i = 0; i < nodes.length; i++) {
      acc += nodes[i].value;
      mid = i;
      if (acc >= total / 2) break;
    }
    var left = nodes.slice(0, mid + 1);
    var right = nodes.slice(mid + 1);
    if (!right.length) {
      return [{ name: nodes[0].name, value: nodes[0].value, i: nodes[0].i, x: x, y: y, w: w, h: h }];
    }
    var leftSum = 0;
    left.forEach(function (n) { leftSum += n.value; });
    var ratio = leftSum / total;
    if (w >= h) {
      return layoutTreemap(left, x, y, w * ratio, h)
        .concat(layoutTreemap(right, x + w * ratio, y, w * (1 - ratio), h));
    }
    return layoutTreemap(left, x, y, w, h * ratio)
      .concat(layoutTreemap(right, x, y + h * ratio, w, h * (1 - ratio)));
  }

  /* Part-of-whole by area. Same paste as a pie — one series, categories as
     the parts — but the largest block owns the eye, which is what a use-of-
     funds slide needs and a pie refuses to do. */
  function treemapChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var series = data.series[0];
    if (!series) return svg;
    var nodes = [];
    data.categories.forEach(function (cat, i) {
      var v = series.values[i];
      if (v == null || v <= 0) return;
      nodes.push({ name: cat, value: v, i: i });
    });
    nodes.sort(function (a, b) { return b.value - a.value; });
    var total = 0;
    nodes.forEach(function (n) { total += n.value; });
    if (!total) return svg;
    var gap = 3;
    var rects = layoutTreemap(nodes, gap, gap, W - gap * 2, H - gap * 2);
    rects.forEach(function (r) {
      var g = svgEl('g', { class: 'ch-cell ch-beat', 'data-step': r.i, 'data-series': '0' });
      var pad = 1.5;
      g.appendChild(svgEl('rect', {
        x: r.x + pad, y: r.y + pad,
        width: Math.max(0, r.w - pad * 2), height: Math.max(0, r.h - pad * 2),
        fill: chartColor(r.i % 6), class: 'ch-tree-rect', rx: 4
      }));
      if (r.w > 70 && r.h > 42) {
        var name = svgEl('text', {
          x: r.x + 14, y: r.y + 28, class: 'ch-tree-label', 'text-anchor': 'start'
        });
        name.textContent = r.name;
        g.appendChild(name);
        var pct = Math.round((r.value / total) * 100);
        var val = svgEl('text', {
          x: r.x + 14, y: r.y + 52, class: 'ch-tree-value', 'text-anchor': 'start'
        });
        val.textContent = fmt(r.value) + ' · ' + pct + '%';
        g.appendChild(val);
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* Actual against a target, one row per category. First series is the bar;
     second (if present) is the target tick. The qualitative ranges a full
     bullet chart sometimes carries are left out — they need a third kind of
     column the paste shape does not name. */
  function bulletChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = { padL: 160, padR: 40, padT: 18, padB: 28 };
    var plotW = W - P.padL - P.padR;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var actual = data.series[0];
    var target = data.series[1] || null;
    if (!actual) return svg;
    var all = [];
    data.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v != null) all.push(Math.abs(v)); });
    });
    var max = niceMax(Math.max.apply(null, all.concat([0])));
    var rowH = Math.min(72, (H - P.padT - P.padB) / Math.max(1, data.categories.length));
    var trackH = Math.min(22, rowH * 0.38);
    var barH = Math.min(12, trackH * 0.55);

    data.categories.forEach(function (cat, ci) {
      var y = P.padT + rowH * ci + rowH / 2;
      var lab = svgEl('text', { x: P.padL - 16, y: y + 6, class: 'ch-cat', 'text-anchor': 'end' });
      lab.textContent = cat;
      svg.appendChild(lab);
      var g = svgEl('g', { class: 'ch-beat', 'data-step': ci });
      g.appendChild(svgEl('rect', {
        x: P.padL, y: y - trackH / 2, width: plotW, height: trackH,
        class: 'ch-bullet-track', rx: 2
      }));
      var av = actual.values[ci];
      if (av != null) {
        var bw = Math.max(0, (Math.abs(av) / max) * plotW);
        var bar = svgEl('g', { class: 'ch-bar', 'data-series': '0' });
        bar.appendChild(svgEl('rect', {
          x: P.padL, y: y - barH / 2, width: bw, height: barH,
          fill: chartColor(0), rx: 2
        }));
        g.appendChild(bar);
        var vlab = svgEl('text', {
          x: P.padL + bw + 10, y: y + 5, class: 'ch-value', 'text-anchor': 'start'
        });
        vlab.textContent = fmt(av);
        g.appendChild(vlab);
      }
      if (target) {
        var tv = target.values[ci];
        if (tv != null) {
          var tx = P.padL + (Math.abs(tv) / max) * plotW;
          var mark = svgEl('g', { class: 'ch-bullet-target', 'data-series': '1' });
          mark.appendChild(svgEl('line', {
            x1: tx, y1: y - trackH * 0.7, x2: tx, y2: y + trackH * 0.7,
            class: 'ch-bullet-tick'
          }));
          g.appendChild(mark);
        }
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* Columns for the first series, markers for the rest — the ARR-growth
     idiom where absolute size and a rate share one picture. Same axis for
     both: if the marker series is a percentage and the columns are pounds,
     the paste is the wrong shape and the chart will say so by looking odd. */
  function comboChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!data.series.length) return svg;

    var all = [];
    data.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v != null) all.push(v); });
    });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotW / Math.max(1, data.categories.length);
    var barW = Math.min(band * 0.48, 64);
    var cols = data.series[0];
    var colG = svgEl('g', { class: 'ch-beat', 'data-step': 0, 'data-series': '0' });
    data.categories.forEach(function (cat, ci) {
      var v = cols.values[ci];
      if (v == null) return;
      var hgt = Math.max(0, (v / max) * plotH);
      var x = P.padL + band * ci + (band - barW) / 2;
      var y = P.padT + plotH - hgt;
      var g = svgEl('g', { class: 'ch-bar' });
      var r = Math.min(4, barW / 2);
      var d = 'M' + x + ' ' + (y + hgt) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
              ' H' + (x + barW - r) + ' Q' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + r) +
              ' V' + (y + hgt) + ' Z';
      g.appendChild(svgEl('path', { d: d, fill: chartColor(0) }));
      colG.appendChild(g);
      var cl = svgEl('text', {
        x: P.padL + band * ci + band / 2, y: H - P.padB + 30,
        class: 'ch-cat', 'text-anchor': 'middle'
      });
      cl.textContent = cat;
      svg.appendChild(cl);
    });
    svg.appendChild(colG);

    data.series.slice(1).forEach(function (s, mi) {
      var si = mi + 1;
      var g = svgEl('g', { class: 'ch-markers ch-beat', 'data-step': si, 'data-series': String(si) });
      var pts = [];
      data.categories.forEach(function (cat, ci) {
        var v = s.values[ci];
        if (v == null) return;
        var cx = P.padL + band * ci + band / 2;
        var cy = P.padT + plotH - (v / max) * plotH;
        pts.push([cx, cy]);
        g.appendChild(svgEl('circle', {
          cx: cx, cy: cy, r: 7, fill: chartColor(si), class: 'ch-marker',
          stroke: 'var(--s-bg, #fff)', 'stroke-width': 2
        }));
      });
      if (pts.length > 1) {
        var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        g.insertBefore(svgEl('path', {
          d: path, fill: 'none', stroke: chartColor(si),
          'stroke-width': 2.5, class: 'ch-marker-line', 'stroke-dasharray': '4 5'
        }), g.firstChild);
      }
      svg.appendChild(g);
    });

    svg.appendChild(svgEl('line', {
      x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis'
    }));
    return svg;
  }

  /* A 10×10 grid = 100 cells. Categories from one series share the grid by
     proportion — the waffle's whole point is that five percent is five
     squares you can count, not a five-degree pie slice. */
  function waffleChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var series = data.series[0];
    if (!series) return svg;
    var parts = [];
    var total = 0;
    data.categories.forEach(function (cat, i) {
      var v = series.values[i];
      if (v == null || v <= 0) return;
      parts.push({ name: cat, value: v, i: i });
      total += v;
    });
    if (!total) return svg;

    /* Single category whose value is already a percentage (≤ 100): fill that
       many cells and leave the rest as empty track. Multiple categories:
       share all 100 by proportion. */
    var cells = [];
    if (parts.length === 1 && parts[0].value <= 100) {
      var n = Math.max(0, Math.min(100, Math.round(parts[0].value)));
      for (var a = 0; a < n; a++) cells.push(parts[0].i);
      for (var b = n; b < 100; b++) cells.push(-1);
    } else {
      var assigned = 0;
      parts.forEach(function (p, pi) {
        var count = pi === parts.length - 1
          ? (100 - assigned)
          : Math.round((p.value / total) * 100);
        count = Math.max(0, Math.min(100 - assigned, count));
        for (var c = 0; c < count; c++) cells.push(p.i);
        assigned += count;
      });
      while (cells.length < 100) cells.push(-1);
      cells = cells.slice(0, 100);
    }

    /* The key sits to the left of the grid, so the grid can only start where
       the longest key entry ends. Measuring the NAME alone was not enough:
       every entry also prints its share, so "Apprenticeship" reserved room
       for fourteen characters and then drew twenty, and the tail of the word
       ran under the first column of squares. Reserve for the whole string,
       from where it actually starts (x=52, past the swatch). */
    parts.forEach(function (p) {
      var pct = parts.length === 1 && p.value <= 100
        ? Math.round(p.value)
        : Math.round((p.value / total) * 100);
      p.label = p.name + ' · ' + pct + '%';
    });
    var labelW = Math.max(160, Math.min(380, 52 + parts.reduce(function (m, p) {
      return Math.max(m, p.label.length);
    }, 0) * 9 + 24));
    var gridSize = Math.min(H - 40, W - labelW - 80);
    var cell = gridSize / 10;
    var gap = Math.max(2, cell * 0.08);
    var ox = labelW;
    var oy = (H - gridSize) / 2;

    for (var i = 0; i < 100; i++) {
      var col = i % 10;
      var row = Math.floor(i / 10);
      var idx = cells[i];
      var g = svgEl('g', {
        class: 'ch-waffle-cell' + (idx < 0 ? ' ch-waffle-empty' : ' ch-cell'),
        'data-step': idx < 0 ? 0 : idx,
        'data-series': '0'
      });
      g.appendChild(svgEl('rect', {
        x: ox + col * cell + gap / 2,
        y: oy + row * cell + gap / 2,
        width: cell - gap,
        height: cell - gap,
        rx: 2,
        fill: idx < 0 ? 'var(--s-muted, #ccc)' : chartColor(idx % 6),
        opacity: idx < 0 ? 0.22 : 1,
        class: 'ch-waffle-sq'
      }));
      svg.appendChild(g);
    }

    parts.forEach(function (p, pi) {
      var y = oy + 22 + pi * 36;
      var item = svgEl('g', { class: 'ch-beat', 'data-step': p.i, 'data-series': '0' });
      item.appendChild(svgEl('rect', {
        x: 24, y: y - 12, width: 18, height: 18, rx: 3, fill: chartColor(p.i % 6)
      }));
      var t = svgEl('text', { x: 52, y: y + 2, class: 'ch-cat', 'text-anchor': 'start' });
      t.textContent = p.label;
      item.appendChild(t);
      svg.appendChild(item);
    });
    return svg;
  }

  function layoutChart(slide, pad) {
    if (slide.exploration && slide.exploration.prediction) slide = Object.assign({}, slide, { progressive: false });
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var data = SF.chartData(slide);
    /* The three position-based idioms read the same pasted table
       differently, so "is there anything to draw" cannot be one question
       about categories and series. */
    var k0 = slide.chartKind;
    var empty = k0 === 'scatter' ? !SF.chartPoints(slide).series.some(function (x) { return x.points.length; })
              : k0 === 'histogram' ? SF.chartValues(slide).length < 2
              : k0 === 'box' ? !SF.chartGroups(slide).length
              : k0 === 'sankey' ? !SF.chartFlows(slide).links.length
              : k0 === 'matrix' ? SF.parseTable(slide.body).length < 2
              : k0 === 'dumbbell' ? data.series.length < 2
              : k0 === 'multiples' ? (data.series.length < 2 || !data.categories.length)
              : k0 === 'radar' ? (data.categories.length < 3 || !data.series.length)
              : (!data.series.length || !data.categories.length);
    if (empty) {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '▥'));
      /* The empty state has to teach the shape this idiom wants, or the
         author pastes a table that is right for a bar chart and is told
         only that nothing happened. */
      e.appendChild(el('div', null,
        k0 === 'scatter' ? 'Two numeric columns: the first is x, the second is y. One row per point.'
        : k0 === 'histogram' ? 'One column of numbers. They are counted into bins for you.'
        : k0 === 'box' ? 'One row per group: its name, then every value measured in it.'
        : k0 === 'sankey' ? 'Three columns: from, to, amount. One row per flow.'
        : k0 === 'dumbbell' ? 'One row per category, then exactly two numbers \u2014 the two states being compared.'
        : k0 === 'multiples' ? 'One row per panel. The columns become the axis inside every panel.'
        : k0 === 'matrix' ? 'First row names the conditions. Then one row per item, with a rating in each cell.'
        : k0 === 'radar' ? 'At least three categories — they become the spokes. Each series is a shape.'
        : k0 === 'bullet' ? 'First column Actual, second Target (optional). One row per category.'
        : k0 === 'combo' ? 'First series draws as columns; later series draw as markers on top.'
        : k0 === 'treemap' || k0 === 'waffle' ? 'One series of parts that make a whole — same paste as a pie.'
        : 'Paste a range from a spreadsheet — first row names the series, first column the categories'));
      pad.appendChild(e);
      return;
    }
    var KINDS = ['bar', 'stack', 'hbar', 'line', 'area', 'pie', 'donut',
                 'scatter', 'histogram', 'box', 'pictogram', 'radar', 'sankey',
                 'treemap', 'bullet', 'combo', 'waffle', 'dumbbell', 'matrix', 'multiples'];
    var kind = KINDS.indexOf(slide.chartKind) >= 0 ? slide.chartKind : 'bar';
    var wrap = el('div', 'chart-wrap chart-' + kind);
    var design = slide.design || {};
    /* Motion is a projector behaviour, like the image slow-zoom: the editor
       preview stays still so an author is not watching things fly in every
       time they change a number. */
    if (design.chartMotion === 'grow') wrap.classList.add('ch-motion');
    /* Focus dims rather than removes. The comparison the chart was drawn for
       is still on the slide, a shade back, so the room can be brought to one
       series and then returned to all of them without the picture changing
       shape underneath them. */
    if (design.chartFocus != null && Number.isInteger(Number(design.chartFocus))) {
      wrap.classList.add('ch-focused');
      wrap.style.setProperty('--ch-focus', String(Number(design.chartFocus)));
      wrap.dataset.focus = String(Number(design.chartFocus));
    }
    var stepOf = function (si, ci) { return data.series.length > 1 ? si : ci; };
    var svg = kind === 'multiples' ? multiplesChart(data, slide)
            : kind === 'dumbbell' ? dumbbellChart(data, slide)
            : kind === 'matrix' ? matrixChart(slide)
            : kind === 'sankey' ? sankeyChart(slide)
            : kind === 'radar' ? radarChart(data, slide)
            : kind === 'scatter' ? scatterChart(slide)
            : kind === 'histogram' ? histogramChart(slide)
            : kind === 'box' ? boxChart(slide)
            : kind === 'pictogram' ? pictogramChart(data, slide)
            : kind === 'treemap' ? treemapChart(data, slide)
            : kind === 'bullet' ? bulletChart(data, slide)
            : kind === 'combo' ? comboChart(data, slide)
            : kind === 'waffle' ? waffleChart(data, slide)
            : kind === 'line' ? lineChart(data, slide, false)
            : kind === 'area' ? lineChart(data, slide, true)
            : kind === 'pie' ? pieChart(data, slide, false)
            : kind === 'donut' ? pieChart(data, slide, true)
            : kind === 'stack' ? stackedBar(data, slide, slide.progressive ? stepOf : null)
            : kind === 'hbar' ? horizontalBar(data, slide)
            : barChart(data, slide, slide.progressive ? stepOf : null);

    /* The build marks whole series (or whole categories) rather than each
       mark, so a press lands one comparable thing at a time. */
    /* Only a built chart gets steps; without the class the reveal driver
       leaves every mark on screen, which is what an unbuilt chart wants. */
    var beatSel = '.ch-beat, .ch-line, .ch-slice, .ch-cell';
    Array.prototype.forEach.call(svg.querySelectorAll(beatSel), function (n) {
      n.classList.toggle('step', !!slide.progressive);
    });
    var title = svgEl('title', {});
    title.textContent = (slide.title || 'Chart') + ' — ' + kind + ' chart of ' +
      data.series.map(function (s) { return s.name; }).join(', ');
    svg.insertBefore(title, svg.firstChild);
    wrap.appendChild(svg);
    pad.appendChild(wrap);
    /* A line draws itself by walking its own dash offset, which needs the
       real length of the path — a guessed dasharray leaves a short series
       finished before it starts and a long one still going after the
       animation ends. Measured once the path is in the document, and only
       when the motion is actually on. */
    if (wrap.classList.contains('ch-motion')) {
      Array.prototype.forEach.call(svg.querySelectorAll('.ch-line path'), function (path) {
        var len = 0;
        try { len = path.getTotalLength(); } catch (e) { len = 0; }
        if (len > 0) path.style.setProperty('--ch-len', Math.ceil(len) + '');
      });
    }

    /* Dim everything that is not the series being isolated. Decided here
       because the focused index is a number on the slide and a stylesheet
       cannot compare an attribute against it. The legend follows the marks,
       or it would go on claiming equal billing for a series that has been
       pushed back. */
    if (wrap.classList.contains('ch-focused')) {
      var want = String(Number(design.chartFocus));
      Array.prototype.forEach.call(svg.querySelectorAll('[data-series]'), function (n) {
        n.classList.toggle('ch-dim', n.getAttribute('data-series') !== want);
      });
    }

    var key = chartKey(data, slide);
    if (key.childNodes.length) pad.appendChild(key);
    /* Where a callout's note lands. Rendered empty and filled by SF.Callouts
       on the press, so the chart does not reflow when the walk starts — a
       caption that appears from nowhere moves the chart it is describing. */
    if (SF.Callouts && SF.Callouts.has(slide)) pad.appendChild(el('div', 'ch-callout'));
    /* Under the chart, not in the notes: a caveat a lecturer can see and the
       room cannot is not a caveat. This is a course about the danger of
       summary statistics — a chart here should be able to say what it is not
       showing, in the same frame as what it is. */
    if (slide.chartSource) {
      pad.appendChild(el('div', 'chart-source', slide.chartSource));
    }
    if (wrap.classList.contains('ch-focused')) {
      var wantK = Number(design.chartFocus);
      Array.prototype.forEach.call(key.querySelectorAll('.ck-item'), function (n, i) {
        n.classList.toggle('ch-dim', i !== wantK);
      });
    }
    /* Present for screen readers and for anyone the colours fail; off-screen
       rather than absent, so the numbers are never gated behind the hues. */
    var tbl = chartTable(data, slide);
    tbl.classList.add('sr-only');
    pad.appendChild(tbl);
  }

  /* A table, from tab- or pipe-separated text. */
  function layoutTable(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var rows = SF.parseTable(slide.body);
    if (!rows.length) {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '\u229e'));
      e.appendChild(el('div', null, 'Paste rows from a spreadsheet, or type them separated by |'));
      pad.appendChild(e);
      return;
    }

    /* Type size steps down with the row count instead of being fitted by
       measurement. The canvas is a fixed 1280x720 and the row cap is 12, so
       the worst case is known in advance — there is nothing here to measure
       that the numbers do not already say. */
    var head = slide.tableHeader && rows.length > 1 ? rows[0] : null;
    var body = head ? rows.slice(1) : rows;
    var t = el('table', 'tbl rows-' + Math.min(12, rows.length) +
      ' cols-' + Math.min(6, rows[0].length));

    if (head) {
      var thead = el('thead'), hr = el('tr');
      head.forEach(function (c) { hr.appendChild(el('th', null, c)); });
      thead.appendChild(hr);
      t.appendChild(thead);
    }
    var tbody = el('tbody');
    body.forEach(function (r) {
      var tr = asStep(el('tr'), slide);
      r.forEach(function (c, i) {
        /* The first column is the thing being described and the rest are what
           is said about it, so it carries the weight. */
        tr.appendChild(el('td', i === 0 ? 'lead' : null, c));
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    pad.appendChild(t);
  }

  /* Video, referenced rather than embedded — see safeMedia in model.js.
     Rendered three ways on purpose: a rail thumbnail gets a still, because a
     dozen <video> elements in a sidebar is a dozen decoders; the editor's
     preview gets real controls so a clip can be checked while authoring; and
     only the projector is allowed to start on its own. */
  /* YouTube and Vimeo hand out a watch page, not a media file, so a <video>
     element can never play one — paste a youtube.com/watch link into the video
     field and you get a broken player with no clue why. Both publish an embed
     form that is designed to be framed, so the fix is to recognise the link and
     render an iframe instead.

     youtube-nocookie.com rather than youtube.com: same player, but it sets no
     tracking cookie until the video is actually played, which is the right
     default for a room of students who did not choose to be there. */
  /**
   * The service's own still for an embedded clip, when the slide has no poster
   * of its own.
   *
   * A YouTube link used to leave a grey rectangle with "Embedded video · plays
   * in the show" on it, which reads exactly like nothing happened — the link
   * was accepted, the show plays it, and the editor showed no sign of either.
   * YouTube publishes a thumbnail per id, so the author can see the clip they
   * pasted.
   *
   * Only ever used off-stage (the inspector preview and the slide rail). The
   * show loads the real player, which fetches this image itself, so nothing
   * reaches Google here that the room was not going to request anyway — and
   * i.ytimg.com serves the image without setting a cookie, which is the same
   * reason the player is framed from youtube-nocookie.com.
   *
   * Vimeo has no static thumbnail URL without an API call, so it keeps the
   * placeholder.
   *
   * @param {object} slide
   * @returns {string} '' when there is nothing to show
   */
  function videoStill(slide) {
    if (slide.videoPoster) return String(slide.videoPoster);
    var id = youtubeId(slide.video);
    /* hqdefault, not maxresdefault: every video has the first, and a clip
       uploaded below 720p has no second — which would be a broken image where
       the point is reassurance. */
    return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  /** The YouTube id in a link, or '' — shared by the embed and the still. */
  function youtubeId(raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text) return '';
    var u;
    try { u = new URL(text, 'https://x.invalid'); } catch (e) { return ''; }
    var host = u.hostname.toLowerCase(), id = '';
    if (/(^|\.)youtu\.be$/.test(host)) id = u.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else {
        var m = u.pathname.match(/^\/(?:embed|v|shorts|live)\/([^/?#]+)/);
        id = m ? m[1] : '';
      }
    }
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
  }

  function videoEmbed(slide) {
    var raw = String(slide.video || '').trim();
    if (!raw) return '';
    var u;
    try { u = new URL(raw, 'https://x.invalid'); } catch (e) { return ''; }
    var host = u.hostname.toLowerCase(), id = '', base = '';
    if (/(^|\.)youtu\.be$/.test(host)) {
      id = u.pathname.slice(1).split('/')[0];
    } else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else {
        var m = u.pathname.match(/^\/(?:embed|v|shorts|live)\/([^/?#]+)/);
        id = m ? m[1] : '';
      }
    } else if (/(^|\.)vimeo\.com$/.test(host)) {
      var vm = u.pathname.match(/\/(\d+)/);
      id = vm ? vm[1] : '';
      base = 'https://player.vimeo.com/video/';
    }
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return '';
    var vimeo = !!base;
    base = base || 'https://www.youtube-nocookie.com/embed/';
    /* "Share at current time" is how a link like this usually arrives, so the
       t= or #t= already in it counts as the start unless the slide overrides.
       YouTube writes 90, 1m30s or 90s depending on where you copied from. */
    var start = Number(slide.videoStart) > 0 ? Math.floor(slide.videoStart) : 0;
    if (!start) {
      var t = u.searchParams.get('t') || u.searchParams.get('start') ||
        (u.hash.indexOf('t=') === 1 ? u.hash.slice(3) : '');
      var hms = String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
      if (hms && (hms[1] || hms[2] || hms[3])) {
        start = (+(hms[1] || 0)) * 3600 + (+(hms[2] || 0)) * 60 + (+(hms[3] || 0));
      }
    }
    var q = [];
    /* rel=0 matters in a lecture: without it the clip ends on a grid of
       somebody else's videos, in front of the room. */
    if (!vimeo) q.push('rel=0', 'modestbranding=1', 'playsinline=1');
    if (start > 0) q.push((vimeo ? '#t=' : 'start=') + start + (vimeo ? 's' : ''));
    /* YouTube stops itself at end=. Vimeo's player has no equivalent, so a
       stop time there is honoured by the slide rather than the service —
       see the timeupdate guard on the local player below, which also covers
       a file served next to the deck. */
    if (!vimeo && Number(slide.videoEnd) > Number(start)) q.push('end=' + Math.floor(slide.videoEnd));
    if (slide.videoMuted) q.push(vimeo ? 'muted=1' : 'mute=1');
    /* Autoplay is only honoured when muted, on both services. */
    if (slide.videoAutoplay) q.push('autoplay=1');
    if (slide.videoLoop) q.push(vimeo ? 'loop=1' : 'loop=1&playlist=' + id);
    var hash = q.filter(function (p) { return p.charAt(0) === '#'; })[0] || '';
    var search = q.filter(function (p) { return p.charAt(0) !== '#'; }).join('&');
    return base + id + (search ? '?' + search : '') + hash;
  }

  /**
   * The words on a video slide — the same caption block a picture slide gets.
   *
   * It used to be the title alone, in a band welded to the bottom of the
   * frame. That is right for a clip the room is watching and wrong for a clip
   * playing behind a sentence: a looping backdrop wants the text over it,
   * placed and grounded deliberately, and it wants room for a second line.
   * So video now reads design.capStyle and design.capPos like an image does,
   * and takes the subtitle as a credit under the heading.
   *
   * @param {object} slide
   * @param {HTMLElement} pad
   */
  function videoCaption(slide, pad) {
    if (!slide.title && !slide.subtitle) return;
    var box = asStep(el('div', 'cap ' + capClass(slide)), slide);
    if (slide.title) box.appendChild(rich('div', 'cap-line', slide, 'title', slide.title));
    if (slide.subtitle) box.appendChild(rich('div', 'cap-credit', slide, 'subtitle', slide.subtitle));
    pad.appendChild(box);
  }

  function layoutVideo(slide, pad, opts) {
    opts = opts || {};
    var fit = slide.imageFit === 'contain' ? 'contain' : 'cover';

    if (!slide.video) {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '\u25b6'));
      e.appendChild(el('div', null, 'Paste a video URL or a path in the inspector'));
      pad.appendChild(e);
      return;
    }

    if (opts.chrome === false) {                 // rail thumbnail
      var still = el('div', 'img ' + fit);
      var railStill = videoStill(slide);
      if (railStill) {
        still.style.backgroundImage = 'url("' + railStill.replace(/"/g, '&quot;') + '")';
      } else {
        still.classList.add('vid-blank');
      }
      still.appendChild(el('div', 'vid-badge', '\u25b6'));
      pad.appendChild(still);
      videoCaption(slide, pad);
      return;
    }

    var embed = videoEmbed(slide);
    if (embed && !opts.interactive) {
      /* The editor gets a still, not a dead frame. Loading the real player
         beside the inspector would start somebody's clip while they typed,
         and an empty iframe is just a black rectangle that explains nothing. */
      var mute = el('div', 'img ' + fit + ' vid-embed-still');
      var poster = videoStill(slide);
      if (poster) {
        mute.style.backgroundImage = 'url("' + poster.replace(/"/g, '&quot;') + '")';
      } else {
        mute.classList.add('vid-blank');
      }
      mute.appendChild(el('div', 'vid-badge', '\u25b6'));
      /* Named rather than "embedded": a teacher who pasted a YouTube link
         wants to be told the link was understood. */
      mute.appendChild(el('div', 'vid-embed-note',
        youtubeId(slide.video) ? 'YouTube · plays in the show'
          : 'Embedded video · plays in the show'));
      pad.appendChild(mute);
      videoCaption(slide, pad);
      return;
    }
    if (embed) {
      var frame = el('iframe', 'vid vid-embed ' + fit);
      frame.src = embed;
      frame.setAttribute('title', slide.title || 'Embedded video');
      frame.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.setAttribute('loading', 'lazy');
      pad.appendChild(frame);
      videoCaption(slide, pad);
      return;
    }

    var v = el('video', 'vid ' + fit);
    v.src = slide.video;
    v.controls = true;
    v.preload = 'metadata';
    v.playsInline = true;
    v.loop = slide.videoLoop === true;
    v.muted = slide.videoMuted === true;
    if (slide.videoPoster) v.poster = slide.videoPoster;
    /* Intent, not action: Player starts and stops playback because it is the
       only thing that knows when a slide arrives and leaves. Marking it here
       and playing it there is also what keeps the editor's preview silent. */
    if (slide.videoAutoplay && opts.interactive) v.dataset.autoplay = '1';
    if (slide.videoStart > 0) {
      v.dataset.start = String(slide.videoStart);
      v.addEventListener('loadedmetadata', function () {
        /* Guarded: a start past the end of the file would otherwise leave the
           clip parked on a black frame with no way to tell why. */
        if (isFinite(v.duration) && slide.videoStart < v.duration) {
          v.currentTime = slide.videoStart;
        }
      }, { once: true });
    }
    /* Stopping is the slide's job here: a media element has no "play until"
       and will run to the end of the file, which in a lecture is the clip
       plus whatever the clip was cut from. Paused rather than ended, so the
       last frame stays on the wall instead of the black that follows it —
       and loop is left to win, because someone who asked for both meant the
       section to repeat. */
    if (Number(slide.videoEnd) > Number(slide.videoStart || 0) && !v.loop) {
      var stopAt = Number(slide.videoEnd);
      v.addEventListener('timeupdate', function () {
        if (v.currentTime >= stopAt && !v.paused) v.pause();
      });
    }
    pad.appendChild(v);
    videoCaption(slide, pad);
  }

  /* Half text / half image — dual coding without leaving the teaching canvas. */
  function layoutSplit(slide, pad) {
    var side = slide.imageSide === 'left' ? 'left' : 'right';
    pad.classList.add('split-pad', 'image-' + side);

    var copy = el('div', 'split-copy');
    if (slide.title) copy.appendChild(rich('h2', null, slide, 'title', slide.title));
    var ul = el('ul');
    var lines = (slide.bullets || []).map(function(text,index){return {text:text,index:index};}).filter(function (b) { return String(b.text).trim(); });
    if (!lines.length) {
      ul.appendChild(el('li', 'dim', 'Add points in the inspector'));
    } else {
      lines.forEach(function (item) {
        var line=item.text;
        var li = asStep(rich('li', bulletTier(line) === 2 ? 'tier-2' : null, slide, 'bullets.' + item.index, bulletText(line)), slide);
        li.dataset.step = '1';
        ul.appendChild(li);
      });
    }
    copy.appendChild(ul);

    /* The themed mount — an inset white card floating on a tinted ground — is
       right for a photograph or a scanned plate, which need something to sit
       on. It is wrong for a chart that already arrives on white: the card is
       invisible against it and the inset just makes the chart smaller inside a
       coloured frame that means nothing. So the mount is a choice. */
    var media = el('div', 'split-media' +
      ((slide.design || {}).mediaGround === 'full' ? ' split-media-full' : ''));
    if (slide.image) {
      var img = el('div', 'img ' + (slide.imageFit === 'contain' ? 'contain' : 'cover'));
      img.style.backgroundImage = 'url("' + String(slide.image).replace(/"/g, '&quot;') + '")';
      media.appendChild(img);
      /* The picture can take a press of its own: show it first and let the
         points annotate it, or hold it back and let the room predict before
         it lands. Only ever a step when there is actually an image — pacing
         the "add an image" placeholder would help nobody. */
      var arrival = (slide.design || {}).imageStep;
      if (slide.progressive && (arrival === 'before' || arrival === 'after')) {
        media.classList.add('step');
        media.dataset.step = arrival === 'before' ? '0' : '2';
      }
      if (slide.subtitle) {
        var credit = el('div', 'cap ' + capClass(slide));
        credit.appendChild(rich('div', 'cap-credit', slide, 'subtitle', slide.subtitle));
        media.appendChild(credit);
      }
    } else {
      var empty = el('div', 'split-empty');
      empty.appendChild(el('div', null, '▣'));
      empty.appendChild(el('div', null, 'Add an image'));
      media.appendChild(empty);
    }

    if (side === 'left') {
      pad.appendChild(media);
      pad.appendChild(copy);
    } else {
      pad.appendChild(copy);
      pad.appendChild(media);
    }
  }

  /** Sample join payload for the editor / solo preview — real PIN arrives with Host live. */
  function sampleJoinInfo() {
    var origin = '';
    try { origin = String(location.origin || ''); } catch (e) { origin = ''; }
    if (!/^https?:/i.test(origin)) origin = 'http://localhost:8787';
    var pin = '4821';
    return {
      pin: pin,
      url: origin.replace(/^https?:\/\//i, ''),
      link: origin.replace(/\/$/, '') + '/join.html?pin=' + pin,
      open: true,
      sample: true
    };
  }

  /** Full-screen join: QR, PIN and address — the wall while phones arrive. */
  function layoutJoin(slide, pad, opts) {
    var join = (opts && opts.join) || sampleJoinInfo();
    var stage = el('div', 'join-stage');
    if (slide.title) stage.appendChild(rich('h2', 'join-title', slide, 'title', slide.title));
    if (slide.subtitle) stage.appendChild(rich('div', 'join-sub', slide, 'subtitle', slide.subtitle));

    var lines = (slide.bullets || []).map(function (t) { return String(t).trim(); }).filter(Boolean);
    if (lines.length) {
      var list = el('ul', 'join-bullets');
      lines.forEach(function (line, i) {
        list.appendChild(rich('li', null, slide, 'bullets.' + i, line));
      });
      stage.appendChild(list);
    }

    var board = el('div', 'join-board');
    var code = el('div', 'join-qr');
    if (join.link && SF.qrSvg) {
      try {
        code.innerHTML = SF.qrSvg(join.link, {
          quiet: 4,
          title: 'Join at ' + (join.url || join.link)
        });
      } catch (e) { /* address + PIN still work without a code */ }
    }
    board.appendChild(code);

    var side = el('div', 'join-side');
    side.appendChild(el('div', 'join-lead',
      join.sample ? 'Sample — Host live for the real code' : 'Join at'));
    side.appendChild(el('div', 'join-url', join.url || '—'));
    side.appendChild(el('div', 'join-lead pin-lead', 'Game PIN'));
    side.appendChild(el('div', 'join-pin', join.pin || '----'));
    board.appendChild(side);
    stage.appendChild(board);
    pad.appendChild(stage);
  }

  /* A game embed is a marker, not a real slide: at showtime it is replaced by
     the game's compiled questions. It only ever renders in the editor. */
  function layoutGame(slide, pad, opts) {
    var game = opts.game || null;
    var card = el('div', 'gamecard');

    var top = el('div', 'gc-top');
    top.appendChild(el('span', 'gc-badge', 'GAME'));
    top.appendChild(el('span', 'gc-note', game ? 'plays here, then the deck continues' : ''));
    card.appendChild(top);

    card.appendChild(el('div', 'gc-title', game ? game.title : (slide.gameTitle || 'No game selected')));

    if (game) {
      var facts = el('div', 'gc-facts');
      var n = game.questions.length;
      facts.appendChild(el('span', 'gc-fact', SF.gameStyle(game.style).label));
      facts.appendChild(el('span', 'gc-fact', n + (n === 1 ? ' question' : ' questions')));
      facts.appendChild(el('span', 'gc-fact',
        game.settings.mode === 'teams'
          ? game.settings.teams.length + ' teams'
          : 'individual scoring'));
      if (game.settings.defaultTime) {
        facts.appendChild(el('span', 'gc-fact', game.settings.defaultTime + 's per question'));
      }
      card.appendChild(facts);

      if (game.settings.mode === 'teams') {
        var teams = el('div', 'gc-teams');
        game.settings.teams.forEach(function (t, i) {
          var chip = el('span', 'gc-team', t.name);
          chip.style.background = SF.teamColor(i);
          if (i === 2) chip.style.color = '#1d1204';
          teams.appendChild(chip);
        });
        card.appendChild(teams);
      }
    } else {
      card.appendChild(el('div', 'gc-facts',
        'Pick a game in the inspector, or this slide is skipped.'));
    }

    pad.appendChild(card);
  }

  /* The teaching moment: the question restated small, the correct answer
     large, and the reasoning in body type sized to be read from the back. */
  function layoutExplain(slide, pad, opts) {
    var head = el('div', 'ex-head');
    if (slide.questionNumber) head.appendChild(el('span', 'ex-qn', 'Q' + slide.questionNumber));
    head.appendChild(el('span', 'ex-q', slide.question || ''));
    pad.appendChild(head);

    var answer = el('div', 'ex-answer');
    /* An open-response question has no option to point at, so the answer
       travels as text and the badge says how it was answered. */
    var typed = slide.input === 'text' || slide.input === 'number';
    answer.appendChild(el('span', 'key',
      slide.input === 'number' ? '↔' : typed ? '✎' : (LETTERS[slide.correct] || '?')));
    answer.appendChild(el('span', 'txt', typed
      ? (slide.answer || '')
      : ((slide.options || [])[slide.correct] || '')));
    answer.appendChild(el('span', 'tick', '✓'));
    pad.appendChild(answer);

    var body = el('div', 'ex-body');
    /* Blank lines make paragraphs; a single newline stays a line break.
       With progressive builds, each paragraph is one Next press. */
    String(slide.body || '').split(/\n{2,}/).forEach(function (para) {
      if (!para.trim()) return;
      body.appendChild(asStep(el('p', null, para.trim()), slide));
    });
    /* Long explanations step the type down rather than overflowing the slide. */
    var len = String(slide.body || '').length;
    body.dataset.len = len > 420 ? 'xl' : len > 240 ? 'lg' : 'md';
    pad.appendChild(body);

    if (slide.subtitle) pad.appendChild(el('div', 'ex-source', slide.subtitle));
  }

  /* An empty line with its ends labelled. The room's placings and the band
     that counts are added at reveal by Player.showPlacedValues(). */
  function numberLine(slide) {
    var wrap = el('div', 'numberline');
    var line = el('div', 'nl-line');
    line.appendChild(el('div', 'nl-band'));
    line.appendChild(el('div', 'nl-marks'));
    line.appendChild(el('div', 'nl-target'));
    wrap.appendChild(line);
    var ends = el('div', 'nl-ends');
    ends.appendChild(el('span', null, SF.formatValue(slide.min, slide.unit)));
    ends.appendChild(el('span', null, SF.formatValue(slide.max, slide.unit)));
    wrap.appendChild(ends);
    return wrap;
  }

  /* The field, shown above the question on a race slide. Compact on purpose:
     the question and answers still have to dominate, but a race that only
     looks like a race after the reveal just looks like a quiz. Positions only
     change at reveal, so this is rendered once per slide and never updated. */
  function raceStrip(lanes, len, command) {
    var strip = el('div', 'race-strip');
    if (command) strip.classList.add('runnable');
    lanes.forEach(function (lane) {
      /* A button when the teacher is running the race, so a lane moves by
         being pressed. With phones in the room the field moves itself and
         these stay plain rows — two things moving one race is one too many. */
      var row = el(command ? 'button' : 'div', 'rlane' +
        (lane.moved ? ' moved' : '') + (lane.won ? ' won' : ''));
      if (command) {
        row.type = 'button';
        row.setAttribute('aria-label', 'Move ' + lane.name + ' forward a step');
        row.title = lane.pos >= len ? lane.name + ' is home' : 'Move ' + lane.name + ' on';
        row.disabled = lane.pos >= len;
        row.onclick = function (e) {
          command(lane.key, e.shiftKey ? 'back' : 'advance');
        };
      }
      row.style.setProperty('--lane-color', lane.color || 'var(--s-accent)');
      row.style.setProperty('--lane-tint', tint(lane.color, 0.32));

      row.appendChild(el('div', 'rname', lane.name));

      var rail = el('div', 'rrail');
      var fill = el('div', 'rfill');
      fill.style.width = ((Math.min(lane.pos, len) / len) * 100) + '%';
      rail.appendChild(fill);
      /* Same runner as the full track, so the strip and the overlay read as
         the same race rather than two different charts. */
      var mark = el('div', 'rmark', lane.pos >= len ? '🏆' : '🏇');
      mark.style.left = (lane.pos <= 0 ? 0 : ((lane.pos - 0.5) / len) * 100) + '%';
      rail.appendChild(mark);
      row.appendChild(rail);

      row.appendChild(el('div', 'rpos', lane.pos + '/' + len));
      strip.appendChild(row);
    });
    return strip;
  }

  /* What the wall should look like for a compiled quiz slide.
     Catalogue formats share the quiz runtime; presentation is what stops
     every game reading as the same A–D card. */
  function quizPresent(slide) {
    /* Catalogue format first — Odd One Out and Predict share the choice engine
       but must not look the same on the wall. */
    var f = slide.format || '';
    if (f === 'emoji-guess') return 'emoji';
    if (f === 'fill-in-the-blanks') return 'blanks';
    if (f === 'odd-one-out') return 'oddone';
    if (f === 'compare-contrast') return 'compare';
    if (f === 'spot-the-error') return 'spoterror';
    if (f === 'predict-outcome') return 'predict';
    if (f === 'low-stakes-quiz') return 'lowstakes';
    if (f === 'definition-challenge') return 'definition';
    if (f === 'time-traveler') return 'timetravel';
    if (f === 'true-false' || f === 'truefalse') return 'truefalse';
    if (f === 'beat-the-clock') return 'speed';
    if (f === 'boss-battle') return 'boss';
    if (f === 'horse-race') return 'race';
    if (f === 'word-reveal') return 'wordreveal';
    if (f === 'memory-flip') return 'claim';
    if (f === 'memory-match') return 'memorymatch';
    if (f === 'knowledge-flip') return 'knowledge';
    if (f === 'heads-up') return 'headsup';
    if (f === 'spin-explain') return 'spin';
    if (f === 'connection-maker') return 'connection';
    if (f === 'concept-chain') return 'chain';
    if (f === 'random-challenge') return 'challenge';
    if (f === 'quiz-bowl') return 'bowl';
    if (f === 'ranking') return 'ranking';

    var s = slide.style || '';
    if (s === 'truefalse') return 'truefalse';
    if (s === 'speed') return 'speed';
    if (s === 'boss') return 'boss';
    if (s === 'race') return 'race';
    if (s === 'wordreveal') return 'wordreveal';
    if (s === 'memoryflip') return 'claim';
    if (s === 'memorymatch') return 'memorymatch';
    if (s === 'knowledgeflip') return 'knowledge';
    if (s === 'headsup') return 'headsup';
    if (s === 'spinexplain') return 'spin';
    if (s === 'connection') return 'connection';
    if (s === 'conceptchain') return 'chain';
    if (s === 'randomchallenge') return 'challenge';
    if (s === 'bowl') return 'bowl';
    if (s === 'emoji') return 'emoji';
    if (s === 'definition') return 'definition';
    if (s === 'oddone') return 'oddone';
    if (s === 'compare') return 'compare';
    if (s === 'order') return 'ranking';
    if (slide.input === 'order') return 'ranking';
    if (slide.input === 'number') return 'slider';
    if (slide.input === 'text') return 'typed';
    return 'choice';
  }

  function appendJudgeStrip(pad, slide, opts, inlineWhy, whyBox) {
    var opts_ = (slide.options || []).filter(function (o) { return String(o).trim(); });
    var wrap = el('div', 'opts judge-strip');
    wrap.appendChild(el('div', 'judge-caption', slide.style === 'spinexplain'
      ? 'Clear · 2 points / With hint · 1 / Try again · 0' : 'Host marks the claim'));
    opts_.forEach(function (text, i) {
      var yes = i === slide.correct;
      var b = el('button', 'opt judge ' + (yes ? 'yes' : 'skip'));
      b.type = 'button';
      b.dataset.choice = String(i);
      if (!opts.interactive) b.classList.add('locked');
      var line = el('span', 'opt-line');
      /* No A/B keys — this is a host verdict bar, not a learner quiz. */
      line.appendChild(el('span', 'judge-mark', yes ? '✓' : '○'));
      line.appendChild(el('span', 'txt', text));
      b.appendChild(line);
      if (inlineWhy && yes) b.appendChild(whyBox());
      wrap.appendChild(b);
    });
    pad.appendChild(wrap);
  }

  /** Face-down card backs for Memory Match atmosphere (other pairs in the set). */
  function matchBoardTiles(slide, opts) {
    var bank = (opts && opts.pairBank) || [];
    var tiles;
    if (bank.length) {
      tiles = bank.slice(0, 8);
    } else {
      tiles = [{ term: slide.term || slide.question || '·', active: true }];
    }
    while (tiles.length < 6) tiles.push({ term: '', ghost: true });
    return tiles;
  }

  function layoutQuiz(slide, pad, opts) {
    var present = quizPresent(slide);
    pad.parentNode.classList.add('present-' + present);

    /* Race questions lead with the field. */
    if (opts.lanes && opts.lanes.length) {
      pad.parentNode.classList.add('is-race');
      pad.appendChild(raceStrip(opts.lanes, opts.trackLength || 5, opts.laneCommand));
    }

    /* Style-specific stage heroes — these own the glance, not A–D. */
    if (present === 'wordreveal') {
      var wrHero = el('div', 'stage-hero wr-stage');
      wrHero.appendChild(el('div', 'stage-atmosphere', ''));
      if (slide.hint) wrHero.appendChild(el('div', 'stage-kicker', slide.hint));
      var letters = String(slide.word || slide.answer || '');
      var pre = slide.preReveal != null ? slide.preReveal : 0.4;
      var showN = Math.round(SF.wordRevealLetterCount(letters) * pre);
      var mask = SF.wordRevealMask ? SF.wordRevealMask(letters, showN) : letters.replace(/\S/g, '_');
      var board = el('div', 'wr-board');
      String(mask).split('').forEach(function (ch, i) {
        if (ch === ' ') { board.appendChild(el('span', 'wr-gap', '')); return; }
        var tile = el('span', 'wr-tile' + (ch === '_' ? ' blank' : ' lit'), ch === '_' ? '' : ch);
        tile.style.animationDelay = (i * 0.04) + 's';
        board.appendChild(tile);
      });
      wrHero.appendChild(board);
      wrHero.appendChild(el('div', 'stage-note', 'Letters drip in · type your guess'));
      pad.appendChild(wrHero);
    } else if (present === 'memorymatch') {
      /* Real match table — face-down set + the active term↔definition pair.
         Claimed / Not yet is host scoring only; it must not look like A/B quiz. */
      var match = el('div', 'stage-hero match-stage');
      match.appendChild(el('div', 'stage-atmosphere', ''));
      var board = el('div', 'match-board');
      matchBoardTiles(slide, opts).forEach(function (tile, ti) {
        var cell = el('button', 'match-tile' +
          (tile.active ? ' active' : '') +
          (tile.ghost ? ' ghost' : ' back'));
        cell.type = 'button';
        cell.tabIndex = -1;
        cell.setAttribute('aria-hidden', 'true');
        cell.appendChild(el('span', 'match-tile-back', tile.ghost ? '' : '◈'));
        if (tile.active && tile.term) {
          cell.appendChild(el('span', 'match-tile-front', String(tile.term).slice(0, 18)));
        }
        cell.style.animationDelay = (ti * 0.05) + 's';
        board.appendChild(cell);
      });
      match.appendChild(board);
      var duo = el('div', 'match-duo');
      var termCard = el('div', 'match-card term open');
      termCard.appendChild(el('div', 'match-face-label', 'Term'));
      termCard.appendChild(el('div', 'match-face-text', slide.term || slide.question || ''));
      var defOpen = !!(opts.revealed || slide.hideAfterStudy === false);
      var defCard = el('div', 'match-card def' + (defOpen ? ' open' : ' shut'));
      defCard.appendChild(el('div', 'match-face-label', 'Definition'));
      if (defOpen && slide.definition) {
        defCard.appendChild(el('div', 'match-face-text', slide.definition));
      } else {
        defCard.appendChild(el('div', 'match-face-hidden', '?'));
        defCard.appendChild(el('div', 'match-face-hint', 'Study · then recall'));
      }
      duo.appendChild(termCard);
      duo.appendChild(el('div', 'match-link', '⟷'));
      duo.appendChild(defCard);
      match.appendChild(duo);
      match.appendChild(el('div', 'stage-note',
        'Memorise the pair. Host marks Claimed when a learner has it (+1).'));
      pad.appendChild(match);
    } else if (present === 'claim') {
      /* Memory Flip — one card that turns term → definition. */
      var claim = el('div', 'stage-hero claim-stage');
      claim.appendChild(el('div', 'stage-atmosphere', ''));
      var flip = el('div', 'flip-card' +
        (opts.revealed || slide.hideAfterStudy === false ? ' open' : ''));
      var faceA = el('div', 'flip-face front');
      faceA.appendChild(el('div', 'match-face-label', 'Term'));
      faceA.appendChild(el('div', 'claim-term', slide.term || slide.question || ''));
      var faceB = el('div', 'flip-face back');
      faceB.appendChild(el('div', 'match-face-label', 'Definition'));
      faceB.appendChild(el('div', 'claim-def',
        slide.definition || 'Flip after study'));
      flip.appendChild(faceA);
      flip.appendChild(faceB);
      claim.appendChild(flip);
      if (!opts.revealed && slide.hideAfterStudy !== false) {
        claim.appendChild(el('div', 'stage-note',
          'Study while the clock runs · then the definition hides'));
      }
      pad.appendChild(claim);
    } else if (present === 'knowledge') {
      var know = el('div', 'stage-hero knowledge-stage');
      know.appendChild(el('div', 'stage-atmosphere', ''));
      var chip = el('div', 'knowledge-chip');
      chip.appendChild(el('div', 'claim-term', slide.term || slide.question || ''));
      know.appendChild(chip);
      if (slide.definition) {
        know.appendChild(el('div', 'claim-def soft', slide.definition));
      }
      know.appendChild(el('div', 'stage-note', 'Keywords stay visible. Host marks Claimed for +1.'));
      pad.appendChild(know);
    } else if (present === 'spin') {
      var spin = el('div', 'spin-room');
      var dial = el('div', 'spin-dial');
      dial.setAttribute('aria-hidden', 'true');
      var wheel = el('div', 'spin-disc');
      for (var segment = 0; segment < 8; segment++) {
        var mark = el('span', 'spin-segment', ['✦', '◎', '✳', '◇'][segment % 4]);
        mark.style.setProperty('--sector', segment);
        wheel.appendChild(mark);
      }
      dial.appendChild(wheel);
      dial.appendChild(el('div', 'spin-pointer', '▼'));
      dial.appendChild(el('div', 'spin-hub', 'SPIN'));
      var counter = el('div', 'spin-counter', slide.spinTotal
        ? 'DRAW ' + slide.spinDraw + ' / ' + slide.spinTotal : 'CONCEPT DRAW');
      dial.appendChild(counter);
      spin.appendChild(dial);
      var challenge = el('div', 'spin-challenge');
      challenge.appendChild(el('div', 'spin-eyebrow', slide.category || 'YOUR CONCEPT'));
      challenge.appendChild(el('h2', 'spin-concept', slide.term || slide.question || ''));
      var steps = el('div', 'spin-scaffold');
      ['Explain the meaning', 'Give a real example', 'Connect it to what you know'].forEach(function (text, i) {
        var step = el('div', 'spin-prompt');
        step.appendChild(el('span', null, String(i + 1)));
        step.appendChild(el('strong', null, text));
        steps.appendChild(step);
      });
      challenge.appendChild(steps);
      if (slide.hint) {
        var hint = el('details', 'spin-hint');
        hint.appendChild(el('summary', null, 'Need a hint?'));
        hint.appendChild(el('p', null, slide.hint));
        challenge.appendChild(hint);
      }
      challenge.appendChild(el('div', 'spin-deck-note', slide.spinTotal
        ? (slide.spinTotal - slide.spinDraw) + ' concepts left · no repeat draws'
        : 'Explain aloud · the teacher marks your response'));
      spin.appendChild(challenge);
      pad.appendChild(spin);
    } else if (present === 'headsup') {
      var oracy = el('div', 'stage-hero oracy-stage heads-stage');
      oracy.appendChild(el('div', 'stage-atmosphere', ''));
      if (slide.category) oracy.appendChild(el('div', 'stage-kicker', slide.category));
      oracy.appendChild(el('div', 'oracy-term', slide.term || slide.question || ''));
      if (slide.hint) oracy.appendChild(el('div', 'stage-note', slide.hint));
      pad.appendChild(oracy);
    } else if (present === 'connection') {
      var pair = el('div', 'stage-hero connection-stage');
      pair.appendChild(el('div', 'stage-atmosphere', ''));
      var row = el('div', 'conn-pair');
      var ca = el('div', 'conn-tile a');
      ca.appendChild(el('div', 'conn-label', 'A'));
      ca.appendChild(el('div', 'conn-text', slide.itemA || 'A'));
      var cb = el('div', 'conn-tile b');
      cb.appendChild(el('div', 'conn-label', 'B'));
      cb.appendChild(el('div', 'conn-text', slide.itemB || 'B'));
      row.appendChild(ca);
      row.appendChild(el('div', 'conn-bridge', '↔'));
      row.appendChild(cb);
      pair.appendChild(row);
      pair.appendChild(el('div', 'stage-note', 'Explain the bridge aloud'));
      pad.appendChild(pair);
    } else if (present === 'compare') {
      var cmp = el('div', 'stage-hero compare-stage');
      cmp.appendChild(el('div', 'stage-atmosphere', ''));
      if (slide.category) {
        cmp.appendChild(el('div', 'stage-kicker', slide.category));
      }
      var crow = el('div', 'compare-pair');
      var cta = el('div', 'compare-tile');
      cta.appendChild(el('div', 'compare-label', 'Item A'));
      cta.appendChild(el('div', 'compare-text', slide.itemA || 'A'));
      var ctb = el('div', 'compare-tile');
      ctb.appendChild(el('div', 'compare-label', 'Item B'));
      ctb.appendChild(el('div', 'compare-text', slide.itemB || 'B'));
      crow.appendChild(cta);
      crow.appendChild(ctb);
      cmp.appendChild(crow);
      if (!opts.revealed) {
        cmp.appendChild(el('p', 'compare-discuss',
          'Discuss: what are the similarities and differences?'));
      }
      var panels = el('div', 'compare-panels' + (opts.revealed ? ' on' : ''));
      var alike = el('div', 'compare-panel alike');
      alike.appendChild(el('div', 'compare-panel-label', 'Similarities'));
      alike.appendChild(el('div', 'compare-panel-body',
        slide.similarities || 'Needs similarities'));
      var differ = el('div', 'compare-panel differ');
      differ.appendChild(el('div', 'compare-panel-label', 'Differences'));
      differ.appendChild(el('div', 'compare-panel-body',
        slide.differences || 'Needs differences'));
      panels.appendChild(alike);
      panels.appendChild(differ);
      cmp.appendChild(panels);
      pad.appendChild(cmp);
    } else if (present === 'chain') {
      var links = (opts.chainLinks || []).slice();
      var chain = el('div', 'stage-hero chain-stage');
      chain.appendChild(el('div', 'stage-atmosphere', ''));
      var steps = el('div', 'chain-steps');
      links.forEach(function (step) {
        steps.appendChild(el('div', 'chain-node done', step.term || ''));
        steps.appendChild(el('div', 'chain-arrow', ''));
        steps.appendChild(el('div', 'chain-node link', step.link || ''));
        steps.appendChild(el('div', 'chain-arrow', ''));
      });
      steps.appendChild(el('div', 'chain-node seed', slide.term || slide.question || ''));
      if (!opts.revealed) {
        steps.appendChild(el('div', 'chain-arrow', ''));
        var pendingLabel = String(opts.chainPending || '').trim();
        steps.appendChild(el('div', 'chain-node ghost',
          pendingLabel || 'next link'));
      }
      chain.appendChild(steps);
      if (slide.prompt) {
        chain.appendChild(el('div', 'stage-note chain-prompt', slide.prompt));
      }
      if (!opts.revealed && opts.chainCommand) {
        var wrap = el('div', 'chain-capture');
        var inp = el('input', 'chain-link-input');
        inp.type = 'text';
        inp.maxLength = 160;
        inp.placeholder = 'Type the proposed link and justification';
        inp.value = opts.chainPending || '';
        inp.setAttribute('aria-label', 'Proposed chain link');
        inp.addEventListener('input', function () {
          opts.chainCommand('pending', inp.value);
          var ghost = steps.querySelector('.chain-node.ghost');
          if (ghost) ghost.textContent = String(inp.value || '').trim() || 'next link';
        });
        inp.addEventListener('click', function (e) { e.stopPropagation(); });
        wrap.appendChild(inp);
        wrap.appendChild(el('p', 'chain-capture-hint',
          'Accept grows the chain (+1). Reject or timeout skips.'));
        chain.appendChild(wrap);
      }
      pad.appendChild(chain);
    } else if (present === 'challenge') {
      var ch = el('div', 'stage-hero challenge-stage');
      ch.appendChild(el('div', 'stage-atmosphere', ''));
      var poster = el('div', 'challenge-poster');
      poster.appendChild(el('div', 'challenge-body', slide.challenge || slide.question || ''));
      ch.appendChild(poster);
      pad.appendChild(ch);
    } else if (present === 'bowl') {
      var bowl = el('div', 'stage-hero bowl-stage');
      bowl.appendChild(el('div', 'stage-atmosphere', ''));
      var bcell = el('div', 'bowl-cell');
      bcell.appendChild(el('div', 'bowl-cat', slide.category || 'Category'));
      bcell.appendChild(el('div', 'bowl-val', String(slide.pointValue || slide.points || 200)));
      bowl.appendChild(bcell);
      pad.appendChild(bowl);
    } else if (present === 'boss') {
      var fight = opts.boss || null;
      var boss = el('div', 'stage-hero boss-stage' + (fight ? ' is-' + fight.stage : ''));
      boss.appendChild(el('div', 'stage-atmosphere', ''));
      var crest = el('div', 'boss-crest');
      crest.appendChild(el('div', 'boss-glyph',
        fight && fight.stage === 'defeated' ? '☠' : '▲'));
      var dmg = slide.bossDamage || 2;
      crest.appendChild(el('div', 'boss-hit-badge',
        (slide.difficulty || 'medium') + ' · ' + dmg + ' dmg'));
      boss.appendChild(crest);
      /* The health of the thing they are hitting. Without it the crest and the
         damage badge were decoration: nothing on the slide said what the boss
         had left, because nothing outside a live room was keeping count. */
      if (fight) {
        var hp = el('div', 'boss-hp');
        var bar = el('div', 'boss-hp-rail');
        var fill = el('div', 'boss-hp-fill');
        fill.style.width = Math.round((fight.hp / Math.max(1, fight.max)) * 100) + '%';
        bar.appendChild(fill);
        hp.appendChild(bar);
        hp.appendChild(el('div', 'boss-hp-n', fight.hp + ' / ' + fight.max + ' HP'));
        boss.appendChild(hp);
        if (fight.gap) {
          boss.appendChild(el('div', 'boss-turn boss-gap', fight.gap +
            ' — the boss cannot be hit with a blank question.'));
        } else if (fight.marked) {
          boss.appendChild(el('div', 'boss-turn', 'Already marked — move on.'));
        } else if (fight.turnName) {
          boss.appendChild(el('div', 'boss-turn',
            fight.stage === 'defeated' ? fight.verdict
              : fight.turnName + ' — ' + (fight.revealed
                ? (fight.expired ? 'out of time' : 'did they earn the hit?')
                : 'answer before the clock')));
        }
      }
      pad.appendChild(boss);
      if (opts.bossCommand && fight && !fight.marked && fight.phase !== 'complete') {
        var acts = el('div', 'boss-actions');
        function bossBtn(text, action, cls) {
          var b = el('button', 'boss-button ' + (cls || ''), text);
          b.type = 'button';
          b.onclick = function () { opts.bossCommand(action); };
          return b;
        }
        if (!fight.revealed) acts.appendChild(bossBtn('Reveal the answer', 'reveal', 'primary'));
        else {
          /* A question the clock beat cannot be marked a hit — the original
             counted a timeout as wrong and so does this. */
          if (!fight.expired) acts.appendChild(bossBtn('✓ Hit · −' + dmg, 'hit', 'primary'));
          acts.appendChild(bossBtn(fight.expired ? 'Out of time — move on' : '✗ Miss', 'miss'));
        }
        pad.appendChild(acts);
      }
    } else if (present === 'truefalse') {
      var tf = el('div', 'stage-atmosphere tf-atmosphere', '');
      pad.appendChild(tf);
    } else if (present === 'emoji') {
      var em = el('div', 'stage-hero emoji-stage');
      em.appendChild(el('div', 'stage-atmosphere', ''));
      var clueText = String(slide.clues || slide.question || '');
      var hero = el('div', 'emoji-hero');
      /* Grapheme segmentation keeps flags, skin tones and joined families intact.
         Long or mixed-text clues retain the original readable text layout. */
      var layout = SF.emojiClueLayout
        ? SF.emojiClueLayout(clueText)
        : { tiled: false, pieces: [], text: clueText };
      var pieces = layout.pieces;
      var tiled = layout.tiled;
      hero.classList.toggle('emoji-tiled', tiled);
      if (tiled) {
        hero.setAttribute('role', 'img');
        hero.setAttribute('aria-label', clueText);
        hero.style.setProperty('--clue-count', pieces.length);
        pieces.forEach(function (piece, i) {
          var operator = /^[+＝=→➜➡↔&]$/.test(piece);
          var tile = el('span', operator ? 'emoji-operator' : 'emoji-clue', piece);
          tile.setAttribute('aria-hidden', 'true');
          tile.style.setProperty('--clue-index', i);
          hero.appendChild(tile);
        });
      } else hero.textContent = clueText;
      var prompt = el('div', 'emoji-mission');
      prompt.appendChild(el('span', 'emoji-thinking', 'DECODE THE CLUES'));
      prompt.appendChild(el('span', 'emoji-solved', 'THE CONNECTION REVEALED'));
      em.appendChild(prompt);
      em.appendChild(hero);
      var nudge = el('p', 'emoji-nudge');
      nudge.appendChild(el('span', 'emoji-thinking', 'Name the clues. Find the connection. Make your guess.'));
      nudge.appendChild(el('span', 'emoji-solved', 'Can you explain how each clue fits?'));
      em.appendChild(nudge);
      /* Help, one press at a time, on the step-reveal the teacher already
         drives with the arrow keys. Only the letter pattern belongs under the
         clues — it is about the answer's shape, so it reads as part of the
         puzzle. The hint is framing and goes up in the title row instead, so
         the stage stays two things rather than a column of three panels. */
      var pattern = SF.emojiHelp ? SF.emojiHelp(slide).pattern : 'step';
      if (pattern !== 'none') {
        var blanks = el('div', 'emoji-help emoji-help-blanks' +
          (pattern === 'step' ? ' step' : ''));
        blanks.dataset.step = '1';
        blanks.appendChild(el('span', 'emoji-help-label', 'LETTERS'));
        blanks.appendChild(el('strong', 'emoji-blanks',
          SF.wordRevealMask(slide.answer || '', 0)));
        em.appendChild(blanks);
      }
      pad.appendChild(em);
    } else if (present === 'definition') {
      var defPhase = opts.definitionPhase || 'reading';
      var def = el('div', 'stage-hero definition-stage phase-' + defPhase);
      def.appendChild(el('div', 'stage-atmosphere', ''));
      if (defPhase === 'reading') {
        def.appendChild(el('div', 'definition-eyebrow', 'READING · NO NOTES'));
        def.appendChild(el('p', 'definition-passage',
          slide.passage || 'Needs a passage'));
        if (!String(slide.passage || '').trim()) {
          def.appendChild(el('p', 'definition-gap',
            'Add a passage in Quiz studio before you play'));
        }
        if (opts.definitionCommand) {
          var askBtn = el('button', 'definition-ask', 'Ask now — hide the passage');
          askBtn.type = 'button';
          askBtn.onclick = function () { opts.definitionCommand('ask'); };
          def.appendChild(askBtn);
        } else {
          def.appendChild(el('p', 'definition-caption',
            'When time is up the passage clears and the recall question appears.'));
        }
      } else {
        def.appendChild(el('div', 'definition-eyebrow', 'RECALL · FROM MEMORY'));
        def.appendChild(el('p', 'definition-caption',
          'The passage is gone. Answer from what you just read.'));
      }
      pad.appendChild(def);
    } else if (present === 'blanks') {
      var bl = el('div', 'stage-hero blanks-stage');
      bl.appendChild(el('div', 'stage-atmosphere', ''));
      var line = el('div', 'blanks-line');
      String(slide.question || '').split(/(_{2,}|……+|…+)/).forEach(function (part) {
        if (/^(_+|……+|…+)$/.test(part)) line.appendChild(el('span', 'blank-pill', '_____'));
        else if (part) line.appendChild(document.createTextNode(part));
      });
      bl.appendChild(line);
      pad.appendChild(bl);
    }

    var head = el('div', 'qhead');
    /* Same Q# + question heading on every quiz — stage heroes dress the
       play area underneath, they do not replace the title row. */
    if (opts.quizNumber) {
      head.appendChild(el('div', 'qnum',
        (opts.lanes ? 'LEG ' : 'Q') + opts.quizNumber));
    }
    /* A format whose question text is data rather than a line to read out
       says what to print instead, and an empty string means print nothing.
       Emoji guess is the one: its question is the emoji, already on the stage
       at twice the size. */
    var title = typeof slide.headPrompt === 'string'
      ? slide.headPrompt : (slide.question || ' ');
    var emojiHint = present === 'emoji' && SF.emojiHelp ? SF.emojiHelp(slide).hint : '';
    var defReading = present === 'definition' &&
      (opts.definitionPhase || 'reading') === 'reading';
    if (emojiHint) {
      var hintRow = el('div', 'q qhint');
      hintRow.appendChild(el('span', 'qhint-label', 'HINT'));
      hintRow.appendChild(el('strong', null, emojiHint));
      head.appendChild(hintRow);
    } else if (defReading) {
      head.appendChild(el('div', 'q q-ask',
        'Read carefully. The passage will clear for the recall question.'));
    } else if (title) {
      head.appendChild(el('div', 'q q-ask', title));
    }

    /* Where the question goes depends on the image layout, so the header is
       built first and placed below rather than appended straight away. */
    var pic = String(slide.image || '').trim();
    var picLayout = pic ? (slide.imageLayout || 'band') : null;
    var media = null;

    if (pic) {
      media = el('div', 'qmedia');
      var pimg = document.createElement('img');
      pimg.src = slide.image;
      pimg.alt = slide.imageAlt || '';
      /* A broken URL should not leave a gap where the picture should be — and
         once it has collapsed the slide should re-fit as though there were no
         image at all, so the question gets its full height budget back. */
      pimg.onerror = function () {
        media.classList.add('broken');
        var root = media.closest ? media.closest('.slide') : null;
        if (!root) return;
        root.classList.remove('has-media');
        root.classList.add('media-band');       // fall back to the plain stack
        root.classList.remove('media-overlay', 'media-first');
        if (media.contains(head)) pad.insertBefore(head, pad.firstChild);
        try {
          if (SF.Player && SF.Player.fitQuizSlide && root.parentNode) {
            SF.Player.fitQuizSlide(root);
          }
        } catch (e) { /* editor preview has no player attached */ }
      };
      media.appendChild(pimg);
      pad.parentNode.classList.add('has-media', 'media-' + picLayout);
    }

    if (picLayout === 'overlay' && media) {
      media.appendChild(head);
      pad.appendChild(media);
    } else if (picLayout === 'first' && media) {
      pad.insertBefore(head, pad.firstChild);
      if (head.nextSibling) pad.insertBefore(media, head.nextSibling);
      else pad.appendChild(media);
    } else {
      /* Heading first — above any stage hero — so every game shares one title row. */
      pad.insertBefore(head, pad.firstChild);
      if (media) pad.appendChild(media);
    }

    if (slide.timeLimit > 0) {
      var clock = el('div', 'clock');
      clock.appendChild(ring(84, 8, 1));
      clock.appendChild(el('div', 'n', String(slide.timeLimit)));
      pad.parentNode.appendChild(clock);
      // the clock floats over the slide, so the question has to keep clear of it
      pad.parentNode.classList.add('has-clock');
    }

    var opts_ = (slide.options || []).filter(function (o) { return String(o).trim(); });
    var why = String(slide.explanation || '').trim();
    var inlineWhy = why && slide.explainStyle !== 'slide';
    if (inlineWhy) pad.parentNode.classList.add('has-why');

    /* The reasoning box, expanded inside whichever answer box is the right
       one. Shared by both input kinds — a typed question has exactly one. */
    function whyBox() {
      var box = el('span', 'why');
      why.split(/\n{2,}/).forEach(function (para) {
        if (!para.trim()) return;
        box.appendChild(el('span', 'p', para.trim()));
      });
      if (slide.source) box.appendChild(el('span', 'src', slide.source));
      /* Long text steps down rather than pushing the other answers off. */
      box.dataset.len = why.length > 320 ? 'xl' : why.length > 170 ? 'lg' : 'md';
      return box;
    }

    /* Host-judged / oracy / boards: verdict strip, not an A–D quiz grid. */
    var judgePresents = {
      claim: 1, memorymatch: 1, knowledge: 1, headsup: 1, spin: 1, connection: 1, chain: 1,
      challenge: 1, bowl: 1
    };
    if (judgePresents[present] && slide.input === 'choice') {
      appendJudgeStrip(pad, slide, opts, inlineWhy, whyBox);
      return;
    }

    /* Compare & Contrast: wall-led discuss — no A–D options or vote tally. */
    if (present === 'compare') return;

    /* Neither a typed nor a slider question has options to lay out. Each gets
       one answer box, so every measure-and-fit rule, the inline explanation
       and the reveal styling all apply unchanged — and, in a live room, that
       box holds back the answer until the reveal, or the room reads it off
       the wall. */
    /* An ordering. The wall shows the items so the room can argue about them,
       but never in the authored sequence before the reveal — that would put
       the answer on the screen while everyone is still deciding. The display
       shuffle is derived from the slide id, so it is the same on every repaint
       and the same on a rejoin, without being the answer. */
    if (slide.input === 'order') {
      pad.parentNode.classList.add('is-order');
      var showing = (slide.options || []).map(function (text, i) { return { i: i, text: text }; });
      if (!opts.revealed) showing = stableShuffle(showing, slide.id);
      else showing.sort(function (a, b) { return a.i - b.i; });
      var ow = el('div', 'opts stack ordered');
      showing.forEach(function (item, pos) {
        var row = el('button', 'opt' + (opts.revealed ? ' correct' : ''));
        row.type = 'button';
        row.dataset.choice = String(item.i);
        row.classList.add('locked');          // the wall is never the input
        var line = el('span', 'opt-line');
        /* Numbered only once the order is settled: a number against an item
           before the reveal reads as a position the room has been given. */
        line.appendChild(el('span', 'key', opts.revealed ? String(pos + 1) : '\u2195'));
        line.appendChild(el('span', 'txt', item.text));
        row.appendChild(line);
        ow.appendChild(row);
      });
      pad.appendChild(ow);
      var ol = el('div', 'typedlist');
      ol.appendChild(el('div', 'typedcount', ''));
      pad.appendChild(ol);
      if (inlineWhy) pad.appendChild(whyBox());
      return;
    }

    if (slide.input === 'text' || slide.input === 'number') {
      var placing = slide.input === 'number';
      var defPhaseNow = present === 'definition'
        ? (opts.definitionPhase || 'reading') : null;
      /* During reading the answer box stays off — phones are idle and the
         room is studying the passage, not typing yet. */
      if (defPhaseNow === 'reading') {
        var wait = el('div', 'definition-wait');
        wait.appendChild(el('strong', null,
          opts.live
            ? 'Phones stay closed until the passage clears.'
            : 'Answers open when the passage clears.'));
        pad.appendChild(wait);
        return;
      }
      pad.parentNode.classList.add('is-typed');
      /* On a question whose answer *is* the puzzle, the box stays shut until
         it is revealed whether or not phones are in the room. It used to hold
         only while hosting, so a teacher running emoji guess straight from
         Present — no phones, the room shouting — had the answer on the wall
         from the moment the slide arrived. */
      var hold = !opts.revealed && (opts.live || slide.hideAnswerUntilReveal === true);
      var tw = el('div', 'opts stack typed');
      var ab = el('button', 'opt answer');
      ab.type = 'button';
      ab.dataset.choice = '0';
      if (!opts.interactive) ab.classList.add('locked');
      if (hold) ab.classList.add('held');
      var aline = el('span', 'opt-line');
      aline.appendChild(el('span', 'key', placing ? '↔' : '✎'));
      aline.appendChild(el('span', 'txt', hold
        ? (opts.live
          ? (placing ? 'Placing their answers…' : 'Typing on your phones…')
          : 'Hidden until you reveal it')
        : (slide.answer || ' ')));
      aline.appendChild(el('span', 'tick', '✓'));
      ab.appendChild(aline);
      if (inlineWhy) ab.appendChild(whyBox());
      tw.appendChild(ab);
      pad.appendChild(tw);

      /* Where a choice question puts its bars. Before the reveal it is a
         count; after it, what the room actually answered. */
      var tl = el('div', 'typedlist');
      tl.appendChild(el('div', 'typedcount', ''));
      if (placing) {
        /* The line is drawn now, but the band the answer sits in is not:
           where the answer is has to stay off the wall until the reveal, and
           a shaded band would give it away as surely as the number would. */
        tl.appendChild(numberLine(slide));
      } else {
        tl.appendChild(el('div', 'typedgroups'));
      }
      pad.appendChild(tl);
      return;
    }

    var wrap = el('div', 'opts' +
      (present === 'truefalse' ? ' tf-duo' :
        present === 'oddone' ? ' odd-grid' :
        (opts_.length > 4 || opts_.some(longOption) ? ' stack' : '')) +
      (present === 'speed' ? ' speed-opts' : '') +
      (present === 'spoterror' ? ' spot-opts' : '') +
      (present === 'predict' ? ' predict-opts' : ''));
    opts_.forEach(function (text, i) {
      var b = el('button', 'opt');
      b.type = 'button';
      b.dataset.choice = String(i);
      /* Odd One Out: tiles are for looking at, not scoring. Always locked
         on the wall — discussion is oral; Reveal paints the prepared odd one. */
      if (!opts.interactive || present === 'oddone') b.classList.add('locked');
      if (present === 'oddone' && opts.revealed && i === slide.correct) {
        b.classList.add('odd-marked');
      }

      var line = el('span', 'opt-line');
      if (present === 'oddone') {
        /* No A–D keys — four equals until reveal. */
        line.appendChild(el('span', 'txt', text));
        if (opts.revealed) {
          line.appendChild(el('span', 'tick', i === slide.correct ? 'odd one' : ''));
        }
      } else {
        line.appendChild(el('span', 'key', LETTERS[i] || String(i + 1)));
        line.appendChild(el('span', 'txt', text));
        line.appendChild(el('span', 'tick', i === slide.correct ? '✓' : '✗'));
      }
      b.appendChild(line);

      if (inlineWhy && i === slide.correct) b.appendChild(whyBox());
      wrap.appendChild(b);
    });
    pad.appendChild(wrap);

    if (present === 'oddone' && !opts.revealed) {
      pad.appendChild(el('p', 'oddone-discuss',
        'Discuss: which does not belong, and what is the rule? Reveal when you are ready.'));
    }

    /* No vote tally for discuss-only Odd One Out. */
    if (present === 'oddone') return;

    var tally = el('div', 'tally');
    opts_.forEach(function (_, i) {
      var col = el('div', 'col' + (i === slide.correct ? ' right' : ''));
      var bar = el('div', 'bar');
      bar.style.height = '0px';
      col.appendChild(bar);
      col.appendChild(el('div', 'cnt', '0'));
      tally.appendChild(col);
    });
    pad.appendChild(tally);
    /* How many are in, on the wall. The bars say what the room chose but not
       whether anyone is still thinking, and that was only ever announced as
       "Maya answered" notes in the score rail — a stream of names that pushed
       the scores down the column a row at a time. One number instead, in the
       place everyone is already looking. A typed question has had this all
       along; there was no reason a choice question should not. */
    pad.appendChild(el('div', 'answered-count', ''));
  }

  function longOption(t) { return String(t).length > 42; }

  function layoutResults(slide, pad, opts) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));

    var marks = opts.marks || [];
    if (!marks.length) {
      pad.appendChild(el('div', 'none', 'Answer the quiz slides during the show and the score lands here.'));
      return;
    }

    var right = marks.filter(function (m) { return m.correct; }).length;
    var pct = Math.round((right / marks.length) * 100);

    var hero = el('div', 'score-hero');
    var donut = el('div', 'donut');
    donut.appendChild(ring(260, 22, right / marks.length));
    var mid = el('div', 'mid');
    var box = el('div');
    box.appendChild(el('div', 'pct', pct + '%'));
    box.appendChild(el('div', 'of', right + ' of ' + marks.length + ' correct'));
    mid.appendChild(box);
    donut.appendChild(mid);
    hero.appendChild(donut);

    var bd = el('div', 'breakdown');
    marks.slice(0, 7).forEach(function (m, i) {
      var row = el('div', 'row ' + (m.correct ? 'ok' : 'no'));
      row.appendChild(el('div', 'qi', 'Q' + (i + 1)));
      row.appendChild(el('div', 'qt', m.question || ''));
      row.appendChild(el('div', 'mk', m.correct ? '✓' : '✗'));
      bd.appendChild(row);
    });
    if (marks.length > 7) {
      bd.appendChild(el('div', 'row', '+ ' + (marks.length - 7) + ' more'));
    }
    hero.appendChild(bd);
    pad.appendChild(hero);
  }

  /* One thing matters more than the rest of the slide, so it is set at a size
     nothing else on the slide competes with, and everything else is demoted to
     support it. Every other bullet layout gives its points equal weight, which
     is right when they are equal and wrong for a deadline, a threshold or the
     one rule the room has to leave with.

     `body` carries the fact and `subtitle` labels it, because a bare number is
     not a fact — "12:00" means nothing without "Canvas deadline" above it. */
  function layoutKeyFact(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var hero = el('div', 'keyfact');
    if (slide.subtitle) hero.appendChild(rich('div', 'keyfact-label', slide, 'subtitle', slide.subtitle));
    hero.appendChild(rich('div', 'keyfact-value', slide, 'body', slide.body || ''));
    /* The fact is never a build step. It is the reason the slide exists, so it
       is on screen the moment the slide is, and the supporting points arrive
       after it if the author is revealing them one at a time. */
    pad.appendChild(hero);
    var points = (slide.bullets || []).filter(function (b) { return String(b || '').trim(); });
    if (points.length) {
      var ul = el('ul', 'keyfact-notes');
      points.forEach(function (b, i) {
        ul.appendChild(asStep(rich('li', null, slide, 'bullets.' + i, b), slide));
      });
      pad.appendChild(ul);
    }
  }

  /* ------------------------------------------------------------ infographic */

  /* Shared plumbing for the four infographic shapes. Every one is a heading,
     an optional context line, and one pit per element read through
     SF.parseInfoLine (label · value · note). An empty slide shows the same
     dim prompt the other bullet layouts do, so a fresh slide never looks
     like a rendering failure. */
  function infoItems(slide) {
    return (slide.bullets || []).map(function (text, index) {
      var p = SF.parseInfoLine(text);
      return { label: p.label, value: p.value, note: p.note, index: index, empty: !(p.label || p.value || p.note) };
    }).filter(function (it) { return !it.empty; });
  }
  function infoHead(slide, pad, contextCls) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    if (slide.subtitle) pad.appendChild(rich('div', contextCls, slide, 'subtitle', slide.subtitle));
  }
  function infoEmpty(pad, what) {
    pad.appendChild(el('p', 'dim info-empty', 'Add ' + what + ' in the inspector'));
  }
  /* Progress needs a number and a ceiling. The ceiling is the largest value on
     the slide unless the value already reads as a percentage, when 100 wins —
     "92%" beside "48%" should not draw the 92 as a full ring. */
  function infoScale(items) {
    var nums = items.map(function (it) { return SF.infoNumber(it.value); }).filter(function (n) { return isFinite(n) && n >= 0; });
    var pct = items.some(function (it) { return /%/.test(it.value); });
    var max = nums.length ? Math.max.apply(null, nums) : 0;
    return pct ? Math.max(100, max) : max;
  }

  /* Big numbers in a grid. Three to six tiles; each says one figure and what
     it is. design.statStyle:
       tile (default)  the figure set large over its label
       ring            a conic ring filled to the figure's share of the scale
       bar             a horizontal bar under the figure — a KPI card */
  function layoutStats(slide, pad) {
    infoHead(slide, pad, 'info-context');
    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'stats');
    var style = (slide.design || {}).statStyle;
    style = style === 'ring' || style === 'bar' ? style : 'tile';
    var grid = el('div', 'stats-grid stats-' + style + ' stats-n' + Math.min(items.length, 6));
    grid.setAttribute('role', 'list');
    var scale = infoScale(items);
    items.forEach(function (it) {
      var tile = asStep(el('div', 'stat'), slide);
      tile.setAttribute('role', 'listitem');
      var n = SF.infoNumber(it.value);
      var share = scale > 0 && isFinite(n) ? Math.max(0, Math.min(1, n / scale)) : 0;
      tile.style.setProperty('--share', String(share));
      var value = rich('div', 'stat-value', slide, 'bullets.' + it.index, it.value || it.label);
      if (style === 'ring') {
        var ring = el('div', 'stat-ring');
        ring.setAttribute('aria-hidden', 'true');
        ring.appendChild(value);
        tile.appendChild(ring);
      } else {
        tile.appendChild(value);
      }
      if (style === 'bar') {
        var track = el('div', 'stat-track');
        track.setAttribute('aria-hidden', 'true');
        track.appendChild(el('div', 'stat-fill'));
        tile.appendChild(track);
      }
      if (it.value && it.label) tile.appendChild(el('div', 'stat-label', it.label));
      if (it.note) tile.appendChild(el('div', 'stat-note', it.note));
      grid.appendChild(tile);
    });
    pad.appendChild(grid);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* What you see, and the mass under it.

     Every other infographic here lays its parts out as peers — side by side,
     along a track, down a funnel — which is an argument that they are
     comparable. This one is for the opposite shape: a small visible fact
     sitting on top of something larger that is deliberately out of view.

     The subtitle is the part above the waterline, because that is the thing
     the room already believes. The pits are what is underneath, and they get
     WIDER as they get deeper — so by the time the last one lands, the shape
     has already made the point the words are about to make.

     Progressive by default (see makeSlide). A class that meets the whole mass
     at once has been told something; a class that meets it a layer at a time
     is still guessing how far down it goes, which is the only part of this
     that teaches. */
  function layoutIceberg(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'what is underneath');

    var berg = el('div', 'berg');

    var tip = el('div', 'berg-tip');
    tip.appendChild(rich('div', 'berg-seen', slide, 'subtitle', slide.subtitle || 'What you see'));
    berg.appendChild(tip);

    var line = el('div', 'berg-line');
    line.setAttribute('aria-hidden', 'true');
    berg.appendChild(line);

    var mass = el('ol', 'berg-mass');
    var n = items.length;
    items.forEach(function (it, i) {
      var band = asStep(el('li', 'berg-band'), slide);
      /* 60% to 94%. Not from zero: a first band much narrower than the tip
         reads as a stalactite rather than a mass, and the label has to fit.
         Not to 100% either — the widest band needs to stop short of the pad
         edge or it reads as a full-bleed strip rather than the bottom of a
         shape, and a long value has nowhere to go. */
      band.style.setProperty('--w', (n === 1 ? 94 : 60 + 34 * (i / (n - 1))).toFixed(1) + '%');
      band.style.setProperty('--depth', String(i));
      var copy = el('div', 'berg-copy');
      copy.appendChild(rich('strong', 'berg-label', slide, 'bullets.' + it.index, it.label));
      if (it.note) copy.appendChild(el('span', 'berg-note', it.note));
      band.appendChild(copy);
      if (it.value) band.appendChild(el('span', 'berg-value', it.value));
      mass.appendChild(band);
    });
    berg.appendChild(mass);
    pad.appendChild(berg);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* A continuum with named ends, and things placed along it.

     The pit's value is a POSITION, not a magnitude — which is the one thing
     an author has to be told, because every other info layout reads it as a
     size. Numbers are taken on whatever scale they are already in: 0-100 if
     any value exceeds 5, otherwise 1-5, so "3" out of a five-point scale and
     "60" out of a hundred both land in the middle without a setting. */
  function layoutSpectrum(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'things to place');

    var ends = SF.parseInfoLine(slide.subtitle || '');
    var lowLabel = ends.label || 'One end';
    var highLabel = ends.value || 'The other';

    var nums = items.map(function (it) { return SF.infoNumber(it.value); });
    var top = nums.some(function (n) { return isFinite(n) && n > 5; }) ? 100 : 5;
    var base = top === 100 ? 0 : 1;

    var wrap = el('div', 'spectrum');
    var axis = el('div', 'spec-axis');
    axis.setAttribute('aria-hidden', 'true');
    wrap.appendChild(axis);

    var ticks = el('div', 'spec-ends');
    ticks.appendChild(el('span', 'spec-end', lowLabel));
    ticks.appendChild(el('span', 'spec-end spec-end-hi', highLabel));
    wrap.appendChild(ticks);

    var marks = el('ol', 'spec-marks');
    items.forEach(function (it) {
      var n = SF.infoNumber(it.value);
      /* A pit with no number has no position, so it is listed off the line
         rather than dropped at zero — which would be a claim. */
      var placed = isFinite(n);
      var pct = placed ? Math.max(0, Math.min(100, ((n - base) / (top - base)) * 100)) : 0;
      var mark = asStep(el('li', 'spec-mark' + (placed ? '' : ' spec-unplaced')), slide);
      mark.style.setProperty('--at', pct.toFixed(1) + '%');
      var dot = el('span', 'spec-dot');
      dot.setAttribute('aria-hidden', 'true');
      mark.appendChild(dot);
      var copy = el('span', 'spec-copy');
      copy.appendChild(rich('strong', 'spec-label', slide, 'bullets.' + it.index, it.label));
      if (it.note) copy.appendChild(el('span', 'spec-note', it.note));
      mark.appendChild(copy);
      marks.appendChild(mark);
    });
    wrap.appendChild(marks);
    pad.appendChild(wrap);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* A claim, and what is behind it.

     The title is the assertion, set as a quotation because that is what it is.
     Each pit is one dimension of provenance — who, when, what it rests on,
     what it leaves out — and they build, so the claim can be taken apart in
     front of the room rather than arriving pre-demolished. */
  function layoutSourceCheck(slide, pad) {
    var claim = el('blockquote', 'claim-quote');
    claim.appendChild(rich('p', null, slide, 'title', slide.title || 'The claim'));
    pad.appendChild(claim);
    if (slide.subtitle) pad.appendChild(rich('div', 'info-context', slide, 'subtitle', slide.subtitle));

    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'what is behind it');

    var list = el('dl', 'claim-rows');
    items.forEach(function (it) {
      var row = asStep(el('div', 'claim-row'), slide);
      row.appendChild(rich('dt', 'claim-key', slide, 'bullets.' + it.index, it.label || '—'));
      var dd = el('dd', 'claim-val', it.value);
      if (it.note) dd.appendChild(el('span', 'claim-note', it.note));
      row.appendChild(dd);
      list.appendChild(row);
    });
    pad.appendChild(list);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* "8 million" is 8000000, not 8.

     SF.infoNumber reads the leading numeral and stops, which is exactly right
     for "92%" or "4.6 / 5" and wrong for every large number a person writes by
     hand. A then/now/next of 500,000 and "8 million" came out as a full-height
     bar next to a stub, labelled -100% — a shape that states the opposite of
     the data it was given, which is worse than drawing nothing.

     Deliberately local rather than a fix to SF.infoNumber: the funnel and the
     stat rings scale by that function too, and changing what it returns under
     existing decks is a separate decision from adding this layout.

     A trailing word that is not a magnitude is a unit — "5 cars", "8 lifetimes"
     — so the number stands as written. */
  var MAGNITUDES = {
    k: 1e3, thousand: 1e3, thousands: 1e3,
    m: 1e6, mn: 1e6, million: 1e6, millions: 1e6,
    bn: 1e9, billion: 1e9, billions: 1e9,
    tn: 1e12, trillion: 1e12, trillions: 1e12
  };
  function magnitudeNumber(value) {
    var raw = String(value == null ? '' : value).trim();
    var m = raw.match(/(-?[\d][\d,.]*)\s*([a-zA-Z]+)?/);
    if (!m) return NaN;
    var n = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(n)) return NaN;
    var word = String(m[2] || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(MAGNITUDES, word) ? n * MAGNITUDES[word] : n;
  }

  /* One quantity across three or four moments, with the change worked out.

     A timeline answers "when". This answers "how much, and how much more" —
     and prints the multiple between each pair, because that is the number the
     room is computing in its head and the one it gets wrong. 500,000 to 8
     million is not "a rise", it is sixteenfold.

     A column with no number still draws: the last one is often the unknown,
     and "Next / ?" is the point of the slide rather than missing data. */
  function layoutShift(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    if (slide.subtitle) pad.appendChild(rich('div', 'info-context', slide, 'subtitle', slide.subtitle));
    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'moments');

    var nums = items.map(function (it) { return magnitudeNumber(it.value); });
    var known = nums.filter(function (n) { return isFinite(n) && n > 0; });
    var top = known.length ? Math.max.apply(null, known) : 0;

    var track = el('ol', 'shift-track shift-n' + Math.min(items.length, 4));
    items.forEach(function (it, i) {
      var step = asStep(el('li', 'shift-step'), slide);
      var n = nums[i];
      var known2 = isFinite(n) && n > 0;
      /* A floor of 8% so a small first value is still a visible block rather
         than a hairline — the shape has to read as "this one is small", not
         as "this one is missing". */
      var h = known2 && top > 0 ? Math.max(8, (n / top) * 100) : 0;
      var bar = el('div', 'shift-bar' + (known2 ? '' : ' shift-bar-unknown'));
      bar.style.setProperty('--h', h.toFixed(1) + '%');
      bar.setAttribute('aria-hidden', 'true');
      step.appendChild(bar);
      step.appendChild(el('div', 'shift-value', it.value || '?'));
      step.appendChild(rich('div', 'shift-label', slide, 'bullets.' + it.index, it.label));
      if (it.note) step.appendChild(el('div', 'shift-note', it.note));
      track.appendChild(step);

      /* The multiple, between this column and the last. Only where both are
         real and positive — a change from or to an unknown has no honest
         figure, and inventing one would be the fault this layout exists to
         correct. */
      if (i > 0 && isFinite(nums[i - 1]) && nums[i - 1] > 0 && known2) {
        var ratio = n / nums[i - 1];
        var text = ratio >= 2 ? '\u00d7' + (Math.round(ratio * 10) / 10)
          : (ratio > 1 ? '+' : '') + Math.round((ratio - 1) * 100) + '%';
        var gap = el('li', 'shift-gap' + (ratio < 1 ? ' shift-down' : ''));
        gap.appendChild(el('span', null, text));
        track.insertBefore(gap, step);
      }
    });
    pad.appendChild(track);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* Two images, one of them not real.

     The images come from the exploration block's before/after, which already
     holds two sources and two labels — no new field for a shape that already
     exists. `correct` says which one is genuine, 0 for the first.

     The verdict and the tells are steps, so the room votes into silence and
     then gets told. Revealing first teaches that deepfakes are detectable;
     making the room commit first teaches that they are not, which is the
     lesson the starter is actually for. */
  function layoutSpotFake(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var ex = slide.exploration || {};
    var names = SF.parseInfoLine(slide.subtitle || '');
    var labels = [names.label || 'A', names.value || 'B'];
    var srcs = [ex.before, ex.after];
    var real = Number(slide.correct) === 1 ? 1 : 0;

    var pair = el('div', 'fake-pair');
    srcs.forEach(function (src, i) {
      var fig = el('figure', 'fake-side');
      var shot = el('div', 'fake-shot' + (src ? '' : ' fake-shot-empty'));
      if (src) shot.style.backgroundImage = 'url("' + String(src).replace(/"/g, '&quot;') + '")';
      else shot.appendChild(el('span', null, 'Add image ' + labels[i]));
      fig.appendChild(shot);
      fig.appendChild(el('figcaption', 'fake-name', labels[i]));
      /* The verdict rides on the panel rather than in a line underneath, so
         at the back of a room the answer is a colour on a picture. */
      var verdict = asStep(el('div', 'fake-verdict ' + (i === real ? 'is-real' : 'is-fake')), slide);
      verdict.appendChild(el('span', null, i === real ? 'Real' : 'AI-generated'));
      fig.appendChild(verdict);
      pair.appendChild(fig);
    });
    pad.appendChild(pair);

    var tells = (slide.bullets || []).filter(function (b) { return String(b).trim(); });
    if (tells.length) {
      var ul = el('ul', 'fake-tells');
      tells.forEach(function (t, i) {
        ul.appendChild(asStep(rich('li', null, slide, 'bullets.' + i, t), slide));
      });
      pad.appendChild(ul);
    }
  }

  /* Two columns compared row by row. The subtitle names the columns
     ("Before | After"); each pit is either "left\tright" or
     "aspect\tleft\tright" when the row needs a label of its own. Rows build
     on Next, so the comparison can be argued one line at a time. */
  function layoutCompare(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var heads = SF.parseInfoLine(slide.subtitle || '');
    var left = heads.label || 'A', right = heads.value || 'B';
    var rows = (slide.bullets || []).map(function (text, index) {
      var p = SF.parseInfoLine(text);
      var labelled = !!p.note;
      return { aspect: labelled ? p.label : '', left: labelled ? p.value : p.label, right: labelled ? p.note : p.value, index: index };
    }).filter(function (r) { return r.aspect || r.left || r.right; });
    if (!rows.length) return infoEmpty(pad, 'rows to compare');
    var labelled = rows.some(function (r) { return r.aspect; });
    var table = el('div', 'compare' + (labelled ? ' compare-labelled' : ''));
    table.setAttribute('role', 'table');
    var head = el('div', 'compare-row compare-head');
    head.setAttribute('role', 'row');
    if (labelled) head.appendChild(el('div', 'compare-aspect', ''));
    head.appendChild(el('div', 'compare-cell compare-left', left)).setAttribute('role', 'columnheader');
    head.appendChild(el('div', 'compare-cell compare-right', right)).setAttribute('role', 'columnheader');
    table.appendChild(head);
    rows.forEach(function (r) {
      var row = asStep(el('div', 'compare-row'), slide);
      row.setAttribute('role', 'row');
      if (labelled) row.appendChild(el('div', 'compare-aspect', r.aspect)).setAttribute('role', 'rowheader');
      row.appendChild(el('div', 'compare-cell compare-left', r.left)).setAttribute('role', 'cell');
      row.appendChild(el('div', 'compare-cell compare-right', r.right)).setAttribute('role', 'cell');
      table.appendChild(row);
    });
    pad.appendChild(table);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* Stages that narrow. Each band is a little narrower than the one above,
     and if the values are numbers the widths follow them, so 1,200 → 300 →
     40 draws as the cliff it is rather than a polite staircase.
     design.funnelDirection === 'up' flips it into a pyramid. */
  function layoutFunnel(slide, pad) {
    infoHead(slide, pad, 'info-context');
    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'stages');
    var up = (slide.design || {}).funnelDirection === 'up';
    var list = el('ol', 'funnel' + (up ? ' funnel-up' : ''));
    var nums = items.map(function (it) { return SF.infoNumber(it.value); });
    var numeric = nums.every(function (n) { return isFinite(n) && n >= 0; }) && Math.max.apply(null, nums) > 0;
    var top = numeric ? Math.max.apply(null, nums) : 0;
    var n = items.length;
    items.forEach(function (it, i) {
      /* Widths run 100% → 40%. Numeric data maps each band's share of the
         largest stage onto that range, so the smallest stage still has room
         for its label and 310 → 190 → 160 stay visibly different rather than
         all hitting the same floor. */
      var w = numeric ? 0.4 + 0.6 * (nums[i] / top) : 1 - (i / Math.max(1, n - 1)) * 0.6;
      var band = asStep(el('li', 'funnel-band'), slide);
      band.style.setProperty('--w', (w * 100).toFixed(1) + '%');
      var copy = el('div', 'funnel-copy');
      copy.appendChild(rich('strong', 'funnel-label', slide, 'bullets.' + it.index, it.label));
      if (it.note) copy.appendChild(el('span', 'funnel-note', it.note));
      band.appendChild(copy);
      if (it.value) band.appendChild(el('span', 'funnel-value', it.value));
      list.appendChild(band);
      /* The drop, named. A funnel's bands encode what is LEFT at each stage,
         and the number every reader is actually computing in their head is
         what went missing between two of them — 120 to 48 is -60%. Printing
         it is the difference between a shape that suggests a loss and a figure
         that states one.

         Only where both stages are real numbers and the value fell: a stage
         that grew, or a stage labelled "most of them", has no honest
         percentage and gets nothing rather than a guess. */
      if (numeric && i > 0 && nums[i - 1] > 0 && nums[i] < nums[i - 1]) {
        var drop = Math.round((1 - nums[i] / nums[i - 1]) * 100);
        if (drop >= 1) {
          var tag = el('li', 'funnel-drop');
          tag.setAttribute('aria-hidden', 'true');
          tag.appendChild(el('span', null, '\u2212' + drop + '%'));
          list.insertBefore(tag, band);
        }
      }
    });
    pad.appendChild(list);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /* Dated events along a track. Horizontal by default — markers on one rail,
     dates above, events below, alternating so six entries fit. Vertical
     (design.timelineMode === 'vertical') is the long-form: a spine down the
     left with each event as a paragraph, for when the detail matters more
     than the sweep. */
  function layoutTimeline(slide, pad) {
    infoHead(slide, pad, 'info-context');
    var items = infoItems(slide);
    if (!items.length) return infoEmpty(pad, 'events');
    var vertical = (slide.design || {}).timelineMode === 'vertical';
    var track = el('ol', 'timeline ' + (vertical ? 'timeline-vertical' : 'timeline-horizontal') + ' timeline-n' + Math.min(items.length, 8));
    items.forEach(function (it, i) {
      var ev = asStep(el('li', 'timeline-event' + (i % 2 ? ' timeline-alt' : '')), slide);
      var dot = el('span', 'timeline-dot');
      dot.setAttribute('aria-hidden', 'true');
      ev.appendChild(dot);
      var copy = el('div', 'timeline-copy');
      if (it.label) copy.appendChild(el('time', 'timeline-date', it.label));
      copy.appendChild(rich('strong', 'timeline-title', slide, 'bullets.' + it.index, it.value || ''));
      if (it.note) copy.appendChild(el('span', 'timeline-note', it.note));
      ev.appendChild(copy);
      track.appendChild(ev);
    });
    pad.appendChild(track);
    if (slide.body) pad.appendChild(rich('div', 'info-takeaway', slide, 'body', slide.body));
  }

  /**
   * Code viewer — projector shows source; Present can typewrite it.
   * Not an editor: the wall never accepts keystrokes into the code.
   */
  /* ------------------------------------------------ code colouring

     A tokeniser rather than a highlighter dependency. The class on the <code>
     element has said language-python since the layout landed — the hook Prism
     and highlight.js look for — but nothing ever tokenised it, so every
     keyword, string and comment arrived in one colour and a slide of code
     read as a slab.

     Why not the library: this app installs nothing at runtime (npm ci
     --omit=dev finds zero dependencies) and has to open from a file:// copy,
     so a CDN script is out and a vendored one would be among the largest
     files in the repo — to colour three languages whose input we control.
     The same argument already produced a hand-rolled QR encoder and a
     hand-rolled WebSocket relay.

     What it is not: a parser. It cannot tell a dict from a set and does not
     try. It has to be right about comments, strings and keywords on teaching
     snippets, and wrong only in ways nobody notices. */

  var CODE_KEYWORDS = {
    python: ('and as assert async await break class continue def del elif else except ' +
      'finally for from global if import in is lambda nonlocal not or pass raise ' +
      'return try while with yield None True False self').split(' '),
    javascript: ('async await break case catch class const continue default delete do ' +
      'else export extends finally for function if import in instanceof let new of ' +
      'return static super switch this throw try typeof var void while yield ' +
      'null true false undefined').split(' ')
  };

  var CODE_STRING_RE = new RegExp(
    '^(?:[fFrRbBuU]{0,2})(?:' +
    '"""[\\s\\S]*?"""' + '|' +
    "'''[\\s\\S]*?'''" + '|' +
    '"(?:\\\\.|[^"\\\\\\n])*"?' + '|' +
    "'(?:\\\\.|[^'\\\\\\n])*'?" + '|' +
    '`(?:\\\\.|[^`\\\\])*`?' +
    ')'
  );

  /* Ordered on purpose: whichever pattern starts earliest wins, so a comment
     or a string swallows anything that looks like syntax inside it. That
     ordering is the whole correctness argument. */
  function codeTokens(src, lang) {
    var kw = {};
    (CODE_KEYWORDS[lang] || []).forEach(function (w) { kw[w] = true; });
    var out = [];
    var i = 0;

    function push(cls, text) {
      if (!text) return;
      var last = out[out.length - 1];
      if (last && last.cls === cls) last.text += text;   // fewer spans to paint
      else out.push({ cls: cls, text: text });
    }

    while (i < src.length) {
      var rest = src.slice(i);
      var m;

      if (lang === 'python' && rest.charAt(0) === '#') {
        m = /^[^\n]*/.exec(rest) || [''];
        push('com', m[0]); i += m[0].length; continue;
      }
      if (lang === 'javascript' && rest.slice(0, 2) === '//') {
        m = /^[^\n]*/.exec(rest) || [''];
        push('com', m[0]); i += m[0].length; continue;
      }
      if (lang === 'javascript' && rest.slice(0, 2) === '/*') {
        var close = rest.indexOf('*/');
        var block = close < 0 ? rest : rest.slice(0, close + 2);
        push('com', block); i += block.length; continue;
      }

      m = CODE_STRING_RE.exec(rest);
      if (m && m[0].length) { push('str', m[0]); i += m[0].length; continue; }

      m = /^(?:0[xX][0-9a-fA-F]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(rest);
      if (m) { push('num', m[0]); i += m[0].length; continue; }

      m = /^[A-Za-z_$][\w$]*/.exec(rest);
      if (m) {
        var word = m[0];
        if (kw[word]) push('kw', word);
        else if (/^\s*\(/.test(rest.slice(word.length))) push('fn', word);
        else push('', word);
        i += word.length; continue;
      }

      if (lang === 'python' && rest.charAt(0) === '@') {
        m = /^@[\w.]*/.exec(rest) || [''];
        push('fn', m[0]); i += m[0].length; continue;
      }

      push('', src.charAt(i)); i += 1;
    }
    return out;
  }

  /* Paint the first `budget` characters with every token's colour intact, so
     the typewriter types IN colour rather than colouring up at the end. */
  function paintCode(codeEl, tokens, budget) {
    codeEl.textContent = '';
    var used = 0;
    for (var t = 0; t < tokens.length && used < budget; t++) {
      var text = tokens[t].text;
      if (used + text.length > budget) text = text.slice(0, budget - used);
      used += text.length;
      if (!tokens[t].cls) codeEl.appendChild(document.createTextNode(text));
      else codeEl.appendChild(el('span', 'ct-' + tokens[t].cls, text));
    }
  }

  function layoutCode(slide, pad, opts, root) {
    opts = opts || {};
    var src = String(slide.code != null ? slide.code : (slide.body || ''));
    var lang = String(slide.language || 'python').toLowerCase();
    if (lang === 'js') lang = 'javascript';
    var label = lang === 'javascript' ? 'JavaScript'
      : lang === 'text' ? 'Text'
      : 'Python';
    var fileHint = lang === 'javascript' ? 'snippet.js'
      : lang === 'text' ? 'notes.txt'
      : 'snippet.py';

    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));

    var frame = el('div', 'code-frame');
    var chrome = el('div', 'code-chrome');
    chrome.appendChild(el('span', 'code-dots', ''));
    chrome.appendChild(el('span', 'code-filename', fileHint));
    chrome.appendChild(el('span', 'code-lang', label));
    frame.appendChild(chrome);

    /* Size follows the snippet, because the pane scrolls and a projector
       cannot be scrolled by the room. At 26px a fourteen-line cell ran off the
       bottom of the frame into an overflow nobody in the third row knew was
       there — the code was on the slide and unreadable at the same time.

       Bands rather than arithmetic: line height is 1.45, the frame gets what
       the pad has left after the heading, and these are the counts that fit
       it. Wide enough to stay legible from the back at every step. */
    /* Rows actually drawn, not newlines counted: every snippet ends in one, and
       counting it cost a whole band — fourteen rows were sized as if they were
       fifteen and still scrolled. */
    var rows = src.replace(/\n+$/, '').split('\n').length;
    /* The budget is the pane minus its own padding, which is what scrollHeight
       measures and the first cut of this missed: 409px of frame is 359px of
       text. At line-height 1.45 that is 10 rows at 24px, 12 at 19px and 15 at
       16px; the last band tightens the leading to reach 18. */
    var band = rows <= 10 ? '' : rows <= 12 ? ' code-lines-md'
      : rows <= 15 ? ' code-lines-lg' : ' code-lines-xl';
    var pre = el('pre', 'code-pane' + band);
    pre.setAttribute('aria-label', label + ' source');
    var codeEl = document.createElement('code');
    codeEl.className = 'language-' + lang;
    pre.appendChild(codeEl);
    frame.appendChild(pre);
    pad.appendChild(frame);

    /* text is terminal output and notes: no syntax to colour, and pretending
       otherwise would paint "which python" as a function call. */
    var tokens = lang === 'text' ? null : codeTokens(src, lang);
    var mode = slide.codeReveal === 'all' || slide.codeReveal === 'lines'
      ? slide.codeReveal
      : (slide.typewrite === false ? 'all' : 'type');

    /* Line by line uses the build machinery every other layout uses: one
       .step span per line, sorted by data-step, and js/teaching.js reveals
       them on Next exactly as it reveals bullets. No second mechanism, and
       Prev, the dim-past mode and the presenter's step counter all work
       without knowing this layout exists.

       Blank lines are never steps. They are spacing, and making a room press
       Next to receive an empty line is a way of losing it. */
    if (mode === 'lines') {
      var lineNo = 0;
      src.replace(/\n+$/, '').split('\n').forEach(function (line, idx, all) {
        var row = el('span', 'code-line');
        if (line.trim()) {
          row.classList.add('step');
          row.dataset.step = String(lineNo++);
        }
        if (tokens) paintCode(row, codeTokens(line, lang), line.length);
        else row.textContent = line;
        if (idx < all.length - 1) row.appendChild(document.createTextNode('\n'));
        codeEl.appendChild(row);
      });
      return;
    }

    var play = !!(opts.interactive && mode === 'type');
    if (!play) {
      if (tokens) paintCode(codeEl, tokens, src.length);
      else codeEl.textContent = src;
      return;
    }

    var speed = Math.max(8, Math.min(120, Number(slide.typeSpeed) || 55));
    var i = 0;
    var timer = null;
    var host = root || pre.closest('.slide') || pad.parentElement;
    var done = false;

    function paint() {
      if (tokens) paintCode(codeEl, tokens, i);
      else codeEl.textContent = src.slice(0, i);
      pre.classList.toggle('code-typing', !done && i < src.length);
      pre.classList.toggle('code-done', done || i >= src.length);
    }

    function finish() {
      if (done) return true;
      done = true;
      if (timer) { clearTimeout(timer); timer = null; }
      i = src.length;
      paint();
      if (host && host._codeTypewrite) host._codeTypewrite.busy = false;
      return true;
    }

    function tick() {
      if (done) return;
      if (i >= src.length) { finish(); return; }
      /* Light human jitter: slightly slower on newlines, faster on spaces. */
      var ch = src.charAt(i);
      i += 1;
      paint();
      var wait = speed;
      if (ch === '\n') wait = speed * 2.4;
      else if (ch === ' ' || ch === '\t') wait = speed * 0.55;
      else wait = speed * (0.75 + Math.random() * 0.6);
      timer = setTimeout(tick, wait);
    }

    paint();
    if (host) {
      host._codeTypewrite = {
        busy: src.length > 0,
        finish: finish,
        done: function () { return done || i >= src.length; }
      };
    }
    if (src.length) timer = setTimeout(tick, Math.max(120, speed * 2));
    else finish();
  }

  var LAYOUTS = {
    stats: layoutStats,
    compare: layoutCompare,
    funnel: layoutFunnel,
    iceberg: layoutIceberg,
    spectrum: layoutSpectrum,
    sourcecheck: layoutSourceCheck,
    shift: layoutShift,
    spotfake: layoutSpotFake,
    timeline: layoutTimeline,
    journey: layoutJourney,
    mindmap: layoutMindmap,
    orgchart: layoutOrg,
    introduction: layoutIntroduction,
    title: layoutTitle,
    section: layoutSection,
    statement: layoutStatement,
    content: layoutContent,
    cards: layoutContent,
    keyfact: layoutKeyFact,
    keywords: layoutKeywords,
    italics: layoutItalics,
    links: layoutLinks,
    split: layoutSplit,
    quote: layoutQuote,
    table: layoutTable,
    code: layoutCode,
    chart: layoutChart,
    image: layoutImage,
    gallery: layoutGallery,
    video: layoutVideo,
    quiz: layoutQuiz,
    explain: layoutExplain,
    results: layoutResults,
    game: layoutGame,
    join: layoutJoin
  };

  /* ------------------------------------------------------------ entry */

  /* A shuffle that is the same every time for the same slide.
     Math.random would reshuffle on every repaint — the items would jump
     around while the room was reading them — and a rejoining phone would see
     a different arrangement from the wall. */
  function stableShuffle(list, seed) {
    var out = list.slice();
    var h = 2166136261;
    var key = String(seed || '');
    for (var c = 0; c < key.length; c++) { h ^= key.charCodeAt(c); h = Math.imul(h, 16777619); }
    for (var i = out.length - 1; i > 0; i--) {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      var j = ((h >>> 0) % (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  var compositions = SF.createCompositionRenderer(SF, {
    el:el, rich:rich, asStep:asStep, layoutQuote:layoutQuote,
    layoutStatement:layoutStatement, appendSlideDate:appendSlideDate
  });

  /**
   * @param {object} deck
   * @param {object} slide
   * @param {object} [opts]  { index, total, interactive, quizNumber, marks, chrome }
   * @returns {HTMLElement} .slide element sized 1280x720
   */
  function renderSlide(deck, slide, opts) {
    opts = opts || {};
    var root = themedRoot('slide', deck, 'layout-' + slide.type, slide.type);
    root.dataset.slideId = slide.id;
    stampAspect(root, deck);
    if (slide.activity) {
      root.classList.add('activity-slide');
      var view = slide.activityPresentation;
      if (slide.type === 'keywords' && ['steps', 'panels', 'brief'].indexOf(view) >= 0 &&
          (view !== 'panels' || slide.bullets.length === 4)) root.classList.add('activity-' + view);
    }
    if (slide.type === 'quiz' || (SF.Boards && SF.Boards.forSlide(slide))) {
      root.classList.add('game-stage');
    }
    if (slide.feedback && slide.feedback.kind) root.classList.add('has-feedback');
    if (slide.type === 'title' || slide.type === 'section' || slide.type === 'statement') {
      /* Motion made out of the slide's own colours.
     
         A cover wants something moving behind it while a room settles, and the
         obvious way to get that is a video file — which is megabytes, is wrong
         the moment the theme changes, and has to be regenerated per palette.
         This draws the same thing from the theme tokens instead: the blobs are
         the background mixed towards the accent, so they cannot fight the text
         on any theme, including one somebody adds later. Nothing to download,
         nothing to keep in step.
     
         Under the theme art and under the pad, aria-hidden, no pointer events:
         it is a ground, not content. */
      var motion = backdropMotion(slide);
      if (motion) {
        var moves = el('div', 'slide-motion motion-' + motion);
        moves.setAttribute('aria-hidden', 'true');
        moves.innerHTML = '<span class="mo mo-1"></span><span class="mo mo-2"></span>' +
          '<span class="mo mo-3"></span>';
        root.appendChild(moves);
      }
    }
    // The manifest owns eligibility and decoration; deck text is always textContent.
    var spec = SF.THEMES[SF.resolveTheme(deck.theme)].art;
    if (spec && spec.layouts.includes(slide.type)) {
      var art = el('div', 'theme-art ' + spec.className);
      art.innerHTML = spec.html;
      if (spec.eyebrow) {
        var fields = spec.eyebrow[slide.type] || [];
        var line = fields.map(function(key){return String(deck[key] || '').trim();}).find(Boolean);
        if (line) art.appendChild(el('div', spec.eyebrow.className, line));
      }
      art.setAttribute('aria-hidden', 'true');
      root.appendChild(art);
    }
    /* Which of a theme's decorations a slide shows, as a number a stylesheet
       can switch on. Stamped on every slide rather than only the two
       full-bleed ones, because a theme may want quiet decoration on the
       layouts that carry an argument as well as loud decoration on the two
       that do not. Modulo four because that is how many objects each UKBT set
       has; a theme with fewer, or none, ignores it. */
    if (opts.index != null) {
      root.dataset.artIndex = String(opts.index % 4);
      /* Where it goes, kept on a different cycle from what it is. Four shapes
         against five positions means the pair does not repeat for twenty
         slides; on the same modulus, shape and corner would lock together and
         one object would only ever appear in one place. */
      root.dataset.artSlot = String(opts.index % 5);
    }

    var pad = el('div', 'pad');
    root.appendChild(pad);
    if (!compositions.render(deck, slide, pad, root) && (!SF.Boards || !SF.Boards.render(pad, slide, opts, root))) (LAYOUTS[slide.type] || layoutContent)(slide, pad, opts, root);
    compositions.apply(root, deck, slide);
    SF.declareBodyRegion(root,slide);
    if (SF.Explore) SF.Explore.render(root, pad, slide, opts);
    if (SF.Custom) SF.Custom.layout(root, slide);

    if (opts.chrome !== false && deck.showSlideNumbers && opts.index != null && slide.type !== 'title') {
      /* Counted over the running order, not the editor's rows. A deck with a
         hidden teacher page said "3 / 9" in the editor and "3 / 7" in Present
         — the same slide, two numbers, because the show has already dropped
         the hidden ones by the time it renders. The room's count is the true
         one, so the editor is made to agree with it rather than the reverse.
         Same reasoning as deckShowsLogo and the first shown slide. */
      var shown = (deck.slides || []).filter(function (x) { return !x.hidden; });
      var place = shown.indexOf(slide);
      var num = el('div', 'pagenum', place < 0
        ? (opts.index + 1) + ' / ' + opts.total
        : (place + 1) + ' / ' + shown.length);
      /* A composition with a closing rule takes the number onto it, rather
         than having the number guess where that rule is. Everything else
         keeps the corner it has always had. */
      (root.querySelector('.cp-footer') || root).appendChild(num);
    }
    if (opts.chrome !== false && SF.deckShowsLogo(deck, slide, opts.index)) {
      /* Said on the slide so layout can react to it. The corner mark is
         positioned absolutely, so a header sharing that corner has no way to
         know whether it is there — it used to hold 330px open on every slide
         and got an empty gap on the ones with no mark. */
      root.classList.add('has-corner-mark');
      var logo = el('div', 'slide-logo');
      var logoScale={small:36,medium:52,large:72}[deck.logoSize || 'medium'] || 52;
      logo.style.height=logoScale+'px';
      var img = document.createElement('img');
      img.src = deck.logo;
      img.alt = '';
      img.draggable = false;
      logo.appendChild(img);
      /* Three voices, narrowest wins. The slide knows about its own
         photograph, the deck knows about its own logo, and the theme knows
         which of its grounds are dark — so the slide overrides the deck, and
         the deck overrides the theme. */
      var ground = (slide.design || {}).logoGround;
      var reverse = deck.logoReverse;
      if (ground === 'dark') root.classList.add('logo-reverse');
      else if (ground === 'light') root.classList.add('logo-normal');
      else if (reverse === 'always') root.classList.add('logo-reverse');
      else if (reverse === 'never') root.classList.add('logo-normal');
      root.appendChild(logo);
    }
    SF.applyChromeRegions(root, slide, deck);
    if (opts.chrome !== false && opts.total > 1 && opts.index != null) {
      var track = el('div', 'track');
      var i = el('i');
      i.style.width = (((opts.index + 1) / opts.total) * 100).toFixed(2) + '%';
      track.appendChild(i);
      root.appendChild(track);
    }

    /* A timed activity gets the same countdown the quiz has. The quiz builds
       its own inside layoutQuiz, because there the clock has to clear the
       question block; anywhere else it can hang off the slide. Drawn whenever a
       time limit is set — including in the editor, where it shows the length
       you chose — and it is the player that makes it move. */
    if (slide.timeLimit > 0 && !root.querySelector('.clock')) {
      var timed = el('div', 'clock slide-clock');
      timed.appendChild(ring(84, 8, 1));
      timed.appendChild(el('div', 'n', clockFace(slide.timeLimit)));
      timed.setAttribute('aria-hidden', 'true');
      root.appendChild(timed);
      root.classList.add('has-clock');
    }

    /* The teacher's own control over the card. The clock turns it at zero, but
       a room that finishes early should not have to wait for a timer, and one
       that needs another minute should be able to turn it back. */
    if (root.querySelector('.flip') && !slide.modelAnswerDraft) {
      var swap = el('button', 'flip-toggle', '⇄');
      swap.type = 'button';
      swap.title = 'Show the model answer';
      swap.setAttribute('aria-label', 'Turn the card over to the model answer');
      swap.setAttribute('aria-expanded', 'false');
      swap.onclick = function (e) {
        e.stopPropagation();
        var on = root.classList.toggle('flipped');
        swap.title = on ? 'Back to the task' : 'Show the model answer';
        swap.setAttribute('aria-label', on ? 'Turn the card back to the task' : 'Turn the card over to the model answer');
        swap.setAttribute('aria-expanded', String(on));
      };
      root.appendChild(swap);
    }

    return root;
  }

  /** Scale a rendered .slide to fill `box` while keeping 16:9.
      The scale also goes into --sf-scale, which the transition keyframes
      multiply through so a slide keeps its size while it animates in.

      If the box has no size yet — an aspect-ratio box inside a flex column
      often measures 0 on the frame it is inserted — waiting for the layout
      matters: giving up would leave the slide at its full 1280x720 and
      spilling out of the box. */
  function fit(box, slideEl) {
    var bw = box.clientWidth, bh = box.clientHeight;
    if (!bw || !bh) {
      retryWhenSized(box, slideEl);
      return;
    }
    /* The element already carries its shape from renderSlide, so read it
         back rather than guessing which deck it came from. */
    var stamped = Number(String(slideEl.style.getPropertyValue('--slide-h') || '').replace('px', ''));
    var slideH = stamped > 0 ? stamped : SF.slideHeight(deckOf(slideEl));
    var scale = Math.min(bw / SF.SLIDE_W, bh / slideH);
    slideEl.style.setProperty('--sf-scale', String(scale));
    /* Also on the box, because the live overlays that sit beside the slide
       rather than inside it — the Q&A cue — have to keep clear of things
       measured in slide space, and cannot read a variable set on a sibling. */
    box.style.setProperty('--sf-scale', String(scale));
    slideEl.style.transform = 'scale(' + scale + ')';
    slideEl.style.left = ((bw - SF.SLIDE_W * scale) / 2) + 'px';
    slideEl.style.top = ((bh - slideH * scale) / 2) + 'px';
    slideEl.style.right = 'auto';
    slideEl.style.bottom = 'auto';
    slideEl.style.position = 'absolute';
  }

  function retryWhenSized(box, slideEl) {
    if (typeof ResizeObserver === 'undefined') {
      setTimeout(function () {
        if (slideEl.parentNode && box.clientWidth) fit(box, slideEl);
      }, 60);
      return;
    }
    if (box._sfObserver) box._sfObserver.disconnect();
    var ro = new ResizeObserver(function () {
      if (!slideEl.parentNode) { ro.disconnect(); box._sfObserver = null; return; }
      if (box.clientWidth && box.clientHeight) {
        ro.disconnect();
        box._sfObserver = null;
        fit(box, slideEl);
      }
    });
    box._sfObserver = ro;
    ro.observe(box);
  }

  /** Size a viewport box to the largest 16:9 rect fitting the window. */
  function letterbox(viewport) {
    var w = window.innerWidth, h = window.innerHeight;
    var inner = viewport.querySelector('.slide');
    var innerH = inner ? Number(String(inner.style.getPropertyValue('--slide-h') || '').replace('px', '')) : 0;
    var vh = innerH > 0 ? innerH : SF.slideHeight(deckOf(viewport));
    var scale = Math.min(w / SF.SLIDE_W, h / vh);
    viewport.style.width = Math.floor(SF.SLIDE_W * scale) + 'px';
    viewport.style.height = Math.floor(vh * scale) + 'px';
    return scale;
  }


  /* ----------------------------------------------------- a question, shown */

  /* One approved question, on the wall. Deliberately plain: it is somebody's
     question being taken seriously, not a data visualisation. */
  function questionCard(deck, item) {
    var node = themedRoot('slide', deck, 'layout-question', 'question');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'qc-label', 'From the room'));
    pad.appendChild(el('div', 'qc-text', item.text || ''));
    var foot = el('div', 'qc-foot');
    if (item.name) foot.appendChild(el('span', 'qc-who', item.name));
    if (item.votes > 1) {
      foot.appendChild(el('span', 'qc-votes', '▲ ' + item.votes + ' also asked this'));
    }
    pad.appendChild(foot);
    node.appendChild(pad);
    return node;
  }

  /* ------------------------------------------------- feedback, full screen */

  /**
   * The whole-screen version, for when the room's answers are the thing being
   * discussed rather than a sidebar to a slide. Same digest as the rail — only
   * the room it has to breathe in differs.
   */
  function feedbackFocus(deck, digest, opts) {
    opts = opts || {};
    var node = themedRoot('slide', deck, 'layout-feedback', 'feedback');
    var pad = el('div', 'pad');

    /* The room the poll is for is the room still arriving. The rail has said
       how to join for a while; full screen swallowed the whole wall and said
       nothing, so a phone that was not already in had no way back in without
       the teacher narrating the PIN. feedbackOpts already passes join — this
       only stopped throwing it away. */
    if (opts.join && opts.join.pin) {
      var jl = el('div', 'joinline fk-join');
      pad.appendChild(jl);
      paintJoinLine(jl, opts.join);
    }

    var head = el('div', 'fk-head');
    head.appendChild(el('div', 'fk-kind', opts.title || 'Feedback'));
    if (opts.subtitle) head.appendChild(el('div', 'fk-prompt', opts.subtitle));
    pad.appendChild(head);

    var body = el('div', 'fk-body');
    body.dataset.kind = (digest && digest.kind) || '';

    if (!digest || !digest.kind) {
      body.appendChild(el('div', 'fk-empty', 'Waiting for the room'));
    } else if (digest.kind === 'poll') {
      focusPoll(body, digest, opts);
    } else if (digest.kind === 'scale') {
      focusScale(body, digest, opts);
    } else if (digest.kind === 'wordcloud') {
      focusCloud(body, digest);
    } else {
      focusBrainstorm(body, digest);
    }
    pad.appendChild(body);

    var foot = el('div', 'fk-foot');
    foot.appendChild(el('span', null, opts.footnote || ''));
    if (opts.sample) foot.appendChild(el('span', 'fk-tag', 'SAMPLE'));
    /* Both keys get here and both leave, and a host who arrived with S should
       not be told the way out is a key they did not press. */
    else foot.appendChild(el('span', 'fk-hint', 'E or S to close'));
    pad.appendChild(foot);

    node.appendChild(pad);
    return node;
  }

  function focusPoll(body, digest, opts) {
    var counts = digest.counts || [];
    var labels = opts.options || [];
    var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
    var total = digest.total || 0;
    var lead = counts.indexOf(Math.max.apply(null, counts.concat([0])));

    counts.forEach(function (n, i) {
      var row = el('div', 'fk-poll' + (total && i === lead && n > 0 ? ' lead' : ''));
      row.appendChild(el('div', 'fk-plabel', labels[i] || 'Option ' + (i + 1)));
      var bar = el('div', 'fk-pbar');
      var fill = el('i');
      fill.style.width = ((n / max) * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      var num = el('div', 'fk-pnum');
      num.appendChild(el('span', 'fk-pn', String(n)));
      num.appendChild(el('span', 'fk-ppct', total ? Math.round((n / total) * 100) + '%' : '0%'));
      row.appendChild(num);
      body.appendChild(row);
    });
  }

  function focusCloud(body, digest) {
    var words = digest.words || [];
    if (!words.length) { body.appendChild(el('div', 'fk-empty', 'No words yet')); return; }
    var cloud = el('div', 'fk-cloud');
    var top = words[0].n;
    /* A wider size range than the rail can afford — this is the version worth
       actually looking at. */
    words.slice(0, 32).forEach(function (w) {
      var scale = 0.34 + 0.66 * (w.n / top);
      var chip = el('span', 'fk-word', w.text);
      chip.style.fontSize = 'calc(var(--fk-cloud) * ' + scale.toFixed(2) + ')';
      if (w.n > 1) chip.appendChild(el('sup', null, String(w.n)));
      cloud.appendChild(chip);
    });
    body.appendChild(cloud);
  }

  function focusBrainstorm(body, digest) {
    var items = digest.items || [];
    if (!items.length) { body.appendChild(el('div', 'fk-empty', 'Nothing yet')); return; }
    var grid = el('div', 'fk-cards');
    /* Two columns up to six cards, three beyond that — more than nine on
       screen at once stops being readable from the back. */
    grid.dataset.cols = items.length > 6 ? '3' : '2';
    items.slice(0, 9).forEach(function (it) {
      var card = el('div', 'fk-card');
      card.appendChild(el('div', 'fk-ctext', it.text));
      if (it.name) card.appendChild(el('div', 'fk-cwho', it.name));
      grid.appendChild(card);
    });
    body.appendChild(grid);
    if (items.length > 9) {
      body.appendChild(el('div', 'fk-more', '+ ' + (items.length - 9) + ' more not shown'));
    }
  }

  /**
   * Everything both feedback views need to label themselves, from the slide's
   * own feedback settings.
   *
   * One builder, because the rail, the focus view, the editor's preview of
   * each and the live host all have to agree. Building the labels separately
   * per call site is how the editor preview came to render a scale with no
   * ends on it — the same drift that hit question slides twice.
   *
   * @param {object} f slide.feedback
   * @returns {object} { title, subtitle, options, ends }
   */
  function feedbackViewOpts(f) {
    var kind = f && f.kind ? SF.FEEDBACK_KINDS[f.kind] : null;
    return {
      title: kind ? kind.label : 'Feedback',
      subtitle: f.prompt,
      /* A scale's points are generated from how many the author chose; what
         they name is the two ends. */
      options: f.kind === 'scale' ? SF.scaleLabels(f) : (f.options || []),
      ends: f.kind === 'scale' ? { low: f.lowLabel, high: f.highLabel } : null
    };
  }

  /* Plausible stand-in results, so the layout can be judged while authoring.
     Marked as a sample everywhere it is shown — it must never be mistaken for
     what the room actually said. */
  function sampleFeedbackDigest(f) {
    if (!f || !f.kind) return null;

    if (f.kind === 'poll') {
      var live = f.options.filter(function (o) { return String(o).trim(); });
      var weights = [7, 11, 4, 2, 5, 1];
      var counts = live.map(function (_, i) { return weights[i % weights.length]; });
      var total = counts.reduce(function (a, b) { return a + b; }, 0);
      return { kind: 'poll', counts: counts, total: total, answered: total, players: total, sample: true };
    }

    if (f.kind === 'scale') {
      /* Bunched towards the confident end with a couple of holdouts — the
         shape a real class produces, rather than a flat row of equal bars. */
      var shape = { 3: [2, 5, 9], 4: [2, 3, 7, 5], 5: [1, 2, 4, 7, 3],
        6: [1, 2, 3, 6, 4, 2], 7: [1, 1, 2, 4, 6, 3, 1] };
      var bars = shape[f.points] || shape[5];
      var seen = bars.reduce(function (a, b) { return a + b; }, 0);
      return { kind: 'scale', counts: bars, total: seen,
        answered: seen, players: seen + 3, sample: true };
    }

    if (f.kind === 'wordcloud') {
      return {
        kind: 'wordcloud',
        words: [
          { text: 'useful', n: 6 }, { text: 'tricky', n: 4 }, { text: 'clear', n: 3 },
          { text: 'fast', n: 2 }, { text: 'dense', n: 2 }, { text: 'new', n: 1 },
          { text: 'daunting', n: 1 }, { text: 'fair', n: 1 }
        ],
        total: 20, unique: 8, answered: 14, players: 18, sample: true
      };
    }

    return {
      kind: 'brainstorm',
      items: [
        { name: 'Ana', text: 'More worked examples in the seminars' },
        { name: 'Ben', text: 'A past paper walkthrough before the deadline' },
        { name: 'Priya', text: 'Share the slides the night before' },
        { name: 'Tom', text: 'Shorter reading list, more depth on each' }
      ],
      total: 4, answered: 4, players: 18, sample: true
    };
  }

  /* --------------------------------------------------- feedback rail */

  /* Same slot and geometry as the scoreboard — a presentation only ever needs
     one side panel, and reusing the shell means one scaling path. */
  function feedbackRail(deck) {
    var root = themedRoot('scorerail fbrail', deck);
    root.appendChild(el('div', 'rail-title', 'Feedback'));
    root.appendChild(el('div', 'rail-sub', ''));
    root.appendChild(el('div', 'rail-news'));
    /* Join sits above the body so an empty poll leaves the QR in the middle
       of the rail rather than a hollow stretch above the footer PIN. */
    root.appendChild(el('div', 'rail-join'));
    root.appendChild(el('div', 'fb-body'));
    var foot = el('div', 'foot');
    foot.appendChild(el('div', 'joinline'));
    foot.appendChild(el('div', 'notes', ''));
    root.appendChild(foot);
    return root;
  }

  function paintFeedbackRail(rail, digest, opts) {
    opts = opts || {};
    rail.querySelector('.rail-title').textContent = opts.title || 'Feedback';
    rail.querySelector('.rail-sub').textContent = opts.subtitle || '';
    rail.querySelector('.foot .notes').textContent = opts.footnote || '';
    paintJoinLine(rail.querySelector('.joinline'), opts.join);

    var busy = feedbackDigestBusy(digest);
    var joining = !!(opts.join && opts.join.pin);
    var slot = ensureRailJoin(rail);
    /* Roomy while nothing has come back — same idea as the empty scoreboard. */
    paintRailJoin(slot, opts.join, !busy);

    var body = rail.querySelector('.fb-body');
    body.textContent = '';
    rail.dataset.kind = (digest && digest.kind) || '';

    if (!busy) {
      if (opts.roster && opts.roster.length) paintFbRoster(body, opts.roster);
      else if (!joining) {
        body.appendChild(el('div', 'empty-rail', opts.emptyText || 'Waiting for the room'));
      }
      return;
    }

    if (digest.kind === 'poll') return paintPoll(body, digest, opts);
    if (digest.kind === 'scale') return paintScale(body, digest, opts);
    if (digest.kind === 'wordcloud') return paintCloud(body, digest, opts);
    return paintBrainstorm(body, digest);
  }

  /** Make sure the join panel exists and sits above the body. */
  function ensureRailJoin(rail) {
    var body = rail.querySelector('.fb-body');
    var join = rail.querySelector('.rail-join');
    if (!join) {
      join = el('div', 'rail-join');
      if (body) rail.insertBefore(join, body);
      else rail.appendChild(join);
      return join;
    }
    /* Older shells put the join under the body — move it up so it owns the
       empty middle instead of leaving a hollow stretch above the footer PIN. */
    if (body && (join.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING)) {
      rail.insertBefore(join, body);
    }
    return join;
  }

  function feedbackDigestBusy(digest) {
    if (!digest || !digest.kind) return false;
    if (Number(digest.total) > 0 || Number(digest.answered) > 0) return true;
    if (digest.words && digest.words.length) return true;
    if (digest.items && digest.items.length) return true;
    if (digest.counts && digest.counts.some(function (n) { return Number(n) > 0; })) return true;
    return false;
  }

  /** Names of people who joined — shown until responses start landing. */
  function paintFbRoster(body, roster) {
    body.appendChild(el('div', 'fb-roster-lbl',
      roster.length === 1 ? '1 person in' : roster.length + ' people in'));
    roster.slice(0, 12).forEach(function (p) {
      body.appendChild(el('div', 'fb-who-in', p.name || 'Player'));
    });
    if (roster.length > 12) {
      body.appendChild(el('div', 'fb-who-more', '+' + (roster.length - 12) + ' more'));
    }
  }

  function paintPoll(body, digest, opts) {
    var counts = digest.counts || [];
    var labels = opts.options || [];
    var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
    var total = digest.total || 0;

    if (!total) {
      /* The join QR owns this space while the room is still arriving — a second
         "no votes" line just pushes it down. */
      var joining = !!(opts.join && opts.join.pin);
      if (!joining) body.appendChild(el('div', 'empty-rail', 'No votes yet'));
      return;
    }
    counts.forEach(function (n, i) {
      var row = el('div', 'pollrow');
      var head = el('div', 'pollhead');
      head.appendChild(el('span', 'plabel', labels[i] || 'Option ' + (i + 1)));
      head.appendChild(el('span', 'pn', String(n)));
      row.appendChild(head);
      var bar = el('div', 'pbar');
      var fill = el('i');
      fill.style.width = ((n / max) * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'ppct', total ? Math.round((n / total) * 100) + '%' : '0%'));
      body.appendChild(row);
    });
  }

  /* The average of the room's positions, and how spread out they are.
     A mean alone hides a split room: 1,1,5,5 and 3,3,3,3 both average 3, and
     they are the opposite situation for whoever is teaching. */
  function scaleStats(counts) {
    var total = 0, sum = 0;
    counts.forEach(function (n, i) { total += n; sum += n * (i + 1); });
    if (!total) return { total: 0, mean: 0, split: false };
    var mean = sum / total;
    /* Split when the two ends together outweigh the middle — the shape a
       teacher needs to notice, stated as a fact rather than a variance. */
    var edges = (counts[0] || 0) + (counts[counts.length - 1] || 0);
    var middle = total - edges;
    return { total: total, mean: mean, split: counts.length > 2 && edges > middle };
  }

  /* Columns rather than rows: a scale runs from one end to the other, and
     showing it as a row of independent bars loses the only thing that makes
     it a scale. */
  function scaleChart(counts, opts, cls) {
    var stats = scaleStats(counts);
    var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
    var wrap = el('div', cls);

    var cols = el('div', cls + '-cols');
    counts.forEach(function (n, i) {
      var col = el('div', cls + '-col');
      var bar = el('div', cls + '-bar');
      var fill = el('i');
      fill.style.height = ((n / max) * 100) + '%';
      bar.appendChild(fill);
      col.appendChild(el('div', cls + '-n', n ? String(n) : ''));
      col.appendChild(bar);
      col.appendChild(el('div', cls + '-p', String(i + 1)));
      cols.appendChild(col);
    });
    wrap.appendChild(cols);

    var ends = opts.ends || {};
    var foot = el('div', cls + '-ends');
    foot.appendChild(el('span', null, ends.low || ''));
    foot.appendChild(el('span', null, ends.high || ''));
    wrap.appendChild(foot);

    var read = el('div', cls + '-read');
    if (stats.total) {
      read.appendChild(el('strong', null, stats.mean.toFixed(1)));
      read.appendChild(el('span', null, ' average of ' + stats.total));
      if (stats.split) read.appendChild(el('span', cls + '-split', 'ROOM IS SPLIT'));
    }
    wrap.appendChild(read);
    return wrap;
  }

  function paintScale(body, digest, opts) {
    if (!digest.total) {
      var joining = !!(opts && opts.join && opts.join.pin);
      if (!joining) body.appendChild(el('div', 'empty-rail', 'Nobody has placed themselves yet'));
      return;
    }
    body.appendChild(scaleChart(digest.counts || [], opts, 'sc'));
  }

  function focusScale(body, digest, opts) {
    body.appendChild(scaleChart(digest.counts || [], opts, 'fksc'));
  }

  function paintCloud(body, digest, opts) {
    var words = digest.words || [];
    if (!words.length) {
      var joining = !!(opts && opts.join && opts.join.pin);
      if (!joining) body.appendChild(el('div', 'empty-rail', 'No words yet'));
      return;
    }
    var cloud = el('div', 'cloud');
    var top = words[0].n;
    words.slice(0, 24).forEach(function (w) {
      /* Size by share of the most common word, floored so a single mention is
         still readable rather than vanishing. */
      var scale = 0.5 + 0.5 * (w.n / top);
      var chip = el('span', 'word', w.text);
      chip.style.fontSize = 'calc(var(--cloud-f) * ' + scale.toFixed(2) + ')';
      if (w.n > 1) chip.appendChild(el('sup', null, String(w.n)));
      cloud.appendChild(chip);
    });
    body.appendChild(cloud);
  }

  function paintBrainstorm(body, digest) {
    var items = digest.items || [];
    if (!items.length) {
      body.appendChild(el('div', 'empty-rail', 'Nothing yet'));
      return;
    }
    items.slice(0, 8).forEach(function (it) {
      var card = el('div', 'fbcard');
      card.appendChild(el('div', 'fbtext', it.text));
      if (it.name) card.appendChild(el('div', 'fbwho', it.name));
      body.appendChild(card);
    });
    if (items.length > 8) {
      body.appendChild(el('div', 'more', '+ ' + (items.length - 8) + ' more'));
    }
  }

  /* ------------------------------------------------------- race track */

  /**
   * The race track, shown as an overlay after each question is revealed.
   * @param {object} deck   for the theme
   * @param {Array}  lanes  [{ key, name, pos, color, moved }]
   * @param {object} opts   { length, title, note, winners }
   */
  /** #rrggbb -> rgba(), so a lane can tint its completed steps. */
  function tint(hex, alpha) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
    if (!m) return 'rgba(255,255,255,.18)';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' +
           parseInt(m[3], 16) + ',' + alpha + ')';
  }

  function raceTrack(deck, lanes, opts) {
    opts = opts || {};
    var len = Math.max(1, opts.length || 5);

    var node = themedRoot('slide', deck, 'layout-race', 'race');
    var pad = el('div', 'pad');

    pad.appendChild(el('div', 'race-title', opts.title || 'The race'));
    if (opts.note) pad.appendChild(el('div', 'race-note', opts.note));

    /* Deliberately not "track": .slide .track is the progress bar at the foot
       of every slide, and inheriting its absolute 5px-tall rule collapsed the
       whole board. */
    var board = el('div', 'racetrack');
    /* One column per step plus a lane label, so every lane's step N sits in the
       same place across lanes — the whole point of a race is comparing them. */
    board.style.setProperty('--steps', String(len));

    lanes.forEach(function (lane) {
      var row = el('div', 'lane' + (lane.moved ? ' moved' : '') +
                            ((opts.winners || []).indexOf(lane.key) > -1 ? ' won' : ''));
      var colour = lane.color || 'var(--s-accent)';
      row.style.setProperty('--lane-color', colour);
      row.style.setProperty('--lane-tint', tint(lane.color, 0.34));

      var label = el('div', 'lane-name');
      var dot = el('span', 'lane-dot');
      dot.style.background = colour;
      label.appendChild(dot);
      label.appendChild(el('span', 'lane-text', lane.name));
      row.appendChild(label);

      var rail = el('div', 'lane-rail');
      for (var i = 1; i <= len; i++) {
        var cell = el('div', 'step' + (i === len ? ' finish' : ''));
        if (i <= lane.pos) cell.classList.add('done');
        rail.appendChild(cell);
      }

      /* Positioned as a fraction of the rail rather than inside a cell, so the
         CSS transition animates the move. Step n means "standing in cell n",
         so the runner goes to that cell's centre — using n/len would park it
         on the boundary between two cells and read as ambiguous. */
      var runner = el('div', 'runner', lane.pos >= len ? '🏆' : '🏇');
      runner.style.left = (lane.pos <= 0 ? 0 : ((lane.pos - 0.5) / len) * 100) + '%';
      rail.appendChild(runner);
      row.appendChild(rail);

      row.appendChild(el('div', 'lane-pos', lane.pos + ' / ' + len));
      board.appendChild(row);
    });

    pad.appendChild(board);
    node.appendChild(pad);
    return node;
  }

  /** Shared boss HP overlay — same slot as the race track. */
  function bossBar(deck, opts) {
    opts = opts || {};
    var max = Math.max(1, Number(opts.max) || 1);
    var hp = Math.max(0, Math.min(max, Number(opts.hp) || 0));
    var pct = Math.round((hp / max) * 100);
    var node = themedRoot('slide', deck, 'layout-boss' +
      (opts.hit ? ' boss-hit' : '') + (hp <= 0 ? ' boss-down' : ''), 'boss');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'boss-title', opts.title || 'Boss battle'));
    if (opts.note) pad.appendChild(el('div', 'boss-note', opts.note));
    var meter = el('div', 'boss-meter');
    var fill = el('div', 'boss-fill');
    fill.style.width = pct + '%';
    meter.appendChild(fill);
    pad.appendChild(meter);
    pad.appendChild(el('div', 'boss-hp', hp + ' / ' + max + ' HP'));
    node.appendChild(pad);
    return node;
  }

  /** Word Reveal drip wall — letter mask over the deck. */
  function wordRevealWall(deck, opts) {
    opts = opts || {};
    var node = themedRoot('slide', deck, 'layout-wordreveal', 'wordreveal');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'wr-title', 'Word reveal'));
    if (opts.hint) pad.appendChild(el('div', 'wr-hint', opts.hint));
    pad.appendChild(el('div', 'wr-mask', opts.mask || ''));
    pad.appendChild(el('div', 'wr-meta',
      (opts.shown || 0) + ' / ' + (opts.total || 0) + ' letters'));
    node.appendChild(pad);
    return node;
  }

  /** Memory / knowledge study card on the wall. */
  function studyCards(deck, opts) {
    opts = opts || {};
    var node = themedRoot('slide', deck, 'layout-study', 'study');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'study-term', opts.term || ''));
    if (opts.definition) pad.appendChild(el('div', 'study-def', opts.definition));
    if (opts.seconds > 0) {
      pad.appendChild(el('div', 'study-note',
        opts.hideAfter ? ('Study · ' + opts.seconds + 's then hide') : 'Keywords stay visible'));
    }
    node.appendChild(pad);
    return node;
  }

  /* ------------------------------------------------------- score rail */

  /** Empty rail shell. Built once per show; rows are painted into it. */
  function scoreRail(deck) {
    var root = themedRoot('scorerail', deck);
    root.appendChild(el('div', 'rail-title', 'The room'));
    root.appendChild(el('div', 'rail-sub', ''));
    /* Arrivals, briefly. Above the board because that is where the eye is
       when the board is what changed. */
    root.appendChild(el('div', 'rail-news'));
    root.appendChild(el('div', 'rows'));
    /* The way in, on screen for as long as it is usable. Below the board so
       the standings keep the top of the rail. */
    root.appendChild(el('div', 'rail-join'));
    var foot = el('div', 'foot');
    foot.appendChild(el('div', 'joinline'));
    foot.appendChild(el('div', 'notes', ''));
    root.appendChild(foot);
    return root;
  }

  /**
   * Give the rail the same surface as the slide beside it.
   *
   * The rail paints var(--s-bg), the same token the slide uses, which agrees
   * for every theme that only sets the token. The studio theme also paints
   * some layouts directly — its section slides are lilac while its token is
   * sage — so on those the panel and the slide it is butted against came out
   * different colours.
   *
   * Read off the slide rather than told separately, so a new theme or a new
   * layout cannot drift out of step: whatever the slide resolves to is what
   * the rail gets.
   *
   * The ink travels with the surface. A theme is allowed to flip its whole
   * token set per layout — northeastern's section slides are white type on
   * red where the theme's own token is ink on white — and taking the red
   * without the white left the rail printing red text on red.
   *
   * @param {HTMLElement} rail
   * @param {HTMLElement} slideEl the .slide currently on screen
   */
  var RAIL_INK = ['--s-fg', '--s-dim', '--s-rule', '--s-card', '--s-accent', '--s-accent-2', '--s-scrim'];

  function railSurface(rail, slideEl) {
    if (!rail || !slideEl) return;
    var cs = getComputedStyle(slideEl);
    var img = cs.backgroundImage;
    rail.style.backgroundColor = cs.backgroundColor;
    /* A url() background is the slide's own artwork and has no business
       being tiled into a panel beside it — fall back to the flat colour. */
    rail.style.backgroundImage = img.indexOf('url(') === -1 ? img : 'none';
    RAIL_INK.forEach(function (token) {
      var value = cs.getPropertyValue(token).trim();
      if (value) rail.style.setProperty(token, value);
      else rail.style.removeProperty(token);
    });
    /* Same reasoning as the tokens above, for the one thing that is not a
       token: the rail reads its ground off the slide it is butted against
       rather than off the deck, so a theme that flips ground per layout gets
       a rail that flips with it. */
    if (slideEl.dataset.ground) rail.dataset.ground = slideEl.dataset.ground;
  }

  /**
   * The join panel in the rail: the code as a square, and the PIN under it.
   *
   * Big while the board is empty, because an empty rail saying "waiting for
   * players" is the one moment the screen has nothing better to do than show
   * people how to arrive. Compact once anyone is in, so the standings keep
   * the space — and gone entirely once joining shuts, since a PIN that will
   * not admit anyone is worse than no PIN.
   *
   * @param {HTMLElement} node .rail-join
   * @param {object} join { pin, url, link, open, waiting }
   * @param {boolean} roomy nobody on the board yet
   */
  function paintRailJoin(node, join, roomy) {
    if (!node) return;
    /* Shown whenever there is a PIN at all, open window or not.

       Hiding it while the window is shut was wrong: joining a closed room is
       not refused, it puts you in the waiting room and admits you at the next
       round. So the code still works — and a rail reading "waiting for
       players" with no code on it is a room nobody can become a player in.
       What changes when the window shuts is the label, not the presence. */
    var live = !!(join && join.pin);
    node.classList.toggle('on', !!live);
    node.classList.toggle('big', !!live && roomy);
    /* The footer line and a big panel say the same thing, and the panel says
       it better. Marked on the rail so the line can stand down rather than
       printing the PIN twice, once over the other. */
    var rail = node.closest ? node.closest('.scorerail') : null;
    if (rail) rail.classList.toggle('joining-big', !!live && roomy);
    if (!live) { node.textContent = ''; node.dataset.for = ''; return; }

    var open = join.open !== false;
    var link = join.link || join.url || '';
    /* The window state is in the key: the label changes with it, so a repaint
       has to happen when it flips. */
    var waiting = open ? 0 : Math.max(0, Number(join.waiting) || 0);
    var key = link + '|' + (roomy ? 'big' : 'small') + '|' +
      (open ? 'open' : 'shut') + '|' + waiting;
    /* Rebuilt only when the payload changes: this runs on every roster push
       and encoding a QR per push would be work for nothing. If the node was
       emptied underneath us, rebuild anyway. */
    if (node.dataset.for === key && node.childElementCount) return;
    node.dataset.for = key;
    node.textContent = '';

    if (link && SF.qrSvg) {
      var code = el('div', 'rj-qr');
      try {
        /* The full four-module quiet zone inside the SVG rather than borrowed
           from the CSS padding around it. Padding is styling and can be
           changed; a code that stops scanning when someone tightens a box is
           a bad thing to leave lying around. */
        code.innerHTML = SF.qrSvg(link, { quiet: 4, title: 'Join at ' + link });
        node.appendChild(code);
      } catch (e) { /* nothing worth showing beats a broken box on a wall */ }
    }
    var side = el('div', 'rj-side');
    /* Says what will actually happen. "Scan to join the next round" is a
       different promise from "point a camera here", and a room that scans on
       the strength of the wrong one and lands in a waiting screen learns not
       to trust the panel. */
    side.appendChild(el('div', 'rj-lbl' + (open ? '' : ' shut'),
      open ? (roomy ? 'Point a camera here' : 'Still joining?')
           : (roomy ? 'Scan to join the next round' : 'Joining next round')));
    side.appendChild(el('div', 'rj-pin', join.pin));
    if (roomy) side.appendChild(el('div', 'rj-url', join.url || ''));
    /* Someone who has already scanned is looking at a waiting screen and
       wants to know it worked. The footer line says this too, but the big
       panel hides that line, so it would go unsaid exactly when the panel is
       the only thing on the rail. */
    if (waiting) {
      side.appendChild(el('div', 'rj-wait',
        waiting + (waiting === 1 ? ' person is' : ' people are') + ' in the queue'));
    }
    node.appendChild(side);
  }

  /* How many entries the rail can show before it has to summarise. Beyond
     this the type would be too small to read from the back of a room, so the
     tail is collapsed into a "+N more" line instead. */
  var RAIL_MAX_ROWS = 10;

  /* A name wraps at spaces, so what decides whether it fits is its longest
     single word. Shrink only as far as that word demands — "Blue" stays full
     size while "The Quizzinators" steps down rather than truncating. */
  function nameScale(name) {
    var longest = String(name).split(/\s+/).reduce(function (m, w) {
      return Math.max(m, w.length);
    }, 0);
    if (longest <= 6) return 1;
    if (longest <= 9) return 0.86;
    if (longest <= 12) return 0.74;
    return 0.62;
  }

  /* Row size is driven by the number of entries: a two-team board reads huge,
     a twelve-player board stays legible. */
  function railDensity(n) {
    if (n <= 2) return 'xl';
    if (n <= 4) return 'lg';
    if (n <= 6) return 'md';
    if (n <= 8) return 'sm';
    return 'xs';
  }

  /**
   * Repaint the rail in place.
   * @param {HTMLElement} rail
   * @param {Array} rows  [{ key, name, score, members, color, gained }]
   * @param {object} opts { subtitle, footnote, emptyText }
   */
  function paintScoreRail(rail, rows, opts) {
    opts = opts || {};
    var sub = rail.querySelector('.rail-sub');
    if (sub) sub.textContent = opts.subtitle || '';
    /* The rail says which of the two columns is which, once, at the top. */
    /** @type {HTMLElement|null} */
    var legend = rail.querySelector('.rail-legend');
    if (!legend) {
      var newLegend = el('div', 'rail-legend');
      var rowsBox = rail.querySelector('.rows');
      if (rowsBox && rowsBox.parentNode) {
        rowsBox.parentNode.insertBefore(newLegend, rowsBox);
      }
      legend = newLegend;
    }
    if (legend) {
      legend.replaceChildren();
      legend.appendChild(el('span', 'lg-learn', 'ACCURACY · ANSWERED'));
      legend.appendChild(el('span', 'lg-score', String(opts.scoreLabel || 'Game points').toUpperCase()));
      legend.hidden = !rows.length;
    }
    var footNotes = rail.querySelector('.foot .notes');
    if (footNotes) footNotes.textContent = opts.footnote || '';
    /** @type {HTMLElement|null} */
    var joinLine = rail.querySelector('.joinline');
    if (joinLine) paintJoinLine(joinLine, opts.join);
    /** @type {HTMLElement|null} */
    var railJoin = rail.querySelector('.rail-join');
    if (railJoin) paintRailJoin(railJoin, opts.join, !rows.length);

    /** @type {HTMLElement|null} */
    var box = rail.querySelector('.rows');
    if (!box) return;

    if (!rows.length) {
      rail.dataset.density = 'lg';
      box.innerHTML = '';
      /* No "waiting for players" when the join panel is showing them how to
         stop it being true — two ways of saying the same thing, one of them
         actionable. */
      var joining = !!(opts.join && opts.join.pin);
      if (!joining) {
        box.appendChild(el('div', 'empty-rail', opts.emptyText || 'Nobody has joined yet.'));
      }
      return;
    }

    var shown = rows.slice(0, RAIL_MAX_ROWS);
    var hidden = rows.length - shown.length;
    rail.dataset.density = railDensity(shown.length + (hidden ? 1 : 0));

    /* The member count only earns its line while the rows are tall enough for
       a second line of text. */
    var roomForMembers = ['xl', 'lg', 'md'].indexOf(rail.dataset.density) !== -1;

    var existing = {};
    Array.prototype.forEach.call(box.children, function (n) {
      if (n.dataset.key) existing[n.dataset.key] = n;
    });

    var order = [];
    shown.forEach(function (r, i) {
      var node = existing[r.key];
      if (!node) {
        node = el('div', 'srow');
        node.dataset.key = r.key;
        node.appendChild(el('div', 'rk', ''));
        var who = el('div', 'who');
        who.appendChild(el('div', 'nm', ''));
        node.appendChild(who);
        /* Learning first, then winning. The rail used to carry one number per
           row and call it the score — points in one game, an average in
           another, steps along a track in a third — so the thing a teacher
           most needs mid-lesson (who is struggling) was the one thing it
           could not say. */
        who.appendChild(el('div', 'learn', ''));
        node.appendChild(el('div', 'sc', ''));
      }
      delete existing[r.key];

      node.querySelector('.rk').textContent = String(i + 1);
      var nm = node.querySelector('.nm');
      nm.textContent = r.name;
      nm.style.fontSize = 'calc(var(--nm-f) * ' + nameScale(r.name) + ')';

      /* Members sit on their own line rather than trailing the name, which is
         what made long team names collide with the score. */
      var who = node.querySelector('.who');
      var mem = who.querySelector('.mem');
      if (r.members != null && roomForMembers) {
        if (!mem) { mem = el('div', 'mem', ''); who.appendChild(mem); }
        mem.textContent = r.members === 1 ? '1 player' : r.members + ' players';
      } else if (mem) {
        mem.remove();
      }

      /* Accuracy · answered, and a flag when they need a hand. Absent until
         something has been revealed — a row of 0% before the first reveal
         reads as failure rather than as "not asked yet". */
      var learn = node.querySelector('.learn');
      if (learn) {
        var asked = r.asked || 0;
        if (!asked) {
          learn.textContent = '';
          learn.className = 'learn';
        } else {
          var acc = typeof r.accuracy === 'number' ? r.accuracy : null;
          learn.textContent = (acc == null ? '—' : acc + '%') +
            ' · ' + (r.answered || 0) + '/' + asked;
          /* Needs support is a judgement about a person, so it waits until
             there is enough to judge on: under half right across at least
             three, or silent through most of them. */
          var struggling = asked >= 3 &&
            ((acc != null && acc < 50) || (r.answered || 0) * 2 < asked);
          learn.className = 'learn' + (struggling ? ' needs' : '');
          if (struggling) learn.textContent += ' · needs support';
        }
      }
      var sc = node.querySelector('.sc');
      sc.textContent = String(r.score);
      /* Labelled, so nobody reads distance or an average as a mark. */
      sc.title = opts.scoreLabel || 'Game points';
      sc.setAttribute('aria-label', (opts.scoreLabel || 'Game points') + ': ' + r.score);
      node.style.borderLeftColor = r.color || '';
      node.classList.toggle('lead', i === 0 && r.score > 0);

      /* Flash only the rows that actually moved, so the eye is drawn to the
         change rather than to the whole board repainting. */
      if (r.gained) {
        node.classList.remove('gain');
        void node.offsetWidth;              // restart the animation
        node.classList.add('gain');
      }
      order.push(node);
    });

    // drop anyone who left
    Object.keys(existing).forEach(function (k) { existing[k].remove(); });

    var moreEl = box.querySelector('.more');
    if (hidden > 0) {
      var more = moreEl || el('div', 'more', '');
      more.textContent = '+ ' + hidden + ' more';
      order.push(more);
    } else if (moreEl) {
      moreEl.remove();
    }

    for (var oi = 0; oi < order.length; oi++) {
      if (order[oi]) box.appendChild(order[oi]);
    }
  }

  /* The PIN stays on screen for the whole game so anyone arriving late can
     still get in without interrupting. Press J for the full-screen version. */
  function paintJoinLine(node, join) {
    if (!join || !join.pin) { node.textContent = ''; node.style.display = 'none'; return; }
    node.style.display = '';
    node.textContent = '';
    node.classList.toggle('shut', join.open === false);

    if (join.open === false) {
      /* Once the window shuts the PIN is no use to the room, so the line says
         what is actually true rather than inviting joins that get held. */
      node.appendChild(el('span', 'jl-lbl', 'CLOSED'));
      node.appendChild(el('span', 'jl-url',
        join.waiting ? join.waiting + ' waiting for next round' : 'joining reopens next round'));
      return;
    }
    node.appendChild(el('span', 'jl-lbl', 'JOIN'));
    node.appendChild(el('span', 'jl-url', join.url || ''));
    node.appendChild(el('span', 'jl-pin', join.pin));
    if (node.classList.contains('fk-join')) {
      node.title = 'Click or press J for full-screen QR code';
      node.style.cursor = 'pointer';
      var qrHint = el('span', 'jl-qr-hint', '\u26F6 QR (J)');
      node.appendChild(qrHint);
      node.onclick = function () {
        if (global.SF && global.SF.Player && global.SF.Player.control) {
          global.SF.Player.control('join');
        }
      };
    }
  }

  /** Compact "3 / 5 correct" pill for a show with no audience attached. */
  function soloScore(deck) {
    var root = themedRoot('soloscore', deck);
    root.appendChild(el('span', 'lbl', 'Score'));
    root.appendChild(el('span', 'val', '0 / 0'));
    return root;
  }

  Object.assign(global.SF, {
    renderSlide: renderSlide,
    /* Exported for the same reason safeMedia is: a link the app claims to
       understand is worth being able to test without a browser. */
    youtubeId: youtubeId,
    imageTravel: imageTravel,
    travelFrame: travelFrame,
    statementBand: statementBand,
    statementWordSize: statementWordSize,
    WORD_EFFECTS: WORD_EFFECTS,
    wordEffect: wordEffect,
    wordsLoop: wordsLoop,
    WORD_SPEEDS: WORD_SPEEDS,
    WORD_STAGGERS: WORD_STAGGERS,
    wordSpeed: wordSpeed,
    wordStagger: wordStagger,
    WORD_FROMS: WORD_FROMS,
    wordFrom: wordFrom,
    wordPlan: wordPlan,
    wordPlanUnit: wordPlanUnit,
    WORD_ARCS: WORD_ARCS,
    LETTER_CAP: LETTER_CAP,
    wrapWords: wrapWords,
    BACKDROPS: BACKDROPS,
    backdropMotion: backdropMotion,
    videoStill: videoStill,
    fit: fit,
    clockFace: clockFace,
    videoEmbed: videoEmbed,
    letterbox: letterbox,
    ring: ring,
    scoreRail: scoreRail,
    paintRailJoin: paintRailJoin,
    railSurface: railSurface,
    raceTrack: raceTrack,
    bossBar: bossBar,
    wordRevealWall: wordRevealWall,
    studyCards: studyCards,
    quizPresent: quizPresent,
    feedbackRail: feedbackRail,
    feedbackFocus: feedbackFocus,
    questionCard: questionCard,
    sampleFeedbackDigest: sampleFeedbackDigest,
    feedbackViewOpts: feedbackViewOpts,
    paintFeedbackRail: paintFeedbackRail,
    paintScoreRail: paintScoreRail,
    soloScore: soloScore,
    sampleJoinInfo: sampleJoinInfo,
    LETTERS: LETTERS,
    el: el
  });
})(window);
