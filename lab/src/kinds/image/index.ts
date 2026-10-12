// kinds/image/: the image layer. Its public interface: what kinds/index.ts registers.
import { rasterImage } from './raster';
import { imageDef } from './def';
import type { LayerKind } from '../../engine';

export const imageKind: LayerKind = { def: imageDef, raster: rasterImage };
