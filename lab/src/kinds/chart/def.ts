// The chart layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const chartDef: KindDef = {
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
    { key: 'icon', label: 'Icon', type: 'text', default: '●', group: 'Chart', info: 'One icon, or one per row separated by spaces: 🐄 🐖 🐑.', when: (p) => p.chart === 'pictogram' },
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
};
