import { useEffect, useMemo, useState } from 'react';
import { LAYOUT_STYLES, themeOf } from '../model/layouts';
import type { SFDeck, SlideDesign } from '../model/fromSlideForge';
import type { MotionLabData } from '../model/motionLab';
import { useStore } from '../model/store';
import { useThumbs } from './Gallery';
import { TEMPLATES, rosetteSvg } from '../model/defaults';
import { getImage } from '../engine/raster';

/** The lab's own first designs, in their own looks: the WebGL effects and interaction it was built
 *  to show. They stay as designed rather than taking the deck's theme — the look is the point. */
const ORIGINALS = 'Lab originals — effects and interaction';
const ORIGINAL_BLURB: Record<string, string> = {
  editorial: 'A title set letter by letter on a moving mesh gradient; a rosette pops in and sways, tilting under the pointer with parallax; ripple and film grain.',
  statement: 'A dark statement built line by line on an aurora, with a vignette and grain; it arrives on a ripple.',
  three: 'Three points built one per click on a grid, pushed in.',
  number: 'One big number, word by word, on a gradient with a grid, a glow and a lens; grain; it zooms in.',
  image: 'A picture feature: a spinning rosette through a gradient map and halftone, with grain; it dissolves in.',
  blueprint: 'A blueprint on a double grid under a spotlight; the nodes and the arrow build one per click and grow on hover; typed title.',
  closing: 'A closing line letter by letter on a mesh gradient with a wave and a chromatic split, and grain.',
};

/**
 * Slide designs: SlideForge's slides with a special feature, built by the lab in the deck's own
 * theme — from the Layout bank (Explore, Flip to facts, the gallery pile, Before / after, a playing
 * clip, a Simulation, every chart idiom, the structures) and from the Motion lab (chart callouts,
 * the chart experiments, the motion experiments and their visual studies, point-by-point builds).
 * One press adds the slide after this one, notes and all. Both load the first time the section opens.
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
    // Two sources: the Layout bank's feature slides and the Motion lab's, merged into one set of groups.
    Promise.all([import('../model/fromSlideForge'), import('../assets/layout-bank.json'), import('../model/motionLab'), import('../assets/motion-lab.json')]).then(([m, data, ml, mdata]) => {
      const bank = (data as { default: SFDeck }).default ?? (data as unknown as SFDeck);
      const motion = (mdata as { default: MotionLabData }).default ?? (mdata as unknown as MotionLabData);
      const groups = [...m.SLIDE_DESIGN_GROUPS.slice(0, 1), 'Charts that move', ...m.SLIDE_DESIGN_GROUPS.slice(1), ...ml.MOTION_DESIGN_GROUPS.filter((g) => g !== 'Charts that move')];
      if (live) setLib({ make: (s) => [...m.slideDesigns(bank, s), ...ml.motionDesigns(motion, s)], groups: [...new Set(groups)] });
    });
    return () => { live = false; };
  }, []);
  // The originals come first, as made; then the Layout bank's and the Motion lab's, in the deck's theme.
  const entries = useMemo(() => (lib ? [...TEMPLATES.map((t) => ({ id: `tpl-${t.id}`, name: t.name, group: ORIGINALS, blurb: ORIGINAL_BLURB[t.id] ?? '', slide: t.make() })), ...lib.make(st)] : []), [lib, st]);
  const thumbs = useThumbs(entries, () => !!getImage(rosetteSvg()));
  if (!lib) return <div className="panel-scroll layouts-panel"><div className="lp-label">Loading the slide designs…</div></div>;
  return (
    <div className="panel-scroll layouts-panel">
      {[ORIGINALS, ...lib.groups].map((g) => (
        <div key={g}>
          <div className="lp-label">{g}</div>
          <div className="lp-grid">
            {entries.filter((e) => e.group === g).map((e) => (
              <button key={e.id} className="lp-card" title={e.blurb}
                // Built again on the press, so every slide added has its own layers.
                onClick={() => { const tpl = TEMPLATES.find((t) => `tpl-${t.id}` === e.id); const fresh = tpl ? { slide: tpl.make() } : lib.make(st).find((x) => x.id === e.id); if (fresh) { addSlide(fresh.slide); showToast(`Inserted “${e.name}”`); } }}>
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
