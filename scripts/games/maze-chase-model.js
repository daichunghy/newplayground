/* Lối sáng: original, deterministic maze-chase simulation. No third-party game code/assets. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_MazeChaseModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const RULES = 'light-trails-1', HZ = 120, STEP = 1 / HZ;
  const DIRS = Object.freeze([{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }].map(Object.freeze));
  const RAW = [
    [
      '###################',
      '#o.......A.......o#',
      '#.###.###.###.###.#',
      '#.......#.........#',
      '#.#.#####.#####.#.#',
      '#.................#',
      '#.###.#####.#####.#',
      '.........-.........',
      '###.###.###.###.###',
      '#B............#..C#',
      '#.#####.#####.###.#',
      '#.................#',
      '#.###.###.#######.#',
      '#...#.............#',
      '###.#####.###.###.#',
      '#o.......P.......o#',
      '###################'
    ], [
      '###################',
      '#o.......A.......o#',
      '#.#####.###.#####.#',
      '#.........#.......#',
      '###.###.#####.###.#',
      '#.................#',
      '#.###.###.#####.###',
      '#.....#..-........#',
      '#.###.#######.###.#',
      '.B...............C.',
      '###.#####.###.###.#',
      '#.............#...#',
      '#.###.#####.###.###',
      '#.................#',
      '#.#####.#####.###.#',
      '#o.......P.......o#',
      '###################'
    ], [
      '###################',
      '#o.......A.......o#',
      '#.###.#######.###.#',
      '#...#.............#',
      '#.#####.###.###.###',
      '...................',
      '###.###.#####.###.#',
      '#........-#.......#',
      '#.###.###.#####.###',
      '#B...............C#',
      '#.#####.###.#####.#',
      '#.......#.........#',
      '###.#####.###.###.#',
      '#.................#',
      '#.###.#####.#####.#',
      '#o.......P.......o#',
      '###################'
    ]
  ];
  function compile(rows, stage) {
    const width = rows[0].length, height = rows.length, text = rows.join('');
    const walls = [...text].map(c => c === '#' ? 1 : 0);
    const items = [...text].map(c => c === '.' ? 1 : c === 'o' ? 2 : 0);
    const map = { width, height, walls, items, start: text.indexOf('P'), homes: ['A', 'B', 'C'].map(c => text.indexOf(c)),
      bonus: text.indexOf('-'), powers: items.flatMap((v, i) => v === 2 ? [i] : []),
      playerSpeed: 5.4 + stage * 0.25, enemySpeed: 3.65 + stage * 0.35, powerTicks: (7 - stage * 0.7) * HZ };
    map.neighbors = walls.map((wall, i) => DIRS.map(d => {
      if (wall) return -1;
      const x = i % width, y = Math.floor(i / width), ny = y + d.y;
      let nx = x + d.x;
      // Only paired open edge cells form a tunnel. No arbitrary edge wrap.
      if (nx < 0 || nx >= width) {
        if (walls[y * width] || walls[y * width + width - 1]) return -1;
        nx = (nx + width) % width;
      }
      const n = ny * width + nx;
      return ny < 0 || ny >= height || walls[n] ? -1 : n;
    }));
    return Object.freeze({ ...map, walls: Object.freeze(walls), items: Object.freeze(items),
      homes: Object.freeze(map.homes), powers: Object.freeze(map.powers), neighbors: Object.freeze(map.neighbors.map(Object.freeze)) });
  }
  const LEVELS = Object.freeze(RAW.map(compile));
  const opposite = d => (d + 2) % 4;
  const actor = cell => ({ cell, next: -1, progress: 0, dir: -1 });
  const clone = v => JSON.parse(JSON.stringify(v));
  const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
  function distances(map, target) {
    const result = Array(map.walls.length).fill(-1);
    if (!integer(target, 0, result.length - 1) || map.walls[target]) return result;
    result[target] = 0;
    const queue = [target];
    for (let head = 0; head < queue.length; head++) {
      for (const n of map.neighbors[queue[head]]) if (n >= 0 && result[n] < 0) {
        result[n] = result[queue[head]] + 1; queue.push(n);
      }
    }
    return result;
  }
  function position(a, map) {
    let x = a.cell % map.width, y = Math.floor(a.cell / map.width);
    if (a.next >= 0 && a.dir >= 0) { x += DIRS[a.dir].x * a.progress; y += DIRS[a.dir].y * a.progress; }
    return { x, y };
  }
  function reverse(a) {
    if (a.dir < 0) return;
    a.dir = opposite(a.dir);
    if (a.next >= 0 && a.progress > 0) {
      const old = a.cell; a.cell = a.next; a.next = old; a.progress = 1 - a.progress;
    } else { a.next = -1; a.progress = 0; }
  }
  function fresh() {
    return { version: 1, rules: RULES, stage: 0, score: 0, lives: 3, extraLife: false,
      status: 'ready', tick: 0, phaseTicks: 0, power: 0, chain: 0, immune: 0, modeTicks: 0,
      queued: -1, items: [], player: null, enemies: [], bonusTicks: 0, bonusMask: 0, accumulator: 0 };
  }
  function installStage(s) {
    s.items = LEVELS[s.stage].items.slice(); s.bonusMask = 0; s.bonusTicks = 0; resetActors(s);
  }
  function resetActors(s) {
    const map = LEVELS[s.stage];
    s.player = actor(map.start);
    s.enemies = map.homes.map((cell, id) => ({ ...actor(cell), id, mode: 'active', wait: id * 180 + 90 }));
    s.queued = -1; s.power = 0; s.chain = 0; s.immune = 150; s.modeTicks = 0; s.phaseTicks = 0;
  }
  function targetFor(s, e) {
    const map = LEVELS[s.stage], player = s.player;
    if (e.mode === 'returning') return map.homes[e.id];
    const patrol = s.modeTicks % (22 * HZ) < 5 * HZ;
    if (patrol) return map.powers[(Math.floor(s.modeTicks / (22 * HZ)) + e.id) % map.powers.length];
    let target = player.next >= 0 && player.progress > 0.5 ? player.next : player.cell;
    if (e.id === 1 && player.dir >= 0) {
      for (let i = 0; i < 4; i++) {
        const next = map.neighbors[target][player.dir]; if (next < 0) break; target = next;
      }
    }
    if (e.id === 2) {
      // Warden guards the nearest remaining power crystal, or the active bonus.
      if (s.bonusTicks > 0) return map.bonus;
      const field = distances(map, target), powers = map.powers.filter(i => s.items[i] === 2);
      if (powers.length) target = powers.sort((a, b) => field[a] - field[b] || a - b)[0];
    }
    return target;
  }
  function enemyDirection(s, e) {
    const map = LEVELS[s.stage];
    let available = [0, 1, 2, 3].filter(d => map.neighbors[e.cell][d] >= 0);
    const forward = available.filter(d => e.dir < 0 || d !== opposite(e.dir));
    if (forward.length && e.mode !== 'returning') available = forward;
    const flee = s.power > 0 && e.mode !== 'returning';
    const field = distances(map, flee ? s.player.cell : targetFor(s, e));
    available.sort((a, b) => {
      const da = field[map.neighbors[e.cell][a]], db = field[map.neighbors[e.cell][b]];
      return (flee ? db - da : da - db) || ((a + e.id) % 4) - ((b + e.id) % 4);
    });
    return available[0] ?? -1;
  }
  function validActor(a, map) {
    return a && integer(a.cell, 0, map.walls.length - 1) && !map.walls[a.cell] && integer(a.dir, -1, 3) &&
      Number.isFinite(a.progress) && a.progress >= 0 && a.progress < 1 && integer(a.next, -1, map.walls.length - 1) &&
      (a.next === -1 ? a.progress === 0 : a.dir >= 0 && map.neighbors[a.cell][a.dir] === a.next);
  }
  function validate(s) {
    if (!s || s.version !== 1 || s.rules !== RULES || !integer(s.stage, 0, LEVELS.length - 1)) return false;
    const map = LEVELS[s.stage];
    if (!['ready', 'playing', 'dying', 'clearing', 'lost', 'won'].includes(s.status) ||
      !integer(s.score, 0, 1000000000) || !integer(s.lives, 0, 4) || typeof s.extraLife !== 'boolean' ||
      !integer(s.tick, 0, 1e9) || !integer(s.phaseTicks, 0, 120) || !integer(s.power, 0, 840) ||
      !integer(s.chain, 0, 3) || !integer(s.immune, 0, 150) || !integer(s.modeTicks, 0, 1e9) ||
      !integer(s.queued, -1, 3) || !integer(s.bonusTicks, 0, 1200) || !integer(s.bonusMask, 0, 3) ||
      !Number.isFinite(s.accumulator) || s.accumulator < 0 || s.accumulator >= STEP + 1e-9 ||
      !Array.isArray(s.items) || s.items.length !== map.items.length ||
      !s.items.every((v, i) => v === 0 || v === map.items[i]) || !validActor(s.player, map) ||
      !Array.isArray(s.enemies) || s.enemies.length !== 3 || !s.enemies.every((e, i) => validActor(e, map) && e.id === i &&
        ['active', 'returning'].includes(e.mode) && integer(e.wait, 0, 450))) return false;
    const remaining = s.items.filter(Boolean).length;
    if ((s.status === 'lost') !== (s.lives === 0)) return false;
    if (['won', 'clearing'].includes(s.status) !== (remaining === 0)) return false;
    if (s.status === 'won' && s.stage !== LEVELS.length - 1) return false;
    if (s.status === 'clearing' && s.stage === LEVELS.length - 1) return false;
    if (['dying', 'clearing'].includes(s.status) ? s.phaseTicks <= 0 : s.phaseTicks !== 0) return false;
    return true;
  }
  function build(state) {
    let s = state, events = [];
    function emit(kind, extra = {}) { events.push({ kind, ...extra }); }
    function addScore(value) {
      s.score = Math.min(1000000000, s.score + value);
      if (!s.extraLife && s.score >= 6000) { s.extraLife = true; s.lives = Math.min(4, s.lives + 1); emit('life'); }
    }
    function collect() {
      const map = LEVELS[s.stage], cell = s.player.cell, item = s.items[cell];
      if (item) {
        s.items[cell] = 0; addScore(item === 2 ? 50 : 10); emit(item === 2 ? 'power' : 'collect', { cell });
        if (item === 2) {
          s.power = Math.round(map.powerTicks); s.chain = 0;
          s.enemies.forEach(e => { if (e.mode === 'active') reverse(e); });
        }
        const remaining = s.items.filter(Boolean).length, total = map.items.filter(Boolean).length;
        for (let b = 0; b < 2; b++) if (!(s.bonusMask & (1 << b)) && total - remaining >= Math.ceil(total * [0.35, 0.7][b])) {
          s.bonusMask |= 1 << b; s.bonusTicks = 1200; emit('bonusSpawn');
        }
        if (!remaining) {
          addScore(500 * (s.stage + 1)); s.status = s.stage === LEVELS.length - 1 ? 'won' : 'clearing';
          s.phaseTicks = s.status === 'clearing' ? 120 : 0; s.queued = -1;
          emit(s.status === 'won' ? 'win' : 'clear');
        }
      }
      if (s.bonusTicks > 0 && cell === map.bonus) { s.bonusTicks = 0; addScore(250 * (s.stage + 1)); emit('bonus'); }
    }
    function move(a, budget, choose, arrive) {
      const map = LEVELS[s.stage];
      while (budget > 1e-10 && s.status === 'playing') {
        if (a.next < 0) {
          a.dir = choose();
          if (a.dir < 0 || map.neighbors[a.cell][a.dir] < 0) { a.dir = -1; return; }
          a.next = map.neighbors[a.cell][a.dir];
        }
        const used = Math.min(budget, 1 - a.progress); a.progress += used; budget -= used;
        if (a.progress >= 1 - 1e-10) {
          a.cell = a.next; a.next = -1; a.progress = 0; arrive();
        }
      }
    }
    function collision() {
      const map = LEVELS[s.stage], p = position(s.player, map);
      for (const e of s.enemies) {
        if (e.mode !== 'active' || e.wait > 0) continue;
        const q = position(e, map); let dx = Math.abs(p.x - q.x);
        if (Math.abs(p.y - q.y) < 0.5 && !map.walls[Math.round(p.y) * map.width] && !map.walls[Math.round(p.y) * map.width + map.width - 1]) dx = Math.min(dx, map.width - dx);
        if (dx * dx + (p.y - q.y) ** 2 >= 0.58 ** 2) continue;
        if (s.power > 0) {
          const points = 150 * 2 ** Math.min(s.chain, 2); s.chain = Math.min(3, s.chain + 1);
          addScore(points); e.mode = 'returning'; reverse(e); emit('capture', { id: e.id, points });
        } else if (!s.immune) {
          s.lives--; s.status = s.lives ? 'dying' : 'lost'; s.phaseTicks = s.lives ? 84 : 0;
          s.queued = -1; s.power = 0; emit('death'); return;
        }
      }
    }
    function tick() {
      if (s.status === 'ready' || s.status === 'lost' || s.status === 'won') return;
      s.tick++;
      if (s.status === 'dying' || s.status === 'clearing') {
        if (--s.phaseTicks === 0) {
          if (s.status === 'clearing') { s.stage++; installStage(s); emit('stage'); }
          else { resetActors(s); emit('respawn'); }
          s.status = 'ready';
        }
        return;
      }
      if (s.power > 0) s.power--; else s.modeTicks++;
      if (s.immune > 0) s.immune--;
      if (s.bonusTicks > 0) s.bonusTicks--;
      const map = LEVELS[s.stage];
      move(s.player, map.playerSpeed * STEP, () => {
        if (s.queued >= 0 && map.neighbors[s.player.cell][s.queued] >= 0) return s.queued;
        return s.player.dir;
      }, collect);
      if (s.status !== 'playing') return;
      collision(); if (s.status !== 'playing') return;
      for (const e of s.enemies) {
        if (e.wait > 0) { e.wait--; continue; }
        const speed = e.mode === 'returning' ? 8 : s.power ? 2.7 : map.enemySpeed + [0.2, 0, -0.15][e.id];
        move(e, speed * STEP, () => e.wait > 0 ? -1 : enemyDirection(s, e), () => {
          if (e.mode === 'returning' && e.cell === map.homes[e.id]) {
            e.mode = 'active'; e.wait = 180; e.dir = -1;
          }
        });
        // Stop at the home center instead of spending leftover movement after respawn.
        if (e.wait > 0) { e.next = -1; e.progress = 0; }
      }
      collision();
    }
    return {
      input(dir) {
        if (!integer(dir, 0, 3) || !['ready', 'playing'].includes(s.status)) return false;
        s.queued = dir;
        if (s.status === 'ready') { s.status = 'playing'; emit('start'); }
        if (s.player.dir >= 0 && dir === opposite(s.player.dir)) reverse(s.player);
        return true;
      },
      clearInput() { s.queued = -1; },
      advance(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return [];
        events = [];
        // A long stalled frame cannot fast-forward the run. The UI also pauses on blur/hidden.
        s.accumulator += Math.min(seconds, 0.25);
        while (s.accumulator + 1e-10 >= STEP) { s.accumulator = Math.max(0, s.accumulator - STEP); tick(); }
        return events.slice();
      },
      view() {
        const map = LEVELS[s.stage];
        return { ...clone(s), map, remaining: s.items.filter(Boolean).length,
          total: map.items.filter(Boolean).length, mode: s.power ? 'flee' : s.modeTicks % (22 * HZ) < 5 * HZ ? 'patrol' : 'chase',
          playerPosition: position(s.player, map), enemyPositions: s.enemies.map(e => position(e, map)) };
      },
      serialize() { return clone(s); }
    };
  }
  function create() { const s = fresh(); installStage(s); return build(s); }
  function restore(snapshot) { try { return validate(snapshot) ? build(clone(snapshot)) : null; } catch (_) { return null; } }
  return Object.freeze({ RULES, HZ, STEP, LEVELS, DIRS, create, restore, distances, position, targetFor, enemyDirection });
});
