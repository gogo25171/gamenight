// The Quiz is the one game that reaches the internet, and the one that now has a
// fallback for when it cannot. What these tests protect:
//
//   - the bundled bank is well formed — a typo there is four wrong answers, or a
//     question whose right answer is not among the options at all
//   - `quizLocalQuestions()` never hands out a question twice, never runs out
//     below the largest `numQuestions` the lobby offers, and shuffles the options
//     so the answer is not always first
//   - `loadQuizQuestions()` honours QUIZ_SOURCE without touching the network
//   - and the reason all of it exists: a room whose wifi is down still plays,
//     where it used to be sent back to the lobby
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, stopTimers, captureBroadcasts } = require('./helpers');

const DIFFICULTIES = ['easy', 'medium', 'hard'];
// The largest value `validateSettings()` accepts for `numQuestions`.
const MAX_QUESTIONS = 25;

test('the bundled question bank is well formed', () => {
  const bank = app.QUIZ_LOCAL_BANK;
  assert.ok(Array.isArray(bank) && bank.length >= MAX_QUESTIONS,
    `the bank must hold at least ${MAX_QUESTIONS} questions — a 25-question game cannot repeat one`);

  const seen = new Set();
  for (const q of bank) {
    assert.ok(DIFFICULTIES.includes(q.difficulty), `"${q.question}" has difficulty "${q.difficulty}"`);
    assert.equal(typeof q.question, 'string');
    assert.ok(q.question.trim().length > 0, 'a question cannot be empty');
    assert.equal(typeof q.answer, 'string');
    assert.ok(q.answer.trim().length > 0, `"${q.question}" has no answer`);
    assert.ok(Array.isArray(q.wrong) && q.wrong.length === 3,
      `"${q.question}" needs exactly 3 wrong answers — the view has four buttons`);
    assert.ok(!q.wrong.includes(q.answer), `"${q.question}" lists its own answer as wrong`);
    assert.equal(new Set(q.wrong).size, 3, `"${q.question}" repeats a wrong answer`);
    assert.ok(!seen.has(q.question), `"${q.question}" appears twice in the bank`);
    seen.add(q.question);
  }
});

test('every difficulty is represented, so the ramp is not flat', () => {
  for (const d of DIFFICULTIES) {
    assert.ok(app.QUIZ_LOCAL_BANK.some(q => q.difficulty === d), `the bank has no "${d}" question`);
  }
});

test('a local round is distinct, complete, and ordered easy to hard', () => {
  const round = app.quizLocalQuestions(MAX_QUESTIONS);
  assert.equal(round.length, MAX_QUESTIONS);
  assert.equal(new Set(round.map(q => q.question)).size, MAX_QUESTIONS, 'a round must not repeat a question');

  const order = round.map(q => DIFFICULTIES.indexOf(q.difficulty));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'easy questions come first');

  for (const q of round) {
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes(q.correctAnswer), `"${q.question}" does not offer its own answer`);
    assert.equal(new Set(q.options).size, 4, `"${q.question}" offers the same option twice`);
  }
});

test('asking for more questions than the bank holds caps instead of repeating', () => {
  const round = app.quizLocalQuestions(app.QUIZ_LOCAL_BANK.length + 50);
  assert.equal(round.length, app.QUIZ_LOCAL_BANK.length);
  assert.equal(new Set(round.map(q => q.question)).size, round.length);
});

test('the correct answer is not always in the same slot', () => {
  // 200 draws of one question: if the shuffle were a no-op every index would be 0.
  const positions = new Set();
  for (let i = 0; i < 200; i++) {
    const q = app.quizBuildQuestion(app.QUIZ_LOCAL_BANK[0]);
    positions.add(q.options.indexOf(q.correctAnswer));
  }
  assert.ok(positions.size > 1, 'the options are not shuffled — the answer sits at a fixed index');
});

/** Runs `fn` with `fetch` replaced by a failing stub, and reports whether it was called. */
async function withDeadNetwork(fn) {
  const realFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; throw new Error('ENOTFOUND (stub)'); };
  try {
    return { result: await fn(), called };
  } finally {
    global.fetch = realFetch;
  }
}

test('QUIZ_SOURCE=offline never reaches for the network', async () => {
  const { result, called } = await withDeadNetwork(() => app.loadQuizQuestions(10, 'offline'));
  assert.equal(called, false, 'the offline Quiz must not call fetch() at all');
  assert.equal(result.source, 'local');
  assert.equal(result.questions.length, 10);
});

test('QUIZ_SOURCE=auto falls back to the bank instead of cancelling the game', async () => {
  const { result, called } = await withDeadNetwork(() => app.loadQuizQuestions(12, 'auto'));
  assert.equal(called, true, 'auto tries the internet first');
  assert.equal(result.source, 'local');
  assert.equal(result.questions.length, 12);
});

test('QUIZ_SOURCE=online fails loudly rather than playing offline', async () => {
  const realFetch = global.fetch;
  global.fetch = async () => { throw new Error('ENOTFOUND (stub)'); };
  try {
    await assert.rejects(() => app.loadQuizQuestions(12, 'online'));
  } finally {
    global.fetch = realFetch;
  }
});

// The behaviour the whole feature exists for: the wifi is down and the game still
// starts. Before the local bank, this path sent the room back to the lobby.
test('a game whose network is down starts from the bank instead of going back to the lobby', async () => {
  const realFetch = global.fetch;
  global.fetch = async () => { throw new Error('ENOTFOUND (stub)'); };
  const room = makeRoom('quiz', 3);
  app.rooms.set(room.code, room);
  const bus = captureBroadcasts();
  try {
    await app.startQuiz(room);

    assert.equal(room.status, 'playing', 'the room must not be sent back to the lobby');
    assert.equal(room.gameState.phase, 'question');
    assert.equal(room.gameState.questions.length, room.settings.numQuestions);

    const notes = bus.of('notification');
    assert.deepEqual(notes, [{ key: 'quiz.offlineBank' }],
      'the room has to be told the questions came from the bank');
    assert.ok(!bus.of('game:back_to_lobby').length, 'nobody goes back to the lobby');
  } finally {
    bus.restore();
    global.fetch = realFetch;
    stopTimers(room);
    app.rooms.delete(room.code);
  }
});
