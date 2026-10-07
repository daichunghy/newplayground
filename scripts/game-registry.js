/** Exact catalog IDs only. A prototype is not a complete replica or an approved release. */
(function () {
  'use strict';
  const entries = Object.freeze({
    'hang-rong': 'launchHangRong',
    'dao-vang': 'launchDaoVang',
    'ban-trung-khung-long': 'launchBanTrung',
    'kim-cuong-bejeweled': 'launchKimCuong',
    'line-98': 'launchLine98',
    'dat-bom-bomberman': 'launchDatBom',
    'ban-xe-tang-1990': 'launchXeTang1990',
    'nong-trai-vui-ve': 'launchNongTrai',
    'gunny-2d': 'launchGunny',
    'nuoi-ca-nemo': 'launchNuoiCaNemo',
    'diner-dash': 'launchDinerDash',
    'zuma-ech-ban-ngoc': 'launchZuma',
    'co-caro': 'launchCaro',
    'co-tuong': 'launchCoTuong',
    'ban-bi-ve': 'launchBanBiVe',
    'o-an-quan': 'launchOAnQuan',
    'do-min-minesweeper': 'launchDoMin',
    'xep-gach-tetris': 'launchTetris',
    'pac-man': 'launchPacMan',
    'ran-san-moi-snake': 'launchSnake',
    'plants-vs-zombies-2d': 'launchPvZ',
    'feeding-frenzy': 'launchFeedingFrenzy',
    'flappy-bird': 'launchFlappyBird',
    'chem-hoa-qua': 'launchFruitNinja',
    'mario-co-dien': 'launchMario',
    'pha-gach-dx-ball': 'launchDXBall',
    'day-thung-sokoban': 'launchSokoban',
    'tro-choi-2048': 'launchGame2048',
    'danh-bai-uno': 'launchDanhBaiUno',
    'pong-1972': 'launchPong',
    'ban-ga-vu-tru': 'launchChickenInvaders',
    'lat-the-tri-nho': 'launchPikachu',
    'boom-online-bnb': 'launchBoomOnline',
    'audition-nhip-dieu': 'launchAudition',
    'road-rash-dua-xe-moto': 'launchRoadRash',
    'rockman-mega-man': 'launchMegaMan',
    'duck-hunt-ban-vit': 'launchDuckHunt',
    'street-fighter-2-doi-khang': 'launchStreetFighter',
    'bubble-bobble-khung-long-bong-bong': 'launchBubbleBobble',
    'age-of-war-thoi-dai-chien-tranh': 'launchAgeOfWar',
    'bloxorz-khoi-da-lan': 'launchBloxorz',
    'raft-wars-ban-sung-phao': 'launchRaftWars'
  });
  const engineFor = id => Object.prototype.hasOwnProperty.call(entries, id) ? entries[id] : null;
  const isPlayable = id => Boolean(engineFor(id) && window.NP_Engines &&
    typeof window.NP_Engines[engineFor(id)] === 'function');
  window.NP_GameRegistry = Object.freeze({
    entries, engineFor, isPlayable,
    launch(container, game) {
      if (!isPlayable(game.id)) return false;
      window.NP_Engines[engineFor(game.id)](container, game);
      return true;
    }
  });
})();
