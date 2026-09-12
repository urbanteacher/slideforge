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
   * @param {object} o  { title, detail, confirm, danger }
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
   * @param {object} o  { title, detail, value, placeholder, confirm }
   * @param {function} got  run with the text, only if they confirm
   */
  function askText(o, got) {
    o = o || {};
    ask({ title: o.title, detail: o.detail, confirm: o.confirm || 'Save',
      danger: false, value: String(o.value == null ? '' : o.value),
      placeholder: o.placeholder }, function (value) {
        var text = String(value == null ? '' : value).trim();
        if (text) got(text);
      });
  }

  SF.ask = ask;
  SF.askText = askText;
})(typeof window !== 'undefined' ? window : globalThis);
