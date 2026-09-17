const {test}=require('node:test');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
test('artwork layers preserve existing theme decks and editing state',{timeout:120000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['tools/smoke-artwork.mjs'],{cwd:require('node:path').resolve(__dirname,'..'),timeout:110000});assert.match(stdout,/Artwork passed:/);
});
