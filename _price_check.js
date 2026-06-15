// _price_check.js — снимает скриншоты pricing.html в обеих темах + проверяет ключевые элементы
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  // Сначала — тёмная тема
  await page.goto('http://localhost:8765/pricing.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('theme', 'dark'); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));

  // Полностраничный скриншот в тёмной теме
  await page.screenshot({ path: '_price_dark_full.png', fullPage: true });

  // Снимем индивидуальный блок крупным планом
  const indiv = await page.$('#individual');
  if (indiv) await indiv.screenshot({ path: '_price_dark_individual.png' });

  const group = await page.$('#group');
  if (group) await group.screenshot({ path: '_price_dark_group.png' });

  // Переключаем в светлую
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.setItem('theme', 'light'); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: '_price_light_full.png', fullPage: true });
  if (indiv) await indiv.screenshot({ path: '_price_light_individual.png' });
  if (group) await group.screenshot({ path: '_price_light_group.png' });

  // Мобилка — узкий экран
  await page.setViewport({ width: 390, height: 800, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '_price_mobile_dark.png', fullPage: true });
  if (indiv) await indiv.screenshot({ path: '_price_mobile_dark_individual.png' });
  if (group) await group.screenshot({ path: '_price_mobile_dark_group.png' });

  // Сбор данных — реальные размеры таблиц, проверки
  const info = await page.evaluate(() => {
    function rect(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      individual: rect('#individual'),
      group: rect('#group'),
      compareWidth: rect('.compare'),
      fiveRows: Array.from(document.querySelectorAll('.compare-row.five')).length,
      // Проверим, не вылезает ли таблица за вьюпорт
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      docWidth: document.documentElement.scrollWidth,
      docHeight: document.documentElement.scrollHeight,
    };
  });
  console.log('INFO:', JSON.stringify(info, null, 2));

  await browser.close();
})();
