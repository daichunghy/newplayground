/* Exact catalog route for the original can-toppling game. */
(function () {
  'use strict';
  function launchSanBui(container) {
    if (!window.NP_SanBui || !window.NP_SanBuiModel || !window.NP_GameSession) {
      throw new Error('Sân Bụi is not ready');
    }
    window.NP_SanBui.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine || null);
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchSanBui = launchSanBui;
})();
