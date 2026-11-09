# What SlideForge can take from Claude Slides

The analysis behind backlog items **CS-01 – CS-07**.

Claude Slides is the slide-deck Artifact type built into claude.ai: you describe a deck in chat and Claude writes it as 16:9 slides you can present, share as a private link, and download as .pptx or PDF. It makes general presentations. SlideForge is a teaching tool with a live room. Most of what makes SlideForge worth having (phone answers, games, activities, reports) has no equivalent there. But the way Claude Slides is *built for an AI to write* is worth learning from.

This compares the type's published instructions (its `SKILL.md`, read on 9 November 2026) with SlideForge as it stands. No Claude Slides deck was made for a side-by-side trial.

## 1. What SlideForge already has

These need no work. They are listed so nobody opens an item for them:
- **PowerPoint export:** `lab/src/export/pptx.ts` (each slide as a picture, with editable text boxes where the words allow).
- **Video export:** `lab/src/export/mp4.ts`, `video.ts`, and `tools/motion/` for clips.
- **Handouts and PDFs:** `lab/src/export/handout.ts`, `tools/export-teaching-pdf.mjs`.
- **Themes and palettes:** `lab/src/theme/`, `src/themes.js`.
- **Overflow checking:** the fit check ([fit-check.md](fit-check.md)).
- **AI writing for questions:** `js/ai.js` `AI_SPECS`, `lab/src/designs/gameAI.ts`, `activityAI.ts`.
- **Teacher notes kept from students.** In Claude Slides anyone who opens a deck can read the speaker notes. Keep SlideForge's separation.

## 2. What to take

### CS-01 · A slide format an AI can write directly — P1 · L

**In Claude Slides:** a deck is a small index (`deck.json`: title, slide order, sections, typefaces) plus **one small HTML file per slide**. Each slide uses a closed, documented subset of elements and inline styles on a fixed 1920×1080 canvas, and anything outside the subset is dropped on read. Any agent can add or revise one slide without touching the others. A revision sends only the files that changed.

**In SlideForge:** each built deck has its own builder script (`tools/build-ipdv-week4.js`, `build-youth-charter-ai.js`, `build-prl-townhouse.js`, `build-ai-overview.js`, `tools/ipdv-week5/lesson.js`, …). Each one is code that a person or agent must read, write and keep working.

**The change:** a documented, text-based lesson format that an agent writes and the Lesson studio imports. Keep the typed layouts as the vocabulary (a `quote` slide, an `image` slide, a `quiz` slide), not free positioning. The README rules out a freeform canvas, and this does not change that. One file per slide, plus an index for order, sections and theme. Unknown fields are reported, not silently kept.

**Done when:** a new IPDV week can be written as these files and imported without a builder script, and AGENTS.md points agents at the format.

### CS-02 · Design rules the editor can check — P2 · M

**In Claude Slides,** the rules are numbers:
- no text under 24px on the 1080px canvas;
- text holds 4.5:1 contrast on its background (3:1 at 44px and up);
- one type scale of four or five sizes, and one to three typefaces;
- a footer band (page number, source) as one pinned row near the bottom, with nothing else below it;
- a vertical budget: a heading takes about size × lines × 1.1, a character about 0.6 × its size across;
- **too much text means split the slide; nothing shrinks.**

**In SlideForge:** the fit check measures overflow after a slide is laid out, and the lattice resizes text down rungs.

**The change:** run these rules as checks in the studio's Review and in the AI writers, before layout. A slide that breaks one gets a warning naming the rule. Where the fit check would shrink the text, it suggests splitting the slide.

### CS-03 · Never invent facts; leave placeholders — P1 · S–M

**In Claude Slides:** with no source material, Claude writes concrete draft text, puts bracketed placeholders like `[€__]` where a figure or name was not given, and lists them in its reply. It never invents a statistic or a quote.

**In SlideForge:** the backlog has recorded facts "from general knowledge rather than a checked source, and should be checked before teaching" (Studio 90, 15 October 2026). Nothing on the slide or in the show marks them.

**The change:**
- One placeholder convention for AI-written and builder-written slides.
- A per-slide "unchecked" mark that Review lists.
- The presenter warns about open placeholders or unchecked marks before the show starts.

### CS-04 · Themes as pinned files — P2 · M

**In Claude Slides:** a design system is a tokens file plus its fonts and pictures. It is copied *into* the deck along with the system's version and the date it was copied, so the deck keeps its look when the system changes.

**In SlideForge:** themes and palettes live in code (`lab/src/theme/palettes.ts`, `src/themes.js`, `css/variant-themes.css`). Changing the default theme on 25 October changed every deck already on it. That was intended then, but no deck can opt out.

**The change:** a deck records the theme version it was made with, and a theme change is offered as an update, not applied silently. Decide first whether the copy lives in the deck or in a versioned theme registry.

### CS-05 · An outline before any slides — P2 · M

**In Claude Slides:** before writing slides, Claude fixes an outline (one sentence per section), the length, the audience and the layouts to repeat, and asks questions when the brief is thin.

**In SlideForge:** the AI writers produce questions and game content, not the shape of a lesson. SD-04 (the AI story builder) is the nearest planned item.

**The change:** an outline step for AI-built lessons: sections, one sentence each, a timing per section, and where the live moments fall. It is edited in the studio, then filled. Build it with SD-04, not beside it.

### CS-06 · Links to a slide, and comments on a slide — P3 · S–M

**In Claude Slides:** a link can open a given slide (`#slide-7`), and comments can be attached to a slide, which helps when a co-teacher reviews a deck.

**In SlideForge:** not checked. Check what the share link and the viewer already do before building anything.

### CS-07 · Send a deck to other apps — P3 · S

**In Claude Slides:** Share › Export › Send to posts a deck to apps such as Google Drive and Canva.

**In SlideForge:** .pptx, PDF and HTML exports already cover most of the need. Worth doing only if a teacher asks for Drive.

## 3. What not to take

- **Free positioning of elements.** It goes against the typed-layout rule in the README.
- **Speaker notes anyone can read.** SlideForge's teacher notes stay private.
- **A .pptx round-trip.** Live questions would not survive it (README).

## 4. Order

CS-03 first: it is small and stops a real risk in teaching. CS-01 next: it changes how every future deck is made. Then CS-02 and CS-05, which build on CS-01's format. CS-04, CS-06 and CS-07 when there is room.

## Change log

- **9 November 2026:** written from the Claude Slides type's instructions and a check of SlideForge's exports, themes and AI writers. Items CS-01 – CS-07 opened in [BACKLOG.md](BACKLOG.md).
