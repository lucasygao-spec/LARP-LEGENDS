import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fixture from './fixtures/stock-scenario.json' with { type: 'json' };

async function pick(page: Page, name: string) { await page.getByRole('button', { name, exact: true }).click(); }
async function reachStocks(page: Page, webgl = false) {
  await page.addInitScript(() => localStorage.setItem('investly.player.v1', JSON.stringify({ name: 'Maya', avatarId: 'generic-female', literacyLevel: 1 })));
  if (!webgl) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return original.call(this, type as '2d', ...args);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const name of ['Start working', 'No — keep it in cash', 'Call Mom to ask for money :(', 'Open an account', 'TFSA', 'Buy one ETF', 'QQQ', 'Invest in low risk']) await pick(page, name);
}
async function invest(page: Page, symbol: string, amount: string) {
  const stock=fixture.stocks.find(s=>s.symbol===symbol)!;
  await pick(page,`Invest in ${stock.company} (${symbol})`);
  await page.getByLabel('Amount to invest (CAD)').fill(amount);
  await pick(page,'Confirm investment');
}

test('multiple stocks and additional contributions use CAD, with a concise mobile summary', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/stocks/scenario', route => route.fulfill({json:fixture}));
  await reachStocks(page);
  const options=page.getByLabel('Stocks to choose from');
  await expect(options.getByRole('button')).toHaveCount(3);
  await expect(options).toContainText('CA$125.00'); await expect(options).toContainText('CA$62.50');
  await expect(options).not.toContainText(/USD|Twelve Data|API|random/i);
  await pick(page,'Invest in Alpha Fixtures (FIX)');
  await page.getByLabel('Amount to invest (CAD)').fill('999999');
  await expect(page.getByRole('button',{name:'Confirm investment',exact:true})).toBeDisabled();
  await pick(page,'Cancel');
  await invest(page,'FIX','1000'); await invest(page,'BETA','500');
  await expect(page.locator('.stock-balance')).toContainText('CA$1,900.00');
  await expect(page.getByLabel('Your stock investments')).toContainText('CA$1,500.00');
  await pick(page,'See next update');
  await expect(page.locator('.stock-date')).toContainText('2025-07-01');
  await expect(page.getByLabel('Your stock investments')).toContainText('CA$1,612.00');
  const holdings=page.getByLabel('Your stock investments');
  for(const text of ['Alpha Fixtures','CA$1,000.00','CA$832.00','-CA$168.00','(-16.80%)']) await expect(holdings.getByLabel('FIX performance')).toContainText(text);
  for(const text of ['Beta Fixtures','CA$500.00','CA$780.00','+CA$280.00','(+56.00%)']) await expect(holdings.getByLabel('BETA performance')).toContainText(text);
  await expect(holdings.getByLabel('GAMMA performance')).toHaveCount(0);
  for(const text of ['Total invested','CA$1,500.00','Total portfolio value','CA$1,612.00','+CA$112.00','(+7.47%)']) await expect(holdings.getByLabel('Portfolio totals')).toContainText(text);
  await invest(page,'FIX','520'); await invest(page,'GAMMA','234');
  await expect(holdings.getByLabel('FIX performance')).toContainText('(-11.05%)');
  await expect(holdings.getByLabel('GAMMA performance')).toContainText('(0.00%)');
  await expect(page.locator('.stock-date')).toContainText('2025-07-01');
  await pick(page,'See next update');
  await expect(page.getByRole('button',{name:'See next update',exact:true})).toHaveCount(0);
  await pick(page,'Keep investments and finish');
  const summary=page.getByLabel('Stock investment summary');
  for(const amount of ['CA$2,254.00','CA$2,825.00','+CA$571.00','CA$1,146.00','CA$5,571.00']) await expect(summary).toContainText(amount);
  await expect(summary).toContainText('2025-12-31');
  for(const text of ['CA$1,520.00','CA$1,950.00','+CA$430.00','(+28.29%)']) await expect(summary.getByLabel('FIX performance')).toContainText(text);
  await expect(summary.getByLabel('BETA performance')).toContainText('(+20.00%)');
  await expect(summary.getByLabel('GAMMA performance')).toContainText('(+17.52%)');
  await expect(page.getByLabel('Final financial summary')).toContainText('(+25.33%)');
  await expect(page.getByLabel('Final financial summary')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:'test-results/multi-stock-summary-mobile.png'});
  await pick(page,'Try a different story');
  await pick(page,'Compare paths'); await expect(page.getByRole('dialog')).toContainText('Stock investments');
});

test('selling multiple stocks retains the house until rental confirmation and keeps rent separate', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/stocks/scenario',route=>route.fulfill({json:fixture}));
  await reachStocks(page,true);
  await expect(page.locator('[data-home-upgraded]')).toHaveAttribute('data-home-upgraded','true');
  await expect(page.locator('[data-penthouse-unlocked]')).toHaveAttribute('data-penthouse-unlocked','false');
  await page.screenshot({path:'test-results/multi-stock-picker.png'});
  await invest(page,'FIX','1000');await invest(page,'BETA','500');await pick(page,'See next update');
  await pick(page,'Cash out and rent a Miami penthouse');
  await expect(page.locator('.stat.cash').first()).toContainText('CA$3,512.00');
  await expect(page.locator('[data-penthouse-unlocked]')).toHaveAttribute('data-penthouse-unlocked','false');
  await pick(page,'See my options');
  await expect(page.getByRole('button',{name:'Rent a penthouse to larp and sell a course',exact:true})).toContainText('CA$3,512.00');
  await pick(page,'Rent a penthouse to larp and sell a course');
  await expect(page.locator('[data-penthouse-unlocked]')).toHaveAttribute('data-penthouse-unlocked','true');
  await pick(page,'View final summary');
  const summary=page.getByLabel('Stock investment summary');
  for(const text of ['Sale proceeds','CA$1,612.00','+CA$112.00','CA$3,512.00','CA$0.00','CA$1,600.00']) await expect(summary).toContainText(text);
  for(const text of ['Sale proceeds','CA$832.00','-CA$168.00','(-16.80%)']) await expect(summary.getByLabel('FIX performance')).toContainText(text);
  for(const text of ['Sale proceeds','CA$780.00','+CA$280.00','(+56.00%)']) await expect(summary.getByLabel('BETA performance')).toContainText(text);
  await expect(page.getByLabel('Final financial summary')).toContainText('(+7.47%)');
  expect(errors).toEqual([]);
});

test('unavailable prices retry without spending money or inserting sample prices', async ({page})=>{
  let available=false;
  await page.route('**/api/stocks/scenario',route=>available?route.fulfill({json:fixture}):route.fulfill({status:503,json:{error:'Stock prices are unavailable. Please retry.'}}));
  await reachStocks(page);
  await expect(page.getByRole('alert')).toContainText('Please retry');
  await expect(page.locator('.stat.cash').first()).toContainText('CA$3,400.00');
  await expect(page.getByLabel('Stocks to choose from')).toHaveCount(0);
  available=true;await pick(page,'Try again');
  await expect(page.getByLabel('Stocks to choose from').getByRole('button')).toHaveCount(3);
  await invest(page,'FIX','3400');
  for(const button of await page.getByLabel('Stocks to choose from').getByRole('button').all()) await expect(button).toBeDisabled();
  await expect(page.getByRole('button',{name:'Cash out and rent a Miami penthouse',exact:true})).toBeEnabled();
});
