/* Exact dispatcher for the original Tiệm Bánh Ngọt Cupcake prototype. */
(function (root) {
  'use strict';

  function launchCupcakeStudio(container) {
    const engine = root.NP_CupcakeStudio;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Tiệm Bánh Ngọt chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, root.NP_GameSession.start());
  }

  if (!root.NP_Engines) root.NP_Engines = {};
  root.NP_Engines.launchCupcakeStudio = launchCupcakeStudio;
})(window);
