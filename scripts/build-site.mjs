import { build } from 'esbuild';

await build({
  entryPoints: ['server/sites-worker.mjs'],
  outfile: 'dist/worker.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});
