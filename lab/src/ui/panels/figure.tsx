// The Figure tab: every word of a live figure (slide.figure), edited here (docs/editable-figures-plan.md). A live
// figure is drawn by SlideForge's figure code, so the studio holds a picture of it; its words are in its data. This
// lists them all (core/figureWords.ts), writes each change to the figure, and draws the picture again, so the
// canvas, the thumbnails, the show and the exports all say the new words.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createLayer, figureWords, setFigureWord, svgTexts, type FigureWord, type Layer, type Slide } from '../../core';
import { slideOf, useStore } from '../../store';
import { figureStill } from '../../show';
import { Section, newGesture } from '../controls/controls';

/** The stand-in picture of a live-figure slide: the picture the converter put there (fromSlideForge.ts). */
export function standInOf(slide: Slide): Layer | undefined {
  if (!slide.figure?.figure) return undefined;
  return slide.layers.find((l) => l.kind === 'image' && l.name === 'Picture' && /^data:image\/svg\+xml/.test(String(l.params.src ?? '')))
    ?? slide.layers.find((l) => l.kind === 'image' && l.name === 'Picture');
}

export const wordKey = (w: Pick<FigureWord, 'path' | 'svgText'>) => JSON.stringify([w.path, w.svgText ?? null]);

/** Asks the Figure tab to bring one word field into view and put the cursor in it (a double-click on the canvas). */
export function focusFigureWord(key: string) {
  window.dispatchEvent(new CustomEvent('sf-figure-word', { detail: key }));
}

/** The picture drawn again after the figure's words change, a moment after the typing stops. */
let redraw = 0;
function redrawStandIn(merge: string) {
  clearTimeout(redraw);
  redraw = window.setTimeout(() => {
    const st = useStore.getState(), slide = slideOf(st);
    const fig = slide.figure, pic = standInOf(slide);
    if (!fig || !pic) return;
    const src = figureStill(fig);
    if (!src || src === pic.params.src) return;
    st.updateSlide((s) => {
      const l = s.layers.find((x) => x.id === pic.id);
      if (l) l.params.src = src;
      if (s.recipe?.args && 'src' in s.recipe.args) s.recipe.args.src = src;
    }, merge);
  }, 350);
}

/** One word field: its label, and a box to type in. `fkey` is how a double-click on the canvas asks for it. */
function WordField({ fkey, label, aria, value, long, onChange, merge }: { fkey: string; label: string; aria: string; value: string; long: boolean; onChange: (v: string) => void; merge: React.MutableRefObject<string> }) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== fkey || !ref.current) return;
      // Only the panel scrolls: scrollIntoView would move the whole studio inside the shell's frame too.
      const el = ref.current, pane = el.closest('.panel-scroll');
      if (pane) pane.scrollTop += el.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientHeight / 2;
      el.focus({ preventScroll: true });
      el.select();
    };
    window.addEventListener('sf-figure-word', on);
    return () => window.removeEventListener('sf-figure-word', on);
  }, [fkey]);
  const props = {
    ref, value, 'aria-label': aria,
    onFocus: () => (merge.current = newGesture()),
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  };
  return (
    <label className="figure-word">
      <span className="figure-word-label">{label}</span>
      {long || value.includes('\n') ? <textarea className="textarea" rows={Math.min(8, Math.max(3, Math.ceil(value.length / 38)))} {...props} /> : <input className="text-input" {...props} />}
    </label>
  );
}

/** The Figure tab: the figure's words, grouped as the room meets them: the slide's, the figure's, then each step's. */
export function FigurePanel() {
  const slide = useStore(slideOf);
  const fig = slide.figure;
  const merge = useRef(newGesture());
  const updateSlide = useStore((s) => s.updateSlide);
  const words = useMemo(() => figureWords(fig), [fig]);
  if (!fig) return null;
  const groups = [...new Set(words.map((w) => w.group))];
  return (
    <>
      <div className="hint figure-hint">
        A live figure: the show steps it and the room can point at it. Its words are here. Type to change them and the picture is drawn again. Double-click a word on the slide to jump to it.
      </div>
      {!words.length && <div className="hint">This figure has no words to edit.</div>}
      {groups.map((g) => (
        <Section key={g} title={g === 'Figure' ? 'On the figure' : g} defaultOpen={g !== 'Slide' || groups.length < 3}>
          {words.filter((w) => w.group === g).map((w) => (
            <WordField key={wordKey(w)} fkey={wordKey(w)} label={w.label} aria={`${w.group} · ${w.label}`} value={w.value} long={w.long} merge={merge}
              onChange={(v) => {
                const next = setFigureWord(fig, w, v);
                updateSlide((s) => { s.figure = next; if (w.path[0] === 'title') s.name = `Live figure · ${v}`.trim(); }, merge.current);
                redrawStandIn(merge.current);
              }} />
          ))}
        </Section>
      ))}
    </>
  );
}

// ── Words in a drawn picture ─────────────────────────────────────────────────────────────────────────────
// A picture drawn as SVG (a lesson's diagram: an arc, a spectrum, a table of tests) has its words as <text>. They
// are listed and edited here as a figure's are; the edited picture is kept in the lesson, as its own SVG.

/** A picture whose words can be edited: an SVG, by its address or inside a data URL. */
export const isSvgPicture = (l: Layer | null | undefined) => {
  const src = String(l?.kind === 'image' ? l.params.src ?? '' : '');
  return /^data:image\/svg\+xml/i.test(src) || /\.svg([?#]|$)/i.test(src);
};

const svgCache = new Map<string, Promise<string | null>>();
/** The SVG markup of a picture, from its data URL or fetched from its address (once). */
export function svgOf(src: string): Promise<string | null> {
  if (!svgCache.has(src)) {
    svgCache.set(src, (async () => {
      const m = /^data:image\/svg\+xml(;[^,]*)?,(.*)$/is.exec(src);
      if (m) return /;base64/i.test(m[1] ?? '') ? decodeURIComponent(escape(atob(m[2]))) : decodeURIComponent(m[2]);
      try { const r = await fetch(src); return r.ok ? await r.text() : null; } catch { return null; }
    })());
  }
  return svgCache.get(src)!;
}

export const pictureWordKey = (i: number) => `svg:${i}`;

/** The Words tab of a drawn picture: each of its texts, edited in place; the picture becomes the lesson's own copy. */
export function PictureWordsPanel({ layer }: { layer: Layer }) {
  const src = String(layer.params.src ?? '');
  const [svg, setSvg] = useState<string | null | undefined>(undefined);
  const merge = useRef(newGesture());
  const updateLayer = useStore((s) => s.updateLayer);
  useEffect(() => { let on = true; setSvg(undefined); svgOf(src).then((t) => { if (on) setSvg(t); }); return () => { on = false; }; }, [src]);
  const runs = useMemo(() => (svg ? svgTexts(svg) : []), [svg]);
  if (svg === undefined) return <div className="hint">Reading the picture's words…</div>;
  if (!svg) return <div className="hint">This picture's words could not be read.</div>;
  const change = (i: number, v: string) => {
    const fig = setFigureWord({ figure: '', figureData: { svg } }, { path: ['figureData', 'svg'], svgText: i }, v);
    const next = (fig.figureData as { svg: string }).svg;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(next);
    svgCache.set(url, Promise.resolve(next));
    setSvg(next);
    updateLayer(layer.id, (l) => { l.params.src = url; }, merge.current);
    useStore.getState().updateSlide((s) => { if (s.recipe?.args && s.recipe.args.src === src) s.recipe.args.src = url; }, merge.current);
  };
  return (
    <>
      <div className="hint figure-hint">A drawn picture. Put its words on the slide to click into them and type, move them or restyle them, like any text; the drawing stays under them. Or change them here.</div>
      {runs.length > 0 && <div className="figure-unpack"><button className="btn primary" onClick={() => void unpackPicture(layer.id).then(({ n }) => { if (n) useStore.getState().set({ inspectorTab: 'design' }); })}>Put the words on the slide</button></div>}
      {!runs.length && <div className="hint">This picture has no words in it.</div>}
      <Section title="In the picture">
        {runs.map((r, i) => <WordField key={i} fkey={pictureWordKey(i)} label={`Words ${i + 1}`} aria={`In the picture · ${i + 1}`} value={r.value} long={r.value.length > 90} merge={merge} onChange={(v) => change(i, v)} />)}
      </Section>
    </>
  );
}

// ── A drawn picture's words onto the slide ───────────────────────────────────────────────────────────────
// Its words become text layers where they were drawn, the drawing stays a picture under them without its words.
// Then each word is clicked into and typed on the canvas like any other text. One undo step puts it back.

interface Drawn { text: string; x: number; y: number; w: number; h: number; size: number; color: string; weight: string; italic: boolean; font: string; align: 'left' | 'center' | 'right'; tracking: number; uppercase: boolean }

const firstFamily = (f: string) => (f.split(',')[0] ?? '').replace(/["']/g, '').trim() || 'Inter';

/** The drawn words of an SVG, measured as drawn at w × h, and the drawing with them taken out. */
function takeWords(svg: string, w: number, h: number): { drawing: string; words: Drawn[] } | null {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;overflow:hidden`;
  host.innerHTML = svg;
  document.body.appendChild(host);
  try {
    const el = host.querySelector('svg');
    if (!el) return null;
    el.setAttribute('width', String(w));
    el.setAttribute('height', String(h));
    const vb = el.viewBox?.baseVal, k = vb && vb.width ? Math.min(w / vb.width, h / vb.height) : 1;
    const o = host.getBoundingClientRect(), words: Drawn[] = [];
    const texts = [...el.querySelectorAll('text')];
    for (const t of texts) {
      // A text whose tspans are its lines (each placed with x, y or dy) gives a layer a line; one whose tspans only
      // style a word inside it ("<b>nodes</b> for the dots") stays one line, all its words.
      const own = [...t.childNodes].some((c) => c.nodeType === 3 && c.textContent!.trim());
      const lines = [...t.querySelectorAll('tspan')].filter((x) => x.textContent!.trim() && (x.hasAttribute('x') || x.hasAttribute('y') || x.hasAttribute('dy')));
      const runs = own ? [] : lines;
      for (const r of runs.length ? runs : [t]) {
        const b = r.getBoundingClientRect(), cs = getComputedStyle(r);
        const text = (r.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (!text || !b.width) continue;
        const size = parseFloat(cs.fontSize) * k, anchor = (r.closest('[text-anchor]')?.getAttribute('text-anchor') ?? cs.textAnchor) || 'start';
        const ls = parseFloat(cs.letterSpacing) || 0;
        words.push({
          text, size, x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height,
          color: cs.fill && cs.fill !== 'none' ? cs.fill : '#111111', weight: String(Math.round(Number(cs.fontWeight) / 100) * 100 || 400),
          italic: cs.fontStyle === 'italic', font: firstFamily(cs.fontFamily), align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
          tracking: ls ? (ls * k) / size : 0, uppercase: cs.textTransform === 'uppercase',
        });
      }
      t.remove();
    }
    return { drawing: new XMLSerializer().serializeToString(el), words };
  } finally { host.remove(); }
}

/** Put a drawn picture's words on the slide as text layers, the drawing kept under them. Returns how many, and the
 *  id of the one under (x, y) on the slide, if any. */
export async function unpackPicture(layerId: string, at?: [number, number]): Promise<{ n: number; under?: string }> {
  const st = useStore.getState(), slide = slideOf(st), pic = slide.layers.find((l) => l.id === layerId);
  if (!pic?.box) return { n: 0 };
  const svg = await svgOf(String(pic.params.src ?? ''));
  const out = svg ? takeWords(svg, pic.box.w, pic.box.h) : null;
  if (!out || !out.words.length) return { n: 0 };
  const box = pic.box, url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out.drawing);
  // A little room either side, kept on the side the words are anchored to, so a face that sets a touch wider still fits.
  const made = out.words.map((d) => {
    const extra = Math.max(12, d.w * 0.25), w = d.w + extra;
    const x = d.align === 'left' ? d.x : d.align === 'right' ? d.x - extra : d.x - extra / 2;
    return createLayer('text', {
      name: `Words · ${d.text.slice(0, 30)}`,
      box: { x: box.x + x, y: box.y + d.y - d.size * 0.12, w, h: d.h + d.size * 0.3, rot: 0 },
      params: { text: d.text, font: d.font, size: Math.round(d.size * 10) / 10, color: d.color, weight: d.weight, italic: d.italic, align: d.align, lineHeight: 1.1, tracking: d.tracking, uppercase: d.uppercase, fit: 'shrink' },
      anim: { ...pic.anim },
    });
  });
  st.mutate((deck) => {
    const s = deck.slides.find((x) => x.id === slide.id)!, i = s.layers.findIndex((l) => l.id === layerId);
    const p = s.layers[i];
    if (s.recipe?.args && s.recipe.args.src === p.params.src) delete s.recipe; // its words are layers now: not rebuilt from the picture
    p.params.src = url;
    s.layers.splice(i + 1, 0, ...made);
  }, newGesture());
  const under = at ? made.find((l) => l.box && at[0] >= l.box.x && at[0] <= l.box.x + l.box.w && at[1] >= l.box.y && at[1] <= l.box.y + l.box.h) : undefined;
  return { n: made.length, under: under?.id };
}
