/* Original timed pipe-routing rules for Nối Ống Nước. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_PipeRouteModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 5, HEIGHT = 5, START = Object.freeze([0, 2]), EXIT = Object.freeze([4, 2]);
  const TIME_LIMITS = Object.freeze([60000, 55000, 50000]);
  const DIRECTION = Object.freeze({ north: 0, east: 1, south: 2, west: 3 });
  const VECTORS = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]].map(Object.freeze));
  const PATHS = Object.freeze([
    Object.freeze([[0, 2], [1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [4, 2]].map(Object.freeze)),
    Object.freeze([[0, 2], [1, 2], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 2]].map(Object.freeze)),
    Object.freeze([[0, 2], [0, 1], [1, 1], [1, 2], [2, 2], [2, 1], [3, 1], [3, 2], [4, 2]].map(Object.freeze))
  ]);
  const OPPOSITE = direction => (direction + 2) % 4;
  const keyOf = (x, y) => `${x},${y}`;
  const finite = Number.isFinite;

  function seedValue(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const ch of String(seed ?? Date.now())) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }

  function portsFor(pipe) {
    const base = pipe.type === 'straight' ? [0, 2] : [0, 1];
    return base.map(direction => (direction + pipe.rotation) % 4).sort((a, b) => a - b);
  }

  function targetPorts(path, index) {
    const ports = [];
    if (index === 0) ports.push(DIRECTION.west);
    else {
      const previous = path[index - 1];
      const directionFromPrevious = VECTORS.findIndex(vector => previous[0] + vector[0] === path[index][0] && previous[1] + vector[1] === path[index][1]);
      ports.push(OPPOSITE(directionFromPrevious));
    }
    if (index === path.length - 1) ports.push(DIRECTION.east);
    else {
      const next = path[index + 1];
      const entry = VECTORS.findIndex(vector => path[index][0] + vector[0] === next[0] && path[index][1] + vector[1] === next[1]);
      ports.push(entry);
    }
    return ports.sort((a, b) => a - b);
  }

  function rotateSet(ports, rotation) { return ports.map(port => (port + rotation) % 4).sort((a, b) => a - b); }
  function samePorts(left, right) { return left.length === right.length && left.every((port, index) => port === right[index]); }

  function makeLayout(levelIndex, seed) {
    const path = PATHS[levelIndex];
    const route = new Map(path.map(([x, y], index) => [keyOf(x, y), index]));
    let randomState = seedValue(seed + (levelIndex + 1) * 0x9e3779b9);
    const random = () => { randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0; return randomState; };
    const pipes = [];
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const index = route.get(keyOf(x, y));
      const type = index === undefined
        ? ((x * 7 + y * 11 + levelIndex) % 3 === 0 ? 'straight' : 'elbow')
        : (OPPOSITE(targetPorts(path, index)[0]) === targetPorts(path, index)[1] ? 'straight' : 'elbow');
      if (index === undefined) {
        pipes.push({ id: keyOf(x, y), x, y, type, rotation: random() % (type === 'straight' ? 2 : 4), rotationCount: type === 'straight' ? 2 : 4 });
        continue;
      }
      const ports = targetPorts(path, index);
      const rotationCount = type === 'straight' ? 2 : 4;
      const targetRotation = Array.from({ length: 4 }, (_, turn) => turn).find(turn => samePorts(rotateSet(type === 'straight' ? [0, 2] : [0, 1], turn), ports));
      const scramble = 1 + random() % (rotationCount - 1);
      pipes.push({ id: keyOf(x, y), x, y, type, rotation: (targetRotation + scramble) % rotationCount, rotationCount });
    }
    return pipes;
  }

  function traceFlow(pipes) {
    const map = new Map(pipes.map(pipe => [pipe.id, pipe]));
    const wet = [], visited = new Set();
    let x = START[0], y = START[1], incoming = DIRECTION.west;
    for (let count = 0; count <= pipes.length; count++) {
      const id = keyOf(x, y), pipe = map.get(id);
      if (!pipe) return { mode: 'leak', connected: false, leaking: true, wet, leakAt: id };
      if (visited.has(id)) return { mode: 'loop', connected: false, leaking: true, wet, leakAt: id };
      visited.add(id); wet.push(id);
      const ports = portsFor(pipe);
      if (!ports.includes(incoming)) return { mode: 'leak', connected: false, leaking: true, wet, leakAt: id };
      const exits = ports.filter(port => port !== incoming);
      if (exits.length !== 1) return { mode: 'leak', connected: false, leaking: true, wet, leakAt: id };
      const direction = exits[0];
      if (x === EXIT[0] && y === EXIT[1] && direction === DIRECTION.east) {
        return { mode: 'connected', connected: true, leaking: false, wet, leakAt: null };
      }
      const [dx, dy] = VECTORS[direction];
      const nextX = x + dx, nextY = y + dy;
      if (nextX < 0 || nextX >= WIDTH || nextY < 0 || nextY >= HEIGHT) {
        return { mode: 'leak', connected: false, leaking: true, wet, leakAt: keyOf(nextX, nextY) };
      }
      const next = map.get(keyOf(nextX, nextY));
      if (!next || !portsFor(next).includes(OPPOSITE(direction))) {
        return { mode: 'leak', connected: false, leaking: true, wet, leakAt: keyOf(nextX, nextY) };
      }
      x = nextX; y = nextY; incoming = OPPOSITE(direction);
    }
    return { mode: 'loop', connected: false, leaking: true, wet, leakAt: keyOf(x, y) };
  }

  function create(options = {}) {
    let seed = seedValue(options.seed), state, undoStack;

    function reset(levelIndex = 0) {
      const levelSeed = seed + Math.imul(levelIndex + 1, 0x85ebca6b);
      state = {
        status: 'playing', level: levelIndex, pipes: makeLayout(levelIndex, levelSeed),
        timeLeft: TIME_LIMITS[levelIndex], moves: 0, lastEvent: 'start'
      };
      undoStack = [];
    }
    function currentFlow() { return traceFlow(state.pipes); }
    function view() {
      const flow = currentFlow();
      return {
        status: state.status, level: state.level, levelNumber: state.level + 1, levelCount: PATHS.length,
        width: WIDTH, height: HEIGHT, timeLeft: state.timeLeft, timeLimit: TIME_LIMITS[state.level],
        moves: state.moves, pipes: state.pipes.map(pipe => ({ ...pipe, ports: portsFor(pipe), wet: flow.wet.includes(pipe.id), leaking: flow.leakAt === pipe.id })),
        flow: flow.mode, connected: flow.connected, leaking: flow.leaking, wet: flow.wet.slice(), leakAt: flow.leakAt,
        canUndo: undoStack.length > 0, lastEvent: state.lastEvent
      };
    }

    reset();
    return Object.freeze({
      view,
      rotate(id, quarters = 1) {
        if (state.status !== 'playing' || typeof id !== 'string' || !Number.isInteger(quarters) || ![-1, 1].includes(quarters)) {
          return { accepted: false, rotated: false, status: state.status };
        }
        const pipe = state.pipes.find(item => item.id === id);
        if (!pipe) return { accepted: false, rotated: false, status: state.status };
        undoStack.push({ id, rotation: pipe.rotation, moves: state.moves });
        pipe.rotation = (pipe.rotation + quarters + pipe.rotationCount) % pipe.rotationCount;
        state.moves++;
        const flow = currentFlow();
        state.lastEvent = flow.connected ? 'connected' : 'rotated';
        if (flow.connected) state.status = 'won';
        return { accepted: true, rotated: true, status: state.status, moves: state.moves, flow: flow.mode };
      },
      undo() {
        if (state.status !== 'playing' || !undoStack.length) return false;
        const previous = undoStack.pop(), pipe = state.pipes.find(item => item.id === previous.id);
        pipe.rotation = previous.rotation; state.moves = previous.moves; state.lastEvent = 'undo';
        return true;
      },
      advance(milliseconds) {
        if (!finite(milliseconds) || milliseconds <= 0 || milliseconds > 60000 || state.status !== 'playing') return false;
        state.timeLeft = Math.max(0, state.timeLeft - milliseconds);
        if (state.timeLeft === 0) { state.status = 'lost'; state.lastEvent = 'water-empty'; }
        return true;
      },
      pause() { if (state.status !== 'playing') return false; state.status = 'paused'; state.lastEvent = 'paused'; return true; },
      resume() { if (state.status !== 'paused') return false; state.status = 'playing'; state.lastEvent = 'resumed'; return true; },
      restart() { reset(state.level); return true; },
      nextLevel() {
        if (state.status !== 'won' || state.level >= PATHS.length - 1) return false;
        reset(state.level + 1); return true;
      },
      newGame(nextSeed) {
        seed = Number.isFinite(nextSeed) ? seedValue(nextSeed) : seedValue(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
        reset(); return true;
      }
    });
  }

  return Object.freeze({ WIDTH, HEIGHT, START, EXIT, TIME_LIMITS, DIRECTION, PATHS, create, traceFlow });
});
