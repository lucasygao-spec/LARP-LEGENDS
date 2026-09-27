import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function pick(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}
async function reachRental(page: Page, webgl = true) {
  await page.addInitScript(() => localStorage.setItem('investly.player.v1', JSON.stringify({ name: 'Maya', avatarId: 'generic-female', literacyLevel: 1 })));
  if (!webgl) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return original.call(this, type as '2d', ...args);
    } as typeof original;
  });
  await page.goto('/');
  if (webgl) await expect(page.locator('[data-city-ready="true"]')).toBeVisible({ timeout: 30000 });
  for (const choice of ['Start working', 'No — keep it in cash', 'Call Mom to ask for money :(', 'Open an account', 'TFSA', 'Buy one ETF', 'QQQ', 'Buy a penthouse in Miami']) await pick(page, choice);
  if (webgl) await expect(page.locator('[data-penthouse-unlocked]')).toHaveAttribute('data-penthouse-unlocked', 'false');
  await pick(page, 'See my options');
}

async function towerState(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(modulePath);
    const scene = _roots.get(document.querySelector('canvas'))?.store.getState().scene;
    return { visible: !!scene?.getObjectByName('miami-penthouse-island'), scale: scene?.getObjectByName('penthouse-transformation')?.children[0].scale.x };
  });
}

for (const mode of ['animated', 'mobile-reduced', 'fallback'] as const) {
  test(`rental reveals the reference tower and replay restores camp (${mode})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    if (mode === 'mobile-reduced') await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: mode === 'mobile-reduced' ? 'reduce' : 'no-preference' });
    await reachRental(page, mode !== 'fallback');
    if (mode === 'animated') await page.evaluate(async () => {
      const modulePath = '/node_modules/.vite/deps/@react-three_fiber.js';
      const { _roots } = await import(modulePath);
      const scene = _roots.get(document.querySelector('canvas')).store.getState().scene;
      const samples: number[] = [];
      (window as unknown as { upgradeSamples: number[] }).upgradeSamples = samples;
      const timer = window.setInterval(() => samples.push(scene.getObjectByName('penthouse-transformation').children[0].scale.x), 16);
      window.setTimeout(() => window.clearInterval(timer), 2500);
    });
    await pick(page, 'Rent a penthouse to larp and sell a course');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.stat.cash').first()).toContainText('$0');
    if (mode === 'fallback') {
      await expect(page.locator('.text-town')).toContainText('rented Miami penthouse');
    } else {
      await expect.poll(() => towerState(page)).toEqual({ visible: true, scale: 1 });
      await page.screenshot({ path: `test-results/rental-tower-${mode}.png` });
      if (mode === 'animated') {
        const samples = await page.evaluate(() => (window as unknown as { upgradeSamples: number[] }).upgradeSamples);
        expect(Math.min(...samples)).toBeLessThan(0.5);
        expect(Math.max(...samples)).toBeGreaterThan(1.01);
      }
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await pick(page, 'View final summary');
    await expect(page.getByRole('heading', { name: 'Your choices added up.' })).toBeVisible();
    await pick(page, 'Back to dashboard');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await pick(page, 'Replay');
    await expect(page.locator('.profile')).toContainText('Month 1');
    if (mode !== 'fallback') await expect.poll(async () => (await towerState(page)).visible).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('keep grinding preserves the original home and opens the summary', async ({ page }) => {
  await reachRental(page);
  await pick(page, 'Keep grinding');
  await expect(page.getByRole('heading', { name: 'Your choices added up.' })).toBeVisible();
  expect((await towerState(page)).visible).toBe(false);
  await expect(page.locator('[data-penthouse-unlocked]')).toHaveAttribute('data-penthouse-unlocked', 'false');
});
