/* Deterministic rules for Ranh Giới Mây, an original three-bridge garden campaign. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_RanhGioiMayModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const VERSION = 2;
  const PROGRESS_VERSION = 1;
  const STEP = 1 / 60;
  const FIELD = Object.freeze({ width: 920, playerSpawn: 132, rivalSpawn: 788, playerBaseEdge: 112, rivalBaseEdge: 808 });
  const STARTING_RESOURCES = 82;
  const RESOURCE_RATE = 16;
  const RESOURCE_CAP = 150;
  const BASE_HEALTH = 250;
  const TYPES = Object.freeze({
    shield: Object.freeze({ name: 'Mầm Khiên', cost: 28, health: 74, damage: 11, speed: 44, range: 22, cooldown: 0.72, shape: 'leaf' }),
    sling: Object.freeze({ name: 'Nỏ Hạt', cost: 50, health: 48, damage: 10, speed: 32, range: 78, cooldown: 0.96, shape: 'kite' }),
    beetle: Object.freeze({ name: 'Bọ Sỏi', cost: 68, health: 142, damage: 23, speed: 24, range: 26, cooldown: 1.08, shape: 'shell' })
  });
  // A small counter loop gives the three original roles a clear job without adding another action.
  const MATCHUP_DAMAGE = Object.freeze({
    sling: Object.freeze({ shield: 0.5, beetle: 3 }),
    beetle: Object.freeze({ shield: 3 })
  });
  const STAGES = Object.freeze([
    Object.freeze({
      id: 'cau-mam', name: 'Cầu Mầm', palette: 'dawn', baseHealth: 250,
      playerStart: 82, rivalStart: 82, playerRate: 16, rivalRate: 17,
      openingDelay: 1.15, botInterval: 2.6,
      botOrder: Object.freeze(['shield', 'sling', 'shield', 'beetle', 'sling', 'shield'])
    }),
    Object.freeze({
      id: 'cau-da', name: 'Cầu Đá', palette: 'mist', baseHealth: 265,
      playerStart: 120, rivalStart: 86, playerRate: 18, rivalRate: 17,
      openingDelay: 1.0, botInterval: 2.35,
      botOrder: Object.freeze(['shield', 'beetle', 'sling'])
    }),
    Object.freeze({
      id: 'cong-troi', name: 'Cổng Trời', palette: 'dusk', baseHealth: 285,
      playerStart: 82, rivalStart: 120, playerRate: 16, rivalRate: 28,
      openingDelay: 1.4, botInterval: 2.0,
      botOrder: Object.freeze(['beetle', 'beetle', 'beetle', 'beetle'])
    })
  ]);
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const copy = value => JSON.parse(JSON.stringify(value));

  function validProgress(raw) {
    if (!raw || raw.version !== PROGRESS_VERSION || !Number.isInteger(raw.unlockedStage) ||
        raw.unlockedStage < 0 || raw.unlockedStage >= STAGES.length || !Array.isArray(raw.bestTimes) ||
        raw.bestTimes.length !== STAGES.length || !raw.bestTimes.every(time => time === null || Number.isSafeInteger(time) && time > 0)) return false;
    return raw.bestTimes.every((time, index) => index < raw.unlockedStage
      ? Number.isSafeInteger(time) : index > raw.unlockedStage ? time === null
        : index === STAGES.length - 1 || time === null);
  }

  function create(options = {}) {
    const stageIndex = Number.isInteger(options.stageIndex) && options.stageIndex >= 0 && options.stageIndex < STAGES.length ? options.stageIndex : 0;
    const rawUnlocked = Number.isInteger(options.unlockedStage) && options.unlockedStage >= 0 && options.unlockedStage < STAGES.length
      ? options.unlockedStage : stageIndex;
    const unlockedStage = Math.max(stageIndex, rawUnlocked);
    const bestTimes = Array.isArray(options.bestTimes) && options.bestTimes.length === STAGES.length &&
      options.bestTimes.every(time => time === null || Number.isSafeInteger(time) && time > 0)
      ? options.bestTimes.slice() : Array(STAGES.length).fill(null);
    const stage = STAGES[stageIndex];
    const baseHealth = Number.isFinite(options.baseHealth) ? Math.max(1, options.baseHealth) : stage.baseHealth;
    const settings = { ai: options.ai !== false, baseHealth, customBaseHealth: Number.isFinite(options.baseHealth) };
    const state = {
      version: VERSION, stageIndex, stageId: stage.id, unlockedStage, bestTimes: bestTimes.slice(),
      tick: 0,
      elapsed: 0,
      status: 'playing',
      resources: { player: stage.playerStart, rival: stage.rivalStart },
      bases: { player: baseHealth, rival: baseHealth },
      maxBaseHealth: baseHealth,
      units: [],
      sequence: 0,
      botTimer: stage.openingDelay,
      botIndex: 0,
      effects: []
    };
    let accumulator = 0;
    const events = [];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });

    function finish(status) {
      state.status = status;
      if (status === 'won') {
        const time = Math.round(state.elapsed * 1000), best = state.bestTimes[state.stageIndex];
        state.bestTimes[state.stageIndex] = best === null ? time : Math.min(best, time);
        state.unlockedStage = Math.max(state.unlockedStage, Math.min(STAGES.length - 1, state.stageIndex + 1));
      }
      emit('finished', { status, stageIndex: state.stageIndex, unlockedStage: state.unlockedStage,
        elapsed: state.elapsed, bestTime: state.bestTimes[state.stageIndex] });
    }

    function deploy(type, side = 'player') {
      if (state.status !== 'playing' || !Object.prototype.hasOwnProperty.call(TYPES, type) || !['player', 'rival'].includes(side)) return false;
      const spec = TYPES[type];
      if (state.resources[side] + 1e-8 < spec.cost) {
        if (side === 'player') emit('unaffordable', { type, cost: spec.cost });
        return false;
      }
      state.resources[side] = Math.max(0, state.resources[side] - spec.cost);
      state.units.push({
        id: ++state.sequence, side, type,
        x: side === 'player' ? FIELD.playerSpawn : FIELD.rivalSpawn,
        hp: spec.health, maxHp: spec.health, cooldown: 0,
        hitFlash: 0
      });
      emit('deploy', { side, type, id: state.sequence });
      return true;
    }

    function botTurn() {
      if (!settings.ai) return;
      const stage = STAGES[state.stageIndex];
      const type = stage.botOrder[state.botIndex % stage.botOrder.length];
      if (deploy(type, 'rival')) state.botIndex++;
      state.botTimer = stage.botInterval;
    }

    function nearestFrontTarget(unit) {
      const direction = unit.side === 'player' ? 1 : -1;
      return state.units
        .filter(other => other.side !== unit.side && other.hp > 0)
        .map(other => ({ other, gap: (other.x - unit.x) * direction }))
        .filter(item => item.gap >= -1 && item.gap <= TYPES[unit.type].range)
        .sort((a, b) => a.gap - b.gap || a.other.id - b.other.id)[0]?.other || null;
    }

    function strike(unit, targetX, targetKind, targetId = null) {
      const spec = TYPES[unit.type];
      unit.cooldown = spec.cooldown;
      unit.hitFlash = 0.14;
      if (targetKind === 'unit') {
        const target = state.units.find(candidate => candidate.id === targetId && candidate.hp > 0);
        if (!target) return;
        const multiplier = MATCHUP_DAMAGE[unit.type]?.[target.type] ?? 1;
        const damage = spec.damage * multiplier;
        target.hp = Math.max(0, target.hp - damage);
        emit('hit-unit', { side: unit.side, type: unit.type, targetId, damage });
      } else {
        const targetSide = unit.side === 'player' ? 'rival' : 'player';
        state.bases[targetSide] = Math.max(0, state.bases[targetSide] - spec.damage);
        emit('hit-base', { side: unit.side, targetSide, damage: spec.damage });
      }
      state.effects.push({ x1: unit.x, x2: targetX, side: unit.side, ttl: 0.16 });
    }

    function step() {
      if (state.status !== 'playing') return;
      state.tick++;
      state.elapsed += STEP;
      const stage = STAGES[state.stageIndex];
      for (const side of ['player', 'rival']) {
        const rate = side === 'player' ? stage.playerRate : stage.rivalRate;
        state.resources[side] = Math.min(RESOURCE_CAP, state.resources[side] + rate * STEP);
      }

      state.botTimer -= STEP;
      if (state.botTimer <= 1e-9) botTurn();

      for (const effect of state.effects) effect.ttl -= STEP;
      state.effects = state.effects.filter(effect => effect.ttl > 0);

      for (const unit of state.units) {
        if (unit.hp <= 0) continue;
        unit.cooldown = Math.max(0, unit.cooldown - STEP);
        unit.hitFlash = Math.max(0, unit.hitFlash - STEP);
        const direction = unit.side === 'player' ? 1 : -1;
        const spec = TYPES[unit.type];
        const target = nearestFrontTarget(unit);
        if (target) {
          if (unit.cooldown <= 1e-9) strike(unit, target.x, 'unit', target.id);
          continue;
        }
        const edge = unit.side === 'player' ? FIELD.rivalBaseEdge : FIELD.playerBaseEdge;
        const distanceToBase = (edge - unit.x) * direction;
        if (distanceToBase <= spec.range + 2) {
          if (unit.cooldown <= 1e-9) strike(unit, edge, 'base');
          continue;
        }
        unit.x += direction * spec.speed * STEP;
      }

      for (const unit of state.units) {
        if (unit.hp <= 0) emit('unit-fell', { side: unit.side, type: unit.type, id: unit.id });
      }
      state.units = state.units.filter(unit => unit.hp > 0);
      if (state.bases.rival <= 0) {
        finish('won');
      } else if (state.bases.player <= 0) {
        finish('lost');
      }
    }

    function advance(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0 || state.status !== 'playing') return view();
      accumulator += Math.min(seconds, 0.25);
      while (accumulator + 1e-10 >= STEP && state.status === 'playing') {
        step();
        accumulator = Math.max(0, accumulator - STEP);
      }
      return view();
    }

    function drain() { return events.splice(0); }
    function view() {
      const stage = STAGES[state.stageIndex];
      return {
        ...copy(state),
        field: copy(FIELD),
        resourceCap: RESOURCE_CAP,
        stageName: stage.name,
        stageCount: STAGES.length,
        palette: stage.palette,
        units: state.units.map(unit => ({ ...copy(unit), name: TYPES[unit.type].name, cost: TYPES[unit.type].cost }))
      };
    }
    function progress() { return { version: PROGRESS_VERSION, unlockedStage: state.unlockedStage, bestTimes: state.bestTimes.slice() }; }
    function newStage(index) {
      return create({ stageIndex: index, unlockedStage: state.unlockedStage, bestTimes: state.bestTimes,
        ai: settings.ai, ...(settings.customBaseHealth ? { baseHealth: settings.baseHealth } : {}) });
    }
    function nextStage() {
      if (state.status !== 'won' || state.stageIndex >= state.unlockedStage || state.stageIndex + 1 >= STAGES.length) return null;
      return newStage(state.stageIndex + 1);
    }
    function selectStage(index) {
      if (state.status === 'playing' || !Number.isInteger(index) || index < 0 || index > state.unlockedStage || index >= STAGES.length) return null;
      return newStage(index);
    }
    function replay() { return state.status === 'playing' ? null : newStage(state.stageIndex); }
    const game = { advance, deploy, drain, view, progress, nextStage, selectStage, replay };
    return game;
  }

  return Object.freeze({ VERSION, PROGRESS_VERSION, STEP, FIELD, TYPES, STAGES, MATCHUP_DAMAGE, RESOURCE_CAP, BASE_HEALTH, validProgress, create });
});
