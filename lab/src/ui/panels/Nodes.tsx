import { useState } from 'react';
import { cloneSlide, type Deck } from '../../core';
import { useStore } from '../../store';

// The Nodes studio's left pane: the Nodes stages SlideForge ships (js/lab-decks.js, the Nodes folder),
// each added to the lesson as a challenge, after the slide on screen. Step 1 of docs/nodes-studio-plan.md:
// the stages come in as their designed slides, marked as Nodes slides; editing from the stage's data
// comes next.

export interface NodesStage { key: string; file: string; title: string; earlier: boolean }

/* eslint-disable @typescript-eslint/no-explicit-any */
function hostSF(): any {
  try { return window.parent !== window ? (window.parent as any).SF : (window as any).SF; } catch { return null; }
}

/** The Nodes stages the app ships: SlideForge's lab decks in the Nodes folder. */
export function nodesStages(): NodesStage[] {
  const decks = (hostSF()?.LAB_DECKS ?? {}) as Record<string, { file?: string; title?: string; libraryGroup?: string }>;
  return Object.entries(decks)
    .filter(([key, d]) => key.startsWith('nodes-') && key !== 'nodes-talk' && d.file) // the talk is a presentation, not a stage
    .map(([key, d]) => ({ key, file: d.file!, title: d.title || key, earlier: /earlier/.test(key) }))
    .sort((a, b) => Number(a.earlier) - Number(b.earlier));
}

/** A stage's file, from the page around the lab (its address is the site's, not the frame's). */
function address(file: string): string {
  try {
    const page = window.parent && window.parent !== window ? window.parent.location.href : new URL('..', location.href).href;
    return new URL(file, page).href;
  } catch { return file; }
}

/** Add a Nodes stage's slides after the slide on screen, each marked as the challenge it belongs to. */
export async function addNodesStage(stage: NodesStage): Promise<void> {
  const { showToast } = useStore.getState();
  let deck: Deck;
  try {
    const r = await fetch(address(stage.file));
    if (!r.ok) throw new Error(String(r.status));
    deck = await r.json() as Deck;
  } catch { showToast('That Nodes stage could not be loaded'); return; }
  const slides = (deck.slides ?? []).map((s) => ({ ...cloneSlide(s), nodes: { stage: stage.key, title: stage.title } }));
  if (!slides.length) { showToast('That Nodes stage has no slides'); return; }
  const { addSlide } = useStore.getState();
  slides.forEach((s) => addSlide(s));
  useStore.setState({ slideId: slides[0].id, selectedId: null });
  showToast(`${stage.title} added: ${slides.length} slides. Edit them on the slide; the teaching notes are in the speaker notes.`);
}

/** The stage list, with Add on each: the left pane, and the empty studio's starters. */
export function NodesList({ compact }: { compact?: boolean }) {
  const [busy, setBusy] = useState('');
  const stages = nodesStages();
  if (!stages.length) return <div className="hint">No Nodes stages ship with this version.</div>;
  const add = (s: NodesStage) => { if (busy) return; setBusy(s.key); void addNodesStage(s).finally(() => setBusy('')); };
  return (
    <div className={`nodes-list${compact ? ' compact' : ''}`}>
      {stages.map((s) => (
        <button key={s.key} className="empty-pick nodes-pick" disabled={!!busy} onClick={() => add(s)} title="Add this stage after the slide on screen">
          <b>{busy === s.key ? 'Adding…' : s.title}</b>
          <span>{s.earlier ? 'Earlier version' : 'Designed stage'}</span>
        </button>
      ))}
    </div>
  );
}

/** The Nodes studio's left pane. */
export function NodesPanel() {
  return (
    <aside className="left" aria-label="Nodes">
      <div className="panel-head">Nodes stages</div>
      <div className="panel-scroll nodes-panel">
        <p className="nodes-blurb">A Nodes stage is a challenge built on one command word: recall, join it up, three answers, the missing-link ladder and the marks. Add one after the slide on screen.</p>
        <NodesList />
      </div>
    </aside>
  );
}

/** The studio's + buttons: the first stage in the list takes the keys. */
export function focusNodes() {
  (document.querySelector('.nodes-panel .nodes-pick') as HTMLButtonElement | null)?.focus();
}
