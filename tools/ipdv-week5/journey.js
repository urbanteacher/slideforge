'use strict';
/* The route, in two pictures, like Week 4's "From raw data to insight": the
 * course from the code and the picture side by side. One column per week,
 * three rows: what you write (the week's new line of Altair, as the student's
 * guide teaches it), what you see (the chart it makes), what it means.
 *
 *   routeSvg(state, here)   "The route so far": Weeks 1–5, built one week at a time
 *   aheadSvg(state, here)   "Still to come": reading week, Week 7 maps, and the final
 *                            piece, the infographic, every panel tagged with its week
 *
 * `here` is the lecture's own week ('5' or '7'), marked "you are here".
 * Plain SVG (no foreignObject: the Lesson studio cannot draw it). Northeastern
 * navy, red and warm white; the only other colours are the data's. */

const NU = {
  red: '#c8102e', navy: '#0c3354', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const BLUES = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'];

const WEEKS = [
  { n: '1', title: 'Why visualise?', guide: 'Intro guide §4',
    code: ['alt.Chart(world)', '  .mark_circle()'], means: ['A chart shows what', 'a table hides'] },
  { n: '2', title: 'Building charts', guide: 'Building guide §0',
    code: ['.encode(', "  x='date:T',", "  y='hires:Q')"], means: ['Data → mark →', 'encode → chart'] },
  { n: '3', title: 'Encoding', guide: 'Encoding guide §0',
    code: ["color='day:N',", "shape='day:N',", "size='n:Q'"], means: ['Pick the channel', 'that suits the task'] },
  { n: '4', title: 'Colour', guide: 'Colour guide §0',
    code: ["alt.Color('age:Q',", '  scale=alt.Scale(', "    scheme='blues'))"], means: ['Colour is data:', 'lightness orders'] },
  { n: '5', title: 'Interaction', guide: 'Interaction guide §3–19',
    code: ['tooltip=detail,', '.add_params(pick)', "key='country:N'"], means: ['Charts that', 'answer back'] },
  { n: '6', title: 'Reading week', guide: '', gap: true,
    code: ['# no new code:', '# rebuild one chart', '# from each guide'], means: ['Catch up,', 'consolidate'] },
  { n: '7', title: 'Maps', guide: 'Maps guide §2–11',
    code: ['.mark_geoshape()', '.transform_lookup(', "  lookup='id', …)", ".project('equalEarth')"], means: ['Where adds', 'meaning'] },
  { n: '★', title: 'Final piece · infographic', guide: 'Interaction guide §15 · compose', final: true,
    code: ['alt.vconcat(', '  tiles,', '  bars,', '  line | scatter,', '  heat | map)'], means: ['Every week,', 'one page'] }
];

/* ------------------------------------------------------------ the little charts
   Each is drawn in its own 260x190 box and scaled into the column. */
const MW = 260, MH = 190;
function miniBody(n) {
  const g = [];
  const px = v => 16 + v * (MW - 32), py = v => MH - 16 - v * (MH - 32);
  if (n === '1') {
    const pts = [[.08, .18, 9], [.16, .3, 6], [.25, .26, 13], [.33, .45, 8], [.42, .5, 18], [.5, .62, 7], [.58, .66, 11], [.66, .74, 24], [.74, .8, 9], [.82, .86, 12], [.9, .9, 7], [.3, .36, 5], [.6, .58, 5]];
    for (const [a, b, r] of pts) g.push(`<circle cx="${px(a)}" cy="${py(b)}" r="${r * 0.8}" fill="#8796a8" fill-opacity=".75" stroke="#fff" stroke-width="1"/>`);
  } else if (n === '2') {
    const ys = [.2, .25, .32, .45, .6, .7, .78, .74, .6, .45, .3, .22];
    g.push(`<line x1="16" y1="${MH - 16}" x2="${MW - 16}" y2="${MH - 16}" stroke="${NU.dim}"/><line x1="16" y1="16" x2="16" y2="${MH - 16}" stroke="${NU.dim}"/>`);
    g.push(`<path d="${ys.map((v, i) => `${i ? 'L' : 'M'}${px(i / 11)} ${py(v)}`).join('')}" fill="none" stroke="${NU.navy}" stroke-width="2.5"/>`);
    ys.forEach((v, i) => g.push(`<circle cx="${px(i / 11)}" cy="${py(v)}" r="3.5" fill="${NU.navy}"/>`));
  } else if (n === '3') {
    const a = [[.1, .3], [.25, .42], [.4, .5], [.55, .64], [.7, .7], [.85, .82]], b = [[.12, .12], [.3, .2], [.48, .28], [.62, .34], [.78, .44], [.9, .5]];
    a.forEach(([u, v]) => g.push(`<circle cx="${px(u)}" cy="${py(v)}" r="6.5" fill="#0072b2"/>`));
    b.forEach(([u, v]) => g.push(`<rect x="${px(u) - 6}" y="${py(v) - 6}" width="12" height="12" fill="#e69f00"/>`));
  } else if (n === '4') {
    const cw = (MW - 32) / 8, ch = (MH - 32) / 4;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const v = Math.min(5, Math.round((c / 7) * 3 + (r / 3) * 2 + ((c * 7 + r * 3) % 3) * 0.3));
      g.push(`<rect x="${16 + c * cw}" y="${16 + r * ch}" width="${cw - 2}" height="${ch - 2}" fill="${BLUES[v]}"/>`);
    }
  } else if (n === '5') {
    const pts = [[.08, .18, 9], [.2, .3, 7], [.34, .42, 12], [.48, .52, 8], [.62, .62, 15], [.76, .74, 9], [.9, .84, 7]];
    pts.forEach(([a, b, r], i) => g.push(`<circle cx="${px(a)}" cy="${py(b)}" r="${r}" fill="${i === 4 ? NU.red : '#8796a8'}" fill-opacity=".85" stroke="#fff" stroke-width="1"/>`));
    g.push(`<g transform="translate(${px(0.62) - 140} ${py(0.62) - 74})"><rect x="3" y="3" width="124" height="52" rx="4" fill="rgba(0,0,0,.18)"/><rect width="124" height="52" rx="4" fill="#fff" stroke="#d9d9d9"/>` +
      `<text x="56" y="21" text-anchor="end" font-family="${NU.sans}" font-size="12" fill="#808080">Country</text><text x="62" y="21" font-family="${NU.sans}" font-size="12" font-weight="600" fill="${NU.ink}">UK</text>` +
      `<text x="56" y="41" text-anchor="end" font-family="${NU.sans}" font-size="12" fill="#808080">Life exp.</text><text x="62" y="41" font-family="${NU.sans}" font-size="12" font-weight="600" fill="${NU.ink}">81.4</text></g>`);
  } else if (n === '6') {
    ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].forEach((t, i) => {
      g.push(`<rect x="30" y="${20 + i * 31}" width="200" height="23" rx="11.5" fill="none" stroke="${NU.dim}" stroke-dasharray="4 4"/>`);
      g.push(`<text x="48" y="${36 + i * 31}" font-family="${NU.sans}" font-size="13" fill="${NU.dim}">${t}: rebuild one chart</text>`);
    });
  } else if (n === '7') {
    const shapes = ['M30 52 L84 32 L120 60 L110 108 L52 112 Z', 'M124 44 L176 30 L200 74 L158 98 L122 68 Z', 'M116 112 L158 96 L192 118 L178 158 L120 152 Z', 'M44 118 L108 114 L112 158 L60 164 Z'];
    const fills = ['#9ecae1', '#3182bd', '#6baed6', '#c6dbef'];
    shapes.forEach((d, i) => g.push(`<path d="${d}" transform="translate(12 6)" fill="${fills[i]}" stroke="${i === 1 ? NU.red : '#fff'}" stroke-width="${i === 1 ? 3 : 1.5}"/>`));
    g.push(`<g transform="translate(150 120)"><rect x="3" y="3" width="98" height="40" rx="4" fill="rgba(0,0,0,.18)"/><rect width="98" height="40" rx="4" fill="#fff" stroke="#d9d9d9"/>` +
      `<text x="8" y="17" font-family="${NU.sans}" font-size="11" font-weight="600" fill="${NU.ink}">Bromley</text><text x="8" y="32" font-family="${NU.sans}" font-size="11" fill="#808080">65+: 19.6%</text></g>`);
  } else {
    /* The infographic: its panels as they sit on the page, each tagged with the week it came from. */
    const P = (dx, dy, pw, ph, week, body) =>
      `<rect x="${dx}" y="${dy}" width="${pw}" height="${ph}" rx="3" fill="#f4f1ea" stroke="${NU.rule}"/>${body}` +
      `<circle cx="${dx + pw - 9}" cy="${dy + 9}" r="7.5" fill="${week === '5' || week === '7' ? NU.red : NU.navy}"/><text x="${dx + pw - 9}" y="${dy + 13}" text-anchor="middle" font-family="${NU.sans}" font-size="10" font-weight="700" fill="#fff">${week}</text>`;
    g.push(`<text x="12" y="16" font-family="${NU.sans}" font-size="11" font-weight="700" fill="${NU.ink}">Bike-share use: growth, scale and place</text>`);
    [0, 1, 2].forEach(i => g.push(P(10 + i * 82, 24, 76, 26, '1', `<text x="${16 + i * 82}" y="43" font-family="${NU.sans}" font-size="12" font-weight="700" fill="${NU.ink}">${['+59%', '800', '40k'][i]}</text>`)));
    g.push(P(10, 56, 240, 40, '3', [46, 36, 26, 20, 16].map((v, i) => `<rect x="16" y="${62 + i * 6.6}" width="${v * 3.8}" height="5" fill="${NU.navy}"/>`).join('')));
    g.push(P(10, 102, 116, 42, '2', `<path d="M18 136 L42 130" stroke="${NU.navy}" stroke-width="2" fill="none"/><path d="M72 122 L104 112" stroke="${NU.navy}" stroke-width="2" fill="none"/><rect x="48" y="106" width="18" height="34" fill="#e2e0db"/>`));
    g.push(P(134, 102, 116, 42, '5', [[.15, .2], [.3, .35], [.5, .3], [.62, .75], [.8, .55], [.9, .4]].map(([a, b]) => `<circle cx="${142 + a * 96}" cy="${138 - b * 28}" r="3.2" fill="${NU.navy}"/>`).join('')));
    g.push(P(10, 150, 116, 36, '4', Array.from({ length: 12 }, (_, i) => `<rect x="${16 + (i % 4) * 24}" y="${156 + Math.floor(i / 4) * 9}" width="22" height="7" fill="${BLUES[(i * 7) % 6]}"/>`).join('')));
    g.push(P(134, 150, 116, 36, '7', Array.from({ length: 6 }, (_, i) => `<rect x="${142 + (i % 3) * 30}" y="${156 + Math.floor(i / 3) * 13}" width="28" height="11" fill="${BLUES[[2, 5, 1, 3, 4, 2][i]]}"/>`).join('')));
  }
  return g.join('');
}
function mini(n, x, y, W, H) {
  const k = Math.min(W / MW, H / MH), dx = x + (W - MW * k) / 2, dy = y + (H - MH * k) / 2;
  return `<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${k.toFixed(3)})">${miniBody(n)}</g>`;
}

/* ------------------------------------------------------------ one column */
function column(w, x, W, rows, look, here, last, sizes) {
  const now = w.n === here, next = here === '5' && w.n === '7';
  const hot = now || w.final;
  const o = look === 'dim' ? 0.14 : 1;
  const dashed = w.gap ? ' stroke-dasharray="7 6"' : '';
  const edge = hot ? NU.red : NU.rule, ew = hot ? 2.5 : 1.5;
  const parts = [], { title: ts, code: cs, means: mz } = sizes;
  const badge = w.gap ? NU.dim : hot ? NU.red : NU.navy;
  parts.push(`<rect x="${x}" y="${rows.top - 62}" width="44" height="44" rx="22" fill="${w.gap ? 'none' : badge}" stroke="${badge}" stroke-width="2"/><text x="${x + 22}" y="${rows.top - 32}" text-anchor="middle" font-family="${NU.sans}" font-size="21" font-weight="700" fill="${w.gap ? NU.dim : '#fff'}">${esc(w.n)}</text>`);
  parts.push(`<text x="${x + 56}" y="${rows.top - 34}" font-family="${NU.serif}" font-size="${ts}" fill="${NU.ink}">${esc(w.title)}</text>`);
  const tag = now ? 'YOU ARE HERE' : next ? 'COMING UP' : w.final ? 'WHERE IT ENDS' : '';
  if (tag) parts.push(`<text x="${x + 56}" y="${rows.top - 12}" font-family="${NU.sans}" font-size="12" font-weight="700" letter-spacing="1.5" fill="${hot ? NU.red : NU.dim}">${tag}</text>`);
  const [cy, chh] = rows.code;
  parts.push(`<rect x="${x}" y="${cy}" width="${W}" height="${chh}" rx="10" fill="${w.gap ? 'none' : '#f1eee8'}" stroke="${edge}" stroke-width="${ew}"${dashed}/>`);
  w.code.forEach((line, j) => parts.push(`<text x="${x + 16}" y="${cy + 36 + j * cs * 1.55}" font-family="${NU.mono}" font-size="${cs}" fill="${w.gap ? NU.dim : NU.ink}" style="white-space:pre">${esc(line).replace(/ /g, ' ')}</text>`));
  if (w.guide) parts.push(`<text x="${x + 16}" y="${cy + chh - 14}" font-family="${NU.sans}" font-size="12" font-weight="700" letter-spacing="1.2" fill="${NU.red}">${esc(w.guide.toUpperCase())}</text>`);
  const [sy, sh] = rows.see;
  parts.push(`<rect x="${x}" y="${sy}" width="${W}" height="${sh}" rx="10" fill="${w.gap ? 'none' : '#fff'}" stroke="${edge}" stroke-width="${ew}"${dashed}/>`);
  parts.push(mini(w.n, x + 8, sy + 8, W - 16, sh - 16));
  const [my] = rows.means;
  w.means.forEach((line, j) => parts.push(`<text x="${x + W / 2}" y="${my + 30 + j * mz * 1.3}" text-anchor="middle" font-family="${NU.serif}" font-size="${mz}" fill="${hot ? NU.red : w.gap ? NU.dim : NU.navy}">${esc(line)}</text>`));
  if (!last) parts.push(`<path d="M${x + W + 3} ${sy + sh / 2} h12 m-6 -6 l6 6 l-6 6" fill="none" stroke="${NU.dim}" stroke-width="2"/>`);
  return `<g opacity="${o}">${parts.join('')}</g>`;
}

function page(eyebrow, title, foot, cols, rows, sizes, looks, here) {
  const X0 = 80, lanes = [['WHAT YOU WRITE', rows.code], ['WHAT YOU SEE', rows.see], ['WHAT IT MEANS', rows.means]];
  let x = X0;
  const body = cols.map((c, i) => { const out = column(c.w, x, c.width, rows, looks[i], here, i === cols.length - 1, sizes); x += c.width + 22; return out; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="${X0}" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">${esc(eyebrow)}</text>
  <text x="${X0}" y="114" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">${esc(title)}</text>
  ${lanes.map(([t, [y]]) => `<text x="${X0 - 20}" y="${y + 6}" text-anchor="end" font-family="${NU.sans}" font-size="11" font-weight="700" letter-spacing="1.4" fill="${NU.dim}" transform="rotate(-90 ${X0 - 20} ${y + 6})">${t}</text>`).join('')}
  ${body.join('\n  ')}
  <text x="${X0}" y="${rows.means[0] + rows.means[1] + 48}" font-family="${NU.sans}" font-size="19" fill="${NU.dim}">${esc(foot)}</text>
</svg>
`;
}

/* ------------------------------------------------------------ the two pictures */

/** Weeks 1–5. `state`: the week lit (0–4), or null for all. */
function routeSvg(state, here = '5') {
  const cols = WEEKS.slice(0, 5).map(w => ({ w, width: 270 }));
  const rows = { top: 218, code: [218, 150], see: [384, 214], means: [614, 96] };
  const looks = cols.map((_, i) => (state === null || state === i ? 'lit' : 'dim'));
  const foot = here === '5' ? 'Each week adds one line to the same chart. This week it learns to answer back.'
    : 'Five weeks behind you: every one of them is a panel the final piece will use.';
  return page('THE ROUTE SO FAR', 'One chart at a time', foot, cols, rows, { title: 24, code: 17, means: 23 }, looks, here);
}

/** Reading week, Week 7 and the final piece. `state`: the column lit (0–2), or null for all. */
function aheadSvg(state, here = '5') {
  const cols = [{ w: WEEKS[5], width: 300 }, { w: WEEKS[6], width: 420 }, { w: WEEKS[7], width: 620 }];
  const rows = { top: 218, code: [218, 208], see: [442, 248], means: [706, 76] };
  const looks = cols.map((_, i) => (state === null || state === i ? 'lit' : 'dim'));
  const foot = here === '5' ? 'Then one page: every week becomes one panel of an infographic. The badges say which week taught each panel.'
    : 'Today: maps. Then one page, where every week becomes one panel of an infographic.';
  return page(here === '5' ? 'STILL TO COME' : 'WHERE WE ARE GOING', 'Then one page', foot, cols, rows, { title: 26, code: 19, means: 25 }, looks, here);
}

module.exports = { routeSvg, aheadSvg, WEEKS };
