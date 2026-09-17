const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('fit and legibility are measured on production rendering, not on the lab lattice',{timeout:180000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-fit-check.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:170000});assert.match(stdout,/Fit check passed:/);
});
