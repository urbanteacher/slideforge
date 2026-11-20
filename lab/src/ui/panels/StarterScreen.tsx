import { LayoutTemplate, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Deck } from '../../core';
import { STARTERS, starterDeck } from '../../decks';
import { renderStill } from '../../export';
import { DEFAULT_THEME, LAYOUT_STYLES, applyTheme } from '../../layouts';
import { useStore } from '../../store';

// What a new deck opens on: one blank slide and nothing else used to be the whole first screen. This offers the
// starters (decks/starters.ts) with a picture of each, a theme to start blank in, and the Gallery's layouts. It goes
// as soon as the deck has something on it, or when the teacher closes it.

/** A deck that is still the blank one New makes: a single slide holding only its ground. */
export function isEmptyDeck(d: Deck): boolean {
  if (d.slides.length !== 1) return false;
  const s = d.slides[0];
  return !s.game && !s.activity && !s.nodes && s.layers.every((l) => l.kind === 'solid' || l.kind === 'radial' || l.kind === 'linear');
}

let dismissedFor: string | null = null;

/** The deck takes the starter's slides and theme, keeping its own id (the Library's copy) and, once named, its name. One undo step. */
function applyStarter(id: string) {
  const st = useStore.getState();
  const made = starterDeck(id);
  if (!made) return;
  st.mutate((d) => {
    d.slides = made.slides;
    d.theme = made.theme;
    d.themeCopy = made.themeCopy;
    if (!d.title || d.title === 'Untitled') d.title = made.title;
  });
  st.set({ slideId: made.slides[0].id, selectedId: null });
  st.showToast(`Started from “${made.title}”. Every word and picture is yours to change. Undo goes back to the blank deck.`);
}

export function StarterScreen() {
  const deck = useStore((s) => s.deck);
  const [, redraw] = useState(0);
  const [theme, setTheme] = useState(DEFAULT_THEME.id);
  // A picture of each starter's first slide, drawn once.
  const covers = useMemo(() => Object.fromEntries(STARTERS.map((s) => {
    const d = starterDeck(s.id)!;
    return [s.id, renderStill(d.slides[0], d, 480, 'image/jpeg', 2.5)];
  })), []);
  if (!isEmptyDeck(deck) || dismissedFor === deck.id) return null;
  const close = () => { dismissedFor = deck.id; redraw((n) => n + 1); };
  const blank = () => {
    const st = LAYOUT_STYLES.find((x) => x.id === theme) ?? DEFAULT_THEME;
    useStore.getState().mutate((d) => applyTheme(d, st));
    close();
  };
  const gallery = () => { close(); useStore.setState({ galleryOpen: true, galleryMode: 'insert', galleryTab: 'layouts' }); };
  return (
    <div className="starter-screen" role="dialog" aria-label="Start your presentation">
      <div className="starter-inner">
        <div className="starter-head">
          <div>
            <h2>Start your presentation</h2>
            <p>Pick a starter to fill in, or begin with a blank slide. Everything stays editable, and Undo takes you back here.</p>
          </div>
          <button className="tb-btn icon" title="Close and start on the blank slide" aria-label="Close" onClick={close}><X size={16} /></button>
        </div>
        <h3 className="g-group"><Sparkles size={14} /> Starters</h3>
        <div className="starter-grid">
          {STARTERS.map((s) => (
            <button key={s.id} className="g-card" onClick={() => applyStarter(s.id)}>
              <div className="g-thumb"><img src={covers[s.id]} alt="" /></div>
              <div className="g-name">{s.name}<span>{s.lesson.slides.length} slides</span></div>
              <div className="g-blurb">{s.blurb}</div>
            </button>
          ))}
        </div>
        <h3 className="g-group"><LayoutTemplate size={14} /> Or start blank</h3>
        <div className="starter-blank">
          <div className="g-styles">
            <span>Theme</span>
            {LAYOUT_STYLES.map((s) => (
              <button key={s.id} className={`g-style${s.id === theme ? ' on' : ''}`} onClick={() => setTheme(s.id)} title={`${s.display} and ${s.body}`}>
                <i style={{ background: s.ground, borderColor: s.accent }}><b style={{ background: s.accent }} /></i>{s.name}
              </button>
            ))}
          </div>
          <div className="starter-actions">
            <button className="btn-outline" onClick={blank}>Start with a blank slide</button>
            <button className="btn-outline" onClick={() => { blank(); gallery(); }}>Pick a layout for the first slide…</button>
          </div>
          <p className="starter-note">You can also bring in a lesson file someone wrote, or an AI wrote for you, from File → Import.</p>
        </div>
      </div>
    </div>
  );
}
