window.addEventListener('DOMContentLoaded', () => {
  const session = window.NP_GameSession.start();
  window.NP_LemonadeStand.mount(document.querySelector('#game'), session);
});
