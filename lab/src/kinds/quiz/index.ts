// kinds/quiz/: the quiz layer. Its public interface: what kinds/index.ts registers.
import { rasterQuiz, quizLayout } from './raster';
import type { KindDrawing } from '../../engine';

export const quizDrawing: KindDrawing = { raster: rasterQuiz, measure: (c, p, w) => quizLayout(c, p, w) };
