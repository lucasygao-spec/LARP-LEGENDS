import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choose, choicesFor, continueGame, disabledReason, initialState, netWorth, portfolio, round, totalDebt, goalFunds, penthouseShortfall, penthouseRentalCost, homeUpgradeUnlocked, loadStock, buyStock, stockResult, stockPerformance, exactMoney, money } from './engine';
import { parseStockScenario, parseStockMarket } from './stockData';
import stockFixture from '../tests/fixtures/stock-scenario.json';
import type { GameState } from './engine';
import { loadMarketFeed, parseMarketFeed, sampleFeed } from './market';
import { HOLDINGS, METHODS } from './investments';
const stockMarket = parseStockMarket(stockFixture);
function stockStart() { return loadStock(choose(play(main.slice(0,5)), 'lower-risk'), stockMarket); }
function check(s: GameState) {
  for (const e of s.ledger) {
    assert.equal(e.netWorth, round(1000 + e.income - e.spending - e.interest + e.marketChange), `Reconcile M${e.month}: ${e.label}`);
    assert.equal(e.netWorth, round(e.cash + e.savings + e.emergencySavings + e.investments - e.debt));
    assert.equal(e.investments, round(e.contributed + e.marketChange - e.withdrawn));
    for (const value of [e.cash,e.savings,e.emergencySavings,e.debt,e.investments]) assert.ok(Number.isFinite(value) && value >= 0);
  }
  assert.equal(portfolio(s), round(s.totalContributed + s.totalMarketChange - s.totalWithdrawn));
}
function finishDecision(s: GameState, id: string, account = 'TFSA', fund = 'QQQ') {
  let next = choose(s,id);
  if(next.phase === 'assistance') next = choose(next,'ask-mom');
  if(next.phase === 'account') next = choose(next,account);
  if(next.phase === 'fund') next = choose(next,fund);
  check(next); return next;
}
function play(ids: string[]) { return ids.reduce((s,id)=>continueGame(finishDecision(s,id)), initialState()); }
const main = ['work','skip-emergency','use-emergency','open','one-etf','higher-risk'];
test('initial balances and distinct starting paths are immutable',()=>{
  const s = initialState(); assert.equal(s.cash,1000); assert.equal(s.age,18); assert.equal(s.month,1); assert.equal(netWorth(s),1000); assert.equal(totalDebt(s),0);
  const work=choose(s,'work'); const uni=choose(s,'university'); assert.equal(work.cash,1400); assert.equal(uni.cash,1100); assert.equal(uni.studentDebt,5000); assert.equal(s.cash,1000); check(work); check(uni);
});

test('all displayed amounts use explicit CAD and two decimal places', () => {
  assert.equal(exactMoney(123.45), 'CA$123.45'); assert.equal(money(1000), 'CA$1,000.00');
  assert.equal(exactMoney(-168), '-CA$168.00');
});

test('several stocks, repeated contributions, and historical FX reconcile to the cent', () => {
  const loaded = stockStart(); const baseline = netWorth(loaded);
  const first = buyStock(loaded, 1000, 'FIX');
  const second = buyStock(first, 500, 'BETA');
  assert.equal(second.cash, 1900); assert.equal(second.stock!.value, 1500);
  assert.equal(second.stock!.stocks[0].units, 8); assert.equal(second.stock!.stocks[1].units, 8);
  assert.ok(homeUpgradeUnlocked(second)); assert.deepEqual(second.holdings, loaded.holdings);
  const review = choose(second, 'advance-stock');
  assert.equal(review.stock!.stocks[0].value, 832); assert.equal(review.stock!.stocks[1].value, 780);
  assert.equal(review.stock!.value, 1612);
  assert.deepEqual(stockPerformance(review.stock!.stocks[0]), { value: 832, profit: -168, percent: -16.8 });
  assert.equal(stockPerformance(review.stock!.stocks[1]).profit, 280);
  assert.equal(stockPerformance(review.stock!.stocks[1]).percent.toFixed(2), '56.00');
  assert.equal(stockPerformance(review.stock!).percent.toFixed(2), '7.47', 'overall return is weighted by contributions, not an average of percentages');
  const added = buyStock(review, 520, 'FIX');
  assert.equal(stockPerformance(added.stock!.stocks[0]).profit, -168, 'new contributions are not gains');
  assert.equal(stockPerformance(added.stock!.stocks[0]).percent.toFixed(2), '-11.05');
  const third = buyStock(added, 234, 'GAMMA');
  assert.equal(third.stock!.point, 1, 'contributions do not advance the price date');
  assert.equal(third.stock!.contributed, 2254);
  const later = choose(third, 'advance-stock');
  assert.equal(later.stock!.value, 2825); assert.equal(later.cash, 1146);
  assert.deepEqual(later.stock!.stocks.map(h => {
    const result = stockPerformance(h);
    return [h.contributed, result.value, result.profit, result.percent.toFixed(2)];
  }), [[1520, 1950, 430, '28.29'], [500, 600, 100, '20.00'], [234, 275, 41, '17.52']]);
  assert.equal(stockPerformance(later.stock!).percent.toFixed(2), '25.33');
  assert.equal(netWorth(later), baseline + 571);
  assert.throws(() => choose(later, 'advance-stock'));
  const end = choose(later, 'finish-stock');
  assert.equal(end.phase, 'complete'); assert.match(stockResult(end), /gained CA\$571.00/);
  assert.equal(end.rentalSpending || 0, 0);
  for (const s of [loaded,first,second,review,added,third,later,end]) check(s);
});

test('cash-out sells every chosen stock once; rental confirmation is separate from returns', () => {
  const start = stockStart();
  const review = choose(buyStock(buyStock(start, 1000, 'FIX'), 500, 'BETA'), 'advance-stock');
  const offer = choose(review, 'cash-out-stock');
  assert.equal(offer.phase, 'penthouse'); assert.equal(offer.cash, 3512);
  assert.equal(offer.stock!.proceeds, 1612); assert.equal(offer.stock!.value, 0);
  assert.equal(offer.totalWithdrawn - start.totalWithdrawn, 1612);
  assert.ok(offer.stock!.stocks.every(h => h.units === 0 && h.value === 0));
  assert.equal(offer.totalSpending, start.totalSpending);
  assert.ok(!offer.decisionHistory.some(d => d.choice === 'rent-penthouse'));
  assert.throws(() => choose(offer,'cash-out-stock')); assert.throws(() => buyStock(offer,10,'FIX'));
  const rented = choose(offer,'rent-penthouse');
  assert.equal(rented.cash,0); assert.equal(rented.rentalSpending,3512);
  assert.equal(rented.stock!.proceeds,1612); assert.match(stockResult(rented),/gained CA\$112.00/);
  assert.deepEqual(stockPerformance(rented.stock!), stockPerformance(review.stock!));
  assert.deepEqual(rented.stock!.stocks.map(stockPerformance), review.stock!.stocks.map(stockPerformance), 'selling and renting preserve each company return');
  assert.equal(netWorth(rented),1600);
  const declined = choose(offer,'keep-grinding'); assert.equal(declined.cash,3512);
  for(const s of [review,offer,rented,declined]) check(s);
});

test('losses and no-cash portfolios remain playable without overspending', () => {
  const loaded = stockStart();
  for(const amount of [NaN,Infinity,-1,0,.001,1.001,loaded.cash+.01]) assert.throws(()=>buyStock(loaded,amount,'FIX'));
  assert.throws(()=>buyStock(loaded,100,'UNKNOWN')); assert.equal(loaded.cash,3400);
  const spent = buyStock(loaded,loaded.cash,'FIX');
  assert.equal(spent.cash,0); assert.throws(()=>buyStock(spent,.01,'BETA'));
  const review = choose(spent,'advance-stock'); assert.ok(review.stock!.value < review.stock!.contributed);
  const sold = choose(review,'cash-out-stock'); assert.ok(sold.cash > 0); assert.match(stockResult(sold),/lost CA\$/);
  check(spent); check(review); check(sold);
});

test('rejects missing stocks, duplicates, mismatched dates/FX, future dates and invalid prices', () => {
  assert.throws(()=>parseStockMarket({...stockFixture,stocks:[]}));
  assert.throws(()=>parseStockMarket({...stockFixture,stocks:[stockFixture.stocks[0]]}));
  assert.throws(()=>parseStockMarket({...stockFixture,stocks:[stockFixture.stocks[0],stockFixture.stocks[0]]}));
  for (const patch of [{close:0},{fx:NaN},{date:'2099-01-01'},{date:'2025-07-01'},{date:'2025-02-30'}]) {
    const invalid=structuredClone(stockFixture.stocks[0]); Object.assign(invalid.prices[0],patch);
    assert.throws(()=>parseStockScenario(invalid));
  }
  for(const patch of [{date:'2025-01-03'},{fx:1.5}]) {
    const invalid=structuredClone(stockFixture); Object.assign(invalid.stocks[1].prices[0],patch);
    assert.throws(()=>parseStockMarket(invalid));
  }
});
test('emergency fund covers medical costs without touching savings or investments',()=>{
  const m3=play(['work','save-emergency']); const result=choose(m3,'use-emergency'); assert.equal(result.emergencySavings,0); assert.equal(result.cash,m3.cash); assert.equal(totalDebt(result),0); assert.match(result.explanation,/covered the CA\$200\.00 bill/); check(result);
});
test('empty emergency fund opens the Mom alternative without advancing time or fabricating savings',()=>{
  const m3=play(['work','skip-emergency']); const attempt=choose(m3,'use-emergency'); assert.equal(attempt.phase,'assistance'); assert.equal(attempt.month,3); assert.equal(attempt.cash,m3.cash); assert.equal(attempt.decisionHistory.length,2);
  const result=choose(attempt,'ask-mom'); assert.equal(result.emergencySavings,0); assert.equal(result.totalIncome,m3.totalIncome+200); assert.equal(result.totalSpending,m3.totalSpending+200); assert.equal(netWorth(result),netWorth(m3)); check(result);
});
test('birthday gift arrives once; all account substeps stay in the same month',()=>{
  const m4=play(['work','save-emergency','use-emergency']);
  for(const account of ['TFSA','RRSP','FHSA']) { const pending=choose(m4,'open'); const opened=choose(pending,account); assert.equal(opened.month,4); assert.equal(opened.cash,m4.cash); assert.equal(opened.account,account); assert.equal(opened.reservedGift,1000); assert.throws(()=>choose(opened,account)); check(opened); }
  const saved=choose(m4,'birthday-savings'); assert.equal(saved.savings,1000); assert.equal(saved.emergencySavings,0); assert.equal(saved.cash,m4.cash-1000); check(saved);
  const biz=choose(m4,'biztech'); assert.equal(biz.holdings.BIZTECH,1000); assert.equal(biz.cash,m4.cash-1000); assert.equal(biz.account,null); check(biz);
});
test('all four methods lead to a funded ETF without duplicate gift or raise deposits',()=>{
  const m5=play(['work','skip-emergency','ask-mom','open']);
  for(const method of METHODS) for(const fund of ['VAB','XUS','QQQ']) {
    const result=finishDecision(m5,method.id,'TFSA',fund); assert.equal(result.month,5); assert.equal(result.holdings[fund as 'QQQ'],1250); assert.equal(result.cash,m5.cash-1250); assert.equal(result.method,method.id); assert.equal(result.totalContributed,1250); assert.equal(result.decisionHistory.length,5); check(result);
  }
});
test('late account opening invests only the raise when birthday money was already allocated',()=>{
  const m5=play(['work','save-emergency','use-emergency','biztech']); const result=finishDecision(m5,'advisor','FHSA','XUS'); assert.equal(result.account,'FHSA'); assert.equal(result.holdings.XUS,250); assert.equal(result.totalContributed,1250); check(result);
});
test('gains and downturns come from holdings, before new contributions; rebalancing is not a contribution',()=>{
  const m6=play(main.slice(0,5)); assert.equal(m6.monthlyGrowth,100); assert.equal(m6.holdings.QQQ,1600); assert.equal(m6.totalContributed,1500);
  const high=finishDecision(m6,'higher-risk'); assert.equal(high.holdings.QQQ,1600); assert.equal(high.totalContributed,1500); assert.equal(high.totalWithdrawn,0); assert.equal(netWorth(high),netWorth(m6));
  const final=continueGame(high); assert.equal(final.phase,'complete'); assert.equal(final.month,6); assert.equal(final.holdings.QQQ,1600); assert.equal(final.totalIncome,high.totalIncome); assert.deepEqual(final.ledger,high.ledger); check(final);
});
test('penthouse shortfall uses available assets and preserves balances until an ending is chosen',()=>{
  const m6=play(main.slice(0,5)); const offer=choose(m6,'penthouse');
  assert.equal(offer.phase,'penthouse'); assert.equal(offer.goal,'miami'); assert.equal(offer.month,6);
  assert.equal(goalFunds(offer),5000); assert.equal(penthouseShortfall(offer),995000);
  assert.equal(portfolio(offer),1600); assert.equal(netWorth(offer),netWorth(m6));
  assert.equal(offer.decisionHistory.length,5); assert.deepEqual(offer.ledger,m6.ledger);
  assert.throws(()=>continueGame(offer)); assert.throws(()=>choose(offer,'penthouse')); check(offer);
});
test('rental ending charges once, invents no course income, and completes without another month',()=>{
  const offer=choose(play(main.slice(0,5)),'penthouse'); const end=choose(offer,'rent-penthouse');
  assert.equal(end.phase,'complete'); assert.equal(end.month,6); assert.equal(end.decisionHistory.length,6);
  assert.equal(end.cash,0); assert.equal(end.totalSpending,offer.totalSpending+penthouseRentalCost(offer));
  assert.equal(end.totalIncome,offer.totalIncome); assert.equal(netWorth(end),netWorth(offer)-offer.cash);
  assert.deepEqual(end.holdings,offer.holdings); assert.equal(penthouseShortfall(end),998400);
  assert.throws(()=>choose(end,'rent-penthouse')); assert.throws(()=>continueGame(end)); check(end);
});
test('keep grinding preserves money and recurring investing in the final summary',()=>{
  const offer=choose(play(main.slice(0,5)),'penthouse'); const end=choose(offer,'keep-grinding');
  assert.equal(end.phase,'complete'); assert.equal(end.month,6); assert.equal(end.decisionHistory.length,6);
  assert.equal(end.cash,offer.cash); assert.equal(netWorth(end),netWorth(offer)); assert.equal(end.recurring,'invest');
  assert.equal(end.totalIncome,offer.totalIncome); assert.deepEqual(end.holdings,offer.holdings); check(end);
});
test('rental price matches cash without spending savings or selling investments',()=>{
  const offer=choose(play(['work','save-emergency','use-emergency','birthday-savings','one-etf']),'penthouse');
  const lowCash={...offer,cash:100}; const rented=choose(lowCash,'rent-penthouse');
  assert.equal(rented.cash,0); assert.equal(rented.savings,offer.savings); assert.equal(rented.emergencySavings,offer.emergencySavings);
  const broke={...offer,cash:0,savings:0,emergencySavings:1000};
  assert.ok(disabledReason(broke,'rent-penthouse')); assert.throws(()=>choose(broke,'rent-penthouse'));
  assert.equal(disabledReason(broke,'keep-grinding'),null);
});
test('every substantive story branch reconciles to the cent and has a valid ending',()=>{
  let completed=0;
  function explore(s:GameState) {
    check(s);
    if(s.phase==='complete'){assert.equal(s.month,6);assert.equal(s.decisionHistory.length,6);completed++;return;}
    if(s.phase==='result'){explore(continueGame(s));return;}
    if(s.phase==='stock-loading'){explore(buyStock(loadStock(s,parseStockMarket(stockFixture)),Math.min(100,s.cash),'FIX'));return;}
    // Account/method permutations are independently covered above; explore all money-changing choices.
    if(s.phase==='account'){explore(choose(s,'TFSA'));return;}
    if(s.phase==='method'){explore(choose(s,'one-etf'));return;}
    for(const c of choicesFor(s)) if(!disabledReason(s,c.id)) explore(choose(s,c.id));
  }
  explore(initialState()); assert.ok(completed>=100); assert.deepEqual(play(main),play(main));
});
test('invalid, repeated, and unaffordable actions cannot mutate balances',()=>{
  const s=initialState(); assert.throws(()=>choose(s,'unknown')); assert.throws(()=>continueGame(s)); assert.throws(()=>choose(choose(s,'work'),'work'));
  const m2=play(['work']); assert.throws(()=>choose({...m2,cash:0},'save-emergency')); assert.equal(s.cash,1000);
});
test('each real ETF has its own API return and BizTech remains simulated',async()=>{
  const raw={label:'Test historical ETF feed',asOf:'2025-12-31',months:sampleFeed.months.map(m=>({...m,VAB:.01,XUS:.02,QQQ:-.1,BIZTECH:9}))};
  const feed=await loadMarketFeed('/api/market',(async()=>new Response(JSON.stringify(raw))) as typeof fetch); assert.equal(feed.source,'api'); assert.equal(feed.months[5].BIZTECH,sampleFeed.months[5].BIZTECH);
  let s=initialState(feed); for(const id of main.slice(0,5)) s=continueGame(finishDecision(s,id)); assert.equal(s.monthlyGrowth,-125); assert.equal(s.holdings.QQQ,1375); raw.months[5].QQQ=1; assert.equal(s.market.months[5].QQQ,-.1); check(s);
  for(const symbol of HOLDINGS.filter(s=>s!=='BIZTECH')) assert.throws(()=>parseMarketFeed({...raw,months:raw.months.map(m=>({...m,[symbol]:NaN}))}));
  assert.throws(()=>parseMarketFeed({...raw,months:[]}));
});
test('API failures fall back to visibly labelled samples',async()=>{
  for(const fetcher of [async()=>{throw new Error('offline');},async()=>new Response('{}'),async()=>new Response('',{status:503})]) {const feed=await loadMarketFeed('/api/market',fetcher as typeof fetch);assert.equal(feed.source,'sample');assert.match(feed.notice,/unavailable or invalid/);}
  assert.equal((await loadMarketFeed()).source,'sample');
});

test('home upgrades only after the raise is invested in an ETF and resets on replay', () => {
  const before = play(['work', 'skip-emergency', 'ask-mom', 'biztech']);
  assert.equal(homeUpgradeUnlocked(before), false, 'birthday stock purchase does not unlock the house');
  const method = choose(before, 'one-etf');
  const account = choose(method, 'TFSA');
  assert.equal(homeUpgradeUnlocked(method), false);
  assert.equal(homeUpgradeUnlocked(account), false, 'opening an account is not an ETF investment');
  for (const fund of ['VAB', 'XUS', 'QQQ']) {
    const invested = choose(account, fund);
    assert.equal(homeUpgradeUnlocked(invested), true);
    assert.equal(invested.cash, account.cash - 250, 'the home reward charges no additional money');
    check(invested);
    const final = choose(choose(continueGame(invested), 'penthouse'), 'rent-penthouse');
    assert.equal(final.cash, 0);
    assert.equal(homeUpgradeUnlocked(final), true, 'the upgrade survives spending the remaining cash');
  }
  assert.equal(homeUpgradeUnlocked(initialState()), false);
});
