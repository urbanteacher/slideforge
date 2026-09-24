import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { renderStill } from '../export/exporters';
import { TEMPLATES, cloneSlide, rosetteSvg } from '../model/defaults';
import { LAYOUTS, LAYOUT_GROUPS, LAYOUT_STYLES, layoutFor } from '../model/layouts';
import { getImage } from '../engine/raster';
import { useStore } from '../model/store';
import type { Slide } from '../model/types';

/** Renders thumbnails one per frame so the dialog opens at once and fills in. */
export function useThumbs(entries: { id: string; slide: Slide }[], ready: () => boolean = () => true) {
  const deck = useStore((s) => s.deck);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    setThumbs({});
    let i = 0, raf = 0, tries = 0;
    const step = () => {
      const e = entries[i];
      if (!e) return;
      // wait (briefly) for shared artwork to decode so thumbnails never show placeholders
      if (ready() || ++tries > 60) {
        const url = renderStill(e.slide, deck, 640, 'image/jpeg', 2.5);
        setThumbs((m) => ({ ...m, [e.id]: url }));
        i++;
        tries = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [entries]);
  return thumbs;
}

function Layouts() {
  const { set, addSlide, showToast } = useStore.getState();
  const [styleId, setStyleId] = useState(LAYOUT_STYLES[0].id);
  const st = LAYOUT_STYLES.find((s) => s.id === styleId)!;
  const entries = useMemo(() => LAYOUTS.map((l) => ({ id: l.id, layout: l, slide: l.make(st) })), [st]);
  const thumbs = useThumbs(entries);
  return (
    <>
      <div className="g-styles">
        <span>Style</span>
        {LAYOUT_STYLES.map((s) => (
          <button key={s.id} className={`g-style${s.id === styleId ? ' on' : ''}`} onClick={() => setStyleId(s.id)} title={`${s.display} and ${s.body}`}>
            <i style={{ background: s.ground, borderColor: s.accent }}><b style={{ background: s.accent }} /></i>{s.name}
          </button>
        ))}
      </div>
      {LAYOUT_GROUPS.map((g) => (
        <section key={g}>
          <h3 className="g-group">{g}</h3>
          <div className="gallery">
            {entries.filter((e) => e.layout.group === g).map(({ id, layout }) => (
              <button key={id} className="g-card" title={layout.blurb} onClick={() => { addSlide(layoutFor(layout, st, useStore.getState().deck)); set({ galleryOpen: false }); showToast(`Inserted “${layout.name}”`); }}>
                <div className="g-thumb">{thumbs[id] && <img src={thumbs[id]} alt="" />}</div>
                <div className="g-name">{layout.name}</div>
                <div className="g-blurb">{layout.blurb}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Designs() {
  const { set, addSlide, showToast } = useStore.getState();
  const entries = useMemo(() => TEMPLATES.map((t) => ({ id: t.id, t, slide: t.make() })), []);
  const thumbs = useThumbs(entries, () => !!getImage(rosetteSvg()));
  return (
    <div className="gallery">
      {entries.map(({ id, t, slide }) => (
        <button key={id} className="g-card" onClick={() => { addSlide(cloneSlide(slide)); set({ galleryOpen: false }); showToast(`Inserted “${t.name}”`); }}>
          <div className="g-thumb">{thumbs[id] && <img src={thumbs[id]} alt="" />}</div>
          <div className="g-name">{t.name}<span>{slide.layers.length} layers</span></div>
        </button>
      ))}
    </div>
  );
}

export function Gallery() {
  const tab = useStore((s) => s.galleryTab);
  const { set } = useStore.getState();
  useEffect(() => {
    const close = (ev: KeyboardEvent) => { if (ev.key === 'Escape') set({ galleryOpen: false }); };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, []);

  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) set({ galleryOpen: false }); }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Gallery</h2>
            <p>{tab === 'layouts'
              ? 'SlideForge’s layouts, on its twelve-column grid. Text shrinks to fit its place, so the slide stays on the page. Click to insert after the current slide.'
              : 'Art-directed starting points. Click to insert after the current slide — every layer stays editable.'}</p>
          </div>
          <div className="g-tabs">
            <button className={tab === 'layouts' ? 'on' : ''} onClick={() => set({ galleryTab: 'layouts' })}>Layouts</button>
            <button className={tab === 'designs' ? 'on' : ''} onClick={() => set({ galleryTab: 'designs' })}>Designed slides</button>
          </div>
          <button className="tb-btn icon" onClick={() => set({ galleryOpen: false })}><X size={16} /></button>
        </div>
        {tab === 'layouts' ? <Layouts /> : <Designs />}
      </div>
    </div>
  );
}
