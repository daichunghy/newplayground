/* Exact route for the original hex-word and spreading-spark game. */
(function () {
  'use strict';
  function launchBookworm(container, game) {
    if (!window.NP_Bookworm || !window.NP_GameSession) throw new Error('Mọt Sách Nối Chữ is not ready');
    window.NP_Bookworm.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine || null);
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchBookworm = launchBookworm;
})();
