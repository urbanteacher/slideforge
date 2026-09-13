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
  function textPage(title, bullets, subtitle) {
    return copy(SF.makeSlide('content'), { title: title, bullets: bullets || [], subtitle: subtitle || '' });
  }
  function pagesFor(deck) {
    var pages = [];
    deck.slides.forEach(function (s) {
      if (s.type === 'join' || s.type === 'results' || s.type === 'explain') return;
      if (s.type === 'game') {
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
        var video = copy(s, {type:s.videoPoster?'split':'content', image:s.videoPoster || '', imageFit:'contain', bullets:['Video: ' + (SF.safeMedia(s.video) || 'No video link provided')], video:''});
        pages.push(video);
      } else {
        pages.push(copy(s));
      }
      if (s.feedback && s.feedback.prompt) {
        /* The prompt is the heading, not the first bullet. Concatenated into
           the list it read as one of the answers: a four-option poll printed
           as five identical bullets with nothing to say which was the
           question being asked. */
        pages.push(textPage(s.feedback.prompt, s.feedback.options || []));
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
      '.pdf-toolbar{padding:18px;font:16px system-ui;background:white;position:sticky;top:0;z-index:10}.pdf-toolbar button{margin-right:16px;padding:10px 18px}' +
      '.pdf-page{width:1280px;height:720px;overflow:hidden;margin:20px auto;position:relative;break-after:page;page-break-after:always}' +
      '.pdf-page:last-child{break-after:auto;page-break-after:auto}.pdf-page .slide{position:relative!important;transform:none!important;opacity:1!important;animation:none!important}' +
      '.pdf-page{overflow-wrap:anywhere}.pdf-page .step{opacity:1!important;visibility:visible!important;animation:none!important}.pdf-page button,.pdf-page input,.pdf-page select,.pdf-page textarea{display:none!important}' +
      '@media print{.pdf-toolbar{display:none!important}.pdf-page{margin:0!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;animation:none!important;transition:none!important}}';
    doc.head.appendChild(css);
    var toolbar = doc.createElement('div'); toolbar.className = 'pdf-toolbar';
    var print = doc.createElement('button'); print.textContent = 'Loading images…'; print.disabled = true;
    print.onclick = function () { preview.focus(); preview.print(); };
    toolbar.appendChild(print);
    var hint = doc.createElement('span'); hint.textContent = 'Choose Save as PDF. All reveals are visible; stacks are separate pages. Private notes, live results and the quiz answer key are excluded.';
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
