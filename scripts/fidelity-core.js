/** Exact-ID registry and small, session-owned canvas presentation helpers. */
(function () {
  'use strict';

  const definitions = new Map();

  function register(id, definition) {
    if (typeof id !== 'string' || id.trim() === '') throw new TypeError('Game ID must be a non-empty string');
    if (definitions.has(id)) throw new Error(`Duplicate game ID: ${id}`);
    if (!definition || typeof definition.launch !== 'function') throw new TypeError(`Game ${id} requires a launch function`);
    definitions.set(id, definition);
  }

  function launch(container, game) {
    const definition = game && definitions.get(game.id);
    if (!definition) throw new Error(`No fidelity game registered for ID: ${game?.id ?? '(missing)'}`);
    return definition.launch(container, game);
  }

  function createStage(container, game, options = {}) {
    if (!container || typeof container.appendChild !== 'function') throw new TypeError('A stage container is required');
    if (!window.NP_GameSession) throw new Error('NP_GameSession must load before fidelity-core.js');

    const width = Number(options.width) > 0 ? Number(options.width) : 640;
    const height = Number(options.height) > 0 ? Number(options.height) : 480;
    const root = document.createElement('div');
    root.className = 'np-fidelity-stage';
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${game?.title || 'Game'} game canvas`);
    canvas.tabIndex = 0;

    const hud = document.createElement('div');
    hud.className = 'np-fidelity-hud';
    hud.setAttribute('aria-label', 'Game HUD');
    const statusNode = document.createElement('div');
    statusNode.className = 'np-fidelity-status';
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    const controls = document.createElement('div');
    controls.className = 'np-fidelity-controls';
    root.appendChild(canvas);
    root.appendChild(hud);
    root.appendChild(statusNode);
    root.appendChild(controls);

    const hint = typeof options.hint === 'string' ? options.hint.trim() : '';
    if (hint) {
      const hintNode = document.createElement('p');
      hintNode.className = 'np-fidelity-hint';
      hintNode.textContent = hint;
      root.appendChild(hintNode);
    }

    container.replaceChildren(root);
    const session = window.NP_GameSession.start();
    session.onCleanup(() => root.remove());
    const ctx = canvas.getContext('2d');

    const stage = {
      session, canvas, ctx, root, hud, controls,
      status(text) { statusNode.textContent = String(text ?? ''); },
      setHUD(text) { hud.textContent = String(text ?? ''); },
      button(label, callback) {
        if (typeof callback !== 'function') throw new TypeError('Button callback must be a function');
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('type', 'button');
        button.textContent = String(label ?? '');
        button.style.minHeight = '44px';
        button.style.fontFamily = "Calibri, Inter, -apple-system, sans-serif";
        controls.appendChild(button);
        session.listen(button, 'click', callback);
        return button;
      },
      point(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width ? canvas.width / rect.width : 0;
        const scaleY = rect.height ? canvas.height / rect.height : 0;
        return {
          x: (Number(event?.clientX) - rect.left) * scaleX,
          y: (Number(event?.clientY) - rect.top) * scaleY
        };
      },
      on(type, callback) { session.listen(canvas, type, callback); },
      frame(update, draw) {
        if (typeof update !== 'function' || typeof draw !== 'function') throw new TypeError('frame requires update and draw functions');
        let previous = session.clock.now(), scheduled = false, inTick = false;
        const schedule = () => {
          if (!session.isActive() || session.isPaused() || scheduled || inTick) return;
          scheduled = true;
          session.requestAnimationFrame(() => {
            scheduled = false;
            if (!session.isActive() || session.isPaused()) return;
            inTick = true;
            try {
              const now = session.clock.now();
              const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
              previous = now;
              update(dt, stage);
              if (!session.isActive() || session.isPaused()) return;
              ctx.font = '16px Calibri, Inter, -apple-system, sans-serif';
              draw(ctx, stage);
            } finally {
              inTick = false;
            }
            schedule();
          });
        };
        const removePauseListener = session.onPauseChange(paused => { if (!paused) schedule(); });
        session.onCleanup(removePauseListener);
        schedule();
      }
    };
    return stage;
  }

  window.NP_Fidelity = {
    register,
    has: id => definitions.has(id),
    get: id => definitions.get(id),
    entries: () => [...definitions].map(([id, definition]) => ({ ...definition, id })),
    launch,
    createStage
  };
})();
