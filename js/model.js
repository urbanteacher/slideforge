/* SlideForge — deck data model, slide factories, local storage.
   Base slide geometry is 1280x720 (16:9); everything renders into that box
   and is scaled with a CSS transform, exactly like a PowerPoint slideshow. */
(function (global) {
  'use strict';

  var SLIDE_W = 1280;
  var SLIDE_H = 720;

  var THEMES = {
    midnight: { name: 'Midnight', swatch: '#1b2a4a' },
    paper:    { name: 'Paper',    swatch: '#f4f1ea' },
    ocean:    { name: 'Ocean',    swatch: '#0d5c63' },
    ember:    { name: 'Ember',    swatch: '#3d1b2a' },
    mono:     { name: 'Mono',     swatch: '#111111' }
  };

  var TRANSITIONS = ['none', 'fade', 'push', 'zoom', 'wipe'];

  /* Team colours line up with the coloured answer pads on the phones. */
  var TEAM_COLORS = ['#e8474f', '#2b7ce9', '#e8a020', '#29a86b', '#8b5cf0', '#d4477f'];
  var MAX_TEAMS = 6;

  function teamColor(i) { return TEAM_COLORS[i % TEAM_COLORS.length]; }

  /* How a live quiz is played. Deck-level, because it has to be the same for
     every question in the deck. */
  function makeQuizConfig() {
    return {
      mode: 'individual',        // 'individual' | 'teams'
      teams: [{ name: 'Red' }, { name: 'Blue' }, { name: 'Green' }, { name: 'Yellow' }],
      scoreboard: true           // keep the running score on screen
    };
  }

  function normalizeQuizConfig(raw) {
    var q = Object.assign(makeQuizConfig(), raw || {});
    if (q.mode !== 'teams') q.mode = 'individual';
    q.teams = (Array.isArray(q.teams) ? q.teams : [])
      .map(function (t) {
        return { name: String((typeof t === 'string' ? t : (t && t.name)) || '').trim().slice(0, 20) };
      })
      .filter(function (t) { return t.name; })
      .slice(0, MAX_TEAMS);
    // de-duplicate, case-insensitively: two "Red"s would be unpickable
    var seen = {};
    q.teams = q.teams.filter(function (t) {
      var k = t.name.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    if (q.mode === 'teams' && q.teams.length < 2) {
      q.teams = makeQuizConfig().teams.slice(0, 2);
    }
    q.scoreboard = q.scoreboard !== false;
    return q;
  }

  /* Every slide kind the runtime can render. `quiz` and `results` are not
     authored in the presentation editor any more — they are produced by
     compiling a game — but the player and renderer still handle them, which is
     what lets an embedded game expand into ordinary slides at showtime. */
  var SLIDE_TYPES = {
    title:   { label: 'Title',        icon: 'T' },
    section: { label: 'Section',      icon: 'S' },
    content: { label: 'Bullets',      icon: '•' },
    image:   { label: 'Image',        icon: '▣' },
    quote:   { label: 'Quote',        icon: '“' },
    game:    { label: 'Game',         icon: '◈' },
    quiz:    { label: 'Quiz',         icon: '?' },
    explain: { label: 'Explanation',  icon: '💡' },
    results: { label: 'Score',        icon: '⚑' }
  };

  /* The layouts offered in the presentation editor's Layout grid. */
  var DECK_TYPES = ['title', 'section', 'content', 'image', 'quote'];

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function makeSlide(type) {
    var s = {
      id: uid(),
      type: type || 'content',
      title: '',
      subtitle: '',
      body: '',
      bullets: [],
      notes: '',
      image: '',
      imageFit: 'cover',
      transition: 'fade',
      // quiz fields
      question: '',
      options: [],
      correct: 0,
      timeLimit: 0,
      points: 1000,
      // game embed
      gameId: '',
      gameTitle: '',
      // audience feedback attached to this slide (null = none)
      feedback: null
    };

    switch (s.type) {
      case 'title':
        s.title = 'Presentation title';
        s.subtitle = 'Your name · ' + new Date().toLocaleDateString();
        break;
      case 'section':
        s.title = 'Section heading';
        break;
      case 'content':
        s.title = 'Slide title';
        s.bullets = ['First point', 'Second point', 'Third point'];
        break;
      case 'image':
        s.title = 'Image slide';
        break;
      case 'quote':
        s.body = 'A quotation that makes the point better than a bullet list would.';
        s.subtitle = 'Attribution';
        break;
      case 'quiz':
        s.question = 'Which of these is correct?';
        s.options = ['Option A', 'Option B', 'Option C', 'Option D'];
        s.correct = 0;
        s.timeLimit = 20;
        break;
      case 'results':
        s.title = 'Results';
        break;
      case 'game':
        s.title = 'Game';
        s.transition = 'zoom';
        break;
    }
    return s;
  }

  function makeDeck(title) {
    var deck = {
      id: uid(),
      title: title || 'Untitled deck',
      theme: 'midnight',
      showSlideNumbers: true,
      quiz: makeQuizConfig(),
      created: Date.now(),
      modified: Date.now(),
      slides: []
    };
    deck.slides.push(makeSlide('title'));
    return deck;
  }

  function starterDeck() {
    var d = makeDeck('Sample deck & quiz');
    d.slides = [];

    var t = makeSlide('title');
    t.title = 'SlideForge';
    t.subtitle = 'Presentations and quizzes, straight from the browser';
    t.notes = 'Press the right arrow or space to advance. Press ? during the show for all shortcuts.';
    d.slides.push(t);

    var c = makeSlide('content');
    c.title = 'What this does';
    c.bullets = [
      'Build slides in the editor on the left',
      'Present full screen in 16:9, like a PowerPoint show',
      'Drop quiz slides anywhere in the deck',
      'Score the room live, or click through answers yourself'
    ];
    d.slides.push(c);

    var s = makeSlide('section');
    s.title = 'Quiz time';
    s.subtitle = 'Three questions';
    d.slides.push(s);

    var q1 = makeSlide('quiz');
    q1.question = 'What aspect ratio is a modern widescreen slide?';
    q1.options = ['4:3', '16:9', '1:1', '21:9'];
    q1.correct = 1;
    q1.timeLimit = 20;
    d.slides.push(q1);

    var q2 = makeSlide('quiz');
    q2.question = 'Which key blanks the screen mid-presentation?';
    q2.options = ['B', 'Q', 'X', 'M'];
    q2.correct = 0;
    q2.timeLimit = 15;
    d.slides.push(q2);

    var r = makeSlide('results');
    r.title = 'How did you do?';
    d.slides.push(r);

    return d;
  }

  /* ---------- normalising decks loaded from disk / older versions ---------- */

  function normalizeSlide(raw) {
    var base = makeSlide(raw && raw.type ? raw.type : 'content');
    var s = Object.assign(base, raw || {});
    s.id = s.id || uid();
    if (!SLIDE_TYPES[s.type]) s.type = 'content';
    if (!Array.isArray(s.bullets)) s.bullets = [];
    if (!Array.isArray(s.options)) s.options = [];
    s.options = s.options.map(function (o) {
      return typeof o === 'string' ? o : (o && o.text) || '';
    });
    s.correct = Math.max(0, Math.min(s.options.length - 1, Number(s.correct) || 0));
    s.timeLimit = Math.max(0, Number(s.timeLimit) || 0);
    s.points = Number(s.points) || 1000;
    if (TRANSITIONS.indexOf(s.transition) === -1) s.transition = 'fade';
    s.gameId = String(s.gameId || '');
    s.gameTitle = String(s.gameTitle || '');
    s.feedback = normalizeFeedback(s.feedback);
    return s;
  }

  function normalizeDeck(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var d = Object.assign(makeDeck(), raw);
    d.id = d.id || uid();
    d.title = String(d.title || 'Untitled deck');
    if (!THEMES[d.theme]) d.theme = 'midnight';
    d.quiz = normalizeQuizConfig(raw.quiz);
    d.slides = (Array.isArray(raw.slides) ? raw.slides : []).map(normalizeSlide);
    if (!d.slides.length) d.slides = [makeSlide('title')];
    d.showSlideNumbers = d.showSlideNumbers !== false;
    return d;
  }


  /* ======================================================================
     Games
     A game is its own document: settings plus a flat list of questions.
     It knows nothing about slides. At showtime `compileGame` turns it into
     ordinary slides, which is how the same runtime plays a standalone game
     and a game embedded in a presentation.
     ====================================================================== */


  /* ======================================================================
     Game styles

     A game has one style and every question in it is that style. Adding a new
     style means adding an entry here plus an inspector in js/games.js — the
     compiler, the player and the relay all go through this table rather than
     knowing about multiple choice specifically.

     Data hooks only: nothing here touches the DOM, so model.js stays loadable
     without a document (the relay imports nothing, but the presenter window
     and the phone page both load this file).
     ====================================================================== */

  var GAME_STYLES = {
    choice: {
      key: 'choice',
      label: 'Multiple choice',
      icon: '?',
      blurb: 'Two to six answers, one of them correct.',
      mechanic: 'points',
      minOptions: 2,
      maxOptions: 6,
      fixedOptions: null,

      make: function () {
        return {
          question: 'Which of these is correct?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: 0
        };
      },

      normalize: function (q) {
        if (!Array.isArray(q.options)) q.options = [];
        q.options = q.options
          .map(function (o) { return typeof o === 'string' ? o : (o && o.text) || ''; })
          .slice(0, 6);
        while (q.options.length < 2) q.options.push('');
        q.correct = Math.max(0, Math.min(q.options.length - 1, Number(q.correct) || 0));
        return q;
      },

      problems: function (q, n) {
        var live = q.options.filter(function (o) { return String(o).trim(); });
        if (!String(q.question).trim()) return 'Q' + n + ' has no question text';
        if (live.length < 2) return 'Q' + n + ' needs at least two answers';
        if (!String(q.options[q.correct] || '').trim()) {
          return 'Q' + n + ' has no correct answer marked';
        }
        return null;
      },

      /* Everything a question of this style contributes to its slide. */
      compile: function (q, settings, s) {
        s.question = q.question;
        s.options = q.options.filter(function (o) { return String(o).trim(); });
        s.correct = Math.max(0, Math.min(s.options.length - 1, q.correct));
      }
    },

    truefalse: {
      key: 'truefalse',
      label: 'True or false',
      icon: '½',
      blurb: 'A statement the room marks true or false.',
      mechanic: 'points',
      minOptions: 2,
      maxOptions: 2,
      fixedOptions: ['True', 'False'],

      make: function () {
        return {
          question: 'A statement that is either true or false.',
          options: ['True', 'False'],
          correct: 0
        };
      },

      normalize: function (q) {
        /* The options are the style's, not the author's — so a game converted
           from multiple choice lands on a valid pair rather than keeping four
           stale answers. */
        q.options = ['True', 'False'];
        q.correct = Number(q.correct) === 1 ? 1 : 0;
        return q;
      },

      problems: function (q, n) {
        if (!String(q.question).trim()) return 'Q' + n + ' has no statement';
        return null;
      },

      compile: function (q, settings, s) {
        s.options = ['True', 'False'];
        s.correct = q.correct === 1 ? 1 : 0;
        s.question = q.question;
      }
    }
  };

  /* Horse race asks exactly the same thing as multiple choice — the whole
     difference is what happens to the answer. So it borrows choice's question
     shape wholesale rather than duplicating it, and only declares a different
     mechanic. Defined after the literal so it can reference choice. */
  GAME_STYLES.race = {
    key: 'race',
    label: 'Horse race',
    icon: '🏇',
    blurb: 'Multiple choice, but every right answer moves your team a step along the track. First past the post wins.',
    mechanic: 'race',
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function () { return GAME_STYLES.choice.make(); },
    normalize: function (q) { return GAME_STYLES.choice.normalize(q); },
    problems: function (q, n) { return GAME_STYLES.choice.problems(q, n); },
    compile: function (q, st, s) { GAME_STYLES.choice.compile(q, st, s); }
  };

  function gameStyle(key) {
    return GAME_STYLES[key] || GAME_STYLES.choice;
  }

  function makeQuestion(style) {
    var base = {
      id: uid(),
      timeLimit: null,       // null = inherit the game default
      points: null,          // null = inherit the game default
      image: '',
      imageAlt: '',        // described to the phones and any screen reader
      /* 'band'    question above, image below it, answers under
         'first'   image first, question in its own box beneath it
         'overlay' image leads, question sits on it behind a gradient */
      imageLayout: 'band',
      notes: '',
      /* Shown after the answer is revealed. A multiple-choice answer is often
         one or two words, which teaches very little on its own. */
      explanation: '',
      source: ''             // optional "where to read more"
    };
    return Object.assign(base, gameStyle(style).make());
  }

  function makeGame(title, style) {
    style = GAME_STYLES[style] ? style : 'choice';
    return {
      id: uid(),
      kind: 'game',
      style: style,
      title: title || 'Untitled game',
      theme: 'midnight',
      created: Date.now(),
      modified: Date.now(),
      settings: {
        mode: 'individual',
        teams: [{ name: 'Red' }, { name: 'Blue' }, { name: 'Green' }, { name: 'Yellow' }],
        scoreboard: true,
        defaultTime: 20,
        defaultPoints: 1000,
        intro: true,           // opening "get ready" slide
        scoreSlide: true,      // closing score slide
        /* 'inline'  expand it inside the correct answer's box on reveal
           'slide'   a dedicated full-screen slide after the question
           'both'    inline first, then the slide for the detail */
        explainStyle: 'inline',
        /* Horse race only: steps to the finish line. */
        trackLength: 5
      },
      questions: [makeQuestion(style)]
    };
  }

  function starterGame() {
    var g = makeGame('Sample quiz');
    g.settings.mode = 'teams';
    g.settings.teams = [{ name: 'Red' }, { name: 'Blue' }];
    g.questions = [
      {
        id: uid(),
        question: 'What aspect ratio is a modern widescreen slide?',
        options: ['4:3', '16:9', '1:1', '21:9'],
        correct: 1, timeLimit: 20, points: null, image: '', notes: ''
      },
      {
        id: uid(),
        question: 'Which key blanks the screen mid-presentation?',
        options: ['B', 'Q', 'X', 'M'],
        correct: 0, timeLimit: 15, points: null, image: '', notes: ''
      },
      {
        id: uid(),
        question: 'How many teams can a SlideForge game have?',
        options: ['Two', 'Four', 'Six', 'Unlimited'],
        correct: 2, timeLimit: 15, points: null, image: '', notes: ''
      }
    ];
    return g;
  }

  function normalizeQuestion(raw, style) {
    var q = Object.assign(makeQuestion(style), raw || {});
    q.id = q.id || uid();
    q.question = String(q.question || '');
    gameStyle(style).normalize(q);
    q.timeLimit = q.timeLimit == null || q.timeLimit === '' ? null : Math.max(0, Number(q.timeLimit) || 0);
    q.points = q.points == null || q.points === '' ? null : Math.max(0, Number(q.points) || 0);
    q.explanation = String(q.explanation || '');
    q.source = String(q.source || '');
    q.image = String(q.image || '');
    q.imageAlt = String(q.imageAlt || '');
    if (['band', 'first', 'overlay'].indexOf(q.imageLayout) === -1) q.imageLayout = 'band';
    return q;
  }

  function normalizeGameSettings(raw) {
    var base = makeGame().settings;
    var g = Object.assign(base, raw || {});
    var q = normalizeQuizConfig({ mode: g.mode, teams: g.teams, scoreboard: g.scoreboard });
    g.mode = q.mode;
    g.teams = q.teams;
    g.scoreboard = q.scoreboard;
    g.defaultTime = Math.max(0, Number(g.defaultTime) || 0);
    g.defaultPoints = Math.max(0, Number(g.defaultPoints) || 1000);
    g.intro = g.intro !== false;
    g.scoreSlide = g.scoreSlide !== false;
    if (['inline', 'slide', 'both'].indexOf(g.explainStyle) === -1) g.explainStyle = 'inline';
    g.trackLength = Math.max(3, Math.min(12, Number(g.trackLength) || 5));
    return g;
  }

  function normalizeGame(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var style = GAME_STYLES[raw.style] ? raw.style : 'choice';
    var g = Object.assign(makeGame(undefined, style), raw);
    g.id = g.id || uid();
    g.kind = 'game';
    g.style = style;
    g.title = String(g.title || 'Untitled game');
    if (!THEMES[g.theme]) g.theme = 'midnight';
    g.settings = normalizeGameSettings(raw.settings);
    /* Every question is normalised against the game's style, which is what
       makes converting a game between styles safe. */
    g.questions = (Array.isArray(raw.questions) ? raw.questions : [])
      .map(function (q) { return normalizeQuestion(q, style); });
    if (!g.questions.length) g.questions = [makeQuestion(style)];
    return g;
  }

  /** Fields a question contributes to its compiled slide. Kept in one place
      because the game editor's preview builds the same slide and the two lists
      have already drifted twice. */
  var QUESTION_SLIDE_FIELDS = [
    'image', 'imageAlt', 'imageLayout', 'explanation', 'source', 'notes'
  ];

  /**
   * Turn a game into slides the player can run.
   * @param {object} game
   * @param {object} opts { theme, intro, scoreSlide, label }
   * @returns {Array} slides
   */
  function compileGame(game, opts) {
    opts = opts || {};
    var st = game.settings;
    var out = [];

    if (opts.intro !== false && st.intro) {
      var intro = makeSlide('section');
      intro.title = game.title;
      intro.subtitle = game.questions.length +
        (game.questions.length === 1 ? ' question' : ' questions') +
        (st.mode === 'teams' ? ' · ' + st.teams.length + ' teams' : '');
      intro.transition = 'zoom';
      intro.notes = 'Game intro. The next ' + game.questions.length + ' slides are its questions.';
      intro.gameId = game.id;      // marks the round boundary for live mode
      out.push(intro);
    }

    game.questions.forEach(function (q, i) {
      var s = makeSlide('quiz');
      s.id = game.id + ':' + q.id;      // stable across runs, unique per game
      gameStyle(game.style).compile(q, st, s);
      s.style = game.style;
      s.timeLimit = q.timeLimit == null ? st.defaultTime : q.timeLimit;
      s.points = q.points == null ? st.defaultPoints : q.points;
      s.notes = q.notes || '';
      s.transition = 'fade';
      s.gameId = game.id;
      s.gameTitle = game.title;
      s.questionNumber = i + 1;
      QUESTION_SLIDE_FIELDS.forEach(function (k) {
        if (q[k] != null && q[k] !== '') s[k] = q[k];
      });
      s.explainStyle = st.explainStyle;
      out.push(s);

      /* A dedicated slide only when asked for. On 'inline' the reasoning
         expands inside the answer box instead, which keeps the question and
         the other options on screen while it is read. */
      if (String(q.explanation || '').trim() &&
          (st.explainStyle === 'slide' || st.explainStyle === 'both')) {
        var why = makeSlide('explain');
        why.id = game.id + ':' + q.id + ':why';
        why.question = q.question;
        why.body = q.explanation;
        why.subtitle = q.source || '';
        why.options = s.options;
        why.correct = s.correct;
        why.questionNumber = i + 1;
        why.gameId = game.id;
        why.gameTitle = game.title;
        why.transition = 'fade';
        why.notes = 'Explanation for Q' + (i + 1) + '.';
        out.push(why);
      }
    });

    if (opts.scoreSlide !== false && st.scoreSlide) {
      var res = makeSlide('results');
      res.id = game.id + ':scores';
      res.title = game.title + ' — scores';
      res.gameId = game.id;
      out.push(res);
    }
    return out;
  }

  /**
   * Expand every game embed in a deck into the game's compiled slides, so the
   * player only ever sees plain slides. Returns a throwaway deck; the stored
   * one is untouched.
   */
  function buildRunDeck(deck, lookupGame) {
    var run = Object.assign({}, deck);
    run.slides = [];
    run.missingGames = [];
    run.games = [];

    deck.slides.forEach(function (s) {
      if (s.type !== 'game') { run.slides.push(s); return; }
      var game = lookupGame(s.gameId);
      if (!game) {
        run.missingGames.push(s.gameTitle || s.gameId);
        var gone = makeSlide('section');
        gone.id = s.id;
        gone.title = 'Game not found';
        gone.subtitle = s.gameTitle ? '"' + s.gameTitle + '" has been deleted' : '';
        run.slides.push(gone);
        return;
      }
      run.games.push(game);
      compileGame(game, { theme: deck.theme }).forEach(function (cs) {
        run.slides.push(cs);
      });
    });

    /* Teams and the scoreboard belong to the room, not to a question, so the
       live session takes its settings from the first embedded game. A deck with
       several games shares one set of teams — which is what you want when the
       same room plays all of them. */
    run.feedbackSlides = run.slides.filter(slideFeedback).length;

    var lead = run.games[0];
    run.mechanic = lead ? gameStyle(lead.style).mechanic : 'points';
    run.trackLength = lead ? lead.settings.trackLength : 5;
    run.quiz = normalizeQuizConfig(lead ? {
      mode: lead.settings.mode,
      teams: lead.settings.teams,
      scoreboard: lead.settings.scoreboard
    } : { mode: 'individual', scoreboard: true });

    if (!run.slides.length) run.slides = [makeSlide('title')];
    return run;
  }

  /** A standalone game, dressed as a deck so the player can run it unchanged. */
  function gameToRunDeck(game) {
    return {
      id: game.id,
      title: game.title,
      theme: game.theme,
      showSlideNumbers: false,
      quiz: normalizeQuizConfig({
        mode: game.settings.mode,
        teams: game.settings.teams,
        scoreboard: game.settings.scoreboard
      }),
      games: [game],
      missingGames: [],
      mechanic: gameStyle(game.style).mechanic,
      trackLength: game.settings.trackLength,
      slides: compileGame(game)
    };
  }

  /**
   * Older decks authored quiz and score slides directly. Pull them out into a
   * game so there is exactly one place questions live, and leave a game embed
   * where the first quiz slide was.
   */
  function migrateDeckQuizzes(deck, saveGame) {
    var quizzes = deck.slides.filter(function (s) { return s.type === 'quiz'; });
    if (!quizzes.length) {
      // a deck with only a stray score slide: drop it, nothing to score
      deck.slides = deck.slides.filter(function (s) { return s.type !== 'results'; });
      if (!deck.slides.length) deck.slides = [makeSlide('title')];
      return null;
    }

    var game = makeGame(deck.title + ' — quiz');
    game.theme = deck.theme;
    game.settings = normalizeGameSettings({
      mode: deck.quiz ? deck.quiz.mode : 'individual',
      teams: deck.quiz ? deck.quiz.teams : null,
      scoreboard: deck.quiz ? deck.quiz.scoreboard : true,
      defaultTime: quizzes[0].timeLimit || 20,
      defaultPoints: quizzes[0].points || 1000,
      intro: false,
      scoreSlide: deck.slides.some(function (s) { return s.type === 'results'; })
    });
    game.questions = quizzes.map(function (s) {
      return normalizeQuestion({
        question: s.question,
        options: s.options,
        correct: s.correct,
        timeLimit: s.timeLimit,
        points: s.points,
        notes: s.notes
      });
    });
    saveGame(game);

    var at = deck.slides.findIndex(function (s) { return s.type === 'quiz'; });
    var embed = makeSlide('game');
    embed.gameId = game.id;
    embed.gameTitle = game.title;
    embed.title = game.title;

    deck.slides = deck.slides.filter(function (s) {
      return s.type !== 'quiz' && s.type !== 'results';
    });
    deck.slides.splice(Math.min(at, deck.slides.length), 0, embed);
    if (!deck.slides.length) deck.slides = [embed];
    return game;
  }


  /* ======================================================================
     Audience feedback

     Attached to an ordinary content slide rather than being a slide of its
     own: the slide keeps its title, bullets or image, and the responses
     collect in the side rail while it is on screen. Unscored — a game is for
     scoring, this is for hearing the room.
     ====================================================================== */

  var FEEDBACK_KINDS = {
    poll: {
      key: 'poll',
      label: 'Poll',
      icon: '▤',
      blurb: 'Fixed options. Results appear as bars in the rail.',
      needsOptions: true
    },
    wordcloud: {
      key: 'wordcloud',
      label: 'Word cloud',
      icon: '❋',
      blurb: 'A word or short phrase each. Repeats grow larger.',
      needsOptions: false
    },
    brainstorm: {
      key: 'brainstorm',
      label: 'Brainstorm',
      icon: '✎',
      blurb: 'Longer contributions, listed newest first with names.',
      needsOptions: false
    }
  };

  function makeFeedback(kind) {
    return {
      kind: FEEDBACK_KINDS[kind] ? kind : 'poll',
      prompt: '',
      options: kind === 'poll' || !kind ? ['Yes', 'No', 'Not sure'] : [],
      max: 1                 // submissions allowed per person
    };
  }

  function normalizeFeedback(raw) {
    if (!raw || !raw.kind || !FEEDBACK_KINDS[raw.kind]) return null;
    var f = {
      kind: raw.kind,
      prompt: String(raw.prompt || ''),
      options: [],
      max: Math.max(1, Math.min(5, Number(raw.max) || 1))
    };
    if (FEEDBACK_KINDS[f.kind].needsOptions) {
      f.options = (Array.isArray(raw.options) ? raw.options : [])
        .map(function (o) { return String(o == null ? '' : o); })
        .slice(0, 6);
      while (f.options.length < 2) f.options.push('');
      f.max = 1;             // one vote each, always
    }
    return f;
  }

  /** Does this slide collect anything from the room? */
  function slideFeedback(slide) {
    var f = slide && slide.feedback;
    if (!f || !f.kind) return null;
    if (!String(f.prompt || '').trim()) return null;
    if (FEEDBACK_KINDS[f.kind].needsOptions &&
        f.options.filter(function (o) { return String(o).trim(); }).length < 2) {
      return null;
    }
    return f;
  }

  /* ---------- storage ---------- */

  var KEY = 'slideforge.decks.v1';
  var LAST = 'slideforge.lastDeckId';

  function readAll() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeDeck).filter(Boolean) : [];
    } catch (e) {
      console.warn('Could not read saved decks:', e);
      return [];
    }
  }

  function writeAll(decks) {
    try {
      localStorage.setItem(KEY, JSON.stringify(decks));
      return true;
    } catch (e) {
      console.warn('Could not save decks:', e);
      return false;
    }
  }

  var GKEY = 'slideforge.games.v1';

  function readGames() {
    try {
      var raw = JSON.parse(localStorage.getItem(GKEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeGame).filter(Boolean) : [];
    } catch (e) {
      console.warn('Could not read saved games:', e);
      return [];
    }
  }

  function writeGames(games) {
    try {
      localStorage.setItem(GKEY, JSON.stringify(games));
      return true;
    } catch (e) {
      console.warn('Could not save games:', e);
      return false;
    }
  }

  var GameStore = {
    list: function () {
      return readGames().sort(function (a, b) { return b.modified - a.modified; });
    },
    save: function (game) {
      game.modified = Date.now();
      var all = readGames();
      var i = all.findIndex(function (g) { return g.id === game.id; });
      if (i === -1) all.push(game); else all[i] = game;
      return writeGames(all);
    },
    remove: function (id) {
      writeGames(readGames().filter(function (g) { return g.id !== id; }));
    },
    get: function (id) {
      return readGames().find(function (g) { return g.id === id; }) || null;
    },
    /** Which decks embed this game — so deleting one can warn first. */
    usedBy: function (id) {
      return readAll().filter(function (d) {
        return d.slides.some(function (s) { return s.type === 'game' && s.gameId === id; });
      }).map(function (d) { return d.title; });
    }
  };

  var Store = {
    list: function () {
      return readAll().sort(function (a, b) { return b.modified - a.modified; });
    },
    save: function (deck) {
      deck.modified = Date.now();
      var all = readAll();
      var i = all.findIndex(function (d) { return d.id === deck.id; });
      if (i === -1) all.push(deck); else all[i] = deck;
      var ok = writeAll(all);
      try { localStorage.setItem(LAST, deck.id); } catch (e) {}
      return ok;
    },
    remove: function (id) {
      writeAll(readAll().filter(function (d) { return d.id !== id; }));
    },
    get: function (id) {
      return readAll().find(function (d) { return d.id === id; }) || null;
    },
    lastId: function () {
      try { return localStorage.getItem(LAST); } catch (e) { return null; }
    }
  };

  global.SF = global.SF || {};
  Object.assign(global.SF, {
    SLIDE_W: SLIDE_W,
    SLIDE_H: SLIDE_H,
    THEMES: THEMES,
    TRANSITIONS: TRANSITIONS,
    TEAM_COLORS: TEAM_COLORS,
    MAX_TEAMS: MAX_TEAMS,
    teamColor: teamColor,
    makeQuizConfig: makeQuizConfig,
    normalizeQuizConfig: normalizeQuizConfig,
    SLIDE_TYPES: SLIDE_TYPES,
    uid: uid,
    makeSlide: makeSlide,
    makeDeck: makeDeck,
    starterDeck: starterDeck,
    normalizeDeck: normalizeDeck,
    normalizeSlide: normalizeSlide,
    DECK_TYPES: DECK_TYPES,
    FEEDBACK_KINDS: FEEDBACK_KINDS,
    makeFeedback: makeFeedback,
    normalizeFeedback: normalizeFeedback,
    slideFeedback: slideFeedback,
    // games
    makeGame: makeGame,
    makeQuestion: makeQuestion,
    GAME_STYLES: GAME_STYLES,
    gameStyle: gameStyle,
    starterGame: starterGame,
    normalizeGame: normalizeGame,
    normalizeQuestion: normalizeQuestion,
    compileGame: compileGame,
    QUESTION_SLIDE_FIELDS: QUESTION_SLIDE_FIELDS,
    buildRunDeck: buildRunDeck,
    gameToRunDeck: gameToRunDeck,
    migrateDeckQuizzes: migrateDeckQuizzes,
    Store: Store,
    GameStore: GameStore
  });
})(window);
