import { useEffect, useState } from 'react';
import { cloneLayer } from '../model/defaults';
import { inView, layerOf, refitAllText, slideOf, useStore, type LabView } from '../model/store';
import type { Deck } from '../model/types';
import { idbGet } from '../persist/idb';
import { isLabDeck, saveCurrent } from '../embed';
import { registerGuideFonts } from '../model/guide';
import { CanvasBar } from './CanvasBar';
import { Filmstrip } from './Filmstrip';
import { Gallery } from './Gallery';
import { Inspector } from './Inspector';
import { LeftPanel } from './LeftPanel';
import { Present } from './Present';
import { Stage } from './Stage';
import { TopBar } from './TopBar';
import { toggleFormat } from './format';
import { addMediaFile } from './insert';
import { groupOf } from './snap';
import { moveInOrder } from './order';
import { slideClipboard } from './SlideMenu';
import { BrowsePanel, focusBrowse } from './Browse';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** `embedded`: SlideForge's shell owns the document row (name, File, Save), so the lab shows its tools only. */
export function App({ embedded = false, onReady }: { embedded?: boolean; onReady?: () => void }) {
  const presenting = useStore((s) => s.presenting);
  const galleryOpen = useStore((s) => s.galleryOpen);
  const toast = useStore((s) => s.toast);
  const panelHidden = useStore((s) => s.panelHidden);
  const guide = useStore((s) => s.deck.styleGuide);
  // The deck's own typefaces, from its style guide, for every text box and thumbnail.
  useEffect(() => { registerGuideFonts(guide); }, [guide]);

  // Nothing is drawn until the saved deck is back: the starting demo deck used to flash up on every
  // refresh before the real one replaced it.
  const [restored, setRestored] = useState(false);

  // Restore the last deck, then autosave on every change.
  useEffect(() => {
    let timer = 0;
    let ready = false;
    // The last-open slot, and the deck under its own id so the shell's Open can list it.
    const save = () => saveCurrent();
    idbGet<{ deck: Deck; slideId?: string }>('current').then((saved) => {
      if (isLabDeck(saved?.deck)) {
        useStore.getState().loadDeck(saved.deck);
        if (saved.slideId && saved.deck.slides.some((s) => s.id === saved.slideId)) useStore.setState({ slideId: saved.slideId });
        useStore.setState({ saveState: 'saved' });
      }
      ready = true;
      setRestored(true);
      onReady?.();
    }).catch(() => { ready = true; setRestored(true); onReady?.(); });
    // A refresh within the autosave's half-second would lose the last edit: save as the page goes.
    const flush = () => { if (ready && useStore.getState().saveState !== 'saved') { clearTimeout(timer); save(); } };
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    const unsub = useStore.subscribe((s, prev) => {
      if (!ready || (s.deck === prev.deck && s.slideId === prev.slideId)) return;
      clearTimeout(timer);
      if (s.deck !== prev.deck) useStore.setState({ saveState: 'saving' });
      timer = window.setTimeout(() => {
        save()
          .then(() => useStore.setState({ saveState: 'saved' }))
          .catch(() => useStore.getState().showToast('Autosave failed — export a .json to be safe'));
      }, 600);
    });
    return () => { unsub(); clearTimeout(timer); removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
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
      if (mod && sel && (k === 'b' || k === 'i' || k === 'u')) { e.preventDefault(); toggleFormat(sel, k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline'); return; }
      if (mod && k === 'c' && sel) { st.set({ clipboard: structuredClone(sel) }); return; }
      // With nothing selected, copy and paste act on the slide, as in SlideForge.
      if (mod && k === 'c' && !sel && !window.getSelection()?.toString()) { slideClipboard.copy(st.slideId); return; }
      if (mod && k === 'v' && !st.clipboard && slideClipboard.has() && !e.shiftKey) { e.preventDefault(); slideClipboard.paste(); return; }
      if (mod && k === 'v' && st.clipboard && !e.shiftKey) {
        // image pastes are handled by the paste event; only paste layers when the clipboard holds one
        const c = cloneLayer(st.clipboard);
        if (c.box) { c.box.x += 24; c.box.y += 24; }
        st.insertLayer(c);
        st.set({ clipboard: structuredClone(c) });
        e.preventDefault();
        return;
      }
      // A group selected as a whole deletes and nudges as a whole; after a double-click, only the part.
      const members = sel && st.partId !== sel.id ? groupOf(slideOf(st), sel) : sel ? [sel] : [];
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        if (members.length > 1) {
          const ids = new Set(members.map((l) => l.id));
          st.mutate((d) => { const s = d.slides.find((x) => x.id === st.slideId)!; s.layers = s.layers.filter((l) => !ids.has(l.id)); });
          st.set({ selectedId: null, partId: null });
        } else st.deleteLayer(sel.id);
        return;
      }
      if (e.key === 'Escape') {
        // Out of a part to its group first, then out of the selection.
        if (sel && st.partId === sel.id && groupOf(slideOf(st), sel).length > 1) { st.set({ partId: null, editingTextId: null }); return; }
        st.set({ selectedId: null, editingTextId: null, partId: null, galleryOpen: false });
        return;
      }
      if (e.key === 'Enter' && sel?.kind === 'text') { e.preventDefault(); st.set({ editingTextId: sel.id }); return; }
      // Alt + ↑ / ↓: one place earlier or later among the like items it is one of.
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && sel) { e.preventDefault(); moveInOrder(sel.id, e.key === 'ArrowUp' ? -1 : 1); return; }
      if (e.key.startsWith('Arrow') && sel?.box && !sel.locked) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        const ids = new Set(members.map((l) => l.id));
        st.mutate((d) => { for (const l of d.slides.find((x) => x.id === st.slideId)!.layers) if (ids.has(l.id) && l.box) { l.box.x += dx; l.box.y += dy; } }, `nudge:${sel.id}`);
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
      if (!mod && k === 'a') { st.set({ leftTab: 'add' }); return; }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || useStore.getState().presenting) return;
      const f = [...(e.clipboardData?.files ?? [])].find((x) => /^(image|video)\//.test(x.type));
      if (f) { e.preventDefault(); addMediaFile(f); }
    };
    addEventListener('keydown', on);
    addEventListener('paste', onPaste);
    return () => { removeEventListener('keydown', on); removeEventListener('paste', onPaste); };
  }, []);

  const view = useStore((s) => s.view);
  const anyInView = useStore((s) => s.deck.slides.some((x) => inView(x, s.view)));
  if (!restored) return <div className="app app-loading" aria-busy="true" />;
  return (
    <div className={`app${embedded ? ' embedded' : ''}${panelHidden ? ' no-panel' : ''}`}>
      <TopBar embedded={embedded} />
      {view === 'lesson' ? <LeftPanel /> : <BrowsePanel kind={view === 'quiz' ? 'games' : 'activities'} />}
      <main className="center">
        <Stage />
        {view !== 'lesson' && !anyInView && <EmptyView view={view} />}
        <CanvasBar />
        <Filmstrip />
      </main>
      {!panelHidden && <Inspector />}
      {presenting && <Present />}
      {galleryOpen && <Gallery />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/** A studio with nothing in it yet: the Quiz studio before the lesson has a game, Activities before it
 *  has an activity. Browse, on the left, adds one after the slide the lesson was on. */
function EmptyView({ view }: { view: LabView }) {
  const quiz = view === 'quiz';
  return (
    <div className="empty-view">
      <b>{quiz ? 'No games in this lesson yet' : 'No activities in this lesson yet'}</b>
      <span>Pick one in Browse, on the left: it goes into this lesson after the slide you were on.</span>
      <button className="btn-soft accent" onClick={focusBrowse}>{quiz ? 'Browse games' : 'Browse activities'}</button>
    </div>
  );
}
