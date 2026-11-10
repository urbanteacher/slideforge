// kinds/widget/: the widget layer. Its public interface: what kinds/index.ts registers.
import { rasterWidget } from './raster';
import { widgetDef } from './def';
import type { LayerKind } from '../../engine';

export { WIDGET_STARTER } from './starter';
export const widgetKind: LayerKind = { def: widgetDef, raster: rasterWidget };
