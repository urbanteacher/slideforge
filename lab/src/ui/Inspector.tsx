import { MonitorPlay, Play, RotateCcw, Shuffle } from 'lucide-react';
import { useRef } from 'react';
import { animTotal, isTextUnit, schedule } from '../engine/anim';
import { CATEGORY_LABEL, FONTS, defaultParams, kind, type ParamDef } from '../engine/registry';
import { layerOf, slideOf, useStore } from '../model/store';
import type { BlendMode, ClickAction, Easing, EntranceType, HoverType, Layer, LoopType, ParamValue, TransitionType, Trigger } from '../model/types';
import { ColorField, Row, Scrub, Section, Select, Toggle, newGesture } from './controls';
import { KindIcon } from './icons';

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
];
const HOVERS: { value: HoverType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'lift', label: 'Lift' }, { value: 'grow', label: 'Grow' }, { value: 'glow', label: 'Glow' }, { value: 'tilt', label: 'Tilt to pointer' },
];
const CLICKS: { value: ClickAction; label: string }[] = [
  { value: 'none', label: 'Advance (default)' }, { value: 'next', label: 'Next slide' }, { value: 'prev', label: 'Previous slide' },
  { value: 'goto', label: 'Go to slide…' }, { value: 'link', label: 'Open link…' },
];

export function Inspector() {
  const layer = useStore(layerOf);
  const tab = useStore((s) => s.inspectorTab);
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
        {(['design', 'animate', 'interact'] as const).map((t) => (
          <button key={t} className={`tab${tab === t ? ' sel' : ''}`} onClick={() => set({ inspectorTab: t })}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <div className="panel-scroll">
        {tab === 'design' && (layer ? <LayerDesign layer={layer} /> : <SlideDesign />)}
        {tab === 'animate' && (layer ? <LayerAnimate layer={layer} /> : <SlideAnimate />)}
        {tab === 'interact' && (layer ? <LayerInteract layer={layer} /> : <div className="hint">Select a layer to give it hover states, parallax depth or a click action. Interactions are live in <b>Preview</b> and in exported HTML.</div>)}
      </div>
    </aside>
  );
}

// ─── Design ─────────────────────────────────────────────────────────────────
function LayerDesign({ layer }: { layer: Layer }) {
  const k = kind(layer.kind);
  const update = useStore((s) => s.updateLayer);
  const up = (fn: (l: Layer) => void, merge?: string) => update(layer.id, fn, merge);
  const setParam = (key: string, v: ParamValue, merge?: string) => up((l) => { l.params[key] = v; }, merge);

  const groups: { name: string; defs: ParamDef[] }[] = [];
  for (const d of k.params) {
    if (d.group === '_hidden' || (d.when && !d.when(layer.params))) continue;
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

  return (
    <>
      <Section title="Layer">
        <Row label="Opacity"><Scrub value={layer.opacity * 100} min={0} max={100} step={1} decimals={0} unit=" %" onChange={(v, m) => up((l) => { l.opacity = v / 100; }, m)} /></Row>
        <Row label="Blend" info="How this layer combines with everything below it."><Select value={layer.blend} options={BLENDS} onChange={(v) => up((l) => { l.blend = v; })} /></Row>
      </Section>
      <div className="desc">{k.description}</div>
      <div className="btn-row">
        <button className="btn-soft" onClick={() => up((l) => { l.params = { ...defaultParams(k), ...(k.content ? { text: l.params.text, src: l.params.src } : {}) }; })}><RotateCcw size={13} />Reset</button>
        {!k.content && <button className="btn-soft" onClick={randomise}><Shuffle size={13} />Randomise</button>}
      </div>
      {layer.box && <BoxSection layer={layer} />}
      {groups.map((g) => (
        <Section key={g.name} title={g.name}>
          {g.defs.map((d) => <ParamRow key={d.key} layer={layer} def={d} setParam={setParam} />)}
          {g.name === 'Origin' && k.mouseParam && (
            <Row label="Follow mouse" info="The origin tracks the pointer, in the editor and when presenting.">
              <div><Toggle value={layer.interact.followMouse} onChange={(v) => up((l) => { l.interact.followMouse = v; })} /></div>
            </Row>
          )}
        </Section>
      ))}
    </>
  );
}

function BoxSection({ layer }: { layer: Layer }) {
  const update = useStore((s) => s.updateLayer);
  const b = layer.box!;
  const isText = layer.kind === 'text';
  const setB = (key: 'x' | 'y' | 'w' | 'h' | 'rot', v: number, m: string) => update(layer.id, (l) => { l.box![key] = v; }, m);
  return (
    <Section title="Position">
      <div className="grid2">
        <Scrub prefix="X" value={b.x} min={-1920} max={3840} step={1} decimals={0} onChange={(v, m) => setB('x', v, m)} />
        <Scrub prefix="Y" value={b.y} min={-1080} max={2160} step={1} decimals={0} onChange={(v, m) => setB('y', v, m)} />
        <Scrub prefix="W" value={b.w} min={8} max={3840} step={1} decimals={0} onChange={(v, m) => setB('w', v, m)} />
        <Scrub prefix="H" value={b.h} min={8} max={2160} step={1} decimals={0} disabled={isText} onChange={(v, m) => setB('h', v, m)} />
        <Scrub prefix="↻" value={b.rot} min={-180} max={180} step={1} decimals={0} unit="°" onChange={(v, m) => setB('rot', v, m)} />
        <button className="btn-soft" onClick={() => update(layer.id, (l) => { l.box!.x = (1920 - l.box!.w) / 2; l.box!.y = (1080 - l.box!.h) / 2; })}>Centre on slide</button>
      </div>
    </Section>
  );
}

function ParamRow({ layer, def: d, setParam }: { layer: Layer; def: ParamDef; setParam: (k: string, v: ParamValue, m?: string) => void }) {
  const v = layer.params[d.key] ?? d.default;
  const fileRef = useRef<HTMLInputElement>(null);
  const merge = useRef(newGesture());
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
    case 'select':
      return <Row label={d.label} info={d.info}><Select value={String(v)} options={d.options} onChange={(x) => setParam(d.key, x)} /></Row>;
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
      return <Row label={d.label}><Select value={String(v)} options={FONTS.map((f) => ({ value: f, label: f }))} onChange={(x) => setParam(d.key, x)} /></Row>;
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

function SlideDesign() {
  const slide = useStore(slideOf);
  const deck = useStore((s) => s.deck);
  const { updateSlide, mutate } = useStore.getState();
  const nm = useRef(newGesture());
  return (
    <>
      <Section title="Slide">
        <Row label="Name"><input className="text-input" value={slide.name} onFocus={() => (nm.current = newGesture())} onChange={(e) => updateSlide((s) => { s.name = e.target.value; }, nm.current)} onKeyDown={(e) => e.stopPropagation()} /></Row>
        <Row label="Background" info="Shown beneath all layers."><ColorField value={slide.background} onChange={(v, m) => updateSlide((s) => { s.background = v; }, m)} /></Row>
      </Section>
      <Section title="Transition in">
        <TransitionRows />
      </Section>
      <Section title="Speaker notes">
        <textarea className="textarea" placeholder="What you want to say on this slide… (press N while presenting)" value={slide.notes} onFocus={() => (nm.current = newGesture())} onChange={(e) => updateSlide((s) => { s.notes = e.target.value; }, nm.current)} onKeyDown={(e) => e.stopPropagation()} />
      </Section>
      <Section title="Deck" defaultOpen={false}>
        <Row label="Title"><input className="text-input" value={deck.title} onChange={(e) => mutate((d) => { d.title = e.target.value; }, 'title')} onKeyDown={(e) => e.stopPropagation()} /></Row>
        <Row label="Size"><span style={{ color: 'var(--muted)' }}>{deck.width} × {deck.height} (16:9)</span></Row>
      </Section>
      <div className="hint">Tip: drop an image anywhere on the canvas, or paste one with <kbd>⌘V</kbd>. Double-click text to edit it in place.</div>
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
  const options = k.content ? (layer.kind === 'text' ? [...ENTRANCES, ...TEXT_ENTRANCES] : ENTRANCES) : ENTRANCES.filter((e) => e.value === 'none' || e.value === 'fade');
  return (
    <>
      <Section title="Entrance" right={<button className="btn-soft accent" onClick={play}><Play size={12} />Play</button>}>
        <Row label="Effect"><Select value={a.type} options={options} onChange={(v) => up((x) => { x.type = v; if (v !== 'none' && x.duration < 0.1) x.duration = 0.9; })} /></Row>
        {a.type !== 'none' && (
          <>
            <Row label="Start" info="'On click' creates a build step: the presenter clicks to reveal it."><Select value={a.trigger} options={TRIGGERS} onChange={(v) => up((x) => { x.trigger = v; })} /></Row>
            <Row label="Duration"><Scrub value={a.duration} min={0.1} max={4} step={0.05} unit=" s" onChange={(v, m) => up((x) => { x.duration = v; }, m)} /></Row>
            <Row label="Delay"><Scrub value={a.delay} min={0} max={5} step={0.05} unit=" s" onChange={(v, m) => up((x) => { x.delay = v; }, m)} /></Row>
            <Row label="Easing"><Select value={a.easing} options={EASINGS} onChange={(v) => up((x) => { x.easing = v; })} /></Row>
            {isTextUnit(a.type) && <Row label="Stagger" info="Time between each letter, word or line."><Scrub value={a.stagger} min={0.005} max={0.4} step={0.005} decimals={3} unit=" s" onChange={(v, m) => up((x) => { x.stagger = v; }, m)} /></Row>}
            <Row label="Total"><span style={{ color: 'var(--muted)' }}>{animTotal(layer).toFixed(2)} s</span></Row>
          </>
        )}
      </Section>
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
      <Sequence />
    </>
  );
}

function SlideAnimate() {
  const play = () => useStore.setState((s) => ({ playToken: s.playToken + 1 }));
  return (
    <>
      <Section title="Transition in" right={<button className="btn-soft accent" onClick={play}><Play size={12} />Play</button>}>
        <TransitionRows />
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

export async function fileToDataUrl(f: File, max = 2400): Promise<string> {
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
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
