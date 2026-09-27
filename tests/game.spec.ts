import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function pick(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Make this choice', exact: true }).click();
}
async function next(page: Page) {
  await page.getByRole('button', { name: /Continue to Month|Choose my financial goal/ }).click();
  if (await page.getByRole('dialog', { name: 'An unexpected expense' }).count()) await page.getByRole('button', { name: 'See my options' }).click();
}
async function decision(page: Page, name: string) { await pick(page, name); await next(page); }
async function finish(page: Page, goal = 'First Home') {
  for (let month = 7; month <= 12; month++) await decision(page, 'Keep my plan going');
  await page.getByRole('button', { name: goal, exact: true }).click();
  await page.getByRole('button', { name: 'Set my goal' }).click();
  await expect(page.getByRole('heading', { name: 'Your future has a starting point.' })).toBeVisible();
}
async function noWebGL(page: Page) {
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) { if (type.includes('webgl')) return null; return original.call(this, type as '2d', ...args); } as typeof HTMLCanvasElement.prototype.getContext; });
}
test('town, account learning, ETF journey, recurring growth and persisted comparison', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your starting path' })).toBeVisible();
  await expect(page.locator('.profile')).toContainText('Age 18');
  await expect(page.locator('.stat.cash')).toContainText('$1,000');
  await expect(page.locator('[data-city-ready="true"]')).toBeVisible({timeout: 30000});
  await expect(page.locator('.town-label, .building-sign')).toHaveCount(0);
  await page.screenshot({path: 'artifacts/investly-desktop.png', fullPage: true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:'artifacts/investly-city-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1050});
  await page.keyboard.press('2'); await expect(page.getByRole('button', {name:'Start Working', exact:true})).toHaveAttribute('aria-pressed','true');
  await decision(page, 'Start Working'); await pick(page, 'Start Investing');
  await page.getByRole('button', {name:'Learn more about FHSA'}).click(); await expect(page.getByRole('dialog')).toContainText('first home'); await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'TFSA',exact:true}).click(); await page.getByRole('button',{name:'Open this account'}).click();
  await expect(page.locator('.account-status')).toHaveText('TFSA · Open'); await expect(page.locator('.profile')).toContainText('Month 2 / 12'); await next(page);
  await decision(page,'Buy a diversified ETF'); await expect(page.locator('.stat.investment')).toContainText('$1,021');
  await expect(page.getByRole('button',{name:'Pay down debt',exact:true})).toBeDisabled();
  await pick(page, 'Build an emergency fund'); await expect(page.locator('.stat.savings')).toContainText('$500'); await expect(page.locator('.town-label')).toHaveCount(0); await page.screenshot({path:'artifacts/investly-shield.png',fullPage:true}); await next(page);
  await expect(page.locator('.portfolio-panel .negative')).toHaveCount(2);
  await pick(page,'Cover the repair'); await expect(page.locator('.result-description')).toContainText('$500 from your emergency fund + $200 cash'); await next(page);
  await pick(page,'Automatically invest $100/month'); await expect(page.locator('.result-description')).toContainText('Recurring Investment Created'); await next(page);
  await finish(page); await expect(page.getByRole('progressbar',{name:'First Home goal'})).toBeVisible();
  await page.getByRole('tab',{name:'Your ledger'}).click(); await expect(page.getByRole('heading',{name:'Every dollar has a story.'})).toBeVisible();
  await page.screenshot({path:'artifacts/investly-year.png',fullPage:true});
  await page.getByRole('button',{name:'Try a different story'}).click(); await page.getByRole('button',{name:'Compare paths',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Buy a diversified ETF'); await page.screenshot({path:'artifacts/investly-compare.png',fullPage:true});
  await page.reload(); await page.getByRole('button',{name:'Compare paths',exact:true}).click(); await expect(page.getByRole('dialog')).toContainText('First Home'); expect(errors).toEqual([]);
});
test('mobile cash/savings path, account-free finish, settings and storage fallback', async ({ page }) => {
  await noWebGL(page); await page.addInitScript(() => { Storage.prototype.getItem = () => {throw new Error('Blocked');}; Storage.prototype.setItem = () => {throw new Error('Blocked');}; });
  await page.setViewportSize({width:390,height:844}); await page.goto('/');
  await expect(page.getByRole('heading',{name:'Every choice still counts.'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:'artifacts/investly-mobile.png',fullPage:true});
  await decision(page,'University'); await decision(page,'Put it in Savings'); await decision(page,'Keep it as cash'); await decision(page,'Pay down debt');
  await pick(page,'Cover the repair'); await expect(page.locator('.result-description')).toContainText('emergency fund covered'); await next(page);
  await decision(page,'Save $100/month'); await finish(page,'Puppy');
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible(); await expect(page.locator('.stat.savings')).toContainText('$900'); await expect(page.locator('.account-status')).toContainText('Not opened');
  await page.getByRole('button',{name:'How this simulation works'}).click(); await expect(page.getByRole('dialog')).toContainText('fictional 6% APR'); await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click(); await page.getByRole('button',{name:/Reduce motion/}).click(); await expect(page.getByRole('button',{name:/Reduce motion/})).toHaveAttribute('aria-pressed','true');
});
test('gap-year shortfall offers sale, late account opening, and keyboard fourth choice', async ({page}) => {
  await noWebGL(page); await page.goto('/'); await decision(page,'Gap Year'); await decision(page,'Spend It'); await pick(page,'Buy individual stocks');
  await page.getByRole('button',{name:'RRSP',exact:true}).click(); await page.getByRole('button',{name:'Open this account'}).click(); await next(page);
  await decision(page,'Invest it'); await pick(page,'Sell investments'); await expect(page.locator('.result-description')).toContainText('$700 sold from investments'); await next(page);
  await page.keyboard.press('4'); await expect(page.getByRole('button',{name:'Split the money',exact:true})).toHaveAttribute('aria-pressed','true'); await page.getByRole('button',{name:'Make this choice'}).click(); await next(page); await finish(page,'Car');
  await expect(page.getByRole('progressbar',{name:'Car goal'})).toBeVisible(); await expect(page.locator('.portfolio-panel')).toContainText('Withdrawn');
});
