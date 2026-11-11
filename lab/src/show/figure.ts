// A live figure in the studio's show (lab-engine-plan M15): a lab slide that carries one of SlideForge's live
// figures (slide.figure, src/figures/) plays it over the slide, as an SVG layer of its own (FigureLayer.tsx; hard
// rule 4: never into the canvas). Next and Back walk the figure's steps before the show moves on, as classic's
// Explore hook does (src/render/explore.js step), and a figure keeps the step it was left on for the rest of the
// show (classic's exploreStates). Pure: the steps, and which one each figure is on. No DOM.

import { installFigures } from '@sf/figures/index.js';
import type { LiveFigure, Slide } from '../core';

const SF: { Figures?: SFFigures } = {};
installFigures(SF);
export const Figures = SF.Figures!;

type FigureSlide = Pick<Slide, 'id' | 'figure'> & Partial<Pick<Slide, 'liveFigure'>>;

/** The figure a slide plays, as SlideForge's figure slide, or null (none, or one SlideForge does not draw). */
export function figureSlide(s: FigureSlide | undefined): SFFigureSlide | null {
  const f: LiveFigure | undefined = s?.figure;
  return f?.figure && Figures.kinds.includes(f.figure) ? { ...f, type: 'figure', figure: f.figure } : null;
}

/** Why the studio's show cannot play this slide's figure, or '' (no figure, or one it plays). */
export function figureBlocker(s: FigureSlide & Pick<Slide, 'name'>): string {
  if (!s.figure?.figure) return s.liveFigure ? `"${s.name}" has a live figure the lesson does not carry` : '';
  return figureSlide(s) ? '' : `"${s.name}" has a live figure (${s.figure.figure}) SlideForge does not draw`;
}

/** What the Teacher Presenter says of the figure on the wall: its step, of how many, and the step's caption. */
export interface FigureStep { step: number; of: number; caption: string }

export class FigureSteps {
  private at = new Map<string, number>();

  /** The step this slide's figure is on (from 0), or null with no figure. */
  step(s: FigureSlide | undefined): number | null {
    const f = figureSlide(s);
    return f ? Math.min(this.at.get(s!.id) ?? 0, Figures.count(f) - 1) : null;
  }

  /** One Next (1) or Back (-1) on this slide: true when its figure took it (a step that way), false when the show moves on. */
  move(s: FigureSlide | undefined, dir: 1 | -1): boolean {
    const f = figureSlide(s), now = this.step(s);
    if (!f || now == null) return false;
    const to = now + dir;
    if (to < 0 || to >= Figures.count(f)) return false;
    this.at.set(s!.id, to);
    return true;
  }

  /** The figure's step as the desk says it, or null. */
  says(s: FigureSlide | undefined): FigureStep | null {
    const f = figureSlide(s), n = this.step(s);
    if (!f || n == null) return null;
    const st = Figures.steps(f)[n] as { caption?: unknown };
    return { step: n + 1, of: Figures.count(f), caption: typeof st?.caption === 'string' ? st.caption : '' };
  }
}

/** A live figure drawn still, as the room sees its last step, in a hidden box the size of the slide: what
 *  `draw` does with it (a picture, a word under a point) happens while it is in the page, then it goes. */
function drawnStill<T>(f: LiveFigure, draw: (svg: SVGSVGElement) => T): T | null {
  const fig = figureSlide({ id: '', figure: f });
  if (!fig || typeof document === 'undefined') return null;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1280px;height:720px;overflow:hidden';
  document.body.appendChild(host);
  try {
    const pad = document.createElement('div');
    pad.className = 'pad';
    host.appendChild(pad);
    Figures.render(host, pad, fig, { interactive: false });
    const svg = host.querySelector<SVGSVGElement>('svg.fig-svg');
    return svg ? draw(svg) : null;
  } catch (err) { console.error(err); return null; } finally { host.remove(); }
}

/** The figure's stand-in picture, drawn again from the figure: plain SVG, as js/lab-engine.js draws the first one. */
export function figureStill(f: LiveFigure): string | null {
  return drawnStill(f, (svg) => {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '1280');
    svg.setAttribute('height', '720');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  });
}

/** The words the figure draws at a point (in the figure's own 1280 × 720), or null: the smallest text there. */
export function figureTextAt(f: LiveFigure, x: number, y: number): string | null {
  return drawnStill(f, (svg) => {
    let best: { area: number; text: string } | null = null;
    for (const t of svg.querySelectorAll<SVGTextElement>('text')) {
      const text = (t.textContent ?? '').trim();
      if (!text) continue;
      let b: DOMRect;
      try { b = t.getBBox(); } catch { continue; }
      const m = t.getCTM(), pad = 6;
      // The box in the figure's frame: a text inside a moved or scaled group is where the group puts it.
      const p0 = m ? new DOMPoint(b.x, b.y).matrixTransform(m) : { x: b.x, y: b.y };
      const p1 = m ? new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m) : { x: b.x + b.width, y: b.y + b.height };
      const x0 = Math.min(p0.x, p1.x) - pad, x1 = Math.max(p0.x, p1.x) + pad, y0 = Math.min(p0.y, p1.y) - pad, y1 = Math.max(p0.y, p1.y) + pad;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const area = (x1 - x0) * (y1 - y0);
      if (!best || area < best.area) best = { area, text };
    }
    return best?.text ?? null;
  });
}
