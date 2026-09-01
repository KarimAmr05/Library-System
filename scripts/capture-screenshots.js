/* Capture real UI screenshots of the Library System for the presentation. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4200';
const OUT = path.join(__dirname, '..', 'presentation', 'assets', 'screenshots');

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--ignore-certificate-errors', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 });

  const shoot = async (name) => {
    await new Promise((r) => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('saved', name);
  };

  const login = async (email, password) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email', { timeout: 20000 });
    await page.evaluate(() => { document.querySelector('#email').value = ''; document.querySelector('#password').value = ''; });
    await page.type('#email', email);
    await page.type('#password', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
    ]);
    await new Promise((r) => setTimeout(r, 1500));
  };

  // ---- Auth screens (no session needed) ----
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await shoot('01-login');

  await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await shoot('02-forgot-password');

  // Sign-up mode
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('button.login__mode-toggle');
  await page.click('button.login__mode-toggle');
  await new Promise((r) => setTimeout(r, 600));
  await shoot('03-sign-up');

  // ---- Admin flow ----
  await login('admin@library.local', 'Admin@12345');
  await shoot('04-catalog');

  await page.evaluate(() => { location.hash = ''; });
  await page.goto(`${BASE}/requests`, { waitUntil: 'networkidle2' });
  await shoot('05-admin-review');

  // Open the deny dialog for visual interest
  const denyBtn = await page.$('.btn--deny');
  if (denyBtn) {
    await denyBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await shoot('06-deny-dialog');
    await page.keyboard.press('Escape');
  }

  await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle2' });
  await shoot('07-notifications');

  // Book detail (admin view)
  await page.goto(`${BASE}/books`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.click('.grid app-book-card');
  await new Promise((r) => setTimeout(r, 1800));
  await shoot('08-book-detail');

  // ---- User flow ----
  await page.click('.header__signout');
  await new Promise((r) => setTimeout(r, 1200));
  await login('user@library.local', 'User@12345');
  await shoot('09-user-home');

  await page.goto(`${BASE}/requests/my`, { waitUntil: 'networkidle2' });
  await shoot('10-my-requests');

  await browser.close();
  console.log('ALL DONE');
})();
