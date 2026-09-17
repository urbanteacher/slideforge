#!/usr/bin/env node
/* Compatibility entry point; the platform checker owns measurement. */
import {fileURLToPath} from 'node:url';
import {main} from '../tools/check-fit.mjs';
const files=['Safe','Smart','Creative','Responsible','Future'].map(name=>fileURLToPath(new URL(`./bundles/AiAd27-${name}.sfbundle.json`,import.meta.url)));
main([...files,...process.argv.slice(2)]).catch(e=>{console.error(e.message);process.exitCode=1;});
