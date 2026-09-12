/* SlideForge — core/identity. Edit source here; npm run build updates js/model.js. */

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export { uid };
