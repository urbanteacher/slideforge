// kinds/timer/: the timer layer. Its public interface: what kinds/index.ts registers.
import { rasterTimer } from './raster';
import type { KindDrawing } from '../../engine';

export const timerDrawing: KindDrawing = { raster: rasterTimer };
