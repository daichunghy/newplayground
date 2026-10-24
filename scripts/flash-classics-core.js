/* Independent browser-classics recreation engines. Original vector art, no bundled commercial assets. */
(function () {
  'use strict';
  const W = 760, H = 500, TAU = Math.PI * 2, engines = Object.create(null);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const dist = (x, y, xx, yy) => Math.hypot(x - xx, y - yy);
  const rect = (c, x, y, w, h, fill) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
  const circle = (c, x, y, r, fill, stroke, sw = 1) => {
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = sw; c.strokeStyle = stroke; c.stroke(); }
  };
  const line = (c, x, y, xx, yy, stroke, sw = 1) => {
    c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = stroke; c.lineWidth = sw; c.stroke();
  };
  const label = (c, str, x, y, size = 16, color = '#fff', align = 'left', weight = '700') => {
    c.font = weight + ' ' + size + 'px Calibri, Arial, sans-serif';
    c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(String(str), x, y);
  };
  const round = (c, x, y, w, h, r, fill, stroke = '') => {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  };
  const polygon = (c, points, fill, stroke = '', sw = 1) => {
    c.beginPath(); c.moveTo(...points[0]);
    points.slice(1).forEach(p => c.lineTo(...p)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = sw; c.stroke(); }
  };
  const bestKey = id => 'np_flashclassic_best_' + id;
  const getBest = id => { try { return Number(localStorage.getItem(bestKey(id))) || 0; } catch (_) { return 0; } };
  const saveBest = (id, value) => { try { localStorage.setItem(bestKey(id), String(value)); } catch (_) {} };
  const art = { W, H, TAU, clamp, dist, rect, circle, line, label, round, polygon };
  function register(id, create) {
    if (typeof create !== 'function' || engines[id]) throw new Error('Invalid classic: ' + id);
    engines[id] = create;
  }
  function launchGame(container, game) {
    const factory = engines[game && game.id];
    if (!factory) throw new Error('Classic game not found: ' + game?.id);
    const session = window.NP_GameSession.start();
    const gameState = factory({ ...art, gameId: game.id, getBest: () => getBest(game.id),
      saveBest: n => { if (Number.isFinite(n)) saveBest(game.id, n); } });
    const buttons = gameState.controls || [];
    const buttonMarkup = buttons.map(btn =>
      '<button type="button" class="flash-control' + (btn.hold ? ' is-hold' : '') +
      '" id="flash-' + btn.id + '" aria-label="' + btn.label + '">' + btn.label + '</button>').join('');
    container.innerHTML =
      '<div class="canvas-game-box np-flash-classic np-flash-' + game.id + '">' +
      '<canvas id="flashCanvas" class="canvas-main-viewport flash-original-view" width="760" height="500" tabindex="0" aria-label="' +
      game.title.replace(/"/g, '&quot;') + '"></canvas>' +
      '<div class="flash-controls" aria-label="Điều khiển trò chơi">' + buttonMarkup +
      '<button type="button" id="flashRestart" class="flash-reset">↻ Chơi lại</button></div>' +
      '<div class="flash-hint" id="flashHint">' + (gameState.hint || 'Dùng các phím điều khiển theo game.') + '</div></div>';
    const canvas = container.querySelector('#flashCanvas'), c = canvas.getContext('2d');
    const held = new Set(); let lastTime = 0, pointerDown = false;
    const inputMap = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      KeyQ: 'q', KeyO: 'o', KeyP: 'p', Space: 'space', Enter: 'enter'
    };
    const controlsById = new Set(buttons.map(b => b.id));
    function restart() { if (session.isActive()) launchGame(container, game); }
    session.listen(container.querySelector('#flashRestart'), 'click', restart);
    for (const btn of buttons) {
      const el = container.querySelector('#flash-' + btn.id);
      if (!el) continue;
      if (btn.hold) {
        session.listen(el, 'pointerdown', e => {
          e.preventDefault?.(); held.add(btn.id); el.setPointerCapture?.(e.pointerId);
        });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'])
          session.listen(el, type, () => held.delete(btn.id));
      } else {
        session.listen(el, 'click', () => {
          if (!session.isPaused()) gameState.action?.(btn.id);
        });
      }
    }
    session.listen(window, 'keydown', e => {
      if (session.isPaused()) return;
      if (e.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const key = gameState.keyMap?.[e.code] || inputMap[e.code] || inputMap[e.key];
      if (key && (controlsById.has(key) || gameState.keys?.includes(key))) {
        e.preventDefault?.();
        held.add(key);
        if (!e.repeat) gameState.action?.(key, true);
      } else if (e.code === 'KeyR' && !e.repeat) {
        gameState.action?.('restart');
      }
    });
    session.listen(window, 'keyup', e => {
      const key = gameState.keyMap?.[e.code] || inputMap[e.code] || inputMap[e.key];
      if (key) { held.delete(key); gameState.release?.(key); }
    });
    const point = e => {
      const b = canvas.getBoundingClientRect();
      return { x: clamp(((e.clientX ?? b.left) - b.left) * W / Math.max(1, b.width), 0, W),
        y: clamp(((e.clientY ?? b.top) - b.top) * H / Math.max(1, b.height), 0, H) };
    };
    session.listen(canvas, 'pointerdown', e => {
      if (session.isPaused()) return;
      e.preventDefault?.(); pointerDown = true; canvas.setPointerCapture?.(e.pointerId);
      const p = point(e); gameState.pointer?.('down', p.x, p.y);
    });
    session.listen(canvas, 'pointermove', e => {
      if (!pointerDown || session.isPaused()) return;
      const p = point(e); gameState.pointer?.('move', p.x, p.y);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      session.listen(canvas, type, e => {
        if (!pointerDown) return;
        pointerDown = false; const p = point(e); gameState.pointer?.('up', p.x, p.y);
      });
    session.listen(window, 'blur', () => { held.clear(); pointerDown = false; gameState.pointer?.('cancel', -1, -1); });
    session.onPauseChange(() => {
      held.clear(); pointerDown = false; lastTime = 0; gameState.pointer?.('cancel', -1, -1);
    });
    function frame(now) {
      if (!session.isActive()) return;
      const dt = lastTime ? clamp((now - lastTime) / 1000, 0, .034) : 0;
      lastTime = now;
      gameState.update?.(dt, held);
      c.clearRect(0, 0, W, H);
      gameState.draw(c);
      session.requestAnimationFrame(frame);
    }
    gameState.init?.();
    session.requestAnimationFrame(frame);
    return { session, gameState };
  }
  window.NP_ClassicWeb = { register, hasGame: id => Boolean(engines[id]), launchGame, art };
})();