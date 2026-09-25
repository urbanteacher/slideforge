import { ChartColumn, ChevronDown, CircleHelp, FileCode, FileJson, FilePlus, FolderOpen, Heading, ImageDown, ImagePlus, LayoutTemplate, List, Minus, Play, Plus, Quote, Redo2, Shapes, Sparkles, StickyNote, Timer, Type, Undo2, Video } from 'lucide-react';
import { SlideMenuButton } from './SlideMenu';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { exportHtml, exportJson, exportPng } from '../export/exporters';
import { blankDeck, demoDeck } from '../model/defaults';
import { ukbtDeck, ukbtInstituteDeck } from '../model/ukbtDeck';
import { nulDeck } from '../model/nulDeck';
import { slideOf, useStore } from '../model/store';
import type { Deck } from '../model/types';
import { FormatBar } from './FormatBar';
import { addImageFile, addItem, addVideoFile } from './insert';

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

export function TopBar({ embedded = false }: { embedded?: boolean }) {
  const deck = useStore((s) => s.deck);
  const saveState = useStore((s) => s.saveState);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const zoomSetting = useStore((s) => s.zoom);
  const fitZoom = useStore((s) => s.fitZoom);
  const { undo, redo, set, mutate, loadDeck, showToast, addLayer } = useStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
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
      {/* SlideForge's two rows, each control once. Row one is the document: brand, name, saved, File.
          Row two is the tools on the left and the show on the right, where SlideForge keeps Present.
          History, Settings, Share and Host live are the shell's, and arrive when the lab joins it. */}
      {!embedded && <div className="tb-row">
      <div className="brand" aria-label="SlideForge Studio"><span className="logo-mark">s</span>SlideForge<span className="brand-tag">LAB</span></div>
      <input className="title-input" aria-label="Deck name" value={deck.title} onChange={(e) => mutate((d) => { d.title = e.target.value; }, 'title')} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span className="saved" aria-live="polite">{saveState === 'saved' ? 'Saved in this browser' : saveState === 'saving' ? 'Saving…' : 'Edited'}</span>
      <div className="spacer" />
      <Menu right trigger={(open, t) => <button className={`btn-outline${open ? ' active' : ''}`} aria-expanded={open} onClick={t}>File<ChevronDown size={13} /></button>}>
        {(close) => (
          <>
            <button onClick={() => { loadDeck(blankDeck()); close(); }}><FilePlus size={15} />New blank deck</button>
            <button onClick={() => { loadDeck(demoDeck()); close(); }}><Sparkles size={15} />New from demo deck</button>
            <button onClick={async () => {
              close();
              // Slides 15 onwards carry their pictures and clip, so the content loads only when asked for.
              const [{ motionLabFullDeck }, data] = await Promise.all([import('../model/motionLab'), import('../assets/motion-lab.json')]);
              loadDeck(motionLabFullDeck(data.default as never));
            }}><Sparkles size={15} />New from Motion lab (all 59 slides)</button>
            <button onClick={() => { loadDeck(ukbtDeck()); close(); }}><Sparkles size={15} />New from UK Black Tech partnership pack</button>
            <button onClick={() => { loadDeck(ukbtInstituteDeck()); close(); }}><Sparkles size={15} />New from UKBT Institute partnership pack</button>
            <button onClick={() => { loadDeck(nulDeck()); close(); }}><Sparkles size={15} />New from NU London openers & layout range</button>
            <button onClick={async () => {
              close();
              // The Layout bank is 1.7 MB of content and pictures, so it loads only when asked for.
              const [{ deckFromSlideForge }, data] = await Promise.all([import('../model/fromSlideForge'), import('../assets/layout-bank.json')]);
              loadDeck(deckFromSlideForge(data.default as never));
            }}><Sparkles size={15} />New from the Layout bank (97 SlideForge slides)</button>
            <hr />
            <button onClick={() => { fileRef.current?.click(); close(); }}><FolderOpen size={15} />Open deck file…</button>
            <button onClick={() => { exportJson(deck); close(); }}><FileJson size={15} />Save deck file<small>.json</small></button>
            <hr />
            <button onClick={() => { exportHtml(deck); close(); showToast('Exported a self-contained HTML deck'); }}><FileCode size={15} />Export interactive HTML deck<small>.html</small></button>
            <button onClick={() => { const st = useStore.getState(); exportPng(slideOf(st), deck, deck.slides.indexOf(slideOf(st))); close(); }}><ImageDown size={15} />Export this slide as an image<small>.png</small></button>
            <div className="menu-note">Your work also autosaves in this browser. HTML decks keep every animation, transition and interaction.</div>
          </>
        )}
      </Menu>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
      </div>}
      <div className="tb-row tb-tools">
      <div className="tb-group">
        <Menu trigger={(open, t) => <button className={`tb-btn${open ? ' active' : ''}`} onClick={t}><Plus size={15} />Add<ChevronDown size={13} /></button>}>
          {(close) => {
            const add = (id: string) => () => { addLayer(id); close(); };
            const item = (id: Parameters<typeof addItem>[0]) => () => { addItem(id); close(); };
            return (
              <>
                {/* SlideForge's "+ Item" list, in its order */}
                <button onClick={item('heading')}><Heading size={15} />Heading</button>
                <button onClick={item('text')}><Type size={15} />Text<small>T</small></button>
                <button onClick={item('note')}><StickyNote size={15} />Note</button>
                <button onClick={item('bullets')}><List size={15} />Bullet points</button>
                <button onClick={() => { imageRef.current?.click(); close(); }}><ImagePlus size={15} />Image…</button>
                <button onClick={item('video')}><Video size={15} />Video — a clip or a YouTube link</button>
                <button onClick={item('quote')}><Quote size={15} />Quote</button>
                <button onClick={item('chart')}><ChartColumn size={15} />Chart</button>
                <button onClick={item('timer')}><Timer size={15} />Timer</button>
                <hr />
                <button onClick={() => { videoRef.current?.click(); close(); }}><Video size={15} />Video…</button>
                <button onClick={add('shape')}><Shapes size={15} />Shape</button>
                <hr />
                <button onClick={add('quiz')}><CircleHelp size={15} />Quiz<small>placeholder</small></button>
                <button onClick={add('activity')}><Timer size={15} />Activity<small>placeholder</small></button>
                <div className="menu-note">Layouts, backgrounds &amp; effects, headers and footers are in the left panel. You can also drop or paste an image or video straight onto the slide.</div>
              </>
            );
          }}
        </Menu>
      </div>
      <FormatBar />
      <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={async (e) => {
        for (const f of [...(e.target.files ?? [])]) await addImageFile(f);
        e.target.value = '';
      }} />
      <input ref={videoRef} type="file" accept="video/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) await addVideoFile(f);
      }} />
      <button className="tb-btn" title="Gallery" onClick={() => set({ galleryOpen: true })}><LayoutTemplate size={15} /><span className="tb-label">Gallery</span></button>
      <SlideMenuButton />
      <div className="spacer" />
      <div className="tb-run" role="group" aria-label="Edit and show">
        <button className="tb-btn icon" title="Undo (⌘Z)" aria-label="Undo" disabled={!canUndo} onClick={undo}><Undo2 size={16} /></button>
        <button className="tb-btn icon" title="Redo (⇧⌘Z)" aria-label="Redo" disabled={!canRedo} onClick={redo}><Redo2 size={16} /></button>
        <span className="fmt-sep" />
        <button className="tb-btn icon" title="Zoom out" aria-label="Zoom out" onClick={() => stepZoom(1 / 1.25)}><Minus size={15} /></button>
        <button className="zoom-val" title="Fit to window" onClick={() => set({ zoom: 'fit' })}>{Math.round(zoom * 100)}%</button>
        <button className="tb-btn icon" title="Zoom in" aria-label="Zoom in" onClick={() => stepZoom(1.25)}><Plus size={15} /></button>
        <button className="tb-btn" title="Play this slide's animations in the editor" onClick={() => useStore.setState((s) => ({ playToken: s.playToken + 1 }))}><Sparkles size={15} /><span className="tb-label">Animate</span></button>
        {/* Embedded, the shell's Present is the one: it runs this show, full screen. */}
        {!embedded && <button className="btn-accent" title="Slideshow, full screen (⌘↵)" onClick={() => set({ presenting: true })}><Play size={14} />Present</button>}
      </div>
      </div>
    </header>
  );
}
