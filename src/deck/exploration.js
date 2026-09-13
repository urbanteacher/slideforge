/* Authored exploration settings; live values are kept separately by the player. */
function bounded(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function normalizeExploration(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const min = bounded(r.min, 0, -1000, 999);
  const max = bounded(r.max, 10, min + 1, 1000);
  return {
    before: String(r.before || ''), after: String(r.after || ''),
    beforeLabel: String(r.beforeLabel || 'Before').slice(0, 80), afterLabel: String(r.afterLabel || 'After').slice(0, 80),
    alt: String(r.alt || 'Compare the two states').slice(0, 300),
    spots: (Array.isArray(r.spots) ? r.spots : []).slice(0, 8).map(p => ({
      x: bounded(p && p.x, 50, 0, 100), y: bounded(p && p.y, 50, 0, 100), zoom: bounded(p && p.zoom, 2, 1, 4),
      title: String(p && p.title || 'Detail').slice(0, 100), body: String(p && p.body || '').slice(0, 500)
    })),
    model: r.model === 'quadratic' ? 'quadratic' : 'linear',
    min, max, initial: bounded(r.initial, min, min, max),
    a: bounded(r.a, 2, -100, 100), b: bounded(r.b, 0, -1000, 1000),
    inputLabel: String(r.inputLabel || 'Input').slice(0, 80), outputLabel: String(r.outputLabel || 'Output').slice(0, 80),
    prediction: r.prediction === true,
    prompt: String(r.prompt || 'What pattern do you predict?').slice(0, 240)
  };
}
/* The maths, against a config already known to be sound. Split out so a caller
   plotting a curve pays for normalising once rather than once per point. */
function valueOf(c, x) {
  const input = bounded(x, c.initial, c.min, c.max);
  return c.a * (c.model === 'quadratic' ? input * input : input) + c.b;
}

/* The public one stays defensive: it is handed whatever is on the slide. */
function explorationValue(config, x) {
  return valueOf(normalizeExploration(config), x);
}

/**
 * The whole curve in one pass. Sampling it through explorationValue meant a
 * full normalisation per point — rebuilding the spots array and slicing eight
 * strings, 101 times, to draw one graph.
 *
 * @param {any} config
 * @param {number} [steps]
 * @returns {[number, number][]} [input, output] pairs across the input range
 */
function explorationCurve(config, steps) {
  const c = normalizeExploration(config);
  const n = Math.max(1, Math.min(400, Number(steps) || 100));
  /** @type {[number, number][]} */
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = c.min + (c.max - c.min) * i / n;
    out.push([x, valueOf(c, x)]);
  }
  return out;
}

export { normalizeExploration, explorationValue, explorationCurve };
