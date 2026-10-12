// kinds/scene/: the motion experiment layer. Its public interface: what kinds/index.ts registers.
import { rasterScene } from './raster';
import { sceneDef } from './def';
import type { LayerKind } from '../../engine';

export const sceneKind: LayerKind = { def: sceneDef, raster: rasterScene };
