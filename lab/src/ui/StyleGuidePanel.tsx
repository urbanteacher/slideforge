import { BookOpen, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { FONTS } from '../engine/registry';
import { createLayer } from '../model/defaults';
import { fontChoices, paletteOf, readGuide, themeFrom } from '../model/guide';
import { guideStyle } from '../model/layouts';
import { layerOf, useStore } from '../model/store';
import { applyTheme } from '../model/theme';
import type { Deck, GuideTheme, StyleGuide } from '../model/types';
import { Row, Select } from './controls';

// Your own style guide, in the side panel. Give it the guide's web address (or drop its page or
// stylesheet) and the lab reads the colours it names, the sets they come in, its typefaces and its
// marks into the deck. The guide then is a theme like any other — every role one of its own colours
// or fonts, each changeable here — and its palette and marks are one click from the slide.

const ROLES: { key: keyof GuideTheme; label: string; info: string }[] = [
  { key: 'ground', label: 'Ground', info: 'The slide behind everything.' },
  { key: 'ink', label: 'Text', info: 'Headings and body copy.' },
  { key: 'muted', label: 'Quiet text', info: 'Credits, captions and anything that should sit back.' },
  { key: 'accent', label: 'Accent', info: 'Rules, rings, bars and the first backdrop wash.' },
  { key: 'accent2', label: 'Second accent', info: 'The other wash in backdrop motion.' },
  { key: 'panel', label: 'Panel', info: 'Cards and boxes that sit on the ground.' },
];

/** Change the guide, and restyle every slide when the deck is in it. */
function editGuide(fn: (g: StyleGuide, d: Deck) => void) {
  useStore.getState().mutate((d) => {
    if (!d.styleGuide) return;
    fn(d.styleGuide, d);
    if (d.theme === 'guide') applyTheme(d, guideStyle(d.styleGuide));
  });
}

export function StyleGuidePanel() {
  const guide = useStore((s) => s.deck.styleGuide);
  const theme = useStore((s) => s.deck.theme);
  const { mutate, showToast, insertLayer, updateLayer } = useStore.getState();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const read = async (input: string | File) => {
    if (!input) return;
    setBusy(true);
    setNotes([]);
    try {
      const { guide: g, notes: n } = await readGuide(input);
      mutate((d) => { d.styleGuide = g; });
      setNotes(n);
      showToast(n[0]);
    } catch (e) {
      setNotes([`Could not read that guide: ${(e as Error).message}`]);
    } finally {
      setBusy(false);
    }
  };

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) read(f);
    else { const u = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'); if (u) read(u.trim()); }
  };

  if (!guide) {
    return (
      <div className={`panel-scroll guide-panel${over ? ' drop' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        <div className="fx-note">Bring in your own brand: its colours, typefaces and marks become this deck’s theme.</div>
        <form className="guide-read" onSubmit={(e) => { e.preventDefault(); read(url); }}>
          <input className="text-input" placeholder="Style guide web address" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <button className="btn-soft accent" disabled={busy || !url.trim()} type="submit"><BookOpen size={13} />{busy ? 'Reading…' : 'Read'}</button>
        </form>
        <button className="btn-soft guide-file" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={13} />Or choose its .html or .css file — or drop it here</button>
        <input ref={fileRef} type="file" accept=".html,.htm,.css,text/html,text/css" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ''; }} />
        {notes.map((n, i) => <div key={i} className="desc">{n}</div>)}
      </div>
    );
  }

  const pal = paletteOf(guide);
  const colourOptions = (current: string) => {
    const opts = pal.map((p) => ({ value: p.value, label: `${p.name} · ${p.value}` }));
    return opts.some((o) => o.value === current) ? opts : [{ value: current, label: `${current} (worked out)` }, ...opts];
  };
  const fonts = fontChoices(guide, FONTS).map((f) => ({ value: f, label: f }));
  const using = theme === 'guide';
  const paint = (hex: string) => {
    const sel = layerOf(useStore.getState());
    if (!sel) { showToast('Select a text box or shape, then click a colour to use it.'); return; }
    const key = sel.kind === 'text' ? 'color' : sel.kind === 'shape' ? 'fill' : 'textColor' in sel.params ? 'textColor' : 'color' in sel.params ? 'color' : null;
    if (!key) { showToast('That layer has no colour to set.'); return; }
    updateLayer(sel.id, (l) => { l.params[key] = hex; });
  };
  const place = (src: string, name: string) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 420 / Math.max(img.naturalWidth || 420, img.naturalHeight || 420));
      const w = Math.max(40, (img.naturalWidth || 420) * k), h = Math.max(40, (img.naturalHeight || 420) * k);
      insertLayer(createLayer('image', { name, params: { src, fit: 'contain' }, box: { x: 960 - w / 2, y: 540 - h / 2, w, h, rot: 0 }, anim: { type: 'fade' } }));
    };
    img.src = src;
  };

  return (
    <div className="panel-scroll guide-panel">
      <div className="guide-head">
        <div>
          <b>{guide.name}</b>
          <small title={guide.source}>{guide.source.replace(/^https?:\/\//, '')}</small>
        </div>
        <button className="tb-btn icon" title="Read it again" disabled={busy || !/^https?:/.test(guide.source)} onClick={() => read(guide.source)}><RefreshCw size={13} /></button>
        <button className="tb-btn icon" title="Remove the style guide from this deck" onClick={() => mutate((d) => { delete d.styleGuide; if (d.theme === 'guide') delete d.theme; })}><Trash2 size={13} /></button>
      </div>
      {notes.slice(1).map((n, i) => <div key={i} className="desc">{n}</div>)}

      {guide.sets.length > 1 && (
        <>
          <div className="lp-label">Colour set</div>
          <div className="guide-sets">
            {guide.sets.map((set) => {
              const own = guide.swatches.filter((s) => s.set === set).map((s) => s.value);
              return (
                <button key={set} className={`g-style${guide.set === set ? ' on' : ''}`} title={`Use the ${set} colours`}
                  onClick={() => editGuide((g) => { const t = themeFrom(g, set); g.set = set; g.theme = { ...t, display: g.theme.display, body: g.theme.body, displayWeight: g.theme.displayWeight }; })}>
                  <i style={{ background: own[0] ?? '#888', borderColor: own[1] ?? own[0] ?? '#888' }} />{set}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="lp-label">Theme from this guide</div>
      <button className={`btn-soft${using ? '' : ' accent'} guide-use`} onClick={() => { mutate((d) => d.styleGuide && applyTheme(d, guideStyle(d.styleGuide))); showToast(`Every slide is now in ${guide.name}. Undo puts the old look back.`); }}>
        {using ? 'In use on every slide — apply again' : 'Use as the theme · every slide'}
      </button>
      {ROLES.map((r) => (
        <Row key={r.key} label={r.label} info={r.info}>
          <span className="guide-chip" style={{ background: guide.theme[r.key] }} />
          <Select value={guide.theme[r.key]} options={colourOptions(guide.theme[r.key])} onChange={(v) => editGuide((g) => { g.theme[r.key] = v; })} />
        </Row>
      ))}
      <Row label="Display type"><Select value={guide.theme.display} options={fonts} onChange={(v) => editGuide((g) => { g.theme.display = v; })} /></Row>
      <Row label="Display weight"><Select value={guide.theme.displayWeight} options={['400', '500', '600', '700', '800'].map((w) => ({ value: w, label: w }))} onChange={(v) => editGuide((g) => { g.theme.displayWeight = v; })} /></Row>
      <Row label="Body type"><Select value={guide.theme.body} options={fonts} onChange={(v) => editGuide((g) => { g.theme.body = v; })} /></Row>

      <div className="lp-label">Palette · click to colour the selection</div>
      <div className="guide-palette">
        {pal.map((p) => (
          <button key={p.name} className="guide-swatch" title={`${p.name} · ${p.value}`} style={{ background: p.value }} onClick={() => paint(p.value)} />
        ))}
      </div>

      {guide.fonts.length > 0 && (
        <>
          <div className="lp-label">Typefaces</div>
          {guide.fonts.map((f) => (
            <div key={f.family} className="guide-font" style={{ fontFamily: `"${f.family}"` }}>
              {f.family}<small>{f.faces.map((x) => x.weight).join(' · ')}</small>
            </div>
          ))}
        </>
      )}

      {guide.marks.length > 0 && (
        <>
          <div className="lp-label">Marks · click to place on this slide</div>
          <div className="img-grid">
            {guide.marks.map((m) => (
              <button key={m.name + m.src.length} className="img-card reuse guide-mark" title={`${m.name} — click to place it on this slide`} onClick={() => place(m.src, m.name)}>
                <div className="img-thumb"><img src={m.src} alt={m.name} draggable={false} /></div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
