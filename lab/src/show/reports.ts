// The session report, kept the way classic keeps it (js/live.js, js/reports.js): the relay journals the session
// while the room runs, and the shell's Reports (the command palette's "Reports") reads it back from the relay by
// the session's id and key. So the show hands the shell the session when the relay opens it, passes on the relay's
// journal state and its report at the end, and asks the shell to load the report again once the room has closed.
// The report itself is the relay's: nothing here builds one.

import type { LiveHost, RoomState } from '../live';
import type { ShowHooks } from './hooks';

type Reports = NonNullable<ShowHooks['reports']>;

/** Keep the room's session in the shell's reports as the relay says things about it. Returns the way to stop. */
export function bindReports(host: LiveHost, reports: Reports | undefined): () => void {
  if (!reports) return () => {};
  let tracked: string | null = null;
  return host.subscribe((s, cause) => {
    if (s.session && s.session.id !== tracked) { tracked = s.session.id; reports.track(s.session); }
    if (cause.t === 'recording') reports.recording(s.recording !== false);
    if (cause.t === 'sessionReport' || cause.t === 'sessionClosed') reports.receive(s.report);
  });
}

/** After the room has ended: load the report once more (classic waits 250 ms for the relay to finish writing it),
 *  and say where it is. Not when the relay could not journal the session. */
export function keepReport(reports: Reports | undefined, room: RoomState, toast?: (t: string) => void): void {
  if (!room.session || room.recording === false) return;
  const id = room.session.id;
  if (reports) setTimeout(() => reports.refresh(id), 250);
  toast?.('Session ended. Attendance and responses are available in Reports.');
}
