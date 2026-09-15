# UKBT photography

Empty on purpose — the photographs on ukblacktech.com are in the page
screenshots I was shown, not in this repo, and a screenshot of a photograph is
not a photograph.

## What to drop here

From the pages, the ones the slides want:

| Page | Picture | Suggested name |
| --- | --- | --- |
| About | The group around a table | `ukbt-about-table.jpg` |
| About | The group talking, outdoors | `ukbt-about-community.jpg` |
| Events | Two women at a screen | `ukbt-events-showcase.jpg` |

JPEG at 1920px on the long edge is right for a slide — a 1280×720 stage on a
projector never needs more, and a 4 MB photograph on every slide is the same
mistake as the 1.1 MB wave. Keep the originals somewhere else; these are the
presentation copies.

## They already have somewhere to go

No new layout is needed for any of the three patterns on those pages:

- **About's two image cards** — a `cards` slide takes an `images` array, one
  per card, and draws the picture above the heading. Two cards, two photographs.
- **Events' featured card** — a `split` slide with `imageSide: 'left'`. The
  copy side is a lime panel in these themes, which is what the site does.
- **Services and the Institute page** — no photography on those, just objects
  and rules, both of which are already in.

Point a slide at a file with `image:` (split, image) or `images: []` (cards)
and it works the moment the file is here.
