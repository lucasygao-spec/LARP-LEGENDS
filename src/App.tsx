import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Lightbulb, PiggyBank, Settings, ShoppingBag, ChartNoAxesCombined, Check, Coins, CreditCard, Flag, GitCompareArrows, House, Info, Maximize2, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Split, Sprout, Volume2, VolumeX, Wallet, Wrench, X, Laptop, CloudLightning, Landmark, ReceiptText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import story from './data/story.json';
import { choose, continueGame, disabledReason, exactMoney, initialState, money, monthName, netWorth, portfolio, RULES } from './engine';
import type { GameState } from './engine';
const Town = lazy(() => import('./Town'));
const STORAGE_KEY = 'life-ledger.previous-run.v1';
const icons: Record<string, LucideIcon> = { shield: ShieldCheck, sparkles: Sparkles, wallet: Wallet, credit: CreditCard, split: Split, flag: Flag, chart: ChartNoAxesCombined, sprout: Sprout, pay: Coins, laptop: Laptop, repair: Wrench, invest: Sprout, storm: CloudLightning };
function loadPrevious(): GameState | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data || data.phase !== 'complete' || !Array.isArray(data.decisionHistory) || data.decisionHistory.length !== 5 || !Array.isArray(data.ledger) || !data.investmentsBySector) return null;
    if (!['cash', 'emergencySavings', 'creditCardDebt', 'goalSavings', 'totalInterest', 'totalMarketChange'].every(k => Number.isFinite(data[k]))) return null;
    if (!['technology', 'energy', 'retail'].every(k => Number.isFinite(data.investmentsBySector[k]))) return null;
    if (!data.decisionHistory.every((d: { title?: unknown }) => typeof d.title === 'string')) return null;
    return data;
  } catch { return null; }
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = bodyOverflow; }; }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="modal-title"><div className="modal-top"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function NetWorthChart({ state }: { state: GameState }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = state.ledger.filter((entry, i, all) => i === all.length - 1 || entry.month !== all[i + 1].month);
  const values = points.map(p => p.netWorth); const low = Math.min(0, ...values); const high = Math.max(1500, ...values) * 1.12;
  const coords = points.map(p => ({ x: 12 + p.month / 12 * 590, y: 86 - (p.netWorth - low) / (high - low) * 70 }));
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '); const last = coords.at(-1)!;
  const shown = hovered === null ? points.at(-1)! : points[hovered];
  return <div className="net-chart"><div className="chart-header"><div><span className="small-label">{hovered === null ? 'Your net worth' : `${monthName(shown.month)} net worth`}</span><strong>{money(shown.netWorth)} <span className="chart-change">{netWorth(state) >= 400 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{money(netWorth(state) - 400)} since the start</span></strong></div><span className="live-badge"><i /> YOUR YEAR, SO FAR</span></div><svg viewBox="0 0 620 107" role="img" aria-label={`Net worth from $400 at the start to ${exactMoney(netWorth(state))} in ${monthName(state.month)}`} onPointerLeave={() => setHovered(null)}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6a966d" stopOpacity="0.16" /><stop offset="100%" stopColor="#6a966d" stopOpacity="0" /></linearGradient></defs>{[25, 55, 85].map(y => <line key={y} x1="12" x2="603" y1={y} y2={y} stroke="#e9ece4" strokeDasharray="3 5" />)}<motion.path animate={{ d: `${path} L ${last.x} 87 L 12 87 Z` }} fill="url(#chart-fill)" transition={{ duration: 0.5 }} /><motion.path animate={{ d: path }} fill="none" stroke="#668a61" strokeWidth="2.4" strokeLinejoin="round" transition={{ duration: 0.5 }} /><circle cx={last.x} cy={last.y} r="7" fill="#7da774" opacity="0.16" /><circle cx={last.x} cy={last.y} r="3.5" fill="#668a61" />{coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="9" className="chart-point" tabIndex={0} role="button" aria-label={`${monthName(points[i].month)}: ${exactMoney(points[i].netWorth)}`} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} onPointerEnter={() => setHovered(i)} onClick={() => setHovered(i)}><title>{monthName(points[i].month)}: {exactMoney(points[i].netWorth)}</title></circle>)}{['START', 'MAR', 'JUN', 'SEP', 'DEC'].map((m, i) => <text key={m} x={12 + i * 147.5} y="105" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{m}</text>)}</svg><div className="chart-foot">Cash + emergency savings + tuition savings + investments − debt</div></div>;
}
function Stat({ icon: Icon, label, amount, tone }: { icon: LucideIcon; label: string; amount: number; tone: string }) {
  return <div className={`stat ${tone}`} title={exactMoney(amount)}><span><Icon size={15} />{label}</span><motion.strong key={amount} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }}>{money(amount)}</motion.strong></div>;
}
function Compare({ state, previous }: { state: GameState; previous: GameState | null }) {
  const rows: [string, (s: GameState) => number][] = [['Cash', s => s.cash], ['Emergency savings', s => s.emergencySavings], ['Tuition savings', s => s.goalSavings], ['Investments', portfolio], ['Credit card debt', s => s.creditCardDebt], ['Interest paid / accrued', s => s.totalInterest], ['Net worth', netWorth]];
  return <><p className="modal-intro">Small choices add up. Compare your {state.phase === 'complete' ? 'completed year' : `progress through ${monthName(state.month)}`} with your last completed year.</p>{!previous && <div className="notice"><Sprout size={20} /><span>Your first story is still growing. Finish a year, then replay to see two paths side by side.</span></div>}<table className="compare-table"><thead><tr><th>At a glance</th><th>This run<br /><small>{monthName(state.month)}</small></th><th>Previous run<br /><small>{previous ? 'December' : 'Not yet played'}</small></th></tr></thead><tbody>{rows.map(([label, get]) => <tr key={label}><th>{label}</th><td>{exactMoney(get(state))}</td><td>{previous ? exactMoney(get(previous)) : '—'}</td></tr>)}</tbody></table><h3 className="modal-subtitle">The choices that got you here</h3><div className="path-list">{story.map((s, i) => <div key={s.month}><span>{monthName(s.month)}</span><p>{state.decisionHistory[i]?.title || 'Still ahead'}</p><p>{previous?.decisionHistory[i]?.title || '—'}</p></div>)}</div><p className="fine-print">These are two fictional paths, not a prediction or a recommendation. Different results reflect choices, timing, and the same fixed market events.</p></>;
}
function HowItWorks() {
  return <><p className="modal-intro">One student. Five choices. A whole year to see what changes.</p><div className="how-steps"><div><Wallet /><b>Make a choice</b><p>Pick an option, then confirm it. Use a mouse, Tab and Enter, or number keys 1–3.</p></div><div><House /><b>Watch your town</b><p>Your balances drive the buildings, coins, shield, and debt drain. Every effect has a text explanation.</p></div><div><RotateCcw /><b>Try another path</b><p>Finish in 3–5 minutes, replay, and compare with your last completed year.</p></div></div><h3 className="modal-subtitle">How this simulation works</h3><dl className="rules"><div><dt>Starting point</dt><dd>Maya, 19. $400 cash; no savings, investments, or debt.</dd></div><div><dt>Every month</dt><dd>$2,200 take-home income − $1,700 essentials − any debt payment. January’s $500 surplus is already in your starting dashboard.</dd></div><div><dt>Time moves forward</dt><dd>Decisions happen in January, March, May, July, and October. Continue settles every intervening month. The last choice settles November and December.</dd></div><div><dt>Credit card</dt><dd>Fictional 20% APR, compounded monthly at 20% ÷ 12. Interest is added first, then up to $50 is paid from that month’s surplus. No fees or additional payments.</dd></div><div><dt>Transfers & purchases</dt><dd>Saving and investing move cash dollar for dollar. Purchases count as expenses; the laptop and car have no resale value in this model.</dd></div><div><dt>Fixed fictional markets</dt><dd>August: tech +8%, energy +3%, retail +2%. October: −35%, −8%, −12%. December: +6%, +2%, +1%. All other months: 0%. These invented returns are never a forecast.</dd></div><div><dt>Your two goals</dt><dd>$1,500 emergency cushion and $1,500 tuition fund. Cash and savings earn no interest. Tuition money is kept out of the market.</dd></div><div><dt>Accounting</dt><dd>Net worth = cash + both savings funds + investments − debt. Calculations round to cents. Dashboard values round to dollars; the ledger shows exact amounts. Coin counts are symbolic; labels show the actual amounts.</dd></div><div><dt>Your device only</dt><dd>Your most recent completed run is saved in this browser. No account, backend, or live market data.</dd></div></dl><p className="fine-print">A fictional learning experience, not financial advice. 3D models and sounds by <a href="https://kenney.nl/assets" target="_blank" rel="noreferrer">Kenney</a> (CC0). Animation with <a href="https://motion.dev/docs/react-animation" target="_blank" rel="noreferrer">Motion</a>; chart interaction inspired by <a href="https://bklit.com/docs/components/live-line-chart" target="_blank" rel="noreferrer">Bklit</a>.</p></>;
}
export default function App() {
  const [state, setState] = useState(initialState);
  const [previous, setPrevious] = useState<GameState | null>(loadPrevious);
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<'how' | 'compare' | 'settings' | null>(null);
  const [quietMotion, setQuietMotion] = useState(false);
  const [tab, setTab] = useState<'town' | 'ledger'>('town');
  const [sound, setSound] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const reduced = !!useReducedMotion() || quietMotion;
  const heading = useRef<HTMLHeadingElement>(null);
  const event = story[state.step]; const EventIcon = icons[event.icon];
  const completed = state.phase === 'complete'; const result = state.phase === 'result';
  function play(cue = 'click_001') { if (sound) { const audio = new Audio(`/audio/${cue}.ogg`); audio.volume = 0.3; void audio.play().catch(() => {}); } }
  function replay() { if (completed) setPrevious(state); setState(initialState()); setSelected(null); setTab('town'); setZoom(1); play('back_001'); }
  function confirm() { if (!selected) return; setState(choose(state, selected)); setSelected(null); play(selected === 'credit' ? 'error_001' : 'confirmation_001'); }
  function next() { setState(continueGame(state)); setSelected(null); play(); }
  useEffect(() => { if (completed) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { setStorageUnavailable(true); } } }, [completed, state]);
  useEffect(() => { if (state.phase !== 'choice' || state.step > 0) heading.current?.focus({ preventScroll: true }); }, [state.phase, state.step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || state.phase !== 'choice' || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;
      const choice = event.choices[Number(e.key) - 1];
      if (choice && !disabledReason(state, choice.id)) { e.preventDefault(); setSelected(choice.id); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [event, modal, state]);
  const titles = ['Your first paycheque', 'A new laptop', 'An unexpected repair', 'Your first investment', 'A market downturn'];
  const choiceNames: Record<string, string>[] = [
    { save: 'Save $400', spend: 'Spend $400' },
    { cash: 'Pay cash', credit: 'Use credit' },
    { savings: 'Use savings', mixed: 'Split the bill', credit: 'Use credit' },
    { goal: 'Save for tuition', tech: 'Technology', diversify: 'Diversify' },
    { sell: 'Sell investments', hold: 'Stay the course' },
  ];
  const tips = [
    'Saving now helps you handle unexpected expenses later.',
    'A credit card balance borrows from your future paycheques.',
    'An emergency fund is there to be used. This is what your cushion is for.',
    'Different goals need different plans. Diversification spreads your exposure.',
    'Markets move. Keep your time horizon in mind before you decide.',
  ];
  return <MotionConfig reducedMotion={quietMotion ? 'always' : 'user'}><main className="game-layout">
    <aside className="decision-panel" aria-label="Your decisions">
      <div className="profile panel-card">
        <div className="avatar"><MayaPortrait /></div>
        <div><h2>Maya</h2><p>Age 19 <span>•</span> Month {state.month} / 12</p></div>
      </div>
      <section className="story-card panel-card">
        <div className="step-track" aria-label={`Decision ${state.step + 1} of 5`}>{story.map((_, i) => <span key={i} className={i < state.step || completed ? 'done' : i === state.step ? 'current' : ''} />)}</div>
        <AnimatePresence mode="wait"><motion.div key={`${state.step}-${state.phase}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
          {completed ? <><div className="story-heading"><Sprout /><h1 ref={heading} tabIndex={-1}>Look how far you’ve grown.</h1></div><p className="story-description">Five decisions. One year. A clearer picture of where your money goes.</p><div className="year-result"><span>Your year-end net worth</span><strong>{money(netWorth(state))}</strong><p>{exactMoney(state.totalInterest)} in interest · {exactMoney(state.totalMarketChange)} market change</p></div><button className="primary-button" onClick={() => setModal('compare')}>Compare your paths<GitCompareArrows size={18} /></button><button className="secondary-button" onClick={replay}><RotateCcw size={17} />Try a different story</button>{storageUnavailable && <p className="fine-print">Browser storage is unavailable. Your result is kept for replay while this tab stays open.</p>}</> : result ? <><div className="story-heading"><span className="result-tick"><Check /></span><h1 ref={heading} tabIndex={-1}>{state.step === 4 ? 'Your year, in view' : 'Your choice comes to life'}</h1></div><p className="story-description result-description">{state.explanation}</p><button className="primary-button" onClick={next}>{state.step === 4 ? 'See my year in review' : `Continue to ${monthName(story[state.step + 1].month)}`}<ArrowRight size={18} /></button></> : <><div className="story-heading">{state.step === 0 ? <CalendarDays /> : <EventIcon />}<div><h1 ref={heading} tabIndex={-1}>{titles[state.step]}</h1><p className="story-description">{state.step === 0 ? 'You got your first paycheque! You can save some of the surplus or spend it on something you want.' : event.body}</p></div></div>
          <div className={`choices ${event.choices.length === 3 ? 'three-choices' : ''}`} role="group" aria-label="Choose your next step">{event.choices.map((choice, i) => { const Icon = state.step === 0 ? (i === 0 ? PiggyBank : ShoppingBag) : icons[choice.icon]; const reason = disabledReason(state, choice.id); return <motion.button whileTap={{ scale: 0.98 }} key={choice.id} className={`choice choice-${i} ${selected === choice.id ? 'selected' : ''}`} aria-label={`${choiceNames[state.step][choice.id]}. ${choice.title}. ${choice.description}${reason ? ` ${reason}` : ''}`} aria-pressed={selected === choice.id} disabled={!!reason} title={reason || choice.description} onClick={() => { setSelected(choice.id); play(); }}><Icon className="choice-icon" /><span><b>{choiceNames[state.step][choice.id]}</b><small>{reason || (state.step === 0 ? i === 0 ? 'Build your future' : 'Enjoy today' : choice.tag)}</small></span>{selected === choice.id ? <Check size={17} /> : <ChevronRight size={18} />}</motion.button>; })}</div>
          <button className="primary-button confirm-button" disabled={!selected} onClick={confirm}>Make this choice<ArrowRight size={18} /></button></>}
        </motion.div></AnimatePresence>
        <div className="lesson" aria-live="polite"><Lightbulb size={23} /><p>{result || completed ? 'Every choice changes your town. Watch your money find its way.' : tips[state.step]}</p></div>
      </section>
      <section className="finances panel-card"><h2><Wallet size={28} />Your Finances</h2><div className="stat-grid"><Stat icon={Coins} label="Cash" amount={state.cash} tone="cash" /><Stat icon={ShieldCheck} label="Emergency Savings" amount={state.emergencySavings} tone="savings" /><Stat icon={CreditCard} label="Credit Card Debt" amount={state.creditCardDebt} tone="debt" /><Stat icon={ChartNoAxesCombined} label="Investments" amount={portfolio(state)} tone="investment" /></div></section>
      <section className="savings-goal panel-card"><div className="goal-heading"><span className="goal-icon"><House size={30} /><ShieldCheck size={15} /></span><div><h2>Goal Progress</h2><p>Emergency Fund <span>•</span> $1,500</p></div></div><div className="progress-rail" role="progressbar" aria-label="Emergency savings goal" aria-valuenow={state.emergencySavings} aria-valuemin={0} aria-valuemax={1500}><motion.div animate={{ width: `${Math.min(state.emergencySavings / RULES.emergencyGoal * 100, 100)}%` }} /></div><p className="goal-total">{money(state.emergencySavings)} / $1,500</p></section>
      <button className="simulation-button panel-card" onClick={() => setModal('how')}><RotateCcw size={23} />How this simulation works<ChevronRight size={19} /></button>
      <nav className="bottom-nav panel-card" aria-label="Game controls"><button aria-label="Replay" onClick={replay}><RotateCcw />Replay</button><button aria-label="Compare paths" onClick={() => setModal('compare')}><ChartNoAxesCombined />Compare</button><button onClick={() => setModal('settings')}><Settings />Settings</button></nav>
    </aside>
    <section className="world-panel" aria-label="Your financial world">
      <div className="world-toolbar"><a href="/" className="world-brand"><Sprout size={21} />lifeledger<span>.</span></a><div className="toolbar-actions"><div className="view-tabs" role="tablist" aria-label="World view"><button role="tab" aria-selected={tab === 'town'} onClick={() => setTab('town')} className={tab === 'town' ? 'active' : ''}><House size={15} />Your town</button><button role="tab" aria-selected={tab === 'ledger'} onClick={() => setTab('ledger')} className={tab === 'ledger' ? 'active' : ''}><ReceiptText size={15} />Your ledger</button></div><button className="sound-button" aria-label={sound ? 'Mute sounds' : 'Enable sounds'} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div></div>
      <div className="world-view" role="tabpanel" aria-label={tab === 'town' ? 'Your town' : 'Your ledger'}>{tab === 'town' ? <><Suspense fallback={<div className="scene-loading">Building your world…</div>}><Town state={state} reduced={reduced} zoom={zoom} /></Suspense><div className="scene-controls"><button aria-label="Zoom in" disabled={zoom >= 1.2} onClick={() => setZoom(z => Math.min(1.2, z + 0.1))}><Plus size={18} /></button><button aria-label="Zoom out" disabled={zoom <= 0.8} onClick={() => setZoom(z => Math.max(0.8, z - 0.1))}><Minus size={18} /></button><button aria-label="Reset town view" onClick={() => setZoom(1)}><Maximize2 size={17} /></button></div><div className="world-status"><span className="live-dot" />{monthName(state.month)}<span className="status-divider" />Decision {state.step + 1} of 5</div></> : <div className="ledger-view"><div className="ledger-heading"><Landmark size={26} /><div><h3>Every dollar has a story.</h3><p>Exact balances after each month and decision.</p></div></div><NetWorthChart state={state} /><div className="ledger-scroll"><table><thead><tr><th>Month / event</th><th>Cash</th><th>Savings¹</th><th>Invested</th><th>Debt</th><th>Net worth</th></tr></thead><tbody>{state.ledger.map((l, i) => <tr key={i}><th>{monthName(l.month)}<span>{l.label}</span></th><td>{exactMoney(l.cash)}</td><td>{exactMoney(l.emergencySavings + l.goalSavings)}</td><td>{exactMoney(l.investments)}</td><td>{exactMoney(l.creditCardDebt)}</td><td>{exactMoney(l.netWorth)}</td></tr>)}</tbody></table></div><p className="fine-print">¹ Emergency + tuition savings. Total interest: {exactMoney(state.totalInterest)}. Tuition fund: {exactMoney(state.goalSavings)} / $1,500.</p></div>}</div>
      <div className="world-caption" aria-live="polite"><Info size={16} /><p>{state.explanation}</p></div><span className="fictional-note">Fictional money. Real-world lessons.</span>
    </section>
    {modal && <Modal title={modal === 'how' ? 'How Life Ledger works' : modal === 'settings' ? 'Make yourself at home' : 'Two paths. A clearer picture.'} onClose={() => setModal(null)} wide={modal === 'compare'}>{modal === 'how' ? <HowItWorks /> : modal === 'compare' ? <Compare state={state} previous={previous} /> : <div className="settings-list"><p className="modal-intro">A few small comforts for your time in town.</p><button aria-pressed={sound} onClick={() => setSound(!sound)}><Volume2 /><span><b>Game sounds</b><small>Gentle feedback with every choice</small></span><span className={`toggle ${sound ? 'on' : ''}`} /></button><button aria-pressed={quietMotion} onClick={() => setQuietMotion(!quietMotion)}><Sparkles /><span><b>Reduce motion</b><small>Pause idle motion and coin animations</small></span><span className={`toggle ${quietMotion ? 'on' : ''}`} /></button><p className="fine-print">Your system’s reduced-motion preference is always respected.</p></div>}</Modal>}
  </main></MotionConfig>;
}

function MayaPortrait() {
  return <svg viewBox="0 0 100 100" role="img" aria-label="Portrait of Maya"><defs><linearGradient id="portrait-bg" x2="0" y2="1"><stop stopColor="#057b79" /><stop offset="1" stopColor="#034b50" /></linearGradient><linearGradient id="hair" x2="1" y2="1"><stop stopColor="#754733" /><stop offset="1" stopColor="#352822" /></linearGradient></defs><circle cx="50" cy="50" r="49" fill="url(#portrait-bg)" /><path d="M22 89 19 51Q17 8 49 8 79 6 81 41L85 93Z" fill="url(#hair)" /><path d="m22 100 4-18 17-9h15l18 10 5 17" fill="#57b7d1" /><path d="m44 67-2 13 9 8 9-9-3-13" fill="#e6a77c" /><path d="m42 79 9 8-8 10-10-15m18 5 9-8 8 5-8 13" fill="#f1f8f1" /><path d="M31 38q0-20 23-19 22 2 21 26l-3 17q-5 16-21 17-16-4-21-21Z" fill="#f3bd92" /><path d="M25 46q3-37 30-34L75 30 51 21 35 45Z" fill="#68402f" /><path d="m30 38 4 35-9 18-4-41m45-22 11 11-1 30-8-6" fill="#4c3026" /><path d="m37 43 10-2m13 0 9 3" fill="none" stroke="#623d2d" strokeWidth="3" strokeLinecap="round" /><ellipse cx="43" cy="50" rx="3" ry="4" fill="#382f2e" /><ellipse cx="64" cy="50" rx="3" ry="4" fill="#382f2e" /><circle cx="44" cy="49" r="1" fill="white" /><circle cx="65" cy="49" r="1" fill="white" /><path d="m54 50-2 9 4 1" fill="none" stroke="#d9916d" strokeWidth="2" strokeLinecap="round" /><path d="M47 65q7 6 14-1" fill="none" stroke="#a65c48" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
