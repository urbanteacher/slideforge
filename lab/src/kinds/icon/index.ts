// kinds/icon/: the icon layer. Its public interface: what kinds/index.ts registers, and the set for the lesson file.
import { rasterIcon } from './raster';
import { iconDef } from './def';
import type { LayerKind } from '../../engine';

export { ICON_GROUPS, ICON_NAMES, drawIcon, hasIcon } from './draw';
export const iconKind: LayerKind = { def: iconDef, raster: rasterIcon };
