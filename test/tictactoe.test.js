const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers } = require('./helpers');

const empty = size => Array(size * size).fill(null);
const place = (board, size, cells, sym) => { cells.forEach(([r, c]) => { board[r * size + c] = sym; }); return board; };

test('win detection finds every direction on a 3x3 board', () => {
  const cases = {
    row: [[1, 0], [1, 1], [1, 2]],
    column: [[0, 2], [1, 2], [2, 2]],
    diagonal: [[0, 0], [1, 1], [2, 2]],
    'anti-diagonal': [[0, 2], [1, 1], [2, 0]],
  };
  for (const [label, cells] of Object.entries(cases)) {
    const board = place(empty(3), 3, cells, 'X');
    const line = app.tttWin(board, 3, 3);
    assert.ok(line, `${label} not detected`);
    assert.equal(line.length, 3);
    assert.deepEqual([...line].sort((a, b) => a - b), cells.map(([r, c]) => r * 3 + c).sort((a, b) => a - b));
  }
});

test('a line of two is not a win', () => {
  assert.equal(app.tttWin(place(empty(3), 3, [[0, 0], [0, 1]], 'O'), 3, 3), null);
});

test('a line never wraps around the edge of the board', () => {
  // Cells 2 and 3 are adjacent in the flat array but sit on different rows.
  const board = empty(3);
  board[2] = 'X'; board[3] = 'X'; board[4] = 'X';
  assert.equal(app.tttWin(board, 3, 3), null, 'row 0 col 2 must not connect to row 1 col 0');
});

test('a mixed line is not a win', () => {
  const board = empty(3);
  board[0] = 'X'; board[1] = 'O'; board[2] = 'X';
  assert.equal(app.tttWin(board, 3, 3), null);
});

test('bigger boards need their own alignment length', () => {
  assert.deepEqual(app.TTT_WIN_LENGTH, { 3: 3, 4: 4, 5: 4 });

  const four = place(empty(4), 4, [[0, 0], [0, 1], [0, 2]], 'X');
  assert.equal(app.tttWin(four, 4, 4), null, 'three is not enough on a 4x4');
  four[3] = 'X';
  assert.ok(app.tttWin(four, 4, 4), 'four in a row wins on a 4x4');

  const five = place(empty(5), 5, [[1, 1], [2, 2], [3, 3], [4, 4]], 'O');
  assert.ok(app.tttWin(five, 5, 4), '5x5 wins on four aligned');
});

test('an empty and a full-but-unaligned board have no winner', () => {
  assert.equal(app.tttWin(empty(5), 5, 4), null);
  const full = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
  assert.equal(app.tttWin(full, 3, 3), null);
});

test('two players start a classic game, three or more start a tournament', () => {
  const duel = makeRoom('tictactoe', 2);
  app.startTTT(duel);
  assert.equal(duel.gameState.mode, 'classic');
  assert.equal(duel.gameState.board.length, 9);
  stopTimers(duel);

  const many = makeRoom('tictactoe', 4);
  app.startTTT(many);
  assert.equal(many.gameState.mode, 'tournament');
  assert.equal(many.gameState.board, null, 'no board until the first match starts');
  stopTimers(many);
});

test('the board size setting shapes the board', () => {
  for (const [size, need] of Object.entries(app.TTT_WIN_LENGTH)) {
    const room = makeRoom('tictactoe', 2, { boardSize: Number(size) });
    app.startTTT(room);
    assert.equal(room.gameState.size, Number(size));
    assert.equal(room.gameState.winLength, need);
    assert.equal(room.gameState.board.length, Number(size) ** 2);
    assert.equal(app.tttPublic(room.gameState).size, Number(size), 'size must reach the client');
    stopTimers(room);
  }
});

test('an invalid board size falls back to 3x3', () => {
  const room = makeRoom('tictactoe', 2);
  room.settings.boardSize = 12;   // set past validateSettings, as a corrupt state would be
  app.startTTT(room);
  assert.equal(room.gameState.size, 3);
  stopTimers(room);
});

test('illegal moves change nothing', () => {
  const room = makeRoom('tictactoe', 2);
  app.startTTT(room);
  const gs = room.gameState;
  const X = gs.players.X, O = gs.players.O;

  const filled = () => gs.board.filter(Boolean).length;
  app.tttMove(room, sock(O.id), 0);          // out of turn
  assert.equal(filled(), 0, 'the player whose turn it is not may not move');
  app.tttMove(room, sock(X.id), -1);
  app.tttMove(room, sock(X.id), 99);
  assert.equal(filled(), 0, 'off-board indexes are rejected');
  app.tttMove(room, sock('spectator'), 0);
  assert.equal(filled(), 0, 'a spectator may not move');

  app.tttMove(room, sock(X.id), 4);
  assert.equal(filled(), 1);
  app.tttMove(room, sock(O.id), 4);
  assert.equal(filled(), 1, 'an occupied cell is rejected');
  stopTimers(room);
});

test('a classic game alternates turns and ends on a win', () => {
  const room = makeRoom('tictactoe', 2);
  app.startTTT(room);
  const gs = room.gameState;
  const X = gs.players.X.id, O = gs.players.O.id;
  assert.equal(gs.currentTurn, X, 'X opens');

  app.tttMove(room, sock(X), 0);
  assert.equal(gs.currentTurn, O, 'the turn passes');
  app.tttMove(room, sock(O), 3);
  app.tttMove(room, sock(X), 1);
  app.tttMove(room, sock(O), 4);
  assert.equal(gs.winner, null);
  app.tttMove(room, sock(X), 2);

  assert.equal(gs.winner, X);
  assert.equal(gs.winnerSymbol, 'X');
  assert.deepEqual(gs.winLine, [0, 1, 2]);
  assert.equal(gs.scores[X], 1);

  app.tttMove(room, sock(O), 5);
  assert.equal(gs.board.filter(Boolean).length, 5, 'the board is frozen once someone has won');
  stopTimers(room);
});

test('a full board with no line is a draw', () => {
  const room = makeRoom('tictactoe', 2);
  app.startTTT(room);
  const gs = room.gameState;
  const X = gs.players.X.id, O = gs.players.O.id;
  // X X O / O O X / X O X — nine alternating moves, no line at any point.
  [[X, 0], [O, 2], [X, 1], [O, 3], [X, 5], [O, 4], [X, 6], [O, 7], [X, 8]]
    .forEach(([who, i]) => app.tttMove(room, sock(who), i));
  assert.equal(gs.winner, 'draw');
  assert.equal(gs.scores[X], 0);
  assert.equal(gs.scores[O], 0);
  stopTimers(room);
});

test('a new game swaps symbols, clears the board and keeps the score', () => {
  const room = makeRoom('tictactoe', 2);
  app.startTTT(room);
  const gs = room.gameState;
  const X = gs.players.X.id, O = gs.players.O.id;
  [[X, 0], [O, 3], [X, 1], [O, 4], [X, 2]].forEach(([who, i]) => app.tttMove(room, sock(who), i));
  assert.equal(gs.scores[X], 1);

  app.tttNewGame(room);
  assert.equal(gs.players.X.id, O, 'symbols swap so first-move advantage rotates');
  assert.equal(gs.players.O.id, X);
  assert.ok(gs.board.every(c => c === null));
  assert.equal(gs.winner, null);
  assert.equal(gs.gameCount, 2);
  assert.equal(gs.scores[X], 1, 'scores survive a new game');
  stopTimers(room);
});

// Symbols swap between games, so "make this player win" has to respect whose
// turn it currently is rather than assuming the target opens.
function winTopRow(room, target) {
  const gs = room.gameState;
  const other = gs.players.X.id === target ? gs.players.O.id : gs.players.X.id;
  const moves = gs.currentTurn === target
    ? [[target, 0], [other, 3], [target, 1], [other, 4], [target, 2]]
    : [[other, 3], [target, 0], [other, 4], [target, 1], [other, 6], [target, 2]];
  moves.forEach(([who, i]) => app.tttMove(room, sock(who), i));
}

test('best of 3 ends the match after two wins', () => {
  const room = makeRoom('tictactoe', 2, { bestOf: 3 });
  app.startTTT(room);
  const gs = room.gameState;
  const champion = gs.players.X.id;

  winTopRow(room, champion);
  assert.equal(gs.matchWinner, null, 'one win is not a match');
  app.tttNewGame(room);
  winTopRow(room, champion);

  assert.equal(gs.matchWinner, champion);
  assert.equal(room.sessionStats[champion]?.wins, 1, 'a match win reaches the session scoreboard');
  app.tttNewGame(room);
  assert.equal(gs.gameCount, 2, 'no new game once the match is decided');
  stopTimers(room);
});

test('free play never declares a match winner', () => {
  const room = makeRoom('tictactoe', 2, { bestOf: 0 });
  app.startTTT(room);
  const gs = room.gameState;
  const champion = gs.players.X.id;
  for (let i = 0; i < 4; i++) {
    winTopRow(room, champion);
    assert.equal(gs.matchWinner, null, `still free play after ${i + 1} wins`);
    app.tttNewGame(room);
  }
  assert.equal(gs.scores[champion], 4, 'free play keeps counting');
  stopTimers(room);
});

// Same regression as Connect Four: `new_game` is a host action on a finished
// board, not a reset button anyone can press mid-game.
test('a new game is refused while the board is still being played', () => {
  const room = makeRoom('tictactoe', 2);
  app.startTTT(room);
  const gs = room.gameState;
  app.tttMove(room, sock(gs.players.X.id), 4);
  const boardBefore = [...gs.board];

  app.tttNewGame(room);
  assert.deepEqual(gs.board, boardBefore, 'the board survived');
  assert.equal(gs.gameCount, 1, 'no new game was dealt');
  stopTimers(room);
});

test('only the host can ask for the next game', () => {
  const room = makeRoom('tictactoe', 2);
  app.startTTT(room);
  const gs = room.gameState;
  winTopRow(room, gs.players.X.id);
  assert.ok(gs.winner, 'a game has been won');

  const notHost = ['p1', 'p2'].find(id => id !== room.host);
  app.handleAction(room, sock(notHost), { action: 'new_game' });
  assert.equal(gs.gameCount, 1, `${notHost} is not the host and must not deal again`);

  app.handleAction(room, sock(room.host), { action: 'new_game' });
  assert.equal(gs.gameCount, 2, 'the host deals the next game');
  stopTimers(room);
});
