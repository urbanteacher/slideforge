// Core document model. A deck is a list of slides; a slide is a bottom→top stack of layers.
// Every layer is rendered as one full-frame shader pass over "everything below", so an
// effect layer (Ripple, Grain…) naturally bends/tints whatever sits underneath it.

export type ParamValue = number | string | boolean | [number, number];
export type Params = Record<string, ParamValue>;

export interface Box {
  x: number; // slide px, top-left
  y: number;
  w: number;
  h: number;
  rot: number; // degrees
}

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'softLight' | 'hardLight'
  | 'darken' | 'lighten' | 'colorDodge' | 'colorBurn' | 'difference' | 'exclusion' | 'add';

export type EntranceType =
  | 'none' | 'fade' | 'rise' | 'drop' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'zoomOut'
  | 'pop' | 'blur' | 'wipeUp' | 'wipeRight' | 'spin'
  // text-only, per-unit
  | 'letters' | 'words' | 'lines' | 'typewriter'
  // chart-only: bars rise from the axis, a line draws along, wedges sweep round
  | 'draw';

export type Easing = 'easyEase' | 'expoOut' | 'quintOut' | 'cubicOut' | 'cubicInOut' | 'backOut' | 'spring' | 'linear';
export type Trigger = 'withSlide' | 'onClick' | 'afterPrev';
export type LoopType = 'none' | 'float' | 'pulse' | 'sway' | 'spin' | 'breathe';

/** How a planned word lands: eases to rest, goes past it and back (bounce), or arrives soft and condenses (mist). */
export type WordArc = 'settle' | 'bounce' | 'mist';
/** One word's (or letter's) start in a choreography: offset and lift in em, turn in degrees, scale,
 *  blur in px, when it starts (s) and how it lands. Anything left out is at rest. */
export interface PlanStep { dx?: number; dy?: number; rot?: number; scale?: number; blur?: number; delay?: number; arc?: WordArc }

export interface Anim {
  type: EntranceType;
  duration: number; // s
  delay: number; // s
  easing: Easing;
  trigger: Trigger;
  stagger: number; // s between text units
  loop: LoopType;
  loopSpeed: number;
  loopAmount: number;
  /** Text: which end the letters, words or lines start from — SlideForge's "Direction". */
  order?: 'first' | 'last' | 'center';
  /** Text: arrive, hold four seconds, leave, and round again — SlideForge's "And leave again". */
  leave?: boolean;
  /** Text: one line (one bullet) per click, optionally dimming the lines before it, or dimming them
   *  and taking the light off the rest of the slide (spot). */
  build?: 'none' | 'lines' | 'dim' | 'spot';
  /** One of a set built an item per click (cards, rows, choices): which set, which item in reading
   *  order, and whether the items before the newest are dimmed or spotlit. Set on every layer of the item. */
  step?: { set: string; i: number; mode: 'on' | 'dim' | 'spot' };
  /** Words or letters: how each unit arrives — SlideForge's Rise (up, blur clearing), Fade (no
   *  movement) or Reveal (wiped up from behind its own line). Its wave is eased, as SlideForge's is. */
  feel?: 'rise' | 'fade' | 'reveal';
  /** Words or letters: a choreography, one step per unit in reading order. Replaces the feel and
   *  the wave — each unit starts where, and when, its step says. */
  plan?: PlanStep[];
  /** Fade away this many seconds after arriving — SlideForge's "Caption clears itself". 0 stays. */
  clearAfter?: number;
}

export type HoverType = 'none' | 'lift' | 'grow' | 'glow' | 'tilt';
export type ClickAction = 'none' | 'next' | 'prev' | 'goto' | 'link';

export interface Interact {
  followMouse: boolean; // effects: centre tracks the pointer
  parallax: number; // -1..1 depth
  hover: HoverType;
  click: ClickAction;
  gotoSlide: number; // 1-based
  url: string;
}

export interface Layer {
  id: string;
  kind: string; // registry key
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blend: BlendMode;
  params: Params;
  box?: Box; // content layers only (text, image, shape)
  anim: Anim;
  interact: Interact;
}

export type TransitionType = 'none' | 'fade' | 'push' | 'zoom' | 'ripple' | 'dissolve' | 'wipe' | 'pixelate' | 'blur' | 'morph';

export type FeedbackKind = 'poll' | 'wordcloud' | 'brainstorm' | 'scale';

export interface Slide {
  id: string;
  name: string;
  background: string;
  layers: Layer[];
  transition: { type: TransitionType; duration: number };
  notes: string;
  /** Kept in the deck and the editor, skipped by Preview and the exported deck. */
  hidden?: boolean;
  /** SlideForge's audience feedback on this slide. A placeholder in the lab: recorded, marked in the
   *  editor, and run by SlideForge's live session — nothing is drawn on the slide. */
  feedback?: { kind: FeedbackKind };
  /** This slide's own header and footer, when it differs from the deck's. */
  headerFooter?: HeaderFooter;
}

/** SlideForge's six chrome slots. What goes in each is set in the side panel; its words are typed on the slide. */
export type HFSlot = 'header-left' | 'header-center' | 'header-right' | 'footer-left' | 'footer-center' | 'footer-right';
export type HFKind = 'empty' | 'text' | 'image' | 'logo' | 'number' | 'pages' | 'date' | 'tagline' | 'title' | 'section';
export interface HFItem { kind: HFKind; text?: string; src?: string }
export interface HeaderFooter { enabled: boolean; hideOnCover: boolean; slots: Partial<Record<HFSlot, HFItem>> }

/** A colour the style guide names: its token, its value, and the set it belongs to (a strand, a brand). */
export interface GuideSwatch { name: string; value: string; set?: string }
/** A typeface the guide ships, with its files embedded so the deck carries them. */
export interface GuideFont { family: string; faces: { weight: string; style: string; src: string }[] }
/** A mark, icon or pattern the guide draws, ready to put on a slide. */
export interface GuideMark { name: string; src: string }
/** The theme a guide is read as: the same roles every lab theme has. */
export interface GuideTheme {
  ground: string; ink: string; muted: string; accent: string; accent2: string; panel: string;
  display: string; displayWeight: string; body: string;
}
/** The deck's own style guide, read from a page or a stylesheet. It travels inside the deck. */
export interface StyleGuide {
  name: string;
  source: string;
  swatches: GuideSwatch[];
  /** Named colour sets the guide defines (".theme-aiad27-safe" → "safe"), and the one in use. */
  sets: string[];
  set?: string;
  fonts: GuideFont[];
  marks: GuideMark[];
  theme: GuideTheme;
}

export interface Deck {
  id: string;
  title: string;
  width: number;
  height: number;
  slides: Slide[];
  version: 1;
  /** One theme for the whole deck (a LAYOUT_STYLES id). Choosing it restyles every slide. */
  theme?: string;
  headerFooter?: HeaderFooter;
  /** The deck's own style guide, when one has been read in: its colours, fonts and marks. */
  styleGuide?: StyleGuide;
}
