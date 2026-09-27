import story from './data/story.json';
import { sampleFeed } from './market';
import type { MarketFeed } from './market';
export type Sector = 'technology' | 'energy' | 'retail';
export type Effect = { kind: 'income' | 'save' | 'spend' | 'debt' | 'interest' | 'invest' | 'market' | 'goal' | 'repair' | 'sell'; amount: number; sector?: Sector };
export type Account = 'TFSA' | 'FHSA' | 'RRSP';
export type Goal = 'home' | 'car' | 'puppy';
export const GOALS = { home: { name: 'First Home', target: 40000 }, car: { name: 'Car', target: 12000 }, puppy: { name: 'Puppy', target: 2500 } };
export const ACCOUNTS: Record<Account, { description: string; url: string }> = {
  TFSA: { description: 'Flexible tax-advantaged investing.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html' },
  FHSA: { description: 'Designed to help save and invest toward a first home.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html' },
  RRSP: { description: 'Designed primarily for long-term retirement savings.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html' },
};
export type Entry = { month: number; label: string; cash: number; emergencySavings: number; debt: number; investments: number; netWorth: number; income: number; spending: number; interest: number; marketChange: number; contributed: number; withdrawn: number };
export type GameState = {
  version: 2; month: number; age: number; cash: number; emergencySavings: number; debt: number;
  holdings: { etf: number; stocks: number }; account: Account | null; goal: Goal | null;
  path: 'university' | 'work' | 'gap' | null; recurring: 'invest' | 'save' | 'debt' | 'split' | null;
  phase: 'choice' | 'account' | 'result' | 'goal' | 'complete'; pendingChoice: string | null;
  decisionHistory: { month: number; choice: string; title: string; explanation: string }[];
  explanation: string; effects: Effect[]; ledger: Entry[]; market: MarketFeed;
  totalIncome: number; totalSpending: number; totalInterest: number; totalMarketChange: number; totalContributed: number; totalWithdrawn: number;
  monthlyGrowth: number; monthlyContribution: number;
};
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
export const exactMoney = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
export const monthName = (n: number) => n === 0 ? 'Start' : `Month ${n}`;
export const portfolio = (s: GameState) => round(s.holdings.etf + s.holdings.stocks);
export const netWorth = (s: GameState) => round(s.cash + s.emergencySavings + portfolio(s) - s.debt);
export const goalProgress = (s: GameState) => s.goal ? Math.min(1, portfolio(s) / GOALS[s.goal].target) : 0;
// ETF districts are symbolic thirds, not additional holdings or a claim about ETF composition.
export const townSectors = (s: GameState): Record<Sector, number> => { const third = round(s.holdings.etf / 3); return { technology: round(third + s.holdings.stocks), energy: third, retail: round(s.holdings.etf - 2 * third) }; };
function record(s: GameState, label: string) {
  s.ledger.push({ month: s.month, label, cash: s.cash, emergencySavings: s.emergencySavings, debt: s.debt, investments: portfolio(s), netWorth: netWorth(s), income: s.totalIncome, spending: s.totalSpending, interest: s.totalInterest, marketChange: s.totalMarketChange, contributed: s.totalContributed, withdrawn: s.totalWithdrawn });
}
export function initialState(market: MarketFeed = sampleFeed): GameState {
  const s: GameState = { version: 2, month: 1, age: 18, cash: 1000, emergencySavings: 0, debt: 0, holdings: { etf: 0, stocks: 0 }, account: null, goal: null, path: null, recurring: null, phase: 'choice', pendingChoice: null, decisionHistory: [], explanation: 'Meet Maya, 18. Start with $1,000 and build your first financial plan.', effects: [], ledger: [], market: structuredClone(market), totalIncome: 0, totalSpending: 0, totalInterest: 0, totalMarketChange: 0, totalContributed: 0, totalWithdrawn: 0, monthlyGrowth: 0, monthlyContribution: 0 };
  record(s, 'Starting balances'); return s;
}
function income(s: GameState, amount: number) { s.cash = round(s.cash + amount); s.totalIncome = round(s.totalIncome + amount); s.effects.push({ kind: 'income', amount }); }
function spend(s: GameState, amount: number) { s.cash = round(s.cash - amount); s.totalSpending = round(s.totalSpending + amount); }
function save(s: GameState, amount: number) { s.cash = round(s.cash - amount); s.emergencySavings = round(s.emergencySavings + amount); s.effects.push({ kind: 'save', amount }); }
function payDebt(s: GameState, amount: number) { const paid = Math.min(s.debt, s.cash, amount); s.cash = round(s.cash - paid); s.debt = round(s.debt - paid); s.effects.push({ kind: 'spend', amount: paid }); return paid; }
function borrow(s: GameState, amount: number) { s.cash = round(s.cash + amount); s.debt = round(s.debt + amount); s.effects.push({ kind: 'debt', amount }); }
function invest(s: GameState, amount: number, holding: 'etf' | 'stocks' = 'etf') {
  s.cash = round(s.cash - amount); s.holdings[holding] = round(s.holdings[holding] + amount); s.totalContributed = round(s.totalContributed + amount); s.monthlyContribution = round(s.monthlyContribution + amount);
  if (holding === 'stocks') s.effects.push({ kind: 'invest', amount, sector: 'technology' });
  else { const third = round(amount / 3); (['technology', 'energy', 'retail'] as const).forEach((sector, i) => s.effects.push({ kind: 'invest', amount: i === 2 ? round(amount - 2 * third) : third, sector })); }
}
function settleBudget(s: GameState) {
  if (s.path === 'work') income(s, 400);
  if (s.path === 'university') income(s, 100);
  if (s.path === 'gap') { if (s.cash < 100) borrow(s, round(100 - s.cash)); spend(s, 100); s.effects.push({ kind: 'spend', amount: 100 }); }
}
export const repairShortfall = (s: GameState) => round(Math.max(0, 700 - s.emergencySavings - s.cash));
export const investmentAmount = (s: GameState) => Math.min(1000, s.cash);
export type Choice = { id: string; title: string; description: string };
export function choicesFor(s: GameState): Choice[] {
  if (s.phase === 'account') return (Object.keys(ACCOUNTS) as Account[]).map(id => ({ id, title: id, description: ACCOUNTS[id].description }));
  if (s.phase === 'goal') return (Object.keys(GOALS) as Goal[]).map(id => ({ id, title: GOALS[id].name, description: `${money(GOALS[id].target)} goal` }));
  if (s.phase !== 'choice') return [];
  if (s.month === 5) return repairShortfall(s) === 0 ? [{ id: 'repair', title: 'Cover the repair', description: `${money(Math.min(700, s.emergencySavings))} emergency fund + ${money(Math.max(0, 700 - s.emergencySavings))} cash` }] : [{ id: 'borrow', title: 'Borrow the shortfall', description: `${money(repairShortfall(s))} debt after using savings and cash` }, { id: 'sell', title: 'Sell investments', description: `Sell ${money(repairShortfall(s))} at today’s value` }];
  if (s.month > 6) return [{ id: 'advance', title: 'Keep my plan going', description: s.month === 12 ? 'Finish the year and choose a goal' : 'One month at a time' }];
  return story[s.month - 1].choices;
}
export function disabledReason(s: GameState, id: string): string | null {
  if (!choicesFor(s).some(c => c.id === id)) return 'Not available at this step';
  if ((id === 'etf' || id === 'stocks') && s.cash <= 0) return 'No cash available to invest';
  if (id === 'pay' && s.debt === 0) return 'You have no debt to pay';
  if (id === 'auto-debt' && s.debt === 0) return 'You have no debt to pay';
  if (id === 'sell' && portfolio(s) < repairShortfall(s)) return 'Not enough invested to cover the shortfall';
  if (['save', 'spend'].includes(id) && s.month === 2 && s.cash < 1000) return 'Needs $1,000 cash';
  if (['invest', 'emergency'].includes(id) && s.cash < 500) return 'Needs $500 cash';
  return null;
}
function needsAccount(id: string) { return ['open', 'etf', 'stocks', 'invest', 'auto-invest', 'auto-split'].includes(id); }
export function choose(state: GameState, id: string): GameState {
  const reason = disabledReason(state, id); if (reason) throw new Error(reason);
  const s = structuredClone(state);
  if (s.phase === 'goal') { s.goal = id as Goal; s.phase = 'complete'; s.explanation = `You’re building toward your ${GOALS[s.goal].name.toLowerCase()} goal one contribution at a time.`; s.effects = [{ kind: 'goal', amount: portfolio(s) }]; s.decisionHistory.push({ month: 12, choice: id, title: GOALS[s.goal].name, explanation: s.explanation }); record(s, 'Financial goal selected'); return s; }
  let accountOpened = false;
  if (s.phase === 'account') { s.account = id as Account; id = s.pendingChoice!; s.pendingChoice = null; s.phase = 'choice'; accountOpened = true; }
  else if (needsAccount(id) && !s.account) { s.phase = 'account'; s.pendingChoice = id; return s; }
  s.effects = [];
  let feedback = '';
  if (s.month === 1) {
    s.path = id as GameState['path'];
    if (id === 'university') { s.debt = 5000; s.totalSpending += 5000; s.effects.push({ kind: 'debt', amount: 5000 }); }
    settleBudget(s);
    feedback = id === 'university' ? 'Your $5,000 loan pays tuition. You have $100 left each month after essentials.' : id === 'work' ? 'Work starts now. You have $400 left each month after essentials.' : 'A little adventure, a tighter budget: your cash covers a $100 monthly shortfall.';
  } else if (s.month === 2) {
    if (id === 'save') { save(s, 1000); feedback = 'Your $1,000 gift is now an emergency cushion. Your home’s shield is up.'; }
    else if (id === 'spend') { spend(s, 1000); s.effects.push({ kind: 'spend', amount: 1000 }); feedback = 'Gift enjoyed! That $1,000 is spent, so future investing will use your remaining cash.'; }
    else feedback = 'Your $1,000 gift stays in cash until you choose an investment next month.';
  } else if (s.month === 3) {
    if (id === 'cash') feedback = 'Your money stays in cash: accessible, with no market gains or losses.';
    else { const amount = investmentAmount(s); invest(s, amount, id as 'etf' | 'stocks'); feedback = `Invested ${money(amount)} in ${id === 'etf' ? 'a diversified ETF' : 'one fictional company'}. Portfolio value: ${money(portfolio(s))}. Watch it change next month.`; }
  } else if (s.month === 4) {
    if (id === 'invest') { invest(s, 500); feedback = '$500 added to your ETF. More invested also means more exposed to market moves.'; }
    if (id === 'emergency') { save(s, 500); feedback = '$500 added to your emergency fund. Your home’s shield grows.'; }
    if (id === 'pay') feedback = `${exactMoney(payDebt(s, 500))} of debt paid off. Any unused bonus stays in cash.`;
  } else if (s.month === 5) {
    const fromSavings = Math.min(700, s.emergencySavings); const shortfall = repairShortfall(s);
    s.emergencySavings = round(s.emergencySavings - fromSavings); s.cash = round(s.cash + fromSavings);
    if (id === 'borrow') borrow(s, shortfall);
    if (id === 'sell') {
      let remaining = shortfall;
      for (const holding of ['etf', 'stocks'] as const) { const sold = Math.min(remaining, s.holdings[holding]); s.holdings[holding] = round(s.holdings[holding] - sold); remaining = round(remaining - sold); s.cash = round(s.cash + sold); s.effects.push({ kind: 'sell', amount: sold, sector: holding === 'etf' ? 'retail' : 'technology' }); }
      s.totalWithdrawn = round(s.totalWithdrawn + shortfall);
    }
    spend(s, 700); s.effects.push({ kind: 'repair', amount: fromSavings }, { kind: 'spend', amount: 700 - fromSavings });
    feedback = fromSavings === 700 ? 'Your emergency fund covered the repair. Your investments stayed untouched.' : `${money(fromSavings)} from your emergency fund + ${money(700 - fromSavings - shortfall)} cash covered the repair${shortfall ? `, plus ${money(shortfall)} ${id === 'sell' ? 'sold from investments' : 'borrowed'}` : ''}. ${id === 'sell' ? 'Selling reduced the money left invested.' : 'Your investments stayed untouched.'}`;
  } else if (s.month === 6) {
    s.recurring = id.replace('auto-', '') as GameState['recurring'];
    feedback = id === 'auto-invest' ? 'Recurring Investment Created: $100/month → ETF, starting Month 7.' : id === 'auto-save' ? '$100/month → emergency fund, starting Month 7.' : id === 'auto-debt' ? '$100/month → debt, starting Month 7. Once repaid, the money stays in cash.' : '$50/month → ETF + $50/month → emergency fund, starting Month 7.';
  } else feedback = monthlySummary(s);
  s.explanation = `${accountOpened ? `${s.account} opened. ` : ''}${feedback}`;
  s.phase = 'result';
  const title = s.month > 6 ? `Month ${s.month} · ${s.recurring || 'cash'} plan` : story[s.month - 1].choices.find(c => c.id === id)?.title || (id === 'repair' ? 'Cover the repair' : id === 'sell' ? 'Sell investments' : 'Borrow the shortfall');
  s.decisionHistory.push({ month: s.month, choice: id, title, explanation: s.explanation }); record(s, title); return s;
}
export function monthlySummary(s: GameState) { return `${monthName(s.month)}: ${exactMoney(s.monthlyContribution)} contributed. Market change ${s.monthlyGrowth >= 0 ? '+' : ''}${exactMoney(s.monthlyGrowth)}. Portfolio ${exactMoney(portfolio(s))}.`; }
export function continueGame(state: GameState): GameState {
  if (state.phase !== 'result') throw new Error('Finish this month first');
  const s = structuredClone(state);
  if (s.month === 12) { s.phase = 'goal'; s.effects = []; return s; }
  s.month++; s.phase = 'choice'; s.effects = []; s.monthlyContribution = 0; s.monthlyGrowth = 0;
  const rates = s.market.months[s.month - 1];
  for (const holding of ['etf', 'stocks'] as const) { const change = round(s.holdings[holding] * rates[holding]); s.holdings[holding] = round(s.holdings[holding] + change); s.monthlyGrowth = round(s.monthlyGrowth + change); }
  s.totalMarketChange = round(s.totalMarketChange + s.monthlyGrowth); s.effects.push({ kind: 'market', amount: s.monthlyGrowth });
  const interest = round(s.debt * 0.06 / 12); s.debt = round(s.debt + interest); s.totalInterest = round(s.totalInterest + interest); s.effects.push({ kind: 'interest', amount: interest });
  settleBudget(s);
  if (s.month === 2) income(s, 1000);
  if (s.month === 4) income(s, 500);
  if (s.month >= 7 && s.recurring) {
    income(s, 100);
    if (s.recurring === 'invest') invest(s, 100);
    if (s.recurring === 'save') save(s, 100);
    if (s.recurring === 'debt') payDebt(s, 100);
    if (s.recurring === 'split') { invest(s, 50); save(s, 50); }
  }
  s.explanation = `${monthlySummary(s)}${interest ? ` ${exactMoney(interest)} debt interest charged.` : ''}${s.month === 2 ? ' Your $1,000 gift arrived.' : s.month === 4 ? ' Your $500 bonus arrived.' : ''}`;
  record(s, 'Monthly update'); return s;
}
