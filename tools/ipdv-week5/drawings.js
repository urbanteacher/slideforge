'use strict';
/* Week 5's drawn pictures: plain SVG at 1600x900, no foreignObject.
 *   strip(focus)    the mechanics strip: input → parameter → predicate → visual response
 *   anatomy(focus)  one tooltip card, exploded: each part to the line of Altair that made it
 * `focus` is the part lit (the rest dimmed), or null for all of them. */

const NU = {
  red: '#c8102e', navy: '#0c3354', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const open = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">\n  <rect width="1600" height="900" fill="${NU.paper}"/>`;
const head = (eyebrow, title, sub) =>
  `<text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">${esc(eyebrow)}</text>` +
  `<text x="80" y="122" font-family="${NU.serif}" font-size="50" fill="${NU.ink}">${esc(title)}</text>` +
  (sub ? `<text x="80" y="162" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">${esc(sub)}</text>` : '');
const mono = (x, y, text, size = 19, fill = NU.ink) => `<text x="${x}" y="${y}" font-family="${NU.mono}" font-size="${size}" fill="${fill}" style="white-space:pre">${esc(text).replace(/ /g, ' ')}</text>`;

const STRIP = [
  { key: 'INPUT', ask: 'What does the reader do?', eg: 'pointer over a bubble', code: "on='pointerover'" },
  { key: 'PARAMETER', ask: 'What does the chart store?', eg: 'which country it is', code: "hover = alt.selection_point(\n  fields=['country'])" },
  { key: 'PREDICATE', ask: 'What does it test?', eg: 'is this mark the stored one?', code: 'alt.when(hover)' },
  { key: 'VISUAL RESPONSE', ask: 'What changes on screen?', eg: 'it turns red; the rest grey', code: ".then(alt.value('red'))\n.otherwise(alt.value('grey'))" }
];

function strip(focus) {
  const W = 330, G = 46, X = 80, Y = 240;
  const boxes = STRIP.map((b, i) => {
    const x = X + i * (W + G), on = focus === null || focus === i;
    const lines = b.code.split('\n');
    return `<g opacity="${on ? 1 : 0.16}">
    <rect x="${x}" y="${Y}" width="${W}" height="440" rx="16" fill="#fff" stroke="${focus === i ? NU.red : NU.navy}" stroke-width="${focus === i ? 3.5 : 2}"/>
    <rect x="${x}" y="${Y}" width="${W}" height="64" rx="16" fill="${focus === i ? NU.red : NU.navy}"/><rect x="${x}" y="${Y + 40}" width="${W}" height="24" fill="${focus === i ? NU.red : NU.navy}"/>
    <text x="${x + 24}" y="${Y + 42}" font-family="${NU.sans}" font-size="20" font-weight="700" letter-spacing="2" fill="#fff">${b.key}</text>
    <text x="${x + 24}" y="${Y + 112}" font-family="${NU.serif}" font-size="23" fill="${NU.ink}">${esc(b.ask)}</text>
    <text x="${x + 24}" y="${Y + 180}" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="1.4" fill="${NU.dim}">IN THE HOVER EXAMPLE</text>
    <text x="${x + 24}" y="${Y + 214}" font-family="${NU.sans}" font-size="22" fill="${NU.navy}">${esc(b.eg)}</text>
    <rect x="${x + 16}" y="${Y + 262}" width="${W - 32}" height="${44 + lines.length * 30}" rx="8" fill="#f1eee8"/>
    <text x="${x + 30}" y="${Y + 290}" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.3" fill="${NU.red}">IN ALTAIR</text>
    ${lines.map((l, j) => mono(x + 30, Y + 322 + j * 30, l, 15)).join('')}
    ${i < 3 ? `<path d="M${x + W + 8} ${Y + 220} h${G - 16} m-9 -9 l9 9 l-9 9" fill="none" stroke="${NU.dim}" stroke-width="3"/>` : ''}
  </g>`;
  });
  return `${open()}
  ${head('THE MECHANICS', 'Every interaction is four boxes', 'The grammar of your guide (§5): input → parameter → predicate → visual response')}
  ${boxes.join('\n  ')}
  <text x="80" y="760" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">Today, every interaction we meet gets this strip. Only the input changes: hover, click, legend, brush, slider.</text>
</svg>
`;
}

/* The card, exploded. Each row is the line that made it; four parts light in turn. */
const ROWS = [
  ['Country', 'United Kingdom', "alt.Tooltip('country:N', title='Country')"],
  ['Income', '$38,225', "alt.Tooltip('income:Q', title='Income', format='$,.0f')"],
  ['Life expectancy', '81.4', "alt.Tooltip('health:Q', title='Life expectancy', format='.1f')"],
  ['Population', '64,715,810', "alt.Tooltip('population:Q', title='Population', format=',')"]
];
/* Each description in two short lines: the boxes are 350 wide. */
const PARTS = [
  ['THE FIELD', ['which column', 'fills the value'], 'country:N → United Kingdom'],
  ['THE TITLE', ['what the key says', '(default: the column name)'], "title='Income'"],
  ['THE FORMAT', ['how the value is printed', '(a d3-format string)'], "format='$,.0f' → $38,225"],
  ['THE ORDER', ['the list order is', 'the card order'], 'detail = [ … ]  top to bottom']
];
function anatomy(focus) {
  const cx = 920, cy = 250, kw = 260, vw = 300, rh = 70;
  const lit = i => focus === null || focus === i;
  const card = `<g>
    <rect x="${cx + 8}" y="${cy + 8}" width="${kw + vw + 48}" height="${ROWS.length * rh + 40}" rx="8" fill="rgba(0,0,0,.12)"/>
    <rect x="${cx}" y="${cy}" width="${kw + vw + 48}" height="${ROWS.length * rh + 40}" rx="8" fill="#fff" stroke="#d9d9d9" stroke-width="2"/>
    ${ROWS.map((r, i) => {
      const y = cy + 66 + i * rh;
      return `<text x="${cx + 24 + kw}" y="${y}" text-anchor="end" font-family="${NU.sans}" font-size="34" fill="#808080" opacity="${lit(1) || lit(3) ? 1 : 0.25}">${esc(r[0])}</text>` +
        `<text x="${cx + 48 + kw}" y="${y}" font-family="${NU.sans}" font-size="34" font-weight="600" fill="${NU.ink}" opacity="${lit(0) || lit(2) || lit(3) ? 1 : 0.25}">${esc(r[1])}</text>`;
    }).join('')}
  </g>`;
  const code = `<g>
    ${mono(80, 238, 'detail = [', 20)}
    ${ROWS.map((r, i) => {
      const [a, b] = r[2].split(', title=');
      return mono(80, 268 + i * rh, '  ' + a + ',', 17) + mono(80, 292 + i * rh, '      title=' + b + ',', 17);
    }).join('')}
    ${mono(80, 280 + ROWS.length * rh - 20, ']', 20)}
  </g>`;
  const leaders = ROWS.map((r, i) => `<path d="M${730} ${272 + i * rh} C 820 ${272 + i * rh}, 840 ${cy + 56 + i * rh}, ${cx - 6} ${cy + 56 + i * rh}" fill="none" stroke="${NU.red}" stroke-width="2" stroke-dasharray="6 5" opacity="${focus === null ? 0.5 : 0.85}"/>`).join('');
  const notes = PARTS.map((p, i) => {
    const x = 80 + i * 370, y = 640, on = lit(i);
    return `<g opacity="${on ? 1 : 0.18}">
      <rect x="${x}" y="${y}" width="350" height="180" rx="12" fill="#fff" stroke="${focus === i ? NU.red : NU.rule}" stroke-width="${focus === i ? 3 : 1.5}"/>
      <text x="${x + 22}" y="${y + 40}" font-family="${NU.sans}" font-size="17" font-weight="700" letter-spacing="1.8" fill="${NU.red}">${p[0]}</text>
      ${p[1].map((line, j) => `<text x="${x + 22}" y="${y + 74 + j * 27}" font-family="${NU.serif}" font-size="21" fill="${NU.ink}">${esc(line)}</text>`).join('')}
      ${mono(x + 22, y + 152, p[2], 15, NU.navy)}
    </g>`;
  }).join('');
  return `${open()}
  ${head('TOOLTIP, EXPLODED', 'Every part of the card is a choice in the code')}
  ${code}
  ${leaders}
  ${card}
  ${notes}
</svg>
`;
}

module.exports = { strip, anatomy, STRIP, PARTS };
