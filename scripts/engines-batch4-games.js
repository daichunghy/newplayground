/* Exact catalog routes for four original batch-four game prototypes. */
(function (root) {
  'use strict';
  function launchCutRope(container) {
    if (!root.NP_CutRope || !root.NP_CutRopeModel || !root.NP_GameSession) throw new Error('Cắt Dây is not ready');
    root.NP_CutRope.mount(container, root.NP_GameSession.start());
  }
  function launchOrbitPinball(container) {
    if (!root.NP_OrbitPinball || !root.NP_OrbitPinballModel || !root.NP_GameSession) throw new Error('Pinball Quỹ Đạo is not ready');
    root.NP_OrbitPinball.mount(container, root.NP_GameSession.start());
  }
  function launchTyperShark(container) {
    if (!root.NP_TyperShark || !root.NP_TyperSharkModel || !root.NP_GameSession) throw new Error('Gõ Chữ Đuổi Cá is not ready');
    root.NP_TyperShark.mount(container, root.NP_GameSession.start());
  }
  function launchQbertPyramid(container) {
    if (!root.NP_QbertPyramid || !root.NP_QbertPyramidModel || !root.NP_GameSession) throw new Error('Nhảy Khối Lập Phương is not ready');
    root.NP_QbertPyramid.mount(container, root.NP_GameSession.start());
  }
  root.NP_Engines = root.NP_Engines || {};
  root.NP_Engines.launchCutRope = launchCutRope;
  root.NP_Engines.launchOrbitPinball = launchOrbitPinball;
  root.NP_Engines.launchTyperShark = launchTyperShark;
  root.NP_Engines.launchQbertPyramid = launchQbertPyramid;
})(typeof window !== 'undefined' ? window : globalThis);
