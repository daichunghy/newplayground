// Exercise elapsed-time behavior through the real session API, independent of rendering.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { harness, read, Element } = require('./helpers/game-harness.cjs');

function timedHarness() {
  const h = harness({ loadEngines: false, loadApp: false });
  let now = 0, nextId = 1000;
  const schedule = (callback, delay, args, interval) => {
    const id = nextId++;
    const duration = Math.max(interval ? 1 : 0, Number(delay) || 0);
    h.timers.set(id, { callback, delay: duration, args, interval, due: now + duration });
    return id;
  };
  h.context.performance.now = () => now;
  h.window.setTimeout = (callback, delay, ...args) => schedule(callback, delay, args, false);
  h.window.setInterval = (callback, delay, ...args) => schedule(callback, delay, args, true);
  h.window.clearTimeout = h.window.clearInterval = id => h.timers.delete(id);
  h.window.requestAnimationFrame = callback => { const id = nextId++; h.frames.set(id, callback); return id; };
  h.window.cancelAnimationFrame = id => h.frames.delete(id);
  vm.runInContext('Date.now = () => 1700000000000 + performance.now();', h.context);
  h.advance = milliseconds => {
    const end = now + milliseconds;
    let iterations = 0;
    while (true) {
      const next = [...h.timers].filter(([, timer]) => timer.due <= end)
        .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      assert.ok(++iterations < 10000, 'timer scheduling must eventually yield');
      const [id, timer] = next;
      now = timer.due;
      if (timer.interval) timer.due += timer.delay;
      else h.timers.delete(id);
      timer.callback(...timer.args);
    }
    now = end;
  };
  h.frame = milliseconds => {
    h.advance(milliseconds);
    for (const [id, callback] of [...h.frames]) if (h.frames.delete(id)) callback(now);
  };
  return h;
}

test('pause preserves a timeout remaining delay across multiple long interruptions', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start(), fired = [];
  session.setTimeout((...args) => fired.push([session.clock.now(), ...args]), 100, 'wave', 3);
  h.advance(35); session.pause();
  assert.equal(h.timers.size, 0, 'native timers are cancelled while paused');
  h.advance(9000);
  assert.equal(session.clock.now(), 35);
  assert.equal(session.clock.wallNow(), 1700000000035);
  assert.deepEqual(fired, []);
  session.resume(); h.advance(30); session.pause(); h.advance(7000); session.resume();
  h.advance(34); assert.deepEqual(fired, []);
  h.advance(1); assert.deepEqual(fired, [[100, 'wave', 3]]);
  assert.equal(h.timers.size, 0, 'one-shot timer is removed after firing');
});

test('work created during a pause waits for its full delay and nested callbacks use active time', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start(), events = [];
  session.onPauseChange(paused => {
    if (paused) session.setTimeout(() => {
      events.push(['first', session.clock.now()]);
      session.setTimeout(() => events.push(['nested', session.clock.now()]), 25);
    }, 40);
  });
  session.pause();
  const cancelled = session.setInterval(() => events.push(['cancelled']), 10);
  session.clearInterval(cancelled);
  h.advance(12000);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(events, []);
  session.resume(); h.advance(39); assert.deepEqual(events, []);
  h.advance(1); assert.deepEqual(events, [['first', 40]]);
  h.advance(24); assert.equal(events.length, 1);
  h.advance(1); assert.deepEqual(events, [['first', 40], ['nested', 65]]);
});

test('intervals resume with the remaining first delay and stay cancellable by the original handle', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start(), times = [];
  const interval = session.setInterval(() => times.push(session.clock.now()), 100);
  h.advance(240); assert.deepEqual(times, [100, 200]);
  session.pause(); h.advance(5000); session.resume();
  h.advance(59); assert.equal(times.length, 2);
  h.advance(1); assert.deepEqual(times, [100, 200, 300]);
  h.advance(200); assert.deepEqual(times, [100, 200, 300, 400, 500]);
  assert.equal(h.timers.size, 1);
  session.clearInterval(interval);
  h.advance(1000); assert.equal(times.length, 5);
  assert.equal(h.timers.size, 0);
});

test('a resumed interval that pauses and resumes inside its own callback has only one native timer', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start();
  let ticks = 0;
  const interval = session.setInterval(() => {
    ticks++;
    if (ticks === 1) { session.pause(); session.resume(); }
  }, 100);
  h.advance(40); session.pause(); h.advance(3000); session.resume();
  h.advance(60);
  assert.equal(ticks, 1);
  assert.equal(h.timers.size, 1, 'callback pause/resume must not cause a second interval rearm');
  h.advance(300); assert.equal(ticks, 4);
  session.clearInterval(interval);
  assert.equal(h.timers.size, 0, 'original handle cancels every remaining native resource');
  h.advance(500); assert.equal(ticks, 4);
});

test('cancelled native callbacks remain inert after pause, resume, cancellation and stop', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start();
  let actions = 0;
  const interval = session.setInterval(() => actions++, 100);
  const timeout = session.setTimeout(() => actions++, 90);
  const frame = session.requestAnimationFrame(() => actions++);
  const old = [...h.timers.values()].map(timer => () => timer.callback(...timer.args))
    .concat([...h.frames.values()].map(callback => () => callback(10)));
  h.advance(25); session.pause(); old.forEach(callback => callback());
  session.resume(); old.forEach(callback => callback());
  assert.equal(actions, 0, 'old native callbacks cannot resurrect cancelled generations');
  const queued = [...h.timers.values()].map(timer => () => timer.callback(...timer.args))
    .concat([...h.frames.values()].map(callback => () => callback(10)));
  session.clearInterval(interval); session.clearTimeout(timeout); session.cancelAnimationFrame(frame);
  queued.forEach(callback => callback());
  assert.equal(actions, 0);
  session.setTimeout(() => actions++, 10);
  session.requestAnimationFrame(() => actions++);
  const stopped = [...h.timers.values()].map(timer => timer.callback).concat([...h.frames.values()]);
  session.stop(); stopped.forEach(callback => callback(100));
  assert.equal(actions, 0);
  assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
  assert.equal(session.setTimeout(() => {}, 10), null);
  assert.equal(session.requestAnimationFrame(() => {}), null);
});

test('animation timestamps and both active clocks freeze without a jump after resume', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start(), samples = [];
  function loop(timestamp) {
    samples.push([timestamp, session.clock.now(), session.clock.wallNow()]);
    session.requestAnimationFrame(loop);
  }
  session.requestAnimationFrame(loop); h.frame(20);
  session.pause(); h.frame(10000);
  assert.equal(samples.length, 1);
  assert.equal(session.clock.now(), 20);
  assert.equal(session.clock.wallNow(), 1700000000020);
  session.resume(); h.frame(20);
  assert.deepEqual(samples, [[20, 20, 1700000000020], [40, 40, 1700000000040]]);
  session.pause();
  const cancelled = session.requestAnimationFrame(() => assert.fail('cancelled paused frame'));
  session.cancelAnimationFrame(cancelled);
  h.frame(8000); session.resume(); h.frame(10);
  assert.deepEqual(samples[2], [50, 50, 1700000000050]);
  session.stop(); assert.equal(h.frames.size, 0);
});

test('pausing within a RAF callback defers frames created afterwards until resume', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start(), times = [];
  session.requestAnimationFrame(timestamp => {
    times.push(timestamp);
    session.pause();
    session.requestAnimationFrame(next => times.push(next));
  });
  h.frame(16); h.frame(10000);
  assert.deepEqual(times, [16]); assert.equal(h.frames.size, 0);
  session.resume(); h.frame(16);
  assert.deepEqual(times, [16, 32]);
});

test('pause releases held keys and captured pointers without firing a charged shot', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start();
  const canvas = new Element('canvas');
  const released = []; canvas.releasePointerCapture = id => released.push(id);
  let charging = false, moving = false, dragging = false, shots = 0, presses = 0;
  session.listen(h.window, 'keydown', event => {
    presses++;
    if (event.key === ' ') charging = true;
    if (event.key === 'ArrowRight') moving = true;
  });
  session.listen(h.window, 'keyup', event => {
    if (event.key === ' ') { if (charging) shots++; charging = false; }
    if (event.key === 'ArrowRight') moving = false;
  });
  session.listen(h.window, 'blur', () => { charging = false; });
  session.listen(canvas, 'pointerdown', () => { dragging = true; });
  session.listen(canvas, 'pointercancel', () => { dragging = false; });
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  h.window.dispatch('keydown', { key: 'ArrowRight', code: 'ArrowRight' });
  canvas.dispatch('pointerdown', { pointerId: 8, pointerType: 'touch' });
  assert.equal(charging && moving && dragging, true);
  session.pause();
  assert.equal(charging || moving || dragging, false);
  assert.equal(shots, 0, 'pause cancels the charge before the synthetic key release');
  assert.deepEqual(released, [8]);
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  canvas.dispatch('pointerdown', { pointerId: 9, pointerType: 'touch' });
  assert.equal(presses, 2); assert.equal(charging || dragging, false);
  h.window.dispatch('keyup', { key: ' ', code: 'Space' });
  session.resume();
  h.window.dispatch('keydown', { key: ' ', code: 'Space' });
  h.window.dispatch('keyup', { key: ' ', code: 'Space' });
  assert.equal(shots, 1, 'fresh input works after resume');
  session.pause(); assert.deepEqual(released, [8], 'released pointers are not cancelled again');
  session.stop(); assert.equal(canvas.listenerCount(), 0); assert.equal(h.window.listenerCount(), 0);
});

test('pause is idempotent when release handlers request pause and queue work', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start();
  let releases = 0, delayed = 0;
  const changes = [];
  session.listen(h.window, 'blur', () => {
    releases++;
    session.pause();
    session.setTimeout(() => delayed++, 25);
  });
  session.onPauseChange(value => changes.push(value));
  session.pause(); session.pause();
  assert.equal(releases, 1);
  assert.deepEqual(changes, [true]);
  assert.equal(h.timers.size, 0);
  h.advance(5000); session.resume();
  h.advance(24); assert.equal(delayed, 0);
  h.advance(1); assert.equal(delayed, 1);
  assert.deepEqual(changes, [true, false]);
  assert.deepEqual(h.errors, []);
});

test('shell controls are isolated while board delegation and release events still work', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start();
  let clicks = 0, releases = 0;
  session.listen(h.window, 'click', () => clicks++);
  session.listen(h.window, 'keyup', () => releases++);
  const shell = new Element('button', 'data-np-shell="pause"');
  shell.closest = () => shell;
  h.window.dispatch('click', { target: shell });
  assert.equal(clicks, 0);
  h.window.dispatch('keyup', { target: shell, key: ' ', code: 'Space' });
  assert.equal(releases, 1);
  // A delegated board target is not a shell control just because closest() returns an element.
  h.window.dispatch('click', { target: { closest: () => ({ dataset: { skR: '1', skC: '1' } }) } });
  assert.equal(clicks, 1);
  session.pause(); h.window.dispatch('click'); assert.equal(clicks, 1);
});

test('session stop removes only its listeners, handles duplicate registration and cleans up once', () => {
  const h = timedHarness(), session = h.context.NP_GameSession.start();
  let portal = 0, calls = 0, cleanup = 0, notifications = 0;
  h.window.addEventListener('click', () => portal++);
  const handler = () => calls++;
  session.listen(h.window, 'click', handler, true);
  session.listen(h.window, 'click', handler, { capture: true });
  const objectHandler = { handleEvent() { calls++; } };
  session.listen(h.window, 'click', objectHandler);
  session.onCleanup(() => cleanup++);
  session.onPauseChange(() => notifications++);
  h.window.dispatch('click'); assert.equal(calls, 2);
  session.pause(); session.resume(); assert.equal(notifications, 2);
  session.stop(); session.stop(); session.pause(); session.resume();
  h.window.dispatch('click'); assert.equal(calls, 2); assert.equal(portal, 2);
  assert.equal(cleanup, 1); assert.equal(notifications, 2);
  assert.equal(h.window.listenerCount(), 1);
});

test('universal pause resumes Pong and DXBall without leaving a second local pause active', () => {
  for (const [name, state] of [
    ['launchPong', '({ paused, keys, activeTouch })'],
    ['launchDXBall', '({ paused, keys: dxKeys })']
  ]) {
    const h = timedHarness();
    h.context.NP_Juice = null;
    const marker = `  function ${name}(container, game) {`;
    const source = read('scripts/engines-classics.js').replace(marker,
      marker + '\n    window.__localPause = () => ' + state + ';');
    vm.runInContext(source, h.context, { filename: 'scripts/engines-classics.js' });
    h.context.NP_Engines[name](h.container, { id: name, title: name });
    const session = h.context.NP_GameSession.getCurrent();
    h.window.dispatch('keydown', { key: name === 'launchPong' ? 'ArrowDown' : 'ArrowRight' });
    if (name === 'launchPong') {
      h.container.querySelector('#pongCanvas').dispatch('pointerdown', {
        pointerId: 5, pointerType: 'touch', clientX: 20, clientY: 60
      });
    }
    session.pause();
    assert.equal(h.context.__localPause().paused, true, name + ' pause display mirrors the shared session');
    assert.ok(Object.values(h.context.__localPause().keys).every(pressed => !pressed));
    if (name === 'launchPong') assert.equal(h.context.__localPause().activeTouch, null);
    h.advance(10000); session.resume(); h.frame(16);
    assert.equal(h.context.__localPause().paused, false);
    assert.deepEqual(h.errors, []);
    session.stop(); assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
  }
});
