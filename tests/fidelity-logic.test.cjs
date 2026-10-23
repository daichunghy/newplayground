const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { harness } = require("./helpers/game-harness.cjs");

function load() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "scripts/fidelity-logic.js"),
      "utf8",
    ),
    h.context,
    { filename: "fidelity-logic.js" },
  );
  return h;
}
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
function countSudokuSolutions(model, puzzle, limit = 2) {
  const grid = plain(puzzle);
  function search() {
    let row = -1,
      col = -1;
    for (let r = 0; r < 9 && row < 0; r++)
      for (let c = 0; c < 9; c++)
        if (!grid[r][c]) {
          row = r;
          col = c;
          break;
        }
    if (row < 0) return 1;
    let count = 0;
    for (let value = 1; value <= 9; value++)
      if (model.canPlace({ grid }, row, col, value)) {
        grid[row][col] = value;
        count += search();
        grid[row][col] = 0;
        if (count >= limit) return count;
      }
    return count;
  }
  return search();
}
function fillModel(model, state, solution, skip = () => false) {
  for (let r = 0; r < solution.length; r++)
    for (let c = 0; c < solution[r].length; c++) {
      if (!skip(r, c))
        assert.equal(
          model.place
            ? model.place(state, r, c, solution[r][c])
            : model.set(state, r, c, solution[r][c]),
          true,
          "fill " + r + "," + c,
        );
    }
}

test("logic pack registers exactly ten distinct new games with pure models", () => {
  const h = load();
  const ids = h.context.NP_Fidelity.entries().map((x) => x.id);
  assert.deepEqual(plain(ids), [
    "sudoku-9x9",
    "nonogram-picross",
    "fifteen-puzzle",
    "lights-out",
    "mastermind-code",
    "takuzu-binary",
    "futoshiki-inequality",
    "kenken-cages",
    "slitherlink-loop",
    "hashi-bridges",
  ]);
  for (const id of ids) {
    const def = h.context.NP_Fidelity.get(id);
    assert.equal(def.newGame, true);
    assert.equal(typeof def.model.createGame, "function");
    assert.equal(typeof def.model.isSolved, "function");
    assert.equal(typeof def.launch, "function");
    assert.ok(def.reference.url.startsWith("https://"));
    assert.ok(def.catalog.aliases.length);
  }
});

test("Sudoku protects givens, rejects row/column/box duplicates, and accepts a valid filled grid", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("sudoku-9x9").model,
    s = m.createGame();
  assert.equal(m.place(s, 0, 0, 1), false, "given is immutable");
  assert.equal(m.place(s, 0, 2, 5), false, "row duplicate");
  assert.equal(m.place(s, 1, 1, 5), false, "box duplicate");
  assert.equal(m.isSolved(s), false);
  fillModel(m, s, s.solution, (r, c) => s.givens[r][c] !== 0);
  assert.equal(m.isSolved(s), true);
  assert.equal(countSudokuSolutions(m, s.givens), 1, "preset has one solution");
  assert.equal(
    countSudokuSolutions(m, m.createGame(1).givens),
    1,
    "shuffled preset retains uniqueness",
  );
  assert.notDeepEqual(
    plain(m.createGame(1).givens),
    plain(m.createGame(0).givens),
    "seed transforms a valid puzzle layout",
  );
});

test("Nonogram solves from row and column runs rather than a hidden picture comparison", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("nonogram-picross").model,
    s = m.createGame();
  const target = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  target.forEach((row, r) =>
    row.forEach((v, c) => assert.equal(m.setCell(s, r, c, v ? 1 : 2), true)),
  );
  assert.equal(m.isSolved(s), true);
  const bad = m.createGame();
  bad.cells[0] = [1, 1, 1, 1, 1];
  assert.equal(
    m.isSolved(bad),
    false,
    "clues, not a target-image shortcut, govern completion",
  );
  const preset = m.createGame(1);
  preset.target.forEach((row, r) =>
    row.forEach((v, c) => m.setCell(preset, r, c, v ? 1 : 2)),
  );
  assert.equal(m.isSolved(preset), true, "second verified preset");
});

test("15 puzzle accepts only adjacent slides and legal-move scramble reverses to solved", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("fifteen-puzzle").model,
    s = m.createGame(5);
  for (const tile of s.scramblePath.slice().reverse())
    assert.equal(
      m.move(s, tile),
      true,
      "scramble is reversible by legal slides",
    );
  assert.equal(m.isSolved(s), true);
  const started = m.createGame(5),
    b = started.board.indexOf(0),
    nonNeighbor = (b + 5) % 16;
  assert.equal(
    Math.abs((b % 4) - (nonNeighbor % 4)) +
      Math.abs(((b / 4) | 0) - ((nonNeighbor / 4) | 0)) ===
      1,
    false,
  );
  assert.equal(m.move(started, nonNeighbor), false);
  const adjacent = [
    b % 4 ? b - 1 : -1,
    b % 4 < 3 ? b + 1 : -1,
    b >= 4 ? b - 4 : -1,
    b < 12 ? b + 4 : -1,
  ].find((x) => x >= 0);
  assert.equal(m.move(started, adjacent), true);
  assert.equal(started.moves, 1);
  const won = m.createGame(5);
  won.board = Array.from({ length: 16 }, (_, i) => (i === 15 ? 0 : i + 1));
  assert.equal(m.isSolved(won), true);
  assert.equal(m.isSolved(started), false);
});

test("Lights Out toggles self and orthogonal neighbors and only all-off wins", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("lights-out").model,
    s = m.createGame();
  const before = plain(s.board);
  assert.equal(m.toggle(s, 2, 2), true);
  for (const [r, c] of [
    [2, 2],
    [1, 2],
    [3, 2],
    [2, 1],
    [2, 3],
  ])
    assert.equal(s.board[r][c], !before[r][c]);
  assert.equal(m.toggle(s, -1, 2), false);
  const replay = m.createGame();
  for (const [r, c] of replay.scramble) m.toggle(replay, r, c);
  assert.equal(
    m.isSolved(replay),
    true,
    "legal scramble toggles invert to all-off",
  );
  const won = m.createGame();
  won.board = Array.from({ length: 5 }, () => Array(5).fill(false));
  assert.equal(m.isSolved(won), true);
  assert.equal(m.isSolved(s), false);
});

test("Mastermind counts duplicates once, wins exactly, and stops after ten guesses", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("mastermind-code").model;
  const s = m.createGame([0, 0, 1, 1]);
  [0, 1, 0, 2].forEach((v, i) => m.choose(s, i, v));
  assert.deepEqual(plain(m.submit(s)), { exact: 1, color: 2, won: false });
  const win = m.createGame([2, 2, 5, 0]);
  [2, 2, 5, 0].forEach((v, i) => m.choose(win, i, v));
  assert.equal(m.submit(win).won, true);
  assert.equal(m.choose(win, 0, 4), false);
  const lost = m.createGame([5, 5, 5, 5]);
  for (let i = 0; i < 10; i++) {
    lost.guess = [0, 0, 0, 0];
    m.submit(lost);
  }
  assert.equal(lost.over, true);
  assert.equal(m.submit(lost), false);
});

test("Takuzu enforces balanced lines, no triples, and unique completed rows and columns", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("takuzu-binary").model,
    s = m.createGame();
  assert.equal(m.set(s, 0, 0, 1 - s.grid[0][0]), false, "given immutable");
  const partial = m.createGame();
  partial.givens = Array.from({ length: 6 }, () => Array(6).fill(false));
  partial.grid = Array.from({ length: 6 }, () => Array(6).fill(-1));
  assert.equal(m.set(partial, 0, 0, 1), true);
  assert.equal(m.set(partial, 0, 1, 1), true);
  assert.equal(m.set(partial, 0, 2, 1), false, "third equal bit forbidden");
  const solution = [
    "001011",
    "001101",
    "110010",
    "010011",
    "101100",
    "110100",
  ].map((x) => [...x].map(Number));
  const complete = m.createGame();
  complete.givens = Array.from({ length: 6 }, () => Array(6).fill(false));
  complete.grid = Array.from({ length: 6 }, () => Array(6).fill(-1));
  fillModel(m, complete, solution);
  assert.equal(m.isSolved(complete), true);
  const duplicateRow = m.createGame();
  duplicateRow.givens = Array.from({ length: 6 }, () => Array(6).fill(false));
  duplicateRow.grid = Array.from({ length: 6 }, () => Array(6).fill(-1));
  duplicateRow.grid[0] = solution[0].slice();
  duplicateRow.grid[1] = solution[0].slice(0, 5).concat(-1);
  assert.equal(
    m.legal(duplicateRow, 1, 5, solution[0][5]),
    false,
    "duplicate row blocked",
  );
  const duplicateColumn = m.createGame();
  duplicateColumn.givens = Array.from({ length: 6 }, () =>
    Array(6).fill(false),
  );
  duplicateColumn.grid = Array.from({ length: 6 }, () => Array(6).fill(-1));
  solution.forEach((row, r) => {
    duplicateColumn.grid[r][0] = row[0];
    if (r < 5) duplicateColumn.grid[r][1] = row[0];
  });
  assert.equal(
    m.legal(duplicateColumn, 5, 1, solution[5][0]),
    false,
    "duplicate column blocked",
  );
  const duplicate = m.createGame();
  duplicate.grid = solution.map((row) => row.slice());
  duplicate.grid[5] = duplicate.grid[0].slice();
  assert.equal(
    m.isSolved(duplicate),
    false,
    "identical complete rows are forbidden",
  );
});

test("Futoshiki requires a Latin completion satisfying every visible strict inequality", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("futoshiki-inequality").model,
    s = m.createGame();
  assert.equal(m.place(s, 0, 0, 2), false, "given immutable");
  assert.equal(m.place(s, 0, 1, 1), false, "row duplicate");
  fillModel(
    m,
    s,
    [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 1],
      [3, 4, 5, 1, 2],
      [4, 5, 1, 2, 3],
      [5, 1, 2, 3, 4],
    ],
    (r, c) => s.givens[r][c] !== 0,
  );
  assert.equal(m.isSolved(s), true);
  const wrong = m.createGame();
  wrong.grid = Array.from({ length: 5 }, () => Array(5).fill(1));
  assert.equal(m.isSolved(wrong), false);
});

test("KenKen accepts only Latin rows and columns satisfying all arithmetic cages", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("kenken-cages").model,
    s = m.createGame();
  assert.equal(m.place(s, 0, 0, 1), true);
  assert.equal(m.place(s, 0, 1, 1), false, "row duplicate");
  const full = m.createGame();
  fillModel(m, full, [
    [1, 2, 3, 4],
    [2, 3, 4, 1],
    [3, 4, 1, 2],
    [4, 1, 2, 3],
  ]);
  assert.equal(m.isSolved(full), true);
  const wrong = m.createGame();
  wrong.grid = [
    [1, 2, 3, 4],
    [2, 3, 4, 1],
    [3, 4, 1, 2],
    [4, 1, 2, 1],
  ];
  assert.equal(m.isSolved(wrong), false);
});

test("Slitherlink requires satisfied clues and one connected degree-two loop", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("slitherlink-loop").model,
    s = m.createGame();
  const inner = [
    "h1,1",
    "h1,2",
    "h3,1",
    "h3,2",
    "v1,1",
    "v2,1",
    "v1,3",
    "v2,3",
  ];
  for (const edge of inner) m.setEdge(s, edge, 1);
  assert.equal(m.isSolved(s), true);
  const disjoint = m.createGame();
  for (const edge of [
    ...inner,
    "h0,0",
    "h0,1",
    "h0,2",
    "h0,3",
    "h4,0",
    "h4,1",
    "h4,2",
    "h4,3",
    "v0,0",
    "v1,0",
    "v2,0",
    "v3,0",
    "v0,4",
    "v1,4",
    "v2,4",
    "v3,4",
  ])
    m.setEdge(disjoint, edge, 1);
  assert.equal(m.isSolved(disjoint), false, "second closed loop is not a win");
});

test("Hashi requires nearest islands, exact degrees, and one connected network", () => {
  const { context } = load(),
    m = context.NP_Fidelity.get("hashi-bridges").model,
    s = m.createGame();
  assert.equal(m.setBridge(s, 0, 2, 1), false, "cannot skip a nearer island");
  assert.equal(m.setBridge(s, 0, 1, 3), false, "at most two parallel bridges");
  for (const [a, b, count] of [
    [0, 1, 2],
    [1, 2, 1],
    [2, 5, 1],
    [5, 8, 1],
    [8, 7, 1],
    [7, 6, 1],
    [6, 3, 1],
    [3, 0, 1],
    [4, 1, 1],
    [4, 7, 1],
  ])
    assert.equal(m.setBridge(s, a, b, count), true);
  assert.equal(m.isSolved(s), true);
  const disconnected = m.createGame();
  disconnected.islands.forEach((i) => (i.need = 0));
  disconnected.islands[0].need = 1;
  disconnected.islands[1].need = 1;
  disconnected.islands[3].need = 1;
  disconnected.islands[4].need = 1;
  disconnected.bridges = { "0-1": 1, "3-4": 1 };
  assert.equal(
    m.isSolved(disconnected),
    false,
    "correct local counts in separate groups do not win",
  );
});

test("every logic game directly launches, draws a frame, pauses, resumes, and cleans up", () => {
  const h = load();
  const ids = h.context.NP_Fidelity.entries().map((x) => x.id);
  for (const id of ids) {
    const launched = h.context.NP_Fidelity.launch(h.container, {
      id,
      title: id,
    });
    assert.equal(typeof launched.session.pause, "function", id + " session");
    assert.ok(h.container.querySelector("canvas"), id + " canvas");
    assert.ok(
      h.container.querySelectorAll("button").length >= 1,
      id + " real controls",
    );
    h.frame(16);
    launched.session.pause();
    h.frame(16);
    launched.session.resume();
    h.frame(16);
    assert.deepEqual(h.errors, [], id + " browser errors");
    launched.session.stop();
    assert.equal(h.frames.size, 0, id + " frame cleanup");
    assert.equal(h.timers.size, 0, id + " timer cleanup");
    assert.equal(h.window.listenerCount(), 0, id + " listener cleanup");
  }
});

test("number, mode, color, and submit buttons perform visible UI actions", () => {
  const h = load(),
    api = h.context.NP_Fidelity;
  let x = api.launch(h.container, { id: "sudoku-9x9", title: "Sudoku" });
  let canvas = h.container.querySelector("canvas");
  canvas.dispatch("pointerdown", {
    clientX: 76 + 2 * 52 + 20,
    clientY: 35 + 52 + 20,
  });
  h.container
    .querySelectorAll("button")
    .find((b) => b.textContent === "4")
    .dispatch("click");
  assert.equal(x.state.grid[1][2], 4);
  x.session.stop();
  x = api.launch(h.container, { id: "nonogram-picross", title: "Picross" });
  canvas = h.container.querySelector("canvas");
  h.container
    .querySelectorAll("button")
    .find((b) => b.textContent === "Ván mới")
    .dispatch("click");
  assert.equal(
    x.state.target[0].join(""),
    "10101",
    "replay rotates to another verified preset",
  );
  h.container
    .querySelectorAll("button")
    .find((b) => b.textContent === "Tô đen")
    .dispatch("click");
  canvas.dispatch("pointerdown", { clientX: 110 + 2, clientY: 125 + 2 });
  assert.equal(x.state.cells[0][0], 1);
  h.container
    .querySelectorAll("button")
    .find((b) => b.textContent === "Đánh dấu trắng")
    .dispatch("click");
  canvas.dispatch("pointerdown", { clientX: 110 + 66 + 2, clientY: 125 + 2 });
  assert.equal(x.state.cells[0][1], 2);
  x.session.stop();
  x = api.launch(h.container, { id: "mastermind-code", title: "Mastermind" });
  h.container
    .querySelectorAll("button")
    .find((b) => b.textContent === "3 Lục")
    .dispatch("click");
  assert.equal(x.state.guess[0], 2);
  h.container
    .querySelectorAll("button")
    .find((b) => b.textContent === "Kiểm tra")
    .dispatch("click");
  assert.equal(x.state.rows.length, 1);
  x.session.stop();
});
