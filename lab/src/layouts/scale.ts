// One type scale for every layout, in pixels on the lab's 1920 × 1080 slide (a point is two pixels). A layout sets
// its words at one of these steps rather than a number of its own, so a deck reads as one design: about five sizes,
// not thirty. Nothing on a slide is under `min`, the 18pt a room can read from the back (engine FLOOR_PX); the one
// exception is the header and footer's chrome, the slide number and the course name, at `chrome`.
import { FLOOR_PX } from '../engine';

export const SCALE = {
  /** A cover's title, a statement: as big as the line allows. */
  hero: 150,
  /** A section's title, a big number. */
  display: 110,
  /** Every slide title. */
  title: 88,
  /** A card's or a column's heading. */
  sub: 56,
  /** Body text and points. */
  body: 48,
  /** Labels, captions, sources, eyebrows. */
  label: 40,
  /** The floor: the smallest words on a slide. */
  min: FLOOR_PX,
  /** The header and footer's chrome only (layouts/headerFooter.ts). */
  chrome: 22,
} as const;
