/* Lab-only: the derived-stack prototype.
 *
 * Nothing here authors a row. Each item declares its span, its column share and
 * the gap above it; row positions are derived by stacking. That is the whole
 * point: a reorder becomes an array move instead of a coordinate rewrite, which
 * is what made the earlier canvas editor unworkable.
 *
 * Converting the authored recipes is mechanical — gapBefore is the authored row
 * minus the previous item's end — so the tables below were derived, not designed.
 */
const SF = window.SF;
const ROWS = 16;
const COLS = 12;
const LESSON = 'layout-bank';
const baseline = SF.buildLesson(LESSON);
const deck = structuredClone(baseline);
deck.showSlideNumbers = true;

/* A stack is a column of items. Two stacks side by side cover split layouts.
   `sel` finds the block the renderer already built for this slide type. */
const STACKS = {
  title: [
    { cols: 12, col: 1, items: [
      { label: 'Headline', sel: 'h1', span: 6, gapBefore: 2, cols: 12, min: 6 },
      { label: 'Subtitle', sel: '.sub', span: 3, gapBefore: 1, cols: 10, min: 8 },
      { label: 'Date', sel: '.slide-date', span: 2, gapBefore: 1, cols: 6, min: 4 },
    ] },
  ],
  section: [
    { cols: 12, col: 1, items: [
      { label: 'Headline', sel: 'h1', span: 6, gapBefore: 3, cols: 12, min: 6 },
      { label: 'Subtitle', sel: '.sub', span: 3, gapBefore: 2, cols: 10, min: 8 },
    ] },
  ],
  quote: [
    { cols: 12, col: 1, items: [
      { label: 'Quote', sel: '.q', span: 10, gapBefore: 2, cols: 12, min: 8 },
      { label: 'Attribution', sel: '.attrib', span: 2, gapBefore: 1, cols: 10, min: 6 },
    ] },
  ],
  content: [
    { cols: 12, col: 1, items: [
      { label: 'Heading', sel: 'h2', span: 2, gapBefore: 0, cols: 12, min: 6 },
      { label: 'Bullet list', sel: 'ul', span: 14, gapBefore: 0, cols: 12, min: 8 },
    ] },
  ],
  keyfact: [
    { cols: 12, col: 1, items: [
      { label: 'Heading', sel: 'h2', span: 3, gapBefore: 0, cols: 12, min: 6 },
      { label: 'Key fact', sel: '.keyfact', span: 6, gapBefore: 1, cols: 12, min: 6 },
      { label: 'Notes', sel: '.keyfact-notes', span: 5, gapBefore: 0, cols: 12, min: 8 },
    ] },
  ],
  chart: [
    { cols: 12, col: 1, items: [
      { label: 'Heading', sel: 'h2', span: 3, gapBefore: 0, cols: 12, min: 6 },
      /* A chart cannot overflow — it scales to its box — so its only failure
         mode is illegibility. `min` is the narrowest column span that keeps its
         labels readable, and it is checked like a fit. */
      { label: 'Chart', sel: '.chart-wrap', span: 11, gapBefore: 1, cols: 12, min: 8 },
    ] },
  ],
  split: [
    { cols: 7, col: 1, items: [
      { label: 'Copy', sel: '.split-copy', span: 16, gapBefore: 0, cols: 7, min: 5 },
    ] },
    { cols: 5, col: 8, items: [
      { label: 'Media', sel: '.split-media', span: 16, gapBefore: 0, cols: 5, min: 3 },
    ] },
  ],
  introduction: [
    { cols: 4, col: 1, items: [
      { label: 'Portrait', sel: '.lecturer-portrait', span: 14, gapBefore: 1, cols: 4, min: 3 },
    ] },
    { cols: 7, col: 6, items: [
      { label: 'Copy', sel: '.lecturer-copy', span: 12, gapBefore: 2, cols: 7, min: 5 },
    ] },
  ],
};

/* Row positions, derived. This function is the entire layout engine. */
function derive(stack) {
  let cursor = 1;
  const placed = stack.items.map((item) => {
    cursor += item.gapBefore;
    const row = cursor;
    cursor += item.span;
    return { ...item, row };
  });
  return { placed, used: cursor - 1, remainder: ROWS - (cursor - 1) };
}

const section = document.createElement('section');
section.id = 'stack-deck';
section.innerHTML = `<h2>Stack · magnetic reorder</h2>
<p>No row is authored. Each item carries a span, a column share and the gap above it; rows are derived by stacking. Drag an item up or down — the others move aside, like magnets. A reorder can never break the budget, because each gap travels with the item above it.</p>
<div class="stack-toolbar">
  <label>Slide <select id="stack-slide"></select></label>
  <label><input type="checkbox" id="stack-grid" checked> Show lattice</label>
  <button type="button" id="stack-reset">Reset this slide</button>
</div>
<div class="stack-workspace">
  <div class="stack-stage"></div>
  <aside class="stack-budget" aria-label="Row budget"></aside>
</div>
<p class="stack-status" role="status"></p>
<p class="stack-scope">Prototype. Reorder is an array move; insert, delete and resize are the same operation under one invariant — spans plus gaps must not exceed ${ROWS} rows.</p>`;
(document.querySelector('#demo-deck') || document.querySelector('#safe-deck') || document.querySelector('.lab-contract')).after(section);

const $ = (s) => section.querySelector(s);
const stage = $('.stack-stage');
const budgetEl = $('.stack-budget');
const statusEl = $('.stack-status');

/* One slide per supported type, so every stack shape is reachable. */
const supported = Object.keys(STACKS)
  .map((type) => ({ type, index: deck.slides.findIndex((s) => s.type === type) }))
  .filter((e) => e.index >= 0);
let current = supported[0];
let stacks = structuredClone(STACKS[current.type]);
let revision = 0;

function options() {
  const select = $('#stack-slide');
  select.replaceChildren();
  for (const entry of supported) {
    const o = document.createElement('option');
    o.value = entry.type;
    o.textContent = `${entry.type} · slide ${entry.index + 1}`;
    select.append(o);
  }
  select.value = current.type;
}

function paintBudget() {
  budgetEl.replaceChildren();
  stacks.forEach((stack, s) => {
    const { placed, used, remainder } = derive(stack);
    const box = document.createElement('div');
    box.className = 'stack-budget-col';
    const sum = placed.map((p) => `${p.gapBefore ? p.gapBefore + '+' : ''}${p.span}`).join(' + ');
    box.innerHTML = `<strong>${stacks.length > 1 ? `Stack ${s + 1} · ${stack.cols}c` : 'Row budget'}</strong>
      <span class="stack-sum">${sum || '—'} = ${used} of ${ROWS}</span>
      <span class="stack-left${remainder < 0 ? ' is-over' : ''}">${remainder < 0 ? `${-remainder} over` : `${remainder} spare`}</span>`;
    const list = document.createElement('ol');
    placed.forEach((p, i) => {
      const li = document.createElement('li');
      li.textContent = `${p.label} · rows ${p.row}–${p.row + p.span - 1} · ${p.cols}c`;
      li.dataset.stack = s;
      li.dataset.item = i;
      list.append(li);
    });
    box.append(list);
    budgetEl.append(box);
  });
}

async function render() {
  const run = ++revision;
  const slide = deck.slides[current.index];
  const root = SF.renderSlide(deck, slide, { index: current.index, total: deck.slides.length, revealed: 99 });
  root.classList.add('safe-slotted', 'stack-slotted');
  root.classList.toggle('safe-grid', $('#stack-grid').checked);
  const owner = root.querySelector('.cp-body') || root.querySelector('.pad') || root;
  const body = document.createElement('div');
  body.className = 'safe-body stack-body';

  for (const [s, stack] of stacks.entries()) {
    const { placed } = derive(stack);
    for (const [i, item] of placed.entries()) {
      const node = owner.querySelector(item.sel);
      if (!node) continue;
      const box = document.createElement('div');
      box.className = 'safe-slot stack-slot';
      box.style.gridArea = `${item.row} / ${stack.col} / span ${item.span} / span ${item.cols}`;
      box.dataset.name = item.label;
      box.dataset.label = `${item.label} · ${item.span}r × ${item.cols}c`;
      box.dataset.stack = String(s);
      box.dataset.item = String(i);
      box.draggable = true;
      box.append(node);
      body.append(box);
    }
  }
  if (root.querySelector('.cp-body')) owner.replaceWith(body);
  else {
    owner.replaceChildren(body);
    root.classList.add('safe-generic', 'demo-slotted');
  }

  stage.replaceChildren(root);
  fit();
  paintBudget();
  statusEl.textContent = 'Measuring…';
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll('img')].map((i) =>
    Promise.race([i.decode().catch(() => {}), new Promise((r) => setTimeout(r, 400))])));
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (run !== revision) return null;
  bindDrag(root, body);
  return measure(root);
}

/* Scale between an SVG's user units and its painted box; 1 for ordinary HTML. */
function svgScale(el) {
  const svg = el.ownerSVGElement;
  if (!svg) return 1;
  const view = svg.viewBox?.baseVal;
  const box = svg.getBoundingClientRect();
  if (!view?.width || !view.height || !box.width) return 1;
  return Math.min(box.width / view.width, box.height / view.height);
}

function measure(root) {
  const failed = [];
  const narrow = [];
  for (const box of root.querySelectorAll('.stack-slot')) {
    const r = box.getBoundingClientRect();
    let bad = box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    let smallest = null;
    while (walk.nextNode()) {
      if (walk.currentNode.textContent.trim().length < 3) continue;
      const el = walk.currentNode.parentElement;
      if (!el || !el.getBoundingClientRect().height) continue;
      const size = parseFloat(getComputedStyle(el).fontSize) * svgScale(el);
      if (smallest == null || size < smallest) smallest = size;
      const range = document.createRange();
      range.selectNodeContents(walk.currentNode);
      for (const t of range.getClientRects())
        if (t.bottom > r.bottom + 1 || t.right > r.right + 1 || t.left < r.left - 1) bad = true;
    }
    const stack = stacks[Number(box.dataset.stack)];
    const item = stack.items[Number(box.dataset.item)];
    /* A vector block scales instead of overflowing, so too-narrow is its own
       failure and has to be reported separately from fit. */
    if (item && item.cols < item.min) narrow.push(`${item.label} needs ${item.min} columns`);
    box.classList.toggle('safe-overflow', bad);
    if (bad) failed.push(box.dataset.name);
  }
  const over = stacks.map((s) => derive(s).remainder).filter((r) => r < 0);
  if (over.length) failed.push(`${-Math.min(...over)} rows over budget`);
  const problems = [...failed, ...narrow];
  statusEl.dataset.fits = String(!problems.length);
  statusEl.textContent = problems.length
    ? `Needs attention: ${problems.join(', ')}. Nothing is auto-shrunk.`
    : `${current.type} · ${stacks.reduce((n, s) => n + s.items.length, 0)} items derived from stacks · every row position computed, none authored.`;
  return { failed, narrow };
}

/* Magnetic reorder. A stack has no "over" — only before and after — so the drop
   target is a gap between items, and there are items.length + 1 of them. */
let dragging = null;

function bindDrag(root, body) {
  const marker = document.createElement('div');
  marker.className = 'stack-marker';
  marker.hidden = true;
  body.append(marker);

  for (const box of root.querySelectorAll('.stack-slot')) {
    box.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[contenteditable]')) return;
      const s = Number(box.dataset.stack);
      const i = Number(box.dataset.item);
      dragging = { stack: s, item: i, box };
      box.classList.add('is-dragging');
      box.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!dragging || dragging.box !== box) return;
      const to = dropIndex(body, dragging.stack, e.clientY);
      showMarker(marker, body, dragging.stack, to);
    });
    box.addEventListener('pointerup', (e) => {
      if (!dragging || dragging.box !== box) return;
      const to = dropIndex(body, dragging.stack, e.clientY);
      box.classList.remove('is-dragging');
      marker.hidden = true;
      const { stack, item } = dragging;
      dragging = null;
      move(stack, item, to);
    });
    box.addEventListener('lostpointercapture', () => {
      box.classList.remove('is-dragging');
      marker.hidden = true;
      dragging = null;
    });
  }
}

/* Which gap is the pointer nearest? Compare against each item's midline in row
   space, so the answer is one number and there is no pixel precision to lose. */
function dropIndex(body, s, clientY) {
  const grid = body.getBoundingClientRect();
  const pitch = grid.height / ROWS;
  const { placed } = derive(stacks[s]);
  const row = (clientY - grid.top) / pitch + 1;
  let index = 0;
  for (const item of placed) if (row > item.row + item.span / 2) index++;
  return index;
}

function showMarker(marker, body, s, index) {
  const { placed } = derive(stacks[s]);
  const row = index >= placed.length
    ? (placed.length ? placed[placed.length - 1].row + placed[placed.length - 1].span : 1)
    : placed[index].row;
  const stack = stacks[s];
  /* Marker lives in .safe-body's local (unscaled) space — 36px rows, 65+36 cols.
     Using getBoundingClientRect().height/16 here put the bar on the wrong lines
     whenever the stage was scaled below 1280. */
  marker.hidden = false;
  marker.style.top = `${(row - 1) * 36}px`;
  marker.style.left = `${(stack.col - 1) * (65 + 36)}px`;
  marker.style.width = `${stack.cols * 65 + (stack.cols - 1) * 36}px`;
  marker.dataset.index = String(index);
}

/* The move itself: an array splice. The gap above an item travels with it, which
   is why a reorder is always budget-neutral — the multiset of spans and gaps is
   unchanged, so their sum cannot change. */
function move(s, from, to) {
  const items = stacks[s].items;
  if (to === from || to === from + 1) {
    render();
    return;
  }
  const [item] = items.splice(from, 1);
  items.splice(to > from ? to - 1 : to, 0, item);
  render();
}

function fit() {
  const root = stage.firstElementChild;
  if (!root) return;
  const scale = stage.clientWidth / 1280;
  root.style.transform = `scale(${scale})`;
  stage.style.height = `${720 * scale}px`;
}

function show(type) {
  current = supported.find((e) => e.type === type) || supported[0];
  stacks = structuredClone(STACKS[current.type]);
  options();
  render();
}

$('#stack-slide').onchange = (e) => show(e.target.value);
$('#stack-grid').onchange = () => render();
$('#stack-reset').onclick = () => show(current.type);

/* Exposed for tools/smoke-stack-deck.mjs: reorder without a pointer. */
window.__stackMove = (s, from, to) => {
  move(s, from, to);
  return derive(stacks[s]);
};
window.__stackState = () => stacks.map((s) => ({ cols: s.cols, col: s.col, ...derive(s) }));
window.__stackDropIndex = (s, clientY) => dropIndex(stage.querySelector('.stack-body'), s, clientY);

new ResizeObserver(fit).observe(stage);
options();
show(current.type);
