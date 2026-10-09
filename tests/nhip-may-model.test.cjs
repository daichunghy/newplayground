const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../scripts/games/nhip-may-model.js');

function advance(model, seconds) {
  while (seconds > 1e-9) { const step = Math.min(.1, seconds); model.advance(step); seconds -= step; }
}

function clearCurrentSong(model) {
  const start = model.view().time;
  assert.equal(model.view().status, 'playing');
  for (const note of model.view().notes) {
    advance(model, note.time - model.view().time);
    const result = note.kind === 'space' ? model.pressSpace() : model.press(note.lane);
    assert.ok(['Đẹp','Ổn'].includes(result.grade), `hit ${note.kind} at beat ${note.beat}`);
  }
  const last = model.view().notes.at(-1);
  advance(model, last.time + M.EARLY + .01 - model.view().time);
  return { elapsed: model.view().time - start, state: model.view() };
}

test('the original chart is deterministic and starts with a readable four-lane session', () => {
  const a = M.create(), b = M.create();
  assert.deepEqual(a.view(), b.view());
  assert.equal(a.view().title, 'Nhịp Mây');
  assert.equal(a.view().status, 'ready');
  assert.deepEqual(M.LANES.map(lane => lane.key), ['KeyD', 'KeyF', 'KeyJ', 'KeyK']);
  assert.deepEqual(M.LANES.map(lane => lane.alternate), ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight']);
  assert.equal(a.view().notes.length, 32);
  assert.equal(a.view().notes.filter(note => note.kind === 'space').length, 8);
  assert.equal(M.CHART.length, 24);
  assert.equal(M.SONGS.length, 3);
  assert.equal(a.view().song.name, 'Mây Sớm');
  assert.equal(a.start(), true); assert.equal(a.start(), false);
});

test('early and late inputs grade deterministically, then scale combo points', () => {
  const game = M.create(); game.start();
  advance(game, 1.5);
  assert.equal(game.press(0).grade, 'Đẹp');
  advance(game, M.BEAT);
  const next = game.press(1);
  assert.equal(next.grade, 'Đẹp');
  assert.ok(next.points > 100);
  assert.equal(game.view().combo, 2);
  assert.equal(game.view().score, next.points + 100);
});

test('wrong lane and an unplayed note miss reset combo without corrupting the chart', () => {
  const game = M.create(); game.start(); advance(game, 1.5);
  assert.equal(game.press(3).grade, 'miss');
  assert.equal(game.press(0).grade, 'Đẹp');
  advance(game, M.BEAT + M.EARLY + .01);
  assert.equal(game.view().misses, 2);
  assert.equal(game.view().combo, 0);
  assert.equal(game.view().notes[1].grade, 'Trượt');
});

test('each four-beat phrase ends with a Space finish note', () => {
  const game = M.create(); game.start();
  advance(game, 1.5 + 3 * M.BEAT);
  const result = game.pressSpace();
  assert.equal(result.grade, 'Đẹp');
  assert.equal(game.view().notes.find(note => note.kind === 'space').judged, true);
  assert.equal(game.view().hits, 1);
  assert.equal(game.pressSpace().grade, 'miss');
  assert.equal(M.SPACE_BEATS.length, 8);
});

test('three authored songs increase tempo and syncopation, grade clears, and finish as one set', () => {
  assert.deepEqual(M.SONGS.map(song => song.name), ['Mây Sớm','Đèn Phố','Mưa Nhịp']);
  assert.ok(M.SONGS[0].bpm < M.SONGS[1].bpm && M.SONGS[1].bpm < M.SONGS[2].bpm);
  assert.deepEqual(M.SONGS.map(song => song.chart.length), [24,32,45]);
  assert.ok(M.SONGS[2].chart.some(([beat]) => !Number.isInteger(beat)), 'final song uses off-beat notes');
  const game = M.create(); game.start();
  for (let song = 0; song < M.SONGS.length; song++) {
    const { state } = clearCurrentSong(game);
    assert.equal(state.results[song].name, M.SONGS[song].name);
    assert.equal(state.results[song].stars, 3);
    assert.equal(state.results[song].hits, state.results[song].total);
    if (song < M.SONGS.length - 1) {
      assert.equal(state.status, 'song-ended');
      assert.equal(game.press(0).grade, null);
      assert.equal(game.nextSong(), true);
    } else assert.equal(state.status, 'ended');
  }
  assert.equal(game.view().results.length, 3);
  assert.equal(game.view().totalScore, game.view().results.reduce((sum, result) => sum + result.score, 0));
  assert.equal(M.restore(game.view()).view().status, 'ended');
});

test('pause freezes chart time; malformed saves are rejected', () => {
  const game = M.create(); game.start(); advance(game, .6); game.pause();
  const atPause = game.view().time; advance(game, 4);
  assert.equal(game.view().time, atPause);
  assert.equal(game.resume(), true); advance(game, .1);
  assert.ok(game.view().time > atPause);
  assert.equal(M.restore(game.view()).view().time, game.view().time);
  const corrupt = game.view(); corrupt.notes[3].lane = 0;
  assert.equal(M.restore(corrupt), null);
});
