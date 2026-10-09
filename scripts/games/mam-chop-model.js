/* Mầm Chớp: an original three-stage garden campaign. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_MamChopModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const RULES = 'mam-chop-campaign-2', SAVE_VERSION = 2;
  const VIEW_W = 960, VIEW_H = 540, TICK_MS = 20;
  const PLAYER_W = 27, PLAYER_H = 40, G = 0.4, JUMP_V = -9.35;
  const CHARGE_TICKS = 36, JUMP_BUFFER_TICKS = 6, COYOTE_TICKS = 6, MAX_HEALTH = 4;
  const freezeRows = list => Object.freeze(list.map(row => Object.freeze({ ...row })));
  const STAGES = Object.freeze([
    Object.freeze({
      id: 'vuon-hoang', name: 'Vườn Hoang', palette: 'dusk', worldWidth: 2600, exitX: 2578,
      platforms: freezeRows([
        { x: 0, y: 468, w: 510, kind: 'ground' }, { x: 588, y: 468, w: 455, kind: 'ground' },
        { x: 1110, y: 468, w: 565, kind: 'ground' }, { x: 1740, y: 468, w: 860, kind: 'ground' },
        { x: 244, y: 394, w: 152, kind: 'ledge' }, { x: 718, y: 383, w: 184, kind: 'ledge' },
        { x: 988, y: 421, w: 134, kind: 'ledge' }, { x: 1272, y: 386, w: 205, kind: 'ledge' },
        { x: 1535, y: 354, w: 138, kind: 'ledge' }, { x: 1872, y: 393, w: 166, kind: 'ledge' },
        { x: 2182, y: 415, w: 154, kind: 'ledge' }
      ]),
      checkpoints: Object.freeze([0, 810, 1580]), hazards: freezeRows([]),
      enemies: freezeRows([
        { id: 'pebble-a', type: 'crawler', x: 348, floor: 468, min: 300, max: 465, dir: -1, hp: 1 },
        { id: 'pebble-b', type: 'crawler', x: 812, floor: 383, min: 734, max: 875, dir: 1, hp: 1 },
        { id: 'pebble-c', type: 'crawler', x: 1420, floor: 468, min: 1310, max: 1580, dir: -1, hp: 1 },
        { id: 'seed-sentry', type: 'sentry', x: 2262, floor: 415, hp: 3, shotIn: 48, warning: 0, dir: -1 }
      ])
    }),
    Object.freeze({
      id: 'muong-suong', name: 'Mương Sương', palette: 'mist', worldWidth: 2860, exitX: 2838,
      platforms: freezeRows([
        { x: 0, y: 468, w: 430, kind: 'ground' }, { x: 510, y: 468, w: 380, kind: 'ground' },
        { x: 940, y: 468, w: 430, kind: 'ground' }, { x: 1450, y: 468, w: 370, kind: 'ground' },
        { x: 1900, y: 468, w: 420, kind: 'ground' }, { x: 2390, y: 468, w: 470, kind: 'ground' },
        { x: 248, y: 402, w: 140, kind: 'ledge' }, { x: 642, y: 374, w: 142, kind: 'ledge' },
        { x: 1012, y: 414, w: 152, kind: 'ledge' }, { x: 1520, y: 386, w: 150, kind: 'ledge' },
        { x: 2015, y: 375, w: 155, kind: 'ledge' }, { x: 2504, y: 399, w: 162, kind: 'ledge' }
      ]),
      checkpoints: Object.freeze([0, 510, 1900]),
      hazards: freezeRows([
        { id: 'mist-vent-a', x: 708, y: 448, w: 48, h: 20, period: 180, activeTicks: 42, warningTicks: 30, offset: 28 },
        { id: 'mist-vent-b', x: 1588, y: 448, w: 52, h: 20, period: 180, activeTicks: 42, warningTicks: 30, offset: 88 },
        { id: 'mist-vent-c', x: 2510, y: 448, w: 52, h: 20, period: 180, activeTicks: 42, warningTicks: 30, offset: 132 }
      ]),
      enemies: freezeRows([
        { id: 'pebble-d', type: 'crawler', x: 625, floor: 468, min: 545, max: 840, dir: -1, hp: 1 },
        { id: 'pebble-e', type: 'crawler', x: 1130, floor: 468, min: 990, max: 1320, dir: 1, hp: 1 },
        { id: 'pebble-f', type: 'crawler', x: 1608, floor: 468, min: 1500, max: 1770, dir: -1, hp: 1 },
        { id: 'pebble-g', type: 'crawler', x: 2085, floor: 468, min: 1960, max: 2280, dir: 1, hp: 1 },
        { id: 'reed-sentry-a', type: 'sentry', x: 1048, floor: 414, hp: 3, shotIn: 72, warning: 0, dir: -1 },
        { id: 'reed-sentry-b', type: 'sentry', x: 2556, floor: 399, hp: 3, shotIn: 105, warning: 0, dir: 1 }
      ])
    }),
    Object.freeze({
      id: 'nha-kinh-vo', name: 'Nhà Kính Vỡ', palette: 'dawn', worldWidth: 3300, exitX: 3275,
      platforms: freezeRows([
        { x: 0, y: 468, w: 460, kind: 'ground' }, { x: 535, y: 468, w: 295, kind: 'ground' },
        { x: 920, y: 468, w: 360, kind: 'ground' }, { x: 1370, y: 468, w: 360, kind: 'ground' },
        { x: 1820, y: 468, w: 360, kind: 'ground' }, { x: 2280, y: 468, w: 340, kind: 'ground' },
        { x: 2710, y: 468, w: 590, kind: 'ground' }, { x: 202, y: 403, w: 136, kind: 'ledge' },
        { x: 1008, y: 397, w: 145, kind: 'ledge' }, { x: 1490, y: 364, w: 136, kind: 'ledge' },
        { x: 2025, y: 392, w: 145, kind: 'ledge' }, { x: 2415, y: 397, w: 136, kind: 'ledge' },
        { x: 2915, y: 392, w: 180, kind: 'ledge' }
      ]),
      checkpoints: Object.freeze([0, 920, 1820]),
      hazards: freezeRows([
        { id: 'glass-vent-a', x: 1000, y: 448, w: 52, h: 20, period: 170, activeTicks: 38, warningTicks: 32, offset: 18 },
        { id: 'glass-vent-b', x: 1992, y: 448, w: 54, h: 20, period: 170, activeTicks: 38, warningTicks: 32, offset: 86 }
      ]),
      enemies: freezeRows([
        { id: 'pebble-h', type: 'crawler', x: 385, floor: 468, min: 340, max: 438, dir: -1, hp: 1 },
        { id: 'pebble-i', type: 'crawler', x: 1112, floor: 468, min: 995, max: 1250, dir: 1, hp: 1 },
        { id: 'pebble-j', type: 'crawler', x: 1590, floor: 468, min: 1440, max: 1690, dir: -1, hp: 1 },
        { id: 'pebble-k', type: 'crawler', x: 2065, floor: 468, min: 1885, max: 2150, dir: 1, hp: 1 },
        { id: 'pebble-l', type: 'crawler', x: 2450, floor: 468, min: 2320, max: 2580, dir: -1, hp: 1 },
        { id: 'amber-guardian', type: 'guardian', x: 2988, floor: 468, hp: 6, attackAfter: 42, state: 'idle', warning: 0, openTicks: 0, restTicks: 0, dir: -1 }
      ])
    })
  ]);
  const WORLD_W = STAGES[0].worldWidth;
  const PLATFORMS = STAGES[0].platforms;
  const CHECKPOINTS = STAGES[0].checkpoints;

  const copy = value => JSON.parse(JSON.stringify(value));
  const finite = Number.isFinite;
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function stageAt(index) { return STAGES[index] || STAGES[0]; }
  function makeState(stageIndex, unlockedStage = 0, bestTicks = null) {
    const stage = stageAt(stageIndex);
    const best = Array.isArray(bestTicks) && bestTicks.length === STAGES.length ? bestTicks.slice() : Array(STAGES.length).fill(null);
    return {
      version: SAVE_VERSION, rules: RULES, stageIndex, stageId: stage.id,
      unlockedStage: Math.max(stageIndex, unlockedStage), bestTicks: best,
      tick: 0, remainder: 0, status: 'playing',
      player: { x: 66, y: 468 - PLAYER_H, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, face: 1, grounded: true, health: MAX_HEALTH, invuln: 0, checkpoint: 0, coyoteTicks: COYOTE_TICKS, jumpBufferTicks: 0 },
      input: { left: false, right: false, jump: false, fire: false, jumpEdge: false, chargeTicks: 0, fireShot: false },
      enemies: stage.enemies.map(e => ({ ...e,
        y: e.floor - (e.type === 'sentry' ? 46 : e.type === 'guardian' ? 72 : 28),
        w: e.type === 'sentry' ? 40 : e.type === 'guardian' ? 66 : 34,
        h: e.type === 'sentry' ? 46 : e.type === 'guardian' ? 72 : 28,
        maxHp: e.hp, alive: true, phase: 0, cooldown: 0, volleyCount: 0 })),
      shots: [], nextShot: 1, events: [], cameraX: 0, exitBlocked: false
    };
  }
  function create(startStage = 0, progress = {}) {
    const index = Number.isInteger(startStage) && startStage >= 0 && startStage < STAGES.length ? startStage : 0;
    const unlocked = Number.isInteger(progress.unlockedStage) && progress.unlockedStage >= 0 && progress.unlockedStage < STAGES.length
      ? Math.max(index, progress.unlockedStage) : index;
    return makeState(index, unlocked, progress.bestTicks);
  }

  function emit(s, kind, data = {}) { s.events.push({ kind, tick: s.tick, ...data }); }
  function clearInput(s) {
    Object.assign(s.input, { left: false, right: false, jump: false, fire: false,
        jumpEdge: false, chargeTicks: 0, fireShot: false });
    s.player.jumpBufferTicks = 0;
  }
  function cancelInputs(s) {
    if (!s) return false;
    clearInput(s);
    return true;
  }
  function shoot(s, kind) {
    const p = s.player, charged = kind === 'charged', w = charged ? 22 : 11;
    const x = p.face > 0 ? p.x + p.w + 2 : p.x - w - 2;
    s.shots.push({ id: s.nextShot++, team: 'player', kind, x, y: p.y + 15, w, h: charged ? 13 : 8, vx: p.face * (charged ? 7.1 : 8.1), damage: charged ? 2 : 1, life: 90 });
    emit(s, charged ? 'charge-shot' : 'seed-shot');
  }
  function setButton(s, name, down) {
    if (!s || s.status !== 'playing' || !['left', 'right', 'jump', 'fire'].includes(name)) return false;
    const wasDown = s.input[name];
    s.input[name] = Boolean(down);
    if (name === 'jump' && down && !wasDown) s.input.jumpEdge = true;
    if (name === 'fire' && down && !wasDown) { s.input.chargeTicks = 0; s.input.fireShot = false; }
    if (name === 'fire' && !down && wasDown) {
      if (!s.input.fireShot) shoot(s, s.input.chargeTicks >= CHARGE_TICKS ? 'charged' : 'normal');
      s.input.chargeTicks = 0; s.input.fireShot = false;
    }
    return true;
  }
  function landPlayer(s, oldBottom) {
    const p = s.player;
    for (const plat of stageAt(s.stageIndex).platforms) {
      if (p.vy >= 0 && oldBottom <= plat.y && p.y + p.h >= plat.y && p.x + p.w > plat.x && p.x < plat.x + plat.w) {
        p.y = plat.y - p.h; p.vy = 0; p.grounded = true; p.coyoteTicks = COYOTE_TICKS; return;
      }
    }
    p.grounded = false;
  }
  function hurt(s, sourceX) {
    const p = s.player;
    if (p.invuln > 0 || s.status !== 'playing') return false;
    p.health = Math.max(0, p.health - 1); p.invuln = 74;
    p.jumpBufferTicks = 0; p.coyoteTicks = 0;
    p.vx = sourceX <= p.x + p.w / 2 ? 3.8 : -3.8; p.vy = -3.8; p.grounded = false;
    emit(s, p.health === 0 ? 'player-out' : 'player-hit', { health: p.health });
    if (p.health === 0) {
      s.status = 'lost'; clearInput(s);
    }
    return true;
  }
  function respawn(s) {
    const p = s.player;
    p.health = Math.max(0, p.health - 1);
    if (!p.health) { s.status = 'lost'; clearInput(s); emit(s, 'player-out', { health: 0, fall: true }); return; }
    const stage = stageAt(s.stageIndex), base = stage.checkpoints[Math.min(p.checkpoint, stage.checkpoints.length - 1)];
    const floor = stage.platforms.find(v => v.kind === 'ground' && base + 42 >= v.x && base + 42 < v.x + v.w);
    p.x = base + 42; p.y = (floor ? floor.y : 468) - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.invuln = 90;
    p.coyoteTicks = COYOTE_TICKS; p.jumpBufferTicks = 0;
    s.input.jumpEdge = false; s.input.chargeTicks = 0; s.input.fireShot = false;
    emit(s, 'checkpoint-respawn', { checkpoint: p.checkpoint });
  }
  function resetStage(s, index) {
    const next = makeState(index, s.unlockedStage, s.bestTicks);
    Object.keys(s).forEach(key => delete s[key]);
    Object.assign(s, next);
  }
  function selectStage(s, index) {
    if (!s || !Number.isInteger(index) || index < 0 || index > s.unlockedStage || index >= STAGES.length) return false;
    resetStage(s, index); emit(s, 'stage-selected', { stageIndex: index }); return true;
  }
  function restart(s) {
    if (!s || !['playing', 'won', 'lost'].includes(s.status)) return false;
    resetStage(s, s.stageIndex); return true;
  }
  function nextStage(s) {
    if (!s || s.status !== 'won' || s.stageIndex >= s.unlockedStage || s.stageIndex + 1 >= STAGES.length) return false;
    resetStage(s, s.stageIndex + 1); emit(s, 'stage-selected', { stageIndex: s.stageIndex }); return true;
  }
  function finishStage(s) {
    s.status = 'won'; s.input.left = s.input.right = s.input.jump = s.input.fire = false;
    s.input.jumpEdge = false; s.input.chargeTicks = 0; s.input.fireShot = false;
    s.bestTicks[s.stageIndex] = s.bestTicks[s.stageIndex] === null ? s.tick : Math.min(s.bestTicks[s.stageIndex], s.tick);
    s.unlockedStage = Math.min(STAGES.length - 1, Math.max(s.unlockedStage, s.stageIndex + 1));
    s.exitBlocked = false; emit(s, 'stage-clear', { stageIndex: s.stageIndex });
  }
  function stageHazards(s) {
    const out = [];
    for (const hazard of stageAt(s.stageIndex).hazards) {
      const phase = (s.tick + hazard.offset) % hazard.period;
      const state = phase < hazard.activeTicks ? 'active'
        : phase >= hazard.period - hazard.warningTicks ? 'warning' : 'safe';
      out.push({ ...hazard, phase, state });
    }
    return out;
  }
  function guardianVolley(s, enemy) {
    const direction = s.player.x + s.player.w / 2 < enemy.x + enemy.w / 2 ? -1 : 1;
    enemy.dir = direction;
    for (const item of [{ y: 12, vy: -0.85 }, { y: 28, vy: 0 }, { y: 44, vy: 0.85 }]) {
      s.shots.push({ id: s.nextShot++, team: 'enemy', kind: 'glass-seed',
        x: enemy.x + enemy.w / 2 - 6, y: enemy.y + item.y, w: 13, h: 12,
        vx: direction * 3, vy: item.vy, damage: 1, life: 180 });
    }
    enemy.state = 'open'; enemy.openTicks = 105;
    enemy.volleyCount++; emit(s, 'guardian-open', { enemy: enemy.id, ticks: enemy.openTicks });
  }
  function updateGuardian(s, enemy) {
    if (enemy.state === 'idle') {
      enemy.attackAfter--;
      const near = Math.abs(s.player.x + s.player.w / 2 - (enemy.x + enemy.w / 2)) <= 710;
      if (near && enemy.attackAfter <= 0) {
        enemy.state = 'warning'; enemy.warning = 44;
        emit(s, 'guardian-warning', { enemy: enemy.id, ticks: enemy.warning });
      }
    } else if (enemy.state === 'warning') {
      enemy.warning--;
      if (enemy.warning <= 0) guardianVolley(s, enemy);
    } else if (enemy.state === 'open') {
      enemy.openTicks--;
      if (enemy.openTicks <= 0) { enemy.state = 'rest'; enemy.restTicks = 82; emit(s, 'guardian-guard', { enemy: enemy.id }); }
    } else if (enemy.state === 'rest') {
      enemy.restTicks--;
      if (enemy.restTicks <= 0) { enemy.state = 'idle'; enemy.attackAfter = 138; }
    }
  }
  function updateEnemies(s) {
    const p = s.player;
    for (const enemy of s.enemies) {
      if (!enemy.alive) continue;
      enemy.phase++;
      if (enemy.type === 'crawler') {
        enemy.x += enemy.dir * 1.05;
        if (enemy.x <= enemy.min) { enemy.x = enemy.min; enemy.dir = 1; }
        if (enemy.x >= enemy.max) { enemy.x = enemy.max; enemy.dir = -1; }
        enemy.y = enemy.floor - enemy.h;
      } else if (enemy.type === 'sentry') {
        enemy.y = enemy.floor - enemy.h + Math.sin(enemy.phase / 18) * 2;
        if (enemy.warning > 0) {
          enemy.warning--;
          if (enemy.warning === 0) {
            enemy.dir = p.x + p.w / 2 < enemy.x + enemy.w / 2 ? -1 : 1;
            s.shots.push({ id: s.nextShot++, team: 'enemy', kind: 'thorn', x: enemy.x + enemy.w / 2 - 6,
              y: enemy.y + 22, w: 12, h: 12, vx: enemy.dir * 3.2, vy: 0, damage: 1, life: 190 });
            emit(s, 'enemy-shot', { enemy: enemy.id });
          }
        } else {
          enemy.shotIn--;
          const close = Math.abs((p.x + p.w / 2) - (enemy.x + enemy.w / 2)) < 390;
          const aligned = Math.abs((p.y + p.h / 2) - (enemy.y + enemy.h / 2)) < 116;
          if (enemy.shotIn <= 0 && close && aligned) { enemy.warning = 30; enemy.shotIn = 132; emit(s, 'enemy-warning', { enemy: enemy.id, ticks: 30 }); }
          else if (enemy.shotIn <= 0) enemy.shotIn = 42;
        }
      } else if (enemy.type === 'guardian') updateGuardian(s, enemy);
      if ((enemy.type === 'crawler' || enemy.type === 'guardian') && overlap(p, enemy)) hurt(s, enemy.x + enemy.w / 2);
    }
  }
  function tick(s) {
    if (!s || s.status !== 'playing') return [];
    s.events = []; s.tick++;
    const stage = stageAt(s.stageIndex), p = s.player, i = s.input;
    if (p.invuln > 0) p.invuln--;

    const wasGrounded = p.grounded;
    p.coyoteTicks = wasGrounded ? COYOTE_TICKS : Math.max(0, p.coyoteTicks - 1);
    if (i.jumpEdge) p.jumpBufferTicks = JUMP_BUFFER_TICKS;
    else p.jumpBufferTicks = Math.max(0, p.jumpBufferTicks - 1);
    const direction = Number(i.right) - Number(i.left);
    if (direction) p.face = direction;
    p.vx = direction * 3.35;
    const oldBottom = p.y + p.h;
    p.x = Math.max(0, Math.min(stage.worldWidth - p.w, p.x + p.vx));
    if (p.jumpBufferTicks > 0 && p.coyoteTicks > 0) {
      p.vy = JUMP_V; p.grounded = false; p.coyoteTicks = 0; p.jumpBufferTicks = 0; emit(s, 'jump');
    }
    i.jumpEdge = false;
    if (i.fire && !i.fireShot) {
      i.chargeTicks++;
      if (i.chargeTicks >= CHARGE_TICKS) { shoot(s, 'charged'); i.fireShot = true; }
    }
    p.vy = Math.min(12, p.vy + G); p.y += p.vy;
    landPlayer(s, oldBottom);

    while (p.checkpoint + 1 < stage.checkpoints.length && p.x >= stage.checkpoints[p.checkpoint + 1]) p.checkpoint++;
    if (p.y > VIEW_H + 44) respawn(s);
    updateEnemies(s);

    const hazards = stageHazards(s);
    for (let n = 0; n < stage.hazards.length; n++) {
      const authored = stage.hazards[n], live = hazards[n];
      if (live.state === 'warning' && live.phase === authored.period - authored.warningTicks) {
        emit(s, 'hazard-warning', { hazard: live.id, ticks: live.warningTicks });
      }
      if (live.state === 'active' && overlap(p, live)) hurt(s, live.x + live.w / 2, live.y);
    }

    for (const shot of s.shots) { shot.x += shot.vx; shot.y += shot.vy || 0; shot.life--; }
    for (const shot of s.shots.filter(q => q.team === 'player' && q.life > 0 && q.x > -30 && q.x < stage.worldWidth + 30)) {
      const target = s.enemies.find(e => e.alive && overlap(shot, e) && (e.type !== 'guardian' || e.state === 'open'));
      if (target) {
        target.hp -= shot.damage; shot.life = 0;
        if (target.hp <= 0) {
          target.alive = false;
          emit(s, target.type === 'guardian' ? 'guardian-defeated' : 'enemy-cleared', { enemy: target.id });
        }
      }
    }
    for (const shot of s.shots.filter(q => q.team === 'enemy' && q.life > 0)) {
      if (overlap(shot, p)) { shot.life = 0; hurt(s, shot.x + shot.w / 2, shot.y + shot.h / 2); }
    }
    s.shots = s.shots.filter(q => q.life > 0 && q.x > -36 && q.x < stage.worldWidth + 36);
    s.cameraX = Math.max(0, Math.min(stage.worldWidth - VIEW_W, p.x + p.w / 2 - VIEW_W * 0.42));

    if (p.x + p.w >= stage.exitX && s.status === 'playing') {
      const guardian = s.enemies.find(e => e.type === 'guardian' && e.alive);
      if (guardian) {
        p.x = Math.min(p.x, stage.exitX - p.w - 70); p.vx = 0;
        if (!s.exitBlocked) emit(s, 'exit-blocked', { enemy: guardian.id });
        s.exitBlocked = true;
      } else finishStage(s);
    } else if (p.x + p.w < stage.exitX - 100) s.exitBlocked = false;
    return copy(s.events);
  }
  function stepTicks(s, count = 1) {
    const all = [];
    for (let n = 0; n < count && s.status === 'playing'; n++) all.push(...tick(s));
    return all;
  }
  function advance(s, elapsedMs) {
    if (!s || !Number.isFinite(elapsedMs) || elapsedMs < 0) return [];
    s.remainder = Math.min(180, s.remainder + elapsedMs);
    const count = Math.floor(s.remainder / TICK_MS);
    s.remainder -= count * TICK_MS;
    return stepTicks(s, Math.min(9, count));
  }
  function view(s) {
    const stage = stageAt(s.stageIndex), hazards = stageHazards(s);
    return {
      rules: s.rules, tick: s.tick, stageIndex: s.stageIndex, stageId: s.stageId, stageName: stage.name,
      stageCount: STAGES.length, unlockedStage: s.unlockedStage, bestTicks: s.bestTicks.slice(),
      status: s.status, player: copy(s.player), enemies: copy(s.enemies), hazards,
      shots: copy(s.shots), cameraX: s.cameraX, worldWidth: stage.worldWidth, exitX: stage.exitX,
      platforms: copy(stage.platforms), checkpoints: stage.checkpoints.slice(), palette: stage.palette,
      charge: s.input.chargeTicks, charging: s.input.fire && !s.input.fireShot,
      stageProgress: Math.max(0, Math.min(1, s.player.x / stage.exitX)),
      enemyCount: s.enemies.filter(e => e.alive).length,
      guardian: s.enemies.find(e => e.type === 'guardian' && e.alive) || null
    };
  }
  function validSnapshot(raw) {
    try {
      if (!raw || raw.version !== SAVE_VERSION || raw.rules !== RULES || !raw.state) return false;
      const s = raw.state, stage = stageAt(s.stageIndex);
      if (!Number.isInteger(s.stageIndex) || s.stageIndex < 0 || s.stageIndex >= STAGES.length ||
          !Number.isInteger(s.unlockedStage) || s.unlockedStage < s.stageIndex || s.unlockedStage >= STAGES.length ||
          s.stageId !== stage.id || !['playing', 'won', 'lost'].includes(s.status) ||
          !Number.isSafeInteger(s.tick) || s.tick < 0 || !finite(s.remainder) || s.remainder < 0 || s.remainder >= TICK_MS ||
          !s.player || !finite(s.player.x) || s.player.x < 0 || s.player.x > stage.worldWidth - PLAYER_W ||
          !finite(s.player.y) || s.player.y < -200 || s.player.y > VIEW_H + 250 ||
          !finite(s.player.vx) || !finite(s.player.vy) || !Number.isInteger(s.player.health) || s.player.health < 0 || s.player.health > MAX_HEALTH ||
          !Number.isInteger(s.player.checkpoint) || s.player.checkpoint < 0 || s.player.checkpoint >= stage.checkpoints.length ||
          ![-1, 1].includes(s.player.face) || typeof s.player.grounded !== 'boolean' ||
          s.player.w !== PLAYER_W || s.player.h !== PLAYER_H || !Number.isInteger(s.player.invuln) || s.player.invuln < 0 || s.player.invuln > 90 ||
          (s.player.coyoteTicks !== undefined && (!Number.isInteger(s.player.coyoteTicks) || s.player.coyoteTicks < 0 || s.player.coyoteTicks > COYOTE_TICKS)) ||
          (s.player.jumpBufferTicks !== undefined && (!Number.isInteger(s.player.jumpBufferTicks) || s.player.jumpBufferTicks < 0 || s.player.jumpBufferTicks > JUMP_BUFFER_TICKS)) ||
          s.status === 'playing' && s.player.health === 0 || s.status === 'lost' && s.player.health !== 0 ||
          !s.input || typeof s.input !== 'object' || Array.isArray(s.input) ||
          !Array.isArray(s.enemies) || s.enemies.length !== stage.enemies.length || !Array.isArray(s.shots) || s.shots.length > 48 ||
          !Number.isSafeInteger(s.nextShot) || s.nextShot < 1 || !Array.isArray(raw.bestTicks) || raw.bestTicks.length !== STAGES.length ||
          raw.bestTicks.some(v => v !== null && (!Number.isSafeInteger(v) || v < 0)) ||
          JSON.stringify(s.bestTicks) !== JSON.stringify(raw.bestTicks)) return false;
      for (let i = 0; i < s.enemies.length; i++) {
        const e = s.enemies[i], seed = stage.enemies[i];
        if (!e || e.id !== seed.id || e.type !== seed.type || typeof e.alive !== 'boolean' ||
            !finite(e.x) || !finite(e.y) || !finite(e.hp) || e.hp < 0 || e.hp > seed.hp || e.maxHp !== seed.hp ||
            !finite(e.phase) || e.phase < 0 || (e.type === 'guardian' && !['idle', 'warning', 'open', 'rest'].includes(e.state))) return false;
      }
      for (const shot of s.shots) {
        if (!shot || !Number.isSafeInteger(shot.id) || !['player', 'enemy'].includes(shot.team) ||
            !finite(shot.x) || !finite(shot.y) || !finite(shot.vx) || (shot.vy !== undefined && !finite(shot.vy)) ||
            !finite(shot.w) || !finite(shot.h) || !Number.isInteger(shot.life) || shot.life < 0 || shot.life > 190 ||
            !Number.isInteger(shot.damage) || shot.damage < 1 || shot.damage > 2) return false;
      }
      return true;
    } catch (_) { return false; }
  }
  function serialize(s) { return { version: SAVE_VERSION, rules: RULES, bestTicks: s.bestTicks.slice(), state: copy(s) }; }
  function restore(raw) {
    if (!validSnapshot(raw)) return null;
    const s = copy(raw.state);
    s.player.coyoteTicks = s.player.grounded ? COYOTE_TICKS : 0;
    s.player.jumpBufferTicks = 0;
    s.input = { left: false, right: false, jump: false, fire: false, jumpEdge: false, chargeTicks: 0, fireShot: false };
    s.events = []; s.remainder = 0;
    return s;
  }
  return Object.freeze({
    RULES, SAVE_VERSION, VIEW_W, VIEW_H, WORLD_W, TICK_MS, CHARGE_TICKS, JUMP_BUFFER_TICKS, COYOTE_TICKS, MAX_HEALTH,
    STAGES, PLATFORMS, CHECKPOINTS, create, restore, serialize, validSnapshot,
    selectStage, restart, nextStage, view, setButton, cancelInputs, tick, stepTicks, advance, hurt
  });
});
