// kinds/quote/: the quote layer. Its public interface: what kinds/index.ts registers.
import { rasterQuote, quoteLayout } from './raster';
import type { KindDrawing } from '../../engine';

export const quoteDrawing: KindDrawing = { raster: rasterQuote, measure: (c, p, w) => quoteLayout(c, p, w) };
