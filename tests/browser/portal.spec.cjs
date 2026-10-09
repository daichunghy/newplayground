const { test, expect } = require('@playwright/test');

function watchErrors(page) {
  const errors = [];
  const origin = new URL(page.url() || 'http://127.0.0.1:4173').origin;
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin) errors.push(`request: ${request.url()} ${request.failure()?.errorText || ''}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === origin) {
      errors.push(`response ${response.status()}: ${response.url()}`);
    }
  });
  return errors;
}

async function openGame(page, id) {
  const opened = await page.evaluate(gameId => window.openGameById(gameId), id);
  expect(opened, `${id} is registered and opens through the app`).toBe(true);
  await expect(page.locator('#gameModal')).toHaveCSS('display', 'flex');
  await expect(page.locator('#modalGameContainer .game-availability-notice')).toHaveCount(0);
}

async function closeGame(page) {
  await page.locator('#closeModalBtn').click();
  await expect(page.locator('#gameModal')).toHaveCSS('display', 'none');
  await expect.poll(() => page.evaluate(() => window.NP_GameSession.getCurrent() === null)).toBe(true);
  expect(await page.locator('#modalGameContainer').evaluate(node => node.childElementCount)).toBe(0);
}

async function loadPortal(page) {
  await page.goto('/');
  await expect(page.locator('#catalogAvailability')).toContainText('69');
}

async function newMobilePage(browser, width = 320, height = 800) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true
  });
  const page = await context.newPage();
  await loadPortal(page);
  return { context, page };
}

async function expectViewportFits(page) {
  const size = await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth }));
  expect(size.pageWidth).toBeLessThanOrEqual(size.width);
}

test('the default grid is playable-only; explicit catalog browsing keeps planned entries informational', async ({ page }) => {
  await loadPortal(page);
  await expect(page.locator('#allSectionTitle')).toHaveText('Bản thử nghiệm có thể chơi (69)');
  await expect(page.locator('#gridAll .game-card')).toHaveCount(69);
  await expect(page.locator('.filter-pill[data-category="playable"]')).toHaveClass(/active/);

  await page.locator('.filter-pill[data-category="all"]').click();
  await expect(page.locator('#gridAll .game-card')).toHaveCount(150);
  const planned = page.locator('#gridAll .game-card[data-id="pizza-frenzy"]');
  await expect(planned.locator('.game-card-status')).toHaveText('Chưa có bản chơi');
  await expect(planned.locator('.game-card-play')).toHaveCount(0);
  await planned.click();
  await expect(page.locator('#gameModal')).toHaveCSS('display', 'none');
});

test('all 69 registered games open, render, close and release their session', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await loadPortal(page);
  const routes = await page.evaluate(() => {
    const byId = new Map(window.__NP_GAMES_CACHE__.map(game => [game.id, game]));
    return Object.entries(window.NP_GameRegistry.entries).map(([id, engine]) => ({
      id, engine, title: byId.get(id)?.title || id
    }));
  });
  expect(routes).toHaveLength(69);

  for (const route of routes) {
    await openGame(page, route.id);
    await expect(page.locator('#modalGameTitle')).toHaveText(route.title);
    expect(await page.locator('#modalGameContainer').evaluate(node => node.childElementCount), route.id).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.NP_GameSession.getCurrent() !== null), route.id).toBe(true);
    await closeGame(page);
  }
  expect(errors).toEqual([]);
});

async function drawLineOnCanvas(context, page, canvas) {
  const box = await canvas.boundingBox();
  const from = { x: box.x + box.width * 64 / 800, y: box.y + box.height * 322 / 440 };
  const to = { x: box.x + box.width * 736 / 800, y: box.y + box.height * 322 / 440 };
  const points = [0, .25, .5, .75, 1].map(t => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }));
  if (context.pages()[0] === page && await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
    for (const point of points.slice(1)) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 3 });
    await page.mouse.up();
  }
}

test('Dắt Cún and Bút Vẽ Trượt Ván play on 320px touch and desktop Chromium', async ({ browser }) => {
  test.setTimeout(60_000);
  for (const mobile of [true, false]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 320, height: 800 } : { width: 1280, height: 900 },
      isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1
    });
    const page = await context.newPage(), errors = watchErrors(page);
    await loadPortal(page);
    await openGame(page, 'gap-chu-cho-qua-duong');
    await expect(page.locator('#modalGameTitle')).toHaveText('Dắt Cún Qua Đường');
    await expectViewportFits(page);
    const cross = page.locator('#dcCross');
    const crossBox = await cross.boundingBox();
    expect(crossBox.width).toBeGreaterThanOrEqual(44);
    expect(crossBox.height).toBeGreaterThanOrEqual(44);
    await cross.click();
    await expect(page.locator('#dcDogs')).toHaveText('4');
    await page.keyboard.press('p');
    await expect(page.locator('#dcOverlayTitle')).toHaveText('Tạm dừng');
    await page.locator('#dcOverlayAction').click();
    await expect(page.locator('#dcOverlay')).toBeHidden();
    await page.locator('#dcRestart').click();
    await expect(page.locator('#dcDogs')).toHaveText('5');
    await closeGame(page);

    await openGame(page, 'line-rider-truot-tuyet-vat-ly');
    await expect(page.locator('#modalGameTitle')).toHaveText('Bút Vẽ Trượt Ván (Line Rider)');
    await expectViewportFits(page);
    const canvas = page.locator('#lrCanvas');
    await canvas.scrollIntoViewIfNeeded();
    expect(await canvas.evaluate(node => getComputedStyle(node).touchAction)).toBe('none');
    await drawLineOnCanvas(context, page, canvas);
    await expect(page.locator('#lrStart')).toBeEnabled();
    await page.locator('#lrStart').click();
    await page.waitForTimeout(180);
    await page.keyboard.press('p');
    await expect(page.locator('#lrOverlayTitle')).toHaveText('Tạm dừng');
    await page.locator('#lrOverlayAction').click();
    await expect(page.locator('#lrOverlay')).toBeHidden();
    await expect(page.locator('#lrOverlayTitle')).toHaveText('Tới đích!', { timeout: 8_000 });
    await expect(page.locator('#lrScore')).not.toHaveText('0');
    await closeGame(page);
    await expectViewportFits(page);
    expect(errors, `${mobile ? 'mobile' : 'desktop'} browser errors`).toEqual([]);
    await context.close();
  }
});

async function drawCustomTrack(context, page, canvas, logicalPoints) {
  const box = await canvas.boundingBox();
  const points = logicalPoints.map(p => ({ x: box.x + box.width * p.x / 800, y: box.y + box.height * p.y / 440 }));
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
    for (const point of points.slice(1)) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
      await page.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
    for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
    await page.mouse.up();
  }
}

test('Dắt Cún explains a red-light loss and Bút Vẽ reports an uphill rollback on mobile', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'gap-chu-cho-qua-duong');
  await expect(page.locator('#dcStatus')).toHaveText(/Đèn đỏ/, { timeout: 5_000 });
  for (let miss = 1; miss <= 3; miss++) await page.locator('#dcCross').click();
  await expect(page.locator('#dcOverlayTitle')).toHaveText('Hẹn chuyến sau');
  await expect(page.locator('#dcStatus')).toContainText('Hết lượt');
  await closeGame(page);

  await openGame(page, 'line-rider-truot-tuyet-vat-ly');
  const canvas = page.locator('#lrCanvas');
  await drawCustomTrack(context, page, canvas, [
    { x: 64, y: 322 }, { x: 200, y: 270 }, { x: 350, y: 210 },
    { x: 500, y: 145 }, { x: 620, y: 180 }, { x: 736, y: 322 }
  ]);
  await expect(page.locator('#lrStart')).toBeEnabled();
  await page.locator('#lrStart').click();
  await expect(page.locator('#lrOverlayTitle')).toHaveText('Thử dốc khác', { timeout: 8_000 });
  await expect(page.locator('#lrStatus')).toContainText('Ván trượt ngược');
  await closeGame(page);
  await expectViewportFits(page);
  expect(errors).toEqual([]);
  await context.close();
});

async function playSoapBubbleCourse(page, context, mobile) {
  let cdp = null, pressed = new Set();
  const keys = { left: 'ArrowLeft', right: 'ArrowRight', inflate: 'Space' };
  const positions = {};
  if (mobile) {
    cdp = await context.newCDPSession(page);
    for (const name of Object.keys(keys)) {
      const selector = name === 'inflate' ? '#sbgBlow' : name === 'left' ? '#sbgLeft' : '#sbgRight';
      const box = await page.locator(selector).boundingBox();
      positions[name] = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: name === 'left' ? 10 : name === 'inflate' ? 11 : 12 };
    }
  }
  async function updateInput(wanted) {
    const next = new Set(Object.entries(wanted).filter(([, value]) => value).map(([name]) => name));
    if (mobile) {
      if ([...next].some(name => !pressed.has(name)) || [...pressed].some(name => !next.has(name))) {
        if (pressed.size) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        if (next.size) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [...next].map(name => positions[name]) });
      }
    } else {
      for (const name of pressed) if (!next.has(name)) await page.keyboard.up(keys[name]);
      for (const name of next) if (!pressed.has(name)) await page.keyboard.down(keys[name]);
    }
    pressed = next;
  }
  const deadline = Date.now() + 18_000;
  let finalView, inflate = false;
  while (Date.now() < deadline) {
    finalView = await page.evaluate(() => window.__npSoapMounted?.getModel().view() || null);
    if (!finalView) throw new Error('Soap Bubble mount model was not captured by the browser test');
    if (finalView.status === 'won' || finalView.status === 'lost') break;
    const gate = finalView.gates[finalView.gatesPassed];
    const targetX = gate ? gate.center : finalView.x;
    const horizontal = Math.abs(finalView.x - targetX) < 18 ? null : finalView.x < targetX ? 'right' : 'left';
    if (!inflate && finalView.charge <= .22) inflate = true;
    else if (inflate && finalView.charge >= .40) inflate = false;
    await updateInput({ inflate, left: horizontal === 'left', right: horizontal === 'right' });
    await page.waitForTimeout(80);
  }
  await updateInput({});
  if (cdp) await cdp.detach();
  expect(finalView?.status, `course ended with ${finalView?.result} after ${finalView?.gatesPassed}/3 openings`).toBe('won');
}

test('Thổi Bong Bóng Xà Phòng launches from the catalog, fits and completes on touch and desktop', async ({ browser }) => {
  test.setTimeout(60_000);
  for (const mobile of [true, false]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 320, height: 800 } : { width: 1280, height: 900 },
      isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1
    });
    const page = await context.newPage(), errors = watchErrors(page);
    await loadPortal(page);
    await page.evaluate(() => {
      const api = window.NP_SoapBubbleGarden;
      window.NP_SoapBubbleGarden = Object.freeze({ ...api, mount(container, session) {
        const mounted = api.mount(container, session); window.__npSoapMounted = mounted; return mounted;
      } });
    });
    await openGame(page, 'thoi-bong-xa-phong');
    await expect(page.locator('#modalGameTitle')).toHaveText('Thổi Bong Bóng Xà Phòng');
    await expectViewportFits(page);
    const blow = page.locator('#sbgBlow');
    const initialBlowBox = await blow.boundingBox();
    expect(initialBlowBox.width).toBeGreaterThanOrEqual(44); expect(initialBlowBox.height).toBeGreaterThanOrEqual(44);
    await blow.scrollIntoViewIfNeeded();
    const blowBox = await blow.boundingBox();
    if (mobile) {
      const cdp = await context.newCDPSession(page), box = await blow.boundingBox();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 7 };
      const initialCharge = await page.evaluate(() => window.__npSoapMounted.getModel().view().charge);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await page.waitForTimeout(220);
      const held = await page.evaluate(() => window.__npSoapMounted.getModel().view());
      expect(held.input.inflate).toBe(true); expect(held.charge).toBeGreaterThan(initialCharge);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      const initialCharge = await page.evaluate(() => window.__npSoapMounted.getModel().view().charge);
      await page.keyboard.down('Space');
      await expect.poll(() => page.evaluate(() => window.__npSoapMounted.getModel().view().input.inflate)).toBe(true);
      await page.waitForTimeout(220);
      expect(await page.evaluate(() => window.__npSoapMounted.getModel().view().charge)).toBeGreaterThan(initialCharge);
      await page.keyboard.up('Space');
    }
    await page.locator('#sbgPause').click();
    await expect(page.locator('#sbgTitle')).toHaveText('Tạm dừng');
    await page.locator('#sbgOverlayAction').click();
    await expect(page.locator('#sbgOverlay')).toBeHidden();
    await page.locator('#sbgRestart').click();
    await playSoapBubbleCourse(page, context, mobile);
    await expect(page.locator('#sbgTitle')).toHaveText('Đến hiên rồi!');
    await page.locator('#sbgOverlayAction').click();
    await expect(page.locator('#sbgOverlay')).toBeHidden();
    await expect(page.locator('#sbgGates')).toHaveText('0 / 3');
    await closeGame(page);
    await expectViewportFits(page);
    expect(errors, `${mobile ? 'mobile' : 'desktop'} browser errors`).toEqual([]);
    await context.close();
  }
});

test('Khối Sắc stays touch-sized on a narrow mobile screen and accepts a real face turn and pause', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'khoi-rubik-mini');
  await expect(page.locator('#modalGameTitle')).toHaveText('Khối Sắc');
  await expect(page.locator('.ks-face-panel')).toHaveCount(6);
  await expect(page.locator('.ks-goal-face')).toHaveCount(1);
  const controls = await page.locator('.ks-turn').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  expect(controls.every(box => box.width >= 44 && box.height >= 44), JSON.stringify(controls)).toBe(true);
  await page.locator('#ks-r-cw').click();
  await expect(page.locator('#ksMoves')).toHaveText('1 / 10 lượt');
  await page.keyboard.press('p');
  await expect(page.locator('#ksOverlayTitle')).toHaveText('Tạm dừng');
  await page.locator('#ksOverlayAction').click();
  await expect(page.locator('#ksOverlay')).toBeHidden();
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Sân Bụi accepts a narrow mobile aim and throw through the live canvas game', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'nem-lon-truong-lang');
  await expect(page.locator('#modalGameTitle')).toHaveText('Sân Bụi');
  await expect(page.locator('#sbCanvas')).toBeVisible();
  const canvasBox = await page.locator('#sbCanvas').boundingBox();
  await page.mouse.move(canvasBox.x + canvasBox.width * .65, canvasBox.y + canvasBox.height * .25);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width * .75, canvasBox.y + canvasBox.height * .5);
  const draggedAngle = await page.locator('#sbAngleValue').textContent();
  await page.mouse.up();
  await page.mouse.move(canvasBox.x + canvasBox.width * .65, canvasBox.y + canvasBox.height * .25);
  await expect(page.locator('#sbAngleValue')).toHaveText(draggedAngle);
  await page.locator('#sbAngle').evaluate(node => {
    node.value = '18'; node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#sbPower').evaluate(node => {
    node.value = '75'; node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#sbAngleValue')).toHaveText('18°');
  await expect(page.locator('#sbPowerValue')).toHaveText('75%');
  await page.locator('#sbFire').click();
  await expect(page.locator('#sbThrows')).toHaveText('2');
  await expect(page.locator('#sbStatus')).toContainText('Cú ném đang bay');
  const viewport = await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth }));
  expect(viewport.pageWidth).toBeLessThanOrEqual(viewport.width);
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Kéo Nhịp starts quickly and keeps its rhythm controls touch-sized on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'keo-co-doi-khang');
  await expect(page.locator('#modalGameTitle')).toHaveText('Kéo Nhịp');
  const readyPanel = await page.locator('#knOverlayAction').boundingBox();
  const arenaPanel = await page.locator('.kn-arena-wrap').boundingBox();
  expect(readyPanel.y).toBeGreaterThanOrEqual(arenaPanel.y);
  expect(readyPanel.y + readyPanel.height).toBeLessThanOrEqual(arenaPanel.y + arenaPanel.height);
  expect(readyPanel.width).toBeGreaterThanOrEqual(44);
  expect(readyPanel.height).toBeGreaterThanOrEqual(44);
  await page.locator('#knOverlayAction').click();
  const controls = await page.locator('.kn-step, .kn-icon').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  expect(controls.every(box => box.width >= 44 && box.height >= 44), JSON.stringify(controls)).toBe(true);
  await expect(page.locator('#knOverlay')).toBeHidden();
  await page.keyboard.press('p');
  await expect(page.locator('#knOverlayTitle')).toHaveText('Tạm nghỉ');
  const viewport = await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth }));
  expect(viewport.pageWidth).toBeLessThanOrEqual(viewport.width);
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Xây Cầu and Giao Báo take real mobile touches and fit a desktop viewport', async ({ browser, page }) => {
  test.setTimeout(45_000);
  const { context: mobileContext, page: mobile } = await newMobilePage(browser, 320, 800);
  const mobileErrors = watchErrors(mobile);
  await openGame(mobile, 'xay-cau-bridge-builder');
  await expect(mobile.locator('#modalGameTitle')).toHaveText('Xây Cầu Vật Lý (Bridge Builder)');
  await expectViewportFits(mobile);
  const jointBox = await mobile.locator('.bb-joint[data-joint="t0"]').boundingBox();
  expect(jointBox.width).toBeGreaterThanOrEqual(44); expect(jointBox.height).toBeGreaterThanOrEqual(44);
  for (let span = 0; span < 4; span++) {
    await mobile.locator(`.bb-joint[data-joint="t${span}"]`).tap();
    await mobile.locator(`.bb-joint[data-joint="b${span}"]`).tap();
    await mobile.locator(`.bb-joint[data-joint="t${span}"]`).tap();
    await mobile.locator(`.bb-joint[data-joint="b${span + 1}"]`).tap();
  }
  await expect(mobile.locator('#bbBudget')).toHaveText('8 / 8');
  await mobile.locator('#bbTest').click();
  await expect(mobile.locator('#bbTruck')).toHaveCount(1);
  await mobile.locator('#bbPause').click();
  await expect(mobile.locator('#bbOverlayTitle')).toHaveText('Tạm dừng');
  await mobile.locator('#bbOverlayAction').click();
  await expect(mobile.locator('#bbOverlayTitle')).toHaveText('Tải qua an toàn', { timeout: 8_000 });
  await mobile.locator('#bbOverlayAction').click();
  await expect(mobile.locator('#bbLevel')).toContainText('Hẻm Gió');
  await closeGame(mobile);

  await openGame(mobile, 'xe-dap-giao-bao');
  await expect(mobile.locator('#modalGameTitle')).toHaveText('Cậu Bé Giao Báo (Paperboy)');
  await expectViewportFits(mobile);
  for (const selector of ['#pbLeft', '#pbRight', '#pbThrow']) {
    const box = await mobile.locator(selector).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await mobile.locator('#pbRight').click(); await mobile.locator('#pbLeft').click();
  await expect(mobile.locator('#pbThrow')).toBeEnabled({ timeout: 2_000 });
  const throwBox = await mobile.locator('#pbThrow').boundingBox();
  const touch = { x: throwBox.x + throwBox.width / 2, y: throwBox.y + throwBox.height / 2, id: 4 };
  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await expect(mobile.locator('#pbDeliveries')).toHaveText('1 / 6');
  await mobile.locator('#pbPause').click();
  await expect(mobile.locator('#pbOverlayTitle')).toHaveText('Tạm dừng');
  await mobile.locator('#pbOverlayAction').click();
  await closeGame(mobile);
  expect(mobileErrors).toEqual([]);
  await mobileContext.close();

  const desktopErrors = watchErrors(page);
  await loadPortal(page); await openGame(page, 'xe-dap-giao-bao'); await expectViewportFits(page);
  await expect(page.locator('#pbThrow')).toBeEnabled({ timeout: 2_000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#pbDeliveries')).toHaveText('1 / 6');
  await closeGame(page);
  expect(desktopErrors).toEqual([]);
});

test('Kệ Sách Ký Ức keeps its shelf playable at 320px and responds to a real tap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'tiem-sach-cu-pho-co');
  await expect(page.locator('#modalGameTitle')).toHaveText('Kệ Sách Ký Ức');
  const books = page.locator('.ksku-book');
  await expect(books).toHaveCount(5);
  const first = books.first();
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#kskuRight').click();
  await expect(page.locator('#kskuMoves')).toHaveText('1 / 8');
  const boxes = await page.locator('.ksku-tool, .ksku-shift-button, .ksku-book').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  expect(boxes.every(box => box.width >= 44 && box.height >= 44), JSON.stringify(boxes)).toBe(true);
  const viewport = await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth }));
  expect(viewport.pageWidth).toBeLessThanOrEqual(viewport.width);
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('a stale 2048 tab preserves another tab’s newer board through pause and pagehide', async ({ page, context }) => {
  const errors = watchErrors(page);
  await loadPortal(page);
  const seed = { version: 1, board: [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    score: 0, moves: 0, won: false, keepPlaying: false, over: false };
  await page.evaluate(value => localStorage.setItem('np_2048_state_v1', JSON.stringify(value)), seed);
  await openGame(page, 'tro-choi-2048');
  const second = await context.newPage();
  const secondErrors = watchErrors(second);
  await second.goto('/');
  await second.evaluate(() => window.openGameById('tro-choi-2048'));
  await expect(second.locator('#gameModal')).toHaveCSS('display', 'flex');
  await expect(second.locator('#modalGameContainer #g2048Grid')).toBeVisible();

  await page.locator('#modalGameContainer #g2048Grid').focus();
  await page.keyboard.press('ArrowLeft');
  const newerSave = await page.evaluate(() => localStorage.getItem('np_2048_state_v1'));
  await expect.poll(() => second.evaluate(() => localStorage.getItem('np_2048_state_v1'))).toBe(newerSave);
  await expect(second.locator('#g2048Status')).toContainText('Ván trong tab khác vừa thay đổi');

  await second.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await second.evaluate(() => localStorage.getItem('np_2048_state_v1'))).toBe(newerSave);
  await second.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await page.evaluate(() => localStorage.getItem('np_2048_state_v1'))).toBe(newerSave);
  await second.close();
  expect(await page.evaluate(() => localStorage.getItem('np_2048_state_v1'))).toBe(newerSave);
  expect([...errors, ...secondErrors]).toEqual([]);
});

test('Hàng Rong’s saved four-seat upgrade remains fully inside the mobile stall', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadPortal(page);
  const saved = await page.evaluate(() => {
    const profile = window.NP_HangRongModel.create().view().profile;
    profile.upgrades.extraChair = true;
    const model = window.NP_HangRongModel.create({ profile });
    model.restock();
    if (!model.begin().ok) throw new Error('could not seed the four-seat shift');
    return JSON.stringify(model.serialize());
  });
  await page.evaluate(value => localStorage.setItem('np_hangrong_save_v3', value), saved);
  await openGame(page, 'hang-rong');
  await page.locator('#hr3Resume').click();
  await expect(page.locator('#hr3Customers')).toHaveClass(/hr3-four-seats/);
  const layout = await page.locator('#hr3Customers').evaluate(parent => {
    const box = parent.getBoundingClientRect();
    const cards = [...parent.querySelectorAll('.hr3-customer:not([hidden])')].map(card => {
      const r = card.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, height: r.height };
    });
    return { left: box.left, right: box.right, cards };
  });
  expect(layout.cards).toHaveLength(4);
  for (const card of layout.cards) {
    expect(card.width).toBeGreaterThanOrEqual(44);
    expect(card.height).toBeGreaterThanOrEqual(44);
    expect(card.left).toBeGreaterThanOrEqual(layout.left - 1);
    expect(card.right).toBeLessThanOrEqual(layout.right + 1);
  }
  await closeGame(page);
});

test('Mọt Sách Nối Chữ works at 320px, uses its own cover and completes a real word turn', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  const errors = watchErrors(page);
  await loadPortal(page);
  const cover = page.locator('#gridAll .game-card[data-id="bookworm-sau-noi-chu"] img');
  await expect(cover).toHaveAttribute('src', 'assets/mot-sach-noi-chu-original.svg');
  await openGame(page, 'bookworm-sau-noi-chu');
  await expect(page.locator('#modalGameTitle')).toHaveText('Mọt Sách Nối Chữ (Bookworm)');
  await expect(page.locator('#modalGameContainer .bw-letter')).toHaveCount(36);
  const layout = await page.locator('#bwBoard').evaluate(board => {
    const box = board.getBoundingClientRect();
    const cells = [...board.querySelectorAll('.bw-letter')].map(node => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, height: r.height };
    });
    return { left: box.left, right: box.right, cells };
  });
  expect(layout.cells).toHaveLength(36);
  for (const cell of layout.cells) {
    expect(cell.width).toBeGreaterThanOrEqual(44);
    expect(cell.height).toBeGreaterThanOrEqual(44);
    expect(cell.left).toBeGreaterThanOrEqual(layout.left - 1);
    expect(cell.right).toBeLessThanOrEqual(layout.right + 1);
  }
  for (const index of [0, 1, 2, 3, 4]) await page.locator(`#bwTile${index}`).click();
  await expect(page.locator('#bwWord')).toHaveText('SHELF');
  await page.locator('#bwSubmit').click();
  await expect(page.locator('#bwScore')).toHaveText('25 / 42');
  await expect(page.locator('#bwTurns')).toHaveText('11');
  await expect(page.locator('#bwStatus')).toContainText('+25');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Tháp Ba Cọc solves a real stage through its peg controls and resumes the unlocked campaign on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'thap-ha-noi-tower');
  await expect(page.locator('#modalGameTitle')).toHaveText('Tháp Ba Cọc');
  await expect(page.locator('#tbStageName')).toHaveText('1 / 4 · Bước đầu');
  await expect(page.locator('#tbStage1')).toBeDisabled();
  const firstPeg = await page.locator('#tbPeg0').boundingBox();
  expect(firstPeg.width).toBeGreaterThanOrEqual(44);
  expect(firstPeg.height).toBeGreaterThanOrEqual(44);

  await page.locator('#tbPeg0').click();
  await page.locator('#tbPeg2').click();
  await expect(page.locator('#tbMoveCount')).toHaveText('1 / 7');
  await page.locator('#tbUndo').click();
  await expect(page.locator('#tbMoveCount')).toHaveText('0 / 7');
  await page.locator('#tbHint').click();
  await expect(page.locator('#tbHintText')).toContainText('Gợi ý');

  for (let move = 0; move < 7; move += 1) {
    const hint = await page.evaluate(() => {
      const progress = JSON.parse(localStorage.getItem('np_thap_ba_coc_campaign_v1'));
      const model = window.NP_ThapBaCocModel.create(progress.activeStage, progress.stages[progress.activeStage]);
      return model.hint();
    });
    await page.locator(`#tbPeg${hint.from}`).click();
    await page.locator(`#tbPeg${hint.to}`).click();
  }
  await expect(page.locator('#tbStatus')).toContainText('Chặng hoàn thành');
  await expect(page.locator('#tbStage1')).toBeEnabled();
  await page.locator('#tbNext').click();
  await expect(page.locator('#tbStageName')).toHaveText('2 / 4 · Vững vàng');
  await closeGame(page);

  await openGame(page, 'thap-ha-noi-tower');
  await expect(page.locator('#tbStageName')).toHaveText('2 / 4 · Vững vàng');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('catalog card opens Quầy Nước Chanh and shows the short recipe-and-price loop', async ({ page }) => {
  const errors = watchErrors(page);
  await loadPortal(page);
  await page.locator('#gridAll .game-card[data-id="lemonade-tycoon"] .game-card-play').click();
  await expect(page.locator('#modalGameTitle')).toHaveText('Quầy Nước Chanh');
  await expect(page.locator('#lsGoalLabel')).toHaveText('Mục tiêu 100');
  await expect(page.locator('#lsPrice')).toHaveText('12');
  await page.locator('#lsPriceUp').click();
  await expect(page.locator('#lsPrice')).toHaveText('13');
  await page.locator('#lsTart').click();
  await expect(page.locator('#lsTart')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#lsPriceLabel')).toContainText('vốn 4');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('mobile Xiangqi accepts a legal tap move, CPU reply, and keeps focus in the board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    await loadPortal(page);
    await openGame(page, 'co-tuong');
    await expect(page.locator('#xqBoard button')).toHaveCount(90);
    await page.locator('#xqBoard [data-row="6"][data-col="0"]').tap();
    await expect(page.locator('#xqBoard .is-legal')).not.toHaveCount(0);
    await expect(page.locator('#xqBoard button:focus')).toHaveCount(1);
    await page.locator('#xqBoard [data-row="5"][data-col="0"]').tap();
    await expect(page.locator('#xqStatus')).toContainText('Máy đi');
    await expect(page.locator('#xqBoard button:focus')).toHaveCount(1);
    await page.locator('.np-xiangqi-new').tap();
    await expect(page.locator('#xqTurn')).toHaveText('Lượt của bạn · Đỏ');
    expect(errors).toEqual([]);
    await closeGame(page);
  } finally {
    await context.close();
  }
});

test('mobile Tìm Điểm Khác Biệt finishes its three-scene course by keyboard and touch, then reflows wide', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    await loadPortal(page);
    await openGame(page, 'tim-diem-khac-biet');
    await expect(page.locator('#sdImageA img')).toHaveAttribute('src', 'assets/spot-the-difference-a.svg');
    await expect(page.locator('#sdImageB img')).toHaveAttribute('src', 'assets/spot-the-difference-b.svg');
    await expect(page.locator('#sdImages')).toHaveCSS('grid-template-columns', /\d+px/);
    await page.locator('#sdImageA').focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(page.locator('#sdFound')).toHaveText('1 / 5');
    await page.locator('#sdPause').tap();
    await expect(page.locator('#sdOverlayTitle')).toHaveText('Tạm dừng');
    await page.locator('#sdOverlayAction').tap();
    await expect(page.locator('#sdOverlay')).toBeHidden();
    for (let index = 1; index < 5; index++) {
      const point = await page.evaluate(i => window.NP_SpotDifferenceModel.SCENES[0].targets[i].b, index);
      const box = await page.locator('#sdImageB').boundingBox();
      await page.locator('#sdImageB').tap({ position: { x: point[0] * box.width, y: point[1] * box.height } });
      if (index < 4) await expect(page.locator('#sdFound')).toHaveText(`${index + 1} / 5`);
    }
    await expect(page.locator('#sdScene')).toHaveText('2 / 3');
    await expect(page.locator('#sdFound')).toHaveText('0 / 5');
    for (let sceneIndex = 1; sceneIndex < 3; sceneIndex++) {
      const targets = await page.evaluate(i => window.NP_SpotDifferenceModel.SCENES[i].targets.map(target => target.b), sceneIndex);
      for (const point of targets) {
        const box = await page.locator('#sdImageB').boundingBox();
        await page.locator('#sdImageB').tap({ position: { x: point[0] * box.width, y: point[1] * box.height } });
      }
      if (sceneIndex === 1) {
        await expect(page.locator('#sdScene')).toHaveText('3 / 3');
        await expect(page.locator('#sdFound')).toHaveText('0 / 5');
      }
    }
    await expect(page.locator('#sdOverlayTitle')).toHaveText('Xong cả ba!');
    await page.locator('#sdOverlayAction').tap();
    await expect(page.locator('#sdFound')).toHaveText('0 / 5');
    for (let i = 0; i < 5; i++) await page.locator('#sdImageA').tap({ position: { x: 3, y: 3 } });
    await expect(page.locator('#sdOverlayTitle')).toHaveText('Hết lượt');
    await page.locator('#sdOverlayAction').tap();
    await closeGame(page);

    await page.setViewportSize({ width: 1024, height: 900 });
    await openGame(page, 'tim-diem-khac-biet');
    const a = await page.locator('#sdImageA').boundingBox(), b = await page.locator('#sdImageB').boundingBox();
    expect(a.x + a.width).toBeLessThan(b.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('mobile Đập Chuột Chũi scores with direct keyboard/touch input, pauses, wins and replays', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    await loadPortal(page);
    await openGame(page, 'dap-chuot-chui');
    await expect(page.locator('.mole-hole')).toHaveCount(9);
    const gameStyle = await page.locator('.mole-game').evaluate(node => ({
      background: getComputedStyle(node).backgroundImage,
      pauseGlyph: node.querySelector('#molePause').textContent
    }));
    expect(gameStyle.background).toContain('255, 253, 243');
    expect(gameStyle.pauseGlyph).toBe('||');
    const activeHole = async () => Number(await page.locator('.mole-hole.is-up').getAttribute('data-hole'));
    const first = await activeHole();
    await page.keyboard.press(String(first + 1));
    await expect(page.locator('#moleHits')).toHaveText('1 / 12');
    await page.locator(`#moleHole${await activeHole()}`).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#moleHits')).toHaveText('2 / 12');
    await page.locator('#molePause').tap();
    await expect(page.locator('#moleOverlayTitle')).toHaveText('Tạm dừng');
    await page.locator('#moleOverlayAction').tap();
    await expect(page.locator('#moleOverlay')).toBeHidden();
    for (let hits = 2; hits < 12; hits++) {
      const index = await activeHole();
      await page.locator(`#moleHole${index}`).tap();
      await expect(page.locator('#moleHits')).toHaveText(`${hits + 1} / 12`);
    }
    await expect(page.locator('#moleOverlayTitle')).toHaveText('Bắt đủ 12!');
    await expect(page.locator('#moleScore')).toHaveText('3500');
    await page.locator('#moleOverlayAction').tap();
    await expect(page.locator('#moleHits')).toHaveText('0 / 12');
    await expect(page.locator('#moleOverlay')).toBeHidden();
    const board = await page.locator('#moleBoard').boundingBox();
    expect(board.width).toBeLessThanOrEqual(350);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);

    await page.setViewportSize({ width: 1280, height: 900 });
    await openGame(page, 'dap-chuot-chui');
    const hole = await page.locator('#moleHole0').boundingBox();
    expect(hole.width).toBeGreaterThanOrEqual(68);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('mobile Bảy Cột keeps card taps 44px wide, pans its board, and draws from the stock', async ({ browser }) => {
  const { context, page } = await newMobilePage(browser);
  const errors = watchErrors(page);
  try {
    await openGame(page, 'xep-bai-solitaire');
    await expect(page.locator('#klBoardPan')).toBeVisible();
    const controls = await page.locator('.kl-pan-button').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(controls.every(box => box.width >= 44 && box.height >= 44), JSON.stringify(controls)).toBe(true);
    const firstCard = await page.locator('.kl-card:not(.kl-back)').first().boundingBox();
    expect(firstCard.width).toBeGreaterThanOrEqual(44);
    await page.locator('#klPanRight').tap();
    await expect.poll(() => page.locator('#klBoardScroll').evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await page.locator('#klPanLeft').tap();
    await expect.poll(() => page.locator('#klBoardScroll').evaluate(node => node.scrollLeft)).toBe(0);
    await page.locator('#klStock').tap();
    await expect(page.locator('#klStatus')).toContainText('Đã lật một lá');
    await expectViewportFits(page);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('mobile Bốn Ô pans to the last columns and selects a face-up card by touch', async ({ browser }) => {
  const { context, page } = await newMobilePage(browser);
  const errors = watchErrors(page);
  try {
    await openGame(page, 'xep-bai-freecell');
    await expect(page.locator('#fcBoardPan')).toBeVisible();
    const controls = await page.locator('.fc-pan-button').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(controls.every(box => box.width >= 44 && box.height >= 44), JSON.stringify(controls)).toBe(true);
    await page.locator('#fcPanRight').tap();
    await expect.poll(() => page.locator('#fcBoardScroll').evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await page.locator('#fcPanLeft').tap();
    await expect.poll(() => page.locator('#fcBoardScroll').evaluate(node => node.scrollLeft)).toBe(0);
    await page.locator('.fc-card[data-pile="0"]').last().tap();
    await expect(page.locator('.fc-card[data-pile="0"][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('#fcStatus')).toContainText('Đã chọn bài');
    await expectViewportFits(page);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('mobile Bài Nhện pans its ten-column board, shows a legal hint, and completes that move', async ({ browser }) => {
  const { context, page } = await newMobilePage(browser);
  const errors = watchErrors(page);
  try {
    await openGame(page, 'xep-bai-nhen-spider');
    await expect(page.locator('#spBoardPan')).toBeVisible();
    await page.locator('#spPanRight').tap();
    await expect.poll(() => page.locator('#spBoardScroll').evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await page.locator('#spPanLeft').tap();
    await expect.poll(() => page.locator('#spBoardScroll').evaluate(node => node.scrollLeft)).toBe(0);
    await page.locator('#spHint').tap();
    const hint = await page.locator('#spStatus').innerText();
    const move = hint.match(/Cột (\d+) → (\d+)/);
    if (move) {
      await page.locator(`.sp-pile[data-pile="${Number(move[2]) - 1}"]`).tap();
      await expect(page.locator('#spUndo')).toBeEnabled();
      await expect(page.locator('#spStatus')).not.toHaveText(hint);
    } else if (hint.includes('Chia thêm một hàng')) {
      await page.locator('#spStock').tap();
      await expect(page.locator('#spStatus')).toContainText('Đã chia 10 lá');
    } else {
      throw new Error(`Unexpected Spider hint: ${hint}`);
    }
    await expectViewportFits(page);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('mobile Sắc Chuyền reveals the full hand with pan controls and draws a card', async ({ browser }) => {
  const { context, page } = await newMobilePage(browser);
  const errors = watchErrors(page);
  try {
    await openGame(page, 'danh-bai-uno');
    await expect(page.locator('#ssHandPan')).toBeVisible();
    await expect(page.locator('#ssHand .ss-card')).toHaveCount(6);
    const controls = await page.locator('.ss-hand-pan-button').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(controls.every(box => box.width >= 44 && box.height >= 44), JSON.stringify(controls)).toBe(true);
    await page.locator('#ssHandPanRight').tap();
    await expect.poll(() => page.locator('#ssHand').evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await page.locator('#ssHandPanLeft').tap();
    await expect.poll(() => page.locator('#ssHand').evaluate(node => node.scrollLeft)).toBe(0);
    const before = Number(await page.locator('#ssDrawCount').innerText());
    await page.locator('#ssDraw').tap();
    await expect.poll(async () => Number(await page.locator('#ssDrawCount').innerText())).toBe(before - 1);
    await expect(page.locator('#ssHandCount')).toHaveText('7 lá');
    await expectViewportFits(page);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('Ghép Phân Tử solves its four exact H2O boards with keyboard and touch at phone and desktop widths', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  const solutions = [
    [['h2', 'left'], ['h2', 'up'], ['o', 'right'], ['o', 'down'], ['h1', 'down'], ['h2', 'right']],
    [['h2', 'left'], ['o', 'left'], ['h1', 'up'], ['h2', 'up'], ['h1', 'left'], ['h2', 'down'], ['o', 'down'], ['h1', 'down']],
    [['h1', 'right'], ['h2', 'right'], ['h2', 'down'], ['o', 'right'], ['o', 'up'], ['h1', 'left'], ['o', 'left'], ['o', 'down'], ['h1', 'right'], ['h2', 'left']],
    [['h1', 'down'], ['h1', 'left'], ['h2', 'up'], ['o', 'up'], ['o', 'left'], ['o', 'down'], ['o', 'left'], ['h2', 'down'], ['h2', 'right'], ['o', 'right'], ['h2', 'down'], ['h2', 'right']]
  ];
  try {
    await loadPortal(page);
    await openGame(page, 'atomix-ghep-phan-tu-hoa-hoc');
    await expect(page.locator('.ag-atom')).toHaveCount(3);
    await expect(page.locator('.ag-target')).toHaveCount(3);
    await expect(page.locator('.ag-board')).toBeVisible();

    await page.locator('.ag-atom[data-atom="h1"]').tap();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#agMoves')).toHaveText('1 lượt');
    await page.locator('#agRestart').tap();
    await expect(page.locator('#agMoves')).toHaveText('0 lượt');
    await page.locator('#agPause').tap();
    await expect(page.locator('#agOverlayTitle')).toHaveText('Tạm dừng');
    await page.locator('#agOverlayNext').tap();
    await expect(page.locator('#agOverlay')).toBeHidden();

    // Select H₂ with touch; arrow input then directional-pad taps share the same slide rules.
    await page.locator('.ag-atom[data-atom="h2"]').tap();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#agMoves')).toHaveText('1 lượt');
    for (const [atom, dir] of solutions[0].slice(1, 3)) {
      await page.locator(`.ag-atom[data-atom="${atom}"]`).tap();
      await page.locator(`.ag-pad [data-dir="${dir}"]`).tap();
    }
    await page.locator('#modalGameContainer').screenshot({ path: 'docs/qa/atom-glide-playtest-20261009/atom-glide-mobile.png' });
    for (const [atom, dir] of solutions[0].slice(3)) {
      await page.locator(`.ag-atom[data-atom="${atom}"]`).tap();
      await page.locator(`.ag-pad [data-dir="${dir}"]`).tap();
    }
    await expect(page.locator('#agOverlayTitle')).toHaveText('Ghép đúng H₂O!');
    for (let level = 1; level < solutions.length; level++) {
      await page.locator('#agOverlayNext').tap();
      await expect(page.locator('#agStage')).toHaveText(`Màn ${level + 1} / 4`);
      for (const [atom, dir] of solutions[level]) {
        await page.locator(`.ag-atom[data-atom="${atom}"]`).tap();
        await page.locator(`.ag-pad [data-dir="${dir}"]`).tap();
      }
      await expect(page.locator('#agOverlayTitle')).toHaveText(level === 3 ? 'Đã ghép H₂O!' : 'Ghép đúng H₂O!');
    }
    await page.locator('#agOverlayNext').tap();
    await expect(page.locator('#agStage')).toHaveText('Màn 1 / 4');
    await expect(page.locator('#agMoves')).toHaveText('0 lượt');
    const mobile = await page.locator('.ag-atom').first().boundingBox();
    expect(mobile.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);

    await page.setViewportSize({ width: 320, height: 720 });
    await openGame(page, 'atomix-ghep-phan-tu-hoa-hoc');
    expect((await page.locator('.ag-atom').first().boundingBox()).width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);

    await page.setViewportSize({ width: 1280, height: 900 });
    await openGame(page, 'atomix-ghep-phan-tu-hoa-hoc');
    const desktop = await page.locator('.ag-board').boundingBox();
    expect(desktop.width).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('Nối Ống Nước routes all three live-flow puzzles on touch and keyboard without overflow', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  const dirNames = ['bắc', 'đông', 'nam', 'tây'];
  try {
    await loadPortal(page);
    await openGame(page, 'noi-ong-nuoc-pipemania');
    await expect(page.locator('#modalGameTitle')).toHaveText('Nối Ống Nước');
    await expect(page.locator('.pr-tile')).toHaveCount(25);
    await expect(page.locator('.pr-tile[data-pipe="0,2"]')).toContainText('Vòi');
    await expect(page.locator('.pr-tile[data-pipe="4,2"]')).toContainText('Bể');

    await page.locator('.pr-tile[data-pipe="0,0"]').focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => document.activeElement.dataset.pipe)).toBe('1,0');
    await page.keyboard.press('d');
    await expect(page.locator('#prMoves')).toHaveText('1 lượt xoay');
    await page.locator('#prUndo').tap();
    await expect(page.locator('#prMoves')).toHaveText('0 lượt xoay');
    await page.locator('#prPause').tap();
    await expect(page.locator('#prOverlayTitle')).toHaveText('Đã tạm dừng');
    const pausedTime = await page.locator('#prTimer').textContent();
    await page.waitForTimeout(1100);
    await expect(page.locator('#prTimer')).toHaveText(pausedTime);
    await page.locator('#prPrimary').tap();
    await expect(page.locator('#prOverlay')).toBeHidden();
    await page.locator('#prRestart').tap();
    await expect(page.locator('#prMoves')).toHaveText('0 lượt xoay');
    await page.locator('#modalGameContainer').screenshot({ path: 'docs/qa/pipe-route-playtest-20261009/pipe-route-mobile.png' });

    const paths = await page.evaluate(() => window.NP_PipeRouteModel.PATHS.map(path => path.map(point => [...point])));
    for (let level = 0; level < paths.length; level++) {
      const pathPoints = paths[level];
      for (let i = 0; i < pathPoints.length; i++) {
        const [x, y] = pathPoints[i], target = [];
        if (i === 0) target.push(3);
        else {
          const [px, py] = pathPoints[i - 1];
          target.push(px < x ? 3 : px > x ? 1 : py < y ? 0 : 2);
        }
        if (i === pathPoints.length - 1) target.push(1);
        else {
          const [nx, ny] = pathPoints[i + 1];
          target.push(nx > x ? 1 : nx < x ? 3 : ny > y ? 2 : 0);
        }
        const targetName = target.sort((a, b) => a - b).map(direction => dirNames[direction]).join(' và ');
        const tile = page.locator(`.pr-tile[data-pipe="${x},${y}"]`);
        for (let turn = 0; turn < 4; turn++) {
          if (await page.locator('#prOverlay').evaluate(node => !node.hidden)) break;
          const label = await tile.getAttribute('aria-label');
          if (label.includes(`nối ${targetName}`)) break;
          await tile.tap();
        }
        if (await page.locator('#prOverlay').evaluate(node => !node.hidden)) break;
      }
      await expect(page.locator('#prOverlayTitle')).toHaveText('Nước tới bể!');
      if (level < paths.length - 1) {
        await page.locator('#prPrimary').tap();
        await expect(page.locator('#prStage')).toHaveText(`Màn ${level + 2} / 3`);
      }
    }
    await page.locator('#prPrimary').tap();
    await expect(page.locator('#prStage')).toHaveText('Màn 1 / 3');
    await expect(page.locator('#prOverlay')).toBeHidden();
    expect((await page.locator('.pr-tile').first().boundingBox()).width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);

    await page.setViewportSize({ width: 320, height: 720 });
    await openGame(page, 'noi-ong-nuoc-pipemania');
    expect((await page.locator('.pr-tile').first().boundingBox()).width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);

    await page.setViewportSize({ width: 1280, height: 900 });
    await openGame(page, 'noi-ong-nuoc-pipemania');
    expect((await page.locator('.pr-board').boundingBox()).width).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeGame(page);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('P1A games accept a real browser input and update their visible state', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await loadPortal(page);

  await openGame(page, 'do-min-minesweeper');
  const firstCell = page.locator('#dmGrid [data-cell="0"]');
  await firstCell.click();
  await expect(firstCell).toHaveClass(/dm-open/);
  const flagCell = page.locator('#dmGrid .dm-cell:not(.dm-open)').first();
  await page.locator('#dmFlagMode').click();
  await flagCell.click();
  await expect(flagCell).toHaveClass(/dm-flagged/);
  await expect(page.locator('#dmMines')).toHaveText('9');
  await flagCell.click();
  await expect(flagCell).not.toHaveClass(/dm-flagged/);
  await expect(page.locator('#dmMines')).toHaveText('10');
  await page.locator('#dmRevealMode').click();
  await closeGame(page);

  await openGame(page, 'tro-choi-2048');
  let moved = false;
  for (const direction of ['Up', 'Right', 'Down', 'Left']) {
    await page.locator(`#g2048${direction}`).click();
    if (/Lượt \d+/.test(await page.locator('#g2048Status').textContent())) { moved = true; break; }
  }
  expect(moved, 'one of the four directions must produce a legal move').toBe(true);
  await closeGame(page);

  await openGame(page, 'line-98');
  const firstBall = page.locator('#l98Grid .l98-cell[data-color]:not([data-color="0"])').first();
  await expect(firstBall).toHaveCount(1);
  await firstBall.click();
  await expect(firstBall).toHaveAttribute('aria-selected', 'true');
  const reachable = page.locator('#l98Grid .l98-cell.l98-reachable').first();
  await expect(reachable).toBeVisible();
  await reachable.click();
  await expect(page.locator('#l98MoveCount')).toHaveText('Lượt 1');
  await expect(page.locator('#l98Undo')).toBeEnabled({ timeout: 5_000 });
  await page.locator('#l98Undo').click();
  await expect(page.locator('#l98MoveCount')).toHaveText('Lượt 0');
  await closeGame(page);

  await openGame(page, 'hang-rong');
  await expect(page.locator('#hr3Goal')).toContainText('cần');
  const availableRecipe = page.locator('#hr3Recipes .hr3-recipe:enabled:visible').first();
  await expect(availableRecipe).toBeVisible();
  await availableRecipe.click();
  await expect(page.locator('#hr3Status')).toHaveText('Đang nấu…');
  await expect(page.locator('#hr3Dish0')).not.toHaveClass(/hr3-empty/, { timeout: 12_000 });
  const servedBefore = await page.locator('#hr3Goal').textContent();
  await page.locator('#hr3Customer0').click();
  await expect(page.locator('#hr3Goal')).not.toHaveText(servedBefore);
  await closeGame(page);

  expect(errors).toEqual([]);
});

test('four new games take real input, fit mobile and desktop, and release sessions', async ({ browser, page }) => {
  test.setTimeout(60_000);
  for (const mobile of [true, false]) {
    const context = mobile ? await browser.newContext({
      viewport: { width: 320, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true
    }) : null;
    const target = context ? await context.newPage() : page;
    const errors = watchErrors(target);
    try {
      await loadPortal(target);
      for (const [id, selectors] of [
        ['cut-the-rope', '#ctGame'],
        ['pinball-3d-space-cadet', '#opGame'],
        ['typer-shark', '.ts-game'],
        ['qbert-nhay-khoi-lap-phuong', '.qbp-game']
      ]) {
        await openGame(target, id);
        await expect(target.locator(selectors)).toBeVisible();
        await expectViewportFits(target);
        const undersized = await target.locator('#modalGameContainer button:visible').evaluateAll(buttons =>
          buttons.filter(button => {
            const bounds = button.getBoundingClientRect();
            return bounds.width < 44 || bounds.height < 44;
          }).map(button => button.id || button.getAttribute('aria-label') || button.textContent.trim()));
        expect(undersized, `${id} touch targets`).toEqual([]);

        if (id === 'cut-the-rope') {
          await target.locator('#ctCut').click();
          await expect(target.locator('#ctCut')).toBeDisabled();
          await target.locator('#ctPause').click();
          await expect(target.locator('#ctOverlayTitle')).toHaveText('Tạm dừng');
          await target.locator('#ctOverlayAction').click();
          await expect(target.locator('#ctOverlay')).toBeHidden();
          await target.locator('#ctRestart').click();
          await expect(target.locator('#ctCut')).toBeEnabled();
        } else if (id === 'pinball-3d-space-cadet') {
          await target.locator('#opLaunch').click();
          await expect(target.locator('#opLaunch')).toBeDisabled();
          await target.locator('#opLeft').dispatchEvent('pointerdown', { button: 0, pointerId: 4, pointerType: 'touch' });
          await expect(target.locator('.op-flipper-art.is-active')).toHaveCount(1);
          await target.locator('#opLeft').dispatchEvent('pointerup', { button: 0, pointerId: 4, pointerType: 'touch' });
          await target.locator('#opPause').click();
          await expect(target.locator('#opOverlayTitle')).toHaveText('Field paused');
          await target.locator('#opOverlayAction').click();
          await target.locator('#opRestart').click();
          await expect(target.locator('#opTargets')).toHaveText('0 / 6');
          await expect(target.locator('#opBalls')).toHaveText('3');
        } else if (id === 'typer-shark') {
          await target.locator('#tsKeyboard [data-letter="S"]').click();
          await expect(target.locator('#tsTyped')).toHaveText('S');
          await target.locator('#tsPause').click();
          await expect(target.locator('#tsOverlayTitle')).toHaveText('Tạm dừng');
          await target.locator('#tsOverlayAction').click();
          await expect(target.locator('#tsOverlay')).toBeHidden();
          await target.locator('#tsRestart').click();
          await expect(target.locator('#tsTyped')).toBeEmpty();
        } else {
          await target.locator('#qbpDownLeft').click();
          await expect(target.locator('.qbp-progress')).toHaveAttribute('aria-valuenow', '2');
          await target.locator('#qbpPause').click();
          await expect(target.locator('#qbpOverlayTitle')).toHaveText('Đã tạm dừng');
          await target.locator('#qbpOverlayAction').click();
          await expect(target.locator('#qbpOverlay')).toBeHidden();
          await target.locator('#qbpRestart').click();
          await expect(target.locator('.qbp-progress')).toHaveAttribute('aria-valuenow', '1');
        }
        await closeGame(target);
      }
      expect(errors).toEqual([]);
    } finally {
      if (context) await context.close();
    }
  }
});

test('large puzzle boards expose a touch-sized pan control only when the board overflows', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await loadPortal(page);

  await openGame(page, 'do-min-minesweeper');
  const mineScroll = page.locator('#dmScroll');
  const minePan = page.locator('#dmPan');
  await expect(minePan).toBeHidden();
  await page.locator('#dmDifficulty').selectOption('beginner');
  if (await page.locator('#dmConfirm').isVisible()) await page.locator('#dmConfirmYes').click();
  await expect(minePan).toBeVisible();
  const mineBounds = await minePan.boundingBox();
  expect(mineBounds.width).toBeGreaterThanOrEqual(44);
  expect(mineBounds.height).toBeGreaterThanOrEqual(44);
  await minePan.click();
  await expect.poll(() => mineScroll.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await expect(minePan).toHaveAttribute('aria-label', 'Cuộn ngang sang trái');
  await minePan.click();
  await expect.poll(() => mineScroll.evaluate(node => node.scrollLeft)).toBe(0);
  await closeGame(page);

  await openGame(page, 'line-98');
  const lineScroll = page.locator('#l98Scroll');
  const linePan = page.locator('#l98Pan');
  await expect(linePan).toBeVisible();
  const lineBounds = await linePan.boundingBox();
  expect(lineBounds.width).toBeGreaterThanOrEqual(44);
  expect(lineBounds.height).toBeGreaterThanOrEqual(44);
  await linePan.click();
  await expect.poll(() => lineScroll.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await expect(linePan).toHaveAttribute('aria-label', 'Cuộn ngang sang trái');
  await linePan.click();
  await expect.poll(() => lineScroll.evaluate(node => node.scrollLeft)).toBe(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(linePan).toBeHidden();
  await closeGame(page);
});

test('Minesweeper restores an active pocket board, wins the last safe reveal, and restarts cleanly', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('np_minesweeper_v1', JSON.stringify({
      version: 1,
      difficulty: 'pocket',
      stats: {},
      board: {
        version: 1,
        presetId: 'pocket',
        status: 'playing',
        firstIndex: 0,
        mines: [40, 41, 42, 43, 44, 45, 46, 47],
        revealed: Array.from({ length: 39 }, (_, i) => i),
        flags: []
      },
      elapsed: 1200
    }));
  });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'do-min-minesweeper');
  await expect(page.locator('#dmPauseCover')).toBeVisible();
  await page.locator('#dmResume').click();
  await page.locator('#dmGrid [data-cell="39"]').click();
  await expect(page.locator('#dmResultTitle')).toHaveText('Thắng!');
  await expect(page.locator('#dmMines')).toHaveText('0');
  await page.locator('#dmPlayAgain').click();
  await expect(page.locator('#dmResult')).toBeHidden();
  await expect(page.locator('#dmStatus')).toContainText('Chọn một ô để bắt đầu');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Minesweeper highlights a proven safe move and waits for the player to reveal it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('np_minesweeper_v1', JSON.stringify({
      version: 1, difficulty: 'pocket', stats: {}, elapsed: 1200,
      board: { version: 1, presetId: 'pocket', status: 'playing', firstIndex: 32,
        mines: [0, 1, 2, 3, 4, 5, 7, 8], revealed: [6, 32], flags: [0, 1, 7] }
    }));
  });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'do-min-minesweeper');
  await page.locator('#dmResume').click();
  const safeCell = page.locator('#dmGrid [data-cell="12"]');
  await page.locator('#dmHint').click();
  await expect(safeCell).toHaveClass(/dm-hint-target/);
  await expect(safeCell).not.toHaveClass(/dm-open/);
  await expect(page.locator('#dmStatus')).toContainText('cột 1 an toàn');
  await safeCell.click();
  await expect(safeCell).toHaveClass(/dm-open/);
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('2048 Undo rolls back the visible move and disables after one use', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('np_2048_state_v1', JSON.stringify({
      version: 1,
      board: [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      score: 0, moves: 0, won: false, keepPlaying: false, over: false
    }));
  });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'tro-choi-2048');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('np_2048_state_v1')));
  const undo = page.locator('#g2048Undo');
  await expect(undo).toBeDisabled();
  await page.locator('#g2048Right').click();
  await expect(page.locator('#g2048Status')).toContainText('Lượt 1');
  await expect(undo).toBeEnabled();
  await undo.click();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('np_2048_state_v1')));
  expect(restored.board).toEqual(before.board);
  expect(restored.score).toBe(before.score);
  expect(restored.moves).toBe(0);
  await expect(undo).toBeDisabled();
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('2048 completes a deterministic 2048 win, continue, and reload resume', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('np-browser-qa-2048-fixture')) {
      localStorage.setItem('np_2048_state_v1', JSON.stringify({
        version: 1,
        board: [[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        score: 0,
        moves: 0,
        won: false,
        keepPlaying: false,
        over: false
      }));
      localStorage.setItem('np-browser-qa-2048-fixture', 'used');
    }
  });
  const errors = watchErrors(page);
  await loadPortal(page);
  await openGame(page, 'tro-choi-2048');
  await page.locator('#g2048Left').click();
  await expect(page.locator('#g2048Overlay')).toBeVisible();
  await expect(page.locator('#g2048Status')).toContainText('Đạt 2048');
  await page.locator('#g2048Continue').click();
  await expect(page.locator('#g2048Overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('np_2048_state_v1')).keepPlaying)).toBe(true);
  await page.reload();
  await expect(page.locator('#catalogAvailability')).toContainText('69');
  await openGame(page, 'tro-choi-2048');
  await expect(page.locator('#g2048Overlay')).toBeHidden();
  await expect(page.locator('#g2048Score')).toHaveText('2048');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('catalog and Quầy Nước Chanh fit key viewport widths; save screenshots for local inspection', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 860 });
    await loadPortal(page);
    await page.locator('#gridAll').scrollIntoViewIfNeeded();
    const catalogWidth = await page.evaluate(() => {
      const overflowing = [...document.body.querySelectorAll('*')]
        .map(node => {
          const rect = node.getBoundingClientRect();
          return { tag: node.tagName, id: node.id, className: String(node.className || ''), text: node.textContent.trim().slice(0, 48), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: node.scrollWidth };
        })
        .filter(node => node.right > innerWidth + 1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 8);
      return { inner: innerWidth, scroll: document.documentElement.scrollWidth, overflowing };
    });
    expect(catalogWidth.scroll, `catalog overflows at ${width}px: ${JSON.stringify(catalogWidth.overflowing)}`).toBeLessThanOrEqual(catalogWidth.inner + 1);
    await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`) });

    await openGame(page, 'lemonade-tycoon');
    const bounds = await page.locator('#gameModal .modal-window').boundingBox();
    expect(bounds, `modal is visible at ${width}px`).not.toBeNull();
    expect(bounds.x, `modal left edge at ${width}px`).toBeGreaterThanOrEqual(-1);
    expect(bounds.x + bounds.width, `modal right edge at ${width}px`).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: testInfo.outputPath(`lemonade-${width}.png`) });
    await closeGame(page);
  }
  expect(errors).toEqual([]);
});

test('mobile Chromium emulation can tap 2048, lemonade, and Hàng Rong controls', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2
  });
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    await test.step('2048 direction pad accepts touch', async () => {
      await loadPortal(page);
      await openGame(page, 'tro-choi-2048');
      let moved = false;
      for (const direction of ['Up', 'Right', 'Down', 'Left']) {
        await page.locator(`#g2048${direction}`).tap();
        if (/Lượt \d+/.test(await page.locator('#g2048Status').textContent())) { moved = true; break; }
      }
      expect(moved).toBe(true);
      await closeGame(page);
    });

    await test.step('lemonade controls accept touch', async () => {
      await openGame(page, 'lemonade-tycoon');
      await page.locator('#lsPriceUp').tap();
      await expect(page.locator('#lsPrice')).toHaveText('13');
      await page.locator('#lsSweet').tap();
      await expect(page.locator('#lsSweet')).toHaveAttribute('aria-pressed', 'true');
      await closeGame(page);
    });

    await test.step('Hàng Rong cook and serve accept touch', async () => {
      await openGame(page, 'hang-rong');
      await page.locator('#hr3Cook0').tap();
      await expect(page.locator('#hr3Dish0')).not.toHaveClass(/hr3-empty/, { timeout: 12_000 });
      const servedBefore = await page.locator('#hr3Goal').textContent();
      await page.locator('#hr3Customer0').tap();
      await expect(page.locator('#hr3Goal')).not.toHaveText(servedBefore);
      await closeGame(page);
    });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('Mầm Chớp title and HUD fit the game panel at a phone width with named stage choices', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadPortal(page);
  await openGame(page, 'rockman-mega-man');

  const layout = await page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector), box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height, clientWidth: node.clientWidth, clientHeight: node.clientHeight, scrollWidth: node.scrollWidth };
    };
    const nav = document.querySelector('#mcStageNav');
    return {
      panel: rect('.mc-game'),
      title: rect('.mc-topline h2'),
      stage: rect('#mcStageName'),
      hud: rect('.mc-hud'),
      nav: rect('#mcStageNav'),
      stageButtons: [...nav.querySelectorAll('.mc-stage-button')].map(button => {
        const box = button.getBoundingClientRect();
        return {
          left: box.left, right: box.right, width: box.width, height: box.height,
          ariaLabel: button.getAttribute('aria-label'),
          spanDisplay: getComputedStyle(button.querySelector('span')).display
        };
      }),
      stageText: document.querySelector('#mcStageName').textContent
    };
  });

  await expect(page.locator('#mcStageName')).toHaveText('Chặng 1/3 · Vườn Hoang');
  await expect(page.locator('#mcStage0')).toHaveAttribute('aria-label', 'Chặng 1: Vườn Hoang');
  expect(layout.stageButtons.map(button => button.ariaLabel)).toEqual([
    'Chặng 1: Vườn Hoang', 'Chặng 2: Mương Sương', 'Chặng 3: Nhà Kính Vỡ'
  ]);
  expect(layout.nav.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.nav.clientWidth + 1);
  for (const button of layout.stageButtons) {
    expect(button.spanDisplay, JSON.stringify(button)).toBe('none');
    expect(button.width, JSON.stringify(button)).toBeGreaterThanOrEqual(44);
    expect(button.height, JSON.stringify(button)).toBeGreaterThanOrEqual(44);
    expect(button.left, JSON.stringify({ button, nav: layout.nav })).toBeGreaterThanOrEqual(layout.nav.left - 1);
    expect(button.right, JSON.stringify({ button, nav: layout.nav })).toBeLessThanOrEqual(layout.nav.right + 1);
  }
  expect(layout.hud.left, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.panel.left);
  expect(layout.hud.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.panel.right + 1);
  expect(layout.title.right, JSON.stringify(layout)).toBeLessThanOrEqual(layout.panel.right + 1);
  expect(layout.stage.width, JSON.stringify(layout)).toBeGreaterThan(120);
  expect(layout.title.width, JSON.stringify(layout)).toBeGreaterThan(120);
  expect(layout.stage.clientHeight, JSON.stringify(layout)).toBeLessThanOrEqual(32);
  expect(layout.title.clientHeight, JSON.stringify(layout)).toBeLessThanOrEqual(32);
  expect(layout.title.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.title.clientWidth + 1);
  await closeGame(page);
});

test('Mạch Gió opens its three-stage campaign with locked routes and a fresh one-button flight', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadPortal(page);
  await openGame(page, 'flappy-bird');
  await expect(page.locator('#modalGameTitle')).toHaveText('Mạch Gió');
  await expect(page.locator('#fgStageName')).toHaveText('Chặng 1/3 · Ngõ sớm');
  await expect(page.locator('#fgScore')).toHaveText('0 / 4');
  await expect(page.locator('#fgStage0')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#fgStage1')).toBeDisabled();
  await expect(page.locator('#fgStage2')).toBeDisabled();
  await page.locator('#fgStart').click();
  await expect(page.locator('#fgStatus')).toContainText('lượt');
  await page.locator('#fgPause').click();
  await expect(page.locator('#fgTitle')).toHaveText('Tạm dừng');
  await page.locator('#fgStart').click();
  await expect(page.locator('#fgOverlay')).toBeHidden();
  await closeGame(page);
});

test('Cá Lớn Nuốt Cá Bé resumes the saved reef stage and releases controls on pause', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadPortal(page);
  await page.evaluate(() => {
    const model = window.NP_FeedingFrenzyModel;
    const snapshot = model.create({ seed: 1827 }).serialize();
    snapshot.score = 4;
    snapshot.stageIndex = 1;
    snapshot.tier = 2;
    snapshot.player.radius = 19;
    snapshot.player.x = 19;
    snapshot.player.y = 19;
    localStorage.setItem('np_feeding_frenzy_save_v2', JSON.stringify(model.restore(snapshot).serialize()));
  });
  const errors = watchErrors(page);
  await openGame(page, 'feeding-frenzy');
  await expect(page.locator('#modalGameTitle')).toHaveText('Cá Lớn Nuốt Cá Bé');
  await expect(page.locator('#feedingZone')).toHaveText('Chặng 2/3 · Rạn San Hô');
  await expect(page.locator('#feedingScore')).toHaveText('4 / 12');
  await expect(page.locator('#feedingOverlay')).toBeVisible();
  await page.locator('#feedingAgain').click();
  await expect(page.locator('#feedingOverlay')).toBeHidden();
  await page.locator('#feedingPause').click();
  await expect(page.locator('#feedingAgain')).toHaveText('Tiếp tục');
  await closeGame(page);

  await openGame(page, 'feeding-frenzy');
  await expect(page.locator('#feedingZone')).toHaveText('Chặng 2/3 · Rạn San Hô');
  await expect(page.locator('#feedingScore')).toHaveText('4 / 12');
  await expect(page.locator('#feedingOverlay')).toBeVisible();
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Cá Lớn Nuốt Cá Bé accelerates into a swim and coasts after keyboard release', async ({ page }) => {
  const errors = watchErrors(page);
  await loadPortal(page);
  await page.evaluate(() => {
    const base = window.NP_FeedingFrenzyModel;
    window.__feedingModels = [];
    window.NP_FeedingFrenzyModel = {
      ...base,
      create(options) {
        const game = base.create(options);
        window.__feedingModels.push(game);
        return game;
      }
    };
  });
  await openGame(page, 'feeding-frenzy');
  const canvas = page.locator('#feedingCanvas');
  await canvas.focus();
  const start = await page.evaluate(() => window.__feedingModels.at(-1).view().player);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(220);
  const moving = await page.evaluate(() => window.__feedingModels.at(-1).view().player);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(180);
  const coasting = await page.evaluate(() => window.__feedingModels.at(-1).view().player);

  expect(moving.x - start.x, 'held input moves the fish across the tank').toBeGreaterThan(12);
  expect(moving.vx, 'the fish builds real swimming speed').toBeGreaterThan(100);
  expect(coasting.x, 'momentum carries the fish after key release').toBeGreaterThan(moving.x);
  expect(Math.abs(coasting.vx), 'released steering brakes without a snap').toBeLessThan(moving.vx);
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Phá Gạch presents the fourth-field win and restarts at the first authored field', async ({ page }) => {
  const errors = watchErrors(page);
  await loadPortal(page);
  await page.evaluate(() => {
    const base = window.NP_DxBallModel;
    window.NP_DxBallModel = {
      ...base,
      create() {
        const state = base.initialState();
        state.level = base.CAMPAIGN.length; state.status = 'won';
        state.score = 480; state.lives = 2; state.bricks = [];
        return base.makeModel(state);
      }
    };
  });
  await openGame(page, 'pha-gach-dx-ball');
  await expect(page.locator('#dbLevel')).toHaveText('4 / 4');
  await expect(page.locator('#dbStageName')).toHaveText('Lõi Bền');
  await expect(page.locator('#dbTitle')).toHaveText('Thắng rồi!');
  await expect(page.locator('#dbText')).toContainText('480 điểm');
  await page.locator('#dbStart').click();
  await expect(page.locator('#dbOverlay')).toBeHidden();
  await expect(page.locator('#dbLevel')).toHaveText('1 / 4');
  await expect(page.locator('#dbStageName')).toHaveText('Vòm Sáng');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Tuyến Sáng clears its first wave, shows the next target, and keeps pause usable', async ({ page }) => {
  await loadPortal(page);
  await page.evaluate(() => {
    const base = window.NP_BanGaVuTruModel;
    window.NP_BanGaVuTruModel = {
      ...base,
      create(seed) {
        const state = base.create(seed).serialize();
        state.ticks = 100;
        state.score = 200;
        state.kills = 2;
        state.waveIndex = 0;
        state.waveKills = 2;
        state.nextSpawnTick = 100000;
        state.drifters = [{ id: state.nextId++, x: 320, y: 100, vx: 0, vy: 0, radius: 13, tint: 0, fireAtTick: 100000 }];
        state.shots = [{ id: state.nextId++, x: 320, y: 117, vy: -base.PLAYER_SHOT_SPEED, radius: 3 }];
        return base.makeModel(state);
      }
    };
  });
  const errors = watchErrors(page);
  await openGame(page, 'ban-ga-vu-tru');
  await expect(page.locator('#modalGameTitle')).toHaveText('Tuyến Sáng');
  await expect(page.locator('#bgtWave')).toHaveText('Chặng 2/3 · Vành Lục', { timeout: 5_000 });
  await expect(page.locator('#bgtWaveProgress')).toHaveText('0/5');
  await expect(page.locator('#bgtStatus')).toContainText('Đã qua Mạch Sương');
  await page.locator('#bgtPause').click();
  await expect(page.locator('#bgtOverlayTitle')).toHaveText('Tạm dừng');
  await page.locator('#bgtContinue').click();
  await expect(page.locator('#bgtOverlay')).toBeHidden();
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Mục Tiêu Bay presents a named flight and warns before its authored turn', async ({ page }) => {
  await loadPortal(page);
  await page.evaluate(() => {
    const base = window.NP_BanVitBayModel;
    window.__bvbLiveMessages = [];
    new MutationObserver(() => {
      const live = document.querySelector('#bvbLive');
      if (live?.textContent) window.__bvbLiveMessages.push(live.textContent);
    }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
    window.NP_BanVitBayModel = {
      ...base,
      create(options) {
        const game = base.create(options);
        for (let flight = 0; flight < 3; flight += 1) {
          game.advance(base.FLIGHT_MS);
          game.advance(base.RESULT_MS);
        }
        game.advance(1000);
        return game;
      }
    };
  });
  const errors = watchErrors(page);
  await openGame(page, 'duck-hunt-ban-vit');
  await expect(page.locator('#modalGameTitle')).toHaveText('Mục Tiêu Bay');
  await expect(page.locator('#bvbCanvas')).toHaveAttribute('aria-label', /Chặng 4 trong 5: Đảo Gió/);
  await page.waitForFunction(() => window.__bvbLiveMessages.includes('Gió sắp đổi chiều.') && window.__bvbLiveMessages.includes('Mục tiêu đổi chiều.'), null, { timeout: 5_000 });
  const liveMessages = await page.evaluate(() => window.__bvbLiveMessages);
  expect(liveMessages.indexOf('Gió sắp đổi chiều.')).toBeLessThan(liveMessages.indexOf('Mục tiêu đổi chiều.'));
  await page.locator('#bvbPause').click();
  await expect(page.locator('#bvbOverlayTitle')).toHaveText('Tạm dừng');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Vườn Bật Nảy reaches its second authored course and announces the new wind', async ({ page }) => {
  await loadPortal(page);
  await page.evaluate(() => {
    const original = window.NP_FruitSweepModel;
    window.NP_FruitSweepModel = {
      ...original,
      create(options) {
        const model = original.create(options);
        window.__fruitSweepModel = model;
        return model;
      }
    };
  });
  const errors = watchErrors(page);
  await openGame(page, 'chem-hoa-qua');
  await expect(page.locator('#fsStage')).toHaveText('1/3 · Mầm Non');
  await page.locator('#fsCanvas').click({ position: { x: 320, y: 210 } });
  await page.evaluate(() => {
    const model = window.__fruitSweepModel;
    for (let tick = 0; tick < 1200; tick += 1) {
      const view = model.advance();
      for (const object of view.objects) {
        if (object.kind === 'fruit') model.slice(object.x, object.y, object.x + 0.1, object.y + 0.1);
      }
    }
  });
  await expect(page.locator('#fsStage')).toHaveText('2/3 · Gió Ngang');
  await expect(page.locator('#fsStatus')).toHaveText('Chặng 2/3 · Gió Ngang');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Nhịp Mây plays all three original charts and offers one continue between songs', async ({ page }) => {
  await loadPortal(page);
  await page.evaluate(() => {
    const original = window.NP_NhipMayModel;
    window.NP_NhipMayModel = {
      ...original,
      create() {
        const model = original.create(), advance = model.advance.bind(model);
        model.advance = () => {
          let state = model.view();
          for (let step = 0; step < 10 && state.status === 'playing'; step += 1) state = advance(0.1);
          return state;
        };
        return model;
      }
    };
  });
  const errors = watchErrors(page);
  await openGame(page, 'audition-nhip-dieu');
  await expect(page.locator('#nmSong')).toHaveText('Đoạn 1/3 · Mây Sớm');
  await page.locator('#nmOverlayAction').click();
  await expect(page.locator('#nmOverlayTitle')).toHaveText('Đoạn 1 xong');
  await page.locator('#nmOverlayAction').click();
  await expect(page.locator('#nmSong')).toHaveText('Đoạn 2/3 · Đèn Phố');
  await expect(page.locator('#nmOverlayTitle')).toHaveText('Đoạn 2 xong');
  await page.locator('#nmOverlayAction').click();
  await expect(page.locator('#nmSong')).toHaveText('Đoạn 3/3 · Mưa Nhịp');
  await expect(page.locator('#nmOverlayTitle')).toHaveText('Bộ nhịp khép lại');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Đẩy Thùng clears six authored rooms through real keyboard input and unlocks the final restart', async ({ page }) => {
  await loadPortal(page);
  const errors = watchErrors(page);
  await openGame(page, 'day-thung-sokoban');
  const solutions = [
    ['right','right','up','left','left','left'],
    ['left','up','right','down','right','up'],
    ['up','up','left','up','right','right'],
    ['right','down','right','down','right','up','up','left','up','right','down','left','left','left','down','left','up'],
    ['right','down','left','down','left','up','up','up','right','up','right','down','up','left','left','left'],
    ['right','down','down','left','down','right','down','left','left','up','right','up','left','left','left','down','left','down','right','right','right','right','right']
  ];
  for (let level = 0; level < solutions.length; level += 1) {
    await expect(page.locator('.np-soko-stage')).toContainText(`Màn ${level + 1}/6`);
    for (const direction of solutions[level]) {
      const key = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }[direction];
      await page.locator('.np-soko-board').focus();
      await page.keyboard.press(key);
    }
    await expect(page.locator('.np-soko-next')).toBeVisible();
    if (level < solutions.length - 1) await page.locator('.np-soko-next').click();
  }
  await expect(page.locator('.np-soko-stage')).toContainText('Màn 6/6 · Chuyến hàng cuối');
  await expect(page.locator('.np-soko-status')).toContainText('Xong cả kho');
  await expect(page.locator('.np-soko-next')).toHaveText('Chơi lại từ đầu');
  await closeGame(page);
  expect(errors).toEqual([]);
});

test('Bể Sao advances its reef pressure without a store, timer pause, or new setup screen', async ({ page }) => {
  await loadPortal(page);
  await page.evaluate(() => {
    const original = window.NP_SeaGardenModel;
    window.NP_SeaGardenModel = {
      ...original,
      create(options) {
        const game = original.create(options), advance = game.advance.bind(game);
        let ticks = 0;
        game.advance = () => {
          const events = [];
          for (let tick = 0; tick < 10 && game.view().status === 'playing'; tick += 1) {
            const view = game.view();
            if (view.fish.length && ticks % 5 === 0) {
              const fish = view.fish[(Math.floor(ticks / 5) % view.fish.length)];
              game.dropFood(fish.x, fish.y);
            }
            for (const alien of game.view().aliens) {
              if (alien.x < 0 || alien.x > original.WIDTH) continue;
              for (let hit = 0; hit < alien.hp; hit += 1) game.actionAt(alien.x, alien.y);
            }
            events.push(...advance(original.TICK_MS));
            ticks += 1;
          }
          return events;
        };
        return game;
      }
    };
  });
  const errors = watchErrors(page);
  await openGame(page, 'nuoi-ca-nemo');
  await expect(page.locator('#seaZone')).toHaveText('1/3 · Rạn Nông');
  await expect(page.locator('#seaGoal')).toHaveText('Ngọc vùng: 0 / 2');
  await expect(page.locator('#seaPearls')).toHaveText('0 / 8');
  await expect(page.locator('.sea-game details')).toHaveCount(1);
  await expect(page.locator('#seaZone')).toHaveText('3/3 · Vịnh Ngọc', { timeout: 8_000 });
  await expect(page.locator('#seaGoal')).toHaveText('Ngọc vùng: 3 / 3');
  await expect(page.locator('#seaPearls')).toHaveText('8 / 8');
  await closeGame(page);
  expect(errors).toEqual([]);
});
