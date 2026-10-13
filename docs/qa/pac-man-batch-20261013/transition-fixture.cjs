/*
 * Fixture-backed browser regression for the Pac-Man level transition.
 *
 * Start the repository's static server at http://127.0.0.1:8792, then run:
 *   node docs/qa/pac-man-batch-20261013/transition-fixture.cjs
 *
 * Playwright intercepts only this test page's engines-classics.js response and
 * inserts a one-use level-1 fixture with a single reachable dot beside spawn.
 * The router, renderer, keyboard input, score update, level-clear timer, level-2
 * reset, persistence and session cleanup all run through the real browser game.
 * This is a transition/state regression check, not a natural-play completion.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:8792/';
const marker = 'let state = pacManModel.create(saved);';
const fixture = `let state = pacManModel.create(saved);
    window.__PACMAN_QA_OBSERVED_STATE__ = state;
    if (window.__PACMAN_QA_FIXTURE_ENABLED__ && !window.__PACMAN_QA_FIXTURE_USED__) {
      window.__PACMAN_QA_FIXTURE_USED__ = true;
      const dir = pacManModel.directions.find(candidate => pacManModel.canMove(state.maze, 1, 1, candidate, 'player'));
      const next = dir && pacManModel.nextCell(1, 1, dir);
      if (!next) throw new Error('QA fixture could not find a first move');
      for (let y = 0; y < state.maze.length; y++) for (let x = 0; x < state.maze[y].length; x++) if (state.maze[y][x] !== 1) state.maze[y][x] = 0;
      state.maze[next.y][next.x] = 2;
      state.score = 1270; state.bestScore = 1270; state.level = 1; state.bestLevel = 1;
      state.lives = 2; state.pelletsLeft = 1; state.phase = 'playing'; state.paused = false;
      state.frightenedTimer = 0; state.eatenChain = 0; state.hitTimer = 0;
      Object.assign(state.player, { x: 1, y: 1, progress: 0, dirX: 0, dirY: 0, nextX: 0, nextY: 0 });
      window.__PACMAN_QA_FIXTURE_PLAN__ = { direction: dir.key, dot: next };
    }
    window.__PACMAN_QA_OBSERVED_STATE__ = state;`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => { window.__PACMAN_QA_FIXTURE_ENABLED__ = true; });
  await page.route('**/scripts/engines-classics.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.equal(source.split(marker).length - 1, 1, 'fixture anchor changed; refusing to patch an unexpected engine');
    await route.fulfill({ status: response.status(), contentType: 'application/javascript; charset=utf-8', body: source.replace(marker, fixture) });
  });

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.openGameById === 'function', undefined, { timeout: 20000 });
  await page.waitForFunction(() => !!document.querySelector('.game-card[data-id="pac-man"]'), undefined, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.openGameById('pac-man')), true, 'launch through the real catalog router');
  await page.waitForSelector('#pmCanvas');
  const plan = await page.evaluate(() => window.__PACMAN_QA_FIXTURE_PLAN__);
  assert.ok(plan, 'one-use browser fixture was installed');
  const initial = await page.evaluate(() => ({
    score: document.querySelector('#pmScore').textContent,
    lives: document.querySelectorAll('#pmLives .is-filled').length,
    level: document.querySelector('#pmLevel').textContent,
    pellets: document.querySelector('#pmPellets').textContent,
    statePhase: window.__PACMAN_QA_OBSERVED_STATE__.phase,
    ghostSpeeds: Array.from(window.__PACMAN_QA_OBSERVED_STATE__.ghosts, ghost => ghost.speed)
  }));
  assert.deepEqual(initial, { score: '1,270', lives: 2, level: '1', pellets: '1', statePhase: 'playing', ghostSpeeds: [48, 48, 48, 48] });
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'transition-fixture-start.png') });

  const key = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }[plan.direction];
  await page.keyboard.press(key);
  await page.waitForTimeout(450);
  const afterKey = await page.evaluate(() => ({ level: document.querySelector('#pmLevel').textContent, pellets: document.querySelector('#pmPellets').textContent, phase: window.__PACMAN_QA_OBSERVED_STATE__.phase }));
  if (afterKey.level !== '2' && afterKey.pellets === '1' && afterKey.phase === 'playing') {
    const button = { up: '#pmUp', right: '#pmRight', down: '#pmDown', left: '#pmLeft' }[plan.direction];
    await page.locator(button).click();
  }
  try {
    await page.waitForFunction(() => document.querySelector('#pmLevel')?.textContent === '2', undefined, { timeout: 8000 });
  } catch (error) {
    console.error('transition fixture input state', await page.evaluate(() => ({ hidden: document.hidden, score: document.querySelector('#pmScore')?.textContent, lives: document.querySelectorAll('#pmLives .is-filled').length, level: document.querySelector('#pmLevel')?.textContent, pellets: document.querySelector('#pmPellets')?.textContent, state: { phase: window.__PACMAN_QA_OBSERVED_STATE__?.phase, paused: window.__PACMAN_QA_OBSERVED_STATE__?.paused, clock: window.__PACMAN_QA_OBSERVED_STATE__?.clock, levelTimer: window.__PACMAN_QA_OBSERVED_STATE__?.levelTimer, x: window.__PACMAN_QA_OBSERVED_STATE__?.player.x, y: window.__PACMAN_QA_OBSERVED_STATE__?.player.y, progress: window.__PACMAN_QA_OBSERVED_STATE__?.player.progress, nextX: window.__PACMAN_QA_OBSERVED_STATE__?.player.nextX, nextY: window.__PACMAN_QA_OBSERVED_STATE__?.player.nextY } })));
    throw error;
  }
  const transition = await page.evaluate(() => {
    const state = window.__PACMAN_QA_OBSERVED_STATE__;
    return {
      game: { score: state.score, lives: state.lives, level: state.level, phase: state.phase, pelletsLeft: state.pelletsLeft, bestLevel: state.bestLevel },
      dom: { score: document.querySelector('#pmScore').textContent, lives: document.querySelectorAll('#pmLives .is-filled').length, level: document.querySelector('#pmLevel').textContent, pellets: document.querySelector('#pmPellets').textContent, best: document.querySelector('#pmBest').textContent },
      ghosts: Array.from(state.ghosts, ghost => ({ x: ghost.x, y: ghost.y, speed: ghost.speed, progress: ghost.progress, releaseTimer: ghost.releaseTimer })),
      record: JSON.parse(localStorage.getItem('np_pacman_maze_record_v1'))
    };
  });
  assert.deepEqual(transition.game, { score: 1280, lives: 2, level: 2, phase: 'playing', pelletsLeft: 183, bestLevel: 2 });
  assert.deepEqual(transition.dom, { score: '1,280', lives: 2, level: '2', pellets: '183', best: '1,280' });
  assert.deepEqual(transition.ghosts.map(ghost => [ghost.x, ghost.y, ghost.speed]), [[9, 9, 50], [7, 9, 50], [11, 9, 50], [9, 7, 50]]);
  assert.ok(transition.ghosts.every(ghost => ghost.progress < 8), 'level-start ghosts are still close to spawn');
  const openingReleaseTimers = [3, 5.25, 7.5, 9.75];
  transition.ghosts.forEach((ghost, index) => assert.ok(Math.abs(ghost.releaseTimer - openingReleaseTimers[index]) < 0.2, `ghost ${index} release timer reset for level 2`));
  assert.deepEqual(transition.record, { version: 1, bestScore: 1280, bestLevel: 2 });
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'level-2-start-fixture.png') });

  const clockBeforeClose = await page.evaluate(() => {
    window.__PACMAN_QA_OLD_STATE__ = window.__PACMAN_QA_OBSERVED_STATE__;
    const value = window.__PACMAN_QA_OLD_STATE__.clock;
    window.closeGameModal();
    return value;
  });
  await page.waitForFunction(() => !document.querySelector('#pmCanvas'));
  await page.waitForTimeout(250);
  const clockAfterClose = await page.evaluate(() => window.__PACMAN_QA_OLD_STATE__.clock);
  assert.equal(clockAfterClose, clockBeforeClose, "the closed game's simulation clock stays stopped");

  assert.equal(await page.evaluate(() => window.openGameById('pac-man')), true, 'reopen through the router');
  await page.waitForSelector('#pmCanvas');
  await page.waitForTimeout(250);
  const reopened = await page.evaluate(() => ({
    score: document.querySelector('#pmScore').textContent,
    lives: document.querySelectorAll('#pmLives .is-filled').length,
    level: document.querySelector('#pmLevel').textContent,
    pellets: document.querySelector('#pmPellets').textContent,
    best: document.querySelector('#pmBest').textContent,
    record: JSON.parse(localStorage.getItem('np_pacman_maze_record_v1')),
    modal: document.querySelector('#gameModal').style.display
  }));
  assert.deepEqual(reopened, { score: '0', lives: 3, level: '1', pellets: '183', best: '1,280', record: { version: 1, bestScore: 1280, bestLevel: 2 }, modal: 'flex' });
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'reopened-after-level-fixture.png') });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: 'Chromium 151', route: 'openGameById(pac-man)', fixture: { level: 1, pellets: 1, score: 1270, lives: 2, input: key }, initial, transition, cleanup: { clockBeforeClose, clockAfterClose, stopped: clockBeforeClose === clockAfterClose }, reopened, errors }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
