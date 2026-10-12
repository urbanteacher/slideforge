// kinds/shape/: the shape layer. Its public interface: what kinds/index.ts registers.
import { rasterShape } from './raster';
import type { KindDrawing } from '../../engine';

export const shapeDrawing: KindDrawing = { raster: rasterShape };
