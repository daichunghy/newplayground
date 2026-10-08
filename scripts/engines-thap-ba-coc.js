/* Exact registry route for the original Tháp Ba Cọc game. */
(function () {
  'use strict';
  function launchThapBaCoc(container, game) {
    if (!window.NP_ThapBaCoc || !window.NP_GameSession) throw new Error('Tháp Ba Cọc is not ready');
    window.NP_ThapBaCoc.mount(container, window.NP_GameSession.start());
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchThapBaCoc = launchThapBaCoc;
})();
