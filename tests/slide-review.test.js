const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('shared slide review and fit checks work across decks and shapes',{timeout:120000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-slide-review.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:110000});
 assert.match(stdout,/46 file\/campaign slides passed/);
});
