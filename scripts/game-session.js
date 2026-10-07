/** Resources owned by one game. Portal controls keep using native browser APIs. */
(function () {
  'use strict';

  let currentSession = null;

  function start() {
    stop();
    let active = true;
    const timeouts = new Set();
    const intervals = new Set();
    const frames = new Set();
    const listeners = [];
    const cleanups = new Set();

    const session = {
      setTimeout(callback, delay, ...args) {
        if (!active) return null;
        const id = window.setTimeout(() => {
          timeouts.delete(id);
          if (active) callback(...args);
        }, delay);
        timeouts.add(id);
        return id;
      },
      clearTimeout(id) {
        timeouts.delete(id);
        window.clearTimeout(id);
      },
      setInterval(callback, delay, ...args) {
        if (!active) return null;
        const id = window.setInterval(() => {
          if (active) callback(...args);
        }, delay);
        intervals.add(id);
        return id;
      },
      clearInterval(id) {
        intervals.delete(id);
        window.clearInterval(id);
      },
      requestAnimationFrame(callback) {
        if (!active) return null;
        const id = window.requestAnimationFrame(timestamp => {
          frames.delete(id);
          if (active) callback(timestamp);
        });
        frames.add(id);
        return id;
      },
      cancelAnimationFrame(id) {
        frames.delete(id);
        window.cancelAnimationFrame(id);
      },
      listen(target, type, callback, options) {
        if (!active || !target) return;
        target.addEventListener(type, callback, options);
        const capture = typeof options === 'boolean' ? options : !!(options && options.capture);
        listeners.push({ target, type, callback, capture });
      },
      onCleanup(callback) {
        if (active) cleanups.add(callback);
        return () => cleanups.delete(callback);
      },
      stop() {
        if (!active) return;
        active = false;
        timeouts.forEach(id => window.clearTimeout(id));
        intervals.forEach(id => window.clearInterval(id));
        frames.forEach(id => window.cancelAnimationFrame(id));
        listeners.forEach(({ target, type, callback, capture }) => {
          target.removeEventListener(type, callback, capture);
        });
        timeouts.clear();
        intervals.clear();
        frames.clear();
        listeners.length = 0;
        // Saving progress and other engine-specific teardown must still run.
        const callbacks = [...cleanups];
        cleanups.clear();
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
