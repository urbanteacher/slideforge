// The studio's own slideshow (lab-engine-plan M7 slice 2): the lesson without its hidden slides, drawn by the
// DeckPlayer on a full-viewport stage, with a small bar that hides itself. With `room`, the show also runs a
// live room (live/) and the wall (WallViews.tsx) lays over the slide: Next, Space and the arrows step the room as
// classic's live gate does (wallModel.ts nextAction), and the player follows the room's step: a question's
// slide, then its answer slide once it is revealed.

import { ArrowLeft, ArrowRight, CircleStop, Columns2, Eye, Keyboard, LayoutGrid, Maximize, MessageCircleQuestion, Monitor, MonitorOff, PenLine, Radio, Share2, Smartphone, Users, QrCode, Trophy, Vote, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeckPlayer, videoEmbed } from '../engine';
import { KeySheet, QuestionsList, QuickPollForm, ROOM_VIEW_SAYS, ShowSide, controlFor, keyName, nextRoomView, presenterUrl, toggleBoard, type CmdData, type RoomView, type Screen, type ShowAction } from '../presenter';
import { FLOOR_SAYS, reactionsSay, type QuickAsk } from '../live';
import { useStore } from '../store';
import './show.css';
import { shownDeck, slideFor, stepAt, stepsOf } from './steps';
import { Boundary } from './Boundary';
import { gridMove, jumpTarget, presenterState, prompterFrame, pushDigit, whoAnswered } from './desk';
import { PrompterLink, prompterLinkFor } from './prompter';
import { qrSvg } from './qr';
import { Overview, RehearseCard, ScreenCover } from './ShowTools';
import { JoinCard } from './JoinCard';
import { joinFallback, manualPage, openStudioShow, prompterPage, relayUrl, studioRoomEnabled, useShow } from './state';
import { useRoom } from './useRoom';
import { FeedbackView } from './FeedbackViews';
import { ReportScreen } from './ReportScreen';
import { Ink } from './ink';
import { InkBar, InkCanvas } from './InkLayer';
import { SimulatedClass } from '../rehearse';
import { MechanicViews } from './MechanicViews';
import { Ended, Leaderboard, Lobby, QaCard, QuestionStrip, RailView, RevealStrip } from './WallViews';
import { SpokenPad } from './SpokenViews';
import { SpeedClock, SprintBoard } from './SpeedViews';
import { BoardView } from './BoardViews';
import { boardRevealed } from '../live';
import { nextAction, wallOf } from './wallModel';
import { ActivityStrip } from './ActivityViews';
import { FigureSteps, figureSlide } from './figure';
import { FigureLayer } from './FigureLayer';
import { ReactionBay } from './Reactions';

const BAR_HIDE_MS = 2600;
/** The standings rail's width, in pixels of a 1920-wide screen (classic's rail is 300 of 720 beside the slide). */
const RAIL_U = 420;
/** A feedback prompt's rail is wider: poll labels and ideas need the room at wall size. */
const FEEDBACK_RAIL_U = 560;

/** The show broke, or its room could not start. Before anyone has joined the shell is told, and says why; once
 *  the room has begun it is only ended, with a word to the teacher. */
function giveUp(reason: string): void {
  const { hooks, begun } = useShow.getState();
  useShow.setState({ open: false, room: false });
  if (!begun && hooks?.fallback) hooks.fallback(reason);
  else { hooks?.toast?.(begun ? `The studio's room stopped: ${reason}. The room has ended.` : reason); hooks?.exited?.(); }
}

/** The document that is full screen: the shell's page when the studio is in its frame (the shell asks for full
 *  screen on its own page at Present), else this one. The frame's own document never sees the page's full screen,
 *  so asking it would ask again rather than leave. */
function fsDoc(): Document {
  try { if (window.parent !== window && window.parent.document) return window.parent.document; } catch { /* another origin */ }
  return document;
}

/** A shared notes link as the Teacher Presenter shows it: the link, its QR, and who follows. */
function notesLinkFor(l: PrompterLink | null): { url: string; svg: string; watchers: number } | null {
  if (!l || l.closed || !l.ready) return null;
  let svg = '';
  try { svg = qrSvg(l.url, { quiet: 2, title: 'Notes link' }); } catch { /* too long for a QR: the link alone */ }
  return { url: l.url, svg, watchers: l.watchers };
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
  /** The room on the wall (E): hidden, the standings beside the slide, or the scores board (S). */
  const [roomView, setRoomView] = useState<RoomView>('beside');
  const scoresOn = roomView === 'full';
  /** The join card (J), the shortcuts sheet (?), and the desk's panel asked for from the wall (Shift+W: who answered what). */
  const [joinCard, setJoinCard] = useState(false);
  const joinRef = useRef(false);
  joinRef.current = joinCard;
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef(false);
  sheetRef.current = sheet;
  const [deskAsk, setDeskAsk] = useState(0);
  /** Freeze (Z): the wall holds its slide while the teacher moves on; this is where the teacher is (null: not frozen). */
  const [frozen, setFrozen] = useState<number | null>(null);
  const frozenRef = useRef<number | null>(null);
  frozenRef.current = frozen;
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
  // Draw: the ink over the slide (ink.ts), whether it takes the pointer, and a count that repaints it.
  const ink = useRef(new Ink()).current;
  const [inkOn, setInkOn] = useState(false);
  const inkOnRef = useRef(false);
  inkOnRef.current = inkOn;
  const [inkV, setInkV] = useState(0);
  // A live figure's steps (figure.ts): Next and Back walk them before the show moves on.
  const figures = useRef(new FigureSteps()).current;
  const [figV, setFigV] = useState(0);
  const stepFigure = useCallback((at: number, dir: 1 | -1) => {
    const moved = figures.move(deck.slides[at], dir);
    if (moved) setFigV((v) => v + 1);
    return moved;
  }, [figures, deck]);
  const inkChanged = useCallback(() => setInkV((v) => v + 1), []);
  const [reportOpen, setReportOpen] = useState(false);
  /** Rehearse: the size of the simulated class in the room (0 none), and whether its card is up. */
  const [rehearsing, setRehearsing] = useState(roomOn ? rehearse0 : 0);
  const [rehearseCard, setRehearseCard] = useState(false);
  /** The room's desk card from the bar: the quick poll, or the questions box. */
  const [deskCard, setDeskCard] = useState<'' | 'poll' | 'qa'>('');
  const reportRef = useRef(false);
  reportRef.current = reportOpen;
  const [, repaint] = useState(0);
  const link = useRef<PrompterLink | null>(null);
  const startedAt = useRef(Date.now()).current;
  const side = useRef<ShowSide | null>(null);
  const deskRef = useRef<{ wall: ReturnType<typeof wallOf> | null; fb: { hold: boolean; shown: boolean } | null }>({ wall: null, fb: null });
  const runRef = useRef<(cmd: ShowAction, n?: number, data?: CmdData) => void>(() => {});
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  // The relay did not answer: the show closes and the shell says why (giveUp).
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
    const fs = fsDoc();
    if (fs.fullscreenElement) void fs.exitFullscreen();
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
    const fz = frozenRef.current;
    if (fz != null) { setFrozen(Math.min(deck.slides.length - 1, fz + 1)); return; } // frozen: only the teacher moves on
    if (!roomOn) { if (!stepFigure(p.index, 1)) p.next(); return; }
    const act = nextAction({ room: r.state, steps, at: r.at, sinceAsked: r.sinceAsked() });
    if (act === 'start') { r.begin(stepAt(steps, p.index)); return; }
    if (act === 'wait' && (r.at < 0 || r.state.phase === 'lobby')) { say('Waiting for players to join'); return; }
    if (p.settle()) return;
    if (stepFigure(p.index, 1)) return;
    // A timed routine (live/activities): the room enters its next stage, and the slide builds it (its column, its clock).
    if ((act === 'advance' || act === 'end') && steps[r.at]?.room.act?.stages.length && r.stageNext()) { p.build(); return; }
    // A build of the slide on an open question is a step of its help (Emoji guess), which the room releases with it.
    if (p.build()) { if (act === 'wait' || act === 'reveal') r.release(); return; }
    if (act === 'ask' || act === 'reveal' || act === 'advance') r.next();
    else if (act === 'wait') say('Give them a moment, then press Next to show the answer');
    else if (act === 'end') exit();
  }, [roomOn, steps, exit, stepFigure, deck]);

  const prev = useCallback(() => {
    const p = player.current, r = roomRef.current;
    if (!p) return;
    if (screenRef.current !== 'none') { setScreen('none'); return; }
    const fz = frozenRef.current;
    if (fz != null) { setFrozen(Math.max(0, fz - 1)); return; }
    if (stepFigure(p.index, -1)) return;
    if (!roomOn) { p.prev(); return; }
    if (r.at > 0) r.goTo(r.at - 1);
  }, [roomOn, stepFigure]);

  const nextRef = useRef(next), prevRef = useRef(prev);
  nextRef.current = next;
  prevRef.current = prev;

  /** Go to a slide of the shown deck (0 based). In a room that has begun, the room moves to that slide's step. */
  const goIndex = useCallback((i: number) => {
    const p = player.current, r = roomRef.current;
    if (!p || finishedRef.current || i < 0 || i >= deck.slides.length) return;
    if (frozenRef.current != null) { setFrozen(i); return; }
    setScreen('none');
    if (!roomOn) { p.goto(i, i > p.index ? 1 : -1, true); return; }
    if (r.at < 0) { say('Press Start before moving around the lesson'); return; }
    r.goTo(stepAt(steps, i));
  }, [roomOn, steps, deck]);

  /** What the Teacher Presenter window asks, done as the show's own keys and bar would. */
  /** The teacher's quick poll (live/quick.ts), from the bar's card or the Teacher Presenter: '' when it went up, or why not. */
  const askPoll = useCallback((a: QuickAsk): string => {
    const r = roomRef.current;
    if (r.at < 0) return 'Press Start before asking the room.';
    if (!r.quickPoll(a)) return 'Something is already asking the room. Close it first.';
    setDeskCard('');
    return '';
  }, []);
  const toggleFs = useCallback(() => {
    const fs = fsDoc();
    if (fs.fullscreenElement) void fs.exitFullscreen();
    else void fs.documentElement.requestFullscreen?.().catch(() => say('The browser did not allow full screen'));
  }, []);

  /** Freeze, or catch the wall up with where the teacher is. */
  const toggleFreeze = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const fz = frozenRef.current;
    if (fz == null) { setFrozen(p.index); say('Wall frozen: the room still sees this slide'); return; }
    setFrozen(null);
    frozenRef.current = null;
    if (fz !== p.index) goIndex(fz);
    say(`Wall caught up: slide ${fz + 1}`);
  }, [goIndex]);
  /** Every control, from its key, the bar or the Teacher Presenter (presenter/controls.ts), done one way. */
  const runCmd = useCallback((cmd: ShowAction, n?: number, data?: CmdData) => {
    const r = roomRef.current, d = deskRef.current, p = player.current;
    const live = roomOn && !finishedRef.current;
    switch (cmd) {
      case 'next': nextRef.current(); return;
      case 'prev': prevRef.current(); return;
      case 'goto': if (n != null) goIndex(n - 1); return;
      case 'first': if (!roomOn) goIndex(0); return;
      case 'last': if (!roomOn) goIndex(deck.slides.length - 1); return;
      case 'black': case 'white': setScreen((s) => (s === cmd ? 'none' : cmd)); return;
      case 'resume': setScreen('none'); return;
      case 'overview': setOverview(p?.index ?? 0); return;
      case 'notes': setNotes((v) => !v); return;
      case 'full': toggleFs(); return;
      case 'exit': case 'end': exit(); return;
      case 'presenter': openPresenter(); return;
      case 'notesElsewhere': notesElsewhere(); return;
      case 'notesStop': link.current?.stop(); repaint((n) => n + 1); return;
      case 'help': setSheet((v) => !v); return;
      case 'steps': if (p && !p.buildAll()) say('Every step on this slide is showing'); return;
      case 'freeze': toggleFreeze(); return;
      case 'draw': setInkOn((v) => !v); return;
      case 'drawDone': setInkOn(false); return;
      case 'spot': ink.tool = inkOnRef.current && ink.tool === 'spot' ? 'pen' : 'spot'; setInkOn(true); inkChanged(); return;
      case 'undo': ink.undo(); inkChanged(); return;
      case 'clearInk': ink.clear(); inkChanged(); return;
    }
    if (!live) { if (!roomOn) say('That needs a live room: start Host live first'); return; }
    switch (cmd) {
      case 'reveal': if (d.wall?.view === 'question') r.next(); return;
      case 'close': r.closeFeedback(); return;
      case 'open': r.showFeedback(); return;
      case 'more': r.extendStage(30); return;
      case 'qa': if (data?.qa) r.qa(data.qa.id, data.qa.action); return;
      case 'floor': { const m = r.floor(data?.floor); if (m) say(FLOOR_SAYS[m]); return; }
      case 'poll': if (data?.poll) { const why = askPoll(data.poll); if (why) say(why); } else setDeskCard((c) => (c === 'poll' ? '' : 'poll')); return;
      case 'questions': setDeskCard((c) => (c === 'qa' ? '' : 'qa')); return;
      case 'roomView': setRoomView((v) => { const to = nextRoomView(v); say(ROOM_VIEW_SAYS[to]); return to; }); return;
      case 'scores': setRoomView(toggleBoard); return;
      case 'join': if (r.state.pin) setJoinCard((v) => !v); else say('The room is not open yet'); return;
      case 'again': say(r.again() ? 'Answers cleared: the question is asked again' : 'There is no question on the wall to ask again'); return;
      case 'reactions': { const on = r.reactions(); if (on != null) say(reactionsSay(on)); return; }
      case 'blankPhones': { const on = r.blankPhones(); if (on != null) say(on ? 'Phones blanked: the room is looking up' : 'Phones back: the room can answer again'); return; }
      case 'blankSoon': { const v = r.blankSoon(); if (v) say(v === 'soon' ? 'Phones go dark in 10 seconds' : v === 'cancelled' ? 'Countdown cancelled: phones stay on' : 'Phones are already blank'); return; }
      case 'who': openPresenter(); setDeskAsk((k) => k + 1); say('Who answered what is in the Teacher Presenter'); return;
      case 'entry': openEntry(); return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomOn, goIndex, exit, askPoll, deck, toggleFreeze, ink, inkChanged]);
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
  const revealed = (!!step?.room.quiz && room.state.revealed.includes(step.room.quiz.id)) || (!!step?.room.board && boardRevealed(step.room.board, room.state.boards[step.room.id]));
  const asked = !!step?.room.quiz && room.state.question?.id === step.room.quiz.id;
  const target = roomOn && step ? slideFor(step, revealed, asked) : null;
  useEffect(() => {
    const p = player.current;
    if (target == null || !p || p.index === target) return;
    p.goto(target, target > p.index ? 1 : -1, target < p.index);
  }, [target]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const onControl = !!t && /^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      // The show has the keyboard: a key pressed here never reaches the studio behind it.
      e.stopPropagation();
      const name = keyName(e);
      if (name == null) return;
      const k = e.key;
      // The shortcuts sheet has the keys while it is up: ? or Esc closes it.
      if (sheetRef.current) { if (k === 'Escape' || k === '?') { e.preventDefault(); setSheet(false); } return; }
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
      if (joinRef.current && (k === 'Escape' || name === 'j')) { setJoinCard(false); return; } // the join card closes on J or Esc
      if (e.altKey && name !== 'Alt+f') return;
      const c = controlFor(name, inkOnRef.current);
      if (!c) return;
      if (c.action === 'next' || c.action === 'prev') e.preventDefault();
      if (c.action === 'exit' && fsDoc().fullscreenElement) return; // Esc in full screen is the browser's: it leaves full screen
      if (c.room && !roomOn) { say('That needs a live room: start Host live first'); return; }
      runRef.current(c.action);
    };
    (document.activeElement as HTMLElement | null)?.blur?.();
    addEventListener('keydown', on, true);
    return () => removeEventListener('keydown', on, true);
  }, [roomOn, deck, goIndex]);

  const wake = useCallback(() => {
    setBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBar(false), BAR_HIDE_MS);
  }, []);
  useEffect(() => { wake(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [wake]);

  const slide = deck.slides[index];
  const figure = useMemo(() => figureSlide(slide), [slide]);
  const figureStep = figure ? (figures.step(slide) ?? 0) : 0;
  void figV;
  // The marks belong to the slide on the wall: leaving it clears them (as classic's ink does).
  useEffect(() => { ink.setSlide(String(index)); inkChanged(); }, [index, ink, inkChanged]);
  const embeds = slide.layers.filter((l) => l.kind === 'video' && l.visible && l.box && videoEmbed(l.params)).map((l) => ({ id: l.id, box: l.box!, src: videoEmbed(l.params), title: l.name }));
  const wall = roomOn ? wallOf({ room: room.state, steps, at: room.at, before: room.before, teamBefore: room.teamBefore, scoresOn, fallbackJoin: joinFallback() }) : null;
  const fbOpen = roomOn && !finished && wall?.view === 'feedback' ? room.state.feedback : null;
  const lobby = wall?.view === 'lobby' || wall?.view === 'connecting';
  const view = finished ? 'ended' : wall?.view;
  const rail = wall && !finished && roomView !== 'hidden' && ['question', 'reveal', 'slide'].includes(wall.view) ? wall.rail : null;
  const fbRail = !finished && ['feedback', 'reveal'].includes(wall?.view ?? '') && wall?.feedback?.presentAs === 'rail';
  const railWidth = fbRail ? FEEDBACK_RAIL_U : rail ? RAIL_U : 0;
  useEffect(() => { railU.current = railWidth; fit(); }, [railWidth, fit]);

  // The Teacher Presenter window follows the show over a BroadcastChannel; with none open this does nothing.
  const entryHash = roomOn ? room.manualHash() : null;
  const desk = presenterState({
    deck, index: frozen ?? index, startedAt, screen, figure: figures.says(slide), notesLink: notesLinkFor(link.current), frozenAt: frozen == null ? null : index, ink: { on: inkOn, spot: ink.tool === 'spot' },
    room: roomOn ? {
      wall, connected: room.state.connected, pin: room.state.pin, canClose: !!fbOpen, canShow: !!fbOpen && fbOpen.prompt.hold === true && !fbOpen.shown, quick: !!room.state.quick, canPoll: room.at >= 0 && !room.state.feedback && !finished, qa: room.state.qa, floor: room.state.floor,
      roomView, phonesBlank: room.state.phonesBlank, blankSoonAt: room.state.blankSoonAt, reactions: room.state.reactions, joinCard,
      canAgain: !finished && !!step?.room.quiz && step.room.activity === 'question', answers: step?.room.quiz && room.state.tally?.id === step.room.quiz.id ? whoAnswered(room.state.tally.answers, step.room.quiz.options) : [],
      entry: entryHash ? new URL(manualPage() + entryHash, location.href).href : null,
    } : null,
  });
  const deskFull = { ...desk, ask: deskAsk };
  deskRef.current = { wall, fb: fbOpen ? { hold: !!fbOpen.prompt.hold, shown: fbOpen.shown } : null };
  const deskNow = useRef(deskFull);
  deskNow.current = deskFull;
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const sd = new ShowSide(deck, deskNow.current, (cmd, n, data) => runRef.current(cmd, n, data));
    side.current = sd;
    return () => { sd.close(); side.current = null; };
  }, [deck]);
  const deskKey = JSON.stringify(deskFull);
  useEffect(() => { side.current?.publish(deskNow.current); }, [deskKey]);

  // Notes on another device: the frame follows the slide; the channel ends with the show.
  useEffect(() => { link.current?.send(prompterFrame(deck, index, startedAt)); }, [deck, index, startedAt]);
  useEffect(() => () => { link.current?.stop(); link.current = null; }, []);
  // The notes link is private: its QR goes to the Teacher Presenter (notesLink in its state), never the wall.
  const notesElsewhere = () => {
    openPresenter();
    if (link.current && !link.current.closed) return;
    const l = new PrompterLink({
      url: relayUrl(), link: (id) => prompterLinkFor(id, prompterPage()),
      onCmd: (c) => (c === 'next' ? nextRef.current() : prevRef.current()), onChange: () => repaint((n) => n + 1),
    });
    link.current = l;
    l.send(prompterFrame(deck, player.current?.index ?? index, startedAt));
    l.start();
  };
  // An open Teacher Presenter is brought forward, not loaded again (its countdown and panels stay).
  const openPresenter = () => {
    const w = window.open('', 'slideforge-presenter', 'width=1180,height=780');
    if (!w) { say('Pop-ups are blocked. Allow them to use the Teacher Presenter.'); return; }
    try { if (!w.location.href || w.location.href === 'about:blank') w.location.href = presenterUrl(); } catch { w.location.href = presenterUrl(); }
    w.focus();
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
        {figure && <FigureLayer key={slide.id} figure={figure} step={figureStep} />}
        {wall && !finished && !['question', 'reveal', 'sprint', 'lobby', 'connecting', 'ended'].includes(wall.view) && <ReactionBay key={slide.id} reaction={room.state.reaction} height={size.h} />}
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
          {!finished && ['question', 'reveal'].includes(wall.view) && wall.question?.detail.kind === 'spoken' && <SpokenPad key={wall.question.text} q={wall.question} revealed={wall.view === 'reveal'} actions={{ onVerdict: room.verdict, onSpeaker: room.speaker, onVerdictRoom: room.verdictRoom, onProposal: room.proposal, onLink: room.chainLink }} />}
          {!finished && wall.view === 'question' && wall.question && wall.question.detail.kind !== 'spoken' && (wall.question.locked ? <RevealStrip q={wall.question} /> : <QuestionStrip key={wall.question.text} q={wall.question} askedAt={room.askedAt()} />)}
          {!finished && wall.view === 'reveal' && wall.question && wall.question.detail.kind !== 'spoken' && <RevealStrip q={wall.question} />}
          {!finished && wall.view === 'board' && wall.boardWall && <BoardView wall={wall.boardWall} onCommand={room.boardCommand} />}
          {!finished && wall.view === 'sprint' && wall.speed.sprint && <SprintBoard sprint={wall.speed.sprint} onStop={room.stopClock} />}
          {!finished && ['question', 'reveal'].includes(wall.view) && wall.speed.round && <SpeedClock round={wall.speed.round} />}
          {!finished && wall.view === 'leaderboard' && <Leaderboard wall={wall} />}
          {!finished && ['question', 'reveal', 'leaderboard'].includes(wall.view) && <MechanicViews mech={wall.mech} scores={wall.view === 'leaderboard'} />}
          {rail && <RailView rail={rail} />}
          {!finished && ['feedback', 'reveal'].includes(wall.view) && wall.feedback && <FeedbackView fb={wall.feedback} />}
          {!finished && ['slide', 'feedback'].includes(wall.view) && wall.activity && <ActivityStrip a={wall.activity} onSpot={room.spotlight} onUnspot={room.unspot} onMore={() => room.extendStage(30)} />}
          {(finished || wall.view === 'ended') && (
            <Ended wall={wall} closing={!room.state.ended} onClose={close}
              onReport={room.state.session ? () => setReportOpen(true) : undefined}
              onShellReport={hooks?.reports && room.state.session ? () => hooks.reports!.open() : undefined} />
          )}
          {!finished && wall.qa && !['lobby', 'connecting', 'ended'].includes(wall.view) && <QaCard qa={wall.qa} />}
          {!room.state.connected && room.state.pin && !room.state.ended && <p className="wall-reconnect" role="status">Reconnecting to the room…</p>}
        </div>
      )}

      {reportOpen && room.state.session && <ReportScreen relay={relayUrl()} session={room.state.session} points={room.state.scores} onClose={() => setReportOpen(false)} />}
      {notes && <aside className="show-notes" aria-label="Speaker notes"><h4>Notes · slide {index + 1}</h4>{slide.notes || <span className="dim">No notes for this slide.</span>}</aside>}
      <ScreenCover screen={screen} onResume={() => setScreen('none')} />
      {overview != null && <Overview slides={deck.slides} deck={deck} current={index} at={overview} onGo={(i) => { setOverview(null); goIndex(i); }} onClose={() => setOverview(null)} />}
      {inkOn && <InkBar ink={ink} version={inkV} onChange={inkChanged} onDone={() => setInkOn(false)} onSteps={() => runCmd('steps')} />}
      {joinCard && wall?.join && !finished && <JoinCard join={wall.join} players={wall.players.length} onClose={() => setJoinCard(false)} />}
      {sheet && <KeySheet room={roomOn} onClose={() => setSheet(false)} />}
      {rehearseCard && (
        <RehearseCard size={rehearsing} inRoom={roomOn} onClose={() => setRehearseCard(false)}
          onPick={(n) => { setRehearseCard(false); if (roomOn) { setRehearsing(n); say(`A rehearsal class of ${n} is joining`); } else openStudioShow({ room: true, slideId: slide.id, rehearse: n }); }}
          onStop={() => { setRehearsing(0); say('The rehearsal class has gone home'); }} />
      )}
      {deskCard === 'poll' && roomOn && !finished && (
        <aside className="show-card" role="dialog" aria-label="Quick poll" data-testid="quick-card">
          <div className="card-head"><b>Quick poll</b><button onClick={() => setDeskCard('')} aria-label="Close">×</button></div>
          <QuickPollForm open={!!room.state.quick} onAsk={askPoll} onEnd={() => roomRef.current.closeFeedback()} />
        </aside>
      )}
      {deskCard === 'qa' && roomOn && !finished && (
        <aside className="show-card" role="dialog" aria-label="Questions from the room" data-testid="qa-card">
          <div className="card-head"><b>Questions{room.state.qa.pending ? ` · ${room.state.qa.pending} waiting` : ''}</b><button onClick={() => setDeskCard('')} aria-label="Close">×</button></div>
          <QuestionsList qa={room.state.qa} floor={room.state.floor} onQa={(id, action) => roomRef.current.qa(id, action)} onFloor={(m) => roomRef.current.floor(m)} />
        </aside>
      )}
      {jump && <div className="show-jump" role="status" aria-label="Go to slide">Go to {jump}</div>}
      <div className="show-toast" role="status" aria-live="polite">{toast}</div>

      {/* The bar hides itself, so the way out never does: a small button in the corner, always there. */}
      <button className="show-exit" onClick={exit} aria-label={roomOn ? 'End the room and exit' : 'Exit the slideshow'} title={roomOn ? 'End the room and exit (Esc)' : 'Exit (Esc)'}><X size={16} />{roomOn ? 'End room' : 'Exit'}</button>
      <div className={`show-bar${bar ? ' on' : ''}`} role="toolbar" aria-label="Slideshow controls">
        <button onClick={() => prevRef.current()} aria-label="Previous"><ArrowLeft size={16} /></button>
        <button onClick={() => nextRef.current()} aria-label="Next"><ArrowRight size={16} /></button>
        <span className="show-count" aria-label={`Slide ${index + 1} of ${deck.slides.length}${frozen != null ? ', frozen' : ''}`}>{index + 1} / {deck.slides.length}{frozen != null && <span className="show-frozen" title={`Frozen (Z): you are on slide ${frozen + 1}`}> ❄ {frozen + 1}</span>}</span>
        {roomOn && <button onClick={() => runCmd('join')} aria-pressed={joinCard} aria-label="Join card (J)" title="Join card (J): the PIN and QR for latecomers"><QrCode size={16} /></button>}
        <button onClick={() => setInkOn((v) => !v)} aria-pressed={inkOn} aria-label="Draw (D)" title="Draw on the slide (D or I): pen, highlighter, eraser, spotlight (L)"><PenLine size={16} /></button>
        <button onClick={() => setOverview(index)} aria-label="Slide overview (O)" title="Slide overview (O). Type a number and Enter to jump"><LayoutGrid size={16} /></button>
        <button onClick={() => runCmd(screen === 'black' ? 'resume' : 'black')} aria-pressed={screen === 'black'} aria-label="Black screen (B)" title="Black screen (B or .). W for white"><MonitorOff size={16} /></button>
        <button onClick={openPresenter} aria-label="Teacher Presenter (P)" title="Teacher Presenter (P): notes, next slide and every control in their own window"><Monitor size={16} /></button>
        <button onClick={notesElsewhere} aria-label="Notes on another device (Shift+N)" title="Notes on another device (Shift+N): the private link and QR open in the Teacher Presenter"><Smartphone size={16} /></button>
        {fbOpen && fbOpen.prompt.hold && !fbOpen.shown && <button onClick={() => roomRef.current.showFeedback()} aria-label="Show the results" title="Show the held results"><Eye size={16} />Show</button>}
        {fbOpen && <button onClick={() => roomRef.current.closeFeedback()} aria-label="Close the prompt" title="Close the prompt: the phones are thanked"><CircleStop size={16} />Close</button>}
        {(roomOn || studioRoomEnabled()) && <button onClick={() => (roomOn ? setDeskCard((c) => (c === 'poll' ? '' : 'poll')) : openStudioShow({ room: true, slideId: slide.id }))} aria-pressed={roomOn && (deskCard === 'poll' || !!room.state.quick)} aria-label="Quick poll (V)" title={roomOn ? 'Quick poll (V): ask the room something on the fly' : 'Quick poll (V): starts Host live, then ask the room something on the fly'}><Vote size={16} /></button>}
        {roomOn && <button onClick={() => setDeskCard((c) => (c === 'qa' ? '' : 'qa'))} aria-pressed={deskCard === 'qa'} aria-label="Questions from the room" title="Questions from the room: approve, show on the wall, mark answered, hide"><MessageCircleQuestion size={16} />{room.state.qa.pending || ''}</button>}
        {(roomOn || studioRoomEnabled()) && <button onClick={() => (roomOn ? runCmd('roomView') : openStudioShow({ room: true, slideId: slide.id }))} aria-pressed={roomOn && roomView !== 'hidden'} aria-label="Room view (E)" title={roomOn ? `Room view (E): ${ROOM_VIEW_SAYS[roomView]}. Press again for hidden, beside, full` : 'Room view (E): starts Host live, then the standings beside the slide or the full board'}><Columns2 size={16} /></button>}
        {roomOn && <button onClick={() => runCmd('scores')} aria-pressed={scoresOn} aria-label="Scores (S)" title="Scores (S). E: room view hidden, beside, full"><Trophy size={16} /></button>}
        {(roomOn || (steps.some((s) => s.room.quiz || s.room.feedback) && studioRoomEnabled())) && <button onClick={() => setRehearseCard((v) => !v)} aria-pressed={rehearsing > 0 || rehearseCard} aria-label="Rehearse" title="Rehearse with a simulated class"><Users size={16} />{rehearsing > 0 ? rehearsing : ''}</button>}
        {roomOn && <button onClick={openEntry} aria-label="Teacher entry" title="Teacher entry: add names, enter answers by key"><Keyboard size={16} /></button>}
        {roomOn && hooks?.share && <button onClick={() => hooks.share?.()} aria-label="Share" title="Share: a link to read or practise the lesson, or a big screen that follows this room"><Share2 size={16} /></button>}
        <button onClick={toggleFs} aria-label="Full screen (F)" title="Full screen (F). ? lists every key"><Maximize size={16} /></button>
        {!roomOn && studioRoomEnabled() && (
          <button className="show-live" onClick={() => openStudioShow({ room: true, slideId: slide.id })} title="Run this lesson live with phones"><Radio size={15} />Host live</button>
        )}
        <button onClick={exit} aria-label={roomOn ? 'End the room and exit' : 'Exit'} title={roomOn ? 'End the room and exit (Esc)' : 'Exit (Esc)'}><X size={16} />{roomOn ? 'End' : ''}</button>
      </div>
    </div>
  );
}
