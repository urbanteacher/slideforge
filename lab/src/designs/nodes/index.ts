// The Nodes formats (docs/nodes-studio-plan.md): the Nodes method as things students do, designed in
// the lesson's own style like the games and activities. The Nodes tab's Browse lists them in this order.
import { joinItUp } from './joinItUp';
import { threeAnswers } from './threeAnswers';
import { whichStep } from './whichStep';
import { labelParts } from './labelParts';
import { sameWord } from './sameWord';
import { beforeDuringAfter } from './beforeDuringAfter';
import { modelMarks } from './modelMarks';
import type { NodesFormat } from './types';
import { frameworkSlides, type FrameworkRun } from './framework';
import { GCSE_CS, TECHNICAL_ANALYSIS } from './frameworkData';

/** Framework: a whole Nodes framework on one topic, node by node (framework.ts). */
const framework: NodesFormat<FrameworkRun> = {
  id: 'framework', label: 'Framework', part: 'Every stage, on one topic',
  aim: 'A whole framework on one topic: the map, recall, then every stage in turn, each with a scaffold for its kind of thinking.',
  howTo: ['Open on the map: the stages, coloured by what each asks of students.', 'Recall first, from memory.', 'Then stage by stage: its question, its task, what to aim for, and a scaffold.', 'Close on the map: where did each student get to?'],
  phones: 'Answer each stage',
  starter: TECHNICAL_ANALYSIS,
  variants: [
    { id: 'technical-analysis', label: 'Technical Analysis · 16 stages', content: TECHNICAL_ANALYSIS },
    { id: 'gcse-cs', label: 'GCSE CS ladder · 13 stages', content: GCSE_CS },
  ],
  slides: (st, o) => frameworkSlides(st, o),
};

export type { NodesFormat } from './types';
export const NODES: NodesFormat<any>[] = [framework, beforeDuringAfter, joinItUp, labelParts, sameWord, threeAnswers, modelMarks, whichStep]; // eslint-disable-line @typescript-eslint/no-explicit-any
