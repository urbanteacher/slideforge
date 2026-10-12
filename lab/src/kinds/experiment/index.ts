// kinds/experiment/: the predict and compare layer. Its public interface: what kinds/index.ts registers.
import { rasterExperiment } from './raster';
import type { KindDrawing } from '../../engine';

export const experimentDrawing: KindDrawing = { raster: rasterExperiment };
