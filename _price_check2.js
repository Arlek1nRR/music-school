// _price_check2.js — повторная проверка после удаления столбца "Пробное"
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  await page.goto('http://localhost:8765/pricing.html', { waitUntil: 'networkidle0' });

  // Тёмная тема
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('theme', 'dark'); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: '_price_dark_full.png', fullPage: true });
  const indiv = await page.$('#individual');
  const group = await page.$('#group');
  if (indiv) await indiv.screenshot({ path: '_price_dark_individual.png' });
  if (group) await group.screenshot({ path: '_price_dark_group.png' });

  // Светлая
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.setItem('theme', 'light'); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 500));
  if (indiv) await indiv.screenshot({ path: '_price_light_individual.png' });
  if (group) await group.screenshot({ path: '_price_light_group.png' });

  // Мобилка (тёмная)
  await page.setViewport({ width: 390, height: 800, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 400));
  if (indiv) await indiv.screenshot({ path: '_price_mobile_dark_individual.png' });
  if (group) await group.screenshot({ path: '_price_mobile_dark_group.png' });

  // Сводка
  const info = await page.evaluate(() => {
    const cols = (root) => {
      const row = document.querySelector(`${root} .compare-row.head`);
      if (!row) return null;
      const cs = getComputedStyle(row);
      return { gridTemplate: cs.gridTemplateColumns, cellCount: row.querySelectorAll('.cell').length };
    };
    const heights = (root) => {
      const cells = Array.from(document.querySelectorAll(`${root} .compare-row:not(.head) .cell`));
      const labels = Array.from(document.querySelectorAll(`${root} .compare-row:not(.head) .label`));
      return {
        cellHeights: cells.map(c => Math.round(c.getBoundingClientRect().height)),
        labelHeights: labels.map(l => Math.round(l.getBoundingClientRect().height)),
      };
    };
    return {
      indiv: { ...cols('#individual'), ...heights('#individual') },
      group: { ...cols('#group'), ...heights('#group') },
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      docW: document.documentElement.scrollWidth,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})();
