// The Nodes formats (docs/nodes-studio-plan.md): the Nodes method as things students do, designed in
// the lesson's own style like the games and activities. The Nodes tab's Browse lists them in this order.
import { joinItUp } from './joinItUp';
import { threeAnswers } from './threeAnswers';
import { whichStep } from './whichStep';
import type { NodesFormat } from './types';

export type { NodesFormat } from './types';
export const NODES: NodesFormat<any>[] = [joinItUp, threeAnswers, whichStep]; // eslint-disable-line @typescript-eslint/no-explicit-any
