import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function start(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('investly.player.v1', JSON.stringify({ name: 'Maya', avatarId: 'generic-female', literacyLevel: 1 }));
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return original.call(this, type as '2d', ...args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeEnabled();
}
async function pick(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}

test('double-click ends the demo without replaying; returning preserves results and single-click replays', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await start(page);
  for (const choice of ['Start working', 'No — keep it in cash', 'Call Mom to ask for money :(', 'Open an account', 'TFSA', 'Buy one ETF', 'QQQ', 'Continue investing in high risk', 'See my results']) await pick(page, choice);
  const before = await page.locator('.stat.cash').first().textContent();
  await page.getByRole('button', { name: 'Replay', exact: true }).dblclick({ delay: 180 });
  const ending = page.getByRole('dialog', { name: /^(That's Larp|Life and Risk Playground)$/ });
  await expect(ending).toBeVisible();
  await expect(page.locator('.larp-tail').last()).toHaveCSS('opacity', '0');
  await expect(page.locator('.larp-letter').last()).toHaveCSS('opacity', '1');
  const acronymWidth = (await page.locator('.larp-acronym').boundingBox())!.width;
  await page.screenshot({ path: 'test-results/larp-ending-intro.png' });
  await expect(ending.getByRole('heading')).toHaveAttribute('aria-label', 'Life and Risk Playground');
  await ending.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished));
  });
  await expect(page.locator('.larp-intro')).toBeHidden();
  await expect(ending.locator('p')).toHaveCount(0);
  await expect(page.locator('.larp-acronym')).toHaveText('Life and Risk Playground');
  const words = await page.locator('.larp-word').all();
  const bounds = await Promise.all(words.map(word => word.boundingBox()));
  expect(Math.max(...bounds.map(bound => bound!.y)) - Math.min(...bounds.map(bound => bound!.y))).toBeLessThan(1);
  expect((await page.locator('.larp-acronym').boundingBox())!.width).toBeGreaterThan(acronymWidth);
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(page.locator('.profile')).toContainText('Month 6');
  await page.screenshot({ path: 'test-results/larp-ending-desktop.png' });
  await pick(page, 'Back to game');
  await expect(ending).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Investment summary', exact: true })).toBeVisible();
  await expect(page.locator('.stat.cash').first()).toHaveText(before!);
  await pick(page, 'Replay');
  await expect(page.locator('.profile')).toContainText('Month 1');
  await expect(page.getByRole('dialog', { name: /^(That's Larp|Life and Risk Playground)$/ })).toHaveCount(0);
});

test('keyboard demo ending shortcut respects reduced motion, traps focus and blocks game shortcuts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await pick(page, 'Start working');
  await page.getByRole('button', { name: 'Replay', exact: true }).focus();
  await page.keyboard.press('Shift+Enter');
  const ending = page.getByRole('dialog', { name: /^(That's Larp|Life and Risk Playground)$/ });
  await expect(ending).toBeFocused();
  await expect(ending).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('1');
  await expect(page.locator('.profile')).toContainText('Month 2');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back to game' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Back to game' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(ending).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.profile')).toContainText('Month 1');
});

test('two taps reveal a full mobile Larp slide and return to the same game', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await start(page);
    await pick(page, 'Start working');
    const replay = page.getByRole('button', { name: 'Replay', exact: true });
    await replay.tap();
    await replay.tap();
    const ending = page.getByRole('dialog', { name: /^(That's Larp|Life and Risk Playground)$/ });
    await expect(ending).toBeVisible();
    await expect(page.locator('.profile')).toContainText('Month 2');
    const bounds = await ending.boundingBox();
    expect(bounds).toEqual({ x: 0, y: 0, width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.screenshot({ path: 'test-results/larp-ending-mobile.png' });
    await pick(page, 'Back to game');
    await expect(page.locator('.profile')).toContainText('Month 2');
  } finally { await context.close(); }
});
