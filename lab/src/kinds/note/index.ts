// kinds/note/: the note layer. Its public interface: what kinds/index.ts registers.
import { rasterNote, noteLayout } from './raster';
import { noteDef } from './def';
import type { LayerKind } from '../../engine';

export const noteKind: LayerKind = { def: noteDef, raster: rasterNote, measure: (c, p, w) => noteLayout(c, p, w) };
