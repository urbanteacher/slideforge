# What SlideForge can take from Claude Slides

The analysis behind backlog items **CS-01 – CS-19**.

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

**Built, version 1 (10 November 2026, `770dca4a`):** [lesson-format.md](lesson-format.md). One JSON file, not a file per slide: it is what a teacher downloads from an AI and imports in one step. Each slide names a layout and its words, and the studio builds it with that layout's builder. Fourteen layouts and a multiple-choice quiz; every problem is reported by slide number. AGENTS.md points agents at it. **Still open for "done when":** charts, diagrams, live figures and the other games as layouts, so a whole IPDV week fits.

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

**Built (10 November 2026, `a78cdd3a`):** the Slide panel's *Design check* (`lab/src/designs/designCheck.ts`) says when text is under 24px, under 4.5:1 contrast on the flat colour behind it (3:1 at 44px and up), or shrunk below 80% to fit (split the slide), and once when a lesson uses more than six steps of type size. Still open: the footer band and the vertical budget as rules, and the checks inside the AI writers.

### CS-03 · Never invent facts; leave placeholders — P1 · S–M

**In Claude Slides:** with no source material, Claude writes concrete draft text, puts bracketed placeholders like `[€__]` where a figure or name was not given, and lists them in its reply. It never invents a statistic or a quote.

**In SlideForge:** the backlog has recorded facts "from general knowledge rather than a checked source, and should be checked before teaching" (Studio 90, 15 October 2026). Nothing on the slide or in the show marks them.

**The change:**
- One placeholder convention for AI-written and builder-written slides.
- A per-slide "unchecked" mark that Review lists.
- The presenter warns about open placeholders or unchecked marks before the show starts.

**Built (9 November 2026, `b0fa402b`):**
- **The convention:** square brackets round two or more underscores, on one line: `[€__]`, `[year __]`, `[source __]`. AGENTS.md tells builder scripts and agents to use it.
- **Where it is found:** `lab/src/core/facts.ts` reads every string in each visible layer of each shown slide. Speaker notes and hidden slides are not read.
- **The mark:** `slide.factCheck = { note }`, set in the Slide panel's *Facts to check* section. The note says what to check and may be empty.
- **What the teacher sees:** an orange ? on the filmstrip thumbnail. When Present or Host live opens the show, a line in the show's own toast (the studio's toast sits under the show) and the full list in the Status tab. The show is never stopped.
- **Still open:** the lab's AI writers are not told yet. Their replies are JSON that a game runs, so a placeholder in a quiz answer needs a rule of its own first.

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

**Built (10 November 2026, `fb01269d`, `55dd800b`):**
- **Links to a slide:** a shared lesson opens at `#slide-N`, the address follows the slide, and the viewer's Link button copies it (`lab/src/viewer/state.ts` `readLink`, `slideHash`).
- **Private shares:** a signed-in teacher's studio share is kept in their account (`supabase/migrations/0002_shares.sql`), survives app updates, and is either open or for signed-in teachers only. The viewer reads it by id through `get_share()` (`lab/src/viewer/cloud.ts`), so shares cannot be listed. Signed out, shares go to the relay as before.
- **Comments on a slide:** dropped (10 November).
- **Still needed:** the migration run once in the Supabase SQL editor, then a signed-in share and a private link opened signed out, tried by hand. Withdrawing an online share has no screen yet; it is a row the teacher owns.

### CS-07 · Send a deck to other apps — P3 · S

**In Claude Slides:** Share › Export › Send to posts a deck to apps such as Google Drive and Canva.

**In SlideForge:** .pptx, PDF and HTML exports already cover most of the need. Worth doing only if a teacher asks for Drive.

**Built (10 November 2026, `fb01269d`):** File → Export → **Send to…** makes a PowerPoint (pictures or editable text) or a PDF of the student copy, then a second click hands it to the device's share menu: Drive, Teams, Mail, AirDrop. Where a browser has no share menu for files, it downloads. The PDF is written by `lab/src/export/pdf.ts`. Uploading straight into Drive or Canva is not built: it needs a Google Cloud OAuth client and a Canva developer app.

## 3. What not to take

- **Free positioning of elements.** It goes against the typed-layout rule in the README.
- **Speaker notes anyone can read.** SlideForge's teacher notes stay private.
- **A .pptx round-trip.** Live questions would not survive it (README).

## 4. Order

CS-03 first: it is small and stops a real risk in teaching. CS-01 next: it changes how every future deck is made. Then CS-02 and CS-05, which build on CS-01's format. CS-04 when there is room. CS-08 after CS-01. CS-06 and CS-07 are built (10 November).

## 5. How the two feel to use

Claude Slides' side comes from its instructions, not a hands-on trial.

| Stage | Claude Slides | SlideForge |
|---|---|---|
| Starting | Describe the deck in chat. Claude asks if the brief is thin, then writes the whole deck | Library, Gallery or Browse, then slide by slide. Big decks come from builder scripts |
| Editing | Mostly by asking ("make slide 7 a table"). Edits made in the page are kept | A full editor: filmstrip, layers, inspector, layouts, slide designs, timeline |
| Design | A design system sets colours, type and logos once | Themes, palettes, grounds, frames, text effects, motion: more control, more to learn |
| Feedback | Little: it does not check its own slides | The Status tab, fit warnings, facts to check (CS-03) |
| Presenting | Page through, with transitions and builds | Builds, the Teacher Presenter window, notes on a phone, drawing, overview, jump |
| Audience | None | Phones, 7 input kinds, 30 game styles, 54 activities, the wall, the report |
| Practice | None | Rehearse with a simulated class |
| Sharing | A private link, comments on a slide, links to a slide, Send to | Share links, handouts, PDF, pptx, MP4, HTML |
| Saving | On claude.ai | In the browser, and in the teacher's account when signed in (live since 15 October, [data-storage-plan.md](data-storage-plan.md)). Shares and reports still go at a deploy (that plan's step 6) |
| Languages | English and ten others | English |

**What follows:**
- **The first ten minutes are SlideForge's weak point.** Claude Slides goes from a sentence to a whole deck. Starting from a brief is now part of CS-05.
- **Asking for a change is the other gap.** That is **CS-08**: a request box in the studio, with each answer one undo step. It needs CS-01's text format so the AI can write a slide safely.
- **Saving is not a gap.** Sign-in and sync are built. What is left is shares and reports that survive a deploy.
- **Feedback and the room are SlideForge's strengths.** Keep them visible in anything built from this list.
- **Two gaps had no item:** the learning curve (**CS-09**, a guided first lesson or a simple mode) and languages (**CS-10**).

## 6. From how Claude Slides is built

These come from the type's architecture rather than its screens. SlideForge already has morph transitions, diagrams, a restore point when two devices disagree, and private teacher notes, so none of those is listed.

| Item | In Claude Slides | In SlideForge | The change |
|---|---|---|---|
| **CS-11** · slide limits | At most 200 elements a slide, 52 KB a drawing | No limits | Warn past 200 layers, 150 KB a drawing, 2 MB a picture or video, 5 MB a slide. **Done 10 November** (`58f6657e`, `lab/src/core/limits.ts`) |
| **CS-12** · a version stamp | Each deck pins the player version it was made for | Every deck says `version: 1`; older lessons are fixed by one-off converter steps | A real version and an upgrade step from each, with CS-04. **Done 10 November** (`f409fbb0`, `lab/src/core/version.ts`): an older lesson is upgraded as it opens, and one from a newer studio is warned about |
| **CS-13** · what a lesson needs | A deck declares what it uses (downloads, comments, a room) | Found out in class | Worked out from the lesson, not declared, so it cannot go stale. **Done 10 November** (`f409fbb0`, `lab/src/core/needs.ts`): a room and the internet; the show's notice says when one is not met |
| **CS-14** · pictures outside the deck | Pictures stored once, by fingerprint; slides point at them | Only the online copy does this; locally and in shares pictures sit inside the lesson | Store once everywhere. **Step 1 done 10 November** (`lab/src/app/pictureStore.ts`): in this browser each picture is stored once and lessons hold references, so autosaves write the words only. **Step 2 done 10 November** (`c5549eb2`): a share's pictures are sent apart from its lesson, so the limit is 7.5 MB for the words and each picture and 100 MB in all; signed-in shares need `0003_share_pictures.sql` run. (The 12 MB sync limit already counts a lesson without its pictures.) |
| **CS-15** · a live widget | A small sandboxed page on a slide (16 KB) | Experiments and live figures, built in code | A one-file widget layer, sandboxed. **Done 10 November** (`832a055b`, `lab/src/kinds/widget/`): up to 16 KB, scripts only, no network; runs in the show and Preview |
| **CS-16** · photo search | Searches a photo library and keeps the credit | Picture slots start empty | A search that keeps the licence and credit; needs a provider |
| **CS-17** · icons and connectors | Icon and connector elements an agent can write | Shapes and diagrams; not checked how far they go | Checked: shapes and diagrams had no icons and nothing joined two layers. **Done 10 November** (`461863db`): 117 Lucide icons, a connector that follows the layers it joins, and an `icons` layout in the lesson file |

## 7. How each app adds a feature

**Claude Slides** treats a slide as a small web page in a closed set of elements. A feature is a new element (`x-icon`, `x-connector`, `x-embed`) that its runtime draws, and the browser does the layout. Claude writes the element; editing by hand comes second.

**SlideForge** treats a slide as layers drawn on a canvas. A feature is a layer kind: its settings, its drawing, an inspector tab, a line in the registry, an Add entry, and often more. The widget needed a frame over the canvas in the show, and the connector needed a sync in the store, because a drawing saw only its own layer.

| | Claude Slides | SlideForge |
|---|---|---|
| Cost of a feature | Low: an element the browser lays out | Higher: a kind, drawn by hand |
| Text and layout | The browser's | Measured and fitted by the studio |
| Consistency | Up to the author | Strong: layouts and one grid |
| What a feature can do | Visual, and small sandboxed embeds | Anything, the live room included |
| One picture everywhere | Page and download | Editor, show, PowerPoint, PDF, video |

**For quick visual features, Claude's approach is cheaper. For a teaching tool with a live room, SlideForge's is right**: the canvas layers are what make the editor, show and exports agree and what games read. So SlideForge keeps its layers and makes each new one cheaper:
- **CS-18, web layers** (`lab/src/engine/web.ts`): a kind declares live web content, and the show frames it. Video links and widgets use it. **Done 10 November** (`dedd1306`).
- **CS-19, drawings that read their slide**: a kind may read its slide, and the renderer redraws it when the slide changes. Connectors use it. **Done 10 November** (`dedd1306`).
- **The lesson file stays the AI's way in** (CS-01): each new kind gets a layout there as it is built, as the widget and icons did.

## Change log

- **9 November 2026:** written from the Claude Slides type's instructions and a check of SlideForge's exports, themes and AI writers. Items CS-01 – CS-07 opened in [BACKLOG.md](BACKLOG.md).
- **9 November 2026:** CS-03 built (`b0fa402b`); its section records what was built and what is still open.
- **9 November 2026:** section 5 added, comparing how the two apps feel to use; CS-08 opened.
- **10 November 2026:** CS-06 (links to a slide, private online shares; comments dropped) and CS-07 (Send to…) built; CS-09 and CS-10 opened.
- **10 November 2026:** CS-01 version 1 built: the lesson file ([lesson-format.md](lesson-format.md)).
- **10 November 2026:** section 6 added (CS-11 to CS-17, from how Claude Slides is built); CS-11 built.
- **10 November 2026:** CS-12 and CS-13 built.
- **10 November 2026:** CS-14 step 1 built: pictures stored once, apart from the lesson, in this browser.
- **10 November 2026:** CS-15 built: the live widget layer.
- **10 November 2026:** CS-17 built: icons and connectors. Section 6 is done apart from CS-14's step 2 and CS-16.
- **10 November 2026:** section 7 added (how each app adds a feature); CS-18 and CS-19 built.
- **10 November 2026:** CS-02 built: the Slide panel's Design check.
- **10 November 2026:** CS-14 step 2 built: a share's pictures sent apart.
