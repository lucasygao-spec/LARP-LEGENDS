import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarDays, ChevronRight, Lightbulb, Settings, ChartNoAxesCombined, Check, Coins, CreditCard, GitCompareArrows, House, Info, RotateCcw, ShieldCheck, Sparkles, Sprout, Volume2, VolumeX, Wallet, Wrench, X, Landmark, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import story from './data/story.json';
import { avatars, getAvatar } from './avatarCatalog';
import type { AvatarId } from './avatarCatalog';
import { ACCOUNTS, GOALS, choose, choicesFor, continueGame, disabledReason, exactMoney, goalProgress, goalFunds, initialState, money, netWorth, portfolio, totalDebt, RULES } from './engine';
import type { Account, GameState } from './engine';
import { FUNDS, HOLDINGS, METHODS } from './investments';
import type { Fund } from './investments';
import { loadMarketFeed } from './market';
const Town = lazy(() => import('./Town'));
const STORAGE_KEY = 'investly.previous-run.v6';
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
    if (!data || data.version !== 6 || data.phase !== 'complete' || data.month !== story.length || (data.goal !== null && !(data.goal in GOALS)) || !Array.isArray(data.ledger) || !data.ledger.length || !Array.isArray(data.decisionHistory) || data.decisionHistory.length !== story.length || !data.holdings || !data.market) return null;
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
function ProfileEditor({ profile, onSave, onCancel }: { profile: PlayerProfile; onSave: (profile: PlayerProfile) => void; onCancel: () => void }) {
  const [name, setName] = useState(profile.name);
  const [avatarId, setAvatarId] = useState<AvatarId>(profile.avatarId);
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 32);
    if (trimmed) onSave({ ...profile, name: trimmed, avatarId });
  }
  return <form className="profile-editor" onSubmit={save}>
    <label className="player-name-label" htmlFor="edit-player-name">Player name</label>
    <input id="edit-player-name" className="player-name-input" value={name} onChange={e => setName(e.target.value)} maxLength={32} autoComplete="nickname" required autoFocus />
    <h3 className="modal-subtitle">Choose your avatar</h3>
    <div className="avatar-picker" role="radiogroup" aria-label="Choose your avatar">{avatars.map(avatar => <button type="button" role="radio" aria-checked={avatarId === avatar.id} aria-label={avatar.name} className={`avatar-option ${avatarId === avatar.id ? 'selected' : ''}`} key={avatar.id} onClick={() => setAvatarId(avatar.id)}><img src={avatar.preview} alt="" loading="lazy" /><span><b>{avatar.name}</b></span>{avatarId === avatar.id && <Check size={18} />}</button>)}</div>
    <div className="profile-editor-actions"><button type="submit" className="primary-button" disabled={!name.trim()}>Save changes<Check size={17} /></button><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
function FullScreenPanel({ children, labelledBy = 'story-title', eyebrow, tone = 'default' }: { children: ReactNode; labelledBy?: string; eyebrow: string; tone?: 'default' | 'danger' | 'summary' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('h1, h2')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={ref} className={`story-alert ${tone}`} aria-labelledby={labelledBy} onCancel={e => e.preventDefault()} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const controls = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = controls[0]; const last = controls.at(-1);
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLButtonElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }}>
    <div className="alert-panel"><div className="alert-eyebrow"><Info size={18} />{eyebrow}</div>{children}</div>
  </dialog>;
}
const financialRows: [string, (s: GameState) => number][] = [
  ['Cash', s => s.cash], ['General savings', s => s.savings], ['Emergency fund', s => s.emergencySavings],
  ['Investments', portfolio], ['Debt', totalDebt], ['Net worth', netWorth],
];
const activityRows: [string, (s: GameState) => number][] = [
  ['Income received', s => s.totalIncome], ['Expenses', s => s.totalSpending], ['Interest charged', s => s.totalInterest],
  ['Market change', s => s.totalMarketChange], ['Invested', s => s.totalContributed], ['Investments sold', s => s.totalWithdrawn],
];
function hasFinancialUpdate(before: GameState, after: GameState) {
  return [...financialRows, ...activityRows].some(([, value]) => value(before) !== value(after)) || HOLDINGS.some(symbol => before.holdings[symbol] !== after.holdings[symbol]);
}
function FinancialUpdate({ before, after, explanation }: { before: GameState; after: GameState; explanation: string }) {
  const changes = activityRows.map(([label, get]) => ({ label, amount: Math.round((get(after) - get(before)) * 100) / 100 })).filter(row => row.amount !== 0);
  return <section className="financial-update panel-card" aria-label="Latest financial update">
    <h2>Your financial update</h2>
    <p className="update-description" aria-live="polite">{explanation}</p>
    <p className="update-hint">Balances updated · Month {after.month}</p>
    <dl className="update-activity">{changes.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.amount > 0 ? '+' : ''}{exactMoney(row.amount)}</dd></div>)}</dl>
    <div className="update-table-wrap"><table className="update-table"><thead><tr><th>Balance</th><th>Before</th><th>Now</th></tr></thead><tbody>{financialRows.map(([label, get]) => {
      const oldValue = get(before); const newValue = get(after); const change = newValue - oldValue;
      return <tr key={label} className={change ? 'update-changed' : undefined} data-changed={change !== 0}><th>{label}</th><td>{exactMoney(oldValue)}</td><td className={change ? ((label === 'Debt' ? -change : change) > 0 ? 'update-positive' : 'update-negative') : ''}>{exactMoney(newValue)}{change !== 0 && <small>{change > 0 ? '+' : ''}{exactMoney(change)}</small>}</td></tr>;
    })}</tbody></table></div>
    {HOLDINGS.some(symbol => before.holdings[symbol] !== after.holdings[symbol]) && <div className="update-holdings">{HOLDINGS.filter(symbol => before.holdings[symbol] !== after.holdings[symbol]).map(symbol => <p key={symbol}>{symbol}: {exactMoney(before.holdings[symbol])} → {exactMoney(after.holdings[symbol])}</p>)}</div>}
  </section>;
}
function Stat({ icon: Icon, label, amount, tone, changed = false }: { icon: LucideIcon; label: string; amount: number; tone: string; changed?: boolean }) {
  return <div className={`stat ${tone} ${changed ? 'stat-changed' : ''}`} title={exactMoney(amount)}><span><Icon size={15} />{label}</span><motion.strong key={amount} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }}>{money(amount)}</motion.strong></div>;
}
function HowItWorks({ state }: { state: GameState }) {
  return <><p className="modal-intro">A short pitch demo: first job, emergency, birthday, investing, and a choice about your future.</p><dl className="rules">
    <div><dt>Starting point</dt><dd>Age 18; $1,000 cash; all other balances $0. Choose your name and avatar. Every amount is simulated Canadian dollars.</dd></div>
    <div><dt>Simple budgets</dt><dd>Work: a $30,000/year BizTech mascot job, with $400/month available after simplified taxes and essentials. Uni: $5,000 tuition debt and $100/month available from part-time work. The $250/month raise starts in Month 5; on the work path it represents a 10% salary increase. The university path receives the same extra cash as a demo assumption.</dd></div>
    <div><dt>Emergency & birthday</dt><dd>The optional emergency deposit is $200. The medical bill is $200; use the fund or ask Mom for a $200 gift that is immediately used to pay the bill. The $1,000 birthday gift arrives once in Month 4. General savings and emergency savings are separate; neither earns interest here.</dd></div>
    <div><dt>Investing steps</dt><dd>Opening an account, selecting a method, and choosing an ETF are substeps in the same month. An account-opening birthday choice reserves the gift in cash; investing the raise then invests that $1,000 plus $250. All four methods lead to the same ETF picker; provider fees and services are not modeled.</dd></div>
    <div><dt>Funds & returns</dt><dd>VAB, XUS, and QQQ are real funds used as examples. The pitch’s 2–4%, 7–11%, and 18% annual figures are illustrative assumptions, not verified historical CAGR, forecasts, or the returns used by this engine. Relative risk labels are simplified demo categories. BizTech is always simulated. Foreign exchange, taxes, distributions, account eligibility, contribution limits, and withdrawal rules are not modeled.</dd></div>
    <div><dt>Market source</dt><dd>{state.market.label} · {state.market.asOf}. {state.market.notice} Existing holdings change before each new $250 contribution. A run and its replay use the same frozen sequence.</dd></div>
    <div><dt>Miami goal</dt><dd>The penthouse choice compares cash + general savings + investments with a $1,000,000 goal. Emergency savings are excluded; debt stays visible separately. No property is bought or investments sold. The one-day penthouse rental costs exactly your available cash at that step. It spends that cash in full, with $0 course revenue initially; savings and investments stay untouched. Or keep grinding with your existing portfolio and contribution plan. Both endings stay in Month 6.</dd></div>
    <div><dt>Accounting</dt><dd>Student debt uses a 6% APR ÷ 12. All balances round to cents. Net worth = cash + general savings + emergency savings + investments − all debt. Portfolio = contributions + market change − withdrawals. Rebalancing does not count as a new contribution. Financial effects are symbolic; financial summaries show exact amounts.</dd></div>
    <div><dt>Controls</dt><dd>Click a choice to update your balances and advance immediately. Your financial update stays in the sidebar, with changed accounts highlighted. Only the final financial summary opens full-screen. Number keys 1–4 also choose immediately; Tab and Enter operate every control. The medical alert fills the screen. The pitch ends after your Month 6 investment decision. Replay and compare with your previous completed pitch. No real accounts or trades are created.</dd></div>
  </dl></>;
}
function Compare({ state, previous }: { state: GameState; previous: GameState | null }) {
  const rows: [string, (s: GameState) => number][] = [['Cash', s => s.cash], ['General savings', s => s.savings], ['Emergency fund', s => s.emergencySavings], ['Investments', portfolio], ['Contributed', s => s.totalContributed], ['Withdrawn', s => s.totalWithdrawn], ['Investment growth', s => s.totalMarketChange], ['Debt', totalDebt], ['Net worth', netWorth]];
  return <><p className="modal-intro">See how your choices add up over time.</p>{!previous && <p className="notice">Finish the pitch, then replay to compare two paths.</p>}<table className="compare-table"><thead><tr><th>At a glance</th><th>This run · M{state.month}</th><th>Previous run</th></tr></thead><tbody>{rows.map(([label, get]) => <tr key={label}><th>{label}</th><td>{exactMoney(get(state))}</td><td>{previous ? exactMoney(get(previous)) : '—'}</td></tr>)}<tr><th>Account / goal</th><td>{state.account || 'None'} / {state.goal ? GOALS[state.goal].name : 'Not selected'}</td><td>{previous ? `${previous.account || 'None'} / ${previous.goal ? GOALS[previous.goal].name : 'Not selected'}` : '—'}</td></tr></tbody></table><h3 className="modal-subtitle">Your paths</h3><div className="path-list">{Array.from({length: story.length}, (_, i) => <div key={i}><span>{`M${i + 1}`}</span><p>{state.decisionHistory[i]?.title || 'Still ahead'}</p><p>{previous?.decisionHistory[i]?.title || '—'}</p></div>)}</div><p className="fine-print">This run: {state.market.label} ({state.market.asOf}). Previous: {previous ? `${previous.market.label} (${previous.market.asOf})` : 'none'}. Different data sequences can also affect results.</p></>;
}
export default function App() {
  const [state, setState] = useState(initialState);
  const [latestUpdate, setLatestUpdate] = useState<{ before: GameState; after: GameState; explanation: string } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [penthouseOpen, setPenthouseOpen] = useState(false);
  const transitionLock = useRef(false);
  useEffect(() => { transitionLock.current = false; }, [state]);
  const [profile, setProfile] = useState<PlayerProfile | null>(loadProfile);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId | null>('chicken-guy');
  const [selectedLiteracyLevel, setSelectedLiteracyLevel] = useState<FinancialLiteracyLevel | null>(null);
  const [previous, setPrevious] = useState<GameState | null>(loadPrevious);
  const [modal, setModal] = useState<'how' | 'compare' | 'settings' | 'profile' | Account | Fund | null>(null);
  const [quietMotion, setQuietMotion] = useState(false);
  const [sound, setSound] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const reduced = !!useReducedMotion() || quietMotion;
  const heading = useRef<HTMLHeadingElement>(null);
  const completed = state.phase === 'complete'; const result = state.phase === 'result';
  const accountStep = state.phase === 'account'; const fundStep = state.phase === 'fund';
  const event = story[Math.min(state.month - 1, story.length - 1)]; const choices = choicesFor(state);
  const lesson = state.phase === 'penthouse' ? 'Looking wealthy and building wealth cost different things. Income from a new venture isn’t guaranteed.' : completed ? 'Your habits matter. Build a cushion, understand your risk, and invest toward a goal.' : state.phase === 'method' || fundStep ? 'How you invest and what you invest in are different decisions.' : event.lesson;
  const title = completed ? 'Your choices added up.' : state.phase === 'penthouse' ? (penthouseOpen ? 'Your penthouse options' : 'Not quite penthouse money…') : result ? 'Here’s what happened' : accountStep ? 'Which account would you like to open?' : state.phase === 'method' ? 'You got a raise!' : fundStep ? 'Which ETF would you like to invest in?' : state.phase === 'assistance' ? 'Your emergency fund is empty!' : state.month === 6 && state.monthlyGrowth > 0 ? 'Omg congrats! Your investments grew.' : state.month === 6 && state.monthlyGrowth < 0 ? 'Markets had a rough month.' : event.title;
  const description = state.phase === 'penthouse' ? state.explanation : accountStep ? 'Pick a simulated account. Learn More explains each one.' : state.phase === 'method' ? (state.path === 'work' ? event.body : 'Your part-time role brings an extra $250/month in this demo. How would you like to invest?') : fundStep ? `${state.explanation} You have ${money(Math.min(state.cash, state.reservedGift + RULES.raise))} ready to invest.` : state.phase === 'assistance' ? 'You don’t have $200 in your emergency fund. You have to call Mom to ask for money :(' : state.month === 5 && state.path === 'university' ? 'Your part-time role brings an extra $250/month in this demo. Where should it go?' : state.month === 6 ? `${state.monthlyGrowth > 0 ? `You made ${exactMoney(state.monthlyGrowth)} this month!` : state.monthlyGrowth < 0 ? `Your investments fell ${exactMoney(-state.monthlyGrowth)} this month.` : 'Your cash and savings stayed out of the market.'} What would you like to do with this money?` : event.body;
  function play(cue = 'click_001') { if (sound) { const audio = new Audio(`/audio/${cue}.ogg`); audio.volume = 0.3; void audio.play().catch(() => {}); } }
  function replay() { setLatestUpdate(null); setSummaryOpen(true); setPenthouseOpen(false); if (completed) setPrevious(state); setState(initialState(state.market)); play('back_001'); }
  function makeChoice(id: string) {
    if (loadingMarket || transitionLock.current || disabledReason(state, id)) return;
    transitionLock.current = true;
    const decision = choose(state, id);
    const nextState = decision.phase === 'result' ? continueGame(decision) : decision;
    if (nextState.month !== decision.month) nextState.effects = [...decision.effects, ...nextState.effects];
    if (hasFinancialUpdate(state, nextState)) setLatestUpdate({ before: state, after: nextState, explanation: decision.explanation });
    setState(nextState); play('confirmation_001');
  }
  function accountChanged(label: string) {
    const get = financialRows.find(([name]) => name === label)?.[1];
    return !!latestUpdate && !!get && get(latestUpdate.before) !== get(latestUpdate.after);
  }
  useEffect(() => { let active = true; void loadMarketFeed(import.meta.env.VITE_MARKET_DATA_URL).then(feed => { if (active) { setState(initialState(feed)); setLoadingMarket(false); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (completed) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { setStorageUnavailable(true); } } }, [completed, state]);
  useEffect(() => { if (state.month > 1 || state.phase !== 'choice') heading.current?.focus({ preventScroll: true }); }, [state.phase, state.month]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (state.phase === 'penthouse' && !penthouseOpen) || modal || !profile || loadingMarket || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key)) return;
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;
      const choice = choices[Number(e.key) - 1];
      if (choice && !disabledReason(state, choice.id)) { e.preventDefault(); makeChoice(choice.id); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [choices, modal, profile, loadingMarket, state, penthouseOpen]);
  const goal = state.goal ? GOALS[state.goal] : null;
  const accountInfo = modal && modal in ACCOUNTS ? ACCOUNTS[modal as Account] : null;
  const fundInfo = modal && modal in FUNDS ? FUNDS[modal as Fund] : null;
  function saveProfile(nextProfile: PlayerProfile) {
    setProfile(nextProfile);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); }
    catch { setStorageUnavailable(true); }
    setModal(null);
  }
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
  const storyInPopup = state.month === 3 || (state.phase === 'penthouse' && penthouseOpen) || (completed && summaryOpen);
  const storyContent = <section className="story-card panel-card">
        <motion.div key={`${state.month}-${state.phase}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
          <div className="story-heading">{result ? <Check /> : state.month === 3 ? <Wrench /> : <CalendarDays />}<h1 id="story-title" ref={heading} tabIndex={-1}>{title}</h1></div>
          {completed ? <><p className="story-description">{state.explanation}</p><div className="year-result"><span>Your portfolio after the pitch</span><strong>{exactMoney(portfolio(state))}</strong><p>{money(state.totalContributed)} contributed · {exactMoney(state.totalMarketChange)} growth · {money(state.totalWithdrawn)} withdrawn</p></div><dl className="ending-summary" aria-label="Final financial summary">{([
            ['Cash', state.cash], ['General savings', state.savings], ['Emergency fund', state.emergencySavings], ['Investments', portfolio(state)], ['Debt', totalDebt(state)], ['Net worth', netWorth(state)]
          ] as [string, number][]).map(([label, amount]) => <div key={label} className={amount !== (label === 'Cash' || label === 'Net worth' ? RULES.startingCash : 0) ? 'summary-changed' : undefined}><dt>{label}</dt><dd>{exactMoney(amount)}</dd></div>)}</dl><button className="primary-button" onClick={() => setModal('compare')}>Compare your paths<GitCompareArrows size={18} /></button><button className="secondary-button" onClick={replay}><RotateCcw size={17} />Try a different story</button><button className="secondary-button" onClick={() => setSummaryOpen(false)}>Back to dashboard</button>{storageUnavailable && <p className="fine-print">Browser storage is unavailable. Your result is kept for replay while this tab stays open.</p>}</> : <><p className="story-description">{description}</p>
          {state.phase === 'penthouse' && !penthouseOpen ? <button className="primary-button" onClick={() => setPenthouseOpen(true)}>See my options<ArrowRight size={18} /></button> : <div className="choices three-choices" role="group" aria-label="Choose your next step">{choices.map((choice, i) => { const reason = disabledReason(state, choice.id); return <div className={accountStep || fundStep ? 'account-choice' : 'choice-wrap'} key={choice.id}><motion.button whileTap={{ scale: 0.98 }} className={`choice choice-${i % 3}`} aria-label={choice.title} disabled={!!reason || loadingMarket} title={reason || choice.description} onClick={() => makeChoice(choice.id)}><span><b>{choice.title}</b><small>{reason || choice.description}</small></span><ChevronRight size={18} /></motion.button>{(accountStep || fundStep) && <button className="learn-more" aria-label={`Learn more about ${choice.id}`} onClick={() => setModal(choice.id as Account | Fund)}>Learn More<Info size={14} /></button>}</div>; })}</div>}
          {loadingMarket && <p role="status">Loading market data…</p>}</>}
        </motion.div><div className="lesson" aria-live="polite"><Lightbulb size={23} /><p>{lesson}</p></div>
      </section>;
  return <MotionConfig reducedMotion={quietMotion ? 'always' : 'user'}><main className="game-layout">
    <aside className="decision-panel" aria-label="Your decisions">
      <div className="profile panel-card"><button type="button" className="avatar" aria-label={`Change avatar, currently ${playerAvatar.name}`} title="Change avatar" onClick={() => setModal('profile')}><img src={playerAvatar.preview} alt="" /></button><div className="profile-details"><div className="profile-heading"><h2>{profile.name}</h2><span className="profile-age">Age {state.age}</span></div><div className="profile-meter profile-month"><span className="profile-meter-label">Month <b>{state.month}/{story.length}</b></span><div className="profile-month-bar" role="progressbar" aria-label={`Month ${state.month} of ${story.length}`} aria-valuenow={state.month} aria-valuemin={1} aria-valuemax={story.length}>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i < Math.ceil(state.month / story.length * 6) ? 'complete' : ''} />)}</div></div></div></div>
      {completed ? <section className="story-card panel-card"><h2>Your story is complete</h2><button className="primary-button" onClick={() => setSummaryOpen(true)}>View final summary</button></section> : storyInPopup ? <section className="story-card panel-card alert-placeholder"><Info /><h2>{state.month === 3 ? "An unexpected expense" : "Your penthouse options"}</h2><p>Choose an option in the popup to continue.</p></section> : storyContent}
      {!completed && latestUpdate && <FinancialUpdate {...latestUpdate} />}
      <section className="finances panel-card"><h2><Wallet size={28} />Your Finances</h2><div className="stat-grid"><Stat icon={Coins} label="Cash" changed={accountChanged('Cash')} amount={state.cash} tone="cash" /><Stat icon={ChartNoAxesCombined} label="Investments" changed={accountChanged('Investments')} amount={portfolio(state)} tone="investment" /><Stat icon={CreditCard} label="Debt" changed={accountChanged('Debt')} amount={totalDebt(state)} tone="debt" /><Stat icon={Wallet} label="Savings" changed={accountChanged('General savings')} amount={state.savings} tone="cash" /><Stat icon={ShieldCheck} label="Emergency Fund" changed={accountChanged('Emergency fund')} amount={state.emergencySavings} tone="savings" /></div><div className="account-status"><Landmark size={15} />{state.account ? `${state.account} · Open` : portfolio(state) ? 'Unregistered demo portfolio' : 'Investment account · Not opened'}</div>{state.recurring && <p className="recurring-status">Raise plan: $250/month → {state.recurring === 'invest' ? state.selectedFund : state.recurring === 'savings' ? 'Savings' : 'Emergency fund'}</p>}{state.method && <p className="recurring-status">{METHODS.find(m => m.id === state.method)?.title}</p>}</section>
      {state.month >= 3 && <section className="portfolio-panel panel-card" aria-label="Portfolio performance"><div><span>Contributed</span><b>{exactMoney(state.totalContributed)}</b></div><div className={state.totalMarketChange < 0 ? 'negative' : 'positive'}><span>Investment growth</span><b>{state.totalMarketChange >= 0 ? '+' : ''}{exactMoney(state.totalMarketChange)}</b></div>{state.totalWithdrawn > 0 && <div><span>Withdrawn</span><b>{exactMoney(state.totalWithdrawn)}</b></div>}<div className={state.monthlyGrowth < 0 ? 'negative' : 'positive'}><span>This month’s market</span><b>{state.monthlyGrowth >= 0 ? '+' : ''}{exactMoney(state.monthlyGrowth)}</b></div><div className="holdings-list">{HOLDINGS.filter(symbol => state.holdings[symbol] > 0).map(symbol => <p key={symbol}>{symbol === 'BIZTECH' ? 'BizTech' : symbol} · {exactMoney(state.holdings[symbol])} · {(state.market.months[state.month - 1][symbol] * 100).toFixed(1)}% this month</p>)}</div><small>{state.market.label} · {state.market.source === 'api' ? state.market.asOf : 'SAMPLE DATA'}</small></section>}
      <section className="savings-goal panel-card"><div className="goal-heading"><span className="goal-icon"><House size={30} /></span><div><h2>Financial Goal</h2><p>{goal ? `${goal.name} · ${money(goal.target)}` : 'Not selected'}</p></div></div>{goal ? <><div className="progress-rail" role="progressbar" aria-label={`${goal.name} goal`} aria-valuenow={Math.round(goalProgress(state) * 100)} aria-valuemin={0} aria-valuemax={100}><motion.div animate={{ width: `${goalProgress(state) * 100}%` }} /></div><p className="goal-total">{money(goalFunds(state))} / {money(goal.target)} · {Math.round(goalProgress(state) * 100)}%</p></> : <p className="goal-hint">See where your investing choices take you. A Miami goal may be ahead.</p>}</section>
      <button className="simulation-button panel-card" onClick={() => setModal('how')}><Info size={23} />How this simulation works<ChevronRight size={19} /></button>
      <nav className="bottom-nav panel-card" aria-label="Game controls"><button aria-label="Replay" disabled={loadingMarket} onClick={replay}><RotateCcw />Replay</button><button aria-label="Compare paths" onClick={() => setModal('compare')}><ChartNoAxesCombined />Compare</button><button onClick={() => setModal('settings')}><Settings />Settings</button></nav>
    </aside>
    <section className="world-panel" aria-label="Your financial world"><div className="world-toolbar"><a href="/" className="world-brand"><Sprout size={21} />investly<span>.</span></a><div className="toolbar-actions"><button className="sound-button" aria-label={sound ? 'Mute sounds' : 'Enable sounds'} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div></div>
      <div className="world-view"><Suspense fallback={<div className="scene-loading">Setting up your campsite…</div>}><Town state={state} reduced={reduced} zoom={1} avatarId={profile.avatarId} avatarName={profile.name} /></Suspense></div>
      <span className="simulation-note">Simulated money · {state.market.source === 'api' ? 'Historical market returns' : 'Sample returns'}</span>
    </section>
    {storyInPopup && <FullScreenPanel key={completed ? 'final-summary' : state.month === 3 ? 'medical-alert' : 'penthouse-options'} tone={completed ? 'summary' : state.month === 3 ? 'danger' : 'default'} eyebrow={completed ? 'YOUR FINAL SUMMARY · MONTH 6' : state.month === 3 ? 'UNEXPECTED EXPENSE · MONTH 3' : 'YOUR NEXT MOVE · MONTH 6'}>{storyContent}</FullScreenPanel>}
    {modal && <Modal title={fundInfo || accountInfo ? `${modal} · Learn More` : modal === 'how' ? 'How Investly works' : modal === 'profile' ? 'Edit your player' : modal === 'settings' ? 'Make yourself at home' : 'Two paths. A clearer picture.'} onClose={() => setModal(null)} wide={modal === 'compare'}>{fundInfo ? <><h3>{fundInfo.name}</h3><p className="modal-intro">{fundInfo.description}</p><p>{fundInfo.risk}. These are relative demo categories, not the issuer’s official risk rating.</p><p className="notice">Pitch illustration: {fundInfo.illustration} per year. This is not verified historical CAGR, a forecast, or the return used in your game.</p><p>Actual game changes come from the labelled monthly market sequence. All funds can lose value.</p><a href={fundInfo.url} target="_blank" rel="noreferrer">Read the fund issuer’s guide ↗</a></> : accountInfo ? <><p className="modal-intro">{accountInfo.description}</p><p>This is a simulated account. Real eligibility, contribution limits, and withdrawal rules apply.</p><a href={accountInfo.url} target="_blank" rel="noreferrer">Read the CRA account guide ↗</a></> : modal === 'how' ? <HowItWorks state={state} /> : modal === 'compare' ? <Compare state={state} previous={previous} /> : modal === 'profile' ? <ProfileEditor profile={profile} onSave={saveProfile} onCancel={() => setModal('settings')} /> : <div className="settings-list"><button onClick={() => setModal('profile')}><UserRound /><span><b>Change name or avatar</b><small>Customize your player</small></span><ChevronRight size={18} /></button>{storageUnavailable && <p className="fine-print">Changes last for this session; browser storage is unavailable.</p>}<button aria-pressed={sound} onClick={() => setSound(!sound)}><Volume2 /><span><b>Game sounds</b><small>Feedback with every choice</small></span><span className={`toggle ${sound ? 'on' : ''}`} /></button><button aria-pressed={quietMotion} onClick={() => setQuietMotion(!quietMotion)}><Sparkles /><span><b>Reduce motion</b><small>Pause idle motion and coin animations</small></span><span className={`toggle ${quietMotion ? 'on' : ''}`} /></button><p className="fine-print">Your system’s reduced-motion preference is always respected.</p></div>}</Modal>}
  </main></MotionConfig>;
}
