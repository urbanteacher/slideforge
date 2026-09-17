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
/** Click ⇄ twice to swap any two Demo features (same slide or across slides). */
/* The open feature picker, if any. Replaces the old arm-then-click-another-slot
   swap, which exchanged slot geometry rather than changing what the slide is. */
let featurePicker = null;
deck.showSlideNumbers = true;

/* Recipes: [selector, label, col, cols, row, rows]
   Selectors resolve inside .pad (NUL layouts rarely use .cp-body). */
/* Default body recipe: heading 3 rows (wraps), body from row 5 for 12 rows. */
const H = (sel = 'h2', name = 'Heading') => [sel, name, 1, 12, 1, 3];
const BODY = (sel, name, row = 5, rows = 12) => [sel, name, 1, 12, row, rows];

const recipes = {
  title: [
    ['h1', 'Headline', 1, 12, 3, 6],
    ['.sub', 'Subtitle', 1, 10, 10, 3],
    ['.slide-date', 'Date', 1, 6, 14, 2],
  ],
  statement: [
    ['.statement', 'Statement', 1, 12, 3, 11],
    ['.statement-credit', 'Credit', 1, 10, 15, 1],
  ],
  content: [
    ['h2', 'Heading', 1, 12, 1, 2],
    ['ul', 'Bullet list', 1, 12, 3, 14],
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
    ['h2', 'Heading', 1, 12, 1, 2],
    ['.compare', 'Compare', 1, 12, 3, 14],
  ],
  funnel: [H(), BODY('.funnel, ol, ul', 'Funnel')],
  timeline: [H(), BODY('.timeline, ol, ul', 'Timeline')],
  cards: [H(), BODY('.cards-stack, .cards, .card-grid', 'Cards')],
  keywords: [H(), BODY('.kw-list, ul', 'Keywords')],
  italics: [H(), BODY('.italics, ul, .pad > div:not(.accent-bar)', 'Body')],
  table: [H(), BODY('.tbl, table', 'Table')],
  code: [H(), BODY('.code-frame', 'Code')],
  chart: [
    ['h2', 'Heading', 1, 12, 1, 2],
    ['.chart-wrap', 'Chart', 1, 12, 3, 11],
    ['.chart-key', 'Key', 1, 12, 15, 2],
  ],
  image: [
    ['.img', 'Image · BLEED', 1, 12, 1, 12],
    ['.cap', 'Caption', 1, 12, 13, 4],
  ],
  split: [
    /* Copy takes 7 of 12: at 6 columns (570px) the longest bank slide needed 594
       in 576. A wider measure costs the picture 101px and shrinks no type. */
    ['.split-copy', 'Copy · BLEED', 1, 7, 1, 16],
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

/* Text this small passes geometry and still cannot be read from the back of a
   room: 20px on a 1280x720 slide is 2.8% of slide height. Measured, not enforced —
   most sub-floor sizes come from production CSS, not from Demo's overrides. */
const LEGIBLE_FLOOR = 20;
const ROWS = 16;

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

/* Scale between an SVG's user units and its painted box. 1 for ordinary HTML. */
function svgScale(el) {
  const svg = el.ownerSVGElement;
  if (!svg) return 1;
  const view = svg.viewBox?.baseVal;
  const box = svg.getBoundingClientRect();
  if (!view || !view.width || !view.height || !box.width) return 1;
  return Math.min(box.width / view.width, box.height / view.height);
}

const bleedTypes = new Set(['image', 'split', 'video']);

const section = document.createElement('section');
section.id = 'demo-deck';
section.innerHTML = `
  <h2>Demo · layout bank (97)</h2>
  <p>
    Same slot engine as Safe, applied to every NUL layout-bank slide.
    Use this to see which types fit the 16×12 lattice and which need a new recipe or BLEED rule — before changing production styles.
  </p>
  <div class="safe-toolbar demo-toolbar">
    <button type="button" data-nav="-1">← Previous</button>
    <select aria-label="Demo slide" id="demo-slide"></select>
    <button type="button" data-nav="1">Next →</button>
    <label>Filter
      <select id="demo-filter" aria-label="Filter by type">
        <option value="">All types</option>
      </select>
    </label>
    <label><input type="checkbox" id="demo-original"> Original design</label>
    <label><input type="checkbox" id="demo-grid" checked> Show slots</label>
    <button type="button" id="demo-flip" aria-pressed="false">Flip · artwork</button>
    <button type="button" id="demo-audit">Audit all 97</button>
    <button type="button" id="demo-download">Download mock JSON</button>
    <button type="button" id="demo-reset">Reset this slide</button>
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
  <p class="safe-status demo-status" role="status"></p>
  <div class="safe-recipe demo-recipe"></div>
  <div class="demo-budget" aria-label="Row budget"></div>
  <pre class="demo-audit-out" hidden></pre>
  <p class="safe-scope">
    Prototype only. Fits/fails are measured against declared slots.
    Production northeastern CSS is not modified. BLEED types (image, split, video) still use the lattice so overflow is visible.
    Flip separates content (front face) from decoration (back face) — no always-on Layers panel.
  </p>
`;

const host = document.querySelector('#safe-deck') || document.querySelector('#playground') || document.querySelector('.lab-contract');
host.after(section);

const $ = (s) => section.querySelector(s);
const stage = $('.demo-stage');
const status = $('.demo-status');
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
}

function openFeaturePicker(button, slide, slotName) {
  closeFeaturePicker();
  /* Contained in the workspace column beside the canvas, not floating over it.
     A popover here anchored against the page rather than the section — #demo-deck
     is not positioned — so it landed on top of the playground, half of it cut off. */
  const pop = $('#demo-feature-panel');
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
  render().then((result) => {
    const now = SF.SLIDE_TYPES[type]?.label || type;
    const shown = pointsBefore && SF.BULLET_LAYOUTS.includes(type);
    const fitted = !result?.failed?.length;
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
    reportSwapFit(lastMove, result);
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
  const boxes = [...body.querySelectorAll('.safe-slot')];

  for (const box of boxes) {
    const idx = Number(box.dataset.recipeIndex);
    if (!Number.isFinite(idx) || !recipe[idx]) continue;

    const tools = document.createElement('div');
    tools.className = 'demo-slot-tools';
    box.append(tools);

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'demo-slot-grip';
    grip.title = 'Drag up or down to reorder (the rest move aside). Drag sideways to change columns.';
    grip.setAttribute('aria-label', `Move ${box.dataset.name}`);
    grip.textContent = '⠿';
    tools.append(grip);

    const swapBtn = document.createElement('button');
    swapBtn.type = 'button';
    swapBtn.className = 'demo-slot-swap';
    swapBtn.title = "Swap this slide's feature \u2014 pick from the list. The heading carries over.";
    swapBtn.setAttribute('aria-label', `Swap feature on this slide (${box.dataset.name})`);
    swapBtn.setAttribute('aria-haspopup', 'dialog');
    swapBtn.textContent = '\u21c4';
    tools.append(swapBtn);

    swapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (flipMode === 'artwork') return;
      if (featurePicker) {
        closeFeaturePicker();
        return;
      }
      openFeaturePicker(swapBtn, slide, box.dataset.name);
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

/** Safe lattice pitch on the 1280×720 slide (body origin 52,88). */
const SNAP_X = 101; /* 65 col + 36 gutter */
const SNAP_Y = 36;
const BODY_LEFT = 52;
const BODY_TOP = 88;

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
  const btn = $('#demo-flip');
  const art = flipMode === 'artwork';
  btn.setAttribute('aria-pressed', String(art));
  btn.textContent = art ? 'Flip · content' : 'Flip · artwork';
  btn.title = art
    ? 'Return to content slots (structure editing)'
    : 'Flip canvas: move background assets freely; content stays locked';
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
  const body = document.createElement('div');
  body.className = 'safe-body';
  const specs = recipeFor(slide);
  if (!slide.mockRecipe) slide.mockRecipe = specs.map((r) => r.slice());
  specs.forEach((spec, recipeIndex) => {
    const [sel, name, col, cols, row, rows] = spec;
    const node = pick(owner, sel);
    if (!node) return;
    const box = document.createElement('div');
    box.className = 'safe-slot';
    box.style.gridArea = `${row} / ${col} / span ${rows} / span ${cols}`;
    box.dataset.name = name;
    box.dataset.label = `${name} · ${rows}r × ${cols}c`;
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
  return used;
}

/* Which slots overflow. The per-word check is skipped for blocks that paint on
   their own rim; scroll fit is the contract for those. */
function overflowIn(root) {
  const failed = [];
  for (const box of root.querySelectorAll('.safe-slot')) {
    const r = box.getBoundingClientRect();
    let bad = box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
    if (!/chart|image|media|video|mind map|join|game/i.test(box.dataset.name || '')) {
      const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        if (!walk.currentNode.textContent.trim()) continue;
        for (const word of walk.currentNode.textContent.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(walk.currentNode, word.index);
          range.setEnd(walk.currentNode, word.index + word[0].length);
          for (const t of range.getClientRects())
            if (t.bottom > r.bottom + 1 || t.right > r.right + 1 || t.left < r.left - 1) bad = true;
        }
      }
    }
    box.classList.toggle('safe-overflow', bad);
    if (bad) failed.push(box.dataset.name);
  }
  return failed;
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
    floor: LEGIBLE_FLOOR,
    settle: async () => {
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    },
    /* Rearrange before settling, measure after: the lattice has to be laid out
       before overflowIn reads it, or every block looks like it fits. */
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
        ? { placed: lastPlaced.length, failed: overflowIn(root) }
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
    const i = Number(key.split('.')[1]);
    const read = () => (bullet ? slide.bullets?.[i] : slide[key]);
    const write = (v) => {
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
      /* Bold, italic, underline, highlight, colour and links come from the app's
         own canvas editor (SF.Custom.openCanvasEditor) rather than a lab copy, so
         the marks land in slide.formatting and paint through the same renderer
         path. Typing stays in place; double-click asks for the toolbar. */
      n.addEventListener('dblclick', (e) => {
        if (!SF.Custom || !SF.Custom.openCanvasEditor) return;
        e.preventDefault();
        e.stopPropagation();
        const box = n.closest('.safe-slot') || n.parentElement;
        n.blur();
        SF.Custom.openCanvasEditor(box, slide, key, {
          onSave: () => {
            lastMove = `Formatted ${key}`;
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

  if (!original) {
    root.classList.add('safe-slotted', 'demo-slotted');
    root.classList.toggle('safe-grid', $('#demo-grid').checked || artwork);
    root.classList.toggle('demo-flip-art', artwork);
    used.push(...slotify(root, slide));
  }

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

  function measure() {
    if (original) {
      status.dataset.fits = 'original';
      status.textContent = 'Original design for comparison.';
      return { failed: [] };
    }
    if (artwork) return { failed: [] };
    const failed = [];
    /* A slide with no slots used to report "All 0 slots fit": measure() loops over
       the boxes, and zero boxes means zero failures. Swapping a wordy slide to
       Image, Image stack or Video hits this — the layout renders a placeholder
       with no .img/.vid for the recipe to find, so nothing is placed at all, and
       the status claimed a pass while the recipe line said "No recipe matches". */
    if (!used.length) {
      failed.push(`nothing placed: a ${slide.type} slide needs a picture or video, and this one has none`);
    }
    failed.push(...overflowIn(root));

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

    let smallest = null, smallestWhere = '';
    for (const box of root.querySelectorAll('.safe-slot')) {
      const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        if (walk.currentNode.textContent.trim().length < 3) continue;
        const el = walk.currentNode.parentElement;
        /* offsetHeight is undefined on SVG elements, so testing it skipped every
           chart label. Use the painted rect instead. */
        if (!el || !el.getBoundingClientRect().height) continue;
        /* An SVG paints its text at the viewBox scale, not at the declared size:
           a chart in a narrow slot shrinks rather than overflowing, so declared
           font-size overstates what the room actually sees. */
        const size = parseFloat(getComputedStyle(el).fontSize) * svgScale(el);
        const name = el.className?.baseVal || el.className || el.tagName;
        if (smallest == null || size < smallest) { smallest = size; smallestWhere = name; }
      }
    }
    status.dataset.fits = String(!failed.length);
    status.dataset.smallest = smallest == null ? '' : String(Math.round(smallest * 10) / 10);
    const tiny = smallest != null && smallest < LEGIBLE_FLOOR
      ? ` · smallest text ${Math.round(smallest)}px in .${String(smallestWhere).split(' ')[0]} (under the ${LEGIBLE_FLOOR}px floor)`
      : '';
    const bleedNote = isBleed ? ' · BLEED candidate' : '';
    status.textContent = failed.length
      ? `Needs more space: ${failed.join(', ')}. Text is not auto-shrunk.${bleedNote}`
      : `${lastMove ? lastMove + ' · ' : ''}Slide ${index + 1} / ${deck.slides.length} · ${slide.type} · All ${used.length} slots fit · 16×12${bleedNote}${tiny}`;
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
    status.textContent = `${status.textContent} · ⠿ move · ⇄ swap (fit re-checked)`;
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
      legible: result.smallest == null || result.smallest >= LEGIBLE_FLOOR,
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
    `Under the ${LEGIBLE_FLOOR}px legibility floor: ${tiny.length} · ${Object.entries(tinyByType)
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
$('#demo-flip').onclick = () => {
  if ($('#demo-original').checked) $('#demo-original').checked = false;
  flipMode = flipMode === 'artwork' ? 'content' : 'artwork';
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
