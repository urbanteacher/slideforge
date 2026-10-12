// kinds/effects/: the effect layers, one file each (params and GLSL). Its public interface: the list, in the
// order the add menu shows them.
import type { LayerKind } from '../../engine';
import { solidDef } from './solid';
import { linearDef } from './linear';
import { radialDef } from './radial';
import { meshDef } from './mesh';
import { auroraDef } from './aurora';
import { gridDef } from './grid';
import { backdropDef } from './backdrop';
import { rippleDef } from './ripple';
import { waveDef } from './wave';
import { swirlDef } from './swirl';
import { lensDef } from './lens';
import { gradientMapDef } from './gradientMap';
import { adjustDef } from './adjust';
import { spotlightDef } from './spotlight';
import { glowDef } from './glow';
import { leakDef } from './leak';
import { grainDef } from './grain';
import { halftoneDef } from './halftone';
import { pixelateDef } from './pixelate';
import { chromaDef } from './chroma';
import { vignetteDef } from './vignette';
import { blurDef } from './blur';

export const EFFECTS: LayerKind[] = [
  { def: solidDef },
  { def: linearDef },
  { def: radialDef },
  { def: meshDef },
  { def: auroraDef },
  { def: gridDef },
  { def: backdropDef },
  { def: rippleDef },
  { def: waveDef },
  { def: swirlDef },
  { def: lensDef },
  { def: gradientMapDef },
  { def: adjustDef },
  { def: spotlightDef },
  { def: glowDef },
  { def: leakDef },
  { def: grainDef },
  { def: halftoneDef },
  { def: pixelateDef },
  { def: chromaDef },
  { def: vignetteDef },
  { def: blurDef },
];
