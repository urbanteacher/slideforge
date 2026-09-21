/* The deck settings dialog, and what it puts in it: aspect ratio, slide
 * numbers, the ending card, the AI panel and its smoke test, readiness, and
 * the logo fields.
 *
 * Moved out of js/editor.js, which was 4,417 lines — the largest thing left in
 * the app that a person had to read whole. Its inspector band alone is 2,352
 * lines and six clusters; this is the first of them, chosen because it has the
 * best ratio in the band: 503 lines against a contract of thirteen names.
 *
 * Eight names live here and two leave.
 *
 * Seven helpers are injected as values because js/editor.js never reassigns
 * them. Three — `deck`, `UI` and `ws` — are injected as accessors and read at
 * the top of each function that needs them, because the editor does reassign
 * deck and UI as decks are loaded, and declares ws below this band entirely.
 * Capturing those three would have frozen them, and for ws would have captured
 * undefined. This is the same mistake that broke the desk's wall overlay in
 * the presenter move; it is cheaper to write the accessor than to find it
 * again from a smoke failure.
 */
export function createDeckSettings(SF, helpers) {
  const {$, el, current, touched, draw, pick, select} = helpers;

  /**
   * Settings that belong to the whole presentation rather than to one slide.
   *
   * The logo lived in the slide inspector, which was the wrong place twice
   * over: it is one mark for the whole deck, so it read as a per-slide
   * property it is not, and it sat below the layout and content fields where
   * a teacher had to scroll past everything they were actually editing to
   * reach it.
   */
  function openDeckSettings() {
    var deck = helpers.deck(), UI = helpers.UI(), ws = helpers.ws();
    var body = $('settingsBody');
    var title = $('settingsTitle');
    if (title) title.textContent = 'Presentation settings';
    if (!body) return;
    var bodyEl = body;

    function draw2() {
      bodyEl.innerHTML = '';
      /* The only way to set a theme now that the top bar has no dropdown. */
      bodyEl.appendChild(UI.field('Theme', SF.Shell.themePicker(deck.theme, function (v) {
        ws.onTheme(v);
        draw2();
      }), 'Sets the default colours for the presentation. Customise this slide can override text and background colours.'));
      drawLogoFields(bodyEl, draw2);
      drawAspect(bodyEl, draw2);
      drawNumbers(bodyEl);
      drawEnding(bodyEl, draw2);
      drawAiSettings(bodyEl, draw2);
      drawReadiness(bodyEl);
    }
    draw2();
    SF.Shell.openModal('settingsModal', function () {
      SF.Store.save(deck);
      draw();
    });
  }

  /**
   * How the lesson finishes, when it has a game in it.
   *
   * An embedded game already puts its board up the moment that game ends —
   * which is mid-lesson. Ten slides later it is gone, and with two games there
   * are two boards and never a combined one. Offered only when the deck
   * actually embeds a game: an option that does nothing is worse than no
   * option, because it reads as broken rather than as not applicable.
   *
   * @param {HTMLElement} body   settings panel
   * @param {function} draw2     redraw the panel
   */
  /* The shape of the stage. In deck settings, not per slide: a deck whose
     slides disagreed about their own proportions would letterbox differently
     from one slide to the next, which reads as the projector losing sync. */
  function drawAspect(body, draw2) {
    var deck = helpers.deck(), UI = helpers.UI();
    var current = (SF.ASPECTS && SF.ASPECTS[deck.aspect]) ? deck.aspect : '16:9';
    var opts = Object.keys(SF.ASPECTS || { '16:9': 1 }).map(function (k) {
      return { value: k, label: SF.ASPECTS[k].label };
    });
    body.appendChild(UI.field('Slide shape', UI.select(opts, current, function (v) {
      deck.aspect = v;
      touched();
      draw2();
      draw();
    }),
      current === '16:9'
        ? 'What most projectors and every laptop want.'
        : 'Slides keep their width and gain height, so nothing you have written moves — ' +
          'there is simply more room under it. Check a busy slide before you teach.'));
  }

  /* Slide numbers used to be a checkbox in the top bar, and the only one:
     every other document-wide choice lives here, so it joins them. */
  function drawNumbers(body) {
    var deck = helpers.deck(), UI = helpers.UI();
    var box = el('div');
    box.appendChild(UI.check('Show slide numbers', deck.showSlideNumbers !== false, function (v) {
      deck.showSlideNumbers = v; touched(); draw();
    }));
    box.appendChild(el('div', 'hint', 'A small counter in the corner of every slide but the title, on the projector and in the shared link.'));
    body.appendChild(UI.field('Slide numbers', box));
  }

  function drawEnding(body, draw2) {
    var deck = helpers.deck(), UI = helpers.UI();
    var games = deck.slides.filter(function (s) { return s.type === 'game'; });
    if (!games.length) return;
    var box = el('div');
    box.appendChild(UI.check('Finish on the final scores', deck.finalScores === true, function (v) {
      deck.finalScores = v; touched(); draw2(); draw();
    }));
    box.appendChild(el('div', 'hint', games.length === 1
      ? 'Adds one scoreboard after your last slide, covering the whole lesson.'
      : 'Adds one scoreboard after your last slide, adding up all ' +
        games.length + ' games rather than showing each in turn.'));
    body.appendChild(UI.field('How the lesson ends', box,
      deck.finalScores
        ? 'Your own last slide still plays; the scores come after it.'
        : 'Off, so the lesson ends on the slide you wrote.'));
  }

  function drawAiSettings(body, draw2) {
    var UI = helpers.UI();
    var box = el('div', 'ai-settings-box');

    /* No key field. The credential lives in the server's environment
       (GEMINI_API_KEY) and never reaches a browser, so there is nothing here
       for a teacher to paste, leak or have read out of localStorage by
       anything else running on the page. This panel reports what the
       deployment can do; it cannot change it. */
    var badge = el('div', 'ai-badge');
    badge.style.marginBottom = '8px';
    badge.style.fontSize = '13px';
    badge.style.fontWeight = '600';
    box.appendChild(badge);

    var note = el('div', 'hint', '');
    note.style.marginTop = '6px';
    box.appendChild(note);

    function paint(live) {
      badge.textContent = live
        ? '● Live AI active — generated on this server'
        : '○ Smart pedagogical heuristics active (no setup needed)';
      badge.style.color = live ? 'var(--s-accent, #38bdf8)' : 'var(--s-dim, #94a3b8)';
      note.textContent = live
        ? 'Suggestions are generated by this SlideForge server, which holds the ' +
          'API key. Nothing is sent from this browser to the AI provider, and ' +
          'the key is never loaded into the page.'
        : 'Instant polls and checks work with no setup, from the wording on your ' +
          'slide. For generated questions and distractors, set GEMINI_API_KEY in ' +
          'the environment of the server running SlideForge, then restart it.';
    }

    paint(!!(SF.AI && SF.AI.liveAIKnown && SF.AI.liveAIKnown()));
    if (SF.AI && SF.AI.checkLiveAI) SF.AI.checkLiveAI().then(paint);

    var actions = el('div', 'ai-smoke-actions');
    actions.style.marginTop = '10px';
    actions.appendChild(UI.button('Open AI smoke test…', 'primary', function () {
      openAiSmokeTest();
    }));
    box.appendChild(actions);
    box.appendChild(el('div', 'hint',
      'Checks /api/ai/status and runs one small generate call. Use it before class to confirm the key and model are live.'));

    body.appendChild(UI.field('AI assistance', box));
  }

  /**
   * Interactive AI smoke test — live status + one generate round-trip.
   * Opens in the settings sheet so Lesson studio keeps one modal pattern.
   */
  function openAiSmokeTest() {
    var UI = helpers.UI();
    var body = $('settingsBody');
    var title = $('settingsTitle');
    if (title) title.textContent = 'AI smoke test';
    if (!body) return;
    var bodyEl = body;
    var pollTimer = null;
    var inFlight = false;

    function stopPoll() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function line(logEl, kind, msg) {
      var row = el('div', 'ai-smoke-line ai-smoke-' + (kind || 'info'));
      var stamp = new Date();
      var hh = String(stamp.getHours()).padStart(2, '0');
      var mm = String(stamp.getMinutes()).padStart(2, '0');
      var ss = String(stamp.getSeconds()).padStart(2, '0');
      row.appendChild(el('span', 'ai-smoke-time', hh + ':' + mm + ':' + ss));
      row.appendChild(el('span', 'ai-smoke-msg', msg));
      logEl.insertBefore(row, logEl.firstChild);
      while (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
    }

    function paintStatus(card, s) {
      card.innerHTML = '';
      var live = !!(s && s.available);
      var badge = el('div', 'ai-badge');
      badge.style.fontSize = '13px';
      badge.style.fontWeight = '600';
      badge.style.color = live ? 'var(--s-accent, #38bdf8)' : 'var(--s-dim, #94a3b8)';
      badge.textContent = live
        ? '● AI is live'
        : '○ AI offline (heuristics only)';
      card.appendChild(badge);

      var dl = el('div', 'ai-smoke-meta');
      function meta(k, v) {
        var row = el('div', 'ai-smoke-meta-row');
        row.appendChild(el('span', 'ai-smoke-k', k));
        row.appendChild(el('span', 'ai-smoke-v', v == null || v === '' ? '—' : String(v)));
        dl.appendChild(row);
      }
      meta('Origin', s && s.origin);
      meta('Model', s && s.model);
      meta('Available', s ? String(!!s.available) : '—');
      meta('HTTP', s && s.httpStatus ? String(s.httpStatus) : '—');
      meta('Probe', s && s.ms != null ? (s.ms + ' ms') : '—');
      meta('lastError', s && s.lastError != null ? String(s.lastError) : 'none');
      if (s && s.error) meta('Error', s.error);
      meta('Checked', s && s.at ? s.at.replace('T', ' ').replace(/\.\d+Z$/, ' Z') : '—');
      card.appendChild(dl);
    }

    function refreshStatus(card, logEl, quiet) {
      if (!SF.AI || !SF.AI.probeStatus) {
        if (!quiet) line(logEl, 'fail', 'SF.AI.probeStatus is missing in this build.');
        return Promise.resolve(null);
      }
      return SF.AI.probeStatus().then(function (s) {
        paintStatus(card, s);
        if (!quiet) {
          line(logEl, s.available ? 'ok' : 'warn',
            s.available
              ? ('Status OK — ' + (s.model || 'model?') + ' in ' + s.ms + ' ms')
              : ('Status offline' + (s.error ? (': ' + s.error) : '') +
                (s.lastError != null ? (' (lastError ' + s.lastError + ')') : '') +
                ' · ' + s.ms + ' ms'));
        }
        return s;
      });
    }

    function drawPanel() {
      bodyEl.innerHTML = '';

      var intro = el('div', 'hint',
        'Realtime check of this deployment’s AI. Status refreshes every few seconds while this panel is open. Run the generate test once before class.');
      intro.style.marginBottom = '12px';
      bodyEl.appendChild(intro);

      var statusCard = el('div', 'ai-smoke-card');
      bodyEl.appendChild(UI.field('Live status', statusCard));

      var topicBox = el('div');
      var topicInput = UI.text('SlideForge', null, 'Topic for the smoke reply');
      topicBox.appendChild(topicInput);
      bodyEl.appendChild(UI.field('Generate topic', topicBox,
        'Sent in a tiny fixed prompt. Does not touch your lesson.'));

      var logEl = el('div', 'ai-smoke-log');
      bodyEl.appendChild(UI.field('Event log', logEl));

      var resultEl = el('pre', 'ai-smoke-result');
      resultEl.textContent = 'Generate result will appear here.';
      bodyEl.appendChild(UI.field('Last generate', resultEl));

      var row = el('div', 'ai-smoke-actions');
      var btnRefresh = UI.button('Refresh status', 'ghost', function () {
        refreshStatus(statusCard, logEl, false);
      });
      var btnRun = UI.button('Run generate test', 'primary', function () {
        if (inFlight) {
          line(logEl, 'warn', 'Already running a generate test.');
          return;
        }
        inFlight = true;
        btnRun.disabled = true;
        btnRun.textContent = 'Generating…';
        line(logEl, 'info', 'POST /api/ai/generate…');
        var topic = topicInput.value || 'SlideForge';
        (SF.AI && SF.AI.runSmokeTest
          ? SF.AI.runSmokeTest({ topic: topic })
          : Promise.resolve({ ok: false, error: 'SF.AI.runSmokeTest missing', ms: 0, httpStatus: 0, text: null, parsed: null }))
          .then(function (r) {
            if (r.ok) {
              line(logEl, 'ok', 'Generate OK in ' + r.ms + ' ms (HTTP ' + r.httpStatus + ')');
              SF.toast('AI smoke test passed — ' + r.ms + ' ms');
            } else {
              line(logEl, 'fail',
                'Generate failed' +
                (r.httpStatus ? (' HTTP ' + r.httpStatus) : '') +
                (r.error ? (': ' + r.error) : '') +
                ' · ' + r.ms + ' ms');
              SF.toast('AI smoke test failed' + (r.error ? (': ' + r.error) : ''));
            }
            try {
              resultEl.textContent = JSON.stringify({
                ok: r.ok,
                httpStatus: r.httpStatus,
                ms: r.ms,
                error: r.error,
                parsed: r.parsed,
                text: r.text
              }, null, 2);
            } catch (e) {
              resultEl.textContent = String(r && r.text || r && r.error || e);
            }
            /* Keep the app-wide AI badge in sync after a real round-trip. */
            return refreshStatus(statusCard, logEl, true);
          })
          .finally(function () {
            inFlight = false;
            btnRun.disabled = false;
            btnRun.textContent = 'Run generate test';
          });
      });
      var btnBack = UI.button('← Presentation settings', 'ghost', function () {
        stopPoll();
        openDeckSettings();
      });
      row.appendChild(btnRun);
      row.appendChild(btnRefresh);
      row.appendChild(btnBack);
      bodyEl.appendChild(row);

      line(logEl, 'info', 'Panel open — probing status…');
      refreshStatus(statusCard, logEl, false);
      stopPoll();
      pollTimer = setInterval(function () {
        refreshStatus(statusCard, logEl, true);
      }, 4000);
    }

    drawPanel();
    SF.Shell.openModal('settingsModal', function () {
      stopPoll();
    });
  }

  /* What will go wrong in the room, listed before the room.
     In the settings sheet rather than behind its own button: it is the last
     thing you look at before presenting, and it belongs next to the other
     whole-deck settings rather than being one more control on the bar. */
  function drawReadiness(insp) {
    var deck = helpers.deck(), UI = helpers.UI();
    var r = SF.readiness(deck, function (id) { return SF.GameStore.get(id); });
    var box = el('div', 'ready-box');

    if (!r.items.length) {
      box.appendChild(el('div', 'ready-ok', '\u2713 Nothing to fix. Every slide has ' +
        'something on it and no media is missing.'));
      insp.appendChild(UI.field('Ready to teach', box));
      return;
    }

    r.items.forEach(function (f) {
      var row = el('button', 'ready-row ready-' + f.level);
      row.type = 'button';
      row.appendChild(el('span', 'ready-dot', f.level === 'stop' ? '!' : '?'));
      var t = el('span', 'ready-text');
      t.appendChild(el('strong', null, f.title));
      t.appendChild(el('span', null, ' ' + f.detail));
      row.appendChild(t);
      /* Clicking takes you to the slide, because a list of problems you then
         have to go and find is a list of problems. */
      if (f.slide != null) {
        row.title = 'Go to slide ' + (f.slide + 1);
        row.onclick = function () {
          select(f.slide);
          var close = /** @type {HTMLElement|null} */ (document.querySelector('#settingsModal [data-close]'));
          if (close) close.click();
        };
      } else {
        row.disabled = true;
      }
      box.appendChild(row);
    });

    insp.appendChild(UI.field('Ready to teach', box,
      r.stop
        ? r.stop + (r.stop === 1 ? ' thing will' : ' things will') + ' visibly fail in front of a class.'
        : 'Nothing will break. The rest depends on the room you are in.'));
  }

  function drawLogoFields(insp, redraw) {
    var deck = helpers.deck(), UI = helpers.UI();
    var wrap = el('div', 'logo-fields');
    if (deck.logo) {
      var preview = el('div', 'logo-preview');
      var img = document.createElement('img');
      img.src = deck.logo;
      img.alt = 'Lesson logo';
      preview.appendChild(img);
      var clear = UI.button('Remove logo', 'ghost', function () {
        deck.logo = '';
        deck.logoOn = 'none';
        touched();
        if (redraw) redraw(); else draw();
      });
      preview.appendChild(clear);
      wrap.appendChild(preview);
    }
    var pick = el('input');
    pick.type = 'file';
    pick.accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif';
    pick.style.fontSize = '12px';
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 1.5 * 1024 * 1024) {
        /* Say the size. "Keep it under 1.5 MB" leaves someone staring at a
           file picker wondering whether anything happened at all. */
        SF.toast('That file is ' + (f.size / 1024 / 1024).toFixed(1) + ' MB. ' +
          'Logos have to stay under 1.5 MB, or the lesson outgrows the ' +
          'browser storage it is saved in.');
        pick.value = '';
        return;
      }
      var fr = new FileReader();
      fr.onerror = function () { SF.toast('That file could not be read.'); };
      fr.onload = function () {
        /* Decode it before keeping it. A file with an image extension the
           browser cannot actually draw stores fine and renders as nothing,
           which is the one failure that looks exactly like the feature being
           broken \u2014 an empty corner and no message anywhere. */
        if (typeof fr.result !== 'string') return;
        var dataUrl = fr.result;
        var test = new Image();
        test.onload = function () {
          deck.logo = dataUrl;
          /* A logo nobody can see is indistinguishable from no logo, so
             uploading one turns it on. */
          if (deck.logoOn === 'none') deck.logoOn = 'all';
          touched();
          if (redraw) redraw(); else draw();
        };
        test.onerror = function () {
          SF.toast('That file is named like an image but the browser cannot ' +
            'draw it, so it would leave an empty corner. Try a PNG or SVG.');
          pick.value = '';
        };
        test.src = dataUrl;
      };
      fr.readAsDataURL(f);
    });
    wrap.appendChild(pick);
    insp.appendChild(UI.field('Lesson logo', wrap,
      'Corner mark on slides. PNG or SVG works best.'));
    var url=UI.text('',function(){},'https://…');
    insp.appendChild(UI.field('Or use a logo image URL',url));
    insp.appendChild(UI.button('Use logo URL','ghost',function(){
      var src=SF.safeHref(url.value);if(!src){SF.toast('Enter an http or https image URL');return;}
      var image=new Image();image.onload=function(){deck.logo=src;if(deck.logoOn==='none')deck.logoOn='all';touched();if(redraw)redraw();else draw();};
      image.onerror=function(){SF.toast('Could not load that image. Check the URL or upload a file.');};image.src=src;
    }));
    if (!deck.logo) return;

    /* Where the logo goes is the header/footer slots' business once they are
       switched on: a logo slot reads deck.logo and header-footer.css hides
       .slide-logo on a managed slide, so Logo size and Show logo on would be
       two controls for a position they no longer decide. The upload above
       stays either way — it is the only thing that sets deck.logo, and the
       slot has nothing to draw without it.
       Not removed outright: every one of the 22 library decks still uses the
       legacy path, because headerFooter.enabled defaults to false. */
    var managed = !!(deck.headerFooter && deck.headerFooter.enabled);
    if (managed) {
      insp.appendChild(el('p', 'hint',
        'Header and footer slots are on, so they decide where this logo sits and how '
        + 'big it is. Put it in a slot from Header & footer in the slide panel.'));
    }

    if (!managed) insp.appendChild(UI.field('Logo size',UI.select([{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],deck.logoSize||'medium',function(v){deck.logoSize=v;touched();if(redraw)redraw();else draw();})));

    insp.appendChild(UI.field('Organisation',
      UI.text(deck.org || '', function (v) {
        deck.org = v.trim(); touched(); if (redraw) redraw(); else draw();
      }, 'Northeastern University London'),
      'Printed by themes that carry an institution line — on this theme, across ' +
      'the top of section slides. Leave it empty and nothing is printed.'));

    /* A one-colour lockup only works on the grounds it was drawn for. The
       themes already flip it white on the slides they paint dark, but a deck
       whose logo is already white needs that turned off, and a deck taught on
       a dark projector may want it on throughout. */
    insp.appendChild(UI.field('On dark slides', UI.select([
      { value: 'auto', label: 'Let the theme decide' },
      { value: 'always', label: 'Always show the logo white' },
      { value: 'never', label: 'Never change it — my logo is already light' }
    ], deck.logoReverse === 'always' || deck.logoReverse === 'never' ? deck.logoReverse : 'auto',
      function (v) { deck.logoReverse = v; touched(); if (redraw) redraw(); else draw(); }),
      'Your logo is one colour, and a dark title or section slide swallows a dark one. ' +
      'Auto turns it white only where this theme paints a dark ground; a picture slide ' +
      'can still be set on its own in Customise this slide.'));

    if (!managed) insp.appendChild(UI.field('Show logo on', UI.select([
      { value: 'all', label: 'Every slide' },
      /* Was "Title slide only", which named a layout rather than a position
         and so did nothing at all on a deck that opens on a Section. */
      { value: 'title', label: 'First slide only' },
      { value: 'none', label: 'Hidden' }
    ], deck.logoOn === 'title' || deck.logoOn === 'none' ? deck.logoOn : 'all',
      function (v) { deck.logoOn = v; touched(); if (redraw) redraw(); else draw(); })));

    /* Where it actually lands, on a real slide.
       "I added a logo and cannot see it" has three causes and this answers
       all of them: it is set to Hidden, it is on the first slide only and you
       are looking at another one, or you are looking at the slide list, which
       leaves the logo off along with the slide numbers. */
    var shown = deck.slides.filter(function (sl, i) {
      return SF.deckShowsLogo(deck, sl, i);
    }).length;
    var sample = 0;
    for (var i = 0; i < deck.slides.length; i++) {
      if (SF.deckShowsLogo(deck, deck.slides[i], i)) { sample = i; break; }
    }

    if (shown) {
      var frame = el('div', 'logo-shot');
      var slide = SF.renderSlide(deck, deck.slides[sample], {
        index: sample, total: deck.slides.length
      });
      frame.appendChild(slide);
      SF.fit(frame, slide);
      insp.appendChild(UI.field('On the slide', frame,
        'Slide ' + (sample + 1) + ' of ' + deck.slides.length + ' \u00b7 on ' + shown +
        (shown === 1 ? ' slide' : ' slides') +
        '. The slide list on the left leaves it off, along with the numbers.'));
    } else {
      insp.appendChild(UI.field(null, null,
        'Set to Hidden, so it appears on no slides.'));
    }
  }

  return {openDeckSettings: openDeckSettings, openAiSmokeTest: openAiSmokeTest};
}
