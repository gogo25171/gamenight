const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers } = require('./helpers');

const COLS = 7, ROWS = 6;
const cell = (r, c) => r * COLS + c;
const emptyGrid = () => Array(COLS * ROWS).fill(null);

test('win detection finds every direction', () => {
  const cases = {
    horizontal: [cell(5, 0), cell(5, 1), cell(5, 2), cell(5, 3)],
    vertical: [cell(2, 3), cell(3, 3), cell(4, 3), cell(5, 3)],
    'diagonal down-right': [cell(2, 0), cell(3, 1), cell(4, 2), cell(5, 3)],
    'diagonal up-right': [cell(5, 0), cell(4, 1), cell(3, 2), cell(2, 3)],
  };
  for (const [label, cells] of Object.entries(cases)) {
    const board = emptyGrid();
    cells.forEach(i => { board[i] = 'R'; });
    const line = app.c4Win(board, COLS, ROWS, app.C4_NEED);
    assert.ok(line, `${label} not detected`);
    assert.deepEqual([...line].sort((a, b) => a - b), [...cells].sort((a, b) => a - b));
  }
});

test('three in a row is not a win', () => {
  const board = emptyGrid();
  [cell(5, 0), cell(5, 1), cell(5, 2)].forEach(i => { board[i] = 'Y'; });
  assert.equal(app.c4Win(board, COLS, ROWS, app.C4_NEED), null);
});

test('a line never wraps from one row to the next', () => {
  // The last two cells of row 0 and the first two of row 1 are adjacent in the
  // flat array but are not a line on the board.
  const board = emptyGrid();
  [cell(0, 5), cell(0, 6), cell(1, 0), cell(1, 1)].forEach(i => { board[i] = 'R'; });
  assert.equal(app.c4Win(board, COLS, ROWS, app.C4_NEED), null);
});

test('a line of two colours is not a win', () => {
  const board = emptyGrid();
  board[cell(5, 0)] = 'R'; board[cell(5, 1)] = 'R';
  board[cell(5, 2)] = 'Y'; board[cell(5, 3)] = 'R';
  assert.equal(app.c4Win(board, COLS, ROWS, app.C4_NEED), null);
});

test('the grid is built from the host settings', () => {
  const room = makeRoom('connect4', 2, { cols: 9, rows: 7 });
  app.startC4(room);
  assert.equal(room.gameState.cols, 9);
  assert.equal(room.gameState.rows, 7);
  assert.equal(room.gameState.board.length, 63);
  assert.equal(app.c4Public(room.gameState).cols, 9, 'the client is told the size');
  stopTimers(room);
});

test('a disc falls to the lowest free cell', () => {
  const room = makeRoom('connect4', 2);
  app.startC4(room);
  const gs = room.gameState;
  const red = gs.players.R.id, yellow = gs.players.Y.id;

  app.c4Drop(room, sock(red), 3);
  assert.equal(gs.board[cell(5, 3)], 'R', 'first disc lands on the bottom row');
  app.c4Drop(room, sock(yellow), 3);
  assert.equal(gs.board[cell(4, 3)], 'Y', 'the next disc stacks on top');
  assert.equal(gs.lastMove, cell(4, 3));
  stopTimers(room);
});

test('illegal drops change nothing', () => {
  const room = makeRoom('connect4', 2);
  app.startC4(room);
  const gs = room.gameState;
  const red = gs.players.R.id, yellow = gs.players.Y.id;
  const filled = () => gs.board.filter(Boolean).length;

  app.c4Drop(room, sock(yellow), 0);
  assert.equal(filled(), 0, 'red opens; yellow may not move first');
  app.c4Drop(room, sock(red), -1);
  app.c4Drop(room, sock(red), COLS);
  app.c4Drop(room, sock(red), 2.5);
  app.c4Drop(room, sock(red), 'x');
  assert.equal(filled(), 0, 'a column outside the grid is rejected');
  app.c4Drop(room, sock('spectator'), 0);
  assert.equal(filled(), 0, 'a spectator may not drop');
  stopTimers(room);
});

test('a full column stops accepting discs', () => {
  const room = makeRoom('connect4', 2);
  app.startC4(room);
  const gs = room.gameState;
  for (let i = 0; i < ROWS + 4; i++) app.c4Drop(room, sock(gs.currentTurn), 0);
  const column = gs.board.filter((v, i) => i % COLS === 0 && v);
  assert.equal(column.length, ROWS, 'a column holds exactly `rows` discs');
  stopTimers(room);
});

test('four in a row wins and scores', () => {
  const room = makeRoom('connect4', 2, { bestOf: 0 });
  app.startC4(room);
  const gs = room.gameState;
  const red = gs.players.R.id, yellow = gs.players.Y.id;

  for (const col of [0, 1, 2]) {
    app.c4Drop(room, sock(red), col);
    app.c4Drop(room, sock(yellow), 6);
  }
  assert.equal(gs.winner, null, 'three is not four');
  app.c4Drop(room, sock(red), 3);

  assert.equal(gs.winner, red);
  assert.equal(gs.winnerDisc, 'R');
  assert.equal(gs.winLine.length, 4);
  assert.equal(gs.scores[red], 1);
  assert.equal(gs.matchWinner, null, 'free play has no match winner');

  app.c4Drop(room, sock(yellow), 5);
  assert.equal(gs.board.filter(Boolean).length, 7, 'the board freezes once someone has won');
  stopTimers(room);
});

test('a new game swaps colours, clears the grid and keeps the score', () => {
  const room = makeRoom('connect4', 2);
  app.startC4(room);
  const gs = room.gameState;
  const red = gs.players.R.id, yellow = gs.players.Y.id;
  for (const col of [0, 1, 2, 3]) {
    app.c4Drop(room, sock(red), col);
    if (col < 3) app.c4Drop(room, sock(yellow), 6);
  }
  assert.equal(gs.scores[red], 1);

  app.c4NewGame(room);
  assert.equal(gs.players.R.id, yellow, 'colours swap so red never keeps the advantage');
  assert.ok(gs.board.every(c => c === null));
  assert.equal(gs.winner, null);
  assert.equal(gs.lastMove, null);
  assert.equal(gs.gameCount, 2);
  assert.equal(gs.scores[red], 1, 'scores survive a new game');
  stopTimers(room);
});

test('best of 3 ends the match after two wins', () => {
  const room = makeRoom('connect4', 2, { bestOf: 3 });
  app.startC4(room);
  const gs = room.gameState;
  const champion = gs.players.R.id;

  // The filler drops are spread across columns so the opponent never stacks
  // four of its own discs and wins the game the test is trying to lose.
  const winBottomRow = () => {
    const other = gs.players.R.id === champion ? gs.players.Y.id : gs.players.R.id;
    const filler = [6, 5, 6, 5];
    let f = 0;
    if (gs.currentTurn !== champion) app.c4Drop(room, sock(other), filler[f++]);
    for (const col of [0, 1, 2, 3]) {
      app.c4Drop(room, sock(champion), col);
      if (col < 3) app.c4Drop(room, sock(other), filler[f++]);
    }
  };

  winBottomRow();
  assert.equal(gs.matchWinner, null, 'one win is not a match');
  app.c4NewGame(room);
  winBottomRow();

  assert.equal(gs.matchWinner, champion);
  assert.equal(room.sessionStats[champion]?.wins, 1, 'a match win reaches the session scoreboard');
  app.c4NewGame(room);
  assert.equal(gs.gameCount, 2, 'no new game once the match is decided');
  stopTimers(room);
});
