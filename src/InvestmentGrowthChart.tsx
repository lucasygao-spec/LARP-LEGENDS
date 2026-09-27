import { useId, useState } from 'react';
import type { PointerEvent } from 'react';
import { motion } from 'motion/react';
import { ChartNoAxesCombined, Info } from 'lucide-react';
import story from './data/story.json';
import { exactMoney, money, monthName, portfolio } from './engine';
import type { GameState } from './engine';

export function InvestmentGrowthChart({ state, reduced }: { state: GameState; reduced: boolean }) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const marketChange = state.stock ? state.totalMarketChange : state.monthlyGrowth;
  const monthly = state.ledger.filter((entry, i, all) => i === all.length - 1 || entry.month !== all[i + 1].month);
  const points = [{ month: 0, investments: state.ledger[0].investments, contributions: 0 }, ...monthly.map(entry => ({ month: entry.month, investments: entry.investments, contributions: Math.max(0, entry.contributed - entry.withdrawn) }))];
  const maximum = Math.ceil(Math.max(100, ...points.flatMap(point => [point.investments, point.contributions])) / 100) * 100;
  const x = (month: number) => 100 + month / story.length * 446;
  const y = (amount: number) => 218 - amount / maximum * 182;
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(point.month)},${y(point.investments)}`).join(' ');
  const contributionPoints = points.map(point => `${x(point.month)},${y(point.contributions)}`).join(' ');
  const active = points[hovered ?? focused ?? points.length - 1];
  const inspecting = hovered !== null || focused !== null;
  function inspect(event: PointerEvent<SVGSVGElement>) {
    // Convert through the SVG matrix so letterboxing and responsive sizes stay accurate.
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (position.x < 85 || position.x > 560 || position.y < 20 || position.y > 230) { setHovered(null); return; }
    const nearest = points.reduce((best, point, index) => Math.abs(x(point.month) - position.x) < Math.abs(x(points[best].month) - position.x) ? index : best, 0);
    setHovered(nearest);
  }
  return <section className="investment-chart" aria-labelledby="growth-title">
    <div className="investment-chart-heading"><h2 id="growth-title"><ChartNoAxesCombined size={27} />Portfolio Growth</h2><div className="growth-legend"><span className="portfolio-key">Portfolio value</span><span className="contribution-key">Net contributions</span></div></div>
    <div className="growth-readout" aria-live="off">
      <span>{active.month === 0 ? 'Starting point' : `Month ${active.month}`}<small>{inspecting ? 'Selected snapshot' : 'Latest snapshot'}</small></span>
      <strong>{exactMoney(active.investments)}<small>{exactMoney(active.contributions)} contributed, net</small></strong>
    </div>
    <svg viewBox="0 0 570 260" role="img" aria-label={`Portfolio value ${exactMoney(portfolio(state))}; net contributions ${exactMoney(Math.max(0, state.totalContributed - state.totalWithdrawn))}`} onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={() => setHovered(null)}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00ac91" stopOpacity=".18" /><stop offset="100%" stopColor="#00ac91" stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map(ratio => { const amount = maximum * ratio; return <g key={ratio}><line x1="100" x2="546" y1={y(amount)} y2={y(amount)} className="growth-gridline" /><text x="90" y={y(amount) + 4} textAnchor="end">{money(amount)}</text></g>; })}
      <motion.path d={`${path} L${x(points.at(-1)!.month)},218 L100,218 Z`} fill={`url(#${gradientId})`} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .7 }} />
      <polyline points={contributionPoints} className="contribution-series" />
      <motion.path d={path} className="portfolio-series" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : .8, ease: 'easeInOut' }} />
      {inspecting && <line x1={x(active.month)} x2={x(active.month)} y1="28" y2="218" className="growth-crosshair" />}
      <circle cx={x(active.month)} cy={y(active.investments)} r="10" className="growth-halo" />
      {points.map((point, index) => <g key={point.month}>
        <circle cx={x(point.month)} cy={y(point.contributions)} r="3" className="contribution-point" />
        <circle cx={x(point.month)} cy={y(point.investments)} r="4.5" className="portfolio-point" tabIndex={0} onFocus={() => setFocused(index)} onBlur={() => setFocused(null)} aria-label={`${monthName(point.month)}: portfolio ${exactMoney(point.investments)}, net contributions ${exactMoney(point.contributions)}`}>
          <title>{`${monthName(point.month)}: portfolio ${exactMoney(point.investments)} · net contributions ${exactMoney(point.contributions)}`}</title>
        </circle>
        <text x={x(point.month)} y="247" textAnchor="middle">{point.month === 0 ? 'Start' : `M${point.month}`}</text>
      </g>)}
    </svg>
    <div className={`growth-market-change ${marketChange < 0 ? 'negative' : ''}`}><ChartNoAxesCombined size={19} /><span>{state.stock ? 'Market change across your story:' : 'Market change this month:'} <strong>{marketChange >= 0 ? '+' : ''}{exactMoney(marketChange)}</strong></span><Info size={15} aria-label="Market change excludes contributions and withdrawals." /></div>
    {state.stock && <p className="growth-note">Monthly game snapshots. M6 includes the historical stock updates.</p>}
    {state.totalWithdrawn > 0 && <p className="growth-note">{exactMoney(state.totalWithdrawn)} sold from investments. Proceeds are reflected in your cash and any later spending.</p>}
  </section>;
}
