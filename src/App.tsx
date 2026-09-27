import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Lightbulb, Settings, ChartNoAxesCombined, Check, Coins, CreditCard, GitCompareArrows, House, Info, RotateCcw, ShieldCheck, Sparkles, Sprout, Volume2, VolumeX, Wallet, Wrench, X, Landmark, ReceiptText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import story from './data/story.json';
import { avatars, getAvatar } from './avatarCatalog';
import type { AvatarId } from './avatarCatalog';
import { ACCOUNTS, GOALS, choose, choicesFor, continueGame, disabledReason, exactMoney, goalProgress, initialState, investmentAmount, money, monthName, netWorth, portfolio } from './engine';
import type { Account, GameState } from './engine';
import { loadMarketFeed } from './market';
const Town = lazy(() => import('./Town'));
const STORAGE_KEY = 'investly.previous-run.v2';
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
    if (!data || data.version !== 2 || data.phase !== 'complete' || !data.goal || !(data.goal in GOALS) || data.month !== 12 || !Array.isArray(data.ledger) || !data.ledger.length || !Array.isArray(data.decisionHistory) || data.decisionHistory.length !== 13 || !data.holdings || !data.market) return null;
    if (!['cash', 'emergencySavings', 'debt', 'totalContributed', 'totalWithdrawn', 'totalMarketChange', 'totalInterest'].every(k => Number.isFinite(data[k]))) return null;
    if (!Number.isFinite(data.holdings.etf) || !Number.isFinite(data.holdings.stocks) || !data.decisionHistory.every((d: {title?: unknown}) => typeof d.title === 'string')) return null;
    return data;
  } catch { return null; }
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = bodyOverflow; }; }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="modal-title"><div className="modal-top"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function AvatarPicker({ selectedAvatarId, onSelect }: { selectedAvatarId: AvatarId | null; onSelect: (id: AvatarId) => void }) {
  return <div className="avatar-picker" role="radiogroup" aria-label="Choose your character">{avatars.map(avatar => <button type="button" role="radio" aria-checked={selectedAvatarId === avatar.id} aria-label={avatar.name} className={`avatar-option ${selectedAvatarId === avatar.id ? 'selected' : ''}`} key={avatar.id} onClick={() => onSelect(avatar.id)}><img src={avatar.preview} alt="" loading="lazy" /><span><b>{avatar.name}</b></span>{selectedAvatarId === avatar.id && <Check size={18} />}</button>)}</div>;
}
function NetWorthChart({ state }: { state: GameState }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = [{ ...state.ledger[0], month: 0 }, ...state.ledger.filter((entry, i, all) => i === all.length - 1 || entry.month !== all[i + 1].month)];
  const values = points.map(p => p.netWorth); const low = Math.min(0, ...values); const high = Math.max(1500, ...values) * 1.12;
  const coords = points.map(p => ({ x: 12 + p.month / 12 * 590, y: 86 - (p.netWorth - low) / (high - low) * 70 }));
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '); const last = coords.at(-1)!;
  const shown = hovered === null ? points.at(-1)! : points[hovered];
  return <div className="net-chart"><div className="chart-header"><div><span className="small-label">{hovered === null ? 'Your net worth' : `${monthName(shown.month)} net worth`}</span><strong>{money(shown.netWorth)} <span className="chart-change">{netWorth(state) >= 1000 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{money(netWorth(state) - 1000)} since the start</span></strong></div><span className="live-badge"><i /> YOUR YEAR, SO FAR</span></div><svg viewBox="0 0 620 107" role="img" aria-label={`Net worth from $1,000 at the start to ${exactMoney(netWorth(state))} in ${monthName(state.month)}`} onPointerLeave={() => setHovered(null)}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6a966d" stopOpacity="0.16" /><stop offset="100%" stopColor="#6a966d" stopOpacity="0" /></linearGradient></defs>{[25, 55, 85].map(y => <line key={y} x1="12" x2="603" y1={y} y2={y} stroke="#e9ece4" strokeDasharray="3 5" />)}<motion.path initial={false} animate={{ d: `${path} L ${last.x} 87 L 12 87 Z` }} fill="url(#chart-fill)" transition={{ duration: 0.5 }} /><motion.path initial={false} animate={{ d: path }} fill="none" stroke="#668a61" strokeWidth="2.4" strokeLinejoin="round" transition={{ duration: 0.5 }} /><circle cx={last.x} cy={last.y} r="7" fill="#7da774" opacity="0.16" /><circle cx={last.x} cy={last.y} r="3.5" fill="#668a61" />{coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="9" className="chart-point" tabIndex={0} role="button" aria-label={`${monthName(points[i].month)}: ${exactMoney(points[i].netWorth)}`} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} onPointerEnter={() => setHovered(i)} onClick={() => setHovered(i)}><title>{monthName(points[i].month)}: {exactMoney(points[i].netWorth)}</title></circle>)}{['START', 'M3', 'M6', 'M9', 'M12'].map((m, i) => <text key={m} x={12 + i * 147.5} y="105" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{m}</text>)}</svg><div className="chart-foot">Cash + emergency savings + investments − debt</div></div>;
}
function Stat({ icon: Icon, label, amount, tone }: { icon: LucideIcon; label: string; amount: number; tone: string }) {
  return <div className={`stat ${tone}`} title={exactMoney(amount)}><span><Icon size={15} />{label}</span><motion.strong key={amount} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }}>{money(amount)}</motion.strong></div>;
}
function HowItWorks({ state }: { state: GameState }) {
  return <><p className="modal-intro">Age 18. Twelve months. One simple investing journey.</p><dl className="rules">
    <div><dt>Starting point</dt><dd>$1,000 cash. No investments, emergency savings, debt, account, or goal. All balances are simulated Canadian dollars.</dd></div>
    <div><dt>Your character</dt><dd>On your first visit, choose a display name and person avatar. Your choice appears in your profile and the 3D town, and is saved on this device.</dd></div>
    <div><dt>One decision per month</dt><dd>Confirm a choice, see the result, then continue. Opening an account is part of that same month. Months 7–12 follow your recurring plan; choose your goal after Month 12. Keyboard: Tab, Enter, or number keys 1–4 to select.</dd></div>
    <div><dt>Simple monthly budget</dt><dd>After essentials: University adds $100, Work adds $400, Gap Year spends $100. University borrows $5,000 directly for tuition. Any gap-year cash shortfall is borrowed. A $1,000 gift arrives in Month 2; a $500 bonus in Month 4.</dd></div>
    <div><dt>Debt</dt><dd>All debt uses a fictional 6% APR, charged monthly before payments. This is a simplified shared rate, not a real student-loan or credit offer. No mandatory repayments are modeled.</dd></div>
    <div><dt>Recurring contributions</dt><dd>The raise adds $100 each month from Month 7 through Month 12. Your plan assigns it to an ETF, savings, debt, or a $50/$50 ETF–savings split. Unused debt payments stay in cash.</dd></div>
    <div><dt>Market data</dt><dd>{state.market.label} · {state.market.asOf}. {state.market.notice} One stored sequence is used throughout a run and replay. Existing holdings change first; new contributions arrive afterward. No guaranteed return.</dd></div>
    <div><dt>Accounts</dt><dd>TFSA, FHSA, and RRSP are simulated account choices. Eligibility, contribution limits, taxes, fees, and withdrawal rules are not modeled. Learn More links to CRA guidance. Savings and cash earn no interest here.</dd></div>
    <div><dt>Emergency repair</dt><dd>$700 in Month 5: emergency fund first, then cash. If short, explicitly choose borrowing or selling enough investments. Only the amount needed is withdrawn.</dd></div>
    <div><dt>Goals & accounting</dt><dd>First Home $40,000; Car $12,000; Puppy $2,500. Progress uses current investments, not a promised future return. Net worth = cash + emergency fund + investments − debt. All calculations round to cents. ETF money is drawn across three symbolic districts; these are not additional holdings.</dd></div>
    <div><dt>On your device</dt><dd>Your last completed run is saved locally for comparison. This demo does not open a real account or place trades. Town coin counts are symbolic; the ledger shows exact balances.</dd></div>
  </dl><p className="fine-print">Models and sounds: Kenney (CC0). Animation: <a href="https://motion.dev/docs/react-animation">Motion</a>. Interactive chart inspired by <a href="https://bklit.com/docs/components/live-line-chart">Bklit</a>.</p></>;
}
function Compare({ state, previous }: { state: GameState; previous: GameState | null }) {
  const rows: [string, (s: GameState) => number][] = [['Cash', s => s.cash], ['Emergency fund', s => s.emergencySavings], ['Investments', portfolio], ['Contributed', s => s.totalContributed], ['Withdrawn', s => s.totalWithdrawn], ['Investment growth', s => s.totalMarketChange], ['Debt', s => s.debt], ['Net worth', netWorth]];
  return <><p className="modal-intro">See how your choices add up over time.</p>{!previous && <p className="notice">Finish a year, then replay to compare two paths.</p>}<table className="compare-table"><thead><tr><th>At a glance</th><th>This run · M{state.month}</th><th>Previous run</th></tr></thead><tbody>{rows.map(([label, get]) => <tr key={label}><th>{label}</th><td>{exactMoney(get(state))}</td><td>{previous ? exactMoney(get(previous)) : '—'}</td></tr>)}<tr><th>Account / goal</th><td>{state.account || 'None'} / {state.goal ? GOALS[state.goal].name : 'Not selected'}</td><td>{previous ? `${previous.account || 'None'} / ${GOALS[previous.goal!].name}` : '—'}</td></tr></tbody></table><h3 className="modal-subtitle">Your paths</h3><div className="path-list">{Array.from({length: 13}, (_, i) => <div key={i}><span>{i === 12 ? 'Goal' : `M${i + 1}`}</span><p>{state.decisionHistory[i]?.title || 'Still ahead'}</p><p>{previous?.decisionHistory[i]?.title || '—'}</p></div>)}</div><p className="fine-print">This run: {state.market.label} ({state.market.asOf}). Previous: {previous ? `${previous.market.label} (${previous.market.asOf})` : 'none'}. Different data sequences can also affect results.</p></>;
}
export default function App() {
  const [state, setState] = useState(initialState);
  const [profile, setProfile] = useState<PlayerProfile | null>(loadProfile);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId | null>(null);
  const [selectedLiteracyLevel, setSelectedLiteracyLevel] = useState<FinancialLiteracyLevel | null>(null);
  const [previous, setPrevious] = useState<GameState | null>(loadPrevious);
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<'how' | 'compare' | 'settings' | 'avatar' | Account | null>(null);
  const [quietMotion, setQuietMotion] = useState(false);
  const [tab, setTab] = useState<'town' | 'ledger'>('town');
  const [sound, setSound] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [repairNotice, setRepairNotice] = useState(false);
  const reduced = !!useReducedMotion() || quietMotion;
  const heading = useRef<HTMLHeadingElement>(null);
  const completed = state.phase === 'complete'; const result = state.phase === 'result';
  const accountStep = state.phase === 'account'; const goalStep = state.phase === 'goal';
  const event = story[Math.min(state.month - 1, 5)]; const choices = choicesFor(state);
  const lesson = goalStep || completed ? 'Match your goal and time horizon to your investing plan. Near-term needs may be better held in cash.' : state.month > 6 ? 'Contributions are in your control. Market returns aren’t.' : event.lesson;
  const title = completed ? 'Your future has a starting point.' : result ? 'Your choice, in action' : accountStep ? 'Which account would you like to open?' : goalStep ? 'What are you investing for?' : state.month > 6 ? `Month ${state.month} · Keep growing` : event.title;
  const description = accountStep ? 'Choose an account for your simulated investments.' : goalStep ? 'Give your monthly habit something to work toward.' : state.month > 6 ? 'Your monthly budget, market move, and recurring plan are settled. Here’s where you stand.' : state.month === 3 ? `You have ${money(investmentAmount(state))} ready to invest. What do you want to do?` : event.body;
  function play(cue = 'click_001') { if (sound) { const audio = new Audio(`/audio/${cue}.ogg`); audio.volume = 0.3; void audio.play().catch(() => {}); } }
  function replay() { if (completed) setPrevious(state); setState(initialState(state.market)); setSelected(null); setRepairNotice(false); setTab('town'); play('back_001'); }
  function confirm() { if (!selected || loadingMarket) return; setState(s => choose(s, selected)); setSelected(null); play('confirmation_001'); }
  function next() { const nextState = continueGame(state); setState(nextState); setSelected(null); if (nextState.month === 5 && nextState.phase === 'choice') setRepairNotice(true); play(); }
  useEffect(() => { let active = true; void loadMarketFeed(import.meta.env.VITE_MARKET_DATA_URL).then(feed => { if (active) { setState(initialState(feed)); setLoadingMarket(false); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (completed) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { setStorageUnavailable(true); } } }, [completed, state]);
  useEffect(() => { if (state.month > 1 || state.phase !== 'choice') heading.current?.focus({ preventScroll: true }); }, [state.phase, state.month]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || repairNotice || loadingMarket || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key)) return;
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;
      const choice = choices[Number(e.key) - 1];
      if (choice && !disabledReason(state, choice.id)) { e.preventDefault(); setSelected(choice.id); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [choices, modal, repairNotice, loadingMarket, state]);
  const goal = state.goal ? GOALS[state.goal] : null;
  const accountInfo = modal && modal in ACCOUNTS ? ACCOUNTS[modal as Account] : null;
  function startJourney(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = playerName.trim().slice(0, 32);
    if (!name || !selectedAvatarId || !selectedLiteracyLevel || loadingMarket) return;
    const nextProfile = { name, avatarId: selectedAvatarId, literacyLevel: selectedLiteracyLevel };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); }
    catch { setStorageUnavailable(true); }
    setProfile(nextProfile);
  }
  function changeAvatar(avatarId: AvatarId) {
    if (!profile) return;
    const nextProfile = { ...profile, avatarId };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); }
    catch { setStorageUnavailable(true); }
    setProfile(nextProfile);
    setModal(null);
    play();
  }
  if (!profile) return <MotionConfig reducedMotion={quietMotion ? 'always' : 'user'}><main className="onboarding-screen"><form className="onboarding-card" onSubmit={startJourney}>
    <h1>Set up your character</h1>
    <label className="player-name-label" htmlFor="player-name">Your name</label>
    <input id="player-name" className="player-name-input" autoComplete="nickname" maxLength={32} value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your name" required />
    <div className="avatar-picker-heading"><h2>Choose your character</h2></div>
    <AvatarPicker selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} />
    <div className="avatar-picker-heading literacy-heading"><h2>How familiar are you with money?</h2></div>
    <div className="literacy-picker" role="radiogroup" aria-label="Financial literacy level">{literacyLevels.map(option => <button type="button" role="radio" aria-checked={selectedLiteracyLevel === option.level} className={`literacy-option level-${option.level} ${selectedLiteracyLevel === option.level ? 'selected' : ''}`} key={option.level} onClick={() => setSelectedLiteracyLevel(option.level)}><b>Level {option.level} — {option.name}</b><small>“{option.description}”</small></button>)}</div>
    {loadingMarket ? <p className="onboarding-status" role="status">Preparing your financial world…</p> : <button type="submit" className="primary-button onboarding-submit" disabled={!playerName.trim() || !selectedAvatarId || !selectedLiteracyLevel}>Start</button>}
    {storageUnavailable && <p className="onboarding-status">Your profile will be kept for this session, but this browser can’t save it for next time.</p>}
  </form></main></MotionConfig>;
  const playerAvatar = getAvatar(profile.avatarId);
  return <MotionConfig reducedMotion={quietMotion ? 'always' : 'user'}><main className="game-layout">
    <aside className="decision-panel" aria-label="Your decisions">
      <div className="profile panel-card"><button type="button" className="avatar" aria-label={`Change avatar, currently ${playerAvatar.name}`} title="Change avatar" onClick={() => setModal('avatar')}><img src={playerAvatar.preview} alt="" /></button><div className="profile-details"><div className="profile-heading"><h2>{profile.name}</h2><span className="profile-age">Age {state.age}</span></div><div className="profile-meter profile-month"><span className="profile-meter-label">Month <b>{state.month}/12</b></span><div className="profile-month-bar" role="progressbar" aria-label={`Month ${state.month} of 12`} aria-valuenow={state.month} aria-valuemin={1} aria-valuemax={12}>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i < Math.ceil(state.month / 2) ? 'complete' : ''} />)}</div></div></div></div>
      <section className="story-card panel-card">
        <AnimatePresence mode="wait"><motion.div key={`${state.month}-${state.phase}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
          <div className="story-heading">{result ? <Check /> : state.month === 5 ? <Wrench /> : <CalendarDays />}<h1 ref={heading} tabIndex={-1}>{title}</h1></div>
          {completed ? <><p className="story-description">{state.explanation}</p><div className="year-result"><span>Your year-end portfolio</span><strong>{exactMoney(portfolio(state))}</strong><p>{money(state.totalContributed)} contributed · {exactMoney(state.totalMarketChange)} growth · {money(state.totalWithdrawn)} withdrawn</p></div><button className="primary-button" onClick={() => setModal('compare')}>Compare your paths<GitCompareArrows size={18} /></button><button className="secondary-button" onClick={replay}><RotateCcw size={17} />Try a different story</button>{storageUnavailable && <p className="fine-print">Browser storage is unavailable. Your result is kept for replay while this tab stays open.</p>}</> : result ? <><p className="story-description result-description">{state.explanation}</p><button className="primary-button" onClick={next}>{state.month === 12 ? 'Choose my financial goal' : `Continue to Month ${state.month + 1}`}<ArrowRight size={18} /></button></> : <><p className="story-description">{description}</p>
          <div className="choices three-choices" role="group" aria-label="Choose your next step">{choices.map((choice, i) => { const reason = disabledReason(state, choice.id); return <div className={accountStep ? 'account-choice' : 'choice-wrap'} key={choice.id}><motion.button whileTap={{ scale: 0.98 }} className={`choice choice-${i % 3} ${selected === choice.id ? 'selected' : ''}`} aria-label={choice.title} aria-pressed={selected === choice.id} disabled={!!reason || loadingMarket} title={reason || choice.description} onClick={() => { setSelected(choice.id); play(); }}><span><b>{choice.title}</b><small>{reason || choice.description}</small></span>{selected === choice.id ? <Check size={17} /> : <ChevronRight size={18} />}</motion.button>{accountStep && <button className="learn-more" aria-label={`Learn more about ${choice.id}`} onClick={() => setModal(choice.id as Account)}>Learn More<Info size={14} /></button>}</div>; })}</div>
          {loadingMarket && <p role="status">Loading market data…</p>}<button className="primary-button confirm-button" disabled={!selected || loadingMarket} onClick={confirm}>{accountStep ? 'Open this account' : goalStep ? 'Set my goal' : 'Make this choice'}<ArrowRight size={18} /></button></>}
        </motion.div></AnimatePresence><div className="lesson" aria-live="polite"><Lightbulb size={23} /><p>{lesson}</p></div>
      </section>
      <section className="finances panel-card"><h2><Wallet size={28} />Your Finances</h2><div className="stat-grid"><Stat icon={Coins} label="Cash" amount={state.cash} tone="cash" /><Stat icon={ChartNoAxesCombined} label="Investments" amount={portfolio(state)} tone="investment" /><Stat icon={CreditCard} label="Debt" amount={state.debt} tone="debt" /><Stat icon={ShieldCheck} label="Emergency Fund" amount={state.emergencySavings} tone="savings" /></div><div className="account-status"><Landmark size={15} />{state.account ? `${state.account} · Open` : 'Investment account · Not opened'}</div>{state.recurring && <p className="recurring-status">Monthly plan: {state.recurring === 'invest' ? '$100 → ETF' : state.recurring === 'save' ? '$100 → Emergency fund' : state.recurring === 'debt' ? '$100 → Debt' : '$50 ETF + $50 Emergency fund'}</p>}</section>
      {state.month >= 3 && <section className="portfolio-panel panel-card" aria-label="Portfolio performance"><div><span>Contributed</span><b>{exactMoney(state.totalContributed)}</b></div><div className={state.totalMarketChange < 0 ? 'negative' : 'positive'}><span>Investment growth</span><b>{state.totalMarketChange >= 0 ? '+' : ''}{exactMoney(state.totalMarketChange)}</b></div>{state.totalWithdrawn > 0 && <div><span>Withdrawn</span><b>{exactMoney(state.totalWithdrawn)}</b></div>}<div className={state.monthlyGrowth < 0 ? 'negative' : 'positive'}><span>This month’s market</span><b>{state.monthlyGrowth >= 0 ? '+' : ''}{exactMoney(state.monthlyGrowth)}</b></div><p>ETF {((state.market.months[state.month - 1]?.etf || 0) * 100).toFixed(1)}% · Stock {((state.market.months[state.month - 1]?.stocks || 0) * 100).toFixed(1)}% this month</p><small>{state.market.label} · {state.market.source === 'api' ? state.market.asOf : 'SAMPLE DATA'}</small></section>}
      <section className="savings-goal panel-card"><div className="goal-heading"><span className="goal-icon"><House size={30} /></span><div><h2>Financial Goal</h2><p>{goal ? `${goal.name} · ${money(goal.target)}` : 'Not selected'}</p></div></div>{goal ? <><div className="progress-rail" role="progressbar" aria-label={`${goal.name} goal`} aria-valuenow={Math.round(goalProgress(state) * 100)} aria-valuemin={0} aria-valuemax={100}><motion.div animate={{ width: `${goalProgress(state) * 100}%` }} /></div><p className="goal-total">{money(portfolio(state))} / {money(goal.target)} · {Math.round(goalProgress(state) * 100)}%</p></> : <p className="goal-hint">Choose what you’re building toward at the end of your year.</p>}</section>
      <button className="simulation-button panel-card" onClick={() => setModal('how')}><Info size={23} />How this simulation works<ChevronRight size={19} /></button>
      <nav className="bottom-nav panel-card" aria-label="Game controls"><button aria-label="Replay" disabled={loadingMarket} onClick={replay}><RotateCcw />Replay</button><button aria-label="Compare paths" onClick={() => setModal('compare')}><ChartNoAxesCombined />Compare</button><button onClick={() => setModal('settings')}><Settings />Settings</button></nav>
    </aside>
    <section className="world-panel" aria-label="Your financial world"><div className="world-toolbar"><a href="/" className="world-brand"><Sprout size={21} />investly<span>.</span></a><div className="toolbar-actions"><div className="view-tabs" role="tablist" aria-label="World view"><button role="tab" aria-selected={tab === 'town'} onClick={() => setTab('town')} className={tab === 'town' ? 'active' : ''}><House size={15} />Your town</button><button role="tab" aria-selected={tab === 'ledger'} onClick={() => setTab('ledger')} className={tab === 'ledger' ? 'active' : ''}><ReceiptText size={15} />Your ledger</button></div><button className="sound-button" aria-label={sound ? 'Mute sounds' : 'Enable sounds'} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div></div>
      <div className="world-view" role="tabpanel" aria-label={tab === 'town' ? 'Your town' : 'Your ledger'}>{tab === 'town' ? <><Suspense fallback={<div className="scene-loading">Building your world…</div>}><Town state={state} reduced={reduced} zoom={1} avatarId={profile.avatarId} avatarName={profile.name} /></Suspense><div className="world-status"><span className="live-dot" />Month {state.month}<span className="status-divider" />{state.market.source === 'api' ? 'Historical API data' : 'Fictional sample data'}</div></> : <div className="ledger-view"><div className="ledger-heading"><Landmark size={26} /><div><h3>Every dollar has a story.</h3><p>Exact balances after each month and decision.</p></div></div><NetWorthChart state={state} /><div className="ledger-scroll"><table><thead><tr><th>Month / event</th><th>Cash</th><th>Emergency fund</th><th>Investments</th><th>Debt</th><th>Net worth</th></tr></thead><tbody>{state.ledger.map((l, i) => <tr key={i}><th>{monthName(l.month)}<span>{l.label}</span></th><td>{exactMoney(l.cash)}</td><td>{exactMoney(l.emergencySavings)}</td><td>{exactMoney(l.investments)}</td><td>{exactMoney(l.debt)}</td><td>{exactMoney(l.netWorth)}</td></tr>)}</tbody></table></div><p className="fine-print">Total interest: {exactMoney(state.totalInterest)}. Contributed {exactMoney(state.totalContributed)} + market growth {exactMoney(state.totalMarketChange)} − withdrawn {exactMoney(state.totalWithdrawn)} = portfolio {exactMoney(portfolio(state))}.</p><p className="fine-print">{state.market.notice}</p></div>}</div>
      <div className="world-caption" aria-live="polite"><Info size={16} /><p>{state.explanation}</p></div><span className="fictional-note">Simulated money · {state.market.source === 'api' ? 'Historical market returns' : 'Fictional sample returns'}</span>
    </section>
    {repairNotice && <Modal title="An unexpected expense" onClose={() => setRepairNotice(false)}><div className="repair-popup"><Wrench size={40} /><p>Your car needs a $700 repair.</p><p>Your emergency fund has {money(state.emergencySavings)}. Let’s see how it can help.</p><button className="primary-button" onClick={() => setRepairNotice(false)}>See my options<ArrowRight size={18} /></button></div></Modal>}
    {modal && <Modal title={accountInfo ? `${modal} · Learn More` : modal === 'avatar' ? 'Change your avatar' : modal === 'how' ? 'How Investly works' : modal === 'settings' ? 'Make yourself at home' : 'Two paths. A clearer picture.'} onClose={() => setModal(null)} wide={modal === 'compare' || modal === 'avatar'}>{accountInfo ? <><p className="modal-intro">{accountInfo.description}</p><p>This is a simulated account. Real eligibility, contribution limits, and withdrawal rules apply.</p><a href={accountInfo.url} target="_blank" rel="noreferrer">Read the CRA account guide ↗</a></> : modal === 'avatar' ? <><p className="modal-intro">Pick a character to update your profile and town.</p><AvatarPicker selectedAvatarId={profile.avatarId} onSelect={changeAvatar} /></> : modal === 'how' ? <HowItWorks state={state} /> : modal === 'compare' ? <Compare state={state} previous={previous} /> : <div className="settings-list"><button aria-pressed={sound} onClick={() => setSound(!sound)}><Volume2 /><span><b>Game sounds</b><small>Feedback with every choice</small></span><span className={`toggle ${sound ? 'on' : ''}`} /></button><button aria-pressed={quietMotion} onClick={() => setQuietMotion(!quietMotion)}><Sparkles /><span><b>Reduce motion</b><small>Pause idle motion and coin animations</small></span><span className={`toggle ${quietMotion ? 'on' : ''}`} /></button><p className="fine-print">Your system’s reduced-motion preference is always respected.</p></div>}</Modal>}
  </main></MotionConfig>;
}
