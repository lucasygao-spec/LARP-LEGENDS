import { useEffect, useRef, useState } from 'react';
import { buyStock, exactMoney, loadStock, netWorth, round, stockPerformance, stockResult } from './engine';
import type { GameState } from './engine';
import { cadPrice, parseStockMarket, stockDate } from './stockData';
import type { StockPortfolio } from './stockData';

function InvestmentReturn({ profit, percent }: ReturnType<typeof stockPerformance>) {
  return <span className={`stock-return ${profit < 0 ? 'loss' : profit > 0 ? 'gain' : ''}`}>
    {profit > 0 ? '+' : ''}{exactMoney(profit)} <small>({percent > 0 ? '+' : ''}{percent.toFixed(2)}%)</small>
  </span>;
}

function CompanyBreakdown({ stock }: { stock: StockPortfolio }) {
  return <div className="stock-breakdown">{stock.stocks.filter(h => h.contributed > 0).map(holding => {
    const result = stockPerformance(holding);
    return <section className="stock-company-performance" aria-label={`${holding.symbol} performance`} key={holding.symbol}>
      <h3>{holding.company} <span>({holding.symbol})</span></h3>
      <dl>
        <div><dt>Amount invested</dt><dd>{exactMoney(holding.contributed)}</dd></div>
        <div><dt>{holding.proceeds !== null ? 'Sale proceeds' : 'Current value'}</dt><dd>{exactMoney(result.value)}</dd></div>
        <div><dt>Gain / loss</dt><dd><InvestmentReturn {...result} /></dd></div>
      </dl>
    </section>;
  })}</div>;
}

function Attribution() {
  return <small className="stock-attribution"><a href="https://twelvedata.com" target="_blank" rel="noreferrer">Market data: Twelve Data</a></small>;
}

function StockLoader({ state, onChange }: { state: GameState; onChange: (state: GameState) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const ready = useRef(onChange);
  ready.current = onChange;
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    void (async () => {
      try {
        await Promise.resolve();
        if (controller.signal.aborted) return;
        const response = await fetch('/api/stocks/scenario', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(50000)]) });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Stock prices are unavailable. Please retry.');
        const market = parseStockMarket(data);
        if (!controller.signal.aborted) ready.current(loadStock(state, market));
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error && e.message.startsWith('Stock prices')
          ? e.message : 'Stock prices are unavailable. Please retry. Your balance is unchanged.');
      }
    })();
    return () => controller.abort();
  }, [attempt, state]);
  return <div className="stock-panel">{error ? <><p className="notice" role="alert">{error}</p><button className="primary-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></> : <p role="status">Loading stock prices…</p>}</div>;
}

export function StockSummary({ state }: { state: GameState }) {
  const stock = state.stock;
  if (!stock) return null;
  const result = stockPerformance(stock);
  return <section className="stock-summary" aria-label="Stock investment summary">
    <p>{stock.stocks.filter(h => h.contributed > 0).map(h => `${h.company} (${h.symbol})`).join(' · ')}</p>
    <p className="fine-print">{stock.stocks[0].prices[0].date} → {stockDate(stock)}</p>
    <dl className="ending-summary" aria-label="Final financial summary">
      <div><dt>Total invested</dt><dd>{exactMoney(stock.contributed)}</dd></div>
      <div><dt>{stock.proceeds !== null ? 'Total sale proceeds' : 'Total portfolio value'}</dt><dd>{exactMoney(result.value)}</dd></div>
      <div><dt>Overall gain / loss</dt><dd><InvestmentReturn {...result} /></dd></div>
      <div><dt>Penthouse rental</dt><dd>{exactMoney(state.rentalSpending || 0)}</dd></div>
      <div><dt>Remaining balance</dt><dd>{exactMoney(state.cash)}</dd></div>
      <div><dt>Total net worth</dt><dd>{exactMoney(netWorth(state))}</dd></div>
    </dl>
    <CompanyBreakdown stock={stock} />
    <p>{stockResult(state)}</p>
    <Attribution />
  </section>;
}

export function StockPanel({ state, onChange }: { state: GameState; onChange: (state: GameState) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  if (state.phase === 'stock-loading') return <StockLoader state={state} onChange={onChange} />;
  const stock = state.stock;
  if (!stock) return null;
  const number = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(number) && number >= .01 && number <= state.cash && Math.abs(round(number) - number) < 1e-8;
  const result = stockPerformance(stock);
  return <div className="stock-panel">
    <p className="stock-date">Historical prices · {stockDate(stock)}</p>
    <p className="stock-balance">Available balance <strong>{exactMoney(state.cash)}</strong></p>
    {stock.contributed > 0 && <section className="stock-holdings" aria-label="Your stock investments">
      <h2>Your investments</h2>
      <CompanyBreakdown stock={stock} />
      <dl className="stock-totals" aria-label="Portfolio totals">
        <div><dt>Total invested</dt><dd>{exactMoney(stock.contributed)}</dd></div>
        <div><dt>Total portfolio value</dt><dd>{exactMoney(result.value)}</dd></div>
        <div><dt>Overall gain / loss</dt><dd><InvestmentReturn {...result} /></dd></div>
      </dl>
      <p className="fine-print">Add to a company below or choose another stock.</p>
    </section>}
    <h2>{stock.contributed > 0 ? 'Keep building your investments' : 'Choose your stocks'}</h2>
    <div className="stock-options" aria-label="Stocks to choose from">
      {stock.stocks.map(holding => <div className="stock-option" key={holding.symbol}>
        <div className="stock-option-row">
          <div className="stock-company"><h3>{holding.company}</h3><span>{holding.symbol}</span></div>
          <strong>{exactMoney(cadPrice(holding.prices[stock.point]))}</strong>
          <button type="button" className="stock-invest" aria-label={`Invest in ${holding.company} (${holding.symbol})`} disabled={state.cash < .01} onClick={() => { setSelected(holding.symbol); setAmount(String(Math.min(500, state.cash))); setError(''); }}>Invest</button>
        </div>
        {selected === holding.symbol && <form className="stock-form" onSubmit={e => {
          e.preventDefault();
          if (!valid) return;
          try { onChange(buyStock(state, number, holding.symbol)); setSelected(null); setError(''); } catch (e) { setError((e as Error).message); }
        }}>
          <label htmlFor="stock-amount">Amount to invest (CAD)</label>
          <input className="player-name-input" id="stock-amount" type="number" min="0.01" max={state.cash} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus aria-describedby="stock-amount-help" />
          <p id="stock-amount-help" className="fine-print">Choose up to {exactMoney(state.cash)} from your balance.</p>
          {!valid && <p role="alert">Enter an amount between CA$0.01 and {exactMoney(state.cash)}, with up to two decimal places.</p>}
          {error && <p role="alert">{error}</p>}
          <div className="stock-form-actions"><button className="primary-button" disabled={!valid} type="submit">Confirm investment</button><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Cancel</button></div>
        </form>}
      </div>)}
    </div>
    <p className="fine-print">Fictional money. Stocks can rise or fall. {stock.point < 2 ? `Next update: ${stock.stocks[0].prices[stock.point + 1].date}.` : 'You’ve reached the last update.'}</p>
    <Attribution />
  </div>;
}
