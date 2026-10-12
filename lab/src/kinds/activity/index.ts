// kinds/activity/: the activity layer. Its public interface: what kinds/index.ts registers.
import { rasterActivity, activityLayout } from './raster';
import type { KindDrawing } from '../../engine';

export const activityDrawing: KindDrawing = { raster: rasterActivity, measure: (c, p, w) => activityLayout(c, p, w) };
