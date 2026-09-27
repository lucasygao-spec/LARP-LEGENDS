import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { stockMiddleware } from './server/stocks.mjs';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'TWELVE_DATA_');
  const middleware = stockMiddleware({ key: process.env.TWELVE_DATA_API_KEY || env.TWELVE_DATA_API_KEY });
  return { plugins: [react(), {
    name: 'stock-data-server',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  }] };
});
