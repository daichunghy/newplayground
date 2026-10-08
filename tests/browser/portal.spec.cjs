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
  await expect(page.locator('#catalogAvailability')).toContainText('50');
}

test('the default grid is playable-only; explicit catalog browsing keeps planned entries informational', async ({ page }) => {
  await loadPortal(page);
  await expect(page.locator('#allSectionTitle')).toHaveText('Bản thử nghiệm có thể chơi (50)');
  await expect(page.locator('#gridAll .game-card')).toHaveCount(50);
  await expect(page.locator('.filter-pill[data-category="playable"]')).toHaveClass(/active/);

  await page.locator('.filter-pill[data-category="all"]').click();
  await expect(page.locator('#gridAll .game-card')).toHaveCount(150);
  const planned = page.locator('#gridAll .game-card[data-id="pizza-frenzy"]');
  await expect(planned.locator('.game-card-status')).toHaveText('Chưa có bản chơi');
  await expect(planned.locator('.game-card-play')).toHaveCount(0);
  await planned.click();
  await expect(page.locator('#gameModal')).toHaveCSS('display', 'none');
});

test('all 50 registered games open, render, close and release their session', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await loadPortal(page);
  const routes = await page.evaluate(() => {
    const byId = new Map(window.__NP_GAMES_CACHE__.map(game => [game.id, game]));
    return Object.entries(window.NP_GameRegistry.entries).map(([id, engine]) => ({
      id, engine, title: byId.get(id)?.title || id
    }));
  });
  expect(routes).toHaveLength(50);

  for (const route of routes) {
    await openGame(page, route.id);
    await expect(page.locator('#modalGameTitle')).toHaveText(route.title);
    expect(await page.locator('#modalGameContainer').evaluate(node => node.childElementCount), route.id).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.NP_GameSession.getCurrent() !== null), route.id).toBe(true);
    await closeGame(page);
  }
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
  await expect(page.locator('#catalogAvailability')).toContainText('50');
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
    return {
      panel: rect('.mc-game'),
      title: rect('.mc-topline h2'),
      stage: rect('#mcStageName'),
      hud: rect('.mc-hud'),
      nav: rect('#mcStageNav'),
      stageButtons: [...document.querySelectorAll('#mcStageNav .mc-stage-button')].map(button => {
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
