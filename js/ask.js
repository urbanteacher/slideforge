/* In-app confirmation.
   window.confirm() is not dependable: in an embedded webview — including the
   one this app is developed in — it returns false immediately without ever
   drawing a dialog. Every "are you sure?" in the app was therefore a button
   that did nothing at all, silently, which is worse than either outcome.
   A real <dialog> works everywhere and looks like the rest of the app.
   Loaded by index.html and manual.html, so both sides have it. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};
  var box = null, onYes = null, lastFocus = null;

  function build() {
    box = document.createElement('dialog');
    box.className = 'ask-modal';
    box.innerHTML =
      '<h3 id="askTitle"></h3><p id="askDetail"></p>' +
      '<div id="askQr" class="ask-qr" hidden></div>' +
      '<input id="askInput" type="text" hidden>' +
      '<div class="ask-actions">' +
      '<button class="btn" value="no" id="askNo">Cancel</button>' +
      '<button class="btn primary" value="yes" id="askYes">Confirm</button>' +
      '</div>';
    document.body.appendChild(box);
    /* Built by the innerHTML above, so these are present by construction. */
    const no = /** @type {HTMLButtonElement} */ (box.querySelector('#askNo'));
    const yes = /** @type {HTMLButtonElement} */ (box.querySelector('#askYes'));
    const field = /** @type {HTMLInputElement} */ (box.querySelector('#askInput'));
    no.onclick = function () { box.close('no'); };
    yes.onclick = function () { box.close('yes'); };
    box.addEventListener('close', function () {
      var value = field.hidden ? undefined : field.value;
      var go = box.returnValue === 'yes' && onYes;
      var fn = onYes;
      onYes = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (go) fn(value);
    });
    /* Enter confirms from the field, the way it would in a browser prompt. */
    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); box.close('yes'); }
    });
    /* Escape and the backdrop both mean no, which is the safe answer for
       every question this dialog is used to ask. */
    box.addEventListener('click', function (e) {
      if (e.target === box) box.close('no');
    });
  }

  /**
   * Ask before doing something that cannot be undone.
   *
   * @param {object} o  { title, detail, confirm, danger, value, placeholder, qr }
   * @param {function} yes  run only if they confirm
   */
  function ask(o, yes) {
    o = o || {};
    if (!box) build();
    lastFocus = document.activeElement;
    onYes = yes;
    box.querySelector('#askTitle').textContent = o.title || 'Are you sure?';
    var detail = box.querySelector('#askDetail');
    detail.textContent = o.detail || '';
    detail.hidden = !o.detail;
    var field = box.querySelector('#askInput');
    field.hidden = typeof o.value !== 'string';
    field.value = typeof o.value === 'string' ? o.value : '';
    if (o.placeholder) field.placeholder = o.placeholder;
    /* Same encoder as the join wall. A share URL is a join URL's cousin —
       origin + a path + a short id — so it fits the version-6 cap. If it
       does not, the address is still in the field; the code just stays off. */
    var qrBox = box.querySelector('#askQr');
    if (qrBox) {
      var payload = o.qr === true ? field.value : (typeof o.qr === 'string' ? o.qr : '');
      qrBox.innerHTML = '';
      qrBox.hidden = true;
      if (payload && SF.qrSvg) {
        try {
          qrBox.innerHTML = SF.qrSvg(payload, {
            size: 180, quiet: 3, title: 'Open ' + payload
          });
          qrBox.hidden = false;
        } catch (e) {}
      }
      box.classList.toggle('has-qr', !qrBox.hidden);
    }
    var go = box.querySelector('#askYes');
    go.textContent = o.confirm || 'Confirm';
    go.classList.toggle('danger', o.danger !== false);
    box.returnValue = 'no';
    box.showModal();
    if (field.hidden) go.focus(); else { field.focus(); field.select(); }
  }

  /**
   * Ask for a line of text. window.prompt() does not merely fail in an
   * embedded webview — it throws, so renaming a learner raised an uncaught
   * error rather than doing nothing.
   *
   * @param {object} o  { title, detail, value, placeholder, confirm, qr }
   * @param {function} got  run with the text, only if they confirm
   */
  function askText(o, got) {
    o = o || {};
    ask({ title: o.title, detail: o.detail, confirm: o.confirm || 'Save',
      danger: false, value: String(o.value == null ? '' : o.value),
      placeholder: o.placeholder, qr: o.qr }, function (value) {
        var text = String(value == null ? '' : value).trim();
        if (text) got(text);
      });
  }

  /**
   * Two or three named choices, not confirm-or-cancel.
   *
   * ask() answers one question with yes or no, which is wrong when the user
   * is picking between things rather than agreeing to one: a single button
   * reading "Make both links" is not a choice, it is a sentence.
   *
   * Its own dialog rather than a mode of ask(), because sharing one element
   * means every option has to remember to undo what the last caller set, and
   * that is how a dialog ends up with a stray input on it.
   *
   * @param {object} o  { title, detail, options: [{ label, detail, value, disabled, why }] }
   * @param {function} pick  called with the chosen value; not called on cancel
   */
  function askChoice(o, pick) {
    o = o || {};
    var dlg = document.createElement('dialog');
    dlg.className = 'ask-modal ask-choice';
    var h = document.createElement('h3'); h.textContent = o.title || 'Which one?';
    dlg.appendChild(h);
    if (o.detail) { var p = document.createElement('p'); p.textContent = o.detail; dlg.appendChild(p); }
    var list = document.createElement('div');
    list.className = 'choice-list';
    (o.options || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn choice' + (opt.disabled ? ' is-off' : '');
      var strong = document.createElement('strong');
      strong.textContent = opt.label || '';
      b.appendChild(strong);
      /* `detail` describes the option, `why` explains an unavailable one.
         Falling back either way, because a caller that supplies only one of
         them means the description, and an option that renders as a bare
         label is the bug this replaced. */
      var why = opt.disabled ? (opt.why || opt.detail) : (opt.detail || opt.why);
      if (why) { var d = document.createElement('span'); d.textContent = why; b.appendChild(d); }
      /* Disabled rather than absent, with the reason on it. An option that
         vanishes when unavailable is an option nobody discovers. */
      if (opt.disabled) b.disabled = true;
      else b.onclick = function () { dlg.close('picked'); if (pick) pick(opt.value); };
      list.appendChild(b);
    });
    dlg.appendChild(list);
    var actions = document.createElement('div');
    actions.className = 'ask-actions';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn';
    cancel.textContent = 'Cancel';
    cancel.onclick = function () { dlg.close('no'); };
    actions.appendChild(cancel);
    dlg.appendChild(actions);
    var was = /** @type {HTMLElement|null} */ (document.activeElement);
    dlg.addEventListener('close', function () {
      dlg.remove();
      /* Focus back where it was, so the keyboard does not land at the top of
         the document after a dialog that was opened from the top bar. */
      if (was && typeof was.focus === 'function') { try { was.focus(); } catch (e) {} }
    });
    document.body.appendChild(dlg);
    dlg.showModal();
    var first = /** @type {HTMLButtonElement|null} */ (list.querySelector('button:not([disabled])'));
    if (first) first.focus();
  }

  SF.ask = ask;
  SF.askText = askText;
  SF.askChoice = askChoice;
})(typeof window !== 'undefined' ? window : globalThis);
