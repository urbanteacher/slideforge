# Studio feature map — every Lesson studio feature, and where it lives in the lab

Written 2026-09-24. This is the checklist for the lab rebuild (`lab/`). It lists
every user-facing feature of the Lesson studio editor, says what each one does,
and says where it lives in the lab, or that it does not exist there yet.

The inventory comes from two sources:

- **The code:** `index.html`, `js/editor.js`, `js/shell.js`, `js/studio.js`,
  `js/palette.js`, `js/history.js`, `js/content-tools.js`, `js/slide-clip.js`
  and `src/editor/*`.
- **The running studio,** walked on the demo deck.

Quiz studio and Activities studio internals are out of scope; only the ways
into them from the Lesson studio are listed.

**Lab column key.** Each row's lab status is one of:

- **Slide**: done directly on the slide.
- **Chip**: a chip above the slide.
- **Dock**: the element toolbar at the bottom of the stage.
- **Panel**: the advanced panel (⌘\\), on its Slide, Element or Deck tab.
- **Add**: the Add pane or `/` menu.
- **⌘K**: the command palette.
- **Partial**: some of it.
- **Missing**: not in the lab.

---

## Read this first — what the lab is missing

The lab covers the everyday path well: typing, points, elements, layout, look,
theme, pictures, chart and table data, notes, and presenting. What it does not
have yet, ranked by how much a teacher would miss it:

1. **The whole Engagement tab.** There is no way to attach audience feedback
   (poll, word cloud, brainstorm, scale) or to add an activity or game to a
   lesson. This is SlideForge's core feature, so it is the most important gap.
2. **Running the room.** Host live, the Teacher Presenter window, and
   rehearsing with a sample class of 8, 30 or 120. The lab's Present is a plain
   slideshow.
3. **Files and saving.** Library, Save to Library, New, Import, History restore
   points and Share are all missing. The lab has one deck, saved in the browser
   and downloadable as JSON. That is right for a lab, but it means the lab can't
   replace the studio yet.
4. **Content for the complex slide types.** None of these have their fields in
   the lab:
   - video: URL, poster, start and stop, autoplay;
   - galleries: several pictures;
   - before/after: two images;
   - explore-an-image: details and zoom;
   - what-if graph: its parameters;
   - predict-and-compare: its states;
   - code: language and typing speed;
   - lecturer introduction: photo;
   - picture cards: a picture per card;
   - chart extras: predict-before-reveal, source and caveat, and the callouts
     that walk through a chart.

   People and journey rows, and three-column rows (stat tiles, timeline and
   versus), fall back to the studio's floating form.
5. **Canvas modes.** Artwork (move, size, hide or replace theme art) and Header
   & footer slots are missing. Arrange has drag and resize, but not the studio's
   arrange bar: fit to text, centre, split, duplicate and the anchors.
6. **The Motion pane's AI choreography** for statement slides, and **code
   arrival** (the lab has no code layer). Words arrive, speed, spacing,
   direction and loop are in the lab's Animate tab.
7. **Deck tools:**
   - Review (every slide's fit at once);
   - Find and Replace across the lesson (⌘F);
   - the slide sorter (⌘G);
   - hiding a slide from the show (H);
   - copying and pasting slides between decks;
   - the full layout library (the Layout chip offers related layouts only);
   - "Spread across slides" when there are too many points.
8. **Settings sheet leftovers:**
   - logo upload or URL;
   - logo on dark slides;
   - finish on the final scores;
   - the AI assistance status;
   - the Ready to teach checklist;
   - the ? shortcut sheet.

The lab also adds things the studio does not have. They are listed in §8.

---

## 1. Top bar

| Feature | What it does | Studio | Lab |
|---|---|---|---|
| Studio switch (Lesson · Quiz · Activities) | Switches between the three studios. | `index.html:74` | Missing |
| Title | Renames the lesson. | `shell.js:1298` | Slide (top bar) |
| Library folder chip | Shows the Library folder; click to open the Library. | `shell.js:626` | Missing |
| Save status | Saved / Saving… / Not saved. Clicking downloads the file. | `shell.js:768` | Partial (status only) |
| File → New… | Blank presentation or blank game. | `shell.js:1752` | Missing |
| File → Library… | Opens the Library. | `studio.js:826` | Missing |
| File → Save to Library… | Choose a folder, take a restore point, save. | `shell.js:676` | Missing |
| File → Export file | .sfdeck.json, student PDF handout, practice notes (.md), app folder, backup bundle. | `shell.js:1314` | Partial (.json from ⌘K or Deck tab) |
| File → Import file | SlideForge file, Markdown outline, app folder, backup bundle. | `shell.js:1361` | Missing |
| File → Lecture setup… | Session reports, wake the server, AI smoke test, reload lesson, clear browser data, join and app links. | `shell.js:1425` | Missing |
| History | Restore points: keep one now, restore any, clear all (16 kept). | `shell.js:1633` | Missing (undo only) |
| Settings | Presentation settings (§6). | `shell.js:1743` | Partial (Panel → Deck) |
| Share | Practice, read at own pace, live follow-along, QR codes. | `share.js:18` | Missing |
| See the demo | A fresh copy of the layout bank. | `studio.js:31` | ⌘K → Reset the lab |
| Host live | Starts a live room with phones. | `shell.js:1811` | Missing |
| Present | Slideshow from the selected slide. | `editor.js:2267` | Slide (Present · P) |
| Present ▾ → Teacher Presenter | Pops out the presenter window and starts the show. | `editor.js:2835` | Missing |
| Present ▾ → Rehearse (8 / 30 / 120) | Practise with a sample class. | `editor.js:2283` | Missing |

## 2. Slide list (left rail)

| Feature | What it does | Studio | Lab |
|---|---|---|---|
| Go-to field `n / total` | Type a number to jump to it. | `rail.js:410` | Partial (⌘K, type a number) |
| Slide sorter ▦ (⌘G) | Whole deck as tiles: select runs, drag groups. | `rail.js:619` | Missing |
| Select, drag to reorder | Click a row; drag it to a new place. | `rail.js:445` | Slide |
| Section fold ▾ | Folds a section's slides away. | `rail.js:472` | Slide |
| ⠿ grip / ⌘X carry | Pick a slide up and drop it with keys or a click. | `rail.js:492` | Partial (drag only) |
| 👁 Hide from the show (H) | Keeps the slide in the deck but out of the show. | `rail.js:503` | Missing |
| Badges | Game or missing game, feedback attached, activity phase. | `rail.js:517` | Missing |
| Transition icon | Shows the slide's transition. | `rail.js:546` | Missing |
| Transition in (rail footer) | None, Fade, Push, Zoom, Wipe, Morph. | `rail.js:900` | Panel → Slide |
| + Slide | Opens Slide starters. | `rail.js:922` | Add (+ New slide) |
| Right-click menu | The slide menu (§3.2). | `editor.js:2418` | Partial (§3.2) |

## 3. Inspector

### 3.1 Tabs and faces

| Feature | What it does | Studio | Lab |
|---|---|---|---|
| Design & content tab | The faces, the four panes and their content. | `editor.js:813` | Replaced by slide + chips + Panel |
| Engagement tab | Games, activities and audience feedback (§3.8). | `editor.js:1824` | **Missing** |
| Undo / Redo | Edit history in one-second bursts. | `editor.js:846` | Slide (top bar, ⌘Z) |
| ◈ Theme | Presentation settings. | `editor.js:888` | Chip (theme picker) + Panel → Deck |
| ◱ Review | Every slide at once, with fit results. | `review.js:73` | Missing (fit badge for one slide) |
| ◇ Artwork | Move, size, hide or replace theme art (§4.3). | `artwork.js:475` | Missing |
| ▦ Arrange | Blocks on the grid (§4.4). | `arrange.js:1158` | Partial (Arrange chip: drag and resize) |
| ▣ Header & footer | The six slots (§3.9). | `panes.js:195` | Missing |

### 3.2 The ⋯ Slide menu (also right-click)

| Item | What it does | Lab |
|---|---|---|
| Duplicate ⌘D | Copies the slide in after itself. | Slide (right-click, ⌘D) |
| Copy ⌘C / Paste after ⌘V | Slides between decks, through the clipboard. | Missing |
| Hide from the show (H) | See §2. | Missing |
| Move up / down ⌥↑ ⌥↓ | Moves one place. | Slide |
| Fold / show this section | Section slides only. | Partial (click the section head) |
| Move this section up / down | Moves the section and its slides together. | Missing |
| Present from here ⌘↵ | Starts the show here. | Slide (right-click, P) |
| Delete | Deletes the slide. | Slide (right-click, ⌫) |

### 3.3 Edit pane: words and rows

| Feature | What it does | Studio | Lab |
|---|---|---|---|
| Heading, subtitle, body, quote, statement | Text fields. | `content-fields.js:497` | Slide (click and type) |
| Points / cards rows: grip, ↑ ↓, ×, + Add | Reorder, remove, add. | `editor.js:1293` | Slide (grip, +, Enter, Backspace, ⌥↑ ⌥↓) |
| Keywords / phrase / links (two-part rows) | Term and definition, and similar. | `editor.js:1323` | Slide (each half typed in place) |
| Paste several points → Insert points | One point per pasted line. | `content-tools.js:15` | Slide (paste onto the slide) |
| Spread across slides | Splits too many points over several slides. | `content-tools.js:31` | Missing |
| Format bar (B I U ▰ Clear, colour, link) | Formats selected words. | `customize.js:130` | Slide (the same bar) |
| "This layout is not showing…" → Show it | Brings back content the layout hides. | `editor.js:1153` | Partial (Panel → Slide → Fit report lists it) |

### 3.4 Edit pane: content for each slide type

| Slide type | Fields in the studio | Lab |
|---|---|---|
| Title, section, bullets, cards, statement, quote, key fact, split | Text and rows. | Slide |
| Keywords, italics, links | Two-part rows. | Slide |
| Chart | Type (20 kinds), data. | Slide (click the chart → sheet) + Chip |
| Chart extras | Predict before revealing, source and caveat, pictogram icon, walk-the-chart callouts. | **Missing** |
| Table | Rows. | Slide (sheet) |
| Table: first row is a header | Header toggle. | Missing |
| Image | Picture, fit. | Slide (click the picture, drop, paste) |
| Image: caption, credit, Flip to facts | | Partial (caption on the slide; the rest missing) |
| Image + text | Swap sides. | Slide (picture menu) |
| Stat tiles, timeline, versus, funnel, spectrum, iceberg, claim & source, then/now/next | Three-part rows. | Partial (studio's floating form) |
| Journey, mind map | Milestones, branches, Show as. | Partial (floating form; Show as missing) |
| People & structure | Name \| Role \| Reports to \| photo. | Partial (floating form) |
| Lecturer introduction | Name, job, intro, photo. | Partial (text only) |
| Gallery | Up to 8 pictures with captions. | **Missing** |
| Before / after | Two images and labels. | **Missing** |
| Explore an image | Details, positions, zoom. | **Missing** |
| What-if graph | Relationship, labels, range, a and b. | **Missing** |
| Predict and compare | Demonstration, states, visuals. | **Missing** |
| Video | URL, poster, start and stop, fit, autoplay, loop, muted. | **Missing** |
| Code | Language, source, type on enter, speed. | Partial (text only) |
| Game slide | Choose a game, edit in Quiz studio, replace. | **Missing** (drawn as a named card) |

### 3.5 Added elements (+ Item in the studio)

| Feature | What it does | Studio | Lab |
|---|---|---|---|
| Add: heading, text, note, points, image, label and value, quote, chart | Puts an element on the slide's grid. | `arrange.js:713` | Dock (H T L I C Q N) and `/` |
| Selected element: size | Display → small. | `editor.js:653` | Panel → Element |
| Selected element: picture, fit, focus | | | Panel → Element |
| Selected element: frame, image motion | | | Missing |
| Selected element: chart type | | | Panel → Element + sheet |
| Duplicate element | | | Missing |
| Delete element | | | Slide (bin handle, right-click, ⌫) |

### 3.6 Look pane

Every control in `DESIGN_CONTROLS` (`src/design-controls.js`), shown only for
the slide types it applies to: composition, alignment, size, text colour,
background, the image and caption settings, card and tile styles, funnel and
timeline shape, backdrop motion, Build on Next, chart motion and focus, code
arrival, model answer, and Reset.

| Lab |
|---|
| **Chip** for alignment, size, text colour, background and the type's first two settings, with the rest under More. **Panel → Slide → Every look setting** has all of them, with their descriptions. |

### 3.7 Layout and Motion panes

| Feature | What it does | Lab |
|---|---|---|
| Try another look | Three alternatives drawn with this slide's words. | Chip (Layout: every composition and related type) |
| Layout library | Every layout, grouped, with fit badges. | Partial (Add inserts new slides; no switch-to-any-type; no fit badges) |
| Transition in | Six transitions, Morph among them. | Panel → Slide, Morph included |
| Words arrive / speed / spacing / direction / loop | Statement slides. | Animate (word, letter or line entrance; Speed, Spacing, Order, Leave again) |
| AI choreography | Writes the word timing from a brief. | **Missing** |
| Build on Next: off, on, dim, spotlight | A point, row, card or picture per press. | Animate → Build, on every layer: a line per click for text, an item per click for a set of cards, rows or choices, greyed with the reason where neither applies |
| Chart motion | The chart draws itself when the slide arrives. | Animate → Effect → Draws itself |
| Code arrival and typing speed | All at once, types itself, a line per press. | **Missing** (no code layer) |

### 3.8 Engagement tab

| Feature | What it does | Lab |
|---|---|---|
| + Add activity | The 36-format activity catalogue. | **Missing** |
| Insert a saved game… | Puts a saved game in the lesson. | **Missing** |
| Audience feedback: poll, word cloud, brainstorm, scale | Phones answer on this slide. | **Missing** |
| Preview as (beside / full screen) | How the feedback is shown. | **Missing** |
| Prompt, poll options, scale ends and points, responses each | The settings for each kind of feedback. | **Missing** |

### 3.9 Header & footer

Six slots (header and footer × left, centre, right). Each takes text, an image,
the logo, a page number, the date, the tagline, the title or the section
title. It applies to the deck or to one slide, and can hide on covers.

| Lab |
|---|
| **Missing** |

## 4. Canvas

| Feature | What it does | Studio | Lab |
|---|---|---|---|
| Click words to edit in place | Types directly on the slide, with the format bar. | `editor.js:482` | Slide (caret lands where you click) |
| Floating content form | For blocks that can't be typed in place. | `customize.js:721` | Slide (same form, as a fallback) |
| Drag bullets | Reorders points. | `editor.js:508` | Slide (grip) |
| ⇄ swap sides | Image + text slides. | `editor.js:553` | Slide (picture menu) |
| Header/footer ✥ handles | Move items between slots. | `canvas-regions.js:44` | Missing |
| Paste an image | Onto the slide, or converts the slide. | `editor.js:358` | Slide (also drop a file) |
| Zoom (50–200%, Fit) | | `shell.js:117` | Slide (top bar) |
| Panel toggle ⌘\\ | Hides or shows the inspector. | `shell.js:138` | Slide (panel button, ⌘\\) |
| + Add activity | Activity catalogue. | `studio.js:815` | **Missing** |
| Speaker notes strip | Notes, with a dot when there are some. | `shell.js:565` | Chip (Notes) |

### 4.3 Artwork mode — Missing

In the studio: drag shapes and pictures; resize them with − and +; place them
freely or on the grid; put them behind or in front; hide or show; add your own
picture; reset to the theme; arrow-key nudging.

### 4.4 Arrange mode — Partial

| Lab has | Lab is missing |
|---|---|
| Drag and corner-resize on the grid (the same `SF.Arrange`). Exact column, row, width and height in Panel → Element. Show hidden blocks. | The arrange bar: size buttons, Fit to text, Across / Down anchors, Centre, In rows, Split, Duplicate, Reset to theme. |

## 5. Sheets and dialogs

| Sheet | What it does | Lab |
|---|---|---|
| Slide starters | A card for every starter, including the ten explainer scenes. | Add (one card per type; no per-starter variants) |
| Activity catalogue | 36 formats in 8 filters. | **Missing** |
| Library | Folders, find, rename, move, delete. | Missing |
| Review | Every slide's fit, with navigation. | Missing |
| Find in this lesson ⌘F, with Replace everywhere | Searches all text and notes. | Partial (⌘K finds slides by title) |
| Share | Practice, own pace, live follow-along. | Missing |
| History | Restore points. | Missing |
| Command palette ⌘K | Every command. | ⌘K (the lab's own) |
| Shortcut sheet ? | Every key. | Missing (keys are listed in `lab/README.md`) |
| Host live lobby | QR, PIN, teams, start. | Missing |
| Changed in another tab | Load theirs or keep yours. | Missing |

## 6. Presentation settings (Theme face)

| Setting | Lab |
|---|---|
| Theme | Chip (this slide in all 23 themes) |
| Lesson logo upload or URL, remove | Missing |
| Logo size, show logo on | Panel → Deck (when a logo exists) |
| Organisation | Panel → Deck |
| On dark slides | Missing |
| Slide shape 16:9 / 16:10 / 4:3 | Panel → Deck |
| Show slide numbers | Panel → Deck |
| Finish on the final scores | Missing |
| AI assistance status and smoke test | Missing |
| Ready to teach checklist | Missing |

## 7. Keys

| Keys | Studio | Lab |
|---|---|---|
| ↑ ↓ / J K between slides | ✓ | ✓ |
| ⌥↑ ⌥↓ move slide | ✓ | ✓ |
| ⌥Home / ⌥End | ✓ | Missing |
| ⌘X carry | ✓ | Missing |
| ⌘C / ⌘V slides | ✓ | Missing (⌘V pastes pictures and points) |
| ⌘D duplicate | ✓ | ✓ |
| H hide | ✓ | Missing |
| ⌫ delete | ✓ | ✓ (the selected element first) |
| ⌘Z / ⇧⌘Z | ✓ | ✓ |
| ⌘G sorter · ⌘F find | ✓ | Missing |
| ⌘↵ / F5 present | ✓ | P |
| ⌘E switch studio | ✓ | Missing |
| ⌘K palette · ⌘\\ panel | ✓ | ✓ |
| ⌘⌥= / ⌘⌥− zoom | ✓ | Missing (buttons only) |
| ? shortcuts | ✓ | Missing |

## 8. In the lab and not in the studio

- **Midnight chrome**, with a daylight toggle.
- **The stage is only the slide.** Layout, notes and data open on demand.
- **Typing like a document:**
  - Enter makes a new point; Backspace joins two points.
  - ↑ ↓ and Tab move between blocks.
  - An empty point gets a line to type into.
- **The `/` menu:** turn the slide into another kind, add a slide, or add an
  element.
- **Look chips** above the slide. They drive the studio's own controls.
- **Layout chip:** this slide in every composition and related type.
- **Theme picker:** this slide shown in every theme.
- **Chart and table sheet:** paste a block from a spreadsheet; drag the sheet
  by its header.
- **Picture on the slide:** drop a file on the slide, or click the picture for
  its menu.
- **Phone preview** in the deck's colours, with a contrast check.
- **Advanced panel** that follows the selection:
  - exact grid position;
  - a Layers list with hide and show;
  - a full fit report.
- **Element dock:** H T L I C Q N shortcuts.

## 9. Found while mapping (studio defects)

- **⌘S is labelled wrong.** The shortcut sheet and the palette call it "Save
  to the Library", but it does a plain save, says "Nothing to save" when
  unchanged, and never asks for a folder (`shell.js:1940`).
- **Wiring to buttons that no longer exist.** `shell.js` wires `btnFind`
  (1621), `btnShare` (1732) and `btnRailSettings` (1749), but none of those ids
  exist in `index.html`. Find is keyboard-only because of this.
- **A stale hint.** The game-slide panel still says "under the rail ⚙"
  (`editor.js:1813`); that button was removed.
- **Transition in appears three times:** rail footer, Motion pane, and the
  game-slide panel.
- **"Try another look" is inconsistent.** It switches the layout without
  asking; the layout grid below it asks first (`editor.js:1259` vs `2046`).

## Change log

- **2026-09-24.** Written from a full code sweep and a walk of the running
  studio. Nothing actioned.
- **2026-09-24.** Motion parity. Build is always shown in Animate and gains
  spotlight and a set build for cards, rows and choices; word entrances gain
  Speed and Spacing; charts can draw themselves; Morph carries shared pictures,
  charts and words across. §3.7 and item 6 updated. AI choreography and code
  arrival are still missing.
