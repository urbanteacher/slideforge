// kinds/image/: the image layer. Its public interface: what kinds/index.ts registers.
import { rasterImage } from './raster';
import type { KindDrawing } from '../../engine';

export const imageDrawing: KindDrawing = { raster: rasterImage };
