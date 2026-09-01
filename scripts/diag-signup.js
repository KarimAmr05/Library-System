/* Diagnostic: full sign-up flow in headless Chrome.
   1) Toggle to sign-up, register a unique account -> expect /books + User header
   2) Sign out, sign up again with the SAME email -> expect 409 message
   3) Sign in with the new account -> expect /books */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4200';
const STAMP = Date.now();
const EMAIL = `student${STAMP}@library.local`;
const PASSWORD = 'Passw0rd!';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`); });

  const snap = () => page.evaluate(() => ({
    url: location.href,
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() || null,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)
  }));

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.waitForSelector('button.login__mode-toggle', { timeout: 10000 });

    // 1) Sign-up
    await page.click('button.login__mode-toggle');
    await new Promise((r) => setTimeout(r, 1000));
    const afterToggle = await snap();
    console.log('AFTER TOGGLE:', JSON.stringify(afterToggle));
    console.log('fullName present:', await page.evaluate(() => !!document.querySelector('#fullName')));
    await page.type('#fullName', 'Browser Test Student');
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    ]);
    await new Promise((r) => setTimeout(r, 2500));
    console.log('1) SIGN-UP RESULT:', JSON.stringify(await snap()));

    // Sign out to reset session
    await page.click('.header__signout');
    await page.waitForSelector('#email', { timeout: 10000 });

    // 2) Duplicate sign-up with same email
    await page.click('button.login__mode-toggle');
    await page.waitForSelector('#fullName', { timeout: 5000 });
    await page.type('#fullName', 'Duplicate');
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2500));
    console.log('2) DUPLICATE RESULT:', JSON.stringify(await snap()));

    // 3) Sign in with the registered account
    await page.waitForSelector('button.login__mode-toggle', { timeout: 5000 });
    await page.click('button.login__mode-toggle'); // back to sign-in
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.evaluate(() => { document.querySelector('#email').value = ''; document.querySelector('#password').value = ''; });
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    ]);
    await new Promise((r) => setTimeout(r, 2500));
    console.log('3) SIGN-IN RESULT:', JSON.stringify(await snap()));

    await page.screenshot({ path: path.join(__dirname, 'diag-signup-result.png'), fullPage: true });
  } catch (e) {
    errors.push(`[script] ${e.message}`);
  }

  console.log('=== ERRORS ===');
  console.log(errors.length ? errors.join('\n') : '(none)');
  await browser.close();
})();
