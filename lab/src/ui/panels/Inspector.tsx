import { CATEGORY_LABEL, kind } from '../../engine';
import { layerOf, useStore } from '../../store';
import { KindIcon } from '../controls/icons';
import { EngagementPanel } from './Engagement';
import { SPECIAL_TABS, SpecialPanel } from './special';
import { Image as ImageIcon, MonitorPlay } from 'lucide-react';
import { LayerAnimate, SlideAnimate } from './inspectorAnimate';
import { LayerDesign } from './inspectorDesign';
import { LayerInteract } from './inspectorInteract';
import { PicturePanel, VideoPanel } from './inspectorMedia';
import { SlideDesign } from './inspectorSlide';

export function Inspector() {
  const layer = useStore(layerOf);
  const chosen = useStore((s) => s.inspectorTab);
  // The Picture tab exists only for a picture; with anything else selected it reads as Design.
  // Each tab only where it has something to set: Picture for a picture, Interact for a layer.
  // A picture's Picture tab reads as a video's Video tab, and the other way round, so switching
  // between the two keeps you on the media settings.
  const tab = chosen === 'picture' && layer?.kind === 'video' ? 'video' : chosen === 'video' && layer?.kind === 'image' ? 'picture'
    : (chosen === 'picture' && layer?.kind !== 'image') || (chosen === 'video' && layer?.kind !== 'video') || (chosen === 'special' && !(layer && SPECIAL_TABS[layer.kind])) || (chosen === 'interact' && !layer) ? 'design' : chosen;
  const set = useStore((s) => s.set);
  const k = layer ? kind(layer.kind) : null;

  return (
    <aside className="right">
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
      <div className="tabs">
        {(layer?.kind === 'image' ? (['design', 'picture', 'animate', 'interact', 'engage'] as const) : layer?.kind === 'video' ? (['design', 'video', 'animate', 'interact', 'engage'] as const) : layer && SPECIAL_TABS[layer.kind] ? (['design', 'special', 'animate', 'interact', 'engage'] as const) : layer ? (['design', 'animate', 'interact', 'engage'] as const) : (['design', 'animate', 'engage'] as const)).map((t) => (
          <button key={t} className={`tab${tab === t ? ' sel' : ''}${t === 'picture' || t === 'video' || t === 'special' ? ' tab-picture' : ''}`} onClick={() => set({ inspectorTab: t })} title={t === 'engage' ? 'Games, activities and audience feedback for this slide' : undefined}>{(t === 'picture' || t === 'video' || t === 'special') && <ImageIcon size={13} />}{t === 'engage' ? 'Engage' : t === 'special' && layer ? SPECIAL_TABS[layer.kind] : t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <div className="panel-scroll">
        {tab === 'picture' && layer && <PicturePanel layer={layer} />}
        {tab === 'video' && layer && <VideoPanel layer={layer} />}
        {tab === 'special' && layer && <SpecialPanel layer={layer} />}
        {tab === 'design' && (layer ? <LayerDesign layer={layer} /> : <SlideDesign />)}
        {tab === 'animate' && (layer ? <LayerAnimate layer={layer} /> : <SlideAnimate />)}
        {tab === 'interact' && layer && <LayerInteract layer={layer} />}
        {tab === 'engage' && <EngagementPanel />}
      </div>
    </aside>
  );
}
