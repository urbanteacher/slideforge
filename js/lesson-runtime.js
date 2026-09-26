/* SlideForge — what the classic studios did that the room still needs.

   The classic Lesson studio (js/editor.js), Quiz studio (js/games.js) and
   Activities (js/activities.js) are retired: the lab is SlideForge's three
   studios (js/lab-engine.js). Three things they held are not authoring and
   outlive them:

   - SF.createPresetGame, a game set up from a preset, which the live room's
     activities (js/live-activities.js), the presenter's quick game and the
     lab's game catalogue (tools/lab-games.mjs) build games with;
   - SF.Activities.makeSlides, an activity's slides as SlideForge draws them,
     which the live room and the lab's activity catalogue
     (tools/lab-activities.mjs) read;
   - the page's start: the Library seeded, a show that was running when the
     page reloaded put back, and a room that was being hosted walked back into. */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF;

  /** The lesson open in the studio, as the shell has it. */
  function openLesson() {
    var ws = SF.Shell && SF.Shell.current && SF.Shell.current();
    return ws && ws.doc ? ws.doc() : null;
  }

  /* A game fully set up from an activity's preset. */
  SF.createPresetGame = function (style, preset, theme, options) {
    preset = preset || {};
    var g = SF.makeGame(preset.title || 'Quick knowledge check', style);
    g.theme = SF.resolveTheme(theme);
    g.settings.defaultTime = 0;
    g.settings.scoreboard = false;
    g.settings.scoreSlide = false;
    if (preset.settings) Object.assign(g.settings, preset.settings);
    if (preset.format) g.format = preset.format;
    else if (SF.isSpecialStyle && SF.isSpecialStyle(style)) g.format = style;
    if (preset.seeds && preset.seeds.length) {
      g.questions = preset.seeds.map(function (fields) {
        var seeded = SF.makeQuestion(style);
        Object.keys(fields).forEach(function (k) { seeded[k] = fields[k]; });
        return SF.normalizeQuestion(seeded, style);
      });
    } else if (preset.seed && ['memorymatch', 'memoryflip', 'knowledgeflip', 'lowstakes'].indexOf(style) === -1) {
      var q = SF.makeQuestion(style);
      Object.keys(preset.seed).forEach(function (k) { q[k] = preset.seed[k]; });
      g.questions = [SF.normalizeQuestion(q, style)];
    }
    if (!options || options.save !== false) {
      var host = openLesson();
      if (host && SF.LessonBank && SF.LessonBank.stamp) SF.LessonBank.stamp(g, host);
      SF.GameStore.save(g);
    }
    return g;
  };

  /* ------------------------------------------------------ activity slides */

  /* The nineteen activities whose teacher notes hold a worked answer rather
     than run-the-room guidance. Read rather than inferred: a note saying
     "allow two minutes to plan" is not an answer, a game reveals its own, and
     a reflection has none to reveal. Listing them is honest about that — a
     regex over the notes got four of them wrong in both directions. */
  var ANSWER_ACTIVITIES = [
    'think-pair-share', 'daily-review-routine', 'do-now-bell-ringer',
    'i-do-we-do-you-do', 'concept-development', 'flipped-instruction',
    'worked-example-analysis', 'error-analysis', 'quick-practice-stations',
    'concept-card-sort', 'guided-inquiry-investigation', 'problem-based-learning',
    'differentiated-practice-menu', 'design-and-create-task',
    'dialogue-chain-discussion', 'scenario-analysis-discussion',
    'whiteboards-on-walls', 'connect-four-concept-edition', 'preview-next-lesson'
  ];

  var fields = SF.createActivityFields(SF);

  /** An activity's slides: one per page, each carrying the activity and its instance. */
  function activitySlides(a) {
    var parts = a.pages || [{ layout: a.layout || 'keywords', fields: a.fields }];
    var instance;
    return parts.map(function (part, i) {
      var s = SF.makeSlide(part.layout);
      if (SF.prepareLayout) SF.prepareLayout(s, part.layout);
      s.title = a.title;
      s.notes = fields.steps(a);
      s.activity = a.key;
      s.activityPage = i;
      if (a.presentation) s.activityPresentation = a.presentation;
      instance = instance || s.id;
      s.activityInstance = instance;
      if (a.target === 'feedback') {
        s.feedback = Object.assign(SF.makeFeedback(a.feedbackKind),
          JSON.parse(JSON.stringify(a.feedbackPreset || {})));
      }
      if (part.layout === 'table') s.tableHeader = false;
      /* The worked answer comes across from the teacher notes, where it has
         always been written and never been seen by a room. It arrives as a
         draft and nothing else: every one of these is written about perimeter
         and rectangles, so showing it unread would put another subject's
         answer on the wall. The card stays shut in the show until somebody
         has made it theirs. */
      if (i === 0 && a.teacherNotes && ANSWER_ACTIVITIES.indexOf(a.key) >= 0) {
        s.modelAnswer = a.teacherNotes;
        s.modelAnswerDraft = true;
      }
      fields.applyFields(part, s);
      return s;
    });
  }

  SF.Activities.makeSlides = activitySlides;

  /* Lecture setup's AI smoke test (js/shell.js): the settings sheet's panel, on its own. */
  var aiPanel = null;
  SF.openAiSmokeTest = function () {
    aiPanel = aiPanel || SF.createDeckSettings(SF, {
      $: function (id) { return document.getElementById(id); }, el: SF.el,
      current: function () { return null; }, touched: function () {}, draw: function () {},
      pick: function () {}, select: function () {},
      deck: function () { return openLesson() || { slides: [] }; },
      UI: function () { return SF.Shell.UI; },
      ws: function () { return SF.Shell.current && SF.Shell.current(); },
      alone: true
    });
    aiPanel.openAiSmokeTest();
  };

  /* ------------------------------------------------------------ the start */

  /* Once, as the page starts, before the studios draw. */
  SF.startLessons = function () {
    /* The Library's packs, before anything asks whether this is a first visit. */
    if (SF.seedLibrary) SF.seedLibrary();
    var asked = false;
    try { asked = new URLSearchParams(location.search).has('lesson'); } catch (e) {}
    /* A show that was running when the page reloaded comes back where it was;
       a lesson asked for on the address starts fresh instead. */
    if (asked) SF.Player.forgetRun();
    else SF.Player.restoreRun();
    /* If this tab was hosting when it reloaded, walk back into the room the
       server is holding rather than leaving a class of phones stranded. Quiet
       when there is nothing held, which is almost always. */
    if (!SF.Live || !SF.Live.resumeHeldRoom) return;
    if (SF.Player.open) { try { SF.Live.resumeHeldRoom(SF.Player.deck); } catch (e) {} return; }
    if (SF.Live.hasHeldRoom && !SF.Live.hasHeldRoom()) return;
    if (SF.LabEngine && SF.LabEngine.enabled() && SF.LabEngine.heldRoomDeck) {
      SF.LabEngine.heldRoomDeck().then(function (deck) {
        try { SF.Live.resumeHeldRoom(deck); } catch (e) {}
      }, function () {});
    }
  };
})(window);
