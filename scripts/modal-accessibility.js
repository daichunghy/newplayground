/* Portal dialog focus ownership, independent of each game's resource session. */
(function () {
  'use strict';
  function activate(modal, returnTarget) {
    const dialog = modal?.querySelector('[role="dialog"]');
    if (!dialog) return () => {};
    const focusable = () => [...dialog.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]')]
      .filter(node => node.tabIndex >= 0 && !node.disabled && !node.closest('[hidden], [inert], [aria-hidden="true"]') && node.getClientRects().length);
    function onKey(event) {
      if (event.key !== 'Tab') return;
      const list = focusable(), first = list[0], last = list[list.length - 1];
      if (!list.length) { event.preventDefault(); dialog.focus(); return; }
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    function onFocus(event) {
      if (!dialog.contains(event.target)) dialog.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus, true);
    dialog.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
      if (returnTarget && document.contains(returnTarget)) returnTarget.focus({ preventScroll: true });
    };
  }
  window.NP_ModalAccessibility = { activate };
})();
