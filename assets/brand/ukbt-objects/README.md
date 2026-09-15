# UKBT 3D objects

The brand's rendered objects — the green metallic set (coil, cone, asterisk,
torus) and the iridescent wire set (torus knot, fan, spiral disc, shell).

**Drop the originals here.** Do not route them through PowerPoint on the way:
it re-encodes and often downsamples, and it is how the logo ended up looking
like a fragment on a white rectangle earlier in this repo's history.

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

Nothing references these files yet. Add them and say so, and the theme gets its
object slot.

## Also in assets/brand

`ukbt-institute-stacked.png` (1049×435, transparent) is the official Institute
lockup with INSTITUTE set under the mark. It is *not* the deck logo: in the
top-right slot the logo box is about 40px tall, and at that height the word
under the mark is five pixels of nothing. `ukbt-institute.svg` — the horizontal
one-line lockup — is what the corner uses. Reach for the stacked one when
something wants the lockup large: an opening slide, a printed handout cover,
anywhere it gets 200px or more of height.
