const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/game-harness.cjs');

test('registry rejects invalid and duplicate IDs, and routes the exact ID once', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  const api = h.context.NP_Fidelity;
  const launch = () => {};
  assert.throws(() => api.register('', { launch }), /id/i);
  assert.throws(() => api.register('missing', { title: 'Missing launch' }), /launch/i);
  api.register('pack-a', { launch, title: 'A', category: 'Arcade', newGame: true,
    reference: { title: 'Reference', url: 'https://example.test' }, coreMechanics: [] });
  assert.throws(() => api.register('pack-a', { launch }), /duplicate/i);
  assert.equal(api.has('pack-a'), true);
  assert.equal(api.has('pack-ab'), false);
  assert.deepEqual([...api.entries()].map(entry => entry.id), ['pack-a']);
  assert.equal(api.get('pack-a').title, 'A');
  let called = 0;
  api.register('pack-b', { launch: (container, game) => { called++; assert.equal(container, h.container); assert.equal(game.id, 'pack-b'); },
    title: 'B', category: 'Arcade', newGame: false, reference: { title: 'B', url: 'https://example.test/b' }, coreMechanics: [] });
  api.launch(h.container, { id: 'pack-b' });
  assert.equal(called, 1);
  assert.throws(() => api.launch(h.container, { id: 'pack-a-extra' }), /registered/i);
});

test('stage maps points through the displayed canvas size and creates concise accessible controls', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  const stage = h.context.NP_Fidelity.createStage(h.container, { title: 'Orbit' }, { width: 640, height: 480, hint: 'Click to move.' });
  stage.canvas.width = 640; stage.canvas.height = 480;
  stage.canvas.getBoundingClientRect = () => ({ left: 20, top: 40, width: 320, height: 240 });
  assert.deepEqual({ x: stage.point({ clientX: 180, clientY: 160 }).x, y: stage.point({ clientX: 180, clientY: 160 }).y }, { x: 320, y: 240 });
  assert.equal(stage.canvas.getAttribute('aria-label'), 'Orbit game canvas');
  assert.equal(stage.hud.getAttribute('aria-label'), 'Game HUD');
  assert.equal(h.container.querySelector('.np-fidelity-status').getAttribute('role'), 'status');
  assert.equal(h.container.querySelectorAll('.np-fidelity-hint').length, 1);
  stage.session.stop();
});

test('button and canvas listeners run only while the game session is active', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  const stage = h.context.NP_Fidelity.createStage(h.container, {}, { hint: '' });
  let clicks = 0, inputs = 0;
  const button = stage.button('Restart', () => clicks++);
  stage.on('pointerdown', () => inputs++);
  assert.equal(button.type, 'button');
  assert.ok(parseInt(button.style.minHeight, 10) >= 44);
  button.dispatch('click'); stage.canvas.dispatch('pointerdown');
  assert.equal(clicks, 1); assert.equal(inputs, 1);
  stage.session.stop();
  button.dispatch('click'); stage.canvas.dispatch('pointerdown');
  assert.equal(clicks, 1); assert.equal(inputs, 1);
});

test('frame uses active elapsed time, caps long frames, applies Calibri, and stops on close', () => {
  const h = harness({ loadEngines: false, loadApp: false });
  const stage = h.context.NP_Fidelity.createStage(h.container, {}, {});
  const deltas = [], fonts = [];
  stage.ctx.font = 'italic 18px serif';
  stage.frame(dt => deltas.push(dt), ctx => fonts.push(ctx.font));
  h.frame(16);
  h.frame(1000);
  assert.equal(deltas.length, 2);
  assert.ok(Math.abs(deltas[0] - 0.016) < 0.0001);
  assert.equal(deltas[1], 0.05);
  assert.ok(fonts.every(font => /Calibri/.test(font)));
  stage.session.stop();
  assert.equal(h.frames.size, 0);
  h.frame(16);
  assert.equal(deltas.length, 2);
});

function assertFrameLoopResumesAfterCallbackPause(pauseIn) {
  const h = harness({ loadEngines: false, loadApp: false });
  const stage = h.context.NP_Fidelity.createStage(h.container, {}, {});
  let updates = 0, draws = 0, pausedOnce = false;
  stage.frame(() => {
    updates++;
    if (pauseIn === 'update' && !pausedOnce) { pausedOnce = true; stage.session.pause(); }
  }, () => {
    draws++;
    if (pauseIn === 'draw' && !pausedOnce) { pausedOnce = true; stage.session.pause(); }
  });
  h.frame(16);
  assert.equal(stage.session.isPaused(), true, `${pauseIn} paused the session`);
  const updatesWhilePaused = updates, drawsWhilePaused = draws;
  h.frame(1000);
  assert.equal(updates, updatesWhilePaused);
  assert.equal(draws, drawsWhilePaused);
  stage.session.resume();
  h.frame(16);
  assert.equal(updates, updatesWhilePaused + 1, `${pauseIn} loop updated after resume`);
  assert.equal(draws, drawsWhilePaused + 1, `${pauseIn} loop drew after resume`);
  stage.session.stop();
}

test('frame loop resumes when update pauses the session in its own tick', () => assertFrameLoopResumesAfterCallbackPause('update'));
test('frame loop resumes when draw pauses the session in its own tick', () => assertFrameLoopResumesAfterCallbackPause('draw'));
