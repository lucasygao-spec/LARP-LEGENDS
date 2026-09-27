# Investly — Live pitch demo

A short financial story starting at age 18, with avatar setup and a Kenney commercial city that reflects your choices.

## Run

Node 22.12+ (tested on Node 24):

```sh
npm install
npm run dev
```

`npm run build` produces `dist`. `npm run preview` serves it. All transactions and accounts are simulated.

## Pitch sequence

1. **Uni or Start working.** The work path lands a BizTech mascot job, salary $30,000/year.
2. **Emergency cushion.** Set aside $200 from pay, or keep it in cash.
3. **Frat flu alert.** A centered panel over a full-screen backdrop presents a $200 medical bill uses the emergency fund or a gift from Mom. Trying an empty fund opens the call-Mom alternative without advancing time.
4. **Birthday.** Receive $1,000: open TFSA/RRSP/FHSA, buy BizTech, or put it in general savings.
5. **Raise.** An extra $250/month leads directly to managed app, advisor, brokerage, or one ETF. Open an account if needed, then choose VAB/XUS/QQQ with Learn More buttons.
6. **Market result.** Choose the direct Miami rental path, higher-risk QQQ, or the historical stock pathway under "Invest in low risk." The stock pathway uses Twelve Data, accepts a cash contribution, advances through dated historical prices, then offers continued investing or cash-out followed by an optional rental. The direct Miami path still checks the $1,000,000 goal and offers its existing cash-matched one-day rental or "Keep grinding." Rental confirmation spends the cash balance and reveals the penthouse; View final summary opens the results.

The screenshot’s checkmarks/strikethroughs are interpreted as a sample route, not removed choices. A 10% raise on $30,000/year is $3,000/year or $250/month; the screenshot’s “$250 each year” is corrected to monthly. University stays playable with simplified part-time income. Investment methods converge to keep the pitch short.

Avatar, name, and literacy-level onboarding remain. Settings → Change name or avatar lets players edit their profile without resetting their finances or story. Saved profiles persist when browser storage is available. The town view has no ledger tab or floating month/data badge. Choice buttons apply the decision and advance to the next story step immediately. A before/after summary stays in the sidebar beside the next choices, with no Apply or Continue button. Changed accounts use darker square backgrounds. Number keys 1–4 choose as well. The medical alert uses a red full-screen panel and stays open until the player selects payment or the call-Mom alternative. Each main event is one month; account/method/fund choices are substeps in that month. Use mouse, Tab/Enter, or keys 1–4. Financial feedback is in the dashboard; the city has no floating building labels. Reduced motion, optional sounds, no-WebGL fallback, and unavailable storage are supported.

## Financial assumptions

`src/engine.ts` is the only balance-calculation engine. `src/data/story.json` defines the pitch; `src/investments.ts` defines fund descriptions and official issuer links.

- Start: age 18, $1,000 cash, all other balances $0.
- Work leaves $400/month after simplified taxes/essentials. Uni incurs $5,000 tuition debt and leaves $100/month from part-time work. The raise adds $250/month beginning Month 5; the university raise is a simplified equal-cash assumption.
- The optional $200 emergency deposit transfers cash. Mom’s $200 gift goes to the emergency fund and immediately pays the $200 medical bill. No family debt is created.
- General savings and emergency savings are separate. Neither earns interest. Birthday money arrives once in Month 4. Opening an account reserves that $1,000 in cash; investing the raise uses $1,250. If the gift was already saved or invested, the first ETF purchase is $250.
- Monthly market movement applies before new recurring contributions. Rebalancing existing investments does not inflate contributed capital. All figures round to cents.
- VAB, XUS, and QQQ are real examples; BizTech is simulated. The pitch’s 2–4%, 7–11%, and 18% annual figures appear in Learn More as illustrations, not verified historical CAGR, expected returns, or the values driving the simulation. Simplified relative-risk categories are not issuer risk ratings. All funds can fall.
- All four investment methods use the same ETF picker and calculation. Provider services/fees, taxes, distributions, FX (in the original ETF path), account eligibility, contribution limits, and withdrawal restrictions are not simulated. QQQ’s U.S. listing is represented in simulated dollars; currency conversion is omitted.
- The Miami option sets a $1,000,000 goal and shows the exact shortfall. Goal progress counts cash + general savings + investments, excluding emergency savings; debt is shown separately. It does not sell investments or buy property. The one-day rental costs the player’s cash balance at that step ($3,400 on the sample QQQ path) and spends it in full to film a course with $0 initial revenue. Savings and investments stay untouched. Zero cash disables renting. “Keep grinding” preserves the portfolio and recurring plan. After the shortfall notification, See my options opens the penthouse choices in a full-screen panel. Both endings complete in the same month; the rental expense applies on confirmation, and View final summary opens the results full-screen after the tower reveal. Replay, compare, or return to the dashboard from the final panel.
- Student debt uses a 6% APR ÷ 12.
- Net worth = cash + general savings + emergency fund + portfolio − student debt.
- Ledger identity: net worth = $1,000 + income − spending − interest + market growth.
- Portfolio identity: contributions + market growth − withdrawals = portfolio value.

Storage uses `investly.previous-run.v7`; older story results are not compared to the new script. Avatar profiles retain their existing storage key.

## Market data

### Twelve Data stock pathway

The “Invest in low risk” menu option now opens a stock picker. It explains that individual stocks can lose value. Players choose one or several companies, and the house remains visible through investing and cash-out; only confirming the existing affordable one-day rental unlocks the penthouse and its animation.

1. Create a Twelve Data account at https://twelvedata.com/pricing. The FRED key cannot authenticate with Twelve Data.
2. Copy `.env.example` to `.env.local` and set `TWELVE_DATA_API_KEY` locally. Never prefix this credential with `VITE_`, commit it, or put it in React code.
3. Restart `npm run dev`. Vite serves `/api/stocks/scenario` through server-only middleware.
4. For production, run `npm run build` then `npm start` (Node 22.12+); set `TWELVE_DATA_API_KEY` in the deployment environment and optionally `PORT` (default 3000). A static-only deployment of `dist` needs a separate server hosting this endpoint. `npm run preview` also supplies the endpoint for local checks.

Provider docs: https://twelvedata.com/docs. The server offers Apple (AAPL), Microsoft (MSFT), and Coca-Cola (KO), verified against the provider's supported USD common-stock listings. It requests split-adjusted daily closes for the previous completed calendar year and actual daily USD/CAD exchange rates. All options use the same observed dates near the start, middle and end of the year. At least two complete stock histories must be available; missing observations are never interpolated or replaced with sample prices. Prices are frozen for the run. Provider requests have timeouts, in-flight deduplication, an eight-request/minute guard and bounded one-hour in-memory caching. A fresh complete picker uses five requests; subsequent players reuse cached observations.

All displayed amounts use explicit Canadian-dollar formatting (CA$123.45), including existing game balances. Game CAD buys fractional adjusted shares: contribution / (USD close multiplied by historical USD/CAD). Value = shares multiplied by the current dated close and same-date FX rate. Contributions and balances round to cents; fractional units retain precision. Returns include exchange-rate changes and exclude dividends, fees and taxes. Existing ETF holdings, wages and expenses stay fixed during these historical updates.

Players can buy several companies, add to existing holdings or choose another company at the current date, then request the next update. Buying never advances time or ends the pathway. Players may finish with their investments or cash out all stocks chosen in this pathway; original ETF holdings remain untouched. Cash-out returns sale proceeds before the separate rental confirmation. The concise final summary shows total invested, value/proceeds, gain/loss, rental spending, remaining cash and net worth. Data attribution is a small footer link; the picker only shows company names, tickers, CAD prices and Invest buttons.

Tests use explicitly fictional fixtures under `tests/fixtures`; they are never imported by the application or served as a fallback. A live integration check requires your own Twelve Data key. Check your Twelve Data plan's market-data display rights before public deployment; the Basic plan is intended for internal non-display use.

### Existing ETF feed

The original ETF pathway defaults to clearly labelled **sample data**, including gains and losses. `src/market.ts` can load a normalized historical ETF feed using `VITE_MARKET_DATA_URL` in `.env.local` (restart Vite). This feed is separate from the Twelve Data stock pathway. Never place secret provider credentials in browser environment variables; use a server-side proxy if credentials are needed.

The endpoint must return twelve ordered monthly rows, each containing decimal returns for each real fund:

```json
{
  "label": "Provider and historical period",
  "asOf": "2025-12-31",
  "months": [
    { "month": 1, "VAB": 0.002, "XUS": 0.015, "QQQ": -0.02 },
    { "month": 2, "VAB": -0.004, "XUS": -0.01, "QQQ": 0.03 }
  ]
}
```

The abbreviated example needs all twelve rows to validate; this pitch uses months 1–6. `0.02` means +2%. An old generic `etf`/`stocks` response is rejected instead of being falsely attributed to named funds. BizTech always uses the sample local sequence, including in API mode. Requests time out after eight seconds; invalid/unavailable data visibly falls back to sample mode. Data is frozen for each run and replay. The adapter replays historical data, not forecasts.

## Verification and media

```sh
npm test
npm run build
npm run test:e2e
```

Engine tests reconcile every substantive branch and cover accounts, all four methods, named funds, general/emergency savings, market downturns, penthouse shortfalls, rental expenses, student interest, deterministic replay, and API fallback. Browser tests cover avatar onboarding, the full pitch with the real city, direct choice buttons, keyboard controls, centered full-screen medical alerts, Learn More, mobile, replay, storage, and no-WebGL play.

Current screenshots use `artifacts/pitch-*.png`. `docs/DEMO.md` and `scripts/record-demo.mjs` describe recording the new pitch. Existing `investly-demo.webm` and `life-ledger-*` videos depict earlier scripts; do not use them as recordings of this pitch. `docs/DEVPOST.md` contains updated submission copy.

React, TypeScript, Vite, React Three Fiber, Three.js, Drei, Motion, Lucide, and Kenney city assets. Avatar models and their attribution are preserved. See `docs/ASSETS.md` and `public/licenses/`. No real brokerage trades, real account opening, or authenticated Investly service connection is performed.
