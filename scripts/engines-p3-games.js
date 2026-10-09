/* Exact catalog routes for two original P3 mechanics. */
(function (root) {
  'use strict';
  function launchBridgeBuilder(container) {
    if (!root.NP_BridgeBuilder || !root.NP_BridgeBuilderModel || !root.NP_GameSession) throw new Error('Xây Cầu is not ready');
    root.NP_BridgeBuilder.mount(container, root.NP_GameSession.start());
  }
  function launchPaperboy(container) {
    if (!root.NP_Paperboy || !root.NP_PaperboyModel || !root.NP_GameSession) throw new Error('Giao Báo is not ready');
    root.NP_Paperboy.mount(container, root.NP_GameSession.start());
  }
  root.NP_Engines = root.NP_Engines || {};
  root.NP_Engines.launchBridgeBuilder = launchBridgeBuilder;
  root.NP_Engines.launchPaperboy = launchPaperboy;
})(typeof window !== 'undefined' ? window : globalThis);
