import { create } from 'zustand';
import { useStore } from '../store';

// The status centre: one list of what the editor did on its own, or was asked to do and may still be doing (saves,
// exports, opening a file, online sync) and what went wrong. A toast is gone in two seconds; a row here stays until
// the page reloads, so a failure can't disappear into a toast. The Status tab beside the inspector shows it, with a
// badge for failures not yet looked at.

export type JobKind = 'save' | 'export' | 'open' | 'sync' | 'error' | 'note';
export type JobState = 'running' | 'done' | 'failed' | 'info';

export interface Job {
  id: string;
  kind: JobKind;
  title: string;
  detail?: string;
  state: JobState;
  at: number;
}

interface StatusState {
  jobs: Job[];
  /** Time the Status tab was last looked at: failures after it count on the badge. */
  seenAt: number;
  /** The right column's tab: the inspector, or this list. */
  side: 'inspect' | 'status';
}

const KEEP = 80;
let seq = 0;

export const useStatus = create<StatusState>(() => ({ jobs: [], seenAt: 0, side: 'inspect' }));

/** Add a row (or, with the id of one already listed, replace it in place and move it to the top). Returns its id. */
export function report(job: Omit<Job, 'id' | 'at'> & { id?: string; at?: number }): string {
  const id = job.id ?? `j${++seq}`;
  const row: Job = { ...job, id, at: job.at ?? Date.now() };
  const was = useStatus.getState().jobs.find((j) => j.id === id);
  useStatus.setState((s) => ({ jobs: [row, ...s.jobs.filter((j) => j.id !== id)].slice(0, KEEP) }));
  // Brought forward once per failure: a row that was already failing (autosave trying again) doesn't pull the tab back.
  if (row.state === 'failed' && was?.state !== 'failed') onFailure();
  return id;
}

/** Change a row already listed: a running export that finished, or failed. */
export function settle(id: string, patch: Partial<Omit<Job, 'id'>>): void {
  const old = useStatus.getState().jobs.find((j) => j.id === id);
  if (!old) return;
  report({ ...old, ...patch, id, at: Date.now() });
}

/** Run some work as a row: running while it runs, then done, or failed with the reason. The error is passed on. */
export async function track<T>(kind: JobKind, title: string, work: () => T | Promise<T>, done?: string, running?: string): Promise<T> {
  const id = report({ kind, title, state: 'running', detail: running });
  try {
    const out = await work();
    settle(id, { state: 'done', detail: done });
    return out;
  } catch (e) {
    settle(id, { state: 'failed', detail: reason(e) });
    throw e;
  }
}

export const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e ?? 'unknown error')) || 'unknown error';

export const unseenFailures = (s: StatusState) => s.jobs.filter((j) => j.state === 'failed' && j.at > s.seenAt).length;

export function showStatus(): void {
  useStatus.setState({ side: 'status', seenAt: Date.now() });
}

// Set by shell/prefs.ts: whether a failure brings the Status tab forward (on by default).
let surface = true;
export const setSurfaceFailures = (on: boolean) => { surface = on; };

function onFailure() {
  if (!surface) return;
  const st = useStore.getState();
  if (st.panelHidden) st.set({ panelHidden: false });
  useStatus.setState({ side: 'status' });
}

// Words that mean a toast was about something going wrong.
const BAD = /\b(could ?n[o']t|can[’']?t|cannot|failed|fails|error|refused|too (big|large)|not (saved|found|supported))\b/i;

/** Every toast is also kept here, so it can be read after it fades; a toast about a failure counts as one. Wired once. */
export function startStatus(): () => void {
  const unsub = useStore.subscribe((s, p) => {
    // A toast that repeats a row just listed (an export's "Exported…") isn't listed twice.
    const dup = (t: string) => useStatus.getState().jobs.some((j) => Date.now() - j.at < 4000 && (j.title === t || j.detail === t));
    if (s.toast && s.toast !== p.toast && !dup(s.toast)) report({ kind: BAD.test(s.toast) ? 'error' : 'note', title: s.toast, state: BAD.test(s.toast) ? 'failed' : 'info' });
  });
  // A script error the editor didn't catch: listed, not just written to the console.
  const err = (e: ErrorEvent) => {
    if (/ResizeObserver loop/.test(e.message)) return;
    report({ kind: 'error', title: 'Something in the editor went wrong', detail: e.message, state: 'failed' });
  };
  const rej = (e: PromiseRejectionEvent) => report({ kind: 'error', title: 'A task in the editor failed', detail: reason(e.reason), state: 'failed' });
  addEventListener('error', err);
  addEventListener('unhandledrejection', rej);
  return () => { unsub(); removeEventListener('error', err); removeEventListener('unhandledrejection', rej); };
}
