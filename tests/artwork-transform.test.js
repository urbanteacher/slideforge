const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('artwork can be selected and transformed on the canvas itself',{timeout:180000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-artwork-transform.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:170000});assert.match(stdout,/Artwork transform passed:/);
});
