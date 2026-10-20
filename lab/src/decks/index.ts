// decks/: its public interface. Code outside decks/ imports from here, never from its files (lab-engine-plan hard rule 13).
export { CARRIED, carryDeck27, carryDeckArt, carryDeckExperimentPresets, carryDeckFigures, carryDeckHidden, carryDeckLive, carryDeckMissing, carryDeckVideo, convertsSlide, deckFromSlideForge, fitStatement, pageNumbers } from './fromSlideForge';
export type { LessonGame, SFDeck, SFSlide, SlideDesign } from './fromSlideForge';
export type { MotionLabData } from './motionLab';
export { nulDeck } from './nulDeck';
export { TEACHING_ROUTINE_FLOW, TEACHING_ROUTINE_LOOP, teachingRoutineSlides } from './teachingRoutine';
export { ukbtDeck, ukbtInstituteDeck } from './ukbtDeck';
