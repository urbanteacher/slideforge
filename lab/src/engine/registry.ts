import type { BlendMode, Params, ParamValue } from '../model/types';

export type Category = 'source' | 'generate' | 'distort' | 'colour' | 'light' | 'stylise';

interface BaseParam { key: string; label: string; info?: string; group?: string; when?: (p: Params) => boolean; /** vec2 measured across the layer's own box, not the slide */ inBox?: boolean }
export type ParamDef =
  | (BaseParam & { type: 'number'; min: number; max: number; step: number; default: number; unit?: string; decimals?: number })
  | (BaseParam & { type: 'color'; default: string; weightKey?: string })
  | (BaseParam & { type: 'select'; options: { value: string; label: string }[]; default: string })
  | (BaseParam & { type: 'bool'; default: boolean })
  | (BaseParam & { type: 'vec2'; default: [number, number] })
  | (BaseParam & { type: 'text'; default: string })
  | (BaseParam & { type: 'font'; default: string })
  | (BaseParam & { type: 'image'; default: string })
  | (BaseParam & { type: 'video'; default: string });

export interface KindDef {
  id: string;
  name: string;
  category: Category;
  featured?: boolean;
  description: string;
  content?: 'text' | 'image' | 'shape' | 'video' | 'chart' | 'quiz' | 'activity' | 'note' | 'quote' | 'table' | 'timer' | 'wipe' | 'model' | 'experiment' | 'scene';
  params: ParamDef[];
  glsl?: string;
  needsMips?: boolean;
  mouseParam?: string; // vec2 param that can follow the pointer
  defaultBlend?: BlendMode;
  defaultFollowMouse?: boolean;
}

export const FONTS = [
  'Inter', 'Instrument Serif', 'Playfair Display', 'DM Serif Display', 'Fraunces',
  'Space Grotesk', 'Syne', 'Unbounded', 'Bebas Neue', 'JetBrains Mono', 'Georgia', 'Uncut Sans',
  // Installed on every Mac and iPhone: SlideForge's Cinematic theme sets its type in it.
  'Avenir Next',
  // UK Black Tech's hero face (served from public/fonts, SIL OFL).
  'Alpha Lyrae',
  // Installed on every Mac: Northeastern University London's display serif.
  'Iowan Old Style',
];

export const CATEGORIES: { id: Category | 'featured'; label: string }[] = [
  { id: 'source', label: 'Sources' },
  { id: 'featured', label: 'Featured' },
  { id: 'generate', label: 'Generate' },
  { id: 'distort', label: 'Distort' },
  { id: 'colour', label: 'Colour' },
  { id: 'light', label: 'Light' },
  { id: 'stylise', label: 'Stylise' },
];

const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));

/** Grow the box to the content, or keep the box and bring the type down until it fits — the way a
 *  SlideForge layout region holds its copy on the slide. */
const FIT: ParamDef = {
  key: 'fit', label: 'Fit', type: 'select', group: 'Fit', default: 'grow',
  options: [{ value: 'grow', label: 'Grow the box' }, { value: 'shrink', label: 'Shrink to fit the box' }, { value: 'fill', label: 'Fill the box' }],
  info: 'Grow: the box follows the words. Shrink: the box stays put and the words get smaller when there are more of them. Fill: the words are sized to fill the box — bigger when there are few, smaller when there are many, never under 18pt.',
};
const style = (size: number, font = 'Inter', min = 12, max = 200): ParamDef[] => [
  { key: 'font', label: 'Font', type: 'font', default: font, group: 'Style' },
  { key: 'size', label: 'Text size', type: 'number', min, max, step: 1, default: size, group: 'Style', unit: 'px', decimals: 0 },
  { key: 'textColor', label: 'Text', type: 'color', default: '#141414', group: 'Style' },
  { key: 'accent', label: 'Accent', type: 'color', default: '#d94f2b', group: 'Style' },
];

const KINDS: KindDef[] = [
  // ─── Sources ──────────────────────────────────────────────────────────────
  {
    id: 'text', name: 'Text', category: 'source', content: 'text',
    description: 'Live, editable type. Double-click on the canvas to edit. Animate by letter, word or line.',
    params: [
      { key: 'text', label: 'Text', type: 'text', default: 'Say something bold', group: 'Text' },
      { key: 'font', label: 'Font', type: 'font', default: 'Instrument Serif', group: 'Text' },
      { key: 'size', label: 'Size', type: 'number', min: 8, max: 480, step: 1, default: 120, group: 'Text', unit: 'px', decimals: 0 },
      { key: 'weight', label: 'Weight', type: 'select', options: ['300', '400', '500', '600', '700', '800', '900'].map((v) => ({ value: v, label: v })), default: '400', group: 'Text' },
      { key: 'italic', label: 'Italic', type: 'bool', default: false, group: 'Text' },
      { key: 'color', label: 'Colour', type: 'color', default: '#111111', group: 'Text' },
      { key: 'underline', label: 'Underline', type: 'bool', default: false, group: 'Text' },
      { key: 'align', label: 'Align', type: 'select', options: opt('left', 'center', 'right'), default: 'left', group: 'Text' },
      { key: 'valign', label: 'Up and down', type: 'select', options: opt('top', 'middle', 'bottom'), default: 'top', group: 'Text', info: 'Where the words sit in the box when it is taller than they are.' },
      { key: 'list', label: 'List', type: 'select', options: [{ value: 'none', label: 'None' }, { value: 'bullets', label: 'Bullets' }, { value: 'numbers', label: 'Numbers' }], default: 'none', group: 'Text', info: 'Each line becomes a list item.' },
      { key: 'lineHeight', label: 'Line height', type: 'number', min: 0.6, max: 2.4, step: 0.01, default: 1.0, group: 'Spacing', decimals: 2 },
      { key: 'tracking', label: 'Tracking', type: 'number', min: -0.15, max: 0.6, step: 0.005, default: -0.01, group: 'Spacing', decimals: 3, info: 'Letter spacing, in em.' },
      { key: 'uppercase', label: 'Uppercase', type: 'bool', default: false, group: 'Spacing' },
      { key: 'balance', label: 'Balance lines', type: 'bool', default: false, group: 'Spacing', info: 'Evens the lines out instead of filling each to the margin, so a heading breaks where the sense is.' },
      FIT,
    ],
  },
  {
    id: 'image', name: 'Image', category: 'source', content: 'image',
    description: 'A photo or illustration. Drop a file on the canvas, paste one, or pick it here.',
    params: [
      { key: 'src', label: 'Image', type: 'image', default: '', group: 'Image' },
      { key: 'fit', label: 'Fit', type: 'select', options: opt('cover', 'contain'), default: 'contain', group: 'Image' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Image', unit: 'px', decimals: 0 },
      { key: 'border', label: 'Border', type: 'number', min: 0, max: 40, step: 1, default: 0, group: 'Image', unit: 'px', decimals: 0, info: 'A line round the picture, inside its edge, following its corners. Round the picture itself when it is contained.' },
      { key: 'borderColor', label: 'Border colour', type: 'color', default: '#ffffff', group: 'Image', when: (p) => Number(p.border) > 0 },
      // SlideForge's picture settings, from "Logo sits on" down.
      { key: 'frame', label: 'Image frame', type: 'select', group: 'Picture', default: 'free', info: 'Reshapes the box to a fixed ratio, or fills the slide. Drag its handles afterwards to change it again.',
        options: [{ value: 'free', label: 'As drawn' }, { value: 'bleed', label: 'Full bleed — the whole slide' }, { value: '16:9', label: '16:9 landscape' }, { value: '4:3', label: '4:3 landscape' }, { value: '1:1', label: '1:1 square' }, { value: '4:5', label: '4:5 portrait' }] },
      { key: 'flip', label: 'Flip image', type: 'select', group: 'Picture', default: 'none', options: [{ value: 'none', label: 'As it was taken' }, { value: 'mirror', label: 'Mirrored' }] },
      { key: 'tone', label: 'Logo sits on', type: 'select', group: 'Picture', default: 'auto', info: 'For a logo. On a dark background it is shown white so it stays visible.',
        options: [{ value: 'auto', label: 'Let the theme decide' }, { value: 'dark', label: 'A dark background — show the logo white' }, { value: 'light', label: 'A light background — keep the logo as it is' }] },
      { key: 'focus', label: 'Image focus', type: 'vec2', default: [0.5, 0.5], group: 'Picture', inBox: true, info: 'The part of the picture that matters: it stays in view when the frame crops, and a slow zoom closes in on it. Drag the handle on the picture.', when: (p) => p.fit === 'cover' || (p.motion ?? 'none') !== 'none' },
      // Image effects — shown in the Animate tab, not here.
      { key: 'motion', label: 'Image motion', type: 'select', group: '_motion', default: 'none', options: [{ value: 'none', label: 'Stays still' }, { value: 'zoom', label: 'Slow zoom in' }, { value: 'travel', label: 'Travel — from one point to another' }, { value: 'detail', label: 'Zoom to a detail — SlideForge’s Explore hotspot' }] },
      { key: 'focus2', label: 'Travels to', type: 'vec2', default: [0.7, 0.4], group: '_motion', inBox: true, when: (p) => p.motion === 'travel' },
      // Explore: the picture moves from where the last detail left it (or the whole picture) to this one.
      { key: 'zoom', label: 'Zoom on the detail', type: 'number', min: 1, max: 4, step: 0.1, default: 2, group: '_motion', decimals: 1, when: (p) => p.motion === 'detail', info: 'The detail is the image focus. SlideForge allows 1× to 4×.' },
      { key: 'fromFocus', label: 'Comes from', type: 'vec2', default: [0.5, 0.5], group: '_motion', inBox: true, when: (p) => p.motion === 'detail' },
      { key: 'fromZoom', label: 'Zoom it comes from', type: 'number', min: 1, max: 4, step: 0.1, default: 1, group: '_motion', decimals: 1, when: (p) => p.motion === 'detail', info: '1 is the whole picture.' },
      { key: 'motionSecs', label: 'How long the move takes', type: 'select', group: '_motion', when: (p) => p.motion !== 'detail', default: '20', options: [{ value: '12', label: '12 seconds' }, { value: '20', label: '20 seconds' }, { value: '30', label: '30 seconds' }] },
    ],
  },
  {
    id: 'shape', name: 'Shape', category: 'source', content: 'shape',
    description: 'Vector shapes for cards, badges and accents. Fills can be solid or gradient.',
    params: [
      { key: 'shape', label: 'Shape', type: 'select', options: opt('rect', 'ellipse', 'triangle', 'star', 'ring', 'arrow', 'line', 'curve'), default: 'rect', group: 'Shape' },
      { key: 'label', label: 'Label', type: 'text', default: '', group: 'Label', info: 'A few characters in the middle of the shape — a number, initials, a symbol — centred on the letters themselves.', when: (p) => p.shape !== 'line' && p.shape !== 'curve' },
      { key: 'labelColor', label: 'Label colour', type: 'color', default: '#ffffff', group: 'Label', when: (p) => !!String(p.label ?? '').trim() },
      { key: 'labelSize', label: 'Label size', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Label', unit: 'px', decimals: 0, info: '0 sizes it to half the shape.', when: (p) => !!String(p.label ?? '').trim() },
      { key: 'labelFont', label: 'Label font', type: 'font', default: 'Inter', group: 'Label', when: (p) => !!String(p.label ?? '').trim() },
      { key: 'labelWeight', label: 'Label weight', type: 'select', options: opt('400', '600', '700', '800'), default: '700', group: 'Label', when: (p) => !!String(p.label ?? '').trim() },
      { key: 'rise', label: 'Curve goes', type: 'select', group: 'Shape', default: 'down', when: (p) => p.shape === 'curve', info: 'An S-curve from one side of the box to the other, level at both ends — a connector in a mind map.',
        options: [{ value: 'down', label: 'Top left to bottom right' }, { value: 'up', label: 'Bottom left to top right' }] },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 24, group: 'Shape', unit: 'px', decimals: 0, when: (p) => p.shape === 'rect' },
      { key: 'points', label: 'Points', type: 'number', min: 3, max: 16, step: 1, default: 5, group: 'Shape', decimals: 0, when: (p) => p.shape === 'star' },
      { key: 'ringWidth', label: 'Ring thickness', type: 'number', min: 0.02, max: 1, step: 0.01, default: 0.32, group: 'Shape', decimals: 2, when: (p) => p.shape === 'ring', info: 'How much of the radius the band takes: 1 is a solid disc.' },
      { key: 'fill', label: 'Fill', type: 'color', default: '#ff5a36', group: 'Fill' },
      { key: 'fillOpacity', label: 'Fill opacity', type: 'number', min: 0, max: 1, step: 0.01, default: 1, group: 'Fill', decimals: 2, info: '0 leaves only the stroke: an outline, or a frame.' },
      { key: 'gradient', label: 'Gradient', type: 'bool', default: false, group: 'Fill' },
      { key: 'fill2', label: 'Fill 2', type: 'color', default: '#ffb199', group: 'Fill', when: (p) => !!p.gradient },
      { key: 'fill2Opacity', label: 'Fill 2 opacity', type: 'number', min: 0, max: 1, step: 0.01, default: 1, group: 'Fill', decimals: 2, when: (p) => !!p.gradient, info: 'Fade the gradient out to nothing for a scrim under a caption.' },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 135, group: 'Fill', unit: '°', decimals: 0, when: (p) => !!p.gradient },
      { key: 'stroke', label: 'Stroke', type: 'color', default: '#111111', group: 'Stroke' },
      { key: 'strokeWidth', label: 'Width', type: 'number', min: 0, max: 60, step: 0.5, default: 0, group: 'Stroke', unit: 'px', decimals: 1 },
      { key: 'strokeOpacity', label: 'Stroke opacity', type: 'number', min: 0, max: 1, step: 0.01, default: 1, group: 'Stroke', decimals: 2, when: (p) => Number(p.strokeWidth) > 0 },
    ],
  },

  {
    id: 'video', name: 'Video', category: 'source', content: 'video',
    description: 'A video clip. Upload a file or paste a link to an .mp4 or .webm and it plays muted on a loop; paste a YouTube or Vimeo link and the canvas shows its still while Preview frames the real player.',
    params: [
      { key: 'src', label: 'Video', type: 'video', default: '', group: 'Video', info: 'A file, or a YouTube or Vimeo link. YouTube is framed from youtube-nocookie.com, which sets no cookie until the clip is played.' },
      { key: 'frame', label: 'Frame', type: 'select', group: 'Video', default: 'free', info: 'Full screen fills the slide; a ratio reshapes the box about its centre.',
        options: [{ value: 'free', label: 'As drawn' }, { value: 'bleed', label: 'Full screen — the whole slide' }, { value: '16:9', label: '16:9 landscape' }, { value: '4:3', label: '4:3 landscape' }, { value: '1:1', label: '1:1 square' }] },
      { key: 'poster', label: 'Still', type: 'image', default: '', group: 'Video', info: 'The frame shown before it plays. Empty takes YouTube’s own thumbnail for a YouTube link.' },
      { key: 'start', label: 'Start at', type: 'number', min: 0, max: 36000, step: 1, default: 0, group: 'Video', unit: ' s', decimals: 0, info: 'A link shared "at current time" already carries its start.' },
      { key: 'end', label: 'Stop at', type: 'number', min: 0, max: 36000, step: 1, default: 0, group: 'Video', unit: ' s', decimals: 0, info: '0 plays to the end. YouTube only.' },
      { key: 'muted', label: 'Start muted', type: 'bool', default: true, group: 'Video' },
      { key: 'autoplay', label: 'Play when the slide appears', type: 'bool', default: false, group: 'Video', info: 'Honoured only when muted.' },
      { key: 'loop', label: 'Loop', type: 'bool', default: false, group: 'Video' },
      { key: 'fit', label: 'Fit', type: 'select', options: opt('cover', 'contain'), default: 'cover', group: 'Video' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Video', unit: 'px', decimals: 0 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0.25, max: 2, step: 0.05, default: 1, group: 'Video', unit: '×', decimals: 2 },
    ],
  },
  {
    id: 'chart', name: 'Chart', category: 'source', content: 'chart',
    description: 'A chart: column, bar, line, pie and donut from one series, or any of SlideForge’s idioms — grouped, stacked, area, scatter, histogram, box, pictogram, radar, Sankey, dumbbell, small multiples, bullet, combo, treemap, waffle, evidence matrix — from a table.',
    params: [
      { key: 'chart', label: 'Type', type: 'select', default: 'column', group: 'Chart', options: [
        { value: 'column', label: 'Column' }, { value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'pie', label: 'Pie' }, { value: 'donut', label: 'Donut' },
        { value: 'grouped', label: 'Grouped columns — several series' }, { value: 'lines', label: 'Lines — several series' }, { value: 'stack', label: 'Stacked — part to whole' },
        { value: 'area', label: 'Area — a total and its parts' }, { value: 'scatter', label: 'Scatter — correlation' }, { value: 'histogram', label: 'Histogram — the shape of one column' },
        { value: 'box', label: 'Box plot — distribution' }, { value: 'pictogram', label: 'Pictogram — one icon is one unit' }, { value: 'radar', label: 'Radar' },
        { value: 'sankey', label: 'Sankey — flow' }, { value: 'dumbbell', label: 'Dumbbell — how far apart' }, { value: 'multiples', label: 'Small multiples' },
        { value: 'bullet', label: 'Bullet — against a target' }, { value: 'combo', label: 'Combo — columns and markers' }, { value: 'treemap', label: 'Treemap' },
        { value: 'waffle', label: 'Waffle — a hundred squares' }, { value: 'matrix', label: 'Evidence matrix' },
      ] },
      { key: 'data', label: 'Data', type: 'text', default: '2021, 12\n2022, 19\n2023, 27\n2024, 34\n2025, 48', group: 'Chart',
        info: 'Column, bar, line, pie, donut: one "label, value" per line. The others read a table, as SlideForge does: first row names the series, first column the categories, tab or | between cells. A Sankey is "from | to | amount" per line; a box plot is a name then its observations.' },
      { key: 'palette', label: 'Series colours', type: 'text', default: '', group: 'Style', info: 'Up to six colours, comma separated, in the order the series take them. Empty uses SlideForge’s six chart steps.', when: (p) => !['column', 'bar', 'line', 'pie', 'donut'].includes(String(p.chart)) },
      { key: 'icon', label: 'Icon', type: 'text', default: '●', group: 'Chart', when: (p) => p.chart === 'pictogram' },
      { key: 'unit', label: 'One icon is', type: 'number', min: 0, max: 1000000, step: 1, default: 0, group: 'Chart', decimals: 0, info: '0 picks a unit that keeps the longest row near twenty icons.', when: (p) => p.chart === 'pictogram' },
      { key: 'surface', label: 'Ground behind', type: 'color', default: '#ffffff', group: 'Style', info: 'The colour a label’s halo and a marker’s ring are cut from.', when: (p) => ['sankey', 'combo'].includes(String(p.chart)) },
      { key: 'color', label: 'Colour', type: 'color', default: '#ff5a36', group: 'Style' },
      { key: 'color2', label: 'Colour 2', type: 'color', default: '#ffc15e', group: 'Style', info: 'The series shades from Colour to Colour 2.' },
      { key: 'textColor', label: 'Labels', type: 'color', default: '#1a1a1a', group: 'Style' },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Label size', type: 'number', min: 10, max: 80, step: 1, default: 28, group: 'Style', unit: 'px', decimals: 0 },
      { key: 'values', label: 'Show values', type: 'bool', default: true, group: 'Style' },
      { key: 'grid', label: 'Gridlines', type: 'bool', default: true, group: 'Style', when: (p) => p.chart !== 'pie' && p.chart !== 'donut' },
    ],
  },
  {
    id: 'quiz', name: 'Quiz', category: 'source', content: 'quiz',
    description: 'A placeholder card for a quiz question: the question and its answer options, ready for a live quiz.',
    params: [
      { key: 'question', label: 'Question', type: 'text', default: 'Which chart best shows change over time?', group: 'Quiz' },
      { key: 'options', label: 'Options', type: 'text', default: 'Pie chart\nLine chart\nDonut chart\nScatter plot', group: 'Quiz', info: 'One option per line (up to six).' },
      { key: 'label', label: 'Label', type: 'text', default: 'Quiz', group: 'Quiz' },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Text size', type: 'number', min: 16, max: 120, step: 1, default: 52, group: 'Style', unit: 'px', decimals: 0 },
      { key: 'fill', label: 'Card', type: 'color', default: '#ffffff', group: 'Style' },
      { key: 'textColor', label: 'Text', type: 'color', default: '#141414', group: 'Style' },
      { key: 'accent', label: 'Accent', type: 'color', default: '#ff5a36', group: 'Style' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 120, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
    ],
  },
  {
    id: 'activity', name: 'Activity', category: 'source', content: 'activity',
    description: 'A placeholder card for a class activity: its title and timed steps. Minutes in the steps add up to the total.',
    params: [
      { key: 'title', label: 'Title', type: 'text', default: 'Think, pair, share', group: 'Activity' },
      { key: 'steps', label: 'Steps', type: 'text', default: 'Think on your own · 1 min\nCompare with a partner · 3 min\nShare with the room · 2 min', group: 'Activity', info: 'One step per line. Write "· 3 min" to time a step.' },
      { key: 'label', label: 'Label', type: 'text', default: 'Activity', group: 'Activity' },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Text size', type: 'number', min: 16, max: 120, step: 1, default: 44, group: 'Style', unit: 'px', decimals: 0 },
      { key: 'fill', label: 'Card', type: 'color', default: '#ffffff', group: 'Style' },
      { key: 'textColor', label: 'Text', type: 'color', default: '#141414', group: 'Style' },
      { key: 'accent', label: 'Accent', type: 'color', default: '#2f6bff', group: 'Style' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 120, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
    ],
  },

  // ─── SlideForge items ─────────────────────────────────────────────────────
  {
    id: 'note', name: 'Note', category: 'source', content: 'note',
    description: 'A takeaway, a source line or a caution: a short label and a sentence, with an accent rule down its side.',
    params: [
      { key: 'label', label: 'Label', type: 'text', default: 'Takeaway', group: 'Note', info: 'Leave empty for no label.' },
      { key: 'text', label: 'Text', type: 'text', default: 'The one thing to remember from this slide.', group: 'Note' },
      ...style(36),
      { key: 'panel', label: 'Panel behind', type: 'bool', default: true, group: 'Style' },
      { key: 'fill', label: 'Panel', type: 'color', default: '#f3efe8', group: 'Style', when: (p) => p.panel !== false },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 60, step: 1, default: 14, group: 'Style', unit: 'px', decimals: 0, when: (p) => p.panel !== false },
      FIT,
    ],
  },
  {
    // SlideForge's table slide: rows of cells, a header row, the row labels down the left. Hairline
    // rules between rows and no box, so it reads as a comparison rather than a spreadsheet.
    id: 'table', name: 'Table', category: 'source', content: 'table',
    description: 'Rows and columns for when the exact value matters: a header row, labels down the left, a hairline under each row.',
    params: [
      { key: 'data', label: 'Rows', type: 'text', default: '\tOne\tTwo\tThree\nFirst row\tYes\tNo\tSome\nSecond row\t12\t18\t25', group: 'Table', info: 'One row per line; separate the cells with a tab (or " | ").' },
      { key: 'header', label: 'Header row', type: 'bool', default: true, group: 'Table' },
      { key: 'labels', label: 'Labels down the left', type: 'bool', default: true, group: 'Table' },
      ...style(28),
      FIT,
    ],
  },
  {
    // SlideForge's authored countdown: it starts when its slide comes up (the slide clock, which a
    // redraw does not restart), clears when the slide is left, and caps at two hours so a lesson
    // activity can outlast a quick task. In the editor it shows the full time.
    id: 'timer', name: 'Timer', category: 'source', content: 'timer',
    description: 'A countdown that starts when its slide comes up and resets when you leave it.',
    params: [
      { key: 'minutes', label: 'Minutes', type: 'number', min: 0.1, max: 120, step: 0.25, default: 5, group: 'Timer', decimals: 2, unit: ' min', info: 'From a few seconds to two hours. It starts when the slide appears while presenting.' },
      { key: 'style', label: 'Style', type: 'select', default: 'ring', group: 'Timer', options: [{ value: 'game', label: 'Game clock — SlideForge’s countdown ring' }, { value: 'ring', label: 'Ring and time' }, { value: 'digits', label: 'Time only' }, { value: 'bar', label: 'Bar and time' }] },
      { key: 'label', label: 'Label', type: 'text', default: 'Time left', group: 'Timer', info: 'Leave empty for none.' },
      { key: 'done', label: 'When it ends', type: 'text', default: 'Time’s up', group: 'Timer' },
      ...style(96),
      { key: 'track', label: 'Track', type: 'color', default: '#d9d4cc', group: 'Style' },
    ],
  },
  {
    // SlideForge's Before / after: two registered pictures, one wiped over the other by a handle.
    // In Preview the handle is dragged, or a click sends it there; here it rests where Position says.
    id: 'wipe', name: 'Before / after', category: 'source', content: 'wipe',
    description: 'Two pictures of the same framing, and a handle that wipes between them. Drag it in Preview.',
    params: [
      { key: 'before', label: 'Before', type: 'image', default: '', group: 'Pictures' },
      { key: 'after', label: 'After', type: 'image', default: '', group: 'Pictures' },
      { key: 'beforeLabel', label: 'Before label', type: 'text', default: 'Before', group: 'Pictures' },
      { key: 'afterLabel', label: 'After label', type: 'text', default: 'After', group: 'Pictures' },
      { key: 'position', label: 'Handle rests at', type: 'number', min: 0, max: 100, step: 1, default: 50, group: 'Pictures', unit: '%', decimals: 0, info: 'How much of the after picture shows: 0 is all before, 100 all after.' },
      { key: 'fit', label: 'Fit', type: 'select', options: opt('contain', 'cover'), default: 'contain', group: 'Pictures' },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Label size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
      { key: 'accent', label: 'Handle', type: 'color', default: '#ff5a36', group: 'Style' },
      { key: 'textColor', label: 'Label text', type: 'color', default: '#ffffff', group: 'Style' },
    ],
  },
  {
    // SlideForge's Simulation: a model drawn as its curve, and an input the room changes. In Preview
    // the input is dragged across the graph and the output redraws; here it rests at its start.
    id: 'model', name: 'Simulation', category: 'source', content: 'model',
    description: 'A model drawn as a curve, with an input you drag in Preview while the output redraws.',
    params: [
      { key: 'model', label: 'Model', type: 'select', default: 'linear', group: 'Model', options: [{ value: 'linear', label: 'Straight line — a × input + b' }, { value: 'quadratic', label: 'Curve — a × input² + b' }] },
      { key: 'a', label: 'a', type: 'number', min: -100, max: 100, step: 0.1, default: 2, group: 'Model', decimals: 1 },
      { key: 'b', label: 'b', type: 'number', min: -1000, max: 1000, step: 1, default: 0, group: 'Model', decimals: 0 },
      { key: 'min', label: 'Input from', type: 'number', min: -1000, max: 999, step: 1, default: 0, group: 'Model', decimals: 0 },
      { key: 'max', label: 'Input to', type: 'number', min: -999, max: 1000, step: 1, default: 10, group: 'Model', decimals: 0 },
      { key: 'initial', label: 'Starts at', type: 'number', min: -1000, max: 1000, step: 0.5, default: 0, group: 'Model', decimals: 1 },
      { key: 'inputLabel', label: 'Input is', type: 'text', default: 'Input', group: 'Model' },
      { key: 'outputLabel', label: 'Output is', type: 'text', default: 'Output', group: 'Model' },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Label size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
      { key: 'accent', label: 'Curve', type: 'color', default: '#ff5a36', group: 'Style' },
      { key: 'textColor', label: 'Text', type: 'color', default: '#1a1a1a', group: 'Style' },
    ],
  },
  {
    // SlideForge's visual experiment: one table in several authored states, each Next moving to the
    // next, the marks travelling between encodings. Before the first state the room predicts.
    id: 'experiment', name: 'Chart experiment', category: 'source', content: 'experiment',
    description: 'One dataset shown in several encodings in turn — pies to bars, a moving baseline, clutter removed — each Next transforming the chart into the next.',
    params: [
      { key: 'preset', label: 'Demonstration', type: 'select', default: 'polling', group: 'Experiment', options: [
        { value: 'polling', label: 'Polling: pies to bars' }, { value: 'channels', label: 'Marks and channels' }, { value: 'integrity', label: 'Integrity: change the baseline' },
        { value: 'distortion', label: 'Distortion: shape and range' }, { value: 'clutter', label: 'Clutter: clean up a chart' }, { value: 'colour', label: 'Colour schemes' },
        { value: 'accessibility', label: 'Colour plus a second cue' }, { value: 'structures', label: 'Dataset structures' }, { value: 'types', label: 'Attribute classification' },
        { value: 'zoom', label: 'Chart overview and detail' }] },
      { key: 'data', label: 'Data', type: 'text', default: 'Candidate\tPoll A\tPoll B\tPoll C\n1\t17\t20\t23\n2\t18\t20\t22\n3\t20\t19\t20\n4\t22\t21\t18\n5\t23\t20\t17', group: 'Experiment', info: 'Headings in the first row, categories in the first column, tab between cells.' },
      { key: 'states', label: 'States', type: 'text', default: '', group: 'Experiment', info: 'Empty uses the demonstration’s own states. Otherwise a list of states, each with a label, a kind (bar, pie, line, dot, bubbles, hue, shape, tiles, table, network, field, geometry, classification) and an explanation.' },
      { key: 'duration', label: 'Transformation pace', type: 'select', default: '1600', group: 'Experiment', options: [{ value: '800', label: 'Quick — 0.8 seconds' }, { value: '1600', label: 'Teaching — 1.6 seconds' }, { value: '3000', label: 'Slow observation — 3 seconds' }] },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Text size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
      { key: 'textColor', label: 'Text', type: 'color', default: '#1a1a1a', group: 'Style' },
      { key: 'source', label: 'Source', type: 'text', default: 'Illustrative teaching data', group: 'Experiment', info: 'Where the numbers come from, set small at the foot of the steps.' },
      { key: 'accent', label: 'Lit button', type: 'color', default: '#0072b2', group: 'Style', info: 'The state showing now is lit in this colour.' },
    ],
  },
  {
    // SlideForge's motion specimens: ten behaviours on one stage, in five looks. Next steps it; in
    // Preview the room can also drag it or press a card.
    id: 'scene', name: 'Motion experiment', category: 'source', content: 'scene',
    description: 'An interactive stage: a mask reveal, a diagram drawn on, cards that open, callouts, a scrubbable transformation, cause and effect, a branching choice, an exploded diagram, a lens or story panels.',
    params: [
      { key: 'mode', label: 'Behaviour', type: 'select', default: 'cards', group: 'Experiment', options: [
        { value: 'mask', label: 'Mask reveal' }, { value: 'draw', label: 'Draw-on diagram' }, { value: 'cards', label: 'Card to detail' }, { value: 'annotate', label: 'Animated annotations' },
        { value: 'scrub', label: 'Scrubbable transformation' }, { value: 'cause', label: 'Cause and effect' }, { value: 'branch', label: 'Branching scenario' },
        { value: 'explode', label: 'Exploded diagram' }, { value: 'lens', label: 'Focus lens' }, { value: 'panels', label: 'Responsive story panels' }] },
      { key: 'look', label: 'Look', type: 'select', default: 'editorial', group: 'Experiment', options: [
        { value: 'editorial', label: 'Editorial' }, { value: 'paper', label: 'Layered paper' }, { value: 'technical', label: 'Technical drawing' }, { value: 'cinema', label: 'Cinematic depth' }, { value: 'comic', label: 'Comic sequence' }] },
      { key: 'items', label: 'Points', type: 'text', default: 'Observe\tNotice what the audience can see.\nInterpret\tExplain what the evidence supports.\nAct\tChoose a next step and name its owner.', group: 'Experiment', info: 'Up to four, one per line: a label, a tab, then its explanation. Scrub reads the explanation as a number.' },
      { key: 'image', label: 'Picture', type: 'image', default: '', group: 'Experiment', info: 'For the mask, annotations and lens.' },
      { key: 'factor', label: 'Multiplier a', type: 'number', min: -10, max: 10, step: 0.5, default: 2, group: 'Experiment', decimals: 1, when: (p) => p.mode === 'cause' },
      { key: 'subtitle', label: 'Hint', type: 'text', default: '', group: 'Experiment' },
      { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
      { key: 'size', label: 'Text size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
    ],
  },
  {
    id: 'quote', name: 'Quote', category: 'source', content: 'quote',
    description: 'Someone else\u2019s words, set large, with who said it underneath.',
    params: [
      { key: 'text', label: 'Quote', type: 'text', default: 'The purpose of visualisation is insight, not pictures.', group: 'Quote' },
      { key: 'attribution', label: 'Who said it', type: 'text', default: 'Ben Shneiderman', group: 'Quote' },
      { key: 'mark', label: 'Quotation mark', type: 'bool', default: true, group: 'Quote' },
      { key: 'align', label: 'Align', type: 'select', options: opt('left', 'center'), default: 'left', group: 'Quote' },
      ...style(72, 'Instrument Serif', 16, 240),
      { key: 'italic', label: 'Italic', type: 'bool', default: true, group: 'Style' },
      FIT,
    ],
  },
  // ─── Generate ─────────────────────────────────────────────────────────────
  {
    id: 'solid', name: 'Solid colour', category: 'generate',
    description: 'A flat field of colour. Replaces what is below unless you change its blend mode.',
    params: [{ key: 'color', label: 'Colour', type: 'color', default: '#f6efe9', group: 'Colour' }],
    glsl: `uniform vec3 u_color; vec4 effect(vec2 uv) { return vec4(u_color, 1.0); }`,
  },
  {
    id: 'linear', name: 'Linear gradient', category: 'generate',
    description: 'A smooth two-colour ramp at any angle.',
    params: [
      { key: 'colorA', label: 'From', type: 'color', default: '#1b1030', group: 'Colours' },
      { key: 'colorB', label: 'To', type: 'color', default: '#ff5a36', group: 'Colours' },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 90, group: 'Shape', unit: '°', decimals: 0 },
      { key: 'bias', label: 'Midpoint', type: 'number', min: 0.05, max: 0.95, step: 0.01, default: 0.5, group: 'Shape', decimals: 2 },
    ],
    glsl: `uniform vec3 u_colorA; uniform vec3 u_colorB; uniform float u_angle; uniform float u_bias;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  vec2 dir = vec2(cos(a), sin(a));
  vec2 p = (uv - 0.5) * aspect();
  float ext = abs(dir.x) * aspect().x * 0.5 + abs(dir.y) * 0.5;
  float t = clamp(dot(p, dir) / ext * 0.5 + 0.5, 0.0, 1.0);
  t = pow(t, log(0.5) / log(u_bias));
  return vec4(mix(u_colorA, u_colorB, smoothstep(0.0, 1.0, t)) + dither(), 1.0);
}`,
  },
  {
    // A glow from one point: SlideForge's grounds are radial-gradient(W H at x y, from, to stop).
    id: 'radial', name: 'Radial gradient', category: 'generate',
    description: 'A soft glow from any point, fading to a second colour — a lit corner, a spotlit centre.',
    params: [
      { key: 'colorA', label: 'Centre', type: 'color', default: '#1a1020', group: 'Colours' },
      { key: 'colorB', label: 'Outside', type: 'color', default: '#0a0b0f', group: 'Colours' },
      { key: 'cx', label: 'Centre across', type: 'number', min: -0.5, max: 1.5, step: 0.01, default: 0.8, group: 'Shape', decimals: 2, info: '0 is the left edge, 1 the right. Past either, only the edge of the glow shows.' },
      { key: 'cy', label: 'Centre down', type: 'number', min: -0.5, max: 1.5, step: 0.01, default: -0.1, group: 'Shape', decimals: 2 },
      { key: 'rx', label: 'Width', type: 'number', min: 0.05, max: 3, step: 0.01, default: 0.94, group: 'Shape', decimals: 2, info: 'Across the glow, from its centre, as a share of the slide’s width.' },
      { key: 'ry', label: 'Height', type: 'number', min: 0.05, max: 3, step: 0.01, default: 0.83, group: 'Shape', decimals: 2, info: 'Down the glow, from its centre, as a share of the slide’s height.' },
      { key: 'reach', label: 'Fades by', type: 'number', min: 0.05, max: 1, step: 0.01, default: 0.55, group: 'Shape', decimals: 2, info: 'How far out the centre colour has become the outside colour.' },
    ],
    glsl: `uniform vec3 u_colorA; uniform vec3 u_colorB; uniform float u_cx; uniform float u_cy; uniform float u_rx; uniform float u_ry; uniform float u_reach;
vec4 effect(vec2 uv) {
  float d = length((uv - vec2(u_cx, u_cy)) / max(vec2(u_rx, u_ry), vec2(0.001)));
  return vec4(mix(u_colorA, u_colorB, clamp(d / u_reach, 0.0, 1.0)) + dither(), 1.0);
}`,
  },
  {
    id: 'mesh', name: 'Mesh gradient', category: 'generate', featured: true,
    description: 'Soft, slowly flowing colour fields. Replaces what is below unless you change its blend mode.',
    params: [
      { key: 'color1', label: 'Colour 1', type: 'color', default: '#c988c7', weightKey: 'w1', group: 'Colours' },
      { key: 'color2', label: 'Colour 2', type: 'color', default: '#ec66e2', weightKey: 'w2', group: 'Colours' },
      { key: 'color3', label: 'Colour 3', type: 'color', default: '#f7d3c2', weightKey: 'w3', group: 'Colours' },
      { key: 'color4', label: 'Colour 4', type: 'color', default: '#fff1b8', weightKey: 'w4', group: 'Colours' },
      { key: 'w1', label: 'Weight 1', type: 'number', min: 0, max: 100, step: 1, default: 18, group: '_hidden' },
      { key: 'w2', label: 'Weight 2', type: 'number', min: 0, max: 100, step: 1, default: 24, group: '_hidden' },
      { key: 'w3', label: 'Weight 3', type: 'number', min: 0, max: 100, step: 1, default: 26, group: '_hidden' },
      { key: 'w4', label: 'Weight 4', type: 'number', min: 0, max: 100, step: 1, default: 30, group: '_hidden' },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5, step: 0.01, default: 1.2, group: 'Shape', decimals: 2, info: 'How quickly the colour fields drift.' },
      { key: 'softness', label: 'Softness', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6, group: 'Shape', decimals: 2, info: 'Sharper edges at 0, fully blended at 1.' },
      { key: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 2, step: 0.01, default: 0.7, group: 'Shape', decimals: 2, info: 'Amount of organic warping.' },
    ],
    glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform vec3 u_color3; uniform vec3 u_color4;
uniform float u_w1; uniform float u_w2; uniform float u_w3; uniform float u_w4;
uniform float u_speed; uniform float u_softness; uniform float u_scale;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 p = uv * as;
  float t = uTime * u_speed * 0.12 + uSeed * 13.0;
  vec2 q = p * 1.3;
  p += u_scale * 0.35 * vec2(snoise(q + vec2(t * 0.8, -t * 0.4)), snoise(q + vec2(4.7 - t * 0.5, 2.1 + t * 0.6)));
  vec2 c1 = vec2(0.20 + 0.18 * sin(t * 1.1), 0.25 + 0.20 * cos(t * 0.9)) * as;
  vec2 c2 = vec2(0.80 + 0.15 * cos(t * 0.8), 0.22 + 0.18 * sin(t * 1.3)) * as;
  vec2 c3 = vec2(0.25 + 0.20 * cos(t * 0.7), 0.80 + 0.15 * sin(t * 1.0)) * as;
  vec2 c4 = vec2(0.78 + 0.17 * sin(t * 0.6), 0.78 + 0.16 * cos(t * 1.2)) * as;
  float s = mix(0.02, 0.9, u_softness * u_softness);
  float w1 = (u_w1 + 0.5) * exp(-dot(p - c1, p - c1) / s);
  float w2 = (u_w2 + 0.5) * exp(-dot(p - c2, p - c2) / s);
  float w3 = (u_w3 + 0.5) * exp(-dot(p - c3, p - c3) / s);
  float w4 = (u_w4 + 0.5) * exp(-dot(p - c4, p - c4) / s);
  float sum = w1 + w2 + w3 + w4 + 1e-6;
  vec3 col = (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4) / sum;
  return vec4(col + dither(), 1.0);
}`,
  },
  {
    id: 'aurora', name: 'Aurora', category: 'generate', featured: true,
    description: 'Domain-warped noise that folds three colours into slow, liquid ribbons.',
    params: [
      { key: 'color1', label: 'Base', type: 'color', default: '#0b0a1a', group: 'Colours' },
      { key: 'color2', label: 'Mid', type: 'color', default: '#3a2cff', group: 'Colours' },
      { key: 'color3', label: 'Highlight', type: 'color', default: '#ff6ad5', group: 'Colours' },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 1, group: 'Flow', decimals: 2 },
      { key: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 3, step: 0.01, default: 0.6, group: 'Flow', decimals: 2 },
      { key: 'warp', label: 'Warp', type: 'number', min: 0, max: 4, step: 0.01, default: 1.2, group: 'Flow', decimals: 2 },
    ],
    glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform vec3 u_color3;
uniform float u_speed; uniform float u_scale; uniform float u_warp;
float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 1.9 + 11.3; a *= 0.5; } return s; }
vec4 effect(vec2 uv) {
  vec2 p = uv * aspect() * u_scale + uSeed * 7.0;
  float t = uTime * u_speed * 0.06;
  vec2 q = vec2(fbm3(p + vec2(0.0, t)), fbm3(p + vec2(5.2, 1.3) - t));
  float f = fbm3(p + u_warp * q + vec2(t * 0.5, 0.0)) * 0.5 + 0.5;
  vec3 col = mix(u_color1, u_color2, smoothstep(0.25, 0.75, f));
  col = mix(col, u_color3, smoothstep(0.55, 0.95, f) * smoothstep(0.1, 0.8, length(q) + 0.25));
  return vec4(col + dither(), 1.0);
}`,
  },
  {
    id: 'grid', name: 'Grid', category: 'generate',
    description: 'Lines, dots or crosses on a precise grid. Drifts slowly and fades at the edges.',
    defaultBlend: 'normal',
    params: [
      { key: 'style', label: 'Style', type: 'select', options: opt('lines', 'dots', 'crosses'), default: 'lines', group: 'Pattern' },
      { key: 'color', label: 'Colour', type: 'color', default: '#ffffff', group: 'Pattern' },
      { key: 'spacing', label: 'Spacing', type: 'number', min: 8, max: 300, step: 1, default: 64, group: 'Pattern', unit: 'px', decimals: 0 },
      { key: 'thickness', label: 'Thickness', type: 'number', min: 0.5, max: 12, step: 0.1, default: 1, group: 'Pattern', unit: 'px', decimals: 1 },
      { key: 'fade', label: 'Edge fade', type: 'number', min: 0, max: 1, step: 0.01, default: 0.7, group: 'Motion', decimals: 2 },
      { key: 'drift', label: 'Drift', type: 'number', min: -3, max: 3, step: 0.01, default: 0.3, group: 'Motion', decimals: 2 },
    ],
    glsl: `uniform vec3 u_color; uniform float u_style; uniform float u_spacing; uniform float u_thickness; uniform float u_fade; uniform float u_drift;
vec4 effect(vec2 uv) {
  vec2 p = uv * uRes + vec2(0.0, uTime * u_drift * 20.0);
  vec2 g = mod(p, u_spacing) - u_spacing * 0.5;
  float px = uRes.x / uPx.x;
  float a;
  if (u_style < 0.5) {
    float d = min(abs(g.x), abs(g.y));
    a = 1.0 - smoothstep(u_thickness * 0.5, u_thickness * 0.5 + px, d);
  } else if (u_style < 1.5) {
    a = 1.0 - smoothstep(u_thickness, u_thickness + px, length(g));
  } else {
    float arm = u_spacing * 0.12;
    float d = min(max(abs(g.x), abs(g.y) - arm + u_thickness), max(abs(g.y), abs(g.x) - arm + u_thickness));
    a = 1.0 - smoothstep(u_thickness * 0.5, u_thickness * 0.5 + px, d);
  }
  a *= mix(1.0, 1.0 - smoothstep(0.15, 0.85, length((uv - 0.5) * aspect())), u_fade);
  return vec4(u_color, a);
}`,
  },
  {
    // SlideForge's cover motion (css/app.css, "generated cover motion"), drawn on the GPU: the same
    // three blurred washes of the theme's own colours on the same closed paths and periods, so a
    // slide that moves in SlideForge moves the same way here. Every colour is laid over the ground
    // at low strength, so it is pale on paper and a glow on midnight.
    id: 'backdrop', name: 'Backdrop motion', category: 'generate', featured: true,
    description: 'Drift, Grid or Glow — slow motion behind the words, made from the slide’s own colours.',
    defaultBlend: 'normal',
    params: [
      { key: 'mode', label: 'Motion', type: 'select', options: [{ value: 'drift', label: 'Drift — colour moving slowly' }, { value: 'grid', label: 'Grid — a ruled plane travelling' }, { value: 'glow', label: 'Glow — one slow breath' }], default: 'drift', group: 'Motion' },
      { key: 'accent', label: 'Accent', type: 'color', default: '#ff5a36', group: 'Colours' },
      { key: 'accent2', label: 'Second accent', type: 'color', default: '#ffb199', group: 'Colours' },
      { key: 'ink', label: 'Ink', type: 'color', default: '#161616', group: 'Colours', info: 'The text colour: the third wash and the grid lines.' },
      { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 2.5, step: 0.01, default: 1, group: 'Motion', decimals: 2 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 1, group: 'Motion', decimals: 2 },
    ],
    glsl: `uniform float u_mode; uniform vec3 u_accent; uniform vec3 u_accent2; uniform vec3 u_ink; uniform float u_strength; uniform float u_speed;
// ease-in-out there and back over one period, as the CSS keyframes do
float swing(float period) { return 0.5 - 0.5 * cos(6.2831853 * uTime * u_speed / period); }
// a disc of diameter d, blurred by b, centred at c (slide px)
float blob(vec2 p, vec2 c, float d, float b) { return 1.0 - smoothstep(d * 0.5 - b * 1.6, d * 0.5 + b * 1.6, length(p - c)); }
vec4 over(vec4 acc, vec3 col, float a) { return vec4(col * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a)); }
vec4 effect(vec2 uv) {
  vec2 p = uv * uRes;
  float W = uRes.x, H = uRes.y, k = W / 1920.0;
  float blur = 96.0 * k;
  vec4 acc = vec4(0.0);
  if (u_mode < 1.5) {
    // mo-1: 58% wide, top-left; mo-2: 58%, right; periods 31 s and 43 s
    float s1 = swing(31.0), s2 = swing(43.0);
    float d1 = 0.58 * W * (1.0 + 0.08 * s1), d2 = 0.58 * W * (1.04 - 0.04 * s2);
    vec2 c1 = vec2(0.21 * W, -0.14 * H + 0.29 * W) + vec2(0.14, 0.10) * 0.58 * W * s1;
    vec2 c2 = vec2(0.83 * W, 0.12 * H + 0.29 * W) + vec2(-0.12, 0.14) * 0.58 * W * s2;
    acc = over(acc, u_accent, 0.40 * blob(p, c1, d1, blur));
    acc = over(acc, u_accent2, 0.34 * blob(p, c2, d2, blur));
    if (u_mode < 0.5) {
      // mo-3: 66% wide, ink, low along the bottom; 37 s
      float s3 = swing(37.0);
      float d3 = 0.66 * W * (1.0 + 0.1 * s3);
      vec2 c3 = vec2(0.59 * W, 1.26 * H - 0.33 * W) + vec2(0.08, -0.12) * 0.66 * W * s3;
      acc = over(acc, u_ink, 0.14 * blob(p, c3, d3, blur));
    } else {
      // a ruled plane, one 120px cell every 24 s, so each cycle is the same picture again
      float cell = 120.0 * k, t = fract(uTime * u_speed / 24.0) * cell;
      vec2 g = mod(p - vec2(t), cell);
      float px = uRes.x / uPx.x, w = 1.5 * k;
      float line = max(1.0 - smoothstep(w, w + px, g.x), 1.0 - smoothstep(w, w + px, g.y));
      acc = over(acc, u_ink, 0.09 * line);
    }
  } else {
    // one breath behind the words: 92% wide, opacity .55 → .9, scale 1 → 1.12, 19 s
    float s = swing(19.0);
    float r = 0.46 * W * (1.0 + 0.12 * s);
    float f = 1.0 - smoothstep(0.0, 1.0, length(p - vec2(0.5 * W, 0.5 * H)) / r);
    acc = over(acc, u_accent, 0.34 * mix(0.55, 0.9, s) * f * f * (3.0 - 2.0 * f));
  }
  float a = clamp(acc.a * u_strength, 0.0, 1.0);
  return vec4((acc.a > 0.0 ? acc.rgb / acc.a : u_accent) + dither(), a);
}`,
  },

  // ─── Distort ──────────────────────────────────────────────────────────────
  {
    id: 'ripple', name: 'Ripple', category: 'distort', featured: true, mouseParam: 'centre', defaultFollowMouse: true,
    description: 'Rings travel out from a point and bend everything below.',
    params: [
      { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 0.08, step: 0.001, default: 0.012, group: 'Waves', decimals: 3, info: 'How far pixels are pushed.' },
      { key: 'frequency', label: 'Frequency', type: 'number', min: 1, max: 80, step: 0.1, default: 24, group: 'Waves', decimals: 1, info: 'Rings per screen height.' },
      { key: 'harmonics', label: 'Harmonics', type: 'number', min: 1, max: 5, step: 1, default: 2, group: 'Waves', decimals: 0, info: 'Stacked wave layers for a richer surface.' },
      { key: 'speed', label: 'Speed', type: 'number', min: -6, max: 6, step: 0.01, default: 1.5, group: 'Waves', decimals: 2 },
      { key: 'falloff', label: 'Falloff', type: 'number', min: 0, max: 10, step: 0.1, default: 2.5, group: 'Waves', decimals: 1, info: 'How quickly rings fade away from the origin.' },
      { key: 'shape', label: 'Shape', type: 'select', options: opt('radial', 'linear'), default: 'radial', group: 'Origin' },
      { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
    ],
    glsl: `uniform float u_strength; uniform float u_frequency; uniform float u_harmonics; uniform float u_speed; uniform float u_falloff; uniform float u_shape; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float r = u_shape < 0.5 ? length(d) : abs(d.y);
  float w = 0.0;
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    if (fi > u_harmonics + 0.5) break;
    w += sin(r * u_frequency * fi - uTime * u_speed * 3.0 * fi + fi * 1.7) / fi;
  }
  vec2 dir = u_shape < 0.5 ? (r > 1e-5 ? d / r : vec2(0.0)) : vec2(0.0, sign(d.y));
  vec2 off = dir * w * u_strength * exp(-r * u_falloff) / as;
  return vec4(below(uv + off).rgb, 1.0);
}`,
  },
  {
    id: 'wave', name: 'Liquid', category: 'distort', featured: true,
    description: 'Organic noise displacement, like looking through moving water or heat haze.',
    params: [
      { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 0.1, step: 0.001, default: 0.02, group: 'Flow', decimals: 3 },
      { key: 'scale', label: 'Scale', type: 'number', min: 0.2, max: 12, step: 0.1, default: 3, group: 'Flow', decimals: 1 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5, step: 0.01, default: 0.8, group: 'Flow', decimals: 2 },
    ],
    glsl: `uniform float u_strength; uniform float u_scale; uniform float u_speed;
vec4 effect(vec2 uv) {
  vec2 p = uv * aspect() * u_scale;
  float t = uTime * u_speed * 0.3;
  vec2 off = vec2(snoise(p + vec2(t, 0.0)), snoise(p + vec2(3.1, -t))) * u_strength;
  return vec4(below(uv + off).rgb, 1.0);
}`,
  },
  {
    id: 'swirl', name: 'Swirl', category: 'distort', mouseParam: 'centre',
    description: 'Twists everything below around a point. Animate the angle for a hypnotic vortex.',
    params: [
      { key: 'angle', label: 'Angle', type: 'number', min: -720, max: 720, step: 1, default: 140, group: 'Twist', unit: '°', decimals: 0 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0.05, max: 1.5, step: 0.01, default: 0.45, group: 'Twist', decimals: 2 },
      { key: 'speed', label: 'Oscillate', type: 'number', min: 0, max: 4, step: 0.01, default: 0.4, group: 'Twist', decimals: 2 },
      { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
    ],
    glsl: `uniform float u_angle; uniform float u_radius; uniform float u_speed; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float k = 1.0 - smoothstep(0.0, u_radius, length(d));
  float a = radians(u_angle) * (0.75 + 0.25 * sin(uTime * u_speed)) * k * k;
  float c = cos(a), s = sin(a);
  d = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  return vec4(below(u_centre + d / as).rgb, 1.0);
}`,
  },
  {
    id: 'lens', name: 'Lens', category: 'distort', featured: true, mouseParam: 'centre', defaultFollowMouse: true,
    description: 'A magnifying bubble. Negative strength pinches instead of bulging.',
    params: [
      { key: 'strength', label: 'Strength', type: 'number', min: -1, max: 1, step: 0.01, default: 0.45, group: 'Lens', decimals: 2 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0.03, max: 0.8, step: 0.01, default: 0.18, group: 'Lens', decimals: 2 },
      { key: 'fringe', label: 'Fringe', type: 'number', min: 0, max: 1, step: 0.01, default: 0.25, group: 'Lens', decimals: 2, info: 'Colour separation at the rim.' },
      { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
    ],
    glsl: `uniform float u_strength; uniform float u_radius; uniform float u_fringe; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float r = length(d) / u_radius;
  if (r >= 1.0) return vec4(below(uv).rgb, 1.0);
  float k = u_strength * (1.0 - r * r);
  vec2 dd = d * (1.0 - k * 0.7);
  float f = u_fringe * 0.012 * r * r * k;
  vec2 base = u_centre + dd / as;
  vec2 dir = r > 1e-4 ? normalize(d) / as : vec2(0.0);
  vec3 c = vec3(below(base + dir * f).r, below(base).g, below(base - dir * f).b);
  return vec4(c, 1.0);
}`,
  },

  // ─── Colour ───────────────────────────────────────────────────────────────
  {
    id: 'gradientMap', name: 'Gradient map', category: 'colour', featured: true,
    description: 'Remaps the brightness of everything below onto a three-stop colour ramp.',
    params: [
      { key: 'shadow', label: 'Shadows', type: 'color', default: '#2b0a3d', group: 'Ramp' },
      { key: 'mid', label: 'Midtones', type: 'color', default: '#e83f6f', group: 'Ramp' },
      { key: 'highlight', label: 'Highlights', type: 'color', default: '#ffe8d6', group: 'Ramp' },
      { key: 'contrast', label: 'Contrast', type: 'number', min: 0.2, max: 3, step: 0.01, default: 1.1, group: 'Tone', decimals: 2 },
      { key: 'shift', label: 'Shift', type: 'number', min: -0.5, max: 0.5, step: 0.01, default: 0, group: 'Tone', decimals: 2 },
    ],
    glsl: `uniform vec3 u_shadow; uniform vec3 u_mid; uniform vec3 u_highlight; uniform float u_contrast; uniform float u_shift;
vec4 effect(vec2 uv) {
  float l = clamp((luma(below(uv).rgb) - 0.5) * u_contrast + 0.5 + u_shift, 0.0, 1.0);
  vec3 c = l < 0.5 ? mix(u_shadow, u_mid, l * 2.0) : mix(u_mid, u_highlight, (l - 0.5) * 2.0);
  return vec4(c + dither(), 1.0);
}`,
  },
  {
    id: 'adjust', name: 'Adjust', category: 'colour',
    description: 'Brightness, contrast, saturation, hue and temperature for everything below.',
    params: [
      { key: 'brightness', label: 'Brightness', type: 'number', min: -0.5, max: 0.5, step: 0.01, default: 0, group: 'Tone', decimals: 2 },
      { key: 'contrast', label: 'Contrast', type: 'number', min: 0, max: 2.5, step: 0.01, default: 1.1, group: 'Tone', decimals: 2 },
      { key: 'saturation', label: 'Saturation', type: 'number', min: 0, max: 2.5, step: 0.01, default: 1.2, group: 'Colour', decimals: 2 },
      { key: 'hue', label: 'Hue', type: 'number', min: -180, max: 180, step: 1, default: 0, group: 'Colour', unit: '°', decimals: 0 },
      { key: 'temperature', label: 'Temperature', type: 'number', min: -1, max: 1, step: 0.01, default: 0, group: 'Colour', decimals: 2 },
    ],
    glsl: `uniform float u_brightness; uniform float u_contrast; uniform float u_saturation; uniform float u_hue; uniform float u_temperature;
vec4 effect(vec2 uv) {
  vec3 c = below(uv).rgb + u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  c = mix(vec3(luma(c)), c, u_saturation);
  vec3 h = rgb2hsv(clamp(c, 0.0, 1.0)); h.x = fract(h.x + u_hue / 360.0); c = hsv2rgb(h);
  c += vec3(0.08, 0.02, -0.08) * u_temperature;
  return vec4(c, 1.0);
}`,
  },

  // ─── Light ────────────────────────────────────────────────────────────────
  {
    id: 'spotlight', name: 'Spotlight', category: 'light', mouseParam: 'centre', defaultFollowMouse: true, defaultBlend: 'screen',
    description: 'A soft pool of light. Follows the pointer by default — great for guiding attention.',
    params: [
      { key: 'color', label: 'Colour', type: 'color', default: '#ffd9c2', group: 'Light' },
      { key: 'radius', label: 'Radius', type: 'number', min: 0.02, max: 1.5, step: 0.01, default: 0.35, group: 'Light', decimals: 2 },
      { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.01, default: 0.7, group: 'Light', decimals: 2 },
      { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.45], group: 'Origin' },
    ],
    glsl: `uniform vec3 u_color; uniform float u_radius; uniform float u_intensity; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  float r = length((uv - u_centre) * aspect()) / u_radius;
  return vec4(u_color, exp(-r * r * 2.2) * u_intensity);
}`,
  },
  {
    id: 'glow', name: 'Glow', category: 'light', needsMips: true,
    description: 'Blooms the brightest parts of everything below for a luminous, filmic finish.',
    params: [
      { key: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Bloom', decimals: 2 },
      { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 4, step: 0.01, default: 1.2, group: 'Bloom', decimals: 2 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0.3, max: 2, step: 0.01, default: 1, group: 'Bloom', decimals: 2 },
      { key: 'tint', label: 'Tint', type: 'color', default: '#ffffff', group: 'Bloom' },
    ],
    glsl: `uniform float u_threshold; uniform float u_intensity; uniform float u_radius; uniform vec3 u_tint;
vec4 effect(vec2 uv) {
  vec3 base = below(uv).rgb;
  vec3 acc = vec3(0.0);
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    vec3 c = softLod(uv, fi * u_radius + 0.5);
    acc += max(c - u_threshold, 0.0) / (1.0 - u_threshold + 1e-3) * (1.2 / fi);
  }
  return vec4(base + acc * u_intensity * 0.35 * u_tint, 1.0);
}`,
  },
  {
    id: 'leak', name: 'Light leak', category: 'light', defaultBlend: 'screen',
    description: 'Warm, drifting film light bleeding in from the edges.',
    params: [
      { key: 'color1', label: 'Colour 1', type: 'color', default: '#ff6a2b', group: 'Light' },
      { key: 'color2', label: 'Colour 2', type: 'color', default: '#ffd166', group: 'Light' },
      { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.01, default: 0.8, group: 'Light', decimals: 2 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 0.6, group: 'Light', decimals: 2 },
    ],
    glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform float u_intensity; uniform float u_speed;
vec4 effect(vec2 uv) {
  float t = uTime * u_speed * 0.25 + uSeed * 9.0;
  vec2 p = uv * aspect();
  float n = snoise(p * 1.1 + vec2(t, -t * 0.7)) * 0.5 + 0.5;
  float n2 = snoise(p * 2.3 - vec2(t * 0.6, t)) * 0.5 + 0.5;
  float edgeL = pow(max(1.0 - uv.x * (1.4 + 0.4 * sin(t + uv.y * 3.0)), 0.0), 2.0);
  float edgeR = pow(max(uv.x * 1.5 - 0.8 + 0.2 * cos(t * 0.8 + uv.y * 2.0), 0.0), 2.0);
  float a = (edgeL + edgeR * 0.8) * (0.4 + n) * u_intensity;
  return vec4(mix(u_color1, u_color2, n2), clamp(a, 0.0, 1.0));
}`,
  },

  // ─── Stylise ──────────────────────────────────────────────────────────────
  {
    id: 'grain', name: 'Film grain', category: 'stylise', featured: true,
    description: 'Fine, animated photographic grain. Adds texture and hides gradient banding.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 0.5, step: 0.005, default: 0.09, group: 'Grain', decimals: 3 },
      { key: 'size', label: 'Size', type: 'number', min: 0.5, max: 6, step: 0.1, default: 1.4, group: 'Grain', unit: 'px', decimals: 1 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 2, step: 0.01, default: 1, group: 'Grain', decimals: 2 },
      { key: 'colour', label: 'Colour grain', type: 'bool', default: false, group: 'Grain' },
    ],
    glsl: `uniform float u_amount; uniform float u_size; uniform float u_speed; uniform float u_colour;
vec4 effect(vec2 uv) {
  vec3 c = below(uv).rgb;
  vec2 p = floor(uv * uRes / u_size);
  float t = floor(uTime * u_speed * 24.0);
  vec3 n = vec3(hash12(p + t * 17.13) + hash12(p * 1.7 + t * 5.31) - 1.0);
  if (u_colour > 0.5) n = vec3(n.x, hash12(p + t * 3.1 + 11.0) + hash12(p * 0.7 + t) - 1.0, hash12(p + t * 7.7 + 23.0) + hash12(p * 1.3 - t) - 1.0);
  c += n * u_amount * (1.0 - 0.7 * abs(luma(c) - 0.5) * 2.0);
  return vec4(c, 1.0);
}`,
  },
  {
    id: 'halftone', name: 'Halftone', category: 'stylise',
    description: 'Print-style dot screen. Mono ink or full colour.',
    params: [
      { key: 'size', label: 'Dot size', type: 'number', min: 3, max: 60, step: 0.5, default: 10, group: 'Screen', unit: 'px', decimals: 1 },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 90, step: 1, default: 45, group: 'Screen', unit: '°', decimals: 0 },
      { key: 'mode', label: 'Mode', type: 'select', options: opt('mono', 'colour'), default: 'mono', group: 'Ink' },
      { key: 'ink', label: 'Ink', type: 'color', default: '#141414', group: 'Ink', when: (p) => p.mode === 'mono' },
      { key: 'paper', label: 'Paper', type: 'color', default: '#f4ede4', group: 'Ink' },
    ],
    glsl: `uniform float u_size; uniform float u_angle; uniform float u_mode; uniform vec3 u_ink; uniform vec3 u_paper;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 p = R * (uv * uRes);
  vec2 cell = floor(p / u_size);
  vec2 f = fract(p / u_size) - 0.5;
  vec2 cp = transpose(R) * ((cell + 0.5) * u_size) / uRes;
  vec3 s = below(cp).rgb;
  float l = luma(s);
  float d = length(f);
  float aa = (uRes.x / uPx.x) / u_size;
  if (u_mode < 0.5) {
    float rad = sqrt(1.0 - l) * 0.72;
    float ink = 1.0 - smoothstep(rad - aa, rad + aa, d);
    return vec4(mix(u_paper, u_ink, ink), 1.0);
  }
  float rad = sqrt(clamp(1.0 - l * 0.6, 0.0, 1.0)) * 0.72;
  float ink = 1.0 - smoothstep(rad - aa, rad + aa, d);
  return vec4(mix(u_paper, s, ink), 1.0);
}`,
  },
  {
    id: 'pixelate', name: 'Pixelate', category: 'stylise',
    description: 'Chunky pixel mosaic. Try it as a slide transition by animating opacity.',
    params: [{ key: 'size', label: 'Cell size', type: 'number', min: 2, max: 120, step: 1, default: 16, group: 'Mosaic', unit: 'px', decimals: 0 }],
    glsl: `uniform float u_size;
vec4 effect(vec2 uv) {
  vec2 p = (floor(uv * uRes / u_size) + 0.5) * u_size / uRes;
  return vec4(below(p).rgb, 1.0);
}`,
  },
  {
    id: 'chroma', name: 'Chromatic shift', category: 'stylise',
    description: 'Splits red and blue channels apart like a cheap lens or a glitch.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 3, step: 0.01, default: 0.6, group: 'Shift', decimals: 2 },
      { key: 'mode', label: 'Mode', type: 'select', options: opt('radial', 'linear'), default: 'radial', group: 'Shift' },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 0, group: 'Shift', unit: '°', decimals: 0, when: (p) => p.mode === 'linear' },
    ],
    glsl: `uniform float u_amount; uniform float u_mode; uniform float u_angle;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  vec2 dir = u_mode < 0.5 ? (uv - 0.5) : vec2(cos(a), sin(a)) * 0.5;
  vec2 o = dir * u_amount * 0.02;
  return vec4(below(uv + o).r, below(uv).g, below(uv - o).b, 1.0);
}`,
  },
  {
    id: 'vignette', name: 'Vignette', category: 'stylise',
    description: 'Darkens (or tints) the corners to pull the eye to the centre.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Vignette', decimals: 2 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0, max: 1.2, step: 0.01, default: 0.45, group: 'Vignette', decimals: 2 },
      { key: 'softness', label: 'Softness', type: 'number', min: 0.01, max: 1.5, step: 0.01, default: 0.7, group: 'Vignette', decimals: 2 },
      { key: 'color', label: 'Colour', type: 'color', default: '#000000', group: 'Vignette' },
    ],
    glsl: `uniform float u_amount; uniform float u_radius; uniform float u_softness; uniform vec3 u_color;
vec4 effect(vec2 uv) {
  float r = length(uv - 0.5) * 1.4142;
  float v = smoothstep(u_radius, u_radius + u_softness, r) * u_amount;
  return vec4(mix(below(uv).rgb, u_color, v), 1.0);
}`,
  },
  {
    id: 'blur', name: 'Blur', category: 'stylise', needsMips: true, mouseParam: 'focus',
    description: 'Uniform, tilt-shift or focus blur. Focus blur can follow the pointer.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 1, step: 0.01, default: 0.4, group: 'Blur', decimals: 2 },
      { key: 'type', label: 'Type', type: 'select', options: [{ value: 'uniform', label: 'Uniform' }, { value: 'tilt', label: 'Tilt-shift' }, { value: 'focus', label: 'Focus' }], default: 'tilt', group: 'Blur' },
      { key: 'band', label: 'Focus size', type: 'number', min: 0, max: 1, step: 0.01, default: 0.3, group: 'Blur', decimals: 2, when: (p) => p.type !== 'uniform' },
      { key: 'focus', label: 'Focus', type: 'vec2', default: [0.5, 0.5], group: 'Blur', when: (p) => p.type !== 'uniform' },
    ],
    glsl: `uniform float u_amount; uniform float u_type; uniform float u_band; uniform vec2 u_focus;
vec4 effect(vec2 uv) {
  float amt = u_amount;
  if (u_type > 0.5 && u_type < 1.5) amt *= smoothstep(u_band * 0.5, u_band * 0.5 + 0.25, abs(uv.y - u_focus.y));
  if (u_type > 1.5) amt *= smoothstep(u_band * 0.5, u_band * 0.5 + 0.3, length((uv - u_focus) * aspect()));
  if (amt < 0.01) return vec4(below(uv).rgb, 1.0);
  return vec4(softLod(uv, amt * 5.5), 1.0);
}`,
  },
];

export const REGISTRY: Record<string, KindDef> = Object.fromEntries(KINDS.map((k) => [k.id, k]));
export const ALL_KINDS = KINDS;

export function kind(id: string): KindDef {
  return REGISTRY[id] ?? REGISTRY.solid;
}

export function defaultParams(k: KindDef): Params {
  const p: Params = {};
  for (const d of k.params) p[d.key] = (Array.isArray(d.default) ? [...d.default] : d.default) as ParamValue;
  return p;
}

export function kindsIn(cat: Category | 'featured'): KindDef[] {
  if (cat === 'featured') return KINDS.filter((k) => k.featured);
  return KINDS.filter((k) => k.category === cat);
}

export const CATEGORY_LABEL: Record<Category, string> = {
  source: 'Source', generate: 'Generate', distort: 'Distort', colour: 'Colour', light: 'Light', stylise: 'Stylise',
};
