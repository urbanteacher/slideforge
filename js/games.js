/* SlideForge — the game engine.

   A game is settings plus a flat list of questions. It has no slides: to play
   it, SF.compileGame turns it into slides and the ordinary player runs them.
   That is also how a game embedded in a presentation works, so there is only
   one runtime to reason about.

   Two quiz breaks in one talk = two games ("Round 1", "Round 2"), each
   inserted where you want it. */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  var el = SF.el;
  var $ = function (id) { return document.getElementById(id); };
  var UI;

  var game = null;
  var sel = 0;
  var saveTimer = null;
  var historyId = null, past = [], future = [], checkpoint = null, restoring = false;

  function remember() {
    if (!game) return;
    if (historyId !== game.id) {
      historyId = game.id;
      past = [];
      future = [];
      checkpoint = JSON.stringify(game);
      return;
    }
    var now = JSON.stringify(game);
    if (!restoring && checkpoint && now !== checkpoint) {
      past.push(checkpoint);
      if (past.length > 60) past.shift();
      future = [];
    }
    checkpoint = now;
  }

  function restoreHistory(redo) {
    var from = redo ? future : past, to = redo ? past : future;
    if (!from.length) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    to.push(JSON.stringify(game));
    game = JSON.parse(from.pop());
    checkpoint = JSON.stringify(game);
    sel = Math.min(sel, game.questions.length - 1);
    restoring = true;
    touched();
    restoring = false;
    SF.Shell.syncChrome();
    draw();
  }

  /* Disposable rehearsal state for board games in the editor preview.
     Cleared when leaving demo or switching games — never written to saves. */
  var demoActive = false;
  var demoHost = null;
  var activeDemoGame = null;

  function q() { return game.questions[sel]; }
  function setupUX() { return SF.Playbook ? SF.Playbook.setupForGame(game) : { item: 'Question', prompt: 'Question', guidance: '', participation: '', timing: 'question' }; }
  function fixedPoints() { return ['speed', 'boss', 'race', 'order', 'wordreveal', 'headsup', 'spinexplain', 'connection', 'randomchallenge'].indexOf(game.style) !== -1; }

  function ensureDemoHost() {
    if (!demoHost) {
      demoHost = {
        blank: false,
        syncPresenter: function () {}
      };
    }
    return demoHost;
  }

  function unmountDemoBoards() {
    if (SF.Boards) SF.Boards.unmountAll();
  }

  function clearDemoState() {
    unmountDemoBoards();
    demoHost = null;
    activeDemoGame = null;
  }

  function setDemoActive(on) {
    demoActive = !!on;
    if (!demoActive) clearDemoState();
    var btn = $('btnDemoGame');
    var banner = $('demoBanner');
    var wrap = document.querySelector('.stage-wrap');
    if (btn) {
      btn.classList.toggle('on', demoActive);
      btn.textContent = demoActive ? '✕ Exit demo' : '▷ Try demo';
      btn.setAttribute('aria-pressed', demoActive ? 'true' : 'false');
    }
    if (banner) {
      banner.hidden = !demoActive;
      var bannerText = $('demoBannerText');
      if (bannerText) {
        var g = activeDemoGame || game;
        var entry = SF.Playbook ? SF.Playbook.forGame(g) : null;
        var title = (entry && entry.title) || (g && SF.gameStyle(g.style).label) || 'Game';
        bannerText.textContent = activeDemoGame
          ? ('Showcasing sample ' + title + ' — test how it works below, or customize your questions.')
          : ('Demo active for ' + title + ' — interactive preview mounted.');
      }
    }
    if (wrap) wrap.classList.toggle('demo-on', demoActive);
  }

  function resetDemo() {
    clearDemoState();
    if (demoActive) drawPreview();
    SF.toast('Demo reset');
  }

  function toggleDemo() {
    if (!game) return;
    if (SF.Demo && SF.Demo.active && SF.Player && SF.Player.open) {
      SF.Player.close();
      SF.toast('Demo closed');
      return;
    }
    if (demoActive) {
      setDemoActive(false);
      drawPreview();
      SF.toast('Demo closed');
      return;
    }
    var bad = problems();
    var demoGame = game;
    var usingShowcase = false;
    if (bad.length || !demoGame.questions || !demoGame.questions.length) {
      if (SF.getShowcaseGame) {
        demoGame = SF.getShowcaseGame(game, { forceSample: true });
        usingShowcase = true;
      } else {
        SF.toast(bad[0] + (bad.length > 1 ? ' (+' + (bad.length - 1) + ' more)' : ''));
        return;
      }
    }
    var kind = SF.Playbook ? SF.Playbook.demoKind(demoGame) : (isBoard() ? 'board' : 'class');
    var entry = SF.Playbook ? SF.Playbook.forGame(demoGame) : null;
    var formatTitle = (entry && entry.title) || (demoGame && SF.gameStyle(demoGame.style).label) || 'Game';

    /* Board / paper worksheets rehearse in the canvas with the real engine. */
    if (kind === 'board' || kind === 'paper' || isBoard()) {
      activeDemoGame = demoGame;
      setDemoActive(true);
      drawPreview();
      SF.toast(usingShowcase
        ? ('Showcasing sample ' + formatTitle + ' board — try it in the preview!')
        : ('Demo — ' + formatTitle + ': use the board in the preview'));
      return;
    }
    if (!usingShowcase) {
      SF.GameStore.save(game);
    }
    if (SF.Demo) {
      SF.Demo.start(SF.gameToRunDeck(demoGame), { fullscreen: false, mode: kind, showcase: usingShowcase });
    } else {
      SF.Player.start(SF.gameToRunDeck(demoGame), 0, { fullscreen: false });
    }
    SF.toast(usingShowcase
      ? ('Showcasing sample ' + formatTitle + ' — sample class joined!')
      : 'Demo uses this format’s engine — the rules are on the How to play slide');
  }

  function appendHowToPlay(parent) {
    if (!SF.Playbook || !parent) return;
    var entry = SF.Playbook.forGame(game);
    if (!entry) return;
    var box = el('details', 'howto');
    var open = false;
    try { open = localStorage.getItem('slideforge.howtoOpen') === '1'; } catch (e) {}
    box.open = open;
    var summary = el('summary', 'howto-summary');
    summary.appendChild(el('span', null, 'How to play — ' + entry.title));
    summary.appendChild(el('span', 'howto-toggle', open ? 'Hide' : 'Reveal'));
    box.appendChild(summary);
    var body = el('div', 'howto-body');
    if (entry.aim) body.appendChild(el('p', 'howto-aim', entry.aim));
    var ol = el('ol', 'howto-steps');
    (entry.howToPlay || []).forEach(function (step) {
      ol.appendChild(el('li', null, step));
    });
    body.appendChild(ol);
    var eng = el('div', 'howto-engine');
    if (entry.phases) eng.appendChild(el('div', null, 'Phases · ' + entry.phases));
    if (entry.timer) eng.appendChild(el('div', null, 'Timer · ' + entry.timer));
    if (entry.players) eng.appendChild(el('div', null, 'Players · ' + entry.players));
    if (entry.scoring) eng.appendChild(el('div', null, 'Scoring · ' + entry.scoring));
    if (entry.judgement) eng.appendChild(el('div', null, 'Judgement · ' + entry.judgement));
    if (entry.note) eng.appendChild(el('div', 'howto-note', entry.note));
    body.appendChild(eng);
    box.appendChild(body);
    box.addEventListener('toggle', function () {
      var label = box.querySelector('.howto-toggle');
      if (label) label.textContent = box.open ? 'Hide' : 'Reveal';
      try { localStorage.setItem('slideforge.howtoOpen', box.open ? '1' : '0'); } catch (e) {}
    });
    parent.appendChild(box);
  }

  function touched() {
    remember();
    SF.Shell.touch();
    var ub = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-history=undo]'));
    var rb = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-history=redo]'));
    if (ub) ub.disabled = !past.length;
    if (rb) rb.disabled = !future.length;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      SF.GameStore.save(game);
    }, 600);
  }

  /* Commit an edit that is still inside the debounce window. Called when the
     page is closing: it writes work in flight and nothing else, so closing an
     untouched document can never overwrite what is already stored. */
  function flush() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    SF.GameStore.save(game);
  }

  /* Effective values, once the game defaults are applied. */
  function effTime(question) {
    return question.timeLimit == null ? game.settings.defaultTime : question.timeLimit;
  }
  function effPoints(question) {
    return question.points == null ? game.settings.defaultPoints : question.points;
  }

  /** A question rendered as the slide it will become. Built by the same
      function the compiler uses, so the preview cannot drift from the show. */
  /* Board engines are not quiz slides: no phone options, no per-question
     timer/points UI. Low-stakes is a whole-worksheet board like bingo. */
  function isBoard() {
    return !!SF.gameStyle(game.style).boardEngine;
  }
  /* Being a board and having per-item question text are different things. A
     bowl cell asks a real question, so it keeps the generic Question field
     that the pair and term boards have no use for. */
  function showsQuestionField() {
    if (['headsup', 'spinexplain', 'connection', 'randomchallenge'].indexOf(game.style) !== -1) return false;
    if (game.style === 'definition' || game.style === 'emoji' || game.style === 'oddone' ||
        game.style === 'compare' || game.style === 'conceptchain') return false;
    return !isBoard() || SF.gameStyle(game.style).boardEngine.showsQuestion;
  }

  function asSlide(i, overrideGame) {
    var g = overrideGame || ((demoActive && activeDemoGame) ? activeDemoGame : game);
    var board = SF.gameStyle(g.style).boardEngine;
    if (board) {
      var compiled = SF.compileGame(g, { intro: false }).filter(function (slide) {
        return !!slide[board.field];
      });
      return compiled[Math.floor(i / board.setSize)] || compiled[0];
    }
    var qObj = (g.questions && (g.questions[i] || g.questions[0])) || q();
    var s = SF.fillQuestionSlide(qObj, g.style, g.settings,
      SF.makeSlide('quiz'));
    s.format = g.format || '';
    return s;
  }

  /* ------------------------------------------------------------ rail */

  function drawRail() {
    var rail = $('railList');
    if (!rail) return;
    var railEl = rail;
    railEl.innerHTML = '';
    var count = $('railCount');
    if (count) count.textContent = String(game.questions.length);

    game.questions.forEach(function (question, i) {
      var row = el('div', 'qthumb' + (i === sel ? ' sel' : ''));
      row.draggable = true;
      row.dataset.i = String(i);

      row.appendChild(el('div', 'qn', String(i + 1)));

      var body = el('div', 'qbody');
      body.appendChild(el('div', 'qtext', question.question || 'Untitled question'));

      var meta = el('div', 'qmeta');
      var style = SF.gameStyle(game.style);
      /* What to say about a question is the style's business — a typed one has
         no options to count, and this used to reach for them regardless. */
      meta.appendChild(el('span', null, style.summary(question)));
      if (game.style === 'lowstakes') {
        meta.appendChild(el('span', null, (game.settings.defaultTime || 180) + 's quiz'));
      } else {
        meta.appendChild(el('span', null,
          effTime(question) ? effTime(question) + 's' : 'no timer'));
      }
      if (question.voteOnly) meta.appendChild(el('span', 'why', '\u25cb vote only'));
      var bad = style.problems(question, i + 1);
      if (bad) meta.appendChild(el('span', 'warn', 'incomplete'));
      if (String(question.image || '').trim()) {
        meta.appendChild(el('span', 'pic', '▣ image'));
      }
      if (String(question.explanation || '').trim()) {
        meta.appendChild(el('span', 'why', '💡 why'));
      }
      body.appendChild(meta);
      row.appendChild(body);

      row.onclick = function () { select(i); };
      wireDrag(row);
      railEl.appendChild(row);
    });
  }

  function select(i) {
    sel = Math.max(0, Math.min(game.questions.length - 1, i));
    draw();
  }

  var dragFrom = null;
  function wireDrag(row) {
    row.addEventListener('dragstart', function (e) {
      dragFrom = Number(row.dataset.i);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (err) {}
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('drag-over'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('drag-over');
      var to = Number(row.dataset.i);
      if (dragFrom == null || dragFrom === to) return;
      var moved = game.questions.splice(dragFrom, 1)[0];
      game.questions.splice(to, 0, moved);
      sel = to;
      dragFrom = null;
      touched();
      draw();
    });
  }

  /* Duplicate and delete this one. The boards used to reach the inspector's
     early return before these were added, which left Backspace as the only
     way to drop a pair — findable if you knew, invisible if you did not. */
  function questionOps() {
    var ops = el('div', 'field');
    ops.style.marginTop = '14px';
    ops.appendChild(UI.button('Duplicate', null, duplicateQuestion));
    var del = UI.button('Delete', null, removeQuestion);
    del.style.marginLeft = '6px';
    ops.appendChild(del);
    return ops;
  }

  function countIncomplete() {
    var style = SF.gameStyle(game.style);
    return game.questions.reduce(function (total, question, i) {
      return total + (style.problems(question, i + 1) ? 1 : 0);
    }, 0);
  }

  function drawFoot() {
    var foot = $('railFoot');
    if (!foot) return;
    foot.innerHTML = '';

    var n = game.questions.length;
    var totalSec = game.questions.reduce(function (sum, question) {
      return sum + (effTime(question) || 0);
    }, 0);
    var mins = Math.round(totalSec / 60);
    var timeStr = totalSec ? (totalSec >= 60 ? 'about ' + mins + ' ' + (mins === 1 ? 'minute' : 'minutes') : totalSec + 's') : '';
    var bad = countIncomplete();
    var statusParts = [
      n + (n === 1 ? ' question' : ' questions'),
      timeStr,
      bad ? bad + ' incomplete' : 'all complete'
    ].filter(Boolean);

    foot.appendChild(el('p', 'hint', statusParts.join(' · ')));

    var qActions = el('div', 'rail-actions');
    var addBtn = UI.button('+ ' + setupUX().item, 'primary', addQuestion);
    addBtn.title = 'Add a question (max 2 incomplete allowed)';
    qActions.appendChild(addBtn);
    foot.appendChild(qActions);

    var itemActions = el('div', 'rail-actions');
    var dupBtn = UI.button('Duplicate', null, duplicateQuestion);
    dupBtn.title = 'Duplicate selected question';
    itemActions.appendChild(dupBtn);

    var delBtn = UI.button('Remove', null, removeQuestion);
    delBtn.title = 'Remove selected question (Backspace / Delete)';
    delBtn.disabled = game.questions.length <= 1;
    itemActions.appendChild(delBtn);
    foot.appendChild(itemActions);

    var quizActions = el('div', 'rail-actions');
    var browseBtn = UI.button('Browse quizzes', null, function () {
      if (SF.Studio && SF.Studio.openLibrary) SF.Studio.openLibrary('check');
    });
    browseBtn.title = 'Browse quiz styles and formats (Boss Battle, Horse Race, Memory, etc.)';
    quizActions.appendChild(browseBtn);

    /* Writing questions is the slow part of building a check, and it is the
       one place the model has a real brief: it is told the format, how many
       answers that engine takes, and what is already written. */
    var genBtn = UI.button('✨ Write questions', 'ghost', openGenerator);
    genBtn.title = 'Draft questions for this format from a topic. You review every one before it lands.';
    quizActions.appendChild(genBtn);
    foot.appendChild(quizActions);
  }

  /* ------------------------------------------------------ AI question draft */

  function openGenerator() {
    if (!SF.AI || !SF.AI.generateQuestionsForGame) { SF.toast('AI engine not loaded.'); return; }
    var body = $('quizGenBody');
    if (!body || !SF.Shell.openModal) return;
    body.replaceChildren();
    var close = SF.Shell.openModal('quizGenModal');

    var style = SF.gameStyle(game.style);
    var topic = UI.text(game.title && game.title !== 'Untitled quiz' ? game.title : '', function () {},
      'Photosynthesis in plants');
    var notes = UI.area('', function () {}, 2);
    notes.placeholder = 'Year 9, just covered the light-dependent stage…';
    var count = UI.select([2, 3, 4, 5, 6, 8].map(function (n) {
      return { value: String(n), label: n + ' questions' };
    }), '4', function () {});

    body.appendChild(el('p', 'hint',
      'Writing for ' + (style.label || game.style) + '. Drafts are added to the end of this quiz — ' +
      'nothing already written is touched, and you can undo.'));
    body.appendChild(UI.field('Topic', topic));
    body.appendChild(UI.field('Anything else it should know', notes, 'Optional.'));
    body.appendChild(UI.field('How many', count));

    var guard = el('p', 'hint', '');
    guard.setAttribute('role', 'status');
    var go = UI.button('✨ Write them', 'primary', function () {
      var t = String(topic.value || '').trim();
      if (!t) { guard.textContent = 'Give it a topic to write about.'; return; }
      go.disabled = true;
      guard.textContent = 'Writing…';
      Promise.resolve(SF.AI.generateQuestionsForGame(game, {
        topic: t, notes: notes.value, count: Number(count.value)
      })).then(function (res) {
        go.disabled = false;
        if (!res || res.error) { guard.textContent = res && res.error ? res.error : 'Nothing came back.'; return; }
        res.questions.forEach(function (q) { game.questions.push(q); });
        sel = game.questions.length - res.questions.length;
        touched();
        draw();
        close();
        /* Say what was dropped. A quieter "added 3" after asking for 4 is the
           kind of silence that gets noticed in front of a class. */
        SF.toast(res.rejected
          ? ('Added ' + res.questions.length + ' · ' + res.rejected + ' rejected by the format')
          : ('Added ' + res.questions.length + ' — check them before you teach'));
      }).catch(function () {
        go.disabled = false;
        guard.textContent = 'Could not write questions just now.';
      });
    });
    body.appendChild(go);
    body.appendChild(guard);
  }

  /* ------------------------------------------------------------ preview */

  function drawPreview() {
    var box = $('previewBox');
    if (!box) return;
    var boxEl = box;
    unmountDemoBoards();
    boxEl.innerHTML = '';
    var g = (demoActive && activeDemoGame) ? activeDemoGame : game;
    if (!g || !g.questions || !g.questions.length) return;
    var curQ = g.questions[sel] || g.questions[0];
    if (!curQ) return;
    var effectiveSel = Math.min(sel, g.questions.length - 1);
    var racing = SF.gameStyle(g.style).mechanic === 'race';
    var slide = asSlide(effectiveSel, g);
    var node = SF.renderSlide(g, slide, {
      index: effectiveSel,
      total: g.questions.length,
      interactive: false,
      quizNumber: effectiveSel + 1,
      chrome: false,
      /* Shown at the starting gate, so the editor previews what the room sees
         rather than a plain multiple-choice slide. */
      lanes: racing ? g.settings.teams.map(function (t, i) {
        return { key: 't' + i, name: t.name || t, color: SF.teamColor(i), pos: 0 };
      }) : null,
      trackLength: g.settings.trackLength,
      /* Memory Match board: every pair in the set as face-down tiles. */
      pairBank: (g.style === 'memorymatch' || g.style === 'memoryflip')
        ? g.questions.map(function (qq, qi) {
            return {
              term: qq.term || qq.question || '',
              active: qi === effectiveSel
            };
          })
        : null,
      /* When demo is off, boards render without commands (authoring preview).
         Demo mounts the real engine below so buttons and clocks work. */
      ...(SF.Boards && SF.Boards.renderOptions ? SF.Boards.renderOptions(demoActive ? ensureDemoHost() : null, slide) : {})
    });
    boxEl.appendChild(node);
    requestAnimationFrame(function () { SF.fit(boxEl, node); });
    if (demoActive && isBoard() && SF.Boards) {
      var host = ensureDemoHost();
      SF.Boards.mount(host, slide, node);
    }
    var notes = /** @type {HTMLTextAreaElement|null} */ ($('notes'));
    if (notes) notes.value = q() ? (q().notes || '') : '';
  }

  /* ------------------------------------------------- per-style inspectors */

  /* The data side of a style lives in SF.GAME_STYLES; this is the editing UI
     for it. Adding a style means one entry in each table. */
  var STYLE_EDITORS = {
    choice: function (insp, question) {
      var wrap = el('div');
      drawChoiceAnswers(wrap, question);
      /* A format may reword the field. Only the label and the hint: the
         control is the engine's, so there is one place answers are edited
         however many formats share it. */
      var fmt = SF.gameFormat(game.format) || {};
      insp.appendChild(UI.field(fmt.answersLabel || 'Answers — pick the correct one', wrap,
        (fmt.answersHint ? fmt.answersHint + ' ' : '') +
        'Two to six answers. Press A–F or 1–6 during the show to answer from the keyboard.'));
    },

    truefalse: function (insp, question) {
      insp.appendChild(UI.field('The statement is', UI.segmented([
        { value: 'true', icon: '✓', label: 'True' },
        { value: 'false', icon: '✗', label: 'False' }
      ], question.correct === 1 ? 'false' : 'true', function (v) {
        question.correct = v === 'false' ? 1 : 0;
        touched(); repaint();
      }),
        'Players get two answer pads. Press A or 1 for True, B or 2 for False.'));
    },

    type: function (insp, question) {
      var wrap = el('div');
      drawAcceptedAnswers(wrap, question);
      var tfmt = SF.gameFormat(game.format) || {};
      if (tfmt.answersHint) insp.appendChild(el('p', 'hint', tfmt.answersHint));
      insp.appendChild(UI.field('Accepted answers', wrap,
        'The first one is shown on screen as the answer. Add every spelling ' +
        'you will take — case, accents, punctuation and a leading "the" are ' +
        'already ignored, and "1,000" matches "1000".'));

      insp.appendChild(UI.check('Allow small spelling slips',
        question.allowTypos !== false, function (v) {
          question.allowTypos = v; touched(); repaint();
        }));
      insp.appendChild(el('p', 'hint',
        'One wrong letter in a word of five or more, two in a word of eight ' +
        'or more. Never applied to a number: 1500 is not 1600.'));
    },

    slider: function (insp, question) {
      /* Written in the order the author thinks in: what the line covers,
         where the answer sits on it, and how close counts. */
      /* Re-normalized in place after every edit, so an inverted range or an
         answer dragged off the end is corrected as it is typed rather than
         failing at showtime. normalizeQuestion() returns a copy; the style's
         own normalize() is the one that mutates. */
      var set = function (key) {
        return function (v) {
          question[key] = v == null ? 0 : v;
          SF.gameStyle('slider').normalize(question);
          touched(); repaint();
        };
      };

      var span = el('div', 'setrow');
      span.appendChild(UI.field('Line starts at', UI.num(question.min, set('min'))));
      span.appendChild(UI.field('and ends at', UI.num(question.max, set('max'))));
      insp.appendChild(UI.field('The line', span,
        'The range the room can choose from. The slider starts in the middle.'));

      var band = el('div', 'setrow');
      band.appendChild(UI.field('Answer', UI.num(question.target, set('target'))));
      band.appendChild(UI.field('Near enough is ±', UI.num(question.tolerance, set('tolerance'), 0)));
      insp.appendChild(UI.field('The answer', band,
        'Anything inside the band counts. ± 0 means the exact value only.'));

      var fine = el('div', 'setrow');
      fine.appendChild(UI.field('Unit', UI.text(question.unit, function (v) {
        question.unit = v.slice(0, 12); touched(); repaint();
      }, 'kg, %, years')));
      fine.appendChild(UI.field('Step', UI.num(question.step, set('step'), 0)));
      insp.appendChild(UI.field('Reading it', fine,
        'A symbol sits against the number (37.5%), a word sits apart from it ' +
        '(206 bones). Step is how far one nudge of the slider moves.'));

      insp.appendChild(el('p', 'hint',
        'The room never sees the answer or the band until you reveal — a ' +
        'shaded band would give it away as surely as the number would.'));
    }
  };

  /* Horse race authors identically to multiple choice — the difference is
     all in the mechanic, so it reuses that inspector rather than copying it. */
  /* Ordering. Authored top to bottom in the correct sequence, with up/down
     rather than drag — the same reasoning as on the phone, and it keeps the
     keyboard path working for anyone who cannot drag. */
  STYLE_EDITORS.order = function (insp, question) {
    var wrap = el('div');
    drawOrderItems(wrap, question);
    insp.appendChild(UI.field('Items \u2014 in the correct order', wrap,
      'Three to eight items, top first. The room is shown a shuffle, so the ' +
      'order you type here is the answer and never appears on the wall until ' +
      'you reveal it.'));
    insp.appendChild(el('p', 'hint',
      'Marked on how many items land in exactly the right place. ' +
      'Live scoring is round(10 \u00d7 that fraction) — a near miss still earns points.'));
  };

  function drawOrderItems(wrap, question) {
    wrap.innerHTML = '';
    question.options.forEach(function (text, i) {
      var row = el('div', 'opt-row');
      row.appendChild(el('span', 'ord-pos', String(i + 1)));
      row.appendChild(UI.text(text, function (v) {
        question.options[i] = v; touched(); repaint();
      }, 'Item ' + (i + 1)));

      /** @type {[string, number][]} */
      ([['\u2191', -1], ['\u2193', 1]]).forEach(function (spec) {
        var b = el('button', 'kill', spec[0]);
        b.title = spec[1] < 0 ? 'Move up' : 'Move down';
        b.disabled = (spec[1] < 0 && i === 0) || (spec[1] > 0 && i === question.options.length - 1);
        b.onclick = function () {
          var to = i + spec[1];
          var t = question.options[i];
          question.options[i] = question.options[to];
          question.options[to] = t;
          touched(); drawOrderItems(wrap, question); repaint();
        };
        row.appendChild(b);
      });

      var kill = el('button', 'kill', '\u00d7');
      kill.title = 'Remove this item';
      kill.onclick = function () {
        if (question.options.length <= 3) { SF.toast('An ordering needs at least three items'); return; }
        question.options.splice(i, 1);
        touched(); drawOrderItems(wrap, question); repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });
    if (question.options.length < 8) {
      wrap.appendChild(UI.button('+ Add item', null, function () {
        question.options.push('');
        touched(); drawOrderItems(wrap, question); repaint();
      }));
    }
  }

  /* Horse race, Beat the Clock and Boss Battle author like multiple choice —
     the difference is the room mechanic. Boss also has a difficulty per hit. */
  STYLE_EDITORS.race = STYLE_EDITORS.choice;
  STYLE_EDITORS.speed = STYLE_EDITORS.choice;
  STYLE_EDITORS.boss = function (insp, question) {
    STYLE_EDITORS.choice(insp, question);
    insp.appendChild(UI.field('Hit difficulty',
      UI.select([
        { value: 'easy', label: 'Easy · 1 damage' },
        { value: 'medium', label: 'Medium · 2 damage' },
        { value: 'hard', label: 'Hard · 3 damage' },
        { value: 'boss', label: 'Boss · 5 damage' }
      ], question.difficulty || 'medium', function (v) {
        question.difficulty = v; touched(); drawRail();
      }),
      'Damage dealt to the shared boss when the room hits this question. ' +
      'Starting HP is the sum of every question\u2019s damage.'));
  };

  STYLE_EDITORS.wordreveal = function (insp, question) {
    insp.appendChild(UI.field('Word to reveal', UI.text(question.word || '', function (v) {
      var previousWord = question.word;
      question.word = v.slice(0, 40);
      if (question.accept && SF.normalizeAnswer(question.accept[0]) === SF.normalizeAnswer(previousWord)) question.accept[0] = question.word;
      if (!question.accept || !question.accept.some(function (a) { return String(a).trim(); })) {
        question.accept = [question.word];
      }
      touched(); repaint();
    }, 'PHOTOSYNTHESIS')));
    insp.appendChild(UI.field('Hint (optional)', UI.text(question.hint || '', function (v) {
      question.hint = v.slice(0, 120); touched(); repaint();
    }, 'Shown on the wall')));
    var wrap = el('div');
    drawAcceptedAnswers(wrap, question);
    insp.appendChild(UI.field('Accepted spellings', wrap,
      'First spelling is the reveal answer. Case is ignored.'));
    insp.appendChild(UI.field('Starting letters',
      UI.select([
        { value: 'easy', label: 'Easy · 60% already shown' },
        { value: 'medium', label: 'Medium · 40% shown' },
        { value: 'hard', label: 'Hard · none shown' }
      ], question.difficulty || 'medium', function (v) {
        question.difficulty = v; touched();
      })));
    insp.appendChild(UI.field('Letter drip every',
      UI.select([
        { value: '3', label: '3 seconds' },
        { value: '5', label: '5 seconds' },
        { value: '10', label: '10 seconds' },
        { value: '15', label: '15 seconds' }
      ], String(question.dripInterval || 5), function (v) {
        question.dripInterval = Number(v); touched();
      }),
      'Fewer letters shown when they guess means a higher score (100 / 75 / 50).'));
  };

  STYLE_EDITORS.headsup = function (insp, question) {
    insp.appendChild(UI.field('Term', UI.text(question.term || '', function (v) {
      question.term = v.slice(0, 80);
      question.question = question.term;
      touched(); repaint();
    })));
    insp.appendChild(UI.field('Category (optional)', UI.text(question.category || '', function (v) {
      question.category = v.slice(0, 40); touched();
    })));
    insp.appendChild(UI.field('Hint (optional)', UI.text(question.hint || '', function (v) {
      question.hint = v.slice(0, 120); touched();
    }),
      'Host marks Correct (+1) or Pass in Teaching tools / on reveal.'));
  };

  STYLE_EDITORS.spinexplain = function (insp, question) {
    insp.appendChild(UI.field('Concept', UI.text(question.term || '', function (v) {
      question.term = v.slice(0, 80);
      question.question = question.term;
      touched(); repaint();
    })));
    insp.appendChild(UI.field('Hint (optional)', UI.text(question.hint || '', function (v) {
      question.hint = v.slice(0, 120); touched();
    }),
      'Clear +2 · with hint +1 · reject 0. Press the verdict to score.'));
  };

  STYLE_EDITORS.connection = function (insp, question) {
    insp.appendChild(UI.field('First idea', UI.text(question.itemA || '', function (v) {
      question.itemA = v.slice(0, 80); question.question = 'Connect ' + question.itemA + ' and ' + (question.itemB || ''); touched(); repaint();
    })));
    insp.appendChild(UI.field('Second idea', UI.text(question.itemB || '', function (v) {
      question.itemB = v.slice(0, 80); question.question = 'Connect ' + (question.itemA || '') + ' and ' + question.itemB; touched(); repaint();
    })));
    insp.appendChild(el('p', 'hint', 'Host Accepts a spoken bridge for +1.'));
  };

  STYLE_EDITORS.conceptchain = function (insp, question) {
    insp.appendChild(UI.field('Starting concept', UI.text(question.term || '', function (v) {
      question.term = v.slice(0, 80);
      question.question = 'Chain from: ' + question.term;
      touched(); repaint(); drawRail();
    })));
    insp.appendChild(UI.field('Definition / prompt', UI.area(question.prompt || '', function (v) {
      question.prompt = v.slice(0, 280); touched(); repaint();
    }, 3),
      'Shown under the seed on the wall while the class proposes a link.'));
    insp.appendChild(el('p', 'hint',
      'Use 3–10 starting concepts. Type the spoken link on the wall, then Accept ' +
      'to grow the chain (+1). Reject or timeout skips.'));
  };

  STYLE_EDITORS.randomchallenge = function (insp, question) {
    insp.appendChild(UI.field('Challenge', UI.area(question.challenge || '', function (v) {
      question.challenge = v.slice(0, 280);
      question.question = question.challenge;
      touched(); repaint();
    }, 4),
      'No competitive score — host marks Complete to count it.'));
  };

  /**
   * Board-wide values (study time, card size, target) live in Game settings
   * — the rail ⚙. Show the current value beside the pair so it is not
   * invisible, without a second Settings button next to that cog.
   *
   * @param {string} label  what the setting is called in Game settings
   * @param {string} value  what it is set to now
   */
  function boardSettingLink(label, value) {
    var row = el('div', 'field board-setting');
    var line = el('p', 'board-setting-readout');
    line.appendChild(el('span', null, label + ': '));
    line.appendChild(el('strong', null, value));
    row.appendChild(line);
    row.appendChild(el('p', 'hint',
      'Board-wide — change it under Game settings (⚙ at the top of the question list).'));
    return row;
  }

  /* A board setting belongs to the board, not to whichever item happens to be
     open. These three used to sit in the per-item panel and be copied across
     every question on change — which is the tell that they were in the wrong
     place. They live in Game settings now, beside the mode and the teams. */

  /** Whether the pool can fill a card. */

  STYLE_EDITORS.emoji = function (insp, question) {
    insp.appendChild(UI.field('Emoji clues', UI.text(question.clues || '', function (v) {
      question.clues = v.slice(0, 80);
      question.question = question.clues;
      touched(); repaint(); drawRail();
    }, '\ud83c\udf31 \u2600\ufe0f \ud83d\udca7 \u2192 \ud83c\udf3f'),
      'The whole prompt. Paste emoji from your keyboard picker \u2014 these go up large and nothing else does.'));
    var wrap = el('div');
    drawAcceptedAnswers(wrap, question);
    insp.appendChild(UI.field('Answers to accept', wrap,
      'The first is the one put on the wall. Add the other spellings a learner will actually type.'));
    insp.appendChild(UI.field('Hint', UI.text(question.hint || '', function (v) {
      question.hint = v.slice(0, 160); touched(); repaint();
    }), 'Offered on easy only, and only after the letter pattern.'));
    insp.appendChild(UI.field('How much help exists',
      UI.segmented([
        { value: 'easy', label: 'Pattern + hint' },
        { value: 'medium', label: 'Pattern only' },
        { value: 'hard', label: 'No help' }
      ], question.difficulty || 'medium', function (v) {
        question.difficulty = v; touched(); repaint(); drawRail(); drawInspector();
      }),
      'Help is released a press at a time while you present, not given away at the start. ' +
      'Points are the same either way \u2014 a hint is how the room gets there, not what it is worth.'));
  };

  STYLE_EDITORS.definition = function (insp, question) {
    insp.appendChild(UI.field('Passage to read', UI.area(question.passage || '', function (v) {
      question.passage = v.slice(0, 1200); touched(); repaint(); drawRail();
    }, 5),
      'Shown first. Cleared before the recall question — so the room answers from memory.'));
    insp.appendChild(UI.field('Recall question', UI.area(question.question || '', function (v) {
      question.question = v.slice(0, 400); touched(); repaint(); drawRail();
    }, 2),
      'Appears only after the passage clears.'));
    var wrap = el('div');
    drawAcceptedAnswers(wrap, question);
    insp.appendChild(UI.field('Answers to accept', wrap,
      'Typed match, case-insensitive. First spelling is shown on reveal.'));
    insp.appendChild(UI.check('Allow small spelling slips',
      question.allowTypos !== false, function (v) {
        question.allowTypos = v; touched(); repaint();
      }));
    insp.appendChild(el('p', 'hint',
      'Use 3–20 challenges. Reading time and answer time share one length under Game settings.'));
  };

  STYLE_EDITORS.oddone = function (insp, question) {
    while ((question.options || []).length < 4) question.options.push('');
    question.options = question.options.slice(0, 4);
    ['A', 'B', 'C', 'D'].forEach(function (letter, i) {
      insp.appendChild(UI.field('Item ' + letter, UI.text(question.options[i] || '', function (v) {
        question.options[i] = v.slice(0, 120); touched(); repaint(); drawRail();
      }), i === 0 ? 'Four equal tiles on the wall. Discussion happens before anything is marked.' : null));
    });
    insp.appendChild(UI.field('Prepared odd one',
      UI.segmented([
        { value: '0', label: 'A' },
        { value: '1', label: 'B' },
        { value: '2', label: 'C' },
        { value: '3', label: 'D' }
      ], String(question.correct || 0), function (v) {
        question.correct = Number(v); touched(); repaint(); drawRail();
      }),
      'For the reveal only. Accept other defensible rules the class can argue.'));
    insp.appendChild(el('p', 'hint',
      'Use 3–10 sets. No scoreboard and no phone answers — discuss, then reveal.'));
  };

  STYLE_EDITORS.compare = function (insp, question) {
    insp.appendChild(UI.field('Item A', UI.text(question.itemA || '', function (v) {
      question.itemA = v.slice(0, 80); touched(); repaint(); drawRail();
    }), 'Left tile on the wall.'));
    insp.appendChild(UI.field('Item B', UI.text(question.itemB || '', function (v) {
      question.itemB = v.slice(0, 80); touched(); repaint(); drawRail();
    }), 'Right tile on the wall.'));
    insp.appendChild(UI.field('Similarities — shown on reveal',
      UI.area(question.similarities || '', function (v) {
        question.similarities = v.slice(0, 600); touched(); drawRail();
      }, 3)));
    insp.appendChild(UI.field('Differences — shown on reveal',
      UI.area(question.differences || '', function (v) {
        question.differences = v.slice(0, 600); touched(); drawRail();
      }, 3)));
    insp.appendChild(UI.field('Category (optional)', UI.text(question.category || '', function (v) {
      question.category = v.slice(0, 40); touched(); repaint();
    }), 'Small caption above the pair when set.'));
    insp.appendChild(el('p', 'hint',
      'Use 3–10 comparisons. No scoreboard and no phone answers — discuss, then reveal.'));
  };

  /** What the authored cells add up to, said while they are being written. */

  function authorContext() {
    return { SF: SF, UI: UI, el: el, game: game, touched: touched, repaint: repaint,
      drawRail: drawRail, drawPreview: drawPreview, boardSettingLink: boardSettingLink, questionOps: questionOps };
  }

  function styleEditor(key) {
    var board = SF.gameStyle(key).boardEngine;
    if (board) return function (insp, question) { board.authorQuestion(insp, question, authorContext()); };
    return STYLE_EDITORS[key] || STYLE_EDITORS.choice;
  }

  function openSavedQuizzesPicker() {
    flush();
    if (SF.Shell && SF.Shell.openSaved) {
      SF.Shell.openSaved();
      return;
    }
    SF.Shell.picker({
      title: 'Saved quizzes & games',
      items: function () { return SF.GameStore.list(); },
      empty: 'No saved quizzes yet. Create one or browse formats.',
      describe: describe,
      onPick: function (it) {
        setDemoActive(false);
        game = SF.GameStore.get(it.id);
        sel = 0;
        historyId = game.id;
        past = [];
        future = [];
        checkpoint = JSON.stringify(game);
        SF.GameStore.save(game);
        SF.Shell.syncChrome();
        draw();
        SF.toast('Loaded "' + game.title + '"');
      },
      onDelete: function (it, done) {
        SF.ask({ title: 'Delete “' + it.title + '”?',
          detail: 'This cannot be undone.',
          confirm: 'Delete', danger: true }, function () {
            SF.GameStore.remove(it.id);
            done();
          });
      }
    });
  }

  function openQuestionBankPicker() {
    var banks = [
      {
        id: 'gk',
        title: 'General Knowledge Bank (4 questions)',
        blurb: 'Solar system, chemistry, geography, photosynthesis (Multiple Choice)',
        getQuestions: function () {
          var sg = SF.starterGame();
          return sg ? sg.questions : [];
        }
      },
      {
        id: 'bio',
        title: 'Cell Biology & Science Bank (4 questions)',
        blurb: 'Chloroplasts, respiration, enzymes, osmosis (Graduated difficulty)',
        getQuestions: function () {
          return [
            { question: 'Which organelle contains chlorophyll?', options: ['Nucleus', 'Mitochondrion', 'Chloroplast', 'Ribosome'], correct: 2, explanation: 'Chloroplasts contain chlorophyll for photosynthesis.' },
            { question: 'Which process releases energy from glucose in living cells?', options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'], correct: 1, explanation: 'Cellular respiration releases energy from glucose.' },
            { question: 'Why does an enzyme stop working above its optimum temperature?', options: ['It dissolves', 'Its active site changes shape (denatures)', 'It runs out of energy', 'It freezes'], correct: 1, explanation: 'High temperatures denature enzymes by altering their active site shape.' },
            { question: 'Explain how water moves into a plant cell placed in pure water.', options: ['Active transport', 'Osmosis down a water potential gradient', 'Diffusion of mineral salts', 'It does not move'], correct: 1, explanation: 'Water moves into plant cells by osmosis down a water potential gradient.' }
          ].map(function (row) { return SF.normalizeQuestion(Object.assign(SF.makeQuestion('choice'), row), 'choice'); });
        }
      },
      {
        id: 'oddone',
        title: 'Odd One Out Concept Bank (4 sets)',
        blurb: 'Science, ICT, and literature reasoning sets',
        getQuestions: function () {
          var st = SF.gameStyle('oddone').starters;
          return st ? JSON.parse(JSON.stringify(st)).map(function (row) {
            return SF.normalizeQuestion(Object.assign(SF.makeQuestion('oddone'), row), 'oddone');
          }) : [];
        }
      },
      {
        id: 'compare',
        title: 'Compare & Contrast Pairs (4 comparisons)',
        blurb: 'Photosynthesis/Respiration, RAM/SSD, Democracy/Dictatorship, Metaphor/Simile',
        getQuestions: function () {
          var st = SF.gameStyle('compare').starters;
          return st ? JSON.parse(JSON.stringify(st)).map(function (row) {
            return SF.normalizeQuestion(Object.assign(SF.makeQuestion('compare'), row), 'compare');
          }) : [];
        }
      },
      {
        id: 'chain',
        title: 'Concept Chain Links (4 starting concepts)',
        blurb: 'Biological hierarchy: Cell → Tissue → Organ → System',
        getQuestions: function () {
          var st = SF.gameStyle('conceptchain').starters;
          return st ? JSON.parse(JSON.stringify(st)).map(function (row) {
            return SF.normalizeQuestion(Object.assign(SF.makeQuestion('conceptchain'), row), 'conceptchain');
          }) : [];
        }
      }
    ];

    SF.Shell.picker({
      title: 'Curriculum Question Databanks',
      items: function () { return banks; },
      describe: function (b) { return b.blurb; },
      onPick: function (bank) {
        var qs = bank.getQuestions();
        if (!qs || !qs.length) {
          SF.toast('No questions available in this bank');
          return;
        }
        SF.ask({
          title: 'Add questions from "' + bank.title + '"?',
          detail: 'This will add ' + qs.length + ' prepared questions to your quiz.',
          confirm: 'Add to quiz',
          danger: false
        }, function () {
          var onlyOneBlank = game.questions.length === 1 &&
            !String(game.questions[0].question || '').trim() &&
            countIncomplete() === 1;
          if (onlyOneBlank) {
            game.questions = [];
          }
          qs.forEach(function (q) {
            var cloned = JSON.parse(JSON.stringify(q));
            cloned.id = SF.uid();
            game.questions.push(SF.normalizeQuestion(cloned, game.style));
          });
          sel = 0;
          touched();
          draw();
          SF.toast('Added ' + qs.length + ' questions from databank');
        });
      }
    });
  }

  /* ------------------------------------------------------------ inspector */

  function drawInspector() {
    var insp = $('inspector');
    if (!insp) return;
    insp.innerHTML = '';
    var question = q();
    if (!question) return;

    var historyTools = el('div', 'format-tools');
    var undo = UI.button('↶ Undo', 'ghost', function () { restoreHistory(false); });
    undo.disabled = !past.length;
    undo.dataset.history = 'undo';
    var redo = UI.button('↷ Redo', 'ghost', function () { restoreHistory(true); });
    redo.disabled = !future.length;
    redo.dataset.history = 'redo';
    historyTools.appendChild(undo);
    historyTools.appendChild(redo);

    var savedBtn = UI.button('📁 Saved', 'ghost', openSavedQuizzesPicker);
    savedBtn.title = 'Open a saved quiz or switch games';
    historyTools.appendChild(savedBtn);

    var bankBtn = UI.button('📚 Databank', 'ghost', openQuestionBankPicker);
    bankBtn.title = 'Insert questions from curriculum question databanks';
    historyTools.appendChild(bankBtn);

    insp.appendChild(historyTools);

    /* The format first, the engine second. "Question 1 — Spot the error"
       tells a teacher what they are writing; "Multiple choice" tells them
       only how it will be marked. */
    var fmt = SF.gameFormat(game.format);
    insp.appendChild(el('h4', 'insp-title',
      setupUX().item + ' ' +
      (sel + 1) + ' — ' + (fmt ? fmt.label : SF.gameStyle(game.style).label)));
    insp.appendChild(el('p', 'game-setup-cue', setupUX().guidance));
    insp.appendChild(el('p', 'hint', setupUX().participation));
    appendHowToPlay(insp);

    if (showsQuestionField()) insp.appendChild(UI.field(setupUX().prompt,
      UI.area(question.question, function (v) {
        question.question = v; touched(); repaint();
      }, 3)));

    styleEditor(game.style)(insp, question);

    /* Keep explanation with the answers — not buried under image / timing. */
    if ((!isBoard() || game.style === 'bowl') &&
        game.style !== 'compare' && game.style !== 'conceptchain') {
      insp.appendChild(UI.field('Explanation — shown after the answer is revealed',
        UI.area(question.explanation, function (v) {
          question.explanation = v; touched(); drawRail();
        }, 5),
        'Explain why the answer is right. Its placement follows Game settings. Use a blank line between paragraphs.'));
      insp.appendChild(UI.field('Source or further reading',
        UI.text(question.source, function (v) {
          question.source = v; touched();
        }, 'Optional'),
        'Printed small at the foot of the explanation slide.'));
    }

    var boardHooks = SF.gameStyle(game.style).boardEngine;
    if (boardHooks) { boardHooks.authorInspector(insp, question, authorContext()); return; }

    if (game.style === 'definition') {
      insp.appendChild(el('p', 'hint',
        'Passage first, phones closed. Ask now (or the clock) clears it and opens ' +
        'typing. Read and answer share one length under Game settings.'));
      insp.appendChild(questionOps());
      return;
    }
    if (game.style === 'oddone') {
      insp.appendChild(el('p', 'hint',
        'Four equal tiles. The class discusses which does not belong; you reveal ' +
        'the prepared odd one and explanation. No phones scoring this round.'));
      insp.appendChild(questionOps());
      return;
    }
    if (game.style === 'compare') {
      insp.appendChild(el('p', 'hint',
        'Two equal items. The class discusses alike and differ; you reveal the ' +
        'prepared similarities and differences. No phones scoring this round.'));
      insp.appendChild(questionOps());
      return;
    }
    if (game.style === 'conceptchain') {
      insp.appendChild(el('p', 'hint',
        'Propose a link aloud, type it on the wall, then Accept to grow the chain. ' +
        'Connection time is under Game settings. Phones stay idle.'));
      insp.appendChild(questionOps());
      return;
    }

    /* Per-question countdown and points. */

    var timeRow = el('div', 'setrow');
    var claimStudy = game.style === 'memoryflip' || game.style === 'memorymatch';
    var timeHint = claimStudy
      ? 'Study time above is the countdown on the slide. Points default to +1 per claim.'
      : SF.gameStyle(game.style).mechanic === 'speed'
      ? 'Leave blank to use the game default countdown (' +
        (game.settings.defaultTime || 'no timer') + 's). Points come from speed, not a fixed value.'
      : SF.gameStyle(game.style).mechanic === 'boss'
        ? 'Leave blank to use the game default countdown (' +
          (game.settings.defaultTime || 'no timer') + 's). A hit scores +1 for the player and damages the boss.'
        : ('Leave either blank to use the game default (' +
          (game.settings.defaultTime || 'no timer') + ', ' +
          game.settings.defaultPoints + ' points). 0 seconds means no countdown.');
    if (!claimStudy && setupUX().timing === 'question') {
      timeRow.appendChild(UI.field('Countdown',
        UI.num(question.timeLimit, function (v) {
          question.timeLimit = v; touched(); drawPreview(); drawRail();
        }, 0, 300, String(game.settings.defaultTime)),
        timeHint));
    }
    if (!fixedPoints()) {
      timeRow.appendChild(UI.field('Points',
        UI.num(question.points, function (v) {
          question.points = v; touched();
        }, 0, 5000, String(game.settings.defaultPoints)),
        timeHint));
    }
    if (timeRow.childNodes.length) insp.appendChild(timeRow);
    else if (claimStudy) {
      insp.appendChild(UI.field(null, null, timeHint));
    }

    /* Images live on the question, not on a separate slide, so the picture and
       the options are on screen together. */
    var imgWrap = el('div');
    imgWrap.appendChild(UI.text(question.image, function (v) {
      question.image = v.trim(); touched(); repaint();
    }, 'Paste an image URL'));

    var pick = /** @type {HTMLInputElement} */ (el('input'));
    pick.type = 'file';
    pick.accept = 'image/*';
    pick.style.cssText = 'font-size:12px;margin-top:7px';
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 2.5 * 1024 * 1024) {
        SF.toast('That image is over 2.5 MB \u2014 embedding several this size may exceed the browser storage limit.');
      }
      var fr = new FileReader();
      fr.onload = function () { question.image = typeof fr.result === 'string' ? fr.result : ''; touched(); draw(); };
      fr.readAsDataURL(f);
    });
    imgWrap.appendChild(pick);

    if (question.image) {
      var clear = UI.button('Remove image', 'ghost', function () {
        question.image = ''; question.imageAlt = ''; touched(); draw();
      });
      clear.style.cssText = 'font-size:12px;margin-top:7px;width:100%';
      imgWrap.appendChild(clear);
    }

    insp.appendChild(UI.field('Image', imgWrap,
      question.image
        ? 'Shown between the question and the answers. Embedded files are stored in the game itself.'
        : 'Optional. Paste a URL or embed a local file.'));

    if (question.image) {
      insp.appendChild(UI.field('Image layout', UI.segmented([
        { value: 'band', icon: '\u2261', label: 'Below question' },
        { value: 'first', icon: '\u25A4', label: 'Above question' },
        { value: 'overlay', icon: '\u25A3', label: 'On the image' }
      ], question.imageLayout, function (v) {
        question.imageLayout = v; touched(); repaint();
      }),
        question.imageLayout === 'overlay'
          ? 'The image leads and the question sits on it behind a gradient. It is cropped to fill the width, so this suits photographs rather than diagrams.'
          : question.imageLayout === 'first'
            ? 'The image leads and the question sits in its own space underneath it.'
            : 'The question reads first, then the image, then the answers.'));

      insp.appendChild(UI.field('Image description',
        UI.text(question.imageAlt, function (v) {
          question.imageAlt = v; touched();
        }, 'What the image shows'),
        'Used as the alt text. Worth filling in if anyone reads the quiz with a screen reader.'));
    }

    /* Peer instruction is uncommon — keep it out of the main flow. */
    var peer = el('details', 'advanced-opts');
    if (question.voteOnly) peer.open = true;
    peer.appendChild(el('summary', null, 'Peer instruction'));
    peer.appendChild(UI.check('Vote only — never show the answer',
      question.voteOnly === true, function (v) {
        question.voteOnly = v; touched(); drawRail(); repaint();
      }));
    peer.appendChild(el('p', 'hint',
      'First vote: the tally goes up, the answer does not. Duplicate this ' +
      'question for the second vote after discussion, with Vote only off.'));
    insp.appendChild(peer);

    insp.appendChild(questionOps());

    var used = SF.GameStore.usedBy(game.id);
    if (used.length) {
      var note = el('div', 'hint');
      note.style.cssText = 'padding:10px 12px;background:var(--ui-bg);border-radius:6px;line-height:1.5';
      note.textContent = 'Embedded in: ' + used.join(', ') +
        '. Changes here apply everywhere it plays.';
      insp.appendChild(note);
    }
  }

  /* The labels are indexed by option, so they have to move whenever the
     options do. Splicing one list and not the other slides every label up by
     one and quietly reattaches it to a different answer — and the report
     states a misconception as fact, so a stale label is worse than none. */
  function misconceptionsOf(question) {
    if (!Array.isArray(question.misconceptions)) question.misconceptions = [];
    while (question.misconceptions.length < question.options.length) question.misconceptions.push('');
    question.misconceptions.length = question.options.length;
    return question.misconceptions;
  }

  function drawChoiceAnswers(wrap, question) {
    wrap.innerHTML = '';
    misconceptionsOf(question);
    question.options.forEach(function (text, i) {
      var row = el('div', 'opt-row');

      var r = el('input');
      r.type = 'radio';
      r.name = 'correct-' + question.id;
      r.checked = i === question.correct;
      r.title = 'Mark as the correct answer';
      /* Redrawn, not just repainted: which rows are distractors changes with
         the answer, and so does which rows offer a misconception to name. */
      r.onchange = function () {
        question.correct = i;
        touched(); drawChoiceAnswers(wrap, question); drawPreview(); drawRail();
      };
      row.appendChild(r);

      row.appendChild(UI.text(text, function (v) {
        question.options[i] = v; touched(); repaint();
      }, 'Answer ' + SF.LETTERS[i]));

      var kill = el('button', 'kill', '×');
      kill.title = 'Remove this answer';
      kill.onclick = function () {
        if (question.options.length <= 2) { SF.toast('A question needs at least two answers'); return; }
        /* Labels first, and only then the options. misconceptionsOf() trims
           the list to the current option count, so calling it after the
           splice measures against a list already one shorter and drops the
           last label before it can move — deleting B cost D its label. */
        misconceptionsOf(question).splice(i, 1);
        question.options.splice(i, 1);
        if (question.correct >= question.options.length) {
          question.correct = question.options.length - 1;
        }
        touched(); drawChoiceAnswers(wrap, question); repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);

      /* Only on the wrong answers: the right one is not a mistake to name. */
      if (i !== question.correct) {
        var why = el('div', 'opt-why');
        why.style.margin = '2px 0 8px 26px';
        var input = UI.text(misconceptionsOf(question)[i] || '', function (v) {
          misconceptionsOf(question)[i] = v; touched();
        }, 'What picking ' + SF.LETTERS[i] + ' would mean (optional)');
        input.title = 'Named in the Adapt report if the room actually agrees on this answer';
        why.appendChild(input);
        wrap.appendChild(why);
      }
    });

    if (question.options.length < 6) {
      var add = UI.button('+ Add answer', 'ghost', function () {
        question.options.push('');
        misconceptionsOf(question);
        touched(); drawChoiceAnswers(wrap, question); drawPreview();
      });
      add.style.fontSize = '12px';
      wrap.appendChild(add);
    }
  }

  /* The typed equivalent of drawChoiceAnswers. No radio button: there is no
     "which one is correct" to mark, because they all are. */
  function drawAcceptedAnswers(wrap, question) {
    wrap.innerHTML = '';
    question.accept.forEach(function (text, i) {
      var row = el('div', 'opt-row');
      row.appendChild(el('span', 'accept-n', i === 0 ? 'ON SCREEN' : 'ALSO'));
      row.appendChild(UI.text(text, function (v) {
        question.accept[i] = v.slice(0, 200); touched(); repaint();
      }, i === 0 ? 'The answer' : 'Another spelling you will accept'));

      var kill = el('button', 'kill', '×');
      kill.title = 'Remove this spelling';
      kill.onclick = function () {
        if (question.accept.length <= 1) { SF.toast('A question needs one accepted answer'); return; }
        question.accept.splice(i, 1);
        touched(); drawAcceptedAnswers(wrap, question); repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });

    if (question.accept.length < 8) {
      var add = UI.button('+ Add another spelling', 'ghost', function () {
        question.accept.push('');
        touched(); drawAcceptedAnswers(wrap, question); drawPreview();
      });
      add.style.fontSize = '12px';
      wrap.appendChild(add);
    }
  }

  /* ------------------------------------------------------------ settings */

  /** Has anyone typed an answer that a style switch would throw away? */
  function styleAnswersWritten(g) {
    var made = SF.makeQuestion(g.style);
    return (g.questions || []).some(function (q) {
      /* Compared against a fresh question of the same style, so the seeded
         placeholders a format ships with do not count as the teacher's work.
         Only the answer side matters: the wording survives a switch. */
      var fields = ['options', 'accept', 'target', 'tolerance', 'unit'];
      return fields.some(function (k) {
        if (q[k] == null && made[k] == null) return false;
        return JSON.stringify(q[k]) !== JSON.stringify(made[k]);
      });
    });
  }

  /**
   * The look a new game should start with.
   *
   * makeGame defaults to midnight, which is right for the model and wrong
   * for the studio: a game created while the rest of the app and the deck
   * are Studio sage previewed as a dark navy panel in a light window, which
   * reads as something overriding the theme rather than as the game's own
   * setting. A new game inherits what you are already working in, and only
   * changes when you change it.
   */
  function inheritTheme() {
    var deck = SF.Editor && SF.Editor.deck && SF.Editor.deck();
    if (deck && deck.theme) return deck.theme;
    if (game && game.theme) return game.theme;
    return 'midnight';
  }

  /**
   * The slides a game generates around its content.
   *
   * Shared by every format, and rendered before the per-format settings —
   * board engines return early from those, which is how the How to play
   * toggle ended up unreachable on exactly the formats whose rules most need
   * explaining.
   *
   * @param {HTMLElement} body  settings panel
   * @param {function} draw2    redraw the panel
   */
  /** Rebuild every question on a new engine. Shared by the confirmed and
      unconfirmed paths, so they cannot drift apart. */
  function switchStyle(v, redraw) {
    game.style = v;
    game.format = '';
    game.questions = game.questions.map(function (q) {
      return SF.normalizeQuestion(q, v);
    });
    touched();
    sel = Math.min(sel, game.questions.length - 1);
    if (redraw) redraw();
    draw();
  }

  function appendGeneratedSlides(body, draw2) {
    var st = game.settings;
    body.appendChild(UI.field('Slides the game adds', (function () {
      var box = el('div');
      function gap() {
        var sp = el('div');
        sp.style.height = '7px';
        box.appendChild(sp);
      }
      box.appendChild(UI.check('Opening title slide', st.intro, function (v) {
        st.intro = v; touched(); draw2();
      }));
      gap();
      /* The rules the room sees, rather than the copy in this panel. */
      var howTo = UI.check('How to play slide', st.howTo !== false, function (v) {
        st.howTo = v; touched(); draw2();
      });
      box.appendChild(howTo);
      /* Every engine resolves to playbook copy (or _default) — never disable. */
      /* A board keeps its own tally on the board. A closing score slide would
         be a second, emptier account of the same round. */
      if (!isBoard() && ['oddone', 'compare', 'conceptchain', 'randomchallenge'].indexOf(game.style) === -1) {
        gap();
        box.appendChild(UI.check('Closing score slide', st.scoreSlide, function (v) {
          st.scoreSlide = v; touched(); draw2();
        }));
      }
      return box;
    })(), 'Generated when the game plays — you never edit them as slides. ' +
      'How to play puts this format\u2019s rules on the wall instead of leaving ' +
      'them in this panel, where only you can read them.'));
  }

  function openSettings() {
    var body = $('settingsBody');
    if (!body) return;
    var bodyEl = body;
    var st = game.settings;
    /* One sheet serves both engines now, so whoever opens it says so. */
    var title = $('settingsTitle');
    if (title) title.textContent = 'Game settings';

    function draw2() {
      bodyEl.innerHTML = '';

      bodyEl.appendChild(UI.field('Theme', SF.Shell.themePicker(game.theme, function (v) {
        ws.onTheme(v);
        draw2();
      }), 'Sets the colours for every question slide this game produces.'));

      /* Catalogue format → engine, like the old apps' slug map. Locking stops
         Beat the Clock being switched to Memory Flip while the title stays. */
      var fmt = SF.gameFormat(game.format);
      var mapped = SF.formatStyle(game.format);
      if (mapped && game.style !== mapped) {
        var prev = game.style;
        game.style = mapped;
        game.questions = game.questions.map(function (q) {
          var fresh = SF.makeQuestion(mapped);
          ['question', 'explanation', 'image', 'imageAlt', 'imageLayout',
            'notes', 'bloom', 'source', 'timeLimit', 'points', 'voteOnly'].forEach(function (k) {
            if (q[k] != null && q[k] !== '') fresh[k] = q[k];
          });
          if (q.id) fresh.id = q.id;
          return SF.normalizeQuestion(fresh, mapped);
        });
        touched();
        if (prev !== mapped) SF.toast('Restored ' + fmt.label + ' to its ' + SF.GAME_STYLES[mapped].label + ' engine');
      }

      /* Special engines (True/False, Boss…) are activities, not blank-quiz
         engines — lock them even when an older save lacks a format stamp. */
      var special = SF.isSpecialStyle && SF.isSpecialStyle(game.style);
      if (special && !game.format && SF.gameFormat(game.style)) {
        game.format = game.style;
        fmt = SF.gameFormat(game.format);
        mapped = SF.formatStyle(game.format);
        touched();
      }

      var toLib = el('p', 'hint');
      var libLink = UI.button('Browse all formats \u2192', 'ghost', function () {
        var sheet = document.getElementById('settingsModal');
        var close = sheet && /** @type {HTMLElement|null} */ (sheet.querySelector('[data-close]'));
        if (close) close.click();
        if (SF.Studio && SF.Studio.openLibrary) SF.Studio.openLibrary('check');
      });
      libLink.style.fontSize = '12px';

      if ((fmt && mapped) || special) {
        var lockStyle = mapped || game.style;
        var lockLabel = (fmt && fmt.label) || SF.GAME_STYLES[lockStyle].label;
        var locked = el('div');
        locked.appendChild(el('strong', null,
          SF.GAME_STYLES[lockStyle].icon + '  ' + lockLabel));
        locked.appendChild(el('p', 'hint',
          SF.gameStyle(lockStyle).blurb +
          ' Locked to this activity \u2014 pick another format from the library to change how it plays.'));
        bodyEl.appendChild(UI.field('Format', locked));
        toLib.appendChild(document.createTextNode('Want a different activity? '));
        toLib.appendChild(libLink);
        bodyEl.appendChild(toLib);
      } else {
        var styleKeys = (SF.CORE_STYLES || []).filter(function (k) {
          return !!SF.GAME_STYLES[k];
        });
        if (styleKeys.indexOf(game.style) < 0) styleKeys = styleKeys.concat([game.style]);
        toLib.appendChild(document.createTextNode('Core engines for a blank quiz. '));
        toLib.appendChild(libLink);
        bodyEl.appendChild(UI.field('Game style', UI.segmented(
          styleKeys.map(function (k) {
            return { value: k, icon: SF.GAME_STYLES[k].icon, label: SF.GAME_STYLES[k].label };
          }), game.style, function (v) {
            if (v === game.style) return;
            var target = SF.GAME_STYLES[v];
            if (styleAnswersWritten(game)) {
              /* The select has already moved, so put it back unless they say
                 yes — the answer arrives after this handler returns. */
              draw2();
              SF.ask({ title: 'Switch this game to “' + target.label + '”?',
                detail: 'Your question wording is kept. The answers are rebuilt to suit ' +
                  'the new style, so any you have typed will be replaced.',
                confirm: 'Switch style', danger: true }, function () {
                  switchStyle(v, draw2);
                });
              return;
            }
            switchStyle(v, draw2);
          }),
          SF.gameStyle(game.style).blurb + ' Every question in a game shares its style.'));
        bodyEl.appendChild(toLib);
      }

      appendGeneratedSlides(bodyEl, draw2);

      var boardHooks = SF.gameStyle(game.style).boardEngine;
      if (boardHooks) { boardHooks.authorSettings(bodyEl, Object.assign(authorContext(), { st: st, draw2: draw2 })); return; }

      if (game.style === 'definition') {
        if ([20, 30, 45, 60].indexOf(Number(st.defaultTime)) < 0) st.defaultTime = 30;
        bodyEl.appendChild(UI.field('Read & answer time', UI.segmented([
          { value: '20', label: '20s' },
          { value: '30', label: '30s' },
          { value: '45', label: '45s' },
          { value: '60', label: '60s' }
        ], String(st.defaultTime), function (v) {
          st.defaultTime = Number(v);
          touched(); draw2(); drawPreview(); drawRail();
        }), 'Same length for reading and for answering — the clock resets when the passage clears.'));
        bodyEl.appendChild(el('p', 'hint',
          'Phones stay closed while the passage is up. Ask now (or let the clock end) ' +
          'hides it and opens typing. Use 3–20 challenges.'));
        return;
      }

      if (game.style === 'oddone') {
        bodyEl.appendChild(el('p', 'hint',
          'No timer and no scoreboard. Use 3–10 sets. Reveal the prepared odd one ' +
          'after discussion — accept other rules the class can defend.'));
        return;
      }

      if (game.style === 'compare') {
        bodyEl.appendChild(el('p', 'hint',
          'No timer and no scoreboard. Use 3–10 comparisons. Reveal prepared ' +
          'similarities and differences after discussion.'));
        return;
      }

      if (game.style === 'conceptchain') {
        if ([30, 45, 60, 90].indexOf(Number(st.defaultTime)) < 0) st.defaultTime = 45;
        bodyEl.appendChild(UI.field('Connection time limit', UI.segmented([
          { value: '30', label: '30s' },
          { value: '45', label: '45s' },
          { value: '60', label: '1m' },
          { value: '90', label: '1m 30s' }
        ], String(st.defaultTime), function (v) {
          st.defaultTime = Number(v);
          touched(); draw2(); drawPreview(); drawRail();
        }), 'Per link. Timeout skips without scoring or growing the chain.'));
        bodyEl.appendChild(el('p', 'hint',
          'Use 3–10 starting concepts. Type the spoken link, Accept (+1) to grow ' +
          'the chain on the wall. Phones stay idle.'));
        return;
      }

      if (['headsup', 'spinexplain', 'connection', 'randomchallenge'].indexOf(game.style) !== -1) {
        bodyEl.appendChild(el('p', 'game-setup-cue', setupUX().guidance));
        bodyEl.appendChild(UI.field(game.style === 'headsup' ? 'Time per term' : game.style === 'spinexplain' ? 'Time per explanation' : 'Time per challenge',
          UI.num(st.defaultTime, function (v) {
            st.defaultTime = Math.max(0, Math.min(300, v || 0));
            touched(); drawRail(); drawPreview();
          }, 0, 300), '0 leaves the activity untimed. A question override takes precedence.'));
        var oralBook = SF.Playbook ? SF.Playbook.forGame(game) : null;
        if (oralBook && oralBook.scoring) bodyEl.appendChild(el('p', 'hint', oralBook.scoring));
        bodyEl.appendChild(el('p', 'hint', 'This is a teacher-led spoken activity. The current verdict applies to the class; there is no individual or team recipient selector.'));
        if (oralBook && oralBook.note) bodyEl.appendChild(el('p', 'hint', oralBook.note));
        return;
      }

      bodyEl.appendChild(UI.field('Score the room as', UI.segmented([
        { value: 'individual', icon: '\u{1F464}', label: 'Individual players' },
        { value: 'teams', icon: '\u{1F465}', label: 'Teams' }
      ], st.mode, function (v) {
        st.mode = v;
        if (v === 'teams' && st.teams.length < 2) {
          st.teams = SF.makeGame().settings.teams.slice(0, 2);
        }
        touched(); draw2();
      }), st.mode === 'teams'
        ? 'Players pick a team when they join. A team scores the average of its members, so team sizes can be uneven.'
        : 'Everyone is scored and ranked on their own.'));

      if (st.mode === 'teams') {
        var list = el('div');
        st.teams.forEach(function (t, i) {
          var row = el('div', 'opt-row');
          var sw = el('span');
          sw.style.cssText = 'width:16px;height:16px;border-radius:4px;flex:none;background:' +
            SF.teamColor(i);
          row.appendChild(sw);
          row.appendChild(UI.text(t.name, function (v) { t.name = v.slice(0, 20); touched(); }));
          var kill = el('button', 'kill', '×');
          kill.title = 'Remove this team';
          kill.onclick = function () {
            if (st.teams.length <= 2) { SF.toast('A team game needs at least two teams'); return; }
            st.teams.splice(i, 1);
            touched(); draw2();
          };
          row.appendChild(kill);
          list.appendChild(row);
        });
        if (st.teams.length < SF.MAX_TEAMS) {
          var add = UI.button('+ Add team', 'ghost', function () {
            st.teams.push({ name: 'Team ' + (st.teams.length + 1) });
            touched(); draw2();
          });
          add.style.fontSize = '12px';
          list.appendChild(add);
        }
        bodyEl.appendChild(UI.field('Teams — up to ' + SF.MAX_TEAMS, list,
          'The colours match the answer pads on the phones.'));
      }

      if (SF.gameStyle(game.style).mechanic === 'race') {
        bodyEl.appendChild(UI.field('Steps to the finish line',
          UI.num(st.trackLength, function (v) {
            st.trackLength = Math.max(3, Math.min(12, v || 5));
            touched();
          }, 3, 12),
          'How many correct answers it takes to win. Five is a good default \u2014 ' +
          'with fewer than about eight questions, a shorter track keeps it live to the end.'));
      }

      if (SF.gameStyle(game.style).mechanic === 'speed') {
        /* Old Beat the Clock: 30 / 60 / 90 / 120 presets. */
        if ([30, 60, 90, 120].indexOf(Number(st.defaultTime)) < 0) st.defaultTime = 60;
        st.defaultPoints = 0;
        st.confidence = false;
        bodyEl.appendChild(UI.field('Question countdown', UI.segmented([
          { value: '30', icon: '30', label: '30s' },
          { value: '60', icon: '60', label: '60s' },
          { value: '90', icon: '90', label: '90s' },
          { value: '120', icon: '120', label: '120s' }
        ], String(st.defaultTime), function (v) {
          st.defaultTime = Number(v);
          touched(); draw2(); drawRail(); drawPreview();
        }),
          'Correct answers earn 10 + floor(remaining seconds ÷ 10). Wrong answers cost 5, with a score floor of zero.'));
      } else if (game.style === 'truefalse') {
        /* Short retrieval clocks — never the Beat the Clock 30/60/90/120 set. */
        var tfTimes = [0, 10, 15, 20, 30];
        if (tfTimes.indexOf(Number(st.defaultTime)) < 0) {
          st.defaultTime = game.format === 'true-false' ? 15 : 0;
        }
        bodyEl.appendChild(UI.field('Countdown', UI.segmented([
          { value: '0', icon: '\u2014', label: 'Off' },
          { value: '10', icon: '10', label: '10s' },
          { value: '15', icon: '15', label: '15s' },
          { value: '20', icon: '20', label: '20s' },
          { value: '30', icon: '30', label: '30s' }
        ], String(st.defaultTime), function (v) {
          st.defaultTime = Number(v);
          touched(); draw2(); drawRail(); drawPreview();
        }),
          'Time allowed for each statement. Choose Off when you want to discuss before revealing.'));
        bodyEl.appendChild(UI.field('Default points',
          UI.num(st.defaultPoints, function (v) {
            st.defaultPoints = Math.max(0, v || 0); touched();
          }, 0, 5000),
          'Used by any statement that does not set its own points.'));
      } else if (SF.gameStyle(game.style).mechanic === 'boss') {
        var hp = SF.bossMaxHp(game.questions);
        bodyEl.appendChild(el('p', 'hint',
          'Boss starts at ' + hp + ' HP (sum of each question\u2019s difficulty damage). ' +
          'A hit lands when most of the room is right. Win by bringing HP to 0.'));
        var defsBoss = el('div', 'setrow');
        defsBoss.appendChild(UI.field('Default countdown',
          UI.num(st.defaultTime, function (v) {
            st.defaultTime = Math.max(0, v || 0); touched(); drawRail(); drawPreview();
          }, 0, 300)));
        bodyEl.appendChild(defsBoss);
      } else {
        var defs = el('div', 'setrow');
        if (setupUX().timing === 'question') defs.appendChild(UI.field('Default countdown',
          UI.num(st.defaultTime, function (v) {
            st.defaultTime = Math.max(0, v || 0); touched(); drawRail(); drawPreview();
          }, 0, 300)));
        if (!fixedPoints()) defs.appendChild(UI.field('Default points',
          UI.num(st.defaultPoints, function (v) {
            st.defaultPoints = Math.max(0, v || 0); touched();
          }, 0, 5000)));
        bodyEl.appendChild(defs);
        bodyEl.appendChild(el('div', 'hint',
          fixedPoints() ? 'Scoring follows this game’s rules; there is no separate points value to set.' : 'Defaults apply unless a question overrides them. Timed correct answers receive a speed bonus.'));
      }

      bodyEl.appendChild(UI.field('Scoreboard',
        UI.check('Keep the score on screen throughout', st.scoreboard, function (v) {
          st.scoreboard = v; touched(); draw2();
        }),
        st.scoreboard
          ? 'A rail down the right of every slide shows the standings, updating as answers come in.'
          : 'Standings appear only on a full-screen leaderboard between questions.'));

      bodyEl.appendChild(UI.field('Show explanations', UI.segmented([
        { value: 'inline', icon: '▸', label: 'In the answer box' },
        { value: 'slide', icon: '▤', label: 'Own slide' },
        { value: 'both', icon: '⧉', label: 'Both' }
      ], st.explainStyle, function (v) { st.explainStyle = v; touched(); draw2(); }),
        st.explainStyle === 'inline'
          ? 'On reveal the correct answer\u2019s box grows to show the reasoning, with the other answers still visible. A very long explanation hides the wrong answers to make room \u2014 pick "Own slide" if you would rather keep them on screen.'
          : st.explainStyle === 'slide'
            ? 'A full-screen slide follows each question that has an explanation \u2014 more room for long text.'
            : 'The box expands on reveal, then the next slide gives the full version.'));

      if (['speed', 'headsup', 'spinexplain', 'connection', 'randomchallenge'].indexOf(game.style) === -1) {
        bodyEl.appendChild(UI.field('After each answer', (function () {
          var box = el('div');
          box.appendChild(UI.check('Ask how sure they were', st.confidence !== false, function (v) {
            st.confidence = v; touched(); draw2();
          }));
          box.appendChild(el('div', 'hint',
            'One extra tap on the phone, after their answer is already locked in ' +
            'so it costs them no time. It never changes the score — what it ' +
            'gives you is the count of answers that were wrong and confident, ' +
            'which is a misconception to re-teach rather than a gap to practise.'));
          return box;
        })()));
      }

      bodyEl.appendChild(UI.field('Music under the thinking time', (function () {
        var box = el('div');
        box.appendChild(UI.text(st.music || '', function (v) {
          st.music = SF.safeMedia(v); touched(); draw2();
        }, 'audio/think.mp3'));
        if (st.music) {
          var vol = el('div');
          vol.style.marginTop = '9px';
          vol.appendChild(UI.field('Volume', UI.num(
            st.musicVolume == null ? 55 : st.musicVolume,
            function (v) {
              st.musicVolume = Math.max(0, Math.min(100, Number(v) || 0));
              touched(); draw2();
            }, 0, 100)));
          box.appendChild(vol);
        }
        box.appendChild(el('div', 'hint',
          'A URL or a path beside index.html. The file is not copied into the ' +
          'game \u2014 a deck that travels without it simply plays nothing.'));
        box.appendChild(el('div', 'hint',
          'It starts when a question opens and stops the moment the answer is ' +
          'revealed, so it doubles as the sound of time running out. It plays ' +
          'on the projector only; twenty phones a beat apart is not music.'));
        return box;
      })()));

      var note = el('div', 'hint');
      note.style.cssText = 'padding:10px 12px;background:var(--ui-bg);border-radius:6px;line-height:1.5';
      note.textContent = 'When this game is embedded in a presentation, these settings run the room. ' +
        'A presentation holding several games uses the first one’s teams for the whole session.';
      bodyEl.appendChild(note);
    }

    draw2();
    SF.Shell.openModal('settingsModal', function () {
      SF.GameStore.save(game);
      draw();
    });
  }

  /* ------------------------------------------------------------ question ops */

  function addQuestion() {
    if (countIncomplete() >= 2) {
      SF.toast('Complete your existing questions before adding more (maximum 2 incomplete allowed)');
      return;
    }
    if (game.style === 'lowstakes' && game.questions.length >= 10) {
      SF.toast('Low-stakes quiz can have at most 10 questions');
      return;
    }
    if (game.style === 'definition' && game.questions.length >= 20) {
      SF.toast('Definition Challenge can have at most 20 challenges');
      return;
    }
    if (game.style === 'oddone' && game.questions.length >= 10) {
      SF.toast('Odd One Out can have at most 10 sets');
      return;
    }
    if (game.style === 'compare' && game.questions.length >= 10) {
      SF.toast('Compare & Contrast can have at most 10 comparisons');
      return;
    }
    if (game.style === 'conceptchain' && game.questions.length >= 10) {
      SF.toast('Concept Chain can have at most 10 starting concepts');
      return;
    }
    var fresh = SF.makeQuestion(game.style);
    fresh.question = '';
    if (game.style === 'definition') fresh.passage = '';
    if (game.style === 'oddone') {
      fresh.question = 'Which is the odd one out — and what is the rule?';
      fresh.options = ['', '', '', ''];
      fresh.correct = 0;
      fresh.explanation = '';
    }
    if (game.style === 'compare') {
      fresh.question = 'Compare these two — how are they alike, and how do they differ?';
      fresh.itemA = '';
      fresh.itemB = '';
      fresh.similarities = '';
      fresh.differences = '';
      fresh.category = '';
    }
    if (game.style === 'conceptchain') {
      fresh.term = '';
      fresh.prompt = '';
      fresh.question = 'Chain from: …';
    }
    if (game.style === 'choice') fresh.options = ['', '', '', ''];
    game.questions.splice(sel + 1, 0, fresh);
    sel += 1;
    touched();
    draw();
  }

  function duplicateQuestion() {
    var style = SF.gameStyle(game.style);
    if (style.problems(q(), sel + 1) && countIncomplete() >= 2) {
      SF.toast('Complete your existing questions before adding more (maximum 2 incomplete allowed)');
      return;
    }
    if (game.style === 'lowstakes' && game.questions.length >= 10) {
      SF.toast('Low-stakes quiz can have at most 10 questions');
      return;
    }
    if (game.style === 'definition' && game.questions.length >= 20) {
      SF.toast('Definition Challenge can have at most 20 challenges');
      return;
    }
    if (game.style === 'oddone' && game.questions.length >= 10) {
      SF.toast('Odd One Out can have at most 10 sets');
      return;
    }
    if (game.style === 'compare' && game.questions.length >= 10) {
      SF.toast('Compare & Contrast can have at most 10 comparisons');
      return;
    }
    if (game.style === 'conceptchain' && game.questions.length >= 10) {
      SF.toast('Concept Chain can have at most 10 starting concepts');
      return;
    }
    var copy = SF.normalizeQuestion(JSON.parse(JSON.stringify(q())), game.style);
    copy.id = SF.uid();
    game.questions.splice(sel + 1, 0, copy);
    sel += 1;
    touched();
    draw();
  }

  function removeQuestion() {
    if (game.questions.length === 1) { SF.toast('A game needs at least one question'); return; }
    game.questions.splice(sel, 1);
    if (sel >= game.questions.length) sel = game.questions.length - 1;
    touched();
    draw();
  }

  /* ------------------------------------------------------------ running */

  function problems() {
    var style = SF.gameStyle(game.style);
    var found = game.questions
      .map(function (q, i) { return style.problems(q, i + 1); })
      .filter(Boolean);
    /* And whatever is only wrong about the game as a whole. */
    var board = style.board ? style.board(game) : null;
    if (board) found.push('This game ' + board);
    return found;
  }

  function play() {
    setDemoActive(false);
    SF.GameStore.save(game);
    var bad = problems();
    if (bad.length) SF.toast(bad[0] + (bad.length > 1 ? ' (+' + (bad.length - 1) + ' more)' : ''));
    SF.Player.start(SF.gameToRunDeck(game), 0);
  }

  function hostLive() {
    setDemoActive(false);
    SF.GameStore.save(game);
    var bad = problems();
    if (bad.length) SF.toast(bad[0] + (bad.length > 1 ? ' (+' + (bad.length - 1) + ' more)' : ''));
    SF.Live.host(SF.gameToRunDeck(game));
  }

  /* ------------------------------------------------------------ workspace */

  function repaint() { drawPreview(); drawRail(); }
  function draw() {
    if (game && historyId !== game.id) remember();
    drawRail();
    drawFoot();
    drawPreview();
    drawInspector();
  }

  function describe(g) {
    var n = g.questions.length;
    return SF.gameStyle(g.style).label + ' · ' +
      n + (n === 1 ? ' question' : ' questions') +
      ' · ' + (g.settings.mode === 'teams'
        ? g.settings.teams.length + ' teams'
        : 'individual') +
      ' · ' + new Date(g.modified).toLocaleString();
  }

  /* Style is chosen up front, because it decides what a question even is and
     therefore what the whole editor looks like. */
  function newGameFlow() {
    SF.Shell.picker({
      title: 'What kind of game?',
      items: function () {
        return (SF.CORE_STYLES || Object.keys(SF.GAME_STYLES)).filter(function (k) {
          return !!SF.GAME_STYLES[k];
        }).map(function (k) {
          var st = SF.GAME_STYLES[k];
          return { id: k, title: st.icon + '   ' + st.label, blurb: st.blurb };
        });
      },
      describe: function (it) { return it.blurb; },
      onPick: function (it) {
        setDemoActive(false);
        var g = SF.makeGame('Untitled ' + SF.GAME_STYLES[it.id].label.toLowerCase(), it.id);
        g.theme = inheritTheme();
        SF.GameStore.save(g);
        game = g;
        sel = 0;
        historyId = game.id;
        past = [];
        future = [];
        checkpoint = JSON.stringify(game);
        SF.Shell.syncChrome();
        draw();
        SF.toast('New ' + SF.GAME_STYLES[it.id].label.toLowerCase() + ' game');
      }
    });
  }

  var ws = {
    key: 'game',
    newDoc: newGameFlow,
    railLabel: 'Questions',
    /** Named after the things people go looking for in there. */
    get settingsLabel() {
      var extra = { bingo: 'card size', bowl: 'target score', memorymatch: 'study time',
        memoryflip: 'study time', lowstakes: 'quiz length' }[game && game.style];
      return 'Game settings — teams' + (extra ? ', ' + extra : '') + ', theme';
    },
    notesLabel: 'Question notes — visible in presenter view only',
    fileSuffix: '.sfgame.json',
    store: SF.GameStore,
    doc: function () { return game; },
    setDoc: function (g) {
      setDemoActive(false);
      game = g;
      sel = 0;
      historyId = game ? game.id : null;
      past = [];
      future = [];
      checkpoint = game ? JSON.stringify(game) : null;
    },
    blank: function () {
      var g = SF.makeGame('Untitled game', game ? game.style : 'choice');
      g.theme = inheritTheme();
      return g;
    },
    draw: draw,
    flush: flush,
    play: play,
    hostLive: hostLive,
    settings: openSettings,
    describe: describe,
    onTitle: function (v) { game.title = v || 'Untitled game'; touched(); },
    onTheme: function (v) { game.theme = v; touched(); draw(); },
    keydown: function (e) {
      /* No bare-letter shortcut adds or removes content: a stray keypress with
         the rail focused should never silently rewrite the question list.
         Backspace deletes, as it does in every slide editor. */
      if (e.key === 'Escape' && demoActive) {
        e.preventDefault();
        setDemoActive(false);
        drawPreview();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        restoreHistory(e.shiftKey);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); removeQuestion(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicateQuestion(); }
    }
  };

  function install() {
    UI = SF.Shell.UI;
    SF.Shell.register(ws);

    var all = SF.GameStore.list();
    if (!all.length) {
      game = SF.starterGame();
      SF.GameStore.save(game);
    } else {
      /* The one you had open, the way the deck engine does it. list()[0] is
         the most recently *saved* game, which is a different thing. */
      game = (SF.GameStore.lastId() && SF.GameStore.get(SF.GameStore.lastId())) || all[0];
    }
    sel = 0;

    var notesEl = /** @type {HTMLTextAreaElement|null} */ ($('notes'));
    if (notesEl) {
      notesEl.addEventListener('input', function () {
        if (SF.Shell.current() !== ws) return;
        if (notesEl && q()) {
          q().notes = notesEl.value;
          touched();
        }
      });
    }

    var btnPlay = $('btnPlay');
    if (btnPlay) btnPlay.onclick = play;
    var btnDemoGame = $('btnDemoGame');
    if (btnDemoGame) btnDemoGame.onclick = toggleDemo;
    var btnDemoReset = $('btnDemoReset');
    if (btnDemoReset) btnDemoReset.onclick = resetDemo;
    var btnDemoPlayer = $('btnDemoPlayer');
    if (btnDemoPlayer) {
      btnDemoPlayer.onclick = function () {
        var g = activeDemoGame || (problems().length ? (SF.getShowcaseGame ? SF.getShowcaseGame(game, { forceSample: true }) : game) : game);
        if (SF.Demo) SF.Demo.start(SF.gameToRunDeck(g), { fullscreen: false, mode: 'board', showcase: !!activeDemoGame });
        else if (SF.Player) SF.Player.start(SF.gameToRunDeck(g), 0, { fullscreen: false });
      };
    }
    if (SF.Player && SF.Player.on) {
      SF.Player.on('close', function () {
        var btn = $('btnDemoGame');
        if (btn && !demoActive) {
          btn.classList.remove('on');
          btn.textContent = '▷ Try demo';
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    }
    setDemoActive(false);
  }

  SF.Games = {
    install: install,
    describe: describe,
    game: function () { return game; },
    newGame: newGameFlow,
    openGame: function (id) {
      var g = SF.GameStore.get(id);
      if (!g) return;
      setDemoActive(false);
      game = g;
      sel = 0;
      historyId = game.id;
      past = [];
      future = [];
      checkpoint = JSON.stringify(game);
      /* Opening is remembered, not just editing: pick a game from the library,
         refresh without touching it, and it should still be the one on screen. */
      SF.GameStore.save(g);
      SF.Shell.syncChrome();
      draw();
    }
  };
})(window);
