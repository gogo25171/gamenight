const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, stopTimers } = require('./helpers');

const card = (color, value) => ({ color, value });

test('the deck is a standard 108-card UNO deck', () => {
  const deck = app.buildUnoDeck();
  assert.equal(deck.length, 108);

  const count = pred => deck.filter(pred).length;
  assert.equal(count(c => c.value === '0'), 4, 'one zero per colour');
  for (let n = 1; n <= 9; n++) {
    assert.equal(count(c => c.value === String(n)), 8, `two ${n}s per colour`);
  }
  for (const action of ['skip', 'reverse', 'draw2']) {
    assert.equal(count(c => c.value === action), 8, `two ${action}s per colour`);
  }
  assert.equal(count(c => c.value === 'wild'), 4);
  assert.equal(count(c => c.value === 'wild4'), 4);
  assert.equal(count(c => c.color === 'wild'), 8, 'only the wilds are colourless');
  for (const color of app.UNO_COLORS) {
    assert.equal(count(c => c.color === color), 25, `${color} has 25 cards`);
  }
});

test('shuffling keeps every card', () => {
  const before = app.buildUnoDeck();
  const after = app.shuffleArr(app.buildUnoDeck());
  assert.equal(after.length, before.length);
  const key = c => `${c.color}:${c.value}`;
  assert.deepEqual(after.map(key).sort(), before.map(key).sort(), 'a shuffle must not lose or invent cards');
});

test('a card is playable on colour, on value, or because it is wild', () => {
  const top = card('red', '7');

  assert.equal(app.unoCanPlay(card('red', '3'), top, 'red'), true, 'same colour');
  assert.equal(app.unoCanPlay(card('blue', '7'), top, 'red'), true, 'same value');
  assert.equal(app.unoCanPlay(card('wild', 'wild'), top, 'red'), true, 'a wild always plays');
  assert.equal(app.unoCanPlay(card('wild', 'wild4'), top, 'red'), true);
  assert.equal(app.unoCanPlay(card('blue', '3'), top, 'red'), false, 'neither colour nor value');

  // After a wild the declared colour rules, not the colour printed on the pile.
  const wildTop = card('wild', 'wild');
  assert.equal(app.unoCanPlay(card('green', '5'), wildTop, 'green'), true);
  assert.equal(app.unoCanPlay(card('red', '5'), wildTop, 'green'), false);
});

test('an action card matches another of the same action', () => {
  const top = card('red', 'skip');
  assert.equal(app.unoCanPlay(card('blue', 'skip'), top, 'red'), true);
  assert.equal(app.unoCanPlay(card('blue', 'reverse'), top, 'red'), false);
});

test('turn order wraps in both directions', () => {
  const gs = { playerOrder: ['a', 'b', 'c', 'd'], currentPlayerIndex: 0, direction: 1 };
  assert.equal(app.unoNextIdx(gs, 1), 1);
  assert.equal(app.unoNextIdx(gs, 2), 2, 'a skip jumps two seats');
  gs.currentPlayerIndex = 3;
  assert.equal(app.unoNextIdx(gs, 1), 0, 'play wraps past the last seat');

  gs.direction = -1;
  gs.currentPlayerIndex = 0;
  assert.equal(app.unoNextIdx(gs, 1), 3, 'a reverse wraps the other way');
  assert.equal(app.unoNextIdx(gs, 2), 2);
});

test('a game deals seven cards each and turns a non-wild starter', () => {
  for (let players = 2; players <= 8; players++) {
    const room = makeRoom('uno', players);
    app.startUno(room);
    const gs = room.gameState;

    assert.equal(gs.playerOrder.length, players);
    Object.values(gs.hands).forEach(hand => assert.equal(hand.length >= 7, true, 'seven cards each'));
    const top = gs.discardPile[gs.discardPile.length - 1];
    assert.notEqual(top.color, 'wild', 'the starting card is never a wild');
    assert.equal(gs.currentColor, top.color);

    const dealt = Object.values(gs.hands).reduce((n, h) => n + h.length, 0);
    assert.equal(dealt + gs.deck.length + gs.discardPile.length, 108, 'no card is lost or duplicated');
    stopTimers(room);
  }
});
