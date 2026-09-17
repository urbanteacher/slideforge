const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('split canvas gestures preserve named layouts and support editing and cancellation',{timeout:120000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-canvas-split.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:110000});assert.match(stdout,/Body canvas passed:/);
});
