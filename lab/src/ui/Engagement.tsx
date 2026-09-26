import { Cloud, Gamepad2, ListChecks, Minus, PencilLine, SlidersHorizontal, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { enterView, slideOf, useStore, type LabView } from '../model/store';
import type { FeedbackKind } from '../model/types';
import { focusBrowse } from './Browse';
import { Section, Tip } from './controls';
import { FeedbackSettings } from './special';

// SlideForge's Engagement tab: the audience feedback a slide asks the room for, recorded and marked
// in the editor for SlideForge's live room to run. Games and activities are chosen in Browse (Browse.tsx),
// in the Quiz studio and Activities; in the Lesson studio this tab sends you there.

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
  const view = useStore((s) => s.view);
  const kind = slide.feedback?.kind ?? 'none';

  return (
    <>
      <div className="engage-eyebrow">Games and activities · designed in the lab</div>
      {/* Games and activities are chosen in Browse, in the Quiz studio and Activities, and edited there:
          one place for each, so the Lesson studio sends you there rather than keeping a second list. */}
      {view === 'lesson' && (
        <Section title="Add a game or activity" right={<Tip text="Browse, in the Quiz studio and Activities, has each of SlideForge's games and activities as the lab designs them. Each goes in after the slide on screen." />}>
          <div className="engage-browse">
            <button className="btn-soft accent" onClick={() => openStudio('quiz')}><Gamepad2 size={13} />Browse games</button>
            <button className="btn-soft accent" onClick={() => openStudio('activities')}><Timer size={13} />Browse activities</button>
          </div>
        </Section>
      )}
      <Section title="Audience feedback on this slide" right={<Tip text="Responses appear in the rail beside the slide during a live SlideForge session. The lab records the choice and marks the slide." />}>
        <div className="engage-kinds" role="radiogroup" aria-label="Audience feedback">
          {FEEDBACK.map((f) => (
            <button key={f.value} role="radio" aria-checked={kind === f.value} className={`engage-kind${kind === f.value ? ' on' : ''}`} title={f.hint}
              onClick={() => mutate((d) => { const s = d.slides.find((x) => x.id === slide.id); if (!s) return; if (f.value === 'none') delete s.feedback; else s.feedback = { ...(s.feedback ?? {}), kind: f.value }; })}>
              {f.icon}<span>{f.label}</span>
            </button>
          ))}
        </div>
        {kind !== 'none' && <div className="hint">{FEEDBACK.find((f) => f.value === kind)?.hint} Runs beside the slide in a live SlideForge session; nothing is drawn on the slide.</div>}
        {kind !== 'none' && <FeedbackSettings />}
      </Section>
    </>
  );
}

/** SlideForge, when the lab is its studios (js/lab-engine.js). */
type Host = { SF?: { LabEngine?: { showStudio?: (view: LabView) => void } } };

/** The Quiz studio or Activities, with Browse ready: SlideForge's own tab when the lab is embedded, so
 *  the header says where you are; alone, the lab's view. */
function openStudio(view: LabView) {
  let host: Host | null = null;
  try { host = window.parent !== window ? (window.parent as unknown as Host) : null; } catch { host = null; }
  const show = host?.SF?.LabEngine?.showStudio;
  if (show) show(view); else enterView(view);
  focusBrowse();
}
