# Record the replacement pitch

Run `npm run dev`, then `npm run demo`. The script creates a player, records the real app in Chrome, and saves `artifacts/pitch-demo.webm`. It uses the Playwright ffmpeg cache to fit the full capture into one minute, including a pause on the final result. If encoding is unavailable, it preserves the untrimmed capture and says so.

Suggested narration:

- Meet your character at 18. Start working as a BizTech mascot.
- Keep money in cash. A centered full-screen alert presents a $200 medical bill and exposes the empty emergency fund: call Mom.
- Receive $1,000 for your birthday and open a TFSA.
- Invest the $250 monthly raise plus the gift. Choose one ETF and explore QQQ.
- See the market change, then choose a Miami goal or a different level of risk.
- Choose the Miami goal. Show the actual funds available and the remaining shortfall.
- Open the full-screen penthouse options and rent for a one-day course shoot using the available cash, with $0 initial course revenue, or keep grinding with the same investments.
- End immediately at Month 6 with the financial summary. Replay or compare paths.

Choices apply immediately and advance the story. Financial updates stay in the sidebar with darker square highlights on changed accounts, and no separate Continue button. The medical alert uses a red full-screen panel. The final financial summary opens full-screen automatically. The raise leads directly to the investing-method choices.

The record path is an example, not a recommendation. The default feed is sample data. ETF risk categories, annual-return illustrations, and student-loan interest are demo assumptions. Do not describe the capture as real account activity or live market performance.

Current screenshots use `pitch-*`. Existing `investly-demo.webm` and `life-ledger-*` media depict earlier scripts. Review a newly generated video before uploading it. Publishing and Devpost submission remain manual account actions.
