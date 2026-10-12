// kinds/: the list of layer kinds, one line each. Importing it registers every kind with the engine, which
// reaches the kinds only through what is registered (lab-engine-plan hard rule 13). The entries import it
// (main.tsx, app/player-entry.ts, app/stage-entry.ts), and so does layouts/, since every slide is built
// from one: a module built on its own (the converter, a test) has its kinds too.
import { registerRaster } from '../engine';
import { textDrawing } from './text';
import { shapeDrawing } from './shape';
import { imageDrawing } from './image';
import { videoDrawing } from './video';
import { chartDrawing } from './chart';
import { quizDrawing } from './quiz';
import { activityDrawing } from './activity';
import { noteDrawing } from './note';
import { quoteDrawing } from './quote';
import { tableDrawing } from './table';
import { timerDrawing } from './timer';
import { wipeDrawing } from './wipe';
import { modelDrawing } from './model';
import { experimentDrawing } from './experiment';
import { sceneDrawing } from './scene';

const DRAWINGS = {
  text: textDrawing,
  shape: shapeDrawing,
  image: imageDrawing,
  video: videoDrawing,
  chart: chartDrawing,
  quiz: quizDrawing,
  activity: activityDrawing,
  note: noteDrawing,
  quote: quoteDrawing,
  table: tableDrawing,
  timer: timerDrawing,
  wipe: wipeDrawing,
  model: modelDrawing,
  experiment: experimentDrawing,
  scene: sceneDrawing,
};

for (const [id, d] of Object.entries(DRAWINGS)) registerRaster(id, d);
