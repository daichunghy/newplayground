/* Exact routes for two original P3 discovery gameplays. */
(function () {
  'use strict';

  function launchSpotDifference(container) {
    if (!window.NP_SpotDifference || !window.NP_GameSession) throw new Error('Tìm Điểm Khác Biệt is not ready');
    window.NP_SpotDifference.mount(container, window.NP_GameSession.start());
  }

  function launchMoleTap(container) {
    if (!window.NP_MoleTap || !window.NP_GameSession) throw new Error('Đập Chuột Chũi is not ready');
    window.NP_MoleTap.mount(container, window.NP_GameSession.start());
  }

  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchSpotDifference = launchSpotDifference;
  window.NP_Engines.launchMoleTap = launchMoleTap;
})();
