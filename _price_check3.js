// _price_check3.js — снимок блока "Сравнение"
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:8765/pricing.html', { waitUntil: 'networkidle0' });

  for (const theme of ['dark', 'light']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await new Promise(r => setTimeout(r, 400));

    // Найдём блок "Все варианты на одной схеме"
    const handle = await page.evaluateHandle(() => {
      const h = Array.from(document.querySelectorAll('h2')).find(x => x.textContent.includes('Все варианты'));
      return h ? h.closest('section') : null;
    });
    const el = handle.asElement();
    if (el) {
      await el.screenshot({ path: `_compare_${theme}.png` });
    }
  }
  await browser.close();
})();
