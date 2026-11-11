import { CATEGORY_LABEL, kind } from '../../engine';
import { layerOf, slideOf, useStore } from '../../store';
import { KindIcon } from '../controls/icons';
import { EngagementPanel } from './Engagement';
import { SPECIAL_TABS, SpecialPanel } from './special';
import { Image as ImageIcon, MonitorPlay } from 'lucide-react';
import type { ReactNode } from 'react';
import { LayerAnimate, SlideAnimate } from './inspectorAnimate';
import { LayerDesign } from './inspectorDesign';
import { LayerInteract } from './inspectorInteract';
import { PicturePanel, VideoPanel } from './inspectorMedia';
import { SlideDesign } from './inspectorSlide';
import { FigurePanel, PictureWordsPanel, isSvgPicture } from './figure';

/** The inspector's body. Its column (shell/RightColumn) puts it beside the Status tab and hands it `banner`: what is
 *  selected, where a change is kept, and why one can't be, under the head. */
export function Inspector({ banner }: { banner?: ReactNode }) {
  const layer = useStore(layerOf);
  // A live figure's slide has a Figure tab: its words (figure.tsx), whatever is selected on it.
  const hasFigure = useStore((s) => !!slideOf(s).figure?.figure);
  // A drawn picture (an SVG) has a Words tab: the words in it (figure.tsx).
  const svgWords = !hasFigure && isSvgPicture(layer);
  const words = hasFigure || svgWords;
  const chosen = useStore((s) => s.inspectorTab);
  // The Picture tab exists only for a picture; with anything else selected it reads as Design.
  // Each tab only where it has something to set: Picture for a picture, Interact for a layer.
  // A picture's Picture tab reads as a video's Video tab, and the other way round, so switching
  // between the two keeps you on the media settings.
  const tab = chosen === 'picture' && layer?.kind === 'video' ? 'video' : chosen === 'video' && layer?.kind === 'image' ? 'picture'
    : (chosen === 'picture' && layer?.kind !== 'image') || (chosen === 'video' && layer?.kind !== 'video') || (chosen === 'special' && !(layer && SPECIAL_TABS[layer.kind])) || (chosen === 'interact' && !layer) || (chosen === 'figure' && !words) ? 'design' : chosen;
  const set = useStore((s) => s.set);
  const k = layer ? kind(layer.kind) : null;

  return (
    <div className="insp-body">
      <div className="insp-head">
        {layer && k ? (
          <>
            <div className="insp-ico"><KindIcon kind={layer.kind} size={18} /></div>
            <div><div className="insp-title">{layer.name}</div><div className="insp-sub">{CATEGORY_LABEL[k.category]}</div></div>
          </>
        ) : (
          <>
            <div className="insp-ico slide"><MonitorPlay size={18} /></div>
            <div><div className="insp-title">Slide</div><div className="insp-sub">Nothing selected</div></div>
          </>
        )}
      </div>
      {banner}
      <div className="tabs">
        {[...(words ? (['figure'] as const) : []), ...(layer?.kind === 'image' ? (['design', 'picture', 'animate', 'interact', 'engage'] as const) : layer?.kind === 'video' ? (['design', 'video', 'animate', 'interact', 'engage'] as const) : layer && SPECIAL_TABS[layer.kind] ? (['design', 'special', 'animate', 'interact', 'engage'] as const) : layer ? (['design', 'animate', 'interact', 'engage'] as const) : (['design', 'animate', 'engage'] as const))].map((t) => (
          <button key={t} className={`tab${tab === t ? ' sel' : ''}${t === 'picture' || t === 'video' || t === 'special' ? ' tab-picture' : ''}`} onClick={() => set({ inspectorTab: t })} title={t === 'engage' ? 'Games, activities and audience feedback for this slide' : t === 'figure' ? "Every word of this slide's live figure" : undefined}>{(t === 'picture' || t === 'video' || t === 'special') && <ImageIcon size={13} />}{t === 'engage' ? 'Engage' : t === 'figure' ? (hasFigure ? 'Figure' : 'Words') : t === 'special' && layer ? SPECIAL_TABS[layer.kind] : t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <div className="panel-scroll">
        {tab === 'figure' && (hasFigure ? <FigurePanel /> : layer && <PictureWordsPanel layer={layer} />)}
        {tab === 'picture' && layer && <PicturePanel layer={layer} />}
        {tab === 'video' && layer && <VideoPanel layer={layer} />}
        {tab === 'special' && layer && <SpecialPanel layer={layer} />}
        {tab === 'design' && (layer ? <LayerDesign layer={layer} /> : <SlideDesign />)}
        {tab === 'animate' && (layer ? <LayerAnimate layer={layer} /> : <SlideAnimate />)}
        {tab === 'interact' && layer && <LayerInteract layer={layer} />}
        {tab === 'engage' && <EngagementPanel />}
      </div>
    </div>
  );
}
