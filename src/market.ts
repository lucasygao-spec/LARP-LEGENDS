import sample from './data/markets.json';
import { FUND_SYMBOLS } from './investments';
export type MarketMonth = { month: number; VAB: number; XUS: number; QQQ: number; BIZTECH: number };
export type MarketFeed = { source: 'sample' | 'api'; label: string; asOf: string; months: MarketMonth[]; notice: string };
export const sampleFeed: MarketFeed = { source: 'sample', label: 'Fictional sample market', asOf: 'Demo sequence', months: sample, notice: 'No market endpoint configured. Using fictional sample returns.' };
// The endpoint is a public, normalized historical-data proxy, never a browser API secret.
export function parseMarketFeed(raw: unknown): MarketFeed {
  const data = raw as { label?: unknown; asOf?: unknown; months?: unknown };
  if (!data || typeof data.label !== 'string' || !data.label.trim() || typeof data.asOf !== 'string' || !data.asOf.trim() || !Array.isArray(data.months) || data.months.length !== 12) throw new Error('Invalid market response');
  const months = data.months.map((row: MarketMonth, i: number) => {
    if (!row || row.month !== i + 1 || !FUND_SYMBOLS.every(symbol => Number.isFinite(row[symbol]) && row[symbol] >= -1 && row[symbol] <= 10)) throw new Error('Invalid monthly return');
    return { month: row.month, VAB: row.VAB, XUS: row.XUS, QQQ: row.QQQ, BIZTECH: sample[i].BIZTECH };
  });
  return { source: 'api', label: data.label.slice(0, 100), asOf: data.asOf.slice(0, 100), months, notice: 'Historical ETF API returns replayed in the demo. BizTech always uses fictional returns. No forecast.' };
}
export async function loadMarketFeed(endpoint?: string, fetcher: typeof fetch = fetch): Promise<MarketFeed> {
  if (!endpoint) return structuredClone(sampleFeed);
  try {
    const response = await fetcher(endpoint, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Market request failed');
    return parseMarketFeed(await response.json());
  } catch {
    return { ...structuredClone(sampleFeed), notice: 'Market API unavailable or invalid. Using fictional sample returns for this run.' };
  }
}
