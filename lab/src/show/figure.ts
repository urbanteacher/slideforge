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
