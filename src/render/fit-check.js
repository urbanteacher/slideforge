/* Does a rendered slide fit, and can it be read?
 *
 * Layout-agnostic on purpose: it measures a rendered .slide, not a slot grid, so
 * it works on production layouts that position themselves in CSS as well as on
 * the lab's lattice. That is what makes it usable from the editor's own layout
 * picker, which already renders a trial of every candidate shape.
 *
 * Two independent verdicts, because they fail for different reasons:
 *   fit         geometry — content escapes its box or the slide frame
 *   legibility  size — the smallest painted text, which geometry never catches
 *
 * Nothing here shrinks anything. An overflow is reported, not absorbed.
 */

/** Screen pixels of slack before an overflow counts. Matches the 1px default
 * that slide overflow checkers converge on; sub-pixel layout noise is not news. */
export const FIT_TOLERANCE = 1;

/** Painted pixels below which text stops being readable from the back of a room.
 * 20px on a 720px-tall slide is 2.8% of slide height. */
export const LEGIBLE_FLOOR = 20;

/** Scale between an SVG's user units and its painted box; 1 for ordinary HTML.
 * A chart declares one font size and paints another, because the viewBox scales
 * it — so declared size overstates what the room sees. */
export function svgScale(el) {
  const svg = el.ownerSVGElement;
  if (!svg) return 1;
  const view = svg.viewBox?.baseVal;
  const box = svg.getBoundingClientRect();
  if (!view || !view.width || !view.height || !box.width) return 1;
  return Math.min(box.width / view.width, box.height / view.height);
}

/** A single readable name for an element, for reports a person has to act on. */
function describe(el) {
  const cls = el.className?.baseVal ?? el.className;
  const first = String(cls || '').trim().split(/\s+/)[0];
  return first ? `${el.tagName.toLowerCase()}.${first}` : el.tagName.toLowerCase();
}

/** The nearest ancestor that would hide a glyph leaving its box. */
function clipper(el, root) {
  for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/hidden|clip|auto|scroll/.test(style.overflowX + ' ' + style.overflowY)) return node;
  }
  return null;
}

/** Which way, and by how much, a rect escapes a frame.
 *
 * The top edge is deliberately not checked. A word's client rect starts at the
 * top of its LINE BOX, and a font's ascent reaches above that whenever
 * line-height is tight, so a heading in a box sized to its own text reports 3
 * to 7px of "overflow" with nothing clipped. It is tempting to keep the check
 * anyway on the grounds that text above the slide really is off the slide, and
 * that was the first instinct here — but measured across all 97 bank slides the
 * top edge flags nothing the other three miss: one slide overflows with it, one
 * without, and no slide is caught only by it. All it contributed was noise in
 * the reports, where a heading's ascent crowded out the real bottom overflow. */
function escapes(rect, frame, tolerance) {
  const out = [];
  if (rect.bottom > frame.bottom + tolerance) out.push(['bottom', rect.bottom - frame.bottom]);
  if (rect.right > frame.right + tolerance) out.push(['right', rect.right - frame.right]);
  if (rect.left < frame.left - tolerance) out.push(['left', frame.left - rect.left]);
  return out;
}

/**
 * Measure a mounted slide.
 *
 * Read only after the slide is attached and fonts and images have settled: a
 * detached or zero-size stage answers null rather than a plausible pass.
 *
 * @param {Element} root a rendered .slide
 * @param {{tolerance?:number, floor?:number, frame?:Element}} [opts]
 *   `frame` bounds the content when it is not the slide itself — the lab passes
 *   a slot so a block is judged against its declared box.
 * @returns {{fits:boolean, legible:boolean, issues:Array<{element:string,direction:string,px:number,text:string}>, smallest:number|null, smallestIn:string|null}|null}
 */
export function measureSlideFit(root, opts = {}) {
  if (!root?.isConnected) return null;
  const rect = root.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const tolerance = opts.tolerance ?? FIT_TOLERANCE;
  const floor = opts.floor ?? LEGIBLE_FLOOR;
  const frame = (opts.frame ?? root).getBoundingClientRect();
  const issues = [];
  const seen = new Set();
  const add = (element, direction, px, text) => {
    const key = `${element}|${direction}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ element, direction, px: Math.round(px * 10) / 10, text });
  };

  /* Painted words only. A scrollHeight sweep was the obvious first instrument and
     it was wrong twice over: theme decoration is oversized and clipped on
     purpose, so .theme-art reported 170px of "overflow" by design, and a tight
     line-height makes a heading's scrollHeight exceed its clientHeight by the
     font's descent with nothing actually cut — 96 of 97 real slides failed. What
     a viewer sees is where the glyphs land, so that is what gets measured. */
  let smallest = null;
  let smallestIn = null;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const node = walk.currentNode;
    const words = node.textContent || '';
    if (!words.trim()) continue;
    const el = node.parentElement;
    if (!el) continue;
    const painted = el.getBoundingClientRect();
    if (!painted.height) continue;
    if (words.trim().length >= 3) {
      const size = parseFloat(getComputedStyle(el).fontSize) * svgScale(el);
      if (Number.isFinite(size) && (smallest === null || size < smallest)) {
        smallest = size;
        smallestIn = describe(el);
      }
    }
    /* Two things can cut a word: the slide frame, and the nearest ancestor that
       clips. Checking the ancestor by rect rather than by scroll size is what
       separates a glyph that is actually hidden from one that merely sits in a
       box whose scrollHeight is larger than its clientHeight. */
    const clip = clipper(el, root);
    const clipBox = clip && clip !== root ? clip.getBoundingClientRect() : null;
    for (const word of words.matchAll(/\S+/g)) {
      const range = document.createRange();
      range.setStart(node, word.index ?? 0);
      range.setEnd(node, (word.index ?? 0) + word[0].length);
      for (const box of range.getClientRects()) {
        if (!box.width || !box.height) continue;
        for (const [direction, px] of escapes(box, frame, tolerance)) {
          add(describe(el), direction, px, word[0]);
        }
        if (clipBox) {
          for (const [direction, px] of escapes(box, clipBox, tolerance)) {
            add(describe(el), `clipped-${direction}`, px, word[0]);
          }
        }
      }
    }
  }

  return {
    fits: !issues.length,
    legible: smallest === null || smallest >= floor,
    issues,
    smallest: smallest === null ? null : Math.round(smallest * 10) / 10,
    smallestIn,
  };
}

/**
 * Would this slide fit if it became `type`?
 *
 * Renders a trial off screen with the slide's real words. The conversion is
 * `prepareLayout` on a clone — the same call the editor makes when an author
 * chooses a layout — so the estimate and the result cannot run different code.
 *
 * `host` must be a mounted, laid-out element of slide size; an off-screen
 * absolute box is fine, `display:none` is not, because nothing measures.
 *
 * @param {object} deck
 * @param {object} slide
 * @param {string} type a SLIDE_TYPES key
 * @param {Element} host
 * Two optional hooks, and the order matters. `api.prepare` runs on the fresh
 * render BEFORE settling, for callers that rearrange it — the lab moves blocks
 * into its lattice there, and measuring that afterwards is the whole point.
 * `api.inspect` runs on the settled trial, for extra measurements; whatever it
 * returns is merged into the verdict. Passing a rearrangement to `inspect`
 * measures a layout that has not been laid out yet.
 *
 * @param {{index?:number, total?:number, prepareLayout:Function, renderSlide:Function, tolerance?:number, floor?:number, settle?:() => Promise<void>, prepare?:(root:Element, trial:object) => void, inspect?:(root:Element, trial:object) => object|undefined}} api
 * @returns {Promise<{type:string, fits:boolean, legible:boolean, keepsHeading:boolean, rendered:boolean, issues:Array<object>, smallest:number|null}>}
 */
export async function probeLayoutFit(deck, slide, type, host, api) {
  const trial = api.prepareLayout(structuredClone(slide), type);
  const root = api.renderSlide(deck, trial, {
    index: api.index ?? 0,
    total: api.total ?? 1,
    revealed: 99,
  });
  host.replaceChildren(root);
  if (api.prepare) api.prepare(root, trial);
  if (api.settle) await api.settle();
  const verdict = measureSlideFit(root, { tolerance: api.tolerance, floor: api.floor });
  const extra = api.inspect ? api.inspect(root, trial) || {} : {};
  /* Whether the shape shows the heading at all. prepareLayout keeps the field;
     it is the layout that decides whether to render it, and some do not — so a
     swap can take the title off the slide while every other check passes. */
  const title = String(slide.title || '').trim();
  const flat = (root.textContent || '').replace(/\s+/g, ' ');
  const keepsHeading = !title || flat.includes(title.replace(/\s+/g, ' '));
  host.replaceChildren();
  return {
    type,
    rendered: !!verdict,
    fits: !!verdict?.fits,
    legible: !!verdict?.legible,
    keepsHeading,
    issues: verdict?.issues ?? [],
    smallest: verdict?.smallest ?? null,
    ...extra,
  };
}
