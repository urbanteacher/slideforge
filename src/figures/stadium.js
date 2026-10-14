/* The AI stadium: a top-down map of a football club on matchday, and every
 * place AI works in it. Made for Youth Charter's "AI in football" session,
 * where the point is the whole picture: not one clever tool, but a ground
 * and a club where the gates, the stands, the pitch, the dugout, the medical
 * room, the TV gantry, the grass, the training ground, the scouts, the
 * club's business and the fans at home each run on data.
 *
 * A slide shows the whole map with its zones listed (zone 'all'), one zone
 * (the map zooms in from the whole ground as the slide opens, and the panel
 * says what happens there, which kinds of AI do it, how they work, who still
 * decides, the catch and a question for the room), or every zone's data
 * running to one cloud (zone 'cloud'). Several steps on one slide walk the
 * zones in turn. The room can hover any zone for its name.
 *
 * The map is the figure's own drawing (the zones' places are fixed below);
 * the words are the slide's, in figureData:
 *   eyebrow, title     drawn in the figure's own Youth Charter type
 *   intro              { name, body, ask } the panel for the overview step
 *   zones              { [id]: { name, does, ai: [kinds of AI], how, decides, risk, ask } }
 *   cloud              { name, does, decides, risk, ask } the panel for the cloud step
 *   source             a credit line under the panel
 * Each step sets:
 *   zone     a zone id, 'all' (the whole map) or 'cloud' (every zone to one cloud)
 *   caption  unused by this figure (the panel carries the words); kept for the presenter's notes screen
 *
 * Drawn in plain SVG (no foreignObject), so its still is a picture the
 * Lesson studio can show. Its colours are Youth Charter's (css/youth-charter.css).
 */
import { W, H, el, set, tween, lerp, ease, textWidth, tooltipCard } from './kit.js';

var YC = {
  navy: '#224476', deep: '#12284a', night: '#0b1a33', red: '#e21c21', pop: '#ffe14d', paper: '#f3efe6',
  ink: '#16203a', dim: '#4f5868', grass: '#2f7d4a', grass2: '#378c55', line: 'rgba(255,255,255,.85)',
  display: "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Franklin Gothic Heavy', sans-serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif"
};

/* The map is drawn at ART's size; its window on the slide, and the panel beside it, are set per
   slide in mount: a zone's page gives the panel more room. */
var ART = { w: 788, h: 576 };
var MAP = { x: 36, y: 112, w: 788, h: 576 };
var PANEL = { x: 852, y: 112, w: 392, h: 576 };

/* Where each zone is, in map pixels (0..788 by 0..576), and the order the badges count in. */
var ZONES = [
  { id: 'gates', box: [282, 474, 224, 52] },
  { id: 'control', box: [552, 126, 66, 50] },
  { id: 'stands', box: [176, 112, 436, 362] },
  { id: 'pitch', box: [262, 192, 264, 204] },
  { id: 'dugout', box: [330, 396, 128, 56] },
  { id: 'medical', box: [478, 418, 96, 44] },
  { id: 'tv', box: [290, 104, 208, 40] },
  { id: 'grounds', box: [184, 254, 56, 82] },
  { id: 'training', box: [14, 14, 176, 120] },
  { id: 'scouting', box: [598, 14, 176, 120] },
  { id: 'business', box: [598, 442, 176, 120] },
  { id: 'home', box: [14, 442, 176, 120] }
];
var CLOUD = [394, 52];

/** Lines of `text` at `size` that fit `width`. @param {string} text @param {number} size @param {number} width */
function wrap(text, size, width) {
  var words = String(text || '').split(/\s+/).filter(Boolean), lines = /** @type {string[]} */ ([]), line = '';
  words.forEach(function (w) {
    var next = line ? line + ' ' + w : w;
    if (line && textWidth(next, size, false) > width) { lines.push(line); line = w; } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

export var stadium = {
  /** @param {any} fig */
  mount: function (fig) {
    var d = fig.data || {}, svg = fig.svg, zones = d.zones || {};
    var list = Array.isArray(fig.steps) ? fig.steps : [];
    var paged = list.length === 1 && list[0] && list[0].zone && list[0].zone !== 'all' && list[0].zone !== 'cloud';
    MAP = paged ? { x: 36, y: 112, w: 668, h: 576 } : { x: 36, y: 112, w: 788, h: 576 };
    PANEL = paged ? { x: 728, y: 112, w: 516, h: 576 } : { x: 852, y: 112, w: 392, h: 576 };
    var defs = el('defs', {}, svg);
    var clip = el('clipPath', { id: 'stadium-clip' }, defs);
    el('rect', { x: MAP.x, y: MAP.y, width: MAP.w, height: MAP.h, rx: 18 }, clip);
    var dots = el('pattern', { id: 'stadium-dots', width: 15, height: 15, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 7.5, cy: 7.5, r: 1.3, fill: 'rgba(255,255,255,.07)' }, dots);
    var stripes = el('pattern', { id: 'stadium-stripes', width: 44, height: 10, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { width: 22, height: 10, fill: YC.grass }, stripes);
    el('rect', { x: 22, width: 22, height: 10, fill: YC.grass2 }, stripes);

    /* The figure's own ground and type, over the shared stage's: Youth Charter, not the lecture's. */
    el('rect', { width: W, height: H, fill: YC.deep }, svg);
    el('rect', { width: W, height: H, fill: 'url(#stadium-dots)' }, svg);
    el('rect', { x: 0, y: 0, width: 14, height: H, fill: YC.red }, svg);
    if (d.eyebrow) el('text', { x: 48, y: 52, 'font-family': YC.sans, 'font-size': 15, 'font-weight': 700, 'letter-spacing': 2.6, fill: YC.pop }, svg, String(d.eyebrow).toUpperCase());
    if (d.title) el('text', { x: 48, y: 94, 'font-family': YC.display, 'font-size': 42, fill: '#ffffff' }, svg, String(d.title).toUpperCase());

    /* ------------------------------------------------------------ the map */
    var frame = el('g', { 'clip-path': 'url(#stadium-clip)' }, svg);
    el('rect', { x: MAP.x, y: MAP.y, width: MAP.w, height: MAP.h, fill: YC.night }, frame);
    var map = el('g', {}, frame);
    var art = el('g', { transform: 'translate(' + MAP.x + ' ' + MAP.y + ')' }, map);

    /* Streets, faint, so the ground sits in a town. */
    for (var gx = 40; gx < ART.w; gx += 80) el('line', { x1: gx, y1: 0, x2: gx, y2: ART.h, stroke: 'rgba(255,255,255,.04)', 'stroke-width': 10 }, art);
    for (var gy = 40; gy < ART.h; gy += 80) el('line', { x1: 0, y1: gy, x2: ART.w, y2: gy, stroke: 'rgba(255,255,255,.04)', 'stroke-width': 10 }, art);

    /* The bowl: four stands of seats round the pitch. */
    el('rect', { x: 176, y: 112, width: 436, height: 362, rx: 70, fill: YC.navy, stroke: '#2d5592', 'stroke-width': 3 }, art);
    for (var r = 0; r < 5; r++) el('rect', { x: 188 + r * 14, y: 124 + r * 13, width: 412 - r * 28, height: 338 - r * 26, rx: 62 - r * 8, fill: 'none', stroke: 'rgba(255,255,255,.10)', 'stroke-width': 4 }, art);
    /* The crowd: a sprinkle of fans in the stands. */
    var seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var f = 0; f < 340; f++) {
      var a = rand() * Math.PI * 2, rx = 160 + rand() * 46, ry = 128 + rand() * 40;
      var fx = 394 + Math.cos(a) * rx * 1.08, fy = 293 + Math.sin(a) * ry * 1.05;
      if (fx > 262 && fx < 526 && fy > 192 && fy < 396) continue;
      el('circle', { cx: fx, cy: fy, r: 2.2, fill: rand() < 0.5 ? YC.red : '#ffffff', opacity: 0.55 }, art);
    }
    /* The pitch, with its markings and the two goals. */
    el('rect', { x: 262, y: 192, width: 264, height: 204, fill: 'url(#stadium-stripes)', stroke: YC.line, 'stroke-width': 2.5 }, art);
    el('line', { x1: 394, y1: 192, x2: 394, y2: 396, stroke: YC.line, 'stroke-width': 2 }, art);
    el('circle', { cx: 394, cy: 294, r: 26, fill: 'none', stroke: YC.line, 'stroke-width': 2 }, art);
    el('rect', { x: 262, y: 246, width: 40, height: 96, fill: 'none', stroke: YC.line, 'stroke-width': 2 }, art);
    el('rect', { x: 486, y: 246, width: 40, height: 96, fill: 'none', stroke: YC.line, 'stroke-width': 2 }, art);
    el('rect', { x: 255, y: 280, width: 7, height: 28, fill: '#ffffff' }, art);
    el('rect', { x: 526, y: 280, width: 7, height: 28, fill: '#ffffff' }, art);
    /* Players, and the tracking lines the cameras draw between them. */
    var team = [[300, 230], [330, 300], [310, 360], [370, 250], [365, 340], [420, 290]];
    var rival = [[450, 230], [470, 320], [430, 360], [500, 270], [410, 220]];
    team.forEach(function (p, i) { if (i) el('line', { x1: team[i - 1][0], y1: team[i - 1][1], x2: p[0], y2: p[1], stroke: YC.pop, 'stroke-width': 1.4, 'stroke-dasharray': '2 5', opacity: 0.8 }, art); });
    team.forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 6, fill: YC.red, stroke: '#ffffff', 'stroke-width': 2 }, art); });
    rival.forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 6, fill: '#ffffff', stroke: YC.deep, 'stroke-width': 2 }, art); });
    el('circle', { cx: 438, cy: 300, r: 4, fill: '#ffffff', stroke: YC.ink, 'stroke-width': 1.5 }, art);
    el('line', { x1: 452, y1: 196, x2: 452, y2: 392, stroke: YC.pop, 'stroke-width': 2, opacity: 0.9 }, art);

    /* The places round the bowl, each drawn as what it is. */
    // The TV gantry along the top stand's roof, with its cameras.
    el('rect', { x: 296, y: 112, width: 196, height: 18, rx: 4, fill: YC.ink, stroke: YC.pop, 'stroke-width': 1.5 }, art);
    [316, 356, 396, 436, 472].forEach(function (cx) { el('rect', { x: cx - 8, y: 116, width: 16, height: 10, rx: 2, fill: YC.pop }, art); el('circle', { cx: cx, cy: 134, r: 3, fill: YC.pop }, art); });
    // The safety control room, high in a corner.
    el('rect', { x: 556, y: 132, width: 58, height: 38, rx: 6, fill: YC.red, stroke: '#ffffff', 'stroke-width': 2 }, art);
    for (var s = 0; s < 3; s++) el('rect', { x: 562 + s * 17, y: 140, width: 13, height: 10, fill: '#ffffff', opacity: 0.85 }, art);
    el('rect', { x: 562, y: 154, width: 47, height: 8, fill: '#ffffff', opacity: 0.4 }, art);
    // The dugouts on the touchline, and the analysts' box behind them.
    el('rect', { x: 340, y: 400, width: 44, height: 14, rx: 4, fill: YC.ink, stroke: '#ffffff', 'stroke-width': 1.5 }, art);
    el('rect', { x: 404, y: 400, width: 44, height: 14, rx: 4, fill: YC.ink, stroke: '#ffffff', 'stroke-width': 1.5 }, art);
    el('rect', { x: 362, y: 424, width: 64, height: 22, rx: 4, fill: YC.pop }, art);
    for (var m = 0; m < 3; m++) el('rect', { x: 368 + m * 19, y: 429, width: 15, height: 11, fill: YC.ink }, art);
    // The dressing rooms and medical room, by the tunnel.
    el('rect', { x: 484, y: 424, width: 84, height: 32, rx: 6, fill: '#ffffff' }, art);
    el('rect', { x: 520, y: 430, width: 12, height: 20, fill: YC.red }, art);
    el('rect', { x: 514, y: 436, width: 24, height: 8, fill: YC.red }, art);
    // Pitch care and energy: the machine room behind the left goal.
    el('rect', { x: 190, y: 260, width: 44, height: 70, rx: 6, fill: YC.grass, stroke: '#ffffff', 'stroke-width': 2 }, art);
    for (var w = 0; w < 4; w++) el('circle', { cx: 212, cy: 272 + w * 15, r: 4, fill: YC.pop }, art);
    // The turnstiles, and the fans walking in.
    for (var t = 0; t < 7; t++) {
      el('rect', { x: 292 + t * 30, y: 478, width: 18, height: 14, rx: 3, fill: YC.red }, art);
      el('rect', { x: 299 + t * 30, y: 478, width: 4, height: 14, fill: '#ffffff' }, art);
      for (var q = 0; q < 3; q++) el('circle', { cx: 301 + t * 30, cy: 500 + q * 9, r: 3, fill: '#ffffff', opacity: 0.75 - q * 0.2 }, art);
    }

    /* Beyond the ground: four tiles at the corners, linked to the bowl. */
    var TILES = [
      { id: 'training', label: 'Training ground', glyph: 'cones' },
      { id: 'scouting', label: 'Scouting office', glyph: 'globe' },
      { id: 'business', label: 'Club business', glyph: 'chart' },
      { id: 'home', label: 'Fans at home', glyph: 'phone' }
    ];
    TILES.forEach(function (tile) {
      var z = ZONES.find(function (x) { return x.id === tile.id; }), b = z ? z.box : [0, 0, 0, 0];
      var cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
      el('line', { x1: cx, y1: cy, x2: 394, y2: 293, stroke: 'rgba(255,255,255,.12)', 'stroke-width': 3, 'stroke-dasharray': '6 8' }, art);
      el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], rx: 14, fill: YC.paper }, art);
      el('text', { x: cx, y: b[1] + b[3] - 16, 'text-anchor': 'middle', 'font-family': YC.display, 'font-size': 19, fill: YC.ink }, art, tile.label.toUpperCase());
      var g = el('g', { transform: 'translate(' + cx + ' ' + (b[1] + 44) + ')' }, art);
      if (tile.glyph === 'cones') { [-34, 0, 34].forEach(function (x) { el('path', { d: 'M' + (x - 10) + ' 18L' + x + ' -16L' + (x + 10) + ' 18Z', fill: YC.red }, g); }); el('line', { x1: -50, y1: 20, x2: 50, y2: 20, stroke: YC.ink, 'stroke-width': 3 }, g); }
      if (tile.glyph === 'globe') { el('circle', { r: 24, fill: 'none', stroke: YC.navy, 'stroke-width': 4 }, g); el('ellipse', { rx: 10, ry: 24, fill: 'none', stroke: YC.navy, 'stroke-width': 3 }, g); el('line', { x1: -24, x2: 24, stroke: YC.navy, 'stroke-width': 3 }, g); el('circle', { cx: 14, cy: -10, r: 6, fill: YC.red }, g); }
      if (tile.glyph === 'chart') { [[-36, 8], [-14, -6], [8, 0], [30, -20]].forEach(function (p) { el('rect', { x: p[0], y: p[1], width: 16, height: 24 - p[1], fill: YC.navy }, g); }); el('path', { d: 'M-30 4L-6 -12L16 -6L40 -26', fill: 'none', stroke: YC.red, 'stroke-width': 4 }, g); }
      if (tile.glyph === 'phone') { el('rect', { x: -15, y: -24, width: 30, height: 50, rx: 6, fill: YC.ink }, g); el('rect', { x: -11, y: -18, width: 22, height: 34, fill: YC.pop }, g); el('rect', { x: -8, y: -14, width: 16, height: 5, fill: YC.red }, g); el('rect', { x: -8, y: -5, width: 12, height: 4, fill: YC.ink, opacity: 0.6 }, g); }
    });

    /* The cloud every zone's data runs to, shown on the cloud step. */
    var flows = el('g', { opacity: 0 }, art);
    var cloudG = el('g', { transform: 'translate(' + CLOUD[0] + ' ' + CLOUD[1] + ')', opacity: 0 }, art);
    el('path', { d: 'M-58 18a24 24 0 0 1 6-44a32 32 0 0 1 58-10a26 26 0 0 1 48 16a20 20 0 0 1 4 38Z', fill: '#ffffff', stroke: YC.pop, 'stroke-width': 3 }, cloudG);
    el('text', { y: 10, 'text-anchor': 'middle', 'font-family': YC.display, 'font-size': 18, fill: YC.ink }, cloudG, 'THE DATA CLOUD');
    ZONES.forEach(function (z) {
      var cx = z.box[0] + z.box[2] / 2, cy = z.box[1] + z.box[3] / 2;
      if (z.id === 'stands') { cx = 230; cy = 180; }
      el('path', { d: 'M' + cx + ' ' + cy + 'Q' + ((cx + CLOUD[0]) / 2) + ' ' + (Math.min(cy, CLOUD[1]) - 10) + ' ' + CLOUD[0] + ' ' + (CLOUD[1] + 18), fill: 'none', stroke: YC.pop, 'stroke-width': 2, 'stroke-dasharray': '3 8', opacity: 0.75 }, flows);
    });

    /* Each zone: a hit area, a spotlight ring, and a numbered badge. */
    var shade = el('path', { fill: 'rgba(5,12,26,.62)', 'fill-rule': 'evenodd', 'pointer-events': 'none', opacity: 0 }, art);
    var zoneLayer = el('g', {}, art);
    /** @type {Record<string, any>} */ var parts = {};
    ZONES.forEach(function (z, i) {
      var b = z.box, g = el('g', { cursor: 'default' }, zoneLayer);
      var ring = z.id === 'stands'
        ? el('rect', { x: b[0] - 3, y: b[1] - 3, width: b[2] + 6, height: b[3] + 6, rx: 74, fill: 'none', stroke: YC.pop, 'stroke-width': 4, opacity: 0 }, g)
        : el('rect', { x: b[0] - 4, y: b[1] - 4, width: b[2] + 8, height: b[3] + 8, rx: 10, fill: 'none', stroke: YC.pop, 'stroke-width': 4, opacity: 0 }, g);
      var hit = z.id === 'stands'
        ? el('path', { d: 'M' + b[0] + ' ' + (b[1] + 70) + 'a70 70 0 0 1 70 -70h' + (b[2] - 140) + 'a70 70 0 0 1 70 70v' + (b[3] - 140) + 'a70 70 0 0 1 -70 70h-' + (b[2] - 140) + 'a70 70 0 0 1 -70 -70Z M262 192v204h264v-204Z', fill: 'transparent', 'fill-rule': 'evenodd' }, g)
        : el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], fill: 'transparent' }, g);
      var bx = z.id === 'stands' ? b[0] + 30 : b[0] + b[2] - 2, by = z.id === 'stands' ? b[1] + 30 : b[1] + 2;
      var badge = el('g', { transform: 'translate(' + bx + ' ' + by + ')', 'pointer-events': 'none' }, g);
      el('circle', { r: 13, fill: YC.pop, stroke: YC.ink, 'stroke-width': 2 }, badge);
      el('text', { y: 5.5, 'text-anchor': 'middle', 'font-family': YC.display, 'font-size': 16, fill: YC.ink }, badge, String(i + 1));
      parts[z.id] = { z: z, g: g, ring: ring, hit: hit, badge: badge, n: i + 1 };
    });
    var cards = el('g', { 'pointer-events': 'none' }, svg);

    /* ------------------------------------------------------------ the panel */
    var panel = el('g', {}, svg);
    /** The panel's frame and header: a red shadow, newsprint, a navy band with the tag and the name. @param {string} tag @param {string} name @param {number} k */
    function frameOf(tag, name, k) {
      panel.textContent = '';
      var P = PANEL, x = P.x + 28, wide = P.w - 56;
      el('rect', { x: P.x + 6, y: P.y + 6, width: P.w, height: P.h, rx: 14, fill: YC.red }, panel);
      el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, rx: 14, fill: YC.paper }, panel);
      el('rect', { x: P.x, y: P.y, width: P.w, height: 96, rx: 14, fill: YC.navy }, panel);
      el('rect', { x: P.x, y: P.y + 80, width: P.w, height: 16, fill: YC.navy }, panel);
      if (tag) el('text', { x: x, y: P.y + 32, 'font-family': YC.sans, 'font-size': 14, 'font-weight': 700, 'letter-spacing': 2.2, fill: YC.pop }, panel, tag.toUpperCase());
      var size = Math.round(34 * Math.min(1, k + 0.1)), nameLines = wrap(String(name || '').toUpperCase(), size, wide);
      if (nameLines.length > 1) { size = 28; nameLines = wrap(String(name || '').toUpperCase(), size, wide); }
      nameLines.slice(0, 2).forEach(function (ln, i) { el('text', { x: x, y: P.y + (nameLines.length > 1 ? 60 : 72) + i * 30, 'font-family': YC.display, 'font-size': size, fill: '#ffffff' }, panel, ln); });
      return { x: x, wide: wide };
    }
    /** A head and its words at (x, y), `width` wide; returns the y after it. @param {boolean} draw */
    function block(/** @type {string} */ head, /** @type {string} */ body, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ size, /** @type {number} */ width, /** @type {boolean} */ draw) {
      if (!body) return y;
      if (draw) el('text', { x: x, y: y, 'font-family': YC.sans, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 2, fill: YC.red }, panel, head);
      var lines = wrap(body, size, width);
      if (draw) lines.forEach(function (ln, i) { el('text', { x: x, y: y + 22 + size * 0.2 + i * size * 1.28, 'font-family': YC.sans, 'font-size': size, fill: YC.ink }, panel, ln); });
      return y + 22 + lines.length * size * 1.28 + 14;
    }
    /** The question for the room, in the highlighter bar at the panel's foot; returns its top. */
    function askBar(/** @type {string} */ ask, /** @type {number} */ x, /** @type {number} */ wide, /** @type {number} */ size, /** @type {boolean} */ draw) {
      if (!ask) return PANEL.y + PANEL.h;
      var lines = wrap(ask, size, wide - 28), h = lines.length * size * 1.25 + 46, top = PANEL.y + PANEL.h - 22 - h;
      if (!draw) return top;
      el('rect', { x: x - 8, y: top, width: wide + 16, height: h, rx: 8, fill: YC.pop }, panel);
      el('text', { x: x + 6, y: top + 24, 'font-family': YC.sans, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 2, fill: YC.ink }, panel, 'ASK THE ROOM');
      lines.forEach(function (ln, i) { el('text', { x: x + 6, y: top + 30 + size + i * size * 1.25, 'font-family': YC.sans, 'font-size': size, 'font-weight': 700, fill: YC.ink }, panel, ln); });
      return top;
    }
    /** The kinds of AI at work, as highlighter chips; returns the y after them. */
    function chips(/** @type {string[]} */ kinds, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ wide, /** @type {boolean} */ draw) {
      if (!kinds || !kinds.length) return y;
      if (draw) el('text', { x: x, y: y, 'font-family': YC.sans, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 2, fill: YC.red }, panel, 'THE AI');
      var cx = x, cy = y + 12;
      kinds.forEach(function (kind) {
        var w = textWidth(kind, 16, false) + 26;
        if (cx + w > x + wide) { cx = x; cy += 38; }
        if (draw) {
          el('rect', { x: cx, y: cy, width: w, height: 30, rx: 15, fill: YC.navy }, panel);
          el('text', { x: cx + 13, y: cy + 20.5, 'font-family': YC.sans, 'font-size': 16, 'font-weight': 700, fill: YC.pop }, panel, kind);
        }
        cx += w + 8;
      });
      return cy + 30 + 20;
    }
    /* A zone's page: everything in the panel at the largest size that fits it. */
    /** @param {any} info @param {string} tag */
    function paintZone(info, tag) {
      var scales = [1, 0.94, 0.88, 0.82, 0.76, 0.7], k = scales[scales.length - 1];
      for (var i = 0; i < scales.length; i++) { if (layout(info, tag, scales[i], false)) { k = scales[i]; break; } }
      layout(info, tag, k, true);
    }
    /** @param {any} info @param {string} tag @param {number} k @param {boolean} draw @returns {boolean} whether it fits */
    function layout(info, tag, k, draw) {
      var f = draw ? frameOf(tag, info.name, k) : { x: PANEL.x + 28, wide: PANEL.w - 56 };
      var x = f.x, wide = f.wide, big = (paged ? 21 : 19) * k, small = (paged ? 18 : 16) * k;
      var y = PANEL.y + 126;
      y = chips(info.ai, x, y, wide, draw);
      y = block('WHAT HAPPENS HERE', info.does || info.body, x, y, big, wide, draw);
      y = block('HOW THE AI WORKS', info.how, x, y, small, wide, draw);
      var half = (wide - 24) / 2;
      var yl = block('WHO STILL DECIDES', info.decides, x, y, small, info.risk ? half : wide, draw);
      var yr = info.risk ? block('THE CATCH', info.risk, x + half + 24, y, small, half, draw) : y;
      var bottom = Math.max(yl, yr);
      var top = askBar(info.ask, x, wide, Math.max(16, 20 * k), draw);
      return bottom <= top + 4;
    }
    /* The whole map: the zones, numbered, as the session's contents. */
    /** @param {any} info @param {string} tag */
    function paintContents(info, tag) {
      var f = frameOf(tag, info.name || 'Matchday', 1), x = f.x, wide = f.wide, y = PANEL.y + 128;
      if (info.body) { wrap(info.body, 17, wide).forEach(function (ln, i) { el('text', { x: x, y: y + i * 22, 'font-family': YC.sans, 'font-size': 17, fill: YC.ink }, panel, ln); }); y += wrap(info.body, 17, wide).length * 22 + 14; }
      var top = askBar(info.ask, x, wide, 18, true);
      var rows = ZONES.filter(function (z) { return zones[z.id]; }), groups = [['IN THE GROUND', rows.slice(0, 8)], ['BEYOND THE GROUND', rows.slice(8)]];
      var lh = Math.min(30, (top - y - 52) / Math.max(1, rows.length)), r = Math.min(11, lh / 2 - 1.5), fs = Math.min(18, lh * 0.7);
      groups.forEach(function (g) {
        if (!g[1].length) return;
        el('text', { x: x, y: y + 8, 'font-family': YC.sans, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 2, fill: YC.red }, panel, String(g[0]));
        y += 18;
        /** @type {any[]} */ (g[1]).forEach(function (z) {
          var n = ZONES.indexOf(z) + 1;
          el('circle', { cx: x + 11, cy: y + lh / 2, r: r, fill: YC.pop, stroke: YC.ink, 'stroke-width': 1.5 }, panel);
          el('text', { x: x + 11, y: y + lh / 2 + r * 0.45, 'text-anchor': 'middle', 'font-family': YC.display, 'font-size': r * 1.25, fill: YC.ink }, panel, String(n));
          el('text', { x: x + 32, y: y + lh / 2 + fs * 0.36, 'font-family': YC.sans, 'font-size': fs, fill: YC.ink }, panel, String(zones[z.id].name || z.id));
          y += lh;
        });
        y += 10;
      });
    }
    if (d.source) el('text', { x: PANEL.x + PANEL.w, y: H - 12, 'text-anchor': 'end', 'font-family': YC.sans, 'font-size': 12, fill: 'rgba(255,255,255,.55)' }, svg, d.source);
    var pips = el('g', {}, svg);
    function paintPips(/** @type {number} */ at, /** @type {number} */ of) {
      pips.textContent = '';
      for (var i = 0; i < of; i++) el('rect', { x: MAP.x + i * 22, y: H - 20, width: 16, height: 5, rx: 2, fill: i === at ? YC.pop : 'rgba(255,255,255,.3)' }, pips);
    }

    /* ------------------------------------------------------------ the camera */
    var view = { s: 1, x: 0, y: 0 }, cancel = function () {};
    /** The scale at which the whole map fills its window. */
    function fit0() { return Math.min(MAP.w / ART.w, MAP.h / ART.h); }
    function whole() { return { s: fit0(), x: ART.w / 2, y: ART.h / 2 }; }
    /** @param {string} id */
    function aim(id) {
      var p = parts[id];
      if (!p) return whole();
      if (id === 'stands') return { s: Math.max(fit0(), 1.18 * fit0()), x: 394, y: 293 };
      var b = p.z.box, s = Math.max(fit0(), Math.min(2.4, Math.min(MAP.w * 0.55 / b[2], MAP.h * 0.55 / b[3])));
      return { s: s, x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 };
    }
    /** @param {{s: number, x: number, y: number}} v */
    function place(v) {
      var s = v.s, hw = MAP.w / (2 * s), hh = MAP.h / (2 * s);
      var cx = hw * 2 >= ART.w ? ART.w / 2 : Math.max(hw, Math.min(ART.w - hw, v.x)), cy = hh * 2 >= ART.h ? ART.h / 2 : Math.max(hh, Math.min(ART.h - hh, v.y));
      set(map, { transform: 'translate(' + (MAP.x + MAP.w / 2) + ' ' + (MAP.y + MAP.h / 2) + ') scale(' + s + ') translate(' + (-cx - MAP.x) + ' ' + (-cy - MAP.y) + ')' });
    }
    /** @param {{s: number, x: number, y: number}} to @param {boolean} animate */
    function move(to, animate) {
      cancel();
      var from = { s: view.s, x: view.x, y: view.y };
      cancel = tween(animate ? 1100 : 0, function (k) {
        view = { s: lerp(from.s, to.s, k), x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
        place(view);
      }, ease.inOut);
    }
    view = whole();
    place(view);
    var first = true;

    /** The spotlight: everything dark but the zone's box. @param {string} id */
    function spotlight(id) {
      var p = parts[id];
      if (!p) { set(shade, { opacity: 0 }); return; }
      var b = p.z.box, pad = 10, r = id === 'stands' ? 74 : 12;
      var x = b[0] - pad, y = b[1] - pad, w = b[2] + pad * 2, h = b[3] + pad * 2;
      var hole = 'M' + (x + r) + ' ' + y + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 -' + r + ' ' + r + 'h-' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 -' + r + ' -' + r + 'v-' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + 'Z';
      set(shade, { d: 'M-400 -400H' + (ART.w + 400) + 'V' + (ART.h + 400) + 'H-400Z' + hole, opacity: 1 });
    }

    var step = /** @type {any} */ ({}), hovered = /** @type {string|null} */ (null);
    function paintHover() {
      cards.textContent = '';
      if (!hovered || !fig.interactive) return;
      var p = parts[hovered], info = zones[hovered];
      if (!p || !info) return;
      var b = p.z.box, m = map.getCTM && map.getCTM(), local = svg.getCTM && svg.getCTM();
      var x = MAP.x + b[0] + b[2] / 2, y = MAP.y + b[1] + b[3] / 2;
      if (m && local) { var pt = svg.createSVGPoint(); pt.x = x; pt.y = y; var q = pt.matrixTransform(local.inverse().multiply(m)); x = q.x; y = q.y; }
      tooltipCard(cards, [['Zone', p.n + ' · ' + String(info.name || hovered)]], x, y, { maxX: PANEL.x - 8 });
    }
    if (fig.interactive) {
      Object.keys(parts).forEach(function (id) {
        parts[id].hit.addEventListener('pointerenter', function () { hovered = id; paintHover(); });
        parts[id].hit.addEventListener('pointerleave', function () { if (hovered === id) { hovered = null; paintHover(); } });
      });
    }

    return {
      /** @param {any} next @param {boolean} animate */
      update: function (next, animate) {
        step = next || {};
        var id = String(step.zone || 'all'), cloud = id === 'cloud', all = id === 'all' || cloud;
        Object.keys(parts).forEach(function (k) {
          var p = parts[k], on = k === id;
          set(p.ring, { opacity: on ? 1 : 0 });
          set(p.badge, { opacity: all || on ? 1 : 0.35 });
        });
        spotlight(all ? '' : id);
        /* A zone's own page flies in from the whole ground as it opens; a still is drawn where it lands. */
        move(all ? whole() : aim(id), animate || (first && fig.interactive && !all));
        first = false;
        tween(animate ? 700 : 0, function (k) { set(flows, { opacity: cloud ? k : 0 }); set(cloudG, { opacity: cloud ? k : 0 }); });
        var count = list.length;
        var order = ZONES.findIndex(function (z) { return z.id === id; });
        if (cloud) paintZone(d.cloud || { name: 'One cloud' }, 'Every zone');
        else if (all) paintContents(d.intro || { name: 'Matchday' }, 'The whole club');
        else paintZone(zones[id] || { name: id }, 'Zone ' + (order + 1) + ' of ' + ZONES.length);
        paintPips(typeof step.index === 'number' ? step.index : 0, count > 1 ? count : 0);
        hovered = null; paintHover();
      }
    };
  }
};
