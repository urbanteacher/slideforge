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

Nine or ten slides in the show, plus two or three held back as extension.

| # | Slide | What it is |
|---|---|---|
| 1 | Title | Cover, with the principle badge |
| 2 | **Statement** | The discussion question, full screen. *This is the 60 seconds.* |
| 3 | Stat tiles | The "Did you know?" numbers, sourced |
| 4 | **Cards** | The answers — revealed **one at a time** |
| 5–6 | *hidden* | The teacher pack's sub-question and its answers |
| 7 | Keywords | The two definitions, which were never on a slide before |
| 8 | Journey | The five takeaways, as a path |
| 9 | Key fact | The one line they leave with |
| 10 | Section | "If any of this affected you" — on an ink ground |
| 11 | Links | Reporting and support, every link live |

SMART has an extra slide: a **Versus** layout setting *predicting* against
*understanding*. It carries that starter's whole argument on its own.

FUTURE has a **Versus** too, for jobs changing against jobs growing.

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

The badge is redrawn rather than shipped. The original is a 2 KB SVG per
principle with the colour baked in and the geometry under four nested matrix
transforms; resolved, it is a clean quarter-grid construction — a square with
two opposite corners chamfered at a quarter, folded from the left edge to the
centre and then away at 45°. Five SVG files became two CSS clip-paths that take
their colour from the theme.

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
