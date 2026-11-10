// The widget Add puts on a slide: two dice and a running tally, small enough to read and change.
export const WIDGET_STARTER = `<style>
  .w { display: grid; place-items: center; gap: 16px; height: 100%; text-align: center; }
  .dice { font-size: 160px; line-height: 1; letter-spacing: 16px; }
  button { font: inherit; padding: 16px 40px; border-radius: 16px; border: 0; background: #161616; color: #fff; cursor: pointer; }
  .tally { color: #555; }
</style>
<div class="w">
  <div class="dice" id="d">⚀ ⚀</div>
  <button id="roll">Roll two dice</button>
  <div class="tally" id="t">Rolls: 0 · Doubles: 0</div>
</div>
<script>
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  let rolls = 0, doubles = 0;
  document.getElementById('roll').onclick = () => {
    const a = Math.floor(Math.random() * 6), b = Math.floor(Math.random() * 6);
    rolls++; if (a === b) doubles++;
    document.getElementById('d').textContent = faces[a] + ' ' + faces[b];
    document.getElementById('t').textContent = 'Rolls: ' + rolls + ' · Doubles: ' + doubles;
  };
</script>`;
