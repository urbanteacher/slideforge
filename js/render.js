/* SlideForge — slide renderer.
   One function builds the DOM for a slide at true 1280x720; callers scale it.
   The same output is used for rail thumbnails, the editor preview and the
   live slideshow, so what you edit is exactly what you present. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
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
  }

  function layoutSection(slide, pad) {
    pad.appendChild(rich('h1', null, slide, 'title', slide.title || ' '));
    if (slide.subtitle) pad.appendChild(rich('div', 'sub', slide, 'subtitle', slide.subtitle));
    pad.appendChild(el('div', 'accent-bar'));
  }

  function layoutContent(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
    var ul = el('ul');
    var lines = (slide.bullets || []).map(function(text,index){return {text:text,index:index};}).filter(function (b) { return String(b.text).trim(); });
    lines.forEach(function (item) {
      var line=item.text;
      var li = asStep(rich('li', bulletTier(line) === 2 ? 'tier-2' : null, slide, 'bullets.' + item.index, bulletText(line)), slide);
      if (slide.activity && slide.type === 'cards' && line.indexOf('\t') >= 0) {
        var pair = SF.parseKeywordLine(line);
        li.replaceChildren(el('strong', 'activity-card-label', pair.term), el('span', 'activity-card-copy', pair.def));
      }
      ul.appendChild(li);
    });
    pad.appendChild(ul);
  }

  /* Bold keyword + lowercase definition — glossary / dual-coding of terms. */
  function layoutKeywords(slide, pad) {
    if (slide.title) pad.appendChild(rich('h2', null, slide, 'title', slide.title));
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
        var row = asStep(el('div', 'kw-row'), slide);
        row.appendChild(el('strong', 'kw-term', p.term || ' '));
        row.appendChild(el('span', 'kw-def', p.def || ' '));
        list.appendChild(row);
      });
    }
    pad.appendChild(list);
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
    var text = slide.body || ' ';
    if (slide.progressive) {
      var lines = String(text).split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length > 1) {
        var wrap = el('div', 'q q-build');
        lines.forEach(function (line) {
          wrap.appendChild(asStep(el('div', 'q-line', line), slide));
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

  function layoutImage(slide, pad) {
    if (slide.image) {
      var img = el('div', 'img ' + (slide.imageFit === 'contain' ? 'contain' : 'cover'));
      img.style.backgroundImage = 'url("' + String(slide.image).replace(/"/g, '&quot;') + '")';
      pad.appendChild(img);
      if (slide.title) pad.appendChild(rich('div', 'cap', slide, 'title', slide.title));
    } else {
      var e = el('div', 'empty');
      e.appendChild(el('div', null, '▣'));
      e.appendChild(el('div', null, 'Paste an image URL or drop a file in the inspector'));
      pad.appendChild(e);
    }
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
      if (slide.videoPoster) {
        still.style.backgroundImage = 'url("' + slide.videoPoster.replace(/"/g, '&quot;') + '")';
      } else {
        still.classList.add('vid-blank');
      }
      still.appendChild(el('div', 'vid-badge', '\u25b6'));
      pad.appendChild(still);
      if (slide.title) pad.appendChild(rich('div', 'cap', slide, 'title', slide.title));
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
    pad.appendChild(v);
    if (slide.title) pad.appendChild(rich('div', 'cap', slide, 'title', slide.title));
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
        ul.appendChild(asStep(rich('li', bulletTier(line) === 2 ? 'tier-2' : null, slide, 'bullets.' + item.index, bulletText(line)), slide));
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
    table: layoutTable,
    image: layoutImage,
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

  /**
   * @param {object} deck
   * @param {object} slide
   * @param {object} [opts]  { index, total, interactive, quizNumber, marks, chrome }
   * @returns {HTMLElement} .slide element sized 1280x720
   */
  function renderSlide(deck, slide, opts) {
    opts = opts || {};
    var root = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-' + slide.type);
    root.dataset.slideId = slide.id;
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
    if (deck.theme === 'studio' && (slide.type === 'title' || slide.type === 'section')) {
      var art = el('div', 'studio-art');
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = '<div class="art-orbit"></div><div class="art-tile">✳</div><div class="art-dot"></div><div class="art-caption">STAY CURIOUS.</div>';
      root.appendChild(art);
    }

    var pad = el('div', 'pad');
    root.appendChild(pad);
    if (!SF.Boards || !SF.Boards.render(pad, slide, opts, root)) (LAYOUTS[slide.type] || layoutContent)(slide, pad, opts, root);
    if (SF.Custom) SF.Custom.layout(root, slide);

    if (opts.chrome !== false && deck.showSlideNumbers && opts.index != null && slide.type !== 'title') {
      root.appendChild(el('div', 'pagenum', (opts.index + 1) + ' / ' + opts.total));
    }
    if (opts.chrome !== false && SF.deckShowsLogo(deck, slide, opts.index)) {
      var logo = el('div', 'slide-logo');
      var logoScale={small:36,medium:52,large:72}[deck.logoSize || 'medium'] || 52;
      logo.style.height=logoScale+'px';
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

  /** Shared boss HP overlay — same slot as the race track. */
  function bossBar(deck, opts) {
    opts = opts || {};
    var max = Math.max(1, Number(opts.max) || 1);
    var hp = Math.max(0, Math.min(max, Number(opts.hp) || 0));
    var pct = Math.round((hp / max) * 100);
    var node = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-boss' +
      (opts.hit ? ' boss-hit' : '') + (hp <= 0 ? ' boss-down' : ''));
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
    var node = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-wordreveal');
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
    var node = el('div', 'slide theme-' + (deck.theme || 'midnight') + ' layout-study');
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
    var root = el('div', 'scorerail theme-' + (deck.theme || 'midnight'));
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
   * @param {HTMLElement} rail
   * @param {HTMLElement} slideEl the .slide currently on screen
   */
  function railSurface(rail, slideEl) {
    if (!rail || !slideEl) return;
    var cs = getComputedStyle(slideEl);
    var img = cs.backgroundImage;
    rail.style.backgroundColor = cs.backgroundColor;
    /* A url() background is the slide's own artwork and has no business
       being tiled into a panel beside it — fall back to the flat colour. */
    rail.style.backgroundImage = img.indexOf('url(') === -1 ? img : 'none';
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
