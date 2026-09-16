#!/usr/bin/env node
'use strict';
/* Generates the AI Awareness Day 2027 brand assets into assets/brand/aiad27/.
 *
 *   node AiAd27/make-marks.js
 *
 * Five theme icons, five posters, seven lockups and two chamfer shapes.
 *
 * Not everything the campaign draws is a file. The quotation mark, the pair
 * arrow and the big step numbers are set as glyphs by the renderer, because
 * they are type and want the type's weight, colour and optical size. They are
 * specified in docs/aiad27-style-guide.md rather than generated here.
 *
 * THE ICONS ARE DRAWN AS SILHOUETTES, single-path where possible, and used as
 * CSS masks — so each one takes its colour from the theme token rather than
 * carrying a baked fill. One file per icon, five themes, no recolouring by
 * hand and no variant to keep in step.
 *
 * Why an icon at all: the brief requires that meaning is never carried by
 * colour alone. Every slide shows the theme NAME and its ICON together, so a
 * student who cannot separate teal from green still knows which starter they
 * are in.
 */
const fs = require('node:fs');
const path = require('node:path');

/* The strand colours, from the campaign brief. Baked into each icon rather
   than left to a CSS mask: the slide furniture needs the icon AND the strand
   name AND a timer, which is three things and there are only two pseudo-
   elements on a slide. Painting the icon here frees ::before to carry the
   name as text beside it, and ::after to sit top-right as the brief asks. */
/* Read out of the stylesheet, not retyped. css/aiad27.css declares both
   values per strand and the slides render from it, so a map here would be a
   second copy of a fact that has already changed once. Parsing it means a
   colour can only ever be edited in the place that paints with it, and a
   strand that loses its declaration fails the build instead of silently
   generating a black icon. */
const { STRAND, DEEP } = (() => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'aiad27.css'), 'utf8');
  const bright = {}, deep = {};
  const re = /\.theme-aiad27-([a-z]+)\s*\{[^}]*?--a27-color:\s*(#[0-9A-Fa-f]{6})[^}]*?--a27-deep:\s*(#[0-9A-Fa-f]{6})/g;
  for (let m; (m = re.exec(css)); ) { bright[m[1]] = m[2]; deep[m[1]] = m[3]; }
  const want = ['safe', 'smart', 'creative', 'responsible', 'future'];
  const missing = want.filter((k) => !bright[k] || !deep[k]);
  if (missing.length) {
    throw new Error(`css/aiad27.css has no --a27-color/--a27-deep for: ${missing.join(', ')}`);
  }
  return { STRAND: bright, DEEP: deep };
})();

/* 24x24 viewBox, the grid these are drawn on. Kept coarse on purpose: at the
   30px they render in the corner, detail below about a 1.5px stroke fills in
   on a projector and the shape stops being readable. */
const ICONS = {
  /* Safe — a shield. */
  safe: 'M12 2 L21 6 V12 C21 16.8 17 20.6 12 22 C7 20.6 3 16.8 3 12 V6 Z',
  /* Smart — a lightbulb: glass, then the base as two bars. */
  smart: 'M12 2 A7 7 0 0 0 8 14.8 V17 h8 v-2.2 A7 7 0 0 0 12 2 Z M9 18.6 h6 v1.6 h-6 Z M10 21.2 h4 v1.4 h-4 Z',
  /* Creative — a four-point spark, the "made something" mark. */
  creative: 'M12 1 L14.4 8.6 L22 11 L14.4 13.4 L12 21 L9.6 13.4 L2 11 L9.6 8.6 Z',
  /* Responsible — scales: beam, post, two pans. */
  responsible: 'M11 2 h2 v3.2 h6.4 v1.8 H13 V20 h5 v2 H6 v-2 h5 V7 H4.6 V5.2 H11 Z'
    + ' M4.6 8.4 L1.4 15 h6.4 Z M19.4 8.4 L16.2 15 h6.4 Z',
  /* Future — a path turning upward into an arrow. */
  future: 'M3 21 C3 14 8 12 12 12 C16 12 18 10 18 6 h-3.4 L19.6 1 L24 6 h-3.4'
    + ' c0 6-4 8-8.6 8 C8.4 14 5.6 15.6 5.4 21 Z'
};

const OUT = path.join(__dirname, '..', 'assets', 'brand', 'aiad27');

function icon(name, d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
     fill="${STRAND[name]}" role="img" aria-label="${name} strand"><path d="${d}"/></svg>\n`;
}

/* The campaign lockup, for the title slide's logo slot only. Two lines: what
   the day is, and what it is asking. Ink, so it sits on the light ground the
   brief asks for — including on the printable version. */
/* Drawn 1:1 against the slot it is given, so the type inside it is the size
   it says it is. The old lockup was a 300x58 board squeezed into a 180px box:
   everything in it rendered at 0.6, and its 17px heading arrived on the slide
   at about ten. Here the viewBox matches the rendered box, and the block is hung flush with the header rather than
   floated at some offset above it, so its first line falls on the same
   baseline as the strand name across from it and the subline hangs below the
   band. 20px here is 20px on the wall — the same size as the strand name across the header from
   it, which is what makes the two read as one line of furniture.

   Set from the right edge, not the left. The artboard's right edge already
   landed on the closing rule's right end — both align to the 52px content
   edge — but the type inside was anchored at 0 and stopped wherever the words
   ran out, leaving a ragged strip of empty board between the final 7 and the
   line below it. The box was flush and the ink was not. Anchored at 300 both
   lines end together, and the rule moves under the end of the heading to
   match. Anchoring beats trimming the board to a measured width: the font
   here is a fallback stack, so the same string is not the same width on every
   machine, and the right edge has to hold on all of them.

   Ink only. The mark is reversed to white on dark grounds by the shared
   data-ground rule, which needs a single flat colour to inverse cleanly. */
function lockup(fill = '#231F20') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 56" width="300" height="56"
     role="img" aria-label="AI Awareness Day 2027 — Keep Humans in the Loop">
  <text x="300" y="27" text-anchor="end" font-family="Inter, Helvetica, Arial, sans-serif" font-size="20"
        font-weight="700" letter-spacing="-0.4" fill="${fill}">AI Awareness Day 2027</text>
  <rect x="260" y="34" width="40" height="2.5" fill="${fill}"/>
  <text x="300" y="50" text-anchor="end" font-family="Inter, Helvetica, Arial, sans-serif" font-size="13"
        font-weight="500" letter-spacing="0.1" fill="${fill}" opacity="0.75">Keep Humans in the Loop</text>
</svg>\n`;
}

/* THE CHAMFER — the campaign's one structural motif, and the only shape in
   the system that is not a letter or an icon. A corner is cut at a little
   over a fifth of the shorter side. The panel cuts two opposite corners
   (top-right, bottom-left) so the block reads as sheared rather than merely
   clipped; the ballot tile cuts the top-right only, because at 76px two cuts
   read as a hexagon instead of a signature.

   It is written once here and exported as a shape file because it was living
   in two hand-typed forms — this path inside every poster, and a percentage
   polygon in css/customize.css — with no way to notice when one moved. The
   two are geometrically the same cut: 100/480 on the panel is 20.8%, and the
   tile rounds it to 22%. Keep them within a point of each other, and when the
   website needs the shape take it from shape-chamfer-*.svg rather than
   retyping the numbers a third time. */
const CHAMFER_PANEL = 'M0 0H380L480 100V490H100L0 390Z';
const CHAMFER_TILE = 'M0 0H59.28L76 16.72V76H0Z';   /* 76x76, 22% top-right */

fs.mkdirSync(OUT, { recursive: true });
/* The 2026-style broken-rule marks are gone: the brief replaced that system
   with a theme icon plus a name. Remove them rather than leave two identities
   in one folder for somebody to pick the wrong one from. */
fs.readdirSync(OUT).filter((f) => /^aiad27-(safe|smart|creative|responsible|future)\.svg$/.test(f))
  .forEach((f) => fs.unlinkSync(path.join(OUT, f)));

let n = 0;
Object.keys(ICONS).forEach((key) => {
  fs.writeFileSync(path.join(OUT, `icon-${key}.svg`), icon(key, ICONS[key]), 'utf8');
  fs.writeFileSync(path.join(OUT, `poster-${key}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 490"><path fill="#231F20" d="${CHAMFER_PANEL}"/><path fill="${STRAND[key]}" transform="translate(108 113) scale(11)" d="${ICONS[key]}"/></svg>\n`, 'utf8');
  n += 2;
});
fs.writeFileSync(path.join(OUT, 'aiad27-lockup.svg'), lockup(), 'utf8');

/* Three inks of the same drawing, because a brand kit is asked for the file
   and cannot apply a CSS filter. The decks keep using the plain ink one and
   let the shared data-ground rule reverse it — that stays the single source
   on a slide. These are for the website, print and anyone sent a folder.

   The coloured set is the strand's DEEP, not its bright. The lockup is type,
   and rule 1 of the contrast table says type on cream is black or deep and
   never bright: all five brights land between 1.53:1 and 2.50:1 on cream,
   which is the ground this mark is normally on. A bright lockup would be the
   one asset in the kit that fails the kit's own table. */
fs.writeFileSync(path.join(OUT, 'aiad27-lockup-reverse.svg'), lockup('#FFFFFF'), 'utf8');
n += 1;
Object.keys(DEEP).forEach((key) => {
  fs.writeFileSync(path.join(OUT, `aiad27-lockup-${key}.svg`), lockup(DEEP[key]), 'utf8');
  n += 1;
});

/* The chamfer on its own, at both the sizes the campaign uses it, so the web
   and print can reach for the shape without owning a copy of the geometry.
   currentColor, not a fixed ink: unlike the lockup these are used on every
   ground and have no reversal rule of their own. */
fs.writeFileSync(path.join(OUT, 'shape-chamfer-panel.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 490" role="img" aria-label="Chamfered panel"><path fill="currentColor" d="${CHAMFER_PANEL}"/></svg>\n`, 'utf8');
fs.writeFileSync(path.join(OUT, 'shape-chamfer-tile.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76" role="img" aria-label="Chamfered tile"><path fill="currentColor" d="${CHAMFER_TILE}"/></svg>\n`, 'utf8');
n += 2;
n++;
console.log(`Wrote ${n} assets to assets/brand/aiad27/ — five theme icons, five poster graphics, seven lockups (ink, reverse, five strands) and two chamfer shapes.`);
