import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function decision(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: 'Make this choice' }).click();
  await page.getByRole('button', { name: /Continue to|See my year in review/ }).click();
}
test('renders the real town, plays a full year, compares replay, and persists the result', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.stack || e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Your first paycheque/ })).toBeVisible();
  await expect(page.locator('.town-label').filter({ hasText: 'Your home' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Make this choice' })).toBeHidden();
  await page.screenshot({ path: 'artifacts/life-ledger-desktop.png', fullPage: true });
  await page.keyboard.press('1'); await expect(page.getByRole('button', { name: /Give future you/ })).toHaveAttribute('aria-pressed', 'true');
  await decision(page, 'Give future you');
  await expect(page.locator('.town-label').filter({ hasText: '$400 protected' })).toBeVisible();
  await decision(page, 'Put it on the card');
  await expect(page.locator('.town-label').filter({ hasText: 'Debt drain' })).toBeVisible();
  await decision(page, 'A little savings, a little credit');
  await decision(page, 'Back one big idea');
  await page.screenshot({ path: 'artifacts/life-ledger-downturn.png', fullPage: true });
  await decision(page, 'Give your plan more time');
  await expect(page.getByRole('heading', { name: /Look how far/ })).toBeVisible();
  await page.getByRole('button', { name: 'Try a different story' }).click();
  await decision(page, 'Give future you'); await decision(page, 'Put it on the card'); await decision(page, 'A little savings, a little credit'); await decision(page, 'Give your money three homes'); await decision(page, 'Give your plan more time');
  await page.getByRole('button', { name: 'Compare your paths' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByText('Back one big idea', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/life-ledger-compare.png', fullPage: true });
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload(); await page.getByRole('button', { name: 'Compare paths', exact: true }).click();
  await expect(page.getByText('Give your money three homes', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile layout, ledger, assumptions, sound, and cash-goal branch work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.locator('.town-label').filter({ hasText: 'Your home' })).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'artifacts/life-ledger-mobile.png', fullPage: true });
  const layout = await page.evaluate(() => ({width: document.documentElement.scrollWidth, viewport: innerWidth, overflow: [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className).slice(0,10)}));
  expect(layout).toMatchObject({width:390,viewport:390});
  await page.screenshot({ path: 'artifacts/life-ledger-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Enable sounds' }).click(); await expect(page.getByRole('button', { name: 'Mute sounds' })).toBeVisible();
  await decision(page, 'Enjoy a little'); await decision(page, 'Pay for it today'); await decision(page, 'Let your cushion catch you'); await decision(page, 'Keep it for a near-term goal');
  await expect(page.getByRole('button', { name: /Bring your investments home/ })).toBeDisabled(); await decision(page, 'Give your plan more time');
  await page.getByRole('tab', { name: 'Your ledger' }).click(); await expect(page.getByRole('heading', { name: 'Every dollar has a story.' })).toBeVisible();
  await page.getByRole('button', { name: 'How this simulation works' }).click(); await expect(page.getByText('Fixed fictional markets', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Reduce motion/ }).click();
  await expect(page.getByRole('button', { name: /Reduce motion/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Game sounds/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Game sounds/ }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('button', { name: 'Enable sounds' })).toBeVisible();
});
test('the complete game works without WebGL or storage', async ({ page }) => {
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) { if (type.includes('webgl')) return null; return original.call(this, type as '2d', ...args); } as typeof HTMLCanvasElement.prototype.getContext; Storage.prototype.getItem = () => { throw new Error('Blocked'); }; Storage.prototype.setItem = () => { throw new Error('Blocked'); }; });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Every choice still counts.' })).toBeVisible();
  await decision(page, 'Give future you'); await decision(page, 'Pay for it today'); await decision(page, 'Let your cushion catch you'); await decision(page, 'Give your money three homes'); await decision(page, 'Bring your investments home');
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
});
