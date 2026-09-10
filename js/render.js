/* SlideForge — slide renderer.
   One function builds the DOM for a slide at true 1280x720; callers scale it.
   The same output is used for rail thumbnails, the editor preview and the
   live slideshow, so what you edit is exactly what you present. */
(function (global) {
  'use strict';

  var SF = global.SF;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* A bullet line starting with "- " or a tab/two spaces is a sub-bullet. */
  function bulletTier(line) {
    return /^(\s{2,}|\t|- )/.test(line) ? 2 : 1;
  }
  function bulletText(line) {
    return line.replace(/^(\s{2,}|\t|- )+/, '').trim();
  }

  function ring(size, stroke, frac, extraClass) {
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    ['ring-bg', 'ring'].forEach(function (name) {
      var ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ci.setAttribute('class', name + (extraClass ? ' ' + extraClass : ''));
      ci.setAttribute('cx', size / 2);
      ci.setAttribute('cy', size / 2);
      ci.setAttribute('r', r);
      ci.setAttribute('fill', 'none');
      ci.setAttribute('stroke-width', stroke);
      ci.setAttribute('stroke-linecap', 'round');
      if (name === 'ring') {
        ci.setAttribute('stroke-dasharray', c);
        ci.setAttribute('stroke-dashoffset', c * (1 - Math.max(0, Math.min(1, frac))));
      }
      svg.appendChild(ci);
    });
    return svg;
  }

  /* ------------------------------------------------------------ layouts */

  function layoutTitle(slide, pad) {
    pad.appendChild(el('div', 'accent-bar'));
    pad.appendChild(el('h1', null, slide.title || ' '));
    if (slide.subtitle) pad.appendChild(el('div', 'sub', slide.subtitle));
  }

  function layoutSection(slide, pad) {
    pad.appendChild(el('h1', null, slide.title || ' '));
    if (slide.subtitle) pad.appendChild(el('div', 'sub', slide.subtitle));
    pad.appendChild(el('div', 'accent-bar'));
  }

  function layoutContent(slide, pad) {
    if (slide.title) pad.appendChild(el('h2', null, slide.title));
    var ul = el('ul');
    var lines = (slide.bullets || []).filter(function (b) { return String(b).trim(); });
    lines.forEach(function (line) {
      var li = el('li', bulletTier(line) === 2 ? 'tier-2' : null, bulletText(line));
      ul.appendChild(li);
    });
    pad.appendChild(ul);
  }

  /* Bold keyword + lowercase definition — glossary / dual-coding of terms. */
  function layoutKeywords(slide, pad) {
    if (slide.title) pad.appendChild(el('h2', null, slide.title));
    var list = el('div', 'kw-list');
    var rows = (slide.bullets || []).map(SF.parseKeywordLine)
      .filter(function (p) { return p.term || p.def; });
    if (!rows.length) {
      var empty = el('div', 'kw-row dim');
      empty.appendChild(el('strong', 'kw-term', 'Keyword'));
      empty.appendChild(el('span', 'kw-def', 'add a plain-language definition'));
      list.appendChild(empty);
    } else {
      rows.forEach(function (p) {
        var row = el('div', 'kw-row');
        row.appendChild(el('strong', 'kw-term', p.term || ' '));
        row.appendChild(el('span', 'kw-def', p.def || ' '));
        list.appendChild(row);
      });
    }
    pad.appendChild(list);
  }

  /* Italic phrase + plain gloss — emphasis without a formatting ribbon. */
  function layoutItalics(slide, pad) {
    if (slide.title) pad.appendChild(el('h2', null, slide.title));
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
        var row = el('div', 'it-row');
        row.appendChild(el('em', 'it-phrase', p.term || ' '));
        row.appendChild(el('span', 'it-note', p.def || ' '));
        list.appendChild(row);
      });
    }
    pad.appendChild(list);
  }

  /* Label on top, clickable URL below — further reading. */
  function layoutLinks(slide, pad) {
    if (slide.title) pad.appendChild(el('h2', null, slide.title));
    var list = el('div', 'ln-list');
    var rows = (slide.bullets || []).map(SF.parseKeywordLine)
      .filter(function (p) { return p.term || p.def; });
    if (!rows.length) {
      var empty = el('div', 'ln-row dim');
      empty.appendChild(el('div', 'ln-label', 'Resource title'));
      empty.appendChild(el('div', 'ln-url', 'https://…'));
      list.appendChild(empty);
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
    pad.appendChild(el('div', 'q', slide.body || ' '));
    if (slide.subtitle) pad.appendChild(el('div', 'attrib', slide.subtitle));
  }

  function layoutImage(slide, pad) {
    if (slide.image) {
      var img = el('div', 'img ' + (slide.imageFit === 'contain' ? 'contain' : 'cover'));
      img.style.backgroundImage = 'url("' + String(slide.image).replace(/"/g, '&quot;') + '")';
      pad.appendChild(img);
      if (slide.title) pad.appendChild(el('div', 'cap', slide.title));
    } else {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '▣'));
      e.appendChild(el('div', null, 'Paste an image URL or drop a file in the inspector'));
      pad.appendChild(e);
    }
  }

  /* Half text / half image — dual coding without leaving the teaching canvas. */
  function layoutSplit(slide, pad) {
    var side = slide.imageSide === 'left' ? 'left' : 'right';
    pad.classList.add('split-pad', 'image-' + side);

    var copy = el('div', 'split-copy');
    if (slide.title) copy.appendChild(el('h2', null, slide.title));
    var ul = el('ul');
    var lines = (slide.bullets || []).filter(function (b) { return String(b).trim(); });
    if (!lines.length) {
      ul.appendChild(el('li', 'dim', 'Add points in the inspector'));
    } else {
      lines.forEach(function (line) {
        ul.appendChild(el('li', bulletTier(line) === 2 ? 'tier-2' : null, bulletText(line)));
      });
    }
    copy.appendChild(ul);

    var media = el('div', 'split-media');
    if (slide.image) {
      var img = el('div', 'img ' + (slide.imageFit === 'contain' ? 'contain' : 'cover'));
      img.style.backgroundImage = 'url("' + String(slide.image).replace(/"/g, '&quot;') + '")';
      media.appendChild(img);
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
    /* Blank lines make paragraphs; a single newline stays a line break. */
    String(slide.body || '').split(/\n{2,}/).forEach(function (para) {
      if (!para.trim()) return;
      body.appendChild(el('p', null, para.trim()));
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
  function raceStrip(lanes, len) {
    var strip = el('div', 'race-strip');
    lanes.forEach(function (lane) {
      var row = el('div', 'rlane');
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

  function layoutQuiz(slide, pad, opts) {
    /* Race questions lead with the field. */
    if (opts.lanes && opts.lanes.length) {
      pad.parentNode.classList.add('is-race');
      pad.appendChild(raceStrip(opts.lanes, opts.trackLength || 5));
    }

    var head = el('div', 'qhead');
    if (opts.quizNumber) {
      head.appendChild(el('div', 'qnum',
        (opts.lanes ? 'LEG ' : 'Q') + opts.quizNumber));
    }
    head.appendChild(el('div', 'q', slide.question || ' '));

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

    if (picLayout === 'overlay') {
      media.appendChild(head);                  // question sits on the image
      pad.appendChild(media);
    } else if (picLayout === 'first') {
      pad.appendChild(media);                   // image leads, question under it
      pad.appendChild(head);
    } else {
      pad.appendChild(head);
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

    /* Neither a typed nor a slider question has options to lay out. Each gets
       one answer box, so every measure-and-fit rule, the inline explanation
       and the reveal styling all apply unchanged — and, in a live room, that
       box holds back the answer until the reveal, or the room reads it off
       the wall. */
    if (slide.input === 'text' || slide.input === 'number') {
      var placing = slide.input === 'number';
      pad.parentNode.classList.add('is-typed');
      var hold = opts.live && !opts.revealed;
      var tw = el('div', 'opts stack typed');
      var ab = el('button', 'opt answer');
      ab.type = 'button';
      ab.dataset.choice = '0';
      if (!opts.interactive) ab.classList.add('locked');
      if (hold) ab.classList.add('held');
      var aline = el('span', 'opt-line');
      aline.appendChild(el('span', 'key', placing ? '↔' : '✎'));
      aline.appendChild(el('span', 'txt', hold
        ? (placing ? 'Placing their answers…' : 'Typing on your phones…')
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

    var wrap = el('div', 'opts' + (opts_.length > 4 || opts_.some(longOption) ? ' stack' : ''));
    opts_.forEach(function (text, i) {
      var b = el('button', 'opt');
      b.type = 'button';
      b.dataset.choice = String(i);
      if (!opts.interactive) b.classList.add('locked');

      /* key/text/tick live in their own row so the explanation can expand
         underneath them inside the same box. */
      var line = el('span', 'opt-line');
      line.appendChild(el('span', 'key', LETTERS[i] || String(i + 1)));
      line.appendChild(el('span', 'txt', text));
      line.appendChild(el('span', 'tick', i === slide.correct ? '✓' : '✗'));
      b.appendChild(line);

      if (inlineWhy && i === slide.correct) b.appendChild(whyBox());
      wrap.appendChild(b);
    });
    pad.appendChild(wrap);

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
  }

  function longOption(t) { return String(t).length > 42; }

  function layoutResults(slide, pad, opts) {
    if (slide.title) pad.appendChild(el('h2', null, slide.title));

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

  var LAYOUTS = {
    title: layoutTitle,
    section: layoutSection,
    content: layoutContent,
    cards: layoutContent,
    keywords: layoutKeywords,
    italics: layoutItalics,
    links: layoutLinks,
    split: layoutSplit,
    quote: layoutQuote,
    image: layoutImage,
    quiz: layoutQuiz,
    explain: layoutExplain,
    results: layoutResults,
    game: layoutGame
  };

  /* ------------------------------------------------------------ entry */

  /**
   * @param {object} deck
   * @param {object} slide
   * @param {object} opts  { index, total, interactive, quizNumber, marks, chrome }
   * @returns {HTMLElement} .slide element sized 1280x720
   */
  function renderSlide(deck, slide, opts) {
    opts = opts || {};
    var root = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-' + slide.type);
    root.dataset.slideId = slide.id;
    if (deck.theme === 'studio' && (slide.type === 'title' || slide.type === 'section')) {
      var art = el('div', 'studio-art');
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = '<div class="art-orbit"></div><div class="art-tile">✳</div><div class="art-dot"></div><div class="art-caption">STAY CURIOUS.</div>';
      root.appendChild(art);
    }

    var pad = el('div', 'pad');
    root.appendChild(pad);
    (LAYOUTS[slide.type] || layoutContent)(slide, pad, opts);

    if (opts.chrome !== false && deck.showSlideNumbers && opts.index != null && slide.type !== 'title') {
      root.appendChild(el('div', 'pagenum', (opts.index + 1) + ' / ' + opts.total));
    }
    if (opts.chrome !== false && SF.deckShowsLogo(deck, slide)) {
      var logo = el('div', 'slide-logo');
      var img = document.createElement('img');
      img.src = deck.logo;
      img.alt = '';
      img.draggable = false;
      logo.appendChild(img);
      root.appendChild(logo);
    }
    if (opts.chrome !== false && opts.total > 1 && opts.index != null) {
      var track = el('div', 'track');
      var i = el('i');
      i.style.width = (((opts.index + 1) / opts.total) * 100).toFixed(2) + '%';
      track.appendChild(i);
      root.appendChild(track);
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
    var scale = Math.min(bw / SF.SLIDE_W, bh / SF.SLIDE_H);
    slideEl.style.setProperty('--sf-scale', String(scale));
    /* Also on the box, because the live overlays that sit beside the slide
       rather than inside it — the Q&A cue — have to keep clear of things
       measured in slide space, and cannot read a variable set on a sibling. */
    box.style.setProperty('--sf-scale', String(scale));
    slideEl.style.transform = 'scale(' + scale + ')';
    slideEl.style.left = ((bw - SF.SLIDE_W * scale) / 2) + 'px';
    slideEl.style.top = ((bh - SF.SLIDE_H * scale) / 2) + 'px';
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
    var scale = Math.min(w / SF.SLIDE_W, h / SF.SLIDE_H);
    viewport.style.width = Math.floor(SF.SLIDE_W * scale) + 'px';
    viewport.style.height = Math.floor(SF.SLIDE_H * scale) + 'px';
    return scale;
  }


  /* ----------------------------------------------------- a question, shown */

  /* One approved question, on the wall. Deliberately plain: it is somebody's
     question being taken seriously, not a data visualisation. */
  function questionCard(deck, item) {
    var node = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-question');
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
    var node = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-feedback');
    var pad = el('div', 'pad');

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
    else foot.appendChild(el('span', 'fk-hint', 'E to close'));
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
    var root = el('div', 'scorerail fbrail theme-' + (deck.theme || 'midnight'));
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
    var joining = opts.join && opts.join.pin && opts.join.open !== false;
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
      var joining = opts.join && opts.join.pin && opts.join.open !== false;
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
      var joining = opts && opts.join && opts.join.pin && opts.join.open !== false;
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
      var joining = opts && opts.join && opts.join.pin && opts.join.open !== false;
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

    var node = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-race');
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

  /* ------------------------------------------------------- score rail */

  /** Empty rail shell. Built once per show; rows are painted into it. */
  function scoreRail(deck) {
    var root = el('div', 'scorerail theme-' + (deck.theme || 'midnight'));
    root.appendChild(el('div', 'rail-title', 'Scores'));
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
    var live = join && join.pin && join.open !== false;
    node.classList.toggle('on', !!live);
    node.classList.toggle('big', !!live && roomy);
    /* The footer line and a big panel say the same thing, and the panel says
       it better. Marked on the rail so the line can stand down rather than
       printing the PIN twice, once over the other. */
    var rail = node.closest ? node.closest('.scorerail') : null;
    if (rail) rail.classList.toggle('joining-big', !!live && roomy);
    if (!live) { node.textContent = ''; node.dataset.for = ''; return; }

    var link = join.link || join.url || '';
    var key = link + '|' + (roomy ? 'big' : 'small');
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
    side.appendChild(el('div', 'rj-lbl', roomy ? 'Point a camera here' : 'Still joining?'));
    side.appendChild(el('div', 'rj-pin', join.pin));
    if (roomy) side.appendChild(el('div', 'rj-url', join.url || ''));
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
    rail.querySelector('.rail-sub').textContent = opts.subtitle || '';
    rail.querySelector('.foot .notes').textContent = opts.footnote || '';
    paintJoinLine(rail.querySelector('.joinline'), opts.join);
    paintRailJoin(rail.querySelector('.rail-join'), opts.join, !rows.length);

    var box = rail.querySelector('.rows');

    if (!rows.length) {
      rail.dataset.density = 'lg';
      box.innerHTML = '';
      /* No "waiting for players" when the join panel is showing them how to
         stop it being true — two ways of saying the same thing, one of them
         actionable. */
      var joining = opts.join && opts.join.pin && opts.join.open !== false;
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

      node.querySelector('.sc').textContent = String(r.score);
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

    var more = box.querySelector('.more');
    if (hidden > 0) {
      if (!more) { more = el('div', 'more', ''); }
      more.textContent = '+ ' + hidden + ' more';
      order.push(more);
    } else if (more) {
      more.remove();
    }

    order.forEach(function (n) { box.appendChild(n); });
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
  }

  /** Compact "3 / 5 correct" pill for a show with no audience attached. */
  function soloScore(deck) {
    var root = el('div', 'soloscore theme-' + (deck.theme || 'midnight'));
    root.appendChild(el('span', 'lbl', 'Score'));
    root.appendChild(el('span', 'val', '0 / 0'));
    return root;
  }

  Object.assign(global.SF, {
    renderSlide: renderSlide,
    fit: fit,
    letterbox: letterbox,
    ring: ring,
    scoreRail: scoreRail,
    paintRailJoin: paintRailJoin,
    raceTrack: raceTrack,
    feedbackRail: feedbackRail,
    feedbackFocus: feedbackFocus,
    questionCard: questionCard,
    sampleFeedbackDigest: sampleFeedbackDigest,
    feedbackViewOpts: feedbackViewOpts,
    paintFeedbackRail: paintFeedbackRail,
    paintScoreRail: paintScoreRail,
    soloScore: soloScore,
    LETTERS: LETTERS,
    el: el
  });
})(window);
