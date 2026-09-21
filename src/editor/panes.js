/* The four tabs of the slide inspector — Edit, Look, Layout, Motion — plus the
 * Header & footer panel, which is the same kind of thing but is opened from the
 * face row above rather than from the tab strip.
 *
 * Moved out of js/editor.js because the pane set was declared twice and drawn
 * from three places. The tab strip listed four panes in one array; the dispatch
 * was a separate if/else chain further up the file; and of the four bodies, one
 * called into src/editor/content-fields.js, one into js/customize.js, one into a
 * function two hundred lines down, and one — Motion, 138 lines — sat inline in
 * the middle of drawInspector. Two lists that had to agree and no single place
 * that said what a pane is.
 *
 * Now there is one table. `PANES` drives both the tab strip and the dispatch,
 * so a pane cannot be drawn without a tab or listed without a body. `tab: false`
 * is how Header & footer takes part without appearing in the strip.
 *
 * A pane is: {key, icon, label, title, tab, draw(insp, slide), after?}.
 *
 * `UI` and `drawContentFields` come in as accessors — the first is reassigned
 * when the shell starts, the second is a var js/editor.js assigns a thousand
 * lines below this. Everything else is a function declaration that never moves.
 */
export function createPanes(SF, helpers) {
  const {el, touched, draw, drawInspector, drawRail, repaint,
         drawLayoutPicker, drawUnusedOnLayout} = helpers;

  /* Was the `else if (designPane === 'transition')` arm of drawInspector. */
  function drawMotion(insp, s) {
    var UI = helpers.UI();
        insp.appendChild(el('p', 'hint',
          'How this slide arrives on the screen. The words stay as they are.'));
        insp.appendChild(UI.field('Transition in', UI.select(
          SF.TRANSITIONS.map(function (t) {
            return { value: t, label: t[0].toUpperCase() + t.slice(1) };
          }),
          s.transition, function (v) { s.transition = v; touched(); drawRail(); drawInspector(); })));
        if (s.transition === 'morph') {
          insp.appendChild(el('p', 'hint',
            'Morph carries one thing across the cut instead of dissolving the slide: the same picture, ' +
            'the same chart table, or the same heading text as the slide before this one. With nothing ' +
            'shared \u2014 or in a browser without view transitions, or when less motion has been asked ' +
            'for \u2014 it is a fade.'));
        }
        /* A statement is one line with nothing else on the slide, which is the
           only place per-word motion reads as deliberate rather than restless. */
        if (s.type === 'statement') {
          var d = s.design || (s.design = {});
          insp.appendChild(UI.field('Words arrive', UI.select([
            { value: '', label: 'All at once' },
            { value: 'rise', label: 'Rise — up from below, one at a time' },
            { value: 'fade', label: 'Fade — in place, one at a time' },
            { value: 'reveal', label: 'Reveal — wiped up, one at a time' }
          ], String(d.words || ''), function (v) {
            if (v) d.words = v; else delete d.words;
            touched(); repaint(); drawRail(); drawInspector();
          }), 'Plays when the slide arrives in the show — eased, with a little motion blur. Held still for anyone who asked for less motion.'));
          if (d.words) {
            insp.appendChild(UI.field('Speed', UI.select([
              { value: 'gentle', label: 'Gentle — slower, and holds longer' },
              { value: 'medium', label: 'Medium' },
              { value: 'quick', label: 'Quick' }
            ], String(d.wordSpeed || 'medium'), function (v) {
              if (v && v !== 'medium') d.wordSpeed = v; else delete d.wordSpeed;
              touched(); repaint();
            }), 'Moves the whole thing together — each word, the wave between them, and the hold if they leave again.'));
            insp.appendChild(UI.field('Spacing', UI.select([
              { value: 'together', label: 'Together — the line arrives as one' },
              { value: 'wave', label: 'Wave — eased, a little apart' },
              { value: 'one', label: 'One at a time — the widest spread' }
            ], String(d.wordStagger || 'wave'), function (v) {
              if (v && v !== 'wave') d.wordStagger = v; else delete d.wordStagger;
              /* Redrawn, not just repainted: choosing Together takes the
                 direction control away, and choosing a wave brings it back. */
              touched(); repaint(); drawInspector();
            }), 'How far apart the words are. The wave is always eased — it starts quickly and slows as it finishes.'));
            /* Which end the wave starts from. The renderer has read this since
               the word animation landed — wordFrom() in js/render.js, with
               three orders in WORD_FROMS — and the motion-lab specimen deck
               demonstrates all three. There was simply never a control, so the
               only way to ask for anything but 'first' was to hand-edit the
               deck JSON. The line above already redraws the pane for it.

               Hidden for Together, where every word shares one beat and a
               direction would be a setting with nothing to order. */
            if ((d.wordStagger || 'wave') !== 'together') {
              insp.appendChild(UI.field('Direction', UI.select([
                { value: 'first', label: 'From the first word' },
                { value: 'last', label: 'From the last word' },
                { value: 'center', label: 'From the centre — outwards to both ends' }
              ], String(d.wordFrom || 'first'), function (v) {
                if (v && v !== 'first') d.wordFrom = v; else delete d.wordFrom;
                touched(); repaint();
              }), 'Which end the wave starts from. From the centre sends it outwards both ways at once; with an even number of words the middle two share the first beat.'));
            }
            /* The AI button. Everything above is a choice from a list; this is
               the one control that can produce something not on any list —
               per-word coordinates, which is what a motion designer would
               keyframe by hand. */
            var planBox = el('div', 'word-plan');
            var plan = d.wordPlan;
            var planFresh = plan && String(plan.text || '').trim() === String(s.body || '').trim();
            /* Said back in the author's terms, because the plan is the one
               thing in this pane with no visible control to read it off: how
               many pieces, of what kind, and which landings were used. */
            var planSummary = function () {
              var n = (plan.words || []).length;
              var arcs = [];
              (plan.words || []).forEach(function (w) {
                var a = (w && w.arc) || 'settle';
                if (arcs.indexOf(a) < 0) arcs.push(a);
              });
              return n + ' ' + (plan.unit === 'letter' ? 'letter' : 'word') + (n === 1 ? '' : 's') +
                ' placed, landing ' + arcs.join(' and ') + '.';
            };
            var planStatus = el('p', 'hint',
              planFresh
                ? ('\u2728 Choreographed' + (plan.note ? ': ' + plan.note : '') +
                   ' \u2014 ' + planSummary())
                : plan
                  ? 'The choreography was written for different words. Ask again, or clear it.'
                  : 'Per-word coordinates: where each word comes from, how it turns, when, ' +
                    'and how it lands \u2014 settling, bouncing, or condensing out of mist. ' +
                    'Ask for letter by letter and it works in letters.');
            var brief = UI.text('', function () {});
            brief.placeholder = 'Optional: bounce in, out of smoke, one letter at a time…';
            var ask = UI.button('\u2728 Choreograph these words', 'primary', function () {
              if (!SF.AI || !SF.AI.generateWordMotion) {
                planStatus.textContent = 'The AI engine is not loaded in this build.';
                return;
              }
              ask.disabled = true;
              planStatus.textContent = '\u2728 Placing the words\u2026';
              Promise.resolve(SF.AI.generateWordMotion(s.body, { mood: brief.value }))
                .then(function (res) {
                  if (!res || res.error) {
                    planStatus.textContent = (res && res.error) || 'Nothing came back.';
                    return;
                  }
                  /* Stored with the line it was written for, so editing the
                     words retires it rather than misapplying it. */
                  d.wordPlan = { text: String(s.body || '').trim(), note: res.note,
                    unit: res.unit === 'letter' ? 'letter' : 'word', words: res.words };
                  if (!d.words) d.words = 'rise';
                  touched(); repaint(); drawInspector();
                })
                .catch(function () { planStatus.textContent = 'Could not write a choreography just now.'; })
                .finally(function () { ask.disabled = false; });
            });
            planBox.appendChild(brief);
            planBox.appendChild(ask);
            if (plan) {
              planBox.appendChild(UI.button('Clear choreography', 'ghost', function () {
                delete d.wordPlan; touched(); repaint(); drawInspector();
              }));
            }
            planBox.appendChild(planStatus);
            insp.appendChild(UI.field('AI choreography', planBox));
            insp.appendChild(UI.field('And leave again', UI.select([
              { value: '', label: 'No — they arrive and stay' },
              { value: 'loop', label: 'Yes — in, hold, out, round again' }
            ], d.wordsLoop ? 'loop' : '', function (v) {
              if (v) d.wordsLoop = true; else delete d.wordsLoop;
              touched(); repaint(); drawRail();
            }), 'For a cover on screen while the room fills. Four seconds of the six are the hold, so the line is readable every time round.'));
          }
        }
  }

  var PANES = [
    { key: 'edit', icon: '\u270E', label: 'Edit', tab: true,
      title: 'Edit the words on this slide',
      draw: function (insp, s) {
        helpers.drawContentFields()(insp, s);
        drawUnusedOnLayout(insp, s);
      } },
    { key: 'customise', icon: '\u2726', label: 'Look', tab: true,
      title: 'Customise this slide',
      draw: function (insp, s) {
        SF.Custom.inspector(insp, s, function () { touched(); draw(); }, { bare: true });
      } },
    { key: 'layout', icon: '\u25A6', label: 'Layout', tab: true,
      title: 'Choose a different layout',
      draw: function (insp, s) { drawLayoutPicker(insp, s); } },
    { key: 'transition', icon: '\u219D', label: 'Motion', tab: true,
      title: 'How this slide arrives',
      draw: drawMotion,
      /* Ran after the chain in js/editor.js, guarded on the same key. */
      after: function (insp, s) { SF.Custom.tagControls(insp, s, 'Motion'); } },
    /* Opened by the face row, not the tab strip. The panel is built once by
       js/header-footer.js and re-parented on every draw, so it keeps focus. */
    { key: 'chrome', tab: false,
      draw: function (insp) { if (SF.HeaderFooterUI) SF.HeaderFooterUI.mount(insp); } }
  ];

  /* An unknown key draws Edit, which is what the old `else` arm did. */
  function paneFor(key) {
    for (var i = 0; i < PANES.length; i++) if (PANES[i].key === key) return PANES[i];
    return PANES[0];
  }
  function drawPane(insp, s, key) {
    var pane = paneFor(key);
    pane.draw(insp, s);
    if (pane.after) pane.after(insp, s);
  }
  function tabs() { return PANES.filter(function (p) { return p.tab; }); }

  return { PANES: PANES, paneFor: paneFor, drawPane: drawPane, tabs: tabs };
}
