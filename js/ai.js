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
  /* One Gemini call at a time from this tab — double-clicks and parallel
     Write buttons must not stack requests against the shared Render key. */
  var aiBusy = false;

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

  /** Ask the server again — used before Write so a late key deploy is seen. */
  function recheckLiveAI() {
    liveAvailable = null;
    liveProbe = null;
    return checkLiveAI();
  }

  /** Synchronous best guess, for painting a status line before the probe lands. */
  function liveAIKnown() { return liveAvailable === true; }

  /**
   * Full /api/ai/status probe for the studio smoke-test panel.
   * Updates the cached availability flag used by the rest of the app.
   * @returns {Promise<{ok:boolean,available:boolean,model:string|null,lastError:*,httpStatus:number,ms:number,origin:string,at:string,error?:string}>}
   */
  function probeStatus() {
    var t0 = Date.now();
    var origin = aiUrl('');
    if (typeof global.fetch !== 'function') {
      liveAvailable = false;
      return Promise.resolve({
        ok: false, available: false, model: null, lastError: null,
        httpStatus: 0, ms: 0, origin: origin, at: new Date().toISOString(),
        error: 'fetch is not available in this environment'
      });
    }
    return global.fetch(aiUrl('/api/ai/status'), { cache: 'no-store' })
      .then(function (r) {
        return r.json().then(function (d) {
          var available = !!(d && d.available);
          liveAvailable = available;
          liveProbe = Promise.resolve(available);
          return {
            ok: r.ok,
            available: available,
            model: (d && d.model) || null,
            lastError: d && d.lastError != null ? d.lastError : null,
            httpStatus: r.status,
            ms: Date.now() - t0,
            origin: origin,
            at: new Date().toISOString()
          };
        }, function () {
          liveAvailable = false;
          return {
            ok: false, available: false, model: null, lastError: null,
            httpStatus: r.status, ms: Date.now() - t0, origin: origin,
            at: new Date().toISOString(), error: 'Status body was not JSON'
          };
        });
      })
      .catch(function (err) {
        liveAvailable = false;
        return {
          ok: false, available: false, model: null, lastError: null,
          httpStatus: 0, ms: Date.now() - t0, origin: origin,
          at: new Date().toISOString(),
          error: err && err.message ? String(err.message) : 'Could not reach the server'
        };
      });
  }

  /**
   * One small generate call for the smoke-test panel — direct, no busy lock /
   * retry, so the UI sees the raw HTTP result (including a 503).
   * @param {{topic?: string}} [opts]
   * @returns {Promise<{ok:boolean,httpStatus:number,ms:number,text:string|null,parsed:*,error:string|null,at:string}>}
   */
  function runSmokeTest(opts) {
    opts = opts || {};
    var topic = String(opts.topic || 'SlideForge').trim().slice(0, 80) || 'SlideForge';
    var t0 = Date.now();
    var at = new Date().toISOString();
    if (typeof global.fetch !== 'function') {
      return Promise.resolve({
        ok: false, httpStatus: 0, ms: 0, text: null, parsed: null,
        error: 'fetch is not available in this environment', at: at
      });
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, AI_CLIENT_TIMEOUT_MS) : null;
    return global.fetch(aiUrl('/api/ai/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'Reply with only a short JSON object. No markdown.',
        user: 'Return exactly: {"ok":true,"topic":' + JSON.stringify(topic) + ',"msg":"AI smoke test passed"}'
      }),
      signal: controller ? controller.signal : undefined,
      cache: 'no-store'
    }).then(function (r) {
      return r.json().then(function (d) {
        var text = d && d.text != null ? String(d.text) : null;
        var errMsg = d && d.error ? String(d.error) : null;
        var parsed = null;
        if (text) {
          try { parsed = parseModelJson(text); } catch (e) { parsed = null; }
        }
        return {
          ok: r.ok && !!text && !errMsg,
          httpStatus: r.status,
          ms: Date.now() - t0,
          text: text,
          parsed: parsed,
          error: errMsg || (!r.ok ? ('HTTP ' + r.status) : (!text ? 'No content returned' : null)),
          at: at
        };
      }, function () {
        return {
          ok: false, httpStatus: r.status, ms: Date.now() - t0,
          text: null, parsed: null,
          error: 'Generate body was not JSON', at: at
        };
      });
    }).catch(function (err) {
      var msg = err && err.name === 'AbortError'
        ? 'Timed out waiting for the AI provider'
        : (err && err.message ? String(err.message) : 'Could not reach the AI endpoint');
      return {
        ok: false, httpStatus: 0, ms: Date.now() - t0,
        text: null, parsed: null, error: msg, at: at
      };
    }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }


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

  /* --------------------------------------------------- reading model JSON */

  /* Ported from the lesson planner's lib/ai-service/core/json-parser.ts, which
     earned these repairs the hard way. A model told to return only JSON still
     wraps it in a ```json fence, trails a comma before the closing brace, or
     slips a control character into a string — and a bare JSON.parse throws on
     all three, which reads to a teacher as "the AI did nothing".

     Deliberately conservative: it finds the JSON span, removes the three
     things models actually get wrong, and otherwise leaves the text alone.
     The old app went further and rewrote quoting and whitespace, which can
     turn a recoverable response into a differently broken one. Anything that
     survives this is still validated field by field afterwards, and then by
     the engine itself. */
  function parseModelJson(text) {
    var raw = String(text == null ? '' : text).trim();

    /* ```json … ``` — by far the most common wrapper. */
    var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) raw = fenced[1].trim();

    /* Prose either side of the JSON: take the outermost object or array. */
    var span = raw.match(/[{[][\s\S]*[}\]]/);
    if (!span) throw new Error('No JSON in the response');
    var body = span[0];

    try { return JSON.parse(body); } catch (e) { /* fall through and repair */ }

    var repaired = body
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')   // control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')           // zero-width junk
      .replace(/,(\s*[}\]])/g, '$1');                   // trailing commas
    return JSON.parse(repaired);
  }

  /* Rows that are missing the fields the caller needs are dropped here rather
     than carried forward half-built — the same job parseJSONArray did in the
     old app, kept because it fails early and says which field was missing. */
  function modelRows(parsed, key) {
    return parsed && Array.isArray(parsed[key]) ? parsed[key]
      : Array.isArray(parsed) ? parsed : [];
  }

  function usableRows(list, required) {
    return list.filter(function (row) {
      if (!row || typeof row !== 'object') return false;
      return required.every(function (f) {
        return row[f] !== undefined && row[f] !== null && String(row[f]).trim() !== '';
      });
    });
  }

  /* How long this page waits before giving up on a generation.

     It has to OUTLAST the server's own abort, not undercut it. The server
     waits 30s (server.js, raised from 10s because a working key and a valid
     model still failed most of the time — flash routinely takes longer than
     ten seconds and the abort fired first). This side was aborting at 14s, so
     the browser killed the request less than halfway through the server's
     patience: any answer between 14 and 30 seconds was thrown away after the
     server had waited for it, and Write reported a failure for a call that
     was about to succeed. Measured against the live deploy, one real call was
     still running at 30.4s.

     Three seconds of headroom past the server, so the reply that reaches the
     room is the server's own 504 — "The AI provider took too long. Try
     again, or write the question yourself." — rather than a bare client
     abort with nothing to say. If the server's timeout moves, move this with
     it; tests/ai-timeouts.test.js fails if this one stops being the longer. */
  var AI_CLIENT_TIMEOUT_MS = 33000;

  /* One quiet retry, for the failure that actually happens.

     Gemini's own 503 arrives here as a 502 from our proxy, and it is usually
     over in seconds: across a day of testing, nine failures in ten were an
     upstream refusal that came back in under fifteen seconds rather than a
     timeout — 1.5s, 2.4s, 4.5s, 5.5s, 6.1s, 8.0s, 9.3s, 12.6s. Asking once
     more turns a good share of those into an answer nobody had to request
     twice.

     Narrow on purpose. A 429 is never retried: retrying a rate limit is how
     you earn it, and the server allows ten calls a minute on a key shared by
     every classroom. A 4xx will not change its mind. And a call that already
     spent the budget timing out has no room for a second attempt inside it,
     so only a failure that came back quickly is worth repeating. */
  var AI_RETRY_STATUS = { 502: true, 503: true };
  var AI_RETRY_AFTER_MS = 900;
  var AI_RETRY_ONLY_UNDER_MS = 9000;

  /* The transport: prompt out, parsed JSON back. Shaping what comes back is
     each caller's job, because a poll and a set of quiz questions want very
     different things from the same endpoint. */
  async function callServerRaw(systemPrompt, userPrompt) {
    var fetchFn = global.fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('fetch is not available in this environment');
    }
    if (aiBusy) throw new Error('AI is already writing — wait for it to finish.');
    aiBusy = true;

    async function attempt() {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, AI_CLIENT_TIMEOUT_MS) : null;
      try {
        var res = await fetchFn(aiUrl('/api/ai/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: String(systemPrompt || '').slice(0, 2200),
            user: String(userPrompt || '').slice(0, 1800)
          }),
          signal: controller ? controller.signal : undefined
        });
        if (!res.ok) {
          /* 503 means this deployment has no key, which is not a failure for a
             poll — the heuristics are the designed answer to it. */
          if (res.status === 429) throw new Error('Too many AI requests — wait a moment and try once.');
          var err = new Error('AI endpoint returned status ' + res.status);
          /* Carried so the retry rule below, and the callers, can tell a
             provider having a moment from a request that was refused. */
          err.aiStatus = res.status;
          throw err;
        }
        var data = await res.json();
        if (!data || !data.text) throw new Error('No content returned by the AI endpoint');
        return parseModelJson(data.text);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    try {
      var started = Date.now();
      try {
        return await attempt();
      } catch (first) {
        var status = Number(first && first.aiStatus) || 0;
        var quick = (Date.now() - started) < AI_RETRY_ONLY_UNDER_MS;
        if (!AI_RETRY_STATUS[status] || !quick) throw first;
        await new Promise(function (go) { setTimeout(go, AI_RETRY_AFTER_MS); });
        try {
          return await attempt();
        } catch (second) {
          /* Marked so a caller can say "twice" only when it was asked twice.
             A timeout is never retried — it has no budget left — so a message
             claiming two refusals would be wrong about the one failure the
             30s ceiling produces. */
          if (second) second.aiRetried = true;
          throw second;
        }
      }
    } finally {
      aiBusy = false;
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

  /* ------------------------------------------ guardrails for an activity */

  /* Ported from the lesson planner's lib/ai-service/prompts/activity-guidance.ts
     and its activity-classifier. One rule runs through all of them, and it is
     the one a model breaks by default:

       YOU CANNOT ASK STUDENTS TO ANALYSE SOMETHING YOU HAVE NOT PROVIDED.

     Asked to write an error-analysis activity, a model writes "Find the three
     mistakes in the work below" and then stops — the work below is not there.
     The lesson runs into a blank box in front of a class.

     SlideForge can enforce this where the old app could only ask, because the
     catalogue already names the slot the material goes in: Error Analysis
     declares a field labelled "Sample work · 3 errors", Worked Example
     Analysis one called "Completed example". So the rule becomes a check on a
     specific field rather than a paragraph of shouting. */
  /* Shared classroom voice — ported from the planner's teaching-first tone.
     Keep short: every activity and game prompt already carries format rules. */
  var CORE_PEDAGOGY =
    'Teach before you test. Write material students can use on the slide now, ' +
    'not instructions to the teacher. Prefer concrete examples, realistic ' +
    'misconceptions, and language readable from the back of the room. ' +
    'Never ask learners to analyse, sort, or discuss content you have not provided.';

  var ACTIVITY_GUARDRAILS = [
    {
      kind: 'worked-example',
      match: ['worked example', 'example analysis', 'case study', 'deconstruct',
        'examine example', 'study example', 'analyze example'],
      /* Their field 0 is the example itself. */
      material: /example|work|solution/i,
      rules: 'This activity asks students to analyse an example, so the example ' +
        'must be written out in full in the first box — the actual completed ' +
        'work, with its steps and its numbers, not a description of one. The ' +
        'later boxes then ask about what is in that first box.'
    },
    {
      kind: 'error-analysis',
      match: ['error analysis', 'find and fix', 'spot the error', 'spot the mistake',
        'identify mistakes', 'find the error', 'debug', 'misconception'],
      material: /sample|work|error|mistake/i,
      rules: 'This activity asks students to find mistakes, so the first box ' +
        'must contain the actual flawed work with the mistakes already in it. ' +
        'Make them realistic — the errors a learner genuinely makes, not typos ' +
        '— and mix conceptual with procedural. A later box gives the correct ' +
        'version and says why each one was wrong.'
    },
    {
      kind: 'sorting',
      match: ['card sort', 'categoris', 'categoriz', 'classify', 'sort into',
        'organise information', 'organize information'],
      material: /categor|items|sort|group/i,
      rules: 'Sorting needs both halves written out: the categories by name, ' +
        'and the items to sort into them. Twelve to twenty items, mixed ' +
        'difficulty, with two or three genuinely debatable ones — those are ' +
        'what the discussion is for.'
    },
    {
      kind: 'question-cube',
      match: ['question cube', 'six question', 'rosenshine'],
      material: /define|compare|why|example|what if|benefit|condition|cube/i,
      /* Ported from buildQuestionCubeGuidance — six Rosenshine stems, not a quiz. */
      rules: 'Fill six distinct question stems for the same topic: Define, Compare, ' +
        'Why, Example, What-if, and Benefits/conditions. Each box gets a real ' +
        'question plus a short model answer or talking points — not a blank ' +
        '"ask students to define…". Keep each stem on one concept so the cube ' +
        'deepens understanding rather than jumping topics.'
    },
    {
      kind: 'practice-stations',
      match: ['practice stations', 'quick practice', 'stations rotation', 'carousel'],
      material: /station|recall|apply|create|task/i,
      /* Ported from buildPracticeStationsGuidance — Recall → Apply → Create. */
      rules: 'Three stations, written as tasks students can do without you: ' +
        'Station 1 Recall (4–6 short memory questions), Station 2 Apply ' +
        '(2–3 problems in a new situation), Station 3 Create (one open ' +
        'product: diagram, analogy, or real-world link). Put the actual ' +
        'questions and tasks in the boxes — not rotation instructions alone.'
    },
    {
      kind: 'hook-predict',
      match: ['hook', 'predict', 'notice', 'wonder', 'stimulus'],
      material: /stimulus|image|scenario|claim|hook/i,
      rules: 'The stimulus itself goes in the first box — the actual image, ' +
        'number, claim or scenario the room is reacting to. Then ask what they ' +
        'notice and what they wonder, in those words: they invite an answer ' +
        'from a learner who does not yet know the topic, which is the point of ' +
        'a hook.'
    },
    {
      kind: 'discussion',
      match: ['think-pair-share', 'think pair', 'socratic', 'fishbowl', 'jigsaw',
        'turn and talk', 'discussion', 'dialogue', 'debate', 'peer teaching',
        'word splash'],
      material: null,
      rules: 'Discussion needs something to disagree about. Write a prompt with ' +
        'more than one defensible answer, not a question with a right answer — ' +
        'those close a conversation rather than open one.'
    },
    {
      kind: 'retrieval',
      match: ['retrieval', 'recall', 'review', 'recap', 'exit ticket', 'do now',
        'bell ringer', 'formative'],
      material: null,
      rules: 'Recall of what was taught before, in plain language a learner can ' +
        'answer in a sentence. No new material here and no trick questions: ' +
        'this is for confidence and for finding gaps.'
    },
    {
      kind: 'comparison',
      match: ['compare', 'contrast', 'venn', 'benefits vs', 'similarit',
        'pros and cons', 'advantages'],
      material: /item|concept|side|option|thing/i,
      rules: 'Name both things being compared and say what each one is before ' +
        'asking for similarities or differences. A comparison of two things the ' +
        'class cannot yet define is a guessing game.'
    }
  ];


  /* Matched on the key and title alone. The old app searched the description
     and the steps too, which is why a Think-Pair-Share whose steps happen to
     say "compare your answers" classified as a comparison activity and got
     told to define two concepts it does not have. SlideForge's titles are
     descriptive enough — "Error Analysis", "Concept Card Sort" — that the
     looser haystack only ever cost accuracy. The list is ordered most
     specific first for the same reason. */
  function classifyActivity(activity) {
    if (!activity) return null;
    var hay = [activity.key, activity.title].join(' ').toLowerCase();
    for (var i = 0; i < ACTIVITY_GUARDRAILS.length; i++) {
      var g = ACTIVITY_GUARDRAILS[i];
      for (var j = 0; j < g.match.length; j++) {
        if (hay.indexOf(g.match[j]) > -1) return g;
      }
    }
    return null;
  }

  /* "Fill this in", "describe the example here" — an instruction where the
     material should be. This is the failure the guardrails exist to stop, and
     it is worth catching after the fact as well as asking for it up front. */
  var PLACEHOLDER = /^(\s*)(\[|<|tbd\b|to be |insert |add |write |describe |provide |your |teacher |e\.g\.?$|example here|placeholder)/i;

  /* The box the material goes in, found by what it is called rather than
     where it sits: Hook & Predict keeps its stimulus in the title field, while
     Error Analysis keeps its flawed work in the first bullet. A fixed index
     pointed at the "Heading" of nearly every activity. */
  function materialFieldOf(guard, fields) {
    if (!guard || !guard.material) return null;
    for (var i = 0; i < fields.length; i++) {
      if (guard.material.test(String(fields[i].label || ''))) return fields[i];
    }
    return null;
  }

  function looksLikeAnInstruction(text) {
    var t = String(text == null ? '' : text).trim();
    if (t.length < 25) return true;
    return PLACEHOLDER.test(t);
  }

  /* ------------------------------------------- what each format asks for */

  /* The lesson planner had one generator per game — generateKeywords,
     generateOddOneOut, generateQuizBowl and a dozen more — rather than one
     prompt asked to cover everything. That is the part worth copying: a model
     told "write a quiz" writes multiple choice whatever you asked for, and a
     format whose whole point is a term and its definition gets four options
     it has no use for.

     So each style says what a row looks like, which fields must be present
     before the row is worth keeping, the rules that format actually needs,
     and how a row becomes a SlideForge question. The engine still has the
     final say afterwards — this decides what to ask for, not what is valid. */
  var AI_SPECS = {
    choice: {
      family: 'Multiple choice',
      row: '{"question":"...","options":["...","..."],"correct":0,"explanation":"..."}',
      required: ['question', 'options'],
      rules: 'Two to four options. Every wrong option must be a mistake a learner ' +
        'could actually make, not filler. "correct" is the 0-based index.',
      toQuestion: function (row) {
        return {
          question: String(row.question || '').trim(),
          options: (row.options || []).map(function (o) { return String(o).trim(); }),
          correct: Number(row.correct) || 0,
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    truefalse: {
      family: 'True or false',
      row: '{"question":"a statement","isTrue":true,"explanation":"..."}',
      required: ['question'],
      /* Ported rule: without it the model writes ten true statements. */
      rules: 'Each is a single statement that is clearly true or clearly false. ' +
        'Mix them roughly half and half. Do not write a question — write a claim.',
      toQuestion: function (row) {
        return {
          question: String(row.question || '').trim(),
          options: ['True', 'False'],
          correct: row.isTrue === true || String(row.isTrue) === 'true' ? 0 : 1,
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    lowstakes: {
      family: 'Low-stakes retrieval',
      row: '{"question":"...","answer":"short answer","explanation":"..."}',
      required: ['question', 'answer'],
      /* Ported almost verbatim — this one changed the output most. */
      rules: 'Keep questions straightforward and direct: basic recall, simple ' +
        'language, answers of one to three words. No trick questions and no ' +
        'multi-step problems. These build confidence rather than sort the class. ' +
        'Good: "What does CPU stand for?" -> "Central Processing Unit". ' +
        'Avoid: anything needing analysis.',
      toQuestion: function (row) {
        return {
          question: String(row.question || '').trim(),
          answer: String(row.answer || '').trim(),
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    type: {
      family: 'Short answer',
      row: '{"question":"...","accept":["main spelling","variant"],"explanation":"..."}',
      required: ['question', 'accept'],
      rules: 'The answer is typed, so "accept" lists every spelling you would ' +
        'take — the full form and the abbreviation, singular and plural. ' +
        'First entry is the one shown on screen. Keep answers to a few words.',
      toQuestion: function (row) {
        return {
          question: String(row.question || '').trim(),
          accept: (Array.isArray(row.accept) ? row.accept : [row.accept])
            .map(function (a) { return String(a).trim(); }).filter(Boolean),
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    oddone: {
      family: 'Odd one out',
      row: '{"options":["a","b","c","d"],"correct":2,"explanation":"why it is the odd one"}',
      required: ['options'],
      rules: 'Exactly four items. Three share a property and one does not, and ' +
        'the shared property must be the obvious one — if two different rules ' +
        'both work, the set has two answers and is unusable. "correct" is the ' +
        'index of the odd one. The explanation names the rule.',
      toQuestion: function (row) {
        var opts = (row.options || row.items || []).map(function (o) { return String(o).trim(); });
        var correct = Number(row.correct);
        if (!Number.isFinite(correct) && row.oddOneIndex != null) {
          correct = Number(row.oddOneIndex);
        }
        return {
          question: String(row.question || 'Which is the odd one out?').trim(),
          options: opts,
          correct: Number.isFinite(correct) ? correct : 0,
          explanation: String(row.explanation || row.reason || '').trim()
        };
      }
    },

    bingo: {
      family: 'Bingo (terms and definitions)',
      row: '{"term":"CPU","definition":"Brain of the computer"}',
      required: ['term', 'definition'],
      /* Ported: the old app fought long definitions hardest, because they do
         not fit on a bingo square. */
      rules: 'Definitions must be at most eight words and fit on one line. ' +
        'Good: "Brain of computer - processes instructions". ' +
        'Bad: "The Central Processing Unit is the electronic circuitry that...". ' +
        'Terms are single words or short phrases.',
      toQuestion: function (row) {
        return {
          term: String(row.term || '').trim(),
          definition: String(row.definition || '').trim(),
          question: String(row.term || '').trim(),
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    /* --- formats ported from vendor/lesson-planner-ai/generators/game-generators.ts --- */

    order: {
      family: 'Ranking / put in order',
      row: '{"question":"Put these in order…","options":["first","second","third","fourth"],"explanation":"..."}',
      required: ['question', 'options'],
      rules: 'Exactly three to six items already in the correct order in "options". ' +
        'The room will see them shuffled. Items must be unique and unambiguous — ' +
        'no two that could swap without changing meaning. The question states ' +
        'the ordering rule (time, size, process step, etc.).',
      toQuestion: function (row) {
        return {
          question: String(row.question || 'Put these in order.').trim(),
          options: (row.options || []).map(function (o) { return String(o).trim(); }),
          correct: 0,
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    wordreveal: {
      family: 'Word reveal',
      row: '{"word":"PHOTOSYNTHESIS","hint":"How plants make food","question":"What word is being revealed?"}',
      required: ['word', 'hint'],
      rules: 'One vocabulary word per row, 6–15 letters preferred, uppercase letters ' +
        'and spaces only. The hint is short and non-spoiling. Do not put the ' +
        'answer inside the hint.',
      toQuestion: function (row) {
        var word = String(row.word || '').trim();
        return {
          word: word,
          hint: String(row.hint || '').trim(),
          question: String(row.question || 'What word is being revealed?').trim(),
          accept: [word.toLowerCase()].filter(Boolean),
          difficulty: 'medium',
          dripInterval: 5
        };
      }
    },

    compare: {
      family: 'Compare and contrast',
      row: '{"itemA":"...","itemB":"...","similarities":"...","differences":"...","question":"..."}',
      required: ['itemA', 'itemB', 'similarities', 'differences'],
      rules: 'Two genuinely different concepts. Similarities and differences are ' +
        'full sentences a teacher can reveal after discussion — not one-word labels. ' +
        'Name each concept clearly before comparing.',
      toQuestion: function (row) {
        return {
          itemA: String(row.itemA || '').trim(),
          itemB: String(row.itemB || '').trim(),
          similarities: String(row.similarities || '').trim(),
          differences: String(row.differences || '').trim(),
          question: String(row.question || 'Compare these two — how are they alike, and how do they differ?').trim(),
          options: [],
          correct: -1
        };
      }
    },

    emoji: {
      family: 'Emoji guess',
      row: '{"clues":"🌱☀️💧→🌿","accept":["photosynthesis"],"hint":"How plants make food"}',
      required: ['clues', 'accept'],
      rules: 'Clues are emoji (and maybe arrows), not words. "accept" lists every ' +
        'spelling you would take. Hint helps without naming the answer.',
      toQuestion: function (row) {
        var accept = (Array.isArray(row.accept) ? row.accept : [row.accept])
          .map(function (a) { return String(a).trim(); }).filter(Boolean);
        return {
          clues: String(row.clues || row.question || '').trim(),
          question: String(row.clues || row.question || '').trim(),
          accept: accept,
          hint: String(row.hint || '').trim(),
          difficulty: 'medium',
          allowTypos: true
        };
      }
    },

    definition: {
      family: 'Definition challenge (read then recall)',
      row: '{"passage":"short factual paragraph","question":"recall question","accept":["answer","variant"]}',
      required: ['passage', 'question', 'accept'],
      rules: 'Passage is 2–4 sentences of teaching content. After it clears, the ' +
        'question must be answerable from that passage alone. "accept" lists ' +
        'spellings. No trick wording.',
      toQuestion: function (row) {
        return {
          passage: String(row.passage || '').trim(),
          question: String(row.question || '').trim(),
          accept: (Array.isArray(row.accept) ? row.accept : [row.accept])
            .map(function (a) { return String(a).trim(); }).filter(Boolean),
          allowTypos: true
        };
      }
    },

    slider: {
      family: 'Slider estimate',
      row: '{"question":"...","min":0,"max":100,"target":42,"tolerance":5,"unit":"%","explanation":"..."}',
      required: ['question', 'target'],
      rules: 'A numeric estimate with a realistic min/max band. Tolerance is how ' +
        'close counts as correct — wide enough to reward good thinking, not so ' +
        'wide that every answer scores. Unit is optional and short (%, km, °C).',
      toQuestion: function (row) {
        return {
          question: String(row.question || '').trim(),
          min: Number(row.min) || 0,
          max: Number(row.max) || 100,
          target: Number(row.target),
          tolerance: row.tolerance != null ? Number(row.tolerance) : 5,
          step: Number(row.step) || 1,
          unit: String(row.unit || '').trim(),
          explanation: String(row.explanation || '').trim()
        };
      }
    },

    connection: {
      family: 'Connection maker',
      row: '{"itemA":"...","itemB":"...","question":"How do these connect?","explanation":"..."}',
      required: ['itemA', 'itemB'],
      rules: 'Two related ideas from the topic. The question asks for the bridge ' +
        'between them. The explanation is the model link a teacher can Accept.',
      toQuestion: function (row) {
        var a = String(row.itemA || '').trim();
        var b = String(row.itemB || '').trim();
        return {
          itemA: a,
          itemB: b,
          question: String(row.question || ('How do ' + a + ' and ' + b + ' connect?')).trim(),
          explanation: String(row.explanation || '').trim(),
          options: ['Accept', 'Reject'],
          correct: 0
        };
      }
    },

    randomchallenge: {
      family: 'Random challenge (oracy / do-this)',
      row: '{"challenge":"Explain X to someone who missed last lesson.","explanation":"..."}',
      required: ['challenge'],
      rules: 'Short spoken or do-this challenges — explain, draw, give an example, ' +
        'teach a peer. No multiple-choice. Keep under two lines.',
      toQuestion: function (row) {
        var c = String(row.challenge || row.question || '').trim();
        return {
          challenge: c,
          question: c,
          explanation: String(row.explanation || '').trim(),
          options: ['Complete', 'Skip'],
          correct: 0
        };
      }
    },

    headsup: {
      family: 'Heads up (term to describe)',
      row: '{"term":"Mitochondria","category":"Biology","hint":"optional short clue"}',
      required: ['term'],
      rules: 'Single teachable terms. Category optional. Hint only if the term is ' +
        'obscure — never the definition itself.',
      toQuestion: function (row) {
        var term = String(row.term || '').trim();
        return {
          term: term,
          question: term,
          category: String(row.category || '').trim(),
          hint: String(row.hint || '').trim(),
          options: ['Correct', 'Pass'],
          correct: 0
        };
      }
    },

    spinexplain: {
      family: 'Spin and explain',
      row: '{"term":"Osmosis","hint":"Water moving across a membrane","category":""}',
      required: ['term'],
      rules: 'Concept words learners can explain aloud. Hint is a nudge, not the ' +
        'full answer.',
      toQuestion: function (row) {
        var term = String(row.term || '').trim();
        return {
          term: term,
          question: term,
          hint: String(row.hint || '').trim(),
          category: String(row.category || '').trim(),
          options: ['Clear', 'With hint', 'Reject'],
          correct: 0
        };
      }
    },

    conceptchain: {
      family: 'Concept chain',
      row: '{"term":"Cell","prompt":"The basic unit of living things — what connects next?"}',
      required: ['term', 'prompt'],
      rules: 'A start term plus a prompt that invites the next justified link in ' +
        'a chain. Prompts should reward causal or structural links, not random ' +
        'associations.',
      toQuestion: function (row) {
        return {
          term: String(row.term || '').trim(),
          prompt: String(row.prompt || '').trim(),
          question: String(row.prompt || 'Add the next justified link').trim(),
          options: ['Accept', 'Reject'],
          correct: 0
        };
      }
    }
  };

  /* The term/definition formats want exactly what bingo wants. */
  ['memoryflip', 'memorymatch', 'knowledgeflip'].forEach(function (k) {
    AI_SPECS[k] = Object.assign({}, AI_SPECS.bingo, {
      family: 'Matching pairs (terms and definitions)'
    });
  });
  /* Scored multiple-choice engines share the choice brief. */
  ['race', 'speed', 'boss'].forEach(function (k) { AI_SPECS[k] = AI_SPECS.choice; });

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

    var spec = AI_SPECS[game.style];
    if (!spec) {
      return { error: (engine.label || 'This format') + ' is not written by AI yet. Browse quizzes has a starter bank for it.' };
    }

    /* Subject knowledge is the whole job here, and heuristics do not have any.
       Inventing "Which organelle contains chlorophyll?" is not something
       word-frequency can do, so with no server key this says so and points at
       the curated starter banks, which are real content. */
    var live = await checkLiveAI();
    if (!live) {
      return { error: 'Writing questions needs the AI server key. Without it, Browse quizzes has starter banks for every format.' };
    }

    var topic = String(opts.topic || game.title || '').trim();
    if (!topic) return { error: 'Give it a topic to write about.' };
    var want = Math.max(1, Math.min(6, Number(opts.count) || 4));

    var fixed = Array.isArray(engine.fixedOptions) && engine.fixedOptions.length
      ? engine.fixedOptions : null;
    var existing = (game.questions || [])
      .map(function (q) { return String(q.question || q.term || '').trim(); })
      .filter(Boolean).slice(0, 8);

    var system = CORE_PEDAGOGY + ' ' +
      'You write classroom material for a teacher. ' +
      'Return ONLY a JSON object, no markdown and no code fence: ' +
      '{"questions":[' + spec.row + ']}. ' +
      'Exactly ' + want + ' entries. ' + String(spec.rules || '').slice(0, 500) +
      (fixed ? ' The options are fixed: ' + JSON.stringify(fixed) + ', in that order.' : '') +
      ' Every explanation is one short sentence.';

    var user = 'Format: ' + spec.family + '. Topic: ' + topic.slice(0, 120) + '.' +
      (opts.notes ? '\nNotes: ' + String(opts.notes).slice(0, 200) : '') +
      (existing.length ? '\nAlready written, do not repeat:\n- ' + existing.join('\n- ') : '');

    var parsed;
    try {
      parsed = await callServerRaw(system, user);
    } catch (err) {
      var fail = err && err.message ? String(err.message) : '';
      if (/Too many AI|already writing/i.test(fail)) return { error: fail };
      return { error: 'The AI server could not be reached. Your questions are untouched.' };
    }

    /* Three gates, narrowing: the row has the fields this format needs, the
       normalizer makes it a question of this style, and the engine says
       whether it is usable. Only the last one is authoritative — the first
       two just avoid asking it about obvious rubbish. */
    var all = modelRows(parsed, 'questions').slice(0, want);
    /* Lesson-planner generators used "items" / "oddOneIndex" / "reason" for
       odd-one-out; accept those aliases before the required-field gate. */
    all.forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      if (!row.options && Array.isArray(row.items)) row.options = row.items;
      if (row.correct == null && row.oddOneIndex != null) row.correct = row.oddOneIndex;
      if (!row.explanation && row.reason) row.explanation = row.reason;
      if (!row.word && row.term && game.style === 'wordreveal') row.word = row.term;
      if (!row.clues && row.sentence && game.style === 'emoji') row.clues = row.sentence;
    });
    var rows = usableRows(all, spec.required);
    var out = [];
    /* Rows thrown out here are rejections too. Counting only the ones the
       engine saw would under-report, and the toast is the teacher's only
       sign that they got fewer than they asked for. */
    var rejected = all.length - rows.length;
    rows.forEach(function (row) {
      var q;
      try {
        q = Object.assign(SF.makeQuestion(game.style), spec.toQuestion(row));
      } catch (e) { rejected++; return; }
      if (fixed) q.options = fixed.slice();
      q = SF.normalizeQuestion(q, game.style);
      if (engine.problems && engine.problems(q, out.length + 1)) { rejected++; return; }
      out.push(q);
    });

    if (!out.length) {
      return { error: 'Nothing came back that this format accepts. Try a narrower topic.' };
    }
    return { questions: out, rejected: rejected, heuristic: false };
  }

  /* -------------------------------------------------- writing an activity */

  /* What to do when the provider will not answer.

     Fill the one box whose content the topic already IS, and invent nothing
     else. Every activity in the catalogue carries a Heading field bound to
     the slide's title, so this is always available.

     The other boxes are deliberately left as they are. The starter copy that
     ships with an activity is written about somebody else's subject —
     perimeter and rectangles, all of it — so pasting it under a heading about
     osmosis would put the wrong lesson on the wall, which is the same mistake
     the library's draft answers exist to avoid. And filling four boxes with
     plausible-looking filler would be worse than filling none: filler reads
     as content, and it would be read out. So the room gets a true heading and
     the teacher keeps the typing, which is what they had before Write
     existed — minus the dead end. */
  function draftFromTopic(fields, topic, why) {
    var heading = fields.filter(function (f) {
      return f.type === 'text' && f.slide === 'title';
    })[0];
    if (!heading) return { error: why + ' The activity is untouched.' };
    var values = {};
    values[heading.slide] = topic.charAt(0).toUpperCase() + topic.slice(1);
    return {
      values: values,
      kind: null,
      repaired: 0,
      heuristic: true,
      fallback: true,
      notice: why + ' Topic written into the heading — the rest is yours.'
    };
  }

  /**
   * Fill in an activity's boxes for a topic.
   *
   * The catalogue already says what the boxes are — label, type and where the
   * value lands on the slide — so the brief is precise in a way a general
   * "write me a starter" never is. On top of that sits whichever guardrail the
   * activity classifies into, carried over from the lesson planner.
   *
   * @returns {Promise<{values: Record<string,string>, kind: string|null, repaired: number} | {error: string}>}
   */
  async function generateActivityContent(activity, opts) {
    opts = opts || {};
    if (!activity) return { error: 'No activity chosen.' };
    var fields = (activity.fields || []).filter(function (f) { return f.type !== 'minutes'; });
    if (!fields.length) {
      return { error: (activity.title || 'This activity') + ' has nothing to write — it is run in the room, not on the slide.' };
    }

    var live = await recheckLiveAI();
    if (!live) {
      return { error: 'Writing an activity needs the AI server key. Without it, every activity already arrives with editable starter content.' };
    }

    var topic = String(opts.topic || '').trim().slice(0, 120);
    if (!topic) return { error: 'Give it a topic to write about.' };

    /* Cap the brief: enough boxes for a slide, not a worksheet. Keeps the
       Gemini call small on the shared Render key. */
    fields = fields.slice(0, 6);

    var guard = classifyActivity(activity);
    var shape = {};
    fields.forEach(function (f, i) { shape['f' + i] = f.label; });

    var guardRules = guard && guard.rules
      ? String(guard.rules).slice(0, 320)
      : 'Keep each box short enough to read from the back of a room.';

    var system = CORE_PEDAGOGY + ' ' +
      'Write classroom activity content. Return ONLY JSON, no markdown, keys ' +
      JSON.stringify(Object.keys(shape)) + '. ' +
      'Each value is finished text for that box — no teacher instructions, no placeholders. ' +
      guardRules;

    var user = 'Activity: ' + String(activity.title || '').slice(0, 80) + '.' +
      '\nTopic: ' + topic + '.' +
      (opts.notes ? '\nNotes: ' + String(opts.notes).slice(0, 160) : '') +
      '\nBoxes:\n' +
      fields.map(function (f, i) { return 'f' + i + ' = ' + f.label; }).join('\n') +
      (activity.steps && activity.steps.length
        ? '\nRuns as:\n- ' + activity.steps.slice(0, 3).map(function (s) {
            return String(s).slice(0, 90);
          }).join('\n- ')
        : '');

    var parsed;
    try {
      parsed = await callServerRaw(system, user);
    } catch (err) {
      var msg = err && err.message ? String(err.message) : '';
      /* These two are the user's to resolve, and a draft would hide them: one
         asks for a pause, the other says a call is already running. */
      if (/Too many AI|already writing/i.test(msg)) return { error: msg };
      /* Everything else has already been retried once. Rather than handing
         back a dead end, say which failure it was and write what can honestly
         be written. 502 is the provider refusing; a 504 or an abort is it
         being too slow. */
      var status = Number(err && err.aiStatus) || 0;
      var slow = status === 504 || /abort|too long/i.test(msg);
      var refused = status === 502 || status === 503;
      var why = slow ? 'The AI provider did not answer in time.'
        : refused && err.aiRetried ? 'The AI provider is busy \u2014 it turned this down twice.'
        : refused ? 'The AI provider is busy.'
        : 'The AI server could not be reached.';
      return draftFromTopic(fields, topic, why);
    }

    var values = {};
    var missing = 0;
    fields.forEach(function (f, i) {
      var v = String((parsed && parsed['f' + i]) || '').trim();
      if (!v) { missing++; return; }
      values[f.slide] = v;
    });
    if (!Object.keys(values).length) {
      return { error: 'Nothing usable came back. Try a narrower topic.' };
    }

    /* The guardrail, enforced rather than merely asked for. If the activity
       declares a slot for the material students work on, and what came back
       for that slot is an instruction rather than the material, the whole
       thing is refused: a lesson that says "find the three mistakes below"
       above an empty box fails in front of a class, and quietly. */
    var mf = materialFieldOf(guard, fields);
    if (mf) {
      if (looksLikeAnInstruction(values[mf.slide])) {
        return {
          error: 'It described "' + mf.label + '" instead of writing it. ' +
            'That box has to hold the material students work on. Try again, ' +
            'or give it a narrower topic.'
        };
      }
    }

    return { values: values, kind: guard ? guard.kind : null, missing: missing };
  }

  var AI = {
    /* Availability, not credentials. Nothing here can read or set a key,
       because the browser never has one. */
    checkLiveAI: checkLiveAI,
    recheckLiveAI: recheckLiveAI,
    liveAIKnown: liveAIKnown,
    probeStatus: probeStatus,
    runSmokeTest: runSmokeTest,
    generatePollForSlide: generatePollForSlide,
    generateQuestionsForGame: generateQuestionsForGame,
    generateActivityContent: generateActivityContent,
    classifyActivity: classifyActivity,
    generatePollFromPrompt: generatePollFromPrompt,
    extractSlideTerms: extractSlideTerms,
    /* Exposed for tests and future studio UI that lists AI-writable formats. */
    gameSpec: function (style) { return AI_SPECS[style] || null; }
  };

  SF.AI = AI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
