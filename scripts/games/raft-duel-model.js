/* Original one-round beach-ball artillery duel for the historical Raft Wars route. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_RaftDuelModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const WIDTH = 640, HEIGHT = 360, STEP_MS = 16;
  const WATER_Y = 300, GRAVITY = 0.23, MIN_ANGLE = 18, MAX_ANGLE = 72;
  const MIN_POWER = 38, MAX_POWER = 100, POWER_RATE = 0.042;
  const DECKS = { player: { left: 48, right: 180 }, cpu: { left: 460, right: 592 } };
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function create() {
    const state = {
      version: 1, status: 'playing', turn: 'player',
      player: { x: 112, hp: 3, out: false, angle: 35, power: 64 },
      cpu: { x: 528, hp: 3, out: false, angle: 35, power: 80 },
      projectile: null, charging: false, chargeMs: 0, cpuWait: 0,
      shots: 0, hits: 0, impacts: 0
    };
    let remainder = 0;
    let events = [];

    function emit(kind, extra = {}) { events.push({ kind, ...extra }); }
    function canAct() {
      return state.status === 'playing' && state.turn === 'player' && !state.projectile && !state.charging;
    }
    function setAngle(value) {
      if (!canAct() || !Number.isFinite(value)) return false;
      const angle = clamp(Math.round(value), MIN_ANGLE, MAX_ANGLE);
      if (angle === state.player.angle) return false;
      state.player.angle = angle;
      emit('aim', { angle });
      return true;
    }
    function beginCharge() {
      if (!canAct()) return false;
      state.charging = true;
      state.chargeMs = 0;
      state.player.power = MIN_POWER;
      emit('charge-start');
      return true;
    }
    function chargePower(ms) {
      return clamp(MIN_POWER + Math.floor(ms * POWER_RATE), MIN_POWER, MAX_POWER);
    }
    function sourcePoint(side) {
      const actor = state[side];
      return { x: actor.x + (side === 'player' ? 16 : -16), y: 246 };
    }
    function launch(side, angle, power) {
      const source = sourcePoint(side), direction = side === 'player' ? 1 : -1;
      const speed = 4.8 + power * 0.061;
      const radians = angle * Math.PI / 180;
      state.projectile = {
        side, x: source.x, y: source.y,
        vx: direction * Math.cos(radians) * speed,
        vy: -Math.sin(radians) * speed, age: 0, power
      };
      state.shots++;
      emit('fire', { side, angle, power });
    }
    function releaseCharge() {
      if (!state.charging || state.status !== 'playing' || state.turn !== 'player' || state.projectile) return false;
      state.charging = false;
      state.chargeMs = 0;
      launch('player', state.player.angle, state.player.power);
      return true;
    }
    function cancelCharge() {
      if (!state.charging) return false;
      state.charging = false;
      state.chargeMs = 0;
      state.player.power = 64;
      emit('charge-cancel');
      return true;
    }
    function distanceToTarget(x, y, target) {
      return Math.hypot(x - target.x, y - 238);
    }
    function applyImpact(projectile, direct) {
      state.projectile = null;
      state.impacts++;
      const targetSide = projectile.side === 'player' ? 'cpu' : 'player';
      const target = state[targetSide], deck = DECKS[targetSide];
      const distance = distanceToTarget(projectile.x, projectile.y, target);
      if (direct) {
        target.hp = Math.max(0, target.hp - 1);
        target.x += projectile.side === 'player' ? 25 : -25;
        state.hits++;
        emit('hit', { side: projectile.side, target: targetSide, hp: target.hp, x: target.x });
      } else if (distance <= 84) {
        const push = Math.round((84 - distance) * 0.3);
        target.x += projectile.side === 'player' ? push : -push;
        emit('splash', { side: projectile.side, target: targetSide, x: target.x });
      } else {
        emit('miss', { side: projectile.side });
      }
      if (target.hp <= 0 || target.x < deck.left + 10 || target.x > deck.right - 10) {
        target.out = target.hp > 0;
        state.status = projectile.side === 'player' ? 'won' : 'lost';
        emit(state.status, { knockoff: target.out, shots: state.shots });
        return;
      }
      state.turn = projectile.side === 'player' ? 'cpu' : 'player';
      state.cpuWait = 0;
      emit('turn', { side: state.turn });
    }
    function predictMiss(side, angle, power) {
      const source = sourcePoint(side), targetSide = side === 'player' ? 'cpu' : 'player';
      const target = state[targetSide], direction = side === 'player' ? 1 : -1;
      const speed = 4.8 + power * 0.061, radians = angle * Math.PI / 180;
      let x = source.x, y = source.y;
      let vx = direction * Math.cos(radians) * speed, vy = -Math.sin(radians) * speed;
      let best = Infinity;
      for (let step = 0; step < 130; step++) {
        x += vx; y += vy; vy += GRAVITY;
        best = Math.min(best, distanceToTarget(x, y, target));
        if (best <= 13) return -1;
        if (y >= WATER_Y || x < 8 || x > WIDTH - 8) break;
      }
      return best;
    }
    function cpuFire() {
      let best = { score: Infinity, angle: 38, power: 88 };
      for (let angle = 18; angle <= 72; angle += 2) {
        for (let power = 66; power <= 100; power += 2) {
          const score = predictMiss('cpu', angle, power);
          const adjusted = score + power * 0.025;
          if (adjusted < best.score) best = { score: adjusted, angle, power };
        }
      }
      const attempt = Math.floor(state.shots / 2);
      const wobble = attempt % 3 === 0 ? 2 : attempt % 3 === 1 ? -1 : 0;
      const powerOffset = attempt % 3 === 2 ? -4 : 0;
      launch('cpu', clamp(best.angle + wobble, MIN_ANGLE, MAX_ANGLE), clamp(best.power + powerOffset, 66, MAX_POWER));
      state.cpuWait = 0;
    }
    function tick() {
      if (state.status !== 'playing') return;
      if (state.charging) {
        state.chargeMs += STEP_MS;
        state.player.power = chargePower(state.chargeMs);
        return;
      }
      if (!state.projectile && state.turn === 'cpu') {
        state.cpuWait += STEP_MS;
        if (state.cpuWait >= 440) cpuFire();
        return;
      }
      const shot = state.projectile;
      if (!shot) return;
      shot.x += shot.vx;
      shot.y += shot.vy;
      shot.vy += GRAVITY;
      shot.age++;
      const target = state[shot.side === 'player' ? 'cpu' : 'player'];
      const direct = distanceToTarget(shot.x, shot.y, target) <= 14;
      if (direct || shot.y >= WATER_Y || shot.x < 4 || shot.x > WIDTH - 4 || shot.age >= 150) applyImpact(shot, direct);
    }
    function advance(ms) {
      if (state.status !== 'playing' || !Number.isFinite(ms) || ms < 0 || ms > 30000) return [];
      remainder += ms;
      while (remainder >= STEP_MS && state.status === 'playing') { remainder -= STEP_MS; tick(); }
      return events.splice(0);
    }
    function view() {
      return {
        ...clone(state), width: WIDTH, height: HEIGHT, waterY: WATER_Y,
        playerDeck: clone(DECKS.player), cpuDeck: clone(DECKS.cpu)
      };
    }
    function restore(snapshot) {
      if (!snapshot || snapshot.version !== 1 || !['playing', 'won', 'lost'].includes(snapshot.status)) return false;
      const copy = clone(snapshot);
      for (const side of ['player', 'cpu']) {
        const actor = copy[side], deck = DECKS[side];
        if (!actor || !Number.isFinite(actor.x) || !Number.isInteger(actor.hp) || actor.hp < 0 || actor.hp > 3 || actor.x < deck.left - 40 || actor.x > deck.right + 40) return false;
      }
      if (!['player', 'cpu'].includes(copy.turn) || !Number.isFinite(copy.shots) || copy.shots < 0 || copy.shots > 100) return false;
      if (copy.projectile && (!Number.isFinite(copy.projectile.x) || !Number.isFinite(copy.projectile.y) || !Number.isFinite(copy.projectile.vx) || !Number.isFinite(copy.projectile.vy) || !['player', 'cpu'].includes(copy.projectile.side))) return false;
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, copy);
      remainder = 0;
      events = [];
      return true;
    }
    function tapFire() {
      if (!canAct()) return false;
      launch('player', state.player.angle, state.player.power);
      return true;
    }

    return {
      setAngle, beginCharge, releaseCharge, cancelCharge, tapFire, advance,
      view, serialize: () => clone(state), restore
    };
  }

  return { WIDTH, HEIGHT, STEP_MS, WATER_Y, GRAVITY, MIN_ANGLE, MAX_ANGLE, MIN_POWER, MAX_POWER, DECKS: clone(DECKS), create };
});
