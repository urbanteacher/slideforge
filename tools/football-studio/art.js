'use strict';

/* Studio 90's posters: one print-studio language for every picture in the
 * deck. Ink-black ground, warm paper, three riso inks (acid, coral, cobalt),
 * halftone dots, film grain, pitch line-work and one heavy condensed face
 * (Impact, on every Windows and Mac classroom machine) for headlines.
 * Each function returns a 1920×1080 SVG string. Plain SVG with system fonts,
 * so the files open as pictures anywhere and the Lesson studio can show them. */

const W = 1920, H = 1080;
const INK = '#0e0f12', PAPER = '#f1ede4', ACID = '#d7ff3a', CORAL = '#ff4d3d', COBALT = '#3a5bff', MUTE = '#8b8f99', PANEL = '#191b21';
const DISPLAY = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const SANS = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'SF Mono', Menlo, Consolas, monospace";
const STUDIO = { capture: ACID, engineer: COBALT, model: CORAL, design: ACID, care: CORAL };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* The shared defs: grain, halftone dots in each ink, a soft vignette. */
function defs() {
  const dots = (id, colour, r, gap) =>
    `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${colour}"/></pattern>`;
  return `<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/></filter>
${dots('dotAcid', ACID, 3.2, 14)}${dots('dotCoral', CORAL, 3.2, 14)}${dots('dotCobalt', COBALT, 3.2, 14)}${dots('dotPaper', PAPER, 1.6, 12)}${dots('dotInk', INK, 3, 13)}
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></radialGradient>
</defs>`;
}

function svg(body, ground = INK) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs()}
<rect width="${W}" height="${H}" fill="${ground}"/>
${body}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>
`;
}

const text = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.font || SANS}" font-size="${o.size || 28}" font-weight="${o.weight || 600}" fill="${o.fill || PAPER}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ''}${o.opacity ? ` opacity="${o.opacity}"` : ''}>${esc(s)}</text>`;
const lines = (x, y, rows, o = {}) => rows.map((r, i) => text(x, y + i * (o.lead || (o.size || 28) * 1.3), r, o)).join('');
const head = (x, y, rows, o = {}) => lines(x, y, rows.map(r => r.toUpperCase()), { font: DISPLAY, weight: 400, size: 150, lead: (o.size || 150) * 0.92, ...o });

/* The studio's frame: crop marks, a job-sheet strip along the top and a
   small corner tag for the source, as on a print proof. */
function frame(sheet, tag, ink = PAPER) {
  const m = 44, l = 26;
  const crop = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]
    .map(([x, y, dx, dy]) => `<path d="M${x} ${y + dy * l}V${y}H${x + dx * l}" stroke="${ink}" stroke-width="2" fill="none" opacity="0.5"/>`).join('');
  return crop +
    text(96, 82, sheet.toUpperCase(), { font: MONO, size: 18, weight: 500, fill: ink, ls: 3, opacity: 0.7 }) +
    text(W - 96, 82, 'STUDIO 90 · AI × FOOTBALL', { font: MONO, size: 18, weight: 500, fill: ink, ls: 3, anchor: 'end', opacity: 0.7 }) +
    (tag ? `<rect x="${W - 96 - tag.length * 11.2 - 28}" y="${H - 118}" width="${tag.length * 11.2 + 28}" height="38" fill="${CORAL}"/>` +
      text(W - 110, H - 92, tag, { font: MONO, size: 17, weight: 600, fill: INK, anchor: 'end' }) : '');
}

/* A pitch in line-work, drawn in perspective-free plan at any size. */
function pitch(x, y, w, h, stroke = PAPER, op = 0.5) {
  const s = `stroke="${stroke}" stroke-width="3" fill="none" opacity="${op}"`;
  const bw = w * 0.16, bh = h * 0.44, gw = w * 0.055, gh = h * 0.2;
  return `<g ${s}><rect x="${x}" y="${y}" width="${w}" height="${h}"/><path d="M${x + w / 2} ${y}V${y + h}"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${h * 0.13}"/>` +
    `<rect x="${x}" y="${y + (h - bh) / 2}" width="${bw}" height="${bh}"/><rect x="${x + w - bw}" y="${y + (h - bh) / 2}" width="${bw}" height="${bh}"/>` +
    `<rect x="${x}" y="${y + (h - gh) / 2}" width="${gw}" height="${gh}"/><rect x="${x + w - gw}" y="${y + (h - gh) / 2}" width="${gw}" height="${gh}"/></g>`;
}

/* A sticker: a tilted label in one ink. */
function sticker(x, y, label, fill = ACID, rotate = -4, size = 30) {
  const w = label.length * size * 0.62 + 48;
  return `<g transform="rotate(${rotate} ${x} ${y})"><rect x="${x}" y="${y - size - 14}" width="${w}" height="${size + 32}" fill="${fill}"/>` +
    text(x + 24, y, label.toUpperCase(), { font: SANS, size, weight: 800, fill: INK, ls: 1 }) + '</g>';
}

/* ---------------------------------------------------------------- posters */

function cover() {
  return svg(
    `<rect x="1080" y="0" width="840" height="1080" fill="url(#dotAcid)" opacity="0.32"/>` +
    pitch(1130, 250, 700, 460, ACID, 0.75) +
    `<circle cx="1480" cy="480" r="190" fill="none" stroke="${CORAL}" stroke-width="6"/><circle cx="1480" cy="480" r="120" fill="none" stroke="${CORAL}" stroke-width="3" stroke-dasharray="6 10"/>` +
    `<circle cx="1480" cy="480" r="16" fill="${PAPER}"/>` +
    text(1490, 276, '500 Hz', { font: MONO, size: 22, fill: CORAL }) +
    head(110, 360, ['Studio', '90'], { size: 300, lead: 270 }) +
    `<rect x="116" y="660" width="760" height="10" fill="${CORAL}"/>` +
    lines(116, 740, ['Designing the modern game:', 'AI, football and the jobs nobody had in 2015'], { size: 44, weight: 600, lead: 58 }) +
    sticker(1130, 850, 'Open studio · 60 min', ACID, -5, 34) +
    frame('Sheet 00 · cover', null));
}

/* A section cover: a giant numeral, the part's name and a motif. */
function section(n, title, line, motif, ink = ACID) {
  return svg(
    `<text x="1880" y="1010" font-family="${DISPLAY}" font-size="980" fill="url(#dot${ink === ACID ? 'Acid' : ink === CORAL ? 'Coral' : 'Cobalt'})" text-anchor="end" opacity="0.9">${String(n).padStart(2, '0')}</text>` +
    motif +
    head(110, 520, title, { size: 180, lead: 168 }) +
    `<rect x="116" y="${520 + (title.length - 1) * 168 + 44}" width="420" height="10" fill="${ink}"/>` +
    lines(116, 520 + (title.length - 1) * 168 + 124, line, { size: 38, weight: 500, lead: 52, fill: PAPER }) +
    frame(`Part ${String(n).padStart(2, '0')}`, null));
}

const MOTIF = {
  remade: pitch(1000, 330, 760, 480, PAPER, 0.25),
  hood: [0, 1, 2, 3, 4].map(i => `<rect x="${1040 + i * 150}" y="${300 + i * 60}" width="120" height="120" fill="none" stroke="${PAPER}" stroke-width="3" opacity="0.35"/>`).join(''),
  atlas: Array.from({ length: 30 }, (_, i) => `<circle cx="${1050 + (i % 6) * 130}" cy="${300 + Math.floor(i / 6) * 120}" r="${i % 4 === 0 ? 14 : 6}" fill="${PAPER}" opacity="0.18"/>`).join(''),
  crit: `<text x="1300" y="720" font-family="Georgia, serif" font-size="700" fill="${PAPER}" opacity="0.14">“</text>`,
  brief: `<rect x="1180" y="240" width="520" height="680" fill="none" stroke="${PAPER}" stroke-width="4" stroke-dasharray="14 12" opacity="0.4"/>`
};

/* A full-bleed "moment": a headline, a big graphic, one number. */
function moment({ sheet, kicker, title, figure, number, unit, tag, ink = ACID }) {
  return svg(
    figure +
    text(110, 230, kicker.toUpperCase(), { font: MONO, size: 24, weight: 600, fill: ink, ls: 4 }) +
    head(104, 380, title, { size: 132, lead: 124 }) +
    (number ? text(110, 880, number, { font: DISPLAY, size: 230, weight: 400, fill: ink }) +
      lines(116, 950, [].concat(unit), { size: 30, weight: 500, lead: 40, fill: PAPER }) : '') +
    frame(sheet, tag));
}

const FIG = {
  ball: `<circle cx="1420" cy="560" r="300" fill="url(#dotPaper)" opacity="0.5"/>` +
    [120, 210, 300, 390].map((r, i) => `<circle cx="1420" cy="560" r="${r}" fill="none" stroke="${ACID}" stroke-width="${4 - i * 0.7}" opacity="${1 - i * 0.2}"${i ? ` stroke-dasharray="${4 + i * 6} ${10 + i * 4}"` : ''}/>`).join('') +
    `<rect x="1385" y="525" width="70" height="70" fill="${INK}" stroke="${ACID}" stroke-width="4"/>` +
    text(1420, 570, 'IMU', { font: MONO, size: 20, fill: ACID, anchor: 'middle' }) +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4, x = 1420 + Math.cos(a) * 430, y = 560 + Math.sin(a) * 410; return text(x, y, i % 2 ? 'touch' : 'spin', { font: MONO, size: 18, fill: PAPER, anchor: 'middle', opacity: 0.55 }); }).join(''),
  /* Offside as broadcast analysis draws it: the attacking third from above, players as numbered
     markers, the second-last defender's line and the attacker's, the margin between them, and the
     ring of tracking cameras in the stand. */
  offside: (() => {
    const X0 = 1000, Y0 = 210, PW = 800, PH = 600;               // the pitch's final third, in plan
    const stand = `<rect x="${X0 - 40}" y="${Y0 - 40}" width="${PW + 80}" height="${PH + 80}" fill="none" stroke="${PAPER}" stroke-width="2" opacity="0.18"/>`;
    const cams = Array.from({ length: 30 }, (_, i) => {
      const per = 2 * (PW + PH + 160), d = i / 30 * per, w = PW + 80, h = PH + 80;
      const [x, y] = d < w ? [X0 - 40 + d, Y0 - 40] : d < w + h ? [X0 - 40 + w, Y0 - 40 + d - w] : d < 2 * w + h ? [X0 - 40 + w - (d - w - h), Y0 - 40 + h] : [X0 - 40, Y0 - 40 + h - (d - 2 * w - h)];
      return `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${PANEL}" stroke="${PAPER}" stroke-width="2" opacity="0.75"/>`;
    }).join('');
    const field = `<g stroke="${PAPER}" stroke-width="2.5" fill="none" opacity="0.3"><rect x="${X0}" y="${Y0}" width="${PW}" height="${PH}"/>` +
      `<rect x="${X0 + PW - 170}" y="${Y0 + 110}" width="170" height="380"/><rect x="${X0 + PW - 58}" y="${Y0 + 210}" width="58" height="180"/>` +
      `<path d="M${X0 + PW - 170} ${Y0 + 230}A70 70 0 0 0 ${X0 + PW - 170} ${Y0 + 370}"/></g>` +
      `<rect x="${X0 + PW}" y="${Y0 + 262}" width="14" height="76" fill="${PAPER}" opacity="0.5"/>`;
    const lineD = 1452, lineA = 1488;                               // second-last defender, attacker
    const zone = `<rect x="${lineD}" y="${Y0}" width="${X0 + PW - lineD}" height="${PH}" fill="${CORAL}" opacity="0.10"/>`;
    const lines = `<path d="M${lineD} ${Y0}V${Y0 + PH}" stroke="${CORAL}" stroke-width="5"/><path d="M${lineA} ${Y0}V${Y0 + PH}" stroke="${ACID}" stroke-width="3" stroke-dasharray="12 8"/>`;
    const marker = (x, y, n, team) => {
      const fill = team === 'att' ? ACID : PAPER, ink = INK;
      return `<circle cx="${x}" cy="${y}" r="27" fill="${INK}" opacity="0.6"/><circle cx="${x}" cy="${y}" r="22" fill="${fill}"/>` +
        text(x, y + 8, String(n), { font: MONO, size: 21, weight: 700, fill: ink, anchor: 'middle' });
    };
    const def = [[1452, 300, 5], [1405, 520, 4], [1440, 660, 2], [1330, 730, 6], [1735, 500, 1]];   // 5 is the second-last defender; 1 the keeper
    const att = [[1488, 330, 9], [1330, 470, 10], [1410, 600, 7]];
    const ball = `<circle cx="1270" cy="430" r="9" fill="${PAPER}"/><path d="M1278 424L1478 334" stroke="${PAPER}" stroke-width="2" stroke-dasharray="6 7" opacity="0.6"/>`;
    const callout = `<path d="M${lineD} ${Y0 - 70}H${lineA}M${lineD} ${Y0 - 82}V${Y0 - 58}M${lineA} ${Y0 - 82}V${Y0 - 58}" stroke="${PAPER}" stroke-width="2.5"/>` +
      text(lineA + 18, Y0 - 62, 'THE MARGIN', { font: MONO, size: 18, weight: 700, fill: PAPER });
    const legend = `<circle cx="1010" cy="905" r="11" fill="${ACID}"/>` + text(1032, 912, 'ATTACK', { font: MONO, size: 17, fill: PAPER, opacity: 0.8 }) +
      `<circle cx="1150" cy="905" r="11" fill="${PAPER}"/>` + text(1172, 912, 'DEFENCE', { font: MONO, size: 17, fill: PAPER, opacity: 0.8 }) +
      `<rect x="1300" y="899" width="12" height="12" fill="${PANEL}" stroke="${PAPER}" stroke-width="2"/>` + text(1324, 912, 'TRACKING CAMERA', { font: MONO, size: 17, fill: PAPER, opacity: 0.8 }) +
      `<path d="M1520 905h34" stroke="${CORAL}" stroke-width="5"/>` + text(1566, 912, 'OFFSIDE LINE', { font: MONO, size: 17, fill: PAPER, opacity: 0.8 });
    return stand + cams + field + zone + lines + ball + def.map(([x, y, n]) => marker(x, y, n, 'def')).join('') + att.map(([x, y, n]) => marker(x, y, n, 'att')).join('') + callout + legend;
  })(),
  refcam: `<rect x="1040" y="230" width="780" height="520" fill="${PANEL}" stroke="${PAPER}" stroke-width="3"/>` +
    pitch(1080, 330, 700, 360, PAPER, 0.25) +
    `<circle cx="1110" cy="270" r="10" fill="${CORAL}"/>` + text(1132, 278, 'REC · REFEREE POV', { font: MONO, size: 20, fill: PAPER }) +
    [[1040, 230, 1, 1], [1820, 230, -1, 1], [1040, 750, 1, -1], [1820, 750, -1, -1]].map(([x, y, dx, dy]) => `<path d="M${x + dx * 20} ${y + dy * 70}V${y + dy * 20}H${x + dx * 70}" stroke="${ACID}" stroke-width="6" fill="none"/>`).join('') +
    `<circle cx="1430" cy="520" r="60" fill="none" stroke="${ACID}" stroke-width="3"/><path d="M1430 440V480M1430 560V600M1350 520H1390M1470 520H1510" stroke="${ACID}" stroke-width="3"/>`,
  pitch: `<g transform="translate(1000 300)">` +
    [0, 1, 2].map(i => `<rect x="${i * 270 + i * 18}" y="${i === 1 ? 70 : 0}" width="250" height="420" fill="url(#dotAcid)" stroke="${ACID}" stroke-width="3" opacity="${0.9 - i * 0.15}"/>`).join('') +
    `<path d="M0 520H840" stroke="${PAPER}" stroke-width="3" stroke-dasharray="12 10" opacity="0.6"/>` +
    `<path d="M120 560l40 40l40-40M408 560l40 40l40-40M696 560l40 40l40-40" stroke="${CORAL}" stroke-width="5" fill="none"/></g>` +
    text(1000, 960, 'GRASS ABOVE · NFL TURF BELOW', { font: MONO, size: 20, fill: PAPER, opacity: 0.7 }),
  boards: [0, 1, 2].map(i => `<g transform="translate(1000 ${250 + i * 200})"><rect width="820" height="130" fill="${[ACID, CORAL, COBALT][i]}" opacity="${i ? 0.85 : 1}"/>` +
    text(410, 86, ['YOUR AD HERE', 'IHRE WERBUNG', 'TU ANUNCIO'][i], { font: DISPLAY, size: 74, weight: 400, fill: INK, anchor: 'middle' }) +
    text(0, -16, ['IN THE GROUND', 'ON TV IN GERMANY', 'ON TV IN SPAIN'][i], { font: MONO, size: 20, fill: PAPER, opacity: 0.75 }) + '</g>').join(''),
  screen: `<ellipse cx="1420" cy="520" rx="420" ry="150" fill="none" stroke="${COBALT}" stroke-width="40" opacity="0.85"/>` +
    `<ellipse cx="1420" cy="520" rx="420" ry="150" fill="none" stroke="url(#dotPaper)" stroke-width="40"/>` +
    `<ellipse cx="1420" cy="760" rx="460" ry="180" fill="none" stroke="${PAPER}" stroke-width="3" opacity="0.4"/>` +
    pitch(1180, 700, 480, 120, ACID, 0.6)
};

/* The timeline of the game being remade, as a printed wall chart. */
function timeline(events) {
  const x0 = 140, x1 = 1780, y = 600;
  const years = events.map(e => e.year), lo = Math.min(...years), hi = Math.max(...years);
  const X = yr => x0 + (yr - lo) / (hi - lo) * (x1 - x0);
  const marks = events.map((e, i) => {
    const x = X(e.year) + (e.nudge || 0), up = i % 2 === 0, ink = [ACID, CORAL, COBALT][i % 3];
    const ty = up ? y - 120 : y + 150;
    return `<path d="M${x} ${y}V${up ? y - 90 : y + 90}" stroke="${ink}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="12" fill="${ink}"/>` +
      text(x, ty - (up ? 72 : 0), String(e.year), { font: DISPLAY, size: 54, weight: 400, fill: ink, anchor: 'middle' }) +
      lines(x, ty + (up ? -28 : 40), e.label, { size: 23, weight: 600, lead: 28, anchor: 'middle', fill: PAPER });
  }).join('');
  return svg(
    head(104, 200, ['The game, remade'], { size: 110 }) +
    `<path d="M${x0 - 40} ${y}H${x1 + 40}" stroke="${PAPER}" stroke-width="4"/>` + marks +
    frame('Sheet 01 · wall chart', 'Sources in the notes'));
}

/* The pipeline every football job sits on: from the thing that happened to the call a person makes. */
function pipeline(stages) {
  const w = 300, gap = 44, x0 = (W - (stages.length * w + (stages.length - 1) * gap)) / 2, y = 380;
  return svg(
    head(104, 220, ['From the pitch to the call'], { size: 104 }) +
    stages.map((s, i) => {
      const x = x0 + i * (w + gap);
      return `<rect x="${x}" y="${y}" width="${w}" height="420" fill="${PANEL}" stroke="${s.ink}" stroke-width="4"/>` +
        `<rect x="${x}" y="${y}" width="${w}" height="16" fill="${s.ink}"/>` +
        text(x + 26, y + 80, String(i + 1).padStart(2, '0'), { font: MONO, size: 24, fill: s.ink }) +
        text(x + 26, y + 160, s.name.toUpperCase(), { font: DISPLAY, size: 66, weight: 400, fill: PAPER }) +
        lines(x + 26, y + 220, s.what, { size: 25, weight: 500, lead: 34, fill: PAPER }) +
        text(x + 26, y + 390, s.example, { font: MONO, size: 18, fill: s.ink }) +
        (i < stages.length - 1 ? `<path d="M${x + w + 6} ${y + 210}h${gap - 14}m-12 -12l12 12l-12 12" stroke="${PAPER}" stroke-width="3" fill="none"/>` : '');
    }).join('') +
    text(W / 2, 920, 'Every new job in football sits somewhere on this line.', { size: 34, weight: 600, anchor: 'middle', fill: PAPER }) +
    frame('Sheet 02 · the line', null));
}

/* The job atlas: five studios, their jobs, as a pinned-up wall. */
function atlas(studios) {
  const w = 320, gap = 22, x0 = (W - (studios.length * w + (studios.length - 1) * gap)) / 2, y = 300;
  return svg(
    head(104, 200, ['The job atlas'], { size: 110 }) +
    studios.map((s, i) => {
      const x = x0 + i * (w + gap), rot = [-1.5, 1, -0.6, 1.4, -1][i];
      return `<g transform="rotate(${rot} ${x + w / 2} ${y + 330})"><rect x="${x}" y="${y}" width="${w}" height="560" fill="${PAPER}"/>` +
        `<rect x="${x}" y="${y}" width="${w}" height="120" fill="${s.ink}"/>` +
        text(x + 24, y + 50, `STUDIO ${'ABCDE'[i]}`, { font: MONO, size: 20, fill: INK }) +
        text(x + 24, y + 102, s.name.toUpperCase(), { font: DISPLAY, size: 56, weight: 400, fill: INK }) +
        s.jobs.map((j, k) => `<circle cx="${x + 32}" cy="${y + 178 + k * 66}" r="7" fill="${INK}"/>` +
          lines(x + 52, y + 186 + k * 66, j.split('\n'), { size: 24, weight: 700, lead: 26, fill: INK })).join('') +
        `<rect x="${x + w / 2 - 34}" y="${y - 16}" width="68" height="26" fill="${PAPER}" opacity="0.55" transform="rotate(-6 ${x + w / 2} ${y})"/></g>`;
    }).join('') +
    frame('Sheet 03 · the atlas', null));
}

/* A studio's cover card: its letter, name, the step on the line it works and its brief. */
function studioCard(letter, s) {
  const ink = s.ink;
  return svg(
    `<rect x="0" y="0" width="760" height="${H}" fill="${ink}"/>` +
    `<text x="380" y="760" font-family="${DISPLAY}" font-size="720" fill="${INK}" text-anchor="middle">${letter}</text>` +
    text(380, 900, `STUDIO ${letter}`, { font: MONO, size: 30, weight: 700, fill: INK, anchor: 'middle', ls: 6 }) +
    text(880, 250, `ON THE LINE: ${s.step.toUpperCase()}`, { font: MONO, size: 24, weight: 600, fill: ink, ls: 4 }) +
    head(874, 420, s.title, { size: 140, lead: 130 }) +
    lines(880, 420 + s.title.length * 130 + 20, s.brief, { size: 36, weight: 500, lead: 50, fill: PAPER }) +
    `<path d="M880 ${560 + s.title.length * 130}H1820" stroke="${PAPER}" stroke-width="2" opacity="0.3"/>` +
    s.jobs.map((j, k) => {
      const jx = 880 + (k % 2) * 480, jy = 630 + s.title.length * 130 + Math.floor(k / 2) * 92;
      return `<rect x="${jx}" y="${jy - 26}" width="14" height="14" fill="${ink}"/>` +
        lines(jx + 32, jy - 12, j.split('\n'), { size: 26, weight: 700, lead: 30, fill: PAPER });
    }).join('') +
    frame(`Sheet 03${letter.toLowerCase()} · studio ${letter}`, null, letter === 'B' ? PAPER : INK));
}

/* The brief's template: the poster each team fills in. */
function briefTemplate(fields) {
  const x = 560, y = 150, w = 800, h = 860;
  return svg(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="150" fill="${ACID}"/>` +
    text(x + 40, y + 60, 'JOB POSTER · FOOTBALL, 2035', { font: MONO, size: 22, weight: 700, fill: INK }) +
    text(x + 40, y + 126, 'JOB TITLE ____________', { font: DISPLAY, size: 64, weight: 400, fill: INK }) +
    fields.map((f, i) => {
      const fy = y + 210 + i * 132;
      return text(x + 40, fy, `${String(i + 1).padStart(2, '0')} · ${f.label.toUpperCase()}`, { font: MONO, size: 20, weight: 700, fill: CORAL }) +
        text(x + 40, fy + 38, f.prompt, { size: 26, weight: 600, fill: INK }) +
        `<path d="M${x + 40} ${fy + 84}H${x + w - 40}" stroke="${INK}" stroke-width="2" stroke-dasharray="4 8" opacity="0.5"/>`;
    }).join('') +
    sticker(110, 300, 'Teams of three', CORAL, -6, 30) +
    sticker(110, 420, '12 minutes', ACID, 4, 30) +
    sticker(1440, 300, 'A3 or a slide', COBALT, 5, 30) +
    frame('Sheet 05 · the brief', null));
}

/* A case file: one real case, pinned up as an evidence sheet. Its number, title, source, three
   facts with their figures, and the job it shows. */
function caseFile({ n, kicker, title, facts, job, tag, ink = ACID }) {
  const fx = 1010, fw = 810;
  return svg(
    text(110, 230, `CASE FILE ${String(n).padStart(2, '0')} · ${kicker.toUpperCase()}`, { font: MONO, size: 24, weight: 600, fill: ink, ls: 4 }) +
    head(104, 380, title, { size: 120, lead: 112 }) +
    `<rect x="110" y="${400 + (title.length - 1) * 112 + 40}" width="${Math.min(760, job.length * 19 + 180)}" height="96" fill="none" stroke="${ink}" stroke-width="3"/>` +
    text(134, 400 + (title.length - 1) * 112 + 78, 'THE JOB IT SHOWS', { font: MONO, size: 18, weight: 700, fill: ink, ls: 2 }) +
    text(134, 400 + (title.length - 1) * 112 + 118, job, { size: 32, weight: 700, fill: PAPER }) +
    `<rect x="${fx}" y="190" width="${fw}" height="720" fill="${PANEL}"/><rect x="${fx}" y="190" width="10" height="720" fill="${ink}"/>` +
    facts.map(([num, label], i) => {
      const y = 190 + 60 + i * 230;
      return text(fx + 60, y + 110, num, { font: DISPLAY, size: 130, weight: 400, fill: ink }) +
        lines(fx + 60, y + 160, [].concat(label), { size: 28, weight: 500, lead: 36, fill: PAPER }) +
        (i < facts.length - 1 ? `<path d="M${fx + 60} ${y + 210}H${fx + fw - 60}" stroke="${PAPER}" stroke-width="1.5" opacity="0.2"/>` : '');
    }).join('') +
    frame(`Case file ${String(n).padStart(2, '0')}`, tag));
}

module.exports = { caseFile, cover, section, MOTIF, moment, FIG, timeline, pipeline, atlas, studioCard, briefTemplate, INK: { ACID, CORAL, COBALT, PAPER, INK }, STUDIO };
