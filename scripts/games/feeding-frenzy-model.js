/* Original grow-by-eating arcade simulation with a deterministic fixed-step core. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_FeedingFrenzyModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const VERSION = 2;
  const WIDTH = 680;
  const HEIGHT = 420;
  const TARGET = 12;
  const STAGE_GOAL = 4;
  const DURATION = 90;
  const STAGES = Object.freeze([
    Object.freeze({ id: 'vung-nuoc', name: 'Vũng Nước', place: 'Rìa cát nắng', preyInterval: .85, predatorInterval: 9, predatorLimit: 1, palette: ['#90dbea', '#258eaa', '#12566c'] }),
    Object.freeze({ id: 'ran-san-ho', name: 'Rạn San Hô', place: 'Qua dải san hô đỏ', preyInterval: .78, predatorInterval: 8, predatorLimit: 2, palette: ['#a4d9e4', '#327f9f', '#193f65'] }),
    Object.freeze({ id: 'bien-xanh', name: 'Biển Xanh', place: 'Vùng nước sâu', preyInterval: .72, predatorInterval: 7, predatorLimit: 3, palette: ['#6eb9d2', '#23628b', '#132e55'] })
  ]);
  const OTHER = Object.freeze({ playing: 'playing', won: 'won', lost: 'lost', timeout: 'timeout' });
  const stageForScore = score => Math.min(STAGES.length - 1, Math.floor(score / STAGE_GOAL));

  function validSeed(seed) { return Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff; }
  function cloneFish(fish) { return fish.map(item => ({ ...item })); }
  function snapshotState(state) { return { ...state, player: { ...state.player }, fish: cloneFish(state.fish) }; }

  function nextRandom(state) {
    let x = state.rng >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state.rng = x >>> 0;
    return state.rng / 0x100000000;
  }

  function randomRange(state, min, max) { return min + nextRandom(state) * (max - min); }

  function validFish(item) {
    return item && Number.isInteger(item.id) && item.id >= 0 && Number.isInteger(item.tier) && item.tier >= 0 && item.tier <= 4 &&
      (item.kind === 'prey' || item.kind === 'predator') && [item.x, item.y, item.vx, item.vy, item.radius, item.phase].every(Number.isFinite) && item.radius > 0;
  }

  function validateState(state) {
    if (!state || state.version !== VERSION || !validSeed(state.seed) || !Number.isInteger(state.rng) || state.rng <= 0 || !Number.isInteger(state.nextId) || state.nextId < 1 ||
      !Number.isFinite(state.time) || state.time < 0 || state.time > DURATION || !Number.isFinite(state.spawnTimer) || state.spawnTimer < 0 || state.spawnTimer >= 0.85 ||
      !Number.isFinite(state.predatorTimer) || state.predatorTimer < 0 || state.predatorTimer >= 9 || !Number.isInteger(state.score) || state.score < 0 || state.score > TARGET ||
      !Number.isInteger(state.stageIndex) || state.stageIndex !== stageForScore(state.score) ||
      !Number.isInteger(state.lives) || state.lives < 0 || state.lives > 3 || !Number.isInteger(state.tier) || state.tier < 1 || state.tier > 3 ||
      !Object.values(OTHER).includes(state.status) || !state.player || ![state.player.x, state.player.y, state.player.vx, state.player.vy, state.player.radius, state.player.invulnerable].every(Number.isFinite) ||
      !Array.isArray(state.fish) || state.fish.length > 24 || !state.fish.every(validFish)) {
      throw new TypeError('Invalid feeding-frenzy snapshot');
    }
    if (state.player.x < state.player.radius || state.player.x > WIDTH - state.player.radius || state.player.y < state.player.radius || state.player.y > HEIGHT - state.player.radius ||
      state.player.radius !== 11 + state.tier * 4 || state.player.invulnerable < 0 || state.player.invulnerable > 1.2 ||
      ![-1, 1].includes(state.player.facing) || state.tier !== Math.min(3, 1 + Math.floor(state.score / STAGE_GOAL)) ||
      state.fish.filter(fish => fish.kind === 'predator').length > STAGES[state.stageIndex].predatorLimit ||
      state.fish.some(fish => fish.x < -fish.radius || fish.x > WIDTH + fish.radius || fish.y < fish.radius || fish.y > HEIGHT - fish.radius || fish.id >= state.nextId ||
        (fish.kind === 'predator' ? fish.tier !== 4 : fish.tier > 2)) ||
      new Set(state.fish.map(fish => fish.id)).size !== state.fish.length) throw new TypeError('Inconsistent feeding-frenzy state');
    if (state.score >= TARGET && state.status !== 'won') throw new TypeError('Inconsistent feeding-frenzy terminal score');
    if (state.lives === 0 && state.status !== 'lost') throw new TypeError('Inconsistent feeding-frenzy lives');
    if (state.status === 'won' && state.score < TARGET) throw new TypeError('Inconsistent feeding-frenzy win');
    if (state.status === 'lost' && state.lives !== 0) throw new TypeError('Inconsistent feeding-frenzy loss');
    if (state.status === 'timeout' && state.time !== DURATION) throw new TypeError('Inconsistent feeding-frenzy timeout');
    return snapshotState(state);
  }

  function makeState(seed) {
    const state = {
      version: VERSION, seed, rng: seed >>> 0, nextId: 1, time: 0, spawnTimer: 0, predatorTimer: 0,
      score: 0, stageIndex: 0, lives: 3, tier: 1, status: 'playing', event: '',
      player: { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, radius: 15, invulnerable: 0, facing: 1 },
      fish: []
    };
    for (let i = 0; i < 5; i += 1) spawnFish(state, 'prey', 0, i % 2 ? -1 : 1);
    for (let i = 0; i < 2; i += 1) spawnFish(state, 'prey', 1, i % 2 ? 1 : -1);
    spawnFish(state, 'prey', 2, 1);
    spawnFish(state, 'predator', 4, -1);
    return state;
  }

  function spawnFish(state, kind, tier, direction) {
    const radius = kind === 'predator' ? 24 + tier * 3 : 9 + tier * 5;
    const fromLeft = direction > 0;
    state.fish.push({
      id: state.nextId++, kind, tier, radius,
      x: fromLeft ? -radius : WIDTH + radius,
      y: randomRange(state, 35, HEIGHT - 50),
      vx: direction * randomRange(state, kind === 'predator' ? 30 : 40, kind === 'predator' ? 52 : 78),
      vy: randomRange(state, -12, 12),
      phase: randomRange(state, 0, Math.PI * 2)
    });
  }

  function create(options = {}) {
    const seed = options.seed === undefined ? 0x51ea1234 : options.seed;
    if (!validSeed(seed)) throw new RangeError('Invalid feeding-frenzy seed');
    let state = options.snapshot ? validateState(options.snapshot) : makeState(seed);
    const initialSeed = options.snapshot ? state.seed : seed;

    function view() { return { ...snapshotState(state), stage: STAGES[state.stageIndex], stageProgress: state.score - state.stageIndex * STAGE_GOAL }; }

    function step(dt, input = { x: 0, y: 0 }) {
      if (state.status !== 'playing') return false;
      if (!Number.isFinite(dt) || dt < 0 || dt > 0.1) throw new RangeError('Invalid feeding-frenzy step');
      const ix = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, input.x)) : 0;
      const iy = Number.isFinite(input.y) ? Math.max(-1, Math.min(1, input.y)) : 0;
      const length = Math.hypot(ix, iy);
      const nx = length > 1 ? ix / length : ix;
      const ny = length > 1 ? iy / length : iy;
      const player = state.player;
      const speed = 178;
      player.vx = nx * speed;
      player.vy = ny * speed;
      if (nx) player.facing = Math.sign(nx);
      player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x + player.vx * dt));
      player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y + player.vy * dt));
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      state.time = Math.min(DURATION, state.time + dt);
      state.event = '';

      for (const fish of state.fish) {
        fish.phase += dt * (fish.kind === 'predator' ? 1.4 : 2.2);
        if (fish.kind === 'predator') {
          const dx = player.x - fish.x;
          const dy = player.y - fish.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < 230) {
            fish.vx = dx / distance * 48;
            fish.vy = dy / distance * 48;
          } else fish.vy = Math.sin(fish.phase) * 18;
        } else fish.vy = Math.sin(fish.phase) * 20;
        fish.x += fish.vx * dt;
        fish.y += fish.vy * dt;
        fish.y = Math.max(fish.radius, Math.min(HEIGHT - fish.radius, fish.y));
        if (fish.x < -fish.radius) fish.x = WIDTH + fish.radius;
        if (fish.x > WIDTH + fish.radius) fish.x = -fish.radius;
      }

      const survivors = [];
      let stageChanged = false;
      for (let index = 0; index < state.fish.length; index += 1) {
        const fish = state.fish[index];
        const distance = Math.hypot(player.x - fish.x, player.y - fish.y);
        if (distance <= player.radius + fish.radius) {
          if (fish.tier < state.tier) {
            const previousStage = state.stageIndex;
            state.score = Math.min(TARGET, state.score + 1);
            state.stageIndex = stageForScore(state.score);
            state.tier = Math.min(3, 1 + Math.floor(state.score / STAGE_GOAL));
            player.radius = 11 + state.tier * 4;
            player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y));
            stageChanged ||= state.stageIndex !== previousStage;
            state.event = state.score >= TARGET ? 'win' : stageChanged ? 'stage' : 'eat';
            if (state.score >= TARGET) {
              state.status = 'won';
              survivors.push(...state.fish.slice(index + 1));
              break;
            }
            continue;
          }
          if (fish.tier > state.tier && player.invulnerable <= 0) {
            state.lives -= 1;
            player.invulnerable = 1.2;
            state.event = 'hit';
            fish.x = player.x < WIDTH / 2 ? WIDTH - fish.radius : fish.radius;
            fish.y = Math.max(fish.radius, Math.min(HEIGHT - fish.radius, player.y));
            fish.vx = player.x < WIDTH / 2 ? -55 : 55;
            fish.vy = 0;
            if (state.lives <= 0) {
              state.lives = 0;
              state.status = 'lost';
              break;
            }
          }
        }
        survivors.push(fish);
      }
      state.fish = survivors;
      if (state.status === 'playing') {
        if (stageChanged) {
          const stage = STAGES[state.stageIndex];
          let predators = state.fish.filter(fish => fish.kind === 'predator').length;
          while (predators < stage.predatorLimit) {
            spawnFish(state, 'predator', 4, nextRandom(state) < 0.5 ? -1 : 1);
            predators++;
          }
        }
        const stage = STAGES[state.stageIndex];
        state.spawnTimer += dt;
        while (state.spawnTimer >= stage.preyInterval) {
          state.spawnTimer -= stage.preyInterval;
          if (state.fish.filter(fish => fish.kind === 'prey').length < 16) {
            const tier = Math.floor(nextRandom(state) * state.tier);
            spawnFish(state, 'prey', tier, nextRandom(state) < 0.5 ? -1 : 1);
          }
        }
        state.predatorTimer += dt;
        if (state.predatorTimer >= stage.predatorInterval) {
          state.predatorTimer -= stage.predatorInterval;
          if (state.fish.filter(fish => fish.kind === 'predator').length < stage.predatorLimit) spawnFish(state, 'predator', 4, nextRandom(state) < 0.5 ? -1 : 1);
        }
        if (state.score >= TARGET && state.tier === 3) state.status = 'won';
        else if (state.time >= DURATION) state.status = 'timeout';
      }
      return true;
    }

    function reset(nextSeed = initialSeed) {
      if (!validSeed(nextSeed)) throw new RangeError('Invalid feeding-frenzy seed');
      state = makeState(nextSeed);
    }

    function serialize() { return snapshotState(state); }
    return Object.freeze({ view, step, reset, serialize });
  }

  function restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Invalid feeding-frenzy snapshot');
    return create({ seed: snapshot.seed, snapshot });
  }
  return Object.freeze({ VERSION, WIDTH, HEIGHT, TARGET, STAGE_GOAL, DURATION, STAGES, stageForScore, create, restore });
});
