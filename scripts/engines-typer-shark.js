/* Dedicated, game-specific recreation of Typer Shark's word-target loop. */
(function () {
  'use strict';
  const W = 640, H = 480;
  const WORDS = ['REEF', 'SHARK', 'DIVE', 'CORAL', 'OCEAN', 'BUBBLE', 'TROPHY', 'DANGER', 'FIN', 'DEEP', 'WATER', 'SEA', 'PEARL', 'CRAB', 'WRECK', 'TREASURE'];

  function launch(container) {
    const session = window.NP_GameSession.start();
    const { listen, requestAnimationFrame } = session;
    const sharedPause = typeof session.pause === 'function' && typeof session.resume === 'function' && typeof session.onPauseChange === 'function';
    container.innerHTML =
      '<div class="canvas-game-box np-typer-shark">' +
        '<div class="canvas-game-hud np-ts-hud">' +
          '<div class="np-ts-name">SHARK ZAPPER</div>' +
          '<div class="hud-pill">LEVEL <span id="tsLevel">1</span></div>' +
          '<div class="hud-pill">SCORE <span id="tsScore">0</span></div>' +
          '<div class="hud-pill">LIVES <span id="tsLives">3</span></div>' +
        '</div>' +
        '<canvas id="tsCanvas" class="canvas-main-viewport np-ts-canvas" width="640" height="480" aria-label="Underwater typing game"></canvas>' +
        '<div class="np-ts-console">' +
          '<label class="np-ts-label" for="tsInput">TYPE THE WORD ON A SHARK</label>' +
          '<div class="np-ts-entry">' +
            '<input id="tsInput" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="Gõ từ để bắn…" aria-label="Nhập từ trên cá mập">' +
            '<button id="tsZapper" type="button" title="Dùng Shark Zapper khi thanh năng lượng đầy">ZAPPER 0%</button>' +
          '</div>' +
          '<div class="np-ts-meter" aria-hidden="true"><span id="tsMeterFill"></span></div>' +
          '<div class="np-ts-status" id="tsStatus" role="status" aria-live="polite">READY! Gõ đúng từ đang bơi về phía bạn.</div>' +
          '<div class="np-ts-actions">' +
            '<button id="tsPause" type="button">PAUSE</button>' +
            '<button id="tsRestart" type="button">CHƠI LẠI</button>' +
          '</div>' +
          '<span id="tsTargets" class="np-ts-sr-only" aria-live="polite"></span>' +
        '</div>' +
      '</div>';

    const canvas = container.querySelector('#tsCanvas');
    const ctx = canvas.getContext('2d');
    const input = container.querySelector('#tsInput');
    const state = {
      sharks: [], effects: [], elapsed: 0, lastTime: 0,
      spawnIn: 2.5, score: 0, best: 0, lives: 3, level: 1,
      kills: 0, charge: 0, typed: '', phase: 'playing', paused: false,
      flash: 0, diverKick: 0
    };
    try {
      const best = Number(localStorage.getItem('np_typer_shark_best') || 0);
      state.best = Number.isFinite(best) ? Math.max(0, best) : 0;
    } catch (_) {}

    const text = (id, value) => {
      const el = container.querySelector(id);
      if (el) el.textContent = String(value);
    };

    function spawnShark(initial) {
      const available = WORDS.filter(word => !state.sharks.some(shark => shark.word === word));
      const word = available[Math.floor(Math.random() * available.length)];
      state.sharks.push({
        x: initial ? W - 70 - state.sharks.length * 110 : W - 70, y: 88 + Math.random() * 292, word,
        speed: 27 + state.level * 3 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2
      });
    }

    function sharkSide(x) { return x < 300 ? 'near the diver' : (x < 500 ? 'mid-water' : 'far right'); }

    function updateTargets() {
      const value = state.sharks.map((shark, index) => 'Target ' + (index + 1) + ', ' + sharkSide(shark.x) + ': ' + shark.word).join('. ');
      const list = container.querySelector('#tsTargets');
      if (list && list.textContent !== value) list.textContent = value;
    }

    function updateHUD() {
      text('#tsLevel', state.level);
      text('#tsScore', state.score);
      text('#tsLives', '♥ '.repeat(state.lives).trim() || '—');
      text('#tsZapper', 'ZAPPER ' + state.charge + '%');
      const fill = container.querySelector('#tsMeterFill');
      if (fill) fill.style.width = state.charge + '%';
      const pause = container.querySelector('#tsPause');
      if (pause) {
        pause.textContent = state.paused ? 'TIẾP TỤC' : 'TẠM DỪNG';
        pause.disabled = state.phase === 'over';
        pause.setAttribute('aria-pressed', String(state.paused));
      }
      input.disabled = state.paused || state.phase !== 'playing';
      const zapper = container.querySelector('#tsZapper');
      if (zapper) zapper.disabled = input.disabled || state.charge < 100;
      updateTargets();
    }

    function message(value) { text('#tsStatus', value); }

    function zap(shark) {
      const index = state.sharks.indexOf(shark);
      if (index < 0) return;
      state.sharks.splice(index, 1);
      state.kills++;
      state.score += 100 + state.level * 25;
      state.charge = Math.min(100, state.charge + 24);
      state.effects.push({ x: shark.x, y: shark.y, life: 0.7, max: 0.7, kind: 'zap' });
      state.diverKick = 0.22;
      if (state.kills % 5 === 0) {
        state.level++;
        message('LEVEL ' + state.level + ' — cá mập bơi nhanh hơn!');
      } else {
        message('NICE SHOT! +' + (100 + state.level * 25));
      }
      if (state.score > state.best) {
        state.best = state.score;
        try { localStorage.setItem('np_typer_shark_best', String(state.best)); } catch (_) {}
      }
      updateHUD();
    }

    function useZapper() {
      if (state.charge < 100 || state.phase !== 'playing' || state.paused) {
        message('SHARK ZAPPER đang sạc — hạ thêm cá mập để nạp năng lượng.');
        return;
      }
      const victims = [...state.sharks];
      if (!victims.length) {
        message('Chưa có mục tiêu trong tầm của SHARK ZAPPER.');
        return;
      }
      state.charge = 0;
      state.typed = '';
      input.value = '';
      for (const shark of victims) {
        state.score += 75 + state.level * 10;
        state.effects.push({ x: shark.x, y: shark.y, life: 0.8, max: 0.8, kind: 'zap' });
      }
      state.kills += victims.length;
      state.sharks = [];
      state.effects.push({ x: 390, y: 240, life: 0.8, max: 0.8, kind: 'wave' });
      if (state.kills >= 5) state.level = 1 + Math.floor(state.kills / 5);
      if (state.score > state.best) {
        state.best = state.score;
        try { localStorage.setItem('np_typer_shark_best', String(state.best)); } catch (_) {}
      }
      message('SHARK ZAPPER! ' + victims.length + ' mục tiêu bị hạ.');
      updateHUD();
    }

    function submitLetters(raw) {
      if (state.phase !== 'playing' || state.paused) return;
      const value = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);
      input.value = value;
      state.typed = value;
      if (!value) return;
      const matching = state.sharks.filter(shark => shark.word.startsWith(value)).sort((a, b) => a.x - b.x);
      if (matching.length) {
        if (matching[0].word === value) {
          zap(matching[0]);
          state.typed = '';
          input.value = '';
        } else {
          message('TARGET LOCKED: ' + matching[0].word + ' — ' + sharkSide(matching[0].x));
        }
      } else {
        const last = value.slice(-1);
        const retry = state.sharks.filter(shark => shark.word.startsWith(last)).sort((a, b) => a.x - b.x);
        if (retry.length) {
          state.typed = last;
          input.value = last;
          message('LETTER RESET — continue the highlighted word.');
        } else {
          state.typed = '';
          input.value = '';
          state.flash = 0.18;
          message('MISS! Start with a letter shown above a shark.');
        }
      }
    }

    function resetGame() {
      state.sharks = [];
      state.effects = [];
      state.elapsed = 0;
      state.spawnIn = 2.5;
      state.score = 0;
      state.lives = 3;
      state.level = 1;
      state.kills = 0;
      state.charge = 0;
      state.typed = '';
      state.phase = 'playing';
      state.paused = false;
      state.flash = 0;
      state.diverKick = 0;
      state.lastTime = 0;
      input.value = '';
      spawnShark(true);
      spawnShark(true);
      message('READY! Gõ đúng từ đang bơi về phía bạn.');
      updateHUD();
      if (sharedPause && session.isPaused()) session.resume();
      input.focus();
    }

    function loseLife() {
      state.lives--;
      state.flash = 0.45;
      state.effects.push({ x: 155, y: 250, life: 0.55, max: 0.55, kind: 'hit' });
      state.typed = '';
      input.value = '';
      if (state.lives <= 0) {
        state.phase = 'over';
        message('DIVE OVER — ' + state.score + ' points. Nhấn CHƠI LẠI để thử lần nữa.');
      } else {
        message('A shark got through! Watch the left side.');
      }
      updateHUD();
    }

    function update(dt) {
      if (state.phase !== 'playing' || state.paused) return;
      state.elapsed += dt;
      state.flash = Math.max(0, state.flash - dt);
      state.diverKick = Math.max(0, state.diverKick - dt);
      state.spawnIn -= dt;
      const maxSharks = Math.min(5, 2 + Math.floor((state.level - 1) / 2));
      if (state.spawnIn <= 0 && state.sharks.length < maxSharks) {
        spawnShark();
        updateTargets();
        state.spawnIn = Math.max(1.65, 3.8 - state.level * 0.16);
      }
      for (const shark of [...state.sharks]) {
        shark.x -= shark.speed * dt;
        shark.y += Math.sin(state.elapsed * 1.8 + shark.phase) * 4 * dt;
        if (shark.x < 164) {
          state.sharks.splice(state.sharks.indexOf(shark), 1);
          loseLife();
          if (state.phase === 'over') break;
        }
      }
      for (const effect of state.effects) effect.life -= dt;
      state.effects = state.effects.filter(effect => effect.life > 0);
    }

    function drawBackground() {
      const water = ctx.createLinearGradient(0, 0, 0, H);
      water.addColorStop(0, '#03385e');
      water.addColorStop(0.48, '#087c99');
      water.addColorStop(1, '#034461');
      ctx.fillStyle = water;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 6; i++) {
        const x = 36 + i * 118 + Math.sin(state.elapsed * 0.16 + i) * 18;
        ctx.fillStyle = i % 2 ? '#8fe9e3' : '#a8f1df';
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x + 42, 0); ctx.lineTo(x + 138, 395); ctx.lineTo(x + 62, 395);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      for (let i = 0; i < 30; i++) {
        const x = (i * 97 + 33) % W;
        const y = (i * 59 + state.elapsed * (9 + i % 7)) % 410;
        const radius = i % 5 === 0 ? 3 : 1.4;
        ctx.globalAlpha = 0.24 + (i % 4) * 0.08;
        ctx.fillStyle = '#c4f5e8';
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#063e50';
      ctx.beginPath(); ctx.moveTo(0, 418);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 408 + Math.sin(x * 0.03 + state.elapsed * 0.35) * 7);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a96a'; ctx.fillRect(0, 458, W, 22);

      for (let i = 0; i < 8; i++) {
        const x = (i * 101 + 18) % W, base = 456;
        ctx.strokeStyle = i % 2 ? '#ed7c69' : '#6fc6a1';
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x - 14, base - 28, x + Math.sin(state.elapsed + i) * 10, base - 50 - (i % 3) * 11);
        ctx.stroke();
        ctx.lineWidth = 2;
      }

      ctx.strokeStyle = 'rgba(30, 54, 60, .75)';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(492, 420); ctx.lineTo(513, 327); ctx.lineTo(555, 355); ctx.moveTo(513, 327); ctx.lineTo(540, 304);
      ctx.stroke();
      ctx.fillStyle = 'rgba(237, 190, 104, .5)';
      ctx.beginPath(); ctx.arc(513, 392, 12, 0, Math.PI * 2); ctx.fill();
    }

    function drawBoatAndDiver() {
      ctx.fillStyle = '#6d4836'; ctx.fillRect(0, 0, 132, 16);
      ctx.fillStyle = '#b77947'; ctx.fillRect(0, 14, 132, 6);
      ctx.strokeStyle = '#d4bc83'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(104, 18); ctx.lineTo(104, 178); ctx.stroke();

      const kick = state.diverKick ? Math.sin(state.elapsed * 45) * 7 : Math.sin(state.elapsed * 4) * 2;
      ctx.save(); ctx.translate(108, 250); ctx.rotate(state.flash ? -0.22 : 0);
      ctx.fillStyle = '#df5544'; ctx.fillRect(22, -14, 14, 58);
      ctx.fillStyle = '#ffd447'; ctx.fillRect(19, -18, 18, 6);
      ctx.fillStyle = '#f1bd36';
      ctx.beginPath(); ctx.ellipse(0, 8, 17, 30, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-17, 26, 13, 20 + kick); ctx.fillRect(4, 26, 13, 20 - kick);
      ctx.fillStyle = '#d94d45';
      ctx.beginPath(); ctx.moveTo(-20, 43 + kick); ctx.lineTo(-8, 41 + kick); ctx.lineTo(-28, 54 + kick); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 43 - kick); ctx.lineTo(18, 41 - kick); ctx.lineTo(31, 53 - kick); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f1bd36'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-30, 12); ctx.moveTo(12, -3); ctx.lineTo(29, 8); ctx.stroke();
      ctx.fillStyle = '#f3c64c'; ctx.beginPath(); ctx.arc(0, -24, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#183f56'; ctx.beginPath(); ctx.ellipse(-5, -26, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#71d9dc'; ctx.beginPath(); ctx.ellipse(-7, -28, 6, 3, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8ece0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(9, -18); ctx.quadraticCurveTo(20, -7, 12, 1); ctx.stroke();
      ctx.restore();
    }

    function drawShark(shark) {
      const y = shark.y + Math.sin(state.elapsed * 1.8 + shark.phase) * 2;
      ctx.save(); ctx.translate(shark.x, y);
      const marked = state.typed && shark.word.startsWith(state.typed);
      ctx.fillStyle = marked ? '#75d8dc' : '#7096a4';
      ctx.beginPath();
      ctx.moveTo(-55, 0); ctx.quadraticCurveTo(-38, -24, -8, -22);
      ctx.lineTo(2, -39); ctx.lineTo(17, -20); ctx.quadraticCurveTo(42, -15, 47, 0);
      ctx.lineTo(34, 8); ctx.lineTo(51, 28); ctx.lineTo(25, 15);
      ctx.quadraticCurveTo(2, 24, -23, 16); ctx.quadraticCurveTo(-44, 12, -55, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d3ded0';
      ctx.beginPath(); ctx.moveTo(-50, 4); ctx.quadraticCurveTo(-24, 15, 22, 10);
      ctx.quadraticCurveTo(3, 26, -26, 15); ctx.quadraticCurveTo(-42, 12, -50, 4); ctx.fill();
      ctx.strokeStyle = '#365966'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-8 + i * 7, -11); ctx.lineTo(-10 + i * 7, 10); ctx.stroke();
      }
      ctx.fillStyle = '#f8d45d'; ctx.beginPath(); ctx.arc(-39, -8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#142e3d'; ctx.beginPath(); ctx.arc(-40, -8, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#223c4b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-52, 2); ctx.quadraticCurveTo(-37, 10, -22, 8); ctx.stroke();

      ctx.fillStyle = marked ? '#f1bd43' : 'rgba(4, 34, 54, .78)';
      ctx.fillRect(-43, -63, 86, 25);
      ctx.strokeStyle = marked ? '#fff0ac' : '#6cabb2'; ctx.lineWidth = 1.5; ctx.strokeRect(-43, -63, 86, 25);
      ctx.fillStyle = marked ? '#142d3a' : '#f5f4e8';
      ctx.font = 'bold 17px Calibri, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(shark.word, 0, -50);
      if (marked) {
        ctx.fillStyle = '#e85f45';
        ctx.fillRect(-39, -37, 78 * (state.typed.length / shark.word.length), 3);
      }
      ctx.restore();
    }

    function drawEffects() {
      for (const effect of state.effects) {
        const pct = effect.life / effect.max;
        ctx.save(); ctx.globalAlpha = Math.max(0, pct);
        if (effect.kind === 'zap') {
          ctx.strokeStyle = '#fff0a6'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(effect.x, effect.y, 18 + (1 - pct) * 34, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#fff9d1'; ctx.font = 'bold 20px Calibri, sans-serif';
          ctx.textAlign = 'center'; ctx.fillText('+', effect.x, effect.y - 14);
        } else if (effect.kind === 'wave') {
          ctx.strokeStyle = '#83f5e5'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(effect.x, effect.y, (1 - pct) * 260 + 12, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.strokeStyle = '#fb6d52'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(effect.x, effect.y, 25 + (1 - pct) * 16, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawOverlay() {
      if (!state.paused && state.phase !== 'over') return;
      ctx.fillStyle = 'rgba(1, 19, 35, .74)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = state.phase === 'over' ? '#ffcb5b' : '#fff5d9';
      ctx.font = 'bold 34px Calibri, sans-serif';
      ctx.fillText(state.phase === 'over' ? 'DIVE OVER' : 'PAUSED', W / 2, H / 2 - 12);
      ctx.fillStyle = '#e9f3e8'; ctx.font = '18px Calibri, sans-serif';
      ctx.fillText(state.phase === 'over' ? 'SCORE ' + state.score + ' • BEST ' + state.best : 'Nhấn TIẾP TỤC để quay lại vùng biển.', W / 2, H / 2 + 24);
    }

    function render(timestamp) {
      const dt = Math.min(0.05, state.lastTime ? (timestamp - state.lastTime) / 1000 : 0.016);
      state.lastTime = timestamp;
      update(dt); drawBackground(); drawBoatAndDiver();
      state.sharks.forEach(drawShark); drawEffects(); drawOverlay();
      requestAnimationFrame(render);
    }

    listen(input, 'input', event => {
      if (!event.isComposing) submitLetters(event.target.value);
    });
    listen(input, 'compositionend', event => submitLetters(event.target.value));
    listen(window, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (state.paused || state.phase !== 'playing') return;
      if (event.target === input) {
        if (event.key === 'Enter') { event.preventDefault(); useZapper(); }
        return;
      }
      // Focused buttons use their native Enter-to-click behavior; don't fire the same action twice.
      if (event.target && String(event.target.tagName).toLowerCase() === 'button' &&
          (event.key === 'Enter' || event.key === ' ')) return;
      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault(); input.value = (input.value || '') + event.key.toUpperCase();
        submitLetters(input.value); input.focus();
      } else if (event.key === 'Backspace') {
        event.preventDefault(); input.value = (input.value || '').slice(0, -1); submitLetters(input.value);
      } else if (event.key === 'Enter') {
        event.preventDefault(); useZapper();
      } else if (event.key === 'Escape') {
        input.value = ''; state.typed = ''; updateTargets();
      }
    });
    listen(canvas, 'pointerdown', event => { event.preventDefault(); input.focus(); });
    function syncPause(next) {
      state.paused = Boolean(next);
      state.lastTime = 0;
      if (state.phase === 'playing') message(state.paused ? 'GAME PAUSED' : 'READY! Gõ từ đang bơi về phía bạn.');
      updateHUD();
      if (!state.paused && state.phase === 'playing') input.focus();
    }
    if (sharedPause) session.onPauseChange(syncPause);
    container.querySelector('#tsPause').addEventListener('click', () => {
      if (state.phase === 'over') return;
      if (sharedPause) { if (session.isPaused()) session.resume(); else session.pause(); }
      else syncPause(!state.paused);
    });
    container.querySelector('#tsRestart').addEventListener('click', resetGame);
    container.querySelector('#tsZapper').addEventListener('click', useZapper);

    resetGame(); requestAnimationFrame(render); input.focus();
  }

  window.NP_TyperShark = { launch };
  const previous = window.NP_Archetypes && window.NP_Archetypes.launch;
  if (typeof previous === 'function') {
    window.NP_Archetypes.launch = function (container, game) {
      if (game && game.id === 'typer-shark') return launch(container, game);
      return previous.apply(this, arguments);
    };
  }
}());
