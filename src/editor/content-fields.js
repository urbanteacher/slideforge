/* Every content field the inspector draws — the per-slide-type middle of the
 * pane, from a journey's milestones to a chart's data to an org chart's
 * people.
 *
 * Moved out of js/editor.js. It is one function of 493 lines, which made it
 * the largest single function in the app and the second cluster out of the
 * inspector band. Its contract is the narrowest in that band: one name leaves,
 * and of the seventeen it needs, fifteen are ordinary function declarations
 * that never change.
 *
 * Seven of those are sibling draw* functions that stay in js/editor.js. That
 * is not a leak to fix by dragging them across — they are shared with the rest
 * of the inspector, and this file is a caller of them, not their owner.
 *
 * Two names are not stable and are handled separately:
 *
 *   `deck` is reassigned whenever a deck loads. It is read exactly once here,
 *   synchronously, at the top of the function — so it is read through the
 *   accessor at that one site rather than snapshotted.
 *
 *   `UI` is read sixty-six times but written once, during editor init and
 *   before any inspector is drawn. It is read once per call into a local, so
 *   the sixty-six uses are untouched and still see the same object they did.
 *
 * Getting that distinction wrong is how the desk's wall overlay broke during
 * the presenter move — see the method notes in docs/render-split.md.
 */
export function createContentFields(SF, helpers) {
  const {CHART_LABELS, chartTypeOptions, draw, drawCallouts, drawImageFields, drawInfoPits, drawLayers, drawPairPits, drawPits, drawVideoFields, el, repaint, richField, touched} = helpers;


  function drawContentFields(insp, s) {
    var UI = helpers.UI();
    /* Which specimen this is, beside the words it uses — the same place a chart
       slide picks its chart type. It decides what the slide is and what it
       needs, so it is a content decision, not a Look one. */
    if (SF.MotionLab && SF.MotionLab.active(s)) {
      var sceneOpts = Object.entries(SF.MotionLab.MOTION_SCENES)
        .map(function (e) { return { value: e[0], label: e[1] }; });
      insp.appendChild(UI.field('Motion experiment', UI.select(sceneOpts,
        s.motionScene, function (v) {
          s.motionScene = v;
          touched(); repaint();
        }),
        'Each specimen asks for the slide\u2019s title, points and image in its own way.'));
    }
    // Additional authored fields exposed by shared structured compositions.
    var composition = SF.slideComposition(helpers.deck(), s);
    if (composition === 'poster-art' || composition === 'ballot') {
      insp.appendChild(UI.field(composition === 'poster-art' ? 'Supporting line' : 'Voting instruction',
        richField(s, 'body', 'area', function(v){s.body=v;touched();repaint();}, 2)));
    }
    if (composition === 'ballot') {
      insp.appendChild(UI.field('Context',
        richField(s, 'subtitle', 'text', function(v){s.subtitle=v;touched();repaint();})));
    }
    /* Slide date moved to the Header & footer pane on 2026-09-18, next to the
       date slot that can now display it. It is the same slide.date either way;
       a title slide still prints it under the subtitle. */
    if (s.type === 'journey') {
      insp.appendChild(UI.field('Journey title',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Context',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Show as', UI.select(
        [{ value: 'path', label: 'Route with milestones' },
         { value: 'handover', label: 'Connected stages' },
         { value: 'stepper', label: 'Stepper — numbered discs on one rail' }],
        s.journeyMode || 'path', function (v) { s.journeyMode = v; touched(); repaint(); })));
      var stops = el('div');
      drawPairPits(stops, s, 'journey');
      insp.appendChild(UI.field('Milestones · heading and detail', stops,
        'Use up to six short stops for a route, or two to three connected stages. Next reveals each one.'));
      insp.appendChild(UI.field('Takeaway / reading',
        richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 2)));
      return;
    }
    if (s.type === 'mindmap') {
      insp.appendChild(UI.field('Central idea', richField(s, 'title', 'area', function (v) { s.title = v; touched(); repaint(); }, 2)));
      var branches = el('div');
      drawPairPits(branches, s, 'mindmap');
      insp.appendChild(UI.field('Branches · heading and explanation', branches,
        'Keep to six short branches for a readable map. Build on Next reveals one branch at a time.'));
      return;
    }
    if (s.type === 'orgchart') {
      insp.appendChild(UI.field('Title',
        richField(s, 'title', 'area', function (v) { s.title = v; touched(); repaint(); }, 2)));
      insp.appendChild(UI.field('Subtitle',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      var people = el('div');
      drawPits(people, s);
      insp.appendChild(UI.field('People · one per line', people,
        'Name | Role | Reports to | photo. Reports-to is a name on this slide, not a row number — reorder freely. Leave Reports to blank for a flat team (no connectors).'));
      var tree = SF.orgTree(s.bullets || []);
      insp.appendChild(el('p', 'hint',
        tree.people.length
          ? tree.people.length + (tree.people.length === 1 ? ' person' : ' people') +
            (tree.levels > 1 ? ' · ' + tree.levels + ' levels' : ' · flat team')
          : 'No people yet.'));
      (tree.warnings || []).forEach(function (w) {
        insp.appendChild(el('p', 'hint field-warn', w));
      });
      if (tree.levels > 4) {
        insp.appendChild(el('p', 'hint field-warn',
          'This tree is ' + tree.levels + ' levels deep — it still draws, but cards shrink. Prefer fewer layers on a lecture slide.'));
      }
      return;
    }
    if (s.type === 'keyfact') {
      insp.appendChild(UI.field('Heading',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('What the fact is',
        richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); }),
        'The small line above the fact — "Canvas deadline", "Pass mark", "Word limit". A number on its own does not mean anything.'));
      insp.appendChild(UI.field('The fact',
        richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 2),
        'Keep it to a few words. This is set large, and long sentences stop being one thing the room can hold.'));
      var notes = el('div');
      drawPits(notes, s);
      insp.appendChild(UI.field('Supporting points', notes,
        'Everything that matters less than the fact above. Three or four at most.'));
      return;
    }
    if (SF.INFO_LAYOUTS && SF.INFO_LAYOUTS.indexOf(s.type) >= 0) {
      var INFO_HINTS = {
        stats:    ['Stats · label, value, note', 'Three to six. The value is set large — "92%", "£1.2m", "3 of 5". Ring and bar styles read the leading number.'],
        compare:  ['Rows · left, right, optional label', 'Each row is one point of comparison. Add a row label when the rows need naming ("Cost", "Speed").'],
        funnel:   ['Stages · name, value, note', 'Top to bottom. Numeric values set the band widths; without numbers the bands narrow evenly.'],
        timeline: ['Events · date, event, detail', 'Up to eight. Dates can be years, terms or "Week 3" — they are labels, not parsed.'],
        iceberg:  ['Layers · label, value, note', 'Top to bottom: what the room already sees first, then what sits underneath it.'],
        spectrum: ['Positions · label, value, note', 'Left to right along the spectrum. Name both ends before the points between them.'],
        sourcecheck: ['Checks · label, value, note', 'One row per thing worth verifying about the claim above.'],
        shift:    ['Stages · label, value, note', 'Then, now and next — the same story at three points, in that order.']
      };
      /* Every INFO_LAYOUTS type reaches here, and four of the eight had no
         entry: opening an iceberg, spectrum, sourcecheck or shift slide threw
         on hint[0] and took the whole inspector with it. */
      var hint = INFO_HINTS[s.type] || ['Rows · label, value, note', 'One row per point.'];
      insp.appendChild(UI.field('Heading',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      if (s.type === 'compare') {
        insp.appendChild(UI.field('Column headings',
          richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); }),
          'Left | Right — "Before | After", "Myth | Fact", "Option A | Option B".'));
      } else {
        insp.appendChild(UI.field('Context line',
          richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); }),
          'Optional. Where the numbers come from, or the period they cover.'));
      }
      var pits = el('div');
      drawInfoPits(pits, s);
      insp.appendChild(UI.field(hint[0], pits, hint[1]));
      insp.appendChild(UI.field('Takeaway',
        richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 2),
        'Optional line under the graphic — the one sentence the numbers add up to.'));
      return;
    }
    if (s.type === 'introduction') {
      insp.appendChild(UI.field('Lecturer name', richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Job title', richField(s, 'subtitle', 'text', function (v) { s.subtitle = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Introduction', richField(s, 'body', 'area', function (v) { s.body = v; touched(); repaint(); }, 4)));
      drawImageFields(insp, s, { caption: false, credit: false });
      return;
    }

    if (SF.Explore && SF.Explore.inspector(insp, s, UI, function () { touched(); repaint(); }, function () { touched(); draw(); })) return;
    if (s.type === 'video') {
      drawVideoFields(insp, s);
      return;
    }

    if (s.type === 'chart') {
      insp.appendChild(UI.field('Chart title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      /* Grouped by the Financial Times' Visual Vocabulary, whose argument is
         the order of the questions: decide which relationship in the data
         matters, then pick a chart inside that family. Seventeen types in a
         flat list invites choosing by appearance, which on this module is
         the wrong lesson to teach by accident.

         The labels stay — a heading says what question the family answers,
         and the option says what that particular chart is for. */
      /* Once each. A <select> cannot hold the poster's cross-listings: two
         options sharing a value are not two choices, and picking the second
         makes the control jump to the first — so "Bar" chosen under Ranking
         would silently relocate to Magnitude. The chooser below keeps the
         cross-listing, where it can be shown without that failure. */
      var chartOpts = chartTypeOptions();
      insp.appendChild(UI.field('Chart type', UI.select(chartOpts,
        s.chartKind, function (v) { s.chartKind = v; touched(); repaint(); }),
        'Grouped by what the chart is for, after the FT\u2019s Visual Vocabulary.'));

      /* The poster's own route in: the question first, the shape second. */
      var chooser = UI.button('Not sure which? Start from the question \u2192', 'ghost', function () {
        SF.Shell.picker({
          title: 'What matters most in this data?',
          wide: true,
          items: function () {
            return (SF.CHART_TAXONOMY || []).map(function (cat) {
              var can = cat.kinds.length;
              var lacks = (cat.missing || []).length
                ? '  Not drawn here: ' + cat.missing.join(', ') + '.'
                : '';
              return {
                id: cat.key,
                title: cat.label + ' \u00b7 ' + cat.question,
                blurb: cat.note + (can
                  ? '  \u2014 ' + can + (can === 1 ? ' chart here.' : ' charts here.')
                  : '  \u2014 SlideForge draws no maps, so nothing here yet.') + lacks
              };
            });
          },
          describe: function (it) { return it.blurb; },
          onPick: function (it) {
            var cat = (SF.CHART_TAXONOMY || []).filter(function (c) { return c.key === it.id; })[0];
            if (!cat) return;
            if (!cat.kinds.length) {
              SF.toast(cat.label + ': ' + cat.missing.slice(0, 3).join(', ') +
                ' and others are the usual answers, and none of them is drawn here. Use an image for now.');
              return;
            }
            SF.Shell.picker({
              title: cat.label + ' \u00b7 ' + cat.question,
              wide: true,
              items: function () {
                /* Only pickable things. A row that does nothing when
                   clicked reads as a control that is broken, so what is
                   missing was said on the category instead. */
                return cat.kinds.map(function (k) {
                  var also = SF.chartCategories(k)
                    .filter(function (c) { return c.key !== cat.key; })
                    .map(function (c) { return c.label.toLowerCase(); });
                  return { id: k, title: CHART_LABELS[k] || k,
                    blurb: (k === s.chartKind ? 'What this slide uses now.' : 'Switch this slide to it.') +
                      (also.length ? '  Also answers ' + also.join(' and ') + '.' : '') };
                });
              },
              describe: function (it) { return it.blurb; },
              onPick: function (it) {
                if (!it.id) return;
                s.chartKind = it.id; touched(); repaint();
                SF.toast('Now a ' + (CHART_LABELS[it.id] || it.id).split(' \u2014 ')[0].toLowerCase() + '.');
              }
            });
          }
        });
      });
      /* Quiet, and under the menu it supplements rather than competing with
         it. The grouped menu is the everyday route; this is for the question
         "which of these should it even be", which is asked once a slide. */
      chooser.style.cssText = 'font-size:11.5px;margin:-4px 0 10px;padding:2px 0;border:0;background:none;' +
        'text-decoration:underline;text-underline-offset:3px;opacity:.72;width:auto';
      insp.appendChild(chooser);

    /* Each idiom reads the same pasted table differently, and an author who
       is not told will paste the shape the last one wanted. */
    var SHAPES = {
      scatter: 'Two numeric columns: the first is x, the second y. One row per point.',
      histogram: 'One column of numbers. SlideForge counts them into bins.',
      box: 'One row per group: its name, then every value measured in it.',
      pictogram: 'One row per category, with the count beside it.',
      treemap: 'One series of parts that make a whole — same paste as a pie. Largest block draws the eye first.',
      waffle: 'One series of parts that make a whole. A single percentage (≤100) fills that many of 100 squares; several categories share the grid.',
      bullet: 'First series is Actual, second is Target. One row per category.',
      combo: 'First series draws as columns; every series after that draws as markers on the same axis.',
      radar: 'At least three categories (the spokes). Each series is one polygon.',
      sankey: 'Three columns: from, to, amount. One row per flow.',
      dumbbell: 'One row per category, then exactly two numbers — the two states being compared.',
      matrix: 'First row names the conditions. Then one row per item, with a rating in each cell.',
      multiples: 'One row per panel; the columns become the axis inside every panel. Read transposed.'
    };
    if (SHAPES[s.chartKind]) insp.appendChild(el('p', 'hint', SHAPES[s.chartKind]));

    if (s.chartKind === 'pictogram') {
      insp.appendChild(UI.field('Icon', UI.text(s.chartIcon || '', function (v) {
        s.chartIcon = String(v).trim().slice(0, 4); touched(); repaint();
      }), 'One emoji or character, repeated once per unit. A person, a book, a bus — something the room can count at a glance.'));
      insp.appendChild(UI.field('One icon is worth',
        UI.num(s.chartUnit > 1 ? s.chartUnit : null, function (v) {
          s.chartUnit = Math.max(1, Number(v) || 1); touched(); repaint();
        }, 1, null, 'chosen for you'),
        'Left empty, a unit is picked that keeps the longest row under twenty icons — past that nobody counts, they estimate.'));
    }
      insp.appendChild(UI.field('Data \u2014 one row per line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 9),
        'First row names the series, first column the categories. Separate ' +
        'cells with | \u2014 or paste a range straight from a spreadsheet, ' +
        'which arrives tab-separated and needs no editing.'));
      insp.appendChild(UI.field('Source & caveat',
        UI.text(s.chartSource || '', function (v) {
          s.chartSource = String(v).slice(0, 200); touched(); repaint();
        }),
        'Printed under the chart and carried into the handout. Where the numbers came from, ' +
        'and what they are not \u2014 "Selected platform peaks, not annual means" does more ' +
        'for a room than a citation.'));

      var cd = SF.chartData(s);
      var note = cd.series.length
        ? cd.series.length + (cd.series.length === 1 ? ' series' : ' series') + ' \u00d7 ' +
          cd.categories.length + (cd.categories.length === 1 ? ' category' : ' categories')
        : 'No data yet \u2014 needs a header row and at least one row of values.';
      insp.appendChild(el('p', 'hint', note));
      /* Said plainly rather than enforced: the author may have a reason, and
         a slide that silently drops a column is worse than a warning. */
      if (['pie', 'donut', 'pictogram', 'treemap', 'waffle'].indexOf(s.chartKind) >= 0 && cd.series.length > 1) {
        var oneName = s.chartKind === 'donut' ? 'donut'
          : s.chartKind === 'treemap' ? 'treemap'
          : s.chartKind === 'waffle' ? 'waffle'
          : s.chartKind === 'pictogram' ? 'pictogram' : 'pie';
        insp.appendChild(el('p', 'hint field-warn',
          'A ' + oneName + ' shows one series. Only \u201c' +
          cd.series[0].name + '\u201d is drawn; the rest are ignored. Bar compares them all.'));
      }
      if (s.chartKind === 'combo' && cd.series.length < 2) {
        insp.appendChild(el('p', 'hint field-warn',
          'Columns + markers needs at least two series — the first for the columns, another for the markers.'));
      }
      if (s.chartKind === 'bullet' && cd.series.length < 1) {
        insp.appendChild(el('p', 'hint field-warn',
          'A bullet needs an Actual series; add a Target series as the second column to mark the goal.'));
      }
      /* Stacking negatives is not a thing this renderer does, and silently
         dropping them would make a total that does not match the data. */
      if (s.chartKind === 'stack' && cd.series.some(function (sr) {
        return sr.values.some(function (v) { return v != null && v < 0; });
      })) {
        insp.appendChild(el('p', 'hint field-warn',
          'Stacked bars add values up, so negatives are left out of the stack. Use grouped bars to show them.'));
      }
      /* The two ends are the whole idiom, so a third series is not a
         variation on it — the bar would join a pair it does not describe. */
      if (s.chartKind === 'dumbbell' && cd.series.length !== 2) {
        insp.appendChild(el('p', 'hint field-warn', cd.series.length < 2
          ? 'A dumbbell needs two numbers per row \u2014 the two states you are comparing.'
          : 'A dumbbell draws the first two series. The bar joins a pair, so the rest are left out; ' +
            'use grouped bars to show them all.'));
      }
      /* Ordinal, not interval: the point the source chart makes, and the one
         a data-visualisation course should not let slide. */
      if (s.chartKind === 'matrix') {
        insp.appendChild(el('p', 'hint',
          'Shade carries an order, not a distance. Low / Medium / High are ordinal \u2014 ' +
          'the gap between them is not a number, so say so in the source line.'));
      }
      /* The shared scale is what makes the layout a comparison rather than
         a wall of little charts, so an outlier is worth warning about. */
      if (s.chartKind === 'multiples' && cd.categories.length > 12) {
        insp.appendChild(el('p', 'hint field-warn',
          cd.categories.length + ' panels is past the point where each one is readable on a wall. ' +
          'Around eight is the most a room can compare at once.'));
      }
      if (cd.series.length > 6) {
        insp.appendChild(el('p', 'hint field-warn',
          'Six series is the ceiling \u2014 past that the colours stop being tellable apart. Group the tail into \u201cOther\u201d, or split the chart.'));
      }
      drawCallouts(insp, s, cd);
      return;
    }

    if (s.type === 'table') {
      insp.appendChild(UI.field('Table title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      insp.appendChild(UI.field('Rows \u2014 one per line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 9),
        'Separate cells with | \u2014 or paste a range straight from a ' +
        'spreadsheet, which arrives tab-separated and needs no editing. ' +
        'Up to 12 rows and 6 columns.'));
      insp.appendChild(UI.check('First row is a header', s.tableHeader,
        function (v) { s.tableHeader = v; touched(); repaint(); }));
      var rows = SF.parseTable(s.body);
      insp.appendChild(el('p', 'hint', rows.length
        ? rows.length + (rows.length === 1 ? ' row' : ' rows') + ' \u00d7 ' +
          rows[0].length + (rows[0].length === 1 ? ' column' : ' columns') +
          (s.tableHeader && rows.length > 1 ? ', the first a header' : '')
        : 'Nothing parsed yet.'));
      return;
    }

    if (s.type === 'code') {
      insp.appendChild(UI.field('Slide title',
        richField(s, 'title', 'text', function (v) { s.title = v; touched(); repaint(); })));
      insp.appendChild(UI.field('Language', UI.select([
        { value: 'python', label: 'Python' },
        { value: 'javascript', label: 'JavaScript' },
        { value: 'text', label: 'Plain text' }
      ], s.language === 'javascript' ? 'javascript' : (s.language === 'text' ? 'text' : 'python'),
        function (v) { s.language = v; touched(); repaint(); }),
        'Label only — nothing runs on the wall. This is a viewer, not an editor.'));
      if (s.code == null) s.code = String(s.body || '');
      insp.appendChild(UI.field('Source',
        UI.area(s.code || '', function (v) {
          s.code = v;
          touched();
          repaint();
        }, 12),
        'What the projector types. Keep it short enough to read from the back of the room.'));
      var box = el('div');
      box.appendChild(UI.check('Type on enter', s.typewrite !== false, function (v) {
        s.typewrite = v;
        touched();
        repaint();
      }));
      box.appendChild(el('div', 'hint',
        'In Present, the code drips in character by character. Next skips to the finished source. The Lesson studio preview always shows the full text.'));
      insp.appendChild(UI.field('Playback', box));
      insp.appendChild(UI.field('Speed (ms per character)',
        UI.num(s.typeSpeed || 28, function (v) {
          s.typeSpeed = Math.max(8, Math.min(120, Number(v) || 28));
          touched();
        }, 8, 120),
        'Lower is faster. Around 24–36 feels like someone typing.'));
      return;
    }

    if (s.type === 'quote') {
      insp.appendChild(UI.field('Quotation',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 4)));
      insp.appendChild(UI.field('Attribution',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); })));
      return;
    }

    if (s.type === 'statement') {
      insp.appendChild(UI.field('The line',
        richField(s, "body", "area", function (v) { s.body = v; touched(); repaint(); }, 3),
        'Six words reads best — it is set as large as it fits, so a sentence steps down.'));
      insp.appendChild(UI.field('Underneath (optional)',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); }),
        'Who said it, or what it is from. Left empty, nothing is drawn.'));
      return;
    }

    if (s.type === 'image') {
      drawImageFields(insp, s);
      insp.appendChild(UI.field('Flip to facts', UI.area(s.body || '', function (v) {
        s.body = v; touched(); repaint();
      }, 4), 'Optional: one short fact per line. Adds a button to reveal a clean facts panel.'));
      return;
    }

    if (s.type === 'gallery') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var stackBox = el('div');
      drawLayers(stackBox, s);
      insp.appendChild(UI.field('Pictures · one moment each', stackBox,
        'Shown one in front of the last. Turn on Build on Next to step through them.'));
      insp.appendChild(UI.field('Fit', UI.select(
        [{ value: 'cover', label: 'Fill the frame (crop)' },
         { value: 'contain', label: 'Fit inside (letterbox)' }],
        s.imageFit, function (v) { s.imageFit = v; touched(); repaint(); })));
      return;
    }

    if (s.type === 'split') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var pits = el('div');
      drawPits(pits, s);
      insp.appendChild(UI.field('Points · drag to reorder', pits,
        'Keep it short — the image carries half the meaning.'));
      drawImageFields(insp, s, { caption: false, side: true });
      return;
    }

    if (s.type === 'keywords') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var kw = el('div');
      drawPairPits(kw, s, 'keywords');
      insp.appendChild(UI.field('Keywords — bold term, lowercase definition', kw,
        'The slide shows the term in bold and the definition in lowercase.'));
      return;
    }

    if (s.type === 'italics') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var it = el('div');
      drawPairPits(it, s, 'italics');
      insp.appendChild(UI.field('Italics — emphasised phrase, plain note', it,
        'The slide shows the phrase in italics and the explanation in regular type.'));
      return;
    }

    if (s.type === 'links') {
      insp.appendChild(UI.field('Title',
        richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));
      var ln = el('div');
      drawPairPits(ln, s, 'links');
      insp.appendChild(UI.field('Links — label + http(s) URL', ln,
        'Only http and https links become clickable. Opens in a new tab.'));
      return;
    }

    insp.appendChild(UI.field(s.type === 'content' ? 'Title' : 'Heading',
      richField(s, "title", "area", function (v) { s.title = v; touched(); repaint(); }, 2)));

    if (s.type === 'title' || s.type === 'section' || s.type === 'join') {
      insp.appendChild(UI.field('Subtitle',
        richField(s, "subtitle", "text", function (v) { s.subtitle = v; touched(); repaint(); })));
    }

    if (s.type === 'join') {
      var joinPits = el('div');
      drawPits(joinPits, s);
      insp.appendChild(UI.field('Lines under the heading (optional)', joinPits,
        'Keep short — the QR and PIN own the slide. Host live replaces the sample code.'));
      return;
    }

    if (s.type === 'content' || s.type === 'cards') {
      var bulletPits = el('div');
      drawPits(bulletPits, s);
      insp.appendChild(UI.field(
        s.type === 'cards' ? 'Cards · drag to reorder' : 'Bullets — click a pit to fill',
        bulletPits,
        'Empty pits stay off the slide until you type. Prefix with "- " for a sub-bullet.'
      ));
    }
  }

  return {drawContentFields: drawContentFields};
}
