// kinds/video/: the video layer. Its public interface: what kinds/index.ts registers.
import { rasterVideo } from './raster';
import type { KindDrawing } from '../../engine';

export const videoDrawing: KindDrawing = { raster: rasterVideo };
