// kinds/diagram/: the diagram layer. Its public interface: what kinds/index.ts registers.
import { rasterDiagram } from './raster';
import { diagramDef } from './def';
import type { LayerKind } from '../../engine';

export const diagramKind: LayerKind = { def: diagramDef, raster: rasterDiagram };
export { SAMPLES as DIAGRAM_SAMPLES } from './def';
export { layerDiagram } from './raster';
export { diagramSkin, skinPairs } from './skin';
