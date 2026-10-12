// engine/: its public interface. Code outside engine/ imports from here, never from its files (lab-engine-plan hard rule 13).
export { EASE, animTotal, defaultAnim, defaultInteract, isTextUnit, presetOf, presetTiming, schedule } from './anim';
export type { Spacing, Speed } from './anim';
export { reducesMotion } from './motion';
export { DeckPlayer, hitLayer } from './player';
export { autoHeight, chartSpots, contentHeight, fontString, getAssetVersion, getImage, groupSizes, imageSettled, layoutText, measureTextHeight, parseChartData, refreshAssets, shrinks, textSize } from './raster';
export { ALL_KINDS, CATEGORIES, CATEGORY_LABEL, FONTS, defaultParams, kind, kindsIn } from './registry';
export type { Category, ParamDef } from './registry';
export { Renderer } from './renderer';
export { PLAN_PRESETS, makePlan, unitsOf } from './words';
export type { PlanPreset } from './words';
