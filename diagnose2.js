const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TMP = 'C:\\Users\\semik\\AppData\\Local\\Temp';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('theme', 'dark'); } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 600));

  // Scroll label into view and set a known y position
  await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    const r = label.getBoundingClientRect();
    // Put label at y=400 of viewport
    window.scrollTo({ top: window.scrollY + r.top - 400, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 400));

  const labelInfo = await page.evaluate(() => {
    const label = document.querySelector('label[for="direction"]');
    const r = label.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, text: label.textContent };
  });
  console.log('LABEL:', JSON.stringify(labelInfo));

  // Screenshot the area just above the label
  const clipX = Math.max(0, Math.floor(labelInfo.x - 60));
  const clipY = Math.max(0, Math.floor(labelInfo.y - 80));
  const clipW = Math.ceil(labelInfo.w + 120);
  const clipH = Math.ceil(labelInfo.h + 100);
  const shotPath = path.join(TMP, 'napravlenie-area.png');
  await page.screenshot({ path: shotPath, clip: { x: clipX, y: clipY, width: clipW, height: clipH } });
  console.log('Saved screenshot to', shotPath);
  // Also save to workspace
  await page.screenshot({ path: 'C:\\vs code\\Web\\napravlenie-area.png', clip: { x: clipX, y: clipY, width: clipW, height: clipH } });

  // Now do the diagnostic work
  const cx = labelInfo.x + labelInfo.w / 2;
  const samples = [
    { x: cx, y: labelInfo.y - 2, name: 'just_above_top' },
    { x: cx, y: labelInfo.y - 6, name: 'above_6' },
    { x: cx, y: labelInfo.y - 12, name: 'above_12' },
    { x: cx, y: labelInfo.y - 18, name: 'above_18' },
    { x: cx, y: labelInfo.y - 24, name: 'above_24' },
    { x: labelInfo.x + 8, y: labelInfo.y - 2, name: 'left_corner_above' },
    { x: labelInfo.x + labelInfo.w - 8, y: labelInfo.y - 2, name: 'right_corner_above' }
  ];

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
          boxShadow: cs.boxShadow,
          color: cs.color,
          opacity: cs.opacity,
          filter: cs.filter,
          transform: cs.transform,
          zIndex: cs.zIndex,
          position: cs.position
        };
      });
    }, s);
    console.log(`\n=== STACK @ ${s.name} (x=${s.x.toFixed(1)}, y=${s.y.toFixed(1)}) ===`);
    stack.forEach((el, i) => {
      console.log(`  [${i}] ${el.tag}${el.id ? '#' + el.id : ''}.${(el.cls || '').toString().slice(0, 60)}`);
      console.log(`      rect=(${el.rect.x.toFixed(1)},${el.rect.y.toFixed(1)} ${el.rect.w.toFixed(1)}x${el.rect.h.toFixed(1)})`);
      console.log(`      bgColor=${el.bg} bgImage=${el.bgImage}`);
      console.log(`      borderTop=${el.borderTop} (w=${el.borderTopWidth} style=${el.borderTopStyle} color=${el.borderTopColor})`);
      console.log(`      outline=${el.outline}`);
      console.log(`      boxShadow=${el.boxShadow}`);
      console.log(`      color=${el.color} opacity=${el.opacity} filter=${el.filter} z=${el.zIndex} pos=${el.position}`);
    });
  }

  // Walk up from label and check ancestors
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

  // Walk up and check ::before/::after for each ancestor
  const pseudoInfo = await page.evaluate(() => {
    const out = [];
    let el = document.querySelector('label[for="direction"]');
    while (el && el !== document.documentElement) {
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      out.push({
        tag: el.tagName,
        id: el.id,
        cls: el.className && el.className.toString ? el.className.toString() : null,
        beforeContent: before.content,
        beforeBg: before.backgroundColor,
        beforeBgImage: before.backgroundImage,
        beforeBorderTop: before.borderTop,
        beforeBoxShadow: before.boxShadow,
        beforeW: before.width, beforeH: before.height,
        beforePos: before.position,
        beforeTop: before.top, beforeBottom: before.bottom, beforeLeft: before.left, beforeRight: before.right,
        afterContent: after.content,
        afterBg: after.backgroundColor,
        afterBgImage: after.backgroundImage,
        afterBorderTop: after.borderTop,
        afterBoxShadow: after.boxShadow,
        afterW: after.width, afterH: after.height,
        afterPos: after.position,
        afterTop: after.top, afterBottom: after.bottom, afterLeft: after.left, afterRight: after.right
      });
      el = el.parentElement;
    }
    return out;
  });
  console.log('\n=== PSEUDO ELEMENTS of ancestors ===');
  pseudoInfo.forEach(p => {
    console.log(`  ${p.tag}${p.id ? '#' + p.id : ''}.${(p.cls || '').toString().slice(0, 60)}`);
    console.log(`    ::before  content=${p.beforeContent} bg=${p.beforeBg} bgImg=${p.beforeBgImage} borderTop=${p.beforeBorderTop} boxShadow=${p.beforeBoxShadow} pos=${p.beforePos} size=${p.beforeW}x${p.beforeH} t=${p.beforeTop} b=${p.beforeBottom} l=${p.beforeLeft} r=${p.beforeRight}`);
    console.log(`    ::after   content=${p.afterContent} bg=${p.afterBg} bgImg=${p.afterBgImage} borderTop=${p.afterBorderTop} boxShadow=${p.afterBoxShadow} pos=${p.afterPos} size=${p.afterW}x${p.afterH} t=${p.afterTop} b=${p.afterBottom} l=${p.afterLeft} r=${p.afterRight}`);
  });

  // Find ALL elements that overlap the line y=labelInfo.y-1 from x=labelInfo.x to x=labelInfo.x + labelInfo.w
  // and have a non-zero background/border/shadow that could paint a colored stroke
  const candidates = await page.evaluate((labelBox) => {
    const results = [];
    const minX = labelBox.x;
    const maxX = labelBox.x + labelBox.w;
    const y = labelBox.y - 1;
    // walk every element under each x
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += 4) {
      const stack = document.elementsFromPoint(x, y);
      for (const el of stack) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        // Only consider elements that span or extend into this x range
        if (r.right < minX || r.left > maxX) continue;
        // Check painting properties
        const hasPaint =
          (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') ||
          (cs.backgroundImage && cs.backgroundImage !== 'none') ||
          (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') ||
          (cs.boxShadow && cs.boxShadow !== 'none') ||
          (cs.outline && cs.outlineStyle && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0);
        if (!hasPaint) continue;
        results.push({
          tag: el.tagName,
          id: el.id || null,
          cls: (el.className || '').toString(),
          rect: { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right },
          bg: cs.backgroundColor,
          bgImage: cs.backgroundImage,
          borderTop: cs.borderTop,
          borderTopColor: cs.borderTopColor,
          borderTopWidth: cs.borderTopWidth,
          borderTopStyle: cs.borderTopStyle,
          boxShadow: cs.boxShadow,
          outline: cs.outline,
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          outlineColor: cs.outlineColor,
          color: cs.color,
          position: cs.position,
          zIndex: cs.zIndex,
          opacity: cs.opacity,
          xSample: x
        });
      }
    }
    return results;
  }, labelInfo);
  console.log('\n=== CANDIDATE PAINTING ELEMENTS along the y just above the label ===');
  // Dedupe by (tag,id,cls)
  const seen = new Set();
  candidates.forEach(c => {
    const key = `${c.tag}#${c.id}.${c.cls}`;
    if (seen.has(key)) return;
    seen.add(key);
    console.log(`  ${c.tag}${c.id ? '#' + c.id : ''}.${c.cls.slice(0, 60)}`);
    console.log(`      rect=(${c.rect.x.toFixed(1)},${c.rect.y.toFixed(1)} ${c.rect.w.toFixed(1)}x${c.rect.h.toFixed(1)})  bottom=${c.rect.bottom.toFixed(1)}  top=${c.rect.top.toFixed(1)}`);
    console.log(`      bg=${c.bg} bgImage=${c.bgImage}`);
    console.log(`      borderTop=${c.borderTop} (w=${c.borderTopWidth} style=${c.borderTopStyle} color=${c.borderTopColor})`);
    console.log(`      boxShadow=${c.boxShadow}`);
    console.log(`      outline=${c.outline} (style=${c.outlineStyle} w=${c.outlineWidth} color=${c.outlineColor})`);
    console.log(`      color=${c.color} z=${c.zIndex} pos=${c.position} opacity=${c.opacity}`);
  });

  // Read the actual pixel colors of the screenshot, focus on the line y=labelInfo.y-1 above the label
  // We'll inline a fresh screenshot then load it into a canvas
  const buf = fs.readFileSync(shotPath);
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const pixelData = await page.evaluate(async (dataUrl, labelBox) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    // The shot was at clipX,clipY and at 2x device pixel ratio
    // We need the screenshot y for the label's y-1 line. Screenshot top = clipY = labelInfo.y - 80
    // Note: deviceScaleFactor=2 means screenshot pixels are 2x CSS pixels
    const dpr = window.devicePixelRatio || 1;
    // Find the CSS y-1 in the screenshot pixel coords:
    // screenshot contains CSS from y=clipY to y=clipY+clipH
    // We need CSS y=labelBox.y - 1
    // Need clipY value; compute it:
    const clipY = labelBox.y - 80;
    const cssY = labelBox.y - 1;
    const relY = (cssY - clipY) * dpr;
    const startCssX = labelBox.x - 60;
    const relX0 = (labelBox.x - startCssX) * dpr;
    const cssW = labelBox.w;
    // Sample the entire row
    const samples = [];
    for (let dx = 0; dx < cssW; dx += 4) {
      const px = Math.floor(relX0 + dx * dpr);
      const py = Math.floor(relY);
      const data = ctx.getImageData(px, py, 1, 1).data;
      samples.push({ dx, r: data[0], g: data[1], b: data[2], a: data[3] });
    }
    // Also sample a few rows above and at the label top
    const extraRows = [];
    for (let dy = -10; dy <= 4; dy++) {
      const cssYr = labelBox.y + dy;
      const relYr = (cssYr - clipY) * dpr;
      const row = [];
      for (let dx = 0; dx < cssW; dx += 8) {
        const px = Math.floor(relX0 + dx * dpr);
        const py = Math.floor(relYr);
        const d = ctx.getImageData(px, py, 1, 1).data;
        row.push(`dx${dx}#${d[0]},${d[1]},${d[2]},a${d[3]}`);
      }
      extraRows.push({ dy, cssY: cssYr, row });
    }
    return { dpr, samples, extraRows };
  }, dataUrl, labelInfo);
  console.log('\n=== PIXEL ANALYSIS (CSS y just above label) ===');
  console.log('dpr =', pixelData.dpr);
  // Find pixels that differ significantly from the body bg (rgb(15, 14, 26))
  const isOrange = (r, g, b) => r > 100 && r > b + 30 && r > g + 10;
  const isAmber = (r, g, b) => r > 100 && g > 60 && g < r - 20 && b < g;
  const isDifferent = (r, g, b) => {
    const dr = Math.abs(r - 15), dg = Math.abs(g - 14), db = Math.abs(b - 26);
    return dr + dg + db > 20;
  };
  console.log('\nPixels at CSS y=label.y-1 that differ from body bg:');
  pixelData.samples.forEach(s => {
    if (isDifferent(s.r, s.g, s.b)) {
      const flags = [
        isOrange(s.r, s.g, s.b) ? 'ORANGE' : '',
        isAmber(s.r, s.g, s.b) ? 'AMBER' : ''
      ].filter(Boolean).join(' ');
      console.log(`  dx=${s.dx} px=(${s.r}, ${s.g}, ${s.b}, a=${s.a})  ${flags}`);
    }
  });
  console.log('\nPer-row sample (each cell shows dx: r,g,b,a):');
  pixelData.extraRows.forEach(row => {
    console.log(`  dy=${row.dy} (CSS y=${row.cssY.toFixed(1)}):`);
    row.row.forEach(cell => console.log(`     ${cell}`));
  });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
