/* Six original browser games: launch each into a managed, isolated game session. */
(function () {
  'use strict';
  function launchPhimSao(container) {
    if (!window.NP_PhimSao || !window.NP_GameSession) throw Error('Phím Sao is not ready');
    return window.NP_PhimSao.mount(container, window.NP_GameSession.start());
  }
  function launchMocQua(container) {
    if (!window.NP_MocQua || !window.NP_GameSession) throw Error('Móc Quà is not ready');
    return window.NP_MocQua.mount(container, window.NP_GameSession.start());
  }
  function launchDaoNgoc(container) {
    if (!window.NP_DaoNgoc || !window.NP_GameSession) throw Error('Đào Ngọc is not ready');
    return window.NP_DaoNgoc.mount(container, window.NP_GameSession.start());
  }
  window.NP_Engines = window.NP_Engines || {};
  Object.assign(window.NP_Engines, {launchPhimSao, launchMocQua, launchDaoNgoc});
})();
