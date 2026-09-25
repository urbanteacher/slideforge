import { ClipboardPaste, Copy, CopyPlus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cloneSlide } from '../model/defaults';
import { useStore } from '../model/store';
import type { Slide } from '../model/types';

// SlideForge's "⋯ Slide" actions: copy, paste, duplicate, hide or delete a slide. The same menu is
// on the toolbar, on a right-click in the filmstrip and on a right-click on the slide's ground.
// A hidden slide stays in the editor, dimmed; Preview and the HTML export skip it.

let copied: Slide | null = null;

export const slideClipboard = {
  has: () => !!copied,
  copy(id: string) {
    const s = useStore.getState().deck.slides.find((x) => x.id === id);
    if (!s) return;
    copied = structuredClone(s);
    // The last thing copied is what pastes: a slide copied now wins over a layer copied earlier.
    useStore.getState().set({ clipboard: null });
    useStore.getState().showToast('Slide copied. Paste puts it after the slide you are on.');
  },
  paste() {
    if (!copied) { useStore.getState().showToast('Copy a slide first — Copy, ⌘C, or right-click a slide.'); return; }
    const c = cloneSlide(copied);
    useStore.getState().addSlide(c);
  },
};

export function toggleHidden(id: string) {
  const st = useStore.getState();
  const s = st.deck.slides.find((x) => x.id === id);
  if (!s) return;
  const hide = !s.hidden;
  if (hide && st.deck.slides.filter((x) => !x.hidden).length <= 1) { st.showToast('At least one slide has to stay in the show.'); return; }
  st.mutate((d) => { const t = d.slides.find((x) => x.id === id); if (t) t.hidden = hide || undefined; });
  st.showToast(hide ? 'Hidden from the show. It stays here, and Preview and the exported deck skip it.' : 'Back in the show.');
}

function items(id: string, close: () => void): ReactNode {
  const st = useStore.getState();
  const s = st.deck.slides.find((x) => x.id === id);
  if (!s) return null;
  const run = (f: () => void) => () => { f(); close(); };
  return (
    <>
      <button onClick={run(() => slideClipboard.copy(id))}><Copy size={15} />Copy slide<small>⌘C</small></button>
      <button disabled={!slideClipboard.has()} onClick={run(() => { useStore.getState().selectSlide(id); slideClipboard.paste(); })}><ClipboardPaste size={15} />Paste slide after<small>⌘V</small></button>
      <button onClick={run(() => st.duplicateSlide(id))}><CopyPlus size={15} />Duplicate slide</button>
      <button onClick={run(() => toggleHidden(id))}>{s.hidden ? <Eye size={15} /> : <EyeOff size={15} />}{s.hidden ? 'Show in the presentation' : 'Hide from the presentation'}</button>
      <hr />
      <button className="danger" disabled={st.deck.slides.length <= 1} onClick={run(() => st.deleteSlide(id))}><Trash2 size={15} />Delete slide</button>
    </>
  );
}

/** A right-click menu at the pointer, for a filmstrip thumbnail or the slide itself. */
export function useSlideContextMenu(): [ReactNode, (e: React.MouseEvent, id: string) => void] {
  const [at, setAt] = useState<{ x: number; y: number; id: string } | null>(null);
  useEffect(() => {
    if (!at) return;
    const off = (e: Event) => { if (!(e.target as HTMLElement).closest?.('.context-menu')) setAt(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAt(null); };
    addEventListener('pointerdown', off);
    addEventListener('keydown', esc);
    return () => { removeEventListener('pointerdown', off); removeEventListener('keydown', esc); };
  }, [at]);
  const node = at && (
    <div className="menu context-menu" role="menu" style={{ position: 'fixed', left: Math.min(at.x, innerWidth - 240), top: Math.min(at.y, innerHeight - 230) }}>
      {items(at.id, () => setAt(null))}
    </div>
  );
  return [node, (e, id) => { e.preventDefault(); setAt({ x: e.clientX, y: e.clientY, id }); }];
}
