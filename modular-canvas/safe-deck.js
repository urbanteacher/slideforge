/* Lab-only acceptance deck. Reuses semantic renderer blocks; recipes own placement.
   No writes to the main editor, Library or saved decks. */
const SF = window.SF;
const baseline = SF.buildLesson('aiad27-safe');
let deck = structuredClone(baseline),
  index = 1,
  revision = 0;
deck.showSlideNumbers = true;

/** Awareness Day furniture: fixed header/footer bands, movable left/centre/right items. */
function enableNamedChrome(slide) {
  if (!slide.design) slide.design = {};
  slide.design = { ...slide.design, chromeLayout: 'regions' };
}
for (const s of deck.slides) enableNamedChrome(s);

const recipes = {
  content: [
    ['h2', 'Heading', 1, 12, 1, 2],
    ['ul', 'Bullet list', 1, 12, 4, 12],
  ],
  title: [
    ['.cp-eyebrow', 'Eyebrow', 1, 7, 5, 1],
    ['h1', 'Headline', 1, 7, 6, 6],
    ['.cp-tagline', 'Tagline', 1, 7, 13, 1],
    ['.cp-art', 'Artwork', 8, 5, 2, 14],
  ],
  quote: [
    ['.cp-quote-mark', 'Quote mark', 1, 2, 3, 8],
    ['.cp-eyebrow', 'Eyebrow', 3, 10, 3, 1],
    ['.cp-scenario', 'Voice', 3, 10, 5, 10],
  ],
  cards: [
    ['.cp-heading', 'Heading', 1, 12, 2, 2],
    ['.cp-choices', 'Voting block', 1, 12, 5, 11],
    ['.cp-prompt', 'Instruction', 1, 12, 16, 1],
  ],
  statement: [
    ['.cp-eyebrow', 'Eyebrow', 1, 12, 3, 1],
    ['.cp-discussion', 'Discussion block', 1, 12, 5, 10],
  ],
  iceberg: [
    ['.cp-heading', 'Heading', 1, 12, 2, 2],
    ['.cp-risk-map', 'Risk diagram', 1, 12, 5, 10],
    ['.cp-source', 'Source', 1, 12, 16, 1],
  ],
  journey: [
    ['.cp-heading', 'Heading', 1, 12, 1, 2],
    ['.cp-rules', 'Numbered rules', 1, 12, 3, 12],
    ['.cp-closing-line', 'Supporting line', 1, 12, 16, 1],
  ],
  keyfact: [
    ['.cp-action-number', 'Action mark', 1, 3, 3, 9],
    ['.cp-eyebrow', 'Eyebrow', 4, 9, 3, 1],
    ['.cp-action h2', 'Headline', 4, 9, 5, 4],
    ['.cp-action > p:not([class])', 'Prompt', 4, 9, 10, 3],
    ['.cp-write-line', 'Response line', 4, 9, 14, 2],
  ],
  keywords: [
    ['h2', 'Heading', 1, 12, 1, 2],
    ['.kw-list', 'Vocabulary block', 1, 12, 4, 12],
  ],
};
const names = [
  'Teacher preparation',
  'Poster opener',
  'Scenario',
  'Vote',
  'Pair talk',
  'Risk reveal',
  'Rules',
  'Commitment',
  'Vocabulary',
];
const CHROME_LABELS = {
  identitySlot: 'Identity',
  logoSlot: 'Logo',
  contextSlot: 'Context',
  closingSlot: 'Closing',
  numberSlot: 'Page no.',
};

const section = document.createElement('section');
section.id = 'safe-deck';
section.innerHTML = `<h2>Safe · the full-deck test</h2>
<p class="lab-role is-behind">Acceptance test for the nine real campaign slides. Behind Demo: no legibility floor, no reorder, and its fit check still measures declared type size rather than painted.</p>
<p>Build the campaign with reusable slots and existing specialist blocks. Header and footer bands stay fixed; drag the ✥ handles to swap identity / context / logo (and footer closing / page number) between left · centre · right. Changes stay in this mock until you download them.</p>
<div class="safe-toolbar"><button type="button" data-nav="-1">← Previous</button><select aria-label="Safe slide" id="safe-slide"></select><button type="button" data-nav="1">Next →</button><label><input type="checkbox" id="safe-audience"> Audience sequence</label><label><input type="checkbox" id="safe-original"> Original design</label><label><input type="checkbox" id="safe-grid" checked> Show slots</label><label><input type="checkbox" id="safe-chrome" checked> Named chrome</label><label id="safe-columns-label">Copy / artwork <select id="safe-columns"><option value="6">6 / 6</option><option value="7">7 / 5</option><option value="8">8 / 4</option></select></label><button type="button" id="safe-download">Download snapshot</button><button type="button" id="safe-reset">Reset this slide</button></div>
<div class="safe-workspace">
  <div class="safe-stage"></div>
  <aside class="safe-chrome-map" id="safe-chrome-map" hidden aria-label="Header and footer map">
    <header><strong>Chrome</strong><span>bands fixed · items move</span></header>
    <p class="safe-chrome-face">Header: identity · context (optional) · logo. Footer: closing · page number. Hover a band item and drag its handle, or click to pick a slot (occupied slots swap). Or click two cells here to swap.</p>
    <div class="safe-chrome-band" data-band="header"><span class="safe-chrome-band-label">Header</span><div class="safe-chrome-cells" data-band-cells="header"></div></div>
    <div class="safe-chrome-band" data-band="footer"><span class="safe-chrome-band-label">Footer</span><div class="safe-chrome-cells" data-band-cells="footer"></div></div>
  </aside>
</div>
<p class="safe-status" role="status"></p><div class="safe-recipe"></div><details><summary>Presenter notes</summary><p class="safe-notes"></p></details>
<p class="safe-scope">Prototype: slot placement, named chrome rearrange, and content review. Voting uses the existing visual block; live voting is not hosted here. Downloaded JSON is a mock snapshot, not yet a main-editor import format.</p>`;
document.querySelector('#playground').after(section);

const $ = (s) => section.querySelector(s);
const stage = $('.safe-stage');
const chromeMap = $('#safe-chrome-map');

function sequence() {
  return deck.slides.map((s, i) => i).filter((i) => !$('#safe-audience').checked || !deck.slides[i].hidden);
}
function options() {
  const select = $('#safe-slide');
  select.replaceChildren();
  for (const i of sequence()) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${i + 1}. ${names[i]}${deck.slides[i].hidden ? ' · hidden' : ''}`;
    select.append(o);
  }
  select.value = index;
}
function controls() {
  const slide = deck.slides[index];
  $('#safe-columns-label').hidden = slide.type !== 'title';
  $('#safe-columns').value = slide.mockColumns || 7;
  $('.safe-notes').textContent = slide.notes || 'No notes.';
}
function syncChromeToggle(slide) {
  const on = $('#safe-chrome').checked && !$('#safe-original').checked;
  if (on) enableNamedChrome(slide);
  else if (slide.design) slide.design = { ...slide.design, chromeLayout: '' };
  chromeMap.hidden = !on;
  section.classList.toggle('safe-chrome-on', on);
  delete chromeMap.dataset.pending;
}
function paintChromeMap(slide, root) {
  if (chromeMap.hidden || !root.classList.contains('chrome-regions')) {
    chromeMap.hidden = true;
    return;
  }
  const positions = SF.chromePositions(slide.design || {});
  const bySlot = {};
  for (const [key, slot] of Object.entries(positions)) {
    if (root.querySelector(`[data-chrome-item="${key}"]`)) bySlot[slot] = key;
  }
  for (const band of ['header', 'footer']) {
    const cells = $(`[data-band-cells="${band}"]`);
    cells.replaceChildren();
    for (const side of ['left', 'center', 'right']) {
      const slot = `${band}-${side}`;
      const key = bySlot[slot];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'safe-chrome-cell' + (key ? ' is-filled' : '');
      if (chromeMap.dataset.pending === key) cell.classList.add('is-pending');
      cell.dataset.snapSlot = slot;
      cell.textContent = key ? CHROME_LABELS[key] : '·';
      cell.title = key
        ? `${CHROME_LABELS[key]} · click another cell to move here (swap if occupied)`
        : `Empty ${band} ${side}`;
      cell.onclick = () => {
        if (!key && !chromeMap.dataset.pending) return;
        if (!chromeMap.dataset.pending) {
          chromeMap.dataset.pending = key;
          paintChromeMap(slide, root);
          return;
        }
        const from = chromeMap.dataset.pending;
        delete chromeMap.dataset.pending;
        if (from && SF.setChromeSlot(slide, from, slot)) render();
        else paintChromeMap(slide, root);
      };
      cells.append(cell);
    }
  }
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
    const read = () => (bullet ? slide.bullets[i] : slide[key]);
    const write = (v) => {
      if (bullet) slide.bullets[i] = v;
      else slide[key] = v;
    };
    nodes.forEach((n, j) => {
      const part = bullet && slide.type === 'iceberg' ? [1, 0, 2][j] : j;
      const split = bullet && (read() || '').includes('\t');
      const value = () => (split ? (read() || '').split('\t')[part] || '' : read() || '');
      const save = (v) => {
        if (split) {
          const parts = (read() || '').split('\t');
          parts[part] = v;
          write(parts.join('\t'));
        } else write(v);
      };
      n.contentEditable = 'plaintext-only';
      n.setAttribute('role', 'textbox');
      n.setAttribute('aria-multiline', 'true');
      n.setAttribute('aria-label', bullet ? `Item ${i + 1}, part ${part + 1}` : key);
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
function fit() {
  const root = stage.firstElementChild;
  if (!root) return;
  const scale = stage.clientWidth / 1280;
  root.style.transform = `scale(${scale})`;
  stage.style.height = 720 * scale + 'px';
}
async function render() {
  const run = ++revision;
  const slide = deck.slides[index];
  const original = $('#safe-original').checked;
  syncChromeToggle(slide);
  const rendered = structuredClone(slide);
  for (const key of ['subtitle', 'body']) {
    if (!rendered[key] && baseline.slides[index][key]) rendered[key] = '\u200b';
  }
  const root = SF.renderSlide(deck, rendered, { index, total: deck.slides.length });
  const audience = deck.slides.slice(0, index + 1).filter((s) => !s.hidden).length;
  let number = root.querySelector('.pagenum');
  if (!number && !slide.hidden) {
    number = document.createElement('div');
    number.className = 'pagenum';
    (root.querySelector('.cp-footer') || root).append(number);
  }
  if (number) number.textContent = slide.hidden ? '' : `${audience} / 7`;
  if (
    !original &&
    slide.design?.chromeLayout === 'regions' &&
    root.classList.contains('composition-structured')
  ) {
    if (!root.classList.contains('chrome-regions')) {
      SF.applyChromeRegions(root, slide, deck);
    } else if (number && !number.dataset.chromeItem) {
      const slotName = SF.chromePositions(slide.design).numberSlot;
      const slot = root.querySelector(`[data-region="${slotName}"]`);
      if (slot) {
        number.dataset.chromeItem = 'numberSlot';
        slot.appendChild(number);
      }
    }
  }
  const track = root.querySelector('.track i');
  if (track) track.style.width = (audience / 7) * 100 + '%';
  const used = [];
  if (!original) {
    root.classList.add('safe-slotted');
    root.classList.toggle('safe-grid', $('#safe-grid').checked);
    const owner = root.querySelector('.cp-body') || root.querySelector('.pad');
    const body = document.createElement('div');
    body.className = 'safe-body';
    const nodes = recipes[slide.type].map(([sel, name, col, cols, row, rows]) => ({
      node: owner.querySelector(sel),
      name,
      col,
      cols,
      row,
      rows,
    }));
    for (const spec of nodes) {
      if (!spec.node) continue;
      if (slide.type === 'title') {
        const cols = slide.mockColumns || 7;
        if (spec.name === 'Artwork') {
          spec.col = cols + 1;
          spec.cols = 12 - cols;
        } else spec.cols = cols;
      }
      const box = document.createElement('div');
      box.className = 'safe-slot';
      box.style.gridArea = `${spec.row} / ${spec.col} / span ${spec.rows} / span ${spec.cols}`;
      box.dataset.name = spec.name;
      box.dataset.label = `${spec.name} · ${spec.rows}r × ${spec.cols}c`;
      box.append(spec.node);
      body.append(box);
      used.push(spec);
    }
    if (root.querySelector('.cp-body')) owner.replaceWith(body);
    else {
      owner.replaceChildren(body);
      root.classList.add('safe-generic');
    }
  }
  stage.replaceChildren(root);
  fit();
  $('.safe-status').textContent = 'Measuring…';
  const chromeNote = root.classList.contains('chrome-regions') ? ' · named chrome' : '';
  $('.safe-recipe').textContent = original
    ? 'Original campaign renderer.'
    : used.map((s) => `${s.name}: row ${s.row}, ${s.rows} rows · columns ${s.col}–${s.col + s.cols - 1}`).join('  /  ') +
      chromeNote;
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (run !== revision) return;

  function measure() {
    const failed = [];
    const slots = [...root.querySelectorAll('.safe-slot')];
    /* A slide that placed nothing reported "All 0 slots fit": the loop below has
       no boxes to find fault with. Demo hit this first; the fix belongs here too. */
    if (!original && !slots.length) failed.push('nothing placed');
    let smallest = null;
    for (const box of slots) {
      /* Shared with Demo and with production through SF.measureSlideFit: one
         instrument, so a correction to it lands everywhere at once. This is what
         the two engines were diverging over — Safe carried its own copy, without
         the painted-size reading or the legibility floor. */
      const verdict = SF.measureSlideFit(box, { frame: box, floor: SF.LEGIBLE_FLOOR, allowAscent: true });
      /* Slots whose name contains "mark" are exempt: the quote glyph and the
         action mark are drawn to exceed their box on purpose. */
      const exempt = /mark/i.test(box.dataset.name || '');
      const scrolls = box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
      const bad = !!verdict && ((!exempt && !verdict.fits) || scrolls);
      if (verdict?.smallest != null && !exempt && (smallest === null || verdict.smallest < smallest)) {
        smallest = verdict.smallest;
      }
      box.classList.toggle('safe-overflow', bad);
      if (bad) failed.push(box.dataset.name);
    }
    const grid = root.querySelector('.safe-body');
    if (grid) {
      const g = grid.getBoundingClientRect(),
        s = root.getBoundingClientRect();
      for (const n of root.querySelectorAll('[contenteditable]')) {
        if (n.closest('.safe-slot')) continue;
        const r = n.getBoundingClientRect(),
          header = r.top < g.top;
        const band = header
          ? { name: 'Header band', top: s.top, bottom: g.top }
          : { name: 'Footer band', top: g.bottom, bottom: s.bottom };
        const spills = r.top < band.top - 1 || r.bottom > band.bottom + 1;
        n.classList.toggle('safe-overflow', spills);
        if (spills && !failed.includes(band.name)) failed.push(band.name);
      }
    }
    $('.safe-status').dataset.fits = original ? 'original' : String(!failed.length);
    $('.safe-status').dataset.smallest = smallest == null ? '' : String(smallest);
    /* Reported, not enforced: geometry can pass at a size nobody can read. */
    const tiny =
      smallest != null && smallest < SF.LEGIBLE_FLOOR
        ? ` · smallest text ${Math.round(smallest)}px, under the ${SF.LEGIBLE_FLOOR}px floor`
        : '';
    const chromeHelp = root.classList.contains('chrome-regions')
      ? ' · drag ✥ on header/footer to rearrange'
      : '';
    $('.safe-status').textContent = original
      ? 'Original design for comparison.'
      : failed.length
        ? 'Needs more space: ' + failed.join(', ') + '. Text is not automatically shrunk.'
        : `${slide.hidden ? 'Hidden support slide' : `Audience ${audience} / 7`} · All ${used.length} slots fit, chrome inside its bands · 16×12${tiny}${chromeHelp}`;
  }
  editable(root, slide, measure);
  measure();
  paintChromeMap(slide, root);
  if (!original && root.classList.contains('chrome-regions')) {
    SF.bindCanvasRegions(root, slide, () => {
      render();
    });
  }
}
function show(i) {
  index = i;
  options();
  controls();
  render();
}
$('#safe-slide').onchange = (e) => show(Number(e.target.value));
section.querySelectorAll('[data-nav]').forEach((b) => {
  b.onclick = () => {
    const seq = sequence();
    show(seq[(seq.indexOf(index) + Number(b.dataset.nav) + seq.length) % seq.length]);
  };
});
$('#safe-audience').onchange = () => {
  const seq = sequence();
  show(seq.includes(index) ? index : seq[0]);
};
$('#safe-columns').onchange = () => {
  deck.slides[index].mockColumns = Number($('#safe-columns').value);
  render();
};
$('#safe-original').onchange = render;
$('#safe-grid').onchange = render;
$('#safe-chrome').onchange = render;
$('#safe-reset').onclick = () => {
  deck.slides[index] = structuredClone(baseline.slides[index]);
  if ($('#safe-chrome').checked) enableNamedChrome(deck.slides[index]);
  show(index);
};
$('#safe-download').onclick = () => {
  const data = { format: 'slideforge-slot-mock-v1', deck, recipes };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aiad27-safe-slot-mock.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
new ResizeObserver(fit).observe(stage);
show(index);
