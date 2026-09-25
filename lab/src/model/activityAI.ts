import type { ActivityEntry } from './designs';
import type { SFSlide } from './fromSlideForge';

/*
 * An activity written from a topic, as SlideForge's Activities studio writes one ("Write it").
 *
 * Inside SlideForge the lab can use its writer (js/ai.js generateActivityContent: the activity's own
 * boxes, its guardrail — a worked example must hold the example, not "solve the example below" — and
 * the server's key) and its slides (SF.Activities.makeSlides, what lab/src/assets/activities.json
 * holds). The values are written into those slides by SlideForge's own field paths, and the lab
 * designs the result as it designs the catalogue's.
 *
 * Who it is for goes with the topic, as the Lesson Planner asks it: the year group, what the class
 * tends to get wrong, and what the room allows.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Host = {
  AI: { generateActivityContent: (a: any, opts: any) => Promise<{ values?: Record<string, string>; error?: string; notice?: string; missing?: number }> };
  Activities: { activity: (key: string) => any; makeSlides: (a: any) => any[] };
  createActivityFields: (sf: any) => { write: (slide: any, path: string, value: string) => void };
};

function host(): Host | null {
  const ok = (w: any) => (w && w.SF && w.SF.AI?.generateActivityContent && w.SF.Activities?.makeSlides && w.SF.createActivityFields ? w.SF as Host : null);
  try { return ok(window) ?? (window.parent !== window ? ok(window.parent) : null); } catch { return null; }
}

/** Whether this activity can be written here: inside SlideForge, with boxes to write. */
export function canWriteActivity(key: string): 'yes' | 'no-host' | 'nothing' {
  const sf = host();
  if (!sf) return 'no-host';
  const a = sf.Activities.activity(key);
  return a && (a.fields ?? []).some((f: any) => f.type !== 'minutes') ? 'yes' : 'nothing';
}

export interface Audience { yearGroup?: string; misconceptions?: string; constraints?: string[] }
export const CONSTRAINTS = ['Large class (30+)', 'Mixed abilities', 'EAL learners', 'Limited equipment', 'Short on time'];

/** The class, in a line the writer reads as notes. */
function notesOf(a: Audience): string {
  return [
    a.yearGroup ? `For ${a.yearGroup}.` : '',
    a.misconceptions?.trim() ? `They tend to get wrong: ${a.misconceptions.trim()}.` : '',
    a.constraints?.length ? `The room: ${a.constraints.join(', ').toLowerCase()}.` : '',
  ].filter(Boolean).join(' ');
}

// What a slide says, as tools/lab-activities.mjs keeps it for the lab.
const DROP = new Set(['id', 'videoStart', 'videoEnd', 'videoLoop', 'videoMuted', 'videoAutoplay', 'correct', 'points',
  'imageSide', 'imageFit', 'tableHeader', 'chartUnit', 'buildMode', 'transition', 'layers', 'activityInstance']);
const empty = (v: any) => v === '' || v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
const clean = (s: any) => Object.fromEntries(Object.entries(s).filter(([k, v]) => !DROP.has(k) && !empty(v))) as unknown as SFSlide;

/** The activity written on a topic: the catalogue entry with its slides written by SlideForge. */
export async function writeActivity(entry: ActivityEntry, topic: string, who: Audience = {}): Promise<{ entry?: ActivityEntry; error?: string; notice?: string }> {
  const sf = host();
  if (!sf) return { error: 'Writing with AI works when the studio is open inside SlideForge.' };
  const t = topic.trim();
  if (!t) return { error: 'Give it a topic to write about.' };
  const a = sf.Activities.activity(entry.key);
  if (!a) return { error: `${entry.title} is not in SlideForge’s catalogue.` };
  // The lab's walls are read from the back of the room, large: a box is a line or two.
  const res = await sf.AI.generateActivityContent(a, { topic: t, notes: notesOf(who), maxWords: 20 });
  if (!res || res.error || !res.values) return { error: res?.error || 'Nothing came back. Try a narrower topic.' };
  const slides = sf.Activities.makeSlides(a);
  const fields = sf.createActivityFields(sf);
  // An activity's boxes are its first slide's (src/activities/fields.js applyFields).
  if (slides[0]) for (const [path, value] of Object.entries(res.values)) fields.write(slides[0], path, value);
  return { entry: { ...entry, written: true, slides: slides.map(clean) }, notice: res.notice };
}
