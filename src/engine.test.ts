import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choose, choicesFor, continueGame, disabledReason, initialState, netWorth, portfolio, round, totalDebt } from './engine';
import type { GameState } from './engine';
import { loadMarketFeed, parseMarketFeed, sampleFeed } from './market';
import { HOLDINGS, METHODS } from './investments';
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
test('emergency fund covers medical costs without touching savings or investments',()=>{
  const m3=play(['work','save-emergency']); const result=choose(m3,'use-emergency'); assert.equal(result.emergencySavings,0); assert.equal(result.cash,m3.cash); assert.equal(totalDebt(result),0); assert.match(result.explanation,/covered the \$200 bill/); check(result);
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
  const low=finishDecision(m6,'lower-risk'); assert.equal(low.holdings.VAB,1600); assert.equal(low.totalContributed,1500); assert.equal(low.totalWithdrawn,0); assert.equal(netWorth(low),netWorth(m6));
  const final=continueGame(low); assert.equal(final.phase,'complete'); assert.equal(final.month,6); assert.equal(final.holdings.VAB,1600); assert.equal(final.totalIncome,low.totalIncome); assert.deepEqual(final.ledger,low.ledger); check(final);
});
test('Miami sets a savings goal, sells at current value, and never invents a property purchase',()=>{
  const m6=play(main.slice(0,5)); const result=choose(m6,'penthouse'); assert.equal(result.goal,'miami'); assert.equal(result.savings,1600); assert.equal(portfolio(result),0); assert.equal(netWorth(result),netWorth(m6)); assert.equal(result.recurring,'savings'); assert.match(result.explanation,/No property was purchased/); check(result);
});
test('every substantive story branch reconciles to the cent and has a valid ending',()=>{
  let completed=0;
  function explore(s:GameState) {
    check(s);
    if(s.phase==='complete'){assert.equal(s.month,6);assert.equal(s.decisionHistory.length,6);completed++;return;}
    if(s.phase==='result'){explore(continueGame(s));return;}
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
test('each real ETF has its own API return and BizTech remains fictional',async()=>{
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
