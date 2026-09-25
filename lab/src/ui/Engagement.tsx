import { Cloud, Gamepad2, ListChecks, Minus, PencilLine, SlidersHorizontal, Sparkles, Timer } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { ActivityData, ActivityEntry, ActivityOption } from '../model/designs';
import { LAYOUT_STYLES, themeOf } from '../model/layouts';
import { slideOf, useStore } from '../model/store';
import type { FeedbackKind } from '../model/types';
import { Section, Tip } from './controls';

// SlideForge's Engagement tab: games and activities, and the audience feedback a slide asks the room
// for. The lab does not run a live room, so these are placeholders — a quiz or an activity lands as
// a placeholder slide after this one, as SlideForge's games do, and a slide's feedback is recorded
// and marked in the editor, ready for SlideForge to run.

export const FEEDBACK: { value: FeedbackKind | 'none'; label: string; icon: ReactNode; hint: string }[] = [
  { value: 'none', label: 'None', icon: <Minus size={16} />, hint: 'Nothing asked of the room on this slide.' },
  { value: 'poll', label: 'Poll', icon: <ListChecks size={16} />, hint: 'Fixed options, counted live.' },
  { value: 'wordcloud', label: 'Word cloud', icon: <Cloud size={16} />, hint: 'One word each; repeats grow larger.' },
  { value: 'brainstorm', label: 'Brainstorm', icon: <PencilLine size={16} />, hint: 'Longer contributions, newest first.' },
  { value: 'scale', label: 'Scale', icon: <SlidersHorizontal size={16} />, hint: 'Where do you stand, on an ordered run of points.' },
];

export function EngagementPanel() {
  const slide = useStore(slideOf);
  const { mutate } = useStore.getState();
  const [adding, setAdding] = useState(false);
  const kind = slide.feedback?.kind ?? 'none';

  return (
    <>
      <div className="engage-eyebrow">Games and activities · designed in the lab</div>
      <Section title="Add a game or activity" right={<Tip text="Each of SlideForge's activities and games, designed in the lab from its own layers, goes in after this slide. Most come two ways: the lab's design, and SlideForge's." />}>
        <button className="btn-soft accent engage-add" aria-expanded={adding} onClick={() => setAdding(!adding)}><Sparkles size={13} />{adding ? 'Close' : '+ Add activity'}</button>
        {adding && <ActivityPicker done={() => setAdding(false)} />}
        <button className="btn-soft engage-saved" disabled title="Saved games live in SlideForge's library, which the lab does not read yet.">Insert a saved game…</button>
        <div className="hint">Saved games come from SlideForge’s library, which the lab does not read yet.</div>
      </Section>
      <Section title="Audience feedback on this slide" right={<Tip text="Responses appear in the rail beside the slide during a live SlideForge session. The lab records the choice and marks the slide." />}>
        <div className="engage-kinds" role="radiogroup" aria-label="Audience feedback">
          {FEEDBACK.map((f) => (
            <button key={f.value} role="radio" aria-checked={kind === f.value} className={`engage-kind${kind === f.value ? ' on' : ''}`} title={f.hint}
              onClick={() => mutate((d) => { const s = d.slides.find((x) => x.id === slide.id); if (!s) return; if (f.value === 'none') delete s.feedback; else s.feedback = { kind: f.value }; })}>
              {f.icon}<span>{f.label}</span>
            </button>
          ))}
        </div>
        {kind !== 'none' && <div className="hint">{FEEDBACK.find((f) => f.value === kind)?.hint} Runs beside the slide in a live SlideForge session; nothing is drawn on the slide.</div>}
      </Section>
    </>
  );
}

/** SlideForge's activities and games by lesson phase, each with its designs: a press adds its slides,
 *  in the deck's style, after the slide on screen. Loaded the first time the list opens. */
function ActivityPicker({ done }: { done: () => void }) {
  const [lib, setLib] = useState<{ data: ActivityData; m: typeof import('../model/designs') } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([import('../model/designs'), import('../assets/activities.json')]).then(([m, d]) => {
      const data = (d as { default: ActivityData }).default ?? (d as unknown as ActivityData);
      if (live) setLib({ data, m });
    });
    return () => { live = false; };
  }, []);
  if (!lib) return <div className="hint">Loading the activities…</div>;
  const add = (a: ActivityEntry, o: ActivityOption) => {
    const { deck, addSlide, showToast } = useStore.getState();
    const slides = o.make(themeOf(deck) ?? LAYOUT_STYLES[0]);
    // Each goes after the one before it: addSlide puts a slide after the one on screen and moves there.
    slides.forEach((s) => addSlide(s));
    showToast(`${a.title} (${o.label}) added: ${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}. Edit it on the slide; how to run it is in the notes.`);
    done();
  };
  return (
    <div className="engage-picker">
      {lib.m.byPhase(lib.data).map((g) => (
        <div key={g.phase} className="engage-phase">
          <div className="engage-phase-label">{g.icon} {g.label}</div>
          {g.items.map((a) => (
            <div key={a.key} className="engage-act" title={a.blurb}>
              <div className="engage-act-head">
                {a.game ? <Gamepad2 size={14} /> : <Timer size={14} />}
                <b>{a.title}</b>
                <small>{a.game ? a.game.styleLabel : a.minutes ? `${a.minutes} min` : ''}</small>
              </div>
              <div className="engage-act-opts">
                {lib.m.optionsFor(a).map((o) => <button key={o.id} className={o.id === 'lab' ? 'on' : ''} onClick={() => add(a, o)}>{o.label}</button>)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
