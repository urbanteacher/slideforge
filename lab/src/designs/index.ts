// designs/: its public interface. Code outside designs/ imports from here, never from its files (lab-engine-plan hard rule 13).
export { CONSTRAINTS, canWriteActivity, writeActivity } from './activityAI';
export type { Audience } from './activityAI';
export { applyActivitySettings, ensureActivitySettings } from './activitySettings';
export type { ActivityChange } from './activitySettings';
export { HAS_LOOKS, gameSlides } from './engage/formats';
export type { ShowcaseGame } from './engage/games';
export { looksOf } from './engage';
export type { ActivityData, ActivityEntry, ActivityOption } from './engage';
export { fitSize, headingClock } from './engage/kit';
export { feedbackOf } from './feedback';
export { canWrite, replaceGame, writeGame } from './gameAI';
export { GAME_LOOKS, REASONS, relookGame, repairGames } from './gameLook';
export { applyGameSettings } from './gameSettings';
export { RECIPE_NAMES, rebuildSlide } from './recipes';
export { canWriteNodes, writeNodes } from './nodesAI';
export { NODES } from './nodes';
export type { NodesFormat } from './nodes';
