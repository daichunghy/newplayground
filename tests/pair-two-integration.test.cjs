const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, assertStopped } = require('./support/browser-harness.cjs');

test('Kéo Nhịp uses its exact route and session cleanup pauses and releases the canvas loop', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('keo-co-doi-khang'), 'launchKeoNhip');
  assert.equal(h.context.openGameById('keo-co-doi-khang'), true);
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Kéo Nhịp');
  h.container.querySelector('#knOverlayAction').click();
  assert.equal(h.frames.size, 1);
  h.frame();
  assert.equal(h.frames.size, 1, 'the live match owns one animation frame');
  h.context.closeGameModal();
  assertStopped(h);
  assert.deepEqual(h.errors, []);
});

test('Kệ Sách Ký Ức uses its exact route and removes the complete puzzle on close', () => {
  const h = harness();
  assert.equal(h.context.NP_GameRegistry.engineFor('tiem-sach-cu-pho-co'), 'launchKeSachKyUc');
  assert.equal(h.context.openGameById('tiem-sach-cu-pho-co'), true);
  assert.equal(h.document.getElementById('modalGameTitle').textContent, 'Kệ Sách Ký Ức');
  assert.equal(h.container.querySelectorAll('.ksku-book').length, 5);
  assert.equal(h.container.querySelector('#kskuMoves').textContent, '0 / 8');
  h.context.closeGameModal();
  assertStopped(h);
  assert.deepEqual(h.errors, []);
});
