import type { Deck } from '../model/types';
import { download, slug } from './exporters';

/** One slide as the PowerPoint carries it: the finished picture, and what goes in PowerPoint's notes. */
export interface PptxSlide { image: string; notes: string; hidden: boolean; name?: string }

/** PowerPoint's widescreen width, in inches; the height follows the deck's own shape. */
const WIDTH_IN = 13.333;

/** The deck as a PowerPoint file: each slide one full-size picture, exactly as SlideForge draws it fully
 *  built, with its speaker notes in PowerPoint's notes and hidden slides kept hidden. Pictures, not
 *  editable text: shaders, live charts and motion have nothing to become in PowerPoint, and a picture
 *  looks the same in every copy of it. PptxGenJS is loaded only when a file is made. */
export async function buildPptx(deck: Deck, slides: PptxSlide[]): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  const h = Math.round(((WIDTH_IN * deck.height) / deck.width) * 1000) / 1000;
  pptx.defineLayout({ name: 'SLIDEFORGE', width: WIDTH_IN, height: h });
  pptx.layout = 'SLIDEFORGE';
  pptx.title = deck.title || 'Untitled lesson';
  pptx.company = 'SlideForge';
  for (const s of slides) {
    const slide = pptx.addSlide();
    // PptxGenJS takes the picture without its data: prefix.
    slide.addImage({ data: s.image.replace(/^data:/, ''), x: 0, y: 0, w: WIDTH_IN, h, altText: s.name || undefined });
    if (s.notes.trim()) slide.addNotes(s.notes);
    if (s.hidden) slide.hidden = true;
  }
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

export async function exportPptx(deck: Deck, slides: PptxSlide[]) {
  download(`${slug(deck.title)}.pptx`, await buildPptx(deck, slides));
}
