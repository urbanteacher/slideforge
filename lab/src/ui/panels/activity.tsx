import type { SlideFeedback, StageJob } from '../../core';
import { applyActivitySettings, ensureActivitySettings, looksOf, CONSTRAINTS, canWriteActivity, writeActivity, type ActivityChange, type ActivityData, type ActivityEntry, type Audience } from '../../designs';
import { slideOf, useStore } from '../../store';
import { Row, Scrub, Section, Select } from '../controls/controls';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, Chips, Input } from '../controls/fields';

// ─── An activity's settings ─────────────────────────────────────────────────
const JOB_OPTIONS: { value: StageJob | 'auto'; label: string }[] = [
  { value: 'auto', label: 'From its name' }, { value: 'note', label: 'Write a private note' }, { value: 'talk', label: 'Talk it through' },
  { value: 'send', label: 'Send to the idea box' }, { value: 'work', label: 'Work (Need help button)' }, { value: 'down', label: 'Phones down' },
];
const minLabel = (m: number) => (m >= 1 ? `${Math.round(m * 10) / 10} min` : `${Math.round(m * 60)} s`);
let catalogue: Promise<ActivityEntry[]> | null = null;
const loadCatalogue = () => (catalogue ??= import('../../assets/activities.json').then((d) => ((d as { default: ActivityData }).default ?? (d as unknown as ActivityData)).activities));

/**
 * How an activity runs, which the slide cannot show: each stage's minutes and what the phones do in
 * it, the slide's time when it is not a routine, and which of its two designs it wears. Its words are
 * edited on the slide. A change goes to the clocks and times already on it; a new look builds the
 * slide again, and Undo brings the old one back.
 */
export function ActivityPanel() {
  const slide = useStore(slideOf);
  const [entry, setEntry] = useState<ActivityEntry | null>(null);
  const key = slide.activity?.key;
  useEffect(() => {
    let live = true;
    setEntry(null);
    if (key) loadCatalogue().then((all) => { if (live) setEntry(all.find((a) => a.key === key) ?? null); });
    return () => { live = false; };
  }, [key]);
  // Slides added before their settings were recorded get them from the catalogue, once.
  useEffect(() => {
    if (entry && slide.activity && !slide.activity.settings) useStore.getState().mutate((d) => ensureActivitySettings(d, slide.id, entry));
  }, [entry, slide.id, slide.activity]);
  const set = slide.activity?.settings;
  if (!slide.activity || slide.game || !entry || !set) return null;
  const apply = (c: ActivityChange, merge?: string) => useStore.getState().mutate((d) => applyActivitySettings(d, slide.id, c), merge);
  const [labLook, sfLook] = looksOf(entry);
  const total = (set.stages ?? []).reduce((m, x) => m + x.minutes, 0);
  return (
    <Section title={`Activity · ${entry.title}`}>
      {slide.activity.page === 0 && <WriteActivity slideId={slide.id} entry={entry} look={set.look} />}
      <div className="desc">How it runs in the room. Its words are edited on the slide.</div>
      {set.stages?.length ? (
        <>
          {set.stages.map((x, k) => (
            <div key={k} className="sp-stage">
              <Row label={`${k + 1} · ${x.name}`} info="How long this stage runs. Its clock starts when the stage comes up.">
                <Scrub value={x.minutes} min={0} max={60} step={0.25} decimals={2} unit=" min" onChange={(v, m) => apply({ stage: k, minutes: v }, m)} />
              </Row>
              <Row label="Phones" info="What the phones do in this stage in a live SlideForge session: a private note, talk, send an idea to the box, work with a Need help button, or phones down.">
                <Select value={x.job ?? 'auto'} options={JOB_OPTIONS} onChange={(v) => apply({ stage: k, job: v === 'auto' ? null : v })} />
              </Row>
            </div>
          ))}
          <div className="desc">The whole routine: {minLabel(total)}.</div>
        </>
      ) : (
        <>
          <Row label="Time on the slide" info="A clock at the end of the heading row, from when the slide comes up.">
            <Chips value={String(set.seconds ?? 0)} options={[0, 60, 120, 180, 300, 600, 900].map((sec) => ({ value: String(sec), label: sec ? minLabel(sec / 60) : 'None' }))} onChange={(v) => apply({ seconds: Number(v) })} />
          </Row>
          <Row label="Or exactly"><Scrub value={set.seconds ?? 0} min={0} max={3600} step={5} decimals={0} unit=" s" onChange={(v, m) => apply({ seconds: v }, m)} /></Row>
        </>
      )}
      <Row label="Look" info="Its two designs: the lab's, and SlideForge's own. Changing it builds the slide again from the activity, keeping its times, phones, background and header; Undo brings the old one back.">
        <Chips value={set.look} options={[{ value: 'lab', label: labLook }, { value: 'slideforge', label: sfLook }]} onChange={(v) => { if (v !== set.look) apply({ look: v, entry }); }} />
      </Row>
    </Section>
  );
}

// ─── What the phones are asked ──────────────────────────────────────────────
/** The feedback a slide asks of the phones, beyond its kind: its question, options, scale, how many
 *  each may send, where the room's answers show, and whether they wait until the teacher shows them. */
export function FeedbackSettings() {
  const slide = useStore(slideOf);
  const f = slide.feedback;
  const [options, setOptions] = useState('');
  useEffect(() => { setOptions((f?.options ?? []).join('\n')); }, [slide.id, f?.options]);
  if (!f) return null;
  const set = (patch: Partial<SlideFeedback>, merge?: string) => useStore.getState().mutate((d) => {
    const s = d.slides.find((x) => x.id === slide.id);
    if (!s?.feedback) return;
    s.feedback = { ...s.feedback, ...patch };
    for (const k of Object.keys(patch) as (keyof SlideFeedback)[]) if (patch[k] === undefined || patch[k] === '') delete s.feedback[k];
  }, merge);
  return (
    <>
      <Row label="Question"><Input value={f.prompt ?? ''} onChange={(v) => set({ prompt: v }, 'fb-prompt')} placeholder={`The phones ask: ${slide.name}`} /></Row>
      {f.kind === 'poll' && (
        <>
          <div className="desc">Options, one a line (2 to 6).</div>
          <Area rows={4} value={options} onChange={(v) => { setOptions(v); set({ options: v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 6) }, 'fb-options'); }} />
        </>
      )}
      {f.kind === 'scale' && (
        <>
          <Row label="Points"><Scrub value={f.points ?? 5} min={3} max={7} step={1} decimals={0} onChange={(v, m) => set({ points: v }, m)} /></Row>
          <Row label="Low end"><Input value={f.lowLabel ?? ''} onChange={(v) => set({ lowLabel: v }, 'fb-low')} placeholder="Not at all" /></Row>
          <Row label="High end"><Input value={f.highLabel ?? ''} onChange={(v) => set({ highLabel: v }, 'fb-high')} placeholder="Completely" /></Row>
        </>
      )}
      {(f.kind === 'wordcloud' || f.kind === 'brainstorm') && (
        <Row label="Each may send" info="How many answers each person can send."><Scrub value={f.max ?? 1} min={1} max={5} step={1} decimals={0} onChange={(v, m) => set({ max: v }, m)} /></Row>
      )}
      <Row label="Answers show">
        <Chips value={f.presentAs ?? 'rail'} options={[{ value: 'rail', label: 'Beside the slide' }, { value: 'focus', label: 'Full screen' }]} onChange={(v) => set({ presentAs: v })} />
      </Row>
      {/* A split to hold back: SlideForge holds a poll's or a scale's (src/deck/feedback.js). */}
      {(f.kind === 'poll' || f.kind === 'scale') && <label className="sp-check"><input type="checkbox" checked={!!f.hold} onChange={(e) => set({ hold: e.target.checked || undefined })} />Hold the split until I show it</label>}
    </>
  );
}

const YEARS = ['', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13', 'Undergraduate', 'Postgraduate', 'Adult learners'];

/**
 * Write the activity with AI, as SlideForge's Activities studio does: a topic, and who it is for.
 * SlideForge writes its boxes (and refuses a draft that describes the material instead of being it);
 * the lab designs the slide again from them, in its look, with its times and phones kept.
 */
function WriteActivity({ slideId, entry, look }: { slideId: string; entry: ActivityEntry; look: 'lab' | 'slideforge' }) {
  const [topic, setTopic] = useState('');
  const [who, setWho] = useState<Audience>({});
  const [state, setState] = useState<{ busy?: boolean; msg?: string; bad?: boolean }>({});
  const can = canWriteActivity(entry.key);
  if (can === 'nothing') return null;
  const run = async () => {
    setState({ busy: true, msg: 'Writing it…' });
    const res = await writeActivity(entry, topic, who);
    if (!res.entry) { setState({ msg: res.error, bad: true }); return; }
    useStore.getState().mutate((d) => applyActivitySettings(d, slideId, { look, entry: res.entry! }));
    setState({ msg: res.notice || `Written on “${topic.trim()}”. Read it before you teach it; Undo brings the last one back.` });
  };
  const toggle = (c: string) => setWho((w) => ({ ...w, constraints: w.constraints?.includes(c) ? w.constraints.filter((x) => x !== c) : [...(w.constraints ?? []), c] }));
  return (
    <div className="sp-write">
      <div className="desc">{can === 'yes' ? 'Write it with AI: a theme or topic, and who it is for. The slide is made again from what comes back; its times and phones stay.' : 'Writing with AI works when the studio is open inside SlideForge, which holds the AI key.'}</div>
      <Input value={topic} onChange={setTopic} placeholder="Topic, e.g. osmosis in plant cells" />
      <Row label="Year group"><Select value={who.yearGroup ?? ''} options={YEARS.map((y) => ({ value: y, label: y || 'Any' }))} onChange={(v) => setWho((w) => ({ ...w, yearGroup: v || undefined }))} /></Row>
      <Row label="They get wrong" info="A misconception the activity should bring out, if there is one."><Input value={who.misconceptions ?? ''} onChange={(v) => setWho((w) => ({ ...w, misconceptions: v }))} placeholder="e.g. water moves towards salt" /></Row>
      <div className="sp-chips">{CONSTRAINTS.map((c) => <button key={c} className={`sp-chip${who.constraints?.includes(c) ? ' on' : ''}`} onClick={() => toggle(c)}>{c}</button>)}</div>
      <button className="btn-soft accent tidy" disabled={can !== 'yes' || state.busy || !topic.trim()} onClick={run}><Sparkles size={13} />{state.busy ? 'Writing…' : 'Generate'}</button>
      {state.msg && <div className={`desc${state.bad ? ' sp-bad' : ''}`}>{state.msg}</div>}
    </div>
  );
}
