// kinds/quiz/: the quiz layer. Its public interface: what kinds/index.ts registers.
import { rasterQuiz, quizLayout } from './raster';
import { quizDef } from './def';
import type { LayerKind } from '../../engine';

export const quizKind: LayerKind = { def: quizDef, raster: rasterQuiz, measure: (c, p, w) => quizLayout(c, p, w) };
