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
async function next(page: Page) { await pick(page,'Continue'); }
async function decision(page: Page, name: string) { await pick(page,name); await next(page); }
async function noWebGL(page: Page) {
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return original.call(this,type as '2d',...args);} as typeof HTMLCanvasElement.prototype.getContext;});
}
async function checkFullScreenAlert(page: Page) {
  const alert=page.getByRole('dialog');
  await expect(alert).toBeVisible();
  const bounds=await alert.boundingBox();
  expect(bounds?.x).toBe(0);expect(bounds?.y).toBe(0);
  expect(bounds?.width).toBe(page.viewportSize()!.width);expect(bounds?.height).toBe(page.viewportSize()!.height);
  const panel=await page.locator('.alert-panel').boundingBox();
  expect(Math.abs(panel!.x+panel!.width/2-page.viewportSize()!.width/2)).toBeLessThan(2);
  expect(Math.abs(panel!.y+panel!.height/2-page.viewportSize()!.height/2)).toBeLessThan(2);
  await page.keyboard.press('Escape');await expect(alert).toBeVisible();
  for(let i=0;i<5;i++){await page.keyboard.press('Tab');expect(await alert.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
}
test('direct choices, fullscreen medical alert, ETF investing, result and replay',async({page})=>{
  test.setTimeout(150000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);
  await expect(page.locator('[data-city-ready="true"]')).toBeVisible({timeout:30000});
  await expect(page.locator('.town-label, .building-sign')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Make this choice'})).toHaveCount(0);
  await page.screenshot({path:'artifacts/pitch-start.png',fullPage:true});
  await page.keyboard.press('2');await expect(page.locator('.result-description')).toContainText('BizTech mascot');await next(page);
  await decision(page,'No — keep it in cash');
  await checkFullScreenAlert(page);
  await expect(page.getByRole('dialog')).toContainText('You snuck into a frat party');
  await page.screenshot({path:'artifacts/pitch-alert.png'});
  await pick(page,'Take money from my emergency fund');await expect(page.getByRole('heading',{name:'Your emergency fund is empty!'})).toBeVisible();
  await expect(page.locator('.choices button')).toHaveCount(1);await decision(page,'Call Mom to ask for money :(');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await pick(page,'Open an account');await pick(page,'TFSA');await expect(page.locator('.profile')).toContainText('Month 4');await next(page);
  await expect(page.getByRole('heading',{name:'You got a raise!'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Invest it',exact:true})).toHaveCount(0);
  await page.keyboard.press('4');await expect(page.getByRole('heading',{name:'Which ETF would you like to invest in?'})).toBeVisible();
  await page.getByRole('button',{name:'Learn more about QQQ'}).click();await expect(page.getByRole('dialog')).toContainText('not verified historical CAGR');await page.keyboard.press('Escape');
  await page.screenshot({path:'artifacts/pitch-etfs.png',fullPage:true});
  await pick(page,'QQQ');await expect(page.locator('.stat.investment')).toContainText('$1,250');await next(page);
  await expect(page.getByRole('heading',{name:'Omg congrats! Your investments grew.'})).toBeVisible();await expect(page.locator('.story-description')).toContainText('$100.00');
  await pick(page,'Continue investing in high risk');await pick(page,'See my result');
  await expect(page.getByRole('heading',{name:'Your choices added up.'})).toBeVisible();await expect(page.locator('.profile')).toContainText('Month 6');
  await expect(page.locator('.stat.investment')).toContainText('$1,600');await expect(page.locator('.stat.debt')).toContainText('$0');
  await page.screenshot({path:'artifacts/pitch-result.png',fullPage:true});
  await pick(page,'Try a different story');await pick(page,'Compare paths');await expect(page.getByRole('dialog')).toContainText('Continue investing in high risk');
  await page.reload();await pick(page,'Compare paths');await expect(page.getByRole('dialog')).toContainText('QQQ');expect(errors).toEqual([]);
});
test('mobile alert and university path work without WebGL or storage',async({page})=>{
  await noWebGL(page);await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Blocked');};Storage.prototype.setItem=()=>{throw new Error('Blocked');};});
  await page.setViewportSize({width:390,height:844});await start(page);await expect(page.getByRole('heading',{name:'Every choice still counts.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await decision(page,'Uni');await decision(page,'Yes — save $200');await checkFullScreenAlert(page);
  await page.screenshot({path:'artifacts/pitch-alert-mobile.png'});
  await decision(page,'Take money from my emergency fund');await decision(page,'Put it in a savings account');
  await pick(page,'Work with an advisor');await pick(page,'FHSA');await pick(page,'XUS');await next(page);
  await pick(page,'Buy a penthouse in Miami');await pick(page,'See my result');
  await expect(page.getByRole('progressbar',{name:'Miami penthouse goal'})).toBeVisible();
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();await expect(page.locator('.stat.savings')).toContainText('$0');
  await page.screenshot({path:'artifacts/pitch-mobile.png',fullPage:true});
  await page.getByRole('tab',{name:'Your ledger'}).click();await expect(page.getByRole('heading',{name:'Every dollar has a story.'})).toBeVisible();
  await pick(page,'How this simulation works');await expect(page.getByRole('dialog')).toContainText('Click a choice to apply it immediately');await pick(page,'Close dialog');
});
test('BizTech, late account opening, managed route and VAB',async({page})=>{
  await noWebGL(page);await start(page);await decision(page,'Start working');await decision(page,'Yes — save $200');await decision(page,'Take money from my emergency fund');await decision(page,'Buy BizTech');
  await expect(page.locator('.holdings-list')).toContainText('BizTech (fictional)');await pick(page,'Use a managed investing app');await pick(page,'RRSP');
  await pick(page,'VAB');await expect(page.locator('.profile')).toContainText('Month 5');await next(page);
  await pick(page,'Invest in low risk');await pick(page,'See my result');await expect(page.locator('.stat.debt')).toContainText('$0');await expect(page.locator('.holdings-list')).toContainText('VAB');
});
