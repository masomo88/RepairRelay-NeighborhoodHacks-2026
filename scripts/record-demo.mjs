import { createApp } from '../server.js';
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_ENTRY || 'playwright');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = fileURLToPath(new URL('../assets/', import.meta.url));
const parentPages = process.argv.includes('--parent-pages');
const publicDir = fileURLToPath(new URL(parentPages ? '../../docs/repair-relay/' : '../docs/', import.meta.url));
await mkdir(outputDir, { recursive: true });
await mkdir(publicDir, { recursive: true });

const server = createApp();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-first-run', '--disable-gpu'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    recordVideo: { dir: outputDir, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:' + port, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const badge = document.createElement('div');
    badge.id = 'demo-caption';
    badge.setAttribute('aria-live', 'polite');
    Object.assign(badge.style, {
      position: 'fixed', left: '24px', bottom: '20px', zIndex: '9999',
      background: '#102f29', color: '#f7ffed', border: '2px solid #c7f55d',
      padding: '12px 17px', maxWidth: '640px', font: '700 18px Arial, sans-serif',
      lineHeight: '1.35', boxShadow: '6px 6px 0 rgba(0,0,0,.25)'
    });
    document.body.append(badge);
  });
  async function scene(label, ms, action) {
    if (action) await action();
    await page.locator('#demo-caption').evaluate((element, text) => { element.textContent = text; }, label);
    console.log(label);
    await page.waitForTimeout(ms);
  }
  await scene('Repair Relay · Fictional walkthrough · No real outcomes claimed', 16000);
  await scene('The problem: organising requests, skills, and safety for a local repair day.', 12000, () => page.locator('#guide').scrollIntoViewIfNeeded());
  await scene('Load a clearly labelled fictional event.', 12000, async () => { await page.locator('#load-example').click(); await page.locator('#workspace').scrollIntoViewIfNeeded(); });
  await scene('Three requests match skill and available time.', 16000, () => page.locator('#assignment-list').scrollIntoViewIfNeeded());
  await scene('The damaged cable stays on hold for qualified safety review.', 14000, () => page.locator('#safety-list').scrollIntoViewIfNeeded());
  await scene('Add a demo request. With no matching volunteer, it appears on the waitlist.', 14000, async () => {
    await page.locator('#request-form').scrollIntoViewIfNeeded();
    await page.locator('#request-form input[name="item"]').fill('Demo kettle lid');
    await page.locator('#request-form input[name="issue"]').fill('Loose handle');
    await page.locator('#request-form select[name="category"]').selectOption('household');
    await page.locator('#request-form select[name="minutes"]').selectOption('20');
    await page.locator('#request-form button[type="submit"]').click();
    await page.locator('#wait-list').scrollIntoViewIfNeeded();
  });
  await scene('Add a volunteer with that skill. The request is now matched.', 15000, async () => {
    await page.locator('#volunteer-form').scrollIntoViewIfNeeded();
    await page.locator('#volunteer-form input[name="alias"]').fill('Demo helper');
    await page.locator('#skill-choices input[value="household"]').check();
    await page.locator('#volunteer-capacity').selectOption('60');
    await page.locator('#volunteer-form button[type="submit"]').click();
    await page.locator('#assignment-list').scrollIntoViewIfNeeded();
  });
  await scene('Mark a fictional sample repaired: reported real outcomes remain zero.', 16000, async () => {
    await page.locator('#request-list .card').filter({ hasText: 'Commuter bicycle' }).locator('select').selectOption('repaired');
    await page.locator('.status-panel').scrollIntoViewIfNeeded();
  });
  await scene('The board can be exported as JSON or printed for the event.', 13000, async () => {
    await page.locator('.export-panel').scrollIntoViewIfNeeded();
    const download = page.waitForEvent('download');
    await page.locator('#export-json').click();
    await download;
  });
  await scene('Built during Neighborhood Hacks with Codex assistance · Open source', 11000, () => page.locator('.closing').scrollIntoViewIfNeeded());
  await context.close();
  const recorded = await page.video().path();
  const localTarget = fileURLToPath(new URL('../assets/repair-relay-demo.webm', import.meta.url));
  const publicTarget = fileURLToPath(new URL(parentPages ? '../../docs/repair-relay/demo.webm' : '../docs/demo.webm', import.meta.url));
  await copyFile(recorded, localTarget);
  await copyFile(recorded, publicTarget);
  console.log('Saved ' + localTarget);
  console.log('Published file ready at ' + publicTarget);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}


