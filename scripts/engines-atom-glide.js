/* Exact catalog route for the original Vietnamese molecule-assembly puzzle. */
(function () {
  'use strict';

  function launchAtomGlide(container) {
    if (!window.NP_AtomGlide || !window.NP_AtomGlideModel || !window.NP_GameSession) {
      throw new Error('Ghép Phân Tử is not ready');
    }
    window.NP_AtomGlide.mount(container, window.NP_GameSession.start());
  }

  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchAtomGlide = launchAtomGlide;
})();
