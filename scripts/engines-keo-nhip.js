/* Exact catalog route for the original Kéo Nhịp rhythm-tug game. */
(function () {
  'use strict';
  function launchKeoNhip(container) {
    if (!window.NP_KeoNhip || !window.NP_KeoNhipModel || !window.NP_GameSession) {
      throw new Error('Kéo Nhịp is not ready');
    }
    window.NP_KeoNhip.mount(container, window.NP_GameSession.start());
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchKeoNhip = launchKeoNhip;
})();
