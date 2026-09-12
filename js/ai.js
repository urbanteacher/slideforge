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

    // 1. Explicit slide keywords
    if (Array.isArray(slide.keywords)) {
      slide.keywords.forEach(function (k) {
        var w = typeof k === 'string' ? k : (k.word || k.term || '');
        if (w && String(w).trim()) terms.push(String(w).trim());
      });
    }

    // 2. Structured points or cards
    if (Array.isArray(slide.points)) {
      slide.points.forEach(function (p) {
        var txt = typeof p === 'string' ? p : (p.title || p.text || '');
        txt = String(txt).trim().replace(/^[-*•]\s*/, '');
        if (txt && txt.length <= 40) terms.push(txt);
      });
    }

    // 3. Italics / definitions
    if (Array.isArray(slide.italics)) {
      slide.italics.forEach(function (it) {
        var w = typeof it === 'string' ? it : (it.term || it.phrase || '');
        if (w && String(w).trim()) terms.push(String(w).trim());
      });
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

  async function callServer(systemPrompt, userPrompt) {
    var endpoint = aiUrl('/api/ai/generate');
    var body = { system: systemPrompt, user: userPrompt };

    var fetchFn = global.fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('fetch is not available in this environment');
    }

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 7500) : null;

    try {
      var res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);

      if (!res.ok) {
        /* 503 means this deployment has no key, which is not a failure — the
           heuristics below are the designed answer to it. */
        throw new Error('AI endpoint returned status ' + res.status);
      }

      var data = await res.json();
      if (!data || !data.text) {
        throw new Error('No content returned by the AI endpoint');
      }

      var parsed = JSON.parse(data.text);
      var kind = parsed.kind === 'scale' ? 'scale' : parsed.kind === 'wordcloud' ? 'wordcloud' : 'poll';
      var options = Array.isArray(parsed.options)
        ? parsed.options.map(function (o) { return String(o).trim(); }).filter(Boolean)
        : [];
      if (kind === 'poll' && options.length < 2) {
        options = ['Yes', 'No'];
      }

      return {
        kind: kind,
        prompt: String(parsed.prompt || '').trim() || 'Class poll',
        options: options,
        points: parsed.points || 5,
        lowLabel: parsed.lowLabel || 'Low',
        highLabel: parsed.highLabel || 'High',
        heuristic: false
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
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

  var AI = {
    /* Availability, not credentials. Nothing here can read or set a key,
       because the browser never has one. */
    checkLiveAI: checkLiveAI,
    liveAIKnown: liveAIKnown,
    generatePollForSlide: generatePollForSlide,
    generatePollFromPrompt: generatePollFromPrompt,
    extractSlideTerms: extractSlideTerms
  };

  SF.AI = AI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
