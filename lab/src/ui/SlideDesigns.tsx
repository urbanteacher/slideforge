import { useEffect, useMemo, useState } from 'react';
import { LAYOUT_STYLES, themeOf } from '../model/layouts';
import type { SFDeck, SlideDesign } from '../model/fromSlideForge';
import { useStore } from '../model/store';
import { useThumbs } from './Gallery';

/**
 * Slide designs: SlideForge's slides with a special feature — Explore, Flip to facts, the gallery
 * pile, Before / after, a playing clip, a Simulation, every chart idiom, the structures — built by
 * the lab in the deck's own theme. One press adds the slide after this one, notes and all.
 * The Layout bank is loaded the first time the section opens.
 */
export function SlideDesignsPanel() {
  const { addSlide, showToast } = useStore.getState();
  const themeId = useStore((s) => s.deck.theme);
  const guide = useStore((s) => s.deck.styleGuide);
  // One style per theme, so the designs (and their thumbnails) are built once, not on every render.
  const st = useMemo(() => themeOf({ theme: themeId, styleGuide: guide }) ?? LAYOUT_STYLES[0], [themeId, guide]);
  const [lib, setLib] = useState<{ make: (st: typeof LAYOUT_STYLES[number]) => SlideDesign[]; groups: string[] } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([import('../model/fromSlideForge'), import('../assets/layout-bank.json')]).then(([m, data]) => {
      if (live) setLib({ make: (s) => m.slideDesigns((data as { default: SFDeck }).default ?? (data as unknown as SFDeck), s), groups: m.SLIDE_DESIGN_GROUPS });
    });
    return () => { live = false; };
  }, []);
  const entries = useMemo(() => (lib ? lib.make(st) : []), [lib, st]);
  const thumbs = useThumbs(entries);
  if (!lib) return <div className="panel-scroll layouts-panel"><div className="lp-label">Loading the slide designs…</div></div>;
  return (
    <div className="panel-scroll layouts-panel">
      {lib.groups.map((g) => (
        <div key={g}>
          <div className="lp-label">{g}</div>
          <div className="lp-grid">
            {entries.filter((e) => e.group === g).map((e) => (
              <button key={e.id} className="lp-card" title={e.blurb}
                // Built again on the press, so every slide added has its own layers.
                onClick={() => { const fresh = lib.make(st).find((x) => x.id === e.id); if (fresh) { addSlide(fresh.slide); showToast(`Inserted “${e.name}”`); } }}>
                <div className="lp-thumb">{thumbs[e.id] && <img src={thumbs[e.id]} alt="" />}</div>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
