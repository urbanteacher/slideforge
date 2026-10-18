'use strict';
/* "Six kinds of map": each kind's picture, cut from the 2025 deck's six-map grid
 * (assets/lesson/ipdv/week5/map-types.jpg, 1500 x 1500), with what it is good for and
 * what to watch out for, in plain words for a room new to maps. Plain SVG: each picture
 * is the one image, embedded once and cropped for each card by a nested viewBox. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const NU = {
  red: '#c8102e', navy: '#0c3354', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca', good: '#1f6f50',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif"
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* Where each map sits in the grid image, and what to say about it. */
const TYPES = [
  { name: 'Dot density', crop: [66, 33, 516, 366],
    good: ['Where things cluster and', 'where they thin out'],
    watch: ['A dot is not an exact place;', 'dense areas merge into blobs'] },
  { name: 'Proportional (symbol map)', crop: [813, 33, 516, 366],
    good: ['Counts at each place:', 'a bigger shape is more'],
    watch: ['Big symbols hide small ones;', 'we judge areas poorly'] },
  { name: 'Choropleth', crop: [66, 530, 516, 366],
    good: ['Rates and percentages', 'across areas'],
    watch: ['Big empty areas grab the eye;', 'never use raw counts'] },
  { name: 'Cartogram', crop: [813, 530, 516, 366],
    good: ['Size shows the data, so small', 'but busy places count'],
    watch: ['Shapes bend out of shape;', 'hard to recognise places'] },
  { name: 'Flow map', crop: [66, 1015, 516, 366],
    good: ['Movement between places:', 'trade, migration, travel'],
    watch: ['Many lines tangle;', 'amounts are hard to read'] },
  { name: 'Density (heat) map', crop: [813, 1015, 516, 366],
    good: ['Where many points pile up,', 'like crimes or pickups'],
    watch: ['Smoothing hides exact places;', 'often just shows population'] }
];

function mapTypesSvg() {
  const uri = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'assets/lesson/ipdv/week5/map-types.jpg')).toString('base64');
  const W = 462, H = 345, gx = 27, gy = 16, x0 = 80, y0 = 150;
  const cards = TYPES.map((t, i) => {
    const x = x0 + (i % 3) * (W + gx), y = y0 + Math.floor(i / 3) * (H + gy);
    const [cx, cy, cw, ch] = t.crop, iw = 200, ih = Math.round(iw * ch / cw);
    const out = [
      `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="#fff" stroke="${NU.rule}"/>`,
      `<svg x="${x + 16}" y="${y + 16}" width="${iw}" height="${ih}" viewBox="${cx} ${cy} ${cw} ${ch}" preserveAspectRatio="xMidYMid slice"><use href="#grid"/></svg>`,
      `<text x="${x + 236}" y="${y + 50}" font-family="${NU.serif}" font-size="29" fill="${NU.ink}">${esc(t.name.split(' (')[0])}</text>`,
      t.name.includes('(') ? `<text x="${x + 236}" y="${y + 82}" font-family="${NU.serif}" font-size="22" fill="${NU.dim}">${esc('(' + t.name.split(' (')[1])}</text>` : ''
    ];
    const row = (label, color, lines, ty) => [
      `<text x="${x + 18}" y="${ty}" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="1.6" fill="${color}">${label}</text>`,
      ...lines.map((l, k) => `<text x="${x + 18}" y="${ty + 30 + k * 27}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">${esc(l)}</text>`)
    ];
    out.push(...row('GOOD FOR', NU.good, t.good, y + ih + 44), ...row('WATCH OUT', NU.red, t.watch, y + ih + 44 + 88));
    return out.join('\n  ');
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs><image id="grid" href="${uri}" width="1500" height="1500"/></defs>
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">PICK THE MAP FOR THE DATA</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">Six kinds of map: good for, watch out</text>
  ${cards.join('\n  ')}
</svg>
`;
}

module.exports = { mapTypesSvg, TYPES };
