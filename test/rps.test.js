const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers } = require('./helpers');

/** Starts a tournament and opens its first match without waiting on timers. */
function startMatch(room) {
  app.startRPS(room);
  app.clearTimers(room);
  app.rpsAdvance(room);
  return room.gameState;
}

const throwFor = (room, id, pick) => app.rpsAction(room, sock(id), { action: 'throw', pick });

test('the beat table is a complete three-way cycle', () => {
  assert.deepEqual([...app.RPS_MOVES].sort(), ['paper', 'rock', 'scissors']);
  for (const move of app.RPS_MOVES) {
    const beaten = app.RPS_BEATS[move];
    assert.ok(app.RPS_MOVES.includes(beaten), `${move} beats something outside the move list`);
    assert.notEqual(beaten, move, `${move} cannot beat itself`);
    assert.notEqual(app.RPS_BEATS[beaten], move, 'the cycle must not be symmetric');
  }
  assert.equal(new Set(Object.values(app.RPS_BEATS)).size, 3, 'each move is beaten by exactly one other');
});

test('a two-player room still builds a bracket', () => {
  const room = makeRoom('rps', 2);
  const gs = startMatch(room);
  assert.equal(gs.rounds.length, 1);
  assert.ok(gs.match, 'the single match starts straight away');
  assert.equal(gs.match.roundNo, 1);
  assert.equal(gs.match.phase, 'picking');
  stopTimers(room);
});

test('illegal throws are ignored', () => {
  const room = makeRoom('rps', 3);
  const gs = startMatch(room);
  const { p1, p2 } = gs.match;
  const bystander = ['p1', 'p2', 'p3'].find(id => id !== p1 && id !== p2);

  throwFor(room, bystander, 'rock');
  assert.equal(gs.match.picks[bystander], undefined, 'someone not in the match may not throw');

  throwFor(room, p1, 'lizard');
  assert.equal(gs.match.picks[p1], undefined, 'a move outside the move list is rejected');

  throwFor(room, p1, 'rock');
  throwFor(room, p1, 'paper');
  assert.equal(gs.match.picks[p1], 'rock', 'a player cannot change their throw');

  app.rpsAction(room, sock(p2), { action: 'nonsense', pick: 'rock' });
  assert.equal(gs.match.picks[p2], undefined, 'an unknown action does nothing');
  stopTimers(room);
});

test('every pairing resolves the way the rules say', () => {
  const expected = [
    ['rock', 'scissors', 'p1'], ['scissors', 'rock', 'p2'],
    ['paper', 'rock', 'p1'], ['rock', 'paper', 'p2'],
    ['scissors', 'paper', 'p1'], ['paper', 'scissors', 'p2'],
    ['rock', 'rock', null], ['paper', 'paper', null], ['scissors', 'scissors', null],
  ];
  for (const [a, b, winner] of expected) {
    const room = makeRoom('rps', 2, { bestOf: 7 });
    const gs = startMatch(room);
    const first = gs.match.p1, second = gs.match.p2;
    throwFor(room, first, a);
    throwFor(room, second, b);
    app.rpsResolveRound(room);

    const got = gs.match.result.winner;
    const want = winner === 'p1' ? first : winner === 'p2' ? second : null;
    assert.equal(got, want, `${a} vs ${b}`);
    assert.equal(gs.match.phase, 'reveal');
    assert.deepEqual(gs.match.result.picks, { [first]: a, [second]: b });
    stopTimers(room);
  }
});

test('a missing throw is filled in rather than stalling the bracket', () => {
  const room = makeRoom('rps', 2);
  const gs = startMatch(room);
  throwFor(room, gs.match.p1, 'rock');
  app.rpsResolveRound(room);   // what the picking timeout does

  assert.equal(gs.match.phase, 'reveal');
  assert.ok(app.RPS_MOVES.includes(gs.match.result.picks[gs.match.p2]), 'the silent player still threw');
  stopTimers(room);
});

test('resolving twice does not double-score a round', () => {
  const room = makeRoom('rps', 2, { bestOf: 7 });
  const gs = startMatch(room);
  throwFor(room, gs.match.p1, 'rock');
  throwFor(room, gs.match.p2, 'scissors');
  app.rpsResolveRound(room);
  const scores = { ...gs.match.scores };
  app.rpsResolveRound(room);   // a late timeout firing on an already-revealed round
  assert.deepEqual(gs.match.scores, scores);
  stopTimers(room);
});

test('the match ends at the majority of best-of', () => {
  for (const bestOf of [1, 3, 5, 7]) {
    const room = makeRoom('rps', 2, { bestOf });
    const gs = startMatch(room);
    const champion = gs.match.p1, loser = gs.match.p2;
    const needed = Math.ceil(bestOf / 2);

    for (let round = 1; round <= needed; round++) {
      throwFor(room, champion, 'rock');
      throwFor(room, loser, 'scissors');
      app.rpsResolveRound(room);
      const decided = round === needed;
      assert.equal(!!gs.match.matchWinner, decided, `best of ${bestOf}, round ${round}`);
      if (!decided) { app.clearTimers(room); app.rpsStartRound(room); }
    }
    assert.equal(gs.match.matchWinner, champion);
    assert.equal(gs.rounds[gs.currentRound][gs.currentMatch].winner, champion, 'the bracket records the winner');
    stopTimers(room);
  }
});

test('a tie does not advance the match', () => {
  const room = makeRoom('rps', 2, { bestOf: 1 });
  const gs = startMatch(room);
  throwFor(room, gs.match.p1, 'paper');
  throwFor(room, gs.match.p2, 'paper');
  app.rpsResolveRound(room);
  assert.equal(gs.match.matchWinner, null);
  assert.deepEqual(Object.values(gs.match.scores), [0, 0]);
  stopTimers(room);
});

test('a whole tournament reaches exactly one champion', () => {
  for (const players of [2, 3, 5, 8]) {
    const room = makeRoom('rps', players, { bestOf: 1 });
    const gs = startMatch(room);

    let guard = 0;
    while (!gs.tournamentWinner && guard++ < 64) {
      if (gs.match?.phase === 'picking') {
        throwFor(room, gs.match.p1, 'rock');
        throwFor(room, gs.match.p2, 'scissors');
        app.rpsResolveRound(room);
      }
      app.clearTimers(room);
      app.rpsAdvance(room);
    }

    assert.ok(gs.tournamentWinner, `${players} players: no champion`);
    assert.equal(room.status, 'ended');
    assert.equal(room.sessionStats[gs.tournamentWinner]?.wins, 1, 'the champion is recorded');
    assert.equal(gs.match, null, 'no match is left running');
    stopTimers(room);
  }
});
