import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStockService, stockMiddleware } from './stocks.mjs';

const dates = ['2025-01-02', '2025-07-01', '2025-12-31'];
const stock = { symbol: 'FIX', name: 'Fixture Industries (test data)', type: 'Common Stock', currency: 'USD', exchange: 'NASDAQ' };
const symbols = ['FIX', 'BETA', 'GAMMA'];
const now = () => new Date('2026-09-27');
function fixtureFetcher(calls, mutate = x => x) {
  return async url => {
    calls.push(url);
    const symbol = url.searchParams.get('symbol');
    const data = url.pathname === '/stocks' ? { data: [...symbols.map(symbol => ({...stock, symbol})), { ...stock, symbol: 'ETF', type: 'ETF' }] }
      : { meta: { symbol, currency: symbol !== 'USD/CAD' ? 'USD' : 'CAD' }, values: dates.map(datetime => ({ datetime, close: symbol !== 'USD/CAD' ? '100' : '1.25' })) };
    return new Response(JSON.stringify(mutate(data, url)));
  };
}
test('server selects provider-listed common stocks and joins real dated FX observations, caching provider calls', async () => {
  const calls = []; const service = createStockService({ key: 'test-only-secret', fetcher: fixtureFetcher(calls), now, symbols });
  const result = await service();
  assert.equal(result.stocks.length, 3); assert.equal(result.stocks[0].symbol, 'FIX'); assert.equal(result.stocks[0].company, stock.name);
  assert.deepEqual(result.stocks[0].prices.map(p => p.date), dates); assert.equal(result.stocks[0].prices[0].fx, 1.25);
  assert.ok(!JSON.stringify(result).includes('test-only-secret'));
  assert.equal(calls.length, 5);
  assert.equal(calls[2].searchParams.get('adjust'), 'splits');
  assert.equal(calls[1].searchParams.get('end_date'), '2025-12-31');
  assert.deepEqual(await service(), result); assert.equal(calls.length, 5);
});
test('no key, provider errors, mismatched symbols and missing historical/FX data never yield invented prices', async () => {
  await assert.rejects(createStockService({})(), /NOT_CONFIGURED/);
  for (const mutate of [
    () => ({status:'error',message:'secret provider details'}),
    (data, url) => url.pathname === '/stocks' ? data : {...data,meta:{symbol:'WRONG'}},
    (data, url) => url.pathname === '/stocks' ? data : {...data,values:[]},
    (data, url) => url.searchParams.get('symbol') === 'USD/CAD' ? {...data,values:data.values.slice(1)} : data,
  ]) await assert.rejects(createStockService({key:'test-only-secret',fetcher:fixtureFetcher([],mutate),now,symbols})());
});
test('HTTP failures are retryable and never reveal keys or provider error strings', async () => {
  let body = ''; const headers = {};
  const res = {setHeader(k,v){headers[k]=v;},end(value){body=value;},statusCode:200};
  await stockMiddleware({key:'test-only-secret',fetcher:async()=>{throw new Error('https://provider?apikey=test-only-secret');}})({method:'GET',url:'/api/stocks/scenario'},res,()=>assert.fail());
  assert.equal(res.statusCode,503); assert.match(body,/retry/i); assert.ok(!body.includes('test-only-secret'));
  assert.equal(headers['Cache-Control'],'no-store');
});

test('one unavailable company leaves multiple valid options, but never a fabricated quote', async () => {
  const service = createStockService({key:'test-only-secret',now,symbols,fetcher:fixtureFetcher([], (data,url) =>
    url.searchParams.get('symbol') === 'GAMMA' ? {status:'error'} : data)});
  const market = await service();
  assert.deepEqual(market.stocks.map(s => s.symbol),['FIX','BETA']);
});

test('all companies use common dates and concurrent players share provider requests', async () => {
  const calls=[];
  const service=createStockService({key:'test-only-secret',now,symbols,fetcher:fixtureFetcher(calls)});
  const [a,b]=await Promise.all([service(),service()]);
  assert.deepEqual(a,b); assert.equal(calls.length,5);
  await assert.rejects(createStockService({key:'test-only-secret',now,symbols,fetcher:fixtureFetcher([], (data,url) =>
    url.searchParams.get('symbol') === 'BETA' ? {...data,values:data.values.filter(p => p.datetime !== '2025-07-01')} : data)})());
});
