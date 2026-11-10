// kinds/video/: the video layer. Its public interface: what kinds/index.ts registers.
import { rasterVideo } from './raster';
import { videoDef } from './def';
import { videoEmbed, type LayerKind } from '../../engine';

// A YouTube or Vimeo link is a web layer: the show frames the real player where the canvas draws its still.
export const videoKind: LayerKind = {
  def: videoDef, raster: rasterVideo,
  web: (l) => { const src = videoEmbed(l.params); return src ? { kind: 'frame', src, allow: 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen' } : null; },
};
