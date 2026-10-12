// The motion experiment layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const sceneDef: KindDef = {
  // SlideForge's motion specimens: ten behaviours on one stage, in five looks. Next steps it; in
  // Preview the room can also drag it or press a card.
  id: 'scene', name: 'Motion experiment', category: 'source', content: 'scene',
  description: 'An interactive stage: a mask reveal, a diagram drawn on, cards that open, callouts, a scrubbable transformation, cause and effect, a branching choice, an exploded diagram, a lens or story panels.',
  params: [
    { key: 'mode', label: 'Behaviour', type: 'select', default: 'cards', group: 'Experiment', options: [
      { value: 'mask', label: 'Mask reveal' }, { value: 'draw', label: 'Draw-on diagram' }, { value: 'cards', label: 'Card to detail' }, { value: 'annotate', label: 'Animated annotations' },
      { value: 'scrub', label: 'Scrubbable transformation' }, { value: 'cause', label: 'Cause and effect' }, { value: 'branch', label: 'Branching scenario' },
      { value: 'explode', label: 'Exploded diagram' }, { value: 'lens', label: 'Focus lens' }, { value: 'panels', label: 'Responsive story panels' }] },
    { key: 'look', label: 'Look', type: 'select', default: 'editorial', group: 'Experiment', options: [
      { value: 'editorial', label: 'Editorial' }, { value: 'paper', label: 'Layered paper' }, { value: 'technical', label: 'Technical drawing' }, { value: 'cinema', label: 'Cinematic depth' }, { value: 'comic', label: 'Comic sequence' }] },
    { key: 'items', label: 'Points', type: 'text', default: 'Observe\tNotice what the audience can see.\nInterpret\tExplain what the evidence supports.\nAct\tChoose a next step and name its owner.', group: 'Experiment', info: 'Up to four, one per line: a label, a tab, then its explanation. Scrub reads the explanation as a number.' },
    { key: 'image', label: 'Picture', type: 'image', default: '', group: 'Experiment', info: 'For the mask, annotations and lens.' },
    { key: 'factor', label: 'Multiplier a', type: 'number', min: -10, max: 10, step: 0.5, default: 2, group: 'Experiment', decimals: 1, when: (p) => p.mode === 'cause' },
    { key: 'subtitle', label: 'Hint', type: 'text', default: '', group: 'Experiment' },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Text size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
  ],
};
