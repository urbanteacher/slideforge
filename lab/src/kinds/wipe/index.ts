// kinds/wipe/: the before / after layer. Its public interface: what kinds/index.ts registers.
import { rasterWipe } from './raster';
import type { KindDrawing } from '../../engine';

export const wipeDrawing: KindDrawing = { raster: rasterWipe };
