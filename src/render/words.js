/* Per-word and per-letter motion, bundled through the existing model entry
 * point. Moved out of js/render.js — see docs/render-split.md, step 2 of six.
 *
 * Unlike the charts in the step before it, this band does not shrink its
 * contract: seventeen names live here and sixteen leave, because word motion
 * is configured from the Motion pane in js/customize.js and so was already
 * almost entirely public. The gain is that the whole motion system is now in
 * one findable place rather than spread through a 7,000-line file, and that
 * js/render.js is 324 lines shorter.
 *
 * It needs nothing from the model — no SF — only the renderer's `el`, which is
 * why the factory takes helpers alone where createChartRenderer takes (SF,
 * helpers). It builds DOM directly, as fit-check and canvas-regions already do
 * in this directory.
 */
export function createWordRenderer(helpers) {
  const {el} = helpers;

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

  return {LETTER_CAP, WORD_ARCS, WORD_EFFECTS, WORD_FROMS, WORD_SPEEDS, WORD_STAGGERS, statementBand, statementWordSize, wordEffect, wordFrom, wordPlan, wordPlanUnit, wordSpeed, wordStagger, wordsLoop, wrapWords};
}
