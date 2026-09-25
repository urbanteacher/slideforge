import { ArrowDown, ArrowLeftRight, ArrowUp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EXPERIMENTS, experimentStates, type ExpState } from '../engine/experiment';
import { LOOKS, SCENES, sceneItems } from '../engine/scene';
import { rebuildSlide, RECIPE_NAMES } from '../model/recipes';
import { slideOf, useStore } from '../model/store';
import { applyGameSettings } from '../model/gameSettings';
import type { GameSettings, Layer, ParamValue } from '../model/types';
import { ColorField, Row, Scrub, Section, Select, newGesture } from './controls';
import { fileToDataUrl } from './Inspector';

/*
 * Bespoke inspectors for the layers that do something of their own — Before / after, Simulation,
 * Chart experiment, Motion experiment, Timer — and for the slide designs made of several layers
 * (Explore, Flip to facts, the gallery pile, chart callouts). Each shows what the thing is for, in
 * the order a teacher sets it up, rather than a list of its parameters.
 */

/** The special layers, and the name of the tab each gets. */
export const SPECIAL_TABS: Record<string, string> = { wipe: 'Before / after', model: 'Simulation', experiment: 'Experiment', scene: 'Motion', timer: 'Timer' };

const stop = (e: React.KeyboardEvent) => e.stopPropagation();
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="text-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={stop} />;
}
function Area({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea className="textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={stop} />;
}
function Chips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; swatch?: [string, string] }[]; onChange: (v: T) => void }) {
  return (
    <div className="sp-chips">
      {options.map((o) => (
        <button key={o.value} className={`sp-chip${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
          {o.swatch && <i style={{ background: o.swatch[0], borderColor: o.swatch[1] }}><b style={{ background: o.swatch[1] }} /></i>}{o.label}
        </button>
      ))}
    </div>
  );
}
/** A picture tile: its preview, and a button to replace it from a file. */
function PictureTile({ src, label, onChange }: { src: string; label?: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="sp-tile">
      <button className="sp-tile-pv" style={{ backgroundImage: src ? `url("${src}")` : undefined }} onClick={() => ref.current?.click()} title="Choose a picture">{!src && <span>Choose a picture</span>}</button>
      {label && <div className="sp-tile-label">{label}</div>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onChange(await fileToDataUrl(f)); }} />
    </div>
  );
}
/** A list whose rows can be reordered, removed and added to. */
function List<T>({ items, render, onChange, make, max = 8, noun }: { items: T[]; render: (item: T, set: (v: T) => void, i: number) => ReactNode; onChange: (v: T[]) => void; make: () => T; max?: number; noun: string }) {
  const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div className="sp-list">
      {items.map((it, i) => (
        <div className="sp-row" key={i}>
          <div className="sp-row-head">
            <span className="sp-num">{i + 1}</span>
            <span className="sp-row-tools">
              <button disabled={i === 0} onClick={() => move(i, -1)} title="Earlier"><ArrowUp size={12} /></button>
              <button disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Later"><ArrowDown size={12} /></button>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} title={`Remove this ${noun}`}><Trash2 size={12} /></button>
            </span>
          </div>
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
        </div>
      ))}
      {items.length < max && <button className="btn-soft" onClick={() => onChange([...items, make()])}><Plus size={13} />Add a {noun}</button>}
    </div>
  );
}

function useLayerParams(layer: Layer) {
  const update = useStore((s) => s.updateLayer);
  const gesture = useRef(newGesture());
  return (key: string, v: ParamValue, merge = false) => update(layer.id, (l) => { l.params[key] = v; }, merge ? gesture.current : undefined);
}

// ─── Before / after ─────────────────────────────────────────────────────────
function WipePanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  return (
    <>
      <div className="picture-head"><ArrowLeftRight size={14} />Two pictures of the same framing, and a handle that wipes one over the other. In Preview the room drags it.</div>
      <Section title="The two pictures">
        <div className="sp-pair">
          <div><PictureTile src={String(p.before ?? '')} onChange={(v) => set('before', v)} /><Input value={String(p.beforeLabel ?? '')} onChange={(v) => set('beforeLabel', v, true)} placeholder="Before" /></div>
          <div><PictureTile src={String(p.after ?? '')} onChange={(v) => set('after', v)} /><Input value={String(p.afterLabel ?? '')} onChange={(v) => set('afterLabel', v, true)} placeholder="After" /></div>
        </div>
        <button className="btn-soft" onClick={() => useStore.getState().updateLayer(layer.id, (l) => { const q = l.params; [q.before, q.after] = [q.after, q.before]; [q.beforeLabel, q.afterLabel] = [q.afterLabel, q.beforeLabel]; })}><ArrowLeftRight size={13} />Swap before and after</button>
        <div className="desc">Only worth it when the two are registered — same framing, same scale — so the wipe compares like with like.</div>
      </Section>
      <Section title="The handle">
        <Row label="Rests at" info="How much of the after picture shows before anyone drags it."><Scrub value={Number(p.position ?? 50)} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.position = v; }, m)} /></Row>
        <Row label="Fit"><Select value={String(p.fit ?? 'contain')} options={[{ value: 'contain', label: 'Whole picture' }, { value: 'cover', label: 'Fill the frame' }]} onChange={(v) => set('fit', v)} /></Row>
        <Row label="Colour"><ColorField value={String(p.accent ?? '#ff5a36')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.accent = v; }, m)} /></Row>
      </Section>
    </>
  );
}

// ─── Simulation ─────────────────────────────────────────────────────────────
function SimulationPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  const num = (k: string, d: number) => Number(p[k] ?? d);
  const scrub = (k: string, d: number, min: number, max: number, step: number, dec: number) => <Scrub value={num(k, d)} min={min} max={max} step={step} decimals={dec} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params[k] = v; }, m)} />;
  const inL = String(p.inputLabel ?? 'Input'), outL = String(p.outputLabel ?? 'Output');
  return (
    <>
      <div className="picture-head">A model drawn as its curve. In Preview the room drags the input and the output redraws — for when the relationship is the lesson.</div>
      <div className="sp-formula">{outL} = {num('a', 2)} × {inL}{p.model === 'quadratic' ? '²' : ''} {num('b', 0) < 0 ? '−' : '+'} {Math.abs(num('b', 0))}</div>
      <Section title="The model">
        <Chips value={String(p.model ?? 'linear')} options={[{ value: 'linear', label: 'Straight line' }, { value: 'quadratic', label: 'Curve' }]} onChange={(v) => set('model', v)} />
        <Row label="a">{scrub('a', 2, -100, 100, 0.1, 1)}</Row>
        <Row label="b">{scrub('b', 0, -1000, 1000, 1, 0)}</Row>
      </Section>
      <Section title="The input">
        <Row label="Called"><Input value={inL} onChange={(v) => set('inputLabel', v, true)} /></Row>
        <Row label="From">{scrub('min', 0, -1000, 999, 1, 0)}</Row>
        <Row label="To">{scrub('max', 10, -999, 1000, 1, 0)}</Row>
        <Row label="Starts at">{scrub('initial', 0, -1000, 1000, 0.5, 1)}</Row>
      </Section>
      <Section title="The output">
        <Row label="Called"><Input value={outL} onChange={(v) => set('outputLabel', v, true)} /></Row>
        <Row label="Curve colour"><ColorField value={String(p.accent ?? '#ff5a36')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.accent = v; }, m)} /></Row>
      </Section>
    </>
  );
}

// ─── Chart experiment ───────────────────────────────────────────────────────
const KINDS = ['bar', 'pie', 'line', 'dot', 'bubbles', 'hue', 'shape', 'tiles', 'table', 'network', 'field', 'geometry', 'classification'].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }));
function ExperimentPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  const states = experimentStates(p);
  const setStates = (next: ExpState[]) => set('states', JSON.stringify(next));
  return (
    <>
      <div className="picture-head">One dataset in several encodings. The room predicts first; each Next — or a press of a step on the slide — moves the marks into the next state.</div>
      <Section title="Demonstration">
        <Select value={String(p.preset ?? 'polling')} options={Object.entries(EXPERIMENTS).map(([k, v]) => ({ value: k, label: v.label }))}
          onChange={(v) => useStore.getState().updateLayer(layer.id, (l) => { l.params.preset = v; l.params.data = EXPERIMENTS[v].data; l.params.states = ''; })} />
        <div className="desc">Choosing one brings its own data and states; edit either below.</div>
      </Section>
      <Section title="Steps">
        <List noun="state" items={states} max={8} onChange={setStates} make={() => ({ label: 'New state', kind: 'bar', explanation: '' })}
          render={(st, put) => (
            <>
              <Row label="Button"><Input value={st.label} onChange={(v) => put({ ...st, label: v })} /></Row>
              <Row label="Shows as"><Select value={st.kind} options={KINDS} onChange={(v) => put({ ...st, kind: v })} /></Row>
              <Area rows={2} value={st.explanation ?? ''} onChange={(v) => put({ ...st, explanation: v })} placeholder="What this state shows, in a sentence or two" />
            </>
          )} />
        {String(p.states ?? '') && <button className="btn-soft" onClick={() => set('states', '')}><RefreshCw size={13} />Back to the demonstration’s own states</button>}
      </Section>
      <Section title="Data" defaultOpen={false}>
        <Area rows={6} value={String(p.data ?? '')} onChange={(v) => set('data', v, true)} />
        <div className="desc">Headings in the first row, categories in the first column, a tab between cells.</div>
        <Row label="Source"><Input value={String(p.source ?? '')} onChange={(v) => set('source', v, true)} /></Row>
      </Section>
      <Section title="Pace">
        <Chips value={String(p.duration ?? '1600')} options={[{ value: '800', label: 'Quick' }, { value: '1600', label: 'Teaching' }, { value: '3000', label: 'Slow observation' }]} onChange={(v) => set('duration', v)} />
      </Section>
    </>
  );
}

// ─── Motion experiment ──────────────────────────────────────────────────────
const SCENE_HINT: Record<string, string> = {
  mask: 'The picture grows out of a circle. Drag across it, or press Next in quarters.', draw: 'Nodes and their connections, one per Next.',
  cards: 'Press a card to open it; its neighbours keep the context.', annotate: 'Numbered callouts over the picture, one per Next.',
  scrub: 'Circles become aligned bars. The detail of each point is its number.', cause: 'y = a × x: drag the input, watch the sum.',
  branch: 'Choices whose consequence shows only when chosen.', explode: 'The parts of a system pulled apart by dragging.',
  lens: 'A magnifier the room drags over the picture.', panels: 'Story panels; the chosen one gets room.',
};
function ScenePanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer), mode = String(p.mode ?? 'cards');
  const items = sceneItems(p).map((r) => [r.label, r.detail] as [string, string]);
  const setItems = (rows: [string, string][]) => set('items', rows.map(([a, b]) => `${a}\t${b}`).join('\n'));
  return (
    <>
      <div className="picture-head">{SCENE_HINT[mode] ?? 'An interactive stage.'}</div>
      <Section title="Behaviour">
        <Select value={mode} options={Object.entries(SCENES).map(([k, v]) => ({ value: k, label: v }))} onChange={(v) => set('mode', v)} />
      </Section>
      <Section title="Look">
        <Chips value={String(p.look ?? 'editorial')} options={Object.entries(LOOKS).map(([k, v]) => ({ value: k, label: v.name, swatch: [v.paper, v.accent] as [string, string] }))} onChange={(v) => {
          set('look', v);
          // The slide takes the look's ground, as SlideForge's specimens do.
          const lk = LOOKS[v];
          useStore.getState().updateSlide((s) => { s.background = lk.bg; const g = s.layers.find((l) => l.name === 'Ground'); if (g) g.params.color = lk.bg; for (const l of s.layers) { if (l.name === 'Kicker') l.params.color = lk.accent; if (l.name === 'Heading') l.params.color = lk.ink; } });
        }} />
      </Section>
      <Section title={mode === 'scrub' ? 'Values' : 'Points'}>
        <List noun="point" items={items} max={4} onChange={setItems} make={(): [string, string] => ['New point', '']}
          render={([a, b], put) => (
            <>
              <Input value={a} onChange={(v) => put([v, b])} placeholder="Label" />
              {mode === 'scrub' ? <Input value={b} onChange={(v) => put([a, v])} placeholder="A number, 1–100" /> : <Area rows={2} value={b} onChange={(v) => put([a, v])} placeholder="What it means" />}
            </>
          )} />
      </Section>
      {['mask', 'annotate', 'lens'].includes(mode) && <Section title="Picture"><PictureTile src={String(p.image ?? '')} onChange={(v) => set('image', v)} /></Section>}
      {mode === 'cause' && <Section title="The model"><Row label="Multiplier a"><Scrub value={Number(p.factor ?? 2)} min={-10} max={10} step={0.5} decimals={1} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.factor = v; }, m)} /></Row></Section>}
    </>
  );
}

// ─── Timer ──────────────────────────────────────────────────────────────────
function TimerPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer), style = String(p.style ?? 'ring');
  return (
    <>
      <div className="picture-head">It starts when the slide comes up in Preview and resets when you leave it.</div>
      <Section title="How long">
        <Chips value={String(p.minutes ?? 5)} options={[0.25, 0.5, 1, 2, 3, 5, 10, 15, 20].map((m) => ({ value: String(m), label: m < 1 ? `${m * 60} s` : `${m} min` }))} onChange={(v) => set('minutes', Number(v))} />
        <Row label="Or exactly"><Scrub value={Number(p.minutes ?? 5)} min={0.1} max={120} step={0.25} decimals={2} unit=" min" onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.minutes = v; }, m)} /></Row>
      </Section>
      <Section title="Style">
        <Chips value={style} options={[{ value: 'game', label: 'Game clock' }, { value: 'ring', label: 'Ring' }, { value: 'digits', label: 'Time only' }, { value: 'bar', label: 'Bar' }]} onChange={(v) => set('style', v)} />
        {style !== 'game' && <>
          <Row label="Label"><Input value={String(p.label ?? '')} onChange={(v) => set('label', v, true)} placeholder="Time left" /></Row>
          <Row label="At zero"><Input value={String(p.done ?? '')} onChange={(v) => set('done', v, true)} placeholder="Time’s up" /></Row>
        </>}
        <Row label="Colour"><ColorField value={String(p.accent ?? '#d94f2b')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.accent = v; }, m)} /></Row>
        {style === 'game' && <div className="desc">SlideForge’s game clock: the ring turns red in the last minute, and the time at zero.</div>}
      </Section>
    </>
  );
}

export function SpecialPanel({ layer }: { layer: Layer }) {
  switch (layer.kind) {
    case 'wipe': return <WipePanel layer={layer} />;
    case 'model': return <SimulationPanel layer={layer} />;
    case 'experiment': return <ExperimentPanel layer={layer} />;
    case 'scene': return <ScenePanel layer={layer} />;
    case 'timer': return <TimerPanel layer={layer} />;
    default: return null;
  }
}

// ─── Slide designs made of several layers ───────────────────────────────────
type Spot = { x: number; y: number; zoom?: number; title: string; body?: string };
type Fig = { src: string; caption?: string; source?: string };
type Callout = { label: string; note: string };

/** Edit what a slide design was built from, then build it again in place. */
export function RecipePanel() {
  const slide = useStore(slideOf);
  const recipe = slide.recipe;
  const [args, setArgs] = useState<Record<string, unknown>>(recipe?.args ?? {});
  useEffect(() => { setArgs(recipe?.args ?? {}); }, [slide.id, recipe]);
  if (!recipe || !RECIPE_NAMES[recipe.kind]) return null;
  const put = (k: string, v: unknown) => setArgs((a) => ({ ...a, [k]: v }));
  const dirty = JSON.stringify(args) !== JSON.stringify(recipe.args);
  const apply = () => useStore.getState().mutate((d) => rebuildSlide(d, slide.id, args));
  const str = (k: string) => String(args[k] ?? '');
  let body: ReactNode = null;
  if (recipe.kind === 'explore') {
    const spots = (args.spots as Spot[]) ?? [];
    body = (
      <>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <PictureTile src={str('src')} onChange={(v) => put('src', v)} />
        <List noun="hotspot" items={spots} max={8} onChange={(v) => put('spots', v)} make={() => ({ x: 50, y: 50, zoom: 2, title: 'A detail', body: '' })}
          render={(sp, set) => (
            <>
              <Input value={sp.title} onChange={(v) => set({ ...sp, title: v })} placeholder="What it is" />
              <Area rows={2} value={sp.body ?? ''} onChange={(v) => set({ ...sp, body: v })} placeholder="Why it matters" />
              <Row label="Across"><Scrub value={sp.x} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v) => set({ ...sp, x: v })} /></Row>
              <Row label="Down"><Scrub value={sp.y} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v) => set({ ...sp, y: v })} /></Row>
              <Row label="Zoom"><Scrub value={sp.zoom ?? 2} min={1} max={4} step={0.1} decimals={1} unit="×" onChange={(v) => set({ ...sp, zoom: v })} /></Row>
            </>
          )} />
      </>
    );
  } else if (recipe.kind === 'flip') {
    body = (
      <>
        <PictureTile src={str('src')} onChange={(v) => put('src', v)} />
        <Row label="Caption"><Input value={str('caption')} onChange={(v) => put('caption', v)} /></Row>
        <Row label="Credit"><Input value={str('credit')} onChange={(v) => put('credit', v)} /></Row>
        <Row label="Frame"><Select value={str('frame') || '4:3'} options={['16:9', '4:3', '3:2', '1:1', '4:5'].map((f) => ({ value: f, label: f }))} onChange={(v) => put('frame', v)} /></Row>
        <Row label="Caption on"><Select value={str('cap') || 'bar'} options={[{ value: 'bar', label: 'An accent bar' }, { value: 'plain', label: 'The slide' }]} onChange={(v) => put('cap', v)} /></Row>
        <div className="desc">The facts on the back, one paragraph a line. Empty takes the ⇄ away.</div>
        <Area rows={6} value={str('facts')} onChange={(v) => put('facts', v)} />
      </>
    );
  } else if (recipe.kind === 'gallery') {
    const figs = (args.figs as Fig[]) ?? [];
    body = (
      <>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <List noun="picture" items={figs} max={8} onChange={(v) => put('figs', v)} make={() => ({ src: '', caption: '', source: '' })}
          render={(f, set) => (
            <>
              <PictureTile src={f.src} onChange={(v) => set({ ...f, src: v })} />
              <Input value={f.caption ?? ''} onChange={(v) => set({ ...f, caption: v })} placeholder="Caption" />
              <Input value={f.source ?? ''} onChange={(v) => set({ ...f, source: v })} placeholder="Source" />
            </>
          )} />
        <Row label="Frame"><Select value={str('frame') || '4:3'} options={['16:9', '4:3', '3:2', '1:1', '4:5'].map((f) => ({ value: f, label: f }))} onChange={(v) => put('frame', v)} /></Row>
        <Row label="Fit"><Select value={str('fit') || 'contain'} options={[{ value: 'contain', label: 'Whole picture' }, { value: 'cover', label: 'Fill the frame' }]} onChange={(v) => put('fit', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'callouts') {
    const callouts = (args.callouts as Callout[]) ?? [];
    const labels = str('data').split('\n').filter((l) => l.trim()).map((l) => l.split(',')[0].trim());
    body = (
      <>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <div className="desc">The chart’s data: one “label, value” per line.</div>
        <Area rows={6} value={str('data')} onChange={(v) => put('data', v)} />
        <Row label="Source"><Input value={str('source')} onChange={(v) => put('source', v)} /></Row>
        <List noun="callout" items={callouts} max={6} onChange={(v) => put('callouts', v)} make={() => ({ label: labels[0] ?? '', note: '' })}
          render={(c, set) => (
            <>
              <Row label="Zooms to"><Select value={c.label} options={labels.map((l) => ({ value: l, label: l }))} onChange={(v) => set({ ...c, label: v })} /></Row>
              <Area rows={2} value={c.note} onChange={(v) => set({ ...c, note: v })} placeholder="What to notice there" />
            </>
          )} />
      </>
    );
  }
  return (
    <Section title={RECIPE_NAMES[recipe.kind]}>
      <div className="desc">This slide is a {RECIPE_NAMES[recipe.kind]} design. Change what it shows here, then build it again — its place, notes, header and footer stay.</div>
      {body}
      <button className={`btn-soft tidy${dirty ? ' sp-dirty' : ''}`} disabled={!dirty} onClick={apply}><RefreshCw size={13} />{dirty ? 'Update the slide' : 'Up to date'}</button>
    </Section>
  );
}

// ─── A game's settings ──────────────────────────────────────────────────────
const ROLE_NAMES = { cover: 'its cover', question: 'a question', answer: 'an answer', board: 'its board', end: 'its end' } as const;
const secs = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/**
 * What a game runs by and the wall cannot show: the time, the points, the difficulty, how close
 * counts, the spellings that also count. A change goes to the question and its answer together, or
 * from the cover to every question; the clock, the eyebrow and the rest of what shows it follow.
 */
export function GamePanel() {
  const slide = useStore(slideOf);
  const deck = useStore((s) => s.deck);
  const g = slide.game;
  const [accept, setAccept] = useState('');
  useEffect(() => { setAccept((g?.settings.accept ?? []).join('\n')); }, [slide.id, g?.settings.accept]);
  if (!g) return null;
  const s = g.settings;
  const apply = (change: GameSettings, every = false, merge?: string) => useStore.getState().mutate((d) => applyGameSettings(d, slide.id, change, every), merge);
  const timed = (g.role === 'question' || g.role === 'board') && g.clock !== 'none' && (g.role === 'question' || s.seconds != null);
  const canNone = g.role === 'question' && g.clock !== 'Round';
  const times = [...(canNone ? [0] : []), 10, 15, 20, 30, 45, 60, 90, 120, 180];
  const questions = deck.slides.filter((x) => x.game?.id === g.id && x.game.role === 'question' && x.game.clock !== 'none');
  const first = questions[0]?.game?.settings.seconds ?? 0;
  const levels = g.format === 'boss-battle' ? ['easy', 'medium', 'hard', 'boss'] : ['easy', 'medium', 'hard'];
  return (
    <Section title={`Game · ${g.label}`}>
      <div className="desc">This slide is {ROLE_NAMES[g.role]} of the game. These are how it runs, and what the wall shows follows them{g.key != null ? '; a question and its answer share them' : ''}.</div>
      {timed && (
        <>
          <Row label={g.clock ?? 'Time limit'}>
            <Chips value={String(s.seconds ?? 0)} options={times.map((t) => ({ value: String(t), label: t ? secs(t) : 'None' }))} onChange={(v) => apply({ seconds: Number(v) || undefined })} />
          </Row>
          <Row label="Or exactly"><Scrub value={s.seconds ?? 0} min={canNone ? 0 : 5} max={600} step={1} decimals={0} unit=" s" onChange={(v, m) => apply({ seconds: v || undefined }, false, m)} /></Row>
        </>
      )}
      {g.role === 'cover' && questions.length > 0 && (
        <Row label="Every question" info="The time for each question in the game, set at once. Each can still be changed on its own slide.">
          <Chips value={String(first)} options={[0, 10, 15, 20, 30, 45, 60].map((t) => ({ value: String(t), label: t ? secs(t) : 'None' }))} onChange={(v) => { const d = useStore.getState().deck; const q = d.slides.find((x) => x.id === questions[0].id); if (q) useStore.getState().mutate((dd) => applyGameSettings(dd, q.id, { seconds: Number(v) || undefined }, true)); }} />
        </Row>
      )}
      {s.difficulty != null && (
        <Row label="Difficulty" info={g.format === 'boss-battle' ? 'Sets the hit a right answer deals: easy 1, medium 2, hard 3, boss 5.' : g.format === 'emoji-guess' ? 'Easy gives the letter pattern and the hint; medium the pattern only; hard neither.' : g.format === 'word-reveal' ? 'How much of the word shows before the drip: easy 60%, medium 40%, hard 20%.' : undefined}>
          <Select value={s.difficulty} options={levels.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))} onChange={(v) => apply({ difficulty: v })} />
        </Row>
      )}
      {g.format === 'boss-battle' && s.damage != null && (
        <Row label="Damage" info="What a right answer takes off the boss. The health bar re-divides across the game."><Scrub value={s.damage} min={1} max={10} step={1} decimals={0} onChange={(v, m) => apply({ damage: v }, false, m)} /></Row>
      )}
      {s.points != null && g.format !== 'quiz-bowl' && (
        <Row label="Points"><Scrub value={s.points} min={0} max={5000} step={10} decimals={0} onChange={(v, m) => apply({ points: v }, false, m)} /></Row>
      )}
      {s.tolerance != null && (
        <Row label="Counts within" info="How close an answer must be to score. The green band on the answer shows it."><Scrub value={s.tolerance} min={0} max={Math.max(1, s.range ? s.range[1] - s.range[0] : 100)} step={1} decimals={0} onChange={(v, m) => apply({ tolerance: v }, false, m)} /></Row>
      )}
      {s.words != null && <WordsRow slideId={slide.id} words={s.words} />}
      {s.accept != null && (
        <>
          <div className="desc">Also accept — one spelling a line. Near spellings count too, in SlideForge’s live session.</div>
          <Area rows={3} value={accept} onChange={(v) => { setAccept(v); apply({ accept: v.split('\n').map((x) => x.trim()).filter(Boolean) }, false, 'accept'); }} />
        </>
      )}
    </Section>
  );
}

/** Mind reveal's words: its content, so the slides are made again from them when they change. */
function WordsRow({ slideId, words }: { slideId: string; words: string[] }) {
  const [text, setText] = useState(words.join('\n'));
  useEffect(() => { setText(words.join('\n')); }, [slideId, words]);
  const next = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const dirty = next.join('|') !== words.join('|');
  return (
    <>
      <div className="desc">The words to remember, one a line — up to 20. Updating makes the study, recall and answer slides again.</div>
      <Area rows={6} value={text} onChange={setText} />
      <button className={`btn-soft tidy${dirty ? ' sp-dirty' : ''}`} disabled={!dirty || !next.length} onClick={() => useStore.getState().mutate((d) => applyGameSettings(d, slideId, { words: next }))}><RefreshCw size={13} />{dirty ? `Update the slides (${next.length} words)` : 'Up to date'}</button>
    </>
  );
}
