import { useEffect } from 'react';
import { cloneLayer } from '../model/defaults';
import { layerOf, refitAllText, slideOf, useStore } from '../model/store';
import type { Deck } from '../model/types';
import { idbGet, idbSet } from '../persist/idb';
import { Filmstrip } from './Filmstrip';
import { Gallery } from './Gallery';
import { Inspector } from './Inspector';
import { LeftPanel } from './LeftPanel';
import { Present } from './Present';
import { Stage } from './Stage';
import { TopBar } from './TopBar';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

export function App() {
  const presenting = useStore((s) => s.presenting);
  const galleryOpen = useStore((s) => s.galleryOpen);
  const toast = useStore((s) => s.toast);

  // Restore the last deck, then autosave on every change.
  useEffect(() => {
    let timer = 0;
    let ready = false;
    idbGet<{ deck: Deck; slideId?: string }>('current').then((saved) => {
      if (saved?.deck?.slides?.length) {
        useStore.getState().loadDeck(saved.deck);
        if (saved.slideId && saved.deck.slides.some((s) => s.id === saved.slideId)) useStore.setState({ slideId: saved.slideId });
        useStore.setState({ saveState: 'saved' });
      }
      ready = true;
    }).catch(() => { ready = true; });
    const unsub = useStore.subscribe((s, prev) => {
      if (!ready || (s.deck === prev.deck && s.slideId === prev.slideId)) return;
      clearTimeout(timer);
      if (s.deck !== prev.deck) useStore.setState({ saveState: 'saving' });
      timer = window.setTimeout(() => {
        const st = useStore.getState();
        idbSet('current', { deck: st.deck, slideId: st.slideId })
          .then(() => useStore.setState({ saveState: 'saved' }))
          .catch(() => useStore.getState().showToast('Autosave failed — export a .json to be safe'));
      }, 600);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  // Re-measure text boxes as web fonts arrive.
  useEffect(() => {
    const f = () => refitAllText();
    document.fonts?.ready.then(f);
    document.fonts?.addEventListener('loadingdone', f);
    return () => document.fonts?.removeEventListener('loadingdone', f);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const st = useStore.getState();
      if (st.presenting || isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const sel = layerOf(st);
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); st.redo(); return; }
      if (mod && e.key === 'Enter') { e.preventDefault(); st.set({ presenting: true }); return; }
      if (mod && k === 'd' && sel) { e.preventDefault(); st.duplicateLayer(sel.id); return; }
      if (mod && k === 'c' && sel) { st.set({ clipboard: structuredClone(sel) }); return; }
      if (mod && k === 'v' && st.clipboard && !e.shiftKey) {
        // image pastes are handled by the paste event; only paste layers when the clipboard holds one
        const c = cloneLayer(st.clipboard);
        if (c.box) { c.box.x += 24; c.box.y += 24; }
        st.insertLayer(c);
        st.set({ clipboard: structuredClone(c) });
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); st.deleteLayer(sel.id); return; }
      if (e.key === 'Escape') { st.set({ selectedId: null, editingTextId: null, galleryOpen: false }); return; }
      if (e.key === 'Enter' && sel?.kind === 'text') { e.preventDefault(); st.set({ editingTextId: sel.id }); return; }
      if (e.key.startsWith('Arrow') && sel?.box && !sel.locked) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        st.updateLayer(sel.id, (l) => { l.box!.x += dx; l.box!.y += dy; }, `nudge:${sel.id}`);
        return;
      }
      if (!sel && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'PageUp')) {
        const slides = st.deck.slides;
        const i = slides.findIndex((s) => s.id === slideOf(st).id);
        const j = e.key === 'ArrowRight' || e.key === 'PageDown' ? i + 1 : i - 1;
        if (slides[j]) st.selectSlide(slides[j].id);
        return;
      }
      if (!mod && k === 't') { st.addLayer('text'); return; }
      if (!mod && k === 'a') { st.set({ leftTab: st.leftTab === 'add' ? 'layers' : 'add' }); return; }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || useStore.getState().presenting) return;
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); (window as unknown as { __sfAddImage?: (f: File) => void }).__sfAddImage?.(f); }
    };
    addEventListener('keydown', on);
    addEventListener('paste', onPaste);
    return () => { removeEventListener('keydown', on); removeEventListener('paste', onPaste); };
  }, []);

  return (
    <div className="app">
      <TopBar />
      <LeftPanel />
      <main className="center">
        <Stage />
        <Filmstrip />
      </main>
      <Inspector />
      {presenting && <Present />}
      {galleryOpen && <Gallery />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
