// layouts/: its public interface. Code outside layouts/ imports from here, never from its files (lab-engine-plan hard rule 13).
import { setEdgeResolver } from '../engine';
import { slideStyle as styleOfSlide, themeOf as themeOfDeck } from './style';
export { applyTheme, setSlideGround, themeSlide, varyGrounds } from './applyTheme';
export { backdropOf, isBackdrop, setBackdrop } from './backdrop';
export type { BackdropMode } from './backdrop';
export { reflowCards } from './cards';
export { HF_KINDS, HF_SLOTS, carryCanvasEdits, editHeaderFooter, headerFooterStale, hfConfig, hfDefaults, syncHeaderFooter } from './headerFooter';
export { LAYOUTS, LAYOUT_GROUPS } from './catalogue';
export { LAYOUT_STYLES, cell, gridFor, guideStyle, layoutFor, slideStyle, themeOf } from './style';
export { beforeAfterSlide, chartCalloutSlide, experimentSlide, exploreSlide, framedPictureSlide, gallerySlide, gameClock, sceneSlide, simulationSlide, youtubeSlide } from './show';
export { bulletsSlide, cardsSlide, chartSlide, compareSlide, diagramSlide, journeySlide, keyfactSlide, keywordsSlide, pointsSlide, sectionSlide, splitSlide, statsSlide, tableSlide, titleSlide } from './system';
export { closerSlide, codeSlide, columnsSlide, funnelSlide, introductionSlide, mindmapSlide, orgchartSlide, quoteSlide, railSlide, sectionEditorialSlide, sectionFrameSlide, sidecarTitleSlide, timelineSlide } from './rich';
export { groundParams, itemStyle } from './blocks';
export { icebergSlide, shiftSlide, sourcecheckSlide, spectrumSlide } from './infographics';
export { blankSlide, explainSlide, resultsSlide, spotfakeSlide } from './leftovers';
export type { LayoutStyle } from './style';
export { DEFAULT_THEME } from './defaultTheme';

// Transitions' edges (the burn, the iris ring, the shape's outline) in the theme's accent, slide by slide.
setEdgeResolver((deck, slide) => { const st = themeOfDeck(deck); return st ? styleOfSlide(st, slide).accent : undefined; });
