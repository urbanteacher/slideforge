// What the wall shows of an activity on it (live/activities), as data: a routine's track with the stage it is in,
// that stage's job as the wall says it (classic STAGE_JOBS, src/activities/stages.js), its clock, the brief pinned
// through every stage, the note count, the stage's idea box (without names, as the phones were promised) and the
// ideas in the spotlight. Pure, so it is tested without a browser (lab/tests/live-activities.test.ts).

import { stageCopy } from '@sf/activities/stages.js';
import type { StageJob } from '../core';
import type { ActivityView, OpenFeedback } from '../live';

export interface ActivityWall {
  /** The track: each stage's name and time, the one the room is in lit, the ones before it done. */
  track: { name: string; time: string; on: boolean; done: boolean }[];
  /** The stage the room is in, null before the first Next (the introduction). */
  stage: { n: number; of: number; name: string; job: StageJob; wall: string; icon: string; text: string; next: string } | null;
  /** Before the first stage: how many stages, how long, and which comes first. */
  intro: string;
  brief: string;
  /** The stage's clock: when it runs out (the host's clock, ms) and how long it was given; null with no clock. */
  clock: { endsAt: number; seconds: number } | null;
  /** "2 of 3 have written something" in a note stage; '' otherwise. */
  written: string;
  /** The stage's idea box: the ideas, newest first, without their authors, each with its key for the spotlight. */
  ideas: { key: string; text: string; spot: boolean }[] | null;
  spotlights: { sid: string; label: string; text: string }[];
  /** Phones asking for help in a work stage (only the teacher's desk says it). */
  help: number;
}

/** "1 min", "90 s": a stage's time on the track. */
export const stageTime = (s: number) => (!s ? '' : s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.round((s / 60) * 10) / 10} min` : `${s} s`);

/** "3:05", "0:09": the clock's face (classic clockFace). */
export const clockFace = (left: number) => { const s = Math.max(0, Math.ceil(left)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** What the clock says `now`: the seconds left, and "Time. Next: Pair" once they are up (a cue, never a move on). */
export function stageClock(w: ActivityWall, now: number): { left: number; face: string; over: boolean; note: string } | null {
  if (!w.clock || !w.stage) return null;
  const left = Math.max(0, (w.clock.endsAt - now) / 1000);
  const over = left <= 0;
  return { left, face: clockFace(left), over, note: over ? (w.stage.next ? `Time. Next: ${w.stage.next}` : 'Time.') : '' };
}

export function activityWallOf(v: ActivityView, fb: OpenFeedback | null): ActivityWall {
  const at = v.stage ? v.stage.i : -1;
  const total = v.stages.reduce((m, s) => m + s.seconds, 0);
  const stage = v.stage ? { n: v.stage.i + 1, of: v.stage.of, name: v.stage.name, job: v.stage.job, ...stageCopy(v.stage), text: v.stage.text, next: v.stage.next } : null;
  // The stage's box only (a teacher's own prompt is the feedback view's).
  const box = fb && v.box && fb.prompt.id === v.box ? fb : null;
  const items = box?.digest?.kind === 'brainstorm' ? box.digest.items : [];
  return {
    track: v.stages.map((s, i) => ({ name: s.name, time: stageTime(s.seconds), on: i === at, done: i < at })),
    stage: stage && { n: stage.n, of: stage.of, name: stage.name, job: stage.job, wall: stage.wall, icon: stage.icon, text: stage.text, next: stage.next },
    intro: v.stages.length ? `${v.stages.length} stages${total ? ` · ${stageTime(total)}` : ''} · First: ${v.stages[0].name}` : '',
    brief: v.brief,
    clock: v.endsAt != null && v.stage ? { endsAt: v.endsAt, seconds: v.stage.seconds } : null,
    written: v.written ? `${v.written.n} of ${v.written.of} have written something` : '',
    ideas: box ? items.map((it) => { const key = String(it.seq ?? `${it.pid}:${it.text}`); return { key, text: it.text, spot: v.spotlights.some((x) => x.sid === `${box.prompt.id}|${key}`) }; }) : null,
    spotlights: v.spotlights,
    help: v.stage?.job === 'work' ? v.help : 0,
  };
}
