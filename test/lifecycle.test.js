// Cross-cutting behaviour every game shares: the dispatch table has an entry for
// each game, a reconnecting player gets their private state back, and a player
// leaving mid-game does not strand the room.
//
// These are the four things the add-a-game checklist says are most often
// forgotten, so they are checked for every game rather than game by game.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers, captureBroadcasts } = require('./helpers');

const GAMES = ['tictactoe', 'killerdoctor', 'scribble', 'uno', 'quiz', 'connect4', 'undercover', 'rps'];

/** Starts `game` with enough players and hands back the room, timers stopped. */
function started(game, extra = 0) {
  const room = makeRoom(game, app.minPlayers(game) + extra);
  const starter = {
    tictactoe: app.startTTT, connect4: app.startC4, rps: app.startRPS,
    undercover: app.startUC, killerdoctor: app.startKD, scribble: app.startScribble,
    uno: app.startUno,
  }[game];
  starter(room);
  app.clearTimers(room);
  return room;
}

test('every game in the home screen is wired end to end', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const cards = [...html.matchAll(/class="game-card"[^>]*data-game="([a-z0-9]+)"/g)].map(m => m[1]);
  assert.equal(cards.length, GAMES.length, 'the home screen offers a card per game');
  for (const game of cards) {
    assert.ok(GAMES.includes(game), `the home screen offers "${game}", which the server does not know`);
    assert.ok(html.includes(`id="view-${game}"`), `${game} has no view`);
    assert.ok(html.includes(`id="rules-${game}"`), `${game} has no rules panel`);
    assert.ok(html.includes(`data-game="${game}"`), `${game} has no rules tab`);
  }
});

test('a game cannot start below its minimum', () => {
  for (const game of GAMES) {
    assert.ok(app.minPlayers(game) >= 2, `${game} needs at least two people`);
  }
  assert.equal(app.minPlayers('undercover'), 4, 'social deduction needs a table');
  assert.equal(app.minPlayers('killerdoctor'), 4);
  assert.equal(app.minPlayers('scribble'), 3);
});

test('reconnecting returns the private state, not just the public one', () => {
  // tictactoe: the symbol you are playing
  const ttt = started('tictactoe');
  const x = ttt.gameState.players.X.id;
  const xSocket = sock(x);
  app.sendReconnectState(ttt, xSocket);
  assert.deepEqual(xSocket.received('ttt:symbol'), [{ symbol: 'X' }]);
  assert.equal(xSocket.received('ttt:state').length, 1);
  stopTimers(ttt);

  // connect4: your disc colour
  const c4 = started('connect4');
  const red = c4.gameState.players.R.id;
  const redSocket = sock(red);
  app.sendReconnectState(c4, redSocket);
  assert.deepEqual(redSocket.received('c4:disc'), [{ disc: 'R' }]);
  stopTimers(c4);

  // undercover: your word
  const uc = started('undercover');
  const player = Object.values(uc.gameState.playerData)[0];
  const ucSocket = sock(player.id);
  app.sendReconnectState(uc, ucSocket);
  assert.deepEqual(ucSocket.received('uc:word'), [{ word: player.word }]);
  assert.equal(ucSocket.received('uc:state').length, 1);
  stopTimers(uc);

  // uno: your hand
  const uno = started('uno');
  const unoId = uno.gameState.playerOrder[0];
  const unoSocket = sock(unoId);
  app.sendReconnectState(uno, unoSocket);
  assert.deepEqual(unoSocket.received('uno:hand'), [{ hand: uno.gameState.hands[unoId] }]);
  stopTimers(uno);

  // mongolpuri: your role
  const kd = started('killerdoctor');
  const kdPlayer = Object.values(kd.gameState.playerData)[0];
  const kdSocket = sock(kdPlayer.id);
  app.sendReconnectState(kd, kdSocket);
  assert.equal(kdSocket.received('kd:reconnect')[0].role, kdPlayer.role);
  stopTimers(kd);

  // rps: the bracket
  const rps = started('rps');
  const rpsSocket = sock('p1');
  app.sendReconnectState(rps, rpsSocket);
  assert.equal(rpsSocket.received('rps:state').length, 1);
  stopTimers(rps);
});

test('a spectator reconnecting gets the public state and no secret', () => {
  const room = started('connect4', 1);   // one player more than the game seats
  const gs = room.gameState;
  const spectator = ['p1', 'p2', 'p3'].find(id => id !== gs.players.R.id && id !== gs.players.Y.id);
  const socket = sock(spectator);
  app.sendReconnectState(room, socket);
  assert.deepEqual(socket.received('c4:disc'), [{ disc: null }], 'a spectator is told they hold no disc');
  stopTimers(room);
});

test('reconnecting to a room with no game in progress falls back to the lobby', () => {
  const room = makeRoom('tictactoe', 2);
  room.gameState = null;
  const io = captureBroadcasts();
  try {
    app.sendReconnectState(room, sock('p1'));
    assert.ok(io.of('lobby:update').length, 'the lobby is re-sent instead of a game state');
  } finally {
    io.restore();
  }
});

test('a player leaving mid-game never leaves the room stuck', () => {
  for (const game of GAMES.filter(g => g !== 'quiz')) {
    const room = started(game, 1);
    const leaver = [...room.players.keys()][0];
    room.players.delete(leaver);

    const io = captureBroadcasts();
    try {
      assert.doesNotThrow(
        () => app.onPlayerDisconnect(room, leaver, 'P1'),
        `${game} threw when a player left`,
      );
    } finally {
      io.restore();
      stopTimers(room);
    }
  }
});

test('a departure from an undercover table advances the round rather than hanging', () => {
  // A big civilian majority, so losing one player cannot end the game and hide
  // the behaviour under test.
  const room = makeRoom('undercover', 7, { undercoverCount: 1, mrWhite: 0 });
  app.startUC(room);
  app.clearTimers(room);
  const gs = room.gameState;
  app.ucStartClues(room);
  assert.equal(gs.phase, 'clues');

  // The leaver has to be a civilian: if the lone undercover walked out the
  // civilians would win outright and the round would end rather than advance.
  const speaker = Object.values(gs.playerData).find(p => p.role === 'civilian').id;
  gs.speakerIndex = gs.speakOrder.indexOf(speaker);

  room.players.delete(speaker);
  app.onPlayerDisconnect(room, speaker, 'P1');

  assert.equal(gs.playerData[speaker].alive, false, 'the leaver is out of the game');
  assert.notEqual(gs.speakOrder[gs.speakerIndex], speaker, 'the table is not waiting on someone who left');
  stopTimers(room);
});

test('a departure from a live rps match advances the bracket', () => {
  const room = makeRoom('rps', 4);
  app.startRPS(room);
  app.clearTimers(room);
  app.rpsAdvance(room);
  const gs = room.gameState;
  const leaver = gs.match.p1;
  const survivor = gs.match.p2;
  const { currentRound, currentMatch } = gs;

  room.players.delete(leaver);
  app.onPlayerDisconnect(room, leaver, 'P1');

  assert.equal(gs.rounds[currentRound][currentMatch].winner, survivor, 'the opponent advances by forfeit');
  assert.equal(gs.allPlayers[leaver], undefined, 'the leaver is out of the bracket');
  stopTimers(room);
});

test('the session scoreboard counts a game for everyone and a win for the winners', () => {
  const room = makeRoom('tictactoe', 3);
  app.recordResult(room, ['p1'], ['p1', 'p2', 'p3']);
  assert.deepEqual(
    Object.fromEntries(Object.entries(room.sessionStats).map(([id, s]) => [id, [s.wins, s.gamesPlayed]])),
    { p1: [1, 1], p2: [0, 1], p3: [0, 1] },
  );

  app.recordResult(room, ['p2'], ['p1', 'p2', 'p3']);
  assert.equal(room.sessionStats.p1.gamesPlayed, 2);
  assert.equal(room.sessionStats.p1.wins, 1, 'a past win is not lost');
  assert.equal(room.sessionStats.p2.wins, 1);
});

test('clearing timers empties the room queue', () => {
  const room = makeRoom('tictactoe', 2);
  app.addTimer(room, () => {}, 60000);
  app.addTimer(room, () => {}, 60000);
  assert.equal(room.timers.length, 2);
  app.clearTimers(room);
  assert.equal(room.timers.length, 0, 'an emptied room must not leave timers running');
});
