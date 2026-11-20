import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { renderStill } from '../../export';
import { TEMPLATES, cloneSlide, rosetteSvg, type Slide } from '../../core';
import { DEFAULT_THEME, LAYOUTS, LAYOUT_GROUPS, LAYOUT_STYLES, layoutFor, themeOf } from '../../layouts';
import { changeLayout } from './changeLayout';
import { getImage } from '../../engine';
import { useStore } from '../../store';

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
  const mode = useStore((s) => s.galleryMode);
  const themeId = useStore((s) => s.deck.theme);
  const guide = useStore((s) => s.deck.styleGuide);
  // The deck's own theme first, so a slide added or changed here matches the slides around it.
  const deckStyle = useMemo(() => themeOf({ theme: themeId, styleGuide: guide }) ?? DEFAULT_THEME, [themeId, guide]);
  const [styleId, setStyleId] = useState<string | null>(null);
  const st = (mode === 'insert' && styleId && LAYOUT_STYLES.find((s) => s.id === styleId)) || deckStyle;
  const entries = useMemo(() => LAYOUTS.map((l) => ({ id: l.id, layout: l, slide: l.make(st) })), [st]);
  const thumbs = useThumbs(entries);
  const pick = (layout: (typeof LAYOUTS)[number]) => {
    if (mode === 'change') { changeLayout(layout); return; }
    addSlide(layoutFor(layout, st, useStore.getState().deck));
    set({ galleryOpen: false });
    showToast(`Inserted “${layout.name}”`);
  };
  return (
    <>
      {mode === 'insert' && (
        <div className="g-styles">
          <span>Style</span>
          {LAYOUT_STYLES.map((s) => (
            <button key={s.id} className={`g-style${s.id === st.id ? ' on' : ''}`} onClick={() => setStyleId(s.id)} title={`${s.display} and ${s.body}`}>
              <i style={{ background: s.ground, borderColor: s.accent }}><b style={{ background: s.accent }} /></i>{s.name}
            </button>
          ))}
        </div>
      )}
      {LAYOUT_GROUPS.map((g, gi) => (
        <section key={g}>
          <h3 className="g-group">{g}</h3>
          <div className="gallery">
            {mode === 'insert' && gi === 0 && (
              <button className="g-card" title="An empty slide in the deck's theme" onClick={() => { addSlide(); set({ galleryOpen: false }); showToast('Inserted a blank slide'); }}>
                <div className="g-thumb g-blank" />
                <div className="g-name">Blank slide</div>
                <div className="g-blurb">An empty slide in the deck’s theme. Add text, pictures and more from Add.</div>
              </button>
            )}
            {entries.filter((e) => e.layout.group === g).map(({ id, layout }) => (
              <button key={id} className="g-card" title={layout.blurb} onClick={() => pick(layout)}>
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
  const mode = useStore((s) => s.galleryMode);
  const { set: setStore } = useStore.getState();
  // Closing always returns the Gallery to adding slides, so Change layout never sticks.
  const set = (p: Parameters<typeof setStore>[0]) => setStore(p.galleryOpen === false ? { ...p, galleryMode: 'insert' } : p);
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
            <h2>{mode === 'change' ? 'Change this slide’s layout' : 'Gallery'}</h2>
            <p>{mode === 'change'
              ? 'Pick a layout. The slide keeps its title, words and pictures; anything with no place on the new layout goes to the speaker notes. Undo puts the old layout back.'
              : tab === 'layouts'
              ? 'SlideForge’s layouts, on its twelve-column grid. Text shrinks to fit its place, so the slide stays on the page. Click to insert after the current slide.'
              : 'Art-directed starting points. Click to insert after the current slide — every layer stays editable.'}</p>
          </div>
          {mode === 'insert' && <div className="g-tabs">
            <button className={tab === 'layouts' ? 'on' : ''} onClick={() => set({ galleryTab: 'layouts' })}>Layouts</button>
            <button className={tab === 'designs' ? 'on' : ''} onClick={() => set({ galleryTab: 'designs' })}>Designed slides</button>
          </div>}
          <button className="tb-btn icon" onClick={() => set({ galleryOpen: false })}><X size={16} /></button>
        </div>
        {tab === 'layouts' || mode === 'change' ? <Layouts /> : <Designs />}
      </div>
    </div>
  );
}
