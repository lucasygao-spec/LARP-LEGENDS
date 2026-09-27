# Investly — Your first money story

## Tagline

A first job. A surprise bill. Your first investment. See what each choice changes.

## What it does

Start at 18, choose a character, and pick university or a BizTech mascot job. Decide whether to build a $200 emergency cushion—then meet a $200 medical bill. An empty fund means a call to Mom.

A $1,000 birthday gift introduces account choices, savings, and a demo company called BizTech. A raise becomes an investing habit. Explore managed apps, advisors, self-directed brokerages, or buying an ETF, then compare VAB, XUS, and QQQ with short Learn More explanations.

Watch the portfolio move, then choose whether to pursue a Miami goal or change investment risk. The Miami branch shows exactly how far away the goal is: rent a penthouse for a course shoot priced at the cash you have, or keep grinding. Rental revenue starts at $0; neither choice invents a property purchase. Both lead to a financial summary with cash, savings, investments, debt, net worth, and replay comparison. Choices update the finances and advance immediately. Before/after summaries stay in the sidebar without a separate Continue button; changed accounts have darker square backgrounds. Only the final financial summary opens full-screen. The penthouse choices also open in a full-screen panel after the shortfall notification. The unexpected medical bill appears in a red centered panel over a full-screen backdrop.

The left-side dashboard shows cash, general savings, emergency savings, investments, and debt. The right-side Kenney commercial city responds with a savings shield, investment buildings, coins, and market storms. The city stays free of floating labels. Keyboard input, reduced motion, mobile layout, and a text fallback keep the story usable.

## How we built it

React and TypeScript handle story state and the dashboard. A pure engine calculates every transfer, return, expense, and student-loan interest charge. Three.js / React Three Fiber render the city and selected avatar. Motion animates financial values. Players can change their name and avatar from Settings while keeping their game progress. Browser storage retains the previous completed pitch.

The engine tests reconcile all substantive story paths to the cent. Browser checks exercise onboarding, the actual city, empty-fund assistance, ETF learning, full-screen alerts, replay, mobile, and unavailable WebGL/storage.

## Market and financial assumptions

The default pitch uses visibly labelled market returns. A configurable historical-data adapter accepts separate VAB, XUS, and QQQ monthly returns; the intended provider endpoint has not been supplied. BizTech always remains simulated. No live market connection or actual Investly brokerage integration is claimed.

The source script’s annual-return ranges are presented as pitch illustrations, not verified historical CAGR or guaranteed outcomes. A $30,000 salary’s 10% raise is correctly represented as $250/month. Selecting a Miami penthouse sets a savings goal; it does not invent enough money to buy one.

## Submission materials

Use `artifacts/pitch-*.png` screenshots. Generate and review the new recording following `docs/DEMO.md`; older videos show earlier scripts. Add deployed app, repository, team, and hosted video URLs. Select the Investly prize opt-in and verify requirements in the actual Devpost form before publishing.

All accounts, balances, and transactions are simulated. Asset credits and original licenses are included in the repository.
