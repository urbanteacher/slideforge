// The gallery's layouts, one entry each, and their groups.
import { createLayer } from '../core';
import { after, colours, credit, item, picture, rule, slide, statement, text } from './blocks';
import { columnsSlide, funnelSlide, introductionSlide, mindmapSlide, orgchartSlide, quoteSlide, railSlide, sectionEditorialSlide, sectionFrameSlide, sidecarTitleSlide, timelineSlide } from './rich';
import { timedSlide } from './show';
import { cell, type LayoutDef } from './style';
import { bulletsSlide, cardsSlide, chartSlide, compareSlide, journeySlide, keyfactSlide, keywordsSlide, sectionSlide, splitSlide, statsSlide, tableSlide, titleSlide } from './system';

export const LAYOUTS: LayoutDef[] = [
  {
    id: 'title', name: 'Title', group: 'Introduce', blurb: 'Big title at the top. Subtitle underneath.',
    make: (st) => titleSlide(st, 'Lesson title', 'Your name · the course'),
  },
  {
    id: 'section', name: 'Section', group: 'Introduce', blurb: 'A clean pause between parts of the lesson.',
    make: (st) => sectionSlide(st, 'Next idea', 'A short bridge into what follows.'),
  },
  {
    id: 'statement', name: 'Statement', group: 'Introduce', blurb: 'One line, bold and as big as it fits. An opening thought, a provocation, a rule to remember.',
    make: (st) => slide(st, 'Statement', [
      statement(st, 'Every chart is a choice.', { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      credit(st, 'Say it, then pause.', { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center'),
    ]),
  },
  // SlideForge's statement compositions. The type is the same in each; what changes is where it sits
  // and the one piece of drawing that frames it.
  {
    id: 'statement-poster', name: 'Statement · poster', group: 'Introduce', blurb: 'The line low on the left, with a ring of the accent cut by the right edge. An opening.',
    make: (st) => slide(st, 'Statement · poster', [
      createLayer('shape', { name: 'Ring', box: { x: 1470, y: 248, w: 585, h: 585, rot: 0 }, opacity: 0.85, params: { shape: 'ring', ringWidth: 0.35, fill: st.accent, strokeWidth: 0 } }),
      // Set for two lines, low on the slide, with the credit a breath beneath them.
      statement(st, 'Direct attention.', { x: 132, y: 466, w: 1215, h: 350, rot: 0 }, 168, 'left'),
      credit(st, 'Movement with a purpose', { x: 132, y: 861, w: 1320, h: 54, rot: 0 }, 'left'),
    ]),
  },
  {
    id: 'statement-editorial', name: 'Statement · editorial', group: 'Introduce', blurb: 'A rule across the top and the line low on the left, like a magazine opener.',
    make: (st) => slide(st, 'Statement · editorial', [
      rule(st, { ...cell(1, 1, 12, 1), x: 165, w: 1590, y: 150 }, st.accent, 4),
      statement(st, 'Give the idea room', { x: 165, y: 466, w: 1215, h: 350, rot: 0 }, 168, 'left'),
      credit(st, 'A gentle background supports the opening', { x: 165, y: 861, w: 1320, h: 54, rot: 0 }, 'left'),
    ]),
  },
  {
    id: 'statement-frame', name: 'Statement · frame', group: 'Introduce', blurb: 'The line centred inside a fine inset frame. Calm, and easy to copy for a set of slides.',
    make: (st) => slide(st, 'Statement · frame', [
      createLayer('shape', { name: 'Frame', box: { x: 94.5, y: 94.5, w: 1731, h: 891, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.ink, fillOpacity: 0, stroke: st.ink, strokeOpacity: 0.12, strokeWidth: 3 } }),
      statement(st, 'Give the idea room', { x: 352, y: 315, w: 1215, h: 350, rot: 0 }, 168, 'center'),
      credit(st, 'Gentle / reflective opening', { x: 360, y: 709, w: 1200, h: 54, rot: 0 }, 'center'),
    ]),
  },
  {
    id: 'quote', name: 'Quote', group: 'Introduce', blurb: 'Someone else’s words, set large, with who said it.',
    make: (st) => slide(st, 'Quote', [
      item('quote', 'Quote', cell(2, 3, 10, 11), { ...colours(st), font: st.display, size: 92 }, 0),
    ]),
  },
  {
    id: 'content', name: 'Bullets', group: 'Explain & organise', blurb: 'A title and the points under it. The points fill the space and shrink to fit, so a long list stays on the slide.',
    make: (st) => bulletsSlide(st, 'Slide title', ['One point per line', 'Keep each to a sentence', 'Reveal them as you talk']),
  },
  {
    id: 'timed', name: 'Timed task', group: 'Explain & organise', blurb: 'The task and its steps, with SlideForge’s game clock counting down in the top right from when the slide comes up.',
    make: (st) => timedSlide(st, 'Discuss with the person next to you', ['What does the chart show first?', 'What would you check before believing it?', 'Agree one question to ask the room'], 3),
  },
  {
    id: 'cards', name: 'Cards', group: 'Explain & organise', blurb: 'Two to four ideas side by side, each a card that grows with its words.',
    make: (st) => cardsSlide(st, 'Three ideas to hold onto.', [['Say it', 'One idea per card, in a few words.'], ['Show it', 'A picture or an example beside it.'], ['Check it', 'Ask the room before moving on.']]),
  },
  {
    id: 'keyfact', name: 'Key fact', group: 'Explain & organise', blurb: 'One number or rule set large, with the detail beneath it.',
    make: (st) => keyfactSlide(st, 'The thing they must leave with', '90%', 'What the fact is, in a few words', ['The detail that makes the number mean something.']),
  },
  {
    id: 'keywords', name: 'Keywords', group: 'Explain & organise', blurb: 'Bold keyword and its definition — vocabulary pits.',
    make: (st) => keywordsSlide(st, 'Key vocabulary', [['Mean', 'The average: add them up, divide by how many.'], ['Median', 'The middle value once they are in order.'], ['Mode', 'The value that turns up most often.']]),
  },
  {
    id: 'split', name: 'Image + text', group: 'Show & explore', blurb: 'Half text, half picture — say it and show it.',
    make: (st) => splitSlide(st, 'Say it. Show it.', ['The picture takes one half', 'The points take the other', 'Swap sides with the next layout'], 'right'),
  },
  {
    id: 'split-left', name: 'Text + image', group: 'Show & explore', blurb: 'The same split with the picture on the left.',
    make: (st) => splitSlide(st, 'Say it. Show it.', ['The picture takes one half', 'The points take the other', 'Swap sides with the previous layout'], 'left'),
  },
  {
    id: 'image', name: 'Full picture', group: 'Show & explore', blurb: 'One picture, edge to edge, with a caption over it.',
    make: (st) => slide(st, 'Full picture', [
      picture({ x: 0, y: 0, w: 1920, h: 1080, rot: 0 }),
      // SlideForge's scrim: clear at the top, 82% black at the foot, so the caption reads over any picture.
      createLayer('shape', { name: 'Caption band', box: { x: 0, y: 714, w: 1920, h: 366, rot: 0 }, params: { shape: 'rect', radius: 0, gradient: true, fill: '#000000', fillOpacity: 0, fill2: '#000000', fill2Opacity: 0.82, angle: 90, strokeWidth: 0 } }),
      text('Caption', 'What the picture shows, in one line', { ...cell(1, 13, 10, 1), x: 138 }, { font: st.body, weight: '600', size: 66, color: '#ffffff', lineHeight: 1.14 }, after(0.4)),
      text('Caption credit', 'WHERE IT CAME FROM', { ...cell(1, 14, 10, 1), x: 138, y: 957 }, { font: st.body, weight: '500', size: 28, color: '#ffffff', tracking: 0.06, uppercase: true }, after(0.5)),
    ]),
  },
  {
    id: 'chart', name: 'Chart', group: 'Show & explore', blurb: 'A title, the chart and where the numbers came from.',
    make: (st) => chartSlide(st, 'What the numbers say', 'Source: where these figures come from'),
  },
  {
    id: 'stats', name: 'Stats', group: 'Infographic', blurb: 'The numbers that matter, set large, with a takeaway.',
    make: (st) => statsSlide(st, 'The numbers that matter', [['92%', 'read the chart title first'], ['48%', 'found the legend'], ['3 of 5', 'asked a follow-up']], 'Most read the title first — so put the finding in it.'),
  },
  {
    id: 'compare', name: 'Compare', group: 'Infographic', blurb: 'Two columns, row by row.',
    make: (st) => compareSlide(st, 'Two columns, row by row', ['Bar chart', 'Pie chart'], [['Best for', 'Comparing amounts', 'Parts of one whole'], ['Reads by', 'Length, on a shared axis', 'Angle and area'], ['Breaks when', 'Too many bars', 'More than five slices']]),
  },
  {
    id: 'table', name: 'Table', group: 'Explain & organise', blurb: 'Rows and columns, for when the exact value matters. Type the cells on the slide or in the panel.',
    make: (st) => tableSlide(st, 'When the exact value matters', '\tBasic\tStandard\tPremium\nPrice\t£10\t£25\t£60\nSeats\t1\t5\tUnlimited\nSupport\tEmail\tEmail and chat\tA named person'),
  },
  {
    id: 'journey', name: 'Journey', group: 'Infographic', blurb: 'A process in order: numbered stops along a line, up to six.',
    make: (st) => journeySlide(st, 'A process, in order', '', [['Ask', 'Start with the question.'], ['Try', 'Have a go, in pairs.'], ['Check', 'Compare with the answer.'], ['Explain', 'Say why it works.']]),
  },
  {
    id: 'sidecar', name: 'Title · sidecar', group: 'Introduce', blurb: 'The title on the ground, a panel of the loud colour beside it.',
    make: (st) => sidecarTitleSlide(st, 'See the\nargument.', 'Your course · your institution'),
  },
  {
    id: 'section-editorial', name: 'Section · editorial', group: 'Introduce', blurb: 'A rule across the top and the words low on the left.',
    make: (st) => sectionEditorialSlide(st, 'Ask a better\nquestion.', 'Choose the evidence that would answer it.'),
  },
  {
    id: 'section-frame', name: 'Section · frame', group: 'Introduce', blurb: 'A quieter break: the words centred in a fine frame.',
    make: (st) => sectionFrameSlide(st, 'Follow the\nevidence.', 'Let the information determine its form.'),
  },
  {
    id: 'introduction', name: 'Introduction', group: 'Introduce', blurb: 'Who is at the front: a portrait, the name, the role and a short paragraph.',
    make: (st) => introductionSlide(st, 'Your name', 'Role · your institution', 'Who is standing at the front, and why this room should listen.'),
  },
  {
    id: 'quote-slide', name: 'Quote · large', group: 'Introduce', blurb: 'Someone else’s words, set large, with who said them.',
    make: (st) => quoteSlide(st, 'The purpose of visualization is insight, not pictures.', 'Ben Shneiderman'),
  },
  {
    id: 'columns', name: 'Columns', group: 'Explain & organise', blurb: 'Two to four parallel points, numbered, side by side.',
    make: (st) => columnsSlide(st, 'What does the evidence need to show?', ['A pattern that a summary can hide.', 'A comparison made on the same terms.', 'A limitation that changes the conclusion.']),
  },
  {
    id: 'rail', name: 'Side heading', group: 'Explain & organise', blurb: 'The claim held on the left, the points it rests on beside it.',
    make: (st) => railSlide(st, 'Leave a useful next step.', ['State what the evidence supports.', 'Make the remaining uncertainty visible.', 'Name the question to investigate next.']),
  },
  {
    id: 'timeline', name: 'Timeline', group: 'Infographic', blurb: 'Dated events on a rail — date, event and a line of detail, up to eight.',
    make: (st) => timelineSlide(st, 'Where the ideas came from', '', [['1786', 'Playfair', 'The bar chart and the line chart'], ['1858', 'Nightingale', 'The rose diagram'], ['1967', 'Bertin', 'The visual variables named'], ['1983', 'Tufte', 'Data-ink and chartjunk']]),
  },
  {
    id: 'funnel', name: 'Funnel', group: 'Infographic', blurb: 'Stages that narrow; with numbers, the bands follow them.',
    make: (st) => funnelSlide(st, 'Stages that narrow', '', [['Visitors', '1,200', 'everyone who arrived'], ['Readers', '300', 'stayed past the title'], ['Sharers', '40', 'passed it on']]),
  },
  {
    id: 'mindmap', name: 'Mind map', group: 'Infographic', blurb: 'Points with no order, arranged round the idea they belong to.',
    make: (st) => mindmapSlide(st, 'The idea', [['One', 'A point that belongs here.'], ['Two', 'Another, with no order.'], ['Three', 'Siblings, not steps.'], ['Four', 'Round the centre.']]),
  },
  {
    id: 'orgchart', name: 'People & structure', group: 'Infographic', blurb: 'Who reports to whom: a card per person, a row per level.',
    make: (st) => orgchartSlide(st, 'Who is who', [['Course leader', 'Leads the module', ''], ['Tutor', 'Seminars', 'Course leader'], ['Tutor', 'Labs', 'Course leader']].map((p, i) => [i ? `${p[0]} ${i}` : p[0], p[1], p[2]] as [string, string, string])),
  },
  {
    id: 'blank', name: 'Blank', group: 'Introduce', blurb: 'Nothing on it. Add items and put them where you want them.',
    make: (st) => slide(st, 'Blank', []),
  },
];

export const LAYOUT_GROUPS = ['Introduce', 'Explain & organise', 'Show & explore', 'Infographic'] as const;
