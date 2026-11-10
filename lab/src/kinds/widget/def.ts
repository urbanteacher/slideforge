// The widget layer: one small web page that runs on the slide in the show (BACKLOG CS-15; engine/widget.ts).
import type { KindDef } from '../../engine';

export const widgetDef: KindDef = {
  id: 'widget', name: 'Widget', category: 'source', content: 'widget',
  description: 'A small live web page on the slide: a dice roller, a slider, a toy simulation. It runs in the show and Preview, walled off from the lesson and your sign-in; it loads nothing itself, but can open a web page in its frame, so one from someone else’s lesson asks first. The editor shows a card in its place.',
  params: [
    { key: 'html', label: 'Page', type: 'text', default: '', group: 'Widget', info: 'HTML with its own <style> and <script>, up to 16 KB. It cannot fetch or load files; it can open a web page in its own frame.' },
    { key: 'background', label: 'Background', type: 'color', default: '#ffffff', group: 'Widget' },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 200, step: 1, default: 24, group: 'Widget', unit: 'px', decimals: 0 },
  ],
};
