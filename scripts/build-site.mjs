import { build } from 'esbuild';
import { build as buildClient } from 'vite';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

await buildClient({ build: { outDir: 'dist/client', emptyOutDir: true } });

await build({
  entryPoints: ['server/sites-worker.mjs'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});

await mkdir('dist/.openai', { recursive: true });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
await writeFile('dist/server/wrangler.json', JSON.stringify({
  name: 'larp-legends-investly',
  main: 'index.js',
  compatibility_date: '2026-09-27',
  assets: { directory: '../client', binding: 'ASSETS' },
}, null, 2) + '\n');
