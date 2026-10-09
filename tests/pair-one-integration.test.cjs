const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped } = require('./support/browser-harness.cjs');

test('Khối Sắc uses its exact launcher and closes its campaign clock cleanly', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('khoi-rubik-mini'), 'launchKhoiSac');
  assert.equal(h.context.openGameById('khoi-rubik-mini'), true);
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Khối Sắc');
  assert.equal(h.container.querySelectorAll('.ks-face-panel').length, 6);
  h.container.querySelector('#ks-r-cw').click();
  assert.equal(h.container.querySelector('#ksMoves').textContent, '1 / 10 lượt');
  h.context.closeGameModal();
  assertStopped(h);
  assert.deepEqual(h.errors, []);
});

test('Sân Bụi uses its exact launcher, accepts a throw and releases its animation on close', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('nem-lon-truong-lang'), 'launchSanBui');
  assert.equal(h.context.openGameById('nem-lon-truong-lang'), true);
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Sân Bụi');
  const throws = h.container.querySelector('#sbThrows');
  assert.equal(throws.textContent, '3');
  h.container.querySelector('#sbFire').click();
  assert.equal(throws.textContent, '2');
  assert.equal(h.frames.size, 1);
  h.frame();
  assert.equal(h.frames.size, 1, 'the live throw owns one animation frame');
  h.context.closeGameModal();
  assertStopped(h);
  assert.deepEqual(h.errors, []);
});
