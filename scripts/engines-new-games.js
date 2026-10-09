/* Exact launchers for two original backlog titles. */
(function () {
  'use strict';
  function launchDogCrossing(container) {
    if (!window.NP_DogCrossing || !window.NP_DogCrossingModel || !window.NP_GameSession) {
      throw new Error('Dắt Cún Qua Đường is not ready');
    }
    return window.NP_DogCrossing.mount(container, window.NP_GameSession.start());
  }
  function launchLineRider(container) {
    if (!window.NP_LineRider || !window.NP_LineRiderModel || !window.NP_GameSession) {
      throw new Error('Bút Vẽ Trượt Ván is not ready');
    }
    return window.NP_LineRider.mount(container, window.NP_GameSession.start());
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchDogCrossing = launchDogCrossing;
  window.NP_Engines.launchLineRider = launchLineRider;
})();
