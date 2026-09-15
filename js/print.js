/* Student handout: a static copy of the authored deck, never the live DOM. */
(function () {
  'use strict';
  var SF = window.SF;
  function copy(s, fields) {
    var out = SF.normalizeSlide(Object.assign({}, JSON.parse(JSON.stringify(s)), fields || {}));
    out.progressive = false;
    out.notes = '';
    out.feedback = null;
    out.transition = 'none';
    return out;
  }
  /* Something to answer on.
   *
   * A poll carries its options, but a scale and a word cloud carry none — on
   * screen the room answers on a phone, so the slide needs nothing. Printed,
   * that left the page as a bare question with white space under it and no
   * way for a student to record anything. A scale gets its points with both
   * ends named, because 1 to 5 says nothing without them; an open kind gets
   * a line to write on. */
  function answerLines(f) {
    var given = (f.options || []).filter(function (o) { return String(o).trim(); });
    if (given.length) return given;
    if (f.kind === 'scale') {
      var points = SF.scaleLabels(f);
      return points.map(function (n, i) {
        if (i === 0 && f.lowLabel) return n + ' — ' + f.lowLabel;
        if (i === points.length - 1 && f.highLabel) return n + ' — ' + f.highLabel;
        return n;
      });
    }
    /* wordcloud and brainstorm: one word or a short phrase each. */
    var many = Math.max(1, Math.min(6, Number(f.max) || 1));
    var lines = [];
    for (var i = 0; i < many; i++) lines.push('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026');
    return lines;
  }

  function textPage(title, bullets, subtitle) {
    return copy(SF.makeSlide('content'), { title: title, bullets: bullets || [], subtitle: subtitle || '' });
  }
  function pagesFor(deck) {
    var pages = [];
    deck.slides.forEach(function (s) {
      /* A slide held back from the room is held back from the handout too.
         The alternative — printing what the class never saw — is the more
         surprising of the two, and it is the handout that gets marked
         against. */
      if (s.hidden === true) return;
      if (s.type === 'join' || s.type === 'results' || s.type === 'explain') return;
      if (s.type === 'image' && String(s.body || '').trim()) {
        pages.push(copy(s, { body: '' }));
        pages.push(textPage(s.title || 'Behind the image', String(s.body).split(/\n/).filter(function (line) { return line.trim(); })));
      } else if (s.type === 'game') {
        var game = SF.GameStore.get(s.gameId);
        if (!game) {
          pages.push(textPage(s.gameTitle || s.title || 'Activity', ['This activity is not available in this browser.']));
          return;
        }
        (game.questions || []).forEach(function (q, i) {
          var p = textPage(q.question || q.term || game.title, q.options || []);
          if (q.image) { p.type = 'split'; p.image = SF.safeMedia(q.image); p.imageFit = 'contain'; }
          p.subtitle = game.title + ' · Question ' + (i + 1);
          pages.push(p);
        });
      } else if (s.type === 'quiz') {
        var question = textPage(s.question || s.title || 'Question', s.options || [], s.subtitle);
        if (s.image) { question.type = 'split'; question.image = s.image; question.imageFit = 'contain'; }
        pages.push(question);
      } else if (s.type === 'gallery') {
        (s.layers || []).filter(function (l) { return l.image; }).forEach(function (l) {
          pages.push(copy(s, { type: 'image', image: l.image, imageFit: 'contain', title: l.caption || s.title, subtitle: l.source || '', layers: [] }));
        });
      } else if (s.type === 'cards' && s.design && s.design.cardsMode === 'stack') {
        (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b, i) {
          pages.push(copy(s, { type: 'content', title: s.title + ' · ' + (i + 1), bullets: [b] }));
        });
      } else if (s.type === 'beforeafter') {
        var e = s.exploration || {};
        ['before', 'after'].forEach(function (key) {
          if (e[key]) pages.push(copy(s, {type:'image', image:e[key], imageFit:'contain', title:s.title + ' · ' + (e[key + 'Label'] || key), subtitle:'', exploration:null}));
        });
      } else if (s.type === 'video') {
        /* The service's still counts as a poster here too: a handout of a
           lecture that watched a clip should show the clip, not only quote
           its address. */
        var poster = (SF.videoStill ? SF.videoStill(s) : '') || s.videoPoster || '';
        var video = copy(s, {type:poster?'split':'content', image:poster, imageFit:'contain', bullets:['Video: ' + (SF.safeMedia(s.video) || 'No video link provided')], video:''});
        pages.push(video);
      } else {
        pages.push(copy(s));
      }
      if (s.feedback && s.feedback.prompt) {
        /* The prompt is the heading, not the first bullet. Concatenated into
           the list it read as one of the answers: a four-option poll printed
           as five identical bullets with nothing to say which was the
           question being asked. */
        pages.push(textPage(s.feedback.prompt, answerLines(s.feedback)));
      }
    });
    return pages;
  }
  async function open(deck) {
    var preview = window.open('', '_blank');
    if (!preview) { SF.toast('Allow pop-ups to open the student PDF preview.'); return; }
    var doc = preview.document;
    doc.open(); doc.write('<!doctype html><html><head></head><body></body></html>'); doc.close();
    doc.title = deck.title + ' — student handout';
    var base = doc.createElement('base'); base.href = document.baseURI; doc.head.appendChild(base);
    var loads = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (source) {
      var link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = source.href;
      loads.push(new Promise(function (resolve) { link.onload = resolve; link.onerror = resolve; }));
      doc.head.appendChild(link);
    });
    var css = doc.createElement('style');
    css.textContent = '@page{size:338.6667mm 190.5mm;margin:0}' +
      'html,body{margin:0!important;padding:0!important;height:auto!important;overflow:visible!important;background:#ddd!important}' +
      '.pdf-toolbar{padding:18px;font:16px system-ui;background:white;position:sticky;top:0;z-index:100;display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px}' +
      /* App stylesheets are also linked into this window; pin the toolbar
         controls so a global button rule cannot hide or disable them. */
      '.pdf-toolbar button{display:inline-block!important;visibility:visible!important;pointer-events:auto!important;opacity:1!important;margin:0;padding:10px 18px;cursor:pointer;font:inherit}' +
      '.pdf-toolbar button:disabled{opacity:.55!important;cursor:wait}' +
      '.pdf-toolbar .pdf-hint{flex:1;min-width:16rem;color:#333}' +
      '.pdf-page{width:1280px;height:720px;overflow:hidden;margin:20px auto;position:relative;break-after:page;page-break-after:always}' +
      '.pdf-page:last-child{break-after:auto;page-break-after:auto}.pdf-page .slide{position:relative!important;transform:none!important;opacity:1!important;animation:none!important}' +
      '.pdf-page{overflow-wrap:anywhere}.pdf-page .step{opacity:1!important;visibility:visible!important;animation:none!important}' +
      '.pdf-page button,.pdf-page input,.pdf-page select,.pdf-page textarea{display:none!important}' +
      '@media print{.pdf-toolbar{display:none!important}.pdf-page{margin:0!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;animation:none!important;transition:none!important}}';
    doc.head.appendChild(css);
    var toolbar = doc.createElement('div'); toolbar.className = 'pdf-toolbar';
    var print = doc.createElement('button');
    print.type = 'button';
    print.textContent = 'Loading images…';
    print.disabled = true;
    print.onclick = function () {
      /* focus() then print() in the same tick is dropped in some Chromium
         builds for about:blank previews — defer so the click gesture sticks. */
      try { preview.focus(); } catch (e) {}
      setTimeout(function () {
        try {
          if (preview && typeof preview.print === 'function') preview.print();
          else throw new Error('no print');
        } catch (err) {
          hint.textContent = 'Print dialog did not open. Press ⌘P (Mac) or Ctrl+P (Windows) in this window, then choose Save as PDF.';
        }
      }, 50);
    };
    toolbar.appendChild(print);
    var hint = doc.createElement('span');
    hint.className = 'pdf-hint';
    hint.textContent = 'Choose Save as PDF. All reveals are visible; stacks are separate pages. Private notes, live results and the quiz answer key are excluded. If the button does nothing, press ⌘P / Ctrl+P.';
    toolbar.appendChild(hint); doc.body.appendChild(toolbar);
    try {
      var pages = pagesFor(deck);
      pages.forEach(function (s, i) {
        var page = doc.createElement('section'); page.className = 'pdf-page';
        page.appendChild(SF.renderSlide(deck, s, {index:i,total:pages.length,interactive:false}));
        doc.body.appendChild(page);
      });
      // Also preload background images used by the image and split layouts.
      var media = new Set();
      doc.querySelectorAll('img').forEach(function (img) { if (img.src) media.add(img.src); });
      pages.forEach(function (s) { if (s.image) media.add(SF.safeMedia(s.image)); });
      if (deck.logo) media.add(SF.safeMedia(deck.logo));
      var failed = false;
      media.forEach(function (url) {
        if (!url) return;
        loads.push(new Promise(function (resolve) {
          var img = new Image(); img.onload = resolve; img.onerror = function () { failed = true; resolve(); }; img.src = url;
        }));
      });
      var timedOut = false;
      await Promise.race([Promise.all(loads), new Promise(function (resolve) { setTimeout(function () { timedOut = true; resolve(); }, 12000); })]);
      await Promise.race([doc.fonts.ready, new Promise(function (resolve) { setTimeout(resolve, 3000); })]);
      print.textContent = 'Print / Save as PDF'; print.disabled = false;
      if (failed || timedOut) hint.textContent = 'Some resources did not load. Check the preview before saving. Choose Save as PDF in the print dialog.';
    } catch (err) {
      hint.textContent = 'Could not prepare the handout. Close this preview and try again.';
      console.error('PDF preview', err);
    }
  }
  SF.Print = { open: open, pagesFor: pagesFor };
})();
