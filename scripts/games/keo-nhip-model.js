/* Original rhythm-tug rules for Kéo Nhịp. This is an arcade fiction, not a TWIF simulation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_KeoNhipModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CUE_COUNT = 12;
  const WIDTH = 760, HEIGHT = 320;
  const FIRST_CUE = 0.9;
  const BEAT_SECONDS = 0.78;
  const LATE_WINDOW = 0.22;
  const PERFECT_WINDOW = 0.09;
  const CENTER_MARK = 0;
  const WIN_MARK = 6.5;
  const REST_BEATS = new Set([4, 9]);
  const ROUND_PULL = Object.freeze([0.39, 0.47, 0.55]);
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const clone = value => JSON.parse(JSON.stringify(value));

  function makeRandom(seed) {
    let state = (Number(seed) >>> 0) || 0x4b454f;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function makeCues(seed, round) {
    const random = makeRandom((Number(seed) ^ Math.imul(round, 0x45d9f3b)) >>> 0);
    let foot = 0;
    return Array.from({ length: CUE_COUNT }, (_, index) => {
      const rest = REST_BEATS.has(index);
      const side = rest ? 'rest' : (foot++ % 2 === 0 ? 'left' : 'right');
      return Object.freeze({
        index,
        side,
        kind: rest ? 'rest' : 'step',
        time: FIRST_CUE + index * BEAT_SECONDS,
        rivalPull: Number((ROUND_PULL[round - 1] + random() * 0.08).toFixed(4))
      });
    });
  }

  function create({ seed = 0x4b454f } = {}) {
    const fixedSeed = (Number(seed) >>> 0) || 0x4b454f;
    let state;

    function reset() {
      state = {
        version: 1, seed: fixedSeed, status: 'ready', round: 1,
        wins: 0, losses: 0, position: CENTER_MARK, fatigue: 0, combo: 0,
        time: 0, beatIndex: 0, perfects: 0, goods: 0, misses: 0,
        rests: 0, earlyPresses: 0, rounds: [], lastGrade: 'Sẵn sàng',
        cues: makeCues(fixedSeed, 1)
      };
      return true;
    }

    function closeRound() {
      if (state.status !== 'playing') return false;
      const won = state.position > CENTER_MARK;
      const result = {
        round: state.round, won,
        position: Number(state.position.toFixed(3)),
        perfects: state.perfects, goods: state.goods, misses: state.misses,
        rests: state.rests
      };
      state.rounds.push(result);
      if (won) state.wins++; else state.losses++;
      state.status = state.wins >= 2 ? 'won' : state.losses >= 2 ? 'lost' : won ? 'round-won' : 'round-lost';
      state.lastGrade = won ? 'Thắng lượt' : 'Thua lượt';
      return true;
    }

    function applyRival(cue) {
      state.position = clamp(state.position - cue.rivalPull, -WIN_MARK, WIN_MARK);
    }

    function advanceCue(cue) {
      if (cue.kind === 'rest') {
        state.fatigue = Math.max(0, state.fatigue - 0.22);
        state.combo = 0;
        state.rests++;
        state.lastGrade = 'Đã nghỉ nhịp';
      } else {
        state.fatigue = clamp(state.fatigue + 0.13, 0, 1);
        state.combo = 0;
        state.misses++;
        state.lastGrade = 'Trượt nhịp';
      }
      applyRival(cue);
      state.beatIndex++;
      if (state.position <= -WIN_MARK) closeRound();
      else if (state.beatIndex >= state.cues.length) closeRound();
    }

    function processExpired() {
      while (state.status === 'playing') {
        const cue = state.cues[state.beatIndex];
        if (!cue || state.time <= cue.time + LATE_WINDOW) break;
        advanceCue(cue);
      }
    }

    function start() {
      if (state.status !== 'ready') return false;
      state.status = 'playing';
      state.time = 0;
      state.lastGrade = 'Vào nhịp';
      return true;
    }

    function advance(seconds) {
      if (state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return view();
      state.time += Math.min(seconds, 60);
      processExpired();
      return view();
    }

    function press(side) {
      if (state.status !== 'playing' || !['left', 'right'].includes(side)) {
        return { accepted: false, grade: null, points: 0 };
      }
      processExpired();
      if (state.status !== 'playing') return { accepted: false, grade: null, points: 0 };
      const cue = state.cues[state.beatIndex];
      if (!cue || state.time < cue.time - LATE_WINDOW) {
        state.earlyPresses++;
        state.lastGrade = 'Chờ nhịp';
        return { accepted: false, grade: 'early', points: 0 };
      }

      if (cue.kind === 'rest') {
        state.lastGrade = 'Lỡ nhịp nghỉ';
        state.fatigue = clamp(state.fatigue + 0.18, 0, 1);
        state.combo = 0;
        state.misses++;
        state.rests++;
        applyRival(cue);
        state.beatIndex++;
        if (state.position <= -WIN_MARK || state.beatIndex >= state.cues.length) closeRound();
        return { accepted: true, grade: 'overstep', points: 0 };
      }

      if (side !== cue.side) {
        state.lastGrade = 'Đổi chân';
        state.fatigue = clamp(state.fatigue + 0.16, 0, 1);
        state.combo = 0;
        state.misses++;
        applyRival(cue);
        state.beatIndex++;
        if (state.position <= -WIN_MARK || state.beatIndex >= state.cues.length) closeRound();
        return { accepted: true, grade: 'wrong-side', points: 0 };
      }

      const offset = Math.abs(state.time - cue.time);
      if (offset > LATE_WINDOW) return { accepted: false, grade: 'late', points: 0 };
      const perfect = offset <= PERFECT_WINDOW;
      const grade = perfect ? 'perfect' : 'good';
      const base = perfect ? 1.47 : 1.08;
      const comboBoost = Math.min(state.combo * 0.035, 0.21);
      const pull = (base + comboBoost) * (1 - state.fatigue * 0.42);
      state.position = clamp(state.position + pull, -WIN_MARK, WIN_MARK);
      state.fatigue = Math.max(0, state.fatigue - 0.055);
      state.combo++;
      if (perfect) state.perfects++; else state.goods++;
      state.lastGrade = perfect ? 'Đúng phách' : 'Vừa nhịp';
      applyRival(cue);
      state.beatIndex++;
      if (state.position >= WIN_MARK) closeRound();
      else if (state.beatIndex >= state.cues.length) closeRound();
      return { accepted: true, grade, points: Math.round(pull * 100), pull: Number(pull.toFixed(3)) };
    }

    function pause() {
      if (state.status !== 'playing') return false;
      state.status = 'paused'; state.lastGrade = 'Tạm nghỉ'; return true;
    }

    function resume() {
      if (state.status !== 'paused') return false;
      state.status = 'playing'; state.lastGrade = 'Trở lại nhịp'; return true;
    }

    function nextRound() {
      if (!['round-won', 'round-lost'].includes(state.status) || state.round >= 3) return false;
      state.round++;
      state.status = 'ready'; state.time = 0; state.beatIndex = 0;
      state.position = CENTER_MARK; state.fatigue = 0; state.combo = 0;
      state.perfects = 0; state.goods = 0; state.misses = 0; state.rests = 0; state.earlyPresses = 0;
      state.cues = makeCues(fixedSeed, state.round);
      state.lastGrade = 'Lượt mới';
      return true;
    }

    function view() {
      const cue = ['ready', 'playing', 'paused'].includes(state.status) ? state.cues[state.beatIndex] || null : null;
      return {
        ...clone({ ...state, cues: undefined }),
        cue: cue ? clone(cue) : null,
        cueCount: CUE_COUNT, winMark: WIN_MARK,
        remainingCues: Math.max(0, CUE_COUNT - state.beatIndex),
        fatiguePercent: Math.round(state.fatigue * 100),
        roundScore: `${state.wins}–${state.losses}`
      };
    }

    reset();
    return { start, advance, press, pause, resume, nextRound, restart: reset, view };
  }

  return Object.freeze({
    WIDTH, HEIGHT, CUE_COUNT, FIRST_CUE, BEAT_SECONDS, LATE_WINDOW, PERFECT_WINDOW,
    WIN_MARK, REST_BEATS, create
  });
});
