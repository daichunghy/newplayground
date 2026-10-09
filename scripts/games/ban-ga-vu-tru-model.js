/* Original fixed-step solo arcade-shooter rules for the Bắn Gà Vũ Trụ candidate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BanGaVuTruModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const WIDTH = 640, HEIGHT = 520, STEP_MS = 1000 / 60;
  const RUN_TICKS = 60 * 60, MAX_HULL = 3;
  const PLAYER_Y = HEIGHT - 58, PLAYER_RADIUS = 14, PLAYER_SPEED = 5.1;
  const PLAYER_SHOT_SPEED = 8.6, ENEMY_SHOT_SPEED = 3.15;
  const PLAYER_SHOT_GAP = 14, INVULNERABLE_TICKS = 96, WAVE_BREAK_TICKS = 90;
  const WAVES = Object.freeze([
    Object.freeze({ name: 'Mạch Sương', goal: 3, spawnGap: 96, maxDrifters: 3, driftMin: 21, driftRange: 36, fallMin: .36, fallRange: .22, firstShot: 88, firstShotRange: 70, repeatShot: 188, repeatShotRange: 90, boltSpeed: 3.15 }),
    Object.freeze({ name: 'Vành Lục', goal: 5, spawnGap: 80, maxDrifters: 4, driftMin: 26, driftRange: 42, fallMin: .42, fallRange: .25, firstShot: 78, firstShotRange: 62, repeatShot: 166, repeatShotRange: 74, boltSpeed: 3.45 }),
    Object.freeze({ name: 'Lõi Rạng', goal: 7, spawnGap: 66, maxDrifters: 5, driftMin: 32, driftRange: 48, fallMin: .48, fallRange: .27, firstShot: 70, firstShotRange: 54, repeatShot: 146, repeatShotRange: 66, boltSpeed: 3.8 })
  ]);
  const CAMPAIGN_GOAL = WAVES.reduce((sum, wave) => sum + wave.goal, 0);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const clone = value => JSON.parse(JSON.stringify(value));
  const finite = Number.isFinite;
  const DEFAULT_SEED = 0x51a7c0de;

  function initialState(seed = DEFAULT_SEED) {
    return {
      version: 2, status: 'playing', ticks: 0, remainder: 0,
      score: 0, hull: MAX_HULL, remainingTicks: RUN_TICKS,
      invulnerableTicks: 0, axis: 0, firing: false,
      nextShotTick: 1, nextSpawnTick: 18, nextId: 1,
      waveIndex: 0, waveKills: 0, kills: 0, waveBreakTicks: 0,
      rngState: (Number(seed) >>> 0) || DEFAULT_SEED,
      player: { x: WIDTH / 2, y: PLAYER_Y },
      shots: [], hostileBolts: [], drifters: []
    };
  }

  function create(seed = DEFAULT_SEED) { return makeModel(initialState(seed)); }

  function makeModel(initial) {
    const state = clone(initial || initialState());
    if (state.version !== 2 || !['playing', 'paused', 'complete', 'over', 'won'].includes(state.status)) {
      throw new TypeError('Invalid Bắn Gà Vũ Trụ model state');
    }
    const events = [];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });
    const running = () => state.status === 'playing';
    const clearInput = () => { state.axis = 0; state.firing = false; };
    const random = () => {
      state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
      return state.rngState / 4294967296;
    };

    function spawnDrifter() {
      const wave = WAVES[state.waveIndex];
      const direction = random() < .5 ? -1 : 1;
      const x = 46 + random() * (WIDTH - 92);
      const drift = (wave.driftMin + random() * wave.driftRange) * direction;
      const tint = Math.floor(random() * 3);
      state.drifters.push({
        id: state.nextId++, x, y: -18, vx: drift, vy: wave.fallMin + random() * wave.fallRange,
        radius: 13 + random() * 4, tint,
        fireAtTick: state.ticks + wave.firstShot + Math.floor(random() * wave.firstShotRange)
      });
      emit('drifter-entered', { id: state.nextId - 1 });
    }

    function firePlayerShot() {
      if (!state.firing || state.ticks < state.nextShotTick) return;
      state.nextShotTick = state.ticks + PLAYER_SHOT_GAP;
      state.shots.push({ id: state.nextId++, x: state.player.x, y: state.player.y - 20, vy: -PLAYER_SHOT_SPEED, radius: 3 });
      emit('shot-fired');
    }

    function fireDrifterBolt(drifter) {
      const wave = WAVES[state.waveIndex];
      const dx = state.player.x - drifter.x, dy = state.player.y - drifter.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      state.hostileBolts.push({
        id: state.nextId++, x: drifter.x, y: drifter.y + drifter.radius,
        vx: dx / length * wave.boltSpeed, vy: dy / length * wave.boltSpeed, radius: 5
      });
      drifter.fireAtTick = state.ticks + wave.repeatShot + Math.floor(random() * wave.repeatShotRange);
      emit('bolt-fired', { drifterId: drifter.id });
    }

    function clearWave() {
      const clearedWave = state.waveIndex + 1;
      if (state.waveIndex === WAVES.length - 1) {
        state.status = 'won';
        state.remainingTicks = Math.max(0, RUN_TICKS - state.ticks);
        clearInput();
        state.drifters = [];
        state.hostileBolts = [];
        state.shots = [];
        emit('run-ended', { score: state.score, result: 'clear', kills: state.kills });
        return;
      }
      state.waveIndex += 1;
      state.waveKills = 0;
      state.waveBreakTicks = WAVE_BREAK_TICKS;
      state.nextSpawnTick = state.ticks + WAVE_BREAK_TICKS;
      state.invulnerableTicks = Math.max(state.invulnerableTicks, WAVE_BREAK_TICKS);
      state.drifters = [];
      state.hostileBolts = [];
      state.shots = [];
      emit('wave-cleared', { wave: clearedWave, nextWave: state.waveIndex + 1, breakTicks: WAVE_BREAK_TICKS });
    }

    function damage(reason, sourceId) {
      if (!running() || state.invulnerableTicks > 0 || state.waveBreakTicks > 0) return false;
      state.hull = Math.max(0, state.hull - 1);
      state.invulnerableTicks = INVULNERABLE_TICKS;
      emit('hull-hit', { reason, sourceId, hull: state.hull, score: state.score });
      if (state.hull === 0) {
        state.status = 'over';
        state.remainingTicks = Math.max(0, RUN_TICKS - state.ticks);
        clearInput();
        emit('run-ended', { score: state.score, result: 'over' });
      }
      return true;
    }

    function tick() {
      if (!running()) return;
      state.ticks += 1;
      state.remainingTicks = Math.max(0, RUN_TICKS - state.ticks);
      if (state.invulnerableTicks > 0) state.invulnerableTicks -= 1;

      state.player.x = clamp(state.player.x + state.axis * PLAYER_SPEED, PLAYER_RADIUS + 8, WIDTH - PLAYER_RADIUS - 8);
      firePlayerShot();

      if (state.waveBreakTicks > 0) state.waveBreakTicks -= 1;
      const wave = WAVES[state.waveIndex];
      if (state.waveBreakTicks === 0 && state.ticks >= state.nextSpawnTick) {
        if (state.drifters.length < wave.maxDrifters) spawnDrifter();
        state.nextSpawnTick = state.ticks + wave.spawnGap;
      }

      for (const drifter of state.drifters) {
        drifter.x += drifter.vx / 60;
        drifter.y += drifter.vy;
        if (drifter.x < drifter.radius + 8 || drifter.x > WIDTH - drifter.radius - 8) drifter.vx *= -1;
        if (state.ticks >= drifter.fireAtTick) fireDrifterBolt(drifter);
        if (drifter.y + drifter.radius >= state.player.y - PLAYER_RADIUS &&
            drifter.y - drifter.radius <= state.player.y + PLAYER_RADIUS &&
            Math.abs(drifter.x - state.player.x) < drifter.radius + PLAYER_RADIUS) {
          damage('contact', drifter.id);
          drifter.y = HEIGHT + drifter.radius + 1;
        }
      }

      for (const shot of state.shots) shot.y += shot.vy;
      for (const bolt of state.hostileBolts) { bolt.x += bolt.vx; bolt.y += bolt.vy; }

      const removed = new Set();
      let waveAdvanced = false;
      for (const shot of state.shots) {
        for (const drifter of state.drifters) {
          if (removed.has(drifter.id)) continue;
          if (Math.hypot(shot.x - drifter.x, shot.y - drifter.y) <= shot.radius + drifter.radius) {
            removed.add(drifter.id);
            shot.used = true;
            state.score += 100;
            state.kills += 1;
            state.waveKills += 1;
            emit('drifter-cleared', { id: drifter.id, score: state.score });
            if (state.waveKills >= wave.goal) {
              clearWave();
              waveAdvanced = true;
            }
            break;
          }
        }
        if (waveAdvanced || !running()) break;
      }
      if (!waveAdvanced) state.drifters = state.drifters.filter(drifter => !removed.has(drifter.id) && drifter.y < HEIGHT + drifter.radius);
      state.shots = state.shots.filter(shot => !shot.used && shot.y > -12);

      if (running()) {
        for (const bolt of state.hostileBolts) {
          if (Math.hypot(bolt.x - state.player.x, bolt.y - state.player.y) <= bolt.radius + PLAYER_RADIUS) {
            damage('bolt', bolt.id);
            bolt.used = true;
          }
        }
        state.hostileBolts = state.hostileBolts.filter(bolt => !bolt.used && bolt.x > -20 && bolt.x < WIDTH + 20 && bolt.y < HEIGHT + 20);
      }

      if (running() && state.remainingTicks === 0) {
        state.status = 'complete';
        clearInput();
        emit('run-ended', { score: state.score, result: 'complete' });
      }
    }

    function setAxis(value) {
      if (!running() || !finite(value)) return false;
      state.axis = Math.sign(value);
      return true;
    }
    function setFiring(value) {
      if (!running()) return false;
      state.firing = Boolean(value);
      return true;
    }
    function pause() {
      if (!running()) return false;
      state.status = 'paused'; state.remainder = 0; clearInput();
      emit('paused'); return true;
    }
    function resume() {
      if (state.status !== 'paused') return false;
      state.status = 'playing'; state.remainder = 0;
      emit('resumed'); return true;
    }
    function advance(milliseconds) {
      if (!running() || !finite(milliseconds) || milliseconds < 0 || milliseconds > 60000) return [];
      state.remainder += milliseconds;
      while (state.remainder + 1e-7 >= STEP_MS && running()) {
        state.remainder = Math.max(0, state.remainder - STEP_MS);
        tick();
      }
      if (!running()) state.remainder = 0;
      return drain();
    }
    function drain() { const out = events.splice(0, events.length); return out; }
    function view() {
      return {
        version: 2, status: state.status, ticks: state.ticks,
        remainingTicks: state.remainingTicks, remainingSeconds: Math.ceil(state.remainingTicks / 60),
        waveIndex: state.waveIndex, waveNumber: state.waveIndex + 1, wave: WAVES[state.waveIndex],
        waveKills: state.waveKills, waveGoal: WAVES[state.waveIndex].goal, waveBreakTicks: state.waveBreakTicks,
        kills: state.kills, campaignGoal: CAMPAIGN_GOAL,
        score: state.score, hull: state.hull, invulnerableTicks: state.invulnerableTicks,
        player: clone(state.player), shots: clone(state.shots),
        hostileBolts: clone(state.hostileBolts), drifters: clone(state.drifters)
      };
    }

    return { advance, drain, pause, resume, setAxis, setFiring, view, serialize: () => clone(state) };
  }

  return Object.freeze({ WIDTH, HEIGHT, STEP_MS, RUN_TICKS, MAX_HULL, PLAYER_Y, PLAYER_RADIUS, PLAYER_SHOT_SPEED, DEFAULT_SEED, WAVES, CAMPAIGN_GOAL, WAVE_BREAK_TICKS, create, makeModel });
});
