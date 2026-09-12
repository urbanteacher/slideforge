/* Audience feedback schema and normalization. */

/**
 * @typedef {import("../types.js").Feedback} Feedback
 * @typedef {import("../types.js").FeedbackKindKey} FeedbackKindKey
 * @typedef {import("../types.js").Slide} Slide
 */
var FEEDBACK_KINDS = {
  poll: {
    key: 'poll',
    label: 'Poll',
    icon: '▤',
    blurb: 'Fixed options. Results appear as bars in the rail.',
    needsOptions: true
  },
  wordcloud: {
    key: 'wordcloud',
    label: 'Word cloud',
    icon: '❋',
    blurb: 'A word or short phrase each. Repeats grow larger.',
    needsOptions: false
  },
  brainstorm: {
    key: 'brainstorm',
    label: 'Brainstorm',
    icon: '✎',
    blurb: 'Longer contributions, listed newest first with names.',
    needsOptions: false
  },
  /* A scale is a poll over a fixed run of points, so on the wire it is one:
     the room picks an index and the relay counts indices, unchanged. What
     makes it a scale is that the points are ordered, which is why it gets a
     mean and a distribution rather than a set of independent bars. */
  scale: {
    key: 'scale',
    label: 'Scale',
    icon: '≋',
    blurb: 'One end to the other. Shows the spread and the average.',
    needsOptions: false,
    graded: true
  }
};

/* The two ends and the number of steps between them. Five is the default
   because an odd count leaves a real middle to sit in, and more than seven
   points is a distinction nobody makes honestly on a phone. */
var SCALE_POINTS = [3, 4, 5, 6, 7];

function scaleLabels(f) {
  var n = Math.max(3, Math.min(7, Number(f.points) || 5));
  var out = [];
  for (var i = 0; i < n; i++) out.push(String(i + 1));
  return out;
}

/**
 * Is this one of the four kinds the rail knows how to collect and show?
 *
 * @param {unknown} value
 * @returns {value is FeedbackKindKey}
 */
function isFeedbackKind(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FEEDBACK_KINDS, value);
}

/**
 * A blank feedback block of the given kind.
 * @param {string} [kind] anything unrecognised becomes a poll
 * @returns {Feedback}
 */
function makeFeedback(kind) {
  /** @type {Feedback} */
  var f = {
    kind: isFeedbackKind(kind) ? kind : 'poll',
    prompt: '',
    options: kind === 'poll' || !kind ? ['Yes', 'No', 'Not sure'] : [],
    max: 1,                // submissions allowed per person
    presentAs: 'rail'      // 'rail' beside the slide · 'focus' full screen when presenting
  };
  if (f.kind === 'scale') {
    f.points = 5;
    f.lowLabel = 'Not at all';
    f.highLabel = 'Completely';
  }
  return f;
}

/**
 * Feedback from a saved slide, made safe. Null when the slide collects
 * nothing — which is the common case.
 *
 * @param {any} raw
 * @returns {Feedback | null}
 */
function normalizeFeedback(raw) {
  if (!raw || !raw.kind || !FEEDBACK_KINDS[raw.kind]) return null;
  /** @type {Feedback} */
  var f = {
    kind: raw.kind,
    prompt: String(raw.prompt || ''),
    options: /** @type {string[]} */ ([]),
    max: Math.max(1, Math.min(5, Number(raw.max) || 1)),
    presentAs: raw.presentAs === 'focus' ? 'focus' : 'rail'
  };
  if (FEEDBACK_KINDS[f.kind].needsOptions) {
    f.options = (Array.isArray(raw.options) ? raw.options : [])
      .map(function (o) { return String(o == null ? '' : o); })
      .slice(0, 6);
    while (f.options.length < 2) f.options.push('');
    f.max = 1;             // one vote each, always
  }
  if (f.kind === 'scale') {
    f.points = SCALE_POINTS.indexOf(Number(raw.points)) > -1 ? Number(raw.points) : 5;
    f.lowLabel = String(raw.lowLabel == null ? 'Not at all' : raw.lowLabel).slice(0, 40);
    f.highLabel = String(raw.highLabel == null ? 'Completely' : raw.highLabel).slice(0, 40);
    f.max = 1;             // one position each — a scale is where you stand
  }
  return f;
}

/**
 * Does this slide collect anything from the room?
 * @param {Slide | null | undefined} slide
 * @returns {Feedback | null}
 */
function slideFeedback(slide) {
  var f = slide && slide.feedback;
  if (!f || !f.kind) return null;
  if (!String(f.prompt || '').trim()) return null;
  if (FEEDBACK_KINDS[f.kind].needsOptions &&
      f.options.filter(function (o) { return String(o).trim(); }).length < 2) {
    return null;
  }
  /* A scale needs both ends named or the room cannot tell which way it
     runs, and an unlabelled 1-to-5 means nothing on the wall either. */
  if (f.kind === 'scale' &&
      !(String(f.lowLabel || '').trim() && String(f.highLabel || '').trim())) {
    return null;
  }
  return f;
}


export { FEEDBACK_KINDS, SCALE_POINTS, scaleLabels, makeFeedback, normalizeFeedback, slideFeedback };
