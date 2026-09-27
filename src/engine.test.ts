import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choose, choicesFor, continueGame, disabledReason, initialState, netWorth, portfolio, round } from './engine';
import type { GameState } from './engine';
import { loadMarketFeed, parseMarketFeed, sampleFeed } from './market';
function check(s: GameState) {
  for (const e of s.ledger) {
    assert.equal(e.netWorth, round(1000 + e.income - e.spending - e.interest + e.marketChange), `Reconcile ${e.month}: ${e.label}`);
    assert.equal(e.netWorth, round(e.cash + e.emergencySavings + e.investments - e.debt));
    assert.equal(e.investments, round(e.contributed + e.marketChange - e.withdrawn));
    for (const value of [e.cash, e.emergencySavings, e.investments, e.debt]) assert.ok(Number.isFinite(value) && value >= 0);
  }
}
function decide(s: GameState, id: string, account = 'TFSA') { let next = choose(s, id); if (next.phase === 'account') next = choose(next, account); check(next); return next; }
function play(ids: string[]) { return ids.reduce((s, id) => continueGame(decide(s, id)), initialState()); }
test('starts at age 18 with exactly $1,000 and nothing else', () => {
  const s = initialState(); assert.equal(s.month, 1); assert.equal(s.age, 18); assert.equal(s.cash, 1000); assert.equal(netWorth(s), 1000); assert.equal(portfolio(s), 0); assert.equal(s.debt, 0); assert.equal(s.emergencySavings, 0); assert.equal(s.goal, null); check(s);
});
test('paths set simple budgets and university debt funds tuition, not cash', () => {
  const s = initialState(); const work = choose(s, 'work'); const uni = choose(s, 'university'); const gap = choose(s, 'gap');
  assert.equal(work.cash, 1400); assert.equal(uni.cash, 1100); assert.equal(uni.debt, 5000); assert.equal(gap.cash, 900); assert.equal(s.cash, 1000); [work, uni, gap].forEach(check);
});
test('account selection is the same month and gift is credited only once', () => {
  const m2 = play(['work']); assert.equal(m2.month, 2); assert.equal(m2.cash, 2800);
  for (const account of ['TFSA', 'FHSA', 'RRSP']) { const opening = choose(m2, 'open'); assert.equal(opening.phase, 'account'); assert.equal(opening.cash, 2800); const result = choose(opening, account); assert.equal(result.account, account); assert.equal(result.month, 2); assert.equal(result.cash, 2800); assert.equal(result.decisionHistory.length, 2); assert.throws(() => choose(result, account)); check(result); }
});
test('investing deducts cash and applies next-month return before new contributions', () => {
  const m3 = play(['work', 'open']); const invested = decide(m3, 'etf'); assert.equal(portfolio(invested), 1000); assert.equal(invested.cash, m3.cash - 1000);
  const m4 = continueGame(invested); assert.equal(portfolio(m4), 1021); assert.equal(m4.monthlyGrowth, 21);
  const m5 = continueGame(decide(m4, 'emergency')); assert.equal(portfolio(m5), 975.06); assert.ok(m5.effects.some(e => e.kind === 'market' && e.amount < 0)); check(m5);
});
test('spending the gift still permits a valid smaller investment', () => {
  const m3 = play(['gap', 'spend']); assert.equal(m3.cash, 700); const invested = decide(m3, 'stocks'); assert.equal(portfolio(invested), 700); assert.equal(invested.cash, 0); check(invested);
});
test('repair uses savings then cash and never sells when liquid funds cover it', () => {
  const m5 = play(['work', 'open', 'etf', 'emergency']); const repaired = decide(m5, 'repair'); assert.equal(repaired.cash, m5.cash - 200); assert.equal(repaired.emergencySavings, 0); assert.equal(portfolio(repaired), portfolio(m5)); assert.match(repaired.explanation, /\$500.*\$200 cash/); check(repaired);
  const funded = play(['work', 'save', 'cash', 'emergency']); const covered = decide(funded, 'repair'); assert.equal(covered.cash, funded.cash); assert.equal(covered.emergencySavings, 800); assert.match(covered.explanation, /emergency fund covered/);
});
test('shortfall explicitly requires borrowing or selling only the amount needed', () => {
  const m5 = play(['gap', 'spend', 'stocks', 'invest']); assert.deepEqual(choicesFor(m5).map(c => c.id), ['borrow', 'sell']); assert.equal(m5.cash, 0);
  const borrowed = decide(m5, 'borrow'); const sold = decide(m5, 'sell'); assert.equal(borrowed.debt, round(m5.debt + 700)); assert.equal(portfolio(borrowed), portfolio(m5)); assert.equal(sold.debt, m5.debt); assert.equal(sold.totalWithdrawn, 700); assert.equal(portfolio(sold), round(portfolio(m5) - 700)); assert.equal(sold.cash, 0); check(borrowed); check(sold);
});
test('raise contributes exactly six times, with market applied before each deposit', () => {
  let s = play(['work', 'open', 'etf', 'emergency', 'repair', 'auto-invest']); assert.equal(s.month, 7); assert.equal(s.monthlyContribution, 100);
  let expected = portfolio(play(['work', 'open', 'etf', 'emergency', 'repair']));
  for (let m = 7; m <= 12; m++) expected = round(round(expected * (1 + sampleFeed.months[m - 1].etf)) + 100);
  while (s.month < 12) s = continueGame(decide(s, 'advance'));
  assert.equal(s.totalContributed, 1600); assert.equal(portfolio(s), expected); check(s);
  s = continueGame(decide(s, 'advance')); assert.equal(s.phase, 'goal'); s = choose(s, 'home'); assert.equal(s.phase, 'complete'); assert.equal(s.month, 12); assert.equal(s.goal, 'home'); assert.equal(s.decisionHistory.length, 13); check(s);
});
test('unused recurring debt payment stays in cash and no debt becomes negative', () => {
  let s = play(['university', 'save', 'cash', 'pay', 'repair']); s.debt = 20; // isolate a final small balance
  s = continueGame(choose(s, 'auto-debt')); assert.equal(s.debt, 0); assert.equal(s.monthlyContribution, 0); assert.ok(s.cash > 0);
});
test('every valid story branch reconciles and repeats deterministically', () => {
  let completed = 0;
  function explore(s: GameState) {
    check(s);
    if (s.phase === 'complete') { completed++; return; }
    if (s.phase === 'result') { explore(continueGame(s)); return; }
    // Account effects are identical; each account separately covered above.
    if (s.phase === 'account') { explore(choose(s, 'TFSA')); return; }
    for (const c of choicesFor(s)) if (!disabledReason(s, c.id)) explore(choose(s, c.id));
  }
  explore(initialState()); assert.ok(completed > 200);
  assert.deepEqual(play(['work', 'open', 'etf']), play(['work', 'open', 'etf']));
});
test('invalid, repeat, unaffordable, and no-debt actions cannot mutate state', () => {
  const s = initialState(); assert.throws(() => choose(s, 'unknown')); assert.throws(() => continueGame(s)); assert.throws(() => choose(choose(s, 'work'), 'work'));
  const m4 = play(['work', 'open', 'etf']); assert.ok(disabledReason(m4, 'pay')); assert.throws(() => choose({...m4, cash: 0}, 'invest')); assert.equal(s.cash, 1000);
});
test('API monthly data drives valuations and remains frozen for a run', async () => {
  const raw = { label: 'Test historical feed', asOf: '2025-12-31', months: sampleFeed.months.map(m => ({ ...m, etf: -0.1 })) };
  const feed = await loadMarketFeed('/api/market', (async () => new Response(JSON.stringify(raw))) as typeof fetch); assert.equal(feed.source, 'api');
  let s = initialState(feed); for (const id of ['work', 'open', 'etf']) s = continueGame(decide(s, id)); assert.equal(portfolio(s), 900); raw.months[3].etf = 1; assert.equal(s.market.months[3].etf, -0.1);
  assert.throws(() => parseMarketFeed({...raw, months: []})); assert.throws(() => parseMarketFeed({...raw, months: raw.months.map(m => ({...m, etf: NaN}))}));
});
test('API failures visibly fall back, never masquerading as live data', async () => {
  for (const fetcher of [async () => { throw new Error('offline'); }, async () => new Response('{}'), async () => new Response('', {status: 503})]) { const feed = await loadMarketFeed('/api/market', fetcher as typeof fetch); assert.equal(feed.source, 'sample'); assert.match(feed.notice, /unavailable or invalid/); }
  assert.equal((await loadMarketFeed()).source, 'sample');
});
