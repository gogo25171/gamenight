// The rule the whole codebase is built around: a secret never enters the public
// state. A role, a word, a hand of cards, a quiz answer — the *Public() shape is
// broadcast-safe and private data goes to the one socket that owns it.
//
// These are the tests that matter most. A bug here does not crash anything; it
// quietly ruins the game for everyone in the room, and nobody finds out until
// somebody opens the network tab.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers, captureBroadcasts } = require('./helpers');

/** Fails if `text` mentions `secret` anywhere, at any nesting depth. */
function assertHides(payload, secret, message) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  assert.ok(
    !new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text),
    `${message}\n  leaked: ${secret}\n  in: ${text.slice(0, 400)}`,
  );
}

test('undercover: a living player\'s role and word never reach the room', () => {
  const room = makeRoom('undercover', 6, { undercoverCount: 1, mrWhite: 1 });
  const io = captureBroadcasts();
  try {
    app.startUC(room);
    const gs = room.gameState;

    const pub = app.ucPublic(gs);
    pub.players.forEach(p => {
      assert.equal(p.role, null, `${p.name}'s role is in the public state`);
      assert.equal(p.word, null, `${p.name}'s word is in the public state`);
    });
    assert.equal(pub.words, null, 'the word pair is only revealed at game over');

    assertHides(io.roomText(room.code), gs.civilianWord, 'the civilian word was broadcast to the room');
    assertHides(io.roomText(room.code), gs.undercoverWord, 'the undercover word was broadcast to the room');
    assertHides(io.roomText(room.code), 'undercover', 'a role name was broadcast to the room');
    assertHides(io.roomText(room.code), 'mrwhite', 'a role name was broadcast to the room');
  } finally {
    io.restore();
    stopTimers(room);
  }
});

test('undercover: each word goes to its own socket and nowhere else', () => {
  const room = makeRoom('undercover', 6, { undercoverCount: 1, mrWhite: 1 });
  const io = captureBroadcasts();
  try {
    app.startUC(room);
    const gs = room.gameState;

    const words = io.of('uc:word');
    assert.equal(words.length, 6, 'every player is told their own word');
    for (const player of Object.values(gs.playerData)) {
      const mine = io.to(player.id).filter(m => m.ev === 'uc:word');
      assert.equal(mine.length, 1, `${player.name} should get exactly one word`);
      assert.equal(mine[0].payload.word, player.word, `${player.name} got the wrong word`);
    }
    assert.equal(io.to(room.code).filter(m => m.ev === 'uc:word').length, 0, 'no word is ever sent room-wide');
  } finally {
    io.restore();
    stopTimers(room);
  }
});

test('undercover: only an eliminated player is unmasked', () => {
  const room = makeRoom('undercover', 5, { mrWhite: 0 });
  app.startUC(room);
  const gs = room.gameState;
  const victim = Object.values(gs.playerData)[0];
  victim.alive = false;

  const pub = app.ucPublic(gs);
  const shown = pub.players.find(p => p.id === victim.id);
  assert.equal(shown.role, victim.role, 'an eliminated player is revealed');
  assert.equal(shown.word, victim.word);
  pub.players.filter(p => p.alive).forEach(p => {
    assert.equal(p.role, null, 'the survivors stay hidden');
    assert.equal(p.word, null);
  });
  stopTimers(room);
});

test('undercover: everything is revealed once, and only once, at game over', () => {
  const room = makeRoom('undercover', 5, { mrWhite: 0 });
  app.startUC(room);
  const gs = room.gameState;
  app.endUC(room, { winner: 'civilians', reason: 'allFound' });

  const pub = app.ucPublic(gs);
  pub.players.forEach(p => assert.ok(p.role, 'every role is shown at game over'));
  assert.equal(pub.words.civilian, gs.civilianWord);
  assert.equal(pub.words.undercover, gs.undercoverWord);
  stopTimers(room);
});

test('rock paper scissors: a throw is hidden until both players have committed', () => {
  const room = makeRoom('rps', 2, { bestOf: 3 });
  app.startRPS(room);
  app.clearTimers(room);
  app.rpsAdvance(room);
  const gs = room.gameState;
  const { p1, p2 } = gs.match;

  const io = captureBroadcasts();
  try {
    app.rpsAction(room, sock(p1), { action: 'throw', pick: 'rock' });

    const pub = app.rpsPublic(gs);
    assert.equal(pub.match.result, null, 'no result while the round is live');
    assert.equal(pub.match.thrown[p1], true, 'the room may know that a throw landed');
    assert.equal(pub.match.thrown[p2], false);
    assertHides(pub, 'rock', 'the throw itself must not be in the public state');
    assertHides(io.roomText(room.code), 'rock', 'the throw was broadcast to the room');

    app.rpsAction(room, sock(p2), { action: 'throw', pick: 'paper' });
    app.rpsResolveRound(room);
    const revealed = app.rpsPublic(gs);
    assert.equal(revealed.match.result.picks[p1], 'rock', 'both throws are public once the round is over');
    assert.equal(revealed.match.result.picks[p2], 'paper');
  } finally {
    io.restore();
    stopTimers(room);
  }
});

test('rock paper scissors: the thrower gets their own confirmation', () => {
  const room = makeRoom('rps', 2);
  app.startRPS(room);
  app.clearTimers(room);
  app.rpsAdvance(room);
  const thrower = sock(room.gameState.match.p1);
  app.rpsAction(room, thrower, { action: 'throw', pick: 'scissors' });
  assert.deepEqual(thrower.received('rps:confirmed'), [{ pick: 'scissors' }]);
  stopTimers(room);
});

test('uno: the room sees card counts, never cards', () => {
  const room = makeRoom('uno', 3);
  const io = captureBroadcasts();
  try {
    app.startUno(room);
    const gs = room.gameState;

    const pub = app.unoPublic(gs);
    // Seven each, except when the turned starter is a Draw Two — so the count is
    // checked against the real hands rather than against a fixed number.
    assert.deepEqual(
      pub.cardCounts,
      Object.fromEntries(gs.playerOrder.map(id => [id, gs.hands[id].length])),
      'the room sees the true hand sizes',
    );
    Object.values(pub.cardCounts).forEach(n => assert.ok(n >= 7, 'everyone is dealt at least seven cards'));
    assert.equal(pub.hands, undefined, 'hands are not part of the public state');
    assert.equal(pub.deck, undefined, 'the draw pile is a count, not a list');
    assert.equal(pub.deckCount, gs.deck.length);

    const state = io.of('uno:state');
    assert.ok(state.length, 'the room is sent a state');
    for (const id of gs.playerOrder) {
      const hand = gs.hands[id];
      const fingerprint = hand.map(c => `${c.color}:${c.value}`).join(',');
      assertHides(state, fingerprint, `${id}'s hand was broadcast`);
      const mine = io.to(id).filter(m => m.ev === 'uno:hand');
      assert.equal(mine.length, 1, 'each player is dealt their own hand privately');
      assert.deepEqual(mine[0].payload.hand, hand);
    }
  } finally {
    io.restore();
    stopTimers(room);
  }
});

test('mongolpuri: roles are dealt one socket at a time', () => {
  const room = makeRoom('killerdoctor', 6);
  const io = captureBroadcasts();
  try {
    app.startKD(room);
    const gs = room.gameState;

    const roleMessages = io.of('kd:role_assigned');
    assert.equal(roleMessages.length, 6, 'one role message per player');
    for (const player of Object.values(gs.playerData)) {
      const mine = io.to(player.id).filter(m => m.ev === 'kd:role_assigned');
      assert.equal(mine.length, 1);
      assert.equal(mine[0].payload.role, player.role);
      // The player list travels with the role, but as names only.
      mine[0].payload.allPlayers.forEach(p => assert.equal(p.role, undefined, 'the roster must not carry roles'));
    }
    assertHides(io.roomText(room.code), 'killer', 'a role reached the whole room');
  } finally {
    io.restore();
    stopTimers(room);
  }
});

test('scribble: only the drawer is told the word', () => {
  const room = makeRoom('scribble', 3);
  app.startScribble(room);
  app.clearTimers(room);

  const io = captureBroadcasts();
  try {
    app.scribbleStartTurn(room);
    const gs = room.gameState;
    const drawerId = gs.drawerOrder[gs.drawerIndex];

    const choices = io.to(drawerId).filter(m => m.ev === 'scribble:choose_word');
    assert.equal(choices.length, 1, 'the drawer picks from a private shortlist');
    const word = choices[0].payload.words[0];
    for (const id of gs.drawerOrder.filter(i => i !== drawerId)) {
      assert.equal(io.to(id).filter(m => m.ev === 'scribble:choose_word').length, 0, 'guessers see no shortlist');
    }

    io.sent.length = 0;
    app.scribbleWordChosen(room, drawerId, word);

    const toDrawer = io.to(drawerId).find(m => m.ev === 'scribble:draw_start');
    assert.equal(toDrawer.payload.word, word, 'the drawer knows what to draw');
    for (const id of gs.drawerOrder.filter(i => i !== drawerId)) {
      const theirs = io.to(id).find(m => m.ev === 'scribble:draw_start');
      assert.equal(theirs.payload.word, null, 'a guesser is never sent the word');
      assert.equal(theirs.payload.masked, gs.masked, 'a guesser gets the mask instead');
    }
    assertHides(io.roomText(room.code), word, 'the word reached the whole room');
  } finally {
    io.restore();
    stopTimers(room);
  }
});

test('scribble: the mask shows length and spacing, not letters', () => {
  assert.equal(app.maskWord('cat'), '_ _ _');
  assert.equal(app.maskWord('cat', [0]), 'c _ _');
  assert.equal(app.maskWord('hot dog').replace(/ /g, '').length, 6, 'only the letters are masked');
  assert.match(app.maskWord('hot dog'), /^_ _ _ {2,}_ _ _$/, 'the gap between words is kept visible');
  const masked = app.maskWord('elephant');
  assert.ok(!/[a-z]/.test(masked), 'no letter survives an unrevealed mask');
});

test('quiz: the answer is withheld until the reveal', () => {
  const room = makeRoom('quiz', 2);
  const question = {
    question: 'Which planet is closest to the Sun?',
    correctAnswer: 'Mercury',
    options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    difficulty: 'easy',
  };
  const gs = {
    type: 'quiz', questions: [question], currentQ: 0, phase: 'question',
    answers: {}, results: null, scores: { p1: 0, p2: 0 }, correctCounts: { p1: 0, p2: 0 },
    timeLimitMs: 20000, questionStartTime: Date.now(),
  };

  const asked = app.quizPublic(gs, room);
  assert.equal(asked.correctAnswer, null, 'the answer is not sent with the question');
  assert.equal(asked.results, null);
  assert.deepEqual(asked.options, question.options, 'the options are public — the answer is one of them');

  gs.phase = 'reveal';
  assert.equal(app.quizPublic(gs, room).correctAnswer, 'Mercury', 'revealed once the question is closed');
});
