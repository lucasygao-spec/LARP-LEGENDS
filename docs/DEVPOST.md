# Investly — Your first investing journey

## Tagline

Start at 18. Build a habit. See your money decisions come to life.

## What it does

Follow Maya through a simple year of financial firsts: choose university, work, or a gap year; receive a birthday gift; open a simulated TFSA, FHSA, or RRSP; and make a first ETF or stock investment.

An extra $500 tests the balance between investing, savings, and debt. A $700 car repair shows why emergency savings matter. A raise creates a recurring monthly plan, and the portfolio then progresses through six months of changing markets. Finish by choosing a First Home, Car, or Puppy goal and see how far your investments have taken you.

The persistent dashboard shows age, month, cash, investments, debt, emergency fund, account, and goal. In the 3D town, savings protect a home, coins travel into investments, market losses bring a storm, and debt drains money. Each decision includes a short explanation and one financial lesson. Replay and compare with the previous completed year.

## How we built it

React and TypeScript drive the story and dashboard. React Three Fiber, Three.js, and selected Kenney assets render the town. Motion animates balances, transitions, and an interactive net-worth chart. A pure financial engine controls all money; the scene only displays results. Tests reconcile every valid story branch to the cent.

The market adapter accepts validated monthly historical returns from a configurable API. **No existing market endpoint or credentials were present in this checkout. The default demo uses visibly labelled fictional sample data with both gains and losses.** Connecting the intended provider requires its endpoint and normalization to the documented format. This is not a claim of live market access or authenticated Investly integration.

The complete journey supports keyboard input, reduced motion, mobile layout, and a text fallback when 3D cannot load. Browser storage retains the last completed run without login.

## Lessons

Account choice and investment choice are different decisions. Diversification changes exposure without removing risk. Emergency savings protect investments from forced sales. Recurring contributions build a habit, but returns remain uncertain. Goals need an appropriate time horizon.

## Submission materials

Use the current `artifacts/investly-*.png` screenshots and the recording instructions in `docs/DEMO.md`. Previous `life-ledger-*` screenshots/video depict an older flow. Add deployed app, repository, team, and hosted video URLs before submitting. Select the Investly prize opt-in in the actual Devpost form and verify the event's requirements there.

All accounts and transactions are simulated. Kenney assets and sounds are CC0; font licenses are OFL. Credits and original licenses are included in the repository.
