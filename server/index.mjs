import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { loadEnvFile } from 'node:process';
import { stockMiddleware } from './stocks.mjs';

// Deployment environment wins over a local developer file.
try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const stocks = stockMiddleware({ key: process.env.TWELVE_DATA_API_KEY });
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
createServer((req, res) => {
  void stocks(req, res, async () => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!['GET', 'HEAD'].includes(req.method) || pathname.startsWith('/api/')) { res.writeHead(404); res.end(); return; }
      let file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
      try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
      catch { if (extname(pathname)) { res.writeHead(404); res.end(); return; } file = resolve(root, 'index.html'); }
      const data = await readFile(file);
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(500); res.end('Unable to serve the application.'); }
  });
}).listen(Number(process.env.PORT || 3000), () => console.log('Game server ready.'));
