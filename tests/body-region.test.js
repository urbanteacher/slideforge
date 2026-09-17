const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('body frames measure attached Library slides without inventing a lattice',{timeout:120000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-body-region.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:110000});assert.match(stdout,/Body frames passed:/);
});
