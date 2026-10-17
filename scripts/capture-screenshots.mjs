import { createApp } from '../server.js';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_ENTRY || 'playwright');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = fileURLToPath(new URL('../assets/', import.meta.url));
await mkdir(outputDir, { recursive: true });

const server = createApp();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-first-run', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#load-example').click();
  await page.locator('.status-panel').scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL('../assets/planning-board.png', import.meta.url)) });
  await page.locator('#safety-list').scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL('../assets/safety-review.png', import.meta.url)) });
  console.log('Saved two screenshots with labelled fictional example data.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
