// kinds/scene/: the motion experiment layer. Its public interface: what kinds/index.ts registers.
import { rasterScene } from './raster';
import type { KindDrawing } from '../../engine';

export const sceneDrawing: KindDrawing = { raster: rasterScene };
