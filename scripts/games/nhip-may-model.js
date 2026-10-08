/* Original four-lane rhythm rules for Nhịp Mây. No third-party game code. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_NhipMayModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const EARLY = 0.22, GREAT = 0.085, SONG_BEATS = 32;
  const LANES = Object.freeze([
    Object.freeze({ key: 'KeyD', alternate: 'ArrowLeft', label: '←', name: 'Trái', color: '#80d7c4' }),
    Object.freeze({ key: 'KeyF', alternate: 'ArrowDown', label: '↓', name: 'Xuống', color: '#f3ba77' }),
    Object.freeze({ key: 'KeyJ', alternate: 'ArrowUp', label: '↑', name: 'Lên', color: '#aeb2ff' }),
    Object.freeze({ key: 'KeyK', alternate: 'ArrowRight', label: '→', name: 'Phải', color: '#f28fb0' })
  ]);
  const SPACE_BEATS = Object.freeze([3, 7, 11, 15, 19, 23, 27, 31]);
  const SONGS = Object.freeze([
    Object.freeze({ name: 'Mây Sớm', bpm: 108, chart: Object.freeze([
      [0,0],[1,1],[2,2], [4,2],[5,0],[6,1],
      [8,0],[9,2],[10,3], [12,1],[13,3],[14,0],
      [16,3],[17,2],[18,0], [20,2],[21,0],[22,1],
      [24,0],[25,3],[26,2], [28,1],[29,2],[30,3]
    ]) }),
    Object.freeze({ name: 'Đèn Phố', bpm: 116, chart: Object.freeze([
      [0,0],[1,1],[2,2],[3.5,3], [4,2],[5,0],[6,3],[6.5,1],
      [8,0],[9,2],[10,3],[11.5,1], [12,1],[13,3],[14,0],[15.5,2],
      [16,3],[17,2],[18,0],[19.5,1], [20,2],[21,0],[22,1],[23.5,3],
      [24,0],[25,3],[26,2],[27.5,1], [28,1],[29,2],[30,3],[31.5,0]
    ]) }),
    Object.freeze({ name: 'Mưa Nhịp', bpm: 124, chart: Object.freeze([
      [0,0],[0.5,1],[1.5,2],[2,3],[2.5,0],[3.5,2],
      [4,3],[4.5,2],[5.5,1],[6,0],[6.5,3],
      [8,1],[8.5,0],[9.5,3],[10,2],[10.5,1],[11.5,0],
      [12,3],[12.5,1],[13.5,2],[14,0],[14.5,3],
      [16,2],[16.5,3],[17.5,0],[18,1],[18.5,2],[19.5,3],
      [20,0],[20.5,2],[21.5,1],[22,3],[22.5,0],
      [24,1],[24.5,0],[25.5,2],[26,3],[26.5,1],[27.5,0],
      [28,2],[28.5,3],[29.5,1],[30,0],[30.5,2],[31.5,3]
    ]) })
  ]);
  const BPM = SONGS[0].bpm, BEAT = 60 / BPM, clone = value => JSON.parse(JSON.stringify(value));

  function authoredNotes(songIndex) {
    const song = SONGS[songIndex];
    if (!song) return [];
    const beat = 60 / song.bpm;
    return [
      ...song.chart.map(([position, lane]) => ({ kind: 'arrow', beat: position, lane })),
      ...SPACE_BEATS.map(position => ({ kind: 'space', beat: position, lane: -1 }))
    ].sort((a, b) => a.beat - b.beat || (a.kind === 'space' ? 1 : -1))
      .map((note, index) => ({ id: index + 1, ...note, time: 1.5 + note.beat * beat, judged: false, grade: null }));
  }

  function create() {
    return make({
      version: 2, title: 'Nhịp Mây', status: 'ready', songIndex: 0, time: 0,
      notes: authoredNotes(0), score: 0, totalScore: 0, combo: 0, bestCombo: 0,
      hits: 0, misses: 0, results: [], lastGrade: 'Sẵn sàng', lastLane: -1
    });
  }

  function make(initial) {
    const state = clone(initial);
    function start() {
      if (state.status !== 'ready') return false;
      state.status = 'playing'; state.time = 0; state.lastGrade = 'Vào nhịp!'; return true;
    }
    function advance(seconds) {
      if (state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return view();
      state.time += Math.min(seconds, 0.1);
      for (const note of state.notes) {
        if (!note.judged && state.time > note.time + EARLY) {
          note.judged = true; note.grade = 'Trượt'; state.misses++; state.combo = 0;
          state.lastGrade = 'Trượt'; state.lastLane = note.lane;
        }
      }
      const last = state.notes[state.notes.length - 1];
      if (state.time >= last.time + EARLY) {
        const accuracy = state.hits / state.notes.length;
        const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : state.hits > 0 ? 1 : 0;
        state.results.push({ songIndex: state.songIndex, name: SONGS[state.songIndex].name,
          score: state.score, hits: state.hits, misses: state.misses, total: state.notes.length,
          accuracy, bestCombo: state.bestCombo, stars });
        state.totalScore += state.score;
        state.status = state.songIndex < SONGS.length - 1 ? 'song-ended' : 'ended';
        state.lastGrade = state.status === 'ended' ? 'Bộ nhịp xong' : 'Đoạn khép lại';
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
    function nextSong() {
      if (state.status !== 'song-ended' || state.songIndex >= SONGS.length - 1) return false;
      state.songIndex++; state.time = 0; state.notes = authoredNotes(state.songIndex);
      state.score = 0; state.combo = 0; state.bestCombo = 0; state.hits = 0; state.misses = 0;
      state.lastGrade = 'Vào nhịp!'; state.lastLane = -1; state.status = 'playing'; return true;
    }
    function view() {
      const song = SONGS[state.songIndex];
      return clone({ ...state, song, songNumber: state.songIndex + 1, songCount: SONGS.length });
    }
    return { start, advance, press, pressSpace, pause, resume, nextSong, view };
  }

  function restore(raw) {
    if (!raw || raw.version !== 2 || !['ready','playing','paused','song-ended','ended'].includes(raw.status) ||
      !Number.isSafeInteger(raw.songIndex) || raw.songIndex < 0 || raw.songIndex >= SONGS.length ||
      !Number.isFinite(raw.time) || raw.time < 0 || raw.time > 40 || !Array.isArray(raw.notes) ||
      raw.notes.length !== authoredNotes(raw.songIndex).length || !Number.isSafeInteger(raw.score) || raw.score < 0 ||
      !Number.isSafeInteger(raw.totalScore) || raw.totalScore < 0 || !Number.isSafeInteger(raw.combo) || raw.combo < 0 ||
      !Number.isSafeInteger(raw.misses) || raw.misses < 0 || !Number.isSafeInteger(raw.hits) || raw.hits < 0 ||
      !Array.isArray(raw.results) || raw.results.length !== raw.songIndex + (['song-ended','ended'].includes(raw.status) ? 1 : 0) ||
      raw.results.some((result, index) => !result || result.songIndex !== index || result.name !== SONGS[index].name ||
        !Number.isSafeInteger(result.score) || result.score < 0 || !Number.isSafeInteger(result.hits) || result.hits < 0 ||
        !Number.isSafeInteger(result.total) || result.total !== authoredNotes(index).length ||
        !Number.isSafeInteger(result.stars) || result.stars < 0 || result.stars > 3)) return null;
    const expected = authoredNotes(raw.songIndex);
    for (let i = 0; i < expected.length; i++) {
      const note = raw.notes[i], ref = expected[i];
      if (!note || note.id !== ref.id || note.kind !== ref.kind || note.beat !== ref.beat || note.lane !== ref.lane || note.time !== ref.time ||
        typeof note.judged !== 'boolean' || !(note.grade === null || ['Đẹp','Ổn','Trượt'].includes(note.grade)) || note.judged !== (note.grade !== null)) return null;
    }
    return make(raw);
  }

  return Object.freeze({ BPM, BEAT, EARLY, GREAT, SONG_BEATS, LANES, SONGS, CHART: SONGS[0].chart, SPACE_BEATS, create, restore });
});
