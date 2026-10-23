const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { harness, drawing } = require("./helpers/game-harness.cjs");

function load() {
  const h = harness({ loadEngines: false, loadApp: false });
  vm.runInContext(
    fs.readFileSync(
      require("node:path").resolve(__dirname, "../scripts/fidelity-board.js"),
      "utf8",
    ),
    h.context,
  );
  return h;
}
function model(h, id) {
  return h.context.NP_Fidelity.get(id).model;
}

test("Reversi forces a pass and ends when neither color can move", () => {
  const h = load(),
    m = model(h, "reversi-othello"),
    s = m.create();
  assert.equal(m.legalMoves(s).length, 4);
  s.board.fill(1);
  s.board[1] = 0;
  s.board[2] = 2;
  s.turn = 1;
  assert.equal(m.play(s, 0, 1), true);
  assert.equal(s.turn, 1);
  assert.equal(s.over, true);
  assert.equal(s.winner, 1);
});

test("Reversi passes a blocked side without ending and lets the mover continue", () => {
  const h = load(),
    m = model(h, "reversi-othello"),
    s = m.create();
  s.board.fill(1);
  for (const index of [0, 24, 56]) s.board[index] = 0;
  for (const index of [1, 25, 57]) s.board[index] = 2;
  s.turn = 1;
  assert.equal(m.play(s, 0, 0), true);
  assert.equal(s.over, false);
  assert.equal(s.turn, 1);
  assert.equal(s.passes, 1);
  assert.equal(m.play(s, 3, 0), true);
  assert.equal(s.over, false);
  assert.equal(s.turn, 1);
  assert.equal(m.play(s, 7, 0), true);
  assert.equal(s.over, true);
});

test("Checkers enforces compulsory capture and capture continuation", () => {
  const h = load(),
    m = model(h, "checkers-draughts"),
    s = m.create();
  s.board = Array(64).fill(0);
  s.turn = 1;
  s.board[42] = 1;
  s.board[35] = -1;
  s.board[21] = -1;
  s.board[56] = 1;
  assert.equal(m.move(s, 56, 49), false);
  assert.equal(m.move(s, 42, 28), true);
  assert.equal(s.turn, 1);
  assert.equal(s.forced, 28);
  assert.equal(m.move(s, 28, 14), true);
  assert.equal(s.turn, -1);
});

test("English checkers crowns on a jump and ends that capture turn immediately", () => {
  const h = load(),
    m = model(h, "checkers-draughts"),
    s = m.create();
  s.board = Array(64).fill(0);
  s.board[17] = 1;
  s.board[10] = -1;
  s.board[12] = -1;
  s.turn = 1;
  assert.equal(m.move(s, 17, 3), true);
  assert.equal(s.board[3], 2);
  assert.equal(s.board[10], 0);
  assert.equal(s.turn, -1);
  assert.equal(s.forced, null);
  assert.equal(s.over, false);
});

test("Connect Four detects diagonal wins and rejects full columns", () => {
  const h = load(),
    m = model(h, "connect-four"),
    s = m.create();
  s.board[5][0] = 1;
  s.board[5][1] = -1;
  s.board[4][1] = 1;
  s.board[5][2] = -1;
  s.board[4][2] = -1;
  s.board[3][2] = 1;
  s.board[5][3] = -1;
  s.board[4][3] = 1;
  s.board[3][3] = -1;
  s.turn = 1;
  assert.equal(m.drop(s, 3), true);
  assert.equal(s.winner, 1);
  const gravity = m.create();
  assert.equal(m.drop(gravity, 0), true);
  assert.equal(gravity.board[5][0], 1);
  const full = m.create();
  for (let i = 0; i < 6; i++) {
    full.board[i][0] = 1;
    full.board[i][1] = -1;
  }
  full.turn = 1;
  assert.equal(m.drop(full, 0), false);
});

test("Chess protects a pinned rook, forbids castling through check, and expires en passant", () => {
  const h = load(),
    m = model(h, "chess-classic"),
    s = m.create();
  s.board = m.fromRows([
    "k...r...",
    "........",
    "........",
    "........",
    "........",
    "........",
    "....R...",
    "....K..R",
  ]);
  s.turn = "w";
  assert.equal(m.move(s, 6, 4, 6, 5), false);
  const castle = m.create();
  castle.board = m.fromRows([
    "k...r...",
    "........",
    "........",
    "........",
    "........",
    "........",
    "........",
    "R...K..R",
  ]);
  castle.turn = "w";
  assert.equal(m.move(castle, 7, 4, 7, 6), false);
  const ep = m.create();
  ep.board = m.fromRows([
    "k.......",
    "........",
    "........",
    "...pP...",
    "........",
    "........",
    "........",
    "....K...",
  ]);
  ep.turn = "w";
  ep.ep = [2, 3];
  assert.equal(m.move(ep, 3, 4, 2, 3), true);
  assert.equal(ep.board[3][3], ".");
  const expired = m.create();
  expired.board = m.fromRows([
    "k.......",
    "........",
    "........",
    "...pP...",
    "........",
    "........",
    "........",
    "....K...",
  ]);
  expired.turn = "w";
  expired.ep = [2, 3];
  assert.equal(m.move(expired, 7, 4, 7, 3), true);
  assert.equal(m.move(expired, 0, 0, 0, 1), true);
  assert.equal(m.move(expired, 3, 4, 2, 3), false);
});

test("Chess castles legally and recognizes checkmate without taking the king", () => {
  const h = load(),
    m = model(h, "chess-classic"),
    s = m.create();
  s.board = m.fromRows([
    "k.......",
    "........",
    "........",
    "........",
    "........",
    "........",
    "........",
    "R...K..R",
  ]);
  s.turn = "w";
  assert.equal(m.move(s, 7, 4, 7, 6), true);
  assert.equal(s.board[7][5], "R");
  const mate = m.create();
  for (const move of [
    [6, 5, 5, 5],
    [1, 4, 3, 4],
    [6, 6, 4, 6],
    [0, 3, 4, 7],
  ])
    assert.equal(m.move(mate, ...move), true);
  assert.equal(mate.over, true);
  assert.equal(mate.reason, "checkmate");
  assert.equal(mate.winner, "b");
  assert.equal(m.move(mate, 7, 4, 6, 4), false);
  const dead = m.create();
  dead.board = m.fromRows([
    "k.......",
    "........",
    "........",
    "........",
    "........",
    "........",
    "........",
    "....K...",
  ]);
  dead.turn = "w";
  assert.equal(m.insufficientMaterial(dead), true);
  const pinnedEnPassant = m.create();
  pinnedEnPassant.board = m.fromRows([
    "k...r...",
    "........",
    "........",
    "...pP...",
    "........",
    "........",
    "........",
    "....K...",
  ]);
  pinnedEnPassant.turn = "w";
  pinnedEnPassant.ep = [2, 3];
  assert.equal(m.move(pinnedEnPassant, 3, 4, 2, 3), false);
});

test("Morris removes outside a mill first and captures after a formed mill", () => {
  const h = load(),
    m = model(h, "nine-mens-morris"),
    s = m.create();
  s.phase = "place";
  s.placed = [8, 9];
  s.board[0] = 1;
  s.board[1] = 1;
  s.board[2] = 0;
  s.board[3] = -1;
  s.board[11] = -1;
  s.board[19] = -1;
  s.board[8] = -1;
  assert.equal(m.move(s, null, 2), true);
  assert.equal(s.capturePending, true);
  assert.equal(m.remove(s, 3), false);
  assert.equal(m.remove(s, 8), true);
});

test("Kalah captures opposite seeds and sweeps an empty side", () => {
  const h = load(),
    m = model(h, "kalah-mancala"),
    s = m.create();
  s.pits = Array(14).fill(0);
  s.pits[2] = 1;
  s.pits[8] = 4;
  s.turn = 0;
  s.pits[9] = 4;
  assert.equal(m.sow(s, 2), true);
  assert.equal(s.pits[6], 5);
  assert.equal(s.pits[9], 0);
  const extra = m.create();
  extra.pits = Array(14).fill(0);
  extra.pits[0] = 6;
  extra.pits[7] = 2;
  extra.turn = 0;
  assert.equal(m.sow(extra, 0), true);
  assert.equal(extra.pits[6], 1);
  assert.equal(extra.turn, 0);
  const sweep = m.create();
  sweep.pits = Array(14).fill(0);
  sweep.pits[5] = 1;
  sweep.pits[7] = 3;
  sweep.turn = 0;
  assert.equal(m.sow(sweep, 5), true);
  assert.equal(sweep.over, true);
  assert.equal(sweep.pits[13], 3);
  assert.equal(sweep.winner, 1);
});

test("Hex finds six-neighbor side connectivity and Nim rejects a two-heap move", () => {
  const h = load(),
    hex = model(h, "hex-board"),
    s = hex.create();
  for (let r = 0; r < 7; r++) s.board[r * 7] = 1;
  assert.equal(hex.place(s, 0, 0), false);
  assert.equal(hex.winner(s), 1);
  const n = model(h, "nim-heaps"),
    ns = n.create();
  assert.equal(n.remove(ns, [2, 0], [1, 1]), false);
  assert.equal(ns.heaps.join(","), "3,5,7");
  assert.equal(n.remove(ns, [[2, 7]]), true);
  assert.equal(ns.heaps.join(","), "3,5,0");
  assert.equal(n.remove(ns, [[1, 5]]), true);
  assert.equal(ns.heaps.join(","), "3,0,0");
  assert.equal(n.remove(ns, [[0, 3]]), true);
  assert.equal(ns.over, true);
  assert.equal(ns.winner, 0);
});

test("Dots and Boxes awards two adjacent boxes on one edge", () => {
  const h = load(),
    m = model(h, "dots-and-boxes"),
    s = m.create();
  for (const e of ["v,1,0", "v,1,2", "h,1,0", "h,2,0", "h,1,1", "h,2,1"])
    assert.equal(m.draw(s, e), true);
  assert.equal(m.draw(s, "v,1,1"), true);
  assert.equal(s.scores[0], 2);
  assert.equal(s.turn, 0);
});

test("Battleship rejects repeated shots and recognizes sunk ships", () => {
  const h = load(),
    m = model(h, "battleship-fleet");
  let seed = 7;
  const s = m.create(() => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  });
  s.ownShips = [{ length: 1, cells: [[9, 9]], hits: [] }];
  s.enemyShips = [
    {
      length: 2,
      cells: [
        [0, 0],
        [0, 1],
      ],
      hits: [],
    },
  ];
  const ship = s.enemyShips[0];
  for (const cell of ship.cells) {
    if (s.turn === "bot") m.botShot(s);
    assert.equal(m.shoot(s, cell[0], cell[1]), true);
  }
  assert.equal(s.lastShot.sunk, ship.length);
  assert.equal(m.shoot(s, ship.cells[0][0], ship.cells[0][1]), false);
});

test("all ten registrations launch, draw a frame, and stop cleanly", () => {
  const h = load();
  const ids = [
    "reversi-othello",
    "checkers-draughts",
    "connect-four",
    "chess-classic",
    "nine-mens-morris",
    "kalah-mancala",
    "hex-board",
    "nim-heaps",
    "dots-and-boxes",
    "battleship-fleet",
  ];
  assert.deepEqual(
    [...h.context.NP_Fidelity.entries()].map((x) => x.id),
    ids,
  );
  for (const id of ids) {
    const stage = h.context.NP_Fidelity.launch(h.container, { id, title: id });
    assert.ok(h.container.children.length);
    h.frame();
    const buttons = h.container.querySelectorAll("button");
    assert.ok(buttons.length > 0, `${id} has visible controls`);
    buttons
      .find((button) => button.textContent === "Ván mới")
      .dispatch("click");
    assert.equal(stage.session.isActive(), true);
    stage.session.pause();
    assert.equal(stage.session.isPaused(), true);
    stage.session.resume();
    assert.equal(stage.session.isPaused(), false);
    stage.session.stop();
    assert.equal(stage.session.isActive(), false);
    assert.equal(h.frames.size, 0, `${id} releases its frame loop`);
    const fidelity = h.context.NP_Fidelity.get(id);
    assert.equal(typeof fidelity.model.create, "function");
    // Core retains no public current session; closing by starting a new stage runs cleanup.
    if (id === "battleship-fleet") {
      /* all launch resources are session-bound */
    }
  }
  assert.deepEqual(h.errors, []);
});

test("visible buttons and pointer paths perform real moves for all ten games", () => {
  const h = load();
  const click = (id, x, y) => {
    const stage = h.context.NP_Fidelity.launch(h.container, { id, title: id });
    stage.canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 720,
      height: 600,
    });
    stage.canvas.dispatch("pointerdown", { clientX: x, clientY: y });
    const status = h.container.querySelector(".np-fidelity-status").textContent;
    stage.session.stop();
    return status;
  };
  assert.match(click("reversi-othello", 277, 247), /Trắng/);
  const checkers = h.context.NP_Fidelity.launch(h.container, {
    id: "checkers-draughts",
    title: "checkers",
  });
  checkers.canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 720,
    height: 600,
  });
  checkers.canvas.dispatch("pointerdown", { clientX: 167, clientY: 357 });
  checkers.canvas.dispatch("pointerdown", { clientX: 222, clientY: 302 });
  assert.match(
    h.container.querySelector(".np-fidelity-status").textContent,
    /Đen/,
  );
  checkers.session.stop();
  assert.match(click("connect-four", 100, 100), /Vàng/);
  const chess = h.context.NP_Fidelity.launch(h.container, {
    id: "chess-classic",
    title: "chess",
  });
  chess.canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 720,
    height: 600,
  });
  chess.canvas.dispatch("pointerdown", { clientX: 387, clientY: 412 });
  chess.canvas.dispatch("pointerdown", { clientX: 387, clientY: 302 });
  assert.match(
    h.container.querySelector(".np-fidelity-status").textContent,
    /Đen/,
  );
  chess.session.stop();
  assert.match(click("nine-mens-morris", 130, 100), /Đen/);
  assert.match(click("kalah-mancala", 180, 345), /người chơi 2/);
  assert.match(click("hex-board", 317, 90), /Đỏ/);
  const nim = h.context.NP_Fidelity.launch(h.container, {
    id: "nim-heaps",
    title: "nim",
  });
  for (const label of ["Chọn đống 1", "Chọn lấy 1", "Lấy đã chọn"])
    h.container
      .querySelectorAll("button")
      .find((button) => button.textContent === label)
      .dispatch("click");
  assert.match(
    h.container.querySelector(".np-fidelity-status").textContent,
    /người chơi 2/,
  );
  nim.session.stop();
  assert.match(click("dots-and-boxes", 220, 100), /người chơi 2/);
  assert.match(click("battleship-fleet", 385, 135), /Bạn bắn [A-J](10|[1-9])/);
  assert.deepEqual(h.errors, []);
});

test("Kalah pit visuals and pointer target change the same pit and leave the correct turn", () => {
  const h = load(),
    m = model(h, "kalah-mancala"),
    fillText = drawing.fillText,
    drawnText = [];
  drawing.fillText = (...args) => drawnText.push(args);
  const create = m.create;
  m.create = () => {
    const state = create();
    state.pits[5] = 6;
    return state;
  };
  let chosen = null;
  let afterSow = null;
  const sowSide = m.sowSide;
  m.sowSide = (state, side, pit) => {
    chosen = { side, pit };
    const accepted = sowSide(state, side, pit);
    afterSow = state.pits.slice();
    return accepted;
  };
  const stage = h.context.NP_Fidelity.launch(h.container, {
    id: "kalah-mancala",
    title: "Kalah",
  });
  stage.canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 720,
    height: 600,
  });
  assert.ok(
    drawnText.some(([label, x, y]) => label === "6" && x === 180 && y === 352),
    "the lower-left visible pit displays pits[5]",
  );
  stage.canvas.dispatch("pointerdown", { clientX: 180, clientY: 345 });
  assert.deepEqual(chosen, { side: 0, pit: 5 });
  assert.deepEqual(
    Array.from(afterSow),
    [4, 4, 4, 4, 4, 0, 1, 5, 5, 5, 5, 5, 4, 0],
  );
  assert.match(
    h.container.querySelector(".np-fidelity-status").textContent,
    /Lượt người chơi 2/,
  );
  stage.session.stop();
  drawing.fillText = fillText;
  m.create = create;
});
