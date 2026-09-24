import { Copy, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES, kind, kindsIn, type Category } from '../engine/registry';
import { layerOf, slideOf, useStore } from '../model/store';
import { Tip } from './controls';
import { CAT_ICON, KindIcon } from './icons';
import { useKindThumbs } from './thumbs';

export function LeftPanel() {
  const tab = useStore((s) => s.leftTab);
  return <aside className="left">{tab === 'layers' ? <LayersPanel /> : <AddPanel />}</aside>;
}

function LayersPanel() {
  const slide = useStore(slideOf);
  const selectedId = useStore((s) => s.selectedId);
  const { selectLayer, updateLayer, moveLayer, deleteLayer, duplicateLayer, set } = useStore.getState();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; over: string | null; pos: 'above' | 'below' } | null>(null);
  const rows = [...slide.layers].reverse();

  return (
    <>
      <div className="panel-head">
        <span>Layers</span>
        <button className="tb-btn icon" title="Add layer" onClick={() => set({ leftTab: 'add' })}><Plus size={15} /></button>
      </div>
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
          {!rows.length && <div className="hint">No layers yet. Press <kbd>+</kbd> to add a source or effect.</div>}
        </div>
      </div>
      <div className="left-foot">
        <button className="tb-btn icon" title="Duplicate (⌘D)" disabled={!selectedId} onClick={() => selectedId && duplicateLayer(selectedId)}><Copy size={15} /></button>
        <button className="tb-btn icon" title="Delete (⌫)" disabled={!selectedId} onClick={() => selectedId && deleteLayer(selectedId)}><Trash2 size={15} /></button>
      </div>
    </>
  );
}

function AddPanel() {
  const [cat, setCat] = useState<Category | 'featured'>('featured');
  const sel = useStore(layerOf);
  const addLayer = useStore((s) => s.addLayer);
  const kinds = kindsIn(cat);
  const allIds = useMemo(() => CATEGORIES.flatMap((c) => kindsIn(c.id).map((k) => k.id)), []);
  const thumb = useKindThumbs([...new Set([...kinds.map((k) => k.id), ...allIds])], 0);

  return (
    <>
      <div className="panel-head"><span>{sel ? <>Adds above <b>{sel.name}</b></> : <>Adds to <b>this slide</b></>}</span></div>
      <div className="cat-list">
        {CATEGORIES.map((c) => {
          const I = CAT_ICON[c.id];
          return (
            <button key={c.id} className={`cat${cat === c.id ? ' sel' : ''}`} onClick={() => setCat(c.id)}>
              <I size={15} strokeWidth={1.8} />
              {c.label}
              <span className="count">{kindsIn(c.id).length}</span>
            </button>
          );
        })}
      </div>
      <div className="panel-scroll">
        <div className="fx-grid">
          {kinds.map((k) => (
            <button key={k.id} className="fx-card" onClick={() => addLayer(k.id)} title={`Add ${k.name}`}>
              <div className="fx-thumb">{thumb(k.id) ? <img src={thumb(k.id)} alt="" draggable={false} /> : null}</div>
              <div className="fx-label">{k.name}<Tip text={k.description} /></div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
