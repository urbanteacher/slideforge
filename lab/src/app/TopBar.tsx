import { ChevronDown, Clapperboard, FileCode, FileJson, FilePlus, FolderOpen, ImageDown, Keyboard, Play, Presentation, Settings, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { exportHtml, exportJson, exportPng, renderStill, editableSlides, exportPptx } from '../export';
import { blankDeck, demoDeck, type Deck } from '../core';
import { ukbtDeck, ukbtInstituteDeck, nulDeck } from '../decks';
import { hasRoomGame, openStudioShow, studioRoomEnabled, studioShowEnabled } from '../show';
import { slideOf, useStore } from '../store';
import { FormatBar, Menu } from '../ui';
import { keyProps } from '../keys';
import { openOverlay, reason, report, track } from '../shell';
import { hasShell, ShellLeft, ShellRight } from './ShellRow';
import { present } from './showInSlideForge';

export function TopBar({ embedded = false }: { embedded?: boolean }) {
  const deck = useStore((s) => s.deck);
  const saveState = useStore((s) => s.saveState);
  const { mutate, loadDeck, showToast } = useStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);

  const openFile = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as Deck;
      if (!Array.isArray(d.slides) || !d.slides.length) throw new Error('No slides found');
      loadDeck(d);
      showToast(`Opened “${d.title}”`);
      report({ kind: 'open', state: 'done', title: `Opened “${d.title}”`, detail: `From ${f.name}. It is now this browser's open deck.` });
    } catch (e) {
      // Listed in Status rather than toasted, so the reason can be read after it would have faded.
      report({ kind: 'open', state: 'failed', title: `Couldn't open ${f.name}`, detail: `${reason(e)}. The deck that was open is unchanged.` });
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
              const [{ motionLabFullDeck }, data] = await Promise.all([import('../decks/motionLab'), import('../assets/motion-lab.json')]);
              loadDeck(motionLabFullDeck(data.default as never));
            }}><Sparkles size={15} />New from Motion lab (all 59 slides)</button>
            <button onClick={() => { loadDeck(ukbtDeck()); close(); }}><Sparkles size={15} />New from UK Black Tech partnership pack</button>
            <button onClick={() => { loadDeck(ukbtInstituteDeck()); close(); }}><Sparkles size={15} />New from UKBT Institute partnership pack</button>
            <button onClick={() => { loadDeck(nulDeck()); close(); }}><Sparkles size={15} />New from NU London openers & layout range</button>
            <button onClick={async () => {
              close();
              // The Layout bank is 1.7 MB of content and pictures, so it loads only when asked for.
              const [{ deckFromSlideForge }, data] = await Promise.all([import('../decks/fromSlideForge'), import('../assets/layout-bank.json')]);
              loadDeck(deckFromSlideForge(data.default as never));
            }}><Sparkles size={15} />New from the Layout bank (97 SlideForge slides)</button>
            <hr />
            <button onClick={() => { fileRef.current?.click(); close(); }}><FolderOpen size={15} />Open deck file…</button>
            <button onClick={() => { close(); void track('export', 'Deck file (.json)', () => exportJson(deck), 'Downloaded. Open it again from File → Open deck file.').catch(() => {}); }}><FileJson size={15} />Save deck file<small>.json</small></button>
            <hr />
            <button onClick={() => { close(); void track('export', 'Interactive HTML deck', () => exportHtml(deck), 'Exported a self-contained HTML deck').then(() => showToast('Exported a self-contained HTML deck'), () => {}); }}><FileCode size={15} />Export interactive HTML deck<small>.html</small></button>
            <button onClick={async () => {
              close();
              showToast('Making the PowerPoint…');
              const done = 'Exported a PowerPoint: each slide a picture, with its notes';
              await track('export', 'PowerPoint (slides as pictures)', () => exportPptx(deck, deck.slides.map((s) => ({ image: renderStill(s, deck, 1920, 'image/jpeg', 2, 0.92), notes: s.notes ?? '', hidden: !!s.hidden, name: s.name }))), done, 'Making the PowerPoint…')
                .then(() => showToast(done), () => {});
            }}><Presentation size={15} />Export PowerPoint (slides as pictures)<small>.pptx</small></button>
            <button onClick={async () => {
              close();
              showToast('Making the PowerPoint…');
              const done = 'Exported a PowerPoint with editable text';
              await track('export', 'PowerPoint (editable text)', async () => exportPptx(deck, await editableSlides(deck), true), done, 'Making the PowerPoint…')
                .then(() => showToast(done), () => {});
            }}><Presentation size={15} />Export PowerPoint (editable text)<small>.pptx</small></button>
            <button onClick={() => { const st = useStore.getState(); close(); void track('export', `Slide ${deck.slides.indexOf(slideOf(st)) + 1} as an image (.png)`, () => exportPng(slideOf(st), deck, deck.slides.indexOf(slideOf(st))), 'Downloaded.').catch(() => {}); }}><ImageDown size={15} />Export this slide as an image<small>.png</small></button>
            <button onClick={() => { useStore.getState().set({ videoOpen: 'deck' }); close(); }}><Clapperboard size={15} />Export video…<small>.mp4</small></button>
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
        <button className="tb-btn icon" aria-label="Keyboard shortcuts" {...keyProps('Keyboard shortcuts', 'app.keys')} onClick={() => openOverlay('keys')}><Keyboard size={16} /></button>
        <button className="tb-btn icon" aria-label="Editor settings" {...keyProps('Editor settings: how the editor behaves for you (the lesson\'s own settings are under Layouts)', 'app.settings')} onClick={() => openOverlay('settings')}><Settings size={16} /></button>
        <span className="fmt-sep" />
        {/* Embedded, the shell's Present is the one. On its own, Present opens SlideForge's show. */}
        {studioRoomEnabled() && <button className="btn-outline" title="The studio's own room: phones join, and the wall is drawn here (?studioRoom=1)" disabled={!hasRoomGame(deck)} onClick={() => openStudioShow({ room: true })}>Host live (studio)</button>}
        {studioShowEnabled() && <button className="btn-outline" title="The studio's own show, with the Teacher Presenter and notes on another device (?studioShow=1)" onClick={() => openStudioShow()}>Present (studio)</button>}
        {!embedded && <button className="btn-accent" {...keyProps('Present the lesson', 'show.present')} onClick={present}><Play size={14} />Present</button>}
        {embedded && hasShell() && <ShellRight />}
      </div>
      </div>
    </header>
  );
}
