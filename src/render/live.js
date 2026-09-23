/* The furniture a live session draws around a slide, bundled through the
 * existing model entry point. Moved out of js/render.js — see
 * docs/render-split.md, step 3 of six.
 *
 * Score rails, the race track, the boss bar, the word-reveal wall, study cards,
 * the feedback rails and their focus views, and the join line. None of it lays
 * out a slide; it is what the room sees around one while a session is running,
 * which is why it was the largest band in that file with no business being
 * there.
 *
 * Thirty-four names live here and sixteen leave, so eighteen stop being
 * reachable from the renderer at all — the biggest reduction in the split so
 * far. Fifteen of the sixteen are public SF names the player and the live
 * relay call; `tint` is the exception, used only by layouts still in
 * js/render.js.
 *
 * `el` and `themedRoot` are injected because they are the browser renderer's
 * own helpers. Everything else is reached through SF at call time, including
 * SF.Player, which is defined by a script that loads after js/render.js —
 * reading it through the live SF rather than capturing it is what keeps that
 * ordering from mattering.
 */
export function createLiveRenderer(SF, helpers) {
  const {el, themedRoot} = helpers;

  /* One approved question, on the wall. Deliberately plain: it is somebody's
     question being taken seriously, not a data visualisation. */
  function questionCard(deck, item) {
    var node = themedRoot('slide', deck, 'layout-question', 'question');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'qc-label', 'From the room'));
    pad.appendChild(el('div', 'qc-text', item.text || ''));
    var foot = el('div', 'qc-foot');
    if (item.name) foot.appendChild(el('span', 'qc-who', item.name));
    if (item.votes > 1) {
      foot.appendChild(el('span', 'qc-votes', '▲ ' + item.votes + ' also asked this'));
    }
    pad.appendChild(foot);
    node.appendChild(pad);
    return node;
  }

  /* ------------------------------------------------- feedback, full screen */

  /**
   * The whole-screen version, for when the room's answers are the thing being
   * discussed rather than a sidebar to a slide. Same digest as the rail — only
   * the room it has to breathe in differs.
   */
  function feedbackFocus(deck, digest, opts) {
    opts = opts || {};
    var node = themedRoot('slide', deck, 'layout-feedback', 'feedback');
    var pad = el('div', 'pad');

    /* The room the poll is for is the room still arriving. The rail has said
       how to join for a while; full screen swallowed the whole wall and said
       nothing, so a phone that was not already in had no way back in without
       the teacher narrating the PIN. feedbackOpts already passes join — this
       only stopped throwing it away. */
    if (opts.join && opts.join.pin) {
      var jl = el('div', 'joinline fk-join');
      pad.appendChild(jl);
      paintJoinLine(jl, opts.join);
    }

    var head = el('div', 'fk-head');
    head.appendChild(el('div', 'fk-kind', opts.title || 'Feedback'));
    if (opts.subtitle) head.appendChild(el('div', 'fk-prompt', opts.subtitle));
    pad.appendChild(head);

    var body = el('div', 'fk-body');
    body.dataset.kind = (digest && digest.kind) || '';

    if (opts.held) {
      body.appendChild(heldNote(digest, 'fk-held'));
    } else if (!digest || !digest.kind) {
      body.appendChild(el('div', 'fk-empty', 'Waiting for the room'));
    } else if (digest.kind === 'poll') {
      focusPoll(body, digest, opts);
    } else if (digest.kind === 'scale') {
      focusScale(body, digest, opts);
    } else if (digest.kind === 'wordcloud') {
      focusCloud(body, digest);
    } else {
      focusBrainstorm(body, digest);
    }
    pad.appendChild(body);

    var foot = el('div', 'fk-foot');
    foot.appendChild(el('span', null, opts.footnote || ''));
    if (opts.sample) foot.appendChild(el('span', 'fk-tag', 'SAMPLE'));
    /* Both keys get here and both leave, and a host who arrived with S should
       not be told the way out is a key they did not press. */
    else foot.appendChild(el('span', 'fk-hint', 'E or S to close'));
    pad.appendChild(foot);

    node.appendChild(pad);
    return node;
  }

  function focusPoll(body, digest, opts) {
    var counts = digest.counts || [];
    var labels = opts.options || [];
    var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
    var total = digest.total || 0;
    var lead = counts.indexOf(Math.max.apply(null, counts.concat([0])));

    counts.forEach(function (n, i) {
      var row = el('div', 'fk-poll' + (total && i === lead && n > 0 ? ' lead' : ''));
      row.appendChild(el('div', 'fk-plabel', labels[i] || 'Option ' + (i + 1)));
      var bar = el('div', 'fk-pbar');
      var fill = el('i');
      fill.style.width = ((n / max) * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      var num = el('div', 'fk-pnum');
      num.appendChild(el('span', 'fk-pn', String(n)));
      num.appendChild(el('span', 'fk-ppct', total ? Math.round((n / total) * 100) + '%' : '0%'));
      row.appendChild(num);
      body.appendChild(row);
    });
  }

  function focusCloud(body, digest) {
    var words = digest.words || [];
    if (!words.length) { body.appendChild(el('div', 'fk-empty', 'No words yet')); return; }
    var cloud = el('div', 'fk-cloud');
    var top = words[0].n;
    /* A wider size range than the rail can afford — this is the version worth
       actually looking at. */
    words.slice(0, 32).forEach(function (w) {
      var scale = 0.34 + 0.66 * (w.n / top);
      var chip = el('span', 'fk-word', w.text);
      chip.style.fontSize = 'calc(var(--fk-cloud) * ' + scale.toFixed(2) + ')';
      if (w.n > 1) chip.appendChild(el('sup', null, String(w.n)));
      cloud.appendChild(chip);
    });
    body.appendChild(cloud);
  }

  function focusBrainstorm(body, digest) {
    var items = digest.items || [];
    if (!items.length) { body.appendChild(el('div', 'fk-empty', 'Nothing yet')); return; }
    var grid = el('div', 'fk-cards');
    /* Two columns up to six cards, three beyond that — more than nine on
       screen at once stops being readable from the back. */
    grid.dataset.cols = items.length > 6 ? '3' : '2';
    items.slice(0, 9).forEach(function (it) {
      /* Anonymous on the wall, as the rail is — see paintBrainstorm. */
      var card = el('div', 'fk-card');
      card.appendChild(el('div', 'fk-ctext', it.text));
      grid.appendChild(card);
    });
    body.appendChild(grid);
    if (items.length > 9) {
      body.appendChild(el('div', 'fk-more', '+ ' + (items.length - 9) + ' more not shown'));
    }
  }

  /**
   * Everything both feedback views need to label themselves, from the slide's
   * own feedback settings.
   *
   * One builder, because the rail, the focus view, the editor's preview of
   * each and the live host all have to agree. Building the labels separately
   * per call site is how the editor preview came to render a scale with no
   * ends on it — the same drift that hit question slides twice.
   *
   * @param {object} f slide.feedback
   * @returns {object} { title, subtitle, options, ends }
   */
  function feedbackViewOpts(f) {
    var kind = f && f.kind ? SF.FEEDBACK_KINDS[f.kind] : null;
    return {
      title: kind ? kind.label : 'Feedback',
      subtitle: f.prompt,
      /* A scale's points are generated from how many the author chose; what
         they name is the two ends. */
      options: f.kind === 'scale' ? SF.scaleLabels(f) : (f.options || []),
      ends: f.kind === 'scale' ? { low: f.lowLabel, high: f.highLabel } : null
    };
  }

  /* Plausible stand-in results, so the layout can be judged while authoring.
     Marked as a sample everywhere it is shown — it must never be mistaken for
     what the room actually said. */
  function sampleFeedbackDigest(f) {
    if (!f || !f.kind) return null;

    if (f.kind === 'poll') {
      var live = f.options.filter(function (o) { return String(o).trim(); });
      var weights = [7, 11, 4, 2, 5, 1];
      var counts = live.map(function (_, i) { return weights[i % weights.length]; });
      var total = counts.reduce(function (a, b) { return a + b; }, 0);
      return { kind: 'poll', counts: counts, total: total, answered: total, players: total, sample: true };
    }

    if (f.kind === 'scale') {
      /* Bunched towards the confident end with a couple of holdouts — the
         shape a real class produces, rather than a flat row of equal bars. */
      var shape = { 3: [2, 5, 9], 4: [2, 3, 7, 5], 5: [1, 2, 4, 7, 3],
        6: [1, 2, 3, 6, 4, 2], 7: [1, 1, 2, 4, 6, 3, 1] };
      var bars = shape[f.points] || shape[5];
      var seen = bars.reduce(function (a, b) { return a + b; }, 0);
      return { kind: 'scale', counts: bars, total: seen,
        answered: seen, players: seen + 3, sample: true };
    }

    if (f.kind === 'wordcloud') {
      return {
        kind: 'wordcloud',
        words: [
          { text: 'useful', n: 6 }, { text: 'tricky', n: 4 }, { text: 'clear', n: 3 },
          { text: 'fast', n: 2 }, { text: 'dense', n: 2 }, { text: 'new', n: 1 },
          { text: 'daunting', n: 1 }, { text: 'fair', n: 1 }
        ],
        total: 20, unique: 8, answered: 14, players: 18, sample: true
      };
    }

    return {
      kind: 'brainstorm',
      items: [
        { name: 'Ana', text: 'More worked examples in the seminars' },
        { name: 'Ben', text: 'A past paper walkthrough before the deadline' },
        { name: 'Priya', text: 'Share the slides the night before' },
        { name: 'Tom', text: 'Shorter reading list, more depth on each' }
      ],
      total: 4, answered: 4, players: 18, sample: true
    };
  }

  /* --------------------------------------------------- feedback rail */

  /* Same slot and geometry as the scoreboard — a presentation only ever needs
     one side panel, and reusing the shell means one scaling path. */
  function feedbackRail(deck) {
    var root = themedRoot('scorerail fbrail', deck);
    root.appendChild(el('div', 'rail-title', 'Feedback'));
    root.appendChild(el('div', 'rail-sub', ''));
    root.appendChild(el('div', 'rail-news'));
    /* Join sits above the body so an empty poll leaves the QR in the middle
       of the rail rather than a hollow stretch above the footer PIN. */
    root.appendChild(el('div', 'rail-join'));
    root.appendChild(el('div', 'fb-body'));
    var foot = el('div', 'foot');
    foot.appendChild(el('div', 'joinline'));
    foot.appendChild(el('div', 'notes', ''));
    root.appendChild(foot);
    return root;
  }

  /** A held prompt's body: the count, and that the answers are kept back. */
  function heldNote(digest, cls) {
    var box = el('div', cls);
    var answered = digest ? Number(digest.answered) || 0 : 0;
    box.appendChild(el('div', cls + '-n', String(answered)));
    box.appendChild(el('div', cls + '-line', answered === 1 ? 'answer in' : 'answers in'));
    box.appendChild(el('div', cls + '-note', 'Hidden until your teacher shows them. Answer for yourself.'));
    return box;
  }

  function paintFeedbackRail(rail, digest, opts) {
    opts = opts || {};
    rail.querySelector('.rail-title').textContent = opts.title || 'Feedback';
    rail.querySelector('.rail-sub').textContent = opts.subtitle || '';
    rail.querySelector('.foot .notes').textContent = opts.footnote || '';
    paintJoinLine(rail.querySelector('.joinline'), opts.join);

    var busy = feedbackDigestBusy(digest);
    var joining = !!(opts.join && opts.join.pin);
    var slot = ensureRailJoin(rail);
    /* Roomy while nothing has come back — same idea as the empty scoreboard. */
    paintRailJoin(slot, opts.join, !busy);

    paintFbMeter(rail, digest);

    var body = rail.querySelector('.fb-body');
    body.textContent = '';
    body.classList.remove('tight', 'tighter');
    rail.dataset.kind = (digest && digest.kind) || '';

    /* Held: how many have answered is on the wall (the meter above), and
       the split is not. The desk shows it when the teacher is ready. */
    if (opts.held) {
      body.appendChild(heldNote(digest, 'fb-held'));
      return;
    }

    if (!busy) {
      if (opts.roster && opts.roster.length) paintFbRoster(body, opts.roster);
      else if (!joining) {
        body.appendChild(el('div', 'empty-rail', opts.emptyText || 'Waiting for the room'));
      }
      return;
    }

    if (digest.kind === 'poll') paintPoll(body, digest, opts);
    else if (digest.kind === 'scale') paintScale(body, digest, opts);
    else if (digest.kind === 'wordcloud') paintCloud(body, digest, opts);
    else paintBrainstorm(body, digest);
    fitFeedback(body, digest.kind);
  }

  /**
   * How much of the room has answered, at the top, in the ink of the prompt.
   *
   * The live number a teacher is waiting on — "do I give them longer?" — was
   * a 15px grey footnote under everything else. For a big room it is also the
   * only honest summary: 180 of 240 is a fact about a lecture theatre, where
   * a list of names is not.
   */
  function paintFbMeter(rail, digest) {
    var meter = rail.querySelector('.fb-meter');
    var players = digest ? Number(digest.players) || 0 : 0;
    var answered = digest ? Math.min(players, Number(digest.answered) || 0) : 0;
    if (!players) { if (meter) meter.remove(); return; }
    if (!meter) {
      meter = el('div', 'fb-meter');
      var sub = rail.querySelector('.rail-sub');
      if (sub && sub.parentNode) sub.parentNode.insertBefore(meter, sub.nextSibling);
      else rail.appendChild(meter);
    }
    meter.textContent = '';
    var line = el('div', 'fbm-line');
    line.appendChild(el('strong', 'fbm-n', String(answered)));
    line.appendChild(el('span', 'fbm-of', ' of ' + players + ' answered'));
    if (answered === players) line.appendChild(el('span', 'fbm-all', 'Everyone'));
    meter.appendChild(line);
    var bar = el('div', 'fbm-bar');
    var fill = el('i');
    fill.style.width = Math.round((answered / players) * 100) + '%';
    bar.appendChild(fill);
    meter.appendChild(bar);
  }

  /* Nothing in the feedback rail is drawn cut in half, whatever the room
     sends: a poll tightens, a cloud loses its rarest words, a brainstorm its
     oldest cards, and each says how many it is not showing. */
  function fitFeedback(body, kind) {
    if (!body.clientHeight) return;
    var over = function () { return overflowing(body); };
    if (kind === 'poll') {
      if (over()) body.classList.add('tight');
      if (over()) body.classList.add('tighter');
      return;
    }
    if (kind === 'wordcloud') {
      var cloud = /** @type {HTMLElement|null} */ (body.querySelector('.cloud'));
      if (cloud) fitByDropping(cloud, '.word', 3);
      return;
    }
    if (kind === 'brainstorm') {
      var more = body.querySelector('.more');
      var total = Number(body.dataset.total) || 0;
      if (!more && over()) { more = el('div', 'more', ''); body.appendChild(more); }
      fitByDropping(body, '.fbcard', 1, function () {
        var left = body.querySelectorAll('.fbcard').length;
        if (more) {
          more.textContent = '+ ' + (total - left) + ' more';
          body.appendChild(more);
        }
      });
    }
  }

  /** Make sure the join panel exists and sits above the body. */
  function ensureRailJoin(rail) {
    var body = rail.querySelector('.fb-body');
    var join = rail.querySelector('.rail-join');
    if (!join) {
      join = el('div', 'rail-join');
      if (body) rail.insertBefore(join, body);
      else rail.appendChild(join);
      return join;
    }
    /* Older shells put the join under the body — move it up so it owns the
       empty middle instead of leaving a hollow stretch above the footer PIN. */
    if (body && (join.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING)) {
      rail.insertBefore(join, body);
    }
    return join;
  }

  function feedbackDigestBusy(digest) {
    if (!digest || !digest.kind) return false;
    if (Number(digest.total) > 0 || Number(digest.answered) > 0) return true;
    if (digest.words && digest.words.length) return true;
    if (digest.items && digest.items.length) return true;
    if (digest.counts && digest.counts.some(function (n) { return Number(n) > 0; })) return true;
    return false;
  }

  /** Names of people who joined — shown until responses start landing. */
  function paintFbRoster(body, roster) {
    /* A room of thirty is a count, not a column of names. The names are
       worth it while a handful are arriving — seeing your own land is how
       you know you are in. */
    if (roster.length > 12) {
      body.appendChild(el('div', 'fb-room-n', String(roster.length)));
      body.appendChild(el('div', 'fb-room-lbl', 'in the room, waiting for the first answer'));
      return;
    }
    body.appendChild(el('div', 'fb-roster-lbl',
      roster.length === 1 ? '1 person in' : roster.length + ' people in'));
    roster.forEach(function (p) {
      body.appendChild(el('div', 'fb-who-in', p.name || 'Player'));
    });
  }

  function paintPoll(body, digest, opts) {
    var counts = digest.counts || [];
    var labels = opts.options || [];
    var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
    var total = digest.total || 0;

    if (!total) {
      /* The join QR owns this space while the room is still arriving — a second
         "no votes" line just pushes it down. */
      var joining = !!(opts.join && opts.join.pin);
      if (!joining) body.appendChild(el('div', 'empty-rail', 'No votes yet'));
      return;
    }
    counts.forEach(function (n, i) {
      var row = el('div', 'pollrow');
      var head = el('div', 'pollhead');
      head.appendChild(el('span', 'plabel', labels[i] || 'Option ' + (i + 1)));
      head.appendChild(el('span', 'pn', String(n)));
      row.appendChild(head);
      var bar = el('div', 'pbar');
      var fill = el('i');
      fill.style.width = ((n / max) * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'ppct', total ? Math.round((n / total) * 100) + '%' : '0%'));
      body.appendChild(row);
    });
  }

  /* The average of the room's positions, and how spread out they are.
     A mean alone hides a split room: 1,1,5,5 and 3,3,3,3 both average 3, and
     they are the opposite situation for whoever is teaching. */
  function scaleStats(counts) {
    var total = 0, sum = 0;
    counts.forEach(function (n, i) { total += n; sum += n * (i + 1); });
    if (!total) return { total: 0, mean: 0, split: false };
    var mean = sum / total;
    /* Split when the two ends together outweigh the middle — the shape a
       teacher needs to notice, stated as a fact rather than a variance. */
    var edges = (counts[0] || 0) + (counts[counts.length - 1] || 0);
    var middle = total - edges;
    return { total: total, mean: mean, split: counts.length > 2 && edges > middle };
  }

  /* Columns rather than rows: a scale runs from one end to the other, and
     showing it as a row of independent bars loses the only thing that makes
     it a scale. */
  function scaleChart(counts, opts, cls) {
    var stats = scaleStats(counts);
    var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
    var wrap = el('div', cls);

    var cols = el('div', cls + '-cols');
    counts.forEach(function (n, i) {
      var col = el('div', cls + '-col');
      var bar = el('div', cls + '-bar');
      var fill = el('i');
      fill.style.height = ((n / max) * 100) + '%';
      bar.appendChild(fill);
      col.appendChild(el('div', cls + '-n', n ? String(n) : ''));
      col.appendChild(bar);
      col.appendChild(el('div', cls + '-p', String(i + 1)));
      cols.appendChild(col);
    });
    wrap.appendChild(cols);

    var ends = opts.ends || {};
    var foot = el('div', cls + '-ends');
    foot.appendChild(el('span', null, ends.low || ''));
    foot.appendChild(el('span', null, ends.high || ''));
    wrap.appendChild(foot);

    var read = el('div', cls + '-read');
    if (stats.total) {
      read.appendChild(el('strong', null, stats.mean.toFixed(1)));
      read.appendChild(el('span', null, ' average of ' + stats.total));
      if (stats.split) read.appendChild(el('span', cls + '-split', 'ROOM IS SPLIT'));
    }
    wrap.appendChild(read);
    return wrap;
  }

  function paintScale(body, digest, opts) {
    if (!digest.total) {
      var joining = !!(opts && opts.join && opts.join.pin);
      if (!joining) body.appendChild(el('div', 'empty-rail', 'Nobody has placed themselves yet'));
      return;
    }
    body.appendChild(scaleChart(digest.counts || [], opts, 'sc'));
  }

  function focusScale(body, digest, opts) {
    body.appendChild(scaleChart(digest.counts || [], opts, 'fksc'));
  }

  function paintCloud(body, digest, opts) {
    var words = digest.words || [];
    if (!words.length) {
      var joining = !!(opts && opts.join && opts.join.pin);
      if (!joining) body.appendChild(el('div', 'empty-rail', 'No words yet'));
      return;
    }
    var cloud = el('div', 'cloud');
    var top = words[0].n;
    words.slice(0, 24).forEach(function (w) {
      /* Size by share of the most common word, floored so a single mention is
         still readable rather than vanishing. */
      var scale = 0.5 + 0.5 * (w.n / top);
      var chip = el('span', 'word', w.text);
      chip.style.fontSize = 'calc(var(--cloud-f) * ' + scale.toFixed(2) + ')';
      if (w.n > 1) chip.appendChild(el('sup', null, String(w.n)));
      cloud.appendChild(chip);
    });
    body.appendChild(cloud);
  }

  function paintBrainstorm(body, digest) {
    var items = digest.items || [];
    if (!items.length) {
      body.appendChild(el('div', 'empty-rail', 'Nothing yet'));
      return;
    }
    /* Newest first and without names. An idea on the wall is the room's,
       not a person's: a named card is the one the room judges its author
       by, and a student who knows that writes the safe thing. The teacher
       sees who wrote what under Live answers on the desk. */
    var total = Math.max(items.length, Number(digest.total) || 0);
    body.dataset.total = String(total);
    items.slice(0, 8).forEach(function (it) {
      var card = el('div', 'fbcard');
      card.appendChild(el('div', 'fbtext', it.text));
      body.appendChild(card);
    });
    if (total > 8) {
      body.appendChild(el('div', 'more', '+ ' + (total - 8) + ' more'));
    }
  }

  /* ------------------------------------------------------- race track */

  /**
   * The race track, shown as an overlay after each question is revealed.
   * @param {object} deck   for the theme
   * @param {Array}  lanes  [{ key, name, pos, color, moved }]
   * @param {object} opts   { length, title, note, winners }
   */
  /** #rrggbb -> rgba(), so a lane can tint its completed steps. */
  function tint(hex, alpha) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
    if (!m) return 'rgba(255,255,255,.18)';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' +
           parseInt(m[3], 16) + ',' + alpha + ')';
  }

  function raceTrack(deck, lanes, opts) {
    opts = opts || {};
    var len = Math.max(1, opts.length || 5);

    var node = themedRoot('slide', deck, 'layout-race', 'race');
    var pad = el('div', 'pad');

    pad.appendChild(el('div', 'race-title', opts.title || 'The race'));
    if (opts.note) pad.appendChild(el('div', 'race-note', opts.note));

    /* Deliberately not "track": .slide .track is the progress bar at the foot
       of every slide, and inheriting its absolute 5px-tall rule collapsed the
       whole board. */
    var board = el('div', 'racetrack');
    /* One column per step plus a lane label, so every lane's step N sits in the
       same place across lanes — the whole point of a race is comparing them. */
    board.style.setProperty('--steps', String(len));

    /* A big room (K10's rule): past eight lanes, the leading five run on the
       wall and everyone else is "the pack" — one lane that counts how many
       stand on each step. Nobody's lane is cut without a trace, and the back
       of the field is never a public list. Each phone shows its own lane. */
    var crowd = lanes.length > CROWD_AT;
    var pack = crowd ? lanes.slice(CROWD_TOP) : [];
    if (crowd) lanes = lanes.slice(0, CROWD_TOP);

    lanes.forEach(function (lane) {
      var row = el('div', 'lane' + (lane.moved ? ' moved' : '') +
                            ((opts.winners || []).indexOf(lane.key) > -1 ? ' won' : ''));
      var colour = lane.color || 'var(--s-accent)';
      row.style.setProperty('--lane-color', colour);
      row.style.setProperty('--lane-tint', tint(lane.color, 0.34));

      var label = el('div', 'lane-name');
      var dot = el('span', 'lane-dot');
      dot.style.background = colour;
      label.appendChild(dot);
      label.appendChild(el('span', 'lane-text', lane.name));
      row.appendChild(label);

      var rail = el('div', 'lane-rail');
      for (var i = 1; i <= len; i++) {
        var cell = el('div', 'step' + (i === len ? ' finish' : ''));
        if (i <= lane.pos) cell.classList.add('done');
        rail.appendChild(cell);
      }

      /* Positioned as a fraction of the rail rather than inside a cell, so the
         CSS transition animates the move. Step n means "standing in cell n",
         so the runner goes to that cell's centre — using n/len would park it
         on the boundary between two cells and read as ambiguous. */
      var runner = el('div', 'runner', lane.pos >= len ? '🏆' : '🏇');
      runner.style.left = (lane.pos <= 0 ? 0 : ((lane.pos - 0.5) / len) * 100) + '%';
      rail.appendChild(runner);
      row.appendChild(rail);

      row.appendChild(el('div', 'lane-pos', lane.pos + ' / ' + len));
      board.appendChild(row);
    });

    if (pack.length) {
      var packRow = el('div', 'lane pack' + (pack.some(function (l) { return l.moved; }) ? ' moved' : ''));
      var packLabel = el('div', 'lane-name');
      packLabel.appendChild(el('span', 'lane-text', 'The pack'));
      packLabel.appendChild(el('span', 'lane-sub', pack.length + ' more'));
      packRow.appendChild(packLabel);
      var packRail = el('div', 'lane-rail');
      var here = [];
      for (var k = 0; k <= len; k++) here.push(0);
      pack.forEach(function (l) { here[Math.max(0, Math.min(len, l.pos))]++; });
      var most = Math.max.apply(null, here) || 1;
      for (var j = 1; j <= len; j++) {
        var c = el('div', 'step' + (j === len ? ' finish' : '') + (here[j] ? ' held' : ''));
        c.style.setProperty('--share', String(here[j] / most));
        if (here[j]) c.appendChild(el('span', 'pack-n', String(here[j])));
        packRail.appendChild(c);
      }
      packRow.appendChild(packRail);
      var moved = pack.filter(function (l) { return l.moved; }).length;
      packRow.appendChild(el('div', 'lane-pos', here[0] ? here[0] + ' at the start' : moved ? '\u25b2 ' + moved : ''));
      board.appendChild(packRow);
    }

    pad.appendChild(board);
    if (crowd) pad.appendChild(el('div', 'race-yours', 'Your lane is on your phone'));
    node.appendChild(pad);
    return node;
  }

  /** Shared boss HP overlay — same slot as the race track. */
  function bossBar(deck, opts) {
    opts = opts || {};
    var max = Math.max(1, Number(opts.max) || 1);
    var hp = Math.max(0, Math.min(max, Number(opts.hp) || 0));
    var pct = Math.round((hp / max) * 100);
    var node = themedRoot('slide', deck, 'layout-boss' +
      (opts.hit ? ' boss-hit' : ' boss-miss') + (hp <= 0 ? ' boss-down' : ''), 'boss');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'boss-title', opts.title || 'Boss battle'));
    /* The reveal as a moment: the boss reacts, the damage lands as a number,
       and the room's accuracy is the attack that did it. */
    var face = el('div', 'boss-face');
    face.appendChild(el('span', 'boss-glyph', hp <= 0 ? '\u2620' : '\u25b2'));
    face.appendChild(el('span', 'boss-dmg', opts.hit && opts.damage ? '\u2212' + opts.damage : opts.hit ? '' : 'MISS'));
    pad.appendChild(face);
    if (opts.attack) pad.appendChild(el('div', 'boss-attack', opts.attack));
    if (opts.note) pad.appendChild(el('div', 'boss-note', opts.note));
    var meter = el('div', 'boss-meter');
    /* The chunk just knocked off, drawn between the new and the old health
       and fading out, so the damage is seen and not only read. */
    var prev = Math.max(hp, Math.min(max, Number(opts.prevHp) || hp));
    if (prev > hp) {
      var chip = el('div', 'boss-chip');
      chip.style.left = pct + '%';
      chip.style.width = Math.round(((prev - hp) / max) * 100) + '%';
      meter.appendChild(chip);
    }
    var fill = el('div', 'boss-fill');
    fill.style.width = pct + '%';
    meter.appendChild(fill);
    pad.appendChild(meter);
    pad.appendChild(el('div', 'boss-hp', hp + ' / ' + max + ' HP'));
    node.appendChild(pad);
    return node;
  }

  /** Word Reveal drip wall — letter mask over the deck. */
  function wordRevealWall(deck, opts) {
    opts = opts || {};
    var node = themedRoot('slide', deck, 'layout-wordreveal', 'wordreveal');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'wr-title', 'Word reveal'));
    if (opts.hint) pad.appendChild(el('div', 'wr-hint', opts.hint));
    pad.appendChild(el('div', 'wr-mask', opts.mask || ''));
    pad.appendChild(el('div', 'wr-meta',
      (opts.shown || 0) + ' / ' + (opts.total || 0) + ' letters'));
    node.appendChild(pad);
    return node;
  }

  /** Memory / knowledge study card on the wall. */
  function studyCards(deck, opts) {
    opts = opts || {};
    var node = themedRoot('slide', deck, 'layout-study', 'study');
    var pad = el('div', 'pad');
    pad.appendChild(el('div', 'study-term', opts.term || ''));
    if (opts.definition) pad.appendChild(el('div', 'study-def', opts.definition));
    if (opts.seconds > 0) {
      pad.appendChild(el('div', 'study-note',
        opts.hideAfter ? ('Study · ' + opts.seconds + 's then hide') : 'Keywords stay visible'));
    }
    node.appendChild(pad);
    return node;
  }

  /* ------------------------------------------------------- score rail */

  /** Empty rail shell. Built once per show; rows are painted into it. */
  function scoreRail(deck) {
    var root = themedRoot('scorerail', deck);
    root.appendChild(el('div', 'rail-title', 'The room'));
    root.appendChild(el('div', 'rail-sub', ''));
    /* Arrivals, briefly. Above the board because that is where the eye is
       when the board is what changed. */
    root.appendChild(el('div', 'rail-news'));
    root.appendChild(el('div', 'rows'));
    /* The way in, on screen for as long as it is usable. Below the board so
       the standings keep the top of the rail. */
    root.appendChild(el('div', 'rail-join'));
    var foot = el('div', 'foot');
    foot.appendChild(el('div', 'joinline'));
    foot.appendChild(el('div', 'notes', ''));
    root.appendChild(foot);
    return root;
  }

  /**
   * Give the rail the same surface as the slide beside it.
   *
   * The rail paints var(--s-bg), the same token the slide uses, which agrees
   * for every theme that only sets the token. The studio theme also paints
   * some layouts directly — its section slides are lilac while its token is
   * sage — so on those the panel and the slide it is butted against came out
   * different colours.
   *
   * Read off the slide rather than told separately, so a new theme or a new
   * layout cannot drift out of step: whatever the slide resolves to is what
   * the rail gets.
   *
   * The ink travels with the surface. A theme is allowed to flip its whole
   * token set per layout — northeastern's section slides are white type on
   * red where the theme's own token is ink on white — and taking the red
   * without the white left the rail printing red text on red.
   *
   * @param {HTMLElement} rail
   * @param {HTMLElement} slideEl the .slide currently on screen
   */
  var RAIL_INK = ['--s-fg', '--s-dim', '--s-rule', '--s-card', '--s-accent', '--s-accent-2', '--s-scrim'];

  function railSurface(rail, slideEl) {
    if (!rail || !slideEl) return;
    var cs = getComputedStyle(slideEl);
    var img = cs.backgroundImage;
    rail.style.backgroundColor = cs.backgroundColor;
    /* A url() background is the slide's own artwork and has no business
       being tiled into a panel beside it — fall back to the flat colour. */
    rail.style.backgroundImage = img.indexOf('url(') === -1 ? img : 'none';
    RAIL_INK.forEach(function (token) {
      var value = cs.getPropertyValue(token).trim();
      if (value) rail.style.setProperty(token, value);
      else rail.style.removeProperty(token);
    });
    /* Same reasoning as the tokens above, for the one thing that is not a
       token: the rail reads its ground off the slide it is butted against
       rather than off the deck, so a theme that flips ground per layout gets
       a rail that flips with it. */
    if (slideEl.dataset.ground) rail.dataset.ground = slideEl.dataset.ground;
  }

  /**
   * The join panel in the rail: the code as a square, and the PIN under it.
   *
   * Big while the board is empty, because an empty rail saying "waiting for
   * players" is the one moment the screen has nothing better to do than show
   * people how to arrive. Compact once anyone is in, so the standings keep
   * the space — and gone entirely once joining shuts, since a PIN that will
   * not admit anyone is worse than no PIN.
   *
   * @param {HTMLElement} node .rail-join
   * @param {object} join { pin, url, link, open, waiting }
   * @param {boolean} roomy nobody on the board yet
   */
  function paintRailJoin(node, join, roomy) {
    if (!node) return;
    /* Shown whenever there is a PIN at all, open window or not.

       Hiding it while the window is shut was wrong: joining a closed room is
       not refused, it puts you in the waiting room and admits you at the next
       round. So the code still works — and a rail reading "waiting for
       players" with no code on it is a room nobody can become a player in.
       What changes when the window shuts is the label, not the presence. */
    var live = !!(join && join.pin);
    node.classList.toggle('on', !!live);
    node.classList.toggle('big', !!live && roomy);
    /* The footer line and a big panel say the same thing, and the panel says
       it better. Marked on the rail so the line can stand down rather than
       printing the PIN twice, once over the other. */
    var rail = node.closest ? node.closest('.scorerail') : null;
    if (rail) rail.classList.toggle('joining-big', !!live && roomy);
    /* The small panel says it too — the QR and the PIN, 30px — so the footer
       line printing the same PIN again at 25px under it was the rail telling
       the room one thing twice in its bottom quarter. */
    if (rail) rail.classList.toggle('has-join', !!live);
    if (!live) { node.textContent = ''; node.dataset.for = ''; return; }

    var open = join.open !== false;
    var link = join.link || join.url || '';
    /* The window state is in the key: the label changes with it, so a repaint
       has to happen when it flips. */
    var waiting = open ? 0 : Math.max(0, Number(join.waiting) || 0);
    var key = link + '|' + (roomy ? 'big' : 'small') + '|' +
      (open ? 'open' : 'shut') + '|' + waiting;
    /* Rebuilt only when the payload changes: this runs on every roster push
       and encoding a QR per push would be work for nothing. If the node was
       emptied underneath us, rebuild anyway. */
    if (node.dataset.for === key && node.childElementCount) return;
    node.dataset.for = key;
    node.textContent = '';

    if (link && SF.qrSvg) {
      var code = el('div', 'rj-qr');
      try {
        /* The full four-module quiet zone inside the SVG rather than borrowed
           from the CSS padding around it. Padding is styling and can be
           changed; a code that stops scanning when someone tightens a box is
           a bad thing to leave lying around. */
        code.innerHTML = SF.qrSvg(link, { quiet: 4, title: 'Join at ' + link });
        node.appendChild(code);
      } catch (e) { /* nothing worth showing beats a broken box on a wall */ }
    }
    var side = el('div', 'rj-side');
    /* Says what will actually happen. "Scan to join the next round" is a
       different promise from "point a camera here", and a room that scans on
       the strength of the wrong one and lands in a waiting screen learns not
       to trust the panel. */
    side.appendChild(el('div', 'rj-lbl' + (open ? '' : ' shut'),
      open ? (roomy ? 'Point a camera here' : 'Still joining?')
           : (roomy ? 'Scan to join the next round' : 'Joining next round')));
    side.appendChild(el('div', 'rj-pin', join.pin));
    if (roomy) side.appendChild(el('div', 'rj-url', join.url || ''));
    /* Someone who has already scanned is looking at a waiting screen and
       wants to know it worked. The footer line says this too, but the big
       panel hides that line, so it would go unsaid exactly when the panel is
       the only thing on the rail. */
    if (waiting) {
      side.appendChild(el('div', 'rj-wait',
        waiting + (waiting === 1 ? ' person is' : ' people are') + ' in the queue'));
    }
    node.appendChild(side);
  }

  /* How many entries the rail can show before it has to summarise. Beyond
     this the type would be too small to read from the back of a room, so the
     tail is collapsed into a "+N more" line instead. */
  var RAIL_MAX_ROWS = 10;

  /* Past this many entries the board stops being a list of everyone and
     becomes a top five and the pack. A class of thirty ranked on the wall is
     thirty names at a size nobody can read, and the bottom ten of it is a
     public ranking of who is struggling. Every phone already says its own
     place ("Place 12 of 32"), so the wall does not have to. */
  var CROWD_AT = 8;
  var CROWD_TOP = 5;
  /* Beside a slide that is not asking anything, the rail is a strip: the
     podium, the count, the way in. The slide gets the width back. */
  var SLIM_TOP = 3;

  /** @param {HTMLElement} box */
  function overflowing(box) {
    /* Measured with animations held. scrollHeight includes transforms, so a
       row mid-way through its score pop, or the climb sliding in, reads as
       overflow and costs the board a row it had room for. Adding up the
       children's offsetHeight instead avoids that and is wrong another way:
       each is rounded, and four shrunk rows over-count by the 2px that
       decide whether a fifth fits. */
    box.classList.add('sf-measuring');
    var over = box.scrollHeight > box.clientHeight + 1;
    box.classList.remove('sf-measuring');
    return over;
  }

  /**
   * Take items off the end of a box until it stops overflowing.
   *
   * The counts above are the most a rail will try; whether they fit depends on
   * the theme's font, how long the names are and whether the join panel or a
   * note is taking space. A row cut in half reads as broken, so the last
   * resort is measuring. Returns how many were taken off.
   *
   * @param {HTMLElement} box      the clipping box
   * @param {string} selector      the removable items, in order
   * @param {number} keep          never go below this many
   * @param {function(number)=} onDrop  told the running total after each drop
   */
  function fitByDropping(box, selector, keep, onDrop) {
    /* Not laid out — hidden behind a focus view, or not in the document —
       measures as zero and would lose everything. */
    if (!box || !box.clientHeight) return 0;
    var dropped = 0;
    var items = box.querySelectorAll(selector);
    var n = items.length;
    while (n > keep && overflowing(box)) {
      items[n - 1].remove();
      n--;
      dropped++;
      if (onDrop) onDrop(dropped);
    }
    return dropped;
  }

  /* A name wraps at spaces, so what decides whether it fits is its longest
     single word. Shrink only as far as that word demands — "Blue" stays full
     size while "The Quizzinators" steps down rather than truncating. */
  function nameScale(name) {
    var longest = String(name).split(/\s+/).reduce(function (m, w) {
      return Math.max(m, w.length);
    }, 0);
    if (longest <= 6) return 1;
    if (longest <= 9) return 0.86;
    if (longest <= 12) return 0.74;
    return 0.62;
  }

  /**
   * A person's name as the wall prints it.
   *
   * "Tom Okonkwo-Bright" fits a rail row only at 62% of the row's type size,
   * which from the back of a room is not a name at all. A class knows its
   * Toms apart by the surname's initial, so a full name that would have to
   * shrink is printed as "Tom O." instead. Team names are left alone — "The
   * Quizzinators" is one name, not a first name and a surname.
   */
  function wallName(name, people) {
    var text = String(name || '');
    if (!people || nameScale(text) >= 0.86) return text;
    var parts = text.trim().split(/\s+/);
    if (parts.length < 2) return text;
    return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
  }

  /* Row size is driven by the number of entries: a two-team board reads huge,
     a twelve-player board stays legible. */
  function railDensity(n) {
    if (n <= 2) return 'xl';
    if (n <= 4) return 'lg';
    if (n <= 6) return 'md';
    if (n <= 8) return 'sm';
    return 'xs';
  }

  /**
   * Repaint the rail in place.
   * @param {HTMLElement} rail
   * @param {Array} rows  [{ key, name, score, members, color, gained }]
   * @param {object} opts { subtitle, footnote, emptyText }
   */
  function paintScoreRail(rail, rows, opts) {
    opts = opts || {};
    var sub = rail.querySelector('.rail-sub');
    if (sub) sub.textContent = opts.subtitle || '';
    /* The rail says which of the two columns is which, once, at the top. */
    /** @type {HTMLElement|null} */
    var legend = rail.querySelector('.rail-legend');
    if (!legend) {
      var newLegend = el('div', 'rail-legend');
      var rowsBox = rail.querySelector('.rows');
      if (rowsBox && rowsBox.parentNode) {
        rowsBox.parentNode.insertBefore(newLegend, rowsBox);
      }
      legend = newLegend;
    }
    /* Only what the column is. How each person is doing — their accuracy,
       and whether they need a hand — used to sit under their name here, on
       the projector, for the whole room to read. That is the teacher's to
       know and it lives on the desk (see Live.needsHand). */
    if (legend) {
      legend.replaceChildren();
      legend.appendChild(el('span', 'lg-score', String(opts.scoreLabel || 'Game points').toUpperCase()));
      legend.hidden = !rows.length;
    }
    var footNotes = rail.querySelector('.foot .notes');
    if (footNotes) footNotes.textContent = opts.footnote || '';
    /** @type {HTMLElement|null} */
    var joinLine = rail.querySelector('.joinline');
    if (joinLine) paintJoinLine(joinLine, opts.join);
    /** @type {HTMLElement|null} */
    var railJoin = rail.querySelector('.rail-join');
    if (railJoin) paintRailJoin(railJoin, opts.join, !rows.length);

    /** @type {HTMLElement|null} */
    var box = rail.querySelector('.rows');
    if (!box) return;

    if (!rows.length) {
      rail.dataset.density = 'lg';
      box.innerHTML = '';
      /* No "waiting for players" when the join panel is showing them how to
         stop it being true — two ways of saying the same thing, one of them
         actionable. */
      var joining = !!(opts.join && opts.join.pin);
      if (!joining) {
        box.appendChild(el('div', 'empty-rail', opts.emptyText || 'Nobody has joined yet.'));
      }
      return;
    }

    /* Kept for a repaint that only changes the rail's size — the strip and
       the full rail are the same standings at two widths. */
    /** @type {any} */ (rail)._last = { rows: rows, opts: opts };

    var slim = rail.dataset.size === 'slim';
    var crowd = rows.length > CROWD_AT;
    rail.classList.toggle('crowd', crowd && !slim);
    var limit = slim ? SLIM_TOP : crowd ? CROWD_TOP : RAIL_MAX_ROWS;
    var shown = rows.slice(0, limit);
    var hidden = rows.length - shown.length;
    var climb = crowd && !slim ? biggestClimb(rail, rows, shown.length) : null;
    /* A big room's pack line is two lines and its climb a third, so they
       count as rows when choosing how big the rows can be. */
    rail.dataset.density = slim ? 'slim'
      : railDensity(shown.length + (hidden ? (crowd ? 2 : 1) : 0) + (climb ? 1 : 0));

    /* The member count only earns its line while the rows are tall enough for
       a second line of text. */
    var roomForMembers = ['xl', 'lg', 'md'].indexOf(rail.dataset.density) !== -1;

    var existing = {};
    Array.prototype.forEach.call(box.children, function (n) {
      if (n.dataset.key) existing[n.dataset.key] = n;
    });

    var order = [];
    shown.forEach(function (r, i) {
      var node = existing[r.key];
      if (!node) {
        node = el('div', 'srow');
        node.dataset.key = r.key;
        node.appendChild(el('div', 'rk', ''));
        var who = el('div', 'who');
        who.appendChild(el('div', 'nm', ''));
        node.appendChild(who);
        node.appendChild(el('div', 'sc', ''));
      }
      delete existing[r.key];

      node.querySelector('.rk').textContent = String(i + 1);
      var nm = node.querySelector('.nm');
      var shownName = wallName(r.name, opts.people);
      nm.textContent = shownName;
      nm.title = r.name;
      nm.style.fontSize = 'calc(var(--nm-f) * ' + nameScale(shownName) + ')';

      /* Members sit on their own line rather than trailing the name, which is
         what made long team names collide with the score. */
      var who = node.querySelector('.who');
      var mem = who.querySelector('.mem');
      if (r.members != null && roomForMembers) {
        if (!mem) { mem = el('div', 'mem', ''); who.appendChild(mem); }
        mem.textContent = r.members === 1 ? '1 player' : r.members + ' players';
      } else if (mem) {
        mem.remove();
      }

      /* A shell built before the accuracy line moved to the desk. */
      var learn = node.querySelector('.learn');
      if (learn) learn.remove();
      var sc = node.querySelector('.sc');
      sc.textContent = String(r.score);
      /* Labelled, so nobody reads distance or an average as a mark. */
      sc.title = opts.scoreLabel || 'Game points';
      sc.setAttribute('aria-label', (opts.scoreLabel || 'Game points') + ': ' + r.score);
      node.style.borderLeftColor = r.color || '';
      node.classList.toggle('lead', i === 0 && r.score > 0);

      /* Flash only the rows that actually moved, so the eye is drawn to the
         change rather than to the whole board repainting. */
      if (r.gained) {
        node.classList.remove('gain');
        void node.offsetWidth;              // restart the animation
        node.classList.add('gain');
      }
      order.push(node);
    });

    // drop anyone who left
    Object.keys(existing).forEach(function (k) { existing[k].remove(); });

    var moreEl = box.querySelector('.more');
    var more = null;
    if (hidden > 0) {
      more = moreEl || el('div', 'more', '');
      order.push(more);
    } else if (moreEl) {
      moreEl.remove();
    }
    var tellMore = function (n) {
      if (!more) return;
      more.textContent = '';
      /* The pack is not a list: how many, and where each of them can find
         their own place. */
      more.appendChild(el('span', 'more-n', '+ ' + n + ' more'));
      if (crowd && !slim) more.appendChild(el('span', 'more-where', 'Your place is on your phone'));
    };
    tellMore(hidden);

    /* Somebody from the pack moving up is the one piece of news a board of
       thirty has for the people not on it. Named, because it is good news. */
    var oldClimb = box.querySelector('.climb');
    /** @type {HTMLElement|null} */
    var climbEl = null;
    if (climb) {
      climbEl = /** @type {HTMLElement} */ (oldClimb || el('div', 'climb', ''));
      climbEl.textContent = '';
      climbEl.appendChild(el('span', 'cl-up', '\u25b2 ' + climb.by));
      climbEl.appendChild(el('span', 'cl-nm', wallName(climb.name, opts.people)));
      climbEl.appendChild(el('span', 'cl-lbl', 'biggest climb'));
      order.push(climbEl);
    } else if (oldClimb) {
      oldClimb.remove();
    }

    for (var oi = 0; oi < order.length; oi++) {
      if (order[oi]) box.appendChild(order[oi]);
    }

    /* Whatever the counts said, nothing is drawn cut in half. */
    var list = box;
    if (!more && list.clientHeight && overflowing(list)) {
      more = el('div', 'more', '');
      list.appendChild(more);
      tellMore(0);
    }
    fitByDropping(list, '.srow', 1, function (dropped) {
      tellMore(hidden + dropped);
      /* The pack line and the climb sit after the rows, so they have to be
         put back at the end each time a row comes off. */
      if (more) list.appendChild(more);
      if (climbEl) list.appendChild(climbEl);
    });
  }

  /**
   * The largest move up the board since the order last changed, among those
   * the rail is not already showing.
   *
   * Compared against the previous distinct order rather than the previous
   * paint: the rail repaints on every roster push, and a climb has to stay
   * up until the next reveal moves the board again.
   *
   * @param {HTMLElement} rail
   * @param {Array} rows   in board order
   * @param {number} shown how many the rail names at the top
   */
  function biggestClimb(rail, rows, shown) {
    var store = /** @type {any} */ (rail);
    var now = {};
    rows.forEach(function (r, i) { now[r.key] = i; });
    var sig = rows.map(function (r) { return r.key; }).join('|');
    if (store._rankSig === sig) return store._climb || null;
    var before = store._ranks;
    store._ranks = now;
    store._rankSig = sig;
    store._climb = null;
    if (!before) return null;
    var best = null;
    rows.forEach(function (r, i) {
      if (i < shown || !(r.key in before)) return;
      var by = before[r.key] - i;
      if (by >= 2 && (!best || by > best.by)) best = { name: r.name, by: by };
    });
    store._climb = best;
    return best;
  }

  /* The PIN stays on screen for the whole game so anyone arriving late can
     still get in without interrupting. Press J for the full-screen version. */
  function paintJoinLine(node, join) {
    if (!join || !join.pin) { node.textContent = ''; node.style.display = 'none'; return; }
    node.style.display = '';
    node.textContent = '';
    node.classList.toggle('shut', join.open === false);

    if (join.open === false) {
      /* Once the window shuts the PIN is no use to the room, so the line says
         what is actually true rather than inviting joins that get held. */
      node.appendChild(el('span', 'jl-lbl', 'CLOSED'));
      node.appendChild(el('span', 'jl-url',
        join.waiting ? join.waiting + ' waiting for next round' : 'joining reopens next round'));
      return;
    }
    node.appendChild(el('span', 'jl-lbl', 'JOIN'));
    node.appendChild(el('span', 'jl-url', join.url || ''));
    node.appendChild(el('span', 'jl-pin', join.pin));
    if (node.classList.contains('fk-join')) {
      node.title = 'Click or press J for full-screen QR code';
      node.style.cursor = 'pointer';
      var qrHint = el('span', 'jl-qr-hint', '\u26F6 QR (J)');
      node.appendChild(qrHint);
      node.onclick = function () {
        if (SF && SF.Player && SF.Player.control) {
          SF.Player.control('join');
        }
      };
    }
  }

  /** Compact "3 / 5 correct" pill for a show with no audience attached. */
  function soloScore(deck) {
    var root = themedRoot('soloscore', deck);
    root.appendChild(el('span', 'lbl', 'Score'));
    root.appendChild(el('span', 'val', '0 / 0'));
    return root;
  }

  return {bossBar, feedbackFocus, feedbackRail, feedbackViewOpts, paintFeedbackRail, paintRailJoin, paintScoreRail, questionCard, raceTrack, railSurface, sampleFeedbackDigest, scoreRail, soloScore, studyCards, tint, wordRevealWall};
}
