import { Image as ImageIcon, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, MonitorPlay, Play, RotateCcw, Shuffle, WandSparkles } from 'lucide-react';
import { setVideoLayout, videoLayoutOf, type VideoLayout } from './video';
import { videoService } from '../model/video';
import { RecipePanel, SPECIAL_TABS, SpecialPanel } from './special';
import { RECIPE_NAMES } from '../model/recipes';
import { EngagementPanel } from './Engagement';
import { backdropOf, setBackdrop, type BackdropMode } from '../model/backdrop';
import { useRef } from 'react';
import { animTotal, isTextUnit, presetOf, presetTiming, schedule, type Spacing, type Speed } from '../engine/anim';
import { autoHeight, textSize } from '../engine/raster';
import { CATEGORY_LABEL, FONTS, defaultParams, kind, type ParamDef } from '../engine/registry';
import { layerOf, slideOf, useStore } from '../model/store';
import type { BlendMode, ClickAction, Easing, EntranceType, HoverType, Layer, LoopType, ParamValue, TransitionType, Trigger } from '../model/types';
import { ColorField, Row, Scrub, Section, Select, Toggle, newGesture } from './controls';
import { KindIcon } from './icons';
import { addCaption, applyFrame, captionsOf, setArrival, setCaptionClear, setCaptionPos, setCaptionStyle, type CaptionStyle } from './picture';
import { alignLayer, nextDirection, sequenceSize, tidySlide, tidyUp, type Edge } from './snap';
import { buildSet, itemNoun, setBuildOf, type SetBuild } from './build';
import { siblingsOf } from './order';
import { Choreography } from './Choreography';
import { fontChoices } from '../model/guide';
import { themeOf } from '../model/layouts';
import { setSlideGround } from '../model/theme';

const BLENDS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }, { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' }, { value: 'softLight', label: 'Soft light' }, { value: 'hardLight', label: 'Hard light' },
  { value: 'darken', label: 'Darken' }, { value: 'lighten', label: 'Lighten' }, { value: 'colorDodge', label: 'Colour dodge' },
  { value: 'colorBurn', label: 'Colour burn' }, { value: 'difference', label: 'Difference' }, { value: 'exclusion', label: 'Exclusion' },
  { value: 'add', label: 'Add' },
];

const ENTRANCES: { value: EntranceType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'rise', label: 'Rise' }, { value: 'drop', label: 'Drop' },
  { value: 'slideLeft', label: 'Slide from right' }, { value: 'slideRight', label: 'Slide from left' },
  { value: 'zoomIn', label: 'Zoom in' }, { value: 'zoomOut', label: 'Zoom out' }, { value: 'pop', label: 'Pop' },
  { value: 'blur', label: 'Blur in' }, { value: 'wipeUp', label: 'Wipe up' }, { value: 'wipeRight', label: 'Wipe right' }, { value: 'spin', label: 'Spin in' },
];
const TEXT_ENTRANCES: { value: EntranceType; label: string }[] = [
  { value: 'letters', label: 'Letter by letter' }, { value: 'words', label: 'Word by word' },
  { value: 'lines', label: 'Line reveal (masked)' }, { value: 'typewriter', label: 'Typewriter' },
];
const EASINGS: { value: Easing; label: string }[] = [
  { value: 'easyEase', label: 'Easy Ease — SlideForge’s words' },
  { value: 'expoOut', label: 'Expo out — crisp' }, { value: 'quintOut', label: 'Quint out' }, { value: 'cubicOut', label: 'Cubic out' },
  { value: 'cubicInOut', label: 'Cubic in-out' }, { value: 'backOut', label: 'Back out — overshoot' }, { value: 'spring', label: 'Spring' },
  { value: 'linear', label: 'Linear' },
];
const TRIGGERS: { value: Trigger; label: string }[] = [
  { value: 'withSlide', label: 'With previous' }, { value: 'afterPrev', label: 'After previous' }, { value: 'onClick', label: 'On click' },
];
const LOOPS: { value: LoopType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'float', label: 'Float' }, { value: 'pulse', label: 'Pulse' },
  { value: 'sway', label: 'Sway' }, { value: 'spin', label: 'Spin' }, { value: 'breathe', label: 'Breathe' },
];
const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'Cut' }, { value: 'fade', label: 'Crossfade' }, { value: 'push', label: 'Push' }, { value: 'zoom', label: 'Zoom' },
  { value: 'ripple', label: 'Ripple' }, { value: 'dissolve', label: 'Burn dissolve' }, { value: 'wipe', label: 'Soft wipe' },
  { value: 'pixelate', label: 'Pixelate' }, { value: 'blur', label: 'Blur' },
  { value: 'morph', label: 'Morph — carry what the slides share' },
];
const FEELS: { value: 'rise' | 'fade' | 'reveal' | 'plain'; label: string }[] = [
  { value: 'rise', label: 'Rise — up from below, blur clearing' }, { value: 'fade', label: 'Fade — no movement' },
  { value: 'reveal', label: 'Reveal — wiped up from behind its line' }, { value: 'plain', label: 'Plain — a short rise, no blur' },
];
const CHART_ENTRANCES: { value: EntranceType; label: string }[] = [{ value: 'draw', label: 'Draws itself' }];
const SPEED_OPTIONS: { value: Speed | 'custom'; label: string }[] = [
  { value: 'gentle', label: 'Gentle — slower, and holds longer' }, { value: 'medium', label: 'Medium' }, { value: 'quick', label: 'Quick' },
];
const SPACING_OPTIONS: { value: Spacing | 'custom'; label: string }[] = [
  { value: 'together', label: 'Together — arrives as one' }, { value: 'wave', label: 'Wave — eased, a little apart' }, { value: 'one', label: 'One at a time — the widest spread' },
];
const HOVERS: { value: HoverType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'lift', label: 'Lift' }, { value: 'grow', label: 'Grow' }, { value: 'glow', label: 'Glow' }, { value: 'tilt', label: 'Tilt to pointer' },
];
const CLICKS: { value: ClickAction; label: string }[] = [
  { value: 'none', label: 'Advance (default)' }, { value: 'next', label: 'Next slide' }, { value: 'prev', label: 'Previous slide' },
  { value: 'goto', label: 'Go to slide…' }, { value: 'link', label: 'Open link…' }, { value: 'flip', label: 'Flip to facts — turn the slide over' },
];

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

// ─── Design ─────────────────────────────────────────────────────────────────
function LayerDesign({ layer, picture = false }: { layer: Layer; picture?: boolean }) {
  const k = kind(layer.kind);
  const update = useStore((s) => s.updateLayer);
  const up = (fn: (l: Layer) => void, merge?: string) => update(layer.id, fn, merge);
  const setParam = (key: string, v: ParamValue, merge?: string) => up((l) => {
    l.params[key] = v;
    if (key === 'frame') applyFrame(l, String(v), useStore.getState().deck);
  }, merge);

  const groups: { name: string; defs: ParamDef[] }[] = [];
  for (const d of k.params) {
    if (d.group === '_hidden' || d.group === '_motion' || (d.when && !d.when(layer.params))) continue;
    // A picture's own settings live in its Picture tab, together, not spread through Design.
    const pictureGroup = d.group === 'Image' || d.group === 'Picture' || (layer.kind === 'video' && d.group === 'Video');
    if ((layer.kind === 'image' || layer.kind === 'video') && (picture ? !pictureGroup : pictureGroup)) continue;
    // The Video tab gives the address its own section at the top.
    if (layer.kind === 'video' && d.key === 'src') continue;
    // Words are edited on the slide, never here: this panel is for how a layer looks.
    if (d.type === 'text' || (layer.kind === 'chart' && d.key === 'data')) continue;
    const g = d.group ?? 'Settings';
    let e = groups.find((x) => x.name === g);
    if (!e) groups.push((e = { name: g, defs: [] }));
    e.defs.push(d);
  }

  const randomise = () => up((l) => {
    for (const d of k.params) {
      if (d.type === 'number' && d.group !== '_hidden') {
        const span = d.max - d.min;
        const v = d.min + span * (0.1 + Math.random() * 0.8);
        l.params[d.key] = Math.round(v / d.step) * d.step;
      } else if (d.type === 'color' && !k.content) {
        const h = Math.random() * 360, s = 55 + Math.random() * 40, li = 35 + Math.random() * 45;
        l.params[d.key] = hsl(h, s, li);
      } else if (d.type === 'number' && d.group === '_hidden') {
        l.params[d.key] = Math.round(10 + Math.random() * 40);
      }
    }
  });

  const paramSections = groups.map((g) => (
    <Section key={g.name} title={g.name}>
      {g.defs.map((d) => <ParamRow key={d.key} layer={layer} def={d} setParam={setParam} />)}
      {g.name === 'Origin' && k.mouseParam && (
        <Row label="Follow mouse" info="The origin tracks the pointer, in the editor and when presenting.">
          <div><Toggle value={layer.interact.followMouse} onChange={(v) => up((l) => { l.interact.followMouse = v; })} /></div>
        </Row>
      )}
    </Section>
  ));
  if (picture) return <>{paramSections}</>;

  return (
    <>
      {layer.kind === 'image' && <button className="picture-link" onClick={() => useStore.getState().set({ inspectorTab: 'picture' })}><ImageIcon size={13} />The picture, its frame, caption and motion are in the <b>Picture</b> tab</button>}
      {layer.kind === 'video' && <button className="picture-link" onClick={() => useStore.getState().set({ inspectorTab: 'video' })}><ImageIcon size={13} />The address, full screen or framed, how it plays and its caption are in the <b>Video</b> tab</button>}
      {SPECIAL_TABS[layer.kind] && <button className="picture-link" onClick={() => useStore.getState().set({ inspectorTab: 'special' })}><ImageIcon size={13} />What it shows and how it behaves are in the <b>{SPECIAL_TABS[layer.kind]}</b> tab</button>}
      <RecipeLink />
      <Section title="Layer">
        <Row label="Opacity"><Scrub value={layer.opacity * 100} min={0} max={100} step={1} decimals={0} unit=" %" onChange={(v, m) => up((l) => { l.opacity = v / 100; }, m)} /></Row>
        <Row label="Blend" info="How this layer combines with everything below it."><Select value={layer.blend} options={BLENDS} onChange={(v) => up((l) => { l.blend = v; })} /></Row>
      </Section>
      <div className="desc">{k.description}</div>
      {k.content && layer.kind !== 'text' && (layer.kind === 'chart' || k.params.some((d) => d.type === 'text')) && (
        <div className="desc on-canvas">{layer.kind === 'chart' ? 'Double-click the chart to change its labels and values, or add a bar.' : 'Double-click it on the slide to change the words.'}</div>
      )}
      <div className="btn-row">
        <button className="btn-soft" onClick={() => up((l) => { l.params = { ...defaultParams(k), ...(k.content ? keptOnReset(k, l) : {}) }; })}><RotateCcw size={13} />Reset</button>
        {!k.content && <button className="btn-soft" onClick={randomise}><Shuffle size={13} />Randomise</button>}
      </div>
      {layer.box && <BoxSection layer={layer} />}
      {paramSections}
    </>
  );
}

/** Everything about a picture in one tab: the image, its frame and focus, its caption, its motion. */
function PicturePanel({ layer }: { layer: Layer }) {
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
function VideoPanel({ layer }: { layer: Layer }) {
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
        <div className="desc on-canvas">{service ? `${service} link understood — the slide shows its still, and Preview plays the real player.` : file ? 'A file carried in the deck. It plays muted on a loop, on the slide itself.' : layer.params.src ? 'A link to a video file. It plays muted on a loop, on the slide itself.' : 'Paste a YouTube, Vimeo or .mp4 address, or upload a clip.'}</div>
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

/** Reset restores a content layer's style but keeps what it says and shows. */
function keptOnReset(k: ReturnType<typeof kind>, l: Layer) {
  return Object.fromEntries(k.params.filter((d) => d.type === 'text' || d.type === 'image' || d.type === 'video').map((d) => [d.key, l.params[d.key]]));
}

const ALIGNS: { edge: Edge; icon: typeof AlignStartVertical; title: string }[] = [
  { edge: 'left', icon: AlignStartVertical, title: 'Align left, to the page margin' },
  { edge: 'hcenter', icon: AlignCenterVertical, title: 'Centre across the page' },
  { edge: 'right', icon: AlignEndVertical, title: 'Align right, to the page margin' },
  { edge: 'top', icon: AlignStartHorizontal, title: 'Align to the top margin' },
  { edge: 'vmiddle', icon: AlignCenterHorizontal, title: 'Centre down the page' },
  { edge: 'bottom', icon: AlignEndHorizontal, title: 'Align to the bottom margin' },
];

/** Align to the page, and tidy the row or column this box sits in. */
function AlignRow({ layer }: { layer: Layer }) {
  const slide = useStore(slideOf);
  const n = sequenceSize(slide, layer);
  const dir = nextDirection(slide, layer);
  return (
    <>
      <div className="align-row">
        {ALIGNS.map(({ edge, icon: I, title }) => (
          <button key={edge} className="tb-btn icon" title={title} onClick={() => alignLayer(layer.id, edge)}><I size={15} /></button>
        ))}
      </div>
      <button className="btn-soft tidy" disabled={n < 2} onClick={() => tidyUp(layer.id)}
        title={n < 2 ? 'Nothing is lined up with this one yet — use + beside it to add another.' : `Even out the gaps, edges and sizes of the ${n} in this ${dir}.`}>
        <WandSparkles size={13} />{n < 2 ? 'Tidy up' : `Tidy up this ${dir} of ${n}`}
      </button>
    </>
  );
}

function BoxSection({ layer }: { layer: Layer }) {
  const update = useStore((s) => s.updateLayer);
  const b = layer.box!;
  const isText = autoHeight(layer);
  const setB = (key: 'x' | 'y' | 'w' | 'h' | 'rot', v: number, m: string) => update(layer.id, (l) => { l.box![key] = v; }, m);
  return (
    <Section title="Position">
      <div className="grid2">
        <Scrub prefix="X" value={b.x} min={-1920} max={3840} step={1} decimals={0} onChange={(v, m) => setB('x', v, m)} />
        <Scrub prefix="Y" value={b.y} min={-1080} max={2160} step={1} decimals={0} onChange={(v, m) => setB('y', v, m)} />
        <Scrub prefix="W" value={b.w} min={8} max={3840} step={1} decimals={0} onChange={(v, m) => setB('w', v, m)} />
        <Scrub prefix="H" value={b.h} min={8} max={2160} step={1} decimals={0} disabled={isText} onChange={(v, m) => setB('h', v, m)} />
        <Scrub prefix="↻" value={b.rot} min={-180} max={180} step={1} decimals={0} unit="°" onChange={(v, m) => setB('rot', v, m)} />
        <button className="btn-soft" onClick={() => { const { width, height } = useStore.getState().deck; update(layer.id, (l) => { l.box!.x = (width - l.box!.w) / 2; l.box!.y = (height - l.box!.h) / 2; }); }}>Centre on slide</button>
      </div>
      <AlignRow layer={layer} />
    </Section>
  );
}

function ParamRow({ layer, def: d, setParam }: { layer: Layer; def: ParamDef; setParam: (k: string, v: ParamValue, m?: string) => void }) {
  const v = layer.params[d.key] ?? d.default;
  const fileRef = useRef<HTMLInputElement>(null);
  const merge = useRef(newGesture());
  const guide = useStore((st) => st.deck.styleGuide);
  switch (d.type) {
    case 'number':
      return <Row label={d.label} info={d.info}><Scrub value={Number(v)} min={d.min} max={d.max} step={d.step} decimals={d.decimals} unit={d.unit} onChange={(x, m) => setParam(d.key, x, m)} /></Row>;
    case 'color': {
      const wk = d.weightKey;
      return (
        <Row label={d.label} info={d.info}>
          <ColorField value={String(v)} onChange={(x, m) => setParam(d.key, x, m)} weight={wk ? Number(layer.params[wk] ?? 25) : undefined} onWeight={wk ? (x, m) => setParam(wk, x, m) : undefined} />
        </Row>
      );
    }
    case 'select': {
      const row = <Row label={d.label} info={d.info}><Select value={String(v)} options={d.options} onChange={(x) => setParam(d.key, x)} /></Row>;
      if (d.key !== 'fit' || (v !== 'shrink' && v !== 'fill')) return row;
      // Say what Fit did, so a Size of 38 drawn at 19 is not a mystery.
      const drawn = textSize(layer), set = Number(layer.params.size);
      return <>{row}<div className="fit-note">{v === 'fill' ? `Drawn at ${Math.round(drawn)}px to fill the box.` : drawn < set - 0.05 ? `Drawn at ${Math.round(drawn)}px so it fits. Size ${set}px is used when there is room.` : 'Fits at full size.'}</div></>;
    }
    case 'bool':
      return <Row label={d.label} info={d.info}><div><Toggle value={!!v} onChange={(x) => setParam(d.key, x)} /></div></Row>;
    case 'vec2': {
      const [x, y] = v as [number, number];
      return (
        <Row label={d.label} info={d.info ?? 'Drag the handle on the canvas, or scrub here.'}>
          <Scrub prefix="X" value={x} min={0} max={1} step={0.01} onChange={(n, m) => setParam(d.key, [n, y], m)} />
          <Scrub prefix="Y" value={y} min={0} max={1} step={0.01} onChange={(n, m) => setParam(d.key, [x, n], m)} />
        </Row>
      );
    }
    case 'text':
      return (
        <Row label={d.label} wide>
          <textarea
            className="textarea"
            value={String(v)}
            onFocus={() => (merge.current = newGesture())}
            onChange={(e) => setParam(d.key, e.target.value, merge.current)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </Row>
      );
    case 'font':
      return <Row label={d.label}><Select value={String(v)} options={fontChoices(guide, FONTS).map((f) => ({ value: f, label: f }))} onChange={(x) => setParam(d.key, x)} /></Row>;
    case 'video':
      return <VideoPick value={String(v)} onChange={(x) => setParam(d.key, x)} />;
    case 'image':
      return (
        <Row label={d.label}>
          <div className="img-pick">
            <div className="pv" style={{ backgroundImage: v ? `url("${String(v)}")` : undefined }} />
            <button className="btn-soft" onClick={() => fileRef.current?.click()}>Replace…</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setParam(d.key, await fileToDataUrl(f));
              e.target.value = '';
            }} />
          </div>
        </Row>
      );
  }
}

function VideoPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = useStore((s) => s.showToast);
  const isLink = /^https?:/i.test(value);
  return (
    <>
      <Row label="Video">
        <div className="img-pick">
          <button className="btn-soft" onClick={() => fileRef.current?.click()}>{value ? 'Replace…' : 'Upload…'}</button>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 60e6) { showToast(`That video is ${Math.round(f.size / 1e6)} MB. Keep clips under 60 MB, or paste a link to it instead.`); return; }
            onChange(await readDataUrl(f));
          }} />
        </div>
      </Row>
      <Row label="Or an address" info="A YouTube or Vimeo link (shown as its still, played in Preview), or a direct link to an .mp4 or .webm file, which plays on the slide.">
        <input
          className="text-input"
          placeholder="youtube.com/watch?v=… or …/clip.mp4"
          defaultValue={isLink ? value : ''}
          key={isLink ? value : 'file'}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          onBlur={(e) => { const u = e.target.value.trim(); if (u && u !== value) onChange(u); }}
        />
      </Row>
    </>
  );
}

/** Which of the theme's grounds this slide sits on: working, quiet or loud. Text and accents follow. */
function GroundRow() {
  const slide = useStore(slideOf);
  const deck = useStore((s) => s.deck);
  const st = themeOf(deck);
  if (!st?.grounds?.length) return null;
  const set = (id: string | null) => useStore.getState().mutate((d) => setSlideGround(d, slide.id, id));
  const chip = (id: string | null, bg: string, ink: string, name: string) => (
    <button key={name} className={`guide-ground${(slide.ground ?? null) === id ? ' on' : ''}`} style={{ background: bg, color: ink }} onClick={() => set(id)} title={`Set this slide on the ${name.toLowerCase()} ground`}>Aa<small>{name}</small></button>
  );
  return (
    <Row label="Ground" info="The palette's three grounds. The text and accents on the slide change with it.">
      <div className="guide-grounds compact">
        {chip(null, st.ground, st.ink, 'Working')}
        {st.grounds.map((g) => chip(g.id, g.ground, g.ink, g.name))}
      </div>
    </Row>
  );
}

/** On a slide built as a design, the way to its editor: the slide's own panel. */
function RecipeLink() {
  const slide = useStore(slideOf);
  if (!slide.recipe || !RECIPE_NAMES[slide.recipe.kind]) return null;
  return <button className="picture-link" onClick={() => useStore.getState().set({ selectedId: null })}><ImageIcon size={13} />This slide is a <b>{RECIPE_NAMES[slide.recipe.kind]}</b> design — change what it shows in the slide’s panel</button>;
}

function SlideDesign() {
  const slide = useStore(slideOf);
  const { updateSlide } = useStore.getState();
  const nm = useRef(newGesture());
  return (
    <>
      <RecipePanel />
      <Section title="Slide">
        <Row label="Name"><input className="text-input" value={slide.name} onFocus={() => (nm.current = newGesture())} onChange={(e) => updateSlide((s) => { s.name = e.target.value; }, nm.current)} onKeyDown={(e) => e.stopPropagation()} /></Row>
        <Row label="Background" info="Shown beneath all layers."><ColorField value={slide.background} onChange={(v, m) => updateSlide((s) => { s.background = v; }, m)} /></Row>
        <GroundRow />
        <button className="btn-soft tidy" onClick={tidySlide} title="Even out every row and column on this slide: one gap, one edge, one width each."><WandSparkles size={13} />Tidy up this slide</button>
      </Section>
      <Section title="Speaker notes">
        <textarea className="textarea" placeholder="What you want to say on this slide… (press N while presenting)" value={slide.notes} onFocus={() => (nm.current = newGesture())} onChange={(e) => updateSlide((s) => { s.notes = e.target.value; }, nm.current)} onKeyDown={(e) => e.stopPropagation()} />
      </Section>
      <div className="hint">Transition, backdrop motion and the build order are in <b>Animate</b>. Drop an image anywhere on the canvas, or paste one with <kbd>⌘V</kbd>; double-click text to edit it in place.</div>
    </>
  );
}

function TransitionRows() {
  const slide = useStore(slideOf);
  const updateSlide = useStore((s) => s.updateSlide);
  return (
    <>
      <Row label="Type" info="How this slide arrives when you advance to it."><Select value={slide.transition.type} options={TRANSITIONS} onChange={(v) => updateSlide((s) => { s.transition.type = v; })} /></Row>
      <Row label="Duration"><Scrub value={slide.transition.duration} min={0.1} max={3} step={0.05} unit=" s" onChange={(v, m) => updateSlide((s) => { s.transition.duration = v; }, m)} /></Row>
      {slide.transition.type === 'morph' && <div className="desc">Morph carries what this slide shares with the one before it (the same picture, the same chart data, the same words) from its old place to its new one. Everything else crossfades. With nothing shared, it is a crossfade.</div>}
    </>
  );
}

// ─── Animate ────────────────────────────────────────────────────────────────
function LayerAnimate({ layer }: { layer: Layer }) {
  const k = kind(layer.kind);
  const update = useStore((s) => s.updateLayer);
  const play = () => useStore.setState((s) => ({ playToken: s.playToken + 1 }));
  const a = layer.anim;
  const up = (fn: (an: Layer['anim']) => void, m?: string) => update(layer.id, (l) => fn(l.anim), m);
  const options = k.content
    ? (layer.kind === 'text' ? [...ENTRANCES, ...TEXT_ENTRANCES] : layer.kind === 'chart' ? [...ENTRANCES, ...CHART_ENTRANCES] : ENTRANCES)
    : ENTRANCES.filter((e) => e.value === 'none' || e.value === 'fade');
  const pre = presetOf(a);
  const setPreset = (speed: Speed, spacing: Spacing) => up((x) => { const t = presetTiming(x.type, speed, spacing); x.duration = t.duration; x.stagger = t.stagger; });
  return (
    <>
      {layer.kind === 'image' && <button className="picture-link" onClick={() => useStore.getState().set({ inspectorTab: 'picture' })}><ImageIcon size={13} />Image motion and caption timing are in the <b>Picture</b> tab</button>}
      <Section title="Entrance" right={<button className="btn-soft accent" onClick={play}><Play size={12} />Play</button>}>
        <Row label="Effect"><Select value={a.type} options={options} onChange={(v) => up((x) => {
          x.type = v;
          if (v === 'draw') { x.duration = 0.7; x.stagger = 0.12; x.easing = 'cubicOut'; }
          // Words, letters and lines start on SlideForge's defaults, Medium and Wave, unless already on a preset.
          else if (isTextUnit(v) && !presetOf(x)) Object.assign(x, presetTiming(v, 'medium', 'wave'));
          else if (v !== 'none' && x.duration < 0.1) x.duration = 0.9;
          // Words and letters arrive SlideForge's way, Rise on Easy Ease, unless already set otherwise.
          if ((v === 'words' || v === 'letters') && !x.feel && !x.plan) { x.feel = 'rise'; x.easing = 'easyEase'; }
          if (v !== 'words' && v !== 'letters') { delete x.feel; delete x.plan; }
        })} /></Row>
        {(a.type === 'words' || a.type === 'letters') && !a.plan?.length && !(a.build && a.build !== 'none') && (
          <Row label="Each word" info="How every word, or letter, arrives. Rise and Fade clear a blur as they land; Reveal wipes each one up from behind its own line.">
            <Select value={a.feel ?? 'plain'} options={FEELS} onChange={(v) => up((x) => { if (v === 'plain') delete x.feel; else { x.feel = v; if (x.easing === 'expoOut') x.easing = 'easyEase'; } })} />
          </Row>
        )}
        <BuildRows layer={layer} />
        {a.type !== 'none' && (
          <>
            <Row label="Start" info="'On click' creates a build step: the presenter clicks to reveal it."><Select value={a.trigger} options={TRIGGERS} onChange={(v) => up((x) => { x.trigger = v; })} /></Row>
            <Row label="Duration"><Scrub value={a.duration} min={0.1} max={4} step={0.05} unit=" s" onChange={(v, m) => up((x) => { x.duration = v; }, m)} /></Row>
            <Row label="Delay"><Scrub value={a.delay} min={0} max={5} step={0.05} unit=" s" onChange={(v, m) => up((x) => { x.delay = v; }, m)} /></Row>
            <Row label="Easing"><Select value={a.easing} options={EASINGS} onChange={(v) => up((x) => { x.easing = v; })} /></Row>
            {isTextUnit(a.type) && !(a.build && a.build !== 'none') && (
              <>
                <Row label="Speed" info="Moves the whole thing together: each word, and the wave between them.">
                  <Select value={pre?.speed ?? 'custom'} options={pre ? SPEED_OPTIONS : [...SPEED_OPTIONS, { value: 'custom', label: 'Custom — set below' }]}
                    onChange={(v) => v !== 'custom' && setPreset(v, pre?.spacing ?? 'wave')} />
                </Row>
                {!a.plan?.length && <Row label="Spacing" info="How far apart the words, letters or lines arrive. The wave is eased: it starts quickly and slows as it finishes.">
                  <Select value={pre?.spacing ?? 'custom'} options={pre ? SPACING_OPTIONS : [...SPACING_OPTIONS, { value: 'custom', label: 'Custom — set below' }]}
                    onChange={(v) => v !== 'custom' && setPreset(pre?.speed ?? 'medium', v)} />
                </Row>}
              </>
            )}
            {(isTextUnit(a.type) || a.type === 'draw') && !a.plan?.length && <Row label="Stagger" info={a.type === 'draw' ? 'Time between each bar, point or wedge.' : 'Time between each letter, word or line. Speed and Spacing set this for you.'}><Scrub value={a.stagger} min={0} max={a.type === 'draw' ? 1 : 0.4} step={0.005} decimals={3} unit=" s" onChange={(v, m) => up((x) => { x.stagger = v; }, m)} /></Row>}
            {isTextUnit(a.type) && !(a.build && a.build !== 'none') && (a.stagger > 0 || !!a.plan?.length) && (
              <>
                {!a.plan?.length && <Row label="Order" info="Which end the wave starts from. From the centre sends it outwards both ways at once.">
                  <Select value={a.order ?? 'first'} options={[{ value: 'first', label: 'From the first' }, { value: 'last', label: 'From the last' }, { value: 'center', label: 'From the centre' }]}
                    onChange={(v) => up((x) => { if (v === 'first') delete x.order; else x.order = v; })} />
                </Row>}
                <Row label="Leave again" info="Arrive, hold, leave the way they came, and round again: for a cover on screen while the room fills. SlideForge's timing: in by a tenth of the cycle, held to about half, out by seven-eighths, then a pause — 13, 7 or 3.6 seconds at Gentle, Medium and Quick.">
                  <Toggle value={!!a.leave} onChange={(v) => up((x) => { if (v) x.leave = true; else delete x.leave; })} />
                </Row>
              </>
            )}
            <Row label="Total"><span style={{ color: 'var(--muted)' }}>{animTotal(layer).toFixed(2)} s</span></Row>
          </>
        )}
      </Section>
      {(a.type === 'words' || a.type === 'letters') && !(a.build && a.build !== 'none') && <Choreography layer={layer} />}
      {k.content && (
        <Section title="Ambient loop">
          <Row label="Motion" info="Continuous, subtle motion after the entrance."><Select value={a.loop} options={LOOPS} onChange={(v) => up((x) => { x.loop = v; })} /></Row>
          {a.loop !== 'none' && (
            <>
              <Row label="Speed"><Scrub value={a.loopSpeed} min={0.05} max={4} step={0.05} onChange={(v, m) => up((x) => { x.loopSpeed = v; }, m)} /></Row>
              <Row label="Amount"><Scrub value={a.loopAmount} min={0} max={4} step={0.05} onChange={(v, m) => up((x) => { x.loopAmount = v; }, m)} /></Row>
            </>
          )}
        </Section>
      )}
    </>
  );
}

/**
 * Build on Next, always in view. A text with several lines builds a line per click; one of a set of
 * cards, rows or choices builds the set an item per click. Where neither applies the control is
 * still here, greyed, saying what would make it work, so it never just disappears.
 */
function BuildRows({ layer }: { layer: Layer }) {
  const slide = useStore(slideOf);
  const update = useStore((s) => s.updateLayer);
  const a = layer.anim;
  const sib = layer.box && !layer.params.hfSlot ? siblingsOf(slide, layer) : null;
  const lines = layer.kind === 'text' ? String(layer.params.text ?? '').split('\n').filter((x) => x.trim()).length : 0;
  const INFO = 'As SlideForge\'s Build on Next. Dimming keeps earlier points readable instead of hiding them, useful when the room needs the whole argument in view. Spotlight does that and takes the light off the rest of the slide.';
  const lineBuild = layer.kind === 'text' && !(sib && lines < 2);
  const noun = sib ? itemNoun(slide, layer) : '';
  return (
    <>
      {lineBuild && (
        <>
          <Row label="Build" info={INFO}>
            <Select value={lines > 1 ? a.build ?? 'none' : 'none'} disabled={lines < 2}
              options={[{ value: 'none', label: 'All at once' }, { value: 'lines', label: 'One line per click' }, { value: 'dim', label: 'One per click, dimming the ones before' }, { value: 'spot', label: 'One per click, with a spotlight on the live one' }]}
              onChange={(v) => update(layer.id, (l) => { const x = l.anim; if (v === 'none') delete x.build; else { x.build = v; if (x.type === 'none') { x.type = 'fade'; x.duration = 0.6; } } })} />
          </Row>
          {lines < 2 && <div className="desc">Put each point on its own line and this builds them one per click.</div>}
        </>
      )}
      {sib && (
        <>
          <Row label={lineBuild ? 'Build the set' : 'Build'} info={INFO}>
            <Select value={setBuildOf(layer)}
              options={[{ value: 'off', label: 'All at once' }, { value: 'on', label: `One ${noun} per click` }, { value: 'dim', label: `One ${noun} per click, dimming the ones before` }, { value: 'spot', label: `One ${noun} per click, with a spotlight` }, { value: 'swap', label: `One ${noun} at a time — each replaces the last` }, { value: 'pile', label: `One ${noun} per click, piled — the ones before step back` }] as { value: SetBuild; label: string }[]}
              onChange={(v) => buildSet(layer.id, v)} />
          </Row>
          <div className="desc">{sib.units.length} {noun}s, in reading order. Move one on the canvas and its place in the build moves with it.</div>
        </>
      )}
      {!lineBuild && !sib && layer.kind !== 'image' && (
        <>
          <Row label="Build" info={INFO}><Select value="none" disabled options={[{ value: 'none', label: 'All at once' }]} onChange={() => {}} /></Row>
          <div className="desc">Text with several lines, or one of a set of cards, rows or choices, builds a point per click. To hold just this back for a press, set Start to On click.</div>
        </>
      )}
    </>
  );
}

function SlideAnimate() {
  const play = () => useStore.setState((s) => ({ playToken: s.playToken + 1 }));
  const slide = useStore(slideOf);
  const { mutate } = useStore.getState();
  return (
    <>
      <Section title="Transition in" right={<button className="btn-soft accent" onClick={play}><Play size={12} />Play</button>}>
        <TransitionRows />
      </Section>
      <Section title="Backdrop">
          <Row label="Motion" info="Slow motion behind the words, made from this slide's own colours. Select the Backdrop motion layer to change its colours, strength or speed.">
          <Select value={backdropOf(slide)} options={[{ value: 'still', label: 'Still' }, { value: 'drift', label: 'Drift — colour moving slowly' }, { value: 'grid', label: 'Grid — a ruled plane travelling' }, { value: 'glow', label: 'Glow — one slow breath' }]}
            onChange={(v) => mutate((d) => setBackdrop(d, slide.id, v as BackdropMode))} />
        </Row>
      </Section>
      <Sequence />
    </>
  );
}

/** The slide's build order at a glance: which layers enter on which click. */
function Sequence() {
  const slide = useStore(slideOf);
  const selectedId = useStore((s) => s.selectedId);
  const selectLayer = useStore((s) => s.selectLayer);
  const sch = schedule(slide, []);
  let step = 0;
  const rows = slide.layers.filter((l) => l.visible && l.anim.type !== 'none').map((l) => {
    if (l.anim.trigger === 'onClick') step++;
    return { l, step };
  });
  return (
    <Section title={`Sequence · ${sch.steps} click${sch.steps === 1 ? '' : 's'}`}>
      {rows.length ? (
        <div className="seq">
          {rows.map(({ l, step: s }) => (
            <div key={l.id} className={`seq-row${l.id === selectedId ? ' sel' : ''}`} onClick={() => selectLayer(l.id)}>
              <span className={`seq-step${s ? ' click' : ''}`}>{s ? `C${s}` : 'In'}</span>
              <span>{l.name}</span>
              <small>{l.anim.trigger === 'afterPrev' ? 'after' : ''} {l.anim.type}</small>
            </div>
          ))}
        </div>
      ) : <div style={{ color: 'var(--dim)', fontSize: 12 }}>No entrance animations on this slide yet.</div>}
    </Section>
  );
}

// ─── Interact ───────────────────────────────────────────────────────────────
function LayerInteract({ layer }: { layer: Layer }) {
  const k = kind(layer.kind);
  const update = useStore((s) => s.updateLayer);
  const n = useStore((s) => s.deck.slides.length);
  const it = layer.interact;
  const up = (fn: (x: Layer['interact']) => void, m?: string) => update(layer.id, (l) => fn(l.interact), m);
  return (
    <>
      {k.mouseParam && (
        <Section title="Pointer">
          <Row label="Follow mouse" info="The effect origin tracks the pointer."><div><Toggle value={it.followMouse} onChange={(v) => up((x) => { x.followMouse = v; })} /></div></Row>
        </Section>
      )}
      {k.content && (
        <>
          <Section title="Depth">
            <Row label="Parallax" info="Moves against the pointer. Positive = closer to the viewer."><Scrub value={it.parallax} min={-1} max={1} step={0.01} onChange={(v, m) => up((x) => { x.parallax = v; }, m)} /></Row>
          </Section>
          <Section title="Hover">
            <Row label="State"><Select value={it.hover} options={HOVERS} onChange={(v) => up((x) => { x.hover = v; })} /></Row>
          </Section>
          <Section title="Click">
            <Row label="Action"><Select value={it.click} options={CLICKS} onChange={(v) => up((x) => { x.click = v; })} /></Row>
            {it.click === 'goto' && <Row label="Slide"><Scrub value={it.gotoSlide} min={1} max={Math.max(1, n)} step={1} decimals={0} onChange={(v, m) => up((x) => { x.gotoSlide = v; }, m)} /></Row>}
            {it.click === 'link' && <Row label="URL"><input className="text-input" placeholder="https://…" value={it.url} onChange={(e) => up((x) => { x.url = e.target.value; }, 'url')} onKeyDown={(e) => e.stopPropagation()} /></Row>}
          </Section>
          <Section title="Flip to facts">
            <Row label="On the back" info="Shown only while the slide is turned over by a layer whose click is Flip. Select it to edit it on the canvas.">
              <div><Toggle value={layer.face === 'back'} onChange={(v) => update(layer.id, (l) => { if (v) l.face = 'back'; else delete l.face; })} /></div>
            </Row>
          </Section>
        </>
      )}
      {!k.mouseParam && !k.content && <div className="hint">This effect has no pointer controls. Try Ripple, Lens, Swirl, Spotlight or Blur for mouse-reactive effects.</div>}
      <div className="hint">Interactions run live in <b>Preview</b> and in exported HTML decks. Follow-mouse effects also react in the editor.</div>
    </>
  );
}

// ─── utils ──────────────────────────────────────────────────────────────────
function hsl(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function readDataUrl(f: File) {
  return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
}

export async function fileToDataUrl(f: File, max = 2400): Promise<string> {
  const url = await readDataUrl(f);
  if (f.type === 'image/svg+xml' || f.type === 'image/gif') return url;
  const img = new Image();
  img.src = url;
  await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (k >= 1 && f.size < 1.5e6) return url;
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.9);
}
