/* Turn-based pyramid hopping rules for Sắc Bậc. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_QbertPyramidModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROWS = 7;
  const TILE_COUNT = ROWS * (ROWS + 1) / 2;
  const LEVEL_COUNT = 3;
  const CAMPAIGN_TIME_MS = 180000;
  const MAX_LIVES = 6;
  const DIRECTIONS = Object.freeze({
    upLeft: Object.freeze([-1, -1]),
    upRight: Object.freeze([-1, 0]),
    downLeft: Object.freeze([1, 0]),
    downRight: Object.freeze([1, 1])
  });
  const DIRECTION_NAMES = Object.freeze(['upLeft', 'upRight', 'downLeft', 'downRight']);
  const ENEMY_STARTS = Object.freeze([
    Object.freeze([[3, 1, 3, 0, 0]]),
    Object.freeze([[1, 0, 3, 0, 2], [3, 0, 4, 1, 2]]),
    Object.freeze([[1, 0, 2, 0, 2], [3, 0, 3, 1, 0], [4, 2, 4, 2, 2]])
  ]);
  const keyOf = (row, col) => `${row},${col}`;

  function seedValue(seed) {
    if (seed === undefined || seed === null) return 1;
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const ch of String(seed ?? 1)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }

  function isOnBoard(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < ROWS && col >= 0 && col <= row;
  }

  function neighbors(row, col) {
    const found = [];
    for (const name of DIRECTION_NAMES) {
      const [dr, dc] = DIRECTIONS[name], nextRow = row + dr, nextCol = col + dc;
      if (isOnBoard(nextRow, nextCol)) found.push({ row: nextRow, col: nextCol, direction: name });
    }
    return found;
  }

  function create(options = {}) {
    let gameSeed = seedValue(options.seed);
    const state = {};

    function buildLevel(level) {
      state.level = level;
      state.player = { row: 0, col: 0 };
      state.tiles = [];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col <= row; col++) state.tiles.push({ id: keyOf(row, col), row, col, visited: false });
      }
      state.tiles[0].visited = true;
      state.goalsFound = 1;
      state.enemies = ENEMY_STARTS[level].map(([topRow, leftCol, pace, offset, phase], index) => {
        const cycle = [
          { row: topRow, col: leftCol },
          { row: topRow + 1, col: leftCol },
          { row: topRow + 2, col: leftCol + 1 },
          { row: topRow + 1, col: leftCol + 1 }
        ];
        const stepIndex = phase % cycle.length, start = cycle[stepIndex];
        return {
          id: `pursuer-${index + 1}`, row: start.row, col: start.col, pace, offset,
          cycle, stepIndex, homeIndex: stepIndex, direction: ((gameSeed + index + level) & 1) ? 1 : -1,
          homeRow: start.row, homeCol: start.col
        };
      });
      state.respawnGrace = 0;
    }

    function freshCampaign() {
      state.status = 'playing';
      state.level = 0;
      state.lives = MAX_LIVES;
      state.timeLeft = CAMPAIGN_TIME_MS;
      state.turns = 0;
      state.score = 0;
      state.lastEvent = 'start';
      state.lastDirection = null;
      state.lossReason = null;
      buildLevel(0);
      state.score = 100; // The starting apex is the first captured tile.
    }

    function view() {
      const enemyAt = new Map();
      for (const enemy of state.enemies) {
        const key = keyOf(enemy.row, enemy.col), ids = enemyAt.get(key) || [];
        ids.push(enemy.id); enemyAt.set(key, ids);
      }
      return {
        status: state.status,
        level: state.level,
        levelNumber: state.level + 1,
        levelCount: LEVEL_COUNT,
        rows: ROWS,
        player: { ...state.player, id: keyOf(state.player.row, state.player.col) },
        tiles: state.tiles.map(tile => ({ ...tile, player: tile.row === state.player.row && tile.col === state.player.col, enemies: (enemyAt.get(tile.id) || []).slice() })),
        enemies: state.enemies.map(({ id, row, col, pace, offset }) => ({ id, row, col, pace, offset })),
        goalsFound: state.goalsFound,
        goalsTotal: TILE_COUNT,
        lives: state.lives,
        maxLives: MAX_LIVES,
        timeLeft: state.timeLeft,
        timeLimit: CAMPAIGN_TIME_MS,
        turns: state.turns,
        score: state.score,
        lastEvent: state.lastEvent,
        lastDirection: state.lastDirection,
        lossReason: state.lossReason
      };
    }

    function advanceEnemies() {
      for (let index = 0; index < state.enemies.length; index++) {
        const enemy = state.enemies[index];
        if ((state.turns + enemy.offset) % enemy.pace !== 0) continue;
        enemy.stepIndex = (enemy.stepIndex + enemy.direction + enemy.cycle.length) % enemy.cycle.length;
        enemy.row = enemy.cycle[enemy.stepIndex].row;
        enemy.col = enemy.cycle[enemy.stepIndex].col;
      }
    }

    function finishLevel() {
      state.score += 500 + state.lives * 25;
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      if (state.level === LEVEL_COUNT - 1) {
        state.score += Math.floor(state.timeLeft / 1000) * 5 + state.lives * 100;
        state.status = 'won';
        state.lastEvent = 'won';
        return 'won';
      }
      buildLevel(state.level + 1);
      state.score += 100;
      state.lastEvent = 'level';
      return 'level';
    }

    function loseLife(reason) {
      state.lives = Math.max(0, state.lives - 1);
      state.score = Math.max(0, state.score - 50);
      state.player = { row: 0, col: 0 };
      state.respawnGrace = 1;
      if (state.lives === 0) {
        state.status = 'lost';
        state.lossReason = reason;
        state.lastEvent = 'lost';
      } else {
        state.lastEvent = reason;
      }
    }

    freshCampaign();
    return Object.freeze({
      view,
      move(direction) {
        if (state.status !== 'playing' || !Object.prototype.hasOwnProperty.call(DIRECTIONS, direction)) {
          return { accepted: false, status: state.status, event: state.lastEvent };
        }
        state.turns++;
        state.lastDirection = direction;
        const [dr, dc] = DIRECTIONS[direction], nextRow = state.player.row + dr, nextCol = state.player.col + dc;
        if (!isOnBoard(nextRow, nextCol)) {
          state.player = { row: 0, col: 0 };
          advanceEnemies();
          loseLife('fall');
          return { accepted: true, status: state.status, event: state.lastEvent, lives: state.lives, level: state.level };
        }

        state.player = { row: nextRow, col: nextCol };
        state.score += 10;
        const tile = state.tiles.find(item => item.row === nextRow && item.col === nextCol);
        const collectedTile = !tile.visited;
        if (collectedTile) {
          tile.visited = true;
          state.goalsFound++;
          state.score += 100;
        }

        const occupiedOnEntry = state.enemies.find(enemy => enemy.row === nextRow && enemy.col === nextCol);
        advanceEnemies();
        const caught = occupiedOnEntry || state.enemies.find(enemy => enemy.row === state.player.row && enemy.col === state.player.col);
        const contacted = !!caught && state.respawnGrace === 0;
        if (contacted) {
          loseLife('enemy');
          // Send the contacted pursuer back to its authored entry point so a
          // single collision cannot trap the player on the spawn tile.
          const occupied = new Set(state.enemies.filter(enemy => enemy !== caught).map(enemy => keyOf(enemy.row, enemy.col)));
          if (!occupied.has(keyOf(caught.homeRow, caught.homeCol))) {
            caught.row = caught.homeRow; caught.col = caught.homeCol; caught.stepIndex = caught.homeIndex;
          }
        } else if (state.respawnGrace > 0) {
          state.respawnGrace--;
        }

        if (state.status === 'lost') return { accepted: true, status: state.status, event: state.lastEvent, lives: state.lives, level: state.level };
        // A patrol collision resolves before tile completion. The player may
        // light the last tile on a hit, but must survive the contact to clear it.
        if (contacted) return { accepted: true, status: state.status, event: state.lastEvent, lives: state.lives, level: state.level };
        if (state.goalsFound === TILE_COUNT) {
          const event = finishLevel();
          return { accepted: true, status: state.status, event, lives: state.lives, level: state.level };
        }
        state.lastEvent = collectedTile ? 'landed' : 'revisit';
        return { accepted: true, status: state.status, event: state.lastEvent, lives: state.lives, level: state.level };
      },
      advance(milliseconds) {
        if (state.status !== 'playing' || !Number.isFinite(milliseconds) || milliseconds <= 0) return false;
        state.timeLeft = Math.max(0, state.timeLeft - Math.min(milliseconds, CAMPAIGN_TIME_MS));
        if (state.timeLeft === 0) {
          state.status = 'lost'; state.lossReason = 'time'; state.lastEvent = 'time';
        }
        return true;
      },
      pause() {
        if (state.status !== 'playing') return false;
        state.status = 'paused'; state.lastEvent = 'paused'; return true;
      },
      resume() {
        if (state.status !== 'paused') return false;
        state.status = 'playing'; state.lastEvent = 'resumed'; return true;
      },
      restart() { freshCampaign(); return true; },
      newGame(nextSeed) {
        if (Number.isFinite(nextSeed)) gameSeed = seedValue(nextSeed);
        freshCampaign(); return true;
      }
    });
  }

  return Object.freeze({ ROWS, TILE_COUNT, LEVEL_COUNT, CAMPAIGN_TIME_MS, MAX_LIVES, DIRECTIONS, create, isOnBoard, neighbors });
});
