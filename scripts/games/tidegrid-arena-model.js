/* Tidegrid Arena: compact, original bubble-grid rules. No borrowed game code or map. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_TidegridArenaModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const RULES = 'tidegrid-local-1';
  const WIDTH = 13, HEIGHT = 11, STEP_MS = 20, MOVE_TICKS = 8;
  const FUSE_TICKS = 90, WAVE_TICKS = 8, TRAP_TICKS = 100, RANGE = 2, CAPACITY = 1;
  const WALL = 1, CRATE = 2;
  const DIRS = Object.freeze({
    up: Object.freeze({ r: -1, c: 0 }), right: Object.freeze({ r: 0, c: 1 }),
    down: Object.freeze({ r: 1, c: 0 }), left: Object.freeze({ r: 0, c: -1 })
  });
  const ORDER = Object.freeze(['up', 'right', 'down', 'left']);
  const RAW = Object.freeze([
    '#############',
    '#...........#',
    '#.#.#.#.#.#.#',
    '#...........#',
    '#.#.#.#.#.#.#',
    '#...........#',
    '#.#.#.#.#.#.#',
    '#...........#',
    '#.#.#.#.#.#.#',
    '#...........#',
    '#############'
  ]);
  const CRATES = Object.freeze([
    [1, 4], [1, 6], [1, 8],
    [3, 3], [3, 5], [3, 7], [3, 9],
    [5, 3], [5, 4], [5, 8], [5, 9],
    [7, 3], [7, 5], [7, 7], [7, 9],
    [9, 4], [9, 6], [9, 8]
  ].map(([r, c]) => Object.freeze({ r, c })));
  const SPAWNS = Object.freeze([
    Object.freeze({ r: 1, c: 1 }), Object.freeze({ r: 1, c: 11 }),
    Object.freeze({ r: 9, c: 1 }), Object.freeze({ r: 9, c: 11 })
  ]);
  const IDs = Object.freeze(['pilot', 'rivet', 'mica', 'volt']);
  const NAMES = Object.freeze({ pilot: 'Bạn', rivet: 'Đinh', mica: 'Mây', volt: 'Tia' });
  const index = (r, c) => r * WIDTH + c;
  const pos = i => ({ r: Math.floor(i / WIDTH), c: i % WIDTH });
  const inside = (r, c) => r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH;
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeInt = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;

  function baseGrid() {
    const grid = RAW.map(row => [...row].map(ch => ch === '#' ? WALL : 0));
    for (const cell of CRATES) grid[cell.r][cell.c] = CRATE;
    return grid;
  }
  function actor(id, cell) {
    return { id, r: cell.r, c: cell.c, alive: true, cooldown: id === 'pilot' ? 0 : (id.charCodeAt(0) % MOVE_TICKS), trappedTicks: 0, trappedBy: null, pins: 1 };
  }
  function create() {
    return {
      version: 1, rules: RULES, tick: 0, remainder: 0, status: 'playing',
      grid: baseGrid(), actors: IDs.map((id, i) => actor(id, SPAWNS[i])),
      bombs: [], waves: [], nextBomb: 1, intent: null
    };
  }
  function cellKey(r, c) { return r + ':' + c; }
  function actorAt(s, r, c, except) {
    return s.actors.find(a => a.alive && a.id !== except && a.r === r && a.c === c) || null;
  }
  function bombAt(s, r, c) { return s.bombs.find(b => b.r === r && b.c === c) || null; }
  function waveAt(s, r, c) { return s.waves.some(f => f.r === r && f.c === c); }
  function freeCell(s, r, c, id) {
    return inside(r, c) && s.grid[r][c] === 0 && !bombAt(s, r, c) && !actorAt(s, r, c, id) && !waveAt(s, r, c);
  }
  function canPlace(s, id) {
    const a = s.actors.find(x => x.id === id && x.alive);
    return Boolean(s.status === 'playing' && a && a.trappedTicks === 0 && s.bombs.filter(b => b.owner === id).length < CAPACITY && !bombAt(s, a.r, a.c));
  }
  function place(s, id = 'pilot') {
    if (!canPlace(s, id)) return false;
    const a = s.actors.find(x => x.id === id);
    s.bombs.push({ id: s.nextBomb++, owner: id, r: a.r, c: a.c, fuse: FUSE_TICKS, range: RANGE });
    return true;
  }
  function steer(s, dir) {
    if (dir !== null && !Object.hasOwn(DIRS, dir)) return false;
    if (s.status !== 'playing' || !s.actors.find(a => a.id === 'pilot' && a.alive)) return false;
    s.intent = dir;
    if (dir && s.actors[0].trappedTicks === 0 && s.actors[0].cooldown === 0) {
      moveActor(s, s.actors[0], dir);
      s.actors[0].cooldown = MOVE_TICKS;
    }
    return true;
  }
  function rescue(s, id = 'pilot') {
    const a = s.actors.find(x => x.id === id && x.alive);
    if (s.status !== 'playing' || !a || a.trappedTicks <= 0 || a.pins <= 0) return false;
    a.trappedTicks = 0; a.trappedBy = null; a.pins--;
    checkEnd(s, null);
    return true;
  }
  function moveActor(s, a, dir) {
    const d = DIRS[dir];
    if (d && freeCell(s, a.r + d.r, a.c + d.c, a.id)) {
      a.r += d.r; a.c += d.c;
      return true;
    }
    return false;
  }
  function rayCells(grid, r, c, range, bombs) {
    const cells = new Map([[cellKey(r, c), { r, c }]]);
    const trigger = new Set();
    for (const dir of ORDER) {
      const d = DIRS[dir];
      for (let n = 1; n <= range; n++) {
        const nr = r + d.r * n, nc = c + d.c * n;
        if (!inside(nr, nc) || grid[nr][nc] === WALL) break;
        cells.set(cellKey(nr, nc), { r: nr, c: nc });
        if (grid[nr][nc] === CRATE) break;
        const other = bombs.find(b => b.r === nr && b.c === nc);
        if (other) { trigger.add(other.id); break; }
      }
    }
    return { cells: [...cells.values()], trigger };
  }
  function liveThreats(s) {
    const grid = s.grid, bombs = s.bombs, cells = new Map();
    for (const wave of s.waves) cells.set(cellKey(wave.r, wave.c), new Set(['wave']));
    for (const root of bombs) {
      const queue = [root.id], chain = new Set();
      while (queue.length) {
        const id = queue.shift();
        if (chain.has(id)) continue;
        const bomb = bombs.find(b => b.id === id);
        if (!bomb) continue;
        chain.add(id);
        const ray = rayCells(grid, bomb.r, bomb.c, bomb.range, bombs);
        for (const triggered of ray.trigger) if (!chain.has(triggered)) queue.push(triggered);
      }
      for (const id of chain) {
        const bomb = bombs.find(b => b.id === id);
        if (!bomb) continue;
        const ray = rayCells(grid, bomb.r, bomb.c, bomb.range, bombs);
        ray.cells.forEach(p => {
          const key = cellKey(p.r, p.c);
          if (!cells.has(key)) cells.set(key, new Set());
          cells.get(key).add(root.id);
        });
      }
    }
    return cells;
  }
  function isThreatened(danger, r, c, ignoreBombIds = null) {
    const sources = danger?.get(cellKey(r, c));
    if (!sources) return false;
    for (const source of sources) if (source === 'wave' || !ignoreBombIds?.has(source)) return true;
    return false;
  }
  function pathMap(s, start, avoidBombs = true, goalId = null, danger = null, ignoreBombIds = null) {
    const dist = Array(HEIGHT * WIDTH).fill(-1), first = Array(HEIGHT * WIDTH).fill(null);
    const startI = index(start.r, start.c), q = [startI];
    dist[startI] = 0;
    for (let head = 0; head < q.length; head++) {
      const at = q[head], p = pos(at);
      if (goalId && actorAt(s, p.r, p.c, start.id)?.id === goalId) continue;
      for (const dir of ORDER) {
        const d = DIRS[dir], r = p.r + d.r, c = p.c + d.c;
        const occupant = inside(r, c) ? actorAt(s, r, c, start.id) : null;
        if (!inside(r, c) || s.grid[r][c] !== 0 || waveAt(s, r, c) || occupant && occupant.id !== goalId ||
          isThreatened(danger, r, c, ignoreBombIds)) continue;
        if (avoidBombs && bombAt(s, r, c)) continue;
        const next = index(r, c);
        if (dist[next] !== -1) continue;
        dist[next] = dist[at] + 1;
        first[next] = at === startI ? dir : first[at];
        q.push(next);
      }
    }
    return { dist, first };
  }
  function inBombLane(s, p, b) {
    if (p.r === b.r && Math.abs(p.c - b.c) <= b.range || p.c === b.c && Math.abs(p.r - b.r) <= b.range) {
      const dr = Math.sign(p.r - b.r), dc = Math.sign(p.c - b.c);
      for (let n = 1; n < Math.abs(p.r - b.r) + Math.abs(p.c - b.c); n++) {
        if (s.grid[b.r + dr * n]?.[b.c + dc * n] === WALL || s.grid[b.r + dr * n]?.[b.c + dc * n] === CRATE) return false;
      }
      return true;
    }
    return false;
  }
  function safeFromOwnedBomb(s, a) {
    return !s.bombs.some(b => b.owner === a.id && inBombLane(s, a, b));
  }
  function escapeDirection(s, a, danger = null) {
    const ownBombs = s.bombs.filter(b => b.owner === a.id), ownIds = new Set(ownBombs.map(b => b.id));
    const map = pathMap(s, a, true, null, danger, ownIds);
    const candidates = [];
    for (let i = 0; i < map.dist.length; i++) {
      if (map.dist[i] < 0 || !map.first[i]) continue;
      const p = pos(i);
      if (ownBombs.every(b => !inBombLane(s, p, b))) candidates.push({ i, d: map.dist[i], dir: map.first[i] });
    }
    candidates.sort((x, y) => x.d - y.d || ORDER.indexOf(x.dir) - ORDER.indexOf(y.dir));
    return candidates[0]?.dir || null;
  }
  function targetFor(s, actor) {
    const others = s.actors.filter(a => a.alive && a.id !== actor.id);
    if (!others.length) return null;
    return others.map(a => ({ actor: a, d: pathMap(s, actor, true, a.id).dist[index(a.r, a.c)] })).filter(x => x.d >= 0)
      .sort((a, b) => a.d - b.d || a.actor.id.localeCompare(b.actor.id))[0]?.actor || null;
  }
  function lineShot(s, a, target) {
    if (!target || a.r !== target.r && a.c !== target.c) return false;
    const distance = Math.abs(a.r - target.r) + Math.abs(a.c - target.c);
    if (distance < 1 || distance > RANGE) return false;
    const dr = Math.sign(target.r - a.r), dc = Math.sign(target.c - a.c);
    for (let n = 1; n < distance; n++) {
      const r = a.r + dr * n, c = a.c + dc * n;
      if (s.grid[r][c] !== 0 || bombAt(s, r, c)) return false;
    }
    return true;
  }
  function botTurn(s, bot, danger) {
    const ownBombs = s.bombs.filter(b => b.owner === bot.id);
    if (ownBombs.length && !safeFromOwnedBomb(s, bot)) return escapeDirection(s, bot, danger);
    const target = targetFor(s, bot);
    if (!ownBombs.length && target && lineShot(s, bot, target) && place(s, bot.id)) {
      return escapeDirection(s, bot, danger);
    }
    const map = pathMap(s, bot, true, target?.id || null, danger);
    const candidate = ORDER.map((dir, order) => {
      const d = DIRS[dir], r = bot.r + d.r, c = bot.c + d.c;
      if (!freeCell(s, r, c, bot.id) || isThreatened(danger, r, c)) return null;
      const i = index(r, c), targetI = target ? index(target.r, target.c) : -1;
      const distance = targetI >= 0 ? map.dist[targetI] : -1;
      const stepDistance = targetI >= 0 && map.first[targetI] === dir ? distance - 1 : 999;
      return { dir, stepDistance, order };
    }).filter(Boolean);
    candidate.sort((a, b) => a.stepDistance - b.stepDistance || ((a.order + s.tick + bot.id.length) % 4) - ((b.order + s.tick + bot.id.length) % 4));
    return candidate[0]?.dir || null;
  }
  function checkEnd(s, events) {
    const pilot = s.actors.find(a => a.id === 'pilot');
    const active = s.actors.filter(a => a.alive);
    if (!pilot.alive) s.status = active.length === 0 ? 'draw' : 'lost';
    else if (active.length === 1 && pilot.trappedTicks === 0) s.status = 'won';
    if (s.status !== 'playing' && events) events.push({ kind: s.status });
  }
  function detonate(s, due, events) {
    if (!due.length) return { cells: [], owners: [] };
    const snapshot = s.grid.map(row => row.slice());
    const queue = due.map(b => b.id), seen = new Set(), cells = new Map(), destroyed = new Set(), owners = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      const bomb = s.bombs.find(b => b.id === id);
      if (!bomb) continue;
      seen.add(id);
      owners.add(bomb.owner);
      const ray = rayCells(snapshot, bomb.r, bomb.c, bomb.range, s.bombs);
      for (const p of ray.cells) {
        cells.set(cellKey(p.r, p.c), p);
        if (snapshot[p.r][p.c] === CRATE) destroyed.add(cellKey(p.r, p.c));
      }
      for (const next of ray.trigger) if (!seen.has(next)) queue.push(next);
    }
    for (const key of destroyed) {
      const [r, c] = key.split(':').map(Number);
      s.grid[r][c] = 0;
    }
    s.bombs = s.bombs.filter(b => !seen.has(b.id));
    const flameByCell = new Map(s.waves.map(f => [cellKey(f.r, f.c), f]));
    for (const [key, p] of cells) {
      const f = flameByCell.get(key);
      if (f) f.ttl = WAVE_TICKS;
      else { const next = { r: p.r, c: p.c, ttl: WAVE_TICKS }; s.waves.push(next); flameByCell.set(key, next); }
    }
    events.push({ kind: 'blast', bombs: seen.size, crates: destroyed.size });
    return { cells: [...cells.values()], owners: [...owners] };
  }
  function tick(s, events) {
    s.tick++;
    s.waves.forEach(f => f.ttl--);
    s.waves = s.waves.filter(f => f.ttl > 0);

    for (const a of s.actors) if (a.alive) a.cooldown = Math.max(0, a.cooldown - 1);
    if (s.intent && s.actors[0].alive && s.actors[0].trappedTicks === 0 && s.actors[0].cooldown === 0) {
      moveActor(s, s.actors[0], s.intent);
      s.actors[0].cooldown = MOVE_TICKS;
    }
    const danger = liveThreats(s);
    for (const bot of s.actors.slice(1)) if (bot.alive && bot.trappedTicks === 0 && bot.cooldown === 0) {
      const dir = botTurn(s, bot, danger);
      if (dir) moveActor(s, bot, dir);
      bot.cooldown = MOVE_TICKS;
    }
    s.bombs.forEach(b => b.fuse--);
    const due = s.bombs.filter(b => b.fuse <= 0);
    const burst = detonate(s, due, events), burstCells = new Set(burst.cells.map(p => cellKey(p.r, p.c)));
    for (const a of s.actors) if (a.alive && burstCells.has(cellKey(a.r, a.c))) {
      if (a.trappedTicks > 0) {
        a.alive = false; a.trappedTicks = 0; a.trappedBy = null;
        events.push({ kind: a.id === 'pilot' ? 'pilot-out' : 'rival-out', id: a.id });
      } else {
        a.trappedTicks = TRAP_TICKS;
        a.trappedBy = burst.owners[0] || null;
        a.cooldown = MOVE_TICKS;
        events.push({ kind: a.id === 'pilot' ? 'pilot-trapped' : 'rival-trapped', id: a.id });
      }
    }
    for (const a of s.actors) if (a.alive && a.trappedTicks > 0 && !burstCells.has(cellKey(a.r, a.c))) {
      a.trappedTicks--;
      if (a.id !== 'pilot' && a.pins > 0 && a.trappedTicks <= TRAP_TICKS - 45) {
        a.trappedTicks = 0; a.trappedBy = null; a.pins--;
        events.push({ kind: 'rival-rescued', id: a.id });
      } else if (a.trappedTicks === 0) {
        a.alive = false; a.trappedBy = null;
        events.push({ kind: a.id === 'pilot' ? 'pilot-out' : 'rival-out', id: a.id });
      }
    }
    checkEnd(s, events);
  }
  function validate(s) {
    if (!s || s.version !== 1 || s.rules !== RULES || !safeInt(s.tick, 0, 1e9) ||
      !Number.isFinite(s.remainder) || s.remainder < 0 || s.remainder >= STEP_MS ||
      !['playing', 'won', 'lost', 'draw'].includes(s.status) || !Array.isArray(s.grid) || s.grid.length !== HEIGHT ||
      !s.grid.every((row, r) => Array.isArray(row) && row.length === WIDTH && row.every((v, c) =>
        (v === 0 || v === WALL || v === CRATE) && (RAW[r][c] === '#' ? v === WALL : v !== WALL)) ) ||
      !Array.isArray(s.actors) || s.actors.length !== 4 || !Array.isArray(s.bombs) || !Array.isArray(s.waves) ||
      !safeInt(s.nextBomb, 1, 1e9) || !(s.intent === null || Object.hasOwn(DIRS, s.intent))) return false;
    const actorIds = new Set();
    for (const a of s.actors) {
      if (!a || !IDs.includes(a.id) || actorIds.has(a.id) || typeof a.alive !== 'boolean' ||
        !safeInt(a.r, 1, HEIGHT - 2) || !safeInt(a.c, 1, WIDTH - 2) || s.grid[a.r][a.c] !== 0 ||
        !safeInt(a.cooldown, 0, MOVE_TICKS) || !safeInt(a.trappedTicks, 0, TRAP_TICKS) ||
        !(a.trappedBy === null || IDs.includes(a.trappedBy)) || !safeInt(a.pins, 0, 1) ||
        (!a.alive && a.trappedTicks !== 0) ||
        (a.trappedTicks === 0) !== (a.trappedBy === null)) return false;
      actorIds.add(a.id);
    }
    if (IDs.some(id => !actorIds.has(id)) || s.actors.some((a, i) => a.id !== IDs[i])) return false;
    const aliveCells = s.actors.filter(a => a.alive).map(a => cellKey(a.r, a.c));
    if (new Set(aliveCells).size !== aliveCells.length) return false;
    const bombIds = new Set(), bombCells = new Set(), ownerCount = new Map();
    for (const b of s.bombs) {
      if (!b || !safeInt(b.id, 1, s.nextBomb - 1) || bombIds.has(b.id) || !IDs.includes(b.owner) ||
        !safeInt(b.r, 1, HEIGHT - 2) || !safeInt(b.c, 1, WIDTH - 2) || s.grid[b.r][b.c] === WALL ||
        !safeInt(b.fuse, 1, FUSE_TICKS) || b.range !== RANGE) return false;
      const key = cellKey(b.r, b.c);
      if (bombCells.has(key)) return false;
      bombIds.add(b.id); bombCells.add(key); ownerCount.set(b.owner, (ownerCount.get(b.owner) || 0) + 1);
    }
    if ([...ownerCount.values()].some(n => n > CAPACITY)) return false;
    const flameCells = new Set();
    for (const f of s.waves) {
      if (!f || !safeInt(f.r, 1, HEIGHT - 2) || !safeInt(f.c, 1, WIDTH - 2) || s.grid[f.r][f.c] === WALL || !safeInt(f.ttl, 1, WAVE_TICKS)) return false;
      const key = cellKey(f.r, f.c);
      if (flameCells.has(key)) return false;
      flameCells.add(key);
    }
    const pilot = s.actors.find(a => a.id === 'pilot');
    if (s.status === 'playing' && (!pilot.alive || s.actors.filter(a => a.alive).length === 1 && pilot.trappedTicks === 0) ||
      s.status === 'won' && (!pilot.alive || pilot.trappedTicks > 0 || s.actors.some(a => a.id !== 'pilot' && a.alive)) ||
      s.status === 'lost' && pilot.alive || s.status === 'draw' && (pilot.alive || s.actors.some(a => a.alive))) return false;
    return true;
  }
  function restore(input) {
    if (!validate(input)) return null;
    const s = clone(input), events = [];
    return makeGame(s, events);
  }
  function makeGame(s, events) {
    return {
      steer(dir) { return steer(s, dir); },
      place() { return place(s, 'pilot'); },
      rescue() { return rescue(s, 'pilot'); },
      advance(ms) {
        if (!Number.isFinite(ms) || ms < 0 || ms > 1000) return [];
        const out = [], combined = s.remainder + ms;
        const count = Math.floor(combined / STEP_MS);
        s.remainder = combined - count * STEP_MS;
        for (let i = 0; i < count && s.status === 'playing'; i++) tick(s, out);
        return out;
      },
      stepTicks(count = 1) {
        if (!safeInt(count, 0, 5000)) return [];
        const out = [];
        for (let i = 0; i < count && s.status === 'playing'; i++) tick(s, out);
        return out;
      },
      view() {
        return {
          tick: s.tick, status: s.status, grid: s.grid.map(row => row.slice()),
          actors: s.actors.map(a => ({ ...a, name: NAMES[a.id] })),
          bombs: s.bombs.map(b => ({ ...b })), waves: s.waves.map(f => ({ ...f })),
          pilot: { ...s.actors[0] }, rivals: s.actors.slice(1).map(a => ({ ...a, name: NAMES[a.id] })),
          remaining: s.actors.filter(a => a.id !== 'pilot' && a.alive).length,
          bombAvailable: canPlace(s, 'pilot'), rescueAvailable: s.actors[0].alive && s.actors[0].trappedTicks > 0 && s.actors[0].pins > 0,
          intent: s.intent
        };
      },
      serialize() { return clone(s); }
    };
  }
  return Object.freeze({
    RULES, WIDTH, HEIGHT, STEP_MS, MOVE_TICKS, FUSE_TICKS, WAVE_TICKS, TRAP_TICKS, RANGE, CAPACITY,
    WALL, CRATE, DIRS, ORDER, RAW, CRATES, SPAWNS, NAMES, create: () => makeGame(create(), []), restore, validate,
    previewDetonation(grid, bomb, bombs = []) { return rayCells(grid, bomb.r, bomb.c, bomb.range, bombs); }
  });
});
