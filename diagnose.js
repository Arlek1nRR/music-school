const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle0' });
  // Force dark theme (default) and make sure it's set
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('theme', 'dark'); } catch (e) {}
  });
  // Trigger reveal animations etc.
  await new Promise(r => setTimeout(r, 600));

  // 1) Find the НАПРАВЛЕНИЕ label
  const labelInfoRaw = await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    const r = label.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, text: label.textContent };
  });
  console.log('LABEL (before scroll):', JSON.stringify(labelInfoRaw));

  // Scroll the label into view so we can clip a screenshot around it
  await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    label.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await new Promise(r => setTimeout(r, 300));

  // Re-measure after scroll
  const labelInfo = await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    const r = label.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, text: label.textContent };
  });
  console.log('LABEL (after scroll):', JSON.stringify(labelInfo));

  // Make viewport tall enough to capture the area
  await page.setViewport({ width: 1280, height: 1200, deviceScaleFactor: 1 });
  // Re-measure after viewport resize
  const labelInfo2 = await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    const r = label.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('LABEL (after resize):', JSON.stringify(labelInfo2));

  // 2) Take a high-zoom screenshot of the area just above the label
  const finalLabel = labelInfo2;
  const clipY = Math.max(0, finalLabel.y - 60);
  const clipX = Math.max(0, finalLabel.x - 40);
  const clipW = finalLabel.w + 80;
  const clipH = finalLabel.h + 80;
  console.log('CLIP:', { clipX, clipY, clipW, clipH });
  try {
    await page.screenshot({
      path: '/tmp/napravlenie-area.png',
      clip: { x: clipX, y: clipY, width: clipW, height: clipH }
    });
    console.log('Saved screenshot to /tmp/napravlenie-area.png');
  } catch (e) {
    console.log('Screenshot 1 failed:', e.message);
  }
  try {
    await page.screenshot({
      path: 'C:\\vs code\\Web\\napravlenie-area.png',
      clip: { x: clipX, y: clipY, width: clipW, height: clipH }
    });
    console.log('Saved screenshot to workspace');
  } catch (e) {
    console.log('Screenshot 2 failed:', e.message);
  }

  // 3) Use elementsFromPoint to find every element at multiple y above the label
  // Sample several points: just above the label, and a wider band
  const cx = finalLabel.x + finalLabel.w / 2;
  const samples = [
    { x: cx, y: finalLabel.y - 2, name: 'just_above_top' },
    { x: cx, y: finalLabel.y - 8, name: 'above_8' },
    { x: cx, y: finalLabel.y - 14, name: 'above_14' },
    { x: cx, y: finalLabel.y - 20, name: 'above_20' },
    { x: cx, y: finalLabel.y - 28, name: 'above_28' },
    { x: finalLabel.x + 8, y: finalLabel.y - 2, name: 'left_corner_above' }
  ];

  const allElements = new Map();
  for (const s of samples) {
    const stack = await page.evaluate((p) => {
      return document.elementsFromPoint(p.x, p.y).map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || null,
          cls: el.className && el.className.toString ? el.className.toString() : null,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          bg: cs.backgroundColor,
          bgImage: cs.backgroundImage,
          borderTop: cs.borderTop,
          borderTopColor: cs.borderTopColor,
          borderTopWidth: cs.borderTopWidth,
          borderTopStyle: cs.borderTopStyle,
          outline: cs.outline,
          outlineColor: cs.outlineColor,
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
          boxShadow: cs.boxShadow,
          color: cs.color,
          opacity: cs.opacity,
          filter: cs.filter,
          transform: cs.transform,
          zIndex: cs.zIndex,
          position: cs.position,
          clipPath: cs.clipPath,
          mixBlendMode: cs.mixBlendMode,
          // Pseudo info (we'll also compute separately)
        };
      });
    }, s);
    console.log(`\n=== STACK @ ${s.name} (x=${s.x.toFixed(1)}, y=${s.y.toFixed(1)}) ===`);
    stack.forEach((el, i) => {
      const key = `${el.tag}#${el.id || ''}.${(el.cls || '').toString().slice(0, 80)}`;
      if (!allElements.has(key)) {
        allElements.set(key, el);
      }
      console.log(`  [${i}] ${el.tag}${el.id ? '#' + el.id : ''}.${(el.cls || '').toString().slice(0, 60)}`);
      console.log(`      rect=(${el.rect.x.toFixed(1)},${el.rect.y.toFixed(1)} ${el.rect.w.toFixed(1)}x${el.rect.h.toFixed(1)})`);
      console.log(`      bgColor=${el.bg} bgImage=${el.bgImage}`);
      console.log(`      borderTop=${el.borderTop} (w=${el.borderTopWidth} style=${el.borderTopStyle} color=${el.borderTopColor})`);
      console.log(`      outline=${el.outline}`);
      console.log(`      boxShadow=${el.boxShadow}`);
      console.log(`      color=${el.color} opacity=${el.opacity} filter=${el.filter} z=${el.zIndex} pos=${el.position}`);
    });
  }

  // 4) Walk up from the label and check ancestors for box-shadow/border-top/background-image
  const ancestorsInfo = await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    const out = [];
    let el = label;
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.push({
        tag: el.tagName,
        id: el.id || null,
        cls: el.className && el.className.toString ? el.className.toString() : null,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        bg: cs.backgroundColor,
        bgImage: cs.backgroundImage,
        borderTop: cs.borderTop,
        boxShadow: cs.boxShadow,
        outline: cs.outline,
        transform: cs.transform,
        clipPath: cs.clipPath,
        zIndex: cs.zIndex,
        position: cs.position,
        overflow: cs.overflow
      });
      el = el.parentElement;
    }
    return out;
  });
  console.log('\n=== ANCESTORS of label[for=direction] ===');
  ancestorsInfo.forEach((a, i) => {
    console.log(`  [${i}] ${a.tag}${a.id ? '#' + a.id : ''}.${(a.cls || '').toString().slice(0, 60)}`);
    console.log(`      rect=(${a.rect.x.toFixed(1)},${a.rect.y.toFixed(1)} ${a.rect.w.toFixed(1)}x${a.rect.h.toFixed(1)})`);
    console.log(`      bg=${a.bg} bgImage=${a.bgImage}`);
    console.log(`      borderTop=${a.borderTop} boxShadow=${a.boxShadow}`);
    console.log(`      outline=${a.outline} clipPath=${a.clipPath} pos=${a.position} z=${a.zIndex} overflow=${a.overflow}`);
  });

  // 5) Check ::before/::after pseudo-elements for the relevant elements
  const pseudoInfo = await page.evaluate(() => {
    const selectors = [
      'label[for="direction"]',
      '.field:has(label[for="direction"])',
      '.form-row:has(.field:has(label[for="direction"]))',
      '.form-card',
      '.select',
      '.select-trigger',
      'select#direction',
      '.select-caret',
      'input#name',
      'input#phone'
    ];
    const out = [];
    const seen = new Set();
    for (const sel of selectors) {
      let el;
      try { el = document.querySelector(sel); } catch (e) { continue; }
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      out.push({
        sel,
        tag: el.tagName,
        id: el.id,
        cls: el.className && el.className.toString ? el.className.toString() : null,
        before: {
          content: before.content,
          bg: before.backgroundColor,
          bgImage: before.backgroundImage,
          borderTop: before.borderTop,
          boxShadow: before.boxShadow,
          outline: before.outline,
          width: before.width, height: before.height,
          top: before.top, left: before.left, right: before.right, bottom: before.bottom,
          position: before.position,
          transform: before.transform,
          opacity: before.opacity,
          display: before.display
        },
        after: {
          content: after.content,
          bg: after.backgroundColor,
          bgImage: after.backgroundImage,
          borderTop: after.borderTop,
          boxShadow: after.boxShadow,
          outline: after.outline,
          width: after.width, height: after.height,
          top: after.top, left: after.left, right: after.right, bottom: after.bottom,
          position: after.position,
          transform: after.transform,
          opacity: after.opacity,
          display: after.display
        }
      });
    }
    return out;
  });
  console.log('\n=== PSEUDO ELEMENTS ===');
  pseudoInfo.forEach(p => {
    console.log(`\n  ${p.sel}  -> ${p.tag}${p.id ? '#' + p.id : ''}.${(p.cls || '').toString().slice(0, 60)}`);
    console.log('    ::before', JSON.stringify(p.before));
    console.log('    ::after ', JSON.stringify(p.after));
  });

  // 6) Sanity: check theme attribute
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('\nFinal data-theme =', theme);

  // 7) Identify pixels just above the label (top y-3..y-1) at the center x
  // and return their RGB values by sampling a small region of the screenshot
  // We can't easily access screenshot pixels here, but we can use canvas
  const pixelSamples = await page.evaluate(async (labelBox) => {
    const results = [];
    const xs = [labelBox.x + 2, labelBox.x + 8, labelBox.x + labelBox.w/2, labelBox.x + labelBox.w - 8, labelBox.x + labelBox.w - 2];
    for (const x of xs) {
      const y = labelBox.y - 3;
      const stack = document.elementsFromPoint(x, y);
      results.push({ x, y, stack: stack.map(e => `${e.tagName}${e.id?'#'+e.id:''}.${(e.className||'').toString().slice(0,40)}`) });
    }
    return results;
  }, finalLabel);
  console.log('\n=== PIXEL-COLUMN STACKS just above label ===');
  pixelSamples.forEach(p => {
    console.log(`  @ (${p.x.toFixed(1)}, ${p.y.toFixed(1)}):`);
    p.stack.forEach((s, i) => console.log(`     [${i}] ${s}`));
  });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
