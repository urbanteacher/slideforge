// kinds/connector/: the connector layer. Its public interface: what kinds/index.ts registers.
import { rasterConnector } from './raster';
import { connectorDef } from './def';
import type { LayerKind } from '../../engine';

export const connectorKind: LayerKind = { def: connectorDef, raster: rasterConnector };
