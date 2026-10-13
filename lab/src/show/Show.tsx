// The studio's own slideshow (lab-engine-plan M7 slice 2): the lesson without its hidden slides, drawn by the
// DeckPlayer on a full-viewport stage, with a small bar that hides itself. With `room`, the show also runs a
// live room (live/) and the wall (WallViews.tsx) lays over the slide: Next, Space and the arrows step the room as
// classic's live gate does (wallModel.ts nextAction), and the player follows the room's step: a question's
// slide, then its answer slide once it is revealed.

import { ArrowLeft, ArrowRight, CircleStop, Eye, Keyboard, LayoutGrid, Maximize, Monitor, MonitorOff, PenLine, Radio, Smartphone, Users, StickyNote, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeckPlayer, videoEmbed } from '../engine';
import { ShowSide, presenterUrl, type PresenterCmd, type Screen } from '../presenter';
import { useStore } from '../store';
import './show.css';
import { shownDeck, slideFor, stepAt, stepsOf } from './steps';
import { Boundary } from './Boundary';
import { gridMove, jumpTarget, presenterState, prompterFrame, pushDigit } from './desk';
import { PrompterLink, prompterLinkFor } from './prompter';
import { Elapsed, NotesCard, Overview, RehearseCard, ScreenCover } from './ShowTools';
import { joinFallback, manualPage, openStudioShow, prompterPage, relayUrl, studioRoomEnabled, useShow } from './state';
import { useRoom } from './useRoom';
import { FeedbackView } from './FeedbackViews';
import { ReportScreen } from './ReportScreen';
import { Ink } from './ink';
import { InkBar, InkCanvas } from './InkLayer';
import { SimulatedClass } from '../rehearse';
import { MechanicViews } from './MechanicViews';
import { Ended, Leaderboard, Lobby, QuestionStrip, RailView, RevealStrip } from './WallViews';
import { nextAction, wallOf } from './wallModel';

const BAR_HIDE_MS = 2600;
/** The standings rail's width, in pixels of a 1920-wide screen (classic's rail is 300 of 720 beside the slide). */
const RAIL_U = 420;
/** A feedback prompt's rail is wider: poll labels and ideas need the room at wall size. */
const FEEDBACK_RAIL_U = 560;

/** The show broke, or its room could not start. Before anyone has joined the lesson goes back to the shell to be
 *  hosted the classic way; once the room has begun it is only ended, with a word to the teacher. */
function giveUp(reason: string): void {
  const { hooks, begun } = useShow.getState();
  useShow.setState({ open: false, room: false });
  if (!begun && hooks?.fallback) hooks.fallback(reason);
  else { hooks?.toast?.(begun ? `The studio's room stopped: ${reason}. The room has ended.` : reason); hooks?.exited?.(); }
}

export function ShowLayer() {
  const open = useShow((s) => s.open);
  const room = useShow((s) => s.room);
  // Host live from the plain show opens it again as a room: a new show, so a new player and a new room.
  return open ? <Boundary key={room ? 'room' : 'plain'} onError={giveUp}><Show /></Boundary> : null;
}

function Show() {
  const full = useStore((s) => s.deck);
  const { room: roomOn, slideId, hooks, rehearse: rehearse0 } = useShow.getState(); // read once: a show is opened plain or as a room, and does not change
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
  /** The room has been ended from the show: the final standings are up, and the next exit leaves the show. */
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const failed = useRef(false);
  const [bar, setBar] = useState(true);
  const [toast, setToast] = useState('');
  // M11a: the screen blanked, the overview, a slide number being typed, the notes card, and when the show began.
  const [screen, setScreen] = useState<Screen>('none');
  const screenRef = useRef<Screen>('none');
  screenRef.current = screen;
  const [overview, setOverview] = useState<number | null>(null);
  const overviewRef = useRef<number | null>(null);
  overviewRef.current = overview;
  const [jump, setJump] = useState('');
  const jumpRef = useRef('');
  jumpRef.current = jump;
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notesCard, setNotesCard] = useState(false);
  // Draw: the ink over the slide (ink.ts), whether it takes the pointer, and a count that repaints it.
  const ink = useRef(new Ink()).current;
  const [inkOn, setInkOn] = useState(false);
  const inkOnRef = useRef(false);
  inkOnRef.current = inkOn;
  const [inkV, setInkV] = useState(0);
  const inkChanged = useCallback(() => setInkV((v) => v + 1), []);
  const [reportOpen, setReportOpen] = useState(false);
  /** Rehearse: the size of the simulated class in the room (0 none), and whether its card is up. */
  const [rehearsing, setRehearsing] = useState(roomOn ? rehearse0 : 0);
  const [rehearseCard, setRehearseCard] = useState(false);
  const reportRef = useRef(false);
  reportRef.current = reportOpen;
  const [, repaint] = useState(0);
  const link = useRef<PrompterLink | null>(null);
  const startedAt = useRef(Date.now()).current;
  const side = useRef<ShowSide | null>(null);
  const deskRef = useRef<{ wall: ReturnType<typeof wallOf> | null; fb: { hold: boolean; shown: boolean } | null }>({ wall: null, fb: null });
  const runRef = useRef<(cmd: PresenterCmd, n?: number) => void>(() => {});
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  // The relay did not answer: the shell hosts the lesson the classic way, with a word about why (giveUp).
  const fail = useCallback((reason: string) => {
    if (failed.current) return;
    failed.current = true;
    if (hooks?.fallback) giveUp(reason); else say(reason);
  }, [hooks]);
  const room = useRoom(show, roomOn, { hooks, onFail: fail });
  const roomRef = useRef(room);
  roomRef.current = room;
  useEffect(() => { if (room.at >= 0) useShow.setState({ begun: true }); }, [room.at]);
  // Rehearse: a simulated class joins the real room by its PIN, and leaves when the room ends, the show closes or the PIN changes (a new room).
  const pin = room.state.pin, over = room.state.ended || finished;
  useEffect(() => {
    if (!roomOn || !rehearsing || !pin || over) return;
    const c = new SimulatedClass({ url: relayUrl(), pin, show, size: rehearsing });
    c.start();
    return () => c.stop();
  }, [roomOn, rehearsing, pin, over, show]);

  /** Leave the show: back to the editor, on the slide the show was on. */
  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    const id = deck.slides[player.current?.index ?? 0]?.id;
    if (id) useStore.getState().selectSlide(id);
    useShow.setState({ open: false, room: false });
    hooks?.exited?.(id);
  }, [deck, hooks]);

  // Esc, End and the end of the lesson. A room that has begun is ended first and its final standings stay up, with
  // the way to the report; the next exit leaves the show. A room nobody began leaves at once.
  const exit = useCallback(() => {
    if (!roomOn || finishedRef.current) { void roomRef.current.end(); close(); return; }
    const begun = roomRef.current.at >= 0;
    void roomRef.current.end();
    if (!begun) { close(); return; }
    finishedRef.current = true;
    setFinished(true);
  }, [roomOn, close]);

  // What one Next does: in the lobby, start the room; otherwise the slide's own builds first, then the room
  // (or, without one, the next slide).
  const next = useCallback(() => {
    const p = player.current, r = roomRef.current;
    if (!p || finishedRef.current) return;
    if (screenRef.current !== 'none') { setScreen('none'); return; } // a blanked screen comes back first
    if (!roomOn) { p.next(); return; }
    const act = nextAction({ room: r.state, steps, at: r.at, sinceAsked: r.sinceAsked() });
    if (act === 'start') { r.begin(stepAt(steps, p.index)); return; }
    if (act === 'wait' && (r.at < 0 || r.state.phase === 'lobby')) { say('Waiting for players to join'); return; }
    if (p.settle()) return;
    // A build of the slide on an open question is a step of its help (Emoji guess), which the room releases with it.
    if (p.build()) { if (act === 'wait' || act === 'reveal') r.release(); return; }
    if (act === 'ask' || act === 'reveal' || act === 'advance') r.next();
    else if (act === 'wait') say('Give them a moment, then press Next to show the answer');
    else if (act === 'end') exit();
  }, [roomOn, steps, exit]);

  const prev = useCallback(() => {
    const p = player.current, r = roomRef.current;
    if (!p) return;
    if (screenRef.current !== 'none') { setScreen('none'); return; }
    if (!roomOn) { p.prev(); return; }
    if (r.at > 0) r.goTo(r.at - 1);
  }, [roomOn]);

  const nextRef = useRef(next), prevRef = useRef(prev);
  nextRef.current = next;
  prevRef.current = prev;

  /** Go to a slide of the shown deck (0 based). In a room that has begun, the room moves to that slide's step. */
  const goIndex = useCallback((i: number) => {
    const p = player.current, r = roomRef.current;
    if (!p || finishedRef.current || i < 0 || i >= deck.slides.length) return;
    setScreen('none');
    if (!roomOn) { p.goto(i, i > p.index ? 1 : -1, true); return; }
    if (r.at < 0) { say('Press Start before moving around the lesson'); return; }
    r.goTo(stepAt(steps, i));
  }, [roomOn, steps, deck]);

  /** What the Teacher Presenter window asks, done as the show's own keys and bar would. */
  const runCmd = useCallback((cmd: PresenterCmd, n?: number) => {
    const r = roomRef.current, d = deskRef.current;
    if (cmd === 'next') nextRef.current();
    else if (cmd === 'prev') prevRef.current();
    else if (cmd === 'goto') { if (n != null) goIndex(n - 1); }
    else if (cmd === 'black' || cmd === 'white') setScreen((s) => (s === cmd ? 'none' : cmd));
    else if (cmd === 'resume') setScreen('none');
    else if (cmd === 'reveal') { if (roomOn && d.wall?.view === 'question') r.next(); }
    else if (cmd === 'close') { if (roomOn) r.closeFeedback(); }
    else if (cmd === 'open') { if (roomOn) r.showFeedback(); }
    else if (cmd === 'end') exit();
  }, [roomOn, goIndex, exit]);
  runRef.current = runCmd;

  // The slide is drawn in what the standings rail leaves of the screen (classic scales its slide the same way).
  const railU = useRef(0);
  const fit = useCallback(() => {
    const room = innerWidth * railU.current / 1920;
    const k = Math.min((innerWidth - room) / deck.width, innerHeight / deck.height);
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
  const asked = !!step?.room.quiz && room.state.question?.id === step.room.quiz.id;
  const target = roomOn && step ? slideFor(step, revealed, asked) : null;
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
      // The overview has the keys while it is up: arrows move, Enter goes, Esc and O close it.
      const ov = overviewRef.current;
      if (ov != null) {
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(k)) { e.preventDefault(); setOverview(gridMove(ov, k, deck.slides.length)); }
        else if (k === 'Escape' || k === 'o' || k === 'O') { e.preventDefault(); setOverview(null); }
        else if (k === 'Enter' && !onControl) { e.preventDefault(); setOverview(null); goIndex(ov); }
        return;
      }
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) { if (k === 'Escape') t.blur(); return; } // typing (the class list) is not a show key
      if (reportRef.current) { if (k === 'Escape') setReportOpen(false); return; } // the report page scrolls and reads; only Esc is the show's
      if ((k === ' ' || k === 'Enter') && onControl) return; // a focused button is pressed, not Next
      // A slide number typed (digits, then Enter): the jump. Esc clears it.
      const digits = pushDigit(jumpRef.current, k);
      if (digits != null) {
        setJump(digits);
        if (jumpTimer.current) clearTimeout(jumpTimer.current);
        jumpTimer.current = setTimeout(() => setJump(''), 2500);
        return;
      }
      if (jumpRef.current && k === 'Enter') {
        e.preventDefault();
        const to = jumpTarget(jumpRef.current, deck.slides.length);
        setJump('');
        if (to == null) say(`There is no slide ${jumpRef.current}`); else goIndex(to);
        return;
      }
      if (jumpRef.current && k === 'Escape') { setJump(''); return; }
      if (k === 'd' || k === 'D') { setInkOn((v) => !v); return; }
      if (inkOnRef.current) {
        if (k === 'Escape') { setInkOn(false); return; }
        if (k === 'z' || k === 'Z') { ink.undo(); inkChanged(); return; }
        if (k === 'x' || k === 'X') { ink.clear(); inkChanged(); return; }
      }
      if (k === 'b' || k === 'B' || k === '.') { runRef.current('black'); return; }
      if (k === 'w' || k === 'W' || k === ',') { runRef.current('white'); return; }
      if (k === 'o' || k === 'O') { setOverview(player.current?.index ?? 0); return; }
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
  }, [exit, roomOn, deck, toggleFs, goIndex, ink, inkChanged]);

  const wake = useCallback(() => {
    setBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBar(false), BAR_HIDE_MS);
  }, []);
  useEffect(() => { wake(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [wake]);

  const slide = deck.slides[index];
  // The marks belong to the slide on the wall: leaving it clears them (as classic's ink does).
  useEffect(() => { ink.setSlide(String(index)); inkChanged(); }, [index, ink, inkChanged]);
  const embeds = slide.layers.filter((l) => l.kind === 'video' && l.visible && l.box && videoEmbed(l.params)).map((l) => ({ id: l.id, box: l.box!, src: videoEmbed(l.params), title: l.name }));
  const wall = roomOn ? wallOf({ room: room.state, steps, at: room.at, before: room.before, teamBefore: room.teamBefore, scoresOn, fallbackJoin: joinFallback() }) : null;
  const fbOpen = roomOn && !finished && wall?.view === 'feedback' ? room.state.feedback : null;
  const lobby = wall?.view === 'lobby' || wall?.view === 'connecting';
  const view = finished ? 'ended' : wall?.view;
  const rail = wall && !finished && ['question', 'reveal', 'slide'].includes(wall.view) ? wall.rail : null;
  const fbRail = !finished && ['feedback', 'reveal'].includes(wall?.view ?? '') && wall?.feedback?.presentAs === 'rail';
  const railWidth = fbRail ? FEEDBACK_RAIL_U : rail ? RAIL_U : 0;
  useEffect(() => { railU.current = railWidth; fit(); }, [railWidth, fit]);

  // The Teacher Presenter window follows the show over a BroadcastChannel; with none open this does nothing.
  const desk = presenterState({
    deck, index, startedAt, screen,
    room: roomOn ? { wall, connected: room.state.connected, pin: room.state.pin, canClose: !!fbOpen, canShow: !!fbOpen && fbOpen.prompt.hold === true && !fbOpen.shown } : null,
  });
  deskRef.current = { wall, fb: fbOpen ? { hold: !!fbOpen.prompt.hold, shown: fbOpen.shown } : null };
  const deskNow = useRef(desk);
  deskNow.current = desk;
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const sd = new ShowSide(deck, deskNow.current, (cmd, n) => runRef.current(cmd, n));
    side.current = sd;
    return () => { sd.close(); side.current = null; };
  }, [deck]);
  const deskKey = JSON.stringify(desk);
  useEffect(() => { side.current?.publish(deskNow.current); }, [deskKey]);

  // Notes on another device: the frame follows the slide; the channel ends with the show.
  useEffect(() => { link.current?.send(prompterFrame(deck, index, startedAt)); }, [deck, index, startedAt]);
  useEffect(() => () => { link.current?.stop(); link.current = null; }, []);
  const notesElsewhere = () => {
    setNotesCard(true);
    if (link.current && !link.current.closed) return;
    const l = new PrompterLink({
      url: relayUrl(), link: (id) => prompterLinkFor(id, prompterPage()),
      onCmd: (c) => (c === 'next' ? nextRef.current() : prevRef.current()), onChange: () => repaint((n) => n + 1),
    });
    link.current = l;
    l.send(prompterFrame(deck, player.current?.index ?? index, startedAt));
    l.start();
  };
  const openPresenter = () => {
    const w = window.open(presenterUrl(), 'slideforge-presenter', 'width=1180,height=780');
    if (!w) say('Pop-ups are blocked. Allow them to use the Teacher Presenter.'); else w.focus();
  };
  // The shell's Teacher Presenter and Notes on another device open the show with the desk, or the notes card, already up.
  useEffect(() => {
    const first = useShow.getState().first;
    if (first === 'desk') openPresenter();
    else if (first === 'notes') notesElsewhere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openEntry = () => {
    const hash = room.manualHash();
    if (!hash) { say('The room is not open yet'); return; }
    const w = window.open(manualPage() + hash, 'slideforge-teacher', 'width=760,height=780');
    if (!w) say('Pop-ups are blocked. Allow them to use teacher entry.'); else w.focus();
  };

  return (
    <div className={`show${railWidth ? ' has-rail' : ''}`} role="dialog" aria-label="Slideshow" onMouseMove={wake} onFocus={wake} style={{ ['--u' as string]: 'calc(100vw / 1920)', ['--rail-w' as string]: railWidth || undefined }}>
      <div className="show-stage" style={{ width: size.w, height: size.h }} onClick={() => nextRef.current()}>
        <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} aria-label={slide.name} />
        <InkCanvas ink={ink} on={inkOn} w={size.w} h={size.h} version={inkV} onChange={inkChanged} />
        {embeds.map((e) => (
          <iframe key={`${index}-${e.id}`} className="show-embed" src={e.src} title={e.title}
            style={{ left: `${(e.box.x / deck.width) * 100}%`, top: `${(e.box.y / deck.height) * 100}%`, width: `${(e.box.w / deck.width) * 100}%`, height: `${(e.box.h / deck.height) * 100}%` }}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ))}
      </div>

      {wall && (
        <div className="wall-layer" data-view={view}>
          {lobby && !finished && <Lobby wall={wall} connected={room.state.connected} error={room.state.error} onStart={() => nextRef.current()} onRoster={room.state.pin ? room.addNames : undefined} />}
          {!finished && wall.view === 'question' && wall.question && (wall.question.locked ? <RevealStrip q={wall.question} /> : <QuestionStrip key={wall.question.text} q={wall.question} askedAt={room.askedAt()} />)}
          {!finished && wall.view === 'reveal' && wall.question && <RevealStrip q={wall.question} />}
          {!finished && wall.view === 'leaderboard' && <Leaderboard wall={wall} />}
          {!finished && ['question', 'reveal', 'leaderboard'].includes(wall.view) && <MechanicViews mech={wall.mech} scores={wall.view === 'leaderboard'} />}
          {rail && <RailView rail={rail} />}
          {!finished && ['feedback', 'reveal'].includes(wall.view) && wall.feedback && <FeedbackView fb={wall.feedback} />}
          {(finished || wall.view === 'ended') && (
            <Ended wall={wall} closing={!room.state.ended} onClose={close}
              onReport={room.state.session ? () => setReportOpen(true) : undefined}
              onShellReport={hooks?.reports && room.state.session ? () => hooks.reports!.open() : undefined} />
          )}
          {!room.state.connected && room.state.pin && !room.state.ended && <p className="wall-reconnect" role="status">Reconnecting to the room…</p>}
        </div>
      )}

      {reportOpen && room.state.session && <ReportScreen relay={relayUrl()} session={room.state.session} points={room.state.scores} onClose={() => setReportOpen(false)} />}
      {notes && <aside className="show-notes" aria-label="Speaker notes"><h4>Notes · slide {index + 1}</h4>{slide.notes || <span className="dim">No notes for this slide.</span>}</aside>}
      <ScreenCover screen={screen} onResume={() => setScreen('none')} />
      {overview != null && <Overview slides={deck.slides} current={index} at={overview} onGo={(i) => { setOverview(null); goIndex(i); }} onClose={() => setOverview(null)} />}
      {notesCard && (
        <NotesCard link={link.current} onClose={() => setNotesCard(false)}
          onStop={() => { link.current?.stop(); repaint((n) => n + 1); }}
          onCopy={(url) => { void navigator.clipboard?.writeText(url).then(() => say('Notes link copied'), () => say('Could not copy the link')); }} />
      )}
      {inkOn && <InkBar ink={ink} version={inkV} onChange={inkChanged} onDone={() => setInkOn(false)} />}
      {rehearseCard && (
        <RehearseCard size={rehearsing} inRoom={roomOn} onClose={() => setRehearseCard(false)}
          onPick={(n) => { setRehearseCard(false); if (roomOn) { setRehearsing(n); say(`A rehearsal class of ${n} is joining`); } else openStudioShow({ room: true, slideId: slide.id, rehearse: n }); }}
          onStop={() => { setRehearsing(0); say('The rehearsal class has gone home'); }} />
      )}
      {jump && <div className="show-jump" role="status" aria-label="Go to slide">Go to {jump}</div>}
      <div className="show-toast" role="status" aria-live="polite">{toast}</div>

      {/* The bar hides itself, so the way out never does: a small button in the corner, always there. */}
      <button className="show-exit" onClick={exit} aria-label={roomOn ? 'End the room and exit' : 'Exit the slideshow'} title={roomOn ? 'End the room and exit (Esc)' : 'Exit (Esc)'}><X size={16} />{roomOn ? 'End room' : 'Exit'}</button>
      <div className={`show-bar${bar ? ' on' : ''}`} role="toolbar" aria-label="Slideshow controls">
        <button onClick={() => prevRef.current()} aria-label="Previous"><ArrowLeft size={16} /></button>
        <button onClick={() => nextRef.current()} aria-label="Next"><ArrowRight size={16} /></button>
        <span className="show-count" aria-label={`Slide ${index + 1} of ${deck.slides.length}`}>{index + 1} / {deck.slides.length}</span>
        <button onClick={() => setNotes((v) => !v)} aria-pressed={notes} aria-label="Speaker notes (N)" title="Speaker notes (N)"><StickyNote size={16} /></button>
        <button onClick={() => setInkOn((v) => !v)} aria-pressed={inkOn} aria-label="Draw (D)" title="Draw on the slide (D): pen, highlighter, eraser"><PenLine size={16} /></button>
        <button onClick={() => setOverview(index)} aria-label="Slide overview (O)" title="Slide overview (O). Type a number and Enter to jump"><LayoutGrid size={16} /></button>
        <button onClick={() => runCmd(screen === 'black' ? 'resume' : 'black')} aria-pressed={screen === 'black'} aria-label="Black screen (B)" title="Black screen (B or .). W for white"><MonitorOff size={16} /></button>
        <button onClick={openPresenter} aria-label="Teacher Presenter" title="Teacher Presenter: notes, next slide and controls in their own window"><Monitor size={16} /></button>
        <button onClick={notesElsewhere} aria-pressed={notesCard} aria-label="Notes on another device" title="Notes on another device: a phone or prompt screen follows your notes"><Smartphone size={16} /></button>
        <Elapsed since={startedAt} />
        {fbOpen && fbOpen.prompt.hold && !fbOpen.shown && <button onClick={() => roomRef.current.showFeedback()} aria-label="Show the results" title="Show the held results"><Eye size={16} />Show</button>}
        {fbOpen && <button onClick={() => roomRef.current.closeFeedback()} aria-label="Close the prompt" title="Close the prompt: the phones are thanked"><CircleStop size={16} />Close</button>}
        {roomOn && <button onClick={() => setScoresOn((v) => !v)} aria-pressed={scoresOn} aria-label="Scores (S)" title="Scores (S)"><Trophy size={16} /></button>}
        {(roomOn || (steps.some((s) => s.room.quiz || s.room.feedback) && studioRoomEnabled())) && <button onClick={() => setRehearseCard((v) => !v)} aria-pressed={rehearsing > 0 || rehearseCard} aria-label="Rehearse" title="Rehearse with a simulated class"><Users size={16} />{rehearsing > 0 ? rehearsing : ''}</button>}
        {roomOn && <button onClick={openEntry} aria-label="Teacher entry" title="Teacher entry: add names, enter answers by key"><Keyboard size={16} /></button>}
        <button onClick={toggleFs} aria-label="Full screen (F)" title="Full screen (F)"><Maximize size={16} /></button>
        {!roomOn && steps.some((s) => s.room.quiz || s.room.feedback) && studioRoomEnabled() && (
          <button className="show-live" onClick={() => openStudioShow({ room: true, slideId: slide.id })} title="Run this lesson live with phones"><Radio size={15} />Host live</button>
        )}
        <button onClick={exit} aria-label={roomOn ? 'End the room and exit' : 'Exit'} title={roomOn ? 'End the room and exit (Esc)' : 'Exit (Esc)'}><X size={16} />{roomOn ? 'End' : ''}</button>
      </div>
    </div>
  );
}
