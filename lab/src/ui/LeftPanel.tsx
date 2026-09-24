import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, LayoutGrid, ListOrdered, Lock, Rows2, SquareSplitHorizontal, Trash2, Unlock } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LAYOUTS, LAYOUT_STYLES, guideStyle, layoutFor, themeOf } from '../model/layouts';
import { useThumbs } from './Gallery';
import { addTextImage } from './insert';
import { DeckSettings } from './DeckSettings';
import { insertBlock } from './SlideBlocks';
import { ImagesPanel } from './ImagesPanel';
import { StyleGuidePanel } from './StyleGuidePanel';
import { SlideDesignsPanel } from './SlideDesigns';
import { HeaderFooterSection } from './HeaderFooter';
import { applyTheme } from '../model/theme';
import { CATEGORIES, kind, kindsIn, type Category } from '../engine/registry';
import { layerOf, slideOf, useStore } from '../model/store';
import { Tip } from './controls';
import { CAT_ICON, KindIcon } from './icons';
import { useKindThumbs } from './thumbs';

export function LeftPanel() {
  return <aside className="left"><Sections /></aside>;
}

/** Which sections are open, kept between visits. */
function useFolds() {
  const read = () => { try { return { layers: true, layouts: true, designs: false, headerFooter: false, images: false, effects: false, guide: false, ...JSON.parse(localStorage.getItem('sf-left-folds') ?? '{}') }; } catch { return { layers: true, layouts: true, designs: false, headerFooter: false, images: false, effects: false, guide: false }; } };
  const [open, setOpen] = useState<{ layers: boolean; layouts: boolean; designs: boolean; headerFooter: boolean; images: boolean; effects: boolean; guide: boolean }>(read);
  useEffect(() => { localStorage.setItem('sf-left-folds', JSON.stringify(open)); }, [open]);
  return [open, (k: 'layers' | 'layouts' | 'designs' | 'headerFooter' | 'images' | 'effects' | 'guide', to?: boolean) => setOpen((o) => ({ ...o, [k]: to ?? !o[k] }))] as const;
}

function Fold({ title, open, onToggle, right, children, className }: { title: string; open: boolean; onToggle: () => void; right?: ReactNode; children: ReactNode; className: string }) {
  return (
    <section className={`fold ${className}${open ? ' open' : ''}`}>
      <div className="panel-head fold-head">
        <button className="fold-toggle" onClick={onToggle} aria-expanded={open}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span>{title}</span></button>
        {right}
      </div>
      {open && children}
    </section>
  );
}

/** The left panel: the slide's layers above, and the layouts and slide furniture below — each folds. */
function Sections() {
  const [open, toggle] = useFolds();
  const leftTab = useStore((s) => s.leftTab);
  const set = useStore((s) => s.set);
  // The toolbar's Backgrounds & effects button and the A key ask for the effects section: open it,
  // bring it into view, and clear the request so the next press asks again.
  useEffect(() => {
    if (leftTab !== 'add') return;
    toggle('effects', true);
    set({ leftTab: 'layers' });
    requestAnimationFrame(() => document.querySelector('.fold-effects')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [leftTab]);
  return (
    <>
      <Fold title="Layers" className="fold-layers" open={open.layers} onToggle={() => toggle('layers')}>
        <LayersPanel />
      </Fold>
      <Fold title="Layouts" className="fold-layouts" open={open.layouts} onToggle={() => toggle('layouts')}>
        <LayoutsPanel />
      </Fold>
      <Fold title="Slide designs" className="fold-designs" open={open.designs} onToggle={() => toggle('designs')}>
        <SlideDesignsPanel />
      </Fold>
      <Fold title="Colours & grounds" className="fold-guide" open={open.guide} onToggle={() => toggle('guide')}>
        <StyleGuidePanel />
      </Fold>
      <Fold title="Header & footer" className="fold-hf" open={open.headerFooter} onToggle={() => toggle('headerFooter')}>
        <HeaderFooterSection bare />
      </Fold>
      <Fold title="Backgrounds & effects" className="fold-effects" open={open.effects} onToggle={() => toggle('effects')}>
        <EffectsPanel />
      </Fold>
      <Fold title="Images" className="fold-images" open={open.images} onToggle={() => toggle('images')}>
        <ImagesPanel />
      </Fold>
    </>
  );
}

/** New slides from a layout, and the pieces that arrange this slide. The theme is the deck's: one
 *  choice restyles every slide, and every new slide arrives in it. */
function LayoutsPanel() {
  const { addSlide, showToast, mutate } = useStore.getState();
  const themeId = useStore((s) => s.deck.theme);
  const guide = useStore((s) => s.deck.styleGuide);
  const st = themeOf({ theme: themeId, styleGuide: guide }) ?? LAYOUT_STYLES[0];
  const entries = useMemo(() => LAYOUTS.map((l) => ({ id: l.id, layout: l, slide: l.make(st) })), [st]);
  const thumbs = useThumbs(entries);
  const piece = (icon: ReactNode, label: string, run: () => void, hint?: string) => (
    <button className="piece" onClick={run} title={hint}>{icon}<span>{label}</span></button>
  );
  return (
    <div className="panel-scroll layouts-panel">
      <div className="lp-label">On this slide</div>
      <div className="pieces">
        {piece(<SquareSplitHorizontal size={14} />, 'Text + image', addTextImage, 'Text on the left, a picture on the right')}
        {piece(<LayoutGrid size={14} />, 'Cards', () => insertBlock('cards'), 'Three cards across the slide. Press + on one to add another.')}
        {piece(<Rows2 size={14} />, 'Choice boxes', () => insertBlock('choices'), 'An A–D grid of choices')}
        {piece(<ListOrdered size={14} />, 'Numbered points', () => insertBlock('numbered'), 'Three aligned numbered rows. Press + on one to add another.')}
      </div>
      <div className="lp-label">Slide shape · every slide</div>
      <DeckSettings />
      <div className="lp-label">Theme · every slide</div>
      <div className="g-styles lp-styles">
        {LAYOUT_STYLES.map((s) => (
          <button key={s.id} className={`g-style${s.id === st.id && themeId ? ' on' : ''}`} title={`${s.name}: ${s.display} and ${s.body}. Restyles every slide.`}
            onClick={() => { mutate((d) => applyTheme(d, s)); showToast(`Every slide is now ${s.name}. Undo puts the old look back.`); }}>
            <i style={{ background: s.ground, borderColor: s.accent }}><b style={{ background: s.accent }} /></i>
          </button>
        ))}
        {guide && (() => {
          const g = guideStyle(guide);
          return (
            <button className={`g-style${themeId === 'guide' ? ' on' : ''}`} title={`${guide.name}: your style guide, ${g.display} and ${g.body}. Restyles every slide.`}
              onClick={() => { mutate((d) => d.styleGuide && applyTheme(d, guideStyle(d.styleGuide))); showToast(`Every slide is now in ${guide.name}. Undo puts the old look back.`); }}>
              <i style={{ background: g.ground, borderColor: g.accent }}><b style={{ background: g.accent }} /></i>
            </button>
          );
        })()}
      </div>
      <div className="lp-label">New slide</div>
      <div className="lp-grid">
        {entries.map(({ id, layout }) => (
          <button key={id} className="lp-card" title={layout.blurb} onClick={() => { addSlide(layoutFor(layout, st, useStore.getState().deck)); showToast(`Inserted “${layout.name}”`); }}>
            <div className="lp-thumb">{thumbs[id] && <img src={thumbs[id]} alt="" />}</div>
            <span>{layout.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LayersPanel() {
  const slide = useStore(slideOf);
  const selectedId = useStore((s) => s.selectedId);
  const { selectLayer, updateLayer, moveLayer, deleteLayer, duplicateLayer } = useStore.getState();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; over: string | null; pos: 'above' | 'below' } | null>(null);
  const rows = [...slide.layers].reverse();

  return (
    <>
      <div className="panel-scroll">
        <div className="layer-list">
          {rows.map((l) => {
            const k = kind(l.kind);
            const cls = ['layer-row', l.id === selectedId && 'sel', !l.visible && 'hidden', drag?.over === l.id && `drop-${drag.pos}`].filter(Boolean).join(' ');
            return (
              <div
                key={l.id}
                className={cls}
                draggable={renaming !== l.id}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDrag({ id: l.id, over: null, pos: 'above' }); }}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  setDrag({ ...drag, over: l.id, pos: e.clientY < r.top + r.height / 2 ? 'above' : 'below' });
                }}
                onDragEnd={() => setDrag(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!drag || drag.id === l.id) return setDrag(null);
                  const arr = slide.layers.filter((x) => x.id !== drag.id);
                  const idx = arr.findIndex((x) => x.id === l.id);
                  // rows are shown top→bottom (reversed), so "above" means a higher array index
                  moveLayer(drag.id, drag.pos === 'above' ? idx + 1 : idx);
                  setDrag(null);
                }}
                onPointerDown={(e) => { if (e.button === 0 && !(e.target as HTMLElement).closest('.layer-acts, input')) selectLayer(l.id); }}
                onDoubleClick={() => setRenaming(l.id)}
              >
                <div className={`layer-ico${k.content ? '' : ' fx'}`}>
                  {l.kind === 'image' && l.params.src ? <img src={String(l.params.src)} alt="" /> : l.kind === 'solid' ? <span style={{ width: 14, height: 14, borderRadius: 3, background: String(l.params.color) }} /> : <KindIcon kind={l.kind} />}
                </div>
                <div className="layer-name">
                  {renaming === l.id ? (
                    <input
                      autoFocus
                      defaultValue={l.name}
                      onBlur={(e) => { updateLayer(l.id, (x) => { x.name = e.target.value || x.name; }); setRenaming(null); }}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                    />
                  ) : l.name}
                </div>
                {l.anim.type !== 'none' && <span className="layer-badge" title="Has an entrance animation">{l.anim.trigger === 'onClick' ? 'click' : 'anim'}</span>}
                <div className={`layer-acts${!l.visible || l.locked ? ' pinned' : ''}`} onClick={(e) => e.stopPropagation()}>
                  {k.content && (
                    <button title={l.locked ? 'Unlock' : 'Lock'} onClick={() => updateLayer(l.id, (x) => { x.locked = !x.locked; })}>
                      {l.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                  )}
                  <button title={l.visible ? 'Hide' : 'Show'} onClick={() => updateLayer(l.id, (x) => { x.visible = !x.visible; })}>
                    {l.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
          {!rows.length && <div className="hint">No layers yet. Use <b>Add</b> for text, pictures and charts, or <b>Backgrounds &amp; effects</b> below for the whole slide.</div>}
        </div>
      </div>
      <div className="left-foot">
        <button className="tb-btn icon" title="Duplicate (⌘D)" disabled={!selectedId} onClick={() => selectedId && duplicateLayer(selectedId)}><Copy size={15} /></button>
        <button className="tb-btn icon" title="Delete (⌫)" disabled={!selectedId} onClick={() => selectedId && deleteLayer(selectedId)}><Trash2 size={15} /></button>
      </div>
    </>
  );
}

/** Backgrounds and effects: layers that work on the whole slide, stacked above what is selected.
 *  Items — text, pictures, charts — are in the Add menu, so Sources is not repeated here. */
function EffectsPanel() {
  const cats = CATEGORIES.filter((c) => c.id !== 'source');
  const [cat, setCat] = useState<Category | 'featured'>('featured');
  const sel = useStore(layerOf);
  const addLayer = useStore((s) => s.addLayer);
  const kinds = kindsIn(cat).filter((k) => !k.content);
  const allIds = useMemo(() => cats.flatMap((c) => kindsIn(c.id).filter((k) => !k.content).map((k) => k.id)), []);
  const thumb = useKindThumbs([...new Set([...kinds.map((k) => k.id), ...allIds])], 0);
  return (
    <div className="panel-scroll effects-panel">
      <div className="fx-note">Whole slide · adds {sel ? <>above <b>{sel.name}</b></> : <>on top of <b>this slide</b></>}</div>
      <div className="fx-cats">
        {cats.map((c) => {
          const I = CAT_ICON[c.id];
          const n = kindsIn(c.id).filter((k) => !k.content).length;
          return (
            <button key={c.id} className={`fx-cat${cat === c.id ? ' sel' : ''}`} onClick={() => setCat(c.id)}>
              <I size={13} strokeWidth={1.8} />{c.label}<span>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="fx-grid">
        {kinds.map((k) => (
          <button key={k.id} className="fx-card" onClick={() => addLayer(k.id)} title={`Add ${k.name}`}>
            <div className="fx-thumb">{thumb(k.id) ? <img src={thumb(k.id)} alt="" draggable={false} /> : null}</div>
            <div className="fx-label">{k.name}<Tip text={k.description} /></div>
          </button>
        ))}
      </div>
    </div>
  );
}
