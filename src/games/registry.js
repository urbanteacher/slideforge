/* SlideForge — games/registry. Edit source here; npm run build updates js/model.js. */
import { choice, truefalse } from "./choice.js";
import { race } from "./race.js";
import { speed } from "./speed.js";
import { boss } from "./boss.js";
import { slider } from "./slider.js";
import { type } from "./type.js";
import { order } from "./order.js";
import { emoji } from "./emoji.js";
import { definition } from "./definition.js";
import { compare } from "./compare.js";
import { oddone } from "./oddone.js";
import { wordreveal } from "./wordreveal.js";
import { memoryflip, memorymatch, knowledgeflip } from "./memory.js";
import { headsup } from "./headsup.js";
import { spinexplain } from "./spinexplain.js";
import { connection } from "./connection.js";
import { conceptchain } from "./conceptchain.js";
import { randomchallenge } from "./randomchallenge.js";
import { bingo } from "./bingo.js";
import { lowstakes } from "./lowstakes.js";
import { bowl } from "./bowl.js";
import { spot } from "./spot.js";
import { fill } from "./fill.js";

/**
 * Mark a response against a compiled question slide.
 *
 * Marking lives here, on the host, and not in the relay. The relay holds the
 * clock, the roster and the running scores; what it must not hold is what a
 * given answer *means*, because that is the authoring side's knowledge and
 * it differs per style. While the relay compared option indices, no question
 * type without option indices could exist. It now receives a verdict per
 * player and does the arithmetic, so a new style is a change here only.
 *
 * @param {object} slide compiled quiz slide
 * @param {number|string} response option index, or typed text
 */
function markResponse(slide, response) {
  var style = gameStyle(slide.style);
  if (typeof style.mark === 'function') return !!style.mark(slide, response);
  return false;
}

/**
 * How a response should be written on the screen.
 *
 * A right typed answer is shown in the spelling the question accepts, not
 * in whichever variant happened to arrive first: a group of six holding
 * "paris", "PARIS" and "the Paris" reads as Paris.
 */
function answerLabel(slide, response) {
  var style = gameStyle(slide.style);
  if (typeof style.describe === 'function') return style.describe(slide, response);
  return String(response == null ? '' : response);
}

function gameStyle(key) {
  return GAME_STYLES[key] || GAME_STYLES.choice;
}
const GAME_STYLES = { choice, truefalse, race, speed, boss, slider, type, order, emoji, definition, compare, oddone, wordreveal, memoryflip, memorymatch, knowledgeflip, headsup, spinexplain, connection, conceptchain, randomchallenge, bingo, lowstakes, bowl, spot, fill };

export { markResponse, answerLabel, gameStyle, GAME_STYLES };
