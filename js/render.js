/* SlideForge — slide renderer.
   One function builds the DOM for a slide at true 1280x720; callers scale it.
   The same output is used for rail thumbnails, the editor preview and the
   live slideshow, so what you edit is exactly what you present. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var IMAGE_FRAMES = { '16:9': '16 / 9', '4:3': '4 / 3', '3:2': '3 / 2', '1:1': '1 / 1', '4:5': '4 / 5' };

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

  /* Placed pictures and theme-shape poses live in src/render/art.js — see
     docs/render-split.md. It installs its seven names onto SF directly, as
     this code always did, rather than handing them back to be unpacked. */
  SF.installArtRenderer(SF, {el: el});

  /* The lattice — where a block sits on a slide — lives in
     src/render/lattice.js. See docs/render-split.md. It installs its
     thirty-four names onto SF directly, as this code always did. */
  SF.installLatticeRenderer(SF, {el: el, IMAGE_FRAMES: IMAGE_FRAMES, travelFrom: travelFrom});
  /* Read back for renderHeaderFooter below, which places chrome on the
     same grid and is the one thing left here that needs the geometry. */
  var LATTICE = SF.LATTICE;

  SF.headerFooterConfig = function (deck, slide) {
    var c = slide.headerFooter || deck.headerFooter;
    return c && typeof c === 'object' ? c : null;
  };
  function renderHeaderFooter(root, deck, slide, opts) {
    var config = SF.headerFooterConfig(deck, slide);
    if (!config || opts.chrome === false) return;
    // Explicitly hidden also replaces legacy numbering and logos.
    root.classList.add('sf-hf-managed');
    if (!config.enabled || (config.hideOnCover && (slide.type === 'title' || opts.index === 0))) return;
    var slots = config.slots || {};
    /* The room's number, games counted as the steps they play as — the same
       rule as the plain page number in renderSlide. */
    var at = SF.showNumber(deck, slide, function (id) { return SF.GameStore ? SF.GameStore.get(id) : null; });
    var number = at ? at.place : Number(opts.index || 0) + 1;
    var total = at ? at.total : opts.total || (deck.slides || []).length;
    var section = '';
    (deck.slides || []).slice(0, Math.max(0, (deck.slides || []).indexOf(slide)) + 1).forEach(function (s) {
      if (s.type === 'section') section = s.title || '';
    });
    var layer = el('div', 'sf-furniture');
    ['header', 'footer'].forEach(function (band) {
      var row = el('div', 'sf-furniture-row sf-furniture-' + band);
      var occupied = [];
      ['left', 'center', 'right'].forEach(function (side, i) {
        var key = band + '-' + side;
        var item = slots[key];
        if (!item || !item.kind || item.kind === 'empty') return;
        var cell = el('div', 'sf-furniture-cell');
        cell.dataset.hfSlot = key;
        cell.dataset.align = side;
        var text = item.kind === 'number' ? String(number)
          : item.kind === 'pages' ? number + ' / ' + total
          : item.kind === 'title' ? deck.title
          : item.kind === 'section' ? section
          : item.kind === 'date' ? SF.formatSlideDate(slide.date)
          : item.kind === 'tagline' ? deck.closingNote || deck.org || ''
          : item.text || '';
        if (item.kind === 'image' || item.kind === 'logo') {
          var src = SF.safeMedia(item.kind === 'logo' ? deck.logo : item.src);
          if (!src) return;
          var img = el('img'); img.src = src; img.alt = String(item.alt || ''); img.draggable = false;
          cell.appendChild(img);
        } else {
          if (!String(text || '').trim()) return;
          cell.textContent = String(text).replace(/\n/g, ' ');
        }
        if (item.placement === 'canvas') {
          var anchor = /^(top|middle|bottom)-(left|center|right)$/.test(item.anchor) ? item.anchor : 'middle-center';
          cell.classList.add('sf-furniture-canvas'); cell.dataset.anchor = anchor;
          layer.appendChild(cell);
        } else { occupied.push({node:cell, index:i}); row.appendChild(cell); }
      });
      /* Only occupied neighbours bound a slot. Empty middle slots release space.

         Measured in columns rather than percent, so the furniture lands on the
         same edges as the body. The row already started and ended on the grid
         — 52 in from each side — but it divided the space at 25% and 75%, which
         is 346 and 934, while the columns break at 355 and 961. The two ends
         agreed and everything between them was a few pixels out, which is the
         kind of misalignment that is only visible once you put a header over a
         grid and then impossible to stop seeing.
         Three columns, six, three: the same proportions the percentages
         described, now expressed in the unit the slide is actually built from.
         A slot from boundary a to boundary b spans (b-a) columns, which is
         (b-a)*101 wide less the 36px gutter that does not follow the last one. */
      /* Derived, not restated: the body is cols tracks plus cols-1 gutters, so
         cols*stepX overshoots the width by exactly one gutter. Writing 36 here
         would be a third place the number lives. */
      var GUTTER = LATTICE.cols * LATTICE.stepX - LATTICE.w;
      var COLS = LATTICE.cols, HALF = COLS / 2, THIRD = COLS / 4;
      occupied.forEach(function (entry, i) {
        var prev = occupied[i - 1], next = occupied[i + 1];
        var from = prev ? (prev.index + entry.index) * THIRD : 0;
        var to = next ? (entry.index + next.index) * THIRD : COLS;
        if (entry.index === 1) {
          var radius = Math.min(HALF - from, to - HALF);
          from = HALF - radius; to = HALF + radius;
        }
        entry.node.style.left = (from * LATTICE.stepX) + 'px';
        entry.node.style.width = ((to - from) * LATTICE.stepX - GUTTER) + 'px';
      });
      if (occupied.length) {
        layer.appendChild(row);
        root.classList.add('sf-has-' + band);
      }
    });
    root.appendChild(layer);
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

  /* Opening punctuation has no business setting the left edge. A title that
     begins with a quote mark starts its first letter 23px to the right of
     everything else on the slide at 52px type, which reads as a line that has
     been nudged rather than as a quotation. The mark hangs into the margin
     instead, which is what typesetting has always done with it.

     By character, because the answer is the same for every one of them and
     the alternative is remembering to tag the slides that happen to have one. */
  var HANGS = /^[“”"‘’'«‹]/;
  function rich(tag, cls, slide, key, text) {
    var n = el(tag, cls, text);
    n.dataset.contentKey=key;
    if (HANGS.test(String(text == null ? '' : text))) n.classList.add('hangs-open');
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

  /* Shared with the header/footer date slot, so a date reads the same wherever
     it is put. Midday, not midnight: a date-only string parsed as UTC midnight
     is the previous day in any negative offset. */
  SF.formatSlideDate = function (iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    var date = new Date(iso + 'T12:00:00');
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  function appendSlideDate(slide, pad) {
    var text = SF.formatSlideDate(slide.date);
    if (!text) return;
    var stamp = el('time', 'slide-date', text);
    stamp.setAttribute('datetime', slide.date);
    pad.appendChild(stamp);
  }

  /* Word and letter motion lives in src/render/words.js — see
     docs/render-split.md. All but one of its names are public, so they are
     unpacked here and exported below exactly as before. */
  var words = SF.createWordRenderer({el: el});
  var LETTER_CAP = words.LETTER_CAP;
  var WORD_ARCS = words.WORD_ARCS;
  var WORD_EFFECTS = words.WORD_EFFECTS;
  var WORD_FROMS = words.WORD_FROMS;
  var WORD_SPEEDS = words.WORD_SPEEDS;
  var WORD_STAGGERS = words.WORD_STAGGERS;
  var statementBand = words.statementBand;
  var statementWordSize = words.statementWordSize;
  var wordEffect = words.wordEffect;
  var wordFrom = words.wordFrom;
  var wordPlan = words.wordPlan;
  var wordPlanUnit = words.wordPlanUnit;
  var wordSpeed = words.wordSpeed;
  var wordStagger = words.wordStagger;
  var wordsLoop = words.wordsLoop;
  var wrapWords = words.wrapWords;
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
      var e = el('div', 'empty authoring-hint');
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
    /* A slide carrying blocks is not empty — it is simply not using its bullet
       pit, and the prompt for filling that pit was reaching the projector. */
    if (!anyText && !SF.freeBlocksOf(slide).length) {
      var hint = el('li', 'dim authoring-hint', 'Add points in Design & content');
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
        else pic.appendChild(el('span', 'authoring-hint', 'Add an image'));
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
  /**
   * An activity as its stages: a track across the top with the current stage
   * lit, that stage's prompt as the largest thing on the wall, and a clock for
   * that stage alone. See src/activities/stages.js.
   *
   * Every stage is a build step, so Next walks the room through them and the
   * presenter view, the phones and the clock all follow the one press. Before
   * the first press the wall shows the routine: its name, its stages and how
   * long it takes. The track is lit by js/stages.js as the steps move; drawn
   * for authoring, with no build running, every stage's prompt is listed.
   */
  function layoutStages(slide, pad, opts, root) {
    var stages = SF.activityStages(slide);
    var total = stages.reduce(function (sum, st) { return sum + st.seconds; }, 0);

    var track = el('ol', 'stage-track');
    track.setAttribute('aria-label', 'Stages');
    stages.forEach(function (st) {
      var chip = el('li', 'stage-chip job-' + st.job);
      chip.dataset.i = String(st.i);
      chip.appendChild(el('span', 'sc-n', String(st.i + 1)));
      chip.appendChild(el('span', 'sc-name', st.name));
      if (st.seconds) chip.appendChild(el('span', 'sc-min', clockFace(st.seconds)));
      track.appendChild(chip);
    });
    pad.appendChild(track);

    var intro = el('div', 'stage-intro');
    if (slide.title) intro.appendChild(rich('h2', null, slide, 'title', slide.title));
    intro.appendChild(el('p', 'si-lead', stages.length + (stages.length === 1 ? ' stage' : ' stages') +
      (total ? ' \u00b7 ' + Math.round(total / 60) + ' min' : '')));
    if (stages.length) intro.appendChild(el('p', 'si-next', 'First: ' + stages[0].name));
    pad.appendChild(intro);

    var answer = modelAnswerBox(slide);
    stages.forEach(function (st, k) {
      var panel = el('div', 'stage-panel step job-' + st.job);
      panel.dataset.step = String(st.i + 1);
      panel.dataset.i = String(st.i);
      panel.dataset.contentKey = 'bullets.' + st.i;
      var head = el('div', 'sp-head');
      head.appendChild(el('span', 'sp-icon', SF.STAGE_JOBS[st.job].icon));
      head.appendChild(el('span', 'sp-name', st.name));
      head.appendChild(el('span', 'sp-job', SF.STAGE_JOBS[st.job].wall));
      panel.appendChild(head);
      panel.appendChild(rich('div', 'sp-prompt', slide, 'bullets.' + st.i, st.text || ' '));
      /* Filled while the stage runs: time up, and how many ideas are in. */
      panel.appendChild(el('div', 'sp-live'));
      /* A worked answer belongs to the last stage, where the teacher draws
         the threads together. A draft stays off the wall as everywhere. */
      if (answer && k === stages.length - 1) panel.appendChild(answer);
      pad.appendChild(panel);
    });

    /* One clock, reset per stage by the player. Named as the slide clock so
       it sits where every timed slide's clock sits, and so the generic
       whole-activity clock is not drawn as well. */
    var clock = el('div', 'clock slide-clock stage-clock');
    clock.appendChild(ring(84, 8, 1));
    clock.appendChild(el('div', 'n', clockFace(stages.length && stages[0].seconds ? stages[0].seconds : total)));
    clock.setAttribute('aria-hidden', 'true');
    (root || pad).appendChild(clock);
    if (root) root.classList.add('has-clock');
  }

  function layoutKeywords(slide, pad, opts, root) {
    if (slide.activity && slide.activityPresentation === 'stages') return layoutStages(slide, pad, opts, root);
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
          row.appendChild(el('div', 'ln-url bad authoring-hint', p.def + ' — needs http(s)'));
        } else {
          row.appendChild(el('div', 'ln-url authoring-hint', 'Add a URL'));
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

  /* The travel maths, given the settings rather than a slide. A picture block
     carries the same four numbers on itself that an image slide carries in
     design, and there is no reason for two copies of this. */
  function travelFrom(d) {
    d = d || {};
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
  function imageTravel(slide) { return travelFrom((slide || {}).design); }


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
  /* The inspector offers the same frames to a block as to a slide. */
  SF.IMAGE_FRAME_KEYS = Object.keys(IMAGE_FRAMES);

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
      var e = el('div', 'empty authoring-hint');
      e.appendChild(el('div', null, '▣'));
      e.appendChild(el('div', null, 'Paste an image URL or drop a file in Design & content'));
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
      var e = el('div', 'empty authoring-hint');
      e.appendChild(el('div', null, '\u25a4'));
      e.appendChild(el('div', null, 'Add pictures in Design & content — each one gets its own moment'));
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

  /* Charts live in src/render/charts.js — see docs/render-split.md. Four names
     come back; the other twenty-seven stay private to that module. */
  var charts = SF.createChartRenderer(SF, {el: el});
  var svgEl = charts.svgEl;
  var chartKey = charts.chartKey;
  var chartTable = charts.chartTable;
  var chartSvgFor = charts.chartSvgFor;
  SF.chartSvgFor = chartSvgFor;
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
      var e = el('div', 'empty authoring-hint');
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
    var svg = chartSvgFor(kind, data, slide, stepOf);

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
      var e = el('div', 'empty authoring-hint');
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
      var e = el('div', 'empty authoring-hint');
      e.appendChild(el('div', null, '\u25b6'));
      e.appendChild(el('div', null, 'Paste a video URL or a path in Design & content'));
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

    /* Points or prose. A list of separate claims wants a marker on each line;
       a paragraph that happens to sit beside a picture does not, and the
       hanging indent a marker needs pushes every line of it off the edge it
       should be flush with. */
    var copy = el('div', 'split-copy' +
      ((slide.design || {}).copyStyle === 'prose' ? ' split-copy-prose' : ''));
    if (slide.title) copy.appendChild(rich('h2', null, slide, 'title', slide.title));
    var ul = el('ul');
    var lines = (slide.bullets || []).map(function(text,index){return {text:text,index:index};}).filter(function (b) { return String(b.text).trim(); });
    if (!lines.length && !SF.freeBlocksOf(slide).length) {
      ul.appendChild(el('li', 'dim authoring-hint', 'Add points in Design & content'));
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
      var empty = el('div', 'split-empty authoring-hint');
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

  /* The live session's furniture lives in src/render/live.js — see
     docs/render-split.md. Sixteen names come back; eighteen stay private. */
  var live = SF.createLiveRenderer(SF, {el: el, themedRoot: themedRoot});
  var bossBar = live.bossBar;
  var feedbackFocus = live.feedbackFocus;
  var feedbackRail = live.feedbackRail;
  var feedbackViewOpts = live.feedbackViewOpts;
  var paintFeedbackRail = live.paintFeedbackRail;
  var paintRailJoin = live.paintRailJoin;
  var paintScoreRail = live.paintScoreRail;
  var questionCard = live.questionCard;
  var raceTrack = live.raceTrack;
  var railSurface = live.railSurface;
  var sampleFeedbackDigest = live.sampleFeedbackDigest;
  var scoreRail = live.scoreRail;
  var soloScore = live.soloScore;
  var studyCards = live.studyCards;
  var tint = live.tint;
  var wordRevealWall = live.wordRevealWall;

  /* Quizzes, games and their surrounding screens live in src/render/quiz.js
     — see docs/render-split.md. The five layouts go back into LAYOUTS below
     exactly as before; this stays a plain table, not a registry. */
  var quiz = SF.createQuizRenderer(SF, {LETTERS: LETTERS, asStep: asStep, el: el, rich: rich, ring: ring, stableShuffle: stableShuffle, tint: tint});
  var layoutExplain = quiz.layoutExplain;
  var layoutGame = quiz.layoutGame;
  var layoutJoin = quiz.layoutJoin;
  var layoutQuiz = quiz.layoutQuiz;
  var layoutResults = quiz.layoutResults;
  var quizPresent = quiz.quizPresent;
  var sampleJoinInfo = quiz.sampleJoinInfo;
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
    pad.appendChild(el('p', 'dim info-empty authoring-hint', 'Add ' + what + ' in Design & content'));
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
      else shot.appendChild(el('span', 'authoring-hint', 'Add image ' + labels[i]));
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

  /* Draws nothing. The pad is left empty for renderFreeBlocks to fill, which
     is the whole point of the type — without an entry here the dispatcher
     falls through to layoutContent and a blank slide comes out wearing a
     title and a bullet list. */
  function layoutBlank() {}

  var LAYOUTS = {
    blank: layoutBlank,
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
    /* Prompts that tell the author what to fill in carry .authoring-hint, and
       the stylesheet shows them only on a slide drawn for authoring. Opt-in
       rather than opt-out: the projector, the share view, the presenter desk
       and anything added later get a clean slide without having to ask. */
    if (opts.authoring) root.dataset.authoring = '1';
    stampAspect(root, deck);
    if (slide.activity) {
      root.classList.add('activity-slide');
      var view = slide.activityPresentation;
      if (slide.type === 'keywords' && ['steps', 'panels', 'brief', 'stages'].indexOf(view) >= 0 &&
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
    var art;
    if (spec && spec.layouts.includes(slide.type)) {
      art = el('div', 'theme-art ' + spec.className);
      art.innerHTML = spec.html;
      if (spec.eyebrow) {
        var fields = spec.eyebrow[slide.type] || [];
        var line = fields.map(function(key){return String(deck[key] || '').trim();}).find(Boolean);
        if (line) art.appendChild(el('div', spec.eyebrow.className, line));
      }
      art.setAttribute('aria-hidden', 'true');
      SF.applyArtPoses(art, slide.art && slide.art.poses);
      root.appendChild(art);
    }
    /* Pictures the author placed on this slide, in their own layer. The theme
       layer above is decoration and stays aria-hidden; these are not, so they
       carry whatever alt text the author gave them. The layer exists even on a
       slide type the theme does not decorate — placing a picture must not
       depend on the theme happening to paint here. */
    var placedLayers = SF.placedArtLayers(slide.art && slide.art.pictures);
    placedLayers.forEach(function (layer) { root.appendChild(layer); });
    /* A picture behind the words needs the words above it, and a content
       slide's .pad is static — in normal flow, which every positioned box with
       z-index auto or more paints over. Raising the pad is the only way round
       that, and it is done for this slide alone, on the slides that ask for
       it, so no deck that has never placed a backdrop renders any differently.
       Theme decoration is untouched: it keeps painting exactly where it always
       did unless the author brings a shape forward by name. */
    if (placedLayers.some(function (l) { return l.dataset.artOrder === 'back'; })) {
      root.classList.add('sf-art-behind');
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
    /* Blocks the author added, before regions are applied so the lattice
       places them like any other block. */
    SF.renderFreeBlocks(root, slide);
    /* Before regions, so a hidden block is gone by the time the lattice reads
       the pad and cannot take a cell with it. */
    SF.dropHiddenBlocks(root, slide);
    /* Last, once compositions, boards, Explore and Customise have all finished
       shaping the pad: regions are the slide's explicit arrangement, so they
       are applied to whatever those produced rather than racing them. */
    SF.applyRegions(root, slide);

    if (opts.chrome !== false && deck.showSlideNumbers && opts.index != null && slide.type !== 'title') {
      /* Counted over the running order, not the editor's rows. A deck with a
         hidden teacher page said "3 / 9" in the editor and "3 / 7" in Present
         — the same slide, two numbers, because the show has already dropped
         the hidden ones by the time it renders. The room's count is the true
         one, so the editor is made to agree with it rather than the reverse.
         Same reasoning as deckShowsLogo and the first shown slide. */
      /* Games count as the steps they play as, so the editor's footer and
         the wall say the same number for the same slide. */
      var at = SF.showNumber(deck, slide, function (id) { return SF.GameStore ? SF.GameStore.get(id) : null; });
      var num = el('div', 'pagenum', at
        ? at.place + ' / ' + at.total
        : (opts.index + 1) + ' / ' + opts.total);
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
    renderHeaderFooter(root, deck, slide, opts);
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
