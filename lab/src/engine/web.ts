import type { Layer } from '../core';

// Web layers: live web content the show lays over the canvas (the shared path for video links, widgets and whatever
// comes next). A kind declares `web` (engine/registry.ts LayerKind) and the show, finding it on a slide, frames it at
// the layer's box; the canvas still draws the kind's own still beneath, which is what the editor, the exports and a
// shared link show. Two shapes:
//   - `frame`: an address on another site (YouTube, Vimeo), framed as it is;
//   - `page`: a page of our own (a widget), run sandboxed from `doc`, laid out at the box's size on the slide and
//     scaled to the screen, so it looks the same on every projector.

export type WebContent =
  | { kind: 'frame'; src: string; allow?: string }
  | { kind: 'page'; doc: string; sandbox: string; background?: string; radius?: number };

/** What a kind says its layer shows live, or null for nothing (an empty widget, a video that is a file). */
export type WebFn = (layer: Layer) => WebContent | null;

const WEB: Record<string, WebFn> = {};

/** A kind's web content, from kinds/index.ts through registerKinds. */
export function registerWeb(id: string, fn: WebFn) { WEB[id] = fn; }

/** The live content of a layer, or null: only a visible layer with a box and a kind that declares some. The show also
 *  waits, as the layer's still does, for its click and its face (DeckPlayer.showing). */
export function webContent(layer: Layer): WebContent | null {
  const fn = WEB[layer.kind];
  if (!fn || layer.visible === false || !layer.box) return null;
  return fn(layer);
}
