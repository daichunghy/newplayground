/* Deterministic rope-and-seed puzzle rules for the original Mầm Măm prototype. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_CutRopeModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 360, HEIGHT = 540;
  const STEP = 1 / 120;
  const CANDY_RADIUS = 14;
  const CUT_TOLERANCE = 13;
  const RAW_LEVELS = [
    {
      id: 'sunny-porch', name: 'Hiên Nắng', gravity: 620, ropeLength: 230, ropeSegments: 7,
      anchor: { x: 88, y: 75 }, angle: 51, angularSpeed: -0.6,
      receiver: { x: 85, y: 485, radius: 31 }, basePoints: 100,
      stars: [{ x: 153, y: 313 }, { x: 112, y: 372 }, { x: 72, y: 447 }], hazards: []
    },
    {
      id: 'reed-bridge', name: 'Cầu Lau', gravity: 650, ropeLength: 220, ropeSegments: 8,
      anchor: { x: 272, y: 72 }, angle: -53, angularSpeed: 0.55,
      receiver: { x: 276, y: 480, radius: 32 }, basePoints: 130,
      stars: [{ x: 188, y: 280 }, { x: 225, y: 331 }, { x: 262, y: 418 }],
      hazards: [{ x: 185, y: 437, radius: 25 }]
    },
    {
      id: 'moon-garden', name: 'Vườn Trăng', gravity: 640, ropeLength: 230, ropeSegments: 9,
      anchor: { x: 170, y: 65 }, angle: 48, angularSpeed: -0.65,
      receiver: { x: 100, y: 482, radius: 32 }, basePoints: 170,
      stars: [{ x: 242, y: 286 }, { x: 200, y: 338 }, { x: 157, y: 404 }],
      hazards: [{ x: 198, y: 432, radius: 18 }]
    }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const finitePoint = point => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
  const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function pointSegmentDistanceSquared(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return distanceSquared(point, a);
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
    return (point.x - (a.x + t * dx)) ** 2 + (point.y - (a.y + t * dy)) ** 2;
  }

  // Return the first point at which a moving circle's center reaches a target
  // circle. Checking the full step segment prevents fast drops from tunneling
  // through stars, hazards, or the receiver between fixed simulation ticks.
  function circleContactOnSegment(start, end, circle, radius) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const fx = start.x - circle.x, fy = start.y - circle.y;
    const combinedRadius = Math.max(0, Number(radius) || 0);
    const c = fx * fx + fy * fy - combinedRadius * combinedRadius;
    if (c <= 0) return 0;
    const a = dx * dx + dy * dy;
    if (a === 0) return null;
    const b = 2 * (fx * dx + fy * dy);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }

  function orientation(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  function segmentsIntersect(a, b, c, d) {
    const abC = orientation(a, b, c), abD = orientation(a, b, d);
    const cdA = orientation(c, d, a), cdB = orientation(c, d, b);
    return abC * abD <= 0 && cdA * cdB <= 0
      && Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
      && Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
  }

  function segmentDistanceSquared(a, b, c, d) {
    if (segmentsIntersect(a, b, c, d)) return 0;
    return Math.min(
      pointSegmentDistanceSquared(a, c, d), pointSegmentDistanceSquared(b, c, d),
      pointSegmentDistanceSquared(c, a, b), pointSegmentDistanceSquared(d, a, b)
    );
  }

  function ropePieces(anchor, candy, count) {
    return Array.from({ length: count }, (_, index) => {
      const startT = index / count, endT = (index + 1) / count;
      return {
        index,
        start: { x: anchor.x + (candy.x - anchor.x) * startT, y: anchor.y + (candy.y - anchor.y) * startT },
        end: { x: anchor.x + (candy.x - anchor.x) * endT, y: anchor.y + (candy.y - anchor.y) * endT }
      };
    });
  }

  function create({ level: requestedLevel = 0 } = {}) {
    let state = null;
    let accumulator = 0;

    function load(index, score = 0) {
      const definition = RAW_LEVELS[index];
      const radians = definition.angle * Math.PI / 180;
      const candy = {
        x: definition.anchor.x + Math.sin(radians) * definition.ropeLength,
        y: definition.anchor.y + Math.cos(radians) * definition.ropeLength,
        vx: definition.ropeLength * Math.cos(radians) * definition.angularSpeed,
        vy: -definition.ropeLength * Math.sin(radians) * definition.angularSpeed
      };
      state = {
        level: index, status: 'playing', score, levelScore: 0, levelAward: 0,
        elapsed: 0, candy, attached: true, stars: definition.stars.map((star, id) => ({ ...star, id, radius: 19, collected: false })),
        cuts: 0, lastEvent: 'start', lossReason: null
      };
      accumulator = 0;
    }

    function level() { return RAW_LEVELS[state.level]; }

    function lose(reason) {
      state.status = 'lost';
      state.lossReason = reason;
      state.lastEvent = reason;
    }

    function update(h) {
      const definition = level(), candy = state.candy;
      const previous = { x: candy.x, y: candy.y };
      state.elapsed += h;
      candy.vy += definition.gravity * h;
      candy.x += candy.vx * h;
      candy.y += candy.vy * h;

      if (state.attached) {
        const dx = candy.x - definition.anchor.x, dy = candy.y - definition.anchor.y;
        const length = Math.hypot(dx, dy) || definition.ropeLength;
        const ux = dx / length, uy = dy / length;
        candy.x = definition.anchor.x + ux * definition.ropeLength;
        candy.y = definition.anchor.y + uy * definition.ropeLength;
        const radialSpeed = candy.vx * ux + candy.vy * uy;
        candy.vx -= ux * radialSpeed;
        candy.vy -= uy * radialSpeed;
      }

      const destination = { x: candy.x, y: candy.y };
      const contacts = [];
      for (const hazard of definition.hazards) {
        const t = circleContactOnSegment(previous, candy, hazard, hazard.radius + CANDY_RADIUS);
        if (t !== null) contacts.push({ t, kind: 'hazard' });
      }
      for (const star of state.stars) {
        if (star.collected) continue;
        const t = circleContactOnSegment(previous, candy, star, star.radius + CANDY_RADIUS);
        if (t !== null) contacts.push({ t, kind: 'star', star });
      }
      const receiverT = circleContactOnSegment(previous, candy, definition.receiver, definition.receiver.radius + CANDY_RADIUS * 0.4);
      if (receiverT !== null) contacts.push({ t: receiverT, kind: 'receiver' });
      const contactPriority = { hazard: 0, star: 1, receiver: 2 };
      contacts.sort((a, b) => a.t - b.t || contactPriority[a.kind] - contactPriority[b.kind]);
      for (const contact of contacts) {
        // Process contacts in travel order so a star behind a spike or a receiver
        // cannot be awarded after the candy has already hit an earlier target.
        if (contact.kind === 'hazard') {
          candy.x = previous.x + (destination.x - previous.x) * contact.t;
          candy.y = previous.y + (destination.y - previous.y) * contact.t;
          lose('hazard'); return;
        }
        if (contact.kind === 'star') {
          contact.star.collected = true;
          state.levelScore += 100;
          state.levelAward += 100;
          state.score += 100;
          state.lastEvent = 'star';
          continue;
        }
        candy.x = previous.x + (destination.x - previous.x) * contact.t;
        candy.y = previous.y + (destination.y - previous.y) * contact.t;
        // Star points were earned as they were collected; add only the finish value here.
        const finishBonus = level().basePoints + (state.stars.every(star => star.collected) ? 250 : 0);
        state.levelScore += finishBonus;
        state.levelAward += finishBonus;
        state.score += finishBonus;
        state.status = state.level === RAW_LEVELS.length - 1 ? 'campaign-won' : 'won';
        state.lastEvent = 'caught';
        return;
      }
      if (candy.x < -CANDY_RADIUS || candy.x > WIDTH + CANDY_RADIUS || candy.y > HEIGHT + CANDY_RADIUS) {
        lose('missed');
      }
    }

    function view() {
      const definition = level();
      return {
        status: state.status, level: state.level, levelNumber: state.level + 1, levelCount: RAW_LEVELS.length,
        levelName: definition.name, width: WIDTH, height: HEIGHT, gravity: definition.gravity,
        anchor: clone(definition.anchor), ropeLength: definition.ropeLength, ropeSegments: definition.ropeSegments,
        rope: state.attached ? ropePieces(definition.anchor, state.candy, definition.ropeSegments) : [],
        attached: state.attached, candy: { ...state.candy, radius: CANDY_RADIUS },
        receiver: clone(definition.receiver), hazards: clone(definition.hazards), stars: clone(state.stars),
        score: state.score, levelScore: state.levelScore, levelAward: state.levelAward,
        starsCollected: state.stars.filter(star => star.collected).length, starCount: state.stars.length,
        elapsed: state.elapsed, cuts: state.cuts, lossReason: state.lossReason, lastEvent: state.lastEvent
      };
    }

    load(clamp(Number.isInteger(requestedLevel) ? requestedLevel : 0, 0, RAW_LEVELS.length - 1));

    return Object.freeze({
      view,
      step(seconds) {
        if (state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return { status: state.status };
        accumulator = Math.min(accumulator + Math.min(seconds, 0.25), 0.25);
        while (accumulator >= STEP && state.status === 'playing') {
          update(STEP);
          accumulator -= STEP;
        }
        return { status: state.status };
      },
      cut(start, end = start) {
        if (state.status !== 'playing' || !state.attached || !finitePoint(start) || !finitePoint(end)) {
          return { accepted: false, cut: false, status: state.status };
        }
        const a = { x: Number(start.x), y: Number(start.y) };
        const b = { x: Number(end.x), y: Number(end.y) };
        const pieces = ropePieces(level().anchor, state.candy, level().ropeSegments);
        for (const piece of pieces) {
          if (segmentDistanceSquared(a, b, piece.start, piece.end) <= CUT_TOLERANCE ** 2) {
            state.attached = false;
            state.cuts++;
            state.lastEvent = 'cut';
            return { accepted: true, cut: true, segment: piece.index, status: state.status };
          }
        }
        state.lastEvent = 'missed-cut';
        return { accepted: true, cut: false, status: state.status };
      },
      cutAt(point) {
        if (state.status !== 'playing' || !state.attached || !finitePoint(point)) return { accepted: false, cut: false, status: state.status };
        const same = { x: Number(point.x), y: Number(point.y) };
        const pieces = ropePieces(level().anchor, state.candy, level().ropeSegments);
        const piece = pieces.find(candidate => pointSegmentDistanceSquared(same, candidate.start, candidate.end) <= CUT_TOLERANCE ** 2);
        if (!piece) { state.lastEvent = 'missed-cut'; return { accepted: true, cut: false, status: state.status }; }
        state.attached = false; state.cuts++; state.lastEvent = 'cut';
        return { accepted: true, cut: true, segment: piece.index, status: state.status };
      },
      pause() {
        if (state.status !== 'playing') return false;
        state.status = 'paused'; state.lastEvent = 'paused'; return true;
      },
      resume() {
        if (state.status !== 'paused') return false;
        state.status = 'playing'; state.lastEvent = 'resumed'; return true;
      },
      restart() {
        const score = Math.max(0, state.score - state.levelAward);
        load(state.level, score); return true;
      },
      nextLevel() {
        if (state.status !== 'won' || state.level >= RAW_LEVELS.length - 1) return false;
        load(state.level + 1, state.score); return true;
      },
      newGame() { load(0, 0); return true; }
    });
  }

  return Object.freeze({ WIDTH, HEIGHT, STEP, CANDY_RADIUS, CUT_TOLERANCE, LEVELS: Object.freeze(clone(RAW_LEVELS)), circleContactOnSegment, create });
});
