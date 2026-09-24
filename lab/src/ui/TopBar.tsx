import { ChevronDown, Download, FileCode, FileJson, FilePlus, FolderOpen, ImageDown, Layers, LayoutTemplate, Minus, Play, Plus, Redo2, Sparkles, Undo2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { exportHtml, exportJson, exportPng } from '../export/exporters';
import { blankDeck, demoDeck } from '../model/defaults';
import { slideOf, useStore } from '../model/store';
import type { Deck } from '../model/types';

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, [open]);
  return ref;
}

function Menu({ trigger, children, right }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; right?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger(open, () => setOpen(!open))}
      {open && <div className={`menu${right ? ' right' : ''}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function TopBar() {
  const deck = useStore((s) => s.deck);
  const saveState = useStore((s) => s.saveState);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const leftTab = useStore((s) => s.leftTab);
  const zoomSetting = useStore((s) => s.zoom);
  const fitZoom = useStore((s) => s.fitZoom);
  const { undo, redo, set, mutate, loadDeck, showToast } = useStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting;
  const stepZoom = (k: number) => set({ zoom: Math.max(0.1, Math.min(4, Math.round(zoom * k * 20) / 20)) });

  const openFile = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as Deck;
      if (!Array.isArray(d.slides) || !d.slides.length) throw new Error('No slides found');
      loadDeck(d);
      showToast(`Opened “${d.title}”`);
    } catch (e) {
      showToast(`Could not open that file: ${(e as Error).message}`);
    }
  };

  return (
    <header className="topbar">
      <Menu trigger={(_, t) => (
        <button className="logo" onClick={t} title="File"><span className="logo-mark">s</span><ChevronDown size={13} color="#777" /></button>
      )}>
        {(close) => (
          <>
            <button onClick={() => { loadDeck(blankDeck()); close(); }}><FilePlus size={15} />New blank deck</button>
            <button onClick={() => { loadDeck(demoDeck()); close(); }}><Sparkles size={15} />New from demo deck</button>
            <hr />
            <button onClick={() => { fileRef.current?.click(); close(); }}><FolderOpen size={15} />Open deck file…</button>
            <button onClick={() => { exportJson(deck); close(); }}><Download size={15} />Save deck file (.json)</button>
            <div className="menu-note">Your work also autosaves in this browser.</div>
          </>
        )}
      </Menu>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
      <input className="title-input" value={deck.title} onChange={(e) => mutate((d) => { d.title = e.target.value; }, 'title')} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span className="saved">{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Edited'}</span>
      <button className="tb-btn icon" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}><Undo2 size={16} /></button>
      <button className="tb-btn icon" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}><Redo2 size={16} /></button>
      <div className="tb-group">
        <button className={`tb-btn${leftTab === 'layers' ? ' active' : ''}`} onClick={() => set({ leftTab: 'layers' })}><Layers size={15} />Layers</button>
        <button className={`tb-btn${leftTab === 'add' ? ' active' : ''}`} onClick={() => set({ leftTab: 'add' })}><Plus size={15} />Add</button>
      </div>
      <div className="spacer" />
      <button className="tb-btn" onClick={() => set({ galleryOpen: true })}><LayoutTemplate size={15} />Gallery</button>
      <button className="tb-btn icon" title="Zoom out" onClick={() => stepZoom(1 / 1.25)}><Minus size={15} /></button>
      <button className="zoom-val" title="Fit to window" onClick={() => set({ zoom: 'fit' })}>{Math.round(zoom * 100)}%</button>
      <button className="tb-btn icon" title="Zoom in" onClick={() => stepZoom(1.25)}><Plus size={15} /></button>
      <button className="tb-btn" style={{ marginLeft: 6 }} title="Play this slide's animations in the editor" onClick={() => useStore.setState((s) => ({ playToken: s.playToken + 1 }))}><Sparkles size={15} />Animate</button>
      <button className="btn-outline" style={{ marginLeft: 6 }} title="Present (⌘↵)" onClick={() => set({ presenting: true })}><Play size={14} />Preview</button>
      <Menu right trigger={(_, t) => <button className="btn-accent" style={{ marginLeft: 6 }} onClick={t}><Upload size={14} />Export</button>}>
        {(close) => (
          <>
            <button onClick={() => { exportHtml(deck); close(); showToast('Exported a self-contained HTML deck'); }}><FileCode size={15} />Interactive HTML deck<small>.html</small></button>
            <button onClick={() => { const st = useStore.getState(); exportPng(slideOf(st), deck, deck.slides.indexOf(slideOf(st))); close(); }}><ImageDown size={15} />This slide as image<small>.png</small></button>
            <button onClick={() => { exportJson(deck); close(); }}><FileJson size={15} />Editable deck file<small>.json</small></button>
            <div className="menu-note">HTML decks keep every animation, transition and interaction. Open in any modern browser.</div>
          </>
        )}
      </Menu>
    </header>
  );
}
