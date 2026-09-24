import { Hash, RectangleHorizontal } from 'lucide-react';
import { editHeaderFooter } from '../model/headerFooter';
import { ASPECTS, aspectOf, setAspect, type Aspect } from '../model/aspect';
import { useStore } from '../model/store';

// The whole presentation's shape and numbering, in the Layouts panel beside the deck's theme.
// Slide numbers are the footer's right-hand slot, so they are the same thing the Header & footer
// panel shows, not a second system beside it.

export function DeckSettings() {
  const deck = useStore((s) => s.deck);
  const slideId = useStore((s) => s.slideId);
  const { mutate, showToast } = useStore.getState();
  const aspect = aspectOf(deck);
  const cfg = deck.headerFooter;
  const numbers = !!cfg?.enabled && Object.values(cfg.slots).some((it) => it && (it.kind === 'pages' || it.kind === 'number'));
  const setNumbers = (on: boolean) => {
    mutate((d) => editHeaderFooter(d, slideId, 'deck', (c) => {
      const slot = (Object.entries(c.slots).find(([, it]) => it && (it.kind === 'pages' || it.kind === 'number'))?.[0] ?? 'footer-right') as keyof typeof c.slots;
      if (on) { c.enabled = true; c.slots[slot] = { kind: 'pages' }; }
      else {
        c.slots[slot] = { kind: 'empty' };
        if (!Object.values(c.slots).some((it) => it && it.kind !== 'empty')) c.enabled = false;
      }
    }));
    const own = useStore.getState().deck.slides.filter((s) => s.headerFooter).length;
    showToast(on ? `Slide numbers on, bottom right of every slide${own ? ` — ${own} slide${own === 1 ? ' has' : 's have'} its own header and footer and ${own === 1 ? 'keeps it' : 'keep theirs'}` : ''}.` : 'Slide numbers off.');
  };
  return (
    <div className="deck-settings">
      <label className="deck-shape" title={`Slide shape — ${ASPECTS.find((a) => a.value === aspect)?.hint}. Changing it keeps every box in its place and every line break; type follows the narrower side.`}>
        <RectangleHorizontal size={14} />
        <select value={aspect} onChange={(e) => { mutate((d) => setAspect(d, e.target.value as Aspect)); showToast(`Every slide is now ${e.target.value}. Undo puts the old shape back.`); }} onKeyDown={(e) => e.stopPropagation()}>
          {ASPECTS.map((a) => <option key={a.value} value={a.value} title={a.hint}>{a.label}</option>)}
        </select>
      </label>
      <button className={`tb-btn${numbers ? ' active' : ''}`} aria-pressed={numbers} title="Show slide numbers (page / total, bottom right)" onClick={() => setNumbers(!numbers)}><Hash size={14} /><span className="tb-label">Numbers</span></button>
    </div>
  );
}
