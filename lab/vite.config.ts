import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { build, defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only: lets smoke tests save exports straight to ./exports (never included in builds).
const devSaveExports = (): Plugin => ({
  name: 'dev-save-exports',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__dev/save', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
      const name = basename(new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'export.bin');
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const dir = resolve(import.meta.dirname, 'exports');
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, name), Buffer.concat(chunks));
        res.end(JSON.stringify({ ok: true, path: resolve(dir, name) }));
      });
    });
  },
});

// Dev-only: keep the inlined export player in sync with engine edits.
const devRebuildPlayer = (): Plugin => ({
  name: 'dev-rebuild-player',
  apply: 'serve',
  configureServer(server) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    server.watcher.on('change', (file) => {
      if (!/[\\/]src[\\/](engine|model)[\\/]/.test(file)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        build({ configFile: resolve(import.meta.dirname, 'vite.player.config.ts'), logLevel: 'warn' })
          .then(() => server.config.logger.info('[slideforge] export player rebuilt'))
          .catch((e) => server.config.logger.error(String(e)));
      }, 300);
    });
  },
});

/** SlideForge's game and activity logic, imported where it lives (../src) rather than copied: '@sf/games/…',
 *  '@sf/activities/…'. Typed in src/sf.d.ts. Until the classic room is retired (lab-engine-plan M14) the
 *  same files build into js/model.js too, so they stay plain JavaScript with no DOM and no SF global. */
export const SF_ALIAS = { '@sf': resolve(import.meta.dirname, '../src') };

export default defineConfig({
  plugins: [react(), devSaveExports(), devRebuildPlayer()],
  resolve: { alias: SF_ALIAS },
  // ../src is outside the lab's root: the dev server may read it.
  server: { port: 5199, fs: { allow: [resolve(import.meta.dirname, '..')] } },
});
