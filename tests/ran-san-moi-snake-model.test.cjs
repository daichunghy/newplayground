const test = require('node:test');
const assert = require('node:assert/strict');
const Snake = require('../scripts/games/ran-san-moi-snake-model.js');

test('default board is deterministic, compact and keeps food outside the body', () => {
  const a = Snake.create({ seed: 91 }), b = Snake.create({ seed: 91 });
  assert.deepEqual(a.view(), b.view());
  const view = a.view();
  assert.equal(view.width, 18); assert.equal(view.height, 14);
  assert.equal(view.status, 'ready'); assert.equal(view.length, 3); assert.equal(view.score, 0);
  assert.ok(view.food);
  assert.equal(view.snake.some(p => p.x === view.food.x && p.y === view.food.y), false);
  assert.throws(() => Snake.create({ width: 5 }), RangeError);
  assert.throws(() => Snake.create({ height: 31 }), RangeError);
  assert.throws(() => Snake.create({ width: 8, height: 6, startLength: 6 }), RangeError);
});

test('direction queue accepts turns in order and never reverses into the neck', () => {
  const game = Snake.create({ seed: 4 });
  assert.equal(game.turn('left'), true); // The first direction also chooses the opening body orientation.
  assert.equal(game.view().direction, 'left');
  assert.equal(game.turn('right'), false);
  assert.equal(game.turn('up'), true);
  assert.equal(game.turn('left'), true);
  assert.equal(game.turn('down'), false, 'queue is bounded to two turns');
  assert.equal(game.step().moved, true);
  assert.equal(game.view().direction, 'up');
  assert.equal(game.step().moved, true);
  assert.equal(game.view().direction, 'left');
  assert.equal(game.turn('right'), false);
});

test('eating grows exactly one segment, adds ten points and places the next food safely', () => {
  const game = Snake.create({ width: 7, height: 7, seed: 1, random: () => 0 });
  assert.deepEqual(game.view().food, { x: 0, y: 0 });
  game.start('up'); game.step();
  game.turn('left'); game.step(); game.step(); game.step();
  game.turn('up'); game.step(); const ate = game.step();
  assert.deepEqual(ate, { moved: true, ate: true, status: 'running', reason: '' });
  const view = game.view();
  assert.equal(view.score, 10); assert.equal(view.eaten, 1); assert.equal(view.length, 4);
  assert.equal(view.speedLevel, 1);
  assert.ok(view.food); assert.equal(view.snake.some(p => p.x === view.food.x && p.y === view.food.y), false);
});

test('every fifth food raises pace by one level without changing the score rule', () => {
  const game = Snake.create({ width: 6, height: 6, startLength: 1,
    initial: { snake: [{ x: 0, y: 0 }], direction: 'right', food: { x: 1, y: 0 } }, random: () => 0 });
  game.start('right');
  for (let i = 0; i < 5; i++) assert.equal(game.step().ate, true);
  assert.equal(game.view().eaten, 5);
  assert.equal(game.view().score, 50);
  assert.equal(game.view().speedLevel, 2);
  assert.equal(game.view().status, 'running');
});

test('wall collision ends the run without moving the snake', () => {
  const game = Snake.create({ width: 6, height: 6, startLength: 1, seed: 3 });
  game.start('right'); game.step(); game.step();
  const before = game.view().snake;
  assert.deepEqual(game.step(), { moved: false, ate: false, status: 'lost', reason: 'wall' });
  assert.deepEqual(game.view().snake, before);
  assert.deepEqual(game.step(), { moved: false, ate: false, status: 'lost', reason: 'wall' });
  assert.equal(game.turn('up'), false);
});

test('entering the vacating tail is safe, while another body segment ends the run', () => {
  const tailLoop = [
    { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 },
    { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }
  ];
  const tailGame = Snake.create({ width: 6, height: 6, initial: { snake: tailLoop, direction: 'right', food: { x: 5, y: 5 } } });
  tailGame.start('right');
  assert.equal(tailGame.step().moved, true);
  assert.deepEqual(tailGame.view().snake[0], { x: 3, y: 2 });
  assert.equal(tailGame.view().length, 8);

  const nearLoop = [
    { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 },
    { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 5, y: 2 }
  ];
  const selfGame = Snake.create({ width: 7, height: 6, initial: { snake: nearLoop, direction: 'right', food: { x: 6, y: 5 } } });
  selfGame.start('right');
  assert.deepEqual(selfGame.step(), { moved: false, ate: false, status: 'lost', reason: 'self' });
});

test('filling the final cell wins and malformed fixtures are rejected', () => {
  const path = [];
  for (let y = 0; y < 5; y++) {
    const xs = y % 2 === 0 ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];
    for (const x of xs) path.push({ x, y });
  }
  for (let x = 0; x < 5; x++) path.push({ x, y: 5 });
  const game = Snake.create({ width: 6, height: 6, initial: { snake: path.reverse(), direction: 'right', food: { x: 5, y: 5 } } });
  game.start('right');
  assert.deepEqual(game.step(), { moved: true, ate: true, status: 'won', reason: 'filled' });
  assert.equal(game.view().length, 36); assert.equal(game.view().food, null);
  assert.equal(game.step().status, 'won');
  assert.throws(() => Snake.create({ width: 6, height: 6, initial: { snake: [{ x: 1, y: 1 }, { x: 3, y: 1 }], food: { x: 5, y: 5 } } }), RangeError);
});
