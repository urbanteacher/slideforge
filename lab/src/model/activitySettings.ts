import { JOB_BY_NAME, rebuildActivity, type ActivityEntry } from './designs';
import { CY, JOBS, LEFT, PAD, W, box, clock, fmtMin, headingClock, setFrame } from './designs/kit';
import { isBackdrop } from './backdrop';
import { LAYOUT_STYLES, slideStyle, themeOf } from './layouts';
import type { ActivitySettings, ActivityStage, Deck, Layer, Slide, StageJob } from './types';

/*
 * An activity's settings — how long each stage runs and what it asks of the phones, the time of a
 * slide that is not a routine, which of its two designs it wears — edited from the Activity section
 * of the Slide panel. Its words are on the slide and edited there.
 *
 * A time or a job goes onto the layers that show it, found by the names the designs give them
 * (designs/stages.ts: "Think — clock", "Track — Think time", "Clock — whole routine"), so nothing
 * the teacher has changed on the slide is touched. A new look is the slide built again from the
 * catalogue, in the deck's style, with its times, jobs, feedback, backdrop and header kept.
 */

export type ActivityChange =
  | { stage: number; minutes: number }
  | { stage: number; job: StageJob | null }
  | { seconds: number }
  | { look: 'lab' | 'slideforge'; entry: ActivityEntry };

const find = (s: Slide, name: string) => s.layers.find((l) => l.name === name);
const isLab = (s: Slide) => s.activity?.settings?.look !== 'slideforge';

/** A stage's clock, set to its minutes, made where its design keeps it, or taken away at none. */
function stageClock(d: Deck, s: Slide, st: ReturnType<typeof styleOf>, name: string, minutes: number) {
  const at = s.layers.findIndex((l) => l.kind === 'timer' && l.name === `${name} — clock`);
  if (minutes <= 0) { if (at >= 0) s.layers.splice(at, 1); return; }
  if (at >= 0) { s.layers[at].params.minutes = minutes; return; }
  // The band: in its column, level with its number. The track: in the routine clock's place, with its stage.
  const col = find(s, `${name} — column`), pill = find(s, `${name} — live pill`), whole = find(s, 'Clock — whole routine');
  let made: Layer | null = null;
  if (col?.box) made = clock(st, `${name} — clock`, minutes, box(col.box.x + col.box.w - PAD - 190, col.box.y + 44, 190, 76), { ...(find(s, `${name} — name`)?.anim ?? { type: 'fade', duration: 0.5 }) });
  else if (pill && whole?.box) made = clock(st, `${name} — clock`, minutes, { ...whole.box }, { ...pill.anim }, true);
  if (made) s.layers.push(made);
  void d;
}

/** The track's times and cover, and the routine's clock, said again from the stages. */
function sayTimes(s: Slide, stages: ActivityStage[]) {
  const total = stages.reduce((m, x) => m + x.minutes, 0);
  for (const x of stages) {
    for (const n of [`Track — ${x.name} time`, `${x.name} — live pill time`]) { const l = find(s, n); if (l) l.params.text = x.minutes ? fmtMin(x.minutes) : ''; }
  }
  const whole = find(s, 'Clock — whole routine');
  if (whole) whole.params.minutes = Math.max(0.5, total);
  const sum = find(s, 'Cover — summary');
  if (sum) sum.params.text = `${stages.length} stages${total ? ` · ${Math.round(total * 10) / 10} min` : ''}`;
}

/** The time on a slide that is not a routine: its heading clock (the lab's) or ring (SlideForge's). */
function slideClock(d: Deck, s: Slide, st: ReturnType<typeof styleOf>, seconds: number) {
  const at = s.layers.findIndex((l) => l.kind === 'timer' && l.name === 'Clock');
  if (seconds <= 0) { if (at >= 0) s.layers.splice(at, 1); return; }
  if (at >= 0) { s.layers[at].params.minutes = seconds / 60; return; }
  if (isLab(s)) {
    const eb = s.layers.findIndex((l) => l.name === 'Eyebrow' && l.box);
    if (eb >= 0) s.layers.splice(eb + 1, 0, headingClock(st, seconds / 60, s.layers[eb].box!, String(s.layers[eb].params.color ?? st.accent), d.width));
  } else s.layers.push(clock(st, 'Clock', seconds / 60, box(W - LEFT - 170, CY, 170, 170), { type: 'fade', duration: 0.5 }, true));
}

const styleOf = (d: Deck, s: Slide) => slideStyle(themeOf(d) ?? LAYOUT_STYLES[0], s);
const framed = (d: Deck) => !!d.headerFooter?.enabled || d.slides.some((s) => s.layers.some((l) => typeof l.params.hfSlot === 'string'));

/** Apply a change to an activity slide's settings, and to what the slide shows of it. */
export function applyActivitySettings(d: Deck, slideId: string, change: ActivityChange) {
  const i = d.slides.findIndex((x) => x.id === slideId);
  const s = d.slides[i];
  if (!s?.activity?.settings) return;
  const set: ActivitySettings = s.activity.settings;
  const st = styleOf(d, s);

  if ('look' in change) {
    setFrame(framed(d));
    const made = rebuildActivity(change.entry, s.activity.page, st, change.look);
    if (!made) return;
    // Kept: the slide itself (its id, name, notes, what it asks the phones), its backdrop and header.
    const back = s.layers.filter(isBackdrop), chrome = s.layers.filter((l) => typeof l.params.hfSlot === 'string');
    const own = made.layers.filter((l) => !isBackdrop(l));
    made.layers = [own[0], ...back, ...own.slice(1), ...chrome].filter(Boolean);
    made.id = s.id; made.name = s.name; made.notes = s.notes;
    if (s.feedback) made.feedback = s.feedback; else delete made.feedback;
    if (s.ground) made.ground = s.ground;
    d.slides[i] = made;
    // Its times and jobs come with it.
    const next = made.activity!.settings!;
    set.stages?.forEach((x, k) => { if (next.stages?.[k]) applyActivitySettings(d, s.id, { stage: k, minutes: x.minutes }); });
    set.stages?.forEach((x, k) => { if (next.stages?.[k]) applyActivitySettings(d, s.id, { stage: k, job: x.job ?? null }); });
    if (set.seconds != null) applyActivitySettings(d, s.id, { seconds: set.seconds });
    return;
  }

  if ('seconds' in change) {
    set.seconds = change.seconds > 0 ? change.seconds : undefined;
    if (set.seconds == null) delete set.seconds;
    slideClock(d, s, st, change.seconds);
    return;
  }

  const stage = set.stages?.[change.stage];
  if (!stage) return;
  if ('minutes' in change) {
    stage.minutes = Math.max(0, change.minutes);
    stageClock(d, s, st, stage.name, stage.minutes);
    sayTimes(s, set.stages!);
    return;
  }
  // A job: what the phones do in that stage. The track says it under the stage's name.
  if (change.job) stage.job = change.job; else delete stage.job;
  const say = find(s, `${stage.name} — job`);
  if (say) say.params.text = (change.job ? JOBS[change.job] : JOB_BY_NAME[stage.name.toLowerCase()] ?? '').toUpperCase();
}

/** An activity slide added before its settings were recorded: work them out from the catalogue, and
 *  which look it wears from its layers' names (the design whose layers it shares most). Its times are
 *  read off its own clocks, so a clock changed on the slide is what the panel shows. */
export function ensureActivitySettings(d: Deck, slideId: string, entry: ActivityEntry) {
  const s = d.slides.find((x) => x.id === slideId);
  if (!s?.activity || s.activity.settings) return;
  const st = styleOf(d, s);
  const names = new Set(s.layers.map((l) => l.name));
  const score = (w: 'lab' | 'slideforge') => (rebuildActivity(entry, s.activity!.page, st, w)?.layers ?? []).filter((l) => names.has(l.name)).length;
  const look = score('slideforge') > score('lab') ? 'slideforge' : 'lab';
  const made = rebuildActivity(entry, s.activity.page, st, look);
  const set: ActivitySettings = made?.activity?.settings ? structuredClone(made.activity.settings) : { look };
  set.stages?.forEach((x) => { const c = find(s, `${x.name} — clock`); x.minutes = c ? Number(c.params.minutes) || 0 : 0; });
  if (!set.stages) { const c = find(s, 'Clock'); if (c?.kind === 'timer') set.seconds = Math.round((Number(c.params.minutes) || 0) * 60); else delete set.seconds; }
  s.activity.settings = set;
}
