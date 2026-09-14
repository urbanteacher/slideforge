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
  if (rows.length < 2) return { series: [], xLabel: '', yLabel: '' };
  var head = rows[0], body = rows.slice(1);
  var names = head.slice(1).filter(function (h) { return String(h).trim(); });
  var series = names.map(function (name, i) {
    var pts = [];
    body.forEach(function (r) {
      var x = chartNumber(r[0]), y = chartNumber(r[i + 1]);
      /* A row missing either coordinate is not a point at zero — it is not
         a point. Plotting it would invent an observation. */
      if (x != null && y != null) pts.push({ x: x, y: y });
    });
    return { name: String(name).trim(), points: pts };
  });
  return { series: series, xLabel: String(head[0] || '').trim(), yLabel: names.length === 1 ? names[0] : '' };
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

/** Only http(s) links — blocks javascript: and other schemes. */
function safeHref(url) {
  var u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^\/\//.test(u)) return 'https:' + u;
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
  beforeafter: { label: 'Before / after', icon: '◐', deck: true, group: 'show',
                 starters: [{ title: 'Before / after', blurb: 'Two states compared — the second lands on a press.' }] },
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
  join:        { label: 'Join QR & PIN', icon: '⌗', deck: true },
  game:        { label: 'Game', icon: '◈' },
  quiz:        { label: 'Quiz', icon: '?' },
  explain:     { label: 'Explanation', icon: '💡' },
  results:     { label: 'Score', icon: '⚑' }
};

var LAYOUT_GROUPS = [
  ['introduce', 'Introduce'],
  ['explain', 'Explain & organise'],
  ['show', 'Show & explore']
];

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
  return slide;
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
  if(['journey','mindmap','content','cards','split','keywords','italics'].indexOf(slide.type)<0) return [];
  return (slide.bullets||[]).filter(function(b){return String(b).trim();}).map(function(b){
    if(slide.type==='journey'||slide.type==='mindmap'||slide.type==='keywords'||slide.type==='italics'){var p=parseKeywordLine(b);return [p.term,p.def].filter(Boolean).join(' — ');}
    return String(b).replace(/^(\s{2,}|\t|- )+/, '').trim();
  });
}

function slideExcerpt(slide, revealed) {
  if(slide.type==='chart' && slide.exploration && slide.exploration.prediction) return slide.exploration.prompt;
  if(['beforeafter','explore','simulation'].includes(slide.type)) return slide.title || '';

  if(slide.type==='quiz') return slide.question || '';
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


export { chartFlows, chartPoints, chartGroups, fiveNumber, chartValues, histogramBins, chartNumber, SLIDE_TYPES, LAYOUT_GROUPS, DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, chartData, parseKeywordLine, formatKeywordLine, safeHref, safeMedia, BULLET_LAYOUTS, prepareLayout, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel };
