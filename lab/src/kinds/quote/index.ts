// kinds/quote/: the quote layer. Its public interface: what kinds/index.ts registers.
import { rasterQuote, quoteLayout } from './raster';
import { quoteDef } from './def';
import type { LayerKind } from '../../engine';

export const quoteKind: LayerKind = { def: quoteDef, raster: rasterQuote, measure: (c, p, w) => quoteLayout(c, p, w) };
