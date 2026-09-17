/* Lab-only: apply Safe-style slot lattice to all 97 NUL layout-bank slides.
   Prototype — does not write Library decks or production CSS. */
const SF = window.SF;
const LESSON = 'layout-bank';
const baseline = SF.buildLesson(LESSON);
let deck = structuredClone(baseline);
let index = 0;
let revision = 0;
/** content = edit slots; artwork = freeform move of theme assets with lattice snap */
let flipMode = 'content';
let selectedArt = null;
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
  </div>
  <p class="safe-status demo-status" role="status"></p>
  <div class="safe-recipe demo-recipe"></div>
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
  return recipes[slide.type] || [
    H('h1,h2', 'Heading'),
    BODY('.pad > *:not(h1):not(h2):not(.accent-bar):not(.slide-logo):not(.pagenum):not(.track)', 'Body'),
  ];
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
      if (pose.locked || slide.mockArt[key].locked) {
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
    });
  }
}

async function render() {
  const run = ++revision;
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
    const owner = root.querySelector('.cp-body') || root.querySelector('.pad') || root;
    const body = document.createElement('div');
    body.className = 'safe-body';
    const specs = recipeFor(slide);
    for (const [sel, name, col, cols, row, rows] of specs) {
      const node = pick(owner, sel);
      if (!node) continue;
      const box = document.createElement('div');
      box.className = 'safe-slot';
      box.style.gridArea = `${row} / ${col} / span ${rows} / span ${cols}`;
      box.dataset.name = name;
      box.dataset.label = `${name} · ${rows}r × ${cols}c`;
      box.append(node);
      body.append(box);
      used.push({ name, col, cols, row, rows });
    }
    if (root.querySelector('.cp-body')) owner.replaceWith(body);
    else {
      owner.replaceChildren(body);
      root.classList.add('safe-generic');
    }
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
    for (const box of root.querySelectorAll('.safe-slot')) {
      const r = box.getBoundingClientRect();
      let bad = box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
      /* Charts/media often paint labels on the rim; scroll fit is the contract. */
      const skipGlyphs = /chart|image|media|video|mind map|join|game/i.test(box.dataset.name || '');
      if (!skipGlyphs) {
        const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          if (!walk.currentNode.textContent.trim()) continue;
          for (const word of walk.currentNode.textContent.matchAll(/\S+/g)) {
            const range = document.createRange();
            range.setStart(walk.currentNode, word.index);
            range.setEnd(walk.currentNode, word.index + word[0].length);
            for (const t of range.getClientRects()) {
              if (t.bottom > r.bottom + 1 || t.right > r.right + 1 || t.left < r.left - 1) bad = true;
            }
          }
        }
      }
      box.classList.toggle('safe-overflow', bad);
      if (bad) failed.push(box.dataset.name);
    }
    let smallest = null, smallestWhere = '';
    for (const box of root.querySelectorAll('.safe-slot')) {
      const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        if (walk.currentNode.textContent.trim().length < 3) continue;
        const el = walk.currentNode.parentElement;
        if (!el || !el.offsetHeight) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (smallest == null || size < smallest) { smallest = size; smallestWhere = el.className || el.tagName; }
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
      : `Slide ${index + 1} / ${deck.slides.length} · ${slide.type} · All ${used.length} slots fit · 16×12${bleedNote}${tiny}`;
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
  return measure();
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
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    section.querySelector('[data-nav="1"]').click();
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    section.querySelector('[data-nav="-1"]').click();
  }
});
