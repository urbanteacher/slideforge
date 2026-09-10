/* SlideForge — deck data model, slide factories, local storage.
   Base slide geometry is 1280x720 (16:9); everything renders into that box
   and is scaled with a CSS transform, exactly like a PowerPoint slideshow. */
(function (global) {
  'use strict';

  var SLIDE_W = 1280;
  var SLIDE_H = 720;

  var THEMES = {
    studio: { name: 'Studio · Sage & ink', swatch: '#dce8cc' },
    midnight: { name: 'Midnight', swatch: '#1b2a4a' },
    paper:    { name: 'Paper',    swatch: '#f4f1ea' },
    ocean:    { name: 'Ocean',    swatch: '#0d5c63' },
    ember:    { name: 'Ember',    swatch: '#3d1b2a' },
    mono:     { name: 'Mono',     swatch: '#111111' }
  };

  var TRANSITIONS = ['none', 'fade', 'push', 'zoom', 'wipe'];

  /* Bloom's, low to high. The order is what the Adapt report uses: succeeding
     at a low level and failing at a higher one is a different problem from
     failing everywhere, and it is the one thing a taxonomy can tell you from
     a set of check results. */
  var BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

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
    title:    { label: 'Title',        icon: 'T' },
    section:  { label: 'Section',      icon: 'S' },
    content:  { label: 'Bullets',      icon: '•' },
    keywords: { label: 'Keywords',     icon: 'K' },
    italics:  { label: 'Italics',      icon: 'I' },
    links:    { label: 'Links',        icon: '↗' },
    split:    { label: 'Dual',         icon: '◫' },
    cards:    { label: 'Cards',        icon: '▦' },
    image:    { label: 'Image',        icon: '▣' },
    quote:    { label: 'Quote',        icon: '“' },
    game:     { label: 'Game',         icon: '◈' },
    quiz:     { label: 'Quiz',         icon: '?' },
    explain:  { label: 'Explanation',  icon: '💡' },
    results:  { label: 'Score',        icon: '⚑' }
  };

  /* The layouts offered in the presentation editor's Layout grid. */
  var DECK_TYPES = ['title', 'section', 'content', 'keywords', 'italics', 'links', 'split', 'cards', 'image', 'quote'];

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  /** Pair pits (keywords / italics / links) store "Lead\\tdefinition". Also accepts "Lead: def" when pasted. */
  function parseKeywordLine(line) {
    var s = String(line == null ? '' : line);
    var tab = s.indexOf('\t');
    if (tab !== -1) {
      return { term: s.slice(0, tab).trim(), def: s.slice(tab + 1).trim() };
    }
    var m = s.match(/^(.+?)\s*[—–:\-|]\s+(.+)$/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };
    return { term: s.trim(), def: '' };
  }

  function formatKeywordLine(term, def) {
    return String(term || '').trim() + '\t' + String(def || '').trim();
  }

  /** Only http(s) links — blocks javascript: and other schemes. */
  function safeHref(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return 'https:' + u;
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([\/?#][^\s]*)?$/i.test(u)) return 'https://' + u;
    return '';
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
      imageSide: 'right',
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
      case 'cards':
      case 'content':
        s.title = 'Slide title';
        s.bullets = ['First point', 'Second point', 'Third point'];
        break;
      case 'keywords':
        s.title = 'Key vocabulary';
        s.bullets = [
          formatKeywordLine('Keyword', 'a short plain-language definition'),
          formatKeywordLine('', ''),
          formatKeywordLine('', '')
        ];
        break;
      case 'italics':
        s.title = 'Phrases to notice';
        s.bullets = [
          formatKeywordLine('key phrase', 'why this wording matters'),
          formatKeywordLine('', ''),
          formatKeywordLine('', '')
        ];
        break;
      case 'links':
        s.title = 'Further reading';
        s.bullets = [
          formatKeywordLine('Resource title', 'https://'),
          formatKeywordLine('', ''),
          formatKeywordLine('', '')
        ];
        break;
      case 'split':
        s.title = 'Say it. Show it.';
        s.bullets = ['First point', 'Second point', 'Third point'];
        s.imageSide = 'right';
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
    s.imageSide = s.imageSide === 'left' ? 'left' : 'right';
    if (s.imageFit !== 'contain') s.imageFit = 'cover';
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
      input: 'choice',
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
      },

      mark: function (s, response) {
        return Number.isInteger(response) && response === s.correct;
      },

      /* One line about the question, for the editor's list of them. */
      summary: function (q) {
        var live = (q.options || []).filter(function (o) { return String(o).trim(); });
        return live.length + ' answers';
      }
    },

    truefalse: {
      key: 'truefalse',
      label: 'True or false',
      icon: '½',
      blurb: 'A statement the room marks true or false.',
      mechanic: 'points',
      input: 'choice',
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
      },

      mark: function (s, response) {
        return Number.isInteger(response) && response === s.correct;
      },

      summary: function (q) { return q.correct === 1 ? 'False' : 'True'; }
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
    input: 'choice',
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function () { return GAME_STYLES.choice.make(); },
    normalize: function (q) { return GAME_STYLES.choice.normalize(q); },
    problems: function (q, n) { return GAME_STYLES.choice.problems(q, n); },
    compile: function (q, st, s) { GAME_STYLES.choice.compile(q, st, s); },
    mark: function (s, response) { return GAME_STYLES.choice.mark(s, response); },
    summary: function (q) { return GAME_STYLES.choice.summary(q); }
  };

  /* Slider. An estimate rather than a choice: the room places a value on a
     line, and it counts if it lands inside the band the author allows. Being
     close is the skill being tested, so "close" is a number the author sets
     rather than something inferred. */
  GAME_STYLES.slider = {
    key: 'slider',
    label: 'Slider',
    icon: '↔',
    blurb: 'Estimate a value on a line. Near enough counts.',
    mechanic: 'points',
    input: 'number',
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,

    make: function () {
      return {
        question: 'Estimate the value.',
        min: 0,
        max: 100,
        step: 1,
        target: 50,
        tolerance: 5,
        unit: ''
      };
    },

    normalize: function (q) {
      var num = function (v, fallback) {
        var n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };
      q.min = num(q.min, 0);
      q.max = num(q.max, 100);
      /* A line that does not go anywhere cannot be answered, so an inverted or
         collapsed range is opened out rather than left to fail at showtime. */
      if (q.max <= q.min) q.max = q.min + 100;
      q.step = Math.max(0, num(q.step, 1));
      if (!q.step) q.step = 1;
      q.target = Math.min(q.max, Math.max(q.min, num(q.target, (q.min + q.max) / 2)));
      /* Tolerance is capped at the whole span: wider than the line would mark
         every possible answer right, which is not a question. */
      q.tolerance = Math.min(q.max - q.min, Math.max(0, num(q.tolerance, 0)));
      q.unit = String(q.unit == null ? '' : q.unit).slice(0, 12);
      delete q.options;
      delete q.correct;
      return q;
    },

    problems: function (q, n) {
      if (!String(q.question).trim()) return 'Q' + n + ' has no question text';
      if (q.tolerance >= q.max - q.min) {
        return 'Q' + n + ' accepts the whole line — narrow the tolerance';
      }
      return null;
    },

    compile: function (q, settings, s) {
      s.question = q.question;
      s.min = q.min;
      s.max = q.max;
      s.step = q.step;
      s.target = q.target;
      s.tolerance = q.tolerance;
      s.unit = q.unit;
      s.answer = formatValue(q.target, q.unit);
      s.options = [];
      s.correct = -1;
    },

    mark: function (s, response) {
      if (typeof response !== 'number' || !Number.isFinite(response)) return false;
      return Math.abs(response - s.target) <= s.tolerance;
    },

    summary: function (q) {
      /* The unit once, at the end: "206 ± 8 bones", not "206 bones ± 8 bones". */
      var band = q.tolerance
        ? formatValue(q.target) + ' ± ' + formatValue(q.tolerance)
        : formatValue(q.target) + ' exactly';
      return withUnit(band, q.unit);
    },

    describe: function (s, response) { return formatValue(response, s.unit); }
  };

  /* Type answer. No options at all, which is the point: recall without the
     clues. The author lists every spelling they will accept and the marking
     rules above do the rest. */
  GAME_STYLES.type = {
    key: 'type',
    label: 'Type answer',
    icon: 'Aa',
    blurb: 'No options to choose from — the room types the answer from memory.',
    mechanic: 'points',
    input: 'text',
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,

    make: function () {
      /* Blank, not a sample. A placeholder answer here would be an answer the
         question silently accepts, and the author would never see it. */
      return {
        question: 'What is the answer?',
        accept: [''],
        allowTypos: true
      };
    },

    normalize: function (q) {
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function (a) { return String(a == null ? '' : a).slice(0, 200); }).slice(0, 8);
      /* Converted from a game with options: the answer that was marked
         correct is the obvious thing to accept, rather than dropping the
         author's work and leaving the question unmarkable. */
      if (!q.accept.some(function (a) { return a.trim(); }) && Array.isArray(q.options)) {
        var carried = q.options[Number(q.correct) || 0];
        if (carried && String(carried).trim()) q.accept = [String(carried)];
      }
      if (!q.accept.length) q.accept = [''];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },

    problems: function (q, n) {
      if (!String(q.question).trim()) return 'Q' + n + ' has no question text';
      if (!q.accept.some(function (a) { return String(a).trim(); })) {
        return 'Q' + n + ' has no accepted answer';
      }
      return null;
    },

    compile: function (q, settings, s) {
      s.question = q.question;
      s.accept = q.accept.filter(function (a) { return String(a).trim(); });
      s.allowTypos = q.allowTypos !== false;
      /* The first accepted spelling is the one put on the screen, so the room
         reads a single answer rather than a list of tolerances. */
      s.answer = s.accept[0] || '';
      s.options = [];
      s.correct = -1;
    },

    mark: function (s, response) {
      if (typeof response !== 'string') return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },

    summary: function (q) {
      var live = (q.accept || []).filter(function (a) { return String(a).trim(); });
      if (!live.length) return 'no answer set';
      return live.length > 1 ? live[0] + ' +' + (live.length - 1) : live[0];
    },

    describe: function (s, response) {
      var hit = markTyped(s.accept, response, s.allowTypos);
      return hit.right ? hit.matched : String(response == null ? '' : response);
    }
  };

  /* ======================================================================
     Marking a typed answer

     Recall questions are marked by the host, not the relay — see the comment
     on markResponse. The rules below are the whole of it, and the authoring
     panel states them to the teacher, because a rule a teacher cannot predict
     is worse than no rule.
     ====================================================================== */

  /* Case, accents, punctuation and surrounding space never carry the meaning
     of a recalled answer, so none of them decide it. A leading article goes
     too: "photosynthesis" and "the photosynthesis" are the same knowledge. */
  function normalizeAnswer(text) {
    var t = String(text == null ? '' : text);
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    t = t.toLowerCase()
      .replace(/[‘’‛]/g, "'")     // smart quotes typed by phones
      .replace(/[^a-z0-9'\s]+/g, ' ')
      .replace(/'/g, '')                          // don't/dont, o'clock/oclock
      .replace(/\s+/g, ' ')
      .trim();
    return t.replace(/^(?:the|a|an)\s+/, '');
  }

  /* A figure recalled as "1,000" and one typed "1000" are the same answer, and
     so are "0.5", ".5" and "0.50". Read from the raw text, not the normalized
     form: normalizing turns the decimal point into a space, which would make
     "0.5" and "0.50" two different strings of digits. */
  function numeric(text) {
    var t = String(text == null ? '' : text).trim().replace(/[,\s]/g, '');
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  /* A symbol sits against the number, a word sits apart from it: "37.5%" but
     "206 bones". */
  function withUnit(text, unit) {
    unit = String(unit == null ? '' : unit).trim();
    if (!unit) return text;
    return /^[%°]/.test(unit) ? text + unit : text + ' ' + unit;
  }

  /* Numbers as a teacher would write them, without the trailing digits
     floating-point arithmetic leaves behind. */
  function formatValue(value, unit) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '';
    return withUnit(String(Math.round(n * 1000) / 1000), unit);
  }

  function editDistance(a, b) {
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    /* Bail before doing the work when the lengths alone rule out a match —
       every threshold this is asked about is 2 or less. */
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], row = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      row[0] = i;
      for (j = 1; j <= b.length; j++) {
        row[j] = Math.min(
          prev[j] + 1,
          row[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      prev = row.slice();
    }
    return prev[b.length];
  }

  /* How far off a spelling can be and still count. Scaled by length, because
     one wrong letter in "cell" changes the word and one in "mitochondria"
     is a slip of the thumb. Never applied to a number: 1500 is not 1600, and
     no amount of length makes a digit a typo you can forgive. */
  function typoAllowance(normalized, raw) {
    if (numeric(raw) != null || /\d/.test(normalized)) return 0;
    if (normalized.length >= 8) return 2;
    if (normalized.length >= 5) return 1;
    return 0;
  }

  /**
   * Mark one typed response against a question's accepted answers.
   * @returns {object} { right, matched, distance } — matched is the accepted
   *   answer it hit, so the host can say which spelling it took.
   */
  function markTyped(accept, response, allowTypos) {
    var given = normalizeAnswer(response);
    var givenNum = numeric(response);
    var miss = { right: false, matched: null, distance: null };
    if (!given) return miss;
    var list = (Array.isArray(accept) ? accept : [accept])
      .filter(function (a) { return String(a == null ? '' : a).trim(); });
    var best = miss;
    for (var i = 0; i < list.length; i++) {
      var raw = String(list[i]);
      var want = normalizeAnswer(raw);
      if (!want) continue;
      if (given === want) return { right: true, matched: raw, distance: 0 };
      var wantNum = numeric(raw);
      if (givenNum != null && wantNum != null && givenNum === wantNum) {
        return { right: true, matched: raw, distance: 0 };
      }
      if (allowTypos === false) continue;
      var allowed = typoAllowance(want, raw);
      if (!allowed) continue;
      var d = editDistance(given, want);
      if (d <= allowed && (best.distance == null || d < best.distance)) {
        best = { right: true, matched: raw, distance: d };
      }
    }
    return best;
  }

  /**
   * Mark a response against a compiled question slide.
   *
   * Marking lives here, on the host, and not in the relay. The relay holds the
   * clock, the roster and the running scores; what it must not hold is what a
   * given answer *means*, because that is the authoring side's knowledge and
   * it differs per style. While the relay compared option indices, no question
   * type without option indices could exist. It now receives a verdict per
   * player and does the arithmetic, so a new style is a change here only.
   *
   * @param {object} slide compiled quiz slide
   * @param {number|string} response option index, or typed text
   */
  function markResponse(slide, response) {
    var style = gameStyle(slide.style);
    if (typeof style.mark === 'function') return !!style.mark(slide, response);
    return false;
  }

  /**
   * How a response should be written on the screen.
   *
   * A right typed answer is shown in the spelling the question accepts, not
   * in whichever variant happened to arrive first: a group of six holding
   * "paris", "PARIS" and "the Paris" reads as Paris.
   */
  function answerLabel(slide, response) {
    var style = gameStyle(slide.style);
    if (typeof style.describe === 'function') return style.describe(slide, response);
    return String(response == null ? '' : response);
  }

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
      /* What kind of thinking this question asks for. Per question, not per
         game: a quiz that checks recall and then application is exactly the
         shape the Adapt report can say something useful about, and it cannot
         if every question in the game shares one level. */
      bloom: '',
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
        trackLength: 5,
        /* Ask each player how sure they were, after their answer is in. Never
           scored — it tells the teacher which wrong answers were confident. */
        confidence: true
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
    q.bloom = BLOOM_LEVELS.indexOf(q.bloom) > -1 ? q.bloom : '';
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
    g.confidence = g.confidence !== false;
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
  /**
   * Everything a question contributes to its slide, in one place.
   *
   * The game editor's preview and the compiler both go through this. They
   * used to build the slide separately and drifted twice — the preview
   * silently lost explanations, then images — so there is now one function
   * and no second copy to forget.
   *
   * @param {object} q question
   * @param {string} styleKey game style
   * @param {object} settings game settings
   * @param {object} s slide to fill
   */
  function fillQuestionSlide(q, styleKey, settings, s) {
    var style = gameStyle(styleKey);
    style.compile(q, settings, s);
    s.style = styleKey;
    /* How the room answers. Read off the style rather than written by each
       compile(), so a style declares it once. */
    s.input = INPUTS.indexOf(style.input) > -1 ? style.input : 'choice';
    s.timeLimit = q.timeLimit == null ? settings.defaultTime : q.timeLimit;
    s.points = q.points == null ? settings.defaultPoints : q.points;
    QUESTION_SLIDE_FIELDS.forEach(function (k) {
      if (q[k] != null && q[k] !== '') s[k] = q[k];
    });
    s.explainStyle = settings.explainStyle;
    s.confidence = settings.confidence !== false;
    return s;
  }

  /* Every way a room can answer. The phone switches control on this, the
     relay validates the response against it, and it is the one thing a new
     style has to pick from an existing set rather than invent. */
  var INPUTS = ['choice', 'text', 'number'];

  var QUESTION_SLIDE_FIELDS = [
    'image', 'imageAlt', 'imageLayout', 'explanation', 'source', 'notes', 'bloom'
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
      fillQuestionSlide(q, game.style, st, s);
      s.notes = q.notes || '';
      s.transition = 'fade';
      s.gameId = game.id;
      s.gameTitle = game.title;
      s.questionNumber = i + 1;
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
        /* A typed question has no option to point at, so the answer travels
           as text — otherwise this slide showed an empty box and a "?". */
        why.input = s.input;
        why.answer = s.answer || '';
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
        cs.sourceSlideId = s.id;
        cs.bloom = cs.bloom || s.bloom || '';
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
    },
    /* A scale is a poll over a fixed run of points, so on the wire it is one:
       the room picks an index and the relay counts indices, unchanged. What
       makes it a scale is that the points are ordered, which is why it gets a
       mean and a distribution rather than a set of independent bars. */
    scale: {
      key: 'scale',
      label: 'Scale',
      icon: '≋',
      blurb: 'One end to the other. Shows the spread and the average.',
      needsOptions: false,
      graded: true
    }
  };

  /* The two ends and the number of steps between them. Five is the default
     because an odd count leaves a real middle to sit in, and more than seven
     points is a distinction nobody makes honestly on a phone. */
  var SCALE_POINTS = [3, 4, 5, 6, 7];

  function scaleLabels(f) {
    var n = Math.max(3, Math.min(7, Number(f.points) || 5));
    var out = [];
    for (var i = 0; i < n; i++) out.push(String(i + 1));
    return out;
  }

  function makeFeedback(kind) {
    var f = {
      kind: FEEDBACK_KINDS[kind] ? kind : 'poll',
      prompt: '',
      options: kind === 'poll' || !kind ? ['Yes', 'No', 'Not sure'] : [],
      max: 1                 // submissions allowed per person
    };
    if (f.kind === 'scale') {
      f.points = 5;
      f.lowLabel = 'Not at all';
      f.highLabel = 'Completely';
    }
    return f;
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
    if (f.kind === 'scale') {
      f.points = SCALE_POINTS.indexOf(Number(raw.points)) > -1 ? Number(raw.points) : 5;
      f.lowLabel = String(raw.lowLabel == null ? 'Not at all' : raw.lowLabel).slice(0, 40);
      f.highLabel = String(raw.highLabel == null ? 'Completely' : raw.highLabel).slice(0, 40);
      f.max = 1;             // one position each — a scale is where you stand
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
    /* A scale needs both ends named or the room cannot tell which way it
       runs, and an unlabelled 1-to-5 means nothing on the wall either. */
    if (f.kind === 'scale' &&
        !(String(f.lowLabel || '').trim() && String(f.highLabel || '').trim())) {
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
    clear: function () { writeGames([]); },
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
    clear: function () { writeAll([]); },
    get: function (id) {
      return readAll().find(function (d) { return d.id === id; }) || null;
    },
    lastId: function () {
      try { return localStorage.getItem(LAST); } catch (e) { return null; }
    }
  };

  /** One-way practice pack for Canvas / Colab. Live interaction is omitted on purpose. */
  function deckToMarkdown(deck) {
    deck = normalizeDeck(deck || {});
    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    var out = [];
    function line(s) { out.push(s == null ? '' : String(s)); }
    function blank() { if (out.length && out[out.length - 1] !== '') line(''); }

    line('# ' + (deck.title || 'Untitled lesson'));
    line('');
    line('_Practice notes from SlideForge. Live polls, games and scoring stay in the classroom room._');
    line('');

    (deck.slides || []).forEach(function (s, idx) {
      var n = idx + 1;
      blank();

      if (s.type === 'game') {
        var g = s.gameId ? GameStore.get(s.gameId) : null;
        line('## ' + n + '. Knowledge check' + (g || s.gameTitle ? ': ' + (g ? g.title : s.gameTitle) : ''));
        line('');
        if (!g) {
          line('*Game not found in this browser — open the lesson in SlideForge to review the questions.*');
          return;
        }
        line('*' + (GAME_STYLES[g.style] ? GAME_STYLES[g.style].label : g.style) + '*');
        line('');
        (g.questions || []).forEach(function (q, qi) {
          line('### Q' + (qi + 1) + '. ' + (q.question || 'Question'));
          line('');
          if (g.style === 'truefalse') {
            line('- True');
            line('- False');
          } else if (Array.isArray(q.options) && q.options.length) {
            q.options.forEach(function (opt, oi) {
              var mark = (q.correct === oi) ? ' *(answer)*' : '';
              line('- ' + (letters[oi] || String(oi + 1)) + '. ' + opt + mark);
            });
          } else if (q.answer) {
            line('Answer key: `' + q.answer + '`');
          }
          if (q.explanation) {
            line('');
            line('> ' + String(q.explanation).replace(/\n+/g, ' '));
          }
          line('');
        });
        return;
      }

      if (s.type === 'title') {
        line('## ' + n + '. ' + (s.title || 'Title').replace(/\n/g, ' '));
        if (s.subtitle) { line(''); line(s.subtitle); }
      } else if (s.type === 'section') {
        line('## ' + n + '. ' + (s.title || 'Section').replace(/\n/g, ' '));
        if (s.subtitle) { line(''); line(s.subtitle); }
      } else if (s.type === 'quote') {
        line('## ' + n + '. Quote');
        line('');
        line('> ' + String(s.body || '').replace(/\n/g, ' '));
        if (s.subtitle) { line(''); line('— ' + s.subtitle); }
      } else if (s.type === 'image') {
        line('## ' + n + '. ' + (s.title || 'Image').replace(/\n/g, ' '));
        line('');
        line(s.image && String(s.image).indexOf('data:') === 0
          ? '*Embedded image (open in SlideForge to view).*'
          : (s.image ? '![](' + s.image + ')' : '*No image set.*'));
      } else if (s.type === 'cards') {
        line('## ' + n + '. ' + (s.title || 'Cards').replace(/\n/g, ' '));
        line('');
        (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b, i) {
          line((i + 1) + '. ' + String(b).replace(/^(\s{2,}|\t|- )+/, '').trim());
        });
      } else if (s.type === 'keywords') {
        line('## ' + n + '. ' + (s.title || 'Keywords').replace(/\n/g, ' '));
        line('');
        (s.bullets || []).map(parseKeywordLine).filter(function (p) { return p.term || p.def; })
          .forEach(function (p) {
            line('- **' + p.term + '** — ' + (p.def || ''));
          });
      } else if (s.type === 'italics') {
        line('## ' + n + '. ' + (s.title || 'Italics').replace(/\n/g, ' '));
        line('');
        (s.bullets || []).map(parseKeywordLine).filter(function (p) { return p.term || p.def; })
          .forEach(function (p) {
            line('- *' + p.term + '* — ' + (p.def || ''));
          });
      } else if (s.type === 'links') {
        line('## ' + n + '. ' + (s.title || 'Links').replace(/\n/g, ' '));
        line('');
        (s.bullets || []).map(parseKeywordLine).filter(function (p) { return p.term || p.def; })
          .forEach(function (p) {
            var href = safeHref(p.def);
            if (href) line('- [' + (p.term || href) + '](' + href + ')');
            else line('- ' + (p.term || 'Link') + (p.def ? ' — ' + p.def : ''));
          });
      } else if (s.type === 'split') {
        line('## ' + n + '. ' + (s.title || 'Dual coding').replace(/\n/g, ' '));
        line('');
        (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b) {
          var tier = /^(\s{2,}|\t|- )/.test(b);
          var text = String(b).replace(/^(\s{2,}|\t|- )+/, '').trim();
          line((tier ? '  - ' : '- ') + text);
        });
        line('');
        line(s.image && String(s.image).indexOf('data:') === 0
          ? '*Accompanying image (open in SlideForge to view).*'
          : (s.image ? '![](' + s.image + ')' : '*Add an accompanying image for dual coding.*'));
      } else {
        line('## ' + n + '. ' + (s.title || 'Slide').replace(/\n/g, ' '));
        line('');
        (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b) {
          var tier = /^(\s{2,}|\t|- )/.test(b);
          var text = String(b).replace(/^(\s{2,}|\t|- )+/, '').trim();
          line((tier ? '  - ' : '- ') + text);
        });
      }

      if (s.bloom) {
        blank();
        line('*Thinking level: ' + s.bloom + '*');
      }

      var fb = slideFeedback(s);
      if (fb) {
        blank();
        line('### In-class activity · ' + (FEEDBACK_KINDS[fb.kind] ? FEEDBACK_KINDS[fb.kind].label : fb.kind));
        line('');
        line('**Prompt:** ' + (fb.prompt || ''));
        if (fb.kind === 'poll' && fb.options && fb.options.length) {
          line('');
          fb.options.forEach(function (o) { line('- [ ] ' + o); });
        } else {
          line('');
          line('*Respond in the live room (or jot a note here for practice).*');
        }
      }

      if (s.nextStep) {
        blank();
        line('**Teacher next step:** ' + s.nextStep);
      }

      if (s.notes) {
        blank();
        line('<details><summary>Speaker notes</summary>');
        line('');
        line(s.notes);
        line('');
        line('</details>');
      }
    });

    blank();
    line('---');
    line('');
    line('_Exported for Canvas / Colab practice. Re-open the `.sfdeck.json` in SlideForge to host live._');
    return out.join('\n');
  }

  global.SF = global.SF || {};
  Object.assign(global.SF, {
    SLIDE_W: SLIDE_W,
    SLIDE_H: SLIDE_H,
    THEMES: THEMES,
    TRANSITIONS: TRANSITIONS,
    BLOOM_LEVELS: BLOOM_LEVELS,
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
    parseKeywordLine: parseKeywordLine,
    formatKeywordLine: formatKeywordLine,
    safeHref: safeHref,
    deckToMarkdown: deckToMarkdown,
    DECK_TYPES: DECK_TYPES,
    FEEDBACK_KINDS: FEEDBACK_KINDS,
    SCALE_POINTS: SCALE_POINTS,
    scaleLabels: scaleLabels,
    makeFeedback: makeFeedback,
    normalizeFeedback: normalizeFeedback,
    slideFeedback: slideFeedback,
    // games
    makeGame: makeGame,
    makeQuestion: makeQuestion,
    GAME_STYLES: GAME_STYLES,
    gameStyle: gameStyle,
    markResponse: markResponse,
    answerLabel: answerLabel,
    markTyped: markTyped,
    normalizeAnswer: normalizeAnswer,
    formatValue: formatValue,
    starterGame: starterGame,
    normalizeGame: normalizeGame,
    normalizeQuestion: normalizeQuestion,
    compileGame: compileGame,
    INPUTS: INPUTS,
    QUESTION_SLIDE_FIELDS: QUESTION_SLIDE_FIELDS,
    fillQuestionSlide: fillQuestionSlide,
    buildRunDeck: buildRunDeck,
    gameToRunDeck: gameToRunDeck,
    migrateDeckQuizzes: migrateDeckQuizzes,
    Store: Store,
    GameStore: GameStore
  });
})(window);
