// kinds/wipe/: the before / after layer. Its public interface: what kinds/index.ts registers.
import { rasterWipe } from './raster';
import { wipeDef } from './def';
import type { LayerKind } from '../../engine';

export const wipeKind: LayerKind = { def: wipeDef, raster: rasterWipe };
