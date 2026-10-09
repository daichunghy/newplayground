/* Exact catalog launcher for the original Ranh Giới Mây game. */
(function () {
  'use strict';

  function launchRanhGioiMay(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_RanhGioiMay.mount(container, game, session);
  }

  function launchKhoiDaLan(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_KhoiDaLan.mount(container, session);
  }

  function launchBaiBayCot(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_Klondike.mount(container, session);
  }

  function launchBonO(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_FreeCell.mount(container, session);
  }

  function launchBaiNhen(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_Spider.mount(container, session);
  }

  function launchOrbitArkanoid(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_OrbitBrick.mount(container, session, window.NP_Audio);
  }

  function launchBiVom(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_BubbleDome.mount(container, session);
  }

  function launchOngNghiem(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_TestTube.mount(container, session);
  }

  function launchBatChot(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_PinballPegs.mount(container, session);
  }

  function launchLemonadeStand(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_LemonadeStand.mount(container, session);
  }

  if (!window.NP_Engines) window.NP_Engines = {};
  window.NP_Engines.launchRanhGioiMay = launchRanhGioiMay;
  window.NP_Engines.launchKhoiDaLan = launchKhoiDaLan;
  window.NP_Engines.launchBaiBayCot = launchBaiBayCot;
  window.NP_Engines.launchBonO = launchBonO;
  window.NP_Engines.launchBaiNhen = launchBaiNhen;
  window.NP_Engines.launchOrbitArkanoid = launchOrbitArkanoid;
  window.NP_Engines.launchBiVom = launchBiVom;
  window.NP_Engines.launchOngNghiem = launchOngNghiem;
  window.NP_Engines.launchBatChot = launchBatChot;
  window.NP_Engines.launchLemonadeStand = launchLemonadeStand;
})();
