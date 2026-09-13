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

// Shared presentation semantics used by authoring, rendering and live context.
var DECK_TYPES = ['title', 'section', 'content', 'keywords', 'italics', 'links',
  'split', 'cards', 'table', 'image', 'video', 'quote', 'join', 'chart', 'gallery', 'beforeafter', 'explore', 'simulation'];

var BULLET_LAYOUTS = ['content','cards','split','keywords','italics','links'];

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
  if(['content','cards','split','keywords','italics'].indexOf(slide.type)<0) return [];
  return (slide.bullets||[]).filter(function(b){return String(b).trim();}).map(function(b){
    if(slide.type==='keywords'||slide.type==='italics'){var p=parseKeywordLine(b);return [p.term,p.def].filter(Boolean).join(' — ');}
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


export { DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, chartData, parseKeywordLine, formatKeywordLine, safeHref, safeMedia, BULLET_LAYOUTS, prepareLayout, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel };
