import { ImagePlus, Palette, Plus, Shuffle, Trash2, Type, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { FONTS } from '../engine/registry';
import { readablePairs, wadaCombinations } from '../model/combos';
import { createLayer } from '../model/defaults';
import { blankGuide, chooseSet, fontChoices, fromPreset, paletteOf } from '../model/guide';
import { LAYOUT_STYLES, guideStyle, themeOf } from '../model/layouts';
import { paletteGroups, type PalettePreset } from '../model/palettes';
import { layerOf, slideOf, useStore } from '../model/store';
import { applyTheme, setSlideGround, varyGrounds } from '../model/theme';
import type { Deck, GuideTheme, StyleGuide } from '../model/types';
import { ColorField, Row, Select } from './controls';
import { fileToDataUrl, readDataUrl } from './Inspector';

// Colours & grounds. A deck in one colour is the easy mistake, so a palette here always comes as three
// grounds that work together — working (light), quiet (dark) and loud (colour) — picked from a
// gallery, or started from the deck's own colours. Every slide can then be set on any of the three,
// or the deck varied in one press; and every colour, font and mark stays the teacher's to change.

type RoleKey = Exclude<keyof GuideTheme, 'display' | 'displayWeight' | 'body' | 'hero'>;
const ROLES: { key: RoleKey; label: string; info: string }[] = [
  { key: 'ground', label: 'Working ground', info: 'The ground most slides sit on — light for most palettes, navy for UK Black Tech.' },
  { key: 'ink', label: 'Text', info: 'Headings and body copy on the working ground.' },
  { key: 'muted', label: 'Quiet text', info: 'Credits, captions and anything that should sit back.' },
  { key: 'accent', label: 'Colour', info: 'Rules, rings and bars, the loud ground and the first backdrop wash.' },
  { key: 'accent2', label: 'Second colour', info: 'The other wash in backdrop motion.' },
  { key: 'panel', label: 'Panel', info: 'Cards and boxes that sit on the working ground.' },
];

/** Change the palette, and restyle every slide when the deck wears it. */
function editGuide(fn: (g: StyleGuide, d: Deck) => void, merge?: string) {
  useStore.getState().mutate((d) => {
    if (!d.styleGuide) return;
    fn(d.styleGuide, d);
    if (d.theme === 'guide') applyTheme(d, guideStyle(d.styleGuide));
  }, merge);
}

/** Three blocks, one per ground, each with a line of type in the ink that goes on it. */
function Grounds({ p }: { p: PalettePreset }) {
  const block = (bg: string, ink: string, label: string) => <span className="pg-ground" style={{ background: bg, color: ink }} title={label}>Aa</span>;
  return (
    <span className="pg-grounds">
      {block(p.working?.ground ?? p.light, p.working?.ink ?? p.dark, 'Working')}
      {block(p.quiet?.ground ?? p.dark, p.quiet?.ink ?? p.light, 'Quiet')}
      {block(p.loud, p.loudInk, 'Loud')}
    </span>
  );
}

function Gallery({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const groups = useMemo(paletteGroups, []);
  const { mutate, showToast } = useStore.getState();
  const pick = (p: PalettePreset) => {
    mutate((d) => { d.styleGuide = fromPreset(p); applyTheme(d, guideStyle(d.styleGuide)); });
    showToast(`Every slide is now in ${p.name}. Undo puts the old look back.`);
    onDone();
  };
  const own = () => {
    mutate((d) => { d.styleGuide = blankGuide(themeOf(d) ?? LAYOUT_STYLES[0]); applyTheme(d, guideStyle(d.styleGuide)); });
    onDone();
  };
  return (
    <div className="panel-scroll guide-panel">
      <div className="fx-note">Pick a palette. Each comes as three grounds — working, quiet and loud — so the deck is never one colour.</div>
      {onCancel && <button className="btn-soft" onClick={onCancel}><X size={13} />Keep the palette I have</button>}
      <button className="btn-soft guide-own" onClick={own}><Palette size={13} />Start from this deck’s colours</button>
      {groups.map((g) => (
        <section key={g.group}>
          <div className="lp-label">{g.group}</div>
          <div className="pg-grid">
            {g.presets.map((p) => (
              <button key={p.id} className="pg-card" title={`${p.name} — ${p.source}`} onClick={() => pick(p)}>
                <Grounds p={p} />
                {p.sets && <span className="pg-sets">{p.sets.map((s, i) => <i key={i} style={{ background: s.loud }} />)}</span>}
                <span className="pg-name">{p.name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function StyleGuidePanel() {
  const guide = useStore((s) => s.deck.styleGuide);
  const [browsing, setBrowsing] = useState(false);
  if (!guide || browsing) return <Gallery onDone={() => setBrowsing(false)} onCancel={guide ? () => setBrowsing(false) : undefined} />;
  return <StyleEditor guide={guide} onBrowse={() => setBrowsing(true)} />;
}

function StyleEditor({ guide, onBrowse }: { guide: StyleGuide; onBrowse: () => void }) {
  const theme = useStore((s) => s.deck.theme);
  const slide = useStore(slideOf);
  const { mutate, showToast, insertLayer, updateLayer } = useStore.getState();
  const [editing, setEditing] = useState(false);
  const fontRef = useRef<HTMLInputElement>(null);
  const markRef = useRef<HTMLInputElement>(null);
  const using = theme === 'guide';
  const style = guideStyle(guide);
  const pal = paletteOf(guide);
  const colourOptions = (current: string) => {
    const opts = pal.map((p) => ({ value: p.value, label: `${p.name} · ${p.value}` }));
    return opts.some((o) => o.value === current) ? opts : [{ value: current, label: current }, ...opts];
  };
  const fonts = fontChoices(guide, FONTS).map((f) => ({ value: f, label: f }));
  const pairs = useMemo(() => readablePairs(pal.map((p) => p.value), 8), [guide]);
  const classic = useMemo(() => wadaCombinations(pal.map((p) => p.value), 5), [guide]);

  const wear = () => mutate((d) => d.styleGuide && applyTheme(d, guideStyle(d.styleGuide)));
  const setGround = (id: string | null) => mutate((d) => {
    if (d.theme !== 'guide' && d.styleGuide) applyTheme(d, guideStyle(d.styleGuide));
    setSlideGround(d, slide.id, id);
  });
  const paint = (hex: string) => {
    const sel = layerOf(useStore.getState());
    if (!sel) { showToast('Select a text box or shape, then click a colour to use it.'); return; }
    const k = sel.kind === 'text' ? 'color' : sel.kind === 'shape' ? 'fill' : 'textColor' in sel.params ? 'textColor' : 'color' in sel.params ? 'color' : null;
    if (!k) { showToast('That layer has no colour to set.'); return; }
    updateLayer(sel.id, (l) => { l.params[k] = hex; });
  };
  /** A colour changed in the palette changes everywhere it is used: the roles and the grounds. */
  const recolour = (i: number, hex: string, m?: string) => editGuide((g) => {
    const sw = g.swatches.filter((s) => !s.set || s.set === g.set)[i];
    if (!sw) return;
    const old = sw.value;
    sw.value = hex;
    for (const r of ROLES) if (g.theme[r.key] === old) (g.theme as unknown as Record<string, string>)[r.key] = hex;
    for (const gr of g.grounds ?? []) for (const k of ['ground', 'ink', 'muted', 'accent'] as const) if (gr[k] === old) gr[k] = hex;
  }, m);
  const place = (src: string, name: string) => {
    const img = new Image();
    img.onload = () => {
      const w0 = img.naturalWidth || 400, h0 = img.naturalHeight || 400;
      // A drawing scales to any size, so a 24px icon arrives large enough to see; a photo is never enlarged.
      const k = Math.min(/^data:image\/svg/.test(src) ? Infinity : 1, 360 / Math.max(w0, h0));
      const w = w0 * k, h = h0 * k;
      insertLayer(createLayer('image', { name, params: { src, fit: 'contain' }, box: { x: 960 - w / 2, y: 540 - h / 2, w, h, rot: 0 }, anim: { type: 'fade' } }));
    };
    img.src = src;
  };
  const addFont = async (f: File) => {
    const family = f.name.replace(/\.[^.]+$/, '').replace(/[-_ ]?(thin|light|regular|book|medium|semibold|bold|extrabold|black|italic|\d{3})+$/gi, '').replace(/[-_]/g, ' ').trim() || 'My font';
    const weight = /black|extrabold/i.test(f.name) ? '800' : /bold/i.test(f.name) ? (/semi/i.test(f.name) ? '600' : '700') : /medium/i.test(f.name) ? '500' : /light/i.test(f.name) ? '300' : '400';
    const src = await readDataUrl(f);
    editGuide((g) => {
      let gf = g.fonts.find((x) => x.family === family);
      if (!gf) g.fonts.push((gf = { family, faces: [] }));
      gf.faces.push({ weight, style: /italic/i.test(f.name) ? 'italic' : 'normal', src });
    });
    showToast(`${family} ${weight} is in the font lists.`);
  };
  const addMark = async (f: File) => {
    const src = await fileToDataUrl(f, 1600);
    editGuide((g) => { g.marks.push({ name: f.name.replace(/\.[^.]+$/, ''), src }); });
  };

  const current = slide.ground ?? null;
  const shown = guide.swatches.filter((s) => !s.set || s.set === guide.set);

  return (
    <div className="panel-scroll guide-panel">
      <div className="guide-head">
        <div>
          <b>{guide.name}</b>
          <small title={guide.source}>{guide.source}</small>
        </div>
        <button className="tb-btn icon" title="Choose another palette" onClick={onBrowse}><Palette size={13} /></button>
        <button className="tb-btn icon" title="Remove this palette from the deck (the slides keep their colours)" onClick={() => mutate((d) => { delete d.styleGuide; if (d.theme === 'guide') delete d.theme; for (const s of d.slides) delete s.ground; })}><Trash2 size={13} /></button>
      </div>
      {!using && <button className="btn-soft accent guide-use" onClick={wear}>Use on every slide</button>}

      {guide.sets.length > 1 && (
        <>
          <div className="lp-label">Colour set</div>
          <div className="guide-sets">
            {guide.sets.map((set) => {
              const own = guide.swatches.filter((s) => s.set === set).map((s) => s.value);
              return (
                <button key={set} className={`guide-set${guide.set === set ? ' on' : ''}`} title={own.join(' · ')} aria-label={`Colour set ${set}: ${own.join(', ')}`} onClick={() => editGuide((g) => chooseSet(g, set))}>
                  {own.map((c, i) => <i key={i} style={{ background: c }} />)}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="lp-label">This slide’s ground</div>
      <div className="guide-grounds">
        <button className={`guide-ground${!current || !using ? ' on' : ''}`} style={{ background: style.ground, color: style.ink }} onClick={() => setGround(null)}>Aa<small>Working</small></button>
        {(style.grounds ?? []).map((g) => (
          <button key={g.id} className={`guide-ground${using && current === g.id ? ' on' : ''}`} style={{ background: g.ground, color: g.ink }} onClick={() => setGround(g.id)}>Aa<small>{g.name}</small></button>
        ))}
      </div>
      <button className="btn-soft guide-vary" onClick={() => { mutate((d) => { if (d.theme !== 'guide' && d.styleGuide) applyTheme(d, guideStyle(d.styleGuide)); varyGrounds(d); }); showToast('A loud cover, working slides, quiet statements and a quiet close — and never two loud slides in a row.'); }}>
        <Shuffle size={13} />Vary the grounds across the deck
      </button>

      <div className="lp-label">Roles</div>
      {ROLES.map((r) => (
        <Row key={r.key} label={r.label} info={r.info}>
          <span className="guide-chip" style={{ background: guide.theme[r.key] }} />
          <Select value={guide.theme[r.key]} options={colourOptions(guide.theme[r.key])} onChange={(v) => editGuide((g) => { (g.theme as unknown as Record<string, string>)[r.key] = v; })} />
        </Row>
      ))}
      <Row label="Heading type"><Select value={guide.theme.display} options={fonts} onChange={(v) => editGuide((g) => { g.theme.display = v; })} /></Row>
      <Row label="Heading weight"><Select value={guide.theme.displayWeight} options={['400', '500', '600', '700', '800'].map((w) => ({ value: w, label: w }))} onChange={(v) => editGuide((g) => { g.theme.displayWeight = v; })} /></Row>
      <Row label="Hero type" info="For a cover's title and other big moments. Name a text box “Hero” to set it in this."><Select value={guide.theme.hero ?? guide.theme.display} options={fonts} onChange={(v) => editGuide((g) => { g.theme.hero = v; })} /></Row>
      <Row label="Body type"><Select value={guide.theme.body} options={fonts} onChange={(v) => editGuide((g) => { g.theme.body = v; })} /></Row>
      <button className="btn-soft" onClick={() => fontRef.current?.click()}><Type size={13} />Add a font file (.woff2, .ttf, .otf)</button>
      <input ref={fontRef} type="file" accept=".woff2,.woff,.ttf,.otf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addFont(f); e.target.value = ''; }} />

      <div className="lp-label guide-label-row">
        <span>Colours · click to colour the selection</span>
        <button className="guide-link" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button>
      </div>
      {!editing ? (
        <div className="guide-palette">
          {shown.map((p, i) => <button key={p.name + i} className="guide-swatch" title={`${p.name} · ${p.value}`} style={{ background: p.value }} onClick={() => paint(p.value)} />)}
        </div>
      ) : (
        <div className="guide-edit">
          {shown.map((p, i) => (
            <div key={i} className="guide-edit-row">
              <ColorField value={p.value} onChange={(v, m) => recolour(i, v, m)} />
              <input className="text-input" value={p.name} onChange={(e) => editGuide((g) => { const sw = g.swatches.filter((s) => !s.set || s.set === g.set)[i]; if (sw) sw.name = e.target.value; }, `name-${i}`)} onKeyDown={(e) => e.stopPropagation()} />
              <button className="tb-btn icon" title="Remove this colour" onClick={() => editGuide((g) => { const sw = g.swatches.filter((s) => !s.set || s.set === g.set)[i]; g.swatches = g.swatches.filter((s) => s !== sw); })}><X size={13} /></button>
            </div>
          ))}
          <button className="btn-soft" onClick={() => editGuide((g) => { g.swatches.push({ name: `colour ${g.swatches.length + 1}`, value: '#888888' }); })}><Plus size={13} />Add a colour</button>
        </div>
      )}

      {pairs.length > 0 && (
        <>
          <div className="lp-label">Readable pairs · WCAG contrast</div>
          <div className="guide-pairs">
            {pairs.map((p) => (
              <button key={p.text + p.ground} className="guide-pair" style={{ background: p.ground, color: p.text }} title={`Text ${p.text} on ${p.ground}: ${p.ratio}:1 — ${p.grade === 'Large' ? 'large text and graphics only' : p.grade}. Click to set the selected text in it.`} onClick={() => paint(p.text)}>
                Aa<small>{p.ratio}:1 {p.grade}</small>
              </button>
            ))}
          </div>
        </>
      )}

      {classic.length > 0 && (
        <>
          <div className="lp-label">Classic combinations with your colours · Wada, 1933</div>
          {classic.map((c) => (
            <div key={c.id} className="guide-combo" title={c.colours.map((x) => x.name).join(' · ')}>
              {c.colours.map((x) => <i key={x.hex} style={{ background: x.hex }} className={x.near ? 'mine' : ''} />)}
              <button className="tb-btn icon" title="Add these colours to the palette" onClick={() => editGuide((g) => {
                for (const x of c.colours) if (!x.near && !g.swatches.some((s) => s.value === x.hex)) g.swatches.push({ name: x.name.toLowerCase(), value: x.hex });
              })}><Plus size={13} /></button>
            </div>
          ))}
        </>
      )}

      <div className="lp-label">Marks · logos and badges, click to place</div>
      {guide.marks.length > 0 && (
        <div className="img-grid">
          {guide.marks.map((m, i) => (
            <button key={m.name + i} className="img-card reuse guide-mark" title={`${m.name} — click to place it on this slide`} onClick={() => place(m.src, m.name)}>
              <div className="img-thumb"><img src={m.src} alt={m.name} draggable={false} /></div>
            </button>
          ))}
        </div>
      )}
      <button className="btn-soft" onClick={() => markRef.current?.click()}><ImagePlus size={13} />Add a logo or badge</button>
      <input ref={markRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addMark(f); e.target.value = ''; }} />
    </div>
  );
}
