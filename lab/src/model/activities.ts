import { buildSlide, carryLive, type SFSlide } from './fromSlideForge';
import { activitySlide, bulletsSlide, questionSlide, type LayoutStyle } from './layouts';
import type { Slide } from './types';

// SlideForge's 54 activities, built in the lab. The same process as the Layout bank: SlideForge says
// what each activity is (lab/src/assets/activities.json, written by tools/lab-activities.mjs from
// SlideForge's own catalogue), and the lab builds it from its own layouts and layers, in the deck's
// style, every word editable on the slide. Nothing is measured off SlideForge's screen.
//
//   a slide, a feedback prompt, a moment, a run of slides — the slides the activity makes, through
//     the same converter as a lesson (fromSlideForge.buildSlide), feedback and timers carried;
//   timed stages ("Think · 1 min", "Pair · 3 min") — the lab's Activity card, a step per line and the
//     minutes added up;
//   a game — how it plays, then each starter question as the lab's Quiz card. The room answers it
//     in SlideForge's live session; the lab draws it.
//
// The activity's steps, materials and teacher notes go in the speaker notes, as SlideForge keeps them.

export interface ActivityQuestion { question: string; options: string[]; correct: number; explanation: string }
export interface ActivityGame { title: string; style: string; format: string; styleLabel: string; questions: ActivityQuestion[] }
export interface ActivityEntry {
  key: string; title: string; icon: string; blurb: string;
  phase: string; phaseLabel: string; phaseIcon: string; minutes: number;
  target: 'slide' | 'game' | 'feedback' | 'moment' | 'slide-arc' | string;
  presentation: string; steps: string[]; materials: string[]; teacherNotes: string;
  slides?: SFSlide[]; game?: ActivityGame;
}
export interface ActivityData { activities: ActivityEntry[] }

/** The catalogue's phases, in the order a lesson runs through them, each with its activities. */
export function byPhase(data: ActivityData): { phase: string; label: string; icon: string; items: ActivityEntry[] }[] {
  const out: { phase: string; label: string; icon: string; items: ActivityEntry[] }[] = [];
  for (const a of data.activities) {
    let g = out.find((x) => x.phase === a.phase);
    if (!g) { g = { phase: a.phase, label: a.phaseLabel, icon: a.phaseIcon, items: [] }; out.push(g); }
    g.items.push(a);
  }
  return out;
}

// The time at the end of a stage's label, as the lab's Activity card reads it ("· 3 min").
const TIME = /\s*[·•\-–—|,]\s*(\d+(?:\.\d+)?)\s*(min|mins|minutes|m|s|sec|secs|seconds)\s*$/i;
// A row's declared job ("[talk]"), which the lab has no use for.
const JOB = /\s*\[(note|talk|send|work|down)\]\s*$/i;

/** A keywords row ("Pair · 3 min<TAB>Compare your answers") as one of the Activity card's steps:
 *  what to do, then its time, so the card adds the minutes up. */
function stageStep(row: string): string {
  const [label = '', content = ''] = row.split('\t').map((c) => c.replace(JOB, '').trim());
  const m = label.match(TIME);
  const name = m ? label.slice(0, m.index).trim() : label;
  const what = content ? `${name} — ${content}` : name;
  return m ? `${what} · ${m[1]} ${/^s/i.test(m[2]) ? 'sec' : 'min'}` : what;
}

/** Whether a SlideForge slide of this activity runs as timed stages: SlideForge's own flag, or, for a
 *  routine that runs as stages, at least two of its rows carrying a time. */
function isStaged(a: ActivityEntry, s: SFSlide): boolean {
  if (s.type !== 'keywords') return false;
  const p = String((s as { activityPresentation?: string }).activityPresentation ?? '');
  if (p === 'stages') return true;
  return a.presentation === 'stages' && (s.bullets ?? []).filter((r) => TIME.test(r.split('\t')[0] ?? '')).length >= 2;
}

/** What the teacher needs beside the slides: the steps in order, the materials and the notes. */
function notesOf(a: ActivityEntry): string {
  const parts = [
    `${a.title} — ${a.phaseLabel}${a.minutes ? `, about ${a.minutes} min` : ''}. ${a.blurb}`.trim(),
    a.steps.length ? `How to run it:\n${a.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '',
    a.materials.length ? `Materials: ${a.materials.join(' · ')}` : '',
    a.teacherNotes,
  ];
  return parts.filter(Boolean).join('\n\n');
}

/** The answer and why, for a game's question, in its speaker notes. */
function answerNote(q: ActivityQuestion): string {
  const right = q.correct >= 0 ? q.options[q.correct] : '';
  return [right ? `Answer: ${right}` : '', q.explanation].filter(Boolean).join('\n');
}

/** One activity as lab slides, in the style given: what inserting it puts in the lesson. */
export function activitySlides(a: ActivityEntry, st: LayoutStyle): Slide[] {
  const notes = notesOf(a);
  const out: Slide[] = [];
  if (a.game) {
    const g = a.game;
    const intro = bulletsSlide(st, a.title, [a.blurb, ...a.steps].filter(Boolean));
    intro.notes = `${notes}\n\nLAB — ${g.styleLabel}: SlideForge's live session runs the game; the lab draws its questions.`;
    out.push(intro);
    g.questions.forEach((q, i) => {
      const s = questionSlide(st, `${g.styleLabel} · ${i + 1} of ${g.questions.length}`, q.question, q.options);
      s.notes = answerNote(q);
      out.push(s);
    });
  } else {
    for (const s of a.slides ?? []) {
      if (isStaged(a, s)) {
        const made = activitySlide(st, s.title || a.title, (s.bullets ?? []).filter((r) => r.trim()).map(stageStep));
        made.notes = s.notes ?? '';
        // The room's feedback and the slide's clock come over as they do for any slide.
        carryLive(s, made, st);
        out.push(made);
        continue;
      }
      const made = buildSlide(s, st);
      if (made) out.push(made);
    }
  }
  out.forEach((s, i) => {
    s.name = out.length > 1 ? `${a.title} · ${i + 1}` : a.title;
    s.activity = { key: a.key, page: i };
    // The first slide carries the whole brief (SlideForge's notes on it are the same steps, so only
    // the lab's own line is kept from them); the rest keep their notes after a pointer to it.
    if (a.game) return;
    const lab = (s.notes.match(/^LAB — .*$/gm) ?? []).join('\n');
    s.notes = i === 0 ? [notes, lab].filter(Boolean).join('\n\n') : [s.notes, `Part ${i + 1} of ${a.title}; the brief is on its first slide.`].filter(Boolean).join('\n\n');
  });
  return out;
}
