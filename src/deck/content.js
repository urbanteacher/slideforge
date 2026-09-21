/* Pure deck content, media safety, layout and learner excerpt helpers. */
var TABLE_MAX_COLS = 6, TABLE_MAX_ROWS = 12;

/**
 * Rows of cells from the table slide's text.
 *
 * Tabs first, because that is what a spreadsheet puts on the clipboard —
 * select a range in Excel or Sheets, paste it in, and it is already a
 * table. Pipes are the fallback for typing one by hand, where a tab would
 * move focus out of the textarea instead of landing in it.
 *
 * Ragged rows are padded rather than rejected: half a table on the wall is
 * more use to somebody mid-edit than an error message.
 */
function parseTable(text) {
  var lines = String(text == null ? '' : text).split(/\r?\n/)
    .filter(function (l) { return l.trim(); })
    .slice(0, TABLE_MAX_ROWS);
  var rows = lines.map(function (line) {
    var cells = line.indexOf('\t') !== -1 ? line.split('\t') : line.split('|');
    return cells.map(function (c) { return c.trim(); }).slice(0, TABLE_MAX_COLS);
  });
  var cols = rows.reduce(function (n, r) { return Math.max(n, r.length); }, 0);
  rows.forEach(function (r) { while (r.length < cols) r.push(''); });
  return rows;
}

/**
 * Read a chart slide's data out of the same text a table slide uses, so a
 * range pasted from a spreadsheet becomes a chart with no re-typing. First row
 * names the series, first column names the categories:
 *
 *     Year | Leave | Remain
 *     2016 | 52    | 48
 *
 * Values that will not parse as numbers come back as null and are skipped
 * rather than drawn as zero — a gap in the data is not a measurement of nought.
 *
 * @param {object} slide
 * @returns {{categories: string[], series: {name: string, values: (number|null)[]}[]}}
 */
function chartData(slide) {
  var rows = parseTable(slide && slide.body);
  if (rows.length < 2) return { categories: [], series: [] };
  var head = rows[0], body = rows.slice(1);
  var names = head.slice(1).filter(function (h) { return String(h).trim(); });
  var categories = body.map(function (r) { return String(r[0] || '').trim(); });
  var series = names.map(function (name, i) {
    return {
      name: String(name).trim(),
      values: body.map(function (r) {
        var raw = String(r[i + 1] == null ? '' : r[i + 1]).replace(/[,\s%£$€]/g, '');
        if (!raw) return null;
        var n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })
    };
  });
  return { categories: categories, series: series };
}

/* Which idioms treat chartData().series as named coloured marks on the
   drawing. chartData always reads columns as series — that is the right
   paste for a bar — but a pie, treemap, waffle or Sankey reinterprets the
   same text. Listing those columns in a legend labels colours that are not
   on the chart (or, for a Sankey, names the input format as data).

   An exclusion list grew a new bug every time a non-series idiom landed.
   The allowlist is the contract: if a kind draws multiple series as peers,
   it is here; if it does not, it is not. */
var SERIES_LEGEND_KINDS = {
  bar: 1, stack: 1, hbar: 1, line: 1, area: 1,
  combo: 1, radar: 1, bullet: 1, scatter: 1,
  /* A dumbbell is two named series drawn as two coloured dots and nothing
     else. Without the key, which end is which is only in a tooltip, and a
     tooltip is not available to a room looking at a projector. */
  dumbbell: 1
};

/**
 * @param {string} kind
 * @param {number} [seriesCount]
 * @returns {boolean}
 */
function chartUsesSeriesLegend(kind, seriesCount) {
  return (seriesCount == null ? 2 : seriesCount) > 1 && !!SERIES_LEGEND_KINDS[kind];
}

/* The three idioms above the bar family on Munzner's channel ranking need
   the same pasted table read differently, so each reading lives here beside
   chartData rather than being improvised in the renderer.

   A number, or null. Currency, thousands separators and a trailing percent
   are stripped, because a column copied out of a spreadsheet arrives with
   them and refusing it would send the author back to clean data by hand. */
/* parseTable caps rows at six columns and twelve lines, which is right for a
   table someone has to read on a wall and wrong for data nobody reads
   directly. A box plot of five observations is barely a box plot, and a
   scatter of eleven points cannot show a relationship. So the idioms that
   consume numbers rather than display them get their own read, with limits
   set by what the renderer can draw legibly instead of by what a reader can
   scan. */
var DATA_MAX_COLS = 200, DATA_MAX_ROWS = 200;

function dataRows(text) {
  return String(text == null ? '' : text).split(/\r?\n/)
    .filter(function (l) { return l.trim(); })
    .slice(0, DATA_MAX_ROWS)
    .map(function (line) {
      var cells = line.indexOf('\t') !== -1 ? line.split('\t') : line.split('|');
      return cells.map(function (c) { return c.trim(); }).slice(0, DATA_MAX_COLS);
    });
}

function chartNumber(cell) {
  var raw = String(cell == null ? '' : cell).replace(/[,\s%£$€]/g, '');
  if (!raw) return null;
  var n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Points for a scatterplot: the first column is x, every other column is a
 * series of y. Position against two common scales, which is the encoding
 * Munzner ranks first and the only one that answers correlation.
 */
function chartPoints(slide) {
  var rows = dataRows(slide && slide.body);
  if (rows.length < 2) return { series: [], xLabel: '', yLabel: '', labelled: false };
  var head = rows[0], body = rows.slice(1);
  /* Two shapes, told apart by the data rather than by a setting. If the
     first column of the first data row is a number it is x, as before. If it
     is a word, it is the point's name and x is the column after it — which
     is how a person pastes "Central, 34, 62" without being told to.
     Naming the points matters more here than in any other idiom: a scatter
     of anonymous dots shows that a relationship exists and refuses to say
     which of the things being compared is the outlier. */
  var labelled = body.length > 0 && chartNumber(body[0][0]) == null;
  var xCol = labelled ? 1 : 0;
  var names = head.slice(xCol + 1).filter(function (h) { return String(h).trim(); });
  var series = names.map(function (name, i) {
    var pts = [];
    body.forEach(function (r) {
      var x = chartNumber(r[xCol]), y = chartNumber(r[xCol + 1 + i]);
      /* A row missing either coordinate is not a point at zero — it is not
         a point. Plotting it would invent an observation. */
      if (x != null && y != null) {
        pts.push({ x: x, y: y, label: labelled ? String(r[0] || '').trim() : '' });
      }
    });
    return { name: String(name).trim(), points: pts };
  });
  return {
    series: series,
    xLabel: String(head[xCol] || '').trim(),
    yLabel: names.length === 1 ? names[0] : '',
    labelled: labelled
  };
}

/**
 * Observations per category for a box plot: each row is a category and the
 * cells after its name are the values measured in it.
 */
function chartGroups(slide) {
  var rows = dataRows(slide && slide.body);
  if (!rows.length) return [];
  /* A header row is optional here: the columns are repeated observations,
     not named series, so they have nothing to be called. Detected by its
     first data cell not being a number. */
  var body = rows.length > 1 && chartNumber(rows[0][1]) == null ? rows.slice(1) : rows;
  return body.map(function (r) {
    var vals = r.slice(1).map(chartNumber).filter(function (v) { return v != null; });
    vals.sort(function (a, b) { return a - b; });
    return { name: String(r[0] || '').trim(), values: vals };
  }).filter(function (g) { return g.values.length; });
}

/** Quartiles by the linear-interpolation method, and the fences that decide outliers. */
function fiveNumber(sorted) {
  if (!sorted.length) return null;
  function q(p) {
    var pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  var q1 = q(0.25), med = q(0.5), q3 = q(0.75), iqr = q3 - q1;
  /* Tukey's 1.5×IQR. The whisker stops at the furthest observation still
     inside the fence rather than at the fence itself, so it always lands on
     a real measurement. */
  var loFence = q1 - 1.5 * iqr, hiFence = q3 + 1.5 * iqr;
  var inside = sorted.filter(function (v) { return v >= loFence && v <= hiFence; });
  return {
    min: inside.length ? inside[0] : sorted[0],
    q1: q1, median: med, q3: q3,
    max: inside.length ? inside[inside.length - 1] : sorted[sorted.length - 1],
    outliers: sorted.filter(function (v) { return v < loFence || v > hiFence; }),
    n: sorted.length
  };
}

/**
 * Flows for a Sankey: three columns — from, to, amount. This is the only
 * chart here whose data is not a table of values but a list of edges, so it
 * gets its own reading rather than a clever interpretation of the others.
 *
 * Nodes are placed in layers by the longest path that reaches them, not the
 * shortest: a flow that skips a stage should still arrive at the stage it
 * belongs to, or the diagram grows a diagonal that crosses everything.
 */
function chartFlows(slide) {
  var rows = dataRows(slide && slide.body);
  var links = [];
  rows.forEach(function (r) {
    var from = String(r[0] || '').trim(), to = String(r[1] || '').trim();
    var v = chartNumber(r[2]);
    /* A header line is dropped by its third cell not being a number, which
       is the same test the other readings use. */
    if (!from || !to || v == null || v <= 0) return;
    links.push({ from: from, to: to, value: v });
  });
  if (!links.length) return { nodes: [], links: [], layers: 0 };

  var names = [];
  links.forEach(function (l) {
    if (names.indexOf(l.from) < 0) names.push(l.from);
    if (names.indexOf(l.to) < 0) names.push(l.to);
  });
  /** @type {{name:string, depth:number, in:number, out:number, total:number,
   *           x:number, y:number, h:number, inAt:number, outAt:number}[]} */
  var nodes = names.map(function (n) {
    return { name: n, depth: 0, in: 0, out: 0, total: 0, x: 0, y: 0, h: 0, inAt: 0, outAt: 0 };
  });
  var byName = {};
  nodes.forEach(function (n, i) { byName[n.name] = i; });

  /* Longest-path layering, relaxed until it settles. Bounded by the node
     count so a cycle — which a Sankey is not supposed to have, but a typo
     can produce — stops rather than spins. */
  for (var pass = 0; pass < nodes.length; pass++) {
    var moved = false;
    links.forEach(function (l) {
      var a = nodes[byName[l.from]], b = nodes[byName[l.to]];
      if (b.depth < a.depth + 1) { b.depth = a.depth + 1; moved = true; }
    });
    if (!moved) break;
  }
  links.forEach(function (l) {
    nodes[byName[l.from]].out += l.value;
    nodes[byName[l.to]].in += l.value;
  });
  /* A node is as thick as the larger of what enters and what leaves it.
     Taking only one side makes a source or a sink look like nothing. */
  nodes.forEach(function (n) { n.total = Math.max(n.in, n.out); });
  var layers = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0) + 1;
  return { nodes: nodes, links: links, layers: layers, index: byName };
}

/** Every number on the slide, pooled, for a histogram of one variable. */
function chartValues(slide) {
  var rows = dataRows(slide && slide.body);
  var out = [];
  rows.forEach(function (r) {
    r.forEach(function (c) { var n = chartNumber(c); if (n != null) out.push(n); });
  });
  return out.sort(function (a, b) { return a - b; });
}

/** Equal-width bins. Sturges, clamped: enough shape to read, few enough to see. */
function histogramBins(values, want) {
  if (!values.length) return [];
  var lo = values[0], hi = values[values.length - 1];
  if (hi === lo) return [{ from: lo, to: lo, count: values.length }];
  var n = want || Math.max(5, Math.min(14, Math.ceil(Math.log2(values.length) + 1)));
  var width = (hi - lo) / n, bins = [];
  for (var i = 0; i < n; i++) bins.push({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 });
  values.forEach(function (v) {
    var idx = Math.min(n - 1, Math.floor((v - lo) / width));
    bins[idx].count++;
  });
  return bins;
}

/**
 * One person on a people/structure slide: "Name | Role | Reports to | photo".
 *
 * Tab or pipe separated like every other pasted field here. Reports-to is a
 * name rather than an index, so reordering the lines cannot silently reassign
 * who works for whom — the commonest way a hand-maintained org chart goes
 * quietly wrong.
 */
function parsePerson(line) {
  var raw = String(line == null ? '' : line);
  var cells = (raw.indexOf('\t') !== -1 ? raw.split('\t') : raw.split('|'))
    .map(function (c) { return c.trim(); });
  return { name: cells[0] || '', role: cells[1] || '', boss: cells[2] || '', photo: safeMedia(cells[3] || '') };
}

/**
 * People arranged by who reports to whom.
 *
 * A name nobody reports to is a root, and there may be several — a slide
 * showing four directors side by side is a perfectly ordinary team slide,
 * and forcing a single head would invent a hierarchy the author did not
 * write. A manager who is named but not listed is treated as absent rather
 * than conjured, so a typo produces an extra root instead of a ghost box.
 *
 * Returns `{ roots, people, levels, warnings }`. Warnings are author-facing
 * strings for the inspector — duplicates, unknown bosses, self-reports,
 * and people trapped in a cycle that left them off every root.
 */
function orgTree(lines) {
  var warnings = [];
  var seen = {};
  var people = [];
  (lines || []).map(parsePerson).forEach(function (p) {
    if (!p.name) return;
    var key = p.name.toLowerCase();
    if (seen[key]) {
      warnings.push('Two people are both named \u201c' + p.name + '\u201d. Only the first is kept.');
      return;
    }
    seen[key] = 1;
    people.push(p);
  });

  var byName = {};
  people.forEach(function (p) { byName[p.name.toLowerCase()] = p; p.reports = []; });

  var roots = [];
  people.forEach(function (p) {
    if (!p.boss) { roots.push(p); return; }
    if (p.boss.toLowerCase() === p.name.toLowerCase()) {
      warnings.push('\u201c' + p.name + '\u201d reports to themselves \u2014 drawn as top-level.');
      roots.push(p);
      return;
    }
    var boss = byName[p.boss.toLowerCase()];
    if (!boss) {
      warnings.push('\u201c' + p.boss + '\u201d is not on this slide \u2014 \u201c' +
        p.name + '\u201d is drawn as top-level.');
      roots.push(p);
      return;
    }
    boss.reports.push(p);
  });

  /* Two people reporting to each other leaves nobody at the top, and a tree
     with no root draws nothing at all — a blank slide where the author put
     six names. A cycle means the hierarchy cannot be inferred, not that
     there are no people, so they are shown as a flat row instead. */
  if (!roots.length && people.length) {
    warnings.push('Everyone reports in a loop \u2014 drawn as a flat team with no connectors.');
    people.forEach(function (p) { p.reports = []; });
    roots = people.slice();
  }

  /* A cycle below a real root (A is CEO; B and C report to each other) leaves
     B and C off every branch. Lift those orphans to the top rather than
     silently omitting them from the slide. */
  var attached = {};
  function mark(p) {
    var k = p.name.toLowerCase();
    if (attached[k]) return;
    attached[k] = 1;
    (p.reports || []).forEach(mark);
  }
  roots.forEach(mark);
  var orphans = people.filter(function (p) { return !attached[p.name.toLowerCase()]; });
  if (orphans.length) {
    warnings.push(orphans.length === 1
      ? '\u201c' + orphans[0].name + '\u201d sits in a reporting loop and was not under any head \u2014 drawn as top-level.'
      : orphans.length + ' people sit in a reporting loop off the main tree \u2014 drawn as top-level.');
    orphans.forEach(function (p) {
      p.reports = [];
      roots.push(p);
    });
  }

  /* Depth is capped by the people count, so a cycle deeper in the chain
     cannot make the walk run forever. */
  function depth(p, visiting, d) {
    if (d > people.length) return d;
    var k = p.name.toLowerCase();
    if (visiting[k]) return d;
    visiting[k] = 1;
    var max = d;
    (p.reports || []).forEach(function (c) {
      max = Math.max(max, depth(c, visiting, d + 1));
    });
    delete visiting[k];
    return max;
  }
  var levels = roots.reduce(function (m, r) { return Math.max(m, depth(r, {}, 1)); }, 0);
  return { roots: roots, people: people, levels: levels, warnings: warnings };
}

/** Pair pits (keywords / italics / links) store "Lead\tdefinition". Also accepts "Lead: def" when pasted. */
function parseKeywordLine(line) {
  var s = String(line == null ? '' : line);
  var tab = s.indexOf('\t');
  if (tab !== -1) {
    return { term: s.slice(0, tab).trim(), def: s.slice(tab + 1).trim() };
  }
  var m = s.match(/^(.+?)\s*[—–:\-|]\s+(.+)$/);
  if (m) return { term: m[1].trim(), def: m[2].trim() };
  return { term: s.trim(), def: '' };
}

function formatKeywordLine(term, def) {
  return String(term || '').trim() + '\t' + String(def || '').trim();
}

/* Infographic layouts carry up to three things per line — a label, a value
   and a supporting note — so one pit can say "Retention · 92% · up from 81".
   Tabs are the canonical separator (the inspector writes them); pipes are
   accepted because that is what people type when they paste from a table.
   A two-part line is label + value; the note is optional. */
function parseInfoLine(line) {
  var s = String(line == null ? '' : line).trim();
  var parts = s.indexOf('\t') !== -1 ? s.split('\t') : s.split('|');
  parts = parts.map(function (p) { return p.trim(); });
  if (parts.length > 3) parts = [parts[0], parts[1], parts.slice(2).join(' · ')];
  return { label: parts[0] || '', value: parts[1] || '', note: parts[2] || '' };
}

function formatInfoLine(label, value, note) {
  return [label, value, note].map(function (p) { return String(p || '').trim(); }).join('\t').replace(/\t+$/, '');
}

/* The leading number in a value like "92%", "£1.2m" or "3 of 5" — what a ring
   or bar needs to draw. NaN when there is no number to find. */
function infoNumber(value) {
  var m = String(value || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

/** Only http(s) links — and same-origin paths for course files. Blocks javascript: and other schemes. */
function safeHref(url) {
  var u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^\/\//.test(u)) return 'https:' + u;
  /* Course packs (lessons/*.xlsx, *.ipynb) are served from the app origin.
     Allow a rooted path with no ".." so a links slide can hand students a
     download without baking in localhost or a Render hostname.

     The query string is allowed too, because the app's own deep link is
     "/?lesson=<key>" — that is how one deck points at another (a lab at the
     lecture behind it) without knowing whether it is being served from
     localhost or Render. */
  if (u.charAt(0) === '/' && u.indexOf('..') < 0 &&
      /^\/[A-Za-z0-9._~/-]*(\?[A-Za-z0-9._~/\-=&%+]*)?(#[A-Za-z0-9._~/-]*)?$/.test(u)) return u;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([\/?#][^\s]*)?$/i.test(u)) return 'https://' + u;
  return '';
}

/**
 * A media reference the app is willing to load: http(s), a relative path,
 * or a data URI.
 *
 * safeHref exists a few lines up and is not the same job — it upgrades a
 * bare domain to https and is for links a person clicks. This one has to
 * accept `clips/mitosis.mp4`, which is the normal way to reference a file
 * sitting next to the deck, while still refusing the schemes that turn a
 * src attribute into script execution.
 */
function safeMedia(url) {
  /* Tabs, newlines, carriage returns and NULs come out first, because the
     browser removes them before it parses the scheme and this has to see
     the same string the DOM will. Without this, "java<TAB>script:x" fails
     the scheme test below, is taken for a relative path, and is handed back
     as safe \u2014 a guard a single tab character walks past. Spaces are left
     alone on purpose: the browser percent-encodes those rather than
     dropping them, so they cannot rebuild a scheme. */
  var u = String(url == null ? '' : url).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!u) return '';
  if (/^data:/i.test(u)) return /^data:(image|video|audio)\//i.test(u) ? u : '';
  /* An allow-list, and the only control here \u2014 there is deliberately no
     separate "block javascript:" line, because one was there, was dead
     code, and would have read as the protection to anyone later widening
     this list. Anything with a scheme that is not fetchable media is
     refused; anything without a scheme is a path. */
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) {
    return /^(https?|file|blob):/i.test(u) ? u : '';
  }
  return u;                       // relative path, next to the deck
}

/* One declaration per layout, and every list in the app derives from it.

   There used to be five: SLIDE_TYPES for the label, DECK_TYPES for whether you
   could switch to it, BULLET_LAYOUTS and PIT_MAX for its pits, a hand-written
   array in the studio for the + Slide menu and another in the editor for the
   layout picker. Adding a layout meant five edits in four files, and the Key
   fact layout shipped missing from one of them — the picker offered it and
   clicking did nothing, because prepareLayout gates on DECK_TYPES.

     label / icon  what it is called and the glyph that stands for it
     deck          an author can switch a slide to it        -> DECK_TYPES
     pits          how many bullet pits it takes  -> BULLET_LAYOUTS and PIT_MAX
     group         where it sits in the layout picker
     starters      its entries in + Slide; seed is applied over makeSlide()

   No layout without `deck` is authorable: game, quiz, explain and results are
   built by the quiz engine, so they carry a label and nothing else. */
var SLIDE_TYPES = {
  journey:     { label: 'Journey / handover', icon: '↝', deck: true, pits: 6, group: 'explain',
                 starters: [{ title: 'Journey / handover', blurb: 'Connect milestones, course topics or stages of a project.' }] },
  orgchart:    { label: 'People & structure', icon: '⛬', deck: true, pits: 12, group: 'explain',
                 starters: [{ title: 'Team or org chart', blurb: 'Who reports to whom, with headshots. Also draws a flat team as one row.' }] },
  mindmap:     { label: 'Mind map', icon: '✣', deck: true, pits: 6, group: 'explain',
                 starters: [{ title: 'Mind map', blurb: 'One central idea, connected branches, revealed as you teach.' }] },
  introduction:{ label: 'Lecturer introduction', icon: '◎', deck: true, group: 'introduce',
                 starters: [{ title: 'Lecturer introduction', blurb: 'Headshot, name, job title and a short introduction.' }] },
  title:       { label: 'Title', icon: 'T', deck: true, group: 'introduce',
                 starters: [{ title: 'Opening title', blurb: 'Big title at the top. Subtitle underneath.',
                              seed: { title: 'Lesson title', subtitle: 'Your name' } }] },
  section:     { label: 'Section', icon: 'S', deck: true, group: 'introduce',
                 starters: [{ title: 'Section break', blurb: 'A clean pause between parts of the lesson.',
                              seed: { title: 'Next idea', subtitle: 'A short bridge into what follows.' } }] },
  /* One line, as big as it fits, in the middle of the slide.
     
     Title is a lesson's front door and Section is a divider — both carry an
     accent bar, an eyebrow and a subtitle, and both are sized for a sentence.
     Neither is the slide a teacher wants for a thought: six words, bold,
     centred, nothing else on it. That was being faked with a Section and the
     text-size control, which caps at the size the divider was designed for. */
  statement:   { label: 'Statement', icon: '❝', deck: true, group: 'introduce',
                 starters: [{ title: 'Statement', blurb: 'One line, bold and as big as it fits. An opening thought, a provocation, a rule to remember.',
                              seed: { body: 'Every chart is a choice', subtitle: '' } }] },
  /* An empty canvas. Every other type here is a shape the slide is poured
     into; this one is the absence of a shape, so an author can place items
     wherever the layouts taught the inserters to put them rather than filling
     in someone else's fields. It is also where a slide ends up once every
     block has been taken off it — deleting everything has to leave something,
     and a slide still claiming to be Bullets with no bullets on it is a shape
     pretending to be empty. */
  blank:       { label: 'Blank', icon: '▢', deck: true, group: 'introduce',
                 starters: [{ title: 'Blank canvas', blurb: 'Nothing on it. Add items and put them where you want them.' }] },
  content:     { label: 'Bullets', icon: '•', deck: true, pits: 8, group: 'explain',
                 starters: [
                   { title: 'Title + content', blurb: 'Classic teaching slide — heading, then bullet pits.',
                     seed: { title: 'Slide title', bullets: ['', '', ''] } },
                   { title: 'Steps', blurb: 'Title plus four numbered teaching steps.',
                     seed: { title: 'How it works', bullets: ['Step one', 'Step two', 'Step three', 'Step four'] } }
                 ] },
  keyfact:     { label: 'Key fact', icon: '!', deck: true, pits: 4, group: 'explain',
                 starters: [{ title: 'Key fact', blurb: 'One number or rule set large, with the detail beneath it.',
                              seed: { title: 'The thing they must leave with', subtitle: 'What the fact is',
                                      body: 'The fact, in a few words', bullets: ['', '', ''] } }] },
  keywords:    { label: 'Keywords', icon: 'K', deck: true, pits: 8, group: 'explain',
                 starters: [{ title: 'Keywords', blurb: 'Bold keyword + lowercase definition — vocabulary pits.',
                              seed: { title: 'Key vocabulary', bullets: ['\t', '\t', '\t'] } }] },
  italics:     { label: 'Phrase + explanation', icon: 'I', deck: true, pits: 8, group: 'explain',
                 starters: [{ title: 'Italics', blurb: 'Italic phrase + plain explanation — emphasis pits.',
                              seed: { title: 'Phrases to notice', bullets: ['\t', '\t', '\t'] } }] },
  links:       { label: 'Links', icon: '↗', deck: true, pits: 8, group: 'show',
                 starters: [{ title: 'Hyperlinks', blurb: 'Label + URL — clickable further reading.',
                              seed: { title: 'Further reading', bullets: ['\t', '\t', '\t'] } }] },
  split:       { label: 'Image + text', icon: '◫', deck: true, pits: 5, group: 'show',
                 starters: [{ title: 'Dual coding', blurb: 'Half text, half image — say it and show it.',
                              seed: { title: 'Say it. Show it.', bullets: ['', '', ''] } }] },
  cards:       { label: 'Cards', icon: '▦', deck: true, pits: 6, group: 'explain',
                 starters: [{ title: 'Three cards', blurb: 'Three idea pits side by side.',
                              seed: { title: 'Three ideas to hold onto.', bullets: ['', '', ''] } }] },
  table:       { label: 'Table', icon: '⊞', deck: true, group: 'explain',
                 starters: [{ title: 'Table', blurb: 'Rows and columns — for when the exact value matters.',
                              seed: { title: 'Side by side' } }] },
  code:        { label: 'Code', icon: '</>', deck: true, group: 'explain',
                 starters: [{ title: 'Python / code typing', blurb: 'Source that types itself on the wall — live-coding feel without sharing an IDE.',
                              seed: { title: 'Code that writes itself', language: 'python', typewrite: true } }] },
  beforeafter: { label: 'Before / after', icon: '◐', deck: true, group: 'show',
                 starters: [{ title: 'Before / after', blurb: 'Two states compared — the second lands on a press.' }] },
  experiment: { label: 'Predict and compare', icon: '◉', deck: true, group: 'show',
                 starters: [{ title: 'Predict and compare', blurb: 'Predict, reveal and compare editable visual states.', seed: {title:'Same data, different encodings',experiment:{preset:'polling'},body:'Candidate\tPoll A\tPoll B\tPoll C\n1\t17\t20\t23\n2\t18\t20\t22\n3\t20\t19\t20\n4\t22\t21\t18\n5\t23\t20\t17'} }] },
  /* Ten specimens, each its own row in Add slide. They were a Look control
     once, which put a choice of slide shape in the pane that promises not to
     change your content — and these demand an image and bring a state machine
     with them. A shape belongs where the other shapes are chosen. */
  motion:      { label: 'Animated explainer', icon: '◈', deck: true, group: 'show',
                 starters: [
                               { title: 'Mask reveal', blurb: 'An image uncovered a piece at a time, under your control.', seed: {title:'Mask reveal',motionScene:'mask',design:{motionLook:'editorial'}} },
                               { title: 'Draw-on diagram', blurb: 'Strokes that arrive in the order you explain them.', seed: {title:'Draw-on diagram',motionScene:'draw',design:{motionLook:'editorial'}} },
                               { title: 'Card to detail', blurb: 'A card the room picks, opening into its detail.', seed: {title:'Card to detail',motionScene:'cards',design:{motionLook:'editorial'}} },
                               { title: 'Animated annotations', blurb: 'Callouts that land on a picture one after another.', seed: {title:'Animated annotations',motionScene:'annotate',design:{motionLook:'editorial'}} },
                               { title: 'Scrubbable transformation', blurb: 'A slider the room drags between two shapes of the same data.', seed: {title:'Scrubbable transformation',motionScene:'scrub',design:{motionLook:'editorial'}} },
                               { title: 'Cause and effect', blurb: 'Change one thing, watch what follows from it.', seed: {title:'Cause and effect',motionScene:'cause',design:{motionLook:'editorial'}} },
                               { title: 'Branching scenario', blurb: 'A choice, and the consequence of having made it.', seed: {title:'Branching scenario',motionScene:'branch',design:{motionLook:'editorial'}} },
                               { title: 'Exploded diagram', blurb: 'Parts that separate to show how the whole fits together.', seed: {title:'Exploded diagram',motionScene:'explode',design:{motionLook:'editorial'}} },
                               { title: 'Focus lens', blurb: 'A moving lens that reads one region of a busy image.', seed: {title:'Focus lens',motionScene:'lens',design:{motionLook:'editorial'}} },
                               { title: 'Responsive story panels', blurb: 'Panels that expand as the story is told through them.', seed: {title:'Responsive story panels',motionScene:'panels',design:{motionLook:'editorial'}} }
                 ] },
  explore:     { label: 'Explore an image', icon: '◎', deck: true, group: 'show',
                 starters: [{ title: 'Explore an image', blurb: 'One picture the room examines, with details you reveal.' }] },
  simulation:  { label: 'What if? graph', icon: '↗', deck: true, group: 'show',
                 starters: [{ title: 'What if? graph', blurb: 'A slider bound to a model — move it and the curve answers.' }] },
  chart:       { label: 'Chart', icon: '▥', deck: true, group: 'explain',
                 starters: [{ title: 'Chart', blurb: 'Bar, line or pie drawn from a range you paste in.',
                              seed: { title: 'What the numbers show', chartKind: 'bar',
                                      body: 'Day|Students\nMon|12\nTue|19\nWed|15' } }] },
  image:       { label: 'Image', icon: '▣', deck: true, group: 'show',
                 starters: [{ title: 'Full-bleed image', blurb: 'One dominant image with a caption.',
                              seed: { title: 'Caption' } }] },
  gallery:     { label: 'Image stack', icon: '▤', deck: true, group: 'show',
                 starters: [{ title: 'Image stack', blurb: 'Several pictures, revealed one press at a time.',
                              seed: { title: 'One at a time' } }] },
  video:       { label: 'Video', icon: '▶', deck: true, group: 'show',
                 starters: [{ title: 'Video', blurb: 'A clip from YouTube, Vimeo or a file beside the deck.',
                              seed: { title: 'Watch this' } }] },
  quote:       { label: 'Quote', icon: '“', deck: true, group: 'introduce',
                 starters: [{ title: 'Quote', blurb: 'A line the room can sit with.',
                              seed: { body: 'Replace this with the line you want the room to sit with.',
                                      subtitle: 'Attribution' } }] },
  /* Infographic shapes. Each is still a bullet layout under the hood — a pit
     per element, revealed on Next — so they inherit reorder, bulk paste,
     spread-across-slides and the presenter excerpt for free. */
  stats:       { label: 'Stat tiles', icon: '％', deck: true, pits: 6, group: 'infographic',
                 starters: [{ title: 'Stat tiles', blurb: 'Three to six big numbers, each with a label and a note.',
                              seed: { title: 'The numbers that matter', bullets: ['Label\tValue\tNote', '\t\t', '\t\t'] } }] },
  compare:     { label: 'Versus', icon: '⇄', deck: true, pits: 6, group: 'infographic',
                 starters: [{ title: 'Versus', blurb: 'Two columns compared row by row — before/after, A/B, myth/fact.',
                              seed: { title: 'Side by side', subtitle: 'Option A | Option B', bullets: ['\t', '\t', '\t'] } }] },
  funnel:      { label: 'Funnel', icon: '▽', deck: true, pits: 6, group: 'infographic',
                 starters: [{ title: 'Funnel', blurb: 'Stages that narrow — applicants to offers, awareness to action.',
                              seed: { title: 'Where the numbers thin out', bullets: ['Stage\tValue\tNote', '\t\t', '\t\t', '\t\t'] } }] },
  timeline:    { label: 'Timeline', icon: '⟶', deck: true, pits: 8, group: 'infographic',
                 starters: [{ title: 'Timeline', blurb: 'Dated events along a track — a history, a plan, a term.',
                              seed: { title: 'How we got here', bullets: ['Date\tEvent\tDetail', '\t\t', '\t\t', '\t\t'] } }] },
  /* What you see, and what is under it.

     The other infographics all lay their parts out side by side, which says
     "these are comparable". A great many things a school teaches are the
     opposite shape: one small visible fact sitting on a mass that is bigger
     than it and deliberately out of view. The cost of a t-shirt. What a
     headline leaves out. What one question to a chatbot actually spends.

     Above the waterline goes the subtitle — the thing everyone already sees.
     Below it the pits widen as they deepen, so the shape argues before the
     words do, and they reveal one at a time so a class meets the mass at the
     speed the teacher sets rather than all at once. */
  iceberg:     { label: 'What lies beneath', icon: '◭', deck: true, pits: 6, group: 'infographic',
                 starters: [{ title: 'What lies beneath', blurb: 'One visible thing, and the mass underneath it — hidden costs, what a headline leaves out.',
                              seed: { title: 'The hidden costs', subtitle: 'What you see',
                                      bullets: ['What it costs\tValue\tNote', '\t\t', '\t\t'] } }] },
  /* A continuum with named ends, and things placed along it.
  
     A compare slide asks "which of these two", and a stat tile asks "how big".
     Neither asks the question a class argues about best: where does this sit
     between two extremes, and does everyone agree? The pits carry a position
     rather than a magnitude, so two items 4 points apart are 4 points apart on
     the line — which is the whole claim the slide is making. */
  spectrum:    { label: 'Spectrum', icon: '⇹', deck: true, pits: 6, group: 'infographic',
                 starters: [{ title: 'Spectrum', blurb: 'One end to the other, with things placed along it — never/always, cheap/costly, safe/risky.',
                              seed: { title: 'Where does each one sit?', subtitle: 'Never worth it | Always worth it',
                                      bullets: ['Something\t20\tWhy it sits there', '\t50\t', '\t85\t'] } }] },
  /* A claim, and what is actually behind it.
  
     The move every media-literacy lesson teaches and no layout supported: put
     the assertion up, then take it apart by provenance — who said it, when,
     what it is based on, and what it does not say. The last row is the one
     that matters and the one an author will skip, so the seed names it. */
  sourcecheck: { label: 'Claim & source', icon: '⌕', deck: true, pits: 6, group: 'infographic',
                 starters: [{ title: 'Claim & source', blurb: 'A claim, then who said it, when, on what basis, and what it leaves out.',
                              seed: { title: '"The claim, quoted as it was made"',
                                      bullets: ['Who\tThe source', 'When\tThe date', 'Basis\tWhat it rests on', 'Gap\tWhat it does not say'] } }] },
  /* One quantity, across three or four moments.
  
     A timeline puts events on a track and says when. This says how much, and
     prints the change between each pair — which is the number every reader is
     computing anyway and usually getting wrong. 500,000 to 8 million is not
     "a rise", it is sixteenfold, and the slide should say so. */
  shift:       { label: 'Then / now / next', icon: '⇗', deck: true, pits: 4, group: 'infographic',
                 starters: [{ title: 'Then / now / next', blurb: 'One quantity across three moments, with the change between them worked out.',
                              seed: { title: 'How fast this moved', bullets: ['Then\t100\tWhere it started', 'Now\t400\tWhere it is', 'Next\t\tWhere it goes'] } }] },
  /* Two images, one of them not real.
  
     beforeafter is one image changing; this is two competing, and the room has
     to commit to one before the tells appear. That commitment is the entire
     pedagogy — a class shown the answer first learns that deepfakes are
     detectable, and a class made to guess first learns that they are not. */
  spotfake:    { label: 'Spot the fake', icon: '◐', deck: true, pits: 6, group: 'show',
                 starters: [{ title: 'Spot the fake', blurb: 'Two images side by side. The room votes, then the tells are named one at a time.',
                              seed: { title: 'Which one is real?', subtitle: 'A | B', correct: 0,
                                      bullets: ['The first tell', 'The second tell', 'The third tell'] } }] },
  join:        { label: 'Join QR & PIN', icon: '⌗', deck: true },
  game:        { label: 'Game', icon: '◈' },
  quiz:        { label: 'Quiz', icon: '?' },
  explain:     { label: 'Explanation', icon: '💡' },
  results:     { label: 'Score', icon: '⚑' }
};

var LAYOUT_GROUPS = [
  ['introduce', 'Introduce'],
  ['explain', 'Explain & organise'],
  ['show', 'Show & explore'],
  ['infographic', 'Infographic']
];

var INFO_LAYOUTS = ['stats', 'compare', 'funnel', 'timeline', 'iceberg', 'spectrum', 'sourcecheck', 'shift'];

function layoutKeys(test) {
  return Object.keys(SLIDE_TYPES).filter(function (k) { return test(SLIDE_TYPES[k]); });
}

// Shared presentation semantics used by authoring, rendering and live context.
var DECK_TYPES = layoutKeys(function (t) { return t.deck; });
var BULLET_LAYOUTS = layoutKeys(function (t) { return t.pits > 0; });

function prepareLayout(slide, type) {
  if (DECK_TYPES.indexOf(type) < 0) return slide;
  slide.type = type;
  if (!Array.isArray(slide.bullets)) slide.bullets = [];
  if (BULLET_LAYOUTS.indexOf(type) >= 0 && !slide.bullets.length) slide.bullets = ['', '', ''];
  if (BULLET_LAYOUTS.indexOf(type) < 0 && slide.bullets.every(function(b){return !String(b).trim();})) slide.bullets = [];
  if (type === 'table' && !String(slide.body || '').trim()) slide.body = 'Term | What it means\nFirst | \nSecond | ';
  if (type === 'code') {
    if (slide.code == null) slide.code = String(slide.body || '');
    if (!String(slide.language || '').trim()) slide.language = 'python';
    if (!slide.codeReveal) slide.codeReveal = 'type';
    if (slide.typewrite == null) slide.typewrite = true;
    if (!Number.isFinite(Number(slide.typeSpeed)) || Number(slide.typeSpeed) <= 0) slide.typeSpeed = 55;
    if (!String(slide.code || '').trim()) {
      slide.code =
        'import pandas as pd\n\n' +
        'df = pd.read_csv("attendance.csv")\n' +
        'by_week = df["week"].value_counts().sort_index()\n' +
        'print(by_week.head())\n';
    }
  }
  return slide;
}

/**
 * Where a pasted picture should land, given the slide in front of you.
 *
 * Paste used to be refused outright on any layout that has no image field —
 * ⌘V on a bullets slide did nothing at all, with no message, because the
 * handler returned early. But "I have a picture for this slide" is a
 * perfectly ordinary thing to mean, and the app already knows how to reshape
 * a slide without losing its words: split is a bullet layout, so the text
 * survives the conversion intact.
 *
 * So this answers three questions at once: can this slide hold a picture,
 * which FIELD does it go in, and if it cannot, what would it have to become.
 *
 * @param {object|null|undefined} slide
 * @returns {{field: 'image'|'layer', become: string}|null} null when a picture
 *   makes no sense here — a chart, a table, a code listing or a game slide is
 *   not improved by dropping a screenshot into it.
 */
function pasteTarget(slide) {
  if (!slide || !slide.type) return null;
  var type = String(slide.type);

  /* A gallery is a stack of layers, not one image. Pasting used to set
     slide.image here, which the gallery layout never reads — so the toast
     said "pasted" and nothing appeared on the slide. */
  if (type === 'gallery') return { field: 'layer', become: 'gallery' };

  /* Layouts with an image field of their own: paste and be done. */
  if (['image', 'split', 'introduction', 'keyfact', 'quote'].indexOf(type) >= 0) {
    return { field: 'image', become: type };
  }

  /* Words on the slide and a bullet layout to carry them: Image + text keeps
     every one of them and puts the picture alongside. */
  var lines = (slide.bullets || []).filter(function (b) { return String(b).trim(); }).length;
  if (lines && BULLET_LAYOUTS.indexOf(type) >= 0) return { field: 'image', become: 'split' };

  /* A heading and nothing else wants the picture to be the slide, with the
     words over it, rather than half a slide of white space. */
  if (['title', 'section', 'content', 'cards', 'keywords', 'italics'].indexOf(type) >= 0) {
    return { field: 'image', become: 'image' };
  }

  return null;
}

function imagePlacement(slide) {
  var p=slide.design && slide.design.placement;
  return p==='top'||p==='bottom' ? p : slide.imageSide==='left'?'left':'right';
}

function setImagePlacement(slide, placement) {
  if(!['left','right','top','bottom'].includes(placement)) return;
  if(!slide.design || typeof slide.design!=='object') slide.design={};
  slide.design.placement=placement==='top'||placement==='bottom'?placement:'side';
  if(placement==='left'||placement==='right') slide.imageSide=placement;
}

function swapImagePlacement(slide) {
  setImagePlacement(slide,{left:'right',right:'left',top:'bottom',bottom:'top'}[imagePlacement(slide)]);
}

function slideSteps(slide) {
  if(slide.type==='table') {
    var rows=parseTable(slide.body), start=slide.tableHeader!==false && rows.length>1?1:0;
    return rows.slice(start).map(function(r){return r.join(' · ');});
  }
  /* Quote: one press per non-empty line. Explain: one press per paragraph. */
  if(slide.type==='quote') {
    return String(slide.body||'').split(/\n/).map(function(l){return l.trim();}).filter(Boolean);
  }
  if(slide.type==='explain') {
    return String(slide.body||'').split(/\n{2,}/).map(function(l){return l.trim();}).filter(Boolean);
  }
  /* A chart with one series is read category by category; with several, the
     series are the thing being compared, so those are the beats. */
  if(slide.type==='chart') {
    var cd=chartData(slide);
    if(!cd.series.length) return [];
    if(cd.series.length>1) return cd.series.map(function(x){return x.name;});
    return cd.categories.slice();
  }
  if(slide.type==='gallery') {
    return (slide.layers||[]).filter(function(l){return l && l.image;})
      .map(function(l,i){return String(l.caption||'').trim() || ('Image '+(i+1));});
  }
  if(slide.type==='code') {
    return String(slide.code||slide.body||'').split(/\n/).filter(function(l){return l.length;});
  }
  if(['journey','mindmap','content','cards','split','keywords','italics'].concat(INFO_LAYOUTS).indexOf(slide.type)<0) return [];
  return (slide.bullets||[]).filter(function(b){return String(b).trim();}).map(function(b){
    if(INFO_LAYOUTS.indexOf(slide.type)>=0){var q=parseInfoLine(b);return [q.label,q.value,q.note].filter(Boolean).join(' · ');}
    if(slide.type==='journey'||slide.type==='mindmap'||slide.type==='keywords'||slide.type==='italics'){var p=parseKeywordLine(b);return [p.term,p.def].filter(Boolean).join(' — ');}
    return String(b).replace(/^(\s{2,}|\t|- )+/, '').trim();
  });
}

function slideExcerpt(slide, revealed) {
  if(slide.type==='chart' && slide.exploration && slide.exploration.prediction) return slide.exploration.prompt;
  if(['beforeafter','explore','simulation'].includes(slide.type)) return slide.title || '';

  if(slide.type==='quiz') return slide.question || '';
  if(slide.type==='code') {
    var src=String(slide.code||slide.body||'');
    if(slide.typewrite!==false && Number.isFinite(revealed)) return src.slice(0, Math.max(0, revealed));
    return src;
  }
  var steps=slideSteps(slide);
  if(steps.length || ['content','cards','split','keywords','italics','table','quote','explain'].includes(slide.type)) {
    var n=slide.progressive===true && Number.isFinite(revealed)?Math.max(0,revealed):steps.length;
    var visible=steps.slice(0,n);
    if(slide.type==='table') {var rows=parseTable(slide.body);if(slide.tableHeader!==false&&rows.length>1)visible.unshift(rows[0].join(' · '));}
    return visible.join('\n');
  }
  if(slide.type==='links') return (slide.bullets||[]).map(function(b){var p=parseKeywordLine(b);return [p.term,p.def].filter(Boolean).join(' — ');}).join('\n');
  if(slide.type==='title'||slide.type==='section') return slide.subtitle || '';
  return ''; // Media stays on the projector; hidden fields are not learner content.
}

function questionTimeLimit(slide, teacherEntry) {
  return teacherEntry ? 0 : Math.max(0, Number(slide.timeLimit) || 0);
}

function correctAnswerLabel(slide) {
  if(slide.input==='text'||slide.input==='number') return String(slide.answer || '');
  return ('ABCDEF'[slide.correct] || '?')+' — '+((slide.options||[])[slide.correct] || '');
}


export { parsePerson, orgTree, chartUsesSeriesLegend, chartFlows, chartPoints, chartGroups, fiveNumber, chartValues, histogramBins, chartNumber, SLIDE_TYPES, LAYOUT_GROUPS, INFO_LAYOUTS, DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, chartData, parseKeywordLine, formatKeywordLine, parseInfoLine, formatInfoLine, infoNumber, safeHref, safeMedia, BULLET_LAYOUTS, prepareLayout, pasteTarget, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel };
