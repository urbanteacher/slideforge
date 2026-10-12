// kinds/shape/: the shape layer. Its public interface: what kinds/index.ts registers.
import { rasterShape } from './raster';
import { shapeDef } from './def';
import type { LayerKind } from '../../engine';

export const shapeKind: LayerKind = { def: shapeDef, raster: rasterShape };
