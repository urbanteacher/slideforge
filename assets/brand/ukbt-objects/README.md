# UKBT 3D objects

The brand's rendered objects — the green metallic set (coil, cone, asterisk,
torus) and the iridescent wire set (torus knot, fan, spiral disc, shell).

Eight are here and wired in: `ukbt-coil`, `ukbt-asterisk`, `ukbt-cone` and
`ukbt-torus` are the green set and belong to UK Black Tech; `ukbt-knot`,
`ukbt-disc`, `ukbt-shell` and `ukbt-dome` are the iridescent set and belong to
the Institute. All eight have real transparency and transparent corners —
checked, not assumed.

**They are 300px square, and that is the one thing holding them back.** They
are drawn at 470 on the slide, a 1.6x upscale, which they survive because they
are soft-shaded renders with no hard edges and no type in them. Re-export at
3x (900px) and the size on the slide can go up with them.

## What to export

| | |
| --- | --- |
| Format | PNG with real transparency, or SVG if the source is vector |
| Scale | 3x from Figma — a slide is 1280×720 in CSS and presented on a wall |
| Background | none. These sit on Dark Blue and UKBT Black; a white box shows |
| Naming | `ukbt-<shape>.png`, lower case, hyphens: `ukbt-coil.png`, `ukbt-torus.png` |

Check a file before trusting it: a transparent PNG composited onto white by a
viewer looks identical to a PNG with a white background. Decode the alpha.

```bash
python3 -c "from PIL import Image; im=Image.open('ukbt-coil.png').convert('RGBA'); \
print(im.size, 'corner alpha:', [im.getpixel(p)[3] for p in [(0,0),(im.width-1,0)]])"
```

## How they will be used

The same rule the chevron follows in `css/ukbt.css`: **one object, sized past
the slide and bled off an edge**, on the title and section layouts only. Not a
row of small ones, and never behind body text.

The green set belongs to UK Black Tech and the iridescent set to the UKBT
Institute, which keeps the two themes apart at their loudest moment in the same
way their section grounds already do.

Adding another one is two lines: drop the file here, and add a
`[data-art-index="N"]` rule in `css/ukbt.css` beside the others. The index is
stamped on the slide root by `renderSlide` as `slide index % 4`, so a deck that
opens with several of these layouts does not show the same shape twice.

## Also in assets/brand

`ukbt-institute-stacked.png` (1049×435, transparent) is the official Institute
lockup with INSTITUTE set under the mark. It is *not* the deck logo: in the
top-right slot the logo box is about 40px tall, and at that height the word
under the mark is five pixels of nothing. `ukbt-institute.svg` — the horizontal
one-line lockup — is what the corner uses. Reach for the stacked one when
something wants the lockup large: an opening slide, a printed handout cover,
anywhere it gets 200px or more of height.
