const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1 });

  const shoot = async (url, scrollId, file) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 800));
    const id = scrollId;
    await page.evaluate(function (id) {
      document.querySelectorAll('.reveal').forEach(function (el) {
        el.classList.add('in');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'start' });
    }, id);
    await new Promise(r => setTimeout(r, 400));
    const height = await page.evaluate(function (id) {
      var el = document.getElementById(id) || document.body;
      return Math.min(2000, Math.max(800, el.getBoundingClientRect().height + 100));
    }, id);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1100, height: height } });
    console.log('shot', file);
  };

  await shoot('http://localhost:8765/pricing.html', 'group', 'C:/vs code/Web/_group2.png');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await new Promise(r => setTimeout(r, 300));
  await shoot('http://localhost:8765/pricing.html', 'group', 'C:/vs code/Web/_group_light2.png');

  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await shoot('http://localhost:8765/index.html', 'trial', 'C:/vs code/Web/_form2.png');
  await shoot('http://localhost:8765/lessons.html', 'piano', 'C:/vs code/Web/_piano2.png');

  await browser.close();
})();
