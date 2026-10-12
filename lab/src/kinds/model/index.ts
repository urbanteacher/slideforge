// kinds/model/: the simulation layer. Its public interface: what kinds/index.ts registers.
import { rasterModel } from './raster';
import { modelDef } from './def';
import type { LayerKind } from '../../engine';

export const modelKind: LayerKind = { def: modelDef, raster: rasterModel };
