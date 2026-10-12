// core/: its public interface. Code outside core/ imports from here, never from its files (lab-engine-plan hard rule 13).
export { ASPECTS, aspectOf, setAspect } from './aspect';
export type { Aspect } from './aspect';
export { TEMPLATES, blankDeck, blankSlide, cloneLayer, cloneSlide, createLayer, createSlide, demoDeck, rosetteSvg, uid } from './defaults';
export { hasFlagshipFrame, hasFlagshipTextImage, isFlagshipFrameLayer, newSlideWithFrame, setFramePage, syncFrameCounters, textImageForSlide } from './frame';
export { idbDelete, idbGet, idbKeys, idbSet } from './idb';
export type { ActivitySettings, ActivityStage, Anim, BlendMode, Box, ClickAction, Deck, Easing, EntranceType, FeedbackKind, GameLook, GameSettings, GuideGround, GuideSwatch, GuideTheme, HFItem, HFKind, HFSlot, HeaderFooter, HoverType, Interact, Layer, LiveFigure, LoopType, ParamValue, Params, PlanStep, Slide, SlideFeedback, SlideGame, StageJob, StyleGuide, TransitionType, Trigger, WordArc } from './types';
