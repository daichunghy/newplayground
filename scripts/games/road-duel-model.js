/* Deterministic rules for the original Đua Gió road race. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_RoadDuelModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const VERSION = 2;
  const PROGRESS_VERSION = 2;
  const STEP = 1 / 60;
  const MAX_SPEED = 33;
  const MIN_SPEED = 12;
  const MAX_LANE = 0.44;
  const MAX_CRASHES = 3;
  const STAGES = Object.freeze([
    Object.freeze({
      id: 'bai-cat', name: 'Bãi Cát', palette: 'dune', curve: 1, trackLength: 720,
      hazards: Object.freeze([
        { id: 'van-1', at: 92, lane: -0.30, kind: 'van' },
        { id: 'barrier-1', at: 205, lane: 0.30, kind: 'barrier' },
        { id: 'car-1', at: 326, lane: 0, kind: 'car' },
        { id: 'van-2', at: 448, lane: -0.30, kind: 'van' },
        { id: 'barrier-2', at: 574, lane: 0.30, kind: 'barrier' }
      ]),
      riders: Object.freeze([
        { id: 1, lane: -0.30, distance: 10, pace: 22.1, color: '#f19a65' },
        { id: 2, lane: 0.30, distance: 22, pace: 23.3, color: '#89c8cc' },
        { id: 3, lane: 0.30, distance: 34, pace: 24.1, color: '#d8bc70' }
      ])
    }),
    Object.freeze({
      id: 'deo-may', name: 'Đèo Mây', palette: 'mist', curve: 1.25, trackLength: 780,
      hazards: Object.freeze([
        { id: 'cloud-van-1', at: 96, lane: 0.30, kind: 'van' },
        { id: 'cloud-barrier-1', at: 204, lane: -0.30, kind: 'barrier' },
        { id: 'cloud-car-1', at: 314, lane: 0, kind: 'car' },
        { id: 'cloud-van-2', at: 414, lane: 0.30, kind: 'van' },
        { id: 'cloud-car-2', at: 516, lane: -0.30, kind: 'car' },
        { id: 'cloud-barrier-2', at: 626, lane: 0, kind: 'barrier' },
        { id: 'cloud-van-3', at: 716, lane: -0.30, kind: 'van' }
      ]),
      riders: Object.freeze([
        { id: 1, lane: -0.30, distance: 12, pace: 28.4, color: '#f2aa77' },
        { id: 2, lane: 0.30, distance: 24, pace: 29.3, color: '#8bcbd0' },
        { id: 3, lane: 0, distance: 36, pace: 30.2, color: '#e3c579' }
      ])
    }),
    Object.freeze({
      id: 'doc-do', name: 'Dốc Đỏ', palette: 'ember', curve: 1.5, trackLength: 840,
      hazards: Object.freeze([
        { id: 'ridge-van-1', at: 88, lane: 0, kind: 'van' },
        { id: 'ridge-barrier-1', at: 184, lane: -0.30, kind: 'barrier' },
        { id: 'ridge-car-1', at: 282, lane: 0.30, kind: 'car' },
        { id: 'ridge-barrier-2', at: 378, lane: 0, kind: 'barrier' },
        { id: 'ridge-van-2', at: 474, lane: -0.30, kind: 'van' },
        { id: 'ridge-barrier-3', at: 568, lane: 0.30, kind: 'barrier' },
        { id: 'ridge-car-2', at: 662, lane: 0, kind: 'car' },
        { id: 'ridge-van-3', at: 756, lane: -0.30, kind: 'van' }
      ]),
      riders: Object.freeze([
        { id: 1, lane: -0.30, distance: 10, pace: 29.6, color: '#f5a375' },
        { id: 2, lane: 0.30, distance: 22, pace: 30.1, color: '#92c9c6' },
        { id: 3, lane: 0, distance: 34, pace: 30.6, color: '#e0bd72' }
      ])
    })
  ]);
  const TRACK_LENGTH = STAGES[0].trackLength;
  const HAZARDS = STAGES[0].hazards;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const copy = value => JSON.parse(JSON.stringify(value));

  function validProgress(raw) {
    if (!raw || raw.version !== PROGRESS_VERSION || !Number.isInteger(raw.unlockedStage) ||
        raw.unlockedStage < 0 || raw.unlockedStage >= STAGES.length || !Array.isArray(raw.bestPlaces) ||
        raw.bestPlaces.length !== STAGES.length || !raw.bestPlaces.every(place => place === null ||
          Number.isInteger(place) && place >= 1 && place <= 4) || !Array.isArray(raw.bestTimes) ||
        raw.bestTimes.length !== STAGES.length || !raw.bestTimes.every(time => time === null ||
          Number.isSafeInteger(time) && time > 0)) return false;
    return raw.bestPlaces.every((place, index) => index < raw.unlockedStage
      ? Number.isInteger(place) && place <= 3 && Number.isSafeInteger(raw.bestTimes[index])
      : index > raw.unlockedStage ? place === null && raw.bestTimes[index] === null
        : (place === null || index === STAGES.length - 1 || place === 4) &&
          (place === null ? raw.bestTimes[index] === null : raw.bestTimes[index] === null || Number.isSafeInteger(raw.bestTimes[index])));
  }

  function makeState(stageIndex, unlockedStage, bestPlaces, bestTimes) {
    const stage = STAGES[stageIndex];
    return {
      version: VERSION,
      stageIndex,
      stageId: stage.id,
      unlockedStage,
      bestPlaces: bestPlaces.slice(),
      bestTimes: bestTimes.slice(),
      tick: 0,
      elapsed: 0,
      distance: 0,
      speed: 18,
      lane: 0,
      crashes: 0,
      hits: 0,
      attacks: 0,
      attackCooldown: 0,
      impactSlow: 0,
      status: 'playing',
      place: null,
      playerFinishAt: null,
      finishTimeMs: null,
      finishers: [],
      rivals: stage.riders.map(r => ({ ...r, stun: 0, finishAt: null })),
      hazards: stage.hazards.map(h => ({ ...h, hit: false }))
    };
  }

  function create(startStage = 0, progress = {}) {
    const stageIndex = Number.isInteger(startStage) && startStage >= 0 && startStage < STAGES.length ? startStage : 0;
    const rawUnlocked = Number.isInteger(progress.unlockedStage) && progress.unlockedStage >= 0 && progress.unlockedStage < STAGES.length
      ? progress.unlockedStage : stageIndex;
    const unlockedStage = Math.max(stageIndex, rawUnlocked);
    const bestPlaces = Array.isArray(progress.bestPlaces) && progress.bestPlaces.length === STAGES.length &&
      progress.bestPlaces.every(place => place === null || Number.isInteger(place) && place >= 1 && place <= 4)
      ? progress.bestPlaces.slice() : Array(STAGES.length).fill(null);
    const bestTimes = Array.isArray(progress.bestTimes) && progress.bestTimes.length === STAGES.length &&
      progress.bestTimes.every(time => time === null || Number.isSafeInteger(time) && time > 0)
      ? progress.bestTimes.slice() : Array(STAGES.length).fill(null);
    const state = makeState(stageIndex, unlockedStage, bestPlaces, bestTimes);
    let accumulator = 0;
    const events = [];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });

    function reset(index) {
      const next = makeState(index, state.unlockedStage, state.bestPlaces, state.bestTimes);
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, next);
      accumulator = 0; events.length = 0;
    }

    function recordBestPlace(place) {
      const current = state.bestPlaces[state.stageIndex];
      state.bestPlaces[state.stageIndex] = current === null ? place : Math.min(current, place);
    }

    function finish(at) {
      const stage = STAGES[state.stageIndex];
      state.playerFinishAt = at;
      state.finishTimeMs = Math.round(at * 1000);
      state.finishers.push({ id: 'player', at });
      state.finishers.sort((a, b) => a.at - b.at || (a.id === 'player' ? -1 : 1));
      state.place = state.finishers.findIndex(f => f.id === 'player') + 1;
      state.status = state.place <= 3 ? 'won' : 'lost';
      recordBestPlace(state.place);
      const bestTime = state.bestTimes[state.stageIndex];
      state.bestTimes[state.stageIndex] = bestTime === null ? state.finishTimeMs : Math.min(bestTime, state.finishTimeMs);
      if (state.status === 'won') state.unlockedStage = Math.max(state.unlockedStage, Math.min(STAGES.length - 1, state.stageIndex + 1));
      emit('finish', { status: state.status, place: state.place, distance: stage.trackLength,
        stageIndex: state.stageIndex, unlockedStage: state.unlockedStage });
    }

    function step(controls) {
      if (state.status !== 'playing') return;
      const stage = STAGES[state.stageIndex];
      const beforeElapsed = state.elapsed;
      const beforeDistance = state.distance;
      const dt = STEP;
      state.tick++;
      state.elapsed += dt;
      state.attackCooldown = Math.max(0, state.attackCooldown - dt);
      state.impactSlow = Math.max(0, state.impactSlow - dt);

      for (const rider of state.rivals) {
        if (rider.finishAt !== null) continue;
        const old = rider.distance;
        rider.stun = Math.max(0, rider.stun - dt);
        const pace = rider.stun > 0 ? rider.pace * 0.22 : rider.pace;
        rider.distance = Math.min(stage.trackLength, rider.distance + pace * dt);
        if (old < stage.trackLength && rider.distance >= stage.trackLength) {
          const fraction = (stage.trackLength - old) / Math.max(0.0001, rider.distance - old);
          rider.finishAt = beforeElapsed + dt * clamp(fraction, 0, 1);
          state.finishers.push({ id: rider.id, at: rider.finishAt });
          state.finishers.sort((a, b) => a.at - b.at || String(a.id).localeCompare(String(b.id)));
          emit('rival-finish', { id: rider.id });
        }
      }

      if (controls.brake) state.speed -= 16 * dt;
      else if (controls.accelerate) state.speed += 8.5 * dt;
      else state.speed -= 1.7 * dt;
      if (state.impactSlow > 0) state.speed -= 4 * dt;
      state.speed = clamp(state.speed, MIN_SPEED, MAX_SPEED);

      const steer = clamp(Number(controls.steer) || 0, -1, 1);
      state.lane = clamp(state.lane + steer * 1.35 * dt, -MAX_LANE, MAX_LANE);
      state.distance += state.speed * dt;

      for (const hazard of state.hazards) {
        if (hazard.hit || beforeDistance >= hazard.at || state.distance < hazard.at) continue;
        hazard.hit = true;
        if (Math.abs(state.lane - hazard.lane) <= 0.14) {
          state.crashes++;
          state.speed = Math.max(MIN_SPEED, state.speed * 0.58);
          state.impactSlow = 0.85;
          emit('crash', { id: hazard.id, crashes: state.crashes, remaining: MAX_CRASHES - state.crashes });
          if (state.crashes >= MAX_CRASHES) {
            state.status = 'lost';
            state.place = 4;
            recordBestPlace(4);
            emit('wrecked', { place: 4 });
            return;
          }
        } else emit('avoided', { id: hazard.id });
      }

      if (beforeDistance < stage.trackLength && state.distance >= stage.trackLength) {
        const fraction = (stage.trackLength - beforeDistance) / Math.max(0.0001, state.distance - beforeDistance);
        const at = beforeElapsed + dt * clamp(fraction, 0, 1);
        finish(at);
        return;
      }
      if (state.rivals.every(r => r.finishAt !== null)) {
        state.status = 'lost';
        state.place = 4;
        recordBestPlace(4);
        emit('last-place', { place: 4 });
      }
    }

    function advance(seconds, controls = {}) {
      if (!Number.isFinite(seconds) || seconds <= 0 || state.status !== 'playing') return view();
      accumulator += Math.min(seconds, 0.25);
      const input = {
        accelerate: controls.accelerate === true,
        brake: controls.brake === true,
        steer: controls.steer
      };
      while (accumulator + 1e-10 >= STEP && state.status === 'playing') {
        step(input);
        accumulator = Math.max(0, accumulator - STEP);
      }
      return view();
    }

    function act(action) {
      if (state.status !== 'playing' || action !== 'attack' || state.attackCooldown > 0) return false;
      state.attacks++;
      state.attackCooldown = 0.72;
      const target = state.rivals
        .filter(r => r.finishAt === null && r.stun <= 0 && Math.abs(r.distance - state.distance) <= 24 && Math.abs(r.lane - state.lane) <= 0.34)
        .sort((a, b) => Math.abs(a.distance - state.distance) - Math.abs(b.distance - state.distance) || a.id - b.id)[0];
      if (target) {
        target.stun = 1.45;
        state.hits++;
        emit('hit', { id: target.id, stun: target.stun });
      } else emit('swing', { hit: false });
      return true;
    }

    function drain() { return events.splice(0); }
    function view() {
      const stage = STAGES[state.stageIndex];
      const rivalsAhead = state.rivals.filter(rider => rider.finishAt === null
        ? rider.distance > state.distance : rider.finishAt < state.elapsed).length;
      return {
        ...copy(state),
        stageName: stage.name,
        stageCount: STAGES.length,
        palette: stage.palette,
        curve: stage.curve,
        trackLength: stage.trackLength,
        progress: clamp(state.distance / stage.trackLength, 0, 1),
        position: state.status === 'playing' ? rivalsAhead + 1 : state.place || 4,
        maxSpeed: MAX_SPEED,
        maxCrashes: MAX_CRASHES,
        hazardsAhead: state.hazards.filter(h => !h.hit && h.at >= state.distance).map(h => ({ ...h, ahead: h.at - state.distance })),
        attackReady: state.attackCooldown <= 0
      };
    }
    function snapshotProgress() { return { version: PROGRESS_VERSION, unlockedStage: state.unlockedStage,
      bestPlaces: state.bestPlaces.slice(), bestTimes: state.bestTimes.slice() }; }
    function selectStage(index) {
      if (state.status === 'playing' || !Number.isInteger(index) || index < 0 || index > state.unlockedStage || index >= STAGES.length) return false;
      reset(index); emit('stage-selected', { stageIndex: index }); return true;
    }
    function nextStage() {
      if (state.status !== 'won' || state.stageIndex >= state.unlockedStage || state.stageIndex + 1 >= STAGES.length) return false;
      reset(state.stageIndex + 1); emit('stage-selected', { stageIndex: state.stageIndex }); return true;
    }
    function replay() {
      reset(state.stageIndex); return game;
    }
    const game = { advance, act, drain, view, progress: snapshotProgress, selectStage, nextStage, replay };
    return game;
  }

  return Object.freeze({ VERSION, PROGRESS_VERSION, TRACK_LENGTH, STEP, MAX_SPEED, MAX_CRASHES,
    STAGES, HAZARDS: copy(HAZARDS), validProgress, create });
});
