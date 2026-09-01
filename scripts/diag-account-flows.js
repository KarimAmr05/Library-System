/* Diagnostic: forgot-password + reset-password + delete-account UI flows. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const { execSync } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4200';
const STAMP = Date.now();
const EMAIL = `delflow${STAMP}@library.local`;
const PASSWORD = 'Passw0rd!123';
const NEW_PASSWORD = 'NewPass9!xyz';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/requests')) errors.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`); });

  const snap = () => page.evaluate(() => ({
    url: location.href,
    alert: document.querySelector('[role="alert"]')?.textContent?.trim().slice(0, 120) || null,
    status: document.querySelector('[role="status"]')?.textContent?.trim().slice(0, 120) || null,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120)
  }));

  try {
    // 0) Register a throwaway account via API (fast path).
    execSync(
      `curl.exe -sk -X POST https://localhost:7060/api/auth/register -H "Content-Type: application/json" ` +
        `--data "{\\"fullName\\":\\"Delete Me\\",\\"email\\":\\"${EMAIL}\\",\\"password\\":\\"${PASSWORD}\\"}"`,
      { stdio: 'pipe' }
    );
    console.log('0) registered throwaway account:', EMAIL);

    // 1) Forgot password from the UI
    await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', EMAIL);
    await page.click('button[type="submit"]');
    await page
      .waitForSelector('[role="status"], [role="alert"]', { timeout: 15000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    console.log('1) FORGOT RESULT:', JSON.stringify(await snap()));

    // 2) Grab the reset token from the API log (SMTP disabled in dev).
    const log = require('fs').readFileSync(process.env.TEMP + '\\opencode\\api.log', 'utf8');
    const matches = [...log.matchAll(/reset-password\?token=([^&\s]+)&email=([^\s"]+)/g)];
    const last = matches[matches.length - 1];
    if (!last) throw new Error('no reset token found in api log');
    const token = last[1];
    console.log('2) reset token extracted');

    // 3) Open the emailed link in the UI and set a new password
    await page.goto(`${BASE}/reset-password?token=${token}&email=${encodeURIComponent(EMAIL)}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#newPassword', { timeout: 10000 });
    await page.type('#newPassword', NEW_PASSWORD);
    await page.type('#confirmPassword', 'WrongConfirm1');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 800)); // mismatch should block
    const mismatchShown = !!(await snap()).alert;
    console.log('3a) mismatch blocked:', mismatchShown);

    await page.evaluate(() => { document.querySelector('#confirmPassword').value = ''; });
    await page.type('#confirmPassword', NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="status"]', { timeout: 10000 });
    console.log('3b) RESET RESULT:', JSON.stringify(await snap()));

    // 4) Delete-account dialog from the sidebar (sign in first via UI)
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', EMAIL);
    await page.type('#password', NEW_PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    ]);
    await new Promise((r) => setTimeout(r, 1500));

    await page.click('.sidebar__delete');
    await page.waitForSelector('#delete-password', { timeout: 5000 });
    await page.type('#delete-password', 'WrongPass1!');
    await page.click('.btn--danger');
    await page.waitForSelector('[role="alert"]', { timeout: 10000 });
    console.log('4a) wrong pw:', JSON.stringify(await snap()));

    await page.evaluate(() => { document.querySelector('#delete-password').value = ''; });
    await page.type('#delete-password', NEW_PASSWORD);
    await page.click('.btn--danger');
    await page.waitForFunction(() => location.pathname === '/login', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('4b) DELETE RESULT:', JSON.stringify(await snap()));

    await page.screenshot({ path: path.join(__dirname, 'diag-delete-result.png'), fullPage: true });
  } catch (e) {
    errors.push(`[script] ${e.message}`);
  }

  console.log('=== ERRORS ===');
  console.log(errors.length ? errors.join('\n') : '(none)');
  await browser.close();
})();
