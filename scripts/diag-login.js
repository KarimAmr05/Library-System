/* Diagnostic script: reproduces the sign-in flow in headless Chrome,
   captures console errors, URL transitions and final DOM state.
   Usage: node scripts/diag-login.js [email] [password] [--deep] */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4200';

const EMAIL = process.argv[2] || 'admin@library.local';
const PASSWORD = process.argv[3] || 'Admin@12345';
const DEEP = process.argv.includes('--deep');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  const logs = [];

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      logs.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${(err.stack || '').split('\n').slice(0, 6).join('\n')}`));
  page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.method()} ${req.url()} -> ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    if (res.status() >= 400) logs.push(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
  });

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    ]);

    // Give SPA time to settle / fail.
    await new Promise((r) => setTimeout(r, 4000));

    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyChildCount: document.body.childElementCount,
      hasAppRoot: !!document.querySelector('app-root'),
      appRootChildren: document.querySelector('app-root')?.children.length ?? -1,
      header: !!document.querySelector('.header'),
      sidebar: !!document.querySelector('.sidebar'),
      mainVisibleText: document.querySelector('#main-content')?.textContent?.trim().slice(0, 200) || null,
      visibleSnippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)
    }));

    console.log('=== PAGE STATE ===');
    console.log(JSON.stringify(state, null, 2));
    await page.screenshot({ path: require('path').join(__dirname, 'diag-login-result.png'), fullPage: true });
    console.log('Screenshot saved: diag-login-result.png');

    if (DEEP && state.header) {
      logs.length = 0;
      // Open the first catalog card → book detail page.
      await Promise.all([
        page.click('.grid app-book-card'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
      ]);
      await new Promise((r) => setTimeout(r, 2500));

      const detail = await page.evaluate(() => ({
        url: location.href,
        title: document.querySelector('.detail__title')?.textContent?.trim() || null,
        hasBorrowForm: !!document.querySelector('.detail__borrow'),
        adminNote: document.querySelector('.detail__admin-note')?.textContent?.trim() || null
      }));
      console.log('=== BOOK DETAIL ===');
      console.log(JSON.stringify(detail, null, 2));
    }
  } catch (err) {
    logs.push(`[script-error] ${err.message}`);
  }

  console.log('=== LOGS ===');
  console.log(logs.length ? logs.join('\n') : '(no errors captured)');

  await browser.close();
})();
