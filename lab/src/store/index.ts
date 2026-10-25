// store/: its public interface. Code outside store/ imports from here, never from its files (lab-engine-plan hard rule 13).
export { enterView, inView, layerOf, refitAllText, slideOf, useStore } from './store';
export type { InspectorTab, LabView } from './store';
