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
  await expect(page.locator('#catalogAvailability')).toContainText('51');
}

test('the default grid is playable-only; explicit catalog browsing keeps planned entries informational', async ({ page }) => {
  await loadPortal(page);
  await expect(page.locator('#allSectionTitle')).toHaveText('Bản thử nghiệm có thể chơi (51)');
  await expect(page.locator('#gridAll .game-card')).toHaveCount(51);
  await expect(page.locator('.filter-pill[data-category="playable"]')).toHaveClass(/active/);

  await page.locator('.filter-pill[data-category="all"]').click();
  await expect(page.locator('#gridAll .game-card')).toHaveCount(150);
  const planned = page.locator('#gridAll .game-card[data-id="pizza-frenzy"]');
  await expect(planned.locator('.game-card-status')).toHaveText('Chưa có bản chơi');
  await expect(planned.locator('.game-card-play')).toHaveCount(0);
  await planned.click();
  await expect(page.locator('#gameModal')).toHaveCSS('display', 'none');
});

test('all 51 registered games open, render, close and release their session', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await loadPortal(page);
  const routes = await page.evaluate(() => {
    const byId = new Map(window.__NP_GAMES_CACHE__.map(game => [game.id, game]));
    return Object.entries(window.NP_GameRegistry.entries).map(([id, engine]) => ({
      id, engine, title: byId.get(id)?.title || id
    }));
  });
  expect(routes).toHaveLength(51);

  for (const route of routes) {
    await openGame(page, route.id);
    await expect(page.locator('#modalGameTitle')).toHaveText(route.title);
    expect(await page.locator('#modalGameContainer').evaluate(node => node.childElementCount), route.id).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.NP_GameSession.getCurrent() !== null), route.id).toBe(true);
    await closeGame(page);
  }
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
  await expect(page.locator('#catalogAvailability')).toContainText('51');
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
