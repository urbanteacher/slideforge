// A timed routine (Think-Pair-Share, a jigsaw, a seminar): its rows are its stages, Next walks them, each stage has
// its own clock and gives the phones a job (classic js/stages.js; the stages are read by SlideForge's own
// src/activities/stages.js). The lab's Activity panel may give a stage another time or job (slide.activity.settings):
// those win, stage by stage.

import { activityBrief, activityStages } from '@sf/activities/stages.js';
import { parseKeywordLine } from '@sf/deck/content.js';
import type { ActivityKind, RoomStage } from './types';

const PAIR = /\b(pair|partner)\b/i;

export const stagesKind: ActivityKind = {
  key: 'stages',
  name: 'Timed stages',
  runs: (p) => p.type === 'keywords' && p.activityPresentation === 'stages',
  stages(p, settings) {
    const set = settings?.stages ?? [];
    const bullets = [...(p.bullets ?? [])];
    const stages = activityStages(p, parseKeywordLine).map((st, k): RoomStage => {
      const mine = set[k];
      const seconds = mine && Number.isFinite(mine.minutes) ? Math.max(0, Math.min(3600, Math.round(mine.minutes * 60))) : st.seconds;
      const job = mine?.job ?? st.job;
      // A job changed to talk: a group, unless the stage says it is a pair (src/activities/stages.js groupTalk).
      const group = job === 'talk' && (st.job === 'talk' ? st.group : !PAIR.test(st.name));
      // A stage given another time: its row says the new one, as SlideForge's row would.
      if (seconds !== st.seconds) bullets[st.row] = `${seconds ? `${st.name} · ${timeOf(seconds)}` : st.name}\t${st.text}`;
      return { i: st.i, name: st.name, seconds, text: st.text, job, group };
    });
    return { stages, brief: activityBrief(p, parseKeywordLine)?.text ?? '', page: { ...p, bullets } };
  },
};

/** A stage's time as a row's label says it: "2 min", "1.5 min", "45 sec". */
const timeOf = (s: number) => (s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.round((s / 60) * 10) / 10} min` : `${s} sec`);
