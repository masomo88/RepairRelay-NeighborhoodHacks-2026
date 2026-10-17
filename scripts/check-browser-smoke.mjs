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
  const appPage = await browser.newPage();
  const appHtml = fileURLToPath(new URL('../public/index.html', import.meta.url));
  await appPage.goto(pathToFileURL(appHtml).href, { waitUntil: 'domcontentloaded' });
  await appPage.keyboard.press('Tab');
  const skipFocused = await appPage.evaluate(() => document.activeElement?.classList.contains('skip-link'));
  if (!skipFocused) throw new Error('Skip link is not first in keyboard order.');
  await appPage.keyboard.press('Enter');
  await appPage.waitForURL(/#workspace$/);
  await appPage.locator('#import-trigger').focus();
  await Promise.all([appPage.waitForEvent('filechooser'), appPage.keyboard.press('Enter')]);
  console.log('PASS: keyboard skip link and Import JSON file chooser');
  for (const width of [390, 320]) {
    await appPage.setViewportSize({ width, height: 844 });
    const overflow = await appPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) throw new Error('Horizontal overflow at ' + width + 'px: ' + overflow + 'px.');
  }
  console.log('PASS: 390px and 320px layouts avoid horizontal overflow');
} finally {
  await browser.close();
}
