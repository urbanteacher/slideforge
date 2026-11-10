// kinds/connector/: the connector layer. Its public interface: what kinds/index.ts registers.
import { rasterConnector } from './raster';
import { connectorDef } from './def';
import { joinedPair } from '../../core';
import type { LayerKind } from '../../engine';

// It reads its slide: its line runs between where the two layers are (engine/raster.ts readsSlide). What it reads is
// those two layers' boxes, so it is drawn again when one of them moves, not whenever anything on the slide changes.
export const connectorKind: LayerKind = {
  def: connectorDef, raster: rasterConnector, readsSlide: true,
  reads: (l, s) => { const p = joinedPair(s, l); return p ? [p[0].box, p[1].box] : [null]; },
};
