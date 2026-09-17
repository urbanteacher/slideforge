/* Lab-only: apply Safe-style slot lattice to all 97 NUL layout-bank slides.
   Prototype — does not write Library decks or production CSS. */
const SF = window.SF;
/* The formatting toolbar reports through SF.toast, which the shell owns and this
   page does not load. Without a shim, "select the words first" throws instead. */
if (!SF.toast) SF.toast = (message) => {
  const el = document.querySelector('#demo-deck .demo-status');
  if (el) el.textContent = String(message);
};
if (!SF.slideJumpTarget) SF.slideJumpTarget = () => null;
const LESSON = 'layout-bank';
const baseline = SF.buildLesson(LESSON);
let deck = structuredClone(baseline);
let index = 0;
let revision = 0;
/** content = edit slots; artwork = freeform move of theme assets with lattice snap */
let flipMode = 'content';
/* What the last rearrange did, so measure() can keep it instead of overwriting. */
let lastMove = '';
let selectedArt = null;
/* The open layout picker, if any. */
let featurePicker = null;
/* Re-render depth while a stack is settling into its measured lines. */
let reflowPasses = 0;
deck.showSlideNumbers = true;

/* Recipes: [selector, label, col, cols, row, rows, tariff?]
   Selectors resolve inside .pad (NUL layouts rarely use .cp-body).
   rows = tariff = operating line budget. Paint checks need vs tariff; air inside
   the tariff is intentional (content top-aligns). Do not map h1…h6 → lines. */
/* Common heading default: 3 lines (text + air). Compact override is 2; 1 is never
   a default — it crushes titles. Body starts at row 5 for 12 rows. */
const HEADING_TARIFF = 3;
const HEADING_COMPACT = 2;
const BODY_DEFAULT_TARIFF = 4;
const H = (sel = 'h2', name = 'Heading', rows = HEADING_TARIFF) => [sel, name, 1, 12, 1, rows];
const BODY = (sel, name, row = 5, rows = 12) => [sel, name, 1, 12, row, rows];

/* Split column shares on the 12-col axis (both stacks stay 16 rows tall). */
const SPLIT_PRESETS = [
  { id: '50-50', label: '50/50', left: 6 },
  { id: '40-60', label: '40/60', left: 5 },
  { id: '58-42', label: '58/42', left: 7 },
  { id: '20-80', label: '20/80', left: 2 },
];

const recipes = {
  title: [
    /* Keep the campaign title composition intact: a quiet rule, display line,
       supporting line and date. The grid only gives their existing blocks
       shared anchors; it must not replace the hierarchy with lab typography. */
    ['.accent-bar', 'Accent', 1, 2, 4, 1],
    ['h1', 'Headline', 1, 12, 5, 4],
    ['.sub', 'Subtitle', 1, 10, 8, 2],
    ['.slide-date', 'Date', 1, 6, 11, 1],
  ],
  statement: [
    ['.statement', 'Statement', 1, 12, 3, 11],
    ['.statement-credit', 'Credit', 1, 10, 15, 1],
  ],
  content: [
    /* Dense bank slide #97 needs 14 list lines; compact heading keeps the stack at 16. */
    H('h2', 'Heading', HEADING_COMPACT),
    BODY('ul', 'Bullet list', 3, 14),
  ],
  section: [
    ['h1', 'Headline', 1, 12, 4, 6],
    ['.sub', 'Subtitle', 1, 10, 12, 3],
  ],
  introduction: [
    ['.lecturer-portrait', 'Portrait', 1, 4, 2, 14],
    ['.lecturer-copy', 'Copy', 6, 7, 3, 12],
  ],
  quote: [
    ['.q', 'Quote', 1, 12, 3, 10],
    ['.attrib', 'Attribution', 1, 10, 14, 2],
  ],
  journey: [
    H(),
    ['.journey-context', 'Context', 1, 12, 4, 1],
    BODY('.journey-route', 'Route', 6, 11),
  ],
  mindmap: [['.mindmap', 'Mind map', 1, 12, 1, 16]],
  keyfact: [
    H(),
    ['.keyfact', 'Key fact', 1, 12, 5, 6],
    ['.keyfact-notes', 'Notes', 1, 12, 12, 5],
  ],
  orgchart: [H(), BODY('.org-chart', 'Org chart')],
  stats: [
    H(),
    ['.info-context', 'Context', 1, 12, 4, 1],
    BODY('.stats-grid', 'Stat tiles', 6, 11),
  ],
  compare: [
    /* #94 still cannot fit four labelled steps in 14 rows — known content-budget fail. */
    H('h2', 'Heading', HEADING_COMPACT),
    BODY('.compare', 'Compare', 3, 14),
  ],
  funnel: [H(), BODY('.funnel, ol, ul', 'Funnel')],
  timeline: [H(), BODY('.timeline, ol, ul', 'Timeline')],
  cards: [H(), BODY('.cards-stack, .cards, .card-grid', 'Cards')],
  keywords: [H(), BODY('.kw-list, ul', 'Keywords')],
  italics: [H(), BODY('.italics, ul, .pad > div:not(.accent-bar)', 'Body')],
  table: [H(), BODY('.tbl, table', 'Table')],
  code: [H(), BODY('.code-frame', 'Code')],
  chart: [
    H(),
    ['.chart-wrap', 'Chart', 1, 12, 5, 10],
    ['.chart-key', 'Key', 1, 12, 15, 2],
  ],
  image: [
    ['.img', 'Image · BLEED', 1, 12, 1, 12],
    ['.cap', 'Caption', 1, 12, 13, 4],
  ],
  split: [
    /* Copy stays on the 16-line body. Media · BLEED paints full-slide height. */
    ['.split-copy', 'Copy', 1, 7, 1, 16],
    ['.split-media', 'Media · BLEED', 8, 5, 1, 16],
  ],
  gallery: [H(), BODY('.fig-stack', 'Gallery')],
  beforeafter: [H(), BODY('.beforeafter, .ba, .pad > div:not(:has(h2))', 'Before / after')],
  explore: [H(), BODY('.explore, .pad > *:not(h2)', 'Explore')],
  simulation: [H(), BODY('.simulation, .pad > *:not(h2)', 'Simulation')],
  links: [H(), BODY('.links, ul, .pad > *:not(h2)', 'Links')],
  video: [
    ['.vid, video', 'Video · BLEED', 1, 12, 1, 12],
    ['.cap', 'Caption', 1, 12, 13, 4],
  ],
  join: [['.join-stage', 'Join stage', 1, 12, 1, 16]],
  game: [['.gamecard', 'Game card', 1, 12, 1, 16]],
};

const ROWS = 16;
/* One line of the lattice. */
const ROW_H = 36;
/* How many lines a block needs. Sub-pixel is not a line: the same 1px tolerance
   the app's own fit check uses, so a block landing exactly on a boundary is not
   rounded up into a line it does not occupy. */
function linesFor(px) {
  return Math.max(1, Math.ceil((px - (SF.FIT_TOLERANCE ?? 1)) / ROW_H));
}
/* What a block in a rendered slot needs, or null when it does not spend lines.
   Out of flow is out of the count: the caption on a full-bleed picture is an
   absolutely positioned scrim drawn over the picture on purpose. */
function linesNeeded(box) {
  const node = box.firstElementChild;
  if (!node) return null;
  if (/^(absolute|fixed)$/.test(getComputedStyle(node).position)) return null;
  return linesFor(node.scrollHeight);
}

/* Narrowest column span that keeps a block's own labels readable. A vector block
   cannot overflow — it scales to its box — so too-narrow is its only failure
   mode, and it has to be reported like a bad fit. */
const MIN_COLS = [
  [/chart/i, 8],
  [/table/i, 8],
  [/compare/i, 8],
  [/mind map|org chart|funnel|timeline/i, 8],
  [/gallery|stat tiles|voting|numbered rules|risk/i, 6],
];
function minCols(name) {
  for (const [re, n] of MIN_COLS) if (re.test(name || '')) return n;
  return 1;
}

/* Two slots belong to the same stack when their column ranges intersect. Measured
   across the whole bank (tools/stack-audit.mjs), every layout is such a stack:
   30 of 30 types, only introduction and split side by side. */
function columnGroup(recipe, idx) {
  const lo = recipe[idx][2];
  const hi = lo + recipe[idx][3] - 1;
  return recipe
    .map((r, i) => ({ i, col: r[2], cols: r[3], row: r[4], rows: r[5], name: r[1] }))
    .filter((s) => s.col <= hi && lo <= s.col + s.cols - 1);
}

/* Re-stack a column group so a dropped item pushes the others aside instead of
   landing on top of them. Each gap travels with the item below it, so the sum of
   spans and gaps is unchanged and a reorder cannot move the row budget. */
function magneticMove(recipe, idx, dropRow) {
  const group = columnGroup(recipe, idx).sort((a, b) => a.row - b.row);
  if (group.length < 2) return null;
  let cursor = 1;
  for (const s of group) {
    s.gap = Math.max(0, s.row - cursor);
    cursor = s.row + s.rows;
  }
  const self = group.find((s) => s.i === idx);
  const others = group.filter((s) => s.i !== idx);
  /* A stack has no "over" — only before and after — so the target is a gap, and
     for n items there are n+1 of them. One midline comparison picks it. */
  let at = 0;
  for (const s of others) if (dropRow > s.row + s.rows / 2) at++;
  const order = [...others];
  order.splice(at, 0, self);
  let row = 1;
  for (const s of order) {
    row += s.gap;
    recipe[s.i][4] = row;
    row += s.rows;
  }
  return { order, used: row - 1, over: Math.max(0, row - 1 - ROWS), at, moved: self.name };
}

/* The row budget of every column group on the slide, for the readout. */
function budgets(recipe) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < recipe.length; i++) {
    if (seen.has(i)) continue;
    const group = columnGroup(recipe, i).sort((a, b) => a.row - b.row);
    group.forEach((s) => seen.add(s.i));
    let cursor = 1;
    const parts = [];
    for (const s of group) {
      const gap = Math.max(0, s.row - cursor);
      parts.push(`${gap ? gap + '+' : ''}${s.rows}`);
      cursor = s.row + s.rows;
    }
    out.push({ cols: group[0].cols, col: group[0].col, items: group, parts, used: cursor - 1 });
  }
  return out;
}

/* Tariff model: the authored span (spec[6], else spec[5]) is the line budget.
   Paint may need more lines than the tariff — that bleeds and is reported; we do
   not auto-grow the tariff from scrollHeight (air under a heading is composition).
   Changing a tariff is an explicit user action via setSlotTariff. */
function ensureTariff(spec) {
  if (spec[6] == null) spec[6] = spec[5];
  return spec[6];
}

function reflowRows(_root, slide) {
  const recipe = ensureMockRecipe(slide);
  for (const spec of recipe) ensureTariff(spec);
  /* No auto-grow from paint. */
  return false;
}

/* Change one slot's line tariff and restack its column group (siblings push).
   Gaps travel with the item below them, same as magneticMove. Over-16 is allowed. */
function setSlotTariff(recipe, idx, newRows) {
  const rows = Math.max(1, Math.min(ROWS, Math.round(newRows)));
  const group = columnGroup(recipe, idx).sort((a, b) => a.row - b.row);
  let cursor = 1;
  for (const s of group) {
    s.gap = Math.max(0, s.row - cursor);
    cursor = s.row + s.rows;
  }
  recipe[idx][5] = rows;
  recipe[idx][6] = rows;
  let row = 1;
  for (const s of group) {
    row += s.gap;
    recipe[s.i][4] = row;
    row += recipe[s.i][5];
  }
  return { rows, used: row - 1, over: Math.max(0, row - 1 - ROWS), name: recipe[idx][1] };
}

/* Stretch or condense column span. Origin stays put when it still fits; otherwise
   it clamps so the block stays on the 12-col grid (e.g. 12c → 6c left-aligned
   leaves columns 7–12 free for later content). */
function setSlotCols(recipe, idx, newCols) {
  const cols = Math.max(1, Math.min(12, Math.round(newCols)));
  const spec = recipe[idx];
  const prev = spec[3];
  spec[3] = cols;
  const maxStart = 12 - cols + 1;
  /* Condensing from full width: pin to column 1 so the right half stays free. */
  if (prev >= 12 && cols < 12) spec[2] = 1;
  else spec[2] = Math.max(1, Math.min(maxStart, spec[2]));
  return { cols, col: spec[2], name: spec[1], end: spec[2] + cols - 1 };
}

function applySplitShare(slide, leftCols) {
  const left = Math.max(1, Math.min(11, leftCols));
  const right = 12 - left;
  const recipe = ensureMockRecipe(slide);
  const copy = recipe.find((r) => /copy/i.test(r[1]));
  const media = recipe.find((r) => /media/i.test(r[1]));
  if (!copy || !media) return null;
  const copyLeft = copy[2] <= media[2];
  const a = copyLeft ? copy : media;
  const b = copyLeft ? media : copy;
  a[2] = 1;
  a[3] = left;
  a[4] = 1;
  a[5] = 16;
  a[6] = 16;
  b[2] = left + 1;
  b[3] = right;
  b[4] = 1;
  b[5] = 16;
  b[6] = 16;
  slide.mockSplitShare = left;
  return { left, right };
}

/* Insert a block with role default tariff. Unsplit body → full 12 columns.
   On split slides, append into the copy stack using that side's column share. */
function addFullRowContent(slide, role = 'body') {
  const recipe = ensureMockRecipe(slide);
  if (!slide.mockExtras) slide.mockExtras = [];
  const id = `extra-${Date.now().toString(36)}`;
  const isHeading = role === 'heading';
  const tariff = isHeading ? HEADING_TARIFF : BODY_DEFAULT_TARIFF;
  const name = isHeading ? 'Heading' : 'Body';
  const text = isHeading ? 'New heading' : 'New content';
  slide.mockExtras.push({ id, role, text, name });
  const sel = `[data-mock-extra="${id}"]`;

  let col = 1;
  let cols = 12;
  const copy = recipe.find((r) => /copy/i.test(r[1]));
  const media = recipe.find((r) => /media/i.test(r[1]));
  const splitSide = slide.type === 'split' && copy && media;
  if (splitSide) {
    /* Prefer the copy column for new text; keep media's full-height bleed alone. */
    col = copy[2];
    cols = copy[3];
  }

  const groupIdxs = recipe
    .map((r, i) => ({ i, col: r[2], cols: r[3], row: r[4], rows: r[5] }))
    .filter((s) => s.col === col && s.cols === cols)
    .sort((a, b) => a.row - b.row);

  let cursor = 1;
  const gaps = [];
  for (const s of groupIdxs) {
    gaps.push(Math.max(0, s.row - cursor));
    cursor = s.row + s.rows;
  }
  /* Append after the stack with a 1-line gap when the group already has items. */
  const leadGap = groupIdxs.length ? 1 : 0;
  const spec = [sel, name, col, cols, cursor + leadGap, tariff, tariff];
  recipe.push(spec);

  /* Restack the column group so gaps + spans stay consistent. */
  const idx = recipe.length - 1;
  const group = columnGroup(recipe, idx).sort((a, b) => a.row - b.row);
  let row = 1;
  let prevEnd = 1;
  for (let n = 0; n < group.length; n++) {
    const s = group[n];
    const gap = n < gaps.length ? gaps[n] : n === group.length - 1 ? leadGap : 0;
    row = prevEnd + gap;
    recipe[s.i][4] = row;
    prevEnd = row + recipe[s.i][5];
  }

  slide.mockRecipe = recipe;
  const used = prevEnd - 1;
  return { id, tariff, name, cols, over: Math.max(0, used - ROWS) };
}

const bleedTypes = new Set(['image', 'split', 'video']);
/** Safe lattice pitch on the 1280×720 slide (body origin 52,88). */
const SNAP_X = 101; /* 65 col + 36 gutter */
const SNAP_Y = 36;
const BODY_LEFT = 52;
const BODY_TOP = 88;
const SLIDE_W = 1280;
const SLIDE_H = 720;
const COL_W = 65;
const COL_GAP = 36;
const COL_STEP = COL_W + COL_GAP;

function isBleedName(name) {
  /* Only media panes override the body band. Copy stays on the 16-line lattice. */
  return /BLEED/i.test(name || '') && /(Media|Image|Video)/i.test(name || '');
}

/* Map lattice columns to slide X, flushing to the slide edge when the recipe
   touches the body edge — so split media / full-bleed images override the
   body band and reach header + footer like production. */
function bleedFrame(col, cols) {
  let left = BODY_LEFT + (col - 1) * COL_STEP;
  let width = cols * COL_W + Math.max(0, cols - 1) * COL_GAP;
  if (col <= 1) {
    width += left;
    left = 0;
  }
  if (col + cols - 1 >= 12) width = SLIDE_W - left;
  return { left, top: 0, width, height: SLIDE_H };
}

function applyBleedSlots(root, slide, body) {
  const recipe = ensureMockRecipe(slide);
  for (const box of [...body.querySelectorAll('.safe-slot')]) {
    const idx = Number(box.dataset.recipeIndex);
    const spec = recipe[idx];
    if (!spec || !isBleedName(spec[1])) continue;
    const [, name, col, cols] = spec;
    const frame = bleedFrame(col, cols);
    box.classList.add('safe-slot-bleed');
    box.dataset.bleed = '1';
    box.dataset.label = `${name} · full-slide × ${cols}c`;
    box.style.gridArea = '';
    box.style.position = 'absolute';
    box.style.left = `${frame.left}px`;
    box.style.top = `${frame.top}px`;
    box.style.width = `${frame.width}px`;
    box.style.height = `${frame.height}px`;
    box.style.zIndex = '1';
    root.append(box);
  }
}

const section = document.createElement('section');
section.id = 'demo-deck';
section.innerHTML = `
  <h2>Engine 3 · layout bank</h2>
  <p class="lab-role is-current">A single canvas for 97 layouts. Edit content, arrange its slots, or switch to artwork—without leaving the current slide.</p>
  <p>
    The canvas keeps campaign typography intact while it measures content inside a 16×12 lattice. Use the tools below to change a current slide; Audit checks the full bank separately.
  </p>
  <div class="demo-toolbar" aria-label="Engine 3 controls">
    <div class="demo-tool-group" aria-label="Slide navigation">
      <span class="demo-tool-label">Slide</span>
      <button type="button" data-nav="-1" aria-label="Previous slide">←</button>
      <select aria-label="Demo slide" id="demo-slide"></select>
      <button type="button" data-nav="1" aria-label="Next slide">→</button>
      <label class="demo-filter-label">Type
        <select id="demo-filter" aria-label="Filter by type"><option value="">All types</option></select>
      </label>
    </div>
    <div class="demo-tool-group" aria-label="Canvas mode">
      <span class="demo-tool-label">Edit</span>
      <button type="button" id="demo-content-mode" aria-pressed="true">Flip · content</button>
      <button type="button" id="demo-flip" aria-pressed="false">Flip · artwork</button>
      <label class="demo-toggle"><input type="checkbox" id="demo-original"> Original</label>
    </div>
    <div class="demo-tool-group" aria-label="Canvas tools">
      <span class="demo-tool-label">Tools</span>
      <label class="demo-toggle"><input type="checkbox" id="demo-grid" checked> Slots</label>
      <button type="button" id="demo-layout-picker">Change layout</button>
      <button type="button" id="demo-add-heading" title="Add a full-width heading (3-line tariff)">+ Heading</button>
      <button type="button" id="demo-add-body" title="Add a full-width body block (4-line tariff)">+ Body</button>
      <span id="demo-split-share" hidden class="demo-split-inline" aria-label="Split column share">
        ${SPLIT_PRESETS.map((p) => `<button type="button" data-split-left="${p.left}" title="Split ${p.label}">${p.label}</button>`).join('')}
      </span>
    </div>
    <div class="demo-tool-group demo-chrome-toolgroup" id="demo-chrome-map" hidden aria-label="Header and footer controller" title="Bands fixed · click a position, then click another to move or swap its furniture">
      <span class="demo-tool-label">Chrome</span>
      <div class="demo-chrome-inline" data-band-cells="header" aria-label="Header positions"></div>
      <span class="demo-chrome-inline-sep" aria-hidden="true">/</span>
      <div class="demo-chrome-inline" data-band-cells="footer" aria-label="Footer positions"></div>
    </div>
    <div class="demo-tool-group demo-tool-group-actions" aria-label="Utilities">
      <button type="button" id="demo-audit">Audit 97</button>
      <button type="button" id="demo-reset">Reset</button>
      <button type="button" id="demo-download">Download</button>
    </div>
  </div>
  <div class="demo-workspace">
    <div class="safe-stage demo-stage"></div>
    <aside class="demo-stack" id="demo-stack" hidden aria-label="Artwork stack">
      <header>
        <strong>Stack</strong>
        <span class="demo-stack-hint">back → front</span>
      </header>
      <p class="demo-stack-face">Flip · artwork — content is ghosted. Toggle plane / hide / lock; drag on the canvas to snap.</p>
      <ol class="demo-stack-list"></ol>
      <div class="demo-stack-actions">
        <button type="button" id="demo-art-back" title="Send toward back">↓ Back</button>
        <button type="button" id="demo-art-front" title="Bring toward front">↑ Front</button>
        <button type="button" id="demo-art-plane" title="Toggle back/front plane">Plane</button>
        <button type="button" id="demo-art-hide" title="Hide or show">Hide</button>
        <button type="button" id="demo-art-lock" title="Lock or unlock">Lock</button>
      </div>
    </aside>
    <aside class="demo-feature-panel" id="demo-feature-panel" hidden aria-label="Swap this slide’s feature"></aside>
  </div>
  <p class="demo-canvas-hint"><strong>Content:</strong> edit text (double-click), ⠿ to rearrange, ⬚ for lines/width in the edit box. <strong>Artwork:</strong> move only the visual assets.</p>
  <p class="safe-status demo-status" role="status"></p>
  <p class="demo-chrome-measure" aria-live="polite"></p>
  <div class="safe-recipe demo-recipe"></div>
  <div class="demo-budget" aria-label="Row budget"></div>
  <pre class="demo-audit-out" hidden></pre>
  <p class="safe-scope">
    Engine 3 retains the campaign hierarchy and only measures/repositions content into shared containers. Original is a comparison view; it is never the editing default.
    Production northeastern CSS is not modified. BLEED slots (image, split, video) paint full-slide (header→footer); the body lattice keeps column share.
  </p>
`;

const host = document.querySelector('.lab-contract');
host.after(section);

const $ = (s) => section.querySelector(s);
const stage = $('.demo-stage');
const status = $('.demo-status');
const chromeMeasureEl = $('.demo-chrome-measure');
const chromeMapEl = $('#demo-chrome-map');
const recipeEl = $('.demo-recipe');
const budgetEl = $('.demo-budget');
const auditOut = $('.demo-audit-out');
const stackEl = $('#demo-stack');
const stackList = $('.demo-stack-list');

/** Default plane: theme decoration behind content; chrome mark in front. */
function defaultPlane(key) {
  if (key === 'slide-logo' || key === 'nu-eyebrow') return 'front';
  return 'back';
}

function artLabel(key) {
  return (
    {
      'nu-skyline': 'Skyline',
      'nu-n': 'Monogram N',
      'nu-eyebrow': 'Eyebrow',
      'slide-logo': 'Corner mark',
      'cp-art': 'Poster art',
    }[key] || key
  );
}

function ensureArt(slide, key, i = 0) {
  if (!slide.mockArt) slide.mockArt = {};
  const cur = slide.mockArt[key];
  if (cur && typeof cur === 'object') {
    if (!cur.plane) cur.plane = defaultPlane(key);
    if (cur.order == null) cur.order = i;
    if (cur.hidden == null) cur.hidden = false;
    if (cur.locked == null) cur.locked = false;
    return cur;
  }
  slide.mockArt[key] = {
    plane: defaultPlane(key),
    order: i,
    hidden: false,
    locked: false,
  };
  return slide.mockArt[key];
}

function sortedArtKeys(slide, targets) {
  return targets
    .map((n, i) => {
      const key = artKey(n);
      ensureArt(slide, key, i);
      return key;
    })
    .sort((a, b) => {
      const A = slide.mockArt[a];
      const B = slide.mockArt[b];
      const pa = A.plane === 'front' ? 1 : 0;
      const pb = B.plane === 'front' ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return (A.order ?? 0) - (B.order ?? 0);
    });
}

function typeOf(slide) {
  return slide.type;
}

function recipeFor(slide) {
  if (Array.isArray(slide.mockRecipe) && slide.mockRecipe.length) {
    return slide.mockRecipe.map((r) => r.slice());
  }
  const base = recipes[slide.type] || [
    H('h1,h2', 'Heading'),
    BODY('.pad > *:not(h1):not(h2):not(.accent-bar):not(.slide-logo):not(.pagenum):not(.track)', 'Body'),
  ];
  return base.map((r) => r.slice());
}

function ensureMockRecipe(slide) {
  if (!Array.isArray(slide.mockRecipe) || !slide.mockRecipe.length) {
    slide.mockRecipe = recipeFor(slide);
  }
  return slide.mockRecipe;
}

/** Map a pointer on .safe-body to the nearest lattice origin (magnet to lines). */
function latticeAt(body, clientX, clientY) {
  const br = body.getBoundingClientRect();
  const x = ((clientX - br.left) / br.width) * 1176;
  const y = ((clientY - br.top) / br.height) * 576;
  /* round → closest column/row start; floor was "cell under cursor" and felt sticky. */
  const col = Math.max(1, Math.min(12, Math.round(x / SNAP_X) + 1));
  const row = Math.max(1, Math.min(16, Math.round(y / SNAP_Y) + 1));
  return { col, row };
}

function clampOrigin(col, row, cols, rows) {
  return {
    col: Math.max(1, Math.min(12 - cols + 1, col)),
    row: Math.max(1, Math.min(16 - rows + 1, row)),
  };
}

function swapSlotGeometry(recipe, i, j) {
  if (i === j || !recipe[i] || !recipe[j]) return null;
  const a = recipe[i];
  const b = recipe[j];
  const aPos = [a[2], a[3], a[4], a[5]];
  a[2] = b[2];
  a[3] = b[3];
  a[4] = b[4];
  a[5] = b[5];
  b[2] = aPos[0];
  b[3] = aPos[1];
  b[4] = aPos[2];
  b[5] = aPos[3];
  return { a: a[1], b: b[1] };
}

/* Which features can this slide become, and what carries over.
   Reuses the app's own layout machinery rather than inventing a parallel list:
   SF.SLIDE_TYPES declares every layout, SF.DECK_TYPES is the authorable subset,
   SF.BULLET_LAYOUTS is the ones that take bullet pits, and SF.prepareLayout does
   the conversion — the same call the editor's layout picker makes. */
function featureOptions(slide) {
  const groups = [];
  const points = (slide.bullets || []).filter((b) => String(b).trim()).length;
  /* Grouped by what each layout says about itself, matching js/editor.js. A type
     with no group is authorable but not choosable as a shape — `join` is inserted
     by the live flow — so an ungrouped type is excluded on purpose, not lost. */
  const placed = new Set();
  const describe = (t) => {
    const spec = SF.SLIDE_TYPES[t];
    const takesPoints = SF.BULLET_LAYOUTS.includes(t);
    const carries = [];
    if (slide.title) carries.push('heading');
    if (slide.subtitle) carries.push('subtitle');
    /* prepareLayout never deletes a field it cannot render, so a swap is
       reversible: the points are still in the data, just not on the slide. */
    if (points) carries.push(takesPoints ? `${points} points` : `${points} points (kept, not shown)`);
    return { type: t, label: spec.label, icon: spec.icon, takesPoints, carries };
  };
  for (const [key, label] of SF.LAYOUT_GROUPS) {
    const items = SF.DECK_TYPES.filter((t) => SF.SLIDE_TYPES[t].group === key);
    items.forEach((t) => placed.add(t));
    if (items.length) groups.push({ key, label, items: items.map(describe) });
  }
  return groups;
}

function closeFeaturePicker() {
  const panel = $('#demo-feature-panel');
  if (panel) {
    panel.replaceChildren();
    panel.hidden = true;
  }
  featurePicker = null;
  section.classList.remove('demo-swap-picking');
  const root = stage.firstElementChild;
  const restoreChrome =
    !!root &&
    !$('#demo-original').checked &&
    flipMode !== 'artwork';
  if (restoreChrome) paintDemoChromeMap(deck.slides[index], root, true);
}

function openFeaturePicker(button, slide, slotName) {
  closeFeaturePicker();
  /* Contained in the workspace column beside the canvas, not floating over it.
     A popover here anchored against the page rather than the section — #demo-deck
     is not positioned — so it landed on top of the playground, half of it cut off. */
  const pop = $('#demo-feature-panel');
  /* The chrome controller lives in the toolbar now, not the workspace column,
     so it no longer competes with this picker for space and stays put. */
  pop.hidden = false;
  pop.replaceChildren();
  const points = (slide.bullets || []).filter((b) => String(b).trim()).length;
  pop.innerHTML =
    `<header><strong>Swap feature</strong>` +
    `<span>${slotName ? slotName + ' \u00b7 ' : ''}now: ${SF.SLIDE_TYPES[slide.type]?.label || slide.type}</span></header>` +
    `<p class="demo-feature-note">Changes the whole slide, not just this box. ` +
    (points
      ? `Your ${points} point${points === 1 ? '' : 's'} carry into any layout that takes points; elsewhere they stay in the data, so the swap is reversible.`
      : `Nothing is deleted \u2014 fields a layout cannot show are kept, so you can swap back.`) +
    `</p>`;
  for (const group of featureOptions(slide)) {
    const box = document.createElement('div');
    box.className = 'demo-feature-group';
    box.innerHTML = `<h4>${group.label}</h4>`;
    const list = document.createElement('div');
    list.className = 'demo-feature-list';
    for (const item of group.items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'demo-feature-option' + (item.type === slide.type ? ' is-current' : '');
      btn.dataset.feature = item.type;
      /* Independent of the fit measurement: whether this shape takes bullet pits
         at all. A shape can keep your points and still be too tight for them. */
      btn.dataset.keepsPoints = item.takesPoints ? '1' : '0';
      btn.disabled = item.type === slide.type;
      btn.title = item.carries.length ? `Carries over: ${item.carries.join(', ')}` : 'Starts this feature fresh';
      btn.innerHTML =
        `<span class="demo-feature-icon" aria-hidden="true">${item.icon || '\u25a6'}</span>` +
        `<span class="demo-feature-label">${item.label}</span>` +
        `<span class="demo-feature-fit" aria-live="polite">${item.type === slide.type ? 'current' : '\u2026'}</span>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if ((btn.dataset.fit === 'no' || btn.dataset.keepsHeading === '0') && !btn.dataset.confirmed) {
          btn.dataset.confirmed = '1';
          btn.querySelector('.demo-feature-fit').textContent = 'swap anyway?';
          return;
        }
        applyFeature(slide, item.type, slotName, btn.dataset.fit);
      });
      list.append(btn);
    }
    box.append(list);
    pop.append(box);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'demo-feature-close';
  close.textContent = 'Close';
  close.addEventListener('click', (e) => {
    e.preventDefault();
    closeFeaturePicker();
  });
  pop.append(close);
  featurePicker = pop;
  section.classList.add('demo-swap-picking');
  pop.querySelector('.demo-feature-option:not([disabled])')?.focus();
  annotateFits(pop, slide);
}

/* Measure every offered shape against this slide's actual words, in order, and
   label each one. Sequential on purpose: each trial mounts a real render, and
   running 33 at once would fight for layout. The picker stays usable throughout. */
async function annotateFits(pop, slide) {
  const buttons = [...pop.querySelectorAll('.demo-feature-option')];
  const points = (slide.bullets || []).filter((b) => String(b).trim()).length;
  for (const btn of buttons) {
    if (pop.hidden || featurePicker !== pop) return;
    const type = btn.dataset.feature;
    const tag = btn.querySelector('.demo-feature-fit');
    if (type === slide.type) continue;
    let verdict;
    try {
      verdict = await trialFit(slide, type);
    } catch (e) {
      tag.textContent = 'untested';
      continue;
    }
    if (pop.hidden || featurePicker !== pop) return;
    btn.dataset.fit = verdict.fits ? 'yes' : 'no';
    btn.classList.toggle('is-tight', !verdict.fits);
    btn.dataset.keepsHeading = verdict.keepsHeading ? '1' : '0';
    /* Most specific reason first: a shape that places nothing is not usefully
       described as "drops the heading", even though it does. */
    if (!verdict.placed) {
      tag.textContent = 'needs a picture';
      btn.title = `A ${type} slide needs a picture or video, and this one has none.`;
    } else if (!verdict.keepsHeading) {
      btn.classList.add('is-lossy');
      tag.textContent = verdict.fits ? 'drops the heading' : 'drops the heading · tight';
      btn.title = `This shape shows no heading, so the title comes off the slide. It stays in the data, so you can swap back.${verdict.fits ? '' : ' It would also overflow: ' + verdict.failed.join(', ') + '.'}`;
    } else if (verdict.fits) {
      tag.textContent = points && SF.BULLET_LAYOUTS.includes(type) ? 'should fit · keeps points' : 'should fit';
    } else {
      tag.textContent = 'too tight';
      btn.title = `Would overflow: ${verdict.failed.join(', ')}. Click again to swap anyway.`;
    }
  }
}

function applyFeature(slide, type, slotName, predicted) {
  const was = SF.SLIDE_TYPES[slide.type]?.label || slide.type;
  const pointsBefore = (slide.bullets || []).filter((b) => String(b).trim()).length;
  closeFeaturePicker();
  SF.prepareLayout(slide, type);
  /* Positions belonged to the old feature. Drop them so the new one takes its
     own recipe instead of inheriting spans that were measured for something else. */
  delete slide.mockRecipe;
  delete slide.mockTitleNormalized;
  delete slide.mockExtras;
  delete slide.mockSplitShare;
  render().then((result) => {
    /* The rendered status is authoritative. A title may have taken an internal
       second pass to establish its measured rows, so the outer promise result
       can describe the provisional pass rather than what the canvas shows. */
    const now = SF.SLIDE_TYPES[type]?.label || type;
    const shown = pointsBefore && SF.BULLET_LAYOUTS.includes(type);
    const fitted = status.dataset.fits === 'true';
    /* The picker's verdict is a prediction from a trial render, and a prediction
       can be wrong. Say so when it is, rather than letting the two disagree in
       silence — a quiet wrong "should fit" is worse than no estimate at all. */
    const surprise =
      predicted === 'yes' && !fitted ? ' \u2014 the picker expected this to fit; it does not'
      : predicted === 'no' && fitted ? ' \u2014 better than the picker expected'
      : '';
    /* Say when the heading came off, rather than reporting a clean pass for a
       slide that just lost its title. */
    const titleBefore = String(slide.title || '').trim();
    const headingGone =
      titleBefore &&
      !document.querySelector('#demo-deck .safe-stage')?.textContent
        .replace(/\s+/g, ' ')
        .includes(titleBefore.replace(/\s+/g, ' '));
    lastMove = `${slotName ? slotName + ': ' : ''}${was} \u2192 ${now}` +
      (pointsBefore ? `, ${pointsBefore} points ${shown ? 'carried' : 'kept in the data'}` : '') +
      (headingGone ? ', heading off the slide (still in the data)' : '') +
      surprise;
    reportSwapFit(lastMove, { failed: fitted ? [] : result?.failed || ['measure'] });
  });
}

function reportSwapFit(label, result) {
  const failed = result?.failed || [];
  status.dataset.fits = failed.length ? 'false' : 'true';
  status.textContent = failed.length
    ? `${label} · Needs more space: ${failed.join(', ')}. Text is not auto-shrunk.`
    : `${label} · fit check passed · 16×12`;
  lastMove = '';
}

function bindSlotDrag(root, slide, body) {
  const recipe = ensureMockRecipe(slide);
  /* Include BLEED slots mounted on the slide, not only body-lattice slots. */
  const boxes = [...root.querySelectorAll('.safe-slot')];

  for (const box of boxes) {
    const idx = Number(box.dataset.recipeIndex);
    if (!Number.isFinite(idx) || !recipe[idx]) continue;

    const tools = document.createElement('div');
    tools.className = 'demo-slot-tools';
    box.append(tools);

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'demo-slot-grip';
    grip.title = 'Drag up/down to reorder; sideways to move column origin. Use −/+ c to stretch or condense width.';
    grip.setAttribute('aria-label', `Move ${box.dataset.name}`);
    grip.textContent = '⠿';
    tools.append(grip);

    /* Layout (lines + width) lives in the edit form — keep the canvas clear.
       A small “Size” opens that form (or a lattice-only panel for decoration). */
    const sizeBtn = document.createElement('button');
    sizeBtn.type = 'button';
    sizeBtn.className = 'demo-slot-size';
    sizeBtn.title = 'Lines and width — opens in the edit box';
    sizeBtn.setAttribute('aria-label', `Size ${box.dataset.name}`);
    sizeBtn.textContent = '⬚';
    tools.append(sizeBtn);

    const openLatticeEditor = () => {
      if (flipMode === 'artwork') return;
      const content = [...box.children].find((el) => !el.classList.contains('demo-slot-tools') && !el.classList.contains('canvas-edit-form'));
      const keyNode = content?.matches?.('[data-content-key]')
        ? content
        : content?.querySelector?.('[data-content-key]');
      const key = keyNode?.dataset?.contentKey;
      const recipeIndex = idx;
      let pendingRows = ensureTariff(recipe[recipeIndex]);
      let pendingCols = recipe[recipeIndex][3];
      const lattice = {
        get rows() {
          return pendingRows;
        },
        get cols() {
          return pendingCols;
        },
        rowBands: [HEADING_COMPACT, HEADING_TARIFF, 4],
        colBands: [5, 6, 12],
        onRows: (n) => {
          pendingRows = Math.max(1, Math.min(ROWS, Math.round(n)));
          return pendingRows;
        },
        onCols: (n) => {
          pendingCols = Math.max(1, Math.min(12, Math.round(n)));
          return pendingCols;
        },
      };
      const commitSize = () => {
        setSlotTariff(recipe, recipeIndex, pendingRows);
        setSlotCols(recipe, recipeIndex, pendingCols);
        lastMove = `Size ${recipe[recipeIndex][1]} → ${pendingRows}r × ${pendingCols}c`;
      };
      if (key && SF.Custom?.openCanvasEditor) {
        SF.Custom.openCanvasEditor(box, slide, key, {
          lattice,
          onSave: () => {
            commitSize();
            render();
          },
          onCancel: () => render(),
        });
        return;
      }
      /* Decoration (e.g. Accent): lattice-only panel on the slide canvas. */
      const host = SF.Custom.canvasEditHost?.(box) || box.closest('.slide') || box;
      host.querySelectorAll('.canvas-edit-form').forEach((n) => n.remove());
      const form = document.createElement('div');
      form.className = 'canvas-edit-form';
      const drag = document.createElement('div');
      drag.className = 'canvas-edit-drag';
      drag.innerHTML = '<span>Slot size</span><span class="canvas-edit-drag-hint">Drag</span>';
      form.append(drag);
      if (SF.Custom?.enableCanvasEditDrag) SF.Custom.enableCanvasEditDrag(form, drag, host);
      const layout = document.createElement('div');
      layout.className = 'canvas-edit-lattice';
      const addRow = (label, get, set, bands, suffix) => {
        const wrap = document.createElement('div');
        wrap.className = 'canvas-edit-lattice-row';
        const name = document.createElement('span');
        name.className = 'canvas-edit-lattice-label';
        name.textContent = label;
        const val = document.createElement('span');
        val.className = 'canvas-edit-lattice-val';
        val.textContent = `${get()}${suffix}`;
        const apply = (n) => {
          set(n);
          val.textContent = `${get()}${suffix}`;
        };
        const dec = document.createElement('button');
        dec.type = 'button';
        dec.className = 'btn ghost';
        dec.textContent = '−';
        dec.onclick = () => apply(get() - 1);
        const inc = document.createElement('button');
        inc.type = 'button';
        inc.className = 'btn ghost';
        inc.textContent = '+';
        inc.onclick = () => apply(get() + 1);
        wrap.append(name, dec, val, inc);
        for (const n of bands) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn ghost';
          b.textContent = String(n);
          b.onclick = () => apply(n);
          wrap.append(b);
        }
        layout.append(wrap);
      };
      addRow('Lines', () => pendingRows, (n) => lattice.onRows(n), lattice.rowBands, 'r');
      addRow('Width', () => pendingCols, (n) => lattice.onCols(n), lattice.colBands, 'c');
      form.append(layout);
      const done = document.createElement('button');
      done.type = 'button';
      done.className = 'btn primary';
      done.textContent = 'Done';
      done.onclick = () => {
        commitSize();
        render();
      };
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn ghost';
      cancel.textContent = 'Cancel';
      cancel.onclick = () => {
        form.remove();
      };
      form.append(done, cancel);
      if (SF.Custom?.placeCanvasEditForm) SF.Custom.placeCanvasEditForm(form, box, host);
      else host.append(form);
    };

    sizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLatticeEditor();
    });

    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      closeFeaturePicker();
      e.preventDefault();
      e.stopPropagation();
      const spec = recipe[idx];
      const cols = spec[3];
      const rows = spec[5];
      const scale = root.getBoundingClientRect().width / 1280;
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let over = null;

      box.classList.add('demo-slot-lifting');
      grip.setPointerCapture(e.pointerId);

      const clearOver = () => {
        if (over) over.classList.remove('demo-slot-drop');
        over = null;
      };

      const move = (ev) => {
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        if (!dragging && Math.hypot(dx, dy) > 4) dragging = true;
        if (!dragging) return;

        clearOver();
        box.style.pointerEvents = 'none';
        const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.safe-slot');
        box.style.pointerEvents = '';
        if (hit && hit !== box && body.contains(hit)) {
          over = hit;
          over.classList.add('demo-slot-drop');
          /* Free follow while aiming at a swap target. */
          box.style.transform = `translate(${dx}px, ${dy}px)`;
          box.style.zIndex = '8';
          /* Stale snap data here made a drop read the row the pointer crossed on
             the way in, not the row it landed on. */
          delete box.dataset.snapCol;
          delete box.dataset.snapRow;
          const sameStack = columnGroup(recipe, idx).some((g) => g.i === Number(over.dataset.recipeIndex));
          status.textContent = sameStack
            ? `Drop to place before/after ${over.dataset.name} — the rest move aside`
            : `Drop to swap sides with ${over.dataset.name}`;
          return;
        }

        /* One gesture, one axis. Without this a reorder that wanders a few pixels
           sideways became a column move, so the second drag looked freeform. The
           dominant axis of travel decides, and the other coordinate is held. */
        const hitAt = latticeAt(body, ev.clientX, ev.clientY);
        const vertical = Math.abs(dy) >= Math.abs(dx);
        const at = clampOrigin(
          vertical ? spec[2] : hitAt.col,
          vertical ? hitAt.row : spec[4],
          cols,
          rows
        );
        const natX = (spec[2] - 1) * SNAP_X;
        const natY = (spec[4] - 1) * SNAP_Y;
        const wantX = (at.col - 1) * SNAP_X;
        const wantY = (at.row - 1) * SNAP_Y;
        box.style.transform = `translate(${wantX - natX}px, ${wantY - natY}px)`;
        box.style.zIndex = '8';
        box.dataset.snapCol = String(at.col);
        box.dataset.snapRow = String(at.row);
        box.dataset.snapAxis = vertical ? 'row' : 'col';
        status.textContent = vertical
          ? `Reorder → row ${at.row}; the rest move aside (${rows} rows)`
          : `Column → ${at.col}–${at.col + cols - 1}; row ${at.row} held`;
      };

      const up = (ev) => {
        try {
          grip.releasePointerCapture(ev.pointerId);
        } catch (_) {
          /* already released */
        }
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        box.style.transform = '';
        box.style.zIndex = '';
        box.classList.remove('demo-slot-lifting');

        if (!dragging) {
          clearOver();
          return;
        }

        const drop = over;
        clearOver();

        const at = latticeAt(body, ev.clientX, ev.clientY);

        if (drop && drop !== box && body.contains(drop)) {
          const j = Number(drop.dataset.recipeIndex);
          if (Number.isFinite(j) && recipe[j] && j !== idx) {
            const sameStack = columnGroup(recipe, idx).some((s) => s.i === j);
            if (sameStack) {
              /* Dropping onto a slot in your own stack means "put me here" —
                 push, do not swap. Swapping would leave the two sizes exchanged,
                 which is never what the drop looked like. */
              const magnet = magneticMove(recipe, idx, at.row);
              if (magnet) {
                lastMove = magnet.over
                  ? `Moved ${magnet.moved}, ${magnet.over} rows over budget`
                  : `Moved ${magnet.moved}, ${magnet.order.length - 1} pushed aside`;
                delete box.dataset.snapCol;
                delete box.dataset.snapRow;
                delete box.dataset.snapAxis;
                render();
                return;
              }
            }
            /* Different stacks sit side by side, so there is nothing to push:
               swapping sides is the honest reading of that drop. */
            const swapped = swapSlotGeometry(recipe, idx, j);
            if (swapped) {
              lastMove = `Swapped sides: ${swapped.a} and ${swapped.b}`;
              render();
            }
            return;
          }
        }

        /* Vertical travel is always a reorder, never a reposition: the column is
           held, so the stack stays a stack and cannot drift into freeform. */
        const landedRow = Number(box.dataset.snapRow) || at.row;
        const axis = box.dataset.snapAxis || (Math.abs(ev.clientY - startY) >= Math.abs(ev.clientX - startX) ? 'row' : 'col');
        if (axis === 'row') {
          const magnet = magneticMove(recipe, idx, landedRow);
          if (magnet) {
            lastMove = magnet.over
              ? `Moved ${magnet.moved}, ${magnet.over} rows over budget`
              : `Moved ${magnet.moved}, ${magnet.order.length - 1} pushed aside`;
            delete box.dataset.snapCol;
            delete box.dataset.snapRow;
            delete box.dataset.snapAxis;
            render();
            return;
          }
        }
        const clamped = clampOrigin(Number(box.dataset.snapCol) || at.col, spec[4], cols, rows);
        delete box.dataset.snapCol;
        delete box.dataset.snapRow;
        delete box.dataset.snapAxis;
        /* Only the column moves here. Rows belong to the stack. */
        spec[2] = clamped.col;
        lastMove = `Moved ${spec[1]} to columns ${clamped.col}\u2013${clamped.col + cols - 1}`;
        render();
      };

      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
  }

}

function filteredIndexes() {
  const f = $('#demo-filter').value;
  return deck.slides.map((_, i) => i).filter((i) => !f || deck.slides[i].type === f);
}

function fillFilter() {
  const types = [...new Set(deck.slides.map((s) => s.type))].sort();
  const sel = $('#demo-filter');
  const cur = sel.value;
  sel.replaceChildren(Object.assign(document.createElement('option'), { value: '', textContent: 'All types' }));
  for (const t of types) {
    const n = deck.slides.filter((s) => s.type === t).length;
    const o = document.createElement('option');
    o.value = t;
    o.textContent = `${t} (${n})`;
    sel.append(o);
  }
  sel.value = types.includes(cur) ? cur : '';
}

function options() {
  const select = $('#demo-slide');
  const seq = filteredIndexes();
  select.replaceChildren();
  for (const i of seq) {
    const s = deck.slides[i];
    const o = document.createElement('option');
    o.value = i;
    const title = (s.title || s.body || s.type || '').toString().replace(/\s+/g, ' ').trim().slice(0, 48);
    o.textContent = `${i + 1}. ${s.type}${s.design?.composition ? '/' + s.design.composition : ''} — ${title}`;
    select.append(o);
  }
  if (!seq.includes(index)) index = seq[0] ?? 0;
  select.value = index;
}

function fit() {
  const root = stage.firstElementChild;
  if (!root) return;
  const scale = stage.clientWidth / 1280;
  root.style.transform = `scale(${scale})`;
  stage.style.height = 720 * scale + 'px';
}

/** Safe lattice pitch — see SNAP_* / BODY_* above. */

function artKey(node) {
  return (
    node.dataset.artKey ||
    [...node.classList].find((c) => c.startsWith('nu-') || c === 'slide-logo' || c === 'cp-art') ||
    node.className ||
    'art'
  );
}

function snapPoint(x, y) {
  const sx = BODY_LEFT + Math.round((x - BODY_LEFT) / SNAP_X) * SNAP_X;
  const sy = BODY_TOP + Math.round((y - BODY_TOP) / SNAP_Y) * SNAP_Y;
  return { x: sx, y: sy };
}

function applyArtPose(node, pose) {
  if (!pose) return;
  if (pose.x != null && pose.y != null) {
    node.style.left = `${pose.x}px`;
    node.style.top = `${pose.y}px`;
    node.style.right = 'auto';
    node.style.bottom = 'auto';
  }
  node.style.transform = pose.scale != null ? `scale(${pose.scale})` : '';
  node.style.transformOrigin = 'top left';
  node.hidden = !!pose.hidden;
  node.classList.toggle('demo-art-locked', !!pose.locked);
  node.classList.toggle('demo-art-front', pose.plane === 'front');
  node.classList.toggle('demo-art-back', pose.plane !== 'front');
  const zBase = pose.plane === 'front' ? 40 : 10;
  node.style.zIndex = String(zBase + (pose.order ?? 0));
}

function readPose(node, root) {
  const rr = root.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  const scale = rr.width / 1280;
  return {
    x: (r.left - rr.left) / scale,
    y: (r.top - rr.top) / scale,
  };
}

function artTargets(root) {
  const list = [];
  const art = root.querySelector('.theme-art');
  if (art) list.push(...art.children);
  const logo = root.querySelector(':scope > .slide-logo');
  if (logo) list.push(logo);
  const poster = root.querySelector('.cp-art');
  if (poster) list.push(poster);
  return list;
}

function selectArt(key, root) {
  selectedArt = key;
  if (root) {
    for (const n of root.querySelectorAll('.demo-art-handle')) {
      n.classList.toggle('demo-art-selected', artKey(n) === key);
    }
  }
  for (const li of stackList.querySelectorAll('[data-art-key]')) {
    li.classList.toggle('is-selected', li.dataset.artKey === key);
    li.setAttribute('aria-selected', String(li.dataset.artKey === key));
  }
  const slide = deck.slides[index];
  const pose = slide.mockArt?.[key];
  const planeBtn = $('#demo-art-plane');
  const hideBtn = $('#demo-art-hide');
  const lockBtn = $('#demo-art-lock');
  if (pose) {
    planeBtn.textContent = pose.plane === 'front' ? '→ Back' : '→ Front';
    hideBtn.textContent = pose.hidden ? 'Show' : 'Hide';
    lockBtn.textContent = pose.locked ? 'Unlock' : 'Lock';
  }
}

function renderStack(root, slide, targets) {
  const keys = sortedArtKeys(slide, targets);
  stackList.replaceChildren();
  if (!keys.length) {
    stackEl.hidden = false;
    const empty = document.createElement('li');
    empty.className = 'demo-stack-empty';
    empty.textContent = 'No theme assets on this slide.';
    stackList.append(empty);
    return;
  }

  for (const key of keys) {
    const pose = ensureArt(slide, key);
    const li = document.createElement('li');
    li.dataset.artKey = key;
    li.setAttribute('role', 'option');
    li.tabIndex = 0;
    li.className = 'demo-stack-item';
    if (pose.hidden) li.classList.add('is-hidden');
    if (pose.locked) li.classList.add('is-locked');
    li.innerHTML = `
      <span class="demo-stack-plane" data-plane="${pose.plane}">${pose.plane}</span>
      <span class="demo-stack-name">${artLabel(key)}</span>
      <span class="demo-stack-flags">${pose.locked ? 'locked' : ''}${pose.hidden ? ' hidden' : ''}</span>
    `;
    li.onclick = () => selectArt(key, root);
    li.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectArt(key, root);
      }
    };
    stackList.append(li);
  }

  if (!selectedArt || !keys.includes(selectedArt)) selectedArt = keys[keys.length - 1];
  selectArt(selectedArt, root);
}

function mutateSelected(slide, root, fn) {
  if (!selectedArt || !slide.mockArt?.[selectedArt]) return;
  fn(slide.mockArt[selectedArt]);
  const node = root.querySelector(`[data-art-key="${CSS.escape(selectedArt)}"]`);
  if (node) applyArtPose(node, slide.mockArt[selectedArt]);
  renderStack(root, slide, artTargets(root));
  selectArt(selectedArt, root);
}

function reorderSelected(slide, root, dir) {
  const targets = artTargets(root);
  const keys = sortedArtKeys(slide, targets);
  const at = keys.indexOf(selectedArt);
  const swap = at + dir;
  if (at < 0 || swap < 0 || swap >= keys.length) return;
  const A = slide.mockArt[keys[at]];
  const B = slide.mockArt[keys[swap]];
  const tmp = { plane: A.plane, order: A.order };
  A.plane = B.plane;
  A.order = B.order;
  B.plane = tmp.plane;
  B.order = tmp.order;
  for (const n of targets) applyArtPose(n, slide.mockArt[artKey(n)]);
  renderStack(root, slide, targets);
  selectArt(selectedArt, root);
}

function bindArtwork(root, slide) {
  if (!slide.mockArt) slide.mockArt = {};
  const targets = artTargets(root);
  stackEl.hidden = false;

  if (!targets.length) {
    status.textContent = 'Flip · artwork — no theme assets on this slide. Flip back to edit content slots.';
    status.dataset.fits = 'artwork';
    renderStack(root, slide, targets);
    return;
  }

  targets.forEach((node, i) => {
    const key = artKey(node);
    node.dataset.artKey = key;
    node.classList.add('demo-art-handle');
    const pose = ensureArt(slide, key, i);
    applyArtPose(node, pose);

    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      selectArt(key, root);
      if (slide.mockArt[key].locked) {
        status.textContent = `Flip · artwork · ${artLabel(key)} is locked — Unlock in the stack.`;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const scale = root.getBoundingClientRect().width / 1280;
      const start = readPose(node, root);
      const ox = e.clientX;
      const oy = e.clientY;
      node.classList.add('demo-art-dragging');
      node.setPointerCapture(e.pointerId);

      const move = (ev) => {
        const rawX = start.x + (ev.clientX - ox) / scale;
        const rawY = start.y + (ev.clientY - oy) / scale;
        const snapped = snapPoint(rawX, rawY);
        const state = slide.mockArt[key];
        state.x = snapped.x;
        state.y = snapped.y;
        applyArtPose(node, state);
        status.textContent = `Flip · artwork · ${artLabel(key)} → col ${Math.round((snapped.x - BODY_LEFT) / SNAP_X) + 1}, row ${Math.round((snapped.y - BODY_TOP) / SNAP_Y) + 1} · ${state.plane}`;
      };
      const up = () => {
        node.classList.remove('demo-art-dragging');
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    });
  });

  renderStack(root, slide, targets);
  status.dataset.fits = 'artwork';
  status.textContent = `Flip · artwork · ${targets.length} asset${targets.length === 1 ? '' : 's'} — stack lists sandwich order; drag to snap. Content slots locked.`;
  recipeEl.textContent = sortedArtKeys(slide, targets)
    .map((k) => `${artLabel(k)} (${slide.mockArt[k].plane})`)
    .join('  →  ');
}

function syncFlipButton() {
  const artworkBtn = $('#demo-flip');
  const contentBtn = $('#demo-content-mode');
  const art = flipMode === 'artwork';
  artworkBtn.setAttribute('aria-pressed', String(art));
  contentBtn.setAttribute('aria-pressed', String(!art));
  artworkBtn.title = 'Artwork mode: move background and decorative assets';
  contentBtn.title = 'Content mode: edit text and arrange content slots';
  if (!art) {
    stackEl.hidden = true;
    selectedArt = null;
  }
}

/* Build the slot grid for a slide. Shared by render() and by the picker's trial
   renders, so what the picker promises is measured the same way as the result. */
function slotify(root, slide) {
  const used = [];
  const owner = root.querySelector('.cp-body') || root.querySelector('.pad') || root;
  const hadCompositionBody = !!root.querySelector('.cp-body');
  /* Lab-only extras from + Heading / + Body — inject before recipe pick. */
  for (const extra of slide.mockExtras || []) {
    if (owner.querySelector(`[data-mock-extra="${extra.id}"]`)) continue;
    const node = document.createElement(extra.role === 'heading' ? 'h2' : 'p');
    node.dataset.mockExtra = extra.id;
    node.dataset.contentKey = `mockExtra.${extra.id}`;
    node.textContent = extra.text || '';
    owner.append(node);
  }
  const body = document.createElement('div');
  body.className = 'safe-body';
  const specs = ensureMockRecipe(slide);
  specs.forEach((spec, recipeIndex) => {
    ensureTariff(spec);
    const [sel, name, col, cols, row, rows] = spec;
    const node = pick(owner, sel);
    if (!node) return;
    const box = document.createElement('div');
    box.className = 'safe-slot';
    box.style.gridArea = `${row} / ${col} / span ${rows} / span ${cols}`;
    box.dataset.name = name;
    box.dataset.label = `${name} · ${rows}r × ${cols}c`;
    box.dataset.rows = String(rows);
    box.dataset.tariff = String(ensureTariff(spec));
    box.dataset.recipeIndex = String(recipeIndex);
    box.append(node);
    body.append(box);
    used.push({ name, col, cols, row, rows });
  });
  if (hadCompositionBody) owner.replaceWith(body);
  else {
    owner.replaceChildren(body);
    root.classList.add('safe-generic');
  }
  /* BLEED slots leave the 16-line body and paint full-slide (header→footer). */
  applyBleedSlots(root, slide, body);
  return used;
}

/* A title has one genuinely variable block: the headline. Its row span follows
   the already-rendered text instead of shrinking 84px campaign type to make a
   fixed recipe pass. The remaining blocks flow beneath it on whole rows, so a
   longer heading moves the subtitle/date but never changes their design. */
function normalizeTitleRows(root, slide) {
  if (slide.type !== 'title') return false;
  /* This establishes the starting anchors only. Once a person rearranges a
     title, their order and rows win; rendering must not silently snap it back
     to the automated starting composition. */
  if (slide.mockTitleNormalized) return false;
  const recipe = slide.mockRecipe;
  if (!Array.isArray(recipe)) return false;
  const byName = (name) => recipe.find((item) => item[1] === name);
  const boxFor = (name) => root.querySelector(`.safe-slot[data-name="${name}"]`);
  const rowsFor = (name, minimum, guard = 0) => {
    const node = boxFor(name)?.firstElementChild;
    return Math.max(minimum, Math.ceil((node?.scrollHeight || 0) / 36) + guard);
  };
  const accent = byName('Accent');
  const headline = byName('Headline');
  const subtitle = byName('Subtitle');
  const date = byName('Date');
  if (!accent || !headline || !subtitle) return false;
  /* These are lower bounds from the campaign composition, not compactness
     targets. The first paint can report a deceptively short scroll height while
     font metrics settle; never collapse a display line because it happened to
     fit for one frame. Display type gets a one-row guard; other blocks use
     their measured height directly so the canvas remains compact. */
  const headlineRows = rowsFor('Headline', 4, 1);
  const subtitleRows = rowsFor('Subtitle', 2);
  const hasDate = !!boxFor('Date');
  const dateRows = hasDate ? rowsFor('Date', 2) : 0;
  const next = [
    [accent, 4, 1],
    [headline, 5, headlineRows],
    [subtitle, 5 + headlineRows, subtitleRows],
    ...(hasDate ? [[date, 5 + headlineRows + subtitleRows, dateRows]] : []),
  ];
  /* A recipe is a description of what actually appears on this slide. Remove
     a missing date from title variants so it cannot consume invisible budget. */
  const dateMissing = !!date && !hasDate;
  const changed = dateMissing || next.some(([spec, row, rows]) => spec[4] !== row || spec[5] !== rows);
  slide.mockTitleNormalized = true;
  if (!changed) return false;
  if (dateMissing) recipe.splice(recipe.indexOf(date), 1);
  next.forEach(([spec, row, rows]) => {
    spec[4] = row;
    spec[5] = rows;
    spec[6] = rows; /* authored tariff from first title settle */
  });
  return true;
}

/* Measure every slot with the instrument Safe and production also use. One pass
   returns both verdicts, because they come from the same walk: whether a block
   escapes its declared box, and the smallest text painted inside it.

   Blocks that paint on their own rim are exempt from the glyph check — a chart's
   axis labels and a media caption are drawn to sit outside the content box — so
   for those, scroll fit is the contract. */
const RIM_PAINTERS = /chart|image|media|video|mind map|join|game/i;
/* Campaign dates are deliberately small, tracked metadata—not body copy. They
   must fit their slot, but should not make an otherwise readable title fail the
   general 20px body-text floor. */
const MICROTYPE = /^(Accent|Date)$/;

/* The lattice is the instrument, not the box. A block's tariff (recipe rows) is
   its operating budget; air under top-aligned content is intentional. Fit fails
   only when measured need exceeds that tariff (or the block is too wide).
   Vector / canvas blocks (mindmap, chart, …) scale inside the slot — more nodes
   densify; legibility is their failure mode, not line bleed. */
function measureSlots(root) {
  const failed = [];
  let smallest = null;
  let smallestIn = '';
  for (const box of root.querySelectorAll('.safe-slot')) {
    /* Vector blocks scale to their box, so they cannot need a line they do not
       have. Too narrow is their only failure mode and minCols reports it. */
    const fitExempt = RIM_PAINTERS.test(box.dataset.name || '');
    const microtype = MICROTYPE.test(box.dataset.name || '');
    /* Measure content only — slot tools (−/+/Nr) are lab chrome and must not
       drag the legibility floor (a "16r" label is 12px). */
    const content = [...box.children].find((el) => !el.classList.contains('demo-slot-tools'));
    const verdict = content
      ? SF.measureSlideFit(content, { frame: box, floor: SF.LEGIBLE_FLOOR })
      : null;
    if (!microtype && verdict?.smallest != null && (smallest === null || verdict.smallest < smallest)) {
      smallest = verdict.smallest;
      smallestIn = verdict.smallestIn || '';
    }
    const lines = linesNeeded(box);
    const have = Number(box.dataset.tariff || box.dataset.rows) || Math.max(1, Math.round(box.clientHeight / ROW_H));
    const need = lines ?? 0;
    const wide = lines != null && box.scrollWidth > box.clientWidth + 1;
    /* Full-slide BLEED panes are sized to the slide, not the 16-line tariff. */
    const bleedPane = box.classList.contains('safe-slot-bleed');
    const bad = !fitExempt && !bleedPane && (need > have || wide);
    box.classList.toggle('safe-overflow', bad);
    if (bad) {
      failed.push(
        need > have
          ? `${box.dataset.name} needs ${need} lines, tariff ${have}`
          : `${box.dataset.name} overflows sideways`
      );
    }
  }
  return { failed, smallest, smallestIn };
}

/* The grid is the measured body frame. The space above and below it is not
   guessed chrome: read the rendered rectangles so the report remains true at
   every preview scale. The reserves include the pad that keeps furniture away
   from the slide edge: 56px header + 32px top pad, then 32px footer + 24px
   bottom pad on the current 16:9 frame. */
function measureChromeBands(root) {
  const grid = root.querySelector('.safe-body');
  const slide = root.getBoundingClientRect();
  const scale = slide.width / 1280;
  if (!(scale > 0)) return null;
  /* In preserve-original mode there is no injected .safe-body. The frame is
     still the same declared 16×12 body: report that boundary without touching
     the original DOM. */
  if (!grid) return { header: 88, body: 576, footer: 56, implied: true };
  const body = grid.getBoundingClientRect();
  const px = (value) => Math.round(value / scale);
  return {
    header: px(body.top - slide.top),
    body: px(body.height),
    footer: px(slide.bottom - body.bottom),
  };
}

/* Put the measurement where it can be judged: on the slide. Generic layouts
   have furniture without formal header/footer elements, so their bands are
   marked as implied reserves from the measured slot body; campaign slides use
   their real .cp-header / .cp-footer elements. */
function paintChromeBands(root) {
  root.querySelector('.demo-chrome-overlay')?.remove();
  const slide = root.getBoundingClientRect();
  const scale = slide.width / 1280;
  if (!(scale > 0)) return;
  const overlay = document.createElement('div');
  overlay.className = 'demo-chrome-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const toSlide = (rect) => ({
    top: (rect.top - slide.top) / scale,
    height: rect.height / scale,
  });
  const add = (band, label, implied) => {
    if (!band || band.height < 1) return;
    const el = document.createElement('div');
    el.className = 'demo-chrome-band' + (implied ? ' implied' : '');
    el.dataset.band = label.startsWith('header') ? 'header' : 'footer';
    el.style.top = `${band.top}px`;
    el.style.height = `${band.height}px`;
    const tag = document.createElement('span');
    tag.textContent = label;
    el.append(tag);
    overlay.append(el);
  };
  const header = root.querySelector('.cp-header');
  const footer = root.querySelector('.cp-footer');
  const body = root.querySelector('.safe-body');
  if (header) {
    add(toSlide(header.getBoundingClientRect()), `header · ${Math.round(toSlide(header.getBoundingClientRect()).height)}px`, false);
  } else {
    const frame = body ? toSlide(body.getBoundingClientRect()) : { top: 88, height: 576 };
    add({ top: 0, height: frame.top }, `header reserve · implied · ${Math.round(frame.top)}px`, true);
  }
  if (footer) {
    add(toSlide(footer.getBoundingClientRect()), `footer · ${Math.round(toSlide(footer.getBoundingClientRect()).height)}px`, false);
  } else {
    const frame = body ? toSlide(body.getBoundingClientRect()) : { top: 88, height: 576 };
    const bottom = frame.top + frame.height;
    add({ top: bottom, height: 720 - bottom }, `footer reserve · implied · ${Math.round(720 - bottom)}px`, true);
  }
  root.append(overlay);
}

/* Engine 3 uses campaign theme furniture rather than Safe's .cp-header and
   .cp-footer markup. Give that existing furniture the same six named positions
   without touching body slots: context/eyebrow and logo belong to the header;
   page number or the existing progress line belongs to the footer. The shared
   SF chrome position model keeps the values compatible with the app controller. */
const DEMO_CHROME_LABELS = {
  identitySlot: 'Identity',
  contextSlot: 'Context',
  logoSlot: 'Logo',
  closingSlot: 'Progress',
  numberSlot: 'Page no.',
};

function demoChromeItems(root) {
  const context =
    root.querySelector('.cp-header .cp-beat') ||
    root.querySelector('.nu-eyebrow') ||
    root.querySelector('[class*="eyebrow"]');
  const footerNote = root.querySelector('.cp-footer-note');
  const page = root.querySelector('.pagenum');
  const progress = root.querySelector('.track');
  return {
    contextSlot: context,
    logoSlot: root.querySelector('.slide-logo'),
    closingSlot: footerNote || progress,
    numberSlot: page,
  };
}

function applyDemoChromeRegions(root, slide, enabled) {
  if (!enabled) return;
  const items = demoChromeItems(root);
  if (!Object.values(items).some(Boolean)) return;
  /* setChromeSlot owns the same persisted names as the Safe controller. The
     value also makes an exported snapshot unambiguous about what was moved. */
  slide.design = { ...(slide.design || {}), chromeLayout: 'regions' };
  const positions = SF.chromePositions(slide.design);
  const layer = document.createElement('div');
  layer.className = 'demo-engine-chrome';
  for (const slot of ['header-left', 'header-center', 'header-right', 'footer-left', 'footer-center', 'footer-right']) {
    const region = document.createElement('div');
    region.className = 'chrome-slot';
    region.dataset.region = slot;
    layer.append(region);
  }
  for (const [key, item] of Object.entries(items)) {
    if (!item) continue;
    item.dataset.chromeItem = key;
    layer.querySelector(`[data-region="${positions[key]}"]`).append(item);
  }
  root.classList.add('demo-chrome-regions');
  root.append(layer);
}

function paintDemoChromeMap(slide, root, enabled) {
  chromeMapEl.hidden = !enabled;
  section.classList.toggle('demo-chrome-on', enabled);
  if (!enabled) {
    delete chromeMapEl.dataset.pending;
    return;
  }
  const positions = SF.chromePositions(slide.design || {});
  const bySlot = {};
  for (const [key, slot] of Object.entries(positions)) {
    if (root.querySelector(`[data-chrome-item="${key}"]`)) bySlot[slot] = key;
  }
  for (const band of ['header', 'footer']) {
    const cells = chromeMapEl.querySelector(`[data-band-cells="${band}"]`);
    cells.replaceChildren();
    for (const side of ['left', 'center', 'right']) {
      const slot = `${band}-${side}`;
      const key = bySlot[slot];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'demo-chrome-cell' + (key ? ' is-filled' : '');
      if (chromeMapEl.dataset.pending === key) cell.classList.add('is-pending');
      cell.dataset.snapSlot = slot;
      cell.textContent = key ? DEMO_CHROME_LABELS[key] : '·';
      cell.title = key
        ? `${DEMO_CHROME_LABELS[key]} · click another position to move here (swap if occupied)`
        : `Empty ${band} ${side}`;
      cell.onclick = () => {
        if (!key && !chromeMapEl.dataset.pending) return;
        if (!chromeMapEl.dataset.pending) {
          chromeMapEl.dataset.pending = key;
          paintDemoChromeMap(slide, root, enabled);
          return;
        }
        const from = chromeMapEl.dataset.pending;
        delete chromeMapEl.dataset.pending;
        if (from && SF.setChromeSlot(slide, from, slot)) render();
        else paintDemoChromeMap(slide, root, enabled);
      };
      cells.append(cell);
    }
  }
}

/* Would this swap fit?
 *
 * SF.probeLayoutFit renders the converted slide off screen and measures it —
 * the same module the editor's layout picker will call, so nothing here has to
 * move when this lands in production. The lab adds one stricter test through the
 * inspect hook: a block must fit its declared slot, not merely the slide. */
let trialHost = null;
/* Slots placed by the last trial's prepare pass, read by its inspect pass. */
let lastPlaced = [];
async function trialFit(slide, type) {
  if (!trialHost) {
    trialHost = document.createElement('div');
    trialHost.setAttribute('aria-hidden', 'true');
    trialHost.className = 'demo-trial-host';
    /* Outside #demo-deck on purpose: mounted inside it, every trial's .safe-slot
       boxes joined the live DOM, so anything asking "#demo-deck .safe-slot" saw
       the trial's slots as well as the slide's. */
    document.body.append(trialHost);
  }
  const verdict = await SF.probeLayoutFit(deck, slide, type, trialHost, {
    index,
    total: deck.slides.length,
    prepareLayout: SF.prepareLayout,
    renderSlide: SF.renderSlide,
    floor: SF.LEGIBLE_FLOOR,
    settle: async () => {
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    },
    /* Rearrange before settling, measure after: the lattice has to be laid out
       before measureSlots reads it, or every block looks like it fits. */
    prepare: (root, trial) => {
      /* The clone carries the source slide's mockRecipe, whose selectors were
         written for the old shape. Left in place, a quote trial looked for an h2
         and a ul, found neither, and reported "needs a picture". */
      delete trial.mockRecipe;
      root.classList.add('safe-slotted', 'demo-slotted');
      lastPlaced = slotify(root, trial);
    },
    inspect: (root) =>
      lastPlaced.length
        ? { placed: lastPlaced.length, failed: measureSlots(root).failed }
        : { placed: 0, failed: ['nothing placed'] },
  });
  /* The lattice verdict decides, because that is what applying the swap will
     produce; the frame verdict and the legibility reading come along with it. */
  return { ...verdict, fits: verdict.placed > 0 && !verdict.failed.length };
}

function pick(owner, selector) {
  for (const part of selector.split(',').map((s) => s.trim())) {
    const n = owner.querySelector(part);
    if (n && owner.contains(n)) return n;
  }
  return null;
}

function editable(root, slide, measure) {
  const groups = new Map();
  for (const n of root.querySelectorAll('[data-content-key]')) {
    if (n.querySelector('[data-content-key]')) continue;
    const key = n.dataset.contentKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  for (const [key, nodes] of groups) {
    const bullet = key.startsWith('bullets.');
    const extra = key.startsWith('mockExtra.');
    const i = Number(key.split('.')[1]);
    const extraId = extra ? key.slice('mockExtra.'.length) : '';
    const read = () => {
      if (extra) {
        const item = (slide.mockExtras || []).find((x) => x.id === extraId);
        return item?.text || '';
      }
      return bullet ? slide.bullets?.[i] : slide[key];
    };
    const write = (v) => {
      if (extra) {
        const item = (slide.mockExtras || []).find((x) => x.id === extraId);
        if (item) item.text = v;
        return;
      }
      if (bullet) {
        if (!slide.bullets) slide.bullets = [];
        slide.bullets[i] = v;
      } else slide[key] = v;
    };
    nodes.forEach((n, j) => {
      const split = bullet && String(read() || '').includes('\t');
      const value = () => (split ? String(read() || '').split('\t')[j] || '' : read() || '');
      const save = (v) => {
        if (split) {
          const parts = String(read() || '').split('\t');
          parts[j] = v;
          write(parts.join('\t'));
        } else write(v);
      };
      n.contentEditable = 'plaintext-only';
      n.setAttribute('role', 'textbox');
      n.dataset.placeholder = 'Type here';
      if (!value()) n.textContent = '';
      let before = '';
      n.addEventListener('focus', () => {
        before = value();
      });
      n.addEventListener('input', () => {
        save(n.innerText.replace(/\t/g, ' ').trimEnd());
        measure();
      });
      /* Tariff does not auto-grow from typing — bleed shows while need > tariff.
         User raises tariff with −/+ on the slot. */
      n.addEventListener('blur', () => {
        if (value() === before) return;
        measure();
      });
      n.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          n.textContent = before;
          save(before);
          measure();
          n.blur();
        }
      });
      n.addEventListener('dblclick', (e) => {
        if (!SF.Custom || !SF.Custom.openCanvasEditor) return;
        e.preventDefault();
        e.stopPropagation();
        const box = n.closest('.safe-slot') || n.parentElement;
        n.blur();
        const recipeIndex = Number(box?.dataset?.recipeIndex);
        const recipe = ensureMockRecipe(slide);
        let pendingRows = Number.isFinite(recipeIndex) ? ensureTariff(recipe[recipeIndex]) : 3;
        let pendingCols = Number.isFinite(recipeIndex) ? recipe[recipeIndex][3] : 12;
        const lattice = Number.isFinite(recipeIndex)
          ? {
              get rows() {
                return pendingRows;
              },
              get cols() {
                return pendingCols;
              },
              rowBands: [HEADING_COMPACT, HEADING_TARIFF, 4],
              colBands: [5, 6, 12],
              onRows: (v) => {
                pendingRows = Math.max(1, Math.min(ROWS, Math.round(v)));
                return pendingRows;
              },
              onCols: (v) => {
                pendingCols = Math.max(1, Math.min(12, Math.round(v)));
                return pendingCols;
              },
            }
          : null;
        SF.Custom.openCanvasEditor(box, slide, key, {
          lattice,
          onSave: () => {
            if (Number.isFinite(recipeIndex)) {
              setSlotTariff(recipe, recipeIndex, pendingRows);
              setSlotCols(recipe, recipeIndex, pendingCols);
              lastMove = `Size ${recipe[recipeIndex][1]} → ${pendingRows}r × ${pendingCols}c`;
            } else lastMove = `Formatted ${key}`;
            render();
          },
          onCancel: () => render(),
        });
      });
    });
  }
}

async function render() {
  const run = ++revision;
  /* A picker outlives the render that replaced its slot otherwise, and it closes
     over the slide it was opened on — so navigating with it open would apply the
     next choice to the previous slide. */
  closeFeaturePicker();
  const slide = deck.slides[index];
  const original = $('#demo-original').checked;
  const root = SF.renderSlide(deck, slide, { index, total: deck.slides.length, revealed: 99 });
  const used = [];
  const isBleed = bleedTypes.has(slide.type);
  const artwork = !original && flipMode === 'artwork';
  const chromeController = !original && !artwork;

  if (!original) {
    root.classList.add('safe-slotted', 'demo-slotted');
    root.classList.toggle('safe-grid', $('#demo-grid').checked || artwork);
    root.classList.toggle('demo-flip-art', artwork);
    used.push(...slotify(root, slide));
  }

  applyDemoChromeRegions(root, slide, chromeController);

  /* Restore art poses in both modes so flips keep placement. */
  if (slide.mockArt) {
    artTargets(root).forEach((node, i) => {
      const key = artKey(node);
      node.dataset.artKey = key;
      applyArtPose(node, ensureArt(slide, key, i));
    });
  }

  stage.replaceChildren(root);
  fit();
  paintDemoChromeMap(slide, root, chromeController);
  if (!artwork) stackEl.hidden = true;
  status.textContent = 'Measuring…';
  recipeEl.textContent = original
    ? 'Original northeastern renderer.'
    : used.length
      ? used.map((s) => `${s.name}: row ${s.row}, ${s.rows}r · cols ${s.col}–${s.col + s.cols - 1}`).join('  /  ')
      : `No recipe matches for type “${slide.type}” — add selectors in modular-canvas/demo-deck.js.`;

  await document.fonts.ready;
  await Promise.all(
    [...root.querySelectorAll('img')].map(
      (i) => Promise.race([i.decode().catch(() => {}), new Promise((r) => setTimeout(r, 400))])
    )
  );
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (run !== revision) return { failed: ['stale'] };
  if (!original && !artwork && normalizeTitleRows(root, slide)) return render();
  reflowRows(root, slide);
  reflowPasses = 0;
  paintChromeBands(root);

  const splitShare = $('#demo-split-share');
  if (splitShare) {
    const isSplit = slide.type === 'split';
    splitShare.hidden = original || artwork || !isSplit;
    if (isSplit) {
      const left = slide.mockSplitShare || recipeFor(slide).find((r) => /copy/i.test(r[1]))?.[3] || 7;
      splitShare.querySelectorAll('[data-split-left]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(Number(btn.dataset.splitLeft) === left));
      });
    }
  }

  function measure() {
    if (original) {
      status.dataset.fits = 'original';
      status.textContent = 'Original design for comparison.';
      const chrome = measureChromeBands(root);
      chromeMeasureEl.textContent = chrome
        ? `Measured original-design reserves · header ${chrome.header}px · body ${chrome.body}px · footer ${chrome.footer}px`
        : 'Chrome measurement unavailable: the slide has no measurable frame.';
      return { failed: [] };
    }
    if (artwork) {
      chromeMeasureEl.textContent = 'Chrome measurement is paused while editing artwork.';
      return { failed: [] };
    }
    const failed = [];
    const chrome = measureChromeBands(root);
    chromeMeasureEl.textContent = chrome
      ? `Measured chrome reserves · header ${chrome.header}px · body ${chrome.body}px · footer ${chrome.footer}px`
      : 'Chrome measurement unavailable: this slide has no declared body frame.';
    /* A slide with no slots used to report "All 0 slots fit": measure() loops over
       the boxes, and zero boxes means zero failures. Swapping a wordy slide to
       Image, Image stack or Video hits this — the layout renders a placeholder
       with no .img/.vid for the recipe to find, so nothing is placed at all, and
       the status claimed a pass while the recipe line said "No recipe matches". */
    if (!used.length) {
      failed.push(`nothing placed: a ${slide.type} slide needs a picture or video, and this one has none`);
    }
    const slots = measureSlots(root);
    failed.push(...slots.failed);

    /* A block narrower than its readable minimum is a failure of the same kind as
       an overflow, and nothing else catches it: vector blocks shrink silently. */
    const narrow = [];
    for (const spec of recipeFor(slide)) {
      const need = minCols(spec[1]);
      if (spec[3] < need) narrow.push(`${spec[1]} needs ${need} columns, has ${spec[3]}`);
    }
    failed.push(...narrow);

    /* Row budget per column group, so an over-budget stack says so. */
    const groups = budgets(recipeFor(slide));
    budgetEl.replaceChildren();
    for (const [n, g] of groups.entries()) {
      const el = document.createElement('span');
      el.className = 'demo-budget-col' + (g.used > ROWS ? ' is-over' : '');
      el.textContent = `${groups.length > 1 ? `stack ${n + 1} (${g.cols}c) ` : ''}${g.parts.join(' + ')} = ${g.used} of ${ROWS}`;
      budgetEl.append(el);
    }
    for (const g of groups) if (g.used > ROWS) failed.push(`${g.used - ROWS} rows over budget`);

    const { smallest, smallestIn } = slots;
    status.dataset.fits = String(!failed.length);
    status.dataset.smallest = smallest == null ? '' : String(Math.round(smallest * 10) / 10);
    const tiny = smallest != null && smallest < SF.LEGIBLE_FLOOR
      ? ` · smallest text ${Math.round(smallest)}px in .${smallestIn} (under the ${SF.LEGIBLE_FLOOR}px floor)`
      : '';
    const bleedNote = isBleed ? ' · BLEED candidate' : '';
    const action = lastMove ? lastMove + ' · ' : '';
    status.textContent = failed.length
      ? `${action}Needs more space: ${failed.join(', ')}. Text is not auto-shrunk.${bleedNote}`
      : `${action}Slide ${index + 1} / ${deck.slides.length} · ${slide.type} · All ${used.length} slots fit · 16×12${bleedNote}${tiny}`;
    lastMove = '';
    return { failed, smallest };
  }

  if (artwork) {
    for (const n of root.querySelectorAll('[contenteditable]')) {
      n.contentEditable = 'false';
      n.removeAttribute('role');
    }
    bindArtwork(root, slide);
    return { failed: [] };
  }

  editable(root, slide, measure);
  const body = root.querySelector('.safe-body');
  if (body) bindSlotDrag(root, slide, body);
  const result = measure();
  if (!result.failed?.length) {
    status.textContent = `${status.textContent} · ⠿ move · ⬚ size in edit box`;
  }
  return result;
}

function show(i) {
  const seq = filteredIndexes();
  index = seq.includes(i) ? i : seq[0] ?? 0;
  options();
  render();
}

async function auditAll() {
  auditOut.hidden = false;
  auditOut.textContent = 'Auditing…';
  const rows = [];
  const saved = index;
  const wasOriginal = $('#demo-original').checked;
  const wasGrid = $('#demo-grid').checked;
  $('#demo-original').checked = false;
  $('#demo-grid').checked = false;
  for (let i = 0; i < deck.slides.length; i++) {
    index = i;
    options();
    auditOut.textContent = `Auditing… ${i + 1} / ${deck.slides.length}`;
    const result = (await render()) || { failed: ['measure'] };
    const s = deck.slides[i];
    const failed = result.failed || [];
    rows.push({
      n: i + 1,
      type: s.type,
      composition: s.design?.composition || '',
      bleed: bleedTypes.has(s.type),
      fits: !failed.length,
      failed,
      smallest: result.smallest ?? null,
      legible: result.smallest == null || result.smallest >= SF.LEGIBLE_FLOOR,
      title: (s.title || '').toString().replace(/\s+/g, ' ').trim().slice(0, 50),
    });
  }
  $('#demo-original').checked = wasOriginal;
  $('#demo-grid').checked = wasGrid;
  show(saved);
  const fail = rows.filter((r) => !r.fits);
  const byType = {};
  for (const r of fail) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }
  /* Two independent verdicts. Fit is about space; legibility is about size. A
     slide can pass one and fail the other, so neither number hides the other. */
  const tiny = rows.filter((r) => !r.legible);
  const tinyByType = {};
  for (const r of tiny) {
    tinyByType[r.type] = (tinyByType[r.type] || 0) + 1;
  }
  auditOut.textContent =
    `Audit ${rows.length} slides · ${fail.length} need space · ${rows.length - fail.length} fit\n` +
    `Fail by type: ${Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t} ${n}`)
      .join(', ') || '—'}\n` +
    `Under the ${SF.LEGIBLE_FLOOR}px legibility floor: ${tiny.length} · ${Object.entries(tinyByType)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t} ${n}`)
      .join(', ') || '—'}\n\n` +
    fail
      .slice(0, 60)
      .map((r) => `#${r.n} ${r.type}${r.composition ? '/' + r.composition : ''} — ${r.failed.join(', ')}`)
      .join('\n') +
    (fail.length > 60 ? `\n… +${fail.length - 60} more` : '') +
    (tiny.length
      ? `\n\nSmallest text (most of these sizes come from production CSS, not Demo):\n` +
        tiny
          .slice()
          .sort((a, b) => a.smallest - b.smallest)
          .slice(0, 24)
          .map((r) => `#${r.n} ${r.type} — ${Math.round(r.smallest * 10) / 10}px`)
          .join('\n')
      : '');
  return rows;
}

fillFilter();
options();
show(0);

$('#demo-slide').onchange = (e) => show(Number(e.target.value));
$('#demo-filter').onchange = () => {
  options();
  show(filteredIndexes()[0] ?? 0);
};
section.querySelectorAll('[data-nav]').forEach((b) => {
  b.onclick = () => {
    const seq = filteredIndexes();
    const at = seq.indexOf(index);
    show(seq[(at + Number(b.dataset.nav) + seq.length) % seq.length]);
  };
});
$('#demo-original').onchange = () => {
  if ($('#demo-original').checked) flipMode = 'content';
  syncFlipButton();
  render();
};
$('#demo-grid').onchange = render;
$('#demo-content-mode').onclick = () => {
  if ($('#demo-original').checked) $('#demo-original').checked = false;
  flipMode = 'content';
  syncFlipButton();
  render();
};
$('#demo-layout-picker').onclick = (e) => {
  if ($('#demo-original').checked) $('#demo-original').checked = false;
  flipMode = 'content';
  syncFlipButton();
  openFeaturePicker(e.currentTarget, deck.slides[index], '');
};
$('#demo-add-heading').onclick = () => {
  if ($('#demo-original').checked) $('#demo-original').checked = false;
  flipMode = 'content';
  syncFlipButton();
  const added = addFullRowContent(deck.slides[index], 'heading');
  lastMove = added.over
    ? `Added ${added.name} · ${added.tariff}r × ${added.cols}c (${added.over} over budget)`
    : `Added ${added.name} · ${added.tariff}r × ${added.cols}c`;
  render();
};
$('#demo-add-body').onclick = () => {
  if ($('#demo-original').checked) $('#demo-original').checked = false;
  flipMode = 'content';
  syncFlipButton();
  const added = addFullRowContent(deck.slides[index], 'body');
  lastMove = added.over
    ? `Added ${added.name} · ${added.tariff}r × ${added.cols}c (${added.over} over budget)`
    : `Added ${added.name} · ${added.tariff}r × ${added.cols}c`;
  render();
};
$('#demo-split-share')?.querySelectorAll('[data-split-left]').forEach((btn) => {
  btn.onclick = () => {
    const slide = deck.slides[index];
    if (slide.type !== 'split') return;
    const left = Number(btn.dataset.splitLeft);
    const share = applySplitShare(slide, left);
    if (!share) return;
    lastMove = `Split ${share.left}/${share.right} columns`;
    render();
  };
});
$('#demo-flip').onclick = () => {
  if ($('#demo-original').checked) $('#demo-original').checked = false;
  flipMode = 'artwork';
  syncFlipButton();
  render();
};
syncFlipButton();
$('#demo-audit').onclick = () => {
  flipMode = 'content';
  syncFlipButton();
  auditAll().catch((e) => {
    auditOut.hidden = false;
    auditOut.textContent = e.message || String(e);
  });
};
window.__demoAuditAll = auditAll;

/* Exposed for tools/smoke-demo-deck.mjs: exercise the magnet without a pointer,
   and read back the rows so a test can prove they were re-stacked, not authored. */
window.__demoRows = () =>
  recipeFor(deck.slides[index]).map((r) => ({ name: r[1], col: r[2], cols: r[3], row: r[4], rows: r[5] }));
window.__demoBudget = () => budgets(recipeFor(deck.slides[index])).map((g) => ({ cols: g.cols, used: g.used, parts: g.parts }));
window.__demoMagnet = (name, dropRow) => {
  const recipe = ensureMockRecipe(deck.slides[index]);
  const idx = recipe.findIndex((r) => r[1] === name);
  if (idx < 0) throw new Error(`no slot named ${name}`);
  const result = magneticMove(recipe, idx, dropRow);
  render();
  return result && { ...result, order: result.order.map((o) => o.name) };
};
window.__demoSetTariff = (name, rows) => {
  const recipe = ensureMockRecipe(deck.slides[index]);
  const idx = recipe.findIndex((r) => r[1] === name);
  if (idx < 0) throw new Error(`no slot named ${name}`);
  const result = setSlotTariff(recipe, idx, rows);
  render();
  return result;
};
window.__demoSetCols = (name, cols) => {
  const recipe = ensureMockRecipe(deck.slides[index]);
  const idx = recipe.findIndex((r) => r[1] === name);
  if (idx < 0) throw new Error(`no slot named ${name}`);
  const result = setSlotCols(recipe, idx, cols);
  render();
  return result;
};
window.__demoSplitShare = (left) => {
  const result = applySplitShare(deck.slides[index], left);
  render();
  return result;
};

function currentRoot() {
  return stage.firstElementChild;
}

$('#demo-art-back').onclick = () => {
  const root = currentRoot();
  if (root) reorderSelected(deck.slides[index], root, -1);
};
$('#demo-art-front').onclick = () => {
  const root = currentRoot();
  if (root) reorderSelected(deck.slides[index], root, 1);
};
$('#demo-art-plane').onclick = () => {
  const root = currentRoot();
  if (!root) return;
  mutateSelected(deck.slides[index], root, (pose) => {
    pose.plane = pose.plane === 'front' ? 'back' : 'front';
  });
};
$('#demo-art-hide').onclick = () => {
  const root = currentRoot();
  if (!root) return;
  mutateSelected(deck.slides[index], root, (pose) => {
    pose.hidden = !pose.hidden;
  });
};
$('#demo-art-lock').onclick = () => {
  const root = currentRoot();
  if (!root) return;
  mutateSelected(deck.slides[index], root, (pose) => {
    pose.locked = !pose.locked;
  });
};
$('#demo-reset').onclick = () => {
  deck.slides[index] = structuredClone(baseline.slides[index]);
  show(index);
};
$('#demo-download').onclick = () => {
  const data = { format: 'slideforge-slot-mock-v1', lesson: LESSON, deck, recipes };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'layout-bank-slot-mock.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
new ResizeObserver(fit).observe(stage);

section.addEventListener('keydown', (e) => {
  if (e.target.closest('[contenteditable]')) return;
  if (e.key === 'Escape' && featurePicker) {
    e.preventDefault();
    closeFeaturePicker();
    status.textContent = 'Swap cancelled.';
    return;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    section.querySelector('[data-nav="1"]').click();
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    section.querySelector('[data-nav="-1"]').click();
  }
});
