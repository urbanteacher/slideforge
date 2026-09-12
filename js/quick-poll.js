/* SlideForge — the quick poll sheet, asked from the presentation itself.
 *
 * The presenter desk has the same controls, and a teacher with two screens
 * should use them. This is for the one-screen case: the question arrives in
 * the middle of a lesson, and the deck is the only thing on the projector.
 *
 * Everything here is presentation; the asking is SF.Live's, through
 * Player.quickPoll, so this route and the desk cannot drift apart. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF;
  if (!SF || !SF.Player || !SF.Player.on) return;

  /* The questions a teacher actually asks on the turn of a lesson. Each fills
     the same two boxes the custom route uses, so what is launched is always
     what is on screen rather than hidden preset state. */
  var PRESETS = [
    { key: 'yesno', label: 'Yes / No', kind: 'poll', options: ['Yes', 'No'] },
    { key: 'truefalse', label: 'True / False', kind: 'poll', options: ['True', 'False'] },
    { key: 'abcd', label: 'A / B / C / D', kind: 'poll', options: ['A', 'B', 'C', 'D'] },
    { key: 'scale', label: '1 to 5', kind: 'scale', options: [], prompt: 'How confident do you feel?' },
    { key: 'cloud', label: 'Word cloud', kind: 'wordcloud', options: [], prompt: 'One word: how was that?' }
  ];

  function build(body, close) {
    var UI = SF.Shell.UI;
    var el = SF.el;
    var kind = 'poll';

    /* UI.area's third argument is the row count, not a placeholder. */
    var promptBox = UI.area('', function () {}, 2);
    promptBox.placeholder = 'Shall we do another example, or move on?';
    promptBox.maxLength = 240;
    var optionsBox = UI.area('Yes\nNo', function () {}, 3);
    optionsBox.placeholder = 'One answer per line';
    optionsBox.maxLength = 400;

    var pills = el('div', 'quick-actions');
    pills.style.display = 'flex';
    pills.style.flexWrap = 'wrap';
    pills.style.gap = '6px';
    PRESETS.forEach(function (p) {
      var b = UI.button(p.label, '', function () {
        kind = p.kind;
        optionsBox.value = p.options.join('\n');
        optionsBox.disabled = p.kind !== 'poll';
        if (p.prompt && !promptBox.value.trim()) promptBox.value = p.prompt;
        Array.prototype.forEach.call(pills.children, function (c) { c.classList.toggle('on', c === b); });
      });
      pills.appendChild(b);
    });

    var aiBtn = UI.button('✨ AI Suggest', '', function () {
      if (!SF.AI || !SF.AI.generatePollForSlide) {
        guard.textContent = 'AI engine not loaded.';
        return;
      }
      var slide = SF.Player.deck && SF.Player.deck.slides ? SF.Player.deck.slides[SF.Player.idx] : null;
      guard.textContent = '✨ Thinking...';
      aiBtn.disabled = true;
      Promise.resolve(SF.AI.generatePollForSlide(slide)).then(function (generated) {
        if (!generated) {
          guard.textContent = 'Could not generate a poll for this slide.';
          return;
        }
        kind = generated.kind;
        promptBox.value = generated.prompt || '';
        optionsBox.value = (generated.options || []).join('\n');
        optionsBox.disabled = generated.kind !== 'poll';
        Array.prototype.forEach.call(pills.children, function (c) { c.classList.remove('on'); });
        aiBtn.classList.add('on');
        guard.textContent = generated.heuristic
          ? (generated.fallback ? '✨ Generated from slide (offline fallback)' : '✨ Generated diagnostic check from slide')
          : '✨ Generated with AI (Gemini)';
      }).catch(function () {
        guard.textContent = 'Failed to generate poll.';
      }).finally(function () {
        aiBtn.disabled = false;
      });
    });
    aiBtn.title = 'Generate a poll based on the current slide';
    var aiWrap = el('div', 'quick-ai-action');
    aiWrap.appendChild(aiBtn);

    body.appendChild(UI.field('Ask', pills, 'Pick a shape, then write the question.'));
    body.appendChild(UI.field('✨ AI Suggest', aiWrap, 'Generate a poll or diagnostic check from the current slide.'));
    body.appendChild(UI.field('Question', promptBox));
    body.appendChild(UI.field('Answers', optionsBox, 'One per line. Ignored for a scale or a word cloud.'));

    var where = UI.select([
      { value: 'focus', label: 'Full screen' },
      { value: 'rail', label: 'Beside the slide' }
    ], 'focus', function () {});
    body.appendChild(UI.field('Show it', where));

    var guard = el('p', 'hint', '');
    guard.id = 'quickPollGuard';
    guard.setAttribute('role', 'status');
    var go = UI.button('▶ Ask the room', 'primary', function () {
      var text = String(promptBox.value || '').trim();
      if (!text) { guard.textContent = 'Write the question the room is answering.'; return; }
      var options = String(optionsBox.value || '').split('\n')
        .map(function (l) { return l.trim(); }).filter(Boolean);
      if (kind === 'poll' && options.length < 2) {
        guard.textContent = 'A poll needs at least two answers, one per line.';
        return;
      }
      var started = SF.Player.quickPoll({
        action: 'start', kind: kind, prompt: text,
        options: options, presentAs: where.value
      });
      if (!started) { guard.textContent = 'Could not open the poll.'; return; }
      close();
    });
    body.appendChild(go);
    body.appendChild(guard);

    if (!(SF.Live && SF.Live.active)) {
      body.appendChild(el('p', 'hint',
        'Not hosting live, so nobody can answer yet — the question still goes ' +
        'up, and answers arrive if you host the lesson.'));
    }
  }

  SF.Player.on('quickPollOpen', function () {
    var body = document.getElementById('quickPollBody');
    if (!body || !SF.Shell || !SF.Shell.openModal) return;
    body.replaceChildren();
    var close = SF.Shell.openModal('quickPollModal');
    build(body, close);
  });
})(typeof window === 'undefined' ? {} : window);
