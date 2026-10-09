/* Original SVG pinball table and touch/keyboard controls. */
(function (root) {
  'use strict';

  function mount(container, session, options = {}) {
    const M = root.NP_OrbitPinballModel;
    if (!M || !container || !session || typeof session.listen !== 'function' || typeof session.onCleanup !== 'function'
      || typeof session.requestAnimationFrame !== 'function' || typeof session.cancelAnimationFrame !== 'function') {
      throw new Error('Orbital Cadet needs its rules and an active game session');
    }
    let model = options.initialState ? M.makeModel(options.initialState) : M.create();
    let alive = true, frame = null, previous = null, message = 'Launch the ball, then light all six targets.';
    container.classList.add('op-host');
    container.innerHTML = `
      <section class="op-game" id="opGame" aria-label="Orbital Cadet pinball" tabindex="0">
        <header class="op-head"><div><p class="op-kicker">ORBIT FIELD · CHALLENGE 01</p><h2>Orbital Cadet</h2></div>
          <div class="op-actions"><button class="op-button op-icon" id="opPause" type="button" aria-label="Pause game">II</button><button class="op-button op-icon" id="opRestart" type="button" aria-label="Restart game">↻</button></div>
        </header>
        <div class="op-hud" aria-label="Game score and progress">
          <div><span>SCORE</span><strong id="opScore">0</strong></div>
          <div><span>BALLS</span><strong id="opBalls">3</strong></div>
          <div class="op-target-meter"><span>TARGETS</span><strong id="opTargets">0 / 6</strong></div>
        </div>
        <p class="op-cue" id="opCue">Launch the ball. Hold both flippers to keep it in orbit.</p>
        <div class="op-table-wrap">
          <svg class="op-table" id="opTable" viewBox="0 0 420 700" role="img" aria-label="Pinball table with six unlit targets">
            <defs>
              <linearGradient id="opField" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#152c56"/><stop offset=".55" stop-color="#1b2b60"/><stop offset="1" stop-color="#211c51"/></linearGradient>
              <radialGradient id="opHalo"><stop stop-color="#78f4ef" stop-opacity=".75"/><stop offset="1" stop-color="#78f4ef" stop-opacity="0"/></radialGradient>
              <radialGradient id="opBumper"><stop stop-color="#fff7d0"/><stop offset=".28" stop-color="#f3c86c"/><stop offset=".62" stop-color="#e77b50"/><stop offset="1" stop-color="#8b3e5f"/></radialGradient>
              <linearGradient id="opRail" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c8fbeb"/><stop offset=".45" stop-color="#63c9d6"/><stop offset="1" stop-color="#6175d8"/></linearGradient>
            </defs>
            <rect x="8" y="8" width="404" height="684" rx="28" fill="url(#opField)" stroke="#83d9dc" stroke-width="3"/>
            <path d="M28 56Q28 26 58 26H362Q392 26 392 56V643Q392 672 363 672H57Q28 672 28 643Z" fill="none" stroke="#6a85d5" stroke-width="4" opacity=".7"/>
            <path d="M45 79Q210 30 375 79M45 624Q210 582 375 624" fill="none" stroke="#57b7c9" stroke-width="2" opacity=".5"/>
            <g aria-hidden="true" fill="#a5d5e8"><circle cx="73" cy="87" r="2"/><circle cx="344" cy="99" r="2"/><circle cx="187" cy="91" r="1.5"/><circle cx="362" cy="250" r="2"/><circle cx="66" cy="266" r="1.5"/><circle cx="121" cy="462" r="2"/><circle cx="303" cy="475" r="1.5"/><circle cx="93" cy="560" r="2"/></g>
            <circle cx="210" cy="209" r="102" fill="url(#opHalo)" opacity=".35"/>
            <path d="M56 106Q76 70 128 67M292 67Q344 70 364 106M68 244Q50 271 59 303M361 244Q370 271 361 303" fill="none" stroke="url(#opRail)" stroke-width="7" stroke-linecap="round"/>
            <path d="M78 287L70 315L141 315M342 287L350 315L279 315" fill="none" stroke="#7ed9df" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M66 390L102 418M354 390L318 418" stroke="#f0bc77" stroke-width="6" stroke-linecap="round" opacity=".8"/>
            <path d="M56 514Q90 468 127 504L144 530M364 514Q330 468 293 504L276 530" fill="none" stroke="#9a85dc" stroke-width="6" stroke-linecap="round"/>
            <path d="M47 578Q89 564 129 587M373 578Q331 564 291 587" fill="none" stroke="#e9a66d" stroke-width="4" opacity=".8"/>
            <path d="M337 558V636Q337 655 358 655H382" fill="none" stroke="#93e3dc" stroke-width="6" stroke-linecap="round"/>
            <circle cx="366" cy="629" r="13" fill="#6bd3df" opacity=".18"/><text x="352" y="613" class="op-svg-label">LAUNCH</text>
            <path d="M104 656H176M244 656H316" stroke="#cf6c78" stroke-width="3" opacity=".65"/>
            <path d="M178 676Q210 662 242 676" fill="none" stroke="#132044" stroke-width="12"/>
            <g id="opDynamic"></g>
            <text x="210" y="49" class="op-svg-title">ORBIT FIELD</text>
          </svg>
        </div>
        <div class="op-controls" role="group" aria-label="Pinball controls">
          <button class="op-button op-flipper" id="opLeft" type="button" aria-label="Hold left flipper">◀ <span>LEFT</span></button>
          <button class="op-button op-launch" id="opLaunch" type="button">LAUNCH <b>></b></button>
          <button class="op-button op-flipper" id="opRight" type="button" aria-label="Hold right flipper"><span>RIGHT</span> ></button>
        </div>
        <p class="op-status" id="opStatus" role="status" aria-live="polite" aria-atomic="true"></p>
        <p class="op-help">Space launch · ← / A left · → / D right · P pause · R restart</p>
        <div class="op-overlay" id="opOverlay" hidden role="group" aria-label="Game result">
          <div class="op-overlay-card"><strong id="opOverlayTitle"></strong><p id="opOverlayCopy"></p><button class="op-button op-launch" id="opOverlayAction" type="button">Continue</button></div>
        </div>
      </section>`;
    const el = id => container.querySelector(`#${id}`);

    function stopLoop() {
      if (frame !== null) session.cancelAnimationFrame(frame);
      frame = null; previous = null;
    }
    function destroy() {
      if (!alive) return;
      alive = false; stopLoop(); container.classList.remove('op-host'); container.innerHTML = '';
    }
    function flipperPath(side, active) {
      const start = side === 'left' ? [145, 614] : [275, 614];
      const end = side === 'left' ? [active ? 204 : 196, active ? 574 : 628] : [active ? 216 : 224, active ? 574 : 628];
      return { start, end };
    }
    function draw(v) {
      const targets = M.TARGETS.map(target => {
        const lit = v.targets[target.id];
        if (target.kind === 'bumper') return `<g class="op-bumper ${lit ? 'is-lit' : ''}" aria-label="${target.id}${lit ? ', lit' : ''}"><circle cx="${target.x}" cy="${target.y}" r="${target.radius + 10}" class="op-bumper-halo"/><circle cx="${target.x}" cy="${target.y}" r="${target.radius}" fill="url(#opBumper)"/><circle cx="${target.x}" cy="${target.y}" r="${target.radius - 8}" class="op-bumper-core"/><path d="M${target.x - 7} ${target.y}h14M${target.x} ${target.y - 7}v14" stroke="#fff6d2" stroke-width="3" stroke-linecap="round"/></g>`;
        return `<g class="op-plate ${lit ? 'is-lit' : ''}" aria-label="${target.id}${lit ? ', lit' : ''}"><rect x="${target.x - target.width / 2}" y="${target.y - target.height / 2}" width="${target.width}" height="${target.height}" rx="8"/><path d="M${target.x - target.width / 2 + 8} ${target.y}H${target.x + target.width / 2 - 8}"/></g>`;
      }).join('');
      const flippers = ['left', 'right'].map(side => {
        const { start, end } = flipperPath(side, v.flippers[side]);
        return `<g class="op-flipper-art ${v.flippers[side] ? 'is-active' : ''}"><path d="M${start[0]} ${start[1]}L${end[0]} ${end[1]}"/><circle cx="${start[0]}" cy="${start[1]}" r="10"/></g>`;
      }).join('');
      const ball = `<g class="op-ball"><circle cx="${v.ball.x.toFixed(2)}" cy="${v.ball.y.toFixed(2)}" r="${M.BALL_RADIUS + 4}" class="op-ball-aura"/><circle cx="${v.ball.x.toFixed(2)}" cy="${v.ball.y.toFixed(2)}" r="${M.BALL_RADIUS}"/><circle cx="${(v.ball.x - 2.5).toFixed(2)}" cy="${(v.ball.y - 3).toFixed(2)}" r="2.2"/></g>`;
      el('opDynamic').innerHTML = `${targets}${flippers}${ball}`;
      el('opTable').setAttribute('aria-label', `Orbit Field pinball table. ${v.targetHits} of six targets lit. ${v.ballsLeft} balls remain.`);
      el('opScore').textContent = v.score.toLocaleString('en-US');
      el('opBalls').textContent = String(v.ballsLeft);
      el('opTargets').textContent = `${v.targetHits} / ${v.targetCount}`;
      el('opLaunch').disabled = !v.canLaunch;
      el('opPause').disabled = !v.canPause && v.status !== 'paused';
      el('opPause').textContent = v.status === 'paused' ? '>' : 'II';
      el('opPause').setAttribute('aria-label', v.status === 'paused' ? 'Resume game' : 'Pause game');
      el('opLeft').classList.toggle('is-pressed', v.flippers.left);
      el('opRight').classList.toggle('is-pressed', v.flippers.right);
      const overlay = el('opOverlay'); overlay.hidden = !['paused', 'won', 'lost'].includes(v.status);
      if (v.status === 'paused') {
        el('opOverlayTitle').textContent = 'Field paused';
        el('opOverlayCopy').textContent = `${v.targetHits} / ${v.targetCount} targets · ${v.score.toLocaleString('en-US')} points`;
        el('opOverlayAction').textContent = 'Resume';
      } else if (v.status === 'won') {
        el('opOverlayTitle').textContent = 'Orbit cleared!';
        el('opOverlayCopy').textContent = `All six targets lit · ${v.score.toLocaleString('en-US')} points`;
        el('opOverlayAction').textContent = 'Play again';
      } else if (v.status === 'lost') {
        el('opOverlayTitle').textContent = 'Out of balls';
        el('opOverlayCopy').textContent = `${v.score.toLocaleString('en-US')} points · ${v.targetHits} targets lit`;
        el('opOverlayAction').textContent = 'Play again';
      }
      if (v.status === 'ready') el('opCue').textContent = `Ball ${M.BALLS - v.ballsLeft + 1} ready · launch to continue.`;
      else if (v.status === 'playing') el('opCue').textContent = v.lastEvent === 'bumper' ? 'Bumper lit! Keep the ball in orbit.'
        : v.lastEvent === 'target' ? 'Target lit! Keep going.'
          : v.lastEvent === 'drain' ? 'Next ball ready · try another route.'
            : 'Hold either flipper to send the ball back up.';
      el('opStatus').textContent = message;
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') { previous = null; return; }
      if (previous !== null) {
        const delta = Math.max(0, Math.min(M.MAX_FRAME, (timestamp - previous) / 1000));
        const events = model.advance(delta);
        if (events.some(event => event.kind === 'win')) message = 'All targets lit. Orbit complete!';
        else if (events.some(event => event.kind === 'loss')) message = 'Three balls drained. Restart for another run.';
        else if (events.some(event => event.kind === 'drain')) message = 'Ball drained. A new ball is ready.';
        else if (events.some(event => event.kind === 'bumper' || event.kind === 'target')) message = 'Target lit!';
      }
      previous = timestamp; draw(model.view());
      if (model.view().status === 'playing') frame = session.requestAnimationFrame(loop);
      else previous = null;
    }
    function startLoop() {
      if (!alive || frame !== null || model.view().status !== 'playing' || root.document?.hidden) return;
      previous = null; frame = session.requestAnimationFrame(loop);
    }
    function setFlipper(side, down) {
      model.setFlipper(side, down); draw(model.view());
    }
    function interrupt() {
      for (const side of ['left', 'right']) model.setFlipper(side, false);
      if (model.pause()) {
        stopLoop(); message = 'Paused while away. Resume when ready.'; draw(model.view());
      }
    }
    function togglePause() {
      const v = model.view();
      if (v.status === 'paused') {
        model.resume(); message = 'Back in orbit.'; draw(model.view()); startLoop();
      } else if (model.pause()) {
        stopLoop(); message = 'Field paused.'; draw(model.view());
      }
    }
    function restart() {
      model.restart(); stopLoop(); message = 'Fresh table · light all six targets.'; draw(model.view());
    }
    function launch() {
      if (model.launch()) { message = 'Ball launched.'; draw(model.view()); startLoop(); }
    }
    function bindFlipper(button, side) {
      session.listen(button, 'pointerdown', event => { event.preventDefault?.(); setFlipper(side, true); });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
        session.listen(button, type, () => setFlipper(side, false));
      }
      session.listen(button, 'blur', () => setFlipper(side, false));
    }

    bindFlipper(el('opLeft'), 'left'); bindFlipper(el('opRight'), 'right');
    session.listen(el('opLaunch'), 'click', launch);
    session.listen(el('opPause'), 'click', togglePause);
    session.listen(el('opRestart'), 'click', restart);
    session.listen(el('opOverlayAction'), 'click', () => {
      const status = model.view().status;
      if (status === 'paused') togglePause(); else restart();
    });
    session.listen(container, 'keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key?.toLowerCase();
      if (key === 'arrowleft' || key === 'a') { event.preventDefault(); setFlipper('left', true); }
      else if (key === 'arrowright' || key === 'd') { event.preventDefault(); setFlipper('right', true); }
      else if ((event.code === 'Space' || key === ' ') && !event.repeat) { event.preventDefault(); launch(); }
      else if (key === 'p' && !event.repeat) { event.preventDefault(); togglePause(); }
      else if (key === 'r' && !event.repeat) { event.preventDefault(); restart(); }
    });
    session.listen(container, 'keyup', event => {
      const key = event.key?.toLowerCase();
      if (key === 'arrowleft' || key === 'a') setFlipper('left', false);
      else if (key === 'arrowright' || key === 'd') setFlipper('right', false);
    });
    session.listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    session.listen(root, 'pagehide', interrupt);
    session.listen(root, 'blur', interrupt);
    session.onCleanup(destroy);
    draw(model.view());
    if (model.view().status === 'playing') startLoop();
    return Object.freeze({ getModel: () => model, destroy });
  }

  root.NP_OrbitPinball = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);
