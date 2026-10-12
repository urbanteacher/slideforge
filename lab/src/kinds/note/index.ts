// kinds/note/: the note layer. Its public interface: what kinds/index.ts registers.
import { rasterNote, noteLayout } from './raster';
import type { KindDrawing } from '../../engine';

export const noteDrawing: KindDrawing = { raster: rasterNote, measure: (c, p, w) => noteLayout(c, p, w) };
