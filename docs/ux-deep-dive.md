# UX deep dive — SlideForge against Google Slides, Figma Slides and the GitHub tools — 22 September 2026

A walk through the running app (1440 × 900, demo deck, 97 slides) and the phone
join page, set against what Google Slides, Figma Slides, Pitch, Gamma, Slidev,
reveal.js, Marp and the classroom tools (Mentimeter, Nearpod, Pear Deck, Kahoot,
ClassPoint, Slido) do today. Bugs were reproduced in the browser and traced to
code; comparisons come from each vendor's own docs (sources at the end).

## 1. Verdict

SlideForge is **ahead where it means to be** — the room. No general slide tool
lets a teacher rehearse against a sample class, run questions and games from
phones, freeze the screen for a digression and come out with a report. Figma's
polls and Google's Q&A are thin next to it.

It is **behind on the editor**, in three ways that can be fixed without breaking
the "typed layouts, not a canvas" rule:

1. **Too much chrome.** About 30 controls surround the slide before you touch it,
   several of them the same action more than once.
2. **Keyboard behaviour that surprises people from other tools.** Escape throws
   away typing and doesn't close dialogs.
3. **Nothing to help people find commands.** There's no command palette and no
   `?` shortcut sheet, so the good shortcuts that do exist stay hidden.

## 2. Bugs found on the way (reproduced)

| # | What happens | Where | Why it matters |
|---|---|---|---|
| B1 | **Escape discards text typed on the slide.** Click a heading, type, press Escape → the heading reverts. | `src/editor/customize.js:578` → `endInlineEdit('cancel')` | In Google Slides, Figma, Keynote and PowerPoint, Escape *keeps* the edit and leaves the box selected. Anyone coming from those tools will lose work. |
| B2 | **Escape does not close the Slide starters or Library modals.** The first time, my next click landed on a starter card and inserted a slide. | `js/shell.js:342` `openModal` — no key handler, no focus trap, no `aria-modal` | Every `.modal` opened through `openModal` behaves like this. The sorter, header/footer and artwork modes all handle Escape correctly, so the app contradicts itself. |
| B3 | **An editor hint reaches the projector.** An empty bullets slide presents *"Add points in the inspector"* full-screen. | `js/render.js:527`, `:1393` | The comment at `:524` fixed this for slides that carry blocks, but not for a slide that is simply empty. The word "inspector" also appears nowhere else in the UI; the panel is called *Design & content*. |
| B4 | **Two slide numbers.** The rail says `2 / 98`; the show and the slide footer say `2 / 110`. Games expand into extra show steps, so from slide 79 on the two numbers disagree. | rail vs `Player` numbering | "Go to slide 85" means different slides in the editor and on the wall. |
| B5 | *(observed, not traced)* After clicking into a heading and pressing Escape with no change, **Undo lights up**. | `onCancel: touched()` in `js/editor.js:439` | This adds an Undo step for nothing: the next Cmd+Z appears to do nothing. |

B1 and B2 are the ones to fix first. They are small, and together they make up
most of the "this feels off" reaction that people from other tools will have.

## 3. Area by area

### 3.1 Chrome and density

| | SlideForge | Google Slides | Figma Slides |
|---|---|---|---|
| Top area | 2 rows: studio tabs, title, library chip, File, History, Settings, Share / Library, Demo, Teacher Presenter, Rehearse, Host live, Present | Menu bar + one toolbar | One slim bar; tools sit in a **bottom** toolbar |
| Right panel | 2 tabs → 11-button action grid (Undo/Redo/Copy/Paste/Duplicate/Delete/Theme/Review/Artwork/Arrange/Header & footer) → 4 sub-tabs (Edit/Look/Layout/Motion) → fields | Opens only when needed (Format options, Themes, Gemini) | Design / Animate tabs |
| Duplicated routes | Theme settings ×3 (Settings, rail ⚙, Theme); Add activity ×2 (rail, canvas bar); Library ×3 (button, chip, File menu); 4 ways to start a show | One *Slideshow* split button | Present split button |

**Recommendation.** The right panel's 11-button grid is the most expensive part
of the screen.
- Undo, Redo, Copy, Paste, Duplicate and Delete already have shortcuts and belong
  in a slide right-click menu. Google and Figma both work this way.
- That leaves the four panel tabs and the fields, which is the part people are
  actually working in.
- Merge the four show entry points into one **Present ▾** split button. Present
  stays the default; Presenter view, Rehearse and Host live go in the menu.

### 3.2 Editing on the slide

Clicking a text block puts the caret there and brings up a small format bar
(B/I/U, colour, link, Done). Keywords and charts fall back to the panel field.
This matches Google Slides, and it is honest about typed layouts. The weak
points:

- **Nothing on the slide shows it can be edited until you click.** Figma and
  Google draw a hover outline on text boxes. `canvas-editable` gets a `title`
  tooltip but no visible outline.
- **Escape** (B1).
- **Two places to edit the same words.** You can edit on the slide or in the
  panel's field. Google makes the slide the only place. SlideForge could keep
  both, but it should say so ("editing here and on the slide are the same text").

### 3.3 Adding slides and activities

The *Slide starters* modal (a picture gallery with a one-line purpose for each
starter) is better than Google's layout dropdown. It teaches you what each
starter is for, much like Pitch's layout library. The gaps:

- The modal can't be dismissed with Escape (B2).
- Google's March 2025 sidebar and Figma's bottom toolbar keep "insert" in **one
  place that stays open**. SlideForge has four insert buttons across two areas
  (`+ Slide`, `+ Activity`, `+ Add activity`, `+ Item`), and each one opens a
  modal.

### 3.4 Navigating and organising the deck

**Strong points.**
- The sorter (⌘G) has range select, drag, ⌘-click and Esc.
- The slide rail has jump-to-number, ⌘F find across the deck, Alt+↑/↓ to move
  slides, `H` to hide a slide, and cut-and-place.

This matches Google and beats Figma on the keyboard.

**Missing.**
- **Sections.** Google has none either, but Figma's grid rows, Keynote and
  PowerPoint all have them. A 97-slide lecture really needs them.
- **Slide status or owner** (Pitch). This is less important for a single
  teacher.

### 3.5 Presenting

**SlideForge has:**
- A HUD that appears when you hover near the bottom.
- `S` room view, `V` quick question, `Z` freeze, `I` draw/spotlight, `B` blank,
  `D` presenter view.
- Rehearse with a sample class, which nobody else offers.

**What the others have that SlideForge doesn't:**

| Pattern | Who | SlideForge |
|---|---|---|
| `?` shows every shortcut | reveal.js, Slidev | `?` does nothing. Shortcuts appear only in tooltips. |
| Type a number + Enter to jump | Google, reveal.js | Not found in the show. |
| `O`/`G` overview grid while presenting | reveal.js, Slidev | Not found in the show. |
| `W` white screen, `L` laser pointer | Google | `B` blank screen and `I` spotlight cover most of this. |
| Pacing timer (green / red / blue) | reveal.js speaker view | Worth adding to the presenter pop-out. |
| Presenter view at its own URL, synced | Slidev `/presenter`, Figma | Already has a pop-out window. |

One small thing: clicking the HUD's **⋯** once advanced the slide instead of
opening the menu. The HUD had probably faded as the click landed. A click that
lands on a half-faded HUD should never count as "next".

### 3.6 The room (live audience)

This is SlideForge's lead. The join page is clean: a 6-digit PIN, a name and a
single button, as good as Kahoot's or Menti's. Patterns the classroom tools have
that are worth considering:

1. **Student-paced mode with its own code.** Nearpod, Menti "audience pace",
   Kahoot Assign and Pear Deck all have this. SlideForge is teacher-paced only.
   Homework and revision use the same content.
2. **Lock all phones, or lock on a countdown** (Pear Deck). **Show who has left
   the tab** (Nearpod's red dot).
3. **A lobby before the start**, with a nickname generator (Kahoot). This helps
   when names must not be shown.
4. **Choose whether results show live or only after the reveal** (Figma
   alignment scale, Menti "responses on click"). SlideForge already reveals the
   correct answer afterwards. The next step is hiding the answer bars until the
   reveal, so the room doesn't just follow the majority.
5. **A per-student takeaway**: the slides plus that student's own answers (Pear
   Deck Takeaways). "My saved slides" on the join page is halfway there.

### 3.7 Where the work lives, and collaboration

This is the biggest structural gap compared with Google and Figma, and the
README is upfront about it.
- Work saves to browser storage, separately for each origin.
- Other people can't edit, and there are no comments.
- **History** and a **read-only share link** exist.

Google and Figma have made "it's just saved, everywhere" and multiplayer editing
the norm. This doesn't need to be copied, but **the header has to keep saying
where the work is**. The status dot next to the Library chip is easy to miss;
the README's *Saved in this browser* wording is the right idea, and it should be
the visible text.

### 3.8 Finding commands

- Google: `⌥/` Tool finder. Figma: `⌘/` quick actions. Slidev: single-key
  shortcuts.
- SlideForge has more shortcuts than Figma Slides (⌘G, ⌘F, ⌘E, ⌘\\, ⌘⌥=, J/K,
  H, Alt+↑↓), but **a new user has no way to find them**.

A **⌘K / ⌘/ command palette** gives new users one place to look, and it makes
the duplicate buttons from 3.1 safe to remove. It is the most valuable thing to
add for how little work it is.

### 3.9 Accessibility (rough pass)

- `index.html` has 92 buttons and 35 `aria-label`s. Many controls rely on
  `title` alone, which screen readers read inconsistently.
- Modals have no `role="dialog"`, no `aria-modal` and no focus trap (B2).
- 56 CSS rules set type at 9–11px or around 0.6–0.72rem. The rail labels and
  panel captions are hard to read at 100% zoom.

## 4. What to do, in order

1. **Fix B1–B4.** Escape keeps the edit. `openModal` handles Escape, traps focus
   and sets `aria-modal`. Empty-slide hints are rendered only in the editor.
   The rail and the show use one numbering (or the rail shows the show's step
   number).
2. **Command palette (⌘K) and a `?` shortcut sheet**, in both the editor and
   the show.
3. **Reduce the chrome.** Move the action grid into a right-click menu, make one
   Present ▾ split button, and keep one route to theme settings.
4. **Presenting additions.** Number + Enter to jump, an `O` overview grid, and a
   pacing timer in presenter view.
5. **Room additions.** Hide results until reveal, lock phones, and a
   student-paced mode.
6. **Sections in the rail and the sorter.**

## 5. Deliberately not recommended

- **A freeform design mode like Figma's**, **`.pptx` round-trips** and **cards
  that reflow like Gamma's**. All three conflict with the README's typed-layout
  contract. UKBT already showed that the "escape to a free canvas" was not needed.
- **Full multiplayer editing.** It is a whole backend in its own right, and the
  product is the room, not co-authoring.

## Sources

Google Slides: [shortcuts](https://support.google.com/docs/answer/1696717),
[Q&A](https://support.google.com/docs/answer/6386827),
[sidebar (Mar 2025)](https://workspaceupdates.googleblog.com/2025/03/new-sidebar-with-design-elements-in-google-slides.html) ·
Figma Slides: [explore](https://help.figma.com/hc/en-us/articles/24170630629911-Explore-Figma-Slides),
[live interactions](https://help.figma.com/hc/en-us/articles/24246820870807-Add-live-interactions-to-slides),
[present](https://help.figma.com/hc/en-us/articles/24338209202327-Present-a-slide-deck) ·
Pitch: [styles](https://help.pitch.com/en/articles/4063049-work-with-slide-styles),
[layouts](https://help.pitch.com/en/articles/7003075-add-slides-using-layouts) ·
Gamma: [spotlight](https://help.gamma.app/en/articles/11047295-how-does-spotlight-mode-work-in-gamma) ·
Slidev: [UI](https://sli.dev/guide/ui), [drawing](https://sli.dev/features/drawing) ·
reveal.js: [speaker view](https://revealjs.com/speaker-view/), [overview](https://revealjs.com/overview/) ·
Marp: [VS Code](https://github.com/marp-team/marp-vscode) ·
Mentimeter: [pace](https://www.mentimeter.com/blog/menti-news/live-presentation-or-survey-the-ultimate-guide-to-voting-pace) ·
Nearpod: [student-paced](https://nearpod.zendesk.com/hc/en-us/articles/360047531911) ·
Pear Deck: [dashboard](https://help.peardeck.com/en/the-teacher-dashboard) ·
Kahoot: [assign](https://support.kahoot.com/hc/en-us/articles/360039411334)
