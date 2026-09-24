# Lab slide blocks

The lab has ordinary Bullet points in Add and composition blocks in the left Layouts panel: Cards, Choice boxes, Numbered points and Header.

- Bullet and numbered-list controls stay visible at narrower widths. Each newline is an item; double-click to edit. Wrapped lines retain the existing hanging indent.
- Cards inserts one to four themed note cards in a row, each an editable layer with a heading and body. Reopening Cards updates the set and preserves remaining copy. Reducing the count removes extra cards; Undo restores them.
- Choice boxes inserts one to four A–D options in the flagship’s two-column, two-row positions. Each has a rule, cyan letter tile, editable title and editable detail. Reopening Choice boxes changes the count without losing text in retained options; the original flagship vote slide can be updated in place. On other slides in the same deck, the block borrows the flagship’s exact tile art and geometry.
- Numbered points inserts one to six rows based on the flagship’s “What to remember” slide. Each row has a rule, cyan number, editable heading and editable detail. One to three retain the original generous spacing; four to six use a compact rhythm that fits above the footer and closing line. Changing the count keeps the copy in retained rows and updates the default closing line’s number.
- In a deck containing the AI Awareness flagship, Header uses its exact frame: strand mark and label at top left, brand lockup and tagline at top right, footer rule and text below. Uploading a logo replaces the right lockup in that position. The flagship theme is selected by default; other presets remain available. Header can insert this frame on a slide without it, or apply the same frame and theme throughout the deck.
- A new slide in a flagship deck inherits the frame from the current slide, or from another slide in that deck. It also starts with the flagship’s left-text/right-image arrangement: editable eyebrow, headline and supporting line at left, and a replaceable artwork layer at right. The existing poster serves as sample artwork. Text adapts to dark or light slide backgrounds. Add → Text + image inserts the same arrangement on an existing slide and selects it if already present. Its progress and page number reflect its position, and counters on the other slides refresh when slides are added, moved or removed. The normal blank slide remains available in other decks.
- Insertions and replacements are single undo steps. Other layers are retained. Blocks occupy preset positions; move them as needed on populated slides.

## Validation

Lab production build/typecheck passed. Browser checks covered four-card insertion and undo, the header settings, a new flagship-framed slide, applying the frame and background to a plain gallery slide, the text/image default on bright and dark grounds, four choice boxes at the flagship A–D positions, and six numbered points on the dark flagship slide. The original three-point slide was restored and saved after the check. Root tests stop at existing type errors in `js/live.js:2016–2022`.

## Change log

- 24 September 2026: Added one to six numbered rows with compact snapping for longer lists.
- 24 September 2026: Added the flagship A–D choice-box grid as a reusable one-to-four-option block.
- 24 September 2026: Added the editable flagship text and image arrangement as the default content box on new slides.
- 24 September 2026: Made the flagship frame the default for new slides in that deck and reusable from Header.
- 24 September 2026: Added card and header editors and kept bullet controls visible.
