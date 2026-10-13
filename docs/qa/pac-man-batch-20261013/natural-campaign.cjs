/*
 * Natural-input Chromium run for Pac-Man. It opens the title through the real
 * catalog router, reads copied state for planning, and sends real keyboard
 * events. No maze, score, timer, life, or phase state is injected or changed.
 *
 * Start `python3 -m http.server 8792 --bind 127.0.0.1` at the repository root,
 * then run `node docs/qa/pac-man-batch-20261013/natural-campaign.cjs`.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { plan } = require('./planner.cjs');

const base = process.env.PACMAN_QA_BASE || 'http://127.0.0.1:8792/';
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const marker = 'let state = pacManModel.create(saved);';
const readOnlyHook = `${marker}
    window.__PACMAN_READ_ONLY_SNAPSHOT__ = () => ({
      score: state.score, bestScore: state.bestScore, level: state.level, lives: state.lives,
      phase: state.phase, paused: state.paused, pelletsLeft: state.pelletsLeft, ghostMode: state.ghostMode,
      frightenedTimer: state.frightenedTimer, hitTimer: state.hitTimer, clock: state.clock,
      maze: state.maze.map(row => row.slice()), player: { ...state.player },
      ghosts: state.ghosts.map(ghost => ({ x: ghost.x, y: ghost.y, progress: ghost.progress,
        speed: ghost.speed, releaseTimer: ghost.releaseTimer, respawnTimer: ghost.respawnTimer }))
    });`;
const keys = { up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight' };
const buttons = { up: '#pmUp', left: '#pmLeft', down: '#pmDown', right: '#pmRight' };
const dirVector = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };

async function launchGame(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.openGameById === 'function', undefined, { timeout: 20000 });
  await page.waitForFunction(() => !!document.querySelector('.game-card[data-id="pac-man"]'), undefined, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.openGameById('pac-man')), true, 'open through the real catalog router');
  await page.waitForSelector('#pmCanvas');
}

function frameSummary(intervals) {
  const sorted = intervals.filter(value => Number.isFinite(value) && value > 0).slice().sort((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : null;
  return {
    frames: sorted.length,
    approximateFps: sorted.length ? +(1000 / (sorted.reduce((sum, value) => sum + value, 0) / sorted.length)).toFixed(1) : null,
    p50FrameMs: percentile(0.5) === null ? null : +percentile(0.5).toFixed(2),
    p95FrameMs: percentile(0.95) === null ? null : +percentile(0.95).toFixed(2)
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(new URL(request.url()).origin));
  await page.addInitScript(() => {
    window.__PACMAN_QA_FRAME_INTERVALS__ = [];
    let previous;
    const sample = time => {
      if (previous !== undefined) window.__PACMAN_QA_FRAME_INTERVALS__.push(time - previous);
      previous = time;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.route('**/scripts/engines-classics.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.equal(source.split(marker).length - 1, 1, 'read-only QA hook anchor changed; refusing to patch unexpected source');
    await route.fulfill({ status: response.status(), contentType: 'application/javascript; charset=utf-8', body: source.replace(marker, readOnlyHook) });
  });

  await launchGame(page);
  const initial = await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__());
  assert.equal(initial.phase, 'playing');
  assert.equal(initial.level, 1);
  assert.equal(initial.pelletsLeft, 183);
  assert.equal(initial.lives, 3);
  assert.deepEqual(initial.ghosts.map(ghost => ghost.speed), [48, 48, 48, 48]);
  await page.locator('#gameModal').screenshot({ path: path.join(__dirname, 'screenshots', 'natural-desktop-start.png') });

  let candidateDirection = null, stableDirectionSamples = 0, lastTarget = null, lastCommandAt = 0, moves = 0, samples = 0;
  const start = Date.now();
  let state = initial;
  while (Date.now() - start < 210000 && samples++ < 4800 && state.level < 2 && state.phase !== 'over') {
    state = await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__());
    if (state.phase === 'playing' && !state.paused && state.hitTimer <= 0.01) {
      const command = plan(state, lastTarget);
      if (Number.isInteger(command.target?.n)) lastTarget = { x: command.target.n % state.maze[0].length, y: Math.floor(command.target.n / state.maze[0].length), power: command.target.power };
      if (command.dir === candidateDirection) stableDirectionSamples++;
      else { candidateDirection = command.dir; stableDirectionSamples = command.dir ? 1 : 0; }
      const vector = dirVector[command.dir];
      const needsQueue = vector && (state.player.nextX !== vector[0] || state.player.nextY !== vector[1]);
      if (command.dir && needsQueue && stableDirectionSamples >= 1 && Date.now() - lastCommandAt > 80) {
        await page.keyboard.press(keys[command.dir]);
        lastCommandAt = Date.now();
        moves++;
      }
    }
    await page.waitForTimeout(50);
  }
  const naturalElapsedSeconds = +((Date.now() - start) / 1000).toFixed(1);
  state = await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__());
  await page.locator('#gameModal').screenshot({ path: path.join(__dirname, 'screenshots', 'natural-desktop-end.png') });
  const remaining = [];
  for (let y = 0; y < state.maze.length; y++) for (let x = 0; x < state.maze[y].length; x++) if (state.maze[y][x] === 2 || state.maze[y][x] === 3) remaining.push([x, y, state.maze[y][x]]);
  assert.equal(state.level, 2, `natural route did not clear level 1: ${JSON.stringify({ phase: state.phase, lives: state.lives, dots: state.pelletsLeft, remaining, player: state.player, ghosts: state.ghosts, score: state.score, clock: state.clock, lastTarget, seconds: naturalElapsedSeconds })}`);
  assert.equal(state.phase, 'playing', 'level 2 should start through ordinary dot collection');
  assert.equal(state.pelletsLeft, 183);
  assert.ok(state.score > 0);
  const levelTwo = {
    score: state.score, lives: state.lives, level: state.level,
    pelletsLeft: state.pelletsLeft, ghostSpeeds: state.ghosts.map(ghost => ghost.speed),
    releaseTimers: state.ghosts.map(ghost => +ghost.releaseTimer.toFixed(1))
  };
  assert.deepEqual(state.ghosts.map(ghost => ghost.speed), [50, 50, 50, 50]);

  const offline = await page.context().newCDPSession(page);
  await offline.send('Network.enable');
  await offline.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: 'none' });
  const clockBeforeOffline = state.clock;
  await page.waitForTimeout(1200);
  const afterOffline = await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__());
  assert.ok(afterOffline.clock > clockBeforeOffline + 0.6, 'open game loop continues after network is disconnected');
  await offline.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: 'wifi' });

  await page.locator('#pmPause').click();
  const paused = await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__());
  assert.equal(paused.paused, true);
  const pausedClock = paused.clock;
  await page.waitForTimeout(300);
  assert.equal((await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__())).clock, pausedClock, 'pause freezes simulation time');
  await page.locator('#pmPause').click();
  assert.equal((await page.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__())).paused, false);

  const bestBeforeRestart = state.bestScore;
  await page.locator('#pmRestart').click();
  await page.waitForTimeout(150);
  const restarted = await page.evaluate(() => ({
    state: window.__PACMAN_READ_ONLY_SNAPSHOT__(),
    best: document.querySelector('#pmBest').textContent,
    record: JSON.parse(localStorage.getItem('np_pacman_maze_record_v1'))
  }));
  assert.deepEqual({ score: restarted.state.score, lives: restarted.state.lives, level: restarted.state.level, pellets: restarted.state.pelletsLeft }, { score: 0, lives: 3, level: 1, pellets: 183 });
  assert.ok(restarted.state.bestScore >= bestBeforeRestart);
  assert.equal(restarted.record.bestScore, restarted.state.bestScore, 'record survives natural clear and restart');

  const oldState = await page.evaluate(() => {
    window.__PACMAN_QA_OLD_STATE__ = window.__PACMAN_READ_ONLY_SNAPSHOT__;
    const value = window.__PACMAN_QA_OLD_STATE__().clock;
    window.closeGameModal();
    return value;
  });
  await page.waitForFunction(() => !document.querySelector('#pmCanvas'));
  await page.waitForTimeout(250);
  const closedClock = await page.evaluate(() => window.__PACMAN_QA_OLD_STATE__().clock);
  assert.equal(closedClock, oldState, 'closed game session stops its simulation clock');

  const desktopReopen = await launchGame(page);
  void desktopReopen;
  const reopened = await page.evaluate(() => ({
    state: window.__PACMAN_READ_ONLY_SNAPSHOT__(),
    best: document.querySelector('#pmBest').textContent
  }));
  assert.equal(reopened.state.score, 0);
  assert.equal(reopened.state.level, 1);
  assert.equal(reopened.state.pelletsLeft, 183);
  assert.equal(Number(reopened.best.replaceAll(',', '')), reopened.state.bestScore);
  await page.waitForTimeout(2000);
  const desktopFrames = await page.evaluate(() => window.__PACMAN_QA_FRAME_INTERVALS__.slice(-180));

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', error => errors.push(error.message));
  mobilePage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await mobilePage.route('**/scripts/engines-classics.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.equal(source.split(marker).length - 1, 1, 'read-only hook anchor changed on mobile route');
    await route.fulfill({ status: response.status(), contentType: 'application/javascript; charset=utf-8', body: source.replace(marker, readOnlyHook) });
  });
  await launchGame(mobilePage);
  const mobileStart = await mobilePage.evaluate(() => {
    const canvas = document.querySelector('#pmCanvas').getBoundingClientRect();
    const dpad = [...document.querySelectorAll('.np-pm-dpad button')].map(button => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    return { viewport: { width: innerWidth, height: innerHeight }, canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height, bottom: canvas.bottom }, dpad, state: window.__PACMAN_READ_ONLY_SNAPSHOT__() };
  });
  assert.ok(mobileStart.canvas.width <= mobileStart.viewport.width, 'mobile board fits viewport width');
  assert.ok(mobileStart.dpad.every(button => button.width >= 44 && button.height >= 44), 'mobile touch targets are at least 44px');
  await mobilePage.locator('#gameModal').screenshot({ path: path.join(__dirname, 'screenshots', 'natural-mobile-start.png') });
  const touchDirection = plan(mobileStart.state, null).dir;
  assert.ok(touchDirection, 'planner found a legal initial route for touch check');
  await mobilePage.locator(buttons[touchDirection]).tap();
  await mobilePage.waitForTimeout(350);
  const mobileAfterTouch = await mobilePage.evaluate(() => window.__PACMAN_READ_ONLY_SNAPSHOT__());
  const vector = dirVector[touchDirection];
  assert.ok((mobileAfterTouch.player.dirX === vector[0] && mobileAfterTouch.player.dirY === vector[1]) ||
    (mobileAfterTouch.player.nextX === vector[0] && mobileAfterTouch.player.nextY === vector[1]) ||
    mobileAfterTouch.player.x !== mobileStart.state.player.x || mobileAfterTouch.player.y !== mobileStart.state.player.y,
  `touch D-pad queues or moves ${touchDirection}`);
  await mobile.close();

  const fps = frameSummary(desktopFrames);
  const origins = [...new Set(requests)];
  assert.deepEqual(errors, [], 'no browser page or console errors');
  console.log(JSON.stringify({
    browser: `Chromium ${browser.version()}`, viewport: { width: 1365, height: 900 }, route: 'openGameById(pac-man)',
    runType: 'natural maze state with keyboard input; injected code only exposes a copied read-only snapshot',
    naturalLevelOne: { elapsedSeconds: naturalElapsedSeconds, plannerSamples: samples, keyboardMoves: moves, score: levelTwo.score, livesAtClear: levelTwo.lives, level: levelTwo.level, pelletsAfterClear: levelTwo.pelletsLeft },
    levelTwo, offline: { clockBefore: +clockBeforeOffline.toFixed(2), clockAfter: +afterOffline.clock.toFixed(2), continued: true },
    pause: { frozeClock: true, resumed: true }, restart: { score: restarted.state.score, lives: restarted.state.lives, level: restarted.state.level, pellets: restarted.state.pelletsLeft, persistedBest: restarted.record.bestScore },
    closeCleanup: { clockBefore: oldState, clockAfter: closedClock, stopped: oldState === closedClock },
    mobile: { viewport: mobileStart.viewport, canvas: mobileStart.canvas, dpadMinWidth: Math.min(...mobileStart.dpad.map(button => button.width)), dpadMinHeight: Math.min(...mobileStart.dpad.map(button => button.height)), touchDirection, touchApplied: true },
    performance: { finalDesktopFrameSample: fps }, requestOrigins: origins, errors
  }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
