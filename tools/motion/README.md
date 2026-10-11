# Motion clips

Make a short animation as one HTML file, then render it to an MP4 for a video slide.
The animation never runs inside SlideForge. The player only plays the finished clip, so three.js, shaders or GSAP in a clip cost the app nothing.

Playwright's Chromium draws each frame at an exact time, and `tools/video/frames-to-mp4.swift` (macOS AVFoundation) encodes the frames. No ffmpeg is needed.

```bash
node tools/motion/render.mjs clip.html --check                # t alone? a clean seam? zero errors?
node tools/motion/render.mjs clip.html --stills 0.5,2,3.75    # named moments, as PNGs
node tools/motion/render.mjs clip.html --sheet                # 12-frame contact sheet, labelled f<n> · <s>
node tools/motion/render.mjs clip.html --out assets/lesson/<course>/<week>/clip.mp4 --poster 2
```

`--out` also writes `clip-poster.jpg` next to the MP4. Stills, sheets and frames go to a temp folder, which the command prints; `--work <dir>` chooses another.
Other flags: `--loop`, `--duration`, `--fps` (24), `--size 1920x1080`, `--workers` (4), `--bitrate` (1400000; use about 400000 for a soft background loop, see `tools/video/README.md`).

Start from `examples/title-reveal.html`.

## The render contract

Put this under every prompt that asks Claude for a clip:

> One self-contained HTML file. Set `window.MOTION = { duration, fps, width, height }`. Expose `window.renderAt(t)`, where t is in seconds: it draws the frame for t from scratch, and it may return a promise. No `Date.now`, timers, `requestAnimationFrame` loops or unseeded `Math.random`, and no state carried from the previous frame. A loop's motion is driven by `phase = t / duration` with whole-number cycles, and frame 0 is a finished composition.

A page with no `renderAt` still works if it animates only with CSS animations or the Web Animations API. The tool pauses those and seeks them to t.
Before the page runs, the tool freezes `Date`, `performance.now` and `Math.random` to t. That covers a stray clock, but `--check` still fails a page that keeps state between frames.

Frames are `i / fps` for i = 0 … N−1, never N, so a loop joins without a doubled frame.

`--check` passes only when all three of these hold:
- **Each frame depends on t alone.** A moment drawn again after another moment comes out as the same picture.
- **The seam matches.** With `MOTION.loop` (or `--loop`), the frame at `t = duration` matches frame 0 pixel for pixel, so the loop shows no cut.
- **No errors.** The counters for page errors, console errors, failed requests, HTTP 4xx/5xx responses and lost WebGL contexts all read zero. These errors also stop `--out` before it encodes, because a frame drawn during one may be wrong.
The page is served over local http from its own folder, so it can import its own modules and assets. A CDN import map, such as three.js from jsDelivr, needs the network while rendering.

## Springs

`spring(s, damping, hz)` in the example works out a damped spring's position from the time `s` alone, so any frame can be drawn first and nothing is stepped.

- **Damping:** 1 never overshoots, 0.7–0.85 settles calmly, 0.4–0.6 bounces, and anything under 0.3 looks like a cartoon.
- **What they move:** springs move position and size, never opacity or colour.

## Review loop

The `motion-clip` project skill (`.claude/skills/motion-clip/`) runs this loop with a stop rule and an abort rule.

1. Run `--check` and fix anything that differs.
2. Run `--sheet`, and write notes against frame numbers ("the rule at f24 overshoots too far").
3. Fix only what the notes name, then re-check with `--stills` at those frames.
4. Two to four rounds is normal. Then run `--out`.

## Numbers that work

Taken from the "Opus 5.5 Motion Lab" article (@flxrnc, Sept 2026).

| Curve | cubic-bezier | Use |
|---|---|---|
| ease-out-expo | 0.16, 1, 0.3, 1 | text and title reveals |
| ease-out-quint | 0.22, 1, 0.36, 1 | calm entrances |
| ease-in-out-quart | 0.76, 0, 0.24, 1 | moves and camera pushes |
| ease-in-expo | 0.7, 0, 0.84, 0 | exits |
| ease-out-back | 0.34, 1.56, 0.64, 1 | a small overshoot |

- **Easing:** enter with ease-out and exit with ease-in. Exits run 40–50% shorter than entrances. Use linear only for rotation, progress and loop phase.
- **Timing:**
  - Hero reveals take 600–900 ms.
  - Stagger words 60–120 ms apart, list items 40–80 ms. Start the next element when the last is 30–50% done.
  - Hold text on screen for at least 0.3 s per word plus 0.5 s.
- **Hierarchy:** one hero move per shot. Secondary moves travel 50–70% as far and start 100–200 ms later.
- **Accessibility:** keep 4.5:1 contrast on every frame. Never flash more than three times a second.

## On a slide

The clip goes on an ordinary video slide:

```js
{ type: 'video', video: asset('clip.mp4'), videoPoster: asset('clip-poster.jpg'),
  videoAutoplay: true, videoMuted: true, videoLoop: true, design: { capStyle: 'none' } }
```

A caption sits in a band about 208 px tall across the bottom of the frame, so keep anything important above it.
The clips are silent. For narration, see `tools/video-which-chart/`, whose encoder mixes voice lines in.
