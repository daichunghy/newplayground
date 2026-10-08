// Dependency-free rules tests. Run: node --test tests/minesweeper-model.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = process.env.NP_TEST_ROOT || path.resolve(__dirname, '..');
const { PRESETS, create, restore } = require(path.join(ROOT, 'scripts/games/minesweeper-model.js'));
const copy = value => JSON.parse(JSON.stringify(value));
const sorted = values => [...values].sort((a, b) => a - b);
const indices = (cells, predicate) => cells.flatMap((cell, index) => predicate(cell, index) ? [index] : []);

function seeded(seed) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 0x100000000);
}

// Independent coordinate-based oracle; never rely on the model's neighbor method.
function neighbors(view, index) {
  const row = Math.floor(index / view.cols), col = index % view.cols;
  const result = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(view.rows - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(view.cols - 1, col + 1); c++) {
      const candidate = r * view.cols + c;
      if (candidate !== index) result.push(candidate);
    }
  }
  return result;
}

function expectedFlood(view, starts) {
  const found = new Set();
  const queue = [...starts];
  while (queue.length) {
    const index = queue.shift();
    const cell = view.cells[index];
    if (found.has(index) || cell.revealed || cell.flagged || cell.mine) continue;
    found.add(index);
    if (cell.adjacent === 0) queue.push(...neighbors(view, index));
  }
  return sorted(found);
}

function assertInvariants(board) {
  const view = board.view();
  const preset = PRESETS[view.presetId];
  assert.equal(view.rows, preset.rows);
  assert.equal(view.cols, preset.cols);
  assert.equal(view.cells.length, preset.rows * preset.cols);
  assert.equal(view.mines, preset.mines);
  assert.equal(view.revealedCount, view.cells.filter(cell => cell.revealed).length);
  assert.equal(view.flagCount, view.cells.filter(cell => cell.flagged).length);
  assert.equal(view.cells.filter(cell => cell.mine).length, view.status === 'ready' ? 0 : preset.mines);
  view.cells.forEach((cell, index) => {
    assert.equal(typeof cell.mine, 'boolean');
    assert.equal(typeof cell.revealed, 'boolean');
    assert.equal(typeof cell.flagged, 'boolean');
    assert.equal(typeof cell.questioned, 'boolean');
    assert.equal(cell.revealed && cell.flagged, false, `revealed flag at ${index}`);
    assert.equal(cell.revealed && cell.questioned, false, `revealed question mark at ${index}`);
    assert.equal(cell.flagged && cell.questioned, false, `overlapping marks at ${index}`);
    assert.equal(cell.revealed && cell.mine, false, `revealed mine at ${index}`);
    const expected = cell.mine ? 0 : neighbors(view, index).filter(i => view.cells[i].mine).length;
    assert.equal(cell.adjacent, expected, `incorrect clue at ${index}`);
  });
  if (view.firstIndex !== null) {
    for (const index of [view.firstIndex, ...neighbors(view, view.firstIndex)]) {
      assert.equal(view.cells[index].mine, false, `first-click protection at ${index}`);
    }
  }
  if (view.status === 'won') assert.equal(view.revealedCount, view.cells.length - view.mines);
  if (view.status === 'lost') assert.equal(view.cells[view.explodedIndex].mine, true);
}

test('view returns detached cells so callers cannot mutate the live board', () => {
  const board = create('beginner', seeded(91));
  const view = board.view();
  view.cells[0].mine = true;
  view.cells[1].flagged = true;
  view.cells.pop();
  assert.equal(board.view().cells.length, PRESETS.beginner.rows * PRESETS.beginner.cols);
  assert.equal(board.view().cells[0].mine, false);
  assert.equal(board.view().cells[1].flagged, false);
  assert.equal(board.view().flagCount, 0);
  assertInvariants(board);
});

function newPlayingBoard(preset = 'beginner', seed = 1) {
  const board = create(preset, seeded(seed));
  const view = board.view();
  board.reveal(Math.floor(view.rows / 2) * view.cols + Math.floor(view.cols / 2));
  assert.equal(board.view().status, 'playing');
  return board;
}

function chordFixture() {
  const board = newPlayingBoard();
  const view = board.view();
  const index = view.cells.findIndex((cell, i) => cell.revealed && cell.adjacent > 0 &&
    neighbors(view, i).some(n => !view.cells[n].mine && !view.cells[n].revealed));
  assert.notEqual(index, -1, 'fixture requires a numbered frontier with hidden safe neighbors');
  const around = neighbors(view, index);
  return { board, index, mines: around.filter(i => view.cells[i].mine),
    safe: around.filter(i => !view.cells[i].mine && !view.cells[i].revealed) };
}

function assertNoChange(board, action) {
  const before = copy(board.view());
  const saved = copy(board.serialize());
  const result = action();
  assert.equal(result.kind, 'none');
  assert.deepEqual(result.changed, []);
  assert.equal(result.started, false);
  assert.deepEqual(board.view(), before);
  assert.deepEqual(board.serialize(), saved);
  return result;
}

test('presets, default board, and invalid difficulty identifiers', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(PRESETS).map(([id, p]) => [id, [p.rows, p.cols, p.mines]])), {
    pocket: [8, 6, 8], beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [16, 30, 99]
  });
  assert.equal(create().view().presetId, 'beginner');
  assert.equal(Object.isFrozen(PRESETS), true);
  for (const preset of Object.values(PRESETS)) assert.equal(Object.isFrozen(preset), true);
  for (const id of ['missing', '__proto__', 'constructor', null, 0]) assert.throws(() => create(id), RangeError);
});

test('public boards expose gameplay operations without a reusable internal hydration hook', () => {
  const board = create('pocket');
  const restored = restore(copy(board.serialize()));
  assert.ok(restored);
  for (const candidate of [board, restored]) {
    assert.equal('hydrate' in candidate, false);
    for (const method of ['view', 'reveal', 'flag', 'chord', 'neighbors', 'serialize']) {
      assert.equal(typeof candidate[method], 'function', `missing public method ${method}`);
    }
  }
});

test('CommonJS model also loads as a browser global without DOM, clock, or audio', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/games/minesweeper-model.js'), 'utf8'), context);
  assert.equal(typeof context.window.NP_MinesweeperModel.create, 'function');
  assert.equal(context.window.NP_MinesweeperModel.create('pocket', () => 0).reveal(0).started, true);
});

for (const [presetId, preset] of Object.entries(PRESETS)) {
  test(`${presetId}: starts empty and neighbors never wrap at board boundaries`, () => {
    const board = create(presetId, () => { throw new Error('RNG must remain lazy'); });
    const view = board.view();
    assert.equal(view.status, 'ready');
    assert.equal(view.firstIndex, null);
    assert.equal(view.explodedIndex, null);
    assert.equal(view.revealedCount, 0);
    assert.equal(view.flagCount, 0);
    assertInvariants(board);
    for (let index = 0; index < view.cells.length; index++) {
      assert.deepEqual(sorted(board.neighbors(index)), neighbors(view, index));
      assert.equal(new Set(board.neighbors(index)).size, board.neighbors(index).length);
    }
  });

  const positions = {
    'top-left corner': 0,
    'top-right corner': preset.cols - 1,
    'bottom-left corner': (preset.rows - 1) * preset.cols,
    'bottom-right corner': preset.rows * preset.cols - 1,
    'top edge': Math.floor(preset.cols / 2),
    'left edge': Math.floor(preset.rows / 2) * preset.cols,
    'right edge': Math.floor(preset.rows / 2) * preset.cols + preset.cols - 1,
    'bottom edge': (preset.rows - 1) * preset.cols + Math.floor(preset.cols / 2),
    center: Math.floor(preset.rows / 2) * preset.cols + Math.floor(preset.cols / 2)
  };
  for (const [location, firstIndex] of Object.entries(positions)) {
    test(`${presetId}: exact mine count and safe first-click neighborhood at ${location}`, () => {
      for (const seed of [0, 1, 17, 0xffffffff]) {
        const board = create(presetId, seeded(seed));
        const result = board.reveal(firstIndex);
        const view = board.view();
        assert.equal(result.started, true);
        assert.ok(['reveal', 'win'].includes(result.kind));
        assert.equal(result.status, view.status);
        assert.equal(view.firstIndex, firstIndex);
        assert.equal(view.cells[firstIndex].adjacent, 0);
        assert.equal(view.cells[firstIndex].revealed, true);
        assert.equal(new Set(result.changed).size, result.changed.length);
        assert.deepEqual(sorted(result.changed), indices(view.cells, c => c.revealed));
        for (const neighbor of neighbors(view, firstIndex)) assert.equal(view.cells[neighbor].revealed, true);
        assertInvariants(board);
      }
    });
  }

  test(`${presetId}: pathological RNG values remain bounded and produce distinct mines`, () => {
    for (const sample of [0, 0.5, 1, -1, 100, Number.MAX_VALUE, NaN, Infinity, -Infinity, undefined, null, '0.25']) {
      let calls = 0;
      const board = create(presetId, () => {
        // Fail synchronously rather than let a rejection-sampling regression hang the suite.
        assert.ok(++calls <= preset.mines, `too many RNG calls for ${String(sample)}`);
        return sample;
      });
      board.reveal(0);
      assert.equal(calls, preset.mines, `RNG call count for ${String(sample)}`);
      assertInvariants(board);
    }
  });
}

test('invalid indices are harmless for every public operation and do not generate a board', () => {
  const board = create('pocket', () => { throw new Error('unexpected generation'); });
  const invalid = [-1, 48, 1000000, 0.5, NaN, Infinity, -Infinity, undefined, null, '0', {}, [], Symbol('index')];
  for (const index of invalid) {
    for (const operation of ['flag', 'question', 'cycleMark', 'reveal', 'chord']) assertNoChange(board, () => board[operation](index));
    assert.deepEqual(board.neighbors(index), []);
  }
});

test('prestart flags toggle, preserve the ready state, and expose an accurate remaining-mine counter', () => {
  const board = create('pocket', () => { throw new Error('flags cannot start the timer or generator'); });
  for (let index = 0; index < 10; index++) {
    const result = board.flag(index);
    assert.equal(result.kind, 'flag');
    assert.deepEqual(result.changed, [index]);
    assert.equal(result.started, false);
    assert.equal(result.status, 'ready');
    assert.equal(board.view().flagCount, index + 1);
    assert.equal(board.view().mines - board.view().flagCount, 7 - index);
  }
  assertNoChange(board, () => board.reveal(0));
  assertNoChange(board, () => board.chord(0));
  board.flag(0);
  assert.equal(board.view().flagCount, 9);
  assert.equal(board.view().cells[0].flagged, false);
  assertInvariants(board);
});

test('flood reveal matches an independent oracle and preserves prestart flags on safe neighbors', () => {
  const board = create('beginner', seeded(1));
  const first = 40, held = 39;
  board.flag(held);
  const result = board.reveal(first);
  const after = copy(board.view());
  const unrevealed = copy(after);
  for (const cell of unrevealed.cells) cell.revealed = false;
  assert.deepEqual(sorted(result.changed), expectedFlood(unrevealed, [first]));
  assert.equal(after.cells[held].mine, false);
  assert.equal(after.cells[held].flagged, true);
  assert.equal(after.cells[held].revealed, false);
  assert.equal(after.flagCount, 1);
  assertNoChange(board, () => board.reveal(held));
  board.flag(held);
  assert.equal(board.view().cells[held].revealed, false, 'unflagging must not reveal automatically');
  const before = copy(board.view());
  const follow = board.reveal(held);
  assert.equal(follow.started, false);
  assert.deepEqual(sorted(follow.changed), expectedFlood(before, [held]));
  assert.equal(board.view().flagCount, 0);
  assertInvariants(board);
});

test('revealed cells cannot be flagged and revealing a zero twice is a no-op', () => {
  const board = newPlayingBoard();
  assertNoChange(board, () => board.flag(board.view().firstIndex));
  assertNoChange(board, () => board.reveal(board.view().firstIndex));
  assertNoChange(board, () => board.chord(board.view().firstIndex));
});

test('chording refuses unrevealed cells and too few or too many adjacent flags', () => {
  const { board, index, mines, safe } = chordFixture();
  assertNoChange(board, () => board.chord(safe[0]));
  assert.equal(assertNoChange(board, () => board.chord(index)).reason, 'flags-mismatch');
  for (const mine of mines) board.flag(mine);
  board.flag(safe[0]);
  assert.equal(assertNoChange(board, () => board.chord(index)).reason, 'flags-mismatch');
  board.flag(safe[0]);
  board.flag(mines[0]);
  assert.equal(assertNoChange(board, () => board.chord(index)).reason, 'flags-mismatch');
});

test('correct chording opens exactly the eligible flood area and retains flags', () => {
  const { board, index, mines } = chordFixture();
  for (const mine of mines) board.flag(mine);
  const before = copy(board.view());
  const targets = neighbors(before, index).filter(i => !before.cells[i].revealed && !before.cells[i].flagged);
  const result = board.chord(index);
  assert.ok(['chord', 'win'].includes(result.kind));
  assert.equal(result.started, false);
  assert.deepEqual(sorted(result.changed), expectedFlood(before, targets));
  assert.equal(new Set(result.changed).size, result.changed.length);
  for (const mine of mines) {
    assert.equal(board.view().cells[mine].flagged, true);
    assert.equal(board.view().cells[mine].revealed, false);
  }
  assertInvariants(board);
  assertNoChange(board, () => board.chord(index));
});

test('revealing an already-open number performs the same chord operation', () => {
  const { board, index, mines } = chordFixture();
  for (const mine of mines) board.flag(mine);
  const second = restore(copy(board.serialize()));
  assert.ok(second);
  assert.deepEqual(board.reveal(index), second.chord(index));
  assert.deepEqual(board.view(), second.view());
});

test('matching but incorrect flags cause a chord loss rather than shielding an unflagged mine', () => {
  const { board, index, mines, safe } = chordFixture();
  for (const mine of mines.slice(1)) board.flag(mine);
  board.flag(safe[0]);
  const result = board.chord(index);
  assert.equal(result.kind, 'loss');
  assert.equal(result.status, 'lost');
  assert.equal(result.started, false);
  assert.equal(board.view().explodedIndex, mines[0]);
  assert.ok(result.changed.includes(mines[0]));
  assert.equal(new Set(result.changed).size, result.changed.length);
  assert.equal(board.view().cells[safe[0]].flagged, true);
  assert.equal(board.view().cells[safe[0]].revealed, false);
  assertInvariants(board);
  for (const action of ['flag', 'reveal', 'chord']) {
    for (const target of [index, mines[0], safe[0]]) assertNoChange(board, () => board[action](target));
  }
});

test('correct chording can reveal the final safe cell and win', () => {
  const { board, index, mines, safe } = chordFixture();
  const held = safe[0];
  board.flag(held);
  for (const mine of mines) board.flag(mine);
  for (const i of indices(board.view().cells, cell => !cell.mine)) {
    if (i !== held) board.reveal(i);
  }
  assert.equal(board.view().status, 'playing');
  assert.equal(board.view().revealedCount, board.view().cells.length - board.view().mines - 1);
  board.flag(held);
  const result = board.chord(index);
  assert.equal(result.kind, 'win');
  assert.equal(result.status, 'won');
  assert.deepEqual(result.changed, [held]);
  assertInvariants(board);
});

for (const presetId of Object.keys(PRESETS)) {
  test(`${presetId}: revealing all safe cells wins without placing any flags and locks the board`, () => {
    const board = newPlayingBoard(presetId, 3);
    let wins = 0;
    for (const index of indices(board.view().cells, cell => !cell.mine)) {
      const result = board.reveal(index);
      if (result.kind === 'win') wins++;
    }
    assert.equal(wins, 1);
    assert.equal(board.view().status, 'won');
    assert.equal(board.view().flagCount, 0);
    assert.equal(board.view().explodedIndex, null);
    assertInvariants(board);
    for (const operation of ['flag', 'question', 'cycleMark', 'reveal', 'chord']) {
      for (const index of [0, board.view().firstIndex, board.view().cells.findIndex(cell => cell.mine)]) {
        assertNoChange(board, () => board[operation](index));
      }
    }
  });
}

test('flagging every mine keeps the game active until all safe cells are revealed', () => {
  const board = newPlayingBoard();
  const mines = indices(board.view().cells, cell => cell.mine);
  for (const mine of mines) board.flag(mine);
  assert.equal(board.view().flagCount, board.view().mines);
  assert.equal(board.view().status, 'playing');
  for (const mine of mines) assertNoChange(board, () => board.reveal(mine));
  for (const safe of indices(board.view().cells, cell => !cell.mine)) board.reveal(safe);
  assert.equal(board.view().status, 'won');
  assertInvariants(board);
});

test('generation occurs exactly once even through later reveals, flags, and chords', () => {
  let calls = 0;
  const random = seeded(1);
  const board = create('beginner', () => {
    assert.ok(++calls <= PRESETS.beginner.mines, 'board regenerated after starting');
    return random();
  });
  board.flag(0); board.flag(0);
  assert.equal(calls, 0);
  board.reveal(40);
  const layout = board.serialize().mines;
  for (const index of indices(board.view().cells, cell => cell.mine)) board.flag(index);
  for (const index of indices(board.view().cells, cell => !cell.mine)) {
    board.reveal(index);
    board.chord(index);
  }
  assert.equal(calls, PRESETS.beginner.mines);
  assert.deepEqual(board.serialize().mines, layout);
  assert.equal(board.view().status, 'won');
});

test('direct mine loss identifies the explosion, does not count a mine as safe, and locks all actions', () => {
  const board = newPlayingBoard();
  const mine = board.view().cells.findIndex(cell => cell.mine);
  const count = board.view().revealedCount;
  const result = board.reveal(mine);
  assert.equal(result.kind, 'loss');
  assert.equal(result.status, 'lost');
  assert.equal(result.started, false);
  assert.deepEqual(result.changed, [mine]);
  assert.equal(board.view().explodedIndex, mine);
  assert.equal(board.view().revealedCount, count);
  assertInvariants(board);
  for (let index = 0; index < board.view().cells.length; index++) {
    for (const operation of ['flag', 'question', 'cycleMark', 'reveal', 'chord']) assertNoChange(board, () => board[operation](index));
  }
});

test('prestart save roundtrips with flags and generates only on the first unflagged reveal', () => {
  const board = create('pocket', seeded(5));
  board.flag(0); board.flag(12);
  const saved = copy(board.serialize());
  assert.deepEqual(saved, { version: 1, presetId: 'pocket', status: 'ready', firstIndex: null, mines: [], revealed: [], flags: [0, 12], questions: [] });
  const restored = restore(saved);
  assert.ok(restored);
  assert.deepEqual(restored.view(), board.view());
  assert.deepEqual(restored.serialize(), saved);
  assertNoChange(restored, () => restored.reveal(0));
  const result = restored.reveal(1);
  assert.equal(result.started, true);
  assert.equal(restored.view().firstIndex, 1);
  assert.equal(restored.view().cells[0].flagged, true);
  assert.equal(restored.view().cells[12].flagged, true);
  assertInvariants(restored);
});

test('tentative question marks cycle with flags without counting as confirmed mines', () => {
  const board = create('pocket', () => { throw new Error('marks cannot start the timer or generator'); });
  assert.equal(board.cycleMark(3).reason, 'flag');
  assert.equal(board.view().flagCount, 1);
  assert.equal(board.cycleMark(3).reason, 'question');
  assert.equal(board.view().flagCount, 0);
  assert.equal(board.view().cells[3].questioned, true);
  assert.equal(board.cycleMark(3).reason, 'clear');
  board.question(4);
  assert.equal(board.view().cells[4].questioned, true);
  board.flag(4);
  assert.equal(board.view().cells[4].flagged, true);
  assert.equal(board.view().cells[4].questioned, false);
  board.question(4);
  assert.equal(board.view().cells[4].flagged, false);
  assert.equal(board.view().cells[4].questioned, true);
  const copy = restore(board.serialize());
  assert.ok(copy);
  assert.equal(copy.view().cells[4].questioned, true);
  assert.equal(copy.view().flagCount, 0);
  assertInvariants(copy);
  const legacySave = board.serialize(); delete legacySave.questions;
  const legacyCopy = restore(legacySave);
  assert.ok(legacyCopy, 'schema-1 saves created before tentative marks remain readable');
  assert.deepEqual(legacyCopy.serialize().questions, []);
});

test('revealing or chording treats question-marked cells as unmarked cells', () => {
  const board = create('beginner', seeded(14));
  const first = 40, tentative = 39;
  board.question(tentative);
  board.reveal(first);
  if (!board.view().cells[tentative].revealed) {
    const result = board.reveal(tentative);
    assert.ok(['reveal', 'win'].includes(result.kind));
    assert.equal(board.view().cells[tentative].questioned, false);
  }

  const fixture = chordFixture();
  for (const mine of fixture.mines) fixture.board.flag(mine);
  fixture.board.question(fixture.safe[0]);
  const result = fixture.board.chord(fixture.index);
  assert.ok(['chord', 'win'].includes(result.kind));
  assert.equal(fixture.board.view().cells[fixture.safe[0]].questioned, false);

  const mismatch = chordFixture();
  for (const mine of mismatch.mines.slice(1)) mismatch.board.flag(mine);
  mismatch.board.question(mismatch.mines[0]);
  assert.equal(mismatch.board.chord(mismatch.index).reason, 'flags-mismatch');
});

for (const presetId of Object.keys(PRESETS)) {
  test(`${presetId}: active saves roundtrip, recompute clues, and continue with identical outcomes`, () => {
    const board = newPlayingBoard(presetId, 7);
    const hidden = indices(board.view().cells, cell => !cell.revealed);
    board.flag(hidden[0]);
    board.flag(hidden.at(-1));
    const saved = copy(board.serialize());
    const restored = restore(saved);
    assert.ok(restored);
    assert.deepEqual(restored.view(), board.view());
    assert.deepEqual(restored.serialize(), saved);
    assertInvariants(restored);
    const safe = indices(board.view().cells, cell => !cell.mine && !cell.flagged);
    for (const index of safe) {
      assert.deepEqual(restored.reveal(index), board.reveal(index));
      assert.deepEqual(restored.serialize(), board.serialize());
    }
    assert.deepEqual(restored.view(), board.view());
  });
}

test('restore accepts unsorted valid lists and serializes them in canonical board order', () => {
  const board = newPlayingBoard();
  for (const index of indices(board.view().cells, cell => cell.mine).slice(0, 3)) board.flag(index);
  const canonical = copy(board.serialize());
  const shuffled = copy(canonical);
  for (const field of ['mines', 'revealed', 'flags']) shuffled[field].reverse();
  const restored = restore(shuffled);
  assert.ok(restored);
  assert.deepEqual(restored.serialize(), canonical);
  assert.deepEqual(restored.view(), board.view());
});

test('serialized arrays and source save objects are independent of the live/restored board', () => {
  const board = newPlayingBoard();
  const before = copy(board.view());
  const saved = board.serialize();
  const restored = restore(saved);
  assert.ok(restored);
  saved.mines.length = 0;
  saved.revealed.push(80);
  saved.flags.push(80);
  assert.deepEqual(board.view(), before);
  assert.deepEqual(restored.view(), before);
  const mine = before.cells.findIndex(cell => cell.mine);
  restored.flag(mine);
  assert.equal(board.view().cells[mine].flagged, false);
});

test('corrupt saves are rejected without exceptions or mutation of the input', () => {
  const valid = copy(newPlayingBoard().serialize());
  const mine = valid.mines[0];
  const safeHidden = Array.from({ length: 81 }, (_, i) => i).find(i => !valid.mines.includes(i) && !valid.revealed.includes(i));
  const changed = patch => Object.assign(copy(valid), patch);
  const cases = [
    ['null', null], ['undefined', undefined], ['string', 'not a save'], ['number', 42], ['empty object', {}],
    ['wrong version', changed({ version: 2 })], ['string version', changed({ version: '1' })],
    ['missing preset', changed({ presetId: undefined })], ['unknown preset', changed({ presetId: 'not-a-preset' })],
    ['inherited preset key', changed({ presetId: '__proto__' })],
    ['unknown status', changed({ status: 'paused' })], ['terminal loss', changed({ status: 'lost' })], ['terminal win', changed({ status: 'won' })],
    ['invalid first index', changed({ firstIndex: 81 })], ['negative first index', changed({ firstIndex: -1 })],
    ['fractional first index', changed({ firstIndex: 0.5 })], ['string first index', changed({ firstIndex: '40' })],
    ['missing first index', changed({ firstIndex: null })], ['unrevealed first index', changed({ firstIndex: safeHidden })],
    ['no revealed cells', changed({ revealed: [] })], ['too few mines', changed({ mines: valid.mines.slice(1) })],
    ['too many mines', changed({ mines: [...valid.mines, safeHidden] })],
    ['revealed mine', changed({ revealed: [...valid.revealed, mine] })],
    ['revealed flagged cell', changed({ flags: [valid.revealed[0]] })],
    ['question overlaps a flag', changed({ flags: [safeHidden], questions: [safeHidden] })],
    ['revealed question cell', changed({ questions: [valid.revealed[0]] })],
    ['mine on first index', changed({ mines: [valid.firstIndex, ...valid.mines.slice(1)] })],
    ['mine beside first index', changed({ mines: [valid.firstIndex - 1, ...valid.mines.slice(1)] })],
    ['already solved playing save', changed({ revealed: Array.from({ length: 81 }, (_, i) => i).filter(i => !valid.mines.includes(i)) })]
  ];
  for (const field of ['mines', 'revealed', 'flags', 'questions']) {
    for (const value of [undefined, null, {}, '0,1', [81], [-1], [0.5], ['0'], [null], [NaN], [Infinity], [0, 0]]) {
      cases.push([`${field}: ${String(value)}`, changed({ [field]: value })]);
    }
  }
  const ready = create('pocket').serialize();
  for (const patch of [{ mines: [20] }, { revealed: [0] }, { firstIndex: 0 }, { firstIndex: undefined }, { status: 'playing' }]) {
    cases.push([`invalid ready save ${JSON.stringify(patch)}`, { ...copy(ready), ...patch }]);
  }
  for (const [label, saved] of cases) {
    // structuredClone preserves undefined and nonfinite numbers for mutation checks.
    const before = structuredClone(saved);
    let restored;
    assert.doesNotThrow(() => { restored = restore(saved); }, label);
    assert.equal(restored, null, label);
    assert.deepEqual(saved, before, `${label} mutated its input`);
  }
});

test('restore rejects sparse save arrays instead of creating inconsistent cell counts', () => {
  const ready = create('pocket').serialize();
  const sparseFlags = copy(ready);
  sparseFlags.flags = Array(1);
  assert.equal(restore(sparseFlags), null);
  const valid = newPlayingBoard().serialize();
  for (const field of ['mines', 'revealed', 'flags', 'questions']) {
    const corrupted = copy(valid);
    if (corrupted[field].length === 0) corrupted[field] = Array(1);
    else delete corrupted[field][0];
    assert.equal(restore(corrupted), null, `sparse ${field} must fail validation`);
  }
});

test('terminal saves are intentionally not resumable', () => {
  const lost = newPlayingBoard();
  lost.reveal(lost.view().cells.findIndex(cell => cell.mine));
  assert.equal(restore(copy(lost.serialize())), null);
  const won = newPlayingBoard();
  for (const i of indices(won.view().cells, cell => !cell.mine)) won.reveal(i);
  assert.equal(won.view().status, 'won');
  assert.equal(restore(copy(won.serialize())), null);
});

test('same seed and replay produce identical layouts, action results, and save files', () => {
  for (const presetId of Object.keys(PRESETS)) {
    for (const seed of [0, 1, 42, 0xdeadbeef]) {
      const left = create(presetId, seeded(seed));
      const right = create(presetId, seeded(seed));
      const random = seeded(seed ^ 0xaabbccdd);
      const size = left.view().cells.length;
      const actions = [['flag', 0], ['flag', size - 1], ['reveal', Math.floor(size / 2)], ['flag', 0]];
      for (let step = 0; step < 100; step++) {
        actions.push([['reveal', 'flag', 'chord'][Math.floor(random() * 3)], Math.floor(random() * size)]);
      }
      for (const [operation, index] of actions) {
        assert.deepEqual(left[operation](index), right[operation](index));
        assert.deepEqual(left.serialize(), right.serialize());
      }
      assert.deepEqual(left.view(), right.view());
      assertInvariants(left);
    }
  }
});

test('repeated fresh replays do not leak flags, status, clues, or cells across game instances', () => {
  const reference = create('pocket', seeded(123));
  reference.reveal(20);
  const expected = copy(reference.serialize());
  for (let iteration = 0; iteration < 40; iteration++) {
    const board = create('pocket', seeded(123));
    assert.equal(board.view().status, 'ready');
    assert.equal(board.view().flagCount, 0);
    board.reveal(20);
    assert.deepEqual(board.serialize(), expected);
    const mine = board.view().cells.findIndex(cell => cell.mine);
    board.flag(mine); board.flag(mine); board.reveal(mine);
    assert.equal(board.view().status, 'lost');
    assert.deepEqual(reference.serialize(), expected);
  }
});
