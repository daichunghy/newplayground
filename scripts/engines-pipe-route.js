/* Exact catalog route for the original Vietnamese pipe puzzle. */
(function () {
  'use strict';
  function launchPipeRoute(container) {
    if (!window.NP_PipeRoute || !window.NP_PipeRouteModel || !window.NP_GameSession) {
      throw new Error('Nối Ống Nước is not ready');
    }
    window.NP_PipeRoute.mount(container, window.NP_GameSession.start());
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchPipeRoute = launchPipeRoute;
})();
