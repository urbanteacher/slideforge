import { ChevronDown, FileCode, FileJson, FilePlus, FolderOpen, ImageDown, Play, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { exportHtml, exportJson, exportPng } from '../export/exporters';
import { blankDeck, demoDeck } from '../model/defaults';
import { ukbtDeck, ukbtInstituteDeck } from '../model/ukbtDeck';
import { nulDeck } from '../model/nulDeck';
import { slideOf, useStore } from '../model/store';
import type { Deck } from '../model/types';
import { FormatBar } from './FormatBar';
import { Menu } from './Menu';
import { hasShell, ShellLeft, ShellRight } from './ShellRow';

export function TopBar({ embedded = false }: { embedded?: boolean }) {
  const deck = useStore((s) => s.deck);
  const saveState = useStore((s) => s.saveState);
  const { set, mutate, loadDeck, showToast } = useStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);

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
      {/* Inside SlideForge, its second header row shares this one: Library and the demo at the left. */}
      {embedded && hasShell() && <ShellLeft />}
      <FormatBar />
      <div className="spacer" />
      <div className="tb-run" role="group" aria-label="Edit and show">
        {/* Embedded, the shell's Present is the one: it runs this show, full screen. */}
        {!embedded && <button className="btn-accent" title="Slideshow, full screen (⌘↵)" onClick={() => set({ presenting: true })}><Play size={14} />Present</button>}
        {embedded && hasShell() && <ShellRight />}
      </div>
      </div>
    </header>
  );
}
