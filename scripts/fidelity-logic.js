(function () {
  "use strict";
  const fidelity = window.NP_Fidelity,
    ROOT = "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/";
  if (!fidelity) throw Error("Load fidelity-core.js first");
  const indices = (n) => Array.from({ length: n }, (_, i) => i),
    hasUniqueValues = (values) => new Set(values).size === values.length,
    cloneData = (value) => JSON.parse(JSON.stringify(value));
  function game(id, title, page, model, draw, input, opts = {}) {
    fidelity.register(id, {
      title,
      category: "Logic",
      newGame: true,
      reference: {
        title: opts.refTitle || page.replace(".html", ""),
        url: opts.url || ROOT + page,
        platform: opts.platform || "Web puzzle rules",
      },
      coreMechanics: opts.mech || [],
      model,
      catalog: {
        id,
        title,
        tagline: opts.tag || title,
        category: "Logic",
        section: "quick",
        players: "1",
        duration: "5–15 phút",
        mechanic: "Giải đố logic",
        badge: "Mới",
        color: "#277c76",
        aliases: [opts.alias || title],
      },
      launch(container, g) {
        const st = fidelity.createStage(container, g, {
          width: 620,
          height: 620,
          hint: opts.hint || "Chạm ô để thao tác.",
        });
        let round = 0,
          s = model.createGame();
        st.button("Ván mới", () => {
          round++;
          s = opts.nextSeed ? model.createGame(round) : model.createGame();
          st.status("Ván mới.");
        });
        const checkWin = () => {
          if (model.isSolved(s)) {
            s.over = true;
            st.status("Hoàn thành!");
            return true;
          }
          return false;
        };
        if (opts.setup) opts.setup(st, () => s, checkWin);
        st.setHUD(title);
        st.status("Bắt đầu!");
        st.on("pointerdown", (e) => {
          if (s.over) return;
          const msg = input(s, st.point(e), st);
          if (msg) st.status(msg);
          if (model.isSolved(s)) {
            s.over = true;
            st.status("Hoàn thành!");
          }
        });
        st.frame(
          () => {},
          (ctx) => {
            ctx.clearRect(0, 0, 620, 620);
            draw(ctx, s, st);
          },
        );
        return {
          session: st.session,
          model,
          get state() {
            return s;
          },
        };
      },
    });
  }
  function hit(p, x, y, n, cell) {
    return p.x >= x && p.y >= y && p.x < x + n * cell && p.y < y + n * cell
      ? { r: Math.floor((p.y - y) / cell), c: Math.floor((p.x - x) / cell) }
      : null;
  }
  function grid(ctx, g, x, y, cell, fmt = (v) => v) {
    const n = g.length;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, n * cell, n * cell);
    g.forEach((row, r) =>
      row.forEach((v, c) => {
        ctx.fillStyle = (r + c) % 2 ? "#f1f5f4" : "#e4edeb";
        ctx.fillRect(x + c * cell + 1, y + r * cell + 1, cell - 2, cell - 2);
        if (v !== 0 && v !== false && v !== null && v !== undefined) {
          ctx.fillStyle = "#183b38";
          ctx.font = "bold " + Math.min(28, cell * 0.52) + "px Calibri";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(fmt(v), x + (c + 0.5) * cell, y + (r + 0.5) * cell);
        }
      }),
    );
    ctx.strokeStyle = "#57726e";
    ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * cell, y);
      ctx.lineTo(x + i * cell, y + n * cell);
      ctx.moveTo(x, y + i * cell);
      ctx.lineTo(x + n * cell, y + i * cell);
      ctx.stroke();
    }
  }
  const sudokuSolution = [
    "534678912",
    "672195348",
    "198342567",
    "859761423",
    "426853791",
    "713924856",
    "961537284",
    "287419635",
    "345286179",
  ].map((x) => [...x].map(Number));
  const sudokuPuzzle = [
    "530070000",
    "600195000",
    "098000060",
    "800060003",
    "400803001",
    "700020006",
    "060000280",
    "000419005",
    "000080079",
  ].map((x) => [...x].map(Number));
  const sudoku = {
    createGame(seed = 0) {
      const shift = ((seed % 9) + 9) % 9,
        map = (v) => (v ? ((v + shift - 1) % 9) + 1 : 0);
      const order = (n, k) =>
        Array.from({ length: n }, (_, i) => i).sort(
          (a, b) => ((a * 17 + k * 13) % 31) - ((b * 17 + k * 13) % 31),
        );
      const rows = order(3, seed).flatMap((band) =>
        order(3, seed + band + 1).map((row) => band * 3 + row),
      );
      const cols = order(3, seed + 4).flatMap((stack) =>
        order(3, seed + stack + 8).map((col) => stack * 3 + col),
      );
      const transform = (base) =>
        rows.map((r) => cols.map((c) => map(base[r][c])));
      return {
        givens: transform(sudokuPuzzle),
        grid: transform(sudokuPuzzle),
        solution: transform(sudokuSolution),
        moves: 0,
        over: false,
      };
    },
    canPlace(s, r, c, v) {
      for (let i = 0; i < 9; i++)
        if ((i !== c && s.grid[r][i] === v) || (i !== r && s.grid[i][c] === v))
          return false;
      for (let y = r - (r % 3); y < r - (r % 3) + 3; y++)
        for (let x = c - (c % 3); x < c - (c % 3) + 3; x++)
          if ((y !== r || x !== c) && s.grid[y][x] === v) return false;
      return true;
    },
    place(s, r, c, v) {
      if (
        s.over ||
        !s.grid[r] ||
        c < 0 ||
        c > 8 ||
        s.givens[r][c] ||
        !Number.isInteger(v) ||
        v < 0 ||
        v > 9
      )
        return false;
      if (v && !this.canPlace(s, r, c, v)) return false;
      s.grid[r][c] = v;
      s.moves++;
      return true;
    },
    isSolved(s) {
      return (
        s.grid.every(
          (r, i) =>
            r.every((v, j) => v && this.canPlace(s, i, j, v)) &&
            hasUniqueValues(r),
        ) && indices(9).every((c) => hasUniqueValues(s.grid.map((r) => r[c])))
      );
    },
  };
  game(
    "sudoku-9x9",
    "Sudoku 9×9",
    "sudoku.html",
    sudoku,
    (ctx, s) => {
      grid(ctx, s.grid, 76, 35, 52);
      if (s.sel) {
        ctx.strokeStyle = "#d57842";
        ctx.lineWidth = 3;
        ctx.strokeRect(78 + s.sel.c * 52, 37 + s.sel.r * 52, 48, 48);
      }
      ctx.fillStyle = "#284541";
      ctx.font = "16px Calibri";
      ctx.fillText("Chọn ô trống; dùng nút số bên dưới", 76, 520);
    },
    (s, p, st) => {
      const h = hit(p, 76, 35, 9, 52);
      if (h) {
        s.sel = h;
        return "Đã chọn ô.";
      }
      if (!s.sel) return;
    },
    {
      mech: [
        "Hàng, cột, khối 3×3 chứa mỗi số 1–9 một lần",
        "Ô đề khóa; nhập số hoặc xóa",
      ],
      alias: "Sudoku",
      nextSeed: true,
      refTitle: "Nikoli Sudoku rules",
      url: "https://www.nikoli.co.jp/en/puzzles/sudoku/",
      hint: "Chọn ô trống rồi bấm số ở các nút; số lặp trong hàng, cột hoặc khối bị từ chối.",
      setup(st, getS, checkWin) {
        for (let v = 1; v <= 9; v++)
          st.button(String(v), () => {
            const q = getS();
            if (q.sel) {
              const ok = sudoku.place(q, q.sel.r, q.sel.c, v);
              if (ok && !checkWin()) st.status("Đã nhập " + v + ".");
              else if (!ok) st.status("Số trùng hoặc ô khóa.");
            }
          });
        st.button("Xóa", () => {
          const q = getS();
          if (q.sel)
            st.status(
              sudoku.place(q, q.sel.r, q.sel.c, 0) ? "Đã xóa." : "Ô đề khóa.",
            );
        });
      },
    },
  );
  const pic = ["00100", "01110", "11111", "01110", "00100"].map((x) =>
    [...x].map(Number),
  );
  function runs(a) {
    const o = [];
    let n = 0;
    for (const v of a)
      if (v) n++;
      else if (n) {
        o.push(n);
        n = 0;
      }
    if (n) o.push(n);
    return o.length ? o : [0];
  }
  const nonogram = {
    createGame(seed = 0) {
      const target =
        seed % 2
          ? ["10101", "01110", "11111", "00100", "11011"].map((x) =>
              [...x].map(Number),
            )
          : cloneData(pic);
      return {
        target,
        cells: Array.from({ length: 5 }, () => Array(5).fill(0)),
        rowClues: target.map((r) => runs(r)),
        colClues: indices(5).map((c) => runs(target.map((r) => r[c]))),
        mode: 1,
        moves: 0,
        over: false,
      };
    },
    setCell(s, r, c, v = s.mode) {
      if (s.over || !s.cells[r] || c < 0 || c >= 5 || ![0, 1, 2].includes(v))
        return false;
      s.cells[r][c] = v;
      s.moves++;
      return true;
    },
    setMode(s, m) {
      if (m !== 1 && m !== 2) return false;
      s.mode = m;
      return true;
    },
    isSolved(s) {
      return (
        s.cells.every(
          (row, r) =>
            JSON.stringify(runs(row.map((v) => (v === 1 ? 1 : 0)))) ===
              JSON.stringify(s.rowClues[r]) && row.every((v) => v !== 0),
        ) &&
        indices(5).every(
          (c) =>
            JSON.stringify(runs(s.cells.map((r) => (r[c] === 1 ? 1 : 0)))) ===
            JSON.stringify(s.colClues[c]),
        )
      );
    },
  };
  game(
    "nonogram-picross",
    "Nonogram / Picross",
    "pattern.html",
    nonogram,
    (ctx, s) => {
      const x = 110,
        y = 125,
        z = 66;
      ctx.fillStyle = "#253f3b";
      ctx.font = "16px Calibri";
      s.rowClues.forEach((a, r) =>
        ctx.fillText(a.join(" "), 60, y + r * z + 36),
      );
      s.colClues.forEach((a, c) =>
        ctx.fillText(a.join(" "), x + c * z + 22, 102),
      );
      s.cells.forEach((row, r) =>
        row.forEach((v, c) => {
          ctx.fillStyle = v === 1 ? "#193b37" : "#fff";
          ctx.fillRect(x + c * z + 2, y + r * z + 2, z - 4, z - 4);
          if (v === 2) {
            ctx.strokeStyle = "#ba6258";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + c * z + 22, y + r * z + 22);
            ctx.lineTo(x + c * z + 44, y + r * z + 44);
            ctx.moveTo(x + c * z + 44, y + r * z + 22);
            ctx.lineTo(x + c * z + 22, y + r * z + 44);
            ctx.stroke();
          }
        }),
      );
      ctx.strokeStyle = "#667e7a";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * z, y);
        ctx.lineTo(x + i * z, y + 330);
        ctx.moveTo(x, y + i * z);
        ctx.lineTo(x + 330, y + i * z);
        ctx.stroke();
      }
      ctx.fillStyle = "#233d39";
      ctx.fillText("Mode " + s.mode + " • 1: đen, 2: trắng", 100, 490);
    },
    (s, p) => {
      const h = hit(p, 110, 125, 5, 66);
      if (h) {
        nonogram.setCell(s, h.r, h.c);
        return "Đã đánh dấu ô.";
      }
    },
    {
      mech: [
        "Số clue là độ dài cụm ô đen",
        "Ô trắng có thể đánh dấu hoặc để trống",
        "Thắng khi clue hàng/cột đều khớp",
      ],
      alias: "Picross",
      nextSeed: true,
      hint: "Chạm ô để đánh dấu. Nút chế độ chọn đen hoặc trắng; ô chưa quyết định chưa thể thắng.",
      setup(st, getS) {
        st.button("Tô đen", () => {
          nonogram.setMode(getS(), 1);
          st.status("Chế độ tô đen.");
        });
        st.button("Đánh dấu trắng", () => {
          nonogram.setMode(getS(), 2);
          st.status("Chế độ đánh dấu trắng.");
        });
      },
    },
  );
  const fifteen = {
    createGame(seed = 17) {
      const b = indices(16).map((i) => (i === 15 ? 0 : i + 1));
      let blank = 15,
        last = -1,
        path = [];
      for (let k = 0; k < 90; k++) {
        const c = [
            blank % 4 ? blank - 1 : -1,
            blank % 4 < 3 ? blank + 1 : -1,
            blank >= 4 ? blank - 4 : -1,
            blank < 12 ? blank + 4 : -1,
          ].filter((i) => i >= 0 && i !== last),
          to = c[(k * 7 + seed) % c.length];
        path.push(blank);
        [b[to], b[blank]] = [b[blank], b[to]];
        last = blank;
        blank = to;
      }
      return { board: b, moves: 0, over: false, scramblePath: path };
    },
    move(s, index) {
      if (s.over || !Number.isInteger(index) || index < 0 || index >= 16)
        return false;
      const z = s.board.indexOf(0);
      if (
        Math.abs((z % 4) - (index % 4)) +
          Math.abs(((z / 4) | 0) - ((index / 4) | 0)) !==
        1
      )
        return false;
      [s.board[z], s.board[index]] = [s.board[index], s.board[z]];
      s.moves++;
      return true;
    },
    isSolved(s) {
      return s.board.every((v, i) => v === (i === 15 ? 0 : i + 1));
    },
  };
  game(
    "fifteen-puzzle",
    "15 Puzzle",
    "fifteen.html",
    fifteen,
    (ctx, s) => {
      grid(
        ctx,
        Array.from({ length: 4 }, (_, r) => s.board.slice(r * 4, r * 4 + 4)),
        58,
        45,
        126,
        (v) => v || "",
      );
      ctx.fillStyle = "#25433f";
      ctx.font = "17px Calibri";
      ctx.fillText("Nước: " + s.moves, 58, 585);
    },
    (s, p) => {
      const h = hit(p, 58, 45, 4, 126);
      if (h)
        return fifteen.move(s, h.r * 4 + h.c)
          ? "Đã trượt ô."
          : "Chỉ trượt ô kề khoảng trống.";
    },
    {
      mech: [
        "4×4 có 15 ô số và một ô trống",
        "Chỉ trượt ô kề; đếm nước",
        "Xáo bằng nước hợp lệ nên có lời giải",
      ],
      alias: "15 Puzzle",
      nextSeed: true,
      hint: "Chạm ô cạnh khoảng trống để trượt. Xếp dãy 1–15, khoảng trống ở cuối.",
    },
  );
  const lights = {
    createGame(seed = 4) {
      const s = {
        board: Array.from({ length: 5 }, () => Array(5).fill(false)),
        moves: 0,
        over: false,
        scramble: [],
      };
      for (let i = 0; i < 18; i++) {
        const r = (i * 7 + seed) % 5,
          c = (i * 13 + seed) % 5;
        s.scramble.push([r, c]);
        this.toggle(s, r, c);
      }
      s.moves = 0;
      return s;
    },
    toggle(s, r, c) {
      if (s.over || r < 0 || c < 0 || r >= 5 || c >= 5) return false;
      for (const [dr, dc] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (s.board[r + dr] && s.board[r + dr][c + dc] !== undefined)
          s.board[r + dr][c + dc] = !s.board[r + dr][c + dc];
      s.moves++;
      return true;
    },
    isSolved(s) {
      return s.board.every((r) => r.every((v) => !v));
    },
  };
  game(
    "lights-out",
    "Lights Out",
    "flip.html",
    lights,
    (ctx, s) => {
      const x = 110,
        y = 72,
        z = 80;
      grid(
        ctx,
        s.board.map((r) => r.map((v) => (v ? 1 : 0))),
        x,
        y,
        z,
        () => "",
      );
      s.board.forEach((r, y1) =>
        r.forEach((v, x1) => {
          if (v) {
            ctx.fillStyle = "#edbd50";
            ctx.beginPath();
            ctx.arc(x + (x1 + 0.5) * z, y + (y1 + 0.5) * z, 23, 0, Math.PI * 2);
            ctx.fill();
          }
        }),
      );
      ctx.fillStyle = "#263f3c";
      ctx.font = "17px Calibri";
      ctx.fillText(
        "Bật sáng: " +
          s.board.flat().filter(Boolean).length +
          " • Nước: " +
          s.moves,
        110,
        510,
      );
    },
    (s, p) => {
      const h = hit(p, 110, 72, 5, 80);
      if (h) {
        lights.toggle(s, h.r, h.c);
        return "Đã đổi ô và láng giềng.";
      }
    },
    {
      mech: [
        "Lật trạng thái ô và 4 láng giềng trực giao",
        "Thắng khi toàn bảng tắt",
        "Bảng xáo bằng phép lật hợp lệ",
      ],
      nextSeed: true,
      refTitle: "Simon Tatham Flip rules",
      hint: "Chạm ô để đổi chính ô và các ô kề trên/dưới/trái/phải.",
    },
  );
  const colors = ["Đỏ", "Lam", "Lục", "Vàng", "Tím", "Cam"],
    hex = ["#d64e47", "#377abd", "#42a76f", "#e5b93e", "#8964b5", "#e48743"];
  const mastermind = {
    createGame(secret = [0, 2, 4, 1]) {
      return {
        secret: secret.slice(),
        guess: [0, 0, 0, 0],
        rows: [],
        selected: 0,
        turns: 0,
        over: false,
        won: false,
      };
    },
    choose(s, pos, color) {
      if (s.over || pos < 0 || pos > 3 || color < 0 || color > 5) return false;
      s.guess[pos] = color;
      s.selected = pos;
      return true;
    },
    submit(s) {
      if (s.over) return false;
      let exact = 0,
        g = Array(6).fill(0),
        t = Array(6).fill(0);
      for (let i = 0; i < 4; i++)
        if (s.guess[i] === s.secret[i]) exact++;
        else {
          g[s.guess[i]]++;
          t[s.secret[i]]++;
        }
      let color = g.reduce((n, v, i) => n + Math.min(v, t[i]), 0);
      s.rows.push({ guess: s.guess.slice(), exact, color });
      s.turns++;
      s.won = exact === 4;
      if (s.won || s.turns === 10) s.over = true;
      else s.guess = [0, 0, 0, 0];
      return { exact, color, won: s.won };
    },
    isSolved(s) {
      return s.won;
    },
  };
  game(
    "mastermind-code",
    "Mastermind",
    "guess.html",
    mastermind,
    (ctx, s) => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(70, 28, 480, 475);
      ctx.fillStyle = "#203c39";
      ctx.font = "16px Calibri";
      s.rows.forEach((row, r) => {
        const y = 60 + r * 38;
        row.guess.forEach((c, i) => {
          ctx.fillStyle = hex[c];
          ctx.beginPath();
          ctx.arc(130 + i * 54, y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#173833";
          ctx.font = "12px Calibri";
          ctx.fillText(String(c + 1), 126 + i * 54, y + 4);
        });
        ctx.fillStyle = "#263d39";
        ctx.font = "16px Calibri";
        ctx.fillText("● " + row.exact + "  ○ " + row.color, 370, y + 5);
      });
      const y = 465;
      s.guess.forEach((c, i) => {
        ctx.fillStyle = hex[c];
        ctx.beginPath();
        ctx.arc(130 + i * 62, y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = i === s.selected ? "#172c2a" : "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(c + 1), 130 + i * 62, y);
      });
      ctx.fillStyle = "#173833";
      ctx.textAlign = "left";
      ctx.font = "16px Calibri";
      ctx.fillText("● đúng chốt     ○ đúng màu", 100, 520);
      ctx.fillText("Lượt " + s.turns + "/10", 100, 550);
      if (s.over && !s.won) {
        ctx.fillText(
          "Mã: " + s.secret.map((x) => colors[x]).join(" · "),
          300,
          550,
        );
        s.secret.forEach((c, i) => {
          ctx.fillStyle = hex[c];
          ctx.beginPath();
          ctx.arc(315 + i * 42, 578, 14, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    },
    (s, p) => {
      if (p.y > 430 && p.y < 500) {
        let i = Math.max(0, Math.min(3, Math.round((p.x - 130) / 62)));
        s.selected = i;
        return "Chọn chốt " + (i + 1) + ".";
      }
    },
    {
      mech: [
        "Mã 4 chốt; 6 màu, cho lặp màu",
        "Feedback tách số đúng vị trí và đúng màu sai chỗ",
        "10 lượt; hết lượt sẽ lộ mã",
      ],
      hint: "Chạm chốt để chọn vị trí; dùng nút màu và Kiểm tra.",
      setup(st, getS) {
        colors.forEach((c, i) =>
          st.button(i + 1 + " " + c, () => {
            const s = getS();
            mastermind.choose(s, s.selected, i);
            s.selected = (s.selected + 1) % 4;
            st.status("Đã chọn màu " + c + ".");
          }),
        );
        st.button("Kiểm tra", () => {
          const s = getS();
          if (!s.over) {
            const r = mastermind.submit(s);
            st.status(
              r.won
                ? "Đoán đúng!"
                : s.over
                  ? "Hết lượt. Mã là " +
                    s.secret.map((x) => colors[x]).join(", ")
                  : "Đúng chốt: " + r.exact + "; đúng màu: " + r.color + ".",
            );
          }
        });
      },
    },
  );
  const takuzuSolution = [
    "001011",
    "001101",
    "110010",
    "010011",
    "101100",
    "110100",
  ].map((x) => [...x].map(Number));
  const takuzu = {
    createGame() {
      const given = takuzuSolution.map((r, y) =>
        r.map((_, x) => (y * 7 + x * 5 + 3) % 4 === 0),
      );
      return {
        grid: takuzuSolution.map((r, y) =>
          r.map((v, x) => (given[y][x] ? v : -1)),
        ),
        givens: given,
        moves: 0,
        over: false,
      };
    },
    legal(s, r, c, v) {
      if (
        s.over ||
        !s.grid[r] ||
        c < 0 ||
        c >= 6 ||
        s.givens[r][c] ||
        ![0, 1].includes(v)
      )
        return false;
      let old = s.grid[r][c];
      s.grid[r][c] = v;
      let good = true;
      for (let i = 0; i < 6; i++) {
        for (const line of [s.grid[i], s.grid.map((row) => row[i])]) {
          let ones = line.filter((x) => x === 1).length,
            zeros = line.filter((x) => x === 0).length;
          if (
            ones > 3 ||
            zeros > 3 ||
            line.some(
              (x, j) =>
                j < 4 && x !== -1 && x === line[j + 1] && x === line[j + 2],
            )
          )
            good = false;
        }
      }
      for (let i = 0; i < 6; i++)
        for (let j = i + 1; j < 6; j++)
          if (
            s.grid[i].every((v) => v !== -1) &&
            s.grid[j].every((v) => v !== -1) &&
            s.grid[i].join("") === s.grid[j].join("")
          )
            good = false;
      for (let i = 0; i < 6; i++) {
        let a = s.grid.map((row) => row[i]);
        for (let j = i + 1; j < 6; j++) {
          let b = s.grid.map((row) => row[j]);
          if (
            a.every((v) => v !== -1) &&
            b.every((v) => v !== -1) &&
            a.join("") === b.join("")
          )
            good = false;
        }
      }
      s.grid[r][c] = old;
      return good;
    },
    set(s, r, c, v) {
      if (!this.legal(s, r, c, v)) return false;
      s.grid[r][c] = v;
      s.moves++;
      return true;
    },
    isSolved(s) {
      return (
        s.grid.every(
          (r) =>
            r.every((v) => v === 0 || v === 1) &&
            r.filter((v) => v === 1).length === 3 &&
            !r.some((v, i) => i < 4 && v === r[i + 1] && v === r[i + 2]),
        ) &&
        indices(6).every((c) => {
          let a = s.grid.map((r) => r[c]);
          return (
            a.filter((v) => v === 1).length === 3 &&
            !a.some((v, i) => i < 4 && v === a[i + 1] && v === a[i + 2])
          );
        }) &&
        indices(6).every((i) =>
          indices(6).every(
            (j) => i === j || s.grid[i].join("") !== s.grid[j].join(""),
          ),
        ) &&
        indices(6).every((i) =>
          indices(6).every(
            (j) =>
              i === j ||
              s.grid.map((r) => r[i]).join("") !==
                s.grid.map((r) => r[j]).join(""),
          ),
        )
      );
    },
  };
  game(
    "takuzu-binary",
    "Takuzu 6×6",
    "unruly.html",
    takuzu,
    (ctx, s) => grid(ctx, s.grid, 110, 82, 66, (v) => (v < 0 ? "" : String(v))),
    (s, p) => {
      const h = hit(p, 110, 82, 6, 66);
      if (h) {
        if (s.givens[h.r][h.c]) return "Ô đề không sửa được.";
        const old = s.grid[h.r][h.c],
          v = old < 0 ? 0 : old === 0 ? 1 : -1;
        if (v < 0) {
          s.grid[h.r][h.c] = -1;
          s.moves++;
          return "Đã xóa.";
        }
        return takuzu.set(s, h.r, h.c, v)
          ? "Đã nhập " + v + "."
          : "Vi phạm cân bằng, bộ ba hoặc hàng/cột trùng.";
      }
    },
    {
      mech: [
        "Mỗi hàng/cột có ba số 0 và ba số 1",
        "Không có ba số giống nhau liên tiếp",
        "Không trùng hàng/cột hoàn chỉnh",
      ],
      refTitle: "Simon Tatham Unruly rules; unique lines added",
      hint: "Chạm ô để luân phiên 0, 1, xóa. Hàng và cột đều phải duy nhất.",
    },
  );
  const fSolution = indices(5).map((r) =>
    indices(5).map((c) => ((r + c) % 5) + 1),
  );
  const fIneq = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++) {
      if (c < 4)
        fIneq.push({
          a: [r, c],
          b: [r, c + 1],
          sign: fSolution[r][c] < fSolution[r][c + 1] ? "<" : ">",
        });
      if (r < 4)
        fIneq.push({
          a: [r, c],
          b: [r + 1, c],
          sign: fSolution[r][c] < fSolution[r + 1][c] ? "v" : "^",
        });
    }
  const fGivens = indices(5).map((r) =>
    indices(5).map((c) => (r === c ? fSolution[r][c] : 0)),
  );
  const futoshiki = {
    createGame() {
      return {
        grid: cloneData(fGivens),
        givens: cloneData(fGivens),
        inequalities: cloneData(fIneq),
        moves: 0,
        over: false,
      };
    },
    place(s, r, c, v) {
      if (
        s.over ||
        !s.grid[r] ||
        c < 0 ||
        c >= 5 ||
        s.givens[r][c] ||
        !Number.isInteger(v) ||
        v < 0 ||
        v > 5
      )
        return false;
      if (v) {
        if (
          s.grid[r].some((x, i) => i !== c && x === v) ||
          s.grid.some((row, i) => i !== r && row[c] === v)
        )
          return false;
      }
      s.grid[r][c] = v;
      s.moves++;
      return true;
    },
    isSolved(s) {
      return (
        s.grid.every(
          (r) => r.every((v) => v >= 1 && v <= 5) && hasUniqueValues(r),
        ) &&
        indices(5).every((c) => hasUniqueValues(s.grid.map((r) => r[c]))) &&
        s.inequalities.every((q) => {
          const a = s.grid[q.a[0]][q.a[1]],
            b = s.grid[q.b[0]][q.b[1]];
          return q.sign === "<"
            ? a < b
            : q.sign === ">"
              ? a > b
              : q.sign === "v"
                ? a < b
                : a > b;
        })
      );
    },
  };
  game(
    "futoshiki-inequality",
    "Futoshiki 5×5",
    "unequal.html",
    futoshiki,
    (ctx, s) => {
      const x = 100,
        y = 65,
        z = 76;
      grid(ctx, s.grid, x, y, z, (v) => v || "");
      if (s.sel) {
        ctx.strokeStyle = "#d57842";
        ctx.lineWidth = 4;
        ctx.strokeRect(x + s.sel.c * z + 2, y + s.sel.r * z + 2, z - 4, z - 4);
      }
      ctx.fillStyle = "#a84639";
      ctx.font = "bold 20px Calibri";
      s.inequalities.forEach((q) => {
        let [r, c] = q.a,
          [rr, cc] = q.b;
        const xx = x + ((c + cc + 1) * z) / 2,
          yy = y + ((r + rr + 1) * z) / 2;
        ctx.fillText(
          q.sign === "<"
            ? "<"
            : q.sign === ">"
              ? ">"
              : q.sign === "v"
                ? "∨"
                : "∧",
          xx - 7,
          yy + 6,
        );
      });
      ctx.fillStyle = "#243d39";
      ctx.font = "16px Calibri";
      ctx.fillText(
        "Ô được chọn: " + (s.sel ? s.sel.r + 1 + "," + (s.sel.c + 1) : "—"),
        100,
        500,
      );
    },
    (s, p) => {
      const h = hit(p, 100, 65, 5, 76);
      if (h) {
        s.sel = h;
        return futoshiki.givens[h.r][h.c] ? "Ô đề khóa." : "Đã chọn ô.";
      }
    },
    {
      mech: [
        "Latin 5×5: hàng/cột không lặp",
        "Các dấu <, >, ∧, ∨ bắt buộc đúng hướng",
        "Ô đề khóa",
      ],
      hint: "Chọn ô trống rồi dùng nút số. Dấu giữa ô là bất đẳng thức nghiêm.",
      setup(st, getS, checkWin) {
        for (let v = 1; v <= 5; v++)
          st.button(String(v), () => {
            const q = getS();
            if (q.sel) {
              const ok = futoshiki.place(q, q.sel.r, q.sel.c, v);
              if (ok && !checkWin()) st.status("Đã nhập " + v + ".");
              else if (!ok) st.status("Lặp hàng/cột hoặc ô khóa.");
            }
          });
        st.button("Xóa", () => {
          const q = getS();
          if (q.sel)
            st.status(
              futoshiki.place(q, q.sel.r, q.sel.c, 0)
                ? "Đã xóa."
                : "Ô đề khóa.",
            );
        });
      },
    },
  );
  const kSolution = ["1234", "2341", "3412", "4123"].map((x) =>
    [...x].map(Number),
  );
  const kCages = [];
  for (let r = 0; r < 4; r++)
    for (let pair = 0; pair < 2; pair++) {
      const vals = kSolution[r].slice(pair * 2, pair * 2 + 2),
        ops = ["+", "×", "−", "÷"];
      let chosen = ops[(r + pair) % 4],
        target;
      if (chosen === "+") target = vals[0] + vals[1];
      else if (chosen === "×") target = vals[0] * vals[1];
      else if (chosen === "−") target = Math.abs(vals[0] - vals[1]);
      else {
        chosen = "÷";
        target = Math.max(...vals) / Math.min(...vals);
        if (!Number.isInteger(target)) {
          chosen = "+";
          target = vals[0] + vals[1];
        }
      }
      kCages.push({
        cells: [
          [r, pair * 2],
          [r, pair * 2 + 1],
        ],
        op: chosen,
        target,
      });
    }
  function cageOkay(c, vals) {
    if (vals.some((v) => !v)) return false;
    let a = vals[0],
      b = vals[1];
    switch (c.op) {
      case "+":
        return a + b === c.target;
      case "×":
        return a * b === c.target;
      case "−":
        return Math.abs(a - b) === c.target;
      case "÷":
        return Math.max(a, b) / Math.min(a, b) === c.target;
      default:
        return vals[0] === c.target;
    }
  }
  const kenken = {
    createGame() {
      return {
        grid: Array.from({ length: 4 }, () => Array(4).fill(0)),
        cages: cloneData(kCages),
        moves: 0,
        over: false,
      };
    },
    place(s, r, c, v) {
      if (
        s.over ||
        !s.grid[r] ||
        c < 0 ||
        c >= 4 ||
        !Number.isInteger(v) ||
        v < 0 ||
        v > 4
      )
        return false;
      if (
        v &&
        (s.grid[r].some((x, i) => i !== c && x === v) ||
          s.grid.some((row, i) => i !== r && row[c] === v))
      )
        return false;
      s.grid[r][c] = v;
      s.moves++;
      return true;
    },
    isSolved(s) {
      return (
        s.grid.every(
          (r) => r.every((v) => v >= 1 && v <= 4) && hasUniqueValues(r),
        ) &&
        indices(4).every((c) => hasUniqueValues(s.grid.map((r) => r[c]))) &&
        s.cages.every((k) =>
          cageOkay(
            k,
            k.cells.map(([r, c]) => s.grid[r][c]),
          ),
        )
      );
    },
  };
  game(
    "kenken-cages",
    "KenKen 4×4",
    "keen.html",
    kenken,
    (ctx, s) => {
      const x = 105,
        y = 68,
        z = 94;
      grid(ctx, s.grid, x, y, z, (v) => v || "");
      if (s.sel) {
        ctx.strokeStyle = "#d57842";
        ctx.lineWidth = 4;
        ctx.strokeRect(x + s.sel.c * z + 2, y + s.sel.r * z + 2, z - 4, z - 4);
      }
      s.cages.forEach((k) => {
        let [r, c] = k.cells[0];
        ctx.fillStyle = "#385a55";
        ctx.font = "bold 15px Calibri";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(k.target + k.op, x + c * z + 5, y + r * z + 3);
        ctx.strokeStyle = "#294642";
        ctx.lineWidth = 4;
        ctx.strokeRect(x + c * z + 2, y + r * z + 2, z * 2 - 4, z - 4);
      });
      ctx.fillStyle = "#243d39";
      ctx.font = "16px Calibri";
      ctx.fillText("Chọn ô rồi dùng nút số bên dưới", 105, 495);
    },
    (s, p) => {
      const h = hit(p, 105, 68, 4, 94);
      if (h) {
        s.sel = h;
        return "Chọn ô KenKen.";
      }
    },
    {
      mech: [
        "Latin 4×4: hàng/cột không lặp",
        "Mỗi lồng phải thỏa tổng, tích, hiệu hoặc thương",
        "Không có số cho sẵn; lồng hiển thị phép tính",
      ],
      url: "https://www.kenkenpuzzle.com/learning",
      refTitle: "Official KenKen rules",
      hint: "Mỗi hàng/cột có 1–4. Chọn ô rồi dùng nút số; lồng phải thỏa phép tính.",
      setup(st, getS, checkWin) {
        for (let v = 1; v <= 4; v++)
          st.button(String(v), () => {
            const q = getS();
            if (q.sel) {
              const ok = kenken.place(q, q.sel.r, q.sel.c, v);
              if (ok && !checkWin()) st.status("Đã nhập " + v + ".");
              else if (!ok) st.status("Lặp hàng/cột.");
            }
          });
        st.button("Xóa", () => {
          const q = getS();
          if (q.sel)
            st.status(
              kenken.place(q, q.sel.r, q.sel.c, 0)
                ? "Đã xóa."
                : "Không thể xóa ô.",
            );
        });
      },
    },
  );
  const clueEdges = [
    "h1,1",
    "h1,2",
    "h3,1",
    "h3,2",
    "v1,1",
    "v2,1",
    "v1,3",
    "v2,3",
  ];
  function edgeEnds(id) {
    const [t, rc] = [id[0], id.slice(1).split(",").map(Number)],
      [r, c] = rc;
    return t === "h"
      ? [
          [r, c],
          [r, c + 1],
        ]
      : [
          [r, c],
          [r + 1, c],
        ];
  }
  const slClues = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => {
      const ids = [
        "h" + r + "," + c,
        "h" + (r + 1) + "," + c,
        "v" + r + "," + c,
        "v" + r + "," + (c + 1),
      ];
      const n = ids.filter((id) => clueEdges.includes(id)).length;
      return n || null;
    }),
  );
  const slither = {
    createGame() {
      return { edges: {}, clues: cloneData(slClues), moves: 0, over: false };
    },
    setEdge(s, id, v) {
      if (s.over || !["h", "v"].includes(id[0]) || ![0, 1, null].includes(v))
        return false;
      s.edges[id] = v;
      s.moves++;
      return true;
    },
    cycle(s, id) {
      const v = s.edges[id];
      return this.setEdge(s, id, v === undefined ? 1 : v === 1 ? 0 : null);
    },
    isSolved(s) {
      const active = Object.keys(s.edges).filter((k) => s.edges[k] === 1);
      if (active.length < 4) return false;
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
          if (s.clues[r][c] !== null) {
            let ids = [
              "h" + r + "," + c,
              "h" + (r + 1) + "," + c,
              "v" + r + "," + c,
              "v" + r + "," + (c + 1),
            ];
            if (ids.filter((id) => s.edges[id] === 1).length !== s.clues[r][c])
              return false;
          }
      let adj = new Map();
      for (const id of active) {
        const [a, b] = edgeEnds(id);
        for (const [y, x] of [a, b]) {
          const k = y + "," + x;
          if (!adj.has(k)) adj.set(k, []);
          adj.get(k).push(id);
        }
      }
      if ([...adj.values()].some((a) => a.length !== 2)) return false;
      let seen = new Set(),
        todo = [[...adj.keys()][0]];
      while (todo.length) {
        const v = todo.pop();
        if (seen.has(v)) continue;
        seen.add(v);
        for (const id of adj.get(v) || [])
          for (const [y, x] of edgeEnds(id)) {
            const k = y + "," + x;
            if (!seen.has(k)) todo.push(k);
          }
      }
      return seen.size === adj.size;
    },
  };
  game(
    "slitherlink-loop",
    "Slitherlink 4×4",
    "loopy.html",
    slither,
    (ctx, s) => {
      const x = 110,
        y = 90,
        z = 90;
      ctx.fillStyle = "#edf3f1";
      ctx.fillRect(x, y, 4 * z, 4 * z);
      ctx.strokeStyle = "#ccd9d6";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * z, y);
        ctx.lineTo(x + i * z, y + 4 * z);
        ctx.moveTo(x, y + i * z);
        ctx.lineTo(x + 4 * z, y + i * z);
        ctx.stroke();
      }
      ctx.fillStyle = "#203e3a";
      ctx.font = "bold 22px Calibri";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      s.clues.forEach((r, rr) =>
        r.forEach((v, c) => {
          if (v !== null)
            ctx.fillText(v, x + (c + 0.5) * z, y + (rr + 0.5) * z);
        }),
      );
      for (let r = 0; r <= 4; r++)
        for (let c = 0; c < 4; c++)
          drawEdge(
            ctx,
            s,
            "h" + r + "," + c,
            x + c * z,
            y + r * z,
            x + (c + 1) * z,
            y + r * z,
          );
      for (let r = 0; r < 4; r++)
        for (let c = 0; c <= 4; c++)
          drawEdge(
            ctx,
            s,
            "v" + r + "," + c,
            x + c * z,
            y + r * z,
            x + c * z,
            y + (r + 1) * z,
          );
      ctx.textAlign = "left";
      ctx.fillStyle = "#203e3a";
      ctx.font = "15px Calibri";
      ctx.fillText("Chạm cạnh: nét → gạch → bỏ", 110, 495);
    },
    (s, p) => {
      let best = null,
        dist = 1e9;
      const x = 110,
        y = 90,
        z = 90;
      for (let r = 0; r <= 4; r++)
        for (let c = 0; c < 4; c++) {
          let d = segmentDist(
            p.x,
            p.y,
            x + c * z,
            y + r * z,
            x + (c + 1) * z,
            y + r * z,
          );
          if (d < dist) {
            dist = d;
            best = "h" + r + "," + c;
          }
        }
      for (let r = 0; r < 4; r++)
        for (let c = 0; c <= 4; c++) {
          let d = segmentDist(
            p.x,
            p.y,
            x + c * z,
            y + r * z,
            x + c * z,
            y + (r + 1) * z,
          );
          if (d < dist) {
            dist = d;
            best = "v" + r + "," + c;
          }
        }
      if (dist < 19) {
        slither.cycle(s, best);
        return "Đã đổi cạnh.";
      }
    },
    {
      mech: [
        "Mỗi số đếm cạnh quanh ô",
        "Các nét phải là đúng một vòng kín không nhánh",
        "Nhiều vòng rời nhau không thắng",
      ],
      url: "https://www.nikoli.co.jp/en/puzzles/slitherlink/",
      refTitle: "Nikoli Slitherlink rules",
      hint: "Chạm gần cạnh để đổi nét / dấu gạch / chưa quyết định.",
    },
  );
  function drawEdge(ctx, s, id, x1, y1, x2, y2) {
    const v = s.edges[id];
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = v === 1 ? 7 : 2;
    ctx.strokeStyle = v === 1 ? "#226f66" : v === 0 ? "#c2776d" : "#8b9d99";
    ctx.stroke();
    if (v === 0) {
      ctx.beginPath();
      ctx.moveTo((x1 + x2) / 2 - 5, (y1 + y2) / 2 - 5);
      ctx.lineTo((x1 + x2) / 2 + 5, (y1 + y2) / 2 + 5);
      ctx.moveTo((x1 + x2) / 2 + 5, (y1 + y2) / 2 - 5);
      ctx.lineTo((x1 + x2) / 2 - 5, (y1 + y2) / 2 + 5);
      ctx.stroke();
    }
  }
  function segmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1,
      dy = y2 - y1,
      t = Math.max(
        0,
        Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)),
      );
    return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
  }
  const islands = indices(9).map((i) => ({
    id: i,
    r: Math.floor(i / 3),
    c: i % 3,
    x: Math.floor(i / 3),
    y: i % 3,
    need: [3, 4, 2, 2, 2, 2, 2, 3, 2][i],
  }));
  const bridges = {
    createGame() {
      return {
        islands: cloneData(islands),
        bridges: {},
        selected: null,
        moves: 0,
        over: false,
      };
    },
    neighbors(a, b) {
      const A1 = islands[a],
        B1 = islands[b];
      return (
        !!A1 &&
        !!B1 &&
        ((A1.r === B1.r && Math.abs(A1.c - B1.c) === 1) ||
          (A1.c === B1.c && Math.abs(A1.r - B1.r) === 1))
      );
    },
    setBridge(s, a, b, count) {
      if (
        s.over ||
        a === b ||
        !this.neighbors(a, b) ||
        ![0, 1, 2].includes(count)
      )
        return false;
      let k = [a, b].sort((x, y) => x - y).join("-");
      const sums = Array(9).fill(0);
      for (const [key, n] of Object.entries(s.bridges)) {
        const [u, v] = key.split("-").map(Number);
        if (key !== k) {
          sums[u] += n;
          sums[v] += n;
        }
      }
      let [u, v] = k.split("-").map(Number);
      if (
        sums[u] + count > s.islands[u].need ||
        sums[v] + count > s.islands[v].need
      )
        return false;
      s.bridges[k] = count;
      s.moves++;
      return true;
    },
    connect(s, a, b) {
      let k = [a, b].sort((x, y) => x - y).join("-");
      return this.setBridge(s, a, b, ((s.bridges[k] || 0) + 1) % 3);
    },
    isSolved(s) {
      const sums = Array(9).fill(0),
        adj = Array.from({ length: 9 }, () => []);
      for (const [key, n] of Object.entries(s.bridges)) {
        if (!n) continue;
        const [a, b] = key.split("-").map(Number);
        if (!this.neighbors(a, b)) return false;
        sums[a] += n;
        sums[b] += n;
        adj[a].push(b);
        adj[b].push(a);
      }
      if (sums.some((n, i) => n !== s.islands[i].need)) return false;
      let seen = new Set(),
        stack = [0];
      while (stack.length) {
        let i = stack.pop();
        if (seen.has(i)) continue;
        seen.add(i);
        stack.push(...adj[i]);
      }
      if (seen.size !== 9) return false;
      for (const [ka, na] of Object.entries(s.bridges)) {
        if (!na) continue;
        const [a, b] = ka.split("-").map(Number),
          A1 = islands[a],
          B1 = islands[b];
        for (const [kb, nb] of Object.entries(s.bridges)) {
          if (kb <= ka || !nb) continue;
          const [c, d] = kb.split("-").map(Number),
            C1 = islands[c],
            D1 = islands[d];
          if (A1.r === B1.r && C1.c === D1.c) {
            const x = C1.c,
              y = A1.r;
            if (
              x > Math.min(A1.c, B1.c) &&
              x < Math.max(A1.c, B1.c) &&
              y > Math.min(C1.r, D1.r) &&
              y < Math.max(C1.r, D1.r)
            )
              return false;
          }
        }
      }
      return true;
    },
  };
  game(
    "hashi-bridges",
    "Hashi Bridges",
    "bridges.html",
    bridges,
    (ctx, s) => {
      const x0 = 110,
        y0 = 72,
        gap = 190;
      for (const [k, n] of Object.entries(s.bridges)) {
        if (!n) continue;
        const [a, b] = k.split("-").map(Number),
          aa = s.islands[a],
          bb = s.islands[b],
          x1 = x0 + aa.c * gap,
          y1 = y0 + aa.r * gap,
          x2 = x0 + bb.c * gap,
          y2 = y0 + bb.r * gap;
        ctx.strokeStyle = "#325b56";
        ctx.lineWidth = n === 2 ? 9 : 5;
        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          let off = n === 2 ? (i - 0.5) * 10 : 0;
          if (x1 === x2) {
            ctx.moveTo(x1 + off, y1 + 35);
            ctx.lineTo(x2 + off, y2 - 35);
          } else {
            ctx.moveTo(x1 + 35, y1 + off);
            ctx.lineTo(x2 - 35, y2 + off);
          }
          ctx.stroke();
        }
      }
      s.islands.forEach((i) => {
        let x = x0 + i.c * gap,
          y = y0 + i.r * gap;
        ctx.fillStyle = "#f7fbfa";
        ctx.beginPath();
        ctx.arc(x, y, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = s.selected === i.id ? "#d57842" : "#315a55";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = "#173b37";
        ctx.font = "bold 23px Calibri";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i.need, x, y);
      });
      ctx.fillStyle = "#213d39";
      ctx.textAlign = "left";
      ctx.font = "16px Calibri";
      ctx.fillText("Chọn 2 đảo kề để đổi cầu 0 → 1 → 2 → 0", 80, 595);
    },
    (s, p) => {
      const x0 = 110,
        y0 = 72,
        gap = 190;
      let i = s.islands.find(
        (q) => Math.hypot(p.x - (x0 + q.c * gap), p.y - (y0 + q.r * gap)) < 40,
      );
      if (!i) return;
      if (s.selected === null) {
        s.selected = i.id;
        return "Chọn đảo thứ hai.";
      }
      const a = s.selected,
        b = i.id;
      s.selected = null;
      if (!bridges.neighbors(a, b))
        return "Chỉ nối đảo gần nhất cùng hàng/cột.";
      return bridges.connect(s, a, b)
        ? "Đã đổi số cầu."
        : "Vượt số cầu cần ở đảo.";
    },
    {
      mech: [
        "Chỉ nối đảo nhìn thấy gần nhất theo hàng/cột",
        "Mỗi đường có 0–2 cầu; không giao nhau",
        "Mỗi đảo đủ số cầu và toàn mạng nối liền",
      ],
      url: "https://www.nikoli.co.jp/en/puzzles/Hashiwokakero/",
      refTitle: "Nikoli Hashiwokakero rules",
      hint: "Chạm hai đảo gần nhất để đổi 0/1/2 cầu. Nối hết đảo thành một mạng.",
    },
  );
})();
