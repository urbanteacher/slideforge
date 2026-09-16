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
| display | 88 / 86 / 72 / 60 | the cover headline, stepping down as the words get longer |

The display size is chosen by length, not by hand: ≤35 characters gets 88px,
then 86, 72, and 60 past 95. A long question shrinks rather than overflowing.

**88, not the shared ramp's 112.** The composition system's top step is 112px
and the campaign's covers were designed at 88; adopting the ramp wholesale
re-broke every cover headline onto more lines than it was drawn with.
`--a27-display-short` is the campaign saying so. The near-tie between 88 and
86 is deliberate — the first two steps are a nudge, not a jump, because a
cover that loses one word should not visibly change size.

### How hierarchy is made

Size and weight, **not colour**. On a strand ground there is only one usable
ink, so the label above a headline is separated by being small, uppercase,
`letter-spacing: .14em` and 600 — the headline is 88px/700. That contrast of
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

### The lockup — `aiad27-lockup*.svg` (twelve files)

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

**Twelve files, one drawing:**

| File | Ink | Ground it is for | Measured |
| --- | --- | --- | --- |
| `aiad27-lockup.svg` | `#231F20` | cream — and the only one the decks load | 14.81:1 |
| `aiad27-lockup-reverse.svg` | `#FFFFFF` | ink, where a filter is not available | 16.30:1 |
| `aiad27-lockup-<strand>.svg` | the strand's **deep** | **cream** | 5.68–6.38:1 |
| `aiad27-lockup-<strand>-bright.svg` | the strand's **bright** | **ink** | 5.92–9.71:1 |

**Two coloured sets, because the contrast table gives each one a ground and
neither covers both.** Deep on cream (the brights fail there, 1.53–2.50:1).
Bright on ink (the deeps go muddy there, 2.32–2.61:1) — and bright beats plain
white on dark, because it still says which strand it is. All twelve pass on
their paired ground; putting a set on the other one is the single way to get
an inaccessible lockup out of this kit.

Each file is a **single flat ink** — that is what lets the decks ship one file
and reverse it with `brightness(0) invert(1)`. **Do not add a second colour to
any of them**; it would break the reversal and there would be nothing the
strand versions could do that seven files do not already cover.

*On a slide, keep using the plain ink file and let the ground reverse it.* The
other eleven exist for the website, for print, and for anyone sent a folder.

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
| Rising arrow | `↗` U+2197 | `.cp-action-number` | **230px** / 700, tracking -.085em | inherits the ground's ink |

The quotation mark is absolutely positioned at `top:24px; left:0` and the
quote body is indented `padding-left:150px` to clear it — it hangs outside the
text block rather than sitting above it.

The pair arrow occupies a fixed **140px** first column of a two-column grid, so
the question beside it starts at the same x on every discussion slide
regardless of how long the question is.

The rising arrow is the commitment slide's mark. It sits top-left with
`padding-top:65px`, opposite the action the slide is asking for, and it is the
only one of the three that is decorative — it carries `aria-hidden`.

> **The class name lies.** `.cp-action-number` never holds a number. It is
> hard-coded to `↗` in `src/render/compositions.js` and always has been; the
> class is named for the slot, not its contents. This guide said "01–07" for
> exactly as long as it took someone to look at a slide. Read the renderer,
> not the class name, before assuming what a mark is.

**For the web:** these need the same font loaded, and `↔` and `↗` are not in
every fallback. At 130–230px a substituted glyph is not subtle — it will
arrive at a different weight and a different optical size. If Uncut Sans is
not certain, set them as SVG paths.

---

## 7. Layout

### The furniture: header, body, closing rule

**The pad is a flex column.** Header 40px, footer 32px with `margin-top:auto`,
body taking whatever is left. That one rule is the whole layout: the closing
line sits on the same baseline on all thirty-five slides no matter how much
copy is above it, because nothing positions it — the column pushes it down.
Anything that tries to place the footer absolutely is fighting this and will
drift the moment the body changes length.

```
┌────────────────────────────────────────────────────────────┐ ← pad 32px 52px 24px
│ ✦ Responsible        Five minutes to think    AI AWARENESS │ 40px header
│                                             Keep Humans... │   (330px reserved →)
│                                                            │
│   STARTER ACTIVITY                                         │ flex:1
│   Should AI decide?                                        │
│                                                            │
├────────────────────────────────────────────────────────────┤ 1px rule
│ Keep humans in the loop                            02 / 07 │ 32px footer
└────────────────────────────────────────────────────────────┘
```

| Part | Class | Specification |
| --- | --- | --- |
| Pad | `.slide.cp .pad` | padding `32px 52px 24px`, flex column, height 100% |
| Header | `.cp-header` | **40px**, flex space-between, 20px / 600, `flex:none` |
| Identity | `.cp-header::before` | strand icon 22×22 + name, 700, `padding-left:32px` |
| Context | `.cp-header .cp-beat` | 22px / 400, **centred on the slide**, max-width 560px |
| Corner reserve | `.has-corner-mark .cp-header` | `padding-right:330px` |
| Lockup | `.slide-logo` | max 300×56, `top:32px` — level with the header |
| Footer | `.cp-footer` | **32px**, `margin-top:auto`, 1px top rule, flex space-between |
| Campaign line | `.cp-footer-note` | 20px / 700, full-strength ink |
| Position | `.cp-footer .pagenum` | 18px, `--s-dim`, `margin-left:auto` when alone |

**The context line is centred on the slide, not on the space left over.**
`space-between` put it hard against the corner reserve, so it drifted with the
identity's length and sat about two thirds across — close enough to centre to
read as a mistake rather than a choice. It is absolute at `left:50%`, which
resolves against the header's *padding* box: that still spans the full
52px-to-52px content width even when the 330px reserve is on, so the line
lands on the slide's true centre whether or not a mark is in the corner. The
560px cap is the narrower of the two gaps it must clear.

**The 330px reserve is conditional.** It is on `.has-corner-mark`, not on
`.cp-header`, so a deck with no logo gets the full width back instead of a
third of its header held empty for a mark that is not coming. 330 = the
lockup's 300 plus a 30px gap.

**The rule takes the colour of its ground** — `--cp-rule` is ink on a strand
colour and the theme's grey elsewhere. A single grey everywhere washes out on
the bright grounds.

**The lockup's 300px and the 52px pad are the same edge.** The mark's right
edge and the closing rule's right end both land on x=1228, which is why the
lockup is set from its right edge (§6): anything anchored left stops short of
that line and the corner reads as unaligned.

Numbering counts the slides the room sees, not the slides in the file, and
covers are excluded — 30 of the 35 slides number themselves.

Numbering counts the slides the room sees, not the slides in the file.

### The comparison table

The campaign's only table, and it does not look like one.

```
┌──────────────────────────┬──────────────────────────┐
│ A person decides         │ A system decides         │  27px / 700
│ strand BRIGHT ground     │ INK ground               │  padding 16px 22px
├──────────────────────────┼──────────────────────────┤
│ Can be asked why         │ Can only be audited      │  25px / 400
│ Answers to someone       │ Answers to nobody        │  padding 13px 22px
└──────────────────────────┴──────────────────────────┘
```

| Part | Class | Specification |
| --- | --- | --- |
| Head row | `.cp-compare-head` | grid `1fr / 1fr`, gap 0 |
| Left head | `…h3:first-of-type` | 27px, padding `16px 22px`, **strand bright** ground, ink type |
| Right head | `…h3:last-child` | 27px, padding `16px 22px`, **ink** ground, ground-colour type |
| Cell | `.cp-compare-row p` | 25px / 400, line-height 1.13, padding `13px 22px`, 1px bottom rule |
| Divider | `…p:nth-child(2)` | 1px left rule — the only vertical line in the table |

**There is no outer border and no grid.** A single hairline under each row and
one down the middle, and that is all. The work is done by the two headers: the
left is the strand bright as a ground, the right is solid ink, so each column
is visibly claimed by a side before a word is read.

This is the one place the bright is used as a ground *inside* a component
rather than across a whole slide, and the one place two grounds meet on the
same line. Both carry ink or cream and both clear §4 — that is what makes the
device safe, and why it must not be extended to a bright *cell*.

A three-column variant exists: add `.labelled` to both rows for
`.65fr / 1fr / 1fr`, with the first cell set at 700 as a row label.

### The numbered row

The campaign's densest pattern, and the one place three type sizes meet.

```
105px        1fr
┌─────┬──────────────────────────────────────────────┐
│ 01  │ Bigger effect, more human                    │  33px / 700
│     │ The more a decision changes a life, the more │  25px / 400
└─────┴──────────────────────────────────────────────┘
```

| Part | Class | Specification |
| --- | --- | --- |
| Row | `.cp-rule` | grid `105px / 1fr`, gap 25px, padding `19px 0`, 1px top rule, centred |
| Index | `.cp-rule-number` | **66px / 700**, line-height 1, tracking -.05em, strand accent |
| Title | `.cp-rule h3` | **33px / 700**, line-height 1.07 |
| Supporting line | `.cp-rule p` | **25px / 400**, line-height 1.17, margin-top 8px, max-width 960px |

**The index is always two digits** — `01`, never `1`:

```
01  02  03  04  05  06  07     66px / 700 / -.05em / strand accent
```

The **105px first column is fixed**, so every title starts at the same x
however many rules the slide carries, and the two-digit index means the column
does not change width between the first row and the last. Rows are separated by a 1px rule, not by
a box around each — the campaign never draws a card where a line will do.

This slide is on ink, so the index lands in the strand's **bright** —
9.71:1 for Responsible. It is the clearest case for the bright lockup set
above: on a dark ground the bright is both the accessible choice and the one
that still says which strand you are in.

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
