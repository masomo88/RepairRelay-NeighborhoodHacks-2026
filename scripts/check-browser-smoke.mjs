import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_ENTRY || 'playwright');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const html = fileURLToPath(new URL('../test/browser-smoke.html', import.meta.url));
const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
  args: ['--allow-file-access-from-files', '--no-first-run', '--disable-gpu']
});
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(html).href);
  await page.locator('#result').waitFor({ state: 'visible' });
  await page.waitForFunction(() => /^(PASS|FAIL):/.test(document.querySelector('#result')?.textContent || ''), null, { timeout: 15000 });
  const result = await page.locator('#result').textContent();
  console.log(result);
  if (!result.startsWith('PASS:')) process.exitCode = 1;
} finally {
  await browser.close();
}
