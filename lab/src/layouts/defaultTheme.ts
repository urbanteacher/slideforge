// The default theme: the one place the studio's default look is set. Every slide made without a theme
// of the deck's own is built in it — the Layouts, the Slide designs, the games and inserted blocks —
// and it leads the theme list. Change the default here and nowhere else.
//
// 2026's look, the year's "Future Earth" palette: Pantone's colour of the year, Cloud Dancer, for the
// ground and Wax Paper for panels; WGSN's Transformative Teal for the accent; Cocoa Powder, the warm
// red-brown that replaces cool greys, for the second colour and, deepened, the text; Instrument Serif,
// the high-contrast serif of 2026's editorial work, for the headings, over Inter. (The paid faces of
// the year — GT America, Söhne, Graphik, Aeonik — cannot be served to a class.) The fonts are loaded
// in index.html and view.html. Every colour is AA on the ground: text 14:1, muted 6:1, teal 5:1.
import type { LayoutStyle } from './style';

export const DEFAULT_THEME: LayoutStyle = {
  id: 'paper', name: 'Paper',
  ground: '#f0eee9', ink: '#241c18', muted: '#66574e', panel: '#f7f3ea',
  accent: '#14706e', accent2: '#7b4a39',
  display: 'Instrument Serif', displayWeight: '400', body: 'Inter',
};
