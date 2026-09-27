export const FUND_SYMBOLS = ['VAB', 'XUS', 'QQQ'] as const;
export type Fund = typeof FUND_SYMBOLS[number];
export type Holding = Fund | 'BIZTECH';
export const HOLDINGS: Holding[] = [...FUND_SYMBOLS, 'BIZTECH'];
export const FUNDS: Record<Fund, { name: string; description: string; risk: string; illustration: string; url: string }> = {
  VAB: { name: 'Vanguard Canadian Aggregate Bond Index ETF', description: 'A portfolio of Canadian investment-grade bonds. Bond prices can fall when interest rates change.', risk: 'Lower risk in this demo · bonds', illustration: '2–4%', url: 'https://www.vanguard.ca/en/product/etf/fixed-income/9552/vanguard-canadian-aggregate-bond-index-etf' },
  XUS: { name: 'iShares Core S&P 500 Index ETF', description: 'Exposure to large U.S. companies through the S&P 500. Stock prices and currency movements can affect value.', risk: 'Moderate risk in this demo · U.S. stocks', illustration: '7–11%', url: 'https://www.blackrock.com/ca/investors/en/products/251422/ishares-sp-500-index-etf' },
  QQQ: { name: 'Invesco QQQ', description: 'Tracks the Nasdaq-100: large non-financial Nasdaq companies. Its concentrated exposure can produce larger swings.', risk: 'Higher risk in this demo · Nasdaq-100', illustration: '18%', url: 'https://www.invesco.com/qqq-etf/en/about.html' },
};
export const METHODS = [
  { id: 'managed', title: 'Use a managed investing app', description: 'An app helps manage a portfolio', feedback: 'A managed app can handle portfolio decisions. For this demo, choose an ETF to represent your investment.' },
  { id: 'advisor', title: 'Work with an advisor', description: 'Get help building an investment plan', feedback: 'An advisor can help you build a plan. For this demo, choose an ETF to explore your risk preference.' },
  { id: 'brokerage', title: 'Self-directed investing through a brokerage', description: 'You choose and place your investments', feedback: 'You make the decisions in a self-directed account. Choose your ETF next.' },
  { id: 'one-etf', title: 'Buy one ETF', description: 'Choose a fund and watch it change', feedback: 'One ETF can hold many investments. Choose which exposure fits your plan.' },
] as const;
