/* Rắn Săn Mồi: original grid-snake rules, independent of DOM and time. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.NP_RanSanMoiSnakeModel = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    right: Object.freeze({ x: 1, y: 0 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 })
  });
  const OPPOSITE = Object.freeze({ up: 'down', right: 'left', down: 'up', left: 'right' });
  const DEFAULTS = Object.freeze({ width: 18, height: 14, startLength: 3 });
  const MAX_SCORE = 1000000000;

  function clampRandom(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(1 - Number.EPSILON, Math.max(0, n)) : 0;
  }

  function create(options = {}) {
    const width = options.width ?? DEFAULTS.width;
    const height = options.height ?? DEFAULTS.height;
    const startLength = options.startLength ?? DEFAULTS.startLength;
    if (!Number.isSafeInteger(width) || width < 6 || width > 40 ||
        !Number.isSafeInteger(height) || height < 6 || height > 30 ||
        !Number.isSafeInteger(startLength) || startLength < 1 || startLength >= Math.min(width, height)) {
      throw new RangeError('Invalid Snake board');
    }

    const seed = Number.isSafeInteger(options.seed) ? options.seed >>> 0 : 0x51a9e;
    let randomState = seed || 0x6d2b79f5;
    const random = typeof options.random === 'function' ? options.random : () => {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      return (randomState >>> 0) / 4294967296;
    };
    let status = 'ready';
    let reason = '';
    let direction = 'right';
    let turns = [];
    let score = 0;
    let eaten = 0;
    let moves = 0;
    let snake = [];
    let food = null;

    const fixture = options.initial || null;
    if (fixture) {
      const body = fixture.snake;
      if (!Array.isArray(body) || body.length < 1 || body.length > width * height ||
          body.some(p => !p || !Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y) || p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) ||
          new Set(body.map(p => p.y * width + p.x)).size !== body.length ||
          body.some((p, i) => i > 0 && Math.abs(p.x - body[i - 1].x) + Math.abs(p.y - body[i - 1].y) !== 1) ||
          !Object.hasOwn(DIRECTIONS, fixture.direction || 'right')) {
        throw new RangeError('Invalid Snake initial state');
      }
      if (fixture.food && (!Number.isSafeInteger(fixture.food.x) || !Number.isSafeInteger(fixture.food.y) ||
          fixture.food.x < 0 || fixture.food.x >= width || fixture.food.y < 0 || fixture.food.y >= height ||
          body.some(p => p.x === fixture.food.x && p.y === fixture.food.y))) {
        throw new RangeError('Invalid Snake food position');
      }
    }

    function reset() {
      if (fixture) {
        snake = fixture.snake.map(p => ({ x: p.x, y: p.y }));
        direction = fixture.direction || 'right';
      } else {
        const centerX = Math.floor(width / 2), centerY = Math.floor(height / 2);
        snake = Array.from({ length: startLength }, (_, i) => ({ x: centerX - i, y: centerY }));
        direction = 'right';
      }
      turns = []; score = 0; eaten = 0; moves = 0;
      status = 'ready'; reason = '';
      food = fixture?.food ? { x: fixture.food.x, y: fixture.food.y } : spawnFood();
    }

    function spawnFood() {
      const occupied = new Set(snake.map(p => p.y * width + p.x));
      const free = [];
      for (let i = 0; i < width * height; i++) if (!occupied.has(i)) free.push(i);
      if (!free.length) return null;
      const index = Math.floor(clampRandom(random()) * free.length);
      return { x: free[index] % width, y: Math.floor(free[index] / width) };
    }

    function start(nextDirection = 'right') {
      if (status !== 'ready' || !Object.hasOwn(DIRECTIONS, nextDirection)) return false;
      if (!fixture) {
        const d = DIRECTIONS[nextDirection];
        const head = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
        if (d.x < 0) head.x = Math.min(head.x, width - startLength);
        if (d.x > 0) head.x = Math.max(head.x, startLength - 1);
        if (d.y < 0) head.y = Math.min(head.y, height - startLength);
        if (d.y > 0) head.y = Math.max(head.y, startLength - 1);
        snake = Array.from({ length: startLength }, (_, i) => ({ x: head.x - d.x * i, y: head.y - d.y * i }));
        if (food && snake.some(p => p.x === food.x && p.y === food.y)) food = spawnFood();
      }
      direction = nextDirection; status = 'running';
      return true;
    }

    function turn(nextDirection) {
      if (!Object.hasOwn(DIRECTIONS, nextDirection) || !['ready', 'running'].includes(status)) return false;
      if (status === 'ready') return start(nextDirection);
      const latest = turns.at(-1) || direction;
      if (nextDirection === latest || nextDirection === OPPOSITE[latest] || turns.length >= 2) return false;
      turns.push(nextDirection);
      return true;
    }

    function step() {
      if (status !== 'running') return { moved: false, ate: false, status, reason };
      if (turns.length) direction = turns.shift();
      const d = DIRECTIONS[direction];
      const head = snake[0], next = { x: head.x + d.x, y: head.y + d.y };
      const eating = !!food && next.x === food.x && next.y === food.y;
      if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) {
        status = 'lost'; reason = 'wall';
        return { moved: false, ate: false, status, reason };
      }
      // The tail vacates its current cell on a non-eating move, so that cell is safe to enter.
      const body = eating ? snake : snake.slice(0, -1);
      if (body.some(part => part.x === next.x && part.y === next.y)) {
        status = 'lost'; reason = 'self';
        return { moved: false, ate: false, status, reason };
      }
      snake.unshift(next);
      if (eating) {
        score = Math.min(MAX_SCORE, score + 10); eaten++; food = spawnFood();
        if (!food) { status = 'won'; reason = 'filled'; }
      } else snake.pop();
      moves++;
      return { moved: true, ate: eating, status, reason };
    }

    function restart(nextSeed) {
      if (Number.isSafeInteger(nextSeed)) randomState = (nextSeed >>> 0) || 0x6d2b79f5;
      else randomState = seed || 0x6d2b79f5;
      reset();
      return view();
    }

    function view() {
      return { width, height, status, reason, direction, snake: snake.map(p => ({ ...p })),
        food: food ? { ...food } : null, score, length: snake.length, eaten, moves,
        speedLevel: Math.floor(eaten / 5) + 1 };
    }

    reset();
    return Object.freeze({ start, turn, step, restart, view });
  }

  return Object.freeze({ DIRECTIONS, DEFAULTS, create });
});
