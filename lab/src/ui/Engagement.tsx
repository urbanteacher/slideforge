import { Cloud, Gamepad2, ListChecks, Minus, PencilLine, SlidersHorizontal, Sparkles, Timer } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { createLayer, createSlide } from '../model/defaults';
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
  const { mutate, addSlide, showToast } = useStore.getState();
  const [adding, setAdding] = useState(false);
  const kind = slide.feedback?.kind ?? 'none';

  /** A placeholder slide after this one, carrying one quiz or activity card, the way a SlideForge game lands. */
  const insert = (what: 'quiz' | 'activity' | 'game') => {
    const card = what === 'activity'
      ? createLayer('activity', { name: 'Activity', box: { x: 360, y: 250, w: 1200, h: 580 }, anim: { type: 'rise', duration: 0.7 } })
      : createLayer('quiz', { name: what === 'game' ? 'Game' : 'Quiz', params: what === 'game' ? { label: 'Game', question: 'A game runs here in SlideForge', options: 'Beat the Clock\nSpot the Error\nPredict the Outcome\nBoss battle' } : {}, box: { x: 260, y: 270, w: 1400, h: 540 }, anim: { type: 'rise', duration: 0.7 } });
    const s = createSlide(what === 'activity' ? 'Activity' : what === 'game' ? 'Game' : 'Knowledge check', [card], slide.background);
    addSlide(s);
    setAdding(false);
    showToast(`${s.name} placeholder added as the next slide. Double-click the card to write it; SlideForge runs it live.`);
  };
  const choice = (icon: ReactNode, label: string, hint: string, run: () => void) => (
    <button className="engage-choice" onClick={run}>{icon}<span><b>{label}</b><small>{hint}</small></span></button>
  );

  return (
    <>
      <div className="engage-eyebrow">Games and the room · placeholders</div>
      <Section title="Add a game or activity" right={<Tip text="Knowledge checks and games go between slides. Polls, word clouds, brainstorms and scales sit beside this slide." />}>
        <button className="btn-soft accent engage-add" aria-expanded={adding} onClick={() => setAdding(!adding)}><Sparkles size={13} />{adding ? 'Close' : '+ Add activity'}</button>
        {adding && (
          <div className="engage-choices">
            {choice(<ListChecks size={16} />, 'Knowledge check', 'A question with options, as the next slide', () => insert('quiz'))}
            {choice(<Timer size={16} />, 'Timed activity', 'Think, pair, share — steps with minutes', () => insert('activity'))}
            {choice(<Gamepad2 size={16} />, 'Game', 'A placeholder for one of SlideForge’s games', () => insert('game'))}
          </div>
        )}
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
