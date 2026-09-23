/* Quizzes, games, and the screens either side of them, bundled through the
 * existing model entry point. Moved out of js/render.js — see
 * docs/render-split.md, step 4 of six.
 *
 * Five layouts and what they need: the question and its answer grid, the
 * results table, the explain screen, the game stage, and the join screen the
 * room points a phone at. layoutQuiz alone was 670 lines, larger than most
 * whole files in js/.
 *
 * Twelve names live here and seven leave. The five layouts are put straight
 * back into the LAYOUTS table in js/render.js, which stays a plain object
 * literal — see the note in docs/render-split.md §4.3 about why the registry
 * this step was once going to introduce turned out to be unnecessary.
 *
 * Seven helpers are injected rather than imported because they remain the
 * browser renderer's: three DOM builders, the reveal-step marker, the seeded
 * shuffle, `tint` (which itself now comes from src/render/live.js), and the
 * answer LETTERS. LETTERS is injected rather than redeclared so SF.LETTERS
 * stays the one definition; it was also the dependency the census in
 * docs/render-split.md missed, because it is referenced and never called.
 */
export function createQuizRenderer(SF, helpers) {
  const {LETTERS, asStep, el, rich, ring, stableShuffle, tint} = helpers;

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
        'Pick a game in Design & content, or this slide is skipped.'));
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
      /* The round, not the term, is what is timed. js/rounds.js runs this
         clock across the whole pile and ends the round when it runs out. */
      if (slide.roundSeconds) {
        var round = el('div', 'round-clock');
        round.setAttribute('aria-hidden', 'true');
        round.appendChild(el('span', 'rc-n', SF.clockFace ? SF.clockFace(slide.roundSeconds) : String(slide.roundSeconds)));
        var track = el('span', 'rc-track');
        track.appendChild(el('span', 'rc-fill'));
        round.appendChild(track);
        round.appendChild(el('span', 'rc-count', ''));
        oracy.appendChild(round);
      }
      if (slide.drawTotal) {
        oracy.appendChild(el('div', 'heads-pile', 'Term ' + slide.drawNo + ' of ' + slide.drawTotal));
      }
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
      /* A card drawn from a deck: the cards still to come sit behind it,
         fewer each draw, so the room can see how much is left. */
      var left = slide.drawTotal ? slide.drawTotal - slide.drawNo : 0;
      var deckEl = el('div', 'challenge-deck');
      deckEl.dataset.left = String(Math.min(3, left));
      var poster = el('div', 'challenge-poster');
      if (slide.drawTotal) poster.appendChild(el('div', 'challenge-card-no', 'Card ' + slide.drawNo));
      poster.appendChild(el('div', 'challenge-body', slide.challenge || slide.question || ''));
      deckEl.appendChild(poster);
      ch.appendChild(deckEl);
      if (slide.drawTotal) {
        ch.appendChild(el('div', 'challenge-left', left
          ? left + (left === 1 ? ' card left' : ' cards left') + ' in the deck'
          : 'Last card'));
      }
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
    /* Spot the Error: the passage is the stage, a word to a cell. No options
       and no letters — the only way to answer is to read it. Each word carries
       a tally column, so the per-word counts the relay already keeps draw as
       a heat bar under the word at the reveal; the tally is held back until
       then (slide.holdResults), or the tallest bar would point at the answer.
       The words that are wrong are marked in-error now and struck through by
       CSS once the reveal marks the first of them correct; the correction sits
       beside them, hidden until the same moment. */
    if (slide.input === 'tap') {
      pad.parentNode.classList.add('is-spot');
      var from = typeof slide.errorFrom === 'number' ? slide.errorFrom : Number(slide.correct) || 0;
      var to = typeof slide.errorTo === 'number' ? slide.errorTo : from;
      var passage = el('div', 'spot-passage tally');
      passage.dataset.errorFrom = String(from);
      passage.dataset.errorTo = String(to);
      /* Type steps down with length: a one-line claim is read from the back of
         the room; a paragraph has to fit the slide. */
      var nWords = (slide.options || []).length;
      passage.dataset.len = nWords <= 16 ? 'short' : nWords <= 36 ? 'medium' : 'long';
      (slide.options || []).forEach(function (word, i) {
        var w = el('button', 'opt spot-cell' + (i >= from && i <= to ? ' in-error' : ''));
        w.type = 'button';
        w.dataset.choice = String(i);
        if (!opts.interactive) w.classList.add('locked');
        if (opts.revealed && i === from) w.classList.add('correct');
        w.appendChild(el('span', 'spot-text', word));
        var col = el('span', 'col');
        var bar = el('span', 'bar');
        bar.style.height = '0px';
        col.appendChild(bar);
        col.appendChild(el('span', 'cnt', ''));
        w.appendChild(col);
        passage.appendChild(w);
        if (i === to && slide.fix) passage.appendChild(el('span', 'spot-fix', slide.fix));
      });
      pad.appendChild(passage);
      /* Where the room went, then why: the verdict is the moment, the reason
         is what it is for. */
      pad.appendChild(el('div', 'spot-verdict', ''));
      if (inlineWhy) {
        var sw = el('div', 'spot-why');
        sw.appendChild(whyBox());
        pad.appendChild(sw);
      }
      pad.appendChild(el('div', 'answered-count', ''));
      return;
    }

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

      /* Odd One Out: each tile carries its own share of the vote, held until
         the reveal (holdResults), drawn as heat along its foot. */
      if (present === 'oddone') {
        var col = el('span', 'col');
        col.appendChild(el('span', 'bar'));
        col.appendChild(el('span', 'cnt', ''));
        b.appendChild(col);
      }
      if (inlineWhy && i === slide.correct) b.appendChild(whyBox());
      wrap.appendChild(b);
    });
    if (present === 'oddone') {
      wrap.classList.add('tally', 'odd-heat');
      wrap.dataset.correct = String(slide.correct);
    }
    pad.appendChild(wrap);

    if (present === 'oddone') {
      if (!opts.revealed) {
        pad.appendChild(el('p', 'oddone-discuss',
          'Which one does not belong? Vote on your phone, and have your rule ready.'));
      }
      /* The reveal's sentence: the room's split against the prepared rule,
         and the next most popular pick invited to defend itself. */
      pad.appendChild(el('p', 'odd-verdict', ''));
      if (slide.explanation && !inlineWhy) pad.appendChild(whyBox());
      pad.appendChild(el('div', 'answered-count', ''));
      return;
    }

    /* True/False Showdown: the room's split, one bar across the two pads.
       Hidden until the teacher shows it; then it follows the room as phones
       switch, with a marker left where the room stood when it was shown. */
    if (slide.showdown) {
      var sd = el('div', 'showdown');
      sd.setAttribute('aria-live', 'polite');
      var sdBar = el('div', 'sd-bar');
      opts_.forEach(function (text, i) {
        var seg = el('div', 'sd-seg sd-' + i);
        seg.dataset.i = String(i);
        seg.appendChild(el('span', 'sd-label', text));
        seg.appendChild(el('span', 'sd-pct', ''));
        sdBar.appendChild(seg);
      });
      sdBar.appendChild(el('span', 'sd-was'));
      sd.appendChild(sdBar);
      sd.appendChild(el('p', 'sd-note', 'Votes are in when you are ready. Next shows the room its split.'));
      pad.appendChild(sd);
    }

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

  return {layoutExplain, layoutGame, layoutJoin, layoutQuiz, layoutResults, quizPresent, sampleJoinInfo};
}
