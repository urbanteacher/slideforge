// The Picture and Video tabs: everything about a picture or a clip in one place.
import { Image as ImageIcon } from 'lucide-react';
import type { Layer } from '../../core';
import { kind, videoService, type ParamDef } from '../../engine';
import { slideOf, useStore } from '../../store';
import { Row, Section, Select } from '../controls/controls';
import { addCaption, captionsOf, setArrival, setCaptionClear, setCaptionPos, setCaptionStyle, type CaptionStyle } from './picture';
import { setVideoLayout, videoLayoutOf, type VideoLayout } from './video';
import { LayerDesign, VideoPick } from './inspectorDesign';

/** Everything about a picture in one tab: the image, its frame and focus, its caption, its motion. */
export function PicturePanel({ layer }: { layer: Layer }) {
  return (
    <>
      <div className="picture-head"><ImageIcon size={14} />Picture settings — the image, its frame and focus, its caption and how it moves. Drag the focus points on the picture.</div>
      <LayerDesign layer={layer} picture />
      <CaptionSection layer={layer} />
      <ImageEffects layer={layer} />
    </>
  );
}

/** Everything about a video in one tab, as SlideForge's video inspector has it: the address, how the
 *  clip sits on the slide (full screen with or without words, or under a heading), its frame and
 *  still, where it starts and stops, how it plays, and its caption. */
export function VideoPanel({ layer }: { layer: Layer }) {
  const slide = useStore(slideOf);
  const now = videoLayoutOf(slide, layer);
  const service = videoService(layer.params), file = String(layer.params.src ?? '').startsWith('data:');
  const LAYOUTS_V: { value: VideoLayout; label: string; hint: string }[] = [
    { value: 'bare', label: 'Full screen, no words', hint: 'The clip is the slide.' },
    { value: 'caption', label: 'Full screen, caption over it', hint: 'A line on a shade across the foot of the clip.' },
    { value: 'heading', label: 'Framed under a heading', hint: '16:9, beneath the slide’s heading; nothing over the picture.' },
  ];
  return (
    <>
      <div className="picture-head"><ImageIcon size={14} />Video settings — the address, how the clip sits on the slide, how it plays, and its caption.</div>
      <Section title="Address">
        <VideoPick value={String(layer.params.src ?? '')} onChange={(x) => useStore.getState().updateLayer(layer.id, (l) => { l.params.src = x; })} />
        <div className="desc on-canvas">{service ? `${service} link understood — the slide shows its still, and Preview plays the real player.` : (file || layer.params.src) && layer.params.muted === false ? `${file ? 'A file carried in the deck' : 'A link to a video file'}. In the show it plays with its sound${layer.params.autoplay ? ' as the slide arrives' : ' when pressed'}, and stops when the show moves on.` : file ? 'A file carried in the deck. It plays muted on a loop, on the slide itself.' : layer.params.src ? 'A link to a video file. It plays muted on a loop, on the slide itself.' : 'Paste a YouTube, Vimeo or .mp4 address, or upload a clip.'}</div>
      </Section>
      <Section title="On the slide">
        <div className="video-layouts">
          {LAYOUTS_V.map((o) => (
            <button key={o.value} className={`btn-soft${now === o.value ? ' on' : ''}`} title={o.hint} onClick={() => setVideoLayout(layer.id, o.value)}>{o.label}</button>
          ))}
        </div>
      </Section>
      <LayerDesign layer={layer} picture />
      <CaptionSection layer={layer} />
    </>
  );
}

const CAP_STYLES: { value: CaptionStyle; label: string }[] = [
  { value: 'gradient', label: 'Shade over the image' }, { value: 'bar', label: 'Colour bar' },
  { value: 'plain', label: 'Plain text' }, { value: 'hidden', label: 'Hidden' },
];

/** The picture's caption — whatever text sits on it — styled and placed from here, typed on the slide. */
function CaptionSection({ layer }: { layer: Layer }) {
  const slide = useStore(slideOf);
  const caps = captionsOf(slide, layer);
  return (
    <Section title="Caption">
      {caps.length ? (
        <>
          <Row label="Caption style"><Select value={String(layer.params.capStyle ?? 'plain')} options={CAP_STYLES} onChange={(v) => setCaptionStyle(layer.id, v as CaptionStyle)} /></Row>
          <Row label="Caption position"><Select value={String(layer.params.capPos ?? 'bottom')} options={[{ value: 'bottom', label: 'Bottom' }, { value: 'top', label: 'Top' }]} onChange={(v) => setCaptionPos(layer.id, v as 'top' | 'bottom')} /></Row>
          <div className="desc on-canvas">The caption is the text on the picture. Double-click it on the slide to change the words.</div>
        </>
      ) : (
        <>
          <div className="desc">No caption yet. Text placed on the picture becomes its caption.</div>
          <button className="btn-soft tidy" onClick={() => addCaption(layer.id)}>Add a caption</button>
        </>
      )}
    </Section>
  );
}

const CLEARS = [{ value: '0', label: 'Stays on the picture' }, { value: '5', label: 'After 5 seconds' }, { value: '10', label: 'After 10 seconds' }, { value: '20', label: 'After 20 seconds' }, { value: '30', label: 'After 30 seconds' }];

/** SlideForge's picture motion: when it arrives, how it moves inside its frame, and whether the caption clears. */
function ImageEffects({ layer }: { layer: Layer }) {
  const slide = useStore(slideOf);
  const update = useStore((s) => s.updateLayer);
  const k = kind(layer.kind);
  const def = (key: string) => k.params.find((d) => d.key === key) as Extract<ParamDef, { type: 'select' }>;
  const motion = String(layer.params.motion ?? 'none');
  const caps = captionsOf(slide, layer);
  return (
    <Section title="Image effects">
      <Row label="Build on Next" info="Hold the picture back until the next press, the way a build step works.">
        <Select value={layer.anim.trigger === 'onClick' ? 'click' : 'slide'} options={[{ value: 'slide', label: 'Show everything at once' }, { value: 'click', label: 'Hold the image back until the next press' }]} onChange={(v) => setArrival(layer.id, v as 'slide' | 'click')} />
      </Row>
      <Row label="Image motion" info="Plays in Preview and when you press Play. Zoom closes in on the image focus; Travel moves from it to a second point. Drag both on the picture.">
        <Select value={motion} options={def('motion').options} onChange={(v) => update(layer.id, (l) => { l.params.motion = v; if (v !== 'none' && l.params.fit !== 'cover') l.params.fit = 'cover'; })} />
      </Row>
      {motion !== 'none' && (
        <Row label="How long"><Select value={String(layer.params.motionSecs ?? '20')} options={def('motionSecs').options} onChange={(v) => update(layer.id, (l) => { l.params.motionSecs = v; })} /></Row>
      )}
      {motion !== 'none' && <div className="desc on-canvas">{motion === 'travel' ? 'Drag “Image focus” and “Travels to” on the picture to set where it starts and ends.' : 'Drag “Image focus” on the picture to choose what the zoom closes in on.'}</div>}
      <Row label="Caption clears itself" info="The text on the picture fades away after this long, leaving the picture.">
        <Select value={String(layer.params.capClear ?? 0)} options={CLEARS} disabled={!caps.length} onChange={(v) => setCaptionClear(layer.id, Number(v))} />
      </Row>
      {!caps.length && <div className="desc">No caption on this picture — add one under Design → Caption.</div>}
    </Section>
  );
}
