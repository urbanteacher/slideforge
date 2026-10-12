// kinds/model/: the simulation layer. Its public interface: what kinds/index.ts registers.
import { rasterModel } from './raster';
import type { KindDrawing } from '../../engine';

export const modelDrawing: KindDrawing = { raster: rasterModel };
