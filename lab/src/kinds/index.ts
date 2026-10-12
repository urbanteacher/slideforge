// kinds/: the list of layer kinds, one line each. Importing it registers every kind with the engine, which
// reaches the kinds only through what is registered (lab-engine-plan hard rule 13): the inspector, thumbnails,
// new layers, export and the player all read that one list. The entries import it (main.tsx,
// app/player-entry.ts, app/stage-entry.ts), and so does layouts/, since every slide is built from one: a module
// built on its own (the converter, a test) has its kinds too.
import { registerKinds, type LayerKind } from '../engine';
import { textKind } from './text';
import { imageKind } from './image';
import { shapeKind } from './shape';
import { videoKind } from './video';
import { chartKind } from './chart';
import { quizKind } from './quiz';
import { activityKind } from './activity';
import { noteKind } from './note';
import { tableKind } from './table';
import { timerKind } from './timer';
import { wipeKind } from './wipe';
import { modelKind } from './model';
import { experimentKind } from './experiment';
import { sceneKind } from './scene';
import { quoteKind } from './quote';
import { EFFECTS } from './effects';

/** Every kind, in the order the add menu and the inspector list them: the content kinds, then the effects. */
export const KINDS: LayerKind[] = [
  textKind,
  imageKind,
  shapeKind,
  videoKind,
  chartKind,
  quizKind,
  activityKind,
  noteKind,
  tableKind,
  timerKind,
  wipeKind,
  modelKind,
  experimentKind,
  sceneKind,
  quoteKind,
  ...EFFECTS,
];

registerKinds(KINDS);
