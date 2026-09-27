// Only this server module knows the credential. Never return provider URLs/errors.
export function createStockService({ key, fetcher = fetch, now = () => new Date(), symbols = ['AAPL', 'MSFT', 'KO'] } = {}) {
  const cache = new Map();
  const pending = new Map();
  let credits = [];
  async function request(path, params) {
    const cacheKey = `${path}:${new URLSearchParams(params)}`;
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return hit.data;
    if (pending.has(cacheKey)) return pending.get(cacheKey);
    const operation = (async () => {
      credits = credits.filter(t => Date.now() - t < 60000);
      if (credits.length >= 8) throw new Error('RATE_LIMIT');
      credits.push(Date.now());
      const url = new URL(path, 'https://api.twelvedata.com/');
      url.search = new URLSearchParams({ ...params, apikey: key }).toString();
      const response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok) throw new Error('PROVIDER_UNAVAILABLE');
      const data = await response.json();
      if (data.status === 'error') throw new Error('PROVIDER_UNAVAILABLE');
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, { data, expires: Date.now() + 3600000 });
      return data;
    })();
    pending.set(cacheKey, operation);
    try { return await operation; } finally { pending.delete(cacheKey); }
  }
  return async function scenario() {
    if (!key?.trim()) throw new Error('NOT_CONFIGURED');
    const listed = await request('stocks', { country: 'United States', type: 'Common Stock' });
    const stocks = listed.data?.filter(s => s.currency === 'USD' && s.type === 'Common Stock' &&
      ['NASDAQ', 'NYSE'].includes(s.exchange) && typeof s.name === 'string' && s.name.trim() &&
      typeof s.symbol === 'string' && /^[A-Z0-9.-]{1,20}$/.test(s.symbol));
    if (!stocks?.length) throw new Error('NO_STOCKS');
    const selected = symbols.map(symbol => stocks.find(s => s.symbol === symbol)).filter(Boolean);
    if (selected.length < 2) throw new Error('NO_STOCKS');
    const year = now().getUTCFullYear() - 1;
    const range = { interval: '1day', start_date: `${year}-01-01`, end_date: `${year}-12-31`, outputsize: '5000', order: 'ASC' };
    const [fxResult, ...stockResults] = await Promise.allSettled([
      request('time_series', { ...range, symbol: 'USD/CAD' }),
      ...selected.map(stock => request('time_series', { ...range, symbol: stock.symbol, exchange: stock.exchange, adjust: 'splits' })),
    ]);
    if (fxResult.status !== 'fulfilled') throw fxResult.reason;
    const fx = fxResult.value;
    if (fx.meta?.symbol !== 'USD/CAD') throw new Error('INVALID_DATA');
    const fxByDate = new Map(fx.values?.map(p => [p.datetime, Number(p.close)]));
    const available = stockResults.flatMap((result, i) => {
      const stock = selected[i];
      if (result.status !== 'fulfilled') return [];
      const history = result.value;
      if (history.meta?.symbol !== stock.symbol || history.meta?.currency !== 'USD') return [];
      const prices = history.values?.map(p => ({ date: p.datetime, close: Number(p.close), fx: fxByDate.get(p.datetime) }))
      .filter(p => typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= range.start_date && p.date <= range.end_date &&
        Number.isFinite(p.close) && p.close > 0 && Number.isFinite(p.fx) && p.fx > 0 && Number.isFinite(p.close * p.fx))
      .sort((a, b) => a.date.localeCompare(b.date));
      if (!prices?.length || prices[0].date > `${year}-01-15` || prices.at(-1).date < `${year}-12-15`) return [];
      return [{ stock, prices, byDate: new Map(prices.map(p => [p.date, p])) }];
    });
    if (available.length < 2) throw new Error('INCOMPLETE_HISTORY');
    // All holdings share observation dates and FX rates; never compare stale prices.
    const prices = available[0].prices.filter(p => available.every(s => s.byDate.has(p.date)));
    const first = prices?.[0];
    const middle = prices?.find(p => p.date >= `${year}-07-01`);
    const last = prices?.at(-1);
    // No interpolation, synthetic prices, or silently shortened IPO scenarios.
    if (!first || !middle || !last || first.date > `${year}-01-15` || middle.date > `${year}-07-15` || last.date < `${year}-12-15` ||
      first.date >= middle.date || middle.date >= last.date) throw new Error('INCOMPLETE_HISTORY');
    return { source: 'Twelve Data', stocks: available.map(({ stock, byDate }) => ({
      source: 'Twelve Data', company: stock.name, symbol: stock.symbol, exchange: stock.exchange, currency: 'USD',
      prices: [first, middle, last].map(p => byDate.get(p.date)),
    })) };
  };
}

export function stockMiddleware(options) {
  const scenario = createStockService(options);
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/stocks/scenario') return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); res.end('{}'); return; }
    try { res.end(JSON.stringify(await scenario())); }
    catch (error) {
      res.statusCode = 503;
      const message = error.message === 'NOT_CONFIGURED'
        ? 'Stock prices are unavailable right now. Please try again later. Your balance is unchanged.'
        : error.message === 'RATE_LIMIT'
          ? 'Stock prices are busy. Wait one minute, then retry. Your balance is unchanged.'
          : 'Stock prices are unavailable right now. Please retry. Your balance is unchanged.';
      res.end(JSON.stringify({ error: message }));
    }
  };
}
