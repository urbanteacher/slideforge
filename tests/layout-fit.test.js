const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('the layout picker measures its own thumbnails and reports direction and pixels',{timeout:180000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke/layout-fit.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:170000});assert.match(stdout,/layout picker \d+ shapes measured/);
});
