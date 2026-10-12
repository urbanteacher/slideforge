// The studio's own slideshow (lab-engine-plan M7 slice 2): the lesson without its hidden slides, drawn by the
// DeckPlayer on a full-viewport stage, with a small bar that hides itself. With `room`, the show also runs a
// live room (live/) and the wall (WallViews.tsx) lays over the slide: Next, Space and the arrows step the room as
// classic's live gate does (wallModel.ts nextAction), and the player follows the room's step: a question's
// slide, then its answer slide once it is revealed.

import { ArrowLeft, ArrowRight, Maximize, Radio, StickyNote, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeckPlayer, videoEmbed } from '../engine';
import { useStore } from '../store';
import './show.css';
import { shownDeck, slideFor, stepAt, stepsOf } from './steps';
import { joinFallback, openStudioShow, studioRoomEnabled, useShow } from './state';
import { useRoom } from './useRoom';
import { Ended, Leaderboard, Lobby, QuestionStrip, RevealStrip } from './WallViews';
import { nextAction, wallOf } from './wallModel';

const BAR_HIDE_MS = 2600;

export function ShowLayer() {
  const open = useShow((s) => s.open);
  const room = useShow((s) => s.room);
  // Host live from the plain show opens it again as a room: a new show, so a new player and a new room.
  return open ? <Show key={room ? 'room' : 'plain'} /> : null;
}

function Show() {
  const full = useStore((s) => s.deck);
  const { room: roomOn, slideId } = useShow.getState(); // read once: a show is opened plain or as a room, and does not change
  const deck = useMemo(() => shownDeck(full), []); // the lesson as it was when the show opened
  const { show, steps } = useMemo(() => stepsOf(deck), [deck]);
  const start = useMemo(() => {
    const at = full.slides.findIndex((x) => x.id === slideId);
    const next = full.slides.slice(Math.max(0, at)).find((x) => !x.hidden) ?? full.slides.find((x) => !x.hidden);
    return Math.max(0, deck.slides.findIndex((x) => x.id === next?.id));
  }, [deck, full, slideId]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef<DeckPlayer | null>(null);
  const [index, setIndex] = useState(start);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [notes, setNotes] = useState(false);
  const [scoresOn, setScoresOn] = useState(false);
  const [bar, setBar] = useState(true);
  const [toast, setToast] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const room = useRoom(show, roomOn);
  const roomRef = useRef(room);
  roomRef.current = room;

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    roomRef.current.end();
    const id = deck.slides[player.current?.index ?? 0]?.id;
    if (id) useStore.getState().selectSlide(id);
    useShow.setState({ open: false, room: false });
  }, [deck]);

  const say = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  // What one Next does: in the lobby, start the room; otherwise the slide's own builds first, then the room
  // (or, without one, the next slide).
  const next = useCallback(() => {
    const p = player.current, r = roomRef.current;
    if (!p) return;
    if (!roomOn) { p.next(); return; }
    const act = nextAction({ room: r.state, steps, at: r.at, sinceAsked: r.sinceAsked() });
    if (act === 'start') { r.begin(stepAt(steps, p.index)); return; }
    if (act === 'wait' && (r.at < 0 || r.state.phase === 'lobby')) { say('Waiting for players to join'); return; }
    if (p.settle() || p.build()) return;
    if (act === 'ask' || act === 'reveal' || act === 'advance') r.next();
    else if (act === 'wait') say('Give them a moment, then press Next to show the answer');
    else if (act === 'end') exit();
  }, [roomOn, steps, exit]);

  const prev = useCallback(() => {
    const p = player.current, r = roomRef.current;
    if (!p) return;
    if (!roomOn) { p.prev(); return; }
    if (r.at > 0) r.goTo(r.at - 1);
  }, [roomOn]);

  const nextRef = useRef(next), prevRef = useRef(prev);
  nextRef.current = next;
  prevRef.current = prev;

  const fit = useCallback(() => {
    const k = Math.min(innerWidth / deck.width, innerHeight / deck.height);
    setSize({ w: Math.floor(deck.width * k), h: Math.floor(deck.height * k) });
  }, [deck]);
  useEffect(() => { fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit); }, [fit]);

  useEffect(() => {
    const p = new DeckPlayer(canvasRef.current!, deck, {
      start, onChange: (i) => setIndex(i),
      host: { next: () => nextRef.current(), prev: () => prevRef.current() },
    });
    player.current = p;
    return () => { p.destroy(); player.current = null; };
  }, [deck, start]);

  // The player follows the room: the question's slide, and its answer slide once it is revealed.
  const step = room.at >= 0 ? steps[room.at] : undefined;
  const revealed = !!step?.room.quiz && room.state.revealed.includes(step.room.quiz.id);
  const target = roomOn && step ? slideFor(step, revealed) : null;
  useEffect(() => {
    const p = player.current;
    if (target == null || !p || p.index === target) return;
    p.goto(target, target > p.index ? 1 : -1, target < p.index);
  }, [target]);

  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => say('The browser did not allow full screen'));
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const onControl = !!t && /^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      // The show has the keyboard: a key pressed here never reaches the studio behind it.
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if ((k === ' ' || k === 'Enter') && onControl) return; // a focused button is pressed, not Next
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); nextRef.current(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prevRef.current(); }
      else if (k === 'Escape') { if (!document.fullscreenElement) exit(); }
      else if (k === 'Home' && !roomOn) player.current?.goto(0, -1, true);
      else if (k === 'End' && !roomOn) player.current?.goto(deck.slides.length - 1, 1, true);
      else if (k === 'n' || k === 'N') setNotes((v) => !v);
      else if (k === 'f' || k === 'F') toggleFs();
      else if ((k === 's' || k === 'S') && roomOn) setScoresOn((v) => !v);
    };
    (document.activeElement as HTMLElement | null)?.blur?.();
    addEventListener('keydown', on, true);
    return () => removeEventListener('keydown', on, true);
  }, [exit, roomOn, deck, toggleFs]);

  const wake = useCallback(() => {
    setBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBar(false), BAR_HIDE_MS);
  }, []);
  useEffect(() => { wake(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [wake]);

  const slide = deck.slides[index];
  const embeds = slide.layers.filter((l) => l.kind === 'video' && l.visible && l.box && videoEmbed(l.params)).map((l) => ({ id: l.id, box: l.box!, src: videoEmbed(l.params), title: l.name }));
  const wall = roomOn ? wallOf({ room: room.state, steps, at: room.at, scoresOn, fallbackJoin: joinFallback() }) : null;
  const lobby = wall?.view === 'lobby' || wall?.view === 'connecting';

  return (
    <div className="show" role="dialog" aria-label="Slideshow" onMouseMove={wake} onFocus={wake}>
      <div className="show-stage" style={{ width: size.w, height: size.h }} onClick={() => nextRef.current()}>
        <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} aria-label={slide.name} />
        {embeds.map((e) => (
          <iframe key={`${index}-${e.id}`} className="show-embed" src={e.src} title={e.title}
            style={{ left: `${(e.box.x / deck.width) * 100}%`, top: `${(e.box.y / deck.height) * 100}%`, width: `${(e.box.w / deck.width) * 100}%`, height: `${(e.box.h / deck.height) * 100}%` }}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ))}
      </div>

      {wall && (
        <div className="wall-layer" style={{ ['--u' as string]: 'calc(100vw / 1920)' }} data-view={wall.view}>
          {lobby && <Lobby wall={wall} connected={room.state.connected} error={room.state.error} onStart={() => nextRef.current()} />}
          {wall.view === 'question' && wall.question && <QuestionStrip q={wall.question} />}
          {wall.view === 'reveal' && wall.question && <RevealStrip q={wall.question} />}
          {wall.view === 'leaderboard' && <Leaderboard wall={wall} />}
          {wall.view === 'ended' && <Ended />}
          {!room.state.connected && room.state.pin && !room.state.ended && <p className="wall-reconnect" role="status">Reconnecting to the room…</p>}
        </div>
      )}

      {notes && <aside className="show-notes" aria-label="Speaker notes"><h4>Notes · slide {index + 1}</h4>{slide.notes || <span className="dim">No notes for this slide.</span>}</aside>}
      <div className="show-toast" role="status" aria-live="polite">{toast}</div>

      <div className={`show-bar${bar ? ' on' : ''}`} role="toolbar" aria-label="Slideshow controls">
        <button onClick={() => prevRef.current()} aria-label="Previous"><ArrowLeft size={16} /></button>
        <button onClick={() => nextRef.current()} aria-label="Next"><ArrowRight size={16} /></button>
        <span className="show-count" aria-label={`Slide ${index + 1} of ${deck.slides.length}`}>{index + 1} / {deck.slides.length}</span>
        <button onClick={() => setNotes((v) => !v)} aria-pressed={notes} aria-label="Speaker notes (N)" title="Speaker notes (N)"><StickyNote size={16} /></button>
        {roomOn && <button onClick={() => setScoresOn((v) => !v)} aria-pressed={scoresOn} aria-label="Scores (S)" title="Scores (S)"><Trophy size={16} /></button>}
        <button onClick={toggleFs} aria-label="Full screen (F)" title="Full screen (F)"><Maximize size={16} /></button>
        {!roomOn && steps.some((s) => s.room.quiz) && studioRoomEnabled() && (
          <button className="show-live" onClick={() => openStudioShow({ room: true, slideId: slide.id })} title="Run this lesson live with phones"><Radio size={15} />Host live</button>
        )}
        <button onClick={exit} aria-label={roomOn ? 'End the room and exit' : 'Exit'} title={roomOn ? 'End the room and exit (Esc)' : 'Exit (Esc)'}><X size={16} />{roomOn ? 'End' : ''}</button>
      </div>
    </div>
  );
}
