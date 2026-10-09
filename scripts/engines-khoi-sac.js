/* Exact catalog route for the original signal-pattern puzzle. */
(function () {
  'use strict';
  function launchKhoiSac(container) {
    if (!window.NP_KhoiSac || !window.NP_KhoiSacModel || !window.NP_GameSession) {
      throw new Error('Khối Sắc is not ready');
    }
    const seed = `${Date.now()}:${Math.floor(Math.random() * 0x100000000)}`;
    window.NP_KhoiSac.mount(container, window.NP_GameSession.start(), { seed });
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchKhoiSac = launchKhoiSac;
})();
