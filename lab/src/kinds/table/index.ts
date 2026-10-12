// kinds/table/: the table layer. Its public interface: what kinds/index.ts registers.
import { rasterTable, tableLayout } from './raster';
import { tableDef } from './def';
import type { LayerKind } from '../../engine';

// Columns wider, together, than the table can be do not fit: the cells would be cut off.
// A table a little too wide shrinks to one line a row; one much too wide keeps its size and wraps.
export const tableKind: LayerKind = { def: tableDef, raster: rasterTable, measure: (c, p, w) => { const L = tableLayout(c, p, w); return L.natural > w + 1 && L.natural < w * 1.3 ? { height: Infinity } : L; } };
