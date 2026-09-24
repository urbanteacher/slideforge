import londonNight from '../assets/motion-lab-london-night.jpg?inline';
import skyline from '../assets/nul/nu-london-skyline.png?inline';
import snowMap from '../assets/nul/snow-cholera-map-1854.jpg?inline';
import { uid } from './defaults';
import { LAYOUTS, closerSlide, columnsSlide, funnelSlide, introductionSlide, journeySlide, mindmapSlide, orgchartSlide, quoteSlide, railSlide, sectionEditorialSlide, sectionFrameSlide, sidecarTitleSlide, splitSlide, timelineSlide, type LayoutStyle } from './layouts';
import type { Deck, Slide } from './types';
import { finish, framed, kit } from './ukbtDeck';

// Northeastern University London: SlideForge's "Openers, breakaways & a layout range" (`pace-nul`)
// and the richer layouts from its Layout bank — timeline, funnel, mind map, people — written into the
// lab's own layouts in the NU London palette. The copy and notes are SlideForge's; where the lab does
// a thing better (a sidecar cover with the real N, a funnel whose bands follow their numbers) it does.

/** A full-bleed picture with its caption on a scrim. */
function photo(st: LayoutStyle, src: string, caption: string, credit: string, motion: 'zoom' | 'none'): Slide {
  const s = LAYOUTS.find((l) => l.id === 'image')!.make(st);
  const pic = s.layers.find((l) => l.kind === 'image')!;
  pic.name = 'Picture';
  Object.assign(pic.params, { src, fit: 'cover', frame: 'bleed', motion, motionSecs: '20', capStyle: 'gradient' });
  s.layers.find((l) => l.name === 'Caption band')!.params.captionOf = pic.id;
  s.layers.find((l) => l.name === 'Caption')!.params.text = caption;
  const cr = s.layers.find((l) => l.name === 'Caption credit')!;
  if (credit) cr.params.text = credit; else s.layers = s.layers.filter((l) => l !== cr);
  s.name = caption;
  return s;
}

export function nulDeck(): Deck {
  const { guide, on, put } = kit('nul');
  const split = splitSlide(on('working'), 'Say it. Show it.', ['Left: the claim in words.', 'Right: the picture that proves or frames it.', 'Build the bullets if you want the eye to wait.'], 'right');
  Object.assign(split.layers.find((l) => l.kind === 'image')!.params, { src: snowMap, fit: 'cover' });

  const slides: Slide[] = [
    put(sidecarTitleSlide(on('working'), 'See the\nargument.', 'An academic presentation gallery / Northeastern University London', guide.marks[1].src), 'working',
      'Reusable opening composition. Change the subject and supporting line; the side panel takes the palette’s loud colour.'),
    put(photo(on('working'), londonNight, 'One claim on a photograph', '', 'zoom'), 'working',
      'OPENER — full-bleed image. The picture is the mood; the caption is the claim. The scrim keeps the words readable.'),
    put(introductionSlide(on('working'), 'Your name', 'Role · Northeastern University London', 'Replace this with who is standing at the front, and why this room should listen.'), 'working',
      'OPENER — introduction. Once per cohort, not every week. Drop your photo on the portrait.'),
    put(sectionEditorialSlide(on('quiet'), 'Ask a better\nquestion.', 'Choose the evidence that would answer it.'), 'quiet',
      'A chapter break signals a change in the argument. This is one available structure, not a rule for every deck.'),
    put(columnsSlide(on('working'), 'What does the evidence need to show?', ['A pattern that a summary can hide.', 'A comparison made on the same terms.', 'A limitation that changes the conclusion.']), 'working',
      'Columns for parallel ideas; the side heading for a single argument. These are examples, not limits.'),
    put(sectionFrameSlide(on('working'), 'Follow the\nevidence.', 'Let the information determine its form.'), 'working',
      'A quieter framed section offers an alternative to a full-bleed break.'),
    put(split, 'working', 'VARIATION — dual coding. Image + text after a breakaway keeps the chapter from feeling like another bullet wall. The map is John Snow’s, 1854.'),
    put(quoteSlide(on('quiet'), 'Choose the form that helps the audience examine the idea.', 'A design principle to apply, not a fixed slide formula'), 'quiet',
      'Original gallery copy. This is not an attributed quotation.'),
    put(railSlide(on('working'), 'Leave a useful next step.', ['State what the evidence supports.', 'Make the remaining uncertainty visible.', 'Name the question to investigate next.']), 'working',
      'The side heading holds one claim while the points build under it.'),
    put(journeySlide(on('working'), 'The arc of this hour', 'Reveal each beat as you go', [
      ['Open', 'Title or image that states the stake.'], ['Break', 'Section — Part one.'], ['Build', 'Cards, split, keywords — the work.'],
      ['Break', 'Section — Part two.'], ['Close', 'Fact, quote, or photograph.'],
    ]), 'working', 'VARIATION — journey. This slide is the map of the gallery itself. Replace the milestones with your session outline.'),
    // The layout range: the richer layouts from SlideForge's Layout bank.
    put(timelineSlide(on('working'), 'Where the ideas in this module came from', '', [
      ['1786', 'Playfair', 'The bar chart and the line chart, in one atlas'], ['1858', 'Nightingale', 'The rose diagram takes an argument to Parliament'],
      ['1967', 'Bertin', 'Semiology of Graphics — the visual variables named'], ['1983', 'Tufte', 'Data-ink ratio and chartjunk'],
      ['2010s', 'FT & Datawrapper', 'The visual vocabulary goes mainstream'],
    ]), 'working', 'TIMELINE — date, event, detail; up to eight. Dates are labels, so “Week 3” or “Term 2” work.'),
    put(funnelSlide(on('working'), 'What happens to a chart between the analyst and the reader', '', [
      ['Data points plotted', '1,200', 'everything the query returned'], ['Marks the eye registers', '300', 'the rest is texture'],
      ['Marks that are compared', '40', 'where the reading actually happens'], ['Number remembered', '1', 'if the title did its job'],
    ]), 'working', 'FUNNEL — stage, value, note. With numbers the bands follow them, so a cliff draws as a cliff.'),
    put(mindmapSlide(on('working'), 'Where visualisation sits', [
      ['Perception', 'What the eye does before the brain catches up.'], ['Encoding', 'Turning a number into a position, length or hue.'],
      ['Interaction', 'Letting the reader ask the next question.'], ['Critique', 'Saying why a chart fails.'],
    ]), 'working', 'MIND MAP — siblings with no order, around the idea they belong to. Use Journey when there is an order.'),
    put(orgchartSlide(on('working'), 'People & structure — who is who', [
      ['Mark Martin', 'Course Leader', ''], ['Ada Lovelace', 'Lead Tutor', 'Mark Martin'], ['Alan Turing', 'Tutor', 'Mark Martin'],
      ['Grace Hopper', 'Lab Demonstrator', 'Ada Lovelace'], ['Katherine Johnson', 'Lab Demonstrator', 'Alan Turing'],
    ]), 'working', 'PEOPLE & STRUCTURE — name, role, and who they report to. Leave the third column empty and they sit at the top.'),
    put(quoteSlide(on('quiet'), 'The purpose of visualization is insight, not pictures.', 'Ben Shneiderman'), 'quiet',
      'QUOTE — the quotation, and who said it. Past three lines it has stopped being a quote slide.'),
    put(closerSlide(on('working'), 'Leave them with a picture.', 'Northeastern University London', skyline, 1458 / 533), 'working',
      'CLOSER — image. Same tool as the opener, different job: end on atmosphere and one line, not another bullet list.'),
  ];
  return framed({ id: uid(), title: 'NU London — openers, breakaways & a layout range', width: 1920, height: 1080, version: 1, theme: 'guide', styleGuide: guide, slides: finish(slides) }, guide.marks[0].src, 'Northeastern University London');
}
