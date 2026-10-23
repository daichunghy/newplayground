/** Ten clean-room board-game implementations for the NewPlayground fidelity pack. */
(function () {
  "use strict";

  const own = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function createReversi() {
    return {
      board: Array(64).fill(0),
      turn: 1,
      over: false,
      winner: 0,
      passes: 0,
    };
  }
  function reversiMoves(state, color = state.turn) {
    const result = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const at = r * 8 + c;
        if (state.board[at]) continue;
        const flips = [];
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            let rr = r + dr,
              cc = c + dc,
              ray = [];
            while (
              rr >= 0 &&
              rr < 8 &&
              cc >= 0 &&
              cc < 8 &&
              state.board[rr * 8 + cc] === (color === 1 ? 2 : 1)
            ) {
              ray.push(rr * 8 + cc);
              rr += dr;
              cc += dc;
            }
            if (
              ray.length &&
              rr >= 0 &&
              rr < 8 &&
              cc >= 0 &&
              cc < 8 &&
              state.board[rr * 8 + cc] === color
            )
              flips.push(...ray);
          }
        if (flips.length) result.push({ row: r, col: c, flips });
      }
    return result;
  }
  const reversi = {
    create() {
      const s = createReversi();
      s.board[27] = 2;
      s.board[28] = 1;
      s.board[35] = 1;
      s.board[36] = 2;
      return s;
    },
    legalMoves: reversiMoves,
    play(s, r, c) {
      if (s.over || !reversiMoves(s).length) return false;
      const move = reversiMoves(s).find((x) => x.row === r && x.col === c);
      if (!move) return false;
      s.board[r * 8 + c] = s.turn;
      for (const at of move.flips) s.board[at] = s.turn;
      s.passes = 0;
      s.turn = 3 - s.turn;
      if (!reversiMoves(s).length) {
        s.turn = 3 - s.turn;
        s.passes = 1;
        if (!reversiMoves(s).length || s.board.every(Boolean)) endReversi(s);
      }
      return true;
    },
    pass(s) {
      if (s.over || reversiMoves(s).length) return false;
      s.turn = 3 - s.turn;
      s.passes++;
      if (s.passes >= 2 || !reversiMoves(s).length) endReversi(s);
      return true;
    },
    score(s) {
      return [
        s.board.filter((x) => x === 1).length,
        s.board.filter((x) => x === 2).length,
      ];
    },
  };
  function endReversi(s) {
    s.over = true;
    const [black, white] = reversi.score(s);
    s.winner = black === white ? 0 : black > white ? 1 : 2;
  }

  function checkersMoves(s, side = s.turn) {
    const moves = [];
    const captures = [];
    for (let i = 0; i < 64; i++) {
      const piece = s.board[i];
      if (
        !piece ||
        Math.sign(piece) !== side ||
        (s.forced !== null && i !== s.forced)
      )
        continue;
      const r = Math.floor(i / 8),
        c = i % 8,
        king = Math.abs(piece) === 2;
      const dirs = king ? [-1, 1] : [side === 1 ? -1 : 1];
      for (const dr of dirs)
        for (const dc of [-1, 1]) {
          const rr = r + dr,
            cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const to = rr * 8 + cc;
          if (!s.board[to]) moves.push({ from: i, to, capture: null });
          else if (Math.sign(s.board[to]) === -side) {
            const tr = rr + dr,
              tc = cc + dc;
            if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !s.board[tr * 8 + tc])
              captures.push({ from: i, to: tr * 8 + tc, capture: to });
          }
        }
    }
    if (s.forced !== null) return captures.length ? captures : moves;
    return captures.length ? captures : moves;
  }
  const checkers = {
    create() {
      const board = Array(64).fill(0);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 8; c++) if ((r + c) % 2) board[r * 8 + c] = -1;
      for (let r = 5; r < 8; r++)
        for (let c = 0; c < 8; c++) if ((r + c) % 2) board[r * 8 + c] = 1;
      return {
        board,
        turn: 1,
        forced: null,
        over: false,
        winner: 0,
        drawOffered: false,
        draw: false,
      };
    },
    legalMoves: checkersMoves,
    move(s, from, to) {
      if (s.over) return false;
      const move = checkersMoves(s).find((x) => x.from === from && x.to === to);
      if (!move) return false;
      let piece = s.board[from];
      s.board[from] = 0;
      if (move.capture !== null) s.board[move.capture] = 0;
      const row = Math.floor(to / 8),
        crowned =
          Math.abs(piece) === 1 &&
          ((piece > 0 && row === 0) || (piece < 0 && row === 7));
      if (crowned) piece = Math.sign(piece) * 2;
      s.board[to] = piece;
      if (move.capture !== null && !crowned) {
        s.forced = to;
        if (checkersMoves(s).some((x) => x.capture !== null)) return true;
      }
      s.forced = null;
      s.turn *= -1;
      s.drawOffered = false;
      if (!checkersMoves(s).length) {
        s.over = true;
        s.winner = s.turn * -1;
      }
      return true;
    },
    offerDraw(s) {
      if (s.over) return false;
      s.drawOffered = true;
      return true;
    },
    acceptDraw(s) {
      if (s.over || !s.drawOffered) return false;
      s.draw = true;
      s.over = true;
      s.winner = 0;
      return true;
    },
  };

  const connect4 = {
    create() {
      return {
        board: Array.from({ length: 6 }, () => Array(7).fill(0)),
        turn: 1,
        over: false,
        winner: 0,
        moves: 0,
      };
    },
    drop(s, column) {
      if (s.over || !Number.isInteger(column) || column < 0 || column > 6)
        return false;
      let row = -1;
      for (let r = 5; r >= 0; r--) {
        if (!s.board[r][column]) {
          row = r;
          break;
        }
      }
      if (row < 0) return false;
      s.board[row][column] = s.turn;
      s.moves++;
      if (hasFour(s.board, row, column, s.turn)) {
        s.over = true;
        s.winner = s.turn;
      } else if (s.moves === 42) s.over = true;
      else s.turn *= -1;
      return true;
    },
  };
  function hasFour(board, r, c, color) {
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ]) {
      let count = 1;
      for (const sign of [-1, 1]) {
        let rr = r + dr * sign,
          cc = c + dc * sign;
        while (board[rr]?.[cc] === color) {
          count++;
          rr += dr * sign;
          cc += dc * sign;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }

  // Chess uses a complete local legal-move generator; board rows are strings of piece codes.
  function chessCreate() {
    return {
      board: [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        Array(8).fill("p"),
        ...Array.from({ length: 4 }, () => Array(8).fill(".")),
        Array(8).fill("P"),
        ["R", "N", "B", "Q", "K", "B", "N", "R"],
      ],
      turn: "w",
      castling: "KQkq",
      ep: null,
      halfmove: 0,
      fullmove: 1,
      repetition: {},
      over: false,
      winner: null,
      reason: "",
    };
  }
  function sideOf(piece) {
    return piece === "." ? null : piece === piece.toUpperCase() ? "w" : "b";
  }
  function inside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }
  function chessAttack(s, r, c, by) {
    const pawnRow = r + (by === "w" ? 1 : -1);
    for (const dc of [-1, 1])
      if (
        inside(pawnRow, c + dc) &&
        s.board[pawnRow][c + dc] === (by === "w" ? "P" : "p")
      )
        return true;
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ])
      if (
        inside(r + dr, c + dc) &&
        s.board[r + dr][c + dc] === (by === "w" ? "N" : "n")
      )
        return true;
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ]) {
      let rr = r + dr,
        cc = c + dc,
        distance = 1;
      while (inside(rr, cc)) {
        const p = s.board[rr][cc];
        if (p !== ".") {
          if (
            sideOf(p) === by &&
            (p.toLowerCase() === "q" ||
              (distance === 1 && p.toLowerCase() === "k") ||
              (dr === 0 || dc === 0
                ? p.toLowerCase() === "r"
                : p.toLowerCase() === "b"))
          )
            return true;
          break;
        }
        rr += dr;
        cc += dc;
        distance++;
      }
    }
    return false;
  }
  function kingSquare(s, side) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (s.board[r][c] === (side === "w" ? "K" : "k")) return [r, c];
    return null;
  }
  function inCheck(s, side) {
    const k = kingSquare(s, side);
    return !k || chessAttack(s, k[0], k[1], side === "w" ? "b" : "w");
  }
  function pseudoMoves(s, side = s.turn) {
    const moves = [];
    const add = (from, to, extra = {}) => moves.push({ from, to, ...extra });
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = s.board[r][c];
        if (p === "." || sideOf(p) !== side) continue;
        const type = p.toLowerCase(),
          dir = side === "w" ? -1 : 1;
        if (type === "p") {
          const nr = r + dir;
          if (inside(nr, c) && s.board[nr][c] === ".") {
            if (nr === 0 || nr === 7)
              for (const promotion of ["q", "r", "b", "n"])
                add([r, c], [nr, c], { promotion });
            else add([r, c], [nr, c]);
            const start = side === "w" ? 6 : 1;
            if (r === start && s.board[nr + dir][c] === ".")
              add([r, c], [nr + dir, c]);
          }
          for (const dc of [-1, 1])
            if (inside(nr, c + dc)) {
              const target = s.board[nr][c + dc];
              if (
                (target !== "." &&
                  sideOf(target) !== side &&
                  target.toLowerCase() !== "k") ||
                (target === "." && s.ep && s.ep[0] === nr && s.ep[1] === c + dc)
              ) {
                const extra = target === "." ? { enPassant: true } : {};
                if (nr === 0 || nr === 7)
                  for (const promotion of ["q", "r", "b", "n"])
                    add([r, c], [nr, c + dc], { ...extra, promotion });
                else add([r, c], [nr, c + dc], extra);
              }
            }
        } else if (type === "n") {
          for (const [dr, dc] of [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1],
          ]) {
            const nr = r + dr,
              nc = c + dc;
            if (
              inside(nr, nc) &&
              sideOf(s.board[nr][nc]) !== side &&
              s.board[nr][nc].toLowerCase() !== "k"
            )
              add([r, c], [nr, nc]);
          }
        } else {
          const dirs =
            type === "b"
              ? [
                  [-1, -1],
                  [-1, 1],
                  [1, -1],
                  [1, 1],
                ]
              : type === "r"
                ? [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                  ]
                : [
                    [-1, -1],
                    [-1, 0],
                    [-1, 1],
                    [0, -1],
                    [0, 1],
                    [1, -1],
                    [1, 0],
                    [1, 1],
                  ];
          for (const [dr, dc] of dirs) {
            let nr = r + dr,
              nc = c + dc;
            while (inside(nr, nc)) {
              if (sideOf(s.board[nr][nc]) === side) break;
              if (
                s.board[nr][nc] === "." ||
                s.board[nr][nc].toLowerCase() !== "k"
              )
                add([r, c], [nr, nc]);
              if (s.board[nr][nc] !== ".") break;
              nr += dr;
              nc += dc;
              if (type === "k") break;
            }
          }
          if (type === "k" && !inCheck(s, side)) {
            const row = side === "w" ? 7 : 0,
              enemy = side === "w" ? "b" : "w";
            if (
              r === row &&
              c === 4 &&
              s.castling.includes(side === "w" ? "K" : "k") &&
              s.board[row][5] === "." &&
              s.board[row][6] === "." &&
              s.board[row][7] === (side === "w" ? "R" : "r") &&
              !chessAttack(s, row, 5, enemy) &&
              !chessAttack(s, row, 6, enemy)
            )
              add([r, c], [row, 6], { castle: "king" });
            if (
              r === row &&
              c === 4 &&
              s.castling.includes(side === "w" ? "Q" : "q") &&
              s.board[row][1] === "." &&
              s.board[row][2] === "." &&
              s.board[row][3] === "." &&
              s.board[row][0] === (side === "w" ? "R" : "r") &&
              !chessAttack(s, row, 3, enemy) &&
              !chessAttack(s, row, 2, enemy)
            )
              add([r, c], [row, 2], { castle: "queen" });
          }
        }
      }
    return moves;
  }
  function applyChessMove(s, m) {
    const [[fr, fc], [tr, tc]] = [m.from, m.to],
      piece = s.board[fr][fc],
      captured = s.board[tr][tc];
    s.board[fr][fc] = ".";
    if (m.enPassant) s.board[tr + (sideOf(piece) === "w" ? 1 : -1)][tc] = ".";
    s.board[tr][tc] = m.promotion
      ? sideOf(piece) === "w"
        ? m.promotion.toUpperCase()
        : m.promotion
      : piece;
    if (m.castle === "king") {
      s.board[tr][5] = s.board[tr][7];
      s.board[tr][7] = ".";
    }
    if (m.castle === "queen") {
      s.board[tr][3] = s.board[tr][0];
      s.board[tr][0] = ".";
    }
    s.castling = s.castling.replace(
      fr === 7 && fc === 4 ? /[KQ]/g : fr === 0 && fc === 4 ? /[kq]/g : /x/g,
      "",
    );
    if (piece.toLowerCase() === "r" && fr === 7 && fc === 0)
      s.castling = s.castling.replace("Q", "");
    if (piece.toLowerCase() === "r" && fr === 7 && fc === 7)
      s.castling = s.castling.replace("K", "");
    if (piece.toLowerCase() === "r" && fr === 0 && fc === 0)
      s.castling = s.castling.replace("q", "");
    if (piece.toLowerCase() === "r" && fr === 0 && fc === 7)
      s.castling = s.castling.replace("k", "");
    if (captured.toLowerCase() === "r" && tr === 7 && tc === 0)
      s.castling = s.castling.replace("Q", "");
    if (captured.toLowerCase() === "r" && tr === 7 && tc === 7)
      s.castling = s.castling.replace("K", "");
    if (captured.toLowerCase() === "r" && tr === 0 && tc === 0)
      s.castling = s.castling.replace("q", "");
    if (captured.toLowerCase() === "r" && tr === 0 && tc === 7)
      s.castling = s.castling.replace("k", "");
    s.ep =
      piece.toLowerCase() === "p" && Math.abs(tr - fr) === 2
        ? [(tr + fr) / 2, fc]
        : null;
    s.halfmove =
      piece.toLowerCase() === "p" || captured !== "." ? 0 : s.halfmove + 1;
    if (s.turn === "b") s.fullmove++;
    s.turn = s.turn === "w" ? "b" : "w";
    const key = chessKey(s);
    s.repetition[key] = (s.repetition[key] || 0) + 1;
    const legal = legalChessMoves(s);
    if (!legal.length) {
      s.over = true;
      s.winner = inCheck(s, s.turn) ? (s.turn === "w" ? "b" : "w") : null;
      s.reason = s.winner ? "checkmate" : "stalemate";
    } else if (s.halfmove >= 150) {
      s.over = true;
      s.reason = "75-move rule";
    } else if (s.repetition[key] >= 5) {
      s.over = true;
      s.reason = "fivefold repetition";
    } else if (insufficientMaterial(s)) {
      s.over = true;
      s.reason = "insufficient material";
    }
    return true;
  }
  function chessKey(s) {
    let effectiveEnPassant = "-";
    if (s.ep) {
      const canCaptureEnPassant = pseudoMoves(s).some((move) => {
        if (!move.enPassant) return false;
        const copy = clone(s);
        applyChessMoveNoEnd(copy, move);
        return !inCheck(copy, s.turn);
      });
      if (canCaptureEnPassant) effectiveEnPassant = s.ep.join(",");
    }
    return (
      s.board.map((r) => r.join("")).join("/") +
      " " +
      s.turn +
      " " +
      s.castling +
      " " +
      effectiveEnPassant
    );
  }
  function insufficientMaterial(s) {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = s.board[r][c];
        if (piece !== "." && piece.toLowerCase() !== "k")
          pieces.push({ piece, r, c });
      }
    }
    if (
      pieces.some(({ piece }) => ["p", "r", "q"].includes(piece.toLowerCase()))
    )
      return false;
    if (pieces.length <= 1) return true;
    return (
      pieces.every(({ piece }) => piece.toLowerCase() === "b") &&
      pieces.every(
        ({ r, c }) => (r + c) % 2 === (pieces[0].r + pieces[0].c) % 2,
      )
    );
  }
  function legalChessMoves(s) {
    return pseudoMoves(s).filter((m) => {
      const copy = clone(s);
      applyChessMoveNoEnd(copy, m);
      return !inCheck(copy, s.turn);
    });
  }
  function applyChessMoveNoEnd(s, m) {
    const [[fr, fc], [tr, tc]] = [m.from, m.to],
      piece = s.board[fr][fc];
    s.board[fr][fc] = ".";
    if (m.enPassant) s.board[tr + (sideOf(piece) === "w" ? 1 : -1)][tc] = ".";
    s.board[tr][tc] = m.promotion
      ? sideOf(piece) === "w"
        ? m.promotion.toUpperCase()
        : m.promotion
      : piece;
    if (m.castle === "king") {
      s.board[tr][5] = s.board[tr][7];
      s.board[tr][7] = ".";
    }
    if (m.castle === "queen") {
      s.board[tr][3] = s.board[tr][0];
      s.board[tr][0] = ".";
    }
  }
  const chess = {
    create() {
      const s = chessCreate();
      s.repetition[chessKey(s)] = 1;
      return s;
    },
    fromRows(rows) {
      return rows.map((x) => x.replace(/\s/g, "").split(""));
    },
    inCheck,
    insufficientMaterial,
    legalMoves: legalChessMoves,
    move(s, fr, fc, tr, tc, promotion = "q") {
      if (s.over) return false;
      const m = legalChessMoves(s).find(
        (x) =>
          x.from[0] === fr &&
          x.from[1] === fc &&
          x.to[0] === tr &&
          x.to[1] === tc &&
          (!x.promotion || x.promotion === promotion),
      );
      return m ? applyChessMove(s, m) : false;
    },
    claimDraw(s) {
      if (s.over) return false;
      const count = s.repetition[chessKey(s)] || 0;
      if (count >= 3 || s.halfmove >= 100) {
        s.over = true;
        s.reason =
          count >= 3 ? "threefold repetition claim" : "50-move rule claim";
        s.winner = null;
        return true;
      }
      return false;
    },
  };

  const millLines = [
    [0, 1, 2],
    [2, 3, 4],
    [4, 5, 6],
    [6, 7, 0],
    [8, 9, 10],
    [10, 11, 12],
    [12, 13, 14],
    [14, 15, 8],
    [16, 17, 18],
    [18, 19, 20],
    [20, 21, 22],
    [22, 23, 16],
    [1, 9, 17],
    [3, 11, 19],
    [5, 13, 21],
    [7, 15, 23],
  ];
  const millAdj = Array.from({ length: 24 }, () => new Set());
  for (const line of millLines) {
    for (let i = 0; i < 2; i++) {
      millAdj[line[i]].add(line[i + 1]);
      millAdj[line[i + 1]].add(line[i]);
    }
  }
  const morris = {
    create() {
      return {
        board: Array(24).fill(0),
        turn: 1,
        placed: [0, 0],
        phase: "place",
        capturePending: false,
        over: false,
        winner: 0,
        seen: {},
      };
    },
    mills(s, side) {
      return millLines.filter((line) => line.every((i) => s.board[i] === side));
    },
    move(s, from, to) {
      if (s.over || s.capturePending || s.board[to] !== 0) return false;
      let side = s.turn;
      if (s.phase === "place") {
        if (from !== null || s.placed[side === 1 ? 0 : 1] >= 9) return false;
        s.board[to] = side;
        s.placed[side === 1 ? 0 : 1]++;
        if (s.placed[0] === 9 && s.placed[1] === 9) s.phase = "move";
      } else {
        if (!Number.isInteger(from) || s.board[from] !== side) return false;
        const count = s.board.filter((x) => x === side).length;
        const legal = millAdj[from].has(to) || count === 3;
        if (!legal) return false;
        s.board[from] = 0;
        s.board[to] = side;
      }
      if (this.mills(s, side).some((line) => line.includes(to))) {
        s.capturePending = true;
        return true;
      }
      this.finishTurn(s);
      return true;
    },
    remove(s, at) {
      if (s.over || !s.capturePending || s.board[at] !== -s.turn) return false;
      const enemies = s.board
          .map((v, i) => (v === -s.turn ? i : -1))
          .filter((i) => i >= 0),
        protectedSet = new Set(this.mills(s, -s.turn).flat());
      if (enemies.some((i) => !protectedSet.has(i)) && protectedSet.has(at))
        return false;
      s.board[at] = 0;
      s.capturePending = false;
      if (
        s.phase === "move" &&
        s.board.filter((x) => x === -s.turn).length < 3
      ) {
        s.over = true;
        s.winner = s.turn;
        return true;
      }
      this.finishTurn(s);
      return true;
    },
    finishTurn(s) {
      const key = s.board.join(",") + ":" + s.turn;
      if (s.seen[key]) {
        s.over = true;
        s.winner = 0;
        return;
      }
      s.seen[key] = 1;
      s.turn *= -1;
      if (s.phase === "move" && !this.hasMoves(s, s.turn)) {
        s.over = true;
        s.winner = -s.turn;
      }
    },
    hasMoves(s, side) {
      const pieces = s.board
        .map((x, i) => (x === side ? i : -1))
        .filter((i) => i >= 0);
      if (pieces.length === 3) return s.board.includes(0);
      return pieces.some((i) => [...millAdj[i]].some((j) => !s.board[j]));
    },
  };

  const kalah = {
    create() {
      const pits = Array(14).fill(4);
      pits[6] = 0;
      pits[13] = 0;
      return { pits, turn: 0, over: false, winner: null };
    },
  };
  // Kalah has two board sides; each local pass-and-play turn selects the side's six pits.
  kalah.sowSide = function (s, side, pit) {
    if (s.over || side !== s.turn || pit < 0 || pit > 5) return false;
    const idx = side === 0 ? pit : pit + 7;
    if (!s.pits[idx]) return false;
    let seeds = s.pits[idx];
    s.pits[idx] = 0;
    let at = idx;
    while (seeds) {
      at = (at + 1) % 14;
      if (at === (side === 0 ? 13 : 6)) continue;
      s.pits[at]++;
      seeds--;
    }
    if (
      ((side === 0 && at < 6) || (side === 1 && at >= 7 && at < 13)) &&
      s.pits[at] === 1 &&
      s.pits[12 - at] > 0
    ) {
      const store = side === 0 ? 6 : 13;
      s.pits[store] += s.pits[at] + s.pits[12 - at];
      s.pits[at] = 0;
      s.pits[12 - at] = 0;
    }
    const empty0 = s.pits.slice(0, 6).every((x) => !x),
      empty1 = s.pits.slice(7, 13).every((x) => !x);
    if (empty0 || empty1) {
      s.pits[6] += s.pits.slice(0, 6).reduce((a, b) => a + b, 0);
      s.pits[13] += s.pits.slice(7, 13).reduce((a, b) => a + b, 0);
      for (let i = 0; i < 6; i++) {
        s.pits[i] = 0;
        s.pits[i + 7] = 0;
      }
      s.over = true;
      s.winner = s.pits[6] === s.pits[13] ? -1 : s.pits[6] > s.pits[13] ? 0 : 1;
      return true;
    }
    if (at !== (side === 0 ? 6 : 13)) s.turn = 1 - side;
    return true;
  };
  kalah.sow = (s, pit) => kalah.sowSide(s, s.turn, pit);

  function hexNeighbors(i) {
    const r = Math.floor(i / 7),
      c = i % 7;
    return [
      [r - 1, c],
      [r - 1, c + 1],
      [r, c - 1],
      [r, c + 1],
      [r + 1, c - 1],
      [r + 1, c],
    ]
      .filter(([rr, cc]) => rr >= 0 && rr < 7 && cc >= 0 && cc < 7)
      .map(([rr, cc]) => rr * 7 + cc);
  }
  const hex = {
    create() {
      return { board: Array(49).fill(0), turn: 1, over: false, winner: 0 };
    },
    neighbors: hexNeighbors,
    place(s, r, c) {
      if (s.over || r < 0 || r > 6 || c < 0 || c > 6 || s.board[r * 7 + c])
        return false;
      s.board[r * 7 + c] = s.turn;
      if (this.winner(s)) {
        s.over = true;
        s.winner = s.turn;
      } else s.turn *= -1;
      return true;
    },
    winner(s) {
      for (const side of [1, -1]) {
        const starts =
            side === 1
              ? Array.from({ length: 7 }, (_, c) => c)
              : Array.from({ length: 7 }, (_, r) => r * 7),
          goal = (i) => (side === 1 ? Math.floor(i / 7) === 6 : i % 7 === 6),
          seen = new Set(starts.filter((i) => s.board[i] === side)),
          stack = [...seen];
        while (stack.length) {
          const i = stack.pop();
          if (goal(i)) return side;
          for (const n of hexNeighbors(i))
            if (s.board[n] === side && !seen.has(n)) {
              seen.add(n);
              stack.push(n);
            }
        }
      }
      return 0;
    },
  };
  const nim = {
    create() {
      return { heaps: [3, 5, 7], turn: 0, over: false, winner: null };
    },
    remove(s, changes) {
      if (s.over || !Array.isArray(changes) || changes.length !== 1)
        return false;
      const [heap, amount] = changes[0];
      if (
        !Number.isInteger(heap) ||
        heap < 0 ||
        heap > 2 ||
        !Number.isInteger(amount) ||
        amount < 1 ||
        amount > s.heaps[heap]
      )
        return false;
      s.heaps[heap] -= amount;
      if (s.heaps.every((x) => x === 0)) {
        s.over = true;
        s.winner = s.turn;
      } else s.turn = 1 - s.turn;
      return true;
    },
  };

  function allDotEdges() {
    const a = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++) a.push(`h,${r},${c}`);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) a.push(`v,${r},${c}`);
    return a;
  }
  const dots = {
    create() {
      return {
        edges: new Set(),
        boxes: Array(9).fill(-1),
        scores: [0, 0],
        turn: 0,
        over: false,
        winner: null,
      };
    },
    draw(s, key) {
      if (s.over || typeof key !== "string" || s.edges.has(key)) return false;
      const [dir, rs, cs] = key.split(","),
        r = Number(rs),
        c = Number(cs);
      if (
        (dir === "h" && (r < 0 || r > 3 || c < 0 || c > 2)) ||
        (dir === "v" && (r < 0 || r > 2 || c < 0 || c > 3)) ||
        !["h", "v"].includes(dir)
      )
        return false;
      s.edges.add(key);
      let got = 0;
      for (let br = 0; br < 3; br++)
        for (let bc = 0; bc < 3; bc++) {
          const i = br * 3 + bc;
          if (s.boxes[i] !== -1) continue;
          const need = [
            `h,${br},${bc}`,
            `h,${br + 1},${bc}`,
            `v,${br},${bc}`,
            `v,${br},${bc + 1}`,
          ];
          if (need.every((x) => s.edges.has(x))) {
            s.boxes[i] = s.turn;
            s.scores[s.turn]++;
            got++;
          }
        }
      if (s.edges.size === 24) {
        s.over = true;
        s.winner =
          s.scores[0] === s.scores[1] ? -1 : s.scores[0] > s.scores[1] ? 0 : 1;
      } else if (!got) s.turn = 1 - s.turn;
      return true;
    },
    allEdges: allDotEdges,
  };

  function randomFleet(rng) {
    const ships = [];
    const occupied = new Set();
    for (const length of [5, 4, 3, 3, 2]) {
      let placed = false;
      for (let attempts = 0; attempts < 1000 && !placed; attempts++) {
        const horizontal = rng() < 0.5,
          r = Math.floor(rng() * (horizontal ? 10 : 11 - length)),
          c = Math.floor(rng() * (horizontal ? 11 - length : 10)),
          cells = Array.from({ length }, (_, i) => [
            r + (horizontal ? 0 : i),
            c + (horizontal ? i : 0),
          ]);
        if (cells.every(([rr, cc]) => !occupied.has(rr * 10 + cc))) {
          cells.forEach(([rr, cc]) => occupied.add(rr * 10 + cc));
          ships.push({ length, cells, hits: [] });
          placed = true;
        }
      }
      if (!placed) throw new Error("Unable to place fleet");
    }
    return ships;
  }
  const battleship = {
    create(rng = Math.random) {
      return {
        ownShips: randomFleet(rng),
        enemyShips: randomFleet(rng),
        shots: new Set(),
        incoming: new Set(),
        ownHits: new Set(),
        turn: "player",
        over: false,
        winner: null,
        lastShot: null,
        botPending: false,
      };
    },
    shoot(s, r, c) {
      const k = r * 10 + c;
      if (
        s.over ||
        s.turn !== "player" ||
        r < 0 ||
        r > 9 ||
        c < 0 ||
        c > 9 ||
        s.shots.has(k)
      )
        return false;
      s.shots.add(k);
      const ship = s.enemyShips.find((x) =>
        x.cells.some(([rr, cc]) => rr === r && cc === c),
      );
      if (ship) ship.hits.push(k);
      const sunk = ship && ship.hits.length === ship.length ? ship.length : 0;
      s.lastShot = { r, c, hit: !!ship, sunk };
      if (s.enemyShips.every((x) => x.hits.length === x.length)) {
        s.over = true;
        s.winner = "player";
        return true;
      }
      s.turn = "bot";
      this.botShot(s);
      return true;
    },
    botShot(s) {
      if (s.over || s.turn !== "bot") return false;
      const candidates = [];
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 10; c++)
          if (!s.incoming.has(r * 10 + c)) candidates.push([r, c]);
      if (!candidates.length) return false;
      const [r, c] = candidates[0],
        k = r * 10 + c;
      s.incoming.add(k);
      const ship = s.ownShips.find((x) =>
        x.cells.some(([rr, cc]) => rr === r && cc === c),
      );
      if (ship) ship.hits.push(k);
      if (s.ownShips.every((x) => x.hits.length === x.length)) {
        s.over = true;
        s.winner = "bot";
      } else s.turn = "player";
      return true;
    },
  };
  const definitions = [
    [
      "reversi-othello",
      "Reversi • Othello",
      "Bảng",
      "2 người cùng máy",
      "10–20 phút",
      "Lật quân có chặn ở tám hướng",
      "World Othello Federation",
      "https://www.worldothello.org/about/about-othello/othello-rules/official-rules/english",
      reversi,
    ],
    [
      "checkers-draughts",
      "English Checkers",
      "Bảng",
      "2 người cùng máy",
      "20–40 phút",
      "Bắt quân bắt buộc; vua đi hai chiều",
      "WCDF English rules (hosted by NCCA)",
      "https://nccheckers.org/NCCA/WCDF%20Checker%20-%20Draughts%20-%20English%20Rules.htm",
      checkers,
    ],
    [
      "connect-four",
      "Connect Four",
      "Bảng",
      "2 người cùng máy",
      "10 phút",
      "Thả quân theo trọng lực; nối bốn",
      "Hasbro Original mode",
      "https://instructions.hasbro.com/en-us/instruction/connect-4-game-instructions",
      connect4,
    ],
    [
      "chess-classic",
      "Chess Classic",
      "Bảng",
      "2 người cùng máy",
      "20–60 phút",
      "Nước hợp lệ, nhập thành, bắt tốt qua đường, phong cấp",
      "FIDE Laws of Chess (2023)",
      "https://handbook.fide.com/chapter/e012023",
      chess,
    ],
    [
      "nine-mens-morris",
      "Nine Men's Morris",
      "Bảng",
      "2 người cùng máy",
      "15–30 phút",
      "Lập bộ ba để bắt quân; trượt và bay",
      "PlayMorris common rules (secondary)",
      "https://www.playmorris.com/rules",
      morris,
    ],
    [
      "kalah-mancala",
      "Kalah Mancala",
      "Bảng",
      "2 người cùng máy",
      "10–20 phút",
      "Gieo hạt, ăn hạt đối diện, thêm lượt ở kho",
      "Kalah variant rules (secondary)",
      "https://rules.moddable.games/mancala/variants/kalah/",
      kalah,
    ],
    [
      "hex-board",
      "Hex 7×7",
      "Bảng",
      "2 người cùng máy",
      "15–30 phút",
      "Nối hai cạnh đối diện bằng quân của bạn",
      "Cox-TV Hex explainer (secondary)",
      "https://cox-tv.com/games/rules/hex.php",
      hex,
    ],
    [
      "nim-heaps",
      "Nim Heaps 3–5–7",
      "Bảng",
      "2 người cùng máy",
      "5 phút",
      "Mỗi lượt lấy từ đúng một đống; lấy cuối thắng",
      "Texas A&M educational activity (brief variant overrides misère)",
      "https://nutritionmodels.tamu.edu/models/nim/",
      nim,
    ],
    [
      "dots-and-boxes",
      "Dots and Boxes",
      "Bảng",
      "2 người cùng máy",
      "10–20 phút",
      "Kẻ cạnh; đóng ô được điểm và thêm lượt",
      "Pass and Play rules explainer (secondary)",
      "https://passandplaygames.com/guides/dots-and-boxes",
      dots,
    ],
    [
      "battleship-fleet",
      "Battleship Fleet",
      "Bảng",
      "1 người + bot",
      "10–20 phút",
      "Bắn tọa độ; đánh chìm hạm đội đối thủ",
      "Hasbro Battleship instructions",
      "https://instructions.hasbro.com/en-nz/instruction/battleship-game",
      battleship,
    ],
  ];

  function registerAll() {
    for (const [
      id,
      title,
      category,
      players,
      duration,
      mechanic,
      ref,
      url,
      gameModel,
    ] of definitions) {
      window.NP_Fidelity.register(id, {
        title,
        category,
        newGame: true,
        reference: { title: ref, url, platform: "Web" },
        coreMechanics: [mechanic],
        model: gameModel,
        catalog: {
          id,
          title,
          tagline: mechanic,
          category,
          section: "quick",
          players,
          duration,
          mechanic,
          badge: "Mới",
          color: "#315a73",
          aliases: [title.split(" • ")[0]],
        },
        launch(container, game) {
          return launchBoard(container, game, gameModel, id);
        },
      });
    }
  }

  function launchBoard(container, game, model, id) {
    const stage = window.NP_Fidelity.createStage(container, game, {
      width: 720,
      height: 600,
      hint: hintFor(id),
    });
    let state = model.create(),
      selected = null,
      promotion = "q",
      heap = 0,
      amount = 1,
      message = "";
    stage.button("Ván mới", () => {
      state = model.create();
      selected = null;
      message = "";
      draw();
    });
    if (id === "checkers-draughts")
      stage.button("Đề nghị hòa", () => {
        model.offerDraw(state);
        stage.status("Đã đề nghị hòa. Người chơi bên kia chọn Chấp nhận hòa.");
      });
    if (id === "checkers-draughts")
      stage.button("Chấp nhận hòa", () => {
        model.acceptDraw(state);
        draw();
      });
    if (id === "chess-classic") {
      for (const x of ["q", "r", "b", "n"])
        stage.button("Phong " + x.toUpperCase(), () => {
          promotion = x;
          message = "Đã chọn phong cấp thành " + x.toUpperCase() + ".";
          draw();
        });
      stage.button("Nhận hòa đủ điều kiện", () => {
        model.claimDraw(state);
        draw();
      });
    }
    if (id === "nim-heaps") {
      for (let i = 0; i < 3; i++)
        stage.button("Chọn đống " + (i + 1), () => {
          heap = i;
          draw();
        });
      for (let i = 1; i <= 7; i++)
        stage.button("Chọn lấy " + i, () => {
          amount = i;
          draw();
        });
      stage.button("Lấy đã chọn", () => {
        if (model.remove(state, [[heap, amount]])) {
          selected = null;
          message = "";
        } else {
          message = "Nước đi không hợp lệ: chỉ lấy số hạt đã chọn từ một đống.";
        }
        draw();
      });
    }
    if (id === "battleship-fleet")
      stage.button("Tạo hạm đội mới", () => {
        state = model.create();
        message = "";
        draw();
      });
    stage.on("pointerdown", (event) => {
      if (state.over) return;
      const p = stage.point(event);
      const before = JSON.stringify([state, selected]);
      handleClick(
        id,
        state,
        p,
        model,
        selected,
        heap,
        amount,
        promotion,
        (value) => {
          selected = value;
        },
      );
      const after = JSON.stringify([state, selected]);
      message =
        before === after ? "Nước đi không hợp lệ hoặc chưa hoàn tất." : "";
      draw();
    });
    function draw() {
      paint(stage.ctx, id, state, selected, heap, amount);
      stage.status(statusFor(id, state, selected, heap, amount, message));
    }
    draw();
    stage.frame(
      () => {},
      (ctx) => paint(ctx, id, state, selected, heap, amount),
    );
    return stage;
  }
  function handleClick(
    id,
    s,
    p,
    m,
    selected,
    heap,
    amount,
    promotion,
    setSelected,
  ) {
    if (id === "connect-four") {
      if (p.y < 490 && p.x >= 70 && p.x <= 630)
        m.drop(s, Math.floor((p.x - 70) / 80));
      return;
    }
    if (id === "reversi-othello") {
      const c = Math.floor((p.x - 140) / 55),
        r = Math.floor((p.y - 55) / 55);
      m.play(s, r, c);
      return;
    }
    if (id === "checkers-draughts") {
      const c = Math.floor((p.x - 140) / 55),
        r = Math.floor((p.y - 55) / 55),
        i = r * 8 + c;
      if (r < 0 || r > 7 || c < 0 || c > 7) return;
      if (selected === null) {
        if (s.board[i] && Math.sign(s.board[i]) === s.turn) setSelected(i);
      } else {
        if (m.move(s, selected, i)) setSelected(null);
        else if (s.board[i] && Math.sign(s.board[i]) === s.turn) setSelected(i);
      }
      return;
    }
    if (id === "chess-classic") {
      const c = Math.floor((p.x - 140) / 55),
        r = Math.floor((p.y - 55) / 55);
      if (r < 0 || r > 7 || c < 0 || c > 7) return;
      if (!selected) {
        if (sideOf(s.board[r][c]) === s.turn) setSelected([r, c]);
      } else {
        if (m.move(s, selected[0], selected[1], r, c, promotion))
          setSelected(null);
        else if (sideOf(s.board[r][c]) === s.turn) setSelected([r, c]);
      }
      return;
    }
    if (id === "nine-mens-morris") {
      const point = nearestMorrisPoint(p);
      if (point < 0) return;
      if (s.capturePending) m.remove(s, point);
      else if (s.phase === "place") {
        if (!s.board[point]) m.move(s, null, point);
      } else if (selected === null) {
        if (s.board[point] === s.turn) setSelected(point);
      } else {
        if (m.move(s, selected, point)) setSelected(null);
        else if (s.board[point] === s.turn) setSelected(point);
      }
      return;
    }
    if (id === "kalah-mancala") {
      const r = Math.floor((p.y - 110) / 140),
        c = Math.floor((p.x - 125) / 75);
      if (r === 0 && c >= 0 && c < 6) m.sowSide(s, 1, c);
      if (r === 1 && c >= 0 && c < 6) m.sowSide(s, 0, 5 - c);
      return;
    }
    if (id === "hex-board") {
      const r = Math.round((p.y - 90) / 52),
        c = Math.round((p.x - 185 - (6 - r) * 22) / 52);
      m.place(s, r, c);
      return;
    }
    if (id === "dots-and-boxes") {
      const edge = nearestDotEdge(p);
      if (edge) m.draw(s, edge);
      return;
    }
    if (id === "battleship-fleet") {
      const c = Math.floor((p.x - 370) / 30),
        r = Math.floor((p.y - 120) / 30);
      m.shoot(s, r, c);
      return;
    }
  }
  function hintFor(id) {
    return {
      "reversi-othello":
        "Lật quân khi chặn được quân đối thủ ở cùng một hướng.",
      "checkers-draughts": "Bắt buộc bắt; nếu còn cú nhảy, tiếp tục cùng quân.",
      "connect-four": "Chạm một cột để thả quân xuống ô trống thấp nhất.",
      "chess-classic": "Chạm quân rồi ô đích; chọn quân phong cấp bằng nút.",
      "nine-mens-morris": "Đặt 9 quân, rồi trượt; tạo bộ ba để bắt quân.",
      "kalah-mancala": "Chọn hố bên mình; kho của bạn nằm ở mép gần bạn.",
      "hex-board": "Xanh nối trên–dưới; đỏ nối trái–phải.",
      "nim-heaps": "Chọn một đống và số hạt rồi bấm Lấy đã chọn.",
      "dots-and-boxes": "Chạm cạnh trống; hoàn thành ô sẽ giữ lượt.",
      "battleship-fleet": "Bấm một tọa độ trên lưới phải để bắn bot.",
    }[id];
  }
  function statusFor(id, s, selected, heap, amount, message = "") {
    if (id === "reversi-othello") {
      const [b, w] = reversi.score(s);
      return s.over
        ? `Kết thúc · Đen ${b} : Trắng ${w} · ${s.winner === 0 ? "Hòa" : s.winner === 1 ? "Đen thắng" : "Trắng thắng"}`
        : `Lượt ${s.turn === 1 ? "Đen" : "Trắng"} · Đen ${b} : Trắng ${w}${s.passes ? " · Đối thủ đã buộc phải bỏ lượt" : ""}`;
    }
    if (id === "checkers-draughts")
      return s.over
        ? s.draw
          ? "Hòa theo thỏa thuận"
          : `Kết thúc · ${s.winner === 1 ? "Đỏ" : "Đen"} thắng`
        : `Lượt ${s.turn === 1 ? "Đỏ" : "Đen"}${s.forced !== null ? " · tiếp tục nhảy bằng cùng quân" : ""}${s.drawOffered ? " · đề nghị hòa đang chờ" : ""}`;
    if (id === "connect-four")
      return s.over
        ? `Kết thúc · ${s.winner ? `Người chơi ${s.winner === 1 ? "Đỏ" : "Vàng"} thắng` : "Hòa"}`
        : `Lượt ${s.turn === 1 ? "Đỏ" : "Vàng"}`;
    if (id === "chess-classic")
      return s.over
        ? `${s.reason} · ${s.winner ? (s.winner === "w" ? "Trắng thắng" : "Đen thắng") : "Hòa"}`
        : `Lượt ${s.turn === "w" ? "Trắng" : "Đen"}${chess.inCheck(s, s.turn) ? " · chiếu" : ""} · nửa nước ${s.halfmove}`;
    if (id === "nine-mens-morris")
      return s.over
        ? `Kết thúc · ${s.winner === 0 ? "Hòa" : s.winner === 1 ? "Trắng thắng" : "Đen thắng"}`
        : `Lượt ${s.turn === 1 ? "Trắng" : "Đen"} · ${s.phase === "place" ? "đặt quân" : "di chuyển"}${s.capturePending ? " · chọn quân đối thủ để bắt" : ""}`;
    if (id === "kalah-mancala")
      return s.over
        ? `Kết thúc · kho ${s.pits[6]} : ${s.pits[13]} · ${s.winner === -1 ? "Hòa" : s.winner === 0 ? "Người chơi 1 thắng" : "Người chơi 2 thắng"}`
        : `Lượt người chơi ${s.turn + 1} · kho ${s.pits[6]} : ${s.pits[13]}`;
    if (id === "hex-board")
      return s.over
        ? `Người chơi ${s.winner === 1 ? "Xanh" : "Đỏ"} nối được hai cạnh!`
        : `Lượt ${s.turn === 1 ? "Xanh" : "Đỏ"} · ${s.turn === 1 ? "mục tiêu: trên–dưới" : "mục tiêu: trái–phải"}`;
    if (id === "nim-heaps")
      return s.over
        ? `Người chơi ${s.winner + 1} lấy hạt cuối và thắng!`
        : `Lượt người chơi ${s.turn + 1} · đống ${s.heaps.join(" / ")} · chọn ${heap + 1}, lấy ${amount}`;
    if (id === "dots-and-boxes")
      return s.over
        ? `Kết thúc · điểm ${s.scores[0]} : ${s.scores[1]} · ${s.winner < 0 ? "Hòa" : `Người chơi ${s.winner + 1} thắng`}`
        : `Lượt người chơi ${s.turn + 1} · điểm ${s.scores[0]} : ${s.scores[1]}`;
    const lastShot = s.lastShot
      ? ` · Bạn bắn ${String.fromCharCode(65 + s.lastShot.r)}${s.lastShot.c + 1}: ${s.lastShot.hit ? "trúng" : "trượt"}${s.lastShot.sunk ? `, chìm tàu ${s.lastShot.sunk} ô` : ""}`
      : "";
    const text = s.over
      ? `Kết thúc · ${s.winner === "player" ? "Bạn thắng!" : "Bot thắng."}${lastShot}`
      : `Bạn bắn · bot bắn trả sau mỗi lượt${lastShot}`;
    return message ? `${text} · ${message}` : text;
  }
  const wood = "#d9bb86",
    ink = "#264050";
  function paint(ctx, id, s, selected, heap, amount) {
    ctx.clearRect(0, 0, 720, 600);
    ctx.fillStyle = "#f4f0e7";
    ctx.fillRect(0, 0, 720, 600);
    ctx.fillStyle = ink;
    ctx.font = "bold 18px Calibri, Inter, sans-serif";
    ctx.fillText(
      s.over ? "Ván đã kết thúc" : "Chơi bằng cách chạm bàn cờ",
      28,
      30,
    );
    if (
      id === "reversi-othello" ||
      id === "checkers-draughts" ||
      id === "chess-classic"
    )
      paintGrid(ctx, id, s, selected);
    else if (id === "connect-four") paintConnect(ctx, s);
    else if (id === "nine-mens-morris") paintMorris(ctx, s, selected);
    else if (id === "kalah-mancala") paintKalah(ctx, s);
    else if (id === "hex-board") paintHex(ctx, s);
    else if (id === "nim-heaps") paintNim(ctx, s, heap, amount);
    else if (id === "dots-and-boxes") paintDots(ctx, s);
    else if (id === "battleship-fleet") paintBattle(ctx, s);
  }
  function paintGrid(ctx, id, s, selected) {
    const size = 55,
      x0 = 140,
      y0 = 55;
    ctx.fillStyle =
      id === "reversi-othello"
        ? "#238351"
        : id === "chess-classic"
          ? "#ded3bf"
          : "#c9a874";
    ctx.fillRect(x0, y0, 440, 440);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const x = x0 + c * size,
          y = y0 + r * size;
        if (id === "checkers-draughts" && (r + c) % 2 === 0) {
          ctx.fillStyle = "#f1dfbb";
          ctx.fillRect(x, y, size, size);
        } else if (id === "chess-classic") {
          ctx.fillStyle = (r + c) % 2 ? "#81664d" : "#eadcc5";
          ctx.fillRect(x, y, size, size);
        }
        ctx.strokeStyle = "rgba(20,40,30,.35)";
        ctx.strokeRect(x, y, size, size);
        const piece =
          id === "reversi-othello"
            ? s.board[r * 8 + c]
            : id === "checkers-draughts"
              ? s.board[r * 8 + c]
              : s.board[r][c];
        if (id === "reversi-othello" && piece) {
          ctx.fillStyle = piece === 1 ? "#16191b" : "#f8f8f1";
          ctx.beginPath();
          ctx.arc(x + 27.5, y + 27.5, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#222";
          ctx.stroke();
        }
        if (id === "checkers-draughts" && piece) {
          ctx.fillStyle = piece > 0 ? "#d64a3f" : "#f4f1e9";
          ctx.beginPath();
          ctx.arc(x + 27.5, y + 27.5, 19, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#3a3330";
          ctx.stroke();
          if (Math.abs(piece) === 2) {
            ctx.fillStyle = "#efc545";
            ctx.font = "bold 17px Calibri";
            ctx.fillText("K", x + 21, y + 33);
          }
        }
        if (id === "chess-classic" && piece !== ".") {
          ctx.fillStyle = sideOf(piece) === "w" ? "#fff8e6" : "#20313a";
          ctx.font = "bold 31px Calibri";
          ctx.textAlign = "center";
          ctx.fillText(
            { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }[
              piece.toLowerCase()
            ],
            x + 27,
            y + 39,
          );
          ctx.textAlign = "left";
        }
        if (
          selected === r * 8 + c ||
          (Array.isArray(selected) && selected[0] === r && selected[1] === c)
        ) {
          ctx.strokeStyle = "#ffe34a";
          ctx.lineWidth = 4;
          ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
          ctx.lineWidth = 1;
        }
      }
  }
  function paintConnect(ctx, s) {
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 7; c++) {
        const x = 70 + c * 80,
          y = 70 + r * 70;
        ctx.fillStyle = "#3470a7";
        ctx.fillRect(x, y, 72, 62);
        ctx.fillStyle =
          s.board[r][c] === 1
            ? "#db4a3e"
            : s.board[r][c] === -1
              ? "#f5d252"
              : "#e9edf0";
        ctx.beginPath();
        ctx.arc(x + 36, y + 31, 23, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  const morrisXY = [
    [130, 100],
    [300, 100],
    [470, 100],
    [470, 270],
    [470, 440],
    [300, 440],
    [130, 440],
    [130, 270],
    [185, 155],
    [300, 155],
    [415, 155],
    [415, 270],
    [415, 385],
    [300, 385],
    [185, 385],
    [185, 270],
    [240, 210],
    [300, 210],
    [360, 210],
    [360, 270],
    [360, 330],
    [300, 330],
    [240, 330],
    [240, 270],
  ];
  function nearestMorrisPoint(p) {
    let best = -1,
      d = 25;
    for (let i = 0; i < 24; i++) {
      const q = Math.hypot(p.x - morrisXY[i][0], p.y - morrisXY[i][1]);
      if (q < d) {
        best = i;
        d = q;
      }
    }
    return best;
  }
  function paintMorris(ctx, s, selected) {
    ctx.strokeStyle = "#647985";
    ctx.lineWidth = 4;
    for (const [a, b] of [
      [0, 2],
      [2, 4],
      [4, 6],
      [6, 0],
      [8, 10],
      [10, 12],
      [12, 14],
      [14, 8],
      [16, 18],
      [18, 20],
      [20, 22],
      [22, 16],
      [0, 8],
      [2, 10],
      [4, 12],
      [6, 14],
      [8, 16],
      [10, 18],
      [12, 20],
      [14, 22],
      [1, 9],
      [3, 11],
      [5, 13],
      [7, 15],
      [9, 17],
      [11, 19],
      [13, 21],
      [15, 23],
    ]) {
      ctx.beginPath();
      ctx.moveTo(...morrisXY[a]);
      ctx.lineTo(...morrisXY[b]);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const [x, y] = morrisXY[i];
      ctx.fillStyle =
        s.board[i] === 1
          ? "#f5f1e8"
          : s.board[i] === -1
            ? "#273940"
            : "#aab5b7";
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 7);
      ctx.fill();
      ctx.strokeStyle = selected === i ? "#e2bd25" : "#41565c";
      ctx.lineWidth = selected === i ? 5 : 2;
      ctx.stroke();
    }
  }
  function paintKalah(ctx, s) {
    ctx.fillStyle = "#cf9b5c";
    ctx.fillRect(100, 100, 520, 330);
    ctx.fillStyle = "#e2bc7e";
    ctx.fillRect(100, 100, 520, 330);
    for (let i = 0; i < 14; i++) {
      let x, y;
      if (i === 6) {
        x = 125;
        y = 200;
      } else if (i === 13) {
        x = 595;
        y = 200;
      } else if (i < 6) {
        x = 180 + (5 - i) * 75;
        y = 345;
      } else {
        x = 180 + (i - 7) * 75;
        y = 155;
      }
      ctx.fillStyle = "#faf5e9";
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        i === 6 || i === 13 ? 26 : 28,
        i === 6 || i === 13 ? 95 : 35,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.font = "bold 22px Calibri";
      ctx.textAlign = "center";
      ctx.fillText(String(s.pits[i]), x, y + 7);
    }
    ctx.textAlign = "left";
    ctx.fillText("Người chơi 2", 100, 80);
    ctx.fillText("Người chơi 1", 100, 470);
  }
  function paintHex(ctx, s) {
    ctx.fillStyle = "#327b55";
    ctx.fillText("XANH: TRÊN → DƯỚI", 160, 58);
    ctx.fillStyle = "#8d3f3d";
    ctx.fillText("ĐỎ: TRÁI → PHẢI", 160, 500);
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const x = 185 + c * 52 + (6 - r) * 22,
          y = 90 + r * 52;
        ctx.fillStyle =
          s.board[r * 7 + c] === 1
            ? "#4dc284"
            : s.board[r * 7 + c] === -1
              ? "#d45b57"
              : "#d9e1df";
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3a5f58";
        ctx.stroke();
      }
  }
  function paintNim(ctx, s, heap, amount) {
    ctx.font = "bold 20px Calibri";
    for (let i = 0; i < 3; i++) {
      const x = 140 + i * 175;
      ctx.fillStyle = i === heap ? "#d6a63e" : "#537481";
      ctx.fillRect(x, 110, 135, 250);
      ctx.fillStyle = "#fff";
      ctx.fillText(`Đống ${i + 1}: ${s.heaps[i]}`, x + 8, 90);
      for (let j = 0; j < s.heaps[i]; j++) {
        ctx.fillStyle = "#f2d38a";
        ctx.beginPath();
        ctx.arc(x + 35 + (j % 3) * 33, 330 - Math.floor(j / 3) * 34, 11, 0, 7);
        ctx.fill();
      }
    }
    ctx.fillStyle = ink;
    ctx.fillText(`Số lấy đã chọn: ${amount}`, 180, 420);
  }
  function nearestDotEdge(p) {
    let best = null,
      d = 14;
    for (const key of allDotEdges()) {
      const [dir, rs, cs] = key.split(","),
        r = +rs,
        c = +cs,
        x1 = 160 + c * 120,
        y1 = 100 + r * 120,
        x2 = dir === "h" ? x1 + 120 : x1,
        y2 = dir === "v" ? y1 + 120 : y1,
        dist = Math.hypot(p.x - (x1 + x2) / 2, p.y - (y1 + y2) / 2);
      if (dist < d) {
        best = key;
        d = dist;
      }
    }
    return best;
  }
  function paintDots(ctx, s) {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        if (s.boxes[r * 3 + c] >= 0) {
          ctx.fillStyle = s.boxes[r * 3 + c] === 0 ? "#80c8b3" : "#efad94";
          ctx.fillRect(173 + c * 120, 113 + r * 120, 94, 94);
        }
    ctx.strokeStyle = "#304853";
    ctx.lineWidth = 5;
    for (const key of s.edges) {
      const [dir, rs, cs] = key.split(","),
        r = +rs,
        c = +cs,
        x = 160 + c * 120,
        y = 100 + r * 120;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(dir === "h" ? x + 120 : x, dir === "v" ? y + 120 : y);
      ctx.stroke();
    }
    ctx.fillStyle = "#263b44";
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.arc(160 + c * 120, 100 + r * 120, 7, 0, 7);
        ctx.fill();
      }
  }
  function paintBattle(ctx, s) {
    ctx.fillStyle = ink;
    ctx.font = "bold 17px Calibri";
    ctx.fillText("Hạm đội của bạn", 45, 90);
    ctx.fillText("Lưới bắn vào bot", 370, 90);
    for (let board = 0; board < 2; board++) {
      const x0 = 45 + board * 325,
        y0 = 120;
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 10; c++) {
          const x = x0 + c * 30,
            y = y0 + r * 30;
          ctx.fillStyle = "#d7e7e8";
          ctx.fillRect(x, y, 28, 28);
          ctx.strokeStyle = "#a5bdc2";
          ctx.strokeRect(x, y, 28, 28);
          const k = r * 10 + c;
          if (board === 0) {
            const ship = s.ownShips.find((sh) =>
              sh.cells.some(([rr, cc]) => rr === r && cc === c),
            );
            if (ship) {
              ctx.fillStyle = "#5b7080";
              ctx.fillRect(x + 3, y + 3, 22, 22);
            }
            if (s.incoming.has(k)) {
              ctx.fillStyle = ship ? "#dd5449" : "#faf7ed";
              ctx.beginPath();
              ctx.arc(x + 14, y + 14, 7, 0, 7);
              ctx.fill();
            }
          } else if (s.shots.has(k)) {
            const hit = s.enemyShips.some((sh) => sh.hits.includes(k));
            ctx.fillStyle = hit ? "#dd5449" : "#faf7ed";
            ctx.beginPath();
            ctx.arc(x + 14, y + 14, 7, 0, 7);
            ctx.fill();
          }
        }
    }
  }

  registerAll();
})();
