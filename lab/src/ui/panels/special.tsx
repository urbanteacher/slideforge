import type { ReactNode } from 'react';
import type { Layer } from '../../core';
import { ExperimentPanel } from '../../kinds/experiment/Inspector';
import { SimulationPanel } from '../../kinds/model/Inspector';
import { ScenePanel } from '../../kinds/scene/Inspector';
import { TimerPanel } from '../../kinds/timer/Inspector';
import { WipePanel } from '../../kinds/wipe/Inspector';

/*
 * The layers that do something of their own — Before / after, Simulation, Chart experiment, Motion
 * experiment, Timer — each have an inspector in their kind's folder (kinds/<kind>/Inspector.tsx). Each
 * shows what the thing is for, in the order a teacher sets it up, rather than a list of its parameters.
 * The inspector frame (Inspector.tsx) gives each its own tab. One line per kind.
 */
const KIND_INSPECTORS: Record<string, { tab: string; Inspector: (props: { layer: Layer }) => ReactNode }> = {
  wipe: { tab: 'Before / after', Inspector: WipePanel },
  model: { tab: 'Simulation', Inspector: SimulationPanel },
  experiment: { tab: 'Experiment', Inspector: ExperimentPanel },
  scene: { tab: 'Motion', Inspector: ScenePanel },
  timer: { tab: 'Timer', Inspector: TimerPanel },
};

/** The special layers, and the name of the tab each gets. */
export const SPECIAL_TABS: Record<string, string> = Object.fromEntries(Object.entries(KIND_INSPECTORS).map(([k, v]) => [k, v.tab]));

/** The selected layer's own inspector, in its tab. */
export function SpecialPanel({ layer }: { layer: Layer }) {
  const Own = KIND_INSPECTORS[layer.kind]?.Inspector;
  return Own ? <Own layer={layer} /> : null;
}
