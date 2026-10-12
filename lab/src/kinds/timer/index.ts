// kinds/timer/: the timer layer. Its public interface: what kinds/index.ts registers.
import { rasterTimer } from './raster';
import { timerDef } from './def';
import type { LayerKind } from '../../engine';

export const timerKind: LayerKind = { def: timerDef, raster: rasterTimer };
