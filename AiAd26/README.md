# AiAd26 — AI Awareness Day 2026 starters, in SlideForge

The five 5-minute lesson starters, converted from PowerPoint into SlideForge
decks. Same campaign, same statistics, same five principles — rebuilt so the
room can answer before it is told, and so the teacher does not have to hold a
Word document open while presenting.

---

## Run one

1. Open SlideForge → **File → Import → From a file**
2. Pick a bundle from `bundles/`:

   | File | Principle | Question it opens on |
   |---|---|---|
   | `AiAd26-Safe.sfbundle.json` | SAFE | If you couldn't tell whether a video of your friend was real… |
   | `AiAd26-Smart.sfbundle.json` | SMART | Does ChatGPT *understand* you? |
   | `AiAd26-Creative.sfbundle.json` | CREATIVE | If AI helped you make it, is it still yours? |
   | `AiAd26-Responsible.sfbundle.json` | RESPONSIBLE | AI uses electricity and water. Should we care? |
   | `AiAd26-Future.sfbundle.json` | FUTURE | What skills will make *you* valuable? |
   | `AiAd26-All-Five.sfbundle.json` | all five | one import, five decks |

3. Press **Present**. Open the **presenter view** on your own screen — every
   slide carries its run sheet there.

Nothing else needs setting up. The live polls are optional (see below).

---

## What is on each deck

Nine or ten slides in the show, plus three or four held back as extension.

| # | Slide | What it is |
|---|---|---|
| 1 | Title | Cover, with the principle badge |
| 2 | **Statement** | The discussion question, full screen. *This is the 60 seconds.* |
| 3 | Stat tiles | The "Did you know?" numbers, sourced |
| 4 | **Cards** | The answers — revealed **one at a time** |
| … | *hidden* | The teacher pack's sub-question and its answers |
| | Keywords | The two definitions, which were never on a slide before |
| | Journey | The five takeaways, as a path |
| | Key fact | The one line they leave with |
| | Section | "If any of this affected you" — on an ink ground |
| | Links | Reporting and support, every link live |

Four decks vary from that spine, each with a layout built for the shape its
content actually has:

- **SMART** — a **Versus** setting *predicting* against *understanding*. It
  carries that starter's whole argument on its own.
- **FUTURE** — a **Versus** for jobs changing against jobs growing (hidden).
- **RESPONSIBLE** — **What lies beneath** replaces the stat tiles: same numbers,
  same sources, but "you saw one line of text, here is what was under it"
  instead of three figures side by side. Then a **Spectrum** for the teacher
  pack's cost–benefit sub-question, which had no slide because it is a
  judgement about where things sit rather than a list.
- **SAFE** — a **Claim & source** on the deck's own "8 million" figure, three
  minutes after telling the room to check where things come from. Plus a
  hidden **Then / now / next** drawing 500,000 → 8 million as ×16.

Five of those layouts did not exist before this folder; see below.

### The hidden slides

Slides marked hidden are in the deck but out of the show. They are the teacher
pack's own "sub-questions" — extension material, and a five-minute starter has
no room for them. To use one: select it in the editor and unhide it.

Each deck also carries a hidden **Join QR & PIN** slide. Only needed if you are
running the live polls.

---

## The live polls (optional)

Every question slide carries a live activity in the rail:

| Deck | Question | Activity |
|---|---|---|
| SAFE | What would you do first? | Poll — 4 options |
| SAFE *(ext)* | How would you verify it? | Brainstorm |
| SMART | Does it understand you? | Poll — 4 options |
| SMART *(ext)* | Does it matter? | Scale, 1–5 |
| CREATIVE | Is it still yours? | Poll — 4 options |
| CREATIVE *(ext)* | What do you bring? | Word cloud |
| RESPONSIBLE | Should we care? | Scale, 1–5 |
| RESPONSIBLE *(ext)* | Who is responsible? | Poll — 4 options |
| FUTURE | What skill will matter? | Word cloud |

**You do not have to use them.** Every one of these slides works exactly as
well as a plain pair discussion — that is how the source decks ran, and the
words on screen are the same either way. Thirty phones joining can eat the
whole five minutes.

If you do want them: unhide the Join slide and move it to position 2, or open
the join panel from the presenter view without spending a slide on it.

Where a poll has a wrong answer worth catching, it is deliberate. SAFE's "send
it to a friend to check" is the option that feels responsible and is the one
that spreads the harm — the presenter notes say not to give that away until
after the vote.

---

## What changed from the PowerPoints

Faithful in content, different in shape. Every statistic, definition, question
and answer is the campaign's own.

**The answers no longer arrive all at once.** The source decks put six ticks on
one slide at 18pt, visible the instant the slide appeared — which ends the
discussion it just started, and is unreadable from the back of a hall. Each
answer set is now a progressive reveal: press → per card. Take the room's
answers first and reveal the card that matches.

**The teacher pack is now in the presenter view.** Learning objectives,
discussion prompts, misconception warnings, tone guidance and the "suggested
answers" all lived in a separate `Teacher Instructions.docx`. They are attached
to the slides they belong to. Every slide in all five decks carries notes.

**The definitions are on slides.** Deepfake, reverse image search, LLM,
hallucination, generative AI, authenticity, data centre, carbon footprint, AI
literacy, prompt engineering — ten definitions that existed only in the Word
document. Students can copy them down now.

**The question slides lost their answer.** In the source, the question slide
and the answer slide carry the same three-line heading, so the answer slide
spends half its height repeating what was just asked. The question is now a
full-screen statement and the answer slide gets its own heading.

**Restored punctuation.** The SAFE answer slide reads *"Don't share it with
others sharing spreads potential harm"* — the teacher pack's em dash was eaten
somewhere between the Word file and the deck, on all six lines. The Word
document's text is used throughout.

**Not uppercase.** The source sets the discussion questions in capitals. At
three lines that is the hardest thing in the deck to read — capitals remove the
ascenders and descenders a reader uses to recognise word shapes. Headings stay
in caps because they are short; the long questions are sentence case.

**Two support slides instead of two identical ones.** Both safeguarding slides
were pasted unchanged into all five decks, one of them a wall of eight URLs
that no one can act on from a projector. Now: one ink-ground slide that says
*you will not be in trouble for asking*, and one slide of six live links,
mental-health numbers first.

**Six links, not eight.** Eight two-line entries overflow a 16:9 slide, and the
two that fell off the bottom were Young Minds and Samaritans. NSPCC and
ThinkUKnow moved into the notes; the help lines stayed on the slide.

---

## The theme

Five themes sharing one design, in `css/aiad26.css` — pick the principle and
the deck takes its colour. Registered in the theme picker as
**AI Awareness · Safe**, **· Smart**, **· Creative**, **· Responsible**,
**· Future**.

The palette is the campaign's own, read out of the five source `.pptx` files
(`ppt/slides/*.xml`), not sampled off a screenshot:

```
SAFE         #00C4EE      ink     #1A1A2E
SMART        #FF6734      paper   #F7F9FC
CREATIVE     #795BFF      dim     #666666
RESPONSIBLE  #00A896
FUTURE       #FF7EED
```

**The badge is the designer's artwork, not a redraw.** The five SVGs live in
`assets/brand/aiad26/` and are carried in each deck's `logo` slot, so the mark
lands on every slide rather than only on the two full-bleed layouts.

An earlier version of this theme drew the badge in CSS from two clip-paths and
a rotated word, on the assumption that the five were one shape recoloured. They
are not: each principle puts its dark wedge somewhere different and sets its
word at its own angle — RESPONSIBLE reads bottom-to-top up the left edge, SAFE
runs down-right, SMART up-right. Standardising them lost the thing that made
each one its own mark.

`logoReverse: 'never'` and `logoSize: 'large'` on every deck. The first because
each badge already contains both grounds, so the invert `css/app.css` applies on
dark themes would flatten it to one white silhouette. The second because
`renderSlide` writes the logo height inline from that field — 72px at 'large' —
which a stylesheet cannot raise without `!important`, and a theme overriding an
author's own size control is the wrong way round.

**What the theme draws is the fold.** The badge geometry — a square cut by a
fold that runs flat and then away at 45°, with the opposite corner chamfered —
is taken at slide scale on covers and section breaks, bled off the bottom-right
corner with the seam at full strength. It takes the fold's *wedge* half, which
is bottom-heavy by construction: the first attempt scaled up the large half,
whose mass sits in its own top-left, and put a pale block straight through the
middle of every cover title.

**The accent does two jobs, so it is two tokens.** All five campaign colours
are too bright to set type in — on white they run 2.07:1 (cyan) to 4.42:1
(violet), every one under the 4.5:1 small text needs. And the app paints in
`--s-accent` as text far more often than as a ground: 90 `color:` rules across
the eight stylesheets against 35 backgrounds. Handing the brand cyan straight
to `--s-accent` gives an unreadable title on every game board.

So:

| token | value | used for |
|---|---|---|
| `--aiad-accent` | the campaign colour | graphics only — left rule, badge, accent bar, tile edge |
| `--aiad-deep` | same hue at 4.5:1 on white | wired to `--s-accent`; everything the app sets in type |

The deeps are the lightest value of each hue that clears 4.5:1, so they stay as
close to the brand as the threshold allows — `#00819d`, `#dd3800`, `#7658ff`,
`#008577`, `#d500b8`. They clear 4.5:1 the other way round too (white *on* a
deep), which is why there is no white-on-accent override block: an earlier
version had one forcing the `.cap-bar` family to ink, and against a deep accent
white reads 4.54:1 and ink only 3.76:1 — the override was making the thing it
existed to fix slightly worse.

On the ink section ground the logic reverses — the bright accents read 4.17:1
to 8.90:1 there and the deeps only ~4.0:1 — so `--s-accent` flips back to the
campaign colour for that one layout.

This was found by reviewing the generated baselines, which is what they are
for.

---

## Five layouts this built

All five are registered app-wide — any deck, any theme, in the picker under
Infographic (Spot the fake sits under Show & explore).

| Layout | The shape it is for |
|---|---|
| **What lies beneath** | One small visible fact, and the mass under it. Pits widen as they deepen and reveal one at a time, so the shape argues before the words do. |
| **Spectrum** | A continuum with named ends. The pit's value is a *position*, not a magnitude — every other info layout reads it as a size. |
| **Claim & source** | A claim, then who said it, when, on what basis, and what it leaves out. Rows build, so a claim comes apart in front of the room. |
| **Then / now / next** | One quantity across three or four moments, with the multiple between each pair worked out. A column with no number draws as a dashed unknown. |
| **Spot the fake** | Two images, one not real. The room commits before the tells appear. Reuses `exploration.before/after`, so no new field. |

**One trap worth knowing.** `SF.infoNumber` reads a leading numeral and stops,
which is right for `92%` and wrong for `8 million` — it returns 8. Then / now /
next drew 500,000 as a full-height bar beside a stub and labelled it −100%, so
it uses its own magnitude-aware reader. That reader is deliberately local:
`funnel` and the stat rings scale by `infoNumber` too, and changing what it
returns under existing decks is a separate decision from adding a layout.

## Rebuilding

The decks are authored as data in `starters.js` and built through the app's own
`SF.normalizeDeck`, so a slide here gets exactly the same treatment as a slide
built in the editor.

```bash
node AiAd26/build.js
```

Edit `starters.js`, rebuild, re-import. The build checks that nothing was
silently dropped — a field name the model does not recognise, a hidden flag
that did not survive, a poll that will not present — and exits non-zero if so.

**`bundles/` is not in git.** The repo ignores `*.sfbundle.json` everywhere —
the same decision already made for the IPDV lecture bundle: a bundle is a
snapshot, and the generator is the readable version. On a fresh clone, run the
build command above and the six files appear. `starters.js` is the source of
truth; edit that, never a bundle.

### Looking at the result

Both need the dev server up (`npm start`).

```bash
node AiAd26/contact-sheet.mjs
```

Renders all 61 slides to `AiAd26/preview/`, through the real renderer and the
real stylesheets. `--deck safe` for one.

```bash
node AiAd26/check-fit.mjs
```

Checks every slide actually fits a 1280×720 stage. This is the failure mode
this material is most exposed to: the content came from PowerPoint text boxes
that were free to spill, and a slide that runs 40px past the bottom looks fine
in an editor thumbnail and loses its last line on the wall. It is how the two
missing help lines were found.

---

## Source

```
~/Desktop/Ai Awareness Day/Starter Acivities/Lesson Starter - <Principle>/
    5min <Principle>.pptx        the slides
    5min <Principle>.pdf         same, as rendered
    Teacher Instructions.docx    the run sheet, definitions and teacher notes
```

Statistics are the campaign's, fact-checked to 2025 sources: HEPI, World
Economic Forum, European Parliament, European Commission, Thorn Research,
Nature Sustainability, IEA, MIT, PwC. Where the `.pptx` and the `.docx`
disagree, the `.docx` is used.
