/* NewPlayground: independent, pause-aware real-life simulations. No external assets. */
(function () {
  'use strict';
  const W = 760, H = 460, TAU = Math.PI * 2;
  const factories = Object.create(null);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const distance = (a, b, x, y) => Math.hypot(a - x, b - y);
  const random = (lo, hi) => lo + Math.random() * (hi - lo);
  const pad = n => String(Math.max(0, Math.ceil(n))).padStart(2, '0');

  function rect(c, x, y, w, h, color) {
    if (color) c.fillStyle = color;
    c.fillRect(x, y, w, h);
  }
  function circle(c, x, y, r, color, stroke) {
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU);
    if (color) { c.fillStyle = color; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  function rounded(c, x, y, w, h, r, color, stroke) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    if (color) { c.fillStyle = color; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }
  function text(c, value, x, y, size, color, align, weight) {
    c.font = (weight || '600') + ' ' + (size || 14) + 'px Calibri, Arial, sans-serif';
    c.fillStyle = color || '#fff'; c.textAlign = align || 'left';
    c.textBaseline = 'middle'; c.fillText(String(value), x, y);
  }
  function gradient(c, y1, y2, stops) {
    const g = c.createLinearGradient(0, y1, 0, y2);
    stops.forEach(stop => g.addColorStop(stop[0], stop[1]));
    return g;
  }
  function path(c, points, fill, stroke, lineWidth) {
    if (!points.length) return;
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(p => c.lineTo(p[0], p[1]));
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth || 1; c.stroke(); }
  }
  function banner(c, top, sub) {
    rounded(c, 16, 14, 285, 52, 10, 'rgba(8,15,27,.70)');
    text(c, top, 28, 30, 17, '#fff', 'left', '700');
    text(c, sub, 28, 51, 11, '#afc6d4', 'left', '500');
  }
  function sparkle(c, x, y, amount, color) {
    c.strokeStyle = color || '#fff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - amount, y); c.lineTo(x + amount, y);
    c.moveTo(x, y - amount); c.lineTo(x, y + amount); c.stroke();
  }
  const art = { W, H, TAU, clamp, distance, random, rect, circle, rounded, text, gradient, path, banner, sparkle };

  function register(id, maker) {
    if (typeof id !== 'string' || !id || typeof maker !== 'function') throw new TypeError('Invalid life-sim engine');
    if (factories[id]) throw new Error('Duplicate game: ' + id);
    factories[id] = maker;
  }
  function safeNumber(key) {
    try { return Number(localStorage.getItem(key)) || 0; } catch (_) { return 0; }
  }
  function safeWrite(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) { /* Optional storage. */ }
  }
  function playFeedback(kind) {
    try { window.NP_Juice && window.NP_Juice.vibrate && window.NP_Juice.vibrate[kind || 'light'](); } catch (_) {}
  }

  function launchGame(container, game) {
    const maker = factories[game && game.id];
    if (!maker) throw new Error('Unknown simulation: ' + (game && game.id));
    const session = window.NP_GameSession.start();
    const key = 'np_lifesim_best_' + game.id;
    const state = {
      time: 0, limit: 150, score: 0, best: safeNumber(key), phase: 'playing',
      message: 'Sẵn sàng. Bắt đầu nhiệm vụ!', progress: 0, goal: 1,
      say(value) { this.message = String(value); },
      add(points) { this.score += points; playFeedback('light'); },
      finish(won, reason) {
        if (this.phase !== 'playing') return;
        this.phase = won ? 'won' : 'lost';
        this.message = reason || (won ? 'Hoàn thành nhiệm vụ!' : 'Hết lượt!');
        if (this.score > this.best) { this.best = this.score; safeWrite(key, this.best); }
        playFeedback(won ? 'success' : 'heavy');
      }
    };
    const mode = maker(state, art);
    state.limit = mode.limit || 150;
    const controls = mode.controls || [];
    container.innerHTML = '<div class="canvas-game-box life-sim">' +
      '<div class="life-sim-top"><div><span class="life-sim-kicker">REAL LIFE / SIMULATION</span>' +
      '<strong class="life-sim-name">' + (mode.title || game.title) + '</strong></div>' +
      '<div class="life-sim-scores"><span>ĐIỂM <b id="lifeScore">0</b></span>' +
      '<span>THỜI GIAN <b id="lifeTime">00:00</b></span><span>KỶ LỤC <b id="lifeBest">0</b></span></div></div>' +
      '<canvas id="lifeCanvas" class="canvas-main-viewport life-sim-canvas" width="760" height="460" tabindex="0" aria-label="' +
      (mode.title || game.title) + ': sân chơi mô phỏng"></canvas>' +
      '<div class="life-sim-bottom"><div class="life-sim-objective"><strong id="lifeObjective">Nhiệm vụ</strong>' +
      '<span id="lifeNotice" role="status" aria-live="polite"></span></div>' +
      '<button type="button" id="lifeRestartBtn" class="life-sim-restart">↻ Chơi lại</button></div>' +
      '<div class="life-sim-controls" aria-label="Điều khiển">' +
      controls.map(btn => '<button type="button" class="life-sim-control' + (btn.hold ? ' is-hold' : '') +
      '" data-life-control="' + btn.id + '" data-life-hold="' + (btn.hold ? '1' : '0') +
      '" aria-label="' + btn.label + '">' + btn.label + '</button>').join('') + '</div>' +
      '<p class="life-sim-hint">' + (mode.hint || 'Bàn phím hoặc nút cảm ứng • Esc / P để tạm dừng') + '</p></div>';

    const canvas = container.querySelector('#lifeCanvas');
    const c = canvas.getContext('2d');
    const held = new Set();
    let pointerHeld = false;
    let last = 0;
    let lastStatus = '';
    function syncHud() {
      const objective = mode.metric ? mode.metric() : (state.progress + '/' + state.goal);
      const value = [state.score, Math.ceil(Math.max(0, state.limit - state.time)), state.best, objective, state.message].join('|');
      if (lastStatus === value) return;
      lastStatus = value;
      const set = (id, content) => {
        const node = container.querySelector(id); if (node) node.textContent = String(content);
      };
      const left = Math.max(0, state.limit - state.time);
      set('#lifeScore', state.score);
      set('#lifeTime', pad(left / 60 - (left % 60) / 60) + ':' + pad(left % 60));
      set('#lifeBest', state.best);
      set('#lifeObjective', objective);
      set('#lifeNotice', state.message);
    }
    function restart() { if (session.isActive()) launchGame(container, game); }
    session.listen(container.querySelector('#lifeRestartBtn'), 'click', restart);
    for (const btn of controls) {
      const element = container.querySelector('[data-life-control="' + btn.id + '"]');
      if (!element) continue;
      if (btn.hold) {
        session.listen(element, 'pointerdown', e => {
          if (state.phase !== 'playing' || session.isPaused()) return;
          e.preventDefault?.(); held.add(btn.id);
          element.setPointerCapture?.(e.pointerId);
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
          session.listen(element, type, () => held.delete(btn.id));
        }
      } else {
        session.listen(element, 'click', () => {
          if (state.phase === 'playing' && !session.isPaused()) {
            mode.action?.(btn.id);
            syncHud();
          }
        });
      }
    }
    const codeToAction = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down'
    };
    session.listen(window, 'keydown', e => {
      if (state.phase !== 'playing' || session.isPaused()) return;
      if (e.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const control = codeToAction[e.code] || codeToAction[e.key];
      if (control) { e.preventDefault(); held.add(control); return; }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) mode.action?.('primary');
      } else if (e.code === 'KeyR' || e.code === 'KeyE') {
        if (!e.repeat) mode.action?.('secondary');
      } else if (mode.key) mode.key(e.key, e);
      syncHud();
    });
    session.listen(window, 'keyup', e => {
      const control = codeToAction[e.code] || codeToAction[e.key];
      if (control) held.delete(control);
    });
    session.listen(window, 'blur', () => { held.clear(); pointerHeld = false; mode.pointer?.('up', -1, -1); });
    const point = e => {
      const bounds = canvas.getBoundingClientRect();
      return [
        clamp(((e.clientX ?? bounds.left) - bounds.left) * W / Math.max(1, bounds.width), 0, W),
        clamp(((e.clientY ?? bounds.top) - bounds.top) * H / Math.max(1, bounds.height), 0, H)
      ];
    };
    session.listen(canvas, 'pointerdown', e => {
      if (state.phase !== 'playing' || session.isPaused()) return;
      e.preventDefault?.(); pointerHeld = true;
      const p = point(e); mode.pointer?.('down', p[0], p[1]);
      canvas.setPointerCapture?.(e.pointerId);
    });
    session.listen(canvas, 'pointermove', e => {
      if (!pointerHeld || state.phase !== 'playing' || session.isPaused()) return;
      const p = point(e); mode.pointer?.('move', p[0], p[1]);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      session.listen(canvas, type, e => {
        if (!pointerHeld) return;
        pointerHeld = false;
        const p = point(e); mode.pointer?.('up', p[0], p[1]);
      });
    }
    session.onPauseChange(() => {
      held.clear(); pointerHeld = false; last = 0;
      mode.pointer?.('up', -1, -1);
    });
    function paintEnd() {
      rect(c, 0, 0, W, H, 'rgba(7,15,25,.76)');
      rounded(c, 180, 123, 400, 212, 20, '#122536', '#4d6d80');
      text(c, state.phase === 'won' ? 'NHIỆM VỤ HOÀN THÀNH' : 'CA CHƠI KẾT THÚC', 380, 175, 26,
        state.phase === 'won' ? '#a2f9c3' : '#ffd4b1', 'center', '700');
      text(c, state.score + ' điểm', 380, 224, 29, '#ffffff', 'center', '700');
      text(c, state.message, 380, 268, 15, '#cfdfeb', 'center', '500');
      text(c, 'Chọn "Chơi lại" để thử lần nữa', 380, 304, 13, '#a9bbc9', 'center', '500');
    }
    function frame(now) {
      if (!session.isActive()) return;
      const dt = last ? clamp((now - last) / 1000, 0, 0.045) : 0;
      last = now;
      if (state.phase === 'playing') {
        state.time += dt;
        if (state.time >= state.limit) state.finish(false, 'Đã hết thời gian!');
        else mode.update?.(dt, held);
      }
      c.clearRect(0, 0, W, H);
      mode.draw(c);
      if (state.phase !== 'playing') paintEnd();
      syncHud();
      if (state.phase === 'playing') session.requestAnimationFrame(frame);
    }
    mode.reset?.();
    syncHud();
    session.requestAnimationFrame(frame);
    return { session, state };
  }
  window.NP_LifeSim = { register, hasGame: id => !!factories[id], launchGame, art };
})();