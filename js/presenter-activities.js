/* Private presenter authoring UI. Show projects a wall overlay; End clears it. */
(function () {
  'use strict';
  var SF = window.SF, service = SF.LiveActivities;
  /** @type {any} */ var state = null;
  /** @type {any} */ var catalog = null;
  /** @type {any} */ var draft = null;
  /** @type {any[]} */ var preview = [];
  var previewIndex = 0, revision = 0, checkedRevision = -1, showing = false, busy = false;
  var sequence = 0;
  var pending = new Map();
  var deskBus = null;
  try { deskBus = new BroadcastChannel('slideforge.presenter.v1'); } catch (e) {}
  /** @returns {any} */ function $(id) { return document.getElementById(id); }
  function status(message) { $('activityStatus').textContent = message; }
  function controls() {
    ['activityManual', 'activityAI', 'activityPreview', 'activitySave', 'activityDiscard'].forEach(function (id) {
      var el = $(id); if (el) el.disabled = busy;
    });
    var launch = $('activityLaunch'), end = $('activityEnd');
    if (launch) launch.disabled = busy || showing || checkedRevision !== revision || !preview.length;
    if (end) end.disabled = busy || !showing;
    if ($('activityFields')) $('activityFields').inert = busy;
    if ($('activityTitle')) $('activityTitle').disabled = busy;
  }
  function changed() {
    revision++; checkedRevision = -1; preview = [];
    $('activityPreviewArea').hidden = true;
    controls();
  }
  function request(action, data) {
    return new Promise(function (resolve, reject) {
      var hasOpener = window.opener && !window.opener.closed;
      if (!hasOpener && !deskBus) { reject(new Error('The slideshow window is closed.')); return; }
      var id = 'activity-' + (++sequence);
      var timeout = setTimeout(function () { pending.delete(id); reject(new Error('No reply yet. Your draft is retained. Reopen the presenter if the slideshow has closed.')); }, 120000);
      pending.set(id, { resolve: resolve, reject: reject, timeout: timeout });
      /* One route to the wall, not both — through the desk's one sender.
         Sending by the opener AND the channel meant the wall ran every
         request twice: the second AI draft hit the "already writing" lock the
         first one was holding, and that error is what came back, so a first
         press of Draft with AI reported a busy engine. */
      var msg = Object.assign({
        type: 'sf-presenter-cmd', cmd: 'activity', action: action, requestId: id, id: id
      }, data || {});
      if (SF && SF.deskSend) SF.deskSend(msg);
      else if (hasOpener) window.opener.postMessage(msg, location.origin);
      else if (deskBus) deskBus.postMessage(msg);
    });
  }
  async function work(message, operation) {
    if (busy) return;
    busy = true; controls(); status(message);
    try { await operation(); } catch (error) { status(error instanceof Error ? error.message : 'Could not complete that action.'); }
    finally { busy = false; controls(); }
  }
  function takeWallMessage(data) {
    if (!data) return;
    if (data.type === 'sf-presenter-state') {
      if (state && state.startedAt !== data.startedAt && draft) {
        draft = null; $('activityDraft').hidden = true; changed(); status('A new lesson started. Create a new draft.');
      }
      state = data;
      showing = !!(data.spontaneous && data.spontaneous.id);
      controls();
    }
    if (data.type !== 'sf-activity-result') return;
    var wait = pending.get(data.requestId);
    if (!wait) return;
    clearTimeout(wait.timeout); pending.delete(data.requestId);
    if (data.error) wait.reject(new Error(data.error)); else wait.resolve(data.result);
  }
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || !event.data) return;
    if (window.opener && !window.opener.closed && event.source !== window.opener) return;
    takeWallMessage(event.data);
  });
  if (deskBus) deskBus.onmessage = function (event) { takeWallMessage(event.data); };
  function choices() {
    if (!catalog) return;
    var kind = $('activityKind').value, filter = $('activitySearch').value.toLowerCase();
    var rows = catalog[kind === 'activity' ? 'activities' : kind === 'game' ? 'games' : 'saved'];
    var select = $('activityChoice'), old = select.value;
    select.replaceChildren();
    rows.filter(function (row) { return (row.title + ' ' + (row.phase || '') + ' ' + (row.blurb || '')).toLowerCase().includes(filter); }).forEach(function (row) {
      var option = document.createElement('option'); option.value = row.key; option.textContent = row.title; select.appendChild(option);
    });
    if (Array.from(select.options).some(function (o) { return /** @type {HTMLOptionElement} */ (o).value === old; })) select.value = old;
    describe();
  }
  function describe() {
    var kind = $('activityKind').value;
    var rows = catalog ? catalog[kind === 'activity' ? 'activities' : kind === 'game' ? 'games' : 'saved'] : [];
    var row = rows.find(function (item) { return item.key === $('activityChoice').value; });
    $('activityDescription').textContent = row ? row.blurb || (kind === 'saved' ? 'Edit a separate copy of this saved quiz.' : SF.gameStyle(row.key).blurb) : 'No matches. Try another search or category.';
  }
  async function load() { catalog = await request('catalogue'); choices(); }
  window.addEventListener('sf-activities-open', function () { if (!catalog) work('Loading…', async function () { await load(); status(''); }); });
  $('activityKind').onchange = function () { $('activitySearch').value = ''; choices(); };
  $('activitySearch').oninput = choices;
  $('activityChoice').onchange = describe;
  $('activityUseSlide').onclick = function () {
    var slide = state && state.deck.slides[state.index];
    if (!slide) { status('Waiting for the current slide.'); return; }
    $('activityTopic').value = [slide.title, SF.slideExcerpt(slide)].filter(Boolean).join('\n').slice(0, 1000);
  };
  $('activityUseLesson').onclick = function () { $('activityTopic').value = state ? state.deck.title : ''; };
  async function create(ai, override) {
    if (!catalog) await load();
    var data = Object.assign({ kind: $('activityKind').value, key: $('activityChoice').value, ai: ai, topic: $('activityTopic').value.trim(), notes: $('activityKeywords').value.trim(), count: Number($('activityCount').value) }, override || {});
    if (!data.key) throw new Error('Choose an activity or game first.');
    var response = await request('draft', data);
    draft = response.draft; showing = false; changed(); draw();
    $('activityDraft').scrollIntoView({ block: 'start' });
    var summary = draft.generated ? ': ' + draft.generated.accepted + (draft.generated.accepted === 1 ? ' question ready, ' : ' questions ready, ') + draft.generated.rejected + ' rejected.' : '.';
    status(ai ? 'AI draft ready' + summary : 'Editable draft ready — replace examples, then preview.');
  }
  $('activityManual').onclick = function () { work('Preparing an editable draft…', function () { return create(false); }); };
  $('activityAI').onclick = function () { work('Writing a private draft…', function () { return create(true); }); };
  window.addEventListener('sf-activity-quiz-draft', function (event) {
    var detail = /** @type {CustomEvent} */ (event).detail;
    // Start the work before selecting the tab so its initial catalogue load does not race it.
    work('Writing a private quiz draft…', async function () {
      if (!catalog) await load();
      $('activityKind').value = 'game'; $('activitySearch').value = ''; choices();
      $('activityChoice').value = detail.style; describe();
      $('activityTopic').value = detail.topic; $('activityKeywords').value = detail.keywords || '';
      $('activityCount').value = String(detail.count);
      return create(true, { impromptu: true });
    });
    var tab = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-panel="activities"]'));
    if (tab) tab.click();
  });
  function label(key) {
    return ({ accept: 'Accepted answers (one per line)', options: 'Answers (one per line)', studySeconds: 'Study time (seconds)', pointValue: 'Points for this question', targetScore: 'Target score', gridSize: 'Bingo grid size (2, 3 or 4)', timeLimit: 'Time limit (seconds)', allowTypos: 'Allow minor spelling errors', itemA: 'First item', itemB: 'Second item', defaultTime: 'Default time (seconds)' })[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }
  var fieldId = 0;
  function field(parent, title, value, update, options) {
    var wrap = document.createElement('div'), caption = document.createElement('label');
    /** @type {any} */
    var input = document.createElement(options ? 'select' : typeof value === 'boolean' || typeof value === 'number' ? 'input' : 'textarea');
    input.id = 'activity-field-' + (++fieldId); caption.htmlFor = input.id; caption.textContent = title;
    if (options) {
      options.forEach(function (o, i) { var option = document.createElement('option'); option.value = String(i); option.textContent = o; input.appendChild(option); });
      input.value = String(value);
    } else if (typeof value === 'boolean') { input.type = 'checkbox'; input.checked = value; }
    else if (typeof value === 'number') { input.type = 'number'; input.value = String(value); }
    else { input.rows = 2; input.value = Array.isArray(value) ? value.join('\n') : String(value == null ? '' : value); }
    input.oninput = function () {
      var next = options || typeof value === 'number' ? Number(input.value) : typeof value === 'boolean' ? input.checked : Array.isArray(value) ? input.value.split('\n') : input.value;
      update(next); changed();
    };
    wrap.append(caption, input); parent.appendChild(wrap);
    return input;
  }
  function button(parent, title, action) { var b = document.createElement('button'); b.className = 'btn'; b.textContent = title; b.onclick = action; parent.appendChild(b); return b; }
  function draw() {
    $('activityDraft').hidden = !draft;
    if (!draft) return;
    $('activityTitle').value = draft.title; $('activityGuidance').textContent = draft.guidance;
    var root = $('activityFields'); root.replaceChildren();
    if (draft.game) {
      var game = draft.game, engine = SF.gameStyle(game.style);
      field(root, 'Default time per question (seconds; 0 for untimed)', game.settings.defaultTime, function (v) { game.settings.defaultTime = Math.max(0, v); });
      field(root, 'Show how to play before the game', game.settings.howTo !== false, function (v) { game.settings.howTo = v; });
      game.questions.forEach(function (q, i) {
        var box = document.createElement('details'); box.className = 'activity-question'; box.open = i === 0;
        var summary = document.createElement('summary'); summary.textContent = 'Item ' + (i + 1) + ' · ' + (q.term || q.question || 'Edit content'); box.appendChild(summary);
        var keys = Object.keys(engine.make()).filter(function (key) { return !(engine.fixedOptions && (key === 'options' || key === 'correct')) && !(game.style === 'order' && key === 'correct') && !(game.style === 'compare' && (key === 'options' || key === 'correct')); });
        if (!keys.includes('explanation')) keys.push('explanation');
        keys.push('notes');
        /** @type {any} */ var correctSelect = null;
        keys.forEach(function (key) {
          if (key === 'correct') {
            correctSelect = field(box, 'Correct answer', q.correct, function (v) { q.correct = v; }, q.options || []); return;
          }
          var value = q[key] == null ? engine.make()[key] == null ? '' : engine.make()[key] : q[key];
          field(box, game.style === 'order' && key === 'options' ? 'Items in correct order (one per line)' : label(key), value, function (v) {
            q[key] = v;
            if (key === 'options' && correctSelect) {
              correctSelect.replaceChildren(); v.forEach(function (text, n) { var option = document.createElement('option'); option.value = String(n); option.textContent = text; correctSelect.appendChild(option); });
              correctSelect.value = String(q.correct);
            }
          });
        });
        button(box, 'Remove item', function () { game.questions.splice(i, 1); changed(); draw(); });
        root.appendChild(box);
      });
      button(root, 'Add item', function () { game.questions.push(SF.makeQuestion(game.style)); changed(); draw(); });
    } else {
      draft.slides.forEach(function (slide, i) {
        var box = document.createElement('div'); box.className = 'activity-question';
        var heading = document.createElement('h3'); heading.textContent = 'Page ' + (i + 1); box.appendChild(heading);
        field(box, 'Slide title', slide.title, function (v) { slide.title = v; });
        (draft.fields[i] || []).forEach(function (f) {
          if (f.slide === 'title') return;
          var value = service.read(slide, f.slide);
          if (f.type === 'minutes') value = Number(value || 0) / 60;
          field(box, f.label + (f.type === 'minutes' ? ' (minutes)' : ''), value, function (v) { service.write(slide, f.slide, f.type === 'minutes' ? Math.max(0, Number(v)) * 60 : v); });
        });
        if (slide.feedback) {
          field(box, 'Question for learner responses', slide.feedback.prompt || '', function (v) { slide.feedback.prompt = v; });
          if (slide.feedback.kind === 'poll') field(box, 'Poll answers (one per line)', slide.feedback.options || [], function (v) { slide.feedback.options = v; });
        }
        field(box, 'Private teacher notes / answers', slide.notes || '', function (v) { slide.notes = v; });
        root.appendChild(box);
      });
    }
    controls();
  }
  $('activityTitle').oninput = function () { if (draft) { draft.title = $('activityTitle').value; changed(); } };
  function showPreview() {
    var box = $('activityPreviewBox'); box.replaceChildren();
    if (!preview.length) return;
    $('activityPreviewArea').hidden = false;
    var node = SF.renderSlide(state.deck, preview[previewIndex], { index: previewIndex, total: preview.length, interactive: false });
    box.appendChild(node); requestAnimationFrame(function () { SF.fit(box, node); });
    $('activityPreviewPosition').textContent = (previewIndex + 1) + ' / ' + preview.length;
    $('activityPreviewPrev').disabled = previewIndex === 0;
    $('activityPreviewNext').disabled = previewIndex === preview.length - 1;
  }
  $('activityPreviewPrev').onclick = function () { if (previewIndex > 0) { previewIndex--; showPreview(); } };
  $('activityPreviewNext').onclick = function () { if (previewIndex + 1 < preview.length) { previewIndex++; showPreview(); } };
  $('activityPreview').onclick = function () { work('Checking this draft…', async function () {
    var result = await request('preview', { draft: draft });
    preview = result.slides; previewIndex = 0; checkedRevision = revision; showPreview(); $('activityPreviewArea').scrollIntoView({ block: 'start' }); status('Ready to launch or queue.');
  }); };
  ['launch', 'save'].forEach(function (action) {
    $('activity' + action[0].toUpperCase() + action.slice(1)).onclick = function () { work(action === 'save' ? 'Saving a reusable copy…' : 'Showing on the wall…', async function () {
      var result = await request(action, { draft: draft });
      if (result.showing) showing = true;
      if (action === 'save') { catalog = await request('catalogue'); choices(); }
      status(result.message);
    }); };
  });
  $('activityEnd').onclick = function () { work('Ending…', async function () {
    var result = await request('end');
    showing = false;
    status(result.message);
  }); };
  $('activityDiscard').onclick = function () { draft = null; changed(); draw(); status('Draft discarded.'); };
  var ret = $('activityReturn');
  if (ret) ret.onclick = function () { work('Ending…', async function () { var result = await request('end'); showing = false; status(result.message); }); };
  window.addEventListener('resize', function () { if (preview.length) showPreview(); });
})();
