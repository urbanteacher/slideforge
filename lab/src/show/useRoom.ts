// The room, for React: a LiveHost (live/) opened on the relay while the show is up, its state as React state,
// and the commands the show gives it. Ending the show ends the room. Also what classic does around the room:
// the question's clock runs out into a reveal, the teacher-entry window is served, the session is kept in the
// shell's reports, and a relay that does not answer is the show's cue to hand the lesson back to the classic host.

import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyRoom, LiveHost, ManualBridge, type RoomShow, type RoomState } from '../live';
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
  /** Milliseconds since the question on the wall was asked. */
  sinceAsked: () => number;
  /** When it was asked (ms since the epoch); 0 before the first question. */
  askedAt: () => number;
  begin: (step: number) => void;
  next: () => void;
  goTo: (step: number) => void;
  /** Close the open feedback prompt, or show a held one's split (the show bar's Close and Show). */
  closeFeedback: () => void;
  showFeedback: () => void;
  /** End the room; resolves once the relay has closed it (or after classic's 1.5 s). */
  end: () => Promise<void>;
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
    const off = h.subscribe((s, cause) => {
      if (cause.t === 'question' && s.question) {
        asked.current = Date.now();
        setBefore(Object.fromEntries(s.players.map((p) => [p.id, p.score])));
        // The clock runs out into the reveal, as classic's does (js/live.js on the player's `timeup`). With a
        // teacher entering answers by key the host sent no limit, and there is no clock.
        if (timeUp) clearTimeout(timeUp);
        const id = s.question.id, ms = timeUpIn(s.question.timeLimit, 0);
        timeUp = ms == null ? null : setTimeout(() => {
          timeUp = null;
          const now = h.state;
          if (now.phase === 'question' && now.question?.id === id && h.slide?.quiz?.id === id) h.reveal();
        }, ms);
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
      void end();
      host.current = null; bridge.current = null;
    };
  }, [enabled, show, sync, end]);

  return {
    state, at, before,
    sinceAsked: () => Date.now() - asked.current,
    askedAt: () => asked.current,
    begin: (step) => { host.current?.goTo(step); host.current?.begin(); sync(); },
    next: () => { host.current?.next(); sync(); },
    goTo: (step) => { host.current?.goTo(step); sync(); },
    closeFeedback: () => host.current?.closeFeedback(),
    showFeedback: () => host.current?.showFeedback(),
    end,
    manualHash: () => bridge.current?.hash ?? null,
  };
}
