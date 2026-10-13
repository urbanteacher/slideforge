// A live figure over the slide (figure.ts): SlideForge's own figure (src/figures/), drawn as SVG in an HTML layer
// the size of the slide, above the canvas and under the ink. It is somewhere to point, drag and click: a press
// inside it is the figure's, never the show's Next (the figure's own click handler says so too). Next and Back step
// it from the show (Show.tsx), and the step is handed in.

import { useEffect, useRef } from 'react';
import { Figures } from './figure';

type Refreshing = HTMLDivElement & { _exploreRefresh?: (next: { figureStep: number }) => void };

export function FigureLayer({ figure, step }: { figure: SFFigureSlide; step: number }) {
  const root = useRef<Refreshing>(null);
  const stepNow = useRef(step);
  stepNow.current = step;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pad = document.createElement('div');
    pad.className = 'pad';
    el.appendChild(pad);
    try { Figures.render(el, pad, figure, { interactive: true, exploreState: { figureStep: stepNow.current } }); } catch (err) { console.error(err); }
    return () => { el.replaceChildren(); delete el._exploreRefresh; el.classList.remove('figure-slide'); };
  }, [figure]);

  useEffect(() => { root.current?._exploreRefresh?.({ figureStep: step }); }, [step]);

  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
  return <div ref={root} className="show-figure" data-testid="show-figure" onClick={stop} onPointerDown={stop} onDoubleClick={stop} />;
}
