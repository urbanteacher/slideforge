/*
 * Layout-owned coordinates.
 *
 * A slide layout is a template, not a screenshot of a rendered slide.  These
 * regions are the contract the Layout face uses for its first arrangement and
 * for item insertion.  In particular, nothing in here reads a DOM rectangle,
 * a font metric, or a computed style: changing copy, a theme, or the size of
 * the editor must not change an unedited layout's coordinates.
 *
 * Keys are the stable keys emitted by render.js: editable fields use their
 * content key; uneditable layout containers use their first class.  `block-0`
 * and `block-1` are deliberate aliases for layouts whose title is optional.
 */

const region = (col, row, cols, rows, extra = {}) => ({ col, row, cols, rows, ...extra });
const clone = (value) => Object.fromEntries(Object.entries(value || {}).map(([key, value2]) => [key, { ...value2 }]));

const TITLE = {
  'accent-bar': region(1, 3, 2, 1),
  title: region(1, 5, 10, 5),
  subtitle: region(1, 11, 8, 2),
  'slide-date': region(1, 14, 5, 1)
};

const CENTRED = {
  title: region(2, 5, 10, 5, { alignX: 'center', alignY: 'middle' }),
  body: region(2, 6, 10, 5, { alignX: 'center', alignY: 'middle' }),
  subtitle: region(3, 12, 8, 2, { alignX: 'center' }),
  'statement-credit': region(3, 12, 8, 2, { alignX: 'center' }),
  'accent-bar': region(5, 14, 3, 1, { alignX: 'center' })
};

/* The left column is the layout's authored copy area.  The right column is a
 * declared inserter rail; it is never discovered by looking for empty pixels.
 * A template that has no rail simply does not accept extra free items. */
const TEACHING = {
  title: region(1, 1, 12, 2),
  'block-0': region(1, 4, 11, 4),
  'block-1': region(1, 4, 11, 4),
  'block-2': region(1, 4, 11, 4)
};
/* Below the copy, not beside it. The rail used to start at column 9 while the
   copy blocks span columns 1 to 11, so the first inserted item landed on top
   of the bullets it was meant to sit near. The copy occupies rows 4 to 7 and
   the rest of the grid is empty, which is where an item can actually go. */
const TEACHING_INSERTS = [
  region(1, 9, 12, 4),
  region(1, 13, 12, 4)
];

const FULL = {
  title: region(1, 1, 12, 2),
  'block-0': region(1, 4, 12, 12),
  'block-1': region(1, 4, 12, 12),
  'block-2': region(1, 4, 12, 12),
  'block-3': region(1, 4, 12, 12)
};

/* Measured off the library, not guessed. Three patterns repeat rather than
 * belonging to any one layout, so they are named once and merged in:
 *
 *   CHROME   the poster/campaign wrapper — identical coordinates on all ten
 *            types that wear it, which is why it is not written ten times.
 *   SUB_ROW  a subtitle under the title, at the same row wherever it appears.
 *   FOOT     a closing line on the last row, likewise.
 */
/* The campaign wrapper draws the same three bands whatever composition sits
 * inside it, so every composition template carries them. It belongs here and
 * not on the slide types: layoutRegionsFor prefers a composition outright, so
 * anything merged onto the type is not read by a slide that has one. */
const CHROME = {
  'cp-header': region(1, 2, 11, 1),
  'cp-body': region(1, 3, 11, 13),
  'cp-footer': region(1, 16, 11, 1),
  /* blockKeyOf prefers a content key over a class, so the band a composition
     draws as .cp-eyebrow answers to `subtitle`, and the one it draws as
     .q.cp-scenario answers to `body`. Declare the names it actually returns. */
  title: region(1, 1, 12, 2),
  subtitle: region(2, 4, 10, 1),
  body: region(2, 6, 10, 8)
};
const SUB_ROW = { subtitle: region(2, 4, 11, 1) };
const FOOT = { body: region(2, 15, 11, 1) };

const COMPOSITION_SLOTS = {
  'poster-art': {
    ...CHROME,
    'cp-title-copy': region(1, 4, 6, 8, { alignY: 'middle' }),
    'cp-art': region(8, 3, 5, 10, { alignY: 'middle' })
  },
  voice: {
    ...CHROME,
    'cp-quote-mark': region(1, 2, 2, 2),
    'cp-eyebrow': region(2, 4, 8, 1),
    q: region(2, 6, 9, 6, { alignY: 'middle' })
  },
  ballot: {
    ...CHROME,
    'cp-heading': region(1, 1, 12, 2),
    'cp-choices': region(1, 4, 12, 10),
    'cp-prompt': region(1, 15, 12, 1)
  },
  prompt: {
    ...CHROME,
    'cp-eyebrow': region(2, 3, 8, 1),
    'cp-discussion': region(2, 5, 9, 7, { alignY: 'middle' })
  },
  rules: {
    ...CHROME,
    'cp-heading': region(1, 1, 12, 2),
    'cp-rules': region(1, 4, 12, 9),
    'cp-closing-line': region(1, 13, 12, 1),
    'cp-source': region(1, 15, 12, 1)
  },
  commitment: {
    ...CHROME,
    'cp-action-number': region(1, 3, 2, 2),
    'cp-action': region(3, 4, 8, 8, { alignY: 'middle' })
  },
  comparison: {
    ...CHROME,
    'cp-heading': region(1, 1, 12, 2),
    'cp-comparison': region(1, 4, 12, 10),
    'cp-source': region(1, 15, 12, 1)
  },
  'reveal-map': {
    ...CHROME,
    'cp-heading': region(1, 1, 12, 2),
    'cp-risk-map': region(1, 4, 12, 10),
    'cp-source': region(1, 15, 12, 1)
  },
  credits: {
    ...CHROME,
    'cp-heading': region(1, 1, 12, 2),
    'cp-credits': region(1, 4, 12, 10),
    'cp-source': region(1, 15, 12, 1)
  },
  lanes: {
    ...CHROME,
    'cp-heading': region(1, 1, 12, 2),
    'cp-lanes': region(1, 4, 12, 10),
    'cp-source': region(1, 15, 12, 1)
  }
};

const TYPES = {
  title: { slots: { ...TITLE } },
  section: { slots: { ...CENTRED, title: region(2, 5, 10, 4, { alignX: 'center', alignY: 'middle' }) } },
  statement: { slots: { ...CENTRED } },
  quote: { slots: { ...CENTRED, 'q': region(2, 5, 9, 6, { alignY: 'middle' }), attrib: region(2, 12, 8, 2) } },
  introduction: { slots: {
    'lecturer-portrait': region(1, 3, 4, 10),
    'lecturer-copy': region(6, 3, 7, 10, { alignY: 'middle' })
  } },
  journey: { slots: {
    title: region(1, 1, 12, 2),
    'journey-context': region(1, 3, 12, 1),
    'journey-route': region(1, 5, 12, 8),
    'journey-takeaway': region(1, 14, 12, 2),
    ...SUB_ROW, ...FOOT
  } },
  mindmap: { slots: { mindmap: region(1, 2, 12, 13) } },
  orgchart: { slots: {
    title: region(1, 1, 12, 2), subtitle: region(1, 3, 12, 1),
    'org-chart': region(1, 5, 12, 10), empty: region(1, 5, 12, 8)
  } },
  split: { slots: {
    'split-copy': region(1, 2, 6, 12),
    'split-media': region(8, 2, 5, 12),
    'split-empty': region(8, 2, 5, 12)
  } },
  image: { slots: { img: region(1, 1, 12, 16), cap: region(1, 12, 12, 4),
    'image-facts-toggle': region(1, 2, 1, 1), 'image-facts-back': region(1, 1, 12, 16) } },
  gallery: { slots: { 'gallery-stage': region(1, 1, 12, 16), 'gallery-copy': region(1, 12, 12, 4),
    title: region(2, 2, 10, 1), 'fig-stack': region(2, 4, 10, 12) } },
  video: { slots: { vid: region(1, 1, 12, 16), 'vid-caption': region(1, 12, 12, 4),
    img: region(1, 1, 12, 16), cap: region(1, 10, 12, 7) } },
  chart: { slots: { ...FULL, 'chart-wrap': region(1, 4, 12, 11),
    'chart-data-table': region(2, 2, 2, 4), 'chart-source': region(2, 16, 10, 1),
    'chart-key': region(2, 15, 11, 1), 'ch-callout': region(2, 15, 11, 1) } },
  table: { slots: { ...FULL, tbl: region(1, 4, 12, 11) } },
  code: { slots: { ...FULL, 'code-shell': region(1, 4, 12, 11), 'code-frame': region(2, 5, 10, 11) } },
  timeline: { slots: { ...TEACHING, ...SUB_ROW, timeline: region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  stats: { slots: { ...TEACHING, ...SUB_ROW, ...FOOT, 'stats-grid': region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  compare: { slots: { ...TEACHING, ...FOOT, compare: region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  funnel: { slots: { ...TEACHING, ...SUB_ROW, funnel: region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  iceberg: { slots: { ...TEACHING, ...FOOT, berg: region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  spectrum: { slots: { ...TEACHING, ...FOOT, spectrum: region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  sourcecheck: { slots: { ...TEACHING, ...SUB_ROW, 'claim-quote': region(1, 1, 7, 3), 'claim-rows': region(1, 5, 7, 10), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  shift: { slots: { ...TEACHING, ...SUB_ROW, ...FOOT, 'shift-track': region(1, 4, 7, 11), 'info-takeaway': region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
  spotfake: { slots: { ...FULL, 'fake-pair': region(1, 4, 12, 8), 'fake-tells': region(1, 13, 12, 3) } },
  content: { slots: TEACHING, inserts: TEACHING_INSERTS },
  cards: { slots: { ...TEACHING, 'cards-rows': region(2, 5, 10, 15),
    'cards-stack': region(2, 5, 10, 10), 'has-card-pics': region(2, 6, 10, 10) }, inserts: TEACHING_INSERTS },
  keywords: { slots: { ...TEACHING, 'kw-list': region(2, 5, 10, 6),
    flip: region(2, 5, 10, 10), 'model-answer': region(2, 10, 10, 4) }, inserts: TEACHING_INSERTS },
  italics: { slots: { ...TEACHING, 'it-list': region(2, 5, 10, 5) }, inserts: TEACHING_INSERTS },
  links: { slots: { ...TEACHING, 'ln-list': region(2, 5, 10, 8) }, inserts: TEACHING_INSERTS },
  keyfact: { slots: { ...CENTRED, title: region(2, 4, 9, 3), body: region(2, 8, 9, 3),
    'keyfact-points': region(2, 12, 9, 3), keyfact: region(2, 7, 10, 3), 'keyfact-notes': region(2, 10, 10, 3) } },
  explore: { slots: { ...FULL,
    'explore-scene': region(2, 4, 11, 9), 'explore-caption': region(2, 13, 11, 2),
    'explore-button': region(2, 15, 2, 1) } },
  simulation: { slots: { ...FULL,
    'explore-graph': region(2, 5, 11, 6), 'explore-reading': region(2, 12, 11, 1),
    'explore-range': region(2, 13, 11, 1), 'explore-formula': region(2, 14, 11, 1),
    'explore-button': region(2, 15, 1, 1) } },
  /* The motion specimens own their canvas the way an experiment does, and
     advertise no inserter for the same reason. */
  motion: { slots: {
    'ml-kicker': region(2, 2, 11, 1), 'ml-title': region(2, 3, 11, 1),
    'ml-stage': region(2, 4, 11, 10), 'ml-status': region(2, 15, 11, 1),
    'ml-controls': region(2, 16, 11, 1) } },
  /* A game slide is a single card the engine draws: nothing sits beside it,
     and there is nowhere for a free item to go. */
  game: { slots: { gamecard: region(1, 1, 12, 16) } },
  beforeafter: { slots: { ...FULL, 'before-after': region(1, 3, 12, 11),
    'explore-compare': region(2, 4, 11, 10), 'explore-range': region(2, 14, 11, 1),
    'explore-actions': region(2, 15, 11, 1) } },
  /* Measured off the rendered layout across the 42 experiment slides in the
     library, then written down here: the template declared a title, four
     blocks and a stage, and the renderer emits none of those names. An
     experiment owns its whole canvas and advertises no inserter — there is
     nowhere on it a free item could go without landing on the chart. */
  experiment: { slots: {
    've-title': region(2, 2, 11, 1),
    've-prompt': region(2, 3, 11, 1),
    've-plot': region(2, 4, 11, 8),
    've-controls': region(2, 13, 11, 1),
    've-explanation': region(2, 14, 11, 1),
    've-source': region(2, 16, 11, 1)
  } },
  join: { slots: { 'join-stage': region(1, 2, 12, 13) } }
};

function compositionKey(slide) {
  const design = slide && typeof slide.design === 'object' ? slide.design : {};
  return typeof design.composition === 'string' ? design.composition : '';
}

export function hasLayoutTemplate(slide) {
  return !!(COMPOSITION_SLOTS[compositionKey(slide)] || TYPES[slide && slide.type]);
}

export function layoutRegionsFor(slide) {
  const composition = COMPOSITION_SLOTS[compositionKey(slide)];
  const template = composition || (TYPES[slide && slide.type] || { slots: FULL });
  return clone(template.slots || template);
}

/* Which of a layout's own slots an item of each kind belongs in.
 *
 * Without this an inserted heading went wherever the generic rail pointed,
 * which is why rebuilding a layout out of items produced nothing like the
 * layout: every item landed in the same two bands at the bottom regardless of
 * what it was. A heading belongs where that layout puts its title, a list
 * where it puts its list, a picture where it puts its picture. The layout
 * already declares all three.
 *
 * First match wins, so the order is the preference. */
const KIND_SLOTS = {
  heading: ['title', 'cp-heading', 'ml-title', 've-title'],
  text: ['subtitle', 'cp-eyebrow', 'journey-context', 've-prompt', 'body'],
  bullets: ['block-0', 'split-copy', 'cp-choices', 'cp-rules', 'kw-list', 'ln-list'],
  pairs: ['kw-list', 'ln-list', 'stats-grid', 'tbl', 'claim-rows', 'block-0'],
  image: ['img', 'split-media', 'cp-art', 'gallery-stage', 'ml-stage'],
  chart: ['chart-wrap', 'explore-graph', 've-plot', 'block-0'],
  quote: ['q', 'cp-quote-mark', 'cp-scenario', 'body'],
  note: ['info-takeaway', 'journey-takeaway', 'cp-footer', 'chart-source', 've-source']
};

/* Return a declared inserter: the layout's own slot for this kind of item if
 * it has one and nothing is sitting in it, otherwise the generic rail. There
 * is intentionally no "find a free row" fallback — a layout either advertises
 * somewhere for the item or it does not, and the caller makes room instead. */
export function insertionRegionFor(slide, index = 0, kind = '', taken = []) {
  const wanted = KIND_SLOTS[kind] || [];
  /* Occupied means something is sitting there, not that the layout reserves
     the name. A slide being built out of items has a title slot and no title
     in it, and the first heading belongs in that slot. */
  const busy = Array.isArray(taken) ? taken.filter(Boolean) : [];
  const clear = (r) => !busy.some((b) =>
    r.col < b.col + b.cols && b.col < r.col + r.cols &&
    r.row < b.row + b.rows && b.row < r.row + r.rows);
  if (wanted.length) {
    const slots = layoutRegionsFor(slide);
    for (const key of wanted) {
      if (slots[key] && clear(slots[key])) return { ...slots[key], slot: key };
    }
  }
  const template = TYPES[slide && slide.type];
  const rail = template && template.inserts;
  const found = Array.isArray(rail) ? rail[index] : null;
  return found ? { ...found } : null;
}

export const LAYOUT_SLOT_TEMPLATES = TYPES;
