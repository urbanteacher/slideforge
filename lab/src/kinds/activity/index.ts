// kinds/activity/: the activity layer. Its public interface: what kinds/index.ts registers.
import { rasterActivity, activityLayout } from './raster';
import { activityDef } from './def';
import type { LayerKind } from '../../engine';

export const activityKind: LayerKind = { def: activityDef, raster: rasterActivity, measure: (c, p, w) => activityLayout(c, p, w) };
