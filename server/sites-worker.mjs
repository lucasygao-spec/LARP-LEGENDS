import { createStockService } from './stocks.mjs';

let service;
let serviceKey;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/stocks/scenario') {
      const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
      if (request.method !== 'GET') {
        return Response.json({}, { status: 405, headers: { ...headers, Allow: 'GET' } });
      }
      if (!service || serviceKey !== env.TWELVE_DATA_API_KEY) {
        serviceKey = env.TWELVE_DATA_API_KEY;
        service = createStockService({ key: serviceKey });
      }
      try {
        return Response.json(await service(), { headers });
      } catch (error) {
        const message = error.message === 'RATE_LIMIT'
          ? 'Stock prices are busy. Wait one minute, then retry. Your balance is unchanged.'
          : 'Stock prices are unavailable right now. Please retry. Your balance is unchanged.';
        return Response.json({ error: message }, { status: 503, headers });
      }
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    return env.ASSETS.fetch(request);
  },
};
