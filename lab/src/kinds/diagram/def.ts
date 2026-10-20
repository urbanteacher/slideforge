// The diagram layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';
import { FLOOR } from '../../diagrams';

/** The Teaching Routine, as an overview loop of its eight stages in pairs (a loop holds six at slide size). */
export const LOOP_SAMPLE = 'hub: One real lesson | Y8 micro:bit step counter\nPlan, Connect\nDemonstrate, Activate\nFacilitate, Collaborate\n*Consolidate, Reflect';
export const SAMPLES: Record<string, string> = {
  loop: LOOP_SAMPLE,
  flowchart: '(Start)\nKnow how? -> Try it [yes], Ask a partner [no]\nTry it\n*(It works)\nAsk a partner -> Try it',
  timeline: '1786 | Playfair | the bar chart\n1858 | Nightingale | the rose diagram\n1967 | Bertin | the visual variables\n*1983 | Tufte | data-ink',
};

export const diagramDef: KindDef = {
  id: 'diagram', name: 'Diagram', category: 'source', content: 'diagram',
  description: 'A structural diagram drawn from a list: a loop of stations round a hub, a flowchart of steps and decisions, or a timeline to scale. Its geometry and connector rules are diagram-design’s (MIT, Cathryn Lavery); its colours are the slide’s.',
  params: [
    { key: 'diagram', label: 'Type', type: 'select', default: 'loop', group: 'Diagram', options: [
      { value: 'loop', label: 'Loop — stations round a hub' }, { value: 'flowchart', label: 'Flowchart — steps and decisions' }, { value: 'timeline', label: 'Timeline — events to scale' },
    ] },
    { key: 'data', label: 'Items', type: 'text', default: LOOP_SAMPLE, group: 'Diagram',
      info: 'One item a line, “name | sublabel”. A * marks the one focal item. Loop: a “hub:” line, then up to six stations clockwise from the top. Flowchart: (Start) for an oval, a ? for a decision, “-> Next [yes], Back [no]” for where it goes. Timeline: “1858 | name | sublabel”; numbers and dates are placed to scale.' },
    { key: 'columns', label: 'Columns', type: 'number', min: 0, max: 6, step: 1, default: 0, group: 'Diagram', decimals: 0, info: '0 picks: one row up to four steps, then two rows that read left to right and back.', when: (p) => p.diagram === 'flowchart' },
    { key: 'surface', label: 'Ground behind', type: 'color', default: '#ffffff', group: 'Style', info: 'The colour the boxes and label masks are cut from: the slide’s ground. Every colour is checked against it.' },
    { key: 'textColor', label: 'Ink', type: 'color', default: '#1a1a1a', group: 'Style' },
    { key: 'muted', label: 'Arrows', type: 'color', default: '#5f5a52', group: 'Style' },
    { key: 'accent', label: 'Focal', type: 'color', default: '#d94f2b', group: 'Style' },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Name size', type: 'number', min: FLOOR, max: 72, step: 1, default: 40, group: 'Style', unit: 'px', decimals: 0, info: `Sublabels are four fifths of it, and nothing goes under ${FLOOR}px. A diagram that does not fit says so rather than shrinking its words.` },
  ],
};
