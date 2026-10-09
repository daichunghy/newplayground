/* Original three-lane delivery route: choose a street, dodge traffic, hit mailboxes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_PaperboyModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LANES = Object.freeze(['Trái', 'Giữa', 'Phải']);
  const MAX_MISSES = 3;
  const MAX_CRASHES = 3;
  const ROUTE_MS = 16000;
  const DELIVERIES = Object.freeze([
    Object.freeze({ lane: 1, opensAt: 800, closesAt: 2400 }),
    Object.freeze({ lane: 2, opensAt: 3200, closesAt: 4800 }),
    Object.freeze({ lane: 0, opensAt: 5600, closesAt: 7200 }),
    Object.freeze({ lane: 1, opensAt: 8000, closesAt: 9600 }),
    Object.freeze({ lane: 0, opensAt: 10400, closesAt: 12000 }),
    Object.freeze({ lane: 2, opensAt: 12800, closesAt: 14400 })
  ]);
  const HAZARDS = Object.freeze([
    Object.freeze({ at: 1900, lane: 0, kind: 'dog' }),
    Object.freeze({ at: 4300, lane: 1, kind: 'car' }),
    Object.freeze({ at: 6700, lane: 2, kind: 'dog' }),
    Object.freeze({ at: 9100, lane: 0, kind: 'car' }),
    Object.freeze({ at: 11500, lane: 2, kind: 'dog' }),
    Object.freeze({ at: 13900, lane: 1, kind: 'car' }),
    Object.freeze({ at: 15100, lane: 0, kind: 'dog' })
  ]);
  const finite = Number.isFinite;

  function create() {
    let state;
    function reset() {
      state = { status: 'playing', lane: 1, elapsed: 0, nextDelivery: 0, deliveries: 0, misses: 0, crashes: 0, score: 0, hitHazards: [], lastEvent: 'start', pausedFrom: null };
    }
    function view() {
      const now = state.elapsed, delivery = DELIVERIES[state.nextDelivery] || null;
      const mailbox = delivery && now >= delivery.opensAt && now <= delivery.closesAt ? {
        lane: delivery.lane, index: state.nextDelivery, total: DELIVERIES.length,
        progress: (now - delivery.opensAt) / (delivery.closesAt - delivery.opensAt),
        timeLeft: delivery.closesAt - now
      } : null;
      const obstacles = HAZARDS.filter(hazard => !state.hitHazards.includes(hazard.at) && Math.abs(hazard.at - now) <= 2000).map(hazard => ({
        lane: hazard.lane, kind: hazard.kind, at: hazard.at,
        y: 0.22 + Math.max(0, Math.min(1, (now - (hazard.at - 1700)) / 1700)) * 0.58
      }));
      return {
        status: state.status, lane: state.lane, laneName: LANES[state.lane], elapsed: now,
        timeLeft: Math.max(0, ROUTE_MS - now), routeProgress: Math.min(1, now / ROUTE_MS),
        deliveries: state.deliveries, deliveryCount: DELIVERIES.length, nextDelivery: state.nextDelivery,
        misses: state.misses, maxMisses: MAX_MISSES, crashes: state.crashes, maxCrashes: MAX_CRASHES,
        score: state.score, mailbox, obstacles, lastEvent: state.lastEvent
      };
    }
    function finishIfNeeded() {
      if (state.misses >= MAX_MISSES || state.crashes >= MAX_CRASHES) state.status = 'lost';
      else if (state.elapsed >= ROUTE_MS) state.status = state.deliveries === DELIVERIES.length ? 'won' : 'lost';
    }
    reset();
    return Object.freeze({
      view,
      changeLane(delta) {
        if (state.status !== 'playing' || !Number.isInteger(delta) || Math.abs(delta) !== 1) return false;
        const next = Math.max(0, Math.min(LANES.length - 1, state.lane + delta));
        if (next === state.lane) return false;
        state.lane = next; state.lastEvent = 'lane'; return true;
      },
      setLane(lane) {
        if (state.status !== 'playing' || !Number.isInteger(lane) || lane < 0 || lane >= LANES.length) return false;
        if (lane === state.lane) return false;
        state.lane = lane; state.lastEvent = 'lane'; return true;
      },
      throwPaper() {
        if (state.status !== 'playing') return { accepted: false, reason: 'state' };
        const delivery = DELIVERIES[state.nextDelivery];
        if (!delivery || state.elapsed < delivery.opensAt || state.elapsed > delivery.closesAt) return { accepted: false, reason: 'window' };
        state.nextDelivery++;
        if (state.lane === delivery.lane) {
          state.deliveries++; state.score += 100; state.lastEvent = 'delivered';
          return { accepted: true, hit: true, deliveries: state.deliveries, score: state.score };
        }
        state.misses++; state.lastEvent = 'wrong-lane'; finishIfNeeded();
        return { accepted: true, hit: false, status: state.status, misses: state.misses };
      },
      advance(milliseconds) {
        if (!finite(milliseconds) || milliseconds <= 0 || milliseconds > 60000 || state.status !== 'playing') return false;
        const before = state.elapsed, after = Math.min(ROUTE_MS, before + milliseconds);
        for (const hazard of HAZARDS) {
          if (hazard.at > before && hazard.at <= after && !state.hitHazards.includes(hazard.at)) {
            state.hitHazards.push(hazard.at);
            if (state.lane === hazard.lane) {
              state.crashes++; state.lastEvent = hazard.kind;
              if (state.crashes >= MAX_CRASHES) { state.status = 'lost'; break; }
            }
          }
        }
        state.elapsed = after;
        if (state.status === 'lost') return true;
        while (DELIVERIES[state.nextDelivery] && DELIVERIES[state.nextDelivery].closesAt <= after) {
          const delivery = DELIVERIES[state.nextDelivery++];
          if (delivery.closesAt > before) {
            state.misses++; state.lastEvent = 'missed';
            if (state.misses >= MAX_MISSES) { state.status = 'lost'; break; }
          }
        }
        finishIfNeeded();
        return true;
      },
      pause() { if (state.status !== 'playing') return false; state.status = 'paused'; state.pausedFrom = 'playing'; state.lastEvent = 'paused'; return true; },
      resume() { if (state.status !== 'paused' || !state.pausedFrom) return false; state.status = state.pausedFrom; state.pausedFrom = null; state.lastEvent = 'resume'; return true; },
      restart() { reset(); return true; }
    });
  }

  return Object.freeze({ LANES, MAX_MISSES, MAX_CRASHES, ROUTE_MS, DELIVERIES, HAZARDS, create });
});
