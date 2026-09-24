import { createLayer } from '../model/defaults';
import { gridFor } from '../model/layouts';
import { slideOf, useStore } from '../model/store';
import type { Layer, Slide } from '../model/types';
import { addCaption, applyFrame, captionsOf, setCaptionStyle } from './picture';

/*
 * A video's arrangement on its slide, SlideForge's three ways of showing a clip:
 *   bare     full screen, no words on it — the clip is the slide
 *   caption  full screen, a caption over the clip on a shade (SlideForge's video caption)
 *   heading  framed at 16:9 under the slide's heading, nothing over the picture
 * The words stay on the slide as text, edited there; this only places and shows or hides them.
 */
export type VideoLayout = 'bare' | 'caption' | 'heading';

const headingOf = (s: Slide, v: Layer) => s.layers.find((l) => l.kind === 'text' && l.id !== v.id && /heading|title/i.test(l.name) && !l.params.hfSlot);

export function videoLayoutOf(s: Slide, v: Layer): VideoLayout | 'drawn' {
  const deck = useStore.getState().deck, b = v.box;
  if (!b) return 'drawn';
  const bleed = b.x <= 1 && b.y <= 1 && b.w >= deck.width - 2 && b.h >= deck.height - 2;
  const caps = captionsOf(s, v).filter((c) => c.visible);
  if (bleed) return caps.length && v.params.capStyle !== 'hidden' ? 'caption' : 'bare';
  const h = headingOf(s, v);
  return h?.visible && Math.abs(b.w / b.h - 16 / 9) < 0.02 ? 'heading' : 'drawn';
}

export function setVideoLayout(videoId: string, layout: VideoLayout) {
  const st = useStore.getState();
  const slideId = slideOf(st).id;
  const deck = st.deck, g = gridFor(deck);
  st.mutate((d) => {
    const s = d.slides.find((x) => x.id === slideId)!;
    const v = s.layers.find((l) => l.id === videoId);
    if (!v?.box) return;
    const heading = headingOf(s, v);
    if (layout === 'heading') {
      // A heading across the top (made if there is none), the clip at 16:9 in the space beneath it.
      let h = heading;
      if (!h) {
        const dark = (s.background || '#ffffff').replace('#', '').match(/../g)!.map((x) => parseInt(x, 16)).reduce((a, c) => a + c, 0) < 384;
        h = createLayer('text', { name: 'Heading', box: { x: g.left, y: g.top, w: g.right - g.left, h: 110, rot: 0 }, params: { text: 'Heading', font: 'Fraunces', weight: '600', size: 88, color: dark ? '#f5f4f2' : '#161616', lineHeight: 1.05, fit: 'shrink' }, anim: { type: 'rise', duration: 0.8 } });
        s.layers.push(h);
      }
      h.visible = true;
      const top = h.box!.y + h.box!.h + 40, maxH = g.foot - top, maxW = g.right - g.left;
      let w = maxW, hh = w * 9 / 16;
      if (hh > maxH) { hh = maxH; w = hh * 16 / 9; }
      Object.assign(v.box, { x: (deck.width - w) / 2, y: top, w, h: hh, rot: 0 });
      v.params.frame = '16:9';
    } else {
      v.params.frame = 'bleed';
      applyFrame(v, 'bleed', deck);
      // Full screen: the heading steps aside, so nothing but the caption (if any) sits over the clip.
      if (heading) heading.visible = false;
      // The video goes to the back of the slide's content, so its caption and band sit over it.
      const i = s.layers.indexOf(v), firstContent = s.layers.findIndex((l) => l.box);
      if (i > firstContent && firstContent >= 0) { s.layers.splice(i, 1); s.layers.splice(firstContent, 0, v); }
    }
  });
  const s = slideOf(useStore.getState()), v = s.layers.find((l) => l.id === videoId)!;
  if (layout === 'caption') {
    if (!captionsOf(s, v).length) addCaption(videoId);
    setCaptionStyle(videoId, 'gradient');
  } else if (captionsOf(s, v).length) setCaptionStyle(videoId, 'hidden');
}
