/* Shared presenter drafting and launch service. Drafts never mutate a running lesson.
   Launch projects a spontaneous wall overlay — same spirit as a timer/break — and
   End clears it. The lasting presentation is never spliced. */
(function () {
  'use strict';
  var SF = window.SF;
  var runtimeStates = new WeakMap();
  // The lesson and room remain the same objects. Each impromptu game owns its
  // mechanic state, so a race or battle cannot take over the following lesson.
  function beforeSlide(run, slide) {
    var state = runtimeStates.get(run);
    var session = SF.Player && SF.Player.spontaneous;
    var game = (session && session.game)
      || (slide && slide.presenterActivity && (run.games || []).find(function (g) { return g.id === slide.gameId; }));
    if (!state && !game) return;
    if (!state || state.started !== SF.Player.started) {
      state = { started: SF.Player.started, current: null, base: state ? state.base : { mechanic: run.mechanic, trackLength: run.trackLength, quiz: run.quiz }, live: new Map() };
      runtimeStates.set(run, state);
    }
    var next = game ? game.id : null;
    var live = SF.Live && SF.Live.active ? SF.Live : null;
    if (state.current !== next) {
      if (live) {
        state.live.set(state.current, { mechanic: live.mechanic, trackLength: live.trackLength, pos: live.pos, winners: live.winners, bossHp: live.bossHp, bossMax: live.bossMax, raceBaseline: live.raceBaseline });
        var saved = state.live.get(next);
        if (!saved && game) {
          var hp = SF.bossMaxHp(game.questions);
          saved = { mechanic: SF.gameStyle(game.style).mechanic, trackLength: game.settings.trackLength || 5, pos: {}, winners: [], bossHp: hp, bossMax: hp, raceBaseline: Object.fromEntries((live.players || []).map(function (p) { return [p.id, p.correct || 0]; })) };
        }
        if (saved) Object.assign(live, saved);
      }
      state.current = next;
    }
    run.presenterGameId = next;
    run.mechanic = game ? SF.gameStyle(game.style).mechanic : state.base.mechanic;
    run.trackLength = game ? game.settings.trackLength : state.base.trackLength;
    run.quiz = game && !live ? Object.assign({}, state.base.quiz, { mode: game.settings.mode, teams: game.settings.teams }) : state.base.quiz;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function read(object, path) {
    var half = path.match(/^(bullets\.\d+)\.(term|def)$/);
    if (half) return SF.parseKeywordLine(read(object, half[1]) || '')[half[2]];
    return path.split('.').reduce(function (at, key) { return at == null ? undefined : at[key]; }, object);
  }
  function write(object, path, value) {
    if (path.split('.').some(function (key) { return ['__proto__', 'constructor', 'prototype'].includes(key); })) throw new Error('Invalid field.');
    var half = path.match(/^(bullets\.\d+)\.(term|def)$/);
    if (half) {
      var pair = SF.parseKeywordLine(read(object, half[1]) || '');
      pair[half[2]] = value;
      return write(object, half[1], SF.formatKeywordLine(pair.term, pair.def));
    }
    var keys = path.split('.'), last = keys.pop();
    var at = keys.reduce(function (node, key, i) {
      if (node[key] == null) node[key] = /^\d+$/.test(keys[i + 1] || last) ? [] : {};
      return node[key];
    }, object);
    at[last] = value;
  }
  function catalogue() {
    return {
      activities: SF.Activities.ACTIVITIES.filter(function (a) { return a.enabled !== false; }).map(function (a) {
        return { key: a.key, title: a.title, phase: a.phase, blurb: a.blurb };
      }),
      games: Object.keys(SF.GAME_STYLES).map(function (key) { return { key: key, title: SF.gameStyle(key).label }; }),
      saved: SF.GameStore.list().map(function (g) { return { key: g.id, title: g.title }; })
    };
  }
  async function draft(request, theme) {
    /** @type {any} */
    var result = { id: SF.uid(), title: '', game: null, slides: [], fields: [], guidance: '' };
    var activity = request.kind === 'activity' ? SF.Activities.activity(request.key) : null;
    if (request.kind === 'activity' && (!activity || activity.enabled === false)) throw new Error('Choose an available activity.');
    if (request.kind === 'saved') {
      result.game = clone(SF.GameStore.get(request.key));
      if (!result.game) throw new Error('This saved game is no longer available.');
      result.game.id = SF.uid();
    } else if (request.kind === 'game' || (activity && activity.target === 'game')) {
      var style = activity ? activity.style : request.key;
      if (!SF.GAME_STYLES[style]) throw new Error('Choose an available game.');
      var presets = SF.GAME_FORMAT_PRESETS;
      var preset = presets[style] || Object.values(presets).find(function (p) { return p.style === style; }) || {};
      if (activity) preset = Object.assign({ title: activity.title }, activity.gamePreset || {});
      result.game = SF.createPresetGame(style, clone(preset), theme, { save: false });
    } else if (activity) {
      result.slides = SF.Activities.makeSlides(activity);
      result.fields = (activity.pages || [activity]).map(function (part) { return clone(part.fields || []); });
      result.guidance = (activity.steps || []).join('\n');
    } else throw new Error('Choose a game or activity.');
    if (request.impromptu && result.game) {
      result.game.settings.intro = false;
      result.game.settings.howTo = false;
      result.game.settings.scoreSlide = false;
    }
    result.title = result.game ? result.game.title : activity.title;
    result.guidance = result.guidance || (result.game ? SF.gameStyle(result.game.style).blurb : activity.blurb);
    if (request.ai) {
      if (!String(request.topic || '').trim()) throw new Error('Give AI a topic, or use the current slide.');
      if (result.game) {
        var generated = await SF.AI.generateQuestionsForGame(result.game, { topic: request.topic, notes: request.notes, count: Math.max(1, Math.min(24, Number(request.count) || 3)) });
        if (generated.error) throw new Error(generated.error);
        result.game.questions = generated.questions;
        result.generated = { accepted: generated.questions.length, rejected: generated.rejected || 0 };
        result.title = result.game.title = request.topic;
        if (generated.rejected) result.guidance += '\n' + generated.rejected + ' unusable AI items were omitted. Check the remaining content.';
      } else {
        for (var i = 0; i < result.slides.length; i++) {
          var aiFields = result.fields[i].slice();
          var feedback = result.slides[i].feedback;
          if (feedback) {
            aiFields.push({ slide: 'feedback.prompt', label: 'Question for learner responses', type: 'text' });
            if (feedback.kind === 'poll') (feedback.options || []).forEach(function (_, n) { aiFields.push({ slide: 'feedback.options.' + n, label: 'Response option ' + (n + 1), type: 'text' }); });
          }
          var part = Object.assign({}, activity, { fields: aiFields });
          var content = await SF.AI.generateActivityContent(part, { topic: request.topic, notes: request.notes });
          if (content.error) throw new Error(content.error);
          Object.keys(content.values).forEach(function (path) { write(result.slides[i], path, content.values[path]); });
        }
      }
    }
    return result;
  }
  function prepare(raw, theme) {
    var item = clone(raw);
    if (!item || !item.id || !String(item.title || '').trim()) throw new Error('Give the activity a title.');
    var slides;
    if (item.game) {
      if (!SF.GAME_STYLES[item.game.style] || !Array.isArray(item.game.questions) || !item.game.questions.length) throw new Error('Add at least one question or item.');
      var rawEngine = SF.gameStyle(item.game.style);
      item.game.questions.forEach(function (q, i) {
        var problem = rawEngine.problems(q, i + 1);
        if (problem) throw new Error(problem);
      });
      var game = SF.normalizeGame(item.game);
      game.title = item.title;
      var engine = SF.gameStyle(game.style);
      game.questions.forEach(function (q, i) {
        var problem = engine.problems(q, i + 1);
        if (problem) throw new Error(problem);
      });
      var problem = engine.board && engine.board(game);
      if (problem) throw new Error(problem);
      item.game = game;
      slides = SF.compileGame(game, { theme: theme, intro: false, scoreSlide: false });
    } else {
      if (!Array.isArray(item.slides) || !item.slides.length) throw new Error('This activity has no slides.');
      item.slides.forEach(function (s) {
        if (s.feedback && s.feedback.enabled !== false) {
          if (!String(s.feedback.prompt || '').trim()) throw new Error('Write a question for the learner responses.');
          if (s.feedback.kind === 'poll' && (s.feedback.options || []).filter(function (o) { return String(o).trim(); }).length < 2) throw new Error('A poll needs at least two answers.');
        }
      });
      slides = item.slides.map(function (s) { return SF.normalizeSlide(s); });
      slides.forEach(function (s, i) {
        (item.fields[i] || []).forEach(function (field) {
          if (field.type !== 'minutes' && !String(read(s, field.slide) || '').trim()) throw new Error('Page ' + (i + 1) + ': fill in ' + field.label + '.');
        });
      });
      item.slides = slides;
    }
    if (!slides.length) throw new Error('Nothing to show yet.');
    return { item: item, slides: slides };
  }
  function endOverlay(player) {
    if (!player.spontaneous) throw new Error('Nothing is showing on the wall.');
    player.endSpontaneous();
    return { message: 'Back on the lesson slide.', showing: false };
  }
  async function handle(request) {
    var player = SF.Player, run = player.deck, started = player.started;
    if (!player.open || !run) throw new Error('Start presenting a lesson first.');
    if (request.action === 'catalogue') return catalogue();
    if (request.action === 'draft') {
      var item = await draft(request, run.theme);
      if (!player.open || player.deck !== run || player.started !== started) throw new Error('The lesson changed while writing. Create a new draft for this lesson.');
      item.runStarted = started;
      return { draft: item };
    }
    if (request.action === 'end' || request.action === 'return') return endOverlay(player);
    if (!request.draft || request.draft.runStarted !== started) throw new Error('This draft belongs to an earlier lesson. Create a new draft.');
    var working = clone(request.draft);
    // Board teams match the existing live room; launching never rehosts it.
    if (working.game && SF.Live && SF.Live.active) {
      working.game.settings.mode = SF.Live.mode;
      working.game.settings.teams = clone(SF.Live.teams || []);
    }
    var ready = prepare(working, run.theme);
    if (request.action === 'preview') return { slides: ready.slides, theme: run.theme };
    if (request.action === 'save') {
      var doc = ready.item.game;
      var store = SF.GameStore;
      if (!doc) { doc = SF.makeDeck(ready.item.title); doc.id = ready.item.id; doc.slides = ready.slides; store = SF.Store; }
      if (!store.save(doc)) throw new Error('Could not save on this device. Your draft is still here.');
      return { message: ready.item.game ? 'Saved to your quiz library.' : 'Saved as a reusable lesson in your library.' };
    }
    /* queue is an alias for launch — spontaneous overlays are never queued into the deck. */
    if (request.action !== 'launch' && request.action !== 'queue') throw new Error('Unknown activity action.');
    if (!player.openSpontaneous) throw new Error('This show cannot project a spontaneous activity.');
    var before = run.slides.length;
    var lessonIdx = player.idx;
    ready.slides.forEach(function (s) {
      s.presenterActivity = ready.item.id;
      if (ready.item.game) s.gameId = ready.item.game.id;
    });
    player.openSpontaneous({
      id: ready.item.id,
      title: ready.item.title,
      slides: ready.slides,
      game: ready.item.game || null
    });
    if (run.slides.length !== before || player.idx !== lessonIdx) {
      throw new Error('Spontaneous show must not change the lesson.');
    }
    player.syncPresenter();
    return {
      message: 'On the wall now. End (or Esc) to return to the lesson — nothing was added to the presentation.',
      inserted: false,
      showing: true
    };
  }
  SF.LiveActivities = { beforeSlide: beforeSlide, catalogue: catalogue, draft: draft, prepare: prepare, handle: handle, read: read, write: write };
})();
