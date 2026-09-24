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
  | 'letters' | 'words' | 'lines' | 'typewriter';

export type Easing = 'expoOut' | 'quintOut' | 'cubicOut' | 'cubicInOut' | 'backOut' | 'spring' | 'linear';
export type Trigger = 'withSlide' | 'onClick' | 'afterPrev';
export type LoopType = 'none' | 'float' | 'pulse' | 'sway' | 'spin' | 'breathe';

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
  /** Text: one line (one bullet) per click, optionally dimming the lines before it. */
  build?: 'none' | 'lines' | 'dim';
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

export type TransitionType = 'none' | 'fade' | 'push' | 'zoom' | 'ripple' | 'dissolve' | 'wipe' | 'pixelate' | 'blur';

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
}
