/* Original draw-and-ride track challenge with fixed-step slope physics. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_LineRiderModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WIDTH = 800, HEIGHT = 440;
  const START = Object.freeze({ x: 64, y: 322 });
  const GOAL = Object.freeze({ x: 736, y: 322 });
  const RINGS = Object.freeze([
    Object.freeze({ x: 230, y: 282 }),
    Object.freeze({ x: 400, y: 322 }),
    Object.freeze({ x: 570, y: 282 })
  ]);
  const START_RADIUS = 46, GOAL_RADIUS = 48;
  const MIN_TRACK = 440, MAX_TRACK = 1120, MAX_POINTS = 240;
  const MAX_SECONDS = 16, GRAVITY = 380, FRICTION = 7, INITIAL_SPEED = 235;
  const clonePoints = points => points.map(point => ({ x: point.x, y: point.y }));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function pathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
    return length;
  }

  function poseAt(points, arc) {
    let remaining = Math.max(0, arc);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = distance(a, b);
      if (remaining <= length || i === points.length - 1) {
        const t = length ? Math.min(1, remaining / length) : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
          slope: length ? (b.y - a.y) / length : 0, segment: i - 1 };
      }
      remaining -= length;
    }
    return { ...GOAL, slope: 0, segment: Math.max(0, points.length - 2) };
  }

  function create({ timeLimit = MAX_SECONDS } = {}) {
    if (!Number.isFinite(timeLimit) || timeLimit <= 0 || timeLimit > MAX_SECONDS) throw new RangeError('timeLimit is outside the supported range');
    let s = { status: 'ready', track: [], length: 0, distance: 0, speed: 0, timeLeft: timeLimit,
      elapsed: 0, slowTime: 0, rings: [false, false, false], score: 0, lastEvent: 'draw', result: null };

    function validTrack() {
      return s.track.length >= 3 && s.length >= MIN_TRACK && s.length <= MAX_TRACK &&
        distance(s.track[0], START) <= START_RADIUS && distance(s.track.at(-1), GOAL) <= GOAL_RADIUS;
    }
    function view() {
      const rider = s.track.length >= 2 ? poseAt(s.track, s.distance) : { ...START, slope: 0, segment: 0 };
      return { status: s.status, track: clonePoints(s.track), trackLength: s.length,
        canRide: s.status === 'ready' && validTrack(), validTrack: validTrack(), rider,
        distance: s.distance, speed: s.speed, timeLeft: s.timeLeft, elapsed: s.elapsed,
        rings: [...s.rings], ringsCollected: s.rings.filter(Boolean).length,
        score: s.score, lastEvent: s.lastEvent, result: s.result,
        start: { ...START }, goal: { ...GOAL }, ringPositions: RINGS.map(point => ({ ...point })) };
    }

    function beginTrack(point) {
      if (s.status !== 'ready' || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || distance(point, START) > START_RADIUS) {
        s.lastEvent = 'start-here'; return false;
      }
      s.track = [{ ...START }]; s.length = 0; s.rings = [false, false, false];
      s.lastEvent = 'draw'; return true;
    }

    function appendTrack(point) {
      if (s.status !== 'ready' || !s.track.length || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
      const next = { x: Math.max(8, Math.min(WIDTH - 8, point.x)), y: Math.max(24, Math.min(HEIGHT - 18, point.y)) };
      const previous = s.track.at(-1), step = distance(previous, next);
      if (step < 4) return false;
      if (s.track.length >= MAX_POINTS || s.length + step > MAX_TRACK) { s.lastEvent = 'ink-limit'; return false; }
      s.track.push(next); s.length += step; s.lastEvent = 'draw'; return true;
    }

    function endTrack() { if (!s.track.length) return false; s.lastEvent = validTrack() ? 'track-ready' : 'track-incomplete'; return validTrack(); }

    function advance(seconds) {
      if (s.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return view();
      let remaining = Math.min(seconds, 120);
      while (remaining > 1e-8 && s.status === 'playing') {
        const dt = Math.min(1 / 120, remaining); remaining -= dt;
        s.elapsed += dt; s.timeLeft = Math.max(0, s.timeLeft - dt);
        if (s.timeLeft <= 1e-8) { s.timeLeft = 0; s.status = 'lost'; s.result = 'time'; s.lastEvent = 'time-up'; break; }
        const pose = poseAt(s.track, s.distance);
        const friction = FRICTION * Math.sign(s.speed || 1);
        s.speed = Math.max(-90, Math.min(440, s.speed + (GRAVITY * pose.slope - friction) * dt));
        s.distance += s.speed * dt;
        if (s.distance <= 0) { s.distance = 0; s.status = 'lost'; s.result = 'rolled-back'; s.lastEvent = 'fell-back'; break; }
        const next = poseAt(s.track, s.distance);
        for (let i = 0; i < RINGS.length; i++) {
          if (!s.rings[i] && distance(next, RINGS[i]) <= 34) { s.rings[i] = true; s.score += 80; s.lastEvent = 'ring'; }
        }
        if (s.speed < 28) s.slowTime += dt; else s.slowTime = 0;
        if (s.slowTime >= 1.35) { s.status = 'lost'; s.result = 'stalled'; s.lastEvent = 'stalled'; break; }
        if (s.distance >= s.length - 0.001) {
          s.distance = s.length; s.status = 'won'; s.result = 'finish';
          s.score += 100 + Math.floor(s.timeLeft * 5); s.lastEvent = 'win';
        }
      }
      return view();
    }

    function clearTrack() {
      if (s.status !== 'ready') return false;
      s.track = []; s.length = 0; s.rings = [false, false, false]; s.lastEvent = 'cleared'; return true;
    }
    function restart() {
      s = { status: 'ready', track: [], length: 0, distance: 0, speed: 0, timeLeft: timeLimit,
        elapsed: 0, slowTime: 0, rings: [false, false, false], score: 0, lastEvent: 'restart', result: null };
      return true;
    }

    return Object.freeze({ view, beginTrack, appendTrack, endTrack, clearTrack,
      start() {
        if (s.status !== 'ready') return false;
        if (!validTrack()) { s.lastEvent = 'track-incomplete'; return false; }
        s.status = 'playing'; s.distance = 0; s.speed = INITIAL_SPEED; s.timeLeft = timeLimit;
        s.elapsed = 0; s.slowTime = 0; s.rings = [false, false, false]; s.score = 0;
        s.lastEvent = 'ride'; return true;
      },
      advance,
      pause() { if (s.status !== 'playing') return false; s.status = 'paused'; s.lastEvent = 'pause'; return true; },
      resume() { if (s.status !== 'paused') return false; s.status = 'playing'; s.lastEvent = 'resume'; return true; },
      restart
    });
  }

  return Object.freeze({ WIDTH, HEIGHT, START, GOAL, RINGS, START_RADIUS, GOAL_RADIUS,
    MIN_TRACK, MAX_TRACK, MAX_SECONDS, GRAVITY, FRICTION, INITIAL_SPEED, pathLength, poseAt, create });
});
