'use strict';
/* "Build the page": the final infographic, one week at a time. One slide per
 * week: the Altair that week adds (left), the panel it makes (right), and
 * where that panel sits on the page (below it), the page filling up as the
 * weeks go by. The last slide composes them.
 *
 * The code and the pictures both come from tools/ipdv-week5/page/steps.py,
 * which runs every step in Altair and renders its panel; this file only lays
 * them out. Rerun steps.py after changing any step.
 *
 *   pageSvg(i, here)   step i (0–6) of STEPS, in the lecture whose own week is `here`
 *
 * Plain SVG with the panels embedded as data URIs (a picture drawn through
 * <img> cannot fetch another file). Northeastern navy, red and warm white;
 * the only other colours are the data's. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const { setup, steps: STEPS, map: MAP_STEPS } = JSON.parse(fs.readFileSync(path.join(__dirname, 'page/steps.json'), 'utf8'));
const DIR = 'assets/lesson/ipdv/week5';

const NU = {
  red: '#c8102e', navy: '#0c3354', deep: '#0a2a45', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pre = s => esc(s).replace(/ /g, '&#160;');

function png(id) {
  const file = path.join(root, DIR, /\.png$/.test(id) ? id : `page-${id}.png`);
  const b = fs.readFileSync(file);
  return { uri: `data:image/png;base64,${b.toString('base64')}`, w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
/* A picture fitted into a box, centred. */
function fit(id, x, y, W, H) {
  const p = png(id), k = Math.min(W / p.w, H / p.h), w = p.w * k, h = p.h * k;
  return `<image href="${p.uri}" x="${(x + (W - w) / 2).toFixed(1)}" y="${(y + (H - h) / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
}

/* The code panel: comments dimmed, and every line that uses this week's new
   pieces marked with a red bar. */
function codePanel(step, x, y, W, H) {
  const lines = step.code.split('\n');
  const longest = Math.max(...lines.map(l => l.length));
  /* A monospace character is about 0.6 em wide: the longest line sets the size. */
  const lh = Math.min(30, (H - 56) / lines.length), fs_ = Math.min(19, lh * 0.66, (W - 56) / (longest * 0.6));
  const isNew = l => step.new.some(t => l.includes(t.replace(/\(.*$/, '').replace(/^\./, '')));
  const out = [`<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${NU.deep}"/>`];
  lines.forEach((l, k) => {
    const ty = y + 38 + k * lh, comment = l.trim().startsWith('#');
    if (!comment && l.trim() && isNew(l)) out.push(`<rect x="${x}" y="${(ty - lh * 0.68).toFixed(1)}" width="6" height="${(lh * 0.9).toFixed(1)}" fill="${NU.red}"/>`);
    out.push(`<text x="${x + 28}" y="${ty.toFixed(1)}" font-family="${NU.mono}" font-size="${fs_.toFixed(1)}" fill="${comment ? '#8fa6bd' : '#ffffff'}">${pre(l)}</text>`);
  });
  return out.join('\n  ');
}

/* The page as a wireframe, at the infographic's own proportions: done slots
   navy, this week's red, the rest still dashed. */
const ROWS = [
  [['A', 'title', 1]], [['B', 'tiles', 1]], [['C', 'bars', 1]],
  [['D', 'line', .5], ['E', 'scatter', .5]], [['F', 'heat', .5], ['G', 'map', .5]], [['H', 'source', 1]]
];
const ROW_H = { A: 40, B: 104, C: 260, D: 300, F: 290, H: 22 };
const SLOT_WEEK = { A: '★', B: '1', C: '3', D: '2', E: '5', F: '4', G: '7', H: '★' };
function locator(i, x, y, H) {
  const gap = 24, total = Object.values(ROW_H).reduce((a, b) => a + b, 0) + gap * (ROWS.length - 1);
  const k = H / total, W = 1120 * k, out = [];
  const done = new Set(STEPS.slice(0, i).map(s => s.slot)), now = STEPS[i].slot;
  let cy = y;
  for (const row of ROWS) {
    const h = ROW_H[row[0][0]] * k;
    let cx = x;
    for (const [slot, name, share] of row) {
      const w = share === 1 ? W : (W - gap * k) / 2;
      const state = slot === now ? 'now' : done.has(slot) ? 'done' : 'later';
      const fill = state === 'now' ? 'rgba(200,16,46,.14)' : state === 'done' ? '#c9d3dd' : 'none';
      const stroke = state === 'now' ? NU.red : state === 'done' ? '#9fb0c1' : NU.dim;
      out.push(`<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${state === 'now' ? 3 : 1.2}"${state === 'later' ? ' stroke-dasharray="4 3"' : ''}/>`);
      if (h > 14) out.push(`<text x="${(cx + 6).toFixed(1)}" y="${(cy + Math.min(h - 4, 15)).toFixed(1)}" font-family="${NU.sans}" font-size="11" font-weight="700" fill="${state === 'now' ? NU.red : NU.dim}">${esc(name)} · ${SLOT_WEEK[slot] === '★' ? 'page' : 'W' + SLOT_WEEK[slot]}</text>`);
      cx += w + gap * k;
    }
    cy += h + gap * k;
  }
  return { svg: out.join('\n  '), w: W };
}

function pageSvg(i, here = '5') {
  const step = STEPS[i], final = step.week === '★';
  const later = !final && Number(step.week) > Number(here);
  const tag = final ? 'WHERE IT ENDS' : step.week === here ? 'YOU ARE HERE' : later ? `COMING IN WEEK ${step.week}` : '';
  const eyebrow = final ? 'BUILD THE PAGE · COMPOSE' : `BUILD THE PAGE · WEEK ${step.week}`;
  const parts = [];
  if (final) {
    parts.push(codePanel(step, 80, 150, 780, 690));
    parts.push(`<rect x="890" y="150" width="630" height="690" fill="#fff" stroke="${NU.rule}"/>`, fit(step.id, 900, 160, 610, 670));
  } else {
    parts.push(codePanel(step, 80, 150, 820, 690));
    parts.push(`<text x="940" y="168" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">WHAT IT MAKES</text>`);
    parts.push(`<rect x="940" y="182" width="580" height="380" fill="#fff" stroke="${NU.rule}"/>`, fit(step.id, 956, 198, 548, 348));
    const L = locator(i, 940, 616, 224);
    parts.push(`<text x="940" y="604" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">WHERE IT GOES</text>`, L.svg);
    const lx = 940 + L.w + 28;
    parts.push(`<text x="${lx}" y="640" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.red}">NEW THIS WEEK</text>`);
    step.new.forEach((t, k) => parts.push(`<text x="${lx}" y="${674 + k * 34}" font-family="${NU.mono}" font-size="19" fill="${NU.ink}">${pre(t)}</text>`));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">${esc(eyebrow)}${tag ? `<tspan fill="${final || step.week === here ? NU.red : NU.dim}"> · ${tag}</tspan>` : ''}</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">${esc(step.title)}</text>
  ${parts.join('\n  ')}
  <text x="80" y="872" font-family="${NU.sans}" font-size="16" fill="${NU.dim}">${final ? 'The whole file: infographic-by-week.py. Synthetic teaching data, fictional districts: not London.' : 'Runs on the workbook’s synthetic city. Every block of code: infographic-by-week.py'}</text>
</svg>
`;
}

/* ------------------------------------------------------------ a map of London, one move at a time

   Before the maps lecture: a map of London on made-up numbers, in the same layout: its code, its picture, and
   below them the four moves, each tagged with the part of today's lecture
   that asks why it matters. Then a bridge slide hands over to those parts. */
const PARTS = {
  Place: ['Part 1 · Place', 'Does geography add meaning?'],
  Flatten: ['Part 2 · Flatten', 'What does the map lie about?'],
  Fill: ['Part 3 · Fill', 'How do I colour a map honestly?'],
  lab: ['The lab', 'Maps guide §3–4: boroughs by GSS code']
};
function moves(i, x, y) {
  const out = [`<text x="${x}" y="${y}" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">FOUR MOVES, EVERY MAP</text>`];
  MAP_STEPS.forEach((m, k) => {
    const ty = y + 44 + k * 52, now = k === i, done = k < i;
    const col = now ? NU.red : done ? NU.navy : NU.dim;
    out.push(`<circle cx="${x + 16}" cy="${ty - 7}" r="15" fill="${now || done ? col : 'none'}" stroke="${col}" stroke-width="2"/>`,
      `<text x="${x + 16}" y="${ty - 1}" text-anchor="middle" font-family="${NU.sans}" font-size="15" font-weight="700" fill="${now || done ? '#fff' : col}">${m.move}</text>`,
      `<text x="${x + 44}" y="${ty}" font-family="${NU.serif}" font-size="22" fill="${now ? NU.ink : NU.dim}">${esc(m.title.split(/[:,]/)[0])}</text>`,
      `<text x="${x + 200}" y="${ty}" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.2" fill="${now ? NU.red : NU.dim}">${esc(PARTS[m.part][0].toUpperCase())}</text>`);
  });
  return out.join('\n  ');
}

/** Move i (0–3) of MAP_STEPS. */
function mapSvg(i) {
  const step = MAP_STEPS[i];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">MAKE A MAP OF LONDON · MOVE ${step.move} OF ${MAP_STEPS.length}</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">${esc(step.title)}</text>
  ${codePanel(step, 80, 150, 820, 690)}
  <text x="940" y="168" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">WHAT IT MAKES</text>
  <rect x="940" y="182" width="580" height="380" fill="#fff" stroke="${NU.rule}"/>
  ${fit(step.id, 956, 198, 548, 348)}
  ${moves(i, 940, 610)}
  <text x="80" y="872" font-family="${NU.sans}" font-size="16" fill="${NU.dim}">Made-up numbers on London’s 33 boroughs. The code: infographic-by-week.py, with london-boroughs.geojson beside it</text>
</svg>
`;
}

/** The hand-over: each move, and the part of today that asks why it matters. */
function bridgeSvg() {
  const order = ['Place', 'Flatten', 'Fill', 'lab'];
  const W = 335, gap = 26, x0 = 80;
  const cards = order.map((part, k) => {
    const m = MAP_STEPS.find(s => s.part === part), x = x0 + k * (W + gap), lab = part === 'lab';
    const [label, question] = PARTS[part];
    const words = question.split(' '), lines = [''];
    for (const w of words) { if ((lines[lines.length - 1] + ' ' + w).trim().length > 22) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim(); }
    return [
      `<rect x="${x}" y="190" width="${W}" height="230" fill="#fff" stroke="${NU.rule}"/>`,
      fit(m.id, x + 12, 202, W - 24, 206),
      `<circle cx="${x + 22}" cy="458" r="15" fill="${NU.navy}"/><text x="${x + 22}" y="464" text-anchor="middle" font-family="${NU.sans}" font-size="15" font-weight="700" fill="#fff">${m.move}</text>`,
      `<text x="${x + 48}" y="465" font-family="${NU.serif}" font-size="24" fill="${NU.ink}">${esc(m.title.split(/[:,]/)[0])}</text>`,
      `<text x="${x}" y="510" font-family="${NU.mono}" font-size="16" fill="${NU.dim}">${pre(m.new[0])}</text>`,
      `<path d="M${x + W / 2} 536 v34 m-9 -10 l9 10 l9 -10" fill="none" stroke="${lab ? NU.dim : NU.red}" stroke-width="2.5"/>`,
      `<rect x="${x}" y="590" width="${W}" height="200" fill="${lab ? 'none' : NU.navy}" stroke="${lab ? NU.dim : NU.navy}" stroke-width="1.5"${lab ? ' stroke-dasharray="7 6"' : ''}/>`,
      `<text x="${x + 24}" y="632" font-family="${NU.sans}" font-size="14" font-weight="700" letter-spacing="1.8" fill="${lab ? NU.dim : '#ff9aa9'}">${esc(label.toUpperCase())}</text>`,
      ...lines.map((l, j) => `<text x="${x + 24}" y="${680 + j * 36}" font-family="${NU.serif}" font-size="29" fill="${lab ? NU.ink : '#fff'}">${esc(l)}</text>`)
    ].join('\n  ');
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">FROM THE CODE TO TODAY</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">Four moves, and why each one matters</text>
  ${cards.join('\n  ')}
  <text x="80" y="850" font-family="${NU.sans}" font-size="19" fill="${NU.dim}">You can write every move already. Today is about choosing them well.</text>
</svg>
`;
}

/* ------------------------------------------------------------ cut and glue

   Before any code: how Altair makes a page, for a room that is new to code
   and a little nervous about it. Three moves in plain words: each chart is
   its own piece of paper; | glues two pieces side by side; & glues them one
   under the other. The pictures are the real panels the next slides build. */
function card(id, x, y, W, H, cut) {
  return `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="#fff" stroke="${cut ? NU.red : NU.rule}" stroke-width="${cut ? 2 : 1.2}"${cut ? ' stroke-dasharray="9 6"' : ''}/>` +
    fit(id, x + 6, y + 6, W - 12, H - 12);
}
function cutSvg() {
  const W = 455, gap = 37, x0 = 80, cols = [0, 1, 2].map(k => x0 + k * (W + gap));
  const head = (k, title, plain, code, note) => {
    const x = cols[k];
    return [
      `<circle cx="${x + 20}" cy="186" r="20" fill="${NU.red}"/><text x="${x + 20}" y="194" text-anchor="middle" font-family="${NU.sans}" font-size="21" font-weight="700" fill="#fff">${k + 1}</text>`,
      `<text x="${x + 54}" y="196" font-family="${NU.serif}" font-size="31" fill="${NU.ink}">${esc(title)}</text>`,
      ...plain.map((l, j) => `<text x="${x}" y="${246 + j * 28}" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${esc(l)}</text>`),
      `<rect x="${x}" y="314" width="${W}" height="${note ? 74 : 52}" fill="${NU.deep}"/>`,
      `<text x="${x + 18}" y="347" font-family="${NU.mono}" font-size="21" fill="#fff">${pre(code)}</text>`,
      note ? `<text x="${x + 18}" y="375" font-family="${NU.mono}" font-size="15" fill="#8fa6bd">${pre(note)}</text>` : ''
    ].join('\n  ');
  };
  const py = 420, ph = 330;
  const parts = [
    head(0, 'Make each piece', ['Every chart is its own piece of paper.', 'Give it a name, so you can pick it up.'], 'bars = alt.Chart(...)', ''),
    card('w3', cols[0] + 20, py + 70, W - 40, 190, true),
    `<text x="${cols[0] + W / 2}" y="${py + 300}" text-anchor="middle" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="1.6" fill="${NU.red}">ONE PIECE, CALLED bars</text>`,

    head(1, 'Glue side by side', ['A | between two names means', '“put these next to each other”.'], 'line | scatter', '# the same as alt.hconcat(line, scatter)'),
    card('w2', cols[1], py + 90, W / 2 - 6, 150), card('w5', cols[1] + W / 2 + 6, py + 90, W / 2 - 6, 150),
    `<text x="${cols[1] + W / 2}" y="${py + 300}" text-anchor="middle" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">ONE ROW: line, THEN scatter</text>`,

    head(2, 'Glue underneath', ['An & means “put this under that”.', 'Rows go top to bottom, in your order.'], 'tiles & bars & (line | scatter)', '# the same as alt.vconcat(tiles, bars, ...)'),
    card('w1', cols[2] + 40, py, W - 80, 52), card('w3', cols[2] + 40, py + 62, W - 80, 104),
    card('w2', cols[2] + 40, py + 176, (W - 80) / 2 - 4, 104), card('w5', cols[2] + 40 + (W - 80) / 2 + 4, py + 176, (W - 80) / 2 - 4, 104),
    `<text x="${cols[2] + W / 2}" y="${py + 300}" text-anchor="middle" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">THREE ROWS: THE START OF A PAGE</text>`,

    `<path d="M${cols[0] + W + 6} ${py + 165} h24 m-9 -9 l9 9 l-9 9" fill="none" stroke="${NU.dim}" stroke-width="2.5"/>`,
    `<path d="M${cols[1] + W + 6} ${py + 165} h24 m-9 -9 l9 9 l-9 9" fill="none" stroke="${NU.dim}" stroke-width="2.5"/>`
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">BUILD THE PAGE · BEFORE ANY CODE</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">Cut and glue: how Altair makes a page</text>
  ${parts.join('\n  ')}
  <rect x="80" y="782" width="1440" height="72" fill="#f1eee8"/>
  <text x="104" y="814" font-family="${NU.serif}" font-size="23" fill="${NU.ink}">You never place anything by hand. You only say “next to” or “underneath”.</text>
  <text x="104" y="842" font-family="${NU.sans}" font-size="18" fill="${NU.dim}">Wrong order? Swap two names and run it again. Nothing breaks, and nothing is lost.</text>
</svg>
`;
}

/* ------------------------------------------------------------ build it, with the picture

   The maps lecture's world "Build it" slides, for a room new to code: the
   code, under it what each part does in plain words, and beside it the
   picture the code makes (two, when one word changes). Pictures from
   page/world.py. */
const BUILDS = {
  world: {
    title: 'Build it: one line makes a world',
    code: "from vega_datasets import data\n\ncountries = alt.topo_feature(data.world_110m.url, 'countries')\n\nalt.Chart(countries).mark_geoshape(\n    fill='lightgrey', stroke='white'\n).project(type='equalEarth')",
    new: ['topo_feature', 'mark_geoshape', '.project'],
    plain: [['countries =', 'fetches the outline of every country, a ready-made file'], ['mark_geoshape', 'draws each outline as one grey shape'], ['.project(...)', 'flattens the round world onto the flat page']],
    pictures: [['build-world.png', 'WHAT IT MAKES: EVERY COUNTRY, NO DATA YET']]
  },
  projection: {
    title: 'Build it: change one word',
    code: "base = alt.Chart(countries).mark_geoshape(stroke='white')\n\nbase.project(type='mercator')     # shapes kept, areas wrong\nbase.project(type='equalEarth')   # areas kept: use for data",
    new: ["type='mercator'", "type='equalEarth'"],
    plain: [['base =', 'the same map as before, kept under one name'], ["type='mercator'", 'shapes look right; sizes grow towards the poles'], ["type='equalEarth'", 'sizes are true; use this for data']],
    pictures: [['build-mercator.png', "BEFORE: type='mercator'"], ['build-equalearth.png', "AFTER: type='equalEarth'"]]
  },
  choropleth: {
    title: 'Build it: a choropleth that answers back',
    code: "world = data.gapminder_health_income()  # + an iso_n code per country\n\nalt.Chart(countries).mark_geoshape(stroke='white').transform_lookup(\n    lookup='id',\n    from_=alt.LookupData(world, 'iso_n', ['country', 'health', 'income'])\n).encode(\n    color=alt.Color('health:Q', scale=alt.Scale(scheme='blues')),\n    tooltip=[alt.Tooltip('country:N', title='Country'),\n             alt.Tooltip('health:Q', title='Life expectancy', format='.1f')]\n).project(type='equalEarth')",
    new: ['transform_lookup', 'LookupData', 'color=', 'tooltip='],
    plain: [['world =', 'the numbers: life expectancy for each country'], ['transform_lookup', 'matches each shape to its row by a country code'], ['color=', 'fills each country by its number: darker is longer lives'], ['tooltip=', 'hover a country to read its name and number']],
    pictures: [['build-choropleth.png', 'WHAT IT MAKES · GAPS = COUNTRIES WITH NO ROW']]
  }
};
function buildSvg(key) {
  const b = BUILDS[key], parts = [];
  const lines = b.code.split('\n').length;
  const ch = Math.min(380, 70 + lines * 32);
  parts.push(codePanel({ code: b.code, new: b.new }, 80, 150, 760, ch));
  const py = 150 + ch + 34;
  parts.push(`<text x="80" y="${py}" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">IN PLAIN WORDS</text>`);
  b.plain.forEach(([k, v], i) => {
    const y = py + 40 + i * 44;
    parts.push(`<text x="80" y="${y}" font-family="${NU.mono}" font-size="19" fill="${NU.red}">${pre(k)}</text>`,
      `<text x="330" y="${y}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">${esc(v)}</text>`);
  });
  if (b.pictures.length === 1) {
    const [f, label] = b.pictures[0];
    parts.push(`<text x="880" y="168" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${NU.dim}">${esc(label)}</text>`,
      `<rect x="880" y="182" width="640" height="420" fill="#fff" stroke="${NU.rule}"/>`, fit(f, 892, 194, 616, 396));
  } else {
    b.pictures.forEach(([f, label], i) => {
      const y = 150 + i * 350;
      parts.push(`<text x="880" y="${y + 18}" font-family="${NU.sans}" font-size="13" font-weight="700" letter-spacing="1.6" fill="${i ? NU.red : NU.dim}">${esc(label)}</text>`,
        `<rect x="880" y="${y + 32}" width="640" height="300" fill="#fff" stroke="${i ? NU.red : NU.rule}" stroke-width="${i ? 2 : 1.2}"/>`, fit(f, 890, y + 42, 620, 280));
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="80" y="70" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="2.6" fill="${NU.red}">BUILD IT · THE CODE AND WHAT IT MAKES</text>
  <text x="80" y="118" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">${esc(b.title.replace(/^Build it: (.)/, (_, c) => c.toUpperCase()))}</text>
  ${parts.join('\n  ')}
</svg>
`;
}

module.exports = { pageSvg, mapSvg, bridgeSvg, cutSvg, buildSvg, BUILDS, STEPS, MAP_STEPS, SETUP: setup };
