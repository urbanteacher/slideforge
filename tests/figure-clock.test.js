const {test}=require('node:test');
const assert=require('node:assert/strict');
/* The figures' clock (src/render/figures/kit.js): a tween held by seek(ms) is
   drawn at ms after it began, whatever the wall clock says, so a baseline can
   capture a figure mid-move and get the same picture every run. */
test('seek holds tweens at a time, then lets them run on from it', async()=>{
  const frames=[];let now=0;
  globalThis.requestAnimationFrame=f=>{frames.push(f);return frames.length;};
  globalThis.cancelAnimationFrame=id=>{frames[id-1]=null;};
  const step=ms=>{now+=ms;const due=frames.splice(0);due.forEach(f=>f&&f(now));};
  const kit=await import('../src/render/figures/kit.js');
  const seen=[];
  const linear=k=>k;
  kit.tween(1000,k=>seen.push(k),linear);
  step(0);step(250);
  assert.equal(seen.at(-1),0.25);

  kit.seek(600);
  assert.equal(seen.at(-1),0.6);
  step(5000);
  assert.equal(seen.at(-1),0.6,'held: the wall clock does not move it');
  assert.equal(kit.now(),600);

  /* A tween started while held is drawn at the held time at once. */
  const late=[];
  kit.tween(2000,k=>late.push(k),linear);
  assert.deepEqual(late,[0.3]);

  /* Seeking past the end draws the end; seeking back draws it again. */
  kit.seek(1500);assert.equal(seen.at(-1),1);
  kit.seek(100);assert.equal(seen.at(-1),0.1);

  kit.seek(null);
  step(0);step(400);
  assert.equal(seen.at(-1),0.5,'runs on from the held 100 ms');
  step(600);
  assert.equal(seen.at(-1),1);
  const count=seen.length;step(100);
  assert.equal(seen.length,count,'a finished tween stops drawing');
});
test('a cancelled tween is not redrawn by seek',async()=>{
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  const kit=await import('../src/render/figures/kit.js');
  const seen=[];
  const cancel=kit.tween(1000,k=>seen.push(k),k=>k);
  cancel();kit.seek(500);kit.seek(null);
  assert.deepEqual(seen,[]);
});
