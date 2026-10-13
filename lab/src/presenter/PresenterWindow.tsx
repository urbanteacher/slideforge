// The Teacher Presenter window: the lab-app opened with ?presenter=1 (main.tsx), showing only this. It asks the
// show for its deck over the channel (protocol.ts), draws the current slide and the next with DeckPlayers, and shows
// the notes, the clocks, the room's status, and the controls. The show does what a command asks as its own keys would.

import { useEffect, useMemo, useRef, useState } from 'react';
import { DeckPlayer } from '../engine';
import type { Deck } from '../core';
import { WindowSide, type CmdData, type PresenterCmd, type PresenterState } from './protocol';
import { QuickPollForm } from './RoomDesk';
import { clock, parseCountdown, remaining } from './timer';
import './presenter.css';

/** One slide, settled (its builds done), on a canvas that takes no clicks. */
function SlidePane({ deck, index, label }: { deck: Deck; index: number | null; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const player = useRef<DeckPlayer | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const p = new DeckPlayer(ref.current, deck, { start: index ?? 0, host: { next: () => {}, prev: () => {} } });
    player.current = p;
    return () => { p.destroy(); player.current = null; };
  }, [deck]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = player.current;
    if (p && index != null && p.index !== index) p.goto(index, index > p.index ? 1 : -1, true);
  }, [index]);
  return (
    <div className="pw-pane" style={{ aspectRatio: `${deck.width} / ${deck.height}` }}>
      <canvas ref={ref} aria-label={label} style={{ visibility: index == null ? 'hidden' : 'visible' }} />
      {index == null && <span className="pw-end">End of the lesson</span>}
    </div>
  );
}

/** Close this window; one a script did not open cannot be closed, so it goes back to the studio instead. */
function closeWindow() {
  window.close();
  setTimeout(() => { if (!window.closed) location.href = location.pathname.replace(/lab-app\/.*$/, ''); }, 150);
}

export function PresenterWindow() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [st, setSt] = useState<PresenterState | null>(null);
  const [gone, setGone] = useState(false);
  const side = useRef<WindowSide | null>(null);
  const [now, setNow] = useState(Date.now());
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [typed, setTyped] = useState('10');
  const [jump, setJump] = useState('');
  const [pollOpen, setPollOpen] = useState(false);

  useEffect(() => {
    document.title = 'Teacher Presenter';
    const w = new WindowSide({ deck: (d, s) => { setDeck(d); setSt(s); setGone(false); }, state: (s) => { setSt(s); setGone(false); }, bye: () => setGone(true) });
    side.current = w;
    // A show that opens after this window is asked again until it answers.
    const again = setInterval(() => { if (!deckRef.current) w.hello(); }, 1500);
    return () => { clearInterval(again); w.close(); side.current = null; };
  }, []);
  const deckRef = useRef<Deck | null>(null);
  deckRef.current = deck;
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  const send = (cmd: PresenterCmd, n?: number, data?: CmdData) => side.current?.send(cmd, n, data);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); send('next'); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); send('prev'); }
      else if (e.key === 'b' || e.key === 'B' || e.key === '.') send('black');
      else if (e.key === 'w' || e.key === 'W') send('white');
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);

  const left = useMemo(() => (endsAt == null ? null : remaining(endsAt, now)), [endsAt, now]);
  const notesKey = st ? `${st.index}` : '';
  const notesRef = useRef<HTMLDivElement>(null);
  useEffect(() => { notesRef.current?.scrollTo({ top: 0 }); }, [notesKey]);

  if (!deck || !st) {
    return <div className="pw pw-wait"><h1>Teacher Presenter</h1><p>{gone ? 'The show has ended.' : 'Waiting for a show. Press Present in the studio, then open this window from its bar.'}</p><p><button onClick={closeWindow}>Close window</button></p></div>;
  }
  const room = st.room;
  const nextIndex = st.index + 1 < st.total ? st.index + 1 : null;
  return (
    <div className="pw">
      <header className="pw-top">
        <b>{st.deck || 'Lesson'}</b>
        <span className="pw-count">{st.index + 1} / {st.total}</span>
        <span className="pw-clock" title="Time since the show began">{clock((now - st.startedAt) / 1000)}</span>
        <span className="pw-down" data-over={left != null && left < 0 ? '1' : undefined}>
          {left == null ? (
            <>
              <input aria-label="Countdown (minutes, 5:30, or 90s)" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const s = parseCountdown(typed); if (s) setEndsAt(Date.now() + s * 1000); } }} />
              <button onClick={() => { const s = parseCountdown(typed); if (s) setEndsAt(Date.now() + s * 1000); }}>Start countdown</button>
            </>
          ) : (
            <><span className="pw-left">{left < 0 ? '-' : ''}{clock(Math.abs(left))}</span><button onClick={() => setEndsAt(null)}>Clear</button></>
          )}
        </span>
        {gone && <span className="pw-gone">The show has ended</span>}
      </header>
      <main className="pw-main">
        <section className="pw-now"><SlidePane deck={deck} index={st.index} label={`Slide ${st.index + 1}: ${st.title}`} /><h2>{st.title}</h2>
          {st.figure && <p className="pw-figure" role="status">Figure · step {st.figure.step} of {st.figure.of}{st.figure.caption ? ` · ${st.figure.caption}` : ''}{st.figure.step < st.figure.of ? ' · Next steps the figure' : ''}</p>}
        </section>
        <aside className="pw-side">
          <h3>Next</h3>
          <SlidePane deck={deck} index={nextIndex} label={st.nextTitle || 'Next slide'} />
          <p className="pw-next-title">{st.nextTitle}</p>
          {room && (
            <div className="pw-room" aria-label="Room status">
              <h3>Room</h3>
              <p>PIN <b>{room.pin ?? '…'}</b>{room.connected ? '' : ' (reconnecting)'}</p>
              <p>{room.players} {room.players === 1 ? 'player' : 'players'} · {room.view}</p>
              {room.open && <p>{room.answered} of {room.total} answered</p>}
              {room.view === 'reveal' || room.revealed ? <p>Answer revealed</p> : null}
              {room.stage && <p>{room.stage.name} · {room.stage.wall}{room.stage.written ? ` · ${room.stage.written}` : ''}</p>}
              {room.stage && room.stage.help > 0 && <p className="pw-help" role="status">{room.stage.help} {room.stage.help === 1 ? 'asks' : 'ask'} for help</p>}
              {pollOpen && (room.quick || room.canPoll) && (
                <section className="pw-desk" aria-label="Quick poll"><h3>Quick poll</h3>
                  <QuickPollForm open={!!room.quick} onAsk={(a) => { send('poll', undefined, { poll: a }); setPollOpen(false); return ''; }} onEnd={() => send('close')} />
                </section>
              )}
            </div>
          )}
        </aside>
      </main>
      <section className="pw-notes" ref={notesRef} aria-label="Speaker notes">{st.notes || <span className="pw-dim">No notes for this slide.</span>}</section>
      <footer className="pw-controls" role="toolbar" aria-label="Show controls">
        <button onClick={() => send('prev')}>Back</button>
        <button className="pw-primary" onClick={() => send('next')}>Next</button>
        {room && <button onClick={() => send('reveal')} disabled={!room.open}>Reveal</button>}
        {room?.canShow && <button onClick={() => send('open')}>Show results</button>}
        {room?.canClose && <button onClick={() => send('close')}>Close prompt</button>}
        {room?.stage && <button onClick={() => send('more')}>+30s</button>}
        {room && <button onClick={() => setPollOpen((v) => !v)} aria-pressed={pollOpen || !!room.quick} disabled={!room.quick && !room.canPoll} title="Ask the room something on the fly">Quick poll</button>}
        <button onClick={() => send(st.screen === 'black' ? 'resume' : 'black')} aria-pressed={st.screen === 'black'}>Black</button>
        <button onClick={() => send(st.screen === 'white' ? 'resume' : 'white')} aria-pressed={st.screen === 'white'}>White</button>
        <form onSubmit={(e) => { e.preventDefault(); const n = Number(jump); if (n >= 1) send('goto', n); setJump(''); }}>
          <input aria-label="Jump to slide number" inputMode="numeric" placeholder="Slide #" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} />
          <button type="submit">Go</button>
        </form>
        <button className="pw-end-btn" onClick={() => send('end')}>End show</button>
        <button onClick={closeWindow} title="Close this window and go back">Close window</button>
      </footer>
    </div>
  );
}
