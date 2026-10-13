// The room, for React: a LiveHost (live/) opened on the relay while the show is up, its state as React state,
// and the commands the show gives it. Ending the show ends the room. Also what classic does around the room:
// the question's clock runs out into a reveal, the teacher-entry window is served, the session is kept in the
// shell's reports, and a relay that does not answer is the show's cue to hand the lesson back to the classic host.

import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyRoom, LiveHost, ManualBridge, styleFor, teamBoardOf, type Recipient, type RoomShow, type RoomState } from '../live';
import type { ShowHooks } from './hooks';
import { bindReports, keepReport } from './reports';
import { timeUpIn } from './clock';
import { relayUrl } from './state';

/** How long the relay has to give the room a PIN before the show gives up on it. */
export const RELAY_WAIT_MS = 10000;

export interface RoomApi {
  state: RoomState;
  /** The step on the wall (an index into the room's steps); -1 before Start. */
  at: number;
  /** Everyone's points when the question on the wall was asked, by player id. */
  before: Record<number, number>;
  /** Each team's points when it was asked, by team index (a teams room). */
  teamBefore: Record<number, number>;
  /** Milliseconds since the question on the wall was asked. */
  sinceAsked: () => number;
  /** When it was asked (ms since the epoch); 0 before the first question. */
  askedAt: () => number;
  begin: (step: number) => void;
  next: () => void;
  /** The slide built a step of its help (Emoji guess): the room releases the same one. */
  release: () => void;
  goTo: (step: number) => void;
  /** A spoken game (live/spoken.ts): the teacher's verdict, who spoke, and "count it for the room" (the wall's pads). */
  verdict: (index: number) => void;
  speaker: (r: Recipient) => void;
  verdictRoom: () => void;
  proposal: (pid: number, text: string) => void;
  chainLink: (text: string) => void;
  /** Stop the sprint's clock (Beat the clock). */
  stopClock: () => void;
  /** Close the open feedback prompt, or show a held one's split (the show bar's Close and Show). */
  closeFeedback: () => void;
  showFeedback: () => void;
  /** End the room; resolves once the relay has closed it (or after classic's 1.5 s). */
  end: () => Promise<void>;
  /** Add learners by name, to a team in a teams room (the lobby's pasted roster). */
  addNames: (names: string[], team?: number) => void;
  /** The address (hash) the teacher-entry window opens at, or null before the room exists. */
  manualHash: () => string | null;
}

export interface RoomOptions {
  hooks?: ShowHooks | null;
  /** The room could not start: the relay did not answer, or the host threw. */
  onFail?: (reason: string) => void;
  makeHost?: () => LiveHost;
}

/** `enabled` false: no room (a plain slideshow), nothing opened. */
export function useRoom(show: RoomShow, enabled: boolean, opts: RoomOptions = {}): RoomApi {
  const host = useRef<LiveHost | null>(null);
  const bridge = useRef<ManualBridge | null>(null);
  const asked = useRef(0);
  const ended = useRef<Promise<void> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [state, setState] = useState<RoomState>(emptyRoom);
  const [at, setAt] = useState(-1);
  const [before, setBefore] = useState<Record<number, number>>({});
  const [teamBefore, setTeamBefore] = useState<Record<number, number>>({});

  const sync = useCallback(() => {
    const h = host.current;
    if (!h) return;
    const id = h.slide?.id;
    setAt(id ? show.slides.findIndex((s) => s.id === id) : -1);
  }, [show]);

  const end = useCallback((): Promise<void> => {
    const h = host.current;
    if (!h) return Promise.resolve();
    if (!ended.current) ended.current = h.end().then((s) => { keepReport(optsRef.current.hooks?.reports, s, optsRef.current.hooks?.toast); });
    return ended.current;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let h: LiveHost;
    try { h = optsRef.current.makeHost ? optsRef.current.makeHost() : new LiveHost({ url: relayUrl(), show }); }
    catch (e) { optsRef.current.onFail?.(`The room could not open (${e instanceof Error ? e.message : String(e)})`); return; }
    host.current = h;
    ended.current = null;
    const manual = new ManualBridge(h);
    bridge.current = manual;
    manual.start();
    const unbind = bindReports(h, optsRef.current.hooks?.reports);
    let timeUp: ReturnType<typeof setTimeout> | null = null;
    let halfway: ReturnType<typeof setTimeout> | null = null;
    const off = h.subscribe((s, cause) => {
      if ((cause.t === 'question' || cause.t === 'asked') && s.question) {
        asked.current = Date.now();
        setBefore(Object.fromEntries(s.players.map((p) => [p.id, p.score])));
        setTeamBefore(Object.fromEntries((teamBoardOf(s) ?? []).map((t) => [t.index, t.score])));
        // The clock runs out into the reveal, as classic's does (js/live.js on the player's `timeup`). With a
        // teacher entering answers by key the host sent no limit, and there is no clock.
        if (timeUp) clearTimeout(timeUp);
        if (halfway) clearTimeout(halfway);
        halfway = null;
        const id = s.question.id, ms = timeUpIn(s.question.timeLimit, 0);
        timeUp = ms == null ? null : setTimeout(() => {
          timeUp = null;
          const now = h.state;
          if (now.phase === 'question' && now.question?.id === id && h.slide?.quiz?.id === id) h.reveal();
        }, ms);
        // A timed Showdown shows its split half-way through the clock (classic: js/live.js sendOpenQuestion).
        const limit = s.question.timeLimit;
        if (limit > 0 && h.slide?.quiz && styleFor(h.slide.quiz).gate === 'showdown') halfway = setTimeout(() => { halfway = null; if (h.slide?.quiz?.id === id) h.gate(); }, limit * 500);
      }
      setState(s);
      sync();
    });
    // A relay that does not answer is not a room: say so, and let the shell host the lesson the classic way.
    const wait = setTimeout(() => { if (!h.state.pin && !h.state.ended) optsRef.current.onFail?.('The room server did not answer'); }, RELAY_WAIT_MS);
    try { void h.start().catch((e) => optsRef.current.onFail?.(`The room could not open (${String(e)})`)); }
    catch (e) { optsRef.current.onFail?.(`The room could not open (${e instanceof Error ? e.message : String(e)})`); }
    return () => {
      off(); unbind(); manual.stop(); clearTimeout(wait);
      if (timeUp) clearTimeout(timeUp);
      if (halfway) clearTimeout(halfway);
      void end();
      host.current = null; bridge.current = null;
    };
  }, [enabled, show, sync, end]);

  return {
    state, at, before, teamBefore,
    sinceAsked: () => Date.now() - asked.current,
    askedAt: () => asked.current,
    begin: (step) => { host.current?.goTo(step); host.current?.begin(); sync(); },
    next: () => { host.current?.next(); sync(); },
    release: () => { host.current?.release(); sync(); },
    goTo: (step) => { host.current?.goTo(step); sync(); },
    verdict: (index) => { host.current?.verdict(index); sync(); },
    speaker: (r) => { host.current?.recipient(r); sync(); },
    verdictRoom: () => { host.current?.verdictRoom(); sync(); },
    proposal: (pid, text) => { host.current?.useProposal(pid, text); sync(); },
    chainLink: (text) => { host.current?.chainLink(text); sync(); },
    stopClock: () => { host.current?.stopClock(); sync(); },
    closeFeedback: () => host.current?.closeFeedback(),
    showFeedback: () => host.current?.showFeedback(),
    end,
    addNames: (names, team = 0) => host.current?.manualAdd(names, team),
    manualHash: () => bridge.current?.hash ?? null,
  };
}
