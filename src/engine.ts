import story from './data/story.json';
import { sampleFeed } from './market';
import type { MarketFeed } from './market';
import { FUND_SYMBOLS, FUNDS, HOLDINGS, METHODS } from './investments';
import type { Fund, Holding } from './investments';
import { cadPrice, parseStockMarket, stockDate } from './stockData';
import type { StockPortfolio, StockMarket } from './stockData';
export type Sector = 'technology' | 'energy' | 'retail';
export type Effect = { kind: 'income' | 'save' | 'spend' | 'debt' | 'interest' | 'invest' | 'market' | 'goal' | 'repair' | 'sell'; amount: number; sector?: Sector };
export type Account = 'TFSA' | 'RRSP' | 'FHSA';
export const GOALS = { miami: { name: 'Miami penthouse', target: 1000000 } };
export const ACCOUNTS: Record<Account, { description: string; url: string }> = {
  TFSA: { description: 'Flexible tax-advantaged investing.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html' },
  FHSA: { description: 'Designed to help save and invest toward a first home.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html' },
  RRSP: { description: 'Designed primarily for long-term retirement savings.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html' },
};
export const RULES = { startingCash: 1000, emergencyDeposit: 200, medicalBill: 200, annualSalary: 30000, raise: 250, studentAPR: .06 };
export type Entry = { month: number; label: string; cash: number; savings: number; emergencySavings: number; debt: number; investments: number; netWorth: number; income: number; spending: number; interest: number; marketChange: number; contributed: number; withdrawn: number };
export type GameState = {
  version: 7; month: number; age: number; cash: number; savings: number; emergencySavings: number;
  studentDebt: number;
  holdings: Record<Holding, number>; account: Account | null; goal: 'miami' | null;
  path: 'university' | 'work' | null; recurring: 'invest' | 'savings' | null;
  selectedFund: Fund | null; method: string | null; reservedGift: number;
  phase: 'choice' | 'account' | 'method' | 'fund' | 'assistance' | 'penthouse' | 'result' | 'complete' | 'stock-loading' | 'stock-buy' | 'stock-hold' | 'stock-review'; pendingChoice: string | null;
  stock?: StockPortfolio | null; rentalSpending?: number;
  decisionHistory: { month: number; choice: string; title: string; explanation: string }[];
  explanation: string; effects: Effect[]; ledger: Entry[]; market: MarketFeed;
  totalIncome: number; totalSpending: number; totalInterest: number; totalMarketChange: number; totalContributed: number; totalWithdrawn: number;
  monthlyGrowth: number; monthlyContribution: number;
};
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const cadFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const exactMoney = (n: number) => cadFormat.format(n);
export const money = exactMoney;
export function stockPerformance(investment: Pick<StockPortfolio, 'contributed' | 'value' | 'proceeds'>) {
  const value = investment.proceeds ?? investment.value;
  const profit = round(value - investment.contributed);
  // Contributions buy units at their own CAD price; value already reflects those units.
  // Divide by this investment's contributions, not the whole portfolio or initial price.
  return { value, profit, percent: investment.contributed > 0 ? profit / investment.contributed * 100 : 0 };
}
export const monthName = (n: number) => n === 0 ? 'Start' : `Month ${n}`;
export const portfolio = (s: GameState) => round(HOLDINGS.reduce((sum, symbol) => sum + s.holdings[symbol], 0) + (s.stock?.value || 0));
export const totalDebt = (s: GameState) => s.studentDebt;
export const netWorth = (s: GameState) => round(s.cash + s.savings + s.emergencySavings + portfolio(s) - totalDebt(s));
export const penthouseRentalCost = (s: GameState) => s.cash;
export const goalFunds = (s: GameState) => round(s.cash + s.savings + portfolio(s));
export const penthouseShortfall = (s: GameState) => round(Math.max(0, GOALS.miami.target - goalFunds(s)));
export const homeUpgradeUnlocked = (s: GameState) => s.account === 'TFSA' || s.decisionHistory.some(decision => decision.choice === 'raise-invest');
export const goalProgress = (s: GameState) => s.goal ? Math.min(1, goalFunds(s) / GOALS[s.goal].target) : 0;
// Three districts visualize fund exposure; they are not extra holdings.
export const townSectors = (s: GameState): Record<Sector, number> => ({ technology: round(s.holdings.QQQ + s.holdings.BIZTECH), energy: s.holdings.VAB, retail: s.holdings.XUS });
const sectorFor = (symbol: Holding): Sector => symbol === 'VAB' ? 'energy' : symbol === 'XUS' ? 'retail' : 'technology';
function record(s: GameState, label: string) {
  s.ledger.push({ month: s.month, label, cash: s.cash, savings: s.savings, emergencySavings: s.emergencySavings, debt: totalDebt(s), investments: portfolio(s), netWorth: netWorth(s), income: s.totalIncome, spending: s.totalSpending, interest: s.totalInterest, marketChange: s.totalMarketChange, contributed: s.totalContributed, withdrawn: s.totalWithdrawn });
}
export function initialState(market: MarketFeed = sampleFeed): GameState {
  const s: GameState = { version: 7, month: 1, age: 18, cash: RULES.startingCash, savings: 0, emergencySavings: 0, studentDebt: 0, holdings: { VAB: 0, XUS: 0, QQQ: 0, BIZTECH: 0 }, account: null, goal: null, path: null, recurring: null, selectedFund: null, method: null, reservedGift: 0, phase: 'choice', pendingChoice: null, decisionHistory: [], explanation: 'You’re 18, with CA$1,000.00 and a whole lot of choices ahead.', effects: [], ledger: [], market: structuredClone(market), totalIncome: 0, totalSpending: 0, totalInterest: 0, totalMarketChange: 0, totalContributed: 0, totalWithdrawn: 0, monthlyGrowth: 0, monthlyContribution: 0 };
  record(s, 'Starting balances'); return s;
}
function income(s: GameState, amount: number) { s.cash = round(s.cash + amount); s.totalIncome = round(s.totalIncome + amount); s.effects.push({ kind: 'income', amount }); }
function save(s: GameState, amount: number, emergency = false) {
  s.cash = round(s.cash - amount); const key = emergency ? 'emergencySavings' : 'savings'; s[key] = round(s[key] + amount); s.effects.push({ kind: emergency ? 'save' : 'goal', amount });
}
function spend(s: GameState, amount: number) { s.cash = round(s.cash - amount); s.totalSpending = round(s.totalSpending + amount); s.effects.push({kind:'spend', amount}); }
function invest(s: GameState, amount: number, symbol: Holding) {
  s.cash = round(s.cash - amount); s.holdings[symbol] = round(s.holdings[symbol] + amount); s.totalContributed = round(s.totalContributed + amount); s.monthlyContribution = round(s.monthlyContribution + amount); s.effects.push({ kind: 'invest', amount, sector: sectorFor(symbol) });
}
function rebalance(s: GameState, target: Fund) {
  const amount = portfolio(s);
  if (amount === 0) { const contribution = Math.min(s.cash, 1000); invest(s, contribution, target); s.selectedFund = target; return contribution; }
  for (const symbol of HOLDINGS) { if (symbol !== target) s.effects.push({kind:'sell',amount:s.holdings[symbol],sector:sectorFor(symbol)}); s.holdings[symbol] = 0; }
  s.holdings[target] = amount; s.selectedFund = target; s.effects.push({kind:'invest', amount, sector:sectorFor(target)}); return amount;
}
function finishChoice(s: GameState, id: string, explanation: string, title?: string) {
  s.phase = 'result'; s.pendingChoice = null; s.explanation = explanation;
  const label = title || story[s.month - 1].choices.find(c => c.id === id)?.title || id;
  s.decisionHistory.push({month:s.month,choice:id,title:label,explanation}); record(s, label); return s;
}
export type Choice = { id: string; title: string; description: string };
export function choicesFor(s: GameState): Choice[] {
  if (s.phase.startsWith('stock-') && s.stock?.contributed && s.stock.proceeds === null) return [
    ...(s.stock.point < 2 ? [{ id: 'advance-stock', title: 'See next update', description: `See your investments on ${s.stock.stocks[0].prices[s.stock.point + 1].date}.` }] : []),
    { id: 'cash-out-stock', title: 'Cash out and rent a Miami penthouse', description: 'Sell these investments, then review the rental cost.' },
    { id: 'finish-stock', title: 'Keep investments and finish', description: 'See your results with your money still invested.' },
  ];
  if (s.phase.startsWith('stock-')) return [];
  if (s.phase === 'penthouse') return [
    {id:'rent-penthouse',title:'Rent a penthouse to larp and sell a course',description:`${money(penthouseRentalCost(s))} for a one-day shoot · uses all your cash · no guaranteed sales`},
    {id:'keep-grinding',title:'Keep grinding',description:s.stock ? 'Keep your sale proceeds in cash and skip the rental' : 'Keep your investments and your CA$250.00/month habit'}
  ];
  if (s.phase === 'account') return (['TFSA','RRSP','FHSA'] as Account[]).map(id => ({id,title:id,description:ACCOUNTS[id].description}));
  if (s.phase === 'method') return METHODS.map(({id,title,description}) => ({id,title,description}));
  if (s.phase === 'fund') return FUND_SYMBOLS.map(id => ({id,title:id,description:FUNDS[id].risk}));
  if (s.phase === 'assistance') return [{id:'ask-mom',title:'Call Mom to ask for money :(',description:'Ask for CA$200.00 to cover the bill'}];
  return s.phase === 'choice' ? story[s.month - 1].choices : [];
}
export function disabledReason(s: GameState, id: string): string | null {
  if (!choicesFor(s).some(c => c.id === id)) return 'Not available at this step';
  if (id === 'rent-penthouse' && s.cash <= 0) return 'No cash available for the rental';
  if (id === 'save-emergency' && s.cash < RULES.emergencyDeposit) return 'Not enough cash to set aside CA$200.00';
  if (['biztech','birthday-savings'].includes(id) && s.cash < 1000) return 'Needs CA$1,000.00 cash';
  if (id === 'lower-risk' && s.cash < .01) return 'No cash available to invest';
  if (id === 'higher-risk' && portfolio(s) + s.cash <= 0) return 'No money available to invest';
  return null;
}
export function choose(state: GameState, id: string): GameState {
  const reason = disabledReason(state,id); if (reason) throw new Error(reason);
  const s = structuredClone(state); s.effects = [];
  if (id === 'advance-stock') return advanceStock(s);
  if (id === 'finish-stock') {
    finishChoice(s, 'lower-risk', stockResult(s), 'Stock investments'); s.phase = 'complete'; return s;
  }
  if (id === 'cash-out-stock' && s.stock) {
    const proceeds = s.stock.value;
    s.cash = round(s.cash + proceeds); s.stock.proceeds = proceeds; s.stock.value = 0;
    for (const holding of s.stock.stocks) { holding.proceeds = holding.value; holding.value = 0; holding.units = 0; }
    s.totalWithdrawn = round(s.totalWithdrawn + proceeds); s.effects.push({ kind: 'sell', amount: proceeds });
    s.goal = 'miami'; s.phase = 'penthouse';
    s.explanation = `You sold your stock investments for ${exactMoney(proceeds)} on ${stockDate(s.stock)}. Your cash is ${exactMoney(s.cash)}. The one-day rental costs ${exactMoney(penthouseRentalCost(s))}, using all of that cash. Confirm the rental or keep your cash.`;
    record(s, 'Stock sold; rental not yet confirmed'); return s;
  }
  if (s.phase === 'penthouse') {
    if (id === 'rent-penthouse') {
      const rentalCost = penthouseRentalCost(s);
      spend(s, rentalCost);
      s.rentalSpending = round((s.rentalSpending || 0) + rentalCost);
      finishChoice(s,id,`Penthouse for a day! You spent ${money(rentalCost)} on a rental to film your course. Course revenue so far: CA$0.00. Looking rich costs money; sales aren’t guaranteed. Your cash is now CA$0.00. Savings and investments stayed untouched.`, 'Miami: rent a penthouse and sell a course');
    } else if (s.stock) {
      finishChoice(s,id,`${stockResult(s)} You kept your sale proceeds in cash and spent nothing on a rental.`, 'Keep stock sale proceeds');
    } else {
      finishChoice(s,id,'Keep grinding. Your portfolio stays invested and your CA$250.00/month contribution plan continues. The penthouse can wait; returns are never guaranteed.', 'Miami: keep grinding');
    }
    s.phase = 'complete'; return s;
  }
  if (s.phase === 'account') {
    s.account = id as Account;
    const homeReward = s.account === 'TFSA' ? ' Home upgraded! Opening your TFSA unlocked a house for your character.' : '';
    if (s.pendingChoice === 'open') { s.reservedGift = 1000; return finishChoice(s,'open',`${s.account} opened. Your CA$1,000.00 gift stays in cash, ready for the investing step.${homeReward}`, `Open ${s.account}`); }
    s.phase = 'fund'; s.explanation = `${s.account} opened. ${METHODS.find(m=>m.id===s.method)!.feedback}${homeReward}`; return s;
  }
  if (s.phase === 'method') { s.method = id; s.pendingChoice = 'raise-invest'; s.phase = s.account ? 'fund' : 'account'; s.explanation = METHODS.find(m=>m.id===id)!.feedback; return s; }
  if (s.phase === 'fund') {
    s.selectedFund = id as Fund; s.recurring = 'invest';
    const amount = Math.min(s.cash, s.reservedGift + RULES.raise); s.reservedGift = 0; invest(s, amount, s.selectedFund);
    return finishChoice(s,'raise-invest',`${money(amount)} invested in ${id}${amount > RULES.raise ? ' using your birthday gift and raise' : ' from your raise'}. Your recurring plan adds CA$250.00/month. Your next market update can be positive or negative.${homeUpgradeUnlocked(state) ? '' : ' Home upgraded! Investing your raise unlocked a house for your character.'}`, `Invest via ${METHODS.find(m=>m.id===s.method)?.title || 'ETF'} → ${id}`);
  }
  if (s.month === 1) {
    s.path = id as 'university' | 'work';
    if (id === 'university') { s.studentDebt = 5000; s.totalSpending += 5000; s.effects.push({kind:'debt',amount:5000}); income(s,100); }
    else income(s,400);
    return finishChoice(s,id,id === 'work' ? 'You landed a job as a BizTech mascot! Salary: CA$30,000.00/year. This demo leaves CA$400.00/month after taxes and essentials.' : 'Uni it is! A CA$5,000.00 student loan covers tuition. Part-time work leaves CA$100.00/month after essentials.');
  }
  if (s.month === 2) {
    if (id === 'save-emergency') save(s,RULES.emergencyDeposit,true);
    return finishChoice(s,id,id === 'save-emergency' ? 'CA$200.00 moved into your emergency fund. You have a cushion for life’s surprises.' : 'You kept the CA$200.00 in cash. Your emergency fund is still empty.');
  }
  if (s.month === 3) {
    if (id === 'use-emergency' && s.emergencySavings < RULES.medicalBill) { s.phase = 'assistance'; s.explanation = 'You don’t have enough in your emergency fund! Time to call Mom.'; return s; }
    if (id === 'ask-mom') { income(s,RULES.medicalBill); save(s,RULES.medicalBill,true); }
    s.emergencySavings = round(s.emergencySavings - RULES.medicalBill); s.cash = round(s.cash + RULES.medicalBill); spend(s,RULES.medicalBill); s.effects.push({kind:'repair',amount:RULES.medicalBill});
    return finishChoice(s,id,id === 'ask-mom' ? 'Mom gave you CA$200.00 of emergency money, and it covered the medical bill. A gift, not a loan. Next time, your own cushion could help.' : 'Your emergency fund covered the CA$200.00 bill. No debt, no selling investments, no awkward phone call.');
  }
  if (s.month === 4) {
    if (id === 'open') { s.phase = 'account'; s.pendingChoice = id; return s; }
    if (id === 'biztech') { invest(s,1000,'BIZTECH'); return finishChoice(s,id,'You bought CA$1,000.00 of BizTech, a demo company, in an unregistered demo portfolio. One company means concentrated risk.'); }
    save(s,1000); return finishChoice(s,id,'Your CA$1,000.00 gift is in general savings. It stays separate from your emergency fund and out of the market.');
  }
  if (s.month === 6) {
    if (id === 'lower-risk') {
      s.phase = 'stock-loading';
      s.explanation = 'Choose companies to invest in with fictional money. Individual stocks can lose value.';
      return s;
    }
    if (id === 'penthouse') {
      s.goal = 'miami'; s.phase = 'penthouse';
      s.explanation = `You only have ${exactMoney(goalFunds(s))} across cash, savings, and investments, which is ${exactMoney(penthouseShortfall(s))} short of a CA$1,000,000.00 penthouse. But you have a few options.`;
      return s;
    }
    const fund = id === 'higher-risk' ? 'QQQ' : 'VAB'; const amount = rebalance(s,fund);
    return finishChoice(s,id,`${exactMoney(amount)} is now invested in ${fund}. ${fund === 'QQQ' ? 'More concentrated exposure can mean bigger swings. Higher returns are never guaranteed.' : 'Bond exposure lowers risk in this demo, but its value can still fall.'}`);
  }
  throw new Error('Unknown story step');
}

export function loadStock(state: GameState, data: StockMarket): GameState {
  if (state.phase !== 'stock-loading') throw new Error('Not choosing a stock');
  const market = parseStockMarket(data);
  const s = structuredClone(state);
  s.stock = { stocks: market.stocks.map(stock => ({ ...stock, units: 0, contributed: 0, value: 0, proceeds: null })), point: 0, contributed: 0, value: 0, proceeds: null };
  s.phase = 'stock-buy'; return s;
}

export function buyStock(state: GameState, amount: number, symbol: string): GameState {
  if (!['stock-buy', 'stock-hold', 'stock-review'].includes(state.phase) || !state.stock || state.stock.proceeds !== null) throw new Error('Not accepting a contribution');
  if (!Number.isFinite(amount) || amount < .01 || Math.abs(round(amount) - amount) > 1e-8 || amount > state.cash) throw new Error('Enter an amount in cents within your available cash.');
  const s = structuredClone(state); const stock = s.stock!; s.effects = [];
  const holding = stock.stocks.find(h => h.symbol === symbol);
  if (!holding) throw new Error('Choose an available stock.');
  const price = holding.prices[stock.point];
  holding.units += amount / cadPrice(price);
  holding.contributed = round(holding.contributed + amount); holding.value = round(holding.value + amount);
  stock.contributed = round(stock.contributed + amount); stock.value = round(stock.value + amount);
  s.cash = round(s.cash - amount); s.totalContributed = round(s.totalContributed + amount);
  s.effects.push({ kind: 'invest', amount });
  s.explanation = `${exactMoney(amount)} invested in ${holding.company} (${holding.symbol}) on ${price.date}.`;
  record(s, `Invest in ${holding.symbol}`);
  s.phase = 'stock-hold'; return s;
}

function advanceStock(s: GameState): GameState {
  const stock = s.stock!;
  if (!stock || stock.proceeds !== null || stock.point >= 2) throw new Error('Invalid historical step');
  const before = stock.value; stock.point++;
  for (const holding of stock.stocks) holding.value = round(holding.units * cadPrice(holding.prices[stock.point]));
  stock.value = round(stock.stocks.reduce((total, holding) => total + holding.value, 0));
  const change = round(stock.value - before);
  s.totalMarketChange = round(s.totalMarketChange + change); s.effects.push({ kind: 'market', amount: change });
  s.explanation = stockResult(s);
  s.phase = 'stock-review'; record(s, `Stock update: ${stockDate(stock)}`);
  return s;
}

export function stockResult(s: GameState): string {
  const stock = s.stock;
  if (!stock) return '';
  const profit = round((stock.proceeds ?? stock.value) - stock.contributed);
  return `You invested ${exactMoney(stock.contributed)} and ${profit < 0 ? 'lost' : 'gained'} ${exactMoney(Math.abs(profit))} from ${stock.stocks[0].prices[0].date} to ${stockDate(stock)}.`;
}

export function monthlySummary(s: GameState) { return `${monthName(s.month)}: ${exactMoney(s.monthlyContribution)} contributed; market change ${s.monthlyGrowth >= 0 ? '+' : ''}${exactMoney(s.monthlyGrowth)}; portfolio ${exactMoney(portfolio(s))}.`; }
export function continueGame(state: GameState): GameState {
  if (state.phase !== 'result') throw new Error('Finish this decision first');
  const s = structuredClone(state);
  if (s.month === story.length) { s.phase = 'complete'; return s; }
  s.month++; s.phase = s.month === 5 ? 'method' : 'choice'; s.effects = []; s.monthlyContribution = 0; s.monthlyGrowth = 0;
  const rates = s.market.months[s.month - 1];
  for (const symbol of HOLDINGS) { const change = round(s.holdings[symbol] * rates[symbol]); s.holdings[symbol] = round(s.holdings[symbol] + change); s.monthlyGrowth = round(s.monthlyGrowth + change); }
  s.totalMarketChange = round(s.totalMarketChange + s.monthlyGrowth); s.effects.push({kind:'market',amount:s.monthlyGrowth});
  const interest = round(s.studentDebt * RULES.studentAPR / 12);
  s.studentDebt = round(s.studentDebt + interest); s.totalInterest = round(s.totalInterest + interest); s.effects.push({kind:'interest',amount:interest});
  income(s,s.path === 'work' ? 400 : 100);
  if (s.month === 4) income(s,1000);
  if (s.month >= 5) {
    income(s,RULES.raise);
    if (s.month > 5 && s.recurring) {
      if (s.recurring === 'invest' && s.selectedFund) invest(s,RULES.raise,s.selectedFund);
      else save(s,RULES.raise);
    }
  }
  s.explanation = `${monthlySummary(s)}${interest ? ` ${exactMoney(interest)} interest charged.` : ''}${s.month === 4 ? ' Your CA$1,000.00 birthday gift arrived.' : ''}`;
  record(s,'Monthly update'); return s;
}
