// The lab's player for SlideForge's own page (js/lab-stage.js): SlideForge's player runs the show,
// with its HUD, the room's rail and Teacher Presenter, and this draws each lab slide live inside it.
// Built into lab-app/stage.js by vite.stage.config.ts.
import { registerGuideFonts } from '../model/guide';
import { DeckPlayer } from './player';

(window as unknown as { SFLabStage: unknown }).SFLabStage = { DeckPlayer, registerGuideFonts };
