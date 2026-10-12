// The inspector's Design tab for a layer: its params, row by row, its box and its alignment.
import type { BlendMode, Layer, ParamValue } from '../../core';
import { RECIPE_NAMES } from '../../designs';
import { autoHeight, textSize, FONTS, defaultParams, kind, type ParamDef } from '../../engine';
import { slideOf, useStore } from '../../store';
import { fontChoices } from '../../theme';
import { ColorField, Row, Scrub, Section, Select, Toggle, newGesture } from '../controls/controls';
import { alignLayer, nextDirection, sequenceSize, tidyUp, type Edge } from '../stage/snap';
import { addFade, applyFrame } from './picture';
import { SPECIAL_TABS } from './special';
import { Image as ImageIcon, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, RotateCcw, Shuffle, WandSparkles } from 'lucide-react';
import { useRef } from 'react';
import { fileToDataUrl, readDataUrl } from '../controls/files';

const BLENDS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }, { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' }, { value: 'softLight', label: 'Soft light' }, { value: 'hardLight', label: 'Hard light' },
  { value: 'darken', label: 'Darken' }, { value: 'lighten', label: 'Lighten' }, { value: 'colorDodge', label: 'Colour dodge' },
  { value: 'colorBurn', label: 'Colour burn' }, { value: 'difference', label: 'Difference' }, { value: 'exclusion', label: 'Exclusion' },
  { value: 'add', label: 'Add' },
];

// ─── Design ─────────────────────────────────────────────────────────────────
export function LayerDesign({ layer, picture = false }: { layer: Layer; picture?: boolean }) {
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
      {layer.kind === 'image' && (
        // What a picture most often needs, where the picture is selected: how it fills its box, a
        // border, its corners. Its frame, caption and motion stay in the Picture tab.
        <Section title="Picture">
          {['fit', 'border', 'borderColor', 'radius'].map((key) => k.params.find((d) => d.key === key))
            .filter((d): d is ParamDef => !!d && (!d.when || d.when(layer.params)))
            .map((d) => <ParamRow key={d.key} layer={layer} def={d} setParam={setParam} />)}
          <Row label="Fade for text" info="Lays a gradient over the picture so words read on it: dark on the side the words sit on, clear on the other. It is an ordinary shape, so move or recolour it afterwards.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['left', 'Left'], ['right', 'Right'], ['bottom', 'Bottom'], ['all', 'All over']] as const).map(([side, label]) => (
                <button key={side} className="btn-soft" onClick={() => addFade(layer.id, side)}>{label}</button>
              ))}
            </div>
          </Row>
        </Section>
      )}
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

export function VideoPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

/** On a slide built as a design, the way to its editor: the slide's own panel. */
function RecipeLink() {
  const slide = useStore(slideOf);
  if (!slide.recipe || !RECIPE_NAMES[slide.recipe.kind]) return null;
  return <button className="picture-link" onClick={() => useStore.getState().set({ selectedId: null })}><ImageIcon size={13} />This slide is a <b>{RECIPE_NAMES[slide.recipe.kind]}</b> design — change what it shows in the slide’s panel</button>;
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
