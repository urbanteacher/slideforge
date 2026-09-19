const {test}=require('node:test');
const assert=require('node:assert/strict');
test('motion run state is bounded and does not mutate authored slide or previous state', async()=>{
  const m=await import('../src/render/motion-lab.js');
  /* The scene moved off design and onto the slide when the specimens became
     their own type in Add slide, rather than a control in the Look pane. */
  const slide={type:'motion',motionScene:'branch',bullets:['A\tOne','B\tTwo']};
  const before=JSON.stringify(slide), previous=m.state(slide);
  assert.equal(m.active(slide),true);
  assert.equal(m.active({...slide,type:'quiz'}),false);
  assert.equal(m.update(slide,previous,'motionChoice',999).sceneChoice,1);
  assert.equal(m.update(slide,previous,'motionValue',-100).sceneValue,0);
  assert.equal(m.update(slide,previous,'motionX',120).sceneX,100);
  assert.equal(m.update(slide,previous,'motionStep',100).sceneStep,2);
  assert.equal(m.update(slide,previous,'motionValue','bad'),null);
  assert.equal(m.update(slide,previous,'unknown',1),null);
  assert.equal(previous.sceneChoice,-1);
  assert.equal(JSON.stringify(slide),before);
  assert.deepEqual(m.update(slide,{sceneChoice:1},'motionReset',0),m.state(slide));
});
