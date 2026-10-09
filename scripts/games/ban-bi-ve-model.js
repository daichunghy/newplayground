/* Bắn Bi Ve: original deterministic ring-marble model. No third-party game code or assets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BanBiVeModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const VERSION = 1;
  const RULES = 'ban-bi-ve-ring-2026-10';
  const WIDTH = 720, HEIGHT = 520;
  const CENTER = Object.freeze({ x: 360, y: 260 });
  const RING_RADIUS = 142, MARBLE_RADIUS = 13, SHOOTER_RADIUS = 16;
  const STEP = 1 / 120, FRICTION = 1.35, RESTITUTION = 0.84;
  const MAX_PULL = 116, MAX_SPEED = 560, INITIAL_PER_PLAYER = 3;
  const CPU_LIMITS = Object.freeze({ targetCount: 3, angleOffsets: Object.freeze([0, -0.12, 0.12]), speeds: Object.freeze([320, 500]), maxTrials: 18, simulationSteps: 420 });
  const PLAYER_COLORS = Object.freeze(['#70d4ff', '#ff8b72', '#b59aff', '#f4cf61']);
  const TARGET_COLORS = Object.freeze(['#f7f0ce', '#ffd2e7', '#c9f1da', '#f6d3a8']);
  const SLOTS = Object.freeze(Array.from({ length: 12 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 6;
    const radius = i % 2 ? 91 : 72;
    return Object.freeze({ x: CENTER.x + Math.cos(angle) * radius, y: CENTER.y + Math.sin(angle) * radius });
  }));

  const copy = value => JSON.parse(JSON.stringify(value));
  const finite = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
  const integer = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;

  function homeFor(players, player) {
    const angle = -Math.PI / 2 + player * Math.PI * 2 / players;
    const radius = RING_RADIUS + 68;
    return { x: CENTER.x + Math.cos(angle) * radius, y: CENTER.y + Math.sin(angle) * radius };
  }

  class Game {
    constructor({ players = 2, seed = 20261007 } = {}) {
      if (!integer(players, 2, 4)) players = 2;
      if (!integer(seed, 1, 0xffffffff)) seed = 20261007;
      this.events = [];
      let rng = seed >>> 0 || 1;
      const random = () => {
        rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
        return (rng >>>= 0) / 4294967296;
      };
      const offset = Math.floor(random() * SLOTS.length);
      const targets = [];
      for (let i = 0; i < players * INITIAL_PER_PLAYER; i++) {
        const slot = SLOTS[(offset + i) % SLOTS.length];
        const wobble = (random() - 0.5) * 2.5;
        targets.push({
          id: i + 1,
          owner: i % players,
          color: i % TARGET_COLORS.length,
          x: slot.x + wobble,
          y: slot.y - wobble,
          vx: 0,
          vy: 0
        });
      }
      const home = homeFor(players, 0);
      this.state = {
        version: VERSION, rules: RULES, seed, players, turn: 0,
        score: Array(players).fill(0), targets,
        striker: { x: home.x, y: home.y, vx: 0, vy: 0 },
        phase: 'ready', status: 'playing', shots: 0, capturesThisShot: 0,
        settleTicks: 0, ticks: 0, accumulator: 0, winners: [], cpuScoredTurn: false
      };
    }

    home() { return homeFor(this.state.players, this.state.turn); }
    serialize() { return copy(this.state); }
    view() { return this.serialize(); }
    drainEvents() { const events = this.events; this.events = []; return events; }
    emit(type, fields = {}) { this.events.push({ type, ...fields }); }

    shoot(angle, speed) {
      const s = this.state;
      if (s.status !== 'playing' || s.phase !== 'ready' || !Number.isFinite(angle) || !finite(speed, 70, MAX_SPEED)) return false;
      const home = this.home();
      s.striker = { x: home.x, y: home.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
      s.phase = 'moving'; s.shots++; s.capturesThisShot = 0; s.settleTicks = 0;
      this.emit('shot', { player: s.turn, speed });
      return true;
    }

    shootFromPull(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || this.state.phase !== 'ready') return false;
      const home = this.home(), dx = home.x - x, dy = home.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance < 12 || distance > MAX_PULL + 1) return false;
      return this.shoot(Math.atan2(dy, dx), Math.min(MAX_SPEED, Math.max(100, distance * 4.8)));
    }

    chooseCpuShot() {
      const s = this.state;
      if (s.status !== 'playing' || s.phase !== 'ready' || s.players < 2 || s.turn !== 1 || !s.targets.length) return null;
      const home = this.home();
      if (s.cpuScoredTurn) {
        // A low-power shot away from the ring takes the rule-preserving extra shot, then yields.
        return { angle: Math.atan2(home.y - CENTER.y, home.x - CENTER.x), speed: 100, predictedCaptures: 0, trials: 0 };
      }
      const targets = [...s.targets]
        .sort((a, b) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y) || a.id - b.id)
        .slice(0, CPU_LIMITS.targetCount);
      let best = null;
      let trials = 0;
      for (const target of targets) {
        const baseAngle = Math.atan2(target.y - home.y, target.x - home.x);
        for (const offset of CPU_LIMITS.angleOffsets) {
          for (const speed of CPU_LIMITS.speeds) {
            if (trials >= CPU_LIMITS.maxTrials) break;
            trials += 1;
            const trial = restore(this.serialize());
            if (!trial || !trial.shoot(baseAngle + offset, speed)) continue;
            for (let tick = 0; tick < CPU_LIMITS.simulationSteps && trial.state.phase === 'moving'; tick += 1) trial.step();
            const captured = trial.state.score[s.turn] - s.score[s.turn];
            const beforeById = new Map(s.targets.map(ball => [ball.id, ball]));
            let outwardDrift = 0;
            for (const ball of trial.state.targets) {
              const before = beforeById.get(ball.id);
              if (before) outwardDrift += Math.max(0, Math.hypot(ball.x - CENTER.x, ball.y - CENTER.y) - Math.hypot(before.x - CENTER.x, before.y - CENTER.y));
            }
            const score = captured * 1000 - outwardDrift;
            if (!best || score > best.score) best = { angle: baseAngle + offset, speed, predictedCaptures: captured, score };
          }
        }
      }
      return best ? { angle: best.angle, speed: best.speed, predictedCaptures: best.predictedCaptures, trials } : null;
    }

    captureTargets() {
      const s = this.state, kept = [];
      for (const ball of s.targets) {
        if (Math.hypot(ball.x - CENTER.x, ball.y - CENTER.y) > RING_RADIUS) {
          s.score[s.turn]++; s.capturesThisShot++;
          if (s.turn === 1) s.cpuScoredTurn = true;
          this.emit('capture', { id: ball.id, owner: ball.owner, player: s.turn, color: ball.color, score: s.score[s.turn] });
        } else kept.push(ball);
      }
      s.targets = kept;
    }

    keepInsideBoard(ball, radius) {
      const minX = radius + 5, maxX = WIDTH - radius - 5;
      const minY = radius + 5, maxY = HEIGHT - radius - 5;
      if (ball.x < minX) { ball.x = minX; ball.vx = Math.abs(ball.vx) * 0.52; }
      if (ball.x > maxX) { ball.x = maxX; ball.vx = -Math.abs(ball.vx) * 0.52; }
      if (ball.y < minY) { ball.y = minY; ball.vy = Math.abs(ball.vy) * 0.52; }
      if (ball.y > maxY) { ball.y = maxY; ball.vy = -Math.abs(ball.vy) * 0.52; }
    }

    collide(a, b, radiusA, radiusB) {
      let dx = b.x - a.x, dy = b.y - a.y;
      let distance = Math.hypot(dx, dy);
      const minDistance = radiusA + radiusB;
      if (distance >= minDistance) return false;
      if (distance < 1e-8) {
        const angle = ((a.id || 1) * 2.399963 + (b.id || 7)) % (Math.PI * 2);
        dx = Math.cos(angle); dy = Math.sin(angle); distance = 1;
      }
      const nx = dx / distance, ny = dy / distance;
      const overlap = minDistance - distance;
      a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
      const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relative < 0) {
        const impulse = -(1 + RESTITUTION) * relative / 2;
        a.vx -= impulse * nx; a.vy -= impulse * ny;
        b.vx += impulse * nx; b.vy += impulse * ny;
      }
      return true;
    }

    finishShot() {
      const s = this.state;
      if (!s.targets.length) {
        const highest = Math.max(...s.score);
        s.winners = s.score.map((score, player) => score === highest ? player : -1).filter(player => player >= 0);
        s.status = 'won'; s.phase = 'ready';
        const type = s.winners.length > 1 ? 'draw' : 'won';
        this.emit(type, { winners: [...s.winners], score: [...s.score] });
        return;
      }
      if (s.capturesThisShot === 0) s.turn = (s.turn + 1) % s.players;
      if (s.turn !== 1) s.cpuScoredTurn = false;
      s.capturesThisShot = 0; s.phase = 'ready'; s.settleTicks = 0;
      const home = this.home();
      s.striker = { x: home.x, y: home.y, vx: 0, vy: 0 };
      this.emit('turn', { player: s.turn });
    }

    step() {
      const s = this.state;
      if (s.status !== 'playing' || s.phase !== 'moving') return;
      s.ticks++;
      const all = [s.striker, ...s.targets];
      for (const ball of all) { ball.x += ball.vx * STEP; ball.y += ball.vy * STEP; }
      for (let i = 0; i < s.targets.length; i++) {
        for (let j = i + 1; j < s.targets.length; j++) this.collide(s.targets[i], s.targets[j], MARBLE_RADIUS, MARBLE_RADIUS);
        this.collide(s.striker, s.targets[i], SHOOTER_RADIUS, MARBLE_RADIUS);
      }
      const decay = Math.exp(-FRICTION * STEP);
      for (const ball of all) {
        ball.vx *= decay; ball.vy *= decay;
        if (ball !== s.striker) this.keepInsideBoard(ball, MARBLE_RADIUS);
      }
      this.keepInsideBoard(s.striker, SHOOTER_RADIUS);
      this.captureTargets();
      const speed = Math.max(Math.hypot(s.striker.vx, s.striker.vy), ...s.targets.map(ball => Math.hypot(ball.vx, ball.vy)), 0);
      if (speed < 8) s.settleTicks++; else s.settleTicks = 0;
      if (s.settleTicks >= 22) this.finishShot();
    }

    advance(seconds) {
      if (this.state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return 0;
      this.state.accumulator += Math.min(0.25, seconds);
      let steps = 0;
      while (this.state.accumulator + 1e-10 >= STEP && this.state.status === 'playing') {
        this.state.accumulator = Math.max(0, this.state.accumulator - STEP);
        this.step(); steps++;
      }
      if (this.state.status !== 'playing') this.state.accumulator = 0;
      return steps;
    }

    retry({ players = this.state.players, seed = ((this.state.seed + 1) >>> 0) || 1 } = {}) {
      return new Game({ players, seed });
    }
  }

  function restore(raw) {
    try {
      if (!raw || raw.version !== VERSION || raw.rules !== RULES) return null;
      if (raw.cpuScoredTurn !== undefined && typeof raw.cpuScoredTurn !== 'boolean') return null;
      if (raw.cpuScoredTurn === true && raw.turn !== 1) return null;
      if (!integer(raw.seed, 1, 0xffffffff) || !integer(raw.players, 2, 4) || !integer(raw.turn, 0, raw.players - 1)) return null;
      if (!['playing', 'won'].includes(raw.status) || !['ready', 'moving'].includes(raw.phase)) return null;
      if (!integer(raw.shots, 0, 1e7) || !integer(raw.capturesThisShot, 0, raw.players * INITIAL_PER_PLAYER)) return null;
      if (!integer(raw.settleTicks, 0, 22) || !integer(raw.ticks, 0, 1e9) || !finite(raw.accumulator, 0, STEP + 1e-9)) return null;
      if (!Array.isArray(raw.score) || raw.score.length !== raw.players || raw.score.some(value => !integer(value, 0, raw.players * INITIAL_PER_PLAYER))) return null;
      if (!Array.isArray(raw.targets) || raw.targets.length > raw.players * INITIAL_PER_PLAYER) return null;
      if (!Array.isArray(raw.winners) || raw.winners.some(player => !integer(player, 0, raw.players - 1))) return null;
      const ids = new Set();
      for (const ball of raw.targets) {
        if (!ball || !integer(ball.id, 1, raw.players * INITIAL_PER_PLAYER) || ids.has(ball.id) || !integer(ball.owner, 0, raw.players - 1) || !integer(ball.color, 0, TARGET_COLORS.length - 1)) return null;
        if (ball.owner !== (ball.id - 1) % raw.players || ball.color !== (ball.id - 1) % TARGET_COLORS.length) return null;
        if (!finite(ball.x, -100, WIDTH + 100) || !finite(ball.y, -100, HEIGHT + 100) || !finite(ball.vx, -MAX_SPEED, MAX_SPEED) || !finite(ball.vy, -MAX_SPEED, MAX_SPEED)) return null;
        ids.add(ball.id);
      }
      const b = raw.striker;
      if (!b || !finite(b.x, -100, WIDTH + 100) || !finite(b.y, -100, HEIGHT + 100) || !finite(b.vx, -MAX_SPEED, MAX_SPEED) || !finite(b.vy, -MAX_SPEED, MAX_SPEED)) return null;
      const captured = raw.score.reduce((sum, value) => sum + value, 0);
      if (captured + raw.targets.length !== raw.players * INITIAL_PER_PLAYER) return null;
      if (raw.status === 'won' && (raw.phase !== 'ready' || raw.targets.length || !raw.winners.length)) return null;
      if (raw.status === 'playing' && (!raw.targets.length || raw.winners.length || (raw.phase === 'ready' && raw.capturesThisShot))) return null;
      if (raw.phase === 'ready' && (Math.abs(b.vx) > 1e-8 || Math.abs(b.vy) > 1e-8 || raw.settleTicks)) return null;
      if (raw.status === 'won') {
        const highest = Math.max(...raw.score);
        const actualWinners = raw.score.map((score, player) => score === highest ? player : -1).filter(player => player >= 0);
        if (raw.winners.length !== actualWinners.length || raw.winners.some((player, index) => player !== actualWinners[index])) return null;
      }
      const game = new Game({ players: raw.players, seed: raw.seed });
      game.state = copy(raw);
      if (game.state.cpuScoredTurn === undefined) game.state.cpuScoredTurn = false;
      game.events = [];
      return game;
    } catch (_) { return null; }
  }

  return {
    VERSION, RULES, WIDTH, HEIGHT, CENTER, RING_RADIUS, MARBLE_RADIUS, SHOOTER_RADIUS,
    STEP, MAX_PULL, MAX_SPEED, INITIAL_PER_PLAYER, PLAYER_COLORS, TARGET_COLORS, CPU_LIMITS,
    Game, create: options => new Game(options), restore, homeFor
  };
});
