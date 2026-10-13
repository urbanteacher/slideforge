// What the shell around the lab lends the studio's show (js/lab-engine.js hostInStudio). The lab never reaches for
// the shell's globals (hard rule 1): the shell passes these in when it asks for a show, and the show calls them.
// All optional: the lab on its own (the development server, ?studioRoom=1) passes none and the show does without.

/** The session the relay opened for a room, as `hosted` carries it. */
export interface SessionRef { id: string; token?: string; title: string; createdAt: number }

export interface ShowHooks {
  /** The show has closed: the shell takes the screen back (the frame is no longer full screen). `slideId` is the
   *  lab slide the show ended on, when it is known (the editor is already on it; the shell may use it too). */
  exited?: (slideId?: string) => void;
  /** The studio's room could not start (or the show broke before anyone was in it): the shell hosts the lesson
   *  the classic way instead. The show has already closed. */
  fallback?: (reason: string) => void;
  /** Words for the teacher, in the shell's own toast. */
  toast?: (text: string) => void;
  /** The shell's session reports (SF.Reports): the session to keep, the relay's journal state, the report as
   *  the relay sends it at the end, a reload of it, and the window that lists them. */
  reports?: {
    track: (session: SessionRef) => void;
    recording: (ok: boolean) => void;
    receive: (report: unknown) => void;
    refresh: (id: string) => void;
    open: () => void;
  };
}
