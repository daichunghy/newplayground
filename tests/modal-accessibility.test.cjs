const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/modal-accessibility.js'), 'utf8');
function setup() {
  const listeners = new Map(), document = { activeElement: null, contains: node => !!node.connected,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); } };
  const control = (id, props = {}) => ({ id, connected: true, tabIndex: 0, disabled: false,
    closest() { return this.hidden || this.inert ? {} : null; }, getClientRects() { return this.offscreen ? [] : [{}]; },
    focus() { document.activeElement = this; }, ...props });
  const first = control('first'), last = control('last'), hidden = control('hidden', { hidden: true }),
    disabled = control('disabled', { disabled: true }), roving = control('roving', { tabIndex: -1 }),
    collapsed = control('collapsed', { offscreen: true }), outside = control('outside');
  let controls = [first, hidden, disabled, roving, collapsed, last];
  const dialog = { querySelectorAll: () => controls, contains: node => node === dialog || controls.includes(node),
    focus() { document.activeElement = dialog; } };
  const modal = { querySelector: () => dialog }, window = {};
  vm.runInNewContext(source, { window, document });
  let prevented = false;
  return { window, document, listeners, first, last, outside, dialog, modal,
    setControls: list => { controls = list; },
    key(shiftKey = false, key = 'Tab') { prevented = false; listeners.get('keydown')?.({ key, shiftKey, preventDefault() { prevented = true; } }); return prevented; } };
}
test('dialog gets focus, traps Tab/Shift+Tab and skips hidden/inert/disabled/offscreen controls', () => {
  const h = setup(); h.window.NP_ModalAccessibility.activate(h.modal, h.outside);
  assert.equal(h.document.activeElement, h.dialog); assert.equal(h.key(), true); assert.equal(h.document.activeElement, h.first);
  assert.equal(h.key(true), true); assert.equal(h.document.activeElement, h.last);
  assert.equal(h.key(), true); assert.equal(h.document.activeElement, h.first);
  assert.equal(h.key(false, 'ArrowRight'), false, 'game keys remain unmodified');
});
test('focus containment, no-control fallback, return focus and cleanup', () => {
  const h = setup(); const close = h.window.NP_ModalAccessibility.activate(h.modal, h.outside);
  h.document.activeElement = h.outside; h.listeners.get('focusin')({ target: h.outside });
  assert.equal(h.document.activeElement, h.dialog);
  h.setControls([]); assert.equal(h.key(), true); assert.equal(h.document.activeElement, h.dialog);
  close(); assert.equal(h.listeners.size, 0); assert.equal(h.document.activeElement, h.outside);
  h.outside.connected = false; h.window.NP_ModalAccessibility.activate(h.modal, h.outside)();
  assert.equal(h.document.activeElement, h.dialog, 'removed return target is not focused');
});
test('missing dialog is a harmless no-op', () => {
  const h = setup(); assert.doesNotThrow(() => h.window.NP_ModalAccessibility.activate(null, null)());
  assert.equal(h.listeners.size, 0);
});
