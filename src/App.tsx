import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Lightbulb, Settings, ChartNoAxesCombined, Check, Coins, CreditCard, GitCompareArrows, House, Info, RotateCcw, ShieldCheck, Sparkles, ThumbsUp, Volume2, VolumeX, Wallet, Wrench, X, Landmark, ReceiptText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import story from './data/story.json';
import { avatars, getAvatar } from './avatarCatalog';
import type { AvatarId } from './avatarCatalog';
import { ACCOUNTS, GOALS, choose, choicesFor, continueGame, disabledReason, exactMoney, goalProgress, initialState, money, monthName, netWorth, portfolio, totalDebt, RULES } from './engine';
import type { Account, GameState } from './engine';
import { FUNDS, HOLDINGS, METHODS } from './investments';
import type { Fund } from './investments';
import { loadMarketFeed } from './market';
const Town = lazy(() => import('./Town'));
const STORAGE_KEY = 'investly.previous-run.v4';
const PROFILE_KEY = 'investly.player.v1';
type FinancialLiteracyLevel = 1 | 2 | 3;
type PlayerProfile = { name: string; avatarId: AvatarId; literacyLevel: FinancialLiteracyLevel };
const literacyLevels: { level: FinancialLiteracyLevel; name: string; description: string }[] = [
  { level: 1, name: 'Money Rookie', description: "I'm beginning to understand." },
  { level: 2, name: 'Money Minded', description: "I'm starting to think ahead." },
  { level: 3, name: 'Financially Savvy', description: 'I understand the game.' },
];
function loadProfile(): PlayerProfile | null {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (typeof data?.name !== 'string' || !data.name.trim() || !avatars.some(avatar => avatar.id === data.avatarId) || ![1, 2, 3].includes(data.literacyLevel)) return null;
    return { name: data.name.trim().slice(0, 32), avatarId: data.avatarId, literacyLevel: data.literacyLevel };
  } catch { return null; }
}
function loadPrevious(): GameState | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data || data.version !== 4 || data.phase !== 'complete' || data.month !== story.length || (data.goal !== null && !(data.goal in GOALS)) || !Array.isArray(data.ledger) || !data.ledger.length || !Array.isArray(data.decisionHistory) || data.decisionHistory.length !== story.length || !data.holdings || !data.market) return null;
    if (!['cash', 'savings', 'emergencySavings', 'studentDebt', 'totalContributed', 'totalWithdrawn', 'totalMarketChange', 'totalInterest'].every(k => Number.isFinite(data[k]))) return null;
    if (!HOLDINGS.every(symbol => Number.isFinite(data.holdings[symbol])) || !data.decisionHistory.every((d: {title?: unknown}) => typeof d.title === 'string')) return null;
    return data;
  } catch { return null; }
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = bodyOverflow; }; }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="modal-title"><div className="modal-top"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function StoryAlert({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('h1')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} className="story-alert" aria-labelledby="story-title" onCancel={e => e.preventDefault()} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const controls = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = controls[0]; const last = controls.at(-1);
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLButtonElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }}>
    <div className="alert-panel"><div className="alert-eyebrow"><Wrench size={18} />UNEXPECTED EXPENSE · MONTH 3</div>{children}</div>
  </dialog>;
}
function NetWorthChart({ state }: { state: GameState }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = [{ ...state.ledger[0], month: 0 }, ...state.ledger.filter((entry, i, all) => i === all.length - 1 || entry.month !== all[i + 1].month)];
  const values = points.map(p => p.netWorth); const low = Math.min(0, ...values); const high = Math.max(1500, ...values) * 1.12;
  const coords = points.map(p => ({ x: 12 + p.month / story.length * 590, y: 86 - (p.netWorth - low) / (high - low) * 70 }));
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '); const last = coords.at(-1)!;
  const shown = hovered === null ? points.at(-1)! : points[hovered];
  return <div className="net-chart"><div className="chart-header"><div><span className="small-label">{hovered === null ? 'Your net worth' : `${monthName(shown.month)} net worth`}</span><strong>{money(shown.netWorth)} <span className="chart-change">{netWorth(state) >= 1000 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{money(netWorth(state) - 1000)} since the start</span></strong></div><span className="live-badge"><i /> YOUR STORY, SO FAR</span></div><svg viewBox="0 0 620 107" role="img" aria-label={`Net worth from $1,000 at the start to ${exactMoney(netWorth(state))} in ${monthName(state.month)}`} onPointerLeave={() => setHovered(null)}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6a966d" stopOpacity="0.16" /><stop offset="100%" stopColor="#6a966d" stopOpacity="0" /></linearGradient></defs>{[25, 55, 85].map(y => <line key={y} x1="12" x2="603" y1={y} y2={y} stroke="#e9ece4" strokeDasharray="3 5" />)}<motion.path initial={false} animate={{ d: `${path} L ${last.x} 87 L 12 87 Z` }} fill="url(#chart-fill)" transition={{ duration: 0.5 }} /><motion.path initial={false} animate={{ d: path }} fill="none" stroke="#668a61" strokeWidth="2.4" strokeLinejoin="round" transition={{ duration: 0.5 }} /><circle cx={last.x} cy={last.y} r="7" fill="#7da774" opacity="0.16" /><circle cx={last.x} cy={last.y} r="3.5" fill="#668a61" />{coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="9" className="chart-point" tabIndex={0} role="button" aria-label={`${monthName(points[i].month)}: ${exactMoney(points[i].netWorth)}`} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} onPointerEnter={() => setHovered(i)} onClick={() => setHovered(i)}><title>{monthName(points[i].month)}: {exactMoney(points[i].netWorth)}</title></circle>)}{['START', 'M2', 'M4', 'M6'].map((m, i) => <text key={m} x={12 + i * (590 / 3)} y="105" textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}>{m}</text>)}</svg><div className="chart-foot">Cash + savings + emergency fund + investments − debt</div></div>;
}
function InvestmentGrowthChart({ state }: { state: GameState }) {
  const monthly = state.ledger.filter((entry, i, all) => i === all.length - 1 || entry.month !== all[i + 1].month);
  const points = [{ month: 0, investments: state.ledger[0].investments, contributions: 0 }, ...monthly.map(entry => ({ month: entry.month, investments: entry.investments, contributions: Math.max(0, entry.contributed - entry.withdrawn) }))];
  const maximum = Math.ceil(Math.max(100, ...points.flatMap(point => [point.investments, point.contributions])) / 100) * 100;
  const x = (month: number) => 66 + month / story.length * 480;
  const y = (amount: number) => 218 - amount / maximum * 182;
  const portfolioPoints = points.map(point => `${x(point.month)},${y(point.investments)}`).join(' ');
  const contributionPoints = points.map(point => `${x(point.month)},${y(point.contributions)}`).join(' ');
  return <section className="investment-chart" aria-labelledby="growth-title">
    <div className="investment-chart-heading"><h2 id="growth-title"><ChartNoAxesCombined size={27} />Portfolio Growth</h2><div className="growth-legend"><span className="portfolio-key">Portfolio value</span><span className="contribution-key">Net contributions</span></div></div>
    <svg viewBox="0 0 570 260" role="img" aria-label={`Portfolio value ${exactMoney(portfolio(state))}; net contributions ${exactMoney(Math.max(0, state.totalContributed - state.totalWithdrawn))}`}>
      {[0, 0.5, 1].map(ratio => { const amount = maximum * ratio; const lineY = y(amount); return <g key={ratio}><line x1="66" x2="546" y1={lineY} y2={lineY} className="growth-gridline" /><text x="54" y={lineY + 4} textAnchor="end">{money(amount)}</text></g>; })}
      {points.map(point => <line key={point.month} x1={x(point.month)} x2={x(point.month)} y1="36" y2="218" className="growth-gridline" />)}
      <polyline points={portfolioPoints} className="portfolio-series" /><polyline points={contributionPoints} className="contribution-series" />
      {points.map(point => <g key={point.month}><circle cx={x(point.month)} cy={y(point.contributions)} r="3" className="contribution-point" /><circle cx={x(point.month)} cy={y(point.investments)} r="4.5" className="portfolio-point" tabIndex={0} aria-label={`${monthName(point.month)}: portfolio ${exactMoney(point.investments)}, net contributions ${exactMoney(point.contributions)}`}><title>{`${monthName(point.month)}: portfolio ${exactMoney(point.investments)} · net contributions ${exactMoney(point.contributions)}`}</title></circle><text x={x(point.month)} y="247" textAnchor="middle">{point.month === 0 ? 'Start' : `M${point.month}`}</text></g>)}
    </svg>
    <div className={`growth-market-change ${state.monthlyGrowth < 0 ? 'negative' : ''}`}><ChartNoAxesCombined size={19} /><span>Market change this month: <strong>{state.monthlyGrowth >= 0 ? '+' : ''}{exactMoney(state.monthlyGrowth)}</strong></span><Info size={15} aria-label="Market change excludes contributions and withdrawals." /></div>
    {state.totalWithdrawn > 0 && <p className="growth-note">{exactMoney(state.totalWithdrawn)} moved out of investments into savings. The drop in portfolio value includes this withdrawal.</p>}
  </section>;
}
function Stat({ icon: Icon, label, amount, maxAmount, tone }: { icon: LucideIcon; label: string; amount: number; maxAmount: number; tone: string }) {
  const width = Math.min(100, amount / maxAmount * 100);
  return <div className={`stat ${tone}`} title={exactMoney(amount)}><span><Icon size={15} />{label}</span><div className="stat-track" role="progressbar" aria-label={`${label} balance`} aria-valuenow={Math.round(amount)} aria-valuemin={0} aria-valuemax={Math.round(maxAmount)}><motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} /></div><motion.strong key={amount} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }}>{money(amount)}</motion.strong></div>;
}
function HowItWorks({ state }: { state: GameState }) {
  return <><p className="modal-intro">A short pitch demo: first job, emergency, birthday, investing, and a choice about your future.</p><dl className="rules">
    <div><dt>Starting point</dt><dd>Age 18; $1,000 cash; all other balances $0. Choose your name and avatar. Every amount is simulated Canadian dollars.</dd></div>
    <div><dt>Simple budgets</dt><dd>Work: a $30,000/year BizTech mascot job, with $400/month available after simplified taxes and essentials. Uni: $5,000 tuition debt and $100/month available from part-time work. The $250/month raise starts in Month 5; on the work path it represents a 10% salary increase. The university path receives the same extra cash as a demo assumption.</dd></div>
    <div><dt>Emergency & birthday</dt><dd>The optional emergency deposit is $200. The medical bill is $200; use the fund or ask Mom for a $200 gift that is immediately used to pay the bill. The $1,000 birthday gift arrives once in Month 4. General savings and emergency savings are separate; neither earns interest here.</dd></div>
    <div><dt>Investing steps</dt><dd>Opening an account, selecting a method, and choosing an ETF are substeps in the same month. An account-opening birthday choice reserves the gift in cash; investing the raise then invests that $1,000 plus $250. All four methods lead to the same ETF picker; provider fees and services are not modeled.</dd></div>
    <div><dt>Funds & returns</dt><dd>VAB, XUS, and QQQ are real funds used as examples. The pitch’s 2–4%, 7–11%, and 18% annual figures are illustrative assumptions, not verified historical CAGR, forecasts, or the returns used by this engine. Relative risk labels are simplified demo categories. BizTech is always fictional. Foreign exchange, taxes, distributions, account eligibility, contribution limits, and withdrawal rules are not modeled.</dd></div>
    <div><dt>Market source</dt><dd>{state.market.label} · {state.market.asOf}. {state.market.notice} Existing holdings change before each new $250 contribution. A run and its replay use the same frozen sequence.</dd></div>
    <div><dt>Miami goal</dt><dd>The penthouse choice sets a fictional $1,000,000 goal, sells the current portfolio into general savings, and redirects an investing raise plan to savings. It does not buy property. Goal progress counts general savings.</dd></div>
    <div><dt>Accounting</dt><dd>Student debt uses a fictional 6% APR ÷ 12. All balances round to cents. Net worth = cash + general savings + emergency savings + investments − all debt. Portfolio = contributions + market change − withdrawals. Rebalancing does not count as a new contribution. Financial effects are symbolic; the ledger has exact amounts.</dd></div>
    <div><dt>Controls</dt><dd>Click a choice to apply it immediately, then continue after reading the result. Number keys 1–4 also choose immediately; Tab and Enter operate every control. The medical alert fills the screen. The pitch ends after your Month 6 investment decision. Replay and compare with your previous completed pitch. No real accounts or trades are created.</dd></div>
  </dl></>;
}
function Compare({ state, previous }: { state: GameState; previous: GameState | null }) {
  const rows: [string, (s: GameState) => number][] = [['Cash', s => s.cash], ['General savings', s => s.savings], ['Emergency fund', s => s.emergencySavings], ['Investments', portfolio], ['Contributed', s => s.totalContributed], ['Withdrawn', s => s.totalWithdrawn], ['Investment growth', s => s.totalMarketChange], ['Debt', totalDebt], ['Net worth', netWorth]];
  return <><p className="modal-intro">See how your choices add up over time.</p>{!previous && <p className="notice">Finish the pitch, then replay to compare two paths.</p>}<table className="compare-table"><thead><tr><th>At a glance</th><th>This run · M{state.month}</th><th>Previous run</th></tr></thead><tbody>{rows.map(([label, get]) => <tr key={label}><th>{label}</th><td>{exactMoney(get(state))}</td><td>{previous ? exactMoney(get(previous)) : '—'}</td></tr>)}<tr><th>Account / goal</th><td>{state.account || 'None'} / {state.goal ? GOALS[state.goal].name : 'Not selected'}</td><td>{previous ? `${previous.account || 'None'} / ${previous.goal ? GOALS[previous.goal].name : 'Not selected'}` : '—'}</td></tr></tbody></table><h3 className="modal-subtitle">Your paths</h3><div className="path-list">{Array.from({length: story.length}, (_, i) => <div key={i}><span>{`M${i + 1}`}</span><p>{state.decisionHistory[i]?.title || 'Still ahead'}</p><p>{previous?.decisionHistory[i]?.title || '—'}</p></div>)}</div><p className="fine-print">This run: {state.market.label} ({state.market.asOf}). Previous: {previous ? `${previous.market.label} (${previous.market.asOf})` : 'none'}. Different data sequences can also affect results.</p></>;
}
function InvestmentSummary({ state, onClose }: { state: GameState; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 760px)').matches) ref.current?.scrollIntoView({ block: 'start' });
  }, []);
  const choices = new Set(state.decisionHistory.map(decision => decision.choice));
  const wentWell: string[] = [];
  const learnNext: string[] = [];
  if (choices.has('work')) wentWell.push('Avoided tuition debt on the work path.');
  if (choices.has('save-emergency')) wentWell.push(choices.has('use-emergency') ? 'Used your $200 emergency cushion to cover the medical bill.' : 'Set aside $200 for unexpected costs.');
  if (state.totalContributed > 0) wentWell.push(`Invested ${money(state.totalContributed)} during your story.`);
  if (state.method && state.account) wentWell.push('Chose an account and investing approach before selecting a fund.');
  if (choices.has('ask-mom')) learnNext.push('Your emergency fund was short. Build a cushion for the next surprise.');
  if (state.holdings.BIZTECH > 0 || choices.has('biztech')) learnNext.push('BizTech put your money in one company. Explore how diversification spreads risk.');
  if (state.selectedFund === 'QQQ' || choices.has('higher-risk')) learnNext.push('Nasdaq-100 (QQQ) is concentrated. Make sure the risk fits your time horizon.');
  if (state.selectedFund === 'VAB' || choices.has('lower-risk')) learnNext.push('Bonds lowered risk relative to the other demo funds, but their value can still fall.');
  if (choices.has('birthday-savings')) learnNext.push('Savings kept your gift accessible; it earns no interest in this demo.');
  if (choices.has('penthouse')) learnNext.push('Moved investments into savings toward your $1,000,000 goal.');
  if (state.monthlyGrowth !== 0) learnNext.push(`The market changed your portfolio by ${state.monthlyGrowth > 0 ? '+' : ''}${exactMoney(state.monthlyGrowth)} this month. Future returns can differ.`);
  if (!wentWell.length) wentWell.push('Kept money accessible while exploring your options.');
  if (!learnNext.length) learnNext.push('Match your investments to your goals and keep emergency money separate.');
  return <motion.section ref={ref} className="results-summary" aria-label="Investment summary" tabIndex={-1} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <InvestmentGrowthChart state={state} />
    <section className="monthly-summary" aria-labelledby="monthly-summary-title">
      <div className="monthly-summary-heading"><h2 id="monthly-summary-title"><CalendarDays size={24} />This month’s summary</h2><button className="icon-button" aria-label="Close summary" onClick={onClose}><X size={18} /></button></div>
      <div className="monthly-summary-content">
        <section className="summary-section positive"><span className="summary-icon"><ThumbsUp size={19} /></span><div><h3>What went well</h3><ul>{wentWell.map(item => <li key={item}>{item}</li>)}</ul></div></section>
        <section className="summary-section learning"><span className="summary-icon"><Lightbulb size={20} /></span><div><h3>What to learn next</h3><ul>{learnNext.map(item => <li key={item}>{item}</li>)}</ul></div></section>
        <p className="summary-note">Your choices so far · Simulated money · Month {state.month}</p>
      </div>
    </section>
  </motion.section>;
}
export default function App() {
  const [state, setState] = useState(initialState);
  const [profile, setProfile] = useState<PlayerProfile | null>(loadProfile);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId | null>(null);
  const [selectedLiteracyLevel, setSelectedLiteracyLevel] = useState<FinancialLiteracyLevel | null>(null);
  const [previous, setPrevious] = useState<GameState | null>(loadPrevious);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [modal, setModal] = useState<'how' | 'compare' | 'settings' | Account | Fund | null>(null);
  const [quietMotion, setQuietMotion] = useState(false);
  const [tab, setTab] = useState<'town' | 'ledger'>('town');
  const [sound, setSound] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const reduced = !!useReducedMotion() || quietMotion;
  const heading = useRef<HTMLHeadingElement>(null);
  const summaryButton = useRef<HTMLButtonElement>(null);
  const completed = state.phase === 'complete'; const result = state.phase === 'result';
  const accountStep = state.phase === 'account'; const fundStep = state.phase === 'fund';
  const event = story[Math.min(state.month - 1, story.length - 1)]; const choices = choicesFor(state);
  const lesson = completed ? 'Your habits matter. Build a cushion, understand your risk, and invest toward a goal.' : state.phase === 'method' || fundStep ? 'How you invest and what you invest in are different decisions.' : event.lesson;
  const title = completed ? 'Your choices added up.' : result ? 'Here’s what happened' : accountStep ? 'Which account would you like to open?' : state.phase === 'method' ? 'You got a raise!' : fundStep ? 'Which ETF would you like to invest in?' : state.phase === 'assistance' ? 'Your emergency fund is empty!' : state.month === 6 && state.monthlyGrowth > 0 ? 'Omg congrats! Your investments grew.' : state.month === 6 && state.monthlyGrowth < 0 ? 'Markets had a rough month.' : event.title;
  const description = accountStep ? 'Pick a simulated account. Learn More explains each one.' : state.phase === 'method' ? (state.path === 'work' ? event.body : 'Your part-time role brings an extra $250/month in this demo. How would you like to invest?') : fundStep ? `${state.explanation} You have ${money(Math.min(state.cash, state.reservedGift + RULES.raise))} ready to invest.` : state.phase === 'assistance' ? 'You don’t have $200 in your emergency fund. You have to call Mom to ask for money :(' : state.month === 5 && state.path === 'university' ? 'Your part-time role brings an extra $250/month in this demo. Where should it go?' : state.month === 6 ? `${state.monthlyGrowth > 0 ? `You made ${exactMoney(state.monthlyGrowth)} this month!` : state.monthlyGrowth < 0 ? `Your investments fell ${exactMoney(-state.monthlyGrowth)} this month.` : 'Your cash and savings stayed out of the market.'} What would you like to do with this money?` : event.body;
  function play(cue = 'click_001') { if (sound) { const audio = new Audio(`/audio/${cue}.ogg`); audio.volume = 0.3; void audio.play().catch(() => {}); } }
  function replay() { if (completed) setPrevious(state); setSummaryOpen(false); setState(initialState(state.market)); setTab('town'); play('back_001'); }
  function makeChoice(id: string) {
    if (loadingMarket || disabledReason(state, id)) return;
    setState(current => current.month === state.month && current.phase === state.phase && !disabledReason(current, id) ? choose(current, id) : current);
    play('confirmation_001');
  }
  function openSummary() { setTab('town'); setSummaryOpen(true); }
  function closeSummary() { setSummaryOpen(false); summaryButton.current?.focus({ preventScroll: true }); }
  function next() { setState(current => current.phase === 'result' && current.month === state.month ? continueGame(current) : current); play(); }
  useEffect(() => { let active = true; void loadMarketFeed(import.meta.env.VITE_MARKET_DATA_URL).then(feed => { if (active) { setState(initialState(feed)); setLoadingMarket(false); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (completed) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { setStorageUnavailable(true); } } }, [completed, state]);
  useEffect(() => { if (completed) setSummaryOpen(true); }, [completed]);
  useEffect(() => { if (state.month > 1 || state.phase !== 'choice') heading.current?.focus({ preventScroll: true }); }, [state.phase, state.month]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || modal || !profile || loadingMarket || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key)) return;
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;
      const choice = choices[Number(e.key) - 1];
      if (choice && !disabledReason(state, choice.id)) { e.preventDefault(); makeChoice(choice.id); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [choices, modal, profile, loadingMarket, state]);
  const goal = state.goal ? GOALS[state.goal] : null;
  const accountInfo = modal && modal in ACCOUNTS ? ACCOUNTS[modal as Account] : null;
  const fundInfo = modal && modal in FUNDS ? FUNDS[modal as Fund] : null;
  const balanceMax = Math.max(1, state.cash, portfolio(state), totalDebt(state), state.savings, state.emergencySavings);
  function startJourney(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = playerName.trim().slice(0, 32);
    if (!name || !selectedAvatarId || !selectedLiteracyLevel || loadingMarket) return;
    const nextProfile = { name, avatarId: selectedAvatarId, literacyLevel: selectedLiteracyLevel };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); }
    catch { setStorageUnavailable(true); }
    setProfile(nextProfile);
  }
  if (!profile) return <MotionConfig reducedMotion={quietMotion ? 'always' : 'user'}><main className="onboarding-screen"><form className="onboarding-card" onSubmit={startJourney}>
    <h1>Set up your character</h1>
    <label className="player-name-label" htmlFor="player-name">Your name</label>
    <input id="player-name" className="player-name-input" autoComplete="nickname" maxLength={32} value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your name" required />
    <div className="avatar-picker-heading"><h2>Choose your character</h2></div>
    <div className="avatar-picker" role="radiogroup" aria-label="Choose your character">{avatars.map(avatar => <button type="button" role="radio" aria-checked={selectedAvatarId === avatar.id} aria-label={avatar.name} className={`avatar-option ${selectedAvatarId === avatar.id ? 'selected' : ''}`} key={avatar.id} onClick={() => setSelectedAvatarId(avatar.id)}><img src={avatar.preview} alt="" loading="lazy" /><span><b>{avatar.name}</b></span>{selectedAvatarId === avatar.id && <Check size={18} />}</button>)}</div>
    <div className="avatar-picker-heading literacy-heading"><h2>How familiar are you with money?</h2></div>
    <div className="literacy-picker" role="radiogroup" aria-label="Financial literacy level">{literacyLevels.map(option => <button type="button" role="radio" aria-checked={selectedLiteracyLevel === option.level} className={`literacy-option level-${option.level} ${selectedLiteracyLevel === option.level ? 'selected' : ''}`} key={option.level} onClick={() => setSelectedLiteracyLevel(option.level)}><b>Level {option.level} — {option.name}</b><small>“{option.description}”</small></button>)}</div>
    {loadingMarket ? <p className="onboarding-status" role="status">Preparing your financial world…</p> : <button type="submit" className="primary-button onboarding-submit" disabled={!playerName.trim() || !selectedAvatarId || !selectedLiteracyLevel}>Start</button>}
    {storageUnavailable && <p className="onboarding-status">Your profile will be kept for this session, but this browser can’t save it for next time.</p>}
  </form></main></MotionConfig>;
  const playerAvatar = getAvatar(profile.avatarId);
  const storyContent = <section className="story-card panel-card">
        <div className="step-track" aria-label={`Pitch step ${Math.min(state.month, story.length)} of ${story.length}`}>{Array.from({length: story.length}, (_, i) => <span key={i} className={i + 1 < state.month || completed ? 'done' : i + 1 === state.month ? 'current' : ''} />)}</div>
        <motion.div key={`${state.month}-${state.phase}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
          <div className="story-heading">{result ? <Check /> : state.month === 3 ? <Wrench /> : <CalendarDays />}<h1 id="story-title" ref={heading} tabIndex={-1}>{title}</h1></div>
          {completed ? <><p className="story-description">{state.explanation}</p><div className="year-result"><span>Your portfolio after the pitch</span><strong>{exactMoney(portfolio(state))}</strong><p>{money(state.totalContributed)} contributed · {exactMoney(state.totalMarketChange)} growth · {money(state.totalWithdrawn)} withdrawn</p></div><button className="primary-button" onClick={() => setSummaryOpen(true)}>View investment summary<Sparkles size={18} /></button><button className="secondary-button" onClick={() => setModal('compare')}>Compare your paths<GitCompareArrows size={17} /></button><button className="secondary-button" onClick={replay}><RotateCcw size={17} />Try a different story</button>{storageUnavailable && <p className="fine-print">Browser storage is unavailable. Your result is kept for replay while this tab stays open.</p>}</> : result ? <><p className="story-description result-description">{state.explanation}</p><button className="primary-button" onClick={next}>{state.month === story.length ? 'See my results' : 'Continue'}<ArrowRight size={18} /></button></> : <><p className="story-description">{description}</p>
          <div className="choices three-choices" role="group" aria-label="Choose your next step">{choices.map((choice, i) => { const reason = disabledReason(state, choice.id); return <div className={accountStep || fundStep ? 'account-choice' : 'choice-wrap'} key={choice.id}><motion.button whileTap={{ scale: 0.98 }} className={`choice choice-${i % 3}`} aria-label={choice.title} disabled={!!reason || loadingMarket} title={reason || choice.description} onClick={() => makeChoice(choice.id)}><span><b>{choice.title}</b><small>{reason || choice.description}</small></span><ChevronRight size={18} /></motion.button>{(accountStep || fundStep) && <button className="learn-more" aria-label={`Learn more about ${choice.id}`} onClick={() => setModal(choice.id as Account | Fund)}>Learn More<Info size={14} /></button>}</div>; })}</div>
          {loadingMarket && <p role="status">Loading market data…</p>}</>}
        </motion.div><div className="lesson" aria-live="polite"><Lightbulb size={23} /><p>{lesson}</p></div>
      </section>;
  return <MotionConfig reducedMotion={quietMotion ? 'always' : 'user'}><main className={`game-layout ${completed ? 'results-layout' : ''}`}>
    <aside className="decision-panel" aria-label="Your decisions">
      <div className="profile panel-card"><div className="avatar"><img src={playerAvatar.preview} alt={`${playerAvatar.name} avatar`} /></div><div><h2>{profile.name}</h2><p>{playerAvatar.name} <span>•</span> Age {state.age} · Month {state.month}</p><small className={`literacy-badge level-${profile.literacyLevel}`}>Level {profile.literacyLevel} · {literacyLevels[profile.literacyLevel - 1].name}</small></div></div>
      {completed ? <section className="final-portfolio panel-card"><h2><ChartNoAxesCombined size={27} />Your portfolio</h2><strong>{exactMoney(portfolio(state))}</strong><p>{money(state.totalContributed)} contributed · {state.totalMarketChange >= 0 ? '+' : ''}{exactMoney(state.totalMarketChange)} market change</p>{state.totalWithdrawn > 0 && <p>{exactMoney(state.totalWithdrawn)} withdrawn to savings</p>}<p>Cash {money(state.cash)} · Savings {money(state.savings)} · Debt {money(totalDebt(state))}</p><button className="primary-button" onClick={() => setTab('ledger')}>View portfolio details<ArrowRight size={18} /></button><button ref={summaryButton} className="secondary-button" aria-expanded={summaryOpen && tab === 'town'} onClick={openSummary}>View monthly summary<CalendarDays size={16} /></button></section> : state.month === 3 ? <section className="story-card panel-card alert-placeholder"><Wrench /><h2>An unexpected expense</h2><p>Resolve the medical bill to continue your story.</p></section> : storyContent}
      {!completed && <section className="finances panel-card"><h2><Wallet size={28} />Your Finances</h2><div className="stat-grid"><Stat icon={Coins} label="Cash" amount={state.cash} maxAmount={balanceMax} tone="cash" /><Stat icon={ChartNoAxesCombined} label="Investments" amount={portfolio(state)} maxAmount={balanceMax} tone="investment" /><Stat icon={CreditCard} label="Debt" amount={totalDebt(state)} maxAmount={balanceMax} tone="debt" /><Stat icon={Wallet} label="Savings" amount={state.savings} maxAmount={balanceMax} tone="savings" /><Stat icon={ShieldCheck} label="Emergency Fund" amount={state.emergencySavings} maxAmount={balanceMax} tone="emergency" /></div><div className="account-status"><Landmark size={15} />{state.account ? `${state.account} · Open` : portfolio(state) ? 'Unregistered demo portfolio' : 'Investment account · Not opened'}</div>{state.recurring && <p className="recurring-status">Raise plan: $250/month → {state.recurring === 'invest' ? state.selectedFund : state.recurring === 'savings' ? 'Savings' : 'Emergency fund'}</p>}{state.method && <p className="recurring-status">{METHODS.find(m => m.id === state.method)?.title}</p>}</section>}
      {!completed && state.month >= 3 && <section className="portfolio-panel panel-card" aria-label="Portfolio performance"><div><span>Contributed</span><b>{exactMoney(state.totalContributed)}</b></div><div className={state.totalMarketChange < 0 ? 'negative' : 'positive'}><span>Investment growth</span><b>{state.totalMarketChange >= 0 ? '+' : ''}{exactMoney(state.totalMarketChange)}</b></div>{state.totalWithdrawn > 0 && <div><span>Withdrawn</span><b>{exactMoney(state.totalWithdrawn)}</b></div>}<div className={state.monthlyGrowth < 0 ? 'negative' : 'positive'}><span>This month’s market</span><b>{state.monthlyGrowth >= 0 ? '+' : ''}{exactMoney(state.monthlyGrowth)}</b></div><div className="holdings-list">{HOLDINGS.filter(symbol => state.holdings[symbol] > 0).map(symbol => <p key={symbol}>{symbol === 'BIZTECH' ? 'BizTech (fictional)' : symbol} · {exactMoney(state.holdings[symbol])} · {(state.market.months[state.month - 1][symbol] * 100).toFixed(1)}% this month</p>)}</div><small>{state.market.label} · {state.market.source === 'api' ? state.market.asOf : 'SAMPLE DATA'}</small></section>}
      <section className="savings-goal panel-card"><div className="goal-heading"><span className="goal-icon"><House size={30} /></span><div><h2>{completed ? 'Current goal' : 'Financial Goal'}</h2><p>{goal ? `${goal.name} · ${money(goal.target)}` : 'Not selected'}</p></div></div>{goal ? <><div className="progress-rail" role="progressbar" aria-label={`${goal.name} goal`} aria-valuenow={Math.round(goalProgress(state) * 100)} aria-valuemin={0} aria-valuemax={100}><motion.div animate={{ width: `${goalProgress(state) * 100}%` }} /></div><p className="goal-total">{money(state.savings)} / {money(goal.target)} · {(goalProgress(state) * 100).toFixed(1)}%</p></> : <p className="goal-hint">See where your investing choices take you. A Miami goal may be ahead.</p>}</section>
      {completed && <nav className="results-actions" aria-label="Your results"><button className="panel-card" onClick={() => setModal('compare')}><GitCompareArrows size={23} />Compare your paths<ChevronRight size={18} /></button><button className="panel-card" onClick={replay}><RotateCcw size={23} />Try a different story<ChevronRight size={18} /></button></nav>}
      {completed && storageUnavailable && <p className="results-storage-note">Browser storage is unavailable. Your result is kept for replay while this tab stays open.</p>}
      <button className="simulation-button panel-card" onClick={() => setModal('how')}><Info size={23} />How this simulation works<ChevronRight size={19} /></button>
      <nav className="bottom-nav panel-card" aria-label="Game controls"><button aria-label="Replay" disabled={loadingMarket} onClick={replay}><RotateCcw />Replay</button><button aria-label="Compare paths" onClick={() => setModal('compare')}><ChartNoAxesCombined />Compare</button><button onClick={() => setModal('settings')}><Settings />Settings</button></nav>
    </aside>
    <section className={`world-panel ${completed && summaryOpen && tab === 'town' ? 'has-summary' : ''}`} aria-label="Your financial world"><div className="world-toolbar"><div className="toolbar-actions"><div className="view-tabs" role="tablist" aria-label="World view"><button role="tab" aria-selected={tab === 'town'} onClick={() => setTab('town')} className={tab === 'town' ? 'active' : ''}><House size={15} />Your town</button><button role="tab" aria-selected={tab === 'ledger'} onClick={() => setTab('ledger')} className={tab === 'ledger' ? 'active' : ''}><ReceiptText size={15} />Your ledger</button></div><button className="sound-button" aria-label={sound ? 'Mute sounds' : 'Enable sounds'} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div></div>
      <div className="world-view" role="tabpanel" aria-label={tab === 'town' ? 'Your town' : 'Your ledger'}>{tab === 'town' ? <><Suspense fallback={<div className="scene-loading">Building your world…</div>}><Town state={state} reduced={reduced} zoom={1} avatarId={profile.avatarId} avatarName={profile.name} /></Suspense><div className="world-status"><span className="live-dot" />Month {state.month}<span className="status-divider" />{state.market.source === 'api' ? 'Historical API data' : 'Fictional sample data'}</div></> : <div className="ledger-view"><div className="ledger-heading"><Landmark size={26} /><div><h3>Every dollar has a story.</h3><p>Exact balances after each month and decision.</p></div></div><NetWorthChart state={state} /><div className="ledger-scroll"><table><thead><tr><th>Month / event</th><th>Cash</th><th>Savings</th><th>Emergency fund</th><th>Investments</th><th>Debt</th><th>Net worth</th></tr></thead><tbody>{state.ledger.map((l, i) => <tr key={i}><th>{monthName(l.month)}<span>{l.label}</span></th><td>{exactMoney(l.cash)}</td><td>{exactMoney(l.savings)}</td><td>{exactMoney(l.emergencySavings)}</td><td>{exactMoney(l.investments)}</td><td>{exactMoney(l.debt)}</td><td>{exactMoney(l.netWorth)}</td></tr>)}</tbody></table></div><p className="fine-print">Total interest: {exactMoney(state.totalInterest)}. Contributed {exactMoney(state.totalContributed)} + market growth {exactMoney(state.totalMarketChange)} − withdrawn {exactMoney(state.totalWithdrawn)} = portfolio {exactMoney(portfolio(state))}.</p><p className="fine-print">{state.market.notice}</p></div>}</div>
      {completed && summaryOpen && tab === 'town' && <InvestmentSummary state={state} onClose={closeSummary} />}
      {!(completed && summaryOpen && tab === 'town') && <div className="world-caption" aria-live="polite"><Info size={16} /><p>{state.explanation}</p></div>}<span className="fictional-note">Simulated money · {state.market.source === 'api' ? 'Historical market returns' : 'Fictional sample returns'}</span>
    </section>
    {state.month === 3 && <StoryAlert>{storyContent}</StoryAlert>}
    {modal && <Modal title={fundInfo || accountInfo ? `${modal} · Learn More` : modal === 'how' ? 'How Investly works' : modal === 'settings' ? 'Make yourself at home' : 'Two paths. A clearer picture.'} onClose={() => setModal(null)} wide={modal === 'compare'}>{fundInfo ? <><h3>{fundInfo.name}</h3><p className="modal-intro">{fundInfo.description}</p><p>{fundInfo.risk}. These are relative demo categories, not the issuer’s official risk rating.</p><p className="notice">Pitch illustration: {fundInfo.illustration} per year. This is not verified historical CAGR, a forecast, or the return used in your game.</p><p>Actual game changes come from the labelled monthly market sequence. All funds can lose value.</p><a href={fundInfo.url} target="_blank" rel="noreferrer">Read the fund issuer’s guide ↗</a></> : accountInfo ? <><p className="modal-intro">{accountInfo.description}</p><p>This is a simulated account. Real eligibility, contribution limits, and withdrawal rules apply.</p><a href={accountInfo.url} target="_blank" rel="noreferrer">Read the CRA account guide ↗</a></> : modal === 'how' ? <HowItWorks state={state} /> : modal === 'compare' ? <Compare state={state} previous={previous} /> : <div className="settings-list"><button aria-pressed={sound} onClick={() => setSound(!sound)}><Volume2 /><span><b>Game sounds</b><small>Feedback with every choice</small></span><span className={`toggle ${sound ? 'on' : ''}`} /></button><button aria-pressed={quietMotion} onClick={() => setQuietMotion(!quietMotion)}><Sparkles /><span><b>Reduce motion</b><small>Pause idle motion and coin animations</small></span><span className={`toggle ${quietMotion ? 'on' : ''}`} /></button><p className="fine-print">Your system’s reduced-motion preference is always respected.</p></div>}</Modal>}
  </main></MotionConfig>;
}
