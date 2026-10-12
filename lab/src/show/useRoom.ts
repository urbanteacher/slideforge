// The room, for React: a LiveHost (live/) opened on the relay while the show is up, its state as React state,
// and the commands the show gives it. Ending the show ends the room.

import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyRoom, LiveHost, type RoomShow, type RoomState } from '../live';
import { relayUrl } from './state';

export interface RoomApi {
  state: RoomState;
  /** The step on the wall (an index into the room's steps); -1 before Start. */
  at: number;
  /** Milliseconds since the question on the wall was asked. */
  sinceAsked: () => number;
  begin: (step: number) => void;
  next: () => void;
  goTo: (step: number) => void;
  end: () => void;
}

/** `enabled` false: no room (a plain slideshow), nothing opened. */
export function useRoom(show: RoomShow, enabled: boolean, makeHost?: () => LiveHost): RoomApi {
  const host = useRef<LiveHost | null>(null);
  const asked = useRef(0);
  const ended = useRef(false);
  const [state, setState] = useState<RoomState>(emptyRoom);
  const [at, setAt] = useState(-1);

  const sync = useCallback(() => {
    const h = host.current;
    if (!h) return;
    const id = h.slide?.id;
    setAt(id ? show.slides.findIndex((s) => s.id === id) : -1);
  }, [show]);

  useEffect(() => {
    if (!enabled) return;
    const h = makeHost ? makeHost() : new LiveHost({ url: relayUrl(), show });
    host.current = h;
    ended.current = false;
    const off = h.subscribe((s, cause) => {
      if (cause.t === 'question') asked.current = Date.now();
      setState(s);
      sync();
    });
    void h.start();
    return () => { off(); if (!ended.current) { ended.current = true; void h.end(); } host.current = null; };
  }, [enabled, show, makeHost, sync]);

  return {
    state, at,
    sinceAsked: () => Date.now() - asked.current,
    begin: (step) => { host.current?.goTo(step); host.current?.begin(); sync(); },
    next: () => { host.current?.next(); sync(); },
    goTo: (step) => { host.current?.goTo(step); sync(); },
    end: () => { const h = host.current; if (h && !ended.current) { ended.current = true; void h.end(); } },
  };
}
