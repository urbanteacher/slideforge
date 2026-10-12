// The Animate tab: a layer's entrance, emphasis, build and timing, the slide's transition and build order.
import type { Easing, EntranceType, Layer, LoopType, TransitionType, Trigger } from '../../core';
import { animTotal, isTextUnit, presetOf, presetTiming, schedule, kind, type Spacing, type Speed } from '../../engine';
import { backdropOf, setBackdrop, type BackdropMode } from '../../layouts';
import { slideOf, useStore } from '../../store';
import { Row, Scrub, Section, Select, Toggle } from '../controls/controls';
import { buildSet, itemNoun, setBuildOf, type SetBuild } from '../stage/build';
import { siblingsOf } from '../stage/order';
import { Choreography } from './Choreography';
import { Image as ImageIcon, Play } from 'lucide-react';

const ENTRANCES: { value: EntranceType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'rise', label: 'Rise' }, { value: 'drop', label: 'Drop' },
  { value: 'slideLeft', label: 'Slide from right' }, { value: 'slideRight', label: 'Slide from left' },
  { value: 'zoomIn', label: 'Zoom in' }, { value: 'zoomOut', label: 'Zoom out' }, { value: 'pop', label: 'Pop' },
  { value: 'blur', label: 'Blur in' }, { value: 'wipeUp', label: 'Wipe up' }, { value: 'wipeRight', label: 'Wipe right' }, { value: 'spin', label: 'Spin in' },
];
const TEXT_ENTRANCES: { value: EntranceType; label: string }[] = [
  { value: 'letters', label: 'Letter by letter' }, { value: 'words', label: 'Word by word' },
  { value: 'lines', label: 'Line reveal (masked)' }, { value: 'typewriter', label: 'Typewriter' },
  { value: 'scramble', label: 'Scramble — letters decode into place' }, { value: 'count', label: 'Count up — the numbers run up' },
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
  { value: 'plain', label: 'Plain — a short rise, no blur' },
  { value: 'rise', label: 'Rise — up from below, blur clearing' }, { value: 'fade', label: 'Fade — blur clearing, no movement' },
  { value: 'reveal', label: 'Reveal — wiped up from behind its line' },
];
const CHART_ENTRANCES: { value: EntranceType; label: string }[] = [{ value: 'draw', label: 'Draws itself' }];
const SPEED_OPTIONS: { value: Speed | 'custom'; label: string }[] = [
  { value: 'gentle', label: 'Gentle — slower, and holds longer' }, { value: 'medium', label: 'Medium' }, { value: 'quick', label: 'Quick' },
];
const SPACING_OPTIONS: { value: Spacing | 'custom'; label: string }[] = [
  { value: 'together', label: 'Together — arrives as one' }, { value: 'wave', label: 'Wave — eased, a little apart' }, { value: 'one', label: 'One at a time — the widest spread' },
];
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
export function LayerAnimate({ layer }: { layer: Layer }) {
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
          // A count takes long enough to read the numbers rising, slowing as it lands.
          else if (v === 'count') { x.duration = 1.6; x.stagger = 0; x.easing = 'expoOut'; }
          // Words, letters and lines start on SlideForge's defaults, Medium and Wave, unless already on a preset.
          else if (isTextUnit(v) && !presetOf(x)) Object.assign(x, presetTiming(v, 'medium', 'wave'));
          else if (v !== 'none' && x.duration < 0.1) x.duration = 0.9;
          // Words and letters arrive SlideForge's way, Rise on Easy Ease, unless already set otherwise.
          // Words and letters start Plain: a short rise with no blur. Rise, Fade and Reveal are there to choose.
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
            {isTextUnit(a.type) && a.type !== 'count' && !(a.build && a.build !== 'none') && (
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
            {((isTextUnit(a.type) && a.type !== 'count') || a.type === 'draw') && !a.plan?.length && <Row label="Stagger" info={a.type === 'draw' ? 'Time between each bar, point or wedge.' : 'Time between each letter, word or line. Speed and Spacing set this for you.'}><Scrub value={a.stagger} min={0} max={a.type === 'draw' ? 1 : 0.4} step={0.005} decimals={3} unit=" s" onChange={(v, m) => up((x) => { x.stagger = v; }, m)} /></Row>}
            {a.type === 'typewriter' && (
              <Row label="Cursor" info="A cursor follows the typing, then blinks for three seconds once the line is typed.">
                <Toggle value={!!a.caret} onChange={(v) => up((x) => { if (v) x.caret = true; else delete x.caret; })} />
              </Row>
            )}
            {isTextUnit(a.type) && a.type !== 'count' && !(a.build && a.build !== 'none') && (a.stagger > 0 || !!a.plan?.length) && (
              <>
                {!a.plan?.length && <Row label="Order" info="Which end the wave starts from. From the centre sends it outwards both ways at once.">
                  <Select value={a.order ?? 'first'} options={[{ value: 'first', label: 'From the first' }, { value: 'last', label: 'From the last' }, { value: 'center', label: 'From the centre' }, { value: 'random', label: 'In a random order' }]}
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

export function SlideAnimate() {
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
