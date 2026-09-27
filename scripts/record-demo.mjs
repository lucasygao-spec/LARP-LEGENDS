import { chromium } from '@playwright/test';
import { mkdir, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';

await mkdir('artifacts/raw-video', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-webgl'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1160 }, recordVideo: { dir: 'artifacts/raw-video', size: { width: 1440, height: 1160 } } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173');
await page.locator('.town-label').filter({ hasText: 'Your home' }).waitFor();
await page.evaluate(() => {
  const caption = document.createElement('div'); caption.id = 'demo-caption';
  caption.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:1000;background:#294b39f5;color:#fffef5;padding:14px 26px;border-radius:10px;box-shadow:0 4px 24px #23382722;font:500 16px Manrope,sans-serif;text-align:center;width:max-content;max-width:90%;pointer-events:none';
  document.body.appendChild(caption);
});
const started = Date.now();
const caption = text => page.evaluate(text => { document.getElementById('demo-caption').textContent = text; }, text);
const at = async seconds => { const remaining = started + seconds * 1000 - Date.now(); if (remaining > 0) await page.waitForTimeout(remaining); };
const pick = async name => { await page.getByRole('button', { name: new RegExp(name) }).click(); await page.getByRole('button', { name: 'Make this choice' }).click(); };
const next = async () => {
  await page.getByRole('button', { name: /Continue to Month|Choose my financial goal/ }).click();
  if (await page.getByRole('dialog', { name: 'An unexpected expense' }).count()) await page.getByRole('button', { name: 'See my options' }).click();
};
const decision = async name => { await pick(name); await next(); };

await caption('Meet Maya, 18. Start with $1,000 and choose your path.');
await at(5); await decision('Start Working');
await caption('A birthday gift. An account. Your first investing decision.');
await pick('Start Investing');
await page.getByRole('button', { name: 'TFSA', exact: true }).click();
await page.getByRole('button', { name: 'Open this account' }).click();
await next(); await at(15); await decision('Buy a diversified ETF');
await caption('A diversified ETF spreads exposure. Sample markets move both ways.');
await at(22); await pick('Build an emergency fund');
await caption('Saving $500 builds a shield around your home.');
await page.screenshot({ path: 'artifacts/investly-shield.png', fullPage: true });
await at(28); await next(); await pick('Cover the repair');
await caption('A $700 repair: $500 savings + $200 cash. Investments stay untouched.');
await at(35); await next(); await pick('Automatically invest');
await caption('Recurring investment created: $100 a month into an ETF.');
await next();
for (let month = 7; month <= 12; month++) await decision('Keep my plan going');
await page.getByRole('button', { name: 'First Home', exact: true }).click();
await page.getByRole('button', { name: 'Set my goal' }).click();
await page.getByRole('heading', { name: 'Your future has a starting point.' }).waitFor();
await page.locator('.savings-goal').scrollIntoViewIfNeeded();
await caption('Your contributions, market growth, and progress toward a first home.');
await at(56); await caption('Investly makes your first investing journey visible.');
await at(61);
await page.waitForTimeout(5000); // Let the final goal and caption reach recorded frames.
const video = page.video(); await context.close(); await browser.close();
const source = await video.path();
const encoder = path.join(homedir(), 'Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac');
const output = 'artifacts/investly-demo.webm';
// Preserve the entire journey, including the final goal, within one minute.
const probe = spawnSync(encoder, ['-i', source], { encoding: 'utf8' });
const duration = probe.stderr?.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
const seconds = duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0;
const result = seconds > 0 ? spawnSync(encoder, ['-y', '-itsscale', String(60 / seconds), '-i', source, '-t', '60', '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-threads', '4', '-b:v', '2200k', output], { encoding: 'utf8' }) : { status: 1, stderr: 'Could not read capture duration.' };
if (result.status !== 0) { await rename(source, output); console.warn('Saved untrimmed capture; encoder output:', result.stderr); }
console.log(`Recorded ${output}`);
