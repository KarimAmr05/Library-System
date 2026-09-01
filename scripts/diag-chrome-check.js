/* Verify shell chrome is hidden on auth pages, visible on app pages. */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4200';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const results = {};

  for (const route of ['/reset-password?token=x&email=y@z.t', '/forgot-password', '/login', '/books']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    results[route.split('?')[0]] = await page.evaluate(() => ({
      sidebar: !!document.querySelector('.sidebar'),
      header: !!document.querySelector('.header')
    }));
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
