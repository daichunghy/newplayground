/* Original four-lane rhythm rules for Nhịp Mây. No third-party game code. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_NhipMayModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const BPM = 108;
  const BEAT = 60 / BPM;
  const EARLY = 0.22, GREAT = 0.085;
  const SONG_BEATS = 32;
  const LANES = Object.freeze([
    Object.freeze({ key: 'KeyD', alternate: 'ArrowLeft', label: '←', name: 'Trái', color: '#80d7c4' }),
    Object.freeze({ key: 'KeyF', alternate: 'ArrowDown', label: '↓', name: 'Xuống', color: '#f3ba77' }),
    Object.freeze({ key: 'KeyJ', alternate: 'ArrowUp', label: '↑', name: 'Lên', color: '#aeb2ff' }),
    Object.freeze({ key: 'KeyK', alternate: 'ArrowRight', label: '→', name: 'Phải', color: '#f28fb0' })
  ]);
  const SPACE_BEATS = Object.freeze([3, 7, 11, 15, 19, 23, 27, 31]);
  // Hand-authored original chart: three directional keys, then a finish beat each bar.
  const CHART = Object.freeze([
    [0,0],[1,1],[2,2], [4,2],[5,0],[6,1],
    [8,0],[9,2],[10,3], [12,1],[13,3],[14,0],
    [16,3],[17,2],[18,0], [20,2],[21,0],[22,1],
    [24,0],[25,3],[26,2], [28,1],[29,2],[30,3]
  ]);
  const clone = value => JSON.parse(JSON.stringify(value));

  function authoredNotes() {
    const notes = [
      ...CHART.map(([beat, lane]) => ({ kind: 'arrow', beat, lane })),
      ...SPACE_BEATS.map(beat => ({ kind: 'space', beat, lane: -1 }))
    ].sort((a, b) => a.beat - b.beat);
    return notes.map((note, index) => ({ id: index + 1, ...note, time: 1.5 + note.beat * BEAT, judged: false, grade: null }));
  }

  function create() {
    const notes = authoredNotes();
    return make({ version: 1, title: 'Nhịp Mây', status: 'ready', time: 0, notes, score: 0, combo: 0, bestCombo: 0, hits: 0, misses: 0, lastGrade: 'Sẵn sàng', lastLane: -1 });
  }

  function make(initial) {
    const state = clone(initial);
    function start() { if (state.status !== 'ready') return false; state.status = 'playing'; state.time = 0; state.lastGrade = 'Vào nhịp!'; return true; }
    function advance(seconds) {
      if (state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return view();
      state.time += Math.min(seconds, 0.1);
      for (const note of state.notes) {
        if (!note.judged && state.time > note.time + EARLY) {
          note.judged = true; note.grade = 'Trượt'; state.misses++; state.combo = 0;
          state.lastGrade = 'Trượt'; state.lastLane = note.lane;
        }
      }
      if (state.time >= state.notes[state.notes.length - 1].time + EARLY) {
        state.status = 'ended'; state.lastGrade = 'Hết bài';
      }
      return view();
    }
    function judge(kind, lane) {
      if (state.status !== 'playing') return { grade: null, points: 0 };
      let target = null, offset = Infinity;
      for (const note of state.notes) {
        if (note.judged || note.kind !== kind || note.lane !== lane) continue;
        const delta = Math.abs(note.time - state.time);
        if (delta < offset) { offset = delta; target = note; }
      }
      if (!target || offset > EARLY) {
        state.combo = 0; state.misses++; state.lastGrade = 'Lệch nhịp'; state.lastLane = lane;
        return { grade: 'miss', points: 0 };
      }
      const grade = offset <= GREAT ? 'Đẹp' : 'Ổn';
      const base = grade === 'Đẹp' ? 100 : 55;
      state.combo++; state.bestCombo = Math.max(state.bestCombo, state.combo);
      const points = base + Math.min(75, (state.combo - 1) * 10);
      state.score += points; state.hits++;
      target.judged = true; target.grade = grade;
      state.lastGrade = grade; state.lastLane = lane;
      return { grade, points, offset, noteId: target.id };
    }
    function press(lane) {
      if (!Number.isInteger(lane) || lane < 0 || lane > 3) return { grade: null, points: 0 };
      return judge('arrow', lane);
    }
    function pressSpace() { return judge('space', -1); }
    function pause() { if (state.status !== 'playing') return false; state.status = 'paused'; return true; }
    function resume() { if (state.status !== 'paused') return false; state.status = 'playing'; return true; }
    function view() { return clone(state); }
    return { start, advance, press, pressSpace, pause, resume, view };
  }

  function restore(raw) {
    if (!raw || raw.version !== 1 || !['ready','playing','paused','ended'].includes(raw.status) || !Number.isFinite(raw.time) || raw.time < 0 || raw.time > 40 || !Array.isArray(raw.notes) || raw.notes.length !== authoredNotes().length || !Number.isSafeInteger(raw.score) || raw.score < 0 || !Number.isSafeInteger(raw.combo) || raw.combo < 0 || !Number.isSafeInteger(raw.misses) || raw.misses < 0 || !Number.isSafeInteger(raw.hits) || raw.hits < 0) return null;
    const expected = authoredNotes();
    for (let i = 0; i < expected.length; i++) {
      const note = raw.notes[i], ref = expected[i];
      if (!note || note.id !== ref.id || note.kind !== ref.kind || note.beat !== ref.beat || note.lane !== ref.lane || note.time !== ref.time || typeof note.judged !== 'boolean' || !(note.grade === null || ['Đẹp','Ổn','Trượt'].includes(note.grade)) || note.judged !== (note.grade !== null)) return null;
    }
    return make(raw);
  }

  return Object.freeze({ BPM, BEAT, EARLY, GREAT, SONG_BEATS, LANES, CHART, SPACE_BEATS, create, restore });
});
