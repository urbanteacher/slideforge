const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('a slide mark and its page number share one declared chrome region',{timeout:180000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-chrome-region.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:170000});assert.match(stdout,/Chrome region passed:/);
});
