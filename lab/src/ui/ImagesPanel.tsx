import { Crop, ImagePlus, Maximize2, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { createLayer } from '../model/defaults';
import { slideOf, useStore } from '../model/store';
import type { Layer } from '../model/types';
import { addImageFile } from './insert';
import { fileToDataUrl } from './Inspector';

// Pictures, in one place: add them, see this slide's, replace or remove one, choose fill or fit,
// and reuse one already in the deck. The picture itself is still moved and sized on the canvas,
// and a caption or credit is text written on the slide.

export function ImagesPanel() {
  const slide = useStore(slideOf);
  const deck = useStore((s) => s.deck);
  const selectedId = useStore((s) => s.selectedId);
  const { selectLayer, updateLayer, deleteLayer, insertLayer, showToast } = useStore.getState();
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const here = slide.layers.filter((l) => l.kind === 'image' && l.box).reverse();
  const used = new Set(here.map((l) => String(l.params.src)));
  // Each picture once, from the other slides, newest first.
  const elsewhere: { src: string; from: string }[] = [];
  const seen = new Set<string>();
  for (const s of [...deck.slides].reverse()) {
    if (s.id === slide.id) continue;
    for (const l of s.layers) {
      const src = String(l.params.src ?? '');
      if (l.kind !== 'image' || !src || seen.has(src) || used.has(src)) continue;
      seen.add(src);
      elsewhere.push({ src, from: s.name });
    }
  }

  const add = async (files: FileList | File[]) => {
    for (const f of [...files].filter((x) => x.type.startsWith('image/'))) await addImageFile(f);
  };
  const reuse = (src: string) => {
    insertLayer(createLayer('image', { name: 'Image', params: { src, fit: 'contain' }, box: { x: 610, y: 190, w: 700, h: 700 }, anim: { type: 'fade' } }));
    showToast('Placed on this slide. Move and size it on the canvas.');
  };
  const card = (l: Layer) => {
    const src = String(l.params.src ?? '');
    const cover = l.params.fit === 'cover';
    return (
      <div key={l.id} className={`img-card${l.id === selectedId ? ' sel' : ''}`} onClick={() => selectLayer(l.id)}>
        <div className="img-thumb">{src ? <img src={src} alt="" draggable={false} /> : <span>Empty — drop a picture on it</span>}</div>
        <div className="img-acts" onClick={(e) => e.stopPropagation()}>
          <button title="Replace this picture" onClick={() => { setReplacing(l.id); replaceRef.current?.click(); }}><RefreshCw size={13} /></button>
          <button title={cover ? 'Fill the frame (crop) — click to fit the whole picture' : 'Fit the whole picture — click to fill the frame'} onClick={() => updateLayer(l.id, (x) => { x.params.fit = cover ? 'contain' : 'cover'; })}>{cover ? <Crop size={13} /> : <Maximize2 size={13} />}</button>
          <button title="Remove from this slide" onClick={() => deleteLayer(l.id)}><Trash2 size={13} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className={`panel-scroll images-panel${over ? ' drop' : ''}`}
      onDragOver={(e) => { if ([...e.dataTransfer.items].some((i) => i.type.startsWith('image/'))) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
      <button className="piece img-add" onClick={() => addRef.current?.click()}><ImagePlus size={14} /><span>Add a picture</span><small>or drop one here</small></button>
      <div className="lp-label">On this slide</div>
      {here.length ? <div className="img-grid">{here.map(card)}</div> : <div className="hint">No pictures on this slide yet.</div>}
      {elsewhere.length > 0 && (
        <>
          <div className="lp-label">In this deck</div>
          <div className="img-grid">
            {elsewhere.map((x) => (
              <button key={x.src.slice(-64)} className="img-card reuse" title={`From “${x.from}”. Click to place it on this slide.`} onClick={() => reuse(x.src)}>
                <div className="img-thumb"><img src={x.src} alt="" draggable={false} /></div>
              </button>
            ))}
          </div>
        </>
      )}
      <input ref={addRef} type="file" accept="image/*" multiple hidden onChange={async (e) => { if (e.target.files) await add(e.target.files); e.target.value = ''; }} />
      <input ref={replaceRef} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f || !replacing) return;
        const src = await fileToDataUrl(f);
        updateLayer(replacing, (l) => { l.params.src = src; });
        setReplacing(null);
      }} />
    </div>
  );
}
