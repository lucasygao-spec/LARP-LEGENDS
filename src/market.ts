import sample from './data/markets.json';
export type MarketMonth = { month: number; etf: number; stocks: number };
export type MarketFeed = { source: 'sample' | 'api'; label: string; asOf: string; months: MarketMonth[]; notice: string };
export const sampleFeed: MarketFeed = { source: 'sample', label: 'Fictional sample market', asOf: 'Demo sequence', months: sample, notice: 'No market endpoint configured. Using fictional sample returns.' };
// The endpoint is a public, normalized historical-data proxy, never a browser API secret.
export function parseMarketFeed(raw: unknown): MarketFeed {
  const data = raw as { label?: unknown; asOf?: unknown; months?: unknown };
  if (!data || typeof data.label !== 'string' || !data.label.trim() || typeof data.asOf !== 'string' || !data.asOf.trim() || !Array.isArray(data.months) || data.months.length !== 12) throw new Error('Invalid market response');
  const months = data.months.map((row: MarketMonth, i: number) => {
    if (!row || row.month !== i + 1 || !Number.isFinite(row.etf) || !Number.isFinite(row.stocks) || row.etf < -1 || row.stocks < -1 || row.etf > 10 || row.stocks > 10) throw new Error('Invalid monthly return');
    return { month: row.month, etf: row.etf, stocks: row.stocks };
  });
  return { source: 'api', label: data.label.slice(0, 100), asOf: data.asOf.slice(0, 100), months, notice: 'Historical API returns replayed over your simulated year. Not a forecast.' };
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
