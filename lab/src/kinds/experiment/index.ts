// kinds/experiment/: the predict and compare layer. Its public interface: what kinds/index.ts registers.
import { rasterExperiment } from './raster';
import { experimentDef } from './def';
import type { LayerKind } from '../../engine';

export const experimentKind: LayerKind = { def: experimentDef, raster: rasterExperiment };
