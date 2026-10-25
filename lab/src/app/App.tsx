import { useEffect, useState } from 'react';
import { cloneLayer, idbGet, blankDeck, type Deck } from '../core';
import { inView, layerOf, refitAllText, slideOf, useStore, type LabView } from '../store';
import { isLabDeck, saveCurrent } from './embed';
import { ShowLayer } from '../show';
import { registerGuideFonts } from '../theme';
import { CanvasBar, Filmstrip, Gallery, LeftPanel, Stage, Timeline, VideoExport, toggleFormat, addMediaFile, groupOf, moveInOrder, slideClipboard, BrowsePanel, focusBrowse, quickAdd, QUICK_PICKS, stepZoom, toggleSide } from '../ui';
import { is } from '../keys';
import { Overlays, RightColumn, bindCommands, openOverlay, readPlace, reason, report, restorePlace, settle, showStatus, startStatus, startSyncWatch, startUrlSync, useOverlay } from '../shell';
import { present } from './showInSlideForge';
import { TopBar } from './TopBar';
import { ColumnHandle, useColumns } from './columns';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** The slide before or after the one open, if there is one. */
function stepSlide(by: 1 | -1) {
  const st = useStore.getState();
  const slides = st.deck.slides;
  const next = slides[slides.findIndex((s) => s.id === slideOf(st).id) + by];
  if (next) st.selectSlide(next.id);
}

/** The Status tab, with the inspector column shown if it was folded away. */
function openStatus() {
  if (useStore.getState().panelHidden) toggleSide('right');
  showStatus();
}

/** `embedded`: SlideForge's shell owns the document row (name, File, Save), so the lab shows its tools only. */
export function App({ embedded = false, onReady }: { embedded?: boolean; onReady?: () => void }) {
  const galleryOpen = useStore((s) => s.galleryOpen);
  const videoOpen = useStore((s) => s.videoOpen);
  const toast = useStore((s) => s.toast);
  const panelHidden = useStore((s) => s.panelHidden);
  const leftHidden = useStore((s) => s.leftHidden);
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
    let stopUrl = () => {};
    // A run of failed autosaves is one row in Status, kept after a save works again so it can't pass unseen.
    let failingSince = 0, failures = 0;
    // The last-open slot, and the deck under its own id so the shell's Open can list it.
    const save = () => saveCurrent();
    idbGet<{ deck: Deck; slideId?: string }>('current').then(async (saved) => {
      if (isLabDeck(saved?.deck)) {
        useStore.getState().loadDeck(saved.deck);
        if (saved.slideId && saved.deck.slides.some((s) => s.id === saved.slideId)) useStore.setState({ slideId: saved.slideId });
        useStore.setState({ saveState: 'saved' });
      } else if (embedded) {
        // A first visit to SlideForge opens a blank lesson, not somebody else's finished one: a stranger's
        // sample invites typing over it. The Library, one click away, has the lessons and the demo.
        // (The lab on its own, its playground, still opens on its demo.)
        useStore.getState().loadDeck(blankDeck());
        useStore.setState({ saveState: 'saved' });
      }
      // The place the address holds (deck, slide, inspector tab), then keep it there as it changes.
      const place = readPlace(embedded);
      if (place) await restorePlace(place, embedded, async (id) => { const d = await idbGet<Deck>(`deck:${id}`); return isLabDeck(d) ? d : null; });
      stopUrl = startUrlSync(embedded);
      ready = true;
      setRestored(true);
      onReady?.();
    }).catch((e) => {
      report({ kind: 'open', state: 'failed', title: "Couldn't read your saved deck from this browser", detail: `${reason(e)}. The editor opened without it; nothing has been overwritten yet, so reloading may bring it back.` });
      stopUrl = startUrlSync(embedded);
      ready = true; setRestored(true); onReady?.();
    });
    // Every save, the timed one and the one as the page goes, ends in the Status tab: done, or failed with why.
    const persist = () => save()
      .then(() => {
        useStore.setState({ saveState: 'saved' });
        report({ id: 'autosave', kind: 'save', state: 'done', title: 'Saved in this browser', detail: embedded ? 'SlideForge\'s Library lists it; its sync, when you are signed in, takes it online.' : 'Kept in this browser\'s database only. File → Save deck file keeps a copy you can move.' });
        if (failingSince) settle(`autosave-fail-${failingSince}`, { detail: `Failed ${failures} ${failures === 1 ? 'time' : 'times'}, then saved again at ${new Date().toLocaleTimeString()}. Nothing was lost.` });
        failingSince = 0; failures = 0;
      })
      .catch((e) => {
        const why = reason(e);
        failingSince ||= Date.now();
        failures++;
        useStore.setState({ saveState: 'unsaved' });
        report({ id: 'autosave', kind: 'save', state: 'failed', title: "Can't save changes", detail: why });
        report({ id: `autosave-fail-${failingSince}`, kind: 'save', state: 'failed', at: failingSince, title: 'Autosave failed', detail: `${why}. Tried ${failures} ${failures === 1 ? 'time' : 'times'}. Export a .json to be safe.` });
      });
    // A refresh within the autosave's half-second would lose the last edit: save as the page goes.
    const flush = () => { if (ready && useStore.getState().saveState !== 'saved') { clearTimeout(timer); void persist(); } };
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    const unsub = useStore.subscribe((s, prev) => {
      if (!ready || (s.deck === prev.deck && s.slideId === prev.slideId)) return;
      clearTimeout(timer);
      if (s.deck !== prev.deck) useStore.setState({ saveState: 'saving' });
      timer = window.setTimeout(() => void persist(), 600);
    });
    return () => { unsub(); stopUrl(); clearTimeout(timer); removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
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
      // A sheet over the editor (shortcuts, palette, settings) takes the keys while it is open.
      if (useOverlay.getState().open) return;
      const st = useStore.getState();
      // The shell's own keys work while typing too, as ⌘K does in SlideForge. Every key is named in keys/.
      if (is('panel.left', e)) { e.preventDefault(); toggleSide('left'); return; }
      if (is('panel.right', e)) { e.preventDefault(); toggleSide('right'); return; }
      if (is('panel.status', e)) { e.preventDefault(); openStatus(); return; }
      if (is('app.settings', e)) { e.preventDefault(); openOverlay('settings'); return; }
      // Inside SlideForge ⌘K is the shell's palette (main.tsx hands it up), which lists these commands too.
      if (!embedded && is('app.palette', e)) { e.preventDefault(); openOverlay('palette'); return; }
      if (isTyping(e.target)) return;
      if (is('app.keys', e)) { e.preventDefault(); openOverlay('keys'); return; }
      if (is('view.zoomIn', e)) { e.preventDefault(); stepZoom(1.25); return; }
      if (is('view.zoomOut', e)) { e.preventDefault(); stepZoom(1 / 1.25); return; }
      if (is('view.zoomFit', e)) { e.preventDefault(); st.set({ zoom: 'fit' }); return; }
      const sel = layerOf(st);
      if (is('edit.undo', e)) { e.preventDefault(); st.undo(); return; }
      if (is('edit.redo', e)) { e.preventDefault(); st.redo(); return; }
      if (is('show.present', e)) { e.preventDefault(); present(); return; }
      if (is('edit.duplicate', e) && sel) { e.preventDefault(); st.duplicateLayer(sel.id); return; }
      const fmt = is('text.bold', e) ? 'bold' : is('text.italic', e) ? 'italic' : is('text.underline', e) ? 'underline' : null;
      if (fmt && sel) { e.preventDefault(); toggleFormat(sel, fmt); return; }
      if (is('edit.copy', e) && sel) { st.set({ clipboard: structuredClone(sel) }); return; }
      // With nothing selected, copy and paste act on the slide, as in SlideForge.
      if (is('edit.copy', e) && !sel && !window.getSelection()?.toString()) { slideClipboard.copy(st.slideId); return; }
      if (is('edit.paste', e) && !st.clipboard && slideClipboard.has()) { e.preventDefault(); slideClipboard.paste(); return; }
      if (is('edit.paste', e) && st.clipboard) {
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
      if (is('edit.delete', e) && sel) {
        e.preventDefault();
        if (members.length > 1) {
          const ids = new Set(members.map((l) => l.id));
          st.mutate((d) => { const s = d.slides.find((x) => x.id === st.slideId)!; s.layers = s.layers.filter((l) => !ids.has(l.id)); });
          st.set({ selectedId: null, partId: null });
        } else st.deleteLayer(sel.id);
        return;
      }
      if (is('edit.deselect', e)) {
        // Out of a part to its group first, then out of the selection.
        if (sel && st.partId === sel.id && groupOf(slideOf(st), sel).length > 1) { st.set({ partId: null, editingTextId: null }); return; }
        st.set({ selectedId: null, editingTextId: null, partId: null, galleryOpen: false });
        return;
      }
      if (is('text.edit', e) && sel?.kind === 'text') { e.preventDefault(); st.set({ editingTextId: sel.id }); return; }
      // Alt + ↑ / ↓: one place earlier or later among the like items it is one of.
      if (is('edit.order', e) && sel) { e.preventDefault(); moveInOrder(sel.id, e.key === 'ArrowUp' ? -1 : 1); return; }
      if (is('edit.nudge', e) && sel?.box && !sel.locked) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        const ids = new Set(members.map((l) => l.id));
        st.mutate((d) => { for (const l of d.slides.find((x) => x.id === st.slideId)!.layers) if (ids.has(l.id) && l.box) { l.box.x += dx; l.box.y += dy; } }, `nudge:${sel.id}`);
        return;
      }
      if (!sel && (is('slide.next', e) || is('slide.prev', e))) { stepSlide(is('slide.next', e) ? 1 : -1); return; }
      if (is('edit.addText', e)) { st.addLayer('text'); return; }
      if (is('edit.effects', e)) { st.set({ leftTab: 'add' }); return; }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const f = [...(e.clipboardData?.files ?? [])].find((x) => /^(image|video)\//.test(x.type));
      if (f) { e.preventDefault(); addMediaFile(f); }
    };
    addEventListener('keydown', on);
    addEventListener('paste', onPaste);
    return () => { removeEventListener('keydown', on); removeEventListener('paste', onPaste); };
  }, []);

  // The shell around the slide: the Status tab's list (toasts and uncaught errors too), SlideForge's sync when the lab
  // is its frame, and the palette's commands, bound to the same code the keys run.
  useEffect(() => {
    const stop = [startStatus(), startSyncWatch(embedded)];
    const st = useStore.getState;
    const hasLayer = () => !!layerOf(st());
    bindCommands({
      'panel.left': { run: () => toggleSide('left'), words: 'collapse sidebar list layers' },
      'panel.right': { run: () => toggleSide('right'), words: 'collapse sidebar properties' },
      'panel.status': { run: openStatus, words: 'jobs exports saves errors sync' },
      'app.settings': { run: () => openOverlay('settings'), words: 'preferences options' },
      'app.keys': { run: () => openOverlay('keys'), words: 'help keyboard' },
      'edit.undo': { run: () => st().undo(), enabled: () => st().past.length > 0 },
      'edit.redo': { run: () => st().redo(), enabled: () => st().future.length > 0 },
      'edit.duplicate': { run: () => { const l = layerOf(st()); if (l) st().duplicateLayer(l.id); }, enabled: hasLayer },
      'edit.delete': { run: () => { const l = layerOf(st()); if (l) st().deleteLayer(l.id); }, enabled: hasLayer, words: 'remove layer' },
      'edit.addText': { run: () => { st().addLayer('text'); }, words: 'add type words' },
      'edit.effects': { run: () => st().set({ leftTab: 'add' }), words: 'background gradient shader' },
      'slide.next': { run: () => stepSlide(1) },
      'slide.prev': { run: () => stepSlide(-1) },
      'slide.sorter': { run: () => useStore.setState((s) => ({ sorterOpen: !s.sorterOpen })), words: 'grid sorter overview rearrange' },
      'view.zoomIn': { run: () => stepZoom(1.25) },
      'view.zoomOut': { run: () => stepZoom(1 / 1.25) },
      'view.zoomFit': { run: () => st().set({ zoom: 'fit' }) },
      'show.present': { run: present, words: 'slideshow play' },
    });
    return () => stop.forEach((f) => f());
  }, []);

  const cols = useColumns();
  const view = useStore((s) => s.view);
  const anyInView = useStore((s) => s.deck.slides.some((x) => inView(x, s.view)));
  if (!restored) return <div className="app app-loading" aria-busy="true" />;
  return (
    <div className={`app${embedded ? ' embedded' : ''}${panelHidden ? ' no-panel' : ''}${leftHidden ? ' no-left' : ''}`} style={cols.style}>
      <TopBar embedded={embedded} />
      {leftHidden ? null : view === 'lesson' ? <LeftPanel /> : <BrowsePanel kind={view === 'quiz' ? 'games' : view === 'nodes' ? 'nodes' : 'activities'} />}
      <main className="center">
        <Stage />
        <Timeline />
        {view !== 'lesson' && !anyInView && <EmptyView view={view} />}
        <CanvasBar />
        <Filmstrip />
      </main>
      {!panelHidden && <RightColumn embedded={embedded} />}
      {!leftHidden && <ColumnHandle side="left" cols={cols} />}
      {!panelHidden && <ColumnHandle side="right" cols={cols} />}
      {galleryOpen && <Gallery />}
      {videoOpen && <VideoExport />}
      {toast && <div className="toast">{toast}</div>}
      <Overlays embedded={embedded} />
      <ShowLayer />
    </div>
  );
}

/** A studio with nothing in it yet: the Quiz studio before the lesson has a game, Activities before it
 *  has an activity. It offers a few starters to add with one click (after the slide the lesson was on),
 *  and Browse, on the left, for everything else. The added slides open ready to edit, or to write with AI
 *  in the side panel. */
function EmptyView({ view }: { view: LabView }) {
  const quiz = view === 'quiz', nodes = view === 'nodes';
  const kind = quiz ? 'games' : nodes ? 'nodes' : 'activities';
  const [busy, setBusy] = useState('');
  const pick = (id: string) => { if (busy) return; setBusy(id); void quickAdd(kind, id).finally(() => setBusy('')); };
  return (
    <div className="empty-view">
      <b>{quiz ? 'Start a game' : nodes ? 'Start a Nodes challenge' : 'Start an activity'}</b>
      <span>Pick one to add it after the slide you were on. Then edit it on the slide, or write it with AI in the side panel.</span>
      <div className="empty-picks">
        {QUICK_PICKS[kind].map((p) => (
          <button key={p.id} className="empty-pick" disabled={!!busy} onClick={() => pick(p.id)}>
            <b>{busy === p.id ? 'Adding…' : p.label}</b><span>{p.hint}</span>
          </button>
        ))}
      </div>
      <button className="btn-soft" onClick={focusBrowse}>{quiz ? 'All games' : nodes ? 'All Nodes formats' : 'All activities'}</button>
    </div>
  );
}
