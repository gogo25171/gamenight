// The single-elimination bracket is shared by the Tic Tac Toe tournament and
// Rock Paper Scissors, so a break here breaks two games at once.
//
// test-tournament.js at the repo root covers the same ground against its own
// copy of these functions. This file drives the real ones out of server.js —
// which is the point: the copy cannot catch a change made only in server.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers');

const ids = n => Array.from({ length: n }, (_, i) => 'p' + (i + 1));

test('nextPow2 rounds up to a power of two', () => {
  assert.equal(app.nextPow2(1), 1);
  assert.equal(app.nextPow2(2), 2);
  assert.equal(app.nextPow2(3), 4);
  assert.equal(app.nextPow2(5), 8);
  assert.equal(app.nextPow2(8), 8);
  assert.equal(app.nextPow2(9), 16);
});

test('every player is seeded exactly once', () => {
  for (let n = 2; n <= 16; n++) {
    const players = ids(n);
    const rounds = app.buildTournamentRounds(players);
    const seeded = rounds[0].flatMap(m => [m.p1, m.p2]).filter(Boolean);
    assert.deepEqual([...seeded].sort(), [...players].sort(), `${n} players`);
  }
});

test('the bracket has log2(size) rounds and one final match', () => {
  for (let n = 2; n <= 16; n++) {
    const rounds = app.buildTournamentRounds(ids(n));
    assert.equal(rounds.length, Math.log2(app.nextPow2(n)), `${n} players`);
    assert.equal(rounds[rounds.length - 1].length, 1, `${n} players: final round`);
  }
});

test('a phantom match never holds a real player', () => {
  // Phantom matches exist only to keep the tree shape; the client skips them.
  for (let n = 2; n <= 16; n++) {
    const rounds = app.buildTournamentRounds(ids(n));
    for (const round of rounds) {
      for (const match of round.filter(m => m.phantom)) {
        assert.equal(match.p1, null, `${n} players: phantom holds p1`);
        assert.equal(match.p2, null, `${n} players: phantom holds p2`);
      }
    }
  }
});

test('an odd seat gets a bye instead of an opponent', () => {
  const rounds = app.buildTournamentRounds(ids(3));
  const bye = rounds[0].find(m => m.isBye);
  assert.ok(bye, 'a 3-player bracket must contain a bye');
  assert.equal(bye.p2, null);
  assert.equal(bye.winner, bye.p1, 'a bye advances its player straight away');
});

test('propagating a winner fills the next round', () => {
  const rounds = app.buildTournamentRounds(ids(4));
  rounds[0][0].winner = rounds[0][0].p1;
  rounds[0][1].winner = rounds[0][1].p2;
  app.propagateTournamentWinners({ rounds });
  assert.equal(rounds[1][0].p1, rounds[0][0].p1);
  assert.equal(rounds[1][0].p2, rounds[0][1].p2);
  assert.equal(rounds[1][0].winner, null, 'a real pairing is not auto-advanced');
});

test('a lone player is only auto-advanced against a phantom', () => {
  const rounds = app.buildTournamentRounds(ids(5));
  // Only the first match is decided; its neighbour is a real pairing still to play.
  rounds[0][0].winner = rounds[0][0].p1;
  app.propagateTournamentWinners({ rounds });
  const next = rounds[1][0];
  assert.equal(next.p1, rounds[0][0].p1);
  assert.equal(next.winner, null, 'must wait for the other half of the bracket');
});

test('playing every bracket out always produces exactly one champion', () => {
  for (let n = 2; n <= 16; n++) {
    const rounds = app.buildTournamentRounds(ids(n));
    const gs = { rounds };
    let guard = 0;
    for (;;) {
      app.propagateTournamentWinners(gs);
      const next = rounds.flatMap((round, r) => round.map((m, i) => ({ m, r, i })))
        .find(({ m }) => !m.winner && m.p1 && m.p2);
      if (!next) break;
      next.m.winner = next.m.p1;   // the higher seed always wins
      assert.ok(guard++ < 64, `${n} players: bracket did not converge`);
    }
    const champion = rounds[rounds.length - 1][0].winner;
    assert.ok(champion, `${n} players: no champion`);
    assert.ok(ids(n).includes(champion), `${n} players: champion is not a seeded player`);
  }
});
