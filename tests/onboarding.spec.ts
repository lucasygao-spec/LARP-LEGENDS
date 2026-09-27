import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return original.call(this, type as '2d', ...args);
    } as typeof original;
  });
}

test('name and experience intro leads to character setup, supports back, and starts the game', async ({ page }) => {
  await withoutWebGL(page);
  await page.goto('/');
  const name = page.getByLabel('Your name', { exact: true });
  await expect(page.getByRole('heading', { name: 'What’s your name?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up your character' })).toHaveCount(0);
  await expect(page.locator('.intro-campsite')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'How familiar are you with money?' })).toHaveCount(0);
  await expect(name).toBeFocused();
  await name.fill('   ');
  await name.press('Enter');
  await expect(page.getByRole('button', { name: 'Money Rookie', exact: true })).toHaveCount(0);
  await name.fill('  BizBot  ');
  await expect(page.locator('.intro-campsite')).toHaveCount(0);
  await name.press('Enter');
  const rookie = page.getByRole('button', { name: 'Money Rookie', exact: true });
  await expect(rookie).toBeFocused();
  await expect(page.locator('.intro-campsite img')).toBeVisible();
  await expect.poll(() => page.locator('.intro-campsite img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.intro-experience')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'artifacts/onboarding-intro.png' });
  await rookie.press('Enter');
  await expect(page.getByRole('heading', { name: 'Set up your character' })).toBeFocused();
  await expect(page.locator('.onboarding-summary')).toContainText('BizBot · Money Rookie');
  const avatar = page.getByRole('radio', { name: 'Generic Female', exact: true });
  await avatar.click();
  await expect(avatar).toBeFocused();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(name).toHaveValue('  BizBot  ');
  await page.getByRole('button', { name: 'Money Minded', exact: true }).click();
  await expect(avatar).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.onboarding-summary')).toContainText('Money Minded');
  await expect(page.locator('.onboarding-screen')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'artifacts/onboarding-character.png' });
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'You’re 18. What’s next?' })).toBeVisible();
  await expect(page.locator('.profile')).toContainText('BizBot');
  await expect(page.locator('.profile')).toContainText('Level 2 · Money Minded');
  await page.reload();
  await expect(page.locator('.profile h2')).toHaveText('BizBot');
  await expect(page.locator('.intro-screen')).toHaveCount(0);
});

test('mobile intro and setup work with reduced motion and unavailable storage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Blocked'); };
  });
  await page.goto('/');
  await page.getByLabel('Your name', { exact: true }).fill('Maya');
  await page.getByRole('button', { name: 'Continue with your name' }).click();
  const savvy = page.getByRole('button', { name: 'Financially Savvy', exact: true });
  await expect(savvy).toBeInViewport();
  await page.screenshot({ path: 'artifacts/onboarding-intro-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await savvy.click();
  await expect(page.getByRole('heading', { name: 'Set up your character' })).toBeVisible();
  await page.getByRole('radio', { name: 'Food Worker', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('.profile')).toContainText('Level 3 · Financially Savvy');
  await expect(page.locator('.profile')).toContainText('Food Worker');
  await expect(page.getByRole('heading', { name: 'You’re 18. What’s next?' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
