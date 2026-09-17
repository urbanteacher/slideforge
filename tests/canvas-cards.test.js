const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('card canvas gestures reorder the saved deck and leave exports clean',{timeout:180000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-canvas-cards.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:170000});assert.match(stdout,/Card canvas passed:/);
});
