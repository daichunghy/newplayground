/* Mạch Gió: original, authored flight campaign with deterministic rules. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_FlappyBirdModel = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const VERSION = 2, SAVE_VERSION = 1;
  const WIDTH = 600, HEIGHT = 360, STEP = 1000 / 60, PLAYER_X = 142, RADIUS = 12;
  const GRAVITY = .31, FLAP = -5.05, GATE_W = 40, MAX_LIVES = 3;
  const STAGES = Object.freeze([
    Object.freeze({ id: 'ngo-som', name: 'Ngõ sớm', place: 'Gió nhẹ đầu ngày', goal: 4, gap: 116, speed: 2.55, spacing: 198, centers: Object.freeze([164, 190, 158, 198]), sky: ['#293753', '#38445a', '#725b54'], stone: '#244d52' }),
    Object.freeze({ id: 'bo-kenh', name: 'Bờ kênh', place: 'Mái thấp bên mặt nước', goal: 4, gap: 108, speed: 2.75, spacing: 198, centers: Object.freeze([166, 188, 160, 192]), sky: ['#203a48', '#3b5961', '#678071'], stone: '#24565c' }),
    Object.freeze({ id: 'mai-pho', name: 'Mái phố', place: 'Qua dãy đèn lên', goal: 4, gap: 100, speed: 3, spacing: 198, centers: Object.freeze([155, 165, 185, 188]), sky: ['#292c47', '#694b5b', '#98725e'], stone: '#3d4657' })
  ]);

  const finite = Number.isFinite;
  const int = (n, low, high) => Number.isSafeInteger(n) && n >= low && n <= high;
  const clone = value => JSON.parse(JSON.stringify(value));
  function validProgress(data) {
    return !!data && data.version === SAVE_VERSION && int(data.unlockedStage, 0, STAGES.length - 1) &&
      int(data.selectedStage, 0, data.unlockedStage) && Array.isArray(data.stars) && data.stars.length === STAGES.length &&
      data.stars.every((stars, i) => int(stars, 0, 3) && (stars === 0 || i <= data.unlockedStage));
  }
  function newProgress(data = null) {
    if (validProgress(data)) return clone(data);
    return { version: SAVE_VERSION, unlockedStage: 0, selectedStage: 0, stars: Array(STAGES.length).fill(0) };
  }
  function makeGates(stageIndex) {
    const stage = STAGES[stageIndex] || STAGES[0];
    return stage.centers.map((center, id) => ({ id, x: 355 + id * stage.spacing, center, passed: false }));
  }
  function initialState(progress = null) {
    const saved = newProgress(progress), stageIndex = saved.selectedStage;
    return {
      version: VERSION, status: 'ready', stageIndex, unlockedStage: saved.unlockedStage, stars: saved.stars,
      ticks: 0, remainder: 0, score: 0, lives: MAX_LIVES,
      player: { x: PLAYER_X, y: HEIGHT / 2, vy: 0 }, gates: makeGates(stageIndex), result: null
    };
  }
  function create(progress = null) { return makeModel(initialState(progress)); }
  function restore(data) { return validProgress(data) ? create(data) : null; }

  function makeModel(initial = null) {
    const s = clone(initial || initialState());
    let events = [];
    const stage = () => STAGES[s.stageIndex] || STAGES[0];
    const emit = (kind, extra = {}) => events.push({ kind, ...extra });
    function resetCourse(keepStatus = false) {
      s.ticks = 0; s.remainder = 0;
      s.player = { x: PLAYER_X, y: HEIGHT / 2, vy: 0 };
      s.gates = makeGates(s.stageIndex);
      if (!keepStatus) { s.score = 0; s.lives = MAX_LIVES; s.result = null; s.status = 'ready'; }
    }
    function clearStage() {
      const stars = s.lives;
      s.status = 'won';
      s.stars[s.stageIndex] = Math.max(s.stars[s.stageIndex], stars);
      s.unlockedStage = Math.min(STAGES.length - 1, Math.max(s.unlockedStage, s.stageIndex + 1));
      s.result = { stageIndex: s.stageIndex, score: s.score, lives: s.lives, stars, final: s.stageIndex === STAGES.length - 1 };
      s.remainder = 0;
      emit('clear', clone(s.result));
    }
    function crash(reason) {
      if (s.status !== 'playing') return;
      s.lives = Math.max(0, s.lives - 1);
      emit('crash', { reason, lives: s.lives, score: s.score });
      if (s.lives === 0) {
        s.status = 'over'; s.remainder = 0; s.result = { stageIndex: s.stageIndex, score: s.score, lives: 0, stars: 0, final: false };
        emit('over', { score: s.score, stageIndex: s.stageIndex });
      } else {
        resetCourse(true); s.status = 'playing'; emit('respawn', { lives: s.lives, score: s.score });
      }
    }
    function tick() {
      if (s.status !== 'playing') return;
      s.ticks++;
      const p = s.player;
      p.vy += GRAVITY; p.y += p.vy;
      if (p.y - RADIUS < 0 || p.y + RADIUS > HEIGHT) { crash(p.y - RADIUS < 0 ? 'ceiling' : 'floor'); return; }
      const current = stage();
      for (const gate of s.gates) {
        gate.x -= current.speed;
        if (p.x + RADIUS > gate.x && p.x - RADIUS < gate.x + GATE_W) {
          const top = gate.center - current.gap / 2, bottom = gate.center + current.gap / 2;
          if (p.y - RADIUS < top || p.y + RADIUS > bottom) { crash('gate'); return; }
        }
        if (!gate.passed && gate.x + GATE_W < p.x - RADIUS) {
          gate.passed = true; s.score++; emit('score', { score: s.score, gate: gate.id, goal: current.goal });
          if (s.score >= current.goal) { clearStage(); return; }
        }
      }
    }
    const api = {
      flap() {
        if (s.status === 'over' || s.status === 'won') return false;
        if (s.status === 'ready') { s.status = 'playing'; emit('start', { stageIndex: s.stageIndex }); }
        s.player.vy = FLAP; emit('flap'); return true;
      },
      advance(ms) {
        if (s.status !== 'playing' || !finite(ms) || ms < 0 || ms > 60000) return [];
        s.remainder += ms;
        while (s.remainder + 1e-7 >= STEP && s.status === 'playing') { s.remainder = Math.max(0, s.remainder - STEP); tick(); }
        const out = events; events = []; return out;
      },
      drain() { const out = events; events = []; return out; },
      selectStage(index) {
        if (!int(index, 0, STAGES.length - 1) || index > s.unlockedStage) return false;
        s.stageIndex = index; resetCourse(); emit('select', { stageIndex: index }); return true;
      },
      nextStage() {
        if (s.status !== 'won' || s.stageIndex >= STAGES.length - 1) return false;
        s.stageIndex++; s.unlockedStage = Math.max(s.unlockedStage, s.stageIndex); resetCourse();
        emit('next-stage', { stageIndex: s.stageIndex }); return true;
      },
      replayCampaign() {
        if (s.status !== 'won' || !s.result?.final) return false;
        s.stageIndex = 0; resetCourse(); emit('replay-campaign'); return true;
      },
      reset() { return create(api.serializeProgress()); },
      view() {
        const current = stage();
        return clone({ version: VERSION, status: s.status, ticks: s.ticks, stageIndex: s.stageIndex, stageCount: STAGES.length,
          stage: current, unlockedStage: s.unlockedStage, stars: s.stars, goal: current.goal, progress: Math.min(s.score, current.goal),
          score: s.score, lives: s.lives, player: s.player, gates: s.gates, result: s.result });
      },
      serialize() { return clone(s); },
      serializeProgress() { return { version: SAVE_VERSION, unlockedStage: s.unlockedStage, selectedStage: s.stageIndex, stars: s.stars.slice() }; }
    };
    return api;
  }

  return { VERSION, SAVE_VERSION, WIDTH, HEIGHT, STEP, PLAYER_X, RADIUS, GRAVITY, FLAP, GATE_W, MAX_LIVES, STAGES, validProgress, create, restore, makeModel };
});
