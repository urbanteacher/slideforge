'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const root=path.resolve(__dirname,'..');
function load(){const data={};const c={window:{},console,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}};vm.createContext(c);for(const f of ['model','lessons'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),c);return c.window.SF;}
test('the design catalogue documents valid slide types and every seeded demo setting',()=>{
 const SF=load();
 for(const [key,c] of Object.entries(SF.DESIGN_CONTROLS)){
  assert.ok(c.label&&c.description,key);assert.ok(['Look','Motion'].includes(c.pane),key);
  if(c.types!=='*')for(const type of c.types)assert.ok(SF.SLIDE_TYPES[type],key+': '+type);
 }
 for(const key of Object.keys(SF.LIBRARY_SEED_KEYS))for(const slide of SF.buildLesson(key).slides){
  for(const setting of Object.keys(slide.design||{}))assert.ok(SF.DESIGN_CONTROLS[setting],key+': undocumented '+setting);
 }
 assert.equal(SF.designApplies('focalX2','image'),true);
 assert.equal(SF.designApplies('focalX2','title'),false);
 assert.equal(SF.designApplies('align','quiz'),false);
 assert.equal(SF.designApplies('unknown','title'),false);
});
test('every declared design setting can be written through its editor control',{timeout:90000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke/design-controls.mjs'],{cwd:root,timeout:85000});
 assert.match(stdout,/design controls written through the editor/);
});
