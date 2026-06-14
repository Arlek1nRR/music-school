const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  await page.setViewport({ width: 1280, height: 1200, deviceScaleFactor: 2 });

  // Pricing page
  await page.goto('http://localhost:8765/pricing.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('in');
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  });

  // Screenshot full page
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/pricing_full_dark.png', fullPage: true });

  // Screenshot individual block
  const individual = await page.evaluate(() => {
    const el = document.getElementById('individual');
    el.scrollIntoView({ block: 'start' });
    const r = el.getBoundingClientRect();
    return { x: r.x - 20, y: r.y - 40, width: r.width + 40, height: r.height + 40 };
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/pricing_individual.png', clip: individual });

  // Screenshot group block
  const group = await page.evaluate(() => {
    const el = document.getElementById('group');
    el.scrollIntoView({ block: 'start' });
    const r = el.getBoundingClientRect();
    return { x: r.x - 20, y: r.y - 40, width: r.width + 40, height: r.height + 40 };
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/pricing_group.png', clip: group });

  // Light theme
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    document.getElementById('individual').scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/pricing_individual_light.png', clip: individual });

  await page.evaluate(() => {
    document.getElementById('group').scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/pricing_group_light.png', clip: group });

  // Index page (check form heading)
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('in');
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    document.getElementById('trial').scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 400));
  const formRect = await page.evaluate(() => {
    const el = document.getElementById('trial');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/index_form.png', clip: formRect });

  // Lessons page
  await page.goto('http://localhost:8765/lessons.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('in');
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    document.getElementById('piano').scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'C:/Users/semik/AppData/Local/Temp/lessons_piano.png', fullPage: false });

  await browser.close();
})();
