// engine/: its public interface. Code outside engine/ imports from here, never from its files (lab-engine-plan hard rule 13).
export { animTotal, defaultAnim, defaultInteract, DIM_TO, EASE, isTextUnit, presetOf, presetTiming, schedule, textUnitCount, unitProgress } from './anim';
export type { Spacing, Speed } from './anim';
export { reducesMotion } from './motion';
export { DeckPlayer, hitLayer } from './player';
export { autoHeight, canFilter, contentHeight, fitted, fontString, getAssetVersion, getImage, groupSizes, imageSettled, layoutText, makeCanvas, MAX_TEX, mctx, measureTextHeight, MODEL_PLOT, refreshAssets, registerRaster, setupFont, shrinks, textSize } from './raster';
export { ALL_KINDS, CATEGORIES, CATEGORY_LABEL, FONTS, defaultParams, kind, kindsIn } from './registry';
export type { Category, ParamDef } from './registry';
export { Renderer } from './renderer';
export { FRAME_K, isWordMotion, makePlan, PLAN_PRESETS, reach, unitDelays, unitLook, unitsOf } from './words';
export type { PlanPreset, UnitLook } from './words';
export type { Ctx, KindDrawing, Line, Measure, Raster, RasterFn } from './raster';
export { boxCanvas, card, fit, fmtNum, mix, onColour, pill, rgba, setFont, useFont, withAlpha, wrap } from './draw';
export { getVideo, videoEmbed, videoService, videoStill } from './media';
