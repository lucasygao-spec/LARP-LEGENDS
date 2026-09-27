export type StockPrice = { date: string; close: number; fx: number };
export type StockScenario = {
  source: 'Twelve Data'; company: string; symbol: string; exchange: string;
  currency: 'USD'; prices: [StockPrice, StockPrice, StockPrice];
};
export type StockMarket = { source: 'Twelve Data'; stocks: StockScenario[] };
export type StockInvestment = StockScenario & {
  units: number; contributed: number; value: number;
  proceeds: number | null;
};
export type StockPortfolio = { stocks: StockInvestment[]; point: number; contributed: number; value: number; proceeds: number | null };
export const cadPrice = (price: StockPrice) => price.close * price.fx;
export const stockDate = (portfolio: StockPortfolio) => portfolio.stocks[0].prices[portfolio.point].date;
export function parseStockScenario(raw: unknown): StockScenario {
  const s = raw as StockScenario;
  if (!s || s.source !== 'Twelve Data' || s.currency !== 'USD' ||
    ![s.company, s.symbol, s.exchange].every(v => typeof v === 'string' && v.trim().length > 0 && v.length <= 200) ||
    !Array.isArray(s.prices) || s.prices.length !== 3) throw new Error('Invalid historical stock data');
  let previous = '';
  const today = new Date().toISOString().slice(0, 10);
  for (const p of s.prices) {
    if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(Date.parse(p.date)) ||
      new Date(p.date).toISOString().slice(0, 10) !== p.date || p.date <= previous || p.date >= today ||
      !Number.isFinite(p.close) || p.close <= 0 || !Number.isFinite(p.fx) || p.fx <= 0 ||
      !Number.isFinite(cadPrice(p)) || cadPrice(p) <= 0) throw new Error('Invalid historical stock data');
    previous = p.date;
  }
  return structuredClone(s);
}
export function parseStockMarket(raw: unknown): StockMarket {
  const data = raw as StockMarket;
  if (!data || data.source !== 'Twelve Data' || !Array.isArray(data.stocks) || data.stocks.length < 2 || data.stocks.length > 6) throw new Error('Stock prices are unavailable. Please retry.');
  const stocks = data.stocks.map(parseStockScenario);
  if (new Set(stocks.map(s => s.symbol)).size !== stocks.length || stocks.some(s => s.prices.some((p, i) =>
    p.date !== stocks[0].prices[i].date || p.fx !== stocks[0].prices[i].fx))) throw new Error('Stock prices are unavailable. Please retry.');
  return { source: 'Twelve Data', stocks };
}
