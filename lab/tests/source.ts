// The lab's source files and their imports, for the structure checks (file-budget, boundaries). Read from
// lab/src on disk: the tests run with the lab folder as their working directory (npm test here, and
// tests/lab-unit.test.js from the root).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export const SRC = resolve(process.cwd(), 'src');

const rel = (p: string) => relative(SRC, p).split('\\').join('/');

/** Every TypeScript source file under src/, relative to it ('engine/raster.ts'), assets and the generated player aside. */
export function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (f !== 'assets' && f !== 'generated') walk(p); }
      else if (/\.tsx?$/.test(f) && !f.endsWith('.d.ts')) out.push(rel(p));
    }
  };
  walk(SRC);
  return out.sort();
}

export const lineCount = (file: string) => readFileSync(join(SRC, file), 'utf8').split('\n').length;

export interface Import { from: string; spec: string; to: string | null; dynamic: boolean }

const resolveFile = (base: string): string | null => {
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

/** A file's relative imports, static and dynamic, each resolved to a file under src/ (null: not found). */
export function importsOf(file: string): Import[] {
  const code = readFileSync(join(SRC, file), 'utf8');
  const out: Import[] = [];
  const add = (spec: string, dynamic: boolean) => {
    if (!spec.startsWith('.')) return;
    const hit = resolveFile(resolve(SRC, dirname(file), spec.replace(/\?.*$/, '')));
    out.push({ from: file, spec, to: hit ? rel(hit) : null, dynamic });
  };
  for (const m of code.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'";]*?from\s*'([^']+)'/g)) add(m[1], false);
  for (const m of code.matchAll(/(?:^|\n)\s*import\s*'([^']+)'/g)) add(m[1], false);
  for (const m of code.matchAll(/import\(\s*'([^']+)'\s*\)/g)) add(m[1], true);
  return out;
}

/** The folder a file belongs to: 'engine', 'kinds/text', or '' for the files at the top of src/. */
export function unitOf(file: string): string {
  const parts = file.split('/');
  if (parts.length === 1) return '';
  if (parts[0] === 'kinds' && parts.length > 2) return `kinds/${parts[1]}`;
  return parts[0];
}
