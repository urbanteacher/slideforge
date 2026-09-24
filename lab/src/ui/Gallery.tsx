import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { renderStill } from '../export/exporters';
import { TEMPLATES, cloneSlide, rosetteSvg } from '../model/defaults';
import { getImage } from '../engine/raster';
import { useStore } from '../model/store';

export function Gallery() {
  const deck = useStore((s) => s.deck);
  const { set, addSlide, showToast } = useStore.getState();
  const slides = useMemo(() => TEMPLATES.map((t) => ({ t, slide: t.make() })), []);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let i = 0, raf = 0, tries = 0;
    const step = () => {
      const e = slides[i];
      if (!e) return;
      // wait (briefly) for the shared artwork to decode so thumbnails never show placeholders
      if (getImage(rosetteSvg()) || ++tries > 60) {
        const url = renderStill(e.slide, deck, 640, 'image/jpeg', 2.5);
        setThumbs((m) => ({ ...m, [e.t.id]: url }));
        i++;
        tries = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const close = (ev: KeyboardEvent) => { if (ev.key === 'Escape') set({ galleryOpen: false }); };
    addEventListener('keydown', close);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', close); };
  }, []);

  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) set({ galleryOpen: false }); }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2>Gallery</h2><p>Art-directed starting points. Click to insert after the current slide — every layer stays editable.</p></div>
          <button className="tb-btn icon" onClick={() => set({ galleryOpen: false })}><X size={16} /></button>
        </div>
        <div className="gallery">
          {slides.map(({ t, slide }) => (
            <button key={t.id} className="g-card" onClick={() => { addSlide(cloneSlide(slide)); set({ galleryOpen: false }); showToast(`Inserted “${t.name}”`); }}>
              <div className="g-thumb">{thumbs[t.id] && <img src={thumbs[t.id]} alt="" />}</div>
              <div className="g-name">{t.name}<span>{slide.layers.length} layers</span></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
