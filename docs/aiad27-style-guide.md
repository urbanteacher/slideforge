# AI Awareness Day 2027 — style and design guide

**Your AI. Your choices.** · *Keep humans in the loop*

Written 2026-09-16 from the built campaign, not from an intention. Every
colour, size and ratio below is read out of `css/aiad27.css`,
`css/customize.css` and `assets/brand/aiad27/`, and every contrast figure was
computed rather than judged. If the code and this document disagree, the code
is right and this is stale.

It exists so the website, print and anything else the campaign needs can be
built to the same system as the decks, by someone who was not there.

---

## 1. The idea in one line

Five strands of one campaign, each with a colour, a word and a mark. The
design is **three grounds and one typeface**, and the whole thing holds
together because the strand colour is used as a *ground* far more than as ink.

---

## 2. The three grounds

Every surface is one of three. There is no fourth.

| Ground | Value | Used for |
| --- | --- | --- |
| **Cream** | `#F6F4ED` | the working ground — anything with a list, a table, a comparison |
| **Ink** | `#231F20` | the quiet ground — a single human voice, a set of rules to remember |
| **Strand** | the strand's own colour | the loud ground — covers, the discussion question, the closing commitment |

Supporting values on cream: `--s-dim` `#54504E` for secondary text, `--s-rule`
`#C9C6BE` for hairlines, `--s-card` `#EAE7DF` for a raised panel.

The rhythm across a seven-slide starter is deliberate:

```
strand   ink      cream    strand   cream    ink      strand
cover    scenario ballot   discuss  reveal   rules    commit
```

Loud, quiet, working, loud, working, quiet, loud. **Never two strand-coloured
slides in a row** — the colour stops meaning anything.

---

## 3. The palette

Each strand has **two** values and they are not interchangeable.

| Strand | Bright | Deep | Word |
| --- | --- | --- | --- |
| Safe | `#00BEDD` | `#006A7D` | Safe |
| Smart | `#FF7038` | `#A7350B` | Smart |
| Creative | `#AC91FF` | `#6441B8` | Creative |
| Responsible | `#63DF93` | `#176E3B` | Responsible |
| Future | `#FA83EB` | `#983488` | Future |

**Bright is a ground and a graphic. Deep is ink.** That split is the single
most important rule in this palette, and it exists because all five brights
fail as text on cream — between 1.53:1 and 2.50:1. The deeps are the same hues
darkened until they clear 4.5:1, so anything the system decides to set in the
accent still reads.

In code: `--a27-color` is bright, `--a27-deep` is deep, and `--s-accent` —
which the shared renderer paints type with — is wired to **deep**.

---

## 4. The contrast rule, as a table

This is the part to check against before choosing any combination. Measured,
WCAG relative luminance.

### On cream `#F6F4ED`

| Ink | Safe | Smart | Creative | Responsible | Future |
| --- | --- | --- | --- | --- | --- |
| Black `#231F20` | **14.81** across all five |||||
| Strand **deep** | **5.68** | **6.04** | **6.38** | **5.73** | **6.00** |
| Strand **bright** | 2.03 ✗ | 2.50 ✗ | 2.31 ✗ | 1.53 ✗ | 2.01 ✗ |

### On ink `#231F20`

| Ink | Safe | Smart | Creative | Responsible | Future |
| --- | --- | --- | --- | --- | --- |
| Cream `#F6F4ED` | **14.81** across all five |||||
| Strand **bright** | **7.30** | **5.92** | **6.40** | **9.71** | **7.38** |
| Strand **deep** | 2.61 ✗ | 2.45 ✗ | 2.32 ✗ | 2.58 ✗ | 2.47 ✗ |

### On the strand colour itself

| Ink | Safe | Smart | Creative | Responsible | Future |
| --- | --- | --- | --- | --- | --- |
| Black `#231F20` | **7.30** | **5.92** | **6.40** | **9.71** | **7.38** |
| White `#FFFFFF` | 2.23 ✗ | 2.75 ✗ | 2.55 ✗ | **1.68** ✗✗ | 2.21 ✗ |
| Cream `#F6F4ED` | 2.03 ✗ | 2.50 ✗ | 2.31 ✗ | 1.53 ✗✗ | 2.01 ✗ |

### The four rules that fall out of it

1. **On cream, set type in black or in the strand's deep.** Never in bright.
2. **On ink, set type in cream or in the strand's bright.** Never in deep —
   the deeps were built for cream and go muddy on black.
3. **On a strand ground, set type in black.** Nothing light survives it.
   Responsible at 1.68:1 is effectively invisible.
4. **The bright is for ground, rule, badge, chart and icon — surfaces and
   shapes, never sentences.** That is what buys the brightness.

> **Known exception, documented on purpose.** The campaign decks set the small
> label above the headline in white on the strand ground (cover, discussion
> and commitment slides), at 24px/700 and full opacity. This is a deliberate
> design choice that fails the table above — worst case 1.68:1 on Responsible.
> It is legible at that size on a bright screen and is not carrying meaning
> that appears nowhere else. **Do not extend it to body copy, and do not
> assume it is safe in print.** If it has to be light, put it in an ink pill
> and reverse it out of that instead.

---

## 5. Typography

**AIAD Sans** — Uncut Sans by Kasper Nordkvist, SIL Open Font License 1.1,
bundled as woff2 rather than named and hoped for.

```
@font-face { font-family:'AIAD Sans'; src:url('UncutSans-Regular.woff2');  font-weight:400 }
@font-face { font-family:'AIAD Sans'; src:url('UncutSans-Semibold.woff2'); font-weight:600 }
@font-face { font-family:'AIAD Sans'; src:url('UncutSans-Bold.woff2');     font-weight:700 900 }
```

Fallback `Arial, sans-serif`. `font-display: swap`.

### The scale

| Token | px | Role |
| --- | --- | --- |
| `--a27-xs` | 18 | captions, the closing rule |
| `--a27-sm` | 22 | context lines, small labels |
| `--a27-base` | 24 | body |
| `--a27-lg` | 28 | supporting paragraph |
| `--a27-xl` | 33 | a numbered rule's heading |
| `--a27-2xl` | 48 | a ballot option's heading |
| `--a27-3xl` | 52 | section heading |
| `--a27-4xl` | 62 | the quoted voice |
| `--a27-5xl` | 68 | the discussion question |
| display | 112 / 86 / 72 / 60 | the cover headline, stepping down as the words get longer |

The display size is chosen by length, not by hand: ≤35 characters gets 112px,
then 86, 72, and 60 past 95. A long question shrinks rather than overflowing.

### How hierarchy is made

Size and weight, **not colour**. On a strand ground there is only one usable
ink, so the label above a headline is separated by being small, uppercase,
`letter-spacing: .14em` and 600 — the headline is 112px/700. That contrast of
scale does the work colour cannot.

Display type is tight: `letter-spacing: -.035em` to `-.052em` at the largest
sizes. Small caps labels go the other way, `+.14em`.

---

## 6. The marks

Nineteen SVGs, generated by `AiAd27/make-marks.js` into
`assets/brand/aiad27/`: five strand icons, five posters, seven lockups and two
chamfer shapes. **Regenerate rather than hand-edit** — the generator reads the
strand colours straight out of `css/aiad27.css`, so a colour can only be
changed in the place that paints with it.

Not everything the campaign draws is a file; see §6b.

### The lockup — `aiad27-lockup*.svg` (seven files)

Artboard **300 × 56**, drawn 1:1 with the box it is given so the sizes in the
file are the sizes on screen.

```
      AI Awareness Day 2027    20px / 700 / -0.4 tracking
                       ────    40 × 2.5 rule
    Keep Humans in the Loop    13px / 500 / +0.1 tracking, 75% opacity
```

**Set from the right edge.** Both lines and the rule are anchored at x=300, so
every element ends on the same vertical. This matters because the lockup sits
in the top-right corner against the closing rule's right end: left-anchored
type left 77px of empty artboard between the final *7* and the line below it,
so the box was flush and the ink was not. Anchoring beats trimming the board
to a measured width — the font is a fallback stack, so the same string is not
the same width on every machine, and the right edge has to hold on all of them.

The 20px/700 heading is deliberately identical to the strand name at the other
end of the header, so the two read as one line of furniture.

**Three inks, seven files:**

| File | Ink | Use |
| --- | --- | --- |
| `aiad27-lockup.svg` | `#231F20` | the default, and the only one the decks load |
| `aiad27-lockup-reverse.svg` | `#FFFFFF` | dark grounds where a filter is not available |
| `aiad27-lockup-<strand>.svg` | the strand's **deep** | on cream, when the mark should carry the strand |

Each file is a **single flat ink** — that is what lets the decks ship one file
and reverse it with `brightness(0) invert(1)`. **Do not add a second colour to
any of them**; it would break the reversal and there would be nothing the
strand versions could do that seven files do not already cover.

The coloured set is **deep, never bright**. The lockup is type, and rule 1 of
§4 says type on cream is black or deep — all five brights land between 1.53:1
and 2.50:1 there. A bright lockup would be the one asset in the kit that fails
the kit's own table.

*On a slide, keep using the plain ink file and let the ground reverse it.* The
other six exist for the website, for print, and for anyone sent a folder.

### The strand icons — `icon-<strand>.svg`

Artboard **24 × 24**, single path, filled with the strand's **bright** colour.

| Strand | Mark |
| --- | --- |
| Safe | shield |
| Smart | cursor / arrow |
| Creative | eight-point star |
| Responsible | balance scales |
| Future | rising stepped arrow |

They sit 22 × 22 beside the strand word in the header. **On a strand-coloured
ground they must be driven to ink** — the icon is the strand colour and so is
the ground. The decks do this with `filter: brightness(0)`.

*Known limitation for the website:* because the colour is baked into the file,
CSS cannot recolour it. If you need it to follow its context, use the SVG as a
`mask` with `background: currentColor` instead of as an `<img>`.

### The poster graphics — `poster-<strand>.svg`

Artboard **480 × 490**. A chamfered dark panel carrying the strand's symbol in
bright:

```
panel  M0 0 H380 L480 100 V490 H100 L0 390 Z      fill #231F20
symbol the 24×24 strand mark, scaled ×11, at (108,113), fill = bright
```

### The chamfer — `shape-chamfer-panel.svg`, `shape-chamfer-tile.svg`

The campaign's one structural motif, and the only shape in the system that is
not a letter or an icon. A corner is cut at a little over a fifth of the
shorter side.

| Form | Geometry | Cut | Corners |
| --- | --- | --- | --- |
| Panel | `M0 0H380L480 100V490H100L0 390Z` | 100/480 = **20.8%** | top-right **and** bottom-left |
| Tile | `polygon(0 0, 78% 0, 100% 22%, 100% 100%, 0 100%)` | **22%** | top-right only |

The panel cuts two opposite corners so the block reads as *sheared* rather
than merely clipped. The 76px ballot tile cuts one, because at that size two
cuts read as a hexagon instead of a signature.

Both files are `fill="currentColor"` — unlike the lockup these are used on
every ground and have no reversal rule of their own.

Keep the two cuts within a point of each other. They are the same intended
angle expressed twice, once as a path and once as a percentage, and the only
thing stopping them drifting is this row of the table and the shared constant
in `make-marks.js`.

Use the chamfer sparingly: the panel and the letter tile. It stops being a
signature if every box has it.

---

## 6b. The marks that are not files

Three of the campaign's largest marks are **glyphs, not artwork**. They are set
by the renderer as type, because they want the typeface's weight and optical
size and they change colour with their ground. Do not replace them with SVG;
do reproduce them exactly.

| Mark | Glyph | Class | Size | Colour |
| --- | --- | --- | --- | --- |
| Quotation | `"` U+201C | `.cp-quote-mark` | **230px**, line-height 1 | `--cp-color` → strand **deep** |
| Pair arrow | `↔` U+2194 | `.cp-pair-mark` | **130px** / 700, line-height .85 | inherits the ground's ink |
| Step number | `01`–`07` | `.cp-action-number` | **230px** / 700, tracking -.085em | inherits the ground's ink |

The quotation mark is absolutely positioned at `top:24px; left:0` and the
quote body is indented `padding-left:150px` to clear it — it hangs outside the
text block rather than sitting above it.

The pair arrow occupies a fixed **140px** first column of a two-column grid, so
the question beside it starts at the same x on every discussion slide
regardless of how long the question is.

**For the web:** these need the same font loaded, and `↔` in particular is not
in every fallback. If Uncut Sans is unavailable, set the arrow as an SVG path
rather than letting a fallback substitute a differently-weighted glyph.

---

## 7. Layout

### The header

```
[ icon + strand word ]        [ context line ]        [ lockup ]
        left                       centre                right
```

40px tall, all three items on one baseline, 20px/700 for the two identity
items. The context line is lighter at 22px/400. Reserve **330px** at the right
for the lockup.

### The closing rule

```
──────────────────────────────────────────────────────────
Keep humans in the loop                              04 / 07
```

A 1px rule, the campaign line left at 20px/700, the position right at 18px.
**The rule takes the colour of its ground**: ink on a strand colour, the
theme's grey on ink, the hairline grey on cream. A single grey everywhere
washes out on the bright grounds.

Numbering counts the slides the room sees, not the slides in the file.

### Spacing

Slide is 1280 × 720. Pad is `32px 52px 24px`. The 52px side padding is the
content edge — the lockup and the page number align to it, not to the slide
edge.

---

## 8. Voice

Short. Second person. A question wherever a question will do.

- *"Would you tell an AI your secret?"*
- *"Tomorrow the tool you use most is switched off. The work is still due."*
- *"Which part of your thinking have you quietly stopped practising?"*

Sentence case in body copy; the campaign line and strand names are the only
things that take caps. Labels above a headline are uppercase because they are
labels, not sentences.

The strand words are **Safe, Smart, Creative, Responsible, Future** — always
that order, always those five, never abbreviated.

---

## 9. Taking this to the web

What ports directly:

- The three grounds, the ten palette values, and the contrast table in §4
- The font stack and the whole scale in §5 — it is already CSS custom
  properties
- All nineteen SVGs, unchanged — and the lockup already ships in ink,
  reverse and five strand colours, so the site never needs a filter
- The chamfer, the header shape, the closing rule

What needs thought:

- **The display scale is built for a 1280 × 720 stage.** 112px is a cover
  headline on a projector; on a phone it is absurd. Keep the *ratios* and the
  length-driven stepping, re-anchor the sizes.
- **The strand-coloured ground is a full-bleed device.** A whole page of
  `#63DF93` is a lot. It works on a slide because a slide is eight seconds
  long. On a page, use it for a hero or a section band, with cream carrying
  the reading.
- **The white-label exception in §4 should not cross over.** On a slide it is
  seen from ten feet for a moment; on a page someone reads it. Use ink.
- **Icons need to become masks** if the site wants them to follow their
  context. See §6.
- **The glyph marks in §6b need the font.** `↔` is the risk: a fallback
  will substitute it at a different weight and it is 130px, so the
  substitution is not subtle. Draw it as a path if the font is not certain.

---

## 10. The five-second version

1. Three grounds: cream, ink, strand colour.
2. Bright is a ground. Deep is ink. Never swap them.
3. On a strand colour, type is black. Always.
4. One typeface, hierarchy by size and weight, never by colour.
5. The chamfer is the signature — panel and ballot tile, nowhere else.
6. Loud, quiet, working — never two loud slides together.
