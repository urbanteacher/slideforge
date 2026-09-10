/* SlideForge — the game engine.

   A game is settings plus a flat list of questions. It has no slides: to play
   it, SF.compileGame turns it into slides and the ordinary player runs them.
   That is also how a game embedded in a presentation works, so there is only
   one runtime to reason about.

   Two quiz breaks in one talk = two games ("Round 1", "Round 2"), each
   inserted where you want it. */
(function (global) {
  'use strict';

  var SF = global.SF;
  var el = SF.el;
  var $ = function (id) { return document.getElementById(id); };
  var UI;

  var game = null;
  var sel = 0;
  var saveTimer = null;

  function q() { return game.questions[sel]; }

  function touched() {
    SF.Shell.touch();
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
  function asSlide(i) {
    return SF.fillQuestionSlide(game.questions[i], game.style, game.settings,
      SF.makeSlide('quiz'));
  }

  /* ------------------------------------------------------------ rail */

  function drawRail() {
    var rail = $('railList');
    rail.innerHTML = '';
    $('railCount').textContent = String(game.questions.length);

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
      meta.appendChild(el('span', null,
        effTime(question) ? effTime(question) + 's' : 'no timer'));
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
      rail.appendChild(row);
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

  function drawFoot() {
    var foot = $('railFoot');
    foot.innerHTML = '';
    foot.appendChild(UI.button('+ Question', null, addQuestion));
    foot.appendChild(UI.button('Duplicate', null, duplicateQuestion));
  }

  /* ------------------------------------------------------------ preview */

  function drawPreview() {
    var box = $('previewBox');
    box.innerHTML = '';
    if (!q()) return;
    var racing = SF.gameStyle(game.style).mechanic === 'race';
    var node = SF.renderSlide(game, asSlide(sel), {
      index: sel,
      total: game.questions.length,
      interactive: false,
      quizNumber: sel + 1,
      chrome: false,
      /* Shown at the starting gate, so the editor previews what the room sees
         rather than a plain multiple-choice slide. */
      lanes: racing ? game.settings.teams.map(function (t, i) {
        return { key: 't' + i, name: t.name || t, color: SF.teamColor(i), pos: 0 };
      }) : null,
      trackLength: game.settings.trackLength
    });
    box.appendChild(node);
    requestAnimationFrame(function () { SF.fit(box, node); });
    $('notes').value = q().notes || '';
  }

  /* ------------------------------------------------- per-style inspectors */

  /* The data side of a style lives in SF.GAME_STYLES; this is the editing UI
     for it. Adding a style means one entry in each table. */
  var STYLE_EDITORS = {
    choice: function (insp, question) {
      var wrap = el('div');
      drawChoiceAnswers(wrap, question);
      insp.appendChild(UI.field('Answers — pick the correct one', wrap,
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
  STYLE_EDITORS.race = STYLE_EDITORS.choice;

  function styleEditor(key) {
    return STYLE_EDITORS[key] || STYLE_EDITORS.choice;
  }

  /* ------------------------------------------------------------ inspector */

  function drawInspector() {
    var insp = $('inspector');
    insp.innerHTML = '';
    var question = q();
    if (!question) return;

    insp.appendChild(el('h4', 'insp-title',
      'Question ' + (sel + 1) + ' — ' + SF.gameStyle(game.style).label));

    insp.appendChild(UI.field('Question',
      UI.area(question.question, function (v) {
        question.question = v; touched(); repaint();
      }, 3)));

    styleEditor(game.style)(insp, question);

    var timeRow = el('div', 'setrow');
    timeRow.appendChild(UI.field('Countdown',
      UI.num(question.timeLimit, function (v) {
        question.timeLimit = v; touched(); drawPreview(); drawRail();
      }, 0, 300, String(game.settings.defaultTime))));
    timeRow.appendChild(UI.field('Points',
      UI.num(question.points, function (v) {
        question.points = v; touched();
      }, 0, 5000, String(game.settings.defaultPoints))));
    insp.appendChild(timeRow);
    insp.appendChild(el('div', 'hint',
      'Leave either blank to use the game default (' +
      (game.settings.defaultTime || 'no timer') + ', ' +
      game.settings.defaultPoints + ' points). 0 seconds means no countdown.'));

    /* Images live on the question, not on a separate slide, so the picture and
       the options are on screen together. */
    var imgWrap = el('div');
    imgWrap.appendChild(UI.text(question.image, function (v) {
      question.image = v.trim(); touched(); repaint();
    }, 'Paste an image URL'));

    var pick = el('input');
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
      fr.onload = function () { question.image = fr.result; touched(); draw(); };
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

    insp.appendChild(UI.field('Explanation — shown after the answer is revealed',
      UI.area(question.explanation, function (v) {
        question.explanation = v; touched(); drawRail();
      }, 5),
      'Optional. Adds a full-screen slide after this question with the reasoning, ' +
      'and sends it to the players\u2019 phones with their result. Leave a blank line ' +
      'between paragraphs.'));

    insp.appendChild(UI.field('Source or further reading',
      UI.text(question.source, function (v) {
        question.source = v; touched();
      }, 'Optional'),
      'Printed small at the foot of the explanation slide.'));

    var ops = el('div', 'field');
    ops.style.marginTop = '14px';
    ops.appendChild(UI.button('Duplicate', null, duplicateQuestion));
    var del = UI.button('Delete', null, removeQuestion);
    del.style.marginLeft = '6px';
    ops.appendChild(del);
    insp.appendChild(ops);

    var used = SF.GameStore.usedBy(game.id);
    if (used.length) {
      var note = el('div', 'hint');
      note.style.cssText = 'padding:10px 12px;background:var(--ui-bg);border-radius:6px;line-height:1.5';
      note.textContent = 'Embedded in: ' + used.join(', ') +
        '. Changes here apply everywhere it plays.';
      insp.appendChild(note);
    }
  }

  function drawChoiceAnswers(wrap, question) {
    wrap.innerHTML = '';
    question.options.forEach(function (text, i) {
      var row = el('div', 'opt-row');

      var r = el('input');
      r.type = 'radio';
      r.name = 'correct-' + question.id;
      r.checked = i === question.correct;
      r.title = 'Mark as the correct answer';
      r.onchange = function () { question.correct = i; touched(); drawPreview(); drawRail(); };
      row.appendChild(r);

      row.appendChild(UI.text(text, function (v) {
        question.options[i] = v; touched(); repaint();
      }, 'Answer ' + SF.LETTERS[i]));

      var kill = el('button', 'kill', '×');
      kill.title = 'Remove this answer';
      kill.onclick = function () {
        if (question.options.length <= 2) { SF.toast('A question needs at least two answers'); return; }
        question.options.splice(i, 1);
        if (question.correct >= question.options.length) {
          question.correct = question.options.length - 1;
        }
        touched(); drawChoiceAnswers(wrap, question); repaint();
      };
      row.appendChild(kill);
      wrap.appendChild(row);
    });

    if (question.options.length < 6) {
      var add = UI.button('+ Add answer', 'ghost', function () {
        question.options.push('');
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

  function openSettings() {
    var body = $('settingsBody');
    var st = game.settings;

    function draw2() {
      body.innerHTML = '';

      /* Switching style is offered but confirmed: the question text survives,
         the answers are rebuilt by the new style's normalizer. */
      var styleKeys = Object.keys(SF.GAME_STYLES);
      body.appendChild(UI.field('Game style', UI.segmented(
        styleKeys.map(function (k) {
          return { value: k, icon: SF.GAME_STYLES[k].icon, label: SF.GAME_STYLES[k].label };
        }), game.style, function (v) {
          if (v === game.style) return;
          var target = SF.GAME_STYLES[v];
          if (!confirm('Switch this game to "' + target.label + '"?\n\n' +
                       'Your question wording is kept. The answers are rebuilt to suit ' +
                       'the new style, so any you have typed will be replaced.')) {
            draw2();
            return;
          }
          game.style = v;
          game.questions = game.questions.map(function (q) {
            return SF.normalizeQuestion(q, v);
          });
          touched();
          sel = Math.min(sel, game.questions.length - 1);
          draw2();
          draw();
        }),
        SF.gameStyle(game.style).blurb + ' Every question in a game shares its style.'));

      body.appendChild(UI.field('Score the room as', UI.segmented([
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
        body.appendChild(UI.field('Teams — up to ' + SF.MAX_TEAMS, list,
          'The colours match the answer pads on the phones.'));
      }

      if (SF.gameStyle(game.style).mechanic === 'race') {
        body.appendChild(UI.field('Steps to the finish line',
          UI.num(st.trackLength, function (v) {
            st.trackLength = Math.max(3, Math.min(12, v || 5));
            touched();
          }, 3, 12),
          'How many correct answers it takes to win. Five is a good default \u2014 ' +
          'with fewer than about eight questions, a shorter track keeps it live to the end.'));
      }

      var defs = el('div', 'setrow');
      defs.appendChild(UI.field('Default countdown',
        UI.num(st.defaultTime, function (v) {
          st.defaultTime = Math.max(0, v || 0); touched(); drawRail(); drawPreview();
        }, 0, 300)));
      defs.appendChild(UI.field('Default points',
        UI.num(st.defaultPoints, function (v) {
          st.defaultPoints = Math.max(0, v || 0); touched();
        }, 0, 5000)));
      body.appendChild(defs);
      body.appendChild(el('div', 'hint',
        'Used by any question that does not set its own. Faster correct answers score closer to the full value.'));

      body.appendChild(UI.field('Scoreboard',
        UI.check('Keep the score on screen throughout', st.scoreboard, function (v) {
          st.scoreboard = v; touched(); draw2();
        }),
        st.scoreboard
          ? 'A rail down the right of every slide shows the standings, updating as answers come in.'
          : 'Standings appear only on a full-screen leaderboard between questions.'));

      body.appendChild(UI.field('Show explanations', UI.segmented([
        { value: 'inline', icon: '▸', label: 'In the answer box' },
        { value: 'slide', icon: '▤', label: 'Own slide' },
        { value: 'both', icon: '⧉', label: 'Both' }
      ], st.explainStyle, function (v) { st.explainStyle = v; touched(); draw2(); }),
        st.explainStyle === 'inline'
          ? 'On reveal the correct answer\u2019s box grows to show the reasoning, with the other answers still visible. A very long explanation hides the wrong answers to make room \u2014 pick "Own slide" if you would rather keep them on screen.'
          : st.explainStyle === 'slide'
            ? 'A full-screen slide follows each question that has an explanation \u2014 more room for long text.'
            : 'The box expands on reveal, then the next slide gives the full version.'));

      body.appendChild(UI.field('After each answer', (function () {
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

      body.appendChild(UI.field('Slides the game adds', (function () {
        var box = el('div');
        box.appendChild(UI.check('Opening title slide', st.intro, function (v) {
          st.intro = v; touched(); draw2();
        }));
        var sp = el('div');
        sp.style.height = '7px';
        box.appendChild(sp);
        box.appendChild(UI.check('Closing score slide', st.scoreSlide, function (v) {
          st.scoreSlide = v; touched(); draw2();
        }));
        return box;
      })(), 'Both are generated when the game plays — you never edit them as slides.'));

      var note = el('div', 'hint');
      note.style.cssText = 'padding:10px 12px;background:var(--ui-bg);border-radius:6px;line-height:1.5';
      note.textContent = 'When this game is embedded in a presentation, these settings run the room. ' +
        'A presentation holding several games uses the first one’s teams for the whole session.';
      body.appendChild(note);
    }

    draw2();
    SF.Shell.openModal('settingsModal', function () {
      SF.GameStore.save(game);
      draw();
    });
  }

  /* ------------------------------------------------------------ question ops */

  function addQuestion() {
    var fresh = SF.makeQuestion(game.style);
    fresh.question = '';
    if (game.style === 'choice') fresh.options = ['', '', '', ''];
    game.questions.splice(sel + 1, 0, fresh);
    sel += 1;
    touched();
    draw();
  }

  function duplicateQuestion() {
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
    return game.questions
      .map(function (q, i) { return style.problems(q, i + 1); })
      .filter(Boolean);
  }

  function play() {
    SF.GameStore.save(game);
    var bad = problems();
    if (bad.length) SF.toast(bad[0] + (bad.length > 1 ? ' (+' + (bad.length - 1) + ' more)' : ''));
    SF.Player.start(SF.gameToRunDeck(game), 0);
  }

  function hostLive() {
    SF.GameStore.save(game);
    var bad = problems();
    if (bad.length) SF.toast(bad[0] + (bad.length > 1 ? ' (+' + (bad.length - 1) + ' more)' : ''));
    SF.Live.host(SF.gameToRunDeck(game));
  }

  /* ------------------------------------------------------------ workspace */

  function repaint() { drawPreview(); drawRail(); }
  function draw() { drawRail(); drawFoot(); drawPreview(); drawInspector(); }

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
        return Object.keys(SF.GAME_STYLES).map(function (k) {
          var st = SF.GAME_STYLES[k];
          return { id: k, title: st.icon + '   ' + st.label, blurb: st.blurb };
        });
      },
      describe: function (it) { return it.blurb; },
      onPick: function (it) {
        var g = SF.makeGame('Untitled ' + SF.GAME_STYLES[it.id].label.toLowerCase(), it.id);
        SF.GameStore.save(g);
        game = g;
        sel = 0;
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
    notesLabel: 'Question notes — visible in presenter view only',
    fileSuffix: '.sfgame.json',
    store: SF.GameStore,
    doc: function () { return game; },
    setDoc: function (g) { game = g; sel = 0; },
    blank: function () { return SF.makeGame('Untitled game', game ? game.style : 'choice'); },
    draw: draw,
    flush: flush,
    play: play,
    hostLive: hostLive,
    describe: describe,
    onTitle: function (v) { game.title = v || 'Untitled game'; touched(); },
    onTheme: function (v) { game.theme = v; touched(); draw(); },
    keydown: function (e) {
      /* No bare-letter shortcut adds or removes content: a stray keypress with
         the rail focused should never silently rewrite the question list.
         Backspace deletes, as it does in every slide editor. */
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
      game = all[0];
    }
    sel = 0;

    $('notes').addEventListener('input', function () {
      if (SF.Shell.current() !== ws) return;
      q().notes = $('notes').value;
      touched();
    });

    $('btnPlay').onclick = play;
    $('btnGameSettings').onclick = openSettings;
  }

  SF.Games = {
    install: install,
    describe: describe,
    game: function () { return game; },
    newGame: newGameFlow,
    openGame: function (id) {
      var g = SF.GameStore.get(id);
      if (!g) return;
      game = g;
      sel = 0;
      SF.Shell.syncChrome();
      draw();
    }
  };
})(window);
