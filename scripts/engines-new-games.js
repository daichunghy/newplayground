/* Exact launchers for original backlog titles. */
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
  function launchSoapBubbleGarden(container) {
    if (!window.NP_SoapBubbleGarden || !window.NP_SoapBubbleGardenModel || !window.NP_GameSession) {
      throw new Error('Thổi Bong Bóng Xà Phòng is not ready');
    }
    return window.NP_SoapBubbleGarden.mount(container, window.NP_GameSession.start());
  }
  window.NP_Engines = window.NP_Engines || {};
  window.NP_Engines.launchDogCrossing = launchDogCrossing;
  window.NP_Engines.launchLineRider = launchLineRider;
  window.NP_Engines.launchSoapBubbleGarden = launchSoapBubbleGarden;
})();
