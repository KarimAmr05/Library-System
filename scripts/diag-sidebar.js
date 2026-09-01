/* Visual check: desktop sidebar toggle + Cairo time display. */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4200';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', 'admin@library.local');
    await page.type('#password', 'Admin@12345');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    ]);
    await new Promise((r) => setTimeout(r, 2000));

    const expanded = await page.evaluate(() => ({
      hasToggle: !!document.querySelector('.sidebar__toggle--desktop'),
      sidebarWidth: document.querySelector('.sidebar')?.getBoundingClientRect().width
    }));
    console.log('EXPANDED:', JSON.stringify(expanded));
    await page.screenshot({ path: path.join(__dirname, 'diag-sidebar-expanded.png') });

    // Collapse via the in-sidebar button
    await page.click('.sidebar__toggle--desktop');
    await new Promise((r) => setTimeout(r, 600));
    const collapsed = await page.evaluate(() => ({
      sidebarWidth: document.querySelector('.sidebar')?.getBoundingClientRect().width,
      ariaExpanded: document.querySelector('.sidebar__toggle--desktop')?.getAttribute('aria-expanded')
    }));
    console.log('COLLAPSED:', JSON.stringify(collapsed));
    await page.screenshot({ path: path.join(__dirname, 'diag-sidebar-collapsed.png') });

    // Expand again
    await page.click('.sidebar__toggle--desktop');
    await new Promise((r) => setTimeout(r, 600));
    const reExpanded = await page.evaluate(
      () => document.querySelector('.sidebar')?.getBoundingClientRect().width
    );
    console.log('RE-EXPANDED width:', reExpanded);

    // Cairo time on the review queue
    await page.goto(`${BASE}/requests`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    const cairo = await page.evaluate(() => {
      const abs = document.querySelector('.row__meta-abs');
      return abs ? abs.textContent.trim() : null;
    });
    console.log('CAIRO TIME SAMPLE:', cairo);
    await page.screenshot({ path: path.join(__dirname, 'diag-sidebar-review.png'), fullPage: false });
  } catch (e) {
    errors.push(`[script] ${e.message}`);
  }
  console.log('=== ERRORS ===');
  console.log(errors.length ? errors.join('\n') : '(none)');
  await browser.close();
})();
