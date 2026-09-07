const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers } = require('./helpers');

const roleOf = (gs, role) => Object.values(gs.playerData).filter(p => p.role === role);
const aliveIds = gs => Object.values(gs.playerData).filter(p => p.alive).map(p => p.id);

/** Starts a game and steps straight into the first clue round. */
function startClues(room) {
  app.startUC(room);
  app.clearTimers(room);
  app.ucStartClues(room);
  return room.gameState;
}

/** Every living player gives a clue, which lands the game in the voting phase. */
function giveAllClues(room, word = 'hint') {
  const gs = room.gameState;
  let guard = 0;
  while (gs.phase === 'clues' && guard++ < 20) {
    const speaker = gs.speakOrder[gs.speakerIndex];
    app.ucAction(room, sock(speaker), { action: 'clue', word });
  }
}

/** Everyone alive votes for `target`; the target votes for someone else. */
function voteOut(room, target) {
  const gs = room.gameState;
  const other = aliveIds(gs).find(id => id !== target);
  app.ucAction(room, sock(target), { action: 'vote', targetId: other });
  aliveIds(gs).filter(id => id !== target).forEach(id => {
    app.ucAction(room, sock(id), { action: 'vote', targetId: target });
  });
}

test('the impostor side never starts at parity with the civilians', () => {
  for (let players = 4; players <= 12; players++) {
    for (const undercoverCount of [1, 2]) {
      for (const mrWhite of [0, 1]) {
        const room = makeRoom('undercover', players, { undercoverCount, mrWhite });
        app.startUC(room);
        const gs = room.gameState;
        const civilians = roleOf(gs, 'civilian').length;
        const impostors = roleOf(gs, 'undercover').length + roleOf(gs, 'mrwhite').length;
        const label = `${players} players, ${undercoverCount} uc, white=${mrWhite}`;

        assert.equal(civilians + impostors, players, `${label}: everyone has a role`);
        assert.ok(impostors >= 1, `${label}: at least one impostor`);
        assert.ok(civilians > impostors, `${label}: civilians ${civilians} vs impostors ${impostors}`);
        assert.equal(app.ucCheckWin(gs), null, `${label}: the game must not be over on turn one`);
        stopTimers(room);
      }
    }
  }
});

test('Mr White only joins a table big enough for one', () => {
  for (let players = 4; players <= 6; players++) {
    const room = makeRoom('undercover', players, { mrWhite: 1 });
    app.startUC(room);
    const whites = roleOf(room.gameState, 'mrwhite').length;
    assert.equal(whites, players >= 5 ? 1 : 0, `${players} players`);
    stopTimers(room);
  }
});

test('words are handed out by role', () => {
  const room = makeRoom('undercover', 6, { undercoverCount: 1, mrWhite: 1 });
  app.startUC(room);
  const gs = room.gameState;

  assert.notEqual(gs.civilianWord, gs.undercoverWord, 'the two words must differ');
  assert.ok(app.UC_WORD_PAIRS.some(([a, b]) =>
    (a === gs.civilianWord && b === gs.undercoverWord) || (b === gs.civilianWord && a === gs.undercoverWord),
  ), 'the pair comes from the word list');

  roleOf(gs, 'civilian').forEach(p => assert.equal(p.word, gs.civilianWord));
  roleOf(gs, 'undercover').forEach(p => assert.equal(p.word, gs.undercoverWord));
  roleOf(gs, 'mrwhite').forEach(p => assert.equal(p.word, null, 'Mr White gets no word'));
  stopTimers(room);
});

test('only the current speaker can give a clue', () => {
  const room = makeRoom('undercover', 5);
  const gs = startClues(room);
  const speaker = gs.speakOrder[gs.speakerIndex];
  const other = gs.speakOrder.find(id => id !== speaker);

  app.ucAction(room, sock(other), { action: 'clue', word: 'too-early' });
  assert.equal(gs.clues.length, 0, 'speaking out of turn does nothing');

  app.ucAction(room, sock(speaker), { action: 'clue', word: 'mine' });
  assert.equal(gs.clues.length, 1);
  assert.equal(gs.clues[0].playerId, speaker);
  assert.equal(gs.clues[0].word, 'mine');
  assert.notEqual(gs.speakOrder[gs.speakerIndex], speaker, 'the turn moves on');
  stopTimers(room);
});

test('a clue is trimmed, collapsed and capped', () => {
  const room = makeRoom('undercover', 5);
  const gs = startClues(room);
  app.ucAction(room, sock(gs.speakOrder[0]), { action: 'clue', word: '  two   words  ' });
  assert.equal(gs.clues[0].word, 'two words');

  app.ucAction(room, sock(gs.speakOrder[1]), { action: 'clue', word: 'x'.repeat(200) });
  assert.equal(gs.clues[1].word.length, 24, 'a clue is capped at 24 characters');

  app.ucAction(room, sock(gs.speakOrder[2]), { action: 'clue', word: '   ' });
  assert.equal(gs.clues[2].word, '—', 'an empty clue becomes a placeholder, never a blank turn');
  stopTimers(room);
});

test('the clue round ends in a vote once everyone has spoken', () => {
  const room = makeRoom('undercover', 5);
  const gs = startClues(room);
  giveAllClues(room);
  assert.equal(gs.phase, 'voting');
  assert.equal(gs.clues.length, 5, 'one clue per living player');
  assert.equal(app.ucPublic(gs).votesTotal, 5);
  stopTimers(room);
});

test('the opening speaker rotates between rounds', () => {
  const room = makeRoom('undercover', 5);
  const gs = startClues(room);
  const firstOpener = gs.speakOrder[0];
  gs.round = 2;
  app.ucStartClues(room);
  assert.notEqual(gs.speakOrder[0], firstOpener, 'nobody opens twice in a row');
  stopTimers(room);
});

test('votes are rejected outside the rules', () => {
  const room = makeRoom('undercover', 5);
  const gs = startClues(room);
  const voter = gs.speakOrder[0];

  app.ucAction(room, sock(voter), { action: 'vote', targetId: gs.speakOrder[1] });
  assert.equal(gs.playerData[voter].vote, null, 'no voting during the clue round');

  giveAllClues(room);
  app.ucAction(room, sock(voter), { action: 'vote', targetId: voter });
  assert.equal(gs.playerData[voter].vote, null, 'nobody votes for themselves');

  app.ucAction(room, sock(voter), { action: 'vote', targetId: 'ghost' });
  assert.equal(gs.playerData[voter].vote, null, 'a target who is not at the table is rejected');
  stopTimers(room);
});

test('a majority eliminates and reveals a role', () => {
  const room = makeRoom('undercover', 5, { mrWhite: 0 });
  const gs = startClues(room);
  giveAllClues(room);
  const target = roleOf(gs, 'undercover')[0].id;
  voteOut(room, target);

  assert.equal(gs.phase, 'vote_result');
  assert.equal(gs.playerData[target].alive, false);
  assert.equal(gs.lastVote.eliminated.id, target);
  assert.equal(gs.lastVote.eliminated.role, 'undercover');
  assert.equal(gs.history.at(-1).name, gs.playerData[target].name);
  stopTimers(room);
});

test('a tied vote eliminates nobody', () => {
  const room = makeRoom('undercover', 4, { mrWhite: 0 });
  const gs = startClues(room);
  giveAllClues(room);
  const [a, b, c, d] = aliveIds(gs);
  app.ucAction(room, sock(a), { action: 'vote', targetId: b });
  app.ucAction(room, sock(b), { action: 'vote', targetId: a });
  app.ucAction(room, sock(c), { action: 'vote', targetId: d });
  app.ucAction(room, sock(d), { action: 'vote', targetId: c });

  assert.equal(gs.phase, 'vote_result');
  assert.equal(gs.lastVote.tied, true);
  assert.equal(aliveIds(gs).length, 4, 'a tie leaves the table intact');
  stopTimers(room);
});

test('the vote also resolves when the timer runs out with partial votes', () => {
  const room = makeRoom('undercover', 5, { mrWhite: 0 });
  const gs = startClues(room);
  giveAllClues(room);
  const [a, b] = aliveIds(gs);
  app.ucAction(room, sock(a), { action: 'vote', targetId: b });
  app.ucResolveVote(room);   // what the voting timeout does

  assert.equal(gs.phase, 'vote_result');
  assert.equal(gs.playerData[b].alive, false, 'a single vote still carries when nobody else votes');
  stopTimers(room);
});

test('Mr White gets one guess, and only Mr White', () => {
  const room = makeRoom('undercover', 6, { mrWhite: 1 });
  const gs = startClues(room);
  const white = roleOf(gs, 'mrwhite')[0].id;
  const civilian = roleOf(gs, 'civilian')[0].id;

  app.ucStartWhiteGuess(room, white);
  assert.equal(gs.phase, 'white_guess');

  app.ucWhiteGuess(room, civilian, gs.civilianWord);
  assert.equal(gs.whiteGuess, null, 'a civilian cannot answer for Mr White');

  app.ucWhiteGuess(room, white, '  ' + gs.civilianWord.toUpperCase() + ' ');
  assert.equal(gs.whiteGuess.correct, true, 'the guess is compared case- and space-insensitively');
  assert.equal(gs.phase, 'game_over');
  assert.equal(gs.result.winner, 'mrwhite');
  assert.equal(room.sessionStats[white]?.wins, 1);
  stopTimers(room);
});

test('a wrong guess by Mr White lets the game go on', () => {
  const room = makeRoom('undercover', 6, { mrWhite: 1 });
  const gs = startClues(room);
  const white = roleOf(gs, 'mrwhite')[0].id;
  gs.playerData[white].alive = false;
  app.ucStartWhiteGuess(room, white);
  app.ucWhiteGuess(room, white, 'definitely-not-the-word');

  assert.equal(gs.whiteGuess.correct, false);
  assert.notEqual(gs.phase, 'game_over', 'the civilians have not won yet — the undercover is still in');
  stopTimers(room);
});

test('the win conditions are the parity rules', () => {
  const room = makeRoom('undercover', 6, { undercoverCount: 1, mrWhite: 1 });
  app.startUC(room);
  const gs = room.gameState;
  const civilians = roleOf(gs, 'civilian');
  const undercover = roleOf(gs, 'undercover')[0];
  const white = roleOf(gs, 'mrwhite')[0];

  assert.equal(app.ucCheckWin(gs), null, '4 civilians vs 2 impostors is still in play');

  civilians[0].alive = false;
  assert.equal(app.ucCheckWin(gs), null, '3 civilians vs 2 impostors is still in play');

  civilians[1].alive = false;
  assert.equal(app.ucCheckWin(gs).winner, 'undercover', '2 vs 2 — impostors matching civilians ends it');
  assert.equal(app.ucCheckWin(gs).reason, 'outnumber');

  civilians[0].alive = true;
  civilians[1].alive = true;
  undercover.alive = false;
  white.alive = false;
  assert.equal(app.ucCheckWin(gs).winner, 'civilians', 'no impostors left, civilians take it');
  assert.equal(app.ucCheckWin(gs).reason, 'allFound');
  stopTimers(room);
});

test('the game ends and records the winning side', () => {
  const room = makeRoom('undercover', 5, { undercoverCount: 1, mrWhite: 0 });
  app.startUC(room);
  const gs = room.gameState;
  app.endUC(room, { winner: 'civilians', reason: 'allFound' });

  assert.equal(gs.phase, 'game_over');
  assert.equal(room.status, 'ended');
  const civilianIds = roleOf(gs, 'civilian').map(p => p.id);
  civilianIds.forEach(id => assert.equal(room.sessionStats[id].wins, 1, 'every civilian wins together'));
  const undercoverId = roleOf(gs, 'undercover')[0].id;
  assert.equal(room.sessionStats[undercoverId].wins, 0);
  assert.equal(room.sessionStats[undercoverId].gamesPlayed, 1, 'the loser still played a game');
  stopTimers(room);
});
