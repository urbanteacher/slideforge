/* SlideForge — games/scoring. Edit source here; npm run build updates js/model.js. */

/** Claim / Heads Up: +1 when accepted. */
function claimPoints(accepted) {
  return accepted ? 1 : 0;
}

export { claimPoints };
