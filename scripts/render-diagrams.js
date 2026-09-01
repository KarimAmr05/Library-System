/* Render all diagram HTML files to PNG via headless Chrome. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC = path.join(__dirname, '..', 'presentation', 'assets', 'diagrams', 'src');
const OUT = path.join(__dirname, '..', 'presentation', 'assets', 'diagrams');

const files = [
  'system-architecture',
  'frontend-architecture',
  'backend-architecture',
  'database-architecture',
  'authentication-flow',
  'frontend-backend-flow',
  'borrow-workflow'
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=2']
  });
  const page = await browser.newPage();

  for (const name of files) {
    await page.goto('file:///' + path.join(SRC, name + '.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    const el = await page.$('#diagram');
    await el.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('rendered', name);
  }

  await browser.close();
  console.log('ALL DIAGRAMS DONE');
})();
