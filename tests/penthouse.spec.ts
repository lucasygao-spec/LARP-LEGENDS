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

async function fireworksVisible(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/node_modules/.vite/deps/@react-three_fiber.js';
    const { _roots } = await import(modulePath);
    const scene = _roots.get(document.querySelector('canvas'))?.store.getState().scene;
    return !!scene?.getObjectByName('penthouse-fireworks');
  });
}

for (const mode of ['animated', 'mobile-animated', 'mobile-reduced', 'fallback'] as const) {
  test(`rental reveals the reference tower and replay restores camp (${mode})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const animated = mode === 'animated' || mode === 'mobile-animated';
    if (mode.startsWith('mobile')) await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: mode === 'mobile-reduced' ? 'reduce' : 'no-preference' });
    await reachRental(page, mode !== 'fallback');
    if (animated) await page.evaluate(async () => {
      const modulePath = '/node_modules/.vite/deps/@react-three_fiber.js';
      const { _roots, addAfterEffect } = await import(modulePath);
      const scene = _roots.get(document.querySelector('canvas')).store.getState().scene;
      const samples: number[] = [];
      (window as unknown as { upgradeSamples: number[] }).upgradeSamples = samples;
      (window as unknown as { fireworksDuringGrowth: boolean }).fireworksDuringGrowth = false;
      const stopSampling = addAfterEffect(() => {
        const scale = scene.getObjectByName('penthouse-transformation').children[0].scale.x;
        samples.push(scale);
        if (scale !== 1 && scene.getObjectByName('penthouse-fireworks')) {
          (window as unknown as { fireworksDuringGrowth: boolean }).fireworksDuringGrowth = true;
        }
      });
      window.setTimeout(stopSampling, 2500);
    });
    await pick(page, 'Rent a penthouse to larp and sell a course');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.stat.cash').first()).toContainText('CA$0.00');
    if (mode === 'fallback') {
      await expect(page.locator('.text-town')).toContainText('rented Miami penthouse');
    } else {
      await expect.poll(() => towerState(page)).toEqual({ visible: true, scale: 1 });
      await page.screenshot({ path: `test-results/rental-tower-${mode}.png` });
      if (animated) {
        const samples = await page.evaluate(() => (window as unknown as { upgradeSamples: number[] }).upgradeSamples);
        // Slow software rendering can skip the minimum shrink and peak overshoot.
        expect(Math.min(...samples)).toBeLessThan(1);
        expect(Math.max(...samples)).toBeGreaterThanOrEqual(1);
        expect(await page.evaluate(() => (window as unknown as { fireworksDuringGrowth: boolean }).fireworksDuringGrowth)).toBe(true);
        await expect.poll(() => fireworksVisible(page)).toBe(false);
      } else {
        expect(await fireworksVisible(page)).toBe(false);
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
    if (mode !== 'fallback') expect(await fireworksVisible(page)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('keep grinding preserves the original home and opens the summary', async ({ page }) => {
  await reachRental(page);
  await pick(page, 'Keep grinding');
  await expect(page.getByRole('heading', { name: 'Your choices added up.' })).toBeVisible();
  expect((await towerState(page)).visible).toBe(false);
  expect(await fireworksVisible(page)).toBe(false);
  await expect(page.locator('[data-penthouse-unlocked]')).toHaveAttribute('data-penthouse-unlocked', 'false');
});
