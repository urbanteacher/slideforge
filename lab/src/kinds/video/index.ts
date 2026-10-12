// kinds/video/: the video layer. Its public interface: what kinds/index.ts registers.
import { rasterVideo } from './raster';
import { videoDef } from './def';
import type { LayerKind } from '../../engine';

export const videoKind: LayerKind = { def: videoDef, raster: rasterVideo };
