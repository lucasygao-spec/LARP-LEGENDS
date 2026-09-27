# Investly — Your first investing journey

A short financial learning demo following your player-created character through twelve months. Keep the financial decisions on the left and watch the balances change a miniature 3D town on the right.

## Run

Node 22.12+ (tested on Node 24):

```sh
npm install
npm run dev
```

`npm run build` produces `dist`; `npm run preview` serves it. No real accounts or trades are created.

On first launch, enter a name, choose a person character, and select your money experience level. The same selected model appears in the 3D town and the profile portrait. Your choices are saved in this browser.

## Journey

1. University, work, or a gap year changes your monthly budget.
2. Receive a $1,000 gift; invest, save, or spend. Investing opens a simulated TFSA, FHSA, or RRSP, with CRA Learn More links.
3. Buy a diversified ETF (recommended demo route), a fictional individual stock, or hold cash.
4. Allocate an extra $500 to investing, an emergency fund, or debt.
5. Cover a $700 repair using emergency savings, then cash. Explicitly borrow or sell investments if still short.
6. Assign a $100 monthly raise to ETF contributions, savings, debt, or a split.
7. Advance months 7–12 with monthly market changes and six recurring contributions.
8. Choose a First Home ($40,000), Car ($12,000), or Puppy ($2,500) goal and see portfolio progress.

Account selection is a substep, not another month. Balances and market updates settle on entering a month; its decision then allocates money. The goal is selected after Month 12. Every choice receives brief feedback and a lesson. Number keys 1–4 select; Tab/Enter operates all controls. Reduced motion, optional sound, no-WebGL play, and storage failure are supported. Replay uses the same market sequence; comparison keeps the last completed run.

## Market data

**This checkout did not contain the existing market API mentioned in the request.** Default data in `src/data/markets.json` is fictional and visibly labelled **SAMPLE DATA**. It includes positive and negative months and is never presented as live data.

`src/market.ts` accepts a normalized historical-data endpoint. Set `VITE_MARKET_DATA_URL` in `.env.local` and restart Vite. The endpoint must support the app's origin (or be same-origin), return twelve consecutive monthly returns in chronological order, and use decimal returns (`0.021` means +2.1%). For example:

```json
{
  "label": "Provider name · ETF and stock identifiers",
  "asOf": "Historical window: Jan–Dec 2025",
  "months": [
    { "month": 1, "etf": 0.012, "stocks": -0.02 },
    { "month": 2, "etf": -0.008, "stocks": 0.03 }
  ]
}
```

The abbreviated example needs all twelve rows to validate. Adapt the actual provider's adjusted-price history into this schema on an existing server/proxy; keep provider credentials server-side, never in a `VITE_` variable. This repository does not invent a provider or include a backend. Market loading is bounded to eight seconds; HTTP, network, or validation failures use an explicitly labelled sample feed. A run freezes its loaded sequence, so replay is deterministic. API mode represents historical data replay, not future/live forecasts.

## Financial model

`src/engine.ts` is the single pure calculation engine; UI and town only render its results.

- Initial balances: cash $1,000; investments, debt, and emergency fund $0. Age 18, Month 1, goal and account unselected.
- Monthly net budgets after essentials: university +$100, work +$400, gap year −$100. University incurs $5,000 debt paid directly to tuition. Any gap-year cash deficit is borrowed. These are explicit demo assumptions, not detailed salary calculations.
- Gift $1,000 in Month 2; bonus $500 in Month 4. Raise $100/month from Month 7.
- All debt uses a fictional 6% APR divided by twelve, charged before payments. Actual student-loan and consumer-credit rules are not simulated.
- Apply monthly market returns to existing ETF/stock balances before recurring contributions. Round each holding to cents. No return is guaranteed.
- Purchases consume cash; savings/investing transfer it. Emergency repairs use savings first, then cash, then the selected funding source. Sales withdraw only the shortfall.
- Account eligibility, taxes, contribution limits, fees, inflation, and interest on cash/savings are not modeled. Goal targets are illustrative, not quotes or recommendations.
- Net worth = cash + emergency fund + portfolio − debt.
- Reconciliation: net worth = $1,000 + cumulative income − spending − interest + market growth.
- Portfolio = cumulative contributions + cumulative market growth − withdrawals.

ETF value is displayed across three symbolic town districts; these are not additional holdings or an ETF composition claim. Shield size represents emergency savings; debt and interest drive the red drain; the goal building shows selected-goal progress. Coins are symbolic; exact balances appear in the ledger.

## Verification

```sh
npm test
npm run build
npm run test:e2e
```

Engine tests enumerate valid branches, reconcile every ledger entry, and cover account substeps, repair funding, negative returns, six contributions, API validation/fallback, and invalid actions. Browser tests cover the real town, account learning, mobile, goals, replay, persistence, and unavailable WebGL/storage. They use installed Google Chrome and save current screenshots as `artifacts/investly-*.png`.

`docs/DEMO.md` describes recording; `docs/DEVPOST.md` contains updated submission copy. Existing `life-ledger-*` artifacts show the previous product and must not be used to represent the new flow.

React, TypeScript, Vite, React Three Fiber, Three.js, Drei, Motion, Lucide, and selected Kenney CC0 models/sounds. Fonts are served locally. Asset licenses: `docs/ASSETS.md` and `public/licenses/`. The Motion SVG chart adapts the linked Bklit chart's interactive direction to monthly data. No account backend, brokerage execution, analytics, or authenticated Investly service integration is included.
