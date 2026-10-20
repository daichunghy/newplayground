/** Own one game's resources and its active-play clock. Portal controls use native APIs. */
(function () {
  'use strict';
  let currentSession = null;
  const realNow = () => performance.now();
  const releaseEvents = new Set(['blur', 'keyup', 'pointerup', 'pointercancel', 'lostpointercapture', 'touchend', 'touchcancel']);

  function start() {
    stop();
    let active = true, paused = false, pausedAt = 0, pausedDuration = 0, nextId = 1;
    const timers = new Map(), frames = new Map(), listeners = [];
    const cleanups = new Set(), pauseListeners = new Set(), heldKeys = new Map(), heldPointers = new Map();
    const clock = {
      now: () => (paused ? pausedAt : realNow()) - pausedDuration,
      // Active deadlines use this; offline farm growth keeps the real Date.now().
      wallNow: () => Date.now() - pausedDuration - (paused ? realNow() - pausedAt : 0)
    };

    function cancelTimerNative(entry) {
      entry.generation++;
      if (entry.nativeId === null) return;
      if (entry.nativeKind === 'interval') window.clearInterval(entry.nativeId);
      else window.clearTimeout(entry.nativeId);
      entry.nativeId = null;
    }
    function armTimer(entry, remaining = entry.delay) {
      if (!active || paused || !timers.has(entry.id)) return;
      const generation = ++entry.generation;
      entry.due = realNow() + remaining;
      const recurring = entry.interval && remaining === entry.delay;
      entry.nativeKind = recurring ? 'interval' : 'timeout';
      const fire = () => {
        if (!active || paused || generation !== entry.generation || timers.get(entry.id) !== entry) return;
        if (!entry.interval) timers.delete(entry.id);
        else entry.due = realNow() + entry.delay;
        if (!recurring) entry.nativeId = null;
        try { entry.callback(...entry.args); }
        finally {
          // First partial interval after resuming becomes a normal interval again.
          if (entry.interval && !recurring && active && !paused &&
              generation === entry.generation && entry.nativeId === null && timers.get(entry.id) === entry) armTimer(entry);
        }
      };
      entry.nativeId = recurring ? window.setInterval(fire, entry.delay) : window.setTimeout(fire, remaining);
    }
    function scheduleTimer(callback, delay, args, interval) {
      if (!active) return null;
      const duration = Math.max(interval ? 1 : 0, Number(delay) || 0);
      const entry = { id: nextId++, callback, delay: duration, remaining: duration, args, interval, nativeId: null, generation: 0 };
      timers.set(entry.id, entry);
      armTimer(entry);
      return entry.id;
    }
    function clearTimer(id) {
      const entry = timers.get(id);
      if (!entry) return;
      cancelTimerNative(entry);
      timers.delete(id);
    }
    function armFrame(entry) {
      if (!active || paused) return;
      const generation = ++entry.generation;
      entry.nativeId = window.requestAnimationFrame(timestamp => {
        if (!active || paused || generation !== entry.generation || frames.get(entry.id) !== entry) return;
        frames.delete(entry.id);
        entry.callback(timestamp - pausedDuration);
      });
    }
    function invoke(entry, event) {
      if (typeof entry.callback === 'function') entry.callback.call(entry.target, event);
      else entry.callback.handleEvent(event);
    }
    function releaseInput() {
      const send = (entry, values) => {
        try {
          invoke(entry, { target: entry.target, currentTarget: entry.target, npSessionPause: true,
            preventDefault() {}, stopPropagation() {}, ...values });
        } catch (error) { console.error('Game input release failed', error); }
      };
      // Cancel charging/dragging before releasing Space; releasing it can otherwise fire.
      listeners.filter(entry => entry.type === 'blur').forEach(entry => send(entry, { type: 'blur' }));
      for (const values of heldKeys.values()) {
        listeners.filter(entry => entry.type === 'keyup').forEach(entry => send(entry, { ...values, type: 'keyup', repeat: false }));
      }
      for (const values of heldPointers.values()) {
        listeners.filter(entry => entry.type === 'pointercancel').forEach(entry => send(entry, { ...values, type: 'pointercancel', buttons: 0 }));
        try { values.target?.releasePointerCapture?.(values.pointerId); } catch (error) { /* Capture may already be gone. */ }
      }
      heldKeys.clear(); heldPointers.clear();
    }
    function notifyPause() {
      [...pauseListeners].forEach(callback => {
        try { callback(paused); } catch (error) { console.error('Game pause update failed', error); }
      });
    }

    const session = {
      clock,
      isPaused: () => paused,
      isActive: () => active,
      setTimeout: (callback, delay, ...args) => scheduleTimer(callback, delay, args, false),
      clearTimeout: clearTimer,
      setInterval: (callback, delay, ...args) => scheduleTimer(callback, delay, args, true),
      clearInterval: clearTimer,
      requestAnimationFrame(callback) {
        if (!active) return null;
        const entry = { id: nextId++, callback, nativeId: null, generation: 0 };
        frames.set(entry.id, entry);
        armFrame(entry);
        return entry.id;
      },
      cancelAnimationFrame(id) {
        const entry = frames.get(id);
        if (!entry) return;
        entry.generation++;
        if (entry.nativeId !== null) window.cancelAnimationFrame(entry.nativeId);
        frames.delete(id);
      },
      listen(target, type, callback, options) {
        if (!active || !target) return;
        const capture = typeof options === 'boolean' ? options : !!(options && options.capture);
        if (listeners.some(entry => entry.target === target && entry.type === type && entry.callback === callback && entry.capture === capture)) return;
        const entry = { target, type, callback, capture };
        entry.wrapped = event => {
          if (!active || (paused && !releaseEvents.has(type))) return;
          // Header/help controls never send gameplay actions to a window listener.
          const shellControl = event.target?.closest?.('[data-np-shell]');
          if (shellControl?.getAttribute?.('data-np-shell') != null && !releaseEvents.has(type)) return;
          if (type === 'keydown') heldKeys.set(event.code || event.key, { key: event.key, code: event.code, target: event.target });
          if (type === 'keyup') heldKeys.delete(event.code || event.key);
          if (type === 'pointerdown') heldPointers.set(event.pointerId, { pointerId: event.pointerId, pointerType: event.pointerType, target: event.target });
          if (type === 'pointerup' || type === 'pointercancel') heldPointers.delete(event.pointerId);
          invoke(entry, event);
        };
        target.addEventListener(type, entry.wrapped, options);
        listeners.push(entry);
      },
      onCleanup(callback) {
        if (active) cleanups.add(callback);
        return () => cleanups.delete(callback);
      },
      onPauseChange(callback) {
        if (active) pauseListeners.add(callback);
        return () => pauseListeners.delete(callback);
      },
      pause() {
        if (!active || paused) return;
        pausedAt = realNow();
        paused = true;
        timers.forEach(entry => {
          entry.remaining = Math.max(0, entry.due - pausedAt);
          cancelTimerNative(entry);
        });
        frames.forEach(entry => {
          entry.generation++;
          if (entry.nativeId !== null) window.cancelAnimationFrame(entry.nativeId);
          entry.nativeId = null;
        });
        // Pause before release callbacks: they may request pause or schedule more work.
        releaseInput();
        if (active && paused) notifyPause();
      },
      resume() {
        if (!active || !paused) return;
        pausedDuration += realNow() - pausedAt;
        paused = false;
        timers.forEach(entry => armTimer(entry, entry.remaining));
        frames.forEach(armFrame);
        notifyPause();
      },
      stop() {
        if (!active) return;
        active = false;
        timers.forEach(cancelTimerNative);
        frames.forEach(entry => { if (entry.nativeId !== null) window.cancelAnimationFrame(entry.nativeId); });
        listeners.forEach(({ target, type, wrapped, capture }) => target.removeEventListener(type, wrapped, capture));
        timers.clear(); frames.clear(); listeners.length = 0;
        heldKeys.clear(); heldPointers.clear(); pauseListeners.clear();
        const callbacks = [...cleanups]; cleanups.clear();
        callbacks.forEach(cleanup => {
          try { cleanup(); } catch (error) { console.error('Game cleanup failed', error); }
        });
      }
    };
    currentSession = session;
    return session;
  }
  function stop() {
    const session = currentSession;
    currentSession = null;
    if (session) session.stop();
  }
  window.NP_GameSession = { start, stop, getCurrent: () => currentSession };
})();
