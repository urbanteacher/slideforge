/* Theme manifest: identity, intrinsic grounds, decorative art and composition
 * defaults. Markup here is trusted static decoration, never imported deck HTML.
 * The renderer supplies the DOM; theme stylesheets supply its appearance.
 * Add a theme here, not another branch or name list in shared render code. */
export const DEFAULT_THEME = 'studio';

var CAMPAIGN_COMPOSITIONS = {
  title:'poster-art', quote:'voice', cards:'ballot', statement:'prompt',
  journey:'rules', keyfact:'commitment', compare:'comparison',
  iceberg:'reveal-map', sourcecheck:'credits', spectrum:'lanes'
};

export const THEMES = {
  studio: { name: 'Studio · Sage & ink', swatch: '#dce8cc', art: {"className": "studio-art", "html": "<div class=\"art-orbit\"></div><div class=\"art-tile\">\u2733</div><div class=\"art-dot\"></div><div class=\"art-caption\">STAY CURIOUS.</div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  northeastern: { name: 'Northeastern London', swatch: '#c8102e', ground: { default: 'light', title: 'dark', section: 'dark', quote: 'dark' }, art: {"className": "nu-art", "html": "<div class=\"nu-skyline\"></div><div class=\"nu-n\"></div>", "layouts": ["title", "section"], "eyebrow": {"className": "nu-eyebrow", "title": ["title", "org"], "section": ["org"]}}, defaults: {} },
  ukbt: { name: 'UK Black Tech', swatch: '#264258', ground: 'dark', art: {"className": "ukbt-art", "html": "<div class=\"ukbt-chev ukbt-chev-back\"></div><div class=\"ukbt-chev ukbt-chev-front\"></div><div class=\"ukbt-object\"></div>", "layouts": ["title", "section"]}, defaults: {} },
  'ukbt-institute': { name: 'UKBT Institute', swatch: '#2d3134', ground: 'dark', art: {"className": "ukbt-art", "html": "<div class=\"ukbt-chev ukbt-chev-back\"></div><div class=\"ukbt-chev ukbt-chev-front\"></div><div class=\"ukbt-object\"></div>", "layouts": ["title", "section"]}, defaults: {} },
  /* AI Awareness Day 2026. One design, five grounds: the campaign gives each
     of its principles a colour, and a starter deck belongs to exactly one of
     them, so the principle is the theme rather than a setting inside it.
     Picking "Safe" is how a deck gets the cyan badge and the cyan rules —
     there is nothing else to set. See css/aiad26.css. */
  'aiad26-safe': { name: 'AI Awareness · Safe', swatch: '#00c4ee', art: {"className": "aiad-art", "html": "<div class=\"aiad-fold\"></div><div class=\"aiad-seam\"></div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  'aiad26-smart': { name: 'AI Awareness · Smart', swatch: '#ff6734', art: {"className": "aiad-art", "html": "<div class=\"aiad-fold\"></div><div class=\"aiad-seam\"></div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  'aiad26-creative': { name: 'AI Awareness · Creative', swatch: '#795bff', art: {"className": "aiad-art", "html": "<div class=\"aiad-fold\"></div><div class=\"aiad-seam\"></div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  'aiad26-responsible': { name: 'AI Awareness · Responsible', swatch: '#00a896', art: {"className": "aiad-art", "html": "<div class=\"aiad-fold\"></div><div class=\"aiad-seam\"></div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  'aiad26-future': { name: 'AI Awareness · Future', swatch: '#ff7eed', art: {"className": "aiad-art", "html": "<div class=\"aiad-fold\"></div><div class=\"aiad-seam\"></div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  /* AI Awareness Day 2027 — Keep Humans in the Loop. Five themes, one per
     strand. Colour is paired with the strand name on every slide, and each
     cover has a distinct graphic. See css/aiad27.css. */
  'aiad27-safe': { name: 'AIAD27 · Safe', swatch: '#00BEDD', ground: { default: 'light', quote: 'dark', journey: 'dark' }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
  'aiad27-smart': { name: 'AIAD27 · Smart', swatch: '#FF7038', ground: { default: 'light', quote: 'dark', journey: 'dark' }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
  'aiad27-creative': { name: 'AIAD27 · Creative', swatch: '#AC91FF', ground: { default: 'light', quote: 'dark', journey: 'dark' }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
  'aiad27-responsible': { name: 'AIAD27 · Responsible', swatch: '#63DF93', ground: { default: 'light', quote: 'dark', journey: 'dark' }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
  'aiad27-future': { name: 'AIAD27 · Future', swatch: '#FA83EB', ground: { default: 'light', quote: 'dark', journey: 'dark' }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
  product: { name: 'Product · Keynote minimal', swatch: '#f5f5f7', art: {"className": "pd-art", "html": "<div class=\"pd-bloom\"></div><div class=\"pd-ring\"></div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  editorial: { name: 'Editorial · Paper', swatch: '#f3efe6', art: {"className": "ed-art", "html": "<div class=\"ed-rules\"></div><div class=\"ed-quote\">\u201d</div>", "layouts": ["title", "section"]}, ground: 'light', defaults: {} },
  cinematic: { name: 'Cinematic · Dark pitch', swatch: '#0a0b0f', ground: 'dark', art: {"className": "cine-art", "html": "<div class=\"cine-bar cine-top\"></div><div class=\"cine-bar cine-bottom\"></div><div class=\"cine-streak\"></div><div class=\"cine-vignette\"></div>", "layouts": ["title", "section"]}, defaults: {} },
  brutal: { name: 'Brutal · Mono', swatch: '#111111', ground: 'dark', art: {"className": "brut-art", "html": "<div class=\"brut-grid\"></div><div class=\"brut-marks\"></div>", "layouts": ["title", "section"]}, defaults: {} },
  midnight: { name: 'Midnight', swatch: '#1b2a4a', ground: 'dark', art: null, defaults: {} },
  paper:    { name: 'Paper',    swatch: '#f4f1ea', ground: 'light', art: null, defaults: {} },
  ocean:    { name: 'Ocean',    swatch: '#0d5c63', ground: 'dark', art: null, defaults: {} },
  ember:    { name: 'Ember',    swatch: '#3d1b2a', ground: 'dark', art: null, defaults: {} },
  mono:     { name: 'Mono',     swatch: '#111111', ground: 'dark', art: null, defaults: {} }
};


/** Resolve the intrinsic theme ground before paint. Explicit logo overrides
 * remain separate; a missing layout uses the theme's default (also for boards).
 * @param {string} theme
 * @param {string} [layout]
 * @returns {'dark' | 'light'}
 */
export function themeGround(theme, layout) {
  const ground = THEMES[theme]?.ground;
  const resolved = typeof ground === 'object' && ground
    ? (layout && ground[layout]) || ground.default : ground;
  return resolved === 'dark' ? 'dark' : 'light';
}

/** Keep explicit saved themes; missing or retired names use the house theme. */
export function resolveTheme(theme) {
  return Object.hasOwn(THEMES, theme) ? theme : DEFAULT_THEME;
}
