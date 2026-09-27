import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function start(page: Page) {
  await page.goto('/');
  await page.getByLabel('Your name',{exact:true}).fill('Maya');
  await page.getByRole('radio',{name:'Generic Female',exact:true}).click();
  await page.getByRole('radio',{name:/Level 1/}).click();
  await page.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.getByRole('heading',{name:'You’re 18. What’s next?'})).toBeVisible();
}
async function pick(page: Page, name: string) { await page.getByRole('button',{name,exact:true}).click(); }
async function noWebGL(page: Page) {
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return original.call(this,type as '2d',...args);} as typeof HTMLCanvasElement.prototype.getContext;});
}
async function checkFullScreenPanel(page: Page) {
  const panel=page.getByRole('dialog');await expect(panel).toBeVisible();
  const bounds=await panel.boundingBox();
  expect(bounds?.x).toBe(0);expect(bounds?.y).toBe(0);
  expect(bounds?.width).toBe(page.viewportSize()!.width);expect(bounds?.height).toBe(page.viewportSize()!.height);
  await page.keyboard.press('Escape');await expect(panel).toBeVisible();
  for(let i=0;i<5;i++){await page.keyboard.press('Tab');expect(await panel.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
}
async function reachInvesting(page: Page) {
  await pick(page,'Start working');await pick(page,'No — keep it in cash');await pick(page,'Call Mom to ask for money :(');
  await pick(page,'Open an account');await pick(page,'TFSA');await pick(page,'Buy one ETF');await pick(page,'QQQ');
}
test('campsite story advances immediately, red medical alert, final fullscreen summary and replay',async({page})=>{
  test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);await expect(page.locator('[data-city-ready="true"]')).toBeVisible({timeout:30000});
  await page.screenshot({path:'artifacts/pitch-start.png',fullPage:true});
  await page.keyboard.press('2');
  await expect(page.locator('.profile')).toContainText('Month 2');await expect(page.locator('.financial-update')).toContainText('BizTech mascot');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/^(Continue|Apply update|Make this choice)$/})).toHaveCount(0);
  await pick(page,'No — keep it in cash');await checkFullScreenPanel(page);
  await expect(page.getByRole('dialog')).toHaveClass(/danger/);await expect(page.locator('.alert-panel')).toHaveCSS('border-color','rgb(231, 118, 127)');
  await expect(page.getByRole('dialog')).toContainText('You snuck into a frat party');
  await page.screenshot({path:'artifacts/pitch-alert.png'});
  await pick(page,'Take money from my emergency fund');await expect(page.getByRole('heading',{name:'Your emergency fund is empty!'})).toBeVisible();
  await pick(page,'Call Mom to ask for money :(');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.profile')).toContainText('Month 4');await expect(page.locator('.financial-update')).toContainText('Mom gave you $200');
  await pick(page,'Open an account');await pick(page,'TFSA');await expect(page.getByRole('heading',{name:'You got a raise!'})).toBeVisible();
  await page.keyboard.press('4');await expect(page.getByRole('heading',{name:'Which ETF would you like to invest in?'})).toBeVisible();
  await pick(page,'Learn more about QQQ');await expect(page.getByRole('dialog')).toContainText('not verified historical CAGR');await page.keyboard.press('Escape');
  await page.screenshot({path:'artifacts/pitch-etfs.png',fullPage:true});
  await pick(page,'QQQ');await expect(page.locator('.profile')).toContainText('Month 6');await expect(page.locator('.stat.investment')).toContainText('$1,600');
  await expect(page.getByRole('heading',{name:'Omg congrats! Your investments grew.'})).toBeVisible();
  await pick(page,'Continue investing in high risk');await checkFullScreenPanel(page);
  await expect(page.getByRole('heading',{name:'Your choices added up.'})).toBeVisible();await expect(page.getByRole('dialog')).not.toHaveClass(/danger/);
  await expect(page.locator('.ending-summary')).toContainText('$1,600.00');await expect(page.locator('.ending-summary .summary-changed')).toHaveCount(3);
  await pick(page,'See my results');await expect(page.getByRole('region',{name:'Investment summary',exact:true})).toBeVisible();
  await expect(page.locator('.results-summary')).toHaveCSS('opacity','1');
  await page.screenshot({path:'artifacts/pitch-result.png'});
  await pick(page,'View final summary');
  await pick(page,'Compare your paths');await expect(page.getByRole('dialog',{name:'Two paths. A clearer picture.'})).toBeVisible();await pick(page,'Close dialog');
  await pick(page,'Try a different story');await expect(page.getByRole('dialog')).toHaveCount(0);
  await pick(page,'Compare paths');await expect(page.getByRole('dialog')).toContainText('Continue investing in high risk');
  await page.reload();await pick(page,'Compare paths');await expect(page.getByRole('dialog')).toContainText('QQQ');expect(errors).toEqual([]);
});
test('mobile red alert, savings path, and final summary work without WebGL or storage',async({page})=>{
  await noWebGL(page);await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Blocked');};Storage.prototype.setItem=()=>{throw new Error('Blocked');};});
  await page.setViewportSize({width:390,height:844});await start(page);await expect(page.getByRole('heading',{name:'Every choice still counts.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await pick(page,'Uni');await pick(page,'Yes — save $200');await checkFullScreenPanel(page);
  await page.screenshot({path:'artifacts/pitch-alert-mobile.png'});
  await pick(page,'Take money from my emergency fund');await pick(page,'Put it in a savings account');await pick(page,'Work with an advisor');await pick(page,'FHSA');await pick(page,'XUS');
  await pick(page,'Buy a penthouse in Miami');await pick(page,'See my options');await pick(page,'Keep grinding');await checkFullScreenPanel(page);
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
  await page.screenshot({path:'artifacts/pitch-mobile.png'});
  await pick(page,'Back to dashboard');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('progressbar',{name:'Miami penthouse goal'})).toBeVisible();
  await pick(page,'View final summary');await expect(page.getByRole('heading',{name:'Your choices added up.'})).toBeVisible();await pick(page,'Back to dashboard');
  await expect(page.getByRole('tab',{name:'Your ledger'})).toHaveCount(0);await expect(page.locator('.world-status')).toHaveCount(0);
  await pick(page,'How this simulation works');await expect(page.getByRole('dialog')).toContainText('Your financial update stays in the sidebar');await pick(page,'Close dialog');
});
test('BizTech and managed investing preserve fund balances through the automatic progression',async({page})=>{
  await noWebGL(page);await start(page);await pick(page,'Start working');await pick(page,'Yes — save $200');await pick(page,'Take money from my emergency fund');await pick(page,'Buy BizTech');
  await expect(page.locator('.holdings-list')).toContainText('BizTech');await pick(page,'Use a managed investing app');await pick(page,'RRSP');await pick(page,'VAB');
  await expect(page.locator('.profile')).toContainText('Month 6');await pick(page,'Invest in low risk');
  await expect(page.getByRole('dialog')).toContainText('Your choices added up.');await expect(page.locator('.stat.debt')).toContainText('$0');await expect(page.locator('.holdings-list')).toContainText('VAB');
});
test('cash-matched rental opens the final summary immediately and highlights changed accounts',async({page})=>{
  await noWebGL(page);await start(page);await reachInvesting(page);await pick(page,'Buy a penthouse in Miami');
  await expect(page.locator('.story-description')).toContainText('$995,000.00');await pick(page,'See my options');await checkFullScreenPanel(page);
  await expect(page.getByRole('button',{name:'Rent a penthouse to larp and sell a course'})).toContainText('$3,400');
  await expect(page.locator('.alert-panel .story-card > div').nth(1)).toHaveCSS('opacity','1');await page.screenshot({path:'artifacts/pitch-penthouse.png'});
  await pick(page,'Rent a penthouse to larp and sell a course');await checkFullScreenPanel(page);
  await expect(page.getByRole('heading',{name:'Your choices added up.'})).toBeVisible();await expect(page.locator('.stat.cash').first()).toContainText('$0');
  await expect(page.getByRole('dialog')).toContainText('Course revenue so far: $0');
  await expect(page.locator('.ending-summary')).toContainText('$1,600.00');
  await expect(page.locator('.ending-summary .summary-changed').first()).toHaveCSS('border-radius','0px');
  await expect(page.locator('.ending-summary .summary-changed').first()).toHaveCSS('background-color','rgb(0, 39, 37)');
  await expect(page.locator('.alert-panel .story-card > div').nth(1)).toHaveCSS('opacity','1');await page.screenshot({path:'artifacts/pitch-rental-summary.png'});
  await page.reload();await pick(page,'Compare paths');await expect(page.getByRole('dialog')).toContainText('Miami: rent a penthouse and sell a course');
});
test('sidebar summaries have no advance button and dark square backgrounds only on changed rows',async({page})=>{
  await noWebGL(page);await page.setViewportSize({width:390,height:844});await start(page);
  await page.getByRole('button',{name:'Start working',exact:true}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
  await expect(page.locator('.profile')).toContainText('Month 2');await expect(page.locator('.stat.cash').first()).toContainText('$1,800');
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.financial-update')).toBeVisible();
  await expect(page.locator('.financial-update button')).toHaveCount(0);await expect(page.getByRole('button',{name:/^(Continue|Apply update)$/})).toHaveCount(0);
  await expect(page.locator('.update-changed')).toHaveCount(2);
  const changed=page.locator('.update-changed').first();await expect(changed).toContainText('Cash');
  await expect(changed.locator('th')).toHaveCSS('background-color','rgb(0, 39, 37)');await expect(changed.locator('th')).toHaveCSS('border-radius','0px');
  await expect(page.locator('.update-table tr').filter({has:page.getByRole('rowheader',{name:'Investments',exact:true})})).toHaveAttribute('data-changed','false');
  await page.locator('.financial-update').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/pitch-financial-update.png',fullPage:true});
  await pick(page,'Yes — save $200');await expect(page.locator('.stat.savings')).toContainText('$200');
  await expect(page.locator('.update-changed')).toHaveCount(3);await expect(page.locator('.financial-update')).toContainText('$200 moved into your emergency fund');
  await pick(page,'Take money from my emergency fund');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.profile')).toContainText('Month 4');
  await expect(page.locator('.financial-update')).toContainText('covered the $200 bill');
});

test('edit player name and avatar without resetting finances, then persist and cancel drafts',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);await expect(page.locator('[data-city-ready="true"]')).toBeVisible({timeout:30000});
  await expect(page.locator('.view-tabs, .ledger-view, .world-status')).toHaveCount(0);
  await pick(page,'Start working');await expect(page.locator('.profile')).toContainText('Month 2');
  const finances=await page.locator('.finances').innerText();
  await expect(page.getByRole('progressbar',{name:'Month 2 of 6'})).toHaveAttribute('aria-valuenow','2');
  await page.getByRole('button',{name:/Edit player, currently Maya/}).click();
  await expect(page.getByRole('dialog',{name:'Edit your player'})).toBeVisible();
  await expect(page.getByLabel('Player name',{exact:true})).toHaveValue('Maya');
  await page.getByLabel('Player name',{exact:true}).fill('   ');await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeDisabled();
  await page.getByLabel('Player name',{exact:true}).fill('  Alex  ');await page.getByRole('radio',{name:'Generic Male',exact:true}).click();
  const avatarLoaded=page.waitForResponse(response=>response.url().endsWith('/models/avatars/generic-male.glb') && response.ok());
  await pick(page,'Save changes');await avatarLoaded;
  await expect(page.locator('.profile h2')).toHaveText('Alex');await expect(page.locator('.profile img')).toHaveAttribute('src','/models/avatars/generic-male.webp');
  await expect(page.locator('[data-city-ready="true"]')).toHaveAttribute('aria-label',"Campsite with a tent, a dog, and Alex's selected character");
  await expect(page.locator('.profile')).toContainText('Month 2');expect(await page.locator('.finances').innerText()).toBe(finances);
  await pick(page,'Settings');await page.getByRole('button',{name:/Change name or avatar/}).click();
  await page.getByLabel('Player name',{exact:true}).fill('Discard me');await page.getByRole('radio',{name:'Chicken Guy',exact:true}).click();await pick(page,'Cancel');
  await page.getByRole('button',{name:/Change name or avatar/}).click();await expect(page.getByLabel('Player name',{exact:true})).toHaveValue('Alex');await expect(page.getByRole('radio',{name:'Generic Male',exact:true})).toHaveAttribute('aria-checked','true');
  await page.screenshot({path:'artifacts/edit-player.png'});await page.keyboard.press('Escape');
  await page.reload();await expect(page.locator('.profile h2')).toHaveText('Alex');await expect(page.locator('.profile img')).toHaveAttribute('src','/models/avatars/generic-male.webp');expect(errors).toEqual([]);
});
test('player edits work on mobile when browser storage is unavailable',async({page})=>{
  await noWebGL(page);await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Blocked');};Storage.prototype.setItem=()=>{throw new Error('Blocked');};});
  await page.setViewportSize({width:390,height:650});await start(page);await pick(page,'Start working');
  await pick(page,'Settings');await page.getByRole('button',{name:/Change name or avatar/}).click();
  await page.getByLabel('Player name',{exact:true}).fill('Jo');await page.getByRole('radio',{name:'Food Worker',exact:true}).click();
  await pick(page,'Save changes');await expect(page.locator('.profile h2')).toHaveText('Jo');await expect(page.locator('.profile')).toContainText('Food Worker');await expect(page.locator('.profile')).toContainText('Month 2');await expect(page.locator('.stat.cash').first()).toContainText('$1,800');
  await pick(page,'Settings');await expect(page.getByRole('dialog')).toContainText('Changes last for this session');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test('results dashboard opens from the final breakdown and preserves chart data and controls', async ({page}) => {
  await noWebGL(page); await start(page); await reachInvesting(page);
  await pick(page,'Continue investing in high risk');
  await expect(page.getByRole('dialog')).toBeVisible();
  await pick(page,'See my results');
  const summary=page.getByRole('region',{name:'Investment summary',exact:true});
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(summary).toBeVisible();
  await expect(page.getByRole('heading',{name:'Portfolio Growth',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'This month’s summary',exact:true})).toBeVisible();
  await expect(summary.locator('.investment-chart > svg')).toHaveAttribute('aria-label','Portfolio value $1,600.00; net contributions $1,500.00');
  await expect(summary.locator('.growth-market-change')).toContainText('+$100.00');
  await expect(summary.locator('.portfolio-point')).toHaveCount(7);
  await expect(summary).toContainText('QQQ');
  const chart=await summary.locator('.investment-chart').boundingBox();
  const feedback=await summary.locator('.monthly-summary').boundingBox();
  expect(chart!.x+chart!.width).toBeLessThan(feedback!.x);
  expect(feedback!.y+feedback!.height).toBeLessThan(page.viewportSize()!.height);
  await pick(page,'Close summary'); await expect(summary).toHaveCount(0);
  await expect(page.getByRole('button',{name:'View monthly summary'})).toBeFocused();
  await pick(page,'View monthly summary'); await expect(summary).toBeVisible();
  await page.keyboard.press('Escape'); await expect(summary).toHaveCount(0);
  await pick(page,'View final summary'); await expect(page.getByRole('dialog')).toBeVisible();
  await pick(page,'See my results'); await expect(summary).toBeVisible();
  await pick(page,'Replay'); await expect(summary).toHaveCount(0);
  await expect(page.locator('.profile')).toContainText('Month 1');
});

test('mobile results keep the new penthouse goal and show stacked feedback without storage', async ({page}) => {
  await noWebGL(page);
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Blocked');};Storage.prototype.setItem=()=>{throw new Error('Blocked');};});
  await page.setViewportSize({width:390,height:844}); await start(page);
  await pick(page,'Uni'); await pick(page,'Yes — save $200'); await pick(page,'Take money from my emergency fund');
  await pick(page,'Put it in a savings account'); await pick(page,'Work with an advisor'); await pick(page,'FHSA'); await pick(page,'XUS');
  await pick(page,'Buy a penthouse in Miami'); await pick(page,'See my options'); await pick(page,'Keep grinding'); await pick(page,'See my results');
  const summary=page.getByRole('region',{name:'Investment summary',exact:true});
  await expect(summary).toBeVisible();
  await expect(summary.locator('.investment-chart > svg')).toHaveAttribute('aria-label','Portfolio value $508.75; net contributions $500.00');
  await expect(summary.locator('.growth-market-change')).toContainText('+$8.75');
  await expect(summary).toContainText('Kept your portfolio invested');
  await expect(summary.locator('.growth-note')).toHaveCount(0);
  const chart=await summary.locator('.investment-chart').boundingBox();
  const feedback=await summary.locator('.monthly-summary').boundingBox();
  expect(chart!.y+chart!.height).toBeLessThan(feedback!.y);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await summary.locator('.monthly-summary').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading',{name:'What to learn next'})).toBeInViewport();
  await page.screenshot({path:'artifacts/results-dashboard-mobile.png'});
  await pick(page,'Close summary');
  await page.getByRole('progressbar',{name:'Miami penthouse goal'}).scrollIntoViewIfNeeded();
  await expect(page.locator('.goal-total')).toContainText('$2,909');
  await pick(page,'View monthly summary');
  await expect(summary).toBeVisible();
});
