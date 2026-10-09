/* Exact catalog route for the original Kệ Sách Ký Ức clue-ordering puzzle. */
(function () {
  'use strict';
  function launchKeSachKyUc(container) {
    if (!window.NP_KeSachKyUc || !window.NP_KeSachKyUcModel || !window.NP_GameSession) {
      throw new Error('Kệ Sách Ký Ức is not ready');
    }
    const seed = `${Date.now()}:${Math.floor(Math.random() * 0x100000000)}`;
    window.NP_KeSachKyUc.mount(container, window.NP_GameSession.start(), { seed });
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchKeSachKyUc = launchKeSachKyUc;
})();
