/* Small original typing round for guiding a glowing sea slug back to its reef. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_TyperSharkModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORDS = Object.freeze(['SEA', 'REEF', 'WAVE', 'FIN', 'CORAL', 'TIDE', 'DEEP', 'SHELL', 'KELP']);
  const ROUND_MS = 75000;
  const MAX_MISSES = 3;
  const copy = state => ({ ...state, words: WORDS.slice() });

  function create() {
    let state;
    function reset() {
      state = { status: 'playing', words: WORDS.slice(), wordIndex: 0, cleared: 0, typed: '', wordElapsed: 0,
        elapsed: 0, score: 0, misses: 0, mistakes: 0, lastEvent: 'start' };
    }
    function deadline(index = state.wordIndex) { return Math.max(4800, 10500 - Math.floor(index / 3) * 1600); }
    function view() {
      const word = WORDS[state.wordIndex] || '';
      return { ...copy(state), total: WORDS.length, completed: state.cleared, wave: Math.min(3, Math.floor(state.wordIndex / 3) + 1),
        word, nextLetter: word[state.typed.length] || '', remainingMs: Math.max(0, ROUND_MS - state.elapsed),
        wordRemainingMs: Math.max(0, deadline() - state.wordElapsed), wordProgress: Math.min(1, state.wordElapsed / deadline()),
        maxMisses: MAX_MISSES, roundMs: ROUND_MS };
    }
    function missCurrentWord() {
      state.misses++;
      state.lastEvent = 'escape';
      state.wordIndex++;
      state.typed = '';
      state.wordElapsed = 0;
      if (state.misses >= MAX_MISSES || state.wordIndex >= WORDS.length) state.status = 'lost';
    }
    function advance(ms) {
      if (!Number.isFinite(ms) || ms <= 0 || ms > 60000 || state.status !== 'playing') return false;
      let remaining = ms;
      while (remaining > 0 && state.status === 'playing') {
        const untilWordDeadline = Math.max(0, deadline() - state.wordElapsed);
        const untilRoundDeadline = Math.max(0, ROUND_MS - state.elapsed);
        if (untilRoundDeadline === 0) {
          state.status = 'lost'; state.lastEvent = 'time';
          break;
        }
        if (untilWordDeadline === 0) {
          missCurrentWord();
          continue;
        }
        const step = Math.min(remaining, untilWordDeadline, untilRoundDeadline);
        state.elapsed += step;
        state.wordElapsed += step;
        remaining -= step;
        if (state.elapsed >= ROUND_MS) {
          state.elapsed = ROUND_MS;
          state.status = 'lost'; state.lastEvent = 'time';
        } else if (state.wordElapsed >= deadline()) {
          missCurrentWord();
        }
      }
      return true;
    }
    function typeLetter(input) {
      if (state.status !== 'playing' || typeof input !== 'string' || !/^[a-z]$/i.test(input)) return { accepted: false, status: state.status };
      const letter = input.toUpperCase(), word = WORDS[state.wordIndex];
      if (letter !== word[state.typed.length]) {
        state.mistakes++; state.wordElapsed = Math.min(deadline(), state.wordElapsed + 220); state.lastEvent = 'mistake';
        if (state.wordElapsed >= deadline()) missCurrentWord();
        return { accepted: true, correct: false, status: state.status, expected: word[state.typed.length] || '' };
      }
      state.typed += letter;
      const points = 10;
      state.score += points;
      if (state.typed.length === word.length) {
        const bonus = Math.ceil(Math.max(0, deadline() - state.wordElapsed) / 1000) * 5;
        state.score += bonus; state.cleared++; state.wordIndex++; state.typed = ''; state.wordElapsed = 0; state.lastEvent = 'clear';
        if (state.wordIndex === WORDS.length) state.status = 'won';
        return { accepted: true, correct: true, cleared: true, points: points + bonus, status: state.status, score: state.score };
      }
      state.lastEvent = 'letter';
      return { accepted: true, correct: true, cleared: false, points, status: state.status, score: state.score };
    }
    function pause() { if (state.status !== 'playing') return false; state.status = 'paused'; return true; }
    function resume() { if (state.status !== 'paused') return false; state.status = 'playing'; return true; }
    reset();
    return Object.freeze({ view, typeLetter, advance, pause, resume, restart: reset });
  }

  return Object.freeze({ WORDS, ROUND_MS, MAX_MISSES, create });
});
