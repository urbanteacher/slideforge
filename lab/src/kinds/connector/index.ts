// kinds/connector/: the connector layer. Its public interface: what kinds/index.ts registers.
import { rasterConnector } from './raster';
import { connectorDef } from './def';
import type { LayerKind } from '../../engine';

// It reads its slide: its line runs between where the two layers are (engine/raster.ts readsSlide).
export const connectorKind: LayerKind = { def: connectorDef, raster: rasterConnector, readsSlide: true };
