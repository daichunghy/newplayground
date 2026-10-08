/* Deterministic original ball-and-peg puzzle model. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_PinballPegsModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 420, HEIGHT = 580, SHOT_LIMIT = 10, SHOT_MAX_SECONDS = 6;
  const ORANGE_TARGETS = 25;
  const BALL_RADIUS = 6, PEG_RADIUS = 8;
  const SPEED = 210, GRAVITY = 420, STEP = 1 / 120;
  const BUCKET_WIDTH = 92, BUCKET_Y = HEIGHT - 22, BUCKET_SPEED = 108;
  const ANGLE_LIMIT = 68;
  const COLORS = Object.freeze({ orange: '#e98b4f', blue: '#58a8c9' });
  const MARKS = Object.freeze({ orange: '◆', blue: '●' });
  const STAGES = Object.freeze([
    Object.freeze({ name: 'Vòm Nắng', balls: 10, bucketSpeed: 82, rows: Object.freeze([
      'BBBBBBBBB', 'BBBOOOBBB', 'BBOOOOOBB', 'BBOOOOOBB', 'BBBOOOBBB', 'BBBBBBBBB'
    ]) }),
    Object.freeze({ name: 'Hai Mỏm', balls: 10, bucketSpeed: 108, rows: Object.freeze([
      'BBBBBBBBB', 'BOO...OOB', 'BOO...OOB', 'BOO...OOB', 'BOO...OOB', 'BBBBBBBBB'
    ]) }),
    Object.freeze({ name: 'Đường Gấp', balls: 9, bucketSpeed: 132, rows: Object.freeze([
      'O..OOO..O', '.O.B.B.O.', '..O...O..', '...O.O...', '..O...O..', '.O.....O.'
    ]) }),
    Object.freeze({ name: 'Khe Đôi', balls: 9, bucketSpeed: 160, rows: Object.freeze([
      'OOO...OOO', 'O...B...O', 'O..BBB..O', 'O..BBB..O', 'O...B...O', 'OOO...OOO'
    ]) }),
    Object.freeze({ name: 'Mưa Sao', balls: 8, bucketSpeed: 184, rows: Object.freeze([
      'OBOBOBOBO', 'BOBOBOBOB', 'OBOBOBOBO', 'BOBOBOBOB', 'OBOBOBOBO', 'BOBOBOBOB'
    ]) })
  ]);

  function hashSeed(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const ch of String(seed ?? Date.now())) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }
  function makeRng(seed) {
    let state = hashSeed(seed);
    return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  }
  function defaultPegs(seed) {
    const pegs = [];
    const cols = 9, rows = 6, spacingX = 41, spacingY = 47;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      pegs.push({ id: `${row}:${col}`, x: 26 + col * spacingX + (row % 2 ? 20 : 0), y: 112 + row * spacingY, color: 'blue' });
    }
    const random = makeRng(seed), indices = Array.from({ length: pegs.length }, (_, i) => i);
    for (let i = 0; i < ORANGE_TARGETS; i++) {
      const j = i + Math.floor(random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
      pegs[indices[i]].color = 'orange';
    }
    return pegs;
  }
  function stagePegs(index) {
    const stage = STAGES[index];
    if (!stage) throw new RangeError('Stage index is invalid.');
    const pegs = [];
    stage.rows.forEach((row, rowIndex) => {
      if (row.length !== 9 || /[^OB.]/.test(row)) throw new TypeError('Stage peg map is invalid.');
      for (let col = 0; col < row.length; col++) {
        if (row[col] === '.') continue;
        pegs.push({ id: `${rowIndex}:${col}`, x: 26 + col * 41 + (rowIndex % 2 ? 20 : 0),
          y: 112 + rowIndex * 47, color: row[col] === 'O' ? 'orange' : 'blue' });
      }
    });
    return pegs;
  }
  function validPeg(peg) {
    return peg && Number.isFinite(peg.x) && peg.x >= PEG_RADIUS && peg.x <= WIDTH - PEG_RADIUS
      && Number.isFinite(peg.y) && peg.y >= 40 && peg.y < BUCKET_Y - 16 && ['orange', 'blue'].includes(peg.color);
  }

  function createStage(index) {
    const stage = STAGES[index];
    if (!stage) throw new RangeError('Stage index is invalid.');
    return create({ seed: `bat-chot-stage-${index + 1}`, pegs: stagePegs(index),
      balls: stage.balls, bucketSpeed: stage.bucketSpeed });
  }

  function create(options = {}) {
    const seed = options.seed ?? 20071008;
    const bucketSpeed = Number.isFinite(options.bucketSpeed) ? Math.max(0, Math.min(500, options.bucketSpeed)) : BUCKET_SPEED;
    const original = (options.pegs || defaultPegs(seed)).map((peg, index) => ({
      id: String(peg.id ?? index), x: peg.x, y: peg.y, color: peg.color
    }));
    if (!original.every(validPeg) || new Set(original.map(peg => peg.id)).size !== original.length) throw new TypeError('Peg layout is invalid.');
    if (!Number.isInteger(options.balls ?? SHOT_LIMIT) || (options.balls ?? SHOT_LIMIT) < 1 || (options.balls ?? SHOT_LIMIT) > 99) throw new TypeError('Ball count is invalid.');
    let pegs, ballsLeft, score, shots, projectile, aim, bucketX, bucketDirection, elapsed, shotElapsed, status, lastEvent;
    function reset() {
      pegs = original.map(peg => ({ ...peg }));
      ballsLeft = options.balls ?? SHOT_LIMIT;
      score = 0; shots = 0; projectile = null; aim = 0;
      bucketX = Number.isFinite(options.bucketX) ? Math.max(BUCKET_WIDTH / 2, Math.min(WIDTH - BUCKET_WIDTH / 2, options.bucketX)) : WIDTH / 2;
      bucketDirection = options.bucketDirection === -1 ? -1 : 1; elapsed = 0; shotElapsed = 0;
      status = pegs.some(peg => peg.color === 'orange') ? 'playing' : 'won';
      lastEvent = status === 'won' ? 'win' : 'ready';
    }
    reset();

    function view() {
      return {
        pegs: pegs.map(peg => ({ ...peg })), ballsLeft, score, shots, aim,
        projectile: projectile && { ...projectile }, bucketX, bucketDirection,
        orangeLeft: pegs.filter(peg => peg.color === 'orange').length, shotElapsed,
        status, lastEvent, canFire: status === 'playing' && !projectile && ballsLeft > 0
      };
    }
    function collision() {
      for (let i = 0; i < pegs.length; i++) {
        const peg = pegs[i];
        if (peg.hit) continue;
        const dx = projectile.x - peg.x, dy = projectile.y - peg.y;
        const radius = BALL_RADIUS + PEG_RADIUS;
        const d2 = dx * dx + dy * dy;
        if (d2 > radius * radius) continue;
        const length = Math.sqrt(d2) || 1;
        const nx = dx / length, ny = dy / length;
        const dot = projectile.vx * nx + projectile.vy * ny;
        if (dot < 0) { projectile.vx -= 2 * dot * nx; projectile.vy -= 2 * dot * ny; }
        projectile.x = peg.x + nx * (radius + 0.05);
        projectile.y = peg.y + ny * (radius + 0.05);
        if (!peg.hit) {
          peg.hit = true;
          score += peg.color === 'orange' ? 100 : 10;
          lastEvent = peg.color === 'orange' ? 'target' : 'peg';
        }
        return peg;
      }
      return null;
    }
    function finishShot(reason) {
      projectile = null;
      pegs = pegs.filter(peg => !peg.hit);
      if (pegs.every(peg => peg.color !== 'orange')) { status = 'won'; lastEvent = 'win'; }
      else if (ballsLeft <= 0) { status = 'lost'; lastEvent = 'loss'; }
      else lastEvent = reason;
    }
    function tickOnce(dt) {
      elapsed += dt;
      bucketX += bucketDirection * bucketSpeed * dt;
      const minX = BUCKET_WIDTH / 2, maxX = WIDTH - BUCKET_WIDTH / 2;
      if (bucketX <= minX) { bucketX = minX; bucketDirection = 1; }
      if (bucketX >= maxX) { bucketX = maxX; bucketDirection = -1; }
      if (!projectile) return;
      shotElapsed += dt;
      projectile.vy += GRAVITY * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.x <= BALL_RADIUS) { projectile.x = BALL_RADIUS; projectile.vx = Math.abs(projectile.vx); }
      else if (projectile.x >= WIDTH - BALL_RADIUS) { projectile.x = WIDTH - BALL_RADIUS; projectile.vx = -Math.abs(projectile.vx); }
      collision();
      if (!projectile) return;
      if (projectile.y >= BUCKET_Y - BALL_RADIUS && projectile.y <= BUCKET_Y + 10) {
        if (Math.abs(projectile.x - bucketX) <= BUCKET_WIDTH / 2) {
          ballsLeft++;
          finishShot('catch');
        } else finishShot('drain');
      } else if (projectile.y > HEIGHT + BALL_RADIUS) finishShot('drain');
      else if (shotElapsed >= SHOT_MAX_SECONDS) finishShot('timeout');
    }
    function advance(delta) {
      if (!Number.isFinite(delta) || delta <= 0 || delta > 1 || status !== 'playing') return false;
      let remaining = delta;
      while (remaining > 0 && status === 'playing') {
        const dt = Math.min(STEP, remaining);
        tickOnce(dt); remaining -= dt;
      }
      return true;
    }
    return Object.freeze({
      view,
      setAim(value) {
        if (!Number.isFinite(value) || status !== 'playing' || projectile) return false;
        aim = Math.max(-ANGLE_LIMIT, Math.min(ANGLE_LIMIT, value)); return true;
      },
      fire(value = aim) {
        if (status !== 'playing' || projectile || ballsLeft <= 0 || !Number.isFinite(value)) return false;
        aim = Math.max(-ANGLE_LIMIT, Math.min(ANGLE_LIMIT, value));
        shotElapsed = 0;
        const radians = aim * Math.PI / 180;
        projectile = { x: WIDTH / 2, y: 42, vx: Math.sin(radians) * SPEED, vy: Math.cos(radians) * SPEED };
        ballsLeft--; shots++; lastEvent = 'shot'; return true;
      },
      tick: advance,
      restart() { reset(); return true; }
    });
  }
  return Object.freeze({ WIDTH, HEIGHT, SHOT_LIMIT, SHOT_MAX_SECONDS, ORANGE_TARGETS, BALL_RADIUS, PEG_RADIUS, BUCKET_WIDTH, BUCKET_Y, ANGLE_LIMIT,
    COLORS, MARKS, STAGES, stagePegs, createStage, create });
});
