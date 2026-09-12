/* SlideForge — AI Diagnostic & Live Polling Engine
 *
 * Provides instant formative assessment generation for presentations.
 *
 * Dual-Mode Architecture:
 * 1. Offline Mode (Zero Setup / Keyless):
 *    Uses smart pedagogical heuristics to extract concepts from the current slide
 *    (title, keywords, bullet points, explanations) and produce instant check-for-understanding
 *    polls, confidence scales, or word clouds with zero cost and zero network dependencies.
 *
 * 2. Live Generative AI Mode (Key-Activated):
 *    When a Google Gemini API key is provided, calls gemini-2.5-flash via REST to generate
 *    tailored diagnostic questions, plausible distractors, and misconception checks.
 *    Automatically falls back to offline heuristics if network drops or quota is exceeded.
 */
(function (global) {
  'use strict';

  var SF = global.SF = global.SF || {};

  /* No key lives here. Live generation goes through this app's own server,
     which holds the credential in its environment — see /api/ai/generate in
     server/server.js. An earlier build kept the key in localStorage and put it
     in the Gemini URL, which made it readable by any script on the page and
     put it into logs, history and referrer headers.

     Availability is therefore a property of the deployment, not of this
     browser, so it is asked for once and remembered. */
  var liveAvailable = null;
  var liveProbe = null;

  function aiUrl(path) {
    return (global.location ? global.location.origin : '') + path;
  }

  function checkLiveAI() {
    if (liveAvailable !== null) return Promise.resolve(liveAvailable);
    if (liveProbe) return liveProbe;
    if (typeof global.fetch !== 'function') {
      liveAvailable = false;
      return Promise.resolve(false);
    }
    liveProbe = global.fetch(aiUrl('/api/ai/status'), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { available: false }; })
      .then(function (d) { liveAvailable = !!(d && d.available); return liveAvailable; })
      .catch(function () { liveAvailable = false; return false; });
    return liveProbe;
  }

  /** Synchronous best guess, for painting a status line before the probe lands. */
  function liveAIKnown() { return liveAvailable === true; }


  /* ------------------------------------------------ Offline Pedagogical Heuristics */

  function extractSlideTerms(slide) {
    if (!slide) return [];
    var terms = [];

    /* `bullets` is where a SlideForge slide keeps its content, and on a
       keywords slide each entry is "term<TAB>definition" — the term half is
       exactly the concept worth asking about.

       This used to read `keywords`, `points` and `italics`. A slide has no
       keywords or italics field at all, and `points` is a question's score, a
       number. So the extractor returned [] for every real slide and every
       generated poll fell back to "How confident do you feel with: <title>?".
       It passed its tests because those fed it hand-made objects with a
       `keywords` array, which nothing in the app produces. */
    if (Array.isArray(slide.bullets)) {
      slide.bullets.forEach(function (b) {
        var line = String(b == null ? '' : b);
        if (!line.trim()) return;
        var term = line;
        if (SF.parseKeywordLine) {
          var parsed = SF.parseKeywordLine(line);
          term = parsed && parsed.term ? parsed.term : line;
        } else if (line.indexOf('\t') > -1) {
          term = line.slice(0, line.indexOf('\t'));
        }
        term = term.trim().replace(/^[-*•]\s*/, '');
        if (term && term.length <= 60) terms.push(term);
      });
    }

    /* A quiz slide's own options are candidate concepts too. */
    if (Array.isArray(slide.options)) {
      slide.options.forEach(function (o) {
        var t = String(o == null ? '' : o).trim();
        if (t && t.length <= 60) terms.push(t);
      });
    }

    if (slide.subtitle && String(slide.subtitle).trim().length <= 60) {
      terms.push(String(slide.subtitle).trim());
    }

    // 4. Body lines if short
    if (!terms.length && slide.body) {
      var lines = String(slide.body).split(/\n|;|\band\b/);
      lines.forEach(function (l) {
        var clean = l.replace(/^[-*•\d.)]\s*/, '').trim();
        if (clean.length > 2 && clean.length <= 40) terms.push(clean);
      });
    }

    // Deduplicate
    var seen = {};
    return terms.filter(function (t) {
      var k = t.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function generateOfflineSlidePoll(slide, opts) {
    opts = opts || {};
    var title = slide ? String(slide.title || '').trim() : '';
    var terms = extractSlideTerms(slide);

    // Rule 1: If slide has 2-5 clear terms or concepts, generate a diagnostic check poll
    if (terms.length >= 2) {
      var chosen = terms.slice(0, 5);
      var prompt = title
        ? 'Which concept in "' + title + '" needs the most clarification?'
        : 'Which concept needs the most clarification or practice?';
      if (prompt.length > 120 && title) {
        prompt = 'Which concept needs the most clarification?';
      }
      return {
        kind: 'poll',
        prompt: prompt,
        options: chosen,
        heuristic: true,
        fallback: !!opts.fallback
      };
    }

    // Rule 2: Reflection, recap, or plenary slide -> Word Cloud
    var lc = (title + ' ' + (slide ? slide.body || '' : '')).toLowerCase();
    if (/reflection|plenary|takeaway|summary|review|conclude|exit ticket/.test(lc)) {
      return {
        kind: 'wordcloud',
        prompt: title
          ? 'In one word, what was the key takeaway from "' + title + '"?'
          : 'In one word, what was your key takeaway from this?',
        options: [],
        heuristic: true,
        fallback: !!opts.fallback
      };
    }

    // Rule 3: Conceptual or statement slide with title -> Confidence scale
    if (title && title.length > 4) {
      return {
        kind: 'scale',
        prompt: 'How confident do you feel with: "' + title + '"?',
        options: [],
        points: 5,
        lowLabel: 'Unsure',
        highLabel: 'Confident',
        heuristic: true,
        fallback: !!opts.fallback
      };
    }

    // Rule 4: General check / pacing pulse
    return {
      kind: 'poll',
      prompt: title
        ? 'Should we do another example of "' + title + '", or move on?'
        : 'Should we do another example, or move on to the next topic?',
      options: ['Another example', 'Ready to move on', 'Have a question'],
      heuristic: true,
      fallback: !!opts.fallback
    };
  }

  function generateOfflineCustomPrompt(promptText) {
    var text = String(promptText || '').trim();
    var lc = text.toLowerCase();

    if (/scale|rate|rating|confidence|1 to 5|how well|how confident/.test(lc)) {
      return {
        kind: 'scale',
        prompt: text || 'How confident do you feel right now?',
        options: [],
        points: 5,
        lowLabel: 'Low',
        highLabel: 'High',
        heuristic: true
      };
    }

    if (/one word|word cloud|in a word|feeling/.test(lc)) {
      return {
        kind: 'wordcloud',
        prompt: text || 'In one word, how are you feeling about this?',
        options: [],
        heuristic: true
      };
    }

    if (/agree|disagree|statement|opinion/.test(lc)) {
      return {
        kind: 'poll',
        prompt: text || 'Do you agree or disagree?',
        options: ['Agree', 'Disagree', 'Neutral / Unsure'],
        heuristic: true
      };
    }

    if (/^(should|is|do|can|would|are|will|could)\b/i.test(text) || /\?$/.test(text)) {
      return {
        kind: 'poll',
        prompt: text,
        options: ['Yes', 'No', 'Not sure'],
        heuristic: true
      };
    }

    return {
      kind: 'poll',
      prompt: text || 'Quick pulse check',
      options: ['Yes', 'No'],
      heuristic: true
    };
  }

  /* ------------------------------------------------ Live Generative AI (Gemini REST) */

  /* The transport: prompt out, parsed JSON back. Shaping what comes back is
     each caller's job, because a poll and a set of quiz questions want very
     different things from the same endpoint. */
  async function callServerRaw(systemPrompt, userPrompt) {
    var fetchFn = global.fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('fetch is not available in this environment');
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
    try {
      var res = await fetchFn(aiUrl('/api/ai/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt }),
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        /* 503 means this deployment has no key, which is not a failure for a
           poll — the heuristics are the designed answer to it. */
        throw new Error('AI endpoint returned status ' + res.status);
      }
      var data = await res.json();
      if (!data || !data.text) throw new Error('No content returned by the AI endpoint');
      return JSON.parse(data.text);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function callServer(systemPrompt, userPrompt) {
    var parsed = await callServerRaw(systemPrompt, userPrompt);
    var kind = parsed.kind === 'scale' ? 'scale' : parsed.kind === 'wordcloud' ? 'wordcloud' : 'poll';
    var options = Array.isArray(parsed.options)
      ? parsed.options.map(function (o) { return String(o).trim(); }).filter(Boolean)
      : [];
    if (kind === 'poll' && options.length < 2) options = ['Yes', 'No'];
    return {
      kind: kind,
      prompt: String(parsed.prompt || '').trim() || 'Class poll',
      options: options,
      points: parsed.points || 5,
      lowLabel: parsed.lowLabel || 'Low',
      highLabel: parsed.highLabel || 'High',
      heuristic: false
    };
  }

  async function generatePollForSlide(slide, opts) {
    opts = opts || {};
    var live = await checkLiveAI();
    if (!live) return generateOfflineSlidePoll(slide, opts);

    var slideTitle = slide ? String(slide.title || '') : '';
    var slideBody = slide ? String(slide.body || '') : '';
    var slideTerms = extractSlideTerms(slide).join(', ');

    var system = 'You are a pedagogical assistant for live classroom polling in SlideForge. ' +
      'Generate a quick formative assessment or check-for-understanding poll to ask students right now based on the slide. ' +
      'Output ONLY a valid JSON object matching: ' +
      '{"kind":"poll"|"scale"|"wordcloud", "prompt":"concise question (max 100 chars)", "options":["Opt 1", "Opt 2", ...] (2-4 items for poll, empty array for scale/wordcloud), "lowLabel":"...", "highLabel":"..."}';

    var user = 'Current slide title: ' + slideTitle + '\n' +
      (slideBody ? 'Slide content: ' + slideBody.slice(0, 300) + '\n' : '') +
      (slideTerms ? 'Key terms on slide: ' + slideTerms + '\n' : '') +
      'Generate an engaging, highly relevant classroom poll for this moment.';

    try {
      var result = await callServer(system, user);
      return result;
    } catch (err) {
      // Graceful fallback to pedagogical heuristics on any API/network failure
      return generateOfflineSlidePoll(slide, Object.assign({}, opts, { fallback: true }));
    }
  }

  async function generatePollFromPrompt(textPrompt, opts) {
    opts = opts || {};
    var live = await checkLiveAI();
    if (!live) return generateOfflineCustomPrompt(textPrompt);

    var system = 'You are a pedagogical assistant for live classroom polling in SlideForge. ' +
      'The teacher wants to ask this question to students: "' + textPrompt + '". ' +
      'Formulate appropriate voting options or determine if it is a scale or wordcloud. ' +
      'Output ONLY valid JSON matching: ' +
      '{"kind":"poll"|"scale"|"wordcloud", "prompt":"...", "options":["..."], "lowLabel":"...", "highLabel":"..."}';

    try {
      var result = await callServer(system, textPrompt);
      return result;
    } catch (err) {
      return generateOfflineCustomPrompt(textPrompt);
    }
  }

  /* ------------------------------------------------ questions for a game */

  /**
   * Write questions for the game being edited.
   *
   * The brief is built from the engine's own contract rather than from a
   * general idea of "a quiz": the style, how many answers it takes, and the
   * questions already written so the model does not repeat them. That is the
   * background knowledge the poll generator never had — it was handed a slide
   * and nothing about the game around it.
   *
   * Everything that comes back is normalized and then put through the
   * engine's own `problems()`. Anything it rejects is dropped rather than
   * repaired, because a question that fails validation is exactly the thing
   * a teacher would not notice until the room was looking at it.
   *
   * @returns {Promise<{questions: any[], rejected: number, heuristic: boolean} | {error: string}>}
   */
  async function generateQuestionsForGame(game, opts) {
    opts = opts || {};
    if (!game || !SF.gameStyle || !SF.makeQuestion || !SF.normalizeQuestion) {
      return { error: 'The game engines are not loaded.' };
    }
    var engine = SF.gameStyle(game.style);
    if (!engine) return { error: 'Unknown game style.' };

    /* Only the pick-an-answer engines for now. A format answered by typing, by
       ordering, by placing a value on a line or by a teacher's verdict needs
       fields this brief does not ask for, and half-filled questions would fail
       validation and be silently dropped — which reads as "the AI did
       nothing" rather than "this format is not supported yet". */
    if (engine.input !== 'choice') {
      return { error: (engine.label || 'This format') + ' is not written by AI yet — it needs answers this brief cannot supply. Try Browse quizzes for a starter bank.' };
    }

    /* Subject knowledge is the whole job here, and heuristics do not have
       any. Inventing "Which organelle contains chlorophyll?" is not something
       word-frequency can do, so with no server key this says so and points at
       the curated starter banks, which are real content. */
    var live = await checkLiveAI();
    if (!live) {
      return { error: 'Writing questions needs the AI server key. Without it, Browse quizzes has starter banks for every format.' };
    }

    var topic = String(opts.topic || game.title || '').trim();
    if (!topic) return { error: 'Give it a topic to write about.' };
    var want = Math.max(1, Math.min(10, Number(opts.count) || 4));

    var fixed = Array.isArray(engine.fixedOptions) && engine.fixedOptions.length
      ? engine.fixedOptions : null;
    var min = fixed ? fixed.length : (engine.minOptions || 2);
    var max = fixed ? fixed.length : (engine.maxOptions || 4);

    var existing = (game.questions || [])
      .map(function (q) { return String(q.question || '').trim(); })
      .filter(Boolean).slice(0, 20);

    var system = 'You write classroom quiz questions for a teacher. Output ONLY a JSON object: ' +
      '{"questions":[{"question":"...","options":["..."],"correct":0,"explanation":"..."}]}. ' +
      'Rules: exactly ' + want + ' questions. ' +
      (fixed
        ? 'Every question must use exactly these options, in this order: ' + JSON.stringify(fixed) + '. '
        : 'Between ' + min + ' and ' + max + ' options each, all plausible. ') +
      '"correct" is the 0-based index of the right option. ' +
      'Every wrong option must be a mistake a learner could actually make, not filler. ' +
      'The explanation is one sentence a teacher can read aloud after the reveal.';

    var user = 'Format: ' + (engine.label || game.style) + '. Topic: ' + topic + '.' +
      (opts.notes ? '\nTeacher notes: ' + String(opts.notes).slice(0, 500) : '') +
      (existing.length
        ? '\nDo not repeat these questions already in the quiz:\n- ' + existing.join('\n- ')
        : '');

    var raw;
    try {
      raw = await callServerRaw(system, user);
    } catch (err) {
      return { error: 'The AI server could not be reached. Your questions are untouched.' };
    }

    var list = raw && Array.isArray(raw.questions) ? raw.questions : [];
    var out = [];
    var rejected = 0;
    list.slice(0, want).forEach(function (row) {
      var q = Object.assign(SF.makeQuestion(game.style), {
        question: String((row && row.question) || '').trim(),
        options: fixed
          ? fixed.slice()
          : (Array.isArray(row && row.options) ? row.options.map(function (o) { return String(o).trim(); }) : []),
        correct: Number(row && row.correct) || 0,
        explanation: String((row && row.explanation) || '').trim()
      });
      q = SF.normalizeQuestion(q, game.style);
      /* The engine has the final say, exactly as it does for a question a
         teacher typed. */
      if (engine.problems && engine.problems(q, out.length + 1)) { rejected++; return; }
      out.push(q);
    });

    if (!out.length) {
      return { error: 'Nothing came back that this format accepts. Try a narrower topic.' };
    }
    return { questions: out, rejected: rejected, heuristic: false };
  }

  var AI = {
    /* Availability, not credentials. Nothing here can read or set a key,
       because the browser never has one. */
    checkLiveAI: checkLiveAI,
    liveAIKnown: liveAIKnown,
    generatePollForSlide: generatePollForSlide,
    generateQuestionsForGame: generateQuestionsForGame,
    generatePollFromPrompt: generatePollFromPrompt,
    extractSlideTerms: extractSlideTerms
  };

  SF.AI = AI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
