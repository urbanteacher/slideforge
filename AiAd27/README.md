# AI Awareness Day 2027 — Keep Humans in the Loop

> **Your AI. Your Choices.**
>
> Five minutes. One important question. Better choices with AI.

Five starters, seven student-facing slides each, one identity. **The shift from 2026 is
awareness → agency.** 2026 helped students understand what AI is. 2027 asks
what we should let it do, decide and influence — and every starter ends with a
choice the student makes, not a fact they receive.

---

## The five starters

| Theme | Starter | Central question |
|---|---|---|
| **Safe** | Would You Tell an AI Your Secret? | Can an AI companion be trusted with feelings, images or information? |
| **Smart** | What Happens When AI Acts for You? | What changes when AI can send, book, buy and control? |
| **Creative** | Who Really Made It? | If AI produced most of it, who is the creator — and should its use be disclosed? |
| **Responsible** | Should AI Decide? | Which decisions can AI support, and which must always involve human judgement? |
| **Future** | What Skills Must Stay Human? | What should we keep developing rather than outsourcing? |

---

## Five Minutes to Think — the format

Seven student-facing slides per deck, the same sequence every time.

| # | Slide | Time | What it does |
|---|---|---|---|
| 1 | Title | — | The question, dominant, with the campaign lockup |
| 2 | Scenario | 30s | One realistic situation, two or three sentences |
| 3 | **Make your choice** | 45s | They vote **before** the explanation |
| 4 | Talk to someone | 90s | One question, in pairs — least clutter in the deck |
| 5 | The reveal | 90s | The concept, and the assumption it breaks |
| 6 | What to remember | 45s | Three short rules, numbered |
| 7 | Your choice | — | One personal action, then *Know it. Question it. Use it wisely.* |

**Slide 3 is load-bearing.** Voting before the reveal is what makes this a
lesson rather than a briefing. The options are on the wall as cards *and* in
the poll rail, so a room with no phones still votes — by hand, against
something it can see. `build.js` fails if either half goes missing, and pins
the whole sequence.

Slide 5 varies by deck, because the five arguments have five different shapes:

| Deck | Slide 5 | Why |
|---|---|---|
| Safe | What lies beneath | A private-feeling conversation, and the four risks under it |
| Smart | Versus | Chatbot against agent — answering against acting |
| Creative | Claim & source | A content credential, rendered as a slide |
| Responsible | Spectrum | Support at one end, human-only at the other |
| Future | Versus | Strengthening your thinking against replacing it |

Two further slides per deck are **hidden**: the teacher's preparation page and
the vocabulary. The brief asks for teacher guidance to be separate from what
students see and to live in the presenter notes — this does both, and neither
can be projected by accident.

**AI companion / data elicitation** · **AI agent / human in the loop** ·
**provenance / disclosure** · **human oversight / black box** ·
**metacognition / cognitive offloading**

---

## Sources

The four the brief names, and what each is doing.

**UNICEF, *When AI becomes a friend*** (policy brief, June 2026) — carries SAFE.
Names the four child-specific harms the reveal slide uses: emotional
dependence, **data elicitation**, harmful advice, sexualised role-play. Also the
figure that makes the topic normal rather than fringe: 20 million+ children
across 10 countries, taken up faster than adults.
[unicef.org](https://www.unicef.org/documents/when-ai-becomes-friend-child-rights-risks)

**Ofqual, *Using AI in marking*** (14 January 2026) — carries RESPONSIBLE, and
is **quoted verbatim** because the regulator's own words are stronger than any
paraphrase. AI is *"nowhere near ready to take over high stakes marking"*;
using it as the sole mechanism for awarding marks *"does not comply with our
current regulations"* because it fails the requirement for *"a human based
judgement"*. Its three tests — technical capability, fairness, transparency —
are in the presenter notes.
[ofqual.blog.gov.uk](https://ofqual.blog.gov.uk/2026/01/14/using-ai-in-marking-why-technical-capability-fairness-and-transparency-all-matter/)

**Content Credentials (C2PA)** — the provenance standard CREATIVE's beat 4 is
modelled on. [contentcredentials.org](https://contentcredentials.org/)

**EEF, metacognition and self-regulation** — plan, monitor, evaluate: the frame
for FUTURE's "strengthening or replacing?".
[educationendowmentfoundation.org.uk](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation)

UNICEF and Ofqual were read for this build. Content Credentials and the EEF
toolkit are used as concepts, not as sources of figures. **Nothing in these
decks carries an unsourced number** — the earlier draft did, and did not ship.

---

## The design

**Built from the chamfered square — the device the campaign already owns.**

That shape is not invented here. It is the container the AI AWARENESS DAY
lockup sits inside on the campaign's own poster, the tile repeated across that
poster's header, and the panel each cut-out photograph stands on. It is also
the geometry of the 2026 badge, once its four nested matrix transforms are
resolved: a square with two opposite corners — top-right and bottom-left — cut
at a quarter.

An earlier draft of this theme ignored all that and invented a broken rule
instead. It was coherent and it was not this campaign. The correction came from
looking at how the other two branded themes in this repo work: Northeastern
does not decorate with red, it bleeds its monogram off two edges at 900px; UKBT
does not decorate with green, it draws its chevron twice at the offset the real
lockup uses. **A theme that only recolours the app is a palette, not an
identity.**

So the chamfer appears at three scales, the same three the poster uses:

| | Where |
|---|---|
| **The slab** | 540px, bled off the cover's bottom-right corner, 12% — a ground, not a competitor |
| **The tiles** | three at 56px along the cover's foot, middle one hollow — the poster's header rhythm |
| **The components** | every card, stat tile and iceberg band, 24px cut — which is what makes it a system rather than a cover treatment |

A clipped box cannot carry a border — `clip-path` cuts the border off with the
corner — so the strand's colour edge comes back as a gradient inside the fill,
which survives the clip.

### Strand colour and icon

Each strand has both, because the brief requires that meaning is never carried
by colour alone. Name and icon appear together, top-left, on every slide.

| Strand | Block | Icon | Type uses |
|---|---|---|---|
| Safe | `#00A6A6` | shield | `#008383` |
| Smart | `#1F6FEB` | lightbulb | — |
| Creative | `#7A3FF2` | spark | — |
| Responsible | `#F0A500` | scales | `#9E6D00` |
| Future | `#16A34A` | path | `#12873D` |

A colour used as a filled block needs 3:1 on white; the same colour as type
needs 4.5:1. Only Smart and Creative clear both. **Amber is the trap** — at
2.08:1 it is too weak even as a block, which is why every block also carries an
ink label and the colour is never doing the work alone.

### Typography

The brief's floors, and they are floors: main questions 54–72, headings 40–52,
supporting text never below 28, labels never below 20. `app.css` runs supporting
text at 16–24 — right for a dense authoring tool, wrong for a projected
starter — so every supporting class the seven layouts use is raised.

Raising them **broke the Safe reveal**, pushing it 80px off the slide. That is
the floor working: it was fixed by cutting content, not type.

---

## Rebuilding

```bash
node AiAd27/make-marks.js    # five strand icons + the lockup → assets/brand/aiad27/
node AiAd27/build.js         # five bundles → AiAd27/bundles/
```

The icons are generated so they cannot drift: the only difference between them
is a path and a colour, and the geometry is written once. `bundles/` is gitignored, as `*.sfbundle.json` is everywhere in
this repo — `starters27.js` is the source of truth.

### Looking at it

Both need the dev server up (`npm start`).

```bash
node AiAd27/contact-sheet.mjs
node AiAd27/check-fit.mjs
```

**`check-fit` tests slide bounds, not internal collisions.** It passed all 15
slides of an earlier draft while the mark sat on a heading, claim rows ran
through their own source line, and two spectrum labels printed on top of each
other. Those were found by looking. Render the contact sheet and look at it —
the checker is a floor, not a verdict.

---

## Import

SlideForge → **File → Import → From a file** → any bundle in `bundles/`, or
`AiAd27-All-Five.sfbundle.json` for all thirty slides. They file themselves
under **AI Awareness Day 2027** in the Library.
