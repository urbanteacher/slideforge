# SlideForge Studio

A Designly-style design tool for **presentation slides**: a live WebGL layer stack (generators,
distortions, colour and light effects) under editable type, images and shapes, with crisp entrance
animations, click-builds, shader transitions and pointer-driven interactions. Decks export to a single
self-contained interactive `.html` file.

## Run it

```bash
npm install
npm run dev          # http://localhost:5199
npm run build        # production build in dist/
```

Requires a browser with WebGL2 (current Chrome, Edge, Safari, Firefox).

## What you can do

| Area | Features |
|---|---|
| **Layers** | Every layer is one full-frame shader pass over *everything below it* — so Ripple bends the type beneath it, Gradient map recolours the photo beneath it, and anything above stays crisp. Drag to reorder, hide, lock, rename (double-click). |
| **Sources** | Text (10 web fonts, weight, italic, tracking, line height, uppercase), Image (drop / paste / pick, cover/contain, radius), Shape (rect, ellipse, triangle, star, ring, arrow, line; gradient fills, strokes). |
| **Effects (20)** | Generate: Solid, Linear gradient, Mesh gradient, Aurora, Grid · Distort: Ripple, Liquid, Swirl, Lens · Colour: Gradient map, Adjust · Light: Spotlight, Glow (bloom), Light leak · Stylise: Film grain, Halftone, Pixelate, Chromatic shift, Vignette, Blur (uniform / tilt-shift / focus). 13 blend modes. Reset and Randomise. |
| **Canvas** | Click to select, drag to move with smart-guide snapping (hold ⌘ to disable), 8 resize handles (Shift keeps aspect, Alt resizes from centre), rotate handle (Shift = 15° steps), corner-drag on text scales the font, draggable origin handles for effects, double-click text to edit in place, ⌘/Ctrl + wheel to zoom. |
| **Animate** | Entrances: fade, rise, drop, slide, zoom, pop, blur-in, wipes, spin, plus text-only letter / word / masked-line / typewriter reveals with stagger. Easings incl. expo, back and spring. Triggers: *with previous*, *after previous*, *on click* (build steps). Ambient loops: float, pulse, sway, spin, breathe. The **Sequence** panel shows the build order. **Animate** plays the slide in the editor. |
| **Transitions** | Cut, crossfade, push, zoom, ripple, burn dissolve, soft wipe, pixelate, blur — all GPU shaders. |
| **Interact** | Follow-mouse origins (Ripple, Lens, Swirl, Spotlight, Blur), parallax depth, hover states (lift, grow, glow, tilt-to-pointer), click actions (next, previous, go to slide, open link). |
| **Present** | Preview (⌘↵) — click / → to build and advance, ← back, N speaker notes, F fullscreen, Esc exit. |
| **Files** | Autosaves to the browser (IndexedDB). Export: interactive **HTML deck**, **PNG** of the current slide, editable **.json** deck (re-open via the logo menu). **Gallery** has 7 art-directed starting slides. |

### Keyboard

`⌘Z` / `⇧⌘Z` undo/redo · `⌫` delete layer · `⌘D` duplicate · `⌘C` / `⌘V` copy/paste layer ·
arrows nudge (Shift = 10px) · `Enter` edit selected text · `T` new text · `A` toggle Add panel ·
`←` / `→` change slide (nothing selected) · `Esc` deselect · `⌘↵` present.

## How it works

```
src/
  model/      types.ts (Deck → Slide → Layer), defaults.ts (factories, demo deck, gallery templates), store.ts (zustand + immer, undo history)
  engine/
    registry.ts   every layer kind: params schema (drives the inspector UI) + GLSL `effect(uv)`
    glsl.ts       shared prelude (noise, blend modes) and the content-layer sampler
    renderer.ts   WebGL2 ping-pong compositor, texture cache, shader transitions
    raster.ts     text layout + letter/word/line animation, shapes, images → canvas textures
    anim.ts       easings, build scheduling (click steps), per-layer animated state
    player.ts     DeckPlayer: builds, transitions, hover/parallax/click — shared by Preview and HTML export
    player-entry.ts  entry for the standalone player bundle inlined into exported HTML
  ui/         TopBar, LeftPanel (layers + Add library), Stage (canvas + handles), Inspector, Filmstrip, Present, Gallery
  export/     HTML / JSON / PNG exporters
```

**Add a new effect:** append a `KindDef` to `KINDS` in `src/engine/registry.ts` with a `params` list and a
GLSL body defining `vec4 effect(vec2 uv)`. Each param `foo` is available as uniform `u_foo`; `below(uv)`
samples the composite underneath. The inspector, thumbnails, randomise, export and player pick it up
automatically.

The export player (`src/generated/player.iife.js`) is rebuilt automatically by `npm run dev` / `npm run build`
and whenever engine files change during dev.

## Known limitations (v0.1)

- Exported HTML loads fonts from Google Fonts; offline it falls back to system serif/sans.
- Images are embedded as data URLs, so decks with many photos make large `.json` / `.html` files (images are downscaled to 2400px on import).
- No PDF / PPTX export yet; no video layers, multi-select, grouping or alignment tools beyond snapping.
- One text style per text layer (no mixed styling within a paragraph).
- Undo history lives in memory (not persisted across reloads); autosave keeps only the current deck.
- While developing, edits to GLSL need a page reload — the editor caches compiled shaders across hot reloads.
- Not deployed anywhere yet; verified manually in Chromium, not yet in Safari/Firefox.
