import { build, context } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = {
  absWorkingDir: root,
  entryPoints: ['src/model.js'],
  outfile: 'js/model.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  banner: { js: '/* Generated from src/model.js. Do not edit; run npm run build. */' }
};

if (process.argv.includes('--watch')) {
  const session = await context(options);
  await session.watch();
  console.log('Watching src/; serving the app still uses node server/server.js.');
} else {
  const result = await build({ ...options, write: false });
  const output = result.outputFiles[0];
  if (process.argv.includes('--check')) {
    const existing = await readFile(output.path, 'utf8').catch(() => null);
    if (existing !== output.text) {
      console.error('js/model.js is stale. Run npm run build and include the generated bundle.');
      process.exitCode = 1;
    }
  } else {
    await writeFile(output.path, output.contents);
    console.log('Built js/model.js from src/model.js.');
  }
}
