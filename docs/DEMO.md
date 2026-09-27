# One-minute Investly demo

Run `npm run dev`, then `npm run demo` in another terminal. The script uses installed Chrome and records the current app. It requires the Playwright ffmpeg cache to fit the full capture into one minute; if unavailable, it preserves the untrimmed capture and reports that fact. The recorder saves `artifacts/investly-demo.webm`.

Suggested narration:

- 0–8s: “Meet Maya, 18. Choose a starting path and see what money is available.” Choose Work.
- 8–17s: “A birthday gift starts an investing journey. Choose an account, then an investment.” Open TFSA and buy the diversified ETF.
- 17–27s: “Markets move both ways. An emergency fund protects money you can leave invested.” Save the extra $500 and show the shield.
- 27–36s: “A $700 repair uses $500 of savings and $200 cash. Investments stay untouched.” Cover the repair.
- 36–47s: “A raise becomes a habit: $100 a month into an ETF.” Set recurring investing; move through the future months.
- 47–60s: “Contributions and market growth are shown separately. Choose a goal and see your progress.” Select First Home and show the tracker.

The default recording visibly uses fictional sample returns. Do not describe it as live data. API mode uses historical returns replayed over a simulated year. No real account is opened.

Use the current `investly-*` screenshots; old `life-ledger-*` media depicts the previous product. Review any recording before uploading it. Publishing, Devpost opt-in, and submitting the video remain manual account actions.
