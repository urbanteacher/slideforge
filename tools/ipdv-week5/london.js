'use strict';
/* "One city, three maps": the 2025 deck's three London maps (slides 14–16) side by side, each with
 * what it was made for, so a room new to maps sees that the same place can be mapped for very
 * different jobs. Plain SVG, pictures embedded (a picture drawn through <img> fetches nothing). */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const DIR = 'assets/lesson/ipdv/week5';
const NU = {
  red: '#c8102e', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif"
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const uri = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, DIR, f)).toString('base64');

const MAPS = [
  { file: 'london-1754-tirion.jpg', title: 'To find your way', who: 'Isaak Tirion, Amsterdam, 1754',
    lines: ['Streets, fields, the river:', 'where things are. Built-up', 'London is filled in red.'] },
  { file: 'london-illustrated.jpg', title: 'To explore', who: 'An illustrated tourist map',
    lines: ['Drawings of landmarks,', 'parks and sights. Not to', 'scale: fun, not exact.'] },
  { file: 'london-lancet.jpg', title: 'To compare data', who: 'The Lancet Psychiatry, 2017',
    lines: ['Each borough coloured by', 'mental-health need, lowest', 'to highest: a choropleth.'] }
];

function londonSvg() {
  const W = 454, gap = 39, x0 = 80, ph = 330;
  const cards = MAPS.map((m, i) => {
    const x = x0 + i * (W + gap);
    return [
      `<rect x="${x}" y="160" width="${W}" height="${ph}" fill="#fff" stroke="${NU.rule}"/>`,
      `<image href="${uri(m.file)}" x="${x + 8}" y="168" width="${W - 16}" height="${ph - 16}" preserveAspectRatio="xMidYMid meet"/>`,
      `<text x="${x}" y="540" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">${esc(m.title)}</text>`,
      `<text x="${x}" y="572" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="1.4" fill="${NU.red}">${esc(m.who.toUpperCase())}</text>`,
      ...m.lines.map((l, k) => `<text x="${x}" y="${614 + k * 32}" font-family="${NU.sans}" font-size="23" fill="${NU.ink}">${esc(l)}</text>`)
    ].join('\n  ');
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">SEE IT · ONE CITY, THREE MAPS</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">Same place, three different jobs</text>
  ${cards.join('\n  ')}
  <text x="80" y="800" font-family="${NU.serif}" font-size="25" fill="${NU.ink}">Before you draw a map, ask what job it has to do.</text>
  <text x="80" y="834" font-family="${NU.sans}" font-size="17" fill="${NU.dim}">Kousoulis and Goldie, Mapping mental health priorities in London with real-world data, The Lancet Psychiatry 4(10), 2017.</text>
</svg>
`;
}

module.exports = { londonSvg };
